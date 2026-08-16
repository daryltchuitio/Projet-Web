(function () {
  if (window.OrderDetails) return;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatCurrency(value) {
    const amount = Number(value || 0);
    return `${amount.toFixed(2)} €`;
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

  function formatStatus(status) {
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

  function makeStars(rating) {
    const safe = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return "★".repeat(safe) + "☆".repeat(5 - safe);
  }

  function injectStyles() {
    if (document.getElementById("order-details-styles")) return;

    const style = document.createElement("style");
    style.id = "order-details-styles";
    style.textContent = `
      .order-details-modal {
        position: fixed;
        inset: 0;
        z-index: 11000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      .order-details-modal.is-hidden {
        display: none !important;
      }

      .order-details-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
      }

      .order-details-panel {
        position: relative;
        z-index: 1;
        width: min(100%, 960px);
        max-height: 90vh;
        overflow: auto;
        background: #fff;
        border-radius: 18px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        padding: 24px;
      }

      .order-details-close {
        position: absolute;
        top: 12px;
        right: 14px;
        border: none;
        background: transparent;
        font-size: 28px;
        line-height: 1;
        cursor: pointer;
        color: #666;
      }

      .order-details-close:hover {
        color: #111;
      }

      .order-details-head {
        margin-bottom: 20px;
        padding-right: 36px;
      }

      .order-details-head h3 {
        margin: 0 0 10px;
        color: #1f2937;
      }

      .order-details-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin: 0;
      }

      .order-details-meta div {
        background: #f8fafc;
        border-radius: 12px;
        padding: 12px;
      }

      .order-details-meta dt {
        font-weight: 700;
        color: #374151;
        margin-bottom: 4px;
      }

      .order-details-meta dd {
        margin: 0;
        color: #4b5563;
      }

      .order-details-items {
        display: grid;
        gap: 14px;
      }

      .order-details-item {
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        padding: 16px;
        background: #fff;
      }

      .order-details-item-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }

      .order-details-item-top h4 {
        margin: 0;
        color: #1f2937;
      }

      .order-details-item-price {
        font-weight: 700;
        color: #2c6b2d;
      }

      .order-details-item-infos {
        margin: 0;
        color: #4b5563;
        line-height: 1.5;
      }

      .order-details-item-status {
        margin-top: 10px;
      }

      .order-details-item-status select {
        margin-top: 6px;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid #d1d5db;
      }

      .order-details-review {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #f0f0f0;
      }

      .order-details-review p {
        margin: 0 0 8px;
      }

      .order-details-review-stars {
        color: #f59e0b;
        font-weight: 700;
      }

      .order-details-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 10px;
      }

      .order-details-btn {
        border: none;
        border-radius: 10px;
        padding: 10px 14px;
        font: inherit;
        cursor: pointer;
      }

      .order-details-btn-primary {
        background: #2c6b2d;
        color: #fff;
      }

      .order-details-btn-secondary {
        background: #e5e7eb;
        color: #111827;
      }

      .order-details-btn-danger {
        background: #ef4444;
        color: #fff;
      }

      .order-details-footer {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
        color: #374151;
      }

      .order-details-empty {
        color: #6b7280;
      }

  .order-details-item-main {
  display: grid;
  grid-template-columns: 86px 1fr;
  gap: 14px;
  align-items: start;
}

.order-details-item-img {
  width: 86px;
  height: 86px;
  border-radius: 12px;
  object-fit: cover;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
}

.order-details-status-badge {
  display: inline-block;
  padding: 7px 12px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #374151;
  font-weight: 600;
  margin-top: 6px;
}

@media (max-width: 520px) {
  .order-details-item-main {
    grid-template-columns: 1fr;
  }

  .order-details-item-img {
    width: 100%;
    height: 140px;
  }
}
    `;

    document.head.appendChild(style);
  }

  function ensureModal() {
    injectStyles();

    let modal = document.getElementById("order-details-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "order-details-modal";
    modal.className = "order-details-modal is-hidden";
    modal.setAttribute("aria-hidden", "true");

    modal.innerHTML = `
      <div class="order-details-backdrop" data-order-details-close="true"></div>
      <div class="order-details-panel" role="dialog" aria-modal="true" aria-labelledby="order-details-title">
        <button type="button" class="order-details-close" aria-label="Fermer" data-order-details-close="true">&times;</button>
        <div id="order-details-content"></div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  function openModal(html) {
    const modal = ensureModal();
    const content = modal.querySelector("#order-details-content");
    content.innerHTML = html;

    modal.classList.remove("is-hidden");
    modal.setAttribute("aria-hidden", "false");

    function close() {
      modal.classList.add("is-hidden");
      modal.setAttribute("aria-hidden", "true");
      modal.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeydown);
    }

    function onClick(e) {
      if (e.target.closest("[data-order-details-close='true']")) {
        close();
      }
    }

    function onKeydown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }

    modal.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);

    return {
      modal,
      content,
      close
    };
  }

  function renderReviewBlock(item, order, options) {
    const {
      role = "consumer",
      canReview = false,
      getExistingReview = null
    } = options || {};

    if (role !== "consumer") return "";

    const existingReview = typeof getExistingReview === "function"
      ? getExistingReview(item, order)
      : null;

    if (existingReview) {
      return `
        <div class="order-details-review">
          <p><strong>Votre avis :</strong> <span class="order-details-review-stars">${escapeHtml(makeStars(existingReview.rating))}</span></p>
          ${existingReview.comment ? `<p>${escapeHtml(existingReview.comment)}</p>` : ""}
          <div class="order-details-actions">
            <button
              type="button"
              class="order-details-btn order-details-btn-danger btn-delete-review"
              data-review-id="${escapeHtml(existingReview._id || "")}"
              data-product-id="${escapeHtml(item.product || item.productId || "")}"
              data-order-id="${escapeHtml(order._id || order.id || "")}"
            >
              Supprimer mon avis
            </button>
          </div>
        </div>
      `;
    }

    if (!canReview) {
      return `
        <div class="order-details-review">
          <p class="form-note">Avis disponible uniquement lorsque toute la commande est terminée.</p>
        </div>
      `;
    }

    return `
      <div class="order-details-review">
        <div class="order-details-actions">
          <button
            type="button"
            class="order-details-btn order-details-btn-primary btn-add-review"
            data-product-id="${escapeHtml(item.product || item.productId || "")}"
            data-order-id="${escapeHtml(order._id || order.id || "")}"
            data-product-name="${escapeHtml(item.name || "Produit")}"
          >
            Donner un avis
          </button>
        </div>
      </div>
    `;
  }

  function renderProducerItemStatusBlock(item) {
    const itemStatus = item.status || "commande_validee";
    const itemId = item._id || "";

    if (itemStatus === "terminee") {
      return `
      <div class="order-details-item-status">
        <strong>Statut du produit :</strong><br>
        <span class="order-details-status-badge">Terminée</span>
      </div>
    `;
    }

    return `
    <div class="order-details-item-status">
      <strong>Statut du produit :</strong><br>
      <select class="producer-item-status-select" data-item-id="${escapeHtml(itemId)}" data-old-status="${escapeHtml(itemStatus)}">
        <option value="commande_validee" ${itemStatus === "commande_validee" ? "selected" : ""}>Commandée</option>
        <option value="en_preparation" ${itemStatus === "en_preparation" ? "selected" : ""}>En préparation</option>
        <option value="prete" ${itemStatus === "prete" ? "selected" : ""}>Prête à retirer</option>
        <option value="terminee" ${itemStatus === "terminee" ? "selected" : ""}>Terminée</option>
      </select>
    </div>
  `;
  }

  function buildOrderHtml(order, options = {}) {
    const {
      title = "Détail de la commande",
      role = "consumer"
    } = options;

    const items = Array.isArray(order?.items) ? order.items : [];

    const itemsHtml = items.length
      ? items.map((item) => {
        const qty = Number(item.qty || 0);
        const price = Number(item.price || 0);
        const total = qty * price;

        const canReview = role === "consumer" && order?.status === "commande_terminee";

        const imageSrc = item.image || item.productImage || "/images/image-par-defaut.png";

        return `
  <article class="order-details-item">
    <div class="order-details-item-main">
      <img
        src="${escapeHtml(imageSrc)}"
        alt="${escapeHtml(item.name || "Produit")}"
        class="order-details-item-img"
      >

      <div>
        <div class="order-details-item-top">
          <h4>${escapeHtml(item.name || "Produit")}</h4>
          <span class="order-details-item-price">${escapeHtml(formatCurrency(total))}</span>
        </div>

        <p class="order-details-item-infos">
          <strong>Quantité :</strong> ${escapeHtml(qty)}<br>
          <strong>Prix unitaire :</strong> ${escapeHtml(formatCurrency(price))}<br>
          <strong>Statut :</strong> ${escapeHtml(formatStatus(item.status))}
        </p>

        ${role === "producer" ? renderProducerItemStatusBlock(item) : ""}

        ${renderReviewBlock(item, order, {
          ...options,
          canReview
        })}
      </div>
    </div>
  </article>
`;

      }).join("")
      : `<p class="order-details-empty">Aucun produit trouvé dans cette commande.</p>`;

    return `
      <div class="order-details-head">
        <h3 id="order-details-title">${escapeHtml(title)}</h3>

        <dl class="order-details-meta">
          <div>
            <dt>Commande</dt>
            <dd>${escapeHtml(order?._id || order?.id || "—")}</dd>
          </div>
          <div>
            <dt>Statut</dt>
            <dd>${escapeHtml(formatStatus(order?.status))}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>${escapeHtml(formatDateTime(order?.createdAt))}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>${escapeHtml(formatCurrency(order?.total || 0))}</dd>
          </div>
        </dl>
      </div>

      <div class="order-details-items">
        ${itemsHtml}
      </div>

      <div class="order-details-footer">
        <p>
          <strong>Sous-total :</strong> ${escapeHtml(formatCurrency(order?.subtotal || 0))}<br>
          <strong>Frais de service :</strong> ${escapeHtml(formatCurrency(order?.fees || 0))}<br>
          <strong>Total :</strong> ${escapeHtml(formatCurrency(order?.total || 0))}
        </p>
      </div>
    `;
  }

  function bindActions(context, order, options = {}) {
    const {
      role = "consumer",
      onAddReview = null,
      onDeleteReview = null,
      onUpdateItemStatus = null,
      refreshOrder = null
    } = options;

    const root = context?.content;
    if (!root) return;

    if (root._orderDetailsClickHandler) {
      root.removeEventListener("click", root._orderDetailsClickHandler);
    }

    if (root._orderDetailsChangeHandler) {
      root.removeEventListener("change", root._orderDetailsChangeHandler);
    }

    const handleClick = async (e) => {
      const addBtn = e.target.closest(".btn-add-review");
      if (addBtn && typeof onAddReview === "function") {
        const productId = addBtn.dataset.productId;
        const orderId = addBtn.dataset.orderId;
        const productName = addBtn.dataset.productName || "Produit";

        const success = await onAddReview({
          productId,
          orderId,
          productName,
          order
        });

        if (!success) return;

        if (typeof refreshOrder === "function") {
          const updatedOrder = await refreshOrder(order);
          const nextOrder = updatedOrder || order;
          context.close();
          OrderDetails.open(nextOrder, options);
        }
        return;
      }

      const deleteBtn = e.target.closest(".btn-delete-review");
      if (deleteBtn && typeof onDeleteReview === "function") {
        const productId = deleteBtn.dataset.productId;
        const orderId = deleteBtn.dataset.orderId;
        const reviewId = deleteBtn.dataset.reviewId || "";

        const success = await onDeleteReview({
          productId,
          orderId,
          reviewId,
          order
        });

        if (!success) return;

        if (typeof refreshOrder === "function") {
          const updatedOrder = await refreshOrder(order);
          const nextOrder = updatedOrder || order;
          context.close();
          OrderDetails.open(nextOrder, options);
        }
      }
    };

    const handleChange = async (e) => {
      const select = e.target.closest(".producer-item-status-select");
      if (!select || role !== "producer" || typeof onUpdateItemStatus !== "function") return;

      const itemId = select.dataset.itemId;
      const oldStatus = select.dataset.oldStatus || "commande_validee";
      const newStatus = select.value;

      if (!itemId || oldStatus === newStatus) return;

      select.value = oldStatus;

      const success = await onUpdateItemStatus({
        itemId,
        oldStatus,
        newStatus,
        order
      });

      if (!success) return;

      if (typeof refreshOrder === "function") {
        const updatedOrder = await refreshOrder(order);
        const nextOrder = updatedOrder || order;
        context.close();
        OrderDetails.open(nextOrder, options);
      }
    };

    root._orderDetailsClickHandler = handleClick;
    root._orderDetailsChangeHandler = handleChange;

    root.addEventListener("click", handleClick);
    root.addEventListener("change", handleChange);
  }

  const OrderDetails = {
    open(order, options = {}) {
      const html = buildOrderHtml(order, options);
      const context = openModal(html);
      bindActions(context, order, options);
      return context;
    },

    formatStatus,
    formatDateTime,
    formatCurrency
  };

  window.OrderDetails = OrderDetails;
})();