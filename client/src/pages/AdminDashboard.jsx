
import "../App.css";
import {
  BookOpen, LayoutDashboard, Package, ClipboardList, Search,
  RefreshCw, Plus, Pencil, Trash2, X, Save, HandHelping
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

const emptyForm = {
  name: "",
  assetCode: "",
  category: "",
  description: "",
  quantityTotal: "1",
  quantityAvailable: "1",
  condition: "Good",
  location: "Sports Equipment Room"
};

function localDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyBorrowForm() {
  const today = localDate();
  return {
    studentName: "",
    studentId: "",
    courseSection: "",
    equipmentId: "",
    quantity: "1",
    borrowDate: today,
    expectedReturnDate: today,
    purpose: ""
  };
}

function App() {
  const [equipment, setEquipment] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const [showBorrowForm, setShowBorrowForm] = useState(false);
  const [borrowData, setBorrowData] = useState(emptyBorrowForm);
  const [borrowSaving, setBorrowSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(null);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [equipmentResponse, borrowingResponse] = await Promise.all([
        fetch(`${API_URL}/equipment`),
        fetch(`${API_URL}/borrowings`)
      ]);

      if (!equipmentResponse.ok || !borrowingResponse.ok) {
        throw new Error("Server request failed.");
      }

      const equipmentResult = await equipmentResponse.json();
      const borrowingResult = await borrowingResponse.json();

      setEquipment(
        Array.isArray(equipmentResult)
          ? equipmentResult
          : equipmentResult.data || equipmentResult.equipment || []
      );

      setBorrowings(
        Array.isArray(borrowingResult)
          ? borrowingResult
          : borrowingResult.data || borrowingResult.borrowings || []
      );
    } catch (err) {
      setError(
        "Cannot connect to the server. Make sure MongoDB and the backend are running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // EQUIPMENT FUNCTIONS

  function openAddForm() {
    setEditingId(null);
    setFormData({ ...emptyForm });
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item._id);
    setFormData({
      name: item.name || "",
      assetCode: item.assetCode || "",
      category: item.category || "",
      description: item.description || "",
      quantityTotal: String(item.quantityTotal ?? 0),
      quantityAvailable: String(item.quantityAvailable ?? 0),
      condition: item.condition || "Good",
      location: item.location || ""
    });
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData(previous => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const total = Number(formData.quantityTotal);
    const available = Number(formData.quantityAvailable);

    if (
      !formData.name.trim() ||
      !formData.assetCode.trim() ||
      !formData.category.trim()
    ) {
      setError("Name, asset code, and category are required.");
      return;
    }

    if (
      !Number.isInteger(total) ||
      !Number.isInteger(available) ||
      total < 0 ||
      available < 0 ||
      available > total
    ) {
      setError("Enter valid quantities. Available quantity cannot exceed total quantity.");
      return;
    }

    const payload = {
      ...formData,
      name: formData.name.trim(),
      assetCode: formData.assetCode.trim(),
      category: formData.category.trim(),
      description: formData.description.trim(),
      location: formData.location.trim(),
      quantityTotal: total,
      quantityAvailable: available
    };

    setSaving(true);

    try {
      const response = await fetch(
        editingId
          ? `${API_URL}/equipment/${editingId}`
          : `${API_URL}/equipment`,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save equipment.");
      }

      const message = editingId
        ? "Equipment updated successfully."
        : "Equipment added successfully.";

      setShowForm(false);
      setEditingId(null);
      setNotice(message);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save equipment.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Delete "${item.name}" (${item.assetCode})?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_URL}/equipment/${item._id}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete equipment.");
      }

      setNotice(`${item.name} was deleted successfully.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to delete equipment.");
    }
  }

  // BORROWING FUNCTIONS

  function openBorrowForm() {
    setBorrowData(emptyBorrowForm());
    setError("");
    setNotice("");
    setShowBorrowForm(true);
  }

  function handleBorrowInputChange(event) {
    const { name, value } = event.target;
    setBorrowData(previous => ({ ...previous, [name]: value }));
  }

  async function handleBorrowSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (
      !borrowData.studentName.trim() ||
      !borrowData.studentId.trim() ||
      !borrowData.courseSection.trim() ||
      !borrowData.equipmentId ||
      !borrowData.purpose.trim()
    ) {
      setError("Please complete all borrowing form fields.");
      return;
    }

    const quantity = Number(borrowData.quantity);
    const selectedEquipment = equipment.find(
      item => item._id === borrowData.equipmentId
    );

    if (!selectedEquipment) {
      setError("Please select valid equipment.");
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > Number(selectedEquipment.quantityAvailable)
    ) {
      setError(
        `Enter a quantity between 1 and ${selectedEquipment.quantityAvailable}.`
      );
      return;
    }

    if (
      !borrowData.borrowDate ||
      !borrowData.expectedReturnDate ||
      borrowData.expectedReturnDate < borrowData.borrowDate
    ) {
      setError("The expected return date must be on or after the borrow date.");
      return;
    }

    setBorrowSaving(true);

    try {
      const response = await fetch(`${API_URL}/borrowings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...borrowData,
          studentName: borrowData.studentName.trim(),
          studentId: borrowData.studentId.trim(),
          courseSection: borrowData.courseSection.trim(),
          purpose: borrowData.purpose.trim(),
          quantity
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to submit request.");
      }

      setShowBorrowForm(false);
      setBorrowData(emptyBorrowForm());
      setNotice("Borrowing request submitted! Status: Pending.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to submit borrowing request.");
    } finally {
      setBorrowSaving(false);
    }
  }

  async function updateBorrowingStatus(record, status) {
    const messages = {
      Approved: "Approve this request and reserve the equipment quantity?",
      Rejected: "Reject this borrowing request?",
      Borrowed: "Confirm that the equipment has been handed to the student?",
      Returned: "Confirm that the equipment has been returned?"
    };

    if (!window.confirm(messages[status] || `Change status to ${status}?`)) {
      return;
    }

    setError("");
    setNotice("");
    setStatusUpdating(record._id);

    try {
      const response = await fetch(
        `${API_URL}/borrowings/${record._id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update request.");
      }

      setNotice(result.message || `Request updated to ${status}.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to update borrowing status.");
    } finally {
      setStatusUpdating(null);
    }
  }

  const filteredEquipment = equipment.filter(item =>
    `${item.name || ""} ${item.assetCode || ""} ${item.category || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const availableQuantity = equipment.reduce(
    (total, item) => total + Number(item.quantityAvailable || 0),
    0
  );

  const activeBorrowings = borrowings.filter(item =>
    ["pending", "approved", "borrowed"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><BookOpen size={25} /></div>
          <div>
            <h2>Schoolrow</h2>
            <p>Equipment Borrowing</p>
          </div>
        </div>

        <p className="menu-label">MAIN MENU</p>
        <nav className="navigation">
          <a href="#dashboard" className="nav-item active">
            <LayoutDashboard size={19} /> Dashboard
          </a>
          <a href="#equipment" className="nav-item">
            <Package size={19} /> Equipment
          </a>
          <a href="#borrowings" className="nav-item">
            <ClipboardList size={19} /> Borrowing Records
          </a>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" /> Schoolrow System
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">SCHOOL EQUIPMENT MANAGEMENT</p>
            <h1>Dashboard</h1>
            <p className="welcome-text">
              Overview of your school equipment and borrowing records.
            </p>
          </div>
          <button
            type="button"
            className="refresh-button"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={17} /> Refresh
          </button>
        </header>

        {error && <div className="error-message">{error}</div>}
        {notice && <div className="success-message">{notice}</div>}

        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-icon purple"><Package size={22} /></div>
            <p>Total Equipment Types</p>
            <h2>{equipment.length}</h2>
            <span>Registered equipment items</span>
          </article>
          <article className="stat-card">
            <div className="stat-icon green"><BookOpen size={22} /></div>
            <p>Available Quantity</p>
            <h2>{availableQuantity}</h2>
            <span>Units available to borrow</span>
          </article>
          <article className="stat-card">
            <div className="stat-icon orange"><ClipboardList size={22} /></div>
            <p>Total Borrowing Records</p>
            <h2>{borrowings.length}</h2>
            <span>All recorded requests</span>
          </article>
          <article className="stat-card">
            <div className="stat-icon blue"><RefreshCw size={22} /></div>
            <p>Active Borrowings</p>
            <h2>{activeBorrowings}</h2>
            <span>Pending, approved, or borrowed</span>
          </article>
        </section>

        <section className="content-card" id="equipment">
          <div className="section-heading">
            <div>
              <h2>Equipment Inventory</h2>
              <p>View and manage school equipment.</p>
            </div>
            <div className="inventory-controls">
              <label className="search-box">
                <Search size={18} />
                <input
                  type="search"
                  placeholder="Search equipment..."
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
              </label>
              <button className="add-button" type="button" onClick={openAddForm}>
                <Plus size={18} /> Add Equipment
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Equipment</th><th>Asset Code</th><th>Category</th>
                  <th>Available</th><th>Condition</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="empty-state">Loading equipment...</td></tr>
                ) : filteredEquipment.length === 0 ? (
                  <tr><td colSpan="6" className="empty-state">No equipment found.</td></tr>
                ) : filteredEquipment.map(item => (
                  <tr key={item._id}>
                    <td className="equipment-name">{item.name}</td>
                    <td>{item.assetCode}</td>
                    <td>{item.category}</td>
                    <td>{item.quantityAvailable} / {item.quantityTotal}</td>
                    <td>
                      <span className={`condition-badge ${String(item.condition || "Good").toLowerCase()}`}>
                        {item.condition || "Good"}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="edit-button" type="button" onClick={() => openEditForm(item)}>
                          <Pencil size={16} /> Edit
                        </button>
                        <button className="delete-button" type="button" onClick={() => handleDelete(item)}>
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="content-card" id="borrowings">
          <div className="section-heading">
            <div>
              <h2>Borrowing Records</h2>
              <p>Submit requests and manage equipment loans.</p>
            </div>
            <button
              className="add-button"
              type="button"
              onClick={openBorrowForm}
              disabled={equipment.every(item => item.quantityAvailable < 1 || item.condition === "Damaged")}
            >
              <HandHelping size={18} /> Borrow Equipment
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student</th><th>Student ID</th><th>Equipment</th>
                  <th>Quantity</th><th>Borrow Date</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="empty-state">Loading borrowing records...</td></tr>
                ) : borrowings.length === 0 ? (
                  <tr><td colSpan="7" className="empty-state">No borrowing records yet.</td></tr>
                ) : borrowings.map(record => {
                  const equipmentName =
                    record.equipmentId && typeof record.equipmentId === "object"
                      ? record.equipmentId.name
                      : equipment.find(item => item._id === record.equipmentId)?.name;

                  const status = record.status || "Pending";
                  const busy = statusUpdating === record._id;

                  return (
                    <tr key={record._id}>
                      <td className="equipment-name">{record.studentName || "Unknown student"}</td>
                      <td>{record.studentId || "—"}</td>
                      <td>{equipmentName || "Equipment unavailable"}</td>
                      <td>{record.quantity ?? 1}</td>
                      <td>{record.borrowDate ? new Date(record.borrowDate).toLocaleDateString() : "—"}</td>
                      <td>
                        <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {status === "Pending" && (
                            <>
                              <button className="edit-button" type="button" disabled={busy} onClick={() => updateBorrowingStatus(record, "Approved")}>Approve</button>
                              <button className="delete-button" type="button" disabled={busy} onClick={() => updateBorrowingStatus(record, "Rejected")}>Reject</button>
                            </>
                          )}
                          {status === "Approved" && (
                            <>
                              <button className="edit-button" type="button" disabled={busy} onClick={() => updateBorrowingStatus(record, "Borrowed")}>Mark Borrowed</button>
                              <button className="delete-button" type="button" disabled={busy} onClick={() => updateBorrowingStatus(record, "Rejected")}>Reject</button>
                            </>
                          )}
                          {status === "Borrowed" && (
                            <button className="add-button" type="button" disabled={busy} onClick={() => updateBorrowingStatus(record, "Returned")}>Mark Returned</button>
                          )}
                          {busy && <span>Updating...</span>}
                          {["Returned", "Rejected"].includes(status) && <span>Completed</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="page-footer">Schoolrow · School Equipment Borrowing System</footer>
      </main>

      {showForm && (
        <div className="modal-overlay">
          <section className="equipment-modal" role="dialog" aria-modal="true" aria-labelledby="equipment-form-title">
            <div className="modal-heading">
              <div>
                <h2 id="equipment-form-title">{editingId ? "Edit Equipment" : "Add Equipment"}</h2>
                <p>Enter the equipment details below.</p>
              </div>
              <button className="close-button" type="button" onClick={() => !saving && setShowForm(false)} disabled={saving}><X size={21} /></button>
            </div>

            <form className="equipment-form" onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              <div className="form-grid">
                <label>Equipment Name *<input name="name" value={formData.name} onChange={handleInputChange} required /></label>
                <label>Asset Code *<input name="assetCode" value={formData.assetCode} onChange={handleInputChange} required /></label>
                <label>Category *<input name="category" value={formData.category} onChange={handleInputChange} required /></label>
                <label>Condition
                  <select name="condition" value={formData.condition} onChange={handleInputChange}>
                    <option>Good</option><option>Fair</option><option>Damaged</option>
                  </select>
                </label>
                <label>Total Quantity *<input type="number" name="quantityTotal" min="0" step="1" value={formData.quantityTotal} onChange={handleInputChange} required /></label>
                <label>Available Quantity *<input type="number" name="quantityAvailable" min="0" step="1" value={formData.quantityAvailable} onChange={handleInputChange} required /></label>
                <label className="full-width">Storage Location<input name="location" value={formData.location} onChange={handleInputChange} /></label>
                <label className="full-width">Description<textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" /></label>
              </div>
              <div className="modal-actions">
                <button className="cancel-button" type="button" onClick={() => !saving && setShowForm(false)} disabled={saving}>Cancel</button>
                <button className="add-button" type="submit" disabled={saving}><Save size={17} />{saving ? "Saving..." : editingId ? "Save Changes" : "Add Equipment"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showBorrowForm && (
        <div className="modal-overlay">
          <section className="equipment-modal" role="dialog" aria-modal="true" aria-labelledby="borrow-form-title">
            <div className="modal-heading">
              <div>
                <h2 id="borrow-form-title">Borrow Equipment</h2>
                <p>Submit a request for school equipment.</p>
              </div>
              <button className="close-button" type="button" disabled={borrowSaving} onClick={() => setShowBorrowForm(false)}><X size={21} /></button>
            </div>

            <form className="equipment-form" onSubmit={handleBorrowSubmit}>
              {error && <div className="error-message">{error}</div>}
              <div className="form-grid">
                <label>Student Name *
                  <input name="studentName" value={borrowData.studentName} onChange={handleBorrowInputChange} required />
                </label>
                <label>Student ID *
                  <input name="studentId" value={borrowData.studentId} onChange={handleBorrowInputChange} required />
                </label>
                <label className="full-width">Course / Section *
                  <input name="courseSection" value={borrowData.courseSection} onChange={handleBorrowInputChange} placeholder="e.g. BSIT 2A" required />
                </label>
                <label className="full-width">Equipment *
                  <select name="equipmentId" value={borrowData.equipmentId} onChange={handleBorrowInputChange} required>
                    <option value="">Select equipment</option>
                    {equipment.filter(item => item.quantityAvailable > 0 && item.condition !== "Damaged").map(item => (
                      <option key={item._id} value={item._id}>
                        {item.name} ({item.assetCode}) — {item.quantityAvailable} available
                      </option>
                    ))}
                  </select>
                </label>
                <label>Quantity *
                  <input type="number" name="quantity" min="1" step="1" max={equipment.find(item => item._id === borrowData.equipmentId)?.quantityAvailable || 1} value={borrowData.quantity} onChange={handleBorrowInputChange} required />
                </label>
                <label>Borrow Date *
                  <input type="date" name="borrowDate" value={borrowData.borrowDate} onChange={handleBorrowInputChange} required />
                </label>
                <label className="full-width">Expected Return Date *
                  <input type="date" name="expectedReturnDate" min={borrowData.borrowDate} value={borrowData.expectedReturnDate} onChange={handleBorrowInputChange} required />
                </label>
                <label className="full-width">Purpose *
                  <textarea name="purpose" value={borrowData.purpose} onChange={handleBorrowInputChange} placeholder="Explain why you need this equipment..." rows="3" required />
                </label>
              </div>
              <p className="form-help">Your request will be saved as Pending until it is reviewed.</p>
              <div className="modal-actions">
                <button className="cancel-button" type="button" onClick={() => !borrowSaving && setShowBorrowForm(false)} disabled={borrowSaving}>Cancel</button>
                <button className="add-button" type="submit" disabled={borrowSaving}>{borrowSaving ? "Submitting..." : "Submit Request"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
