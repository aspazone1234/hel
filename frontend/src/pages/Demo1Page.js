import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ReferenceTreePicker, { OTHER_RELATION_ID } from "@/components/ReferenceTreePicker";

/**
 * /demo1 — A standalone, static demo page showing only the "Relation Details"
 * step of the registration form.
 *
 * Everything in this page is SELF-CONTAINED and does NOT call any backend
 * write APIs (the ReferenceTreePicker still fetches the public family tree).
 * Next / Previous buttons are intentionally non-functional (display-only)
 * so the demo never navigates away or mutates anything.
 */
export default function Demo1Page() {
  const [lang, setLang] = useState("hi");
  const [relationId, setRelationId] = useState("");
  const [relationName, setRelationName] = useState("");
  const [otherLabel, setOtherLabel] = useState("");

  const handleRelationChange = (id, meta) => {
    setRelationId(id || "");
    setRelationName(meta?.name || "");
    if (id === OTHER_RELATION_ID) setOtherLabel(meta?.name || "");
    else if (!id) setOtherLabel("");
  };

  const isHi = lang === "hi";
  const fontHi = "'Noto Sans Devanagari', system-ui, sans-serif";

  // Static, no-op handlers for the demo navigation buttons
  const noop = () => { /* intentionally disabled in demo */ };

  return (
    <div className="min-h-screen bg-[#F8F1E5] py-6 sm:py-10" data-testid="demo1-page">
      <div className="max-w-2xl mx-auto px-4">
        {/* Demo banner */}
        <div
          className="mb-4 rounded-xl border border-[#D4AF37]/40 bg-[#0B1C3D] text-[#F8F1E5] px-4 py-2 flex items-center justify-between gap-3 shadow-sm"
          data-testid="demo1-banner"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">Demo</span>
            <span className="text-xs sm:text-sm truncate">
              {isHi
                ? "\u0938\u0902\u092C\u0902\u0927 \u0935\u093F\u0935\u0930\u0923 \u092A\u0943\u0937\u094D\u0920 \u092A\u0942\u0930\u094D\u0935\u093E\u0935\u0932\u094B\u0915\u0928"
                : "Relation Details — standalone preview"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLang(l => (l === "hi" ? "en" : "hi"))}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#D4AF37] text-[#0B1C3D] text-[11px] font-bold hover:bg-[#E9C558] transition-colors"
            data-testid="demo1-lang-toggle"
          >
            {isHi ? "EN" : "HI"}
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#D4AF37]/20 p-5 sm:p-7">
          {/* Static step indicator (3/3) */}
          <div className="flex items-center gap-2 mb-5 text-[11px] uppercase tracking-wider font-bold text-[#0B1C3D]/50">
            <span className="px-2 py-0.5 rounded-full bg-[#D4AF37] text-[#0B1C3D]">3 / 3</span>
            <span className="text-[#0B1C3D]/70">
              {isHi ? "\u0909\u092A\u0938\u094D\u0925\u093F\u0924\u093F \u0926\u0930\u094D\u091C \u092B\u093C\u0949\u0930\u094D\u092E" : "Registration Form"}
            </span>
          </div>

          {/* Step heading */}
          <h2
            className="text-lg sm:text-xl font-bold text-[#0B1C3D] mb-4"
            style={{ fontFamily: isHi ? fontHi : "'Cormorant Garamond', serif" }}
            data-testid="demo1-step-title"
          >
            {isHi ? "\u0938\u0902\u092C\u0902\u0927 \u0935\u093F\u0935\u0930\u0923" : "Relation Details"}
          </h2>

          {/* The picker itself */}
          <ReferenceTreePicker
            value={relationId}
            onChange={handleRelationChange}
            lang={lang}
            otherLabel={otherLabel}
          />

          {/* Navigation — intentionally non-functional */}
          <div className="mt-7 grid grid-cols-2 gap-3" data-testid="demo1-nav">
            <button
              type="button"
              onClick={noop}
              data-testid="demo1-prev"
              title={isHi ? "\u0921\u0947\u092E\u094B \u092E\u0947\u0902 \u0928\u093F\u0937\u094D\u0915\u094D\u0930\u093F\u092F" : "Disabled in demo"}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-[#0B1C3D]/15 text-[#0B1C3D]/60 font-semibold text-sm cursor-not-allowed"
              aria-disabled="true"
            >
              <ArrowLeft size={15} /> {isHi ? "\u092A\u093F\u091B\u0932\u093E" : "Previous"}
            </button>
            <button
              type="button"
              onClick={noop}
              data-testid="demo1-next"
              title={isHi ? "\u0921\u0947\u092E\u094B \u092E\u0947\u0902 \u0928\u093F\u0937\u094D\u0915\u094D\u0930\u093F\u092F" : "Disabled in demo"}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37]/50 border-2 border-[#D4AF37]/40 text-[#0B1C3D]/60 font-semibold text-sm cursor-not-allowed"
              aria-disabled="true"
            >
              {isHi ? "\u0905\u0917\u0932\u093E" : "Next"} <ArrowRight size={15} />
            </button>
          </div>

          {/* Snapshot panel for demo visibility */}
          <div
            className="mt-5 rounded-xl bg-[#F8F1E5]/60 border border-[#D4AF37]/15 p-3 text-[11px] sm:text-xs text-[#0B1C3D]/70"
            data-testid="demo1-snapshot"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[#0B1C3D]">
                {isHi ? "\u091A\u092F\u0928 \u0938\u094D\u0925\u093F\u0924\u093F" : "Current selection"}
              </span>
              <code className="text-[10px] break-all text-[#0B1C3D]/55">
                {relationId || (isHi ? "\u2014 \u0915\u094B\u0908 \u091A\u092F\u0928 \u0928\u0939\u0940\u0902 \u2014" : "— none —")}
              </code>
            </div>
            {relationName && (
              <div className="mt-1 text-[#0B1C3D]">
                {isHi ? "\u0928\u093E\u092E" : "Name"}: <span className="font-semibold">{relationName}</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] uppercase tracking-widest text-[#0B1C3D]/40 mt-5">
          /demo1 · static demo · no form submissions
        </p>
      </div>
    </div>
  );
}
