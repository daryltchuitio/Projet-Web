(function () {
  if (window.DashboardSync) return;

  const DEFAULT_INTERVAL_MS = 5000;

  function stableStringify(value) {
    return JSON.stringify(value, Object.keys(value || {}).sort());
  }

  function createSignature(data) {
    try {
      return JSON.stringify(data);
    } catch {
      return String(Date.now());
    }
  }

  function start(fetchData, onChange, options = {}) {
    if (typeof fetchData !== "function" || typeof onChange !== "function") return;

    const interval = options.interval || DEFAULT_INTERVAL_MS;
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
    return setInterval(run, interval);
  }

  window.DashboardSync = { start };
})();