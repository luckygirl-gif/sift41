// sift41.com → Instagram 자동 포스팅
// 새 제품(아직 인스타에 안 올라간 제품)을 찾아 웹사이트 소개글 그대로 게시한다.
// 필요 환경변수: IG_ACCESS_TOKEN (긴 수명 토큰)
import { readFileSync, writeFileSync } from 'node:fs';
import { SITE, todayLA, sleep, stripHtml, loadProducts, imageBase, makeApi, urlExists, createAndPublish } from './ig-lib.mjs';

const STATE_FILE = process.env.STATE_FILE || 'data/instagram-posted.json';
const TOKEN = process.env.IG_ACCESS_TOKEN;
const DRY_RUN = process.env.DRY_RUN === '1';
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 3); // 하루 최대 게시 수 (2026-08-21 Paula: 하루 2~3개)
const api = makeApi(TOKEN);

// 분류별 해시태그 30개 (2026-08-08 Paula 확정)
const HASHTAGS = {
  beauty: '#skincare #beauty #skincareroutine #beautytips #makeup #skincaretips #glowingskin #beautyproducts #selfcare #skincarelover #kbeauty #koreanskincare #skincareaddict #skincarecommunity #cleanbeauty #beautyfinds #productreview #skincarejunkie #beautyaddict #beautyreview #뷰티 #스킨케어 #화장품추천 #뷰티템 #피부관리 #화장품리뷰 #뷰티스타그램 #데일리뷰티 #꿀템 #추천템',
  health: '#supplements #wellness #health #healthylifestyle #vitamins #healthyliving #selfcare #wellnessjourney #nutrition #guthealth #probiotics #magnesium #immunesupport #healthtips #supplementreview #wellnesstips #healthjourney #cleanliving #biohacking #healthyhabits #영양제 #건강관리 #건강식품 #영양제추천 #웰니스 #건강스타그램 #유산균 #비타민 #홈케어 #추천템',
  home: '#homeessentials #cleaning #cleaningtips #homehacks #organizing #homecare #householdproducts #ecofriendly #nontoxic #cleaningproducts #homefinds #amazonfinds #homeorganization #naturalcleaning #greenliving #cleaninghacks #homeinspo #lifehacks #tidyhome #cleantok #살림템 #청소템 #생활용품 #살림스타그램 #꿀템 #자취템 #홈케어 #주방템 #살림꿀팁 #추천템',
};
HASHTAGS.uncategorized = HASHTAGS.home;

