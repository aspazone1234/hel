import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, Users, Eye, UserPlus, Phone, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getGroupHead(reg) {
  const head = (reg.attendees || []).find(a => a.id === reg.group_head_id);
  return head?.name || reg.attendees?.[0]?.name || reg.primary_mobile || "Unknown";
}

const STATUS_COLORS = {
  partially_arrived: "bg-amber-50 text-amber-700",
  arrived: "bg-green-50 text-green-700",
  departed: "bg-gray-100 text-gray-600",
};

export default function ArrivedGuestList({ user, authHeaders }) {
  const [regs, setRegs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailReg, setDetailReg] = useState(null);
  const [showManual, setShowManual] = useState(false);

  const fetch = async (p = page, s = search) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/registrations`, {
        headers: authHeaders(),
        params: { bucket: "arrived", search: s || undefined, page: p, per_page: 20 }
      });
      setRegs(data.data);
      setTotal(data.total);
    } catch (err) {
      toast.error("Failed to load arrived guests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(1); }, []);
  const handleSearch = () => { setPage(1); fetch(1, search); };
  const handlePage = (p) => { setPage(p); fetch(p); };

  const handleMarkDeparted = async (id) => {
    try {
      await axios.post(`${API}/admin/registrations/${id}/mark-arrival`, { arrival_status: "departed", arrived_attendee_ids: [] }, { headers: authHeaders() });
      toast.success("Marked as departed");
      fetch();
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div data-testid="arrived-guest-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Arrived Guest List</h2>
          <p className="text-[#0B1C3D]/50 text-sm mt-1">{total} arrived group(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0B1C3D]/30" />
            <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Search..." className="pl-9 bg-white border-[#D4AF37]/20 w-56" data-testid="arrived-search" />
          </div>
          <Button onClick={handleSearch} size="sm" className="bg-[#D4AF37] text-[#0B1C3D]">Search</Button>
          <Button onClick={() => setShowManual(true)} size="sm" variant="outline" className="border-[#D4AF37]/40 text-[#0B1C3D]" data-testid="add-manual-arrived">
            <UserPlus size={14} className="mr-1" /> Add Manual
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#0B1C3D]/40">Loading...</div>
      ) : regs.length === 0 ? (
        <div className="text-center py-20 text-[#0B1C3D]/40 bg-white rounded-xl border border-[#D4AF37]/10" data-testid="arrived-empty">
          No arrived guests yet
        </div>
      ) : (
        <div className="space-y-3">
          {regs.map(reg => (
            <div key={reg.id} className="bg-white rounded-xl border border-[#D4AF37]/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`arrived-row-${reg.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[#0B1C3D] text-sm">{getGroupHead(reg)}</span>
                  <span className="text-[10px] bg-blue-50 px-2 py-0.5 rounded-full text-blue-600 flex items-center gap-1">
                    <Users size={10} /> {reg.num_people}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[reg.arrival_status] || "bg-green-50 text-green-700"}`}>
                    {reg.arrival_status === "partially_arrived" ? "Partial" : reg.arrival_status === "departed" ? "Departed" : "Arrived"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[#0B1C3D]/50 text-xs">
                  <span className="flex items-center gap-1"><Phone size={10} />{reg.primary_mobile}</span>
                  {reg.room_assignments?.length > 0 && <span>Rooms: {reg.room_assignments.join(", ")}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setDetailReg(reg)} className="border-[#D4AF37]/30" data-testid={`view-arrived-${reg.id}`}>
                  <Eye size={14} className="mr-1" /> View
                </Button>
                {reg.arrival_status !== "departed" && (
                  <Button size="sm" variant="outline" onClick={() => handleMarkDeparted(reg.id)} className="border-gray-300 text-gray-600 hover:bg-gray-50" data-testid={`depart-${reg.id}`}>
                    Departed
                  </Button>
                )}
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => handlePage(page - 1)}><ChevronLeft size={14} /></Button>
              <span className="text-sm text-[#0B1C3D]/60">Page {page} of {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => handlePage(page + 1)}><ChevronRight size={14} /></Button>
            </div>
          )}
        </div>
      )}

      <ArrivedDetailDialog reg={detailReg} open={!!detailReg} onClose={() => setDetailReg(null)} authHeaders={authHeaders} onUpdated={() => { setDetailReg(null); fetch(); }} />
      <ManualEntryDialog open={showManual} onClose={() => setShowManual(false)} authHeaders={authHeaders} onSaved={() => { setShowManual(false); fetch(); }} />
    </div>
  );
}

function ArrivedDetailDialog({ reg, open, onClose, authHeaders, onUpdated }) {
  if (!reg) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="arrived-detail-dialog">
        <DialogHeader><DialogTitle className="text-[#0B1C3D]">Arrived Guest Details</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <D label="WhatsApp" value={reg.primary_mobile} />
            <D label="People" value={reg.num_people} />
            <D label="Status" value={reg.arrival_status} />
            <D label="Room(s)" value={reg.room_assignments?.join(", ")} />
          </div>
          <div>
            <span className="text-[#0B1C3D]/50 text-xs block mb-1">Attendees & Arrival Status:</span>
            {(reg.attendees || []).map((a, i) => (
              <div key={i} className={`py-1.5 px-3 rounded-lg mb-1 flex items-center gap-2 ${a.arrival_status === "arrived" ? "bg-green-50 border border-green-200" : "bg-[#F8F1E5]"}`}>
                {a.arrival_status === "arrived" ? <CheckCircle size={14} className="text-green-600" /> : <AlertCircle size={14} className="text-[#0B1C3D]/30" />}
                <span className="font-medium">{a.name}</span>
                {a.id === reg.group_head_id && <span className="text-[#D4AF37] text-[10px] font-bold">[HEAD]</span>}
                <span className={`text-[10px] ml-auto ${a.arrival_status === "arrived" ? "text-green-600" : "text-[#0B1C3D]/40"}`}>{a.arrival_status || "not_arrived"}</span>
              </div>
            ))}
          </div>
          {reg.family_special_request && <D label="Family Request" value={reg.family_special_request} />}
          {reg.admin_notes && <D label="Admin Notes" value={reg.admin_notes} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManualEntryDialog({ open, onClose, authHeaders, onSaved }) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [numPeople, setNumPeople] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/registrations/manual`, {
        primary_mobile: mobile,
        additional_phone: "",
        address: { full_address: "", city: "", state: "", country: "" },
        num_people: numPeople,
        attendees: [{ name, age: "", special_needs: "" }],
        group_head_id: "",
        attendance_intent: "Yes",
        selected_days: [],
        admin_notes: notes,
        target_bucket: "arrived",
      }, { headers: authHeaders() });
      toast.success("Guest added to Arrived list");
      setName(""); setMobile(""); setNumPeople(1); setNotes("");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="manual-arrived-dialog">
        <DialogHeader><DialogTitle>Add to Arrived List</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-[#0B1C3D]/60">Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" data-testid="manual-arrived-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-[#0B1C3D]/60">Mobile</Label><Input value={mobile} onChange={e => setMobile(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs text-[#0B1C3D]/60">People</Label><Input type="number" min={1} value={numPeople} onChange={e => setNumPeople(parseInt(e.target.value) || 1)} className="mt-1" /></div>
          </div>
          <div><Label className="text-xs text-[#0B1C3D]/60">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" rows={2} /></div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D]" data-testid="manual-arrived-save">
            {saving ? "Saving..." : "Add Guest"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function D({ label, value }) {
  if (!value && value !== 0) return null;
  return <div><span className="text-[#0B1C3D]/50 text-xs">{label}</span><p className="text-[#0B1C3D] font-medium text-sm">{value}</p></div>;
}
