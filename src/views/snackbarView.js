import { html } from '../utils/dom.js';

const DURATION_MS = 5000;
let timer;

/** One snackbar at a time, with an optional action (e.g. Undo). */
export function showSnackbar(root, message, { actionLabel, action } = {}) {
  clearTimeout(timer);
  root.innerHTML = html`<div class="snackbar" role="status">
    <span>${message}</span>
    ${actionLabel ? html`<button class="snackbar-action" data-snackbar-action>${actionLabel}</button>` : ''}
  </div>`.value;
  root.hidden = false;
  root.querySelector('[data-snackbar-action]')?.addEventListener('click', () => {
    action?.();
    hideSnackbar(root);
  }, { once: true });
  timer = setTimeout(() => hideSnackbar(root), DURATION_MS);
}

export function hideSnackbar(root) {
  clearTimeout(timer);
  root.hidden = true;
  root.innerHTML = '';
}
