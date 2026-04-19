import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  LayoutDashboard, ScanLine, Headphones, ListTodo, Users, Hotel,
  ClipboardList, FileText, MessageSquare, Settings, LogOut, ChevronLeft, ChevronRight, Shield,
  UserCheck, Plane, ChevronsRight, Bell
} from "lucide-react";
import AdminDashboard from "../components/admin/AdminDashboard";
import PendingApproval from "../components/admin/PendingApproval";
import ExpectedGuestList from "../components/admin/ExpectedGuestList";
import ArrivedGuestList from "../components/admin/ArrivedGuestList";
import AdminRoomManagement from "../components/admin/AdminRoomManagement";
import ReferencePersonManager from "../components/admin/ReferencePersonManager";
import QRScanner from "../components/admin/QRScanner";
import HelpCentre from "../components/admin/HelpCentre";// MessageCenter removed - replaced by Notifications tab
import TodoModule from "../components/admin/TodoModule";
import CustomFieldsManager from "../components/admin/CustomFieldsManager";
import AdminAuditLog from "../components/admin/AdminAuditLog";
import AdminManagementView from "../components/admin/AdminManagement";
import NotificationManagement from "../components/admin/NotificationManagement";
import ViewOnly from "../components/admin/ViewOnly";

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
          <h1 className="text-xl font-bold text-[#0B1C3D]">Swayamsevak Portal</h1>
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
  // Mobile: collapsed (icon-only) by default; Desktop: expanded by default
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const navigate = useNavigate();
  const isSuper = user?.role === "superadmin";
  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("admin_token")}` }), []);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    onLogout();
    navigate("/admin");
  };

  const navItems = [
    { id: "dashboard", label: "Command Centre", icon: LayoutDashboard },
    { id: "qr", label: "Attendance Marker", icon: ScanLine },
    { id: "help", label: "Help Centre", icon: Headphones, highlight: true },
    { id: "todos", label: "My Duties", icon: ListTodo },
    "divider",
    ...[{ id: "pending", label: "Pending Approval", icon: ClipboardList }],
    { id: "expected", label: "Expected Guests", icon: UserCheck },
    { id: "arrived", label: "Arrived Guests", icon: Plane },
    { id: "rooms", label: "Room Management", icon: Hotel },
    { id: "references", label: "Reference Persons", icon: Users },
    "divider",
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "customfields", label: "Custom Fields", icon: Settings },
    ...(isSuper ? [
      { id: "admins", label: "Swayamsevak Mgmt", icon: Shield },
    ] : []),
    { id: "audit", label: "Activity Log", icon: FileText },
  ];

  const handleNavClick = (id) => {
    setCurrentView(id);
    // Auto-collapse on mobile after nav
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setCollapsed(true);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case "dashboard": return <AdminDashboard user={user} />;
      case "pending": return <PendingApproval user={user} />;
      case "expected": return <ExpectedGuestList user={user} />;
      case "arrived": return <ArrivedGuestList user={user} />;
      case "rooms": return <AdminRoomManagement user={user} />;
      case "references": return <ViewOnly active={!isSuper}><ReferencePersonManager user={user} /></ViewOnly>;
      case "qr": return <QRScanner user={user} />;
      case "help": return <HelpCentre user={user} />;
      case "messages": return null; // removed
      case "notifications": return <ViewOnly active={!isSuper}><NotificationManagement user={user} /></ViewOnly>;
      case "todos": return <TodoModule user={user} />;
      case "customfields": return <ViewOnly active={!isSuper}><CustomFieldsManager user={user} /></ViewOnly>;
      case "admins": return isSuper ? <AdminManagementView user={user} authHeaders={authHeaders} /> : <NoAccess />;
      case "audit": return <AdminAuditLog user={user} authHeaders={authHeaders} />;
      default: return <AdminDashboard user={user} />;
    }
  };

  const sidebarContent = (
    <>
      <nav className="flex-1 overflow-y-auto py-2" data-testid="admin-nav">
        {!collapsed && (
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
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                active ? "bg-white/15 text-[#B8860B] font-semibold" :
                item.highlight ? "text-yellow-300 hover:bg-white/10" :
                "text-white/80 hover:bg-white/10"
              } ${collapsed ? "justify-center px-2" : ""}`}>
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        {!collapsed && <p className="text-xs text-white/50 mb-2 truncate">{user?.display_name || user?.name}</p>}
        <button onClick={handleLogout} data-testid="logout-btn"
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 rounded transition ${collapsed ? "justify-center" : ""}`}>
          <LogOut size={16} /> {!collapsed && "Logout"}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50" data-testid="admin-shell">
      {/* Unified sidebar — always visible; icon-only on mobile by default */}
      <aside
        className={`bg-[#0B1C3D] text-white flex flex-col transition-all duration-300 shrink-0 ${collapsed ? "w-14" : "w-60"}`}
        style={{ minHeight: "100vh", position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh", overflowY: "auto" }}
        data-testid="admin-sidebar">
        {/* Sidebar header with expand/collapse toggle */}
        <div
          onClick={() => { if (collapsed) setCollapsed(false); }}
          className={`border-b border-white/10 flex items-center ${collapsed ? "justify-center py-4 px-2 cursor-pointer active:bg-white/10 hover:bg-white/5" : "px-4 py-4 justify-between"}`}
          style={collapsed ? { minHeight: 48, touchAction: "manipulation" } : undefined}
          data-testid="sidebar-header"
        >
          {!collapsed && <span className="font-bold text-sm truncate">Swayamsevak Portal</span>}
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }} className="text-white/70 hover:text-white p-1" data-testid="sidebar-toggle" title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            {/* Blinking expand cue — shown only when collapsed */}
            {collapsed && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3 pointer-events-none" data-testid="expand-cue">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B8860B] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D4AF37]"></span>
              </span>
            )}
          </div>
        </div>
        {/* Expand hint when collapsed — entire area is tappable */}
        {collapsed && (
          <div onClick={() => setCollapsed(false)} className="flex flex-col items-center py-3 px-1 border-b border-white/10 cursor-pointer hover:bg-white/5 active:bg-white/10" style={{ minHeight: 40, touchAction: "manipulation" }}>
            <ChevronsRight size={14} className="text-[#B8860B] animate-pulse" />
          </div>
        )}
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-h-screen">
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
