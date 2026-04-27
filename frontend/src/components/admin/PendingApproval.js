import { useState, useEffect, useCallback } from "react";
import { Check, X, Eye, Trash2, RefreshCw, Search, Download, Edit } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

const API = process.env.REACT_APP_BACKEND_URL;

export default function PendingApproval({ user }) {
  const [regs, setRegs] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewReg, setViewReg] = useState(null);
  const [editReg, setEditReg] = useState(null);
  const [tab, setTab] = useState("pending");
  const isSuper = user?.role === "superadmin";

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  }), []);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/guests/pending`, {
        headers: authHeaders(), params: { search, per_page: 100 }
      });
      setRegs(data.data || []);
    } catch {}
    setLoading(false);
  }, [authHeaders, search]);

  const fetchRejected = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/admin/registrations/rejected`, {
        headers: authHeaders(), params: { search, per_page: 100 }
      });
      setRejected(data.data || []);
    } catch {}
  }, [authHeaders, search]);

  useEffect(() => {
    fetchPending();
    fetchRejected();
  }, [fetchPending, fetchRejected]);

  const approveReg = async (id) => {
    try {
      await axios.put(`${API}/api/admin/registrations/${id}/approve`, {}, { headers: authHeaders() });
      toast.success("Approved and moved to Expected Guest List");
      setRegs(prev => prev.filter(r => r.id !== id));
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to approve"); }
  };

  const rejectReg = async (id) => {
    if (!window.confirm("Are you sure you want to disapprove this registration?")) return;
    try {
      await axios.put(`${API}/api/admin/registrations/${id}/reject`, {}, { headers: authHeaders() });
      toast.success("Registration disapproved");
      const rejectedItem = regs.find(r => r.id === id);
      setRegs(prev => prev.filter(r => r.id !== id));
      if (rejectedItem) setRejected(prev => [{ ...rejectedItem, approval_status: "rejected" }, ...prev]);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const restoreReg = async (id) => {
    try {
      await axios.put(`${API}/api/admin/registrations/${id}/status`, { status: "pending" }, { headers: authHeaders() });
      toast.success("Restored to pending");
      const restoredItem = rejected.find(r => r.id === id);
      setRejected(prev => prev.filter(r => r.id !== id));
      if (restoredItem) setRegs(prev => [{ ...restoredItem, approval_status: "pending" }, ...prev]);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const deleteReg = async (id) => {
    if (!window.confirm("Permanently delete this entry?")) return;
    try {
      await axios.delete(`${API}/api/admin/registrations/${id}/permanent`, { headers: authHeaders() });
      toast.success("Deleted");
      setRejected(prev => prev.filter(r => r.id !== id));
    } catch { toast.error("Failed"); }
  };

  const getHeadName = (reg) => {
    const head = (reg.attendees || []).find(a => a.id === reg.group_head_id);
    return head?.name || reg.primary_mobile;
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="pending-approval">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl font-bold text-[#0B1C3D]">Pending Form Approval</h1>
        <div className="flex gap-2 flex-wrap">
          {!isSuper && (
            <span className="bg-amber-50 text-amber-700 px-3 py-2 rounded-lg text-xs font-medium border border-amber-200">
              👁 View Only Mode
            </span>
          )}
          <button onClick={() => { const params = new URLSearchParams({ bucket: "pending", token: localStorage.getItem("admin_token"), search }); window.open(`${API}/api/admin/export-csv?${params}`, "_blank"); }}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200" data-testid="export-pending-csv">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => { const params = new URLSearchParams({ bucket: "pending", token: localStorage.getItem("admin_token"), search }); window.open(`${API}/api/admin/export-pdf?${params}`, "_blank"); }}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200" data-testid="export-pending-pdf">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("pending")} data-testid="tab-pending"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "pending" ? "bg-[#0B1C3D] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Pending ({regs.length})
        </button>
        <button onClick={() => setTab("disapproved")} data-testid="tab-disapproved"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "disapproved" ? "bg-red-600 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
          Disapproved ({rejected.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <input data-testid="pending-search" className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
          placeholder="Search by name or mobile..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {tab === "pending" && (
        <div className="space-y-2" data-testid="pending-list">
          {loading ? <p className="text-gray-500 text-center py-4">Loading...</p> :
            regs.length === 0 ? <p className="text-gray-400 text-center py-8">No pending approvals</p> :
            regs.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#0B1C3D]">{getHeadName(r)}</p>
                  <p className="text-xs text-gray-500">{r.num_people} people • {r.primary_mobile} • {r.attendance_intent}</p>
                  <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setViewReg(r)} data-testid={`view-pending-${r.id}`}
                    className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-100">
                    <Eye size={14} /> View
                  </button>
                  {isSuper && (
                    <>
                      <button onClick={() => setEditReg(r)} data-testid={`edit-pending-${r.id}`}
                        className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-indigo-100">
                        <Edit size={14} /> Edit
                      </button>
                      <button onClick={() => approveReg(r.id)} data-testid={`approve-${r.id}`}
                        className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-green-100">
                        <Check size={14} /> Approve
                      </button>
                      <button onClick={() => rejectReg(r.id)} data-testid={`reject-${r.id}`}
                        className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-red-100">
                        <X size={14} /> Disapprove
                      </button>
                      <button onClick={() => deleteReg(r.id)} data-testid={`delete-pending-${r.id}`}
                        className="bg-red-100 text-red-800 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-red-200">
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === "disapproved" && (
        <div className="space-y-2" data-testid="disapproved-list">
          {rejected.length === 0 ? <p className="text-gray-400 text-center py-8">No disapproved entries</p> :
            rejected.map((r) => (
              <div key={r.id} className="bg-red-50/50 rounded-xl p-4 border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#0B1C3D]">{getHeadName(r)}</p>
                  <p className="text-xs text-gray-500">{r.num_people} people • {r.primary_mobile}</p>
                  <p className="text-xs text-red-400">Disapproved by: {r.last_updated_by || "Admin"}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setViewReg(r)} data-testid={`view-rejected-${r.id}`}
                    className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-100">
                    <Eye size={14} /> View
                  </button>
                  {isSuper && (
                    <>
                      <button onClick={() => restoreReg(r.id)} data-testid={`restore-${r.id}`}
                        className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-amber-100">
                        <RefreshCw size={14} /> Restore
                      </button>
                      <button onClick={() => deleteReg(r.id)} data-testid={`delete-rejected-${r.id}`}
                        className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-red-100">
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Full View Modal */}
      <Dialog open={!!viewReg} onOpenChange={() => setViewReg(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0B1C3D]">Complete Registration Details</DialogTitle>
          </DialogHeader>
          {viewReg && <FullRegistrationView reg={viewReg} />}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editReg && <EditPendingDialog reg={editReg} onClose={() => setEditReg(null)} onSaved={() => { setEditReg(null); fetchPending(); fetchRejected(); }} authHeaders={authHeaders} />}
    </div>
  );
}

function EditPendingDialog({ reg, onClose, onSaved, authHeaders }) {
  const [form, setForm] = useState({
    additional_phone: reg.additional_phone || "",
    email: reg.email || "",
    address: { full_address: reg.address?.full_address || "", city: reg.address?.city || "", state: reg.address?.state || "", country: reg.address?.country || "India", pin_code: reg.address?.pin_code || "" },
    admin_notes: reg.admin_notes || "",
    attendees: (reg.attendees || []).map(a => ({ ...a })),
    expected_arrival_time: reg.expected_arrival_time || "",
    expected_departure_time: reg.expected_departure_time || "",
    travel_mode: reg.travel_mode || "",
    travel_details: reg.travel_details || "",
  });
  const [saving, setSaving] = useState(false);

  const TIME_OPTIONS = ["Early Morning (5-8 AM)", "Morning (8-11 AM)", "Afternoon (11 AM-2 PM)", "Afternoon (2-5 PM)", "Evening (5-8 PM)", "Night (8-11 PM)", "Late Night (11 PM+)"];

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/admin/registrations/${reg.id}`, form, { headers: authHeaders() });
      toast.success("Registration updated");
      onSaved();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to update"); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Registration</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600">Additional Phone</label>
              <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.additional_phone} onChange={e => setForm({...form, additional_phone: e.target.value})} /></div>
            <div><label className="text-xs font-medium text-gray-600">Email</label>
              <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          </div>
          <div><label className="text-xs font-medium text-gray-600">Full Address</label>
            <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.address.full_address} onChange={e => setForm({...form, address: {...form.address, full_address: e.target.value}})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600">Arrival Time</label>
              <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.expected_arrival_time} onChange={e => setForm({...form, expected_arrival_time: e.target.value})}>
                <option value="">Select...</option>{TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-gray-600">Departure Time</label>
              <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.expected_departure_time} onChange={e => setForm({...form, expected_departure_time: e.target.value})}>
                <option value="">Select...</option>{TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
          </div>
          <h4 className="font-semibold text-[#0B1C3D] pt-2">Attendees</h4>
          {form.attendees.map((a, i) => (
            <div key={a.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Person {i + 1} {a.id === reg.group_head_id && "(Head)"}</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded px-2 py-1.5 text-sm" placeholder="Name" value={a.name} onChange={e => { const atts = [...form.attendees]; atts[i] = {...atts[i], name: e.target.value}; setForm({...form, attendees: atts}); }} />
                <input className="border rounded px-2 py-1.5 text-sm" placeholder="Age" type="number" value={a.age} onChange={e => { const atts = [...form.attendees]; atts[i] = {...atts[i], age: e.target.value}; setForm({...form, attendees: atts}); }} />
              </div>
            </div>
          ))}
          <div><label className="text-xs font-medium text-gray-600">Admin Notes</label>
            <textarea className="w-full border rounded px-3 py-2 text-sm mt-1" rows={2} value={form.admin_notes} onChange={e => setForm({...form, admin_notes: e.target.value})} /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={save} disabled={saving} className="flex-1 bg-[#0B1C3D] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50" data-testid="save-edit-pending-btn">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={onClose} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FullRegistrationView({ reg, showAttendeeStatus = false }) {
  const headName = (reg.attendees || []).find(a => a.id === reg.group_head_id)?.name || "—";
  const addr = reg.address || {};
  const [refName, setRefName] = useState(reg.reference_person_name || "");
  useEffect(() => {
    // Resolve reference_person_name from the ID if the record doesn't already carry it.
    // (Legacy registrations created before name-denormalization stored only the UUID.)
    if (reg.reference_person_name || !reg.reference_person_id) {
      setRefName(reg.reference_person_name || "");
      return;
    }
    let cancelled = false;
    axios.get(`${API}/api/reference-persons/public`).then(r => {
      if (cancelled) return;
      const match = (r.data || []).find(p => p.id === reg.reference_person_id);
      setRefName(match?.name || "");
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [reg.reference_person_id, reg.reference_person_name]);
  return (
    <div className="space-y-4 text-sm" data-testid="full-reg-view">
      <Section title="Contact Information">
        <Field label="Primary Mobile" value={reg.primary_mobile} />
        <Field label="Additional Phone" value={reg.additional_phone} />
        <Field label="Email" value={reg.email} />
        <Field label="Preferred Language" value={reg.preferred_language === "hi" ? "Hindi" : "English"} />
      </Section>
      <Section title="Address">
        <Field label="Address" value={addr.full_address} />
        <Field label="City" value={addr.city} />
        <Field label="State" value={addr.state} />
        <Field label="Country" value={addr.country} />
      </Section>
      <Section title="Group Details">
        <Field label="Number of People" value={reg.num_people} />
        <Field label="Group Head" value={headName} />
        <Field label="Family Special Request" value={reg.family_special_request} />
      </Section>
      <Section title="Attendees">
        {(reg.attendees || []).map((a, i) => {
          const status = a.arrival_status || "not_arrived";
          const statusStyles = {
            arrived: "bg-green-100 text-green-700",
            not_arrived: "bg-gray-100 text-gray-500",
            departed: "bg-blue-100 text-blue-700",
            not_coming: "bg-red-100 text-red-600",
          };
          return (
            <div key={i} className="bg-gray-50 rounded-lg p-3 mb-2">
              <div className="flex justify-between items-start">
                <p className="font-medium">{a.name} {a.id === reg.group_head_id && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-1">Head</span>}</p>
                {showAttendeeStatus && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[status] || "bg-gray-100 text-gray-500"}`}>
                    {status === "arrived" ? "Present" : status === "not_arrived" ? "Absent" : status === "not_coming" ? "Not Coming" : status}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs">Age: {a.age} {a.special_needs && `• Needs: ${a.special_needs}`}</p>
            </div>
          );
        })}
      </Section>
      <Section title="Attendance & Travel">
        <Field label="Attendance Intent" value={reg.attendance_intent} />
        <Field label="Selected Days" value={(reg.selected_days || []).join(", ")} />
        <Field label="Expected Arrival Time" value={reg.expected_arrival_time} />
        <Field label="Expected Departure Time" value={reg.expected_departure_time} />
        <Field label="Travel Mode" value={reg.travel_mode} />
        <Field label="Travel Details" value={reg.travel_details} />
      </Section>
      <Section title="Relation Details">
        <Field label="Related Through" value={refName || "—"} />
        <Field label="Message / Special Request" value={reg.message} />
      </Section>
      <Section title="Status">
        <Field label="Approval Status" value={reg.approval_status} />
        <Field label="Arrival Status" value={reg.arrival_status} />
        <Field label="Room Assignments" value={(reg.room_assignments || []).join(", ") || "None"} />
        <Field label="Assigned Swayamsevak" value={reg.assigned_swamsevak || "Not assigned"} />
        <Field label="Swayamsevak Mobile" value={reg.assigned_swamsevak_mobile} />
        <Field label="Submitted At" value={reg.created_at ? new Date(reg.created_at).toLocaleString() : ""} />
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-semibold text-[#0B1C3D] text-sm mb-2 border-b pb-1">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="text-[#0B1C3D] font-medium text-right">{value}</span>
    </div>
  );
}

export { FullRegistrationView };
