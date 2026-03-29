import { useRef, useState, useEffect } from "react";
import { Flame, BookOpen, Star, Music, Sparkles } from "lucide-react";

const PUSHKAR_URL = "https://images.unsplash.com/photo-1715168931029-2949161ee406?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxQdXNoa2FyJTIwbGFrZSUyMHJhamFzdGhhbnxlbnwwfHx8fDE3NzQ3NzYwODF8MA&ixlib=rb-4.1.0&q=85&w=1200";
const DIYA_URL = "https://images.unsplash.com/photo-1676354672676-8c150e31bfe1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODd8MHwxfHNlYXJjaHwxfHxkaXlhJTIwbGFtcCUyMGxpZ2h0fGVufDB8fHx8MTc3NDc3NjA4Mnww&ixlib=rb-4.1.0&q=85&w=400";

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
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* === ABOUT SECTION === */
export function AboutSection() {
  return (
    <section id="about" data-testid="about-section" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url(${PUSHKAR_URL})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">About the Event</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              A Sacred Family Offering
            </h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>
        <FadeIn delay={200}>
          <div className="max-w-4xl mx-auto space-y-6 text-[#0B1C3D]/80 text-base sm:text-lg leading-relaxed text-center">
            <p>
              By the grace of Bhagwan and with the blessings of our revered parents, ancestors, and gurus, 
              we are blessed with the opportunity to organize this <strong className="text-[#0B1C3D]">Shrimad Bhagavat Katha Mahotsav</strong> in 
              the sacred land of Pushkar.
            </p>
            <p>
              This divine <span className="text-[#E67E22] font-medium">aayojan</span> is not merely a religious event, but a heartfelt expression of 
              faith, devotion, culture, and remembrance. It is a spiritual yajna where families come together 
              to experience the nectar of Bhagavat Katha, strengthen their inner connection, and receive divine blessings.
            </p>
            <p>
              This sacred initiative has taken shape under the inspiration, guidance, and blessings of our beloved elders, 
              especially <strong className="text-[#0B1C3D]">Pujya Pitri-Dev Behen Alka Jiji</strong>, whose divine presence continues to guide us.
            </p>
            <p className="text-[#E67E22] italic" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1em" }}>
              We warmly invite you and your family to join us, listen to the katha, and become a part of this spiritual celebration.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === ACHARYA SECTION === */
export function AcharyaSection() {
  return (
    <section id="acharya" data-testid="acharya-section" className="py-24 sm:py-32 bg-[#0B1C3D] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1C3D] via-[#0B1C3D] to-[#1a2d52]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">Vyas Peeth</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F8F1E5]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Vyas Peeth Will Be Adorned By
            </h2>
            <div className="gold-divider w-24 mx-auto mt-6 mb-12" />
          </div>
        </FadeIn>
        <FadeIn delay={200}>
          <div className="max-w-3xl mx-auto text-center">
            <div className="relative inline-block mb-8">
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#E67E22]/20 mx-auto flex items-center justify-center animate-glow-pulse">
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#0B1C3D] border-2 border-[#D4AF37]/40 flex items-center justify-center">
                  <Star size={48} className="text-[#D4AF37]" />
                </div>
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl text-[#D4AF37] font-bold mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Param Shraddheya Pujya
            </h3>
            <h3 className="text-3xl sm:text-4xl text-[#F8F1E5] font-bold mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Acharya Shri Janak Ji
            </h3>
            <p className="text-[#D4AF37]/80 text-lg mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              (Jai Jai Hari)
            </p>
            <p className="text-[#F8F1E5]/60 text-sm tracking-wider uppercase mb-8">
              Disciple of Jagadguru Shri Rambhadracharya Ji
            </p>
            <p className="text-[#F8F1E5]/70 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              With his divine knowledge, simplicity, and spiritual depth, Acharya Shri Janak Ji will illuminate 
              the path of bhakti through the sacred narration of Shrimad Bhagavat.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === SCHEDULE SECTION === */
export function ScheduleSection() {
  const mainSchedule = [
    { date: "28 May 2026", day: "Thursday", time: "3:15 PM - 7:15 PM", label: "Afternoon Session" },
    { date: "29 May - 3 June 2026", day: "Friday to Wednesday", time: "9:15 AM - 12:15 PM", label: "Morning Sessions" },
  ];
  const specialPrograms = [
    { name: "Kalash Yatra", date: "28 May 2026", time: "7:15 AM", icon: <Sparkles size={20} /> },
    { name: "Bhajan & Satsang", date: "Daily", time: "9:15 PM - 11:15 PM", icon: <Music size={20} /> },
    { name: "Havan (Purnahuti)", date: "3 June 2026", time: "3:15 PM", icon: <Flame size={20} /> },
  ];

  return (
    <section id="schedule" data-testid="schedule-section" className="py-24 sm:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">Katha Schedule</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Katha Schedule
            </h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {mainSchedule.map((item, i) => (
            <FadeIn key={i} delay={i * 150}>
              <div className="bg-white rounded-2xl p-8 border border-[#D4AF37]/20 card-glow sacred-border">
                <p className="text-[#D4AF37] text-sm tracking-wider uppercase mb-2">{item.label}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0B1C3D] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {item.date}
                </h3>
                <p className="text-[#0B1C3D]/60 text-sm mb-1">{item.day}</p>
                <p className="text-[#E67E22] text-lg font-semibold">{item.time}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={300}>
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Special Programs
            </h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {specialPrograms.map((prog, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-[#D4AF37]/20 card-glow text-center">
                <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4 text-[#D4AF37] animate-flicker">
                  {prog.icon}
                </div>
                <h4 className="text-lg font-bold text-[#0B1C3D] mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {prog.name}
                </h4>
                <p className="text-[#0B1C3D]/60 text-sm">{prog.date}</p>
                <p className="text-[#E67E22] font-semibold">{prog.time}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === KATHA THEMES SECTION === */
export function KathaThemesSection() {
  const themes = [
    { day: 1, hindi: "Day 1", title: "Narad, Bhakti & 24 Avatars", topics: "Narad, Bhakti, Gyan, Vairagya, Gokarna, 24 Avatars" },
    { day: 2, hindi: "Day 2", title: "Uttara, Kunti & Parikshit", topics: "Uttara, Kunti, Bhishma, Draupadi, Parikshit, Shuk, Chatushloki, Vidur-Maitreya Samvad, Kapil-Devahuti" },
    { day: 3, hindi: "Day 3", title: "Dhruv, Prithu & Bharatvarsha", topics: "Manu Vansh, Daksha, Dhruv, Prithu, Prachinbarhi, Priyavrat, Rishabhdev, Bharatvarsha" },
    { day: 4, hindi: "Day 4", title: "Vaman, Ram & Krishna Janma", topics: "Vaman, Ram, Krishna Janma, Prahlad, Gajendra Moksha, Bali, Ambarish" },
    { day: 5, hindi: "Day 5", title: "Bal Leela & 56 Bhog", topics: "Bal Leela, 56 Bhog" },
    { day: 6, hindi: "Day 6", title: "Raas Leela", topics: "Raas Leela" },
    { day: 7, hindi: "Day 7", title: "Rukmini Vivah & Sudama", topics: "Rukmini Vivah, Sudama Charitra" },
  ];

  return (
    <section id="katha-themes" data-testid="katha-themes-section" className="py-24 sm:py-32 bg-[#0B1C3D] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">Sacred Episodes</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F8F1E5]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Sacred Episodes of the Katha
            </h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {themes.map((theme, i) => (
            <FadeIn key={i} delay={i * 100}>
              <div className="bg-[#0B1C3D] border border-[#D4AF37]/20 rounded-2xl p-6 card-glow group relative overflow-hidden h-full">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-[#E67E22] opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-bold px-3 py-1 rounded-full">
                    {theme.hindi}
                  </span>
                  <BookOpen size={16} className="text-[#D4AF37]/50" />
                </div>
                <h3 className="text-xl font-bold text-[#F8F1E5] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {theme.title}
                </h3>
                <p className="text-[#F8F1E5]/50 text-sm leading-relaxed">
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
