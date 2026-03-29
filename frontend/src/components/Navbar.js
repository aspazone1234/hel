import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Volume2, VolumeX } from "lucide-react";

// Indian pentatonic scale (Sa Re Ga Ma Pa) in different octaves
const FLUTE_NOTES = [523.25, 587.33, 659.25, 739.99, 783.99, 739.99, 659.25, 587.33, 523.25, 493.88, 523.25, 587.33];

function createFlutePlayer() {
  let ctx = null;
  let masterGain = null;
  let oscillators = [];
  let melodyTimer = null;

  const start = () => {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Main oscillator
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(FLUTE_NOTES[0], ctx.currentTime);

    // Vibrato LFO
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(4.5, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(4, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Breathy layer
    const breathOsc = ctx.createOscillator();
    breathOsc.type = "triangle";
    breathOsc.frequency.setValueAtTime(FLUTE_NOTES[0] * 2, ctx.currentTime);
    const breathGain = ctx.createGain();
    breathGain.gain.setValueAtTime(0.015, ctx.currentTime);
    breathOsc.connect(breathGain);

    // Master volume
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);

    osc.connect(masterGain);
    breathGain.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc.start();
    lfo.start();
    breathOsc.start();
    oscillators = [osc, lfo, breathOsc];

    // Melody loop
    let noteIdx = 0;
    melodyTimer = setInterval(() => {
      if (!ctx) return;
      noteIdx = (noteIdx + 1) % FLUTE_NOTES.length;
      const note = FLUTE_NOTES[noteIdx];
      osc.frequency.linearRampToValueAtTime(note, ctx.currentTime + 1.2);
      breathOsc.frequency.linearRampToValueAtTime(note * 2, ctx.currentTime + 1.2);
    }, 2500);
  };

  const stop = () => {
    if (melodyTimer) { clearInterval(melodyTimer); melodyTimer = null; }
    if (masterGain && ctx) {
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    }
    setTimeout(() => {
      oscillators.forEach(o => { try { o.stop(); } catch {} });
      oscillators = [];
      if (ctx) { try { ctx.close(); } catch {} ctx = null; }
    }, 600);
  };

  return { start, stop };
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const fluteRef = useRef(null);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleSound = useCallback(() => {
    if (!fluteRef.current) fluteRef.current = createFlutePlayer();
    if (soundOn) {
      fluteRef.current.stop();
    } else {
      fluteRef.current.start();
    }
    setSoundOn(s => !s);
  }, [soundOn]);

  useEffect(() => {
    return () => { if (fluteRef.current) fluteRef.current.stop(); };
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    if (!isHome) { window.location.href = `/#${id}`; return; }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const navLinks = [
    { label: "About", id: "about" },
    { label: "Schedule", id: "schedule" },
    { label: "Venue", id: "venue" },
    { label: "Contact", id: "contact" },
  ];

  return (
    <nav
      data-testid="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0B1C3D]/90 backdrop-blur-xl shadow-lg shadow-[#0B1C3D]/20"
          : "bg-[#0B1C3D]/70 backdrop-blur-md"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
            <span className="text-[#D4AF37] text-2xl sm:text-3xl font-semibold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Om
            </span>
            <span className="text-[#F8F1E5] text-sm sm:text-base font-light tracking-wider hidden sm:block">
              Bhagavat Katha 2026
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="text-[#F8F1E5]/80 hover:text-[#D4AF37] transition-colors text-sm tracking-wider uppercase"
                data-testid={`nav-${link.id}`}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={toggleSound}
              className={`${soundOn ? "text-[#D4AF37]" : "text-[#F8F1E5]/60"} hover:text-[#D4AF37] transition-colors p-2`}
              data-testid="sound-toggle"
              title={soundOn ? "Mute Flute" : "Play Flute"}
            >
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <Link
              to="/register"
              data-testid="nav-register-btn"
              className="bg-[#D4AF37] text-[#0B1C3D] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#D4AF37]/90 transition-all shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40"
            >
              Register Now
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-[#F8F1E5] p-2"
            data-testid="mobile-menu-toggle"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#0B1C3D]/95 backdrop-blur-xl border-t border-[#D4AF37]/20 animate-[fade-in-up_0.3s_ease]">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="block w-full text-left text-[#F8F1E5]/80 hover:text-[#D4AF37] py-2 text-sm tracking-wider uppercase"
              >
                {link.label}
              </button>
            ))}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={toggleSound}
                className={`${soundOn ? "text-[#D4AF37]" : "text-[#F8F1E5]/60"} hover:text-[#D4AF37] transition-colors p-2`}
              >
                {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 bg-[#D4AF37] text-[#0B1C3D] px-6 py-2.5 rounded-full text-sm font-semibold text-center"
              >
                Register Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
