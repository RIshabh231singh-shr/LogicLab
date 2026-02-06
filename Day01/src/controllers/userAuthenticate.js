const redisclient = require("../config/redis");
const User = require("../models/user");
const validate = require("../utilities/validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  try {
    //validate the data
    validate(req.body);

    const { firstName, emailId, password } = req.body;

    const exist = await User.exists({ emailId });
    if (exist) {
      throw new Error("Email already exists");
    }

    req.body.password = await bcrypt.hash(password, 10); //storing hashed password
    req.body.role = "user"; //is path me koi aae user hi hoga
    const user = await User.create(req.body);

    //sending token
    const token = jwt.sign(
      { _id: user._id, emailId: emailId, role: "user" },
      process.env.JWT_KEY,
      {
        expiresIn: 1800,
      },
    );
    res.cookie("token", token, { maxAge: 1800 * 1000 });

    const reply = {
      firstName: user.firstName,
      emailId: user.emailId,
      _id: user._id,
      role: user.role,
    };

    res.status(201).json({
      user: reply,
      message: "Logged in Successful",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).send("Email already exists");
    }
    res.status(400).send("Error " + err.message);
  }
};

const adminRegister = async (req, res) => {
  try {
    //validate the data
    validate(req.body);

    const { firstName, emailId, password } = req.body;

    const exist = await User.exists({ emailId });
    if (exist) {
      throw new Error("Email already exists");
    }

    req.body.password = await bcrypt.hash(password, 10); //storing hashed password
    //req.body.role = "admin"; //is path me koi aae user hi hoga hard code se hata do
    const user = await User.create(req.body);

    //sending token
    const token = jwt.sign(
      { _id: user._id, emailId: emailId, role: user.role },
      process.env.JWT_KEY,
      {
        expiresIn: 1800,
      },
    );
    res.cookie("token", token, { maxAge: 1800 * 1000 });

    res.status(201).send("User registered successfully");
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).send("Email already exists");
    }
    res.status(400).send("Error " + err.message);
  }
};

const login = async (req, res) => {
  try {
    const { emailId, password } = req.body;
    if (!emailId) {
      throw new Error("Invalid Credentials");
    }
    if (!password) {
      throw new Error("Invalid Credentials");
    }

    const user = await User.findOne({ emailId });
    if (!user) {
      throw new Error("Invalid Credentials");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new Error("Invalid Credentials");
    }
    const reply = {
      firstName: user.firstName,
      emailId: user.emailId,
      _id: user._id,
      role: user.role,
    };
    //sending token
    const token = jwt.sign(
      { _id: user._id, emailId: emailId, role: user.role },
      process.env.JWT_KEY,
      {
        expiresIn: 1800,
      },
    );
    res.cookie("token", token, { maxAge: 1800 * 1000 });

    res.status(200).json({
      user: reply,
      message: "Logged in Successful",
    });
  } catch (err) {
    res.status(401).send("Error " + err.message);
  }
};

const logout = async (req, res) => {
  try {
    const { token } = req.cookies;
    const payload = jwt.decode(token);

    await redisclient.set(`token : ${token}`, "Blocked");
    await redisclient.expireAt(`token : ${token}`, payload.exp);

    res.cookie("token", null, { expires: new Date(Date.now()) });
    res.send("LoggedOut Successfully");
  } catch (err) {
    res.status(503).send("Error " + err.message);
  }
};

const deleteProfile = async (req, res) => {
  try {
    const userId = req.result._id;

    // userSchema delete
    await User.findByIdAndDelete(userId);

    // Submission se bhi delete karo...

    // await Submission.deleteMany({userId});

    res.status(200).send("Deleted Successfully");
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
};

const getprofile = async (req, res) => {
  try {
    const user = await User.findById(req.result._id).populate(
      "problemSolved",
      "title difficulty",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const reply = {
      firstName: user.firstName,
      lastName: user.lastName,
      emailId: user.emailId,
      age: user.age,
      role: user.role,
      problemSolved: user.problemSolved,
    };
    res.status(200).json({
      user: reply,
      message: "Valid User",
    });
  } catch (err) {
    res.send(500).send(err.message);
  }
};
module.exports = { register, login, logout, adminRegister, deleteProfile,getprofile };
