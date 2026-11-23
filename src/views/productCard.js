import { html, formatPrice } from '../utils/dom.js';
import { icons } from '../utils/icons.js';
import { highlightParts } from '../model/catalog.js';

/**
 * The add / quantity / notify control for a product. Sizes:
 *  - 'fab' (card): round + that becomes a compact stepper on the image
 *  - 'lg'  (product sheet): full-width "Add to cart · $x" / big stepper
 *  - 'sm'  (cart line): stepper only
 */
export function quantityControl(product, qty, { atLimit = false, notified = false, size = 'fab' } = {}) {
  if (product.stock === 0) {
    return notified
      ? html`<button class="notify is-on" data-action="notify" data-id="${product.id}" aria-pressed="true">
          ${icons.check(16)}<span>We’ll notify you</span></button>`
      : html`<button class="notify" data-action="notify" data-id="${product.id}" aria-pressed="false">
          ${icons.bell(16)}<span>Notify me</span></button>`;
  }

  if (qty === 0) {
    if (size === 'lg') {
      return html`<button class="btn btn-primary btn-block" data-action="add" data-id="${product.id}">
        Add to cart · ${formatPrice(product.price)}</button>`;
    }
    return html`<button class="fab" data-action="add" data-id="${product.id}" aria-label="Add ${product.name} to cart">
      ${icons.plus(18)}</button>`;
  }

  return html`
    <div class="stepper stepper-${size}" role="group" aria-label="${product.name} quantity">
      <button data-action="decrement" data-id="${product.id}" aria-label="Remove one ${product.name}">${icons.minus(16)}</button>
      <output aria-live="polite">${qty}</output>
      <button data-action="increment" data-id="${product.id}" aria-label="Add one more ${product.name}"
        ${atLimit ? html`aria-disabled="true" class="is-max"` : ''}>${icons.plus(16)}</button>
    </div>
    ${atLimit ? html`<span class="limit-hint" role="status">Only ${product.stock} available</span>` : ''}`;
}

export const highlighted = (text, query) =>
  html`${highlightParts(text, query).map((p) => (p.match ? html`<mark>${p.text}</mark>` : p.text))}`;

export function priceLine(product) {
  return html`<p class="price-line">
    <strong>${formatPrice(product.price)}</strong>
    ${product.mrp > product.price ? html`<s>${formatPrice(product.mrp)}</s>` : ''}
    ${product.discount >= 5 ? html`<span class="off">${product.discount}% off</span>` : ''}
  </p>`;
}

export function productCard(product, { qty = 0, atLimit = false, notified = false, query = '' } = {}) {
  const soldOut = product.stock === 0;
  return html`
    <article class="card ${soldOut ? 'is-soldout' : ''}" data-product-id="${product.id}">
      <div class="tile">
        <button class="tile-link" data-action="open-product" data-id="${product.id}" aria-label="View ${product.name}">
          <img src="${product.thumbnail}" alt="" loading="lazy" width="240" height="240">
        </button>
        ${soldOut ? html`<span class="tile-flag">Sold out</span>` : ''}
        <div class="tile-action" data-qty-slot="${product.id}" data-size="fab">
          ${quantityControl(product, qty, { atLimit, notified })}
        </div>
      </div>
      <div class="card-info">
        ${priceLine(product)}
        <h3 class="card-name">
          <button class="link" data-action="open-product" data-id="${product.id}">${highlighted(product.name, query)}</button>
        </h3>
        <p class="card-meta">
          <span class="rating">${icons.star(11)} ${product.rating.toFixed(1)}</span>
          ${product.lowStock ? html`<span class="dot">·</span><span class="few-left">Only ${product.stock} left</span>` : ''}
          ${!product.lowStock && product.brand ? html`<span class="dot">·</span><span>${product.brand}</span>` : ''}
        </p>
      </div>
    </article>`;
}

export function skeletonCards(count = 10) {
  return html`${Array.from({ length: count }, () => html`
    <div class="card is-skeleton" aria-hidden="true">
      <div class="tile"></div>
      <div class="card-info"><div class="sk w40"></div><div class="sk"></div><div class="sk w60"></div></div>
    </div>`)}`;
}
