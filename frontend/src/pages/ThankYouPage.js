import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Check, Home } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function ThankYouPage() {
  const { t, lang } = useLang();
  const location = useLocation();
  const regData = location.state || {};

  useEffect(() => {
    document.title = lang === "hi" ? "धन्यवाद - कथा महोत्सव 2026" : "Thank You - Katha Mahotsav 2026";
  }, [lang]);

  return (
    <div className="min-h-screen bg-[#F8F1E5] flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl p-8 sm:p-12 border border-[#D4AF37]/20 max-w-lg w-full text-center sacred-border" data-testid="thank-you-page">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <Check size={40} className="text-green-600" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-[#0B1C3D] mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {t.thankYou.title}
        </h1>
        <p className="text-[#D4AF37] text-base font-medium mb-4" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', serif" : "'Cormorant Garamond', serif" }}>
          {t.thankYou.subtitle}
        </p>

        <p className="text-[#0B1C3D]/60 text-sm sm:text-base leading-relaxed mb-6" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>
          {t.thankYou.message}
        </p>

        {regData.name && (
          <div className="bg-[#F8F1E5] rounded-xl p-4 border border-[#D4AF37]/10 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#0B1C3D]/50">{lang === "hi" ? "नाम" : "Name"}:</span>
              <span className="text-[#0B1C3D] font-medium">{regData.name}</span>
            </div>
            {regData.people && (
              <div className="flex justify-between text-sm">
                <span className="text-[#0B1C3D]/50">{lang === "hi" ? "कुल लोग" : "Total People"}:</span>
                <span className="text-[#0B1C3D] font-medium">{regData.people}</span>
              </div>
            )}
            {regData.id && (
              <div className="flex justify-between text-sm">
                <span className="text-[#0B1C3D]/50">{t.thankYou.registrationId}:</span>
                <span className="text-[#0B1C3D] font-medium text-xs">{regData.id.slice(0, 8).toUpperCase()}</span>
              </div>
            )}
          </div>
        )}

        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#D4AF37] text-[#0B1C3D] px-8 py-3 rounded-full font-semibold hover:bg-[#D4AF37]/90 transition-all shadow-lg"
          data-testid="thank-you-home-btn"
        >
          <Home size={18} /> {t.thankYou.backHome}
        </Link>
      </div>
    </div>
  );
}
