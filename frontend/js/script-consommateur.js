document.addEventListener("DOMContentLoaded", async () => {

  const CURRENT_USER_KEY = "greencart_current_user";
  const ORDERS_KEY = "greencart_orders";
  const REVIEWS_KEY = "greencart_reviews";

  const API_BASE = window.APP_CONFIG.API_BASE;
  const TOKEN_KEY = "greencart_token";

  const userStr = localStorage.getItem(CURRENT_USER_KEY);
  const token = localStorage.getItem("greencart_token");

  if (!userStr || !token) {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem("greencart_token");
    window.location.href = "connexion.html";
    return;
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  async function apiGetProductReviews(productId) {
    const res = await fetch(`${API_BASE}/api/products/${productId}/reviews`);
    if (!res.ok) throw new Error("Erreur API reviews");
    return await res.json();
  }

  async function apiDeleteMyReview(reviewId) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/reviews/${reviewId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Erreur suppression avis");
    return data;
  }

  async function apiCreateReview(productId, orderId, rating, comment) {
    const token = getToken();

    const res = await fetch(`${API_BASE}/api/products/${productId}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ orderId, rating, comment })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Erreur création avis (${res.status})`);
    return data;
  }


  function loadReviews() {
    return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]");
  }

  function saveReviews(reviews) {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
  }

  async function apiCheckProductAvailable(productId) {
    const res = await fetch(`${API_BASE}/api/products`);
    const products = await res.json().catch(() => []);

    if (!res.ok || !Array.isArray(products)) {
      throw new Error("Impossible de vérifier la disponibilité du produit.");
    }

    return products.some(p => String(p._id) === String(productId));
  }

  function formatOrderStatus(status) {
    switch (status) {
      case "commande_en_cours":
        return "Commande en cours";
      case "commande_terminee":
        return "Commande terminée";
      case "commande_validee":
        return "Commandée";
      case "en_preparation":
        return "En préparation";
      case "prete":
        return "Prête à retirer";
      case "terminee":
        return "Terminée";
      default:
        return status || "Inconnu";
    }
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date inconnue";

    return date.toLocaleString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function buildConsumerOrderCard(order, { archived = false } = {}) {
    const card = document.createElement("article");
    card.className = archived ? "order-card order-card--done" : "order-card";

    const dateStr = formatDateTime(order.createdAt || Date.now());
    const totalItems = Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
      : 0;

    card.innerHTML = `
    <div class="order-card-head">
      <h3>Commande du ${DashboardArchive.escapeHtml(dateStr)}</h3>
      ${archived ? '<span class="order-badge done">Commande terminée</span>' : '<span class="order-badge active">Commande en cours</span>'}
    </div>

    <p class="order-status">
      <strong>Statut :</strong> ${DashboardArchive.escapeHtml(formatOrderStatus(order.status))}
    </p>

    <p><strong>Nombre de produits :</strong> ${totalItems}</p>

    <p class="order-total">
      Sous-total : ${Number(order.subtotal || 0).toFixed(2)} €<br>
      Frais de service : ${Number(order.fees || 0).toFixed(2)} €<br>
      <strong>Total : ${Number(order.total || 0).toFixed(2)} €</strong>
    </p>

    <div class="order-details-actions">
      <button type="button" class="btn-secondary btn-open-order-details">
        Voir le détail
      </button>
    </div>
  `;

    card.querySelector(".btn-open-order-details")?.addEventListener("click", () => {
      OrderDetails.open(order, {
        title: "Détail de ma commande",
        role: "consumer",


        getExistingReview(item, currentOrder) {
          return (currentOrder.reviews || []).find(r =>
            String(r.productId) === String(item.product)
          ) || null;
        },


        async onAddReview({ productId, orderId, productName, order }) {
          try {
            const available = await apiCheckProductAvailable(productId);

            if (!available) {
              await AppMessages.alert(
                "Ce produit n’est plus disponible dans le catalogue. Vous ne pouvez pas laisser d’avis.",
                {
                  title: "Produit indisponible",
                  confirmText: "Compris",
                  variant: "danger"
                }
              );
              return false;
            }
          } catch (err) {
            await AppMessages.alert(
              err.message || "Impossible de vérifier la disponibilité du produit.",
              {
                title: "Erreur",
                confirmText: "Fermer",
                variant: "danger"
              }
            );
            return false;
          }

          const ratingStr = await AppMessages.prompt(`Donnez une note pour "${productName}" (1 à 5) :`, {
            title: "Donner un avis",
            placeholder: "Ex: 4.5",
            confirmText: "Valider",
            cancelText: "Annuler"
          });

          if (ratingStr === null) return false;

          const rating = parseFloat(String(ratingStr).replace(",", "."));
          if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            await AppMessages.alert("Mettez un nombre entre 1 et 5 (ex: 4.5).", {
              title: "Note invalide",
              confirmText: "Réessayer"
            });
            return false;
          }

          const comment = await AppMessages.prompt("Commentaire (optionnel) :", {
            title: "Donner un avis",
            placeholder: "Votre commentaire...",
            confirmText: "Valider",
            cancelText: "Soumettre sans commentaire"
          });

          try {
            await apiCreateReview(productId, orderId, rating, comment || "");

            await AppMessages.alert("Merci pour votre retour.", {
              title: "Avis enregistré",
              confirmText: "Continuer"
            });

            return true;
          } catch (err) {
            if (String(err.message).includes("déjà laissé")) {
              await AppMessages.alert("Vous avez déjà laissé un avis pour ce produit.", {
                title: "Avis déjà envoyé",
                confirmText: "Continuer"
              });
              return false;
            }

            await AppMessages.alert("Une erreur est survenue lors de l'enregistrement de votre avis.", {
              title: "Erreur",
              confirmText: "Réessayer"
            });
            return false;
          }
        },


        async onDeleteReview({ productId, orderId, reviewId, order }) {
          if (!reviewId) {
            await AppMessages.alert("Impossible de retrouver l'identifiant de l'avis à supprimer.", {
              title: "Erreur",
              confirmText: "Fermer",
              variant: "danger"
            });
            return false;
          }

          const ok = await AppMessages.confirm(
            "Voulez-vous vraiment supprimer votre avis ?",
            {
              title: "Supprimer mon avis",
              confirmText: "Supprimer",
              cancelText: "Annuler",
              variant: "danger"
            }
          );
          if (!ok) return false;

          try {
            await apiDeleteMyReview(reviewId);

            await AppMessages.alert("Votre avis a bien été supprimé.", {
              title: "Avis supprimé",
              confirmText: "Continuer"
            });

            return true;
          } catch (err) {
            await AppMessages.alert(err.message || "Erreur lors de la suppression de l'avis.", {
              title: "Erreur",
              confirmText: "Fermer",
              variant: "danger"
            });
            return false;
          }
        },

        async refreshOrder(currentOrder) {
          const freshOrders = await reloadMyOrders();
          userOrders = freshOrders;
          allReviews = userOrders.flatMap(order =>
            (order.reviews || []).map(review => ({
              ...review,
              orderId: order._id
            }))
          );
          renderConsumerOrders(userOrders);
          return freshOrders.find(o => String(o._id) === String(currentOrder._id)) || currentOrder;
        }
      });
    });

    return card;
  }

  const user = JSON.parse(userStr);

  if (user.role !== "consommateur") {
    window.location.href = "connexion.html";
    return;
  }

  const welcome = document.getElementById("user-welcome");
  welcome.textContent = "Bonjour " + user.name + ", bienvenue dans votre espace consommateur.";

  const logoutBtn = document.getElementById("logout-btn");

  logoutBtn.addEventListener("click", async () => {
    const confirmed = await AppMessages.confirm(
      "Voulez-vous vraiment vous déconnecter ?",
      {
        title: "Déconnexion",
        confirmText: "Se déconnecter",
        cancelText: "Annuler",
        variant: "danger"
      }
    );

    if (!confirmed) return;

    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem("greencart_token");

    window.location.href = "connexion.html";
  });


  const deleteAccountBtn = document.getElementById("delete-account-btn");

  deleteAccountBtn?.addEventListener("click", async () => {
    const confirmed = await AppMessages.confirm(
      "Voulez-vous vraiment supprimer définitivement votre compte consommateur ? Cette action est irréversible.",
      {
        title: "Supprimer mon compte",
        confirmText: "Oui, supprimer",
        cancelText: "Annuler",
        variant: "danger"
      }
    );

    if (!confirmed) return;

    try {
      const result = await apiDeleteMyAccount();

      await AppMessages.alert(
        result.message || "Votre compte a bien été supprimé.",
        {
          title: "Compte supprimé",
          confirmText: "Continuer"
        }
      );

      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem("greencart_token");

      window.location.href = "connexion.html";
    } catch (err) {
      await AppMessages.alert(
        err.message || "Erreur lors de la suppression du compte.",
        {
          title: "Erreur",
          confirmText: "Fermer",
          variant: "danger"
        }
      );
    }
  });



  async function reloadMyOrders() {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/orders/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json().catch(() => ([]));
    if (!res.ok) {
      throw new Error(data.message || "Impossible de recharger vos commandes.");
    }

    return data;
  }


  async function apiDeleteMyAccount() {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/me`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Erreur lors de la suppression du compte.");
    }
    return data;
  }


  const activeOrdersContainer = document.getElementById("consumer-orders-active");
  const archiveOrdersContainer = document.getElementById("consumer-orders-archive");

  if (activeOrdersContainer) {
    activeOrdersContainer.innerHTML = '<p class="form-note">Chargement de vos commandes en cours...</p>';
  }
  if (archiveOrdersContainer) {
    archiveOrdersContainer.innerHTML = '<p class="form-note">Chargement de l’historique de vos commandes...</p>';
  }

  let userOrders = [];
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "connexion.html";
      return;
    }

    const res = await fetch(`${API_BASE}/api/orders/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      window.location.href = "connexion.html";
      return;
    }

    userOrders = await res.json();

  } catch (err) {
    console.error("Erreur récupération commandes:", err);

    if (activeOrdersContainer) {
      activeOrdersContainer.innerHTML = '<p class="form-note">Impossible de charger vos commandes en cours.</p>';
    }

    if (archiveOrdersContainer) {
      archiveOrdersContainer.innerHTML = '<p class="form-note">Impossible de charger l’historique de vos commandes.</p>';
    }

    return;
  }


  let allReviews = userOrders.flatMap(order =>
    (order.reviews || []).map(review => ({
      ...review,
      orderId: order._id
    }))
  );


  const impactOrdersEl = document.getElementById("impact-orders");
  const impactTotalEl = document.getElementById("impact-total");
  const impactSavingsEl = document.getElementById("impact-savings");
  const impactKgEl = document.getElementById("impact-kg");
  const impactCo2El = document.getElementById("impact-co2");

  const nbOrders = userOrders.length;
  const totalSpent = userOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const estimatedSavings = totalSpent * 0.30;

  let totalItems = 0;
  userOrders.forEach(o => {
    (o.items || []).forEach(item => {
      totalItems += (item.qty || 1);
    });
  });
  const kgSaved = totalItems * 2;
  const co2Saved = kgSaved * 0.5;

  if (impactOrdersEl) impactOrdersEl.textContent = nbOrders;
  if (impactTotalEl) impactTotalEl.textContent = totalSpent.toFixed(2) + " €";
  if (impactSavingsEl) impactSavingsEl.textContent = estimatedSavings.toFixed(2) + " €";
  if (impactKgEl) impactKgEl.textContent = kgSaved.toFixed(1) + " kg";
  if (impactCo2El) impactCo2El.textContent = co2Saved.toFixed(1) + " kg CO₂";


  function renderConsumerOrders(userOrders) {
    const activeContainer = document.getElementById("consumer-orders-active");
    const archiveContainer = document.getElementById("consumer-orders-archive");

    if (!activeContainer || !archiveContainer) return;

    if (!Array.isArray(userOrders) || userOrders.length === 0) {
      activeContainer.innerHTML = '<p class="form-note">Vous n’avez pas encore passé de commande.</p>';
      archiveContainer.innerHTML = '<p class="form-note">Vous n’avez pas encore de commande archivée.</p>';
      return;
    }

    const sortedOrders = DashboardArchive.sortByDateDesc(userOrders, "createdAt");
    const activeOrders = sortedOrders.filter(order => order.status !== "commande_terminee");
    const archivedOrders = sortedOrders.filter(order => order.status === "commande_terminee");

    if (!activeOrders.length) {
      activeContainer.innerHTML = '<p class="form-note">Aucune commande en cours.</p>';
    } else {
      activeContainer.innerHTML = "";
      activeOrders.forEach((order) => {
        activeContainer.appendChild(buildConsumerOrderCard(order, { archived: false }));
      });
    }

    DashboardArchive.renderArchive(archiveContainer, archivedOrders, {
      dateField: "createdAt",
      emptyMessage: "Vous n’avez pas encore de commande archivée.",
      itemCountLabel: "commande(s)",
      searchPlaceholder: "Rechercher une commande dans ce mois...",
      searchFields: ["_id", "status"],
      renderItemsList(target, items) {
        if (!items.length) {
          target.innerHTML = '<p class="form-note">Aucune commande trouvée.</p>';
          return;
        }

        items.forEach((order) => {
          target.appendChild(buildConsumerOrderCard(order, { archived: true }));
        });
      }
    });
  }

  async function refreshConsumerDashboard() {
    const freshOrders = await reloadMyOrders();
    userOrders = freshOrders;

    allReviews = userOrders.flatMap(order =>
      (order.reviews || []).map(review => ({
        ...review,
        orderId: order._id
      }))
    );

    renderConsumerOrders(userOrders);
  }

  renderConsumerOrders(userOrders);

  if (window.DashboardSync) {
    window.DashboardSync.start(
      async () => {
        return await reloadMyOrders();
      },
      async (freshOrders) => {
        userOrders = freshOrders;

        allReviews = userOrders.flatMap(order =>
          (order.reviews || []).map(review => ({
            ...review,
            orderId: order._id
          }))
        );

        renderConsumerOrders(userOrders);
      },
      { interval: 5000 }
    );
  }

});