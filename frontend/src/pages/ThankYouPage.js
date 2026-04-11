import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Calendar, Bell, Edit, ArrowRight } from "lucide-react";
import { useLang } from "../context/LanguageContext";

export default function ThankYouPage() {
  const { lang } = useLang();
  const [params] = useSearchParams();
  const regId = params.get("id");

  const fontHi = "'Tiro Devanagari Hindi', serif";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F1E5] via-[#FDF8EF] to-[#F5E6CC] flex items-center justify-center px-4 py-12" data-testid="thank-you-page">
      <div className="w-full max-w-lg">
        {/* Success Animation */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center animate-bounce-slow shadow-2xl shadow-green-200">
              <CheckCircle size={48} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-green-400/30 animate-ping" />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 sm:p-10 border border-[#D4AF37]/20 shadow-xl space-y-6 animate-fadeIn">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1C3D] mb-3" style={{ fontFamily: lang === "hi" ? fontHi : "'Cormorant Garamond', serif" }}>
              {lang === "hi" ? "धन्यवाद!" : "Thank You!"}
            </h1>
            <p className="text-[#0B1C3D]/70 text-base leading-relaxed">
              {lang === "hi"
                ? "श्रीमद भागवत कथा महोत्सव 2026 में आपकी रुचि के लिए हम आभारी हैं। आपका फॉर्म सफलतापूर्वक प्राप्त हो गया है।"
                : "We gratefully acknowledge your interest in Shrimad Bhagavat Katha Mahotsav 2026. Your form has been received successfully."}
            </p>
          </div>

          {/* Timeline of what happens next */}
          <div className="space-y-4" data-testid="next-steps">
            <h2 className="font-semibold text-[#0B1C3D] text-sm flex items-center gap-2">
              <ArrowRight size={14} className="text-[#D4AF37]" />
              {lang === "hi" ? "आगे क्या होगा" : "What Happens Next"}
            </h2>

            <div className="space-y-3">
              {/* Step 1: Final confirmation May 21 - MOST PROMINENT */}
              <div className="flex gap-3 items-start bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-300 shadow-md animate-slideUp" style={{ animationDelay: "0.1s" }}>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg">
                  <Bell size={20} />
                </div>
                <div>
                  <p className="font-bold text-green-800 text-base">
                    {lang === "hi" ? "21 मई को अंतिम पुष्टि" : "Final Confirmation on May 21"}
                  </p>
                  <p className="text-sm text-green-700 mt-1 font-medium">
                    {lang === "hi"
                      ? "21 मई 2026 को WhatsApp पर कमरे का विवरण, QR कोड और सभी अंतिम जानकारी भेजी जाएगी।"
                      : "Your room details will be sent on 21 May 2026 via your registered WhatsApp number."}
                  </p>
                </div>
              </div>

              {/* Step 2: Edit until May 19 */}
              <div className="flex gap-3 items-start bg-gradient-to-r from-blue-50 to-blue-50/30 rounded-xl p-4 border border-blue-100 animate-slideUp" style={{ animationDelay: "0.2s" }}>
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                  <Edit size={16} />
                </div>
                <div>
                  <p className="font-semibold text-[#0B1C3D] text-sm">
                    {lang === "hi" ? "19 मई तक संपादन" : "Editable Until May 19"}
                  </p>
                  <p className="text-xs text-[#0B1C3D]/60 mt-0.5">
                    {lang === "hi"
                      ? "आप 19 मई 2026 तक इसी पोर्टल पर लॉगिन करके अपनी जानकारी अपडेट कर सकते हैं।"
                      : "You can log back in with the same number on this portal and update your details until May 19, 2026."}
                  </p>
                </div>
              </div>

              {/* Step 3: Locked on May 19 */}
              <div className="flex gap-3 items-start bg-gradient-to-r from-amber-50 to-amber-50/30 rounded-xl p-4 border border-amber-100 animate-slideUp" style={{ animationDelay: "0.3s" }}>
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="font-semibold text-[#0B1C3D] text-sm">
                    {lang === "hi" ? "19 मई को लॉक" : "Locked on May 19"}
                  </p>
                  <p className="text-xs text-[#0B1C3D]/60 mt-0.5">
                    {lang === "hi"
                      ? "19 मई 2026 के बाद फॉर्म में कोई भी बदलाव या अपडेट बंद हो जाएगा।"
                      : "Form submissions and updates will be locked after May 19, 2026. No self-service changes after this date."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            {regId && (
              <Link to={`/my-registration?mobile=${regId}`} data-testid="view-registration-link"
                className="w-full bg-[#0B1C3D] text-white py-3 rounded-xl text-sm font-semibold text-center hover:bg-[#163161] transition flex items-center justify-center gap-2">
                {lang === "hi" ? "अपना पंजीकरण देखें" : "View Your Registration"}
                <ArrowRight size={14} />
              </Link>
            )}
            <Link to="/" data-testid="back-to-home"
              className="w-full bg-[#D4AF37]/10 text-[#0B1C3D] py-3 rounded-xl text-sm font-semibold text-center hover:bg-[#D4AF37]/20 transition border border-[#D4AF37]/20">
              {lang === "hi" ? "मुख्य पृष्ठ पर वापस जाएं" : "Back to Home"}
            </Link>
          </div>
        </div>

        {/* Decorative Footer */}
        <p className="text-center text-xs text-[#0B1C3D]/30 mt-6">
          {lang === "hi" ? "श्रीमद भागवत कथा महोत्सव • पुष्कर 2026" : "Shrimad Bhagavat Katha Mahotsav • Pushkar 2026"}
        </p>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
        .animate-slideUp { animation: slideUp 0.5s ease-out both; }
      `}</style>
    </div>
  );
}
