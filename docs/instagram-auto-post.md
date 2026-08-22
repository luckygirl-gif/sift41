# 인스타그램 자동 포스팅 시스템

sift41.com에 새 제품이 올라가면 @sift41.official 인스타그램에 같은 소개글로 자동 게시된다.
(2026-08-08 Paula 확정: 승인 없이 바로 게시, 문구는 웹사이트와 동일, 해시태그 30개 자동 첨부)

## 동작 방식

1. 새 제품을 추가하고 push → 사이트 배포(Deploy to GitHub Pages)가 끝나면
2. `Instagram auto-post` 워크플로가 `data/instagram-posted.json`에 없는 제품을 찾아
3. 인스타 전용 사진(`/images/instagram/<이미지이름>.jpg`)과 웹사이트 소개글(한국어+영어)로 게시한다.
4. 게시 성공한 제품은 기록 파일에 추가되어 다시 올라가지 않는다.
5. **하루 최대 3개**(LA 기준, `DAILY_LIMIT`)까지만 게시한다. 밀린 제품은 매일 오전 9~10시(LA)
   예약 실행이 하루 3개씩 이어서 올린다. 기존 제품 25개도 이 방식으로 순차 게시된다
   (2026-08-21 Paula 지시: 한꺼번에 올리지 말고 하루 2~3개씩).

문구 구성: **구매 링크(buyUrl, 맨 앞)** → 광고 표시("광고 · 제휴 링크 포함 | Ad · affiliate links", FTC 규정상 첫 125자 안에 필수)
→ 제목 → 한국어 소개 → 영어 소개 → sift41.com 안내 → 분류별 해시태그 30개 → **구매 링크(맨 뒤 한 번 더)**.
구매 링크 두 군데는 2026-08-21 Paula 지시. 2,200자 초과 시 영어 소개를 뺀다 (구매 링크·해시태그는 유지).

## 제품 추가할 때 반드시 할 일 (Claude 체크리스트)

1. `src/content/products/<slug>.md` 작성 (기존 형식 유지 — frontmatter 파서가 이 형식에 의존)
2. 제품 사진을 `public/images/products/`에 추가
3. **인스타 전용 사진을 `public/images/instagram/<이미지 파일명>.jpg`로 추가**
   - JPEG만 가능 (webp/png 불가), 가로:세로 비율 0.8(4:5)~1.91, 권장 1080x1350 또는 1080x1080
   - 세로가 긴 사진은 위아래를 잘라 4:5로 만든다 (흰 배경이 아니면 여백 붙이기 금지)
   - 파일명은 content의 slug가 아니라 **image 필드의 파일명**을 따른다
4. push → 배포 후 자동 게시됨. 사진이 없으면 워크플로가 실패하고 다음 push 때 재시도된다.

## 토큰 (연결 열쇠) 관리

- Instagram API with Instagram Login 방식, `graph.instagram.com/v26.0` 직접 호출. Facebook 페이지 불필요.
- 긴 수명 토큰(60일)을 AES-256으로 암호화해 `data/ig-token.enc`에 저장.
  암호(passphrase)는 GitHub Secrets의 `IG_TOKEN_PASSPHRASE`에만 있다.
- `Instagram token refresh` 워크플로가 매달 1일·15일에 토큰을 갱신해 다시 암호화 저장 → 만료 걱정 없음.
- 인스타그램 비밀번호를 바꾸면 토큰이 즉시 무효화됨 → 아래 "연결 다시 하기" 필요.

## 최초 설정 (1회) — 남은 작업

1. https://developers.facebook.com 에서 Paula 계정으로 앱 생성 (Use case: "Instagram", 앱은 개발 모드 유지)
2. Instagram API with Instagram Login 설정에서 @sift41.official 계정을 Instagram Tester/역할로 추가
3. Business Login 설정: Redirect URI는 https://www.sift41.com/ 사용 가능
4. 인증 URL로 로그인 → code 획득 → 단기 토큰 → `ig_exchange_token`으로 60일 토큰 교환
   - 권한(scope): `instagram_business_basic,instagram_business_content_publish`
5. 토큰 암호화 저장 + 암호를 GitHub Secrets에 등록:
   ```
   printf '%s' "<토큰>" | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -base64 -pass env:IG_TOKEN_PASSPHRASE -out data/ig-token.enc
   gh secret set IG_TOKEN_PASSPHRASE
   ```
6. 커밋 & push → 이후 완전 자동.

## 연결 다시 하기 (토큰이 무효가 됐을 때)

위 4~6번만 다시 하면 된다. 증상: Instagram auto-post 워크플로 실패, 오류에 OAuthException/code 190.

## 규정 관련 (2026-08-08 조사 확정)

- 자동 게시는 Meta 공식 API 사용이므로 인스타 규정 위반 아님. 하루 100건 한도 (전혀 문제 안 됨).
- FTC: 광고 표시는 "더 보기" 누르기 전에 보여야 함 → 문구 최상단에 광고 표시 배치로 해결.
- 아마존: 사이트 푸터에 필수 문구("As an Amazon Associate we earn from qualifying purchases.") 추가됨 (2026-08-08).
  2026-08-21 Paula 지시로 문구에 아마존 구매 링크(buyUrl) 포함.
  인스타 계정(https://www.instagram.com/sift41.official)을 어소시에이트 사이트 목록에
  등록 완료 (2026-08-21, StoreID sift41-20). 아마존 쪽 요건은 모두 충족된 상태.
