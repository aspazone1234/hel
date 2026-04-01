import { useState, useEffect, useCallback } from "react";
import { Search, Download, Plus, Eye, Edit2, Trash2, RotateCcw, X, Filter, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminGuestList({ user, authHeaders, onViewDetail, onAddManual }) {
  const [regs, setRegs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [arrDate, setArrDate] = useState("");
  const [depDate, setDepDate] = useState("");
  const [arrivalFilter, setArrivalFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editReg, setEditReg] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [arrivalRoomModal, setArrivalRoomModal] = useState(null);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [deletedRegs, setDeletedRegs] = useState([]);
  const perPage = 50;

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status: "approved", page, per_page: perPage };
      if (arrDate) params.arrival_date = arrDate;
      if (depDate) params.departure_date = depDate;
      if (arrivalFilter !== "all") params.arrival_status = arrivalFilter;
      const { data } = await axios.get(`${API}/admin/registrations`, { headers: authHeaders(), params });
      setRegs(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error("Failed to load guests"); }
    finally { setLoading(false); }
  }, [authHeaders, page, arrDate, depDate, arrivalFilter]);

  const fetchDeleted = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/registrations`, { headers: authHeaders(), params: { status: "deleted", per_page: 200 } });
      setDeletedRegs(data.data || []);
    } catch {}
  }, [authHeaders]);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);
  useEffect(() => { fetchDeleted(); }, [fetchDeleted]);

  const clearFilters = () => { setArrDate(""); setDepDate(""); setArrivalFilter("all"); setPage(1); };
  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === regs.length ? [] : regs.map(r => r.id));

  const handleArrivalChange = (reg, newStatus) => {
    if (newStatus === "Arrived" && reg.arrival_status !== "Arrived") {
      setArrivalRoomModal(reg);
    } else {
      setConfirmAction({ type: "arrival", reg, newStatus, message: `Are you sure you want to change this status to "${newStatus}"?` });
    }
  };

  const confirmActionExec = async () => {
    if (!confirmAction) return;
    const { type, reg, newStatus } = confirmAction;
    try {
      if (type === "arrival") {
        await axios.put(`${API}/admin/registrations/${reg.id}/management`, { arrival_status: newStatus }, { headers: authHeaders() });
        toast.success(`Status changed to ${newStatus}`);
      } else if (type === "delete") {
        await axios.put(`${API}/admin/registrations/${reg.id}/status`, { status: "deleted" }, { headers: authHeaders() });
        toast.success("Moved to recycle bin");
      } else if (type === "restore") {
        await axios.put(`${API}/admin/registrations/${reg.id}/status`, { status: "approved" }, { headers: authHeaders() });
        toast.success("Restored to guest list");
      } else if (type === "permanent_delete") {
        await axios.delete(`${API}/admin/registrations/${reg.id}/permanent`, { headers: authHeaders() });
        toast.success("Permanently deleted");
      }
    } catch (err) { toast.error(err.response?.data?.detail || "Action failed"); }
    setConfirmAction(null);
    fetchGuests();
    fetchDeleted();
  };

  const handleBulkAction = async (action, status) => {
    if (selected.length === 0) return toast.error("No items selected");
    try {
      await axios.post(`${API}/admin/registrations/bulk-action`, { ids: selected, action, status }, { headers: authHeaders() });
      toast.success(`Bulk ${action} completed (${selected.length} items)`);
      setSelected([]);
      fetchGuests();
    } catch { toast.error("Bulk action failed"); }
  };

  const handleExportCSV = async () => {
    try {
      const res = await axios.get(`${API}/admin/export-csv`, { headers: authHeaders(), responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = "approved_guests.csv"; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("CSV export failed"); }
  };

  const handleExportPDF = async () => {
    try {
      const res = await axios.get(`${API}/admin/export-pdf`, { headers: authHeaders(), params: { report_type: "guestlist" }, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url; a.download = "guest_list.pdf"; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("PDF export failed"); }
  };

  const rowColor = (r) => {
    if (r.arrival_status === "Arrived") return "bg-green-50 border-l-4 border-l-green-500";
    if (r.arrival_status === "Not Coming") return "bg-red-50 border-l-4 border-l-red-400";
    return "";
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4" data-testid="guestlist-view">
      {/* Recycle Bin Section */}
      {deletedRegs.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4" data-testid="recycle-bin-section">
          <button onClick={() => setShowRecycleBin(!showRecycleBin)} className="w-full flex items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <Trash2 size={18} className="text-red-500" />
              <span className="font-bold text-red-700">Recycle Bin ({deletedRegs.length})</span>
            </div>
            <span className="text-red-400 text-sm">{showRecycleBin ? "Hide" : "Show"}</span>
          </button>
          {showRecycleBin && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {deletedRegs.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-red-100">
                  <div>
                    <span className="font-medium text-[#0B1C3D] text-sm">{r.full_name}</span>
                    <span className="text-[#0B1C3D]/40 text-xs ml-2">{r.mobile}</span>
                    {r.deleted_by && <span className="text-red-400 text-xs ml-2">Deleted by: {r.deleted_by}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50 h-7 text-xs"
                      onClick={() => setConfirmAction({ type: "restore", reg: r, message: "Restore this entry to the Final Guest List?" })}
                      data-testid={`restore-${r.id}`}>
                      <RotateCcw size={12} className="mr-1" /> Restore
                    </Button>
                    {user.role === "superadmin" && (
                      <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 h-7 text-xs"
                        onClick={() => setConfirmAction({ type: "permanent_delete", reg: r, message: "Permanently delete this entry? This cannot be undone." })}
                        data-testid={`perm-delete-${r.id}`}>
                        <X size={12} className="mr-1" /> Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Final Guest List ({total})</h2>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={onAddManual} className="bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90 h-8 text-xs" data-testid="add-manual-btn">
            <Plus size={14} className="mr-1" /> Add Manual Entry
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="h-8 text-xs" data-testid="export-csv-btn">
            <Download size={14} className="mr-1" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPDF} className="h-8 text-xs" data-testid="export-pdf-btn">
            <Download size={14} className="mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Simplified Filters: Arriving Date, Departure Date, Arrival Status */}
      <div className="flex flex-wrap items-end gap-4 bg-[#F8F1E5]/50 rounded-xl p-3 border border-[#D4AF37]/10">
        <Filter size={16} className="text-[#D4AF37] shrink-0 mt-5" />
        <div>
          <label className="text-[10px] text-[#0B1C3D]/50 uppercase tracking-wider block mb-1">Arriving Date</label>
          <Input type="date" value={arrDate} onChange={e => { setArrDate(e.target.value); setPage(1); }} className="h-8 text-xs w-36 bg-white" data-testid="filter-arrival-date" />
        </div>
        <div>
          <label className="text-[10px] text-[#0B1C3D]/50 uppercase tracking-wider block mb-1">Departure Date</label>
          <Input type="date" value={depDate} onChange={e => { setDepDate(e.target.value); setPage(1); }} className="h-8 text-xs w-36 bg-white" data-testid="filter-departure-date" />
        </div>
        <div>
          <label className="text-[10px] text-[#0B1C3D]/50 uppercase tracking-wider block mb-1">Arrival Status</label>
          <Select value={arrivalFilter} onValueChange={v => { setArrivalFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-36 bg-white" data-testid="filter-arrival-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Not Arrived">Not Arrived</SelectItem>
              <SelectItem value="Arrived">Arrived</SelectItem>
              <SelectItem value="Not Coming">Not Coming</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="ghost" onClick={clearFilters} className="h-8 text-xs text-red-500" data-testid="clear-filters-btn">
          <X size={12} className="mr-1" /> Clear
        </Button>
      </div>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <span className="text-sm font-medium text-blue-700">{selected.length} selected</span>
          <Button size="sm" onClick={() => handleBulkAction("status_update", "Arrived")} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white">Mark Arrived</Button>
          <Button size="sm" onClick={() => handleBulkAction("status_update", "Not Coming")} className="h-7 text-xs bg-red-500 hover:bg-red-600 text-white">Mark Not Coming</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction("delete")} className="h-7 text-xs text-red-600 border-red-300">Delete Selected</Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#D4AF37]/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="guest-table">
            <thead>
              <tr className="bg-[#0B1C3D] text-[#F8F1E5]">
                <th className="px-3 py-3 text-left w-8"><Checkbox checked={selected.length === regs.length && regs.length > 0} onCheckedChange={toggleAll} /></th>
                <th className="px-3 py-3 text-left">#</th>
                <th className="px-3 py-3 text-left">Name</th>
                <th className="px-3 py-3 text-left">Mobile</th>
                <th className="px-3 py-3 text-left">People</th>
                <th className="px-3 py-3 text-left">Arrival</th>
                <th className="px-3 py-3 text-left">Departure</th>
                <th className="px-3 py-3 text-left">Room</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-10 text-[#0B1C3D]/40">Loading...</td></tr>
              ) : regs.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-[#0B1C3D]/40">No guests found</td></tr>
              ) : regs.map((r, i) => (
                <tr key={r.id} className={`border-b border-[#D4AF37]/10 hover:bg-[#F8F1E5]/50 transition-colors ${rowColor(r)}`} data-testid={`guest-row-${r.id}`}>
                  <td className="px-3 py-2"><Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></td>
                  <td className="px-3 py-2 text-[#0B1C3D]/40 text-xs">{(page - 1) * perPage + i + 1}</td>
                  <td className="px-3 py-2 font-medium text-[#0B1C3D]">
                    {r.full_name}
                    {r.entry_type === "manual" && <span className="ml-1 text-[8px] bg-[#D4AF37]/20 text-[#D4AF37] px-1.5 py-0.5 rounded-full uppercase">Manual</span>}
                  </td>
                  <td className="px-3 py-2 text-[#0B1C3D]/60">{r.mobile}</td>
                  <td className="px-3 py-2 text-center">{r.num_people}</td>
                  <td className="px-3 py-2 text-xs">{r.arrival_date || "-"}</td>
                  <td className="px-3 py-2 text-xs">{r.departure_date || "-"}</td>
                  <td className="px-3 py-2 text-xs">{r.room_assignment || <span className="text-[#0B1C3D]/30">-</span>}</td>
                  <td className="px-3 py-2">
                    <ArrivalStatusToggle status={r.arrival_status} onChange={(s) => handleArrivalChange(r, s)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onViewDetail(r)} className="h-7 text-xs px-2 text-[#0B1C3D]/60 hover:text-[#D4AF37]" data-testid={`view-${r.id}`}>
                        <Eye size={12} className="mr-1" /> View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditReg(r)} className="h-7 text-xs px-2 text-[#0B1C3D]/60 hover:text-blue-600" data-testid={`edit-${r.id}`}>
                        <Edit2 size={12} className="mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ type: "delete", reg: r, message: "Move this entry to the Recycle Bin?" })} className="h-7 text-xs px-2 text-[#0B1C3D]/60 hover:text-red-500" data-testid={`delete-${r.id}`}>
                        <Trash2 size={12} className="mr-1" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#D4AF37]/10">
            <span className="text-xs text-[#0B1C3D]/50">Page {page} of {totalPages} ({total} entries)</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 text-xs">Prev</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 text-xs">Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm Action</DialogTitle></DialogHeader>
          <p className="text-sm text-[#0B1C3D]/70">{confirmAction?.message}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button onClick={confirmActionExec} className="bg-[#D4AF37] text-[#0B1C3D]">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Arrival + Room Assignment Modal */}
      {arrivalRoomModal && (
        <ArrivalRoomModal reg={arrivalRoomModal} authHeaders={authHeaders} onClose={() => setArrivalRoomModal(null)} onDone={() => { setArrivalRoomModal(null); fetchGuests(); }} />
      )}

      {/* Edit Dialog */}
      {editReg && <EditGuestDialog reg={editReg} onClose={() => setEditReg(null)} authHeaders={authHeaders} onSaved={() => { setEditReg(null); fetchGuests(); }} />}
    </div>
  );
}

