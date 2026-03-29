import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, ChevronDown } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { startFluteOnDoorOpen } from "@/components/Navbar";

const MANDALA_URL = "https://static.prod-images.emergentagent.com/jobs/5bf2bda2-8412-46a4-8b32-53f8647e4ca2/images/35e418be769cfa52cd10a59ae3b385a4d13d9f3b25966ee85e423a509366becc.png";
const KRISHNA_URL = "https://images.unsplash.com/photo-1750752606237-81362e344170?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxoaW5kdSUyMGdvZCUyMGtyaXNobmElMjBmbHV0ZXxlbnwwfHx8fDE3NzQ3NzYwOTV8MA&ixlib=rb-4.1.0&q=85&w=800";

function CountdownTimer() {
  const { t } = useLang();
  const target = useMemo(() => new Date("2026-05-28T09:15:00+05:30").getTime(), []);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const units = [
    { label: t.hero.days, value: timeLeft.days },
    { label: t.hero.hours, value: timeLeft.hours },
    { label: t.hero.minutes, value: timeLeft.minutes },
    { label: t.hero.seconds, value: timeLeft.seconds },
  ];

  return (
    <div data-testid="countdown-timer" className="flex gap-3 sm:gap-4 justify-center sm:justify-start">
      {units.map((u) => (
        <div key={u.label} className="text-center">
          <div className="relative bg-[#0B1C3D]/80 border border-[#D4AF37]/40 rounded-lg px-3 py-2 sm:px-4 sm:py-3 min-w-[56px] sm:min-w-[72px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/10 to-transparent" />
            <span className="relative text-[#D4AF37] text-xl sm:text-3xl font-bold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {String(u.value).padStart(2, "0")}
            </span>
          </div>
          <span className="text-[#F8F1E5]/50 text-[10px] sm:text-xs mt-1.5 block tracking-wider uppercase">
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 10,
      duration: 8 + Math.random() * 8,
      alt: i % 2 === 0,
    })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            bottom: "-10px",
            width: p.size,
            height: p.size,
            animation: `${p.alt ? "float-up-alt" : "float-up"} ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function GoldenDoorOverlay({ onEnter }) {
  const { t } = useLang();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer select-none"
      onClick={onEnter}
      data-testid="golden-door-overlay"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[#050d1a]" />

      {/* Mandala pattern bg */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `url(${MANDALA_URL})`, backgroundSize: "cover", backgroundPosition: "center" }} />

      {/* Left Door */}
      <div className="golden-door golden-door-left" data-testid="golden-door-left">
        <div className="door-ornament">
          <div className="door-mandala" />
          <div className="door-mandala" />
          <div className="door-mandala" />
        </div>
        <div className="door-handle-left" />
      </div>

      {/* Right Door */}
      <div className="golden-door golden-door-right" data-testid="golden-door-right">
        <div className="door-ornament">
          <div className="door-mandala" />
          <div className="door-mandala" />
          <div className="door-mandala" />
        </div>
        <div className="door-handle-right" />
      </div>

      {/* Center Glow Line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-gradient-to-b from-transparent via-[#D4AF37]/60 to-transparent z-[102] animate-pulse" />

      {/* Enter Text */}
      <div className="relative z-[103] text-center pointer-events-none animate-[fade-in-up_1s_ease]">
        <p className="text-[#D4AF37] text-base sm:text-lg tracking-[0.4em] uppercase mb-3 animate-pulse" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {t.hero.enterSubtext}
        </p>
        <h2 className="text-[#F8F1E5] text-3xl sm:text-5xl font-bold mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {t.hero.enterText}
        </h2>
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37]/50 flex items-center justify-center animate-bounce">
            <div className="w-3 h-3 rounded-full bg-[#D4AF37] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const { t, lang } = useLang();
  const [showDoor, setShowDoor] = useState(true);
  const [doorOpening, setDoorOpening] = useState(false);
  const calendarUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Shrimad%20Bhagavat%20Katha%20Gyan%20Yajna%202026&dates=20260528T094500Z/20260603T134500Z&location=Shri%20Gautam%20Ashram%2C%20Pushkar%2C%20Rajasthan&details=A%20sacred%20family%20offering%20of%20devotion%2C%20faith%2C%20and%20divine%20knowledge";

  const handleEnter = () => {
    setDoorOpening(true);
    startFluteOnDoorOpen();
    setTimeout(() => setShowDoor(false), 1800);
  };

  return (
    <>
      {showDoor && !doorOpening && <GoldenDoorOverlay onEnter={handleEnter} />}
      {doorOpening && showDoor && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <div className="absolute inset-0 bg-[#050d1a]" />
          <div className="golden-door golden-door-left door-opening-left" />
          <div className="golden-door golden-door-right door-opening-right" />
          <div className="absolute inset-0 bg-[#D4AF37]/10 animate-[fade-out_1.5s_ease_forwards]" />
        </div>
      )}

      <section
        data-testid="hero-section"
        className="relative min-h-screen flex items-center overflow-hidden bg-[#0B1C3D]"
      >
        <div className="absolute inset-0 mandala-overlay" style={{ backgroundImage: `url(${MANDALA_URL})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1C3D]/30 via-transparent to-[#0B1C3D]/80" />
        <FloatingParticles />
        <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/10 blur-[100px] animate-aura hidden lg:block" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left space-y-6 sm:space-y-8 animate-[fade-in-up_1s_ease]">
              <div className="space-y-2">
                <p className="text-[#D4AF37] text-sm sm:text-base tracking-[0.3em] uppercase font-light">
                  {t.hero.sacred}
                </p>
                <h1 className="text-[#F8F1E5] text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight animate-text-glow" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', 'Cormorant Garamond', serif" : "'Cormorant Garamond', serif" }}>
                  {t.hero.title1}<br />
                  <span className="gradient-gold-text">{t.hero.title2}</span>
                </h1>
                <p className="text-[#D4AF37]/80 text-xl sm:text-2xl font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {t.hero.year}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 text-[#F8F1E5]/70 text-sm sm:text-base justify-center lg:justify-start">
                <span className="flex items-center gap-2">
                  <Calendar size={16} className="text-[#D4AF37]" />
                  {t.hero.date}
                </span>
                <span className="hidden sm:block text-[#D4AF37]/40">|</span>
                <span className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#D4AF37]" />
                  {t.hero.location}
                </span>
              </div>

              <p className="text-[#F8F1E5]/60 text-sm sm:text-base max-w-lg mx-auto lg:mx-0 leading-relaxed">
                {t.hero.description}
              </p>

              <div className="flex flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start">
                <Link
                  to="/register"
                  data-testid="hero-register-btn"
                  className="bg-[#D4AF37] text-[#0B1C3D] px-8 py-3.5 rounded-full font-semibold hover:bg-[#D4AF37]/90 transition-all shadow-lg shadow-[#D4AF37]/25 hover:shadow-[#D4AF37]/40 text-sm sm:text-base"
                >
                  {t.hero.registerBtn}
                </Link>
                <button
                  onClick={() => document.getElementById("schedule")?.scrollIntoView({ behavior: "smooth" })}
                  data-testid="hero-schedule-btn"
                  className="border border-[#D4AF37]/40 text-[#D4AF37] px-8 py-3.5 rounded-full font-medium hover:bg-[#D4AF37]/10 transition-all text-sm sm:text-base"
                >
                  {t.hero.scheduleBtn}
                </button>
              </div>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start text-sm">
                <a
                  href="https://maps.google.com/maps?q=Shri+Gautam+Ashram+Pushkar+Rajasthan"
                  target="_blank" rel="noopener noreferrer" data-testid="hero-directions-btn"
                  className="text-[#F8F1E5]/50 hover:text-[#D4AF37] flex items-center gap-1.5 transition-colors"
                >
                  <MapPin size={14} /> {t.hero.directionsBtn}
                </a>
                <a
                  href={calendarUrl}
                  target="_blank" rel="noopener noreferrer" data-testid="add-to-calendar-btn"
                  className="text-[#F8F1E5]/50 hover:text-[#D4AF37] flex items-center gap-1.5 transition-colors"
                >
                  <Calendar size={14} /> {t.hero.addCalendar}
                </a>
              </div>

              <div className="pt-4 sm:pt-6">
                <CountdownTimer />
              </div>
            </div>

            <div className="hidden lg:flex justify-center animate-[scale-in_1.2s_ease]">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#D4AF37]/20 blur-[60px] scale-110 animate-aura" />
                <img
                  src={KRISHNA_URL}
                  alt="Divine Krishna"
                  className="relative z-10 w-[350px] h-[450px] object-cover rounded-3xl border-2 border-[#D4AF37]/30 shadow-2xl animate-glow-pulse"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <ChevronDown size={24} className="text-[#D4AF37]/50" />
        </div>
      </section>
    </>
  );
}
