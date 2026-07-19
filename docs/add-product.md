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

## 수익화 규칙 (자동)
- **Amazon 링크(amzn.to)**: 그대로 사용 — sift41-20 태그로 직접 수익화.
- **그 외 모든 머천트 링크**: Sovrn Redirect API로 자동 래핑 — `https://redirect.viglink.com?u=<인코딩된URL>&key=c855bdca0941a37e3bafa21514e8907b&prodOvrd=RAL`
  Sovrn 대시보드에서 수동으로 링크를 만들 필요 없음. 지원 머천트면 수수료 발생, 아니면 원본으로 302 통과.
- add-product.mjs가 자동 처리하고, Claude가 수동으로 제품을 추가할 때도 같은 규칙을 적용한다.
