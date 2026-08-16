const {
  getLanguageById,
  submitBatch,
  submitToken,
} = require("../utilities/ProblemUtility");
const Problem = require("../models/problems");
const User = require("../models/user");
const Submission = require("../models/submission");
const redisclient = require("../config/redis");

const invalidateProblemCaches = async (problemId = null) => {
  try {
    let cursor = "0";
    do {
      const reply = await redisclient.scan(cursor, {
        MATCH: "problems:*",
        COUNT: 50,
      });
      cursor = reply.cursor;
      const keys = reply.keys;
      if (keys.length > 0) {
        await redisclient.del(keys);
      }
    } while (cursor !== "0" && cursor !== 0);

    if (problemId) {
      await redisclient.del(`problem:${problemId}`);
    }
  } catch (redisErr) {
    console.error("[Redis] Invalidation Error:", redisErr.message);
  }
};

const problemCreate = async (req, res) => {
  const {
    title,
    description,
    difficulty,
    tags,
    visibletestCase = [],
    hiddentestCase = [],
    startCode = [],
    referenceSolution = [],
  } = req.body;

  try {
    if (!title || !description || !difficulty || !tags) {
      return res.status(400).json({ message: "Missing required problem fields" });
    }

    // Validate all reference solutions against visible test cases
    if (Array.isArray(referenceSolution) && referenceSolution.length > 0 && visibletestCase.length > 0) {
      for (const element of referenceSolution) {
        const { language, completeCode } = element;
        const languageId = getLanguageById(language);
        if (!languageId) {
          return res.status(400).json({ message: `Invalid language in reference solution: ${language}` });
        }

        const submissions = visibletestCase.map((testcase) => ({
          source_code: completeCode,
          language_id: languageId,
          stdin: testcase.input,
          expected_output: testcase.output,
        }));

        const submitResult = await submitBatch(submissions);
        const resultToken = submitResult.map((value) => value.token);
        const testResult = await submitToken(resultToken);

        for (const test of testResult) {
          if (test.status_id != 3) {
            return res.status(400).json({
              message: `Reference solution for ${language} failed validation against test cases`,
            });
          }
        }
      }
    }

    const userProblem = await Problem.create({
      ...req.body,
      problemCreator: req.result._id,
    });

    await invalidateProblemCaches();

    res.status(201).json({
      message: "Problem Saved Successfully",
      problem: userProblem,
    });
  } catch (err) {
    console.error("[Problem Create Error]", err.message);
    res.status(400).json({ message: "Error: " + err.message });
  }
};

const problemUpdate = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    difficulty,
    tags,
    visibletestCase = [],
    hiddentestCase = [],
    startCode = [],
    referenceSolution = [],
  } = req.body;

  try {
    if (!id) {
      return res.status(400).json({ message: "Missing id" });
    }
    const dsaProblem = await Problem.findById(id);
    if (!dsaProblem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    if (Array.isArray(referenceSolution) && referenceSolution.length > 0 && visibletestCase.length > 0) {
      for (const element of referenceSolution) {
        const { language, completeCode } = element;
        const languageId = getLanguageById(language);
        if (!languageId) {
          return res.status(400).json({ message: `Invalid language in reference solution: ${language}` });
        }

        const submissions = visibletestCase.map((testcase) => ({
          source_code: completeCode,
          language_id: languageId,
          stdin: testcase.input,
          expected_output: testcase.output,
        }));

        const submitResult = await submitBatch(submissions);
        const resultToken = submitResult.map((value) => value.token);
        const testResult = await submitToken(resultToken);

        for (const test of testResult) {
          if (test.status_id != 3) {
            return res.status(400).json({
              message: `Reference solution for ${language} failed validation against test cases`,
            });
          }
        }
      }
    }

    const newProblem = await Problem.findByIdAndUpdate(
      id,
      { ...req.body },
      { runValidators: true, new: true }
    );

    await invalidateProblemCaches(id);
    res.status(200).json(newProblem);
  } catch (err) {
    console.error("[Problem Update Error]", err.message);
    res.status(500).json({ message: "Error: " + err.message });
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
    await invalidateProblemCaches(id);
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
    const cacheKey = `problem:${id}`;
    let cachedProblem = null;
    try {
      cachedProblem = await redisclient.get(cacheKey);
    } catch (redisErr) {
      console.error("[Redis] Get Problem Error:", redisErr.message);
    }

    if (cachedProblem) {
      return res.status(200).json(JSON.parse(cachedProblem));
    }

    const getproblem = await Problem.findById(id).select(
      "title description difficulty tags visibletestCase _id startCode hiddentestCase referenceSolution startCode",
    );
    if (!getproblem) {
      return res.status(404).send("Problem is missing");
    }

    try {
      await redisclient.setEx(cacheKey, 3600, JSON.stringify(getproblem));
    } catch (redisErr) {
      console.error("[Redis] Set Problem Error:", redisErr.message);
    }

    res.status(200).send(getproblem);
  } catch (err) {
    res.status(500).send("Error " + err.message);
  }
};

const problemFetchAll = async (req, res) => {
  try {
    const { page, limit, search, difficulty, tag } = req.query;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // 1. Generate Cache Key 
    // If search is present, difficulty and tag are ignored in key to match logic
    const cacheKey = search 
      ? `problems:page=${pageNumber}:limit=${limitNumber}:search=${search}`
      : `problems:page=${pageNumber}:limit=${limitNumber}:search=none:diff=${difficulty || "all"}:tag=${tag || "all"}`;

    // 2. Try to Check Redis Cache
    let cachedData = null;
    try {
      cachedData = await redisclient.get(cacheKey);
    } catch (redisErr) {
      console.error("[Redis] Get Error:", redisErr.message);
    }

    if (cachedData) {
      console.log("[Redis] Cache Hit for:", cacheKey);
      return res.status(200).json(JSON.parse(cachedData));
    }

    console.log("[Redis] Cache Miss for:", cacheKey);

    // 3. DB Fallback (Cache Miss Case)
    let query = {};
    if (search) {
      // Search is independent of other filters
      query.title = { $regex: search, $options: "i" };
    } else {
      // If no search, apply filters
      if (difficulty && difficulty !== "all") {
        query.difficulty = { $regex: new RegExp(`^${difficulty}$`, "i") };
      }
      if (tag && tag !== "all") {
        query.tags = { $regex: tag, $options: "i" };
      }
    }

    const totalProblems = await Problem.countDocuments(query);
    const totalPages = Math.ceil(totalProblems / limitNumber);

    const problems = await Problem.find(query)
      .select("_id title difficulty tags")
      .skip(skip)
      .limit(limitNumber);

    if (problems.length === 0 && totalProblems > 0) {
      return res.status(404).send("Page not found");
    }

    const responsePayload = {
      problems,
      totalPages,
      currentPage: pageNumber,
      totalProblems,
    };

    // 4. Store in Redis with 300s TTL
    try {
      if (problems.length > 0 || totalProblems === 0) {
        await redisclient.setEx(cacheKey, 300, JSON.stringify(responsePayload));
      }
    } catch (redisErr) {
      console.error("[Redis] Set Error:", redisErr.message);
    }

    return res.status(200).json(responsePayload);
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
