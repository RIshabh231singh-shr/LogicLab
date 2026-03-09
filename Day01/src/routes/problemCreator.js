const express = require("express");
const ProblemRouter = express.Router();
const adminMiddleware = require("../middleware/adminMiddleware");
const userMiddleware = require("../middleware/userMiddleware");
const {
  problemCreate,
  problemUpdate,
  problemDelete,
  problemFetch,
  problemFetchAll,
  solvedProblem,
  submittedProblem,
  getSubmissionById,
  getLastSuccessfulSubmission,
} = require("../controllers/userProblems");

ProblemRouter.post("/create", adminMiddleware, problemCreate);

ProblemRouter.put("/update/:id", adminMiddleware, problemUpdate);

ProblemRouter.delete("/delete/:id", adminMiddleware, problemDelete);

ProblemRouter.get("/ProblemById/:id", userMiddleware, problemFetch);

ProblemRouter.get("/getAllProblem/", userMiddleware, problemFetchAll);

ProblemRouter.get("/problemSolvedByUser/user", userMiddleware, solvedProblem);

ProblemRouter.get("/submittedProblem/:pid", userMiddleware, submittedProblem);
ProblemRouter.get("/submission/:id", userMiddleware, getSubmissionById);
ProblemRouter.get("/lastSubmission/:pid", userMiddleware, getLastSuccessfulSubmission);

module.exports = ProblemRouter;
