(window.PRO_MODULES = window.PRO_MODULES || {})["be-pay"] = {
  id: "be-pay",
  summary: `토스페이먼츠·포트원 공식 문서에 근거해 주문·결제 상태 머신, 멱등 승인, 웹훅 검증, 가상계좌·정기결제, 환불·정산 대사, 카카오 로그인·알림톡 연동을 설계·구현하고 운영 전환까지 납품할 수 있다.`,
  hours: 40,
  goals: [
    `인증(결제창)·승인(서버 API)·매입·정산 단계와 브라우저·내 서버·PG 사이의 신뢰 경계를 그려 설명하고, 서버가 반드시 검증해야 할 값(금액·주문 상태·웹훅 서명)을 열거할 수 있다.`,
    `주문과 결제 시도를 분리한 데이터 모델과, PG 상태값에 내부 UNKNOWN(결과 불명)을 더한 상태 전이표를 설계하고, 비교-후-갱신으로 동시 요청에서도 부수효과가 한 번만 일어나게 구현할 수 있다.`,
    `원화 금액을 정수로 저장·계산하고, 쿠폰 안분 같은 나눗셈에서도 몫의 합이 항상 원금과 같도록 구현하며, float·반올림 규칙 차이로 생기는 장부 오차를 설명할 수 있다.`,
    `Idempotency-Key를 의도에 묶어 결정적으로 설계하고, 승인 타임아웃 뒤의 결과 불명을 조회 기반 대사로 확정하는 복구 절차를 구현해 중복 승인 0건을 자동 테스트로 증명할 수 있다.`,
    `웹훅 수신기를 원본 바이트 서명 검증·즉시 저장·비동기 처리·결제 조회 재확인 구조로 구현하고, 중복·지연·순서 역전·위조 시나리오를 테스트 하네스로 재현할 수 있다.`,
    `가상계좌(입금 대기·기한 만료·환불 계좌)와 빌링키 정기결제(스케줄러·일시/영구 실패 재시도·카드 변경)를 설계하고, (구독, 주기)당 성공 결제 1건을 DB 제약으로 보장할 수 있다.`,
    `부분취소·환불 모델과 정산 데이터 모델을 만들고, PG 정산 내역과 내부 장부를 결제 키로 대사해 누락·금액 차·중복을 분류하는 리포트를 만들 수 있다.`,
    `카카오 로그인·알림톡·공공데이터 API를 어댑터·타임아웃·서킷 브레이커·outbox로 격리해 연동하고, 테스트 모드에서 운영 전환까지의 체크리스트와 납품 문서(런북 포함)를 작성할 수 있다.`
  ],
  lessons: [
    {
      title: `결제 한 건의 지도: 인증·승인·정산과 PG가 서 있는 자리`,
      body: `이 모듈은 앞에서 배운 HTTP 계약(멱등 키, 웹훅, 오류 응답)과 DB 트랜잭션을 돈이 오가는 시스템에 적용합니다. 결제 연동은 API 몇 개를 호출하는 일처럼 보이지만 실제로는 구매자의 브라우저, 내 서버, PG, 카드사·은행이 서로 다른 시간표로 움직이는 비동기 시스템이고, 어느 구간에서 응답을 잃어도 장부는 정확해야 합니다. 이 강의는 그 지도를 먼저 그립니다. 제공자 설명은 토스페이먼츠와 포트원 V2의 공식 문서를 이번에 직접 읽어 확인한 내용이며, 정책과 숫자는 바뀔 수 있어 날짜(2026-11 기준)를 붙입니다.

### 돈이 지나가는 길
결제 한 건은 네 단계로 나뉩니다.
| 단계 | 일어나는 일 | 내 서버가 받는 신호 |
| 인증 | 구매자가 결제창에서 카드사·간편결제 앱으로 본인 확인 | successUrl 리다이렉트 (paymentKey, orderId, amount) |
| 승인 | 내 서버가 승인 API 호출, 카드사가 한도·유효성 확인 | 승인 응답 Payment (status DONE) |
| 매입·정산 | 카드사 청구 뒤 PG가 수수료·부가세를 뺀 금액을 가맹점에 지급 | 정산 내역 (영업일 기준 +N) |
| 취소 | 전체 또는 부분 취소 요청 | Payment의 cancels 배열 |

핵심은 인증과 승인이 다른 단계라는 점입니다. 결제창이 성공 주소로 돌려보냈어도 돈은 아직 승인되지 않았고, 내 서버가 승인 API를 호출해야 확정됩니다. 토스페이먼츠 문서는 인증이 끝난 뒤 10분 안에 승인해야 하며 넘기면 결제 세션이 사라져 NOT_FOUND_PAYMENT_SESSION 오류가 난다고 안내합니다. 반면 같은 API 레퍼런스의 EXPIRED 상태 설명에는 결제 유효 시간이 30분이라고 적혀 있어 두 숫자가 맞지 않습니다(2026-11 기준). 운영 설계는 짧은 쪽을 기준으로 삼고, 불일치는 PG 기술지원에 확인할 항목으로 적어 둡니다.

### 신뢰 경계: 브라우저를 지나는 값은 전부 위조 가능
- 클라이언트 키는 브라우저용, 시크릿 키는 서버용입니다. 시크릿 키는 승인·취소·조회 권한 그 자체이므로 프런트엔드 번들, 앱 바이너리, URL, 로그의 Authorization 헤더 어디에도 나오면 안 됩니다. 토스페이먼츠는 시크릿 키 뒤에 ‹:›를 붙여 base64로 인코딩한 Basic 인증을 쓰며 HTTPS가 전제입니다.
- successUrl로 돌아오는 amount는 구매자 브라우저를 통과한 값입니다. 15,000원 주문을 100원으로 바꿔 부르는 것은 주소창 수정만으로 가능하므로 금액의 원본은 결제 전에 서버가 저장해 둔 주문입니다(2강).
- 웹훅 본문도 외부에서 온 입력입니다. 서명이 맞아도 보낸 쪽이 누구인지만 증명하므로 금액·상태는 조회로 교차 확인합니다(4강).

### 카드번호를 만지지 않는 구조
결제창·위젯 방식은 카드번호를 PG 도메인에서 입력받아 내 서버를 지나가지 않게 합니다. 정기결제는 카드 정보 대신 빌링키라는 토큰을 저장하고(5강), 포트원 문서도 가맹점이 카드 데이터를 저장할 수 없기 때문에 빌링키를 쓴다고 설명합니다. 외주 개발자가 카드번호 컬럼을 만들면 심사와 보안 부담이 한꺼번에 의뢰인에게 넘어갑니다.

### PG 직계약과 연동 솔루션
의뢰인이 토스페이먼츠 같은 PG와 직접 계약할 수도, 포트원 같은 연동 솔루션으로 여러 PG를 하나의 API로 묶을 수도 있습니다. 후자는 시크릿 키 보관 주체와 호출 서버 IP가 늘어나므로, 토스페이먼츠 보안 체크리스트도 호스팅·연동 솔루션·외주 업체가 끼면 키를 누가 어디에 보관하고 어느 서버가 결제 API를 호출하는지 확인하라고 하며, 계약이 끝나면 키를 폐기하라고 하고, 키 유출·오용의 최종 책임은 상점에 있다고 명시합니다. 라이브 키와 상점아이디(MID)는 전자결제 신청과 계약이 끝난 뒤에 발급되므로(토스페이먼츠 FAQ, 2026-11 기준) 계약 전에는 테스트 키만 쓸 수 있습니다. 가맹 심사·키 발급·카카오 채널 개설은 의뢰인 명의로 진행해야 하는 준비물이며, 크몽의 PG 연동 상품도 이를 의뢰인 준비 항목으로 못 박습니다.

이후 강의는 이 지도 위에서 한 가지 질문을 반복합니다. 어느 구간에서 응답을 잃어도, 같은 이벤트가 두 번 와도, 순서가 뒤집혀도 내 장부는 한 번만 정확하게 움직이는가.`,
      code: `import base64

def basic_auth(secret_key):
    # 토스페이먼츠 문서(2026-11 기준): 시크릿 키 뒤에 ':'를 붙여 base64 인코딩
    raw = (secret_key + ":").encode("utf-8")
    return "Basic " + base64.b64encode(raw).decode("ascii")

# 결제창을 열기 전에 서버가 저장해 둔 주문. 금액의 원본은 여기다.
ORDERS = {"ORD-20261109-0001": {"amount": 15000, "status": "PENDING"}}

def confirm(payment_key, order_id, amount, post):
    """successUrl로 돌아온 값을 검증한 뒤에만 승인 API를 부른다. post는 주입(테스트용)."""
    order = ORDERS.get(order_id)
    if order is None or order["status"] != "PENDING":
        raise LookupError("unknown or already handled order")
    if amount != order["amount"]:
        raise ValueError("amount mismatch: refuse to confirm")
    body = {"paymentKey": payment_key, "orderId": order_id, "amount": order["amount"]}
    headers = {"Authorization": basic_auth("test_sk_dummy"),
               "Idempotency-Key": "confirm-" + order_id}
    return post("https://api.tosspayments.com/v1/payments/confirm", body, headers)

sent = []
fake_post = lambda url, body, headers: sent.append((url, body, headers)) or {"status": "DONE"}
assert confirm("pk_1", "ORD-20261109-0001", 15000, fake_post)["status"] == "DONE"
try:
    confirm("pk_1", "ORD-20261109-0001", 100, fake_post)
except ValueError:
    pass
assert len(sent) == 1 and sent[0][2]["Authorization"].startswith("Basic ")`,
      codeLang: `python`,
      key: [
        `결제는 인증(결제창)과 승인(서버 API 호출)이 분리되어 있고, 승인 호출 전에는 돈이 확정되지 않는다.`,
        `브라우저를 지나는 값(amount, orderId)과 외부에서 온 웹훅 본문은 모두 검증 대상이며, 금액의 원본은 결제 전에 서버가 저장한 주문이다.`,
        `시크릿 키는 승인·취소·조회 권한이므로 프런트·로그·저장소에 두지 않고, 테스트 키와 라이브 키 세트를 섞지 않는다.`,
        `가맹 심사·전자결제 계약·키 발급은 의뢰인 명의의 준비물이라 운영 일정은 개발자 손 밖에 있다.`
      ],
      pitfalls: [
        `successUrl의 amount를 그대로 승인 API에 넘겨 100원으로 바꾼 주소로도 결제가 통과하게 만든다.`,
        `결제창 성공 화면만 보고 주문을 확정해 승인 호출이 빠진 건, 인증 만료로 승인 못 한 건이 생긴다.`,
        `개발 편의로 시크릿 키를 프런트 환경 변수에 넣어 번들에 그대로 노출한다.`,
        `문서끼리 숫자가 다른데(승인 유효 시간 10분과 30분) 확인 없이 한쪽을 코드에 박아 넣는다.`
      ]
    },
    {
      title: `주문·결제 데이터 모델, 상태 머신, 정수 금액`,
      body: `결제 코드가 꼬이는 가장 흔한 출발점은 주문 하나에 결제 하나가 일대일이라는 가정입니다. 실제로는 한 주문 아래에서 결제 시도가 여러 번 생깁니다. 카드 한도 초과 뒤 다른 카드로 재시도, 가상계좌 재발급, 부분취소 여러 번이 모두 그렇습니다. 그래서 모델을 나눕니다.

### 최소 데이터 모델
| 테이블 | 핵심 컬럼 | 제약 |
| orders | id, user_id, amount_krw, status | amount_krw 정수, 0보다 큼 |
| payments | id, order_id, provider, provider_key, status, amount_krw | provider_key 유일 |
| payment_events | payment_id, kind, raw_json, received_at | 추가 전용 (수정·삭제 금지) |
| refunds | id, payment_id, amount_krw, reason | 합계가 결제액 이하 |
orders는 우리 업무의 상태, payments는 PG가 말하는 상태입니다. PG가 돌려준 원문 응답을 payment_events에 그대로 쌓아 두면(개인정보는 마스킹) 장애 분석과 정산 분쟁에서 몇 달 뒤에도 근거가 됩니다.

### 금액은 정수로
원화에는 소수점이 없으므로 amount_krw는 정수(BIGINT)로 저장합니다. PostgreSQL bigint는 약 ±9.2×10^18까지 표현해 원화에 충분합니다. float·double은 이진 오차 때문에 합계와 안분에서 1원이 사라집니다. 소수 단위가 있는 외화(토스페이먼츠 문서는 일반 결제의 통화로 KRW·USD·JPY를 안내)는 통화와 최소 단위를 금액과 한 쌍으로 다룹니다. NUMERIC이나 Python Decimal은 정확하지만 반올림 규칙이 다릅니다. Decimal의 기본 반올림은 ROUND_HALF_EVEN(2.5는 2)이고, PostgreSQL numeric은 0에서 먼 쪽으로 올려 2.5는 3이고(PostgreSQL 18 문서 기준), double precision은 대부분의 환경에서 짝수 쪽으로 가 2.5가 2입니다. 같은 계산을 두 층에서 하면 합계가 1원씩 어긋나므로 어디서 반올림하는지를 한 곳으로 정해 문서에 적습니다. JavaScript의 Number는 약 9×10^15까지만 정수를 정확히 나타내므로 금액 계산은 서버에서 정수로 처리합니다.

### 상태 머신
토스페이먼츠 Payment.status는 READY, IN_PROGRESS, WAITING_FOR_DEPOSIT, DONE, CANCELED, PARTIAL_CANCELED, ABORTED, EXPIRED입니다(2026-11 기준). 내부 상태는 이를 복사하지 말고 업무에 맞게 정의하되 PG 상태와의 매핑을 한 함수에 모읍니다. 반드시 추가할 상태가 UNKNOWN(결과 불명)입니다. 승인 호출이 타임아웃 났을 때 성공도 실패도 아닌 상태에 이름을 붙여 두지 않으면 개발자는 실패로 추측해 재결제를 유도하고 중복 결제를 만듭니다.

전이는 허용표로 선언하고 갱신은 비교-후-갱신으로 합니다. UPDATE에 현재 상태 조건을 걸어 1행이 바뀌었을 때만 성공으로 봅니다. 0행이면 다른 요청이 먼저 바꾼 것입니다. 리다이렉트 핸들러와 웹훅 워커가 동시에 PAID로 옮기려 해도 한쪽만 성공하므로 재고 차감·포인트 지급·알림 같은 부수효과는 전이에 성공한 쪽에서만 실행합니다. 이 한 줄이 중복 웹훅과 순서 역전의 상당수를 흡수합니다(4강).

### 서버 승인 흐름
1. 주문 생성 시 orderId와 amount를 서버에 저장한다. orderId는 토스페이먼츠 기준 6~64자, 영문·숫자·‹-›·‹_›·‹=›만 허용된다.
2. 결제창을 열고 구매자가 인증을 마친다.
3. successUrl로 돌아온 paymentKey·orderId·amount를 받는다.
4. 저장된 주문 금액과 대조한다. 다르면 승인 API를 부르지 않는다.
5. PENDING에서 CONFIRMING으로 선점한 뒤 저장된 금액으로 승인 API를 호출한다.
6. 응답이 DONE이고 금액이 맞으면 PAID로 전이하고 부수효과를 실행한다.
주문번호가 추측 가능한 순번이면 남의 주문을 조회하는 접근 제어 결함(BOLA)이 됩니다. 조회 API는 항상 소유자를 확인하세요.`,
      code: `import sqlite3

ALLOWED = {
    "PENDING": {"CONFIRMING", "EXPIRED"},
    "CONFIRMING": {"PAID", "FAILED", "UNKNOWN"},
    "UNKNOWN": {"PAID", "FAILED"},
    "PAID": {"PARTIAL_CANCELED", "CANCELED"},
    "PARTIAL_CANCELED": {"PARTIAL_CANCELED", "CANCELED"},
}

def move(db, order_id, cur, nxt):
    """cur에서 nxt로 옮긴다. 현재 상태가 cur일 때만 성공한다(비교-후-갱신)."""
    if nxt not in ALLOWED.get(cur, set()):
        raise ValueError("illegal transition %s -> %s" % (cur, nxt))
    changed = db.execute("UPDATE orders SET status = ? WHERE id = ? AND status = ?",
                         (nxt, order_id, cur)).rowcount
    return changed == 1          # 0이면 다른 요청이 먼저 바꿨다 -> 부수효과를 실행하지 않는다

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE orders (id TEXT PRIMARY KEY, "
           "amount_krw INTEGER NOT NULL CHECK (amount_krw > 0), status TEXT NOT NULL)")
db.execute("INSERT INTO orders VALUES ('A1', 15000, 'PENDING')")

assert move(db, "A1", "PENDING", "CONFIRMING") is True
assert move(db, "A1", "PENDING", "CONFIRMING") is False    # 두 번째 요청은 선점 실패
try:
    move(db, "A1", "CONFIRMING", "PENDING")                # 되돌리기는 허용표에 없다
except ValueError:
    pass
else:
    raise AssertionError("backward move must be rejected")`,
      codeLang: `python`,
      key: [
        `주문과 결제 시도는 일대다로 모델링하고, PG 원문 응답은 추가 전용 이벤트 로그로 쌓는다.`,
        `원화 금액은 정수(BIGINT)로 저장하고, 반올림이 필요한 지점은 한 곳으로 정해 문서화한다.`,
        `상태 전이는 허용표로 선언하고 UPDATE에 현재 상태 조건을 걸어 비교-후-갱신하며, 전이에 성공한 쪽만 부수효과를 낸다.`,
        `PG 상태에 없는 UNKNOWN(결과 불명)을 내부 상태로 두어 타임아웃을 실패로 추측하지 않는다.`
      ],
      pitfalls: [
        `금액을 float·double로 저장하거나 계산해 안분·합계에서 1원 차이가 난다.`,
        `리다이렉트 핸들러와 웹훅 워커가 조건 없이 UPDATE해 재고·포인트가 두 번 반영된다.`,
        `순차 주문번호와 소유자 검증 없는 조회 API로 타인의 주문이 노출된다.`,
        `PG 상태 문자열을 DB·화면 전체에 그대로 퍼뜨려 PG를 바꾸거나 상태가 추가될 때 전 구간을 고친다.`
      ]
    },
    {
      title: `멱등 키와 결과 불명: 승인 응답을 잃었을 때`,
      body: `승인 API를 호출했는데 응답이 오지 않았다고 합시다. 가능한 세계는 셋입니다. 요청이 PG에 닿지 못했거나, 닿아서 승인까지 끝났는데 응답만 잃었거나, 아직 처리 중이거나. 클라이언트는 셋을 구분할 수 없고, RFC 9110(9.2.2절)은 비멱등 메서드(POST 포함)의 요청을 멱등임을 알 방법이 없는 채 자동 재시도하지 말라고 합니다. 돈이 걸린 POST는 재시도 안전성을 API 설계가 만들어야 하며, 그 도구가 Idempotency-Key입니다.

### 제공자의 멱등 키 규칙
토스페이먼츠 문서(2026-11 기준)는 모든 POST 요청이 Idempotency-Key 헤더를 받는다고 안내합니다. 최대 300자이고 처음 요청한 날부터 15일간 유효하며, 키·API 키·URL·HTTP 메서드의 조합으로 같은 요청을 판별해 두 번째부터는 실행하지 않고 첫 응답을 돌려줍니다. 처리 중에 같은 키가 오면 409 IDEMPOTENT_REQUEST_PROCESSING이, 300자를 넘으면 400 INVALID_IDEMPOTENCY_KEY가 나갑니다. 오류가 난 멱등 요청을 키만 바꿔 다시 보내지 말고 실제 처리 결과를 먼저 확인하라는 것이 문서의 취지입니다. 다만 API 에러 코드 표에는 위 두 코드가 없고 이미 처리 중인 요청을 ALREADY_PROCESSING_REQUEST(400)로 적은 항목만 있어 코드명이 문서마다 다릅니다. 실제 응답을 로그로 직접 확인해 분기를 만드세요. 같은 키에 본문만 다른 요청이 올 때의 동작은 이 문서에 적혀 있지 않으므로 키를 의도에 묶는 습관이 더 중요합니다.

비교용으로 Stripe(API v1 문서 기준)는 첫 요청의 상태 코드와 본문을 저장해 500 오류까지 재생하고, 키는 255자까지, 24시간 이상 지나면 정리될 수 있으며, 같은 키에 다른 파라미터가 오면 오류를 냅니다. IETF의 Idempotency-Key 헤더 드래프트(draft-ietf-httpapi-idempotency-key-header-08, 2026-10-22 발행, 2026-11 확인)는 아직 RFC가 아닙니다. 요점은 제공자마다 수명과 의미가 다르다는 것이고, 그래서 내 쪽 방어선(DB 제약과 상태 머신)이 따로 필요합니다.

### 키는 요청이 아니라 의도에 묶는다
- 좋은 키: ‹confirm-ORD-0001›처럼 하나의 의도(이 주문의 승인)에서 결정적으로 만든 값. 재시도해도 같다.
- 나쁜 키: 보낼 때마다 새로 만든 UUID. 재시도가 새 요청이 되어 멱등 보호가 사라진다.
- 키는 호출 전에 DB에 저장해 프로세스가 죽어도 재사용할 수 있게 한다.

### 결과 불명 복구 절차
1. PENDING에서 CONFIRMING으로 선점한다(실패하면 이미 누가 처리 중).
2. 결정적 멱등 키로 승인을 호출한다.
3. 성공 응답이면 PAID로 전이한다.
4. 타임아웃·연결 끊김이면 UNKNOWN으로 기록하고 구매자에게 결제 확인 중이라고 안내한다.
5. 대사 잡이 PG 조회로 확정한다. DONE이고 금액이 같으면 PAID, 충분한 시간이 지나도 PG에 결제가 없으면 FAILED, 금액이 다르면 사람이 확인한다.
6. 조회도 실패하면 UNKNOWN을 유지하고 백오프로 다시 조회한다.
FAILED로 확정하는 시점이 중요합니다. 승인 요청이 PG 안에서 아직 돌고 있을 수 있으므로 인증 유효 시간(앞서 본 10분·30분 중 긴 쪽 이상)이 지난 뒤에만 없음을 믿습니다.

### 외부 장애를 내 시스템에 번지지 않게
- 연결 타임아웃과 읽기 타임아웃을 나눠 둘 다 명시합니다. requests처럼 기본 타임아웃이 없는 라이브러리가 있습니다.
- 재시도에는 횟수와 전체 시간 예산을 둡니다. 모든 인스턴스가 즉시 재시도하면 이미 느린 PG에 폭주를 얹습니다.
- Fowler가 정리한 서킷 브레이커는 연속 실패가 임계치를 넘으면 회로를 열어 호출을 즉시 실패시키고, 일정 시간 뒤 반열림 상태에서 한 번 시험 호출해 복구를 확인합니다. 결제에서는 빨리 실패가 곧 실패 확정이 아니라는 점이 일반 API와 다릅니다. 회로가 열려 막은 승인 시도는 PENDING으로 남기고 잠시 후 다시 시도하라고 안내합니다.
- 외부 호출은 전용 스레드풀이나 세마포어로 격리(bulkhead)해, 느린 PG가 내 서버의 요청 스레드를 모두 점유하지 못하게 합니다.`,
      code: `TERMINAL_FAIL = {"ABORTED", "EXPIRED", "CANCELED"}

def settle_unknown(orders, lookup):
    """UNKNOWN 주문을 PG 조회 결과로 확정한다.
    lookup(order_id) -> (status, amount) | None(PG에 결제 없음), 통신 장애면 TimeoutError.
    주의: 실제 운영에서는 승인 요청 뒤 인증 유효 시간이 충분히 지난 건만 넘길 것."""
    out = {}
    for oid, o in orders.items():
        if o["status"] != "UNKNOWN":
            continue
        try:
            found = lookup(oid)
        except TimeoutError:
            out[oid] = "UNKNOWN"              # 추측해서 FAILED로 바꾸지 않는다
            continue
        if found is None or found[0] in TERMINAL_FAIL:
            o["status"] = "FAILED"
        elif found[0] == "DONE":
            o["status"] = "PAID" if found[1] == o["amount"] else "AMOUNT_MISMATCH"
        out[oid] = o["status"]                # READY/IN_PROGRESS 등은 UNKNOWN 유지
    return out

orders = {k: {"status": "UNKNOWN", "amount": 15000} for k in "abcde"}
pg = {"a": ("DONE", 15000), "b": None, "c": ("DONE", 9000), "d": ("IN_PROGRESS", 15000)}

def lookup(oid):
    if oid == "e":
        raise TimeoutError
    return pg[oid]

assert settle_unknown(orders, lookup) == {
    "a": "PAID", "b": "FAILED", "c": "AMOUNT_MISMATCH", "d": "UNKNOWN", "e": "UNKNOWN"}`,
      codeLang: `python`,
      key: [
        `타임아웃은 실패가 아니라 결과 불명이다. UNKNOWN으로 기록하고 PG 조회로 확정하며, 없음을 믿는 시점은 인증 유효 시간 이후다.`,
        `멱등 키는 요청이 아니라 의도(이 주문의 승인)에 결정적으로 묶고, 호출 전에 저장해 재시도에 재사용한다.`,
        `제공자의 멱등 보장(수명 15일, 24시간 등)은 제각각이므로 내 쪽 DB 제약과 상태 머신이 별도의 방어선이다.`,
        `외부 호출은 연결·읽기 타임아웃 분리, 재시도 예산, 서킷 브레이커, 격리된 스레드풀로 감싼다.`
      ],
      pitfalls: [
        `재시도마다 새 UUID를 멱등 키로 만들어 이중 승인을 막지 못한다.`,
        `타임아웃 즉시 FAILED로 처리하고 재결제를 유도했다가 선행 요청이 뒤늦게 성공해 이중 결제가 난다.`,
        `인증 유효 시간이 지나기 전에 조회 결과 없음을 믿고 FAILED로 확정한다.`,
        `HTTP 클라이언트의 기본 타임아웃이 무제한이라 PG 지연이 서버 전체 스레드 고갈로 번진다.`
      ]
    },
    {
      title: `웹훅: 서명 검증, 재전송, 순서 역전과 중복`,
      body: `리다이렉트만 믿는 결제 연동은 구매자가 인증 직후 탭을 닫거나 네트워크가 끊기면 돈은 나갔는데 주문은 비는 상태를 만듭니다. 웹훅은 PG가 서버로 보내는 두 번째 신호로 이 틈을 메웁니다. 그러나 웹훅은 증거가 아니라 알림입니다. 위조될 수 있고, 두 번 오고, 순서가 바뀌고, 늦게 옵니다.

### 제공자 비교 (공식 문서, 2026-11 기준)
| 항목 | 토스페이먼츠 | 포트원 V2 |
| 응답 | 10초 안에 HTTP 200 | 연결·읽기 타임아웃 각 30초 |
| 재시도 | 최대 7회, 1·4·16·64·256·1024·4096분 (총 약 3일 19시간), 7번째 실패에 실패 처리 | 최대 5회, 지수 백오프(문서 표기 0·1·4·16·64·256분)에 지터 |
| 서명 | tosspayments-webhook-signature 헤더, HMAC SHA-256을 payload와 전송 시각 헤더로 계산 | Standard Webhooks 규격, 서버 SDK로 검증 |
| 중복 판별 | 결제 상태 이벤트 본문에 eventId 없음, transmission-id는 전송마다 발급 | 문서에 중복 처리 지침 없음, 직접 구현 |
| 순서 | 결제 상태 이벤트에 순서 보장 서술 없음 (에스크로 이벤트는 보장 안 됨을 명시) | 웹훅이 리다이렉트보다 먼저 온다는 보장 없음 |
토스페이먼츠 서명은 문서 기준으로 ‹payload:전송시각› 문자열을 보안 키로 HMAC SHA-256 계산하고, 헤더에서 ‹v1:› 뒤의 값을 base64 디코딩해 비교하며, 서명이 쉼표로 여러 개 올 수 있다고 안내합니다. 보안 키를 어디서 받는지와 해시 값의 비교 인코딩은 이 문서가 설명하지 않고 다른 페이지로 넘기므로, 구현 직전에 원문과 실제 요청 샘플로 대조하세요. 가상계좌 입금 알림(DEPOSIT_CALLBACK)은 본문에 eventType·data 없이 secret·status·orderId 등이 오고, 승인 응답의 secret과 같을 때만 정상 요청으로 봅니다. PAYMENT_STATUS_CHANGED와 DEPOSIT_CALLBACK을 둘 다 등록하면 가상계좌 상태 하나에 웹훅이 두 번 가니 이벤트를 의도해서 고르세요.

### 수신기 설계 다섯 원칙
1. 원본 바이트로 서명을 검증한다. JSON을 파싱했다 다시 직렬화하면 공백·키 순서가 달라져 정상 웹훅이 실패한다. Standard Webhooks 사양은 서명 대상이 메시지 ID, 타임스탬프, 본문을 점으로 이은 문자열이고 본문을 재직렬화하지 말라고 규정한다. 비교는 상수 시간 함수로 하고, 서명이 여러 개 올 수 있으니(키 회전) 하나라도 맞으면 통과시킨다.
2. 검증 직후 DB에 저장(inbox)하고 바로 200을 돌려준다. 처리는 워커가 비동기로 한다. 토스페이먼츠 보안 체크리스트도 10초 안에 200을 주고 처리는 비동기로 하라고 안내한다.
3. 본문을 믿지 말고 결제 조회 API로 다시 확인한다. 주문 번호, 금액, 상점 ID, 상태를 내 주문과 대조한다. 서명은 발신자만 보증한다. 포트원 샘플도 본문 대신 조회 결과만 신뢰한다.
4. 상태 머신으로 순서 역전을 흡수한다. 도착 시각이 아니라 조회한 현재 상태로 전이를 정하고, 종결 상태에서 과거 상태로 돌아가는 전이는 허용표에서 막는다. 토스페이먼츠도 에스크로 이벤트 설명에서 순서를 시각이 아니라 status로 판단하라고 안내한다.
5. 중복은 자연키로 막는다. eventId가 있으면 그것을, 없으면 결제 키와 조회한 상태로 멱등하게 적용한다. 전이 CAS가 마지막 방어선이다.

### 타임스탬프 허용 오차의 함정
재전송 공격을 막으려고 헤더 시각이 오래된 요청을 거절하는 것은 권장되지만, 제공자가 재시도 때 헤더 시각과 서명을 새로 만들지 않으면 늦은 정상 재시도가 전부 거절됩니다. 포트원 문서는 재시도해도 timestamp가 그대로라고 적고 재시도 간격은 1·4·16분으로 벌어지므로, 5분 허용 오차를 그대로 쓰면 몇 번째 재시도부터 정상 요청이 거절될 수 있습니다. 허용 오차를 정하기 전에 제공자의 재시도가 헤더 시각을 갱신하는지 직접 관찰하세요.

### 최후의 보루는 대사
수신 서버가 오래 죽어 있으면 재시도가 소진됩니다. 토스페이먼츠 개발자센터는 최근 30일의 전송 이력과 수동 재시도 버튼을 제공하지만 그것에 기대지 말고, 주기적으로 PG 조회로 내 장부를 맞추는 대사 잡을 둡니다(6강). 로컬 주소는 웹훅 URL로 등록할 수 없으므로 개발 중에는 임시 공개 URL이 필요합니다.`,
      code: `import base64, hashlib, hmac, sqlite3, time

def sign(secret, msg_id, ts, body):
    """Standard Webhooks: HMAC-SHA256(키, '메시지ID.타임스탬프.본문'), 헤더 값은 'v1,' + base64."""
    key = base64.b64decode(secret.removeprefix("whsec_"))
    mac = hmac.new(key, msg_id.encode() + b"." + ts.encode() + b"." + body, hashlib.sha256)
    return "v1," + base64.b64encode(mac.digest()).decode()

def verify(secret, msg_id, ts, body, sig_header, tolerance=300):
    if abs(time.time() - int(ts)) > tolerance:        # 재전송 공격 방어: 시간 허용 오차
        return False
    want = sign(secret, msg_id, ts, body)             # body는 수신한 원본 바이트 그대로
    return any(hmac.compare_digest(want.encode(), s.encode()) for s in sig_header.split())   # 서명이 여러 개일 수 있다

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE inbox (msg_id TEXT PRIMARY KEY, body BLOB)")

def accept(msg_id, body):
    """처음 본 메시지면 True. 같은 msg_id가 다시 오면 False(저장하지 않고 200만 돌려준다)."""
    return db.execute("INSERT OR IGNORE INTO inbox VALUES (?, ?)", (msg_id, body)).rowcount == 1

secret = "whsec_" + base64.b64encode(b"0123456789abcdef01234567").decode()
body, ts = b'{"type":"Transaction.Paid","data":{"paymentId":"p1"}}', str(int(time.time()))
header = sign(secret, "msg_1", ts, body) + " v1,AAAA"
assert verify(secret, "msg_1", ts, body, header)
assert not verify(secret, "msg_1", ts, body + b" ", header)       # 1바이트만 달라도 거절
assert accept("msg_1", body) and not accept("msg_1", body)`,
      codeLang: `python`,
      key: [
        `웹훅은 알림이고 서명은 발신자만 증명하므로, 본문 대신 결제 조회 API의 상태·금액·주문 번호를 신뢰한다.`,
        `원본 바이트를 상수 시간 비교로 검증하고, 검증 직후 저장해 200을 돌려주고 처리는 비동기로 한다.`,
        `중복과 순서 역전은 자연키와 상태 머신 CAS로 흡수하며, 토스페이먼츠 transmission-id는 중복 제거 키가 아니다.`,
        `재시도가 소진돼도 복구되도록 주기적 대사 잡을 최후의 보루로 둔다.`
      ],
      pitfalls: [
        `JSON을 파싱했다 재직렬화한 바이트로 서명을 검증해 정상 웹훅이 간헐적으로 거절된다.`,
        `웹훅 핸들러 안에서 재고·알림·외부 호출까지 동기로 처리해 10초를 넘기고 재전송을 부른다.`,
        `이벤트 도착 순서를 믿어 늦게 온 옛 상태가 최신 DONE을 덮어쓴다.`,
        `서명 검증 실패를 로그만 남기고 그대로 처리를 계속한다.`
      ]
    },
    {
      title: `가상계좌와 빌링키 정기결제, 실패 재시도`,
      body: `### 가상계좌: 돈이 올 때까지 기다리는 결제
가상계좌는 구매자에게 입금 계좌를 먼저 발급하고 구매자가 원하는 시점에 입금합니다. 승인 호출로 상태가 WAITING_FOR_DEPOSIT이 되고, 입금되면 DONE으로 바뀌며 웹훅이 갑니다. 서버가 입금 시점을 알 기본 신호가 웹훅이라 토스페이먼츠 기술 블로그(2023-07 글)도 웹훅을 필수로 설명합니다. 설계 포인트는 넷입니다.
- 입금 기한이 지나도 상태가 바뀌지 않아 만료 웹훅은 오지 않는다고 토스페이먼츠 FAQ와 기술 블로그가 설명하고, 만료 시간은 발급 시점에 정해져 고칠 수 없다고 합니다. 기한을 내 DB에 저장하고 만료 배치로 주문을 정리해 구매자에게 알립니다.
- DEPOSIT_CALLBACK의 secret을 승인 응답의 secret과 비교하고, 다르면 위조로 봅니다.
- 입금 전에는 발급된 계좌의 입금 금액을 바꿀 수 없어 부분 취소가 안 되고 전체 취소만 가능하며 환불 계좌도 필요 없습니다. 입금 후에는 부분 취소도 되지만 취소 요청에 refundReceiveAccount(은행, 계좌번호, 예금주)가 필요하고, 계좌가 틀리면 INVALID_REFUND_ACCOUNT_INFO 같은 오류가 나므로 구매자가 다시 입력하는 화면이 있어야 합니다.
- 기한 동안 재고를 잡아 둘지는 비즈니스 결정이고, 선점은 만료 배치와 한 쌍이어야 합니다.
토스페이먼츠 FAQ는 계약 전에는 가상계좌를 테스트할 수 없고, 테스트 환경에서 발급된 가상계좌에는 실제로 입금할 수 없다고 안내합니다(2026-11 기준). 일정에 반영하세요.

### 빌링키 정기결제
빌링키는 카드 정보를 대신하는 토큰으로, 가맹점이 정한 시점에 반복 승인할 때 씁니다. 공식 문서로 확인한 사실은 다섯 가지입니다(2026-11 기준).
- 반복 시점은 가맹점이 스케줄링합니다. 토스페이먼츠는 스케줄을 제공하지 않고, 포트원은 결제 예약 API(‹POST /payments/{id}/schedule›, timeToPay)를 제공하지만 다음 회차 예약은 직접 이어 붙입니다.
- 토스페이먼츠 자동결제는 리스크 검토와 추가 계약 뒤 쓸 수 있고, 정기 구독형이 아니면 정책상 제한됩니다. 포트원 문서도 빌링키는 정기 구독에만 쓸 수 있고 카드사 심사에서 비정기 결제를 허용하지 않을 수 있다고 경고합니다.
- customerKey는 UUID처럼 예측 불가능한 값으로 만듭니다. 자동 증가 번호, 이메일, 사용자 아이디는 안전하지 않다고 문서가 명시합니다. 빌링키가 노출돼도 짝이 되는 customerKey를 모르면 결제할 수 없다는 점이 이 설계의 방어입니다.
- 발급된 빌링키는 다시 조회할 수 없으니 응답을 받자마자 암호화해 저장합니다. 잃으면 카드 정보를 다시 받아야 합니다.
- 한 카드에 빌링키가 여러 개 생길 수 있고 중복 발급을 막는 방법이 없다고 문서가 설명하므로, 고객당 활성 빌링키 정책은 내 쪽에서 만듭니다.

### 청구 설계: 한 주기에 성공 한 번
(구독, 주기)마다 성공 결제가 정확히 1건이어야 합니다. 이를 if문이 아니라 DB 제약으로 보장합니다. status가 PAID인 행에 대해 (sub_id, period)를 유일하게 만드는 부분 유니크 인덱스가 대표적입니다. 시도(attempt)마다 새 orderId를 쓰되, 같은 시도를 재전송할 때는 같은 orderId와 같은 멱등 키를 씁니다. 새 시도는 이전 시도가 실패로 확정된 뒤에만 만듭니다. 타임아웃 난 시도에 새 orderId를 붙여 다시 보내면 선행 요청이 뒤늦게 성공해 이중 청구가 됩니다. 스케줄러가 여러 인스턴스로 떠도 같은 구독을 동시에 집지 않도록 청구 대상 선택에 SELECT ... FOR UPDATE SKIP LOCKED 같은 행 잠금 패턴을 씁니다. PostgreSQL 18 문서는 이 구문이 큐 같은 테이블의 경합을 피하기 위한 용도이며 일관되지 않은 뷰를 주므로 일반 목적에는 맞지 않는다고 설명합니다.

### 실패 재시도(dunning) 정책
실패를 두 종류로 나눕니다. 일시 실패(한도 초과, 잔액 부족, PG 일시 오류)는 간격을 두고 몇 번 재시도하고, 영구 실패(카드 만료, 분실, 빌링키 삭제)는 재시도 없이 구매자에게 카드 변경을 요청합니다. 간격과 횟수(예: 1·3·7일)는 제품 정책이므로 의뢰인과 합의해 문서화하고, 분류표는 제공자 오류 코드와 실제 로그를 보며 만듭니다. 이 모듈은 카드사 거절 사유 코드의 분류를 검증하지 않았습니다. 재시도 사이에 서비스 이용을 잠시 유지할지(grace period)도 정하고, 안내(알림톡·이메일)와 카드 변경 링크를 함께 보냅니다.`,
      code: `import sqlite3
from datetime import date, timedelta

db = sqlite3.connect(":memory:")
db.executescript("""
CREATE TABLE charges (
  sub_id TEXT NOT NULL, period TEXT NOT NULL, attempt INTEGER NOT NULL,
  order_id TEXT NOT NULL UNIQUE, status TEXT NOT NULL,
  UNIQUE (sub_id, period, attempt));
CREATE UNIQUE INDEX one_paid_per_period ON charges (sub_id, period) WHERE status = 'PAID';
""")
RETRY_AFTER_DAYS = {1: 1, 2: 3, 3: 7}      # n번째 시도가 일시 실패하면 며칠 뒤 다음 시도

def start_attempt(sub_id, period, attempt):
    oid = "SUB-%s-%s-%d" % (sub_id, period, attempt)   # 시도마다 새 orderId (멱등 키로도 사용)
    db.execute("INSERT INTO charges VALUES (?, ?, ?, ?, 'TRYING')", (sub_id, period, attempt, oid))
    return oid

def finish(oid, status):
    db.execute("UPDATE charges SET status = ? WHERE order_id = ?", (status, oid))

def next_step(kind, attempt, today):
    """kind: PAID | SOFT(한도·잔액·일시 장애) | HARD(만료·분실·빌링키 삭제)"""
    if kind == "PAID":
        return ("DONE", None)
    if kind == "SOFT" and attempt in RETRY_AFTER_DAYS:
        return ("RETRY", today + timedelta(days=RETRY_AFTER_DAYS[attempt]))
    return ("ASK_NEW_CARD", None)              # HARD이거나 재시도 소진

finish(start_attempt("S1", "2026-12", 1), "FAILED")
assert next_step("SOFT", 1, date(2026, 12, 1)) == ("RETRY", date(2026, 12, 2))
assert next_step("HARD", 1, date(2026, 12, 1)) == ("ASK_NEW_CARD", None)
finish(start_attempt("S1", "2026-12", 2), "PAID")
try:
    finish(start_attempt("S1", "2026-12", 3), "PAID")
except sqlite3.IntegrityError:
    print("같은 주기의 두 번째 PAID는 DB가 거절한다")`,
      codeLang: `python`,
      key: [
        `가상계좌는 입금 웹훅이 기본 완료 신호이고 만료 웹훅은 없으니, 기한을 저장해 만료 배치를 둔다. 입금 후 환불에는 환불 계좌가 필요하다.`,
        `빌링키는 별도 계약과 정기 구독 용도가 전제이고, 스케줄링은 가맹점 몫이며, customerKey는 예측 불가 값, 빌링키는 재조회가 안 되므로 즉시 암호화 저장한다.`,
        `(구독, 주기)당 성공 결제 1건은 부분 유니크 인덱스로 보장하고, 시도마다 새 orderId, 같은 시도의 재전송은 같은 orderId와 같은 키를 쓴다.`,
        `실패는 일시/영구로 분류해 재시도 간격·횟수와 카드 변경 안내를 정책으로 문서화한다.`
      ],
      pitfalls: [
        `만료된 가상계좌 주문이 영원히 입금 대기로 남아 재고가 묶인다.`,
        `타임아웃 난 월 청구에 새 orderId와 새 멱등 키로 재시도해 이중 청구한다.`,
        `customerKey를 회원 이메일이나 순번으로 만들어 빌링키 악용 위험을 키운다.`,
        `스케줄러를 여러 인스턴스로 띄우면서 행 잠금 없이 같은 구독을 동시에 청구한다.`
      ]
    },
    {
      title: `취소·환불·분쟁, 그리고 정산과 대사`,
      body: `### 취소 API의 모양
토스페이먼츠 취소는 ‹POST /v1/payments/{paymentKey}/cancel›이고 cancelReason(필수, 최대 200자)을 받습니다. cancelAmount를 생략하면 전체 취소, 금액을 주면 부분 취소입니다. 부분 취소를 여러 번 하면 응답 Payment의 cancels 배열에 취소 객체가 쌓입니다. 취소 요청에도 멱등 키를 붙여 중복 취소를 막으라고 문서가 안내하며, 이미 취소된 결제는 ALREADY_CANCELED_PAYMENT, 가능 금액을 넘으면 NOT_CANCELABLE_AMOUNT 같은 오류를 돌려줍니다. 가상계좌는 입금 뒤 환불 계좌가 필요한데, 환불 시점이 같은 취소 가이드 안에서도 취소일 +2일과 영업일 기준 총 2일로 달리 적혀 있으니 구매자 안내 문구는 PG에 확인한 표현으로 씁니다(2026-11 기준).

### 내 장부의 환불 모델
환불은 결제 행을 고치지 않고 refunds 행을 추가합니다. 환불 가능액은 결제액에서 누적 환불액을 뺀 값이며, 이를 확인하고 갱신하는 코드는 결제 행을 잠그거나 비교-후-갱신으로 보호해야 합니다. 구매자가 취소 버튼을 연타하거나 관리자와 구매자가 동시에 부분취소를 누르면 합계가 결제액을 넘기 때문입니다. PG 호출과 내 DB 기록 사이에도 3강과 같은 틈이 있습니다. 취소 API는 성공했는데 서버가 죽어 refunds 행이 없으면 장부와 PG가 어긋나므로, 환불은 호출 전에 결정적 멱등 키를 담은 REQUESTED 행을 먼저 쓰고 응답이나 조회 결과의 cancels 배열로 COMPLETED를 확정하는 두 단계로 만듭니다. 타임아웃이 나면 결제와 마찬가지로 결과 불명으로 두고 조회로 확정합니다. 쿠폰·포인트가 섞인 주문의 일부 상품 환불은 할인액을 상품별로 안분해야 하는데, 정수 원으로 나누면 나머지가 생깁니다. 최대 잔여법으로 몫의 합이 원금과 정확히 같게 하고, 나머지를 어느 상품에 줄지 같은 규칙은 약관·합의서에 적습니다.

### 환불 정책과 분쟁
- 환불 가능 기간과 환급 기한은 법령(전자상거래법의 청약철회 등)과 업종별 예외가 정하는 영역입니다. 이번 실행에서는 법령 원문을 열지 못했으므로 숫자를 단정하지 않습니다. 의뢰인의 약관 검토와 법령 원문 확인을 납품 전 체크 항목으로 남기세요.
- 구매자가 카드사에 이의를 제기하는 분쟁은 포트원 이벤트 목록에 Transaction.DisputeCreated·DisputeResolved가 있을 만큼 PG 수준에서 별도 흐름입니다. 대응 증빙(주문·이용 로그·약관 동의 시각)을 보존할 수 있게 payment_events와 이용 기록을 남깁니다.

### 정산과 대사
토스페이먼츠 용어집은 정산을 판매 대금에서 결제수단별 수수료, 부가세, 기타 비용 등을 차감해 상점이 받을 실제 금액을 계산하는 과정으로 설명합니다. 정산 매출일을 기준으로 영업일 +N일에 지급되고(일정산은 결제일, 주정산은 그 주 일요일, 월정산은 월말이 정산 매출일이고 공휴일·주말은 +N에 들어가지 않습니다). 정산 조회 기능은 결제뿐 아니라 취소 수수료가 제대로 반영됐는지 확인하는 용도로 소개됩니다. 같은 페이지가 일·주·월 정산을 나열하면서 일정산 예시는 이해를 돕기 위한 예시일 뿐이고 토스페이먼츠 정산 주기는 최소 일주일이라고 적어 서로 맞지 않으니, 실제 주기는 의뢰인의 계약 조건으로 확인합니다.

대사(reconciliation)는 PG 쪽 기록과 내 장부를 키로 맞대어 차이를 분류하는 작업입니다.
1. 정산 매출일 범위를 정한다.
2. PG의 거래·정산 내역을 가져온다(대시보드 엑셀 또는 정산 조회 API).
3. 결제 키로 내 payments·refunds와 조인한다.
4. 차이를 세 갈래로 분류한다. 한쪽에만 있음(누락), 금액 불일치, 중복.
5. 예상 입금액(승인 − 취소 − 수수료·부가세)을 계산해 실제 입금액과 비교한다.
6. 설명되지 않는 차이만 사람 큐로 보내고, 수수료 반올림에서 나오는 몇 원 단위 차이는 허용 오차 정책으로 흡수한다.
정산 엑셀은 대사의 결과물이어야지 손으로 맞추는 대상이 아닙니다.`,
      code: `def split_exact(total, weights):
    """total(원)을 weights 비율로 정수 배분한다. 몫의 합은 항상 total이다(최대 잔여법)."""
    s = sum(weights)
    shares = [total * w // s for w in weights]
    leftover = total - sum(shares)                 # 0 <= leftover < len(weights)
    order = sorted(range(len(weights)), key=lambda i: (-(total * weights[i] % s), i))
    for i in order[:leftover]:
        shares[i] += 1
    return shares

def refundable_after(paid, canceled_so_far, request):
    """이번 환불 뒤 남는 환불 가능액. 한도를 넘으면 예외 (호출부는 결제 행을 잠근 상태여야 한다)."""
    left = paid - sum(canceled_so_far)
    if request <= 0 or request > left:
        raise ValueError("cancel %d exceeds refundable %d" % (request, left))
    return left - request

# 쿠폰 1,000원을 상품 3개(10,000 / 20,000 / 30,000원)에 안분
assert split_exact(1000, [10000, 20000, 30000]) == [167, 333, 500]
assert split_exact(1000, [1, 1, 1]) == [334, 333, 333]
assert refundable_after(30000, [10000], 15000) == 5000
try:
    refundable_after(30000, [10000, 15000], 6000)
except ValueError:
    print("한도 초과 환불 거절")`,
      codeLang: `python`,
      key: [
        `취소는 전체(cancelAmount 생략)와 부분(금액 지정)이 있고 취소 요청에도 멱등 키를 붙이며, 환불은 결제 행 수정이 아니라 refunds 행 추가로 기록한다.`,
        `환불 가능액은 결제액에서 누적 환불액을 뺀 값이고, 확인과 갱신은 잠금이나 비교-후-갱신으로 묶어 보호한다.`,
        `안분은 정수 최대 잔여법으로 몫의 합을 원금과 일치시키고 나머지 배정 규칙을 합의서에 적는다.`,
        `정산은 판매 대금에서 수수료·부가세 등을 뺀 금액이 영업일 +N에 지급되는 것이고, 대사는 결제 키 조인으로 누락·금액 차·중복을 분류한다.`
      ],
      pitfalls: [
        `부분취소 동시 요청에서 환불 가능액 검사와 갱신이 분리돼 결제액을 넘는 환불이 나간다.`,
        `쿠폰을 상품별로 각각 반올림해 합계가 1~2원 모자라 정산이 어긋난다.`,
        `법정 환불 기한과 예외를 확인하지 않고 개발자가 임의로 환불 정책을 정한다.`,
        `대사를 엑셀 수작업으로 하고 설명되지 않는 차이를 허용 오차로 덮는다.`
      ]
    },
    {
      title: `한국형 외부 연동: 카카오 로그인, 알림톡, 공공데이터`,
      body: `결제 말고도 한국 외주 프로젝트에는 거의 항상 따라붙는 외부 연동이 있습니다. 공통 원칙은 하나입니다. 외부의 형식과 장애가 내 도메인에 새어 들어오지 않도록 어댑터 계층에서 번역하고 격리합니다.

### 카카오 로그인
OAuth 2.0 인가 코드 흐름(RFC 6749)이며, 현재 모범 사례는 RFC 9700(2025-01 발행)이 정리한 공개 클라이언트의 PKCE 사용(MUST)과 리다이렉트 URI 정확 문자열 일치입니다. 카카오 이해하기 문서에는 PKCE 서술이 없으므로 지원 범위는 OAuth 문서에서 따로 확인합니다. 카카오 공식 문서(2026-11 기준)에서 확인한 값은 다음과 같습니다.
- 액세스 토큰 수명은 REST API 6시간, JavaScript 2시간, Android·iOS 12시간입니다. 리프레시 토큰은 2개월이고 만료 1개월 전부터 갱신할 수 있습니다. 갱신 응답에 새 리프레시 토큰이 오면 기존 것은 폐기되므로 반드시 교체 저장합니다.
- 회원 식별은 앱별 고유 ID인 회원번호(user_id)로 합니다. 이메일·전화번호는 바뀔 수 있으니 회원 키로 쓰지 말라고 문서가 안내합니다. 이메일은 검증 여부를 확인해야 하고 인증되지 않은 주소는 발송 메일을 못 받을 수 있습니다.
- 연결 해제 웹훅은 사용자와 앱의 연결이 끊어질 때(연결 해제, 카카오 계정 탈퇴) 서버에 알려 탈퇴 처리 등 회원 상태를 동기화하게 합니다. user_id도 개인정보이므로 보관·파기 정책을 정해 탈퇴 처리 때 적용합니다.
- OpenID Connect를 켜면 ID 토큰을 받고 공개키(jwks)로 검증할 수 있습니다.
네이버 로그인도 같은 계열이지만 이번 실행에서는 공식 문서를 열지 못했습니다. 식별자 정책과 앱 검수 조건은 구현 전에 네이버 개발자센터에서 직접 확인하세요.

### 계정 연결 설계
identities(provider, provider_uid)를 기본키로 두고 users와 분리합니다. 같은 사람이 카카오와 네이버로 각각 로그인할 때 두 identity가 한 user를 가리키게 하는 것이 연결입니다. 이메일이 같다는 이유로 자동 병합하지 마세요. 공급자가 이메일 소유를 검증하지 않았다면 남의 이메일로 가입한 공격자가 기존 계정을 가져갈 수 있습니다. 연결은 로그인한 상태에서 재인증을 거쳐 명시적으로 하고, 이미 다른 계정에 묶인 identity는 거절합니다. 마지막 로그인 수단을 해제하는 요청도 막아야 계정이 잠기지 않습니다.

### 알림톡
카카오 문서(2026-11 기준)가 정리한 요건은 다음과 같습니다. 알림톡은 채널을 추가하지 않은 이용자에게도 보낼 수 있는 정보성 메시지 서비스입니다. 카카오톡 채널을 만들어 비즈니스 채널로 전환하고 홈 공개를 켜고 고객센터 연락처를 넣어야 합니다. 카카오 내부 심사를 통과한 템플릿만 보낼 수 있고, 발송은 카카오와 파트너 계약을 맺은 공식 딜러사를 통해 진행할 수 있으며 서비스 범위와 발송 단가 같은 계약 조건은 딜러사마다 다를 수 있습니다. 합법적으로 수집한 번호만 쓸 수 있습니다. SMS 대체 발송과 사업자 요건은 같은 문서에 없었으니 딜러사 계약 단계에서 확인합니다.
발송 구조는 outbox 패턴이 안전합니다. 비즈니스 트랜잭션과 같은 DB 트랜잭션에서 알림 요청 행을 쓰고, 워커가 읽어 딜러사 API를 호출해 결과를 기록합니다. 알림톡 호출이 실패해도 주문은 롤백되지 않고 워커가 재시도합니다. 같은 알림이 두 번 나가지 않게 (주문, 템플릿) 같은 중복 방지 키를 둡니다.

### 공공데이터 API
행정·사업자·주소·날씨 데이터를 공공데이터포털 API로 가져오는 요구가 흔합니다. 이번 실행에서는 포털의 이용 안내를 열지 못해 한도와 키 형식 같은 숫자는 적지 않습니다. 구현 원칙만 정리합니다. 서비스키는 시크릿처럼 환경 변수로 주입하고, 일부 공공 API는 오류를 HTTP 200 본문의 결과 코드로 돌려주는 사례가 있으니 어댑터가 본문의 결과 코드까지 검사하며, 잘 변하지 않는 데이터는 캐시해 호출 한도를 보호하고, 장애 시 낡은 캐시를 허용할지 의뢰인과 합의합니다. 모든 외부 호출에는 타임아웃과 서킷 브레이커를 둡니다.`,
      code: `import sqlite3

db = sqlite3.connect(":memory:")
db.executescript("""
CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT);
CREATE TABLE identities (
  provider TEXT NOT NULL, provider_uid TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (provider, provider_uid));
""")

def login(provider, uid, email=None, linking_user=None):
    """(provider, 회원번호)로만 계정을 식별한다. 이메일이 같다고 자동 병합하지 않는다."""
    row = db.execute("SELECT user_id FROM identities WHERE provider = ? AND provider_uid = ?",
                     (provider, uid)).fetchone()
    if row:
        if linking_user not in (None, row[0]):
            raise PermissionError("identity already linked to another account")
        return row[0]
    if linking_user is None:                       # 신규 가입
        linking_user = db.execute("INSERT INTO users (email) VALUES (?)", (email,)).lastrowid
    db.execute("INSERT INTO identities VALUES (?, ?, ?)", (provider, uid, linking_user))
    return linking_user

a = login("kakao", "1001", "same@example.com")
b = login("naver", "N-77", "same@example.com")     # 이메일이 같아도 다른 계정
assert a != b and login("kakao", "1001") == a
assert login("naver", "N-99", linking_user=a) == a # a가 로그인한 상태에서 네이버를 추가 연결
try:
    login("naver", "N-77", linking_user=a)         # 이미 b에 묶인 identity는 거절
except PermissionError:
    print("link refused")`,
      codeLang: `python`,
      key: [
        `소셜 로그인 회원 키는 이메일이 아니라 (provider, 회원번호) 쌍이며 이메일은 바뀔 수 있는 속성이다.`,
        `이메일 일치만으로 계정을 자동 병합하지 않고, 연결은 재인증 뒤 명시적으로 하며 이미 묶인 identity는 거절한다.`,
        `알림톡은 정보성 메시지와 템플릿 사전 심사가 전제이고 발송은 공식 딜러사를 통해 진행하며, 호출은 outbox로 비동기 처리한다.`,
        `모든 외부 연동은 어댑터·타임아웃·서킷 브레이커·캐시로 격리하고, HTTP 상태뿐 아니라 응답 본문의 결과 코드까지 검사한다.`
      ],
      pitfalls: [
        `토큰 갱신 응답의 새 리프레시 토큰을 저장하지 않아 두 달 뒤 전원이 다시 로그인해야 한다.`,
        `연결 해제 웹훅을 무시해 해제·탈퇴한 회원의 식별자가 남는다.`,
        `알림 발송을 주문 트랜잭션 안에서 동기 호출해 딜러사 장애가 주문 실패로 번진다.`,
        `공공 API의 HTTP 200만 보고 성공으로 처리해 본문의 오류 응답을 빈 데이터로 저장한다.`
      ]
    },
    {
      title: `통합 사례: 크몽형 PG 연동 의뢰와 운영 전환`,
      body: `의뢰 상황입니다. 요가 스튜디오 운영자가 온라인 클래스 사이트를 만들었고 크몽에서 토스페이먼츠 연동 개발자를 찾습니다. 요구는 카드 결제가 되게 해 주세요, 가능하면 월 구독도요, 예산은 50만 원 안쪽입니다. 크몽의 PG 연동 상품(2026-11 열람, 공급자 자기 보고, 리뷰 0~16건 수준)은 단건 결제 15만 원·3일, 웹훅·부분취소·알림톡 40만 원·7일, 빌링키 정기결제·정산 엑셀·1개월 하자보수 90만 원·10일로 범위가 계단식이고 가맹 심사·키·카카오 채널은 의뢰인 준비물입니다. 이 가격표는 시장 가격의 증거가 아니라 범위를 쪼개는 방식의 예시로 읽으세요.

### 1단계: 질문으로 범위를 고정한다
- PG와의 전자결제 계약 상태는? 심사 중이면 운영 일정은 내 손을 떠난다.
- 결제수단은 카드만인가, 가상계좌·계좌이체·간편결제까지인가? 수단별 심사가 있다.
- 월 구독은 정기 구독형 서비스인가? 자동결제는 별도 계약과 리스크 검토 대상이다.
- 환불 정책과 약관은 누가 제공하는가?
- 정산 주기, 세금 처리, 현금영수증 방식을 의뢰인 세무 담당과 확인했는가?
- 알림 요구가 있는가? 카카오 채널과 딜러사 계약은?
- 쇼핑몰 호스팅형 플랫폼의 기본 PG 기능으로 충분하지는 않은가?

### 2단계: 설계와 테스트 매트릭스
구조는 웹 서버(주문·결제·환불), 웹훅 inbox와 워커, 대사 잡, 알림 outbox, PG 어댑터 인터페이스입니다. 어댑터를 인터페이스 하나 뒤에 두면 PG를 바꾸자는 요청이 재설계가 아니라 어댑터 교체가 됩니다. 테스트 매트릭스는 앞 강의의 나쁜 상황을 그대로 씁니다. 금액 변조, successUrl 이중 호출, 승인 타임아웃, 웹훅 중복·순서 역전, 가상계좌 만료, 부분취소 연타, 월 청구 이중 실행, 대사 불일치 3종.

### 3단계: 테스트 모드에서 운영으로
토스페이먼츠 배포 체크리스트와 보안 체크리스트(2026-11 기준)를 내 점검표로 바꿉니다.
- 라이브 키(live_)와 상점아이디(MID)를 확인하고, 클라이언트 키와 시크릿 키를 같은 세트로 씁니다. 섞으면 INVALID_API_KEY(400)가 납니다.
- 시크릿 키가 배포 번들과 저장소 이력에 없는지 점검합니다(Gitleaks 같은 도구, 번들에서 live_sk 패턴 검색).
- 라이브 시크릿 키에 API 키 접근 정책으로 서버의 공인(NAT) IP를 제한합니다.
- 웹훅 URL은 https, 방화벽 허용, 10초 안의 200, 서명 검증과 실패 거절을 확인합니다. 가상계좌를 쓰면 DEPOSIT_CALLBACK을 등록합니다.
- 지원할 결제수단의 카드사·이동통신사 등 심사 통과를 확인합니다.
- 수단별 실결제, 취소, 부분취소 여러 번(cancels 누적)을 데스크톱 주요 브라우저와 Android·iOS에서 확인합니다. 테스트 환경은 라이브와 다르게 동작할 수 있습니다.
- 리다이렉트 방식과 Promise 방식 양쪽의 오류 처리를 확인하고, 계좌이체는 현금영수증 receiptUrl을 확인합니다.

### 4단계: 납품과 사후
납품물은 소스, API 문서, ERD, 환경 변수 목록, 키 이관 절차, 런북 3종(결과 불명 처리, 웹훅 재전송과 대사 실행, 수동 환불), 대사 리포트 샘플입니다. 무상 하자보수의 기간과 범위를 정의하고, 새 결제수단 추가나 PG 변경은 변경 요청으로 구분합니다.

### 사고 연습: 오픈 첫 주에 결제는 됐는데 수강 등록이 없다
확인 순서는 이렇습니다. PG 조회 API나 대시보드에 결제가 DONE인가. 내 payments 행과 상태는 무엇인가, UNKNOWN이면 대사 잡 로그를 본다. 웹훅 전송 이력(개발자센터)과 내 inbox를 본다. 워커 실패 로그를 본다. 거의 모든 원인이 3강과 4강의 구간에 있고 해결은 조회로 확정하는 대사입니다. 재발 방지로 불일치 건수 알림을 추가합니다.`,
      code: `import re

# 시크릿 키 모양: 토스페이먼츠 문서가 번들 점검용으로 예시한 live_sk_, live_gsk_ 패턴(테스트 키 포함)
SECRET_RE = re.compile(r"(live|test)_g?sk_[A-Za-z0-9]+")

def preflight(env, client_key, secret_key, webhook_url, bundle_text):
    """운영 전환 전 자동 점검. 문제 목록을 돌려주고, 비어 있으면 통과."""
    problems = []
    want = "live_" if env == "prod" else "test_"
    for name, key in (("client", client_key), ("secret", secret_key)):
        if not key.startswith(want):
            problems.append("%s key does not start with %s" % (name, want))
    if not webhook_url.startswith("https://"):
        problems.append("webhook url must be https")
    if SECRET_RE.search(bundle_text):
        problems.append("secret key found in front-end bundle")
    return problems

assert preflight("prod", "live_gck_x", "live_gsk_y", "https://shop.example.com/hook", "var a=1") == []
bad = preflight("prod", "test_gck_x", "live_gsk_y", "http://shop.example.com/hook", "k=live_gsk_abc123")
assert len(bad) == 3, bad`,
      codeLang: `python`,
      key: [
        `범위는 결제수단·정기결제·정산·알림·하자보수 기간으로 계단식으로 쪼개고, 계약·키·채널 같은 준비물을 의뢰인 책임으로 명시한다.`,
        `금액 변조·이중 호출·타임아웃·웹훅 중복과 순서 역전·가상계좌 만료·연타·이중 청구·대사 불일치가 테스트 계획의 뼈대다.`,
        `운영 전환은 라이브 키와 MID, IP 제한, 웹훅, 결제수단 심사, 실결제·취소 테스트, 번들 시크릿 점검을 체크리스트로 닫는다.`,
        `납품물에 런북과 대사 리포트를 넣어야 오픈 뒤 분쟁과 하자 논쟁을 줄인다.`
      ],
      pitfalls: [
        `테스트 키로 성공한 것을 운영 준비 완료로 보고, 카드사 심사와 계약 뒤에야 가능한 가상계좌 테스트 일정을 반영하지 않는다.`,
        `의뢰인 명의의 계약과 키 발급을 개발자가 대신하거나 키를 메신저·메일에 평문으로 전달한다.`,
        `결제만 구현하고 정산·대사·런북을 범위 밖으로 방치해 오픈 뒤 불일치를 하자로 떠안는다.`
      ]
    }
  ],
  labs: [
    {
      title: `가짜 PG로 승인 흐름과 결과 불명 복구 구현하기`,
      scenario: `온라인 클래스 사이트의 결제 서버를 만든다고 가정합니다. 실제 PG 계약 전에도 연습할 수 있도록 토스페이먼츠 승인 API와 비슷하게 동작하는 가짜 PG를 직접 만들어 장애를 마음대로 주입합니다. 쇼핑몰 서버는 주문 생성, successUrl 처리(금액 대조), 승인 호출, 상태 전이, 결과 불명 복구를 구현하고, 무작위 장애 200회에도 중복 승인이 0건임을 자동 테스트로 증명합니다. 도구는 Python(FastAPI 또는 Flask)과 SQLite 또는 PostgreSQL 같은 무료 도구면 충분합니다.`,
      steps: [
        `가짜 PG 서버를 만든다. ‹POST /confirm›(paymentKey·orderId·amount를 받고 Basic 인증 헤더를 검사)과 ‹GET /orders/{orderId}›(조회)를 둔다. 엔드포인트 이름은 단순화해도 되지만 필드 이름은 공식 문서(paymentKey, orderId, amount, status)를 따른다.`,
        `멱등 키를 지원한다. 같은 Idempotency-Key로 오면 저장해 둔 첫 응답을 재생하고, 처리 중이면 409를 돌려준다.`,
        `장애 스위치(환경 변수 또는 요청 헤더)를 만든다. ok, sleep_after_commit(승인은 저장하고 응답만 지연), error500_before_commit(저장 전 500), drop_connection(저장 후 연결 끊김).`,
        `쇼핑몰 서버에 orders(id, amount_krw INTEGER, status) 테이블, 허용 전이표, move 함수(UPDATE에 현재 상태 조건)를 만든다. successUrl 핸들러는 금액 대조, PENDING에서 CONFIRMING으로 선점, 승인 호출(Idempotency-Key는 confirm- 접두사와 orderId, 읽기 타임아웃 2초), PAID 또는 UNKNOWN 순서로 처리한다.`,
        `복구 잡을 만든다. UNKNOWN 주문을 오래된 순으로 가짜 PG에 조회해 PAID/FAILED로 확정하고, 조회 자체가 실패하면 UNKNOWN을 유지한 채 다음 주기로 넘긴다.`,
        `주문 200개를 무작위 장애 조합으로 승인하고, 각 주문마다 successUrl을 1~3번 중복 호출한다. 그 뒤 복구 잡을 최대 3회 돌린다.`,
        `금액 변조 테스트를 만든다. amount=100으로 successUrl을 20번 호출하고 가짜 PG의 confirm 호출 카운터가 0인지 확인한다.`,
        `모든 PG 호출을 한 줄 JSON 로그(요청 ID, orderId, 멱등 키, 결과, 소요 ms)로 남긴다.`
      ],
      accept: [
        `200건 실행 뒤 가짜 PG에 기록된 승인이 주문당 최대 1건이다(중복 승인 0건).`,
        `복구 잡을 최대 3회 돌린 뒤 UNKNOWN으로 남은 주문이 0건이고 최종 상태가 가짜 PG의 기록과 100% 일치한다.`,
        `금액 변조 요청 20건 모두 가짜 PG의 confirm 호출이 0회이고 주문 상태 변화도 0이다.`,
        `같은 successUrl을 동시에 10번 호출해도 PAID 전이와 부수효과(재고 차감 로그)가 정확히 1회다.`
      ],
      stretch: `가짜 PG 대신 토스페이먼츠 테스트 키(문서에 공개된 테스트 키, 또는 개발자센터 가입 뒤 받는 내 테스트 상점 키)로 어댑터만 바꿔 같은 테스트를 돌려 보세요. 문서와 실제 응답의 차이(예: 처리 중 오류 코드명)를 표로 정리하고, 어댑터 인터페이스가 바뀌지 않았는지 확인합니다.`
    },
    {
      title: `웹훅 수신기: 서명 검증, 중복·지연·순서 역전 테스트`,
      scenario: `PG가 보내는 웹훅을 안전하게 받는 수신 서버를 만들고, 실제 PG에서 일어나는 나쁜 상황(중복 전송, 재시도 지연, 순서 뒤바뀜, 위조 요청, 수신 서버 다운)을 테스트 하네스로 재현합니다. 서명은 Standard Webhooks(HMAC-SHA256, 헤더 webhook-id·webhook-timestamp·webhook-signature)로 구현하고 가짜 PG가 같은 방식으로 서명해 보냅니다. 토스페이먼츠의 서명 방식은 문서를 읽고 검증 함수 하나를 추가하는 확장 과제로 둡니다. 모든 작업은 로컬에서 무료 도구로 합니다.`,
      steps: [
        `inbox 테이블(msg_id 기본키, 원본 본문, 수신 시각, 처리 상태)을 만들고 1~3강의 상태 머신을 재사용한다.`,
        `수신 엔드포인트를 만든다. 원본 바이트로 서명 검증(허용 오차 5분, 상수 시간 비교, 서명 여러 개 허용), 실패면 4xx, 성공이면 inbox에 저장하고 즉시 200.`,
        `워커를 만든다. inbox의 미처리 행을 가져와 가짜 PG의 결제 조회로 현재 상태와 금액을 확인해 주문 상태 머신에 반영한다. 본문에 적힌 상태는 무시한다.`,
        `하네스를 만든다. 이벤트 3개(준비, 진행 중, 완료에 해당)를 6가지 순열로 전송한다.`,
        `같은 이벤트를 20회 연속 전송하고, 일부는 동시에 전송한다.`,
        `위조 테스트를 만든다. 서명 없음, 잘못된 서명, 본문 1바이트 변조, 오래된 타임스탬프를 각 25건씩 보낸다.`,
        `다운 시뮬레이션을 만든다. 수신 서버를 끈 채 이벤트 5개를 보내 실패시키고, 1·4·16초(분 대신 초로 축소) 간격 재시도 뒤 서버를 켜서 모두 수렴하는지 본다. 가짜 PG의 재시도가 timestamp를 새로 만드는 모드와 첫 시도의 값을 유지하는 모드를 둘 다 돌려, 허용 오차(테스트에서는 5초로 축소)가 정상 재시도를 거절하는 경우를 기록한다.`,
        `워커가 5초 걸려도 수신 응답이 빠른지 로컬에서 100회 측정해 p99를 기록한다.`
      ],
      accept: [
        `위조·변조 100건이 전부 4xx로 거절되고 inbox와 주문 상태의 변화가 0이다.`,
        `같은 이벤트 20회(동시 포함) 전송 뒤 부수효과(재고 차감·포인트 지급 로그)가 정확히 1회다.`,
        `6가지 도착 순서 모두 최종 주문 상태가 같다(조회로 확정한 완료 상태).`,
        `워커 처리가 5초 지연돼도 수신 응답 p99가 1초 미만이다(로컬 측정값을 기록).`,
        `다운 뒤 재시도 시나리오에서 이벤트 5개가 모두 처리되고 중복 처리가 없다.`
      ],
      stretch: `토스페이먼츠 방식의 서명 검증 함수를 추가하되, 구현 전에 공식 문서의 서명 절차와 헤더 형식을 직접 대조해 차이를 기록하세요. 서명 비밀 키 회전(서명 2개 동시 허용) 테스트와, inbox 처리 상태별 건수를 보여 주는 관리용 쿼리도 만듭니다.`
    },
    {
      title: `납품형 미니 프로젝트: 클래스 구독 결제 모듈과 대사 리포트`,
      scenario: `크몽형 PG 연동 90만 원 패키지의 축소판을 만듭니다. 가상의 의뢰인은 월 구독 클래스 사이트를 운영하며 단건 결제, 부분취소, 가상계좌 입금 확인, 월 정기결제, 월간 정산 엑셀(CSV)을 요구합니다. 실제 PG 계약 없이 앞의 두 랩에서 만든 가짜 PG로 구현하고, 의뢰인에게 넘기는 문서 일체(요구사항 1~2쪽, 범위 In/Out, 운영 전환 체크리스트, 런북)까지 작성해 외주 납품의 전체 모양을 연습합니다. 개인정보와 실제 키는 쓰지 않고 모두 더미 값을 씁니다.`,
      steps: [
        `1~2쪽 요구사항 문서를 쓴다. In/Out 범위, 가정(PG 계약·카카오 채널은 의뢰인 준비), 의뢰인 준비물, 하자보수 범위를 포함한다.`,
        `단건 결제와 전체·부분 취소를 구현한다. refunds 행 추가 방식, 환불 가능액 검사는 결제 행 잠금, 쿠폰 안분은 최대 잔여법으로 한다.`,
        `가상계좌를 구현한다. 발급, 웹훅 입금 확인(secret 비교), 기한 만료 배치.`,
        `월 구독 스케줄러를 구현한다. (구독, 주기)당 성공 1건 부분 유니크 인덱스, 시도별 orderId, 일시/영구 실패 분류와 1·3·7일 재시도, 스케줄러 2개 동시 실행 테스트.`,
        `알림 outbox를 구현한다. 결제 완료·실패 안내를 콘솔 어댑터(알림톡 대체)로 발송하고 (주문, 템플릿) 중복 방지 키를 둔다.`,
        `가상의 한 달 데이터(주문 500건, 취소 40건, 실패 청구 30건)를 만든다. 가짜 PG가 정산 CSV를 내보내되 수수료율과 부가세 규칙은 임의 가정으로 정해 문서에 적는다.`,
        `대사 잡을 만든다. 내 장부와 정산 CSV를 결제 키로 조인해 누락·금액 차·중복을 분류하는 리포트를 내고, 일부러 오류 3건(누락 1, 금액 차 1, 중복 1)을 CSV에 심어 탐지를 확인한다.`,
        `운영 전환 체크리스트와 preflight 스크립트(키 접두사, 웹훅 https, 번들 내 시크릿 패턴)를 만들고, 런북 3종(결과 불명 처리, 웹훅 재전송과 대사 실행, 수동 환불)을 쓴다.`
      ],
      accept: [
        `대사 리포트가 심어 둔 오류 3종(누락·금액 차·중복)을 100% 탐지하고, 오류를 심지 않은 데이터에서는 불일치가 0건이다.`,
        `스케줄러 2개를 동시에 실행해도 (구독, 주기)당 PAID가 1건이고 이중 청구 로그가 0건이다.`,
        `쿠폰 안분을 무작위 100케이스로 돌려 몫의 합이 항상 원금과 같다.`,
        `preflight가 잘못된 설정 5가지(예: 키 세트 혼용, http 웹훅, 번들 내 시크릿 키, 운영에서 테스트 키, 필수 환경 변수 누락)를 모두 탐지한다.`,
        `납품 문서에 요구사항·범위·체크리스트·런북 3종이 들어 있고, 처음 보는 사람이 문서만 보고 대사를 실행해 결과를 재현할 수 있다.`
      ],
      stretch: `포트원 V2 방식의 결제 예약(schedule) 흐름을 어댑터로 추가해 같은 테스트 스위트를 통과시키고, PG를 교체할 때 바뀐 파일 수를 기록해 어댑터 설계가 변경 비용을 얼마나 줄였는지 보고서에 적어 보세요.`
    }
  ],
  quiz: [
    {
      q: `쇼핑몰 successUrl 핸들러가 쿼리의 paymentKey, orderId, amount를 그대로 승인 API에 전달하고 있습니다. 보안 점검에서 가장 먼저 고쳐야 할 것은 무엇입니까?`,
      choices: [
        `successUrl을 HTTPS로만 받도록 강제한다`,
        `결제 전에 서버가 저장해 둔 주문 금액과 쿼리의 amount를 대조하고, 승인 요청에는 저장된 금액을 쓴다`,
        `amount 쿼리 값을 base64로 인코딩해서 받는다`,
        `승인 응답을 받은 뒤 응답의 amount를 로그로 남긴다`
      ],
      answer: 1,
      why: `쿼리 값은 구매자 브라우저를 지나므로 HTTPS여도 주소창에서 바꿀 수 있습니다. HTTPS는 전송 구간만 보호합니다(0). base64는 암호화가 아니라 인코딩이라 변조를 막지 못하고(2), 로그(3)는 사후 기록일 뿐 변조 결제를 막지 못합니다. 금액의 원본은 결제 전에 서버가 저장한 주문입니다.`
    },
    {
      q: `카드 결제 승인 API를 호출했는데 읽기 타임아웃이 났습니다. 주문은 PENDING에서 CONFIRMING으로 옮겨 둔 상태입니다. 가장 안전한 처리는 무엇입니까?`,
      choices: [
        `실패로 보고 주문을 FAILED로 바꾼 뒤 구매자에게 다시 결제하라고 안내한다`,
        `새 UUID를 Idempotency-Key로 만들어 같은 승인 요청을 즉시 다시 보낸다`,
        `주문을 UNKNOWN으로 기록하고, 같은 멱등 키로 재전송하거나 PG 조회로 결과를 확인한 뒤 확정한다`,
        `타임아웃을 60초로 늘리고 성공할 때까지 같은 요청을 무한 반복한다`
      ],
      answer: 2,
      why: `타임아웃은 승인이 안 된 것인지 응답만 잃은 것인지 알 수 없는 결과 불명입니다. 실패로 단정하면(0) 선행 요청이 뒤늦게 성공해 이중 결제가 되고, 새 키(1)는 멱등 보호를 없애 새 요청이 됩니다. 무한 반복(3)은 PG 장애를 키웁니다. 같은 키 재전송이나 조회로 확정하는 것이 정답입니다.`
    },
    {
      q: `웹훅 수신 로그입니다.
10:00:01 recv PAYMENT_STATUS_CHANGED orderId=A1 status=DONE
10:00:01 recv PAYMENT_STATUS_CHANGED orderId=A1 status=DONE
10:00:02 stock.decrease(A1) ok
10:00:02 stock.decrease(A1) ok
같은 주문의 재고가 두 번 줄었습니다. 이 이벤트 유형에는 본문에 eventId가 없습니다. 가장 적절한 수정은 무엇입니까?`,
      choices: [
        `웹훅 수신 서버를 단일 인스턴스로 줄여 동시 수신을 없앤다`,
        `tosspayments-webhook-transmission-id를 중복 제거 키로 저장한다`,
        `핸들러를 더 빠르게 만들어 재전송이 오지 않게 한다`,
        `주문을 PAID로 비교-후-갱신하고, 전이에 성공한 요청만 재고를 차감한다`
      ],
      answer: 3,
      why: `PG는 최소 한 번 이상 전달하는 방식이라 빨리 응답해도 중복이 올 수 있고(2), 단일 인스턴스로 줄여도 순차 중복은 남습니다(0). transmission-id는 전송마다 새로 발급되어 재전송 중복 판별에 쓸 수 없다고 문서가 설명합니다(1). 상태 전이의 성공 여부로 부수효과를 묶으면 중복이 와도 한 번만 실행됩니다.`
    },
    {
      q: `웹훅 서명 검증 코드입니다. 정상 웹훅인데도 가끔 검증이 실패합니다.
payload = request.get_json()
body = json.dumps(payload).encode()
if not verify(secret, msg_id, ts, body, sig_header):
    abort(400)
무엇이 문제입니까?`,
      choices: [
        `파싱한 JSON을 다시 직렬화해 원본 바이트와 달라졌다. 수신한 원문 바이트로 검증해야 한다`,
        `JSON 키를 알파벳순으로 정렬한 뒤 직렬화하지 않았다`,
        `verify 함수는 요청마다 새 비밀 키를 받아야 한다`,
        `abort(400) 대신 200을 돌려줘야 서명 검증이 통과한다`
      ],
      answer: 0,
      why: `서명은 보낸 쪽이 직렬화한 바이트에 대해 계산됩니다. 파싱 후 재직렬화하면 공백·키 순서·이스케이프가 달라져 간헐적으로 실패합니다. 키 정렬(1)은 송신자의 직렬화 방식을 알 수 없어 해결이 되지 않고, 응답 코드(3)는 검증 결과와 무관합니다.`
    },
    {
      q: `가상계좌 주문이 입금 기한이 지났는데도 입금 대기로 남아 재고가 계속 묶여 있습니다. 의뢰인이 "만료되면 PG가 웹훅으로 알려 주지 않나요?"라고 묻습니다. 올바른 대응은 무엇입니까?`,
      choices: [
        `개발자센터의 웹훅 재전송 버튼을 눌러 만료 알림을 다시 받는다`,
        `문서상 기한 만료 때는 웹훅이 없으므로, 기한을 내 DB에 저장하고 만료 배치로 주문을 정리하며 구매자에게 알린다`,
        `정산이 끝날 때까지 기다리면 PG가 상태를 바꿔 준다`,
        `입금 대기 주문이 재고를 잡지 않도록 가상계좌 결제를 아예 빼자고 제안한다`
      ],
      answer: 1,
      why: `토스페이먼츠 FAQ와 기술 블로그는 가상계좌가 만료돼도 상태가 바뀌지 않아 웹훅이 가지 않는다고 설명하므로, 재전송 버튼(0)이나 정산 대기(2)로는 만료 알림을 받을 수 없습니다. 가상계좌를 빼는 것(3)은 과한 대응이고, 재고 선점 정책과 만료 배치를 한 쌍으로 설계하는 것이 정석입니다.`
    },
    {
      q: `구독 서비스 의뢰인이 "회원이 원할 때마다 충전 금액을 빌링키로 자유롭게 결제하게 하고 싶다"고 합니다. 가장 적절한 대응은 무엇입니까?`,
      choices: [
        `빌링키는 어떤 결제에도 쓸 수 있으니 그대로 견적을 낸다`,
        `편의를 위해 카드 정보를 DB에 암호화해 저장하고 직접 결제한다`,
        `빌링키는 정기 구독 용도가 전제이고 별도 계약·리스크 검토가 필요하며 비정기 결제는 카드사 심사에서 허용되지 않을 수 있다는 문서 내용을 설명하고, PG와 허용 범위를 확인한 뒤 견적한다`,
        `customerKey를 회원 이메일로 정해 두면 문제없다고 안내한다`
      ],
      answer: 2,
      why: `토스페이먼츠는 자동결제에 추가 계약과 리스크 검토가 필요하고 정기 구독형이 아니면 제한될 수 있다고 하며, 포트원은 카드사 심사에서 비정기 결제가 허용되지 않을 수 있다고 경고합니다. 카드번호 직접 저장(1)은 심사와 보안 부담을 의뢰인에게 넘기고, 이메일 customerKey(3)는 문서가 안전하지 않다고 명시한 방식입니다.`
    },
    {
      q: `월 구독 청구 로그입니다.
03:00:00 charge order=SUB-S1-202612-a key=k1 -> read timeout
03:00:11 charge order=SUB-S1-202612-b key=k2 -> 200 DONE
03:07:40 (PG 조회) order=SUB-S1-202612-a status=DONE
구독자에게 같은 달 요금이 두 번 청구됐습니다. 무엇이 잘못됐습니까?`,
      choices: [
        `read timeout 값이 너무 짧아서 첫 요청이 실패했다`,
        `Idempotency-Key를 사용한 것 자체가 중복 청구를 일으켰다`,
        `PG가 같은 달의 두 번째 청구를 막지 않은 PG 결함이다`,
        `결과 불명인 시도를 확인하지 않고 새 orderId와 새 멱등 키로 다시 청구해, 첫 요청과 별개 거래가 됐다`
      ],
      answer: 3,
      why: `첫 요청은 PG에서 뒤늦게 성공했고, 두 번째는 주문 번호와 키가 달라 PG 입장에서 서로 다른 거래입니다. 타임아웃을 늘려도(0) 응답을 잃는 상황은 다시 생길 수 있고, 키 사용(1)이 원인이 아니라 키를 시도마다 바꾼 것이 원인입니다. 같은 시도는 같은 orderId·키로 재전송하거나 조회로 확정하고, 새 시도는 실패 확정 뒤에만 만들어야 합니다.`
    },
    {
      q: `정산 대사에서 PG에서 입금된 금액이 내 장부의 (승인액 - 취소액)보다 매달 일정 비율로 적습니다. 가장 먼저 확인할 것은 무엇입니까?`,
      choices: [
        `정산이 판매 대금에서 결제수단별 수수료와 부가세 등을 차감한 금액이라는 점을 예상 입금액 계산에 반영했는지`,
        `DB 인덱스가 빠져 합계 쿼리가 느린지`,
        `웹훅 재시도 횟수를 7회에서 늘려야 하는지`,
        `서버 시간대가 UTC인지`
      ],
      answer: 0,
      why: `토스페이먼츠 용어집은 정산 금액을 판매 대금에서 수수료·부가세 등을 뺀 값으로 정의하므로, 일정 비율의 부족분은 수수료 패턴일 가능성이 가장 큽니다. 쿼리 속도(1)와 웹훅 재시도(2)는 금액 비율과 무관하고, 시간대(3)는 날짜 경계 불일치를 만들지 일정 비율 차이를 만들지 않습니다.`
    },
    {
      q: `결제 테이블 정의입니다.
CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL
);
리뷰에서 지적해야 할 가장 중요한 문제는 무엇입니까?`,
      choices: [
        `BIGSERIAL 대신 UUID 기본키를 써야만 결제 테이블로 쓸 수 있다`,
        `금액을 부동소수로 저장해 합계·안분에서 오차가 생기고, provider_key에 UNIQUE가 없어 같은 결제의 중복 기록을 막지 못한다`,
        `status가 TEXT라서 PostgreSQL이 상태 전이를 거부한다`,
        `order_id에 외래키가 없으므로 한 주문에 결제 시도가 여러 번 생길 수 없다`
      ],
      answer: 1,
      why: `원화 금액은 정수나 NUMERIC으로 저장해야 하며 double은 합계와 환불 안분에서 1원 오차를 만듭니다. 또 PG의 결제 키에 유일 제약이 없으면 웹훅 중복 등으로 같은 결제가 두 번 기록됩니다. 기본키 종류(0)는 본질이 아니고, TEXT 상태(2)는 문제없이 쓰이며 허용표는 애플리케이션이 관리합니다. 외래키 부재(3)는 시도 횟수를 막지 않습니다.`
    },
    {
      q: `카카오 로그인을 붙이는 중입니다. 팀원이 "이메일을 회원 유일 키로 쓰고, 같은 이메일이면 기존 계정에 자동으로 합치자"고 제안합니다. 가장 적절한 설계는 무엇입니까?`,
      choices: [
        `제안대로 이메일을 유일 키로 쓰고 자동 병합한다`,
        `전화번호를 유일 키로 쓴다`,
        `(provider, 회원번호)를 identity 키로 저장하고 이메일은 속성으로만 둔다. 계정 연결은 로그인한 상태에서 명시적으로 한다`,
        `닉네임을 식별자로 쓴다`
      ],
      answer: 2,
      why: `카카오 문서는 이메일·전화번호가 바뀔 수 있으니 앱별 고유 ID인 회원번호를 쓰라고 안내합니다. 이메일 자동 병합(0)은 공급자가 이메일 소유를 검증하지 않은 경우 계정 탈취 경로가 되고, 전화번호(1)도 같은 이유로 안 됩니다. 닉네임(3)은 중복과 변경이 자유로워 식별자가 될 수 없습니다.`
    },
    {
      q: `의뢰인이 "신규 이벤트 쿠폰 홍보를 모든 가입자에게 알림톡으로 보내 달라"고 합니다. 가장 적절한 대응은 무엇입니까?`,
      choices: [
        `템플릿 문구를 안내처럼 보이게 써서 심사를 통과시킨다`,
        `딜러사를 바꾸면 광고성 발송도 가능하므로 그렇게 제안한다`,
        `가입자 전원의 번호를 받아 SMS로 대신 보내면 된다고 안내한다`,
        `알림톡은 정보성 메시지용이고 템플릿 심사가 있으므로 홍보성 발송은 범위 밖임을 설명하고, 광고 발송 수단과 수신 동의 요건은 의뢰인 법무·딜러사와 별도로 확인하도록 안내한다`
      ],
      answer: 3,
      why: `카카오 문서는 알림톡을 정보성 메시지 서비스로 정의하고 사전 심사를 통과한 템플릿만 발송할 수 있다고 합니다. 문구로 심사를 우회하려는 시도(0)는 계정 제재 위험이 있고, 딜러사 교체(1)는 서비스 성격을 바꾸지 못합니다. 번호를 합법적으로 수집한 목적을 벗어난 SMS 발송(2)은 수신 동의 문제를 일으킵니다.`
    },
    {
      q: `운영 전환 직후 승인 API 호출 결과입니다.
POST /v1/payments/confirm
Authorization: Basic (live 시크릿 키)
결제창 초기화에 쓴 클라이언트 키: test_ 로 시작
-> 400 INVALID_API_KEY
원인과 조치로 가장 적절한 것은 무엇입니까?`,
      choices: [
        `클라이언트 키와 시크릿 키가 서로 다른 세트(테스트와 라이브)다. 같은 세트의 키로 통일한다`,
        `API 접근 정책에 서버 IP가 빠져 있으니 IP를 추가한다`,
        `Idempotency-Key가 300자를 넘었으니 줄인다`,
        `웹훅 URL이 http라서 승인이 거절되니 https로 바꾼다`
      ],
      answer: 0,
      why: `토스페이먼츠 보안 체크리스트는 클라이언트 키와 시크릿 키를 같은 세트로 써야 하며 섞으면 INVALID_API_KEY(400)가 난다고 안내합니다. 멱등 키 길이 초과는 다른 코드(INVALID_IDEMPOTENCY_KEY)이고(2), 웹훅 URL은 승인 호출과 무관하며(3), IP 제한(1)은 이 로그의 키 조합 문제를 설명하지 못합니다.`
    }
  ],
  refs: [
    {
      title: `토스페이먼츠 개발자센터: 웹훅(Webhook) 연결하기`,
      url: `https://docs.tosspayments.com/guides/v2/webhook`,
      kind: `doc`,
      why: `이벤트 종류, 10초 안의 200 응답, 7회 재시도 간격, 수동 재시도와 30일 전송 이력까지 웹훅 운영의 기준이 되는 공식 가이드입니다. 4강의 숫자는 모두 이 문서에서 확인했습니다.`
    },
    {
      title: `토스페이먼츠 개발자센터: 웹훅 이벤트`,
      url: `https://docs.tosspayments.com/reference/using-api/webhook-events`,
      kind: `doc`,
      why: `이벤트별 페이로드, 서명 헤더와 검증 절차, 가상계좌 secret 검증, transmission-id를 중복 처리에 쓰지 말라는 설명, DEPOSIT_CALLBACK과 PAYMENT_STATUS_CHANGED를 함께 등록하면 이중 전송된다는 경고가 있습니다. 서명 구현 직전에 반드시 원문을 대조하세요.`
    },
    {
      title: `토스페이먼츠 개발자센터: API 레퍼런스(결제 승인·취소)`,
      url: `https://docs.tosspayments.com/reference`,
      kind: `doc`,
      why: `승인 API 파라미터, orderId 규칙, Payment 상태값, 취소·부분취소와 환불 계좌 필드, customerKey 안전 규칙의 근거입니다. 승인 항목은 10분, EXPIRED 상태 설명은 30분으로 유효 시간이 다르게 적힌 지점도 여기서 확인할 수 있습니다.`
    },
    {
      title: `토스페이먼츠 개발자센터: API 인증과 Idempotency-Key`,
      url: `https://docs.tosspayments.com/reference/using-api/authorization`,
      kind: `doc`,
      why: `Basic 인증 방식(시크릿 키 뒤에 콜론을 붙여 base64), 멱등 키의 길이(300자)·유효 기간(15일)·매칭 규칙과 처리 중 오류(409)를 설명합니다. 3강의 멱등 설계 근거입니다.`
    },
    {
      title: `토스페이먼츠 개발자센터: 자동결제(빌링) 이해하기`,
      url: `https://docs.tosspayments.com/guides/v2/billing`,
      kind: `doc`,
      why: `빌링키 발급과 승인, 직접 스케줄링 원칙, 추가 계약과 정기 구독형 제한, 빌링키 재조회 불가와 중복 발급 방지 불가 안내를 담았습니다. 5강의 정기결제 사실은 이 문서에서 확인했습니다.`
    },
    {
      title: `토스페이먼츠 개발자센터: 결제 취소하기`,
      url: `https://docs.tosspayments.com/guides/v2/cancel-payment`,
      kind: `doc`,
      why: `전체·부분 취소와 cancels 배열 누적, 취소 요청의 멱등 키 권고, 가상계좌의 입금 전(전체 취소만)·입금 후(환불 계좌 필요) 차이, 환불 시점 안내를 담았습니다. 6강 환불 모델의 근거입니다.`
    },
    {
      title: `토스페이먼츠 개발자센터: 배포 체크리스트`,
      url: `https://docs.tosspayments.com/guides/v2/deploy-checklist`,
      kind: `doc`,
      why: `라이브 키·MID 확인, 결제수단 심사, 수단별 테스트, 브라우저·모바일 확인 항목이 정리된 운영 전환 점검표입니다. 8강 체크리스트의 원본으로 삼으세요.`
    },
    {
      title: `토스페이먼츠 개발자센터: 보안 체크리스트`,
      url: `https://docs.tosspayments.com/reference/using-api/security-checklist`,
      kind: `doc`,
      why: `시크릿 키 노출 방지, 금액 교차 검증, IP 접근 정책, 웹훅 보안, 키 세트 혼용 오류를 다룹니다. 외주 납품 점검표에 그대로 옮기기 좋은 문서입니다.`
    },
    {
      title: `토스페이먼츠 개발자센터 용어집: 정산`,
      url: `https://docs.tosspayments.com/resources/glossary/settlement`,
      kind: `doc`,
      why: `정산의 정의, 정산 매출일, 일·주·월 정산과 영업일 +N 표현, 수수료·부가세 차감 방식을 설명합니다. 일정산 예시와 최소 일주일 주기 문구가 어긋나는 지점도 있어 계약 조건 확인이 필요합니다. 6강 대사 설계의 용어 기준입니다.`
    },
    {
      title: `PortOne V2 개발자 문서: 웹훅 연동`,
      url: `https://developers.portone.io/opi/ko/integration/webhook/readme-v2?v=v2`,
      kind: `doc`,
      why: `Standard Webhooks 기반 서명, 재시도 정책(재시도해도 timestamp 유지), 이벤트 종류, 조회로 재확인하는 샘플 처리 순서를 다룹니다. 연동 솔루션을 쓰는 의뢰 현장의 비교 기준입니다.`
    },
    {
      title: `PortOne V2 개발자 문서: 빌링키 결제 연동하기`,
      url: `https://developers.portone.io/opi/ko/integration/start/v2/billing/readme?v=v2`,
      kind: `doc`,
      why: `가맹점이 카드 정보를 저장할 수 없어 빌링키를 쓰는 이유, 빌링키는 정기 구독에만 쓸 수 있고 카드사 심사에서 비정기 결제가 허용되지 않을 수 있다는 주의 문구를 담았습니다. 하위의 예약/반복결제 문서는 다음 회차를 직접 이어서 예약하는 방식을 설명합니다. 5강의 포트원 사실 근거입니다.`
    },
    {
      title: `Standard Webhooks 사양`,
      url: `https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md`,
      kind: `standard`,
      why: `webhook-id·timestamp·signature 헤더, 서명 대상 문자열, HMAC-SHA256과 키 회전을 위한 다중 서명, 재직렬화 금지, webhook-id를 멱등 키로 쓰라는 권고의 원문입니다. 4강 예제 코드의 근거입니다.`
    },
    {
      title: `Kakao Developers: 카카오 로그인 이해하기`,
      url: `https://developers.kakao.com/docs/ko/kakaologin/common`,
      kind: `doc`,
      why: `토큰 수명, 리프레시 토큰 갱신, 회원번호 식별 권고, 연결 해제 웹훅, OIDC 지원을 설명합니다. 7강의 소셜 로그인 설계 근거입니다.`
    },
    {
      title: `Kakao Business: 알림톡(정보성 메시지) 안내`,
      url: `https://kakaobusiness.gitbook.io/main/ad/infotalk`,
      kind: `doc`,
      why: `채널 요건, 정보성 메시지 범위, 템플릿 사전 심사, 공식 딜러사를 통한 발송과 계약 조건 차이를 정리한 공식 안내입니다. 견적 전 의뢰인 준비물 확인에 쓰세요.`
    }
  ],
  gigs: [
    `크몽의 PG 연동 상품은 단건 결제 15만 원·3일, 웹훅·부분취소·알림톡 40만 원·7일, 빌링키 정기결제·정산 엑셀·1개월 하자보수 90만 원·10일처럼 범위가 계단식입니다(2026-11 열람, 공급자 자기 보고, 리뷰 0~16건). 시장 가격으로 단정하지 말고 견적서의 범위를 쪼개는 방식의 참고로만 쓰세요.`,
    `견적 전에 반드시 확인할 질문: PG 전자결제 계약이 이미 승인됐는가(가맹 심사는 의뢰인 일정), 결제수단은 무엇인가(수단별 심사), 월 구독이 정기 구독형인가(자동결제는 별도 계약), 환불 정책과 약관은 누가 쓰는가, 정산·세금·현금영수증은 누가 확인하는가, 카카오 채널과 딜러사는 준비됐는가.`,
    `의뢰인 준비물은 문서로 못 박으세요: 사업자 명의 PG 계약, 라이브·테스트 키(의뢰인 대시보드에서 발급), 도메인과 HTTPS 서버, 카카오 채널. 개발자가 의뢰인 명의로 계약하거나 키를 메신저·메일에 평문으로 받는 일은 피하고, 시크릿 키는 환경 변수로 직접 주입하게 하세요. 키 유출과 오용의 최종 책임은 상점에 있다고 PG 문서가 명시합니다.`,
    `견적서에 결제가 되는 것과 정산이 맞는 것을 나눠 쓰세요. 웹훅 수신, 부분취소, 가상계좌, 정기결제, 정산 CSV, 대사 리포트, 알림 발송을 각각 In/Out으로 적고, 새 결제수단 추가나 PG 변경은 변경 요청으로 분리합니다. 어댑터 인터페이스로 만들어 두면 변경 비용이 줄어듭니다.`,
    `일정 함정: 테스트 키 통과는 운영 승인이 아닙니다. 카드사·통신사 등 결제수단 심사, 계약 전에는 시험할 수 없는 가상계좌 테스트(FAQ 안내), 정기결제 추가 계약이 일정을 늘립니다. 일정에 의뢰인 의존 구간과 버퍼를 따로 표시하세요. 호스팅형 쇼핑몰 플랫폼의 기본 PG 기능으로 충분하지 않은지도 먼저 확인하세요.`,
    `납품 패키지에 넣을 것: 소스, API 문서, ERD, 환경 변수 목록, 키 이관 절차, 런북 3종(결과 불명 처리, 웹훅 재전송과 대사 실행, 수동 환불), 운영 전환 체크리스트 서명본, 대사 리포트 샘플, 무상 하자보수 기간과 범위(예: 크몽 상품의 1개월 기재 방식). 장애 책임을 PG 장애와 코드 결함으로 나누어 계약서에 정의하세요.`,
    `법·세무·개인정보는 의뢰인 책임 영역임을 문서에 적으세요: 환불·청약철회 기한과 약관, 현금영수증·세금계산서, 카드번호 비보관과 개인정보 최소 수집. 개발자는 기술적 안전장치를 제공하되 법령 해석은 의뢰인 법무·세무 담당 확인으로 남깁니다. 숫자는 법령 원문에서 확인한 뒤 설정값으로 두세요.`
  ]
};
