import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ReferenceTreePicker, { OTHER_RELATION_ID } from "@/components/ReferenceTreePicker";

/**
 * Shared body for both /demo1 and /demo2 — the page itself only differs by the
 * label shown in the top banner and the small footer slug. Everything else is
 * identical (same picker, same static reference data, same disabled submission
 * flow). Keeping this in one component avoids drift between the two demos.
 */
export default function DemoPreviewPage({ slug = "demo1", label = "Demo 1" }) {
  const [lang, setLang] = useState("hi");
  const [relationId, setRelationId] = useState("");
  const [otherLabel, setOtherLabel] = useState("");
  const navigate = useNavigate();

  const handleRelationChange = (id, meta) => {
    setRelationId(id || "");
    if (id === OTHER_RELATION_ID) setOtherLabel(meta?.name || "");
    else if (!id) setOtherLabel("");
  };

  const isHi = lang === "hi";
  const fontHi = "'Noto Sans Devanagari', system-ui, sans-serif";

  // Both Next & Previous in the demo lead to the same "submission disabled"
  // page — the user's spec is that NO form action is allowed in preview.
  const goToDisabled = () => navigate(`/demo-disabled?from=${slug}`);

  return (
    <div className="min-h-screen bg-[#F8F1E5] py-6 sm:py-10" data-testid={`${slug}-page`}>
      <div className="max-w-2xl mx-auto px-4">
        {/* Demo banner — simplified per user spec: just the label, nothing else */}
        <div
          className="mb-3 rounded-xl border border-[#D4AF37]/40 bg-[#0B1C3D] text-[#F8F1E5] px-4 py-2 shadow-sm"
          data-testid={`${slug}-banner`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">Demo</span>
            <span className="text-xs sm:text-sm truncate">({label})</span>
          </div>
        </div>

        {/* Text-based language toggle — shown in the OPPOSITE language */}
        <p className="mb-4 text-xs sm:text-sm text-[#0B1C3D]/70 text-left">
          <button
            type="button"
            onClick={() => setLang(l => (l === "hi" ? "en" : "hi"))}
            className="text-[#0B1C3D] underline underline-offset-2 decoration-[#0B1C3D]/40 hover:decoration-[#0B1C3D] font-semibold bg-transparent p-0 inline"
            data-testid={`${slug}-lang-toggle`}
          >
            {isHi
              ? "Click here for English"
              : "\u0939\u093F\u0928\u094D\u0926\u0940 \u0915\u0947 \u0932\u093F\u090F \u092F\u0939\u093E\u0901 \u0915\u094D\u0932\u093F\u0915 \u0915\u0930\u0947\u0902"}
          </button>
        </p>

        <div className="bg-white rounded-2xl shadow-lg border border-[#D4AF37]/20 p-5 sm:p-7">
          <div className="flex items-center gap-2 mb-5 text-[11px] uppercase tracking-wider font-bold text-[#0B1C3D]/50">
            <span className="px-2 py-0.5 rounded-full bg-[#D4AF37] text-[#0B1C3D]">3 / 3</span>
            <span className="text-[#0B1C3D]/70">
              {isHi ? "\u0909\u092A\u0938\u094D\u0925\u093F\u0924\u093F \u0926\u0930\u094D\u091C \u092B\u093C\u0949\u0930\u094D\u092E" : "Registration Form"}
            </span>
          </div>

          <h2
            className="text-lg sm:text-xl font-bold text-[#0B1C3D] mb-4"
            style={{ fontFamily: isHi ? fontHi : "'Cormorant Garamond', serif" }}
            data-testid={`${slug}-step-title`}
          >
            {isHi ? "\u0938\u0902\u092C\u0902\u0927 \u0935\u093F\u0935\u0930\u0923" : "Relation Details"}
          </h2>

          <ReferenceTreePicker
            value={relationId}
            onChange={handleRelationChange}
            lang={lang}
            otherLabel={otherLabel}
          />

          <div className="mt-7 grid grid-cols-2 gap-3" data-testid={`${slug}-nav`}>
            <button
              type="button"
              onClick={goToDisabled}
              data-testid={`${slug}-prev`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-[#0B1C3D]/15 text-[#0B1C3D] font-semibold text-sm hover:bg-[#F8F1E5] transition-colors"
            >
              <ArrowLeft size={15} /> {isHi ? "\u092A\u093F\u091B\u0932\u093E" : "Previous"}
            </button>
            <button
              type="button"
              onClick={goToDisabled}
              data-testid={`${slug}-next`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] border-2 border-[#D4AF37] text-[#0B1C3D] font-bold text-sm hover:bg-[#D4AF37]/90 transition-colors shadow-sm"
            >
              {isHi ? "\u0905\u0917\u0932\u093E" : "Next"} <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] uppercase tracking-widest text-[#0B1C3D]/40 mt-5">
          /{slug} · static demo · no form submissions
        </p>
      </div>
    </div>
  );
}
