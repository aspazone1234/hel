import { useState, useEffect } from "react";
import { Plus, Trash2, Settings, Eye, EyeOff } from "lucide-react";
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
  const [previewField, setPreviewField] = useState(null);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("admin_token")}` });

  const fetchFields = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/custom-fields`, { headers: authHeaders() });
      setFields(data);
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFields(); }, []);

  const deleteField = async (id) => {
    try {
      await axios.delete(`${API}/admin/custom-fields/${id}`, { headers: authHeaders() });
      toast.success("Deleted");
      fetchFields();
    } catch { toast.error("Failed"); }
  };

  const TYPE_LABELS = { text: "Text", number: "Number", toggle: "Yes/No Toggle", select: "Dropdown", date: "Date" };

  return (
    <div data-testid="custom-fields-view">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Custom Fields</h2>
          <p className="text-[#0B1C3D]/50 text-sm mt-1">Create flexible operational fields for guest records</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#D4AF37] text-[#0B1C3D]" data-testid="create-field-btn">
          <Plus size={14} className="mr-1" /> New Field
        </Button>
      </div>

      {loading ? <p className="text-center py-10 text-[#0B1C3D]/40">Loading...</p> :
        fields.length === 0 ? <div className="text-center py-20 text-[#0B1C3D]/40 bg-white rounded-xl border border-[#D4AF37]/10">No custom fields created yet</div> :
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fields.map(f => (
            <div key={f.id} className="bg-white rounded-xl border border-[#D4AF37]/10 p-4" data-testid={`field-${f.id}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm text-[#0B1C3D]">{f.name}</p>
                  <span className="text-[10px] bg-[#0B1C3D]/5 px-2 py-0.5 rounded-full text-[#0B1C3D]/50">{TYPE_LABELS[f.field_type] || f.field_type}</span>
                </div>
                <div className="flex gap-1">
                  <span className="text-[10px] flex items-center gap-0.5">{f.visibility === "admin_only" ? <EyeOff size={10} /> : <Eye size={10} />}{f.visibility}</span>
                  <Button size="sm" variant="ghost" onClick={() => setPreviewField(f)} className="h-6 w-6 p-0 text-blue-400" title="Preview"><Eye size={12} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteField(f.id)} className="h-6 w-6 p-0 text-red-400"><Trash2 size={12} /></Button>
                </div>
              </div>
              <div className="text-xs text-[#0B1C3D]/40 space-y-0.5">
                <p>Default: {f.default_value || "None"}</p>
                <p>Scope: {f.scope}</p>
                {f.options?.length > 0 && <p>Options: {f.options.join(", ")}</p>}
              </div>
            </div>
          ))}
        </div>
      }

      <CreateFieldDialog open={showCreate} onClose={() => setShowCreate(false)} authHeaders={authHeaders} onCreated={() => { setShowCreate(false); fetchFields(); }} />

      {/* Preview Dialog */}
      <Dialog open={!!previewField} onOpenChange={() => setPreviewField(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Field Preview: {previewField?.name}</DialogTitle></DialogHeader>
          {previewField && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">{TYPE_LABELS[previewField.field_type]} · {previewField.scope} · {previewField.visibility}</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{previewField.name}</label>
                {previewField.field_type === "text" && <input type="text" placeholder={previewField.default_value || "Enter value..."} className="w-full border rounded px-3 py-2 text-sm" />}
                {previewField.field_type === "number" && <input type="number" placeholder={previewField.default_value || "0"} className="w-full border rounded px-3 py-2 text-sm" />}
                {previewField.field_type === "date" && <input type="date" defaultValue={previewField.default_value} className="w-full border rounded px-3 py-2 text-sm" />}
                {previewField.field_type === "toggle" && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked={previewField.default_value === "true"} className="w-4 h-4" />
                    <span className="text-sm text-gray-600">{previewField.default_value === "true" ? "Yes" : "No"}</span>
                  </label>
                )}
                {previewField.field_type === "select" && (
                  <select className="w-full border rounded px-3 py-2 text-sm bg-white">
                    {(previewField.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
              </div>
              <p className="text-xs text-gray-400 italic">This is how the field will appear in guest records</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateFieldDialog({ open, onClose, authHeaders, onCreated }) {
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [defaultValue, setDefaultValue] = useState("");
  const [options, setOptions] = useState("");
  const [scope, setScope] = useState("registration");
  const [visibility, setVisibility] = useState("admin_only");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/custom-fields`, {
        name, field_type: fieldType, default_value: defaultValue,
        options: options ? options.split(",").map(o => o.trim()) : [],
        scope, visibility,
      }, { headers: authHeaders() });
      toast.success("Field created");
      setName(""); setFieldType("text"); setDefaultValue(""); setOptions(""); setScope("registration"); setVisibility("admin_only");
      onCreated();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="create-field-dialog">
        <DialogHeader><DialogTitle>New Custom Field</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Field Name *</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="e.g. Elite Gift Distributed" data-testid="field-name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
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
            <div><Label className="text-xs">Default Value</Label><Input value={defaultValue} onChange={e => setDefaultValue(e.target.value)} className="mt-1" placeholder={fieldType === "toggle" ? "No" : ""} /></div>
          </div>
          {fieldType === "select" && (
            <div><Label className="text-xs">Options (comma-separated)</Label><Input value={options} onChange={e => setOptions(e.target.value)} className="mt-1" placeholder="Option 1, Option 2, Option 3" /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Scope</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="registration">Registration</SelectItem>
                  <SelectItem value="room">Room</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_only">Admin Only</SelectItem>
                  <SelectItem value="visible_to_guest">Visible to Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D]" data-testid="save-field-btn">{saving ? "Creating..." : "Create Field"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
