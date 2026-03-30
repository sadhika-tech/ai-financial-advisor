const shimmer = `
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
`;

function Bone({ w = "100%", h = 16, radius = 6, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
      backgroundSize: "800px 100%",
      animation: "shimmer 1.4s infinite linear",
      ...style,
    }} />
  );
}

export function StatCardSkeleton() {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{
        background: "#fff", border: "1px solid var(--border)",
        borderRadius: 12, padding: "1.25rem",
        borderTop: "3px solid #e5e7eb",
      }}>
        <Bone w="60%"  h={11} style={{ marginBottom: 10 }} />
        <Bone w="80%"  h={24} style={{ marginBottom: 8  }} />
        <Bone w="50%"  h={11} />
      </div>
    </>
  );
}

export function ChartSkeleton({ height = 260 }) {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{
        background: "#fff", border: "1px solid var(--border)",
        borderRadius: 12, padding: "1.5rem",
      }}>
        <Bone w="30%" h={16} style={{ marginBottom: "1.25rem" }} />
        <Bone w="100%" h={height} radius={8} />
      </div>
    </>
  );
}

export function TipSkeleton() {
  return (
    <>
      <style>{shimmer}</style>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          background: "#f9fafb", border: "1px solid var(--border)",
          borderRadius: 10, padding: "1rem 1.25rem",
          display: "flex", gap: "0.75rem",
        }}>
          <Bone w={8} h={8} radius={4} style={{ marginTop: 6, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <Bone w="25%" h={12} />
            <Bone w="90%" h={11} />
            <Bone w="70%" h={11} />
          </div>
        </div>
      ))}
    </>
  );
}