import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Clock, Plus, Eye, Filter, Search, ChevronLeft, ChevronRight, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PRIORITY_COLORS = { high: "bg-red-100 text-red-700 border-red-200", medium: "bg-amber-100 text-amber-700 border-amber-200", low: "bg-green-100 text-green-700 border-green-200" };
const STATUS_COLORS = { open: "bg-blue-100 text-blue-700", in_progress: "bg-purple-100 text-purple-700", resolved: "bg-green-100 text-green-700" };

export default function HelpCentre({ user, authHeaders }) {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailTicket, setDetailTicket] = useState(null);
  const [admins, setAdmins] = useState([]);

  const fetchAll = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, per_page: 20 };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (assignedFilter) params.assigned_to = assignedFilter;
      const [tRes, sRes, cRes] = await Promise.all([
        axios.get(`${API}/admin/tickets`, { headers: authHeaders(), params }),
        axios.get(`${API}/admin/tickets/stats`, { headers: authHeaders() }),
        axios.get(`${API}/admin/tickets/categories`, { headers: authHeaders() }),
      ]);
      setTickets(tRes.data.data);
      setTotal(tRes.data.total);
      setStats(sRes.data);
      setCategories(cRes.data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(1); loadAdmins(); }, []);

  const loadAdmins = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/admins`, { headers: authHeaders() });
      setAdmins(data);
    } catch {}
  };

  const handleFilter = () => { setPage(1); fetchAll(1); };
  const handlePage = (p) => { setPage(p); fetchAll(p); };
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const getTimeRemaining = (ticket) => {
    if (ticket.status === "resolved") return "Resolved";
    try {
      const created = new Date(ticket.created_at);
      const sla = ticket.resolution_time_minutes || 30;
      const deadline = new Date(created.getTime() + sla * 60000);
      const now = new Date();
      const diff = deadline - now;
      if (diff <= 0) return "OVERDUE";
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}m left`;
      return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
    } catch { return ""; }
  };

  return (
    <div data-testid="help-centre-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Help Centre</h2>
          <p className="text-[#0B1C3D]/50 text-sm mt-1">Panchariya AI - Shrimad Bhagavat 2026</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#D4AF37] text-[#0B1C3D]" data-testid="create-ticket-btn">
          <Plus size={14} className="mr-1" /> New Ticket
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatBox label="Total" value={stats.total} color="bg-[#0B1C3D]/5" />
          <StatBox label="Active" value={stats.active} color="bg-blue-50" text="text-blue-600" />
          <StatBox label="High Priority" value={stats.by_priority?.high || 0} color="bg-red-50" text="text-red-600" />
          <StatBox label="Escalated" value={stats.escalated} color="bg-orange-50" text="text-orange-600" />
          <StatBox label="Resolved" value={stats.resolved} color="bg-green-50" text="text-green-600" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); }}>
          <SelectTrigger className="w-36 bg-white border-[#D4AF37]/20 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v === "all" ? "" : v); }}>
          <SelectTrigger className="w-36 bg-white border-[#D4AF37]/20 h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleFilter} size="sm" className="bg-[#D4AF37] text-[#0B1C3D] h-8 text-xs">Apply</Button>
      </div>

      {/* Ticket List */}
      {loading ? <div className="text-center py-20 text-[#0B1C3D]/40">Loading...</div> :
        tickets.length === 0 ? <div className="text-center py-20 text-[#0B1C3D]/40 bg-white rounded-xl border border-[#D4AF37]/10">No tickets found</div> :
        <div className="space-y-2">
          {tickets.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-[#D4AF37]/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setDetailTicket(t)} data-testid={`ticket-${t.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-[#0B1C3D] text-sm">{t.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                </div>
                <div className="flex items-center gap-3 text-[#0B1C3D]/50 text-xs">
                  <span>{t.category_label}</span>
                  <span>|</span>
                  <span className="flex items-center gap-1"><User size={10} /> {t.assigned_to || "Unassigned"}</span>
                  <span>|</span>
                  <span className={`flex items-center gap-1 ${getTimeRemaining(t) === "OVERDUE" ? "text-red-600 font-bold" : ""}`}>
                    <Clock size={10} /> {getTimeRemaining(t)}
                  </span>
                </div>
              </div>
              <span className="text-[#0B1C3D]/30 text-[10px] shrink-0">{new Date(t.created_at).toLocaleDateString()}</span>
            </div>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => handlePage(page - 1)}><ChevronLeft size={14} /></Button>
              <span className="text-sm text-[#0B1C3D]/60">{page}/{totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => handlePage(page + 1)}><ChevronRight size={14} /></Button>
            </div>
          )}
        </div>
      }

      {/* Create Dialog */}
      <CreateTicketDialog open={showCreate} onClose={() => setShowCreate(false)} categories={categories} admins={admins} authHeaders={authHeaders} onCreated={() => { setShowCreate(false); fetchAll(); }} />

      {/* Detail Dialog */}
      <TicketDetailDialog ticket={detailTicket} open={!!detailTicket} onClose={() => setDetailTicket(null)} authHeaders={authHeaders} user={user} admins={admins} onUpdated={() => { setDetailTicket(null); fetchAll(); }} />
    </div>
  );
}

