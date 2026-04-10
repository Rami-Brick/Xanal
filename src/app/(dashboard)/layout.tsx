export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-[#f4efe7] text-stone-900"
      style={{
        fontFamily:
          'var(--font-geist-sans), "Work Sans", "Segoe UI", sans-serif',
      }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(176,136,98,0.18),transparent_58%)]" />
        <div className="absolute left-[-8rem] top-36 h-72 w-72 rounded-full bg-[#d3ba91]/20 blur-3xl" />
        <div className="absolute right-[-5rem] top-28 h-80 w-80 rounded-full bg-[#7c8f73]/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,113,108,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,113,108,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />
      </div>

      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f4efe7]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white/70 text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-600 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
              XA
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-stone-500">
                Xanal
              </p>
              <p
                className="text-xl leading-none text-stone-900"
                style={{
                  fontFamily:
                    '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
                }}
              >
                Tableau opérateur
              </p>
            </div>
          </div>

          <a
            href="/"
            className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.22em] text-stone-600 transition hover:border-black/20 hover:text-stone-900"
          >
            Retour
          </a>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
        {children}
      </main>
    </div>
  );
}
