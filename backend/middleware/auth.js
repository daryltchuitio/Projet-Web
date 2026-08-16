const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const token = req.cookies?.greencart_token;

  if (!token) {
    return res.status(401).json({ message: "Token manquant" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // ex: { userId: "...", iat: ..., exp: ... }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
}

module.exports = auth;
