import { useEffect, useState } from "react";
import Papa from "papaparse";
import "./index.css";

const PRODUCTION_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuVRZJU7FwUBxX-lBNShKJqd0cJojtoY791K7G0hkBUs-ZryPW5B7OacUQ9OGfTx2F9xvR_P4jzKj2/pub?gid=0&single=true&output=csv";
const WELLS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuVRZJU7FwUBxX-lBNShKJqd0cJojtoY791K7G0hkBUs-ZryPW5B7OacUQ9OGfTx2F9xvR_P4jzKj2/pub?gid=1065529490&single=true&output=csv";
const REVENUE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuVRZJU7FwUBxX-lBNShKJqd0cJojtoY791K7G0hkBUs-ZryPW5B7OacUQ9OGfTx2F9xvR_P4jzKj2/pub?gid=1599167987&single=true&output=csv";
const LIFTING_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuVRZJU7FwUBxX-lBNShKJqd0cJojtoY791K7G0hkBUs-ZryPW5B7OacUQ9OGfTx2F9xvR_P4jzKj2/pub?gid=648279194&single=true&output=csv";

function formatNumber(value) {
  const number = Number(value);

  if (value === undefined || value === null || value === "") return "-";
  if (Number.isNaN(number)) return value;

  return number.toLocaleString("en-US");
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return 0;
  return Number(String(value).replaceAll(",", ""));
}

function fetchCsv(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
  });
}

export default function App() {
  const [production, setProduction] = useState([]);
  const [accumulatedProduction, setAccumulatedProduction] = useState({});
  const [wells, setWells] = useState({});
  const [revenue, setRevenue] = useState({});
  const [accumulatedRevenue, setAccumulatedRevenue] = useState({});
  const [lifting, setLifting] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const productionData = await fetchCsv(PRODUCTION_URL);
        const wellsData = await fetchCsv(WELLS_URL);
        const revenueData = await fetchCsv(REVENUE_URL);
        const liftingData = await fetchCsv(LIFTING_URL);

        const productionRows = productionData.filter((row) => {
          const period = String(row.period || "").trim().toLowerCase();

          return period === "day" || period === "month" || period === "year";
        });

        setProduction(productionRows);

        const accumulatedProductionRow = productionData.find((row) => {
          const period = String(row.period || "").trim().toLowerCase();

          return period.includes("accumulated");
        });

        setAccumulatedProduction({
          label:
            accumulatedProductionRow?.period ||
            "Accumulated production (ton)",
}