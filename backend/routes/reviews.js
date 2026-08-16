const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const reviewsController = require("../controllers/reviewsController");

router.post("/products/:id/reviews", auth, reviewsController.create);
router.get("/products/:id/reviews", reviewsController.listForProduct);
router.delete("/reviews/:id", auth, reviewsController.remove);

module.exports = router;
