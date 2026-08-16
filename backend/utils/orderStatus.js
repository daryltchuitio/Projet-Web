function computeOrderStatus(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  if (!items.length) return "commande_en_cours";

  const allDone = items.every(item => item.status === "terminee");
  return allDone ? "commande_terminee" : "commande_en_cours";
}

function computeProducerViewStatus(order, producerId) {
  const producerItems = (order.items || []).filter(
    item => String(item.producer) === String(producerId)
  );

  if (!producerItems.length) return "commande_en_cours";

  const allDone = producerItems.every(item => item.status === "terminee");
  return allDone ? "commande_terminee" : "commande_en_cours";
}

function filterOrderItemsForProducer(order, producerId) {
  const cloned = order.toObject ? order.toObject() : { ...order };

  cloned.items = (cloned.items || []).filter(
    item => String(item.producer) === String(producerId)
  );

  cloned.status = computeProducerViewStatus(cloned, producerId);
  return cloned;
}

module.exports = { computeOrderStatus, computeProducerViewStatus, filterOrderItemsForProducer };
