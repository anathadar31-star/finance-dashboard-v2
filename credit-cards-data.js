(function () {
  const SOURCE_FILTERS = {
    all: ["card_white", "card_black", "card_max"],
    card_white: ["card_white"],
    card_black: ["card_black"],
    card_max: ["card_max"],
  };

  function toNumber(value) {
    const normalized = String(value || "0").replace(/[,\s₪]/g, "").trim();
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 2,
    }).format(value);
  }

  function parseDate(value) {
    if (!value) {
      return new Date(0);
    }

    const iso = new Date(value);
    if (!Number.isNaN(iso.getTime())) {
      return iso;
    }

    const parts = String(value).split(/[\/.-]/);
    if (parts.length === 3) {
      const [day, month, year] = parts.map((part) => Number(part));
      const d = new Date(year, month - 1, day);
      if (!Number.isNaN(d.getTime())) {
        return d;
      }
    }

    return new Date(0);
  }

  function getAmount(row) {
    const expense = toNumber(row.expense);
    const income = toNumber(row.income);
    return expense > 0 ? expense : income;
  }

  function getSubcategory(row) {
    return row.subcategory || row.smart_category || "";
  }

  function getSourceFilter() {
    return document.body.getAttribute("data-card-source") || "all";
  }

  function renderTable(rows) {
    const tbody = document.getElementById("card-transactions-body");
    if (!tbody) {
      return;
    }

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">אין נתונים לתצוגה.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map(
        (row) =>
          `<tr>
            <td>${row.date || ""}</td>
            <td>${row.description || ""}</td>
            <td>${formatCurrency(getAmount(row))}</td>
            <td>${row.category || ""}</td>
            <td>${getSubcategory(row)}</td>
          </tr>`
      )
      .join("");
  }

  function buildRows(data) {
    const sourceKey = getSourceFilter();
    const allowed = SOURCE_FILTERS[sourceKey] || SOURCE_FILTERS.all;

    return (Array.isArray(data) ? data : [])
      .filter((row) => allowed.includes(String(row.source || "").trim().toLowerCase()))
      .sort((a, b) => parseDate(b.date) - parseDate(a.date));
  }

  function init() {
    const promise = window.financeDataPromise || Promise.resolve(window.financeData || []);
    promise.then((data) => {
      const rows = buildRows(data);
      renderTable(rows);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
