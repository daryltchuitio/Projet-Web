document.addEventListener("DOMContentLoaded", () => {
  const CURRENT_USER_KEY = "greencart_current_user";
  const navAuth = document.getElementById("nav-auth");

  function getCurrentUser() {
    const str = localStorage.getItem(CURRENT_USER_KEY);
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  if (navAuth) {
    const user = getCurrentUser();

    if (!user) {
      navAuth.innerHTML = '<a href="connexion.html" class="btn-outline">Connexion</a>';
    } else {
      const target = user.role === "producteur"
        ? "dashboard-producteur.html"
        : "dashboard-consommateur.html";

      navAuth.innerHTML = `<a href="${target}" class="btn-outline">Mon espace</a>`;
    }
  }

  function injectSessionWarningStyles() {
    if (document.getElementById("session-warning-styles")) return;

    const style = document.createElement("style");
    style.id = "session-warning-styles";
    style.textContent = `
      .session-warning-countdown {
        margin-top: 14px;
        padding: 12px 14px;
        border-radius: 12px;
        background: #fff7ed;
        border: 1px solid #fdba74;
        color: #9a3412;
        font-weight: 700;
        text-align: center;
      }

      .session-warning-countdown strong {
        font-size: 1.05rem;
      }
    `;
    document.head.appendChild(style);
  }

  function createSessionWarningBox(seconds) {
    const box = document.createElement("div");
    box.id = "session-warning-countdown";
    box.className = "session-warning-countdown";
    box.innerHTML = `Déconnexion automatique dans <strong>${seconds}</strong> secondes.`;
    return box;
  }

  function updateSessionWarningBox(box, seconds) {
    if (!box) return;
    box.innerHTML = `Déconnexion automatique dans <strong>${seconds}</strong> secondes.`;
  }

  const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
  const WARNING_BEFORE_MS = 30 * 1000;
  const CHECK_INTERVAL_MS = 1000;

  let lastActivity = Date.now();
  let warningShown = false;
  let countdownInterval = null;

  function resetActivity() {
    lastActivity = Date.now();

    if (warningShown) {
      warningShown = false;
    }
  }

  async function logoutForInactivity() {
    const user = getCurrentUser();
    if (!user) return;

    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem("greencart_token");

    if (window.AppMessages) {
      await AppMessages.alert(
        "Pour des raisons de sécurité, vous avez été déconnecté après une période d'inactivité.",
        {
          title: "Session expirée",
          confirmText: "Se reconnecter",
          variant: "danger",
          dismissible: false
        }
      );
    } else {
      alert("Pour des raisons de sécurité, vous avez été déconnecté après une période d'inactivité.");
    }

    window.location.href = "connexion.html";
  }

  function forceLogoutWithoutAlert() {
    const user = getCurrentUser();
    if (!user) return;

    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem("greencart_token");
    window.location.href = "connexion.html";
  }

  async function showInactivityWarning() {
    if (warningShown) return;
    warningShown = true;

    injectSessionWarningStyles();

    let remainingSeconds = Math.ceil(WARNING_BEFORE_MS / 1000);
    const warningBox = createSessionWarningBox(remainingSeconds);

    const updateCountdown = () => {
      remainingSeconds -= 1;
      updateSessionWarningBox(warningBox, remainingSeconds);
    };

    countdownInterval = setInterval(updateCountdown, 1000);

    const modalPromise = window.AppMessages
      ? AppMessages.custom({
        title: "Session bientôt expirée",
        message: "Vous êtes inactif depuis un moment.",
        confirmText: "Je reste connecté",
        cancelText: "Se déconnecter",
        showCancel: true,
        dismissible: false,
        variant: "primary"
      })
      : Promise.resolve({ confirmed: false, cancelled: false });

    setTimeout(() => {
      const modalText = document.getElementById("app-msg-text");
      if (modalText && !document.getElementById("session-warning-countdown")) {
        modalText.insertAdjacentElement("afterend", warningBox);
      }
    }, 0);

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve({ timeout: true }), WARNING_BEFORE_MS);
    });

    const result = await Promise.race([modalPromise, timeoutPromise]);

    clearInterval(countdownInterval);
    countdownInterval = null;
    warningBox.remove();

    if (result?.timeout) {
      await logoutForInactivity();
      return;
    }

    if (result?.confirmed) {
      lastActivity = Date.now();
      warningShown = false;
      return;
    }

    if (result?.cancelled) {
      forceLogoutWithoutAlert();
      return;
    }
  }

  const user = getCurrentUser();
  if (user) {
    ["click", "keydown", "mousemove", "touchstart", "wheel"].forEach((evt) => {
      document.addEventListener(evt, resetActivity, { passive: true });
    });

    setInterval(async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      const now = Date.now();
      const inactiveFor = now - lastActivity;

      if (inactiveFor >= INACTIVITY_LIMIT_MS) {
        await logoutForInactivity();
        return;
      }

      if (inactiveFor >= INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS && !warningShown) {
        await showInactivityWarning();
      }
    }, CHECK_INTERVAL_MS);
  }
});
