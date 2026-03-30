import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadCSV } from "../api";
import Loader   from "../components/Loader";
import ErrorBox from "../components/ErrorBox";
import Toast    from "../components/ToastNotification";
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const COLORS = [
  "#1D9E75","#378ADD","#BA7517","#D85A30","#7F77DD",
  "#0F6E56","#185FA5","#854F0B","#993C1D","#534AB7",
];

export default function UploadPage({ onUploadSuccess }) {
  const navigate = useNavigate();
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [result,   setResult]   = useState(null);
  const [dragging, setDragging] = useState(false);
  const [toast,    setToast]    = useState(null);

  async function handleFile(file) {
    if (!file || !file.name.endsWith(".csv")) {
      setError("Please upload a .csv file."); return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await uploadCSV(file);
      setResult(res.data);
      setToast({ message: `${res.data.rows_after_clean} transactions imported!`, type: "success" });
      // Notify App that data is ready, then redirect after 2s
      onUploadSuccess?.();
      setTimeout(() => navigate("/"), 2000);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>

      {/* Hero — only show when no result yet */}
      {!result && (
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "#f0fdf4", border: "2px solid var(--green)",
            display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 28,
            margin: "0 auto 1rem",
          }}>
            📂
          </div>
          <h2 style={{ marginBottom: 8 }}>Upload your transactions</h2>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            Export a CSV from your bank app and drop it here.
            Columns are auto-detected — no formatting needed.
          </p>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault(); setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        style={{
          border    : `2px dashed ${dragging ? "var(--green)" : "var(--border)"}`,
          borderRadius: 12, padding: "3rem 2rem", textAlign: "center",
          background: dragging ? "#f0fdf4" : "#fff",
          transition: "all 0.2s", cursor: "pointer",
        }}
        onClick={() => document.getElementById("csv-input").click()}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {dragging ? "Drop it!" : "Drop CSV here or click to browse"}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>
          Supports HDFC, ICICI, SBI, Axis, any bank export
        </div>
        <input
          id="csv-input" type="file" accept=".csv"
          style={{ display: "none" }}
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>

      {/* Accepted formats hint */}
      {!result && (
        <div style={{
          marginTop: "1rem", padding: "0.75rem 1rem",
          background: "#f8fafc", border: "1px solid var(--border)",
          borderRadius: 8, fontSize: 12, color: "var(--muted)",
        }}>
          <strong style={{ color: "var(--text)" }}>Expected columns (any order, any name):</strong>
          {" "}date, description / narration / merchant, amount, category (optional), type (optional)
        </div>
      )}

      {loading && <Loader text="Cleaning and analyzing your data..." />}
      {error   && <ErrorBox message={error} />}

      {result && (
        <div style={{ marginTop: "2rem" }}>
          {/* Success summary */}
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 10, padding: "1rem 1.25rem",
            marginBottom: "1.25rem",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>✓</span>
            <div>
              <div style={{ fontWeight: 600 }}>
                {result.rows_after_clean} transactions imported
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {result.date_range.start} → {result.date_range.end}
                {" · "}Total spend: ₹{result.total_expense.toLocaleString()}
              </div>
            </div>
            <div style={{
              marginLeft: "auto", fontSize: 12,
              color: "var(--muted)", fontStyle: "italic",
            }}>
              Redirecting to dashboard...
            </div>
          </div>

          {/* Pie chart */}
          <div style={{
            background: "#fff", border: "1px solid var(--border)",
            borderRadius: 12, padding: "1.5rem",
          }}>
            <h3 style={{ marginBottom: "1rem" }}>Spend by category</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={result.categories} dataKey="total" nameKey="category"
                  cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                  paddingAngle={2}
                >
                  {result.categories.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
