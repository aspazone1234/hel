import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  LayoutDashboard, ScanLine, Headphones, ListTodo, Users, Hotel,
  ClipboardList, FileText, MessageSquare, Settings, LogOut, ChevronLeft, ChevronRight, Shield,
  Menu, X, UserCheck, Plane
} from "lucide-react";
import AdminDashboard from "../components/admin/AdminDashboard";
import PendingApproval from "../components/admin/PendingApproval";
import ExpectedGuestList from "../components/admin/ExpectedGuestList";
import ArrivedGuestList from "../components/admin/ArrivedGuestList";
import AdminRoomManagement from "../components/admin/AdminRoomManagement";
import ReferencePersonManager from "../components/admin/ReferencePersonManager";
import QRScanner from "../components/admin/QRScanner";
import HelpCentre from "../components/admin/HelpCentre";
import MessageCenter from "../components/admin/MessageCenter";
import TodoModule from "../components/admin/TodoModule";
import CustomFieldsManager from "../components/admin/CustomFieldsManager";

const API = process.env.REACT_APP_BACKEND_URL;

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/login`, { username, password });
      localStorage.setItem("admin_token", data.token);
      onLogin(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B1C3D] to-[#1a3a6b]" data-testid="admin-login">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <Shield className="mx-auto text-[#B8860B] mb-2" size={32} />
          <h1 className="text-xl font-bold text-[#0B1C3D]">Swamsevak Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Katha 2026 Operations</p>
        </div>
        {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded" data-testid="login-error">{error}</p>}
        <input data-testid="login-username" className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
          placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input data-testid="login-password" type="password" className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
          placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button data-testid="login-submit" type="submit" disabled={loading}
          className="w-full bg-[#0B1C3D] text-white py-3 rounded-lg font-medium hover:bg-[#163161] transition disabled:opacity-50">
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

function AdminShell({ user, onLogout }) {
  const [currentView, setCurrentView] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const isSuper = user?.role === "superadmin";

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    onLogout();
    navigate("/admin");
  };

  const navItems = [
    { id: "dashboard", label: "Command Centre", icon: LayoutDashboard },
    { id: "qr", label: "Attendance Marker", icon: ScanLine },
    { id: "help", label: "Help Centre", icon: Headphones, highlight: true },
    { id: "todos", label: "To-Do List", icon: ListTodo },
    "divider",
    ...(isSuper ? [{ id: "pending", label: "Pending Approval", icon: ClipboardList }] : []),
    { id: "expected", label: "Expected Guests", icon: UserCheck },
    { id: "arrived", label: "Arrived Guests", icon: Plane },
    { id: "rooms", label: "Room Management", icon: Hotel },
    { id: "references", label: "Reference Persons", icon: Users, superOnly: true },
    ...(isSuper ? [
      "divider",
      { id: "messages", label: "Message Center", icon: MessageSquare },
      { id: "customfields", label: "Custom Fields", icon: Settings },
      { id: "admins", label: "Swamsevak Mgmt", icon: Shield },
      { id: "audit", label: "Activity Log", icon: FileText },
    ] : [
      { id: "audit", label: "Activity Log", icon: FileText },
    ]),
  ];

  const handleNavClick = (id) => {
    setCurrentView(id);
    setMobileOpen(false);
  };

  const renderView = () => {
    switch (currentView) {
      case "dashboard": return <AdminDashboard user={user} />;
      case "pending": return isSuper ? <PendingApproval user={user} /> : <NoAccess />;
      case "expected": return <ExpectedGuestList user={user} />;
      case "arrived": return <ArrivedGuestList user={user} />;
      case "rooms": return <AdminRoomManagement user={user} />;
      case "references": return isSuper ? <ReferencePersonManager user={user} /> : <NoAccess />;
      case "qr": return <QRScanner user={user} />;
      case "help": return <HelpCentre user={user} />;
      case "messages": return isSuper ? <MessageCenter user={user} /> : <NoAccess />;
      case "todos": return <TodoModule user={user} />;
      case "customfields": return isSuper ? <CustomFieldsManager user={user} /> : <NoAccess />;
      case "admins": return isSuper ? <AdminManagement user={user} /> : <NoAccess />;
      case "audit": return <AuditLog user={user} />;
      default: return <AdminDashboard user={user} />;
    }
  };

  const sidebarContent = (
    <>
      <nav className="flex-1 overflow-y-auto py-2" data-testid="admin-nav">
        {!collapsed && !mobileOpen ? null : null}
        {(mobileOpen || !collapsed) && (
          <div className="mx-3 mb-2 p-2 bg-white/5 rounded-lg border border-white/10" data-testid="training-section">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Quick Guide</p>
            <p className="text-white/60 text-[11px] leading-tight">
              Scan QR or search by name in Attendance Marker. Use Help Centre for guest requests.
            </p>
          </div>
        )}
        {navItems.map((item, i) => {
          if (item === "divider") return <div key={`div-${i}`} className="my-2 border-t border-white/10" />;
          if (item.superOnly && !isSuper) return null;
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button key={item.id} onClick={() => handleNavClick(item.id)}
              data-testid={`nav-${item.id}`}
              title={collapsed && !mobileOpen ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                active ? "bg-white/15 text-[#B8860B] font-semibold" :
                item.highlight ? "text-yellow-300 hover:bg-white/10" :
                "text-white/80 hover:bg-white/10"
              }`}>
              <Icon size={18} className="shrink-0" />
              {(mobileOpen || !collapsed) && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        {(mobileOpen || !collapsed) && <p className="text-xs text-white/50 mb-2 truncate">{user?.display_name || user?.name}</p>}
        <button onClick={handleLogout} data-testid="logout-btn"
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 rounded transition">
          <LogOut size={16} /> {(mobileOpen || !collapsed) && "Logout"}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50" data-testid="admin-shell">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0B1C3D] text-white flex items-center justify-between px-4 py-3">
        <button onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-toggle"
          className="text-white p-1 rounded hover:bg-white/10">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <span className="font-bold text-sm">Swamsevak Portal</span>
        <div className="w-8" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar drawer */}
      <aside className={`md:hidden fixed top-12 left-0 bottom-0 z-30 bg-[#0B1C3D] text-white flex flex-col w-64 transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        data-testid="mobile-sidebar">
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex bg-[#0B1C3D] text-white flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-60"} shrink-0`} data-testid="admin-sidebar">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          {!collapsed && <span className="font-bold text-sm truncate">Swamsevak Portal</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="text-white/70 hover:text-white" data-testid="sidebar-toggle">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-h-screen md:pt-0 pt-12">
        {renderView()}
      </main>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="p-8 text-center" data-testid="no-access">
      <Shield className="mx-auto text-gray-300 mb-3" size={48} />
      <p className="text-gray-500 font-medium">Super Admin access required</p>
    </div>
  );
}

