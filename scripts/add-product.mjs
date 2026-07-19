// 사용법: node scripts/add-product.mjs <제품URL> [카테고리]
// og 태그에서 제목·이미지·설명 추출 → 신형식(descEn/descKo) 제품 파일 생성.
// descKo는 비워두므로 반드시 자연스러운 한국어(인스타 말투)로 채울 것.
import { writeFileSync, mkdirSync, createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { extname } from 'node:path';
import { parse } from 'node-html-parser';

const target = process.argv[2];
const category = process.argv[3] || 'uncategorized';
if (!target) { console.error('사용법: node scripts/add-product.mjs <제품URL> [카테고리]'); process.exit(1); }

// Amazon(amzn.to 제휴 태그)·sovrn.co가 아닌 머천트 링크는 Sovrn Redirect API로 자동 제휴화.
// 사이트 키는 Base.astro의 //Commerce 스크립트와 동일. 지원 머천트면 수수료 발생, 아니면 그냥 통과(302).
const SOVRN_KEY = 'c855bdca0941a37e3bafa21514e8907b';
const monetize = (u) => {
  const h = new URL(u).hostname;
  if (/(^|\.)amazon\.[a-z.]+$|(^|\.)amzn\.to$|(^|\.)sovrn\.co$|viglink\.com$/.test(h)) return u;
  return `https://redirect.viglink.com?u=${encodeURIComponent(u)}&key=${SOVRN_KEY}&prodOvrd=RAL`;
};

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const meta = (root, p) => root.querySelector(`meta[property="${p}"]`)?.getAttribute('content')
  || root.querySelector(`meta[name="${p}"]`)?.getAttribute('content') || '';
const slugify = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'product';

const root = parse(await (await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0 sift41' } })).text());
const title = clean(meta(root, 'og:title')) || 'New product';
const slug = slugify(title);
const summary = clean(meta(root, 'og:description')).slice(0, 200);
const ogImage = meta(root, 'og:image');

mkdirSync('public/images/products', { recursive: true });
let image = '';
if (ogImage) {
  try {
    const ext = ((extname(new URL(ogImage).pathname) || '.jpg').split('?')[0]) || '.jpg';
    const r = await fetch(ogImage);
    await pipeline(Readable.fromWeb(r.body), createWriteStream(`public/images/products/${slug}${ext}`));
    image = `/images/products/${slug}${ext}`;
  } catch (e) { console.warn('이미지 실패:', e.message); }
}
if (!image) console.warn('⚠️ 이미지 확보 실패 — 웹 검색으로 깨끗한 제품샷을 찾거나(500px+), 없으면 생성해서 채울 것.');

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const today = new Date().toISOString().slice(0, 10);
mkdirSync('src/content/products', { recursive: true });
writeFileSync(`src/content/products/${slug}.md`, [
  '---',
  `title: "${esc(title)}"`, 'brand: ""', `category: "${esc(category)}"`,
  `image: "${esc(image)}"`, 'price: ""', `buyUrl: "${esc(monetize(target))}"`,
  `date: ${today}`, `summary: "${esc(summary)}"`,
  'descEn: |-', '  ' + (summary || 'TODO'),
  'descKo: ""', '---', '',
].join('\n'));
console.log(`추가됨: src/content/products/${slug}.md — descKo(한국어 인스타 말투)와 이미지 검수 필수`);
