import { useState, useEffect, useCallback } from "react";
import { Headphones, Plus, Search, Clock, AlertTriangle, CheckCircle, Eye, UserPlus, GitBranch, LayoutGrid } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import WAFlowSettings from "./WAFlowSettings";
import HelpCategoryManager from "./HelpCategoryManager";

const API = process.env.REACT_APP_BACKEND_URL;

export default function HelpCentre({ user }) {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("my");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [viewTicket, setViewTicket] = useState(null);
  const [categories, setCategories] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [resolveNote, setResolveNote] = useState("");
  const [hcTab, setHcTab] = useState("tickets"); // "tickets" | "flow"
  const isSuper = user?.role === "superadmin";

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  }), []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { per_page: 200 };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;
      const { data } = await axios.get(`${API}/api/admin/tickets`, { headers: authHeaders(), params });
      let items = data.data || data || [];
      if (view === "my") {
        const myName = user?.name;
        const myUsername = user?.username;
        items = items.filter(t =>
          t.assigned_to === myName || t.assigned_to === myUsername ||
          t.created_by === myName || t.created_by === myUsername
        );
      }
      setTickets(items);
    } catch {}
    setLoading(false);
  }, [authHeaders, statusFilter, priorityFilter, search, view, user?.name]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/admin/tickets/stats`, { headers: authHeaders() });
      setStats(data);
    } catch {}
  }, [authHeaders]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/admin/tickets/categories`, { headers: authHeaders() });
      setCategories(data);
    } catch {}
  }, [authHeaders]);

  const loadAdmins = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/admin/admins`, { headers: authHeaders() });
      setAdmins(data);
    } catch {}
  }, [authHeaders]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { fetchStats(); fetchCategories(); loadAdmins(); }, [fetchStats, fetchCategories, loadAdmins]);

  const [createForm, setCreateForm] = useState({
    guest_name: "", guest_mobile: "", category: "other", priority: "low",
    description: "", assigned_to: "", resolution_time_minutes: 30,
  });

  const createTicket = async () => {
    try {
      await axios.post(`${API}/api/admin/tickets`, createForm, { headers: authHeaders() });
      toast.success("Ticket created");
      setShowCreate(false);
      setCreateForm({ guest_name: "", guest_mobile: "", category: "other", priority: "low", description: "", assigned_to: "", resolution_time_minutes: 30 });
      fetchTickets();
      fetchStats();
    } catch { toast.error("Failed"); }
  };

  const resolveTicket = async (ticketId) => {
    if (!resolveNote.trim()) { toast.error("Closing note is required"); return; }
    try {
      await axios.put(`${API}/api/admin/tickets/${ticketId}/resolve`, { closing_note: resolveNote }, { headers: authHeaders() });
      toast.success("Ticket resolved");
      setViewTicket(null);
      setResolveNote("");
      fetchTickets();
      fetchStats();
    } catch { toast.error("Failed"); }
  };

  const assignTicket = async (ticketId, assignee) => {
    try {
      await axios.put(`${API}/api/admin/tickets/${ticketId}/assign`, { assigned_to: assignee }, { headers: authHeaders() });
      toast.success("Ticket assigned");
      fetchTickets();
    } catch { toast.error("Failed"); }
  };

  const getSLAColor = (ticket) => {
    if (ticket.status === "resolved") return "text-green-600";
    const created = new Date(ticket.created_at);
    const deadline = new Date(created.getTime() + (ticket.resolution_time_minutes || 30) * 60000);
    return new Date() > deadline ? "text-red-600" : "text-amber-600";
  };

  const getRemainingTime = (ticket) => {
    if (ticket.status === "resolved") return "Resolved";
    const created = new Date(ticket.created_at);
    const deadline = new Date(created.getTime() + (ticket.resolution_time_minutes || 30) * 60000);
    const diff = deadline - new Date();
    if (diff <= 0) return "Overdue";
    const mins = Math.floor(diff / 60000);
    return mins > 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins}m`;
  };

  const priorityColors = { high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", low: "bg-green-100 text-green-700" };
  const statusColors = { open: "bg-blue-100 text-blue-700", in_progress: "bg-amber-100 text-amber-700", resolved: "bg-green-100 text-green-700" };

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="help-centre">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Headphones className="text-[#B8860B]" size={24} />
          <h1 className="text-xl font-bold text-[#0B1C3D]">Help Centre</h1>
        </div>
        {hcTab === "tickets" && (
          <button onClick={() => setShowCreate(true)} data-testid="create-ticket-btn"
            className="bg-[#0B1C3D] text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1">
            <Plus size={14} /> New Ticket
          </button>
        )}
      </div>

      {/* Admin-only sub-tabs */}
      {isSuper && (
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit" data-testid="hc-subtabs">
          <button
            onClick={() => setHcTab("tickets")}
            data-testid="hc-tab-tickets"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${hcTab === "tickets" ? "bg-white shadow text-[#0B1C3D]" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <Headphones size={14} /> Tickets
          </button>
          <button
            onClick={() => setHcTab("categories")}
            data-testid="hc-tab-categories"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${hcTab === "categories" ? "bg-white shadow text-[#0B1C3D]" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <LayoutGrid size={14} /> Services / SLA
          </button>
          <button
            onClick={() => setHcTab("flow")}
            data-testid="hc-tab-flow"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${hcTab === "flow" ? "bg-white shadow text-[#0B1C3D]" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <GitBranch size={14} /> WA Flow Settings
          </button>
        </div>
      )}

      {hcTab === "flow" && isSuper ? (
        <WAFlowSettings />
      ) : hcTab === "categories" && isSuper ? (
        <HelpCategoryManager />
      ) : (
        <>
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="ticket-stats">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-xs text-blue-600">Total</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{stats.active}</p>
            <p className="text-xs text-amber-600">Active</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{stats.escalated}</p>
            <p className="text-xs text-red-600">Escalated</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{stats.resolved}</p>
            <p className="text-xs text-green-600">Resolved</p>
          </div>
        </div>
      )}

      {/* Escalation Alert */}
      {stats?.escalated > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3" data-testid="escalation-alert">
          <AlertTriangle className="text-red-500" size={18} />
          <span className="text-sm text-red-700 font-medium">{stats.escalated} ticket(s) have breached SLA and need immediate attention!</span>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex gap-2" data-testid="help-view-toggle">
        <button onClick={() => setView("my")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === "my" ? "bg-[#0B1C3D] text-white" : "bg-gray-100 text-gray-600"}`}>
          My Tickets
        </button>
        <button onClick={() => setView("all")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === "all" ? "bg-[#0B1C3D] text-white" : "bg-gray-100 text-gray-600"}`}>
          All Tickets
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select className="border rounded px-2 py-1.5 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="filter-status">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select className="border rounded px-2 py-1.5 text-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} data-testid="filter-priority">
          <option value="">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2 text-gray-400" size={14} />
          <input className="w-full pl-7 pr-3 py-1.5 border rounded text-sm" placeholder="Search..."
            value={search} onChange={(e) => setSearch(e.target.value)} data-testid="ticket-search" />
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-2" data-testid="ticket-list">
        {loading ? <p className="text-center text-gray-500 py-4">Loading...</p> :
          tickets.length === 0 ? <p className="text-center text-gray-400 py-8">No tickets found</p> :
          tickets.map((t) => (
            <div key={t.id} className="bg-white rounded-xl p-4 border hover:shadow-sm transition" data-testid={`ticket-${t.id}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[t.priority] || ""}`}>{t.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[t.status] || ""}`}>{t.status}</span>
                    <span className={`text-xs font-medium ${getSLAColor(t)}`}><Clock size={10} className="inline" /> {getRemainingTime(t)}</span>
                  </div>
                  <p className="font-medium text-[#0B1C3D] text-sm mt-1 truncate">{t.description || t.category}</p>
                  <p className="text-xs text-gray-500">{t.guest_name || "Admin"} • Assigned: {t.assigned_to || "Unassigned"}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setViewTicket(t); setResolveNote(""); }} data-testid={`view-ticket-${t.id}`}
                    className="bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-blue-100">
                    <Eye size={12} /> View
                  </button>
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreate} onOpenChange={() => setShowCreate(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Guest name" value={createForm.guest_name}
              onChange={(e) => setCreateForm({ ...createForm, guest_name: e.target.value })} />
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Guest mobile" value={createForm.guest_mobile}
              onChange={(e) => setCreateForm({ ...createForm, guest_mobile: e.target.value })} />
            <select className="w-full border rounded px-3 py-2 text-sm" value={createForm.category}
              onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select className="w-full border rounded px-3 py-2 text-sm" value={createForm.priority}
              onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <textarea className="w-full border rounded px-3 py-2 text-sm" rows={3} placeholder="Description*"
              value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
            <select className="w-full border rounded px-3 py-2 text-sm" value={createForm.assigned_to}
              onChange={(e) => setCreateForm({ ...createForm, assigned_to: e.target.value })}>
              <option value="">Assign to...</option>
              {admins.map(a => <option key={a.username} value={a.name || a.username}>{a.name || a.username}</option>)}
            </select>
            <input type="number" className="w-full border rounded px-3 py-2 text-sm" placeholder="Resolution time (minutes)"
              value={createForm.resolution_time_minutes} onChange={(e) => setCreateForm({ ...createForm, resolution_time_minutes: parseInt(e.target.value) || 30 })} />
            <div className="flex gap-2">
              <button onClick={createTicket} className="flex-1 bg-[#0B1C3D] text-white py-2 rounded-lg text-sm" data-testid="submit-ticket-btn">Create</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail / Resolve Dialog */}
      <Dialog open={!!viewTicket} onOpenChange={() => setViewTicket(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ticket Details</DialogTitle></DialogHeader>
          {viewTicket && (
            <div className="space-y-4 text-sm" data-testid="ticket-detail">
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-medium">{viewTicket.category}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Priority</span><span className={`px-2 py-0.5 rounded-full text-xs ${priorityColors[viewTicket.priority]}`}>{viewTicket.priority}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[viewTicket.status]}`}>{viewTicket.status}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SLA</span><span className={getSLAColor(viewTicket)}>{getRemainingTime(viewTicket)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Guest</span><span>{viewTicket.guest_name || "—"} {viewTicket.guest_mobile && `(${viewTicket.guest_mobile})`}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Created By</span><span>{viewTicket.created_by}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Assigned To</span><span>{viewTicket.assigned_to || "Unassigned"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Created</span><span>{new Date(viewTicket.created_at).toLocaleString()}</span></div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Description</p>
                <p className="text-[#0B1C3D]">{viewTicket.description || "—"}</p>
              </div>
              {viewTicket.closing_note && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Closing Note</p>
                  <p className="text-green-800">{viewTicket.closing_note}</p>
                </div>
              )}

              {/* Reassign */}
              {viewTicket.status !== "resolved" && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Reassign</p>
                  <select className="w-full border rounded px-2 py-1.5 text-sm" defaultValue={viewTicket.assigned_to || ""}
                    onChange={(e) => { assignTicket(viewTicket.id, e.target.value); setViewTicket({...viewTicket, assigned_to: e.target.value}); }}>
                    <option value="">Unassigned</option>
                    {admins.map(a => <option key={a.username} value={a.name || a.username}>{a.name || a.username}</option>)}
                  </select>
                </div>
              )}

              {/* Resolve */}
              {viewTicket.status !== "resolved" && (viewTicket.assigned_to === user?.name || isSuper) && (
                <div className="space-y-2 border-t pt-3">
                  <p className="font-medium text-[#0B1C3D]">Resolve Ticket</p>
                  <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} placeholder="Closing note (required)*"
                    value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} data-testid="resolve-note" />
                  <button onClick={() => resolveTicket(viewTicket.id)} data-testid="resolve-ticket-btn"
                    className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                    <CheckCircle size={14} className="inline mr-1" /> Resolve
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
