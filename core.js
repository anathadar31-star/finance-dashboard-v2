(function () {
  function toNumber(value) {
    if (value === null || value === undefined) return 0;
    const normalized = String(value).replace(/[,\s₪]/g, "").trim();
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function parseDate(value) {
    if (!value) return new Date(0);

    const iso = new Date(value);
    if (!Number.isNaN(iso.getTime())) return iso;

    const parts = String(value).split(/[\/.-]/);
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day);
    }

    return new Date(0);
  }

  function normalizeMonth(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/^(\d{4})-(\d{1,2})$/);
    if (!match) return null;

    const year = match[1];
    const monthNumber = Number(match[2]);
    if (monthNumber < 1 || monthNumber > 12) return null;

    return `${year}-${String(monthNumber).padStart(2, "0")}`;
  }

  // ✅ FIX קריטי
  function getNormalizedCategory(row) {
    return String(row.category || "").trim() || "ללא קטגוריה";
  }

  function getFlowType(row) {
    return String(row.type || "").trim().toLowerCase();
  }

  function waitForFinanceData() {
    return new Promise((resolve) => {
      const wait = () => {
        if (Array.isArray(window.financeData) && window.financeData.length > 0) {
          resolve(window.financeData);
        } else {
          setTimeout(wait, 100);
        }
      };
      wait();
    });
  }

  function loadCSVData() {
    if (Array.isArray(window.financeData) && window.financeData.length > 0) {
      return Promise.resolve(window.financeData);
    }

    if (window.financeDataPromise) {
      return window.financeDataPromise.then((rows) =>
        rows.length ? rows : waitForFinanceData()
      );
    }

    return waitForFinanceData();
  }

  function filterByMonth(data, month) {
    const targetMonth = normalizeMonth(month);
    if (!targetMonth) return [];

    return data.filter(
      (row) => normalizeMonth(row.billing_month) === targetMonth
    );
  }

  function filterBySource(data, source) {
    const s = String(source || "all").toLowerCase();
    if (s === "all") return [...data];

    return data.filter(
      (row) => String(row.source || "").toLowerCase() === s
    );
  }

  function filterByFlowType(data, flow) {
    const f = String(flow || "all").toLowerCase();
    if (f === "all") return [...data];

    return data.filter((row) => getFlowType(row) === f);
  }

  function getLatestMonth(data) {
    const months = data
      .map((r) => normalizeMonth(r.billing_month))
      .filter(Boolean)
      .sort();

    return months.length ? months[months.length - 1] : null;
  }

  function calculateKPIs(data) {
    const income = data.reduce((s, r) => s + toNumber(r.income), 0);
    const expense = data.reduce((s, r) => s + toNumber(r.expense), 0);

    return {
      income,
      expense,
      net: income - expense,
    };
  }

  // ✅ FIX קריטי – מבוסס category בלבד
  function calculateCategoryBreakdown(data, type) {
    const valueField = type === "income" ? "income" : "expense";

    const rows = data.filter(
      (row) => getFlowType(row) === type
    );

    const result = {};

    rows.forEach((row) => {
      const category = getNormalizedCategory(row);
      const amount = toNumber(row[valueField]);

      if (amount <= 0) return;

      result[category] = (result[category] || 0) + amount;
    });

    return result;
  }

  function calculatePercentages(breakdown, total) {
    return Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [
        k,
        total > 0 ? Number(((v / total) * 100).toFixed(1)) : 0,
      ])
    );
  }

  function buildDrilldown(data, type) {
    const valueField = type === "income" ? "income" : "expense";

    const rows = data.filter(
      (row) => getFlowType(row) === type
    );

    const result = {};

    rows.forEach((row) => {
      const category = getNormalizedCategory(row);
      const sub = String(row.subcategory || row.description || "ללא פירוט");
      const amount = toNumber(row[valueField]);

      if (amount <= 0) return;

      if (!result[category]) result[category] = {};
      result[category][sub] = (result[category][sub] || 0) + amount;
    });

    return result;
  }

  function normalizeOptions(opt) {
    return typeof opt === "string" ? { month: opt } : opt || {};
  }

  function buildMonthlyModel(data, optionsOrMonth) {
    const options = normalizeOptions(optionsOrMonth);

    const sourceFiltered = filterBySource(data, options.source);
    const month = normalizeMonth(options.month) || getLatestMonth(sourceFiltered);
    const monthFiltered = filterByMonth(sourceFiltered, month);
    const filtered = filterByFlowType(monthFiltered, options.flow);

    const totals = calculateKPIs(filtered);
    const expenseBreakdown = calculateCategoryBreakdown(filtered, "expense");
    const incomeBreakdown = calculateCategoryBreakdown(filtered, "income");

    return {
      totals,
      breakdown: {
        expense: expenseBreakdown,
        income: incomeBreakdown,
      },
      drilldown: {
        expense: buildDrilldown(filtered, "expense"),
        income: buildDrilldown(filtered, "income"),
      },
      transactions: filtered
        .sort((a, b) => parseDate(b.date) - parseDate(a.date))
        .slice(0, 30),
      percentages: {
        expense: calculatePercentages(expenseBreakdown, totals.expense),
        income: calculatePercentages(incomeBreakdown, totals.income),
      },
      meta: {
        month,
        source: options.source || "all",
        flow: options.flow || "all",
      },
    };
  }

  window.buildMonthlyModel = buildMonthlyModel;
})();
