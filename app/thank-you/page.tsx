import { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { generatePageMetadata } from '@/lib/seo/metadata';
import ThankYouClient from './thank-you-client';

export const metadata: Metadata = generatePageMetadata(
  'Thank You - Cheesco Equip Hub',
  'Your rental request submitted successfully. Cheesco will review and get back to you within 2 hours.',
  undefined,
  'https://cheescoequiphub.com/thank-you'
);

export default function ThankYouPage() {
  return (
    <>
      <Navbar />
      <ThankYouClient />
      <Footer />
    </>
  );
}
        <div className="min-h-screen flex items-center justify-center bg-canvas px-4 pt-32 pb-16">
          <div className="text-center max-w-2xl">
            <div className="mb-8 text-6xl">✅</div>
            <h1 className="text-4xl font-black mb-4 text-cheesco-yellow">
              Request Submitted!
            </h1>
            <p className="text-xl text-ink mb-6">
              Your rental request has been received. Our operations team will verify the equipment and get back to you within 2 hours with a quotation.
            </p>
            <div className="card-surface rounded-xl p-8 mb-8">
              <h2 className="font-bold mb-4">What Happens Next:</h2>
              <ol className="text-left space-y-3 text-ink-muted">
                <li>✓ <strong>Verification</strong> - We verify equipment availability</li>
                <li>✓ <strong>Quotation</strong> - Cheesco creates a detailed quote</li>
                <li>✓ <strong>Review</strong> - You review and accept/modify</li>
                <li>✓ <strong>Agreement</strong> - Digital rental agreement</li>
                <li>✓ <strong>Payment</strong> - Secure payment via Paystack</li>
                <li>✓ <strong>Delivery</strong> - Equipment logistics arranged</li>
              </ol>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/dashboard/customer" className="inline-block rounded-lg bg-cheesco-yellow px-8 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright">
                View Your Request
              </a>
              <a href="/browse" className="inline-block rounded-lg border border-cheesco-yellow px-8 py-3 font-bold text-cheesco-yellow hover:bg-cheesco-yellow/10">
                Browse More Equipment
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
