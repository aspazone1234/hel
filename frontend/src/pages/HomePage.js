import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Globe, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { QuoteSection, LovingMemorySection, AboutSection, AcharyaSection, ScheduleSection, KathaEpisodesSection } from "@/components/EventSections";
import { VenueSection, RegistrationCTA, FamilySection, Footer } from "@/components/InfoSections";
import { useLang } from "@/context/LanguageContext";

function AnnouncementStrip() {
  const { lang } = useLang();
  const text = lang === "hi"
    ? "कृपया अपनी उपस्थिति दर्ज करें \u2022 आवास एवं सुविधाओं की उचित व्यवस्था हेतु सहयोग करें \u2022 कृपया अपनी उपस्थिति पहले से सुनिश्चित करें \u2022 आपका शीघ्र उत्तर हमें आपकी सेवा में सहायक होगा \u2022 पंजीकरण फॉर्म भरकर हमें अपनी उपस्थिति से अवगत कराएँ \u2022 "
    : "Please Register Your Attendance \u2022 Help us prepare accommodation & facilities for you \u2022 Kindly confirm your presence in advance \u2022 Your early response helps us serve you thoughtfully \u2022 Be our guest, just let us know you're coming by filling the registration form \u2022 ";

  return (
    <div className="announcement-strip" data-testid="announcement-strip">
      <div className="announcement-track">
        <span>{text}</span>
        <span>{text}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [showSticky, setShowSticky] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [doorOpened, setDoorOpened] = useState(false);
  const { t, lang, toggleLang } = useLang();

  useEffect(() => {
    document.title = "Shrimad Bhagwat Katha Gyan Yajna 2026 | Pushkar, Rajasthan";
    const onScroll = () => setShowSticky(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleDoorOpened = () => {
    setDoorOpened(true);
    setShowPopup(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F1E5]">
      {/* Blur the dashboard content when popup is open */}
      <div className={showPopup && doorOpened ? "filter blur-sm transition-all duration-300 pointer-events-none" : "transition-all duration-300"}>
        <Navbar />
        <AnnouncementStrip />
        <HeroSection onDoorOpened={handleDoorOpened} />
        <QuoteSection />
        <LovingMemorySection />
        <AboutSection />
        <AcharyaSection />
        <ScheduleSection />
        <KathaEpisodesSection />
        <FamilySection />
        <RegistrationCTA />
        <VenueSection />
        <Footer />
      </div>

      {/* Elegant Informational Popup - only after door is opened */}
      {showPopup && doorOpened && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" data-testid="info-popup-overlay" onClick={() => setShowPopup(false)}>
          <div
            className="relative bg-gradient-to-b from-[#FFF8E8] to-[#F8F1E5] rounded-2xl shadow-2xl max-w-sm w-full border border-[#D4AF37]/40 overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ animation: "fadeInUp 0.4s ease-out" }}
            data-testid="info-popup"
          >
            {/* Decorative top banner */}
            <div className="bg-gradient-to-r from-[#0B1C3D] via-[#1a3a6b] to-[#0B1C3D] py-4 px-5 text-center relative">
              <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-[0.15em]">
                {lang === "hi" ? "श्रीमद् भागवत कथा 2026" : "Shrimad Bhagwat Katha 2026"}
              </p>
              <p className="text-white/90 text-lg font-bold mt-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {lang === "hi" ? "महत्वपूर्ण सूचना" : "Important Notices"}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition z-10"
              data-testid="close-popup"
            >
              <X size={14} />
            </button>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Language toggle text button at the very top */}
              <button
                onClick={toggleLang}
                className="text-[#0B1C3D]/70 text-xs font-medium hover:text-[#0B1C3D] transition-colors underline underline-offset-2"
                data-testid="popup-change-language"
              >
                {lang === "hi" ? "Change language to English" : "भाषा हिंदी में बदलें"}
              </button>

              {/* Notice 1: Open until 19 May */}
              <div className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm">&#9998;</span>
                </div>
                <div>
                  <p className="font-bold text-[#0B1C3D] text-sm">
                    {lang === "hi" ? "19 मई 2026 तक" : "Until 19 May 2026"}
                  </p>
                  <p className="text-[#0B1C3D]/70 text-xs mt-0.5 leading-relaxed">
                    {lang === "hi"
                      ? "आप नया पंजीकरण कर सकते हैं और मौजूदा फॉर्म में बदलाव कर सकते हैं। इसके बाद फॉर्म बंद हो जाएगा।"
                      : "You can submit new registrations and edit your existing form. After this date, forms will be closed."}
                  </p>
                </div>
              </div>

              {/* Soft divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-[#D4AF37]/20"></div>
                <span className="text-[#D4AF37]/40 text-xs">&#10022;</span>
                <div className="flex-1 h-px bg-[#D4AF37]/20"></div>
              </div>

              {/* Notice 2: 21 May final list */}
              <div className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-emerald-600 text-sm">&#127881;</span>
                </div>
                <div>
                  <p className="font-bold text-[#0B1C3D] text-sm">
                    {lang === "hi" ? "21 मई 2026 — अंतिम सूची" : "21 May 2026 — Final Guest List"}
                  </p>
                  <p className="text-[#0B1C3D]/70 text-xs mt-0.5 leading-relaxed">
                    {lang === "hi"
                      ? "इस तिथि पर आपको प्राप्त होगा:"
                      : "On this date, you will receive:"}
                  </p>
                  <ul className="text-[#0B1C3D]/70 text-xs mt-1 space-y-0.5 list-none">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#D4AF37]"></span>
                      {lang === "hi" ? "प्रवेश के लिए QR कोड" : "QR Code for entry"}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#D4AF37]"></span>
                      {lang === "hi" ? "कमरा आवंटन" : "Room assignment"}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#D4AF37]"></span>
                      {lang === "hi" ? "समर्पित संपर्क व्यक्ति (स्वयंसेवक)" : "Dedicated contact person (Swayamsevak)"}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom action */}
            <div className="px-5 pb-5 pt-1">
              <button
                onClick={() => setShowPopup(false)}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#0B1C3D] font-semibold py-2.5 rounded-xl text-sm shadow-md hover:shadow-lg transition active:scale-[0.98]"
                data-testid="popup-got-it"
              >
                {lang === "hi" ? "समझ गया" : "Got it"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSticky && (
        <div className="sticky-register flex flex-col gap-2 items-end" data-testid="sticky-register">
          <button
            onClick={toggleLang}
            data-testid="sticky-lang-toggle"
            className="bg-[#0B1C3D] text-[#D4AF37] px-4 py-2.5 rounded-full font-semibold shadow-lg hover:bg-[#0B1C3D]/80 transition-all text-sm flex items-center gap-1.5 border border-[#D4AF37]/30"
          >
            <Globe size={14} />
            {lang === "en" ? "हिंदी" : "English"}
            <span className="text-[#D4AF37]/50 text-[10px] ml-0.5">{lang === "en" ? "/ भाषा बदलें" : "/ Change Language"}</span>
          </button>
          <Link to="/register"
            className="bg-[#D4AF37] text-[#0B1C3D] px-6 py-3 rounded-full font-semibold shadow-lg shadow-[#D4AF37]/30 hover:shadow-[#D4AF37]/50 transition-all text-sm animate-glow-pulse">
            {t.nav.register}
          </Link>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="bg-[#0B1C3D] text-[#F8F1E5] p-3 rounded-full shadow-lg hover:bg-[#0B1C3D]/80 transition-all" data-testid="scroll-to-top-btn">
            <ArrowUp size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
