import { html } from '../utils/dom.js';

export function renderAisles(root, aisles, activeAisle, total) {
  const chip = (id, icon, label, count) => html`
    <button class="aisle ${activeAisle === id ? 'active' : ''}" data-action="select-aisle" data-aisle="${id}"
      aria-pressed="${activeAisle === id}">
      <span class="aisle-icon" aria-hidden="true">${icon}</span>
      <span class="aisle-label">${label}</span>
      <span class="aisle-count">${count}</span>
    </button>`;

  root.innerHTML = html`
    <div class="container aisles" role="toolbar" aria-label="Shop by aisle">
      ${chip('all', '🛒', 'All', total)}
      ${aisles.map((a) => chip(a.id, a.icon, a.label, a.count))}
    </div>`;
}
