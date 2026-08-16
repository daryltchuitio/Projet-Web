const express = require("express");
const multer = require("multer");
const router = express.Router();
const auth = require("../middleware/auth");
const uploadController = require("../controllers/uploadController");

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 Mo

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error("Format image non supporté. Utilisez PNG, JPG/JPEG ou WebP."));
    }
    cb(null, true);
  }
});

router.post("/upload", auth, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, uploadController.uploadImage);

module.exports = router;
