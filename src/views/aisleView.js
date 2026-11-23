import { html } from '../utils/dom.js';

export function renderAisles(root, aisles, activeAisle) {
  const tab = (id, label) => html`
    <button class="tab ${activeAisle === id ? 'is-active' : ''}" data-action="select-aisle" data-aisle="${id}"
      aria-current="${activeAisle === id ? 'page' : 'false'}">${label}</button>`;
  root.innerHTML = html`
    <div class="container tabs" role="navigation" aria-label="Aisles">
      ${tab('all', 'All')}
      ${aisles.map((a) => tab(a.id, a.label))}
    </div>`.value;
  root.querySelector('.is-active')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}
