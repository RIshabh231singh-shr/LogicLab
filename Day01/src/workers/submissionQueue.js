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
      delay: 2000, // 2 seconds delay initially
    },
    removeOnComplete: true, // Keep Redis clean
  },
});

// Process Jobs Sequentially (Concurrency = 1)
submissionQueue.process(1, async (job) => {
  const { userId, problemId, code, language, idempotencyKey } = job.data;

  try {
    const problem = await Problem.findById(problemId);
    if (!problem) throw new Error("Problem not found");

    const languageId = getLanguageById(language);

    const submissions = problem.hiddentestCase.map((testcase) => ({
      source_code: code,
      language_id: languageId,
      stdin: testcase.input,
      expected_output: testcase.output,
    }));

    // Call Judge0
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
          errorMessage = test.stderr || test.compile_output;
        } else {
          status = "wrong";
          errorMessage = test.stderr || "Wrong Answer";
        }
      }
    }

    // Save to MongoDB
    const submittedResult = await Submission.create({
      userId,
      problemId,
      code,
      language,
      status,
      testCasesTotal: problem.hiddentestCase.length,
      testCasesPassed,
      errorMessage,
      runtime,
      memory,
    });

    // Update User solved problems if accepted
    if (status === "accepted") {
      const user = await User.findById(userId);
      if (user && !user.problemSolved.includes(problemId)) {
        user.problemSolved.push(problemId);
        await user.save();
      }
    }

    // Cache the result in Redis for the frontend to poll
    const resultPayload = {
      accepted: status === "accepted",
      testCasesTotal: submittedResult.testCasesTotal,
      testCasesPassed,
      runtime,
      memory,
      status,
    };
    await redisclient.setEx(`submission:result:${idempotencyKey}`, 3600, JSON.stringify(resultPayload));

    return resultPayload;

  } catch (error) {
    console.error(`[Submission Worker] Job ${job.id} failed:`, error.message);
    // Mark as failed in Redis so polling frontend knows
    await redisclient.setEx(
      `submission:result:${idempotencyKey}`,
      3600,
      JSON.stringify({ status: "error", message: error.message })
    );
    throw error; // Trigger Bull's retry mechanism
  }
});

module.exports = submissionQueue;
