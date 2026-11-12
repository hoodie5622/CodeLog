(window.PRO_MODULES = window.PRO_MODULES || {})["be-sql"] = {
  id: "be-sql",
  summary: `PostgreSQL을 기준으로 데이터 모델링, 인덱스·실행 계획 튜닝, 트랜잭션·락 동시성 설계, SQLAlchemy 2.x와 Alembic 무중단 마이그레이션, 백업·복구 점검까지 직접 수행하고 전후 수치로 증명해 납품할 수 있다.`,
  hours: 120,
  goals: [
    `요구사항을 ERD와 DDL로 옮기며 정규화·제약조건(PK/FK/UNIQUE/CHECK)·돈과 시간 타입·키 전략을 고르고, 반정규화와 JSONB 사용을 근거와 함께 판단할 수 있다`,
    `조인·집계·윈도 함수·CTE·upsert·키셋 페이지네이션으로 실무 목록·리포트 쿼리를 작성하고 NULL 3값 논리와 조인 증폭 같은 결과 오류를 찾아낼 수 있다`,
    `B-tree 구조를 바탕으로 복합·부분·커버링·표현식 인덱스를 설계하고 쓰기 비용과 운영 중 생성(CONCURRENTLY) 위험까지 함께 판단할 수 있다`,
    `EXPLAIN (ANALYZE, BUFFERS)를 읽어 추정과 실제 행 수의 괴리, 조인 방식, 버퍼 접근량으로 병목을 찾고 pg_stat_statements로 튜닝 대상을 골라 전후 수치로 보고할 수 있다`,
    `MVCC 스냅샷과 Read Committed·Repeatable Read·Serializable의 차이를 설명하고 40001·40P01 오류에 대한 재시도를 설계할 수 있다`,
    `재고 차감 같은 경합 시나리오를 원자적 UPDATE·SELECT FOR UPDATE·낙관적 버전·SKIP LOCKED로 구현하고 동시 요청 테스트로 정합성을 검증할 수 있다`,
    `SQLAlchemy 2.x의 Session 경계와 로딩 전략으로 N+1을 제거하고 쿼리 수 테스트와 커넥션 풀 계산으로 회귀와 연결 고갈을 막을 수 있다`,
    `Alembic과 expand/contract 절차로 락 시간을 측정하며 무중단 스키마 변경을 수행하고, vacuum·백업/PITR·복제·버전 지원 종료를 점검해 런북과 함께 인계할 수 있다`
  ],
  lessons: [
    {
      title: `멘탈 모델과 데이터 모델링: 제약조건이 곧 계약이다`,
      body: `관계형 데이터베이스는 데이터를 표(행의 집합)로 저장하고, 사용자는 **무엇을 원하는지**만 SQL로 선언하면 **어떻게 찾을지**는 옵티마이저가 고르는 시스템입니다. 여기서 실무 원칙 세 가지가 나옵니다. 첫째, 데이터의 올바름(불변식)은 앱 코드가 아니라 DB 제약조건이 최종적으로 지킵니다. 앱 서버가 여러 대이고 배치·관리자 도구·다른 서비스가 같은 테이블에 쓰면 "앱에서 검사했다"는 말은 보증이 못 됩니다. 둘째, 같은 SQL도 통계와 인덱스에 따라 실행 방식이 달라지므로 성능은 문장이 아니라 **계획**의 속성입니다 (레슨 3·4). 셋째, 여러 요청이 같은 데이터를 동시에 건드리는 것이 기본 상태라서 트랜잭션과 격리를 모르면 "가끔만 틀리는" 버그가 생깁니다 (레슨 5·6).

### PostgreSQL 안에서 일어나는 일 한 장면

연결 하나마다 서버 프로세스 하나가 붙으므로 연결 수가 곧 비용입니다. 테이블은 8KB 페이지로 나뉜 힙에 저장되고 자주 쓰는 페이지는 shared_buffers와 OS 페이지 캐시에 올라옵니다. 커밋의 지속성은 데이터 페이지가 아니라 **WAL**(write-ahead log)을 디스크에 flush하는 것으로 얻고, 데이터 페이지는 체크포인트가 나중에 반영합니다. UPDATE는 새 행 버전을 만드는 MVCC 방식이어서 죽은 행을 치우는 vacuum이 필요합니다. 이론은 cs-db 모듈과 병행해 읽습니다.

### 타입 선택이 곧 버그 예방

- 금액: ‹float›/‹double› 금지. 원화처럼 소수가 없으면 원 단위 ‹bigint›, 소수가 필요하면 ‹numeric(19,4)›처럼 정밀도를 명시하고 통화 코드를 함께 저장하며 반올림 규칙을 문서에 적습니다.
- 시각: 사건이 일어난 순간은 ‹timestamptz›(UTC 기준 저장)입니다. zone 없는 ‹timestamp›는 "벽시계 숫자"일 뿐이라 서버 설정이 바뀌면 의미가 흔들립니다. "현지 오전 9시 예약"처럼 벽시계 자체가 의미인 값은 현지 시각과 IANA 시간대 이름(예: Asia/Seoul)을 따로 저장합니다.
- 문자열: ‹text›와 ‹varchar(n)›은 성능이 같으니 길이 제한은 업무 규칙이 있을 때만 겁니다.
- NULL은 "없음"이 아니라 "모름"입니다. ‹= NULL›은 항상 NULL이라 한 행도 고르지 못하고, ‹NOT IN (…, NULL)›은 어떤 행도 반환하지 않으며, ‹count(col)›은 NULL을 세지 않습니다.

### 모델링: 한 사실은 한 곳에

정규화는 외울 단계가 아니라 이상(anomaly) 방지 원칙입니다. 주문 행마다 고객 주소를 복사해 두면 이사한 고객의 주문 수백 행을 모두 고쳐야 하고, 하나라도 빠지면 주소가 둘이 됩니다. 그래서 한 칸에는 값 하나, 모든 컬럼은 키 전체에 의존, 키가 아닌 컬럼은 다른 비키 컬럼에 의존하지 않게 쪼개고, N:M 관계는 연결 테이블로 풉니다. **반정규화는 측정한 뒤의 선택**이며 두 종류를 구분해야 합니다. ‹order_items.unit_price_krw›처럼 "주문 시점의 값"을 고정하는 스냅샷은 업무 요구입니다. 가격이 내일 바뀌어도 어제 주문 금액은 변하면 안 됩니다. 반면 ‹orders.total_krw› 같은 합계 컬럼은 속도를 얻는 대신 동기화 책임을 지는 파생 캐시이므로, 어긋남을 찾는 검증 쿼리를 함께 둡니다.

### 키와 제약

- 기본키는 ‹bigint GENERATED ALWAYS AS IDENTITY›가 무난합니다. URL·API에 노출할 식별자는 추측을 막으려고 UUID를 따로 둡니다. 무작위 UUIDv4를 기본키로 쓰면 B-tree 삽입 위치가 흩어져 페이지 분할과 캐시 효율이 나빠지기 쉬우므로 시간순 UUIDv7이 대안이며, PostgreSQL 18이 ‹uuidv7()›을 추가했습니다 (2025-09 릴리스, 2026-11 기준).
- 자연키(이메일, 사업자번호)는 바뀔 수 있으니 기본키 대신 ‹UNIQUE›로 둡니다.
- ‹FOREIGN KEY›의 삭제 동작은 기본(거부)을 유지하고, ‹ON DELETE CASCADE›는 부모 없이 의미 없는 자식(주문 → 주문 항목)에만 씁니다.
- ‹CHECK›로 상태값·범위(재고 ≥ 0, 수량 > 0)를 걸면 버그가 데이터를 오염시키기 전에 실패합니다.
- 소프트 삭제(‹deleted_at›)를 쓰면 일반 UNIQUE가 삭제된 행과 충돌하므로 부분 유니크 인덱스(‹WHERE deleted_at IS NULL›)를 쓰고, 모든 조회에 조건이 빠짐없이 들어가는지 점검합니다. 멀티테넌트는 모든 테이블에 ‹tenant_id›를 넣고 UNIQUE·FK에도 포함합니다(RLS는 보조 방어선).

### JSONB와 NoSQL 판단

외부 API 응답 원문, 고객마다 제각각인 설정처럼 모양이 고정되지 않은 속성 묶음은 ‹jsonb›가 맞습니다. 하지만 조인·집계·제약이 필요한 핵심 값을 넣으면 타입·제약·통계의 도움을 모두 잃고, 갱신 때 행 전체에 락이 잡히고 문서 전체가 새로 쓰이므로 크고 자주 바뀌는 문서는 경합과 쓰기 비용을 키웁니다. NoSQL은 단일 키 접근이 압도적이거나 수평 확장 요구가 숫자로 증명될 때 검토하며, 그 전의 대부분 외주는 PostgreSQL 하나로 충분합니다.`,
      code: `CREATE TABLE customers (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      text NOT NULL CHECK (position('@' in email) > 1),
  deleted_at timestamptz,                          -- 소프트 삭제: NULL 이면 활성
  created_at timestamptz NOT NULL DEFAULT now()
);
-- 삭제된 행은 제외하고 이메일 유일성을 보장 (부분 유니크 인덱스)
CREATE UNIQUE INDEX customers_email_active_uk ON customers (email) WHERE deleted_at IS NULL;

CREATE TABLE products (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku       text NOT NULL UNIQUE,
  name      text NOT NULL,
  price_krw integer NOT NULL CHECK (price_krw >= 0),
  stock     integer NOT NULL DEFAULT 0 CHECK (stock >= 0)
);

CREATE TABLE orders (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id   uuid NOT NULL DEFAULT uuidv7() UNIQUE,   -- PostgreSQL 18+, 이전 버전은 앱에서 생성
  customer_id bigint NOT NULL REFERENCES customers(id),
  status      text NOT NULL DEFAULT 'PENDING'
              CHECK (status IN ('PENDING','PAID','SHIPPED','CANCELED')),
  total_krw   bigint NOT NULL CHECK (total_krw >= 0),  -- 파생 캐시: 검증 쿼리와 함께 운영
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  order_id       bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  line_no        smallint NOT NULL,
  product_id     bigint NOT NULL REFERENCES products(id),
  qty            integer NOT NULL CHECK (qty > 0),
  unit_price_krw integer NOT NULL CHECK (unit_price_krw >= 0),  -- 주문 시점 가격 스냅샷
  PRIMARY KEY (order_id, line_no)
);

INSERT INTO customers (email) VALUES ('a@example.com'), ('b@example.com');
-- 같은 이메일을 다시 넣으면 DB 가 거부한다 (SQLSTATE 23505)
-- NULL 은 '모름': 아래 두 쿼리는 모두 0 건이다
SELECT count(*) FROM customers WHERE email = NULL;
SELECT count(*) FROM customers WHERE email NOT IN ('a@example.com', NULL);`,
      codeLang: `sql`,
      key: [
        `불변식은 앱이 아니라 DB 제약조건(NOT NULL, UNIQUE, FK, CHECK)이 마지막 방어선으로 지킨다. 쓰는 주체가 여러 개가 되면 앱 검사는 보증이 아니다.`,
        `SQL은 선언적이다. 같은 문장도 통계와 인덱스에 따라 계획이 달라지므로 성능은 계획의 속성이다.`,
        `PostgreSQL은 연결당 프로세스이고, 커밋은 WAL flush로 지속성을 얻으며, UPDATE는 새 행 버전을 만든다(MVCC).`,
        `돈은 numeric 또는 최소 단위 정수, 순간은 timestamptz, NULL은 3값 논리(= NULL과 NOT IN의 함정)를 기억한다.`,
        `주문 시점 가격 같은 스냅샷은 업무 요구이고 합계 컬럼 같은 파생값은 동기화 책임이 따르는 캐시다. 반정규화는 측정한 뒤에 한다.`
      ],
      pitfalls: [
        `중복 가입을 앱에서만 SELECT로 확인하고 UNIQUE 제약을 걸지 않아, 동시 요청 두 개가 둘 다 통과해 중복 행이 생긴다.`,
        `금액을 float로 저장해 합계가 1원씩 어긋나고, 반올림 규칙이 문서에 없어 정산 때 분쟁이 난다.`,
        `로컬 시각을 zone 없는 timestamp에 저장하고 서버 시간대나 배포 리전이 바뀐 뒤 시각이 9시간 밀린다.`,
        `NOT IN (서브쿼리)의 서브쿼리가 NULL을 하나라도 반환하면 결과가 통째로 비는데, 이를 모르고 NOT EXISTS로 바꾸지 않는다.`
      ]
    },
    {
      title: `SQL 심화: 조인·집계·윈도 함수·CTE·upsert·키셋 페이지네이션`,
      body: `SQL은 행을 하나씩 도는 언어가 아니라 **집합을 변환하는 언어**입니다. 반복문을 떠올리는 순간 쿼리가 N번 나가는 코드(레슨 7의 N+1)로 가기 쉬우니, "입력 집합 → 조건으로 거르고 → 묶고 → 정렬해 일부만"의 흐름으로 생각합니다. 논리적 처리 순서는 FROM·JOIN → WHERE → GROUP BY → HAVING → SELECT(윈도 함수 포함) → DISTINCT → ORDER BY → LIMIT입니다. 그래서 WHERE에서는 SELECT의 별칭을 쓸 수 없고, 집계 결과로 거르려면 WHERE가 아니라 HAVING이 필요합니다.

### 조인에서 결과가 틀리는 두 가지

1. LEFT JOIN의 오른쪽 테이블 조건을 WHERE에 쓰면 NULL 행이 걸러져 사실상 INNER JOIN이 됩니다. 오른쪽 조건은 ‹ON›에 씁니다.
2. **조인 증폭(fan-out)**: 주문 1건에 항목 3개, 결제 2건이면 두 자식 테이블을 한 번에 조인하는 순간 주문이 6행으로 불어나 합계가 부풀려집니다. ‹DISTINCT›나 ‹sum(DISTINCT …)›로 덮으면 금액이 같은 서로 다른 결제 두 건이 하나로 합쳐지는 반대 방향의 오류가 생깁니다. 정답은 자식별로 **먼저 집계한 뒤** 조인하는 것입니다. 개발 데이터에서는 항목이 1개뿐이라 안 보이다가 운영에서 터지므로, 코드 리뷰에서 "조인한 1:N 테이블이 두 개 이상인가"를 반드시 묻습니다.

### 집계와 윈도 함수

‹count(*) FILTER (WHERE …)›로 한 번의 스캔에서 조건별 개수를 구합니다. 윈도 함수는 행을 합치지 않고 각 행 옆에 그룹 계산을 붙입니다. ‹row_number() OVER (PARTITION BY customer_id ORDER BY created_at DESC)›로 "고객별 최신 1건", ‹lag()›로 전월 대비, ‹sum() OVER (ORDER BY …)›로 누적합을 구합니다. 함정 두 가지를 기억하세요. 집계 윈도에 ORDER BY를 쓰면 기본 프레임이 "처음부터 현재 행과 동률인 행까지"라서 정렬 키가 같은 행끼리 같은 누적값을 받습니다. 그리고 정렬 키가 동률이면 순서가 비결정적이므로 끝에 ‹id›를 붙입니다. PostgreSQL 전용 ‹DISTINCT ON (customer_id)›도 그룹당 1건을 간결하게 고르지만 이식성은 없습니다.

### CTE, 재귀, upsert

‹WITH›는 긴 쿼리를 이름 붙은 단계로 쪼개 읽기 쉽게 합니다. PostgreSQL 12부터 부작용이 없고 한 번만 참조되는 비재귀 CTE는 본 쿼리에 인라인되어 최적화 장벽이 되지 않으며, 필요하면 ‹MATERIALIZED›나 ‹NOT MATERIALIZED›로 지정합니다. ‹WITH RECURSIVE›는 카테고리 트리나 조직도 같은 계층을 순회하는데, 순환 가능성이 있으면 깊이 제한을 둡니다.

‹INSERT … ON CONFLICT (키) DO UPDATE›나 ‹DO NOTHING›은 "있으면 갱신, 없으면 삽입"을 원자적으로 처리합니다. SELECT로 확인한 뒤 INSERT하는 코드는 요청 두 개가 동시에 오면 둘 다 없다고 판단해 중복을 만들지만, UNIQUE 제약을 판정자로 삼는 upsert는 안전합니다. ‹RETURNING›으로 결과 행을 바로 받아 왕복을 줄입니다. 결제 콜백의 멱등 처리에 자주 쓰입니다 (레슨 6).

### 페이지네이션과 대량 쓰기

‹OFFSET 100000 LIMIT 20›은 앞의 10만 행을 만들어 버립니다. 깊은 페이지일수록 선형으로 느려지고, 데이터가 중간에 바뀌면 같은 항목이 중복되거나 빠집니다. **키셋(seek) 페이지네이션**은 마지막으로 본 정렬 키를 기억해 ‹WHERE (created_at, id) < (:마지막 값들) ORDER BY created_at DESC, id DESC LIMIT 20›으로 인덱스에서 바로 이어 읽습니다. 임의 페이지로 점프할 수 없어 무한 스크롤·API 커서에 맞고, 관리자 화면의 "31페이지로 이동"에는 OFFSET을 쓰되 최대 페이지를 제한합니다. 전체 건수 ‹count(*)›도 MVCC 때문에 큰 테이블에서는 행을 실제로 세어야 하므로, 정확한 총계가 정말 필요한지 먼저 묻습니다. 대량 쓰기는 행마다 왕복하지 말고 multi-row INSERT, 드라이버의 배치 API, 대량 적재용 ‹COPY›를 쓰고 수천 행 단위로 트랜잭션을 나눕니다.`,
      code: `-- 1) 고객별 최신 주문 1건 (윈도 함수, 동률은 id 로 결정)
SELECT *
FROM (
  SELECT o.*,
         row_number() OVER (PARTITION BY customer_id ORDER BY created_at DESC, id DESC) AS rn
  FROM orders o
) t
WHERE rn = 1;

-- 2) 월별 매출과 전월 대비 (집계 후 윈도)
WITH monthly AS (
  SELECT date_trunc('month', created_at) AS month, sum(total_krw) AS revenue
  FROM orders
  WHERE status = 'PAID'
  GROUP BY 1
)
SELECT month, revenue,
       revenue - lag(revenue) OVER (ORDER BY month) AS diff_from_prev
FROM monthly
ORDER BY month;

-- 3) 조인 증폭 방지: 자식별로 먼저 집계한 뒤 조인한다 (payments(order_id, amount_krw) 테이블을 가정)
SELECT o.id, i.items_total, coalesce(p.paid, 0) AS paid
FROM orders o
JOIN (SELECT order_id, sum(qty * unit_price_krw) AS items_total
      FROM order_items GROUP BY order_id) i ON i.order_id = o.id
LEFT JOIN (SELECT order_id, sum(amount_krw) AS paid
           FROM payments GROUP BY order_id) p ON p.order_id = o.id;

-- 4) 키셋 페이지네이션: 마지막으로 본 (created_at, id) 다음 20건
SELECT id, created_at, status
FROM orders
WHERE customer_id = 42
  AND (created_at, id) < ('2026-10-01 00:00:00+09', 91234)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- 5) 멱등 upsert: 같은 sku 를 몇 번 보내도 한 행
INSERT INTO products (sku, name, price_krw)
VALUES ('SKU-1', '머그컵', 9900)
ON CONFLICT (sku) DO UPDATE
  SET name = EXCLUDED.name, price_krw = EXCLUDED.price_krw
RETURNING id;`,
      codeLang: `sql`,
      key: [
        `논리적 처리 순서는 FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT이다. WHERE에서는 SELECT 별칭을 못 쓴다.`,
        `1:N 테이블을 두 개 이상 동시에 조인하면 행이 곱해져 합계가 부푼다. DISTINCT로 덮지 말고 자식별로 먼저 집계한다.`,
        `윈도 함수는 행을 합치지 않는다. 동률이 있는 정렬에는 id를 덧붙여 결정적 순서를 만든다.`,
        `upsert(ON CONFLICT)는 UNIQUE 제약을 판정자로 삼아 check-then-insert 경쟁을 없앤다.`,
        `깊은 페이지는 키셋 페이지네이션을 쓴다. OFFSET은 앞 행을 전부 만든 뒤 버린다.`
      ],
      pitfalls: [
        `합계가 안 맞을 때 DISTINCT를 붙여 증상만 가리고 원인(조인 증폭)을 방치한다.`,
        `LEFT JOIN 뒤에 오른쪽 테이블 조건을 WHERE에 써서 의도치 않게 INNER JOIN이 된다.`,
        `OFFSET 기반 API에서 새 데이터가 삽입되는 사이 다음 페이지에 같은 항목이 다시 나오거나 항목이 누락된다.`,
        `ORDER BY 없이 LIMIT를 쓰거나 동률이 많은 컬럼만으로 정렬해 페이지마다 결과가 달라진다.`
      ]
    },
    {
      title: `인덱스: B-tree 원리, 복합·부분·커버링, 종류별 선택과 쓰기 비용`,
      body: `인덱스는 "정렬된 보조 사본"입니다. PostgreSQL 기본인 B-tree는 8KB 페이지를 노드로 하는 균형 트리로, 한 노드에 수백 개의 키가 들어가므로 수천만 행도 보통 루트에서 리프까지 3~4단계로 도달합니다. 리프 페이지끼리 연결돼 있어 범위 조회와 정렬된 읽기가 빠릅니다. 키를 찾은 뒤에는 그 행이 있는 힙 페이지를 가져와야 하는데(랜덤 I/O), 그래서 인덱스의 이득은 "얼마나 적은 행을 고르는가"(선택도)에 달려 있습니다. 테이블의 상당 부분(경험적으로 수 퍼센트 이상)을 읽어야 하면 플래너가 순차 스캔이 더 싸다고 판단하는 것이 정상이며, 이를 억지로 막는 것은 해법이 아닙니다.

### 인덱스를 못 타는 전형적인 쿼리

- 컬럼에 함수를 씌운 조건: ‹WHERE date(created_at) = '2026-10-01'›은 ‹created_at› 인덱스를 쓰지 못합니다. 범위 조건(‹>= … AND < …›)으로 고쳐 쓰거나 표현식 인덱스를 만듭니다. ‹lower(email) = …›을 자주 쓴다면 ‹lower(email)›에 인덱스를 만들고 조회도 같은 식으로 씁니다. 날짜 경계는 세션 시간대의 영향을 받으니 함께 확인합니다.
- 앞쪽 와일드카드 ‹LIKE '%abc'›: B-tree는 앞부분이 고정된 패턴만 도울 수 있습니다(로케일에 따라 별도 연산자 클래스가 필요). 부분 문자열 검색은 ‹pg_trgm›과 GIN을 검토합니다.
- 타입 불일치로 생기는 암묵적 캐스팅, 선두 컬럼 조건이 없는 복합 인덱스 조회(아래).

### 복합 인덱스: 컬럼 순서가 설계의 전부

복합 인덱스는 첫 컬럼으로 정렬하고 그 안에서 둘째 컬럼으로 정렬한 사전입니다. 규칙은 이렇습니다. (1) **등호 조건 컬럼을 앞에**, 범위·정렬 컬럼을 뒤에 둡니다. ‹WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20›에는 ‹(customer_id, created_at DESC)›가 이상적이어서 그 고객 구간의 앞쪽 20개만 읽고 끝나며 정렬도 필요 없습니다. 순서를 뒤집은 ‹(created_at, customer_id)›는 전체 기간을 훑으며 고객 ID를 걸러야 합니다. (2) 선두 컬럼 조건이 없으면 효율이 크게 떨어집니다. PostgreSQL 18의 skip scan이 복합 B-tree를 쓸 수 있는 경우를 늘렸지만(2026-11 기준), 선두 컬럼의 값 종류가 많으면 이득이 작을 수밖에 없으므로 설계의 기본은 여전히 선두 컬럼부터 맞추는 것입니다. (3) 선두 컬럼이 같은 인덱스가 여러 개면 하나로 합칠 수 있는지 봅니다.

### 커버링, 부분, 표현식

- ‹INCLUDE (col…)›로 키가 아닌 컬럼을 인덱스에 실으면 힙을 읽지 않는 **Index Only Scan**이 가능합니다. 단 가시성 맵이 최신이어야 하므로 vacuum이 밀리면 ‹Heap Fetches›가 늘어 이득이 사라집니다. 넓은 컬럼을 싣지 말고 목록 화면에 필요한 몇 개로 제한합니다.
- **부분 인덱스** ‹WHERE status = 'PENDING'›는 전체의 1%만 담아 작고 빠릅니다. 소프트 삭제의 부분 UNIQUE에도 씁니다. 쿼리 조건이 인덱스 조건을 포함해야 사용됩니다.

### 다른 인덱스 종류와 JSONB

| 종류 | 잘 맞는 곳
| B-tree | 등호·범위·정렬. 기본값이며 대부분 이것으로 충분
| Hash | 등호만. B-tree 대비 이점이 작아 실무에서는 드묾
| GIN | 배열·jsonb·전문 검색·trigram처럼 한 행에 키가 여럿인 데이터
| GiST, SP-GiST | 지오메트리·범위 타입·최근접 이웃, exclusion constraint
| BRIN | 물리 순서와 값이 상관된 대형 append-only 테이블(시계열)에서 아주 작은 인덱스

jsonb의 기본 GIN(‹jsonb_ops›)은 키 존재(‹?›)와 포함(‹@>›)을 모두 지원합니다. ‹jsonb_path_ops›는 포함(‹@>›) 위주라 보통 훨씬 작고 빠르지만 키 존재 검색은 못 합니다 (PostgreSQL 18 문서). 특정 키로 자주 거른다면 ‹((attrs->>'color'))› 같은 표현식 B-tree가 더 낫기도 합니다. 자주 거르고 조인하는 값이 jsonb 안에 있다면 일반 컬럼으로 꺼내야 한다는 신호입니다.

### 쓰기 비용과 운영

인덱스 하나마다 INSERT·DELETE(와 키가 바뀌는 UPDATE)가 그 인덱스도 갱신합니다. 인덱스 12개를 단 쓰기 많은 테이블이 느린 것은 대개 인덱스 때문입니다. 쓰이지 않는 인덱스는 ‹pg_stat_user_indexes.idx_scan›으로 찾되, 통계 초기화 시점 이후의 관찰 기간에 월말 배치 같은 드문 쿼리까지 포함된 뒤에 지웁니다. FK 컬럼에 인덱스가 없으면 부모 행을 지울 때 자식 테이블을 순차 스캔합니다. 운영 중 생성은 ‹CREATE INDEX CONCURRENTLY›를 씁니다. 쓰기를 막지 않는 대신 테이블을 두 번 스캔해 더 오래 걸리고, 트랜잭션 블록 안에서는 못 쓰며, 실패하면 ‹INVALID› 인덱스가 남아 쓰기 비용만 먹으므로 psql의 ‹\\d 테이블명›으로 확인해 지우고 다시 만듭니다.`,
      code: `-- 쿼리: 고객의 최근 주문 20건
--   WHERE customer_id = $1 ORDER BY created_at DESC, id DESC LIMIT 20
-- 아래 CONCURRENTLY 문은 트랜잭션 블록 밖에서 한 문장씩 실행한다.
CREATE INDEX CONCURRENTLY orders_cust_created_idx
  ON orders (customer_id, created_at DESC, id DESC);

-- (선택지) 목록 화면 컬럼을 인덱스에 실어 힙 접근을 없앤다 (Index Only Scan)
-- CREATE INDEX CONCURRENTLY orders_cust_cover_idx
--   ON orders (customer_id, created_at DESC) INCLUDE (status, total_krw);

-- 부분 인덱스: 처리 대기 주문만 (전체의 1% 라면 인덱스도 1%)
CREATE INDEX CONCURRENTLY orders_pending_idx
  ON orders (created_at) WHERE status = 'PENDING';

-- 표현식 인덱스: 대소문자 무시 이메일 조회 (활성 고객만)
CREATE UNIQUE INDEX CONCURRENTLY customers_email_lower_uk
  ON customers (lower(email)) WHERE deleted_at IS NULL;
-- 조회도 WHERE lower(email) = lower($1) AND deleted_at IS NULL 형태여야 이 인덱스를 탄다

-- FK 컬럼 인덱스: PostgreSQL 은 자동으로 만들지 않는다
CREATE INDEX CONCURRENTLY order_items_product_idx ON order_items (product_id);

-- 미사용·거대 인덱스 점검 (통계 초기화 시점과 관찰 기간을 함께 확인)
SELECT relname, indexrelname, idx_scan,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC
LIMIT 10;`,
      codeLang: `sql`,
      key: [
        `B-tree는 정렬된 균형 트리와 연결된 리프다. 등호·범위·정렬에 쓰이고 수천만 행도 3~4단계로 도달한다. 이득은 선택도에 달려 있다.`,
        `복합 인덱스는 등호 조건 컬럼을 앞에, 범위·정렬 컬럼을 뒤에 둔다. 선두 컬럼부터 맞추는 것이 기본이며 18의 skip scan은 보조 수단이다.`,
        `컬럼에 함수를 씌우면 일반 인덱스를 못 탄다. 범위 조건으로 재작성하거나 표현식 인덱스를 만든다.`,
        `INCLUDE·부분·표현식 인덱스로 작고 정확한 인덱스를 만든다. Index Only Scan은 vacuum(가시성 맵) 상태에 의존한다.`,
        `인덱스는 쓰기 비용이다. 운영 중 생성은 CONCURRENTLY로 하고 실패하면 INVALID 인덱스가 남는지 확인한다.`
      ],
      pitfalls: [
        `느릴 때마다 인덱스를 추가해 쓰기 지연·디스크·vacuum 부담이 누적되고 미사용 인덱스가 쌓인다.`,
        `선택도가 낮은 컬럼에 단독 인덱스를 만들고 안 타는 이유를 찾지 않은 채 enable_seqscan=off로 덮는다.`,
        `운영 DB에서 일반 CREATE INDEX를 실행해 생성이 끝날 때까지 해당 테이블의 쓰기가 막힌다.`,
        `FK 컬럼 인덱스를 빼먹어 부모 행 삭제나 조인에서 자식 테이블 전체 스캔이 반복된다.`
      ]
    },
    {
      title: `실행 계획과 쿼리 튜닝: EXPLAIN (ANALYZE, BUFFERS) 읽기`,
      body: `튜닝의 출발점은 감이 아니라 **계획**입니다. PostgreSQL 플래너는 통계(‹ANALYZE›가 표본으로 모은 컬럼별 고유값 수, 자주 나오는 값, 히스토그램)를 바탕으로 가능한 계획마다 비용을 추정해 가장 싼 것을 고릅니다. 비용은 순차 페이지 하나를 읽는 비용(‹seq_page_cost›)을 1.0으로 둔 임의 단위라서 밀리초가 아닙니다 (PostgreSQL 문서). 그래서 통계가 틀리면 계획이 틀리고, 계획이 틀리면 SQL이 같아도 느립니다.

### EXPLAIN 읽는 법

‹EXPLAIN›은 계획만 보여 주고 ‹EXPLAIN ANALYZE›는 쿼리를 **실제로 실행**해 노드별 실제 시간·행 수·반복 횟수(loops)를 함께 보여 줍니다. 따라서 UPDATE·DELETE는 ‹BEGIN; EXPLAIN ANALYZE …; ROLLBACK;›으로 감싸야 데이터가 바뀌지 않습니다. 버퍼 접근량을 보여 주는 ‹BUFFERS›는 PostgreSQL 18부터 ANALYZE에 기본 포함되고, 이전 버전에서는 직접 켭니다 (18 릴리스 노트). 트리에서 들여쓴 안쪽 노드가 바깥 노드의 입력입니다. 아래는 설명용으로 만든 가상 예시입니다.

| Limit  (actual time=0.05..0.21 rows=20 loops=1)
|   ->  Index Scan using orders_cust_created_idx on orders
|         (cost=0.43..61.20 rows=48 width=40) (actual time=0.04..0.19 rows=20 loops=1)
|         Index Cond: (customer_id = 42)
|         Buffers: shared hit=24
| Execution Time: 0.3 ms

읽을 때의 점검 순서는 다음과 같습니다.

1. **추정 rows와 실제 rows**: 10배 넘게 어긋난 노드가 근본 원인인 경우가 많습니다. 플래너가 3행이라고 믿고 Nested Loop를 골랐는데 실제로 48만 행이면 느린 계획이 됩니다. 원인은 낡은 통계(‹n_mod_since_analyze›), 컬럼 간 상관(독립 가정이 깨짐, ‹CREATE STATISTICS›로 보완), 추정할 수 없는 식입니다.
2. **loops**: ‹actual time›과 ‹rows›는 한 번 실행당 평균이므로 loops를 곱해야 총량입니다. 안쪽 노드가 loops=480000이면 그 곱이 전체 시간입니다.
3. **Rows Removed by Filter**가 크면 읽고 버리는 중이니 인덱스 부재를 의심합니다.
4. **Buffers**의 shared hit(캐시)와 read(디스크 읽기)로 느림이 I/O인지 CPU인지 가릅니다. 첫 실행과 반복 실행이 다르므로 항상 여러 번 잽니다.
5. **Sort Method: external merge Disk**는 work_mem을 넘었다는 뜻입니다. 인덱스로 정렬을 없애거나 세션 단위로 work_mem을 올립니다. 전역으로 올리면 동시 쿼리 수 × 정렬 노드 수만큼 곱해져 메모리가 부족해질 수 있습니다.
6. 스캔은 Seq Scan, Index Scan, Index Only Scan(‹Heap Fetches› 확인), Bitmap Heap Scan(중간 크기 결과)이고, 조인은 **Nested Loop**(바깥이 작고 안쪽이 인덱스일 때), **Hash Join**(한쪽을 해시로 올려 대량 등호 조인), **Merge Join**(정렬된 두 입력)입니다.

### 튜닝 절차

1. 느린 쿼리를 감으로 찾지 말고 ‹pg_stat_statements›에서 ‹total_exec_time›이 큰 순서로 봅니다. 한 번에 3초 걸리는 월간 리포트보다 5ms짜리가 초당 800번 도는 쿼리가 DB를 더 많이 씁니다. 이 확장은 ‹shared_preload_libraries›에 넣고 서버를 재시작해야 켜집니다.
2. 운영과 같은 **파라미터**, 같은 규모의 데이터로 ‹EXPLAIN (ANALYZE, BUFFERS)›를 합니다. 1천 행짜리 개발 DB의 계획은 증거가 되지 못합니다.
3. 가설 하나, 변경 하나(인덱스, 재작성, 통계)씩 적용합니다.
4. 같은 조건으로 3회 이상 재측정해 중앙값, 전후 계획 원문, 인덱스 크기와 쓰기 비용을 기록합니다.
5. 느린 쿼리 로그(‹log_min_duration_statement›)와 pg_stat_statements 기반 알림으로 회귀를 잡습니다.

### 자주 쓰는 재작성

함수를 씌운 컬럼 → 범위 조건. ‹SELECT *› → 필요한 컬럼만(Index Only Scan 가능). 행마다 실행되는 상관 서브쿼리 → 조인·윈도·‹LATERAL›. 서로 다른 컬럼을 OR로 묶은 조건 → ‹UNION ALL›. OFFSET → 키셋. 수천 개짜리 ‹IN (…)› → ‹= ANY(배열)›이나 조인. PostgreSQL 본체에는 쿼리 힌트가 없어서 계획을 고정하기보다 통계·인덱스·쿼리 구조로 유도합니다. 19 릴리스 후보 문서에 계획을 지시하는 pg_plan_advice가 보이지만 GA 전이므로(2026-11 기준) 의존하지 않습니다.`,
      code: `-- 1) 튜닝 대상 고르기: 한 번이 느린 쿼리가 아니라 합계가 큰 쿼리
SELECT queryid, calls,
       round(total_exec_time::numeric, 0) AS total_ms,
       round(mean_exec_time::numeric, 2)  AS mean_ms,
       rows, left(query, 80) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- 2) 실제 파라미터로 계획 확인 (UPDATE/DELETE 라면 BEGIN ... ROLLBACK 으로 감싼다)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, created_at, status
FROM orders
WHERE customer_id = 42 AND created_at >= now() - interval '30 days'
ORDER BY created_at DESC
LIMIT 20;

-- 3) 통계가 낡았는가: 변경량과 마지막 analyze 시각
SELECT relname, n_live_tup, n_dead_tup, n_mod_since_analyze, last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = 'orders';

-- 4) 추정이 계속 틀리면 통계를 갱신하고, 컬럼 간 상관이 원인이면 확장 통계를 만든다
ANALYZE orders;
CREATE STATISTICS orders_cust_status_stx (dependencies) ON customer_id, status FROM orders;
ANALYZE orders;

-- 5) 변경 전후 비교를 위해 통계를 초기화하고 같은 부하를 다시 돌린다
SELECT pg_stat_statements_reset();`,
      codeLang: `sql`,
      key: [
        `플래너는 통계 기반 비용 추정으로 계획을 고른다. 비용은 상대 단위이며 통계가 틀리면 계획이 틀린다.`,
        `EXPLAIN ANALYZE는 쿼리를 실제로 실행한다. UPDATE/DELETE는 BEGIN과 ROLLBACK으로 감싼다. 18부터 ANALYZE에는 BUFFERS가 기본 포함된다.`,
        `추정 rows와 실제 rows의 격차, loops 곱, Rows Removed by Filter, Buffers의 hit와 read, Sort의 Disk 사용 여부를 차례로 본다.`,
        `대상은 pg_stat_statements의 total_exec_time 순으로 고르고, 운영과 같은 파라미터·데이터 규모로 측정한다.`,
        `가설 하나, 변경 하나, 같은 조건 3회 이상 재측정한 중앙값과 전후 계획 원문을 기록한다.`
      ],
      pitfalls: [
        `소량의 개발 DB에서 얻은 계획으로 결론을 내려 운영에서 전혀 다른 계획이 선택된다.`,
        `운영 DB에서 UPDATE/DELETE에 그대로 EXPLAIN ANALYZE를 실행해 실제로 데이터를 바꾼다.`,
        `enable_nestloop=off나 enable_seqscan=off 같은 전역 설정으로 증상을 덮어 다른 쿼리까지 망가뜨린다.`,
        `첫 실행과 캐시가 데워진 반복 실행을 비교해 캐시 효과를 튜닝 성과로 착각한다.`
      ]
    },
    {
      title: `트랜잭션·ACID·MVCC·격리 수준: 같은 코드가 DB마다 다르게 동작하는 이유`,
      body: `트랜잭션은 "전부 성공하거나 전부 없던 일"이 되는 작업 단위입니다. ACID를 실무 언어로 옮기면 **원자성**은 중간에 실패하면 롤백(WAL로 구현), **일관성**은 제약조건이 지키는 불변식, **격리**는 동시 트랜잭션끼리 서로 보이는 정도, **지속성**은 커밋 응답 전에 WAL이 디스크에 닿았다는 약속(‹synchronous_commit›)입니다. 트랜잭션 경계는 기술 단위(요청 1개)가 아니라 **업무 불변식 단위**로 정합니다. "주문 생성 + 재고 차감 + 주문 항목 삽입"은 한 단위여야 하고, 외부 결제 API 호출은 단위 안에 넣지 않습니다(커넥션과 락을 오래 쥐고, 롤백해도 외부 결제는 되돌려지지 않기 때문입니다. 아웃박스 패턴으로 분리). PostgreSQL에서는 트랜잭션 안에서 문장 하나가 오류를 내면 ROLLBACK(또는 ROLLBACK TO SAVEPOINT)하기 전까지 이후 문장이 모두 "current transaction is aborted"로 거부된다는 점도 알아 둡니다.

### MVCC: 읽기가 쓰기를 막지 않는 이유

PostgreSQL은 행을 제자리에서 고치지 않습니다. UPDATE는 새 행 버전을 만들고 옛 버전에 "이 트랜잭션이 지웠다"는 표시(xmax)를 남깁니다. 각 트랜잭션(또는 문장)은 시작할 때 **스냅샷**으로 "어떤 트랜잭션의 커밋까지 보이는가"를 정하고 그 기준에 맞는 버전을 고릅니다. 그래서 읽는 쪽은 쓰는 쪽을 기다리지 않습니다. 대가는 두 가지입니다. 옛 버전은 어떤 스냅샷도 필요로 하지 않을 때까지 남아 있다가 vacuum이 치우고(레슨 9), 같은 행을 동시에 쓰려는 두 트랜잭션은 여전히 서로 기다립니다.

### 격리 수준 (PostgreSQL)

| 수준 | 스냅샷 시점 | 남아 있는 이상 현상
| Read Committed (기본) | 문장마다 새로 | 같은 트랜잭션에서 두 번 읽으면 값이 달라질 수 있음, 팬텀, 앱이 계산해 덮어쓰는 lost update, write skew
| Repeatable Read | 첫 문장 시점에 한 번 | 팬텀은 PostgreSQL에서 발생하지 않음. 같은 행을 동시에 고치면 40001 오류. write skew는 가능
| Serializable | Repeatable Read + 직렬화 가능성 감시(SSI) | 이상 현상을 막는 대신 충돌한 쪽을 40001로 중단

READ UNCOMMITTED는 요청해도 Read Committed로 동작합니다. **lost update**는 앱이 값을 읽어 계산한 뒤 UPDATE로 덮어쓰는 read-modify-write에서 한쪽 변경이 사라지는 현상입니다. **write skew**는 두 트랜잭션이 서로 다른 행을 고치지만 "상담원 둘 중 최소 한 명은 근무 중" 같은 공통 조건을 각자 읽고 판단해 불변식을 함께 깨는 경우로, Repeatable Read에서도 가능하고 Serializable만 막습니다.

### 재시도는 설계의 일부

Repeatable Read·Serializable에서 나는 직렬화 실패(SQLSTATE ‹40001›)는 버그가 아니라 "다시 하라"는 설계된 신호이며, 공식 문서도 트랜잭션 전체를 처음부터 재시도하라고 안내합니다. 구현 요령은 네 가지입니다. (1) 트랜잭션 전체를 함수로 감싸 최대 3~5회, 지수 백오프와 지터로 재시도합니다. (2) 재시도해도 안전하도록 트랜잭션 안에는 외부 부수효과(메일, API 호출)를 두지 않습니다. (3) 데드락(‹40P01›)도 같은 틀로 처리합니다. (4) 재시도 횟수를 지표로 남겨 충돌 빈도를 봅니다.

### MySQL(InnoDB)과의 차이

InnoDB의 기본은 Repeatable Read이고(MySQL 8.4 문서) 스냅샷은 첫 일반 읽기 시점에 만들어집니다. 잠금 읽기(‹FOR UPDATE›)와 DML은 인덱스 범위에 **gap/next-key 락**을 걸어 그 범위로의 삽입을 막고, 격리를 Read Committed로 낮추면 gap 락이 대부분 꺼져 팬텀이 가능해집니다. 한국 상주 프로젝트의 DB는 Oracle 31.1%·MySQL 28.6%·PostgreSQL 21.6%였습니다(위시켓 2025-01~09 집계). 같은 이름의 격리 수준이라도 DB마다 보장이 다르니 현장 DB의 문서로 확인하고, 이식성이 필요한 코드는 격리 수준에 기대지 말고 제약·원자적 UPDATE·명시적 락으로 불변식을 지킵니다.

### 장기 트랜잭션의 청구서

트랜잭션이 오래 열려 있으면 쥐고 있는 락이 다른 요청과 DDL을 막습니다. 또 스냅샷을 쥔 트랜잭션(Repeatable Read 이상)이나 쓰기로 트랜잭션 ID를 받은 트랜잭션은 그 시점 이후의 옛 행 버전을 vacuum이 치우지 못하게 해 테이블을 부풀게(bloat) 합니다. ‹idle in transaction› 상태의 세션(트랜잭션을 연 채 외부 API나 사용자 입력을 기다리는 코드)이 대표 원인이며, ‹idle_in_transaction_session_timeout›과 ‹statement_timeout›으로 상한을 둡니다.`,
      code: `-- 준비
CREATE TABLE accounts (id int PRIMARY KEY, balance int NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES (1, 100);

-- 실험 1: Repeatable Read 에서의 동시 수정 (psql 창 두 개, [A] [B] 순서대로)
-- [A] BEGIN ISOLATION LEVEL REPEATABLE READ;
-- [A] SELECT balance FROM accounts WHERE id = 1;       -- 100, 여기서 스냅샷이 고정된다
-- [B] UPDATE accounts SET balance = 70 WHERE id = 1;   -- 자동 커밋
-- [A] SELECT balance FROM accounts WHERE id = 1;       -- 여전히 100
-- [A] UPDATE accounts SET balance = balance - 10 WHERE id = 1;
--     ERROR: could not serialize access due to concurrent update   (SQLSTATE 40001)
-- [A] ROLLBACK;   -- 오류 난 트랜잭션은 이어갈 수 없다. 처음부터 다시 시도한다

-- 실험 2: 기본 Read Committed 에서 같은 순서를 반복하면
--     [A]의 UPDATE 는 최신 커밋 값(70)을 다시 읽어 70 - 10 = 60 이 된다.
--     그러나 [A]가 앞서 읽은 100 으로 계산해 balance = 90 을 써 넣었다면
--     [B]의 변경(70)이 조용히 사라진다. 이것이 lost update 다.

-- 실험 3: 재시도 가능한 형태로 트랜잭션을 설계한다 (의사 코드)
--   for attempt in 1..5:
--       BEGIN ISOLATION LEVEL SERIALIZABLE
--       ... 읽기와 쓰기 ...
--       COMMIT  (40001 또는 40P01 이면 ROLLBACK 후 백오프하고 처음부터 반복)`,
      codeLang: `sql`,
      key: [
        `트랜잭션 경계는 업무 불변식 단위로 정한다. 외부 API 호출은 안에 넣지 않는다.`,
        `MVCC에서 UPDATE는 새 행 버전을 만든다. 읽기는 쓰기를 막지 않지만, 옛 버전 청소(vacuum)와 장기 트랜잭션 문제를 대가로 치른다.`,
        `PostgreSQL은 Read Committed(문장 스냅샷)가 기본이고 Repeatable Read(트랜잭션 스냅샷, 팬텀 없음)와 Serializable(SSI)이 있다. 직렬화 실패 40001은 트랜잭션 전체를 재시도한다.`,
        `앱이 읽어 계산해 덮어쓰는 read-modify-write는 lost update를 만들고, write skew는 Repeatable Read에서도 가능하다.`,
        `InnoDB는 기본이 Repeatable Read이고 gap/next-key 락을 쓴다. 같은 이름의 격리 수준도 DB마다 보장이 다르다.`
      ],
      pitfalls: [
        `격리 수준만 올려 놓고 재시도 코드를 만들지 않아 40001이 그대로 사용자 500 오류가 된다.`,
        `트랜잭션을 연 채 외부 API나 사용자 입력을 기다려 idle in transaction 세션이 쌓이고 vacuum과 DDL을 막는다.`,
        `격리 수준 이름이 같다는 이유로 PostgreSQL과 MySQL의 동작이 같다고 가정해 이식 후 데드락이나 중복이 생긴다.`,
        `오류가 난 트랜잭션에서 계속 쿼리를 보내거나, 풀로 돌려보내기 전에 ROLLBACK을 빠뜨린다.`
      ]
    },
    {
      title: `락·데드락·동시성 패턴: 재고 차감, 작업 큐, 멱등성`,
      body: `동시성 버그는 "가끔, 부하가 높을 때, 운영에서만" 나타나므로 코드 리뷰가 아니라 패턴과 테스트로 막아야 합니다. 기본 규칙부터 봅니다. UPDATE·DELETE는 대상 행에 **행 락**을 잡고 커밋이나 롤백까지 유지하며, 같은 행을 건드리는 다른 트랜잭션은 그 뒤에서 기다립니다. 행 락은 행 자체에 기록되어 개수 제한이 없고, 일반 SELECT는 막지 않습니다 (PostgreSQL 문서).

### 재고 차감: 네 가지 구현과 선택 기준

틀린 구현은 ‹SELECT stock› → 앱에서 ‹stock >= qty› 검사 → ‹UPDATE SET stock = :새값›입니다. 요청 두 개가 동시에 재고 5를 읽고 각각 3개를 사면 둘 다 통과합니다(lost update). 앱 프로세스 안의 락(‹threading.Lock›, ‹synchronized›)은 서버가 두 대가 되는 순간 무력합니다. 올바른 선택지는 넷입니다.

1. **원자적 UPDATE**(기본값): ‹UPDATE … SET stock = stock - :q WHERE id = :id AND stock >= :q›. 검사와 차감이 한 문장이고 영향 행 수가 1이면 성공, 0이면 재고 부족입니다. Read Committed에서 두 번째 트랜잭션은 첫 번째가 끝날 때까지 기다린 뒤 갱신된 행에 WHERE를 다시 평가하므로 안전합니다. 락 보유 시간이 가장 짧고, ‹CHECK (stock >= 0)›를 안전망으로 겁니다.
2. **비관적 락**(‹SELECT … FOR UPDATE›): 재고 말고도 쿠폰 한도, 회원 등급 같은 복잡한 검증을 앱 코드에서 거친 뒤 갱신해야 할 때 씁니다. 락을 쥐는 시간이 길어져 처리량이 떨어지고, 여러 행을 잠그면 데드락 위험이 생깁니다.
3. **낙관적 락**(버전 컬럼): ‹UPDATE … SET …, version = version + 1 WHERE id = :id AND version = :읽은_버전›. 0행이면 누군가 먼저 고친 것이므로 재조회하거나 409로 알립니다. 충돌이 드물고 사용자가 오래 편집하는 화면(상품 설명 편집)에 맞습니다.
4. **Serializable + 재시도**: 불변식이 복잡해 위 방식으로 표현하기 어려울 때 씁니다. 구현은 단순하지만 충돌이 잦으면 재시도 비용이 큽니다.

**핫 로우** 문제도 있습니다. 인기 상품 하나에 초당 수천 요청이 몰리면 어떤 방식이든 그 행에서 직렬화됩니다. 한 행이 감당하는 초당 쓰기 수는 환경마다 달라 직접 재야 하며(실습 2), 그 한계를 넘는 이벤트 트래픽은 재고를 여러 슬롯으로 쪼개거나 큐로 순서화하거나 선차감 캐시(be-12 모듈)로 푸는 설계 문제입니다.

### 데드락

트랜잭션 A는 행 1 → 행 2, B는 행 2 → 행 1 순서로 잠그면 서로를 기다립니다. PostgreSQL은 락을 ‹deadlock_timeout›(기본 1초) 기다린 뒤 순환을 검사해 한쪽을 중단시키고 SQLSTATE ‹40P01›(‹deadlock detected›)을 반환합니다. 어느 쪽이 희생될지는 예측할 수 없습니다. 예방은 (1) 여러 행을 잠글 때 항상 같은 순서(예: ‹ORDER BY id›로 정렬해 ‹FOR UPDATE›)로 잠그고, (2) 트랜잭션을 짧게 유지하며, (3) 그래도 나는 데드락은 재시도로 처리하는 것입니다. 계좌 이체 A→B와 B→A가 대표 사례이고 해법은 "두 계좌의 id를 오름차순으로 잠근 뒤 작업"입니다.

### 대기 제어, 큐, 멱등성

- ‹lock_timeout›(락을 기다리는 최대 시간), ‹statement_timeout›, ‹NOWAIT›(기다리지 않고 즉시 오류, SQLSTATE 55P03), ‹SKIP LOCKED›(잠긴 행을 건너뜀)로 무한 대기를 막습니다.
- **작업 큐**는 ‹SELECT … FOR UPDATE SKIP LOCKED LIMIT n›으로 여러 워커가 서로 다른 행을 집어 가게 만듭니다. 처리 중 워커가 죽으면 행이 계속 RUNNING으로 남으므로 시작 시각과 타임아웃으로 되살리는 로직이 필요하고, 전달 보장은 "최소 한 번"이라 작업이 멱등이어야 합니다. 초당 수백 건 이하의 작업은 별도 브로커 없이 이 방식으로 충분한 경우가 많습니다.
- **멱등성**: 결제 웹훅이나 재시도 가능한 API는 ‹UNIQUE (idempotency_key)›와 ‹ON CONFLICT DO NOTHING›으로 "한 번만 처리"를 DB가 보증하게 합니다.
- **advisory lock**: 앱이 정한 정수 키에 거는 락으로, 크론이 두 서버에서 동시에 실행되는 것을 막는 데 씁니다. 트랜잭션 수준(‹pg_advisory_xact_lock›)은 자동 해제되어 안전하고, 세션 수준 락은 PgBouncer 트랜잭션 풀링과 함께 쓸 수 없습니다 (레슨 7·9).

### 테스트로 증명하기

동시성은 눈으로 확신할 수 없습니다. 워커 50~100개로 요청 1,000건을 동시에 보내고 불변식(성공 건수 = 초기 재고 − 최종 재고, 최종 재고 ≥ 0)을 단언하는 테스트를 CI에 둡니다.`,
      code: `-- A) 원자적 UPDATE (권장 기본값): 검사와 차감이 한 문장
UPDATE products
SET stock = stock - 3
WHERE id = 7 AND stock >= 3;
-- 영향 행 수 1 = 성공, 0 = 재고 부족. 앱은 이 숫자로 판단한다.

-- B) 비관적 락: 차감 외에 복잡한 검증이 끼는 경우
BEGIN;
SELECT stock FROM products WHERE id = 7 FOR UPDATE;   -- 다른 트랜잭션은 여기서 대기
-- ... 앱에서 쿠폰·한도 검증 ...
UPDATE products SET stock = stock - 3 WHERE id = 7;
COMMIT;

-- C) 낙관적 락: 충돌이 드물고 편집 시간이 긴 경우 (products.version 컬럼을 가정)
UPDATE products
SET name = '새 이름', version = version + 1
WHERE id = 7 AND version = 12;
-- 0 행이면 누군가 먼저 고쳤다 -> 409 Conflict 또는 재조회 후 재시도

-- D) 작업 큐 (jobs 테이블을 가정): 여러 워커가 서로 다른 행을 집어 간다
WITH next_jobs AS (
  SELECT id FROM jobs
  WHERE status = 'READY'
  ORDER BY id
  LIMIT 10
  FOR UPDATE SKIP LOCKED
)
UPDATE jobs j
SET status = 'RUNNING', started_at = now()
FROM next_jobs n
WHERE j.id = n.id
RETURNING j.id;

-- E) 멱등 처리: 같은 키로 두 번 와도 한 번만 반영
INSERT INTO payment_events (idempotency_key, order_id, amount_krw)
VALUES ('evt_20261110_001', 42, 15000)
ON CONFLICT (idempotency_key) DO NOTHING;
-- 영향 행 수 0 이면 이미 처리된 이벤트다 (payment_events 에 UNIQUE(idempotency_key) 가정)`,
      codeLang: `sql`,
      key: [
        `같은 행에 대한 쓰기는 행 락으로 직렬화되고 일반 읽기는 막히지 않는다. 락은 커밋이나 롤백까지 유지된다.`,
        `재고 같은 카운터는 검사와 변경을 한 문장으로 합친 원자적 UPDATE가 기본이다. 복잡한 검증은 FOR UPDATE, 충돌이 드문 긴 편집은 version 컬럼을 쓴다.`,
        `데드락은 일관된 락 순서와 짧은 트랜잭션으로 예방하고, 남는 40P01은 재시도한다.`,
        `SKIP LOCKED 큐는 최소 한 번 전달이라 작업이 멱등이어야 한다. 멱등성의 최종 판정자는 UNIQUE 제약이다.`,
        `동시성은 동시 요청 테스트로 불변식을 단언해 증명한다. 앱 내부 락은 분산 환경에서 보증이 아니다.`
      ],
      pitfalls: [
        `앱 프로세스 락(threading.Lock, synchronized)으로 경합을 막았다고 믿고 서버 두 대 이상에서 오버셀을 만든다.`,
        `모든 요청을 SELECT FOR UPDATE로 직렬화해 인기 상품 하나(핫 로우)에서 처리량이 무너진다.`,
        `여러 행을 잠그면서 락 순서를 정하지 않아(예: id 정렬 없음) 이체나 일괄 갱신에서 데드락이 반복된다.`,
        `lock_timeout 없이 운영해 요청 하나가 멈추면 같은 행을 기다리는 요청이 연쇄적으로 쌓인다.`
      ]
    },
    {
      title: `ORM과 애플리케이션 계층: SQLAlchemy 2.x Session, N+1, 커넥션 풀`,
      body: `ORM은 객체와 행을 매핑하고 변경 추적(Unit of Work)을 제공하는 도구이지, SQL을 몰라도 되게 해 주는 도구가 아닙니다. 이 레슨은 SQLAlchemy 2.x로 설명합니다(2026-11 기준 현행 2.1.8, Python 3.11 이상 필요. 마이그레이션 도구 Alembic 1.20은 SQLAlchemy 2.0 이상만 지원). 개념은 JPA/Hibernate와 거의 일대일로 대응합니다.

### 선택 기준: ORM, Core, MyBatis

- 단순 CRUD와 도메인 객체 중심 코드에는 ORM이 생산적입니다.
- 복잡한 리포트, 대량 처리, 윈도 함수, DB 전용 기능에는 SQL을 직접 통제하는 ‹select()›(Core 스타일)나 원시 SQL이 낫습니다.
- 공공·SI 쪽에서는 SQL을 직접 관리하는 MyBatis가 흔하고, JPA 쪽은 QueryDSL로 타입 안전한 동적 쿼리를 보완합니다. 사람인 키워드 검색(2026-11-09)에서 JPA 168건, MyBatis 137건이었습니다. 도구보다 중요한 기준은 "나가는 SQL을 내가 볼 수 있고 통제하는가"입니다. 개발·스테이징에서는 ORM의 SQL 로그를 항상 켜 둡니다.

### Session = Unit of Work + 정체성 맵

‹Session›은 읽어 온 객체를 정체성 맵(같은 PK는 같은 객체)에 담고 속성 변경을 추적하다가 ‹flush›(변경을 INSERT·UPDATE·DELETE로 내보냄) 때 SQL을 만듭니다. ‹commit›은 flush와 COMMIT이며, 기본값에서는 커밋 뒤 모든 객체가 만료되어 다음 접근 때 다시 읽습니다(‹expire_on_commit›). flush가 실패하면 ‹rollback›을 호출해야 세션을 다시 쓸 수 있습니다. 공식 문서의 핵심 규칙은 Session을 스레드나 asyncio 작업 사이에 공유하지 말라는 것입니다. 웹에서는 **요청당 하나**를 만들고 서비스 계층에서 ‹with session.begin():›으로 트랜잭션 경계를 명시합니다. JPA의 영속성 컨텍스트가 Session에, 더티 체킹이 flush에 대응합니다.

### N+1과 로딩 전략

주문 100건을 읽고 각 주문의 항목에 접근하면 쿼리가 1 + 100번(N+1) 나갑니다. DB 왕복이 5ms면 0.5초가 사라지는데, 왕복 0.2ms인 개발 DB에서는 안 보여 운영에서 터집니다.

| 전략 | 동작 | 용도
| lazy="select"(기본) | 접근하는 순간 쿼리 | N+1의 원인
| selectinload | 부모 PK들을 IN으로 묶은 두 번째 쿼리(한 번에 최대 500개씩) | 컬렉션(1:N, N:M)에 권장
| joinedload | LEFT OUTER JOIN으로 한 번에 | 다대일·일대일. 컬렉션은 행이 불어나 unique() 필요
| raiseload | 암묵적 지연 로딩을 예외로 바꿈 | 의도치 않은 로딩을 개발 중에 발견

비동기(AsyncSession)에서는 암묵적 지연 로딩이 아예 실행되지 못해 MissingGreenlet 오류가 나므로 처음부터 로딩 전략을 명시합니다. JPA에서는 fetch join, EntityGraph, 배치 사이즈 설정이 같은 역할을 합니다. **쿼리 수 테스트**로 회귀를 막습니다. 엔진의 ‹before_cursor_execute› 이벤트로 문장 수를 세고 "주문 목록 API는 쿼리 3개 이하" 같은 단언을 테스트에 둡니다 (아래 코드).

### 커넥션 풀과 PgBouncer

PostgreSQL은 연결당 프로세스라 연결을 무한정 늘릴 수 없습니다(기본 max_connections는 100). 앱 인스턴스 수 × (pool_size + max_overflow)가 DB 한도를 넘으면 ‹sorry, too many clients already›가 납니다. SQLAlchemy QueuePool의 기본값은 pool_size 5, max_overflow 10이라 인스턴스가 8개면 최대 120연결입니다. 풀을 키운다고 빨라지지 않습니다. 동시에 실행되는 쿼리 수가 DB 코어 수를 크게 넘으면 대기만 늘어납니다. 풀은 작게 두고 인스턴스 수를 곱해 총량이 DB 한도 아래가 되게 계산하며, 트랜잭션 안에서 외부 HTTP를 호출해 연결을 오래 점유하지 않습니다. 인스턴스가 많거나 서버리스 환경이면 PgBouncer를 둡니다(현행 1.26.1, 2026-10-14 기준). 트랜잭션 풀링 모드는 연결을 트랜잭션 단위로만 빌려 주므로 세션 상태(SET, LISTEN), SQL 수준 PREPARE, 세션 advisory lock이 깨지고, 프로토콜 수준 prepared statement는 ‹max_prepared_statements›를 0이 아닌 값으로 설정해야 합니다 (PgBouncer 문서).

### 테스트 DB

SQLite로 테스트하고 PostgreSQL로 배포하면 jsonb, 부분 인덱스, ON CONFLICT 세부 동작, 격리·락 동작이 달라 CI는 통과하고 운영은 실패합니다. Testcontainers로 실제 PostgreSQL 컨테이너를 띄워 테스트하는 편이 안전합니다 (아래 데모는 설치 없이 돌려 보도록 SQLite 인메모리를 씁니다).`,
      code: `from sqlalchemy import ForeignKey, create_engine, event, select
from sqlalchemy.orm import (DeclarativeBase, Mapped, Session, mapped_column,
                            relationship, selectinload)

class Base(DeclarativeBase):
    pass

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    qty: Mapped[int]
    order: Mapped[Order] = relationship(back_populates="items")

engine = create_engine("sqlite:///:memory:")   # 데모용. 실무 테스트는 실제 PostgreSQL 컨테이너
Base.metadata.create_all(engine)

counter = {"n": 0}

@event.listens_for(engine, "before_cursor_execute")
def count_statements(conn, cursor, statement, parameters, context, executemany):
    counter["n"] += 1

with Session(engine) as s, s.begin():          # 주문 50건, 각 2개 항목
    s.add_all([Order(items=[OrderItem(qty=1), OrderItem(qty=2)]) for _ in range(50)])

def total_qty(session: Session, eager: bool) -> int:
    stmt = select(Order)
    if eager:
        stmt = stmt.options(selectinload(Order.items))   # 컬렉션은 selectinload
    return sum(i.qty for o in session.scalars(stmt) for i in o.items)

for eager in (False, True):
    counter["n"] = 0
    with Session(engine) as s:
        total_qty(s, eager)
    print("eager" if eager else "lazy", "queries:", counter["n"])
# 출력: lazy queries: 51 / eager queries: 2  -> 테스트에서 assert counter["n"] <= 2`,
      codeLang: `python`,
      key: [
        `ORM은 SQL을 대체하지 않는다. 나가는 SQL을 로그로 보고, 복잡한 리포트와 대량 처리는 Core 스타일이나 원시 SQL로 쓴다.`,
        `Session은 Unit of Work와 정체성 맵이다. 요청당 하나만 만들고 스레드·async 작업 사이에 공유하지 않으며, flush 실패 뒤에는 rollback한다.`,
        `N+1은 컬렉션에 selectinload, 다대일에 joinedload로 풀고 raiseload로 감시하며 쿼리 수 테스트로 회귀를 막는다.`,
        `연결 총량은 인스턴스 수 × (pool_size + max_overflow)이며 max_connections보다 작아야 한다. 트랜잭션 안에서 외부 호출을 하지 않는다.`,
        `PgBouncer 트랜잭션 모드에서는 세션 상태, SQL PREPARE, 세션 advisory lock을 쓸 수 없다.`
      ],
      pitfalls: [
        `개발 DB의 짧은 왕복 지연 때문에 N+1이 안 보이다가 운영에서 목록 API가 수 초 걸린다.`,
        `Session 하나를 전역 변수에 두고 여러 스레드나 비동기 작업이 함께 써서 상태가 섞인다.`,
        `연결 부족을 max_connections만 올려 해결하려 해 프로세스당 메모리 사용이 늘고, 풀을 키워 대기만 늘린다.`,
        `SQLite로만 테스트해 jsonb, 부분 인덱스, 락·격리 동작의 차이를 놓친다.`
      ]
    },
    {
      title: `스키마 마이그레이션과 무중단 변경: Alembic, 락 대기열, expand/contract`,
      body: `스키마 변경은 외주 장애의 단골 원인입니다. 이유는 셋입니다. 많은 DDL이 테이블 전체를 잠그고, 롤링 배포 중에는 **옛 버전 앱과 새 버전 앱이 같은 DB를 동시에 쓰며**, 데이터를 건드린 변경은 되돌리기 어렵습니다. 그래서 마이그레이션은 (1) 코드로 버전 관리하고 (2) 이미 적용된 스크립트를 수정하지 않으며 (3) 운영 규모 데이터에서 락 시간을 측정한 뒤 (4) 앱 변경과 DB 변경을 **서로 호환되는 작은 단계**로 나눕니다. 도구는 Alembic, Flyway, Liquibase가 대표적이고 개념은 같습니다.

### Alembic autogenerate는 초안일 뿐

‹alembic revision --autogenerate›는 모델과 DB를 비교해 스크립트를 만들지만 공식 문서가 밝히듯 완벽하지 않습니다. 기본 감지 대상은 테이블·컬럼 추가·삭제, nullable·타입 변경, 인덱스·이름 있는 제약·FK의 기본적인 변화입니다. 감지하지 못하거나 기본으로 꺼져 있는 것은 컬럼·테이블 **이름 변경**(삭제와 추가로 보여 데이터가 사라질 수 있음), 이름 없는 제약, ‹server_default› 변화, 기본키와 시퀀스 변화입니다. 그래서 (1) 생성물을 항상 읽고 고치며, (2) 모든 제약에 이름이 붙도록 MetaData에 ‹naming_convention›을 설정하고, (3) env.py의 ‹compare_type›(1.12부터 기본 True)과 ‹compare_server_default›를 의도적으로 정하고, (4) CI에서 ‹alembic check›로 "모델은 바뀌었는데 마이그레이션이 없는" 상태를 실패시키고, (5) 데이터를 옮기는 로직은 직접 씁니다.

### 락의 현실: 대기열이 서비스를 멈춘다

PostgreSQL에서 많은 ‹ALTER TABLE›은 ‹ACCESS EXCLUSIVE› 락을 요구하고, 이 락은 일반 SELECT까지 막습니다. 문제는 ALTER가 락을 얻기 **전에 기다리는 동안**입니다. 5분짜리 리포트 트랜잭션이 테이블을 읽고 있으면 ALTER는 그 뒤에서 대기하고, 락 대기열 규칙상 그 뒤에 도착한 평범한 SELECT·UPDATE도 ALTER 뒤에 줄을 섭니다. DDL은 수 밀리초짜리인데 서비스가 5분 멈추는 사고입니다. 방어선은 ‹SET lock_timeout = '3s'›(빨리 포기하고 재시도), ‹statement_timeout›, 배포 직전 ‹pg_stat_activity›로 장기 트랜잭션 점검, 그리고 리포트 쿼리를 타임아웃을 건 읽기 전용 복제본으로 옮기는 것입니다.

### 연산별 안전한 방식

| 변경 | 위험 | 안전한 방식
| 컬럼 추가(NULL 허용) | 낮음. 메타데이터 변경 | 그대로 하되 lock_timeout 필수
| 컬럼 추가 + 상수 DEFAULT | PostgreSQL 11 이상은 테이블 재작성 없음 | volatile 함수 기본값은 재작성하므로 분리
| NOT NULL 추가 | 전체를 스캔하는 동안 ACCESS EXCLUSIVE 유지 | CHECK (c IS NOT NULL) NOT VALID, VALIDATE CONSTRAINT, SET NOT NULL 순서(12 이상은 스캔 생략)
| FK·CHECK 추가 | 전체 검증 동안 락 | NOT VALID로 추가한 뒤 VALIDATE CONSTRAINT
| 인덱스 생성 | 쓰기 차단 | CREATE INDEX CONCURRENTLY
| 컬럼 타입 변경(int → bigint) | 테이블 재작성과 긴 락 | 새 컬럼 + 동기화 + 전환(expand/contract)
| 컬럼·테이블 이름 변경 | 락은 짧지만 옛 앱이 즉시 깨짐 | expand/contract
| 컬럼 삭제 | 옛 앱이 참조하면 깨짐 | 앱에서 참조를 먼저 제거한 뒤 다음 릴리스에서 삭제

### expand / contract: 이름 바꾸기를 여러 배포로 나누기

컬럼 ‹phone›을 ‹phone_e164›로 바꾼다고 합시다. (1) **expand**: 새 컬럼을 NULL 허용으로 추가합니다. (2) **앱 v2 배포**: 새 컬럼에도 쓰고(이중 쓰기 또는 트리거), 읽기는 아직 옛 컬럼에서 합니다. (3) **백필**: 기존 행을 PK 범위 1만 행 정도의 배치로 채우고 배치마다 커밋하며 잠깐 쉽니다. 한 문장으로 1천만 행을 UPDATE하면 장기 트랜잭션, 락, WAL 폭증, 죽은 행 폭증, 복제 지연이 한꺼번에 옵니다. 중단 후 재시작할 수 있게 마지막 처리 PK를 기록하고, 어긋나는 행이 0건인지 검증 쿼리로 확인합니다. (4) **읽기 전환 배포** 뒤 옛 컬럼을 쓰는 앱이 없음을 확인하고 (5) **contract**로 옛 컬럼을 별도 릴리스에서 삭제합니다. 각 단계가 독립적으로 배포·롤백될 수 있어야 합니다.

### 롤백과 테스트

downgrade 스크립트는 데이터가 이미 바뀐 뒤에는 원상복구를 보장하지 못합니다. 실무 정책은 "앞으로 고치기(roll forward) + 직전 백업 + 단계 분리로 위험 축소"이고, 파괴적 변경(DROP)은 별도 릴리스로 미룹니다. 빈 DB의 ‹upgrade head›, 운영 규모 데이터의 락 시간, 마이그레이션 중 부하 스크립트의 오류 유무를 실제 PostgreSQL 컨테이너에서 확인합니다 (실습 3).`,
      code: `"""expand: customers.phone_e164 추가 (구 컬럼 phone 은 아직 유지한다)"""
from alembic import op

revision = "20261110_01"
down_revision = "20261020_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 락을 오래 기다리느니 빨리 실패하고 배포 스크립트가 재시도하게 한다
    op.execute("SET LOCAL lock_timeout = '3s'")
    # autocommit_block 은 그 앞의 변경을 먼저 커밋한다. 인덱스 단계가 실패해 재실행돼도
    # 오류가 나지 않도록 IF NOT EXISTS 로 멱등하게 쓴다 (리비전을 둘로 나눠도 된다)
    op.execute("ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_e164 text")

    # CREATE INDEX CONCURRENTLY 는 트랜잭션 밖에서만 실행된다
    with op.get_context().autocommit_block():
        op.create_index(
            "ix_customers_phone_e164",
            "customers",
            ["phone_e164"],
            postgresql_concurrently=True,
            if_not_exists=True,
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.drop_index(
            "ix_customers_phone_e164",
            table_name="customers",
            postgresql_concurrently=True,
            if_exists=True,
        )
    op.drop_column("customers", "phone_e164")

# 백필(tools/backfill.py)과 contract 마이그레이션(옛 phone 삭제)은 별도 배포 단계로 분리한다.`,
      codeLang: `python`,
      key: [
        `롤링 배포 동안 옛 앱과 새 앱이 공존한다. 변경은 서로 호환되는 작은 단계(expand, 이중 쓰기, 백필, 전환, contract)로 나눈다.`,
        `autogenerate는 초안이다. 이름 변경은 삭제와 추가로 보이고 이름 없는 제약·server_default·PK 변경에 한계가 있으니 naming_convention, 리뷰, alembic check를 쓴다.`,
        `ACCESS EXCLUSIVE 락의 대기열이 서비스를 멈춘다. lock_timeout과 재시도를 쓰고 배포 전에 장기 트랜잭션을 점검한다.`,
        `안전한 방식은 NOT VALID 후 VALIDATE, CREATE INDEX CONCURRENTLY, 새 컬럼 + 백필이다.`,
        `백필은 작은 배치, 배치별 커밋, 재시작 가능, 검증 쿼리를 갖춘다. 롤백보다 roll forward가 현실적이다.`
      ],
      pitfalls: [
        `autogenerate 결과를 읽지 않고 적용해 컬럼 이름 변경이 DROP과 ADD로 실행되어 데이터가 사라진다.`,
        `빈 개발 DB에서만 테스트해 운영 규모에서 락 시간과 백필 시간이 얼마나 걸리는지 모른 채 배포한다.`,
        `1천만 행 백필을 UPDATE 한 문장으로 실행해 장기 트랜잭션, WAL 폭증, 복제 지연을 동시에 만든다.`,
        `컬럼 삭제와 앱 변경을 같은 릴리스에 묶어 문제가 생겨도 앱만 롤백할 수 없게 만든다.`
      ]
    },
    {
      title: `운영 안전망: vacuum·bloat, 백업과 PITR, 복제, 파티셔닝, 버전 지원 종료`,
      body: `외주 의뢰의 상당수는 "어느 날 느려졌다", "디스크가 찼다", "데이터를 잘못 지웠다"로 시작하므로 DB를 살려 두는 아래 항목을 점검하고 설명할 수 있어야 합니다.

### vacuum과 bloat

MVCC 때문에 UPDATE·DELETE는 죽은 행 버전(dead tuple)을 남기고, VACUUM이 이를 재사용 가능한 공간으로 돌려놓습니다. 자동 청소(autovacuum)는 죽은 행이 ‹threshold + scale_factor × 행 수›를 넘으면 시작합니다(기본값은 각각 50과 0.2이고, 18부터 ‹autovacuum_vacuum_max_threshold›가 기본 1억 개로 상한을 둡니다). 행이 1억 개인 테이블에서는 2천만 개가 쌓여야 시작한다는 뜻이므로, 큰 테이블은 테이블 단위로 scale factor를 낮춥니다. VACUUM은 가시성 맵을 갱신해 Index Only Scan을 가능하게 하고, 통계는 autovacuum의 analyze 작업이 따로 갱신합니다. 일반 VACUUM은 공간을 OS에 돌려주지 않고 테이블 안에서 재사용하게 할 뿐이고, ‹VACUUM FULL›은 테이블을 새로 써서 공간을 돌려주지만 ACCESS EXCLUSIVE 락을 잡아 서비스 중에는 쓸 수 없습니다. 부푼 인덱스는 ‹REINDEX CONCURRENTLY›를 검토합니다.

청소를 막는 대표 원인은 오래 열린 트랜잭션, 방치된 복제 슬롯, 남은 prepared transaction입니다(공식 문서의 wraparound 복구 점검 항목). 또 트랜잭션 ID는 32비트라서 freeze 청소가 제때 이뤄지지 않으면 약 20억 건 뒤에 과거 행이 미래의 행처럼 보이게 됩니다. ‹autovacuum_freeze_max_age›(기본 2억)에서 강제 청소가 시작되고, 한계가 가까워지면 경고를 내다가 새 트랜잭션 ID 발급을 거부해 읽기 전용만 가능해집니다. ‹age(datfrozenxid)›를 모니터링하세요.

### 백업과 PITR

- ‹pg_dump›는 논리 백업(한 DB의 한 시점 스냅샷)입니다. 이식성이 좋고 작은 DB에 알맞지만 **시점 복구(PITR)에는 쓸 수 없고** 큰 DB는 복원이 오래 걸립니다.
- **기반 백업 + WAL 아카이빙**: ‹pg_basebackup›으로 기반 백업을 뜨고 ‹archive_mode›·‹archive_command›로 WAL을 계속 보관하면 ‹recovery_target_time›으로 "어제 14:19" 같은 시점까지 복구할 수 있습니다. 아카이빙이 실패하면 ‹pg_wal›이 쌓여 디스크가 차서 서버가 멈출 수 있으므로 아카이브 실패 경보가 필수입니다.
- **복구 훈련 없는 백업은 백업이 아닙니다.** 분기마다 별도 서버에서 복원해 걸린 시간(RTO, 복구까지 허용되는 시간)과 잃는 데이터 구간(RPO)을 재고 기록합니다. 관리형 DB도 자동 백업·PITR의 보존 기간과 복구 절차를 확인하고 한 번은 실제로 복원해 봅니다.

### 복제, 읽기 분리, 샤딩

스트리밍 복제로 읽기 전용 복제본을 두면 리포트·조회 부하를 옮길 수 있지만, 비동기 복제는 **지연**이 있어 "쓰기 직후 복제본에서 읽기"가 옛 값을 줍니다. 주문 직후 화면처럼 자기 쓰기를 바로 읽어야 하는 경로는 primary에서 읽는 규칙이 필요합니다. **샤딩**은 마지막 수단입니다. 인덱스·쿼리 개선, 수직 확장, 읽기 복제, 파티셔닝으로 대부분 해결되고, 샤딩은 조인·트랜잭션·운영 복잡도를 크게 올립니다.

### 파티셔닝

선언적 파티셔닝(예: 월별 범위)의 가장 큰 가치는 오래된 데이터를 파티션 단위로 DETACH·DROP해 대량 DELETE와 vacuum 부담을 없애는 것이고, 쿼리 조건에 파티션 키가 있으면 불필요한 파티션을 건너뜁니다(pruning). 제약도 있습니다. 기본키·UNIQUE에 파티션 키가 포함돼야 하고, 파티션이 너무 많으면 계획 시간이 늘며, ‹CREATE INDEX CONCURRENTLY›는 파티션된 부모 테이블에 직접 못 쓰므로 파티션별로 만든 뒤 붙입니다. 1천만 행 수준이면 인덱스 설계가 먼저입니다.

### 버전과 지원 종료, 보안 기본

PostgreSQL 메이저 버전은 출시 후 5년간 지원되고 마이너 릴리스는 최소 3개월마다 나오므로 현행 마이너를 쓰도록 권장됩니다. 공식 정책 페이지 기준(2026-11-10 확인) 지원 종료일은 14가 2026-11-12, 15가 2027-11-11, 16이 2028-11-09, 17이 2029-11-08, 18이 2030-11-14입니다. 19는 RC 1(2026-10-15)까지 나왔고 GA 공지는 확인하지 못했습니다. RC 문서의 ‹REPACK (CONCURRENTLY)›(VACUUM FULL 대체)도 GA 전이라 계획에 넣지 않습니다. 메이저 업그레이드는 덤프/복원이나 ‹pg_upgrade›로 하며, 18부터 pg_upgrade가 옵티마이저 통계를 보존합니다(확장 통계는 제외). 고객이 14를 쓴다면 업그레이드 일정과 관리형 서비스의 연장 지원 정책을 별도 견적으로 제안합니다. 보안의 기본은 앱 계정에 DML 권한만 주고 DDL은 마이그레이션 전용 계정으로 나누며, 앱을 superuser로 접속시키지 않고, 값은 항상 바인딩 파라미터로 전달해 SQL 인젝션을 막는 것입니다.`,
      code: `-- 1) 청소가 밀린 테이블
SELECT relname, n_live_tup, n_dead_tup,
       round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
       last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;

-- 2) 청소를 막는 장기 트랜잭션 (5분 이상)
SELECT pid, usename, state, now() - xact_start AS xact_age, left(query, 60) AS query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL AND now() - xact_start > interval '5 minutes'
ORDER BY xact_start;

-- 3) 방치된 복제 슬롯과 prepared transaction
SELECT slot_name, active, age(xmin) AS xmin_age, age(catalog_xmin) AS catalog_xmin_age
FROM pg_replication_slots;
SELECT gid, prepared, age(transaction) AS xid_age FROM pg_prepared_xacts;

-- 4) XID wraparound 여유: 20억에 가까울수록 위험, autovacuum_freeze_max_age 기본값은 2억
SELECT datname, age(datfrozenxid) AS xid_age
FROM pg_database
ORDER BY xid_age DESC;

-- 5) 큰 테이블만 더 자주 청소하도록 (테이블 단위 설정)
ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.02,
                        autovacuum_vacuum_threshold = 1000);

-- 6) 오래 열린 채 놀고 있는 트랜잭션에 상한을 둔다 (역할 단위 예시)
ALTER ROLE app_user SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE app_user SET statement_timeout = '30s';`,
      codeLang: `sql`,
      key: [
        `죽은 행은 vacuum이 치운다. 큰 테이블은 테이블 단위로 autovacuum을 조정하고, 청소를 막는 오래 열린 트랜잭션·복제 슬롯·prepared transaction을 점검한다.`,
        `트랜잭션 ID wraparound는 20억 건 한계에서 발생한다. age(datfrozenxid)를 모니터링하고 freeze 청소가 돌게 한다.`,
        `pg_dump는 시점 복구가 불가능하다. 기반 백업과 WAL 아카이빙에 정기 복구 훈련으로 RTO·RPO를 재고 기록한다.`,
        `비동기 복제는 지연이 있다. 자기 쓰기를 바로 읽어야 하는 경로는 primary에서 읽는다.`,
        `메이저 버전은 5년 지원이다. 2026-11-12에 14가 종료되므로 고객 버전을 확인하고 업그레이드를 별도 견적으로 제안한다.`
      ],
      pitfalls: [
        `디스크가 부풀 때 운영 시간에 VACUUM FULL을 실행해 ACCESS EXCLUSIVE 락으로 서비스를 멈춘다.`,
        `백업 스크립트만 있고 복원 훈련이 없으며, WAL 아카이브 실패를 감시하지 않아 pg_wal이 디스크를 채운다.`,
        `읽기 복제본의 지연을 무시하고 주문 직후 조회까지 복제본으로 보내 "방금 주문이 안 보여요" 문의가 쏟아진다.`,
        `파티셔닝을 만능 성능책으로 도입해 파티션 키와 쿼리 조건이 맞지 않거나 파티션이 수천 개로 늘어 계획 시간이 길어진다.`
      ]
    },
    {
      title: `통합 사례: 느리고, 가끔 틀리고, 배포하면 멈추는 쇼핑몰 DB 진단`,
      body: `의뢰 상황(수치는 설명용 가상 값): 중소 쇼핑몰이 FastAPI + SQLAlchemy 서비스를 관리형 PostgreSQL 14(vCPU 4, RAM 16GB, 디스크 200GB)에서 운영합니다. 주문은 약 1,200만 건이고 하루 약 3만 건이 늘어납니다. 증상은 다섯 가지입니다. (1) 주문 목록 API의 p95가 2.8초, (2) 재고가 가끔 음수가 되는 오버셀이 주 1~2건, (3) 지난주 컬럼 추가 배포 때 API가 40초간 타임아웃, (4) 세일 때 ‹too many clients›, (5) 디스크 사용량이 월 8GB씩 늘고 데이터를 지워도 줄지 않음. 고객의 요청은 "인스턴스 사양을 올려 달라"입니다.

### 1단계: 범위·접근·기준선

읽기 전용 계정(가능하면 스냅샷에서 복원한 분석용 인스턴스)과 작업 가능 시간을 서면으로 정합니다. 운영 DB에서 쓰기 작업이나 DML에 대한 EXPLAIN ANALYZE는 하지 않습니다. 버전, 설정, 확장(‹pg_stat_statements›), 백업 현황, 마이그레이션 이력, ORM 설정을 받고, 증상이 있었던 시각 3건과 현재 p95·오류율 같은 기준선을 저장합니다. 개인정보가 든 데이터는 마스킹본을 요청합니다.

### 2단계: 증거 수집과 가설

아래 코드의 쿼리 묶음으로 첫 30분에 증거를 모읍니다.

- **느림**: pg_stat_statements 상위 3개 쿼리가 총 실행 시간의 약 70%입니다. 주문 목록 쿼리의 계획은 ‹Seq Scan on orders›, ‹Rows Removed by Filter›가 1,100만 대, ‹Sort Method: external merge Disk›이고 인덱스는 PK뿐입니다. 필요한 것은 ‹(customer_id, created_at DESC)› 인덱스입니다. 앱은 OFFSET으로 페이지를 넘기고 주문 항목을 지연 로딩해 20건 목록에 쿼리 21개가 나갑니다 → 키셋과 selectinload.
- **틀림**: 코드가 상품을 읽고 ‹product.stock -= qty›를 ORM 변경 추적으로 flush합니다. Read Committed에서 lost update이고 CHECK 제약이 없어 음수가 그대로 저장됩니다.
- **멈춤**: 컬럼 추가 ALTER가 5분짜리 관리자 리포트 트랜잭션 뒤에서 락을 기다리는 동안 뒤의 모든 쿼리가 줄을 섰습니다. lock_timeout이 없었습니다.
- **연결**: 인스턴스 8개 × (pool_size 5 + max_overflow 10) = 최대 120연결이 max_connections 100을 넘습니다.
- **디스크**: orders의 상태 UPDATE가 많은데 기본 임계(1,200만 × 0.2 = 약 240만 개)까지 청소가 늦고, 배치 서버의 세션 하나가 ‹idle in transaction›으로 며칠 열려 있어 청소가 막혀 있습니다.
- **별도 안건**: 14는 2026-11-12에 지원이 종료되므로 업그레이드를 별도 제안합니다.

### 3단계: 작은 변경을 순서대로

1. 인덱스(CONCURRENTLY) + 키셋 + selectinload + 쿼리 수 테스트. 전후 p95, 계획, 인덱스 크기, INSERT 비용을 잰다.
2. 재고를 원자적 UPDATE와 ‹CHECK (stock >= 0)›로 바꾸고 동시 1,000건 테스트를 추가한다. 이미 음수인 과거 데이터의 정정은 고객 확인 뒤 별도 작업으로 한다.
3. 마이그레이션 정책: lock_timeout과 재시도, 배포 전 장기 트랜잭션 점검 스크립트, 리포트는 statement_timeout을 건 복제본에서, CI의 alembic check.
4. 연결: 풀 크기를 다시 계산해 총량을 80 미만으로 맞추고, 필요하면 PgBouncer(세션 advisory lock 사용 여부로 트랜잭션 모드 호환성을 점검).
5. vacuum: orders 테이블 설정, idle_in_transaction_session_timeout, dead tuple 비율 경보. 이미 부푼 공간의 회수는 락과 여유 디스크가 필요하므로 점검 시간에 별도 작업으로 합의한다.
6. 백업: PITR 설정을 확인하고 복구 훈련으로 RTO를 잰다.

각 단계를 하나씩 적용하고 기준선과 비교합니다. 한꺼번에 바꾸면 무엇이 효과였고 무엇이 부작용이었는지 알 수 없습니다.

### 4단계: 인수 기준과 인계

"사양 증설" 대신 숫자로 닫습니다. 주문 목록 p95 300ms 이하(같은 트래픽), 동시 1,000건 재고 테스트에서 오버셀 0, 배포 중 DDL 락 대기 3초 이하와 5xx 0, 7일간 ‹too many clients› 0, orders의 dead tuple 비율 10% 미만과 월 증가량이 합의치 이하, PITR 복구 시간(RTO) 기록. 인계물은 튜닝 보고서(전후 EXPLAIN 원문), 마이그레이션 가이드와 CI 설정, 런북("느릴 때", "락 대기", "디스크 증가"), 모니터링 쿼리와 알림 규칙, 남은 위험(14 업그레이드, 단일 장애점, 과거 음수 재고 정정)입니다. 사양 증설은 위 변경 뒤에도 CPU나 I/O 포화가 데이터로 확인될 때만 제안합니다.`,
      code: `-- [1] 환경: 버전과 핵심 설정
SELECT version();
SHOW max_connections;
SHOW shared_buffers;
SHOW work_mem;

-- [2] 연결: 누가 얼마나, 어떤 상태로 잡고 있나
SELECT usename, application_name, state, count(*) AS conns,
       max(now() - xact_start) AS oldest_xact
FROM pg_stat_activity
WHERE backend_type = 'client backend'
GROUP BY 1, 2, 3
ORDER BY conns DESC;

-- [3] 총 실행 시간 상위 (pg_stat_statements 필요)
SELECT queryid, calls, round(total_exec_time::numeric) AS total_ms,
       round(mean_exec_time::numeric, 1) AS mean_ms, left(query, 70) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- [4] 순차 스캔으로 많이 읽는 테이블 (인덱스 부재 후보)
SELECT relname, seq_scan, seq_tup_read, idx_scan
FROM pg_stat_user_tables
ORDER BY seq_tup_read DESC
LIMIT 10;

-- [5] 크기와 죽은 행: 디스크가 어디서 늘고 있나
SELECT relname,
       pg_size_pretty(pg_table_size(relid))   AS table_size,
       pg_size_pretty(pg_indexes_size(relid)) AS index_size,
       n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;`,
      codeLang: `sql`,
      key: [
        `진단 순서는 범위·접근·기준선 합의, 증거 수집(pg_stat_statements, 계획, 연결, 락, vacuum), 가설, 작은 변경을 하나씩, 숫자 인수 기준, 인계다.`,
        `증상 하나에 원인 하나가 아니다. 느림은 인덱스·N+1·OFFSET, 틀림은 read-modify-write, 정지는 락 대기열, 연결 고갈은 풀 총량, 디스크 증가는 vacuum 방해에서 온다.`,
        `사양 증설은 마지막 선택지다. 변경은 한 번에 하나씩, 전후 수치와 함께 적용한다.`,
        `인계물은 보고서, 런북, 알림 규칙, 남은 위험까지 포함한다. 지원 종료 같은 별도 안건은 견적을 분리한다.`
      ],
      pitfalls: [
        `고객 요청대로 사양부터 올려 인덱스·N+1·락 같은 원인은 그대로 두고 비용만 늘린다.`,
        `운영 DB에서 진단하며 무거운 쿼리나 EXPLAIN ANALYZE를 돌려 장애를 키운다. 스냅샷이나 복제본을 쓴다.`,
        `변경 여러 개를 한꺼번에 적용해 효과와 부작용을 구분하지 못하고 롤백 지점도 잃는다.`,
        `과거 데이터 정정(음수 재고)과 지원 종료 업그레이드를 범위에 말없이 포함하거나 누락해 분쟁이 된다.`
      ]
    }
  ],
  labs: [
    {
      title: `실습 1: 1천만 행 합성 데이터에서 느린 쿼리 5개 튜닝 보고서`,
      scenario: `고객사가 "주문 관련 화면 다섯 개가 느리다"며 쿼리 다섯 개를 보내왔습니다. 본인 PC의 Docker로 PostgreSQL 18을 띄우고, 운영과 비슷한 규모(주문 1천만 행)의 합성 데이터를 만든 뒤, 쿼리마다 EXPLAIN (ANALYZE, BUFFERS)로 전후를 비교하고 인덱스의 쓰기 비용까지 포함한 튜닝 보고서를 작성하세요. 디스크나 RAM이 부족하면 모든 건수를 1/10로 줄이되 보고서에 명시합니다. 로컬 환경에서만 실행합니다.`,
      steps: [
        `환경을 기록합니다. docker run으로 postgres:18을 볼륨과 함께 띄우고 shared_preload_libraries에 pg_stat_statements를 넣어 시작한 뒤 CREATE EXTENSION을 실행합니다. SELECT version(), CPU·RAM·디스크 종류를 env.md에 저장합니다.`,
        `레슨 1의 customers, products, orders, order_items 테이블을 PK·FK만 둔 채(보조 인덱스 없이) 만듭니다. generate_series로 customers 10만, products 5만, orders 1천만, order_items 약 2천만 행을 적재하되 customer_id는 상위 5% 고객에게 80%가 몰리게, created_at은 2년 범위로, status는 PAID 90%와 PENDING 1% 등으로 분포시킵니다. 적재 뒤 ANALYZE를 실행하고 pg_size_pretty로 테이블 크기를 기록합니다.`,
        `쿼리 5개를 작성합니다. Q1 고객의 최근 주문 20건, Q2 특정 날짜의 주문 수(date(created_at) = ... 형태), Q3 월별 PAID 매출 합계, Q4 고객별 마지막 주문 시각(상관 서브쿼리), Q5 OFFSET 500000 LIMIT 20 페이지 조회. 각 쿼리를 3회 실행해 Execution Time 중앙값과 shared hit/read를 baseline/ 폴더에 EXPLAIN 원문과 함께 저장합니다.`,
        `쿼리마다 가설 하나, 변경 하나로 개선합니다(복합 인덱스, 범위 재작성, 부분·커버링 인덱스, LATERAL이나 윈도 재작성, 키셋). 인덱스는 모두 CREATE INDEX CONCURRENTLY로 만들고 pg_relation_size로 크기를 기록한 뒤 after/ 폴더에 같은 방식으로 재측정합니다.`,
        `추정 행 수와 실제 행 수가 10배 이상 다른 노드를 하나 이상 찾아 원인을 확인합니다. ANALYZE 전후를 비교하고 필요하면 CREATE STATISTICS를 시도해 계획이 바뀌는지 기록합니다.`,
        `쓰기 비용을 잽니다. 새 인덱스 추가 전과 후에 orders에 10만 행을 INSERT ... SELECT generate_series로 넣는 시간을 각각 3회 측정해 비교합니다.`,
        `pg_stat_statements_reset() 뒤 5개 쿼리를 각각 200회 반복하는 스크립트를 baseline 구성과 after 구성에서 돌리고 total_exec_time 합계를 비교합니다.`,
        `장기 트랜잭션이 vacuum을 막는 상황을 재현합니다. 세션 A에서 BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT count(*) FROM orders;를 실행해 열어 둔 채, 세션 B에서 orders 10만 행을 UPDATE한 뒤 VACUUM (VERBOSE) orders를 돌려 "dead but not yet removable" 계열의 문구와 n_dead_tup을 저장합니다(출력 형식은 버전마다 다릅니다). 세션 A를 COMMIT하고 다시 VACUUM해 회수되는 것을 확인합니다.`,
        `report.md를 씁니다. 환경, 쿼리별 표(전 ms, 후 ms, 배율, 계획 변화 한 줄, 인덱스 크기, 쓰기 영향), vacuum 재현 결과, 그리고 효과가 없었거나 채택하지 않은 시도를 적는 절을 포함합니다.`
      ],
      accept: [
        `쿼리 5개 모두 baseline과 after의 EXPLAIN (ANALYZE, BUFFERS) 원문 파일이 있고 report.md 표의 수치(3회 중앙값)와 일치한다.`,
        `최소 3개 쿼리가 실행 시간 중앙값 기준 10배 이상 빨라졌고, 10배에 못 미친 쿼리는 이유(이미 효율적이거나 결과 행 자체가 많음 등)가 적혀 있다.`,
        `추정과 실제 행 수가 10배 이상 어긋난 노드를 1개 이상 찾아 원인과 조치 결과를 기록했고, 장기 트랜잭션이 열린 동안 VACUUM이 죽은 행을 치우지 못한 로그와 종료 뒤 회수된 로그를 각각 저장했다.`,
        `새 인덱스마다 크기(MB)와 INSERT 시간 변화(%)가 표에 있고, 효과가 없어 제거한 인덱스가 있거나 없는 이유가 적혀 있다.`,
        `환경(버전, CPU/RAM, 데이터 건수)이 report.md 맨 앞에 있어 다른 사람이 같은 조건으로 재현할 수 있다.`
      ],
      stretch: `PostgreSQL 17 컨테이너에서 같은 데이터로 선두 컬럼 조건이 없는 복합 인덱스 조회(예: (status, created_at) 인덱스에 created_at 범위 조건만 사용)를 돌려 18의 skip scan이 계획과 실행 시간을 바꾸는지 비교하세요. 또 created_at에 BRIN 인덱스를 만들어 B-tree와 크기·속도를 비교하고, 물리 순서와 값의 상관이 깨지면 어떻게 되는지 확인하세요. 속성 하나를 jsonb 컬럼과 정규화된 컬럼으로 각각 저장해 필터·집계 속도와 크기를 비교해도 좋습니다.`
    },
    {
      title: `실습 2: 재고 차감 동시성 실험과 격리 수준·데드락 재현`,
      scenario: `한정 판매 이벤트를 앞둔 고객사가 "재고 100개 상품에 1,000명이 동시에 주문해도 오버셀이 없음을 증명해 달라"고 요구합니다. 같은 시나리오를 여러 구현(잘못된 구현 하나와 올바른 구현 네 가지)으로 돌려 성공 건수, 최종 재고, 초당 처리량, 지연 분위수를 숫자로 비교하고, 격리 수준과 데드락은 psql 두 창으로 재현해 "어떤 방식을 왜 택했는지"를 근거와 함께 설명하는 자료를 만드세요. 고객에게 보여 줄 수 있는 결과표와 권고 한 문단이 최종 산출물이며, 로컬 DB에서만 실행합니다.`,
      steps: [
        `products(id, stock, version) 1행(stock=100)과 sales_log(id, product_id, qty, created_at) 테이블을 만듭니다. 구현 비교를 위해 일부 실험에서는 CHECK (stock >= 0)를 일부러 제거합니다.`,
        `Python(psycopg 또는 SQLAlchemy, 연결 풀 20)과 concurrent.futures로 요청 1,000건(각 수량 1)을 워커 50개로 동시에 보내는 하네스를 만듭니다. 성공·재고 부족·오류 건수, 최종 stock, 총 소요 시간, 요청별 지연의 p50·p95를 CSV로 남기고 요청마다 새 트랜잭션을 씁니다.`,
        `구현 N(naive): SELECT stock, 앱에서 검사, UPDATE stock = :새값. 오버셀을 재현합니다(성공 건수가 100을 넘거나 성공 건수와 100 - 최종 재고가 다름).`,
        `구현 A 원자적 UPDATE ... WHERE stock >= 1(영향 행 수 사용), B SELECT FOR UPDATE 후 UPDATE, C 낙관적 version(충돌 시 최대 10회 재시도, 재시도 수 집계), D SERIALIZABLE + 40001 재시도(재시도 횟수 집계). 각 구현을 5회 반복해 중앙값을 냅니다.`,
        `불변식 검증을 하네스 끝에 자동 단언으로 넣습니다. 성공 건수 == 100 - 최종 stock, 최종 stock >= 0, sales_log 합계 일치.`,
        `핫 로우 한계를 잽니다. 재고를 100,000으로 늘리고 워커 수 10, 50, 100에서 각 구현의 초당 처리량 상한을 표에 추가합니다.`,
        `psql 두 창 실험을 합니다. 레슨 5 코드로 Read Committed와 Repeatable Read의 차이를 로그로 저장하고, 이어서 write skew를 재현합니다. agents 테이블에 상담원 2명을 on_duty = true로 두고, 각 트랜잭션이 "다른 한 명이 근무 중인가"를 읽은 뒤 자기 on_duty를 false로 바꾸면 Repeatable Read에서는 둘 다 커밋되어 0명이 되고 Serializable에서는 한쪽이 40001로 중단됨을 확인합니다.`,
        `데드락을 재현합니다. 두 계좌 행을 반대 순서로 UPDATE하는 두 트랜잭션으로 40P01을 일으키고 서버 로그 원문을 저장합니다. id 오름차순으로 잠그도록 바꿔 동시 반복 1,000회에서 pg_stat_database의 deadlocks 증가량이 0인지 확인합니다.`,
        `결과 요약표와 "이 고객에게 어떤 방식을 권하는가" 결론 한 문단을 results.md에 씁니다.`
      ],
      accept: [
        `naive 구현에서 불변식 위반(오버셀 또는 성공 건수 불일치)이 1회 이상 재현되고 그 실행의 CSV와 로그가 첨부되어 있다.`,
        `A·B·C·D 구현이 각 5회 반복에서 불변식 위반 0회이며, 표에 성공 건수, 최종 재고, 초당 처리량, p95, 재시도 횟수가 있다.`,
        `Repeatable Read에서 난 40001 오류 원문(동시 갱신으로 직렬화 실패했다는 메시지)과, write skew가 Repeatable Read에서는 재현되고 Serializable에서는 차단된 로그가 각각 첨부되어 있다.`,
        `데드락 40P01 서버 로그 원문과, 락 순서 정렬 뒤 deadlocks 증가량 0이 기록되어 있다.`,
        `결론 문단이 측정값 2개 이상을 인용해 권고 방식을 정당화한다.`
      ],
      stretch: `같은 하네스를 MySQL 8.4 InnoDB 컨테이너(기본 Repeatable Read)에서 돌려 범위 조건 FOR UPDATE가 삽입을 막는 gap 락 동작을 재현하고 PostgreSQL과의 차이를 표로 정리하세요. 또 재고를 10개 슬롯으로 쪼갠 구현을 추가해 핫 로우 처리량이 얼마나 올라가는지 측정하세요.`
    },
    {
      title: `실습 3 (납품형 미니 프로젝트): 무중단 컬럼 마이그레이션 키트와 DB 점검 보고서`,
      scenario: `고객사 개발팀이 "컬럼 이름 변경과 값 정규화 배포 때마다 서비스가 멈추고, 백업은 있다는데 복구해 본 적이 없다"며 인수인계 자료를 의뢰했습니다. 납품물은 (1) 재현 가능한 저장소(docker compose, SQLAlchemy 2.x 모델, Alembic 마이그레이션), (2) 부하 중 마이그레이션 시연 결과(나쁜 방식과 좋은 방식), (3) PITR 복구 훈련 기록, (4) report.md와 runbook.md입니다. README만 보고 처음 보는 사람이 재현할 수 있게 납품하세요. 로컬 환경에서만 실행합니다.`,
      steps: [
        `저장소를 만듭니다. db-delivery/ 폴더 아래에 설명서 README.md, 컨테이너 정의 docker-compose.yml(PostgreSQL 18과 데이터 볼륨), 모델 app/models.py(customers, orders, order_items 테이블이며 customers에 phone 컬럼 포함), 마이그레이션 alembic/(naming_convention 설정과 env.py의 compare_type=True), 부하 스크립트 tools/load.py, 백필 스크립트 tools/backfill.py, 보고서 report.md, 런북 runbook.md, 측정 결과 results/를 둡니다.`,
        `초기 마이그레이션으로 스키마를 만들고 customers 200만 행(phone은 하이픈이 섞인 국내 번호 형식이고 일부는 비정상 형식)과 orders 1천만 행을 적재합니다. 규모가 부담되면 1/10로 줄이고 report.md에 명시합니다.`,
        `tools/load.py를 만듭니다. 앱을 흉내 내는 부하(읽기 40 rps, 쓰기 10 rps)를 스레드로 보내고 초 단위로 p50·p99 지연과 오류 수를 results/*.csv에 기록합니다. 마이그레이션 없는 기준선을 5분 기록합니다.`,
        `나쁜 방식을 재현합니다. 별도 세션에서 BEGIN; SELECT ... FROM customers LIMIT 1;을 실행하고 2분 대기(장기 트랜잭션)하는 동안 lock_timeout 없이 ALTER TABLE customers ...를 실행합니다. 부하 클라이언트의 지연·오류 급증 구간과 pg_stat_activity에서 대기 중인 세션(wait_event_type = 'Lock')을 캡처합니다.`,
        `좋은 방식을 구현합니다. (a) expand 마이그레이션: lock_timeout 3초와 재시도 래퍼(alembic upgrade를 최대 5회 시도), NULL 허용 phone_e164 추가, 인덱스는 CONCURRENTLY. (b) 이중 쓰기(앱 모델이 두 컬럼에 쓰거나 트리거). (c) tools/backfill.py: PK 범위 10,000행 배치, 배치마다 커밋, 50ms 휴식, 마지막 처리 id를 파일에 기록해 중단 후 재시작, 진행률 로그, 비정상 형식은 별도 테이블로 격리. (d) 변환 규칙과 어긋나는 행이 0건인지 검증 쿼리. (e) 읽기 전환 뒤 옛 컬럼 삭제를 별도 리비전(contract)으로.`,
        `마이그레이션 진행 중 부하 스크립트를 계속 돌려 단계별 p99와 오류를 기록하고, 백필 도중 Ctrl+C로 중단했다가 재시작해도 결과가 같음을 검증합니다. 백필 전후의 WAL 생성량(pg_current_wal_lsn 차이)과 dead tuple 증가를 기록합니다.`,
        `CI를 흉내 내는 검증 스크립트(make verify 등)를 만듭니다. 빈 DB에서 alembic upgrade head가 성공하고 alembic check가 변경 없음으로 끝나야 합니다.`,
        `PITR 훈련을 합니다. wal_level과 archive_mode, archive_command를 설정(컨테이너 볼륨에 아카이브 디렉터리)하고 pg_basebackup으로 기반 백업을 뜬 뒤, 시각을 기록해 두고 일부러 DELETE FROM orders WHERE created_at > ... 를 실행합니다. 별도 컨테이너에서 기반 백업을 복원하고 restore_command, recovery_target_time(삭제 직전 시각), recovery.signal 파일로 복구해 행 수를 대조하고 소요 시간(RTO)을 기록합니다.`,
        `report.md(환경, 나쁜 방식과 좋은 방식의 측정표, 백필 소요, PITR 소요, 남은 위험)와 runbook.md(마이그레이션 사전 점검 체크리스트: 장기 트랜잭션·디스크 여유·백업 직전 확인, 중단과 roll forward 결정 트리, 알림 임계값)를 쓰고, 새 폴더에서 README만 보고 재현해 걸린 시간을 기록합니다.`
      ],
      accept: [
        `나쁜 방식 실행에서 부하 클라이언트가 5초 이상 응답을 받지 못했거나 p99가 기준선의 10배 이상으로 치솟은 구간이 CSV로 증명되고, pg_stat_activity 캡처에 ALTER가 대기 중이고 다른 쿼리가 줄서 있는 상태가 있다. (재현이 안 되면 장기 트랜잭션 길이를 늘려 재시도하고 시도 기록을 남긴다.)`,
        `좋은 방식의 전 구간에서 부하 클라이언트 오류가 0건이고 p99가 기준선의 3배 이하(합의된 수치가 있으면 그 수치)이며, 모든 DDL의 lock_timeout 설정이 확인된다.`,
        `백필을 중간에 중단했다 재시작해도 최종 검증 쿼리의 불일치가 0건이고, 총 소요 시간과 WAL 생성량이 report.md에 있다.`,
        `PITR 복구로 삭제 직전 시점의 orders 행 수가 정확히 복원되고 복구 소요 시간이 기록되어 있다.`,
        `새 폴더에서 README만으로 30분 안에 재현했다는 기록이 있다.`
      ],
      stretch: `같은 마이그레이션을 Flyway(SQL 파일 버전 관리)로 포팅하고 두 도구의 차이(롤백, 검증, 반복 실행)를 표로 정리하세요. 또는 PostgreSQL 17에서 18로 pg_upgrade 리허설을 하고 걸린 시간과 업그레이드 직후 통계 상태(ANALYZE가 필요한지)를 기록하세요.`
    }
  ],
  quiz: [
    {
      q: `[상황] 1,200만 행 orders 테이블에서 "고객의 최근 주문 20건" 조회(WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20)가 느립니다. 현재 인덱스는 PK와 created_at 단독 인덱스뿐입니다. 인덱스 설계로 가장 적절한 것은 무엇입니까?`,
      choices: [
        `created_at 단독 인덱스는 그대로 두고 work_mem을 넉넉히 올려, 고객 조건으로 거른 행들의 정렬이 메모리 안에서 끝나게 한다.`,
        `(customer_id, created_at DESC) 복합 인덱스를 CONCURRENTLY로 만들어 해당 고객 구간의 앞쪽 20개만 읽고 정렬도 생략하게 한다.`,
        `(created_at, customer_id) 복합 인덱스를 만든다. 정렬 컬럼을 앞에 두어야 ORDER BY가 인덱스로 해결되고, 고객 조건은 인덱스 안에서 걸러 내면 된다.`,
        `customer_id에 Hash 인덱스를 추가한다. 등호 조건 조회에서는 Hash가 B-tree보다 항상 빠르고 인덱스도 작아 이 쿼리에 가장 적합하다.`
      ],
      answer: 1,
      why: `등호 조건 컬럼을 선두에, 정렬 컬럼을 뒤에 둔 (customer_id, created_at DESC)는 그 고객 구간의 맨 앞에서 20개만 읽으면 끝나고 Sort 노드도 사라집니다. (created_at, customer_id)는 정렬은 해결하지만 전체 기간을 훑으며 고객 ID를 걸러야 해서 고객의 주문이 적을수록 많이 읽습니다. Hash 인덱스는 정렬을 돕지 못하고, work_mem은 읽는 양 자체를 줄이지 못합니다.`
    },
    {
      q: `[로그] 월말 리포트 쿼리 실행 계획의 일부입니다. 총 실행 시간은 약 61초였습니다.

Nested Loop  (cost=0.29..265004.50 rows=3 width=48) (actual time=0.05..61240.8 rows=480113 loops=1)
  ->  Seq Scan on orders o  (cost=0.00..265000.00 rows=3 width=24) (actual time=0.02..812.3 rows=480113 loops=1)
        Filter: ((status = 'PENDING') AND (created_at >= '2026-10-01'))
        Rows Removed by Filter: 9519887
  ->  Index Scan using customers_pkey on customers c  (cost=0.29..1.42 rows=1 width=24) (actual time=0.12..0.12 rows=1 loops=480113)

가장 타당한 진단과 첫 조치는 무엇입니까?`,
      choices: [
        `병목은 안쪽 Index Scan이므로 customers 쪽 인덱스가 부족한 것이다. customers의 조회 컬럼들에 인덱스를 더 추가해 탐색을 빠르게 한다.`,
        `Nested Loop 자체가 원인이므로 서버 전체에 enable_nestloop = off를 설정해 이런 계획이 다시는 선택되지 않게 만든다.`,
        `추정(3행)과 실제(480,113행)의 격차가 근본 원인이다. orders의 ANALYZE 상태를 확인하고, status와 created_at의 상관이 원인이면 CREATE STATISTICS를 검토한다.`,
        `Hash Join으로 바뀌려면 메모리가 더 필요하므로 shared_buffers를 크게 늘리면, 플래너가 자동으로 Hash Join을 선택해 이 쿼리가 빨라진다.`
      ],
      answer: 2,
      why: `Nested Loop는 바깥 입력이 작다는 추정에서 고른 계획인데 실제로는 48만 행이라 안쪽 인덱스 탐색이 loops=480113번 반복되어(0.12ms × 약 48만 = 약 58초) 시간을 잡아먹었습니다. 추정이 틀린 원인(낡은 통계, 컬럼 간 상관)을 고쳐 플래너가 Hash Join을 고르게 하는 것이 정석입니다. 이미 PK 인덱스를 쓰는 customers에 인덱스를 더해도 반복 횟수는 줄지 않고, enable_nestloop 전역 off는 다른 쿼리까지 망가뜨리며, shared_buffers는 계획 선택과 직접 관련이 없습니다.`
    },
    {
      q: `[오류] 잔액 이체 API의 격리 수준을 SERIALIZABLE로 바꾼 뒤 피크 시간에 요청의 약 0.5%가 500 오류로 실패합니다. 서버 로그입니다.

ERROR:  could not serialize access due to read/write dependencies among transactions
HINT:  The transaction might succeed if retried.
SQLSTATE: 40001

가장 적절한 대응은 무엇입니까?`,
      choices: [
        `SQLSTATE 40001을 잡아 트랜잭션 전체를 처음부터 제한 횟수 안에서 백오프를 두고 재시도하고, 재시도 횟수를 지표로 남긴다. 트랜잭션 안에는 외부 호출을 두지 않는다.`,
        `40001이 나면 실패한 문장 하나만 같은 트랜잭션 안에서 다시 실행한다. 앞에서 읽은 데이터는 여전히 유효하므로 처음부터 다시 할 필요가 없다.`,
        `격리 수준을 READ COMMITTED로 되돌려 40001이 나지 않게 한다. 오류가 사라지면 이체 정합성 문제도 함께 해결되므로 가장 단순한 해법이다.`,
        `lock_timeout을 늘려 충돌하는 트랜잭션이 더 오래 기다리게 하면, 직렬화 실패 없이 순서대로 처리되어 오류가 사라진다.`
      ],
      answer: 0,
      why: `40001은 직렬화 실패로, 충돌한 트랜잭션 중 하나를 되돌릴 테니 다시 시도하라는 설계된 신호입니다. 문서도 트랜잭션 전체를 처음부터 재시도하라고 안내합니다. 문장 하나만 다시 실행하면 이미 취소된 트랜잭션의 일부만 반영될 수 있습니다. 격리를 낮추면 오류와 함께 보장도 사라지고, SSI의 충돌 감시는 락 대기가 아니므로 lock_timeout과 무관합니다.`
    },
    {
      q: `[코드] 주문 목록 API의 응답 시간이 600ms입니다. SQL 로그에는 같은 형태의 SELECT가 101번 찍혀 있습니다. 무엇이 문제이고 어떻게 고쳐야 합니까?

def list_orders(session):
    orders = session.scalars(select(Order).limit(100)).all()
    return [{"id": o.id, "qty": [i.qty for i in o.items]} for o in orders]`,
      choices: [
        `limit(100)이 너무 커서 느린 것이다. limit을 10으로 줄이고 나머지는 다음 페이지로 나눠 가져오면 쿼리 수도 비례해 줄어 문제가 해결된다.`,
        `orders.id에 인덱스가 없어 같은 형태의 SELECT가 반복 실행된다. 인덱스를 추가하면 쿼리 횟수와 응답 시간이 함께 줄어든다.`,
        `expire_on_commit이 True라서 객체가 매번 다시 조회된다. 세션을 expire_on_commit=False로 만들면 반복되는 SELECT가 사라진다.`,
        `o.items가 접근하는 순간마다 지연 로딩되어 1 + 100번(N+1) 쿼리가 나간다. select(Order).options(selectinload(Order.items))로 컬렉션을 한 번에 가져온다.`
      ],
      answer: 3,
      why: `주문 100건을 읽은 뒤 각 주문의 items에 처음 접근할 때마다 쿼리가 나가 1 + 100번이 됩니다. selectinload는 부모 PK들을 IN으로 묶은 두 번째 쿼리 하나로 컬렉션을 채워 총 2번입니다. limit 축소는 증상만 줄이고, PK는 이미 인덱스가 있으며, expire_on_commit은 커밋 뒤 만료 동작이라 이 코드와 무관합니다.`
    },
    {
      q: `[SQL] 주문별 항목 합계와 결제 합계를 구하는 쿼리입니다. 항목이 여러 개인 주문에서 paid 값이 실제 결제액보다 크게 나옵니다. 무엇이 잘못되었습니까?

SELECT o.id,
       sum(oi.qty * oi.unit_price_krw) AS items_total,
       sum(p.amount_krw)               AS paid
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN payments p     ON p.order_id = o.id
GROUP BY o.id;`,
      choices: [
        `조인이 일치하는 행을 중복해서 만들어 내는 것이므로 두 JOIN을 모두 LEFT JOIN으로 바꾸면 중복 행이 사라져 합계가 정확해진다.`,
        `항목과 결제가 모두 주문과 1:N이라 조인하면 주문당 (항목 수 × 결제 수)행으로 불어나 합계가 부풀려진다. 항목과 결제를 각각 order_id로 먼저 집계한 뒤 조인해야 한다.`,
        `결제 쪽 합계를 sum(DISTINCT p.amount_krw)로 바꾸면 항목 수만큼 복제된 중복 결제 금액이 제거되어 paid가 정확해진다.`,
        `GROUP BY에 oi.id와 p.id를 추가해 항목과 결제 행을 구분하면 중복 집계가 사라져 주문별 합계가 정확해진다.`
      ],
      answer: 1,
      why: `두 자식 테이블을 한 번에 조인하면 주문 1건이 항목 수 × 결제 수만큼 복제되어 양쪽 합계가 모두 부풀려집니다. 자식별로 먼저 집계하고 조인해야 합니다. sum(DISTINCT)는 금액이 같은 서로 다른 결제 두 건을 하나로 합쳐 반대 방향의 오류를 만들고, GROUP BY에 id를 추가하면 그룹이 쪼개져 주문별 합계가 아니게 됩니다. LEFT JOIN은 NULL 처리만 바꿀 뿐 증폭을 해결하지 못합니다.`
    },
    {
      q: `[상황] 금요일 배포에서 orders에 컬럼 하나를 추가하는 ALTER TABLE을 실행했더니, DDL 자체는 수 ms짜리인데도 API가 약 40초간 모든 요청에서 타임아웃이 났습니다. 조사해 보니 배포 직전부터 관리자가 연 리포트 쿼리 트랜잭션이 orders를 읽는 중이었습니다. 근본 대응으로 가장 적절한 것은 무엇입니까?`,
      choices: [
        `배포 세션에 lock_timeout(예: 3초)을 걸어 락을 못 얻으면 빨리 실패해 재시도하게 하고, 배포 전 장기 트랜잭션을 점검하며 리포트는 복제본에서 실행한다.`,
        `DB 인스턴스 사양을 한 단계 올려 CPU와 디스크가 빨라지면 ALTER TABLE이 더 빨리 끝나 서비스 정지 시간이 줄어들게 한다.`,
        `ALTER 직전에 VACUUM FULL orders를 실행해 테이블을 정리해 두면 ALTER가 처리할 데이터가 줄어 락 대기도 짧아진다.`,
        `서비스 전체의 격리 수준을 SERIALIZABLE로 올려 리포트 트랜잭션과 ALTER가 서로 충돌하지 않고 순서대로 실행되게 한다.`
      ],
      answer: 0,
      why: `ALTER TABLE은 ACCESS EXCLUSIVE 락이 필요한데, 리포트 트랜잭션이 끝나기를 기다리는 동안 그 뒤에 도착한 일반 쿼리들도 ALTER 뒤에 줄을 서서 서비스 전체가 멈춥니다. 그래서 락을 오래 기다리지 않게 하는 lock_timeout과 재시도, 장기 트랜잭션 사전 점검이 정석입니다. 사양을 올려도 락 대기는 줄지 않고, VACUUM FULL은 오히려 ACCESS EXCLUSIVE를 더 오래 잡으며, 격리 수준은 DDL 락 대기열과 무관합니다.`
    },
    {
      q: `[상황] 재고 10개인 상품에 20개 요청이 동시에 들어오는 순간 가끔 판매가 10건을 넘습니다. 현재 코드는 SELECT stock, 앱에서 stock >= qty 검사, UPDATE products SET stock = :계산한_새값 순서입니다(PostgreSQL 기본 격리). 서버는 2대입니다. 가장 좋은 수정은 무엇입니까?`,
      choices: [
        `애플리케이션에 threading.Lock을 추가해 재고 조회와 차감 코드가 한 번에 하나씩만 실행되도록 직렬화한다. 락 범위가 짧아 성능 영향도 거의 없다.`,
        `트랜잭션 격리 수준을 REPEATABLE READ로 올려 스냅샷을 고정하고, 나머지 SELECT 후 UPDATE 코드는 그대로 둔다. 읽은 값이 트랜잭션 안에서 바뀌지 않으므로 안전하다.`,
        `UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :qty 한 문장으로 바꾸고, 영향 행 수가 1일 때만 성공으로 처리한다.`,
        `stock 컬럼에 인덱스를 추가해 조회와 UPDATE가 더 빨리 끝나게 하면 경합 구간이 짧아지고, 동시 요청이 겹칠 확률도 낮아져 오버셀이 사라진다.`
      ],
      answer: 2,
      why: `검사와 차감을 한 문장으로 합치면 DB의 행 락이 직렬화를 맡고, Read Committed에서도 기다리던 문장이 갱신된 행에 WHERE를 다시 평가하므로 오버셀이 불가능합니다. threading.Lock은 서버 2대(여러 프로세스) 사이에서 무력합니다. REPEATABLE READ만 올리면 lost update가 40001 오류로 바뀔 뿐 재시도 로직이 없으면 사용자에게 500이 나가고, 인덱스는 경합 문제와 무관합니다.`
    },
    {
      q: `[상황] 신입 개발자가 PR에서 "order_items.unit_price_krw는 products.price_krw와 중복이니 정규화 위반이다. 컬럼을 지우고 조회 때마다 products를 조인하자"고 제안했습니다. 리뷰어로서 가장 적절한 판단은 무엇입니까?`,
      choices: [
        `맞는 지적이다. 같은 값이 두 테이블에 있는 것은 정규화 위반이므로 컬럼을 삭제하고 조회 때마다 products를 조인하도록 바꾼다.`,
        `한 걸음 더 나아가 조인을 아예 없애도록 order_items에 products의 이름과 카테고리까지 모두 복사해 두는 쪽이 더 낫다.`,
        `unit_price_krw를 float으로 바꾸면 products의 가격과 값이 어긋날 여지가 사라져 정규화 문제가 해결된다.`,
        `거부한다. unit_price_krw는 주문 시점 가격의 스냅샷으로 업무 요구이며, 조인으로 바꾸면 가격이 바뀐 뒤 과거 주문 금액과 매출 집계가 달라진다.`
      ],
      answer: 3,
      why: `정규화의 목적은 같은 사실이 두 곳에서 어긋나는 것을 막는 것인데, 주문 시점 가격은 "그때의 사실"이라 products의 현재 가격과 서로 다른 사실입니다. 조인으로 바꾸면 가격 인상 뒤 과거 주문 금액이 바뀌어 정산이 깨집니다. 더 많은 컬럼을 복사하는 것은 같은 문제를 넓히고, 금액을 float으로 바꾸는 것은 반올림 오류만 부릅니다.`
    },
    {
      q: `[로그] 계좌 이체 API에서 간헐적으로 다음 오류가 납니다.

ERROR:  deadlock detected
DETAIL:  Process 8812 waits for ShareLock on transaction 5521; blocked by process 8790.
         Process 8790 waits for ShareLock on transaction 5520; blocked by process 8812.

코드는 "출금 계좌 UPDATE, 입금 계좌 UPDATE" 순서이고, A에서 B로 보내는 이체와 B에서 A로 보내는 이체가 동시에 실행될 때 발생합니다. 가장 적절한 수정은 무엇입니까?`,
      choices: [
        `deadlock_timeout을 길게 설정해 데드락 검사가 돌기 전에 한쪽 트랜잭션이 먼저 끝나기를 기대하고, 그동안은 기다리게 둔다.`,
        `격리 수준을 SERIALIZABLE로 올려 두 이체 트랜잭션이 서로의 갱신과 충돌하지 않고 순서대로 처리되게 한다.`,
        `두 계좌를 항상 id 오름차순으로 잠그거나 갱신하도록 순서를 고정하고, 그래도 발생하는 40P01은 트랜잭션 재시도로 처리한다.`,
        `계좌 테이블에 인덱스를 더 추가해 UPDATE가 빨리 끝나게 하면 락을 쥐는 시간이 줄어 순환 대기가 생기지 않는다.`
      ],
      answer: 2,
      why: `데드락은 두 트랜잭션이 같은 행들을 반대 순서로 잠가서 생기는 순환 대기이므로, 모든 코드 경로에서 락 획득 순서를 같게 만들면 순환이 사라집니다(PostgreSQL 문서의 일관된 순서 권고). 남는 경우는 40P01 재시도로 처리합니다. timeout을 늘리면 감지만 늦어지고, SERIALIZABLE은 행 락의 순환 자체를 없애지 못하며, 인덱스는 순서 문제를 풀지 못합니다.`
    },
    {
      q: `[상황] 고객 DB의 orders 테이블이 계속 부풀고(디스크가 월 8GB씩 증가) n_dead_tup이 수백만인데 autovacuum은 정상적으로 도는 것으로 보입니다. pg_stat_activity를 보니 배치 서버의 세션 하나가 state = 'idle in transaction', xact_start = 3일 전이고, 그 트랜잭션은 UPDATE를 실행한 뒤 커밋하지 않은 상태입니다. 가장 적절한 조치는 무엇입니까?`,
      choices: [
        `소유자를 확인해 그 세션을 종료하고, 배치 코드의 트랜잭션 경계를 고치며, idle_in_transaction_session_timeout과 dead tuple 비율 경보를 둔다.`,
        `autovacuum_naptime을 줄이고 autovacuum_vacuum_cost_limit을 높여 autovacuum이 더 자주, 더 빨리 돌게 한다.`,
        `서비스가 한가한 틈을 타 운영 중에 VACUUM FULL orders를 실행해 부푼 공간을 즉시 회수하면 이후 autovacuum이 정상으로 돌아온다.`,
        `orders에 인덱스를 추가해 vacuum이 죽은 행을 더 빨리 찾아 지우게 하고, 인덱스 스캔 단계가 빨라져 청소가 막히지 않게 한다.`
      ],
      answer: 0,
      why: `쓰기로 트랜잭션 ID를 받은 채 3일째 열려 있는 세션 때문에, vacuum은 그 이후의 옛 행 버전을 "아직 누군가 볼 수 있다"고 보고 돌아도 죽은 행을 치우지 못합니다. 원인 세션을 정리하고 재발 방지 설정을 두는 것이 우선입니다. naptime과 cost_limit은 청소의 빈도와 속도일 뿐 치울 수 없는 행을 치우게 하지 못하고, VACUUM FULL은 ACCESS EXCLUSIVE로 서비스를 막으면서도 같은 이유로 죽은 행이 남을 수 있으며, 인덱스는 무관합니다.`
    },
    {
      q: `[상황] 고객이 "매일 새벽 2시에 pg_dump로 백업하니 안전하다"고 합니다. 어제 14:20에 담당자가 운영 테이블의 행을 대량 삭제했고, 고객은 "14:19 상태로 되돌려 달라"고 요구합니다. 현재 설정은 pg_dump뿐입니다. 올바른 설명과 앞으로의 대책은 무엇입니까?`,
      choices: [
        `새벽 2시 pg_dump 파일을 복원하면서 pg_restore에 복구 시점 옵션을 함께 지정하면 14:19 상태로 되돌릴 수 있다.`,
        `삭제된 행은 vacuum이 돌기 전까지 물리적으로 남아 있으므로 별도 복구 도구 없이도 일반 SELECT로 다시 읽어 되살릴 수 있다.`,
        `논리 백업을 4시간마다 하루 6번으로 늘리면 앞으로는 사고 직전의 덤프로 복원해 14:19 상태에 맞출 수 있으므로 WAL 아카이빙 없이도 충분하다.`,
        `pg_dump는 덤프 시점(새벽 2시)으로만 복원되어 14:19 복구는 불가능하다. 앞으로는 기반 백업과 WAL 아카이빙으로 PITR을 구성하고 복구 훈련으로 RTO·RPO를 잰다.`
      ],
      answer: 3,
      why: `pg_dump는 한 시점의 논리 스냅샷이라 시점 복구에 쓸 수 없고(공식 문서), 지금 설정으로는 새벽 2시 상태까지만 되돌릴 수 있어 그 사이의 변경은 잃습니다. 기반 백업과 연속 WAL 보관이 있어야 recovery_target_time으로 원하는 시각에 복구할 수 있습니다. 덤프 빈도를 늘려도 복구 시점은 이산적이고 부하만 늘며, 삭제된 행을 일반 SELECT로 읽는 것은 불가능합니다.`
    },
    {
      q: `[로그와 설정] 세일 시작 직후 API 일부가 다음 오류로 실패합니다.

FATAL:  sorry, too many clients already

설정: PostgreSQL max_connections = 100, API 인스턴스 8개, 각 인스턴스의 SQLAlchemy 풀은 기본값(pool_size=5, max_overflow=10)입니다. 가장 적절한 대응은 무엇입니까?`,
      choices: [
        `max_connections를 2,000으로 올려 한도 자체를 넉넉하게 만든다. 연결은 비용이 거의 들지 않으므로 인스턴스가 늘어도 이것으로 문제가 해결된다.`,
        `8 × (5 + 10) = 최대 120연결이라 한도 100을 넘는다. 풀 크기를 줄여 총량을 한도 아래로 맞추고, 인스턴스가 더 늘면 PgBouncer를 두되 트랜잭션 풀링 호환성(세션 상태, 세션 advisory lock)을 점검한다.`,
        `풀의 max_overflow를 100으로 늘려 요청이 몰려도 대기 없이 연결을 더 만들 수 있게 하고, 부족한 만큼은 풀이 알아서 흡수하게 한다.`,
        `애플리케이션 인스턴스를 한 시간마다 순차 재시작해 쌓인 연결을 자주 비우고, 연결 누수가 한도에 닿지 않게 한다. 배포 파이프라인에 재시작 작업만 추가하면 된다.`
      ],
      answer: 1,
      why: `8 × (5 + 10) = 120이 최대 연결 수여서 한도 100을 넘을 수 있습니다. PostgreSQL은 연결마다 프로세스를 쓰므로 한도를 크게 올리면 메모리와 컨텍스트 전환 비용이 늘고, 풀을 더 키우면 문제가 악화됩니다. 재시작은 증상만 덮습니다. 풀 총량을 계산해 맞추고 필요하면 PgBouncer로 연결을 다중화하되 트랜잭션 모드의 제약을 확인하는 것이 맞습니다.`
    }
  ],
  refs: [
    {
      title: `PostgreSQL 18 Documentation: Transaction Isolation`,
      url: `https://www.postgresql.org/docs/18/transaction-iso.html`,
      kind: `doc`,
      why: `Read Committed·Repeatable Read·Serializable의 정확한 보장, 직렬화 실패(40001) 시 트랜잭션 전체를 재시도하라는 지침, SELECT FOR UPDATE의 행 재평가 규칙을 1차 자료로 확인한다. 레슨 5와 6의 근거.`
    },
    {
      title: `PostgreSQL 18 Documentation: Explicit Locking`,
      url: `https://www.postgresql.org/docs/18/explicit-locking.html`,
      kind: `doc`,
      why: `행 락 모드, ACCESS EXCLUSIVE 락을 요구하는 명령, 데드락 예방 지침(일관된 락 순서), advisory lock을 정리한 문서. 재고 차감·데드락·무중단 마이그레이션 판단의 근거.`
    },
    {
      title: `PostgreSQL 18 Documentation: Using EXPLAIN`,
      url: `https://www.postgresql.org/docs/18/using-explain.html`,
      kind: `doc`,
      why: `플랜 트리, 비용 단위, 추정과 실제 행 수, loops, BUFFERS 읽는 법과 데이터 변경 쿼리를 롤백으로 감싸라는 주의. 튜닝 보고서의 기본 어휘.`
    },
    {
      title: `PostgreSQL 18 Documentation: Index Types`,
      url: `https://www.postgresql.org/docs/18/indexes-types.html`,
      kind: `doc`,
      why: `B-tree, Hash, GiST, SP-GiST, GIN, BRIN이 지원하는 연산자와 용도. 인덱스 종류를 고를 때 가장 먼저 확인할 공식 표.`
    },
    {
      title: `PostgreSQL 18 Documentation: CREATE INDEX`,
      url: `https://www.postgresql.org/docs/18/sql-createindex.html`,
      kind: `doc`,
      why: `CONCURRENTLY의 동작과 제약(트랜잭션 블록 불가, 실패 시 INVALID 인덱스, 파티션 테이블), INCLUDE, 부분 인덱스 문법. 운영 중 인덱스 생성 절차의 근거.`
    },
    {
      title: `Use The Index, Luke (Markus Winand)`,
      url: `https://use-the-index-luke.com/`,
      kind: `book`,
      why: `벤더 중립 SQL 인덱싱·튜닝 웹 교재. 인덱스 구조, WHERE 절, 조인, 정렬·그룹핑, 페이징, 쓰기 영향을 순서대로 읽고 실습 1의 쿼리에 적용한다.`
    },
    {
      title: `PostgreSQL 18 Documentation: Routine Vacuuming`,
      url: `https://www.postgresql.org/docs/18/routine-vacuuming.html`,
      kind: `doc`,
      why: `죽은 튜플, autovacuum 임계식(기본값 50·0.2는 서버 설정 문서의 autovacuum 항목에서 확인), 트랜잭션 ID wraparound(20억, freeze, 경고와 신규 XID 거부 기준), 복구 점검 항목인 장기 트랜잭션·복제 슬롯·prepared transaction, VACUUM과 VACUUM FULL의 락 차이.`
    },
    {
      title: `PostgreSQL 18 Documentation: Continuous Archiving and Point-in-Time Recovery (PITR)`,
      url: `https://www.postgresql.org/docs/18/continuous-archiving.html`,
      kind: `doc`,
      why: `pg_basebackup 기반 백업과 WAL 아카이빙, 시각 등으로 복구 지점을 정하는 방식, pg_dump로는 PITR이 불가능하다는 점, 아카이브 실패 시 pg_wal이 차서 서버가 멈추는 위험과 감시 필요성, 복구 뒤 상태 점검 절차. 실습 3의 복구 훈련 근거이며 recovery_target_time 등 설정 이름은 이 문서가 링크하는 복구 설정 절에서 확인한다.`
    },
    {
      title: `PostgreSQL 18 Documentation: pg_stat_statements`,
      url: `https://www.postgresql.org/docs/18/pgstatstatements.html`,
      kind: `doc`,
      why: `shared_preload_libraries 설정과 CREATE EXTENSION, total_exec_time·mean_exec_time·rows·shared_blks_* 컬럼, 쿼리 정규화와 queryid. 튜닝 대상 선정의 출발점.`
    },
    {
      title: `SQLAlchemy 2.0 Documentation: Relationship Loading Techniques`,
      url: `https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html`,
      kind: `doc`,
      why: `lazy, joinedload, selectinload, raiseload의 동작과 N+1 문제의 정의. 로딩 전략을 고르는 공식 기준이며 JPA의 fetch 전략과 대응해 읽는다.`
    },
    {
      title: `Alembic Documentation: Auto Generating Migrations`,
      url: `https://alembic.sqlalchemy.org/en/latest/autogenerate.html`,
      kind: `doc`,
      why: `autogenerate가 감지하는 것과 못 하는 것(이름 변경, 이름 없는 제약, server_default 등), 생성물 리뷰 원칙, 제약 이름 규칙, alembic check. 마이그레이션 CI 설계의 근거.`
    },
    {
      title: `PgBouncer Documentation: Features`,
      url: `https://www.pgbouncer.org/features.html`,
      kind: `doc`,
      why: `session·transaction·statement 풀링 모드와 트랜잭션 모드에서 깨지는 기능(세션 상태, SQL PREPARE, 세션 advisory lock), max_prepared_statements 설정.`
    },
    {
      title: `MySQL 8.4 Reference Manual: InnoDB Transaction Isolation Levels`,
      url: `https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html`,
      kind: `doc`,
      why: `InnoDB 기본 Repeatable Read, 일관된 읽기, gap·next-key 락과 Read Committed의 차이. MySQL 현장에서 PostgreSQL과 동작이 달라지는 지점을 확인한다.`
    },
    {
      title: `PostgreSQL Versioning Policy`,
      url: `https://www.postgresql.org/support/versioning/`,
      kind: `doc`,
      why: `메이저 버전 5년 지원, 마이너 릴리스 주기, 버전별 지원 종료일과 현행 마이너 표. 고객 DB의 지원 종료 점검과 업그레이드 견적에 쓴다(2026-11 확인).`
    }
  ],
  gigs: [
    `고객은 대개 "DB가 느려요", "재고가 가끔 틀려요", "배포하면 멈춰요"라고 말하고 해법으로 서버 사양 증설을 가정합니다. 견적 전에 확인할 것: DB 종류와 버전(PostgreSQL이면 지원 종료일, 14는 2026-11-12), 관리형 여부(RDS 같은 서비스는 확장·파라미터·superuser 권한에 제약), 접근 방식(읽기 전용 계정, 스냅샷, 복제본), 데이터 크기와 증가율, pg_stat_statements 사용 여부, 백업 현황과 복구 경험, 쓰는 ORM·쿼리 도구(JPA, MyBatis, SQLAlchemy), 개인정보 포함 여부와 마스킹 가능성, 작업 가능 시간대. 시장 참고: 위시켓 상주 프로젝트의 DB는 Oracle 31.1%·MySQL 28.6%·PostgreSQL 21.6%(2025-01~09 집계), 사람인 키워드 검색(2026-11-09)은 MySQL 830·Oracle 653·PostgreSQL 641건이라 MySQL·Oracle 현장 의뢰도 많습니다. 모델링·인덱스·트랜잭션 원리는 공통이지만 문법·격리·락·도구는 DB마다 다르므로, 익숙하지 않은 DB는 범위에서 빼거나 학습 시간을 견적에 포함합니다.`,
    `진단과 수정을 분리해 견적합니다. 먼저 고정가 진단(기준선 수집, 상위 쿼리 10개 분석, 연결·락·vacuum·백업 점검, 보고서)을 하고, 그 결과로 수정 견적을 냅니다. 환경이 복잡할수록 첫 견적은 틀립니다. 경험치(데이터량·환경·인수 조건에 따라 크게 달라짐): 진단 3~5일, 인덱스·쿼리 개선은 건당 반나절~1일, 락을 의식한 무중단 마이그레이션 설계와 시연은 2~4일, 백업·PITR 구성과 복구 훈련은 1~3일. 가격 참고선: 위시켓 백엔드 프리랜서 월 평균 570.3만 원(2025 상반기 데이터, 2025-09-04 게시)을 영업일 20일로 단순 환산하면 일 약 28.5만 원이고, 크몽 백엔드 가격 가이드는 5만 원~140만 원 이상에 평균 46만 원(2025-09-17)입니다. 이 값들은 시장 참고치일 뿐이며 본인의 경력과 책임 범위, 인수 조건의 엄격함으로 조정합니다.`,
    `납품물은 코드가 아니라 증거와 재현 가능성입니다. 튜닝 보고서(쿼리별 전후 EXPLAIN 원문, 중앙값, 인덱스 크기와 쓰기 비용), 최신 ERD와 인덱스 목록(각 인덱스가 존재하는 이유), 마이그레이션 스크립트와 배포 순서(expand/contract 단계, lock_timeout, 롤백이 아니라 roll forward 계획), 런북("느릴 때", "락 대기", "디스크 증가", "연결 고갈"), 모니터링 쿼리와 알림 규칙(연결 수, 장기 트랜잭션, dead tuple 비율, 복제 지연, 디스크, 아카이브 실패), 복구 훈련 기록(RTO와 RPO), 남은 위험 목록을 포함합니다.`,
    `인수 기준은 숫자로 합의합니다. 예: 주문 목록 p95 300ms 이하(같은 트래픽), 동시 1,000건 재고 테스트에서 오버셀 0, 배포 중 DDL 락 대기 3초 이하와 5xx 0, 7일간 연결 고갈 오류 0, 핵심 테이블 dead tuple 비율 10% 미만, PITR 복구 시간 기록. "빨라졌다"는 말은 인수 기준이 아닙니다. 측정 조건(데이터 규모, 동시성, 측정 도구)을 계약서나 작업 범위 문서에 함께 적어 둡니다.`,
    `전형적인 함정: 운영 DB에서 UPDATE·DELETE에 그대로 EXPLAIN ANALYZE를 실행함, 운영에서 일반 CREATE INDEX로 쓰기를 막음, 느릴 때마다 인덱스를 추가해 쓰기 성능을 망침, 개발 데이터량으로만 마이그레이션을 테스트함, 격리 수준만 올리고 재시도를 구현하지 않음, 한 번에 여러 설정을 바꿔 원인을 모르게 됨, 과거 오염 데이터(음수 재고, 중복 행) 정정을 범위에 말없이 포함함, 고객 DB 덤프를 마스킹 없이 개인 노트북에 보관함, 작업이 끝났는데 계정과 키를 회수하지 않음. 전역 설정(work_mem, enable_* 플래그, autovacuum 설정) 변경은 반드시 측정으로 정당화합니다.`,
    `보안·계약: 고객 DB 접근은 서면으로 범위, 기간, 계정(읽기 전용 우선)을 합의하고 작업 종료 후 계정과 키를 회수합니다. 개인정보가 든 운영 데이터는 마스킹본이나 합성 데이터로 작업하고 보고서에는 개인정보를 싣지 않습니다. 개정 개인정보 보호법이 2026-09-11부터 시행된다는 점은 고객의 법무 담당에게 확인을 요청하고, 본인이 법률 자문을 하지 않는다고 범위에 적습니다. 앱 계정(DML)과 마이그레이션 계정(DDL)의 분리, TLS, 백업 파일의 암호화와 보관 위치도 점검 항목에 넣습니다. 이 모듈의 범위는 방어적 점검과 운영 개선입니다.`,
    `관리형 DB와 지원 종료: RDS 같은 관리형 서비스에서는 superuser 권한, 일부 확장, 파일 시스템 접근이 막혀 있고 파라미터 변경에 재시작이 필요한 경우가 있어 약속한 작업이 불가능할 수 있으니 계약 전에 확인합니다. 백업 보존 기간과 PITR 설정도 서비스 설정에서 확인하고 한 번은 실제로 복원해 봅니다. PostgreSQL 메이저 버전은 5년 지원이라 14는 2026-11-12, 15는 2027-11-11에 종료됩니다(2026-11 확인). 업그레이드는 리허설(스테이징에서 pg_upgrade 또는 관리형 서비스의 업그레이드 절차)과 점검 시간 합의가 필요한 별도 작업이므로 진단 견적과 분리해 제안하고, 지원 기간과 대응 범위(영업시간 대응인지, 24시간 대기인지)는 문서로 정합니다. pgvector 같은 벡터 검색 확장, 샤딩, 멀티리전 설계는 이 모듈의 범위 밖이므로 별도 학습과 견적으로 분리합니다.`
  ]
};
