import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, MessageCircle, Users, ExternalLink, ChevronLeft as SlideLeft, ChevronRight as SlideRight } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

const VENUE_SLIDES = [
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/v5knbk6g_slider1.webp",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/jdcu5naw_unnamed.webp",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/ltq1jor4_unnamed.jpg",
];

const FAMILY_CAROUSEL_IMAGES = [
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/2vr3eygd_1.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/d5pr1j11_2.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/49zwq0zu_3.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/q1zzskl6_4.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/o79880ks_5.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/h78gucz8_6.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/gspdfwm1_7.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/1mzm22ht_8.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/10rkt85o_9.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/uoxmc1xz_10.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/5gf61vsr_11.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/v38f20fo_12.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/4zvcz949_13.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/oxjr7h8r_14.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/cf33x059_15.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/60dn4leu_16.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/efz2s19s_17.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/b4i78wlv_18.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/crzlohu2_19.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/klhv2xsc_20.png",
  "https://customer-assets.emergentagent.com/job_shrimad-katha-event/artifacts/8u6ru495_21.png",
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

/* === IMAGE SLIDESHOW === */
function VenueSlideshow() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const next = useCallback(() => setCurrent(c => (c + 1) % VENUE_SLIDES.length), []);
  const prev = useCallback(() => setCurrent(c => (c - 1 + VENUE_SLIDES.length) % VENUE_SLIDES.length), []);

  useEffect(() => {
    timerRef.current = setInterval(next, 4000);
    return () => clearInterval(timerRef.current);
  }, [next]);

  const goTo = (i) => {
    setCurrent(i);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 4000);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/20 group" data-testid="venue-slideshow">
      <div className="relative h-64 sm:h-80">
        {VENUE_SLIDES.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Venue ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
          />
        ))}
      </div>
      <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-[#0B1C3D]/60 hover:bg-[#0B1C3D]/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" data-testid="venue-slide-prev">
        <SlideLeft size={18} />
      </button>
      <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#0B1C3D]/60 hover:bg-[#0B1C3D]/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" data-testid="venue-slide-next">
        <SlideRight size={18} />
      </button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {VENUE_SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? "bg-[#D4AF37] scale-125" : "bg-white/50"}`} />
        ))}
      </div>
    </div>
  );
}

/* === FAMILY IMAGE CAROUSEL === */
function FamilyCarousel() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);
  const [paused, setPaused] = useState(false);

  const total = FAMILY_CAROUSEL_IMAGES.length;
  const next = useCallback(() => setCurrent(c => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + total) % total), [total]);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(next, 3000);
    return () => clearInterval(timerRef.current);
  }, [next, paused]);

  const handlePrev = () => { prev(); setPaused(false); clearInterval(timerRef.current); timerRef.current = setInterval(next, 3000); };
  const handleNext = () => { next(); setPaused(false); clearInterval(timerRef.current); timerRef.current = setInterval(next, 3000); };

  return (
    <div className="max-w-4xl mx-auto mb-10" data-testid="family-carousel">
      {/* Desktop layout: buttons alongside slider */}
      <div className="hidden sm:flex items-center gap-4">
        <button onClick={handlePrev} data-testid="family-slide-prev-desktop"
          className="shrink-0 w-12 h-12 rounded-full bg-[#0B1C3D] border-2 border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#0B1C3D] transition-all shadow-lg">
          <SlideLeft size={22} />
        </button>
        <div className="flex-1 relative rounded-2xl overflow-hidden border-2 border-[#D4AF37]/30 shadow-xl"
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div className="relative h-80 md:h-[28rem]">
            {FAMILY_CAROUSEL_IMAGES.map((src, i) => (
              <img key={i} src={src} alt={`Panchariya Family ${i + 1}`}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out ${i === current ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
                loading="lazy" />
            ))}
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#0B1C3D]/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-[#D4AF37] text-xs font-semibold">{current + 1} / {total}</span>
          </div>
        </div>
        <button onClick={handleNext} data-testid="family-slide-next-desktop"
          className="shrink-0 w-12 h-12 rounded-full bg-[#0B1C3D] border-2 border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#0B1C3D] transition-all shadow-lg">
          <SlideRight size={22} />
        </button>
      </div>

      {/* Mobile layout: buttons below slider */}
      <div className="sm:hidden">
        <div className="relative rounded-2xl overflow-hidden border-2 border-[#D4AF37]/30 shadow-xl"
          onTouchStart={() => setPaused(true)} onTouchEnd={() => { setTimeout(() => setPaused(false), 2000); }}>
          <div className="relative h-64">
            {FAMILY_CAROUSEL_IMAGES.map((src, i) => (
              <img key={i} src={src} alt={`Panchariya Family ${i + 1}`}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out ${i === current ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
                loading="lazy" />
            ))}
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#0B1C3D]/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-[#D4AF37] text-xs font-semibold">{current + 1} / {total}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <button onClick={handlePrev} data-testid="family-slide-prev-mobile"
            className="w-11 h-11 rounded-full bg-[#0B1C3D] border-2 border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#0B1C3D] transition-all shadow-lg">
            <SlideLeft size={20} />
          </button>
          <span className="text-[#0B1C3D]/50 text-sm font-medium">{current + 1} / {total}</span>
          <button onClick={handleNext} data-testid="family-slide-next-mobile"
            className="w-11 h-11 rounded-full bg-[#0B1C3D] border-2 border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#0B1C3D] transition-all shadow-lg">
            <SlideRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* === VENUE SECTION === */
export function VenueSection() {
  const { t, lang } = useLang();
  return (
    <section id="venue" data-testid="venue-section" className="py-20 sm:py-28 bg-[#0B1C3D] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">{t.venue.subtitle}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F8F1E5]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.venue.title}</h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>
        <FadeIn delay={200}>
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <VenueSlideshow />
              <div className="bg-white rounded-2xl p-8 border border-[#D4AF37]/20">
                <div className="flex items-start gap-3 mb-4">
                  <MapPin className="text-[#D4AF37] mt-1 shrink-0" size={24} />
                  <div>
                    <h3 className="text-xl font-bold text-[#0B1C3D] mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.venue.name}</h3>
                    <p className="text-[#0B1C3D]/60 text-sm whitespace-pre-line" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>{t.venue.address}</p>
                  </div>
                </div>
                <p className="text-[#0B1C3D]/70 text-sm leading-relaxed mb-6" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>{t.venue.description}</p>
                <div className="flex gap-3">
                  <a href="https://maps.app.goo.gl/j7XgU5MSCiScR21w6" target="_blank" rel="noopener noreferrer" data-testid="venue-maps-btn"
                    className="bg-[#D4AF37] text-[#0B1C3D] px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#D4AF37]/90 transition-all flex items-center gap-2">
                    <ExternalLink size={14} /> {t.venue.openMaps}
                  </a>
                  <a href="https://maps.app.goo.gl/j7XgU5MSCiScR21w6" target="_blank" rel="noopener noreferrer" data-testid="venue-directions-btn"
                    className="border border-[#D4AF37]/40 text-[#0B1C3D] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#D4AF37]/10 transition-all">
                    {t.venue.getDirections}
                  </a>
                </div>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-[#D4AF37]/20 h-[400px]">
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3554.5!2d74.5553!3d26.4897!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x396be70668bcc025%3A0x5e71cdbc42e6e86d!2sShri%20Gautam%20Ashram!5e0!3m2!1sen!2sin!4v1"
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Venue Map" data-testid="venue-map-embed" />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === REGISTRATION CTA - Strong Button === */
export function RegistrationCTA() {
  const { t, lang } = useLang();
  return (
    <section data-testid="registration-cta" className="py-20 sm:py-28 bg-[#0B1C3D] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#D4AF37]/5 blur-[100px]" />
      </div>
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">{t.registrationCTA.subtitle}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F8F1E5] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.registrationCTA.title}</h2>
          <p className="text-[#F8F1E5]/60 text-base sm:text-lg leading-relaxed mb-8" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>{t.registrationCTA.description}</p>
          <Link to="/register" data-testid="cta-register-btn"
            className="inline-block bg-[#D4AF37] text-[#0B1C3D] px-12 py-4.5 rounded-full font-bold text-lg hover:bg-[#E6C348] transition-all shadow-xl shadow-[#D4AF37]/40 hover:shadow-[#D4AF37]/60 border-2 border-[#D4AF37]">
            {t.registrationCTA.btn}
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

/* === FAMILY SECTION with Timeline + Contact at bottom === */
export function FamilySection() {
  const { t, lang } = useLang();
  const fontHi = lang === "hi" ? "'Tiro Devanagari Hindi', serif" : "'Cormorant Garamond', serif";
  return (
    <section id="family" data-testid="family-section" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">{t.family.subtitle}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0B1C3D]" style={{ fontFamily: fontHi }}>{t.family.title}</h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>
        <FadeIn delay={100}>
          <FamilyCarousel />
        </FadeIn>
        <FadeIn delay={200}>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
            {t.family.members.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-[#D4AF37]/20 text-center card-glow">
                <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
                  <Users size={24} className="text-[#D4AF37]" />
                </div>
                <h3 className="text-lg font-bold text-[#0B1C3D] mb-1" style={{ fontFamily: fontHi }}>{m.name}</h3>
                <p className="text-[#0B1C3D]/50 text-sm" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>{m.city}</p>
              </div>
            ))}
          </div>
          <div className="max-w-3xl mx-auto text-center text-[#0B1C3D]/70 text-sm sm:text-base leading-relaxed mb-12 whitespace-pre-line" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>
            {t.family.note}
          </div>
        </FadeIn>

        {/* Timeline */}
        <FadeIn delay={400}>
          <div className="max-w-3xl mx-auto mb-16">
            <h3 className="text-center text-xl sm:text-2xl font-bold text-[#0B1C3D] mb-8" style={{ fontFamily: fontHi }}>
              {t.family.timelineTitle}
            </h3>
            <div className="relative" data-testid="family-timeline">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#D4AF37]/30 -translate-x-1/2 hidden sm:block" />
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-[#D4AF37]/30 sm:hidden" />

              <div className="space-y-8 sm:space-y-0">
                {t.family.timeline.map((item, i) => {
                  const isLeft = i % 2 === 0;
                  const isLast = i === t.family.timeline.length - 1;
                  return (
                    <div key={i} className={`relative flex items-center sm:mb-10 ${isLeft ? "sm:flex-row" : "sm:flex-row-reverse"}`} data-testid={`timeline-item-${i}`}>
                      {/* Mobile layout - centered */}
                      <div className="sm:hidden flex flex-col items-center w-full">
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isLast ? "bg-[#D4AF37] shadow-lg shadow-[#D4AF37]/30" : "bg-[#0B1C3D] border-2 border-[#D4AF37]/50"}`}>
                          <span className="text-[10px] font-bold text-white">{i + 1}</span>
                        </div>
                        <div className={`mt-2 rounded-xl px-5 py-3 text-center ${isLast ? "bg-[#D4AF37]/15 border-2 border-[#D4AF37]/40" : "bg-white border border-[#D4AF37]/20"}`}>
                          <p className={`text-lg font-bold ${isLast ? "text-[#D4AF37]" : "text-[#0B1C3D]"}`} style={{ fontFamily: fontHi }}>{item.year}</p>
                          <p className="text-[#0B1C3D]/60 text-sm" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>{item.location}</p>
                        </div>
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden sm:flex items-center w-full">
                        <div className={`w-5/12 ${isLeft ? "text-right pr-8" : "text-left pl-8 order-2"}`}>
                          <div className={`inline-block rounded-xl px-6 py-3 ${isLast ? "bg-[#D4AF37]/15 border-2 border-[#D4AF37]/40" : "bg-white border border-[#D4AF37]/20"} card-glow`}>
                            <p className={`text-xl font-bold ${isLast ? "text-[#D4AF37]" : "text-[#0B1C3D]"}`} style={{ fontFamily: fontHi }}>{item.year}</p>
                            <p className="text-[#0B1C3D]/60 text-sm" style={{ fontFamily: lang === "hi" ? "'Tiro Devanagari Hindi', sans-serif" : undefined }}>{item.location}</p>
                          </div>
                        </div>
                        <div className={`w-2/12 flex justify-center ${isLeft ? "" : "order-1"}`}>
                          <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${isLast ? "bg-[#D4AF37] shadow-lg shadow-[#D4AF37]/30" : "bg-[#0B1C3D] border-2 border-[#D4AF37]/50"}`}>
                            <span className="text-xs font-bold text-white">{i + 1}</span>
                          </div>
                        </div>
                        <div className={`w-5/12 ${isLeft ? "order-2" : "text-right pr-8"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Contact block at bottom of Family section */}
        <FadeIn delay={500}>
          <div id="contact" className="max-w-4xl mx-auto" data-testid="contact-section">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white border border-[#D4AF37]/20 rounded-2xl p-6 sm:p-8">
              <div className="text-center sm:text-left">
                <p className="text-[#D4AF37] text-xs tracking-[0.3em] uppercase mb-1">{t.contact.subtitle}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.contact.name}</h3>
                <p className="text-[#D4AF37] text-lg font-semibold flex items-center gap-2 justify-center sm:justify-start mt-1">
                  <Phone size={16} /> {t.contact.phone}
                </p>
              </div>
              <div className="flex gap-3">
                <a href="tel:+919825423650" data-testid="contact-call-btn"
                  className="bg-[#D4AF37] text-[#0B1C3D] px-6 py-2.5 rounded-full font-semibold hover:bg-[#D4AF37]/90 transition-all flex items-center gap-2 text-sm">
                  <Phone size={14} /> {t.contact.callBtn}
                </a>
                <a href="https://wa.me/919825423650" target="_blank" rel="noopener noreferrer" data-testid="contact-whatsapp-btn"
                  className="bg-[#25D366] text-white px-6 py-2.5 rounded-full font-semibold hover:bg-[#25D366]/90 transition-all flex items-center gap-2 text-sm">
                  <MessageCircle size={14} /> {t.contact.whatsappBtn}
                </a>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === CONTACT SECTION (Strip) === */
