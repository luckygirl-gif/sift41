# Claude 데스크탑용 작업 지시문 — SIFT41 Google Search Console 등록

아래 내용을 Claude 데스크탑에 그대로 붙여넣어 실행하면 된다.

---

[작업] sift41.com Google Search Console 등록 + 사이트맵 제출 + 색인 요청

목표: 구글이 sift41.com 전체(13페이지)를 색인하도록 등록한다.
현재 색인은 1페이지뿐이다. 사이트 자체와 SEO 태그는 정상이므로
코드나 사이트는 건드리지 않는다. GSC 등록 작업만 한다.

진행:

1) https://search.google.com/search-console 접속, 구글 계정으로 로그인.
   (로그인 창이 뜨면 사용자에게 직접 로그인하라고 요청할 것. 비밀번호 대신 입력 금지)

2) 속성 추가 → 왼쪽 "도메인(Domain)" 유형 선택 → sift41.com 입력 → 계속.
   ※ 오른쪽 "URL 접두어" 말고 반드시 "도메인" 유형으로. www와 루트를 한 번에 커버한다.

3) 화면에 나오는 TXT 레코드 값 복사 (google-site-verification=xxxx 형태).
   이 창은 닫지 말고 그대로 둘 것.

4) 새 탭에서 Wix 로그인 → Domains → sift41.com → "DNS Records" (또는 Advanced → Edit DNS).
   TXT 레코드 추가:
   - Host: @ (또는 비워두기)
   - 값: 3)에서 복사한 google-site-verification=xxxx 전체
   - TTL: 기본값 그대로
   저장.

5) GSC 창으로 돌아가 "확인(Verify)" 클릭.
   - 실패하면 DNS 전파 대기 중인 것. 10~30분 후 재시도 (최대 몇 시간 걸릴 수 있음).
   - 확인 창을 닫았어도 속성은 남아 있으니 다시 들어가 Verify만 누르면 됨.

6) 확인 완료 후, GSC 왼쪽 메뉴 → Sitemaps(사이트맵) → 새 사이트맵 추가:
   https://www.sift41.com/sitemap-index.xml
   제출 → 상태가 "성공(Success)"인지 확인.

7) 상단 URL 검사(URL Inspection) 창에 아래 URL을 하나씩 넣고,
   각각 "색인 생성 요청(Request Indexing)" 클릭:
   https://www.sift41.com/
   https://www.sift41.com/about/
   https://www.sift41.com/research-request/
   https://www.sift41.com/products/loewe-aire-sutileza-eau-de-toilette/
   https://www.sift41.com/products/estud-niacinamide-serum/
   ※ 하루 요청 한도(약 10개)가 있으므로 이 5개만. 나머지 제품 페이지는
     사이트맵 제출로 자동으로 잡힌다.

주의:
- Wix에서 기존 DNS 레코드(A, CNAME, MX)는 절대 수정·삭제하지 말 것. TXT "추가"만.
- 도메인 취소/이전 금지.
- GSC에서 "삭제", "제거 요청(Removals)" 메뉴는 건드리지 말 것.
- 사이트 코드/GitHub은 이 작업과 무관. 건드리지 말 것.

확인:
- Sitemaps 메뉴에 sitemap-index.xml 상태 "성공", 발견된 페이지 13개면 정상.
- 색인은 즉시 안 됨. 며칠~2주 뒤 구글에서 site:sift41.com 검색으로 확인.

롤백: 잘못됐을 때는 Wix에서 방금 추가한 TXT 레코드만 삭제하면 원상복구.
