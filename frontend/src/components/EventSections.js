import { useRef, useState, useEffect } from "react";
import { Flame, BookOpen, Star, Music, Sparkles } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

const ACHARYA_IMG = "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/sp8jvknu_Untitled%20design%20%282%29.png";
const PUSHKAR_URL = "https://images.pexels.com/photos/6363480/pexels-photo-6363480.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const ELDER_IMAGES = [
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/l9byhsc7_1.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/f6hr3qf6_2.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/gid5pcac_Gemini_Generated_Image_izosotizosotizos.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/okqs8yx2_4.png",
];

const EPISODE_IMAGES = [
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/rhwshqyd_1.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/l1x3vlre_2.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/57bikqhf_3.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/h4uid6r3_4.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/q40z0bp9_5.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/n3cazleg_6.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/lpnclbmo_7.png",
];

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

/* === QUOTE (SHLOKA) SECTION - Ancient Parchment Aesthetic === */
export function QuoteSection() {
  const { t, lang } = useLang();
  return (
    <section data-testid="quote-section" className="py-8 sm:py-10 bg-[#0B1C3D] relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="relative flex items-center gap-4 sm:gap-6 rounded-xl px-5 sm:px-8 py-5 sm:py-6 overflow-hidden border border-[#D4AF37]/30"
            style={{
              background: "linear-gradient(135deg, #2a1f0e 0%, #1a1408 30%, #2a1f0e 60%, #1a1408 100%)",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.4)",
            }}>
            {/* Parchment texture overlay */}
            <div className="absolute inset-0 opacity-[0.06]" style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E\")",
              backgroundSize: "150px 150px",
            }} />
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#D4AF37]/40 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#D4AF37]/40 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#D4AF37]/40 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#D4AF37]/40 rounded-br-lg" />

            <div className="hidden sm:block text-[#D4AF37]/50 text-5xl leading-none relative z-10" style={{ fontFamily: "serif", textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>&ldquo;</div>
            <div className="flex-1 min-w-0 relative z-10">
              <p className="text-[#D4AF37] text-sm sm:text-base italic leading-relaxed" style={{ fontFamily: "'Tiro Devanagari Hindi', serif", textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
                {t.verse.sanskrit}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                <span className="text-[#D4AF37]/40 text-xs font-medium tracking-wider">{t.verse.source}</span>
                <span className="text-[#F8F1E5]/50 text-xs leading-relaxed" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>
                  {t.verse.meaning}
                </span>
              </div>
            </div>
            <div className="hidden sm:block text-[#D4AF37]/50 text-5xl leading-none relative z-10" style={{ fontFamily: "serif", textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>&rdquo;</div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === LOVING MEMORY SECTION - With Photos === */
export function LovingMemorySection() {
  const { t, lang } = useLang();
  const fontHi = lang === "hi" ? "'Tiro Devanagari Hindi', serif" : "'Cormorant Garamond', serif";
  return (
    <section data-testid="loving-memory-section" className="py-20 sm:py-28 bg-[#0B1C3D] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1C3D] via-[#0d1f3f] to-[#0B1C3D]" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">{t.lovingMemory.subtitle}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F8F1E5] mb-4" style={{ fontFamily: fontHi }}>
            {t.lovingMemory.title}
          </h2>
          <div className="gold-divider w-24 mx-auto mt-4 mb-8" />
          <p className="text-[#F8F1E5]/60 text-base sm:text-lg mb-10 leading-relaxed max-w-3xl mx-auto" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>
            {t.lovingMemory.description}
          </p>
        </FadeIn>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-6 max-w-4xl mx-auto mb-8">
          {t.lovingMemory.elders.map((elder, i) => (
            <FadeIn key={i} delay={i * 120}>
              <div className="text-center group">
                <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-full overflow-hidden border-2 border-[#D4AF37]/30 mb-3 group-hover:border-[#D4AF37]/60 transition-all shadow-lg shadow-[#0B1C3D]/50">
                  <img src={ELDER_IMAGES[i]} alt={elder} className="w-full h-full object-cover object-top" loading="lazy" />
                </div>
                <p className="text-[#F8F1E5] text-xs sm:text-sm font-semibold leading-tight" style={{ fontFamily: fontHi }}>
                  {elder}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={500}>
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
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.about.title}</h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>
        <FadeIn delay={200}>
          <div className="max-w-4xl mx-auto space-y-5 text-[#0B1C3D]/80 text-base sm:text-lg leading-relaxed text-center" style={{ fontFamily: fontHi }}>
            <p>{t.about.mainParagraph}</p>
            <p className="text-[#E67E22] italic" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', serif" : "'Cormorant Garamond', serif", fontSize: "1.1em" }}>
              {t.about.invite}
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === ACHARYA / VYAS PEETH SECTION - Single Center Column === */
export function AcharyaSection() {
  const { t, lang } = useLang();
  const fontHi = lang === "hi" ? "'Tiro Devanagari Hindi', serif" : "'Cormorant Garamond', serif";
  return (
    <section id="acharya" data-testid="acharya-section" className="py-20 sm:py-28 bg-[#0B1C3D] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1C3D] via-[#0B1C3D] to-[#1a2d52]" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">{t.vyasPeeth.subtitle}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F8F1E5] mb-10" style={{ fontFamily: fontHi }}>
            {t.vyasPeeth.title}
          </h2>
        </FadeIn>

        {/* Main Acharya - Center */}
        <FadeIn delay={200}>
          <div className="mb-8">
            <div className="relative inline-block mb-5">
              <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#E67E22]/20 mx-auto flex items-center justify-center animate-glow-pulse">
                <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-full border-2 border-[#D4AF37]/40 overflow-hidden">
                  <img src={ACHARYA_IMG} alt="Acharya Shri Janak Ji" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl text-[#D4AF37] font-bold mb-1" style={{ fontFamily: fontHi }}>{t.vyasPeeth.honorific}</h3>
            <h3 className="text-3xl sm:text-4xl text-[#F8F1E5] font-bold mb-2" style={{ fontFamily: fontHi }}>{t.vyasPeeth.mainName}</h3>
            <p className="text-[#D4AF37]/80 text-lg mb-6" style={{ fontFamily: fontHi }}>{t.vyasPeeth.greeting}</p>
          </div>
        </FadeIn>

        {/* Guru - Small Horizontal Inline */}
        <FadeIn delay={350}>
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-8 bg-[#F8F1E5]/5 border border-[#D4AF37]/15 rounded-full px-5 py-3 sm:px-8 sm:py-4 inline-flex mx-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-[#D4AF37]/30 overflow-hidden shrink-0">
              <img src="https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/abo9dtvd_images%20%281%29.webp" alt="Jagadguru Shri Rambhadracharya Ji" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <p className="text-[#F8F1E5]/50 text-xs">{t.vyasPeeth.guruLabel}</p>
              <p className="text-[#D4AF37] text-sm sm:text-base font-semibold" style={{ fontFamily: fontHi }}>{t.vyasPeeth.guruName}</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={450}>
          <p className="text-[#F8F1E5]/70 text-base sm:text-lg max-w-xl mx-auto leading-relaxed" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>
            {t.vyasPeeth.description}
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* === SCHEDULE SECTION (Merged with Other Programmes) === */
export function ScheduleSection() {
  const { t, lang } = useLang();
  const fontHi = lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined;
  const icons = [<Music size={20} />, <Sparkles size={20} />, <Flame size={20} />];
  const reordered = [t.specialPrograms.programs[1], t.specialPrograms.programs[0], t.specialPrograms.programs[2]];

  return (
    <section id="schedule" data-testid="schedule-section" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">{t.schedule.subtitle}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.schedule.title}</h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {t.schedule.sessions.map((item, i) => (
            <FadeIn key={i} delay={i * 150}>
              <div className="bg-white rounded-2xl p-8 border border-[#D4AF37]/20 card-glow sacred-border">
                <p className="text-[#D4AF37] text-sm tracking-wider uppercase mb-2" style={{ fontFamily: fontHi }}>{item.label}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0B1C3D] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{item.date}</h3>
                <p className="text-[#0B1C3D]/60 text-sm mb-1" style={{ fontFamily: fontHi }}>{item.day}</p>
                <p className="text-[#E67E22] text-lg font-semibold" style={{ fontFamily: fontHi }}>{item.time}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Other Programmes — merged into same section */}
        <FadeIn>
          <div className="text-center mt-16 mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.specialPrograms.title}</h3>
            <div className="gold-divider w-16 mx-auto mt-4" />
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {reordered.map((prog, i) => (
              <div key={i} className="bg-white border border-[#D4AF37]/20 rounded-2xl p-6 card-glow text-center">
                <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4 text-[#D4AF37] animate-flicker">
                  {icons[i]}
                </div>
                <h4 className="text-lg font-bold text-[#0B1C3D] mb-2" style={{ fontFamily: fontHi || "'Cormorant Garamond', serif" }}>{prog.name}</h4>
                <p className="text-[#0B1C3D]/50 text-sm" style={{ fontFamily: fontHi }}>{prog.date}</p>
                <p className="text-[#E67E22] font-semibold" style={{ fontFamily: fontHi }}>{prog.time}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === (SpecialProgramsSection merged into ScheduleSection above) === */

/* === KATHA EPISODES - Individual Day Images === */
export function KathaEpisodesSection() {
  const { t, lang } = useLang();
  const fontHi = lang === "hi" ? "'Tiro Devanagari Hindi', serif" : "'Cormorant Garamond', serif";

  return (
    <section id="katha-themes" data-testid="katha-episodes-section" className="py-20 sm:py-28 bg-[#0B1C3D] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">{t.episodes.subtitle}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F8F1E5]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.episodes.title}</h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {t.episodes.days.map((theme, i) => (
            <FadeIn key={i} delay={i * 80}>
              <div className="bg-[#F8F1E5] rounded-2xl border border-[#D4AF37]/15 card-glow group relative overflow-hidden h-full">
                <div className="h-40 sm:h-44 overflow-hidden">
                  <img src={EPISODE_IMAGES[i]} alt={theme.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="p-5">
                  <span className="bg-[#D4AF37]/20 text-[#0B1C3D] text-xs font-bold px-3 py-1 rounded-full border border-[#D4AF37]/30 inline-flex items-center gap-1.5 mb-3">
                    <BookOpen size={12} /> {theme.label}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-[#0B1C3D] mb-2 leading-tight" style={{ fontFamily: fontHi }}>{theme.title}</h3>
                  <p className="text-[#0B1C3D]/50 text-xs sm:text-sm leading-relaxed" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>{theme.topics}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
