import { cn } from "@/lib/utils"

export type TopProduct = {
  product_name: string
  units_sold: number
  revenue: number
  image_url: string | null
}

function formatCurrency(value: number): string {
  return (
    value.toLocaleString("fr-FR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + " DT"
  )
}

export function TopProducts({ products }: { products: TopProduct[] }) {
  const maxUnits = products.reduce((m, p) => Math.max(m, p.units_sold), 1)

  return (
    <section aria-label="Produits les plus vendus">
      <div className="rounded-xl border border-white/8 bg-white/4 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Produits les plus vendus
          </p>
          <p className="text-[10px] text-white/20 uppercase tracking-widest">unités · revenus</p>
        </div>

        {products.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-white/25">Aucune donnée disponible.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {products.map((product, i) => {
              const pct = (product.units_sold / maxUnits) * 100
              return (
                <div key={product.product_name} className="px-5 py-3.5 space-y-2">
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <span className="w-5 shrink-0 text-[11px] font-mono text-white/20 text-center">
                      {i + 1}
                    </span>

                    {/* Image or placeholder */}
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-white/8 flex items-center justify-center">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-white/20">—</span>
                      )}
                    </div>

                    {/* Name */}
                    <p className="flex-1 min-w-0 text-[13px] text-[#e8e3d9] truncate">
                      {product.product_name}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono text-[12px] text-amber-400">
                        {product.units_sold} u.
                      </span>
                      <span className="font-mono text-[12px] text-[#e8e3d9] w-24 text-right">
                        {formatCurrency(product.revenue)}
                      </span>
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="ml-8 h-0.5 w-full rounded-full bg-white/6">
                    <div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r from-amber-400/70 to-amber-400/30"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
