
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  LayoutDashboard,
  Plus,
  LogOut,
  RefreshCw,
  ClipboardList,
  CheckCircle,
  Clock,
  Search,
  Trash2,
  Pencil,
  Bot,
  Send,
  UserPlus,
} from "lucide-react";
import "./AdminDashboard.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

const INITIAL_ADMIN_FORM = {
  username: "",
  fullName: "",
  email: "",
  password: "",
};

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard" },
  { id: "equipment", label: "Equipment" },
  { id: "add", label: "Add Equipment" },
  { id: "borrowings", label: "Borrowing Requests" },
  { id: "ai", label: "AI Assistant" },
  { id: "admins", label: "Admin Management" },
];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString();
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
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });

  const [adminForm, setAdminForm] = useState({
    ...INITIAL_ADMIN_FORM,
  });
  const [adminSaving, setAdminSaving] = useState(false);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [adminRequests, setAdminRequests] = useState([]);
  const [adminRequestsLoading, setAdminRequestsLoading] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState("");

  const [aiMessage, setAiMessage] = useState("");
  const [aiMessages, setAiMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello, Admin! I'm your Schoolrow AI assistant. Ask me about equipment management and borrowing procedures.",
    },
  ]);

  const suggestedQuestions = [
    "How do I borrow equipment?",
    "How do I return borrowed equipment?",
    "Which equipment is available?",
    "How do I search for equipment?",
    "What does pending mean?",
  ];

  const [aiLoading, setAiLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const token = localStorage.getItem("schoolrowToken");

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Load and verify dashboard data.
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      const meResponse = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const meData = await meResponse.json();
      setIsMainAdmin(Boolean(meData.isMainAdmin));

      if (!meResponse.ok || meData.role !== "admin") {
        localStorage.removeItem("schoolrowToken");
        localStorage.removeItem("schoolrowRole");
        navigate("/", { replace: true });
        return;
      }

      const [equipmentResponse, borrowingResponse] =
        await Promise.all([
          fetch(`${API_URL}/equipment`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_URL}/borrowings`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
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
          borrowingData.message ||
            "Could not load borrowing requests."
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

  // Log out.
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

  // Create an administrator account.
  async function createAdmin(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (
      !adminForm.username.trim() ||
      !adminForm.fullName.trim() ||
      !adminForm.email.trim() ||
      !adminForm.password
    ) {
      setError("Please complete all administrator fields.");
      return;
    }

    if (adminForm.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setAdminSaving(true);

    try {
      const response = await fetch(`${API_URL}/auth/admins`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: adminForm.username.trim(),
          fullName: adminForm.fullName.trim(),
          email: adminForm.email.trim().toLowerCase(),
          password: adminForm.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create administrator account."
        );
      }

      setNotice(
        `Administrator "${data.user?.username || adminForm.username}" created successfully.`
      );

      setAdminForm({ ...INITIAL_ADMIN_FORM });
    } catch (err) {
      setError(
        err.message || "Unable to create administrator account."
      );
    } finally {
      setAdminSaving(false);
    }
  }

  
// Load administrator accounts and approval requests.
// Only the Main Admin should call this function.
const loadAdminRequests = useCallback(async () => {
  if (!token || !isMainAdmin) return;

  setAdminRequestsLoading(true);
  setError("");

  try {
    const response = await fetch(`${API_URL}/auth/admins/requests`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to load administrator requests."
      );
    }

    setAdminRequests(
      Array.isArray(data)
        ? data
        : data.data || data.admins || []
    );
  } catch (err) {
    setError(
      err.message || "Unable to load administrator requests."
    );
  } finally {
    setAdminRequestsLoading(false);
  }
}, [token, isMainAdmin]);

useEffect(() => {
  if (isMainAdmin) {
    loadAdminRequests();
  }
}, [isMainAdmin, loadAdminRequests]);

async function updateAdminApproval(adminId, status) {
  if (!isMainAdmin) {
    setError("Only the Main Admin can review administrator requests.");
    return;
  }

  if (!adminId || !["Approved", "Rejected"].includes(status)) {
    setError("Invalid administrator request or status.");
    return;
  }

  setAdminActionLoading(adminId);
  setError("");
  setNotice("");

  try {
    const response = await fetch(
      `${API_URL}/auth/admins/${adminId}/approval`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to update administrator approval."
      );
    }

    setNotice(
      status === "Approved"
        ? "Administrator request approved."
        : "Administrator request rejected."
    );

    await loadAdminRequests();
  } catch (err) {
    setError(
      err.message || "Unable to update administrator approval."
    );
  } finally {
    setAdminActionLoading("");
  }
}
  // Send a message to the Schoolrow AI backend.
  async function sendAiMessage(event) {
    event.preventDefault();

    const message = aiMessage.trim();

    if (!message || aiLoading) return;

    const history = aiMessages
      .filter((item) =>
        ["user", "assistant"].includes(item.role)
      )
      .slice(-8)
      .map((item) => ({
        role: item.role,
        content: item.content,
      }));

    setAiMessages((previous) => [
      ...previous,
      { role: "user", content: message },
    ]);

    setAiMessage("");
    setAiLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      120000
    );

    try {
      const response = await fetch(`${API_URL}/ai`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "The AI assistant could not respond."
        );
      }

      setAiMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            data.reply || "The AI returned an empty response.",
        },
      ]);
    } catch (err) {
      const errorMessage =
        err.name === "AbortError"
          ? "The AI took too long to respond. Check your AI provider configuration."
          : err.message || "Unable to contact the AI assistant.";

      setAiMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: `Sorry, ${errorMessage}`,
        },
      ]);
    } finally {
      clearTimeout(timeoutId);
      setAiLoading(false);
    }
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

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG, WEBP, or GIF image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function resetForm() {
    setForm({ ...INITIAL_FORM });
    setEditingEquipment(null);
    setImageFile(null);
    setImagePreview("");

    const fileInput = document.getElementById("equipment-image");

    if (fileInput) fileInput.value = "";
  }

  function startEditingEquipment(item) {
    setEditingEquipment(item);

    setForm({
      name: item.name || "",
      assetCode: item.assetCode || "",
      category: item.category || "",
      location: item.location || "",
      quantityTotal: Number(item.quantityTotal ?? 1),
      quantityAvailable: Number(item.quantityAvailable ?? 1),
      condition: item.condition || "Good",
      description: item.description || "",
    });

    setImageFile(null);
    setImagePreview(item.image || "");
    setError("");
    setNotice("");
    setActiveTab("add");
  }

  async function updateEquipment(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const id = editingEquipment?._id || editingEquipment?.id;

    if (!id) {
      setError(
        "Equipment ID is missing. Please select the equipment again."
      );
      return;
    }

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
      const formData = new FormData();

      formData.append("name", form.name.trim());
      formData.append("assetCode", form.assetCode.trim());
      formData.append("category", form.category.trim());
      formData.append("location", form.location.trim());
      formData.append(
        "quantityTotal",
        String(Number(form.quantityTotal))
      );
      formData.append(
        "quantityAvailable",
        String(Number(form.quantityAvailable))
      );
      formData.append("condition", form.condition);
      formData.append("description", form.description || "");

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await fetch(`${API_URL}/equipment/${id}`, {
        method: "PUT",
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update equipment.");
      }

      setNotice("Equipment updated successfully.");
      resetForm();
      setActiveTab("equipment");
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Failed to update equipment.");
    } finally {
      setSaving(false);
    }
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
      const formData = new FormData();

      formData.append("name", form.name.trim());
      formData.append("assetCode", form.assetCode.trim());
      formData.append("category", form.category.trim());
      formData.append("location", form.location.trim());
      formData.append(
        "quantityTotal",
        String(Number(form.quantityTotal))
      );
      formData.append(
        "quantityAvailable",
        String(Number(form.quantityAvailable))
      );
      formData.append("condition", form.condition);
      formData.append("description", form.description || "");

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await fetch(`${API_URL}/equipment`, {
        method: "POST",
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
        body: formData,
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
      item.equipment?.name,
      item.equipmentName,
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
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <Package size={26} />
          </div>

          <div>
            <h2>Schoolrow</h2>
            <p>Admin Panel</p>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS
  .filter((item) => item.id !== "admins" || isMainAdmin)
  .map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-nav-item ${
                activeTab === item.id ? "active" : ""
              }`}
              onClick={() => selectTab(item.id)}
            >
              {item.id === "overview" && (
                <LayoutDashboard size={19} />
              )}
              {item.id === "equipment" && <Package size={19} />}
              {item.id === "add" && <Plus size={19} />}
              {item.id === "borrowings" && (
                <ClipboardList size={19} />
              )}
              {item.id === "ai" && <Bot size={19} />}
              {item.id === "admins" && <UserPlus size={19} />}

              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <p>School Equipment</p>

          <button
            type="button"
            className="admin-logout-button"
            onClick={logout}
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1>
              {activeTab === "ai" && "AI Assistant"}
              {activeTab === "overview" && "Dashboard"}
              {activeTab === "equipment" && "Equipment Management"}
              {activeTab === "add" &&
                (editingEquipment ? "Edit Equipment" : "Add Equipment")}
              {activeTab === "borrowings" && "Borrowing Requests"}
              {activeTab === "admins" && "Admin Management"}
            </h1>

            <p>
              {activeTab === "ai"
                ? "Your AI assistant for Schoolrow administration."
                : activeTab === "admins"
                  ? "Create additional administrator accounts for Schoolrow."
                  : "Manage school equipment and borrowing requests."}
            </p>
          </div>

          <button
            type="button"
            className="admin-refresh-button"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="admin-alert admin-alert-error" role="alert">
            {error}
            <button type="button" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        {notice && (
          <div className="admin-alert admin-alert-success" role="status">
            {notice}
            <button type="button" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}

        {/* Dashboard Overview */}
        {activeTab === "overview" && (
          <section className="admin-content">
            <div className="admin-welcome">
              <div>
                <span className="admin-eyebrow">ADMINISTRATION</span>
                <h2>Welcome to Schoolrow</h2>
                <p>
                  Monitor your equipment inventory and student borrowing
                  activity from one place.
                </p>
              </div>

              <Package size={56} />
            </div>

            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-icon">
                  <Package size={22} />
                </div>
                <p>Equipment Types</p>
                <h3>{equipment.length}</h3>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-icon">
                  <CheckCircle size={22} />
                </div>
                <p>Available Quantity</p>
                <h3>
                  {equipment.reduce(
                    (total, item) =>
                      total + Number(item.quantityAvailable || 0),
                    0
                  )}
                </h3>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-icon">
                  <ClipboardList size={22} />
                </div>
                <p>Total Requests</p>
                <h3>{borrowings.length}</h3>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-icon">
                  <Clock size={22} />
                </div>
                <p>Pending Requests</p>
                <h3>{pendingCount}</h3>
              </div>
            </div>

            <div className="admin-section-card">
              <div className="admin-section-heading">
                <div>
                  <h2>Recent Equipment</h2>
                  <p>Your latest inventory records.</p>
                </div>

                <button
                  type="button"
                  className="admin-text-button"
                  onClick={() => selectTab("equipment")}
                >
                  View all
                </button>
              </div>

              {equipment.length === 0 ? (
                <div className="admin-empty-state">
                  <Package size={38} />
                  <h3>No equipment found</h3>
                  <p>Add your first equipment item to get started.</p>

                  <button
                    type="button"
                    className="admin-primary-button"
                    onClick={() => selectTab("add")}
                  >
                    <Plus size={18} />
                    Add Equipment
                  </button>
                </div>
              ) : (
                <div className="admin-equipment-grid">
                  {equipment.slice(0, 4).map((item) => (
                    <article
                      className="admin-equipment-card"
                      key={item._id || item.id || item.assetCode}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="admin-equipment-image"
                        />
                      ) : (
                        <div className="admin-equipment-image-placeholder">
                          <Package size={36} />
                          <span>No image</span>
                        </div>
                      )}

                      <div className="admin-equipment-card-body">
                        <span className="admin-category-tag">
                          {item.category}
                        </span>
                        <h3>{item.name}</h3>
                        <p>{item.assetCode}</p>
                        <p>
                          Available: {item.quantityAvailable ?? 0}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-section-card">
              <div className="admin-section-heading">
                <div>
                  <h2>Borrowing Overview</h2>
                  <p>Current request statuses.</p>
                </div>

                <button
                  type="button"
                  className="admin-text-button"
                  onClick={() => selectTab("borrowings")}
                >
                  Manage requests
                </button>
              </div>

              <div className="admin-status-summary">
                <div>
                  <span className="status-dot status-dot-pending" />
                  <span>Pending</span>
                  <strong>{pendingCount}</strong>
                </div>

                <div>
                  <span className="status-dot status-dot-approved" />
                  <span>Approved</span>
                  <strong>{approvedCount}</strong>
                </div>

                <div>
                  <span className="status-dot status-dot-borrowed" />
                  <span>Borrowed</span>
                  <strong>{borrowedCount}</strong>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Add or Edit Equipment */}
        {activeTab === "add" && (
          <section className="admin-content">
            <div className="admin-section-card">
              <div className="admin-section-heading">
                <div>
                  <h2>
                    {editingEquipment
                      ? "Edit Equipment"
                      : "Equipment Information"}
                  </h2>
                  <p>
                    {editingEquipment
                      ? "Update the selected equipment details and save your changes."
                      : "Enter the equipment details and optionally select a photo from your computer."}
                  </p>
                </div>
              </div>

              <form
                className="admin-equipment-form"
                onSubmit={
                  editingEquipment ? updateEquipment : addEquipment
                }
              >
                <div className="admin-form-grid">
                  <div className="admin-form-field">
                    <label htmlFor="equipment-name">
                      Equipment Name *
                    </label>
                    <input
                      id="equipment-name"
                      name="name"
                      value={form.name}
                      onChange={updateForm}
                      placeholder="e.g. Laptop"
                      required
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="equipment-code">Asset Code *</label>
                    <input
                      id="equipment-code"
                      name="assetCode"
                      value={form.assetCode}
                      onChange={updateForm}
                      placeholder="e.g. EQ-001"
                      required
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="equipment-category">Category *</label>
                    <input
                      id="equipment-category"
                      name="category"
                      value={form.category}
                      onChange={updateForm}
                      placeholder="e.g. Computer"
                      required
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="equipment-location">Location *</label>
                    <input
                      id="equipment-location"
                      name="location"
                      value={form.location}
                      onChange={updateForm}
                      placeholder="e.g. Faculty Office"
                      required
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="equipment-total">
                      Total Quantity *
                    </label>
                    <input
                      id="equipment-total"
                      name="quantityTotal"
                      type="number"
                      min="1"
                      step="1"
                      value={form.quantityTotal}
                      onChange={updateForm}
                      required
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="equipment-available">
                      Available Quantity *
                    </label>
                    <input
                      id="equipment-available"
                      name="quantityAvailable"
                      type="number"
                      min="0"
                      step="1"
                      value={form.quantityAvailable}
                      onChange={updateForm}
                      required
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="equipment-condition">Condition</label>
                    <select
                      id="equipment-condition"
                      name="condition"
                      value={form.condition}
                      onChange={updateForm}
                    >
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Damaged">Damaged</option>
                    </select>
                  </div>

                  <div className="admin-form-field image-upload-field">
                    <label htmlFor="equipment-image">
                      Equipment Image
                    </label>

                    <input
                      id="equipment-image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageChange}
                    />

                    <p className="image-upload-help">
                      JPG, PNG, WEBP, or GIF. Maximum size: 5 MB.
                    </p>

                    {imagePreview && (
                      <div className="image-preview-container">
                        <img
                          className="image-preview"
                          src={imagePreview}
                          alt="Selected equipment preview"
                        />

                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview("");

                            const fileInput =
                              document.getElementById("equipment-image");

                            if (fileInput) fileInput.value = "";
                          }}
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="admin-form-field admin-form-field-full">
                    <label htmlFor="equipment-description">
                      Description
                    </label>
                    <textarea
                      id="equipment-description"
                      name="description"
                      value={form.description}
                      onChange={updateForm}
                      placeholder="Enter equipment details..."
                      rows="4"
                    />
                  </div>
                </div>

                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => {
                      resetForm();
                      if (editingEquipment) setActiveTab("equipment");
                    }}
                    disabled={saving}
                  >
                    {editingEquipment ? "Cancel Edit" : "Clear Form"}
                  </button>

                  <button
                    type="submit"
                    className="admin-primary-button"
                    disabled={saving}
                  >
                    {saving
                      ? editingEquipment
                        ? "Updating..."
                        : "Saving..."
                      : editingEquipment
                        ? "Save Changes"
                        : "Save Equipment"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* Equipment Inventory */}
        {activeTab === "equipment" && (
          <section className="admin-content">
            <div className="admin-section-card">
              <div className="admin-section-heading">
                <div>
                  <h2>Equipment Inventory</h2>
                  <p>View, search, and manage school equipment.</p>
                </div>

                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={() => selectTab("add")}
                >
                  <Plus size={18} />
                  Add Equipment
                </button>
              </div>

              <div className="admin-search">
                <Search size={18} />
                <input
                  type="search"
                  placeholder="Search name, asset code, category, or location..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              {filteredEquipment.length === 0 ? (
                <div className="admin-empty-state">
                  <Package size={38} />
                  <h3>No equipment found</h3>
                  <p>Try another search or add new equipment.</p>
                </div>
              ) : (
                <div className="admin-equipment-grid">
                  {filteredEquipment.map((item) => (
                    <article
                      className="admin-equipment-card"
                      key={item._id || item.id || item.assetCode}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="admin-equipment-image"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="admin-equipment-image-placeholder">
                          <Package size={36} />
                          <span>No image available</span>
                        </div>
                      )}

                      <div className="admin-equipment-card-body">
                        <span className="admin-category-tag">
                          {item.category}
                        </span>

                        <h3>{item.name}</h3>
                        <p>Asset Code: {item.assetCode}</p>
                        <p>
                          Location: {item.location || "Not specified"}
                        </p>
                        <p>Condition: {item.condition || "Good"}</p>
                        <p>
                          Available: {item.quantityAvailable ?? 0} /{" "}
                          {item.quantityTotal ?? 0}
                        </p>

                        <div className="admin-action-buttons">
                          <button
                            type="button"
                            className="admin-secondary-button"
                            onClick={() => startEditingEquipment(item)}
                          >
                            <Pencil size={16} />
                            Edit
                          </button>

                          <button
                            type="button"
                            className="admin-danger-button"
                            onClick={() => deleteEquipment(item)}
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Borrowing Requests */}
        {activeTab === "borrowings" && (
          <section className="admin-content">
            <div className="admin-section-card">
              <div className="admin-section-heading">
                <div>
                  <h2>Borrowing Requests</h2>
                  <p>Review and manage student equipment requests.</p>
                </div>
              </div>

              <div className="admin-search">
                <Search size={18} />
                <input
                  type="search"
                  placeholder="Search student, equipment, purpose, or status..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              {filteredBorrowings.length === 0 ? (
                <div className="admin-empty-state">
                  <ClipboardList size={38} />
                  <h3>No borrowing requests found</h3>
                  <p>Requests will appear here when available.</p>
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Equipment</th>
                        <th>Quantity</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredBorrowings.map((request) => {
                        const requestId = request._id || request.id;
                        const student =
                          request.studentName ||
                          request.student?.name ||
                          "Student";
                        const equipmentName =
                          request.equipmentId?.name ||
                          request.equipment?.name ||
                          request.equipmentName ||
                          "Equipment";
                        const quantity = request.quantity ?? 1;
                        const status = request.status || "Pending";

                        return (
                          <tr key={requestId}>
                            <td>
                              <strong>{student}</strong>
                              <span className="admin-table-subtext">
                                {request.studentId || ""}
                              </span>
                            </td>

                            <td>{equipmentName}</td>
                            <td>{quantity}</td>
                            <td>
                              {formatDate(
                                request.createdAt || request.borrowDate
                              )}
                            </td>

                            <td>
                              <span
                                className={`admin-status-badge ${getStatusClass(
                                  status
                                )}`}
                              >
                                {status}
                              </span>
                            </td>

                            <td>
                              <div className="admin-action-buttons">
                                <button
                                  type="button"
                                  className="admin-secondary-button"
                                  onClick={() =>
                                    setSelectedRequest(request)
                                  }
                                >
                                  Details
                                </button>

                                {status === "Pending" && (
                                  <>
                                    <button
                                      type="button"
                                      className="admin-primary-button"
                                      disabled={saving}
                                      onClick={() =>
                                        changeBorrowingStatus(
                                          request,
                                          "Approved"
                                        )
                                      }
                                    >
                                      Approve
                                    </button>

                                    <button
                                      type="button"
                                      className="admin-danger-button"
                                      disabled={saving}
                                      onClick={() =>
                                        changeBorrowingStatus(
                                          request,
                                          "Rejected"
                                        )
                                      }
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* AI Assistant */}
        {activeTab === "ai" && (
          <section className="admin-content">
            <div className="admin-section-card admin-ai-card">
              <div className="admin-section-heading">
                <div>
                  <h2>
                    <Bot size={22} />
                    Schoolrow AI Assistant
                  </h2>
                  <p>
                    Ask questions about equipment management and borrowing
                    procedures.
                  </p>
                </div>
              </div>

              <div
                className="admin-ai-messages"
                aria-live="polite"
                aria-label="AI conversation"
              >
                {aiMessages.map((item, index) => (
                  <div
                    key={`${item.role}-${index}`}
                    className={`admin-ai-message ${
                      item.role === "user"
                        ? "admin-ai-user"
                        : "admin-ai-bot"
                    }`}
                  >
                    <strong>
                      {item.role === "user" ? "You" : "Schoolrow AI"}
                    </strong>
                    <p>{item.content}</p>
                  </div>
                ))}

                {aiLoading && (
                  <div className="admin-ai-message admin-ai-bot">
                    <strong>Schoolrow AI</strong>
                    <p>Thinking... This may take a little while.</p>
                  </div>
                )}
              </div>

              <div className="admin-ai-suggestions">
                <h3>Suggested Questions</h3>
                <p>Choose a question to fill the message box.</p>

                <div className="admin-ai-suggestions-list">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={question}
                      type="button"
                      className="admin-ai-suggestion"
                      disabled={aiLoading}
                      onClick={() => setAiMessage(question)}
                    >
                      <span className="admin-ai-suggestion-number">
                        {index + 1}
                      </span>
                      <span>{question}</span>
                    </button>
                  ))}
                </div>
              </div>

              <form
                className="admin-ai-form"
                onSubmit={sendAiMessage}
              >
                <input
                  type="text"
                  value={aiMessage}
                  onChange={(event) => setAiMessage(event.target.value)}
                  placeholder="Ask your question..."
                  aria-label="Ask the AI assistant"
                  maxLength={2000}
                  disabled={aiLoading}
                />

                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={aiLoading || !aiMessage.trim()}
                >
                  <Send size={17} />
                  {aiLoading ? "Waiting..." : "Send"}
                </button>
              </form>

              <p className="admin-ai-note">
                AI responses can be inaccurate. Verify important
                administrative information before acting on it.
              </p>
            </div>
          </section>
        )}

        {/* Admin Management */}
{activeTab === "admins" && (
  <section className="dashboard-section">
    <div className="section-header">
      <div>
        <h2>Admin Management</h2>
        <p>Manage administrator accounts and approval requests.</p>
      </div>
    </div>

    {/* Create Admin Account — Main Admin only */}
    {isMainAdmin && (
      <div className="dashboard-card">
        <h3>Create Admin Account</h3>
        <p>
          Create an administrator account that can manage equipment
          and borrowing requests.
        </p>

        <form onSubmit={createAdmin} className="admin-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="adminUsername">Username</label>
              <input
                id="adminUsername"
                type="text"
                value={adminForm.username}
                onChange={(e) =>
                  setAdminForm({
                    ...adminForm,
                    username: e.target.value,
                  })
                }
                placeholder="Enter username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="adminFullName">Full Name</label>
              <input
                id="adminFullName"
                type="text"
                value={adminForm.fullName}
                onChange={(e) =>
                  setAdminForm({
                    ...adminForm,
                    fullName: e.target.value,
                  })
                }
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="adminEmail">Email Address</label>
              <input
                id="adminEmail"
                type="email"
                value={adminForm.email}
                onChange={(e) =>
                  setAdminForm({
                    ...adminForm,
                    email: e.target.value,
                  })
                }
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="adminPassword">Password</label>
              <input
                id="adminPassword"
                type="password"
                value={adminForm.password}
                onChange={(e) =>
                  setAdminForm({
                    ...adminForm,
                    password: e.target.value,
                  })
                }
                placeholder="Enter password"
                minLength={8}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={adminSaving}
          >
            {adminSaving ? "Creating..." : "Create Admin"}
          </button>
        </form>
      </div>
    )}

    {/* Admin Approval Requests */}
    {isMainAdmin && (
      <div className="dashboard-card">
        <div className="section-header">
          <div>
            <h3>Admin Approval Requests</h3>
            <p>
              Review requests from users who want administrator access.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={loadAdminRequests}
            disabled={adminRequestsLoading}
          >
            {adminRequestsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {adminRequestsLoading ? (
          <p>Loading admin requests...</p>
        ) : adminRequests.length === 0 ? (
          <div className="empty-state">
            <p>No admin requests found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Date Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {adminRequests.map((admin) => (
                  <tr key={admin._id}>
                    <td>{admin.username}</td>
                    <td>{admin.fullName}</td>
                    <td>{admin.email}</td>

                    <td>
                      <span
                        className={`status-badge ${
                          admin.status?.toLowerCase() || "pending"
                        }`}
                      >
                        {admin.status || "Pending"}
                      </span>
                    </td>

                    <td>
                      {admin.createdAt
                        ? new Date(admin.createdAt).toLocaleDateString()
                        : "—"}
                    </td>

                    <td>
                      {admin.status === "Pending" ? (
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="approve-button"
                            onClick={() =>
                              updateAdminApproval(admin._id, "Approved")
                            }
                            disabled={adminActionLoading === admin._id}
                          >
                            {adminActionLoading === admin._id
                              ? "Processing..."
                              : "Approve"}
                          </button>

                          <button
                            type="button"
                            className="reject-button"
                            onClick={() =>
                              updateAdminApproval(admin._id, "Rejected")
                            }
                            disabled={adminActionLoading === admin._id}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span>Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}

    {!isMainAdmin && (
      <div className="dashboard-card">
        <h3>Administrator Access</h3>
        <p>
          You can manage equipment and borrowing requests. Only the
          Main Admin can create administrator accounts or review
          administrator approval requests.
        </p>
      </div>
    )}
  </section>
)}

        {/* Borrowing Request Details Modal */}
        {selectedRequest && (
          <div
            className="admin-modal-backdrop"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedRequest(null);
              }
            }}
          >
            <section
              className="admin-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="request-modal-title"
            >
              <div className="admin-modal-header">
                <div>
                  <h2 id="request-modal-title">
                    Borrowing Request Details
                  </h2>
                  <p>Review the submitted request information.</p>
                </div>

                <button
                  type="button"
                  className="admin-modal-close"
                  aria-label="Close details"
                  onClick={() => setSelectedRequest(null)}
                >
                  ×
                </button>
              </div>

              <div className="admin-modal-content">
                {detail(
                  "Student",
                  selectedRequest.studentName ||
                    selectedRequest.student?.name
                )}

                {detail(
                  "Student ID",
                  selectedRequest.studentId ||
                    selectedRequest.student?.studentId
                )}

                {detail(
                  "Equipment",
                  selectedRequest.equipmentId?.name ||
                    selectedRequest.equipment?.name ||
                    selectedRequest.equipmentName
                )}

                {detail("Quantity", selectedRequest.quantity ?? 1)}
                {detail("Purpose", selectedRequest.purpose)}
                {detail("Status", selectedRequest.status)}

                {detail(
                  "Request Date",
                  formatDate(selectedRequest.createdAt)
                )}

                {detail(
                  "Return Date",
                  formatDate(selectedRequest.returnDate)
                )}
              </div>

              {selectedRequest.status === "Pending" && (
                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="admin-danger-button"
                    disabled={saving}
                    onClick={() =>
                      changeBorrowingStatus(
                        selectedRequest,
                        "Rejected"
                      )
                    }
                  >
                    Reject Request
                  </button>

                  <button
                    type="button"
                    className="admin-primary-button"
                    disabled={saving}
                    onClick={() =>
                      changeBorrowingStatus(
                        selectedRequest,
                        "Approved"
                      )
                    }
                  >
                    Approve Request
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        <footer className="admin-footer">
          <p>© 2026 Schoolrow. School Equipment Borrowing System.</p>
        </footer>
      </main>
    </div>
  );
}
