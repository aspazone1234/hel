import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Save, X, Users, Tag, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Reference Person manager.
 *
 * Each reference person OWNS their own set of relation categories. A person
 * can have zero relation categories (in which case registrants don't pick a
 * relation for them). Super admin adds/removes categories per person inline.
 */
export default function ReferencePersonManager({ user }) {
  const isSuper = user?.role === "superadmin";
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategoriesText, setNewCategoriesText] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNameHi, setEditNameHi] = useState("");
  const [editDescHi, setEditDescHi] = useState("");
  const [addCatText, setAddCatText] = useState({}); // { [personId]: "text" }

  // Global relation category management
  const [globalCats, setGlobalCats] = useState([]);
  const [showCatSection, setShowCatSection] = useState(false);
  const [editCatId, setEditCatId] = useState(null);
  const [editCatDesc, setEditCatDesc] = useState("");
  const [editCatNameHi, setEditCatNameHi] = useState("");
  const [editCatDescHi, setEditCatDescHi] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatNameHi, setNewCatNameHi] = useState("");
  const [newCatDescHi, setNewCatDescHi] = useState("");

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("admin_token")}` }), []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/reference-persons`, { headers: authHeaders() });
      setPersons(data || []);
    } catch {
      toast.error("Failed to load reference persons");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch global relation categories
  const fetchGlobalCats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/relation-categories`, { headers: authHeaders() });
      setGlobalCats(data || []);
    } catch { /* ignore */ }
  }, [authHeaders]);

  useEffect(() => { fetchGlobalCats(); }, [fetchGlobalCats]);

  const addGlobalCat = async () => {
    if (!newCatName.trim()) return;
    try {
      await axios.post(`${API}/admin/relation-categories`,
        { name: newCatName.trim(), name_hi: newCatNameHi.trim(), description: newCatDesc.trim(), description_hi: newCatDescHi.trim() },
        { headers: authHeaders() });
      toast.success("Relation category added");
      setNewCatName(""); setNewCatDesc(""); setNewCatNameHi(""); setNewCatDescHi("");
      fetchGlobalCats();
    } catch (e) {
      if (e.response?.status !== 403) toast.error("Failed to add category");
    }
  };

  const saveGlobalCatDesc = async (cat) => {
    try {
      await axios.put(`${API}/admin/relation-categories/${cat.id}`,
        { name: cat.name, name_hi: editCatNameHi, description: editCatDesc, description_hi: editCatDescHi },
        { headers: authHeaders() });
      toast.success("Updated");
      setEditCatId(null);
      fetchGlobalCats();
    } catch (e) {
      if (e.response?.status !== 403) toast.error("Failed to update");
    }
  };

  const deleteGlobalCat = async (cat) => {
    if (!window.confirm(`Delete "${cat.name}" from the global list? This won't remove it from reference persons that already use it.`)) return;
    try {
      await axios.delete(`${API}/admin/relation-categories/${cat.id}`, { headers: authHeaders() });
      toast.success("Deleted");
      fetchGlobalCats();
    } catch (e) {
      if (e.response?.status !== 403) toast.error("Failed to delete");
    }
  };

  const addPerson = async () => {
    if (!newName.trim()) return;
    const cats = newCategoriesText.split(",").map(c => c.trim()).filter(Boolean);
    try {
      await axios.post(`${API}/admin/reference-persons`,
        { name: newName.trim(), description: newDescription.trim(), relation_categories: cats },
        { headers: authHeaders() });
      toast.success("Reference person added");
      setNewName(""); setNewDescription(""); setNewCategoriesText("");
      fetchAll();
    } catch (e) {
      if (e.response?.status !== 403) toast.error("Failed to add");
    }
  };

  const saveRename = async (id) => {
    if (!editName.trim()) return;
    try {
      await axios.put(`${API}/admin/reference-persons/${id}`,
        { name: editName.trim(), description: editDescription, name_hi: editNameHi, description_hi: editDescHi },
        { headers: authHeaders() });
      toast.success("Updated");
      setEditId(null);
      fetchAll();
    } catch (e) {
      if (e.response?.status !== 403) toast.error("Failed");
    }
  };

  const saveRank = async (person, newRank) => {
    const rank = parseInt(newRank, 10);
    if (Number.isNaN(rank)) { toast.error("Rank must be a number"); return; }
    if (rank === (person.rank ?? 100)) return;
    try {
      await axios.put(`${API}/admin/reference-persons/${person.id}`,
        { rank },
        { headers: authHeaders() });
      toast.success(`Rank updated to ${rank}`);
      fetchAll();
    } catch (e) {
      if (e.response?.status !== 403) toast.error("Failed to update rank");
    }
  };

  const deletePerson = async (id) => {
    if (!window.confirm("Delete this reference person? Existing registrations that reference them will keep the link but it may no longer resolve.")) return;
    try {
      await axios.delete(`${API}/admin/reference-persons/${id}`, { headers: authHeaders() });
      toast.success("Deleted");
      fetchAll();
    } catch (e) {
      if (e.response?.status !== 403) toast.error("Failed");
    }
  };

  const addCategoryToPerson = async (person) => {
    const raw = (addCatText[person.id] || "").trim();
    if (!raw) return;
    const existing = person.relation_categories || [];
    const toAdd = raw.split(",").map(c => c.trim()).filter(Boolean)
      .filter(c => !existing.some(x => x.toLowerCase() === c.toLowerCase()));
    if (toAdd.length === 0) {
      setAddCatText({ ...addCatText, [person.id]: "" });
      return;
    }
    try {
      await axios.put(`${API}/admin/reference-persons/${person.id}`,
        { relation_categories: [...existing, ...toAdd] },
        { headers: authHeaders() });
      toast.success("Category added");
      setAddCatText({ ...addCatText, [person.id]: "" });
      fetchAll();
    } catch (e) {
      if (e.response?.status !== 403) toast.error("Failed");
    }
  };

  const removeCategoryFromPerson = async (person, cat) => {
    const next = (person.relation_categories || []).filter(c => c !== cat);
    try {
      await axios.put(`${API}/admin/reference-persons/${person.id}`,
        { relation_categories: next },
        { headers: authHeaders() });
      fetchAll();
    } catch (e) {
      if (e.response?.status !== 403) toast.error("Failed");
    }
  };

  return (
    <div className="p-4 md:p-6" data-testid="reference-person-manager">
      <div className="flex items-center gap-2 mb-6">
        <Users className="text-[#B8860B]" size={22} />
        <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Reference Persons
        </h2>
      </div>

      {!isSuper && (
        <p className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" data-testid="ref-watcher-banner">
          View-only — you can browse reference persons and their relation categories. Any change will be blocked by the super admin.
        </p>
      )}

      {/* Add new reference person */}
      <div className="bg-white rounded-xl border border-[#D4AF37]/15 p-5 mb-5">
        <h3 className="text-sm font-bold text-[#0B1C3D] mb-3">Add Reference Person</h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Reference person name"
            className="md:col-span-4 bg-white border-[#D4AF37]/20"
            data-testid="ref-person-name-input" />
          <Input value={newDescription} onChange={e => setNewDescription(e.target.value)}
            placeholder="Subtitle (e.g. spouse name) — optional"
            className="md:col-span-3 bg-white border-[#D4AF37]/20"
            data-testid="ref-person-description-input" />
          <Input value={newCategoriesText} onChange={e => setNewCategoriesText(e.target.value)}
            placeholder="Relation categories (comma-separated, optional)"
            className="md:col-span-3 bg-white border-[#D4AF37]/20"
            data-testid="ref-person-cats-input" />
          <Button onClick={addPerson}
            className="md:col-span-2 bg-[#D4AF37] text-[#0B1C3D] font-semibold"
            data-testid="add-ref-person-btn">
            <Plus size={14} className="mr-1" /> Add
          </Button>
        </div>
        <p className="text-[11px] text-gray-500 mt-2">
          Leave the categories blank if this reference person doesn't need a relation dropdown on the registration form.
          &nbsp;•&nbsp;<b>Subtitle</b>: shown as a smaller second line under the name on the customer dropdown (e.g. spouse name).
          &nbsp;•&nbsp;<b>Rank</b>: lower numbers appear higher in the registration form dropdown (e.g. <code>1</code> is top-most).
        </p>
      </div>

      {/* List */}
      {loading ? <p className="text-[#0B1C3D]/40 text-sm">Loading...</p> :
        persons.length === 0 ? <p className="text-[#0B1C3D]/40 text-sm text-center py-10">No reference persons added yet</p> :
        <div className="space-y-3">
          {persons.map(p => (
            <div key={p.id}
              className="bg-white rounded-xl border border-[#D4AF37]/15 p-4"
              data-testid={`ref-person-${p.id}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                {editId === p.id ? (
                  <div className="flex flex-col gap-2 flex-1">
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm bg-white" data-testid={`edit-name-input-${p.id}`} placeholder="Name (English)" />
                    <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} className="h-8 text-sm bg-white" data-testid={`edit-description-input-${p.id}`} placeholder="Subtitle (English, optional)" />
                    <Input value={editNameHi} onChange={e => setEditNameHi(e.target.value)} className="h-8 text-sm bg-white border-orange-200" data-testid={`edit-name-hi-input-${p.id}`} placeholder="हिंदी नाम (Hindi name, optional)" />
                    <Input value={editDescHi} onChange={e => setEditDescHi(e.target.value)} className="h-8 text-sm bg-white border-orange-200" data-testid={`edit-desc-hi-input-${p.id}`} placeholder="हिंदी उपशीर्षक (Hindi subtitle, optional)" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveRename(p.id)} className="h-8 bg-green-600 text-white" data-testid={`save-name-${p.id}`}><Save size={12} className="mr-1" /> Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditId(null)} className="h-8"><X size={12} className="mr-1" /> Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="font-semibold text-[#0B1C3D]" data-testid={`ref-person-name-${p.id}`}>{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-[#0B1C3D]/55 mt-0.5" data-testid={`ref-person-description-${p.id}`}>{p.description}</p>
                    )}
                    {(p.name_hi || p.description_hi) && (
                      <p className="text-[11px] text-orange-600/70 mt-0.5">
                        {p.name_hi && <span>HI: {p.name_hi}</span>}
                        {p.name_hi && p.description_hi && <span> · </span>}
                        {p.description_hi && <span>{p.description_hi}</span>}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {(p.relation_categories || []).length === 0
                        ? "No relation categories — registrants won't pick a relation for this person"
                        : `${p.relation_categories.length} relation categor${p.relation_categories.length === 1 ? "y" : "ies"}`}
                    </p>
                  </div>
                )}
                {editId !== p.id && (
                  <div className="flex gap-1 shrink-0 items-center">
                    <div className="flex items-center gap-1" title="Lower rank appears higher in the registration form dropdown">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Rank</span>
                      <Input
                        type="number"
                        defaultValue={p.rank ?? 100}
                        onBlur={e => saveRank(p, e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }}
                        disabled={!isSuper}
                        className="h-7 w-16 text-xs text-center bg-white border-[#D4AF37]/30"
                        data-testid={`rank-input-${p.id}`}
                      />
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setEditId(p.id); setEditName(p.name); setEditDescription(p.description || ""); setEditNameHi(p.name_hi || ""); setEditDescHi(p.description_hi || ""); }} className="h-7 w-7 p-0" data-testid={`edit-ref-${p.id}`}>
                      <Edit2 size={12} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deletePerson(p.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700" data-testid={`delete-ref-${p.id}`}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                )}
              </div>

              {/* Relation categories chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(p.relation_categories || []).map((c, i) => (
                  <span key={i} data-testid={`ref-${p.id}-cat-${i}`}
                    className="inline-flex items-center gap-1 text-[11px] bg-[#F8F1E5] border border-[#D4AF37]/30 text-[#0B1C3D] px-2 py-0.5 rounded-full">
                    {c}
                    <button
                      onClick={() => removeCategoryFromPerson(p, c)}
                      className="text-red-500 hover:text-red-700"
                      data-testid={`remove-cat-${p.id}-${i}`}
                      title="Remove">
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {(p.relation_categories || []).length === 0 && (
                  <span className="text-[11px] text-gray-300 italic">No categories</span>
                )}
              </div>

              {/* Add category input */}
              <div className="flex gap-2">
                <Input
                  value={addCatText[p.id] || ""}
                  onChange={e => setAddCatText({ ...addCatText, [p.id]: e.target.value })}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCategoryToPerson(p); } }}
                  placeholder="Add a relation category (or comma-separated list)"
                  className="h-8 text-sm bg-white border-[#D4AF37]/20 flex-1"
                  data-testid={`add-cat-input-${p.id}`}
                />
                <Button
                  size="sm"
                  onClick={() => addCategoryToPerson(p)}
                  className="h-8 bg-[#0B1C3D] text-white"
                  data-testid={`add-cat-btn-${p.id}`}
                >
                  <Plus size={12} className="mr-1" /> Add
                </Button>
              </div>
            </div>
          ))}
        </div>
      }

      {/* ─── Global Relation Category Descriptions ─── */}
      <div className="mt-8 border-t border-[#D4AF37]/15 pt-6">
        <button
          onClick={() => setShowCatSection(s => !s)}
          className="flex items-center gap-2 mb-4 text-left w-full"
          data-testid="toggle-relation-cat-section"
        >
          <Tag className="text-[#B8860B]" size={18} />
          <h3 className="text-lg font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Relation Category Translations
          </h3>
          {showCatSection ? <ChevronUp size={16} className="ml-auto text-gray-400" /> : <ChevronDown size={16} className="ml-auto text-gray-400" />}
        </button>

        {showCatSection && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 mb-3">
              Manage relation categories with optional subtitles and Hindi translations. When the user switches to Hindi on the registration form, the Hindi name and subtitle will be shown instead.
            </p>

            {/* Add new global category */}
            {isSuper && (
              <div className="bg-white rounded-xl border border-[#D4AF37]/15 p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <Input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                    placeholder="Category name (English)"
                    className="bg-white border-[#D4AF37]/20"
                    data-testid="global-cat-name-input" />
                  <Input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)}
                    placeholder="Subtitle (English, optional)"
                    className="bg-white border-[#D4AF37]/20"
                    data-testid="global-cat-desc-input" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <Input value={newCatNameHi} onChange={e => setNewCatNameHi(e.target.value)}
                    placeholder="हिंदी नाम (Hindi name, optional)"
                    className="bg-white border-orange-200"
                    data-testid="global-cat-name-hi-input" />
                  <Input value={newCatDescHi} onChange={e => setNewCatDescHi(e.target.value)}
                    placeholder="हिंदी उपशीर्षक (Hindi subtitle, optional)"
                    className="bg-white border-orange-200"
                    data-testid="global-cat-desc-hi-input" />
                </div>
                <Button onClick={addGlobalCat}
                  className="bg-[#D4AF37] text-[#0B1C3D] font-semibold"
                  data-testid="add-global-cat-btn">
                  <Plus size={14} className="mr-1" /> Add Category
                </Button>
              </div>
            )}

            {/* List of global categories */}
            {globalCats.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">No global relation categories defined yet</p>
            ) : (
              <div className="space-y-2">
                {globalCats.map(cat => (
                  <div key={cat.id} className="bg-white rounded-lg border border-[#D4AF37]/10 px-4 py-3" data-testid={`global-cat-${cat.id}`}>
                    {editCatId === cat.id ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[#0B1C3D] mb-1">{cat.name}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <Input
                            value={editCatDesc}
                            onChange={e => setEditCatDesc(e.target.value)}
                            placeholder="Subtitle (English)"
                            className="h-8 text-sm bg-white border-[#D4AF37]/20"
                            data-testid={`edit-cat-desc-input-${cat.id}`}
                            autoFocus
                          />
                          <Input
                            value={editCatNameHi}
                            onChange={e => setEditCatNameHi(e.target.value)}
                            placeholder="हिंदी नाम (Hindi name)"
                            className="h-8 text-sm bg-white border-orange-200"
                            data-testid={`edit-cat-name-hi-input-${cat.id}`}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <Input
                            value={editCatDescHi}
                            onChange={e => setEditCatDescHi(e.target.value)}
                            placeholder="हिंदी उपशीर्षक (Hindi subtitle)"
                            className="h-8 text-sm bg-white border-orange-200"
                            data-testid={`edit-cat-desc-hi-input-${cat.id}`}
                          />
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" onClick={() => saveGlobalCatDesc(cat)} className="h-8 bg-green-600 text-white" data-testid={`save-cat-desc-${cat.id}`}>
                              <Save size={12} className="mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditCatId(null)} className="h-8">
                              <X size={12} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#0B1C3D]">{cat.name}</p>
                          {cat.description ? (
                            <p className="text-[11px] text-[#0B1C3D]/55 mt-0.5">{cat.description}</p>
                          ) : (
                            <p className="text-[11px] text-gray-300 italic mt-0.5">No subtitle</p>
                          )}
                          {(cat.name_hi || cat.description_hi) && (
                            <p className="text-[11px] text-orange-600/70 mt-0.5">
                              {cat.name_hi && <span>HI: {cat.name_hi}</span>}
                              {cat.name_hi && cat.description_hi && <span> · </span>}
                              {cat.description_hi && <span>{cat.description_hi}</span>}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => { setEditCatId(cat.id); setEditCatDesc(cat.description || ""); setEditCatNameHi(cat.name_hi || ""); setEditCatDescHi(cat.description_hi || ""); }}
                            data-testid={`edit-cat-${cat.id}`}>
                            <Edit2 size={12} />
                          </Button>
                          {isSuper && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              onClick={() => deleteGlobalCat(cat)}
                              data-testid={`delete-cat-${cat.id}`}>
                              <Trash2 size={12} />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
