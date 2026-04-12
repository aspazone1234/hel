import { useState, useEffect, useCallback } from "react";
import { Eye, Plus, Search, QrCode, Hotel, UserPlus, Download, Edit, Trash2, Ban, Undo2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { FullRegistrationView } from "./PendingApproval";
import AddressSelector from "../AddressSelector";

const API = process.env.REACT_APP_BACKEND_URL;

function EditRegistrationDialog({ reg, onClose, onSaved, authHeaders }) {
  const [form, setForm] = useState({
    additional_phone: reg.additional_phone || "",
    email: reg.email || "",
    address: { full_address: reg.address?.full_address || "", city: reg.address?.city || "", state: reg.address?.state || "", country: reg.address?.country || "India", pin_code: reg.address?.pin_code || "" },
    admin_notes: reg.admin_notes || "",
    attendees: (reg.attendees || []).map(a => ({ ...a })),
    expected_arrival_time: reg.expected_arrival_time || "",
    expected_departure_time: reg.expected_departure_time || "",
    travel_mode: reg.travel_mode || "",
    travel_details: reg.travel_details || "",
    family_special_request: reg.family_special_request || "",
  });
  const [saving, setSaving] = useState(false);

  const TIME_OPTIONS = ["Early Morning (5-8 AM)", "Morning (8-11 AM)", "Afternoon (11 AM-2 PM)", "Afternoon (2-5 PM)", "Evening (5-8 PM)", "Night (8-11 PM)", "Late Night (11 PM+)"];

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/admin/registrations/${reg.id}`, form, { headers: authHeaders() });
      toast.success("Registration updated");
      onSaved();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to update"); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Registration</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600">Additional Phone</label>
              <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.additional_phone} onChange={e => setForm({...form, additional_phone: e.target.value})} /></div>
            <div><label className="text-xs font-medium text-gray-600">Email</label>
              <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Address</label>
            <div className="mt-1">
              <AddressSelector
                value={form.address}
                onChange={(addr) => setForm({...form, address: addr})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600">Arrival Time</label>
              <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.expected_arrival_time} onChange={e => setForm({...form, expected_arrival_time: e.target.value})}>
                <option value="">Select...</option>{TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-gray-600">Departure Time</label>
              <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.expected_departure_time} onChange={e => setForm({...form, expected_departure_time: e.target.value})}>
                <option value="">Select...</option>{TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600">Travel Mode</label>
              <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.travel_mode} onChange={e => setForm({...form, travel_mode: e.target.value})} /></div>
            <div><label className="text-xs font-medium text-gray-600">Travel Details</label>
              <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.travel_details} onChange={e => setForm({...form, travel_details: e.target.value})} /></div>
          </div>
          <div><label className="text-xs font-medium text-gray-600">Family Special Request</label>
            <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.family_special_request} onChange={e => setForm({...form, family_special_request: e.target.value})} /></div>
          <h4 className="font-semibold text-[#0B1C3D] pt-2">Attendees</h4>
          {form.attendees.map((a, i) => (
            <div key={a.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Person {i + 1} {a.id === reg.group_head_id && "(Head)"}</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded px-2 py-1.5 text-sm" placeholder="Name" value={a.name} onChange={e => { const atts = [...form.attendees]; atts[i] = {...atts[i], name: e.target.value}; setForm({...form, attendees: atts}); }} />
                <input className="border rounded px-2 py-1.5 text-sm" placeholder="Age" type="number" value={a.age} onChange={e => { const atts = [...form.attendees]; atts[i] = {...atts[i], age: e.target.value}; setForm({...form, attendees: atts}); }} />
              </div>
              <input className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Special needs" value={a.special_needs || ""} onChange={e => { const atts = [...form.attendees]; atts[i] = {...atts[i], special_needs: e.target.value}; setForm({...form, attendees: atts}); }} />
            </div>
          ))}
          <div><label className="text-xs font-medium text-gray-600">Admin Notes</label>
            <textarea className="w-full border rounded px-3 py-2 text-sm mt-1" rows={2} value={form.admin_notes} onChange={e => setForm({...form, admin_notes: e.target.value})} /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={save} disabled={saving} className="flex-1 bg-[#0B1C3D] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50" data-testid="save-edit-btn">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={onClose} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ExpectedGuestList({ user }) {
  const [regs, setRegs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewReg, setViewReg] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [showAssign, setShowAssign] = useState(null);
  const [showRoomAssign, setShowRoomAssign] = useState(null);
  const [editReg, setEditReg] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterRef, setFilterRef] = useState("");
  const [filterRelation, setFilterRelation] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refPersons, setRefPersons] = useState([]);
  const isSuper = user?.role === "superadmin";

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  }), []);

  const fetchRegs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/guests/expected`, {
        headers: authHeaders(), params: { search, page, per_page: 20, status_filter: statusFilter }
      });
      setRegs(data.data || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  }, [authHeaders, search, page, statusFilter]);

  const fetchAdmins = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/admin/admins`, { headers: authHeaders() });
      setAdmins(data);
    } catch {}
  }, [authHeaders]);

  const fetchRooms = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/admin/rooms`, { headers: authHeaders() });
      setRooms(Array.isArray(data) ? data : (data.data || []));
    } catch {}
  }, [authHeaders]);

  useEffect(() => { fetchRegs(); }, [fetchRegs]);
  useEffect(() => { fetchAdmins(); fetchRooms(); }, [fetchAdmins, fetchRooms]);
  useEffect(() => {
    axios.get(`${API}/api/reference-persons/public`).then(r => setRefPersons(r.data)).catch(() => {});
  }, []);

  const getHeadName = (r) => {
    const h = (r.attendees || []).find(a => a.id === r.group_head_id);
    return h?.name || r.primary_mobile;
  };

  const assignSwamsevak = async (regId, swamsevakName) => {
    try {
      await axios.put(`${API}/api/admin/registrations/${regId}`, { assigned_swamsevak: swamsevakName }, { headers: authHeaders() });
      toast.success("Swamsevak assigned");
      setShowAssign(null);
      fetchRegs();
    } catch { toast.error("Failed"); }
  };

  const assignRoom = async (regId, roomCode) => {
    try {
      await axios.put(`${API}/api/admin/rooms/${roomCode}/assign`, { registration_id: regId }, { headers: authHeaders() });
      toast.success("Room assigned");
      setShowRoomAssign(null);
      fetchRegs();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const generateQR = async (regId) => {
    try {
      await axios.post(`${API}/api/admin/qr/generate/${regId}`, {}, { headers: authHeaders() });
      toast.success("QR generated");
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

  const markNotComing = async (regId) => {
    if (!window.confirm("Mark this guest as 'Not Coming'? Their room and contact person will be released.")) return;
    try {
      await axios.post(`${API}/api/admin/registrations/${regId}/not-coming`, {}, { headers: authHeaders() });
      toast.success("Marked as Not Coming");
      fetchRegs();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const undoNotComing = async (regId) => {
    if (!window.confirm("Restore this guest back to Expected list?")) return;
    try {
      await axios.post(`${API}/api/admin/registrations/${regId}/undo-not-coming`, {}, { headers: authHeaders() });
      toast.success("Restored to Expected");
      fetchRegs();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const exportCSV = async () => {
    try {
      const resp = await axios.get(`${API}/api/admin/export-csv`, { headers: authHeaders(), responseType: "blob" });
      const url = window.URL.createObjectURL(resp.data);
      const a = document.createElement("a"); a.href = url; a.download = "expected_guests.csv"; a.click();
    } catch { toast.error("Export failed"); }
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="expected-guest-list">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0B1C3D]">Expected Guest List</h1>
          <p className="text-sm text-gray-500">{total} families</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowManual(true)} data-testid="add-manual-expected"
            className="bg-[#0B1C3D] text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1">
            <Plus size={14} /> Add Manual
          </button>
          <button onClick={() => { const params = new URLSearchParams({ bucket: "expected", token: localStorage.getItem("admin_token"), search, status_filter: statusFilter }); window.open(`${API}/api/admin/export-csv?${params}`, "_blank"); }} data-testid="export-expected-csv"
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => { const params = new URLSearchParams({ bucket: "expected", token: localStorage.getItem("admin_token"), search, status_filter: statusFilter }); window.open(`${API}/api/admin/export-pdf?${params}`, "_blank"); }} data-testid="export-expected-pdf"
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input data-testid="expected-search" className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
            placeholder="Search by name or mobile..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} data-testid="toggle-expected-filters"
          className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200">
          Filters {(filterRef || filterRelation) ? "●" : ""}
        </button>
      </div>

      {/* Status filter tabs — 3 separate filters */}
      <div className="flex gap-2" data-testid="expected-status-filter">
        <button onClick={() => { setStatusFilter("all"); setPage(1); }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${statusFilter === "all" ? "bg-[#0B1C3D] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          data-testid="filter-all-expected">All</button>
        <button onClick={() => { setStatusFilter("expected"); setPage(1); }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${statusFilter === "expected" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
          data-testid="filter-expected-only">Expected</button>
        <button onClick={() => { setStatusFilter("not_coming"); setPage(1); }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${statusFilter === "not_coming" ? "bg-red-600 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
          data-testid="filter-not-coming">Not Coming</button>
      </div>


      {showFilters && (
        <div className="flex flex-wrap gap-3 bg-gray-50 rounded-lg p-3" data-testid="expected-filters">
          <div>
            <label className="text-xs font-medium text-gray-600">Reference Person</label>
            <select className="block border rounded px-2 py-1 text-sm mt-1" value={filterRef} onChange={(e) => setFilterRef(e.target.value)}>
              <option value="">All</option>
              {refPersons.map(rp => <option key={rp.id} value={rp.name}>{rp.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Relation</label>
            <select className="block border rounded px-2 py-1 text-sm mt-1" value={filterRelation} onChange={(e) => setFilterRelation(e.target.value)}>
              <option value="">All</option>
              {["Friends", "In-laws Side", "Other Relatives", "Business Associates", "Other"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button onClick={() => { setFilterRef(""); setFilterRelation(""); }} className="text-xs text-blue-600 self-end pb-1">Clear</button>
        </div>
      )}

      <div className="space-y-2" data-testid="expected-list">
        {loading ? <p className="text-center text-gray-500 py-4">Loading...</p> :
          (() => {
            let filtered = regs;
            if (filterRef) filtered = filtered.filter(r => r.reference_person_name === filterRef);
            if (filterRelation) filtered = filtered.filter(r => r.relation_category === filterRelation);
            return filtered.length === 0 ? <p className="text-center text-gray-400 py-8">No expected guests found</p> :
            filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-4 border hover:shadow-sm transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0B1C3D] truncate">
                    {getHeadName(r)}
                    {r.arrival_status === "not_coming" && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-normal">Not Coming</span>}
                  </p>
                  <p className="text-xs text-gray-500">{r.num_people} people • {r.primary_mobile}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.assigned_swamsevak && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Contact: {r.assigned_swamsevak}</span>
                    )}
                    {(r.room_assignments || []).length > 0 && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Room: {r.room_assignments.join(", ")}</span>
                    )}
                    {r.qr_token && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">QR Ready</span>
                    )}
                    {r.reference_person_name && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Ref: {r.reference_person_name}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap">
                  <button onClick={() => setViewReg(r)} data-testid={`view-expected-${r.id}`}
                    className="bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-blue-100">
                    <Eye size={12} /> View
                  </button>
                  {isSuper && (
                    <>
                      <button onClick={() => setShowAssign(r)} data-testid={`assign-swamsevak-${r.id}`}
                        className="bg-purple-50 text-purple-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-purple-100">
                        <UserPlus size={12} /> Assign
                      </button>
                      <button onClick={() => setShowRoomAssign(r)} data-testid={`assign-room-${r.id}`}
                        className="bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-amber-100">
                        <Hotel size={12} /> Room
                      </button>
                      {r.qr_token ? (
                        <button onClick={() => {
                          const link = document.createElement("a");
                          link.href = `data:image/png;base64,${r.qr_image_b64}`;
                          link.download = `QR_${r.primary_mobile}.png`;
                          link.click();
                        }} data-testid={`download-qr-${r.id}`}
                          className="bg-teal-50 text-teal-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-teal-100">
                          <Download size={12} /> Download QR
                        </button>
                      ) : (
                        <button onClick={() => generateQR(r.id)} data-testid={`generate-qr-${r.id}`}
                          className="bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-green-100">
                          <QrCode size={12} /> Generate QR
                        </button>
                      )}
                      <button onClick={() => setEditReg(r)} data-testid={`edit-expected-${r.id}`}
                        className="bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-indigo-100">
                        <Edit size={12} /> Edit
                      </button>
                      <button onClick={() => deleteEntry(r.id)} data-testid={`delete-expected-${r.id}`}
                        className="bg-red-50 text-red-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-red-100">
                        <Trash2 size={12} /> Delete
                      </button>
                      {r.arrival_status === "not_coming" ? (
                        <button onClick={() => undoNotComing(r.id)} data-testid={`undo-nc-${r.id}`}
                          className="bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-green-100">
                          <Undo2 size={12} /> Restore
                        </button>
                      ) : (
                        <button onClick={() => markNotComing(r.id)} data-testid={`not-coming-${r.id}`}
                          className="bg-orange-50 text-orange-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-orange-100">
                          <Ban size={12} /> Not Coming
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ));
          })()
        }
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-3 py-1 bg-gray-100 rounded text-sm disabled:opacity-50">Prev</button>
          <span className="px-3 py-1 text-sm text-gray-600">Page {page}</span>
          <button onClick={() => setPage(p => p+1)} disabled={regs.length < 20} className="px-3 py-1 bg-gray-100 rounded text-sm disabled:opacity-50">Next</button>
        </div>
      )}

      {/* Full View — QR first, then details */}
      <Dialog open={!!viewReg} onOpenChange={() => setViewReg(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Complete Registration Details</DialogTitle></DialogHeader>
          {viewReg && (
            <>
              {viewReg.qr_image_b64 && (
                <div className="flex flex-col items-center mb-4" data-testid="qr-display-expected">
                  <img src={`data:image/png;base64,${viewReg.qr_image_b64}`} alt="QR Code" className="w-48 h-48 border rounded-xl" />
                  <p className="text-xs text-gray-500 mt-1">QR Code — {viewReg.primary_mobile}</p>
                  <button onClick={() => {
                    const link = document.createElement("a");
                    link.href = `data:image/png;base64,${viewReg.qr_image_b64}`;
                    link.download = `QR_${viewReg.primary_mobile}.png`;
                    link.click();
                  }} className="mt-1 text-xs text-teal-600 hover:underline">Download QR</button>
                </div>
              )}
              <FullRegistrationView reg={viewReg} />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Swamsevak Assignment Dialog */}
      <Dialog open={!!showAssign} onOpenChange={() => setShowAssign(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Swamsevak</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500 mb-3">Assign a first point of contact for: {showAssign && getHeadName(showAssign)}</p>
          <div className="space-y-2">
            {admins.map((a) => (
              <button key={a.username} onClick={() => assignSwamsevak(showAssign.id, a.name || a.username)}                data-testid={`pick-swamsevak-${a.username}`}
                className="w-full text-left bg-gray-50 hover:bg-purple-50 p-3 rounded-lg text-sm transition flex justify-between items-center">
                <span className="font-medium">{a.display_name || a.username}</span>
                <span className="text-xs text-gray-400">{a.role}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Assignment Dialog */}
      <Dialog open={!!showRoomAssign} onOpenChange={() => setShowRoomAssign(null)}>
        <DialogContent className="max-w-sm max-h-[65vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Assign Room</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500 mb-3">Select a room for: <strong>{showRoomAssign && getHeadName(showRoomAssign)}</strong></p>
          <div className="space-y-1.5">
            {rooms.length === 0 && <p className="text-gray-400 text-center py-4">No rooms found. Create rooms first in Room Management.</p>}
            {rooms.map((rm) => {
              const isOccupied = rm.status === "occupied";
              const occupants = rm.occupant_names || [];
              return (
                <button key={rm.room_code}
                  onClick={() => !isOccupied && assignRoom(showRoomAssign.id, rm.room_code)}
                  disabled={isOccupied}
                  className={`w-full text-left p-3 rounded-lg text-sm transition flex justify-between items-start gap-2 ${
                    isOccupied
                      ? "bg-red-50 border border-red-200 opacity-60 cursor-not-allowed"
                      : "bg-gray-50 hover:bg-amber-50 border border-transparent hover:border-amber-200 cursor-pointer"
                  }`}
                  data-testid={`pick-room-${rm.room_code}`}>
                  <div className="min-w-0">
                    <span className="font-medium text-[#0B1C3D]">{rm.room_code}</span>
                    {isOccupied && occupants.length > 0 && (
                      <p className="text-xs text-red-600 truncate mt-0.5">{occupants.join(", ")}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOccupied ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {isOccupied ? "Occupied" : "Available"}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{rm.ac_type || ""} • {rm.capacity} beds</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editReg && <EditRegistrationDialog reg={editReg} onClose={() => setEditReg(null)} onSaved={() => { setEditReg(null); fetchRegs(); }} authHeaders={authHeaders} />}

      {/* Manual Add Dialog */}
      {showManual && <ManualAddDialog onClose={() => { setShowManual(false); fetchRegs(); }} authHeaders={authHeaders} refPersons={refPersons} />}
    </div>
  );
}

function ManualAddDialog({ onClose, authHeaders, refPersons }) {
  const [form, setForm] = useState({
    primary_mobile: "", additional_phone: "", email: "",
    address: { full_address: "", city: "", state: "", country: "India" },
    num_people: 1, attendees: [{ id: "a1", name: "", age: "", special_needs: "" }],
    group_head_id: "a1", attendance_intent: "Yes",
    selected_days: [], expected_arrival_time: "", expected_departure_time: "",
    reference_person_id: "", relation_category: "", message: "", admin_notes: "",
    target_bucket: "expected", travel_mode: "", travel_details: "",
  });
  const [saving, setSaving] = useState(false);
  const [relationCats, setRelationCats] = useState([]);

  useEffect(() => {
    axios.get(`${API}/api/relation-categories/public`).then(r => setRelationCats(r.data)).catch(() => {});
  }, []);

  const updatePeople = (n) => {
    const num = Math.max(1, Math.min(20, parseInt(n) || 1));
    const atts = [];
    for (let i = 0; i < num; i++) {
      atts.push(form.attendees[i] || { id: `a${i+1}`, name: "", age: "", special_needs: "" });
    }
    setForm({ ...form, num_people: num, attendees: atts, group_head_id: atts[0]?.id || "a1" });
  };

  const updateAttendee = (idx, field, val) => {
    const atts = [...form.attendees];
    atts[idx] = { ...atts[idx], [field]: val };
    setForm({ ...form, attendees: atts });
  };

  const save = async () => {
    if (!form.primary_mobile.trim()) { toast.error("Mobile number required"); return; }
    if (form.attendees.some(a => !a.name.trim())) { toast.error("All attendee names required"); return; }
    if (form.attendees.some(a => !a.age)) { toast.error("All attendee ages required"); return; }
    if (form.selected_days.length === 0) { toast.error("Select at least one day"); return; }
    if (!form.expected_arrival_time) { toast.error("Arrival time required"); return; }
    if (!form.expected_departure_time) { toast.error("Departure time required"); return; }
    if (!form.reference_person_id) { toast.error("Reference person required"); return; }
    if (!form.relation_category) { toast.error("Relation required"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/api/admin/registrations/manual`, form, { headers: authHeaders() });
      toast.success("Guest added to Expected list");
      onClose();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  const DAYS = ["2026-05-27","2026-05-28","2026-05-29","2026-05-30","2026-05-31","2026-06-01","2026-06-02","2026-06-03","2026-06-04"];
  const TIME_OPTIONS = [
    "Early Morning (5-8 AM)", "Morning (8-11 AM)", "Afternoon (11 AM-2 PM)",
    "Afternoon (2-5 PM)", "Evening (5-8 PM)", "Night (8-11 PM)", "Late Night (11 PM+)"
  ];
  const RELATION_OPTIONS = relationCats.length > 0 ? relationCats.map(c => c.name) : ["Friends", "In-laws Side", "Other Relatives", "Business Associates", "Other"];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4">
        <h2 className="font-bold text-[#0B1C3D] text-lg">Add Guest (Manual Entry)</h2>

        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2 text-sm col-span-2" placeholder="Primary Mobile (WhatsApp)*" value={form.primary_mobile}
            onChange={(e) => setForm({ ...form, primary_mobile: e.target.value })} data-testid="manual-mobile" />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Additional Phone*" value={form.additional_phone}
            onChange={(e) => setForm({ ...form, additional_phone: e.target.value })} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Full Address*" value={form.address.full_address}
          onChange={(e) => setForm({ ...form, address: { ...form.address, full_address: e.target.value } })} />
        <div className="grid grid-cols-3 gap-3">
          <input className="border rounded px-3 py-2 text-sm" placeholder="City*" value={form.address.city}
            onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="State*" value={form.address.state}
            onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Country*" value={form.address.country}
            onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })} />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Number of People</label>
          <input type="number" min="1" max="20" className="w-full border rounded px-3 py-2 text-sm mt-1"
            value={form.num_people} onChange={(e) => updatePeople(e.target.value)} />
        </div>

        {form.attendees.map((a, i) => (
          <div key={a.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Person {i+1}</span>
              <label className="flex items-center gap-1 text-xs">
                <input type="radio" name="head" checked={form.group_head_id === a.id}
                  onChange={() => setForm({ ...form, group_head_id: a.id })} /> Head
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded px-2 py-1.5 text-sm" placeholder="Name*" value={a.name} onChange={(e) => updateAttendee(i, "name", e.target.value)} />
              <input className="border rounded px-2 py-1.5 text-sm" placeholder="Age*" type="number" value={a.age} onChange={(e) => updateAttendee(i, "age", e.target.value)} />
            </div>
            <input className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Special needs" value={a.special_needs} onChange={(e) => updateAttendee(i, "special_needs", e.target.value)} />
          </div>
        ))}

        <div>
          <label className="text-sm font-medium text-gray-700">Days Present *</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {DAYS.map(d => (
              <button key={d} type="button"
                className={`px-2 py-1 rounded text-xs ${form.selected_days.includes(d) ? "bg-[#0B1C3D] text-white" : "bg-gray-100 text-gray-600"}`}
                onClick={() => setForm({
                  ...form,
                  selected_days: form.selected_days.includes(d) ? form.selected_days.filter(x=>x!==d) : [...form.selected_days, d].sort()
                })}>
                {new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Arrival Time *</label>
            <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.expected_arrival_time}
              onChange={(e) => setForm({ ...form, expected_arrival_time: e.target.value })} data-testid="manual-arrival-time">
              <option value="">Select...</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Departure Time *</label>
            <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.expected_departure_time}
              onChange={(e) => setForm({ ...form, expected_departure_time: e.target.value })} data-testid="manual-departure-time">
              <option value="">Select...</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Reference Person *</label>
            <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.reference_person_id}
              onChange={(e) => setForm({ ...form, reference_person_id: e.target.value })} data-testid="manual-ref-person">
              <option value="">Select...</option>
              {(refPersons || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Relation *</label>
            <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.relation_category}
              onChange={(e) => setForm({ ...form, relation_category: e.target.value })} data-testid="manual-relation">
              <option value="">Select...</option>
              {RELATION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2 text-sm" placeholder="Travel Mode" value={form.travel_mode}
            onChange={(e) => setForm({ ...form, travel_mode: e.target.value })} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Travel Details" value={form.travel_details}
            onChange={(e) => setForm({ ...form, travel_details: e.target.value })} />
        </div>

        <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} placeholder="Message"
          value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />

        <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} placeholder="Admin notes"
          value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} />

        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="flex-1 bg-[#0B1C3D] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50" data-testid="manual-save-btn">
            {saving ? "Adding..." : "Add to Expected List"}
          </button>
          <button onClick={onClose} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
