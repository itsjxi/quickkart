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

/** Home-page shelves: one row per aisle, best-rated in-stock items first. */
export function shelves(products, perShelf = 8) {
  return aislesWithCounts(products).map((aisle) => ({
    ...aisle,
    items: products
      .filter((p) => p.aisle === aisle.id)
      .sort((a, b) => (b.stock > 0) - (a.stock > 0) || b.rating - a.rating)
      .slice(0, perShelf),
  }));
}

/**
 * "You might also need": in-stock items not already in the cart, preferring
 * aisles the shopper is already buying from, then rating.
 */
export function suggestionsFor(cartIds, products, limit = 6) {
  const inCart = new Set(cartIds.map(Number));
  const cartAisles = new Set(products.filter((p) => inCart.has(p.id)).map((p) => p.aisle));
  return products
    .filter((p) => !inCart.has(p.id) && p.stock > 0)
    .sort((a, b) => (cartAisles.has(b.aisle) - cartAisles.has(a.aisle)) || b.rating - a.rating)
    .slice(0, limit);
}

/** Split text into [{ text, match }] parts for highlighting the search query. */
export function highlightParts(text, query) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [{ text, match: false }];
  const lower = normalize(text);
  const marks = new Array(text.length).fill(false);
  for (const word of words) {
    let i = lower.indexOf(word);
    while (i !== -1) {
      for (let j = i; j < i + word.length; j++) marks[j] = true;
      i = lower.indexOf(word, i + word.length);
    }
  }
  const parts = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.match === marks[i]) last.text += text[i];
    else parts.push({ text: text[i], match: marks[i] });
  }
  return parts;
}
