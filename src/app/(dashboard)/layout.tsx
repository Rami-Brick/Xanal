export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0e0e0e] font-sans text-[#e8e3d9]">
      <header className="border-b border-white/8 bg-[#0e0e0e]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#e8e3d9]">
              Xanal
            </span>
            <span className="h-3.5 w-px bg-white/15" />
            <span className="text-[11px] uppercase tracking-[0.12em] text-white/30">
              Console
            </span>
          </div>
          <a
            href="/"
            className="text-[11px] uppercase tracking-widest text-white/30 transition-colors hover:text-white/60"
          >
            ← Retour
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
    </div>
  )
}
