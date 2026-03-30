export default function PageWrapper({ children, maxWidth = 960 }) {
  return (
    <div style={{
      maxWidth, margin: "2rem auto",
      padding: "0 1rem",
    }}>
      {children}
    </div>
  );
}