import { useState, useEffect, useCallback } from "react";
import { Eye, Search, Plane, Undo2, Filter, Download, Trash2, Edit } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { FullRegistrationView } from "./PendingApproval";
import AddressSelector from "../AddressSelector";

const API = process.env.REACT_APP_BACKEND_URL;

function EditArrivedDialog({ reg, user, onClose, onSaved, authHeaders, customFields }) {
  const isSuper = user?.role === "superadmin";
  const [form, setForm] = useState({
    additional_phone: reg.additional_phone || "",
    email: reg.email || "",
    address: { full_address: reg.address?.full_address || "", city: reg.address?.city || "", state: reg.address?.state || "", country: reg.address?.country || "India", pin_code: reg.address?.pin_code || "" },
    admin_notes: reg.admin_notes || "",
    attendees: (reg.attendees || []).map(a => ({ ...a })),
    travel_mode: reg.travel_mode || "",
    travel_details: reg.travel_details || "",
    family_special_request: reg.family_special_request || "",
    selected_days: reg.selected_days || [],
    reference_person_id: reg.reference_person_id || "",
    reference_person_name: reg.reference_person_name || "",
    expected_arrival_time: reg.expected_arrival_time || "",
    expected_departure_time: reg.expected_departure_time || "",
    group_head_id: reg.group_head_id || "",
  });
  const [customFieldValues, setCustomFieldValues] = useState(reg.custom_field_values || {});
  const [refPersons, setRefPersons] = useState([]);
  const [saving, setSaving] = useState(false);

  const DAYS = ["27-May", "28-May", "29-May", "30-May", "31-May", "1-Jun", "2-Jun", "3-Jun", "4-Jun"];
  const TIME_OPTIONS = ["Early Morning (5-8 AM)", "Morning (8-11 AM)", "Afternoon (11 AM-2 PM)", "Afternoon (2-5 PM)", "Evening (5-8 PM)", "Night (8-11 PM)", "Late Night (11 PM+)"];

  useEffect(() => {
    axios.get(`${API}/api/reference-persons/public`).then(r => setRefPersons(r.data || [])).catch(() => {});
  }, []);

  const toggleDay = (day) => {
    setForm(f => ({...f, selected_days: f.selected_days.includes(day) ? f.selected_days.filter(d => d !== day) : [...f.selected_days, day]}));
  };

  // Custom fields applicable to arrived guests
  const applicableFields = (customFields || []).filter(cf => {
    if (cf.target_scope === "expected") return false;
    if (cf.applies_to?.length > 0 && !cf.applies_to.includes(reg.id)) return false;
    return true;
  });

  const renderCustomFieldInput = (cf) => {
    const val = customFieldValues[cf.id] ?? cf.default_value ?? "";
    const update = (v) => setCustomFieldValues(prev => ({ ...prev, [cf.id]: v }));
    if (cf.field_type === "toggle") return <label className="flex items-center gap-2"><input type="checkbox" checked={val === true || val === "true"} onChange={e => update(e.target.checked)} className="rounded" /><span className="text-xs">{val === true || val === "true" ? "Yes" : "No"}</span></label>;
    if (cf.field_type === "select") return <select value={val} onChange={e => update(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">{(cf.options || []).map(o => <option key={o} value={o}>{o}</option>)}</select>;
    if (cf.field_type === "number") return <input type="number" value={val} onChange={e => update(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />;
    if (cf.field_type === "date") return <input type="date" value={val} onChange={e => update(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />;
    return <input type="text" value={val} onChange={e => update(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />;
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = isSuper ? { ...form, custom_field_values: customFieldValues } : { admin_notes: form.admin_notes, custom_field_values: customFieldValues };
      await axios.put(`${API}/api/admin/registrations/${reg.id}`, payload, { headers: authHeaders() });
      toast.success("Registration updated");
      onSaved();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to update"); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit — {form.attendees.find(a => a.id === form.group_head_id)?.name || reg.primary_mobile} (Arrived)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {!isSuper && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
              Volunteer edit: Only Admin Notes and Custom Fields are editable.
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-700">Admin Notes</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm mt-1 resize-none" rows={2}
              value={form.admin_notes} onChange={e => setForm({...form, admin_notes: e.target.value})}
              data-testid="arrived-admin-notes-input" />
          </div>
          {applicableFields.length > 0 && (
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-3 space-y-3">
              <p className="text-xs font-semibold text-indigo-700">Admin Custom Fields</p>
              {applicableFields.map(cf => (
                <div key={cf.id}><label className="text-xs font-medium text-gray-600 block mb-1">{cf.name}</label>{renderCustomFieldInput(cf)}</div>
              ))}
            </div>
          )}
          {isSuper && (
            <>
              <div className="pt-1 border-t"><p className="text-xs font-bold text-[#0B1C3D] mb-3 uppercase tracking-wider">Customer-Submitted Fields</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Additional Phone</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.additional_phone} onChange={e => setForm({...form, additional_phone: e.target.value})} /></div>
                <div><label className="text-xs font-medium text-gray-600">Email</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              </div>
              <div><label className="text-xs font-semibold text-gray-700 block mb-1">Address</label>
                <AddressSelector value={form.address} onChange={(addr) => setForm({...form, address: addr})} /></div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">Stay Dates</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDay(d)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${form.selected_days.includes(d) ? "bg-[#0B1C3D] text-white border-[#0B1C3D]" : "bg-white text-gray-600 border-gray-300 hover:border-[#0B1C3D]"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Expected Departure</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.expected_departure_time} onChange={e => setForm({...form, expected_departure_time: e.target.value})}>
                    <option value="">Select...</option>{TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div><label className="text-xs font-medium text-gray-600">Travel Mode</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.travel_mode} onChange={e => setForm({...form, travel_mode: e.target.value})} /></div>
              </div>
              <div>
                <div><label className="text-xs font-medium text-gray-600">Reference Person</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.reference_person_id}
                    onChange={e => {
                      const rp = refPersons.find(r => r.id === e.target.value);
                      setForm({...form, reference_person_id: e.target.value, reference_person_name: rp?.name || ""});
                    }}>
                    <option value="">Select...</option>
                    {refPersons.map(rp => <option key={rp.id} value={rp.id}>{rp.name}</option>)}
                  </select></div>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Family Special Request</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.family_special_request} onChange={e => setForm({...form, family_special_request: e.target.value})} /></div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">Attendees</label>
                {form.attendees.map((a, i) => (
                  <div key={a.id} className={`bg-gray-50 rounded-xl p-3 space-y-2 border mb-2 ${a.id === form.group_head_id ? "border-amber-300" : "border-gray-200"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-gray-500">Person {i + 1}</p>
                      <button type="button" onClick={() => setForm(f => ({...f, group_head_id: a.id}))}
                        className={`text-xs px-2 py-0.5 rounded-full transition ${a.id === form.group_head_id ? "bg-amber-100 text-amber-700 font-semibold" : "bg-gray-100 text-gray-500"}`}>
                        {a.id === form.group_head_id ? "Head of Family" : "Set as Head"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input className="border rounded-lg px-2 py-1.5 text-sm" placeholder="Name" value={a.name}
                        onChange={e => { const atts = [...form.attendees]; atts[i] = {...atts[i], name: e.target.value}; setForm({...form, attendees: atts}); }} />
                      <input className="border rounded-lg px-2 py-1.5 text-sm" placeholder="Age" type="number" value={a.age}
                        onChange={e => { const atts = [...form.attendees]; atts[i] = {...atts[i], age: e.target.value}; setForm({...form, attendees: atts}); }} />
                    </div>
                    <input className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="Special needs" value={a.special_needs || ""}
                      onChange={e => { const atts = [...form.attendees]; atts[i] = {...atts[i], special_needs: e.target.value}; setForm({...form, attendees: atts}); }} />
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={save} disabled={saving} className="flex-1 bg-[#0B1C3D] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-[#1a3a6b] transition" data-testid="save-edit-arrived-btn">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={onClose} className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancel</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ArrivedGuestList({ user }) {
  const [regs, setRegs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewReg, setViewReg] = useState(null);
  const [departureTarget, setDepartureTarget] = useState(null);
  const [editReg, setEditReg] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterArrival, setFilterArrival] = useState("");
  const [filterDeparture, setFilterDeparture] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customFields, setCustomFields] = useState([]);
  const isSuper = user?.role === "superadmin";

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  }), []);

  const fetchRegs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/guests/arrived`, {
        headers: authHeaders(), params: { search, page, per_page: 20, status_filter: statusFilter }
      });
      let filtered = data.data || [];
      if (filterArrival) filtered = filtered.filter(r => r.arrival_date === filterArrival);
      if (filterDeparture) filtered = filtered.filter(r => r.departure_date === filterDeparture);
      setRegs(filtered);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  }, [authHeaders, search, page, filterArrival, filterDeparture, statusFilter]);

  useEffect(() => { fetchRegs(); }, [fetchRegs]);
  useEffect(() => {
    axios.get(`${API}/api/admin/custom-fields`, { headers: authHeaders() }).then(r => setCustomFields(r.data || [])).catch(() => {});
  }, [authHeaders]);

  const getHeadName = (r) => {
    const h = (r.attendees || []).find(a => a.id === r.group_head_id);
    return h?.name || r.primary_mobile;
  };

  const confirmDeparture = async () => {
    if (!departureTarget) return;
    const r = departureTarget;
    const now = new Date();
    const depDate = r.departure_date ? new Date(r.departure_date + "T" + (r.expected_departure_time || "23:59")) : null;

    if (depDate && now < depDate && !isSuper) {
      toast.error(`Departure date is ${r.departure_date}. Only Super Admin can force early departure.`);
      setDepartureTarget(null);
      return;
    }

    try {
      await axios.put(`${API}/api/admin/registrations/${r.id}`, { arrival_status: "departed" }, { headers: authHeaders() });
      toast.success("Departure confirmed");
      // Free rooms
      for (const roomCode of (r.room_assignments || [])) {
        try { await axios.put(`${API}/api/admin/rooms/${roomCode}/unassign`, { registration_id: r.id }, { headers: authHeaders() }); } catch {}
      }
      setDepartureTarget(null);
      fetchRegs();
    } catch { toast.error("Failed"); }
  };

  const undoArrival = async (regId) => {
    if (!window.confirm("Move this guest back to Expected Guest List?")) return;
    try {
      await axios.put(`${API}/api/admin/registrations/${regId}/undo-arrival`, {}, { headers: authHeaders() });
      toast.success("Moved back to Expected");
      fetchRegs();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const undoDeparture = async (regId) => {
    if (!window.confirm("Undo departure? Guest will be moved back to Arrived.")) return;
    try {
      await axios.put(`${API}/api/admin/registrations/${regId}/undo-departure`, {}, { headers: authHeaders() });
      toast.success("Departure undone");
      fetchRegs();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const deleteEntry = async (regId) => {
    if (!window.confirm("Permanently delete this entry? This action cannot be undone.")) return;
    try {
      await axios.delete(`${API}/api/admin/registrations/${regId}/permanent`, { headers: authHeaders() });
      toast.success("Entry deleted");
      setRegs(prev => prev.filter(r => r.id !== regId));
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const DAYS = ["2026-05-27","2026-05-28","2026-05-29","2026-05-30","2026-05-31","2026-06-01","2026-06-02","2026-06-03","2026-06-04"];

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="arrived-guest-list">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0B1C3D]">Arrived Guest List</h1>
          <p className="text-sm text-gray-500">{total} total records</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { const params = new URLSearchParams({ bucket: "arrived", token: localStorage.getItem("admin_token"), search, status_filter: statusFilter }); window.open(`${API}/api/admin/export-csv?${params}`, "_blank"); }}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200" data-testid="export-arrived-csv">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => { const params = new URLSearchParams({ bucket: "arrived", token: localStorage.getItem("admin_token"), search, status_filter: statusFilter }); window.open(`${API}/api/admin/export-pdf?${params}`, "_blank"); }}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200" data-testid="export-arrived-pdf">
            <Download size={14} /> PDF
          </button>
          <button onClick={() => setShowFilters(!showFilters)} data-testid="toggle-filters"
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200">
            <Filter size={14} /> Filters
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2" data-testid="arrived-status-filter">
        <button onClick={() => { setStatusFilter("all"); setPage(1); }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${statusFilter === "all" ? "bg-[#0B1C3D] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          data-testid="filter-all-arrived">All</button>
        <button onClick={() => { setStatusFilter("arrived"); setPage(1); }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${statusFilter === "arrived" ? "bg-green-600 text-white" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
          data-testid="filter-arrived-only">Arrived</button>
        <button onClick={() => { setStatusFilter("departed"); setPage(1); }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${statusFilter === "departed" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
          data-testid="filter-departed-only">Departed</button>
      </div>


      {showFilters && (
        <div className="flex flex-wrap gap-3 bg-gray-50 rounded-lg p-3" data-testid="arrived-filters">
          <div>
            <label className="text-xs font-medium text-gray-600">Arrival Date</label>
            <select className="block border rounded px-2 py-1 text-sm mt-1" value={filterArrival} onChange={(e) => setFilterArrival(e.target.value)}>
              <option value="">All</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Departure Date</label>
            <select className="block border rounded px-2 py-1 text-sm mt-1" value={filterDeparture} onChange={(e) => setFilterDeparture(e.target.value)}>
              <option value="">All</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button onClick={() => { setFilterArrival(""); setFilterDeparture(""); }} className="text-xs text-blue-600 self-end pb-1">Clear</button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <input data-testid="arrived-search" className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
          placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="space-y-2" data-testid="arrived-list">
        {loading ? <p className="text-center text-gray-500 py-4">Loading...</p> :
          regs.length === 0 ? <p className="text-center text-gray-400 py-8">No arrived guests</p> :
          regs.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-4 border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0B1C3D] truncate">{getHeadName(r)}</p>
                  <p className="text-xs text-gray-500">{r.num_people} people • {r.primary_mobile}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.arrival_status === "departed" ? "bg-gray-100 text-gray-600" :
                      r.arrival_status === "partially_arrived" ? "bg-amber-100 text-amber-700" :
                      "bg-green-100 text-green-700"
                    }`}>{r.arrival_status}</span>
                    {(r.room_assignments || []).length > 0 && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Room: {r.room_assignments.join(", ")}</span>
                    )}
                    {r.assigned_swamsevak && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Contact: {r.assigned_swamsevak}</span>
                    )}
                    {/* Custom Field Labels */}
                    {(customFields || []).filter(cf => cf.applies_to?.includes(r.id)).map(cf => {
                      const val = r.custom_field_values?.[cf.id];
                      const displayVal = val === true ? "Yes" : val === false ? "No" : (val || cf.default_value || "—");
                      return (
                        <span key={cf.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{cf.name}: {String(displayVal)}</span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap">
                  <button onClick={() => setViewReg(r)} data-testid={`view-arrived-${r.id}`}
                    className="bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-blue-100">
                    <Eye size={12} /> View
                  </button>
                  {/* Edit button visible for ALL roles */}
                  <button onClick={() => setEditReg(r)} data-testid={`edit-arrived-${r.id}`}
                    className="bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-indigo-100">
                    <Edit size={12} /> Edit
                  </button>
                  {r.arrival_status !== "departed" && (
                    <button onClick={() => setDepartureTarget(r)} data-testid={`depart-${r.id}`}
                      className="bg-orange-50 text-orange-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-orange-100">
                      <Plane size={12} /> Departure
                    </button>
                  )}
                  {isSuper && r.arrival_status !== "departed" && (
                    <button onClick={() => undoArrival(r.id)} data-testid={`undo-arrival-${r.id}`}
                      className="bg-red-50 text-red-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-red-100">
                      <Undo2 size={12} /> Undo
                    </button>
                  )}
                  {isSuper && r.arrival_status === "departed" && (
                    <button onClick={() => undoDeparture(r.id)} data-testid={`undo-departure-${r.id}`}
                      className="bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-amber-100">
                      <Undo2 size={12} /> Undo Depart
                    </button>
                  )}
                  {isSuper && (
                    <button onClick={() => deleteEntry(r.id)} data-testid={`delete-arrived-${r.id}`}
                      className="bg-red-50 text-red-700 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-red-100">
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Full View with QR */}
      <Dialog open={!!viewReg} onOpenChange={() => setViewReg(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Complete Details</DialogTitle></DialogHeader>
          {viewReg && (
            <>
              {viewReg.qr_image_b64 && (
                <div className="flex justify-center mb-4" data-testid="qr-display">
                  <img src={`data:image/png;base64,${viewReg.qr_image_b64}`} alt="QR Code" className="w-48 h-48 border rounded-xl" />
                </div>
              )}
              <FullRegistrationView reg={viewReg} showAttendeeStatus={true} />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Departure Confirmation */}
      <Dialog open={!!departureTarget} onOpenChange={() => setDepartureTarget(null)}>

      {/* Edit Dialog */}
      {editReg && <EditArrivedDialog reg={editReg} user={user} onClose={() => setEditReg(null)} onSaved={() => { setEditReg(null); fetchRegs(); }} authHeaders={authHeaders} customFields={customFields} />}


        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm Departure</DialogTitle></DialogHeader>
          {departureTarget && (
            <div className="space-y-4" data-testid="departure-confirm">
              <p className="text-sm text-gray-600">Are you sure you want to confirm departure for:</p>
              <p className="font-semibold text-[#0B1C3D]">{getHeadName(departureTarget)} ({departureTarget.num_people} people)</p>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Expected Departure:</span> {departureTarget.departure_date || "Not set"} {departureTarget.expected_departure_time || ""}
                </p>
              </div>
              {departureTarget.room_assignments?.length > 0 && (
                <p className="text-xs text-gray-500">Rooms {departureTarget.room_assignments.join(", ")} will be freed.</p>
              )}
              <div className="flex gap-2">
                <button onClick={confirmDeparture} data-testid="confirm-departure-btn"
                  className="flex-1 bg-orange-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-700">
                  Confirm Departure
                </button>
                <button onClick={() => setDepartureTarget(null)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
