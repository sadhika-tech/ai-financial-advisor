import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar        from "./components/Navbar";
import AnomalyBanner from "./components/AnomalyBanner";
import DashboardPage from "./pages/DashboardPage";
import ForecastPage  from "./pages/ForecastPage";
import CoachPage     from "./pages/CoachPage";
import UploadPage    from "./pages/UploadPage";
import { getHealth, getAnomalies } from "./api";

export default function App() {
  const [dataReady,  setDataReady]  = useState(false);   // true once CSV uploaded
  const [checking,   setChecking]   = useState(true);    // true while health check runs
  const [anomalies,  setAnomalies]  = useState([]);

  // On first load — check if backend already has data from a previous session.
  // If yes, skip upload. If no, force /upload.
  useEffect(() => {
    getHealth()
      .then(r => {
        // Only auto-skip upload if data_loaded AND models exist
        // (i.e. they already uploaded this session or in dev mode)
        const ready = r.data.data_loaded && r.data.models_found > 0;
        setDataReady(ready);
      })
      .catch(() => setDataReady(false))
      .finally(() => setChecking(false));
  }, []);

  // Once data is ready, fetch anomalies for the banner
  useEffect(() => {
    if (!dataReady) return;
    getAnomalies()
      .then(r => setAnomalies(r.data.anomalies || []))
      .catch(() => {});
  }, [dataReady]);

  const handleUploadSuccess = useCallback(() => {
    setDataReady(true);
  }, []);

  if (checking) {
    return (
      <div style={{
        height: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        color: "var(--muted)", fontSize: 14,
      }}>
        <div>
          <div style={{
            width: 32, height: 32,
            border: "3px solid var(--border)",
            borderTop: "3px solid var(--green)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Connecting to backend...
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Navbar dataReady={dataReady} />
      {dataReady && <AnomalyBanner anomalies={anomalies} />}
      <div style={{ minHeight: "calc(100vh - 56px)" }}>
        <Routes>
          {/* Upload is always accessible */}
          <Route
            path="/upload"
            element={<UploadPage onUploadSuccess={handleUploadSuccess} />}
          />

          {/* All other routes require data */}
          <Route
            path="/"
            element={dataReady ? <DashboardPage /> : <Navigate to="/upload" replace />}
          />
          <Route
            path="/forecast"
            element={dataReady ? <ForecastPage /> : <Navigate to="/upload" replace />}
          />
          <Route
            path="/coach"
            element={dataReady ? <CoachPage /> : <Navigate to="/upload" replace />}
          />
          <Route path="*" element={<Navigate to={dataReady ? "/" : "/upload"} replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}