import { Metadata } from "next"
import { createAdminClient } from "@/lib/supabase/admin"
import { OverviewKPIs, type KPIData } from "@/components/dashboard/OverviewKPIs"
import { RecentOrders, type RecentOrder } from "@/components/dashboard/RecentOrders"
import { OrderStatusBreakdown, type StatusCount } from "@/components/dashboard/OrderStatusBreakdown"
import { TopProducts, type TopProduct } from "@/components/dashboard/TopProducts"
import { HealthStrip } from "@/components/dashboard/HealthStrip"
import { SyncCard, type SyncLogEntry } from "@/components/dashboard/SyncCard"
import { type ConnectionStatus } from "@/components/dashboard/ConnectionCard"

export const metadata: Metadata = {
  title: "Vue d'ensemble — Xanal",
}

export default async function DashboardPage() {
  const supabase = createAdminClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    tokenResult,
    syncLogsResult,
    ordersTodayResult,
    deliveredResult,
    avgOrderResult,
    returnedCountResult,
    totalOrdersResult,
    statusCountsResult,
    recentOrdersResult,
    topProductsResult,
  ] = await Promise.all([
    // Connection token
    supabase
      .from("converty_tokens")
      .select("store_id, scopes, updated_at, expires_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single(),

    // Last sync entries
    supabase
      .from("sync_log")
      .select(
        "sync_type, status, records_synced, records_created, records_updated, error_message, started_at, completed_at, triggered_by"
      )
      .order("started_at", { ascending: false })
      .limit(10),

    // Orders today
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("is_test", false)
      .gte("converty_created_at", todayStart.toISOString()),

    // Delivered: total_price rows + count
    supabase
      .from("orders")
      .select("total_price")
      .eq("status", "delivered")
      .eq("is_test", false),

    // All non-test orders for average
    supabase
      .from("orders")
      .select("total_price")
      .eq("is_test", false),

    // Returned count
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "returned")
      .eq("is_test", false),

    // Total non-test
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("is_test", false),

    // Status distribution
    supabase
      .from("orders")
      .select("status")
      .eq("is_test", false),

    // Recent 15 orders
    supabase
      .from("orders")
      .select(
        "converty_id, reference, status, customer_name, customer_city, total_price, converty_created_at"
      )
      .eq("is_test", false)
      .order("converty_created_at", { ascending: false })
      .limit(15),

    // Top products: aggregate via order_items joined to products
    // Fetch all order_items with product info — aggregate client-side
    supabase
      .from("order_items")
      .select(
        "product_name, quantity, price_per_unit, products(image_url)"
      )
      .limit(2000),
  ])

  // --- Connection ---
  const connection: ConnectionStatus | null = tokenResult.data
    ? {
        connected: true,
        store_id: tokenResult.data.store_id ?? null,
        scopes: (tokenResult.data.scopes as string[] | null) ?? null,
        last_updated: tokenResult.data.updated_at ?? null,
        expires_at: tokenResult.data.expires_at ?? null,
      }
    : null

  // --- Sync logs ---
  const syncLogs = (syncLogsResult.data ?? []) as SyncLogEntry[]
  const lastProductsSync = syncLogs.find((l) => l.sync_type === "products") ?? null
  const lastOrdersSync = syncLogs.find((l) => l.sync_type === "orders") ?? null

  // --- KPIs ---
  const ordersToday = ordersTodayResult.count ?? 0
  const totalOrders = totalOrdersResult.count ?? 0

  const deliveredRows = deliveredResult.data ?? []
  const deliveredRevenue = deliveredRows.reduce(
    (sum, row) => sum + Number(row.total_price ?? 0),
    0
  )
  const deliveredCount = deliveredRows.length

  const allOrderRows = avgOrderResult.data ?? []
  const averageOrderValue =
    allOrderRows.length > 0
      ? allOrderRows.reduce((sum, row) => sum + Number(row.total_price ?? 0), 0) /
        allOrderRows.length
      : 0

  const returnedCount = returnedCountResult.count ?? 0
  const returnRate = totalOrders > 0 ? (returnedCount / totalOrders) * 100 : 0
  const confirmationRate = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0

  const kpiData: KPIData = {
    ordersToday,
    deliveredRevenue,
    deliveredCount,
    averageOrderValue,
    returnRate,
    confirmationRate,
    totalOrders,
  }

  // --- Status breakdown ---
  const statusRows = statusCountsResult.data ?? []
  const statusMap = new Map<string, number>()
  for (const row of statusRows) {
    if (row.status) {
      statusMap.set(row.status, (statusMap.get(row.status) ?? 0) + 1)
    }
  }
  const statusCounts: StatusCount[] = Array.from(statusMap.entries()).map(
    ([status, count]) => ({ status, count })
  )

  // --- Recent orders ---
  const recentOrders: RecentOrder[] = (recentOrdersResult.data ?? []).map((row) => ({
    converty_id: row.converty_id as string,
    reference: row.reference as number | null,
    status: row.status as string,
    customer_name: row.customer_name as string | null,
    customer_city: row.customer_city as string | null,
    total_price: Number(row.total_price ?? 0),
    converty_created_at: row.converty_created_at as string | null,
  }))

  // --- Top products: aggregate client-side from order_items ---
  type ItemRow = {
    product_name: string | null
    quantity: number | null
    price_per_unit: number | null
    products: { image_url: string | null } | null
  }
  const itemRows = (topProductsResult.data ?? []) as unknown as ItemRow[]

  const productMap = new Map<string, { units: number; revenue: number; image_url: string | null }>()
  for (const row of itemRows) {
    if (!row.product_name) continue
    const name = row.product_name
    const qty = Number(row.quantity ?? 0)
    const rev = qty * Number(row.price_per_unit ?? 0)
    const existing = productMap.get(name)
    const image_url = (row.products as { image_url: string | null } | null)?.image_url ?? null
    if (existing) {
      existing.units += qty
      existing.revenue += rev
    } else {
      productMap.set(name, { units: qty, revenue: rev, image_url })
    }
  }

  const topProducts: TopProduct[] = Array.from(productMap.entries())
    .map(([product_name, { units, revenue, image_url }]) => ({
      product_name,
      units_sold: units,
      revenue,
      image_url,
    }))
    .sort((a, b) => b.units_sold - a.units_sold)
    .slice(0, 8)

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-2">
            Xpand Solutions
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-[#e8e3d9]">
            Vue d&apos;ensemble
          </h1>
          <p className="mt-2 text-sm text-white/35 max-w-md">
            Performance commerciale et état de synchronisation en temps réel.
          </p>
        </div>
        <HealthStrip
          connection={connection}
          lastProductsSync={lastProductsSync}
          lastOrdersSync={lastOrdersSync}
        />
      </div>

      {/* KPI section */}
      <OverviewKPIs data={kpiData} />

      {/* Insights row: status + top products */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OrderStatusBreakdown counts={statusCounts} />
        <TopProducts products={topProducts} />
      </div>

      {/* Recent orders — full width */}
      <RecentOrders orders={recentOrders} />

      {/* Sync controls — demoted */}
      <div className="border-t border-white/6 pt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/15 mb-4">
          Synchronisation manuelle
        </p>
        <SyncCard
          lastProductsSync={lastProductsSync}
          lastOrdersSync={lastOrdersSync}
        />
      </div>
    </div>
  )
}
