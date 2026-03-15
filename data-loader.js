(function () {
  const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDbRTWi0xlhYtkVQ3J2O0kWaWj5GgdF3QoraA60mIDAmzA2tiu_SwMJjA0u8i-qsEPpkLeFzJbgJwl/pub?output=csv";

  function parseCSV(text) {
    const rows = [];
    let current = "";
    let row = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        row.push(current);
        current = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i += 1;
        }
        row.push(current);
        current = "";

        const hasData = row.some((cell) => cell.trim() !== "");
        if (hasData) {
          rows.push(row);
        }
        row = [];
        continue;
      }

      current += char;
    }

    if (current.length > 0 || row.length > 0) {
      row.push(current);
      const hasData = row.some((cell) => cell.trim() !== "");
      if (hasData) {
        rows.push(row);
      }
    }

    if (rows.length === 0) {
      return [];
    }

    const headers = rows[0].map((header) => header.trim());

    return rows.slice(1).map((values) => {
      const entry = {};
      headers.forEach((header, index) => {
        entry[header] = (values[index] || "").trim();
      });
      return entry;
    });
  }

  async function loadFinanceData() {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`CSV request failed with status ${response.status}`);
    }

    const csvText = await response.text();
    const parsedData = parseCSV(csvText);
    window.financeData = parsedData;
    return parsedData;
  }

  window.financeData = [];
  window.financeDataPromise = Promise.resolve(window.financeData);

  window.addEventListener("DOMContentLoaded", function () {
    window.financeDataPromise = loadFinanceData().catch(function (error) {
      console.error("Failed to load finance data:", error);
      window.financeData = [];
      return window.financeData;
    });
  });
})();
