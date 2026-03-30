import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar        from "./components/Navbar";
import DashboardPage from "./pages/DashboardPage";
import ForecastPage  from "./pages/ForecastPage";
import CoachPage     from "./pages/CoachPage";
import UploadPage    from "./pages/UploadPage";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div style={{ minHeight: "calc(100vh - 56px)" }}>
        <Routes>
          <Route path="/"         element={<DashboardPage />} />
          <Route path="/forecast" element={<ForecastPage  />} />
          <Route path="/coach"    element={<CoachPage     />} />
          <Route path="/upload"   element={<UploadPage    />} />
          <Route path="*"         element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}