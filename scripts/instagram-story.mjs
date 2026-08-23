// sift41.com → Instagram 스토리 자동 게시
// 피드에 이미 올라간 제품을 하루에 1개씩 돌아가며 스토리로 올린다. (2026-08-22 Paula 지시)
// 스토리 사진은 scripts/build-story-images.py 가 만들어 사이트에 배포한 것을 쓴다.
// 필요 환경변수: IG_ACCESS_TOKEN (긴 수명 토큰)
import { readFileSync, writeFileSync } from 'node:fs';
import { SITE, todayLA, loadProducts, imageBase, makeApi, urlExists, createAndPublish } from './ig-lib.mjs';

const STATE_FILE = process.env.STATE_FILE || 'data/instagram-posted.json';
const TOKEN = process.env.IG_ACCESS_TOKEN;
const DRY_RUN = process.env.DRY_RUN === '1';
const api = makeApi(TOKEN);

async function main() {
  if (!TOKEN && !DRY_RUN) { console.log('IG_ACCESS_TOKEN이 없습니다 — 건너뜁니다.'); return; }

  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  const story = state.story || {};
  if (story.date === todayLA()) { console.log(`오늘 스토리는 이미 올렸습니다 (${story.lastSlug}).`); return; }

  // 피드에 게시된 제품만, 게시 순서 그대로 돌아가며 하나 고른다
  const posted = new Set(state.posted);
  const rotation = loadProducts().filter((p) => posted.has(p.slug));
  if (rotation.length === 0) { console.log('피드에 올라간 제품이 아직 없어 스토리를 건너뜁니다.'); return; }
  const lastIdx = rotation.findIndex((p) => p.slug === story.lastSlug);
  const next = rotation[(lastIdx + 1) % rotation.length]; // 못 찾으면 -1+1=0 → 처음부터

  const imageUrl = `${SITE}/images/stories/${imageBase(next)}.jpg`;
  console.log(`[${next.slug}] 스토리 게시 시작 (돌려쓰기 ${((lastIdx + 1) % rotation.length) + 1}/${rotation.length})`);
  console.log(`  사진: ${imageUrl}`);
  if (!(await urlExists(imageUrl))) {
    if (DRY_RUN) console.log(`  주의: 스토리용 사진이 아직 사이트에 없음 (${imageUrl})`);
    else throw new Error(`스토리용 사진이 사이트에 없습니다: ${imageUrl} — python3 scripts/build-story-images.py 실행 후 push 하세요.`);
  }
  if (DRY_RUN) { console.log('  (연습 실행 — 실제 게시 안 함)'); return; }

  const me = await api('/me', { fields: 'user_id,username' });
  console.log(`인스타그램 계정: @${me.username}`);
  const id = await createAndPublish(api, me.user_id, { media_type: 'STORIES', image_url: imageUrl });
  console.log(`  스토리 게시 완료 (id: ${id})`);

  writeFileSync(STATE_FILE, JSON.stringify({ ...state, story: { date: todayLA(), lastSlug: next.slug } }, null, 2) + '\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
