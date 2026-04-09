import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Lock, Calendar, Users, MapPin, Phone, Mail, Clock } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useLang } from "../context/LanguageContext";

const API = process.env.REACT_APP_BACKEND_URL;
const CUTOFF_DATE = "2026-05-19";

export default function MyRegistrationPage() {
  const { lang } = useLang();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mobile = params.get("mobile") || "";
  const [reg, setReg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isPastCutoff = new Date().toISOString().slice(0, 10) > CUTOFF_DATE;
  const fontHi = "'Tiro Devanagari Hindi', serif";

  useEffect(() => {
    if (!mobile) { setError("No mobile number provided"); setLoading(false); return; }
    const fetchReg = async () => {
      try {
        const { data } = await axios.get(`${API}/api/registration/by-mobile/${encodeURIComponent(mobile)}`);
        setReg(data);
      } catch {
        setError("Registration not found");
      }
      setLoading(false);
    };
    fetchReg();
  }, [mobile]);

  const handleEdit = () => {
    if (isPastCutoff) {
      toast.error(lang === "hi" ? "फॉर्म 19 मई 2026 के बाद लॉक हो गया है" : "Form is locked after May 19, 2026");
      return;
    }
    navigate(`/register?mobile=${encodeURIComponent(mobile)}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F1E5]"><p className="text-[#0B1C3D]/50">Loading...</p></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F1E5] px-4">
      <div className="text-center">
        <p className="text-[#0B1C3D]/60 mb-4">{error}</p>
        <Link to="/" className="text-[#D4AF37] underline text-sm">Back to Home</Link>
      </div>
    </div>
  );

  const head = (reg.attendees || []).find(a => a.id === reg.group_head_id);
  const addr = reg.address || {};

  return (
    <div className="min-h-screen bg-[#F8F1E5] px-4 py-8" data-testid="my-registration-page">
      <div className="max-w-lg mx-auto">
        <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1 mb-6">
          <ArrowLeft size={16} /> {lang === "hi" ? "मुख्य पृष्ठ" : "Back to Home"}
        </Link>

        <div className="bg-white rounded-2xl border border-[#D4AF37]/20 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0B1C3D] to-[#1a3a6b] p-6 text-white">
            <h1 className="text-xl font-bold" style={{ fontFamily: lang === "hi" ? fontHi : "'Cormorant Garamond', serif" }}>
              {lang === "hi" ? "मेरा पंजीकरण" : "My Registration"}
            </h1>
            <p className="text-white/60 text-sm mt-1">{head?.name || reg.primary_mobile}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                reg.approval_status === "approved" ? "bg-green-500/20 text-green-300" :
                reg.approval_status === "rejected" ? "bg-red-500/20 text-red-300" :
                "bg-amber-500/20 text-amber-300"
              }`}>{reg.approval_status}</span>
            </div>
          </div>

          {/* Cutoff Warning / Edit */}
          <div className={`px-6 py-3 ${isPastCutoff ? "bg-red-50 border-b border-red-100" : "bg-blue-50 border-b border-blue-100"}`}>
            {isPastCutoff ? (
              <div className="flex items-center gap-2 text-red-600 text-sm" data-testid="cutoff-locked">
                <Lock size={14} />
                <span>{lang === "hi" ? "फॉर्म 19 मई 2026 को लॉक हो गया है। बदलाव के लिए एडमिन से संपर्क करें।" : "Form locked since May 19, 2026. Contact admin for changes."}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-blue-700 text-sm flex items-center gap-1">
                  <Calendar size={14} />
                  {lang === "hi" ? "19 मई 2026 तक संपादन योग्य" : "Editable until May 19, 2026"}
                </p>
                <button onClick={handleEdit} data-testid="edit-registration-btn"
                  className="bg-[#0B1C3D] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-[#163161] transition">
                  <Edit size={12} /> {lang === "hi" ? "संपादित करें" : "Edit"}
                </button>
              </div>
            )}
          </div>

          {/* Registration Details */}
          <div className="p-6 space-y-5" data-testid="reg-details">
            {/* Contact Info */}
            <Section title={lang === "hi" ? "संपर्क जानकारी" : "Contact Information"} icon={Phone}>
              <Field label={lang === "hi" ? "प्राथमिक WhatsApp" : "Primary WhatsApp"} value={reg.primary_mobile} />
              <Field label={lang === "hi" ? "अतिरिक्त फोन" : "Additional Phone"} value={reg.additional_phone} />
              {reg.email && <Field label="Email" value={reg.email} />}
              <Field label={lang === "hi" ? "संवाद भाषा" : "Language"} value={reg.preferred_language === "hi" ? "Hindi" : "English"} />
            </Section>

            {/* Address */}
            <Section title={lang === "hi" ? "पता" : "Address"} icon={MapPin}>
              <p className="text-sm text-[#0B1C3D]">
                {addr.full_address}{addr.city ? `, ${addr.city}` : ""}{addr.state ? `, ${addr.state}` : ""}{addr.country ? `, ${addr.country}` : ""}
              </p>
            </Section>

            {/* Attendees */}
            <Section title={`${lang === "hi" ? "सदस्य" : "Attendees"} (${reg.num_people})`} icon={Users}>
              {(reg.attendees || []).map((a, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-[#0B1C3D]">{a.name}</p>
                    {a.id === reg.group_head_id && <span className="text-xs bg-[#D4AF37]/20 text-[#B8860B] px-1.5 py-0.5 rounded">{lang === "hi" ? "मुखिया" : "Head"}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {lang === "hi" ? "उम्र" : "Age"}: {a.age || "—"}{a.special_needs ? ` • ${a.special_needs}` : ""}
                  </p>
                </div>
              ))}
              {reg.family_special_request && (
                <div className="bg-amber-50 rounded-lg p-3 mt-2">
                  <p className="text-xs text-amber-800"><strong>{lang === "hi" ? "विशेष अनुरोध:" : "Special Request:"}</strong> {reg.family_special_request}</p>
                </div>
              )}
            </Section>

            {/* Attendance & Travel */}
            <Section title={lang === "hi" ? "उपस्थिति एवं यात्रा" : "Attendance & Travel"} icon={Calendar}>
              <Field label={lang === "hi" ? "उपस्थिति" : "Intent"} value={reg.attendance_intent} />
              <Field label={lang === "hi" ? "चयनित दिन" : "Days"} value={(reg.selected_days || []).join(", ")} />
              <Field label={lang === "hi" ? "आगमन समय" : "Arrival Time"} value={reg.expected_arrival_time} />
              <Field label={lang === "hi" ? "प्रस्थान समय" : "Departure Time"} value={reg.expected_departure_time} />
              {reg.travel_mode && <Field label={lang === "hi" ? "यात्रा माध्यम" : "Travel Mode"} value={reg.travel_mode} />}
              {reg.travel_details && <Field label={lang === "hi" ? "यात्रा विवरण" : "Travel Details"} value={reg.travel_details} />}
            </Section>

            {/* Reference */}
            <Section title={lang === "hi" ? "संदर्भ" : "Reference"} icon={Users}>
              <Field label={lang === "hi" ? "संदर्भ व्यक्ति" : "Reference Person"} value={reg.reference_person_name || reg.reference_person_id || "—"} />
              <Field label={lang === "hi" ? "सम्बन्ध" : "Relation"} value={reg.relation_category} />
              {reg.message && <Field label={lang === "hi" ? "संदेश" : "Message"} value={reg.message} />}
            </Section>

            {/* Room / QR (if assigned) */}
            {(reg.room_assignments?.length > 0 || reg.assigned_swamsevak) && (
              <Section title={lang === "hi" ? "आवंटन" : "Allocation"} icon={Clock}>
                {reg.room_assignments?.length > 0 && <Field label={lang === "hi" ? "कमरा" : "Room"} value={reg.room_assignments.join(", ")} />}
                {reg.assigned_swamsevak && <Field label={lang === "hi" ? "संपर्क व्यक्ति" : "Contact Person"} value={reg.assigned_swamsevak} />}
              </Section>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t text-center">
            <p className="text-xs text-gray-400">
              {lang === "hi" ? "रजिस्ट्रेशन ID:" : "Registration ID:"} {reg.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <h3 className="font-semibold text-[#0B1C3D] text-sm mb-2 flex items-center gap-2 border-b pb-2">
        <Icon size={14} className="text-[#D4AF37]" /> {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-[#0B1C3D] font-medium text-right">{value}</span>
    </div>
  );
}
