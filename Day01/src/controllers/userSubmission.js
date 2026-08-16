const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const Problem = require("../models/problems");
const Submission = require("../models/submission");
const {
  getLanguageById,
  submitBatch,
  submitToken,
} = require("../utilities/ProblemUtility");
const redisclient = require("../config/redis");
const { createRedisClient } = require("../config/redis");
const submissionQueue = require("../workers/submissionQueue");

/**
 * Compute deterministic hash of the submission parameters to detect conflicting reuse of idempotency keys.
 */
const computePayloadHash = (userId, problemId, code, language) => {
  const normalizedLanguage = language.toLowerCase().trim();
  const normalizedCode = code.trim();
  return crypto
    .createHash("sha256")
    .update(`${userId}:${problemId}:${normalizedLanguage}:${normalizedCode}`)
    .digest("hex");
};

/**
 * Submit Code for Asynchronous Evaluation
 */
const submitCode = async (req, res) => {
  try {
    const userId = req.result._id.toString();
    const problemId = req.params.id;

    let { code, language, idempotencyKey } = req.body;

    if (!userId || !problemId || !code || !language) {
      return res.status(400).json({ message: "Missing required fields (code, language, problemId)" });
    }

    if (language === "cpp") {
      language = "c++";
    }

    // Auto-generate idempotency key if not supplied by client
    if (!idempotencyKey) {
      idempotencyKey = uuidv4();
    }

    const payloadHash = computePayloadHash(userId, problemId, code, language);
    const metaKey = `submission:meta:${idempotencyKey}`;
    const resultKey = `submission:result:${idempotencyKey}`;

    // ── Idempotency Verification ──
    const existingMeta = await redisclient.hGetAll(metaKey);

    if (existingMeta && existingMeta.payloadHash) {
      // Case 6: Detect conflicting payload reusing same idempotency key
      if (existingMeta.payloadHash !== payloadHash) {
        return res.status(409).json({
          error: "Idempotency key collision",
          message: "This idempotency key was already used with a different submission payload.",
          idempotencyKey,
        });
      }

      // Case 3: Already completed
      if (existingMeta.status === "completed" || existingMeta.status === "failed") {
        const cachedResult = await redisclient.get(resultKey);
        if (cachedResult) {
          return res.status(200).json(JSON.parse(cachedResult));
        }
      }

      // Case 2: In-flight (pending / processing)
      return res.status(202).json({
        message: "Submission is already being processed",
        idempotencyKey,
        jobId: idempotencyKey,
        status: existingMeta.status || "pending",
      });
    }

    // Case 1: First request -> Initialize metadata in Redis
    await redisclient.hSet(metaKey, {
      payloadHash,
      userId,
      problemId,
      status: "pending",
      createdAt: String(Date.now()),
      jobId: idempotencyKey,
    });
    await redisclient.expire(metaKey, 86400); // 1 day TTL

    // Enqueue job with stable job identifier
    const job = await submissionQueue.add(
      { userId, problemId, code, language, idempotencyKey },
      { jobId: idempotencyKey }
    );

    // Return 202 Accepted immediately with tracking identifiers
    res.status(202).json({
      message: "Submission received and is processing in the background",
      idempotencyKey,
      jobId: job.id,
      status: "pending",
    });

  } catch (err) {
    console.error("[Submit Controller Error]", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

/**
 * Synchronous test run against visible test cases (lightweight)
 */
const runCode = async (req, res) => {
  try {
    const userId = req.result._id;
    const problemId = req.params.id;

    let { code, language } = req.body;

    if (!userId || !code || !problemId || !language) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (language === "cpp") {
      language = "c++";
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    const languageId = getLanguageById(language);
    if (!languageId) {
      return res.status(400).json({ message: `Unsupported language: ${language}` });
    }

    const submissions = problem.visibletestCase.map((testcase) => ({
      source_code: code,
      language_id: languageId,
      stdin: testcase.input,
      expected_output: testcase.output,
    }));

    const submitResult = await submitBatch(submissions);
    const resultToken = submitResult.map((value) => value.token);
    const testResult = await submitToken(resultToken);

    res.status(201).json(testResult);
  } catch (err) {
    console.error("[Run Controller Error]", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

/**
 * Polling endpoint for submission result (fallback mechanism)
 */
const checkSubmissionStatus = async (req, res) => {
  try {
    const { idempotencyKey } = req.params;

    if (!idempotencyKey) {
      return res.status(400).json({ message: "Missing idempotency key" });
    }

    const resultKey = `submission:result:${idempotencyKey}`;
    const metaKey = `submission:meta:${idempotencyKey}`;

    // 1. Check if final result is ready in Redis
    const existingResult = await redisclient.get(resultKey);
    if (existingResult) {
      return res.status(200).json(JSON.parse(existingResult));
    }

    // 2. Check metadata status
    const meta = await redisclient.hGetAll(metaKey);
    if (meta && meta.status) {
      return res.status(202).json({
        status: meta.status,
        idempotencyKey,
        attemptsMade: meta.attemptsMade ? parseInt(meta.attemptsMade) : 1,
      });
    }

    // 3. Fallback: Submission not found in Redis
    return res.status(404).json({ message: "Submission not found or expired" });
  } catch (err) {
    console.error("[CheckStatus Error]", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

/**
 * Server-Sent Events (SSE) stream endpoint for instant push of submission completion
 */
const streamSubmissionStatus = async (req, res) => {
  const { idempotencyKey } = req.params;

  if (!idempotencyKey) {
    return res.status(400).json({ message: "Missing idempotency key" });
  }

  // Set SSE Headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const resultKey = `submission:result:${idempotencyKey}`;
  const streamChannel = `submission:stream:${idempotencyKey}`;

  // 1. If result is already ready, deliver immediately and terminate stream
  const cachedResult = await redisclient.get(resultKey);
  if (cachedResult) {
    res.write(`data: ${cachedResult}\n\n`);
    return res.end();
  }

  // 2. Send initial pending frame
  res.write(`data: ${JSON.stringify({ status: "pending", idempotencyKey })}\n\n`);

  // 3. Subscribe to Redis Pub/Sub channel for this submission
  const subscriber = createRedisClient();
  let isClosed = false;

  const cleanup = async () => {
    if (isClosed) return;
    isClosed = true;
    clearInterval(heartbeat);
    try {
      await subscriber.unsubscribe(streamChannel);
      await subscriber.quit();
    } catch (err) {
      // Ignore disconnect errors
    }
  };

  const heartbeat = setInterval(() => {
    if (!isClosed) {
      res.write(":\n\n"); // Keep-alive heartbeat comment
    }
  }, 15000);

  req.on("close", cleanup);
  res.on("error", cleanup);

  try {
    await subscriber.connect();
    await subscriber.subscribe(streamChannel, (message) => {
      res.write(`data: ${message}\n\n`);
      cleanup();
      res.end();
    });
  } catch (subErr) {
    console.error("[Submission SSE Error]", subErr.message);
    cleanup();
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to establish SSE stream" });
    }
  }
};

module.exports = {
  submitCode,
  runCode,
  checkSubmissionStatus,
  streamSubmissionStatus,
};

