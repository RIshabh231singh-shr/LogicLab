const redisclient = require("../config/redis");
const User = require("../models/user");
const validate = require("../utilities/validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const getCookieOptions = (req, isLogout = false) => {
  const origin = req.get("origin");
  const isLocalhost = origin && (origin.includes("localhost") || origin.includes("127.0.0.1"));
  
  const options = {
    sameSite: isLocalhost ? "lax" : "none",
    secure: !isLocalhost,
  };
  
  if (isLogout) {
    options.expires = new Date(Date.now());
  } else {
    options.maxAge = 7200 * 1000;
  }
  
  return options;
};

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
        expiresIn: 7200,
      },
    );
    res.cookie("token", token, getCookieOptions(req));

    const reply = {
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname || "",
      emailId: user.emailId,
      _id: user._id,
      role: user.role,
      profilePicture: user.profilePicture || null,
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
        expiresIn: 7200,
      },
    );
    res.cookie("token", token, getCookieOptions(req));

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
      lastName: user.lastName,
      nickname: user.nickname || "",
      emailId: user.emailId,
      _id: user._id,
      role: user.role,
      profilePicture: user.profilePicture || null,
    };
    //sending token
    const token = jwt.sign(
      { _id: user._id, emailId: emailId, role: user.role },
      process.env.JWT_KEY,
      {
        expiresIn: 7200,
      },
    );
    res.cookie("token", token, getCookieOptions(req));

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

    await redisclient.set(`token:${token}`, "Blocked");
    await redisclient.expireAt(`token:${token}`, payload.exp);

    res.cookie("token", null, getCookieOptions(req, true));
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
      nickname: user.nickname || "",
      emailId: user.emailId,
      age: user.age,
      gender: user.gender || "",
      location: user.location || "",
      birthday: user.birthday || null,
      websites: user.websites || "",
      github: user.github || "",
      linkedin: user.linkedin || "",
      work: user.work || [],
      education: user.education || [],
      skills: user.skills || [],
      role: user.role,
      profilePicture: user.profilePicture || null,
      problemSolved: user.problemSolved,
    };
    res.status(200).json({
      user: reply,
      message: "Valid User",
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `profile:public:${id}`;

    let cachedProfile = null;
    try {
      cachedProfile = await redisclient.get(cacheKey);
    } catch (redisErr) {
      console.error("[Redis] Get Public Profile Error:", redisErr.message);
    }

    if (cachedProfile) {
      return res.status(200).json({
        user: JSON.parse(cachedProfile),
        message: "Valid User",
      });
    }

    const user = await User.findById(id).populate(
      "problemSolved",
      "title difficulty",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const reply = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname || "",
      emailId: user.emailId,
      age: user.age,
      gender: user.gender || "",
      location: user.location || "",
      birthday: user.birthday || null,
      websites: user.websites || "",
      github: user.github || "",
      linkedin: user.linkedin || "",
      work: user.work || [],
      education: user.education || [],
      skills: user.skills || [],
      role: user.role,
      profilePicture: user.profilePicture || null,
      problemSolved: user.problemSolved,
    };

    try {
      await redisclient.setEx(cacheKey, 3600, JSON.stringify(reply));
    } catch (redisErr) {
      console.error("[Redis] Set Public Profile Error:", redisErr.message);
    }

    res.status(200).json({
      user: reply,
      message: "Valid User",
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.result._id;
    const { firstName, lastName, nickname, age, gender, location, birthday, websites, github, linkedin, skills, work, education } = req.body;

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (nickname !== undefined) updateData.nickname = nickname;
    if (age !== undefined) updateData.age = age;
    if (gender !== undefined) updateData.gender = gender;
    if (location !== undefined) updateData.location = location;
    if (birthday !== undefined) updateData.birthday = birthday || null;
    if (websites !== undefined) updateData.websites = websites;
    if (github !== undefined) updateData.github = github;
    if (linkedin !== undefined) updateData.linkedin = linkedin;
    // skills sent as comma-separated string or array
    if (skills !== undefined) {
      if (typeof skills === "string") {
        updateData.skills = skills.split(",").map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(skills)) {
        updateData.skills = skills;
      }
    }
    // work and education sent as JSON strings from FormData
    if (work !== undefined) {
      updateData.work = typeof work === "string" ? JSON.parse(work) : work;
    }
    if (education !== undefined) {
      updateData.education = typeof education === "string" ? JSON.parse(education) : education;
    }

    // If a profile picture was uploaded, push it to Cloudinary
    if (req.file) {
      const { uploadToCloudinary } = require("../utilities/cloudinaryUpload");
      const result = await uploadToCloudinary(req.file.buffer, "logiclab_avatars");
      updateData.profilePicture = result.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Invalidate public profile cache
    try {
      await redisclient.del(`profile:public:${userId}`);
    } catch (redisErr) {
      console.error("[Redis] Invalidate Profile Error:", redisErr.message);
    }

    res.status(200).json({
      user: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        nickname: updatedUser.nickname || "",
        emailId: updatedUser.emailId,
        age: updatedUser.age,
        gender: updatedUser.gender || "",
        location: updatedUser.location || "",
        birthday: updatedUser.birthday || null,
        websites: updatedUser.websites || "",
        github: updatedUser.github || "",
        linkedin: updatedUser.linkedin || "",
        work: updatedUser.work || [],
        education: updatedUser.education || [],
        skills: updatedUser.skills || [],
        role: updatedUser.role,
        profilePicture: updatedUser.profilePicture || null,
      },
      message: "Profile updated successfully",
    });
  } catch (err) {
    res.status(400).send("Error " + err.message);
  }
};

module.exports = {
  register,
  login,
  logout,
  adminRegister,
  deleteProfile,
  getprofile,
  getPublicProfile,
  updateProfile,
};
