import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { vi } from 'vitest';
import { normalizeProduct } from '../src/api/productsApi.js';

export const fixture = JSON.parse(readFileSync(resolve(process.cwd(), 'tests/fixtures/dummyjson-products.json'), 'utf8'));
export const rawProducts = Object.values(fixture).flat();
export const products = rawProducts.map(normalizeProduct);
export const byName = (name) => products.find((p) => p.name === name);

/** In-memory localStorage stand-in. */
export function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    data,
  };
}

/** Fake DummyJSON: serves fixture categories, empty for the rest. */
export function mockDummyJson({ fail = [] } = {}) {
  const fetchMock = vi.fn(async (url) => {
    const slug = decodeURIComponent(new URL(url).pathname.split('/').pop());
    if (fail.includes(slug)) return new Response('{}', { status: 500 });
    const list = fixture[slug] ?? [];
    return new Response(JSON.stringify({ products: list, total: list.length, skip: 0, limit: 0 }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
