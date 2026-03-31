import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Trash2, RotateCcw, Plus, Grid3X3, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminMasterControl({ user, authHeaders, onBack }) {
  return (
    <div className="space-y-6" data-testid="master-control-view">
      <Tabs defaultValue="approve" className="space-y-4">
        <TabsList className="bg-white border border-[#D4AF37]/20 p-1 rounded-xl" data-testid="mc-tabs">
          <TabsTrigger value="approve" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800 rounded-lg px-5">Approve Forms</TabsTrigger>
          <TabsTrigger value="rooms" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 rounded-lg px-5">Room Management</TabsTrigger>
        </TabsList>
        <TabsContent value="approve"><ApproveFormsTab authHeaders={authHeaders} user={user} /></TabsContent>
        <TabsContent value="rooms"><RoomManagementTab authHeaders={authHeaders} user={user} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Approve Forms Tab ───
function ApproveFormsTab({ authHeaders, user }) {
  const [pending, setPending] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logTab, setLogTab] = useState("pending");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, lRes] = await Promise.all([
        axios.get(`${API}/admin/registrations`, { headers: authHeaders(), params: { status: "pending", per_page: 200 } }),
        axios.get(`${API}/admin/audit-logs`, { headers: authHeaders(), params: { per_page: 100 } }),
      ]);
      setPending(pRes.data.data || []);
      setLogs((lRes.data.data || []).filter(l => ["approved", "rejected", "bulk_approve", "bulk_reject"].includes(l.action_type)));
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (reg, action) => {
    try {
      await axios.put(`${API}/admin/registrations/${reg.id}/status`, { status: action }, { headers: authHeaders() });
      toast.success(`${reg.full_name} ${action}`);
      fetchData();
    } catch { toast.error(`Failed to ${action}`); }
  };

  const handleBulk = async (action) => {
    if (!selected.length) return;
    try {
      await axios.post(`${API}/admin/registrations/bulk-action`, { ids: selected, action }, { headers: authHeaders() });
      toast.success(`${selected.length} entries ${action}d`);
      setSelected([]);
      fetchData();
    } catch { toast.error(`Bulk ${action} failed`); }
  };

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return (
    <div className="space-y-4" data-testid="approve-forms-tab">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Approve Forms ({pending.length})</h2>
        {selected.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleBulk("approve")} className="bg-green-600 text-white hover:bg-green-700" data-testid="bulk-approve-btn"><CheckCircle size={14} className="mr-1" /> Approve {selected.length}</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulk("reject")} className="border-red-300 text-red-600" data-testid="bulk-reject-btn"><XCircle size={14} className="mr-1" /> Reject {selected.length}</Button>
          </div>
        )}
      </div>

      <Tabs value={logTab} onValueChange={setLogTab}>
        <TabsList className="bg-white border border-gray-200 p-1 rounded-lg">
          <TabsTrigger value="pending" className="rounded-md text-sm">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-md text-sm">Action Logs ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {loading ? <div className="text-center py-8 text-[#0B1C3D]/40">Loading...</div> : pending.length === 0 ? <div className="text-center py-12 bg-green-50 rounded-xl border border-green-200 text-green-700">All forms have been processed!</div> : (
            <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-amber-50/50">
                    <TableHead className="w-10"><Checkbox checked={selected.length === pending.length && pending.length > 0} onCheckedChange={() => setSelected(s => s.length === pending.length ? [] : pending.map(r => r.id))} /></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>People</TableHead>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((reg, i) => (
                    <TableRow key={reg.id} data-testid={`pending-row-${i}`}>
                      <TableCell><Checkbox checked={selected.includes(reg.id)} onCheckedChange={() => toggleSelect(reg.id)} /></TableCell>
                      <TableCell className="font-medium">{reg.full_name}</TableCell>
                      <TableCell>{reg.mobile}</TableCell>
                      <TableCell>{reg.city || "-"}</TableCell>
                      <TableCell>{reg.num_people}</TableCell>
                      <TableCell className="text-xs">{reg.arrival_date || "-"}</TableCell>
                      <TableCell className="text-xs text-[#0B1C3D]/40">{reg.created_at ? new Date(reg.created_at).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleAction(reg, "approved")} className="bg-green-600 text-white hover:bg-green-700 h-7 px-2 text-xs" data-testid={`approve-btn-${i}`}><CheckCircle size={12} className="mr-1" /> Accept</Button>
                          <Button size="sm" variant="outline" onClick={() => handleAction(reg, "rejected")} className="border-red-300 text-red-600 h-7 px-2 text-xs" data-testid={`reject-btn-${i}`}><XCircle size={12} className="mr-1" /> Reject</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {logs.length === 0 ? <div className="text-center py-8 text-[#0B1C3D]/40">No approval actions yet</div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Guest</TableHead><TableHead>Action</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
                <TableBody>
                  {logs.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-[#0B1C3D]/50">{log.performed_at ? new Date(log.performed_at).toLocaleString() : "-"}</TableCell>
                      <TableCell className="font-medium">{log.target_name}</TableCell>
                      <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${log.action_type.includes("approve") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{log.action_type.replace("bulk_", "Bulk ")}</span></TableCell>
                      <TableCell className="text-sm text-[#0B1C3D]/60">{log.performed_by}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Room Management Tab ───
function RoomManagementTab({ authHeaders, user }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [newRoom, setNewRoom] = useState({ room_code: "", capacity: 2, ac_type: "Non-AC", notes: "" });
  const [bulkText, setBulkText] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  const fetchRooms = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/rooms`, { headers: authHeaders() });
      setRooms(data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleAddRoom = async () => {
    if (!newRoom.room_code.trim()) { toast.error("Room code required"); return; }
    try {
      await axios.post(`${API}/admin/rooms`, newRoom, { headers: authHeaders() });
      toast.success(`Room ${newRoom.room_code} created`);
      setNewRoom({ room_code: "", capacity: 2, ac_type: "Non-AC", notes: "" });
      setShowAdd(false);
      fetchRooms();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleBulkAdd = async () => {
    const lines = bulkText.split("\n").filter(l => l.trim());
    const roomsList = lines.map(l => {
      const parts = l.split(",").map(s => s.trim());
      return { room_code: parts[0] || "", capacity: parseInt(parts[1]) || 2, ac_type: parts[2] || "Non-AC", notes: parts[3] || "" };
    }).filter(r => r.room_code);
    if (!roomsList.length) { toast.error("No valid rooms"); return; }
    try {
      const { data } = await axios.post(`${API}/admin/rooms/bulk`, { rooms: roomsList }, { headers: authHeaders() });
      toast.success(`${data.created} rooms created${data.errors.length ? `. ${data.errors.length} errors.` : ""}`);
      setShowBulk(false);
      setBulkText("");
      fetchRooms();
    } catch { toast.error("Bulk add failed"); }
  };

  const handleDeleteRoom = async (code) => {
    if (!window.confirm(`Delete room ${code}?`)) return;
    try {
      await axios.delete(`${API}/admin/rooms/${code}`, { headers: authHeaders() });
      toast.success(`Room ${code} deleted`);
      fetchRooms();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleUnassign = async (code) => {
    try {
      await axios.put(`${API}/admin/rooms/${code}/unassign`, {}, { headers: authHeaders() });
      toast.success(`Room ${code} unassigned`);
      fetchRooms();
    } catch { toast.error("Unassign failed"); }
  };

  const handleExportPDF = () => window.open(`${API}/admin/export-pdf?report_type=rooms`, "_blank");

  const available = rooms.filter(r => r.status === "available").length;
  const occupied = rooms.filter(r => r.status === "occupied").length;

  return (
    <div className="space-y-4" data-testid="room-management-tab">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Room Management</h2>
          <p className="text-sm text-[#0B1C3D]/50">{rooms.length} rooms ({available} available, {occupied} occupied)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowAdd(true)} className="bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90" data-testid="add-room-btn"><Plus size={16} className="mr-1" /> Add Room</Button>
          <Button variant="outline" onClick={() => setShowBulk(true)} className="border-[#D4AF37]/30" data-testid="bulk-add-rooms-btn"><Plus size={16} className="mr-1" /> Bulk Add</Button>
          <Button variant="outline" onClick={handleExportPDF} className="border-[#0B1C3D]/20"><FileText size={16} className="mr-1" /> Export PDF</Button>
          <Button variant="outline" onClick={() => setViewMode(v => v === "grid" ? "table" : "grid")} className="border-[#0B1C3D]/20"><Grid3X3 size={16} className="mr-1" /> {viewMode === "grid" ? "Table View" : "Grid View"}</Button>
        </div>
      </div>

      {/* Room Grid */}
      {loading ? <div className="text-center py-8 text-[#0B1C3D]/40">Loading rooms...</div> : rooms.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200 text-[#0B1C3D]/40">No rooms configured yet. Add your first room.</div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3" data-testid="room-grid">
          {rooms.map(room => (
            <div key={room.room_code} className={`rounded-xl p-4 border-2 text-center transition-all ${room.status === "occupied" ? "bg-red-50 border-red-300" : "bg-green-50 border-green-300"}`} data-testid={`room-tile-${room.room_code}`}>
              <p className="font-bold text-[#0B1C3D] text-sm">{room.room_code}</p>
              <p className="text-[10px] text-[#0B1C3D]/40 uppercase">{room.ac_type} | Cap: {room.capacity}</p>
              {room.status === "occupied" ? (
                <>
                  <p className="text-xs text-red-700 font-medium mt-1 truncate">{room.occupant_name}</p>
                  <button onClick={() => handleUnassign(room.room_code)} className="text-[10px] text-blue-600 hover:underline mt-1">Unassign</button>
                </>
              ) : (
                <p className="text-xs text-green-600 font-medium mt-1">Available</p>
              )}
              {room.status !== "occupied" && <button onClick={() => handleDeleteRoom(room.room_code)} className="text-[10px] text-red-400 hover:text-red-600 mt-1 block mx-auto">Delete</button>}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#D4AF37]/10 overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Capacity</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Occupant</TableHead><TableHead>Created By</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {rooms.map(room => (
                <TableRow key={room.room_code}>
                  <TableCell className="font-bold">{room.room_code}</TableCell>
                  <TableCell>{room.capacity}</TableCell>
                  <TableCell>{room.ac_type}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${room.status === "occupied" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{room.status}</span></TableCell>
                  <TableCell>{room.occupant_name || "-"}</TableCell>
                  <TableCell className="text-xs text-[#0B1C3D]/40">{room.created_by}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {room.status === "occupied" && <Button size="sm" variant="ghost" onClick={() => handleUnassign(room.room_code)} className="text-blue-600 h-7 text-xs"><RotateCcw size={12} className="mr-1" /> Unassign</Button>}
                      {room.status !== "occupied" && <Button size="sm" variant="ghost" onClick={() => handleDeleteRoom(room.room_code)} className="text-red-500 h-7 text-xs"><Trash2 size={12} className="mr-1" /> Delete</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Room Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md bg-white" data-testid="add-room-dialog">
          <DialogHeader><DialogTitle>Add Room</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Room Code *</Label><Input value={newRoom.room_code} onChange={e => setNewRoom(r => ({ ...r, room_code: e.target.value }))} placeholder="e.g. A-101" className="mt-1" data-testid="room-code-input" /></div>
            <div><Label>Capacity</Label><Input type="number" value={newRoom.capacity} onChange={e => setNewRoom(r => ({ ...r, capacity: parseInt(e.target.value) || 2 }))} className="mt-1" /></div>
            <div><Label>Type</Label>
              <Select value={newRoom.ac_type} onValueChange={v => setNewRoom(r => ({ ...r, ac_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="AC">AC</SelectItem><SelectItem value="Non-AC">Non-AC</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={newRoom.notes} onChange={e => setNewRoom(r => ({ ...r, notes: e.target.value }))} className="mt-1" placeholder="Optional notes" /></div>
            <Button onClick={handleAddRoom} className="w-full bg-[#D4AF37] text-[#0B1C3D]" data-testid="save-room-btn">Add Room</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent className="max-w-md bg-white" data-testid="bulk-add-rooms-dialog">
          <DialogHeader><DialogTitle>Bulk Add Rooms</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#0B1C3D]/60">One room per line. Format: <code className="bg-gray-100 px-1 rounded text-xs">code, capacity, AC/Non-AC, notes</code></p>
            <Textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={8} placeholder={"A-101, 2, AC, Deluxe\nA-102, 3, Non-AC\nA-103, 2, AC"} data-testid="bulk-rooms-input" />
            <Button onClick={handleBulkAdd} className="w-full bg-[#D4AF37] text-[#0B1C3D]" data-testid="save-bulk-rooms-btn">Add Rooms</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
