import { PRICING } from '../config.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape a value for safe interpolation into HTML (API data is untrusted). */
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

/** Marker for HTML that is already safe (e.g. the output of another `html` call). */
class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

/** Mark a static, developer-authored string as safe HTML. Never pass API data here. */
export const trusted = (markup) => new SafeHtml(markup);

/**
 * Tagged template that escapes every interpolated value unless it is SafeHtml.
 * Arrays are joined, so `${items.map(i => html`...`)}` works.
 */
export function html(strings, ...values) {
  const render = (v) => {
    if (v instanceof SafeHtml) return v.value;
    if (Array.isArray(v)) return v.map(render).join('');
    if (v === false || v === null || v === undefined) return '';
    return escapeHtml(v);
  };
  return new SafeHtml(strings.reduce((out, str, i) => out + str + (i < values.length ? render(values[i]) : ''), ''));
}

const priceFormatter = new Intl.NumberFormat(PRICING.locale, { style: 'currency', currency: PRICING.currency });
export const formatPrice = (amount) => priceFormatter.format(amount);

/** Round to cents, avoiding floating-point drift in totals. */
export const roundMoney = (amount) => Math.round(amount * 100) / 100;

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Re-render a region without losing keyboard focus: if a [data-action][data-id]
 * control inside `root` had focus, focus its replacement afterwards.
 */
const cssEscape = (value) => (globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&'));

export function preserveFocus(root, render) {
  const active = document.activeElement;
  const inside = active && root.contains(active);
  const selector = inside && active.dataset.action
    ? `[data-action="${cssEscape(active.dataset.action)}"]${active.dataset.id ? `[data-id="${cssEscape(active.dataset.id)}"]` : ''}`
    : null;
  render();
  if (selector) (root.querySelector(selector) ?? root.querySelector('[data-action]'))?.focus();
}
