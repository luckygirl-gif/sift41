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

푸시하면 자동 배포됩니다. 구매 링크(buyUrl)에는 **Amazon/Sovrn 제휴 링크**를 넣으면 수익화가 유지됩니다.
