import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Send, Plus, Upload, Download, FileSpreadsheet, Eye, RefreshCw,
  ToggleLeft, ToggleRight, Edit2, Trash2, Radio, CheckCircle2,
  XCircle, Clock, Mail, Bell, ChevronRight, Search, X, FileText, Zap,
  MessageCircle, ArrowLeft, Paperclip, Check, ChevronDown, AlertTriangle, User,
  Key, GitBranch, Image
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NotificationManagement({ user }) {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [convoPhone, setConvoPhone] = useState(null);
  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("admin_token")}` }), []);

  const TABS = [
    { id: "campaigns", label: "Bulk Campaigns", icon: Send },
    { id: "triggers", label: "System Messages", icon: Zap },
    { id: "templates", label: "Template Registry", icon: FileText },
    { id: "conversations", label: "Conversations", icon: MessageCircle },
    { id: "otplogs", label: "OTP Logs", icon: Key },
    { id: "flows", label: "WA Flows", icon: GitBranch },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-6xl" data-testid="notification-management">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0B1C3D]">Notification Management</h1>
        <p className="text-sm text-gray-500">WhatsApp campaigns, system triggers, templates, conversations & flows</p>
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto" data-testid="notif-tabs">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); if (t.id !== "conversations") setConvoPhone(null); }} data-testid={`tab-${t.id}`}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${activeTab === t.id ? "bg-white shadow text-[#0B1C3D]" : "text-gray-600 hover:bg-gray-50"}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>
      {activeTab === "campaigns" && <CampaignTab authHeaders={authHeaders} onOpenConvo={(phone) => { setActiveTab("conversations"); setConvoPhone(phone); }} />}
      {activeTab === "triggers" && <TriggersTab authHeaders={authHeaders} />}
      {activeTab === "templates" && <TemplatesTab authHeaders={authHeaders} />}
      {activeTab === "conversations" && <ConversationsTab authHeaders={authHeaders} initialPhone={convoPhone} />}
      {activeTab === "otplogs" && <OTPLogsTab authHeaders={authHeaders} />}
      {activeTab === "flows" && <FlowsTab authHeaders={authHeaders} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                     CONVERSATIONS TAB                          */
/* ═══════════════════════════════════════════════════════════════ */
function ConversationsTab({ authHeaders, initialPhone }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeConvo, setActiveConvo] = useState(null); // phone number of open convo
  const [convoDetail, setConvoDetail] = useState(null); // full convo with messages
  const [msgText, setMsgText] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]); // File[] staged for bundle send
  const [sending, setSending] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/wa-conversations`, {
        params: { search }, headers: authHeaders()
      });
      setConversations(data.data || []);
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  }, [search, authHeaders]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Open specific phone conversation if passed as prop
  useEffect(() => {
    if (initialPhone) openConvo(initialPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhone]);

  // Poll every 5s for new messages
  useEffect(() => {
    pollRef.current = setInterval(fetchConversations, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchConversations]);

  const openConvo = async (phone) => {
    setActiveConvo(phone);
    try {
      const { data } = await axios.get(`${API}/admin/wa-conversations/${phone}`, { headers: authHeaders() });
      setConvoDetail(data);
      // Mark as read
      await axios.put(`${API}/admin/wa-conversations/${phone}/read`, {}, { headers: authHeaders() });
      fetchConversations(); // refresh unread counts
    } catch (e) { toast.error("Failed to load conversation"); }
  };

  const sendBundle = async () => {
    if (!activeConvo) return;
    const hasText = msgText.trim().length > 0;
    const hasFiles = pendingFiles.length > 0;
    if (!hasText && !hasFiles) return;
    setSending(true);
    setSendError("");
    try {
      const fd = new FormData();
      if (hasText) fd.append("text", msgText);
      pendingFiles.forEach(f => fd.append("files", f));
      await axios.post(`${API}/admin/wa-conversations/${activeConvo}/send-bundle`, fd, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      });
      setMsgText("");
      setPendingFiles([]);
      const { data } = await axios.get(`${API}/admin/wa-conversations/${activeConvo}`, { headers: authHeaders() });
      setConvoDetail(data);
    } catch (e) {
      const detail = e.response?.data?.detail || "Failed to send";
      setSendError(detail);
      toast.error(detail);
    } finally { setSending(false); }
  };

  const addPendingFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const arr = Array.from(fileList);
    // WhatsApp Cloud API limits: image 5MB, video 16MB, doc 100MB; keep conservative 20MB default
    const MAX = 20 * 1024 * 1024;
    const tooBig = arr.filter(f => f.size > MAX);
    if (tooBig.length) {
      toast.error(`${tooBig.length} file(s) exceed 20MB limit`);
    }
    const ok = arr.filter(f => f.size <= MAX);
    setPendingFiles(prev => [...prev, ...ok].slice(0, 10)); // cap at 10
  };

  const removePendingFile = (idx) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [convoDetail]);

  // Poll active conversation
  useEffect(() => {
    if (!activeConvo) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API}/admin/wa-conversations/${activeConvo}`, { headers: authHeaders() });
        setConvoDetail(data);
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [activeConvo, authHeaders]);

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  if (activeConvo && convoDetail) {
    return (
      <div className="flex flex-col h-[calc(100vh-250px)] bg-white rounded-xl border" data-testid="conversation-chat">
        {/* Chat Header */}
        <div className="flex items-center gap-3 p-4 border-b bg-[#0B1C3D] text-white rounded-t-xl">
          <button onClick={() => { setActiveConvo(null); setConvoDetail(null); }} className="hover:bg-white/10 p-1 rounded">
            <ArrowLeft size={18} />
          </button>
          <div className="w-9 h-9 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#0B1C3D] font-bold text-sm">
            {(convoDetail.contact_name || convoDetail.phone || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{convoDetail.contact_name || convoDetail.phone}</p>
            <p className="text-xs text-white/60">+{convoDetail.phone}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%239C92AC\" fill-opacity=\"0.04\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}>
          {(!convoDetail.messages || convoDetail.messages.length === 0) && (
            <p className="text-center text-gray-400 text-sm py-8">No messages yet</p>
          )}
          {(convoDetail.messages || []).map((msg, i) => (
            <div key={msg.id || i} className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${msg.direction === "outgoing"
                ? "bg-[#DCF8C6] text-gray-900 rounded-br-md"
                : "bg-white text-gray-900 rounded-bl-md border"}`}>
                {msg.direction === "outgoing" && msg.sent_by && (
                  <p className="text-[10px] text-green-700 font-medium mb-0.5">{msg.sent_by}</p>
                )}
                {/* Media preview */}
                {msg.media_url && (
                  <div className="mb-1.5">
                    {msg.media_type === "image" ? (
                      <img src={msg.media_url} alt="" className="rounded-lg max-w-full max-h-48 object-cover" />
                    ) : msg.media_type === "video" ? (
                      <video src={msg.media_url} controls className="rounded-lg max-w-full max-h-48" />
                    ) : (
                      <a href={msg.media_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 bg-white/60 rounded-lg p-2 border hover:bg-white/80">
                        <FileText size={16} className="text-blue-600" />
                        <span className="text-xs text-blue-700 truncate">{msg.filename || "Document"}</span>
                      </a>
                    )}
                  </div>
                )}
                {/* Incoming media from WhatsApp */}
                {msg.msg_type === "image" && !msg.media_url && (
                  <p className="text-xs italic text-gray-500">[🖼 Image received]</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                {/* Error detail for failed outgoing */}
                {msg.direction === "outgoing" && msg.status === "failed" && (
                  <div className="mt-1.5 bg-red-50 rounded-lg px-2 py-1.5 border border-red-200">
                    <p className="text-[10px] text-red-600 font-medium flex items-center gap-1">
                      <AlertTriangle size={10} /> Message failed to send
                    </p>
                    {msg.error_message && <p className="text-[10px] text-red-500 mt-0.5">{msg.error_message}</p>}
                  </div>
                )}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] text-gray-500">{formatTime(msg.timestamp)}</span>
                  {msg.direction === "outgoing" && (
                    <span className="text-[10px]">
                      {msg.status === "read" ? <span className="text-blue-500">✓✓</span>
                        : msg.status === "delivered" ? <span className="text-gray-500">✓✓</span>
                        : msg.status === "sent" ? <span className="text-gray-400">✓</span>
                        : msg.status === "failed" ? <span className="text-red-500">✗</span>
                        : <Clock size={10} className="text-gray-400" />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-3 border-t bg-white rounded-b-xl">
          {sendError && (
            <div className="mb-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-red-700 font-medium">Send Failed</p>
                <p className="text-[10px] text-red-600 break-all">{sendError}</p>
              </div>
              <button onClick={() => setSendError("")} className="text-red-400 hover:text-red-600"><X size={12} /></button>
            </div>
          )}

          {/* Pending media chips (preview before send) */}
          {pendingFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border border-dashed border-gray-300" data-testid="pending-media-chips">
              {pendingFiles.map((f, i) => {
                const isImage = f.type.startsWith("image/");
                const isVideo = f.type.startsWith("video/");
                const url = URL.createObjectURL(f);
                return (
                  <div key={i} className="relative group" data-testid={`pending-chip-${i}`}>
                    {isImage ? (
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                    ) : isVideo ? (
                      <video src={url} className="w-16 h-16 object-cover rounded-lg border bg-black" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg border bg-white flex flex-col items-center justify-center px-1">
                        <FileText size={18} className="text-blue-600" />
                        <span className="text-[8px] text-gray-600 truncate w-full text-center mt-1">{f.name}</span>
                      </div>
                    )}
                    <button onClick={() => removePendingFile(i)} data-testid={`remove-chip-${i}`}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow hover:bg-red-600">
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
              <p className="text-[10px] text-gray-500 w-full mt-1">
                {pendingFiles.length}/10 files · text (if typed) will be attached as caption on the first media
              </p>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <input ref={fileInputRef} type="file" className="hidden" multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
              onChange={e => { addPendingFiles(e.target.files); e.target.value = ""; }}
              data-testid="convo-file-input" />
            <button onClick={() => fileInputRef.current?.click()} disabled={sending || pendingFiles.length >= 10}
              className="p-2.5 hover:bg-gray-100 rounded-full text-gray-500 disabled:opacity-40" title="Attach files"
              data-testid="convo-attach-btn">
              <Paperclip size={18} />
            </button>
            <textarea value={msgText} onChange={e => setMsgText(e.target.value)}
              placeholder={pendingFiles.length > 0 ? "Add a caption (optional)..." : "Type a message..."}
              rows={1}
              className="flex-1 border rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1C3D]/20 resize-none max-h-32"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendBundle(); }
              }}
              data-testid="convo-msg-input" />
            <button onClick={sendBundle}
              disabled={sending || (!msgText.trim() && pendingFiles.length === 0)} data-testid="convo-send-btn"
              className="bg-[#0B1C3D] text-white px-4 py-2.5 rounded-full hover:bg-[#0B1C3D]/90 disabled:opacity-40 flex items-center gap-1 text-sm">
              <Send size={14} /> {sending ? "..." : "Send"}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 ml-12">
            Tip: attach multiple files + type text — all send together in one action. Free-form messages only work within 24h of user's last reply (WhatsApp policy). Header/footer not supported by Meta for session messages.
          </p>
        </div>
      </div>
    );
  }

  // Conversation List View
  return (
    <div className="space-y-4" data-testid="conversations-list">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="font-semibold text-[#0B1C3D]">WhatsApp Conversations</h2>
          <p className="text-xs text-gray-500">Auto-created when messages are sent via campaigns or system triggers</p>
        </div>
        <button onClick={fetchConversations} className="text-sm text-gray-500 flex items-center gap-1 hover:text-[#0B1C3D]">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
          className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1C3D]/20"
          data-testid="convo-search" />
      </div>

      {loading ? <p className="text-gray-400 text-center py-8">Loading conversations...</p> :
        conversations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No conversations yet</p>
            <p className="text-xs mt-1">Conversations are auto-created when you send campaigns or system messages</p>
          </div>
        ) : (
          <div className="space-y-1" data-testid="convo-items">
            {conversations.map(c => (
              <button key={c.id} onClick={() => openConvo(c.phone)} data-testid={`convo-${c.phone}`}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition text-left border bg-white">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-[#0B1C3D] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {(c.contact_name || c.phone || "?").charAt(0).toUpperCase()}
                  </div>
                  {c.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {c.unread_count > 9 ? "9+" : c.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className={`text-sm truncate ${c.unread_count > 0 ? "font-bold text-[#0B1C3D]" : "font-medium text-gray-800"}`}>
                      {c.contact_name || `+${c.phone}`}
                    </p>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{formatTime(c.last_message_at)}</span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${c.unread_count > 0 ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                    {c.last_message || "No messages"}
                  </p>
                </div>
                <ChevronRight size={14} className="text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        )
      }
    </div>
  );

}

/* ═══════════════════════════════════════════════════════════════ */
/*                     CAMPAIGN TAB                               */
/* ═══════════════════════════════════════════════════════════════ */
function CampaignTab({ authHeaders, onOpenConvo }) {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewCampaignId, setViewCampaignId] = useState(null); // full detail view

  const fetchData = useCallback(async () => {
    try {
      const [cRes, tRes] = await Promise.all([
        axios.get(`${API}/admin/wa-campaigns`, { headers: authHeaders() }),
        axios.get(`${API}/admin/wa-templates`, { headers: authHeaders() }),
      ]);
      setCampaigns(cRes.data.data || cRes.data || []);
      setTemplates(tRes.data);
    } catch (e) { toast.error("Failed to load campaigns"); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const launchCampaign = async (id) => {
    if (!window.confirm("Launch this campaign now?")) return;
    try {
      const { data } = await axios.post(`${API}/admin/wa-campaigns/${id}/launch`, {}, { headers: authHeaders() });
      toast.success(`Launched! ${data.sent || 0} sent, ${data.failed || 0} failed`);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || "Launch failed"); }
  };

  // Full campaign detail view
  if (viewCampaignId) {
    return <CampaignDetailView campaignId={viewCampaignId} authHeaders={authHeaders}
      onBack={() => { setViewCampaignId(null); fetchData(); }} onOpenConvo={onOpenConvo} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-[#0B1C3D]">Bulk Campaigns</h2>
          <p className="text-xs text-gray-500">Send WhatsApp template messages to uploaded contacts</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#0B1C3D] text-white" data-testid="create-campaign-btn">
          <Plus size={14} className="mr-1" /> New Campaign
        </Button>
      </div>

      {loading ? <p className="text-gray-400 text-center py-8">Loading...</p> :
        campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Send size={40} className="mx-auto mb-3 opacity-30" />
            <p>No campaigns yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="campaign-list">
            {campaigns.map(c => (
              <div key={c.id} className="bg-white rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0B1C3D]">{c.campaign_name || c.name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span>Template: {c.template_name || c.template_display}</span>
                    <span>•</span>
                    <span>{c.total_recipients} recipients</span>
                    <span>•</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(c.created_at).toLocaleString()}</p>
                  {(c.failed_count > 0) && (
                    <p className="text-xs text-red-500 mt-0.5 font-medium">⚠ {c.failed_count} failed</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {c.status === "draft" && (
                    <button onClick={() => launchCampaign(c.id)} data-testid={`launch-${c.id}`}
                      className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-green-100">
                      <Radio size={14} /> Launch
                    </button>
                  )}
                  <button onClick={() => setViewCampaignId(c.id)} data-testid={`view-campaign-${c.id}`}
                    className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-100">
                    <Eye size={14} /> View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {showCreate && (
        <CreateCampaignFlow authHeaders={authHeaders} templates={templates}
          onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); fetchData(); }} />
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: "bg-amber-100 text-amber-700",
    sending: "bg-blue-100 text-blue-700 animate-pulse",
    completed: "bg-green-100 text-green-700",
    partially_failed: "bg-orange-100 text-orange-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*               CAMPAIGN DETAIL VIEW (full page)                 */
/* ═══════════════════════════════════════════════════════════════ */
function CampaignDetailView({ campaignId, authHeaders, onBack, onOpenConvo }) {
  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [recipientPage, setRecipientPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const PER_PAGE = 25;

  const fetchCampaign = useCallback(async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        axios.get(`${API}/admin/wa-campaigns/${campaignId}`, { headers: authHeaders() }),
        axios.get(`${API}/admin/wa-campaigns/${campaignId}/stats`, { headers: authHeaders() }),
      ]);
      setCampaign(cRes.data);
      setStats(sRes.data);
    } catch (e) { toast.error("Failed to load campaign"); }
    finally { setLoading(false); }
  }, [campaignId, authHeaders]);

  const fetchRecipients = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/wa-campaigns/${campaignId}/recipients`, {
        params: { page: recipientPage, per_page: PER_PAGE, status_filter: statusFilter },
        headers: authHeaders(),
      });
      setRecipients(data.data || []);
      setTotalRecipients(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch {}
  }, [campaignId, recipientPage, statusFilter, authHeaders]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);
  useEffect(() => { fetchRecipients(); }, [fetchRecipients]);

  // Auto-refresh every 8s for live campaigns
  useEffect(() => {
    if (!campaign || campaign.status === "completed" || campaign.status === "failed") return;
    const interval = setInterval(() => { fetchCampaign(); fetchRecipients(); }, 8000);
    return () => clearInterval(interval);
  }, [campaign, fetchCampaign, fetchRecipients]);

  const formatDt = (iso) => iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

  const statusIcon = (s) => {
    switch (s) {
      case "sent": return <CheckCircle2 size={14} className="text-green-500" />;
      case "delivered": return <span className="text-blue-500 font-bold text-xs">✓✓</span>;
      case "read": return <span className="text-blue-600 font-bold text-xs">✓✓</span>;
      case "failed": return <XCircle size={14} className="text-red-500" />;
      case "queued": return <Clock size={14} className="text-amber-400" />;
      default: return <Clock size={14} className="text-gray-300" />;
    }
  };

  if (loading) return <p className="text-gray-400 text-center py-12">Loading campaign details...</p>;
  if (!campaign) return <p className="text-red-500 text-center py-12">Campaign not found</p>;

  const successRate = stats && stats.total > 0 ? Math.round(((stats.sent + stats.delivered + stats.read) / stats.total) * 100) : 0;

  return (
    <div className="space-y-5" data-testid="campaign-detail">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-[#0B1C3D]">{campaign.campaign_name || campaign.name}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Template: {campaign.template_name || campaign.template_display}</span>
            <span>•</span>
            <StatusBadge status={campaign.status} />
            <span>•</span>
            <span>Created: {formatDt(campaign.created_at)}</span>
            {campaign.completed_at && <><span>•</span><span>Completed: {formatDt(campaign.completed_at)}</span></>}
          </div>
        </div>
        <button onClick={() => { fetchCampaign(); fetchRecipients(); }} className="text-sm text-gray-500 flex items-center gap-1 hover:text-[#0B1C3D] bg-gray-50 px-3 py-1.5 rounded-lg">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <div className="bg-white rounded-xl p-3 border text-center">
            <p className="text-xl font-bold text-[#0B1C3D]">{stats.total}</p>
            <p className="text-[10px] text-gray-500 font-medium">TOTAL</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-center">
            <p className="text-xl font-bold text-amber-600">{stats.queued}</p>
            <p className="text-[10px] text-amber-600 font-medium">QUEUED</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 border border-green-200 text-center">
            <p className="text-xl font-bold text-green-600">{stats.sent}</p>
            <p className="text-[10px] text-green-600 font-medium">SENT</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-center">
            <p className="text-xl font-bold text-blue-600">{stats.delivered}</p>
            <p className="text-[10px] text-blue-600 font-medium">DELIVERED</p>
          </div>
          <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-200 text-center">
            <p className="text-xl font-bold text-indigo-600">{stats.read}</p>
            <p className="text-[10px] text-indigo-600 font-medium">READ</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 border border-red-200 text-center">
            <p className="text-xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-[10px] text-red-600 font-medium">FAILED</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {stats && stats.total > 0 && (
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Delivery Progress</span>
            <span className="font-medium">{successRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden flex">
            {stats.read > 0 && <div className="bg-indigo-500 h-3" style={{ width: `${(stats.read / stats.total) * 100}%` }} />}
            {stats.delivered > 0 && <div className="bg-blue-400 h-3" style={{ width: `${(stats.delivered / stats.total) * 100}%` }} />}
            {stats.sent > 0 && <div className="bg-green-400 h-3" style={{ width: `${(stats.sent / stats.total) * 100}%` }} />}
            {stats.queued > 0 && <div className="bg-amber-300 h-3" style={{ width: `${(stats.queued / stats.total) * 100}%` }} />}
            {stats.failed > 0 && <div className="bg-red-400 h-3" style={{ width: `${(stats.failed / stats.total) * 100}%` }} />}
          </div>
          <div className="flex gap-3 mt-2 text-[10px] text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded-full" />Read</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-full" />Delivered</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full" />Sent</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-300 rounded-full" />Queued</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full" />Failed</span>
          </div>
        </div>
      )}

      {/* Recipient List */}
      <div className="bg-white rounded-xl border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b gap-3">
          <div>
            <p className="font-semibold text-[#0B1C3D] text-sm">Recipients ({totalRecipients})</p>
            <p className="text-[10px] text-gray-400">Individual delivery status for each contact</p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {["", "queued", "sent", "delivered", "read", "failed"].map(f => (
              <button key={f} onClick={() => { setStatusFilter(f); setRecipientPage(1); }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition ${statusFilter === f ? "bg-[#0B1C3D] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {f === "" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y max-h-[400px] overflow-y-auto">
          {recipients.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No recipients found</p>
          ) : recipients.map((r, i) => (
            <div key={r.id || i} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 cursor-pointer group"
              onClick={() => onOpenConvo && onOpenConvo(r.phone_number)} title="Click to open conversation">
              <div className="mt-0.5">{statusIcon(r.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-[#0B1C3D] group-hover:text-blue-700 group-hover:underline">+{r.phone_number}</p>
                    {r.variable_values && Object.keys(r.variable_values).length > 0 && (
                      <p className="text-[10px] text-gray-400 truncate max-w-[300px]">
                        {Object.entries(r.variable_values).map(([k, v]) => `${k}: ${v}`).join(" • ")}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                {/* Failure reason */}
                {r.status === "failed" && r.error_message && (
                  <div className="mt-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-red-700 font-medium flex items-center gap-1">
                      <AlertTriangle size={11} /> Failure Reason
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">{r.error_message}</p>
                    {r.error_code && <p className="text-[10px] text-red-400 mt-0.5">Code: {r.error_code}</p>}
                  </div>
                )}
                {/* Timestamps */}
                <div className="flex gap-3 mt-1 text-[10px] text-gray-400 flex-wrap">
                  {r.sent_at && <span>Sent: {new Date(r.sent_at).toLocaleTimeString()}</span>}
                  {r.delivered_at && <span>Delivered: {new Date(r.delivered_at).toLocaleTimeString()}</span>}
                  {r.read_at && <span>Read: {new Date(r.read_at).toLocaleTimeString()}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t">
            <p className="text-[10px] text-gray-400">Page {recipientPage} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setRecipientPage(p => Math.max(1, p - 1))} disabled={recipientPage <= 1}
                className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40">Prev</button>
              <button onClick={() => setRecipientPage(p => Math.min(totalPages, p + 1))} disabled={recipientPage >= totalPages}
                className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*               CREATE CAMPAIGN FLOW (with column mapping)       */
/* ═══════════════════════════════════════════════════════════════ */
function CreateCampaignFlow({ authHeaders, templates, onClose, onDone }) {
  const [step, setStep] = useState(1); // 1=basics, 2=upload, 3=map columns, 4=preview
  const [name, setName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null); // { rows, headers, all_columns, phone_column }
  const [columnMapping, setColumnMapping] = useState({}); // { templateVar: excelCol }
  const [creating, setCreating] = useState(false);

  const tmpl = templates.find(t => t.id === selectedTemplate);
  const templateVars = tmpl?.variable_labels || [];

  const doUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await axios.post(`${API}/admin/wa-campaigns/upload-excel`, fd, { headers: { ...authHeaders(), "Content-Type": "multipart/form-data" } });
      setUploadResult(data);
      // Auto-map if column names match variable labels
      const autoMap = {};
      (templateVars || []).forEach(v => {
        const match = (data.headers || []).find(h => h.toLowerCase() === v.toLowerCase());
        if (match) autoMap[v] = match;
      });
      setColumnMapping(autoMap);
      setStep(3);
    } catch (e) { toast.error(e.response?.data?.detail || "Upload failed"); }
    finally { setUploading(false); }
  };

  const createCampaign = async () => {
    if (!name.trim()) { toast.error("Campaign name required"); return; }
    if (!selectedTemplate) { toast.error("Select a template"); return; }
    if (!uploadResult) { toast.error("Upload Excel first"); return; }
    setCreating(true);
    try {
      // Build recipients with mapped variables using variable labels as keys
      const recipients = uploadResult.rows.map(row => {
        const variables = {};
        templateVars.forEach(v => {
          const col = columnMapping[v];
          if (col) variables[v] = row.variables[col] || "";
        });
        return { phone_number: row.phone_number, variables };
      });
      await axios.post(`${API}/admin/wa-campaigns/launch`, {
        name,
        template_id: selectedTemplate,
        recipients,
      }, { headers: authHeaders() });
      toast.success("Campaign created!");
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to create"); }
    finally { setCreating(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#0B1C3D]">Create New Campaign</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {["Basics", "Upload", "Map Variables", "Preview"].map((s, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${step > i + 1 ? "text-green-600" : step === i + 1 ? "text-[#0B1C3D]" : "text-gray-400"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step > i + 1 ? "bg-green-100 text-green-700" : step === i + 1 ? "bg-[#0B1C3D] text-white" : "bg-gray-100"}`}>
                  {step > i + 1 ? "✓" : i + 1}
                </span>
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 ${step > i + 1 ? "bg-green-300" : "bg-gray-200"}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Campaign Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Event Reminder Batch 1" className="mt-1" data-testid="campaign-name-input" />
            </div>
            <div>
              <Label>WhatsApp Template</Label>
              <Select value={selectedTemplate || ""} onValueChange={v => setSelectedTemplate(v)}>
                <SelectTrigger className="mt-1" data-testid="campaign-template-select">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.status === "approved").map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.display_name} ({t.meta_template_name})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tmpl && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-[#0B1C3D] mb-1">Template Preview:</p>
                <p className="text-gray-600 whitespace-pre-wrap">{tmpl.body_text || "No body text"}</p>
                {templateVars.length > 0 && (
                  <div className="mt-2 border-t pt-2">
                    <p className="text-xs text-gray-500">Variables: {templateVars.map((v, i) => (
                      <span key={i} className="inline-block bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] mr-1 font-medium">{`{{${i+1}}} = ${v}`}</span>
                    ))}</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => { if (!name.trim() || !selectedTemplate) { toast.error("Fill in all fields"); return; } setStep(2); }}
                className="bg-[#0B1C3D] text-white">Next: Upload Excel →</Button>
            </div>
          </div>
        )}

        {/* Step 2: Upload */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
              <FileSpreadsheet size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-2">Upload Excel file with contacts</p>
              <p className="text-xs text-gray-400 mb-4">Column 1 should be phone/mobile. Other columns = template variables.</p>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files[0])}
                className="text-sm" data-testid="campaign-file-input" />
            </div>
            {file && (
              <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-green-600" />
                <span className="text-sm text-green-800">{file.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={doUpload} disabled={!file || uploading} className="bg-[#0B1C3D] text-white">
                {uploading ? "Uploading..." : "Upload & Detect Columns →"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Map Columns to Template Variables */}
        {step === 3 && uploadResult && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-800">✓ {uploadResult.total} contacts loaded</p>
              <p className="text-xs text-blue-600">Phone column: <strong>{uploadResult.phone_column}</strong> • Data columns: {uploadResult.headers?.join(", ") || "none"}</p>
            </div>

            {templateVars.length > 0 ? (
              <div>
                <p className="text-sm font-semibold text-[#0B1C3D] mb-2">Map Excel Columns → Template Variables</p>
                <p className="text-xs text-gray-500 mb-3">Match each template variable to the corresponding Excel column</p>
                <div className="space-y-3">
                  {templateVars.map((v, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white rounded-lg p-3 border">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <span className="bg-[#0B1C3D] text-white text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center">{i+1}</span>
                        <span className="text-sm font-medium text-[#0B1C3D]">{v}</span>
                      </div>
                      <span className="text-gray-400">→</span>
                      <Select value={columnMapping[v] || ""} onValueChange={val => setColumnMapping(prev => ({ ...prev, [v]: val }))}>
                        <SelectTrigger className="flex-1" data-testid={`map-var-${i}`}>
                          <SelectValue placeholder="Select Excel column..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=" ">-- Not mapped --</SelectItem>
                          {(uploadResult.headers || []).map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
                This template has no variables to map.
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
              <Button onClick={() => setStep(4)} className="bg-[#0B1C3D] text-white">
                Next: Preview →
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Preview & Create */}
        {step === 4 && uploadResult && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border p-4 space-y-2 text-sm">
              <p><strong>Campaign:</strong> {name}</p>
              <p><strong>Template:</strong> {tmpl?.display_name} ({tmpl?.meta_template_name})</p>
              <p><strong>Recipients:</strong> {uploadResult.total}</p>
              {templateVars.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Variable Mapping:</p>
                  {templateVars.map((v, i) => (
                    <p key={i} className="text-xs text-gray-600 ml-2">
                      <span className="font-mono bg-gray-100 px-1 rounded">{`{{${i+1}}}`} {v}</span> → <strong>{columnMapping[v] || "—not mapped—"}</strong>
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Sample preview */}
            {uploadResult.rows.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Sample Message (Row 1):</p>
                <div className="bg-white rounded-lg p-3 border text-sm">
                  <p className="text-gray-500 text-xs mb-1">To: +{uploadResult.rows[0].phone_number}</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{(() => {
                    let text = tmpl?.body_text || "";
                    templateVars.forEach((v, i) => {
                      const col = columnMapping[v];
                      const val = col ? (uploadResult.rows[0].variables[col] || `{{${i+1}}}`) : `{{${i+1}}}`;
                      text = text.replace(`{{${i+1}}}`, val);
                    });
                    return text;
                  })()}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>← Back</Button>
              <Button onClick={createCampaign} disabled={creating} className="bg-green-600 text-white hover:bg-green-700">
                {creating ? "Creating..." : "✓ Create Campaign"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                     TRIGGERS TAB                               */
/* ═══════════════════════════════════════════════════════════════ */
function TriggersTab({ authHeaders }) {
  const [triggers, setTriggers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ trigger_type: "", template_id: "" });

  const fetchData = useCallback(async () => {
    try {
      const [trRes, tRes] = await Promise.all([
        axios.get(`${API}/admin/wa-triggers`, { headers: authHeaders() }),
        axios.get(`${API}/admin/wa-templates`, { headers: authHeaders() }),
      ]);
      setTriggers(trRes.data);
      setTemplates(tRes.data);
    } catch {}
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const TRIGGER_TYPES = [
    { id: "registration_approved", label: "Registration Approved", desc: "Sent when a registration is approved" },
    { id: "registration_rejected", label: "Registration Disapproved", desc: "Sent when a registration is disapproved" },
    { id: "room_assigned", label: "Room Assigned", desc: "Sent when a room is assigned" },
    { id: "arrival_confirmed", label: "Arrival Confirmed", desc: "Sent on arrival confirmation" },
    { id: "event_reminder", label: "Event Reminder", desc: "General event reminder" },
  ];

  const toggleTrigger = async (id, current) => {
    try {
      await axios.put(`${API}/admin/wa-triggers/${id}`, { is_active: !current }, { headers: authHeaders() });
      toast.success(`Trigger ${!current ? "enabled" : "disabled"}`);
      fetchData();
    } catch (e) { toast.error("Failed to update"); }
  };

  const createTrigger = async () => {
    if (!form.trigger_type || !form.template_id) { toast.error("Select both trigger type and template"); return; }
    try {
      await axios.post(`${API}/admin/wa-triggers`, form, { headers: authHeaders() });
      toast.success("Trigger created");
      setShowCreate(false);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const deleteTrigger = async (id) => {
    if (!window.confirm("Delete this trigger?")) return;
    try {
      await axios.delete(`${API}/admin/wa-triggers/${id}`, { headers: authHeaders() });
      toast.success("Deleted");
      fetchData();
    } catch (e) { toast.error("Failed to delete"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-[#0B1C3D]">System Message Triggers</h2>
          <p className="text-xs text-gray-500">Auto-send WhatsApp messages on registration events</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#0B1C3D] text-white" data-testid="create-trigger-btn">
          <Plus size={14} className="mr-1" /> New Trigger
        </Button>
      </div>

      {loading ? <p className="text-gray-400 text-center py-8">Loading...</p> :
        triggers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Zap size={40} className="mx-auto mb-3 opacity-30" />
            <p>No triggers configured yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {triggers.map(tr => {
              const ttype = TRIGGER_TYPES.find(t => t.id === tr.trigger_type);
              return (
                <div key={tr.id} className="bg-white rounded-xl p-4 border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => toggleTrigger(tr.id, tr.is_active)}
                      className={`${tr.is_active ? "text-green-500" : "text-gray-300"}`} data-testid={`toggle-${tr.id}`}>
                      {tr.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                    <div>
                      <p className="font-medium text-[#0B1C3D] text-sm">{ttype?.label || tr.trigger_type}</p>
                      <p className="text-xs text-gray-500">{ttype?.desc || ""} • Template: {tr.template_name}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteTrigger(tr.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )
      }

      {/* Create Trigger Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-[#0B1C3D]">Create System Trigger</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Event Type</Label>
              <Select value={form.trigger_type} onValueChange={v => setForm(p => ({ ...p, trigger_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select event..." /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>WhatsApp Template</Label>
              <Select value={form.template_id} onValueChange={v => setForm(p => ({ ...p, template_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select template..." /></SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.status === "approved").map(t => <SelectItem key={t.id} value={t.id}>{t.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createTrigger} className="w-full bg-[#0B1C3D] text-white">Create Trigger</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                     TEMPLATES TAB                              */
/* ═══════════════════════════════════════════════════════════════ */
function TemplatesTab({ authHeaders }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTmpl, setEditTmpl] = useState(null);
  const [form, setForm] = useState({
    display_name: "", meta_template_name: "", language: "en",
    category: "UTILITY", body_text: "", variable_labels: [],
    header_type: "", header_media_url: "",
  });
  const [varInput, setVarInput] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/wa-templates`, { headers: authHeaders() });
      setTemplates(data);
    } catch {}
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({ display_name: "", meta_template_name: "", language: "en", category: "UTILITY", body_text: "", variable_labels: [], header_type: "", header_media_url: "" });
    setVarInput("");
  };

  const openEdit = (t) => {
    setEditTmpl(t);
    setForm({
      display_name: t.display_name, meta_template_name: t.meta_template_name, language: t.language,
      category: t.category || "UTILITY", body_text: t.body_text || "", variable_labels: t.variable_labels || [],
      header_type: t.header_type || "", header_media_url: t.header_media_url || "",
    });
    setShowCreate(true);
  };

  const addVar = () => {
    if (!varInput.trim()) return;
    setForm(p => ({ ...p, variable_labels: [...p.variable_labels, varInput.trim()] }));
    setVarInput("");
  };

  const removeVar = (idx) => {
    setForm(p => ({ ...p, variable_labels: p.variable_labels.filter((_, i) => i !== idx) }));
  };

  const saveTemplate = async () => {
    if (!form.display_name.trim() || !form.meta_template_name.trim()) {
      toast.error("Template name and Meta template name are required"); return;
    }
    try {
      if (editTmpl) {
        await axios.put(`${API}/admin/wa-templates/${editTmpl.id}`, {
          display_name: form.display_name,
          language: form.language,
          category: form.category,
          body_text: form.body_text,
          variable_labels: form.variable_labels,
          header_type: form.header_type || null,
          header_media_url: form.header_media_url || "",
        }, { headers: authHeaders() });
        toast.success("Template updated");
      } else {
        await axios.post(`${API}/admin/wa-templates`, form, { headers: authHeaders() });
        toast.success("Template created");
      }
      setShowCreate(false);
      setEditTmpl(null);
      resetForm();
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await axios.delete(`${API}/admin/wa-templates/${id}`, { headers: authHeaders() });
      toast.success("Deleted");
      fetchData();
    } catch (e) { toast.error("Failed"); }
  };

  const toggleActive = async (t) => {
    const newStatus = t.status === "approved" ? "disabled" : "approved";
    try {
      await axios.put(`${API}/admin/wa-templates/${t.id}`, { status: newStatus }, { headers: authHeaders() });
      toast.success(`Template ${newStatus === "approved" ? "enabled" : "disabled"}`);
      fetchData();
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-[#0B1C3D]">WhatsApp Template Registry</h2>
          <p className="text-xs text-gray-500">Register your Meta-approved WhatsApp templates with variable labels for campaign mapping</p>
        </div>
        <Button onClick={() => { resetForm(); setEditTmpl(null); setShowCreate(true); }} className="bg-[#0B1C3D] text-white" data-testid="create-template-btn">
          <Plus size={14} className="mr-1" /> New Template
        </Button>
      </div>

      {loading ? <p className="text-gray-400 text-center py-8">Loading...</p> :
        templates.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>No templates registered. Add your first WhatsApp template.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="bg-white rounded-xl p-4 border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={() => toggleActive(t)} className={t.status === "approved" ? "text-green-500" : "text-gray-300"}>
                        {t.status === "approved" ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                      <p className="font-semibold text-[#0B1C3D] text-sm">{t.display_name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{t.language}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.category === "AUTHENTICATION" ? "bg-red-50 text-red-600" : t.category === "MARKETING" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                        {t.category || "UTILITY"}
                      </span>
                      {t.status !== "approved" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">DISABLED</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 ml-8">Meta name: <code className="bg-gray-100 px-1 rounded">{t.meta_template_name}</code></p>
                    {t.header_type && (
                      <div className="ml-8 mt-1 flex items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                          t.header_type === "document" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                          t.header_type === "image" ? "bg-teal-50 text-teal-700 border border-teal-200" :
                          t.header_type === "video" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                          "bg-gray-50 text-gray-600"}`}>
                          {t.header_type === "document" ? "📄" : t.header_type === "image" ? "🖼" : t.header_type === "video" ? "🎥" : "📎"}
                          {t.header_type.charAt(0).toUpperCase() + t.header_type.slice(1)} Header
                        </span>
                        {t.header_media_url && (
                          <a href={t.header_media_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline truncate max-w-[200px]">
                            {t.header_media_url.split("/").pop() || "View media"}
                          </a>
                        )}
                      </div>
                    )}
                    {t.body_text && <p className="text-xs text-gray-600 ml-8 mt-1 line-clamp-2">{t.body_text}</p>}
                    {t.variable_labels?.length > 0 && (
                      <div className="ml-8 mt-1.5 flex flex-wrap gap-1">
                        {t.variable_labels.map((v, i) => (
                          <span key={i} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
                            {`{{${i+1}}} ${v}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(t)} className="text-blue-500 hover:text-blue-700 p-1"><Edit2 size={14} /></button>
                    <button onClick={() => deleteTemplate(t.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {/* Create/Edit Template Dialog */}
      <Dialog open={showCreate} onOpenChange={() => { setShowCreate(false); setEditTmpl(null); resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0B1C3D]">{editTmpl ? "Edit Template" : "Register WhatsApp Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Display Name <span className="text-red-500">*</span></Label>
              <Input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                placeholder="e.g. Event Invitation" className="mt-1" />
            </div>
            <div>
              <Label>Meta Template Name <span className="text-red-500">*</span></Label>
              <Input value={form.meta_template_name} onChange={e => setForm(p => ({ ...p, meta_template_name: e.target.value }))}
                placeholder="e.g. event_invitation_v1 (exact name from Meta Business)" className="mt-1" />
              <p className="text-[10px] text-gray-400 mt-1">Must match exactly with the template name on Meta Business Manager</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Language</Label>
                <Select value={form.language} onValueChange={v => setForm(p => ({ ...p, language: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utility">Utility</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Body Text (preview)</Label>
              <Textarea value={form.body_text} onChange={e => setForm(p => ({ ...p, body_text: e.target.value }))}
                placeholder="Hello {{1}}, your event is on {{2}}..." className="mt-1" rows={3} />
              <p className="text-[10px] text-gray-400 mt-1">Use {"{{1}}"}, {"{{2}}"}, etc. for variable placeholders</p>
            </div>
            <div>
              <Label className="flex items-center gap-1">
                Variable Labels
                <span className="text-[10px] text-gray-400 font-normal">(define what each {"{{n}}"} means)</span>
              </Label>
              <div className="flex gap-2 mt-1">
                <Input value={varInput} onChange={e => setVarInput(e.target.value)} placeholder="e.g. guest_name"
                  onKeyDown={e => e.key === "Enter" && addVar()} className="flex-1" />
                <Button onClick={addVar} variant="outline" size="sm">Add</Button>
              </div>
              {form.variable_labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.variable_labels.map((v, i) => (
                    <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="font-bold">{`{{${i+1}}}`}</span> {v}
                      <button onClick={() => removeVar(i)} className="text-blue-400 hover:text-red-500"><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1">These labels are used to map Excel columns during campaign creation. Order matters!</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border">
              <Label className="text-sm font-semibold">Header Media (optional)</Label>
              <p className="text-[10px] text-gray-400 mb-2">If this template has a document, image, or video header on Meta, configure it here.</p>
              <Select value={form.header_type || "none"} onValueChange={v => setForm(p => ({ ...p, header_type: v === "none" ? "" : v }))}>
                <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No header media</SelectItem>
                  <SelectItem value="document">📄 Document (PDF, etc.)</SelectItem>
                  <SelectItem value="image">🖼 Image</SelectItem>
                  <SelectItem value="video">🎥 Video</SelectItem>
                </SelectContent>
              </Select>
              {form.header_type && (
                <div className="mt-2">
                  <Label className="text-xs">
                    {form.header_type === "document" ? "Document URL (publicly accessible PDF/file link)" :
                     form.header_type === "image" ? "Image URL (publicly accessible image link)" :
                     "Video URL (publicly accessible video link)"}
                  </Label>
                  <Input value={form.header_media_url} onChange={e => setForm(p => ({ ...p, header_media_url: e.target.value }))}
                    placeholder={form.header_type === "document" ? "https://example.com/document.pdf" :
                      form.header_type === "image" ? "https://example.com/image.jpg" : "https://example.com/video.mp4"}
                    className="mt-1 bg-white" />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {form.header_type === "document"
                      ? "This URL will be sent as the document attachment when the template is used in campaigns. Make sure the URL is publicly accessible."
                      : "This URL will be sent as the media header. Must be a publicly accessible direct link."}
                  </p>
                  {form.header_media_url && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] text-green-600 font-medium">✓ Media URL configured</span>
                      <a href={form.header_media_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">Preview ↗</a>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button onClick={saveTemplate} className="w-full bg-[#0B1C3D] text-white">
              {editTmpl ? "Update Template" : "Register Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════ */
/*                     OTP LOGS TAB                               */
/* ═══════════════════════════════════════════════════════════════ */
function OTPLogsTab({ authHeaders }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/otp-logs`, {
        params: { search, page, per_page: 30 }, headers: authHeaders()
      });
      setLogs(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch {}
    finally { setLoading(false); }
  }, [search, page, authHeaders]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const formatDt = (iso) => iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

  return (
    <div className="space-y-4" data-testid="otp-logs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="font-semibold text-[#0B1C3D]">OTP Verification Logs</h2>
          <p className="text-xs text-gray-500">Track all OTP requests sent via WhatsApp • Total: {total}</p>
        </div>
        <button onClick={fetchLogs} className="text-sm text-gray-500 flex items-center gap-1 hover:text-[#0B1C3D]">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by mobile number..."
          className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1C3D]/20" />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase">
          <div className="col-span-3">Mobile</div>
          <div className="col-span-3">Guest Name</div>
          <div className="col-span-2">OTP</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Time</div>
        </div>
        <div className="divide-y max-h-[500px] overflow-y-auto">
          {loading ? <p className="text-gray-400 text-center py-8 text-sm">Loading...</p> :
            logs.length === 0 ? <p className="text-gray-400 text-center py-8 text-sm">No OTP logs found</p> :
            logs.map((log, i) => (
              <div key={log.mobile + i} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-gray-50 items-center">
                <div className="col-span-3 font-medium text-[#0B1C3D]">{log.mobile?.replace(/^\++/, "+")}</div>
                <div className="col-span-3 text-gray-700 truncate">{log.guest_name || <span className="text-gray-300 italic">Not registered</span>}</div>
                <div className="col-span-2">
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{log.otp}</code>
                </div>
                <div className="col-span-2">
                  {log.verified ? (
                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">VERIFIED</span>
                  ) : (
                    <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">PENDING</span>
                  )}
                </div>
                <div className="col-span-2 text-xs text-gray-500">{formatDt(log.created_at)}</div>
              </div>
            ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t bg-gray-50">
            <p className="text-[10px] text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1 text-xs rounded bg-white border hover:bg-gray-50 disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1 text-xs rounded bg-white border hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                    WHATSAPP FLOWS TAB                          */
/* ═══════════════════════════════════════════════════════════════ */
function FlowsTab({ authHeaders }) {
  const [flows, setFlows] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [editFlow, setEditFlow] = useState(null);
  const [form, setForm] = useState({
    flow_name: "", flow_id: "", flow_token: "", description: "",
    trigger_keywords: "",
  });

  const ENDPOINT_URL = `${process.env.REACT_APP_BACKEND_URL}/api/webhooks/wa-flow`;

  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/wa-flows`, { headers: authHeaders() });
      setFlows(data || []);
    } catch {}
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
    } catch {}
  };

  const toggleFlow = async (f) => {
    try {
      await axios.put(`${API}/admin/wa-flows/${f.id}`, { is_active: !f.is_active }, { headers: authHeaders() });
      fetchData();
    } catch {}
  };

  const copyEndpoint = () => {
    navigator.clipboard.writeText(ENDPOINT_URL);
    toast.success("Endpoint URL copied to clipboard!");
  };

  return (
    <div className="space-y-4" data-testid="wa-flows">
      {/* Endpoint Info Card */}
      <div className="bg-gradient-to-r from-[#0B1C3D] to-[#1a3a6b] rounded-xl p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2"><GitBranch size={18} /> WhatsApp Flows</h2>
            <p className="text-white/70 text-xs mt-1">Configure WhatsApp Flow Builder data exchange. Use the endpoint below in Meta's Flow Builder.</p>
          </div>
          <button onClick={fetchEvents} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
            <Eye size={12} /> View Events
          </button>
        </div>
        <div className="mt-4 bg-white/10 rounded-lg p-3">
          <p className="text-[10px] text-white/60 uppercase font-bold mb-1">Data Exchange Endpoint (paste in Meta Flow Builder)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono bg-black/20 rounded px-3 py-2 truncate select-all">{ENDPOINT_URL}</code>
            <button onClick={copyEndpoint} className="bg-[#D4AF37] text-[#0B1C3D] px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#D4AF37]/90 whitespace-nowrap">
              Copy URL
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-white/70">
          <div className="bg-white/5 rounded-lg p-2.5">
            <p className="font-bold text-white/90 mb-0.5">Step 1</p>
            <p>Create a Flow in Meta Business Manager → WhatsApp → Flows</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2.5">
            <p className="font-bold text-white/90 mb-0.5">Step 2</p>
            <p>Set the Data Exchange URL to the endpoint above</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2.5">
            <p className="font-bold text-white/90 mb-0.5">Step 3</p>
            <p>Register the flow config here to handle screen data</p>
          </div>
        </div>
      </div>

      {/* Flow Configurations */}
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-[#0B1C3D]">Flow Configurations ({flows.length})</p>
        <Button onClick={() => { resetForm(); setEditFlow(null); setShowCreate(true); }} className="bg-[#0B1C3D] text-white" size="sm">
          <Plus size={13} className="mr-1" /> Add Flow
        </Button>
      </div>

      {loading ? <p className="text-gray-400 text-center py-8">Loading...</p> :
        flows.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-xl border p-6">
            <GitBranch size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No flow configurations yet</p>
            <p className="text-xs mt-1">Create your first flow to handle WhatsApp Flow Builder interactions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {flows.map(f => (
              <div key={f.id} className="bg-white rounded-xl p-4 border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => toggleFlow(f)} className={f.is_active ? "text-green-500" : "text-gray-300"}>
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
                      className="text-blue-500 hover:text-blue-700 p-1"><Edit2 size={14} /></button>
                    <button onClick={() => deleteFlow(f.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
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
                placeholder="e.g. Registration Flow" className="mt-1" />
            </div>
            <div>
              <Label>Meta Flow ID</Label>
              <Input value={form.flow_id} onChange={e => setForm(p => ({ ...p, flow_id: e.target.value }))}
                placeholder="From Meta Business Manager" className="mt-1" />
              <p className="text-[10px] text-gray-400 mt-1">Found in Meta → WhatsApp → Flows → Flow Details</p>
            </div>
            <div>
              <Label>Flow Token</Label>
              <Input value={form.flow_token} onChange={e => setForm(p => ({ ...p, flow_token: e.target.value }))}
                placeholder="Unique token for this flow" className="mt-1" />
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
                placeholder="e.g. register, book, help" className="mt-1" />
              <p className="text-[10px] text-gray-400 mt-1">When users send these keywords, this flow can be triggered</p>
            </div>
            <Button onClick={saveFlow} className="w-full bg-[#0B1C3D] text-white">
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
