import { useEffect, useState } from "react";
import Papa from "papaparse";
import "./index.css";

import { Droplets, DollarSign, Ship, Cog } from "lucide-react";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LabelList,
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
    .replace(/%/g, "")
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
  const [animatedYtdAchievement, setAnimatedYtdAchievement] = useState(0);

  const [production, setProduction] = useState([]);
  const [accumulatedProduction, setAccumulatedProduction] = useState({});

  const [productionChart, setProductionChart] = useState([]);
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [activeView, setActiveView] = useState("dashboard");

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
          const period = String(row.period || "")
            .trim()
            .toLowerCase();

          return period === "day" || period === "month" || period === "year";
        });

        setProduction(productionRows);

        const accumulatedProductionRow = productionData.find((row) => {
          const period = String(row.period || "")
            .trim()
            .toLowerCase();

          return period.includes("accumulated");
        });

        setAccumulatedProduction({
          label:
            accumulatedProductionRow?.period || "Accumulated production (ton)",
          value: parseNumber(accumulatedProductionRow?.plan),
        });

        const chartRows = productionChartData
          .map((row) => {
            const normalized = {};

            Object.keys(row).forEach((key) => {
              normalized[key.trim().toLowerCase()] = row[key];
            });

            const rawMonthKey = String(normalized.month_key || "").trim();

            const monthKeyParts = rawMonthKey.split("-");

            const normalizedMonthKey =
              monthKeyParts.length === 2
                ? `${monthKeyParts[0]}-${monthKeyParts[1].padStart(2, "0")}`
                : rawMonthKey;

            return {
              month_key: normalizedMonthKey,
              month: String(normalized.month || "").trim(),
              plan: parseNumber(normalized.plan),
              actual: parseNumber(normalized.actual),
            };
          })
          .filter((row) => row.month_key && row.month && row.plan > 0);

        if (chartRows.length > 0) {
          setProductionChart(chartRows);

          const currentYear = new Date().getFullYear();

          setFromMonth((current) => current || `${currentYear}-01`);
          setToMonth((current) => current || `${currentYear}-12`);
        }
        const wellObject = {};

        wellsData.forEach((row) => {
          const type = String(row.type || "")
            .trim()
            .toLowerCase();

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

    const dataInterval = setInterval(loadData, 30 * 60 * 1000);
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(dataInterval);
    };
  }, []);

  useEffect(() => {
    let timeoutId;

    if (activeView === "dashboard") {
      timeoutId = setTimeout(
        () => {
          setActiveView("productionChart");
        },
        10 * 60 * 1000,
      );
    }

    if (activeView === "productionChart") {
      timeoutId = setTimeout(
        () => {
          setActiveView("dashboard");
        },
        2 * 60 * 1000,
      );
    }

    return () => clearTimeout(timeoutId);
  }, [activeView]);

  const revenuePercent = revenue.plan_usd
    ? ((revenue.actual_usd / revenue.plan_usd) * 100).toFixed(1)
    : "-";

  const displayDate = currentTime.toLocaleDateString("en-GB");

  const displayTime = currentTime.toLocaleTimeString("en-GB", {
    hour12: false,
  });

  const filteredChartData = productionChart.filter((item) => {
    return item.month_key >= fromMonth && item.month_key <= toMonth;
  });

  const chartDataWithAchievement = filteredChartData.map((item) => {
    const achievement = item.plan > 0 ? (item.actual / item.plan) * 100 : 0;

    return {
      ...item,

      achievementLabel: `${achievement.toFixed(0)}%`,

      achievementColor: achievement >= 100 ? "#16a34a" : "#dc2626",
    };
  });

  const currentYear = new Date().getFullYear();

  const currentMonth = new Date().getMonth() + 1;

  const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  const liveMonthKey =
    [...chartDataWithAchievement]
      .filter((item) => item.actual > 0)
      .sort((a, b) => a.month_key.localeCompare(b.month_key))
      .at(-1)?.month_key || currentMonthKey;

  const currentYearRows = productionChart.filter((item) =>
    String(item.month_key).startsWith(`${currentYear}-`),
  );

  const ytdRows = currentYearRows.filter((item) => {
    const monthNumber = Number(item.month_key.split("-")[1]);
    return monthNumber <= currentMonth;
  });

  const annualPlan = currentYearRows.reduce((sum, item) => sum + item.plan, 0);

  const ytdActual = ytdRows.reduce((sum, item) => sum + item.actual, 0);

  const ytdAchievement = annualPlan ? (ytdActual / annualPlan) * 100 : 0;

  useEffect(() => {
    if (activeView !== "productionChart") {
      return;
    }

    let animationFrameId;

    const start = 0;
    const end = ytdAchievement;
    const duration = 700;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const value = start + (end - start) * easedProgress;

      setAnimatedYtdAchievement(value);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    }

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeView, ytdAchievement]);

  if (activeView === "productionChart") {
    return (
      <div className="dashboard chart-page">
        <header className="chart-page-header">
          <div className="chart-header-title">
            <h1>Oil Production Chart</h1>
            <p>Monthly Plan vs Actual</p>
          </div>

          <button
            className="back-button"
            onClick={() => setActiveView("dashboard")}
          >
            Back to Dashboard
          </button>
        </header>

        <section className="card chart-full-card">
          <div className="ytd-summary">
            <div className="ytd-left">
              <div className="ytd-stat-card">
                <div className="ytd-stat-row">
                  <div className="ytd-stat-label">ANNUAL PLAN</div>

                  <div className="ytd-stat-inline">
                    <div className="ytd-stat-value">
                      {formatNumber(annualPlan)}
                    </div>

                    <div className="ytd-stat-unit">ton</div>
                  </div>
                </div>
              </div>

              <div className="ytd-stat-card">
                <div className="ytd-stat-row">
                  <div className="ytd-stat-label">YTD ACTUAL</div>

                  <div className="ytd-stat-inline">
                    <div className="ytd-stat-value ytd-actual-value">
                      {formatNumber(ytdActual)}
                    </div>

                    <div className="ytd-stat-unit">ton</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ytd-right">
              <div className="ytd-gauge-wrapper">
                <svg className="ytd-gauge" viewBox="0 0 240 140">
                  <path
                    d="
    M 30 120
    A 90 90 0 0 1 210 120
  "
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="18"
                    strokeLinecap="round"
                  />

                  <path
                    d="
            M 30 120
            A 90 90 0 0 1 210 120
          "
                    fill="none"
                    stroke="#0f766e"
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeDasharray={283}
                    strokeDashoffset={
                      283 - Math.min(animatedYtdAchievement, 100) * 2.83
                    }
                  />

                  <text
                    x="120"
                    y="88"
                    textAnchor="middle"
                    className="gauge-value"
                  >
                    {animatedYtdAchievement.toFixed(1)}%
                  </text>

                  <text
                    x="120"
                    y="112"
                    textAnchor="middle"
                    className="gauge-label"
                  >
                    ACHIEVEMENT
                  </text>
                </svg>
              </div>
            </div>
          </div>

          <div className="chart-toolbar">
            <span>Production Plan vs Actual</span>

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

          <div className="y-axis-unit">ton</div>

          <div className="production-chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartDataWithAchievement}
                barCategoryGap="20%"
                barGap={4}
                margin={{
                  top: 115,
                  right: 30,
                  left: 10,
                  bottom: 30,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.18} />

                <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 15,
                    fontWeight: 700,
                    fill: "#334155",
                  }}
                />

                <YAxis
                  width={92}
                  tick={{
                    fontSize: 16,
                    fontWeight: 800,
                    fill: "#334155",
                  }}
                />

                <Tooltip formatter={(value) => formatNumber(value)} />

                <Legend
                  verticalAlign="top"
                  align="center"
                  height={36}
                  wrapperStyle={{
                    paddingBottom: 8,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                />

                {/* ACTUAL BAR */}

                <Bar
                  dataKey="actual"
                  name="Actual"
                  fill="#0f766e"
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={false}
                >
                  {chartDataWithAchievement.map((entry, index) => {
                    const isCurrentMonth =
                      String(entry.month_key).trim() === liveMonthKey;

                    return (
                      <Cell
                        key={`actual-cell-${index}`}
                        fill={isCurrentMonth ? "#06b6d4" : "#0f766e"}
                      />
                    );
                  })}

                  {/* BOX PLAN / ACTUAL */}

                  <LabelList
                    dataKey="actual"
                    content={(props) => {
                      const { x, y, width, index } = props;

                      const item = chartDataWithAchievement[index];

                      if (!item) {
                        return null;
                      }

                      const isCurrentMonth =
                        String(item.month_key).trim() === liveMonthKey;

                      if (!isCurrentMonth) {
                        return null;
                      }

                      return (
                        <g pointerEvents="none">
                          <rect
                            x={x + width / 2 - 82}
                            y={y - 130}
                            width={164}
                            height={58}
                            rx={12}
                            fill="rgba(15,23,42,0.92)"
                          />

                          <text
                            x={x + width / 2}
                            y={y - 106}
                            textAnchor="middle"
                            fill="#f59e0b"
                            fontSize={15}
                            fontWeight={900}
                          >
                            Plan: {formatNumber(item.plan)}
                          </text>

                          <text
                            x={x + width / 2}
                            y={y - 83}
                            textAnchor="middle"
                            fill="#06b6d4"
                            fontSize={15}
                            fontWeight={900}
                          >
                            Actual: {formatNumber(item.actual)}
                          </text>
                        </g>
                      );
                    }}
                  />

                  {/* % ACHIEVEMENT + LIVE */}

                  <LabelList
                    dataKey="achievementLabel"
                    position="top"
                    formatter={(value) => value}
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                    content={(props) => {
                      const { x, y, width, value, index } = props;

                      const item = chartDataWithAchievement[index];

                      if (!item) {
                        return null;
                      }

                      const isCurrentMonth =
                        String(item.month_key).trim() === liveMonthKey;

                      return (
                        <>
                          <text
                            x={x + width / 2}
                            y={y - 10}
                            fill={item.achievementColor}
                            textAnchor="middle"
                            fontSize={18}
                            fontWeight={900}
                          >
                            {value}
                          </text>

                          {isCurrentMonth && (
                            <text
                              x={x + width / 2}
                              y={y - 34}
                              fill="#06b6d4"
                              textAnchor="middle"
                              fontSize={16}
                              fontWeight={900}
                            >
                              LIVE
                            </text>
                          )}
                        </>
                      );
                    }}
                  />
                </Bar>

                {/* PLAN LINE */}

                <Line
                  type="monotone"
                  dataKey="plan"
                  name="Plan"
                  stroke="#f59e0b"
                  strokeWidth={4}
                  dot={{
                    r: 5,
                    strokeWidth: 2,
                    fill: "#f59e0b",
                  }}
                  activeDot={{
                    r: 7,
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    );
  }

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
            onClick={() => setActiveView("productionChart")}
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
                      <span
                        className={isPositive ? "status-up" : "status-down"}
                      >
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

        <section className="card lifting-card">
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
