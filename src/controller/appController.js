import { fetchCatalog } from '../api/productsApi.js';
import { createStore } from '../model/createStore.js';
import { createCart, summarizeCart } from '../model/cart.js';
import { aislesWithCounts, visibleProducts } from '../model/catalog.js';
import { AISLES, OTHER_AISLE } from '../config.js';
import { debounce, preserveFocus } from '../utils/dom.js';
import { renderHeader, updateHeaderCart, updateThemeIcon } from '../views/headerView.js';
import { renderAisles } from '../views/aisleView.js';
import { renderToolbar, renderGrid, updateQuantityControls } from '../views/productGridView.js';
import { renderProductModal, closeProductModal } from '../views/productModalView.js';
import { renderCart, renderCartBar } from '../views/cartView.js';

const THEME_KEY = 'quickkart:theme';

function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Wires the model (catalog state + cart) to the views.
 * All user input arrives through delegated `data-action` / `data-control` attributes.
 */
export function createApp(root, { loadCatalog = fetchCatalog, storage = globalThis.localStorage } = {}) {
  const el = {
    header: root.querySelector('[data-region="header"]'),
    aisles: root.querySelector('[data-region="aisles"]'),
    toolbar: root.querySelector('[data-region="toolbar"]'),
    grid: root.querySelector('[data-region="grid"]'),
    modal: root.querySelector('[data-region="modal"]'),
    drawer: root.querySelector('[data-region="cart"]'),
    backdrop: root.querySelector('[data-region="cart-backdrop"]'),
    cartBar: root.querySelector('[data-region="cart-bar"]'),
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
  let lastFocus = null;
  let loadController = null;

  const announce = (message) => { el.announcer.textContent = message; };
  const summary = () => summarizeCart(cart.getState().quantities, state.getState().productsById);

  /* ---------- rendering ---------- */

  function renderCatalog() {
    const s = state.getState();
    const products = visibleProducts(s.products, s);
    const aisle = [...AISLES, OTHER_AISLE].find((a) => a.id === s.aisle);
    renderAisles(el.aisles, aislesWithCounts(s.products), s.aisle, s.products.length);
    renderToolbar(el.toolbar, {
      title: s.aisle === 'all' ? 'All products' : aisle?.label ?? 'Products',
      count: s.status === 'ready' ? products.length : 0,
      sort: s.sort, inStockOnly: s.inStockOnly, query: s.query.trim(),
    });
    renderGrid(el.grid, { status: s.status, products, cart, error: s.error, query: s.query.trim() });
  }

  function renderCartUi() {
    const s = state.getState();
    const sum = summary();
    updateHeaderCart(el.header, sum);
    renderCartBar(el.cartBar, sum);
    updateQuantityControls(el.grid, s.productsById, cart);
    if (!el.modal.hidden) updateQuantityControls(el.modal, s.productsById, cart);
    if (s.cartOpen) preserveFocus(el.drawer, () => renderCart(el.drawer, { summary: sum, cart, order: s.order }));
  }

  function applyTheme() {
    const { theme } = state.getState();
    document.documentElement.dataset.theme = theme;
    updateThemeIcon(el.header, theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }

  /* ---------- actions ---------- */

  async function load() {
    loadController?.abort();
    loadController = new AbortController();
    state.setState({ status: 'loading', error: null });
    try {
      const products = await loadCatalog({ signal: loadController.signal });
      // Store products first so cart totals can be priced, then cap the cart to current stock
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
    renderProductModal(el.modal, product, cart);
    document.body.classList.add('no-scroll');
  }

  function closeModal() {
    state.setState({ openProductId: null });
    closeProductModal(el.modal);
    document.body.classList.remove('no-scroll');
    lastFocus?.focus?.();
  }

  function openCart() {
    lastFocus = document.activeElement;
    state.setState({ cartOpen: true, order: null });
    renderCart(el.drawer, { summary: summary(), cart, order: null });
    el.drawer.hidden = false;
    el.backdrop.hidden = false;
    requestAnimationFrame(() => el.drawer.classList.add('open'));
    document.body.classList.add('no-scroll');
    el.drawer.querySelector('[data-action="close-cart"]')?.focus();
  }

  function closeCart() {
    state.setState({ cartOpen: false, order: null });
    el.drawer.classList.remove('open');
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

  function addToCart(id) {
    const product = state.getState().productsById.get(id);
    cart.increment(id);
    if (product) announce(`${product.name} added to cart.`);
  }

  const actions = {
    add: (id) => addToCart(id),
    increment: (id) => {
      if (cart.isAtStockLimit(id)) announce('No more in stock.');
      else cart.increment(id);
    },
    decrement: (id) => cart.decrement(id),
    'open-product': (id) => openProduct(id),
    'close-modal': () => closeModal(),
    'show-image': (_id, target) => {
      el.modal.querySelector('[data-main-image]').src = target.dataset.src;
      el.modal.querySelectorAll('.thumb').forEach((t) => t.classList.toggle('active', t === target));
    },
    'open-cart': () => openCart(),
    'close-cart': () => closeCart(),
    checkout: () => checkout(),
    'select-aisle': (_id, target) => state.setState({ aisle: target.dataset.aisle }),
    'reset-filters': () => {
      el.header.querySelector('#search-input').value = '';
      state.setState({ aisle: 'all', query: '', inStockOnly: false, sort: 'relevance' });
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

  const setQuery = debounce((query) => state.setState({ query }), 150);
  root.addEventListener('input', (e) => {
    if (e.target.id === 'search-input') setQuery(e.target.value);
  });
  root.addEventListener('submit', (e) => {
    if (e.target.matches('[data-form="search"]')) {
      e.preventDefault();
      state.setState({ query: e.target.elements.q.value });
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
    if (s.productsById !== prev.productsById) renderCartUi(); // prices now known for a restored cart
    if (s.theme !== prev.theme) applyTheme();
    if (s.order !== prev.order && s.cartOpen) renderCart(el.drawer, { summary: summary(), cart, order: s.order });
  });
  cart.subscribe(renderCartUi);

  /* ---------- start ---------- */

  renderHeader(el.header);
  applyTheme();
  renderCatalog();
  renderCartUi();
  const ready = load();

  return { state, cart, ready, reload: load };
}
