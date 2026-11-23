/** Pure catalog logic: aisles, search, sorting. No DOM, no network. */
import { AISLES, OTHER_AISLE } from '../config.js';

export function aisleFor(product) {
  const tags = product.tags ?? [];
  const byTag = AISLES.find((a) => a.tags?.some((t) => tags.includes(t)));
  if (product.category === 'groceries' && byTag) return byTag.id;
  const byCategory = AISLES.find((a) => a.categories?.includes(product.category));
  return (byCategory ?? byTag ?? OTHER_AISLE).id;
}

/** Aisles that actually have products, with counts, in configured order. */
export function aislesWithCounts(products) {
  const counts = new Map();
  products.forEach((p) => counts.set(p.aisle, (counts.get(p.aisle) ?? 0) + 1));
  return [...AISLES, OTHER_AISLE]
    .filter((a) => counts.has(a.id))
    .map((a) => ({ ...a, count: counts.get(a.id) }));
}

const normalize = (text) => String(text ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/**
 * Rank products against a query. Every word must match somewhere;
 * name matches outrank brand/tag/category matches, and prefix matches score extra.
 */
export function searchProducts(products, query) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return products;

  return products
    .map((p) => {
      const name = normalize(p.name);
      const other = normalize([p.brand, p.category, ...p.tags].join(' '));
      let score = 0;
      for (const word of words) {
        if (name.split(/\W+/).some((w) => w.startsWith(word))) score += 3;
        else if (name.includes(word)) score += 2;
        else if (other.includes(word)) score += 1;
        else return null; // every word must match
      }
      return { p, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p);
}

export const SORTS = {
  relevance: { label: 'Relevance', compare: null },
  'price-asc': { label: 'Price: low to high', compare: (a, b) => a.price - b.price },
  'price-desc': { label: 'Price: high to low', compare: (a, b) => b.price - a.price },
  discount: { label: 'Biggest discount', compare: (a, b) => b.discount - a.discount },
  rating: { label: 'Top rated', compare: (a, b) => b.rating - a.rating },
};

/** Everything the product grid needs, derived from state. */
export function visibleProducts(products, { aisle = 'all', query = '', sort = 'relevance', inStockOnly = false } = {}) {
  let list = aisle === 'all' ? products : products.filter((p) => p.aisle === aisle);
  if (inStockOnly) list = list.filter((p) => p.stock > 0);
  list = searchProducts(list, query);
  const compare = SORTS[sort]?.compare;
  return compare ? [...list].sort(compare) : list;
}
