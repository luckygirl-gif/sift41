# Claude 데스크탑용 작업 지시문 — SIFT41 도메인 DNS 변경 (Wix)

아래 내용을 Claude 데스크탑에 그대로 붙여넣어 실행하면 된다.

---

[작업] SIFT41 도메인 DNS 변경 (Wix)

목표: sift41.com을 현재 Ghost에서 GitHub Pages로 연결한다.
도메인은 Wix에 그대로 두고 "DNS 레코드만" 바꾼다. (도메인 취소·이전 금지)

진행:
1) Wix 로그인 → Domains → sift41.com → "DNS Records" (또는 Advanced → Edit DNS).

2) www CNAME 레코드 변경:
   - 현재 값: sift41.ghost.io
   - 새 값:   luckygirl-gif.github.io

3) 루트 A 레코드 변경 (Host 가 @ 또는 sift41.com):
   - 현재 값 178.128.137.126 삭제, 아래 4개 A 레코드 추가:
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153

4) 저장.

주의:
- 도메인 등록 자체는 취소/이전하지 말 것. DNS 레코드만 수정.
- Ghost 구독은 건드리지 말 것.
- MX 등 이메일 레코드는 절대 건드리지 말 것.

확인: dig +short www.sift41.com  →  luckygirl-gif.github.io 면 성공 (전파 30분~수 시간).
롤백: www CNAME → sift41.ghost.io,  루트 A → 178.128.137.126
