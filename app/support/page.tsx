import { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
  'Support & Help | Cheesco Equip Hub',
  'Get help from Cheesco support team. 24/7 operations desk, response time under 2 hours.',
  undefined,
  'https://cheescoequiphub.com/support'
);

export default function SupportPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="min-h-screen bg-canvas">
          {/* Hero */}
          <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-5xl font-black mb-6">How Can We Help?</h1>
              <p className="text-xl text-ink-muted">
                Our 24/7 operations team is ready to assist. Response time under 2 hours.
              </p>
            </div>
          </section>

          {/* Support Options */}
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="card-surface rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">📧</div>
                <h3 className="text-xl font-bold mb-3">Email Support</h3>
                <p className="text-ink-muted mb-4">
                  Send us an email and we'll respond within 2 hours.
                </p>
                <a href="mailto:support@cheescoequiphub.com" className="text-cheesco-yellow font-bold hover:underline">
                  support@cheescoequiphub.com
                </a>
              </div>

              <div className="card-surface rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">📞</div>
                <h3 className="text-xl font-bold mb-3">Phone Support</h3>
                <p className="text-ink-muted mb-4">
                  Call us for urgent issues. Available 24/7.
                </p>
                <a href="tel:+234800CHEESCO" className="text-cheesco-yellow font-bold hover:underline">
                  +234-800-CHEESCO
                </a>
              </div>

              <div className="card-surface rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-xl font-bold mb-3">Chat Support</h3>
                <p className="text-ink-muted mb-4">
                  Chat with our team directly in your dashboard.
                </p>
                <a href="/dashboard/customer" className="text-cheesco-yellow font-bold hover:underline">
                  Open Chat
                </a>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="bg-card-raised py-16 border-y border-line-soft">
            <div className="mx-auto max-w-4xl px-4 sm:px-6">
              <h2 className="text-3xl font-black mb-12 text-center">Frequently Asked Questions</h2>
              <div className="space-y-6">
                <div className="card-surface rounded-xl p-6">
                  <h3 className="font-bold mb-2">How long does equipment verification take?</h3>
                  <p className="text-ink-muted">Equipment verification typically takes 24-48 hours. We inspect all documents, photos, and ownership proof.</p>
                </div>
                <div className="card-surface rounded-xl p-6">
                  <h3 className="font-bold mb-2">What's included in the rental price?</h3>
                  <p className="text-ink-muted">Equipment rental includes the equipment itself. Transportation, operator, mobilization, and other services are line items in the quotation.</p>
                </div>
                <div className="card-surface rounded-xl p-6">
                  <h3 className="font-bold mb-2">Can I extend my rental?</h3>
                  <p className="text-ink-muted">Yes, if the equipment is available. Contact our operations team at least 7 days before your rental ends.</p>
                </div>
                <div className="card-surface rounded-xl p-6">
                  <h3 className="font-bold mb-2">What if equipment is damaged during rental?</h3>
                  <p className="text-ink-muted">We conduct post-rental inspection. Damage is assessed and your deposit is adjusted accordingly. You can dispute the assessment.</p>
                </div>
                <div className="card-surface rounded-xl p-6">
                  <h3 className="font-bold mb-2">How do I open a support ticket?</h3>
                  <p className="text-ink-muted">Go to your dashboard, click Support, and create a ticket. Include details about your issue and we'll respond within 2 hours.</p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 text-center">
            <h2 className="text-3xl font-black mb-4">Still Need Help?</h2>
            <p className="text-ink-muted mb-8 max-w-2xl mx-auto">
              Our support team is standing by. Reach out through any channel and we'll get back to you as soon as possible.
            </p>
            <a href="mailto:support@cheescoequiphub.com" className="inline-block rounded-lg bg-cheesco-yellow px-8 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright">
              Contact Support
            </a>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
