import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Volume2, VolumeX, Globe } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export const flutePlayerRef = { current: null, soundOn: false };

function createAudioPlayer() {
  const audio = new Audio("/flute.opus");
  audio.loop = true;
  audio.volume = 0.5;
  audio.onerror = () => {
    audio.src = "/flute.mp3";
    audio.load();
  };
  return {
    start: () => { audio.play().catch(() => {}); },
    stop: () => { audio.pause(); audio.currentTime = 0; },
    audio,
  };
}

export function startFluteOnDoorOpen() {
  if (!flutePlayerRef.current) flutePlayerRef.current = createAudioPlayer();
  flutePlayerRef.current.start();
  flutePlayerRef.soundOn = true;
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { lang, toggleLang, t } = useLang();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const check = setInterval(() => setSoundOn(flutePlayerRef.soundOn), 500);
    return () => clearInterval(check);
  }, []);

  const toggleSound = useCallback(() => {
    if (!flutePlayerRef.current) {
      flutePlayerRef.current = createAudioPlayer();
    }
    if (flutePlayerRef.soundOn) {
      flutePlayerRef.current.stop();
      flutePlayerRef.soundOn = false;
    } else {
      flutePlayerRef.current.start();
      flutePlayerRef.soundOn = true;
    }
    setSoundOn(flutePlayerRef.soundOn);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    if (!isHome) { window.location.href = `/#${id}`; return; }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const navLinks = [
    { label: t.nav.about, id: "about" },
    { label: t.nav.schedule, id: "schedule" },
    { label: t.nav.venue, id: "venue" },
    { label: t.nav.family, id: "family" },
    { label: t.nav.contact, id: "contact" },
  ];

  return (
    <nav
      data-testid="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-[#0B1C3D]/90 backdrop-blur-xl shadow-lg shadow-[#0B1C3D]/20" : "bg-[#0B1C3D]/70 backdrop-blur-md"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link to="/" className="flex items-center group" data-testid="nav-logo">
            <span className="text-[#D4AF37] text-base sm:text-lg font-semibold tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {lang === "hi" ? "श्रीमद्भागवत कथा २०२६" : "Shrimad Bhagavat Katha 2026"}
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button key={link.id} onClick={() => scrollTo(link.id)}
                className="text-[#F8F1E5]/80 hover:text-[#D4AF37] transition-colors text-sm tracking-wider uppercase" data-testid={`nav-${link.id}`}>
                {link.label}
              </button>
            ))}
            <button onClick={toggleLang} data-testid="lang-toggle"
              className="flex items-center gap-1.5 bg-[#D4AF37]/15 border border-[#D4AF37]/40 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all hover:bg-[#D4AF37]/25 hover:border-[#D4AF37]/60">
              <Globe size={14} className="text-[#D4AF37]" />
              <span className="text-[#D4AF37]">{lang === "en" ? "हिंदी" : "English"}</span>
            </button>
            <button onClick={toggleSound} data-testid="sound-toggle" title={soundOn ? "Mute" : "Play Flute"}
              className={`${soundOn ? "text-[#D4AF37]" : "text-[#F8F1E5]/60"} hover:text-[#D4AF37] transition-colors p-2`}>
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <Link to="/register" data-testid="nav-register-btn"
              className="bg-[#D4AF37] text-[#0B1C3D] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#D4AF37]/90 transition-all shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40">
              {t.nav.register}
            </Link>
          </div>

          <div className="flex items-center gap-3 md:hidden">
            <button onClick={toggleLang} data-testid="lang-toggle-mobile"
              className="flex items-center gap-1 bg-[#D4AF37]/15 border border-[#D4AF37]/40 rounded-full px-3 py-1.5 text-xs font-semibold">
              <Globe size={12} className="text-[#D4AF37]" />
              <span className="text-[#D4AF37]">{lang === "en" ? "हिंदी" : "EN"}</span>
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="text-[#F8F1E5] p-2" data-testid="mobile-menu-toggle">
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#0B1C3D]/95 backdrop-blur-xl border-t border-[#D4AF37]/20">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <button key={link.id} onClick={() => scrollTo(link.id)}
                className="block w-full text-left text-[#F8F1E5]/80 hover:text-[#D4AF37] py-2 text-sm tracking-wider uppercase">
                {link.label}
              </button>
            ))}
            <div className="flex items-center gap-4 pt-2">
              <button onClick={toggleSound} className={`${soundOn ? "text-[#D4AF37]" : "text-[#F8F1E5]/60"} hover:text-[#D4AF37] transition-colors p-2`}>
                {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <Link to="/register" onClick={() => setMobileOpen(false)}
                className="flex-1 bg-[#D4AF37] text-[#0B1C3D] px-6 py-2.5 rounded-full text-sm font-semibold text-center">
                {t.nav.register}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
