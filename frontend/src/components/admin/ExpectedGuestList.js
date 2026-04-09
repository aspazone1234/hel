import { useState, useEffect, useCallback } from "react";
import { Eye, Plus, Search, QrCode, Hotel, UserPlus, Download } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { FullRegistrationView } from "./PendingApproval";

const API = process.env.REACT_APP_BACKEND_URL;

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
  const [admins, setAdmins] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterRef, setFilterRef] = useState("");
  const [filterRelation, setFilterRelation] = useState("");
  const [refPersons, setRefPersons] = useState([]);
  const isSuper = user?.role === "superadmin";

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  }), []);

  const fetchRegs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/guests/expected`, {
        headers: authHeaders(), params: { search, page, per_page: 20 }
      });
      setRegs(data.data || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  }, [authHeaders, search, page]);

  const fetchAdmins = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/admin/admins`, { headers: authHeaders() });
      setAdmins(data);
    } catch {}
  }, [authHeaders]);

  const fetchRooms = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/admin/rooms`, { headers: authHeaders() });
      setRooms(data.data || []);
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
          <button onClick={exportCSV} data-testid="export-csv"
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200">
            <Download size={14} /> Export
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
                  <p className="font-semibold text-[#0B1C3D] truncate">{getHeadName(r)}</p>
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
                      <button onClick={() => generateQR(r.id)} data-testid={`generate-qr-${r.id}`}
                        className="bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-green-100">
                        <QrCode size={12} /> QR
                      </button>
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

      {/* Full View */}
      <Dialog open={!!viewReg} onOpenChange={() => setViewReg(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Complete Registration Details</DialogTitle></DialogHeader>
          {viewReg && <FullRegistrationView reg={viewReg} />}
        </DialogContent>
      </Dialog>

      {/* Swamsevak Assignment Dialog */}
      <Dialog open={!!showAssign} onOpenChange={() => setShowAssign(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Swamsevak</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500 mb-3">Assign a first point of contact for: {showAssign && getHeadName(showAssign)}</p>
          <div className="space-y-2">
            {admins.map((a) => (
              <button key={a.username} onClick={() => assignSwamsevak(showAssign.id, a.display_name || a.username)}
                data-testid={`pick-swamsevak-${a.username}`}
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
        <DialogContent className="max-w-sm max-h-[60vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Assign Room</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500 mb-3">Available rooms for: {showRoomAssign && getHeadName(showRoomAssign)}</p>
          <div className="space-y-2">
            {rooms.filter(rm => rm.status === "available").map((rm) => (
              <button key={rm.room_code} onClick={() => assignRoom(showRoomAssign.id, rm.room_code)}
                className="w-full text-left bg-gray-50 hover:bg-amber-50 p-3 rounded-lg text-sm transition flex justify-between items-center">
                <span className="font-medium">{rm.room_code}</span>
                <span className="text-xs text-gray-400">Floor {rm.floor} • Cap: {rm.capacity}</span>
              </button>
            ))}
            {rooms.filter(rm => rm.status === "available").length === 0 && (
              <p className="text-gray-400 text-center py-4">No available rooms</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Add Dialog */}
      {showManual && <ManualAddDialog onClose={() => { setShowManual(false); fetchRegs(); }} authHeaders={authHeaders} />}
    </div>
  );
}

function ManualAddDialog({ onClose, authHeaders }) {
  const [form, setForm] = useState({
    primary_mobile: "", additional_phone: "", email: "", preferred_language: "hi",
    address: { full_address: "", city: "", state: "", country: "India" },
    num_people: 1, attendees: [{ id: "a1", name: "", age: "", special_needs: "" }],
    group_head_id: "a1", family_special_request: "", attendance_intent: "Yes",
    selected_days: [], expected_arrival_time: "", expected_departure_time: "",
    reference_person_id: "", relation_category: "", message: "", admin_notes: "",
    target_bucket: "expected", travel_mode: "", travel_details: "",
  });
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      await axios.post(`${API}/api/admin/registrations/manual`, form, { headers: authHeaders() });
      toast.success("Guest added to Expected list");
      onClose();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  const DAYS = ["2026-05-27","2026-05-28","2026-05-29","2026-05-30","2026-05-31","2026-06-01","2026-06-02","2026-06-03","2026-06-04"];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4">
        <h2 className="font-bold text-[#0B1C3D] text-lg">Add Guest (Manual Entry)</h2>

        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2 text-sm col-span-2" placeholder="Primary Mobile*" value={form.primary_mobile}
            onChange={(e) => setForm({ ...form, primary_mobile: e.target.value })} />
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
              <input className="border rounded px-2 py-1.5 text-sm" placeholder="Age" type="number" value={a.age} onChange={(e) => updateAttendee(i, "age", e.target.value)} />
            </div>
            <input className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Special needs" value={a.special_needs} onChange={(e) => updateAttendee(i, "special_needs", e.target.value)} />
          </div>
        ))}

        <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} placeholder="Family special request"
          value={form.family_special_request} onChange={(e) => setForm({ ...form, family_special_request: e.target.value })} />

        <div>
          <label className="text-sm font-medium text-gray-700">Days Present</label>
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
          <input className="border rounded px-3 py-2 text-sm" placeholder="Arrival Time" value={form.expected_arrival_time}
            onChange={(e) => setForm({ ...form, expected_arrival_time: e.target.value })} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Departure Time" value={form.expected_departure_time}
            onChange={(e) => setForm({ ...form, expected_departure_time: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2 text-sm" placeholder="Travel Mode" value={form.travel_mode}
            onChange={(e) => setForm({ ...form, travel_mode: e.target.value })} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Travel Details" value={form.travel_details}
            onChange={(e) => setForm({ ...form, travel_details: e.target.value })} />
        </div>

        <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} placeholder="Admin notes"
          value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} />

        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="flex-1 bg-[#0B1C3D] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? "Adding..." : "Add to Expected List"}
          </button>
          <button onClick={onClose} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
