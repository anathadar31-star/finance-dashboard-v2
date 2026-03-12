(function () {
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

  function normalizeMonth(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/^(\d{4})-(\d{1,2})$/);
    if (!match) {
      return null;
    }

    const year = match[1];
    const monthNumber = Number(match[2]);
    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      return null;
    }

    return `${year}-${String(monthNumber).padStart(2, "0")}`;
  }

  function getNormalizedCategory(row) {
    const category = String(row.category || "").trim().toLowerCase();
    const smartCategory = String(row.smart_category || "").trim().toLowerCase();

    if (smartCategory === "salary" && toNumber(row.income) > 0) {
      return "income";
    }

    return category;
  }

  function waitForFinanceData() {
    return new Promise((resolve) => {
      const wait = function () {
        if (Array.isArray(window.financeData) && window.financeData.length > 0) {
          resolve(window.financeData);
          return;
        }
        setTimeout(wait, 100);
      };
      wait();
    });
  }

  function loadCSVData() {
    if (Array.isArray(window.financeData) && window.financeData.length > 0) {
      return Promise.resolve(window.financeData);
    }

    if (window.financeDataPromise) {
      return window.financeDataPromise.then((rows) => {
        const resolvedRows = Array.isArray(rows) ? rows : [];
        if (resolvedRows.length > 0) {
          return resolvedRows;
        }
        return waitForFinanceData();
      });
    }

    return waitForFinanceData();
  }

  function filterByMonth(data, month) {
    const targetMonth = normalizeMonth(month);
    if (!targetMonth) {
      return [];
    }

    return (Array.isArray(data) ? data : []).filter(
      (row) => normalizeMonth(row.billing_month) === targetMonth
    );
  }

  function calculateKPIs(data) {
    const totalIncome = (Array.isArray(data) ? data : []).reduce(
      (sum, row) => sum + toNumber(row.income),
      0
    );
    const totalExpenses = (Array.isArray(data) ? data : []).reduce(
      (sum, row) => sum + toNumber(row.expense),
      0
    );

    return {
      totalIncome,
      totalExpenses,
      net: totalIncome - totalExpenses,
    };
  }

  function calculateCategoryBreakdown(data, type) {
    const rows = (Array.isArray(data) ? data : []).filter(
      (row) => getNormalizedCategory(row) === type
    );

    const valueField = type === "income" ? "income" : "expense";
    const totalsRaw = rows.reduce((acc, row) => {
      const key = String(row.smart_category || "").trim() || "ללא קטגוריה";
      const amount = toNumber(row[valueField]);
      acc[key] = (acc[key] || 0) + amount;
      return acc;
    }, {});

    return Object.fromEntries(Object.entries(totalsRaw).filter(([, total]) => total > 0));
  }

  function calculatePercentages(breakdown, total) {
    return Object.fromEntries(
      Object.entries(breakdown || {}).map(([key, amount]) => {
        const percentage = total > 0 ? Number(((amount / total) * 100).toFixed(1)) : 0;
        return [key, percentage];
      })
    );
  }

  function buildMonthlyModel(data, month) {
    const monthlyRows = filterByMonth(data, month);
    const kpis = calculateKPIs(monthlyRows);
    const expenseBreakdown = calculateCategoryBreakdown(monthlyRows, "expense");
    const incomeBreakdown = calculateCategoryBreakdown(monthlyRows, "income");

    return {
      totalIncome: kpis.totalIncome,
      totalExpenses: kpis.totalExpenses,
      net: kpis.net,
      expenseBreakdown,
      incomeBreakdown,
      transactions: [...monthlyRows].sort((a, b) => parseDate(b.date) - parseDate(a.date)).slice(0, 30),
      expensePercentages: calculatePercentages(expenseBreakdown, kpis.totalExpenses),
      incomePercentages: calculatePercentages(incomeBreakdown, kpis.totalIncome),
    };
  }

  window.loadCSVData = loadCSVData;
  window.filterByMonth = filterByMonth;
  window.calculateKPIs = calculateKPIs;
  window.calculateCategoryBreakdown = calculateCategoryBreakdown;
  window.calculatePercentages = calculatePercentages;
  window.buildMonthlyModel = buildMonthlyModel;
})();
