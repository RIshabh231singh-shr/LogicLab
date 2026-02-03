const Problem = require("../models/problems");
const Submission = require("../models/submission");
const {
  getLanguageById,
  submitBatch,
  submitToken,
} = require("../utilities/ProblemUtility");
const submitCode = async (req, res) => {
  try {
    const userId = req.result._id;
    const problemId = req.params.id;

    const { code, language } = req.body;

    if (!userId || !problemId || !code || !language) {
      return res.status(400).send("Some field missing");
    }
    //fetcing problem from database tabhi to pata chalega
    const problem = await Problem.findById(problemId);
    //yha se hidden test case milega

    //   Kya apne submission store kar du pehle....(ha kr diya)
    const submittedResult = await Submission.create({
      userId,
      problemId,
      code,
      language,
      status: "pending",
      testCasesTotal: problem.hiddentestCase.length,
    });

    //    Judge0 code ko submit karna hai

    const languageId = getLanguageById(language);

    const submissions = problem.hiddentestCase.map((testcase) => ({
      source_code: code,
      language_id: languageId,
      stdin: testcase.input,
      expected_output: testcase.output,
    }));

    const submitResult = await submitBatch(submissions);

    const resultToken = submitResult.map((value) => value.token);

    const testResult = await submitToken(resultToken);

    // submittedResult ko update karo
    let testCasesPassed = 0;
    let runtime = 0;
    let memory = 0;
    let status = "accepted";
    let errorMessage = null;

    for (const test of testResult) {
      if (test.status_id == 3) {
        testCasesPassed++;
        runtime = runtime + parseFloat(test.time);
        memory = Math.max(memory, test.memory);
      } else {
        if (test.status_id == 4) {
          status = "error";
          errorMessage = test.stderr;
        } else {
          status = "wrong";
          errorMessage = test.stderr;
        }
      }
    }

    // Store the result in Database in Submission
    submittedResult.status = status;
    submittedResult.testCasesPassed = testCasesPassed;
    submittedResult.errorMessage = errorMessage;
    submittedResult.runtime = runtime;
    submittedResult.memory = memory;

    await submittedResult.save(); //data save kra rhe hai

    // ProblemId ko insert karenge userSchema ke problemSolved mein if it is not persent there.

    // req.result == user Information

//ye aesa hai data ko lao and object ke form me kr lo aur aobject pe sab  kro last me save krlo
    if (!req.result.problemSolved.includes(problemId)) {
      req.result.problemSolved.push(problemId);//ye object ke andar change hua
      await req.result.save();//ab database me change hua ye do step process hai
    }

    res.status(201).send(submittedResult);
  } catch (err) {
    res.status(500).send("Internal Server Error " + err);
  }
};

const runCode = async (req, res) => {
  //
  try {
    const userId = req.result._id;
    const problemId = req.params.id;

    const { code, language } = req.body;

    if (!userId || !code || !problemId || !language)
      return res.status(400).send("Some field missing");

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
module.exports = { submitCode, runCode };
