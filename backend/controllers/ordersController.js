const Order = require("../models/Order");
const Product = require("../models/Product");
const Review = require("../models/Review");
const { computeOrderStatus, filterOrderItemsForProducer } = require("../utils/orderStatus");

// Créer une commande (Consumer uniquement)
async function create(req, res) {
  try {
    if (req.user.role !== "consumer") {
      return res.status(403).json({
        message: "Seuls les consommateurs peuvent créer une commande."
      });
    }

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items est requis." });
    }


    const productIds = items.map(i => i.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true
    });

    const foundIds = new Set(products.map(p => String(p._id)));
    const unavailableItems = items.filter(i => !foundIds.has(String(i.productId)));

    if (unavailableItems.length > 0) {
      const unavailableProducts = await Product.find({
        _id: { $in: unavailableItems.map(i => i.productId) }
      }).select("name");

      const unavailableNames = unavailableItems.map(item => {
        const existing = unavailableProducts.find(
          p => String(p._id) === String(item.productId)
        );
        return existing?.name || "Produit indisponible";
      });

      return res.status(409).json({
        message: "Un ou plusieurs produits de votre panier ne sont plus disponibles.",
        unavailableProducts: unavailableNames
      });
    }

    for (const i of items) {
      const qty = Number(i.qty);

      if (!Number.isFinite(qty) || qty < 1) {
        return res.status(400).json({
          message: "Quantité invalide. Chaque produit doit avoir une quantité supérieure ou égale à 1."
        });
      }
    }
    const orderItems = items.map(i => {
      const p = products.find(pp => String(pp._id) === String(i.productId));
      const qty = Number(i.qty);

      return {
        product: p._id,
        producer: p.producer,
        name: p.name,
        price: p.price,
        qty,
        image: p.image || "/images/image-par-defaut.png",
        status: "commande_validee"
      };
    });

    const subtotal = orderItems.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.qty || 0);
    }, 0);

    const fees = orderItems.length > 0 ? 2.0 : 0.0;
    const total = subtotal + fees;

    const order = await Order.create({
      user: req.user.userId,
      items: orderItems,
      subtotal,
      fees,
      total,
      status: "commande_en_cours"
    });

    return res.status(201).json(order);
  } catch (err) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: err.message
    });
  }
}

// Mes commandes (Consumer) avec avis associés
async function mine(req, res) {
  try {
    if (req.user.role !== "consumer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const orders = await Order.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    const orderIds = orders.map(order => order._id);
    const reviews = await Review.find({
      user: req.user.userId,
      order: { $in: orderIds }
    })
      .sort({ createdAt: -1 })
      .lean();

    const enrichedOrders = orders.map(order => {
      const orderReviews = reviews
        .filter(review => String(review.order) === String(order._id))
        .map(review => ({
          _id: review._id,
          productId: review.product,
          orderId: review.order,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt
        }));

      return {
        ...order,
        status: computeOrderStatus(order),
        reviews: orderReviews
      };
    });

    return res.json(enrichedOrders);
  } catch (err) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: err.message
    });
  }
}

// Commande reçues (Producer)
async function producerOrders(req, res) {
  try {
    if (req.user.role !== "producer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const orders = await Order.find({
      "items.producer": req.user.userId
    })
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    const producerOrders = orders.map(order =>
      filterOrderItemsForProducer(order, req.user.userId)
    );

    return res.json(producerOrders);
  } catch (err) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: err.message
    });
  }
}

// Mettre à jour le statut d'une commande (Producer) : route de changement de statut d’un item
async function updateItemStatus(req, res) {
  try {
    if (req.user.role !== "producer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const { status } = req.body;
    if (!["commande_validee", "en_preparation", "prete", "terminee"].includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Commande introuvable" });
    }

    const item = order.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Produit de commande introuvable" });
    }

    if (
      req.user.role !== "admin" &&
      String(item.producer) !== String(req.user.userId)
    ) {
      return res.status(403).json({
        message: "Vous ne pouvez modifier que le statut de vos propres produits."
      });
    }

    if (item.status === "terminee" && req.user.role !== "admin") {
      return res.status(409).json({
        message: "Un produit terminé ne peut plus être modifié."
      });
    }

    item.status = status;
    order.status = computeOrderStatus(order);

    await order.save();

    return res.json({
      message: "Statut du produit mis à jour.",
      order,
      producerView: filterOrderItemsForProducer(order, req.user.userId)
    });
  } catch (err) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: err.message
    });
  }
}

module.exports = { create, mine, producerOrders, updateItemStatus };
