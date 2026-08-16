(function () {
  if (window.AppMessages) return;

  const STYLE_ID = "app-messages-styles";
  const MODAL_ID = "app-messages-modal";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .app-msg-hidden {
        display: none !important;
      }

      .app-msg-modal {
        position: fixed;
        inset: 0;
        z-index: 12000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      .app-msg-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
      }

      .app-msg-box {
        position: relative;
        width: min(100%, 520px);
        max-height: 90vh;
        overflow: auto;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
        padding: 24px;
        z-index: 1;
        animation: appMsgFadeIn 0.18s ease-out;
        font-family: inherit;
      }

      @keyframes appMsgFadeIn {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .app-msg-close {
        position: absolute;
        top: 10px;
        right: 12px;
        border: none;
        background: transparent;
        font-size: 26px;
        line-height: 1;
        cursor: pointer;
        color: #666;
      }

      .app-msg-close:hover {
        color: #111;
      }

      .app-msg-image-wrap {
        margin-bottom: 16px;
        text-align: center;
      }

      .app-msg-image {
        max-width: 100%;
        max-height: 260px;
        border-radius: 12px;
        object-fit: cover;
      }

      .app-msg-title {
        margin: 0 0 10px;
        font-size: 1.25rem;
        color: #1f2937;
      }

      .app-msg-text {
        margin: 0;
        color: #4b5563;
        line-height: 1.5;
        white-space: pre-line;
      }

      .app-msg-input-wrap {
        margin-top: 16px;
      }

      .app-msg-input,
      .app-msg-textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        padding: 10px 12px;
        font: inherit;
        color: #111827;
        background: #fff;
      }

      .app-msg-input:focus,
      .app-msg-textarea:focus {
        outline: 2px solid rgba(34, 197, 94, 0.25);
        border-color: #22c55e;
      }

      .app-msg-textarea {
        min-height: 110px;
        resize: vertical;
      }

      .app-msg-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
        flex-wrap: wrap;
      }

      .app-msg-btn {
        border: none;
        border-radius: 10px;
        padding: 10px 16px;
        font: inherit;
        cursor: pointer;
        transition: filter 0.15s ease, transform 0.02s ease;
      }

      .app-msg-btn:active {
        transform: translateY(1px);
      }

      .app-msg-btn:hover {
        filter: brightness(0.96);
      }

      .app-msg-btn-primary {
        background: #2c6b2d;
        color: #fff;
      }

      .app-msg-btn-secondary {
        background: #e5e7eb;
        color: #111827;
      }

      .app-msg-btn-danger {
        background: #ef4444;
        color: #fff;
      }

      .app-msg-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .app-msg-qty-wrap {
        margin-top: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
      }

      .app-msg-qty-btn {
        width: 42px;
        height: 42px;
        border: none;
        border-radius: 10px;
        background: #e5e7eb;
        color: #111827;
        font-size: 1.3rem;
        cursor: pointer;
        font-weight: 700;
      }

      .app-msg-qty-btn:hover {
        filter: brightness(0.96);
      }

      .app-msg-qty-value {
        min-width: 48px;
        text-align: center;
        font-size: 1.1rem;
        font-weight: 700;
        color: #111827;
      }
    `;
    document.head.appendChild(style);
  }

  function injectMarkup() {
    if (document.getElementById(MODAL_ID)) return;

    const wrapper = document.createElement("div");
    wrapper.id = MODAL_ID;
    wrapper.className = "app-msg-modal app-msg-hidden";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = `
      <div class="app-msg-backdrop" data-app-msg-close="true"></div>
      <div class="app-msg-box" role="dialog" aria-modal="true" aria-labelledby="app-msg-title">
        <button class="app-msg-close" type="button" aria-label="Fermer" data-app-msg-close="true">&times;</button>

        <div class="app-msg-image-wrap app-msg-hidden" id="app-msg-image-wrap">
          <img class="app-msg-image" id="app-msg-image" src="" alt="">
        </div>

        <h3 class="app-msg-title" id="app-msg-title">Message</h3>
        <p class="app-msg-text" id="app-msg-text"></p>

        <div class="app-msg-input-wrap app-msg-hidden" id="app-msg-input-wrap">
          <input class="app-msg-input app-msg-hidden" id="app-msg-input" type="text">
          <textarea class="app-msg-textarea app-msg-hidden" id="app-msg-textarea"></textarea>
        </div>

        <div class="app-msg-qty-wrap app-msg-hidden" id="app-msg-qty-wrap">
          <button class="app-msg-qty-btn" id="app-msg-qty-minus" type="button">−</button>
          <span class="app-msg-qty-value" id="app-msg-qty-value">1</span>
          <button class="app-msg-qty-btn" id="app-msg-qty-plus" type="button">+</button>
        </div>

        <div class="app-msg-actions">
          <button class="app-msg-btn app-msg-btn-secondary app-msg-hidden" id="app-msg-cancel" type="button">Annuler</button>
          <button class="app-msg-btn app-msg-btn-primary" id="app-msg-confirm" type="button">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);
  }

  function ensureReady() {
    injectStyles();
    injectMarkup();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function show(el) {
    el.classList.remove("app-msg-hidden");
  }

  function hide(el) {
    el.classList.add("app-msg-hidden");
  }

  function openModal(config = {}) {
    ensureReady();

    const modal = byId(MODAL_ID);
    const titleEl = byId("app-msg-title");
    const textEl = byId("app-msg-text");
    const imageWrap = byId("app-msg-image-wrap");
    const imageEl = byId("app-msg-image");
    const inputWrap = byId("app-msg-input-wrap");
    const inputEl = byId("app-msg-input");
    const textareaEl = byId("app-msg-textarea");
    const confirmBtn = byId("app-msg-confirm");
    const cancelBtn = byId("app-msg-cancel");
    const qtyWrap = byId("app-msg-qty-wrap");
    const qtyMinus = byId("app-msg-qty-minus");
    const qtyPlus = byId("app-msg-qty-plus");
    const qtyValueEl = byId("app-msg-qty-value");

    const {
      title = "Message",
      message = "",
      confirmText = "OK",
      cancelText = "Annuler",
      variant = "primary",
      showCancel = false,
      dismissible = true,
      imageSrc = "",
      imageAlt = "",
      input = null,
      quantityPicker = null,
    } = config;

    titleEl.textContent = title;
    textEl.textContent = message;
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    confirmBtn.className = `app-msg-btn ${variant === "danger" ? "app-msg-btn-danger" : "app-msg-btn-primary"}`;
    cancelBtn.className = "app-msg-btn app-msg-btn-secondary";

    if (showCancel) show(cancelBtn);
    else hide(cancelBtn);

    if (imageSrc) {
      imageEl.src = imageSrc;
      imageEl.alt = imageAlt || title || "Illustration";
      show(imageWrap);
    } else {
      imageEl.src = "";
      imageEl.alt = "";
      hide(imageWrap);
    }

    hide(inputEl);
    hide(textareaEl);
    if (input) {
      show(inputWrap);
      if (input.type === "textarea") {
        textareaEl.value = input.value || "";
        textareaEl.placeholder = input.placeholder || "";
        show(textareaEl);
        setTimeout(() => textareaEl.focus(), 0);
      } else {
        inputEl.value = input.value || "";
        inputEl.placeholder = input.placeholder || "";
        show(inputEl);
        setTimeout(() => inputEl.focus(), 0);
      }
    } else {
      hide(inputWrap);
    }

    hide(qtyWrap);
    let currentQty = 1;

    if (quantityPicker) {
      currentQty = Number(quantityPicker.value || 1);
      if (!Number.isFinite(currentQty) || currentQty < 1) currentQty = 1;
      qtyValueEl.textContent = String(currentQty);
      show(qtyWrap);
    }

    modal.classList.remove("app-msg-hidden");
    modal.setAttribute("aria-hidden", "false");

    return new Promise((resolve) => {
      let settled = false;

      function getValue() {
        if (quantityPicker) return currentQty;
        if (!input) return null;
        return input.type === "textarea" ? textareaEl.value : inputEl.value;
      }

      function onQtyMinus() {
        if (!quantityPicker) return;
        if (currentQty > 1) {
          currentQty -= 1;
          qtyValueEl.textContent = String(currentQty);
        }
      }

      function onQtyPlus() {
        if (!quantityPicker) return;
        currentQty += 1;
        qtyValueEl.textContent = String(currentQty);
      }

      function cleanup(result) {
        if (settled) return;
        settled = true;
        modal.classList.add("app-msg-hidden");
        modal.setAttribute("aria-hidden", "true");

        modal.removeEventListener("click", onModalClick);
        document.removeEventListener("keydown", onKeydown);
        confirmBtn.removeEventListener("click", onConfirm);
        cancelBtn.removeEventListener("click", onCancel);
        
        if (quantityPicker) {
          qtyMinus.removeEventListener("click", onQtyMinus);
          qtyPlus.removeEventListener("click", onQtyPlus);
        }

        resolve(result);
      }

      function onConfirm() {
        cleanup({
          confirmed: true,
          cancelled: false,
          dismissed: false,
          value: getValue(),
        });
      }

      function onCancel() {
        cleanup({
          confirmed: false,
          cancelled: true,
          dismissed: false,
          value: null,
        });
      }

      function onDismiss() {
        cleanup({
          confirmed: false,
          cancelled: false,
          dismissed: true,
          value: null,
        });
      }

      function onModalClick(e) {
        const closable = e.target.closest("[data-app-msg-close='true']");
        if (closable && dismissible) onDismiss();
      }

      function onKeydown(e) {
        if (e.key === "Escape" && dismissible) {
          e.preventDefault();
          onDismiss();
          return;
        }

        if (e.key === "Enter" && input && input.type !== "textarea") {
          e.preventDefault();
          onConfirm();
        }
      }

      modal.addEventListener("click", onModalClick);
      document.addEventListener("keydown", onKeydown);
      confirmBtn.addEventListener("click", onConfirm);
      cancelBtn.addEventListener("click", onCancel);

      if (quantityPicker) {
        qtyMinus.addEventListener("click", onQtyMinus);
        qtyPlus.addEventListener("click", onQtyPlus);
      }

      if (!input) {
        setTimeout(() => confirmBtn.focus(), 0);
      }
    });
  }

  const AppMessages = {
    async alert(message, options = {}) {
      const result = await openModal({
        title: options.title || "Information",
        message,
        confirmText: options.confirmText || "OK",
        variant: options.variant || "primary",
        imageSrc: options.imageSrc || "",
        imageAlt: options.imageAlt || "",
        dismissible: options.dismissible !== false,
        showCancel: false,
      });
      return result.confirmed;
    },

    async confirm(message, options = {}) {
      const result = await openModal({
        title: options.title || "Confirmation",
        message,
        confirmText: options.confirmText || "Confirmer",
        cancelText: options.cancelText || "Annuler",
        variant: options.variant || "primary",
        imageSrc: options.imageSrc || "",
        imageAlt: options.imageAlt || "",
        dismissible: options.dismissible !== false,
        showCancel: true,
      });
      return result.confirmed;
    },

    async prompt(message, options = {}) {
      const result = await openModal({
        title: options.title || "Saisie",
        message,
        confirmText: options.confirmText || "Valider",
        cancelText: options.cancelText || "Annuler",
        variant: options.variant || "primary",
        imageSrc: options.imageSrc || "",
        imageAlt: options.imageAlt || "",
        dismissible: options.dismissible !== false,
        showCancel: true,
        input: {
          type: options.multiline ? "textarea" : "text",
          value: options.value || "",
          placeholder: options.placeholder || "",
        },
      });

      if (!result.confirmed) return null;
      return result.value;
    },

    async quantityPicker(message, options = {}) {
      const result = await openModal({
        title: options.title || "Choisir une quantité",
        message,
        confirmText: options.confirmText || "Valider",
        cancelText: options.cancelText || "Annuler",
        variant: options.variant || "primary",
        imageSrc: options.imageSrc || "",
        imageAlt: options.imageAlt || "",
        dismissible: options.dismissible !== false,
        showCancel: true,
        quantityPicker: {
          value: options.value || 1
        }
      });

      if (!result.confirmed) return null;
      return result.value;
    },

    async custom(options = {}) {
      return openModal(options);
    },

    init() {
      ensureReady();
    },
  };

  window.AppMessages = AppMessages;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => AppMessages.init());
  } else {
    AppMessages.init();
  }
})();