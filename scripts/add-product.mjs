// 사용법: node scripts/add-product.mjs <제품URL> [카테고리]
// 제품 페이지의 og 태그에서 제목·이미지·설명을 가져와 콘텐츠 파일을 만든다.
// buyUrl 에는 입력한 URL(제휴 링크)을 그대로 사용한다.
import { writeFileSync, mkdirSync, createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { extname } from 'node:path';
import { parse } from 'node-html-parser';

const target = process.argv[2];
const category = process.argv[3] || 'uncategorized';
if (!target) { console.error('사용법: node scripts/add-product.mjs <제품URL> [카테고리]'); process.exit(1); }

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const meta = (root, p) => root.querySelector(`meta[property="${p}"]`)?.getAttribute('content')
  || root.querySelector(`meta[name="${p}"]`)?.getAttribute('content') || '';
const slugify = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'product';

const res = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0 sift41' } });
const root = parse(await res.text());
const title = clean(meta(root, 'og:title')) || 'New product';
const slug = slugify(title);
const summary = clean(meta(root, 'og:description')).slice(0, 300);
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
if (!image) console.warn('⚠️ 이미지를 못 가져왔습니다(예: Amazon 차단). 이미지를 직접 public/images/products/ 에 넣고 md의 image를 채우세요.');

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const today = new Date().toISOString().slice(0, 10);
mkdirSync('src/content/products', { recursive: true });
writeFileSync(`src/content/products/${slug}.md`, [
  '---',
  `title: "${esc(title)}"`, 'brand: ""', `category: "${esc(category)}"`,
  `image: "${esc(image)}"`, 'price: ""', `buyUrl: "${esc(target)}"`,
  `date: ${today}`, `summary: "${esc(summary)}"`, '---', '', summary, '',
].join('\n'));
console.log(`추가됨: src/content/products/${slug}.md  (제목/카테고리/소개 검수 권장)`);
