import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 1000;

interface ProductRow {
  id: string;
  name: string;
  status: string | null;
  image_url: string | null;
}

interface OrderRow {
  id: string;
  is_test: boolean | null;
  status: string | null;
}

interface OrderItemRow {
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number | null;
}

async function fetchAllRows<T>(table: string, columns: string, orderCol = "id"): Promise<T[]> {
  const supabase = createAdminClient();
  const rows: T[] = [];
  let page = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderCol, { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw new Error(`${table} fetch failed: ${error.message}`);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    page += 1;
  }

  return rows;
}

export interface ProductDistributionRow {
  productId: string;
  name: string;
  imageUrl: string | null;
  totalOrders: number;
  deliveredOrders: number;
  totalUnits: number;
  deliveredUnits: number;
}

export interface ProductsPageData {
  totalProducts: number;
  activeProducts: number;
  byTotalOrders: ProductDistributionRow[];
  byDeliveredOrders: ProductDistributionRow[];
}

export const getProductsPageData = cache(async (): Promise<ProductsPageData> => {
  const [products, orders, orderItems] = await Promise.all([
    fetchAllRows<ProductRow>("products", "id, name, status, image_url"),
    fetchAllRows<OrderRow>("orders", "id, is_test, status"),
    fetchAllRows<OrderItemRow>("order_items", "order_id, product_id, product_name, quantity", "created_at"),
  ]);

  const realOrderIds = new Set(
    orders.filter((o) => !o.is_test).map((o) => o.id)
  );
  const deliveredOrderIds = new Set(
    orders
      .filter((o) => !o.is_test && (o.status ?? "").toLowerCase().trim() === "delivered")
      .map((o) => o.id)
  );

  const productById = new Map(products.map((p) => [p.id, p]));

  // Aggregate per product
  const agg = new Map<string, ProductDistributionRow>();

  for (const item of orderItems) {
    if (!realOrderIds.has(item.order_id)) continue;
    const key = item.product_id ?? `name:${item.product_name}`;
    const product = item.product_id ? productById.get(item.product_id) : null;
    const name = product?.name ?? item.product_name;
    const qty = Number(item.quantity ?? 0);

    const existing = agg.get(key);
    const isDelivered = deliveredOrderIds.has(item.order_id);

    if (existing) {
      existing.totalOrders += 1;
      existing.totalUnits += qty;
      if (isDelivered) {
        existing.deliveredOrders += 1;
        existing.deliveredUnits += qty;
      }
    } else {
      agg.set(key, {
        productId: key,
        name,
        imageUrl: product?.image_url ?? null,
        totalOrders: 1,
        deliveredOrders: isDelivered ? 1 : 0,
        totalUnits: qty,
        deliveredUnits: isDelivered ? qty : 0,
      });
    }
  }

  const all = Array.from(agg.values());

  return {
    totalProducts: products.length,
    activeProducts: products.filter((p) => (p.status ?? "active") === "active").length,
    byTotalOrders: [...all].sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 20),
    byDeliveredOrders: [...all].sort((a, b) => b.deliveredOrders - a.deliveredOrders).slice(0, 20),
  };
});
