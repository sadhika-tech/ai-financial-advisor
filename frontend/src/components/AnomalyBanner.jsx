import { useState } from "react";

export default function AnomalyBanner({ anomalies = [] }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || anomalies.length === 0) return null;

  const top = anomalies[0];

  return (
    <div style={{
      background: "#fff7ed", borderBottom: "1px solid #fed7aa",
      padding: "10px 2rem",
      display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: "1rem",
      fontSize: 13,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          background: "#f97316", color: "#fff",
          borderRadius: 20, padding: "2px 8px",
          fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
        }}>
          {anomalies.length} alert{anomalies.length > 1 ? "s" : ""}
        </span>
        <span style={{ color: "#92400e" }}>
          Unusual spend detected — highest: <strong>
            ₹{top.amount.toLocaleString()}
          </strong> on <strong>{top.category}</strong> on {top.date}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: "none", border: "none",
          color: "#92400e", fontSize: 18,
          lineHeight: 1, padding: "0 4px", flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}