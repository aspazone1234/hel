import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import DemoHeader from "@/components/DemoHeader";
import ReferenceTreePicker, { OTHER_RELATION_ID } from "@/components/ReferenceTreePicker";

/**
 * /demo1 — Reference Details preview using the interactive d3 family-tree
 * picker as the body. Header / stepper / language toggle mirror the live
 * customer registration form's Step 3.
 */
export default function Demo1Page() {
  const [lang, setLang] = useState("hi");
  const [relationId, setRelationId] = useState("");
  const [otherLabel, setOtherLabel] = useState("");
  const navigate = useNavigate();
  const isHi = lang === "hi";
  const fontHi = "'Noto Sans Devanagari', system-ui, sans-serif";

  const handleRelationChange = (id, meta) => {
    setRelationId(id || "");
    if (id === OTHER_RELATION_ID) setOtherLabel(meta?.name || "");
    else if (!id) setOtherLabel("");
  };

  const goToDisabled = () => navigate(`/demo-disabled?from=demo1`);

  return (
    <div className="min-h-screen bg-[#F8F1E5] pb-12" data-testid="demo1-page">
      <DemoHeader label="Demo 1" lang={lang} onToggleLang={() => setLang(l => l === "hi" ? "en" : "hi")} dataPrefix="demo1" />

      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#D4AF37]/15 shadow-sm">
          <h2 className="text-lg font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: isHi ? fontHi : "'Cormorant Garamond', serif" }}>
            {isHi ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u093F\u0935\u0930\u0923" : "Reference Details"}
          </h2>

          <ReferenceTreePicker
            value={relationId}
            onChange={handleRelationChange}
            lang={lang}
            otherLabel={otherLabel}
          />

          <div className="mt-7 grid grid-cols-2 gap-3" data-testid="demo1-nav">
            <button type="button" onClick={goToDisabled} data-testid="demo1-prev"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-[#0B1C3D]/15 text-[#0B1C3D] font-semibold text-sm hover:bg-[#F8F1E5] transition-colors">
              <ChevronLeft size={15} /> {isHi ? "\u092A\u093F\u091B\u0932\u093E" : "Previous"}
            </button>
            <button type="button" onClick={goToDisabled} data-testid="demo1-next"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] border-2 border-[#D4AF37] text-[#0B1C3D] font-bold text-sm hover:bg-[#D4AF37]/90 transition-colors shadow-sm">
              {isHi ? "\u0905\u0917\u0932\u093E" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
