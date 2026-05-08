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
  const [wells, setWells] = useState({});
  const [revenue, setRevenue] = useState({});
  const [lifting, setLifting] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const productionData = await fetchCsv(PRODUCTION_URL);
        const wellsData = await fetchCsv(WELLS_URL);
        const revenueData = await fetchCsv(REVENUE_URL);
        const liftingData = await fetchCsv(LIFTING_URL);

        setProduction(productionData);

        const wellObject = {};
        wellsData.forEach((row) => {
          if (row.type === "producing") {
            wellObject.producing_wells_count = row.count;
            wellObject.producing_wells = row.wells;
          }

          if (row.type === "drilling") {
            wellObject.drilling_wells_count = row.count;
            wellObject.drilling_wells = row.wells;
          }
        });
        setWells(wellObject);

        const revenueObject = {};
        revenueData.forEach((row) => {
          revenueObject[row.type] = parseNumber(row.value);
        });
        setRevenue(revenueObject);

        setLifting(liftingData);
      } catch (error) {
        console.error("Lỗi đọc Google Sheet:", error);
      }
    }

    loadData();
  }, []);

  const revenuePercent = revenue.plan_usd
    ? ((revenue.actual_usd / revenue.plan_usd) * 100).toFixed(1)
    : "-";

  return (
    <div className="dashboard">
      <header className="header">
        <div>
          <h1>BLOCK 09-2/09 – OPERATION DASHBOARD</h1>
          <p>Data taken from Google Sheet</p>
        </div>

        <div className="date-box">online update</div>
      </header>

      <main className="main-grid">
        <section className="card">
          <h2>Oil Production (ton)</h2>

          <table className="production-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Plan</th>
                <th>Actual</th>
                <th>Deviation</th>
                <th>% Complete</th>
              </tr>
            </thead>

            <tbody>
              {production.map((item) => {
                const plan = parseNumber(item.plan);
                const actual = parseNumber(item.actual);
                const diff = actual - plan;
                const percent = plan ? (actual / plan) * 100 : 0;
                const isPositive = diff >= 0;

                return (
                  <tr key={item.period}>
                    <td>{item.period}</td>

                    <td>
                      {formatNumber(plan)} 
                    </td>

                    <td>
                      {formatNumber(actual)} 
                    </td>

                    <td className={isPositive ? "positive" : "negative"}>
                      {isPositive ? "+" : ""}
                      {formatNumber(diff)} 
                    </td>

                    <td>
                      <span className={isPositive ? "status-up" : "status-down"}>
                        {isPositive ? "▲" : "▼"} {percent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>Wells Status</h2>

          <div className="well-box">
            <div className="well-header">
              <span>Wells in production</span>
              <strong>{wells.producing_wells_count ?? "-"}</strong>
            </div>

            <p>{wells.producing_wells}</p>
          </div>

          <div className="well-box">
            <div className="well-header">
              <span>Wells in drilling</span>
              <strong>{wells.drilling_wells_count ?? "-"}</strong>
            </div>

            <p>{wells.drilling_wells}</p>
          </div>
        </section>

        <section className="card">
          <h2>Oil Sales Revenue</h2>

          <div className="revenue-grid">
            <div className="revenue-box">
              <span>Plan</span>
              <strong>{formatNumber(revenue.plan_usd)}</strong>
            </div>

            <div className="revenue-box">
              <span>Actual</span>
              <strong>{formatNumber(revenue.actual_usd)}</strong>
            </div>
          </div>

          <div className="progress-box">
            <span>% Complete</span>
            <strong>{revenuePercent}%</strong>
          </div>
        </section>

        <section className="card">
          <h2>Oil Lifting</h2>

          <table>
            <thead>
              <tr>
                <th>Lifting no</th>
                <th>B/L Date</th>
                <th>Net Lifted (bbl)</th>
              </tr>
            </thead>

            <tbody>
              {lifting.map((item) => (
                <tr key={item.lifting_no}>
                  <td>{item.lifting_no}</td>
                  <td>{item.bl_date}</td>
                  <td>{formatNumber(item.net_lifted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}