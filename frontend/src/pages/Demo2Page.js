import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Globe, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * /demo2 — Pixel-mirror of the live customer Registration Form's Step 3
 * ("Reference Details"). Pulls the actual reference person list (& their
 * relation categories) from /api/reference-persons/public so the demo
 * always reflects whatever the production website currently has.
 *
 * No form submission of any kind. Clicking Previous/Next routes to
 * /demo-disabled?from=demo2 which carries a Back button to return here.
 */
export default function Demo2Page() {
  const [lang, setLang] = useState("hi");
  const [refPersons, setRefPersons] = useState([]);
  const [referencePersonId, setReferencePersonId] = useState("");
  const [relationCategory, setRelationCategory] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancel = false;
    axios.get(`${API}/reference-persons/public`)
      .then(r => { if (!cancel) setRefPersons(r.data || []); })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);

  const isHi = lang === "hi";
  const fontHi = "'Noto Sans Devanagari', system-ui, sans-serif";
  const stepLabels = isHi
    ? ["\u0938\u0902\u092A\u0930\u094D\u0915 \u0935 \u0938\u092E\u0942\u0939", "\u0909\u092A\u0938\u094D\u0925\u093F\u0924\u093F \u0935 \u092F\u093E\u0924\u094D\u0930\u093E", "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u093F\u0935\u0930\u0923", "\u0938\u093E\u0930\u093E\u0902\u0936"]
    : ["Contact & Group", "Attendance & Travel", "Reference Details", "Summary"];
  const pageTitle = isHi
    ? "\u0909\u092A\u0938\u094D\u0925\u093F\u0924\u093F \u0926\u0930\u094D\u091C / \u0905\u092A\u0921\u0947\u091F \u0915\u0930\u0947\u0902"
    : "Register / Update Your Attendance";
  const backHome = isHi
    ? "\u092E\u0941\u0916\u094D\u092F \u092A\u0943\u0937\u094D\u0920 \u092A\u0930 \u0935\u093E\u092A\u0938 \u091C\u093E\u090F\u0902"
    : "Back to Home";

  // The "current step" we render is index 2 of a 4-step process (Reference Details).
  const STEP = 2;

  const goToDisabled = () => navigate(`/demo-disabled?from=demo2`);

  const selectedRP = refPersons.find(p => p.id === referencePersonId);
  const cats = selectedRP?.relation_categories || [];

  return (
    <div className="min-h-screen bg-[#F8F1E5] pb-12" data-testid="demo2-page">
      {/* Header — mirrors RegisterPage */}
      <div className="bg-white border-b border-[#D4AF37]/20 px-4 py-4 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1" data-testid="demo2-back-home">
            <ChevronLeft size={16} /> {backHome}
          </Link>
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]" data-testid="demo2-banner">
            (Demo 2)
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1C3D] mb-1" style={{ fontFamily: isHi ? fontHi : "'Cormorant Garamond', serif" }}>
          {pageTitle}
        </h1>

        {/* 4-step stepper, current = 2 */}
        <div className="flex items-center gap-2 my-5 overflow-x-auto pb-1">
          {stepLabels.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < STEP ? "bg-green-500 text-white" : i === STEP ? "bg-[#D4AF37] text-[#0B1C3D]" : "bg-[#0B1C3D]/10 text-[#0B1C3D]/40"
              }`}>
                {i < STEP ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === STEP ? "text-[#0B1C3D] font-semibold" : "text-[#0B1C3D]/40"}`}>{s}</span>
              {i < stepLabels.length - 1 && <div className={`w-6 h-0.5 ${i < STEP ? "bg-green-400" : "bg-[#0B1C3D]/10"}`} />}
            </div>
          ))}
        </div>

        {/* Large language switch */}
        <button onClick={() => setLang(l => l === "hi" ? "en" : "hi")} data-testid="demo2-lang-toggle"
          className="w-full mt-4 mb-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0B1C3D]/10 to-[#D4AF37]/15 border-2 border-[#D4AF37]/30 hover:border-[#D4AF37]/60 transition-all text-[#0B1C3D] font-semibold text-base">
          <Globe size={18} className="text-[#D4AF37]" />
          {isHi ? "Change language to English" : "\u092D\u093E\u0937\u093E \u0939\u093F\u0902\u0926\u0940 \u092E\u0947\u0902 \u092C\u0926\u0932\u0947\u0902"}
        </button>

        {/* Form card — Reference Details only */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#D4AF37]/15 shadow-sm">
          <div className="space-y-6" data-testid="demo2-step-reference">
            <h2 className="text-lg font-bold text-[#0B1C3D]" style={{ fontFamily: isHi ? fontHi : "'Cormorant Garamond', serif" }}>
              {isHi ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u093F\u0935\u0930\u0923" : "Reference Details"}
            </h2>

            {/* Reference Person */}
            <div>
              <Label className="text-[#0B1C3D]/70 text-sm">
                {isHi ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u094D\u092F\u0915\u094D\u0924\u093F *" : "Reference Person *"}
              </Label>
              <Select
                value={referencePersonId}
                onValueChange={v => { setReferencePersonId(v); setRelationCategory(""); }}
              >
                <SelectTrigger className="mt-1.5 bg-white border-[#D4AF37]/20" data-testid="demo2-reference-person-select">
                  <SelectValue placeholder={isHi ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u091A\u0941\u0928\u0947\u0902" : "Select reference person"} />
                </SelectTrigger>
                <SelectContent>
                  {refPersons.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Relation — only when the picked reference person has categories */}
            {referencePersonId && cats.length > 0 && (
              <div>
                <Label className="text-[#0B1C3D]/70 text-sm">
                  {isHi ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0938\u0947 \u0938\u092E\u094D\u092C\u0928\u094D\u0927 *" : "Relation with Reference Person *"}
                </Label>
                <Select value={relationCategory} onValueChange={setRelationCategory}>
                  <SelectTrigger className="mt-1.5 bg-white border-[#D4AF37]/20" data-testid="demo2-relation-category-select">
                    <SelectValue placeholder={isHi ? "\u0938\u092E\u094D\u092C\u0928\u094D\u0927 \u091A\u0941\u0928\u0947\u0902" : "Select relation"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cats.map((c, i) => <SelectItem key={`${c}-${i}`} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Message */}
            <div>
              <Label className="text-[#0B1C3D]/70 text-sm">
                {isHi ? "\u0915\u094B\u0908 \u0938\u0902\u0926\u0947\u0936 \u092F\u093E \u0935\u093F\u0936\u0947\u0937 \u0905\u0928\u0941\u0930\u094B\u0927" : "Any message or special request"}
              </Label>
              <Textarea data-testid="demo2-message-input" value={message} onChange={e => setMessage(e.target.value)}
                className="mt-1.5 bg-white border-[#D4AF37]/20 text-sm" rows={3} />
            </div>
          </div>

          {/* Nav — both buttons route to /demo-disabled */}
          <div className="mt-7 grid grid-cols-2 gap-3" data-testid="demo2-nav">
            <button type="button" onClick={goToDisabled} data-testid="demo2-prev"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-[#0B1C3D]/15 text-[#0B1C3D] font-semibold text-sm hover:bg-[#F8F1E5] transition-colors">
              <ChevronLeft size={15} /> {isHi ? "\u092A\u093F\u091B\u0932\u093E" : "Previous"}
            </button>
            <button type="button" onClick={goToDisabled} data-testid="demo2-next"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] border-2 border-[#D4AF37] text-[#0B1C3D] font-bold text-sm hover:bg-[#D4AF37]/90 transition-colors shadow-sm">
              {isHi ? "\u0905\u0917\u0932\u093E" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
