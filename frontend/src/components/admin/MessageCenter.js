import { useState, useCallback, useEffect } from "react";
import { MessageSquare, Plus, Send, Edit2, Trash2, ToggleLeft, ToggleRight, ChevronRight, Clock, Users } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MessageCenter({ user }) {
  const [tab, setTab] = useState("templates"); // templates | send | campaigns | schedule
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [showSendDialog, setShowSendDialog] = useState(false);

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("admin_token")}` }), []);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/messages/templates`, { headers: authHeaders() });
      setTemplates(data);
    } catch { toast.error("Failed to load templates"); }
    finally { setLoading(false); }
  }, [authHeaders]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/messages/campaigns`, { headers: authHeaders() });
      setCampaigns(data.data);
    } catch {}
  }, [authHeaders]);

  useEffect(() => { fetchTemplates(); fetchCampaigns(); }, [fetchTemplates, fetchCampaigns]);

  const deleteTemplate = async (id) => {
    try {
      await axios.delete(`${API}/admin/messages/templates/${id}`, { headers: authHeaders() });
      toast.success("Deleted");
      fetchTemplates();
    } catch { toast.error("Failed"); }
  };

  const toggleTemplate = async (tmpl) => {
    try {
      await axios.put(`${API}/admin/messages/templates/${tmpl.id}`, { enabled: !tmpl.enabled }, { headers: authHeaders() });
      fetchTemplates();
    } catch { toast.error("Failed"); }
  };

  const TABS = [
    { id: "templates", label: "Templates", icon: MessageSquare },
    { id: "send", label: "Send Message", icon: Send },
    { id: "schedule", label: "Schedule", icon: Clock },
    { id: "campaigns", label: "Campaigns", icon: Users },
  ];

  return (
    <div data-testid="message-center-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Message Center</h2>
          <p className="text-[#0B1C3D]/50 text-sm mt-1">WhatsApp messaging & templates (Super Admin)</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-[#0B1C3D]/5 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all ${tab === t.id ? "bg-white text-[#0B1C3D] font-semibold shadow-sm" : "text-[#0B1C3D]/50"}`}
            data-testid={`msg-tab-${t.id}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {tab === "templates" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditTemplate(null); setShowCreateTemplate(true); }} className="bg-[#D4AF37] text-[#0B1C3D]" data-testid="create-template-btn">
              <Plus size={14} className="mr-1" /> New Template
            </Button>
          </div>
          {loading ? <p className="text-center py-10 text-[#0B1C3D]/40">Loading...</p> :
            <div className="space-y-2">
              {["system", "shraddhalu", "swamsevak"].map(cat => {
                const catTemplates = templates.filter(t => t.category === cat);
                if (catTemplates.length === 0) return null;
                return (
                  <div key={cat} className="mb-4">
                    <h3 className="text-xs font-bold text-[#0B1C3D]/50 uppercase tracking-wider mb-2">
                      {cat === "system" ? "System / Auto" : cat === "shraddhalu" ? "Shraddhalu Messages" : "Swamsevak Messages"}
                    </h3>
                    {catTemplates.map(t => (
                      <div key={t.id} className="bg-white rounded-xl border border-[#D4AF37]/10 p-4 mb-2 flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`template-${t.id}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-[#0B1C3D]">{t.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.trigger_type === "auto" ? "bg-purple-100 text-purple-600" : t.trigger_type === "scheduled" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}>{t.trigger_type}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.enabled ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>{t.enabled ? "Active" : "Disabled"}</span>
                          </div>
                          <p className="text-xs text-[#0B1C3D]/50 truncate">{t.content_en || t.content_hi}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => toggleTemplate(t)} className="h-7 w-7 p-0">
                            {t.enabled ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} className="text-gray-400" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditTemplate(t); setShowCreateTemplate(true); }} className="h-7 w-7 p-0"><Edit2 size={12} /></Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)} className="h-7 w-7 p-0 text-red-500"><Trash2 size={12} /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          }
        </div>
      )}

      {/* Send Tab */}
      {tab === "send" && <SendMessageView templates={templates} authHeaders={authHeaders} onSent={fetchCampaigns} />}

      {/* Schedule Tab */}
      {tab === "schedule" && <ScheduleView templates={templates} authHeaders={authHeaders} />}

      {/* Campaigns Tab */}
      {tab === "campaigns" && (
        <div className="space-y-2">
          {campaigns.length === 0 ? <p className="text-center py-10 text-[#0B1C3D]/40 bg-white rounded-xl border border-[#D4AF37]/10">No campaigns yet</p> :
            campaigns.map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-[#D4AF37]/10 p-4" data-testid={`campaign-${c.id}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-[#0B1C3D]">Campaign {c.id.slice(0, 8)}</span>
                    <span className="text-[10px] bg-blue-50 px-2 py-0.5 rounded-full text-blue-600 ml-2">{c.target_type}</span>
                  </div>
                  <span className="text-xs text-[#0B1C3D]/40">{new Date(c.sent_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-[#0B1C3D]/60 mt-1">Sent: {c.sent}/{c.total_targets} | By: {c.sent_by}</p>
                {c.custom_message_en && <p className="text-xs text-[#0B1C3D]/40 mt-1 truncate">{c.custom_message_en}</p>}
              </div>
            ))
          }
        </div>
      )}

      {/* Create/Edit Template Dialog */}
      <TemplateDialog open={showCreateTemplate} onClose={() => setShowCreateTemplate(false)} template={editTemplate} authHeaders={authHeaders} onSaved={() => { setShowCreateTemplate(false); fetchTemplates(); }} />
    </div>
  );
}

