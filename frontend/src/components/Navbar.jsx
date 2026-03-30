import { useState } from "react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/",         label: "Dashboard" },
  { to: "/forecast", label: "Forecast"  },
  { to: "/coach",    label: "Coach"     },
  { to: "/upload",   label: "Upload"    },
];

export default function Navbar({ dataReady = false }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav style={{
        background: "#fff", borderBottom: "1px solid var(--border)",
        padding: "0 1.5rem", height: 56,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: "var(--green)" }}>
          FinanceAI
        </span>

        <div style={{ display: "flex", gap: "1.5rem" }} className="nav-desktop">
          {links.map(l => {
            const locked = !dataReady && l.to !== "/upload";
            return locked ? (
              <span key={l.to} style={{
                color: "#d1d5db", fontSize: 14,
                paddingBottom: 4, cursor: "not-allowed",
                borderBottom: "2px solid transparent",
              }}
                title="Upload a CSV first"
              >
                {l.label}
              </span>
            ) : (
              <NavLink key={l.to} to={l.to} end style={({ isActive }) => ({
                color      : isActive ? "var(--green)" : "var(--gray)",
                fontWeight : isActive ? 600 : 400,
                fontSize   : 14,
                borderBottom: isActive
                  ? "2px solid var(--green)"
                  : "2px solid transparent",
                paddingBottom: 4,
              })}>
                {l.label}
              </NavLink>
            );
          })}
        </div>

        <button
          className="nav-hamburger"
          onClick={() => setOpen(o => !o)}
          style={{
            background: "none", border: "none",
            fontSize: 22, display: "none", color: "var(--text)",
          }}
        >
          {open ? "✕" : "☰"}
        </button>
      </nav>

      {open && (
        <div style={{
          background: "#fff", borderBottom: "1px solid var(--border)",
          padding: "0.5rem 1.5rem 1rem",
          display: "flex", flexDirection: "column", gap: 4,
        }} className="nav-mobile">
          {links.map(l => {
            const locked = !dataReady && l.to !== "/upload";
            return (
              <NavLink
                key={l.to} to={l.to} end
                onClick={() => !locked && setOpen(false)}
                style={({ isActive }) => ({
                  color      : locked ? "#d1d5db" : isActive ? "var(--green)" : "var(--text)",
                  fontWeight : isActive ? 600 : 400,
                  padding    : "8px 0", fontSize: 15,
                  borderBottom: "1px solid var(--border)",
                  pointerEvents: locked ? "none" : "auto",
                })}
              >
                {l.label} {locked ? "🔒" : ""}
              </NavLink>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .nav-desktop   { display: none !important; }
          .nav-hamburger { display: block !important; }
        }
      `}</style>
    </>
  );
}