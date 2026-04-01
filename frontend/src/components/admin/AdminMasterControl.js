import { useState, useEffect, useCallback } from "react";
import { Check, X, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminMasterControl({ user, authHeaders }) {
  const [pending, setPending] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewReg, setViewReg] = useState(null);
  const [showRejected, setShowRejected] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/registrations`, { headers: authHeaders(), params: { status: "pending", per_page: 200 } });
      setPending(data.data || []);
    } catch { toast.error("Failed to load pending"); }
    finally { setLoading(false); }
  }, [authHeaders]);

  const fetchRejected = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/registrations`, { headers: authHeaders(), params: { status: "rejected", per_page: 200 } });
      setRejected(data.data || []);
    } catch {}
  }, [authHeaders]);

  useEffect(() => { fetchPending(); fetchRejected(); }, [fetchPending, fetchRejected]);

  const handleAction = async (id, status) => {
    try {
      await axios.put(`${API}/admin/registrations/${id}/status`, { status }, { headers: authHeaders() });
      toast.success(status === "approved" ? "Approved" : "Rejected");
      fetchPending();
      fetchRejected();
    } catch (err) { toast.error(err.response?.data?.detail || "Action failed"); }
  };

  const handleBulkApprove = async () => {
    if (pending.length === 0) return;
    try {
      await axios.post(`${API}/admin/registrations/bulk-action`, { ids: pending.map(p => p.id), action: "approve" }, { headers: authHeaders() });
      toast.success(`${pending.length} entries approved`);
      fetchPending();
    } catch { toast.error("Bulk approve failed"); }
  };

  const handleBulkReject = async () => {
    if (pending.length === 0) return;
    try {
      await axios.post(`${API}/admin/registrations/bulk-action`, { ids: pending.map(p => p.id), action: "reject" }, { headers: authHeaders() });
      toast.success(`${pending.length} entries rejected`);
      fetchPending();
      fetchRejected();
    } catch { toast.error("Bulk reject failed"); }
  };

  return (
    <div className="space-y-6" data-testid="form-management-view">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Website Form Management</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleBulkApprove} disabled={pending.length === 0} className="bg-green-600 text-white hover:bg-green-700 h-8 text-xs" data-testid="bulk-approve">
            <Check size={14} className="mr-1" /> Approve All ({pending.length})
          </Button>
          <Button size="sm" onClick={handleBulkReject} disabled={pending.length === 0} variant="outline" className="text-red-600 border-red-300 h-8 text-xs" data-testid="bulk-reject">
            <X size={14} className="mr-1" /> Reject All
          </Button>
        </div>
      </div>

      {/* Pending Forms */}
      <div className="bg-white rounded-2xl border border-[#D4AF37]/20 overflow-hidden">
        <div className="bg-[#0B1C3D] text-[#F8F1E5] px-4 py-3 font-semibold text-sm">
          Pending Forms ({pending.length})
        </div>
        {loading ? (
          <div className="py-10 text-center text-[#0B1C3D]/40">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="py-10 text-center text-[#0B1C3D]/40">No pending forms</div>
        ) : (
          <div className="divide-y divide-[#D4AF37]/10">
            {pending.map(r => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#F8F1E5]/50 transition-colors" data-testid={`pending-${r.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#0B1C3D] text-sm truncate">{r.full_name}</p>
                  <p className="text-[#0B1C3D]/50 text-xs">{r.mobile} &middot; {r.num_people} people &middot; {r.arrival_date || "No date"}</p>
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  <button onClick={() => setViewReg(r)} className="p-1.5 rounded-lg hover:bg-[#D4AF37]/10 text-[#0B1C3D]/50" data-testid={`view-pending-${r.id}`}><Eye size={16} /></button>
                  <Button size="sm" onClick={() => handleAction(r.id, "approved")} className="bg-green-600 text-white hover:bg-green-700 h-7 text-xs px-3" data-testid={`approve-${r.id}`}>
                    <Check size={14} className="mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction(r.id, "rejected")} className="text-red-600 border-red-300 h-7 text-xs px-3" data-testid={`reject-${r.id}`}>
                    <X size={14} className="mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejected / Disapproved */}
      <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
        <button onClick={() => setShowRejected(!showRejected)} className="w-full px-4 py-3 flex items-center justify-between bg-red-50 text-red-700 font-semibold text-sm" data-testid="toggle-rejected">
          <span>Disapproved Entries ({rejected.length})</span>
          {showRejected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showRejected && (
          <div className="divide-y divide-red-100">
            {rejected.length === 0 ? (
              <div className="py-8 text-center text-[#0B1C3D]/40 text-sm">No disapproved entries</div>
            ) : rejected.map(r => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between opacity-60" data-testid={`rejected-${r.id}`}>
                <div>
                  <p className="font-medium text-[#0B1C3D] text-sm">{r.full_name}</p>
                  <p className="text-[#0B1C3D]/50 text-xs">{r.mobile} &middot; {r.num_people} people</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setViewReg(r)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" data-testid={`view-rejected-${r.id}`}>
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-red-400 text-center py-2">Disapproved entries cannot be restored. Manual re-entry is possible.</p>
          </div>
        )}
      </div>

      {/* View Registration Dialog */}
      <Dialog open={!!viewReg} onOpenChange={() => setViewReg(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registration Details</DialogTitle></DialogHeader>
          {viewReg && (
            <div className="space-y-3 text-sm">
              {[
                ["Name", viewReg.full_name], ["Mobile", viewReg.mobile], ["Additional Phone", viewReg.additional_phone],
                ["Email", viewReg.email], ["Address", viewReg.address], ["People", viewReg.num_people],
                ["Arrival", viewReg.arrival_date], ["Departure", viewReg.departure_date], ["Message", viewReg.message],
                ["Status", viewReg.approval_status], ["Type", viewReg.entry_type || "form"],
                ["Created", viewReg.created_at], ["Approved By", viewReg.approved_by],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} className="flex justify-between"><span className="text-[#0B1C3D]/50">{l}:</span><span className="text-[#0B1C3D] font-medium text-right">{v}</span></div>
              ))}
              {viewReg.attendees?.length > 0 && (
                <div>
                  <p className="text-[#0B1C3D]/50 mb-1">Attendees:</p>
                  {viewReg.attendees.map((a, i) => (
                    <p key={i} className="text-[#0B1C3D] text-xs">- {a.name} ({a.category}){a.special_needs ? ` [${a.special_needs}]` : ""}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewReg(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
