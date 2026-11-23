import { describe, it, expect } from 'vitest';
import { normalizeProduct, fetchCatalog } from '../src/api/productsApi.js';
import { STORE_CATEGORIES } from '../src/config.js';
import { fixture, mockDummyJson } from './helpers.js';

describe('normalizeProduct', () => {
  const apple = normalizeProduct(fixture.groceries.find((p) => p.title === 'Apple'));

  it('maps DummyJSON fields to store fields', () => {
    expect(apple).toMatchObject({ id: 16, name: 'Apple', category: 'groceries', aisle: 'fruits-veg', price: 1.99, stock: 8, rating: 4.2 });
  });

  it('derives MRP from the discount (price is the selling price)', () => {
    expect(apple.discount).toBe(13);
    expect(apple.mrp).toBeCloseTo(1.99 / (1 - 0.1262), 2);
    expect(apple.mrp).toBeGreaterThan(apple.price);
  });

  it('flags low stock and drops reviewer emails', () => {
    expect(apple.lowStock).toBe(true);
    expect(apple.reviews[0]).not.toHaveProperty('reviewerEmail');
  });

  it('handles missing or odd values safely', () => {
    const p = normalizeProduct({ id: 1, title: 'X', price: '2.5', discountPercentage: 0, stock: -3, thumbnail: 't.png' });
    expect(p).toMatchObject({ price: 2.5, mrp: 2.5, stock: 0, lowStock: false, images: ['t.png'], tags: [], brand: null });
  });
});

describe('fetchCatalog', () => {
  it('loads every store category in parallel and normalises the results', async () => {
    const fetchMock = mockDummyJson();
    const products = await fetchCatalog();
    expect(fetchMock).toHaveBeenCalledTimes(STORE_CATEGORIES.length);
    expect(products).toHaveLength(10);
    expect(products.every((p) => 'aisle' in p && 'mrp' in p)).toBe(true);
  });

  it('skips a failing category instead of failing the whole store', async () => {
    mockDummyJson({ fail: ['kitchen-accessories'] });
    const products = await fetchCatalog();
    expect(products.some((p) => p.category === 'kitchen-accessories')).toBe(false);
    expect(products.length).toBe(8);
  });

  it('throws a friendly error only when nothing loads', async () => {
    mockDummyJson({ fail: STORE_CATEGORIES });
    await expect(fetchCatalog()).rejects.toThrow('Could not reach the store.');
  });
});
