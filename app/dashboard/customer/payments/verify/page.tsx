/* ── Payment Verification & Confirmation Page ─────────────────────── */
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function PaymentVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams?.get("reference") || searchParams?.get("trxref");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [paymentData, setPaymentData] = useState<{
    reference: string;
    amount: number;
    status: string;
    paidAt?: string;
  } | null>(null);

  useEffect(() => {
    if (!reference) {
      setErrorMsg("No payment reference found in URL.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const response = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference!)}`);
        const result = await response.json();

        if (!isMounted) return;

        if (result.success && result.data) {
          setSuccess(true);
          setPaymentData(result.data);
          // Auto redirect to customer dashboard after 3.5 seconds
          setTimeout(() => {
            router.push("/dashboard/customer");
          }, 3500);
        } else {
          setErrorMsg(result.error || "Payment verification could not be confirmed.");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMsg(err.message || "Failed to communicate with payment server.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [reference, router]);

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-[#121826] border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl space-y-6"
      >
        {loading ? (
          <div className="space-y-4 py-8">
            <div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-white">Verifying Transaction</h2>
            <p className="text-xs text-zinc-400">
              Confirming transaction with Paystack for ref:{" "}
              <span className="font-mono text-yellow-400">{reference}</span>
            </p>
          </div>
        ) : success ? (
          <div className="space-y-5">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✅
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Payment Confirmed!</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Your quotation has been paid and site mobilization is initiated.
              </p>
            </div>

            {paymentData && (
              <div className="bg-[#0B0F19] rounded-xl p-4 text-left border border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Reference:</span>
                  <span className="font-mono text-yellow-400 font-bold">{paymentData.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Amount Paid:</span>
                  <span className="font-bold text-white">₦{paymentData.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Status:</span>
                  <span className="text-emerald-400 font-bold">SUCCESSFUL</span>
                </div>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <Link
                href="/dashboard/customer"
                className="w-full inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold px-6 py-3 rounded-xl transition shadow text-xs uppercase tracking-wider"
              >
                Return to Customer Dashboard
              </Link>
              <p className="text-[11px] text-zinc-500">
                Redirecting automatically in a few seconds...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="w-16 h-16 bg-red-500/20 border border-red-500/40 rounded-full flex items-center justify-center mx-auto text-3xl">
              ⚠️
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Payment Verification Issue</h2>
              <p className="text-xs text-red-400 mt-1">{errorMsg}</p>
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <Link
                href="/dashboard/customer"
                className="w-full inline-block bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-3 rounded-xl transition text-xs"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/support"
                className="text-xs text-zinc-400 hover:text-yellow-400 transition"
              >
                Contact Cheesco Support
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-xs text-zinc-500">
          Loading payment gateway...
        </div>
      }
    >
      <PaymentVerifyContent />
    </Suspense>
  );
}
