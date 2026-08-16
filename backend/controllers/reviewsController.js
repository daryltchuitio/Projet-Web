const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { computeOrderStatus } = require("../utils/orderStatus");

// POST /api/products/:id/reviews (consumer, commande terminée uniquement)
async function create(req, res) {
  try {
    if (req.user.role !== "consumer") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const productId = req.params.id;
    const { rating, comment, orderId } = req.body;

    const ratingNum = parseFloat(String(rating).replace(",", "."));
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: "rating doit être un nombre entre 1 et 5" });
    }

    if (!orderId) {
      return res.status(400).json({ message: "orderId est requis." });
    }

    const product = await Product.findOne({ _id: productId });

    if (!product) {
      return res.status(409).json({
        message: "Ce produit n’est plus disponible dans le catalogue. Vous ne pouvez pas laisser d’avis."
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.userId
    });

    if (!order) {
      return res.status(404).json({ message: "Commande introuvable." });
    }

    if (computeOrderStatus(order) !== "commande_terminee") {
      return res.status(403).json({
        message: "Vous pouvez laisser un avis uniquement lorsque toute la commande est terminée."
      });
    }

    const hasProduct = (order.items || []).some(
      item => String(item.product) === String(productId)
    );

    if (!hasProduct) {
      return res.status(403).json({
        message: "Ce produit n'appartient pas à cette commande."
      });
    }

    const review = await Review.create({
      product: productId,
      order: orderId,
      user: req.user.userId,
      rating: ratingNum,
      comment: comment || ""
    });

    return res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Vous avez déjà laissé un avis pour ce produit dans cette commande."
      });
    }

    return res.status(500).json({
      message: "Erreur serveur",
      error: err.message
    });
  }
}

// GET /api/products/:id/reviews (public)
async function listForProduct(req, res) {
  try {
    const reviews = await Review.find({ product: req.params.id })
      .sort({ createdAt: -1 })
      .populate("user", "name");

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
}

// DELETE /api/reviews/:id (consumer, supprimer son avis)
async function remove(req, res) {
  try {
    if (req.user.role !== "consumer") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Avis introuvable" });

    // seul l'auteur (ou admin plus tard)
    if (review.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Vous ne pouvez supprimer que votre avis." });
    }

    await review.deleteOne();
    res.json({ message: "Avis supprimé" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
}

module.exports = { create, listForProduct, remove };
