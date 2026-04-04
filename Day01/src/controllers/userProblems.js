const {
  getLanguageById,
  submitBatch,
  submitToken,
} = require("../utilities/ProblemUtility");
const Problem = require("../models/problems");
const User = require("../models/user");
const Submission = require("../models/submission");
const problemCreate = async (req, res) => {
  const {
    title,
    description,
    difficulty,
    tags,
    visibletestCase,
    hiddentestCase,
    startCode,
    referenceSolution,
    problemCreator,
  } = req.body;

  try {
    for (const element of referenceSolution) {
      const { language, completeCode } = element;

      const languageId = getLanguageById(language);
      //judge0 expected submission array
      const submissions = visibletestCase.map((testcase) => ({
        source_code: completeCode,
        language_id: languageId,
        stdin: testcase.input,
        expected_output: testcase.output,
      }));

      const submitResult = await submitBatch(submissions);

      const resultToken = submitResult.map((value) => value.token); //sare token ko ek sath rkh rha hu seperated by comma

      const testResult = await submitToken(resultToken);

      for (const test of testResult) {
        if (test.status_id != 3) {
          return res.status(400).send("Error Occured");
        }
      }

      const userProblem = await Problem.create({
        ...req.body,
        problemCreator: req.result._id,
      });

      res.status(201).send("Problem Saved Successfully");
    }
  } catch (err) {
    res.status(400).send("Error: " + err);
  }
};

const problemUpdate = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    difficulty,
    tags,
    visibletestCase,
    hiddentestCase,
    startCode,
    referenceSolution,
    problemCreator,
  } = req.body;

  try {
    if (!id) {
      return res.status(400).send("Missing id");
    }
    const DsaProblem = await Problem.findById(id);
    if (!DsaProblem) {
      return res.status(400).send("Id is not present");
    }
    for (const element of referenceSolution) {
      const { language, completeCode } = element;

      const languageId = getLanguageById(language);
      //judge0 expected submission array
      const submissions = visibletestCase.map((testcase) => ({
        source_code: completeCode,
        language_id: languageId,
        stdin: testcase.input,
        expected_output: testcase.output,
      }));

      const submitResult = await submitBatch(submissions);

      const resultToken = submitResult.map((value) => value.token); //sare token ko ek sath rkh rha hu seperated by comma

      const testResult = await submitToken(resultToken);

      for (const test of testResult) {
        if (test.status_id != 3) {
          return res.status(400).send("Error Occured");
        }
      }

      const newProblem = await Problem.findByIdAndUpdate(
        id,
        { ...req.body },
        { runValidators: true, new: true },
      );
      res.status(200).send(newProblem);
    }
  } catch (err) {
    res.status(500).send("Error " + err.message);
  }
};

const problemDelete = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id) {
      return res.status(400).send("Missing id");
    }
    const DsaProblem = await Problem.findById(id);
    if (!DsaProblem) {
      return res.status(400).send("Id is not present");
    }
    const deletedProblem = await Problem.findByIdAndDelete(id);
    if (!deletedProblem) {
      return res.status(400).send("Problem is not missing");
    }
    res.status(200).send("Problem Deleted Succesfully");
  } catch (err) {
    res.status(500).send("Error " + err.message);
  }
};

const problemFetch = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id) {
      return res.status(400).send("Missing id");
    }
    const getproblem = await Problem.findById(id).select(
      "title description difficulty tags visibletestCase _id startCode hiddentestCase referenceSolution startCode",
    );
    if (!getproblem) {
      return res.status(404).send("Problem is missing");
    }
    res.status(200).send(getproblem);
  } catch (err) {
    res.status(500).send("Error " + err.message);
  }
};

const problemFetchAll = async (req, res) => {
  try {
    const { page, limit, search } = req.query;

    let query = {};
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    if (page && limit) {
      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      const totalProblems = await Problem.countDocuments(query);
      const totalPages = Math.ceil(totalProblems / limitNumber);

      const problems = await Problem.find(query)
        .select("_id title difficulty tags")
        .skip(skip)
        .limit(limitNumber);

      return res.status(200).json({
        problems,
        totalPages,
        currentPage: pageNumber,
        totalProblems,
      });
    }

    const getAllProblem = await Problem.find(query).select(
      "_id title difficulty tags",
    );
    if (getAllProblem.length == 0) {
      return res.status(404).send("Problem is Missing");
    }
    res.status(200).send(getAllProblem);
  } catch (err) {
    res.status(500).send("Error " + err.message);
  }
};

const solvedProblem = async (req, res) => {
  try {
    const userId = req.result._id;
    //learn power of referencing
    const user = await User.findById(userId).populate({
      //populate imp.
      path: "problemSolved",
      select: "_id title difficulty tags",
    });

    res.status(200).send(user.problemSolved);
  } catch (err) {
    res.status(500).send("Server Error");
  }
};

const submittedProblem = async (req, res) => {
  try {
    const userId = req.result._id;
    const problemId = req.params.pid;

    const ans = await Submission.find({ userId, problemId }).sort({ createdAt: -1 });

    res.status(200).send(ans);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
};

const getSubmissionById = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const submission = await Submission.findById(submissionId).populate(
      "problemId",
      "title"
    );

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    res.status(200).json(submission);
  } catch (err) {
    res.status(500).send("Error " + err.message);
  }
};

const getLastSuccessfulSubmission = async (req, res) => {
  try {
    const userId = req.result._id;
    const problemId = req.params.pid;

    const submission = await Submission.findOne({
      userId,
      problemId,
      status: "accepted",
    }).sort({ createdAt: -1 });

    if (!submission) {
      return res.status(200).json(null);
    }

    res.status(200).json(submission);
  } catch (err) {
    res.status(500).send("Error " + err.message);
  }
};

module.exports = {
  problemCreate,
  problemUpdate,
  problemDelete,
  problemFetch,
  problemFetchAll,
  solvedProblem,
  submittedProblem,
  getSubmissionById,
  getLastSuccessfulSubmission,
};
