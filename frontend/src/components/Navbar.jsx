import { NavLink } from "react-router-dom";

const links = [
  { to: "/",         label: "Dashboard"  },
  { to: "/forecast", label: "Forecast"   },
  { to: "/coach",    label: "Coach"      },
  { to: "/upload",   label: "Upload"     },
];

export default function Navbar() {
  return (
    <nav style={{
      background: "#fff", borderBottom: "1px solid var(--border)",
      padding: "0 2rem", display: "flex", alignItems: "center",
      gap: "2rem", height: 56, position: "sticky", top: 0, zIndex: 100,
    }}>
      <span style={{ fontWeight: 700, fontSize: 16, color: "var(--green)" }}>
        FinAdvisor AI
      </span>
      <div style={{ display: "flex", gap: "1.5rem" }}>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end style={({ isActive }) => ({
            color     : isActive ? "var(--green)" : "var(--gray)",
            fontWeight: isActive ? 600 : 400,
            fontSize  : 14,
            borderBottom: isActive ? "2px solid var(--green)" : "2px solid transparent",
            paddingBottom: 4,
          })}>
            {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}