const mongoose = require("mongoose");

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 20,
    },
    nickname: {
      type: String,
      trim: true,
      default: "",
    },
    lastName: {
      type: String,
      minlength: 3,
      maxlength: 20,
    },
    emailId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      immutable: true,
    },
    age: {
      type: Number,
      min: 6,
      max: 100,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Non-binary", "Prefer not to say", ""],
      default: "",
    },
    location: {
      type: String,
      maxlength: 100,
      default: "",
    },
    birthday: {
      type: Date,
      default: null,
    },
    websites: {
      type: String,
      default: "",
    },
    github: {
      type: String,
      default: "",
    },
    linkedin: {
      type: String,
      default: "",
    },
    work: {
      type: [{
        company: { type: String },
        role: { type: String },
        from: { type: String },
        to: { type: String },
      }],
      default: [],
    },
    education: {
      type: [{
        institution: { type: String },
        degree: { type: String },
        from: { type: String },
        to: { type: String },
      }],
      default: [],
    },
    skills: {
      type: [String],
      default: [],
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    problemSolved: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Problem",
        },
      ],
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
userSchema.post("findOneAndDelete", async function (userInfo) {
  if (userInfo) {
    await mongoose.model("submission").deleteMany({ userId: userInfo._id });
  }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
