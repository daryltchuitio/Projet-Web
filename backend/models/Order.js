const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    producer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    qty: {
      type: Number,
      required: true,
      min: 1
    },
    image: {
      type: String,
      default: "/images/image-par-defaut.png"
    },
    status: {
      type: String,
      enum: ["commande_validee", "en_preparation", "prete", "terminee"],
      default: "commande_validee"
    }
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: {
      type: [orderItemSchema],
      default: []
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    fees: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },

    // Statut global consommateur
    status: {
      type: String,
      enum: ["commande_en_cours", "commande_terminee"],
      default: "commande_en_cours"
    }
  },
  { timestamps: true }
);

orderSchema.index({ user: 1 });
orderSchema.index({ "items.producer": 1 });

module.exports = mongoose.model("Order", orderSchema);