// 인스타는 게시물 하나에 태그(#) 30개까지만 허용한다. 넘으면 게시 자체가 거부된다
// (2026-08-26: 문구에 #ad #광고 2개가 늘면서 32개가 되어 하루치 3개가 전부 실패했다.
//  2026-09-04에 그 두 개를 뺐지만, 문구가 또 바뀔 때를 대비해 맞추는 장치는 남겨 둔다).
// 그래서 분류 해시태그를 뒤에서부터 잘라 전체가 30개를 넘지 않게 맞춘다.
const TAG_LIMIT = 30;
function fitHashtags(tagLine, usedElsewhere) {
  const list = tagLine.split(/\s+/).filter(Boolean);
  const room = Math.max(0, TAG_LIMIT - usedElsewhere);
  if (list.length <= room) return tagLine;
  console.log(`  해시태그 ${list.length + usedElsewhere}개 → ${TAG_LIMIT}개로 줄임 (인스타 제한)`);
  return list.slice(0, room).join(' ');
}
const countTags = (s) => (s.match(/#[^\s#]+/g) || []).length;

// 인스타 문구는 불릿 대신 단락으로 쓴다 (2026-09-04 Paula 지시 — 좁은 화면에서 불릿이
// 오히려 읽기 어렵다). 웹사이트는 그대로 불릿이고, 여기서만 바꾼다.
// 제품 파일의 소개글은 한 문단이 한 줄이므로, 줄마다 불릿 기호를 떼고 빈 줄로 띄운다.
const toParagraphs = (text) =>
  text.split('\n').map((l) => l.replace(/^\s*[•·]\s*/, '').trim()).filter(Boolean).join('\n\n');

function buildCaption(p) {
  const rawTags = HASHTAGS[p.category] || HASHTAGS.uncategorized;
  const title = p.title;
  const disclosure = '광고 · 제휴 링크 포함 | Ad · affiliate links';
  const ko = toParagraphs(stripHtml(p.descKo || p.summary || ''));
  const en = toParagraphs(stripHtml(p.descEn || ''));
  // 구매 링크는 sift41 제품 화면으로 보낸다 (2026-09-04 Paula 지시). 제휴사 주소를 그대로
  // 쓰면 redirect.viglink.com 같은 낯선 주소가 그대로 보이고, 구매 버튼이 둘 이상인
  // 제품은 링크 하나로 담을 수도 없다. 제품 화면에는 버튼이 다 있고 수수료도 그대로 붙는다.
  const buy = `구매 링크 | Buy: ${SITE}/products/${p.slug}/`;
  const cta = '더 많은 제품과 구매 링크 → 프로필의 sift41.com\nMore picks and links → sift41.com in bio';
  // #ad #광고 해시태그는 뺐다 (2026-09-04 Paula 지시 — 맨 아래 광고 표기와 겹친다)
  const tags = fitHashtags(rawTags, countTags(title) + countTags(ko) + countTags(en) + countTags(cta) + countTags(disclosure));
  // 구매 링크는 앞과 맨 뒤 두 군데 (2026-08-21 Paula 지시)
  let caption = [title, buy, ko, en, cta, tags, buy, disclosure].filter(Boolean).join('\n\n');
  if (caption.length > 2200) {
    // 영어 소개를 빼서 줄인다 (구매 링크·해시태그는 유지)
    // 조용히 사라지면 되돌릴 수 없으므로 반드시 눈에 띄게 알린다 (2026-09-04).
    console.log(`  ⚠️  문구가 ${caption.length}자라 2200자를 넘습니다 → 영어 소개(descEn ${en.length}자)를 통째로 뺍니다.`);
    console.log(`     한국어+영어를 1489자 안쪽으로 줄이면 둘 다 들어갑니다 (지금 ${ko.length + en.length}자).`);
    caption = [title, buy, ko, cta, tags, buy, disclosure].filter(Boolean).join('\n\n');
  }
  if (caption.length > 2200) caption = caption.slice(0, 2195) + '…';
  return caption;
}

async function publishOne(igUserId, p) {
  const imageUrl = `${SITE}/images/instagram/${imageBase(p)}.jpg`;
  if (!(await urlExists(imageUrl))) {
    if (DRY_RUN) console.log(`  주의: 사진이 아직 사이트에 없음 (${imageUrl})`);
    else throw new Error(`인스타용 사진이 사이트에 없습니다: ${imageUrl} — 사진을 만들어 올린 뒤 다시 실행하세요.`);
  }
  const caption = buildCaption(p);
  console.log(`  사진: ${imageUrl}`);
  console.log(`  문구 길이: ${caption.length}자`);
  if (DRY_RUN) { console.log('  (연습 실행 — 실제 게시 안 함)\n----- 문구 미리보기 -----\n' + caption + '\n-----'); return 'DRY'; }
  return createAndPublish(api, igUserId, { image_url: imageUrl, caption });
}

async function main() {
  if (!TOKEN && !DRY_RUN) { console.log('IG_ACCESS_TOKEN이 없습니다 — 건너뜁니다.'); return; }

  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  const posted = new Set(state.posted);
  const daily = state.daily && state.daily.date === todayLA() ? state.daily : { date: todayLA(), count: 0 };

  const pending = loadProducts().filter((p) => !posted.has(p.slug));

  if (pending.length === 0) { console.log('새로 올릴 제품이 없습니다.'); return; }
  const room = Math.max(0, DAILY_LIMIT - daily.count);
  if (room === 0) { console.log(`오늘 게시 한도(${DAILY_LIMIT}개)에 이미 도달 — 나머지 ${pending.length}개는 내일 이어서 올립니다.`); return; }
  const queue = pending.slice(0, room);
  if (queue.length < pending.length) console.log(`대기 ${pending.length}개 중 오늘은 ${queue.length}개만 올립니다 (하루 ${DAILY_LIMIT}개 제한).`);
  console.log(`올릴 제품 ${queue.length}개: ${queue.map((p) => p.slug).join(', ')}`);

  const me = TOKEN ? await api('/me', { fields: 'user_id,username' }) : { user_id: '0', username: 'dry-run' };
  const igUserId = me.user_id;
  console.log(`인스타그램 계정: @${me.username}`);

  let failed = 0;
  for (const p of queue) {
    console.log(`\n[${p.slug}] 게시 시작`);
    try {
      const id = await publishOne(igUserId, p);
      console.log(`  게시 완료 (id: ${id})`);
      if (!DRY_RUN) {
        posted.add(p.slug);
        daily.count++;
        // 다른 기록(예: 스토리 상태)은 그대로 두고 이 스크립트 몫만 갱신한다
        writeFileSync(STATE_FILE, JSON.stringify({ ...state, posted: [...posted].sort(), daily }, null, 2) + '\n');
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