function AdminManagement({ user }) {
  const [admins, setAdmins] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", display_name: "", role: "admin", mobile: "" });
  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("admin_token")}` }), []);

  const fetchAdmins = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/admin/admins`, { headers: authHeaders() });
      setAdmins(data);
    } catch {}
  }, [authHeaders]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const createAdmin = async () => {
    try {
      await axios.post(`${API}/api/admin/admins`, form, { headers: authHeaders() });
      setShowCreate(false);
      setForm({ username: "", password: "", display_name: "", role: "admin", mobile: "" });
      fetchAdmins();
    } catch {}
  };

  const deleteAdmin = async (id) => {
    if (!window.confirm("Delete this Swamsevak?")) return;
    try {
      await axios.delete(`${API}/api/admin/admins/${id}`, { headers: authHeaders() });
      fetchAdmins();
    } catch {}
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="admin-management">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-[#0B1C3D]">Swamsevak Management</h1>
        <button onClick={() => setShowCreate(true)} className="bg-[#0B1C3D] text-white px-4 py-2 rounded-lg text-sm" data-testid="create-admin-btn">
          + Add Swamsevak
        </button>
      </div>
      <div className="space-y-2">
        {admins.map((a) => (
          <div key={a.id || a.username} className="bg-white rounded-lg p-4 border flex justify-between items-center" data-testid={`admin-${a.username}`}>
            <div>
              <p className="font-medium text-[#0B1C3D]">{a.display_name || a.username}</p>
              <p className="text-xs text-gray-500">{a.role} {a.mobile && `• ${a.mobile}`}</p>
            </div>
            {a.source === "custom" && (
              <button onClick={() => deleteAdmin(a.id)} className="text-red-500 text-sm hover:underline" data-testid={`delete-admin-${a.username}`}>Delete</button>
            )}
          </div>
        ))}
      </div>
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-3">
            <h2 className="font-bold text-[#0B1C3D]">Add New Swamsevak</h2>
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Username" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} />
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Display Name" value={form.display_name} onChange={(e) => setForm({...form, display_name: e.target.value})} />
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Mobile Number" value={form.mobile} onChange={(e) => setForm({...form, mobile: e.target.value})} />
            <div className="flex gap-2">
              <button onClick={createAdmin} className="bg-[#0B1C3D] text-white px-4 py-2 rounded text-sm flex-1">Create</button>
              <button onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded text-sm flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditLog({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const isSuper = user?.role === "superadmin";
  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("admin_token")}` }), []);

  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/admin/audit-logs`, { headers: authHeaders(), params: { per_page: 100 } });
      setLogs(data.data || []);
    } catch {}
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const clearLogs = async () => {
    if (!window.confirm("Clear all audit logs?")) return;
    try {
      await axios.delete(`${API}/api/admin/audit-logs`, { headers: authHeaders() });
      fetchLogs();
    } catch {}
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="audit-log">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-[#0B1C3D]">Activity Log</h1>
        {isSuper && <button onClick={clearLogs} className="text-red-500 text-sm hover:underline" data-testid="clear-logs-btn">Clear All</button>}
      </div>
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="space-y-2">
          {logs.map((l, i) => (
            <div key={i} className="bg-white rounded-lg p-3 border text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-[#0B1C3D]">{l.action}</span>
                <span className="text-xs text-gray-400">{l.performed_by}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{l.description} {l.target_id && `(${l.target_id})`}</p>
              <p className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</p>
            </div>
          ))}
          {logs.length === 0 && <p className="text-gray-400 text-center py-4">No activity logs</p>}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { setLoading(false); return; }
    axios.get(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setUser(data))
      .catch(() => localStorage.removeItem("admin_token"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  if (!user) return <LoginForm onLogin={setUser} />;
  return <AdminShell user={user} onLogout={() => setUser(null)} />;
}
