
import { useEffect, useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  Package,
  Search,
  RefreshCw,
  CalendarDays,
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  LogOut
} from "lucide-react";
import "../App.css";

const API_URL = "http://localhost:5000/api";

const emptyForm = {
  studentName: "",
  studentId: "",
  courseSection: "",
  equipmentId: "",
  quantity: 1,
  borrowDate: new Date().toISOString().split("T")[0],
  expectedReturnDate: "",
  purpose: ""
};

export default function StudentDashboard() {
  const [equipment, setEquipment] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [search, setSearch] = useState("");
  const [studentIdSearch, setStudentIdSearch] = useState("");
  const [activeStudentId, setActiveStudentId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadEquipment = async () => {
    try {
      const response = await fetch(`${API_URL}/equipment`);

      if (!response.ok) {
        throw new Error("Unable to load equipment.");
      }

      const result = await response.json();
      setEquipment(Array.isArray(result) ? result : result.data || []);
    } catch (err) {
      setError(err.message || "Failed to load equipment.");
    } finally {
      setLoading(false);
    }
  };

  const loadBorrowings = async (studentId) => {
    if (!studentId.trim()) {
      setBorrowings([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/borrowings?studentId=${encodeURIComponent(
          studentId.trim()
        )}`
      );

      if (!response.ok) {
        throw new Error("Unable to load borrowing requests.");
      }

      const result = await response.json();
      setBorrowings(Array.isArray(result) ? result : result.data || []);
    } catch (err) {
      setError(err.message || "Failed to load borrowing requests.");
    }
  };

  useEffect(() => {
    loadEquipment();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleBorrow = (item) => {
    setForm((previous) => ({
      ...previous,
      equipmentId: item._id,
      quantity: 1
    }));

    setMessage("");
    setError("");

    document
      .getElementById("student-borrow-form")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.equipmentId) {
      setError("Please select equipment first.");
      return;
    }

    if (
      !form.studentName.trim() ||
      !form.studentId.trim() ||
      !form.courseSection.trim() ||
      !form.purpose.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (
      !form.expectedReturnDate ||
      form.expectedReturnDate < form.borrowDate
    ) {
      setError("The return date must be on or after the borrow date.");
      return;
    }

    const selectedEquipment = equipment.find(
      (item) => item._id === form.equipmentId
    );

    if (
      !selectedEquipment ||
      Number(form.quantity) < 1 ||
      Number(form.quantity) > selectedEquipment.quantityAvailable
    ) {
      setError("Please enter a valid available quantity.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/borrowings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity)
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to submit borrowing request."
        );
      }

      setMessage("Borrowing request submitted successfully!");
      setActiveStudentId(form.studentId);
      setStudentIdSearch(form.studentId);
      setForm({
        ...emptyForm,
        studentName: form.studentName,
        studentId: form.studentId,
        courseSection: form.courseSection
      });

      await loadBorrowings(form.studentId);
      await loadEquipment();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const findMyRequests = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!studentIdSearch.trim()) {
      setError("Enter your student ID to find your requests.");
      return;
    }

    setActiveStudentId(studentIdSearch.trim());
    await loadBorrowings(studentIdSearch.trim());
  };

  const filteredEquipment = equipment.filter((item) => {
    const searchText = search.toLowerCase();

    return (
      item.name?.toLowerCase().includes(searchText) ||
      item.category?.toLowerCase().includes(searchText) ||
      item.assetCode?.toLowerCase().includes(searchText)
    );
  });

  const getStatusClass = (status) => {
    switch (status) {
      case "Approved":
      case "Borrowed":
        return "approved";
      case "Returned":
        return "returned";
      case "Rejected":
        return "rejected";
      default:
        return "pending";
    }
  };

  const getEquipmentName = (borrowing) => {
    if (
      borrowing.equipmentId &&
      typeof borrowing.equipmentId === "object"
    ) {
      return borrowing.equipmentId.name || "Equipment";
    }

    return (
      equipment.find((item) => item._id === borrowing.equipmentId)?.name ||
      "Equipment"
    );
  };

  const pendingCount = borrowings.filter(
    (item) => item.status === "Pending"
  ).length;

  const approvedCount = borrowings.filter(
    (item) =>
      item.status === "Approved" || item.status === "Borrowed"
  ).length;

  const returnedCount = borrowings.filter(
    (item) => item.status === "Returned"
  ).length;

  return (
    <div className="student-portal">
      <aside className="student-sidebar">
        <div className="student-brand">
          <div className="student-brand-icon">
            <BookOpen size={25} />
          </div>
          <div>
            <h2>Schoolrow</h2>
            <p>Student Portal</p>
          </div>
        </div>

        <nav className="student-navigation">
          <a href="#student-home" className="student-nav-link active">
            <LayoutDashboard size={19} />
            Dashboard
          </a>

          <a href="#student-equipment" className="student-nav-link">
            <Package size={19} />
            Equipment
          </a>

          <a href="#student-borrow-form" className="student-nav-link">
            <ClipboardList size={19} />
            Borrow Equipment
          </a>

          <a href="#student-requests" className="student-nav-link">
            <Clock size={19} />
            My Requests
          </a>
        </nav>

        <a href="/" className="student-logout">
          <LogOut size={18} />
          Back to Welcome
        </a>
      </aside>

      <main className="student-main" id="student-home">
        <header className="student-topbar">
          <div>
            <h1>Student Dashboard</h1>
            <p>Browse and borrow available school equipment.</p>
          </div>

          <button
            type="button"
            className="student-refresh-button"
            onClick={() => {
              loadEquipment();
              if (activeStudentId) {
                loadBorrowings(activeStudentId);
              }
            }}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="student-alert student-alert-error">
            <XCircle size={18} />
            {error}
          </div>
        )}

        {message && (
          <div className="student-alert student-alert-success">
            <CheckCircle size={18} />
            {message}
          </div>
        )}

        <section className="student-stats">
          <div className="student-stat-card">
            <div className="student-stat-icon">
              <Package size={23} />
            </div>
            <div>
              <p>Equipment Types</p>
              <h3>{equipment.length}</h3>
            </div>
          </div>

          <div className="student-stat-card">
            <div className="student-stat-icon">
              <Clock size={23} />
            </div>
            <div>
              <p>Pending Requests</p>
              <h3>{pendingCount}</h3>
            </div>
          </div>

          <div className="student-stat-card">
            <div className="student-stat-icon">
              <CheckCircle size={23} />
            </div>
            <div>
              <p>Approved / Borrowed</p>
              <h3>{approvedCount}</h3>
            </div>
          </div>

          <div className="student-stat-card">
            <div className="student-stat-icon">
              <ClipboardList size={23} />
            </div>
            <div>
              <p>Returned</p>
              <h3>{returnedCount}</h3>
            </div>
          </div>
        </section>

        <section
          className="student-panel"
          id="student-equipment"
        >
          <div className="student-panel-heading">
            <div>
              <h2>Available Equipment</h2>
              <p>Select an item to start a borrowing request.</p>
            </div>

            <div className="student-search">
              <Search size={18} />
              <input
                type="search"
                placeholder="Search equipment..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <p className="student-empty">Loading equipment...</p>
          ) : filteredEquipment.length === 0 ? (
            <p className="student-empty">
              No equipment found.
            </p>
          ) : (
            <div className="student-equipment-grid">
              {filteredEquipment.map((item) => (
                <article
                  className="student-equipment-card"
                  key={item._id}
                >
                  <div className="student-equipment-image">
                 
                  <img
                    src={
                      item.image
                        ? item.image
                        : "/equipment/default-equipment.jpg"
                    }
                    alt={item.name}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/equipment/default-equipment.jpg";
                    }}
                  />

                  </div>

                  <div className="student-equipment-details">
                    <span className="student-equipment-category">
                      {item.category}
                    </span>

                    <h3>{item.name}</h3>

                    <p className="student-equipment-code">
                      Asset Code: {item.assetCode}
                    </p>

                    <p className="student-equipment-description">
                      {item.description ||
                        "School equipment available for student borrowing."}
                    </p>

                    <div className="student-equipment-info">
                      <span>
                        Available:{" "}
                        <strong>{item.quantityAvailable}</strong>
                      </span>

                      <span
                        className={`student-condition ${
                          item.condition === "Damaged"
                            ? "damaged"
                            : ""
                        }`}
                      >
                        {item.condition || "Good"}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="student-borrow-button"
                      disabled={
                        Number(item.quantityAvailable) < 1 ||
                        item.condition === "Damaged"
                      }
                      onClick={() => handleBorrow(item)}
                    >
                      {Number(item.quantityAvailable) < 1
                        ? "Unavailable"
                        : item.condition === "Damaged"
                        ? "Damaged"
                        : "Borrow Equipment"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section
          className="student-panel"
          id="student-borrow-form"
        >
          <div className="student-panel-heading">
            <div>
              <h2>Borrow Equipment</h2>
              <p>Complete the form to submit your request.</p>
            </div>
          </div>

          <form
            className="student-borrow-form"
            onSubmit={handleSubmit}
          >
            <div className="student-form-grid">
              <div className="student-form-group">
                <label htmlFor="studentName">Full Name *</label>
                <input
                  id="studentName"
                  name="studentName"
                  value={form.studentName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="student-form-group">
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

              <div className="student-form-group">
                <label htmlFor="courseSection">
                  Course and Section *
                </label>
                <input
                  id="courseSection"
                  name="courseSection"
                  value={form.courseSection}
                  onChange={handleChange}
                  placeholder="e.g. BSIT 2A"
                  required
                />
              </div>

              <div className="student-form-group">
                <label htmlFor="equipmentId">
                  Select Equipment *
                </label>
                <select
                  id="equipmentId"
                  name="equipmentId"
                  value={form.equipmentId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Choose equipment</option>
                  {equipment
                    .filter(
                      (item) =>
                        Number(item.quantityAvailable) > 0 &&
                        item.condition !== "Damaged"
                    )
                    .map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} — {item.quantityAvailable} available
                      </option>
                    ))}
                </select>
              </div>

              <div className="student-form-group">
                <label htmlFor="quantity">Quantity *</label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  max={
                    equipment.find(
                      (item) => item._id === form.equipmentId
                    )?.quantityAvailable || 1
                  }
                  value={form.quantity}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="student-form-group">
                <label htmlFor="borrowDate">Borrow Date *</label>
                <input
                  id="borrowDate"
                  name="borrowDate"
                  type="date"
                  value={form.borrowDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="student-form-group">
                <label htmlFor="expectedReturnDate">
                  Expected Return Date *
                </label>
                <input
                  id="expectedReturnDate"
                  name="expectedReturnDate"
                  type="date"
                  min={form.borrowDate}
                  value={form.expectedReturnDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="student-form-group student-form-full">
                <label htmlFor="purpose">Purpose of Borrowing *</label>
                <textarea
                  id="purpose"
                  name="purpose"
                  rows="4"
                  value={form.purpose}
                  onChange={handleChange}
                  placeholder="Explain why you need this equipment..."
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="student-submit-button"
              disabled={submitting}
            >
              <ClipboardList size={18} />
              {submitting
                ? "Submitting..."
                : "Submit Borrowing Request"}
            </button>
          </form>
        </section>

        <section
          className="student-panel"
          id="student-requests"
        >
          <div className="student-panel-heading">
            <div>
              <h2>My Borrowing Requests</h2>
              <p>Check the status of your submitted requests.</p>
            </div>
          </div>

          <form
            className="student-find-requests"
            onSubmit={findMyRequests}
          >
            <input
              type="text"
              value={studentIdSearch}
              onChange={(event) =>
                setStudentIdSearch(event.target.value)
              }
              placeholder="Enter your student ID"
              aria-label="Student ID to find requests"
            />

            <button type="submit">
              <Search size={17} />
              Find Requests
            </button>
          </form>

          {!activeStudentId ? (
            <p className="student-empty">
              Enter your student ID to view your requests.
            </p>
          ) : borrowings.length === 0 ? (
            <p className="student-empty">
              No borrowing requests found for student ID{" "}
              {activeStudentId}.
            </p>
          ) : (
            <div className="student-table-wrapper">
              <table className="student-request-table">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Quantity</th>
                    <th>Borrow Date</th>
                    <th>Expected Return</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {borrowings.map((borrowing) => (
                    <tr key={borrowing._id}>
                      <td>{getEquipmentName(borrowing)}</td>
                      <td>{borrowing.quantity}</td>
                      <td>
                        {borrowing.borrowDate
                          ? new Date(
                              borrowing.borrowDate
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        {borrowing.expectedReturnDate
                          ? new Date(
                              borrowing.expectedReturnDate
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        <span
                          className={`student-status ${getStatusClass(
                            borrowing.status
                          )}`}
                        >
                          {borrowing.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="student-footer">
          <p>
            © {new Date().getFullYear()} Schoolrow. School Equipment
            Borrowing System.
          </p>
        </footer>
      </main>
    </div>
  );
}
