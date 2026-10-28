
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  LogOut,
  Package,
  Search,
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import "./StudentDashboard.css";
import AIAssistant from "../components/AIAssistant";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const emptyForm = {
  studentName: "",
  studentId: "",
  course: "",
  equipmentId: "",
  quantity: "1",
  startDate: "",
  endDate: "",
  purpose: "",
};

function StudentDashboard() {
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [form, setForm] = useState(emptyForm);

  const selectedEquipment =
    equipment.find(
      (item) => String(item._id) === String(form.equipmentId)
    ) || null;

  const signOut = useCallback(() => {
    localStorage.removeItem("schoolrowToken");
    navigate("/login", { replace: true });
  }, [navigate]);

  const apiFetch = useCallback(
    async (url, options = {}) => {
      const token = localStorage.getItem("schoolrowToken");

      const response = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
        },
      });

      if (response.status === 401) {
        signOut();
        throw new Error("Your session expired. Please sign in again.");
      }

      return response;
    },
    [signOut]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("schoolrowToken");

      if (!token) {
        signOut();
        return;
      }

      const [profileRes, equipmentRes] = await Promise.all([
        apiFetch(`${API}/auth/me`),
        apiFetch(`${API}/equipment`),
      ]);

      if (!profileRes.ok) {
        throw new Error("Could not load your student profile.");
      }

      if (!equipmentRes.ok) {
        throw new Error("Could not load equipment.");
      }

      const profileData = await profileRes.json();
      const equipmentData = await equipmentRes.json();

      const profile =
        profileData.student ||
        profileData.user ||
        profileData.data ||
        profileData;

      setStudent(profile);

      setEquipment(
        Array.isArray(equipmentData)
          ? equipmentData
          : equipmentData.data || equipmentData.equipment || []
      );

      setForm((previous) => ({
        ...previous,
        studentName:
          previous.studentName ||
          profile.fullName ||
          profile.name ||
          profile.studentName ||
          "",
        studentId:
          previous.studentId ||
          profile.studentId ||
          profile.studentID ||
          "",
        course:
          previous.course ||
          [profile.course, profile.section]
            .filter(Boolean)
            .join(" / ") ||
          profile.courseSection ||
          "",
      }));

      const borrowingRes = await apiFetch(`${API}/borrowings`);

      if (!borrowingRes.ok) {
        throw new Error("Could not load your borrowing history.");
      }

      const borrowingData = await borrowingRes.json();

      const allBorrowings = Array.isArray(borrowingData)
        ? borrowingData
        : borrowingData.data || borrowingData.borrowings || [];

      const currentStudentId =
        profile.studentId || profile.studentID || "";

      setBorrowings(
        currentStudentId
          ? allBorrowings.filter(
              (item) =>
                String(item.studentId) === String(currentStudentId)
            )
          : []
      );
    } catch (err) {
      setError(err.message || "Unable to load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, signOut]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (
      !form.studentName.trim() ||
      !form.studentId.trim() ||
      !form.course.trim()
    ) {
      setError(
        "Please complete your name, student ID, and course/section."
      );
      return;
    }

    if (!form.equipmentId || !selectedEquipment) {
      setError("Please select equipment.");
      return;
    }

    const quantity = Number(form.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      setError("Quantity must be a whole number greater than zero.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError("Please select the borrowing and return dates.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError(
        "The return date must be on or after the borrowing date."
      );
      return;
    }

    if (!form.purpose.trim()) {
      setError("Please enter the purpose of borrowing.");
      return;
    }

    const availableQuantity = Number(
      selectedEquipment.quantityAvailable ??
        selectedEquipment.quantity ??
        selectedEquipment.availableQuantity ??
        selectedEquipment.stock ??
        0
    );

    if (quantity > availableQuantity) {
      setError(
        `Only ${availableQuantity} unit(s) are currently available.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiFetch(`${API}/borrowings`, {
        method: "POST",
        body: JSON.stringify({
          studentName: form.studentName.trim(),
          studentId: form.studentId.trim(),
          courseSection: form.course.trim(),
          equipmentId: selectedEquipment._id,
          quantity,
          borrowDate: form.startDate,
          expectedReturnDate: form.endDate,
          purpose: form.purpose.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "The borrowing request could not be submitted."
        );
      }

      setMessage(
        data.message || "Borrowing request submitted successfully!"
      );

      await loadDashboard();

      setForm({
        ...emptyForm,
        studentName: form.studentName,
        studentId: form.studentId,
        course: form.course,
      });
    } catch (err) {
      setError(err.message || "Unable to submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredEquipment = equipment.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" ||
      (item.category || "").toLowerCase() ===
        selectedCategory.toLowerCase();

    const name =
      item.name || item.equipmentName || item.itemName || "";

    const matchesSearch = name
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  function statusIcon(status) {
    const value = String(status || "Pending").toLowerCase();

    if (value === "approved" || value === "returned") {
      return <CheckCircle size={17} />;
    }

    if (value === "rejected") {
      return <XCircle size={17} />;
    }

    return <Clock size={17} />;
  }

  if (loading) {
    return (
      <main className="student-dashboard">
        <p>Loading Schoolrow dashboard...</p>
      </main>
    );
  }

  return (
    <main className="student-dashboard">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <BookOpen size={30} />
          <div>
            <h1>Schoolrow</h1>
            <p>Student Borrowing Portal</p>
          </div>
        </div>

        <button type="button" onClick={signOut}>
          <LogOut size={18} /> Sign Out
        </button>
      </header>

      <section className="dashboard-welcome">
        <p>STUDENT DASHBOARD</p>
        <h2>
          Welcome,{" "}
          {student?.fullName ||
            student?.name ||
            student?.studentName ||
            "Student"}
          !
        </h2>
        <p>
          Find school equipment and manage your borrowing requests.
        </p>
      </section>

      {error && (
        <div className="dashboard-alert error-alert" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div
          className="dashboard-alert success-alert"
          role="status"
        >
          {message}
        </div>
      )}

      <section className="dashboard-stats">
        <article className="stat-card">
          <Package size={24} />
          <div>
            <p>Equipment Items</p>
            <h3>{equipment.length}</h3>
          </div>
        </article>

        <article className="stat-card">
          <ClipboardList size={24} />
          <div>
            <p>My Requests</p>
            <h3>{borrowings.length}</h3>
          </div>
        </article>

        <article className="stat-card">
          <Clock size={24} />
          <div>
            <p>Pending</p>
            <h3>
              {
                borrowings.filter(
                  (item) =>
                    String(item.status || "Pending").toLowerCase() ===
                    "pending"
                ).length
              }
            </h3>
          </div>
        </article>

        <article className="stat-card">
          <CheckCircle size={24} />
          <div>
            <p>Approved</p>
            <h3>
              {
                borrowings.filter(
                  (item) =>
                    String(item.status || "").toLowerCase() ===
                    "approved"
                ).length
              }
            </h3>
          </div>
        </article>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Available Equipment</h2>
            <p>Search and select an item you need.</p>
          </div>

          <div className="equipment-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search equipment..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="category-filters">
          {["All", "Sports"].map((category) => (
            <button
              key={category}
              type="button"
              className={
                selectedCategory === category
                  ? "category-button active"
                  : "category-button"
              }
              onClick={() => setSelectedCategory(category)}
            >
              {category === "All" ? "All Equipment" : "Sports"}
            </button>
          ))}
        </div>

        {filteredEquipment.length === 0 ? (
          <p className="empty-state">No equipment found.</p>
        ) : (
          <div className="equipment-grid">
            {filteredEquipment.map((item) => {
              const name =
                item.name ||
                item.equipmentName ||
                item.itemName ||
                "Equipment";

              const available = Number(
                item.quantityAvailable ??
                  item.quantity ??
                  item.availableQuantity ??
                  item.stock ??
                  0
              );

              return (
                <article className="equipment-card" key={item._id}>
                  {item.image ? (
                    <img
                      className="equipment-image"
                      src={item.image}
                      alt={name}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="equipment-image-placeholder">
                      <Package size={40} />
                      <span>No image available</span>
                    </div>
                  )}

                  <h3>{name}</h3>
                  <p>{item.category || "School equipment"}</p>
                  <p>
                    {item.description || "No description available."}
                  </p>
                  <p>Available: {available}</p>

                  <button
                    type="button"
                    onClick={() => {
                      setForm((previous) => ({
                        ...previous,
                        equipmentId: String(item._id),
                      }));
                      setError("");
                      setMessage(`Selected: ${name}`);
                    }}
                    disabled={!item._id || available < 1}
                  >
                    {available < 1
                      ? "Unavailable"
                      : "Select Equipment"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Borrow Equipment</h2>
        <p>
          Enter your student information and complete the borrowing
          request.
        </p>

        {selectedEquipment && (
          <p className="selected-equipment">
            Selected equipment:{" "}
            <strong>
              {selectedEquipment.name ||
                selectedEquipment.equipmentName ||
                selectedEquipment.itemName ||
                "Equipment"}
            </strong>
          </p>
        )}

        <form className="borrowing-form" onSubmit={handleSubmit}>
          <div className="student-info-grid">
            <div className="student-info-item">
              <label htmlFor="studentName">Student Name *</label>
              <input
                id="studentName"
                name="studentName"
                value={form.studentName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="student-info-item">
              <label htmlFor="studentId">Student ID *</label>
              <input
                id="studentId"
                name="studentId"
                value={form.studentId}
                onChange={handleChange}
                placeholder="Enter your student ID"
                required
              />
            </div>

            <div className="student-info-item">
              <label htmlFor="course">Course / Section *</label>
              <input
                id="course"
                name="course"
                value={form.course}
                onChange={handleChange}
                placeholder="e.g. BSIT / 2A"
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="equipmentId">Equipment *</label>
              <select
                id="equipmentId"
                name="equipmentId"
                value={form.equipmentId}
                onChange={handleChange}
                required
              >
                <option value="">Select equipment</option>
                {equipment.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name ||
                      item.equipmentName ||
                      item.itemName ||
                      "Equipment"}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="quantity">Quantity *</label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                step="1"
                value={form.quantity}
                onChange={handleChange}
                onKeyDown={(event) => {
                  if (
                    ["-", "+", "e", "E", "."].includes(event.key)
                  ) {
                    event.preventDefault();
                  }
                }}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="startDate">Borrow Date *</label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="endDate">Return Date *</label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="purpose">
                Purpose of Borrowing *
              </label>
              <textarea
                id="purpose"
                name="purpose"
                rows="3"
                placeholder="Explain why you need this equipment..."
                value={form.purpose}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="primary-button"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>My Borrowing Requests</h2>
            <p>Check the status of your requests.</p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {borrowings.length === 0 ? (
          <p className="empty-state">
            You have not submitted any borrowing requests yet.
          </p>
        ) : (
          <div className="requests-list">
            {borrowings.map((item) => {
              const status = item.status || "Pending";

              return (
                <article className="request-card" key={item._id}>
                  <div>
                    <h3>
                      {item.equipmentName ||
                        item.equipmentId?.name ||
                        "Equipment"}
                    </h3>

                    <p>Student: {item.studentName}</p>
                    <p>Student ID: {item.studentId}</p>
                    <p>Course / Section: {item.courseSection}</p>
                    <p>Quantity: {item.quantity ?? 1}</p>

                    <p>
                      Borrow date:{" "}
                      {item.borrowDate
                        ? String(item.borrowDate).slice(0, 10)
                        : "Not specified"}
                    </p>

                    <p>
                      Return date:{" "}
                      {item.expectedReturnDate
                        ? String(item.expectedReturnDate).slice(0, 10)
                        : "Not specified"}
                    </p>

                    {item.purpose && <p>Purpose: {item.purpose}</p>}
                  </div>

                  <span
                    className={`status-badge status-${String(
                      status
                    ).toLowerCase()}`}
                  >
                    {statusIcon(status)} {status}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="dashboard-footer">
        <p>Schoolrow Student Borrowing Portal</p>
      </footer>

      {/* Floating AI assistant */}
      <AIAssistant role="student" />
    </main>
  );
}

export default StudentDashboard;
