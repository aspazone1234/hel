import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * /demo-disabled — landing page reached when a user clicks Next/Previous
 * inside a demo preview. The demos do not allow any form submission, so we
 * route here instead and offer a single Back button that returns the user
 * to whichever demo they came from (?from=demo1 | ?from=demo2). Defaults
 * to /demo1 when the param is missing.
 */
export default function DemoSubmissionDisabledPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = params.get("from") === "demo2" ? "demo2" : "demo1";
  const label = from === "demo2" ? "Demo 2" : "Demo 1";

  return (
    <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center px-4" data-testid="demo-disabled-page">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-[#D4AF37]/30 p-8 sm:p-10 text-center">
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37] mb-3">
          Preview · {label}
        </p>
        <h1
          className="text-xl sm:text-2xl font-bold text-[#0B1C3D] leading-snug mb-8"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
          data-testid="demo-disabled-message"
        >
          This is just a form submission, not allowed in demo preview.
        </h1>
        <button
          type="button"
          onClick={() => navigate(`/${from}`)}
          data-testid="demo-disabled-back"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0B1C3D] text-[#F8F1E5] font-semibold text-sm hover:bg-[#163161] active:scale-[0.98] transition-all shadow-md"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    </div>
  );
}
