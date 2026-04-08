import { useState, useEffect } from "react";
import { Check, X, Eye, Search, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getGroupHead(reg) {
  const head = (reg.attendees || []).find(a => a.id === reg.group_head_id);
  return head?.name || reg.attendees?.[0]?.name || reg.primary_mobile || "Unknown";
}

export default function PendingApproval({ user, authHeaders }) {
  const [regs, setRegs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailReg, setDetailReg] = useState(null);

  const fetch = async (p = page, s = search) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/registrations`, {
        headers: authHeaders(),
        params: { bucket: "pending_approval", search: s || undefined, page: p, per_page: 20 }
      });
      setRegs(data.data);
      setTotal(data.total);
    } catch (err) {
      toast.error("Failed to load pending registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(1); }, []);

  const handleSearch = () => { setPage(1); fetch(1, search); };
  const handlePage = (p) => { setPage(p); fetch(p); };

  const handleApprove = async (id) => {
    try {
      await axios.put(`${API}/admin/registrations/${id}/approve`, {}, { headers: authHeaders() });
      toast.success("Approved! Moved to Expected Guest List");
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Approval failed");
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.put(`${API}/admin/registrations/${id}/reject`, {}, { headers: authHeaders() });
      toast.success("Rejected");
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Rejection failed");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div data-testid="pending-approval-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Pending Form Approval
          </h2>
          <p className="text-[#0B1C3D]/50 text-sm mt-1">{total} pending registration(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0B1C3D]/30" />
            <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Search..." className="pl-9 bg-white border-[#D4AF37]/20 w-56" data-testid="pending-search" />
          </div>
          <Button onClick={handleSearch} size="sm" className="bg-[#D4AF37] text-[#0B1C3D]">Search</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#0B1C3D]/40">Loading...</div>
      ) : regs.length === 0 ? (
        <div className="text-center py-20 text-[#0B1C3D]/40 bg-white rounded-xl border border-[#D4AF37]/10" data-testid="pending-empty">
          No pending registrations
        </div>
      ) : (
        <div className="space-y-3">
          {regs.map(reg => (
            <div key={reg.id} className="bg-white rounded-xl border border-[#D4AF37]/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`pending-row-${reg.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[#0B1C3D] text-sm">{getGroupHead(reg)}</span>
                  <span className="text-[10px] bg-[#0B1C3D]/5 px-2 py-0.5 rounded-full text-[#0B1C3D]/50 flex items-center gap-1">
                    <Users size={10} /> {reg.num_people} {reg.num_people > 1 ? "people" : "person"}
                  </span>
                </div>
                <p className="text-[#0B1C3D]/50 text-xs truncate">{reg.primary_mobile} | {reg.address?.city || ""} | {reg.attendance_intent}</p>
                <p className="text-[#0B1C3D]/40 text-[10px]">Submitted: {new Date(reg.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setDetailReg(reg)} className="border-[#D4AF37]/30 text-[#0B1C3D]/70" data-testid={`view-${reg.id}`}>
                  <Eye size={14} className="mr-1" /> View
                </Button>
                <Button size="sm" onClick={() => handleApprove(reg.id)} className="bg-green-600 hover:bg-green-700 text-white" data-testid={`approve-${reg.id}`}>
                  <Check size={14} className="mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleReject(reg.id)} className="border-red-300 text-red-600 hover:bg-red-50" data-testid={`reject-${reg.id}`}>
                  <X size={14} className="mr-1" /> Reject
                </Button>
              </div>
            </div>
          ))}

          {/* Pagination */}
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
    </div>
  );
}

function RegistrationDetailDialog({ reg, open, onClose }) {
  if (!reg) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="registration-detail-dialog">
        <DialogHeader>
          <DialogTitle className="text-[#0B1C3D]">Registration Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Detail label="Primary WhatsApp" value={reg.primary_mobile} />
            <Detail label="Additional Phone" value={reg.additional_phone} />
            <Detail label="Email" value={reg.email} />
            <Detail label="Language" value={reg.preferred_language === "hi" ? "Hindi" : "English"} />
            <Detail label="Total People" value={reg.num_people} />
            <Detail label="Attendance" value={reg.attendance_intent} />
            <Detail label="Arrival" value={reg.arrival_date} />
            <Detail label="Departure" value={reg.departure_date} />
          </div>
          {reg.address && (
            <div>
              <span className="text-[#0B1C3D]/50 text-xs">Address:</span>
              <p className="text-[#0B1C3D] text-sm">{[reg.address.full_address, reg.address.city, reg.address.state, reg.address.country].filter(Boolean).join(", ")}</p>
            </div>
          )}
          <div>
            <span className="text-[#0B1C3D]/50 text-xs block mb-1">Attendees:</span>
            {(reg.attendees || []).map((a, i) => (
              <div key={i} className={`py-1.5 px-3 rounded-lg mb-1 ${a.id === reg.group_head_id ? "bg-[#D4AF37]/10 border border-[#D4AF37]/30" : "bg-[#F8F1E5]"}`}>
                <span className="font-medium">{a.name || "Unnamed"}</span>
                {a.age && <span className="text-[#0B1C3D]/50 ml-2">Age: {a.age}</span>}
                {a.special_needs && <span className="text-orange-600 ml-2">| {a.special_needs}</span>}
                {a.id === reg.group_head_id && <span className="text-[#D4AF37] text-[10px] ml-2 font-bold">[HEAD]</span>}
              </div>
            ))}
          </div>
          {reg.family_special_request && <Detail label="Family Special Request" value={reg.family_special_request} />}
          {reg.message && <Detail label="Message" value={reg.message} />}
          {reg.selected_days?.length > 0 && <Detail label="Selected Days" value={reg.selected_days.join(", ")} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <span className="text-[#0B1C3D]/50 text-xs">{label}</span>
      <p className="text-[#0B1C3D] font-medium text-sm">{value}</p>
    </div>
  );
}
