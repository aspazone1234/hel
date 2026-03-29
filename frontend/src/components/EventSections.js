import { useRef, useState, useEffect } from "react";
import { Flame, BookOpen, Star, Music, Sparkles, Heart } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

const PUSHKAR_URL = "https://images.pexels.com/photos/6363480/pexels-photo-6363480.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const DIYA_URL = "https://images.pexels.com/photos/30425298/pexels-photo-30425298.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const INVITATION_P3 = "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/kuwkzrys_Shrimad%20Bhagavata%20Katha%20E-Nimantran%20-%20Panchariya%20Pariwar_pages-to-jpg-0003.jpg";
const INVITATION_P4 = "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/p1id4z6t_Shrimad%20Bhagavata%20Katha%20E-Nimantran%20-%20Panchariya%20Pariwar_pages-to-jpg-0004.jpg";

function FadeIn({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-1000 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* === LOVING MEMORY SECTION === */
export function LovingMemorySection() {
  const { t, lang } = useLang();
  const fontHi = lang === "hi" ? "'Tiro Devanagari Hindi', serif" : "'Cormorant Garamond', serif";
  return (
    <section data-testid="loving-memory-section" className="py-20 sm:py-28 bg-[#0B1C3D] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1C3D] via-[#0d1f3f] to-[#0B1C3D]" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <Heart className="text-[#F1948A] mx-auto mb-5" size={28} />
          <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">{t.lovingMemory.subtitle}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F8F1E5] mb-4" style={{ fontFamily: fontHi }}>
            {t.lovingMemory.title}
          </h2>
          <div className="gold-divider w-24 mx-auto mt-4 mb-8" />
          <p className="text-[#F8F1E5]/60 text-base sm:text-lg mb-8 leading-relaxed" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>
            {t.lovingMemory.description}
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
            {t.lovingMemory.elders.map((elder, i) => (
              <div key={i} className="border border-[#D4AF37]/20 rounded-xl px-5 py-4 bg-[#D4AF37]/5 card-glow">
                <p className="text-[#F8F1E5] text-sm sm:text-base font-semibold" style={{ fontFamily: fontHi }}>
                  {elder}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[#F8F1E5]/40 text-sm italic" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>
            {t.lovingMemory.tribute}
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* === ABOUT SECTION === */
export function AboutSection() {
  const { t, lang } = useLang();
  const fontHi = lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined;
  return (
    <section id="about" data-testid="about-section" className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url(${PUSHKAR_URL})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">{t.about.subtitle}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {t.about.title}
            </h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>
        <FadeIn delay={200}>
          <div className="max-w-4xl mx-auto space-y-5 text-[#0B1C3D]/80 text-base sm:text-lg leading-relaxed text-center" style={{ fontFamily: fontHi }}>
            <p>{t.about.p1}</p>
            <p>{t.about.p2}</p>
            <p>{t.about.p3}</p>
            <p className="text-[#E67E22] italic" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', serif" : "'Cormorant Garamond', serif", fontSize: "1.1em" }}>
              {t.about.p4}
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === ACHARYA / VYAS PEETH SECTION === */
export function AcharyaSection() {
  const { t, lang } = useLang();
  const fontHi = lang === "hi" ? "'Tiro Devanagari Hindi', serif" : "'Cormorant Garamond', serif";
  return (
    <section id="acharya" data-testid="acharya-section" className="py-20 sm:py-28 bg-[#0B1C3D] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1C3D] via-[#0B1C3D] to-[#1a2d52]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">{t.vyasPeeth.subtitle}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F8F1E5]" style={{ fontFamily: fontHi }}>
              {t.vyasPeeth.title}
            </h2>
            <div className="gold-divider w-24 mx-auto mt-6 mb-12" />
          </div>
        </FadeIn>
        <FadeIn delay={200}>
          <div className="grid lg:grid-cols-5 gap-8 items-center max-w-5xl mx-auto">
            {/* Main Acharya - Large */}
            <div className="lg:col-span-3 text-center">
              <div className="relative inline-block mb-6">
                <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#E67E22]/20 mx-auto flex items-center justify-center animate-glow-pulse">
                  <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-[#0B1C3D] border-2 border-[#D4AF37]/40 flex items-center justify-center overflow-hidden">
                    <img src={INVITATION_P3} alt="Acharya Shri Janak Ji" className="w-full h-full object-cover object-[center_15%]" />
                  </div>
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl text-[#D4AF37] font-bold mb-1" style={{ fontFamily: fontHi }}>
                {t.vyasPeeth.honorific}
              </h3>
              <h3 className="text-3xl sm:text-4xl text-[#F8F1E5] font-bold mb-2" style={{ fontFamily: fontHi }}>
                {t.vyasPeeth.mainName}
              </h3>
              <p className="text-[#D4AF37]/80 text-lg mb-6" style={{ fontFamily: fontHi }}>
                {t.vyasPeeth.greeting}
              </p>
              <p className="text-[#F8F1E5]/70 text-base sm:text-lg max-w-xl mx-auto leading-relaxed" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>
                {t.vyasPeeth.description}
              </p>
            </div>
            {/* Guru - Smaller */}
            <div className="lg:col-span-2 text-center">
              <div className="relative inline-block mb-4">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#E67E22]/10 mx-auto flex items-center justify-center">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#0B1C3D] border-2 border-[#D4AF37]/30 flex items-center justify-center">
                    <Star size={36} className="text-[#D4AF37]" />
                  </div>
                </div>
              </div>
              <p className="text-[#F8F1E5]/50 text-sm tracking-wider uppercase mb-2">
                {t.vyasPeeth.guruLabel}
              </p>
              <h4 className="text-xl sm:text-2xl text-[#D4AF37] font-bold" style={{ fontFamily: fontHi }}>
                {t.vyasPeeth.guruName}
              </h4>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === SCHEDULE SECTION === */
export function ScheduleSection() {
  const { t, lang } = useLang();
  const fontHi = lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined;

  return (
    <section id="schedule" data-testid="schedule-section" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">{t.schedule.subtitle}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {t.schedule.title}
            </h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {t.schedule.sessions.map((item, i) => (
            <FadeIn key={i} delay={i * 150}>
              <div className="bg-white rounded-2xl p-8 border border-[#D4AF37]/20 card-glow sacred-border">
                <p className="text-[#D4AF37] text-sm tracking-wider uppercase mb-2" style={{ fontFamily: fontHi }}>{item.label}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0B1C3D] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {item.date}
                </h3>
                <p className="text-[#0B1C3D]/60 text-sm mb-1" style={{ fontFamily: fontHi }}>{item.day}</p>
                <p className="text-[#E67E22] text-lg font-semibold" style={{ fontFamily: fontHi }}>{item.time}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Verse */}
        <FadeIn delay={300}>
          <div className="max-w-3xl mx-auto bg-[#0B1C3D] rounded-2xl p-8 text-center border border-[#D4AF37]/20 mb-12">
            <p className="text-[#D4AF37] text-base sm:text-lg italic leading-relaxed mb-3 whitespace-pre-line" style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}>
              {t.verse.sanskrit}
            </p>
            <p className="text-[#F8F1E5]/40 text-xs mb-3">{t.verse.source}</p>
            <p className="text-[#F8F1E5]/60 text-sm leading-relaxed" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>
              {t.verse.meaning}
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === SPECIAL PROGRAMS === */
export function SpecialProgramsSection() {
  const { t, lang } = useLang();
  const fontHi = lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined;
  const icons = [<Sparkles size={20} />, <Music size={20} />, <Flame size={20} />];

  return (
    <section data-testid="special-programs-section" className="py-16 sm:py-20 bg-[#0B1C3D] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-bold text-[#F8F1E5]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {t.specialPrograms.title}
            </h3>
            <div className="gold-divider w-16 mx-auto mt-4" />
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {t.specialPrograms.programs.map((prog, i) => (
              <div key={i} className="bg-[#0B1C3D] border border-[#D4AF37]/20 rounded-2xl p-6 card-glow text-center">
                <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4 text-[#D4AF37] animate-flicker">
                  {icons[i]}
                </div>
                <h4 className="text-lg font-bold text-[#F8F1E5] mb-2" style={{ fontFamily: fontHi || "'Cormorant Garamond', serif" }}>
                  {prog.name}
                </h4>
                <p className="text-[#F8F1E5]/50 text-sm" style={{ fontFamily: fontHi }}>{prog.date}</p>
                <p className="text-[#D4AF37] font-semibold" style={{ fontFamily: fontHi }}>{prog.time}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === KATHA EPISODES SECTION (Image Heavy) === */
export function KathaEpisodesSection() {
  const { t, lang } = useLang();
  const fontHi = lang === "hi" ? "'Tiro Devanagari Hindi', serif" : "'Cormorant Garamond', serif";
  const gradients = [
    "from-[#D4AF37]/20 to-[#E67E22]/10",
    "from-[#F1948A]/20 to-[#D4AF37]/10",
    "from-[#E67E22]/20 to-[#D4AF37]/10",
    "from-[#D4AF37]/15 to-[#F1948A]/10",
    "from-[#F1948A]/15 to-[#E67E22]/10",
    "from-[#D4AF37]/20 to-[#F1948A]/15",
    "from-[#E67E22]/15 to-[#D4AF37]/15",
  ];

  return (
    <section id="katha-themes" data-testid="katha-episodes-section" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">{t.episodes.subtitle}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {t.episodes.title}
            </h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>

        {/* Invitation Image Reference */}
        <FadeIn delay={100}>
          <div className="max-w-3xl mx-auto mb-12 rounded-2xl overflow-hidden border border-[#D4AF37]/20 shadow-xl">
            <img src={INVITATION_P4} alt="Katha Episodes from Invitation" className="w-full object-cover" loading="lazy" />
          </div>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {t.episodes.days.map((theme, i) => (
            <FadeIn key={i} delay={i * 80}>
              <div className={`bg-gradient-to-br ${gradients[i]} rounded-2xl p-6 border border-[#D4AF37]/15 card-glow group relative overflow-hidden h-full`}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-[#E67E22] opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-[#D4AF37]/20 text-[#0B1C3D] text-xs font-bold px-3 py-1 rounded-full border border-[#D4AF37]/30">
                    {theme.label}
                  </span>
                  <BookOpen size={16} className="text-[#D4AF37]/60" />
                </div>
                <h3 className="text-lg font-bold text-[#0B1C3D] mb-2" style={{ fontFamily: fontHi }}>
                  {theme.title}
                </h3>
                <p className="text-[#0B1C3D]/50 text-sm leading-relaxed" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>
                  {theme.topics}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
