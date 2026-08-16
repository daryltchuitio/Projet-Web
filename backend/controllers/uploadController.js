const cloudinary = require("../config/cloudinary");

// POST /api/upload (producer/admin) — upload une image vers Cloudinary, retourne son URL
async function uploadImage(req, res) {
  try {
    if (req.user.role !== "producer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier reçu." });
    }

    const uploadFromBuffer = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "greencart/products" },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });

    const result = await uploadFromBuffer();

    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de l'upload de l'image", error: err.message });
  }
}

module.exports = { uploadImage };
