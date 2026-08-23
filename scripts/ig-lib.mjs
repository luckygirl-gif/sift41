// 인스타그램 자동 게시 스크립트들(instagram-post.mjs, instagram-story.mjs)의 공용 부품
import { readFileSync, readdirSync } from 'node:fs';

export const API = 'https://graph.instagram.com/v26.0';
export const SITE = 'https://www.sift41.com';
export const PRODUCTS_DIR = 'src/content/products';

export const todayLA = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const stripHtml = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// ---- 제품 파일 읽기 (이 저장소의 고정된 형식 전용) ----
export function parseFrontmatter(text) {
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

// 모든 제품을 읽어 게시 순서(등록일 → 이름)로 정렬해 돌려준다.
export function loadProducts() {
  const files = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.md'));
  const out = [];
  for (const f of files) {
    const slug = f.replace(/\.md$/, '');
    const fm = parseFrontmatter(readFileSync(`${PRODUCTS_DIR}/${f}`, 'utf8'));
    if (!fm || !fm.title || !fm.image) { console.log(`형식을 읽을 수 없어 건너뜀: ${f}`); continue; }
    out.push({ slug, ...fm });
  }
  out.sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.slug.localeCompare(b.slug));
  return out;
}

// /images/products/foo.webp → foo (이미지 파일 이름의 몸통)
export const imageBase = (p) => p.image.replace(/^\/images\/products\//, '').replace(/\.[a-z]+$/i, '');

export function makeApi(token) {
  return async function api(path, params, method = 'GET') {
    const qs = new URLSearchParams({ ...params, access_token: token });
    const url = method === 'GET' ? `${API}${path}?${qs}` : `${API}${path}`;
    const res = await fetch(url, method === 'GET' ? {} : { method, body: qs });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) {
      throw new Error(`${method} ${path} 실패: ${JSON.stringify(body.error || body).slice(0, 400)}`);
    }
    return body;
  };
}

export async function urlExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch { return false; }
}

// 게시물 준비 → 준비 완료 대기 → 게시. 일시 오류는 알아서 재시도한다.
export async function createAndPublish(api, igUserId, containerParams) {
  // 1) 게시물 준비 (Meta가 사진을 가져가는 데 시간이 걸릴 수 있어 3번까지 재시도)
  let container;
  for (let attempt = 1; ; attempt++) {
    try {
      container = await api(`/${igUserId}/media`, containerParams, 'POST');
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

  // 3) 게시 (준비 완료 응답 뒤에도 잠시 거절되는 경우가 있어 5번까지 재시도)
  for (let attempt = 1; ; attempt++) {
    try {
      const pub = await api(`/${igUserId}/media_publish`, { creation_id: container.id }, 'POST');
      return pub.id;
    } catch (e) {
      const notReady = /"code":9007|2207027|not ready|Media ID is not available/i.test(e.message);
      if (!notReady || attempt >= 5) throw e;
      console.log(`  게시 거절(${attempt}번째, 사진 준비 지연) — 20초 뒤 재시도`);
      await sleep(20000);
    }
  }
}
