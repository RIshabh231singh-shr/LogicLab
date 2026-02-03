const mongoose = require("mongoose");

const { Schema } = mongoose;

const ProblemSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    tags: {
      type: [String],
      enum: ["array", "linkedlist", "graph", "dp"],
      required: true,
    },

    visibletestCase: [
      {
        input: {
          type: String,
          required: true,
        },
        output: {
          type: String,
          required: true,
        },
        explanation: {
          type: String,
          required: true,
        },
      },
    ],

    hiddentestCase: [
      {
        input: {
          type: String,
          required: true,
        },
        output: {
          type: String,
          required: true,
        },
      },
    ],

    startCode: [
      {
        language: {
          type: String,
          required: true,
        },
        initialCode: {
          type: String,
          required: true,
        },
      },
    ],
    referenceSolution: [
      {
        language: {
          type: String,
          required: true,
        },
        completeCode: {
          type: String,
          required: true,
        },
      },
    ],
    problemCreator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Problem = mongoose.model("Problem", ProblemSchema);
module.exports = Problem;
