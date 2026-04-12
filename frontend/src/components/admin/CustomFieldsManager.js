import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Users, Lock } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CustomFieldsManager({ user }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const isSuper = user?.role === "superadmin";

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("admin_token")}` }), []);

  const fetchFields = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/custom-fields`, { headers: authHeaders() });
      setFields(data);
    } catch { toast.error("Failed to load custom fields"); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  const deleteField = async (id) => {
    if (!window.confirm("Delete this custom field? Values already entered will be lost.")) return;
    try {
      await axios.delete(`${API}/admin/custom-fields/${id}`, { headers: authHeaders() });
      toast.success("Field deleted");
      fetchFields();
    } catch { toast.error("Failed to delete"); }
  };

  const TYPE_LABELS = { text: "Text", number: "Number", toggle: "Yes/No", select: "Dropdown", date: "Date" };
  const SCOPE_LABELS = { expected: "Expected Guests", arrived: "Arrived Guests", all: "All Guests" };
  const SCOPE_COLORS = {
    expected: "bg-blue-50 text-blue-700 border-blue-200",
    arrived: "bg-green-50 text-green-700 border-green-200",
    all: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div data-testid="custom-fields-view">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Custom Fields</h2>
          <p className="text-[#0B1C3D]/50 text-sm mt-1">Admin-only fields attached to specific guest records</p>
        </div>
        {isSuper && (
          <Button onClick={() => setShowCreate(true)} className="bg-[#D4AF37] text-[#0B1C3D]" data-testid="create-field-btn">
            <Plus size={14} className="mr-1" /> New Field
          </Button>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-start gap-2">
        <Lock size={14} className="text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-blue-800">Admin-Only Fields</p>
          <p className="text-xs text-blue-700 mt-0.5">Custom fields are visible only to admins. They appear in the edit panels of Expected and Arrived guest records. Volunteers can edit custom field values; super admin can do everything.</p>
        </div>
      </div>

      {loading ? <p className="text-center py-10 text-[#0B1C3D]/40">Loading...</p> :
        fields.length === 0 ? (
          <div className="text-center py-20 text-[#0B1C3D]/40 bg-white rounded-xl border border-[#D4AF37]/10">
            <Lock size={32} className="mx-auto mb-2 text-gray-300" />
            <p>No custom fields created yet.</p>
            {isSuper && <p className="text-xs mt-1">Click <strong>New Field</strong> to create one.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fields.map(f => (
              <div key={f.id} className="bg-white rounded-xl border border-[#D4AF37]/10 p-4" data-testid={`field-${f.id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#0B1C3D] truncate">{f.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] bg-[#0B1C3D]/5 px-2 py-0.5 rounded-full text-[#0B1C3D]/50">{TYPE_LABELS[f.field_type] || f.field_type}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${SCOPE_COLORS[f.target_scope] || SCOPE_COLORS.all}`}>
                        {SCOPE_LABELS[f.target_scope] || "All Guests"}
                      </span>
                    </div>
                  </div>
                  {isSuper && (
                    <button onClick={() => deleteField(f.id)} className="text-red-400 hover:text-red-600 ml-2 shrink-0" data-testid={`delete-field-${f.id}`}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="text-xs text-[#0B1C3D]/40 space-y-0.5 mt-2">
                  {f.default_value && <p>Default: {f.default_value}</p>}
                  {f.options?.length > 0 && <p>Options: {f.options.join(", ")}</p>}
                  {f.applies_to?.length > 0 && (
                    <p className="flex items-center gap-1 text-indigo-600">
                      <Users size={10} /> Applies to {f.applies_to.length} specific guest{f.applies_to.length !== 1 ? "s" : ""}
                    </p>
                  )}
                  {(!f.applies_to || f.applies_to.length === 0) && (
                    <p className="text-gray-400">Applies to all guests in scope</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }

      {isSuper && (
        <CreateFieldDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          authHeaders={authHeaders}
          onCreated={() => { setShowCreate(false); fetchFields(); }}
        />
      )}
    </div>
  );
}

function CreateFieldDialog({ open, onClose, authHeaders, onCreated }) {
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [defaultValue, setDefaultValue] = useState("");
  const [options, setOptions] = useState("");
  const [targetScope, setTargetScope] = useState("all");
  const [guests, setGuests] = useState([]);
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch guests based on selected target_scope
  useEffect(() => {
    if (!open) return;
    setLoadingGuests(true);
    setSelectedGuests([]);
    const headers = { Authorization: `Bearer ${localStorage.getItem("admin_token")}` };
    const fetchBoth = async () => {
      try {
        const proms = [];
        if (targetScope === "expected" || targetScope === "all") {
          proms.push(axios.get(`${API}/admin/guests/expected`, { headers, params: { per_page: 500 } }));
        }
        if (targetScope === "arrived" || targetScope === "all") {
          proms.push(axios.get(`${API}/admin/guests/arrived`, { headers, params: { per_page: 500 } }));
        }
        const results = await Promise.all(proms);
        const all = [];
        results.forEach(r => {
          (r.data.data || []).forEach(reg => {
            const head = (reg.attendees || []).find(a => a.id === reg.group_head_id);
            all.push({ id: reg.id, name: head?.name || reg.primary_mobile, scope: reg.arrival_status === "arrived" ? "arrived" : "expected" });
          });
        });
        setGuests(all);
      } catch {}
      setLoadingGuests(false);
    };
    fetchBoth();
  }, [open, targetScope]);

  const toggleGuest = (id) => {
    setSelectedGuests(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Field name is required"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/custom-fields`, {
        name: name.trim(),
        field_type: fieldType,
        default_value: defaultValue,
        options: options ? options.split(",").map(o => o.trim()).filter(Boolean) : [],
        target_scope: targetScope,
        applies_to: selectedGuests,
      }, { headers: authHeaders() });
      toast.success("Custom field created");
      setName(""); setFieldType("text"); setDefaultValue(""); setOptions(""); setTargetScope("all"); setSelectedGuests([]);
      onCreated();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to create"); }
    finally { setSaving(false); }
  };

  const handleClose = () => {
    setName(""); setFieldType("text"); setDefaultValue(""); setOptions(""); setTargetScope("all"); setSelectedGuests([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="create-field-dialog">
        <DialogHeader><DialogTitle>New Custom Field</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Field Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="e.g. Gift Distributed, VIP Status" data-testid="field-name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Field Type</Label>
              <Select value={fieldType} onValueChange={setFieldType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="toggle">Yes/No Toggle</SelectItem>
                  <SelectItem value="select">Dropdown</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Default Value</Label>
              <Input value={defaultValue} onChange={e => setDefaultValue(e.target.value)} className="mt-1" placeholder={fieldType === "toggle" ? "false" : "Optional"} />
            </div>
          </div>

          {fieldType === "select" && (
            <div>
              <Label className="text-xs">Dropdown Options (comma-separated)</Label>
              <Input value={options} onChange={e => setOptions(e.target.value)} className="mt-1" placeholder="Option A, Option B, Option C" />
            </div>
          )}

          <div>
            <Label className="text-xs">Target Scope</Label>
            <Select value={targetScope} onValueChange={setTargetScope}>
              <SelectTrigger className="mt-1" data-testid="target-scope-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expected">Expected Guest List</SelectItem>
                <SelectItem value="arrived">Arrived Guest List</SelectItem>
                <SelectItem value="all">All (Expected + Arrived)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400 mt-1">Fields are admin-only by default and will appear in guest edit panels.</p>
          </div>

          {/* Guest selector */}
          <div>
            <Label className="text-xs">Apply to Specific Guests (optional)</Label>
            <p className="text-xs text-gray-400 mb-2">Leave empty to apply to all guests in the selected scope. Or select specific guests below.</p>
            {loadingGuests ? (
              <p className="text-xs text-gray-400">Loading guests...</p>
            ) : guests.length === 0 ? (
              <p className="text-xs text-gray-400">No guests in selected scope.</p>
            ) : (
              <div className="border rounded-lg max-h-36 overflow-y-auto p-2 space-y-1" data-testid="guest-selector">
                <div className="flex gap-2 mb-1">
                  <button onClick={() => setSelectedGuests(guests.map(g => g.id))} className="text-xs text-blue-600 hover:underline">Select All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setSelectedGuests([])} className="text-xs text-gray-500 hover:underline">Clear</button>
                  <span className="text-xs text-gray-400 ml-auto">{selectedGuests.length} selected</span>
                </div>
                {guests.map(g => (
                  <label key={g.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                    <input type="checkbox" checked={selectedGuests.includes(g.id)} onChange={() => toggleGuest(g.id)} className="rounded" data-testid={`guest-check-${g.id}`} />
                    <span className="text-xs text-[#0B1C3D]">{g.name}</span>
                    <span className={`text-[10px] px-1 rounded ${g.scope === "arrived" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{g.scope}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D]" data-testid="save-field-btn">
            {saving ? "Creating..." : "Create Custom Field"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
