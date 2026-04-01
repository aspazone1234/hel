import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Trash2, ArrowRight, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminRoomManagement({ user, authHeaders }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [assignRoom, setAssignRoom] = useState(null);
  const [shiftRoom, setShiftRoom] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const isSuperAdmin = user.role === "superadmin";

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/rooms`, { headers: authHeaders() });
      setRooms(data);
    } catch { toast.error("Failed to load rooms"); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleExportPDF = async () => {
    try {
      const res = await axios.get(`${API}/admin/export-pdf`, { headers: authHeaders(), params: { report_type: "rooms" }, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url; a.download = "room_allocation.pdf"; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("PDF export failed"); }
  };

  const handleExportCSV = async () => {
    const csv = ["Room Code,Capacity,AC Type,Status,Occupant,Notes"];
    rooms.forEach(r => csv.push(`${r.room_code},${r.capacity},${r.ac_type},${r.status},${r.occupant_name || ""},${r.notes || ""}`));
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "rooms.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const handleDelete = async (code) => {
    try {
      await axios.delete(`${API}/admin/rooms/${code}`, { headers: authHeaders() });
      toast.success(`Room ${code} deleted`);
      fetchRooms();
    } catch (err) { toast.error(err.response?.data?.detail || "Delete failed"); }
    setConfirmAction(null);
  };

  const handleUnassign = async (code) => {
    try {
      await axios.put(`${API}/admin/rooms/${code}/unassign`, {}, { headers: authHeaders() });
      toast.success(`Room ${code} unassigned`);
      fetchRooms();
    } catch (err) { toast.error(err.response?.data?.detail || "Unassign failed"); }
    setConfirmAction(null);
  };

  const available = rooms.filter(r => r.status !== "occupied").length;
  const occupied = rooms.filter(r => r.status === "occupied").length;

  return (
    <div className="space-y-6" data-testid="room-management-view">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Room Management</h2>
          <p className="text-sm text-[#0B1C3D]/50">{rooms.length} rooms &middot; {available} available &middot; {occupied} occupied</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isSuperAdmin && (
            <>
              <Button size="sm" onClick={() => setShowAddRoom(true)} className="bg-[#D4AF37] text-[#0B1C3D] h-8 text-xs" data-testid="add-room-btn">
                <Plus size={14} className="mr-1" /> Add Room
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowBulkAdd(true)} className="h-8 text-xs" data-testid="bulk-add-rooms-btn">
                <Plus size={14} className="mr-1" /> Bulk Add
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={handleExportPDF} className="h-8 text-xs" data-testid="export-rooms-pdf">
            <Download size={14} className="mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="h-8 text-xs" data-testid="export-rooms-csv">
            <Download size={14} className="mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="py-10 text-center text-[#0B1C3D]/40">Loading rooms...</div>
      ) : rooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#D4AF37]/20 p-10 text-center">
          <p className="text-[#0B1C3D]/40">No rooms configured yet</p>
          {isSuperAdmin && <p className="text-[#0B1C3D]/30 text-xs mt-1">Click "Add Room" to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" data-testid="room-grid">
          {rooms.map(r => (
            <div key={r.room_code} className={`rounded-2xl border-2 p-4 transition-all hover:shadow-md cursor-pointer ${r.status === "occupied" ? "border-red-200 bg-red-50/50" : "border-green-200 bg-green-50/50"}`}
              onClick={() => setAssignRoom(r)} data-testid={`room-card-${r.room_code}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-[#0B1C3D] text-lg">{r.room_code}</p>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase ${r.status === "occupied" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                  {r.status}
                </span>
              </div>
              <div className="space-y-1 text-xs text-[#0B1C3D]/60">
                <p>Capacity: {r.capacity}</p>
                <p>{r.ac_type}</p>
                {r.notes && <p className="text-[#0B1C3D]/40 italic truncate">{r.notes}</p>}
              </div>
              {r.status === "occupied" && r.occupant_name && (
                <p className="mt-2 text-xs font-medium text-red-600 truncate">{r.occupant_name}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Room Popup */}
      {assignRoom && <RoomAssignPopup room={assignRoom} onClose={() => setAssignRoom(null)} authHeaders={authHeaders}
        onUnassign={() => setConfirmAction({ type: "unassign", code: assignRoom.room_code, message: `Unassign room ${assignRoom.room_code}?` })}
        onDelete={isSuperAdmin ? () => setConfirmAction({ type: "delete", code: assignRoom.room_code, message: `Delete room ${assignRoom.room_code}?` }) : null}
        onShift={() => { setShiftRoom(assignRoom); setAssignRoom(null); }}
        onDone={() => { setAssignRoom(null); fetchRooms(); }} isSuperAdmin={isSuperAdmin} rooms={rooms} />}

      {/* Shift Room Dialog */}
      {shiftRoom && <ShiftRoomDialog room={shiftRoom} rooms={rooms} onClose={() => setShiftRoom(null)} authHeaders={authHeaders} onDone={() => { setShiftRoom(null); fetchRooms(); }} />}

      {/* Add Room Dialog */}
      {showAddRoom && <AddRoomDialog onClose={() => setShowAddRoom(false)} authHeaders={authHeaders} onDone={() => { setShowAddRoom(false); fetchRooms(); }} />}
      {showBulkAdd && <BulkAddRoomDialog onClose={() => setShowBulkAdd(false)} authHeaders={authHeaders} onDone={() => { setShowBulkAdd(false); fetchRooms(); }} />}

      {/* Confirm Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Are you sure?</DialogTitle></DialogHeader>
          <p className="text-sm text-[#0B1C3D]/70">{confirmAction?.message}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button onClick={() => confirmAction?.type === "delete" ? handleDelete(confirmAction.code) : handleUnassign(confirmAction.code)} className="bg-red-500 text-white hover:bg-red-600">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoomAssignPopup({ room, onClose, authHeaders, onUnassign, onDelete, onShift, onDone, isSuperAdmin, rooms }) {
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (room.status === "occupied") return;
    setLoading(true);
    axios.get(`${API}/admin/registrations`, { headers: authHeaders(), params: { status: "approved", per_page: 200 } })
      .then(r => setGuests(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [room, authHeaders]);

  const handleAssign = async (guest) => {
    try {
      await axios.put(`${API}/admin/rooms/${room.room_code}/assign`, { occupant_id: guest.id, occupant_name: guest.full_name }, { headers: authHeaders() });
      toast.success(`${guest.full_name} assigned to ${room.room_code}`);
      onDone();
    } catch (err) { toast.error(err.response?.data?.detail || "Assignment failed"); }
  };

  const filtered = guests.filter(g => {
    const q = search.toLowerCase();
    return g.full_name?.toLowerCase().includes(q) || g.mobile?.includes(q);
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Room {room.room_code}</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-[#0B1C3D]/60 space-y-1 mb-3">
          <p>Capacity: {room.capacity} &middot; {room.ac_type}</p>
          {room.notes && <p>Notes: {room.notes}</p>}
        </div>

        {room.status === "occupied" ? (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="font-medium text-red-700 text-sm">Currently Occupied</p>
              <p className="text-red-600 text-lg font-bold">{room.occupant_name}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onUnassign} className="flex-1 text-orange-600 border-orange-300">Unassign</Button>
              <Button size="sm" variant="outline" onClick={onShift} className="flex-1 text-blue-600 border-blue-300">
                <ArrowRight size={14} className="mr-1" /> Shift Room
              </Button>
            </div>
            {onDelete && <Button size="sm" variant="outline" onClick={onDelete} className="w-full text-red-600 border-red-300"><Trash2 size={14} className="mr-1" /> Delete Room</Button>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0B1C3D]/30" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guests..." className="pl-8 h-8 text-sm" data-testid="room-guest-search" />
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1">
              {loading ? <p className="text-center py-4 text-[#0B1C3D]/40 text-xs">Loading guests...</p> :
                filtered.length === 0 ? <p className="text-center py-4 text-[#0B1C3D]/40 text-xs">No guests found</p> :
                filtered.map(g => {
                  const hasRoom = !!g.room_assignment;
                  return (
                    <button key={g.id} onClick={() => !hasRoom && handleAssign(g)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${hasRoom ? "opacity-40 cursor-default bg-gray-50" : "hover:bg-[#D4AF37]/10 cursor-pointer"}`}
                      disabled={hasRoom} data-testid={`assign-guest-${g.id}`}>
                      <span className="font-medium text-[#0B1C3D]">{g.full_name}</span>
                      <span className="text-[#0B1C3D]/40 text-xs ml-2">{g.mobile}</span>
                      {hasRoom && <span className="text-orange-500 text-xs ml-2">(Room: {g.room_assignment})</span>}
                    </button>
                  );
                })}
            </div>
            <div className="flex gap-2">
              {onDelete && <Button size="sm" variant="outline" onClick={onDelete} className="text-red-600 border-red-300 text-xs"><Trash2 size={12} className="mr-1" /> Delete</Button>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShiftRoomDialog({ room, rooms, onClose, authHeaders, onDone }) {
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const availableRooms = rooms.filter(r => r.room_code !== room.room_code && r.status !== "occupied");

  const handleShift = async () => {
    if (!target) return toast.error("Select a target room");
    setSaving(true);
    try {
      await axios.put(`${API}/admin/rooms/${room.room_code}/shift`, { new_room_code: target }, { headers: authHeaders() });
      toast.success(`Shifted to room ${target}`);
      onDone();
    } catch (err) { toast.error(err.response?.data?.detail || "Shift failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Shift from Room {room.room_code}</DialogTitle></DialogHeader>
        <p className="text-sm text-[#0B1C3D]/60">Moving: {room.occupant_name}</p>
        <div>
          <Label className="text-xs">Select Target Room (unoccupied only)</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select room..." /></SelectTrigger>
            <SelectContent>
              {availableRooms.map(r => <SelectItem key={r.room_code} value={r.room_code}>{r.room_code} (Cap: {r.capacity}, {r.ac_type})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleShift} disabled={saving} className="bg-[#D4AF37] text-[#0B1C3D]">{saving ? "Shifting..." : "Shift"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddRoomDialog({ onClose, authHeaders, onDone }) {
  const [form, setForm] = useState({ room_code: "", capacity: 2, ac_type: "AC", notes: "" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.room_code.trim()) return toast.error("Room code required");
    setSaving(true);
    try {
      await axios.post(`${API}/admin/rooms`, form, { headers: authHeaders() });
      toast.success(`Room ${form.room_code} created`);
      onDone();
    } catch (err) { toast.error(err.response?.data?.detail || "Create failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Room</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Room Code *</Label><Input value={form.room_code} onChange={e => setForm(f => ({ ...f, room_code: e.target.value }))} className="mt-1" /></div>
          <div><Label className="text-xs">Capacity</Label><Input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))} className="mt-1" /></div>
          <div><Label className="text-xs">AC Type</Label>
            <Select value={form.ac_type} onValueChange={v => setForm(f => ({ ...f, ac_type: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="AC">AC</SelectItem><SelectItem value="Non-AC">Non-AC</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#D4AF37] text-[#0B1C3D]">{saving ? "Creating..." : "Create Room"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkAddRoomDialog({ onClose, authHeaders, onDone }) {
  const [prefix, setPrefix] = useState("");
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(10);
  const [capacity, setCapacity] = useState(2);
  const [acType, setAcType] = useState("AC");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!prefix.trim()) return toast.error("Prefix required");
    setSaving(true);
    try {
      await axios.post(`${API}/admin/rooms/bulk`, { prefix, start_num: start, end_num: end, capacity, ac_type: acType }, { headers: authHeaders() });
      toast.success(`Rooms ${prefix}${start}-${prefix}${end} created`);
      onDone();
    } catch (err) { toast.error(err.response?.data?.detail || "Bulk create failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Bulk Add Rooms</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Prefix (e.g., R, A-)</Label><Input value={prefix} onChange={e => setPrefix(e.target.value)} className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Start #</Label><Input type="number" value={start} onChange={e => setStart(parseInt(e.target.value) || 1)} className="mt-1" /></div>
            <div><Label className="text-xs">End #</Label><Input type="number" value={end} onChange={e => setEnd(parseInt(e.target.value) || 1)} className="mt-1" /></div>
          </div>
          <div><Label className="text-xs">Capacity</Label><Input type="number" min={1} value={capacity} onChange={e => setCapacity(parseInt(e.target.value) || 1)} className="mt-1" /></div>
          <div><Label className="text-xs">AC Type</Label>
            <Select value={acType} onValueChange={setAcType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="AC">AC</SelectItem><SelectItem value="Non-AC">Non-AC</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#D4AF37] text-[#0B1C3D]">{saving ? "Creating..." : "Create Rooms"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
