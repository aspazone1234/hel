import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, Users, Eye, UserPlus, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getGroupHead(reg) {
  const head = (reg.attendees || []).find(a => a.id === reg.group_head_id);
  return head?.name || reg.attendees?.[0]?.name || reg.primary_mobile || "Unknown";
}

export default function ExpectedGuestList({ user, authHeaders }) {
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
        params: { bucket: "expected", search: s || undefined, page: p, per_page: 20 }
      });
      setRegs(data.data);
      setTotal(data.total);
    } catch (err) {
      toast.error("Failed to load expected guests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(1); }, []);
  const handleSearch = () => { setPage(1); fetch(1, search); };
  const handlePage = (p) => { setPage(p); fetch(p); };

  const handleMarkNotComing = async (id) => {
    try {
      await axios.post(`${API}/admin/registrations/${id}/mark-arrival`, { arrival_status: "not_coming", arrived_attendee_ids: [] }, { headers: authHeaders() });
      toast.success("Marked as not coming");
      fetch();
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div data-testid="expected-guest-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Expected Guest List</h2>
          <p className="text-[#0B1C3D]/50 text-sm mt-1">{total} expected group(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0B1C3D]/30" />
            <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Search..." className="pl-9 bg-white border-[#D4AF37]/20 w-56" data-testid="expected-search" />
          </div>
          <Button onClick={handleSearch} size="sm" className="bg-[#D4AF37] text-[#0B1C3D]">Search</Button>
          <Button onClick={() => setShowManual(true)} size="sm" variant="outline" className="border-[#D4AF37]/40 text-[#0B1C3D]" data-testid="add-manual-expected">
            <UserPlus size={14} className="mr-1" /> Add Manual
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#0B1C3D]/40">Loading...</div>
      ) : regs.length === 0 ? (
        <div className="text-center py-20 text-[#0B1C3D]/40 bg-white rounded-xl border border-[#D4AF37]/10" data-testid="expected-empty">
          No expected guests yet
        </div>
      ) : (
        <div className="space-y-3">
          {regs.map(reg => (
            <div key={reg.id} className="bg-white rounded-xl border border-[#D4AF37]/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`expected-row-${reg.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[#0B1C3D] text-sm">{getGroupHead(reg)}</span>
                  <span className="text-[10px] bg-blue-50 px-2 py-0.5 rounded-full text-blue-600 flex items-center gap-1">
                    <Users size={10} /> {reg.num_people}
                  </span>
                  {reg.entry_type === "manual" && <span className="text-[10px] bg-purple-50 px-2 py-0.5 rounded-full text-purple-600">Manual</span>}
                  {reg.arrival_status === "not_coming" && <span className="text-[10px] bg-red-50 px-2 py-0.5 rounded-full text-red-600">Not Coming</span>}
                </div>
                <div className="flex items-center gap-3 text-[#0B1C3D]/50 text-xs">
                  <span className="flex items-center gap-1"><Phone size={10} />{reg.primary_mobile}</span>
                  <span className="flex items-center gap-1"><MapPin size={10} />{reg.address?.city || "N/A"}</span>
                  <span>{reg.arrival_date} - {reg.departure_date}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setDetailReg(reg)} className="border-[#D4AF37]/30" data-testid={`view-expected-${reg.id}`}>
                  <Eye size={14} className="mr-1" /> View
                </Button>
                {reg.arrival_status !== "not_coming" && (
                  <Button size="sm" variant="outline" onClick={() => handleMarkNotComing(reg.id)} className="border-red-300 text-red-600 hover:bg-red-50" data-testid={`not-coming-${reg.id}`}>
                    Not Coming
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

      {/* Detail Dialog */}
      <RegistrationDetailDialog reg={detailReg} open={!!detailReg} onClose={() => setDetailReg(null)} />

      {/* Manual Entry Dialog */}
      <ManualEntryDialog open={showManual} onClose={() => setShowManual(false)} authHeaders={authHeaders} targetBucket="expected" onSaved={() => { setShowManual(false); fetch(); }} />
    </div>
  );
}

function RegistrationDetailDialog({ reg, open, onClose }) {
  if (!reg) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="expected-detail-dialog">
        <DialogHeader><DialogTitle className="text-[#0B1C3D]">Guest Details</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <D label="Primary WhatsApp" value={reg.primary_mobile} />
            <D label="Additional Phone" value={reg.additional_phone} />
            <D label="Email" value={reg.email} />
            <D label="Total People" value={reg.num_people} />
            <D label="Attendance" value={reg.attendance_intent} />
            <D label="Status" value={reg.arrival_status} />
            <D label="Arrival" value={reg.arrival_date} />
            <D label="Departure" value={reg.departure_date} />
          </div>
          {reg.address && <D label="Address" value={[reg.address.full_address, reg.address.city, reg.address.state, reg.address.country].filter(Boolean).join(", ")} />}
          <div>
            <span className="text-[#0B1C3D]/50 text-xs block mb-1">Attendees:</span>
            {(reg.attendees || []).map((a, i) => (
              <div key={i} className={`py-1.5 px-3 rounded-lg mb-1 ${a.id === reg.group_head_id ? "bg-[#D4AF37]/10 border border-[#D4AF37]/30" : "bg-[#F8F1E5]"}`}>
                <span className="font-medium">{a.name}</span>
                {a.age && <span className="text-[#0B1C3D]/50 ml-2">Age: {a.age}</span>}
                {a.special_needs && <span className="text-orange-600 ml-2">| {a.special_needs}</span>}
                {a.id === reg.group_head_id && <span className="text-[#D4AF37] text-[10px] ml-2 font-bold">[HEAD]</span>}
              </div>
            ))}
          </div>
          {reg.room_assignments?.length > 0 && <D label="Room(s)" value={reg.room_assignments.join(", ")} />}
          {reg.family_special_request && <D label="Family Request" value={reg.family_special_request} />}
          {reg.message && <D label="Message" value={reg.message} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManualEntryDialog({ open, onClose, authHeaders, targetBucket, onSaved }) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [additionalPhone, setAdditionalPhone] = useState("");
  const [numPeople, setNumPeople] = useState(1);
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/registrations/manual`, {
        primary_mobile: mobile,
        additional_phone: additionalPhone,
        address: { full_address: "", city, state: "", country: "" },
        num_people: numPeople,
        attendees: [{ name, age: "", special_needs: "" }],
        group_head_id: "",
        attendance_intent: "Yes",
        selected_days: [],
        admin_notes: notes,
        target_bucket: targetBucket,
      }, { headers: authHeaders() });
      toast.success("Manual entry added");
      setName(""); setMobile(""); setAdditionalPhone(""); setNumPeople(1); setCity(""); setNotes("");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="manual-entry-dialog">
        <DialogHeader><DialogTitle>Add Manual Entry ({targetBucket === "arrived" ? "Arrived" : "Expected"})</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-[#0B1C3D]/60">Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" data-testid="manual-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#0B1C3D]/60">Mobile</Label>
              <Input value={mobile} onChange={e => setMobile(e.target.value)} className="mt-1" data-testid="manual-mobile" />
            </div>
            <div>
              <Label className="text-xs text-[#0B1C3D]/60">People</Label>
              <Input type="number" min={1} value={numPeople} onChange={e => setNumPeople(parseInt(e.target.value) || 1)} className="mt-1" data-testid="manual-people" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-[#0B1C3D]/60">City</Label>
            <Input value={city} onChange={e => setCity(e.target.value)} className="mt-1" data-testid="manual-city" />
          </div>
          <div>
            <Label className="text-xs text-[#0B1C3D]/60">Admin Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" rows={2} data-testid="manual-notes" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D]" data-testid="manual-save-btn">
            {saving ? "Saving..." : "Add Entry"}
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
