/**
 * Cart: quantities keyed by product id, capped by stock, persisted to localStorage.
 * Line items and totals are derived from the catalog so prices are never stale.
 */
import { createStore } from './createStore.js';
import { PRICING } from '../config.js';
import { roundMoney } from '../utils/dom.js';

const STORAGE_KEY = 'quickkart:cart';

function loadQuantities(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '{}');
    return Object.fromEntries(
      Object.entries(parsed).filter(([, qty]) => Number.isInteger(qty) && qty > 0),
    );
  } catch {
    return {};
  }
}

export function createCart({ storage = globalThis.localStorage } = {}) {
  const store = createStore({ quantities: loadQuantities(storage), stockById: {} });

  store.subscribe(({ quantities }, prev) => {
    if (quantities === prev.quantities) return;
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(quantities));
    } catch { /* storage full or unavailable */ }
  });

  const setQuantity = (id, qty) => store.setState((s) => {
    const max = s.stockById[id] ?? Infinity;
    const clamped = Math.max(0, Math.min(qty, max));
    if ((s.quantities[id] ?? 0) === clamped) return s;
    const quantities = { ...s.quantities };
    if (clamped === 0) delete quantities[id];
    else quantities[id] = clamped;
    return { ...s, quantities };
  });

  return {
    subscribe: store.subscribe,
    getState: store.getState,
    quantityOf: (id) => store.getState().quantities[id] ?? 0,

    /** Tell the cart about current stock; drops items that vanished or caps them. */
    syncWithCatalog(products) {
      const stockById = Object.fromEntries(products.map((p) => [p.id, p.stock]));
      store.setState((s) => {
        const quantities = {};
        for (const [id, qty] of Object.entries(s.quantities)) {
          const capped = Math.min(qty, stockById[id] ?? 0);
          if (capped > 0) quantities[id] = capped;
        }
        return { stockById, quantities };
      });
    },

    /** Set an exact quantity (used to undo a removal). */
    set: (id, qty) => setQuantity(id, qty),
    increment: (id) => setQuantity(id, (store.getState().quantities[id] ?? 0) + 1),
    decrement: (id) => setQuantity(id, (store.getState().quantities[id] ?? 0) - 1),
    remove: (id) => setQuantity(id, 0),
    clear: () => store.setState((s) => ({ ...s, quantities: {} })),
    isAtStockLimit: (id) => {
      const s = store.getState();
      return (s.quantities[id] ?? 0) >= (s.stockById[id] ?? Infinity);
    },
  };
}

/** Line items + bill for the current cart. Pure, so it's easy to test. */
export function summarizeCart(quantities, productsById, pricing = PRICING) {
  const lines = Object.entries(quantities)
    .map(([id, qty]) => ({ product: productsById.get(Number(id)), qty }))
    .filter((line) => line.product);

  const itemCount = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = roundMoney(lines.reduce((sum, l) => sum + l.product.price * l.qty, 0));
  const mrpTotal = roundMoney(lines.reduce((sum, l) => sum + l.product.mrp * l.qty, 0));
  const freeDelivery = subtotal >= pricing.freeDeliveryThreshold;
  const deliveryFee = itemCount === 0 || freeDelivery ? 0 : pricing.deliveryFee;
  const handlingFee = itemCount === 0 ? 0 : pricing.handlingFee;

  return {
    lines,
    itemCount,
    subtotal,
    mrpTotal,
    savings: roundMoney(mrpTotal - subtotal),
    deliveryFee,
    handlingFee,
    total: roundMoney(subtotal + deliveryFee + handlingFee),
    amountToFreeDelivery: freeDelivery ? 0 : roundMoney(pricing.freeDeliveryThreshold - subtotal),
    freeDeliveryProgress: Math.min(1, subtotal / pricing.freeDeliveryThreshold),
  };
}
