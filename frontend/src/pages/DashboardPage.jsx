import { useEffect, useState } from "react";
import { getSummary, getAnomalies } from "../api";
import StatCard from "../components/StatCard";
import Loader   from "../components/Loader";
import ErrorBox from "../components/ErrorBox";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { StatCardSkeleton, ChartSkeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import PageWrapper from "../components/PageWrapper";

const COLORS = [
  "#1D9E75","#378ADD","#BA7517","#D85A30","#7F77DD",
  "#0F6E56","#185FA5","#854F0B","#993C1D","#534AB7",
];

export default function DashboardPage() {
  const [summary,   setSummary]   = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [months,    setMonths]    = useState(3);

  useEffect(() => {
    setLoading(true);
    Promise.all([getSummary(months), getAnomalies()])
      .then(([s, a]) => {
        setSummary(s.data);
        setAnomalies(a.data.anomalies || []);
      })
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [months]);

    if (loading) return (
        <div style={{ maxWidth: 960, margin: "2rem auto", padding: "0 1rem" }}>
        <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12, marginBottom: "1.5rem",
        }}>
        {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <ChartSkeleton height={260} />
    </div>
    );
    if (error) {
        if (error.includes("Upload") || error.includes("404")) {
        return <EmptyState />;
        }
        return <div style={{ padding: "2rem" }}><ErrorBox message={error} /></div>;
    }
    if (!summary) return null;

  const mom = summary.mom_change_pct;

  return (
    <PageWrapper>
        <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "1.5rem",
      }}>
        <h2>Dashboard</h2>
        <select
          value={months}
          onChange={e => setMonths(Number(e.target.value))}
          style={{
            border: "1px solid var(--border)", borderRadius: 8,
            padding: "6px 12px", fontSize: 13, background: "#fff",
          }}
        >
          {[1, 3, 6, 12].map(m => (
            <option key={m} value={m}>Last {m} month{m > 1 ? "s" : ""}</option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      <div className="stat-grid hover-lift" style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12, marginBottom: "1.5rem",
      }}>
        <StatCard
          label="Total spend"
          value={`₹${summary.total_spend.toLocaleString()}`}
          sub={`${mom >= 0 ? "▲" : "▼"} ${Math.abs(mom)}% vs previous period`}
          color={mom > 10 ? "var(--coral)" : "var(--green)"}
        />
        <StatCard
          label="Savings rate"
          value={`${summary.savings_rate}%`}
          sub={summary.savings_rate >= 20 ? "Above 20% target" : "Below 20% target"}
          color={summary.savings_rate >= 20 ? "var(--green)" : "var(--amber)"}
        />
        <StatCard
          label="Daily average"
          value={`₹${summary.daily_average.toLocaleString()}`}
          sub={`${summary.transaction_count} transactions`}
          color="var(--blue)"
        />
        <StatCard
          label="Top category"
          value={summary.top_category}
          sub="highest spend"
          color="var(--purple)"
        />
      </div>

      {/* Bar chart — category breakdown */}
      <div style={{
        background: "#fff", border: "1px solid var(--border)",
        borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem",
      }}>
        <h3 style={{ marginBottom: "1rem" }}>Spend by category</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={summary.category_breakdown}
            layout="vertical"
            margin={{ left: 20, right: 40 }}
          >
            <XAxis type="number" tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {summary.category_breakdown.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Anomaly alerts */}
      {anomalies.length > 0 && (
        <div style={{
          background: "#fff", border: "1px solid var(--border)",
          borderRadius: 12, padding: "1.5rem",
        }}>
          <h3 style={{ marginBottom: "1rem", color: "var(--coral)" }}>
            Unusual transactions
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {anomalies.slice(0, 5).map((a, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "10px 12px",
                background: "#fef9f0", borderRadius: 8,
                border: "1px solid #fde68a",
              }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    {a.category}
                  </span>
                  <span style={{
                    fontSize: 11, color: "var(--muted)",
                    marginLeft: 8,
                  }}>
                    {a.date} · {a.description}
                  </span>
                </div>
                <span style={{
                  fontWeight: 700, color: "var(--coral)", fontSize: 14,
                }}>
                  ₹{a.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}