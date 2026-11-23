import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from '../src/controller/appController.js';
import { products, byName, memoryStorage } from './helpers.js';

const shell = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8').match(/<body>([\s\S]*)<\/body>/)[1]
  .replace(/<script[\s\S]*?<\/script>/, '');

const $ = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const nameOf = (c) => c.querySelector('.card-name').textContent.trim();
const card = (name) => $$('.card').find((c) => nameOf(c) === name);
const qtyOf = (scope) => scope.querySelector('.stepper output')?.textContent;
const search = (value) => {
  const input = $('#search-input');
  input.value = value;
  input.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); // submit skips the debounce
};

async function start({ loadCatalog = async () => products, storage = memoryStorage() } = {}) {
  document.body.innerHTML = shell;
  const app = createApp(document.getElementById('app'), { loadCatalog, storage });
  await app.ready;
  return app;
}

beforeEach(() => {
  window.matchMedia = vi.fn(() => ({ matches: false }));
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

describe('QuickKart app', () => {
  it('shows skeletons while loading, then one shelf per aisle', async () => {
    let resolveLoad;
    document.body.innerHTML = shell;
    const app = createApp(document.getElementById('app'), {
      loadCatalog: () => new Promise((r) => { resolveLoad = r; }), storage: memoryStorage(),
    });
    expect($$('.is-skeleton').length).toBeGreaterThan(0);
    expect($('[data-region="content"]').getAttribute('aria-busy')).toBe('true');
    resolveLoad(products);
    await app.ready;
    expect($$('.card')).toHaveLength(10);
    expect($$('.shelf h2').map((h) => h.textContent)).toContain('Dairy & Eggs');
    expect($$('.tab').map((t) => t.textContent.trim())).toContain('Dairy & Eggs');
  });

  it('switches from shelves to a filterable grid via "See all"', async () => {
    await start();
    click($('.shelf [data-aisle="dairy"]'));
    expect($('.shelf')).toBeNull();
    expect($('.page-title').textContent).toBe('Dairy & Eggs');
    expect($$('.grid .card').map(nameOf).sort()).toEqual(['Eggs', 'Milk']);
    expect($('.tab.is-active').dataset.aisle).toBe('dairy');
  });

  it('turns + into a stepper and keeps the header cart in sync', async () => {
    await start();
    click(card('Milk').querySelector('[data-action="add"]'));
    click(card('Milk').querySelector('[data-action="increment"]'));
    expect(qtyOf(card('Milk'))).toBe('2');
    expect(card('Milk').classList.contains('in-cart')).toBe(true);
    expect($('[data-cart-summary]').textContent).toBe('2$6.98');
    expect($('.cart-btn').getAttribute('aria-label')).toBe('Open cart, 2 items, $6.98');
    expect($('[data-region="announcer"]').textContent).toBe('Milk added to cart.');
  });

  it('explains the stock limit instead of silently disabling +', async () => {
    await start();
    const chili = byName('Green Chili Pepper'); // stock 3
    click(card(chili.name).querySelector('[data-action="add"]'));
    for (let i = 0; i < 5; i++) click(card(chili.name).querySelector('[data-action="increment"]'));
    expect(qtyOf(card(chili.name))).toBe('3');
    const plus = card(chili.name).querySelector('[data-action="increment"]');
    expect(plus.getAttribute('aria-disabled')).toBe('true');
    expect(card(chili.name).querySelector('.limit-hint').textContent).toBe('Only 3 available');
    expect($('[data-region="announcer"]').textContent).toBe('Only 3 available.');
  });

  it('removing the last unit can be undone from the snackbar', async () => {
    await start();
    click(card('Milk').querySelector('[data-action="add"]'));
    click(card('Milk').querySelector('[data-action="decrement"]'));
    expect(card('Milk').querySelector('[data-action="add"]')).not.toBeNull();
    const snackbar = $('[data-region="snackbar"]');
    expect(snackbar.hidden).toBe(false);
    expect(snackbar.textContent).toContain('Removed Milk');
    click($('[data-snackbar-action]'));
    expect(qtyOf(card('Milk'))).toBe('1');
    expect(snackbar.hidden).toBe(true);
  });

  it('offers "Notify me" for sold-out items and remembers it', async () => {
    const storage = memoryStorage();
    const soldOut = { ...byName('Juice'), stock: 0, lowStock: false };
    await start({ storage, loadCatalog: async () => products.map((p) => (p.id === soldOut.id ? soldOut : p)) });
    const juice = card('Juice');
    expect(juice.classList.contains('is-soldout')).toBe(true);
    expect($('.tile-flag', juice).textContent).toBe('Sold out');
    expect($('[data-action="add"]', juice)).toBeNull();
    click($('[data-action="notify"]', juice));
    expect($('[data-action="notify"]', card('Juice')).getAttribute('aria-pressed')).toBe('true');
    expect($('[data-region="snackbar"]').textContent).toContain('let you know when Juice is back');
    expect(JSON.parse(storage.getItem('quickkart:notify'))).toEqual([soldOut.id]);
  });

  it('highlights search matches and suggests aisles when nothing matches', async () => {
    await start();
    search('mil');
    expect($('.page-title').textContent).toBe('Results for “mil”');
    expect($('.card-name mark').textContent.toLowerCase()).toBe('mil');
    expect($('.search-clear').hidden).toBe(false);

    search('xyz');
    expect($('.empty h2').textContent).toBe('No results for “xyz”');
    expect($$('.empty .chip').length).toBeGreaterThan(0);
    click($('[data-action="reset-filters"]'));
    expect($$('.shelf').length).toBeGreaterThan(0);
    expect($('#search-input').value).toBe('');
  });

  it('sorts the grid by price', async () => {
    await start();
    click($('.tab[data-aisle="all"]'));
    search('e'); // grid mode
    const select = $('[data-control="sort"]');
    select.value = 'price-asc';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const prices = $$('.grid .card').map((c) => byName(nameOf(c)).price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('opens the product sheet, adds from it, and closes on Escape', async () => {
    await start();
    click(card('Knife').querySelector('[data-action="open-product"]'));
    const modal = $('[data-region="modal"]');
    expect(modal.hidden).toBe(false);
    expect($('#sheet-title', modal).textContent).toBe('Knife');
    expect($('.sheet-cta [data-action="add"]', modal).textContent).toContain('Add to cart');
    click($('.sheet-cta [data-action="add"]', modal));
    expect(qtyOf(modal)).toBe('1');
    expect(qtyOf(card('Knife'))).toBe('1'); // card stays in sync

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.hidden).toBe(true);
  });

  it('cart: free-delivery nudge, suggestions, bill, then order', async () => {
    const storage = memoryStorage();
    await start({ storage });
    click(card('Milk').querySelector('[data-action="add"]'));
    click($('.cart-btn'));
    const drawer = $('[data-region="cart"]');
    expect(drawer.hidden).toBe(false);
    expect($('.nudge', drawer).textContent).toMatch(/Add \$16\.51 more for free delivery/);
    expect($$('.mini', drawer).length).toBeGreaterThan(0);
    expect($$('.mini-name', drawer).map((n) => n.textContent)).not.toContain('Milk');

    click($('[data-action="add"]', card('Knife')));
    click($('[data-action="increment"]', card('Knife')));
    expect($('.nudge', drawer).classList.contains('is-done')).toBe(true);
    expect($('.bill-total', drawer).textContent).toContain('$33.96'); // 3.49 + 29.98 + 0.49 handling

    click($('[data-action="checkout"]', drawer));
    expect(drawer.textContent).toContain('On its way');
    expect(JSON.parse(storage.getItem('quickkart:cart'))).toEqual({});
    expect($('[data-cart-summary]').textContent).toBe('Cart');
  });

  it('restores the cart from a previous visit', async () => {
    await start({ storage: memoryStorage({ 'quickkart:cart': JSON.stringify({ 32: 2 }) }) });
    expect(qtyOf(card('Milk'))).toBe('2');
    expect($('[data-region="cart-bar"]').hidden).toBe(false);
  });

  it('shows an error with a working retry', async () => {
    const loadCatalog = vi.fn()
      .mockRejectedValueOnce(new Error('Could not reach the store.'))
      .mockResolvedValueOnce(products);
    const app = await start({ loadCatalog });
    expect($('.empty h2').textContent).toBe('We couldn’t load the store');
    click($('[data-action="retry"]'));
    await vi.waitFor(() => expect($$('.card')).toHaveLength(10));
    expect(app.state.getState().status).toBe('ready');
  });

  it('never renders API data as HTML', async () => {
    const evil = { ...products[0], name: '<img src=x onerror="window.pwned=1">', brand: '<b>x</b>' };
    await start({ loadCatalog: async () => [evil] });
    expect($('.card img[onerror]')).toBeNull();
    expect(nameOf($('.card'))).toBe(evil.name);
  });

  it('toggles and remembers the theme', async () => {
    await start();
    click($('[data-action="toggle-theme"]'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('quickkart:theme')).toBe('dark');
  });
});
