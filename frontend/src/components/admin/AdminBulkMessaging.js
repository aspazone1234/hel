import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Users, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminBulkMessaging({ user, authHeaders }) {
  const [guests, setGuests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [sent, setSent] = useState(false);

  const fetchGuests = useCallback(async () => {
    try {
      const params = { status: "approved", per_page: 500 };
      if (filter !== "all") params.arrival_status = filter;
      const { data } = await axios.get(`${API}/admin/registrations`, { headers: authHeaders(), params });
      setGuests(data.data || []);
    } catch {}
  }, [authHeaders, filter]);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === filtered.length ? [] : filtered.map(g => g.id));

  const filtered = guests.filter(g => {
    const q = search.toLowerCase();
    return g.full_name?.toLowerCase().includes(q) || g.mobile?.includes(q);
  });

  const handleSend = () => {
    if (selected.length === 0) return toast.error("Select at least one guest");
    if (!message.trim()) return toast.error("Message cannot be empty");
    setSent(true);
    toast.success(`Message prepared for ${selected.length} guests. Integration pending.`);
  };

  return (
    <div className="space-y-6" data-testid="bulk-messaging-view">
      <div>
        <h2 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Bulk Guest Messaging</h2>
        <p className="text-sm text-[#0B1C3D]/50">Send notifications to your guests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Selection */}
        <div className="bg-white rounded-2xl border border-[#D4AF37]/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#0B1C3D] text-sm flex items-center gap-2">
              <Users size={16} className="text-[#D4AF37]" /> Select Recipients
            </h3>
            <span className="text-xs text-[#0B1C3D]/50">{selected.length} selected</span>
          </div>
          <div className="flex gap-2">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guests..." className="flex-1 h-8 text-sm" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Not Arrived">Not Arrived</SelectItem>
                <SelectItem value="Arrived">Arrived</SelectItem>
                <SelectItem value="Not Coming">Not Coming</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
            <span className="text-[#0B1C3D]/60">Select All ({filtered.length})</span>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filtered.map(g => (
              <label key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#F8F1E5]/50 cursor-pointer text-sm">
                <Checkbox checked={selected.includes(g.id)} onCheckedChange={() => toggleSelect(g.id)} />
                <span className="font-medium text-[#0B1C3D]">{g.full_name}</span>
                <span className="text-[#0B1C3D]/40 text-xs">{g.mobile}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Message Compose */}
        <div className="bg-white rounded-2xl border border-[#D4AF37]/20 p-5 space-y-4">
          <h3 className="font-semibold text-[#0B1C3D] text-sm flex items-center gap-2">
            <MessageSquare size={16} className="text-[#D4AF37]" /> Compose Message
          </h3>
          {sent ? (
            <div className="text-center py-10 space-y-3">
              <CheckCircle size={48} className="text-green-500 mx-auto" />
              <p className="font-semibold text-green-700">Message Prepared!</p>
              <p className="text-sm text-[#0B1C3D]/50">Message is ready for {selected.length} recipients.<br />SMS/WhatsApp integration coming soon.</p>
              <Button onClick={() => { setSent(false); setMessage(""); setSubject(""); setSelected([]); }} variant="outline" className="text-xs">Compose Another</Button>
            </div>
          ) : (
            <>
              <div>
                <Label className="text-xs">Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Message subject" className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Message</Label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full mt-1 rounded-lg border border-[#D4AF37]/20 p-3 text-sm min-h-[200px]" placeholder="Type your message here..." />
              </div>
              <p className="text-xs text-[#0B1C3D]/40">Supported channels will include SMS and WhatsApp notifications.</p>
              <Button onClick={handleSend} disabled={selected.length === 0 || !message.trim()} className="w-full bg-[#D4AF37] text-[#0B1C3D]" data-testid="send-message-btn">
                <Send size={14} className="mr-2" /> Send to {selected.length} Guest{selected.length !== 1 ? "s" : ""}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
