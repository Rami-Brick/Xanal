import { makeAuthenticatedConvertyRequest } from "@/lib/converty/client";

export const CONVERTY_PRODUCTS_PAGE_SIZE = 50;

interface ConvertyProductImage {
  sm?: string;
  md?: string;
  lg?: string;
}

interface ConvertyProduct {
  _id: string;
  reference?: number | string | null;
  name: string;
  sku?: string | null;
  images?: ConvertyProductImage[] | null;
  price?: number | string | null;
  comparePrice?: number | string | null;
  cost?: number | string | null;
  deliveryPrice?: number | string | null;
  deliveryCost?: number | string | null;
  trackStock?: boolean | null;
  stock?: number | string | null;
  categories?: string[] | null;
  status?: string | null;
  isDeleted?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  slug?: string | null;
}

interface ConvertyProductsResponse {
  success?: boolean;
  message?: string;
  count?: number | string;
  data: ConvertyProduct[];
}

export interface ProductSyncRow {
  converty_id: string;
  reference: number | null;
  name: string;
  sku: string | null;
  price: number;
  compare_price: number;
  cost: number;
  delivery_price: number;
  delivery_cost: number;
  stock: number;
  track_stock: boolean;
  status: string;
  slug: string | null;
  image_url: string | null;
  categories: string[];
  is_deleted: boolean;
  converty_created_at: string | null;
  converty_updated_at: string | null;
  synced_at: string;
  updated_at: string;
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

function getPrimaryImageUrl(images: ConvertyProductImage[] | null | undefined) {
  const firstImage = images?.[0];

  if (!firstImage) {
    return null;
  }

  return firstImage.sm || firstImage.md || firstImage.lg || null;
}

export async function getProductsPage(
  page: number,
  limit = CONVERTY_PRODUCTS_PAGE_SIZE,
  storeId?: string
): Promise<ConvertyProductsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await makeAuthenticatedConvertyRequest(
    `/products?${params.toString()}`,
    undefined,
    storeId
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Converty products request failed (${response.status}): ${details}`
    );
  }

  const payload = (await response.json()) as ConvertyProductsResponse;

  if (!Array.isArray(payload.data)) {
    throw new Error("Converty products response did not include a data array.");
  }

  return payload;
}

export function mapProductToRow(
  product: ConvertyProduct,
  syncedAt: string
): ProductSyncRow {
  return {
    converty_id: product._id,
    reference: parseNullableInteger(product.reference),
    name: product.name,
    sku: product.sku ?? null,
    price: parseNumber(product.price),
    compare_price: parseNumber(product.comparePrice),
    cost: parseNumber(product.cost),
    delivery_price: parseNumber(product.deliveryPrice),
    delivery_cost: parseNumber(product.deliveryCost),
    stock: parseInteger(product.stock),
    track_stock: Boolean(product.trackStock),
    status: product.status || "active",
    slug: product.slug ?? null,
    image_url: getPrimaryImageUrl(product.images),
    categories: product.categories ?? [],
    is_deleted: Boolean(product.isDeleted),
    converty_created_at: product.createdAt ?? null,
    converty_updated_at: product.updatedAt ?? null,
    synced_at: syncedAt,
    updated_at: syncedAt,
  };
}
