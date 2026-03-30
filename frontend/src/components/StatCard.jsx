export default function StatCard({ label, value, sub, color = "var(--green)" }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid var(--border)",
      borderRadius: 12, padding: "1.25rem",
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}