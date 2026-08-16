(function () {
  if (window.DashboardArchive) return;

  const MONTHS_FR = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre"
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function toDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    return path.split(".").reduce((acc, key) => {
      if (acc == null) return undefined;
      return acc[key];
    }, obj);
  }

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function formatMonthKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${date.getFullYear()}-${month}`;
  }

  function formatMonthLabel(monthKey) {
    const [year, month] = monthKey.split("-");
    const monthIndex = Number(month) - 1;
    return `${MONTHS_FR[monthIndex] || month} ${year}`;
  }

  function defaultSearchIndex(item, searchFields = []) {
    const values = searchFields.map((field) => getNestedValue(item, field));
    return normalizeText(values.join(" "));
  }

  function groupByYearMonth(items, dateField) {
    const validItems = Array.isArray(items) ? items : [];
    const map = new Map();

    validItems.forEach((item) => {
      const rawDate = getNestedValue(item, dateField);
      const date = toDate(rawDate);
      if (!date) return;

      const year = String(date.getFullYear());
      const monthKey = formatMonthKey(date);

      if (!map.has(year)) {
        map.set(year, new Map());
      }

      const yearMap = map.get(year);
      if (!yearMap.has(monthKey)) {
        yearMap.set(monthKey, []);
      }

      yearMap.get(monthKey).push(item);
    });

    const years = Array.from(map.entries())
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([year, monthsMap]) => {
        const months = Array.from(monthsMap.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([monthKey, monthItems]) => ({
            monthKey,
            monthLabel: formatMonthLabel(monthKey),
            items: monthItems
          }));

        return {
          year,
          months
        };
      });

    return years;
  }

  function createElement(tag, className = "", html = "") {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html) el.innerHTML = html;
    return el;
  }

  function buildSearchBox(monthItems, options) {
    const {
      searchPlaceholder = "Rechercher...",
      searchFields = [],
      renderItemsList
    } = options;

    const wrapper = createElement("div", "archive-search-wrap");
    const input = document.createElement("input");
    input.type = "search";
    input.className = "archive-search-input";
    input.placeholder = searchPlaceholder;
    input.setAttribute("aria-label", searchPlaceholder);

    const resultInfo = createElement("p", "form-note archive-search-result");
    const content = createElement("div", "archive-month-content-list");

    function renderFiltered() {
      const query = normalizeText(input.value);
      const filtered = !query
        ? monthItems
        : monthItems.filter((item) =>
          defaultSearchIndex(item, searchFields).includes(query)
        );

      resultInfo.textContent = query
        ? `${filtered.length} résultat(s) trouvé(s)`
        : `${monthItems.length} élément(s) dans ce mois`;

      content.innerHTML = "";
      renderItemsList(content, filtered);
    }

    input.addEventListener("input", renderFiltered);

    wrapper.appendChild(input);
    wrapper.appendChild(resultInfo);
    wrapper.appendChild(content);

    renderFiltered();

    return wrapper;
  }

  function renderEmpty(container, message) {
    container.innerHTML = `<p class="form-note">${escapeHtml(message)}</p>`;
  }

  function renderArchive(container, items, options = {}) {
    if (!container) return;

    const {
      dateField = "createdAt",
      emptyMessage = "Aucun élément à afficher.",
      yearLabel = "Année",
      monthLabel = "Mois",
      searchable = true,
      renderItemCard,
      renderItemsList,
      itemCountLabel = "élément(s)"
    } = options;

    if (!Array.isArray(items) || items.length === 0) {
      renderEmpty(container, emptyMessage);
      return;
    }

    const grouped = groupByYearMonth(items, dateField);

    if (!grouped.length) {
      renderEmpty(container, emptyMessage);
      return;
    }

    container.innerHTML = "";

    grouped.forEach((yearGroup, yearIndex) => {
      const yearDetails = createElement("details", "archive-year");
      if (yearIndex === 0) {
        yearDetails.open = true;
      }

      const yearSummary = createElement(
        "summary",
        "archive-year-summary",
        `
          <span class="archive-folder-title">${escapeHtml(yearLabel)} ${escapeHtml(yearGroup.year)}</span>
          <span class="archive-folder-count">${yearGroup.months.length} ${yearGroup.months.length > 1 ? "mois" : "mois"}</span>
        `
      );

      yearDetails.appendChild(yearSummary);

      const yearContent = createElement("div", "archive-year-content");

      yearGroup.months.forEach((monthGroup, monthIndex) => {
        const monthDetails = createElement("details", "archive-month");
        if (yearIndex === 0 && monthIndex === 0) {
          monthDetails.open = true;
        }

        const monthSummary = createElement(
          "summary",
          "archive-month-summary",
          `
            <span class="archive-folder-title">${escapeHtml(monthLabel)} ${escapeHtml(monthGroup.monthLabel)}</span>
            <span class="archive-folder-count">${monthGroup.items.length} ${escapeHtml(itemCountLabel)}</span>
          `
        );

        monthDetails.appendChild(monthSummary);

        const monthContent = createElement("div", "archive-month-content");

        const effectiveRenderItemsList =
          typeof renderItemsList === "function"
            ? renderItemsList
            : function defaultRenderItemsList(target, filteredItems) {
              if (!filteredItems.length) {
                target.innerHTML = '<p class="form-note">Aucun élément trouvé.</p>';
                return;
              }

              filteredItems.forEach((item) => {
                const card = typeof renderItemCard === "function"
                  ? renderItemCard(item)
                  : createElement("div", "archive-fallback-card", escapeHtml(JSON.stringify(item, null, 2)));

                if (card) target.appendChild(card);
              });
            };

        if (searchable) {
          monthContent.appendChild(
            buildSearchBox(monthGroup.items, {
              ...options,
              renderItemsList: effectiveRenderItemsList
            })
          );
        } else {
          const listContainer = createElement("div", "archive-month-content-list");
          effectiveRenderItemsList(listContainer, monthGroup.items);
          monthContent.appendChild(listContainer);
        }

        monthDetails.appendChild(monthContent);
        yearContent.appendChild(monthDetails);
      });

      yearDetails.appendChild(yearContent);
      container.appendChild(yearDetails);
    });
  }

  function splitItems(items, predicate) {
    const source = Array.isArray(items) ? items : [];
    return {
      matched: source.filter(predicate),
      unmatched: source.filter((item) => !predicate(item))
    };
  }

  function sortByDateDesc(items, dateField = "createdAt") {
    return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
      const da = toDate(getNestedValue(a, dateField));
      const db = toDate(getNestedValue(b, dateField));
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });
  }

  window.DashboardArchive = {
    groupByYearMonth,
    renderArchive,
    splitItems,
    sortByDateDesc,
    formatMonthLabel,
    escapeHtml,
    getNestedValue,
    normalizeText
  };
})();