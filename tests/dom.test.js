import { describe, it, expect } from 'vitest';
import { html, escapeHtml, formatPrice, roundMoney } from '../src/utils/dom.js';

describe('html template', () => {
  it('escapes interpolated values but not nested html', () => {
    const name = '<img src=x onerror=alert(1)>';
    const out = html`<p>${name}</p>${html`<b>${'&'}</b>`}`.value;
    expect(out).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p><b>&amp;</b>');
  });

  it('joins arrays and drops false/null', () => {
    expect(html`${[1, 2].map((n) => html`<i>${n}</i>`)}${false}${null}`.value).toBe('<i>1</i><i>2</i>');
  });

  it('escapes quotes for attributes', () => {
    expect(escapeHtml(`" onmouseover='x'`)).toBe('&quot; onmouseover=&#39;x&#39;');
  });
});

it('formats money', () => {
  expect(formatPrice(1234.5)).toBe('$1,234.50');
  expect(roundMoney(0.1 + 0.2)).toBe(0.3);
});
