const Problem = require("../models/problems");
const Submission = require("../models/submission");
const {
  getLanguageById,
  submitBatch,
  submitToken,
} = require("../utilities/ProblemUtility");
const { v4: uuidv4 } = require("uuid");
const redisclient = require("../config/redis");
const submissionQueue = require("../workers/submissionQueue");

const submitCode = async (req, res) => {
  try {
    const userId = req.result._id;
    const problemId = req.params.id;

    let { code, language, idempotencyKey } = req.body;

    if (!userId || !problemId || !code || !language) {
      return res.status(400).send("Some field missing");
    }
    if (language === "cpp") {
      language = "c++";
    }

    // Generate idempotency key if frontend didn't provide one
    if (!idempotencyKey) {
      idempotencyKey = uuidv4();
    }

    // Check Idempotency: Does this submission already exist?
    const existingResult = await redisclient.get(`submission:result:${idempotencyKey}`);
    if (existingResult) {
      return res.status(200).json(JSON.parse(existingResult));
    }

    // Enqueue the job for background processing
    const job = await submissionQueue.add(
      { userId, problemId, code, language, idempotencyKey },
      { jobId: idempotencyKey } // Use idempotency key as Bull job ID to prevent duplicates in queue
    );

    // Return 202 Accepted immediately
    res.status(202).json({
      message: "Submission received and is processing in the background",
      idempotencyKey,
      jobId: job.id,
      status: "pending"
    });

  } catch (err) {
    res.status(500).send("Internal Server Error " + err);
  }
};


const runCode = async (req, res) => {
  //
  try {
    const userId = req.result._id;
    const problemId = req.params.id;

    let { code, language } = req.body;

    if (!userId || !code || !problemId || !language)
      return res.status(400).send("Some field missing");

    // Normalize language key (same as submitCode)
    if (language === "cpp") {
      language = "c++";
    }

    //    Fetch the problem from database
    const problem = await Problem.findById(problemId);
    //    testcases(Hidden)

    //    Judge0 code ko submit karna hai

    const languageId = getLanguageById(language);

    const submissions = problem.visibletestCase.map((testcase) => ({
      source_code: code,
      language_id: languageId,
      stdin: testcase.input,
      expected_output: testcase.output,
    }));

    const submitResult = await submitBatch(submissions);

    const resultToken = submitResult.map((value) => value.token);

    const testResult = await submitToken(resultToken);

    res.status(201).send(testResult);
  } catch (err) {
    res.status(500).send("Internal Server Error " + err);
  }
};
const checkSubmissionStatus = async (req, res) => {
  try {
    const { idempotencyKey } = req.params;
    
    if (!idempotencyKey) {
      return res.status(400).json({ message: "Missing idempotency key" });
    }

    const existingResult = await redisclient.get(`submission:result:${idempotencyKey}`);
    
    if (existingResult) {
      // The background job has finished and saved the result
      return res.status(200).json(JSON.parse(existingResult));
    }

    // Still processing
    return res.status(202).json({ status: "pending" });
  } catch (err) {
    res.status(500).send("Internal Server Error " + err);
  }
};

module.exports = { submitCode, runCode, checkSubmissionStatus };
