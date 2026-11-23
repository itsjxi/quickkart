import { html, formatPrice } from '../utils/dom.js';
import { DELIVERY_ETA_MINUTES } from '../config.js';

export function renderHeader(root) {
  root.innerHTML = html`
    <div class="container header-inner">
      <a class="logo" href="#" data-action="home" aria-label="QuickKart home">
        <span class="logo-mark" aria-hidden="true">⚡</span><span>Quick<b>Kart</b></span>
      </a>
      <div class="delivery-pill" aria-label="Delivery estimate">
        <strong>Delivery in ${DELIVERY_ETA_MINUTES} minutes</strong>
        <span>Home · 221B Baker Street</span>
      </div>
      <form class="search" role="search" data-form="search">
        <span class="search-icon" aria-hidden="true">🔍</span>
        <input id="search-input" type="search" name="q" placeholder="Search “milk”, “juice”, “knife”…"
          aria-label="Search products" autocomplete="off">
        <kbd aria-hidden="true">/</kbd>
      </form>
      <button class="icon-btn" data-action="toggle-theme" aria-label="Toggle dark mode">
        <span class="theme-icon" aria-hidden="true">🌙</span>
      </button>
      <button class="cart-btn" data-action="open-cart" aria-label="Open cart">
        <span aria-hidden="true">🛒</span>
        <span class="cart-btn-text" data-cart-summary>My Cart</span>
      </button>
    </div>`;
}

export function updateHeaderCart(root, summary) {
  const label = root.querySelector('[data-cart-summary]');
  const button = root.querySelector('.cart-btn');
  if (summary.itemCount === 0) {
    label.textContent = 'My Cart';
    button.classList.remove('has-items');
    button.setAttribute('aria-label', 'Open cart (empty)');
  } else {
    label.innerHTML = html`<b>${summary.itemCount} ${summary.itemCount === 1 ? 'item' : 'items'}</b>
      <span>${formatPrice(summary.subtotal)}</span>`.value;
    button.classList.add('has-items');
    button.setAttribute('aria-label', `Open cart, ${summary.itemCount} items, ${formatPrice(summary.subtotal)}`);
  }
}

export function updateThemeIcon(root, theme) {
  root.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
}
