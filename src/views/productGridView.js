import { html } from '../utils/dom.js';
import { SORTS } from '../model/catalog.js';
import { productCard, quantityControl, skeletonCards } from './productCard.js';

export function renderToolbar(root, { title, count, sort, inStockOnly, query }) {
  root.innerHTML = html`
    <div class="toolbar">
      <div>
        <h1 class="section-title">${query ? html`Results for “${query}”` : title}</h1>
        <p class="result-count" aria-live="polite">${count} ${count === 1 ? 'product' : 'products'}</p>
      </div>
      <div class="toolbar-controls">
        <label class="toggle">
          <input type="checkbox" data-control="in-stock" ${inStockOnly ? 'checked' : ''}>
          <span>In stock only</span>
        </label>
        <label class="sort">
          <span class="visually-hidden">Sort by</span>
          <select data-control="sort" aria-label="Sort products">
            ${Object.entries(SORTS).map(([value, { label }]) =>
              html`<option value="${value}" ${value === sort ? 'selected' : ''}>${label}</option>`)}
          </select>
        </label>
      </div>
    </div>`;
}

export function renderGrid(root, { status, products, cart, error, query }) {
  if (status === 'loading') {
    root.innerHTML = skeletonCards().value;
    root.setAttribute('aria-busy', 'true');
    return;
  }
  root.removeAttribute('aria-busy');

  if (status === 'error') {
    root.innerHTML = html`
      <div class="state">
        <div class="state-emoji" aria-hidden="true">📡</div>
        <h2>We couldn’t load the store</h2>
        <p>${error}</p>
        <button class="btn-primary" data-action="retry">Try again</button>
      </div>`.value;
    return;
  }

  if (!products.length) {
    root.innerHTML = html`
      <div class="state">
        <div class="state-emoji" aria-hidden="true">🔎</div>
        <h2>${query ? html`Nothing matches “${query}”` : 'Nothing here yet'}</h2>
        <p>Try a different search or browse another aisle.</p>
        <button class="btn-secondary" data-action="reset-filters">Clear filters</button>
      </div>`.value;
    return;
  }

  root.innerHTML = html`${products.map((p) => productCard(p, cart.quantityOf(p.id), cart.isAtStockLimit(p.id)))}`.value;
}

/** Patch just the ADD/stepper controls when the cart changes (no full re-render). */
export function updateQuantityControls(scope, productsById, cart) {
  // Remember which control had focus so keyboard users don't lose their place
  const active = document.activeElement;
  const focusedSlot = active?.closest?.('[data-qty-slot]');
  const focusedAction = active?.dataset?.action;

  scope.querySelectorAll('[data-qty-slot]').forEach((slot) => {
    const product = productsById.get(Number(slot.dataset.qtySlot));
    if (!product) return;
    const qty = cart.quantityOf(product.id);
    const atLimit = cart.isAtStockLimit(product.id);
    const key = `${qty}|${atLimit}`;
    if (slot.dataset.rendered === key) return;
    slot.dataset.rendered = key;
    slot.innerHTML = quantityControl(product, qty, { atLimit, size: slot.dataset.size ?? '' }).value;

    if (slot === focusedSlot) {
      // ADD turns into a stepper (focus "+"); a stepper going to 0 turns back into ADD
      const target = slot.querySelector(`[data-action="${focusedAction}"]`)
        ?? slot.querySelector('[data-action="increment"], [data-action="add"]');
      target?.focus();
    }
  });
}
