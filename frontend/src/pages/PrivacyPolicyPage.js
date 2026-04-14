import { Shield, Mail, Phone, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#faf8f4]" data-testid="privacy-policy-page">
      {/* Header */}
      <div className="bg-[#0B1C3D] text-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-6 transition"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#D4AF37]/20 rounded-lg p-2">
              <Shield size={22} className="text-[#D4AF37]" />
            </div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Privacy Policy
            </h1>
          </div>
          <p className="text-white/50 text-sm">
            Shrimad Bhagavat Katha 2026 &mdash; Last updated: April 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        <Section>
          <p className="text-gray-700 leading-relaxed">
            This Privacy Policy describes how the organisers of <strong>Shrimad Bhagavat Katha 2026</strong> ("we", "us", or "the Event") collect, use, store, and protect personal information provided during event registration and participation. By submitting your registration, you agree to the practices described in this policy.
          </p>
        </Section>

        <Section title="1. Information We Collect">
          <p className="text-gray-600 mb-3">We collect the following personal information when you register for the event:</p>
          <ul className="space-y-2 text-gray-600">
            <li className="flex gap-2"><Dot /> <span><strong>Identity details:</strong> Full name, age, gender, and relationship to the head of the family group.</span></li>
            <li className="flex gap-2"><Dot /> <span><strong>Contact information:</strong> WhatsApp/mobile number (primary identifier), additional phone number, email address.</span></li>
            <li className="flex gap-2"><Dot /> <span><strong>Address:</strong> City, state, country, and pin code.</span></li>
            <li className="flex gap-2"><Dot /> <span><strong>Event preferences:</strong> Dates of stay, expected arrival and departure times, travel mode and details.</span></li>
            <li className="flex gap-2"><Dot /> <span><strong>Accessibility &amp; health:</strong> Special dietary requirements or accessibility needs, provided voluntarily.</span></li>
            <li className="flex gap-2"><Dot /> <span><strong>Reference information:</strong> Name of the person who referred you to this event.</span></li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information">
          <p className="text-gray-600 mb-3">Your personal information is used solely for the purpose of organising and managing the Katha 2026 event:</p>
          <ul className="space-y-2 text-gray-600">
            <li className="flex gap-2"><Dot /> Processing your registration and confirming your attendance.</li>
            <li className="flex gap-2"><Dot /> Generating your personalised QR entry pass.</li>
            <li className="flex gap-2"><Dot /> Assigning accommodation rooms and a designated volunteer contact.</li>
            <li className="flex gap-2"><Dot /> Coordinating logistics such as meals, seating, and accessibility support.</li>
            <li className="flex gap-2"><Dot /> Communicating event updates, schedules, and important announcements via WhatsApp or phone.</li>
            <li className="flex gap-2"><Dot /> Managing check-in and check-out via QR code scanning at the venue.</li>
          </ul>
        </Section>

        <Section title="3. Data Sharing">
          <p className="text-gray-600 mb-3">We do <strong>not</strong> sell, rent, or share your personal information with third parties for marketing or commercial purposes.</p>
          <p className="text-gray-600">Your information may be shared only in the following limited circumstances:</p>
          <ul className="space-y-2 text-gray-600 mt-2">
            <li className="flex gap-2"><Dot /> <span>With <strong>assigned volunteers (Swamsevaks)</strong> who are responsible for coordinating your stay — they will see your name, room, and special needs only.</span></li>
            <li className="flex gap-2"><Dot /> <span>With <strong>event organisers and administrators</strong> who manage logistics and approvals.</span></li>
            <li className="flex gap-2"><Dot /> <span>Where required by applicable <strong>law or legal obligation</strong>.</span></li>
          </ul>
        </Section>

        <Section title="4. Data Storage &amp; Security">
          <p className="text-gray-600">
            Your data is stored securely on password-protected systems. We use reasonable technical and organisational measures to protect your personal information from unauthorised access, disclosure, or misuse. Access to guest data is restricted to authorised administrators and volunteers with defined role-based permissions.
          </p>
          <p className="text-gray-600 mt-3">
            All sensitive actions within the system (edits, approvals, attendance marking) are logged with timestamps for accountability.
          </p>
        </Section>

        <Section title="5. Data Retention">
          <p className="text-gray-600">
            Your personal information will be retained for the duration of the event and for a reasonable period thereafter (up to 12 months) to handle post-event queries, feedback, and record-keeping. After this period, data will be securely deleted or anonymised.
          </p>
        </Section>

        <Section title="6. Your Rights">
          <p className="text-gray-600 mb-3">You have the following rights regarding your personal information:</p>
          <ul className="space-y-2 text-gray-600">
            <li className="flex gap-2"><Dot /> <span><strong>Access:</strong> Request a copy of the personal data we hold about you.</span></li>
            <li className="flex gap-2"><Dot /> <span><strong>Correction:</strong> Request corrections to inaccurate data by contacting the system administrator.</span></li>
            <li className="flex gap-2"><Dot /> <span><strong>Deletion:</strong> Request deletion of your registration data by contacting the system administrator before the event begins.</span></li>
            <li className="flex gap-2"><Dot /> <span><strong>Withdrawal:</strong> Withdraw your registration at any time. This does not affect the lawfulness of any processing already carried out.</span></li>
          </ul>
        </Section>

        <Section title="7. Children's Privacy">
          <p className="text-gray-600">
            We collect age information for attendees as part of family group registration. Data for attendees under the age of 18 is collected as part of the family registration submitted by a parent or guardian. We do not knowingly collect standalone personal data directly from minors.
          </p>
        </Section>

        <Section title="8. WhatsApp &amp; Communications">
          <p className="text-gray-600">
            By registering with your WhatsApp number, you consent to receiving event-related messages, including registration confirmation, schedule updates, and logistical information. We will not use your number for unrelated communications. You may opt out of future communications by contacting us directly.
          </p>
        </Section>

        <Section title="9. Cookies &amp; Tracking">
          <p className="text-gray-600">
            This event registration system does not use advertising cookies or third-party tracking technologies. Session data is stored locally in your browser to maintain your login state and is cleared when you log out.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p className="text-gray-600">
            We may update this Privacy Policy from time to time. Any significant changes will be communicated to registered participants. The date at the top of this page reflects when the policy was last revised.
          </p>
        </Section>

        {/* Contact Block */}
        <div className="bg-[#0B1C3D] rounded-2xl p-6 text-white">
          <h2 className="font-semibold text-[#D4AF37] mb-3 text-base">Contact Us</h2>
          <p className="text-white/70 text-sm mb-4">
            For any questions, data requests, or concerns about this Privacy Policy, please contact the event system administrator:
          </p>
          <div className="space-y-2 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-[#D4AF37] shrink-0" />
              <span>Available via the contact number on your registration confirmation page</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-[#D4AF37] shrink-0" />
              <span>Via the registered administrator contact on the system</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-6">
          &copy; 2026 Shrimad Bhagavat Katha Organising Committee. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      {title && (
        <h2 className="text-base font-bold text-[#0B1C3D] mb-3 pb-1.5 border-b border-[#D4AF37]/30">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

function Dot() {
  return <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0 inline-block" />;
}
