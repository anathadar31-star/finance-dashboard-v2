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
        return resolvedRows.length > 0 ? resolvedRows : waitForFinanceData();
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

  function filterBySource(data, source) {
    const selectedSource = String(source || "all").trim().toLowerCase();
    if (selectedSource === "all") {
      return Array.isArray(data) ? [...data] : [];
    }

    return (Array.isArray(data) ? data : []).filter(
      (row) => String(row.source || "").trim().toLowerCase() === selectedSource
    );
  }

  function filterByFlowType(data, flow) {
    const selectedFlow = String(flow || "all").trim().toLowerCase();
    if (selectedFlow === "all") {
      return Array.isArray(data) ? [...data] : [];
    }

    return (Array.isArray(data) ? data : []).filter(
      (row) => getNormalizedCategory(row) === selectedFlow
    );
  }

  function getLatestMonth(data) {
    const months = (Array.isArray(data) ? data : [])
      .map((row) => normalizeMonth(row.billing_month))
      .filter(Boolean)
      .sort();

    return months.length ? months[months.length - 1] : null;
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
      income: totalIncome,
      expense: totalExpenses,
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

  function getDrilldownDescription(row) {
    return String(row.description || "").trim() || "ללא תיאור";
  }

  function buildDrilldown(data, type) {
    const rows = (Array.isArray(data) ? data : []).filter(
      (row) => getNormalizedCategory(row) === type
    );
    const valueField = type === "income" ? "income" : "expense";

    return rows.reduce((acc, row) => {
      const smartCategory = String(row.smart_category || "").trim() || "ללא קטגוריה";
      const description = getDrilldownDescription(row);
      const amount = toNumber(row[valueField]);
      if (amount <= 0) {
        return acc;
      }

      if (!acc[smartCategory]) {
        acc[smartCategory] = {};
      }
      acc[smartCategory][description] = (acc[smartCategory][description] || 0) + amount;
      return acc;
    }, {});
  }

  function normalizeOptions(optionsOrMonth) {
    if (typeof optionsOrMonth === "string") {
      return { month: optionsOrMonth };
    }

    return optionsOrMonth && typeof optionsOrMonth === "object" ? optionsOrMonth : {};
  }

  function buildMonthlyModel(data, optionsOrMonth) {
    const options = normalizeOptions(optionsOrMonth);
    const source = options.source || "all";
    const flow = options.flow || options.type || "all";

    const sourceFiltered = filterBySource(data, source);
    const month = normalizeMonth(options.month) || getLatestMonth(sourceFiltered);
    const monthFiltered = month ? filterByMonth(sourceFiltered, month) : [];
    const filteredRows = filterByFlowType(monthFiltered, flow);

    const totals = calculateKPIs(filteredRows);
    const expenseBreakdown = calculateCategoryBreakdown(filteredRows, "expense");
    const incomeBreakdown = calculateCategoryBreakdown(filteredRows, "income");

    return {
      totals,
      breakdown: {
        expense: expenseBreakdown,
        income: incomeBreakdown,
      },
      drilldown: {
        expense: buildDrilldown(filteredRows, "expense"),
        income: buildDrilldown(filteredRows, "income"),
      },
      transactions: [...filteredRows].sort((a, b) => parseDate(b.date) - parseDate(a.date)).slice(0, 30),
      percentages: {
        expense: calculatePercentages(expenseBreakdown, totals.expense),
        income: calculatePercentages(incomeBreakdown, totals.income),
      },
      meta: {
        month,
        source: String(source).trim().toLowerCase(),
        flow: String(flow).trim().toLowerCase(),
      },
    };
  }

  window.loadCSVData = loadCSVData;
  window.filterByMonth = filterByMonth;
  window.calculateKPIs = calculateKPIs;
  window.calculateCategoryBreakdown = calculateCategoryBreakdown;
  window.calculatePercentages = calculatePercentages;
  window.buildMonthlyModel = buildMonthlyModel;
})();
