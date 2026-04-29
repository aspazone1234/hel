import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import DemoHeader from "@/components/DemoHeader";
import { splitReferenceLabel } from "@/lib/referenceLabel";

/**
 * /demo2 — Reference Details preview using the live registration form's
 * dropdown-based UX. Reference person list is HARD-CODED below from a
 * snapshot of production (shrimadbhagavat2026.com) so the demo always shows
 * the real Panchariya family list regardless of preview-DB drift.
 */
const STATIC_REFERENCE_PERSONS = [
  { id: "rp-ramswaroop", name: "Late Shri Ramswaroop Ji Panchariya (Late Shrimati Shanta Devi Ji)", rank: 1,
    relation_categories: ["Business Associates", "Friends", "Sasural Side", "Neighbors", "Other Relatives", "Other"] },
  { id: "rp-satish", name: "Shri Satish Ji Panchariya (Shrimati Radha Ji)", rank: 2,
    relation_categories: ["Business Associates", "Friends", "Sasural Side", "Neighbors", "Other Relatives", "Other", "Samdhi"] },
  { id: "rp-arun", name: "Shri Arun Ji Panchariya (Shrimati Sarita Ji)", rank: 3,
    relation_categories: ["Business Associates", "Friends", "Sasural Side", "Neighbors", "Other Relatives", "Other"] },
  { id: "rp-ashok", name: "Shri Ashok Panchariya Ji (Shrimati Madhu Ji)", rank: 4,
    relation_categories: ["Business Associates", "Friends", "Sasural Side", "Neighbors", "Other Relatives", "Other"] },
  { id: "rp-alka", name: "Shrimati Alka (Shri Rakesh Ji)", rank: 5,
    relation_categories: ["Samdhi", "Other Relatives", "Other", "Sasural Side"] },
  { id: "rp-ratni",  name: "Late Shrimati Ratni Devi Ji Tripathi (Late Shri Gajanand Ji)",   rank: 6,  relation_categories: [] },
  { id: "rp-babulal",name: "Late Shri Babulal Ji Panchariya (Late Shrimati Rajkumari Devi Ji)", rank: 7, relation_categories: [] },
  { id: "rp-sugand", name: "Late Shri Sugandchand Ji Panchariya (Shrimati Sita Devi Ji)",    rank: 8,  relation_categories: [] },
  { id: "rp-sugni",  name: "Late Shrimati Sugni Devi Ji Khatod (Late Shri Omkar Mal Ji)",    rank: 9,  relation_categories: [] },
  { id: "rp-nand",   name: "Shri Nandkishor Ji Panchariya (Late Shrimati Padma Devi Ji)",    rank: 10, relation_categories: [] },
  { id: "rp-anandi", name: "Shrimati Anandi Devi Ji Upadhyay (Shri Jugalkishor Ji)",         rank: 11, relation_categories: [] },
  { id: "rp-shyam",  name: "Late Shri Shyam Ji Panchariya (Shrimati Usha Devi Ji)",          rank: 12, relation_categories: [] },
  { id: "rp-ganesh", name: "Late Shri Ganeshlal Ji Pariwar",                                  rank: 13, relation_categories: [] },
  { id: "rp-jaina",  name: "Late Shri Jainanarayan Ji Pariwar",                               rank: 14, relation_categories: [] },
  { id: "rp-ramk",   name: "Late Shri Ramkishan Ji Pariwar",                                  rank: 16, relation_categories: [] },
  { id: "rp-barnel", name: "Barnel Family",                                                   rank: 21, relation_categories: [] },
  { id: "rp-samaj",  name: "Samaj",                                                           rank: 22, relation_categories: [] },
];

export default function Demo2Page() {
  const [lang, setLang] = useState("hi");
  const [referencePersonId, setReferencePersonId] = useState("");
  const [relationCategory, setRelationCategory] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const isHi = lang === "hi";
  const fontHi = "'Noto Sans Devanagari', system-ui, sans-serif";

  const goToDisabled = () => navigate(`/demo-disabled?from=demo2`);
  const selectedRP = STATIC_REFERENCE_PERSONS.find(p => p.id === referencePersonId);
  const cats = selectedRP?.relation_categories || [];

  return (
    <div className="min-h-screen bg-[#F8F1E5] pb-12" data-testid="demo2-page">
      <DemoHeader label="Demo 2" lang={lang} onToggleLang={() => setLang(l => l === "hi" ? "en" : "hi")} dataPrefix="demo2" />

      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#D4AF37]/15 shadow-sm">
          <div className="space-y-6" data-testid="demo2-step-reference">
            <h2 className="text-lg font-bold text-[#0B1C3D]" style={{ fontFamily: isHi ? fontHi : "'Cormorant Garamond', serif" }}>
              {isHi ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u093F\u0935\u0930\u0923" : "Reference Details"}
            </h2>

            <div>
              <Label className="text-[#0B1C3D]/70 text-sm">
                {isHi ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u094D\u092F\u0915\u094D\u0924\u093F *" : "Reference Person *"}
              </Label>
              <Select value={referencePersonId} onValueChange={v => { setReferencePersonId(v); setRelationCategory(""); }}>
                <SelectTrigger className="mt-1.5 bg-white border-[#D4AF37]/20" data-testid="demo2-reference-person-select">
                  {(() => {
                    const sel = STATIC_REFERENCE_PERSONS.find(p => p.id === referencePersonId);
                    if (!sel) return <SelectValue placeholder={isHi ? "\u0938\u0902\u0926\u0930\u094D\u092D \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u091A\u0941\u0928\u0947\u0902" : "Select reference person"} />;
                    const { primary } = splitReferenceLabel(sel);
                    return <span className="truncate text-left">{primary}</span>;
                  })()}
                </SelectTrigger>
                <SelectContent>
                  {STATIC_REFERENCE_PERSONS.map((p, i) => {
                    const { primary, secondary } = splitReferenceLabel(p);
                    return (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        className={`py-2.5 ${i % 2 === 1 ? "bg-[#F8F1E5]/50" : ""}`}
                      >
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm text-[#0B1C3D] font-medium">{primary}</span>
                          {secondary && (
                            <span className="text-[11px] text-[#0B1C3D]/55 mt-0.5">{secondary}</span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

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

            <div>
              <Label className="text-[#0B1C3D]/70 text-sm">
                {isHi ? "\u0915\u094B\u0908 \u0938\u0902\u0926\u0947\u0936 \u092F\u093E \u0935\u093F\u0936\u0947\u0937 \u0905\u0928\u0941\u0930\u094B\u0927" : "Any message or special request"}
              </Label>
              <Textarea data-testid="demo2-message-input" value={message} onChange={e => setMessage(e.target.value)}
                className="mt-1.5 bg-white border-[#D4AF37]/20 text-sm" rows={3} />
            </div>
          </div>

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
