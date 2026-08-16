const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const reviewsRoutes = require("./routes/reviews");
const insightsRoutes = require("./routes/insights");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    }
  }
}));

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

// Servir tous les fichiers statiques du frontend
app.use(express.static(FRONTEND_DIR));

// Page d'accueil
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.use(cors({
  // TODO: ajouter l'URL du frontend une fois déployé
  origin: [
    "http://localhost:4040",
    "http://127.0.0.1:4040"
  ],
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Route health
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    mongoConnected: mongoose.connection.readyState === 1
  });
});

app.use("/api", authRoutes);
app.use("/api", productsRoutes);
app.use("/api", ordersRoutes);
app.use("/api", reviewsRoutes);
app.use("/api", insightsRoutes);

console.log("🔎 MONGODB_URI détectée ?", Boolean(MONGODB_URI));

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connecté !");
    app.listen(PORT, () => {
      console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Erreur connexion MongoDB :", err.message);
    process.exit(1);
  });
