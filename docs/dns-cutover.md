# sift41.com → GitHub Pages 전환 (DNS 변경 안내)

도메인은 Wix에 그대로 둡니다(취소·이전 안 함). **DNS 레코드만** 바꿉니다.
위치: Wix 계정 → Domains → sift41.com → **DNS Records** (고급 설정)

## 바꾸기 전 현재 값 (롤백용 — 문제 생기면 이 값으로 되돌리기)
- apex `sift41.com` : A `178.128.137.126`
- `www` : CNAME `sift41.ghost.io`

## 새로 설정할 값
1. **`www` (CNAME)**
   - 기존 `sift41.ghost.io` → **`luckygirl-gif.github.io`** 로 변경
2. **apex `sift41.com` (A 레코드)** — 기존 A(178.128.137.126) 제거 후 아래 4개 추가:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
3. (선택, IPv6 AAAA)
   - `2606:50c0:8000::153` / `2606:50c0:8001::153` / `2606:50c0:8002::153` / `2606:50c0:8003::153`

## GitHub 쪽
- 레포 Settings → Pages → Custom domain = `www.sift41.com` (이미 설정됨, CNAME 파일로)
- DNS 전파되면 "Enforce HTTPS" 체크 (인증서 자동 발급, 몇 분~몇 시간)

## 확인
    dig +short www.sift41.com      # luckygirl-gif.github.io 가 나와야 함
    curl -sI https://www.sift41.com # 200 OK
전파에 보통 30분~수 시간(최대 24~48h). 그동안 기존 사이트와 병행될 수 있음.

## 안전수칙
- **며칠 정상 확인 후에만** Ghost(Pro) 구독 취소 (Ghost Admin → Billing → Cancel).
- 문제 발생 시 위 "현재 값"으로 즉시 롤백.
