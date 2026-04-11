import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Edit, Lock, Calendar, Users, MapPin, Phone, Mail, Clock, ChevronDown, ChevronUp, Globe, Check, Download, QrCode, X, User, Plane } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useLang } from "../context/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";

const API = process.env.REACT_APP_BACKEND_URL;
const CUTOFF_DATE = "2026-05-19";
const ADMIN_CONTACT = "+91 7048850050";

const STAY_DATES = [
  { date: "2026-05-27", label_en: "27 May (Tue)", label_hi: "27 \u092E\u0908 (\u092E\u0902\u0917\u0932)" },
  { date: "2026-05-28", label_en: "28 May (Wed)", label_hi: "28 \u092E\u0908 (\u092C\u0941\u0927)" },
  { date: "2026-05-29", label_en: "29 May (Thu)", label_hi: "29 \u092E\u0908 (\u0917\u0941\u0930\u0941)" },
  { date: "2026-05-30", label_en: "30 May (Fri)", label_hi: "30 \u092E\u0908 (\u0936\u0941\u0915\u094D\u0930)" },
  { date: "2026-05-31", label_en: "31 May (Sat)", label_hi: "31 \u092E\u0908 (\u0936\u0928\u093F)" },
  { date: "2026-06-01", label_en: "1 Jun (Sun)", label_hi: "1 \u091C\u0942\u0928 (\u0930\u0935\u093F)" },
  { date: "2026-06-02", label_en: "2 Jun (Mon)", label_hi: "2 \u091C\u0942\u0928 (\u0938\u094B\u092E)" },
  { date: "2026-06-03", label_en: "3 Jun (Tue)", label_hi: "3 \u091C\u0942\u0928 (\u092E\u0902\u0917\u0932)" },
  { date: "2026-06-04", label_en: "4 Jun (Wed)", label_hi: "4 \u091C\u0942\u0928 (\u092C\u0941\u0927)" },
];

const TIME_OPTIONS = [
  "Early Morning (5-8 AM)", "Morning (8-11 AM)", "Afternoon (11 AM-2 PM)",
  "Afternoon (2-5 PM)", "Evening (5-8 PM)", "Night (8-11 PM)", "Late Night (11 PM+)"
];

