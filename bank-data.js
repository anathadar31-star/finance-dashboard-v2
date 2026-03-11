(function () {
  function formatCurrency(value) {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 2,
    }).format(value);
  }

  function toNumber(value) {
    if (value === null || value === undefined) {
      return 0;
    }

    const normalized = String(value).replace(/[,\s₪]/g, "").trim();
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : 0;
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

  function renderSummary(rows) {
    const totalIncome = rows.reduce((sum, row) => sum + toNumber(row.income), 0);
    const totalExpense = rows.reduce((sum, row) => sum + toNumber(row.expense), 0);
    const balance = totalIncome - totalExpense;

    const incomeEl = document.getElementById("monthly-income");
    const expenseEl = document.getElementById("monthly-expenses");
    const balanceEl = document.getElementById("monthly-balance");

    if (incomeEl) {
      incomeEl.textContent = formatCurrency(totalIncome);
    }
    if (expenseEl) {
      expenseEl.textContent = formatCurrency(totalExpense);
    }
    if (balanceEl) {
      balanceEl.textContent = formatCurrency(balance);
    }
  }

  function renderTransactions(rows) {
    const tbody = document.getElementById("bank-transactions-body");
    if (!tbody) {
      return;
    }

    const sorted = [...rows].sort((a, b) => parseDate(b.date) - parseDate(a.date)).slice(0, 30);

    if (sorted.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">אין נתונים לחודש הנבחר.</td></tr>';
      return;
    }

    tbody.innerHTML = sorted
      .map(
        (row) =>
          `<tr>
            <td>${row.date || ""}</td>
            <td>${row.description || ""}</td>
            <td>${row.smart_category || ""}</td>
            <td>${formatCurrency(toNumber(row.expense))}</td>
            <td>${formatCurrency(toNumber(row.income))}</td>
          </tr>`
      )
      .join("");
  }

  function renderCategorySummary(rows) {
    const tbody = document.getElementById("bank-categories-body");
    if (!tbody) {
      return;
    }

    const totalsByCategory = rows.reduce((acc, row) => {
      const key = row.smart_category || "ללא קטגוריה";
      acc[key] = (acc[key] || 0) + toNumber(row.expense);
      return acc;
    }, {});

    const summaryRows = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1]);

    if (summaryRows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2">אין נתוני קטגוריות לחודש הנבחר.</td></tr>';
      return;
    }

    tbody.innerHTML = summaryRows
      .map(
        ([category, total]) =>
          `<tr>
            <td>${category}</td>
            <td>${formatCurrency(total)}</td>
          </tr>`
      )
      .join("");
  }

  function getLatestMonth(rows) {
    const months = rows
      .map((row) => String(row.billing_month || "").trim())
      .filter((month) => /^\d{4}-\d{2}$/.test(month));

    if (months.length === 0) {
      return null;
    }

    return months.sort().at(-1) || null;
  }

  function applyBankData(data) {
    const bankRows = (Array.isArray(data) ? data : []).filter(
      (row) => String(row.source || "").trim().toLowerCase() === "bank"
    );

    const selectedMonth = getLatestMonth(bankRows);
    const selectedRows = selectedMonth
      ? bankRows.filter((row) => String(row.billing_month || "").trim() === selectedMonth)
      : [];

    renderSummary(selectedRows);
    renderTransactions(selectedRows);
    renderCategorySummary(selectedRows);
  }

  function initBankPage() {
    applyBankData(window.financeData);
  }

  function waitForData() {
    if (!window.financeData || window.financeData.length === 0) {
      setTimeout(waitForData, 100);
      return;
    }

    initBankPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForData);
  } else {
    waitForData();
  }
})();
