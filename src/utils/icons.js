/** Inline SVG icons (stroke-based, inherit currentColor). */
import { html, trusted } from './dom.js';

const svg = (path, size = 20) => html`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
  focusable="false">${path}</svg>`;

export const icons = {
  search: (s) => svg(trusted('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'), s),
  cart: (s) => svg(trusted('<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1"/><circle cx="17" cy="20.5" r="1"/>'), s),
  close: (s) => svg(trusted('<path d="M18 6 6 18M6 6l12 12"/>'), s),
  plus: (s) => svg(trusted('<path d="M12 5v14M5 12h14"/>'), s),
  minus: (s) => svg(trusted('<path d="M5 12h14"/>'), s),
  moon: (s) => svg(trusted('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'), s),
  sun: (s) => svg(trusted('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'), s),
  arrow: (s) => svg(trusted('<path d="M5 12h14M13 6l6 6-6 6"/>'), s),
  bolt: (s) => svg(trusted('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'), s),
  bell: (s) => svg(trusted('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'), s),
  check: (s) => svg(trusted('<path d="m5 12 5 5L20 7"/>'), s),
  star: (s = 12) => html`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z"/></svg>`,
};
