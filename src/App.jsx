import { useEffect, useState } from "react";
import Papa from "papaparse";
import "./index.css";

import {
  Droplets,
  DollarSign,
  Ship,
  Cog
} from "lucide-react";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const PRODUCTION_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuVRZJU7FwUBxX-lBNShKJqd0cJojtoY791K7G0hkBUs-ZryPW5B7OacUQ9OGfTx2F9xvR_P4jzKj2/pub?gid=0&single=true&output=csv";

const WELLS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuVRZJU7FwUBxX-lBNShKJqd0cJojtoY791K7G0hkBUs-ZryPW5B7OacUQ9OGfTx2F9xvR_P4jzKj2/pub?gid=1065529490&single=true&output=csv";

const REVENUE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuVRZJU7FwUBxX-lBNShKJqd0cJojtoY791K7G0hkBUs-ZryPW5B7OacUQ9OGfTx2F9xvR_P4jzKj2/pub?gid=1599167987&single=true&output=csv";

const LIFTING_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuVRZJU7FwUBxX-lBNShKJqd0cJojtoY791K7G0hkBUs-ZryPW5B7OacUQ9OGfTx2F9xvR_P4jzKj2/pub?gid=648279194&single=true&output=csv";

const PRODUCTION_CHART_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuVRZJU7FwUBxX-lBNShKJqd0cJojtoY791K7G0hkBUs-ZryPW5B7OacUQ9OGfTx2F9xvR_P4jzKj2/pub?gid=643603643&single=true&output=csv";

function parseNumber(value) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const cleaned = String(value)
    .replace(/"/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();

  const number = parseFloat(cleaned);

  return Number.isNaN(number) ? 0 : number;
}

function formatNumber(value) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return value;
  }

  return number.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function fetchCsv(url) {
  const cacheBuster = `&_=${Date.now()}`;
  const urlWithCacheBuster = `${url}${cacheBuster}`;

  return new Promise((resolve, reject) => {
    Papa.parse(urlWithCacheBuster, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
  });
}

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());

  const [production, setProduction] = useState([]);
  const [accumulatedProduction, setAccumulatedProduction] = useState({});

  const [productionChart, setProductionChart] = useState([]);
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [showProductionChart, setShowProductionChart] = useState(false);

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
        const productionChartData = await fetchCsv(PRODUCTION_CHART_URL);

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
          value: parseNumber(accumulatedProductionRow?.plan),
        });

        const chartRows = productionChartData
		  .map((row) => ({
			month_key: String(row.month_key || "").trim(),
			month: String(row.month || "").trim(),
			plan: parseNumber(row.plan),
			actual: parseNumber(row.actual),
		  }))
		  .filter((row) => row.month_key && row.month);
		
		
        setProductionChart(chartRows);

        if (chartRows.length > 0) {
          setFromMonth((current) => current || chartRows[0].month);
          setToMonth((current) => current || chartRows[chartRows.length - 1].month);
        }  

        const wellObject = {};

        wellsData.forEach((row) => {
          const type = String(row.type || "").trim().toLowerCase();

          if (type === "producing" || type === "production") {
            wellObject.producing_wells_count = row.count;
            wellObject.producing_wells = row.wells;
          }

          if (type === "drilling") {
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

        const accumulatedRevenueRow = revenueData[3];

        setAccumulatedRevenue({
          label: accumulatedRevenueRow?.type || "Accumulated revenue (USD)",
          value: parseNumber(accumulatedRevenueRow?.value),
        });

        setLifting(liftingData);
      } catch (error) {
        console.error("Lỗi đọc Google Sheet:", error);
      }
    }

    loadData();

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(clockInterval);
    };
  }, []);

  const revenuePercent = revenue.plan_usd
    ? ((revenue.actual_usd / revenue.plan_usd) * 100).toFixed(1)
    : "-";

  const displayDate = currentTime.toLocaleDateString("en-GB");

  const displayTime = currentTime.toLocaleTimeString("en-GB", {
    hour12: false,
  });


  
  const filteredChartData =
   productionChart.filter(
    (item) =>
      item.month_key >= fromMonth &&
      item.month_key <= toMonth
   );
      
  return (
    <div className="dashboard">
      <header className="header">
        <div>
          <h1>PSC BLOCK 09-2/09 – OPERATION DASHBOARD</h1>

          <div className="marquee-box">
            <span>Block 09-2/09, PCMD, Vietsovpetro</span>
          </div>
        </div>

        <div className="header-right">
          <div className="date-box live-status">
            <span className="pulse-dot"></span>
            online update
          </div>

          <div className="clock-box">
            <div>{displayDate}</div>
            <div>{displayTime}</div>
          </div>
        </div>
      </header>

      <main className="main-grid">
        <section className="card production-card">
          <h2
            className="section-title production-title"
            onClick={() => setShowProductionChart(!showProductionChart)}
          >
            <Droplets size={26} strokeWidth={2.4} />
            Oil Production (ton)
          </h2>

          <table className="production-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Plan</th>
                <th>Actual</th>
                <th>Deviation</th>
                <th>Complete</th>
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
                    <td>{formatNumber(plan)}</td>
                    <td>{formatNumber(actual)}</td>

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

          <div className="accumulated-box">
            <span>{accumulatedProduction.label}</span>
            <strong>{formatNumber(accumulatedProduction.value)}</strong>
          </div>

          {showProductionChart && (
            <div className="production-chart-wrapper">
              <div className="chart-toolbar">
                <span>Monthly Production Plan vs Actual</span>
				
				<div className="chart-range">

				  <label>
					From

					<input
					  type="month"
					  value={fromMonth}
					  onChange={(e) => setFromMonth(e.target.value)}
					/>

				  </label>

				  <label>
					To

					<input
					  type="month"
					  value={toMonth}
					  onChange={(e) => setToMonth(e.target.value)}
					/>

				  </label>

				</div>

              </div>

              <ResponsiveContainer width="100%" height={330}>
                <ComposedChart data={filteredChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Legend />

                  <Bar
                    dataKey="actual"
                    name="Actual"
                    radius={[8, 8, 0, 0]}
                  />

                  <Line
                    type="monotone"
                    dataKey="plan"
                    name="Plan"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="section-title">
            <Cog size={26} strokeWidth={2.4} />
			Wells Status			
          </h2>

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

        <section className="card revenue-card">
          <h2 className="section-title">
            <DollarSign size={26} strokeWidth={2.4} />
            Oil Sales Revenue (USD)
          </h2>

          <div className="revenue-grid">
            <div className="revenue-box">
              <span>Plan</span>
              <strong>{formatNumber(revenue.plan_usd)}</strong>
            </div>

            <div className="revenue-box">
              <span>Actual</span>
              <strong>{formatNumber(revenue.actual_usd)}</strong>
            </div>

            <div className="revenue-box complete-box">
              <span>Complete</span>
              <strong>{revenuePercent}%</strong>
            </div>
          </div>

          <div className="accumulated-box revenue-accumulated">
            <span>{accumulatedRevenue.label}</span>
            <strong>{formatNumber(accumulatedRevenue.value)}</strong>
          </div>
        </section>

        <section className="card">
          <h2 className="section-title">
            <Ship size={26} strokeWidth={2.4} />
            Oil Lifting
          </h2>

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