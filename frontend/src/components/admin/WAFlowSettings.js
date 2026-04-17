import React, { useState, useCallback, useEffect } from "react";
import {
  Plus, Eye, ToggleLeft, ToggleRight, Edit2, Trash2, GitBranch, ShieldCheck,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Admin-only WhatsApp Flow configuration panel (moved from Notification Management).
 * Now lives under Help Centre because the Flow is used to receive help/seva requests.
 */
export default function WAFlowSettings() {
  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("admin_token")}` }), []);
  const [flows, setFlows] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [editFlow, setEditFlow] = useState(null);
  const [form, setForm] = useState({
    flow_name: "", flow_id: "", flow_token: "", description: "", trigger_keywords: "",
  });

  const ENDPOINT_URL = `${process.env.REACT_APP_BACKEND_URL}/api/webhooks/wa-flow`;

  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/wa-flows`, { headers: authHeaders() });
      setFlows(data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchEvents = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/wa-flow-events`, { headers: authHeaders() });
      setEvents(data.data || []);
      setShowEvents(true);
    } catch { toast.error("Failed to load events"); }
  };

  const resetForm = () => setForm({ flow_name: "", flow_id: "", flow_token: "", description: "", trigger_keywords: "" });

  const saveFlow = async () => {
    if (!form.flow_name.trim()) { toast.error("Flow name is required"); return; }
    const payload = {
      ...form,
      trigger_keywords: form.trigger_keywords ? form.trigger_keywords.split(",").map(k => k.trim()).filter(Boolean) : [],
    };
    try {
      if (editFlow) {
        await axios.put(`${API}/admin/wa-flows/${editFlow.id}`, payload, { headers: authHeaders() });
        toast.success("Flow updated");
      } else {
        await axios.post(`${API}/admin/wa-flows`, payload, { headers: authHeaders() });
        toast.success("Flow created");
      }
      setShowCreate(false);
      setEditFlow(null);
      resetForm();
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const deleteFlow = async (id) => {
    if (!window.confirm("Delete this flow configuration?")) return;
    try {
      await axios.delete(`${API}/admin/wa-flows/${id}`, { headers: authHeaders() });
      toast.success("Deleted");
      fetchData();
    } catch { /* silent */ }
  };

  const toggleFlow = async (f) => {
    try {
      await axios.put(`${API}/admin/wa-flows/${f.id}`, { is_active: !f.is_active }, { headers: authHeaders() });
      fetchData();
    } catch { /* silent */ }
  };

  const copyEndpoint = () => {
    navigator.clipboard.writeText(ENDPOINT_URL);
    toast.success("Endpoint URL copied to clipboard!");
  };

  return (
    <div className="space-y-4" data-testid="wa-flow-settings">
      {/* Endpoint Info Card */}
      <div className="bg-gradient-to-r from-[#0B1C3D] to-[#1a3a6b] rounded-xl p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2"><GitBranch size={18} /> WhatsApp Flow (Help Requests)</h2>
            <p className="text-white/70 text-xs mt-1">This Flow powers the Help Centre in-chat form. Super-admin only.</p>
          </div>
          <button onClick={fetchEvents} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1" data-testid="view-flow-events">
            <Eye size={12} /> View Events
          </button>
        </div>
        <div className="mt-4 bg-white/10 rounded-lg p-3">
          <p className="text-[10px] text-white/60 uppercase font-bold mb-1">Data Exchange Endpoint (paste in Meta Flow Builder)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono bg-black/20 rounded px-3 py-2 truncate select-all" data-testid="endpoint-url">{ENDPOINT_URL}</code>
            <button onClick={copyEndpoint} className="bg-[#D4AF37] text-[#0B1C3D] px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#D4AF37]/90 whitespace-nowrap" data-testid="copy-endpoint">
              Copy URL
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/30 rounded-lg p-2.5 text-xs text-emerald-100">
          <ShieldCheck size={14} /> Public key uploaded to Meta (signature VALID). Keep Flow in <b className="mx-1">Draft</b> until Help Centre integration is live.
        </div>
      </div>

      {/* Flow Configurations */}
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-[#0B1C3D]">Flow Configurations ({flows.length})</p>
        <Button onClick={() => { resetForm(); setEditFlow(null); setShowCreate(true); }} className="bg-[#0B1C3D] text-white" size="sm" data-testid="add-flow-btn">
          <Plus size={13} className="mr-1" /> Add Flow
        </Button>
      </div>

      {loading ? <p className="text-gray-400 text-center py-8">Loading...</p> :
        flows.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-xl border p-6">
            <GitBranch size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No flow configurations yet</p>
            <p className="text-xs mt-1">Register your Meta Flow here to wire it into the Help Centre</p>
          </div>
        ) : (
          <div className="space-y-2">
            {flows.map(f => (
              <div key={f.id} className="bg-white rounded-xl p-4 border" data-testid={`flow-row-${f.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => toggleFlow(f)} className={f.is_active ? "text-green-500" : "text-gray-300"} data-testid={`toggle-flow-${f.id}`}>
                      {f.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                    <div>
                      <p className="font-semibold text-[#0B1C3D] text-sm">{f.flow_name}</p>
                      {f.description && <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {f.flow_id && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Flow ID: {f.flow_id}</span>}
                        {f.flow_token && <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">Token: {f.flow_token.substring(0, 12)}...</span>}
                        {(f.trigger_keywords || []).map((k, i) => (
                          <span key={i} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">#{k}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditFlow(f); setForm({ flow_name: f.flow_name, flow_id: f.flow_id || "", flow_token: f.flow_token || "", description: f.description || "", trigger_keywords: (f.trigger_keywords || []).join(", ") }); setShowCreate(true); }}
                      className="text-blue-500 hover:text-blue-700 p-1" data-testid={`edit-flow-${f.id}`}><Edit2 size={14} /></button>
                    <button onClick={() => deleteFlow(f.id)} className="text-red-400 hover:text-red-600 p-1" data-testid={`delete-flow-${f.id}`}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {/* Create/Edit Flow Dialog */}
      <Dialog open={showCreate} onOpenChange={() => { setShowCreate(false); setEditFlow(null); resetForm(); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0B1C3D]">{editFlow ? "Edit Flow" : "Register WhatsApp Flow"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Flow Name <span className="text-red-500">*</span></Label>
              <Input value={form.flow_name} onChange={e => setForm(p => ({ ...p, flow_name: e.target.value }))}
                placeholder="e.g. Raise a Seva Request" className="mt-1" data-testid="flow-name-input" />
            </div>
            <div>
              <Label>Meta Flow ID</Label>
              <Input value={form.flow_id} onChange={e => setForm(p => ({ ...p, flow_id: e.target.value }))}
                placeholder="From Meta Business Manager" className="mt-1" data-testid="flow-id-input" />
              <p className="text-[10px] text-gray-400 mt-1">Found in Meta → WhatsApp → Flows → Flow Details</p>
            </div>
            <div>
              <Label>Flow Token</Label>
              <Input value={form.flow_token} onChange={e => setForm(p => ({ ...p, flow_token: e.target.value }))}
                placeholder="Unique token for this flow" className="mt-1" data-testid="flow-token-input" />
              <p className="text-[10px] text-gray-400 mt-1">Used to identify which flow config to use when Meta calls our endpoint</p>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="What does this flow do?" className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Trigger Keywords (comma-separated)</Label>
              <Input value={form.trigger_keywords} onChange={e => setForm(p => ({ ...p, trigger_keywords: e.target.value }))}
                placeholder="e.g. help, seva, request" className="mt-1" data-testid="flow-keywords-input" />
              <p className="text-[10px] text-gray-400 mt-1">When users send these keywords on WhatsApp, the corresponding template with this Flow will open.</p>
            </div>
            <Button onClick={saveFlow} className="w-full bg-[#0B1C3D] text-white" data-testid="save-flow-btn">
              {editFlow ? "Update Flow" : "Register Flow"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Flow Events Dialog */}
      <Dialog open={showEvents} onOpenChange={setShowEvents}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0B1C3D]">Recent Flow Events</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {events.length === 0 ? <p className="text-gray-400 text-center py-8 text-sm">No flow events received yet</p> :
              events.map((ev, i) => (
                <div key={ev.id || i} className="bg-gray-50 rounded-lg p-3 border text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex gap-2">
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{ev.action}</span>
                      {ev.screen && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{ev.screen}</span>}
                    </div>
                    <span className="text-gray-400">{new Date(ev.received_at).toLocaleString()}</span>
                  </div>
                  {ev.flow_token && <p className="text-gray-500">Token: {ev.flow_token}</p>}
                  {ev.data && Object.keys(ev.data).length > 0 && (
                    <pre className="bg-white p-2 rounded mt-1 text-[10px] overflow-x-auto border">{JSON.stringify(ev.data, null, 2)}</pre>
                  )}
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
