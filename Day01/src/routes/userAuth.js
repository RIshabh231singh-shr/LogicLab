const express = require("express");
const AuthRouter = express.Router();
const {
  register,
  login,
  logout,
  adminRegister,
  deleteProfile,
  getprofile,
  getPublicProfile,
  updateProfile,
} = require("../controllers/userAuthenticate");
const userMiddleware = require("../middleware/userMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { upload } = require("../utilities/cloudinaryUpload");

AuthRouter.post("/register", register);
AuthRouter.post("/admin/register", adminMiddleware, adminRegister);
AuthRouter.post("/login", login);
AuthRouter.post("/logout", userMiddleware, logout);
AuthRouter.delete("/profile", userMiddleware, deleteProfile);
AuthRouter.get("/check", userMiddleware, (req, res) => {
  const reply = {
    firstName: req.result.firstName,
    emailId: req.result.emailId,
    _id: req.result._id,
    role: req.result.role,
  };
  res.status(200).json({
    user: reply,
    message: "Valid User",
  });
});
AuthRouter.get("/getprofile", userMiddleware, getprofile);
AuthRouter.get("/profile/:id", userMiddleware, getPublicProfile);
AuthRouter.put("/profile", userMiddleware, upload.single("profilePicture"), updateProfile);

module.exports = { AuthRouter };
