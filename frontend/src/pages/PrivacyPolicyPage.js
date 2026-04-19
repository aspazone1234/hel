import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { useEffect } from "react";

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = "Privacy Policy | Shrimad Bhagwat Katha 2026";
    window.scrollTo(0, 0);
  }, []);

  const Section = ({ title, children }) => (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-[#0B1C3D] mb-3" data-testid={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}>{title}</h2>
      <div className="text-[#0B1C3D]/70 text-sm leading-relaxed space-y-2">{children}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F1E5]" data-testid="privacy-policy-page">
      {/* Header */}
      <div className="bg-[#0B1C3D] border-b border-[#D4AF37]/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-[#D4AF37]/70 hover:text-[#D4AF37] text-sm transition-colors mb-4" data-testid="back-to-home">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
              <Shield size={20} className="text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#F8F1E5]" style={{ fontFamily: "'Cormorant Garamond', serif" }} data-testid="privacy-title">
                Privacy Policy
              </h1>
              <p className="text-[#F8F1E5]/40 text-xs mt-0.5">Shrimad Bhagwat Katha Gyan Yajna 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[#0B1C3D]/50 text-xs mb-8" data-testid="last-updated">Last updated: January 2026</p>

        <Section title="1. Introduction">
          <p>
            This Privacy Policy explains how the organizers of the Shrimad Bhagwat Katha Gyan Yajna 2026
            ("Event"), held at Shri Gautam Ashram, Pushkar, Rajasthan, collect, use, and protect
            the personal information you provide through our registration platform ("Platform").
          </p>
          <p>
            By registering on this Platform, you consent to the collection and use of your
            information as described in this policy.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>When you register for the Event, we may collect the following information:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Contact details:</strong> Mobile number (primary and additional), email address</li>
            <li><strong>Personal details:</strong> Names, ages, and special needs of all attendees in your group</li>
            <li><strong>Address information:</strong> Country, state, city, PIN code, and full address</li>
            <li><strong>Travel information:</strong> Mode of travel, travel details, expected arrival and departure dates</li>
            <li><strong>Preferences:</strong> Language preference, selected days of attendance, special requests</li>
            <li><strong>Reference details:</strong> Reference person and relation category, if applicable</li>
            <li><strong>Event data:</strong> QR codes for entry, room assignments, attendance records</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>Your information is used solely for the purpose of organizing and managing the Event:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Processing and confirming your registration</li>
            <li>Allocating rooms and managing accommodation logistics</li>
            <li>Generating QR codes for secure entry and attendance tracking</li>
            <li>Assigning a dedicated volunteer (Swayamsevak) for your assistance</li>
            <li>Communicating important event updates, schedule changes, and logistics</li>
            <li>Addressing special needs and accessibility requirements</li>
            <li>Preparing aggregate statistics for event planning (e.g., daily arrival counts, geographic distribution)</li>
          </ul>
        </Section>

        <Section title="4. Information Sharing">
          <p>We do not sell, trade, or rent your personal information to third parties. Your data may be shared only in the following limited circumstances:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Event volunteers:</strong> Assigned Swayamsevaks may access your name, mobile number, room assignment, and special needs to assist you during the Event</li>
            <li><strong>Event administrators:</strong> Authorized administrators access registration data for operational purposes such as approvals, room management, and attendance</li>
            <li><strong>Legal requirements:</strong> If required by law or to protect the safety of attendees</li>
          </ul>
        </Section>

        <Section title="5. Data Storage & Security">
          <p>
            Your data is stored securely on our servers. We implement reasonable technical and
            organizational measures to protect your personal information from unauthorized access,
            alteration, or destruction.
          </p>
          <p>
            Access to registration data is restricted to authenticated administrators through
            secure login credentials. All admin actions are logged in an audit trail for accountability.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We retain your registration data for the duration of the Event and for a reasonable
            period afterward for administrative follow-up. After this period, personal data will
            be securely deleted or anonymized unless retention is required by law.
          </p>
        </Section>

        <Section title="7. Your Rights">
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Access:</strong> View your registration details at any time using your registered mobile number</li>
            <li><strong>Update:</strong> Edit your registration information until the registration cutoff date (19 May 2026)</li>
            <li><strong>Withdraw:</strong> Request cancellation of your registration by contacting the Event administrators</li>
            <li><strong>Inquire:</strong> Ask questions about how your data is being used</li>
          </ul>
        </Section>

        <Section title="8. Cookies & Tracking">
          <p>
            This Platform does not use cookies for tracking or advertising purposes. We do not
            employ any third-party analytics or advertising tools that track your browsing behavior.
          </p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            Registration for minors is handled by their parent or guardian as part of the family
            group registration. We do not knowingly collect personal information from children
            without parental consent.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Any changes will be reflected on
            this page with an updated revision date. We encourage you to review this policy
            periodically.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            If you have any questions or concerns about this Privacy Policy or the handling of
            your personal data, please contact the Event administration team through the Platform
            or reach out to the organizing committee at Shri Gautam Ashram, Pushkar, Rajasthan.
          </p>
        </Section>

        {/* Footer nav */}
        <div className="mt-12 pt-6 border-t border-[#D4AF37]/20 flex flex-wrap gap-4 text-sm">
          <Link to="/" className="text-[#D4AF37] hover:underline" data-testid="footer-home-link">Home</Link>
          <Link to="/register" className="text-[#D4AF37] hover:underline" data-testid="footer-register-link">Register</Link>
        </div>
      </div>
    </div>
  );
}
