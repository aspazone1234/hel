import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Plus, Trash2, CalendarIcon, MessageCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLang } from "@/context/LanguageContext";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const DAYS = ["28 May", "29 May", "30 May", "31 May", "1 June", "2 June", "3 June"];

const initial = {
  full_name: "", mobile: "", email: "", city: "", country: "",
  attendance_intent: "Yes", arrival_date: "", departure_date: "",
  days_attending: [],
  num_people: 1,
  attendees: [{ name: "", category: "Adult", special_needs: "" }],
  need_accommodation: true,
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
  const STEPS = t.register.steps;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => { document.title = "Register - Shrimad Bhagwat Katha Gyan Yajna 2026"; }, []);

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: undefined })); };
  const toggleDay = (day) => {
    setForm(f => ({ ...f, days_attending: f.days_attending.includes(day) ? f.days_attending.filter(d => d !== day) : [...f.days_attending, day] }));
  };
  const setAttendee = (idx, key, val) => {
    setForm(f => { const atts = [...f.attendees]; atts[idx] = { ...atts[idx], [key]: val }; return { ...f, attendees: atts }; });
  };
  const addAttendee = () => setForm(f => ({ ...f, attendees: [...f.attendees, { name: "", category: "Adult", special_needs: "" }] }));
  const removeAttendee = (idx) => setForm(f => ({ ...f, attendees: f.attendees.filter((_, i) => i !== idx) }));

  const validate = () => {
    const errs = {};
    if (step === 0) {
      if (!form.full_name.trim()) errs.full_name = true;
      if (!form.mobile.trim()) errs.mobile = true;
      else if (!/^[\d\s+\-()]{7,15}$/.test(form.mobile.trim())) errs.mobile_format = true;
    }
    if (step === 2 && !form.consent) errs.consent = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => { if (validate()) setStep(s => s + 1); };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = { ...form, arrival_time: "", room_type: "", num_rooms: 0 };
      await axios.post(`${API}/registrations`, payload);
      setSubmitted(true);
      toast.success(lang === "hi" ? "पंजीकरण सफल!" : "Registration submitted successfully!");
    } catch {
      toast.error(lang === "hi" ? "पंजीकरण विफल। पुनः प्रयास करें।" : "Failed to submit. Please try again.");
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    const whatsappMsg = `Jai Shri Krishna! New Registration for Bhagwat Katha 2026:%0A%0AName: ${form.full_name}%0AMobile: ${form.mobile}%0ACity: ${form.city || 'N/A'}%0AAttendance: ${form.attendance_intent}%0ATotal People: ${form.num_people}%0AAccommodation: ${form.need_accommodation ? 'Yes' : 'No'}%0A%0ARegistered via Katha Website`;
    const whatsappUrl = `https://wa.me/919825423650?text=${whatsappMsg}`;

    return (
      <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-[#D4AF37]/20 max-w-lg w-full text-center sacred-border" data-testid="registration-success">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"><Check size={32} className="text-green-600" /></div>
          <h2 className="text-3xl font-bold text-[#0B1C3D] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.register.successTitle}</h2>
          <p className="text-[#0B1C3D]/60 mb-6">{t.register.successMsg}</p>
          <div className="bg-[#F8F1E5] rounded-xl p-4 border border-[#D4AF37]/10 mb-6">
            <p className="text-[#0B1C3D]/60 text-sm mb-3">{lang === "hi" ? "WhatsApp द्वारा आयोजक को सूचित करें:" : "Notify the organizer via WhatsApp:"}</p>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" data-testid="whatsapp-notify-btn"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#25D366]/90 transition-all shadow-md">
              <MessageCircle size={18} /> {t.register.whatsappNotify}
            </a>
          </div>
          <Link to="/" className="bg-[#D4AF37] text-[#0B1C3D] px-8 py-3 rounded-full font-semibold hover:bg-[#D4AF37]/90 transition-all inline-block" data-testid="back-home-btn">
            {t.register.backHome}
          </Link>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[#F8F1E5] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1" data-testid="back-to-home">
              <ChevronLeft size={16} /> {t.register.backHome}
            </Link>
            <button
              onClick={toggleLang}
              data-testid="form-lang-toggle"
              className="flex items-center gap-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/50"
            >
              <Globe size={14} className="text-[#D4AF37]" />
              <span className="text-[#D4AF37]">{lang === "en" ? "हिंदी" : "English"}</span>
            </button>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.register.pageTitle}</h1>
          <p className="text-[#0B1C3D]/50 text-sm mt-2">
            {lang === "hi" ? `चरण ${step + 1} / ${STEPS.length}: ${STEPS[step]}` : `Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
          </p>
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

          {/* Step 1: Contact Info (unchanged) */}
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
                <Label className="text-[#0B1C3D]/70 text-sm">{t.register.email}</Label>
                <Input data-testid="input-email" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="your@email.com" className="mt-1.5 bg-white border-[#D4AF37]/20" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#0B1C3D]/70 text-sm">{t.register.city}</Label>
                  <Input data-testid="input-city" value={form.city} onChange={e => set("city", e.target.value)} placeholder={lang === "hi" ? "शहर" : "City"} className="mt-1.5 bg-white border-[#D4AF37]/20" />
                </div>
                <div>
                  <Label className="text-[#0B1C3D]/70 text-sm">{t.register.country}</Label>
                  <Input data-testid="input-country" value={form.country} onChange={e => set("country", e.target.value)} placeholder={lang === "hi" ? "देश" : "Country"} className="mt-1.5 bg-white border-[#D4AF37]/20" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Attendance (REMOVED: arrival_time, num_people) */}
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
                <DatePicker label={t.register.arrivalDate} value={form.arrival_date} onChange={v => set("arrival_date", v)} testId="input-arrival-date" />
                <DatePicker label={t.register.departureDate} value={form.departure_date} onChange={v => set("departure_date", v)} testId="input-departure-date" />
              </div>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm mb-3 block">{t.register.daysAttending}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DAYS.map(day => (
                    <div key={day} className="flex items-center gap-2">
                      <Checkbox checked={form.days_attending.includes(day)} onCheckedChange={() => toggleDay(day)} data-testid={`check-day-${day.replace(" ", "-")}`} />
                      <Label className="text-sm cursor-pointer">{day}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Attendees + Accommodation (num_people FIRST, accommodation default ON, no room fields) */}
          {step === 2 && (
            <div className="space-y-5" data-testid="form-step-3">
              <h3 className="text-xl font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.register.step3Title}</h3>

              {/* Number of People - FIRST FIELD */}
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">{t.register.numPeople}</Label>
                <Input data-testid="input-num-people" type="number" min={1} value={form.num_people} onChange={e => set("num_people", Math.max(1, parseInt(e.target.value) || 1))} className="mt-1.5 bg-white border-[#D4AF37]/20 max-w-[150px]" />
              </div>

              {/* Attendees */}
              {form.attendees.map((att, i) => (
                <div key={i} className="border border-[#D4AF37]/10 rounded-xl p-4 space-y-3 bg-[#F8F1E5]/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-[#D4AF37]">{lang === "hi" ? `व्यक्ति ${i + 1}` : `Person ${i + 1}`}</span>
                    {form.attendees.length > 1 && (
                      <button onClick={() => removeAttendee(i)} className="text-red-400 hover:text-red-600 p-1" data-testid={`remove-attendee-${i}`}><Trash2 size={14} /></button>
                    )}
                  </div>
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
              <Button variant="outline" onClick={addAttendee} className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10" data-testid="add-attendee-btn">
                <Plus size={16} className="mr-1" /> {t.register.addPerson}
              </Button>

              {/* Accommodation - Simple Toggle, default ON */}
              <div className="border-t border-[#D4AF37]/10 pt-5 mt-5">
                <div className="flex items-center gap-3">
                  <Switch checked={form.need_accommodation} onCheckedChange={v => set("need_accommodation", v)} data-testid="switch-accommodation" />
                  <Label className="text-base font-medium">{t.register.accommodation}</Label>
                </div>
              </div>

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

              {/* Full Detailed Summary */}
              <div className="bg-[#F8F1E5] rounded-xl p-5 border border-[#D4AF37]/15" data-testid="registration-summary">
                <h4 className="text-base font-bold text-[#0B1C3D] mb-4 pb-2 border-b border-[#D4AF37]/20" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {lang === "hi" ? "पंजीकरण सारांश" : "Registration Summary"}
                </h4>

                {/* Part 1 Summary */}
                <div className="mb-4">
                  <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-2">{t.register.step1Title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{t.register.fullName}:</span><span className="text-[#0B1C3D] font-medium">{form.full_name || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{t.register.mobile}:</span><span className="text-[#0B1C3D] font-medium">{form.mobile || "-"}</span></div>
                    {form.email && <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{lang === "hi" ? "ईमेल" : "Email"}:</span><span className="text-[#0B1C3D] font-medium">{form.email}</span></div>}
                    {form.city && <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{lang === "hi" ? "शहर" : "City"}:</span><span className="text-[#0B1C3D] font-medium">{form.city}</span></div>}
                    {form.country && <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{lang === "hi" ? "देश" : "Country"}:</span><span className="text-[#0B1C3D] font-medium">{form.country}</span></div>}
                  </div>
                </div>

                {/* Part 2 Summary */}
                <div className="mb-4">
                  <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-2">{t.register.step2Title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{t.register.willAttend}:</span><span className="text-[#0B1C3D] font-medium">{form.attendance_intent}</span></div>
                    {form.arrival_date && <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{t.register.arrivalDate}:</span><span className="text-[#0B1C3D] font-medium">{form.arrival_date}</span></div>}
                    {form.departure_date && <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{t.register.departureDate}:</span><span className="text-[#0B1C3D] font-medium">{form.departure_date}</span></div>}
                    {form.days_attending.length > 0 && <div className="flex justify-between col-span-full"><span className="text-[#0B1C3D]/50">{t.register.daysAttending}:</span><span className="text-[#0B1C3D] font-medium">{form.days_attending.join(", ")}</span></div>}
                  </div>
                </div>

                {/* Part 3 Summary */}
                <div>
                  <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-2">{t.register.step3Title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{t.register.numPeople}:</span><span className="text-[#0B1C3D] font-medium">{form.num_people}</span></div>
                    <div className="flex justify-between"><span className="text-[#0B1C3D]/50">{t.register.accommodation}:</span><span className="text-[#0B1C3D] font-medium">{form.need_accommodation ? (lang === "hi" ? "हाँ" : "Yes") : (lang === "hi" ? "नहीं" : "No")}</span></div>
                  </div>
                  {form.attendees.filter(a => a.name).length > 0 && (
                    <div className="mt-2">
                      <p className="text-[#0B1C3D]/50 text-xs mb-1">{lang === "hi" ? "सदस्य:" : "Attendees:"}</p>
                      {form.attendees.filter(a => a.name).map((att, i) => (
                        <p key={i} className="text-sm text-[#0B1C3D]">
                          {att.name} <span className="text-[#0B1C3D]/40">({att.category})</span>
                          {att.special_needs && <span className="text-[#E67E22] text-xs ml-1">- {att.special_needs}</span>}
                        </p>
                      ))}
                    </div>
                  )}
                  {form.message && (
                    <div className="mt-2">
                      <p className="text-[#0B1C3D]/50 text-xs">{t.register.message}:</p>
                      <p className="text-sm text-[#0B1C3D] italic">{form.message}</p>
                    </div>
                  )}
                </div>
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