export default function MyRegistrationPage() {
  const { lang, toggleLang } = useLang();
  const [params] = useSearchParams();
  const mobile = params.get("mobile") || "";
  const [reg, setReg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedSections, setExpandedSections] = useState({});
  const [editModal, setEditModal] = useState(null);
  const [refPersons, setRefPersons] = useState([]);
  const [relationCats, setRelationCats] = useState([]);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const isPastCutoff = new Date().toISOString().slice(0, 10) > CUTOFF_DATE;
  const fontHi = "'Tiro Devanagari Hindi', serif";

  const isConfirmed = reg?.approval_status === "approved" &&
    (reg?.room_assignments?.length > 0) &&
    reg?.qr_image_b64 &&
    reg?.assigned_swamsevak;

  const fetchReg = useCallback(async () => {
    if (!mobile) { setError("No mobile number provided"); setLoading(false); return; }
    try {
      const { data } = await axios.get(`${API}/api/registration/by-mobile/${encodeURIComponent(mobile)}`);
      setReg(data);
    } catch {
      setError(lang === "hi" ? "\u092A\u0902\u091C\u0940\u0915\u0930\u0923 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E" : "Registration not found");
    }
    setLoading(false);
  }, [mobile, lang]);

  useEffect(() => { fetchReg(); }, [fetchReg]);

  useEffect(() => {
    axios.get(`${API}/api/reference-persons/public`).then(r => setRefPersons(r.data)).catch(() => {});
    axios.get(`${API}/api/relation-categories/public`).then(r => setRelationCats(r.data)).catch(() => {});
    // Check if user just submitted
    const fromSubmit = sessionStorage.getItem("just_submitted");
    if (fromSubmit === mobile) {
      setJustSubmitted(true);
      sessionStorage.removeItem("just_submitted");
    }
  }, [mobile]);

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveSection = async (sectionData) => {
    if (!reg?.id) return;
    try {
      await axios.put(`${API}/api/registrations/${reg.id}/public`, sectionData);
      toast.success(lang === "hi" ? "\u0905\u092A\u0921\u0947\u091F \u0938\u092B\u0932!" : "Updated successfully!");
      setEditModal(null);
      fetchReg();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    }
  };

  const downloadQR = () => {
    if (!reg?.qr_image_b64) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${reg.qr_image_b64}`;
    link.download = `QR_${reg.primary_mobile}.png`;
    link.click();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F1E5]"><p className="text-[#0B1C3D]/50">Loading...</p></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F1E5] px-4">
      <div className="text-center">
        <p className="text-[#0B1C3D]/60 mb-4" data-testid="reg-error">{error}</p>
        <Link to="/" className="text-[#D4AF37] underline text-sm">Back to Home</Link>
      </div>
    </div>
  );

  const head = (reg.attendees || []).find(a => a.id === reg.group_head_id);
  const canEdit = !isPastCutoff && !isConfirmed;

  return (
    <div className="min-h-screen bg-[#F8F1E5] px-4 py-6" data-testid="my-registration-page">
      <div className="max-w-lg mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-5">
          <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1" data-testid="back-home-link">
            <ArrowLeft size={16} /> {lang === "hi" ? "\u092E\u0941\u0916\u094D\u092F \u092A\u0943\u0937\u094D\u0920" : "Home"}
          </Link>
          <button onClick={toggleLang} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0B1C3D]/5 hover:bg-[#0B1C3D]/10 text-[#0B1C3D]/70 text-sm" data-testid="portal-lang-toggle">
            <Globe size={14} /> {lang === "hi" ? "EN" : "\u0939\u093F\u0902"}
          </button>
        </div>

        {/* Success Banner (shown after fresh submission) */}
        {justSubmitted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-start gap-3" data-testid="success-banner">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Check size={16} />
            </div>
            <div>
              <p className="font-semibold text-green-800 text-sm">{lang === "hi" ? "\u092A\u0902\u091C\u0940\u0915\u0930\u0923 \u0938\u092B\u0932!" : "Registration Submitted!"}</p>
              <p className="text-green-700 text-xs mt-0.5">{lang === "hi" ? "\u0906\u092A\u0915\u093E \u092B\u0949\u0930\u094D\u092E \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0939\u094B \u0917\u092F\u093E \u0939\u0948\u0964" : "Your form has been received successfully."}</p>
            </div>
          </div>
        )}

        {/* Two Prominent Notices */}
        {!isConfirmed && (
          <div className="space-y-3 mb-4" data-testid="portal-notices">
            {/* Notice 1: Editable until 19 May */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg shadow-blue-600/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                  <Calendar size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm">{lang === "hi" ? "\u092B\u0949\u0930\u094D\u092E \u0914\u0930 \u092C\u0926\u0932\u093E\u0935 19 \u092E\u0908 2026 \u0924\u0915" : "Changes Open Until 19 May 2026"}</p>
                  <p className="text-white/80 text-xs mt-1 leading-relaxed">{lang === "hi"
                    ? "\u0906\u092A \u0905\u092A\u0928\u093E \u092B\u0949\u0930\u094D\u092E \u0914\u0930 \u0909\u092A\u0938\u094D\u0925\u093F\u0924\u093F \u0915\u093E \u0935\u093F\u0935\u0930\u0923 19 \u092E\u0908 2026 \u0924\u0915 \u0905\u092A\u0921\u0947\u091F \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964 \u0909\u0938\u0915\u0947 \u092C\u093E\u0926 \u0915\u094B\u0908 \u092C\u0926\u0932\u093E\u0935 \u0938\u0902\u092D\u0935 \u0928\u0939\u0940\u0902 \u0939\u094B\u0917\u093E\u0964"
                    : "You can submit your form and update your attendance details until 19 May 2026. After this date, no further changes will be accepted."}</p>
                </div>
              </div>
            </div>
            {/* Notice 2: Final list on 21 May */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 text-white shadow-lg shadow-emerald-600/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                  <Check size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm">{lang === "hi" ? "\u0905\u0902\u0924\u093F\u092E \u0938\u0942\u091A\u0940 21 \u092E\u0908 2026 \u0915\u094B" : "Final Guest List on 21 May 2026"}</p>
                  <p className="text-white/80 text-xs mt-1 leading-relaxed">{lang === "hi"
                    ? "\u0905\u0902\u0924\u093F\u092E \u0905\u0924\u093F\u0925\u093F \u0938\u0942\u091A\u0940 \u0914\u0930 \u0915\u092E\u0930\u0947 \u0915\u093E \u0935\u093F\u0935\u0930\u0923 21 \u092E\u0908 2026 \u0915\u094B \u0906\u092A\u0915\u0947 \u092A\u0902\u091C\u0940\u0915\u0943\u0924 WhatsApp \u0928\u0902\u092C\u0930 \u092A\u0930 \u092D\u0947\u091C\u093E \u091C\u093E\u090F\u0917\u093E\u0964"
                    : "The final guest list and room allocation will be released on 21 May 2026. You will be notified on your registered WhatsApp number."}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#D4AF37]/20 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0B1C3D] to-[#1a3a6b] p-5 text-white">
            <h1 className="text-lg font-bold" style={{ fontFamily: lang === "hi" ? fontHi : "'Cormorant Garamond', serif" }} data-testid="portal-title">
              {lang === "hi" ? "\u092E\u0947\u0930\u093E \u092A\u0902\u091C\u0940\u0915\u0930\u0923" : "My Registration"}
            </h1>
            <p className="text-white/60 text-sm mt-1">{head?.name || reg.primary_mobile}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                reg.approval_status === "approved" ? "bg-green-500/20 text-green-300" :
                reg.approval_status === "rejected" ? "bg-red-500/20 text-red-300" :
                "bg-amber-500/20 text-amber-300"
              }`} data-testid="approval-status">
                {reg.approval_status === "approved" ? (lang === "hi" ? "\u0938\u094D\u0935\u0940\u0915\u0943\u0924" : "Approved") :
                 reg.approval_status === "rejected" ? (lang === "hi" ? "\u0905\u0938\u094D\u0935\u0940\u0915\u0943\u0924" : "Disapproved") :
                 (lang === "hi" ? "\u0938\u092E\u0940\u0915\u094D\u0937\u093E \u092E\u0947\u0902" : "Pending Review")}
              </span>
              {reg.num_people > 0 && <span className="text-xs text-white/40">{reg.num_people} {lang === "hi" ? "\u0932\u094B\u0917" : "people"}</span>}
            </div>
          </div>

          {/* Confirmed State - Room + QR */}
          {isConfirmed && (
            <div className="p-5 bg-gradient-to-b from-green-50 to-white border-b border-green-100" data-testid="confirmed-section">
              <div className="flex items-center gap-2 mb-3">
                <Check size={16} className="text-green-600" />
                <h3 className="font-semibold text-green-800 text-sm">{lang === "hi" ? "\u092C\u0941\u0915\u093F\u0902\u0917 \u0915\u0928\u094D\u092B\u0930\u094D\u092E" : "Booking Confirmed"}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-gray-500 mb-1">{lang === "hi" ? "\u0915\u092E\u0930\u093E" : "Room"}</p>
                  <p className="font-bold text-[#0B1C3D]" data-testid="confirmed-room">{(reg.room_assignments || []).join(", ")}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-gray-500 mb-1">{lang === "hi" ? "\u0938\u0902\u092A\u0930\u094D\u0915 \u0935\u094D\u092F\u0915\u094D\u0924\u093F" : "Contact Person"}</p>
                  <p className="font-bold text-[#0B1C3D]" data-testid="confirmed-contact">{reg.assigned_swamsevak}</p>
                </div>
              </div>
              {reg.qr_image_b64 && (
                <div className="text-center">
                  <img src={`data:image/png;base64,${reg.qr_image_b64}`} alt="QR Code" className="w-40 h-40 mx-auto rounded-lg border-2 border-[#D4AF37]/30" data-testid="confirmed-qr" />
                  <button onClick={downloadQR} className="mt-2 text-xs text-[#D4AF37] font-medium flex items-center gap-1 mx-auto hover:underline" data-testid="download-qr-btn">
                    <Download size={12} /> {lang === "hi" ? "QR \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u0930\u0947\u0902" : "Download QR Code"}
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 text-center mt-3">
                {lang === "hi" ? `\u0938\u0939\u093E\u092F\u0924\u093E \u0915\u0947 \u0932\u093F\u090F \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902: ${ADMIN_CONTACT}` : `For assistance contact: ${ADMIN_CONTACT}`}
              </p>
            </div>
          )}

          {/* Edit Status Bar */}
          <div className={`px-5 py-3 ${isConfirmed ? "bg-green-50 border-b border-green-100" : isPastCutoff ? "bg-red-50 border-b border-red-100" : "bg-blue-50 border-b border-blue-100"}`}>
            {isConfirmed ? (
              <div className="flex items-center gap-2 text-green-700 text-sm" data-testid="confirmed-locked">
                <Lock size={14} />
                <span>{lang === "hi" ? "\u092C\u0941\u0915\u093F\u0902\u0917 \u0915\u0928\u094D\u092B\u0930\u094D\u092E \u0939\u094B \u091A\u0941\u0915\u0940 \u0939\u0948\u0964 \u092C\u0926\u0932\u093E\u0935 \u0915\u0947 \u0932\u093F\u090F \u090F\u0921\u092E\u093F\u0928 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964" : "Booking confirmed. Contact admin for changes."}</span>
              </div>
            ) : isPastCutoff ? (
              <div className="flex items-center gap-2 text-red-600 text-sm" data-testid="cutoff-locked">
                <Lock size={14} />
                <span>{lang === "hi" ? "\u092B\u0949\u0930\u094D\u092E 19 \u092E\u0908 2026 \u0915\u094B \u0932\u0949\u0915 \u0939\u094B \u0917\u092F\u093E \u0939\u0948\u0964" : "Form locked since May 19, 2026."}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-blue-700 text-sm" data-testid="editable-notice">
                <Calendar size={14} />
                <span>{lang === "hi" ? "19 \u092E\u0908 2026 \u0924\u0915 \u0938\u0902\u092A\u093E\u0926\u0928 \u092F\u094B\u0917\u094D\u092F" : "Editable until May 19, 2026"}</span>
              </div>
            )}
          </div>

          {/* Collapsible Sections */}
          <div className="divide-y divide-gray-100" data-testid="reg-sections">
            {/* Attendees Section */}
            <CollapsibleSection
              title={`${lang === "hi" ? "\u0938\u0926\u0938\u094D\u092F" : "Attendees"} (${reg.num_people})`}
              icon={Users} expanded={expandedSections.attendees}
              onToggle={() => toggleSection("attendees")}
              onEdit={canEdit ? () => setEditModal("attendees") : null}
            >
              {(reg.attendees || []).map((a, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-[#0B1C3D]">{a.name}</p>
                    {a.id === reg.group_head_id && <span className="text-xs bg-[#D4AF37]/20 text-[#B8860B] px-1.5 py-0.5 rounded">{lang === "hi" ? "\u092E\u0941\u0916\u093F\u092F\u093E" : "Head"}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{lang === "hi" ? "\u0909\u092E\u094D\u0930" : "Age"}: {a.age || "\u2014"}{a.special_needs ? ` \u2022 ${a.special_needs}` : ""}</p>
                </div>
              ))}
            </CollapsibleSection>

            {/* Contact Section */}
            <CollapsibleSection
              title={lang === "hi" ? "\u0938\u0902\u092A\u0930\u094D\u0915 \u091C\u093E\u0928\u0915\u093E\u0930\u0940" : "Contact Information"}
              icon={Phone} expanded={expandedSections.contact}
              onToggle={() => toggleSection("contact")}
              onEdit={canEdit ? () => setEditModal("contact") : null}
            >
              <Field label={lang === "hi" ? "WhatsApp" : "WhatsApp"} value={reg.primary_mobile} />
              <Field label={lang === "hi" ? "\u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u092B\u094B\u0928" : "Additional Phone"} value={reg.additional_phone} />
              {reg.email && <Field label="Email" value={reg.email} />}
            </CollapsibleSection>

            {/* Address Section */}
            <CollapsibleSection
              title={lang === "hi" ? "\u092A\u0924\u093E" : "Address"}
              icon={MapPin} expanded={expandedSections.address}
              onToggle={() => toggleSection("address")}
              onEdit={canEdit ? () => setEditModal("address") : null}
            >
              <p className="text-sm text-[#0B1C3D]">
                {[reg.address?.full_address, reg.address?.city, reg.address?.state, reg.address?.country].filter(Boolean).join(", ")}
              </p>
            </CollapsibleSection>

            {/* Stay & Travel Section */}
            <CollapsibleSection
              title={lang === "hi" ? "\u0909\u092A\u0938\u094D\u0925\u093F\u0924\u093F \u090F\u0935\u0902 \u092F\u093E\u0924\u094D\u0930\u093E" : "Attendance & Travel"}
              icon={Calendar} expanded={expandedSections.stay}
              onToggle={() => toggleSection("stay")}
              onEdit={canEdit ? () => setEditModal("stay") : null}
            >
              <Field label={lang === "hi" ? "\u0909\u092A\u0938\u094D\u0925\u093F\u0924\u093F" : "Intent"} value={reg.attendance_intent} />
              <Field label={lang === "hi" ? "\u091A\u092F\u0928\u093F\u0924 \u0926\u093F\u0928" : "Days"} value={(reg.selected_days || []).join(", ")} />
              <Field label={lang === "hi" ? "\u0906\u0917\u092E\u0928 \u0938\u092E\u092F" : "Arrival Time"} value={reg.expected_arrival_time} />
              <Field label={lang === "hi" ? "\u092A\u094D\u0930\u0938\u094D\u0925\u093E\u0928 \u0938\u092E\u092F" : "Departure Time"} value={reg.expected_departure_time} />
              {reg.travel_mode && <Field label={lang === "hi" ? "\u092F\u093E\u0924\u094D\u0930\u093E \u092E\u093E\u0927\u094D\u092F\u092E" : "Travel Mode"} value={reg.travel_mode} />}
              {reg.travel_details && <Field label={lang === "hi" ? "\u092F\u093E\u0924\u094D\u0930\u093E \u0935\u093F\u0935\u0930\u0923" : "Travel Details"} value={reg.travel_details} />}
            </CollapsibleSection>

            {/* Reference Section */}
            <CollapsibleSection
              title={lang === "hi" ? "\u0938\u0902\u0926\u0930\u094D\u092D" : "Reference"}
              icon={User} expanded={expandedSections.reference}
              onToggle={() => toggleSection("reference")}
              onEdit={canEdit ? () => setEditModal("reference") : null}
            >
              <Field label={lang === "hi" ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u094D\u092F\u0915\u094D\u0924\u093F" : "Reference Person"} value={reg.reference_person_name || reg.reference_person_id || "\u2014"} />
              <Field label={lang === "hi" ? "\u0938\u092E\u094D\u092C\u0928\u094D\u0927" : "Relation"} value={reg.relation_category} />
              {reg.message && <Field label={lang === "hi" ? "\u0938\u0902\u0926\u0947\u0936" : "Message"} value={reg.message} />}
            </CollapsibleSection>

            {/* Room/QR (if assigned but not fully confirmed) */}
            {!isConfirmed && (reg.room_assignments?.length > 0 || reg.assigned_swamsevak || reg.qr_image_b64) && (
              <CollapsibleSection
                title={lang === "hi" ? "\u0906\u0935\u0902\u091F\u0928" : "Allocation"}
                icon={QrCode} expanded={expandedSections.allocation}
                onToggle={() => toggleSection("allocation")}
              >
                {reg.room_assignments?.length > 0 && <Field label={lang === "hi" ? "\u0915\u092E\u0930\u093E" : "Room"} value={reg.room_assignments.join(", ")} />}
                {reg.assigned_swamsevak && <Field label={lang === "hi" ? "\u0938\u0902\u092A\u0930\u094D\u0915 \u0935\u094D\u092F\u0915\u094D\u0924\u093F" : "Contact Person"} value={reg.assigned_swamsevak} />}
                {reg.qr_image_b64 && (
                  <div className="mt-2 text-center">
                    <img src={`data:image/png;base64,${reg.qr_image_b64}`} alt="QR" className="w-28 h-28 mx-auto rounded-lg border" />
                    <button onClick={downloadQR} className="mt-1 text-xs text-[#D4AF37] hover:underline flex items-center gap-1 mx-auto" data-testid="download-qr-small">
                      <Download size={12} /> Download QR
                    </button>
                  </div>
                )}
              </CollapsibleSection>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-gray-50 border-t text-center">
            <p className="text-xs text-gray-400">
              {lang === "hi" ? "\u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 ID:" : "Registration ID:"} {reg.id?.slice(0, 8)}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Edit Modals ─── */}
      {editModal === "attendees" && (
        <EditAttendeesModal reg={reg} lang={lang} onSave={handleSaveSection} onClose={() => setEditModal(null)} />
      )}
      {editModal === "contact" && (
        <EditContactModal reg={reg} lang={lang} onSave={handleSaveSection} onClose={() => setEditModal(null)} />
      )}
      {editModal === "address" && (
        <EditAddressModal reg={reg} lang={lang} onSave={handleSaveSection} onClose={() => setEditModal(null)} />
      )}
      {editModal === "stay" && (
        <EditStayModal reg={reg} lang={lang} onSave={handleSaveSection} onClose={() => setEditModal(null)} />
      )}
      {editModal === "reference" && (
        <EditReferenceModal reg={reg} lang={lang} refPersons={refPersons} relationCats={relationCats} onSave={handleSaveSection} onClose={() => setEditModal(null)} />
      )}
    </div>
  );
}

// ─── Reusable Components ───
function CollapsibleSection({ title, icon: Icon, expanded, onToggle, onEdit, children }) {
  return (
    <div data-testid={`section-${title.toLowerCase().replace(/[^a-z]/g, "-")}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-[#D4AF37]" />
          <span className="font-semibold text-[#0B1C3D] text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50" data-testid={`edit-${title.toLowerCase().replace(/[^a-z]/g, "-")}`}>
              <Edit size={12} />
            </button>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>
      {expanded && <div className="px-5 pb-4 space-y-1.5">{children}</div>}
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

// ─── Edit Modals ───
function EditAttendeesModal({ reg, lang, onSave, onClose }) {
  const [attendees, setAttendees] = useState(reg.attendees || []);
  const [numPeople, setNumPeople] = useState(reg.num_people || 1);
  const [groupHead, setGroupHead] = useState(reg.group_head_id || "");
  const [familyRequest, setFamilyRequest] = useState(reg.family_special_request || "");
  const [saving, setSaving] = useState(false);

  const handleNumChange = (val) => {
    const num = Math.max(1, Math.min(50, parseInt(val) || 1));
    setNumPeople(num);
    setAttendees(prev => {
      const arr = Array.from({ length: num }, (_, i) => prev[i] || { id: "", name: "", age: "", special_needs: "" });
      return arr;
    });
  };

  const setAtt = (idx, key, val) => {
    setAttendees(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: val };
      return copy;
    });
  };

  const save = async () => {
    if (attendees.some(a => !a.name.trim())) { toast.error(lang === "hi" ? "\u0938\u092D\u0940 \u0928\u093E\u092E \u092D\u0930\u0947\u0902" : "All names required"); return; }
    if (attendees.some(a => !a.age)) { toast.error(lang === "hi" ? "\u0938\u092D\u0940 \u0909\u092E\u094D\u0930 \u092D\u0930\u0947\u0902" : "All ages required"); return; }
    setSaving(true);
    await onSave({ attendees, num_people: numPeople, group_head_id: groupHead, family_special_request: familyRequest });
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{lang === "hi" ? "\u0938\u0926\u0938\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u093F\u0924 \u0915\u0930\u0947\u0902" : "Edit Attendees"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">{lang === "hi" ? "\u0932\u094B\u0917\u094B\u0902 \u0915\u0940 \u0938\u0902\u0916\u094D\u092F\u093E" : "Number of People"}</Label>
            <Input type="number" min={1} max={50} value={numPeople} onChange={e => handleNumChange(e.target.value)} className="w-24 mt-1" data-testid="edit-num-people" />
          </div>
          {attendees.map((a, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2 border">
              <p className="text-xs font-semibold text-gray-500">{lang === "hi" ? `\u0938\u0926\u0938\u094D\u092F ${i + 1}` : `Attendee ${i + 1}`}</p>
              <Input value={a.name} onChange={e => setAtt(i, "name", e.target.value)} placeholder={lang === "hi" ? "\u0928\u093E\u092E *" : "Name *"} className="text-sm" data-testid={`edit-att-name-${i}`} />
              <div className="grid grid-cols-2 gap-2">
                <Input value={a.age} onChange={e => setAtt(i, "age", e.target.value)} placeholder={lang === "hi" ? "\u0909\u092E\u094D\u0930 *" : "Age *"} className="text-sm" data-testid={`edit-att-age-${i}`} />
                <Input value={a.special_needs} onChange={e => setAtt(i, "special_needs", e.target.value)} placeholder={lang === "hi" ? "\u0935\u093F\u0936\u0947\u0937 \u0906\u0935\u0936\u094D\u092F\u0915\u0924\u093E" : "Special Needs"} className="text-sm" />
              </div>
            </div>
          ))}
          <div>
            <Label className="text-sm">{lang === "hi" ? "\u0938\u092E\u0942\u0939 \u092A\u094D\u0930\u092E\u0941\u0916" : "Group Head"}</Label>
            <Select value={groupHead} onValueChange={setGroupHead}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={lang === "hi" ? "\u092A\u094D\u0930\u092E\u0941\u0916 \u091A\u0941\u0928\u0947\u0902" : "Select head"} /></SelectTrigger>
              <SelectContent>{attendees.filter(a => a.name.trim()).map((a, i) => <SelectItem key={i} value={a.id || a.name}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">{lang === "hi" ? "\u092A\u0930\u093F\u0935\u093E\u0930/\u0938\u092E\u0942\u0939 \u0935\u093F\u0936\u0947\u0937 \u0905\u0928\u0941\u0930\u094B\u0927" : "Family/Group Special Request"}</Label>
            <Textarea value={familyRequest} onChange={e => setFamilyRequest(e.target.value)} className="mt-1 text-sm" rows={2}
              placeholder={lang === "hi" ? "\u0915\u094B\u0908 \u0935\u093F\u0936\u0947\u0937 \u0905\u0928\u0941\u0930\u094B\u0927" : "Any special request for the group"} data-testid="edit-family-request" />
          </div>
          <Button onClick={save} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90" data-testid="save-attendees-btn">
            {saving ? "..." : (lang === "hi" ? "\u0938\u0939\u0947\u091C\u0947\u0902" : "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditContactModal({ reg, lang, onSave, onClose }) {
  const [phone, setPhone] = useState(reg.additional_phone || "");
  const [email, setEmail] = useState(reg.email || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!phone.trim()) { toast.error(lang === "hi" ? "\u092B\u094B\u0928 \u0928\u0902\u092C\u0930 \u0906\u0935\u0936\u094D\u092F\u0915" : "Phone number required"); return; }
    setSaving(true);
    await onSave({ additional_phone: phone, email });
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{lang === "hi" ? "\u0938\u0902\u092A\u0930\u094D\u0915 \u0938\u0902\u092A\u093E\u0926\u093F\u0924 \u0915\u0930\u0947\u0902" : "Edit Contact"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">WhatsApp ({lang === "hi" ? "\u0932\u0949\u0915\u094D\u0921" : "locked"})</Label>
            <Input value={reg.primary_mobile} disabled className="mt-1 bg-gray-100" />
          </div>
          <div>
            <Label className="text-sm">{lang === "hi" ? "\u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u092B\u094B\u0928 *" : "Additional Phone *"}</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" type="tel" data-testid="edit-phone" />
          </div>
          <div>
            <Label className="text-sm">Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} className="mt-1" type="email" data-testid="edit-email" />
          </div>
          <Button onClick={save} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90" data-testid="save-contact-btn">
            {saving ? "..." : (lang === "hi" ? "\u0938\u0939\u0947\u091C\u0947\u0902" : "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditAddressModal({ reg, lang, onSave, onClose }) {
  const addr = reg.address || {};
  const [country, setCountry] = useState(addr.country || "India");
  const [state, setState] = useState(addr.state || "");
  const [city, setCity] = useState(addr.city || "");
  const [pinCode, setPinCode] = useState(addr.pin_code || "");
  const [full, setFull] = useState(addr.full_address || "");
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");

  useEffect(() => {
    axios.get(`${API}/api/geo/countries`).then(r => setCountries(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!country) { setStates([]); return; }
    const c = countries.find(cc => cc.name === country);
    if (c) {
      axios.get(`${API}/api/geo/states/${c.code}`).then(r => setStates(r.data)).catch(() => setStates([]));
    }
  }, [country, countries]);

  const filteredCountries = countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()));
  const filteredStates = states.filter(s => s.name.toLowerCase().includes(stateSearch.toLowerCase()));

  const save = async () => {
    if (!country.trim() || !state.trim() || !city.trim() || !full.trim()) { toast.error(lang === "hi" ? "\u0938\u092D\u0940 \u092A\u0924\u093E \u092B\u0940\u0932\u094D\u0921 \u092D\u0930\u0947\u0902" : "Country, State, City and Full Address required"); return; }
    setSaving(true);
    await onSave({ address: { country, state, city, pin_code: pinCode, full_address: full } });
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{lang === "hi" ? "\u092A\u0924\u093E \u0938\u0902\u092A\u093E\u0926\u093F\u0924 \u0915\u0930\u0947\u0902" : "Edit Address"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-sm">{lang === "hi" ? "\u0926\u0947\u0936 *" : "Country *"}</Label>
            <Input placeholder={lang === "hi" ? "\u0926\u0947\u0936 \u0916\u094B\u091C\u0947\u0902..." : "Search country..."} value={countrySearch} onChange={e => setCountrySearch(e.target.value)} className="mt-1 text-sm" data-testid="edit-country-search" />
            {countrySearch && filteredCountries.length > 0 && (
              <div className="border rounded-lg mt-1 max-h-32 overflow-y-auto bg-white shadow-lg">
                {filteredCountries.slice(0, 8).map(c => (
                  <button key={c.code} onClick={() => { setCountry(c.name); setCountrySearch(""); setState(""); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100">{c.name}</button>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{lang === "hi" ? "\u091A\u092F\u0928\u093F\u0924" : "Selected"}: <b>{country}</b></p>
          </div>
          <div>
            <Label className="text-sm">{lang === "hi" ? "\u0930\u093E\u091C\u094D\u092F *" : "State *"}</Label>
            {states.length > 0 ? (
              <>
                <Input placeholder={lang === "hi" ? "\u0930\u093E\u091C\u094D\u092F \u0916\u094B\u091C\u0947\u0902..." : "Search state..."} value={stateSearch} onChange={e => setStateSearch(e.target.value)} className="mt-1 text-sm" data-testid="edit-state-search" />
                {stateSearch && filteredStates.length > 0 && (
                  <div className="border rounded-lg mt-1 max-h-32 overflow-y-auto bg-white shadow-lg">
                    {filteredStates.slice(0, 8).map(s => (
                      <button key={s.code} onClick={() => { setState(s.name); setStateSearch(""); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100">{s.name}</button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-0.5">{lang === "hi" ? "\u091A\u092F\u0928\u093F\u0924" : "Selected"}: <b>{state || "\u2014"}</b></p>
              </>
            ) : (
              <Input value={state} onChange={e => setState(e.target.value)} className="mt-1 text-sm" data-testid="edit-state" placeholder={lang === "hi" ? "\u0930\u093E\u091C\u094D\u092F" : "State"} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-sm">{lang === "hi" ? "\u0936\u0939\u0930 *" : "City *"}</Label>
              <Input value={city} onChange={e => setCity(e.target.value)} className="mt-1 text-sm" data-testid="edit-city" />
            </div>
            <div>
              <Label className="text-sm">{lang === "hi" ? "\u092A\u093F\u0928 \u0915\u094B\u0921" : "Pin Code"}</Label>
              <Input value={pinCode} onChange={e => setPinCode(e.target.value)} className="mt-1 text-sm" data-testid="edit-pincode" />
            </div>
          </div>
          <div>
            <Label className="text-sm">{lang === "hi" ? "\u092A\u0942\u0930\u093E \u092A\u0924\u093E *" : "Full Address *"}</Label>
            <Textarea value={full} onChange={e => setFull(e.target.value)} className="mt-1 text-sm" rows={2} data-testid="edit-address-full" />
          </div>
          <Button onClick={save} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90" data-testid="save-address-btn">
            {saving ? "..." : (lang === "hi" ? "\u0938\u0939\u0947\u091C\u0947\u0902" : "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditStayModal({ reg, lang, onSave, onClose }) {
  const [days, setDays] = useState(reg.selected_days || []);
  const [arrTime, setArrTime] = useState(reg.expected_arrival_time || "");
  const [depTime, setDepTime] = useState(reg.expected_departure_time || "");
  const [intent, setIntent] = useState(reg.attendance_intent || "Yes");
  const [travelMode, setTravelMode] = useState(reg.travel_mode || "");
  const [travelDetails, setTravelDetails] = useState(reg.travel_details || "");
  const [saving, setSaving] = useState(false);

  const toggleDay = (d) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const save = async () => {
    if (days.length === 0) { toast.error(lang === "hi" ? "\u0915\u092E \u0938\u0947 \u0915\u092E \u090F\u0915 \u0926\u093F\u0928 \u091A\u0941\u0928\u0947\u0902" : "Select at least one day"); return; }
    if (!arrTime) { toast.error(lang === "hi" ? "\u0906\u0917\u092E\u0928 \u0938\u092E\u092F \u091A\u0941\u0928\u0947\u0902" : "Arrival time required"); return; }
    if (!depTime) { toast.error(lang === "hi" ? "\u092A\u094D\u0930\u0938\u094D\u0925\u093E\u0928 \u0938\u092E\u092F \u091A\u0941\u0928\u0947\u0902" : "Departure time required"); return; }
    setSaving(true);
    await onSave({ selected_days: days, expected_arrival_time: arrTime, expected_departure_time: depTime, attendance_intent: intent, travel_mode: travelMode, travel_details: travelDetails });
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{lang === "hi" ? "\u0909\u092A\u0938\u094D\u0925\u093F\u0924\u093F \u0938\u0902\u092A\u093E\u0926\u093F\u0924 \u0915\u0930\u0947\u0902" : "Edit Stay & Travel"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block">{lang === "hi" ? "\u0926\u093F\u0928 *" : "Days *"}</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {STAY_DATES.map(d => (
                <button key={d.date} onClick={() => toggleDay(d.date)} type="button"
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition ${days.includes(d.date) ? "bg-[#D4AF37] text-[#0B1C3D] border-[#D4AF37]" : "bg-white border-gray-200 text-gray-600"}`}
                  data-testid={`edit-day-${d.date}`}>{lang === "hi" ? d.label_hi : d.label_en}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">{lang === "hi" ? "\u0906\u0917\u092E\u0928 \u0938\u092E\u092F *" : "Arrival Time *"}</Label>
              <Select value={arrTime} onValueChange={setArrTime}><SelectTrigger className="mt-1" data-testid="edit-arr-time"><SelectValue /></SelectTrigger>
                <SelectContent>{TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label className="text-sm">{lang === "hi" ? "\u092A\u094D\u0930\u0938\u094D\u0925\u093E\u0928 \u0938\u092E\u092F *" : "Departure Time *"}</Label>
              <Select value={depTime} onValueChange={setDepTime}><SelectTrigger className="mt-1" data-testid="edit-dep-time"><SelectValue /></SelectTrigger>
                <SelectContent>{TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div>
            <Label className="text-sm">{lang === "hi" ? "\u092F\u093E\u0924\u094D\u0930\u093E \u092E\u093E\u0927\u094D\u092F\u092E" : "Travel Mode"}</Label>
            <Select value={travelMode} onValueChange={setTravelMode}><SelectTrigger className="mt-1" data-testid="edit-travel-mode"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="own_car">Own Car</SelectItem><SelectItem value="train">Train</SelectItem>
                <SelectItem value="flight">Flight</SelectItem><SelectItem value="bus">Bus</SelectItem><SelectItem value="other">Other</SelectItem>
              </SelectContent></Select>
          </div>
          <div>
            <Label className="text-sm">{lang === "hi" ? "\u092F\u093E\u0924\u094D\u0930\u093E \u0935\u093F\u0935\u0930\u0923" : "Travel Details"}</Label>
            <Textarea value={travelDetails} onChange={e => setTravelDetails(e.target.value)} className="mt-1" rows={2} data-testid="edit-travel-details" />
          </div>
          <Button onClick={save} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90" data-testid="save-stay-btn">
            {saving ? "..." : (lang === "hi" ? "\u0938\u0939\u0947\u091C\u0947\u0902" : "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditReferenceModal({ reg, lang, refPersons, relationCats, onSave, onClose }) {
  const [refId, setRefId] = useState(reg.reference_person_id || "");
  const [relation, setRelation] = useState(reg.relation_category || "");
  const [message, setMessage] = useState(reg.message || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!refId) { toast.error(lang === "hi" ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u091A\u0941\u0928\u0947\u0902" : "Reference person required"); return; }
    if (!relation) { toast.error(lang === "hi" ? "\u0938\u0902\u092C\u0902\u0927 \u091A\u0941\u0928\u0947\u0902" : "Relation required"); return; }
    setSaving(true);
    await onSave({ reference_person_id: refId, relation_category: relation, message });
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{lang === "hi" ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0938\u0902\u092A\u093E\u0926\u093F\u0924 \u0915\u0930\u0947\u0902" : "Edit Reference"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">{lang === "hi" ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u094D\u092F\u0915\u094D\u0924\u093F *" : "Reference Person *"}</Label>
            <Select value={refId} onValueChange={setRefId}><SelectTrigger className="mt-1" data-testid="edit-ref-person"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{refPersons.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div>
            <Label className="text-sm">{lang === "hi" ? "\u0938\u0902\u092C\u0902\u0927 *" : "Relation *"}</Label>
            <Select value={relation} onValueChange={setRelation}><SelectTrigger className="mt-1" data-testid="edit-relation"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{relationCats.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div>
            <Label className="text-sm">{lang === "hi" ? "\u0938\u0902\u0926\u0947\u0936" : "Message"}</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} className="mt-1" rows={2} data-testid="edit-message" />
          </div>
          <Button onClick={save} disabled={saving} className="w-full bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90" data-testid="save-reference-btn">
            {saving ? "..." : (lang === "hi" ? "\u0938\u0939\u0947\u091C\u0947\u0902" : "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
