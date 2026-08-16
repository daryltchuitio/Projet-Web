(function () {
  if (window.ProductsSync) return;

  const SYNC_INTERVAL_MS = 5000;
  const CART_KEY = "greencart_cart";

  function getApiBase() {
    return window.APP_CONFIG?.API_BASE || "";
  }

  async function fetchProducts() {
    const res = await fetch(`${getApiBase()}/api/products`);
    const data = await res.json().catch(() => []);

    if (!res.ok || !Array.isArray(data)) {
      throw new Error("Impossible de synchroniser les produits.");
    }

    return data;
  }

  function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function syncCartWithProducts(products) {
    const cart = getCart();
    if (!cart.length) return { changed: false, unavailable: [] };

    const productMap = new Map(products.map(p => [String(p._id), p]));
    let changed = false;
    const unavailable = [];

    const nextCart = cart.map(item => {
      const fresh = productMap.get(String(item.id));

      if (!fresh) {
        unavailable.push(item.name);
        if (item.unavailable !== true) changed = true;

        return {
          ...item,
          unavailable: true
        };
      }

      const updatedItem = {
        ...item,
        name: fresh.name,
        price: Number(fresh.price),
        origin: fresh.origin || "",
        producer: fresh.producer?.name || item.producer || "Producteur local GreenCart",
        description: fresh.description || "",
        image: fresh.image || "/images/image-par-defaut.png",
        unavailable: false
      };

      if (
        item.name !== updatedItem.name ||
        Number(item.price) !== Number(updatedItem.price) ||
        item.origin !== updatedItem.origin ||
        item.producer !== updatedItem.producer ||
        item.description !== updatedItem.description ||
        item.image !== updatedItem.image ||
        item.unavailable !== updatedItem.unavailable
      ) {
        changed = true;
      }

      return updatedItem;
    });

    if (changed) {
      saveCart(nextCart);

      if (typeof updateCartCount === "function") {
        updateCartCount();
      }

      window.dispatchEvent(new CustomEvent("greencart:cart-updated", {
        detail: {
          cart: nextCart,
          unavailable
        }
      }));
    }

    return { changed, unavailable };
  }

  async function syncOnce() {
    try {
      const products = await fetchProducts();

      window.dispatchEvent(new CustomEvent("greencart:products-updated", {
        detail: { products }
      }));

      syncCartWithProducts(products);

      return products;
    } catch (err) {
      console.warn("[ProductsSync]", err.message);
      return null;
    }
  }

  function start() {
    syncOnce();
    setInterval(syncOnce, SYNC_INTERVAL_MS);
  }

  window.ProductsSync = {
    start,
    syncOnce,
    syncCartWithProducts
  };
})();