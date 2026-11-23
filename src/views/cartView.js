import { html, formatPrice } from '../utils/dom.js';
import { DELIVERY_ETA_MINUTES, PRICING } from '../config.js';
import { quantityControl } from './productCard.js';

function billRow(label, value, { strike = null, highlight = false } = {}) {
  return html`<div class="bill-row ${highlight ? 'highlight' : ''}"><span>${label}</span>
    <span>${strike ? html`<s>${strike}</s> ` : ''}${value}</span></div>`;
}

function renderLines(summary, cart) {
  return html`${summary.lines.map(({ product, qty }) => html`
    <li class="line">
      <img src="${product.thumbnail}" alt="" width="64" height="64">
      <div class="line-info">
        <p class="line-name">${product.name}</p>
        <p class="line-price">${formatPrice(product.price * qty)}
          ${product.mrp > product.price ? html`<s>${formatPrice(product.mrp * qty)}</s>` : ''}</p>
      </div>
      <div class="qty-slot" data-qty-slot="${product.id}" data-size="sm">
        ${quantityControl(product, qty, { atLimit: cart.isAtStockLimit(product.id), size: 'sm' })}
      </div>
    </li>`)}`;
}

export function renderCart(root, { summary, cart, order }) {
  if (order) {
    root.innerHTML = html`
      <div class="drawer-header"><h2 id="cart-title">Order placed</h2>
        <button class="icon-btn" data-action="close-cart" aria-label="Close">✕</button></div>
      <div class="order-success" role="status">
        <div class="success-mark" aria-hidden="true">✓</div>
        <h3>Your order is on its way!</h3>
        <p>Order <strong>#${order.id}</strong> · ${order.itemCount} items · ${formatPrice(order.total)}</p>
        <p class="eta-big">Arriving in ~${DELIVERY_ETA_MINUTES} minutes</p>
        <p class="demo-note">This is a demo store, so no payment was taken and nothing will be delivered.</p>
        <button class="btn-primary block" data-action="close-cart">Continue shopping</button>
      </div>`.value;
    return;
  }

  if (summary.itemCount === 0) {
    root.innerHTML = html`
      <div class="drawer-header"><h2 id="cart-title">My Cart</h2>
        <button class="icon-btn" data-action="close-cart" aria-label="Close">✕</button></div>
      <div class="state cart-empty">
        <div class="state-emoji" aria-hidden="true">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add a few essentials and we’ll deliver them in minutes.</p>
        <button class="btn-primary" data-action="close-cart">Start shopping</button>
      </div>`.value;
    return;
  }

  const progress = Math.round(summary.freeDeliveryProgress * 100);
  root.innerHTML = html`
    <div class="drawer-header">
      <div><h2 id="cart-title">My Cart</h2><p class="drawer-sub">⚡ Delivery in ${DELIVERY_ETA_MINUTES} minutes</p></div>
      <button class="icon-btn" data-action="close-cart" aria-label="Close">✕</button>
    </div>
    <div class="drawer-body">
      <div class="free-delivery">
        <p>${summary.amountToFreeDelivery > 0
          ? html`Add <strong>${formatPrice(summary.amountToFreeDelivery)}</strong> more for free delivery`
          : html`🎉 You’ve unlocked <strong>free delivery</strong>`}</p>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"
          aria-label="Progress to free delivery"><span style="width:${progress}%"></span></div>
      </div>
      <ul class="lines">${renderLines(summary, cart)}</ul>
      <section class="bill" aria-label="Bill details">
        <h3>Bill details</h3>
        ${billRow('Items total', formatPrice(summary.subtotal), { strike: summary.savings > 0 ? formatPrice(summary.mrpTotal) : null })}
        ${billRow('Delivery fee', summary.deliveryFee === 0 ? 'FREE' : formatPrice(summary.deliveryFee))}
        ${billRow('Handling fee', formatPrice(summary.handlingFee))}
        <div class="bill-total">${billRow('Grand total', formatPrice(summary.total))}</div>
        ${summary.savings > 0 ? html`<p class="savings">You save ${formatPrice(summary.savings)} on this order</p>` : ''}
        <p class="fine-print">Free delivery on orders over ${formatPrice(PRICING.freeDeliveryThreshold)}.</p>
      </section>
    </div>
    <div class="drawer-footer">
      <button class="btn-checkout" data-action="checkout">
        <span><strong>${formatPrice(summary.total)}</strong><small>TOTAL</small></span>
        <span>Place order ›</span>
      </button>
    </div>`.value;
}

/** Sticky "View cart" bar for small screens. */
export function renderCartBar(root, summary) {
  if (summary.itemCount === 0) {
    root.hidden = true;
    root.innerHTML = '';
    return;
  }
  root.hidden = false;
  root.innerHTML = html`
    <button class="cart-bar" data-action="open-cart">
      <span>🛒 <strong>${summary.itemCount} ${summary.itemCount === 1 ? 'item' : 'items'}</strong> · ${formatPrice(summary.subtotal)}</span>
      <span>View cart ›</span>
    </button>`.value;
}
