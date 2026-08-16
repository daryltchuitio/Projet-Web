document.addEventListener("DOMContentLoaded", async () => {

  const API_BASE = window.APP_CONFIG.API_BASE;

  async function apiGetProducerOrders() {
    const res = await fetch(`${API_BASE}/api/producer/orders`, {
      credentials: "same-origin"
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Erreur chargement commandes producteur");
    return data;
  }


  async function apiDeleteMyAccount() {
    const res = await fetch(`${API_BASE}/api/me`, {
      method: "DELETE",
      credentials: "same-origin"
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Erreur suppression compte");
    return data;
  }

  const CURRENT_USER_KEY = "greencart_current_user";

  const userStr = localStorage.getItem(CURRENT_USER_KEY);

  if (!userStr) {
    window.location.href = "connexion.html";
    return;
  }
  const user = JSON.parse(userStr);

  if (user.role !== "producer") {
    window.location.href = "connexion.html";
    return;
  }

  // Le token vit dans un cookie httpOnly : on vérifie la session côté serveur.
  const meCheck = await fetch(`${API_BASE}/api/me`, { credentials: "same-origin" });
  if (!meCheck.ok) {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = "connexion.html";
    return;
  }

  const welcome = document.getElementById("user-welcome");
  welcome.textContent = "Bonjour " + user.name + ", bienvenue dans votre espace producteur.";

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

    await window.GreenCartAuth.logout();

    window.location.href = "connexion.html";
  });

  const deleteAccountBtn = document.getElementById("delete-account-btn");

  deleteAccountBtn?.addEventListener("click", async () => {
    try {
      const orders = await apiGetProducerOrders();
      const activeOrders = Array.isArray(orders)
        ? orders.filter(order => order.status !== "commande_terminee")
        : [];

      if (activeOrders.length > 0) {
        await AppMessages.alert(
          "Vous ne pouvez pas supprimer votre compte tant que toutes vos commandes ne sont pas au statut “Terminée”.",
          {
            title: "Suppression impossible",
            confirmText: "Compris",
            variant: "danger"
          }
        );
        return;
      }

      const confirmed = await AppMessages.confirm(
        "Voulez-vous vraiment supprimer définitivement votre compte producteur ? Vos produits seront retirés du catalogue. Cette action est irréversible.",
        {
          title: "Supprimer mon compte",
          confirmText: "Oui, supprimer",
          cancelText: "Annuler",
          variant: "danger"
        }
      );

      if (!confirmed) return;

      const result = await apiDeleteMyAccount();

      await AppMessages.alert(
        result.message || "Votre compte a bien été supprimé.",
        {
          title: "Compte supprimé",
          confirmText: "Continuer"
        }
      );

      await window.GreenCartAuth.logout();

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

  async function apiPatchOrderItemStatus(orderId, itemId, status) {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}/items/${itemId}/status`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Erreur mise à jour statut produit");
    return data;
  }

  async function renderSegments() {
    const container = document.getElementById("segments-block");
    if (!container) return;

    container.innerHTML = '<p class="form-note">Chargement...</p>';

    try {
      const res = await fetch(`${API_BASE}/api/producer/insights/segments`, {
        credentials: "same-origin"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur segments");

      const segments = data.segments || [];
      if (!segments.length) {
        container.innerHTML = `<p class="form-note">${data.note || "Pas assez de données."}</p>`;
        return;
      }

      container.innerHTML = `
      <table class="forecast-table">
        <thead>
          <tr>
            <th>Segment</th>
            <th>Nombre de clients</th>
            <th>Panier moyen</th>
            <th>Catégorie dominante</th>
            <th>Exemples</th>
            <th>Conseil</th>
          </tr>
        </thead>
        <tbody>
          ${segments.map(s => `
            <tr>
              <td>${DashboardArchive.escapeHtml(s.segment)}</td>
              <td>${s.usersCount}</td>
              <td>${Number(s.avgBasket).toFixed(1)} €</td>
              <td>${DashboardArchive.escapeHtml(s.dominantCategory)}</td>
              <td>${(s.examples || []).map(ex => DashboardArchive.escapeHtml(ex)).join(", ")}</td>
              <td>${DashboardArchive.escapeHtml(s.advice)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    } catch (err) {
      container.innerHTML = `<p class="form-note">Erreur : ${err.message}</p>`;
    }
  }

  async function renderForecasts() {
    const historyContainer = document.getElementById("forecasts-history");
    const nextMonthContainer = document.getElementById("forecasts-next-month");
    if (!historyContainer || !nextMonthContainer) return;

    historyContainer.innerHTML = '<p class="form-note">Chargement...</p>';
    nextMonthContainer.innerHTML = '<p class="form-note">Chargement...</p>';

    try {
      const res = await fetch(`${API_BASE}/api/producer/insights/forecasts`, {
        credentials: "same-origin"
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Erreur forecasts");

      const { historyRows, forecastRows, note } = data;

      if (!historyRows?.length) {
        historyContainer.innerHTML = `<p class="form-note">${note || "Pas assez de données."}</p>`;
      } else {
        historyContainer.innerHTML = `
        <table class="forecast-table">
          <thead>
            <tr><th>Produit</th><th>Catégorie</th><th>Période</th><th>Total</th><th>Moy / mois</th></tr>
          </thead>
          <tbody>
            ${historyRows.map(r => `
              <tr>
                <td>${DashboardArchive.escapeHtml(r.name)}</td>
                <td>${DashboardArchive.escapeHtml(r.category || "—")}</td>
                <td>${DashboardArchive.escapeHtml(r.period)}</td>
                <td>${r.total}</td>
                <td>${Number(r.avg).toFixed(1)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
      }

      if (!forecastRows?.length) {
        nextMonthContainer.innerHTML = `<p class="form-note">Pas assez de données pour prévoir le mois prochain.</p>`;
      } else {
        const label = forecastRows[0].nextMonthLabel || "mois prochain";
        nextMonthContainer.innerHTML = `
        <table class="forecast-table">
          <thead>
            <tr><th>Produit</th><th>Catégorie</th><th>Moy (3 mois)</th><th>Coeff</th><th>Prévision ${label}</th><th>Conseil</th></tr>
          </thead>
          <tbody>
            ${forecastRows.map(r => `
              <tr>
                <td>${DashboardArchive.escapeHtml(r.name)}</td>
                <td>${DashboardArchive.escapeHtml(r.category || "—")}</td>
                <td>${Number(r.avg).toFixed(1)}</td>
                <td>${Number(r.factor).toFixed(2)}</td>
                <td>${Number(r.forecast).toFixed(1)}</td>
                <td>${DashboardArchive.escapeHtml(r.advice)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
      }

    } catch (err) {
      historyContainer.innerHTML = `<p class="form-note">Erreur : ${err.message}</p>`;
      nextMonthContainer.innerHTML = `<p class="form-note">Erreur : ${err.message}</p>`;
    }
  }

  function formatDateShort(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("fr-FR");
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

  function buildProducerProductCard(p, { archived = false } = {}) {
    const created = p.createdAt ? formatDateShort(p.createdAt) : "—";
    const dlc = p.dlc ? formatDateShort(p.dlc) : "—";
    const img = p.image || "/images/image-par-defaut.png";

    const card = document.createElement("article");
    card.className = archived
      ? "product-card product-card--archived"
      : "product-card";

    card.innerHTML = `
    <div class="product-card-top">
      <img src="${DashboardArchive.escapeHtml(img)}" alt="${DashboardArchive.escapeHtml(p.name || "Produit")}" class="product-thumb">
      <div class="product-meta">
        <h4>${DashboardArchive.escapeHtml(p.name || "Produit")}</h4>
        <p class="form-note">${DashboardArchive.escapeHtml(p.category || "Catégorie")}</p>
        <p><strong>${Number(p.price || 0).toFixed(2)} €</strong></p>
      </div>
    </div>

    <ul class="product-details">
      <li><strong>Origine :</strong> ${DashboardArchive.escapeHtml(p.origin || "—")}</li>
      <li><strong>Région :</strong> ${DashboardArchive.escapeHtml(p.region || "—")}</li>
      <li><strong>DLC :</strong> ${DashboardArchive.escapeHtml(dlc)}</li>
      <li><strong>Publié le :</strong> ${DashboardArchive.escapeHtml(created)}</li>
    </ul>

    <div class="product-actions">
      <button class="btn-edit-product" data-id="${p._id}" ${archived ? "disabled" : ""}>Modifier</button>
      <button class="btn-danger btn-archive-product" data-id="${p._id}" ${archived ? "disabled" : ""}>Archiver</button>
      ${archived ? `<span class="archived-badge">✓ Produit archivé</span>` : ""}
    </div>
  `;

    return card;
  }

  function buildProducerOrderCard(order, { archived = false } = {}) {
    const dateStr = formatDateTime(order.createdAt || Date.now());
    const items = Array.isArray(order.items) ? order.items : [];

    let linesHtml = "";
    let totalProducer = 0;
    let totalQty = 0;

    items.forEach((item) => {
      const lineTotal = Number(item.price || 0) * Number(item.qty || 0);
      totalProducer += lineTotal;
      totalQty += Number(item.qty || 0);

      linesHtml += `
      <li>
        <strong>${DashboardArchive.escapeHtml(item.name || "Produit")}</strong>
        – ${Number(item.qty || 0)} × ${Number(item.price || 0).toFixed(2)} €
        = ${lineTotal.toFixed(2)} €
      </li>
    `;
    });

    const statusValue = order.status || "commande_validee";
    const isDone = statusValue === "terminee";

    const card = document.createElement("article");
    card.className = isDone ? "order-card order-card--done" : "order-card";
    card.dataset.orderId = order._id;

    card.innerHTML = `
    <div class="order-card-head">
      <h3>Commande du ${DashboardArchive.escapeHtml(dateStr)}</h3>
      ${archived ? '<span class="order-badge done">Terminée</span>' : '<span class="order-badge active">Active</span>'}
    </div>
    
    <p class="order-status">
    <strong>Statut de la commande :</strong> ${DashboardArchive.escapeHtml(getStatusLabel(statusValue))}
    </p>
    <p class="form-note">
    Le statut détaillé de chacun de vos produits se gère dans le détail de la commande.
    </p>

    <p><strong>Nombre de produits à préparer :</strong> ${totalQty}</p>
    <ul class="order-items">${linesHtml}</ul>

    <p class="order-total">
      <strong>Total pour vos produits :</strong> ${totalProducer.toFixed(2)} €<br>
      <span class="form-note">Montant total de la commande client : ${Number(order.total || totalProducer).toFixed(2)} €</span>
    </p>

    <p class="form-note">
      <strong>Commande :</strong> ${DashboardArchive.escapeHtml(order._id || "—")}<br>
      <strong>Client :</strong> ${DashboardArchive.escapeHtml(order.user?.name || "—")} (${DashboardArchive.escapeHtml(order.user?.email || "—")})<br>
      <strong>Date :</strong> ${DashboardArchive.escapeHtml(dateStr)}
    </p>

    <div class="order-details-actions">
      <button type="button" class="btn-secondary btn-open-order-details" data-order-id="${order._id}">
        Voir le détail
      </button>
    </div>
  `;

    card.querySelector(".btn-open-order-details")?.addEventListener("click", () => {
      OrderDetails.open(order, {
        title: "Détail de la commande",
        role: "producer",

        async onUpdateItemStatus({ itemId, oldStatus, newStatus, order }) {
          const confirmed = await AppMessages.confirm(
            `Voulez-vous vraiment changer le statut de ce produit de "${getStatusLabel(oldStatus)}" à "${getStatusLabel(newStatus)}" ?`,
            {
              title: "Confirmer le changement de statut",
              confirmText: "Oui, modifier",
              cancelText: "Annuler",
              variant: "danger"
            }
          );

          if (!confirmed) return false;

          try {
            await apiPatchOrderItemStatus(order._id, itemId, newStatus);

            await AppMessages.alert("Le statut du produit a bien été mis à jour.", {
              title: "Statut modifié",
              confirmText: "Continuer"
            });

            return true;
          } catch (err) {
            await AppMessages.alert(
              err.message || "Erreur lors de la mise à jour du statut.",
              {
                title: "Erreur",
                confirmText: "Fermer",
                variant: "danger"
              }
            );
            return false;
          }
        },

        async refreshOrder(currentOrder) {
          const orders = await apiGetProducerOrders();
          await renderProducerOrders();
          await renderForecasts();
          await renderSegments();

          return orders.find(o => String(o._id) === String(currentOrder._id)) || currentOrder;
        }
      });
    });

    return card;
  }

  async function renderMyProducts() {
    const recentContainer = document.getElementById("producer-products-recent");
    const archiveContainer = document.getElementById("producer-products-archive");

    if (!recentContainer || !archiveContainer) return;

    recentContainer.innerHTML = '<p class="form-note">Chargement de vos produits récents...</p>';
    archiveContainer.innerHTML = '<p class="form-note">Chargement des archives produits...</p>';

    try {
      const res = await fetch(`${API_BASE}/api/products/mine`, {
        credentials: "same-origin"
      });

      const products = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error(products.message || "Erreur chargement produits");

      if (!Array.isArray(products) || products.length === 0) {
        recentContainer.innerHTML = '<p class="form-note">Vous n’avez pas encore publié de produit.</p>';
        archiveContainer.innerHTML = '<p class="form-note">Aucune archive produit pour le moment.</p>';
        return;
      }

      const sortedProducts = DashboardArchive.sortByDateDesc(products, "createdAt");

      const activeProducts = sortedProducts.filter(p => p.isActive !== false);
      const archivedProducts = sortedProducts.filter(p => p.isActive === false);

      const recentProducts = activeProducts.slice(0, 6);

      const olderActiveProducts = activeProducts.slice(6);

      const managedProducts = [...olderActiveProducts, ...archivedProducts];

      if (!recentProducts.length) {
        recentContainer.innerHTML = '<p class="form-note">Aucun produit récent actif.</p>';
      } else {
        recentContainer.innerHTML = "";
        recentProducts.forEach((product) => {
          recentContainer.appendChild(buildProducerProductCard(product, { archived: false }));
        });
      }

      DashboardArchive.renderArchive(archiveContainer, managedProducts, {
        dateField: "createdAt",
        emptyMessage: "Aucun autre produit à afficher pour le moment.",
        itemCountLabel: "produit(s)",
        searchPlaceholder: "Rechercher un produit dans ce mois...",
        searchFields: ["name", "category", "origin", "region", "description"],
        renderItemsList(target, items) {
          if (!items.length) {
            target.innerHTML = '<p class="form-note">Aucun produit trouvé.</p>';
            return;
          }

          items.forEach((product) => {
            const isArchived = product.isActive === false;
            target.appendChild(buildProducerProductCard(product, { archived: isArchived }));
          });
        }
      });
    } catch (err) {
      console.error(err);
      recentContainer.innerHTML = `<p class="form-note">Erreur : ${err.message}</p>`;
      archiveContainer.innerHTML = `<p class="form-note">Erreur : ${err.message}</p>`;
    }
  }

  const getStatusLabel = window.GreenCartUtils.getStatusLabel;

  async function renderProducerOrders() {
    const activeContainer = document.getElementById("producer-orders-active");
    const archiveContainer = document.getElementById("producer-orders-archive");

    if (!activeContainer || !archiveContainer) return;

    activeContainer.innerHTML = '<p class="form-note">Chargement des commandes actives...</p>';
    archiveContainer.innerHTML = '<p class="form-note">Chargement des archives commandes...</p>';

    try {
      const orders = await apiGetProducerOrders();

      if (!Array.isArray(orders) || orders.length === 0) {
        activeContainer.innerHTML = '<p class="form-note">Vous n’avez pas encore reçu de commande contenant vos produits.</p>';
        archiveContainer.innerHTML = '<p class="form-note">Aucune commande archivée pour le moment.</p>';
        return;
      }

      const sortedOrders = DashboardArchive.sortByDateDesc(orders, "createdAt");
      const activeOrders = sortedOrders.filter(order => order.status !== "commande_terminee");
      const archivedOrders = sortedOrders.filter(order => order.status === "commande_terminee");

      if (!activeOrders.length) {
        activeContainer.innerHTML = '<p class="form-note">Aucune commande active à traiter.</p>';
      } else {
        activeContainer.innerHTML = "";
        activeOrders.forEach((order) => {
          activeContainer.appendChild(buildProducerOrderCard(order, { archived: false }));
        });
      }

      DashboardArchive.renderArchive(archiveContainer, archivedOrders, {
        dateField: "createdAt",
        emptyMessage: "Aucune commande archivée pour le moment.",
        itemCountLabel: "commande(s)",
        searchPlaceholder: "Rechercher une commande dans ce mois...",
        searchFields: ["_id", "user.name", "user.email", "status"],
        renderItemsList(target, items) {
          if (!items.length) {
            target.innerHTML = '<p class="form-note">Aucune commande trouvée.</p>';
            return;
          }

          items.forEach((order) => {
            target.appendChild(buildProducerOrderCard(order, { archived: true }));
          });
        }
      });

    } catch (err) {
      console.error(err);
      activeContainer.innerHTML = `<p class="form-note">Erreur : ${err.message}</p>`;
      archiveContainer.innerHTML = `<p class="form-note">Erreur : ${err.message}</p>`;
    }
  }

  const form = document.getElementById("product-form");
  const messageEl = document.getElementById("product-message");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      messageEl.textContent = "";
      messageEl.className = "form-note auth-message";

      const name = document.getElementById("prod-name").value.trim();
      const description = document.getElementById("prod-description").value.trim();
      const price = parseFloat(document.getElementById("prod-price").value);
      const category = document.getElementById("prod-category").value;
      const origin = document.getElementById("prod-origin").value.trim();
      const region = document.getElementById("prod-region").value.trim();
      const dlc = document.getElementById("prod-dlc").value;

      const fileInput = document.getElementById("prod-image");
      const file = fileInput?.files?.[0] || null;

      if (!name || !description || isNaN(price) || price <= 0 || !origin) {
        messageEl.textContent = "Merci de remplir tous les champs obligatoires correctement.";
        messageEl.classList.add("auth-error");
        return;
      }

      let imageDataUrl = "";
      if (file) {
        const MAX_BYTES = 1024 * 1024 * 2;
        if (file.size > MAX_BYTES) {
          messageEl.textContent = "Image trop lourde : elle doit faire au maximum 2 Mo.";
          messageEl.classList.add("auth-error");
          return;
        }

        const allowed = ["image/png", "image/jpeg", "image/webp"];
        if (!allowed.includes(file.type)) {
          messageEl.textContent = "Format image non supporté. Utilisez PNG, JPG/JPEG ou WebP.";
          messageEl.classList.add("auth-error");
          return;
        }

        imageDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Erreur de lecture du fichier image"));
          reader.readAsDataURL(file);
        });
      } else {
        imageDataUrl = "/images/image-par-defaut.png";
      }

      const editingId = form.dataset.editingId;

      const payload = {
        name,
        description,
        price,
        category,
        origin,
        region,
        dlc
      };

      if (file) {
        payload.image = imageDataUrl;
      }

      try {

        if (editingId) {
          const res = await fetch(`${API_BASE}/api/products/${editingId}`, {
            method: "PATCH",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            messageEl.textContent = data.message || "Erreur modification.";
            messageEl.classList.add("auth-error");
            return;
          }

          delete form.dataset.editingId;

          messageEl.textContent = "Produit modifié avec succès.";
          setTimeout(() => {
            messageEl.textContent = "";
            messageEl.className = "form-note auth-message";
          }, 5000);
          messageEl.classList.add("auth-success");

          form.reset();
          document.getElementById("cancel-edit").style.display = "none";
          document.querySelector("#product-form button[type='submit']").textContent = "Publier le produit";

          await renderMyProducts();
          await renderProducerOrders();
          await renderForecasts();
          await renderSegments();
          return;
        }

        if (!file) {
          payload.image = "/images/image-par-defaut.png";
        }

        const res = await fetch(`${API_BASE}/api/products`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)

        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error("POST /api/products failed", res.status, data);
          messageEl.textContent = data.message || data.error || `Erreur publication (${res.status})`;
          messageEl.classList.add("auth-error");
          return;
        }


        messageEl.textContent = "Produit publié avec succès. Il sera visible dans le catalogue.";
        messageEl.classList.add("auth-success");
        form.reset();

        setTimeout(() => {
          messageEl.textContent = "";
          messageEl.className = "form-note auth-message";
        }, 5000);

        await renderMyProducts();
        await renderProducerOrders();
        await renderForecasts();
        await renderSegments();

      } catch (err) {
        console.error(err);
        messageEl.textContent = "Erreur réseau / serveur.";
        messageEl.classList.add("auth-error");
      }
    });
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-archive-product");
    if (!btn) return;

    const id = btn.dataset.id;

    const ok = await AppMessages.confirm(
      "Si vous archivez ce produit, il disparaîtra du catalogue.",
      {
        title: "Archiver le produit",
        confirmText: "Archiver",
        cancelText: "Annuler",
        variant: "danger"
      }
    );
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/products/${id}/archive`, {
        method: "PATCH",
        credentials: "same-origin"
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Erreur archivage (${res.status})`);

      await renderMyProducts();
      await renderProducerOrders();
      await renderForecasts();
      await renderSegments();

      await AppMessages.alert("Le produit a bien été archivé.", {
        title: "Archivage réussi",
        confirmText: "Continuer"
      });
    } catch (err) {
      await AppMessages.alert(err.message || "Erreur lors de l’archivage du produit.", {
        title: "Erreur",
        confirmText: "Fermer",
        variant: "danger"
      });
    }
  });

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-edit-product");
    if (!btn) return;

    const id = btn.dataset.id;

    try {
      const res = await fetch(`${API_BASE}/api/products/mine`, {
        credentials: "same-origin"
      });

      const products = await res.json().catch(() => []);
      const product = Array.isArray(products) ? products.find(p => p._id === id) : null;
      if (!product) {
        await AppMessages.alert("Produit introuvable.", {
          title: "Erreur",
          confirmText: "Fermer",
          variant: "danger"
        });
        return;
      }

      document.getElementById("prod-name").value = product.name || "";
      document.getElementById("prod-description").value = product.description || "";
      document.getElementById("prod-price").value = product.price ?? "";
      document.getElementById("prod-category").value = product.category || "";
      document.getElementById("prod-origin").value = product.origin || "";
      document.getElementById("prod-region").value = product.region || "";
      document.getElementById("prod-dlc").value = product.dlc ? String(product.dlc).slice(0, 10) : "";

      form.dataset.editingId = id;

      document.getElementById("cancel-edit").style.display = "inline-block";
      document.querySelector("#product-form button[type='submit']").textContent = "Enregistrer modifications";

      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      await AppMessages.alert("Erreur lors du chargement du produit.", {
        title: "Erreur",
        confirmText: "Fermer",
        variant: "danger"
      });
    }
  });

  document.getElementById("cancel-edit")?.addEventListener("click", () => {
    delete form.dataset.editingId;
    form.reset();

    messageEl.textContent = "";
    messageEl.className = "form-note auth-message";

    document.getElementById("cancel-edit").style.display = "none";
    document.querySelector("#product-form button[type='submit']").textContent = "Publier le produit";
  });

  await renderMyProducts();
  await renderProducerOrders();
  await renderForecasts();
  await renderSegments();

  if (window.DashboardSync) {
    window.DashboardSync.start(
      async () => {
        const [products, orders] = await Promise.all([
          fetch(`${API_BASE}/api/products/mine`, {
            credentials: "same-origin"
          }).then(res => res.json()),
          apiGetProducerOrders()
        ]);

        return { products, orders };
      },
      async () => {
        await renderMyProducts();
        await renderProducerOrders();
        await renderForecasts();
        await renderSegments();
      },
      { interval: 5000 }
    );
  }

});
