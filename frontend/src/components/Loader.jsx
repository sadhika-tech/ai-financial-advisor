export default function Loader({ text = "Loading..." }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
      <div style={{
        width: 32, height: 32, border: "3px solid var(--border)",
        borderTop: "3px solid var(--green)", borderRadius: "50%",
        animation: "spin 0.8s linear infinite", margin: "0 auto 1rem",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {text}
    </div>
  );
}