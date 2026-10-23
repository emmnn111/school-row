
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import "./App.css";

function Welcome() {
  return (
    <main className="welcome-page">
      <h1>Welcome to Schoolrow</h1>
      <p>School Equipment Borrowing System</p>

      <div className="welcome-buttons">
        <a href="/student" className="portal-link">
          Student Portal
        </a>

        <a href="/admin" className="portal-link">
          Admin Portal
        </a>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
