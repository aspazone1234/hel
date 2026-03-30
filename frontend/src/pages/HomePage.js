import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Globe } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { QuoteSection, LovingMemorySection, AboutSection, AcharyaSection, ScheduleSection, SpecialProgramsSection, KathaEpisodesSection } from "@/components/EventSections";
import { VenueSection, RegistrationCTA, FamilySection, ContactSection, Footer } from "@/components/InfoSections";
import { useLang } from "@/context/LanguageContext";

function AnnouncementStrip() {
  const { t, lang } = useLang();
  const text = lang === "hi"
    ? "उपस्थिति दर्ज करें  \u2022  आवास एवं सुविधा हेतु पहले से पंजीकरण करें  \u2022  सीमित आवास \u2013 शीघ्र पंजीकरण करें  \u2022  "
    : "Register Your Attendance  \u2022  Help us prepare accommodation & facilities for you  \u2022  Limited seats \u2013 Register early  \u2022  ";

  return (
    <div className="announcement-strip" data-testid="announcement-strip">
      <div className="announcement-track">
        <span>{text}</span>
        <span>{text}</span>
        <span>{text}</span>
      </div>
      <Link
        to="/register"
        data-testid="announcement-register-btn"
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-[#0B1C3D] px-4 py-1 rounded-full text-xs font-bold hover:bg-[#F8F1E5] transition-all shadow-md z-10 whitespace-nowrap"
      >
        {t.nav.register}
      </Link>
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
      <ContactSection />
      <Footer />

      {showSticky && (
        <div className="sticky-register flex flex-col gap-2 items-end" data-testid="sticky-register">
          <button
            onClick={toggleLang}
            data-testid="sticky-lang-toggle"
            className="bg-[#0B1C3D] text-[#D4AF37] px-4 py-2.5 rounded-full font-semibold shadow-lg hover:bg-[#0B1C3D]/80 transition-all text-sm flex items-center gap-1.5 border border-[#D4AF37]/30"
          >
            <Globe size={14} />
            {lang === "en" ? "हिंदी" : "EN"}
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
