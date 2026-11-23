import { html, formatPrice } from '../utils/dom.js';
import { AISLES, OTHER_AISLE, DELIVERY_ETA_MINUTES } from '../config.js';
import { quantityControl } from './productCard.js';

const aisleLabel = (id) => (AISLES.find((a) => a.id === id) ?? OTHER_AISLE).label;
const stars = (rating) => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

export function renderProductModal(root, product, cart) {
  const qty = cart.quantityOf(product.id);
  root.innerHTML = html`
    <div class="overlay" data-action="close-modal"></div>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button class="modal-close" data-action="close-modal" aria-label="Close">✕</button>
      <div class="modal-gallery">
        <div class="modal-image"><img src="${product.images[0]}" alt="${product.name}" data-main-image></div>
        ${product.images.length > 1 ? html`
          <div class="thumbs">
            ${product.images.map((src, i) => html`
              <button class="thumb ${i === 0 ? 'active' : ''}" data-action="show-image" data-src="${src}"
                aria-label="Image ${i + 1}"><img src="${src}" alt=""></button>`)}
          </div>` : ''}
      </div>
      <div class="modal-info">
        <p class="crumbs">${aisleLabel(product.aisle)}</p>
        <h2 id="modal-title">${product.name}</h2>
        ${product.brand ? html`<p class="brand">by ${product.brand}</p>` : ''}
        <p class="rating-line"><span class="stars" aria-hidden="true">${stars(product.rating)}</span>
          ${product.rating} · ${product.reviews.length} reviews</p>

        <div class="modal-price">
          <strong>${formatPrice(product.price)}</strong>
          ${product.mrp > product.price ? html`<s>MRP ${formatPrice(product.mrp)}</s>
            <span class="badge-discount inline">${product.discount}% OFF</span>` : ''}
        </div>
        <p class="tax-note">Inclusive of all taxes</p>

        <div class="modal-cta" data-qty-slot="${product.id}" data-size="lg" data-rendered="${qty}|${cart.isAtStockLimit(product.id)}">
          ${quantityControl(product, qty, { atLimit: cart.isAtStockLimit(product.id), size: 'lg' })}
        </div>
        ${product.lowStock ? html`<p class="low-stock">Hurry, only ${product.stock} left</p>` : ''}

        <ul class="perks">
          <li>⚡ Delivered in ${DELIVERY_ETA_MINUTES} minutes</li>
          ${product.returnPolicy ? html`<li>↩️ ${product.returnPolicy}</li>` : ''}
        </ul>

        <h3>About this item</h3>
        <p class="description">${product.description}</p>

        ${product.reviews.length ? html`
          <h3>Customer reviews</h3>
          <ul class="reviews">
            ${product.reviews.slice(0, 3).map((r) => html`
              <li><span class="stars small" aria-label="${r.rating} out of 5">${stars(r.rating)}</span>
                <strong>${r.reviewerName}</strong><p>${r.comment}</p></li>`)}
          </ul>` : ''}
      </div>
    </div>`.value;
  root.hidden = false;
  root.querySelector('.modal-close').focus();
}

export function closeProductModal(root) {
  root.hidden = true;
  root.innerHTML = '';
}
