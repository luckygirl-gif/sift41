import { writeFileSync, mkdirSync, createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { extname } from 'node:path';
import { parse } from 'node-html-parser';

const PRODUCT_URLS = [
  'https://www.sift41.com/espoir-brow-cara/',
  'https://www.sift41.com/ther-biotic-synbiotic-prebiotics/',
  'https://www.sift41.com/thorne-basic-b-complex/',
  'https://www.sift41.com/omegavia-ultra-concentrated/',
  'https://www.sift41.com/electrolyte/',
  'https://www.sift41.com/chanel/',
  'https://www.sift41.com/mediheal-madecassoside-repair-serum/',
];

mkdirSync('public/images/products', { recursive: true });
mkdirSync('backup', { recursive: true });

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const meta = (root, prop) =>
  root.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ||
  root.querySelector(`meta[name="${prop}"]`)?.getAttribute('content') || '';
const slugOf = (u) => new URL(u).pathname.replace(/\/+$/, '').split('/').pop();

async function download(imgUrl, slug) {
  const ext = ((extname(new URL(imgUrl).pathname) || '.jpg').split('?')[0]) || '.jpg';
  const dest = `public/images/products/${slug}${ext}`;
  const res = await fetch(imgUrl);
  if (!res.ok) throw new Error(`image ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return `/images/products/${slug}${ext}`;
}

const products = [];
for (const u of PRODUCT_URLS) {
  const slug = slugOf(u);
  let html;
  try { html = await (await fetch(u, { headers: { 'User-Agent': 'sift41-migration' } })).text(); }
  catch (e) { console.warn('FETCH FAIL', slug, e.message); continue; }
  const root = parse(html);

  const ogImage = meta(root, 'og:image');
  let image = '';
  try { if (ogImage) image = await download(ogImage, slug); }
  catch (e) { console.warn('IMAGE FAIL', slug, e.message); }

  const buyEl = root.querySelector('a.kg-btn') ||
    root.querySelectorAll('a').find((a) => /amzn\.to|amazon\./i.test(a.getAttribute('href') || ''));
  const buyUrl = buyEl?.getAttribute('href') || '';

  const contentEl = root.querySelector('.gh-content') || root.querySelector('article');
  let body = contentEl ? contentEl.structuredText : '';
  body = body.split('\n').map((l) => l.trim()).filter((l) => l && l !== 'Get It!').join('\n\n');

  products.push({
    slug,
    title: clean(meta(root, 'og:title')),
    brand: '',
    category: clean(meta(root, 'article:tag')) || 'uncategorized',
    image,
    imageRemote: ogImage,
    price: '',
    buyUrl,
    date: (meta(root, 'article:published_time') || '').slice(0, 10),
    summary: clean(meta(root, 'og:description')).slice(0, 300),
    body,
    sourceUrl: u,
  });
  console.log('ok', slug, '| buy:', buyUrl ? 'Y' : 'MISSING', '| img:', image ? 'Y' : 'MISSING');
}

writeFileSync('backup/products.json', JSON.stringify(products, null, 2));
console.log('\n추출 제품: ' + products.length + '개 -> backup/products.json');
