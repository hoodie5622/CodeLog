(window.PRO_MODULES = window.PRO_MODULES || {})["be-http"] = {
  id: "be-http",
  summary: `HTTP 의미론(RFC 9110·9111·9457)에 근거해 멱등 키·ETag·캐시·오류 계약·페이지네이션·웹훅을 갖춘 재시도 안전한 API를 OpenAPI 계약부터 설계하고, 외주 인수 기준으로 증명할 수 있다.`,
  hours: 64,
  goals: [
    `메서드의 안전·멱등·캐시 가능 속성(RFC 9110 9.2절)을 근거로 타임아웃 뒤에 자동 재시도해도 되는 요청과 안 되는 요청을 구분하고 그 이유를 설명할 수 있다.`,
    `업무 결과를 상태 코드와 필수 헤더(Location, Allow, WWW-Authenticate, Retry-After)로 매핑하고, 오류는 RFC 9457 problem+json과 429+Retry-After, 지터 있는 재시도 정책으로 일관되게 설계할 수 있다.`,
    `ETag와 If-Match·If-None-Match로 lost update를 막고 412·428 흐름을 비교와 갱신이 원자적인 서버 코드로 구현하고 동시성 시험으로 증명할 수 있다.`,
    `Cache-Control(max-age·s-maxage·no-cache·no-store·private·public)과 Vary로 엔드포인트별 캐시 전략표를 작성하고 CDN에서의 개인정보 노출 위험을 진단할 수 있다.`,
    `Idempotency-Key 처리(원자적 키 선점, 요청 지문, 409·422 분기, 응답 재생, 만료)를 구현하고, 무작위 재전송에서도 중복 0건임을 자동 테스트로 증명할 수 있다.`,
    `리소스·URL·식별자를 설계하고 키셋(커서) 페이지네이션을 구현하며 offset 방식과의 비용·일관성 차이를 측정해 설명할 수 있다.`,
    `OpenAPI 계약을 먼저 작성·린트·목 서버로 검증하고, 호환 변경과 파괴 변경을 분류해 버전·Deprecation 정책과 변경 이력을 만들 수 있다.`,
    `웹훅의 서명 검증(원본 바이트·타임스탬프·상수 시간 비교), 재시도, 중복 제거, 순서 역전 대응을 설계하고 202 작업 리소스와 presigned URL 흐름까지 포함해 납품 문서로 설명할 수 있다.`
  ],
  lessons: [
    {
      title: `HTTP 의미론이라는 계약: 메시지·표현·중간자와 메서드 속성`,
      body: `이 모듈은 네트워크 모듈에서 배운 DNS·TCP·TLS의 위쪽, 즉 연결이 열린 뒤 양쪽이 어떤 약속으로 말하는가를 다룹니다. 중심 문서는 RFC 9110(HTTP Semantics, 2022-06)입니다. 9110은 메서드·상태 코드·헤더의 의미를 HTTP 버전과 무관하게 정의하고, RFC 9111은 캐시를, RFC 9112는 HTTP/1.1의 메시지 문법을 맡습니다. HTTP/2(RFC 9113)와 HTTP/3(RFC 9114)는 같은 의미를 다른 바이트 배치로 운반할 뿐이라서, 의미론을 한 번 익혀 두면 전송 버전이 바뀌어도 API 설계는 그대로 유효합니다.

### 의미론은 서버와 중간자가 함께 읽는 계약이다
요청 하나는 서버만 읽지 않습니다. 앱의 HTTP 라이브러리, 회사 프록시, CDN, 리버스 프록시, API 게이트웨이, 로드밸런서가 모두 메서드와 상태 코드와 헤더를 보고 행동합니다. GET이면 저장해도 되고, 연결이 끊기면 PUT은 다시 보내도 된다는 약속을 믿고 움직입니다. 그래서 GET으로 삭제를 구현하면 링크 미리보기나 검색 크롤러가 선의로 데이터를 지우고, POST를 아무 생각 없이 재시도하는 계층이 하나만 끼어도 결제가 두 번 나갑니다. 외주 현장의 API 사고 상당수는 코드 버그가 아니라 이 약속을 어긴 설계에서 나옵니다.

### 메시지 용어
- 요청은 메서드·대상 URI·헤더·선택적 본문, 응답은 상태 코드·헤더·본문으로 이루어집니다.
- 리소스는 이름 붙은 개념(주문 17번)이고, 표현(representation)은 그 시점의 상태를 특정 형식으로 담은 바이트입니다. 같은 리소스가 JSON과 CSV 표현을 가질 수 있고 ‹Accept›·‹Content-Type›으로 협상합니다.
- 새 헤더의 값 문법은 직접 만들지 말고 RFC 9651(Structured Field Values)을 쓰는 것이 현재 관례이며, Idempotency-Key 초안도 그렇게 정의됩니다.

### 세 가지 메서드 속성 (RFC 9110 9.2절)
| 속성 | 의미 | 해당 메서드 |
| 안전 | 클라이언트가 상태 변경을 기대하지 않음 | GET, HEAD, OPTIONS, TRACE |
| 멱등 | 같은 요청을 N번 보내도 의도된 서버 효과는 1번과 같음 | 안전 메서드 + PUT, DELETE |
| 캐시 가능 | 응답을 저장해 재사용할 수 있음 | GET, HEAD, 그리고 명시적 수명과 Content-Location이 있는 POST |

멱등은 응답이 같다는 뜻이 아닙니다. DELETE를 두 번 보내면 두 번째는 404일 수 있지만 서버에 남는 상태가 같으므로 멱등입니다. POST와 PATCH는 멱등이 아닙니다. 안전한 메서드도 접근 로그나 조회 수 같은 부수 효과는 가질 수 있는데, 핵심은 요청자가 그 효과에 책임지지 않는다는 점입니다. 위 표는 RFC 9110 기준이고, 2026-06에 발행된 RFC 10008의 QUERY도 안전·멱등·캐시 가능 메서드로 이 집합에 합류했습니다(2강).

### 속성이 재시도 규칙을 결정한다
타임아웃이나 연결 끊김이 나면 요청이 서버에 닿지 못한 것인지, 처리가 끝났는데 응답만 잃은 것인지 알 수 없습니다. RFC 9110은 클라이언트가 반복해도 안전함을 알 때만 비멱등 요청을 자동 재시도하라고 하고, 프록시는 비멱등 요청을 자동 재시도해서는 안 된다고 정합니다. 따라서 돈이 움직이는 POST는 재시도 안전성을 API가 스스로 만들어야 하고(7강), 이 질문이 모듈 전체를 관통합니다.

### 프레이밍, 그리고 관찰 습관
HTTP/1.1은 본문 길이를 ‹Content-Length›나 chunked 전송으로 알립니다. 앞단 프록시와 뒷단 서버가 모호한 요청을 서로 다르게 해석하면 request smuggling이 가능해지므로(RFC 9112가 경고) 모호한 요청은 거절하고 앞뒤 서버 구성을 맞춰야 합니다. 마지막으로 추측하지 말고 관찰하세요. ‹curl -v›, 브라우저 개발자 도구, 프록시 로그로 실제 헤더와 상태 코드를 확인하는 것이 이 모듈 모든 실습의 출발점입니다.`,
      code: `# RFC 9110 9.2절 메서드 속성과 "자동 재시도해도 되는가" 판정
SAFE = {"GET", "HEAD", "OPTIONS", "TRACE"}
IDEMPOTENT = SAFE | {"PUT", "DELETE"}

def may_auto_retry(method, *, is_proxy=False, has_idempotency_key=False):
    """연결 실패 뒤 같은 요청을 자동으로 다시 보내도 되는가."""
    if method in IDEMPOTENT:
        return True
    if is_proxy:
        return False                 # 프록시는 비멱등 요청을 자동 재시도하지 않는다
    # 클라이언트는 '반복해도 안전함'을 알 때만: 예) 서버가 문서화한 멱등 키
    return has_idempotency_key

assert may_auto_retry("GET")
assert may_auto_retry("DELETE", is_proxy=True)
assert not may_auto_retry("POST")
assert not may_auto_retry("POST", is_proxy=True, has_idempotency_key=True)
assert may_auto_retry("POST", has_idempotency_key=True)`,
      codeLang: `python`,
      key: [
        `의미론(RFC 9110)은 HTTP/1.1·2·3 공통이며, 메서드·상태 코드·헤더는 서버뿐 아니라 모든 중간자가 읽고 행동하는 계약이다.`,
        `안전은 상태 변경을 기대하지 않음(GET·HEAD·OPTIONS·TRACE), 멱등은 반복해도 서버 효과가 같음(안전 메서드 + PUT·DELETE)이다. POST와 PATCH는 비멱등이다.`,
        `타임아웃은 처리 여부를 알려 주지 않는다. 비멱등 요청은 안전함을 아는 클라이언트만 자동 재시도하고, 프록시는 절대 하지 않는다.`,
        `표현은 리소스의 한 시점·한 형식의 스냅샷이며, 형식 협상은 Accept·Content-Type, 캐시 분리는 Vary가 맡는다.`,
        `새 헤더 값은 자체 문법 대신 Structured Field Values(RFC 9651)로 정의한다.`
      ],
      pitfalls: [
        `GET으로 삭제·승인 같은 상태 변경을 구현해 링크 미리보기·프리페치·크롤러가 실행시키게 만든다.`,
        `멱등을 응답이 항상 같다는 뜻으로 오해한다. DELETE의 두 번째 호출이 404여도 서버 상태가 같으면 멱등이다.`,
        `로드밸런서·프록시·HTTP 클라이언트 라이브러리의 자동 재시도 기본값을 확인하지 않아 POST가 이미 중복 실행되고 있다.`,
        `모든 오류를 200과 본문의 에러 코드로 감싸 중간자·모니터링·캐시가 성공으로 오해하게 만든다.`
      ]
    },
    {
      title: `메서드와 상태 코드 설계: 무엇을 하려는가, 어떻게 됐는가`,
      body: `메서드는 무엇을 하려는가를, 상태 코드는 어떻게 됐는가를 중간자와 클라이언트에게 알리는 어휘입니다. 어휘를 정확히 쓸수록 클라이언트 코드가 단순해지고 모니터링·캐시·재시도가 저절로 맞게 동작합니다.

### 메서드 선택 기준
- GET: 조회. 안전·멱등·캐시 가능. 본문에 의미를 싣지 않습니다.
- POST: 서버가 정한 규칙으로 처리하는 모든 것. 서버가 ID를 부여하는 생성, 비동기 작업 시작, 동작 호출. 기본은 비멱등입니다.
- PUT: 대상 리소스를 보낸 표현으로 통째로 교체(없으면 생성). 멱등입니다. 일부 필드만 보내면 나머지가 지워진다는 뜻이므로 부분 수정에 쓰면 데이터가 사라집니다.
- PATCH(RFC 5789): 변경 내용을 담은 패치 문서를 적용합니다. 비멱등으로 취급하고, 전부 적용하거나 전혀 적용하지 않아야 합니다. JSON에는 JSON Merge Patch(RFC 7396, ‹application/merge-patch+json›)가 쉽습니다. 객체는 멤버별 병합, null은 그 멤버 삭제, 배열은 통째로 교체이므로 null 값 자체를 저장해야 하는 스키마에는 맞지 않습니다.
- DELETE: 삭제. 멱등. 이미 지운 것에 다시 보냈을 때 404와 204 중 무엇을 줄지는 팀 규칙으로 하나만 정합니다.
- QUERY(RFC 10008, 2026-06): 본문에 복잡한 조회 조건을 싣는 안전·멱등·캐시 가능 메서드입니다. GET의 URL 길이 한계와 POST 조회의 의미 부재를 메우지만 서버·프록시·도구 지원이 고르지 않으므로(2026-11 기준) 도입 전에 전 구간을 시험하세요.

### 상태 코드는 군으로 생각한다
2xx는 성공, 3xx는 다른 곳을 보라, 4xx는 요청 쪽 문제, 5xx는 서버 쪽 문제입니다. 이 군 구분이 곧 재시도 정책입니다. 다시 보내 의미가 있는 것은 대체로 5xx와 429이고, 4xx는 요청을 고치지 않으면 같은 결과입니다.

| 상황 | 코드 | 함께 보낼 헤더 |
| 생성 성공 | 201 | Location |
| 비동기 접수 | 202 | Location(작업 URI) |
| 성공, 본문 없음 | 204 | 없음 |
| 인증 없음·만료 | 401 | WWW-Authenticate |
| 인증됐지만 권한 없음 | 403 | 없음 |
| 허용되지 않는 메서드 | 405 | Allow |
| 현재 상태와 충돌 | 409 | 없음 |
| If-Match 불일치 | 412 | 없음 |
| 조건 헤더가 필수인데 없음 | 428 | 없음 |
| 값 검증 실패 | 400 또는 422 | 없음 |
| 속도 제한·일시 과부하 | 429·503 | Retry-After |

### 헷갈리는 쌍
- 301·302 대 308·307: 301·302는 역사적으로 일부 클라이언트가 POST를 GET으로 바꿔 다시 보냈습니다. 메서드와 본문을 유지해야 하면 영구 308, 임시 307을 쓰고, POST 처리 뒤 결과 화면으로 보낼 때는 303입니다.
- 401 대 403: 401은 자격 증명이 없거나 무효라서 다시 인증하면 풀릴 수 있다는 신호이고, 403은 누구인지 알지만 허용하지 않는다는 뜻이라 재로그인으로 풀리지 않습니다. 남의 테넌트 리소스의 존재를 숨기려고 403 대신 404를 쓰는 설계도 있는데, 정보 노출과 디버깅 편의 사이의 선택이므로 문서에 남기세요.
- 400 대 422: 400은 JSON 문법 오류처럼 요청을 이해할 수 없을 때, 422(Unprocessable Content)는 문법은 맞는데 값 규칙을 어길 때 어울립니다. 둘 다 400을 쓰는 팀도 많으니 하나로 정해 OpenAPI에 적는 것이 정답입니다.
- 409 대 412: 409는 리소스의 현재 상태와 요청이 충돌(이미 취소된 주문의 재취소), 412는 클라이언트가 건 조건 헤더의 불일치입니다.
- 500·502·503·504: 앱 버그는 500, 상류 서버의 잘못된 응답은 502, 과부하·점검은 503, 상류 타임아웃은 504입니다. 이 구분이 장애 원인 분류를 빠르게 합니다.`,
      code: `# 상태 코드 계약을 지키는지 점검하는 계약 테스트용 헬퍼
REQUIRED = {201: ["location"], 202: ["location"], 401: ["www-authenticate"], 405: ["allow"]}

def lint_response(status, headers):
    h = {k.lower(): v for k, v in headers.items()}
    problems = [f"{status} 응답에는 {name} 헤더가 필요합니다"
                for name in REQUIRED.get(status, []) if name not in h]
    if status == 204 and h.get("content-length", "0") != "0":
        problems.append("204 응답은 본문이 없어야 합니다")
    if status in (429, 503) and "retry-after" not in h:
        problems.append("재시도 시점을 알리는 Retry-After를 권장합니다")
    if status >= 400 and not h.get("content-type", "").startswith("application/problem+json"):
        problems.append("오류 응답은 application/problem+json 형식을 권장합니다")
    return problems

assert lint_response(201, {"Location": "/orders/1"}) == []
assert lint_response(401, {"Content-Type": "application/problem+json"}) == [
    "401 응답에는 www-authenticate 헤더가 필요합니다"]
assert len(lint_response(429, {})) == 2     # Retry-After 없음 + problem+json 아님`,
      codeLang: `python`,
      key: [
        `PUT은 전체 교체(멱등), PATCH는 변경 문서 적용(비멱등 취급), POST는 서버 규칙 처리다. 부분 수정에 PUT을 쓰면 빠뜨린 필드가 지워진다.`,
        `상태 코드 군이 곧 재시도 정책이다. 5xx·429는 다시 시도할 가치가 있고, 4xx는 요청을 고쳐야 한다.`,
        `201에는 Location, 401에는 WWW-Authenticate, 405에는 Allow, 429·503에는 Retry-After를 짝지어 보낸다.`,
        `401은 인증 실패, 403은 권한 거부, 409는 현재 상태와의 충돌, 412는 조건 헤더 불일치, 428은 조건 헤더 누락이다.`,
        `메서드를 보존해야 하는 리다이렉트는 308(영구)·307(임시)을 쓴다.`
      ],
      pitfalls: [
        `모든 실패를 400 하나로, 혹은 모든 응답을 200으로 돌려 클라이언트가 본문 문자열로 분기하게 만든다.`,
        `토큰 만료에 403을 줘서 클라이언트의 재로그인·토큰 갱신 로직이 작동하지 않는다.`,
        `POST를 보존해야 하는 이동에 301·302를 써서 클라이언트에 따라 GET으로 바뀐다.`,
        `PATCH 본문이 증가분(count += 1) 같은 의미인데 재시도를 허용해 값이 두 번 올라간다.`
      ]
    },
    {
      title: `리소스·식별자·페이지네이션: 바꾸기 어려운 모양을 처음부터 맞추기`,
      body: `URL과 데이터의 모양은 한 번 공개하면 바꾸기 어려운 약속입니다. 이 강의는 리소스를 어떻게 자르고, 어떤 식별자를 쓰고, 컬렉션을 어떻게 나눠 보여줄지 결정하는 기준을 다룹니다.

### REST를 실무 규칙으로 번역하기
Fielding의 박사논문 5장은 REST를 제약의 집합으로 정의합니다. client-server, stateless, cache, uniform interface, layered system, 그리고 선택적 code-on-demand입니다. 실무 번역은 이렇습니다. 요청은 서버 세션 없이 그 자체로 해석되어야 하고(그래야 서버를 늘려도 되고 캐시도 가능), 모든 리소스는 같은 메서드 어휘로 다뤄야 하며, 중간자가 읽을 수 있게 의미가 겉으로 드러나야 합니다. 하이퍼미디어까지 완벽히 지키는 API는 드물어서 외주에서 말하는 REST는 자원 지향 HTTP API로 이해하면 충분합니다. RFC 9205(Building Protocols with HTTP)의 핵심 지침도 같은 방향입니다. HTTP 메서드와 상태 코드의 의미를 재정의하지 마세요.

### URL 설계 규칙
- 명사 복수형 컬렉션과 식별자: ‹/orders›, ‹/orders/ord_8f3a›. 동사는 메서드가 맡습니다.
- 계층은 소유 관계가 분명할 때만 두 단계 이내로: ‹/orders/{id}/items›. 깊어지면 ‹/items?order_id=…›처럼 평평하게 둡니다.
- CRUD에 안 맞는 동작은 상태 전이나 하위 리소스로 모델링합니다. ‹POST /orders/{id}/cancellation›은 취소라는 사건을 만드는 것이라 사유·이력·멱등 키를 붙이기 쉽습니다. ‹POST /orders/{id}/cancel›도 현업에서 흔하며, 팀 규칙으로 통일하면 충분합니다.
- 필터·정렬·검색은 쿼리 문자열: ‹?status=paid&sort=-created_at›. 리소스를 식별하지 않는 값은 경로에 넣지 않습니다.
- URL 길이 상한은 서버·프록시마다 달라서(그래서 QUERY 메서드가 나왔습니다) 긴 조건은 검색 리소스를 POST로 만드는 방식으로 우회합니다.

### 식별자
순차 정수는 전체 규모와 다음 값이 드러나고, 남의 ID를 찍어 보는 열거 공격(BOLA)의 표적이 됩니다. 외부 ID는 추측할 수 없는 값으로 두고 내부 키와 분리하는 편이 안전합니다. UUIDv4는 완전 무작위라 B-tree 인덱스의 삽입 위치가 흩어집니다. RFC 9562의 UUIDv7은 앞 48비트가 밀리초 Unix 시각이라 시간순으로 정렬되고 삽입 지역성이 좋습니다. 대신 생성 시각이 ID에 드러나므로 민감하면 접두사+랜덤의 별도 공개 ID(‹ord_…›)를 쓰세요. 어느 쪽이든 ID가 추측 불가능하다는 사실이 인가 검사를 대신하지는 않습니다.

### 페이지네이션: offset과 cursor
컬렉션 API는 처음부터 페이지네이션이 있어야 합니다. 나중에 배열 응답을 객체로 바꾸면 모든 소비자가 깨집니다(Google AIP-158도 같은 이유로 처음부터 넣으라고 합니다).
- offset(‹?page=3&size=20›): 구현이 쉽고 임의 페이지로 점프할 수 있지만, DB가 앞의 N행을 건너뛰려고 읽어야 해서 깊은 페이지일수록 느려지고(DB와 인덱스에 따라 다르나 대체로 offset에 비례), 넘기는 사이 행이 삽입·삭제되면 같은 행이 반복되거나 빠집니다.
- cursor(keyset): 마지막으로 본 행의 정렬 키보다 뒤를 조회합니다. 인덱스를 타므로 깊이와 무관하게 비용이 거의 일정하고 삽입에도 안정적입니다. 대신 임의 페이지 점프가 없고, 정렬 키에 유일한 타이브레이커(보통 id)가 반드시 있어야 하며, 필터·정렬이 바뀌면 커서도 무효입니다.
- 커서는 클라이언트에게 불투명해야 합니다. AIP-158은 읽을 수 있는 값을 base64로 감싸는 정도로는 은닉이 되지 않는다고 경고하므로, 최소한 서명으로 변조를 막고(아래 예시) 내용 노출이 문제라면 암호화하며, 서명이 틀린 커서는 400 problem+json으로 거절하세요. 토큰이 있다고 권한 검사를 건너뛰어서도 안 됩니다. Stripe는 ‹starting_after›에 마지막 객체 ID를 받고 ‹has_more›를 돌려주며 ‹limit›은 1~100(기본 10)입니다(2026-11 열람).
- 총 개수는 비싼 COUNT가 필요하므로 선택 필드나 추정치로 두고 문서에 명시합니다.`,
      code: `import base64, hashlib, hmac, json, sqlite3

SECRET = b"cursor-demo-secret"                   # 실서비스에서는 비밀 관리 도구에서 읽는다
db = sqlite3.connect(":memory:")
db.execute("create table orders(id integer primary key, created_at text not null)")
db.executemany("insert into orders values (?, ?)",
               [(i, f"2026-11-{1 + i % 5:02d}") for i in range(1, 31)])
db.execute("create index ix_page on orders(created_at desc, id desc)")

def mac(raw):
    return hmac.new(SECRET, raw, hashlib.sha256).digest()[:8]

def encode(created_at, id_):                      # 서명된 토큰: 변조하면 거절된다
    raw = json.dumps([created_at, id_]).encode()
    return base64.urlsafe_b64encode(mac(raw) + raw).decode()

def decode(cursor):
    blob = base64.urlsafe_b64decode(cursor.encode())
    if not hmac.compare_digest(blob[:8], mac(blob[8:])):
        raise ValueError("invalid cursor")        # API에서는 400 problem+json으로 변환
    return json.loads(blob[8:])

def list_orders(limit=10, cursor=None):
    limit = max(1, min(limit, 100))               # 상한은 서버가 강제
    sql, args = "select id, created_at from orders ", []
    if cursor:
        sql += "where (created_at, id) < (?, ?) "  # 정렬 키 + 유일한 타이브레이커
        args += decode(cursor)
    sql += "order by created_at desc, id desc limit ?"
    rows = db.execute(sql, args + [limit + 1]).fetchall()   # 한 건 더 읽어 다음 페이지 유무 판정
    page, more = rows[:limit], len(rows) > limit
    nxt = encode(page[-1][1], page[-1][0]) if more else None
    return {"items": [{"id": r[0], "created_at": r[1]} for r in page], "next_cursor": nxt}

seen, cur = [], None
while True:
    res = list_orders(10, cur)
    seen += [item["id"] for item in res["items"]]
    cur = res["next_cursor"]
    if not cur:
        break
assert sorted(seen) == list(range(1, 31)) and len(seen) == len(set(seen))
try: decode(encode("2026-11-01", 5)[:-4] + "AAAA")
except ValueError: pass                           # 변조된 커서는 거절
else: raise AssertionError("변조된 커서를 받아들였다")`,
      codeLang: `python`,
      key: [
        `REST의 실무 번역은 무상태 요청, 통일된 메서드 어휘, 중간자가 읽을 수 있는 드러난 의미다. 메서드·상태 코드의 의미를 재정의하지 않는다(RFC 9205).`,
        `URL은 명사 복수형 컬렉션과 식별자, 필터·정렬은 쿼리 문자열, CRUD에 안 맞는 동작은 상태 전이 하위 리소스로 모델링한다.`,
        `외부 ID는 추측 불가능하게 두고 내부 키와 분리한다. UUIDv7은 시간순 정렬로 인덱스 삽입에 유리하지만 생성 시각이 노출된다.`,
        `offset은 깊을수록 느리고 삽입·삭제에 흔들리며, cursor(keyset)는 일정한 비용과 안정성을 주는 대신 유일한 정렬 키와 불투명 토큰이 필요하다.`,
        `페이지네이션은 처음부터 넣는다. 나중에 응답 모양을 바꾸는 것은 파괴적 변경이다.`
      ],
      pitfalls: [
        `정렬 키가 유일하지 않아(created_at만 사용) 페이지 경계에서 같은 시각의 행이 중복되거나 누락된다.`,
        `큰 테이블에 offset 페이지네이션을 방치하고, 총 개수를 매 요청마다 COUNT로 계산한다.`,
        `커서를 단순 base64로 내보내 클라이언트가 구조를 해석·조작하게 두고, 커서가 있으니 권한 검사를 생략한다.`,
        `순차 정수 ID를 그대로 외부에 노출해 남의 주문 번호를 하나씩 대입하는 열거 공격을 허용한다.`
      ]
    },
    {
      title: `조건부 요청과 낙관적 동시성: ETag와 If-Match로 lost update 막기`,
      body: `관리자 두 명이 같은 상품 화면을 열었습니다. A는 가격을 올려 저장했고, B는 설명만 고쳤지만 화면에는 예전 가격이 들어 있어서 전체를 PUT하는 순간 A의 가격 변경이 조용히 사라집니다. 오류도 로그도 없는 데이터 유실, 즉 lost update이며 마지막에 쓴 사람이 이기는 기본 동작의 결과입니다. HTTP는 이미 해결책을 갖고 있습니다. 조건부 요청입니다.

### 검증자(validator)
- ETag: 표현의 버전을 나타내는 불투명한 문자열이며 따옴표를 포함합니다(예 "v7"). 앞에 W/가 붙으면 약한 ETag로 의미가 같다는 뜻이고, 없으면 강한 ETag로 바이트까지 같다는 뜻입니다.
- Last-Modified: 시각 기반 검증자이며 초 단위 해상도라 한 초 안의 두 번 변경을 구분하지 못합니다. 쓰기 충돌 방지에는 ETag가 낫습니다.

### 한 메커니즘, 두 용도
1. 캐시 재검증(읽기): 클라이언트가 ‹If-None-Match: "v7"›로 GET하면 서버는 같을 때 본문 없이 304를 돌려줍니다. 요청 횟수는 줄지 않지만 본문 전송과 직렬화 비용이 줄어듭니다.
2. 쓰기 전제 조건(쓰기): ‹If-Match: "v7"›로 PUT·PATCH·DELETE하면 서버는 현재 ETag가 같을 때만 실행하고 다르면 412 Precondition Failed를 돌려줍니다. HTTP판 낙관적 락입니다.

비교 규칙은 헤더마다 다릅니다. If-Match는 강한 비교, If-None-Match는 약한 비교를 씁니다. ‹If-None-Match: *›는 어떤 표현이든 이미 존재하면 실패하는 조건이어서, PUT으로 생성만 허용하고 덮어쓰기는 막을 때 씁니다(실패하면 412). 여러 조건이 함께 오면 If-Match가 먼저, 그다음 If-Unmodified-Since(If-Match가 없을 때만), If-None-Match, If-Modified-Since(If-None-Match가 없을 때만) 순으로 평가합니다(RFC 9110 13.2.2).

헷갈리는 경우가 하나 있습니다. 클라이언트가 ‹If-Match: "v7"›로 보낸 PUT이 서버에서는 성공해 v8이 되었는데 응답만 유실됐다면, 같은 요청을 재시도할 때는 현재 ETag가 이미 v8이라 412가 나옵니다. RFC 9110은 If-Match가 거짓이어도 요청이 요구하는 최종 상태가 이미 반영된 것을 서버가 확인했다면 412 대신 2xx를 줄 수 있게 허용합니다. 그렇게 구현하기 어렵다면 412를 받은 클라이언트가 재조회해서 자기 변경이 이미 반영됐는지 비교하게 하고, 돈이 걸린 쓰기는 7강의 멱등 키를 함께 씁니다.

### 서버 구현의 핵심: 비교와 쓰기를 한 연산으로
ETag를 DB의 version 정수나 마이크로초 단위 updated_at에서 만들었다고 해도, 애플리케이션에서 SELECT로 검사하고 UPDATE로 쓰면 두 요청이 동시에 검사를 통과합니다. ‹UPDATE … SET version = version + 1 WHERE id = ? AND version = ?›처럼 조건과 쓰기를 한 문장에 넣고, 영향받은 행이 0이면 412로 응답하세요. 비관적 락은 HTTP에서 비현실적입니다. 락을 잡은 클라이언트가 사라질 수 있기 때문입니다.

### 조건을 요구할 것인가
서버가 If-Match 없는 덮어쓰기를 받아 주면 클라이언트가 조건을 안 보내는 순간 보호가 사라집니다. 관리 화면처럼 충돌이 실제로 생기는 리소스는 조건 헤더를 필수로 하고, 없으면 428 Precondition Required(RFC 6585)로 거절합니다. 412를 받은 클라이언트는 최신 표현을 다시 GET해 자기 변경과 병합(또는 사용자에게 충돌을 보여줌)한 뒤 새 ETag로 시도해야 합니다. 같은 요청을 그대로 반복하면 영원히 412입니다.

### ETag를 만드는 법
표현이 바뀔 때만 바뀌고, 같은 표현이면 서버 인스턴스와 무관하게 같아야 합니다. 본문 해시나 DB 버전 열이 좋은 후보이고, 파일 수정 시각이나 요청마다 바뀌는 값은 나쁩니다. gzip 같은 인코딩 표현은 다른 표현이므로 ETag도 달라야 합니다. 브라우저의 JavaScript가 ETag를 읽으려면 CORS 응답에 ‹Access-Control-Expose-Headers: ETag›가 필요합니다.`,
      code: `class Store:
    """메모리 저장소: id -> (version, data). ETag는 버전에서 만든다."""
    def __init__(self):
        self.rows = {}

    def etag(self, id_):
        return f'"v{self.rows[id_][0]}"'

    def put(self, id_, data, if_match=None, if_none_match=None):
        exists = id_ in self.rows
        if if_none_match == "*":                   # 생성 전용: 이미 있으면 실패
            if exists:
                return 412, {}
        elif if_match is not None:                 # If-Match는 강한 비교
            ok = exists if if_match == "*" else exists and self.etag(id_) == if_match
            if not ok:
                return 412, {}
        elif exists:                               # 조건 없이 덮어쓰기 시도
            return 428, {}
        version = self.rows[id_][0] + 1 if exists else 1
        self.rows[id_] = (version, data)
        return (200 if exists else 201), {"ETag": self.etag(id_)}

s = Store()
assert s.put("p1", {"price": 100}, if_none_match="*")[0] == 201
assert s.put("p1", {"price": 120}, if_match='"v1"') == (200, {"ETag": '"v2"'})
assert s.put("p1", {"price": 90}, if_match='"v1"')[0] == 412     # 낡은 ETag
assert s.put("p1", {"price": 90})[0] == 428                       # 조건 헤더 없음
assert s.put("p1", {}, if_none_match="*")[0] == 412               # 덮어쓰기 금지`,
      codeLang: `python`,
      key: [
        `lost update는 오류 없이 데이터가 사라지는 사고다. If-Match가 불일치하면 서버는 쓰지 않고 412를 돌려준다.`,
        `같은 검증자(ETag)가 읽기에서는 304 재검증, 쓰기에서는 412 낙관적 락으로 쓰인다.`,
        `If-Match는 강한 비교, If-None-Match는 약한 비교를 쓰며, If-None-Match: *는 생성 전용 PUT에 쓴다.`,
        `서버는 비교와 쓰기를 한 연산(UPDATE … WHERE version = ?)으로 묶고, 충돌이 흔한 리소스는 조건 헤더가 없으면 428로 거절한다.`,
        `412를 받은 클라이언트는 재조회·병합 뒤 새 ETag로 재시도해야 하며 같은 요청의 반복은 무의미하다.`
      ],
      pitfalls: [
        `ETag는 주면서 쓰기에서 If-Match를 요구하지 않아, 클라이언트가 조건을 빼먹는 순간 마지막 저장이 이기는 동작으로 돌아간다.`,
        `SELECT로 version을 확인한 뒤 UPDATE해서 두 요청이 동시에 검사를 통과한다.`,
        `ETag를 파일 수정 시각이나 응답마다 바뀌는 값으로 만들어 304가 영영 나오지 않거나, 반대로 내용이 바뀌어도 ETag가 그대로다.`,
        `브라우저 앱에서 ETag 헤더가 보이지 않는다. CORS의 Access-Control-Expose-Headers에 빠뜨렸기 때문이다.`
      ]
    },
    {
      title: `캐싱 전략: RFC 9111 신선도·재검증·Vary와 CDN 사고 예방`,
      body: `캐시는 가장 싼 성능 향상이자 가장 조용한 데이터 유출 경로입니다. RFC 9111의 모델은 단순합니다. 저장된 응답이 신선하면 그대로 재사용하고, 낡았으면 조건부 요청으로 재검증하거나 새로 가져옵니다. 모든 설계는 신선한 기간을 누가 정하는가, 그리고 누가 저장해도 되는가라는 두 질문으로 요약됩니다.

### 신선도 계산
공유 캐시에서 신선 수명은 ‹s-maxage›, ‹max-age›, ‹Expires› 순으로 정해지고, 모두 없으면 캐시가 추정(휴리스틱)합니다. RFC 9111은 Last-Modified 이후 경과 시간의 일정 비율, 흔히 10% 정도를 예로 듭니다. 마지막 수정이 100일 전인 응답이 열흘 동안 재검증 없이 쓰일 수 있다는 뜻이므로, 캐시되길 원하든 원치 않든 Cache-Control을 명시하는 것이 안전합니다. ‹Age› 헤더는 응답이 원본에서 만들어지거나 마지막으로 검증된 뒤 지난 추정 초이고, 중간 캐시에서 보낸 시간도 포함합니다.

### 지시어 사전
| max-age=N | N초 동안 신선 |
| s-maxage=N | 공유 캐시(CDN)에만 적용, max-age를 덮어씀 |
| no-cache | 저장은 해도 되지만 재사용 전에 반드시 재검증 |
| no-store | 저장 금지(민감 응답). 완벽한 프라이버시 보장은 아님 |
| private | 공유 캐시 저장 금지, 브라우저 캐시는 가능 |
| public | 공유 캐시 저장을 명시적으로 허용 |
| must-revalidate | 낡은 뒤에는 검증 없이 쓰지 않음 |

no-cache와 no-store의 혼동이 가장 흔한 사고 원인입니다.

### 공유 캐시와 Authorization
공유 캐시는 Authorization 헤더가 있는 요청의 응답을 재사용해서는 안 됩니다. 응답이 ‹public›, ‹s-maxage›, ‹must-revalidate›로 명시적으로 허용하는 경우만 예외입니다. 설계 규칙으로 바꾸면 이렇습니다. 개인화 응답에는 ‹private›(민감하면 ‹no-store›)를 명시하고, 공용 데이터에만 ‹public›·‹s-maxage›를 줍니다. CDN을 새로 붙일 때 가장 먼저 확인할 것은 CDN이 Authorization과 쿠키를 캐시 키에 넣는지 무시하는지입니다.

### Vary와 캐시 키
Vary에 적힌 요청 헤더가 같을 때만 저장된 응답을 재사용합니다. ‹Vary: Accept-Encoding›은 정상이고, CORS에서 요청의 Origin을 응답에 되울린다면 ‹Vary: Origin›이 필요합니다. ‹Vary: User-Agent›나 쿠키 전체는 캐시 키를 조각내어 적중률을 무너뜨리고, ‹Vary: *›는 절대 일치하지 않습니다.

### 리소스별 전략표 예
| 정적 해시 파일 | public, max-age=31536000, immutable |
| 공개 카탈로그 목록 | public, max-age=60, s-maxage=300 + ETag |
| 로그인 사용자 데이터 | private, no-cache + ETag |
| 결제·토큰·개인정보 | no-store |
| POST·PUT·DELETE 응답 | 기본적으로 캐시되지 않음 |

RFC 5861(Informational)의 ‹stale-while-revalidate›는 낡은 사본을 즉시 내주고 뒤에서 갱신하며, ‹stale-if-error›는 오류 때 낡은 사본을 내줍니다. 지원은 캐시 제품마다 다르니 시험해 보고 의존하세요.

### 무효화의 한계와 의존성
PUT·POST·DELETE 같은 안전하지 않은 요청에 2xx·3xx 응답이 오면 캐시는 그 요청 URI의 저장본을 무효화해야 하고, 같은 출처의 Location·Content-Location URI도 무효화할 수 있습니다(RFC 9111 4.4). 그러나 목록 URL 같은 연관 URL까지는 모릅니다. 쓰기 직후 화면에 바로 반영되어야 하는 목록은 TTL을 짧게 하거나 재검증(no-cache) 또는 CDN purge를 설계에 넣어야 합니다. 캐시가 성능 최적화에서 필수 의존성으로 변하면 캐시가 비거나 죽은 날 원본으로 트래픽이 쏟아집니다. AWS Builders' Library의 「Caching challenges and strategies」(2019-12)는 이 위험과 요청 병합·부하 차단 같은 대응을 다룹니다.`,
      code: `def parse_cc(value):
    cc = {}
    for part in value.split(","):
        key, _, val = part.strip().partition("=")
        if key:
            cc[key.lower()] = val
    return cc

def decide(age, headers, shared=True, has_validator=True):
    """저장된 응답을 지금 어떻게 쓸지 판정한다 (RFC 9111을 단순화)."""
    cc = parse_cc(headers.get("Cache-Control", ""))
    if "no-store" in cc:
        return "저장 금지"
    if shared and "private" in cc:
        return "공유 캐시는 저장 금지"
    life = None
    if shared and "s-maxage" in cc:
        life = int(cc["s-maxage"])                # 공유 캐시에서는 s-maxage가 우선
    elif "max-age" in cc:
        life = int(cc["max-age"])
    if "no-cache" in cc or life is None:          # 명시 수명이 없으면 휴리스틱 위험
        return "재검증" if has_validator else "원본 재요청"
    if age < life:
        return "신선: 그대로 재사용"
    return "낡음: 재검증" if has_validator else "낡음: 원본 재요청"

assert decide(30, {"Cache-Control": "public, max-age=60"}) == "신선: 그대로 재사용"
assert decide(100, {"Cache-Control": "max-age=60"}) == "낡음: 재검증"
assert decide(30, {"Cache-Control": "max-age=60, s-maxage=10"}) == "낡음: 재검증"   # CDN은 10초
assert decide(1, {"Cache-Control": "private, max-age=60"}) == "공유 캐시는 저장 금지"
assert decide(1, {"Cache-Control": "no-store"}) == "저장 금지"
assert decide(1, {"Cache-Control": "no-cache"}) == "재검증"`,
      codeLang: `python`,
      key: [
        `신선하면 재사용, 낡으면 재검증이다. 수명은 s-maxage(공유 캐시), max-age, Expires 순이고 모두 없으면 휴리스틱(Last-Modified 경과의 약 10% 등)이 개입한다.`,
        `no-cache는 저장하되 매번 재검증, no-store는 저장 금지, private은 공유 캐시 금지, public은 공유 캐시 허용이다.`,
        `개인화 응답에는 private 또는 no-store를 명시하고, 공용 데이터에만 public·s-maxage를 준다. Authorization 요청은 공유 캐시가 명시적 허락 없이 재사용하지 못한다.`,
        `Vary는 캐시 키를 확장한다. Accept-Encoding·Origin은 필요하고 User-Agent·쿠키 전체는 적중률을 무너뜨린다.`,
        `쓰기 요청은 그 URI만 무효화하므로 목록 같은 연관 URL은 TTL·재검증·purge를 따로 설계한다.`
      ],
      pitfalls: [
        `no-cache를 캐시하지 말라는 뜻으로 오해해 민감 데이터에 no-cache만 붙인다. 저장 금지는 no-store다.`,
        `개인화 응답에 Cache-Control을 안 달아 CDN 기본 규칙이나 휴리스틱으로 공유 저장될 위험을 남긴다.`,
        `Vary를 빠뜨려 다른 언어·다른 Origin의 응답이 섞이거나, Vary: Cookie로 적중률이 0에 가까워진다.`,
        `캐시 적중률을 장애 전까지 계측하지 않아 캐시가 죽은 날 원본이 한꺼번에 무너진다.`
      ]
    },
    {
      title: `오류 계약과 속도 제한: RFC 9457, 429, Retry-After, 재시도 정책`,
      body: `성공 응답은 사람이 눈으로 확인하지만 오류 응답은 프로그램이 읽습니다. 클라이언트가 오류를 문자열 매칭으로 분기하는 API는 문구를 고치는 순간 깨집니다. RFC 9457(Problem Details for HTTP APIs, 2023-07, RFC 7807 대체)은 이 문제를 표준 JSON 모양과 ‹application/problem+json› 미디어 타입으로 풉니다.

### 구조
- ‹type›: 문제 유형을 식별하는 URI로, 클라이언트가 분기에 쓰는 1차 식별자입니다. 생략하면 ‹about:blank›로 간주되어 HTTP 상태 코드 이상의 의미가 없다는 뜻이 됩니다. 사람이 읽을 문서로 연결하되, 클라이언트가 자동으로 접속하라는 뜻은 아닙니다.
- ‹title›: 같은 type이면 매번 같은 짧은 요약(현지화 제외).
- ‹status›: 이 발생 건의 HTTP 상태 코드. 참고용이지만 생성자는 실제 응답 상태와 같게 보내야 합니다.
- ‹detail›: 이번 발생에만 해당하는 설명입니다. 소비자가 파싱해서는 안 되므로(SHOULD NOT) 기계가 읽을 정보는 확장 멤버로 줍니다.
- ‹instance›: 이번 발생을 가리키는 URI나 불투명 식별자입니다. 지원 문의용 추적 ID로 쓰기 좋습니다.
- 확장 멤버: 문제 유형이 필드를 추가할 수 있고 클라이언트는 모르는 멤버를 무시해야 합니다. 검증 오류가 여럿이면 ‹errors› 배열에 항목별 ‹pointer›(JSON Pointer)와 ‹detail›을 담는 패턴이 표준 문서의 예시입니다.

보안 면에서 스택 트레이스·SQL·내부 호스트명을 detail에 넣지 마세요. 실무 규칙은 세 가지입니다. 모든 4xx·5xx를 problem+json으로 통일하고, type 목록을 오류 카탈로그로 OpenAPI와 문서에 적고, 추적 ID를 확장 멤버로 넣습니다.

### 속도 제한과 429
한 클라이언트의 과도한 호출은 429 Too Many Requests(RFC 6585)와 ‹Retry-After›로 알립니다. Retry-After는 초 단위 정수 또는 HTTP 날짜입니다. 503은 서버 전체가 일시적으로 못 받는 상황이고 429는 이 클라이언트가 한도를 넘은 상황이라, 구분해야 클라이언트가 각각 다르게 대응하고 SLO 집계도 오염되지 않습니다. 한도 알고리즘 중 고정 창(분당 100회)은 창 경계에서 짧은 시간에 최대 두 배가 통과할 수 있고, 토큰 버킷은 평균 속도와 순간 버스트를 따로 설정할 수 있습니다. 한도 상태를 알리는 ‹RateLimit›·‹RateLimit-Policy› 헤더는 IETF 초안(-11, 2026-05-23 발행, 만료일 2026-11-24, 2026-11 기준)이라 표준이 아니며 바뀔 수 있습니다. 초안은 Retry-After가 있으면 그 값이 우선하고, 재시도가 한꺼번에 몰리지 않도록 지터를 권합니다. 만료일이 임박했으므로 적용 전에 datatracker에서 새 개정이 나왔는지 확인하세요.

### 재시도 정책을 계약의 일부로
1. 재시도 대상: 연결 실패, 타임아웃, 429, 502·503·504. 단 멱등 요청이거나 멱등 키가 있을 때만.
2. 대기: Retry-After가 있으면 그 이상, 없으면 지수 백오프에 지터(0과 min(상한, 기본×2^n) 사이의 무작위). 지터 없이는 모든 클라이언트가 같은 순간에 재시도해 서버를 다시 쓰러뜨립니다.
3. 상한: 시도 횟수와 총 소요 시간 모두. 429를 뺀 4xx는 재시도하지 않습니다.
4. 층별 곱셈: 호출 스택이 5층이고 층마다 3회까지 재시도하면 맨 아래 데이터베이스는 3의 5제곱, 243배의 부하를 받을 수 있습니다(AWS Builders' Library 「Timeouts, retries, and backoff with jitter」의 예시). 비용이 낮은 호출은 스택의 한 지점에서만 재시도하는 것이 같은 글의 권장 관행이고, 나머지 층은 실패를 그대로 전달하세요. 다만 가장 위층에서 재시도하면 앞선 호출에 들인 작업이 낭비되므로 어느 층에서 재시도할지는 설계 결정입니다.`,
      code: `import json, random

def problem(status, slug, title, detail="", **extra):
    """RFC 9457 응답: (상태, 헤더, 본문)."""
    body = {"type": f"https://api.example.com/problems/{slug}",
            "title": title, "status": status}
    if detail:
        body["detail"] = detail
    body.update(extra)                              # 확장 멤버: errors, trace_id ...
    return status, {"Content-Type": "application/problem+json"}, json.dumps(body, ensure_ascii=False)

def backoff_delays(base=0.5, cap=20.0, attempts=5, retry_after=None, rng=random):
    """지수 백오프 + 풀 지터. Retry-After보다 일찍 재시도하지 않는다."""
    for n in range(attempts):
        delay = rng.uniform(0, min(cap, base * 2 ** n))
        yield max(delay, retry_after or 0)

status, headers, body = problem(
    422, "validation-failed", "요청 값이 올바르지 않습니다",
    errors=[{"pointer": "/email", "detail": "형식이 올바르지 않습니다"}], trace_id="t-9f2c")
assert json.loads(body)["status"] == status == 422

delays = list(backoff_delays(retry_after=30))
assert len(delays) == 5 and all(d >= 30 for d in delays)`,
      codeLang: `python`,
      key: [
        `오류는 application/problem+json으로 통일한다. type(URI)이 분기 기준이고, title은 type마다 고정이며, detail은 파싱 대상이 아니다.`,
        `기계가 읽을 정보(필드별 오류 errors, 추적 ID)는 확장 멤버에 담고, 클라이언트는 모르는 멤버를 무시한다.`,
        `429는 이 클라이언트의 한도 초과, 503은 서버 전체의 일시 불가이며 둘 다 Retry-After로 재시도 시점을 알린다.`,
        `재시도는 지수 백오프와 지터, 횟수·시간 상한, Retry-After 존중, 멱등 요청에 한정을 지킨다.`,
        `RateLimit 헤더와 Idempotency-Key는 IETF 초안이므로 표준처럼 단정하지 말고 문서에 자체 규칙을 적는다.`
      ],
      pitfalls: [
        `detail 문장을 클라이언트가 파싱해 분기해서, 문구를 고치는 일이 파괴적 변경이 된다.`,
        `problem의 status 멤버와 실제 HTTP 상태가 어긋난다(코드 실수나 중간자의 변경).`,
        `스택 트레이스·SQL·내부 호스트명을 detail에 넣어 정보 노출 취약점을 만든다.`,
        `앱·SDK·게이트웨이 모든 층이 각자 재시도해 부하가 곱해지고, 지터가 없어 재시도가 같은 순간에 몰린다.`
      ]
    },
    {
      title: `멱등성과 Idempotency-Key: 타임아웃 뒤에도 한 번만 실행되게`,
      body: `1강의 문제로 돌아갑니다. POST /payments가 8초 타임아웃에 걸리면 서버가 결제를 만들었는지 알 수 없습니다. 재시도하면 이중 결제 위험이 있고 재시도하지 않으면 유실 위험이 있습니다. 해결은 서버가 이 요청은 이미 처리했다를 알아보게 만드는 것입니다. 방법은 세 가지입니다.
1. 클라이언트가 ID를 정하는 PUT: ‹PUT /orders/{client-uuid}›는 본래 멱등입니다. 같은 ID로 다시 보내면 같은 상태입니다.
2. 비즈니스 유니크 키: 주문번호·결제 시도 번호에 유니크 제약을 걸어 DB가 중복을 막습니다. 도메인에 맞게 정하면 단순하고 강력합니다.
3. Idempotency-Key 헤더: POST·PATCH 같은 비멱등 요청에 클라이언트가 의도마다 고유한 키를 붙입니다.

### 기준 구현들과 초안
- IETF 초안 draft-ietf-httpapi-idempotency-key-header-08(2026-10-22, Active I-D, 표준이 아님, 만료 2027-04-25): 값은 Structured Field 문자열이며 UUID 같은 무작위 값을 권장합니다. 서버가 키를 필수로 문서화했는데 없으면 400, 같은 키에 다른 페이로드면 422, 첫 요청이 처리 중인데 재요청이 오면 409를 권장하고, 만료 정책을 공개하라고 합니다. 요청 지문은 선택 사항이고 재생 방식은 리소스에 맡깁니다.
- Stripe API v1(2026-11 열람): 엔드포인트 실행이 시작된 뒤 첫 요청의 상태 코드와 본문을 키에 저장해 같은 키의 재시도에 그대로 돌려줍니다(500 포함). 검증 실패나 동시 실행 충돌처럼 실행이 시작되지 않은 요청은 저장하지 않으므로 다시 보낼 수 있습니다. 키는 최대 255자이고 24시간 이상 지난 키는 삭제될 수 있으며, 파라미터가 다르면 오류입니다. API v2는 성공한 작업을 반복하지 않고 실패한 작업을 가능하면 끝까지 재시도하는 다른 방식이므로 어느 버전의 규칙인지 구분해서 읽으세요.
- AWS Builders' Library: 클라이언트가 주는 고유 토큰을 상태 변경과 원자적으로 저장하고, 같은 토큰이면 같은 응답을, 다른 파라미터면 검증 오류를 돌려줍니다.
초안은 아직 표준이 아니므로 키 범위·만료·응답 재생 여부를 자기 API 문서에 직접 적어야 합니다.

### 서버 상태 기계
키 저장소의 행은 (사용자, 키)가 유일하고 지문, 상태(처리 중·완료), 저장한 응답, 만료 시각을 가집니다.
1. 먼저 키를 선점합니다. INSERT가 유니크 제약을 통과해야 이 요청이 첫 요청입니다. SELECT 후 INSERT는 동시 재시도 둘 다를 통과시키므로 안 됩니다.
2. 충돌하면 기존 행을 읽습니다. 지문이 다르면 422, 처리 중이면 409(+Retry-After), 완료면 저장한 응답을 재생합니다.
3. 처리한 뒤 결과를 기록합니다. 같은 DB라면 주문 행과 키 완료 기록을 한 트랜잭션으로 커밋해 원자적으로 만드세요. 외부 PG 호출이 끼면 그 호출에도 같은 키(또는 파생 키)를 전달해야 내 DB는 한 번, PG는 두 번이 되는 사고를 막습니다.
4. 프로세스가 중간에 죽으면 처리 중 행이 남습니다. 리스 시간을 두고, 만료되면 재실행하거나 상태를 조회해 정리하는 복구 규칙을 정합니다.

### 클라이언트 규칙과 한계
키는 사용자가 결제 버튼을 누른 의도 하나마다 만들고, 전송 전에 저장하며, 같은 의도의 모든 재시도에 재사용합니다. 재시도마다 새 키를 만들면 보호가 사라지고, 다른 주문에 키를 재사용하면 엉뚱한 응답이 재생됩니다. 지문은 메서드·경로·정규화한 본문·사용자로 계산합니다. 보존 기간은 클라이언트의 최대 재시도 시간보다 길어야 하고(흔히 24시간 이상) 정리 작업이 필요합니다. 마지막으로 멱등 키는 API의 효과를 한 번으로 만들 뿐 메시지 큐나 웹훅의 중복 전달을 없애지는 못합니다. 그쪽은 소비자의 중복 제거로 막습니다(9강).`,
      code: `import hashlib, json, sqlite3

db = sqlite3.connect(":memory:", isolation_level=None)       # 문장마다 즉시 커밋
db.execute("""create table idem(user_id text, idem_key text, fp text, state text,
              status int, body text, primary key (user_id, idem_key))""")

def handle(user_id, key, payload, work):
    fp = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    try:   # 1단계: 키 선점. 유니크 제약 충돌 = 이미 본 키
        db.execute("insert into idem(user_id, idem_key, fp, state) values (?, ?, ?, 'in_progress')",
                   (user_id, key, fp))
    except sqlite3.IntegrityError:
        fp0, state, status, body = db.execute(
            "select fp, state, status, body from idem where user_id=? and idem_key=?",
            (user_id, key)).fetchone()
        if fp0 != fp:
            return 422, {"type": "idempotency-key-reuse"}
        if state == "in_progress":
            return 409, {"type": "request-in-progress"}
        return status, json.loads(body)                      # 완료: 첫 응답을 그대로 재생
    try:
        status, body = work(payload)                         # 2단계: 실제 처리
    except Exception:
        db.execute("delete from idem where user_id=? and idem_key=?", (user_id, key))  # 확정된 것이 없으면 키 해제
        raise
    db.execute("update idem set state='done', status=?, body=? where user_id=? and idem_key=?",
               (status, json.dumps(body), user_id, key))    # 3단계: 결과 기록
    return status, body

orders = []
def work(payload):
    orders.append(payload)
    return 201, {"id": len(orders), **payload}

a = handle("u1", "k-1", {"amount": 100}, work)
b = handle("u1", "k-1", {"amount": 100}, work)      # 재시도: 같은 응답, 주문은 1건
c = handle("u1", "k-1", {"amount": 999}, work)      # 같은 키 다른 본문: 422
assert a == b and len(orders) == 1 and c[0] == 422`,
      codeLang: `python`,
      key: [
        `타임아웃 뒤의 모호함을 없애는 길은 클라이언트가 ID를 정하는 PUT, 비즈니스 유니크 키, Idempotency-Key 헤더 세 가지다.`,
        `Idempotency-Key 초안(-08, 2026-10-22, 표준 아님)의 권고: 필수인데 없으면 400, 같은 키에 다른 본문이면 422, 처리 중 재요청이면 409, 만료 정책 공개.`,
        `키 선점은 유니크 제약이 걸린 INSERT로 원자적으로 한다. 지문(메서드·경로·본문·사용자)을 함께 저장해 다른 본문의 재사용을 잡는다.`,
        `외부 결제 호출에도 같은 키(파생 키)를 전달하고, 처리 중 크래시에 대비해 리스와 복구 규칙을 둔다.`,
        `클라이언트는 의도마다 키를 하나 만들고 전송 전에 저장해 모든 재시도에 재사용한다. 키는 효과를 한 번으로 만들 뿐 메시지 중복 전달을 없애지 않는다.`
      ],
      pitfalls: [
        `키가 있는지 SELECT로 확인한 뒤 INSERT해서 동시 재시도 둘 다 처리한다.`,
        `키를 사용자·테넌트 범위 없이 전역으로 저장해 다른 사용자의 응답이 재생되거나 키가 충돌한다.`,
        `클라이언트가 재시도마다 새 키를 만들거나, 서로 다른 주문에 같은 키를 재사용한다.`,
        `본문 지문 없이 키만 보고 저장 응답을 재생해 값이 바뀐 요청이 조용히 무시된다.`
      ]
    },
    {
      title: `계약 우선 설계: OpenAPI, 하위 호환, 버전과 Deprecation`,
      body: `문서와 계약은 다릅니다. 문서는 구현을 설명하고, 계약은 구현이 따라야 하는 기준입니다. 외주에서 API 문서(Swagger UI)와 소스·기술 문서 인수인계가 납품물에 들어가고(크몽 상품 표본, 2026-11 열람), 위시켓이 기능별 완료 기준을 계약에 넣으라고 권하는 이유가 같습니다. 분쟁이 생겼을 때 기준이 되는 문서가 필요하기 때문입니다.

### OpenAPI 한 장 해부 (3.2.1, 2026-09-10)
- 최상위: ‹openapi›(문서가 따르는 규격 버전)와 ‹info›는 필수이고 ‹paths›·‹webhooks›·‹components› 중 하나 이상이 필요합니다. ‹info.version›은 규격 버전이 아니라 내 API 문서의 버전이며 둘은 무관합니다.
- ‹paths›: 경로별 operation입니다. ‹operationId›는 전체에서 유일하고(대소문자 구분) 생성되는 클라이언트 코드의 메서드 이름이 됩니다.
- ‹components›: 재사용할 스키마·응답·파라미터·보안 스킴. 오류 응답(problem+json)을 한 번 정의해 ‹$ref›로 모든 곳에 씁니다.
- ‹webhooks›는 클라이언트 호출이 아니라 제공자가 보내는 요청을 기술하고, 연산에 붙는 ‹callbacks›는 그 연산의 결과로 제공자가 보내는 요청을 기술합니다.
- 보안 스킴 유형은 apiKey, http, mutualTLS, oauth2, openIdConnect입니다. 스키마는 JSON Schema 계열이고 null 허용은 type 배열(‹[string, "null"]›)로 표현합니다. 3.2는 HTTP QUERY용 ‹query› 필드도 정의합니다.

### 계약 우선 작업 흐름
1. 규약 합의: 식별자, 오류 type 카탈로그, 페이지네이션, 멱등·동시성 헤더.
2. YAML 작성과 리뷰.
3. 린트: Spectral의 ‹spectral:oas› 규칙 세트에 팀 규칙을 추가합니다.
4. 목 서버: Prism의 ‹prism mock›으로 앱 팀이 구현 전에 병행 개발합니다.
5. 구현 뒤 응답이 계약과 같은지 검증합니다(Prism 검증 프록시나 계약 테스트).
6. CI에서 이전 버전과 비교합니다(oasdiff의 breaking 검사).
코드 우선(FastAPI·springdoc이 코드에서 문서를 생성)은 한 팀이 소비자이기도 할 때 빠르고, 소비자가 여럿이거나 병행 개발·인수 검수가 있으면 계약 우선이 낫습니다. 절충안은 코드에서 생성하되 결과 파일을 저장소에 커밋하고 diff를 CI에서 검사하는 것입니다. 도구별 OpenAPI 3.2 지원은 제각각입니다. Spectral README는 한 곳에 3.0~3.2, 다른 곳에 3.0·3.1·2.0으로 엇갈리게 적고, Prism README는 3.1·3.0·2.0까지만 적으며, oasdiff는 3.1·3.2 지원 절을 따로 둡니다(2026-11 기준). 쓰기 전에 자기 계약 파일로 직접 시험하세요.

### 호환 변경과 파괴 변경
- 호환: 새 엔드포인트, 응답의 새 선택 필드, 요청의 새 선택 파라미터.
- 파괴: 필드 삭제·이름 변경·타입 변경, 선택을 필수로, 상태 코드·오류 type 변경, 인증 요구 추가, 기본 정렬·기본 페이지 크기 변경. 응답 enum에 값을 추가하는 것도 클라이언트의 exhaustive switch를 깰 수 있어 사전 고지가 필요합니다.
이 구분은 클라이언트가 모르는 필드를 무시하는 관용적 읽기를 구현해야 성립합니다.

### 버전과 Deprecation
- 경로(‹/v1›): 눈에 보이고 라우팅이 쉽지만 API 전체를 한꺼번에 올리게 되기 쉽습니다.
- 헤더·미디어 타입: URL은 안정적이지만 도구 지원과 캐시(Vary)를 신경 써야 합니다.
- 날짜 고정 버전: Stripe는 계정마다 버전을 고정하고 요청마다 ‹Stripe-Version›으로 덮어씁니다. 2024-09-30.acacia부터 월간 릴리스는 파괴 변경이 없고 연 2회 메이저에서만 파괴 변경을 넣으며, 2026-11 기준 현행은 2026-10-28.endive입니다.

폐기 신호에는 표준 헤더가 있습니다. RFC 9745(2025-03)의 ‹Deprecation›은 Structured Field 날짜(예 ‹@1688169599›)로, RFC 8594(Informational)의 ‹Sunset›은 HTTP 날짜로 종료 시점을 알리며 Sunset은 Deprecation 날짜보다 이르면 안 됩니다. 이전 안내 문서는 ‹Link› 헤더의 deprecation 관계로 가리킵니다. 헤더만으로는 부족하고, 클라이언트별 사용량 계측, 직접 공지, 종료일 이후의 410 또는 안내 오류까지가 하나의 절차입니다.`,
      code: `# 린트·목 서버 도구와의 호환을 위해 3.1.0으로 작성한 예 (도구별 3.2 지원은 README 확인)
openapi: 3.1.0
info: {title: Orders API, version: 1.4.0}
servers: [{url: https://api.example.com/v1}]
paths:
  /orders:
    post:
      operationId: createOrder
      parameters:
        - {name: Idempotency-Key, in: header, required: true, schema: {type: string, maxLength: 255}}
      requestBody:
        required: true
        content:
          application/json: {schema: {$ref: '#/components/schemas/NewOrder'}}
      responses:
        '201':
          description: 생성됨
          headers: {Location: {schema: {type: string, format: uri-reference}}}
          content: {application/json: {schema: {$ref: '#/components/schemas/Order'}}}
        '400': {$ref: '#/components/responses/Problem'}
        '409': {$ref: '#/components/responses/Problem'}
        '422': {$ref: '#/components/responses/Problem'}
        '429': {$ref: '#/components/responses/Problem'}
components:
  responses:
    Problem:
      description: RFC 9457 오류
      content:
        application/problem+json: {schema: {$ref: '#/components/schemas/Problem'}}
  schemas:
    NewOrder:
      type: object
      required: [items]
      properties:
        items:
          type: array
          minItems: 1
          items: {type: object, required: [sku, qty], properties: {sku: {type: string}, qty: {type: integer, minimum: 1}}}
    Order:
      allOf:
        - {$ref: '#/components/schemas/NewOrder'}
        - {type: object, required: [id, status], properties: {id: {type: string}, status: {type: string, enum: [pending, paid]}}}
    Problem:
      type: object
      properties: {type: {type: string, format: uri-reference}, title: {type: string}, status: {type: integer}, detail: {type: string}}`,
      codeLang: `yaml`,
      key: [
        `계약은 구현이 따라야 할 기준이다. OpenAPI에 정상 응답뿐 아니라 오류 응답, 필수 헤더(Idempotency-Key, Location), 인증, 웹훅까지 적는다.`,
        `OpenAPI 3.2.1(2026-09-10)에서 openapi 필드는 규격 버전, info.version은 내 API 문서의 버전이며 operationId는 전체에서 유일하다.`,
        `흐름은 규약 합의, YAML 작성, 린트(Spectral), 목 서버(Prism), 구현 검증, CI의 breaking 검사(oasdiff) 순이다.`,
        `호환 변경은 추가(선택 필드·새 엔드포인트), 파괴 변경은 삭제·이름·타입 변경과 선택을 필수로 바꾸는 것 등이며, 응답 enum 추가도 위험하다.`,
        `폐기는 Deprecation(RFC 9745)·Sunset(RFC 8594) 헤더, 사용량 계측, 직접 공지, 종료 후 410까지 하나의 절차다.`
      ],
      pitfalls: [
        `문서를 구현 뒤 손으로 쓰거나 워드 파일로 관리해 인수 시점에야 필드명·오류 형식이 어긋난 것을 발견한다.`,
        `정상 응답만 적은 계약을 만든다. 오류 응답·인증·필수 헤더가 빠지면 앱 팀이 추측으로 구현한다.`,
        `enum 추가나 optional을 required로 바꾸는 변경을 호환으로 착각해 구버전 앱을 깨뜨린다.`,
        `/v2를 만들고 /v1의 종료일과 사용량 측정 없이 방치해 병행 운영 비용이 영구화되거나 갑자기 종료한다.`
      ]
    },
    {
      title: `비동기 경계: 202 작업, 대용량 파일, 웹훅 설계`,
      body: `요청-응답 한 번에 끝나지 않는 일이 외주 API의 어려운 절반입니다. 오래 걸리는 처리, 큰 파일, 서버가 클라이언트를 호출하는 웹훅입니다. 셋 모두 연결이 끊겨도 일이 어떻게 됐는지 알 수 있는가가 설계의 핵심입니다.

### 오래 걸리는 작업: 202와 작업 리소스
게이트웨이와 로드밸런서에는 유휴·응답 타임아웃이 있으므로 수십 초를 넘는 처리를 요청 안에 붙들면 안 됩니다. ‹POST /reports›가 작업을 큐에 넣고 ‹202 Accepted›와 ‹Location: /jobs/j_91›을 돌려줍니다. ‹GET /jobs/j_91›은 상태(queued, running, succeeded, failed)와 진행률, 결과 링크를 보여주고 ‹Retry-After›로 폴링 간격을 안내합니다. 완료 뒤에는 303 See Other로 결과 리소스로 보내는 방식도 있습니다. 202는 처리 성공이 아니라 접수 사실만 말하며, 접수 요청에도 멱등 키를 적용합니다.

### 대용량 파일: presigned URL
수백 MB 업로드를 앱 서버가 중계하면 메모리·대역폭·타임아웃이 모두 병목입니다. 흐름은 (1) 클라이언트가 업로드 의사를 API에 알림 (2) 서버가 인가·용량·형식을 확인하고 수명이 짧은 서명된 URL을 발급 (3) 클라이언트가 오브젝트 스토리지로 직접 PUT (4) 완료를 API에 알리거나 스토리지 이벤트로 받아 서버가 크기·형식·체크섬을 재검증하고 레코드를 활성화합니다. URL 유효 시간은 분 단위로 짧게, 경로에는 사용자 접두사를, 허용 크기와 Content-Type 조건은 서명에 넣으세요. 다운로드 재개는 Range 요청(206 Partial Content, 범위 오류 416, If-Range)으로 합니다.

### 웹훅: 서버가 클라이언트를 호출한다
웹훅은 이벤트가 생기면 제공자가 소비자의 HTTPS 엔드포인트로 POST하는 방식이며, 현실적으로 최소 한 번 전달(at-least-once)입니다. 중복·지연·순서 역전이 정상이라는 뜻입니다.
- 이벤트 봉투: 재시도해도 변하지 않는 ‹id›, 계층형 ‹type›(‹order.paid›), 발생 시각, 작은 ‹data›. Stripe는 전체 객체를 담는 스냅샷 이벤트와, 알림만 주고 최신 객체를 API로 조회하게 하는 얇은 이벤트를 모두 제공합니다.
- 서명: 원본 본문 바이트에 대해 계산합니다. Standard Webhooks(v1.0.0)는 ‹webhook-id›·‹webhook-timestamp›·‹webhook-signature› 헤더를 쓰고, id·타임스탬프·본문을 점으로 이은 값을 HMAC-SHA256으로 서명해 ‹v1,› 접두사를 붙인 base64 값으로 보냅니다. 여러 서명은 공백으로 구분합니다. Stripe는 ‹Stripe-Signature: t=…,v1=…›에 타임스탬프와 본문을 점으로 이은 값을 서명합니다. 수신자는 상수 시간 비교로 검증하고 허용 오차(Stripe 라이브러리 기본 5분, 2026-11 열람 기준) 밖의 타임스탬프를 거부해 재생 공격을 막습니다. 비밀 교체 때는 서명을 둘 보내 무중단으로 전환합니다(Stripe는 최대 24시간 병행).
- 전달: 수신자는 검증 직후 2xx를 즉시 반환하고 처리는 큐로 넘기며, 3xx는 실패로 취급됩니다. 제공자는 지수 백오프와 지터로 며칠에 걸쳐 재시도합니다(2026-11 열람 기준 Stripe 라이브 모드는 최대 3일, Standard Webhooks의 예시 일정은 약 75시간 동안 10회). 계속 실패하면 엔드포인트를 비활성화하고 이메일 같은 다른 경로로 알립니다. Standard Webhooks는 수신자가 410 Gone을 돌려주면 그 엔드포인트로의 전송을 멈추라고 권합니다.
- 수신 멱등과 순서: 이벤트 ID를 저장해 중복을 건너뜁니다. 순서는 보장되지 않으므로(Stripe 문서가 명시) 이벤트의 생성 시각으로 순서를 판단하지 말고 리소스 버전을 비교하거나 API로 최신 상태를 다시 조회합니다.
- 제공자 쪽 SSRF: 고객이 등록한 URL로 서버가 요청을 보내므로 사설 IP·메타데이터 주소를 차단하고 리다이렉트를 따르지 않습니다.
- 대사: 전달이 끝내 실패할 수 있으니 소비자는 주기적으로 이벤트 목록 API로 누락을 보정합니다. OpenAPI에서는 ‹webhooks›로 이 계약을 기술합니다.`,
      code: `import base64, hashlib, hmac, time

def sign(secret, msg_id, ts, raw_body):
    """원본 바이트에 대한 서명. 서명 형식은 Standard Webhooks(v1,base64)를 따른 단순화 예
    (whsec_ 비밀 문자열의 base64 해독 같은 키 처리는 생략)."""
    signed = f"{msg_id}.{ts}.".encode() + raw_body
    return "v1," + base64.b64encode(hmac.new(secret, signed, hashlib.sha256).digest()).decode()

def verify(secret, headers, raw_body, seen, tolerance=300):
    msg_id = headers["webhook-id"]
    ts = int(headers["webhook-timestamp"])
    if abs(time.time() - ts) > tolerance:               # 재생 공격 방어
        return "reject: timestamp"
    expected = sign(secret, msg_id, ts, raw_body)
    candidates = headers["webhook-signature"].split()   # 비밀 교체 중에는 서명이 여럿
    if not any(hmac.compare_digest(expected.encode(), c.encode()) for c in candidates):
        return "reject: signature"                      # 상수 시간 비교
    if msg_id in seen:
        return "ok: duplicate, skip"
    seen.add(msg_id)                                    # 실서비스에서는 처리와 원자적으로 기록
    return "ok: process"

secret, body, seen = b"whsec-demo", b'{"type":"order.paid","data":{"id":"o_1"}}', set()
ts = int(time.time())
hdr = {"webhook-id": "evt_1", "webhook-timestamp": str(ts),
       "webhook-signature": sign(secret, "evt_1", ts, body)}
assert verify(secret, hdr, body, seen) == "ok: process"
assert verify(secret, hdr, body, seen) == "ok: duplicate, skip"
assert verify(secret, hdr, body + b" ", seen) == "reject: signature"
old = {**hdr, "webhook-timestamp": str(ts - 3600)}
assert verify(secret, old, body, seen) == "reject: timestamp"`,
      codeLang: `python`,
      key: [
        `오래 걸리는 일은 202 Accepted와 작업 리소스(Location)로 접수하고, 폴링 또는 303·웹훅으로 결과를 알린다. 202는 접수일 뿐 성공이 아니다.`,
        `큰 파일은 앱 서버를 거치지 않고 짧은 수명의 presigned URL로 스토리지에 직접 올리고, 완료 뒤 서버가 크기·형식·체크섬을 재검증한다.`,
        `웹훅은 at-least-once다. 서명은 원본 바이트에 대해 계산·검증하고, 타임스탬프 허용 오차와 상수 시간 비교를 쓴다.`,
        `수신자는 즉시 2xx를 반환하고 큐로 처리하며, 이벤트 ID로 중복을 제거하고, 순서는 보장되지 않으므로 버전 비교나 재조회로 대응한다.`,
        `제공자는 지수 백오프와 지터로 며칠 재시도하고 지속 실패 시 엔드포인트를 비활성화하며, 소비자는 대사 작업으로 누락을 보정한다.`
      ],
      pitfalls: [
        `웹훅 핸들러에서 DB·외부 호출 같은 무거운 처리를 동기로 해 타임아웃과 재전송 폭풍을 만든다.`,
        `파싱 후 재직렬화한 JSON으로 서명을 검증하고, 문자열 == 로 비교하며, 타임스탬프를 확인하지 않는다.`,
        `이벤트 도착 순서를 가정하거나 생성 시각으로 순서를 판단해 오래된 상태가 최신 상태를 덮어쓴다.`,
        `웹훅만 믿고 대사 작업을 두지 않아, 며칠을 넘긴 실패 이벤트가 영구 누락된다.`
      ]
    },
    {
      title: `통합 사례 연구: 외주 주문·결제 API를 진단·재설계·납품하기`,
      body: `가상 사례입니다. 쇼핑몰 SaaS 스타트업이 모바일 앱, 관리자 웹, 파트너 연동에 쓸 주문·결제 API를 정리해 달라고 의뢰했습니다. 이미 운영 중인 API가 있고 증상 목록이 있습니다. 아래 수치는 설명을 위한 가정입니다.

### 증상을 메커니즘으로 번역한다
1. 중복 주문(결제 버튼 연타와 약한 네트워크에서 0.4%): 앱 HTTP 라이브러리의 자동 재시도, 그리고 서버 타임아웃 8초가 결제사 p99 지연 9초보다 짧다는 조합입니다. 서버는 처리를 끝냈는데 응답을 잃은 요청이 다시 실행됩니다. 처방은 Idempotency-Key, 요청 지문, 409·422 분기, PG 호출에 파생 키 전달입니다(7강).
2. 관리자 가격이 예전 값으로 복구: 전체 PUT과 마지막 저장 승리의 조합입니다. 처방은 ETag·If-Match, 서버의 428·412, 화면의 충돌 해결 UI입니다(4강).
3. 다른 사용자의 주문 목록이 가끔 보임: CDN 도입 뒤 개인화 응답에 Cache-Control이 없고, CDN이 Authorization을 캐시 키에서 무시하도록 설정되어 있었습니다. 처방은 개인화 응답의 private·no-store, 공용 카탈로그에만 s-maxage, CDN 설정 점검과 재현 테스트입니다(5강). 개인정보 노출 사고이므로 최우선입니다.
4. 오류 형식이 엔드포인트마다 다름: 앱이 문자열을 파싱합니다. 처방은 problem+json과 type 카탈로그입니다(6강).
5. 목록 후반부가 느리고 중복 표시: offset 방식입니다. 처방은 keyset 커서입니다(3강).
6. 파트너 웹훅에서 재고 이중 차감과 순서 역전: 처방은 이벤트 ID 기반 수신 멱등, 버전 비교 또는 재조회, 즉시 2xx 후 큐 처리입니다(9강).
7. 필드명 변경 요구(amount를 amount_krw로): 구버전 앱이 남아 있으므로 새 필드 추가, 기존 필드 deprecated, Deprecation·Sunset 헤더, 사용량 계측 뒤 제거입니다(8강).

### 우선순위와 일정
돈, 개인정보, 데이터 유실 순서로 3번, 1번, 2번을 먼저 처리합니다. 3번은 설정과 헤더 수정이라 반나절 안에 핫픽스하고 회귀 테스트를 남깁니다. 작업 배분의 경험칙은 진단과 계약 합의 25% 안팎, 구현 45%, 테스트·문서·인수 30%입니다(가정이며 프로젝트마다 다릅니다). 계약 합의를 첫 마일스톤으로 세워야 앱 팀이 목 서버로 병행 개발하고 범위 분쟁이 줄어듭니다.

### 인수 기준은 시나리오로 쓴다
정상 동작한다는 문장은 검수할 수 없습니다. 이렇게 씁니다. 같은 의도 1,000건을 각각 1~5회 무작위로 재전송해도 주문 행이 정확히 1,000개이다(10회 연속). 동시 수정 50건에서 유실된 갱신이 0이다. 모든 4xx·5xx 응답이 problem+json이고 status 멤버가 HTTP 상태와 같다. OpenAPI 문서와 실제 응답이 불일치하는 항목이 0이다. 같은 웹훅 이벤트를 20회 보내도 재고 차감이 1회다. 목록 마지막 페이지의 p95가 기준 이하다.

### 납품 패키지
OpenAPI 파일과 린트 설정, 목 서버 실행법, 구현 소스, 오류 type 카탈로그, 멱등 규칙 문서(키 범위·만료·재생 규칙), 캐시 전략표, 버전·Deprecation 정책, 웹훅 가이드와 서명 검증 샘플, 변경 이력, 인수 시험 결과 보고서입니다. 계약서에는 인수 뒤 하자보수 범위와 기간을 함께 적습니다.`,
      code: `import random, threading, uuid

orders, seen, lock = [], {}, threading.Lock()

def server_create(key, amount):
    """멱등 키를 지키는 가짜 서버. 실제 시험에서는 이 함수를 HTTP 호출로 바꾼다."""
    with lock:
        if key in seen:
            return seen[key]                     # 재생
        orders.append(amount)
        seen[key] = (201, len(orders))
        return seen[key]

def client(intents):
    for key, amount in intents:
        for _ in range(random.randint(1, 5)):    # 타임아웃을 가정한 무작위 재전송
            server_create(key, amount)

intents = [(str(uuid.uuid4()), random.randint(1, 100)) for _ in range(1000)]
workers = [threading.Thread(target=client, args=(intents[i::8],)) for i in range(8)]
for t in workers:
    t.start()
for t in workers:
    t.join()
assert len(orders) == len(intents), f"중복 주문 {len(orders) - len(intents)}건"
print("OK: 의도", len(intents), "건 -> 주문", len(orders), "건")`,
      codeLang: `python`,
      key: [
        `증상을 땜질하지 말고 메커니즘(멱등성·낙관적 동시성·캐시·오류 계약·페이지네이션·웹훅 멱등·호환성)으로 번역해 계층별로 고친다.`,
        `우선순위는 돈·개인정보 노출·데이터 유실 순이다. 개인정보가 새는 캐시 설정은 핫픽스와 회귀 테스트가 먼저다.`,
        `인수 기준은 수치와 시나리오로 쓴다: 무작위 재전송 1,000건에서 중복 0, 동시 수정 유실 0, 오류 100% problem+json, 문서-응답 불일치 0.`,
        `계약 합의를 첫 마일스톤으로 두면 목 서버로 병행 개발이 가능해지고 범위 분쟁이 줄어든다.`
      ],
      pitfalls: [
        `타임아웃 연장이나 재시도 끄기처럼 증상만 가리는 조치로 끝내고 멱등성·캐시 같은 원인 계층은 고치지 않는다.`,
        `계약과 오류 카탈로그 없이 구현부터 시작해 앱 팀과 통합 시점에 어긋난다.`,
        `인수 기준을 동작한다로 끝내 재시도·동시성 시나리오를 검증하지 않고, 운영 뒤 분쟁이 생긴다.`,
        `하위 호환 정책과 사용량 계측 없이 필드명을 바꿔 구버전 앱 사용자가 장애를 겪는다.`
      ]
    }
  ],
  labs: [
    {
      title: `curl로 해부하는 HTTP 의미론: 조건부 요청·낙관적 동시성·캐시 실험실`,
      scenario: `가상의 클라이언트가 "관리자 화면에서 가끔 가격이 예전 값으로 돌아가고, 브라우저가 같은 목록을 계속 새로 받아 느리다"고 신고했습니다. 코드를 고치기 전에 HTTP가 이미 제공하는 도구(조건부 요청, 낙관적 동시성, Cache-Control)로 문제를 재현하고 해결되는지 측정하는 작은 실험실을 만드는 것이 이 실습의 목표입니다. 필요한 도구는 모두 무료입니다: Python 3(표준 라이브러리 또는 FastAPI), curl, 브라우저 개발자 도구. 모든 결론은 추측이 아니라 헤더·상태 코드·카운터 수치로 남기세요.`,
      steps: [
        `‹/products/{id}› 서버를 만든다(언어 자유, 저장은 메모리 dict와 version 정수). GET은 ‹ETag›와 ‹Cache-Control›을 붙이고, ‹If-None-Match›가 일치하면 304를 돌려준다.`,
        `PUT은 ‹If-Match›가 일치할 때만 갱신(200과 새 ETag)하고, 불일치는 412, 조건 헤더가 없으면 428, ‹If-None-Match: *›로 생성하려는데 이미 있으면 412를 돌려준다. 그 밖에 허용하지 않는 메서드는 405와 ‹Allow›, 지원하지 않는 Content-Type은 415, 인증 헤더가 없으면 401과 ‹WWW-Authenticate›로 응답하게 한다. 비교와 갱신은 하나의 락 안에서 수행한다.`,
        `curl -i로 시나리오 12개의 표를 만든다(요청, 기대 상태, 실제 상태, 근거 RFC 절). 예: GET 200, 재GET 304, 낡은 If-Match 412, 조건 없는 PUT 428, 허용 안 된 메서드 405와 Allow, 잘못된 Content-Type 415, 인증 없음 401과 WWW-Authenticate, 없는 ID 404, HEAD, OPTIONS.`,
        `동시성 실험: 스레드 50개가 각자 GET한 뒤 자기 필드 하나만 바꾼 전체 본문을 PUT하는 클라이언트를 만든다. 서버의 조건 요구를 끈 구성(마지막 저장이 이김)과 켠 구성에서 각각 20라운드를 실행하고, 최종 상태에서 유실된 갱신 수를 센다.`,
        `412를 받은 클라이언트가 재조회·병합·재시도하는 루프를 구현하고, 모든 갱신이 반영될 때까지의 평균 시도 횟수와 최대 시도 횟수를 기록한다.`,
        `브라우저 개발자 도구로 ‹max-age=5›, ‹no-cache›, ‹no-store›, ‹private›의 네 정책을 같은 페이지에 적용하고, 각각 10번 새로고침·재방문했을 때 서버 로그의 요청 수와 응답 상태(200, 304, 디스크 캐시)를 표로 정리한다.`,
        `결과를 1쪽 노트로 요약한다: 각 헤더가 어느 계층(브라우저·프록시·서버)의 어떤 결정을 바꿨는지 한 문장씩.`
      ],
      accept: [
        `시나리오 12개 표가 있고 기대 상태와 실제 상태가 모두 일치하거나, 불일치 원인이 기록되어 있다.`,
        `조건 요구를 끈 구성에서는 유실된 갱신이 1건 이상 재현되고, 켠 구성에서는 0건이며 최종 상태가 성공한 갱신 수와 같다.`,
        `412 재시도 루프에서 모든 클라이언트의 모든 갱신이 최종 상태에 반영됨을 카운터로 증명했고 평균·최대 시도 횟수가 기록되어 있다.`,
        `네 가지 Cache-Control 정책별 서버 도달 요청 수 표가 있고, no-cache(재검증)와 no-store(저장 금지)의 차이를 로그로 설명했다.`
      ],
      stretch: `weak ETag(W/)를 도입하고 gzip 표현마다 다른 ETag를 내보내며, If-None-Match의 ETag 목록 처리와 Range 요청(206, 범위 오류 416)까지 구현해 12개 시나리오 표를 18개로 확장한다.`
    },
    {
      title: `멱등 주문 API와 무작위 재전송 증명: Idempotency-Key·problem+json·429`,
      scenario: `가상의 모바일 커머스 클라이언트가 "결제 타임아웃 뒤 앱이 재시도하면 가끔 주문이 두 번 생긴다"고 신고했습니다. 주문 생성 API에 Idempotency-Key를 도입하고, 오류 응답을 RFC 9457로 통일하며, 사용자별 속도 제한을 넣은 뒤, 클라이언트가 무작위로 요청을 재전송해도 중복 주문이 0건임을 자동 테스트로 증명해야 합니다. 이 실습의 산출물은 코드만이 아니라 재현 가능한 시험 보고서입니다. DB는 SQLite 또는 로컬 PostgreSQL(Docker)을 쓰고, 언어는 익숙한 것을 고르세요.`,
      steps: [
        `‹POST /orders›와 ‹GET /orders/{id}›를 구현한다. ‹Idempotency-Key›가 없으면 400(problem+json)으로 응답한다.`,
        `키 저장 테이블을 만든다: (user_id, key) 유니크, 요청 지문(메서드·경로·정규화한 본문 해시), 상태(in_progress·done), 저장한 응답, 만료 시각. 처리 전에 INSERT로 키를 선점한다.`,
        `충돌 처리를 구현한다: 같은 키와 같은 지문의 완료 건은 저장한 응답을 재생, 다른 지문은 422, 처리 중은 409와 ‹Retry-After›. 키 보존 기간은 24시간으로 두고 청소 작업을 만든다.`,
        `모든 오류 응답을 problem+json 형식으로 통일하고, 오류 유형 URI 카탈로그를 4개 이상 문서로 남긴다. 유형은 키 누락, 키 재사용, 처리 중, 검증 실패처럼 이름을 붙이고 각각 ‹type›, ‹title›, 해결 방법을 한국어로 적는다.`,
        `사용자당 분당 60회의 토큰 버킷 속도 제한을 넣고 초과 시 429와 Retry-After를 돌려준다. 클라이언트 재시도 함수는 지수 백오프와 지터, Retry-After 존중, 시도·시간 상한을 지킨다.`,
        `시험 하네스를 만든다: 주문 의도 1,000건을 각각 1~5회 무작위로 재전송하고, 8~16개 동시 워커를 쓰며, 일부 요청은 서버 처리 중에 클라이언트가 연결을 끊게(짧은 타임아웃) 한다.`,
        `서버 프로세스를 처리 도중 강제 종료했다가 재시작하는 시나리오를 1회 실행해, 처리 중으로 남은 고아 키가 리스 만료 뒤 복구되는지 확인한다.`,
        `보고서를 쓴다: 의도 수, 총 요청 수, 주문 행 수, 상태 코드 분포(201, 재생, 409, 422, 429), p50·p95 지연.`
      ],
      accept: [
        `하네스를 3회 연속 실행했을 때 주문 행 수가 항상 의도 수(1,000)와 같다(중복 0건).`,
        `같은 키에 다른 본문을 보내면 항상 422이고, 처리 중인 키로 재요청하면 항상 409임을 자동 테스트로 확인했다.`,
        `모든 오류 응답이 application/problem+json이며 본문의 status가 HTTP 상태와 일치함을 자동 검사로 확인했다(위반 0건).`,
        `고아 키가 복구되기까지 걸린 시간과 복구 규칙(재실행 또는 상태 조회)이 보고서에 기록되어 있다.`
      ],
      stretch: `외부 결제사를 흉내 내는 모의 서버를 두고 파생 키를 전달해 모의 서버의 결제 호출 수가 주문 수와 같음을 증명하고, 키를 UUIDv7으로 바꿔 키 테이블 인덱스 크기와 삽입 시간 변화를 비교한다.`
    },
    {
      title: `납품형 미니 프로젝트: 주문·결제 API 계약 우선 패키지와 웹훅 가이드`,
      scenario: `가상의 소규모 쇼핑몰 SaaS가 앱 팀과 파트너사에 넘길 주문·결제 API를 2주 안에 납품해 달라고 요청했습니다. 요구는 주문 목록 조회, 생성, 취소, 수정(동시 수정 보호), 결제 완료 웹훅입니다. 인수 조건은 OpenAPI 문서, 구현 전부터 쓸 수 있는 목 서버, 구현, 하위 호환 정책, 웹훅 연동 가이드입니다. 실제 외주와 같은 구성으로 저장소 한 폴더에 납품 패키지를 만들고, 모든 수용 기준을 수치로 정해 pass/fail 표로 보고하세요. 도구는 Spectral, Prism, oasdiff를 포함해 모두 무료 오픈소스를 쓰며, 설치 방법과 지원하는 OpenAPI 버전은 각 README에서 확인하세요.`,
      steps: [
        `1쪽 요구서를 쓴다: 엔드포인트 6개 이내, 오류 type 카탈로그, 수치 수용 기준 5개 이상(중복 주문 0, 동시 수정 유실 0, 목록 10만 건에서 p95 300ms 이하, 모든 오류 problem+json, 웹훅 중복 전달 시 중복 처리 0).`,
        `구현보다 먼저 OpenAPI 3.1 YAML 계약을 작성한다. 경로와 컴포넌트, 멱등 키 헤더, ETag와 If-Match 헤더, 커서 페이지네이션, 오류 응답 스키마, 결제 완료 웹훅(‹order.paid›), 보안 스킴을 모두 포함한다.`,
        `Spectral(‹spectral:oas›)로 린트 오류 0을 만들고 자체 규칙 3개를 추가한다(예: 모든 4xx에 problem 응답, operationId 필수, 목록의 limit 최대값 정의).`,
        `Prism 목 서버로 앱 팀 시나리오 curl 5개가 구현 전에 통과함을 확인한다.`,
        `구현한 뒤 Prism 검증 프록시나 스키마 검증 테스트로 실제 응답이 계약과 일치하는지 확인한다(불일치 0).`,
        `웹훅 발신기와 수신기를 만든다: 원본 바이트 서명 검증, 타임스탬프 허용 오차 5분, 이벤트 ID 중복 제거. 수신기가 500을 돌려주는 상황에서 지수 백오프와 지터로 최소 5회 재시도하는 시뮬레이션과 순서 역전 재현을 포함한다.`,
        `변경 시나리오: amount를 amount_krw로 바꾸는 요구를 새 필드 추가+deprecated, /v2 병행, 날짜 고정 버전 헤더 중 하나로 처리한다. oasdiff로 변경 전후를 비교해 파괴 변경을 분류하고 Deprecation·Sunset 헤더를 붙인다.`,
        `시드 데이터 10만 건에서 목록의 offset 방식과 cursor 방식을 마지막 페이지 기준으로 각 100회 측정해 p50·p95 표를 만든다.`,
        `납품 폴더를 정리한다: README(실행·시험 방법), CHANGELOG, 인수 체크리스트, 운영 메모(재시도·속도 제한 지표), 시험 결과 보고서.`
      ],
      accept: [
        `Spectral 오류 0건이고 oasdiff 비교에서 의도하지 않은 파괴 변경이 0건이다(의도한 변경은 CHANGELOG에 기록).`,
        `수치 수용 기준 5개 이상이 각각 측정값과 pass/fail로 보고서에 있다.`,
        `같은 웹훅 이벤트를 20회 전달해도 처리가 1회이며, 잘못된 서명과 1시간 지난 타임스탬프는 거부됨을 자동 테스트로 확인했다.`,
        `offset과 cursor의 마지막 페이지 p50·p95 측정 표가 있고, 결과에 대한 해석 한 단락이 있다.`,
        `납품 폴더만 받은 제3자가 README만 보고 목 서버 실행과 시험을 재현할 수 있다.`
      ],
      stretch: `Spectral과 oasdiff를 GitHub Actions 같은 무료 CI에 연결해, 계약 파일을 바꾼 PR에서 의도하지 않은 파괴 변경이나 린트 오류가 있으면 빌드가 실패하게 만든다.`
    }
  ],
  quiz: [
    {
      q: `모바일 커머스 앱의 결제 요청 POST /payments가 약한 네트워크에서 8초 타임아웃에 걸리고, 앱의 HTTP 라이브러리가 자동으로 2회 재시도한다. 서버는 평소 2초 안에 응답하지만 결제사 지연 때는 10초가 걸리며, 운영 로그에서 0.3%의 중복 결제가 확인됐다. 가장 적절한 해결은?`,
      choices: [
        `서버 응답 타임아웃을 8초에서 30초로 늘린다`,
        `클라이언트의 자동 재시도를 끈다`,
        `클라이언트가 결제 의도마다 Idempotency-Key를 한 번 만들어 모든 재시도에 같은 값으로 보내고, 서버는 키를 원자적으로 선점해 같은 응답을 재생한다`,
        `엔드포인트 메서드만 PUT으로 바꾼다(요청 URI는 그대로 /payments)`
      ],
      answer: 2,
      why: `타임아웃은 서버가 처리했는지 알려 주지 못하므로, 재시도가 안전하려면 서버가 같은 의도를 알아봐야 한다. 키 선점과 응답 재생이 그것을 보장한다. 재시도를 끄는 안이 가장 그럴듯하지만 네트워크에서 유실된 요청이 그대로 실패로 남고, 사용자가 버튼을 다시 누르면 같은 문제가 재발한다. 타임아웃 연장은 확률만 낮추며, PUT의 멱등성은 클라이언트가 정한 리소스 URI를 교체하는 의미에서 나오지 메서드 이름만 바꾼다고 생기지 않는다.`
    },
    {
      q: `두 관리자가 같은 상품을 편집하는 요청 기록이다.
A  GET /products/42                     -> 200  ETag: "v7"
B  GET /products/42                     -> 200  ETag: "v7"
A  PUT /products/42  If-Match: "v7"     -> 200  ETag: "v8"
B  PUT /products/42  If-Match: "v7"     -> ?
서버가 RFC 9110 의미론에 맞게 B에게 돌려줄 응답은?`,
      choices: [
        `412 Precondition Failed. B는 최신 표현을 다시 GET해 병합한 뒤 새 ETag로 재시도한다`,
        `409 Conflict. 조건 헤더 실패는 모두 409로 표현한다`,
        `200 OK. B의 본문으로 덮어쓰고 ETag를 v9로 올린다`,
        `428 Precondition Required. 조건 헤더가 필요하다고 알린다`
      ],
      answer: 0,
      why: `If-Match 조건이 거짓이면 서버는 요청을 실행하지 않아야 하고, B의 변경은 아직 반영되지 않았으므로 응답은 412다(요구한 최종 상태가 이미 반영된 재시도에만 2xx가 허용된다). 409도 충돌을 뜻해서 그럴듯하지만 그것은 리소스의 현재 상태와 요청 자체의 충돌에 쓰고, 클라이언트가 건 조건의 실패에는 412가 정해진 응답이다. 200으로 덮어쓰면 A의 변경이 조용히 사라지는 lost update이고, 428은 B가 조건 헤더를 아예 보내지 않았을 때의 응답이다.`
    },
    {
      q: `CDN을 도입한 뒤 "내 주문 목록에 다른 사람의 주문이 가끔 보인다"는 신고가 들어왔다. GET /me/orders는 Authorization 토큰으로 사용자를 구분하고, 응답 헤더는 Cache-Control: max-age=300 뿐이며, CDN은 기본 설정에서 Authorization 헤더를 캐시 키에 넣지 않는다. 가장 적절한 조치는?`,
      choices: [
        `max-age를 300초에서 5초로 줄여 노출 시간을 줄인다`,
        `Vary: User-Agent를 추가해 캐시 키를 나눈다`,
        `/me 이하 모든 요청에 새 토큰을 발급한다`,
        `개인화 응답에 Cache-Control: private(민감하면 no-store)을 명시하고, 공용 카탈로그만 public·s-maxage로 분리하며, CDN의 Authorization 처리 설정을 점검하고 재현 테스트를 남긴다`
      ],
      answer: 3,
      why: `원인은 공유 캐시가 저장할 수 있는 개인화 응답이므로 저장 자체를 막아야 한다. 수명을 줄이는 안은 노출 창을 줄일 뿐 다른 사용자에게 보이는 결함은 그대로 남는다. User-Agent로 캐시 키를 나누는 것은 사용자 구분과 무관하고 적중률만 무너뜨린다. 토큰을 새로 발급해도 캐시된 응답의 저장 문제는 해결되지 않는다.`
    },
    {
      q: `주문 생성 핸들러의 일부다.
@app.post("/orders")
def create(req, idem_key):
    if db.exists("idem", idem_key):          # (1) 확인
        return db.get("idem", idem_key)
    order = create_order(req.json())         # (2) 처리, 약 800ms
    db.put("idem", idem_key, order)          # (3) 저장
    return order, 201
같은 키의 재시도가 첫 요청 100ms 뒤에 도착하자 주문이 2건 만들어졌다. 원인은?`,
      choices: [
        `키는 UUIDv4가 아니라 UUIDv7이어야 하기 때문이다`,
        `(1)의 확인과 (3)의 저장이 분리되어 있어 두 요청이 모두 확인을 통과하고 둘 다 처리한다. 처리 전에 유니크 제약으로 키를 선점해야 한다`,
        `db.get이 느려서 재생 응답이 늦게 나가기 때문이다`,
        `성공 응답이 200이 아니라 201이기 때문이다`
      ],
      answer: 1,
      why: `확인-처리-저장이 원자적이지 않으면 800ms의 처리 시간 동안 도착한 재시도는 아직 저장된 키를 보지 못한다. 처리를 시작하기 전에 유니크 제약이 걸린 INSERT로 키를 선점하고, 충돌한 쪽은 409 또는 저장된 응답 재생으로 분기해야 한다. UUID의 버전은 키의 형식일 뿐 경쟁 상태와 무관하고, 응답 속도나 201 대 200도 중복 생성의 원인이 아니다.`
    },
    {
      q: `주문 목록 API가 GET /orders?offset=950000&limit=50 형태로 동작한다. 데이터가 100만 건을 넘자 뒤쪽 페이지가 4초 이상 걸리고, 사용자가 넘기는 사이에 새 주문이 들어오면 같은 주문이 두 페이지에 나타난다. 가장 적절한 개선은?`,
      choices: [
        `(created_at, id)를 정렬 키로 하는 keyset(cursor) 페이지네이션으로 바꾸고 커서는 불투명 토큰으로 노출한다`,
        `offset 컬럼에 인덱스를 추가한다`,
        `limit의 최대값을 1000으로 올려 요청 횟수를 줄인다`,
        `목록 응답을 CDN에 5분 동안 캐시한다`
      ],
      answer: 0,
      why: `offset 방식은 앞의 N행을 건너뛰려고 읽어야 하므로 깊을수록 느리고, 페이지 사이 삽입에 흔들려 중복·누락이 생긴다. keyset은 마지막으로 본 행의 정렬 키 뒤를 인덱스로 조회해 비용이 거의 일정하고 삽입에 안정적이다. offset은 요청 파라미터이지 컬럼이 아니라서 인덱스를 더해도 건너뛰는 비용이 사라지지 않는다. 캐시는 중복 현상을 오히려 오래 유지할 수 있다.`
    },
    {
      q: `검증 실패 응답이 아래와 같고, 앱 팀이 msg 문자열을 정규식으로 파싱해 분기하고 있다.
HTTP/1.1 422 Unprocessable Content
Content-Type: application/json

{"error":"validation failed","code":1021,"msg":"email: invalid format"}
RFC 9457에 맞춘 가장 적절한 개선은?`,
      choices: [
        `msg 문구를 바꾸지 않겠다고 문서화하고 정규식 규칙을 앱 팀과 공유한다`,
        `HTTP 상태를 200으로 바꾸고 code 숫자만으로 구분한다`,
        `Content-Type을 application/problem+json으로 하고 type(안정적인 URI)·title·status(422)·detail을 채우며, 필드별 오류는 errors 배열 같은 확장 멤버로 기계가 읽게 한다`,
        `type은 비워 두고 title에 오류 코드 번호를 넣는다`
      ],
      answer: 2,
      why: `RFC 9457은 type URI를 분기용 1차 식별자로, detail은 사람이 읽는 설명으로 정의하며 소비자가 detail을 파싱하지 말라고 한다. 필드별 정보는 확장 멤버에 담는다. 문구 고정 약속(0)은 최소 변경처럼 보이지만 detail·msg의 문구를 고치는 일이 파괴적 변경이 되는 구조를 그대로 둔다. 200으로 바꾸면 중간자와 모니터링이 성공으로 오해하고, type을 비우면 about:blank로 간주되어 상태 코드 이상의 의미가 없어진다.`
    },
    {
      q: `필드 price를 amount_krw로 바꾸자는 요청이 왔다. 앱 구버전이 스토어에 많이 남아 있고 강제 업데이트는 불가능하다. 가장 안전한 절차는?`,
      choices: [
        `필드를 바로 바꾸고 릴리스 노트에 적는다`,
        `/v2를 새로 만들고 /v1은 즉시 끈다`,
        `응답에서 price를 삭제하고 amount_krw만 내보내되 앱 팀에 이메일로 알린다`,
        `amount_krw를 추가해 두 필드를 함께 내보내고 price를 deprecated로 표시(OpenAPI와 Deprecation·Sunset 헤더)하며, 클라이언트별 사용량을 계측해 종료일 이후에 제거한다`
      ],
      answer: 3,
      why: `추가는 호환 변경이므로 구버전 앱이 깨지지 않고, 폐기 신호와 사용량 계측으로 종료 시점을 근거 있게 정할 수 있다. /v2를 만들고 /v1을 즉시 끄는 안이 그럴듯하지만 구버전 앱 사용자가 곧바로 장애를 겪는다. 필드 삭제나 이름 변경은 어떤 공지가 있어도 파괴 변경이며, 이메일 통보는 이미 설치된 앱의 동작을 바꾸지 못한다.`
    },
    {
      q: `웹훅 수신 코드가 가끔 정상 요청에서도 서명 불일치로 실패한다.
@app.post("/webhook")
def hook(request):
    body = request.json()
    sig = request.headers["X-Signature"]
    mac = hmac.new(SECRET, json.dumps(body).encode(), "sha256").hexdigest()
    if mac == sig:
        process(body)
    return 200
가장 정확한 진단은?`,
      choices: [
        `SHA-256 대신 MD5를 써야 한다`,
        `서명은 수신한 원본 바이트로 검증해야 하는데, 파싱 뒤 재직렬화한 JSON은 공백·키 순서가 달라져 불일치한다. 또한 == 비교는 타이밍 공격에 취약하고 타임스탬프 검증이 없어 재생 공격에 열려 있으며, 검증 실패에도 200을 돌려준다`,
        `응답을 200이 아니라 202로 돌려야 한다`,
        `SECRET을 요청마다 새로 만들어야 한다`
      ],
      answer: 1,
      why: `서명은 보낸 쪽이 만든 바이트에 대한 것이므로 파싱 후 다시 직렬화하면 같은 JSON이어도 바이트가 달라질 수 있다. 상수 시간 비교, 타임스탬프 허용 오차, 실패 시 거절 응답도 빠져 있다. MD5로 바꾸면 보안이 약해질 뿐 불일치 원인과 무관하고, 응답 코드 202나 비밀의 요청별 재생성은 검증 문제와 관계가 없다.`
    },
    {
      q: `파트너사가 일일 한도를 넘기자 우리 API는 헤더 없이 503 Service Unavailable을 돌려준다. 파트너의 클라이언트는 503을 서버 장애로 보고 1초 간격으로 계속 재시도해 트래픽이 더 늘었다. 가장 적절한 변경은?`,
      choices: [
        `한도 초과에는 429를 쓰고 Retry-After로 재시도 시점을 알리며, problem+json의 type으로 quota-exceeded 같은 원인을 구분한다`,
        `403 Forbidden으로 바꾸고 파트너 키를 즉시 정지한다`,
        `503 응답에 Retry-After만 추가하고 코드는 유지한다`,
        `200 OK를 돌려주고 본문의 error 필드로 알린다`
      ],
      answer: 0,
      why: `429는 이 클라이언트가 한도를 넘었다는 뜻이고 503은 서버 전체의 일시 불가라서, 429로 구분해야 클라이언트 분기와 SLO 집계가 맞는다. 503에 Retry-After만 붙이는 안이 가장 그럴듯하지만 재시도 간격은 늘어도 장애로 읽히는 의미 오류가 남아 모니터링과 클라이언트 로직이 오염된다. 403은 권한 거부라 재시도 방침을 알려 주지 못하고, 200은 중간자가 성공으로 오해한다.`
    },
    {
      q: `앱 팀과 백엔드 팀이 같은 날 개발을 시작했다. API 명세는 공유 문서(워드 파일)였고, 통합 시점에 필드명·오류 형식·페이지네이션이 서로 달라 2주가 지연됐다. 다음 프로젝트에 가장 효과적인 변화는?`,
      choices: [
        `주간 회의를 하루 2회로 늘린다`,
        `구현을 끝낸 뒤 코드에서 OpenAPI를 생성해 앱 팀에 넘긴다`,
        `OpenAPI 명세를 먼저 합의·리뷰하고 린트와 목 서버로 앱 팀이 병행 개발하며, CI에서 구현이 명세와 어긋나면 실패시킨다`,
        `두 팀이 같은 언어와 DTO 라이브러리를 쓰도록 통일한다`
      ],
      answer: 2,
      why: `계약을 먼저 합의하고 기계로 검증하면 어긋남이 구현 중에 드러나고 앱 팀은 목 서버로 동시에 일할 수 있다. 구현 뒤에 명세를 생성하는 안이 그럴듯하지만 앱 팀의 시작이 늦어지고 명세가 합의가 아니라 구현의 부산물이 된다. 회의 증가는 어긋남을 자동으로 잡지 못하며, 언어 통일은 서로 다른 플랫폼의 앱 팀에게 적용하기 어렵고 계약 자체를 정의하지도 않는다.`
    },
    {
      q: `민감한 계좌 요약 API의 응답 헤더다.
HTTP/1.1 200 OK
Cache-Control: no-cache
ETag: "a1b2"
리뷰에서 한 팀원이 "no-cache는 캐시가 아예 저장하지 못하게 하므로 CDN에 남을 걱정이 없다"고 주장한다. 올바른 판단은?`,
      choices: [
        `맞다. no-cache는 저장 금지 지시어다`,
        `틀리다. no-cache는 저장은 허용하되 재사용 전 재검증을 요구한다. 저장 금지는 no-store이고, 개인화 데이터라면 private도 함께 명시해야 한다`,
        `틀리다. no-cache는 브라우저에는 적용되지 않고 CDN에만 적용된다`,
        `맞다. ETag가 있으면 CDN은 본문을 저장하지 않는다`
      ],
      answer: 1,
      why: `RFC 9111에서 no-cache는 저장된 응답을 쓰기 전에 원본의 재검증을 요구할 뿐 저장을 막지 않는다. 저장 자체를 막는 지시어가 no-store다. 저장 금지라는 오해가 가장 흔한 함정이고, ETag의 유무는 저장 여부와 무관하며 오히려 재검증에 쓰인다. 적용 대상이 CDN에만 한정된다는 설명도 틀리다.`
    },
    {
      q: `두 파트너 시스템이 같은 주문 번호(클라이언트가 정함)로 PUT /orders/ORD-2026-0001을 보낼 수 있다. 요구는 "먼저 만든 쪽만 성공하고, 이미 존재하면 덮어쓰지 않고 실패"이다. 어떻게 설계해야 하는가?`,
      choices: [
        `일반 PUT을 쓴다. PUT은 멱등이므로 충분하다`,
        `POST /orders로 바꾸고 중복이면 200으로 기존 주문을 돌려준다`,
        `PUT 뒤에 GET으로 내용을 비교해 다르면 클라이언트가 오류로 처리한다`,
        `PUT에 If-None-Match: * 조건을 요구하고, 이미 있으면 서버가 412로 거절한다`
      ],
      answer: 3,
      why: `If-None-Match: *는 어떤 표현이든 이미 존재하면 실패하는 조건이라 생성 전용 PUT을 만든다. 일반 PUT은 멱등이지만 존재하면 덮어쓰므로 나중에 온 파트너가 먼저 만든 데이터를 지운다. 멱등은 반복 효과가 같다는 뜻이지 덮어쓰기 방지가 아니라는 점이 함정이다. 사후 GET 비교는 이미 덮어쓴 뒤라 늦고, 중복에 200을 주는 POST는 다른 내용의 두 번째 요청도 성공으로 위장한다.`
    }
  ],
  refs: [
    { title: `RFC 9110: HTTP Semantics (IETF, 2022-06, STD 97)`, url: `https://www.rfc-editor.org/rfc/rfc9110.html`, kind: `rfc`, why: `메서드 속성(9.2절), 상태 코드, 조건부 요청(13절), Retry-After를 정의하는 이 모듈의 1차 원문이다. 9.2.2의 자동 재시도 규칙과 13절의 If-Match·If-None-Match 비교 규칙부터 직접 읽어 본다.` },
    { title: `RFC 9111: HTTP Caching (IETF, 2022-06, STD 98)`, url: `https://www.rfc-editor.org/rfc/rfc9111.html`, kind: `rfc`, why: `신선도 계산, Cache-Control 지시어, Vary, 휴리스틱 신선도, Authorization 요청과 공유 캐시의 규칙을 정의한다. 5강의 지시어 사전과 CDN 점검 항목의 근거다.` },
    { title: `RFC 9457: Problem Details for HTTP APIs (IETF, 2023-07)`, url: `https://www.rfc-editor.org/rfc/rfc9457.html`, kind: `rfc`, why: `application/problem+json의 type·title·status·detail·instance와 확장 멤버, 여러 검증 오류를 표현하는 예시, 보안 고려사항이 있다. 오류 카탈로그 설계 전에 detail을 파싱하지 말라는 권고와 함께 읽는다.` },
    { title: `RFC 6585: Additional HTTP Status Codes (IETF, 2012-04)`, url: `https://www.rfc-editor.org/rfc/rfc6585.html`, kind: `rfc`, why: `428 Precondition Required와 429 Too Many Requests를 정의한다. 속도 제한과 조건 헤더 강제 설계에서 상태 코드를 고르는 근거로 쓴다.` },
    { title: `OpenAPI Specification v3.2.1 (OpenAPI Initiative, 2026-09-10)`, url: `https://spec.openapis.org/oas/latest.html`, kind: `standard`, why: `OpenAPI 객체, paths, components, webhooks, callbacks, 보안 스킴, operationId 규칙을 정의하는 계약의 문법서다(2026-11 열람). 도구가 지원하는 버전은 따로 확인한다.` },
    { title: `The Idempotency-Key HTTP Header Field (Internet-Draft draft-ietf-httpapi-idempotency-key-header-08, 2026-10-22)`, url: `https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/`, kind: `rfc`, why: `POST·PATCH의 재시도를 안전하게 하는 헤더 초안이다. 키 누락 400, 다른 페이로드 422, 처리 중 409 권고와 만료 정책 공개 요구를 확인하되 RFC가 아닌 진행 중 초안임(만료 2027-04-25)을 문서에 명시한다.` },
    { title: `Stripe API: Idempotent requests`, url: `https://docs.stripe.com/api/idempotent_requests`, kind: `doc`, why: `첫 요청의 상태 코드와 본문(500 포함)을 저장해 재생하는 방식, 키 길이 상한 255자, 24시간 이상 지난 키 삭제 가능 같은 실제 운영 규칙을 보여 준다(2026-11 열람). 초안과 비교하며 자기 API의 규칙을 정한다.` },
    { title: `Making retries safe with idempotent APIs (AWS Builders' Library, Malcolm Featonby)`, url: `https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/`, kind: `doc`, why: `클라이언트가 주는 고유 토큰을 상태 변경과 원자적으로 저장하고 같은 토큰에는 같은 응답을, 다른 파라미터에는 검증 오류를 주는 설계 원칙을 설명한다. 7강의 상태 기계를 검토할 때 대조한다.` },
    { title: `AIP-158: Pagination (Google API Improvement Proposals)`, url: `https://google.aip.dev/158`, kind: `doc`, why: `page_size·page_token·next_page_token, 불투명하고 URL-safe한 토큰, 토큰이 있어도 매 요청 권한 검사, 총 개수는 선택·추정치라는 지침을 정리한다. 처음부터 페이지네이션을 넣어야 하는 이유(나중 추가는 파괴 변경)도 확인한다.` },
    { title: `Receive Stripe events in your webhook endpoint (Stripe 문서)`, url: `https://docs.stripe.com/webhooks`, kind: `doc`, why: `Stripe-Signature의 타임스탬프·v1 서명 구조, 원본 본문 요구, 기본 5분 허용 오차, 3일 재시도, 이벤트 순서 비보장과 이벤트 ID 중복 제거를 담은 실무 기준이다(2026-11 열람).` },
    { title: `Standard Webhooks Specification v1.0.0 (standard-webhooks 프로젝트, GitHub)`, url: `https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md`, kind: `doc`, why: `webhook-id·webhook-timestamp·webhook-signature 헤더, msg_id.timestamp.payload를 HMAC-SHA256으로 서명한 base64 값(v1, 접두사), 0초부터 24시간까지 10회·누적 약 75시간인 재시도 일정 예시, 응답 코드 처리(2xx 성공, 3xx 실패, 410 중단)를 정의하는 오픈 규약의 명세 본문이다. 타임스탬프 허용 오차 수치는 정하지 않으므로 자기 API에서 정한다(2026-11 열람).` },
    { title: `RFC 9745: The Deprecation HTTP Response Header Field (IETF, 2025-03)`, url: `https://www.rfc-editor.org/rfc/rfc9745.html`, kind: `rfc`, why: `Structured Field 날짜로 폐기 시점을 알리는 Deprecation 헤더와 Sunset(RFC 8594)과의 관계를 정의한다. 8강의 폐기 절차에서 헤더 값 형식을 확인할 때 쓴다.` },
    { title: `Timeouts, retries, and backoff with jitter (AWS Builders' Library)`, url: `https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter`, kind: `doc`, why: `5층 스택에서 층마다 3회 재시도하면 하위 데이터베이스 부하가 243배가 될 수 있다는 예시, 지터로 재시도를 분산하는 이유, 비용이 낮은 호출은 스택의 한 지점에서만 재시도하라는 관행을 설명한다. 6강의 재시도 정책을 설계할 때 근거로 쓴다(aws.amazon.com 주소는 이 주소로 옮겨졌다, 2026-11 확인).` },
    { title: `Spectral: JSON/YAML 린터 (Stoplight, GitHub)`, url: `https://github.com/stoplightio/spectral`, kind: `tool`, why: `OpenAPI 문서를 규칙으로 점검하는 무료 오픈소스 도구다. spectral:oas 규칙 세트와 사용자 정의 규칙으로 계약 린트를 CI에 붙이는 방법을 README에서 확인한다(2026-11 열람). README 안에서도 지원 OpenAPI 버전이 3.0~3.2와 3.0·3.1·2.0으로 엇갈려 적혀 있으므로 자기 계약 파일로 직접 시험한다.` }
  ],
  gigs: [
    `견적 전에 확인할 것: 소비자가 누구인가(자사 앱, 파트너, 공개 API), 구버전 앱처럼 업데이트를 강제할 수 없는 클라이언트가 있는가, 이미 운영 중인 API인지 신규인지, 결제사·외부 연동 목록, 예상 트래픽과 허용 장애 시간, CDN·게이트웨이 유무, 인증 방식, 문서 형식 기대(Swagger UI 등). 이 중 소비자 구성과 기존 API 유무가 범위를 가장 크게 바꿉니다.`,
    `시장 가격대(크몽 판매자 자기 보고, 2026-11 열람 기준): API 개발 상품은 10~20개에 3일 10만 원부터 30~50개에 14일 50만 원 수준이고, 크몽 가격 가이드(2025-09-17 기준)의 백엔드 평균은 약 46만 원입니다. 토스페이먼츠 연동 상품은 단건 결제 15만 원·3일, 웹훅·부분취소·알림톡 40만 원·7일, 정기결제·정산·1개월 하자보수 90만 원·10일로 계단식입니다. 이 차이가 곧 멱등 키, 웹훅, 재시도, 정산 같은 어려운 부분을 어디까지 책임지는가이므로 견적서에 포함·제외 항목을 구체적으로 적으세요.`,
    `엔드포인트 개수만으로 견적하지 말고 리소스 수 × (CRUD, 동시성 보호, 오류 계약, 문서·계약 테스트)로 나눠 보세요. 멱등 키, 웹훅 발신·수신, 대용량 업로드(presigned URL), 하위 호환·버전 정책, 속도 제한은 별도 항목으로 빼야 범위 확대 요청이 들어올 때 협상할 근거가 생깁니다. 고정가라면 계약 합의(OpenAPI 작성과 리뷰)를 첫 마일스톤으로 따로 두는 것이 안전합니다.`,
    `납품물 체크리스트: OpenAPI 파일과 린트 설정, 목 서버 실행법, 구현 소스와 테스트, 오류 type 카탈로그, 멱등 규칙 문서(키 범위·만료·재생), 캐시 전략표, 버전·Deprecation 정책, 웹훅 가이드와 서명 검증 샘플 코드, CHANGELOG, 인수 시험 결과 보고서. 크몽 상품이 API 문서와 소스·기술 문서 인수인계를 납품물에 포함하는 것(2026-11 열람)이 시장의 기본 기대치입니다.`,
    `인수 기준은 위시켓이 권하는 기능별 완료 기준(2026-03 글)처럼 수치와 시나리오로 계약서에 씁니다: 무작위 재전송 1,000건에서 중복 0, 동시 수정 50건에서 유실 0, 모든 오류 응답이 problem+json, 문서와 실제 응답의 불일치 0, 웹훅 중복 전달 20회에서 처리 1회. 동작한다는 문장만 있으면 운영 뒤 재시도·동시성 장애가 하자인지 신규 요구인지 다툼이 됩니다.`,
    `전형적인 함정: 고객이 REST라는 이름만 요구하거나 GraphQL·gRPC를 기술 선호로 요구하는 경우(한국 채용 공고 기준 GraphQL 43건·gRPC 37건으로 수요가 작음, 사람인 2026-11 집계), 앱 HTTP 라이브러리나 게이트웨이가 POST를 자동 재시도하는 숨은 설정, CDN 도입 뒤 개인화 응답 캐시 노출, 문서와 구현의 불일치, 구버전 앱을 강제 업데이트할 수 없다는 사실을 계약 후에 아는 것. 첫 미팅에서 이 다섯 가지를 질문 목록으로 확인하세요. 프로토콜 선택은 소비자가 여럿이고 CDN·프록시를 거치는 공개 API면 HTTP 리소스 API, 화면별 조합 조회가 많은 앱이면 GraphQL, 내부 서비스 간 호출이면 gRPC를 검토하되, 어느 쪽이든 멱등·재시도·캐시 규칙을 따로 설계해야 하므로 견적에 넣으세요.`,
    `Idempotency-Key(-08)와 RateLimit 헤더(-11) 같은 IETF 초안은 RFC가 아니라 진행 중인 문서(2026-11 기준)입니다. 납품 문서에는 헤더 이름과 규칙을 우리 API의 정의로 직접 적고, 표준 확정 후 이름이 바뀔 수 있음을 고지해 두세요. 하위 호환 정책과 Deprecation 공지, 월 단위 계약 회귀 점검은 유지보수 상품으로 따로 제안하면 납품 뒤 분쟁이 줄고 수익도 안정됩니다.`
  ]
};
