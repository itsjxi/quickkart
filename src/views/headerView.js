import { html, formatPrice } from '../utils/dom.js';
import { icons } from '../utils/icons.js';
import { DELIVERY_ETA_MINUTES } from '../config.js';

export function renderHeader(root) {
  root.innerHTML = html`
    <div class="container header-inner">
      <a class="wordmark" href="#" data-action="home" aria-label="QuickKart home">quickkart<span aria-hidden="true">.</span></a>
      <div class="eta-block">
        <span class="eta-time">${icons.bolt(14)} ${DELIVERY_ETA_MINUTES} min delivery</span>
        <span class="eta-addr">to Home, 221B Baker Street</span>
      </div>
      <form class="search" role="search" data-form="search">
        ${icons.search(18)}
        <input id="search-input" type="search" name="q" placeholder="Search for milk, eggs, a knife…"
          aria-label="Search products" autocomplete="off" enterkeyhint="search">
        <button type="button" class="search-clear" data-action="clear-search" aria-label="Clear search" hidden>${icons.close(16)}</button>
        <kbd aria-hidden="true">/</kbd>
      </form>
      <button class="icon-btn" data-action="toggle-theme" data-theme-toggle aria-label="Switch to dark mode">${icons.moon(18)}</button>
      <button class="cart-btn" data-action="open-cart" aria-label="Open cart">
        ${icons.cart(18)}<span data-cart-summary>Cart</span>
      </button>
    </div>`.value;
}

export function updateHeaderCart(root, summary) {
  const label = root.querySelector('[data-cart-summary]');
  const button = root.querySelector('.cart-btn');
  const empty = summary.itemCount === 0;
  button.classList.toggle('has-items', !empty);
  label.innerHTML = (empty
    ? html`Cart`
    : html`<b>${summary.itemCount}</b><span class="sep"></span>${formatPrice(summary.subtotal)}`).value;
  button.setAttribute('aria-label', empty
    ? 'Open cart (empty)'
    : `Open cart, ${summary.itemCount} ${summary.itemCount === 1 ? 'item' : 'items'}, ${formatPrice(summary.subtotal)}`);
}

export function updateThemeToggle(root, theme) {
  const btn = root.querySelector('[data-theme-toggle]');
  btn.innerHTML = (theme === 'dark' ? icons.sun(18) : icons.moon(18)).value;
  btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

export function updateSearchClear(root, value) {
  root.querySelector('.search-clear').hidden = !value;
}
