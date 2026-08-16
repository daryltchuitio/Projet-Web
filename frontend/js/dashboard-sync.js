(function () {
  if (window.DashboardSync) return;

  // Filet de sécurité : au cas où un événement SSE arrive pendant qu'un modal
  // est ouvert et est donc ignoré, on revérifie quand même périodiquement.
  const FALLBACK_INTERVAL_MS = 60000;

  function createSignature(data) {
    try {
      return JSON.stringify(data);
    } catch {
      return String(Date.now());
    }
  }

  function start(fetchData, onChange, options = {}) {
    if (typeof fetchData !== "function" || typeof onChange !== "function") return;

    const events = options.events || ["orders"];
    let lastSignature = null;
    let isRunning = false;

    async function run() {
      if (isRunning) return;

      const modalOpen =
        document.querySelector(".order-details-modal:not(.is-hidden)") ||
        document.querySelector(".app-msg-modal:not(.app-msg-hidden)");

      if (modalOpen) return;

      isRunning = true;

      try {
        const data = await fetchData();
        const nextSignature = createSignature(data);

        if (lastSignature === null) {
          lastSignature = nextSignature;
          return;
        }

        if (nextSignature !== lastSignature) {
          lastSignature = nextSignature;
          await onChange(data);
        }
      } catch (err) {
        console.warn("[DashboardSync]", err.message);
      } finally {
        isRunning = false;
      }
    }

    run();

    const apiBase = window.APP_CONFIG?.API_BASE || "";
    const sources = events.map((eventName) => {
      const source = new EventSource(`${apiBase}/api/events/${eventName}`, { withCredentials: true });
      source.addEventListener("changed", run);
      source.onerror = () => console.warn(`[DashboardSync] flux SSE "${eventName}" interrompu, reconnexion automatique...`);
      return source;
    });

    const fallbackInterval = setInterval(run, FALLBACK_INTERVAL_MS);

    return {
      stop() {
        sources.forEach((source) => source.close());
        clearInterval(fallbackInterval);
      }
    };
  }

  window.DashboardSync = { start };
})();