function StatBox({ label, value, color = "", text = "text-[#0B1C3D]" }) {
  return <div className={`${color} rounded-xl p-3 text-center`}><p className="text-[#0B1C3D]/50 text-[10px]">{label}</p><p className={`text-xl font-bold ${text}`}>{value}</p></div>;
}

function CreateTicketDialog({ open, onClose, categories, admins, authHeaders, onCreated }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("low");
  const [assignedTo, setAssignedTo] = useState("");
  const [sla, setSla] = useState(30);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/tickets`, {
        title, description: desc, category, priority, assigned_to: assignedTo, resolution_time_minutes: sla, source_type: "admin",
      }, { headers: authHeaders() });
      toast.success("Ticket created");
      setTitle(""); setDesc(""); setCategory("other"); setPriority("low"); setAssignedTo(""); setSla(30);
      onCreated();
    } catch (err) { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="create-ticket-dialog">
        <DialogHeader><DialogTitle>New Ticket</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" data-testid="ticket-title" /></div>
          <div><Label className="text-xs">Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} className="mt-1" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{admins.map(a => <SelectItem key={a.username} value={a.username}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">SLA (minutes)</Label><Input type="number" value={sla} onChange={e => setSla(parseInt(e.target.value) || 30)} className="mt-1" /></div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D]" data-testid="save-ticket-btn">{saving ? "Creating..." : "Create Ticket"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TicketDetailDialog({ ticket, open, onClose, authHeaders, user, admins, onUpdated }) {
  const [closingNote, setClosingNote] = useState("");
  const [resolving, setResolving] = useState(false);

  if (!ticket) return null;
  const canResolve = ticket.assigned_to === user.username || user.role === "superadmin";

  const handleResolve = async () => {
    if (!closingNote.trim()) { toast.error("Closing note required"); return; }
    setResolving(true);
    try {
      await axios.put(`${API}/admin/tickets/${ticket.id}/resolve`, { closing_note: closingNote }, { headers: authHeaders() });
      toast.success("Ticket resolved");
      onUpdated();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setResolving(false); }
  };

  const handleAssign = async (username) => {
    try {
      await axios.put(`${API}/admin/tickets/${ticket.id}/assign`, { assigned_to: username }, { headers: authHeaders() });
      toast.success("Reassigned");
      onUpdated();
    } catch { toast.error("Failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="ticket-detail-dialog">
        <DialogHeader><DialogTitle>{ticket.title}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <D label="Category" value={ticket.category_label} />
            <D label="Priority" value={ticket.priority} />
            <D label="Status" value={ticket.status} />
            <D label="Assigned To" value={ticket.assigned_to} />
            <D label="Created By" value={ticket.created_by_name || ticket.created_by} />
            <D label="SLA" value={`${ticket.resolution_time_minutes} min`} />
          </div>
          {ticket.description && <D label="Description" value={ticket.description} />}
          {ticket.notes && <D label="Notes" value={ticket.notes} />}
          {ticket.closing_note && <D label="Closing Note" value={ticket.closing_note} />}
          {ticket.resolved_by && <D label="Resolved By" value={ticket.resolved_by_name || ticket.resolved_by} />}

          {ticket.status !== "resolved" && (
            <div className="border-t border-[#D4AF37]/10 pt-4 space-y-3">
              <div>
                <Label className="text-xs">Reassign To</Label>
                <Select onValueChange={handleAssign}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select Swamsevak" /></SelectTrigger>
                  <SelectContent>{admins.map(a => <SelectItem key={a.username} value={a.username}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {canResolve && (
                <div>
                  <Label className="text-xs">Closing Note *</Label>
                  <Textarea value={closingNote} onChange={e => setClosingNote(e.target.value)} className="mt-1" rows={2} placeholder="Describe how this was resolved..." data-testid="closing-note" />
                  <Button onClick={handleResolve} disabled={resolving} className="w-full mt-2 bg-green-600 text-white" data-testid="resolve-ticket-btn">
                    {resolving ? "Resolving..." : "Mark Resolved"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function D({ label, value }) {
  if (!value && value !== 0) return null;
  return <div><span className="text-[#0B1C3D]/50 text-xs">{label}</span><p className="text-[#0B1C3D] font-medium text-sm">{value}</p></div>;
}
