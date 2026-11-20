import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen flex flex-col justify-center items-center bg-canvas px-4 pt-24 pb-16">
        <div className="w-full max-w-2xl text-center">
          {/* Machinery Themed Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cheesco-yellow/40 bg-cheesco-yellow/10 px-4 py-1.5 text-xs font-black tracking-widest text-cheesco-yellow mb-6 uppercase">
            <span>⚠️</span> Error 404 · Machine Off The Lot
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-ink tracking-tight">
            Equipment Not Located
          </h1>

          <p className="mt-3 text-sm sm:text-base text-ink-muted max-w-md mx-auto leading-relaxed">
            The page or machine listing you requested does not exist or may have been relocated to an active job site.
          </p>

          {/* Action Cards (All Clickable) */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <Link
              href="/browse"
              className="card-surface rounded-2xl p-6 border border-line-soft hover:border-cheesco-yellow/50 hover:bg-canvas-deep transition-all shadow-sm group"
            >
              <div className="text-2xl mb-2">🚜</div>
              <h2 className="text-sm font-bold text-ink group-hover:text-cheesco-yellow transition-colors">
                Browse Active Fleet &rarr;
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                Explore verified excavators, bulldozers, cranes, and lowbeds ready for immediate mobilization.
              </p>
            </Link>

            <Link
              href="/support"
              className="card-surface rounded-2xl p-6 border border-line-soft hover:border-cheesco-yellow/50 hover:bg-canvas-deep transition-all shadow-sm group"
            >
              <div className="text-2xl mb-2">📞</div>
              <h2 className="text-sm font-bold text-ink group-hover:text-cheesco-yellow transition-colors">
                Contact Dispatch Desk &rarr;
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                Speak directly with an equipment sourcing specialist to locate specific industrial plant machinery.
              </p>
            </Link>
          </div>

          {/* Quick CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-cheesco-yellow px-6 py-3 text-xs font-bold text-[#0A0D14] shadow transition-all hover:bg-cheesco-yellow-bright"
            >
              Back to Home
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-line-soft bg-card px-6 py-3 text-xs font-bold text-ink hover:border-cheesco-yellow/40 transition-all"
            >
              Submit Support Ticket
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
