const rateLimit = require("express-rate-limit");

// Rate-limiting sur les routes sensibles (brute-force, spam d'emails)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives, réessayez plus tard." }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de demandes de réinitialisation, réessayez plus tard." }
});

module.exports = { authLimiter, forgotPasswordLimiter };
