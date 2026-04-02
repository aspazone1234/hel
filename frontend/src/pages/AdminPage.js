import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft, Eye, EyeOff, LogOut, LayoutDashboard, Users,
  FileText, DoorOpen, MessageSquare, ClipboardList, Menu, X, Shield, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";

import AdminDashboardView from "@/components/admin/AdminDashboard";
import AdminGuestList from "@/components/admin/AdminGuestList";
import AdminMasterControl from "@/components/admin/AdminMasterControl";
import AdminRoomManagement from "@/components/admin/AdminRoomManagement";
import AdminBulkMessaging from "@/components/admin/AdminBulkMessaging";
import AdminAuditLog from "@/components/admin/AdminAuditLog";
import AdminManagement from "@/components/admin/AdminManagement";
import { GuestDetailDialog, ManualEntryDialog } from "@/components/admin/AdminDialogs";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getToken() { return localStorage.getItem("admin_token"); }
function setTokenStore(t) { localStorage.setItem("admin_token", t); }
function clearToken() { localStorage.removeItem("admin_token"); }

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ─── Login ─── */
function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/auth/login`, { username, password });
      setTokenStore(data.token);
      onLogin(data);
    } catch (err) {
      setError(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 sm:p-10 border border-[#D4AF37]/20 max-w-md w-full">
        <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1 mb-6" data-testid="admin-back-home-login">
          <ChevronLeft size={16} /> Back to Home
        </Link>
        <h2 className="text-3xl font-bold text-[#0B1C3D] mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Shrimad Bhagavat 2026 Management Portal</h2>
        <p className="text-[#0B1C3D]/50 text-sm mb-8">Sign in to manage the event</p>
        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg" data-testid="admin-login-error">{error}</p>}
        <form onSubmit={handleSubmit} data-testid="admin-login-form" className="space-y-5">
          <div>
            <Label className="text-[#0B1C3D]/70 text-sm">Username</Label>
            <Input data-testid="admin-username-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" className="mt-1.5 bg-white border-[#D4AF37]/20" required />
          </div>
          <div>
            <Label className="text-[#0B1C3D]/70 text-sm">Password</Label>
            <div className="relative mt-1.5">
              <Input data-testid="admin-password-input" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="bg-white border-[#D4AF37]/20 pr-10" required />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0B1C3D]/40">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90 py-3" data-testid="admin-login-btn">
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ─── Nav Config ─── */
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "guestlist", label: "Final Guest List", icon: Users },
  { id: "formapproval", label: "Website Form Approval", icon: FileText },
  { id: "roommanagement", label: "Room Management", icon: DoorOpen },
  { id: "messaging", label: "Bulk Guest Messaging", icon: MessageSquare },
  { id: "auditlog", label: "Audit Log", icon: ClipboardList },
  { id: "adminmanagement", label: "Admin Management", icon: Shield },
];

/* ─── Admin Shell ─── */
function AdminShell({ user, onLogout }) {
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailReg, setDetailReg] = useState(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const navItems = NAV_ITEMS.filter(item => {
    if (item.id === "adminmanagement") return user.role === "superadmin";
    return true;
  });

  useEffect(() => { document.title = "Shrimad Bhagavat 2026 Management Portal"; }, []);

  const handleNavigate = (view) => { setActiveView(view); setSidebarOpen(false); };
  const handleSaved = () => { setRefreshKey(k => k + 1); };
  const handleLogout = () => { clearToken(); onLogout(); };

  return (
    <div className="min-h-screen bg-[#F8F1E5] flex" data-testid="admin-dashboard">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0B1C3D] text-white flex flex-col shrink-0 transform transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <Link to="/" className="text-white/40 hover:text-white/70 text-xs flex items-center gap-1 mb-3" data-testid="admin-back-home">
                <ChevronLeft size={12} /> Back to Site
              </Link>
              <h2 className="text-base font-bold tracking-wide leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Shrimad Bhagavat<br />2026 Management Portal
              </h2>
              <p className="text-white/40 text-xs mt-2">{user.name || user.username}</p>
              {user.role === "superadmin" && <span className="text-[9px] bg-[#D4AF37] text-[#0B1C3D] px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">Super Admin</span>}
            </div>
            <button className="lg:hidden text-white/60 hover:text-white" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeView === item.id
                  ? "bg-[#D4AF37] text-[#0B1C3D] font-semibold shadow-lg shadow-[#D4AF37]/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
              data-testid={`nav-${item.id}`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Button onClick={handleLogout} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 hover:text-white" data-testid="admin-logout-btn">
            <LogOut size={16} className="mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="lg:hidden bg-white border-b border-[#D4AF37]/20 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="text-[#0B1C3D]/70 relative" data-testid="mobile-menu-btn">
              <Menu size={24} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#D4AF37] rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#D4AF37] rounded-full" />
            </button>
            <span className="text-[10px] text-[#D4AF37] font-semibold animate-pulse flex items-center gap-1">
              <Sparkles size={10} /> Tap for all settings
            </span>
          </div>
          <h1 className="text-base font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {navItems.find(n => n.id === activeView)?.label || "Dashboard"}
          </h1>
          <div className="w-6" />
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {activeView === "dashboard" && <AdminDashboardView key={`d-${refreshKey}`} user={user} authHeaders={() => authHeaders()} onNavigate={handleNavigate} />}
            {activeView === "guestlist" && <AdminGuestList key={`g-${refreshKey}`} user={user} authHeaders={() => authHeaders()} onViewDetail={setDetailReg} onAddManual={() => setShowManualEntry(true)} />}
            {activeView === "formapproval" && <AdminMasterControl key={`f-${refreshKey}`} user={user} authHeaders={() => authHeaders()} />}
            {activeView === "roommanagement" && <AdminRoomManagement key={`r-${refreshKey}`} user={user} authHeaders={() => authHeaders()} />}
            {activeView === "messaging" && <AdminBulkMessaging key={`m-${refreshKey}`} user={user} authHeaders={() => authHeaders()} />}
            {activeView === "auditlog" && <AdminAuditLog key={`a-${refreshKey}`} user={user} authHeaders={() => authHeaders()} />}
            {activeView === "adminmanagement" && <AdminManagement key={`am-${refreshKey}`} user={user} authHeaders={() => authHeaders()} />}
          </div>
        </main>
      </div>

      {/* Shared Dialogs */}
      <GuestDetailDialog registration={detailReg} open={!!detailReg} onClose={() => setDetailReg(null)} />
      <ManualEntryDialog open={showManualEntry} onClose={() => setShowManualEntry(false)} authHeaders={() => authHeaders()} onSaved={handleSaved} />
    </div>
  );
}

/* ─── Main Export ─── */
export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    document.title = "Shrimad Bhagavat 2026 Management Portal";
    const token = getToken();
    if (!token) { setChecking(false); return; }
    axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUser(res.data))
      .catch(() => { clearToken(); setUser(null); })
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center"><div className="text-[#D4AF37]">Checking authentication...</div></div>;
  if (!user) return <AdminLogin onLogin={setUser} />;
  return <AdminShell user={user} onLogout={() => setUser(null)} />;
}
