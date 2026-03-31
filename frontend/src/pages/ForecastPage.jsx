import { useEffect, useState } from "react";
import { getForecast, getCategories } from "../api";
import Loader   from "../components/Loader";
import ErrorBox from "../components/ErrorBox";
import {
   Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart, ReferenceLine,
} from "recharts";
import PageWrapper from "../components/PageWrapper";

const CATS = [
  "Food & Dining","Transport","Groceries","Shopping",
  "Subscriptions","Entertainment","Utilities","Investments",
];

export default function ForecastPage() {
  const [selectedCat, setSelectedCat] = useState("Food & Dining");
  const [history,     setHistory]     = useState([]);
  const [forecast,    setForecast]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all([
      getCategories(selectedCat),
      getForecast(selectedCat),
    ])
      .then(([h, f]) => {
        setHistory(h.data.data || []);
        setForecast(f.data);
      })
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [selectedCat]);

  // Merge historical + forecast into one chart series
  const chartData = [
    ...history.map(d => ({
      month : d.month,
      actual: d.amount,
    })),
    ...(forecast?.predictions || []).map(p => ({
      month     : p.month,
      predicted : p.amount,
      lower     : p.lower,
      upper     : p.upper,
    })),
  ];

  const lastActualMonth = history.at(-1)?.month;

  return (
    <PageWrapper maxWidth={860}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "1.5rem",
      }}>
        <h2>Forecast</h2>
        <select
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
          style={{
            border: "1px solid var(--border)", borderRadius: 8,
            padding: "6px 12px", fontSize: 13, background: "#fff",
          }}
        >
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading && <Loader text="Loading forecast..." />}
      {error   && <ErrorBox message={error} />}

      {!loading && !error && forecast && (
        <>
          {/* Method badge */}
          <div style={{ marginBottom: "1rem" }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "3px 10px",
              borderRadius: 20,
              background: forecast.method === "prophet" ? "#dcfce7" : "#fef9c3",
              color     : forecast.method === "prophet" ? "#166534" : "#854d0e",
            }}>
              {forecast.method === "prophet" ? "Prophet ML model" : "3-month average"}
            </span>
          </div>

          {/* Chart */}
          <div style={{
            background: "#fff", border: "1px solid var(--border)",
            borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem",
          }}>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#378ADD" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#378ADD" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={55} />
                <Tooltip formatter={v => `₹${v?.toLocaleString()}`} />
                <Legend />
                {lastActualMonth && (
                  <ReferenceLine
                    x={lastActualMonth} stroke="#6b7280"
                    strokeDasharray="4 4" label={{ value: "Today", fontSize: 11 }}
                  />
                )}
                <Area
                  type="monotone" dataKey="upper"
                  stroke="none" fill="url(#predGrad)"
                  name="Upper bound" dot={false}
                />
                <Line
                  type="monotone" dataKey="actual"
                  stroke="#1D9E75" strokeWidth={2}
                  dot={{ r: 3 }} name="Actual" connectNulls
                />
                <Line
                  type="monotone" dataKey="predicted"
                  stroke="#378ADD" strokeWidth={2}
                  strokeDasharray="5 5" dot={{ r: 4 }}
                  name="Predicted" connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Prediction cards */}
          <div className="pred-grid" style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
          }}>
            {(forecast.predictions || []).map((p, i) => (
              <div key={i} style={{
                background: "#fff", border: "1px solid var(--border)",
                borderRadius: 12, padding: "1.25rem",
                borderTop: "3px solid var(--blue)",
              }}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.month}</div>
                <div style={{ fontSize: 22, fontWeight: 700, margin: "4px 0" }}>
                  ₹{p.amount.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  ₹{p.lower.toLocaleString()} – ₹{p.upper.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </PageWrapper>
  );
}