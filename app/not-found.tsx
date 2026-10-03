'use client';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="text-center max-w-2xl">
        {/* 404 Animation */}
        <div className="mb-8">
          <div className="text-9xl font-black text-cheesco-yellow mb-4 animate-bounce">
            404
          </div>
          <div className="text-6xl font-black text-ink mb-4">Oops!</div>
        </div>

        {/* Main Message */}
        <h1 className="text-3xl font-bold text-ink mb-4">
          Page Not Found
        </h1>
        <p className="text-lg text-ink-muted mb-8">
          The equipment you're looking for has left the lot. Let's get you back on track.
        </p>

        {/* Suggestions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="card-surface rounded-xl p-6 text-left">
            <div className="text-2xl mb-3">🔍</div>
            <h3 className="font-bold mb-2">Search Equipment</h3>
            <p className="text-sm text-ink-muted">Browse our marketplace</p>
          </div>
          <div className="card-surface rounded-xl p-6 text-left">
            <div className="text-2xl mb-3">📞</div>
            <h3 className="font-bold mb-2">Contact Support</h3>
            <p className="text-sm text-ink-muted">We're here to help</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/browse"
            className="inline-block rounded-lg bg-cheesco-yellow px-8 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright transition-all hover:scale-105"
          >
            Browse Equipment
          </a>
          <a
            href="/"
            className="inline-block rounded-lg border border-cheesco-yellow px-8 py-3 font-bold text-cheesco-yellow hover:bg-cheesco-yellow/10 transition-all"
          >
            Back to Home
          </a>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-line-soft text-sm text-ink-muted">
          <p>Need help? <a href="/contact" className="text-cheesco-yellow hover:underline">Get in touch</a></p>
        </div>
      </div>
    </div>
  );
}
