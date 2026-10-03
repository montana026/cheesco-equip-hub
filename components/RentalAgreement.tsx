/* ── Rental Agreement Generation & Display ──────────────────── */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { fmtNgnFull } from '@/lib/format';

interface RentalAgreementProps {
  rentalRequest: {
    id: string;
    referenceNumber: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    projectLocation: string;
    operatorRequired: boolean;
    deliveryRequired: boolean;
  };
  equipment: {
    name: string;
    category: string;
    brand: string;
    model: string;
    year: number;
  };
  customer: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  merchant: {
    businessName: string;
    businessAddress: string;
  };
  quotation: {
    totalAmount: number;
    depositAmount: number;
    merchantPayoutTotal: number;
    lineItems: Array<{ label: string; amount: number; note?: string }>;
  };
  onAccept?: () => void;
  onDecline?: () => void;
  isPreview?: boolean;
}

export default function RentalAgreement({
  rentalRequest,
  equipment,
  customer,
  merchant,
  quotation,
  onAccept,
  onDecline,
  isPreview = false,
}: RentalAgreementProps) {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState('');

  const agreementDate = new Date().toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleAccept = async () => {
    if (!signature.trim()) {
      toast.error('Please enter your full name as digital signature');
      return;
    }

    if (signature.trim().toLowerCase() !== customer.fullName.toLowerCase()) {
      toast.error('Signature must match your registered name');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/agreements/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rentalRequestId: rentalRequest.id,
          signature,
          ipAddress: await fetch('https://api.ipify.org?format=json')
            .then(r => r.json())
            .then(d => d.ip)
            .catch(() => 'unknown'),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to sign agreement');
      }

      setAccepted(true);
      toast.success('Agreement signed successfully!');
      onAccept?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign agreement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white text-gray-900"
    >
      {/* Agreement Header */}
      <div className="border-b-2 border-gray-900 p-8 bg-yellow-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">RENTAL AGREEMENT</h1>
            <p className="text-sm text-gray-600 mt-1">Cheesco Equip Hub</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Agreement #</div>
            <div className="text-lg font-bold">{rentalRequest.referenceNumber}</div>
          </div>
        </div>
      </div>

      {/* Agreement Body */}
      <div className="p-8 space-y-6 max-w-4xl mx-auto">
        {/* Parties */}
        <section>
          <h2 className="text-xl font-black mb-4 text-yellow-600">PARTIES TO THIS AGREEMENT</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="text-sm font-bold text-gray-600 mb-2">EQUIPMENT PROVIDER</div>
              <div className="font-bold">{merchant.businessName}</div>
              <div className="text-sm text-gray-600 mt-1">{merchant.businessAddress}</div>
              <div className="text-xs text-gray-500 mt-2">
                (Hereinafter referred to as "Provider")
              </div>
            </div>

            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="text-sm font-bold text-gray-600 mb-2">RENTER</div>
              <div className="font-bold">{customer.fullName}</div>
              <div className="text-sm text-gray-600 mt-1">{customer.email}</div>
              <div className="text-sm text-gray-600">{customer.phone}</div>
              <div className="text-xs text-gray-500 mt-2">
                (Hereinafter referred to as "Renter")
              </div>
            </div>
          </div>

          <div className="mt-4 border border-gray-300 rounded-lg p-4 bg-yellow-50">
            <div className="text-sm font-bold text-gray-600 mb-2">MANAGED BY</div>
            <div className="font-bold">CHEESCO EQUIP HUB</div>
            <div className="text-xs text-gray-600 mt-1">
              Acting as trusted intermediary for verification, quotation, payment processing,
              logistics coordination, and dispute resolution.
            </div>
          </div>
        </section>

        {/* Equipment Details */}
        <section>
          <h2 className="text-xl font-black mb-4 text-yellow-600">EQUIPMENT DETAILS</h2>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-gray-600">Equipment Name</div>
                <div className="font-bold">{equipment.name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Category</div>
                <div className="font-bold">{equipment.category}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Brand & Model</div>
                <div className="font-bold">{equipment.brand} {equipment.model}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Year</div>
                <div className="font-bold">{equipment.year}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Rental Period */}
        <section>
          <h2 className="text-xl font-black mb-4 text-yellow-600">RENTAL PERIOD</h2>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs text-gray-600">Start Date</div>
                <div className="font-bold">
                  {new Date(rentalRequest.startDate).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600">End Date</div>
                <div className="font-bold">
                  {new Date(rentalRequest.endDate).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Duration</div>
                <div className="font-bold">{rentalRequest.durationDays} days</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-300">
              <div className="text-xs text-gray-600">Delivery Location</div>
              <div className="font-bold">{rentalRequest.projectLocation}</div>
            </div>
          </div>
        </section>

        {/* Financial Terms */}
        <section>
          <h2 className="text-xl font-black mb-4 text-yellow-600">FINANCIAL TERMS</h2>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="space-y-2">
              {quotation.lineItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <div>
                    <span className="font-medium">{item.label}</span>
                    {item.note && <span className="text-gray-500 ml-2">({item.note})</span>}
                  </div>
                  <div className="font-bold">₦{fmtNgnFull(item.amount)}</div>
                </div>
              ))}
              <div className="border-t-2 border-gray-900 pt-2 mt-3 flex justify-between">
                <span className="font-bold">TOTAL RENTAL FEE</span>
                <span className="text-xl font-black">₦{fmtNgnFull(quotation.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm bg-yellow-100 p-2 rounded">
                <span className="font-bold">DAMAGE DEPOSIT</span>
                <span className="font-black">₦{fmtNgnFull(quotation.depositAmount)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Terms & Conditions */}
        <section>
          <h2 className="text-xl font-black mb-4 text-yellow-600">TERMS & CONDITIONS</h2>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 text-sm space-y-3">
            <div>
              <div className="font-bold mb-1">1. PAYMENT TERMS</div>
              <p className="text-gray-700">
                Full rental payment and damage deposit must be paid before equipment delivery.
                Payments are processed securely through Cheesco Equip Hub.
              </p>
            </div>

            <div>
              <div className="font-bold mb-1">2. DAMAGE DEPOSIT</div>
              <p className="text-gray-700">
                A damage deposit of ₦{fmtNgnFull(quotation.depositAmount)} is required. This
                deposit will be refunded within 7 business days after rental completion,
                less any deductions for damage or loss as determined by post-rental inspection.
              </p>
            </div>

            <div>
              <div className="font-bold mb-1">3. EQUIPMENT CONDITION</div>
              <p className="text-gray-700">
                Equipment will be inspected before delivery and after return. The Renter is
                responsible for maintaining the equipment in good working condition and must
                report any issues immediately to Cheesco operations.
              </p>
            </div>

            <div>
              <div className="font-bold mb-1">4. DELIVERY & RETURN</div>
              <p className="text-gray-700">
                {rentalRequest.deliveryRequired ? (
                  <>Equipment will be delivered to the project location by Cheesco-coordinated
                  logistics. The Renter must be present to receive delivery and confirm equipment
                  condition. Return logistics will be coordinated by Cheesco at rental end.</>
                ) : (
                  <>The Renter is responsible for equipment pickup and return from the Provider's
                  location. Cheesco will coordinate timing and logistics support as needed.</>
                )}
              </p>
            </div>

            {rentalRequest.operatorRequired && (
              <div>
                <div className="font-bold mb-1">5. OPERATOR</div>
                <p className="text-gray-700">
                  A qualified operator has been assigned to this rental. The operator's costs are
                  included in the rental fee. The Renter must provide safe working conditions and
                  clear instructions for equipment operation.
                </p>
              </div>
            )}

            <div>
              <div className="font-bold mb-1">{rentalRequest.operatorRequired ? '6' : '5'}. LIABILITY & INSURANCE</div>
              <p className="text-gray-700">
                The Renter assumes full responsibility for the equipment during the rental period
                and must ensure adequate insurance coverage. The Renter is liable for any damage,
                loss, or theft not covered by normal wear and tear.
              </p>
            </div>

            <div>
              <div className="font-bold mb-1">{rentalRequest.operatorRequired ? '7' : '6'}. CANCELLATION</div>
              <p className="text-gray-700">
                Cancellations must be made through Cheesco Equip Hub. Cancellation fees may apply
                depending on timing. The deposit is non-refundable if cancellation occurs less than
                48 hours before scheduled delivery.
              </p>
            </div>

            <div>
              <div className="font-bold mb-1">{rentalRequest.operatorRequired ? '8' : '7'}. DISPUTE RESOLUTION</div>
              <p className="text-gray-700">
                Any disputes arising from this agreement will be mediated by Cheesco Equip Hub.
                If mediation fails, disputes will be resolved through arbitration in accordance
                with Nigerian law.
              </p>
            </div>

            <div>
              <div className="font-bold mb-1">{rentalRequest.operatorRequired ? '9' : '8'}. GOVERNING LAW</div>
              <p className="text-gray-700">
                This agreement is governed by the laws of the Federal Republic of Nigeria.
              </p>
            </div>
          </div>
        </section>

        {/* Acknowledgment */}
        <section className="border-2 border-yellow-600 rounded-lg p-6 bg-yellow-50">
          <h3 className="font-black mb-3">ACKNOWLEDGMENT</h3>
          <p className="text-sm text-gray-700 mb-4">
            By signing this agreement, the Renter acknowledges that they have read, understood,
            and agree to be bound by all terms and conditions outlined above. The Renter confirms
            that all information provided is accurate and that they have the authority to enter
            into this agreement.
          </p>

          {!isPreview && !accepted && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">
                  Digital Signature (Type your full name) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder={customer.fullName}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-serif italic focus:outline-none focus:border-yellow-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This constitutes your digital signature and agreement to the terms above.
                </p>
              </div>

              <div className="flex gap-3">
                {onDecline && (
                  <button
                    type="button"
                    onClick={onDecline}
                    disabled={loading}
                    className="flex-1 border-2 border-gray-300 rounded-lg px-6 py-3 font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Decline
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={loading || !signature.trim()}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 rounded-lg px-6 py-3 font-black text-gray-900 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Accept & Sign Agreement'}
                </button>
              </div>
            </>
          )}

          {accepted && (
            <div className="bg-green-100 border-2 border-green-600 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="font-black text-green-800">Agreement Signed Successfully</div>
              <div className="text-sm text-green-700 mt-1">
                Signed on {agreementDate} by {customer.fullName}
              </div>
            </div>
          )}

          {isPreview && (
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center text-sm text-gray-600">
              This is a preview. Actual agreement will require digital signature.
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="text-xs text-gray-500 text-center pt-6 border-t border-gray-300">
          <p>This is a legally binding agreement between the parties named above.</p>
          <p className="mt-1">Managed by Cheesco Equip Hub • www.cheescoequiphub.com</p>
          <p className="mt-1">Agreement generated on {agreementDate}</p>
        </div>
      </div>
    </motion.div>
  );
}
