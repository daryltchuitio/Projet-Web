const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const eventsController = require("../controllers/eventsController");

router.get("/events/products", eventsController.streamProducts);
router.get("/events/orders", auth, eventsController.streamOrders);

module.exports = router;
