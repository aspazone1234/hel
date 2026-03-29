import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { AboutSection, AcharyaSection, ScheduleSection, KathaThemesSection } from "@/components/EventSections";
import { VenueSection, RegistrationCTA, FamilySection, DedicationSection, ContactSection, FinalCTA, Footer } from "@/components/InfoSections";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function HomePage() {
  const [showSticky, setShowSticky] = useState(false);
  const [totalRegistrations, setTotalRegistrations] = useState(null);

  useEffect(() => {
    document.title = "Shrimad Bhagavat Katha Mahotsav 2026 | Pushkar, Rajasthan";
    const onScroll = () => setShowSticky(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    axios.get(`${API}/registrations/count`).then(r => setTotalRegistrations(r.data.total)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F1E5]">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <AcharyaSection />
      <ScheduleSection />
      <KathaThemesSection />
      <VenueSection />
      <RegistrationCTA />
      <FamilySection />
      <DedicationSection />
      <ContactSection />
      <FinalCTA />
      <Footer />

      {/* Sticky Register Button */}
      {showSticky && (
        <div className="sticky-register flex flex-col gap-2 items-end" data-testid="sticky-register">
          <Link
            to="/register"
            className="bg-[#D4AF37] text-[#0B1C3D] px-6 py-3 rounded-full font-semibold shadow-lg shadow-[#D4AF37]/30 hover:shadow-[#D4AF37]/50 transition-all text-sm animate-glow-pulse"
          >
            Register Now
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
