import { useState, useEffect, useCallback } from "react";
import { Hotel, Plus, Trash2, Download, Users, Layers, UserCheck, Clock } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

const API = process.env.REACT_APP_BACKEND_URL;

const EMPTY_FORM = { room_code: "", floor: "", capacity: 2, ac_type: "Non-AC", notes: "" };

export default function AdminRoomManagement({ user }) {
  const [rooms, setRooms] = useState([]);
  const [regs, setRegs] = useState([]);
  const [refPersons, setRefPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState("single"); // "single" | "bulk"
  const [viewMode, setViewMode] = useState("reference");
  const [form, setForm] = useState(EMPTY_FORM);
  // Bulk create: multiple room codes (one per line), shared settings
  const [bulkCodes, setBulkCodes] = useState("");
  const [bulkSettings, setBulkSettings] = useState({ floor: "", capacity: 2, ac_type: "Non-AC", notes: "" });
  const [vacancyForecast, setVacancyForecast] = useState([]);
  const isSuper = user?.role === "superadmin";

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  }), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomRes, expRes, arrRes, refRes] = await Promise.all([
        axios.get(`${API}/api/admin/rooms`, { headers: authHeaders() }),
        axios.get(`${API}/api/admin/guests/expected`, { headers: authHeaders(), params: { per_page: 500 } }),
        axios.get(`${API}/api/admin/guests/arrived`, { headers: authHeaders(), params: { per_page: 500 } }),
        axios.get(`${API}/api/reference-persons/public`),
      ]);
      setRooms(roomRes.data.data || roomRes.data || []);
      const allGuests = [...(expRes.data.data || []), ...(arrRes.data.data || [])];
      setRegs(allGuests);
      setRefPersons(refRes.data || []);
    } catch {}
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Vacancy forecast
  useEffect(() => {
    axios.get(`${API}/api/admin/room-vacancy-forecast`, { headers: authHeaders() })
      .then(r => setVacancyForecast(r.data?.upcoming_vacancies || []))
      .catch(() => {});
  }, [authHeaders]);

  const parseApiError = (e) => {
    const detail = e.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map(d => d.msg).join(", ");
    return detail || "Failed";
  };

  const createRoom = async () => {
    if (!form.room_code.trim()) { toast.error("Room number is required"); return; }
    try {
      await axios.post(`${API}/api/admin/rooms`, form, { headers: authHeaders() });
      toast.success("Room created");
      setShowAdd(false);
      setForm(EMPTY_FORM);
      fetchData();
    } catch (e) { toast.error(parseApiError(e)); }
  };

  const createBulkRooms = async () => {
    const codes = bulkCodes.split("\n").map(c => c.trim()).filter(Boolean);
    if (codes.length === 0) { toast.error("Enter at least one room number"); return; }
    const rooms = codes.map(code => ({ room_code: code, ...bulkSettings }));
    try {
      const res = await axios.post(`${API}/api/admin/rooms/bulk`, { rooms }, { headers: authHeaders() });
      const { created, errors: errs } = res.data;
      toast.success(`${created} room(s) created`);
      if (errs?.length) toast.error(`Skipped: ${errs.join("; ")}`);
      setShowAdd(false);
      setBulkCodes("");
      setBulkSettings({ floor: "", capacity: 2, ac_type: "Non-AC", notes: "" });
      fetchData();
    } catch (e) { toast.error(parseApiError(e)); }
  };

  const deleteRoom = async (code) => {
    if (!window.confirm(`Delete room ${code}?`)) return;
    try {
      await axios.delete(`${API}/api/admin/rooms/${code}`, { headers: authHeaders() });
      toast.success("Room deleted");
      fetchData();
    } catch (e) { toast.error(parseApiError(e)); }
  };

  const exportPDF = () => {
    const params = new URLSearchParams({ report_type: "rooms", token: localStorage.getItem("admin_token") });
    window.open(`${API}/api/admin/export-pdf?${params}`, "_blank");
  };

  const [transferDialog, setTransferDialog] = useState(null); // { roomCode, occupant }

  // Reference person lookup: id -> { name, relation_categories }
  const refById = {};
  const refByName = {};
  (refPersons || []).forEach(rp => {
    const data = { name: rp.name, categories: rp.relation_categories || [] };
    if (rp.id) refById[rp.id] = data;
    if (rp.name) refByName[rp.name] = data;
  });

  // Build occupant map from registrations
  const roomOccupants = {};
  regs.forEach(r => {
    (r.room_assignments || []).forEach(code => {
      if (!roomOccupants[code]) roomOccupants[code] = [];
      const head = (r.attendees || []).find(a => a.id === r.group_head_id);
      const familyName = r.family_name || head?.name || r.primary_mobile;
      // Resolve reference person name (registration might only carry the UUID on legacy data)
      const refLookup = refById[r.reference_person_id] || refByName[r.reference_person_name] || null;
      const refName = r.reference_person_name || refLookup?.name || "";
      const refCategories = refLookup?.categories || [];
      // For Room Management view ONLY: hide attendees marked absent (not_arrived / not_coming)
      // from families that have already checked in. Pre-arrival families keep showing everyone.
      const familyHasArrived = ["arrived", "partially_arrived", "departed"].includes(r.arrival_status);
      const visibleAttendees = (r.attendees || []).filter(att => {
        if (!familyHasArrived) return true; // pre-arrival — show all expected
        return !["not_arrived", "not_coming"].includes(att.arrival_status || "not_arrived");
      });
      const visibleNum = familyHasArrived ? visibleAttendees.length : r.num_people;
      roomOccupants[code].push({
        name: head?.name || r.primary_mobile,
        familyName,
        num: visibleNum,
        ref: refName,
        refCategories,
        relation: r.relation_category || "",
        swamsevak: r.assigned_swamsevak || "",
        regId: r.id,
        departureDate: r.departure_date || r.expected_departure_time || "",
        notes: r.admin_notes || "",
        mobile: r.primary_mobile || "",
        attendees: visibleAttendees,
        group_head_id: r.group_head_id,
      });
    });
  });

  // Group rooms by different views
  const groupRooms = () => {
    if (viewMode === "floor") {
      const groups = {};
      rooms.forEach(r => {
        const key = `Floor ${r.floor}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      });
      return groups;
    }
    if (viewMode === "swamsevak") {
      const groups = { "Unassigned": [] };
      rooms.forEach(r => {
        const occupants = roomOccupants[r.room_code] || [];
        if (occupants.length === 0) {
          groups["Unassigned"].push(r);
        } else {
          occupants.forEach(occ => {
            const key = occ.swamsevak || "Unassigned Swayamsevak";
            if (!groups[key]) groups[key] = [];
            if (!groups[key].find(rm => rm.room_code === r.room_code)) groups[key].push(r);
          });
        }
      });
      if (groups["Unassigned"].length === 0) delete groups["Unassigned"];
      return groups;
    }
    return {};
  };

  // Reference view: nested structure {refName: {categories:[], flat:[], byRelation:{relName:[rooms]}}}
  const buildReferenceGroups = () => {
    const groups = {};
    const unassigned = [];
    rooms.forEach(r => {
      const occupants = roomOccupants[r.room_code] || [];
      if (occupants.length === 0) {
        unassigned.push(r);
        return;
      }
      occupants.forEach(occ => {
        const refName = occ.ref?.trim();
        if (!refName) {
          // Room without a reference person
          if (!groups.__NO_REF__) groups.__NO_REF__ = { name: "No Reference Person", categories: [], flat: [], byRelation: {} };
          if (!groups.__NO_REF__.flat.find(rm => rm.room_code === r.room_code)) groups.__NO_REF__.flat.push(r);
          return;
        }
        if (!groups[refName]) {
          groups[refName] = { name: refName, categories: occ.refCategories || [], flat: [], byRelation: {} };
        }
        const categories = groups[refName].categories;
        if (!categories || categories.length === 0) {
          // No subcategories — flat bucket under this reference person
          if (!groups[refName].flat.find(rm => rm.room_code === r.room_code)) groups[refName].flat.push(r);
        } else {
          // Bucket by relation_category (if it matches one of the configured categories; otherwise "Other")
          const rel = (occ.relation || "").trim();
          const bucketName = rel && categories.includes(rel) ? rel : (rel || "Other");
          if (!groups[refName].byRelation[bucketName]) groups[refName].byRelation[bucketName] = [];
          if (!groups[refName].byRelation[bucketName].find(rm => rm.room_code === r.room_code)) {
            groups[refName].byRelation[bucketName].push(r);
          }
        }
      });
    });
    if (unassigned.length) groups.__UNASSIGNED__ = { name: "Unassigned (vacant rooms)", categories: [], flat: unassigned, byRelation: {} };
    return groups;
  };

  const grouped = viewMode === "reference" ? null : groupRooms();
  const referenceGrouped = viewMode === "reference" ? buildReferenceGroups() : null;

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="room-management">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl font-bold text-[#0B1C3D]">Room Management</h1>
        <div className="flex gap-2 flex-wrap">
          {isSuper && (
            <button onClick={() => setShowAdd(true)} data-testid="add-room-btn"
              className="bg-[#0B1C3D] text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1">
              <Plus size={14} /> Add Room
            </button>
          )}
          <button onClick={exportPDF} data-testid="export-pdf"
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200">
            <Download size={14} /> PDF
          </button>
          <button onClick={() => { window.open(`${API}/api/admin/export-csv?bucket=rooms&token=${localStorage.getItem("admin_token")}`, "_blank"); }}
            data-testid="export-rooms-csv"
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1" data-testid="room-view-toggle">
        <button onClick={() => setViewMode("reference")} data-testid="view-reference"
          className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition ${viewMode === "reference" ? "bg-white shadow font-medium text-[#0B1C3D]" : "text-gray-600 hover:bg-gray-50"}`}>
          <Users size={14} /> Reference Person
        </button>
        <button onClick={() => setViewMode("floor")} data-testid="view-floor"
          className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition ${viewMode === "floor" ? "bg-white shadow font-medium text-[#0B1C3D]" : "text-gray-600 hover:bg-gray-50"}`}>
          <Layers size={14} /> Floor-wise
        </button>
        <button onClick={() => setViewMode("swamsevak")} data-testid="view-swamsevak"
          className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition ${viewMode === "swamsevak" ? "bg-white shadow font-medium text-[#0B1C3D]" : "text-gray-600 hover:bg-gray-50"}`}>
          <UserCheck size={14} /> Swayamsevak-wise
        </button>
      </div>

      {/* Enhanced Summary Stats */}
      {(() => {
        const total = rooms.length;
        const occupied = rooms.filter(r => r.status === "occupied").length;
        const available = total - occupied;
        const acTotal = rooms.filter(r => r.ac_type === "AC").length;
        const acOccupied = rooms.filter(r => r.ac_type === "AC" && r.status === "occupied").length;
        const nonAcTotal = rooms.filter(r => r.ac_type !== "AC").length;
        const nonAcOccupied = rooms.filter(r => r.ac_type !== "AC" && r.status === "occupied").length;
        const capMap = {};
        rooms.forEach(r => {
          const c = r.capacity || 0;
          if (!capMap[c]) capMap[c] = { total: 0, occupied: 0 };
          capMap[c].total++;
          if (r.status === "occupied") capMap[c].occupied++;
        });
        const capacities = Object.entries(capMap).sort((a, b) => Number(a[0]) - Number(b[0]));
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 border text-center">
                <p className="text-2xl font-bold text-[#0B1C3D]">{total}</p>
                <p className="text-xs text-gray-500">Total Rooms</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
                <p className="text-2xl font-bold text-green-700">{available}</p>
                <p className="text-xs text-green-600">Available</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-center">
                <p className="text-2xl font-bold text-red-700">{occupied}</p>
                <p className="text-xs text-red-600">Occupied</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                <p className="text-xs font-semibold text-blue-800 mb-1">❄ AC Rooms</p>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Total: <strong>{acTotal}</strong></span>
                  <span className="text-blue-600">Occupied: <strong>{acOccupied}</strong></span>
                  <span className="text-green-600">Free: <strong>{acTotal - acOccupied}</strong></span>
                </div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                <p className="text-xs font-semibold text-amber-800 mb-1">☀ Non-AC Rooms</p>
                <div className="flex justify-between text-sm">
                  <span className="text-amber-700">Total: <strong>{nonAcTotal}</strong></span>
                  <span className="text-amber-600">Occupied: <strong>{nonAcOccupied}</strong></span>
                  <span className="text-green-600">Free: <strong>{nonAcTotal - nonAcOccupied}</strong></span>
                </div>
              </div>
            </div>
            {capacities.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 border">
                <p className="text-xs font-semibold text-gray-700 mb-2">📊 By Capacity</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {capacities.map(([cap, v]) => (
                    <div key={cap} className="bg-white rounded-lg p-2 border text-center">
                      <p className="text-xs text-gray-500">{cap}-Person</p>
                      <p className="text-sm font-bold text-[#0B1C3D]">{v.occupied}/{v.total}</p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div className="bg-[#0B1C3D] h-1.5 rounded-full" style={{width: `${v.total > 0 ? (v.occupied/v.total*100) : 0}%`}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Near-Future Vacancy Insights */}
      {vacancyForecast.length > 0 && rooms.filter(r => r.status === "available").length === 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4" data-testid="vacancy-forecast">
          <h3 className="font-semibold text-amber-800 text-sm flex items-center gap-2 mb-2">
            <Clock size={14} /> Upcoming Vacancies (Next 3 Days)
          </h3>
          <div className="space-y-1">
            {vacancyForecast.slice(0, 8).map((v, i) => (
              <div key={i} className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2">
                <span className="text-[#0B1C3D] font-medium">{v.rooms?.join(", ")}</span>
                <span className="text-xs text-gray-500">{v.head_name} departing {v.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-500 text-center py-4">Loading...</p> : (
        <div className="space-y-6" data-testid="room-groups">
          {viewMode !== "reference" && Object.entries(grouped || {}).map(([groupName, groupRooms]) => (
            <div key={groupName}>
              <h3 className="font-semibold text-[#0B1C3D] text-sm mb-2 flex items-center gap-2">
                {viewMode === "swamsevak" && <UserCheck size={14} className="text-purple-600" />}
                {viewMode === "floor" && <Layers size={14} className="text-blue-600" />}
                {groupName}
                <span className="text-xs text-gray-400">({groupRooms.length} rooms)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {groupRooms.map(rm => (
                  <RoomCard key={rm.room_code} rm={rm} roomOccupants={roomOccupants} isSuper={isSuper}
                    onTransfer={setTransferDialog} onDelete={deleteRoom} />
                ))}
              </div>
            </div>
          ))}

          {viewMode === "reference" && Object.entries(referenceGrouped || {})
            .sort(([a], [b]) => {
              // push the synthetic buckets to the bottom
              if (a.startsWith("__")) return 1;
              if (b.startsWith("__")) return -1;
              return a.localeCompare(b);
            })
            .map(([key, bucket]) => {
            const isSynthetic = key.startsWith("__");
            const totalRoomsInBucket = bucket.flat.length + Object.values(bucket.byRelation).reduce((s, arr) => s + arr.length, 0);
            const hasSubs = Object.keys(bucket.byRelation).length > 0;
            return (
              <div key={key} className={`rounded-2xl p-4 ${isSynthetic ? "bg-gray-50 border border-gray-200" : "bg-amber-50/60 border border-amber-200"}`}
                data-testid={`ref-bucket-${key}`}>
                <h3 className={`font-bold text-base flex items-center gap-2 mb-3 ${isSynthetic ? "text-gray-500" : "text-[#0B1C3D]"}`}>
                  <Users size={16} className={isSynthetic ? "text-gray-400" : "text-amber-700"} />
                  {bucket.name}
                  <span className="text-xs font-normal text-gray-400">({totalRoomsInBucket} rooms)</span>
                </h3>

                {/* Flat rooms (reference person without categories OR unassigned) */}
                {bucket.flat.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-2">
                    {bucket.flat.map(rm => (
                      <RoomCard key={rm.room_code} rm={rm} roomOccupants={roomOccupants} isSuper={isSuper}
                        onTransfer={setTransferDialog} onDelete={deleteRoom} />
                    ))}
                  </div>
                )}

                {/* Relation subgroups (reference person with categories) */}
                {hasSubs && Object.entries(bucket.byRelation).sort(([a], [b]) => a.localeCompare(b)).map(([relName, relRooms]) => (
                  <div key={relName} className="mt-3 bg-white/60 rounded-xl p-3 border border-amber-100" data-testid={`ref-${key}-rel-${relName}`}>
                    <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <span className="inline-block w-1 h-3 bg-amber-400 rounded-full"></span>
                      {relName}
                      <span className="text-[10px] font-normal text-gray-400 normal-case">({relRooms.length})</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {relRooms.map(rm => (
                        <RoomCard key={rm.room_code} rm={rm} roomOccupants={roomOccupants} isSuper={isSuper}
                          onTransfer={setTransferDialog} onDelete={deleteRoom} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {viewMode !== "reference" && Object.keys(grouped || {}).length === 0 && <p className="text-gray-400 text-center py-8">No rooms found</p>}
          {viewMode === "reference" && Object.keys(referenceGrouped || {}).length === 0 && <p className="text-gray-400 text-center py-8">No rooms found</p>}
        </div>
      )}

      {/* Add Room Dialog */}
      <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) { setForm(EMPTY_FORM); setBulkCodes(""); setAddMode("single"); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Room(s)</DialogTitle></DialogHeader>

          {/* Mode Toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-1">
            <button onClick={() => setAddMode("single")}
              className={`flex-1 py-1.5 rounded-md text-sm transition ${addMode === "single" ? "bg-white shadow font-medium text-[#0B1C3D]" : "text-gray-500"}`}
              data-testid="add-room-single-tab">
              Single Room
            </button>
            <button onClick={() => setAddMode("bulk")}
              className={`flex-1 py-1.5 rounded-md text-sm transition ${addMode === "bulk" ? "bg-white shadow font-medium text-[#0B1C3D]" : "text-gray-500"}`}
              data-testid="add-room-bulk-tab">
              Bulk Create
            </button>
          </div>

          {addMode === "single" ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Room Number *</label>
                <input className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. 101, A-12, G-3"
                  value={form.room_code} onChange={(e) => setForm({ ...form, room_code: e.target.value })}
                  data-testid="room-code-input" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">AC / Non-AC</label>
                <select className="w-full border rounded px-3 py-2 text-sm bg-white"
                  value={form.ac_type} onChange={(e) => setForm({ ...form, ac_type: e.target.value })}
                  data-testid="room-ac-select">
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Number of Beds</label>
                <input type="number" min={1} max={20} className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="2" value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
                  data-testid="room-capacity-input" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Floor (optional)</label>
                <input className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. Ground, 1, 2"
                  value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  data-testid="room-floor-input" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Other Notes</label>
                <textarea className="w-full border rounded px-3 py-2 text-sm resize-none" rows={2}
                  placeholder="e.g. Corner room, attached bathroom..."
                  value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  data-testid="room-notes-input" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={createRoom} className="flex-1 bg-[#0B1C3D] text-white py-2 rounded-lg text-sm font-medium" data-testid="create-room-btn">Create Room</button>
                <button onClick={() => setShowAdd(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Room Numbers (one per line) *</label>
                <textarea className="w-full border rounded px-3 py-2 text-sm resize-none" rows={5}
                  placeholder={"101\n102\n103\nA-1\nB-2"}
                  value={bulkCodes} onChange={(e) => setBulkCodes(e.target.value)}
                  data-testid="bulk-room-codes-input" />
                <p className="text-xs text-gray-400 mt-0.5">{bulkCodes.split("\n").filter(c => c.trim()).length} room(s) listed</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">AC / Non-AC</label>
                  <select className="w-full border rounded px-3 py-2 text-sm bg-white"
                    value={bulkSettings.ac_type} onChange={(e) => setBulkSettings(s => ({ ...s, ac_type: e.target.value }))}
                    data-testid="bulk-ac-select">
                    <option value="AC">AC</option>
                    <option value="Non-AC">Non-AC</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Beds per Room</label>
                  <input type="number" min={1} max={20} className="w-full border rounded px-3 py-2 text-sm"
                    value={bulkSettings.capacity}
                    onChange={(e) => setBulkSettings(s => ({ ...s, capacity: parseInt(e.target.value) || 1 }))}
                    data-testid="bulk-capacity-input" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Floor (optional, same for all)</label>
                <input className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. Ground, 1, 2"
                  value={bulkSettings.floor} onChange={(e) => setBulkSettings(s => ({ ...s, floor: e.target.value }))}
                  data-testid="bulk-floor-input" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes (same for all)</label>
                <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Optional shared notes"
                  value={bulkSettings.notes} onChange={(e) => setBulkSettings(s => ({ ...s, notes: e.target.value }))}
                  data-testid="bulk-notes-input" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={createBulkRooms} className="flex-1 bg-[#0B1C3D] text-white py-2 rounded-lg text-sm font-medium" data-testid="create-bulk-rooms-btn">
                  Create {bulkCodes.split("\n").filter(c => c.trim()).length || ""} Room(s)
                </button>
                <button onClick={() => setShowAdd(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Transfer Room Dialog */}
      <Dialog open={!!transferDialog} onOpenChange={() => setTransferDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Transfer Room</DialogTitle></DialogHeader>
          {transferDialog && (
            <TransferRoomForm
              fromRoom={transferDialog.roomCode}
              occupants={transferDialog.occupants}
              allRooms={rooms}
              authHeaders={authHeaders}
              onDone={() => { setTransferDialog(null); fetchData(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransferRoomForm({ fromRoom, occupants, allRooms, authHeaders, onDone }) {
  const [targetRoom, setTargetRoom] = useState("");
  const [regId, setRegId] = useState(occupants[0]?.regId || "");
  const [loading, setLoading] = useState(false);
  const availableRooms = allRooms.filter(r => r.status === "available" && r.room_code !== fromRoom);

  const doTransfer = async () => {
    if (!targetRoom) { toast.error("Select a target room"); return; }
    if (!regId) { toast.error("Select which family to transfer"); return; }
    setLoading(true);
    try {
      await axios.put(`${API}/api/admin/rooms/${fromRoom}/shift`, { new_room_code: targetRoom, registration_id: regId }, { headers: authHeaders() });
      toast.success(`Transferred to ${targetRoom}`);
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Transfer failed"); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">From Room: <strong>{fromRoom}</strong></p>
        {occupants.length > 1 && (
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">Select family to transfer</label>
            <select value={regId} onChange={e => setRegId(e.target.value)} className="border rounded-lg p-2 w-full text-sm" data-testid="transfer-family-select">
              {occupants.map(o => <option key={o.regId} value={o.regId}>{o.name} ({o.num}p)</option>)}
            </select>
          </div>
        )}
        <label className="text-xs text-gray-500 mb-1 block">Move to Room</label>
        {availableRooms.length === 0 ? (
          <p className="text-sm text-red-600">No available rooms to transfer to.</p>
        ) : (
          <select value={targetRoom} onChange={e => setTargetRoom(e.target.value)} className="border rounded-lg p-2 w-full text-sm" data-testid="transfer-target-select">
            <option value="">-- Select empty room --</option>
            {availableRooms.map(r => <option key={r.room_code} value={r.room_code}>Room {r.room_code} (Floor {r.floor}, {r.ac_type})</option>)}
          </select>
        )}
      </div>
      <button onClick={doTransfer} disabled={loading || !targetRoom || availableRooms.length === 0}
        className="w-full bg-[#0B1C3D] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        data-testid="confirm-transfer-btn">
        {loading ? "Transferring..." : "Confirm Transfer"}
      </button>
    </div>
  );
}

/**
 * Single room card used by every view mode.
 * Extracted so that the reference view can reuse it inside nested subgroup containers
 * without duplicating the layout.
 */
function RoomCard({ rm, roomOccupants, isSuper, onTransfer, onDelete }) {
  const occupants = roomOccupants[rm.room_code] || [];
  const isOccupied = rm.status === "occupied";
  const getVacancyLabel = (depDate) => {
    if (!depDate) return null;
    const dateStr = depDate.split("T")[0];
    const today = new Date(); today.setHours(0,0,0,0);
    const dep = new Date(dateStr + "T00:00:00");
    const diff = Math.ceil((dep - today) / 86400000);
    if (diff < 0) return { label: "Overdue", className: "text-red-700 bg-red-100" };
    if (diff === 0) return { label: "Departing today", className: "text-orange-700 bg-orange-100" };
    if (diff === 1) return { label: "Vacant tomorrow", className: "text-amber-700 bg-amber-100" };
    return { label: `Vacant in ${diff} days`, className: "text-blue-700 bg-blue-100" };
  };
  return (
    <div className={`rounded-xl p-3 border-2 transition ${isOccupied ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}
      data-testid={`room-${rm.room_code}`}>
      <div className="flex justify-between items-start mb-1">
        <span className="font-bold text-sm text-[#0B1C3D]">{rm.room_code}</span>
        <div className="flex items-center gap-1">
          {isSuper && isOccupied && (
            <button onClick={() => onTransfer({ roomCode: rm.room_code, occupants })}
              className="text-blue-400 hover:text-blue-600 text-xs px-1.5 py-0.5 bg-blue-50 rounded border border-blue-200"
              data-testid={`transfer-room-${rm.room_code}`} title="Transfer room">
              Transfer
            </button>
          )}
          {isSuper && !isOccupied && (
            <button onClick={() => onDelete(rm.room_code)} className="text-red-400 hover:text-red-600" data-testid={`delete-room-${rm.room_code}`}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500">
        {rm.ac_type || "Non-AC"} · {occupants.reduce((s, o) => s + o.num, 0)}/{rm.capacity} beds
      </p>
      {rm.floor && <p className="text-xs text-gray-400">Floor {rm.floor}</p>}
      {rm.notes && <p className="text-xs text-gray-400 italic truncate">{rm.notes}</p>}
      {occupants.length > 0 && (
        <div className="mt-1.5 space-y-2">
          {occupants.map((o, i) => {
            const vac = o.departureDate ? getVacancyLabel(o.departureDate) : null;
            return (
              <div key={i} className="text-xs">
                <p className="font-medium text-[#0B1C3D] truncate">{o.name} <span className="font-normal text-gray-500">({o.num}p)</span></p>
                {o.mobile && <p className="text-gray-500 truncate">📞 {o.mobile}</p>}
                {(o.attendees || []).length > 1 && (
                  <div className="ml-2 mt-0.5 space-y-0.5">
                    {o.attendees.map(att => (
                      <p key={att.id} className={`text-[10px] truncate ${att.id === o.group_head_id ? "text-amber-700 font-semibold" : "text-gray-500"}`}>
                        {att.id === o.group_head_id ? "★ " : "· "}{att.name}{att.age ? ` (${att.age}y)` : ""}{att.special_needs ? ` [${att.special_needs}]` : ""}
                      </p>
                    ))}
                  </div>
                )}
                {o.swamsevak && <p className="text-purple-600 truncate">Contact: {o.swamsevak}</p>}
                {o.notes && <p className="text-gray-400 italic truncate">{o.notes}</p>}
                {o.departureDate && (
                  <p className="text-gray-400 mt-0.5">Departs: <span className="font-medium text-gray-600">{o.departureDate.split("T")[0]}</span></p>
                )}
                {vac && (
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-semibold ${vac.className}`} data-testid={`vacancy-label-${rm.room_code}`}>
                    {vac.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${isOccupied ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
        {isOccupied ? `Occupied` : "Available"}
      </span>
    </div>
  );
}
