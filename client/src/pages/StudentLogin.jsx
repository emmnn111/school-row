
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentLogin.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function StudentLogin() {
  const [mode, setMode] = useState("student");
  const [formType, setFormType] = useState("login");
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  function changeMode(newMode) {
    setMode(newMode);
    setFormType("login");
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");

    if (formType === "register") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint =
        formType === "register" ? "register" : "login";

      const body =
        formType === "register"
          ? {
              fullName: fullName.trim(),
              studentId: studentId.trim(),
              email: email.trim(),
              password,
            }
          : {
              studentId: studentId.trim(),
              password,
            };

      const response = await fetch(`${API}/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login request failed.");
      }

      if (formType === "register") {
        setFormType("login");
        setMode("student");
        setPassword("");
        setConfirmPassword("");
        setError("Registration successful. You can now log in.");
        return;
      }

      if (!data.token || !["student", "admin"].includes(data.role)) {
        throw new Error("The server returned an invalid login response.");
      }

      if (data.role !== mode) {
        throw new Error(
          data.role === "admin"
            ? "Please select Admin Login for this account."
            : "Please select Student Login for this account."
        );
      }

      // Save authentication before navigating.
      localStorage.setItem("schoolrowToken", data.token);
      localStorage.setItem("schoolrowRole", data.role);

      // Replace the login page with the appropriate dashboard.
      const destination =
        data.role === "admin" ? "/admin" : "/student";

      window.location.replace(destination);
    } catch (err) {
      console.error("Schoolrow authentication error:", err);

      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Make sure the server is running."
          : err.message || "Unable to log in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-brand">
        <div className="brand-logo">SR</div>
        <div className="brand-divider" />
        <div className="brand-description">
          <strong>Schoolrow</strong>
          <span>School Equipment Borrowing System</span>
        </div>
      </div>

      <section className="login-card">
        <div className="login-gradient" />

        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${mode === "student" ? "active" : ""}`}
            onClick={() => changeMode("student")}
          >
            Student Login
          </button>

          <button
            type="button"
            className={`login-tab ${mode === "admin" ? "active" : ""}`}
            onClick={() => changeMode("admin")}
          >
            Admin Login
          </button>
        </div>

        <div className="login-heading">
          <h1>
            {formType === "register"
              ? "Create Account"
              : mode === "admin"
                ? "Welcome, Admin"
                : "Welcome Back"}
          </h1>
          <p>
            {formType === "register"
              ? "Register to start borrowing school equipment."
              : mode === "admin"
                ? "Sign in to manage equipment and borrowings."
                : "Sign in to access your student dashboard."}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {formType === "register" && (
            <>
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="studentId">
              {mode === "admin" ? "Admin Username" : "Student ID"}
            </label>
            <input
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder={
                mode === "admin"
                  ? "Enter admin username"
                  : "Enter your student ID"
              }
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete={
                  formType === "register"
                    ? "new-password"
                    : "current-password"
                }
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {formType === "register" && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : formType === "register"
                ? "Create Account"
                : "Log In"}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </form>

        {mode === "student" && (
          <p className="login-footer">
            {formType === "register"
              ? "Already have an account? "
              : "Don't have an account? "}
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setFormType(
                  formType === "register" ? "login" : "register"
                );
                setError("");
                setPassword("");
                setConfirmPassword("");
              }}
            >
              {formType === "register" ? "Log in" : "Register"}
            </button>
          </p>
        )}
      </section>

      <p className="login-copyright">
        © {new Date().getFullYear()} Schoolrow. All rights reserved.
      </p>
    </main>
  );
}
