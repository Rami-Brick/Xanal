function StatItem({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/8 bg-white/4 p-6">
      {accent && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
      )}
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30 mb-3">
        {label}
      </p>
      <p className="text-5xl font-bold tabular-nums text-[#e8e3d9] leading-none">
        {value.toLocaleString("fr-FR")}
      </p>
    </div>
  )
}

export function StatsCard({
  productCount,
  orderCount,
}: {
  productCount: number
  orderCount: number
}) {
  return (
    <section aria-label="Données synchronisées">
      <div className="grid grid-cols-2 gap-4">
        <StatItem label="Produits" value={productCount} />
        <StatItem label="Commandes" value={orderCount} accent />
      </div>
    </section>
  )
}
