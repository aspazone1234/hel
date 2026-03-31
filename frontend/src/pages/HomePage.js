import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Globe } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { QuoteSection, LovingMemorySection, AboutSection, AcharyaSection, ScheduleSection, SpecialProgramsSection, KathaEpisodesSection } from "@/components/EventSections";
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
  const { t, lang, toggleLang } = useLang();

  useEffect(() => {
    document.title = "Shrimad Bhagwat Katha Gyan Yajna 2026 | Pushkar, Rajasthan";
    const onScroll = () => setShowSticky(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F1E5]">
      <Navbar />
      <AnnouncementStrip />
      <HeroSection />
      <QuoteSection />
      <LovingMemorySection />
      <AboutSection />
      <AcharyaSection />
      <ScheduleSection />
      <SpecialProgramsSection />
      <KathaEpisodesSection />
      <VenueSection />
      <FamilySection />
      <RegistrationCTA />
      <Footer />

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
