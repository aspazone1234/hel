import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, MessageCircle, Heart, Users, ExternalLink } from "lucide-react";

const LOTUS_URL = "https://images.unsplash.com/photo-1717680452605-de1b707a9bf2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwxfHxwaW5rJTIwbG90dXMlMjBmbG93ZXIlMjB3YXRlcnxlbnwwfHx8fDE3NzQ3NzYwOTZ8MA&ixlib=rb-4.1.0&q=85&w=400";
const PEACOCK_URL = "https://images.unsplash.com/photo-1578885564199-db62248858cf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNzl8MHwxfHNlYXJjaHwxfHxwZWFjb2NrJTIwZmVhdGhlcnxlbnwwfHx8fDE3NzQ3NzYwODJ8MA&ixlib=rb-4.1.0&q=85&w=400";
const PUSHKAR_URL = "https://images.unsplash.com/photo-1715168931029-2949161ee406?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxQdXNoa2FyJTIwbGFrZSUyMHJhamFzdGhhbnxlbnwwfHx8fDE3NzQ3NzYwODF8MA&ixlib=rb-4.1.0&q=85&w=800";

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

/* === VENUE SECTION === */
export function VenueSection() {
  return (
    <section id="venue" data-testid="venue-section" className="py-24 sm:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">Venue</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              The Sacred Venue
            </h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>
        <FadeIn delay={200}>
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="relative rounded-2xl overflow-hidden">
                <img src={PUSHKAR_URL} alt="Pushkar, Rajasthan" className="w-full h-64 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C3D]/60 to-transparent" />
              </div>
              <div className="bg-white rounded-2xl p-8 border border-[#D4AF37]/20">
                <div className="flex items-start gap-3 mb-4">
                  <MapPin className="text-[#D4AF37] mt-1 shrink-0" size={24} />
                  <div>
                    <h3 className="text-xl font-bold text-[#0B1C3D] mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      Shri Gautam Ashram
                    </h3>
                    <p className="text-[#0B1C3D]/60 text-sm">Near Nayi Basa Stand, Chhoti Basti<br />Pushkar, Rajasthan</p>
                  </div>
                </div>
                <p className="text-[#0B1C3D]/70 text-sm leading-relaxed mb-6">
                  Located in the sacred land of Pushkar, the venue offers a serene and spiritually uplifting environment for the katha and associated programs.
                </p>
                <div className="flex gap-3">
                  <a
                    href="https://maps.google.com/maps?q=Shri+Gautam+Ashram+Pushkar+Rajasthan"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="venue-maps-btn"
                    className="bg-[#D4AF37] text-[#0B1C3D] px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#D4AF37]/90 transition-all flex items-center gap-2"
                  >
                    <ExternalLink size={14} /> Open in Maps
                  </a>
                  <a
                    href="https://maps.google.com/maps/dir//Shri+Gautam+Ashram+Pushkar+Rajasthan"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="venue-directions-btn"
                    className="border border-[#D4AF37]/40 text-[#0B1C3D] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#D4AF37]/10 transition-all"
                  >
                    Get Directions
                  </a>
                </div>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-[#D4AF37]/20 h-[400px]">
              <iframe
                src="https://maps.google.com/maps?q=Pushkar+Rajasthan+India&t=&z=14&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Venue Map"
                data-testid="venue-map-embed"
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === REGISTRATION CTA === */
export function RegistrationCTA() {
  return (
    <section data-testid="registration-cta" className="py-24 sm:py-32 bg-[#0B1C3D] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#D4AF37]/5 blur-[100px]" />
      </div>
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">Registration</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F8F1E5] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Register Your Attendance
          </h2>
          <p className="text-[#F8F1E5]/60 text-base sm:text-lg leading-relaxed mb-8">
            To help us serve you better and make appropriate arrangements for accommodation, meals, and other facilities, 
            we request you to kindly register your details in advance. Your cooperation will help us ensure a comfortable 
            and well-organized experience for all devotees.
          </p>
          <p className="text-[#E67E22] text-sm mb-8 italic">Limited Accommodation - Please Register Early</p>
          <Link
            to="/register"
            data-testid="cta-register-btn"
            className="inline-block bg-[#D4AF37] text-[#0B1C3D] px-10 py-4 rounded-full font-semibold text-lg hover:bg-[#D4AF37]/90 transition-all shadow-lg shadow-[#D4AF37]/25 hover:shadow-[#D4AF37]/40 animate-shimmer"
          >
            Fill Registration Form
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

/* === FAMILY SECTION === */
export function FamilySection() {
  const members = [
    { name: "Shri Satish Panchariya", city: "Mumbai" },
    { name: "Shri Arun Panchariya", city: "London" },
    { name: "Shri Ashok Panchariya", city: "Ahmedabad" },
  ];
  return (
    <section id="family" data-testid="family-section" className="py-24 sm:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">Organizing Family</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              With Devotion from the Panchariya Family
            </h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>
        <FadeIn delay={200}>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
            {members.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-[#D4AF37]/20 text-center card-glow">
                <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
                  <Users size={24} className="text-[#D4AF37]" />
                </div>
                <h3 className="text-lg font-bold text-[#0B1C3D] mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{m.name}</h3>
                <p className="text-[#0B1C3D]/50 text-sm">{m.city}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[#0B1C3D]/60 text-sm">
            Along with the blessings and support of the entire <strong className="text-[#0B1C3D]">Panchariya Parivar</strong>.
            We seek your presence and blessings to make this divine aayojan successful.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* === DEDICATION SECTION === */
export function DedicationSection() {
  const elders = [
    "Pujya Pitri-Dev Behen Alka Jiji",
    "Shri Shri 1008 Durga Baisa (Lalana)",
    "Late Shri Ramswaroop Ji Panchariya",
    "Late Shrimati Shanta Devi",
  ];
  return (
    <section data-testid="dedication-section" className="py-24 sm:py-32 bg-[#0B1C3D] relative overflow-hidden">
      <div className="absolute right-0 top-0 w-48 h-48 opacity-10 hidden lg:block">
        <img src={LOTUS_URL} alt="" className="w-full h-full object-cover animate-lotus" />
      </div>
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <Heart className="text-[#F1948A] mx-auto mb-6" size={32} />
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F8F1E5] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            In Loving Memory & Divine Inspiration
          </h2>
          <div className="gold-divider w-24 mx-auto mt-4 mb-10" />
          <p className="text-[#F8F1E5]/60 text-base sm:text-lg mb-10 leading-relaxed">
            This sacred aayojan is dedicated with deep reverence to our beloved elders whose blessings continue to guide us:
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
            {elders.map((elder, i) => (
              <div key={i} className="border border-[#D4AF37]/20 rounded-xl px-5 py-4 bg-[#D4AF37]/5">
                <p className="text-[#F8F1E5] text-sm sm:text-base" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>
                  {elder}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[#F8F1E5]/50 text-sm italic">
            Their values, faith, and divine grace remain the foundation of this spiritual offering.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* === CONTACT SECTION === */
export function ContactSection() {
  return (
    <section id="contact" data-testid="contact-section" className="py-24 sm:py-32 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase mb-3">Contact</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0B1C3D]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Contact & Coordination
            </h2>
            <div className="gold-divider w-24 mx-auto mt-6" />
          </div>
        </FadeIn>
        <FadeIn delay={200}>
          <div className="bg-white rounded-2xl p-8 sm:p-12 border border-[#D4AF37]/20 text-center sacred-border max-w-xl mx-auto">
            <p className="text-[#0B1C3D]/70 mb-6">For any queries, assistance, or coordination, please contact:</p>
            <h3 className="text-2xl font-bold text-[#0B1C3D] mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Shri Ashok Panchariya
            </h3>
            <p className="text-[#E67E22] text-lg font-semibold mb-8 flex items-center justify-center gap-2">
              <Phone size={18} /> +91 9825423650
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="tel:+919825423650"
                data-testid="contact-call-btn"
                className="bg-[#D4AF37] text-[#0B1C3D] px-8 py-3 rounded-full font-semibold hover:bg-[#D4AF37]/90 transition-all flex items-center gap-2"
              >
                <Phone size={16} /> Call Now
              </a>
              <a
                href="https://wa.me/919825423650"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="contact-whatsapp-btn"
                className="bg-[#25D366] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#25D366]/90 transition-all flex items-center gap-2"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* === FINAL CTA === */
export function FinalCTA() {
  return (
    <section data-testid="final-cta" className="py-20 sm:py-28 bg-gradient-to-b from-[#F8F1E5] to-white relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0B1C3D] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            We Look Forward to Your Presence
          </h2>
          <p className="text-[#0B1C3D]/60 text-base sm:text-lg mb-8 leading-relaxed">
            We humbly invite you and your family to join us in this divine katha, receive spiritual blessings, 
            and become part of this sacred gathering. Your presence will add grace and joy to this aayojan.
          </p>
          <Link
            to="/register"
            data-testid="final-register-btn"
            className="inline-block bg-[#D4AF37] text-[#0B1C3D] px-10 py-4 rounded-full font-semibold text-lg hover:bg-[#D4AF37]/90 transition-all shadow-lg shadow-[#D4AF37]/25"
          >
            Confirm Your Attendance
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

/* === FOOTER === */
export function Footer() {
  return (
    <footer data-testid="footer" className="bg-[#0B1C3D] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h3 className="text-2xl text-[#D4AF37] font-bold mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Shrimad Bhagavat Katha Mahotsav 2026
          </h3>
          <p className="text-[#F8F1E5]/40 text-sm mb-6">28 May - 3 June 2026 | Pushkar, Rajasthan</p>
          <div className="gold-divider w-16 mx-auto mb-6" />
          <div className="flex justify-center gap-6 mb-6 text-[#F8F1E5]/40 text-sm">
            <Link to="/" className="hover:text-[#D4AF37] transition-colors">Home</Link>
            <Link to="/register" className="hover:text-[#D4AF37] transition-colors">Register</Link>
            <Link to="/admin" className="hover:text-[#D4AF37] transition-colors">Admin</Link>
          </div>
          <p className="text-[#F8F1E5]/30 text-xs">
            Organized with love by the Panchariya Family
          </p>
        </div>
      </div>
    </footer>
  );
}
