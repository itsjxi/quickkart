import { fetchCatalog } from '../api/productsApi.js';
import { createStore } from '../model/createStore.js';
import { createCart, summarizeCart } from '../model/cart.js';
import { createNotifyList } from '../model/notifyList.js';
import { aislesWithCounts, visibleProducts, shelves, suggestionsFor } from '../model/catalog.js';
import { AISLES, OTHER_AISLE } from '../config.js';
import { debounce, preserveFocus } from '../utils/dom.js';
import { renderHeader, updateHeaderCart, updateThemeToggle, updateSearchClear } from '../views/headerView.js';
import { renderAisles } from '../views/aisleView.js';
import { renderContent, updateQuantityControls } from '../views/productGridView.js';
import { renderProductModal, closeProductModal } from '../views/productModalView.js';
import { renderCart, renderCartBar } from '../views/cartView.js';
import { showSnackbar } from '../views/snackbarView.js';

const THEME_KEY = 'quickkart:theme';

function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Wires the model (catalog state, cart, notify list) to the views.
 * All input arrives through delegated `data-action` / `data-control` attributes.
 */
export function createApp(root, { loadCatalog = fetchCatalog, storage = globalThis.localStorage } = {}) {
  const el = {
    header: root.querySelector('[data-region="header"]'),
    aisles: root.querySelector('[data-region="aisles"]'),
    content: root.querySelector('[data-region="content"]'),
    modal: root.querySelector('[data-region="modal"]'),
    drawer: root.querySelector('[data-region="cart"]'),
    backdrop: root.querySelector('[data-region="cart-backdrop"]'),
    cartBar: root.querySelector('[data-region="cart-bar"]'),
    snackbar: root.querySelector('[data-region="snackbar"]'),
    announcer: root.querySelector('[data-region="announcer"]'),
  };

  const state = createStore({
    status: 'loading', // loading | ready | error
    error: null,
    products: [],
    productsById: new Map(),
    aisle: 'all',
    query: '',
    sort: 'relevance',
    inStockOnly: false,
    theme: readTheme(),
    openProductId: null,
    cartOpen: false,
    order: null,
  });
  const cart = createCart({ storage });
  const notify = createNotifyList({ storage });
  let lastFocus = null;
  let loadController = null;

  const announce = (message) => { el.announcer.textContent = message; };
  const summary = () => summarizeCart(cart.getState().quantities, state.getState().productsById);
  const productName = (id) => state.getState().productsById.get(id)?.name ?? 'Item';

  /* ---------- rendering ---------- */

  function renderCatalog() {
    const s = state.getState();
    const query = s.query.trim();
    const aisles = aislesWithCounts(s.products);
    const mode = s.aisle === 'all' && !query ? 'shelves' : 'grid';
    const aisle = [...AISLES, OTHER_AISLE].find((a) => a.id === s.aisle);

    renderAisles(el.aisles, aisles, s.aisle);
    renderContent(el.content, {
      status: s.status, error: s.error, mode, query, aisles,
      rows: mode === 'shelves' ? shelves(s.products) : [],
      products: mode === 'grid' ? visibleProducts(s.products, { ...s, query }) : [],
      title: s.aisle === 'all' ? 'All items' : aisle?.label ?? 'Items',
      sort: s.sort, inStockOnly: s.inStockOnly, cart, notify,
    });
  }

  function renderDrawer() {
    const s = state.getState();
    const sum = summary();
    const suggestions = sum.itemCount ? suggestionsFor(Object.keys(cart.getState().quantities), s.products, 6) : [];
    preserveFocus(el.drawer, () => renderCart(el.drawer, { summary: sum, cart, notify, order: s.order, suggestions }));
  }

  function renderCartUi() {
    const s = state.getState();
    const sum = summary();
    updateHeaderCart(el.header, sum);
    renderCartBar(el.cartBar, sum);
    updateQuantityControls(el.content, s.productsById, cart, notify);
    if (!el.modal.hidden) updateQuantityControls(el.modal, s.productsById, cart, notify);
    if (s.cartOpen) renderDrawer();
  }

  function applyTheme() {
    const { theme } = state.getState();
    document.documentElement.dataset.theme = theme;
    updateThemeToggle(el.header, theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }

  /* ---------- actions ---------- */

  async function load() {
    loadController?.abort();
    loadController = new AbortController();
    state.setState({ status: 'loading', error: null });
    try {
      const products = await loadCatalog({ signal: loadController.signal });
      // Store products first so the cart can be priced, then cap the cart to current stock
      state.setState({ status: 'ready', products, productsById: new Map(products.map((p) => [p.id, p])) });
      cart.syncWithCatalog(products);
    } catch (err) {
      if (err.name === 'AbortError') return;
      state.setState({ status: 'error', error: err.message || 'Something went wrong.' });
    }
  }

  function openProduct(id) {
    const product = state.getState().productsById.get(id);
    if (!product) return;
    lastFocus = document.activeElement;
    state.setState({ openProductId: id });
    renderProductModal(el.modal, product, { cart, notify });
    document.body.classList.add('no-scroll');
  }

  function closeModal() {
    state.setState({ openProductId: null });
    closeProductModal(el.modal);
    if (!state.getState().cartOpen) document.body.classList.remove('no-scroll');
    lastFocus?.focus?.();
  }

  function openCart() {
    lastFocus = document.activeElement;
    state.setState({ cartOpen: true, order: null });
    renderDrawer();
    el.drawer.hidden = false;
    el.backdrop.hidden = false;
    requestAnimationFrame(() => el.drawer.classList.add('is-open'));
    document.body.classList.add('no-scroll');
    el.drawer.querySelector('[data-action="close-cart"]')?.focus();
  }

  function closeCart() {
    state.setState({ cartOpen: false, order: null });
    el.drawer.classList.remove('is-open');
    el.drawer.hidden = true;
    el.backdrop.hidden = true;
    document.body.classList.remove('no-scroll');
    lastFocus?.focus?.();
  }

  function checkout() {
    const sum = summary();
    if (!sum.itemCount) return;
    const order = { id: String(Date.now()).slice(-6), itemCount: sum.itemCount, total: sum.total };
    state.setState({ order });
    cart.clear();
    announce(`Order #${order.id} placed.`);
  }

  /** Removing the last unit of an item is reversible for a few seconds. */
  function decrement(id) {
    const before = cart.quantityOf(id);
    cart.decrement(id);
    if (before === 1) {
      showSnackbar(el.snackbar, `Removed ${productName(id)}`, {
        actionLabel: 'Undo',
        action: () => { cart.set(id, 1); announce(`${productName(id)} is back in your cart.`); },
      });
    }
  }

  function toggleNotify(id) {
    const on = notify.toggle(id);
    updateQuantityControls(el.content, state.getState().productsById, cart, notify);
    if (!el.modal.hidden) updateQuantityControls(el.modal, state.getState().productsById, cart, notify);
    showSnackbar(el.snackbar, on
      ? `We’ll let you know when ${productName(id)} is back`
      : `Stopped alerts for ${productName(id)}`);
  }

  function setSearch(value, { immediate = false } = {}) {
    const input = el.header.querySelector('#search-input');
    if (input.value !== value) input.value = value;
    updateSearchClear(el.header, value);
    if (immediate) state.setState({ query: value });
    else debouncedQuery(value);
  }
  const debouncedQuery = debounce((query) => state.setState({ query }), 150);

  const actions = {
    add: (id) => { cart.increment(id); announce(`${productName(id)} added to cart.`); },
    increment: (id) => {
      if (cart.isAtStockLimit(id)) announce(`Only ${state.getState().productsById.get(id)?.stock} available.`);
      else cart.increment(id);
    },
    decrement: (id) => decrement(id),
    notify: (id) => toggleNotify(id),
    'open-product': (id) => openProduct(id),
    'close-modal': () => closeModal(),
    'show-image': (_id, target) => {
      el.modal.querySelector('[data-main-image]').src = target.dataset.src;
      el.modal.querySelectorAll('.thumb').forEach((t) => t.classList.toggle('is-active', t === target));
    },
    'open-cart': () => openCart(),
    'close-cart': () => closeCart(),
    checkout: () => checkout(),
    'select-aisle': (_id, target) => {
      setSearch('', { immediate: true });
      state.setState({ aisle: target.dataset.aisle });
      el.content.scrollIntoView?.({ block: 'start' });
    },
    'clear-search': () => { setSearch('', { immediate: true }); el.header.querySelector('#search-input').focus(); },
    'reset-filters': () => {
      setSearch('', { immediate: true });
      state.setState({ aisle: 'all', inStockOnly: false, sort: 'relevance' });
    },
    'toggle-theme': () => state.setState((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' })),
    retry: () => load(),
    home: () => actions['reset-filters'](),
  };

  /* ---------- events ---------- */

  root.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target || !root.contains(target) || target.disabled) return;
    const action = actions[target.dataset.action];
    if (!action) return;
    e.preventDefault();
    action(target.dataset.id ? Number(target.dataset.id) : undefined, target);
  });

  root.addEventListener('input', (e) => {
    if (e.target.id === 'search-input') setSearch(e.target.value);
  });
  root.addEventListener('submit', (e) => {
    if (e.target.matches('[data-form="search"]')) {
      e.preventDefault();
      setSearch(e.target.elements.q.value, { immediate: true });
    }
  });
  root.addEventListener('change', (e) => {
    const control = e.target.dataset.control;
    if (control === 'sort') state.setState({ sort: e.target.value });
    if (control === 'in-stock') state.setState({ inStockOnly: e.target.checked });
  });

  document.addEventListener('keydown', (e) => {
    const s = state.getState();
    if (e.key === 'Escape') {
      if (s.openProductId !== null) closeModal();
      else if (s.cartOpen) closeCart();
      else if (document.activeElement?.id === 'search-input' && s.query) setSearch('', { immediate: true });
    }
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (e.key === '/' && !typing) {
      e.preventDefault();
      el.header.querySelector('#search-input').focus();
    }
  });

  /* ---------- subscriptions ---------- */

  const CATALOG_KEYS = ['status', 'products', 'aisle', 'query', 'sort', 'inStockOnly', 'error'];
  state.subscribe((s, prev) => {
    if (CATALOG_KEYS.some((k) => s[k] !== prev[k])) renderCatalog();
    if (s.productsById !== prev.productsById) renderCartUi(); // a restored cart can now be priced
    if (s.theme !== prev.theme) applyTheme();
    if (s.order !== prev.order && s.cartOpen) renderDrawer();
  });
  cart.subscribe(renderCartUi);

  /* ---------- start ---------- */

  renderHeader(el.header);
  applyTheme();
  renderCatalog();
  renderCartUi();
  const ready = load();

  return { state, cart, notify, ready, reload: load };
}
