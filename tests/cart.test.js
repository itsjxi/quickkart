import { describe, it, expect } from 'vitest';
import { createCart, summarizeCart } from '../src/model/cart.js';
import { products, byName, memoryStorage } from './helpers.js';

const productsById = new Map(products.map((p) => [p.id, p]));
const apple = byName('Apple'); // $1.99, stock 8
const knife = byName('Knife'); // $14.99, stock 7

describe('cart', () => {
  it('adds, increments and removes items', () => {
    const cart = createCart({ storage: memoryStorage() });
    cart.increment(apple.id);
    cart.increment(apple.id);
    cart.decrement(apple.id);
    expect(cart.quantityOf(apple.id)).toBe(1);
    cart.decrement(apple.id);
    expect(cart.getState().quantities).toEqual({});
  });

  it('never exceeds available stock', () => {
    const cart = createCart({ storage: memoryStorage() });
    cart.syncWithCatalog(products);
    for (let i = 0; i < 20; i++) cart.increment(knife.id);
    expect(cart.quantityOf(knife.id)).toBe(7);
    expect(cart.isAtStockLimit(knife.id)).toBe(true);
  });

  it('persists to storage and restores, ignoring corrupt entries', () => {
    const storage = memoryStorage();
    const cart = createCart({ storage });
    cart.increment(apple.id);
    expect(JSON.parse(storage.getItem('quickkart:cart'))).toEqual({ [apple.id]: 1 });

    const restored = createCart({ storage: memoryStorage({ 'quickkart:cart': JSON.stringify({ 16: 2, 17: -1, 18: 'x' }) }) });
    expect(restored.getState().quantities).toEqual({ 16: 2 });
    expect(createCart({ storage: memoryStorage({ 'quickkart:cart': '{oops' }) }).getState().quantities).toEqual({});
  });

  it('drops items that disappeared and caps quantities when the catalog loads', () => {
    const cart = createCart({ storage: memoryStorage({ 'quickkart:cart': JSON.stringify({ [knife.id]: 50, 4242: 3 }) }) });
    cart.syncWithCatalog(products);
    expect(cart.getState().quantities).toEqual({ [knife.id]: 7 });
  });
});

describe('summarizeCart', () => {
  const pricing = { freeDeliveryThreshold: 20, deliveryFee: 2.49, handlingFee: 0.49 };

  it('is all zeros for an empty cart', () => {
    expect(summarizeCart({}, productsById, pricing)).toMatchObject({ itemCount: 0, total: 0, deliveryFee: 0, handlingFee: 0 });
  });

  it('charges delivery below the threshold and computes savings without float drift', () => {
    const s = summarizeCart({ [apple.id]: 3 }, productsById, pricing);
    expect(s.itemCount).toBe(3);
    expect(s.subtotal).toBe(5.97);
    expect(s.deliveryFee).toBe(2.49);
    expect(s.total).toBe(8.95);
    expect(s.savings).toBeCloseTo(s.mrpTotal - 5.97, 2);
    expect(s.amountToFreeDelivery).toBe(14.03);
  });

  it('makes delivery free at the threshold', () => {
    const s = summarizeCart({ [knife.id]: 2 }, productsById, pricing);
    expect(s.subtotal).toBe(29.98);
    expect(s.deliveryFee).toBe(0);
    expect(s.freeDeliveryProgress).toBe(1);
    expect(s.total).toBe(30.47);
  });

  it('ignores ids that are not in the catalog', () => {
    expect(summarizeCart({ 4242: 2 }, productsById, pricing).itemCount).toBe(0);
  });
});
