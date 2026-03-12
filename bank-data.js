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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
      incomeEl.textContent = formatCurrency(model.totals.income);
    }
    if (expenseEl) {
      expenseEl.textContent = formatCurrency(model.totals.expense);
    }
    if (balanceEl) {
      balanceEl.textContent = formatCurrency(model.totals.net);
    }
  }

  function renderCategoryList(containerId, totals, percentages, drilldown) {
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
              const details = Object.entries(drilldown?.[key] || {}).sort((a, b) => b[1] - a[1]);
              const detailsRows =
                details.length > 0
                  ? details
                      .map(
                        ([accountName, amount]) => `
                        <tr>
                          <td>${escapeHtml(accountName)}</td>
                          <td>${formatCurrency(amount)}</td>
                        </tr>`
                      )
                      .join("")
                  : '<tr><td colspan="2">אין פירוט חשבון.</td></tr>';

              return `
                <tr class="category-row" data-category="${escapeHtml(key)}" role="button" tabindex="0" aria-expanded="false">
                  <td>${escapeHtml(getCategoryLabel(key))}</td>
                  <td>${formatCurrency(total)}</td>
                  <td>${percentage}%</td>
                </tr>
                <tr class="details-row" data-category-details="${escapeHtml(key)}" hidden>
                  <td colspan="3">
                    <table>
                      <thead>
                        <tr>
                          <th>חשבון</th>
                          <th>סכום</th>
                        </tr>
                      </thead>
                      <tbody>${detailsRows}</tbody>
                    </table>
                  </td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    `;

    const toggle = function (categoryRow) {
      const key = categoryRow.getAttribute("data-category");
      const detailsRow = container.querySelector(`tr[data-category-details="${CSS.escape(key)}"]`);
      if (!detailsRow) {
        return;
      }
      const isExpanded = categoryRow.getAttribute("aria-expanded") === "true";
      categoryRow.setAttribute("aria-expanded", String(!isExpanded));
      detailsRow.hidden = isExpanded;
    };

    container.querySelectorAll(".category-row").forEach((row) => {
      row.addEventListener("click", function () {
        toggle(row);
      });
      row.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle(row);
        }
      });
    });
  }

  function renderTransactions(rows) {
    const tbody = document.getElementById("bank-transactions-body");
    if (!tbody) {
      return;
    }

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
            <td>${getCategoryLabel(String(row.smart_category || "").trim())}</td>
            <td>${formatCurrency(toNumber(row.expense))}</td>
            <td>${formatCurrency(toNumber(row.income))}</td>
          </tr>`
      )
      .join("");
  }

  function renderBankPage(model) {
    console.log("model", model);
    renderSummary(model);
    renderCategoryList(
      "expenseCategories",
      model.breakdown.expense,
      model.percentages.expense,
      model.drilldown.expense
    );
    renderCategoryList(
      "incomeCategories",
      model.breakdown.income,
      model.percentages.income,
      model.drilldown.income
    );
    renderTransactions(model.transactions);
  }

  function init() {
    window.loadCSVData().then((data) => {
      const model = window.buildMonthlyModel(data, { source: "bank" });
      renderBankPage(model);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
