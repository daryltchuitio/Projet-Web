const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const insightsController = require("../controllers/insightsController");

router.get("/producer/insights/forecasts", auth, insightsController.forecasts);
router.get("/producer/insights/segments", auth, insightsController.segments);

module.exports = router;
