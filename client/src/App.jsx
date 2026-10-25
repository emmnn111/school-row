
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import StudentLogin from "./pages/StudentLogin";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import RequireStudent from "./pages/RequireStudent";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/student/login" replace />}
        />

        <Route
          path="/student/login"
          element={<StudentLogin />}
        />

        <Route
          path="/student"
          element={
            <RequireStudent>
              <StudentDashboard />
            </RequireStudent>
          }
        />

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

        <Route
          path="*"
          element={<Navigate to="/student/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
