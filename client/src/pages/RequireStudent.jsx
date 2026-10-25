
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function RequireStudent({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkStudent() {
      const token = localStorage.getItem("schoolrowToken");

      if (!token) {
        if (!cancelled) setStatus("unauthorized");
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:5000/api/auth/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Session is invalid.");
        }

        const data = await response.json();

        if (data.role !== "student" || !data.student) {
          throw new Error("This is not a student account.");
        }

        if (!cancelled) setStatus("authorized");
      } catch {
        localStorage.removeItem("schoolrowToken");
        localStorage.removeItem("schoolrowRole");

        if (!cancelled) setStatus("unauthorized");
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