export function ContactSection() {
  const { t } = useLang();
  return (
    <section id="contact" data-testid="contact-section" className="py-16 sm:py-20 bg-[#0B1C3D] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#0B1C3D] border border-[#D4AF37]/20 rounded-2xl p-6 sm:p-8">
            <div className="text-center sm:text-left">
              <p className="text-[#D4AF37] text-xs tracking-[0.3em] uppercase mb-1">{t.contact.subtitle}</p>
              <h3 className="text-xl sm:text-2xl font-bold text-[#F8F1E5]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.contact.name}</h3>
              <p className="text-[#D4AF37] text-lg font-semibold flex items-center gap-2 justify-center sm:justify-start mt-1">
                <Phone size={16} /> {t.contact.phone}
              </p>
            </div>
            <div className="flex gap-3">
              <a href="tel:+919825423650" data-testid="contact-call-btn"
                className="bg-[#D4AF37] text-[#0B1C3D] px-6 py-2.5 rounded-full font-semibold hover:bg-[#D4AF37]/90 transition-all flex items-center gap-2 text-sm">
                <Phone size={14} /> {t.contact.callBtn}
              </a>
              <a href="https://wa.me/919825423650" target="_blank" rel="noopener noreferrer" data-testid="contact-whatsapp-btn"
                className="bg-[#25D366] text-white px-6 py-2.5 rounded-full font-semibold hover:bg-[#25D366]/90 transition-all flex items-center gap-2 text-sm">
                <MessageCircle size={14} /> {t.contact.whatsappBtn}
              </a>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === FOOTER (Admin link removed) === */
export function Footer() {
  const { t } = useLang();
  return (
    <footer data-testid="footer" className="bg-[#0B1C3D] py-12 border-t border-[#D4AF37]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h3 className="text-2xl text-[#D4AF37] font-bold mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{t.footer.title}</h3>
          <p className="text-[#F8F1E5]/40 text-sm mb-6">{t.footer.date}</p>
          <div className="gold-divider w-16 mx-auto mb-6" />
          <div className="flex justify-center gap-6 mb-6 text-[#F8F1E5]/40 text-sm">
            <Link to="/" className="hover:text-[#D4AF37] transition-colors">{t.footer.home}</Link>
            <Link to="/register" className="hover:text-[#D4AF37] transition-colors">{t.footer.register}</Link>
          </div>
          <p className="text-[#F8F1E5]/30 text-xs">{t.footer.credit}</p>
        </div>
      </div>
    </footer>
  );
}