/* === Arrival Status Toggle === */
function ArrivalStatusToggle({ status, onChange }) {
  const colors = {
    "Not Arrived": "bg-gray-100 text-gray-600 border-gray-200",
    "Arrived": "bg-green-100 text-green-700 border-green-300",
    "Not Coming": "bg-red-100 text-red-600 border-red-300",
  };
  return (
    <Select value={status || "Not Arrived"} onValueChange={onChange}>
      <SelectTrigger className={`h-7 text-xs w-28 border ${colors[status] || colors["Not Arrived"]}`} data-testid="arrival-status-toggle">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Not Arrived">Not Arrived</SelectItem>
        <SelectItem value="Arrived">Arrived</SelectItem>
        <SelectItem value="Not Coming">Not Coming</SelectItem>
      </SelectContent>
    </Select>
  );
}

/* === Arrival + Room Assignment Modal === */
function ArrivalRoomModal({ reg, authHeaders, onClose, onDone }) {
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    setLoadingRooms(true);
    axios.get(`${API}/admin/rooms`, { headers: authHeaders() })
      .then(r => setRooms(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingRooms(false));
  }, [authHeaders]);

  const handleConfirm = async (withRoom) => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/registrations/${reg.id}/management`, { arrival_status: "Arrived" }, { headers: authHeaders() });
      if (withRoom && selectedRoom) {
        await axios.put(`${API}/admin/rooms/${selectedRoom}/assign`, { occupant_id: reg.id, occupant_name: reg.full_name }, { headers: authHeaders() });
      }
      toast.success(withRoom && selectedRoom ? `Marked arrived & assigned room ${selectedRoom}` : "Marked as Arrived");
      onDone();
    } catch (err) { toast.error(err.response?.data?.detail || "Action failed"); }
    finally { setSaving(false); }
  };

  const filtered = rooms.filter(r => {
    const q = search.toLowerCase();
    return r.room_code.toLowerCase().includes(q) || (r.occupant_name || "").toLowerCase().includes(q);
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" data-testid="arrival-room-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen size={18} className="text-[#D4AF37]" /> Mark as Arrived
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#0B1C3D]/70">
          Marking <strong>{reg.full_name}</strong> as arrived.
        </p>
        <p className="text-sm text-[#0B1C3D]/70 font-medium">Do you want to allocate a room here itself?</p>
        <p className="text-[10px] text-[#0B1C3D]/40 italic">You can assign the room now or later from Room Management.</p>

        {/* Room Search */}
        <div className="relative mt-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0B1C3D]/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rooms..." className="pl-8 h-8 text-sm" data-testid="room-search-input" />
        </div>

        {/* Room List */}
        <div className="max-h-48 overflow-y-auto space-y-1 border border-[#D4AF37]/10 rounded-xl p-2">
          {loadingRooms ? <p className="text-center py-4 text-xs text-[#0B1C3D]/40">Loading rooms...</p> :
            filtered.length === 0 ? <p className="text-center py-4 text-xs text-[#0B1C3D]/40">No rooms found</p> :
            filtered.map(r => {
              const isOccupied = r.status === "occupied";
              const isSelected = selectedRoom === r.room_code;
              return (
                <button key={r.room_code}
                  onClick={() => !isOccupied && setSelectedRoom(isSelected ? "" : r.room_code)}
                  disabled={isOccupied}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    isOccupied ? "opacity-40 cursor-not-allowed bg-gray-50" :
                    isSelected ? "bg-[#D4AF37]/20 border-2 border-[#D4AF37]" : "hover:bg-[#F8F1E5] cursor-pointer border-2 border-transparent"
                  }`}
                  data-testid={`room-option-${r.room_code}`}>
                  <div>
                    <span className="font-bold text-[#0B1C3D]">{r.room_code}</span>
                    <span className="text-[#0B1C3D]/40 text-xs ml-2">Cap: {r.capacity} &middot; {r.ac_type}</span>
                  </div>
                  {isOccupied ? (
                    <span className="text-[10px] text-red-500 font-medium">Already Booked ({r.occupant_name || "Unknown"})</span>
                  ) : isSelected ? (
                    <span className="text-[10px] text-[#D4AF37] font-semibold">Selected</span>
                  ) : null}
                </button>
              );
            })}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={() => handleConfirm(true)} disabled={saving || !selectedRoom} className="w-full bg-green-600 text-white hover:bg-green-700" data-testid="confirm-arrived-with-room">
            {saving ? "Saving..." : selectedRoom ? `Mark Arrived & Assign Room ${selectedRoom}` : "Select a room above"}
          </Button>
          <Button onClick={() => handleConfirm(false)} disabled={saving} variant="outline" className="w-full" data-testid="confirm-arrived-no-room">
            Mark Arrived Without Room
          </Button>
          <Button onClick={onClose} variant="ghost" className="w-full text-[#0B1C3D]/50">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* === Edit Guest Dialog === */
