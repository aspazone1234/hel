import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Plus, Trash2, CalendarIcon } from "lucide-react";
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
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEPS = [
  "Contact Info", "Attendance", "Number of People", "Attendee Details",
  "Accommodation", "Food Preferences", "Travel Info", "Final"
];

const DAYS = ["28 May", "29 May", "30 May", "31 May", "1 June", "2 June", "3 June"];

const initial = {
  full_name: "", mobile: "", whatsapp: "", email: "", city_country: "",
  will_attend: "Yes", arrival_date: "", departure_date: "", days_attending: [],
  adults: 1, children: 0, senior_citizens: 0, attendee_details: [{ name: "", age: "", gender: "", special_needs: "" }],
  need_accommodation: false, room_type: "", ac_preference: "", num_rooms: 0, check_in: "", check_out: "",
  num_meals: 0, jain_food: false, no_onion_garlic: false, allergies: "",
  travel_mode: "", arrival_time: "", pickup_required: false, parking_needed: false,
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
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { document.title = "Register - Shrimad Bhagavat Katha Mahotsav 2026"; }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      days_attending: f.days_attending.includes(day) ? f.days_attending.filter(d => d !== day) : [...f.days_attending, day]
    }));
  };

  const setAttendee = (idx, key, val) => {
    setForm(f => {
      const details = [...f.attendee_details];
      details[idx] = { ...details[idx], [key]: val };
      return { ...f, attendee_details: details };
    });
  };
  const addAttendee = () => setForm(f => ({ ...f, attendee_details: [...f.attendee_details, { name: "", age: "", gender: "", special_needs: "" }] }));
  const removeAttendee = (idx) => setForm(f => ({ ...f, attendee_details: f.attendee_details.filter((_, i) => i !== idx) }));

  const totalPeople = form.adults + form.children + form.senior_citizens;

  useEffect(() => {
    if (step === 3) {
      setForm(f => {
        const needed = Math.max(totalPeople, 1);
        const current = f.attendee_details.length;
        if (current < needed) {
          return { ...f, attendee_details: [...f.attendee_details, ...Array(needed - current).fill(null).map(() => ({ name: "", age: "", gender: "", special_needs: "" }))] };
        }
        return f;
      });
    }
  }, [step, totalPeople]);

  const canNext = () => {
    if (step === 0) return form.full_name.trim() && form.mobile.trim();
    if (step === 7) return form.consent;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/registrations`, form);
      setSubmitted(true);
      toast.success("Registration submitted successfully!");
    } catch (e) {
      toast.error("Failed to submit registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-[#D4AF37]/20 max-w-lg w-full text-center sacred-border" data-testid="registration-success">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-[#0B1C3D] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Registration Complete
          </h2>
          <p className="text-[#0B1C3D]/60 mb-6">Thank you, {form.full_name}! Your attendance has been registered. We look forward to your presence at the Katha Mahotsav.</p>
          <p className="text-[#E67E22] text-sm mb-8">All arrangements will be guided post registration.</p>
          <Link to="/" className="bg-[#D4AF37] text-[#0B1C3D] px-8 py-3 rounded-full font-semibold hover:bg-[#D4AF37]/90 transition-all inline-block">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[#F8F1E5] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1 mb-4" data-testid="back-to-home">
            <ChevronLeft size={16} /> Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Register Your Attendance
          </h1>
          <p className="text-[#0B1C3D]/50 text-sm mt-2">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8" data-testid="form-progress">
          <Progress value={progress} className="h-2 bg-[#D4AF37]/10" />
          <div className="flex justify-between mt-2">
            {STEPS.map((s, i) => (
              <span key={i} className={`text-[10px] sm:text-xs ${i <= step ? "text-[#D4AF37]" : "text-[#0B1C3D]/30"} hidden sm:block`}>
                {i + 1}
              </span>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D4AF37]/20 sacred-border form-sacred" data-testid="registration-form">
          {/* Step 1: Contact Info */}
          {step === 0 && (
            <div className="space-y-5" data-testid="form-step-1">
              <h3 className="text-xl font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Contact Information</h3>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">Full Name *</Label>
                <Input data-testid="input-full-name" value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Enter your full name" className="mt-1.5 bg-white border-[#D4AF37]/20 focus:border-[#D4AF37]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#0B1C3D]/70 text-sm">Mobile *</Label>
                  <Input data-testid="input-mobile" value={form.mobile} onChange={e => set("mobile", e.target.value)} placeholder="+91 XXXXX XXXXX" className="mt-1.5 bg-white border-[#D4AF37]/20" />
                </div>
                <div>
                  <Label className="text-[#0B1C3D]/70 text-sm">WhatsApp</Label>
                  <Input data-testid="input-whatsapp" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="WhatsApp number" className="mt-1.5 bg-white border-[#D4AF37]/20" />
                </div>
              </div>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">Email</Label>
                <Input data-testid="input-email" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="your@email.com" className="mt-1.5 bg-white border-[#D4AF37]/20" />
              </div>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">City / Country</Label>
                <Input data-testid="input-city" value={form.city_country} onChange={e => set("city_country", e.target.value)} placeholder="City, Country" className="mt-1.5 bg-white border-[#D4AF37]/20" />
              </div>
            </div>
          )}

          {/* Step 2: Attendance */}
          {step === 1 && (
            <div className="space-y-5" data-testid="form-step-2">
              <h3 className="text-xl font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Attendance Details</h3>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm mb-3 block">Will you attend?</Label>
                <RadioGroup value={form.will_attend} onValueChange={v => set("will_attend", v)} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="Yes" data-testid="radio-attend-yes" />
                    <Label>Yes</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="Maybe" data-testid="radio-attend-maybe" />
                    <Label>Maybe</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DatePicker label="Arrival Date" value={form.arrival_date} onChange={v => set("arrival_date", v)} testId="input-arrival-date" />
                <DatePicker label="Departure Date" value={form.departure_date} onChange={v => set("departure_date", v)} testId="input-departure-date" />
              </div>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm mb-3 block">Days Attending</Label>
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

          {/* Step 3: Number of People */}
          {step === 2 && (
            <div className="space-y-5" data-testid="form-step-3">
              <h3 className="text-xl font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Number of People</h3>
              {[["adults", "Adults", 1], ["children", "Children", 0], ["senior_citizens", "Senior Citizens", 0]].map(([key, label, min]) => (
                <div key={key}>
                  <Label className="text-[#0B1C3D]/70 text-sm">{label}</Label>
                  <Input data-testid={`input-${key}`} type="number" min={min} value={form[key]} onChange={e => set(key, Math.max(min, parseInt(e.target.value) || 0))} className="mt-1.5 bg-white border-[#D4AF37]/20 max-w-[150px]" />
                </div>
              ))}
              <p className="text-[#D4AF37] text-sm font-medium">Total: {totalPeople} {totalPeople === 1 ? "person" : "people"}</p>
            </div>
          )}

          {/* Step 4: Attendee Details */}
          {step === 3 && (
            <div className="space-y-5" data-testid="form-step-4">
              <h3 className="text-xl font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Attendee Details</h3>
              {form.attendee_details.map((att, i) => (
                <div key={i} className="border border-[#D4AF37]/10 rounded-xl p-4 space-y-3 bg-[#F8F1E5]/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-[#D4AF37]">Person {i + 1}</span>
                    {form.attendee_details.length > 1 && (
                      <button onClick={() => removeAttendee(i)} className="text-red-400 hover:text-red-600 p-1" data-testid={`remove-attendee-${i}`}><Trash2 size={14} /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input data-testid={`attendee-name-${i}`} placeholder="Name" value={att.name} onChange={e => setAttendee(i, "name", e.target.value)} className="bg-white border-[#D4AF37]/20" />
                    <Input data-testid={`attendee-age-${i}`} placeholder="Age" type="number" value={att.age} onChange={e => setAttendee(i, "age", e.target.value)} className="bg-white border-[#D4AF37]/20" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select value={att.gender} onValueChange={v => setAttendee(i, "gender", v)}>
                      <SelectTrigger data-testid={`attendee-gender-${i}`} className="bg-white border-[#D4AF37]/20"><SelectValue placeholder="Gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input data-testid={`attendee-needs-${i}`} placeholder="Special needs (if any)" value={att.special_needs} onChange={e => setAttendee(i, "special_needs", e.target.value)} className="bg-white border-[#D4AF37]/20" />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addAttendee} className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10" data-testid="add-attendee-btn">
                <Plus size={16} className="mr-1" /> Add Person
              </Button>
            </div>
          )}

          {/* Step 5: Accommodation */}
          {step === 4 && (
            <div className="space-y-5" data-testid="form-step-5">
              <h3 className="text-xl font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Accommodation</h3>
              <div className="flex items-center gap-3">
                <Switch checked={form.need_accommodation} onCheckedChange={v => set("need_accommodation", v)} data-testid="switch-accommodation" />
                <Label>Need accommodation?</Label>
              </div>
              {form.need_accommodation && (
                <div className="space-y-4 animate-[fade-in-up_0.3s_ease]">
                  <div>
                    <Label className="text-[#0B1C3D]/70 text-sm">Room Type</Label>
                    <Select value={form.room_type} onValueChange={v => set("room_type", v)}>
                      <SelectTrigger data-testid="select-room-type" className="mt-1.5 bg-white border-[#D4AF37]/20"><SelectValue placeholder="Select room type" /></SelectTrigger>
                      <SelectContent>
                        {["Single", "Double", "Family", "Dormitory"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[#0B1C3D]/70 text-sm">AC Preference</Label>
                    <Select value={form.ac_preference} onValueChange={v => set("ac_preference", v)}>
                      <SelectTrigger data-testid="select-ac" className="mt-1.5 bg-white border-[#D4AF37]/20"><SelectValue placeholder="Select preference" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AC">AC</SelectItem>
                        <SelectItem value="Non-AC">Non-AC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[#0B1C3D]/70 text-sm">Number of Rooms</Label>
                    <Input data-testid="input-num-rooms" type="number" min={0} value={form.num_rooms} onChange={e => set("num_rooms", Math.max(0, parseInt(e.target.value) || 0))} className="mt-1.5 bg-white border-[#D4AF37]/20 max-w-[150px]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DatePicker label="Check-in" value={form.check_in} onChange={v => set("check_in", v)} testId="input-check-in" />
                    <DatePicker label="Check-out" value={form.check_out} onChange={v => set("check_out", v)} testId="input-check-out" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Food */}
          {step === 5 && (
            <div className="space-y-5" data-testid="form-step-6">
              <h3 className="text-xl font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Food Preferences</h3>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">Number of Meals (per day)</Label>
                <Input data-testid="input-num-meals" type="number" min={0} value={form.num_meals} onChange={e => set("num_meals", Math.max(0, parseInt(e.target.value) || 0))} className="mt-1.5 bg-white border-[#D4AF37]/20 max-w-[150px]" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch checked={form.jain_food} onCheckedChange={v => set("jain_food", v)} data-testid="switch-jain-food" />
                  <Label>Jain Food Required?</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.no_onion_garlic} onCheckedChange={v => set("no_onion_garlic", v)} data-testid="switch-no-onion" />
                  <Label>No Onion/Garlic?</Label>
                </div>
              </div>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">Any Allergies?</Label>
                <Input data-testid="input-allergies" value={form.allergies} onChange={e => set("allergies", e.target.value)} placeholder="Mention any food allergies" className="mt-1.5 bg-white border-[#D4AF37]/20" />
              </div>
            </div>
          )}

          {/* Step 7: Travel */}
          {step === 6 && (
            <div className="space-y-5" data-testid="form-step-7">
              <h3 className="text-xl font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Travel Information</h3>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">Mode of Travel</Label>
                <Select value={form.travel_mode} onValueChange={v => set("travel_mode", v)}>
                  <SelectTrigger data-testid="select-travel-mode" className="mt-1.5 bg-white border-[#D4AF37]/20"><SelectValue placeholder="Select mode" /></SelectTrigger>
                  <SelectContent>
                    {["Car", "Train", "Flight", "Bus", "Other"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">Expected Arrival Time</Label>
                <Input data-testid="input-arrival-time" value={form.arrival_time} onChange={e => set("arrival_time", e.target.value)} placeholder="e.g., 10:00 AM on 28 May" className="mt-1.5 bg-white border-[#D4AF37]/20" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch checked={form.pickup_required} onCheckedChange={v => set("pickup_required", v)} data-testid="switch-pickup" />
                  <Label>Pickup Required?</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.parking_needed} onCheckedChange={v => set("parking_needed", v)} data-testid="switch-parking" />
                  <Label>Parking Needed?</Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Final */}
          {step === 7 && (
            <div className="space-y-5" data-testid="form-step-8">
              <h3 className="text-xl font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Final Confirmation</h3>
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">Any Message or Special Request</Label>
                <Textarea data-testid="input-message" value={form.message} onChange={e => set("message", e.target.value)} placeholder="Share any message or special request..." className="mt-1.5 bg-white border-[#D4AF37]/20 min-h-[100px]" />
              </div>
              <div className="flex items-start gap-3 bg-[#D4AF37]/5 rounded-xl p-4 border border-[#D4AF37]/10">
                <Checkbox checked={form.consent} onCheckedChange={v => set("consent", v)} data-testid="check-consent" className="mt-0.5" />
                <Label className="text-sm text-[#0B1C3D]/70 leading-relaxed cursor-pointer" onClick={() => set("consent", !form.consent)}>
                  I confirm that the above details are correct and I consent to the organizers using this information for event planning and coordination purposes.
                </Label>
              </div>
              {/* Summary */}
              <div className="bg-[#F8F1E5] rounded-xl p-4 border border-[#D4AF37]/10">
                <h4 className="text-sm font-semibold text-[#0B1C3D] mb-2">Registration Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#0B1C3D]/60">
                  <span>Name: <strong className="text-[#0B1C3D]">{form.full_name}</strong></span>
                  <span>Mobile: <strong className="text-[#0B1C3D]">{form.mobile}</strong></span>
                  <span>Attendance: <strong className="text-[#0B1C3D]">{form.will_attend}</strong></span>
                  <span>People: <strong className="text-[#0B1C3D]">{totalPeople}</strong></span>
                  <span>Accommodation: <strong className="text-[#0B1C3D]">{form.need_accommodation ? "Yes" : "No"}</strong></span>
                  <span>Travel: <strong className="text-[#0B1C3D]">{form.travel_mode || "Not specified"}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-[#D4AF37]/10">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="border-[#D4AF37]/30 text-[#0B1C3D] hover:bg-[#D4AF37]/10"
              data-testid="form-prev-btn"
            >
              <ArrowLeft size={16} className="mr-1" /> Previous
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90"
                data-testid="form-next-btn"
              >
                Next <ArrowRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canNext() || submitting}
                className="bg-[#D4AF37] text-[#0B1C3D] hover:bg-[#D4AF37]/90"
                data-testid="form-submit-btn"
              >
                {submitting ? "Submitting..." : "Submit Registration"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
