import { getConvertyConfig } from "@/lib/converty/config";
import {
  makeAuthenticatedConvertyRequest,
  makeAuthenticatedConvertyRequestToUrl,
} from "@/lib/converty/client";

export const CONVERTY_ORDERS_PAGE_SIZE = 50;
export const CONVERTY_ALL_ORDERS_PAGE_SIZE = 200;

interface GetOrdersPageOptions {
  archived?: boolean;
  partnerArchived?: boolean;
}

interface ConvertyOrderCustomer {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
}

interface ConvertyOrderProduct {
  _id?: string | null;
  name?: string | null;
}

interface ConvertySelectedVariant {
  name?: string | null;
  type?: string | null;
  value?: string | null;
}

interface ConvertyOrderCartItem {
  product?: ConvertyOrderProduct | null;
  quantity?: number | string | null;
  selectedVariants?: ConvertySelectedVariant[] | null;
  pricePerUnit?: number | string | null;
}

interface ConvertyOrderTotal {
  totalPrice?: number | string | null;
  deliveryPrice?: number | string | null;
  deliveryCost?: number | string | null;
  basePrice?: number | string | null;
}

interface ConvertyOrder {
  _id: string;
  reference?: number | string | null;
  customer?: ConvertyOrderCustomer | null;
  status: string;
  attempt?: number | string | null;
  barcode?: string | null;
  cart?: ConvertyOrderCartItem[] | null;
  total?: ConvertyOrderTotal | null;
  deliveryCompany?: string | null;
  paymentStatus?: string | null;
  refunded?: boolean | null;
  isTest?: boolean | null;
  note?: string | null;
  history?: unknown[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface ConvertyOrdersResponse {
  success?: boolean;
  message?: string;
  count?: number | string;
  data: ConvertyOrder[];
}

export interface OrderSyncRow {
  converty_id: string;
  reference: number | null;
  status: string;
  attempt: number | null;
  barcode: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_city: string | null;
  total_price: number;
  delivery_price: number;
  delivery_cost: number;
  base_price: number;
  delivery_company: string | null;
  payment_status: string | null;
  refunded: boolean;
  is_test: boolean;
  note: string | null;
  history: unknown[];
  converty_created_at: string | null;
  converty_updated_at: string | null;
  synced_at: string;
  updated_at: string;
}

export interface OrderItemSyncRow {
  order_id: string;
  product_id: string | null;
  converty_product_id: string;
  product_name: string;
  quantity: number;
  price_per_unit: number;
  selected_variants: unknown[];
}

function parseNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseInteger(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : 0;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseNullableInteger(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = parseInteger(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getOrdersPage(
  page: number,
  limit = CONVERTY_ORDERS_PAGE_SIZE,
  options?: GetOrdersPageOptions
): Promise<ConvertyOrdersResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  let response: Response;

  if (options?.partnerArchived) {
    params.set("archived", "true");
    const config = getConvertyConfig();
    response = await makeAuthenticatedConvertyRequestToUrl(
      `${config.partnerApiBaseUrl}/order?${params.toString()}`
    );
  } else {
    if (options?.archived) {
      params.set("archived", "true");
    }

    response = await makeAuthenticatedConvertyRequest(
      `/orders?${params.toString()}`
    );
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Converty orders request failed (${response.status}): ${details}`
    );
  }

  const payload = (await response.json()) as ConvertyOrdersResponse;

  if (!Array.isArray(payload.data)) {
    throw new Error("Converty orders response did not include a data array.");
  }

  return payload;
}

export function mapOrderToRow(
  order: ConvertyOrder,
  syncedAt: string
): OrderSyncRow {
  return {
    converty_id: order._id,
    reference: parseNullableInteger(order.reference),
    status: order.status,
    attempt: parseNullableInteger(order.attempt),
    barcode: order.barcode ?? null,
    customer_name: order.customer?.name ?? null,
    customer_phone: order.customer?.phone ?? null,
    customer_email: order.customer?.email ?? null,
    customer_address: order.customer?.address ?? null,
    customer_city: order.customer?.city ?? null,
    total_price: parseNumber(order.total?.totalPrice),
    delivery_price: parseNumber(order.total?.deliveryPrice),
    delivery_cost: parseNumber(order.total?.deliveryCost),
    base_price: parseNumber(order.total?.basePrice),
    delivery_company: order.deliveryCompany ?? null,
    payment_status: order.paymentStatus ?? null,
    refunded: Boolean(order.refunded),
    is_test: Boolean(order.isTest),
    note: order.note ?? null,
    history: Array.isArray(order.history) ? order.history : [],
    converty_created_at: order.createdAt ?? null,
    converty_updated_at: order.updatedAt ?? null,
    synced_at: syncedAt,
    updated_at: syncedAt,
  };
}

export function mapOrderItems(
  orderId: string,
  cart: ConvertyOrderCartItem[] | null | undefined,
  productIdMap: Map<string, string>
): OrderItemSyncRow[] {
  if (!Array.isArray(cart) || cart.length === 0) {
    return [];
  }

  return cart
    .filter((item) => item.product?._id && item.product?.name)
    .map((item) => {
      const convertyProductId = item.product!._id!;

      return {
        order_id: orderId,
        product_id: productIdMap.get(convertyProductId) ?? null,
        converty_product_id: convertyProductId,
        product_name: item.product?.name ?? "Unknown product",
        quantity: parseInteger(item.quantity) || 1,
        price_per_unit: parseNumber(item.pricePerUnit),
        selected_variants: Array.isArray(item.selectedVariants)
          ? item.selectedVariants
          : [],
      };
    });
}
