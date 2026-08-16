document.addEventListener("DOMContentLoaded", () => {
  const banner = document.getElementById("cookie-banner");
  const acceptBtn = document.getElementById("cookie-accept");
  const refuseBtn = document.getElementById("cookie-refuse");

  if (!banner || !acceptBtn || !refuseBtn) return;

  const COOKIE_KEY = "greencart_cookie_consent";
  const CONSENT_DURATION_MS = 24 * 60 * 60 * 1000; 

  function getConsent() {
    try {
      const saved = localStorage.getItem(COOKIE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem(COOKIE_KEY);
      return null;
    }
  }

  function isConsentStillValid(consent) {
    if (!consent || !consent.date) return false;

    const savedDate = new Date(consent.date);
    if (Number.isNaN(savedDate.getTime())) return false;

    return Date.now() - savedDate.getTime() < CONSENT_DURATION_MS;
  }

  function saveConsent(accepted) {
    localStorage.setItem(
      COOKIE_KEY,
      JSON.stringify({
        accepted,
        date: new Date().toISOString()
      })
    );

    banner.classList.add("is-hidden");
  }

  const consent = getConsent();

  if (isConsentStillValid(consent)) {
    banner.classList.add("is-hidden");
  } else {
    localStorage.removeItem(COOKIE_KEY);
    banner.classList.remove("is-hidden");
  }

  acceptBtn.addEventListener("click", () => {
    saveConsent(true);
  });

  refuseBtn.addEventListener("click", () => {
    saveConsent(false);
  });
});