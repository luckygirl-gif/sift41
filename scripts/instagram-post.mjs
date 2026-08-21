// sift41.com → Instagram 자동 포스팅
// 새 제품(아직 인스타에 안 올라간 제품)을 찾아 웹사이트 소개글 그대로 게시한다.
// 필요 환경변수: IG_ACCESS_TOKEN (긴 수명 토큰)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const API = 'https://graph.instagram.com/v26.0';
const SITE = 'https://www.sift41.com';
const PRODUCTS_DIR = 'src/content/products';
const STATE_FILE = process.env.STATE_FILE || 'data/instagram-posted.json';
const TOKEN = process.env.IG_ACCESS_TOKEN;
const DRY_RUN = process.env.DRY_RUN === '1';

// 분류별 해시태그 30개 (2026-08-08 Paula 확정)
const HASHTAGS = {
  beauty: '#skincare #beauty #skincareroutine #beautytips #makeup #skincaretips #glowingskin #beautyproducts #selfcare #skincarelover #kbeauty #koreanskincare #skincareaddict #skincarecommunity #cleanbeauty #beautyfinds #productreview #skincarejunkie #beautyaddict #beautyreview #뷰티 #스킨케어 #화장품추천 #뷰티템 #피부관리 #화장품리뷰 #뷰티스타그램 #데일리뷰티 #꿀템 #추천템',
  health: '#supplements #wellness #health #healthylifestyle #vitamins #healthyliving #selfcare #wellnessjourney #nutrition #guthealth #probiotics #magnesium #immunesupport #healthtips #supplementreview #wellnesstips #healthjourney #cleanliving #biohacking #healthyhabits #영양제 #건강관리 #건강식품 #영양제추천 #웰니스 #건강스타그램 #유산균 #비타민 #홈케어 #추천템',
  home: '#homeessentials #cleaning #cleaningtips #homehacks #organizing #homecare #householdproducts #ecofriendly #nontoxic #cleaningproducts #homefinds #amazonfinds #homeorganization #naturalcleaning #greenliving #cleaninghacks #homeinspo #lifehacks #tidyhome #cleantok #살림템 #청소템 #생활용품 #살림스타그램 #꿀템 #자취템 #홈케어 #주방템 #살림꿀팁 #추천템',
};
HASHTAGS.uncategorized = HASHTAGS.home;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 제품 파일 읽기 (이 저장소의 고정된 형식 전용) ----
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();
    if (val === '|-' || val === '|') {
      const block = [];
      while (i + 1 < lines.length && (lines[i + 1].startsWith('  ') || lines[i + 1].trim() === '')) {
        if (/^[A-Za-z][A-Za-z0-9_]*:/.test(lines[i + 1])) break;
        block.push(lines[i + 1].replace(/^  /, ''));
        i++;
      }
      while (block.length && block[block.length - 1].trim() === '') block.pop();
      out[key] = block.join('\n');
    } else {
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      out[key] = val;
    }
  }
  return out;
}

const stripHtml = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function buildCaption(p) {
  const tags = HASHTAGS[p.category] || HASHTAGS.uncategorized;
  const parts = [
    p.title,
    '광고 · 제휴 링크 포함 | Ad · affiliate links',
    stripHtml(p.descKo || p.summary || ''),
    stripHtml(p.descEn || ''),
    '더 많은 제품과 구매 링크 → 프로필의 sift41.com\nMore picks and links → sift41.com in bio',
    tags,
  ].filter(Boolean);
  let caption = parts.join('\n\n');
  if (caption.length > 2200) {
    // 영어 소개를 빼서 줄인다 (해시태그는 유지)
    caption = [parts[0], parts[1], parts[2], parts[4], parts[5]].join('\n\n');
  }
  if (caption.length > 2200) caption = caption.slice(0, 2195) + '…';
  return caption;
}

