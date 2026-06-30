const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
  try {
    let token = req.cookies ? req.cookies.token : null;

    // Fallback: Check Authorization header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication token required." });
    }

    if (!process.env.JWT_KEY) {
      return res.status(500).json({ success: false, message: "JWT secret not configured." });
    }

    // Verify token
    const payload = jwt.verify(token, process.env.JWT_KEY);
    const { _id } = payload;

    if (!_id) {
      return res.status(401).json({ success: false, message: "Invalid authentication token payload." });
    }

    // Instead of querying MongoDB, construct a user object from JWT payload.
    // The notification endpoints only require the user's `_id` to query notifications.
    const user = {
      _id: _id,
      emailId: payload.emailId || "",
      role: payload.role || "user"
    };

    // Attach to request
    req.user = user;
    req.result = user; // Backup for compatibility with primary backend style
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Authentication failed: " + error.message });
  }
};

module.exports = authMiddleware;
