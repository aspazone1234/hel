import { useState, useEffect, useCallback } from "react";
import { Eye, Search, Plane, Undo2, Filter, Download, Trash2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { FullRegistrationView } from "./PendingApproval";

const API = process.env.REACT_APP_BACKEND_URL;

export default function ArrivedGuestList({ user }) {
  const [regs, setRegs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewReg, setViewReg] = useState(null);
  const [departureTarget, setDepartureTarget] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterArrival, setFilterArrival] = useState("");
  const [filterDeparture, setFilterDeparture] = useState("");
  const isSuper = user?.role === "superadmin";

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  }), []);

  const fetchRegs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/guests/arrived`, {
        headers: authHeaders(), params: { search, page, per_page: 20 }
      });
      let filtered = data.data || [];
      if (filterArrival) filtered = filtered.filter(r => r.arrival_date === filterArrival);
      if (filterDeparture) filtered = filtered.filter(r => r.departure_date === filterDeparture);
      setRegs(filtered);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  }, [authHeaders, search, page, filterArrival, filterDeparture]);

  useEffect(() => { fetchRegs(); }, [fetchRegs]);

  const getHeadName = (r) => {
    const h = (r.attendees || []).find(a => a.id === r.group_head_id);
    return h?.name || r.primary_mobile;
  };

  const confirmDeparture = async () => {
    if (!departureTarget) return;
    const r = departureTarget;
    const now = new Date();
    const depDate = r.departure_date ? new Date(r.departure_date + "T" + (r.expected_departure_time || "23:59")) : null;

    if (depDate && now < depDate && !isSuper) {
      toast.error(`Departure date is ${r.departure_date}. Only Super Admin can force early departure.`);
      setDepartureTarget(null);
      return;
    }

    try {
      await axios.put(`${API}/api/admin/registrations/${r.id}`, { arrival_status: "departed" }, { headers: authHeaders() });
      toast.success("Departure confirmed");
      // Free rooms
      for (const roomCode of (r.room_assignments || [])) {
        try { await axios.put(`${API}/api/admin/rooms/${roomCode}/unassign`, { registration_id: r.id }, { headers: authHeaders() }); } catch {}
      }
      setDepartureTarget(null);
      fetchRegs();
    } catch { toast.error("Failed"); }
  };

  const undoArrival = async (regId) => {
    if (!window.confirm("Move this guest back to Expected Guest List?")) return;
    try {
      await axios.put(`${API}/api/admin/registrations/${regId}/undo-arrival`, {}, { headers: authHeaders() });
      toast.success("Moved back to Expected");
      fetchRegs();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const undoDeparture = async (regId) => {
    if (!window.confirm("Undo departure? Guest will be moved back to Arrived.")) return;
    try {
      await axios.put(`${API}/api/admin/registrations/${regId}/undo-departure`, {}, { headers: authHeaders() });
      toast.success("Departure undone");
      fetchRegs();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const deleteEntry = async (regId) => {
    if (!window.confirm("Permanently delete this entry? This action cannot be undone.")) return;
    try {
      await axios.delete(`${API}/api/admin/registrations/${regId}/permanent`, { headers: authHeaders() });
      toast.success("Entry deleted");
      setRegs(prev => prev.filter(r => r.id !== regId));
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const DAYS = ["2026-05-27","2026-05-28","2026-05-29","2026-05-30","2026-05-31","2026-06-01","2026-06-02","2026-06-03","2026-06-04"];

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="arrived-guest-list">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0B1C3D]">Arrived Guest List</h1>
          <p className="text-sm text-gray-500">{total} total records</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { window.open(`${API}/api/admin/export-csv?bucket=arrived&token=${localStorage.getItem("admin_token")}`, "_blank"); }}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200" data-testid="export-arrived-csv">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => { window.open(`${API}/api/admin/export-pdf?bucket=arrived&token=${localStorage.getItem("admin_token")}`, "_blank"); }}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200" data-testid="export-arrived-pdf">
            <Download size={14} /> PDF
          </button>
          <button onClick={() => setShowFilters(!showFilters)} data-testid="toggle-filters"
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200">
            <Filter size={14} /> Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 bg-gray-50 rounded-lg p-3" data-testid="arrived-filters">
          <div>
            <label className="text-xs font-medium text-gray-600">Arrival Date</label>
            <select className="block border rounded px-2 py-1 text-sm mt-1" value={filterArrival} onChange={(e) => setFilterArrival(e.target.value)}>
              <option value="">All</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Departure Date</label>
            <select className="block border rounded px-2 py-1 text-sm mt-1" value={filterDeparture} onChange={(e) => setFilterDeparture(e.target.value)}>
              <option value="">All</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button onClick={() => { setFilterArrival(""); setFilterDeparture(""); }} className="text-xs text-blue-600 self-end pb-1">Clear</button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <input data-testid="arrived-search" className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
          placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="space-y-2" data-testid="arrived-list">
        {loading ? <p className="text-center text-gray-500 py-4">Loading...</p> :
          regs.length === 0 ? <p className="text-center text-gray-400 py-8">No arrived guests</p> :
          regs.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-4 border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0B1C3D] truncate">{getHeadName(r)}</p>
                  <p className="text-xs text-gray-500">{r.num_people} people • {r.primary_mobile}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.arrival_status === "departed" ? "bg-gray-100 text-gray-600" :
                      r.arrival_status === "partially_arrived" ? "bg-amber-100 text-amber-700" :
                      "bg-green-100 text-green-700"
                    }`}>{r.arrival_status}</span>
                    {(r.room_assignments || []).length > 0 && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Room: {r.room_assignments.join(", ")}</span>
                    )}
                    {r.assigned_swamsevak && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Contact: {r.assigned_swamsevak}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap">
                  <button onClick={() => setViewReg(r)} data-testid={`view-arrived-${r.id}`}
                    className="bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-blue-100">
                    <Eye size={12} /> View
                  </button>
                  {r.arrival_status !== "departed" && (
                    <button onClick={() => setDepartureTarget(r)} data-testid={`depart-${r.id}`}
                      className="bg-orange-50 text-orange-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-orange-100">
                      <Plane size={12} /> Departure
                    </button>
                  )}
                  {isSuper && r.arrival_status !== "departed" && (
                    <button onClick={() => undoArrival(r.id)} data-testid={`undo-arrival-${r.id}`}
                      className="bg-red-50 text-red-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-red-100">
                      <Undo2 size={12} /> Undo
                    </button>
                  )}
                  {isSuper && r.arrival_status === "departed" && (
                    <button onClick={() => undoDeparture(r.id)} data-testid={`undo-departure-${r.id}`}
                      className="bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-amber-100">
                      <Undo2 size={12} /> Undo Depart
                    </button>
                  )}
                  {isSuper && (
                    <button onClick={() => deleteEntry(r.id)} data-testid={`delete-arrived-${r.id}`}
                      className="bg-red-50 text-red-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-red-100">
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Full View with QR */}
      <Dialog open={!!viewReg} onOpenChange={() => setViewReg(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Complete Details</DialogTitle></DialogHeader>
          {viewReg && (
            <>
              {viewReg.qr_image_b64 && (
                <div className="flex justify-center mb-4" data-testid="qr-display">
                  <img src={`data:image/png;base64,${viewReg.qr_image_b64}`} alt="QR Code" className="w-48 h-48 border rounded-xl" />
                </div>
              )}
              <FullRegistrationView reg={viewReg} />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Departure Confirmation */}
      <Dialog open={!!departureTarget} onOpenChange={() => setDepartureTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm Departure</DialogTitle></DialogHeader>
          {departureTarget && (
            <div className="space-y-4" data-testid="departure-confirm">
              <p className="text-sm text-gray-600">Are you sure you want to confirm departure for:</p>
              <p className="font-semibold text-[#0B1C3D]">{getHeadName(departureTarget)} ({departureTarget.num_people} people)</p>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Expected Departure:</span> {departureTarget.departure_date || "Not set"} {departureTarget.expected_departure_time || ""}
                </p>
              </div>
              {departureTarget.room_assignments?.length > 0 && (
                <p className="text-xs text-gray-500">Rooms {departureTarget.room_assignments.join(", ")} will be freed.</p>
              )}
              <div className="flex gap-2">
                <button onClick={confirmDeparture} data-testid="confirm-departure-btn"
                  className="flex-1 bg-orange-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-700">
                  Confirm Departure
                </button>
                <button onClick={() => setDepartureTarget(null)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
