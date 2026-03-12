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

  function normalizeMonth(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/^(\d{4})-(\d{1,2})$/);
    if (!match) {
      return null;
    }

    return `${match[1]}-${String(Number(match[2])).padStart(2, "0")}`;
  }

  function getLatestMonth(rows) {
    const months = (Array.isArray(rows) ? rows : [])
      .map((row) => normalizeMonth(row.billing_month))
      .filter(Boolean);
    return months.length ? months.sort().at(-1) : null;
  }

  function getCategoryLabel(key) {
    const normalizedKey = String(key || "").trim();
    return smartCategoryLabels[normalizedKey] || normalizedKey;
  }

  function renderSummary(model) {
    const incomeEl = document.getElementById("monthly-income");
    const expenseEl = document.getElementById("monthly-expenses");
    const balanceEl = document.getElementById("monthly-balance");

    if (incomeEl) {
      incomeEl.textContent = formatCurrency(model.totalIncome);
    }
    if (expenseEl) {
      expenseEl.textContent = formatCurrency(model.totalExpenses);
    }
    if (balanceEl) {
      balanceEl.textContent = formatCurrency(model.net);
    }
  }

  function renderCategoryList(containerId, totals, percentages) {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

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
    const tbody = document.getElementById("bank-transactions-body");
    if (!tbody) {
      return;
    }

    const sorted = [...(Array.isArray(rows) ? rows : [])]
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
      .slice(0, 30);

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
            <td>${getCategoryLabel(String(row.smart_category || "").trim())}</td>
            <td>${formatCurrency(Number(String(row.expense || "0").replace(/[,\s₪]/g, "") || 0))}</td>
            <td>${formatCurrency(Number(String(row.income || "0").replace(/[,\s₪]/g, "") || 0))}</td>
          </tr>`
      )
      .join("");
  }

  function renderBankPage(model) {
    console.log("model", model);
    renderSummary(model);
    renderCategoryList("expenseCategories", model.expenseBreakdown, model.expensePercentages);
    renderCategoryList("incomeCategories", model.incomeBreakdown, model.incomePercentages);
    renderTransactions(model.transactions);
  }

  function init() {
    window.loadCSVData().then((data) => {
      const bankRows = (Array.isArray(data) ? data : []).filter(
        (row) => String(row.source || "").trim().toLowerCase() === "bank"
      );

      const month = getLatestMonth(bankRows);
      const model = window.buildMonthlyModel(bankRows, month);
      renderBankPage(model);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
