import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Save, X, LayoutGrid, Clock } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

/**
 * Admin-only Help Centre category manager.
 * Category IDs should MATCH the `service_type` IDs in the WhatsApp Flow JSON so
 * Flow submissions auto-map to the right category (priority + SLA).
 */
export default function HelpCategoryManager() {
  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("admin_token")}` }), []);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [form, setForm] = useState({ id: "", label: "", group: "other", priority: "low", sla_minutes: 30 });

  const fetchCats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/tickets/categories`, { headers: authHeaders() });
      setCats(data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchCats(); }, [fetchCats]);

  const openCreate = () => {
    setEditCat(null);
    setForm({ id: "", label: "", group: "other", priority: "low", sla_minutes: 30 });
    setShowEditor(true);
  };

  const openEdit = (c) => {
    setEditCat(c);
    setForm({ id: c.id, label: c.label, group: c.group || "other", priority: c.priority, sla_minutes: c.sla_minutes });
    setShowEditor(true);
  };

  const saveCat = async () => {
    if (!form.label.trim()) { toast.error("Label is required"); return; }
    try {
      if (editCat) {
        await axios.put(`${API}/admin/tickets/categories/${editCat.id}`, {
          label: form.label.trim(), group: form.group.trim() || "other",
          priority: form.priority, sla_minutes: Number(form.sla_minutes) || 30,
        }, { headers: authHeaders() });
        toast.success("Category updated");
      } else {
        if (!form.id.trim()) { toast.error("ID is required"); return; }
        await axios.post(`${API}/admin/tickets/categories`, {
          id: form.id.trim().toLowerCase().replace(/\s+/g, "_"),
          label: form.label.trim(), group: form.group.trim() || "other",
          priority: form.priority, sla_minutes: Number(form.sla_minutes) || 30,
        }, { headers: authHeaders() });
        toast.success("Category created");
      }
      setShowEditor(false); fetchCats();
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
  };

  const toggleCat = async (c) => {
    try {
      await axios.put(`${API}/admin/tickets/categories/${c.id}`,
        { is_active: !c.is_active }, { headers: authHeaders() });
      fetchCats();
    } catch { /* silent */ }
  };

  const deleteCat = async (c) => {
    if (c.is_default) { toast.error("Default categories cannot be deleted — disable instead"); return; }
    if (!window.confirm(`Delete "${c.label}"?`)) return;
    try {
      await axios.delete(`${API}/admin/tickets/categories/${c.id}`, { headers: authHeaders() });
      toast.success("Deleted"); fetchCats();
    } catch (e) { toast.error(e.response?.data?.detail || "Delete failed"); }
  };

  // Group by `group` key
  const grouped = cats.reduce((acc, c) => {
    const g = c.group || "other";
    acc[g] = acc[g] || [];
    acc[g].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4" data-testid="help-category-manager">
      <div className="bg-gradient-to-r from-[#0B1C3D] to-[#1a3a6b] rounded-xl p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2"><LayoutGrid size={18} /> Help Centre Services</h2>
            <p className="text-white/70 text-xs mt-1">
              Configure services offered to guests. Each has its own priority & SLA.<br />
              <b className="text-white">IDs must match the <code>service_type</code> values in your WhatsApp Flow</b> so submissions auto-route to the correct category.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90" data-testid="add-category-btn">
            <Plus size={13} className="mr-1" /> New Service
          </Button>
        </div>
      </div>

      {loading ? <p className="text-gray-400 text-center py-8">Loading...</p> :
        Object.keys(grouped).length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-xl border">
            <LayoutGrid size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No service categories yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="bg-white rounded-xl border overflow-hidden" data-testid={`group-${group}`}>
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-600">{group.replace(/_/g, " ")}</p>
                </div>
                <div className="divide-y">
                  {items.map(c => (
                    <div key={c.id} className={`p-3 flex items-center gap-3 ${c.is_active === false ? "opacity-50" : ""}`} data-testid={`cat-row-${c.id}`}>
                      <button onClick={() => toggleCat(c)} className={c.is_active !== false ? "text-green-500" : "text-gray-300"} data-testid={`toggle-cat-${c.id}`}>
                        {c.is_active !== false ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-[#0B1C3D]">{c.label}</p>
                          <code className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c.id}</code>
                          {c.is_default && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">DEFAULT</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded ${PRIORITY_COLORS[c.priority] || PRIORITY_COLORS.low}`}>
                            {(c.priority || "low").toUpperCase()}
                          </span>
                          <span className="inline-flex items-center gap-1 text-gray-500">
                            <Clock size={11} /> {c.sla_minutes} min SLA
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(c)} className="text-blue-500 hover:text-blue-700 p-1" data-testid={`edit-cat-${c.id}`}><Edit2 size={14} /></button>
                        {!c.is_default && (
                          <button onClick={() => deleteCat(c)} className="text-red-400 hover:text-red-600 p-1" data-testid={`delete-cat-${c.id}`}><Trash2 size={14} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      }

      <Dialog open={showEditor} onOpenChange={(v) => { if (!v) setShowEditor(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0B1C3D]">{editCat ? "Edit Service" : "New Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>ID (must match Flow service_type) <span className="text-red-500">*</span></Label>
              <Input value={form.id}
                disabled={!!editCat}
                onChange={e => setForm(p => ({ ...p, id: e.target.value }))}
                placeholder="e.g. drinking_water" className="mt-1 font-mono text-sm"
                data-testid="cat-id-input" />
              {editCat && <p className="text-[10px] text-gray-400 mt-1">ID is immutable after creation</p>}
            </div>
            <div>
              <Label>Label <span className="text-red-500">*</span></Label>
              <Input value={form.label}
                onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                placeholder="e.g. Drinking Water" className="mt-1" data-testid="cat-label-input" />
            </div>
            <div>
              <Label>Group</Label>
              <Input value={form.group}
                onChange={e => setForm(p => ({ ...p, group: e.target.value }))}
                placeholder="e.g. stay_essentials, food_beverages, medical, housekeeping, other" className="mt-1" data-testid="cat-group-input" />
              <p className="text-[10px] text-gray-400 mt-1">Matches a top-level category in the Flow</p>
            </div>
            <div>
              <Label>Priority</Label>
              <div className="flex gap-2 mt-1">
                {["high", "medium", "low"].map(p => (
                  <button key={p} type="button"
                    onClick={() => setForm(f => ({ ...f, priority: p }))}
                    data-testid={`cat-priority-${p}`}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${form.priority === p ? PRIORITY_COLORS[p] + " border-current" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>SLA (minutes)</Label>
              <Input type="number" min="1" value={form.sla_minutes}
                onChange={e => setForm(p => ({ ...p, sla_minutes: e.target.value }))}
                className="mt-1" data-testid="cat-sla-input" />
              <p className="text-[10px] text-gray-400 mt-1">Ticket is marked overdue after this time without resolution</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => setShowEditor(false)} variant="outline" className="flex-1">
                <X size={13} className="mr-1" /> Cancel
              </Button>
              <Button onClick={saveCat} className="flex-1 bg-[#0B1C3D] text-white" data-testid="save-cat-btn">
                <Save size={13} className="mr-1" /> {editCat ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
