import { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
  'Terms & Agreements | Cheesco Equip Hub',
  'Legal terms, conditions, and agreements for using Cheesco Equip Hub marketplace platform.',
  undefined,
  'https://cheescoequiphub.com/terms'
);

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-24 sm:px-6 bg-canvas min-h-screen">
          <h1 className="text-4xl font-black mb-8">Terms & Agreements</h1>

          <div className="space-y-8 text-ink">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. User Accounts</h2>
              <p className="text-ink-muted mb-3">Users must provide accurate information during registration. You are responsible for maintaining confidentiality of your account credentials and password.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Equipment Rental Terms</h2>
              <p className="text-ink-muted mb-3">All rentals are subject to Cheesco's managed rental process. Equipment must be used in accordance with manufacturer guidelines and applicable laws.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Payment Terms</h2>
              <p className="text-ink-muted mb-3">Payments are processed through Paystack. Deposits are held in escrow until rental completion. Refunds follow our deposit settlement policy.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Liability & Damage</h2>
              <p className="text-ink-muted mb-3">Customers are responsible for equipment during rental period. Damage beyond normal wear is subject to deposit deduction. Inspections determine responsibility.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Cancellation Policy</h2>
              <p className="text-ink-muted mb-3">Cancellations before logistics assignment incur no penalty. Cancellations after logistics assignment follow our published policy with potential penalties.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Dispute Resolution</h2>
              <p className="text-ink-muted mb-3">Disputes are resolved through Cheesco's dispute system. Both parties can submit evidence. Cheesco makes final rulings based on inspection records and agreements.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Intellectual Property</h2>
              <p className="text-ink-muted mb-3">All content on Cheesco is owned by Cheesco or its licensors. Unauthorized use is prohibited.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Limitation of Liability</h2>
              <p className="text-ink-muted mb-3">Cheesco is not liable for indirect, incidental, or consequential damages. Our liability is limited to the amount paid in the transaction.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Changes to Terms</h2>
              <p className="text-ink-muted mb-3">Cheesco reserves the right to modify these terms. Users will be notified of material changes.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Contact</h2>
              <p className="text-ink-muted mb-3">For questions about these terms, contact support@cheescoequiphub.com</p>
            </section>

            <div className="mt-12 pt-8 border-t border-line-soft">
              <p className="text-sm text-ink-faint">Last updated: October 2026</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
