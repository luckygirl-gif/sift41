# 제품 추가하는 법

## 방법 A — Claude에게 말하기 (권장)
Claude(이 프로젝트 폴더)에서 이렇게 말하면 끝:
> "이 제품들 SIFT41에 추가해줘: <링크1> <링크2> ... (카테고리: beauty/health)"

Claude가 제목·이미지·소개글을 만들고, 제품 파일을 생성하고, 커밋·푸시까지 합니다.
1~2분 뒤 GitHub Actions가 자동 배포 → 사이트에 게시됩니다.
(Amazon 등 이미지가 막히면 Claude가 이미지를 따로 요청하거나 대체합니다.)

## 방법 B — 직접 스크립트
    node scripts/add-product.mjs "<제품URL>" "beauty"   # 또는 health
    npm run build                                       # 로컬 확인(선택)
    git add -A && git commit -m "add: 제품명" && git push

푸시하면 자동 배포됩니다.

## 소개글 톤 규칙
새 제품의 한국어/영어 소개글은 반드시 [copy-tone-guide.md](copy-tone-guide.md)를 따릅니다.
(하이엔드 뷰티 에디터 톤, 드라마틱한 후킹·과장 광고 표현 금지, 단문·쉬운 단어)

## 수익화 규칙 (자동)
- **Amazon 링크(amzn.to)**: 그대로 사용 — sift41-20 태그로 직접 수익화.
- **그 외 모든 머천트 링크**: Sovrn Redirect API로 자동 래핑 — `https://redirect.viglink.com?u=<인코딩된URL>&key=c855bdca0941a37e3bafa21514e8907b&prodOvrd=RAL`
  Sovrn 대시보드에서 수동으로 링크를 만들 필요 없음. 지원 머천트면 수수료 발생, 아니면 원본으로 302 통과.
- add-product.mjs가 자동 처리하고, Claude가 수동으로 제품을 추가할 때도 같은 규칙을 적용한다.

## 아마존 제품에서 사진 뽑기 (2026-09-02 확인)

`add-product.mjs` 는 아마존 페이지를 명령줄로 긁는데 **아마존이 막을 때가 있다.**
그때는 브라우저로 제품 화면을 열고 큰 사진 태그에서 주소를 꺼낸다.

```js
const el = document.getElementById('landingImage');
el.getAttribute('data-old-hires')   // 1500픽셀짜리 주소가 여기 들어 있다
```

받은 사진으로 인스타용 4:5 사진을 만든다. 아마존 사진은 배경이 흰색이라
**위아래에 흰 여백을 붙여** 1080x1350 으로 만들면 된다 (배경이 흰색이 아니면 여백 금지, 잘라낼 것).
가장자리 흰 여백을 먼저 잘라내고(`ImageChops.difference` + `getbbox`) 6% 여백을 두고 가운데 배치하면
기존 제품 사진들과 결이 맞는다. 그다음 `python3 scripts/build-story-images.py` 를 돌리면 스토리용까지 끝난다.
