import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Download, Users, Home, Utensils, Car, LogOut, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
      onLogin(data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 sm:p-10 border border-[#D4AF37]/20 max-w-md w-full sacred-border">
        <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1 mb-6">
          <ChevronLeft size={16} /> Back to Home
        </Link>
        <h2 className="text-3xl font-bold text-[#0B1C3D] mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Admin Login</h2>
        <p className="text-[#0B1C3D]/50 text-sm mb-8">Sign in to manage registrations</p>
        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg" data-testid="admin-login-error">{error}</p>}
        <form onSubmit={handleSubmit} data-testid="admin-login-form" className="space-y-5">
          <div>
            <Label className="text-[#0B1C3D]/70 text-sm">Email</Label>
            <Input data-testid="admin-email-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" className="mt-1.5 bg-white border-[#D4AF37]/20" required />
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

function SummaryCard({ icon: Icon, label, value, color = "#D4AF37" }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#D4AF37]/20 card-glow">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={20} style={{ color }} />
        </div>
        <span className="text-[#0B1C3D]/50 text-sm">{label}</span>
      </div>
      <p className="text-3xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{value}</p>
    </div>
  );
}

function AdminDashboard({ user, onLogout }) {
  const [registrations, setRegistrations] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Admin Dashboard - Katha Mahotsav 2026";
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [regsRes, sumRes] = await Promise.all([
        axios.get(`${API}/admin/registrations`, { withCredentials: true }),
        axios.get(`${API}/admin/summary`, { withCredentials: true }),
      ]);
      setRegistrations(regsRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API}/admin/export-csv`, { withCredentials: true, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "registrations.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch { /* ignore */ }
    onLogout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center">
        <div className="text-[#D4AF37] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F1E5] py-8 px-4" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1 mb-2">
              <ChevronLeft size={16} /> Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Admin Dashboard
            </h1>
            <p className="text-[#0B1C3D]/50 text-sm">Welcome, {user.name || user.email}</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleExportCSV} variant="outline" className="border-[#D4AF37]/30 text-[#0B1C3D] hover:bg-[#D4AF37]/10" data-testid="admin-export-csv-btn">
              <Download size={16} className="mr-1" /> Export CSV
            </Button>
            <Button onClick={handleLogout} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" data-testid="admin-logout-btn">
              <LogOut size={16} className="mr-1" /> Logout
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-testid="admin-summary">
          <SummaryCard icon={Users} label="Total Registrations" value={summary.total_registrations || 0} />
          <SummaryCard icon={Users} label="Total Attendees" value={(summary.total_adults || 0) + (summary.total_children || 0) + (summary.total_seniors || 0)} color="#E67E22" />
          <SummaryCard icon={Home} label="Rooms Needed" value={summary.total_rooms || 0} color="#F1948A" />
          <SummaryCard icon={Car} label="Pickup Needed" value={summary.pickup_needed || 0} color="#0B1C3D" />
        </div>

        {/* Extra stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Adults", value: summary.total_adults || 0 },
            { label: "Children", value: summary.total_children || 0 },
            { label: "Seniors", value: summary.total_seniors || 0 },
            { label: "Jain Food", value: summary.jain_food_count || 0 },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-[#D4AF37]/10 text-center">
              <p className="text-[#0B1C3D]/40 text-xs uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold text-[#0B1C3D] mt-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Registrations Table */}
        <div className="bg-white rounded-2xl border border-[#D4AF37]/20 overflow-hidden" data-testid="admin-registrations-table">
          <div className="p-4 sm:p-6 border-b border-[#D4AF37]/10">
            <h2 className="text-xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              All Registrations ({registrations.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[#0B1C3D]/60">Name</TableHead>
                  <TableHead className="text-[#0B1C3D]/60">Mobile</TableHead>
                  <TableHead className="text-[#0B1C3D]/60">City</TableHead>
                  <TableHead className="text-[#0B1C3D]/60">Attend</TableHead>
                  <TableHead className="text-[#0B1C3D]/60">People</TableHead>
                  <TableHead className="text-[#0B1C3D]/60">Accommodation</TableHead>
                  <TableHead className="text-[#0B1C3D]/60">Travel</TableHead>
                  <TableHead className="text-[#0B1C3D]/60">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-[#0B1C3D]/40 py-12">
                      No registrations yet
                    </TableCell>
                  </TableRow>
                ) : (
                  registrations.map((reg, i) => (
                    <TableRow key={i} className="hover:bg-[#D4AF37]/5">
                      <TableCell className="font-medium text-[#0B1C3D]">{reg.full_name}</TableCell>
                      <TableCell>{reg.mobile}</TableCell>
                      <TableCell>{reg.city_country || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${reg.will_attend === "Yes" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {reg.will_attend}
                        </span>
                      </TableCell>
                      <TableCell>{(reg.adults || 0) + (reg.children || 0) + (reg.senior_citizens || 0)}</TableCell>
                      <TableCell>{reg.need_accommodation ? `Yes (${reg.num_rooms} rooms)` : "No"}</TableCell>
                      <TableCell>{reg.travel_mode || "-"}</TableCell>
                      <TableCell className="text-xs text-[#0B1C3D]/50">{reg.created_at ? new Date(reg.created_at).toLocaleDateString() : "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    document.title = "Admin - Katha Mahotsav 2026";
    axios.get(`${API}/auth/me`, { withCredentials: true })
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center">
        <div className="text-[#D4AF37]">Checking authentication...</div>
      </div>
    );
  }

  if (!user) return <AdminLogin onLogin={setUser} />;
  return <AdminDashboard user={user} onLogout={() => setUser(null)} />;
}
