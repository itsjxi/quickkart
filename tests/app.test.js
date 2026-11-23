import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from '../src/controller/appController.js';
import { products, byName, memoryStorage } from './helpers.js';

const shell = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8').match(/<body>([\s\S]*)<\/body>/)[1]
  .replace(/<script[\s\S]*?<\/script>/, '');

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const card = (name) => $$('.card').find((c) => c.querySelector('.card-title').textContent.trim() === name);
const typeSearch = (value) => {
  const input = $('#search-input');
  input.value = value;
  input.dispatchEvent(new Event('submit', { bubbles: true })); // submit applies immediately (no debounce)
  input.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
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
  it('shows skeletons while loading, then the catalog with aisles', async () => {
    let resolveLoad;
    document.body.innerHTML = shell;
    const app = createApp(document.getElementById('app'), {
      loadCatalog: () => new Promise((r) => { resolveLoad = r; }), storage: memoryStorage(),
    });
    expect($$('.skeleton').length).toBeGreaterThan(0);
    resolveLoad(products);
    await app.ready;
    expect($$('.card')).toHaveLength(10);
    expect($$('.aisle').map((a) => a.querySelector('.aisle-label').textContent)).toContain('Dairy & Eggs');
    expect($('.result-count').textContent).toContain('10 products');
  });

  it('adds to cart: ADD becomes a stepper and the header shows count and subtotal', async () => {
    await start();
    click(card('Milk').querySelector('[data-action="add"]'));
    click(card('Milk').querySelector('[data-action="increment"]'));
    expect(card('Milk').querySelector('.stepper span').textContent).toBe('2');
    expect($('[data-cart-summary]').textContent).toMatch(/2 items\s*\$6\.98/);
    expect($('[data-region="announcer"]').textContent).toBe('Milk added to cart.');
  });

  it('caps quantity at available stock', async () => {
    await start();
    const chili = byName('Green Chili Pepper'); // stock 3
    click(card(chili.name).querySelector('[data-action="add"]'));
    for (let i = 0; i < 5; i++) {
      const plus = card(chili.name).querySelector('[data-action="increment"]');
      if (!plus.disabled) click(plus);
    }
    expect(card(chili.name).querySelector('.stepper span').textContent).toBe('3');
    expect(card(chili.name).querySelector('[data-action="increment"]').disabled).toBe(true);
  });

  it('filters by aisle and search, and offers a way out of empty results', async () => {
    await start();
    click($('[data-aisle="dairy"]'));
    expect($$('.card').map((c) => c.querySelector('.card-title').textContent.trim()).sort()).toEqual(['Eggs', 'Milk']);

    typeSearch('xyz');
    expect($('.state h2').textContent).toContain('Nothing matches “xyz”');
    click($('[data-action="reset-filters"]'));
    expect($$('.card')).toHaveLength(10);
    expect($('#search-input').value).toBe('');
  });

  it('sorts by price', async () => {
    await start();
    const select = $('[data-control="sort"]');
    select.value = 'price-asc';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect($$('.card .card-title')[0].textContent.trim()).toBe('Green Chili Pepper');
  });

  it('opens product details and adds from the modal', async () => {
    await start();
    click(card('Knife').querySelector('[data-action="open-product"]'));
    const modal = $('[data-region="modal"]');
    expect(modal.hidden).toBe(false);
    expect(modal.querySelector('#modal-title').textContent).toBe('Knife');
    expect(modal.textContent).toContain('7 days return policy');
    click(modal.querySelector('[data-action="add"]'));
    expect(modal.querySelector('.stepper span').textContent).toBe('1');
    expect(card('Knife').querySelector('.stepper span').textContent).toBe('1'); // grid stays in sync

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.hidden).toBe(true);
  });

  it('shows a bill in the cart and places an order', async () => {
    const storage = memoryStorage();
    await start({ storage });
    click(card('Knife').querySelector('[data-action="add"]'));
    click(card('Knife').querySelector('[data-action="increment"]'));
    click($('.cart-btn'));

    const drawer = $('[data-region="cart"]');
    expect(drawer.hidden).toBe(false);
    expect(drawer.textContent).toContain('free delivery'); // $29.98 ≥ $20
    expect(drawer.querySelector('.bill-total').textContent).toContain('$30.47');

    click(drawer.querySelector('[data-action="checkout"]'));
    expect(drawer.textContent).toContain('Your order is on its way!');
    expect(JSON.parse(storage.getItem('quickkart:cart'))).toEqual({});
    expect($('[data-cart-summary]').textContent).toBe('My Cart');
  });

  it('restores the cart from a previous visit', async () => {
    await start({ storage: memoryStorage({ 'quickkart:cart': JSON.stringify({ 32: 2 }) }) });
    expect(card('Milk').querySelector('.stepper span').textContent).toBe('2');
    expect($('[data-region="cart-bar"]').hidden).toBe(false);
  });

  it('shows an error with a working retry', async () => {
    const loadCatalog = vi.fn()
      .mockRejectedValueOnce(new Error('Could not reach the store.'))
      .mockResolvedValueOnce(products);
    const app = await start({ loadCatalog });
    expect($('.state h2').textContent).toBe('We couldn’t load the store');
    click($('[data-action="retry"]'));
    await vi.waitFor(() => expect($$('.card')).toHaveLength(10));
    expect(app.state.getState().status).toBe('ready');
  });

  it('never renders API data as HTML', async () => {
    const evil = { ...products[0], name: '<img src=x onerror="window.pwned=1">', brand: '<b>x</b>' };
    await start({ loadCatalog: async () => [evil] });
    expect($('.card img[onerror]')).toBeNull();
    expect($('.card-title').textContent.trim()).toBe(evil.name);
  });

  it('toggles and remembers the theme', async () => {
    await start();
    click($('[data-action="toggle-theme"]'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('quickkart:theme')).toBe('dark');
  });
});
