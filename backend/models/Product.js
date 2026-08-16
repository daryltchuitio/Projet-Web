const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    category: String,
    origin: String,
    region: String,
    dlc: String,
    image: String,
    producer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

productSchema.index({ producer: 1, isActive: 1 });
productSchema.index({ isActive: 1 });

module.exports = mongoose.model("Product", productSchema);
