import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function RequireStudent({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkStudent() {
      const token = localStorage.getItem("schoolrowToken");
      const savedRole = localStorage.getItem("schoolrowRole");

      // Make sure a student token and role exist.
      if (!token || savedRole !== "student") {
        if (!cancelled) {
          setStatus("unauthorized");
        }
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Student verification failed (${response.status}).`
          );
        }

        const data = await response.json();

        // Support common backend response structures.
        const user = data.user || data.data || data;
        const role = user.role || data.role;

        // Accept either a nested student object or a user object
        // when the verified role is student.
        const student =
          user.student ||
          data.student ||
          (role === "student" ? user : null);

        if (role !== "student" || !student) {
          throw new Error("This is not a student account.");
        }

        if (!cancelled) {
          setStatus("authorized");
        }
      } catch (error) {
        console.error("Student verification error:", error);

        // Clear invalid credentials.
        localStorage.removeItem("schoolrowToken");
        localStorage.removeItem("schoolrowRole");

        if (!cancelled) {
          setStatus("unauthorized");
        }
      }
    }

    checkStudent();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return <p>Checking student account...</p>;
  }

  if (status === "unauthorized") {
    return <Navigate to="/student/login" replace />;
  }

  return children;
}