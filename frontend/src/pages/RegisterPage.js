import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronLeft, CalendarIcon, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLang } from "@/context/LanguageContext";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const initial = {
  full_name: "", mobile: "", additional_phone: "", email: "", address: "",
  attendance_intent: "Yes", arrival_date: "", departure_date: "",
  num_people: 1,
  attendees: [{ name: "", category: "Adult", special_needs: "" }],
  message: "", consent: false,
};

function DatePicker({ value, onChange, label, testId }) {
  const [open, setOpen] = useState(false);
  const dateVal = value ? new Date(value) : undefined;
  return (
    <div>
      <Label className="text-[#0B1C3D]/70 text-sm mb-1.5 block">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" data-testid={testId} className="w-full justify-start text-left font-normal bg-white border-[#D4AF37]/20 hover:border-[#D4AF37]/40">
            <CalendarIcon className="mr-2 h-4 w-4 text-[#D4AF37]" />
            {value ? format(dateVal, "PPP") : "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={dateVal} onSelect={(d) => { onChange(d ? d.toISOString().split("T")[0] : ""); setOpen(false); }} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function RegisterPage() {
  const { t, lang, toggleLang } = useLang();
  const navigate = useNavigate();
  const STEPS = t.register.steps;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => { document.title = "Register - Shrimad Bhagwat Katha Gyan Yajna 2026"; }, []);

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: undefined })); };

  // When num_people changes, auto-generate attendee slots
  const handleNumPeopleChange = (val) => {
    const num = Math.max(1, Math.min(50, parseInt(val) || 1));
    set("num_people", num);
    setForm(f => {
      const existing = f.attendees;
      const newAttendees = Array.from({ length: num }, (_, i) =>
        existing[i] || { name: "", category: "Adult", special_needs: "" }
      );
      return { ...f, num_people: num, attendees: newAttendees };
    });
  };

  const setAttendee = (idx, key, val) => {
    setForm(f => { const atts = [...f.attendees]; atts[idx] = { ...atts[idx], [key]: val }; return { ...f, attendees: atts }; });
  };

  const validate = () => {
    const errs = {};
    if (step === 0) {
      if (!form.full_name.trim()) errs.full_name = true;
      if (!form.mobile.trim()) errs.mobile = true;
      else if (!/^[\d\s+\-()]{7,15}$/.test(form.mobile.trim())) errs.mobile_format = true;
      if (!form.address.trim()) errs.address = true;
    }
    if (step === 1) {
      if (!form.arrival_date) errs.arrival_date = true;
      if (!form.departure_date) errs.departure_date = true;
      if (!form.num_people || form.num_people < 1) errs.num_people = true;
    }
    if (step === 2) {
      if (!form.consent) errs.consent = true;
      const incomplete = form.attendees.filter(a => !a.name.trim());
      if (incomplete.length > 0) {
        errs.attendees_incomplete = true;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => { if (validate()) setStep(s => s + 1); };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = { ...form };
      const res = await axios.post(`${API}/registrations`, payload);
      toast.success(lang === "hi" ? "पंजीकरण सफल!" : "Registration submitted successfully!");
      navigate("/thank-you", { state: { name: form.full_name, people: form.num_people, id: res.data?.id || "" } });
    } catch {
      toast.error(lang === "hi" ? "पंजीकरण विफल। पुनः प्रयास करें।" : "Failed to submit. Please try again.");
    } finally { setSubmitting(false); }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[#F8F1E5] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1" data-testid="back-to-home">
              <ChevronLeft size={16} /> {t.register.backHome}
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.register.pageTitle}</h1>
          <p className="text-[#0B1C3D]/50 text-sm mt-2">
            {lang === "hi" ? `चरण ${step + 1} / ${STEPS.length}: ${STEPS[step]}` : `Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
          </p>
          <button
            onClick={toggleLang}
            data-testid="form-lang-toggle"
            className="mt-3 flex items-center gap-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/50"
          >
            <Globe size={14} className="text-[#D4AF37]" />
            <span className="text-[#D4AF37]">{lang === "en" ? "हिंदी" : "English"}</span>
            <span className="text-[#D4AF37]/40 text-[10px]">{lang === "en" ? "/ भाषा बदलें" : "/ Change Language"}</span>
          </button>
        </div>

        <div className="mb-8" data-testid="form-progress">
          <Progress value={progress} className="h-2 bg-[#D4AF37]/10" />
          <div className="flex justify-between mt-2">
            {STEPS.map((s, i) => (
              <span key={i} className={`text-xs ${i <= step ? "text-[#D4AF37] font-semibold" : "text-[#0B1C3D]/30"}`}>{i + 1}. {s}</span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D4AF37]/20 sacred-border form-sacred" data-testid="registration-form">

          {/* Step 1: Contact Info */}
          {step === 0 && (
            <div className="space-y-5" data-testid="form-step-1">
              <h3 className="text-xl font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.register.step1Title}</h3>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">{t.register.fullName} *</Label>
                <Input data-testid="input-full-name" value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder={lang === "hi" ? "आपका पूरा नाम" : "Enter your full name"} className={`mt-1.5 bg-white border-[#D4AF37]/20 focus:border-[#D4AF37] ${errors.full_name ? "border-red-400" : ""}`} />
                {errors.full_name && <p className="text-red-500 text-xs mt-1">{lang === "hi" ? "नाम आवश्यक है" : "Name is required"}</p>}
              </div>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">{t.register.mobile} *</Label>
                <Input data-testid="input-mobile" value={form.mobile} onChange={e => set("mobile", e.target.value)} placeholder="+91 XXXXX XXXXX" className={`mt-1.5 bg-white border-[#D4AF37]/20 ${errors.mobile || errors.mobile_format ? "border-red-400" : ""}`} />
                {errors.mobile && <p className="text-red-500 text-xs mt-1">{lang === "hi" ? "मोबाइल नंबर आवश्यक है" : "Mobile number is required"}</p>}
                {errors.mobile_format && <p className="text-red-500 text-xs mt-1">{lang === "hi" ? "कृपया सही मोबाइल नंबर दर्ज करें" : "Please enter a valid mobile number"}</p>}
              </div>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">{t.register.additionalPhone}</Label>
                <Input data-testid="input-additional-phone" value={form.additional_phone} onChange={e => set("additional_phone", e.target.value)} placeholder={lang === "hi" ? "अतिरिक्त फोन नंबर" : "Additional phone number"} className="mt-1.5 bg-white border-[#D4AF37]/20" />
              </div>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">{t.register.email}</Label>
                <Input data-testid="input-email" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="your@email.com" className="mt-1.5 bg-white border-[#D4AF37]/20" />
              </div>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">{t.register.address}</Label>
                <Input data-testid="input-address" value={form.address} onChange={e => set("address", e.target.value)} placeholder={lang === "hi" ? "पता" : "Address"} className={`mt-1.5 bg-white border-[#D4AF37]/20 ${errors.address ? "border-red-400" : ""}`} />
                {errors.address && <p className="text-red-500 text-xs mt-1">{lang === "hi" ? "पता आवश्यक है" : "Address is required"}</p>}
              </div>
            </div>
          )}

          {/* Step 2: Attendance + Travel (arrival/departure REQUIRED, num_people here) */}
          {step === 1 && (
            <div className="space-y-5" data-testid="form-step-2">
              <h3 className="text-xl font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.register.step2Title}</h3>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm mb-3 block">{t.register.willAttend}</Label>
                <RadioGroup value={form.attendance_intent} onValueChange={v => set("attendance_intent", v)} className="flex gap-4 flex-wrap">
                  {[["Yes", t.register.attendYes], ["Most Probably", t.register.attendMostProbably], ["Maybe", t.register.attendMaybe]].map(([val, label]) => (
                    <div key={val} className="flex items-center gap-2">
                      <RadioGroupItem value={val} data-testid={`radio-attend-${val.toLowerCase().replace(" ", "-")}`} />
                      <Label>{label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <DatePicker label={t.register.arrivalDate} value={form.arrival_date} onChange={v => set("arrival_date", v)} testId="input-arrival-date" />
                  {errors.arrival_date && <p className="text-red-500 text-xs mt-1">{lang === "hi" ? "आगमन तिथि आवश्यक है" : "Arrival date is required"}</p>}
                </div>
                <div>
                  <DatePicker label={t.register.departureDate} value={form.departure_date} onChange={v => set("departure_date", v)} testId="input-departure-date" />
                  {errors.departure_date && <p className="text-red-500 text-xs mt-1">{lang === "hi" ? "प्रस्थान तिथि आवश्यक है" : "Departure date is required"}</p>}
                </div>
              </div>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">{t.register.numPeople}</Label>
                <Input data-testid="input-num-people" type="number" min={1} max={50} value={form.num_people} onChange={e => handleNumPeopleChange(e.target.value)} className={`mt-1.5 bg-white border-[#D4AF37]/20 max-w-[180px] ${errors.num_people ? "border-red-400" : ""}`} />
                {errors.num_people && <p className="text-red-500 text-xs mt-1">{lang === "hi" ? "व्यक्तियों की संख्या आवश्यक है" : "Number of people is required"}</p>}
              </div>
            </div>
          )}

          {/* Step 3: Attendee Details (dynamically generated from num_people) */}
          {step === 2 && (
            <div className="space-y-5" data-testid="form-step-3">
              <h3 className="text-xl font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.register.step3Title}</h3>

              <p className="text-[#0B1C3D]/50 text-sm mb-2">
                {lang === "hi" ? `कृपया ${form.num_people} सदस्यों का विवरण दें:` : `Please provide details for ${form.num_people} attendee${form.num_people > 1 ? "s" : ""}:`}
              </p>

              {errors.attendees_incomplete && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm" data-testid="attendees-error">
                  {lang === "hi"
                    ? `आपने पहले ${form.num_people} सदस्यों की संख्या चुनी है। कृपया सभी सदस्यों का विवरण भरें या वापस जाकर संख्या बदलें।`
                    : `You have selected ${form.num_people} number of attendees previously. Please fill all details or go back and update the number of attendees.`}
                </div>
              )}

              {form.attendees.map((att, i) => (
                <div key={i} className="border border-[#D4AF37]/10 rounded-xl p-4 space-y-3 bg-[#F8F1E5]/30" data-testid={`attendee-block-${i}`}>
                  <span className="text-sm font-medium text-[#D4AF37]">{lang === "hi" ? `व्यक्ति ${i + 1}` : `Person ${i + 1}`}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input data-testid={`attendee-name-${i}`} placeholder={t.register.attendeeName} value={att.name} onChange={e => setAttendee(i, "name", e.target.value)} className="bg-white border-[#D4AF37]/20" />
                    <Select value={att.category} onValueChange={v => setAttendee(i, "category", v)}>
                      <SelectTrigger data-testid={`attendee-category-${i}`} className="bg-white border-[#D4AF37]/20"><SelectValue placeholder={t.register.attendeeCategory} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Adult">{t.register.adult}</SelectItem>
                        <SelectItem value="Child">{t.register.child}</SelectItem>
                        <SelectItem value="Senior">{t.register.senior}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input data-testid={`attendee-needs-${i}`} placeholder={t.register.specialNeeds} value={att.special_needs} onChange={e => setAttendee(i, "special_needs", e.target.value)} className="bg-white border-[#D4AF37]/20" />
                  </div>
                </div>
              ))}

              {/* Message */}
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">{t.register.message}</Label>
                <Textarea data-testid="input-message" value={form.message} onChange={e => set("message", e.target.value)} placeholder={lang === "hi" ? "कोई विशेष अनुरोध..." : "Any special request..."} className="mt-1.5 bg-white border-[#D4AF37]/20 min-h-[80px]" />
              </div>

              {/* Consent */}
              <div className={`flex items-start gap-3 rounded-xl p-4 border ${errors.consent ? "bg-red-50 border-red-200" : "bg-[#D4AF37]/5 border-[#D4AF37]/10"}`}>
                <Checkbox checked={form.consent} onCheckedChange={v => set("consent", v)} data-testid="check-consent" className="mt-0.5" />
                <Label className="text-sm text-[#0B1C3D]/70 leading-relaxed cursor-pointer" onClick={() => set("consent", !form.consent)}>
                  {t.register.consent}
                </Label>
              </div>
              {errors.consent && <p className="text-red-500 text-xs">{lang === "hi" ? "कृपया सहमति दें" : "Please confirm consent"}</p>}

              {/* Summary */}
              <div className="bg-[#F8F1E5] rounded-xl p-5 border border-[#D4AF37]/15" data-testid="registration-summary">
                <h4 className="text-base font-bold text-[#0B1C3D] mb-4 pb-2 border-b border-[#D4AF37]/20" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {lang === "hi" ? "पंजीकरण सारांश" : "Registration Summary"}
                </h4>
                <div className="mb-4">
                  <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-2">{t.register.step1Title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{t.register.fullName}:</span><span className="text-[#0B1C3D] font-medium">{form.full_name || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{t.register.mobile}:</span><span className="text-[#0B1C3D] font-medium">{form.mobile || "-"}</span></div>
                    {form.email && <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{lang === "hi" ? "ईमेल" : "Email"}:</span><span className="text-[#0B1C3D] font-medium">{form.email}</span></div>}
                    {form.address && <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{lang === "hi" ? "पता" : "Address"}:</span><span className="text-[#0B1C3D] font-medium">{form.address}</span></div>}
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-2">{t.register.step2Title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{t.register.willAttend}:</span><span className="text-[#0B1C3D] font-medium">{form.attendance_intent}</span></div>
                    <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{t.register.numPeople}:</span><span className="text-[#0B1C3D] font-medium">{form.num_people}</span></div>
                    {form.arrival_date && <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{lang === "hi" ? "आगमन" : "Arrival"}:</span><span className="text-[#0B1C3D] font-medium">{form.arrival_date}</span></div>}
                    {form.departure_date && <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{lang === "hi" ? "प्रस्थान" : "Departure"}:</span><span className="text-[#0B1C3D] font-medium">{form.departure_date}</span></div>}
                  </div>
                </div>
                {form.attendees.filter(a => a.name).length > 0 && (
                  <div>
                    <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-2">{t.register.step3Title}</p>
                    {form.attendees.filter(a => a.name).map((att, i) => (
                      <p key={i} className="text-sm text-[#0B1C3D]">
                        {att.name} <span className="text-[#0B1C3D]/40">({att.category})</span>
                        {att.special_needs && <span className="text-[#E67E22] text-xs ml-1">- {att.special_needs}</span>}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-[#D4AF37]/10">
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}
              className="border-[#D4AF37]/30 text-[#0B1C3D] hover:bg-[#D4AF37]/10" data-testid="form-prev-btn">
              <ArrowLeft size={16} className="mr-1" /> {t.register.previous}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={handleNext} className="bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90 font-semibold" data-testid="form-next-btn">
                {t.register.next} <ArrowRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}
                className="bg-[#E67E22] hover:bg-[#E67E22]/90 text-white font-bold text-base px-8 py-3 shadow-lg shadow-[#E67E22]/30" data-testid="form-submit-btn">
                {submitting ? t.register.submitting : t.register.submit}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
