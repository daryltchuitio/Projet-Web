(function () {
  if (window.GreenCartUtils) return;

  const STATUS_LABELS = {
    "commande_en_cours": "Commande en cours",
    "commande_terminee": "Commande terminée",
    "commande_validee": "Commandée",
    "en_preparation": "En préparation",
    "prete": "Prête à retirer",
    "terminee": "Terminée"
  };

  function getStatusLabel(status) {
    return STATUS_LABELS[status] || status || "Inconnu";
  }

  window.GreenCartUtils = {
    getStatusLabel
  };
})();
