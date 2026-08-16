const Queue = require("bull");
const redisclient = require("../config/redis");
const Problem = require("../models/problems");
const Submission = require("../models/submission");
const User = require("../models/user");
const { getLanguageById, submitBatch, submitToken } = require("../utilities/ProblemUtility");

// Determine Redis host/port from env or use defaults
const redisHost = process.env.REDIS_HOST?.replace(/"/g, "") || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASS?.replace(/"/g, "") || undefined;

// Configurable worker concurrency (default: 5)
const WORKER_CONCURRENCY = parseInt(process.env.SUBMISSION_WORKER_CONCURRENCY) || 5;

// Initialize Bull Queue
const submissionQueue = new Queue("submissions", {
  redis: {
    host: redisHost,
    port: redisPort,
    password: redisPassword,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000, // 2s initial delay
    },
    removeOnComplete: 1000, // Keep last 1000 completed jobs for auditability
    removeOnFail: 2000,     // Keep last 2000 failed jobs for debugging
  },
  settings: {
    stalledInterval: 15000, // Check for stalled jobs every 15 seconds
    maxStalledCount: 2,     // Max stalled retries before failing
  },
});

// Process Jobs with Configured Concurrency (5)
submissionQueue.process(WORKER_CONCURRENCY, async (job) => {
  const { userId, problemId, code, language, idempotencyKey } = job.data;
  const metaKey = `submission:meta:${idempotencyKey}`;
  const resultKey = `submission:result:${idempotencyKey}`;
  const streamChannel = `submission:stream:${idempotencyKey}`;

  console.log(
    `[Submission Worker] Processing job ${job.id} (Attempt ${job.attemptsMade + 1}/3) for user ${userId}, problem ${problemId}`
  );

  // Update metadata in Redis: Status = processing
  try {
    await redisclient.hSet(metaKey, {
      status: "processing",
      attemptsMade: String(job.attemptsMade + 1),
      updatedAt: String(Date.now()),
    });
    await redisclient.expire(metaKey, 86400);
  } catch (err) {
    console.error("[Submission Worker] Failed to update job meta in Redis:", err.message);
  }

  try {
    const problem = await Problem.findById(problemId);
    if (!problem) {
      const err = new Error("Problem not found");
      err.isPermanent = true;
      throw err;
    }

    const languageId = getLanguageById(language);
    if (!languageId) {
      const err = new Error(`Unsupported programming language: ${language}`);
      err.isPermanent = true;
      throw err;
    }

    if (!problem.hiddentestCase || problem.hiddentestCase.length === 0) {
      const err = new Error("Problem has no hidden test cases configured");
      err.isPermanent = true;
      throw err;
    }

    const submissions = problem.hiddentestCase.map((testcase) => ({
      source_code: code,
      language_id: languageId,
      stdin: testcase.input,
      expected_output: testcase.output,
    }));

    // Call Judge0 via circuit breaker wrapped batch submission
    const submitResult = await submitBatch(submissions);
    const resultToken = submitResult.map((value) => value.token);
    const testResult = await submitToken(resultToken);

    let testCasesPassed = 0;
    let runtime = 0;
    let memory = 0;
    let status = "accepted";
    let errorMessage = null;

    for (const test of testResult) {
      if (test.status_id == 3) {
        testCasesPassed++;
        runtime += parseFloat(test.time || 0);
        memory = Math.max(memory, test.memory || 0);
      } else {
        if (test.status_id == 4) {
          status = "error";
          errorMessage = test.stderr || test.compile_output || "Runtime/Compilation Error";
        } else {
          status = "wrong";
          errorMessage = test.stderr || "Wrong Answer";
        }
      }
    }

    // Save submission result to MongoDB
    const dbLanguage = language.toLowerCase() === "c++" ? "c++" : language.toLowerCase() === "cpp" ? "c++" : language.toLowerCase();

    const submittedResult = await Submission.create({
      userId,
      problemId,
      code,
      language: dbLanguage,
      status,
      testCasesTotal: problem.hiddentestCase.length,
      testCasesPassed,
      errorMessage,
      runtime,
      memory,
    });

    // Atomic User Solved Problem Update (prevents concurrent overwrite)
    if (status === "accepted") {
      await User.updateOne(
        { _id: userId },
        { $addToSet: { problemSolved: problemId } }
      );
    }

    const resultPayload = {
      submissionId: submittedResult._id,
      accepted: status === "accepted",
      testCasesTotal: submittedResult.testCasesTotal,
      testCasesPassed,
      runtime,
      memory,
      status,
      errorMessage,
    };

    // Cache final result in Redis (1 day TTL)
    await redisclient.setEx(resultKey, 86400, JSON.stringify(resultPayload));

    // Mark job metadata as completed
    await redisclient.hSet(metaKey, {
      status: "completed",
      completedAt: String(Date.now()),
      updatedAt: String(Date.now()),
    });

    // Push real-time result to SSE subscribers via Redis Pub/Sub
    try {
      await redisclient.publish(streamChannel, JSON.stringify(resultPayload));
    } catch (pubErr) {
      console.warn("[Submission Worker] Redis Pub/Sub dispatch error:", pubErr.message);
    }

    console.log(`[Submission Worker] Job ${job.id} completed successfully with status '${status}'`);
    return resultPayload;

  } catch (error) {
    console.error(`[Submission Worker] Job ${job.id} error:`, error.message);

    const isPermanent = error.isPermanent || false;
    const maxAttempts = job.opts.attempts || 3;
    const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts || isPermanent;

    if (isFinalAttempt) {
      // All retries exhausted or permanent failure -> Record terminal failed state
      const failedPayload = {
        accepted: false,
        status: "failed",
        errorMessage: error.message || "Execution failed",
        testCasesTotal: 0,
        testCasesPassed: 0,
      };

      await redisclient.setEx(resultKey, 86400, JSON.stringify(failedPayload));
      await redisclient.hSet(metaKey, {
        status: "failed",
        errorMessage: error.message || "Execution failed",
        failedAt: String(Date.now()),
        updatedAt: String(Date.now()),
      });

      try {
        await redisclient.publish(streamChannel, JSON.stringify(failedPayload));
      } catch (pubErr) {
        console.warn("[Submission Worker] Redis Pub/Sub dispatch error:", pubErr.message);
      }
    }

    if (isPermanent) {
      // Don't re-trigger Bull retry on non-retryable errors
      return { status: "failed", error: error.message };
    }

    // Trigger Bull exponential backoff retry for transient errors
    throw error;
  }
});

// Queue event listeners for observability
submissionQueue.on("error", (error) => {
  console.error("[Bull Queue] Queue error:", error.message);
});

submissionQueue.on("stalled", (job) => {
  console.warn(`[Bull Queue] Job ${job.id} stalled. Bull will re-assign to active worker.`);
});

submissionQueue.on("failed", (job, err) => {
  console.error(`[Bull Queue] Job ${job?.id} permanently failed:`, err.message);
});

module.exports = submissionQueue;

