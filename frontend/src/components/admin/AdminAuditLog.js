import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminAuditLog({ authHeaders }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/admin/audit-logs`, { headers: authHeaders(), params: { page, per_page: 50 } })
      .then(r => { setLogs(r.data.data || []); setTotal(r.data.total || 0); setTotalPages(r.data.total_pages || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const actionColor = (a) => {
    if (a.includes("approve")) return "bg-green-100 text-green-700";
    if (a.includes("reject")) return "bg-red-100 text-red-700";
    if (a.includes("delete")) return "bg-red-100 text-red-700";
    if (a.includes("restore")) return "bg-blue-100 text-blue-700";
    if (a.includes("room")) return "bg-purple-100 text-purple-700";
    if (a.includes("manual")) return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-4" data-testid="audit-log-view">
      <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Audit Log ({total})</h2>
      <p className="text-sm text-[#0B1C3D]/50">Complete record of all admin actions</p>

      <div className="bg-white rounded-2xl border border-[#D4AF37]/10 overflow-hidden">
        {loading ? <div className="text-center py-12 text-[#0B1C3D]/40">Loading...</div> : logs.length === 0 ? <div className="text-center py-12 text-[#0B1C3D]/40">No audit entries yet</div> : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8F1E5]/50">
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log, i) => (
                <TableRow key={i} data-testid={`audit-row-${i}`}>
                  <TableCell className="text-xs text-[#0B1C3D]/50 whitespace-nowrap">{log.performed_at ? new Date(log.performed_at).toLocaleString() : "-"}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${actionColor(log.action_type)}`}>{log.action_type.replace(/_/g, " ")}</span></TableCell>
                  <TableCell className="text-xs capitalize text-[#0B1C3D]/60">{log.target_type}</TableCell>
                  <TableCell className="font-medium text-sm">{log.target_name}</TableCell>
                  <TableCell className="text-xs text-[#0B1C3D]/50 max-w-[200px] truncate">{log.details}</TableCell>
                  <TableCell className="text-sm text-[#0B1C3D]/70">{log.performed_by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex items-center justify-between p-4 border-t border-[#D4AF37]/10">
          <span className="text-sm text-[#0B1C3D]/50">{total} total entries</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></Button>
            <span className="text-sm text-[#0B1C3D]/70">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
