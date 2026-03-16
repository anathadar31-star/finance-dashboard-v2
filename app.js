(function () {
  function toNumber(value) {
    const normalized = String(value || "0").replace(/[\s,₪]/g, "").trim();
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  }

  function parseDate(value) {
    if (!value) {
      return new Date(0);
    }

    const nativeDate = new Date(value);
    if (!Number.isNaN(nativeDate.getTime())) {
      return nativeDate;
    }

    const parts = String(value).split(/[\/.-]/).map((part) => Number(part));
    if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
      const [day, month, year] = parts;
      const d = new Date(year, month - 1, day);
      if (!Number.isNaN(d.getTime())) {
        return d;
      }
    }

    return new Date(0);
  }

  function pageConfig() {
    const sourcePage = document.body.getAttribute("data-source-page");
    const byPage = {
      bank: { sources: ["bank"], tableId: "bank-transactions-body", emptyColspan: 5 },
      card_white: { sources: ["card_white"], tableId: "card-transactions-body", emptyColspan: 5 },
      card_black: { sources: ["card_black"], tableId: "card-transactions-body", emptyColspan: 5 },
      card_max: { sources: ["card_max"], tableId: "card-transactions-body", emptyColspan: 5 },
      credit: { sources: ["card_white", "card_black", "card_max"], tableId: "card-transactions-body", emptyColspan: 5 },
    };

    return byPage[sourcePage] || null;
  }

  function normalizeSource(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getSubcategory(row) {
    return row.subcategory || row.smart_category || "";
  }

  function renderBankRows(tbody, rows, emptyColspan) {
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${emptyColspan}">אין נתונים לתצוגה.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map(
        (row) => `<tr>
          <td>${row.date || ""}</td>
          <td>${row.description || ""}</td>
          <td>${row.smart_category || row.category || ""}</td>
          <td>${formatCurrency(toNumber(row.expense))}</td>
          <td>${formatCurrency(toNumber(row.income))}</td>
        </tr>`
      )
      .join("");
  }

  function renderCardRows(tbody, rows, emptyColspan) {
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${emptyColspan}">אין נתונים לתצוגה.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((row) => {
        const expense = toNumber(row.expense);
        const income = toNumber(row.income);
        const amount = expense > 0 ? expense : income;
        return `<tr>
          <td>${row.date || ""}</td>
          <td>${row.description || ""}</td>
          <td>${formatCurrency(amount)}</td>
          <td>${row.category || ""}</td>
          <td>${getSubcategory(row)}</td>
        </tr>`;
      })
      .join("");
  }

  function renderTransactions(transactions, config) {
    const tbody = document.getElementById(config.tableId);
    if (!tbody) {
      return;
    }

    if (config.tableId === "bank-transactions-body") {
      renderBankRows(tbody, transactions, config.emptyColspan);
      return;
    }

    renderCardRows(tbody, transactions, config.emptyColspan);
  }

  function init() {
    const config = pageConfig();
    if (!config || !window.financeDataPromise) {
      return;
    }

    window.financeDataPromise.then(function (data) {
      const transactions = (Array.isArray(data) ? data : [])
        .filter(function (t) {
          return config.sources.includes(normalizeSource(t.source));
        })
        .sort(function (a, b) {
          return parseDate(b.date) - parseDate(a.date);
        });

      renderTransactions(transactions, config);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
