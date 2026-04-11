import { useState, useEffect, useCallback } from "react";
import { Hotel, Plus, Trash2, Download, Users, Layers, UserCheck, Clock } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

const API = process.env.REACT_APP_BACKEND_URL;

export default function AdminRoomManagement({ user }) {
  const [rooms, setRooms] = useState([]);
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [viewMode, setViewMode] = useState("floor");
  const [form, setForm] = useState({ room_code: "", floor: 1, capacity: 4 });
  const [vacancyForecast, setVacancyForecast] = useState([]);
  const isSuper = user?.role === "superadmin";

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  }), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomRes, regRes] = await Promise.all([
        axios.get(`${API}/api/admin/rooms`, { headers: authHeaders() }),
        axios.get(`${API}/api/admin/guests/expected`, { headers: authHeaders(), params: { per_page: 500 } }),
      ]);
      setRooms(roomRes.data.data || []);
      setRegs(regRes.data.data || []);
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

  const createRoom = async () => {
    try {
      await axios.post(`${API}/api/admin/rooms`, form, { headers: authHeaders() });
      toast.success("Room created");
      setShowAdd(false);
      setForm({ room_code: "", floor: 1, capacity: 4 });
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const deleteRoom = async (code) => {
    if (!window.confirm(`Delete room ${code}?`)) return;
    try {
      await axios.delete(`${API}/api/admin/rooms/${code}`, { headers: authHeaders() });
      toast.success("Room deleted");
      fetchData();
    } catch { toast.error("Failed"); }
  };

  const exportPDF = async () => {
    try {
      const resp = await axios.get(`${API}/api/admin/export-pdf`, { headers: authHeaders(), responseType: "blob" });
      const url = window.URL.createObjectURL(resp.data);
      const a = document.createElement("a"); a.href = url; a.download = "rooms.pdf"; a.click();
    } catch { toast.error("Export failed"); }
  };

  // Build occupant map from registrations
  const roomOccupants = {};
  regs.forEach(r => {
    (r.room_assignments || []).forEach(code => {
      if (!roomOccupants[code]) roomOccupants[code] = [];
      const head = (r.attendees || []).find(a => a.id === r.group_head_id);
      roomOccupants[code].push({
        name: head?.name || r.primary_mobile,
        num: r.num_people,
        ref: r.reference_person_name || "",
        relation: r.relation_category || "",
        swamsevak: r.assigned_swamsevak || "",
        regId: r.id,
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
    if (viewMode === "reference") {
      const groups = { "Unassigned": [] };
      rooms.forEach(r => {
        const occupants = roomOccupants[r.room_code] || [];
        if (occupants.length === 0) {
          groups["Unassigned"].push(r);
        } else {
          occupants.forEach(occ => {
            const key = occ.ref || "No Reference Person";
            if (!groups[key]) groups[key] = [];
            if (!groups[key].find(rm => rm.room_code === r.room_code)) groups[key].push(r);
          });
        }
      });
      if (groups["Unassigned"].length === 0) delete groups["Unassigned"];
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
            const key = occ.swamsevak || "Unassigned Swamsevak";
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

  const grouped = groupRooms();

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
        <button onClick={() => setViewMode("floor")} data-testid="view-floor"
          className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition ${viewMode === "floor" ? "bg-white shadow font-medium text-[#0B1C3D]" : "text-gray-600 hover:bg-gray-50"}`}>
          <Layers size={14} /> Floor-wise
        </button>
        <button onClick={() => setViewMode("reference")} data-testid="view-reference"
          className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition ${viewMode === "reference" ? "bg-white shadow font-medium text-[#0B1C3D]" : "text-gray-600 hover:bg-gray-50"}`}>
          <Users size={14} /> Reference Person
        </button>
        <button onClick={() => setViewMode("swamsevak")} data-testid="view-swamsevak"
          className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition ${viewMode === "swamsevak" ? "bg-white shadow font-medium text-[#0B1C3D]" : "text-gray-600 hover:bg-gray-50"}`}>
          <UserCheck size={14} /> Swamsevak-wise
        </button>
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <span className="text-gray-600">Total: <strong>{rooms.length}</strong></span>
        <span className="text-green-600">Available: <strong>{rooms.filter(r => r.status === "available").length}</strong></span>
        <span className="text-red-600">Occupied: <strong>{rooms.filter(r => r.status === "occupied").length}</strong></span>
      </div>

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
          {Object.entries(grouped).map(([groupName, groupRooms]) => (
            <div key={groupName}>
              <h3 className="font-semibold text-[#0B1C3D] text-sm mb-2 flex items-center gap-2">
                {viewMode === "reference" && <Users size={14} className="text-amber-600" />}
                {viewMode === "swamsevak" && <UserCheck size={14} className="text-purple-600" />}
                {viewMode === "floor" && <Layers size={14} className="text-blue-600" />}
                {groupName}
                <span className="text-xs text-gray-400">({groupRooms.length} rooms)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {groupRooms.map((rm) => {
                  const occupants = roomOccupants[rm.room_code] || [];
                  const isOccupied = rm.status === "occupied";
                  return (
                    <div key={rm.room_code}
                      className={`rounded-xl p-3 border-2 transition ${isOccupied ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}
                      data-testid={`room-${rm.room_code}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-[#0B1C3D]">{rm.room_code}</span>
                        {isSuper && !isOccupied && (
                          <button onClick={() => deleteRoom(rm.room_code)} className="text-red-400 hover:text-red-600" data-testid={`delete-room-${rm.room_code}`}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Cap: {rm.capacity} • Floor {rm.floor}</p>
                      {occupants.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {occupants.map((o, i) => (
                            <div key={i} className="text-xs">
                              <p className="font-medium text-[#0B1C3D] truncate">{o.name}</p>
                              {o.ref && <p className="text-amber-600 truncate">Ref: {o.ref}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                      <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${isOccupied ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {isOccupied ? "Occupied" : "Available"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && <p className="text-gray-400 text-center py-8">No rooms found</p>}
        </div>
      )}

      {/* Add Room Dialog */}
      <Dialog open={showAdd} onOpenChange={() => setShowAdd(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New Room</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Room Code*" value={form.room_code}
              onChange={(e) => setForm({ ...form, room_code: e.target.value })} data-testid="room-code-input" />
            <input type="number" className="w-full border rounded px-3 py-2 text-sm" placeholder="Floor" value={form.floor}
              onChange={(e) => setForm({ ...form, floor: parseInt(e.target.value) || 1 })} />
            <input type="number" className="w-full border rounded px-3 py-2 text-sm" placeholder="Capacity" value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })} />
            <div className="flex gap-2">
              <button onClick={createRoom} className="flex-1 bg-[#0B1C3D] text-white py-2 rounded-lg text-sm">Create</button>
              <button onClick={() => setShowAdd(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
