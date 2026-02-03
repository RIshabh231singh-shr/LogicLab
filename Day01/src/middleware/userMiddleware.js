const jwt = require("jsonwebtoken");
const User = require("../models/user");
const redisclient = require("../config/redis");
const userMiddleware = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (!token) {
      throw new Error("Invalid token");
    }
    //varifing token
    const payload = await jwt.verify(token, process.env.JWT_KEY);

    const { _id } = payload;

    if (!_id) {
      throw new Error("Invalid token");
    }

    const result = await User.findById(_id);

    if (!result) {
      throw new Error("User doesn't exist");
    }

    //seeing redis ke block list me to nhi hai
    const isBlocked = await redisclient.exists(`token :${token}`);
    if (isBlocked) {
      throw new Error("Invalid Token");
    }
    req.result = result;
    next();
  } catch (err) {
    res.status(401).send("Error " + err.message);
  }
};

module.exports = userMiddleware;
