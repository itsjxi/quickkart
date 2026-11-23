import { html } from '../utils/dom.js';
import { icons } from '../utils/icons.js';
import { AISLES, OTHER_AISLE, DELIVERY_ETA_MINUTES } from '../config.js';
import { quantityControl, priceLine } from './productCard.js';

const aisleLabel = (id) => (AISLES.find((a) => a.id === id) ?? OTHER_AISLE).label;

export function renderProductModal(root, product, { cart, notify }) {
  const qty = cart.quantityOf(product.id);
  const opts = { atLimit: cart.isAtStockLimit(product.id), notified: notify.has(product.id), size: 'lg' };
  root.innerHTML = html`
    <div class="scrim" data-action="close-modal"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button class="icon-btn sheet-close" data-action="close-modal" aria-label="Close">${icons.close(18)}</button>
      <div class="sheet-media">
        <div class="sheet-image"><img src="${product.images[0]}" alt="${product.name}" data-main-image></div>
        ${product.images.length > 1 ? html`
          <div class="thumbs">${product.images.map((src, i) => html`
            <button class="thumb ${i === 0 ? 'is-active' : ''}" data-action="show-image" data-src="${src}"
              aria-label="Show image ${i + 1}"><img src="${src}" alt=""></button>`)}
          </div>` : ''}
      </div>
      <div class="sheet-info">
        <p class="eyebrow">${aisleLabel(product.aisle)}${product.brand ? html` · ${product.brand}` : ''}</p>
        <h2 id="sheet-title">${product.name}</h2>
        <p class="sheet-rating">${icons.star(13)} ${product.rating.toFixed(1)}
          <span class="muted">(${product.reviews.length} reviews)</span></p>
        ${priceLine(product)}
        <div class="sheet-cta" data-qty-slot="${product.id}" data-size="lg">${quantityControl(product, qty, opts)}</div>
        <ul class="facts">
          <li>${icons.bolt(14)} Arrives in about ${DELIVERY_ETA_MINUTES} minutes</li>
          ${product.lowStock ? html`<li class="few-left">Only ${product.stock} left in stock</li>` : ''}
          ${product.returnPolicy ? html`<li>${product.returnPolicy}</li>` : ''}
        </ul>
        <h3>About</h3>
        <p class="muted">${product.description}</p>
        ${product.reviews.length ? html`
          <h3>Reviews</h3>
          <ul class="reviews">${product.reviews.slice(0, 3).map((r) => html`
            <li><p><span class="rating">${icons.star(11)} ${r.rating}</span> <b>${r.reviewerName}</b></p>
              <p class="muted">${r.comment}</p></li>`)}</ul>` : ''}
      </div>
    </div>`.value;
  root.hidden = false;
  root.querySelector('.sheet-close').focus();
}

export function closeProductModal(root) {
  root.hidden = true;
  root.innerHTML = '';
}
