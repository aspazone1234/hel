import { useState, useEffect, useCallback } from "react";
import { Check, X, Eye, Trash2, RefreshCw, Search, Download } from "lucide-react";
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
      await axios.put(`${API}/api/admin/registrations/${id}`, { approval_status: "approved", arrival_status: "not_arrived" }, { headers: authHeaders() });
      toast.success("Approved and moved to Expected Guest List");
      setRegs(prev => prev.filter(r => r.id !== id));
    } catch { toast.error("Failed to approve"); }
  };

  const rejectReg = async (id) => {
    if (!window.confirm("Are you sure you want to disapprove this registration?")) return;
    try {
      await axios.put(`${API}/api/admin/registrations/${id}`, { approval_status: "rejected" }, { headers: authHeaders() });
      toast.success("Registration disapproved");
      const rejectedItem = regs.find(r => r.id === id);
      setRegs(prev => prev.filter(r => r.id !== id));
      if (rejectedItem) setRejected(prev => [{ ...rejectedItem, approval_status: "rejected" }, ...prev]);
    } catch { toast.error("Failed"); }
  };

  const restoreReg = async (id) => {
    try {
      await axios.put(`${API}/api/admin/registrations/${id}`, { approval_status: "pending" }, { headers: authHeaders() });
      toast.success("Restored to pending");
      const restoredItem = rejected.find(r => r.id === id);
      setRejected(prev => prev.filter(r => r.id !== id));
      if (restoredItem) setRegs(prev => [{ ...restoredItem, approval_status: "pending" }, ...prev]);
    } catch { toast.error("Failed"); }
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
        <button onClick={() => { const token = localStorage.getItem("admin_token"); window.open(`${API}/api/admin/export-csv?bucket=pending&token=${token}`, "_blank"); }}
          className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200" data-testid="export-pending-csv">
          <Download size={14} /> Export CSV
        </button>
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
                  <button onClick={() => approveReg(r.id)} data-testid={`approve-${r.id}`}
                    className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-green-100">
                    <Check size={14} /> Approve
                  </button>
                  <button onClick={() => rejectReg(r.id)} data-testid={`reject-${r.id}`}
                    className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-red-100">
                    <X size={14} /> Disapprove
                  </button>
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
    </div>
  );
}

function FullRegistrationView({ reg }) {
  const headName = (reg.attendees || []).find(a => a.id === reg.group_head_id)?.name || "—";
  const addr = reg.address || {};
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
        {(reg.attendees || []).map((a, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 mb-2">
            <p className="font-medium">{a.name} {a.id === reg.group_head_id && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-1">Head</span>}</p>
            <p className="text-gray-500">Age: {a.age} {a.special_needs && `• Needs: ${a.special_needs}`}</p>
          </div>
        ))}
      </Section>
      <Section title="Attendance & Travel">
        <Field label="Attendance Intent" value={reg.attendance_intent} />
        <Field label="Selected Days" value={(reg.selected_days || []).join(", ")} />
        <Field label="Expected Arrival Time" value={reg.expected_arrival_time} />
        <Field label="Expected Departure Time" value={reg.expected_departure_time} />
        <Field label="Travel Mode" value={reg.travel_mode} />
        <Field label="Travel Details" value={reg.travel_details} />
      </Section>
      <Section title="Reference Details">
        <Field label="Reference Person" value={reg.reference_person_name || reg.reference_person_id} />
        <Field label="Relation with Reference Person" value={reg.relation_category} />
        <Field label="Message / Special Request" value={reg.message} />
      </Section>
      <Section title="Status">
        <Field label="Approval Status" value={reg.approval_status} />
        <Field label="Arrival Status" value={reg.arrival_status} />
        <Field label="Room Assignments" value={(reg.room_assignments || []).join(", ") || "None"} />
        <Field label="Assigned Swamsevak" value={reg.assigned_swamsevak || "Not assigned"} />
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
