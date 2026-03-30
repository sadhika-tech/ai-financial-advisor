import { useEffect } from "react";

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
    error  : { bg: "#fef2f2", border: "#fecaca", color: "#dc2626" },
  };
  const s = styles[type] || styles.success;

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, borderRadius: 10,
      padding: "12px 20px", fontSize: 13, fontWeight: 500,
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      animation: "slideUp 0.25s ease",
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      {message}
      <button
        onClick={onClose}
        style={{
          background: "none", border: "none",
          color: "inherit", fontSize: 16,
          cursor: "pointer", marginLeft: 4,
        }}
      >
        ×
      </button>
    </div>
  );
}