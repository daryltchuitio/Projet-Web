document.addEventListener("DOMContentLoaded", () => {

  if (!document.getElementById("cart-sync-styles")) {
    const style = document.createElement("style");
    style.id = "cart-sync-styles";
    style.textContent = `
    .cart-unavailable {
      display: inline-block;
      padding: 7px 12px;
      border-radius: 999px;
      background: #fee2e2;
      color: #991b1b;
      font-weight: 700;
    }

    .cart-item:has(.cart-unavailable) {
      opacity: 0.88;
    }

    .qty-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
    document.head.appendChild(style);
  }

  const CART_KEY_LOCAL = "greencart_cart";
  const API_BASE = window.APP_CONFIG.API_BASE;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY_LOCAL) || "[]");
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY_LOCAL, JSON.stringify(cart));
  }

  function getToken() {
    return localStorage.getItem("greencart_token");
  }

  async function checkCartAvailability(cart) {
    const res = await fetch(`${API_BASE}/api/products`);
    const products = await res.json().catch(() => []);

    if (!res.ok || !Array.isArray(products)) {
      throw new Error("Impossible de vérifier la disponibilité des produits.");
    }

    const activeIds = new Set(products.map((p) => String(p._id)));
    return cart.filter((item) => !activeIds.has(String(item.id)));
  }

  function updateTotals(cart) {
    const subtotal = cart.reduce((s, p) => {
      if (p.unavailable) return s;
      return s + p.price * p.qty;
    }, 0);
    const fees = cart.length > 0 ? 2.0 : 0.0;
    const total = subtotal + fees;

    const subtotalEl = document.getElementById("subtotal");
    const feesEl = document.getElementById("fees");
    const totalEl = document.getElementById("total");

    if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2) + " €";
    if (feesEl) feesEl.textContent = fees.toFixed(2) + " €";
    if (totalEl) totalEl.textContent = total.toFixed(2) + " €";
  }

  function renderCart() {
    const cart = getCart();
    const cartItemsDiv = document.getElementById("cart-items");
    const emptyMsg = document.getElementById("empty-cart");

    if (!cartItemsDiv || !emptyMsg) return;

    cartItemsDiv.innerHTML = "";

    if (cart.length === 0) {
      emptyMsg.style.display = "block";
      updateTotals([]);
      return;
    }

    emptyMsg.style.display = "none";

    cart.forEach((item) => {
      const article = document.createElement("article");
      article.className = "cart-item";

      article.innerHTML = `
        <div class="cart-item-left">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="cart-img">
          <div>
            <h2>${escapeHtml(item.name)}</h2>
            <p class="product-info">${escapeHtml(item.description || "")}</p>
            <p class="cart-meta"><strong>Origine :</strong> ${escapeHtml(item.origin || "—")}</p>
            <p class="cart-meta"><strong>Producteur :</strong> ${escapeHtml(item.producer || "—")}</p>
          </div>
        </div>
        <div class="cart-item-right">
          ${item.unavailable
          ? `<p class="cart-unavailable">Produit indisponible</p>`
          : `<p class="cart-price">${Number(item.price).toFixed(2)} €</p>`
        }
          <div class="qty-controls">
          <button class="qty-btn" data-action="minus" data-id="${item.id}" ${item.unavailable ? "disabled" : ""}>−</button>
          <span class="cart-qty">${item.qty}</span>
          <button class="qty-btn" data-action="plus" data-id="${item.id}" ${item.unavailable ? "disabled" : ""}>+</button>
          </div>
          <button class="remove-btn" data-id="${item.id}">Supprimer</button>
        </div>
      `;

      cartItemsDiv.appendChild(article);
    });

    updateTotals(cart);

    document.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const cart = getCart();
        const item = cart.find((p) => p.id === id);
        if (!item) return;

        if (action === "plus") item.qty += 1;
        if (action === "minus") item.qty -= 1;

        if (item.qty <= 0) {
          saveCart(cart.filter((p) => p.id !== id));
        } else {
          saveCart(cart);
        }

        if (typeof updateCartCount === "function") updateCartCount();
        renderCart();
      });
    });

    document.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        saveCart(getCart().filter((p) => p.id !== id));
        if (typeof updateCartCount === "function") updateCartCount();
        renderCart();
      });
    });
  }

  const validateBtn = document.getElementById("validate-cart");

  if (validateBtn) {
    validateBtn.addEventListener("click", async () => {
      const cart = getCart();

      if (cart.length === 0) {
        await AppMessages.alert("Votre panier est vide.", {
          title: "Panier vide",
          confirmText: "Retour au catalogue"
        });
        window.location.href = "catalogue.html";
        return;
      }

      const token = getToken();
      if (!token) {
        const result = await AppMessages.alert("Vous devez être connecté pour valider une commande.", {
          title: "Vous n'êtes pas connecté",
          confirmText: "Se connecter"
        });
        if (result !== true) return;
        window.location.href = "connexion.html";
        return;
      }

      const originalBtnText = validateBtn.textContent;
      validateBtn.disabled = true;
      validateBtn.textContent = "Traitement en cours...";

      try {
      try {
        const unavailableItems = await checkCartAvailability(cart);

        if (unavailableItems.length > 0) {
          const names = unavailableItems.map(item => `• ${item.name}`).join("\n");

          await AppMessages.alert(
            `Certains produits de votre panier ne sont plus disponibles :\n\n${names}\n\nMerci de les supprimer avant de valider votre commande.`,
            {
              title: "Produits indisponibles",
              confirmText: "Compris",
              variant: "danger"
            }
          );

          return;
        }
      } catch (err) {
        await AppMessages.alert(
          err.message || "Impossible de vérifier la disponibilité des produits.",
          {
            title: "Erreur",
            confirmText: "Fermer",
            variant: "danger"
          }
        );
        return;
      }

      const items = cart.map((p) => ({
        productId: p.id,
        qty: p.qty
      }));

      try {
        const res = await fetch(`${API_BASE}/api/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ items })
        });

        const data = await res.json().catch(() => ({}));


        if (!res.ok) {
          if (Array.isArray(data.unavailableProducts) && data.unavailableProducts.length > 0) {
            const names = data.unavailableProducts.map(name => `• ${name}`).join("\n");

            await AppMessages.alert(
              `${data.message || "Certains produits ne sont plus disponibles."}\n\n${names}\n\nMerci de les supprimer de votre panier avant de recommencer.`,
              {
                title: "Produits indisponibles",
                confirmText: "Compris",
                variant: "danger"
              }
            );
            return;
          }

          await AppMessages.alert(data.message || "Impossible de créer la commande.", {
            title: "Erreur de commande",
            confirmText: "Réessayer"
          });
          return;
        }

        saveCart([]);
        if (typeof updateCartCount === "function") updateCartCount();

        await AppMessages.alert(
          "Votre commande a été enregistrée. Vous allez être redirigé vers votre espace consommateur.",
          {
            title: "Commande enregistrée",
            confirmText: "Continuer"
          }
        );

        window.location.href = "dashboard-consommateur.html";
      } catch (err) {
        console.error(err);
        await AppMessages.alert("Impossible de contacter le serveur.", {
          title: "Erreur de réseau",
          confirmText: "Réessayer"
        });
      }
      } finally {
        validateBtn.disabled = false;
        validateBtn.textContent = originalBtnText;
      }
    });
  }

  window.addEventListener("greencart:cart-updated", async (e) => {
    renderCart();

    const unavailable = e.detail?.unavailable || [];

    if (unavailable.length > 0) {
      console.warn("Produits devenus indisponibles :", unavailable);
    }
  });

  if (window.ProductsSync) {
    window.ProductsSync.start();
  }

  if (typeof updateCartCount === "function") updateCartCount();
  renderCart();
});
