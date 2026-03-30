import { useState } from "react";
import { uploadCSV } from "../api";
import Loader   from "../components/Loader";
import ErrorBox from "../components/ErrorBox";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS = [
  "#1D9E75","#378ADD","#BA7517","#D85A30","#7F77DD",
  "#0F6E56","#185FA5","#854F0B","#993C1D","#534AB7",
];

export default function UploadPage() {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [result,   setResult]   = useState(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file) {
    if (!file || !file.name.endsWith(".csv")) {
      setError("Please upload a .csv file."); return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await uploadCSV(file);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h2 style={{ marginBottom: "1.5rem" }}>Upload Transactions</h2>

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
        <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
        <div style={{ fontWeight: 600 }}>Drop your CSV here or click to browse</div>
        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
          Supports any bank export — columns are auto-detected
        </div>
        <input
          id="csv-input" type="file" accept=".csv"
          style={{ display: "none" }}
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>

      {loading && <Loader text="Cleaning and analyzing your data..." />}
      {error   && <ErrorBox message={error} />}

      {result && (
        <div style={{ marginTop: "2rem" }}>
          {/* Summary row */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12, marginBottom: "1.5rem",
          }}>
            {[
              { label: "Rows imported",   value: result.rows_after_clean },
              { label: "Total spend",     value: `₹${result.total_expense.toLocaleString()}` },
              { label: "Date range",
                value: `${result.date_range.start} → ${result.date_range.end}` },
            ].map(c => (
              <div key={c.label} style={{
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: 8, padding: "1rem",
              }}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.label}</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{c.value}</div>
              </div>
            ))}
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
                  data={result.categories}
                  dataKey="total" nameKey="category"
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
    </div>
  );
}