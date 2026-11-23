import { API_BASE, STORE_CATEGORIES, REQUEST_TIMEOUT_MS } from '../config.js';
import { aisleFor } from '../model/catalog.js';
import { roundMoney } from '../utils/dom.js';

async function getJson(path, { signal } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Turn a DummyJSON product into the shape the store uses.
 * DummyJSON's `price` is the selling price; MRP is derived from discountPercentage.
 */
export function normalizeProduct(raw) {
  const discount = Math.max(0, Math.min(90, Number(raw.discountPercentage) || 0));
  const price = roundMoney(Number(raw.price) || 0);
  const stock = Math.max(0, Number(raw.stock) || 0);
  return {
    id: raw.id,
    name: raw.title,
    brand: raw.brand ?? null,
    description: raw.description ?? '',
    category: raw.category,
    tags: raw.tags ?? [],
    aisle: aisleFor(raw),
    price,
    mrp: discount > 0 ? roundMoney(price / (1 - discount / 100)) : price,
    discount: Math.round(discount),
    rating: Math.round((Number(raw.rating) || 0) * 10) / 10,
    stock,
    lowStock: stock > 0 && stock <= 10,
    thumbnail: raw.thumbnail,
    images: raw.images?.length ? raw.images : [raw.thumbnail].filter(Boolean),
    reviews: (raw.reviews ?? []).map(({ reviewerName, rating, comment, date }) => ({ reviewerName, rating, comment, date })),
    returnPolicy: raw.returnPolicy ?? null,
  };
}

const FIELDS = [
  'id', 'title', 'description', 'category', 'price', 'discountPercentage', 'rating', 'stock',
  'tags', 'brand', 'thumbnail', 'images', 'reviews', 'returnPolicy',
].join(',');

/**
 * Load every store category in parallel. A failing category is skipped rather
 * than failing the whole store; it only throws if nothing could be loaded.
 */
export async function fetchCatalog({ signal } = {}) {
  const results = await Promise.allSettled(
    STORE_CATEGORIES.map((slug) =>
      getJson(`/products/category/${encodeURIComponent(slug)}?limit=0&select=${FIELDS}`, { signal })),
  );
  const loaded = results.filter((r) => r.status === 'fulfilled');
  if (!loaded.length) {
    const reason = results[0]?.reason;
    throw new Error(reason?.name === 'AbortError' ? 'The store took too long to respond.' : 'Could not reach the store.');
  }
  return loaded.flatMap((r) => r.value.products).map(normalizeProduct);
}