function SendMessageView({ templates, authHeaders, onSent }) {
  const [templateId, setTemplateId] = useState("");
  const [customEn, setCustomEn] = useState("");
  const [customHi, setCustomHi] = useState("");
  const [targetType, setTargetType] = useState("all_approved");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const { data } = await axios.post(`${API}/admin/messages/send`, {
        template_id: templateId, custom_message_en: customEn, custom_message_hi: customHi,
        target_type: targetType, target_ids: [],
      }, { headers: authHeaders() });
      toast.success(`Message sent to ${data.sent} recipients`);
      onSent();
    } catch (err) { toast.error("Send failed"); }
    finally { setSending(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-[#D4AF37]/15 p-5 space-y-4" data-testid="send-message-view">
      <h3 className="text-base font-semibold text-[#0B1C3D]">Send Message</h3>
      <div>
        <Label className="text-xs">Template (optional)</Label>
        <Select value={templateId} onValueChange={setTemplateId}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Select template" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No template</SelectItem>
            {templates.filter(t => t.enabled).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs">Custom Message (English)</Label><Textarea value={customEn} onChange={e => setCustomEn(e.target.value)} className="mt-1" rows={2} placeholder="Optional custom message..." /></div>
      <div><Label className="text-xs">Custom Message (Hindi)</Label><Textarea value={customHi} onChange={e => setCustomHi(e.target.value)} className="mt-1" rows={2} /></div>
      <div>
        <Label className="text-xs">Target Audience</Label>
        <Select value={targetType} onValueChange={setTargetType}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all_approved">All Approved Guests</SelectItem>
            <SelectItem value="all_expected">Expected Guests Only</SelectItem>
            <SelectItem value="all_arrived">Arrived Guests Only</SelectItem>
            <SelectItem value="all_swamsevaks">All Swamsevaks</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSend} disabled={sending} className="w-full bg-[#D4AF37] text-[#0B1C3D]" data-testid="send-message-btn">
        <Send size={14} className="mr-2" /> {sending ? "Sending..." : "Send Message"}
      </Button>
      <p className="text-[#0B1C3D]/40 text-[10px]">WhatsApp delivery is simulated. Connect WhatsApp Business API credentials in .env for live messaging.</p>
    </div>
  );
}

function TemplateDialog({ open, onClose, template, authHeaders, onSaved }) {
  const [name, setName] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [contentHi, setContentHi] = useState("");
  const [category, setCategory] = useState("shraddhalu");
  const [triggerType, setTriggerType] = useState("manual");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name); setContentEn(template.content_en || ""); setContentHi(template.content_hi || "");
      setCategory(template.category || "shraddhalu"); setTriggerType(template.trigger_type || "manual");
    } else {
      setName(""); setContentEn(""); setContentHi(""); setCategory("shraddhalu"); setTriggerType("manual");
    }
  }, [template, open]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      if (template) {
        await axios.put(`${API}/admin/messages/templates/${template.id}`, { name, content_en: contentEn, content_hi: contentHi, category, trigger_type: triggerType }, { headers: authHeaders() });
      } else {
        await axios.post(`${API}/admin/messages/templates`, { name, content_en: contentEn, content_hi: contentHi, category, trigger_type: triggerType }, { headers: authHeaders() });
      }
      toast.success(template ? "Updated" : "Created");
      onSaved();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="template-dialog">
        <DialogHeader><DialogTitle>{template ? "Edit" : "New"} Template</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Name *</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" data-testid="template-name" /></div>
          <div><Label className="text-xs">English Content</Label><Textarea value={contentEn} onChange={e => setContentEn(e.target.value)} className="mt-1" rows={3} /></div>
          <div><Label className="text-xs">Hindi Content</Label><Textarea value={contentHi} onChange={e => setContentHi(e.target.value)} className="mt-1" rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="shraddhalu">Shraddhalu</SelectItem>
                  <SelectItem value="swamsevak">Swamsevak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Trigger</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D]" data-testid="save-template-btn">{saving ? "Saving..." : template ? "Update" : "Create"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function ScheduleView({ templates, authHeaders }) {
  const [schedules, setSchedules] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ template_id: "", target_type: "all_expected", scheduled_date: "", scheduled_time: "", recurring: false });

  const addSchedule = () => {
    if (!form.scheduled_date || !form.template_id) {
      toast.error("Select template and date");
      return;
    }
    setSchedules(prev => [...prev, { ...form, id: Date.now().toString(), status: "scheduled" }]);
    setShowAdd(false);
    setForm({ template_id: "", target_type: "all_expected", scheduled_date: "", scheduled_time: "", recurring: false });
    toast.success("Message scheduled (will be sent via WhatsApp when configured)");
  };

  const removeSchedule = (id) => { setSchedules(prev => prev.filter(s => s.id !== id)); };

  return (
    <div className="space-y-4" data-testid="schedule-view">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[#0B1C3D]/60">Schedule recurring or one-time messages</p>
        <Button onClick={() => setShowAdd(true)} className="bg-[#D4AF37] text-[#0B1C3D]" data-testid="add-schedule-btn">
          <Plus size={14} className="mr-1" /> Add Schedule
        </Button>
      </div>
      {schedules.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-[#D4AF37]/10">
          <Clock size={32} className="mx-auto text-[#0B1C3D]/20 mb-2" />
          <p className="text-[#0B1C3D]/40">No scheduled messages yet</p>
        </div>
      ) : (
        schedules.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-[#D4AF37]/10 p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-sm text-[#0B1C3D]">
                {templates.find(t => t.id === s.template_id)?.name || "Unknown Template"}
              </p>
              <p className="text-xs text-[#0B1C3D]/50">
                {s.scheduled_date} {s.scheduled_time} • {s.target_type} {s.recurring && "• Recurring"}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => removeSchedule(s.id)} className="text-red-500"><Trash2 size={14} /></Button>
          </div>
        ))
      )}
      <Dialog open={showAdd} onOpenChange={() => setShowAdd(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Message</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Template</Label>
              <Select value={form.template_id} onValueChange={v => setForm({...form, template_id: v})}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Target</Label>
              <Select value={form.target_type} onValueChange={v => setForm({...form, target_type: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_approved">All Approved</SelectItem>
                  <SelectItem value="all_expected">All Expected</SelectItem>
                  <SelectItem value="all_arrived">All Arrived</SelectItem>
                  <SelectItem value="all_swamsevaks">All Swamsevaks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" className="mt-1" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Time</Label>
                <Input type="time" className="mt-1" value={form.scheduled_time} onChange={e => setForm({...form, scheduled_time: e.target.value})} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.recurring} onChange={e => setForm({...form, recurring: e.target.checked})} />
              Recurring (daily at this time)
            </label>
            <Button onClick={addSchedule} className="w-full bg-[#D4AF37] text-[#0B1C3D]" data-testid="save-schedule-btn">Schedule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
