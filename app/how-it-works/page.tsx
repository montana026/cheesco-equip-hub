import { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { generatePageMetadata } from '@/lib/seo/metadata';
import { HowItWorksClient } from '@/components/how-it-works-client';

export const metadata: Metadata = generatePageMetadata(
  'How It Works — Rentals & Purchases | Cheesco Equip Hub',
  'Learn how Cheesco manages heavy equipment rentals and outright equipment purchases safely with escrow protection, technical audits, and logistics.',
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
          <section className="mx-auto max-w-7xl px-4 pt-28 pb-12 sm:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-lg bg-cheesco-yellow/15 px-3 py-1 text-xs font-black text-cheesco-yellow border border-cheesco-yellow/30 mb-4">
                <span>MANAGED HEAVY MACHINERY MARKETPLACE</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black mb-4 text-ink">
                How <span className="text-cheesco-yellow">Cheesco</span> Works
              </h1>
              <p className="text-base sm:text-lg text-ink-muted leading-relaxed">
                Whether leasing equipment for a 1-day project or acquiring permanent machinery for your fleet, our end-to-end processes protect buyers, renters, and fleet owners.
              </p>
            </div>
          </section>

          {/* Interactive Steps & FAQs for Rentals vs Purchases */}
          <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
            <HowItWorksClient />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}