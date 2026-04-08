import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ReferencePersonManager({ user, authHeaders }) {
  const [persons, setPersons] = useState([]);
  const [cats, setCats] = useState([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [newCat, setNewCat] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        axios.get(`${API}/admin/reference-persons`, { headers: authHeaders() }),
        axios.get(`${API}/admin/relation-categories`, { headers: authHeaders() }),
      ]);
      setPersons(pRes.data);
      setCats(cRes.data);
    } catch (err) {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const addPerson = async () => {
    if (!newName.trim()) return;
    try {
      await axios.post(`${API}/admin/reference-persons`, { name: newName, description: newDesc }, { headers: authHeaders() });
      toast.success("Added");
      setNewName(""); setNewDesc("");
      fetchAll();
    } catch (err) {
      toast.error("Failed to add");
    }
  };

  const updatePerson = async (id) => {
    try {
      await axios.put(`${API}/admin/reference-persons/${id}`, { name: editName }, { headers: authHeaders() });
      toast.success("Updated");
      setEditId(null);
      fetchAll();
    } catch (err) {
      toast.error("Failed");
    }
  };

  const deletePerson = async (id) => {
    try {
      await axios.delete(`${API}/admin/reference-persons/${id}`, { headers: authHeaders() });
      toast.success("Deleted");
      fetchAll();
    } catch (err) {
      toast.error("Failed");
    }
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    try {
      await axios.post(`${API}/admin/relation-categories`, { name: newCat, description: "" }, { headers: authHeaders() });
      toast.success("Category added");
      setNewCat("");
      fetchAll();
    } catch (err) {
      toast.error("Failed");
    }
  };

  const deleteCategory = async (id) => {
    try {
      await axios.delete(`${API}/admin/relation-categories/${id}`, { headers: authHeaders() });
      toast.success("Category deleted");
      fetchAll();
    } catch (err) {
      toast.error("Failed");
    }
  };

  return (
    <div data-testid="reference-person-manager">
      <h2 className="text-2xl font-bold text-[#0B1C3D] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        Reference Persons & Relation Categories
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reference Persons */}
        <div className="bg-white rounded-xl border border-[#D4AF37]/15 p-5">
          <h3 className="text-base font-bold text-[#0B1C3D] mb-4">Reference Persons</h3>
          <div className="flex gap-2 mb-4">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="bg-white border-[#D4AF37]/20" data-testid="ref-person-name-input" />
            <Button onClick={addPerson} size="sm" className="bg-[#D4AF37] text-[#0B1C3D] shrink-0" data-testid="add-ref-person-btn">
              <Plus size={14} className="mr-1" /> Add
            </Button>
          </div>
          {loading ? <p className="text-[#0B1C3D]/40 text-sm">Loading...</p> : (
            <div className="space-y-2">
              {persons.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F8F1E5] border border-[#D4AF37]/10" data-testid={`ref-person-${p.id}`}>
                  {editId === p.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm bg-white" />
                      <Button size="sm" onClick={() => updatePerson(p.id)} className="h-7 bg-green-600 text-white"><Save size={12} /></Button>
                      <Button size="sm" variant="outline" onClick={() => setEditId(null)} className="h-7"><X size={12} /></Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-[#0B1C3D]">{p.name}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditId(p.id); setEditName(p.name); }} className="h-7 w-7 p-0" data-testid={`edit-ref-${p.id}`}>
                          <Edit2 size={12} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deletePerson(p.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700" data-testid={`delete-ref-${p.id}`}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {persons.length === 0 && <p className="text-[#0B1C3D]/40 text-sm text-center py-4">No reference persons added yet</p>}
            </div>
          )}
        </div>

        {/* Relation Categories */}
        <div className="bg-white rounded-xl border border-[#D4AF37]/15 p-5">
          <h3 className="text-base font-bold text-[#0B1C3D] mb-4">Relation Categories</h3>
          <div className="flex gap-2 mb-4">
            <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Category name" className="bg-white border-[#D4AF37]/20" data-testid="rel-cat-input" />
            <Button onClick={addCategory} size="sm" className="bg-[#D4AF37] text-[#0B1C3D] shrink-0" data-testid="add-rel-cat-btn">
              <Plus size={14} className="mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {cats.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F8F1E5] border border-[#D4AF37]/10" data-testid={`rel-cat-${c.id}`}>
                <span className="text-sm font-medium text-[#0B1C3D]">{c.name}</span>
                <Button size="sm" variant="ghost" onClick={() => deleteCategory(c.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700" data-testid={`delete-cat-${c.id}`}>
                  <Trash2 size={12} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
