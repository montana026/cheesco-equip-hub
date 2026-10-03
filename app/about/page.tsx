import { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
  'About Cheesco Equip Hub | Heavy Equipment Marketplace Nigeria',
  'Cheesco is Nigeria\'s trusted marketplace for heavy equipment sales and managed rentals. We connect owners, merchants, and contractors with verified equipment and logistics.',
  undefined,
  'https://cheescoequiphub.com/about'
);

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="min-h-screen bg-canvas">
          {/* Hero Section */}
          <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-5xl font-black mb-6 text-cheesco-yellow">
                About Cheesco Equip Hub
              </h1>
              <p className="text-xl text-ink-muted mb-8">
                Nigeria's trusted marketplace for heavy equipment. We connect equipment owners, merchants, contractors, and businesses through a secure, managed platform.
              </p>
            </div>
          </section>

          {/* Mission Section */}
          <section className="bg-card-raised py-16 border-y border-line-soft">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="grid gap-12 md:grid-cols-3">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
                  <p className="text-ink-muted">
                    Transform heavy equipment leasing in Nigeria by creating a trusted, transparent marketplace that connects verified merchants with contractors who need reliable equipment.
                  </p>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
                  <p className="text-ink-muted">
                    Become the leading equipment marketplace across Africa, enabling businesses to access premium heavy equipment affordably and reliably.
                  </p>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-4">Our Values</h3>
                  <p className="text-ink-muted">
                    Trust, transparency, reliability, and integrity. We verify every merchant, every equipment, and every transaction to protect our users.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Why Choose Cheesco */}
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <h2 className="text-4xl font-black mb-12 text-center">Why Choose Cheesco?</h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="card-surface rounded-xl p-8">
                <div className="text-3xl mb-4">✓</div>
                <h3 className="text-xl font-bold mb-3">Verified Merchants</h3>
                <p className="text-ink-muted">
                  Every merchant undergoes strict KYC verification. We verify business registration, documents, and credentials.
                </p>
              </div>
              <div className="card-surface rounded-xl p-8">
                <div className="text-3xl mb-4">✓</div>
                <h3 className="text-xl font-bold mb-3">Verified Equipment</h3>
                <p className="text-ink-muted">
                  Every equipment is inspected and verified before listing. Ownership documents and maintenance records checked.
                </p>
              </div>
              <div className="card-surface rounded-xl p-8">
                <div className="text-3xl mb-4">✓</div>
                <h3 className="text-xl font-bold mb-3">Managed Process</h3>
                <p className="text-ink-muted">
                  We manage the entire rental lifecycle—verification, quotations, agreements, payments, logistics, and settlement.
                </p>
              </div>
              <div className="card-surface rounded-xl p-8">
                <div className="text-3xl mb-4">✓</div>
                <h3 className="text-xl font-bold mb-3">Secure Payments</h3>
                <p className="text-ink-muted">
                  Deposits held in escrow. Payments verified through Paystack. Digital rental agreements with e-signatures.
                </p>
              </div>
              <div className="card-surface rounded-xl p-8">
                <div className="text-3xl mb-4">✓</div>
                <h3 className="text-xl font-bold mb-3">Logistics Support</h3>
                <p className="text-ink-muted">
                  We arrange and track delivery. Equipment inspected before dispatch. Delivery confirmed before rental begins.
                </p>
              </div>
              <div className="card-surface rounded-xl p-8">
                <div className="text-3xl mb-4">✓</div>
                <h3 className="text-xl font-bold mb-3">24/7 Operations</h3>
                <p className="text-ink-muted">
                  Our operations desk is always available. Response time under 2 hours. Support through multiple channels.
                </p>
              </div>
            </div>
          </section>

          {/* Team Section */}
          <section className="bg-card-raised py-16 border-y border-line-soft">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <h2 className="text-4xl font-black mb-12 text-center">Our Team</h2>
              <p className="text-center text-ink-muted mb-12 max-w-2xl mx-auto">
                Built by industry experts with deep experience in logistics, equipment sourcing, and marketplace technology. Our team is committed to making heavy equipment accessible to everyone.
              </p>
              <div className="grid gap-8 md:grid-cols-4">
                {[
                  { name: 'Adebayo Okonkwo', role: 'Founder & CEO' },
                  { name: 'Chidinma Egwu', role: 'COO & Operations' },
                  { name: 'Femi Adeyemi', role: 'CTO & Engineering' },
                  { name: 'Grace Oluwaseun', role: 'Head of Partnerships' },
                ].map((member) => (
                  <div key={member.name} className="text-center">
                    <div className="w-32 h-32 mx-auto mb-4 bg-line-soft rounded-lg flex items-center justify-center">
                      <span className="text-4xl">👤</span>
                    </div>
                    <h3 className="font-bold mb-1">{member.name}</h3>
                    <p className="text-sm text-ink-muted">{member.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="grid gap-8 md:grid-cols-4">
              <div className="text-center">
                <div className="text-5xl font-black text-cheesco-yellow mb-2">500+</div>
                <p className="text-ink-muted">Verified Equipment</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black text-cheesco-yellow mb-2">150+</div>
                <p className="text-ink-muted">Verified Merchants</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black text-cheesco-yellow mb-2">2K+</div>
                <p className="text-ink-muted">Active Users</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black text-cheesco-yellow mb-2">8</div>
                <p className="text-ink-muted">States Covered</p>
              </div>
            </div>
          </section>

          {/* Contact CTA */}
          <section className="bg-cheesco-yellow text-canvas py-16">
            <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
              <h2 className="text-3xl font-black mb-4">Ready to Get Started?</h2>
              <p className="mb-8 opacity-90">
                Join thousands of businesses finding reliable heavy equipment through Cheesco.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/browse" className="inline-block rounded-lg bg-canvas px-8 py-3 font-bold text-cheesco-yellow hover:bg-opacity-90">
                  Browse Equipment
                </a>
                <a href="/contact" className="inline-block rounded-lg border-2 border-canvas px-8 py-3 font-bold text-canvas hover:bg-canvas/10">
                  Contact Us
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
