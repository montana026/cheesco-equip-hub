import { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
  'How It Works | Cheesco Equip Hub',
  'Learn how Cheesco makes heavy equipment rental simple, safe, and reliable through our managed marketplace.',
  undefined,
  'https://cheescoequiphub.com/how-it-works'
);

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="min-h-screen bg-canvas">
          {/* Hero */}
          <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-5xl font-black mb-6 text-cheesco-yellow">
                How It Works
              </h1>
              <p className="text-xl text-ink-muted">
                From finding equipment to completing your rental—here's how Cheesco makes it simple, safe, and reliable.
              </p>
            </div>
          </section>

          {/* Steps */}
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="space-y-8">
              {[
                {
                  step: '01',
                  title: 'Find Your Equipment',
                  description: 'Browse our marketplace of verified heavy equipment. Filter by category, location, price, and availability. Read reviews from other customers.',
                  icon: '🔍'
                },
                {
                  step: '02',
                  title: 'Submit a Request',
                  description: 'Click "Request to Rent" and fill in your project details—dates, location, whether you need an operator, and any special requirements.',
                  icon: '📝'
                },
                {
                  step: '03',
                  title: 'Cheesco Verifies',
                  description: 'Our operations team verifies the equipment is available and ready. We confirm the merchant\'s credentials and equipment condition.',
                  icon: '✓'
                },
                {
                  step: '04',
                  title: 'Receive Your Quotation',
                  description: 'We send a detailed quotation with line items: equipment rental, transportation, operator (if needed), mobilization, and deposit.',
                  icon: '💰'
                },
                {
                  step: '05',
                  title: 'Review & Accept',
                  description: 'Review the quotation. Request changes if needed, or accept to proceed. Once accepted, a digital rental agreement is generated.',
                  icon: '✍️'
                },
                {
                  step: '06',
                  title: 'Make Payment',
                  description: 'Pay the rental fee and damage deposit through our secure Paystack payment system. Payments are verified and deposits held in escrow.',
                  icon: '💳'
                },
                {
                  step: '07',
                  title: 'Logistics & Delivery',
                  description: 'Cheesco assigns a logistics partner for transportation. A pre-delivery inspection is performed before the equipment leaves.',
                  icon: '🚚'
                },
                {
                  step: '08',
                  title: 'Delivery Confirmed',
                  description: 'Equipment arrives at your project site. You confirm delivery, and the rental period officially begins.',
                  icon: '📍'
                },
                {
                  step: '09',
                  title: 'Rental Period',
                  description: 'Use the equipment for your project. Our team is available 24/7 if you need support.',
                  icon: '⚙️'
                },
                {
                  step: '10',
                  title: 'Return & Inspection',
                  description: 'At the end of the rental, equipment is returned. A post-rental inspection compares condition to the pre-rental state.',
                  icon: '🔧'
                },
                {
                  step: '11',
                  title: 'Deposit Settlement',
                  description: 'If no damage, your deposit is released. If damage is found, the appropriate amount is deducted based on the inspection report.',
                  icon: '💵'
                },
                {
                  step: '12',
                  title: 'Review & Repeat',
                  description: 'Leave a review of your experience. Need equipment again? Come back and find your next machine.',
                  icon: '⭐'
                }
              ].map((item, index) => (
                <div key={item.step} className="card-surface rounded-xl p-8 flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-lg bg-cheesco-yellow/10 flex items-center justify-center text-3xl">
                      {item.icon}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-sm font-bold text-cheesco-yellow">{item.step}</span>
                      <h3 className="text-xl font-bold">{item.title}</h3>
                    </div>
                    <p className="text-ink-muted">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="bg-card-raised py-16 border-y border-line-soft">
            <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
              <h2 className="text-3xl font-black mb-4">Ready to Get Started?</h2>
              <p className="text-ink-muted mb-8">
                Join thousands of businesses renting heavy equipment through Cheesco.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/browse" className="inline-block rounded-lg bg-cheesco-yellow px-8 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright">
                  Browse Equipment
                </a>
                <a href="/register" className="inline-block rounded-lg border border-cheesco-yellow px-8 py-3 font-bold text-cheesco-yellow hover:bg-cheesco-yellow/10">
                  Create Account
                </a>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-black mb-8 text-center">Common Questions</h2>
            <div className="space-y-4">
              <div className="card-surface rounded-xl p-6">
                <h3 className="font-bold mb-2">How long does verification take?</h3>
                <p className="text-ink-muted">Equipment verification typically takes 24-48 hours. Once verified, you can submit rental requests.</p>
              </div>
              <div className="card-surface rounded-xl p-6">
                <h3 className="font-bold mb-2">Can I rent equipment for just one day?</h3>
                <p className="text-ink-muted">Yes, but minimum rental periods vary by equipment type. Some equipment requires 7+ day minimums.</p>
              </div>
              <div className="card-surface rounded-xl p-6">
                <h3 className="font-bold mb-2">What if equipment breaks down during my rental?</h3>
                <p className="text-ink-muted">Contact our 24/7 operations desk immediately. We'll arrange repair or replacement at no extra cost.</p>
              </div>
              <div className="card-surface rounded-xl p-6">
                <h3 className="font-bold mb-2">Are operators included?</h3>
                <p className="text-ink-muted">Operator availability varies. Check the equipment listing—you can request an operator during the rental request.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}