const Product = require("../models/Product");
const Review = require("../models/Review");
const eventBus = require("../utils/eventBus");

// Champs qu'un producteur est autorisé à définir/modifier sur un produit
const ALLOWED_PRODUCT_FIELDS = ["name", "description", "price", "category", "origin", "region", "dlc", "image"];

function pickAllowedFields(source, allowed) {
  return Object.fromEntries(
    Object.entries(source || {}).filter(([key]) => allowed.includes(key))
  );
}

// POST /api/products (protégée)
async function create(req, res) {
  try {
    if (req.user.role !== "producer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const product = await Product.create({
      ...pickAllowedFields(req.body, ALLOWED_PRODUCT_FIELDS),
      producer: req.user.userId
    });

    eventBus.emit("products:changed");
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// Mes produits (Producer)
async function mine(req, res) {
  try {
    if (req.user.role !== "producer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const products = await Product.find({ producer: req.user.userId })
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// Archiver un produit (Producer : seulement ses produits)
async function archive(req, res) {
  try {
    if (req.user.role !== "producer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Produit introuvable" });

    const isOwner = product.producer?.toString() === req.user.userId;
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Vous ne pouvez archiver que vos produits" });
    }

    product.isActive = false;
    await product.save();

    eventBus.emit("products:changed");
    res.json({ message: "Produit archivé", product });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// Supprimer un produit (Producer : seulement ses produits)
async function remove(req, res) {
  try {
    if (req.user.role !== "producer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Produit introuvable" });

    const isOwner = product.producer?.toString() === req.user.userId;
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Vous ne pouvez supprimer que vos produits" });
    }

    await product.deleteOne();

    eventBus.emit("products:changed");
    res.json({ message: "Produit supprimé" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// Mettre à jour un produit (Producer : seulement ses produits)
async function update(req, res) {
  try {
    if (req.user.role !== "producer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Produit introuvable" });

    const isOwner = product.producer?.toString() === req.user.userId;
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Vous ne pouvez modifier que vos produits" });
    }

    Object.assign(product, pickAllowedFields(req.body, ALLOWED_PRODUCT_FIELDS));
    await product.save();

    eventBus.emit("products:changed");
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// GET /api/products (public)
async function list(req, res) {
  try {
    // produits + nom du producteur
    const products = await Product.find({ isActive: true }).populate("producer", "name").lean();

    const productIds = products.map((p) => p._id);

    // stats reviews groupées par produit
    const stats = await Review.aggregate([
      { $match: { product: { $in: productIds } } },
      {
        $group: {
          _id: "$product",
          avgRating: { $avg: "$rating" },
          reviewsCount: { $sum: 1 },
        },
      },
    ]);

    const statsMap = new Map(
      stats.map((s) => [
        s._id.toString(),
        {
          avgRating: Math.round(s.avgRating * 100) / 100,
          reviewsCount: s.reviewsCount,
        },
      ])
    );

    const result = products.map((p) => {
      const s = statsMap.get(p._id.toString()) || { avgRating: 0, reviewsCount: 0 };
      return { ...p, ...s };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// GET /api/products/:id (public) — un seul produit, actif ou archivé
async function getOne(req, res) {
  try {
    const product = await Product.findById(req.params.id).populate("producer", "name");
    if (!product) return res.status(404).json({ message: "Produit introuvable" });

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

module.exports = { create, mine, archive, remove, update, list, getOne };
