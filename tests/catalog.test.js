import { describe, it, expect } from 'vitest';
import { aisleFor, aislesWithCounts, searchProducts, visibleProducts } from '../src/model/catalog.js';
import { products, byName } from './helpers.js';

const names = (list) => list.map((p) => p.name);

describe('aisles', () => {
  it('sorts groceries into aisles by tag and other categories as a whole', () => {
    expect(aisleFor({ category: 'groceries', tags: ['dairy'] })).toBe('dairy');
    expect(aisleFor({ category: 'groceries', tags: ['pet supplies', 'cat food'] })).toBe('pets');
    expect(aisleFor({ category: 'kitchen-accessories', tags: ['utensils'] })).toBe('kitchen');
    expect(aisleFor({ category: 'beauty', tags: ['beauty'] })).toBe('beauty');
    expect(aisleFor({ category: 'groceries', tags: ['mystery'] })).toBe('other');
  });

  it('lists only aisles that have products, with counts, in configured order', () => {
    const aisles = aislesWithCounts(products);
    expect(aisles.map((a) => a.id)).toEqual(['fruits-veg', 'dairy', 'beverages', 'pets', 'household', 'kitchen', 'beauty']);
    expect(aisles.find((a) => a.id === 'dairy').count).toBe(2);
  });
});

describe('searchProducts', () => {
  it('returns everything for a blank query', () => {
    expect(searchProducts(products, '   ')).toBe(products);
  });

  it('matches name prefixes, brands and tags, case- and accent-insensitively', () => {
    expect(names(searchProducts(products, 'MILK'))).toEqual(['Milk']);
    expect(names(searchProducts(products, 'essence'))).toEqual(['Essence Mascara Lash Princess']);
    expect(names(searchProducts(products, 'dairy'))).toEqual(expect.arrayContaining(['Milk', 'Eggs']));
    expect(names(searchProducts(products, 'jüice'))).toEqual(['Juice']);
  });

  it('requires every word to match and ranks name matches first', () => {
    expect(names(searchProducts(products, 'green pepper'))).toEqual(['Green Chili Pepper']);
    expect(names(searchProducts(products, 'green banana'))).toEqual([]);
    const results = names(searchProducts(products, 'kitchen'));
    expect(results).toEqual(expect.arrayContaining(['Bamboo Spatula', 'Knife']));
  });
});

describe('visibleProducts', () => {
  it('combines aisle, search, stock and sort', () => {
    const list = visibleProducts(products, { aisle: 'dairy', sort: 'price-asc' });
    expect(names(list)).toEqual(['Eggs', 'Milk']);
    expect(names(visibleProducts(products, { sort: 'discount' }))[0]).toBe('Knife');
    expect(visibleProducts(products, { sort: 'price-desc' })[0]).toBe(byName('Knife'));
  });

  it('can hide out-of-stock products', () => {
    const soldOut = { ...byName('Milk'), id: 999, stock: 0 };
    expect(visibleProducts([...products, soldOut], { inStockOnly: true })).not.toContain(soldOut);
  });
});
