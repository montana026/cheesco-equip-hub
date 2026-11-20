export default function RootLoading() {
  return (
    <div className="min-h-screen bg-canvas animate-pulse">
      {/* Top Navbar Skeleton Placeholder */}
      <div className="h-18 border-b border-line-soft bg-canvas px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-line-soft" />
          <div className="h-5 w-36 rounded-md bg-line-soft hidden sm:block" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 w-20 rounded bg-line-soft hidden md:block" />
          <div className="h-4 w-20 rounded bg-line-soft hidden md:block" />
          <div className="h-9 w-24 rounded-xl bg-line-soft" />
        </div>
      </div>

      {/* Hero / Page Content Skeleton */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl space-y-4">
          <div className="h-4 w-32 rounded bg-cheesco-yellow/20" />
          <div className="h-10 w-3/4 rounded-xl bg-line-soft" />
          <div className="h-4 w-full rounded bg-line-soft" />
          <div className="h-4 w-2/3 rounded bg-line-soft" />
        </div>

        {/* 3 Grid Cards Skeleton */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl border border-line-soft bg-card p-5 space-y-4 shadow-sm">
              <div className="h-44 w-full rounded-xl bg-canvas-deep" />
              <div className="h-5 w-2/3 rounded bg-line-soft" />
              <div className="h-3 w-1/2 rounded bg-line-soft" />
              <div className="pt-2 flex justify-between items-center border-t border-line-soft">
                <div className="h-6 w-24 rounded bg-line-soft" />
                <div className="h-8 w-20 rounded-lg bg-cheesco-yellow/30" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
