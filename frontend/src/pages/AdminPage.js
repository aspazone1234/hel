import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Download, Users, LogOut, Eye, EyeOff, CheckCircle, Clock, Trash2, RotateCcw, ClipboardList, UserCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getToken() { return localStorage.getItem("admin_token"); }
function setTokenStore(t) { localStorage.setItem("admin_token", t); }
function clearToken() { localStorage.removeItem("admin_token"); }

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 sm:p-10 border border-[#D4AF37]/20 max-w-md w-full sacred-border">
        <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1 mb-6" data-testid="admin-back-home">
          <ChevronLeft size={16} /> Back to Home
        </Link>
        <h2 className="text-3xl font-bold text-[#0B1C3D] mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Admin Login</h2>
        <p className="text-[#0B1C3D]/50 text-sm mb-8">Sign in to manage registrations</p>
        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg" data-testid="admin-login-error">{error}</p>}
        <form onSubmit={handleSubmit} data-testid="admin-login-form" className="space-y-5">
          <div>
            <Label className="text-[#0B1C3D]/70 text-sm">Username</Label>
            <Input data-testid="admin-username-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" className="mt-1.5 bg-white border-[#D4AF37]/20" required />
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
          {r.message && (
            <Section title="Message">
              <p className="text-sm text-[#0B1C3D]/70 italic">{r.message}</p>
            </Section>
          )}
          <div className="flex justify-between items-center text-xs text-[#0B1C3D]/30">
            <span>Status: <span className="capitalize font-medium text-[#0B1C3D]/60">{r.approval_status || "pending"}</span></span>
            <span>Registered: {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RegistrationTable({ registrations, onView, onAction, actionLabel, actionIcon: ActionIcon, actionColor, secondaryAction, secondaryLabel, secondaryIcon: SecondaryIcon }) {
  if (registrations.length === 0) {
    return <div className="text-center text-[#0B1C3D]/40 py-12">No registrations in this category</div>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[#0B1C3D]/60">Name</TableHead>
            <TableHead className="text-[#0B1C3D]/60">Mobile</TableHead>
            <TableHead className="text-[#0B1C3D]/60">City</TableHead>
            <TableHead className="text-[#0B1C3D]/60">Intent</TableHead>
            <TableHead className="text-[#0B1C3D]/60">People</TableHead>
            <TableHead className="text-[#0B1C3D]/60">Date</TableHead>
            <TableHead className="text-[#0B1C3D]/60">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registrations.map((reg, i) => (
            <TableRow key={reg.id || i} className="hover:bg-[#D4AF37]/5" data-testid={`reg-row-${i}`}>
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
              <TableCell className="text-xs text-[#0B1C3D]/50">{reg.created_at ? new Date(reg.created_at).toLocaleDateString() : "-"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onView(reg)} className="text-[#D4AF37] hover:text-[#D4AF37]/80 hover:bg-[#D4AF37]/10" data-testid={`view-reg-${i}`}>
                    <Eye size={14} />
                  </Button>
                  {onAction && (
                    <Button variant="ghost" size="sm" onClick={() => onAction(reg)} className={`${actionColor} hover:opacity-80`} data-testid={`action-reg-${i}`}>
                      <ActionIcon size={14} className="mr-1" /> {actionLabel}
                    </Button>
                  )}
                  {secondaryAction && (
                    <Button variant="ghost" size="sm" onClick={() => secondaryAction(reg)} className="text-red-500 hover:text-red-700 hover:bg-red-50" data-testid={`secondary-action-reg-${i}`}>
                      <SecondaryIcon size={14} className="mr-1" /> {secondaryLabel}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AdminDashboard({ user, onLogout }) {
  const [allRegs, setAllRegs] = useState([]);
  const [summary, setSummary] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    document.title = "Admin Dashboard - Katha Mahotsav 2026";
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const headers = authHeaders();
      const [regsRes, sumRes, logsRes] = await Promise.all([
        axios.get(`${API}/admin/registrations`, { headers }),
        axios.get(`${API}/admin/summary`, { headers }),
        axios.get(`${API}/admin/activity-logs`, { headers }),
      ]);
      setAllRegs(regsRes.data);
      setSummary(sumRes.data);
      setActivityLogs(logsRes.data);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (reg, newStatus) => {
    try {
      await axios.put(`${API}/admin/registrations/${reg.id}/status`, { status: newStatus }, { headers: authHeaders() });
      toast.success(`Registration ${newStatus}`);
      loadData();
    } catch (err) {
      toast.error(`Failed to update: ${err.response?.data?.detail || "Unknown error"}`);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API}/admin/export-csv`, { headers: authHeaders(), responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "approved_guests.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("CSV exported (Approved guests only)");
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  const handleLogout = () => { clearToken(); onLogout(); };

  if (loading) return <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center"><div className="text-[#D4AF37] text-lg">Loading...</div></div>;

  const pending = allRegs.filter(r => (r.approval_status || "pending") === "pending");
  const approved = allRegs.filter(r => r.approval_status === "approved");
  const deleted = allRegs.filter(r => r.approval_status === "deleted");

  return (
    <div className="min-h-screen bg-[#F8F1E5] py-8 px-4" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1 mb-2"><ChevronLeft size={16} /> Back to Home</Link>
            <h1 className="text-3xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Admin Dashboard</h1>
            <p className="text-[#0B1C3D]/50 text-sm">Welcome, {user.name || user.username}</p>
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
          <div className="bg-white rounded-2xl p-6 border border-[#D4AF37]/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#D4AF37]/10"><Users size={20} className="text-[#D4AF37]" /></div>
              <span className="text-[#0B1C3D]/50 text-sm">Total Registrations</span>
            </div>
            <p className="text-3xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{summary.total_registrations || 0}</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100"><Clock size={20} className="text-amber-600" /></div>
              <span className="text-amber-700/70 text-sm">Pending Approval</span>
            </div>
            <p className="text-3xl font-bold text-amber-700" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{summary.pending_count || 0}</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100"><UserCheck size={20} className="text-green-600" /></div>
              <span className="text-green-700/70 text-sm">Approved Guests</span>
            </div>
            <p className="text-3xl font-bold text-green-700" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{summary.approved_count || 0}</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100"><Trash2 size={20} className="text-red-500" /></div>
              <span className="text-red-600/70 text-sm">Recycle Bin</span>
            </div>
            <p className="text-3xl font-bold text-red-600" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{summary.deleted_count || 0}</p>
          </div>
        </div>

        {/* People summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-[#D4AF37]/10 text-center">
            <p className="text-[#0B1C3D]/40 text-xs uppercase tracking-wider">Total People</p>
            <p className="text-2xl font-bold text-[#0B1C3D] mt-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{summary.total_people || 0}</p>
          </div>
          {[
            { label: "Confirmed", value: summary.attend_yes || 0, icon: CheckCircle, color: "text-green-600" },
            { label: "Most Probably", value: summary.attend_probably || 0, icon: Clock, color: "text-yellow-600" },
            { label: "Maybe", value: summary.attend_maybe || 0, icon: XCircle, color: "text-orange-500" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-[#D4AF37]/10 text-center">
              <s.icon className={`${s.color} mx-auto mb-1`} size={18} />
              <p className="text-[#0B1C3D]/40 text-xs uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold text-[#0B1C3D] mt-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* 3-Bucket Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border border-[#D4AF37]/20 p-1 rounded-xl" data-testid="admin-tabs">
            <TabsTrigger value="pending" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800 rounded-lg px-4" data-testid="tab-pending">
              <Clock size={14} className="mr-1.5" /> Approval Center ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-800 rounded-lg px-4" data-testid="tab-approved">
              <UserCheck size={14} className="mr-1.5" /> Guest List ({approved.length})
            </TabsTrigger>
            <TabsTrigger value="deleted" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800 rounded-lg px-4" data-testid="tab-deleted">
              <Trash2 size={14} className="mr-1.5" /> Recycle Bin ({deleted.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-[#0B1C3D]/10 data-[state=active]:text-[#0B1C3D] rounded-lg px-4" data-testid="tab-logs">
              <ClipboardList size={14} className="mr-1.5" /> Activity Log
            </TabsTrigger>
          </TabsList>

          {/* Approval Center */}
          <TabsContent value="pending">
            <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden" data-testid="pending-registrations">
              <div className="p-4 sm:p-6 border-b border-amber-100 bg-amber-50/50">
                <h2 className="text-xl font-bold text-amber-800" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Approval Center ({pending.length})
                </h2>
                <p className="text-amber-600/70 text-sm">Review and approve new registrations</p>
              </div>
              <RegistrationTable
                registrations={pending}
                onView={setSelectedReg}
                onAction={(reg) => updateStatus(reg, "approved")}
                actionLabel="Approve"
                actionIcon={CheckCircle}
                actionColor="text-green-600 hover:bg-green-50"
                secondaryAction={(reg) => updateStatus(reg, "deleted")}
                secondaryLabel="Delete"
                secondaryIcon={Trash2}
              />
            </div>
          </TabsContent>

          {/* Final Guest List */}
          <TabsContent value="approved">
            <div className="bg-white rounded-2xl border border-green-200 overflow-hidden" data-testid="approved-registrations">
              <div className="p-4 sm:p-6 border-b border-green-100 bg-green-50/50">
                <h2 className="text-xl font-bold text-green-800" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Final Guest List ({approved.length})
                </h2>
                <p className="text-green-600/70 text-sm">Approved guests for the event</p>
              </div>
              <RegistrationTable
                registrations={approved}
                onView={setSelectedReg}
                onAction={(reg) => updateStatus(reg, "deleted")}
                actionLabel="Remove"
                actionIcon={Trash2}
                actionColor="text-red-500 hover:bg-red-50"
              />
            </div>
          </TabsContent>

          {/* Recycle Bin */}
          <TabsContent value="deleted">
            <div className="bg-white rounded-2xl border border-red-200 overflow-hidden" data-testid="deleted-registrations">
              <div className="p-4 sm:p-6 border-b border-red-100 bg-red-50/50">
                <h2 className="text-xl font-bold text-red-700" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Recycle Bin ({deleted.length})
                </h2>
                <p className="text-red-500/70 text-sm">Deleted registrations can be restored</p>
              </div>
              <RegistrationTable
                registrations={deleted}
                onView={setSelectedReg}
                onAction={(reg) => updateStatus(reg, "pending")}
                actionLabel="Restore"
                actionIcon={RotateCcw}
                actionColor="text-blue-600 hover:bg-blue-50"
              />
            </div>
          </TabsContent>

          {/* Activity Logs */}
          <TabsContent value="logs">
            <div className="bg-white rounded-2xl border border-[#D4AF37]/20 overflow-hidden" data-testid="activity-logs">
              <div className="p-4 sm:p-6 border-b border-[#D4AF37]/10">
                <h2 className="text-xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Activity Log ({activityLogs.length})
                </h2>
                <p className="text-[#0B1C3D]/50 text-sm">Read-only log of all admin actions</p>
              </div>
              <div className="overflow-x-auto">
                {activityLogs.length === 0 ? (
                  <div className="text-center text-[#0B1C3D]/40 py-12">No activity yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[#0B1C3D]/60">Time</TableHead>
                        <TableHead className="text-[#0B1C3D]/60">Guest</TableHead>
                        <TableHead className="text-[#0B1C3D]/60">Action</TableHead>
                        <TableHead className="text-[#0B1C3D]/60">From</TableHead>
                        <TableHead className="text-[#0B1C3D]/60">By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityLogs.map((log, i) => (
                        <TableRow key={i} data-testid={`log-row-${i}`}>
                          <TableCell className="text-xs text-[#0B1C3D]/50">{log.performed_at ? new Date(log.performed_at).toLocaleString() : "-"}</TableCell>
                          <TableCell className="font-medium text-[#0B1C3D]">{log.guest_name}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              log.action === "approved" ? "bg-green-100 text-green-700" :
                              log.action === "deleted" ? "bg-red-100 text-red-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>{log.action}</span>
                          </TableCell>
                          <TableCell className="text-xs text-[#0B1C3D]/50 capitalize">{log.old_status}</TableCell>
                          <TableCell className="text-sm text-[#0B1C3D]/70">{log.performed_by}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

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
