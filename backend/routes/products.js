const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const productsController = require("../controllers/productsController");

router.post("/products", auth, productsController.create);
router.get("/products/mine", auth, productsController.mine);
router.patch("/products/:id/archive", auth, productsController.archive);
router.delete("/products/:id", auth, productsController.remove);
router.patch("/products/:id", auth, productsController.update);
router.get("/products", productsController.list);
router.get("/products/:id", productsController.getOne);

module.exports = router;
