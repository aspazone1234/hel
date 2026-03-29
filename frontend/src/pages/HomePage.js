import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { LovingMemorySection, AboutSection, AcharyaSection, ScheduleSection, SpecialProgramsSection, KathaEpisodesSection } from "@/components/EventSections";
import { VenueSection, RegistrationCTA, FamilySection, ContactSection, Footer } from "@/components/InfoSections";
import { useLang } from "@/context/LanguageContext";

export default function HomePage() {
  const [showSticky, setShowSticky] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    document.title = "Shrimad Bhagwat Katha Gyan Yajna 2026 | Pushkar, Rajasthan";
    const onScroll = () => setShowSticky(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F1E5]">
      <Navbar />
      <HeroSection />
      <LovingMemorySection />
      <AboutSection />
      <AcharyaSection />
      <ScheduleSection />
      <SpecialProgramsSection />
      <KathaEpisodesSection />
      <VenueSection />
      <RegistrationCTA />
      <FamilySection />
      <ContactSection />
      <Footer />

      {showSticky && (
        <div className="sticky-register flex flex-col gap-2 items-end" data-testid="sticky-register">
          <Link
            to="/register"
            className="bg-[#D4AF37] text-[#0B1C3D] px-6 py-3 rounded-full font-semibold shadow-lg shadow-[#D4AF37]/30 hover:shadow-[#D4AF37]/50 transition-all text-sm animate-glow-pulse"
          >
            {t.nav.register}
          </Link>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="bg-[#0B1C3D] text-[#F8F1E5] p-3 rounded-full shadow-lg hover:bg-[#0B1C3D]/80 transition-all"
            data-testid="scroll-to-top-btn"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
