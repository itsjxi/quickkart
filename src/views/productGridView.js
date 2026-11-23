import { html } from '../utils/dom.js';
import { icons } from '../utils/icons.js';
import { SORTS } from '../model/catalog.js';
import { productCard, quantityControl, skeletonCards } from './productCard.js';

const greeting = (hour = new Date().getHours()) =>
  hour < 5 ? 'Late-night run?' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

const cardOpts = (p, ctx) => ({
  qty: ctx.cart.quantityOf(p.id), atLimit: ctx.cart.isAtStockLimit(p.id), notified: ctx.notify.has(p.id), query: ctx.query,
});

/** Home: one shelf per aisle. */
function shelvesMarkup(rows, ctx) {
  return html`
    <div class="intro">
      <h1>${greeting()}</h1>
      <p>Everything below arrives in about 10 minutes.</p>
    </div>
    ${rows.map((row) => html`
      <section class="shelf" aria-labelledby="shelf-${row.id}">
        <header class="shelf-head">
          <h2 id="shelf-${row.id}">${row.label}</h2>
          <button class="see-all" data-action="select-aisle" data-aisle="${row.id}">
            See all <span>${row.count}</span> ${icons.arrow(14)}</button>
        </header>
        <div class="shelf-row">${row.items.map((p) => productCard(p, cardOpts(p, ctx)))}</div>
      </section>`)}`;
}

function toolbarMarkup({ title, count, sort, inStockOnly, query }) {
  return html`
    <div class="toolbar">
      <div>
        <h1 class="page-title">${query ? html`Results for “${query}”` : title}</h1>
        <p class="count" aria-live="polite">${count} ${count === 1 ? 'item' : 'items'}</p>
      </div>
      <div class="toolbar-controls">
        <label class="switch">
          <input type="checkbox" data-control="in-stock" ${inStockOnly ? 'checked' : ''}>
          <span class="switch-track" aria-hidden="true"></span>
          <span>In stock</span>
        </label>
        <label class="select">
          <span class="visually-hidden">Sort by</span>
          <select data-control="sort" aria-label="Sort products">
            ${Object.entries(SORTS).map(([value, { label }]) =>
              html`<option value="${value}" ${value === sort ? 'selected' : ''}>${label}</option>`)}
          </select>
        </label>
      </div>
    </div>`;
}

function emptyMarkup(query, aisles) {
  return html`
    <div class="empty">
      <h2>${query ? html`No results for “${query}”` : 'Nothing matches these filters'}</h2>
      <p>Check the spelling, or browse an aisle instead.</p>
      <div class="chips">
        ${aisles.slice(0, 5).map((a) => html`<button class="chip" data-action="select-aisle" data-aisle="${a.id}">${a.label}</button>`)}
      </div>
      <button class="btn btn-ghost" data-action="reset-filters">Clear search and filters</button>
    </div>`;
}

/**
 * Render the main content: skeleton, error, shelves (home) or toolbar + grid.
 * ctx: { status, error, mode: 'shelves'|'grid', rows, products, aisles, title, sort, inStockOnly, query, cart, notify }
 */
export function renderContent(root, ctx) {
  if (ctx.status === 'loading') {
    root.setAttribute('aria-busy', 'true');
    root.innerHTML = html`<div class="intro"><div class="sk w40 tall"></div></div>
      <div class="grid">${skeletonCards(10)}</div>`.value;
    return;
  }
  root.removeAttribute('aria-busy');

  if (ctx.status === 'error') {
    root.innerHTML = html`
      <div class="empty">
        <h2>We couldn’t load the store</h2>
        <p>${ctx.error} Check your connection and try again.</p>
        <button class="btn btn-primary" data-action="retry">Try again</button>
      </div>`.value;
    return;
  }

  if (ctx.mode === 'shelves') {
    root.innerHTML = shelvesMarkup(ctx.rows, ctx).value;
    return;
  }

  root.innerHTML = html`
    ${toolbarMarkup(ctx)}
    ${ctx.products.length
      ? html`<div class="grid">${ctx.products.map((p) => productCard(p, cardOpts(p, ctx)))}</div>`
      : emptyMarkup(ctx.query, ctx.aisles)}`.value;
}

/** Patch just the add/stepper controls when the cart changes (no full re-render, focus kept). */
export function updateQuantityControls(scope, productsById, cart, notify) {
  const active = document.activeElement;
  const focusedSlot = active?.closest?.('[data-qty-slot]');
  const focusedAction = active?.dataset?.action;

  scope.querySelectorAll('[data-qty-slot]').forEach((slot) => {
    const product = productsById.get(Number(slot.dataset.qtySlot));
    if (!product) return;
    const opts = {
      atLimit: cart.isAtStockLimit(product.id), notified: notify.has(product.id), size: slot.dataset.size || 'fab',
    };
    const qty = cart.quantityOf(product.id);
    const key = `${qty}|${opts.atLimit}|${opts.notified}`;
    if (slot.dataset.rendered === key) return;
    slot.dataset.rendered = key;
    slot.innerHTML = quantityControl(product, qty, opts).value;
    slot.closest('.card')?.classList.toggle('in-cart', qty > 0);

    if (slot === focusedSlot) {
      const target = slot.querySelector(`[data-action="${focusedAction}"]`)
        ?? slot.querySelector('[data-action="increment"], [data-action="add"], [data-action="notify"]');
      target?.focus();
    }
  });
}
