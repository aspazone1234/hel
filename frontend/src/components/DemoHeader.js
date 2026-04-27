import { Link } from "react-router-dom";
import { ChevronLeft, Globe, Check } from "lucide-react";

/**
 * Shared header used by /demo1 and /demo2 — back link, prominent demo badge,
 * registration form page title, 4-step stepper (step 3 active), and the
 * large language switch button. Mirrors the live customer registration form
 * exactly, except the demo badge replaces the phone number on the right.
 */
export default function DemoHeader({ label, lang, onToggleLang, dataPrefix = "demo" }) {
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
  const STEP = 2; // current step = "Reference Details" (3rd of 4)

  return (
    <>
      <div className="bg-white border-b border-[#D4AF37]/20 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-[#0B1C3D]/60 hover:text-[#0B1C3D] text-sm flex items-center gap-1" data-testid={`${dataPrefix}-back-home`}>
            <ChevronLeft size={16} /> {backHome}
          </Link>
          {/* Bold highlighted demo badge — looks like a "live preview" pill */}
          <span
            data-testid={`${dataPrefix}-banner`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-extrabold tracking-wider uppercase bg-[#0B1C3D] text-[#D4AF37] shadow-md ring-2 ring-[#D4AF37]/40"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
            {label}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1C3D] mb-1" style={{ fontFamily: isHi ? fontHi : "'Cormorant Garamond', serif" }}>
          {pageTitle}
        </h1>

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

        <button
          onClick={onToggleLang}
          data-testid={`${dataPrefix}-lang-toggle`}
          className="w-full mt-4 mb-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0B1C3D]/10 to-[#D4AF37]/15 border-2 border-[#D4AF37]/30 hover:border-[#D4AF37]/60 transition-all text-[#0B1C3D] font-semibold text-base"
        >
          <Globe size={18} className="text-[#D4AF37]" />
          {isHi ? "Change language to English" : "\u092D\u093E\u0937\u093E \u0939\u093F\u0902\u0926\u0940 \u092E\u0947\u0902 \u092C\u0926\u0932\u0947\u0902"}
        </button>
      </div>
    </>
  );
}
