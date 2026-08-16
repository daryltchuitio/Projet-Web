const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { authLimiter, forgotPasswordLimiter } = require("../middleware/rateLimiter");
const authController = require("../controllers/authController");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/logout", authController.logout);
router.get("/me", auth, authController.getMe);
router.delete("/me", auth, authController.deleteMe);
router.post("/password/forgot", forgotPasswordLimiter, authController.forgotPassword);
router.post("/password/reset", authController.resetPassword);

module.exports = router;
