const API_BASE = window.APP_CONFIG.API_BASE;
async function apiGetProducts() {
  const res = await fetch(`${API_BASE}/api/products`);
  if (!res.ok) throw new Error("Erreur API /api/products");
  return await res.json();
}

async function apiGetProductReviews(productId) {
  const res = await fetch(`${API_BASE}/api/products/${productId}/reviews`);
  if (!res.ok) throw new Error("Erreur API /reviews");
  return await res.json();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {

  const filterCategory = document.getElementById('filter-category');
  const filterSearch = document.getElementById('filter-search');
  const listEl = document.getElementById("catalogue-list");
  const REVIEWS_KEY = "greencart_reviews";
  const modal = document.getElementById("reviews-modal");
  const modalContent = document.getElementById("reviews-modal-content");
  const modalTitle = document.getElementById("reviews-modal-title");

  async function openReviewsModal(productId) {
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `<p class="form-note">Chargement des avis...</p>`;

    try {
      const reviews = await apiGetProductReviews(productId);

      modalContent.innerHTML = "";
      if (!Array.isArray(reviews) || reviews.length === 0) {
        modalContent.innerHTML = `<p class="form-note">Aucun avis pour ce produit pour le moment.</p>`;
      } else {
        reviews.forEach(r => {
          const card = document.createElement("article");
          card.className = "review-card";

          const d = new Date(r.createdAt || Date.now());
          const dateStr = d.toLocaleString("fr-FR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
          });

          const rating = typeof r.rating === "number" ? r.rating : 0;
          const rounded = Math.round(rating);
          const stars = "★".repeat(rounded) + "☆".repeat(5 - rounded);
          const author = r.user?.name || "Client GreenCart";

          card.innerHTML = `
          <p class="review-header">
            <strong>${escapeHtml(author)}</strong> – <span class="review-date">${dateStr}</span>
          </p>
          <p class="review-stars">${stars} <span class="review-score">(${rating.toFixed(1)}/5)</span></p>
          ${r.comment ? `<p class="review-comment">${escapeHtml(r.comment)}</p>` : ""}
        `;
          modalContent.appendChild(card);
        });
      }

      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("open");
    } catch (err) {
      console.error(err);
      modalContent.innerHTML = `<p class="form-note">Impossible de charger les avis.</p>`;
      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("open");
    }
  }


  function closeReviewsModal() {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("open");
  }

  if (modal) {
    const backdrop = modal.querySelector(".modal-backdrop");
    const closeBtn = modal.querySelector(".modal-close");

    backdrop.addEventListener("click", closeReviewsModal);
    closeBtn.addEventListener("click", closeReviewsModal);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) {
        closeReviewsModal();
      }
    });
  }

  if (listEl) {
    listEl.addEventListener("click", (e) => {
      const ratingBtn = e.target.closest(".rating-link");
      if (ratingBtn) {
        const pid = ratingBtn.dataset.productId;
        openReviewsModal(pid);
      }
    });
  }

  function buildProductCard(p) {
    const article = document.createElement("article");
    article.className = "product-card";

    article.dataset.id = p._id;
    article.dataset.name = p.name;
    article.dataset.price = p.price;
    article.dataset.category = (p.category || "").toLowerCase();
    article.dataset.origin = p.origin || "";
    article.dataset.producer = p.producer?.name || "Producteur local GreenCart";
    article.dataset.description = p.description || "";
    article.dataset.image = p.image || "/images/image-par-defaut.png";
    article.dataset.region = p.region || "";
    article.dataset.dlc = p.dlc || "";

    const avg = Number(p.avgRating || 0);
    const count = Number(p.reviewsCount || 0);
    const rounded = Math.round(avg);
    const stars = "★".repeat(rounded) + "☆".repeat(5 - rounded);

    article.innerHTML = `
      <img src="${escapeHtml(article.dataset.image)}" alt="${escapeHtml(p.name)}" class="product-img">
      <h2>${escapeHtml(p.name)}</h2>
      <p class="product-info">${escapeHtml(article.dataset.description)}</p>
      <ul class="product-details">
        <li><strong>Origine :</strong> ${escapeHtml(article.dataset.origin)}</li>
        <li><strong>Producteur :</strong> ${escapeHtml(article.dataset.producer)}</li>
        ${article.dataset.region ? `<li><strong>Région :</strong> ${escapeHtml(article.dataset.region)}</li>` : ""}
        ${article.dataset.dlc ? `<li><strong>DLC :</strong> ${escapeHtml(article.dataset.dlc)}</li>` : ""}
        <li><strong>Catégorie :</strong> ${escapeHtml(article.dataset.category)}</li>
      </ul>
      <p class="product-price">${Number(article.dataset.price).toFixed(2)} €</p>

      <p class="product-rating">
        <span class="rating-stars">${stars}</span>
        <button type="button" class="rating-link" data-product-id="${escapeHtml(p._id)}">
          ${avg.toFixed(1)}/5 – ${count} avis
        </button>
      </p>

      <button class="btn-primary add-to-cart">Ajouter au panier</button>
    `;

    return article;
  }

  async function loadApiProducts() {
    if (!listEl) return;

    try {
      const products = await apiGetProducts();
      if (!Array.isArray(products)) return;

      products.forEach(p => listEl.appendChild(buildProductCard(p)));
    } catch (err) {
      console.error("Erreur loadApiProducts:", err);
    }
  }

  loadApiProducts();

  window.addEventListener("greencart:products-updated", (e) => {
    const products = e.detail?.products || [];
    if (!Array.isArray(products) || !listEl) return;

    listEl.innerHTML = "";
    products.forEach(p => listEl.appendChild(buildProductCard(p)));
    applyFilters();
  });

  if (window.ProductsSync) {
    window.ProductsSync.start();
  }

  function renderRatings() {
    let reviews;
    try {
      reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]");
    } catch {
      reviews = [];
    }
    if (!Array.isArray(reviews) || reviews.length === 0) return;

    const stats = {};
    reviews.forEach(r => {
      if (!r.productId || typeof r.rating !== "number") return;
      if (!stats[r.productId]) {
        stats[r.productId] = { sum: 0, count: 0 };
      }
      stats[r.productId].sum += r.rating;
      stats[r.productId].count += 1;
    });

    const cards = document.querySelectorAll("#catalogue-list .product-card");
    cards.forEach(card => {
      const pid = card.dataset.id;
      if (!pid || !stats[pid]) return;

      const { sum, count } = stats[pid];
      const avg = sum / count;

      const rounded = Math.round(avg);
      const stars = "★".repeat(rounded) + "☆".repeat(5 - rounded);

      let ratingEl = card.querySelector(".product-rating");
      if (!ratingEl) {
        ratingEl = document.createElement("p");
        ratingEl.className = "product-rating";

        const priceEl = card.querySelector(".product-price");
        if (priceEl) {
          priceEl.insertAdjacentElement("afterend", ratingEl);
        } else {
          card.appendChild(ratingEl);
        }
      }

      ratingEl.innerHTML = `
      <span class="rating-stars">${stars}</span>
      <button 
      type="button" 
      class="rating-link" 
      data-product-id="${pid}">
      ${avg.toFixed(1)}/5 – ${count} avis
      </button>
      `;

    });
  }

  function applyFilters() {
    const category = filterCategory ? filterCategory.value : "all";
    const search = filterSearch ? filterSearch.value.toLowerCase() : "";

    const cards = document.querySelectorAll("#catalogue-list .product-card");

    cards.forEach((card) => {
      const cardCategory = card.dataset.category;
      const title = (card.dataset.name || card.querySelector("h2")?.textContent || "").toLowerCase();
      const info = (card.dataset.description || card.querySelector(".product-info")?.textContent || "").toLowerCase();

      const matchCategory = category === 'all' || category === cardCategory;
      const matchSearch = title.includes(search) || info.includes(search);

      card.style.display = (matchCategory && matchSearch) ? '' : 'none';
    });
  }

  if (filterCategory && filterSearch) {
    filterCategory.addEventListener('change', applyFilters);
    filterSearch.addEventListener('input', applyFilters);
  }

  function getCart() {
    return JSON.parse(localStorage.getItem("greencart_cart") || "[]");
  }

  function saveCart(cart) {
    localStorage.setItem("greencart_cart", JSON.stringify(cart));
  }

  function addToCart(product, quantity) {
    const cart = getCart();
    const existing = cart.find(p => p.id === product.id);

    const qtyToAdd = Number(quantity || 1);

    if (existing) {
      existing.qty += qtyToAdd;
    } else {
      cart.push({ ...product, qty: qtyToAdd });
    }

    saveCart(cart);

    if (typeof updateCartCount === "function") {
      updateCartCount();
    }
  }

  if (listEl) {
    listEl.addEventListener("click", async (e) => {
      const btn = e.target.closest(".add-to-cart");
      if (!btn) return;

      const card = btn.closest(".product-card");
      if (!card) return;

      const product = {
        id: card.dataset.id,
        name: card.dataset.name,
        price: parseFloat(card.dataset.price),
        origin: card.dataset.origin,
        producer: card.dataset.producer,
        description: card.dataset.description,
        image: card.dataset.image
      };

      const quantity = await AppMessages.quantityPicker(
        `Choisissez la quantité à ajouter pour "${product.name}".`,
        {
          title: "Ajouter au panier",
          confirmText: "Valider",
          cancelText: "Annuler",
          value: 1
        }
      );

      if (quantity === null) return;

      addToCart(product, quantity);

      const toast = document.createElement("div");
      toast.className = "catalogue-toast-success";
      toast.textContent = `${product.name} ajouté au panier.`;
      document.body.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.add("show");
      });

      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 250);
      }, 1200);
    });
  }

  applyFilters();
});

if (!document.getElementById("catalogue-toast-styles")) {
  const style = document.createElement("style");
  style.id = "catalogue-toast-styles";
  style.textContent = `
      .catalogue-toast-success {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 13000;
        background: #2c6b2d;
        color: #fff;
        padding: 12px 16px;
        border-radius: 12px;
        box-shadow: 0 12px 30px rgba(0,0,0,0.18);
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        font-weight: 600;
      }

      .catalogue-toast-success.show {
        opacity: 1;
        transform: translateY(0);
      }
    `;
  document.head.appendChild(style);
}
