// 인스타그램 연결 상태 점검 — 게시하지 않고 "무엇이 막혀 있는지"만 알아본다.
// GitHub Actions 의 "Instagram 연결 점검" 에서 손으로 실행한다. 토큰 자체는 절대 출력하지 않는다.
const token = process.env.IG_ACCESS_TOKEN;
if (!token) { console.log('토큰이 없습니다.'); process.exit(1); }

const show = (v) => JSON.stringify(v).slice(0, 600);

async function probe(label, url) {
  process.stdout.write(`\n[${label}]\n  ${url.replace(/access_token=[^&]+/g, 'access_token=***').replace(/input_token=[^&]+/g, 'input_token=***')}\n`);
  try {
    const res = await fetch(url);
    const body = await res.json().catch(() => ({}));
    if (body.error) { console.log(`  ✗ ${show(body.error)}`); return null; }
    console.log(`  ✓ ${show(body)}`);
    return body;
  } catch (e) {
    console.log(`  ✗ 통신 실패: ${e.message}`);
    return null;
  }
}

// 1) 평소 쓰는 통로 (지금 막혀 있는 곳)
await probe('현재 사용 중 v26.0 /me', `https://graph.instagram.com/v26.0/me?fields=id,username&access_token=${token}`);

// 2) 버전 문제인지 확인 — 버전 없이, 그리고 예전 버전으로
await probe('버전 없이 /me', `https://graph.instagram.com/me?fields=id,username&access_token=${token}`);
await probe('예전 버전 v21.0 /me', `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${token}`);

// 3) 토큰 자체가 살아 있는지 (앱·만료일·권한 확인. 토큰 값은 안 나옴)
await probe('토큰 정보 debug_token', `https://graph.facebook.com/v26.0/debug_token?input_token=${token}&access_token=${token}`);

// 4) 페이스북 쪽 통로로도 막혀 있는지
await probe('facebook 쪽 /me', `https://graph.facebook.com/v26.0/me?access_token=${token}`);

// 5) 토큰 갱신이 되는지 (새 토큰 값은 출력하지 않음)
const r = await probe('토큰 갱신 가능 여부', `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`);
if (r && r.access_token) console.log(`  → 갱신 성공. 남은 기간 약 ${Math.round((r.expires_in || 0) / 86400)}일 (새 토큰 값은 출력하지 않음)`);
