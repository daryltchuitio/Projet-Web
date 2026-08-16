document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("newsletter-form");
  if (!form) return;

  const msg = document.getElementById("newsletter-message");
  const defaultMessageHtml = msg ? msg.innerHTML : "";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (msg) msg.textContent = "Cette fonctionnalité arrive bientôt. Merci de votre intérêt !";
    form.reset();

    setTimeout(() => {
      if (msg) msg.innerHTML = defaultMessageHtml;
    }, 6000);
  });
});
