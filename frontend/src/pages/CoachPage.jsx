import { useEffect, useState } from "react";
import { getBudgetPlan, getCluster } from "../api";
import Loader   from "../components/Loader";
import ErrorBox from "../components/ErrorBox";

const PRIORITY_STYLE = {
  high  : { bg: "#fef2f2", border: "#fecaca", dot: "#dc2626", label: "High"   },
  medium: { bg: "#fffbeb", border: "#fde68a", dot: "#d97706", label: "Medium" },
  low   : { bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a", label: "Low"    },
};

export default function CoachPage() {
  const [plan,    setPlan]    = useState(null);
  const [cluster, setCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [months,  setMonths]  = useState(3);

  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all([getBudgetPlan(months), getCluster()])
      .then(([p, c]) => { setPlan(p.data); setCluster(c.data); })
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [months]);

  if (loading) return <Loader text="Generating your budget plan..." />;
  if (error)   return <div style={{ padding: "2rem" }}><ErrorBox message={error} /></div>;
  if (!plan)   return null;

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem" }}>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "1.5rem",
      }}>
        <h2>Budget Coach</h2>
        <select
          value={months}
          onChange={e => setMonths(Number(e.target.value))}
          style={{
            border: "1px solid var(--border)", borderRadius: 8,
            padding: "6px 12px", fontSize: 13, background: "#fff",
          }}
        >
          {[1, 3, 6].map(m => (
            <option key={m} value={m}>Last {m} month{m > 1 ? "s" : ""}</option>
          ))}
        </select>
      </div>

      {/* Persona card */}
      {cluster && (
        <div style={{
          background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
          border: "1px solid #bbf7d0", borderRadius: 12,
          padding: "1.5rem", marginBottom: "1.5rem",
          display: "flex", gap: "1.5rem", alignItems: "flex-start",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "var(--green)", color: "#fff",
            display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 22, flexShrink: 0,
          }}>
            {cluster.persona[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{cluster.persona}</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
              {cluster.description}
            </div>
            <div style={{
              display: "flex", gap: 12, marginTop: "0.75rem", flexWrap: "wrap",
            }}>
              {[
                { label: "Transactions",   value: cluster.stats.txn_count },
                { label: "Avg transaction", value: `₹${cluster.stats.avg_transaction?.toLocaleString()}` },
                { label: "Weekend spend",  value: `${cluster.stats.weekend_spend_pct}%` },
              ].map(s => (
                <div key={s.label} style={{ fontSize: 12 }}>
                  <span style={{ color: "var(--muted)" }}>{s.label}: </span>
                  <span style={{ fontWeight: 600 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12, marginBottom: "1.5rem",
      }}>
        {[
          { label: "Income",       value: `₹${plan.total_income.toLocaleString()}`,  color: "var(--green)"  },
          { label: "Expenses",     value: `₹${plan.total_expense.toLocaleString()}`, color: "var(--coral)"  },
          { label: "Savings rate", value: `${plan.savings_rate}%`,                   color: "var(--purple)" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#fff", border: "1px solid var(--border)",
            borderRadius: 10, padding: "1rem",
            borderLeft: `4px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {plan.tips.map((tip, i) => {
          const s = PRIORITY_STYLE[tip.priority] || PRIORITY_STYLE.low;
          return (
            <div key={i} style={{
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: 10, padding: "1rem 1.25rem",
              display: "flex", gap: "0.75rem", alignItems: "flex-start",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: s.dot, marginTop: 6, flexShrink: 0,
              }} />
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{tip.category}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "1px 7px",
                    borderRadius: 10, background: s.dot, color: "#fff",
                  }}>
                    {s.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                  {tip.tip}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}