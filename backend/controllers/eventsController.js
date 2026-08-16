const eventBus = require("../utils/eventBus");

const HEARTBEAT_MS = 25000;

function openStream(req, res, eventName) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });
  res.write("\n");

  const notify = () => res.write("event: changed\ndata: {}\n\n");
  eventBus.on(eventName, notify);

  const heartbeat = setInterval(() => res.write(":heartbeat\n\n"), HEARTBEAT_MS);

  req.on("close", () => {
    eventBus.off(eventName, notify);
    clearInterval(heartbeat);
  });
}

// GET /api/events/products (public) — notifie sur creation/modification/archivage/suppression de produit
function streamProducts(req, res) {
  openStream(req, res, "products:changed");
}

// GET /api/events/orders (auth) — notifie sur creation de commande ou changement de statut d'un item
function streamOrders(req, res) {
  openStream(req, res, "orders:changed");
}

module.exports = { streamProducts, streamOrders };
