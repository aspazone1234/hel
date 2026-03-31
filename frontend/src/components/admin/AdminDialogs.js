import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ─── Guest Detail View Dialog ───
export function GuestDetailDialog({ registration, open, onClose }) {
  if (!registration) return null;
  const r = registration;
  const Section = ({ title, children }) => <div className="space-y-2"><h4 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider">{title}</h4>{children}<Separator className="mt-3" /></div>;
  const Field = ({ label, value }) => <div className="flex justify-between text-sm py-0.5"><span className="text-[#0B1C3D]/50">{label}</span><span className="text-[#0B1C3D] font-medium text-right max-w-[60%]">{value || "-"}</span></div>;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white" data-testid="guest-detail-dialog">
        <DialogHeader><DialogTitle className="text-2xl text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Registration Details</DialogTitle></DialogHeader>
        <div className="space-y-5 mt-2">
          <Section title="General Details">
            <Field label="Full Name" value={r.full_name} />
            <Field label="Mobile" value={r.mobile} />
            <Field label="Email" value={r.email} />
            <Field label="City" value={r.city} />
            <Field label="Country" value={r.country} />
            <Field label="Intent" value={r.attendance_intent} />
            <Field label="Arrival Date" value={r.arrival_date} />
            <Field label="Departure Date" value={r.departure_date} />
            <Field label="Total People" value={r.num_people} />
          </Section>
          {r.attendees && r.attendees.length > 0 && (
            <Section title="Attendees">
              {r.attendees.map((att, i) => (
                <div key={i} className="bg-[#F8F1E5]/50 rounded-lg p-2 text-sm flex justify-between">
                  <span className="font-medium">{att.name || `Person ${i + 1}`}</span>
                  <span className="text-[#0B1C3D]/40 text-xs">{att.category}{att.special_needs ? ` - ${att.special_needs}` : ""}</span>
                </div>
              ))}
            </Section>
          )}
          <Section title="Management Details">
            <Field label="Arrival Status" value={r.arrival_status} />
            <Field label="Room Assignment" value={r.room_assignment} />
            <Field label="Admin Notes" value={r.admin_notes} />
          </Section>
          <Section title="Metadata (Permanent)">
            <Field label="Entry Type" value={r.entry_type === "manual" ? "Manual Entry" : "Form Submission"} />
            {r.entry_type === "form" && <Field label="Approved By" value={r.approved_by || "Pending"} />}
            {r.entry_type === "manual" && <Field label="Created By" value={r.created_by} />}
            <Field label="Last Updated By" value={r.last_updated_by} />
            <Field label="Last Updated At" value={r.last_updated_at ? new Date(r.last_updated_at).toLocaleString() : "-"} />
            <Field label="Created At" value={r.created_at ? new Date(r.created_at).toLocaleString() : "-"} />
          </Section>
          {r.message && <Section title="Message"><p className="text-sm text-[#0B1C3D]/70 italic">{r.message}</p></Section>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Management Details Edit Dialog ───
export function ManagementEditDialog({ registration, open, onClose, authHeaders, rooms, onSaved }) {
  const [arrivalStatus, setArrivalStatus] = useState("");
  const [roomAssignment, setRoomAssignment] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (registration) {
      setArrivalStatus(registration.arrival_status || "Not Arrived");
      setRoomAssignment(registration.room_assignment || "");
      setAdminNotes(registration.admin_notes || "");
    }
  }, [registration]);

  if (!registration) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/registrations/${registration.id}/management`, {
        arrival_status: arrivalStatus,
        room_assignment: roomAssignment,
        admin_notes: adminNotes,
      }, { headers: authHeaders() });
      toast.success("Management details updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white" data-testid="management-edit-dialog">
        <DialogHeader><DialogTitle>Management Details - {registration.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Arrival Status</Label>
            <Select value={arrivalStatus} onValueChange={setArrivalStatus}>
              <SelectTrigger className="mt-1" data-testid="mgmt-arrival-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Not Arrived">Not Arrived</SelectItem>
                <SelectItem value="Arrived">Arrived</SelectItem>
                <SelectItem value="Not Coming">Not Coming</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Room Assignment</Label>
            <Select value={roomAssignment || "_none"} onValueChange={v => setRoomAssignment(v === "_none" ? "" : v)}>
              <SelectTrigger className="mt-1" data-testid="mgmt-room-select"><SelectValue placeholder="Select room" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No Room</SelectItem>
                {(rooms || []).map(room => (
                  <SelectItem key={room.room_code} value={room.room_code} disabled={room.status === "occupied" && room.occupant_id !== registration.id}>
                    {room.room_code} ({room.ac_type}, Cap: {room.capacity}) {room.status === "occupied" ? `- Occupied by ${room.occupant_name}` : "- Available"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Admin Notes</Label>
            <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} className="mt-1" placeholder="Internal notes..." data-testid="mgmt-notes" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D]" data-testid="mgmt-save-btn">
            {saving ? "Saving..." : "Save Management Details"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manual Entry Dialog ───
export function ManualEntryDialog({ open, onClose, authHeaders, rooms, onSaved }) {
  const [form, setForm] = useState({ full_name: "", mobile: "", email: "", city: "", country: "", attendance_intent: "Yes", arrival_date: "", departure_date: "", num_people: 1, attendees: [{ name: "", category: "Adult", special_needs: "" }], message: "", arrival_status: "Not Arrived", room_assignment: "", admin_notes: "" });
  const [saving, setSaving] = useState(false);
  const [dupeWarning, setDupeWarning] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const checkDuplicate = async (mobile) => {
    if (mobile.length < 7) { setDupeWarning(null); return; }
    try {
      const { data } = await axios.get(`${API}/admin/registrations/check-duplicate`, { headers: authHeaders(), params: { mobile } });
      setDupeWarning(data.duplicates.length > 0 ? data.duplicates : null);
    } catch {}
  };

  const handleNumPeople = (val) => {
    const num = Math.max(1, Math.min(50, parseInt(val) || 1));
    const atts = Array.from({ length: num }, (_, i) => form.attendees[i] || { name: "", category: "Adult", special_needs: "" });
    setForm(f => ({ ...f, num_people: num, attendees: atts }));
  };

  const setAttendee = (idx, key, val) => setForm(f => { const a = [...f.attendees]; a[idx] = { ...a[idx], [key]: val }; return { ...f, attendees: a }; });

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.mobile.trim()) { toast.error("Name and mobile are required"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/registrations/manual`, form, { headers: authHeaders() });
      toast.success(`Manual entry "${form.full_name}" created`);
      onSaved();
      onClose();
      setForm({ full_name: "", mobile: "", email: "", city: "", country: "", attendance_intent: "Yes", arrival_date: "", departure_date: "", num_people: 1, attendees: [{ name: "", category: "Adult", special_needs: "" }], message: "", arrival_status: "Not Arrived", room_assignment: "", admin_notes: "" });
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white" data-testid="manual-entry-dialog">
        <DialogHeader><DialogTitle className="text-xl">Add Manual Entry</DialogTitle></DialogHeader>
        <div className="space-y-5 mt-2">
          <div>
            <h4 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider mb-3">General Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Full Name *</Label><Input value={form.full_name} onChange={e => set("full_name", e.target.value)} className="mt-1" data-testid="manual-name" /></div>
              <div>
                <Label>Mobile *</Label>
                <Input value={form.mobile} onChange={e => { set("mobile", e.target.value); checkDuplicate(e.target.value); }} className="mt-1" data-testid="manual-mobile" />
                {dupeWarning && (
                  <div className="mt-1 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-700">Possible duplicate: {dupeWarning.map(d => d.full_name).join(", ")}</div>
                  </div>
                )}
              </div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => set("email", e.target.value)} className="mt-1" /></div>
              <div><Label>City</Label><Input value={form.city} onChange={e => set("city", e.target.value)} className="mt-1" /></div>
              <div><Label>Country</Label><Input value={form.country} onChange={e => set("country", e.target.value)} className="mt-1" /></div>
              <div><Label>Intent</Label>
                <Select value={form.attendance_intent} onValueChange={v => set("attendance_intent", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="Most Probably">Most Probably</SelectItem><SelectItem value="Maybe">Maybe</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Arrival Date</Label><Input type="date" value={form.arrival_date} onChange={e => set("arrival_date", e.target.value)} className="mt-1" /></div>
              <div><Label>Departure Date</Label><Input type="date" value={form.departure_date} onChange={e => set("departure_date", e.target.value)} className="mt-1" /></div>
              <div><Label>Number of People</Label><Input type="number" min={1} max={50} value={form.num_people} onChange={e => handleNumPeople(e.target.value)} className="mt-1" /></div>
            </div>
            {form.num_people > 0 && (
              <div className="mt-3 space-y-2">
                {form.attendees.map((att, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <Input placeholder={`Person ${i + 1} name`} value={att.name} onChange={e => setAttendee(i, "name", e.target.value)} className="text-sm" />
                    <Select value={att.category} onValueChange={v => setAttendee(i, "category", v)}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Adult">Adult</SelectItem><SelectItem value="Child">Child</SelectItem><SelectItem value="Senior">Senior</SelectItem></SelectContent>
                    </Select>
                    <Input placeholder="Special needs" value={att.special_needs} onChange={e => setAttendee(i, "special_needs", e.target.value)} className="text-sm" />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3"><Label>Message</Label><Textarea value={form.message} onChange={e => set("message", e.target.value)} className="mt-1" placeholder="Optional note" /></div>
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider mb-3">Management Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Arrival Status</Label>
                <Select value={form.arrival_status} onValueChange={v => set("arrival_status", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Not Arrived">Not Arrived</SelectItem><SelectItem value="Arrived">Arrived</SelectItem><SelectItem value="Not Coming">Not Coming</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Room Assignment</Label>
                <Select value={form.room_assignment || "_none"} onValueChange={v => set("room_assignment", v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No Room</SelectItem>
                    {(rooms || []).filter(r => r.status === "available").map(r => <SelectItem key={r.room_code} value={r.room_code}>{r.room_code} ({r.ac_type})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3"><Label>Admin Notes</Label><Textarea value={form.admin_notes} onChange={e => set("admin_notes", e.target.value)} className="mt-1" placeholder="Internal notes" /></div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D] font-semibold" data-testid="manual-save-btn">
            {saving ? "Saving..." : "Create Manual Entry"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
