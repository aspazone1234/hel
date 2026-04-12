import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* === Guest Detail Dialog === */
export function GuestDetailDialog({ registration: reg, open, onClose }) {
  if (!reg) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" data-testid="guest-detail-dialog">
        <DialogHeader><DialogTitle>Guest Details</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          {[
            ["Name", reg.full_name], ["Mobile", reg.mobile], ["Additional Phone", reg.additional_phone],
            ["Email", reg.email], ["Address", reg.address], ["City", reg.city], ["Country", reg.country],
            ["People", reg.num_people], ["Arrival", reg.arrival_date], ["Departure", reg.departure_date],
            ["Arrival Status", reg.arrival_status], ["Room", reg.room_assignment],
            ["Message", reg.message], ["Status", reg.approval_status], ["Type", reg.entry_type || "form"],
          ].filter(([, v]) => v).map(([l, v]) => (
            <div key={l} className="flex justify-between"><span className="text-[#0B1C3D]/50">{l}:</span><span className="text-[#0B1C3D] font-medium text-right">{String(v)}</span></div>
          ))}
          {reg.attendees?.length > 0 && (
            <div>
              <p className="text-[#0B1C3D]/50 font-medium mb-1">Attendees:</p>
              {reg.attendees.map((a, i) => (
                <p key={i} className="text-[#0B1C3D] text-xs">- {a.name} ({a.category}){a.special_needs ? ` [${a.special_needs}]` : ""}</p>
              ))}
            </div>
          )}
          {reg.admin_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-[#0B1C3D]/50 text-xs font-medium mb-1">Internal Notes:</p>
              <p className="text-[#0B1C3D] text-sm">{reg.admin_notes}</p>
            </div>
          )}
          <div className="pt-3 border-t border-[#D4AF37]/10 space-y-1">
            <p className="text-[#0B1C3D]/30 text-[10px]">Registered: {reg.created_at ? new Date(reg.created_at).toLocaleString() : "-"}</p>
            {reg.approved_by && <p className="text-[#0B1C3D]/30 text-[10px]">Approved by: {reg.approved_by}</p>}
            {reg.created_by && <p className="text-[#0B1C3D]/30 text-[10px]">Created by: {reg.created_by}</p>}
            {reg.last_updated_by && <p className="text-[#0B1C3D]/30 text-[10px]">Last updated by: {reg.last_updated_by}</p>}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* === Manual Entry Dialog (Simplified - no management/room/arrival fields) === */
export function ManualEntryDialog({ open, onClose, authHeaders, onSaved }) {
  const [form, setForm] = useState({
    full_name: "", mobile: "", additional_phone: "", email: "", address: "",
    attendance_intent: "Yes", arrival_date: "", departure_date: "",
    num_people: 1, attendees: [{ name: "", category: "Adult", special_needs: "" }],
    message: "", admin_notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleNumChange = (val) => {
    const n = Math.max(1, Math.min(50, parseInt(val) || 1));
    const attendees = Array.from({ length: n }, (_, i) => form.attendees[i] || { name: "", category: "Adult", special_needs: "" });
    setForm(f => ({ ...f, num_people: n, attendees }));
  };

  const updateAttendee = (i, k, v) => {
    const attendees = [...form.attendees];
    attendees[i] = { ...attendees[i], [k]: v };
    setForm(f => ({ ...f, attendees }));
  };

  const checkDuplicate = async () => {
    if (!form.mobile) return;
    try {
      const { data } = await axios.get(`${API}/admin/registrations/check-duplicate`, { headers: authHeaders(), params: { mobile: form.mobile } });
      if (data.exists) setDupWarning(`Mobile ${form.mobile} already exists: ${data.name}`);
      else setDupWarning(null);
    } catch { setDupWarning(null); }
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.mobile.trim()) return toast.error("Name and Mobile are required");
    if (!form.address.trim()) return toast.error("Address is required");
    setSaving(true);
    try {
      await axios.post(`${API}/admin/registrations/manual`, form, { headers: authHeaders() });
      toast.success("Manual entry created (added to Final Guest List)");
      setForm({ full_name: "", mobile: "", additional_phone: "", email: "", address: "", attendance_intent: "Yes", arrival_date: "", departure_date: "", num_people: 1, attendees: [{ name: "", category: "Adult", special_needs: "" }], message: "", admin_notes: "" });
      setDupWarning(null);
      onSaved();
      onClose();
    } catch (err) { const d = err.response?.data?.detail; toast.error(typeof d === "string" ? d : "Create failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="manual-entry-dialog">
        <DialogHeader><DialogTitle>Manual Entry</DialogTitle></DialogHeader>
        <p className="text-xs text-[#0B1C3D]/50 -mt-2">Entry will be directly added to the Final Guest List (auto-approved)</p>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Full Name *</Label><Input value={form.full_name} onChange={e => set("full_name", e.target.value)} className="mt-1 h-8 text-sm" data-testid="manual-name" /></div>
            <div>
              <Label className="text-xs">Mobile *</Label>
              <Input value={form.mobile} onChange={e => set("mobile", e.target.value)} onBlur={checkDuplicate} className="mt-1 h-8 text-sm" data-testid="manual-mobile" />
              {dupWarning && <p className="text-orange-500 text-[10px] mt-1">{dupWarning}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Additional Phone</Label><Input value={form.additional_phone} onChange={e => set("additional_phone", e.target.value)} className="mt-1 h-8 text-sm" /></div>
            <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="mt-1 h-8 text-sm" /></div>
          </div>
          <div>
            <Label className="text-xs">Address *</Label>
            <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="City, Country" className="mt-1 h-8 text-sm" data-testid="manual-address" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Arrival Date</Label><Input type="date" value={form.arrival_date} onChange={e => set("arrival_date", e.target.value)} className="mt-1 h-8 text-sm" /></div>
            <div><Label className="text-xs">Departure Date</Label><Input type="date" value={form.departure_date} onChange={e => set("departure_date", e.target.value)} className="mt-1 h-8 text-sm" /></div>
            <div><Label className="text-xs">People</Label><Input type="number" min={1} max={50} value={form.num_people} onChange={e => handleNumChange(e.target.value)} className="mt-1 h-8 text-sm" /></div>
          </div>

          {form.num_people > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Attendees</Label>
              {form.attendees.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={a.name} onChange={e => updateAttendee(i, "name", e.target.value)} placeholder={`Person ${i + 1} name`} className="h-7 text-xs flex-1" />
                  <select value={a.category} onChange={e => updateAttendee(i, "category", e.target.value)} className="h-7 text-xs rounded border border-gray-200 px-2">
                    <option>Adult</option><option>Child</option><option>Elderly</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          <div>
            <Label className="text-xs">Internal Notes (Admin Only)</Label>
            <textarea value={form.admin_notes} onChange={e => set("admin_notes", e.target.value)} className="w-full mt-1 rounded-lg border border-[#D4AF37]/20 p-2 text-sm min-h-[50px]" placeholder="Notes..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#D4AF37] text-[#0B1C3D]" data-testid="manual-entry-save">{saving ? "Creating..." : "Create Entry"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
