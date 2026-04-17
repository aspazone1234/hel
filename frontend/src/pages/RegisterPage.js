import { useState, useEffect } from "react";
import AddressSelector from "../components/AddressSelector";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronLeft, Globe, Phone, Check, Users, Calendar, Clock, MapPin, User } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Progress } from "../components/ui/progress";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { useLang } from "@/context/LanguageContext";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const fontHi = "'Tiro Devanagari Hindi', serif";

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

const emptyForm = {
  primary_mobile: "",
  additional_phone: "",
  email: "",
  preferred_language: "hi",
  address: { full_address: "", city: "", state: "", country: "India", pin_code: "" },
  num_people: 1,
  attendees: [{ id: "", name: "", age: "", special_needs: "" }],
  group_head_id: "",
  family_special_request: "",
  attendance_intent: "Yes",
  selected_days: [],
  expected_arrival_time: "",
  expected_departure_time: "",
  reference_person_id: "",
  relation_category: "",
  message: "",
  consent: false,
  travel_mode: "",
  travel_details: "",
};

export default function RegisterPage() {
  const { t, lang, toggleLang } = useLang();
  const navigate = useNavigate();

  // OTP state
  const [otpPhase, setOtpPhase] = useState("enter_mobile"); // enter_mobile | otp_sent | verified
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [mockOtp, setMockOtp] = useState(""); // kept for state compatibility
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Form state
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [existingRegId, setExistingRegId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Reference data
  const [refPersons, setRefPersons] = useState([]);
  const [relationCats, setRelationCats] = useState([]);
  // Geo data
  const [countries, setCountries] = useState([]);
  const [geoStates, setGeoStates] = useState([]);
  const [addrCountrySearch, setAddrCountrySearch] = useState("");
  const [addrStateSearch, setAddrStateSearch] = useState("");

  const STEPS = t.register.steps;

  useEffect(() => {
    document.title = lang === "hi" ? "\u092A\u0902\u091C\u0940\u0915\u0930\u0923 - \u0936\u094D\u0930\u0940\u092E\u0926\u094D\u092D\u093E\u0917\u0935\u0924 \u0915\u0925\u093E 2026" : "Register - Shrimad Bhagavat Katha 2026";
  }, [lang]);

  useEffect(() => {
    if (!form.address.country) { setGeoStates([]); return; }
    const c = countries.find(cc => cc.name === form.address.country);
    if (c) { axios.get(`${API}/geo/states/${c.code}`).then(r => setGeoStates(r.data)).catch(() => setGeoStates([])); }
    else { setGeoStates([]); }
  }, [form.address.country, countries]);


  useEffect(() => {
    axios.get(`${API}/reference-persons/public`).then(r => setRefPersons(r.data)).catch(() => {});
    axios.get(`${API}/relation-categories/public`).then(r => setRelationCats(r.data)).catch(() => {});
    axios.get(`${API}/geo/countries`).then(r => setCountries(r.data)).catch(() => {});
    // Check URL params for returning user from MyRegistrationPage edit
    const urlParams = new URLSearchParams(window.location.search);
    const mobileParam = urlParams.get("mobile");
    if (mobileParam) {
      setMobile(mobileParam);
      // Auto-load their existing registration for editing
      axios.get(`${API}/registration/by-mobile/${encodeURIComponent(mobileParam)}`)
        .then(r => {
          const reg = r.data;
          setForm({ ...emptyForm, ...reg, address: reg.address || emptyForm.address, attendees: reg.attendees || emptyForm.attendees });
          setExistingRegId(reg.id);
          setIsEditMode(true);
          setOtpPhase("verified");
        })
        .catch(() => {});
    }
  }, []);

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: undefined })); };
  const setAddr = (key, val) => { setForm(f => ({ ...f, address: { ...f.address, [key]: val } })); };

  const handleNumPeopleChange = (val) => {
    const num = Math.max(1, Math.min(50, parseInt(val) || 1));
    set("num_people", num);
    setForm(f => {
      const existing = f.attendees;
      const newAttendees = Array.from({ length: num }, (_, i) =>
        existing[i] || { id: "", name: "", age: "", special_needs: "" }
      );
      return { ...f, num_people: num, attendees: newAttendees };
    });
  };

  const setAttendee = (idx, key, val) => {
    setForm(f => {
      const atts = [...f.attendees];
      atts[idx] = { ...atts[idx], [key]: val };
      return { ...f, attendees: atts };
    });
  };

  const toggleDay = (date) => {
    setForm(f => {
      const days = f.selected_days.includes(date)
        ? f.selected_days.filter(d => d !== date)
        : [...f.selected_days, date];
      return { ...f, selected_days: days };
    });
  };

  // ─── OTP Flow ───
  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const sendOtp = async () => {
    const cleanNum = mobile.replace(/[\s\-]/g, "").trim();
    if (!cleanNum || cleanNum.length < 7 || !/^\d+$/.test(cleanNum)) {
      toast.error(lang === "hi" ? "\u0915\u0943\u092A\u092F\u093E \u0935\u0948\u0927 \u092E\u094B\u092C\u093E\u0907\u0932 \u0928\u0902\u092C\u0930 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902" : "Please enter a valid phone number");
      return;
    }
    const fullMobile = countryCode + cleanNum;
    setOtpLoading(true);
    try {
      const { data } = await axios.post(`${API}/otp/send`, { mobile: fullMobile });
      setMobile(fullMobile);
      setOtpPhase("otp_sent");
      setResendCooldown(60);
      toast.success(lang === "hi" ? "OTP WhatsApp पर भेजा गया" : "OTP sent via WhatsApp");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpLoading(true);
    try {
      await axios.post(`${API}/otp/send`, { mobile: mobile.trim() });
      setResendCooldown(60);
      setOtp("");
      toast.success(lang === "hi" ? "OTP पुनः भेजा गया" : "OTP resent via WhatsApp");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to resend OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length < 6) {
      toast.error(lang === "hi" ? "\u0915\u0943\u092A\u092F\u093E OTP \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902" : "Please enter the OTP");
      return;
    }
    setOtpLoading(true);
    try {
      const { data } = await axios.post(`${API}/otp/verify`, { mobile: mobile.trim(), otp: otp.trim() });
      if (data.has_existing_registration && data.existing_registration) {
        // Redirect returning user to their self-service page
        navigate(`/my-registration?mobile=${encodeURIComponent(mobile)}`);
        return;
      } else {
        setForm(f => ({ ...f, primary_mobile: mobile.trim() }));
      }
      setOtpPhase("verified");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  // ─── Validation ───
  const validate = () => {
    const e = {};
    if (step === 0) {
      if (form.num_people < 1 || isNaN(form.num_people)) e.num_people = true;
      const hasEmptyName = form.attendees.some(a => !a.name.trim());
      if (hasEmptyName) e.attendees = true;
      // Age is mandatory for all attendees
      const hasMissingAge = form.attendees.some(a => !a.age || a.age.toString().trim() === "");
      if (hasMissingAge) e.attendee_age_required = true;
      // Validate ages are numbers
      const hasInvalidAge = form.attendees.some(a => a.age && (isNaN(a.age) || parseInt(a.age) < 0 || parseInt(a.age) > 120));
      if (hasInvalidAge) e.attendee_age = true;
      if (!form.additional_phone.trim()) e.additional_phone = true;
      // Phone validation: must be digits, min 7 chars
      const phoneClean = form.additional_phone.replace(/[\s\-+()]/g, "");
      if (phoneClean && (phoneClean.length < 7 || !/^\d+$/.test(phoneClean))) e.additional_phone_format = true;
      // Email validation
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = true;
      if (!form.address.full_address.trim()) e.full_address = true;
      if (!form.address.city.trim()) e.city = true;
      if (!form.address.state.trim()) e.state = true;
      if (!form.address.country.trim()) e.country = true;
      // Head of Family is mandatory when there are multiple attendees
      if (form.attendees.length > 0 && !form.group_head_id) e.group_head_id = true;
    }
    if (step === 1) {
      if (form.selected_days.length === 0) e.selected_days = true;
      if (!form.expected_arrival_time) e.expected_arrival_time = true;
      if (!form.expected_departure_time) e.expected_departure_time = true;
    }
    if (step === 2) {
      if (!form.reference_person_id) e.reference_person = true;
      if (!form.relation_category) e.relation_category = true;
    }
    if (step === 3) {
      if (!form.consent) e.consent = true;
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const msgs = [];
      if (e.attendees) msgs.push(lang === "hi" ? "\u0938\u092D\u0940 \u0938\u0926\u0938\u094D\u092F\u094B\u0902 \u0915\u093E \u0928\u093E\u092E \u092D\u0930\u0947\u0902" : "Enter names for all attendees");
      if (e.attendee_age_required) msgs.push(lang === "hi" ? "\u0938\u092D\u0940 \u0938\u0926\u0938\u094D\u092F\u094B\u0902 \u0915\u0940 \u0906\u092F\u0941 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902" : "Age is required for all attendees");
      if (e.attendee_age) msgs.push(lang === "hi" ? "\u0938\u0939\u0940 \u0909\u092E\u094D\u0930 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902" : "Enter valid age (0-120)");
      if (e.additional_phone || e.additional_phone_format) msgs.push(lang === "hi" ? "\u0938\u0939\u0940 \u092B\u093C\u094B\u0928 \u0928\u0902\u092C\u0930 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902" : "Enter a valid phone number");
      if (e.email) msgs.push(lang === "hi" ? "\u0938\u0939\u0940 \u0908\u092E\u0947\u0932 \u092A\u0924\u093E \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902" : "Enter a valid email address");
      if (e.group_head_id) msgs.push(lang === "hi" ? "\u092A\u0930\u093F\u0935\u093E\u0930 \u0915\u093E \u092E\u0941\u0916\u093F\u092F\u093E \u091A\u0941\u0928\u0947\u0902 (\u0939\u0947\u0921 \u0911\u092B \u092B\u0948\u092E\u093F\u0932\u0940)" : "Please select the Head of Family before continuing");
      if (e.selected_days) msgs.push(lang === "hi" ? "\u0915\u092E \u0938\u0947 \u0915\u092E \u090F\u0915 \u0926\u093F\u0928 \u091A\u0941\u0928\u0947\u0902" : "Select at least one day");
      if (e.expected_arrival_time) msgs.push(lang === "hi" ? "\u0906\u0917\u092E\u0928 \u0938\u092E\u092F \u091A\u0941\u0928\u0947\u0902" : "Expected arrival time is required");
      if (e.expected_departure_time) msgs.push(lang === "hi" ? "\u092A\u094D\u0930\u0938\u094D\u0925\u093E\u0928 \u0938\u092E\u092F \u091A\u0941\u0928\u0947\u0902" : "Expected departure time is required");
      if (e.reference_person) msgs.push(lang === "hi" ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u091A\u0941\u0928\u0947\u0902" : "Reference person is required");
      if (e.relation_category) msgs.push(lang === "hi" ? "\u0938\u0902\u092C\u0902\u0927 \u091A\u0941\u0928\u0947\u0902" : "Relation with reference person is required");
      if (msgs.length > 0) toast.error(msgs[0]);
    }
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const handlePrev = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        attendees: form.attendees.map(a => ({
          ...a,
          id: a.id || undefined,
        })),
      };

      if (isEditMode && existingRegId) {
        await axios.put(`${API}/registrations/${existingRegId}/public`, payload);
        toast.success(lang === "hi" ? "\u092A\u0902\u091C\u0940\u0915\u0930\u0923 \u0905\u092A\u0921\u0947\u091F \u0939\u094B \u0917\u092F\u093E!" : "Registration updated successfully!");
      } else {
        await axios.post(`${API}/registrations`, payload);
        toast.success(lang === "hi" ? "\u092A\u0902\u091C\u0940\u0915\u0930\u0923 \u0938\u092B\u0932!" : "Registration submitted successfully!");
      }
      sessionStorage.setItem("just_submitted", mobile);
      navigate(`/my-registration?mobile=${encodeURIComponent(mobile)}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Get group head name for display
  const getGroupHeadName = () => {
    const head = form.attendees.find(a => a.id === form.group_head_id || a.name === form.group_head_id);
    return head?.name || "";
  };

  // ─── Country Codes ───
  const COUNTRY_CODES = [
    { code: "+91", label: "India (+91)", flag: "IN" },
    { code: "+1", label: "USA/Canada (+1)", flag: "US" },
    { code: "+44", label: "UK (+44)", flag: "GB" },
    { code: "+971", label: "UAE (+971)", flag: "AE" },
    { code: "+966", label: "Saudi Arabia (+966)", flag: "SA" },
    { code: "+65", label: "Singapore (+65)", flag: "SG" },
    { code: "+61", label: "Australia (+61)", flag: "AU" },
    { code: "+49", label: "Germany (+49)", flag: "DE" },
    { code: "+33", label: "France (+33)", flag: "FR" },
    { code: "+81", label: "Japan (+81)", flag: "JP" },
    { code: "+86", label: "China (+86)", flag: "CN" },
    { code: "+27", label: "South Africa (+27)", flag: "ZA" },
    { code: "+254", label: "Kenya (+254)", flag: "KE" },
    { code: "+234", label: "Nigeria (+234)", flag: "NG" },
    { code: "+55", label: "Brazil (+55)", flag: "BR" },
    { code: "+62", label: "Indonesia (+62)", flag: "ID" },
    { code: "+60", label: "Malaysia (+60)", flag: "MY" },
    { code: "+63", label: "Philippines (+63)", flag: "PH" },
    { code: "+977", label: "Nepal (+977)", flag: "NP" },
    { code: "+94", label: "Sri Lanka (+94)", flag: "LK" },
    { code: "+880", label: "Bangladesh (+880)", flag: "BD" },
    { code: "+92", label: "Pakistan (+92)", flag: "PK" },
    { code: "+974", label: "Qatar (+974)", flag: "QA" },
    { code: "+968", label: "Oman (+968)", flag: "OM" },
    { code: "+973", label: "Bahrain (+973)", flag: "BH" },
    { code: "+965", label: "Kuwait (+965)", flag: "KW" },
  ];
  const [countryCode, setCountryCode] = useState("+91");
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const filteredCountries = COUNTRY_CODES.filter(c =>
    c.label.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch)
  );

  // ─── OTP Screen ───
  if (otpPhase !== "verified") {
    return (
      <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1 mb-8" data-testid="register-back-home">
            <ChevronLeft size={16} /> {t.register.backHome}
          </Link>

          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D4AF37]/20 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: lang === "hi" ? fontHi : "'Cormorant Garamond', serif" }}>
                {t.register.pageTitle}
              </h1>
              <button onClick={toggleLang} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0B1C3D]/5 hover:bg-[#0B1C3D]/10 text-[#0B1C3D]/70 text-sm" data-testid="register-lang-toggle">
                <Globe size={14} /> {lang === "hi" ? "EN" : "\u0939\u093F\u0902"}
              </button>
            </div>

            {otpPhase === "enter_mobile" && (
              <div data-testid="otp-enter-mobile">
                <p className="text-[#0B1C3D]/60 text-sm mb-5">
                  {lang === "hi" ? "\u0905\u092A\u0928\u093E WhatsApp \u0928\u0902\u092C\u0930 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902" : "Enter your WhatsApp number to begin"}
                </p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-[#0B1C3D]/70 text-sm">{lang === "hi" ? "WhatsApp \u0928\u0902\u092C\u0930" : "WhatsApp Number"}</Label>
                    <div className="flex gap-2 mt-1.5">
                      {/* Country Code Selector */}
                      <div className="relative">
                        <button type="button" onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                          className="flex items-center gap-1 px-3 py-2 border border-[#D4AF37]/20 rounded-lg bg-white text-sm font-medium text-[#0B1C3D] min-w-[90px]"
                          data-testid="country-code-btn">
                          {countryCode} <ChevronLeft size={12} className="rotate-[-90deg]" />
                        </button>
                        {showCountryDropdown && (
                          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-hidden">
                            <div className="p-2 border-b">
                              <input className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Search country..."
                                value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)}
                                data-testid="country-search-input" autoFocus />
                            </div>
                            <div className="overflow-y-auto max-h-44">
                              {filteredCountries.map(c => (
                                <button key={c.code} type="button"
                                  onClick={() => { setCountryCode(c.code); setShowCountryDropdown(false); setCountrySearch(""); }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#D4AF37]/10 flex justify-between items-center">
                                  <span>{c.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Phone Number */}
                      <div className="relative flex-1">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
                        <Input data-testid="otp-mobile-input" value={mobile} onChange={e => setMobile(e.target.value)}
                          placeholder="98765 43210" className="pl-10 bg-white border-[#D4AF37]/20" type="tel" />
                      </div>
                    </div>
                  </div>
                  <Button onClick={sendOtp} disabled={otpLoading} className="w-full bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90 py-3" data-testid="otp-send-btn">
                    {otpLoading ? (lang === "hi" ? "OTP \u092D\u0947\u091C\u093E \u091C\u093E \u0930\u0939\u093E \u0939\u0948..." : "Sending OTP...") : (lang === "hi" ? "OTP \u092D\u0947\u091C\u0947\u0902" : "Send OTP")}
                  </Button>
                </div>
              </div>
            )}

            {otpPhase === "otp_sent" && (
              <div data-testid="otp-verify-phase">
                <p className="text-[#0B1C3D]/60 text-sm mb-2">
                  {lang === "hi" ? `${mobile} पर WhatsApp OTP भेजा गया` : `OTP sent to ${mobile} via WhatsApp`}
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-green-700 text-xs font-medium flex items-center gap-1">
                    ✓ {lang === "hi" ? "कृपया WhatsApp पर प्राप्त 6-अंकीय OTP दर्ज करें" : "Please enter the 6-digit OTP received on WhatsApp"}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-[#0B1C3D]/70 text-sm">OTP</Label>
                    <Input data-testid="otp-code-input" value={otp} onChange={e => setOtp(e.target.value)}
                      placeholder="123456" className="mt-1.5 bg-white border-[#D4AF37]/20 text-center text-2xl tracking-[0.5em]" maxLength={6} />
                  </div>
                  <Button onClick={verifyOtp} disabled={otpLoading} className="w-full bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90 py-3" data-testid="otp-verify-btn">
                    {otpLoading ? (lang === "hi" ? "\u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924 \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902..." : "Verifying...") : (lang === "hi" ? "OTP \u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924 \u0915\u0930\u0947\u0902" : "Verify OTP")}
                  </Button>
                  <div className="flex items-center justify-between">
                    <button onClick={() => { setOtpPhase("enter_mobile"); setOtp(""); setResendCooldown(0); }} className="text-[#0B1C3D]/50 text-sm hover:text-[#0B1C3D]" data-testid="otp-change-number">
                      {lang === "hi" ? "\u0928\u0902\u092C\u0930 \u092C\u0926\u0932\u0947\u0902" : "Change number"}
                    </button>
                    <button onClick={resendOtp} disabled={resendCooldown > 0 || otpLoading}
                      className={`text-sm font-medium ${resendCooldown > 0 ? "text-[#0B1C3D]/30 cursor-not-allowed" : "text-[#D4AF37] hover:text-[#B8860B]"}`}
                      data-testid="otp-resend-btn">
                      {resendCooldown > 0
                        ? (lang === "hi" ? `पुनः भेजें (${resendCooldown}s)` : `Resend (${resendCooldown}s)`)
                        : (lang === "hi" ? "OTP पुनः भेजें" : "Resend OTP")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Form Sections ───
  return (
    <div className="min-h-screen bg-[#F8F1E5] pb-12">
      {/* Header */}
      <div className="bg-white border-b border-[#D4AF37]/20 px-4 py-4 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1" data-testid="register-back-home">
            <ChevronLeft size={16} /> {t.register.backHome}
          </Link>
          <div className="flex items-center gap-3">
            {isEditMode && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium" data-testid="edit-mode-badge">{lang === "hi" ? "\u0905\u092A\u0921\u0947\u091F \u092E\u094B\u0921" : "Update Mode"}</span>}
            <span className="text-[#0B1C3D]/40 text-xs">{mobile}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1C3D] mb-1" style={{ fontFamily: lang === "hi" ? fontHi : "'Cormorant Garamond', serif" }}>
          {t.register.pageTitle}
        </h1>

        {/* Step Progress */}
        <div className="flex items-center gap-2 my-5 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? "bg-green-500 text-white" : i === step ? "bg-[#D4AF37] text-[#0B1C3D]" : "bg-[#0B1C3D]/10 text-[#0B1C3D]/40"
              }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === step ? "text-[#0B1C3D] font-semibold" : "text-[#0B1C3D]/40"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`w-6 h-0.5 ${i < step ? "bg-green-400" : "bg-[#0B1C3D]/10"}`} />}
            </div>
          ))}
        </div>

        {/* Large Language Switch */}
        <button onClick={toggleLang} data-testid="register-lang-toggle"
          className="w-full mt-4 mb-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0B1C3D]/10 to-[#D4AF37]/15 border-2 border-[#D4AF37]/30 hover:border-[#D4AF37]/60 transition-all text-[#0B1C3D] font-semibold text-base">
          <Globe size={18} className="text-[#D4AF37]" />
          {lang === "hi" ? "Change language to English" : "\u092D\u093E\u0937\u093E \u0939\u093F\u0902\u0926\u0940 \u092E\u0947\u0902 \u092C\u0926\u0932\u0947\u0902"}
        </button>

        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#D4AF37]/15 shadow-sm">
          {/* ─── STEP 0: Contact & Group Setup ─── */}
          {step === 0 && (
            <div className="space-y-6" data-testid="form-step-contact">
              <h2 className="text-lg font-bold text-[#0B1C3D]" style={{ fontFamily: lang === "hi" ? fontHi : "'Cormorant Garamond', serif" }}>
                {lang === "hi" ? "\u0938\u0902\u092A\u0930\u094D\u0915 \u0935 \u0938\u092E\u0942\u0939 \u0935\u093F\u0935\u0930\u0923" : "Contact & Group Setup"}
              </h2>

              {/* Number of People */}
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm flex items-center gap-1.5">
                  <Users size={14} className="text-[#D4AF37]" /> {t.register.numPeople}
                </Label>
                <Input data-testid="num-people-input" type="number" min={1} max={50} value={form.num_people}
                  onChange={e => handleNumPeopleChange(e.target.value)} className="mt-1.5 bg-white border-[#D4AF37]/20 w-32" />
              </div>

              {/* Attendee Blocks */}
              <div className="space-y-4">
                {form.attendees.map((att, i) => (
                  <div key={i} className="p-4 rounded-xl border border-[#D4AF37]/15 bg-[#F8F1E5]/30 space-y-3" data-testid={`attendee-block-${i}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-[#0B1C3D]/10 flex items-center justify-center text-xs font-bold text-[#0B1C3D]/60">{i + 1}</span>
                      <span className="text-sm font-semibold text-[#0B1C3D]">{lang === "hi" ? `\u0938\u0926\u0938\u094D\u092F ${i + 1}` : `Attendee ${i + 1}`}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[#0B1C3D]/60 text-xs">{lang === "hi" ? "\u092A\u0942\u0930\u093E \u0928\u093E\u092E *" : "Full Name *"}</Label>
                        <Input data-testid={`attendee-name-${i}`} value={att.name} onChange={e => setAttendee(i, "name", e.target.value)}
                          className="mt-1 bg-white border-[#D4AF37]/20 text-sm" placeholder={lang === "hi" ? "\u0928\u093E\u092E" : "Name"} />
                      </div>
                      <div>
                        <Label className="text-[#0B1C3D]/60 text-xs">{lang === "hi" ? "\u0906\u092F\u0941 *" : "Age *"}</Label>
                        <Input data-testid={`attendee-age-${i}`} value={att.age} onChange={e => setAttendee(i, "age", e.target.value)}
                          className="mt-1 bg-white border-[#D4AF37]/20 text-sm" placeholder={lang === "hi" ? "\u0906\u092F\u0941" : "Age"} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[#0B1C3D]/60 text-xs">{lang === "hi" ? "\u0935\u093F\u0936\u0947\u0937 \u0906\u0935\u0936\u094D\u092F\u0915\u0924\u093E" : "Special Needs"}</Label>
                      <Input data-testid={`attendee-special-${i}`} value={att.special_needs} onChange={e => setAttendee(i, "special_needs", e.target.value)}
                        className="mt-1 bg-white border-[#D4AF37]/20 text-sm" placeholder={lang === "hi" ? "\u0935\u093F\u0936\u0947\u0937 \u0906\u0935\u0936\u094D\u092F\u0915\u0924\u093E" : "Special needs"} />
                    </div>
                  </div>
                ))}
              </div>

              {errors.attendees && <p className="text-red-500 text-xs">{lang === "hi" ? "\u0938\u092D\u0940 \u0938\u0926\u0938\u094D\u092F\u094B\u0902 \u0915\u093E \u0928\u093E\u092E \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902" : "Please enter names for all attendees"}</p>}

              {/* Group Head Selection */}
              {form.attendees.length > 0 && form.attendees.some(a => a.name.trim()) && (
                <div>
                  <Label className="text-[#0B1C3D]/70 text-sm flex items-center gap-1.5">
                    <User size={14} className="text-[#D4AF37]" /> {lang === "hi" ? "\u0938\u092E\u0942\u0939 \u092A\u094D\u0930\u092E\u0941\u0916 \u091A\u0941\u0928\u0947\u0902 *" : "Select Group Head *"}
                  </Label>
                  <Select value={form.group_head_id} onValueChange={v => set("group_head_id", v)}>
                    <SelectTrigger className="mt-1.5 bg-white border-[#D4AF37]/20" data-testid="group-head-select">
                      <SelectValue placeholder={lang === "hi" ? "\u092A\u094D\u0930\u092E\u0941\u0916 \u091A\u0941\u0928\u0947\u0902" : "Select head"} />
                    </SelectTrigger>
                    <SelectContent>
                      {form.attendees.filter(a => a.name.trim()).map((a, i) => (
                        <SelectItem key={i} value={a.id || a.name}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Contact Fields */}
              <div className="border-t border-[#D4AF37]/10 pt-5 space-y-4">
                <h3 className="text-base font-semibold text-[#0B1C3D]">{lang === "hi" ? "\u0938\u0902\u092A\u0930\u094D\u0915 \u091C\u093E\u0928\u0915\u093E\u0930\u0940" : "Contact Information"}</h3>

                <div>
                  <Label className="text-[#0B1C3D]/60 text-xs">{lang === "hi" ? "WhatsApp \u0928\u0902\u092C\u0930 (\u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924)" : "Primary WhatsApp (Verified)"}</Label>
                  <Input value={form.primary_mobile} disabled className="mt-1 bg-[#F8F1E5] border-[#D4AF37]/20 text-sm" data-testid="primary-mobile-display" />
                </div>

                <div>
                  <Label className="text-[#0B1C3D]/60 text-xs">{lang === "hi" ? "\u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u092B\u094B\u0928 \u0928\u0902\u092C\u0930 *" : "Additional Phone Number *"}</Label>
                  <Input data-testid="additional-phone-input" value={form.additional_phone} onChange={e => set("additional_phone", e.target.value)}
                    className={`mt-1 bg-white border-[#D4AF37]/20 text-sm ${errors.additional_phone ? "border-red-400" : ""}`} type="tel" />
                </div>

                <div>
                  <Label className="text-[#0B1C3D]/60 text-xs">{t.register.email}</Label>
                  <Input data-testid="email-input" value={form.email} onChange={e => set("email", e.target.value)}
                    className="mt-1 bg-white border-[#D4AF37]/20 text-sm" type="email" />
                </div>
              </div>

              {/* Address — standardized AddressSelector */}
              <div className="border-t border-[#D4AF37]/10 pt-5 space-y-3">
                <h3 className="text-base font-semibold text-[#0B1C3D] flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#D4AF37]" /> {lang === "hi" ? "पता *" : "Address *"}
                </h3>
                <AddressSelector
                  value={form.address}
                  onChange={(addr) => setForm(f => ({ ...f, address: addr }))}
                  errors={{ country: errors.country ? "Required" : "", state: errors.state ? "Required" : "", city: errors.city ? "Required" : "", full_address: errors.full_address ? "Required" : "" }}
                />
              </div>
            </div>
          )}

          {/* ─── STEP 1: Attendance & Travel ─── */}
          {step === 1 && (
            <div className="space-y-6" data-testid="form-step-attendance">
              <h2 className="text-lg font-bold text-[#0B1C3D]" style={{ fontFamily: lang === "hi" ? fontHi : "'Cormorant Garamond', serif" }}>
                {lang === "hi" ? "\u0909\u092A\u0938\u094D\u0925\u093F\u0924\u093F \u0935 \u092F\u093E\u0924\u094D\u0930\u093E" : "Attendance & Travel"}
              </h2>

              {/* Attendance Intent */}
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm mb-2 block">{t.register.willAttend}</Label>
                <RadioGroup value={form.attendance_intent} onValueChange={v => set("attendance_intent", v)} className="flex flex-wrap gap-3" data-testid="attendance-intent">
                  {[{ val: "Yes", label: t.register.attendYes }, { val: "Most Probably", label: t.register.attendMostProbably }, { val: "Maybe", label: t.register.attendMaybe }].map(opt => (
                    <label key={opt.val} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${
                      form.attendance_intent === opt.val ? "bg-[#D4AF37]/10 border-[#D4AF37]" : "border-[#D4AF37]/20 hover:border-[#D4AF37]/40"
                    }`}>
                      <RadioGroupItem value={opt.val} />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* Day Selector */}
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm mb-2 flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#D4AF37]" />
                  {lang === "hi" ? "\u0915\u093F\u0928 \u0926\u093F\u0928\u094B\u0902 \u0930\u0939\u0947\u0902\u0917\u0947? (27 \u092E\u0908 - 4 \u091C\u0942\u0928) *" : "Which days will you be present? (27 May - 4 Jun) *"}
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" data-testid="day-selector">
                  {STAY_DATES.map(d => {
                    const selected = form.selected_days.includes(d.date);
                    return (
                      <button key={d.date} onClick={() => toggleDay(d.date)} type="button"
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                          selected
                            ? "bg-[#D4AF37] text-[#0B1C3D] border-[#D4AF37] shadow-sm"
                            : "bg-white border-[#D4AF37]/20 text-[#0B1C3D]/70 hover:border-[#D4AF37]/50"
                        }`} data-testid={`day-${d.date}`}>
                        {lang === "hi" ? d.label_hi : d.label_en}
                      </button>
                    );
                  })}
                </div>
                {errors.selected_days && <p className="text-red-500 text-xs mt-1">{lang === "hi" ? "\u0915\u092E \u0938\u0947 \u0915\u092E \u090F\u0915 \u0926\u093F\u0928 \u091A\u0941\u0928\u0947\u0902" : "Please select at least one day"}</p>}
                {form.selected_days.length > 0 && (
                  <div className="mt-3 bg-gradient-to-r from-[#0B1C3D]/5 to-[#D4AF37]/10 rounded-xl p-4 border-2 border-[#D4AF37]/30 animate-pulse-slow" data-testid="stay-calculation">
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <p className="text-xs text-[#0B1C3D]/50 mb-1">{lang === "hi" ? "आगमन तिथि" : "Arrival Date"}</p>
                        <p className="text-lg font-bold text-[#0B1C3D]">
                          {new Date(form.selected_days.sort()[0] + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="text-center px-4">
                        <div className="w-12 h-12 rounded-full bg-[#D4AF37] text-[#0B1C3D] flex items-center justify-center font-bold text-lg">
                          {form.selected_days.length}
                        </div>
                        <p className="text-xs text-[#0B1C3D]/50 mt-1">{lang === "hi" ? "दिन" : "days"}</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-xs text-[#0B1C3D]/50 mb-1">{lang === "hi" ? "प्रस्थान तिथि" : "Departure Date"}</p>
                        <p className="text-lg font-bold text-[#0B1C3D]">
                          {new Date(form.selected_days.sort()[form.selected_days.length - 1] + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Arrival/Departure Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#0B1C3D]/70 text-sm flex items-center gap-1.5">
                    <Clock size={14} className="text-[#D4AF37]" /> {lang === "hi" ? "\u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0906\u0917\u092E\u0928 \u0938\u092E\u092F *" : "Expected Arrival Time *"}
                  </Label>
                  <Select value={form.expected_arrival_time} onValueChange={v => set("expected_arrival_time", v)}>
                    <SelectTrigger className="mt-1.5 bg-white border-[#D4AF37]/20" data-testid="arrival-time-select">
                      <SelectValue placeholder={lang === "hi" ? "\u0938\u092E\u092F \u091A\u0941\u0928\u0947\u0902" : "Select time"} />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#0B1C3D]/70 text-sm flex items-center gap-1.5">
                    <Clock size={14} className="text-[#D4AF37]" /> {lang === "hi" ? "\u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u092A\u094D\u0930\u0938\u094D\u0925\u093E\u0928 \u0938\u092E\u092F *" : "Expected Departure Time *"}
                  </Label>
                  <Select value={form.expected_departure_time} onValueChange={v => set("expected_departure_time", v)}>
                    <SelectTrigger className="mt-1.5 bg-white border-[#D4AF37]/20" data-testid="departure-time-select">
                      <SelectValue placeholder={lang === "hi" ? "\u0938\u092E\u092F \u091A\u0941\u0928\u0947\u0902" : "Select time"} />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Travel Mode */}
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm flex items-center gap-1">
                  <MapPin size={14} className="text-[#D4AF37]" /> {lang === "hi" ? "यात्रा का माध्यम" : "Travel Mode"}
                </Label>
                <Select value={form.travel_mode} onValueChange={v => set("travel_mode", v)}>
                  <SelectTrigger className="mt-1.5 bg-white border-[#D4AF37]/20" data-testid="travel-mode-select">
                    <SelectValue placeholder={lang === "hi" ? "यात्रा का माध्यम चुनें" : "Select travel mode"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own_car">Own Car / Vehicle</SelectItem>
                    <SelectItem value="train">Train</SelectItem>
                    <SelectItem value="flight">Flight</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Travel Details */}
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">
                  {lang === "hi" ? "यात्रा विवरण (वैकल्पिक)" : "Travel Details (optional)"}
                </Label>
                <Textarea
                  className="mt-1.5 bg-white border-[#D4AF37]/20"
                  placeholder={lang === "hi" ? "टिकट नंबर, फ्लाइट नंबर आदि" : "Ticket number, flight number, etc."}
                  value={form.travel_details} onChange={(e) => set("travel_details", e.target.value)}
                  data-testid="travel-details-input"
                />
              </div>
            </div>
          )}

          {/* ─── STEP 2: Reference Details ─── */}
          {step === 2 && (
            <div className="space-y-6" data-testid="form-step-reference">
              <h2 className="text-lg font-bold text-[#0B1C3D]" style={{ fontFamily: lang === "hi" ? fontHi : "'Cormorant Garamond', serif" }}>
                {lang === "hi" ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u093F\u0935\u0930\u0923" : "Reference Details"}
              </h2>

              {/* Reference Person */}
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">{lang === "hi" ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u094D\u092F\u0915\u094D\u0924\u093F *" : "Reference Person *"}</Label>
                <Select value={form.reference_person_id} onValueChange={v => set("reference_person_id", v)}>
                  <SelectTrigger className="mt-1.5 bg-white border-[#D4AF37]/20" data-testid="reference-person-select">
                    <SelectValue placeholder={lang === "hi" ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u091A\u0941\u0928\u0947\u0902" : "Select reference person"} />
                  </SelectTrigger>
                  <SelectContent>
                    {refPersons.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Relation Category */}
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">{lang === "hi" ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0938\u0947 \u0938\u092E\u094D\u092C\u0928\u094D\u0927 *" : "Relation with Reference Person *"}</Label>
                <Select value={form.relation_category} onValueChange={v => set("relation_category", v)}>
                  <SelectTrigger className="mt-1.5 bg-white border-[#D4AF37]/20" data-testid="relation-category-select">
                    <SelectValue placeholder={lang === "hi" ? "\u0938\u092E\u094D\u092C\u0928\u094D\u0927 \u091A\u0941\u0928\u0947\u0902" : "Select relation"} />
                  </SelectTrigger>
                  <SelectContent>
                    {relationCats.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">{t.register.message}</Label>
                <Textarea data-testid="message-input" value={form.message} onChange={e => set("message", e.target.value)}
                  className="mt-1.5 bg-white border-[#D4AF37]/20 text-sm" rows={3} />
              </div>
            </div>
          )}

          {/* ─── STEP 3: Summary & Submit ─── */}
          {step === 3 && (
            <div className="space-y-5" data-testid="form-step-summary">
              <h2 className="text-lg font-bold text-[#0B1C3D]" style={{ fontFamily: lang === "hi" ? fontHi : "'Cormorant Garamond', serif" }}>
                {lang === "hi" ? "\u0938\u093E\u0930\u093E\u0902\u0936" : "Summary"}
              </h2>

              <div className="space-y-3 text-sm">
                <SummaryRow label={lang === "hi" ? "WhatsApp" : "WhatsApp"} value={form.primary_mobile} />
                <SummaryRow label={lang === "hi" ? "\u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u092B\u094B\u0928" : "Additional Phone Number"} value={form.additional_phone} />
                <SummaryRow label={lang === "hi" ? "\u0932\u094B\u0917\u094B\u0902 \u0915\u0940 \u0938\u0902\u0916\u094D\u092F\u093E" : "Number of People"} value={form.num_people} />
                <SummaryRow label={lang === "hi" ? "\u0938\u092E\u0942\u0939 \u092A\u094D\u0930\u092E\u0941\u0916" : "Group Head"} value={getGroupHeadName() || form.group_head_id} />

                <div className="border-t border-[#D4AF37]/10 pt-3">
                  <p className="font-semibold text-[#0B1C3D]/70 mb-2">{lang === "hi" ? "\u0938\u0926\u0938\u094D\u092F:" : "Attendees:"}</p>
                  {form.attendees.filter(a => a.name.trim()).map((a, i) => (
                    <div key={i} className="pl-4 py-1 border-l-2 border-[#D4AF37]/30 mb-1">
                      <span className="font-medium">{a.name}</span>
                      {a.age && <span className="text-[#0B1C3D]/50 ml-2">{lang === "hi" ? `\u0906\u092F\u0941: ${a.age}` : `Age: ${a.age}`}</span>}
                      {a.special_needs && <span className="text-[#0B1C3D]/50 ml-2">| {a.special_needs}</span>}
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#D4AF37]/10 pt-3">
                  <SummaryRow label={lang === "hi" ? "\u0909\u092A\u0938\u094D\u0925\u093F\u0924\u093F" : "Attendance"} value={form.attendance_intent} />
                  <SummaryRow label={lang === "hi" ? "\u091A\u092F\u0928\u093F\u0924 \u0926\u093F\u0928" : "Selected Days"} value={form.selected_days.sort().join(", ")} />
                  <SummaryRow label={lang === "hi" ? "\u0906\u0917\u092E\u0928 \u0938\u092E\u092F" : "Arrival Time"} value={form.expected_arrival_time} />
                  <SummaryRow label={lang === "hi" ? "प्रस्थान समय" : "Departure Time"} value={form.expected_departure_time} />
                  {form.travel_mode && <SummaryRow label={lang === "hi" ? "यात्रा माध्यम" : "Travel Mode"} value={form.travel_mode} />}
                  {form.travel_details && <SummaryRow label={lang === "hi" ? "यात्रा विवरण" : "Travel Details"} value={form.travel_details} />}
                </div>

                <div className="border-t border-[#D4AF37]/10 pt-3">
                  <SummaryRow label={lang === "hi" ? "\u092A\u0924\u093E" : "Address"}
                    value={[form.address.full_address, form.address.city, form.address.state, form.address.country].filter(Boolean).join(", ")} />
                  {form.reference_person_id && (
                    <SummaryRow label={lang === "hi" ? "\u0938\u0902\u0926\u0930\u094D\u092D" : "Reference"}
                      value={refPersons.find(p => p.id === form.reference_person_id)?.name || form.reference_person_id} />
                  )}
                  {form.relation_category && <SummaryRow label={lang === "hi" ? "\u0938\u092E\u094D\u092C\u0928\u094D\u0927" : "Relation with Reference Person"} value={form.relation_category} />}
                </div>
              </div>

              {/* Consent */}
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${errors.consent ? "border-red-400 bg-red-50" : "border-[#D4AF37]/20 bg-[#F8F1E5]/30"}`}>
                <Checkbox id="consent" checked={form.consent} onCheckedChange={v => set("consent", v)} data-testid="consent-checkbox" className="mt-0.5" />
                <label htmlFor="consent" className="text-sm text-[#0B1C3D]/70 cursor-pointer">
                  {t.register.consent}
                  {" "}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline underline-offset-2 hover:text-[#B8860B]" data-testid="consent-privacy-link">Privacy Policy</a>
                </label>
              </div>

              <Button onClick={handleSubmit} disabled={submitting || !form.consent} data-testid="submit-registration-btn"
                className="w-full bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90 py-3 text-base font-bold">
                {submitting
                  ? (lang === "hi" ? "\u091C\u092E\u093E \u0939\u094B \u0930\u0939\u093E \u0939\u0948..." : "Submitting...")
                  : isEditMode
                    ? (lang === "hi" ? "\u092A\u0902\u091C\u0940\u0915\u0930\u0923 \u0905\u092A\u0921\u0947\u091F \u0915\u0930\u0947\u0902" : "Update Registration")
                    : t.register.submit}
              </Button>
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 3 && (
            <div className="flex justify-between mt-6 pt-5 border-t border-[#D4AF37]/10">
              {step > 0 ? (
                <Button onClick={handlePrev} variant="outline" className="border-[#D4AF37]/30 text-[#0B1C3D] hover:bg-[#D4AF37]/10" data-testid="form-prev-btn">
                  <ArrowLeft size={16} className="mr-2" /> {t.register.previous}
                </Button>
              ) : <div />}
              <Button onClick={handleNext} className="bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90" data-testid="form-next-btn">
                {t.register.next} <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1">
      <span className="text-[#0B1C3D]/50 shrink-0 w-32">{label}:</span>
      <span className="text-[#0B1C3D] font-medium">{value}</span>
    </div>
  );
}
