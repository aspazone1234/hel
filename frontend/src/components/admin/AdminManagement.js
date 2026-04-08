import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminManagement({ user, authHeaders }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/admins`, { headers: authHeaders() });
      setAdmins(data);
    } catch { toast.error("Failed to load admins"); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleDelete = async (username) => {
    try {
      await axios.delete(`${API}/admin/admins/${username}`, { headers: authHeaders() });
      toast.success(`Admin '${username}' deleted`);
      setConfirmDelete(null);
      fetchAdmins();
    } catch (err) { const d = err.response?.data?.detail; toast.error(typeof d === "string" ? d : "Delete failed"); }
  };

  return (
    <div className="space-y-6" data-testid="admin-management-view">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Swamsevak Management</h2>
          <p className="text-sm text-[#0B1C3D]/50">Manage portal Swamsevaks (volunteers)</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="bg-[#D4AF37] text-[#0B1C3D] h-8 text-xs" data-testid="create-admin-btn">
          <Plus size={14} className="mr-1" /> Create Swamsevak
        </Button>
      </div>

      {/* System Admins */}
      <div className="bg-white rounded-2xl border border-[#D4AF37]/20 overflow-hidden">
        <div className="bg-[#0B1C3D] text-[#F8F1E5] px-4 py-3 font-semibold text-sm flex items-center gap-2">
          <Shield size={16} /> System Admins (Read-only)
        </div>
        <div className="divide-y divide-[#D4AF37]/10">
          {admins.filter(a => a.source === "system").map(a => (
            <div key={a.username} className="px-4 py-3 flex items-center justify-between" data-testid={`admin-${a.username}`}>
              <div>
                <p className="font-medium text-[#0B1C3D] text-sm">{a.name}</p>
                <p className="text-[#0B1C3D]/40 text-xs">{a.username} &middot; {a.city}</p>
              </div>
              <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold uppercase">System</span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Admins */}
      <div className="bg-white rounded-2xl border border-[#D4AF37]/20 overflow-hidden">
        <div className="bg-[#0B1C3D] text-[#F8F1E5] px-4 py-3 font-semibold text-sm">
          Custom Admins ({admins.filter(a => a.source === "custom").length})
        </div>
        {loading ? (
          <div className="py-8 text-center text-[#0B1C3D]/40">Loading...</div>
        ) : admins.filter(a => a.source === "custom").length === 0 ? (
          <div className="py-8 text-center text-[#0B1C3D]/40 text-sm">No custom admins created yet</div>
        ) : (
          <div className="divide-y divide-[#D4AF37]/10">
            {admins.filter(a => a.source === "custom").map(a => (
              <div key={a.username} className="px-4 py-3 flex items-center justify-between" data-testid={`admin-${a.username}`}>
                <div>
                  <p className="font-medium text-[#0B1C3D] text-sm">{a.name}</p>
                  <p className="text-[#0B1C3D]/40 text-xs">{a.username} &middot; {a.city || "No city"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditAdmin(a)} className="h-7 text-xs" data-testid={`edit-admin-${a.username}`}>
                    <Edit2 size={12} className="mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(a)} className="h-7 text-xs text-red-600 border-red-300" data-testid={`delete-admin-${a.username}`}>
                    <Trash2 size={12} className="mr-1" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Admin Dialog */}
      {showCreate && <CreateAdminDialog onClose={() => setShowCreate(false)} authHeaders={authHeaders} onDone={() => { setShowCreate(false); fetchAdmins(); }} />}

      {/* Edit Admin Dialog */}
      {editAdmin && <EditAdminDialog admin={editAdmin} onClose={() => setEditAdmin(null)} authHeaders={authHeaders} onDone={() => { setEditAdmin(null); fetchAdmins(); }} />}

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Are you sure?</DialogTitle></DialogHeader>
          <p className="text-sm text-[#0B1C3D]/70">Delete admin <strong>{confirmDelete?.username}</strong>? This cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button onClick={() => handleDelete(confirmDelete.username)} className="bg-red-500 text-white hover:bg-red-600">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateAdminDialog({ onClose, authHeaders, onDone }) {
  const [form, setForm] = useState({ username: "", password: "", name: "", city: "" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.username.trim() || !form.password.trim() || !form.name.trim()) return toast.error("Username, password, and name are required");
    setSaving(true);
    try {
      await axios.post(`${API}/admin/admins`, form, { headers: authHeaders() });
      toast.success(`Admin '${form.username}' created`);
      onDone();
    } catch (err) { const d = err.response?.data?.detail; toast.error(typeof d === "string" ? d : "Create failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm" data-testid="create-admin-dialog">
        <DialogHeader><DialogTitle>Create New Admin</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Username *</Label><Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="mt-1 h-8 text-sm" data-testid="new-admin-username" /></div>
          <div><Label className="text-xs">Password *</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="mt-1 h-8 text-sm" data-testid="new-admin-password" /></div>
          <div><Label className="text-xs">Full Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 h-8 text-sm" data-testid="new-admin-name" /></div>
          <div><Label className="text-xs">City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="mt-1 h-8 text-sm" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#D4AF37] text-[#0B1C3D]" data-testid="save-new-admin">{saving ? "Creating..." : "Create Admin"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAdminDialog({ admin, onClose, authHeaders, onDone }) {
  const [form, setForm] = useState({ name: admin.name || "", city: admin.city || "", password: "" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {};
      if (form.name !== admin.name) updates.name = form.name;
      if (form.city !== (admin.city || "")) updates.city = form.city;
      if (form.password) updates.password = form.password;
      if (Object.keys(updates).length === 0) { toast.info("No changes"); onClose(); return; }
      await axios.put(`${API}/admin/admins/${admin.username}`, updates, { headers: authHeaders() });
      toast.success(`Admin '${admin.username}' updated`);
      onDone();
    } catch (err) { const d = err.response?.data?.detail; toast.error(typeof d === "string" ? d : "Update failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm" data-testid="edit-admin-dialog">
        <DialogHeader><DialogTitle>Edit Admin: {admin.username}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Full Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 h-8 text-sm" /></div>
          <div><Label className="text-xs">City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="mt-1 h-8 text-sm" /></div>
          <div><Label className="text-xs">New Password (leave blank to keep current)</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="Enter new password" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#D4AF37] text-[#0B1C3D]">{saving ? "Saving..." : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
