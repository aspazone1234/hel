import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Download, Plus, Trash2, Eye, Edit2, AlertTriangle, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminGuestList({ user, authHeaders, onViewDetail, onManageDetail, onAddManual }) {
  const [regs, setRegs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState("");
  const [filterArrival, setFilterArrival] = useState("");
  const [filterDeparture, setFilterDeparture] = useState("");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status: "approved", page, per_page: perPage };
      if (search) params.search = search;
      if (filterArrival) params.arrival_date = filterArrival;
      if (filterDeparture) params.departure_date = filterDeparture;
      const { data } = await axios.get(`${API}/admin/registrations`, { headers: authHeaders(), params });
      setRegs(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch { toast.error("Failed to load registrations"); }
    finally { setLoading(false); }
  }, [page, perPage, search, filterArrival, filterDeparture]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === regs.length ? [] : regs.map(r => r.id));

  const handleBulkDelete = async () => {
    if (!selected.length) return;
    if (!window.confirm(`Delete ${selected.length} entries?`)) return;
    try {
      await axios.post(`${API}/admin/registrations/bulk-action`, { ids: selected, action: "delete" }, { headers: authHeaders() });
      toast.success(`${selected.length} entries moved to recycle bin`);
      setSelected([]);
      fetchData();
    } catch { toast.error("Bulk delete failed"); }
  };

  const handleBulkStatus = async (status) => {
    if (!selected.length) return;
    try {
      await axios.post(`${API}/admin/registrations/bulk-action`, { ids: selected, action: "status_update", status }, { headers: authHeaders() });
      toast.success(`${selected.length} entries updated to ${status}`);
      setSelected([]);
      fetchData();
    } catch { toast.error("Bulk status update failed"); }
  };

  const handleDelete = async (reg) => {
    if (!window.confirm(`Move "${reg.full_name}" to recycle bin?`)) return;
    try {
      await axios.put(`${API}/admin/registrations/${reg.id}/status`, { status: "deleted" }, { headers: authHeaders() });
      toast.success("Moved to recycle bin");
      fetchData();
    } catch { toast.error("Failed to delete"); }
  };

  const handleExportPDF = async () => {
    try {
      const res = await axios.get(`${API}/admin/export-pdf`, { headers: authHeaders(), params: { report_type: "guestlist" }, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url; a.download = "guest_list.pdf"; a.click(); URL.revokeObjectURL(url);
      toast.success("PDF exported");
    } catch { toast.error("PDF export failed"); }
  };
  const handleExportCSV = async () => {
    try {
      const res = await axios.get(`${API}/admin/export-csv`, { headers: authHeaders(), responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = "approved_guests.csv"; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("Export failed"); }
  };

  const statusBadge = (s) => {
    const map = { "Arrived": "bg-green-100 text-green-700", "Not Arrived": "bg-gray-100 text-gray-600", "Not Coming": "bg-red-100 text-red-700" };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s] || map["Not Arrived"]}`}>{s || "Not Arrived"}</span>;
  };
  const typeBadge = (t) => t === "manual"
    ? <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">Manual</span>
    : <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D4AF37]/15 text-[#D4AF37] uppercase">Form</span>;

  return (
    <div className="space-y-4" data-testid="guest-list-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Final Guest List</h2>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={onAddManual} className="bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90" data-testid="add-manual-btn"><Plus size={16} className="mr-1" /> Add Manual Entry</Button>
          <Button variant="outline" onClick={handleExportPDF} className="border-[#0B1C3D]/20" data-testid="export-pdf-btn"><FileText size={16} className="mr-1" /> Export PDF</Button>
          <Button variant="outline" onClick={handleExportCSV} className="border-[#0B1C3D]/20" data-testid="export-csv-btn"><Download size={16} className="mr-1" /> Export CSV</Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white rounded-xl p-4 border border-[#D4AF37]/10">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0B1C3D]/30" />
          <Input data-testid="guest-search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, mobile, room..." className="pl-9 border-[#D4AF37]/20" />
        </div>
        <Input type="date" value={filterArrival} onChange={e => { setFilterArrival(e.target.value); setPage(1); }} placeholder="Arrival" className="w-40 border-[#D4AF37]/20" data-testid="filter-arrival" />
        <Input type="date" value={filterDeparture} onChange={e => { setFilterDeparture(e.target.value); setPage(1); }} placeholder="Departure" className="w-40 border-[#D4AF37]/20" data-testid="filter-departure" />
        <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(1); }}>
          <SelectTrigger className="w-24 border-[#D4AF37]/20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3 flex-wrap" data-testid="bulk-actions">
          <span className="text-blue-700 text-sm font-medium">{selected.length} selected</span>
          <Button size="sm" variant="outline" onClick={() => handleBulkStatus("Arrived")} className="border-green-300 text-green-700 hover:bg-green-50">Mark Arrived</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkStatus("Not Coming")} className="border-red-300 text-red-600 hover:bg-red-50">Mark Not Coming</Button>
          <Button size="sm" variant="outline" onClick={handleBulkDelete} className="border-red-300 text-red-600 hover:bg-red-50"><Trash2 size={14} className="mr-1" /> Delete Selected</Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#D4AF37]/10 overflow-hidden">
        {loading ? <div className="text-center py-12 text-[#0B1C3D]/40">Loading...</div> : regs.length === 0 ? <div className="text-center py-12 text-[#0B1C3D]/40">No approved guests yet</div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F8F1E5]/50">
                  <TableHead className="w-10"><Checkbox checked={selected.length === regs.length && regs.length > 0} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead>Arrival Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Management</TableHead>
                  <TableHead>Last Changed By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regs.map((reg, i) => (
                  <TableRow key={reg.id} className="hover:bg-[#D4AF37]/5" data-testid={`guest-row-${i}`}>
                    <TableCell><Checkbox checked={selected.includes(reg.id)} onCheckedChange={() => toggleSelect(reg.id)} /></TableCell>
                    <TableCell>{statusBadge(reg.arrival_status)}</TableCell>
                    <TableCell>
                      <span className="font-medium text-[#0B1C3D]">{reg.full_name}</span>
                      {typeBadge(reg.entry_type)}
                    </TableCell>
                    <TableCell>{reg.num_people}</TableCell>
                    <TableCell className="text-xs text-[#0B1C3D]/60">
                      {reg.arrival_date && <div>Arr: {reg.arrival_date}</div>}
                      {reg.departure_date && <div>Dep: {reg.departure_date}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{reg.mobile}</TableCell>
                    <TableCell>
                      {(!reg.room_assignment && reg.arrival_status === "Not Arrived") ? (
                        <button onClick={() => onManageDetail(reg)} className="text-amber-600 hover:text-amber-800 text-xs font-medium flex items-center gap-1" data-testid={`manage-btn-${i}`}>
                          <AlertTriangle size={12} /> Add
                        </button>
                      ) : (
                        <button onClick={() => onManageDetail(reg)} className="text-blue-600 hover:text-blue-800 text-xs font-medium" data-testid={`manage-btn-${i}`}>
                          Edit
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-[#0B1C3D]/40">{reg.last_updated_by || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onViewDetail(reg)} className="text-[#D4AF37]" data-testid={`view-btn-${i}`}><Eye size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(reg)} className="text-red-500 hover:text-red-700" data-testid={`delete-btn-${i}`}><Trash2 size={14} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-[#D4AF37]/10">
          <span className="text-sm text-[#0B1C3D]/50">Showing {regs.length} of {total} entries</span>
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
