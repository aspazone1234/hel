import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import axios from "axios";
import { GuestDetailDialog } from "./AdminDialogs";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminRecycleBin({ user, authHeaders }) {
  const [deleted, setDeleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/registrations`, { headers: authHeaders(), params: { status: "deleted", per_page: 200 } });
      setDeleted(data.data || []);
    } catch { toast.error("Failed to load recycle bin"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRestore = async (reg) => {
    try {
      await axios.put(`${API}/admin/registrations/${reg.id}/status`, { status: "pending" }, { headers: authHeaders() });
      toast.success(`${reg.full_name} restored to pending`);
      fetchData();
    } catch { toast.error("Restore failed"); }
  };

  return (
    <div className="space-y-4" data-testid="recycle-bin-view">
      <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Recycle Bin ({deleted.length})</h2>
      <p className="text-sm text-[#0B1C3D]/50">Deleted entries can only be restored. Permanent deletion is not allowed.</p>

      <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
        {loading ? <div className="text-center py-12 text-[#0B1C3D]/40">Loading...</div> : deleted.length === 0 ? <div className="text-center py-12 text-[#0B1C3D]/40">Recycle bin is empty</div> : (
          <Table>
            <TableHeader>
              <TableRow className="bg-red-50/50">
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Deleted By</TableHead>
                <TableHead>Last Changed By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deleted.map((reg, i) => (
                <TableRow key={reg.id} data-testid={`recycle-row-${i}`}>
                  <TableCell className="font-medium">{reg.full_name}</TableCell>
                  <TableCell>{reg.mobile}</TableCell>
                  <TableCell className="text-xs text-[#0B1C3D]/50">{reg.num_people} people | {reg.city || "-"}</TableCell>
                  <TableCell className="text-sm text-red-600">{reg.deleted_by || "-"}</TableCell>
                  <TableCell className="text-xs text-[#0B1C3D]/40">{reg.last_updated_by || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedReg(reg)} className="text-[#D4AF37] h-7"><Eye size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRestore(reg)} className="text-blue-600 h-7 text-xs" data-testid={`restore-btn-${i}`}><RotateCcw size={12} className="mr-1" /> Restore</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <GuestDetailDialog registration={selectedReg} open={!!selectedReg} onClose={() => setSelectedReg(null)} />
    </div>
  );
}
