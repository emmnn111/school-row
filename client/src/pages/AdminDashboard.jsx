
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const API_URL = "http://localhost:5000/api";

const INITIAL_FORM = {
  name: "",
  assetCode: "",
  category: "",
  location: "",
  quantityTotal: 1,
  quantityAvailable: 1,
  condition: "Good",
  description: "",
};

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard" },
  { id: "equipment", label: "Equipment" },
  { id: "add", label: "Add Equipment" },
  { id: "borrowings", label: "Borrowing Requests" },
];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function getStatusClass(status) {
  const classes = {
    Pending: "status-pending",
    Approved: "status-approved",
    Borrowed: "status-borrowed",
    Returned: "status-returned",
    Rejected: "status-rejected",
  };

  return classes[status] || "status-default";
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [equipment, setEquipment] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });

  const token = localStorage.getItem("schoolrowToken");

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      const meResponse = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const meData = await meResponse.json();

      if (!meResponse.ok || meData.role !== "admin") {
        localStorage.removeItem("schoolrowToken");
        localStorage.removeItem("schoolrowRole");
        navigate("/", { replace: true });
        return;
      }

      const [equipmentResponse, borrowingResponse] = await Promise.all([
        fetch(`${API_URL}/equipment`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/borrowings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [equipmentData, borrowingData] = await Promise.all([
        equipmentResponse.json(),
        borrowingResponse.json(),
      ]);

      if (!equipmentResponse.ok) {
        throw new Error(
          equipmentData.message || "Could not load equipment."
        );
      }

      if (!borrowingResponse.ok) {
        throw new Error(
          borrowingData.message || "Could not load borrowing requests."
        );
      }

      setEquipment(
        Array.isArray(equipmentData)
          ? equipmentData
          : equipmentData.data || equipmentData.equipment || []
      );

      setBorrowings(
        Array.isArray(borrowingData)
          ? borrowingData
          : borrowingData.data || borrowingData.borrowings || []
      );
    } catch (err) {
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [navigate, token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  function logout() {
    localStorage.removeItem("schoolrowToken");
    localStorage.removeItem("schoolrowRole");
    navigate("/", { replace: true });
  }

  function selectTab(tab) {
    setActiveTab(tab);
    setSearch("");
    setError("");
    setNotice("");
  }

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: ["quantityTotal", "quantityAvailable"].includes(name)
        ? value === ""
          ? ""
          : Number(value)
        : value,
    }));
  }

  function resetForm() {
    setForm({ ...INITIAL_FORM });
  }

  async function addEquipment(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (
      !form.name.trim() ||
      !form.assetCode.trim() ||
      !form.category.trim() ||
      !form.location.trim()
    ) {
      setError("Please fill in all required equipment fields.");
      return;
    }

    if (
      !Number.isInteger(Number(form.quantityTotal)) ||
      !Number.isInteger(Number(form.quantityAvailable)) ||
      Number(form.quantityTotal) < 1 ||
      Number(form.quantityAvailable) < 0 ||
      Number(form.quantityAvailable) > Number(form.quantityTotal)
    ) {
      setError("Please enter valid equipment quantities.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/equipment`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          ...form,
          quantityTotal: Number(form.quantityTotal),
          quantityAvailable: Number(form.quantityAvailable),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add equipment.");
      }

      setNotice("Equipment added successfully.");
      resetForm();
      setActiveTab("equipment");
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Failed to add equipment.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEquipment(item) {
    const id = item._id || item.id;

    if (!id) {
      setError("Equipment ID is missing.");
      return;
    }

    if (!window.confirm(`Delete "${item.name}"?`)) return;

    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/equipment/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete equipment.");
      }

      setNotice("Equipment deleted successfully.");
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Failed to delete equipment.");
    }
  }

  async function changeBorrowingStatus(request, status) {
    const id = request._id || request.id;

    if (!id || saving) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_URL}/borrowings/${id}/status`,
        {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not update borrowing status."
        );
      }

      setSelectedRequest(null);
      setNotice(
        status === "Approved"
          ? "Borrowing request approved successfully."
          : "Borrowing request rejected."
      );

      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not update borrowing status.");
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = borrowings.filter(
    (item) => item.status === "Pending"
  ).length;

  const approvedCount = borrowings.filter(
    (item) => item.status === "Approved"
  ).length;

  const borrowedCount = borrowings.filter(
    (item) => item.status === "Borrowed"
  ).length;

  const filteredEquipment = equipment.filter((item) => {
    const text = [
      item.name,
      item.assetCode,
      item.category,
      item.location,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const filteredBorrowings = borrowings.filter((item) => {
    const text = [
      item.studentName,
      item.studentId,
      item.purpose,
      item.status,
      item.equipmentId?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(search.toLowerCase());
  });

  function detail(label, value) {
    return (
      <div className="detail-row" key={label}>
        <strong>{label}</strong>
        <span>{value || "Not provided"}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <main className="admin-loading">
        <div className="loading-spinner" />
        <p>Loading Schoolrow admin dashboard...</p>
      </main>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-brand">
          <div className="admin-brand-logo">S</div>
          <div>
            <h2>Schoolrow</h2>
            <small>Administrator Dashboard</small>
          </div>
        </div>

        <button
          type="button"
          className="button button-danger"
          onClick={logout}
        >
          Log out
        </button>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <p className="sidebar-label">MAIN MENU</p>

          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`nav-item ${
                activeTab === item.id ? "active" : ""
              }`}
              onClick={() => selectTab(item.id)}
            >
              <span className="nav-indicator" />
              {item.label}
              {item.id === "borrowings" && pendingCount > 0 && (
                <span className="nav-count">{pendingCount}</span>
              )}
            </button>
          ))}

          <div className="sidebar-bottom">
            <span className="admin-avatar">A</span>
            <div>
              <strong>Administrator</strong>
              <small>Schoolrow Admin</small>
            </div>
          </div>
        </aside>

        <main className="admin-content">
          <div className="page-heading">
            <div>
              <p className="page-eyebrow">SCHOOLROW MANAGEMENT</p>
              <h1>
                {
                  {
                    overview: "Dashboard Overview",
                    equipment: "Equipment Inventory",
                    add: "Add Equipment",
                    borrowings: "Borrowing Requests",
                  }[activeTab]
                }
              </h1>
              <p className="page-description">
                {
                  {
                    overview: "Monitor equipment and borrowing activity.",
                    equipment: "View and manage school equipment.",
                    add: "Add equipment to the school inventory.",
                    borrowings: "Review student equipment requests.",
                  }[activeTab]
                }
              </p>
            </div>

            <button
              type="button"
              className="button button-secondary refresh-button"
              onClick={loadDashboard}
            >
              ↻ Refresh
            </button>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <span>!</span>
              {error}
              <button
                type="button"
                className="alert-close"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                ×
              </button>
            </div>
          )}

          {notice && (
            <div className="alert alert-success" role="status">
              <span>✓</span>
              {notice}
              <button
                type="button"
                className="alert-close"
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}

          {activeTab === "overview" && (
            <>
              <div className="summary-grid">
                <section className="summary-card summary-teal">
                  <div className="summary-icon">▣</div>
                  <p>Equipment Types</p>
                  <h2>{equipment.length}</h2>
                  <small>Items in inventory</small>
                </section>

                <section className="summary-card summary-blue">
                  <div className="summary-icon">▤</div>
                  <p>Borrowing Requests</p>
                  <h2>{borrowings.length}</h2>
                  <small>Total requests</small>
                </section>

                <section className="summary-card summary-orange">
                  <div className="summary-icon">◷</div>
                  <p>Pending Requests</p>
                  <h2>{pendingCount}</h2>
                  <small>Awaiting your decision</small>
                </section>

                <section className="summary-card summary-green">
                  <div className="summary-icon">✓</div>
                  <p>Approved</p>
                  <h2>{approvedCount}</h2>
                  <small>Approved requests</small>
                </section>

                <section className="summary-card summary-purple">
                  <div className="summary-icon">↗</div>
                  <p>Currently Borrowed</p>
                  <h2>{borrowedCount}</h2>
                  <small>Active borrowings</small>
                </section>
              </div>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Recent Borrowing Requests</h3>
                    <p>Latest equipment requests from students.</p>
                  </div>

                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => selectTab("borrowings")}
                  >
                    View All Requests →
                  </button>
                </div>

                {borrowings.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">▤</span>
                    <h3>No requests yet</h3>
                    <p>Student borrowing requests will appear here.</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Equipment</th>
                          <th>Borrow Date</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {borrowings.slice(0, 5).map((item) => (
                          <tr key={item._id || item.id}>
                            <td>
                              <strong>{item.studentName || "Student"}</strong>
                              <small className="table-subtext">
                                {item.studentId || "—"}
                              </small>
                            </td>
                            <td>{item.equipmentId?.name || "Equipment"}</td>
                            <td>{formatDate(item.borrowDate)}</td>
                            <td>
                              <span
                                className={`status-badge ${getStatusClass(
                                  item.status
                                )}`}
                              >
                                {item.status || "Unknown"}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="button button-small button-outline"
                                onClick={() => {
                                  setSelectedRequest(item);
                                  setError("");
                                  setNotice("");
                                }}
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === "equipment" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Equipment Inventory</h3>
                  <p>
                    {equipment.length} equipment record
                    {equipment.length === 1 ? "" : "s"} in the system.
                  </p>
                </div>

                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => selectTab("add")}
                >
                  + Add Equipment
                </button>
              </div>

              <div className="search-box">
                <span>⌕</span>
                <input
                  aria-label="Search equipment"
                  placeholder="Search name, asset code, category, or location..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Equipment</th>
                      <th>Asset Code</th>
                      <th>Category</th>
                      <th>Availability</th>
                      <th>Condition</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEquipment.map((item) => (
                      <tr key={item._id || item.id}>
                        <td>
                          <strong>{item.name}</strong>
                          <small className="table-subtext">
                            {item.location || "No location"}
                          </small>
                        </td>
                        <td>{item.assetCode}</td>
                        <td>{item.category}</td>
                        <td>
                          <strong>{item.quantityAvailable ?? "—"}</strong>
                          <span className="quantity-total">
                            {" "}
                            / {item.quantityTotal ?? "—"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`condition-badge ${
                              item.condition === "Good"
                                ? "condition-good"
                                : item.condition === "Damaged"
                                  ? "condition-damaged"
                                  : "condition-other"
                            }`}
                          >
                            {item.condition || "Unknown"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="button button-small button-danger-light"
                            onClick={() => deleteEquipment(item)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredEquipment.length === 0 && (
                      <tr>
                        <td colSpan="6">
                          <div className="empty-state">
                            <h3>No equipment found</h3>
                            <p>Try a different search or add equipment.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === "add" && (
            <section className="panel form-panel">
              <div className="panel-heading">
                <div>
                  <h3>Equipment Information</h3>
                  <p>Complete the form to register a new item.</p>
                </div>
              </div>

              <form onSubmit={addEquipment} className="equipment-form">
                <div className="form-grid">
                  {[
                    ["name", "Equipment Name"],
                    ["assetCode", "Asset Code"],
                    ["category", "Category"],
                    ["location", "Location"],
                  ].map(([name, label]) => (
                    <label className="form-field" key={name}>
                      {label} <span className="required-mark">*</span>
                      <input
                        name={name}
                        value={form[name]}
                        onChange={updateForm}
                        placeholder={`Enter ${label.toLowerCase()}`}
                        required
                      />
                    </label>
                  ))}

                  <label className="form-field">
                    Total Quantity <span className="required-mark">*</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      name="quantityTotal"
                      value={form.quantityTotal}
                      onChange={updateForm}
                      required
                    />
                  </label>

                  <label className="form-field">
                    Available Quantity{" "}
                    <span className="required-mark">*</span>
                    <input
                      type="number"
                      min="0"
                      max={form.quantityTotal || undefined}
                      step="1"
                      name="quantityAvailable"
                      value={form.quantityAvailable}
                      onChange={updateForm}
                      required
                    />
                  </label>

                  <label className="form-field">
                    Condition
                    <select
                      name="condition"
                      value={form.condition}
                      onChange={updateForm}
                    >
                      <option value="Good">Good</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Under Maintenance">
                        Under Maintenance
                      </option>
                    </select>
                  </label>
                </div>

                <label className="form-field description-field">
                  Description
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={updateForm}
                    placeholder="Enter additional equipment details..."
                    rows="4"
                  />
                </label>

                <div className="form-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    Clear Form
                  </button>

                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Equipment →"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {activeTab === "borrowings" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>All Borrowing Requests</h3>
                  <p>Review and manage student requests.</p>
                </div>

                <span className="request-total">
                  {filteredBorrowings.length} request
                  {filteredBorrowings.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="search-box">
                <span>⌕</span>
                <input
                  aria-label="Search borrowing requests"
                  placeholder="Search student, ID, purpose, equipment, or status..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Equipment</th>
                      <th>Quantity</th>
                      <th>Borrow Date</th>
                      <th>Return Date</th>
                      <th>Status</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBorrowings.map((item) => (
                      <tr key={item._id || item.id}>
                        <td>
                          <strong>{item.studentName || "Student"}</strong>
                          <small className="table-subtext">
                            {item.studentId || "—"}
                          </small>
                        </td>
                        <td>{item.equipmentId?.name || "Equipment"}</td>
                        <td>{item.quantity ?? "—"}</td>
                        <td>{formatDate(item.borrowDate)}</td>
                        <td>{formatDate(item.expectedReturnDate)}</td>
                        <td>
                          <span
                            className={`status-badge ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {item.status || "Unknown"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="button button-small button-outline"
                            onClick={() => {
                              setSelectedRequest(item);
                              setError("");
                              setNotice("");
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredBorrowings.length === 0 && (
                      <tr>
                        <td colSpan="7">
                          <div className="empty-state">
                            <h3>No requests found</h3>
                            <p>Try changing your search keywords.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>

      <footer className="admin-footer">
        Schoolrow Equipment Borrowing System
        <span>Administrator Portal</span>
      </footer>

      {selectedRequest && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!saving) setSelectedRequest(null);
          }}
        >
          <div
            className="request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <p className="page-eyebrow">REQUEST REVIEW</p>
                <h2 id="request-modal-title">Borrowing Request Details</h2>
                <p>Review the information before making a decision.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                aria-label="Close details"
                disabled={saving}
                onClick={() => setSelectedRequest(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-status">
              <span
                className={`status-badge ${getStatusClass(
                  selectedRequest.status
                )}`}
              >
                {selectedRequest.status || "Unknown"}
              </span>
            </div>

            <section className="detail-section">
              <h3>Student Information</h3>
              {detail("Student Name", selectedRequest.studentName)}
              {detail("Student ID", selectedRequest.studentId)}
              {detail("Course / Section", selectedRequest.courseSection)}
            </section>

            <section className="detail-section">
              <h3>Equipment Information</h3>
              {detail(
                "Equipment",
                selectedRequest.equipmentId?.name || "Equipment"
              )}
              {detail(
                "Asset Code",
                selectedRequest.equipmentId?.assetCode
              )}
              {detail("Quantity", selectedRequest.quantity)}
            </section>

            <section className="detail-section">
              <h3>Borrowing Information</h3>
              {detail("Borrow Date", formatDate(selectedRequest.borrowDate))}
              {detail(
                "Expected Return",
                formatDate(selectedRequest.expectedReturnDate)
              )}
              {detail("Purpose", selectedRequest.purpose)}
            </section>

            {selectedRequest.status === "Pending" && (
              <div className="modal-note">
                Approving this request will update its status in the system.
              </div>
            )}

            <div className="modal-actions">
              {selectedRequest.status === "Pending" && (
                <>
                  <button
                    type="button"
                    className="button button-approve"
                    disabled={saving}
                    onClick={() =>
                      changeBorrowingStatus(selectedRequest, "Approved")
                    }
                  >
                    {saving ? "Processing..." : "✓ Confirm Approval"}
                  </button>

                  <button
                    type="button"
                    className="button button-reject"
                    disabled={saving}
                    onClick={() =>
                      changeBorrowingStatus(selectedRequest, "Rejected")
                    }
                  >
                    Reject Request
                  </button>
                </>
              )}

              <button
                type="button"
                className="button button-secondary"
                disabled={saving}
                onClick={() => setSelectedRequest(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
