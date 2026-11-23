import { html, formatPrice } from '../utils/dom.js';
import { icons } from '../utils/icons.js';
import { DELIVERY_ETA_MINUTES, PRICING } from '../config.js';
import { quantityControl } from './productCard.js';

const header = (title, sub) => html`
  <div class="drawer-head">
    <div><h2 id="cart-title">${title}</h2>${sub ? html`<p class="drawer-sub">${sub}</p>` : ''}</div>
    <button class="icon-btn" data-action="close-cart" aria-label="Close cart">${icons.close(18)}</button>
  </div>`;

const row = (label, value, { strike, note } = {}) => html`
  <div class="bill-row"><span>${label}${note ? html` <small>${note}</small>` : ''}</span>
    <span>${strike ? html`<s>${strike}</s> ` : ''}${value}</span></div>`;

/**
 * ctx: { summary, cart, notify, order, suggestions }
 */
export function renderCart(root, { summary, cart, notify, order, suggestions = [] }) {
  if (order) {
    root.innerHTML = html`
      ${header('Order placed')}
      <div class="order-done" role="status">
        <div class="order-check" aria-hidden="true">${icons.check(36)}</div>
        <h3>On its way</h3>
        <p class="order-eta">Arriving in about ${DELIVERY_ETA_MINUTES} minutes</p>
        <p class="muted">Order #${order.id} · ${order.itemCount} ${order.itemCount === 1 ? 'item' : 'items'} · ${formatPrice(order.total)}</p>
        <p class="fine">Demo store: no payment was taken and nothing will be delivered.</p>
        <button class="btn btn-primary btn-block" data-action="close-cart">Keep shopping</button>
      </div>`.value;
    return;
  }

  if (summary.itemCount === 0) {
    root.innerHTML = html`
      ${header('Cart')}
      <div class="empty cart-empty">
        <h3>Your cart is empty</h3>
        <p>Add a few essentials and they’ll be with you in ${DELIVERY_ETA_MINUTES} minutes.</p>
        <button class="btn btn-primary" data-action="close-cart">Start shopping</button>
      </div>`.value;
    return;
  }

  const pct = Math.round(summary.freeDeliveryProgress * 100);
  root.innerHTML = html`
    ${header('Cart', `${summary.itemCount} ${summary.itemCount === 1 ? 'item' : 'items'} · arriving in ${DELIVERY_ETA_MINUTES} min`)}
    <div class="drawer-body">
      <div class="nudge ${summary.amountToFreeDelivery > 0 ? '' : 'is-done'}">
        <p>${summary.amountToFreeDelivery > 0
          ? html`Add <b>${formatPrice(summary.amountToFreeDelivery)}</b> more for free delivery`
          : html`${icons.check(14)} Free delivery unlocked`}</p>
        <div class="meter" role="progressbar" aria-label="Progress to free delivery"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
      </div>

      <ul class="lines" aria-label="Items in cart">
        ${summary.lines.map(({ product, qty }) => html`
          <li class="line">
            <img src="${product.thumbnail}" alt="" width="56" height="56">
            <div class="line-info">
              <p class="line-name">${product.name}</p>
              <p class="line-price">${formatPrice(product.price * qty)}
                ${product.mrp > product.price ? html`<s>${formatPrice(product.mrp * qty)}</s>` : ''}</p>
            </div>
            <div class="line-qty" data-qty-slot="${product.id}" data-size="sm">
              ${quantityControl(product, qty, { atLimit: cart.isAtStockLimit(product.id), size: 'sm' })}
            </div>
          </li>`)}
      </ul>

      ${suggestions.length ? html`
        <section class="also" aria-labelledby="also-title">
          <h3 id="also-title">You might also need</h3>
          <div class="also-row">
            ${suggestions.map((p) => html`
              <div class="mini">
                <button class="mini-img" data-action="open-product" data-id="${p.id}" aria-label="View ${p.name}">
                  <img src="${p.thumbnail}" alt="" width="96" height="96"></button>
                <p class="mini-name">${p.name}</p>
                <div class="mini-foot">
                  <span>${formatPrice(p.price)}</span>
                  <span data-qty-slot="${p.id}" data-size="fab">${quantityControl(p, cart.quantityOf(p.id), { notified: notify.has(p.id) })}</span>
                </div>
              </div>`)}
          </div>
        </section>` : ''}

      <section class="bill" aria-labelledby="bill-title">
        <h3 id="bill-title">Bill details</h3>
        ${row('Items', formatPrice(summary.subtotal), { strike: summary.savings > 0 ? formatPrice(summary.mrpTotal) : null })}
        ${row('Delivery', summary.deliveryFee === 0 ? 'Free' : formatPrice(summary.deliveryFee),
          { note: summary.deliveryFee === 0 ? '' : `free over ${formatPrice(PRICING.freeDeliveryThreshold)}` })}
        ${row('Handling', formatPrice(summary.handlingFee))}
        <div class="bill-total">${row('To pay', formatPrice(summary.total))}</div>
        ${summary.savings > 0 ? html`<p class="saved">You’re saving ${formatPrice(summary.savings)} on this order</p>` : ''}
      </section>
    </div>
    <div class="drawer-foot">
      <button class="btn btn-primary btn-block btn-checkout" data-action="checkout">
        <span>Checkout</span><span>${formatPrice(summary.total)} ${icons.arrow(16)}</span>
      </button>
    </div>`.value;
}

/** Floating "View cart" bar on small screens. */
export function renderCartBar(root, summary) {
  if (summary.itemCount === 0) {
    root.hidden = true;
    root.innerHTML = '';
    return;
  }
  root.hidden = false;
  root.innerHTML = html`
    <button class="cart-bar" data-action="open-cart">
      <span><b>${summary.itemCount} ${summary.itemCount === 1 ? 'item' : 'items'}</b> · ${formatPrice(summary.subtotal)}</span>
      <span>View cart ${icons.arrow(16)}</span>
    </button>`.value;
}