function EditGuestDialog({ reg, onClose, authHeaders, onSaved }) {
  const [form, setForm] = useState({ ...reg });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {};
      ["full_name", "mobile", "additional_phone", "email", "address", "attendance_intent", "arrival_date", "departure_date", "num_people", "message", "admin_notes"].forEach(k => {
        if (form[k] !== reg[k]) updates[k] = form[k];
      });
      if (Object.keys(updates).length === 0) { toast.info("No changes"); onClose(); return; }
      await axios.put(`${API}/admin/registrations/${reg.id}`, updates, { headers: authHeaders() });
      toast.success("Guest updated");
      onSaved();
    } catch (err) { toast.error(err.response?.data?.detail || "Update failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Guest</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {[
            ["full_name", "Full Name"], ["mobile", "Mobile"], ["additional_phone", "Additional Phone"],
            ["email", "Email"], ["address", "Address"], ["arrival_date", "Arrival Date"],
            ["departure_date", "Departure Date"], ["num_people", "Number of People"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="text-xs text-[#0B1C3D]/60 block mb-1">{label}</label>
              <Input value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: key === "num_people" ? parseInt(e.target.value) || 1 : e.target.value }))}
                type={key === "num_people" ? "number" : key.includes("date") ? "date" : "text"} className="h-8 text-sm bg-white" />
            </div>
          ))}
          <div>
            <label className="text-xs text-[#0B1C3D]/60 block mb-1">Internal Notes (Admin Only)</label>
            <textarea value={form.admin_notes || ""} onChange={e => setForm(f => ({ ...f, admin_notes: e.target.value }))}
              className="w-full rounded-lg border border-[#D4AF37]/20 p-2 text-sm min-h-[60px]" placeholder="Internal notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#D4AF37] text-[#0B1C3D]">{saving ? "Saving..." : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
