const CART_KEY = "greencart_cart";

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function getCartCount() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + (item.qty || 0), 0);
}

function updateCartCount() {
  const count = getCartCount();

  document.querySelectorAll(".cart-count").forEach(el => {
    el.textContent = count;

    if (count <= 0) {
      el.style.display = "none";
    } else {
      el.style.display = "inline-flex";
    }
  });
}

function notifyCartChanged() {
  window.dispatchEvent(new Event("cartUpdated"));
}

(function () {
  const originalSetItem = localStorage.setItem;
  const originalRemoveItem = localStorage.removeItem;
  const originalClear = localStorage.clear;

  localStorage.setItem = function (key, value) {
    originalSetItem.apply(this, arguments);

    if (key === CART_KEY) {
      notifyCartChanged();
    }
  };

  localStorage.removeItem = function (key) {
    originalRemoveItem.apply(this, arguments);

    if (key === CART_KEY) {
      notifyCartChanged();
    }
  };

  localStorage.clear = function () {
    originalClear.apply(this, arguments);
    notifyCartChanged();
  };
})();

document.addEventListener("DOMContentLoaded", updateCartCount);

window.addEventListener("storage", (event) => {
  if (!event.key || event.key === CART_KEY) {
    updateCartCount();
  }
});

window.addEventListener("cartUpdated", updateCartCount);
