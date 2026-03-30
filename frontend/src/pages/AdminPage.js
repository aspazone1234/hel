import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Download, Users, Home, LogOut, Eye, EyeOff, CheckCircle, HelpCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getToken() { return localStorage.getItem("admin_token"); }
function setToken(t) { localStorage.setItem("admin_token", t); }
function clearToken() { localStorage.removeItem("admin_token"); }

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
      const { data } = await axios.post(`${API}/auth/login`, { email, password });
      setToken(data.token);
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

function RegistrationDetail({ registration, open, onClose }) {
  if (!registration) return null;
  const r = registration;

  const Section = ({ title, children }) => (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider">{title}</h4>
      {children}
      <Separator className="mt-3" />
    </div>
  );
  const Field = ({ label, value }) => (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-[#0B1C3D]/50">{label}</span>
      <span className="text-[#0B1C3D] font-medium text-right max-w-[60%]">{value || "-"}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white" data-testid="registration-detail-dialog">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Registration Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          <Section title="Contact Information">
            <Field label="Full Name" value={r.full_name} />
            <Field label="Mobile / WhatsApp" value={r.mobile} />
            <Field label="Email" value={r.email} />
            <Field label="City" value={r.city} />
            <Field label="Country" value={r.country} />
          </Section>
          <Section title="Attendance">
            <Field label="Intent" value={r.attendance_intent} />
            <Field label="Arrival Date" value={r.arrival_date} />
            <Field label="Departure Date" value={r.departure_date} />
            <Field label="Days Attending" value={Array.isArray(r.days_attending) ? r.days_attending.join(", ") : r.days_attending} />
            <Field label="Total People" value={r.num_people} />
          </Section>
          {r.attendees && r.attendees.length > 0 && (
            <Section title="Attendees">
              {r.attendees.map((att, i) => (
                <div key={i} className="bg-[#F8F1E5]/50 rounded-lg p-3 mb-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#0B1C3D]">{att.name || `Person ${i + 1}`}</span>
                    <span className="text-[#0B1C3D]/50 text-xs">{att.category || ""}</span>
                  </div>
                  {att.special_needs && <p className="text-[#E67E22] text-xs mt-1">Needs: {att.special_needs}</p>}
                </div>
              ))}
            </Section>
          )}
          <Section title="Accommodation">
            <Field label="Need Accommodation" value={r.need_accommodation ? "Yes" : "No"} />
          </Section>
          {r.message && (
            <Section title="Message">
              <p className="text-sm text-[#0B1C3D]/70 italic">{r.message}</p>
            </Section>
          )}
          <div className="text-xs text-[#0B1C3D]/30 text-right">
            Registered: {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminDashboard({ user, onLogout }) {
  const [registrations, setRegistrations] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState(null);

  useEffect(() => {
    document.title = "Admin Dashboard - Katha Mahotsav 2026";
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const headers = authHeaders();
      const [regsRes, sumRes] = await Promise.all([
        axios.get(`${API}/admin/registrations`, { headers }),
        axios.get(`${API}/admin/summary`, { headers }),
      ]);
      setRegistrations(regsRes.data);
      setSummary(sumRes.data);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API}/admin/export-csv`, { headers: authHeaders(), responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "registrations.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  const handleLogout = () => {
    clearToken();
    onLogout();
  };

  if (loading) return <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center"><div className="text-[#D4AF37] text-lg">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-[#F8F1E5] py-8 px-4" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1 mb-2"><ChevronLeft size={16} /> Back to Home</Link>
            <h1 className="text-3xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Admin Dashboard</h1>
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-testid="admin-summary">
          <SummaryCard icon={Users} label="Total Registrations" value={summary.total_registrations || 0} />
          <SummaryCard icon={Users} label="Total People" value={summary.total_people || 0} color="#E67E22" />
          <SummaryCard icon={Home} label="Accommodation Needed" value={summary.accommodation_needed || 0} color="#F1948A" />
          <SummaryCard icon={Home} label="Total Rooms" value={summary.total_rooms || 0} color="#0B1C3D" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Confirmed (Yes)", value: summary.attend_yes || 0, icon: CheckCircle, color: "text-green-600" },
            { label: "Most Probably", value: summary.attend_probably || 0, icon: Clock, color: "text-yellow-600" },
            { label: "Maybe", value: summary.attend_maybe || 0, icon: HelpCircle, color: "text-orange-500" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-[#D4AF37]/10 text-center">
              <s.icon className={`${s.color} mx-auto mb-2`} size={20} />
              <p className="text-[#0B1C3D]/40 text-xs uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold text-[#0B1C3D] mt-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{s.value}</p>
            </div>
          ))}
        </div>

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
                  <TableHead className="text-[#0B1C3D]/60">Intent</TableHead>
                  <TableHead className="text-[#0B1C3D]/60">People</TableHead>
                  <TableHead className="text-[#0B1C3D]/60">Accommodation</TableHead>
                  <TableHead className="text-[#0B1C3D]/60">Date</TableHead>
                  <TableHead className="text-[#0B1C3D]/60">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-[#0B1C3D]/40 py-12">No registrations yet</TableCell>
                  </TableRow>
                ) : (
                  registrations.map((reg, i) => (
                    <TableRow key={i} className="hover:bg-[#D4AF37]/5 cursor-pointer" onClick={() => setSelectedReg(reg)} data-testid={`reg-row-${i}`}>
                      <TableCell className="font-medium text-[#0B1C3D]">{reg.full_name}</TableCell>
                      <TableCell>{reg.mobile}</TableCell>
                      <TableCell>{reg.city || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          reg.attendance_intent === "Yes" ? "bg-green-100 text-green-700" :
                          reg.attendance_intent === "Most Probably" ? "bg-yellow-100 text-yellow-700" :
                          "bg-orange-100 text-orange-700"
                        }`}>{reg.attendance_intent}</span>
                      </TableCell>
                      <TableCell>{reg.num_people}</TableCell>
                      <TableCell>{reg.need_accommodation ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-xs text-[#0B1C3D]/50">{reg.created_at ? new Date(reg.created_at).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-[#D4AF37] hover:text-[#D4AF37]/80 hover:bg-[#D4AF37]/10" data-testid={`view-reg-${i}`} onClick={(e) => { e.stopPropagation(); setSelectedReg(reg); }}>
                          <Eye size={14} className="mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <RegistrationDetail registration={selectedReg} open={!!selectedReg} onClose={() => setSelectedReg(null)} />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    document.title = "Admin - Katha Mahotsav 2026";
    const token = getToken();
    if (!token) { setChecking(false); return; }
    axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUser(res.data))
      .catch(() => { clearToken(); setUser(null); })
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center"><div className="text-[#D4AF37]">Checking authentication...</div></div>;
  if (!user) return <AdminLogin onLogin={setUser} />;
  return <AdminDashboard user={user} onLogout={() => setUser(null)} />;
}