function instagramImageUrl(p) {
  // /images/products/foo.webp → /images/instagram/foo.jpg
  const base = p.image.replace(/^\/images\/products\//, '').replace(/\.[a-z]+$/i, '');
  return `${SITE}/images/instagram/${base}.jpg`;
}

async function api(path, params, method = 'GET') {
  const qs = new URLSearchParams({ ...params, access_token: TOKEN });
  const url = method === 'GET' ? `${API}${path}?${qs}` : `${API}${path}`;
  const res = await fetch(url, method === 'GET' ? {} : { method, body: qs });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new Error(`${method} ${path} 실패: ${JSON.stringify(body.error || body).slice(0, 400)}`);
  }
  return body;
}

async function urlExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch { return false; }
}

async function publishOne(igUserId, p) {
  const imageUrl = instagramImageUrl(p);
  if (!(await urlExists(imageUrl))) {
    if (DRY_RUN) console.log(`  주의: 사진이 아직 사이트에 없음 (${imageUrl})`);
    else throw new Error(`인스타용 사진이 사이트에 없습니다: ${imageUrl} — 사진을 만들어 올린 뒤 다시 실행하세요.`);
  }
  const caption = buildCaption(p);
  console.log(`  사진: ${imageUrl}`);
  console.log(`  문구 길이: ${caption.length}자`);
  if (DRY_RUN) { console.log('  (연습 실행 — 실제 게시 안 함)\n----- 문구 미리보기 -----\n' + caption + '\n-----'); return 'DRY'; }

  // 1) 게시물 준비 (Meta가 사진을 가져가는 데 시간이 걸릴 수 있어 3번까지 재시도)
  let container;
  for (let attempt = 1; ; attempt++) {
    try {
      container = await api(`/${igUserId}/media`, { image_url: imageUrl, caption }, 'POST');
      break;
    } catch (e) {
      if (attempt >= 3) throw e;
      console.log(`  준비 실패(${attempt}번째), 25초 뒤 재시도: ${e.message}`);
      await sleep(25000);
    }
  }

  // 2) 준비 완료 대기
  for (let i = 0; i < 12; i++) {
    const st = await api(`/${container.id}`, { fields: 'status_code' });
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') {
      throw new Error(`게시물 준비 중 오류: ${st.status_code}`);
    }
    await sleep(5000);
  }

  // 3) 게시
  const pub = await api(`/${igUserId}/media_publish`, { creation_id: container.id }, 'POST');
  return pub.id;
}

async function main() {
  if (!TOKEN && !DRY_RUN) { console.log('IG_ACCESS_TOKEN이 없습니다 — 건너뜁니다.'); return; }

  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  const posted = new Set(state.posted);

  const files = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.md'));
  const pending = [];
  for (const f of files) {
    const slug = f.replace(/\.md$/, '');
    if (posted.has(slug)) continue;
    const fm = parseFrontmatter(readFileSync(`${PRODUCTS_DIR}/${f}`, 'utf8'));
    if (!fm || !fm.title || !fm.image) { console.log(`형식을 읽을 수 없어 건너뜀: ${f}`); continue; }
    pending.push({ slug, ...fm });
  }
  pending.sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.slug.localeCompare(b.slug));

  if (pending.length === 0) { console.log('새로 올릴 제품이 없습니다.'); return; }
  console.log(`올릴 제품 ${pending.length}개: ${pending.map((p) => p.slug).join(', ')}`);

  const me = TOKEN ? await api('/me', { fields: 'user_id,username' }) : { user_id: '0', username: 'dry-run' };
  const igUserId = me.user_id;
  console.log(`인스타그램 계정: @${me.username}`);

  let failed = 0;
  for (const p of pending) {
    console.log(`\n[${p.slug}] 게시 시작`);
    try {
      const id = await publishOne(igUserId, p);
      console.log(`  게시 완료 (id: ${id})`);
      if (!DRY_RUN) {
        posted.add(p.slug);
        writeFileSync(STATE_FILE, JSON.stringify({ posted: [...posted].sort() }, null, 2) + '\n');
      }
    } catch (e) {
      failed++;
      console.error(`  실패: ${e.message}`);
    }
    if (!DRY_RUN) await sleep(15000); // 게시물 사이 간격
  }
  if (failed > 0) { process.exitCode = 1; console.error(`\n${failed}개 실패 — 다음 실행 때 자동으로 다시 시도합니다.`); }
}

main().catch((e) => { console.error(e); process.exit(1); });
