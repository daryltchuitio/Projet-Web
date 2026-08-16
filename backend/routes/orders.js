const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const ordersController = require("../controllers/ordersController");

router.post("/orders", auth, ordersController.create);
router.get("/orders/me", auth, ordersController.mine);
router.get("/producer/orders", auth, ordersController.producerOrders);
router.patch("/orders/:orderId/items/:itemId/status", auth, ordersController.updateItemStatus);

module.exports = router;
