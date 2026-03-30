import { useNavigate } from "react-router-dom";

export default function EmptyState() {
  const navigate = useNavigate();
  return (
    <div style={{
      textAlign: "center", padding: "5rem 1rem",
      maxWidth: 400, margin: "0 auto",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "#f0fdf4", border: "2px solid var(--green)",
        display: "flex", alignItems: "center",
        justifyContent: "center", margin: "0 auto 1.5rem",
        fontSize: 28,
      }}>
        📊
      </div>
      <h3 style={{ marginBottom: 8 }}>No data yet</h3>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: "1.5rem" }}>
        Upload your bank statement CSV to see your spending insights.
      </p>
      <button
        onClick={() => navigate("/upload")}
        style={{
          background: "var(--green)", color: "#fff",
          border: "none", borderRadius: 8,
          padding: "10px 24px", fontWeight: 600, fontSize: 14,
        }}
      >
        Upload CSV
      </button>
    </div>
  );
}