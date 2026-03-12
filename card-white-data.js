(function () {
  const smartCategoryLabels = {
    salary: "משכורת",
    child_benefit: "קצבת ילדים",
    tax: "מיסים",
    insurance: "ביטוח",
    health: "בריאות",
    utilities: "חשבונות",
    subscription: "מנויים",
    loan: "הלוואות",
    bank_fee: "עמלות בנק",
    credit_settlement: "כרטיסי אשראי",
    cash_withdrawal: "משיכת מזומן",
    saving: "חיסכון",
    transfer: "העברה",
    refund: "זיכוי",
  };

  function formatCurrency(value) {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 2,
    }).format(value);
  }

  function toNumber(value) {
    const normalized = String(value || "0").replace(/[,\s₪]/g, "").trim();
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function getCategoryLabel(key) {
    const normalizedKey = String(key || "").trim();
    return smartCategoryLabels[normalizedKey] || normalizedKey;
  }

  function renderSummary(model) {
    const incomeEl = document.getElementById("monthly-income");
    const expenseEl = document.getElementById("monthly-expenses");
    const balanceEl = document.getElementById("monthly-balance");

    if (incomeEl) incomeEl.textContent = formatCurrency(model.totals.income);
    if (expenseEl) expenseEl.textContent = formatCurrency(model.totals.expense);
    if (balanceEl) balanceEl.textContent = formatCurrency(model.totals.net);
  }

  function renderCategoryList(containerId, totals, percentages) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const entries = Object.entries(totals || {}).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      container.innerHTML = "<p>אין נתונים זמינים.</p>";
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>קטגוריה חכמה</th>
            <th>סכום</th>
            <th>אחוז מסך הכל</th>
          </tr>
        </thead>
        <tbody>
          ${entries
            .map(([key, total]) => {
              const percentage = Number(percentages?.[key] || 0).toFixed(1);
              return `
                <tr>
                  <td>${getCategoryLabel(key)}</td>
                  <td>${formatCurrency(total)}</td>
                  <td>${percentage}%</td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  function renderTransactions(rows) {
    const tbody = document.getElementById("transactions-body");
    if (!tbody) return;

    const transactions = Array.isArray(rows) ? rows : [];
    if (transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">אין נתונים לחודש הנבחר.</td></tr>';
      return;
    }

    tbody.innerHTML = transactions
      .map(
        (row) =>
          `<tr>
            <td>${row.date || ""}</td>
            <td>${row.description || ""}</td>
            <td>${getCategoryLabel(row.smart_category || "")}</td>
            <td>${formatCurrency(toNumber(row.expense))}</td>
            <td>${formatCurrency(toNumber(row.income))}</td>
          </tr>`
      )
      .join("");
  }

  function renderPage(model) {
    console.log("card_white model", model);
    renderSummary(model);
    renderCategoryList("expenseCategories", model.breakdown.expense, model.percentages.expense);
    renderCategoryList("incomeCategories", model.breakdown.income, model.percentages.income);
    renderTransactions(model.transactions);
  }

  function init() {
    window.loadCSVData().then((data) => {
      const model = window.buildMonthlyModel(data, { source: "card_white" });
      renderPage(model);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
