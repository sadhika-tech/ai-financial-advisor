export default function ErrorBox({ message }) {
  return (
    <div style={{
      background: "#fef2f2", border: "1px solid #fecaca",
      borderRadius: 8, padding: "1rem 1.25rem", color: "#dc2626",
      fontSize: 13, margin: "1rem 0",
    }}>
      {message || "Something went wrong. Is the backend running on port 8000?"}
    </div>
  );
}