import { html, formatPrice } from '../utils/dom.js';
import { DELIVERY_ETA_MINUTES } from '../config.js';

/** ADD button or quantity stepper. Re-rendered on its own when the cart changes. */
export function quantityControl(product, qty, { atLimit = false, size = '' } = {}) {
  if (product.stock === 0) {
    return html`<button class="btn-add ${size}" disabled>Out of stock</button>`;
  }
  if (qty === 0) {
    return html`<button class="btn-add ${size}" data-action="add" data-id="${product.id}"
      aria-label="Add ${product.name} to cart">ADD</button>`;
  }
  return html`
    <div class="stepper ${size}" role="group" aria-label="Quantity of ${product.name}">
      <button data-action="decrement" data-id="${product.id}" aria-label="Remove one ${product.name}">−</button>
      <span aria-live="polite">${qty}</span>
      <button data-action="increment" data-id="${product.id}" aria-label="Add one more ${product.name}"
        ${atLimit ? html`disabled title="No more in stock"` : ''}>+</button>
    </div>`;
}

export function productCard(product, qty, atLimit) {
  return html`
    <article class="card ${product.stock === 0 ? 'is-soldout' : ''}" data-product-id="${product.id}">
      <button class="card-media" data-action="open-product" data-id="${product.id}" aria-label="View ${product.name}">
        <img src="${product.thumbnail}" alt="" loading="lazy" width="200" height="200">
        ${product.discount >= 1 ? html`<span class="badge-discount">${product.discount}% OFF</span>` : ''}
      </button>
      <div class="card-body">
        <span class="eta">⚡ ${DELIVERY_ETA_MINUTES} MINS</span>
        <h3 class="card-title">
          <button class="link" data-action="open-product" data-id="${product.id}">${product.name}</button>
        </h3>
        <p class="card-meta">
          ${product.brand ? html`<span>${product.brand}</span>` : ''}
          <span class="rating" aria-label="Rated ${product.rating} out of 5">★ ${product.rating}</span>
        </p>
        ${product.lowStock ? html`<p class="low-stock">Only ${product.stock} left</p>` : ''}
        <div class="card-footer">
          <div class="price">
            <strong>${formatPrice(product.price)}</strong>
            ${product.mrp > product.price ? html`<s aria-label="Was ${formatPrice(product.mrp)}">${formatPrice(product.mrp)}</s>` : ''}
          </div>
          <div class="qty-slot" data-qty-slot="${product.id}">${quantityControl(product, qty, { atLimit })}</div>
        </div>
      </div>
    </article>`;
}

export function skeletonCards(count = 10) {
  return html`${Array.from({ length: count }, () => html`
    <div class="card skeleton" aria-hidden="true">
      <div class="card-media"></div>
      <div class="card-body"><div class="sk-line"></div><div class="sk-line short"></div><div class="sk-line"></div></div>
    </div>`)}`;
}
