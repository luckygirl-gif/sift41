import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const products = JSON.parse(readFileSync('backup/products.json', 'utf8'));
mkdirSync('src/content/products', { recursive: true });

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
let written = 0;
for (const p of products) {
  if (!p.image) { console.warn('SKIP (no image):', p.slug); continue; }
  const fm = [
    '---',
    'title: "' + esc(p.title) + '"',
    'brand: "' + esc(p.brand) + '"',
    'category: "' + esc(p.category) + '"',
    'image: "' + esc(p.image) + '"',
    'price: "' + esc(p.price) + '"',
    'buyUrl: "' + esc(p.buyUrl) + '"',
    'date: ' + (p.date || '2026-01-01'),
    'summary: "' + esc(p.summary) + '"',
    '---',
    '',
    p.body || p.summary || '',
    '',
  ].join('\n');
  writeFileSync('src/content/products/' + p.slug + '.md', fm);
  written++;
}
console.log('생성: ' + written + '개 제품 파일');
