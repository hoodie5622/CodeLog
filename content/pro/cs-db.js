(window.PRO_MODULES = window.PRO_MODULES || {})["cs-db"] = {
  id: "cs-db",
  summary: `페이지·인덱스·실행 계획·트랜잭션·WAL 복구·LSM의 내부 동작을 이해해, 느린 쿼리와 격리 수준 이상 현상, 내구성 설정 문제를 증거와 숫자로 진단하고 설계 결정을 고객에게 설명할 수 있다.`,
  hours: 130,
  goals: [
    `페이지·힙·버퍼 풀 구조로 행 크기, 페이지 수, 캐시 적중률이 응답 시간에 미치는 영향을 직접 계산해 설명할 수 있다`,
    `B+트리의 구조, 페이지 분할, 복합 키 순서, 커버링 개념으로 인덱스를 설계하고 기본키 전략(순차 키 대 랜덤 UUID)의 비용을 비교할 수 있다`,
    `EXPLAIN (ANALYZE, BUFFERS) 출력에서 추정 행 수와 실제 행 수의 차이, 스캔·조인(중첩 루프·해시·병합)·정렬 노드의 병목을 읽고 원인을 고칠 수 있다`,
    `dirty read, lost update, phantom, write skew를 재현하고 PostgreSQL과 MySQL(InnoDB)의 격리 수준 구현 차이를 설명할 수 있다`,
    `2PL, MVCC, SSI의 동작과 VACUUM·undo 비용을 설명하고 원자적 UPDATE, 행 락, 낙관적 락, 직렬화 실패 재시도 중 상황에 맞는 패턴을 구현할 수 있다`,
    `WAL, steal/no-force, ARIES 3단계, 체크포인트, fsync 관련 설정으로 크래시 복구 과정과 내구성 보장 범위를 설명하고 장애 주입 테스트로 검증할 수 있다`,
    `LSM 트리와 B-트리의 쓰기·읽기·공간 증폭을 비교하고 워크로드별로 저장 엔진을 고르는 질문 목록을 만들 수 있다`,
    `실제 고객 DB 장애(재고 음수, 중복 결제, 지연 스파이크)를 계층별로 진단해 증거 중심 보고서와 숫자 인수 기준으로 인계할 수 있다`
  ],
  lessons: [
    {
      title: `DBMS의 멘탈 모델: 느린 디스크 위의 빠르고 안전한 공유 상태`,
      body: `데이터베이스를 한 문장으로 정의하면 "느리고 쉽게 죽는 저장 장치 위에, 여러 사용자가 동시에 읽고 써도 빠르고 안전한 공유 상태를 만들어 주는 소프트웨어"입니다. 이 문장에서 DBMS가 푸는 문제 세 가지가 나옵니다. 첫째, 디스크는 메모리보다 훨씬 느리므로 데이터를 **페이지** 단위로 묶어 저장하고 캐시합니다(레슨 2, 3). 둘째, SQL은 "무엇을"만 말하므로 "어떻게"는 시스템이 계획으로 바꿔야 합니다(레슨 4). 셋째, 동시 접근과 장애 속에서도 약속을 지켜야 합니다(레슨 5~7). 레슨 8은 다른 저장 구조(LSM)와 복제의 경계를, 레슨 9는 이 모두를 실제 고객 사례로 묶습니다. 실무 SQL 문법과 쿼리 작성은 be-sql 모듈이 맡고, 이 모듈은 "그 SQL이 엔진 안에서 무슨 일을 일으키는가"에 집중합니다.

### 계층 지도: 증상을 계층에 대응시키기

| 계층 | 하는 일 | 먼저 볼 지표 |
| 옵티마이저 | SQL을 실행 계획으로 변환 | EXPLAIN의 추정 행 수 대 실제 행 수 |
| 실행기 | 연산자 트리를 돌려 행을 만듦 | 노드별 시간과 loops |
| 접근 방법 | 인덱스와 힙에서 행을 찾음 | 읽은 페이지 수(BUFFERS) |
| 트랜잭션·락·MVCC | 동시성과 가시성 | 락 대기, 직렬화 실패, 긴 트랜잭션 |
| 버퍼 풀 | 페이지 캐시 | 적중률, 디스크 읽기 |
| 로그·저장소 | 내구성과 복구 | fsync 지연, 체크포인트 |

"DB가 느려요"라는 의뢰는 이 표의 어느 칸에서 시간이 새는지 찾는 일입니다. 같은 "느림"이라도 계획이 틀린 것(위쪽)과 fsync가 느린 것(아래쪽)은 처방이 전혀 다르고, 처방을 잘못 고르면 인덱스만 계속 추가하는 식의 헛수고가 됩니다.

### 비용의 단위는 CPU 명령이 아니라 페이지

저장 장치는 바이트가 아니라 블록 단위로 읽히고, 메모리와 장치의 시간 차이는 자릿수 단위로 큽니다. 감각용 자릿수만 기억하세요(하드웨어와 클라우드 상품마다 다르므로 정확한 값이 아닙니다). 메모리 접근은 약 100나노초, 로컬 NVMe SSD 읽기는 수십~백 마이크로초, 네트워크로 붙은 블록 스토리지는 그보다 길고 들쭉날쭉합니다. 그래서 옵티마이저의 비용도 "페이지를 몇 장, 어떤 방식으로 읽는가"가 중심입니다. 비용 숫자는 시간이 아니라 임의 단위이고, PostgreSQL은 관례상 순차 페이지 읽기 1회를 1.0으로 잡습니다. 기본값은 순차 페이지 읽기 1.0, 임의 페이지 읽기 4.0, 행 하나 처리 0.01입니다(PostgreSQL 18.6 문서, 2026-11 기준). 인덱스가 만능이 아닌 이유(레슨 3)가 이 숫자 안에 있습니다.

### 왜 OS 파일 캐시에 맡기지 않는가

DBMS가 OS 캐시와 별개로 버퍼 풀을 두는 이유는 두 가지입니다. 하나는 쓰기 순서의 통제입니다. 로그가 데이터 페이지보다 먼저 디스크에 가야 한다는 규칙(WAL, 레슨 7)을 OS 캐시는 모릅니다. 다른 하나는 접근 패턴 지식입니다. DBMS는 "이 쿼리는 테이블 전체를 훑으니 한 번 쓰고 버릴 페이지"라는 사실을 알고 교체 정책에 반영합니다. 대가로 같은 페이지가 DB 버퍼와 OS 캐시에 이중으로 올라갈 수 있고, 엔진마다 직접 I/O 사용 여부가 갈립니다.

### 프로세스 모델과 연결 비용

PostgreSQL은 연결마다 서버 프로세스를 하나 띄우고 MySQL은 연결마다 스레드를 씁니다(Hellerstein 등의 "Architecture of a Database System"이 이런 프로세스 모델의 선택지를 비교합니다). 연결은 메모리와 컨텍스트 전환 비용을 만들기 때문에, 웹 서버 인스턴스를 늘렸더니 연결 수가 폭증해 DB가 먼저 무너지는 일이 흔합니다. 해법은 연결 풀링(PgBouncer 같은 외부 풀러나 애플리케이션 풀)이며, 운영체제 모듈에서 배운 프로세스 비용의 직접 응용입니다.

### 모든 설계는 교환관계

인덱스를 늘리면 읽기는 빨라지고 쓰기는 느려집니다. 커밋마다 fsync하면 안전하지만 지연이 늘고, 격리를 강하게 하면 이상 현상이 줄지만 대기나 재시도가 늘어납니다. 고객은 "옵션 하나만 바꿔서 해결"을 기대하지만 옵션은 대개 한쪽 비용을 다른 쪽으로 옮길 뿐입니다. 전문가의 역할은 어디에 비용을 낼지 숫자로 보여 주고 고객과 합의하는 것입니다.`,
      code: `import sqlite3, time

con = sqlite3.connect(":memory:")
con.execute("create table t(id integer primary key, email text, n integer)")
con.executemany("insert into t(email, n) values (?, ?)",
                ((f"user{i}@example.com", i % 100) for i in range(200000)))
q = "select id from t where email = ?"

def bench():
    t0 = time.perf_counter()
    for i in range(200):
        con.execute(q, (f"user{i * 997}@example.com",)).fetchall()
    return time.perf_counter() - t0

print(con.execute("explain query plan " + q, ("x",)).fetchall())   # SCAN t (테이블 전체를 훑는다)
before = bench()
con.execute("create index ix_t_email on t(email)")
print(con.execute("explain query plan " + q, ("x",)).fetchall())   # SEARCH t USING COVERING INDEX ix_t_email
after = bench()
print(f"200 lookups: {before:.3f}s -> {after:.4f}s")                # 자릿수 단위로 줄어든다 (SQLite 버전별 문구는 다를 수 있음)`,
      codeLang: `python`,
      key: [
        `DBMS의 비용 단위는 페이지다. 행을 몇 개 읽느냐보다 페이지를 몇 장, 순차로 읽느냐 임의로 읽느냐가 시간을 정한다.`,
        `계층(옵티마이저, 실행기, 접근 방법, 트랜잭션, 버퍼 풀, 로그)을 알면 "느림"을 어느 칸의 문제로 나눌지 정할 수 있다.`,
        `DBMS는 쓰기 순서와 교체 정책을 직접 통제하려고 OS 캐시와 별도의 버퍼 풀을 둔다.`,
        `거의 모든 설정은 한쪽 비용을 다른 쪽으로 옮기는 교환관계이므로 측정과 합의가 먼저다.`
      ],
      pitfalls: [
        `증상이 느림이면 일단 인덱스부터 추가한다. 계획 오류, 락 대기, fsync 지연은 인덱스로 해결되지 않고 쓰기만 느려진다.`,
        `웹 서버를 늘리면서 연결 풀 크기를 그대로 곱해 DB 연결 수 한도를 넘긴다. 서버 수 × 풀 크기가 DB가 감당할 연결 수인지 먼저 계산한다.`,
        `개발 PC의 작은 데이터에서 빠르다고 운영도 빠를 것이라 가정한다. 데이터가 메모리에 다 들어가는 순간 디스크 비용이 숨는다.`
      ]
    },
    {
      title: `저장 구조: 슬롯 페이지, 힙, 버퍼 풀과 교체 정책`,
      body: `레슨 1의 "페이지"를 실제 바이트 배치로 내려가 봅니다. 대부분의 행 저장 엔진은 파일을 같은 크기의 페이지 배열로 다룹니다. PostgreSQL의 기본 페이지는 8 kB이고 테이블과 인덱스 모두 이 크기의 페이지 배열입니다(PostgreSQL 18.6 문서, 2026-11 기준).

### 슬롯 페이지: 가변 길이 행을 8 kB에 넣는 방법

페이지는 앞쪽에 24바이트 헤더가 있고, 그 뒤로 4바이트짜리 줄 포인터(오프셋과 길이) 배열이 앞에서부터 자라며, 실제 행은 페이지 끝에서부터 거꾸로 쌓입니다. 둘이 가운데에서 만나면 가득 찬 것입니다. 줄 포인터를 한 겹 두는 이유는 행을 페이지 안에서 옮겨도(조각 모음) 바깥에서 가리키는 주소가 변하지 않게 하려는 것입니다. 행의 주소는 (페이지 번호, 줄 포인터 번호) 쌍이고 PostgreSQL에서는 ‹ctid›로 볼 수 있습니다. 인덱스 항목이 가리키는 값이 바로 이 주소입니다.

### 행 하나의 실제 크기와 페이지 수 계산

PostgreSQL 행(힙 튜플)에는 약 23바이트의 고정 헤더가 붙고 그 안에 insert한 트랜잭션 ID(‹xmin›), delete한 트랜잭션 ID(‹xmax›), 최신 버전을 가리키는 ‹ctid›가 있습니다. 이것이 MVCC의 재료입니다(레슨 6). 예를 들어 ‹bigint›, ‹int›, ‹timestamptz›만 가진 행은 데이터가 20바이트인데 헤더, 정렬 패딩, 줄 포인터를 더하면 대략 50바이트이고 페이지당 150행 안팎이 들어갑니다(정렬 규칙을 반영한 가정치). 1억 행이면 약 64만 페이지, 힙만 약 5 GB입니다. 이 계산 하나로 "인덱스 없이 훑으면 5 GB를 읽는다", "컬럼을 줄이면 얼마나 줄어든다"를 견적할 수 있습니다. 행이 약 2 kB(‹TOAST_TUPLE_THRESHOLD›)를 넘으면 큰 값(긴 텍스트, JSON)부터 압축하거나 별도 TOAST 테이블에 떼어 저장하므로, ‹SELECT *›가 큰 컬럼 때문에 비싸질 수 있습니다(PostgreSQL 18.6 문서, 2026-11 기준).

### 힙 대 클러스터드: 테이블 자체가 인덱스일 때

PostgreSQL은 행을 힙에 두고 인덱스는 별도 구조입니다. 반면 InnoDB(MySQL)는 기본키 순서의 B+트리 자체가 테이블입니다(클러스터드 인덱스). 보조 인덱스는 힙 주소 대신 기본키 값을 들고 있어 보조 인덱스로 찾은 뒤 기본키 트리를 한 번 더 내려갑니다. 따라서 InnoDB에서는 기본키가 길면 모든 보조 인덱스가 함께 커지고, 기본키가 무작위이면 테이블 본체가 무작위 위치에 삽입됩니다. 레슨 3에서 이어집니다.

### 버퍼 풀과 교체 정책

페이지는 버퍼 풀의 프레임에 올라와 읽히고 수정됩니다. 수정된 페이지(dirty)는 바로 디스크에 쓰지 않고 나중에 백그라운드로 내려보내며, 그동안의 안전은 로그가 보장합니다(레슨 7). 풀이 가득 차면 희생 페이지를 골라야 합니다. 단순 LRU의 약점은 큰 순차 스캔이 한 번 쓰고 버릴 페이지로 캐시 전체를 밀어내는 것(캐시 오염)입니다. 그래서 PostgreSQL은 clock-sweep 방식에 큰 순차 스캔용 링 버퍼를 따로 주고, InnoDB는 LRU 목록을 젊은 영역과 오래된 영역으로 나눠 새로 읽은 페이지를 중간에 끼워 넣습니다. 방식은 달라도 목적은 "한 번 훑고 지나갈 페이지가 자주 쓰는 페이지를 쫓아내지 못하게 한다"로 같습니다. PostgreSQL의 ‹shared_buffers› 기본값은 128 MB이고 전용 서버에서는 메모리의 25%가 출발점으로 권장됩니다(PostgreSQL 18.6 문서, 2026-11 기준). 나머지는 OS 캐시가 이중으로 받쳐 줍니다.

### 적중률의 함정

적중률 99%는 좋아 보이지만 계산해 보면 다릅니다. 적중 접근 0.1 마이크로초, 미스 접근 100 마이크로초로 가정하면 평균은 0.99 × 0.1 + 0.01 × 100 = 약 1.1 마이크로초이고, 그중 약 91%가 1%의 미스에서 나옵니다. 그래서 적중률은 "높을수록 좋다"가 아니라 "미스가 어디서 나는가"를 봐야 합니다. 핵심은 작업 집합(자주 쓰는 데이터)이 메모리에 들어가는지입니다. 들어가면 풀을 키우는 것보다 쿼리를 고치는 편이 이득이고, 안 들어가면 메모리를 늘리거나 데이터를 나누는 것이 정공법입니다.`,
      code: `import struct

PAGE, HDR = 8192, 4            # 페이지 크기, 헤더(lower, upper 각 2바이트)

class Page:
    def __init__(self):
        self.buf = bytearray(PAGE)
        struct.pack_into("<HH", self.buf, 0, HDR, PAGE)       # lower=4, upper=8192

    def free(self):
        lower, upper = struct.unpack_from("<HH", self.buf, 0)
        return upper - lower

    def insert(self, rec):
        lower, upper = struct.unpack_from("<HH", self.buf, 0)
        if upper - lower < len(rec) + 4:                      # 레코드 + 줄 포인터(4바이트)
            return None                                       # 가득 참: 호출자가 새 페이지를 할당
        upper -= len(rec)
        self.buf[upper:upper + len(rec)] = rec                # 행은 뒤에서부터 쌓인다
        slot = (lower - HDR) // 4
        struct.pack_into("<HH", self.buf, lower, upper, len(rec))   # 줄 포인터는 앞에서부터 자란다
        struct.pack_into("<HH", self.buf, 0, lower + 4, upper)
        return slot                                           # (페이지 번호, slot) 쌍이 행 주소

    def get(self, slot):
        off, ln = struct.unpack_from("<HH", self.buf, HDR + slot * 4)
        return bytes(self.buf[off:off + ln])

p = Page()
ids = [p.insert(f"row-{i}".encode() * 20) for i in range(100)]
print(ids.count(None), p.free())      # 출력: 33 80  (67행이 들어가고 33행은 다음 페이지로)
print(p.get(0)[:10])                  # 출력: b'row-0row-0'`,
      codeLang: `python`,
      key: [
        `페이지는 앞에서 줄 포인터가, 뒤에서 행이 자라는 슬롯 구조이며 행 주소는 (페이지, 슬롯) 쌍이다. 줄 포인터 덕분에 페이지 안에서 행을 옮겨도 주소가 유지된다.`,
        `행 크기를 알면 페이지 수와 테이블 크기를 견적할 수 있다. 예: 약 50바이트 행 1억 개는 힙 약 5 GB(가정치).`,
        `PostgreSQL은 힙과 별도 인덱스, InnoDB는 기본키 B+트리가 테이블 자체이며 보조 인덱스는 기본키 값을 가진다.`,
        `버퍼 풀 교체 정책의 목적은 대형 순차 스캔이 자주 쓰는 페이지를 쫓아내는 캐시 오염을 막는 것이다.`,
        `캐시 적중률은 평균 지표다. 소수의 미스가 지연 대부분을 차지할 수 있으므로 미스의 원인을 본다.`
      ],
      pitfalls: [
        `컬럼 타입을 크게 잡는다(모든 정수를 bigint, 모든 문자열을 큰 길이로). 행이 커지면 페이지당 행 수가 줄어 모든 스캔과 캐시 비용이 늘어난다.`,
        `‹SELECT *›로 큰 TEXT/JSON 컬럼까지 읽어 온다. 값이 별도 영역에 있어 읽기가 추가로 일어나고 네트워크 전송도 늘어난다.`,
        `shared_buffers를 무조건 최대로 키운다. OS 캐시와 작업 메모리, 연결당 메모리가 쓸 공간이 줄어 오히려 느려지거나 OOM이 난다.`
      ]
    },
    {
      title: `B+트리 인덱스: 구조, 분할, 복합 키, 커버링`,
      body: `인덱스는 "정렬된 사본"입니다. 별도 디스크 공간을 쓰고 원본 행을 가리키며, 항목이 정렬되어 있어 빨리 찾습니다(Use The Index, Luke의 설명과 같은 관점입니다). 거의 모든 관계형 DB의 기본 인덱스는 B+트리이고, 구조만 정확히 알면 인덱스 관련 질문의 대부분이 계산 문제로 바뀝니다.

### 구조: 높이가 낮은 균형 트리와 연결된 리프

내부 노드는 키 범위와 자식 페이지 번호를 담고, 리프 노드는 키와 행 주소(또는 InnoDB에서는 행 자체)를 담으며, 리프끼리는 이중 연결 리스트로 이어집니다. 한 노드가 페이지 하나이므로 한 페이지에 들어가는 항목 수, 즉 분기 수(fan-out)가 높이를 정합니다. 8 kB 페이지에 8바이트 키와 행 주소를 넣으면 수백 개가 들어가므로, 분기 수를 300으로 가정하면 3단계로 2,700만 행, 4단계로 80억 행 이상을 덮습니다. 1억 행 테이블도 높이 4이고, 위쪽 단계는 거의 항상 메모리에 있으므로 점 조회는 디스크 읽기 한두 번입니다. 이것이 "인덱스를 쓰면 로그 시간"의 실제 의미입니다.

### 범위 조회와 정렬이 공짜인 이유

한 번 내려가 시작 리프를 찾은 뒤에는 리프 연결을 따라 옆으로만 가면 됩니다. ‹WHERE created_at BETWEEN ...›도, 인덱스 순서와 같은 ‹ORDER BY›도 별도 정렬 없이 처리됩니다. ‹LIMIT 20›이 붙으면 20개만 읽고 멈춥니다. 반대로 인덱스 순서와 다른 정렬은 전부 읽어 정렬해야 합니다.

### 삽입과 페이지 분할

리프가 가득 찬 곳에 새 항목이 들어오면 페이지가 둘로 쪼개지고 부모에 새 구분 키가 올라가며, 부모가 가득 차면 위로 연쇄됩니다. 루트가 쪼개지면 트리가 한 단계 높아집니다(PostgreSQL 문서의 B-tree 장). 키가 순차 증가하면 항상 맨 오른쪽 리프에만 삽입되어 캐시 친화적이고 페이지가 꽉 찹니다. 키가 무작위(UUIDv4)이면 삽입이 모든 리프에 흩어져서 인덱스 전체가 메모리에 있어야 빠르고, 분할이 잦아 페이지가 덜 차며, 체크포인트 직후 첫 수정이 페이지 전체를 로그에 쓰게 만들어 WAL도 늘어납니다(레슨 7). 시간순으로 정렬되는 UUIDv7(RFC 9562, 48비트 밀리초 타임스탬프)은 이 문제를 줄입니다. 다만 키에서 생성 시각이 드러난다는 점은 보안·개인정보 관점에서 확인해야 합니다.

### 복합 인덱스: 컬럼 순서가 곧 정렬 순서

‹(customer_id, created_at)› 인덱스는 customer_id로 먼저 정렬하고 같은 값끼리 created_at으로 정렬합니다. 따라서 "고객 하나의 최근 주문"은 훌륭하게 처리하지만 created_at만 조건으로 쓰는 쿼리는 이 인덱스를 효율적으로 쓰지 못합니다. 규칙은 등호 조건 컬럼을 앞에, 범위나 정렬 컬럼을 뒤에 두는 것입니다. 한 인덱스가 여러 쿼리를 받치게 하려면 쿼리 목록을 먼저 모으고 접두사 재사용을 설계합니다.

### 커버링과 인덱스 전용 스캔

쿼리가 필요한 컬럼이 모두 인덱스에 있으면 힙을 읽지 않아도 됩니다. PostgreSQL에서는 가시성 맵이 최신이어야 힙 확인을 건너뛸 수 있고, 그 갱신은 VACUUM이 합니다(레슨 6). InnoDB는 보조 인덱스에 기본키가 들어 있어 기본키 컬럼은 공짜로 커버됩니다.

### 인덱스가 도움이 안 되는 때

- 조건에 맞는 행이 전체의 상당 부분이면 인덱스로 임의 페이지를 수없이 읽는 것보다 순차 스캔이 낫습니다. 임의 페이지 비용이 순차의 4배라는 기본 가정이 이 판단을 합니다.
- 컬럼에 함수를 씌우면(‹lower(email)›) 일반 인덱스를 못 씁니다. 표현식 인덱스가 필요합니다.
- 앞쪽 와일드카드(‹LIKE '%abc'›)나 암시적 타입 변환도 인덱스 사용을 막습니다.
- 쓰기 비용: 인덱스 하나마다 삽입·수정·삭제 때 갱신할 구조가 하나 늘어납니다. 사용하지 않는 인덱스는 순수 비용이므로 통계 뷰로 찾아 정리합니다.

해시 인덱스는 동등 비교만 되고 범위와 정렬이 안 되므로 B+트리가 기본값이 되었습니다.`,
      code: `-- 고객별 최근 주문 20건 조회
CREATE TABLE orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id bigint NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  total_cents bigint NOT NULL
);

-- 등호 컬럼(customer_id)을 앞에, 정렬 컬럼(created_at)을 뒤에 둔다
CREATE INDEX orders_cust_created_idx ON orders (customer_id, created_at DESC);

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, created_at, total_cents
FROM orders
WHERE customer_id = 4242
ORDER BY created_at DESC
LIMIT 20;
-- 기대: Index Scan using orders_cust_created_idx, Sort 노드 없음, 읽은 버퍼가 수십 개 이하
-- 반례: WHERE status = 'PAID' 만으로는 선두 컬럼이 없어 이 인덱스를 효율적으로 쓰지 못한다
-- 정리 대상 찾기: SELECT relname, indexrelname, idx_scan FROM pg_stat_user_indexes ORDER BY idx_scan;`,
      codeLang: `sql`,
      key: [
        `B+트리의 높이는 log(분기 수)이다. 분기 300이면 4단계가 80억 행을 덮으므로 점 조회는 사실상 상수 페이지 읽기다.`,
        `리프가 연결 리스트라 범위 조회와 인덱스 순서의 ORDER BY ... LIMIT는 정렬 없이 처리된다.`,
        `복합 인덱스는 컬럼 순서가 정렬 순서다. 등호 조건 컬럼을 앞에, 범위·정렬 컬럼을 뒤에 둔다.`,
        `랜덤 키는 삽입 위치가 흩어져 캐시 미스, 분할, WAL 증가를 만든다. 시간 정렬 키(UUIDv7)나 순차 키가 유리하다.`,
        `인덱스는 읽기를 빠르게 하는 대가로 모든 쓰기를 느리게 하므로 사용하지 않는 인덱스는 비용이다.`
      ],
      pitfalls: [
        `모든 컬럼에 단일 인덱스를 하나씩 만든다. 쿼리는 보통 조건 조합이라 복합 인덱스가 필요하고, 단일 인덱스 여러 개는 쓰기만 느리게 한다.`,
        `선택도가 낮은 컬럼(성별, 상태값 몇 종류)에만 인덱스를 만들고 효과가 없다고 놀란다. 다른 조건과의 복합 또는 부분 인덱스를 검토한다.`,
        `인덱스를 만들었는데 안 쓴다고 강제로 힌트나 설정을 바꾼다. 먼저 통계, 타입 불일치, 컬럼 함수 적용, 선택도를 확인한다.`,
        `운영 테이블에 잠금을 거는 방식으로 인덱스를 생성해 쓰기가 멈춘다. 온라인 생성 옵션(PostgreSQL의 CONCURRENTLY 등)을 쓰고 디스크와 시간을 미리 견적한다. CONCURRENTLY는 테이블을 두 번 훑어 더 오래 걸리고, 트랜잭션 블록 안에서는 못 쓰며, 실패하면 INVALID 인덱스가 남으므로 확인해 정리한다.`
      ]
    },
    {
      title: `질의 실행과 옵티마이저: 계획을 읽는 법`,
      body: `SQL 한 줄이 실행되기까지는 구문 분석, 재작성, 계획 수립, 실행 순서를 거칩니다. 성능 문제의 상당수는 마지막 실행이 아니라 계획 수립에서 이미 결정됩니다. 옵티마이저가 어떤 가정으로 계획을 고르는지 알아야 EXPLAIN을 읽고 고칠 수 있습니다.

### 실행기: 한 행씩 끌어올리는 반복자 모델

계획은 연산자 트리입니다. 각 연산자는 ‹open›, ‹next›, ‹close›를 제공하고, 부모가 ‹next›를 부르면 자식이 행 하나를 돌려주는 방식으로 위에서 아래로 끌어옵니다(반복자 또는 Volcano 모델). 스캔, 필터, 조인처럼 행이 흐르는 연산은 첫 행이 빨리 나오고 ‹LIMIT›이 일찍 멈출 수 있습니다. 반면 정렬이나 해시 조인의 빌드 단계는 입력을 모두 소비한 뒤에야 출력하므로 첫 행까지의 시간(startup cost)이 큽니다. 분석 엔진은 행 대신 열 묶음을 처리하는 벡터화나 코드 생성을 쓰지만 이 모듈의 범위를 넘습니다.

### 조인 알고리즘 세 가지

- 중첩 루프: 바깥 행마다 안쪽을 탐색합니다. 안쪽에 인덱스가 있고 바깥이 작으면 최고이고, 양쪽이 크고 인덱스가 없으면 곱 연산이라 재앙입니다.
- 해시 조인: 작은 쪽으로 해시 테이블을 만들고(빌드) 큰 쪽을 흘리며 찾습니다(프로브). 등호 조인에서 대량 처리에 강하지만 메모리에 의존합니다. PostgreSQL의 ‹work_mem› 기본값은 4 MB이고 해시에는 ‹hash_mem_multiplier›(기본 2.0)가 곱해집니다(PostgreSQL 18.6 문서, 2026-11 기준). 넘치면 디스크로 나눠 처리해 느려집니다.
- 병합 조인: 두 입력이 조인 키로 정렬되어 있으면 한 번씩만 훑습니다. 인덱스 순서나 앞단 정렬을 이용합니다.

### 외부 정렬

정렬 대상이 메모리를 넘으면 메모리 크기만큼 정렬된 구간(run)을 디스크에 쓰고 여러 run을 병합합니다. EXPLAIN ANALYZE의 ‹Sort Method: external merge  Disk: ...›가 이 경우입니다. ‹Sort Method: quicksort  Memory: ...›면 메모리 안에서 끝난 것입니다.

### 비용 모델과 통계: 옵티마이저는 추정으로 산다

옵티마이저는 후보 계획마다 비용을 계산해 가장 싼 것을 고릅니다. 비용 = 읽을 페이지 수 × 페이지 비용 + 처리할 행 수 × 행 비용 같은 식이고, 행 수는 통계에서 나옵니다. 통계는 컬럼별 고유 값 수, 자주 나오는 값, 히스토그램이며 ANALYZE가 표본으로 만듭니다(‹default_statistics_target› 기본 100). "조건의 선택도 × 전체 행 수"가 추정 행 수이고, 이 추정이 틀리면 조인 방식도 순서도 틀어집니다. 대표 원인은 대량 적재나 삭제 뒤 통계 갱신 누락, 서로 상관된 컬럼(도시와 우편번호)을 독립으로 가정하는 오류, 표현식이나 함수 결과에는 통계가 없다는 점입니다.

### EXPLAIN 읽기 규칙

1. ‹EXPLAIN›은 실행하지 않고 추정만 보여 주고, ‹EXPLAIN ANALYZE›는 실제로 실행해 실제 시간과 행 수를 붙입니다. INSERT·UPDATE·DELETE에 쓰면 정말 변경되므로 ‹BEGIN›과 ‹ROLLBACK›으로 감쌉니다.
2. 비용 숫자는 밀리초가 아닙니다. 추정 행 수와 실제 행 수가 크게(10배 이상) 어긋나는 첫 노드를 찾는 것이 핵심입니다.
3. 실제 시간은 ‹loops›를 곱해야 총합이 됩니다. 중첩 루프 안쪽 노드가 작아 보여도 수만 번 돌 수 있습니다.
4. ‹BUFFERS›로 읽은 페이지 수(캐시 적중과 읽기)를 보면 I/O 원인을 확인할 수 있습니다.
5. ‹LIMIT›이 있으면 노드가 일찍 멈추므로 추정 대비 실제가 적은 것이 오류가 아닙니다.

### 실패 모드

통계가 낡았을 때, 준비된 문장이 일반 계획으로 굳어 특정 값에서 느릴 때, 커다란 ‹OFFSET›으로 버릴 행까지 읽을 때가 흔합니다. 계획 고정이나 ‹enable_*› 설정은 진단용 도구일 뿐 운영 해법이 아닙니다.`,
      code: `import random, time

def nested_loop(outer, inner, ok, ik):
    return [(o, i) for o in outer for i in inner if o[ok] == i[ik]]      # 비교 횟수 = |outer| x |inner|

def hash_join(build, probe, bk, pk):
    table = {}
    for b in build:                                    # 빌드: 작은 쪽 전체를 먼저 소비 (블로킹 단계)
        table.setdefault(b[bk], []).append(b)
    return [(b, p) for p in probe for b in table.get(p[pk], [])]        # 프로브: 큰 쪽을 흘려보내며 탐색

customers = [(i, f"c{i}") for i in range(2000)]
orders = [(j, random.randrange(2000), j % 7) for j in range(20000)]

t = time.perf_counter(); a = nested_loop(orders, customers, 1, 0); t1 = time.perf_counter() - t
t = time.perf_counter(); b = hash_join(customers, orders, 0, 1); t2 = time.perf_counter() - t
print(len(a) == len(b) == 20000, f"nested/hash = {t1 / t2:.0f}x")
# 비교 4천만 회 대 해시 삽입 2천 회 + 조회 2만 회: 보통 수백 배 차이(환경마다 다름). 인덱스가 있으면 중첩 루프도 N x log 로 내려온다.`,
      codeLang: `python`,
      key: [
        `실행기는 반복자 모델로 행을 위로 끌어올리며, 정렬·해시 빌드는 입력을 모두 소비해야 출력하는 블로킹 연산이다.`,
        `조인 3종의 선택 기준: 중첩 루프는 작은 바깥 + 인덱스, 해시는 대량 등호 조인(메모리 의존), 병합은 정렬된 입력.`,
        `옵티마이저는 통계로 추정한 행 수와 비용 단위로 계획을 고른다. 추정이 틀리면 계획이 틀린다.`,
        `EXPLAIN 판독의 첫 순서는 추정 행 수와 실제 행 수가 크게 어긋나는 첫 노드를 찾는 것이다.`,
        `EXPLAIN ANALYZE는 문장을 실제로 실행한다. 변경 쿼리는 트랜잭션으로 감싸 롤백한다.`
      ],
      pitfalls: [
        `비용 숫자를 시간으로 읽고 비용이 낮은 계획이 빠르다고 단정한다. 비용 단위는 임의 단위이며 실제 시간과 행 수를 비교한다.`,
        `운영 DB의 DELETE나 UPDATE에 그냥 EXPLAIN ANALYZE를 실행해 데이터를 바꿔 버린다.`,
        `작은 개발 데이터의 계획을 운영에 일반화한다. 테이블이 작으면 순차 스캔이 합리적이라 인덱스를 안 쓰는 것이 정상이다.`,
        `느린 쿼리에 즉시 enable_seqscan=off 같은 설정을 영구 적용한다. 통계와 인덱스를 고치지 않으면 다른 쿼리가 망가진다.`
      ]
    },
    {
      title: `트랜잭션과 격리 수준: 이상 현상으로 말하기`,
      body: `트랜잭션은 여러 읽기와 쓰기를 하나의 논리적 작업으로 묶는 단위이고, ACID는 네 가지 약속으로 분해됩니다. 원자성은 중간에 실패하면 전부 없던 일로 되돌리는 것으로 undo가 맡습니다. 지속성은 커밋이 확인된 뒤에는 크래시가 나도 남는 것으로 로그가 맡습니다(레슨 7). 격리는 동시에 실행돼도 서로 간섭하지 않는 것처럼 보이게 하는 것으로 이 레슨과 다음 레슨의 주제입니다. 일관성은 DB 혼자 지키는 성질이 아니라 "잔액은 음수가 아니다" 같은 애플리케이션 불변식을 트랜잭션이 깨지 않는다는 약속이어서, DB는 제약 조건으로 거들 뿐입니다.

### 완벽한 격리는 비싸다

직렬 실행과 같은 결과를 보장하는 격리는 대기나 중단을 부릅니다. 그래서 DB는 약한 격리 수준을 여러 개 제공하고, 수준은 "어떤 이상 현상을 허용하는가"로 정의됩니다. 수준 이름을 외우지 말고 이상 현상으로 말하세요.

### 이상 현상 카탈로그

- 더티 리드: 커밋되지 않은 값을 읽습니다.
- 반복 불가능 읽기: 같은 행을 두 번 읽었는데 사이에 다른 트랜잭션이 커밋해 값이 다릅니다.
- 팬텀: 같은 조건으로 두 번 조회했는데 행 집합이 달라집니다.
- 갱신 손실(lost update): 둘 다 값을 읽고 각자 계산해 쓰면 한쪽 결과가 덮어써져 사라집니다. 잔액 100에 +10 요청 둘이 겹치면 120이 아니라 110이 됩니다.
- 읽기 왜곡(read skew): 서로 관련된 두 행을 읽는 사이 다른 트랜잭션이 둘을 바꿔 앞뒤가 안 맞는 조합을 봅니다.
- 쓰기 왜곡(write skew): 두 트랜잭션이 겹치는 데이터를 읽고 서로 다른 행을 씁니다. 각자는 규칙을 지켰는데 합치면 깨집니다. 당직 의사 2명 중 "2명 이상이면 휴가 가능" 규칙을 확인한 두 의사가 동시에 자기 행만 바꾸면 당직이 0명이 됩니다. 쓰는 행이 달라서 쓰기 충돌 검사로는 안 잡힙니다.

### ANSI 정의의 한계와 스냅샷 격리

SQL-92는 격리 수준을 더티 리드, 반복 불가능 읽기, 팬텀 세 현상으로 정의했습니다. Berenson 등의 1995년 논문("A Critique of ANSI SQL Isolation Levels")은 이 정의가 모호하고 락 기반 구현을 포함한 실제 수준을 충분히 가르지 못한다고 지적하고, 새 현상을 추가하며 **스냅샷 격리(SI)**를 정의했습니다. SI는 트랜잭션 시작 시점의 스냅샷만 읽으므로 읽기가 쓰기를 막지 않고, 같은 행을 동시에 쓰면 나중에 커밋하려는 쪽이 중단됩니다. 그러나 위의 write skew는 허용합니다. 이 때문에 "Repeatable Read이니 안전"이라는 직관이 위험합니다.

### 같은 이름, 다른 실체

| 수준 | PostgreSQL 18 | InnoDB (MySQL 8.4) |
| 기본값 | Read Committed | Repeatable Read |
| Read Uncommitted | Read Committed와 동일 | 더티 리드 가능 |
| Repeatable Read | 스냅샷 격리(팬텀 없음, write skew 가능) | 일반 읽기는 스냅샷, 잠금 읽기·UPDATE는 갭·넥스트키 락 |
| Serializable | SSI(충돌 시 40001) | RR 기반, autocommit이 꺼져 있으면 일반 SELECT를 공유 락 읽기로 변환 |

(각 제품 공식 문서 기준, 2026-11 기준 PostgreSQL 18.6, MySQL 8.4.) DB를 옮기거나 ORM 기본 설정을 믿을 때 이 표가 버그의 출처가 됩니다.

### 일관성 모델 지도

Jepsen의 지도(2026-11 접속)에서 여러 객체를 다루는 쪽은 strict serializable이 최상위이고, 그 바로 아래 serializable 밑에 repeatable read와 snapshot isolation이 서로 포함 관계 없이 놓입니다(SI는 write skew를 허용하고, 형식 정의상의 RR은 predicate 읽기에서 일부 이상을 허용합니다). 둘 다 그 아래 read committed로 이어집니다. 단일 객체 쪽은 linearizable, sequential, causal 순입니다. PostgreSQL의 Repeatable Read는 이 지도의 repeatable read가 아니라 snapshot isolation에 해당합니다. 분할 상황에서도 항상 응답 가능한 모델이 무엇인지(가용성 분류)는 같은 지도와 Bailis 등의 HAT 논문(VLDB 2014)이 정리하며, 분산 시스템 후속 모듈의 주제입니다. **직렬성(serializable)**은 결과가 어떤 직렬 순서와 같으면 되고 실시간 순서는 요구하지 않습니다. **선형성(linearizable)**은 단일 객체 연산이 호출과 응답 사이 한 순간에 일어난 것처럼 보이는 성질입니다. 둘을 모두 만족하는 것이 strict serializable입니다. 복제본이나 캐시에서 읽을 때 "방금 쓴 값이 안 보일 수 있는가"를 따지는 데 이 어휘가 필요합니다.

### 선택 원칙

기본 수준에서 시작해 불변식 목록을 만들고, 불변식마다 지키는 방법(제약 조건, 원자적 UPDATE, 행 락, Serializable)을 정합니다. 상위 격리는 재시도를 전제로 합니다.`,
      code: `-- 준비: 당직 규칙 "항상 1명 이상 당직"
CREATE TABLE oncall (doctor text PRIMARY KEY, on_duty boolean NOT NULL);
INSERT INTO oncall VALUES ('kim', true), ('lee', true);

-- 세션 A                                       -- 세션 B
BEGIN ISOLATION LEVEL REPEATABLE READ;          BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM oncall WHERE on_duty;      SELECT count(*) FROM oncall WHERE on_duty;   -- 둘 다 2를 본다
UPDATE oncall SET on_duty = false               UPDATE oncall SET on_duty = false
 WHERE doctor = 'kim';                           WHERE doctor = 'lee';                       -- 서로 다른 행이라 충돌 없음
COMMIT;                                         COMMIT;                                       -- 둘 다 성공: 당직 0명 (write skew)

-- 같은 순서를 SERIALIZABLE로 실행하면 한쪽에서 SQLSTATE 40001 오류가 나고 그 트랜잭션을 재시도해야 한다.
-- 오류 문구: could not serialize access due to read/write dependencies among transactions`,
      codeLang: `sql`,
      key: [
        `ACID의 C는 애플리케이션 불변식이다. DB는 제약 조건과 격리로 지킬 수 있게 도울 뿐이다.`,
        `격리 수준은 이름이 아니라 허용하는 이상 현상(lost update, write skew, phantom 등)으로 이해한다.`,
        `스냅샷 격리는 읽기가 쓰기를 막지 않지만 write skew를 허용한다. PostgreSQL의 Repeatable Read가 이것이다.`,
        `PostgreSQL은 가장 약한 수준이 사실상 Read Committed와 같고 Repeatable Read는 스냅샷 격리, Serializable은 SSI이다. InnoDB는 기본이 Repeatable Read이며 잠금 읽기에 갭 락을 쓴다.`,
        `직렬성은 실시간 순서를 요구하지 않고 선형성은 단일 객체의 실시간 순서다. 둘 다면 strict serializable이다.`
      ],
      pitfalls: [
        `Repeatable Read면 동시성 버그가 없다고 믿는다. SI 계열에서도 서로 다른 행을 쓰는 write skew는 막지 못한다.`,
        `Read Committed에서 SELECT로 읽은 값을 애플리케이션에서 계산해 UPDATE한다. 두 요청이 겹치면 lost update가 난다.`,
        `트랜잭션 안에서 외부 API 호출이나 사용자 입력을 기다린다. 락과 스냅샷을 오래 쥐어 대기와 정리 지연을 만든다.`,
        `MySQL에서 검증한 로직을 PostgreSQL로 옮기며 격리 수준 이름이 같다는 이유로 동작도 같다고 가정한다.`
      ]
    },
    {
      title: `동시성 제어의 구현: 락, MVCC, SSI와 애플리케이션 패턴`,
      body: `격리 수준이 "무엇을 약속하는가"라면 이 레슨은 "어떻게 지키는가"와 "코드에서 어떻게 쓰는가"입니다. 구현 방식이 곧 비용(대기, 정리, 재시도)의 모양을 정합니다.

### 락 기반: 2PL과 데드락

2단계 락(2PL)은 락을 얻기만 하는 구간과 풀기만 하는 구간으로 나누고, 엄격한 변형은 커밋 때까지 쥐어 직렬 가능성을 보장합니다. 읽기와 쓰기가 서로 막으므로 대기가 늘고 서로를 기다리는 순환(데드락)이 생깁니다. PostgreSQL은 락을 기다린 지 ‹deadlock_timeout›(기본 1초)이 지나면 대기 그래프를 검사해 한 트랜잭션을 중단시킵니다(SQLSTATE 40P01, 2026-11 기준 PostgreSQL 18.6 문서). 해법은 모든 코드가 같은 순서로 락을 잡고, 중단된 트랜잭션을 재시도하는 것입니다. 락 대신 커밋 때 충돌을 검증하는 낙관적 동시성 제어(OCC)나 타임스탬프 순서 방식도 있고, 아래 3번 패턴이 애플리케이션 계층의 같은 아이디어입니다. PostgreSQL의 행 락(‹FOR UPDATE›, ‹FOR NO KEY UPDATE›, ‹FOR SHARE›, ‹FOR KEY SHARE›)은 쓰는 쪽과 잠그는 쪽만 막고 일반 읽기는 막지 않습니다.

### MVCC: 버전을 쌓아 읽기와 쓰기를 분리

PostgreSQL은 UPDATE를 "옛 버전에 xmax를 찍고 새 버전을 힙에 추가"로 처리하고, 각 쿼리나 트랜잭션은 스냅샷으로 어느 버전이 보이는지 판단합니다. 공식 문서의 표현대로 읽기는 쓰기를 막지 않고 쓰기는 읽기를 막지 않습니다. 대가는 죽은 버전의 청소입니다. VACUUM이 아무도 볼 수 없게 된 버전을 정리하고 그 공간을 재사용합니다. 스냅샷을 쥔 채 오래 열린 트랜잭션(Repeatable Read 트랜잭션이나 쓰기를 한 트랜잭션)이 있으면 옛 버전을 지울 수 없어 테이블과 인덱스가 부풀고(bloat), 트랜잭션 ID는 32비트라 약 20억 개 뒤에는 오래된 행이 보이지 않게 되는 래핑어라운드를 피하려고 주기적으로 동결해야 합니다. 강제 동결 기준(‹autovacuum_freeze_max_age›) 기본은 2억입니다. InnoDB는 행을 제자리에서 고치고 옛 버전은 undo 로그에서 재구성합니다. 긴 트랜잭션이 있으면 undo가 쌓이고 정리(purge)가 밀립니다. 형태는 다르지만 "오래 열린 트랜잭션이 정리를 막는다"는 운영 교훈은 같습니다.

### InnoDB의 갭 락과 넥스트키 락

InnoDB의 Repeatable Read에서 범위 조건의 잠금 읽기와 UPDATE는 조회한 인덱스 범위의 틈새까지 잠가 팬텀 삽입을 막습니다. 안전한 대신 삽입이 대기하고 데드락이 늘어납니다. Read Committed에서는 갭 락을 쓰지 않아(외래 키·중복 키 검사 제외) 대기가 줄지만 팬텀이 가능합니다(MySQL 8.4 문서).

### SSI: 스냅샷에 충돌 감지를 더한 직렬성

PostgreSQL의 Serializable은 스냅샷 격리 위에서 읽기-쓰기 의존성을 추적해, 직렬 순서로 설명할 수 없는 위험한 구조가 생기면 한 트랜잭션을 중단합니다. 추적용 술어 락은 아무도 막지 않아 대기와 데드락은 없지만 오탐으로 인한 중단은 있을 수 있으므로 40001 재시도가 필수입니다(문서도 같은 요구를 합니다).

### 코드에서 쓰는 다섯 가지 패턴

1. 원자적 UPDATE 한 문장: ‹UPDATE stock SET qty = qty - 1 WHERE sku = ? AND qty >= 1›. 영향 행이 0이면 재고 부족입니다. 읽고 계산해 쓰는 대신 DB에 계산을 맡기는 가장 싸고 강한 방법입니다.
2. 비관적 락: ‹SELECT ... FOR UPDATE›. 충돌이 잦고 임계구역이 짧을 때.
3. 낙관적 락: 버전 컬럼을 두고 ‹UPDATE ... WHERE id = ? AND version = ?›. 영향 행이 0이면 충돌이므로 다시 읽습니다. 충돌이 드문 긴 편집 흐름에 맞습니다.
4. Serializable과 재시도 루프: 불변식이 여러 행에 걸칠 때. 트랜잭션 전체를 처음부터 다시 실행하고 외부 부작용을 안에 넣지 않습니다.
5. 작업 큐: ‹FOR UPDATE SKIP LOCKED›로 워커들이 서로 다른 행을 가져가게 합니다.

### 문서의 보장과 실제 구현은 다를 수 있다

Jepsen은 PostgreSQL 12.3의 Serializable에서 허용되지 않아야 할 이상 현상(G2-item)을 관찰했고(2020-06-12 보고), Amazon RDS for PostgreSQL Multi-AZ 클러스터에서 스냅샷 격리를 위반하는 Long Fork를 관찰했으며(2025-04-29 보고, 레슨 8), MariaDB Galera 12.1.2에서는 장애 없이도 lost update와 오래된 읽기를 보고했습니다(2026-03-16). 교훈은 제품을 의심하라는 것이 아니라, 돈이 걸린 불변식은 제약 조건과 테스트로 이중화하고 읽기 복제본의 값으로 쓰기를 결정하지 말라는 것입니다.`,
      code: `import random, time
import psycopg
from psycopg import errors

RETRYABLE = (errors.SerializationFailure, errors.DeadlockDetected)    # SQLSTATE 40001, 40P01

def run_tx(dsn, work, max_tries=5):
    for attempt in range(1, max_tries + 1):
        try:
            with psycopg.connect(dsn) as conn:           # with 블록: 정상 종료 시 COMMIT, 예외 시 ROLLBACK
                conn.isolation_level = psycopg.IsolationLevel.SERIALIZABLE
                return work(conn)                        # 트랜잭션 전체를 매 시도마다 처음부터 실행
        except RETRYABLE:
            if attempt == max_tries:
                raise
            time.sleep(random.uniform(0, 0.05 * 2 ** attempt))    # 지터가 있는 지수 백오프

def transfer(conn, src, dst, amount):
    (bal,) = conn.execute("select balance from accounts where id = %s", (src,)).fetchone()
    if bal < amount:
        raise ValueError("insufficient funds")           # 비즈니스 오류는 재시도하지 않는다
    conn.execute("update accounts set balance = balance - %s where id = %s", (amount, src))
    conn.execute("update accounts set balance = balance + %s where id = %s", (amount, dst))

# run_tx(DSN, lambda c: transfer(c, 1, 2, 500))
# 주의: work 안에서 이메일 발송이나 결제 API 호출 같은 외부 부작용을 일으키면 재시도 때 중복 실행된다.`,
      codeLang: `python`,
      key: [
        `2PL은 읽기와 쓰기가 서로 막고 데드락이 생기며, MVCC는 버전을 쌓아 읽기와 쓰기를 분리하는 대신 청소 비용을 낸다.`,
        `PostgreSQL은 새 버전을 힙에 추가하고 VACUUM이 청소한다. 오래 열린 트랜잭션은 청소를 막아 bloat와 래핑어라운드 위험을 키운다. InnoDB는 undo 로그로 옛 버전을 재구성한다.`,
        `InnoDB의 Repeatable Read 잠금 읽기는 갭 락을 쓰고 Read Committed는 쓰지 않는다.`,
        `Serializable(SSI)은 대기 없이 충돌을 감지해 중단하므로 40001 재시도 루프가 필수다.`,
        `패턴 선택: 원자적 UPDATE가 최우선, 다음 행 락·낙관적 락, 다행 불변식은 Serializable+재시도, 큐는 SKIP LOCKED.`
      ],
      pitfalls: [
        `재시도 루프에서 실패한 문장만 다시 실행한다. 트랜잭션은 반드시 처음부터 전체를 다시 실행해야 한다.`,
        `재시도 대상이 아닌 비즈니스 오류(잔액 부족)와 직렬화 실패를 구분하지 않고 모든 예외를 재시도한다.`,
        `행 락을 잡는 순서가 코드 경로마다 달라 데드락이 간헐적으로 난다. 잠글 대상을 기본키 순으로 정렬해 잡는다.`,
        `긴 리포트 쿼리나 열어 둔 트랜잭션이 정리를 막는 것을 모르고 디스크 증가만 쫓는다. 가장 오래된 트랜잭션 시작 시각을 모니터링한다.`
      ]
    },
    {
      title: `로깅과 복구: WAL, ARIES, 체크포인트, 내구성 설정`,
      body: `어려운 점은 크래시 때 디스크에 "반쯤 쓰인 상태"가 남는다는 것입니다. 커밋 전의 더티 페이지가 이미 디스크에 갔을 수도 있고(되돌려야 함), 커밋 후의 변경이 아직 메모리에만 있을 수도 있습니다(다시 해야 함). 로그 규칙 하나가 두 문제를 함께 풉니다.

### 버퍼 정책: steal과 force

- steal: 커밋 전 트랜잭션이 바꾼 더티 페이지도 디스크에 내릴 수 있습니다. 버퍼 풀을 자유롭게 쓰는 대신 크래시 후 **되돌리기(undo)**가 필요합니다.
- no-force: 커밋할 때 그 트랜잭션이 바꾼 페이지를 디스크에 강제로 쓰지 않습니다. 커밋이 빠른 대신 크래시 후 **다시 하기(redo)**가 필요합니다.

가장 빠른 조합인 steal/no-force를 택한 시스템(ARIES 계열)은 undo와 redo를 모두 로그로 해결합니다. PostgreSQL도 같은 정책이지만 MVCC가 옛 버전을 남기므로 크래시 뒤에는 undo 없이 REDO(roll-forward)만 하고, 커밋 못 한 버전은 보이지 않게 될 뿐입니다.

### WAL 규칙

1. 데이터 페이지를 디스크에 쓰기 전에, 그 페이지에 영향을 준 로그 레코드가 먼저 영속화되어야 합니다.
2. 커밋은 커밋 레코드까지 로그가 영속화된 뒤에 성공으로 응답합니다.

로그는 순차 append라 싸고 데이터 페이지는 천천히 내려도 됩니다. PostgreSQL 문서도 커밋에는 WAL flush만 필요하고 작은 동시 트랜잭션 여러 개가 WAL fsync 한 번으로 함께 커밋될 수 있다고 설명합니다(그룹 커밋).

### ARIES의 세 단계

각 로그 레코드는 순번(LSN)을 가지고, 페이지는 마지막으로 반영된 LSN(pageLSN)을 기록합니다. 복구는 이렇게 진행됩니다.

1. 분석: 마지막 체크포인트부터 로그를 훑어 크래시 시점의 더티 페이지 집합과 아직 끝나지 않은 트랜잭션을 재구성합니다.
2. Redo: 가장 오래된 더티 페이지 시점부터 로그를 순서대로 다시 적용하되 pageLSN이 더 작은 경우에만 적용합니다. 패자가 될 트랜잭션의 변경까지 일단 모두 재현하므로 "역사 반복"이라 부릅니다.
3. Undo: 커밋되지 않은 트랜잭션을 역순으로 되돌립니다. 되돌림 단계마다 보상 로그 레코드(CLR)를 남기고 CLR은 다음에 되돌릴 위치를 담습니다. 복구 중 다시 크래시해도 같은 되돌림을 반복하지 않습니다.

퍼지 체크포인트는 더티 페이지가 다 내려가길 기다리지 않고 더티 페이지 표와 트랜잭션 표만 로그에 남겨 복구 시작점을 당깁니다.

### PostgreSQL에서의 모습

체크포인트는 더티 페이지를 디스크로 내리고 체크포인트 레코드를 남기며, 크래시 복구의 REDO는 마지막 체크포인트가 가리키는 지점에서 시작합니다. 체크포인트는 ‹checkpoint_timeout›(기본 5분)이 지나거나 WAL이 ‹max_wal_size›(기본 1 GB)에 가까워지면 시작하고 ‹checkpoint_completion_target›(기본 0.9)로 쓰기를 분산합니다(PostgreSQL 18.6 문서, 2026-11 기준). 간격을 늘리면 쓰기 부담은 줄지만 복구 시간이 길어집니다. ‹full_page_writes›(기본 켜짐)는 체크포인트 뒤 페이지를 처음 고칠 때 페이지 전체를 WAL에 기록해 반쯤 쓰인 페이지를 복구할 수 있게 하며, 그래서 체크포인트 직후 WAL 양이 튑니다.

### 내구성 설정은 약속의 범위를 정한다

- PostgreSQL ‹fsync›를 끄면 정전이나 OS 크래시에서 복구 불가능한 손상이 생길 수 있습니다. 재생성이 쉬운 데이터가 아니면 운영에서 끄지 않습니다.
- ‹synchronous_commit = off›는 flush를 기다리지 않아 크래시 때 최근 커밋 몇 건을 잃을 수 있지만 손상은 없고 롤백된 것처럼 일관됩니다. 지연 한도는 ‹wal_writer_delay›(기본 200 ms)의 3배이고, ‹SET LOCAL›로 트랜잭션 단위로 바꿀 수 있어 로그성 쓰기만 완화하는 패턴이 가능합니다.
- InnoDB의 ‹innodb_flush_log_at_trx_commit›(MySQL 8.4 문서, 2026-11 기준): 1은 커밋마다 쓰고 flush(기본), 2는 커밋마다 쓰고 약 1초마다 flush, 0은 약 1초마다 쓰고 flush합니다. 문서는 0과 2 모두 크래시 때 flush 전 트랜잭션을 잃을 수 있다고 적습니다(2가 mysqld 단독 종료에는 남는다는 점은 구조에서 온 추론). Jepsen의 MariaDB Galera 12.1.2 보고(2026-03-16)에서는 문서가 권장한 0에서 노드가 거의 동시에 죽을 때 커밋 확인된 쓰기가 사라졌고, 1에서도 크래시·네트워크 분리 때 드물게 손실이 남았습니다.

### PITR과 백업

베이스 백업과 이후 WAL 보관을 재생하면 원하는 시점까지 복구할 수 있습니다. 복제본은 백업이 아닙니다. 잘못된 ‹DELETE›나 ‹DROP›도 그대로 복제됩니다. 복원 연습을 안 했다면 백업이 있다고 말할 수 없고, 목표는 RPO(잃어도 되는 시간)와 RTO(복구 허용 시간)로 합의합니다. ‹kill -9›는 OS 캐시의 write를 지우지 못해 fsync 유무 차이가 안 보이므로 전원 차단·OS 크래시를 흉내 내는 장애 주입으로 시험합니다.`,
      code: `import json, os, zlib

class WalKV:
    def __init__(self, path, durable=True):
        self.path, self.durable, self.data = path, durable, {}
        self._replay()
        self.f = open(path, "ab")                       # 새 파일이면 부모 디렉터리도 fsync해야 파일 존재가 영속화된다(POSIX)

    def _replay(self):
        if not os.path.exists(self.path):
            return
        good = 0
        with open(self.path, "rb") as f:
            for line in f:
                try:
                    crc, payload = line.rstrip(b"\n").split(b" ", 1)
                    if not line.endswith(b"\n") or int(crc) != zlib.crc32(payload):
                        break                           # 찢어진 꼬리 레코드: 여기까지만 유효
                    op = json.loads(payload)
                except ValueError:
                    break
                self.data[op["k"]] = op["v"]            # redo: 로그를 순서대로 재생
                good += len(line)
        os.truncate(self.path, good)                    # 꼬리를 잘라 이후 append가 깨지지 않게 한다

    def put(self, k, v):
        payload = json.dumps({"k": k, "v": v}).encode()
        self.f.write(b"%d " % zlib.crc32(payload) + payload + b"\n")
        self.f.flush()                                  # 사용자 버퍼 -> OS 페이지 캐시 (kill -9 에는 살아남음)
        if self.durable:
            os.fsync(self.f.fileno())                   # OS 페이지 캐시 -> 장치 (정전에도 살아남음)
        self.data[k] = v                                # 로그가 먼저, 메모리 상태는 그다음

    def get(self, k):
        return self.data.get(k)`,
      codeLang: `python`,
      key: [
        `steal/no-force 정책은 빠르지만 undo와 redo가 모두 필요하고 WAL이 둘 다 제공한다.`,
        `WAL 규칙: 페이지보다 로그가 먼저 영속화되고, 커밋 응답은 커밋 레코드의 영속화 뒤에 한다.`,
        `ARIES 복구는 분석, redo(역사 반복), undo 순이고 CLR 덕분에 복구 중 재크래시에도 안전하다.`,
        `fsync 끄기는 손상 위험이고, synchronous_commit off나 innodb_flush_log_at_trx_commit 0·2는 최근 커밋 손실 위험이다. 약속의 범위를 정확히 알고 고른다.`,
        `kill -9 시험은 OS 캐시가 살아 있어 fsync 유무 차이를 보여 주지 못한다. 전원·OS 크래시를 흉내 내는 시험이 필요하다.`
      ],
      pitfalls: [
        `복제본이 있으니 백업은 필요 없다고 판단한다. 논리적 실수(잘못된 DELETE)는 복제본에도 즉시 전파된다.`,
        `성능을 위해 내구성 옵션을 낮춰 두고 고객에게는 말하지 않는다. 잃을 수 있는 데이터의 범위를 문서에 적고 합의한다.`,
        `백업 파일이 생성되는 것만 확인하고 복원 시험을 하지 않는다. 복원 시간(RTO)도 모른 채 장애를 맞는다.`,
        `체크포인트 직후의 WAL·I/O 스파이크를 원인 모른 채 하드웨어 증설로 해결하려 한다. 체크포인트 간격과 로그를 먼저 본다.`
      ]
    },
    {
      title: `LSM 트리와 저장 엔진 선택, 복제의 경계`,
      body: `B+트리는 제자리 갱신으로 읽기를 예측 가능하게 만들지만 쓰기마다 임의 위치의 페이지를 고치고 로그에도 씁니다. 쓰기가 폭주하는 워크로드를 위해 다른 길이 있습니다. 제자리 갱신을 버리고 쓰기를 모아 순차로 내리는 **LSM 트리**입니다.

### LSM 트리의 동작

O'Neil 등의 1996년 논문은 삽입이 많은 인덱스를 메모리 컴포넌트와 디스크 컴포넌트로 나누고 병합(rolling merge)을 일괄 순차 I/O로 처리해 쓰기 비용을 낮추는 구조를 제안했습니다. RocksDB 같은 오늘날 구현은 이렇게 움직입니다.

1. 쓰기는 메모리의 memtable(기본은 skiplist)에 들어가고, 장애에 대비해 순차 append되는 WAL에도 기록됩니다.
2. memtable이 차면 불변이 되어 백그라운드에서 정렬된 SST 파일로 내려갑니다(Level-0). SST는 이후 수정되지 않고, 내려간 뒤에는 해당 WAL을 지울 수 있습니다.
3. 읽기는 memtable, 불변 memtable, Level-0 파일들, 더 깊은 레벨 순으로 찾고, 블룸 필터 같은 보조 구조로 불필요한 파일을 건너뜁니다.
4. 삭제는 바로 지우지 않고 삭제 표시(tombstone)를 쓰며, compaction이 나중에 정리합니다.
5. compaction은 백그라운드에서 SST를 병합 정렬해 겹치는 키를 정리하고 레벨 사이로 옮깁니다.

Bigtable과 Cassandra도 memtable에서 SSTable로 내리는 같은 계열 구조를 씁니다.

### 세 가지 증폭

- 쓰기 증폭: 사용자가 쓴 1바이트가 디스크에 실제로 몇 바이트 쓰이는가(WAL, flush, compaction 재작성 합계).
- 읽기 증폭: 값 하나를 찾으려 확인하는 파일과 블록의 수.
- 공간 증폭: 논리 크기 대비 실제 점유량. 옛 버전과 tombstone이 compaction 전까지 남습니다.

RocksDB의 compaction 스타일이 이 균형을 옮깁니다. level(기본)은 공간 증폭을 낮추고, universal은 쓰기 증폭이 낮지만 읽기·공간 증폭과 임시 공간이 늘며, FIFO는 가장 오래된 파일을 버리므로 캐시성 데이터에 맞습니다(RocksDB 위키, 2026-11 확인). 하나를 줄이면 다른 것이 늘어납니다. 레벨 배수를 10으로 두면 데이터가 한 레벨 내려갈 때 이웃 레벨의 최대 10배 규모와 병합되고, 위키도 leveled compaction의 쓰기 증폭이 흔히 10보다 크다고 적습니다(실제 값은 설정과 워크로드에 달림). compaction이 유입을 못 따라가면 Level-0 파일 수나 대기 중인 compaction 양이 임계값(‹level0_slowdown_writes_trigger›, ‹level0_stop_writes_trigger›, ‹soft_pending_compaction_bytes› 등)을 넘어 엔진이 쓰기를 늦추거나 멈춥니다(write stall).

### B-트리와 LSM을 비교하는 질문 목록

| 질문 | B-트리 쪽 | LSM 쪽 |
| 쓰기 지연의 모양 | 대체로 안정적, 체크포인트·분할에서 스파이크 | 평소 빠르나 compaction이 밀리면 쓰기 지연 |
| 점 조회 | 높이만큼 예측 가능 | 파일 수와 필터 효과에 따라 변동 |
| 범위 조회 | 연결된 리프로 빠름 | 여러 정렬 구간 병합 필요 |
| 공간 | 페이지 여유와 bloat | 중복 버전과 tombstone |
| 트랜잭션·보조 인덱스 | 성숙한 생태계 | 제품마다 다름 |

선택 전에 물을 것: 읽기 대 쓰기 비율, 키가 순차인지 무작위인지, 삭제와 TTL 비중, p99 지연 요구, 데이터 크기 대 메모리 비율, 운영팀이 compaction을 튜닝할 수 있는지. 새 기술이어서 고르는 것이 아니라 이 질문의 답이 고릅니다.

### 열 저장과 분석 워크로드

집계 분석은 소수 컬럼을 많은 행에 걸쳐 읽으므로 컬럼 단위로 저장하고 압축하는 열 저장이 유리합니다. 업무용 OLTP 행 저장과 분석을 한 DB에 억지로 섞으면 둘 다 느려지는 일이 흔하므로 분석은 별도 저장소로 복제·적재하는 설계를 먼저 검토합니다.

### 복제와 분산의 경계

비동기 복제는 복제본이 뒤처질 수 있고 주 노드 장애 때 최근 커밋을 잃을 수 있으며, 동기 복제를 어디까지 기다릴지(수신, 디스크 기록, 적용)는 설정으로 고릅니다. 복제본은 지연뿐 아니라 가시성 순서도 다를 수 있습니다. Jepsen의 Amazon RDS for PostgreSQL 17.4 보고(2025-04-29)는 Multi-AZ 클러스터의 읽기 가능한 보조 노드에서 Long Fork(스냅샷 격리 위반)를 관찰했고, 원인으로 주 노드는 메모리 락 순서, 보조 노드는 WAL 순서로 가시성을 정하는 차이가 설명되었습니다. 그러므로 쓰기 직후의 읽기는 주 노드에서 하고 복제본 값으로 쓰기를 결정하지 않습니다. 샤딩, 2단계 커밋, 합의는 분산 시스템 후속 모듈의 주제이고, NoSQL·벡터 인덱스 같은 대안도 위 질문 목록으로 평가합니다.`,
      code: `import bisect, json, os

class MiniLSM:
    def __init__(self, dirpath, limit=4):
        self.dir, self.limit, self.seq = dirpath, limit, 0
        self.mem, self.ssts = {}, []                # ssts: (파일명, 정렬된 (키, 값) 목록), 오래된 것이 앞
        os.makedirs(dirpath, exist_ok=True)

    def _write(self, run):                          # 정렬된 구간을 새 불변 파일로 내린다 (수정은 하지 않는다)
        name = os.path.join(self.dir, "sst-%04d.json" % self.seq)
        self.seq += 1
        with open(name, "w") as f:
            json.dump(run, f)
        return name

    def put(self, k, v):
        self.mem[k] = v                             # 실제 시스템은 여기서 먼저 WAL에 기록한다
        if len(self.mem) >= self.limit:
            self.flush()

    def flush(self):
        run = sorted(self.mem.items())              # memtable -> 정렬된 SST
        self.ssts.append((self._write(run), run))
        self.mem = {}

    def get(self, k):
        if k in self.mem:
            return self.mem[k]
        for _, run in reversed(self.ssts):          # 최신 SST부터 확인: 읽기 증폭이 생기는 곳
            i = bisect.bisect_left(run, (k,))
            if i < len(run) and run[i][0] == k:
                return run[i][1]
        return None

    def compact(self):
        merged = {}
        for _, run in self.ssts:                    # 오래된 것부터 덮어써서 최신 값만 남긴다
            merged.update(run)
        new, old = sorted(merged.items()), [n for n, _ in self.ssts]
        self.ssts = [(self._write(new), new)]       # 쓰기 증폭: 살아 있는 데이터를 통째로 다시 쓴다
        for name in old:
            os.remove(name)                         # 삭제 표시(tombstone) 처리는 생략한 단순화`,
      codeLang: `python`,
      key: [
        `LSM은 memtable과 WAL에 쓰고, 정렬된 불변 SST로 내리고, 백그라운드 compaction으로 병합한다. 쓰기를 순차 I/O로 바꾸는 구조다.`,
        `쓰기·읽기·공간 증폭 중 하나를 줄이면 다른 것이 늘어난다. compaction 스타일(level, universal, FIFO)이 균형을 옮긴다.`,
        `B-트리는 읽기 예측 가능성과 성숙한 트랜잭션 생태계, LSM은 쓰기 처리량과 compaction 지연이라는 서로 다른 비용을 가진다.`,
        `엔진은 읽기:쓰기 비율, 키 패턴, 삭제·TTL, p99 요구, 데이터 대 메모리 비율, 운영 역량이라는 질문의 답으로 고른다.`,
        `읽기 복제본은 주 노드와 다른 이력을 볼 수 있다. 쓰기 직후 읽기는 주 노드에서 하고 복제본 값으로 쓰기를 결정하지 않는다.`
      ],
      pitfalls: [
        `"쓰기가 많으니 LSM"이라고만 판단하고 범위 조회, 보조 인덱스, 트랜잭션 요구를 확인하지 않는다.`,
        `LSM 제품에서 compaction이 쓰기를 따라가는지 지표(대기 중인 compaction 양, 쓰기 지연 횟수)를 모니터링하지 않아 어느 날 쓰기가 멈춘다.`,
        `대량 삭제만 하면 공간이 즉시 돌아온다고 기대한다. tombstone은 compaction 전까지 남아 공간과 읽기 비용을 오히려 늘릴 수 있다.`,
        `분석 쿼리를 OLTP 주 DB에서 바로 돌린다. 긴 쿼리가 정리를 막고 버퍼 풀을 오염시킨다.`
      ]
    },
    {
      title: `통합 사례: 행사를 앞둔 쇼핑몰 DB 진단과 인계`,
      body: `**상황.** 중소 쇼핑몰이 외주를 맡깁니다. PostgreSQL 주 노드 1대와 읽기 복제본 1대, 주문 테이블은 약 5천만 행입니다. 대형 할인 행사를 3주 앞두고 네 가지 증상이 보고됩니다. (1) 재고가 가끔 음수로 내려간다. (2) 결제 승인 응답이 느릴 때 같은 주문이 두 번 결제된다. (3) 마이페이지 주문 목록이 오후에 느려진다. (4) 매일 새벽 배치 뒤 사이트 전체가 몇 분간 느리다. 고객의 질문은 "DB 사양을 올리면 되나요?"입니다.

### 1단계: 증상을 계층에 대응시키고 읽기 전용으로 증거를 모은다

운영 DB에서는 읽기 전용 계정으로 시작합니다. 레슨 1의 계층 지도를 쓰면 질문이 정리됩니다.

| 증상 | 의심 계층 | 첫 증거 |
| 재고 음수 | 트랜잭션·격리(레슨 5, 6) | 재고 차감 SQL의 형태, 제약 조건 유무 |
| 이중 결제 | 트랜잭션 경계와 재시도(레슨 6) | 멱등 키·유일 제약 유무, 타임아웃 뒤 재시도 로직 |
| 목록 지연 | 옵티마이저·인덱스(레슨 3, 4) | EXPLAIN (ANALYZE, BUFFERS)의 추정 대 실제 행 수 |
| 배치 뒤 지연 | 로그·버퍼·정리(레슨 2, 6, 7) | 체크포인트 빈도, 락 대기, 가장 오래된 트랜잭션, 자동 정리 상태 |

### 2단계: 증상별 원인과 처방

**재고 음수.** 코드가 재고를 SELECT해 애플리케이션에서 검사하고 계산한 값을 UPDATE합니다. Read Committed에서 두 요청이 재고 1을 함께 읽으면 둘 다 통과하는 lost update 형태입니다. 처방은 ‹UPDATE ... SET qty = qty - n WHERE qty >= n›으로 DB에 계산과 검사를 맡기고 영향 행 0이면 재고 부족으로 처리하는 것이며, 안전망으로 ‹CHECK (qty >= 0)›을 둡니다. 단일 행 불변식은 격리 수준을 올리지 않고도 문장 하나로 끝납니다.

**이중 결제.** 승인이 늦으면 클라이언트나 게이트웨이가 재시도하고 서버는 매번 새 주문으로 처리합니다. 처방은 요청마다 클라이언트가 만든 멱등 키를 받아 ‹orders.idem_key›에 유일 제약을 걸고 ‹INSERT ... ON CONFLICT DO NOTHING›으로 먼저 점유하는 것입니다. 외부 결제 API 호출은 DB 트랜잭션 밖에서 상태 전이(결제 중, 승인)로 관리하고, 재시도 루프 안에 외부 부작용을 넣지 않습니다.

**목록 지연.** EXPLAIN에서 5천만 행 순차 스캔 후 필터로 대부분을 버리고 있다면 customer_id 조건과 created_at 정렬에 맞는 복합 인덱스가 없는 것입니다. 처방은 ‹(customer_id, created_at DESC)› 인덱스를 잠금 없는 온라인 방식으로 생성하고, 큰 적재·삭제 뒤 ANALYZE를 확인하며, 큰 ‹OFFSET›을 키 기반 페이지네이션으로 바꾸는 것입니다. "오후에만 느림"이면 작업 집합이 메모리를 넘는지, 복제본 지연인지도 확인합니다.

**배치 뒤 지연.** 새벽 배치가 수천만 행을 UPDATE하면 죽은 버전이 폭증하고, 체크포인트 직후에는 full page writes로 WAL이 급증하며, 뒤따르는 자동 정리와 I/O를 다툽니다. 배치가 하나의 긴 트랜잭션이면 정리까지 막힙니다. 처방은 수만 행 단위로 쪼개 커밋하고, 배치 직후 정리·통계를 확인하며, 체크포인트 로그를 켜서 시각을 맞춰 보는 것입니다. 사양 증설은 이 진단 뒤에 필요한지 결정합니다.

복제본의 값으로 재고를 판단하는 코드가 있다면 그것도 찾아 주 노드로 돌립니다(레슨 8).

### 3단계: 검증과 인수

고치는 것보다 증명이 더 중요합니다. 동시 100요청으로 재고 1개 상품을 주문해 음수 0건, 같은 멱등 키를 10회 보내 주문 1건과 승인 1회, 목록 쿼리 p95의 전후 비교, 배치 중 사이트 p99를 기록합니다. 인수 기준은 숫자로 씁니다(예: 동시성 시험 100회에서 재고 음수 0건, 목록 p95 200 ms 이하는 협의할 가정 목표). 끝으로 복원 연습 결과와 런북을 인계합니다.`,
      code: `CREATE TABLE stock  (sku text PRIMARY KEY, qty integer NOT NULL CHECK (qty >= 0));
CREATE TABLE orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idem_key text NOT NULL UNIQUE,            -- 클라이언트가 만든 멱등 키
  sku text NOT NULL, qty integer NOT NULL
);

BEGIN;
-- 1) 요청을 먼저 점유한다. 이미 처리된 키면 0행이 반환되고 애플리케이션은 여기서 멈춘다(ROLLBACK).
INSERT INTO orders (idem_key, sku, qty) VALUES ('req-7f3a', 'SKU-1', 2)
  ON CONFLICT (idem_key) DO NOTHING RETURNING id;

-- 2) 검사와 차감을 한 문장으로. 영향 행이 0이면 재고 부족이므로 ROLLBACK
UPDATE stock SET qty = qty - 2 WHERE sku = 'SKU-1' AND qty >= 2;
COMMIT;

-- 외부 결제 API 호출은 이 트랜잭션 밖에서 하고, 결과는 별도 상태 전이로 기록한다.`,
      codeLang: `sql`,
      key: [
        `진단은 증상을 계층에 대응시키고 읽기 전용 증거(EXPLAIN, 락 대기, 체크포인트, 긴 트랜잭션)를 모으는 것에서 시작한다.`,
        `단일 행 불변식(재고)은 원자적 UPDATE와 CHECK 제약으로, 중복 요청은 멱등 키와 유일 제약으로 푼다. 격리 수준 상향은 마지막 수단이다.`,
        `배치와 대량 UPDATE는 죽은 버전, WAL 급증, 정리 지연을 만든다. 작은 단위로 커밋하고 정리 상태를 확인한다.`,
        `사양 증설은 진단 뒤의 선택지다. 인수 기준은 재현 가능한 숫자로 합의한다.`
      ],
      pitfalls: [
        `재고 음수를 보고 곧바로 전체를 Serializable로 바꾼다. 재시도 처리 없이 바꾸면 오류율만 오른다.`,
        `결제 API 호출을 DB 트랜잭션 안에 넣어 락을 오래 쥐고, 타임아웃 뒤 재시도로 이중 결제를 만든다.`,
        `느린 목록 쿼리에 인덱스를 추가하고 전후 측정 없이 완료 처리한다. 계획과 읽은 버퍼 수의 전후 비교를 남긴다.`,
        `운영 DB에서 처음부터 EXPLAIN ANALYZE와 인덱스 생성을 시도한다. 읽기 전용 증거 수집과 변경 작업을 분리하고 변경은 점검 창과 롤백 계획과 함께 한다.`
      ]
    }
  ],
  labs: [
    {
      title: `실습 1: PostgreSQL에서 페이지, 인덱스, 실행 계획을 숫자로 해부하기`,
      scenario: `신입 팀원이 "인덱스를 걸면 무조건 빨라진다", "UUID 기본키는 성능 차이가 없다", "EXPLAIN의 비용 숫자가 곧 시간이다"라고 주장합니다. 본인 PC의 PostgreSQL(Docker 또는 설치형, 버전을 기록)에서 100만 행 테이블로 세 주장을 직접 측정해 한 쪽짜리 결과표로 반박하세요. 말이 아니라 명령 출력과 숫자로 설득하는 연습이며 운영 DB가 아니라 본인 로컬 DB에서만 실행합니다.`,
      steps: [
        `먼저 실험 환경을 기록합니다. 서버 버전과 버퍼, 비용, 작업 메모리 설정을 조회하는 SELECT version(), SHOW shared_buffers, SHOW random_page_cost, SHOW work_mem 의 결과를 env.txt 파일에 저장합니다.`,
        `t_seq(id bigint 기본키, customer_id int, status text, created_at timestamptz, payload text 약 100자)를 generate_series로 100만 행 삽입하고 ANALYZE합니다. pg_relation_size('t_seq')를 8192로 나눠 페이지 수를 구하고 행당 평균 바이트를 계산해, 레슨 2 방식의 직접 견적(헤더 약 24 + 컬럼 크기 + 줄 포인터 4)과 비교합니다.`,
        `SELECT ctid, id FROM t_seq LIMIT 5 로 (페이지, 슬롯) 주소를 확인하고, WHERE ctid >= '(0,0)' AND ctid < '(1,0)' 조건의 count(*)로 첫 페이지에 몇 행이 들어 있는지 셉니다.`,
        `customer_id(10만 종류) 조건과 created_at 내림차순 정렬, LIMIT 20 쿼리를 (a) 인덱스 없이 (b) customer_id 단일 인덱스 (c) (customer_id, created_at DESC) 복합 인덱스로 각각 EXPLAIN (ANALYZE, BUFFERS) 실행해 노드 종류, shared hit과 read 합계, 실행 시간을 표로 만듭니다.`,
        `status를 'DONE' 90%, 'NEW' 10% 비율로 채우고 status 인덱스를 만든 뒤 WHERE status = 'DONE' 과 'NEW' 의 계획을 비교합니다. 선택도와 비용 모델(순차 1.0 대 임의 4.0)로 계획이 갈리는 이유를 두세 문장으로 설명합니다.`,
        `t_uuid(id uuid 기본키 default gen_random_uuid(), 나머지 컬럼은 동일)에 같은 100만 행을 넣으면서 삽입 소요 시간, 기본키 인덱스 크기(pg_relation_size), 삽입 전후 pg_current_wal_lsn() 차이(pg_wal_lsn_diff)를 t_seq와 비교합니다.`,
        `통계 실험: 새 테이블에서 ALTER TABLE ... SET (autovacuum_enabled = false)로 자동 정리를 끄고 ANALYZE한 뒤 status 값을 90% 행에서 바꾸는 UPDATE를 실행합니다. ANALYZE 전과 후에 WHERE status = '새 값' 쿼리의 EXPLAIN ANALYZE로 추정 rows와 실제 rows를 각각 기록합니다.`,
        `결과표(주장, 측정값, 해석, 사용한 명령)를 results.md로 정리합니다.`
      ],
      accept: [
        `env.txt에 버전과 설정값이 있고, 측정한 행당 평균 바이트가 직접 계산한 견적과 ±30% 이내이거나 차이의 이유가 적혀 있다.`,
        `customer_id 조회에서 인덱스 없는 계획의 읽은 버퍼 합계가 테이블 페이지 수 근처이고, 복합 인덱스 계획은 Sort 노드 없이 읽은 버퍼 합계가 30 이하임이 표에 있다.`,
        `status의 두 조건에 대해 계획 노드 종류와 읽은 버퍼 수가 비교되어 있고, 갈린 이유 또는 갈리지 않은 이유가 비용 모델로 설명되어 있다.`,
        `t_seq와 t_uuid의 삽입 시간, 인덱스 크기, WAL 증가 바이트가 한 표에 있고, 결과가 예상과 다르면 그 이유(캐시, 체크포인트 시점 등)를 적었다.`,
        `통계 실험에서 ANALYZE 전후의 추정 rows와 실제 rows의 비율이 기록되어 있고, EXPLAIN ANALYZE는 변경 쿼리에 쓰지 않았거나 BEGIN과 ROLLBACK으로 감쌌다.`
      ],
      stretch: `pageinspect 확장의 bt_metap 같은 함수로 기본키 인덱스의 트리 높이(level)를 확인하고, 파이썬으로 시간 정렬 UUID(v7 형식)를 만들어 넣은 t_uuid7을 추가해 v4와 인덱스 크기, 삽입 시간, WAL 증가량을 비교하세요.`
    },
    {
      title: `실습 2: 격리 수준 이상 현상 재현과 해결 방식별 처리량 측정`,
      scenario: `고객사의 포인트·잔액 시스템과 당직 배정 기능에서 "가끔 숫자가 안 맞는다"는 제보가 옵니다. 로그로는 원인이 보이지 않고 재현도 안 됩니다. 본인 로컬 PostgreSQL에서 lost update, write skew, 데드락을 확정적으로 재현하고, 해결 방식 네 가지의 정확성과 처리량을 비교해 고객에게 설명할 표로 만드세요. 파이썬 스레드와 psycopg를 쓰고, 동시에 출발시키기 위해 threading.Barrier를 사용하며, 운영 DB가 아닌 본인 로컬 DB에서만 실행합니다.`,
      steps: [
        `환경을 기록합니다(PostgreSQL 버전, 파이썬과 psycopg 버전). accounts(id, balance, version)에 계좌 1개를 잔액 0으로 만들고, oncall(doctor, on_duty)에 두 명을 on_duty=true로 넣습니다.`,
        `lost update 시험: Read Committed에서 8개 스레드가 각각 100번 "잔액을 SELECT, 애플리케이션에서 +1, UPDATE" 순서로 실행합니다. 기대값은 800입니다. 최종 잔액과 손실 건수를 기록합니다.`,
        `같은 시험을 해결 방식 네 가지로 반복합니다. (a) UPDATE balance = balance + 1 한 문장, (b) SELECT ... FOR UPDATE 후 UPDATE, (c) 버전 컬럼 낙관적 락(영향 행 0이면 다시 읽고 재시도), (d) SERIALIZABLE과 40001 재시도 루프. 방식별 최종 잔액, 총 소요 시간(tx/s), 재시도 횟수를 기록합니다.`,
        `write skew 시험: 두 스레드가 Barrier에서 만나 둘 다 "당직 인원 수"를 읽은 뒤 각자 다른 의사 행을 on_duty=false로 바꿉니다. 이 시험을 20회 반복하며 당직 0명이 된 횟수를 Read Committed, Repeatable Read, Serializable에서 각각 기록하고 Serializable에서는 40001 발생 횟수와 재시도 후 불변식 유지 여부를 기록합니다.`,
        `데드락 시험: 두 트랜잭션이 계좌 1과 2를 반대 순서로 UPDATE하게 해 SQLSTATE 40P01을 재현하고, 서버 로그의 deadlock detected 메시지와 deadlock_timeout 값을 캡처합니다. 기본키 순서로 잠금 순서를 통일한 뒤 100회 반복해 재현되지 않음을 확인합니다.`,
        `긴 트랜잭션 시험: 한 세션이 BEGIN ISOLATION LEVEL REPEATABLE READ 후 SELECT 하나를 실행하고(이 수준은 트랜잭션 내내 스냅샷을 쥔다) 열어 둔 채, 다른 세션이 10만 행 테이블을 여러 번 UPDATE하며 VACUUM을 실행합니다. pg_stat_user_tables의 n_dead_tup이 VACUUM 후에도 줄지 않는 것과 VACUUM VERBOSE의 제거하지 못한 튜플 관련 출력을 기록하고, 세션을 닫은 뒤 다시 VACUUM해 줄어드는 것을 확인합니다.`,
        `results.md에 표를 만듭니다. 열은 해법, 정확성(최종값·불변식), 처리량, 재시도율, 적합한 상황입니다.`
      ],
      accept: [
        `lost update 시험에서 읽고-쓰기 방식의 최종 잔액이 800보다 작고 손실 건수가 기록되어 있으며, 네 가지 해법은 모두 최종 잔액이 800임이 확인된다.`,
        `write skew 시험에서 Repeatable Read의 위반 횟수가 1회 이상으로 기록되고, Serializable에서는 위반 0회이며 40001이 1회 이상 관찰되어 재시도로 성공했다.`,
        `데드락 시험에서 서버 로그의 deadlock detected가 캡처되어 있고, 잠금 순서를 통일한 뒤 100회 반복에서 0회이다.`,
        `해법 네 가지의 tx/s와 재시도 횟수가 한 표에 있고 각 해법을 고르는 상황이 한 줄씩 적혀 있다.`,
        `긴 트랜잭션 세션이 열려 있는 동안에는 VACUUM 후에도 n_dead_tup이 줄지 않았고 세션을 닫은 뒤 줄었음이 숫자로 기록되어 있다.`
      ],
      stretch: `MySQL(InnoDB) 컨테이너에서 같은 write skew 시험을 Repeatable Read로 실행해 PostgreSQL과 결과를 비교하고, 범위 조건의 SELECT ... FOR UPDATE가 갭 락으로 다른 세션의 INSERT를 대기시키는 것을 확인해 표에 추가하세요. 또는 Jepsen 보고서 한 건을 골라 "제품의 주장, 관찰된 이상 현상, 설명된 원인"을 한 쪽 표로 정리하세요.`
    },
    {
      title: `실습 3 (납품형 미니 프로젝트): 정전에도 데이터를 잃지 않는 소형 KV 저장소와 내구성 검증 보고서`,
      scenario: `제조 현장의 고객사가 장비 설정과 작업 이력을 JSON 파일 덮어쓰기로 저장해 왔는데, 정전 뒤 파일이 깨져 하루치 기록을 잃었습니다. 외부 DB 서버를 두기는 어렵다며 파일 기반의 작고 믿을 수 있는 저장 모듈을 요청합니다. 납품물은 (1) WAL, memtable, 정렬된 SST 파일을 가진 소형 KV 라이브러리, (2) 정전을 결정적으로 흉내 내는 장애 주입 테스트, (3) 보장 범위와 한계를 숫자로 밝힌 내구성 보고서, (4) README입니다. 본인 PC에서 파이썬 3.10 이상으로 만들고, 처음 보는 사람이 README만 읽고 시험을 통과시킬 수 있게 고객에게 넘기듯 납품하세요.`,
      steps: [
        `저장소를 만듭니다. minikv/ 아래에 kv.py, faultdisk.py, tests/, bench/, README.md, REPORT.md를 둡니다.`,
        `faultdisk.py: 파일 객체 래퍼를 만듭니다. write는 메모리 버퍼에만 쌓고 fsync가 불릴 때만 실제 파일에 반영합니다. crash(mode)는 mode=drop이면 fsync 안 된 데이터를 전부 버리고 mode=torn이면 그 버퍼의 앞부분 임의 바이트만 반영합니다. 이것으로 OS 크래시와 정전을 결정적으로 재현합니다.`,
        `kv.py: 레슨 7의 WAL 방식(레코드마다 CRC, 재시작 시 재생, 찢어진 꼬리 제거)을 바탕으로 put, get, delete(삭제 표시)를 구현합니다. memtable이 1000건에 이르면 정렬된 SST로 내리고 WAL을 새로 시작하며, 시작할 때 SST를 읽고 WAL을 재생하며, SST가 5개 이상이면 compact합니다. SST는 임시 파일에 쓰고 fsync한 뒤 os.replace로 이름을 바꾸며, POSIX에서는 부모 디렉터리도 fsync해 이름 변경을 영속화합니다(Windows는 디렉터리 fsync가 안 되므로 보고서에 한계로 적습니다).`,
        `테스트를 작성합니다. (a) 1만 건 put 뒤 재시작하면 값이 모두 일치, (b) durable 모드에서 put이 반환된 키는 crash(drop) 뒤에도 100% 존재, (c) durable 해제 모드에서 crash(drop) 뒤 손실 건수 기록, (d) crash(torn)에서도 재시작이 성공하고 직전까지의 레코드는 전부 복구, (e) flush와 compact 도중 임의 지점에서 crash를 200회 주입한 뒤 반환된 쓰기가 전부 복구되는지 확인.`,
        `벤치를 만듭니다. durable, durable 해제, N건마다 fsync(배치) 세 모드에서 ops/s와 평균·p99 지연을 표로 기록합니다. 실제 fsync는 FaultDisk가 아닌 실제 파일 모드에서 측정합니다.`,
        `REPORT.md를 씁니다. 보장 범위(예: put이 반환되면 전원 차단 후에도 남는다. 장치의 쓰기 캐시가 정직하다는 전제), 한계(단일 프로세스, 동시 접근 금지, 큰 값에 부적합), 시험 결과표, 알려진 위험, 운영 권고를 시험 번호와 함께 적습니다.`,
        `README에 설치, 사용 예, 시험 실행 방법을 쓰고, 새 환경에서 README만 보고 시험이 통과할 때까지 걸린 시간을 REPORT.md에 기록합니다.`
      ],
      accept: [
        `python -m unittest 한 번으로 시험 (a)~(e)가 모두 통과하고 종료 코드가 0이다.`,
        `durable 모드는 장애 주입 200회에서 반환된 쓰기 손실이 0건이고, durable 해제 모드는 같은 시험에서 손실이 1건 이상 관찰되어 손실 건수와 함께 보고서에 있다(관찰되지 않으면 장애 주입이 잘못된 것이므로 고친다).`,
        `찢어진 레코드 시험에서 재시작이 성공하고 직전까지의 레코드가 전부 복구됨이 시험 결과로 확인된다.`,
        `벤치 표에 세 모드의 ops/s와 p99 지연이 있고 durable 대 해제의 처리량 비율이 계산되어 있다.`,
        `REPORT.md의 모든 보장 주장에 근거 시험 번호가 연결되어 있고 한계 절이 있으며, README만으로 20분 안에 시험을 통과시킨 기록이 있다.`
      ],
      stretch: `여러 put을 한 번의 fsync로 묶는 그룹 커밋을 구현해 처리량과 p99 변화를 측정하세요. 또한 PostgreSQL 컨테이너에서 pg_waldump로 트랜잭션 하나가 남긴 WAL 레코드를 읽고, 레코드 종류와 LSN을 설명하는 한 쪽 보고서를 추가하세요.`
    }
  ],
  quiz: [
    {
      q: `[상황] 쇼핑몰 재고 차감 코드가 재고를 SELECT해 애플리케이션에서 1 이상인지 확인한 뒤 계산한 값을 UPDATE합니다(Read Committed). 인기 상품의 재고 1개에 동시 주문 두 건이 들어와 재고가 -1이 되었습니다. 가장 적절한 수정은 무엇입니까?`,
      choices: [
        `격리 수준을 Serializable로 올리고, 직렬화 오류가 나면 재시도 없이 사용자에게 그대로 보여 준다.`,
        `UPDATE stock SET qty = qty - 1 WHERE sku = ? AND qty >= 1 로 검사와 차감을 한 문장에 합치고, 영향 행이 0이면 재고 부족으로 응답한다.`,
        `재고 조회를 읽기 복제본으로 보내 주 노드의 락 경합을 줄이고, 차감 UPDATE만 주 노드에서 실행한다.`,
        `재고 검사 구간을 애플리케이션 서버 프로세스 안의 메모리 락으로 감싸 한 번에 한 요청만 통과시킨다.`
      ],
      answer: 1,
      why: `단일 행 불변식은 검사와 차감을 한 문장으로 DB에 맡기는 것이 가장 싸고 강합니다(CHECK (qty >= 0) 제약을 안전망으로 더하면 더 좋습니다). Serializable(A)은 재시도 처리가 없으면 오류율만 올리고, 복제본(C)은 지연된 오래된 값을 읽을 위험이 있으며, 프로세스 안의 메모리 락(D)은 서버가 여러 대이거나 재시작되면 아무 보호도 못 합니다.`
    },
    {
      q: `[로그] 주문 조회 API가 4초 걸립니다. EXPLAIN (ANALYZE) 출력의 일부입니다.

Nested Loop  (cost=0.43..1250.10 rows=12 width=48) (actual time=0.05..4210.37 rows=583211 loops=1)
  -> Seq Scan on customers c  (cost=0.00..95.00 rows=3 width=16) (actual time=0.02..9.80 rows=2900 loops=1)
        Filter: (region = 'KR-SEOUL')
        Rows Removed by Filter: 97100
  -> Index Scan using orders_customer_idx on orders o  (cost=0.43..385.00 rows=4 width=32) (actual time=0.01..1.40 rows=201 loops=2900)

가장 타당한 해석은 무엇입니까?`,
      choices: [
        `orders_customer_idx 인덱스가 없어서 느린 것이므로 orders의 고객 컬럼에 인덱스를 추가해야 한다.`,
        `최상위 노드의 cost가 1250으로 작으므로 이 계획은 실제로도 빨랐고, 4초는 네트워크 지연일 것이다.`,
        `안쪽 Index Scan의 actual time이 1.40 ms에 불과하므로 안쪽 노드는 병목이 아니고 바깥 Seq Scan이 원인이다.`,
        `추정 rows=3 대 실제 2900으로 크게 빗나갔고, 안쪽 1.40 ms가 loops=2900번 돌아 약 4초가 되었다. 통계(ANALYZE, 확장 통계)부터 점검한다.`
      ],
      answer: 3,
      why: `추정과 실제의 큰 어긋남(3 대 2900)이 첫 단서이고, 실제 시간은 loops를 곱해야 합니다(1.40 ms × 2900 = 약 4060 ms). 인덱스는 이미 쓰이고 있어(A) 원인이 아니며, cost는 임의 단위라 시간과 직접 비교할 수 없고(B), 안쪽 노드 시간을 loops 없이 보는 것(C)이 가장 흔한 오독입니다.`
    },
    {
      q: `[상황] 고객이 "읽기 복제본이 있으니 PITR(베이스 백업과 WAL 보관) 비용은 견적에서 빼 달라"고 합니다. 지난주 개발자가 운영 DB에서 WHERE 없는 DELETE를 실행한 적이 있습니다. 가장 적절한 응답은 무엇입니까?`,
      choices: [
        `복제본은 잘못된 DELETE도 그대로 복제하므로 PITR(베이스 백업과 WAL 보관)과 복원 연습은 견적에 유지하고 RPO·RTO를 합의한다.`,
        `복제본을 동기 복제로 두면 삭제된 행을 복제본에서 그대로 꺼내 복구할 수 있으므로 백업 비용을 뺀다.`,
        `synchronous_commit = on과 fsync = on을 유지하면 커밋된 DELETE도 로그에서 취소할 수 있어 별도 백업이 필요 없다.`,
        `fsync와 full_page_writes를 켜 두면 크래시 복구 때 실행된 DELETE도 되돌려지므로 별도 백업 없이도 안전하다.`
      ],
      answer: 0,
      why: `복제는 변경을 전파하는 장치라 논리적 실수도 함께 전파합니다. 되돌림은 베이스 백업과 사고 이전 시점까지의 WAL 재생으로 합니다. 동기 복제(B), 동기 커밋(C), fsync(D)는 내구성과 가용성의 문제이고, 크래시 복구는 커밋된 변경을 되돌리지 않고 다시 적용하므로 삭제 취소와 무관합니다.`
    },
    {
      q: `[코드] 두 세션이 아래 순서로 실행합니다(PostgreSQL 18, oncall에는 kim과 lee가 모두 on_duty=true).

A: BEGIN ISOLATION LEVEL REPEATABLE READ;
B: BEGIN ISOLATION LEVEL REPEATABLE READ;
A: SELECT count(*) FROM oncall WHERE on_duty;   -- 2
B: SELECT count(*) FROM oncall WHERE on_duty;   -- 2
A: UPDATE oncall SET on_duty = false WHERE doctor = 'kim';
B: UPDATE oncall SET on_duty = false WHERE doctor = 'lee';
A: COMMIT;
B: COMMIT;

결과와 가장 적절한 수정은 무엇입니까?`,
      choices: [
        `B의 UPDATE가 A의 커밋이 끝날 때까지 대기하다 직렬화 오류(40001)로 실패해 한쪽만 성공한다.`,
        `두 커밋이 모두 성공하지만, 격리 수준을 Read Committed로 낮추면 두 번째 SELECT가 최신 값을 읽어 해결된다.`,
        `둘 다 커밋되어 당직이 0명이 된다(write skew). SERIALIZABLE로 올려 40001을 재시도하거나, 읽은 행들을 FOR UPDATE로 잠가 충돌시킨다.`,
        `PostgreSQL의 Repeatable Read는 팬텀까지 막아 직렬 가능하므로 두 커밋 중 하나는 반드시 실패해 문제가 없다.`
      ],
      answer: 2,
      why: `두 트랜잭션은 서로 다른 행을 쓰므로 쓰기 충돌이 없고, 스냅샷 격리는 읽은 집합의 변화를 감지하지 못해 둘 다 커밋됩니다. Read Committed(B)는 오히려 더 약하고, 팬텀이 없다는 것(D)은 직렬 가능하다는 뜻이 아닙니다. SSI나 충돌을 만드는 락이 필요합니다.`
    },
    {
      q: `[상황] 로그 수집 API가 초당 3만 건의 이벤트를 키로 적재하고, 조회는 최근 키 조회와 가끔의 시간 범위뿐입니다. 팀은 PostgreSQL에서 쓰기 지연 스파이크를 겪어 LSM 기반 저장소(RocksDB 계열) 전환을 검토합니다. 결정 전에 가장 먼저 할 일은 무엇입니까?`,
      choices: [
        `LSM은 쓰기가 항상 순차 I/O라 B-트리보다 빠르므로 RocksDB 계열로 즉시 전환하고 이후에 튜닝한다.`,
        `스파이크 원인(체크포인트, 인덱스 수, fsync 지연, 락 대기)을 먼저 측정하고, 범위 조회·보조 인덱스·삭제·p99 요구를 정리해 판단한다.`,
        `쓰기 분산을 위해 샤딩 설계부터 시작해 노드당 쓰기량을 낮춘다.`,
        `스파이크가 나는 구간에만 fsync를 꺼서 지연을 없애고, 저장소 전환은 천천히 검토한다.`
      ],
      answer: 1,
      why: `LSM도 compaction이 밀리면 쓰기 지연이 생기고 읽기·공간 증폭이라는 대가가 있으므로, 요구사항과 현재 병목의 원인을 먼저 확인해야 합니다. 즉시 전환(A)은 원인 확인 없이 도구부터 바꾸는 것이고, 샤딩(C)은 원인과 무관한 큰 변경이며, fsync 끄기(D)는 정전 시 손상 위험을 부릅니다.`
    },
    {
      q: `[코드] 소형 저장소의 put 메서드입니다. 정전 시험에서 put이 True를 반환한 쓰기가 사라집니다. 무엇이 문제입니까?

def put(self, k, v):
    self.f.write(json.dumps({"k": k, "v": v}).encode() + b"\\n")
    self.f.flush()
    self.data[k] = v
    return True`,
      choices: [
        `flush는 사용자 공간 버퍼를 OS 페이지 캐시로 넘길 뿐인데 os.fsync 없이 True를 반환하므로, 전원 차단 때 반환된 쓰기가 사라질 수 있다.`,
        `메모리 상태(self.data) 갱신을 로그 쓰기보다 먼저 해야 크래시 뒤에도 메모리와 로그가 일치한다.`,
        `JSON 텍스트 대신 바이너리 포맷으로 직렬화해야 디스크에 기록된 것으로 보장된다.`,
        `파일을 "ab"가 아니라 "wb" 모드로 열어야 쓰기가 기존 내용 위에 확실히 반영된다.`
      ],
      answer: 0,
      why: `내구성의 선은 fsync입니다. flush 이후에도 데이터는 OS 캐시에 있어 프로세스 종료에는 살아남지만 정전에는 사라집니다. 로그를 먼저 쓰고 메모리를 나중에 갱신하는 순서는 이미 옳고(B), 직렬화 형식(C)과 열기 모드(D)는 내구성과 무관합니다(wb는 오히려 기존 파일을 지웁니다).`
    },
    {
      q: `[상황] MySQL(InnoDB, 기본 Repeatable Read)로 운영하던 주문 시스템을 PostgreSQL로 옮겼습니다. 이전 후 일부 쓰기 요청에서 간헐적으로 아래 오류가 납니다. 팀은 격리 수준을 Repeatable Read로 지정해 두었습니다.

ERROR:  could not serialize access due to concurrent update
SQLSTATE: 40001

가장 적절한 대응은 무엇입니까?`,
      choices: [
        `PostgreSQL 쪽 버그이므로 최신 마이너 버전으로 올리면 이 오류는 사라진다.`,
        `일시적 연결 문제이므로 로그만 남기고 해당 요청은 성공한 것으로 처리해 다음 요청으로 넘어간다.`,
        `격리 수준을 Serializable로 올리면 직렬화 실패가 없어지므로 설정 한 줄만 바꾼다.`,
        `스냅샷 이후 다른 트랜잭션이 커밋한 행을 고치려 할 때 나는 정상 동작이다. 트랜잭션 전체 재시도 루프를 넣고 Read Committed로 충분한지도 검토한다.`
      ],
      answer: 3,
      why: `PostgreSQL 문서는 Repeatable Read와 Serializable 모두 직렬화 실패(40001)에 대비해 트랜잭션을 처음부터 재시도해야 한다고 명시합니다. 이는 버그가 아니라 설계된 동작이라 업그레이드(A)로 사라지지 않고, 오류를 넘기면(B) 쓰기를 잃으며, Serializable로 올리면(C) 오히려 중단이 더 늘 수 있습니다. 엔진마다 같은 수준 이름의 동작이 다르다는 점이 이 사고의 뿌리입니다.`
    },
    {
      q: `[설정] MariaDB Galera 클러스터의 설정 일부와 사건 보고입니다.

[mysqld]
innodb_flush_log_at_trx_commit = 0

(사건) 전력 문제로 3개 노드가 거의 동시에 재부팅되었다. 재기동 후, 클라이언트가 커밋 성공 응답을 받았던 최근 거래 일부가 존재하지 않는다.

가장 타당한 해석과 조치는 무엇입니까?`,
      choices: [
        `Galera는 합의 기반 복제라 커밋 손실이 없음을 보장하므로 원인은 클라이언트가 응답을 잘못 해석한 데 있다.`,
        `이 설정은 커밋마다 로그를 디스크에 flush하므로 커밋 확인된 거래 손실의 원인이 될 수 없다.`,
        `0은 약 1초 주기로만 로그를 쓰고 flush하므로 전 노드가 동시에 죽으면 커밋 확인된 거래도 잃을 수 있다. 1로 바꾸고 동시 장애를 시험하며 남는 위험을 문서화한다.`,
        `노드가 3개이므로 한 노드의 로그만 남아 있어도 항상 복구되며, 손실이 있었다면 복제 설정 오류이다.`
      ],
      answer: 2,
      why: `Jepsen의 MariaDB Galera 12.1.2 보고(2026-03-16)는 문서가 권장했던 0 설정에서 노드가 거의 동시에 죽을 때 커밋 확인된 쓰기가 사라졌고, 1로 바꾸면 크게 줄지만 크래시와 네트워크 분리에서 드물게 손실이 남았다고 기록했습니다. 문서의 보장(A)을 곧이곧대로 믿을 수 없고, 0은 커밋 시점 flush를 하지 않으므로(B) 반대이며, 노드 수(D)는 동시 장애에서 보호하지 못합니다.`
    },
    {
      q: `[상황] 매일 새벽 정산 배치가 약 3천만 행을 하나의 트랜잭션으로 UPDATE합니다. 배치 후 낮 동안 PostgreSQL의 디스크 사용량이 늘고 쿼리가 점점 느려집니다. 같은 시간대에 리포트 도구가 REPEATABLE READ 트랜잭션을 열고 쿼리를 한 번 실행한 뒤 닫지 않은 세션이 있습니다. 가장 효과적인 첫 조치는 무엇입니까?`,
      choices: [
        `shared_buffers를 두 배로 늘려 캐시 적중률을 높이고 디스크 읽기를 줄인다.`,
        `배치를 수만 행 단위로 나눠 커밋하고, pg_stat_activity의 xact_start로 방치된 트랜잭션을 찾아 닫는다. 자동 정리가 따라오는지도 확인한다.`,
        `배치 중에만 fsync를 꺼서 배치 시간을 줄이고 죽은 행이 쌓일 시간 자체를 없앤다.`,
        `낮 시간대에 VACUUM FULL을 매시간 실행해 테이블을 줄이고 디스크 사용량을 되돌린다.`
      ],
      answer: 1,
      why: `대량 UPDATE는 죽은 버전을 만들고, 스냅샷을 쥔 채 열려 있는 트랜잭션(Repeatable Read는 트랜잭션 내내 스냅샷을 유지합니다)이 있으면 그 버전을 아무도 못 보게 될 때까지 정리할 수 없어 공간과 지연이 누적됩니다. 문서에 따르면 VACUUM FULL은 ACCESS EXCLUSIVE 락과 추가 디스크 공간이 필요하므로(D) 낮 시간 반복 실행은 장애를 부릅니다. 버퍼 풀 증설(A)은 원인과 무관하고, fsync 끄기(C)는 정전 시 손상 위험만 만듭니다.`
    },
    {
      q: `[코드] 직렬화 실패 재시도 로직입니다. 운영에서 가끔 결제가 두 번 청구됩니다. 무엇이 잘못입니까?

for attempt in range(5):
    try:
        with conn.transaction():              # SERIALIZABLE
            row = db.get_order(order_id)
            gateway.charge(row.card, row.amount)    # 외부 결제 API 호출
            db.mark_paid(order_id)
        break
    except SerializationFailure:
        continue`,
      choices: [
        `range(5) 대신 성공할 때까지 무한 루프로 재시도해야 한다.`,
        `SerializationFailure뿐 아니라 모든 예외를 재시도 대상으로 잡아야 한다.`,
        `트랜잭션 블록 안에서 db.get_order 같은 SELECT를 먼저 실행하면 안 된다.`,
        `재시도 단위 안에서 외부 결제 API를 호출해, mark_paid나 커밋이 40001로 실패하면 이미 청구된 결제는 롤백되지 않은 채 재실행된다. 멱등 키와 상태 전이로 분리해야 한다.`
      ],
      answer: 3,
      why: `DB 롤백은 DB 안의 변경만 되돌립니다. 외부 부작용이 재시도 단위 안에 있으면 재시도마다 반복됩니다. 재시도 횟수(A)나 예외 범위(B)는 이중 청구와 무관하고, 트랜잭션 안의 SELECT(C)는 정상입니다.`
    },
    {
      q: `[상황] 신규 서비스가 PostgreSQL 주문 테이블의 기본키로 UUIDv4를 쓰며 월 1억 건 규모로 성장할 예정입니다. 쓰기 성능 관점에서 가장 적절한 대안은 무엇입니까?`,
      choices: [
        `UUIDv7이나 순차 bigint(외부용 식별자는 별도)로 삽입을 인덱스 오른쪽 끝에 모으고, 생성 시각 노출이 허용되는지 확인한다.`,
        `UUID를 uuid 타입 대신 text 컬럼에 문자열로 저장해 비교를 단순하게 만들면 삽입 비용이 줄어든다.`,
        `기본키 인덱스를 만들지 않고 애플리케이션이 중복을 검사해 인덱스 쓰기 비용을 없앤다.`,
        `인덱스의 fillfactor를 100으로 올려 페이지를 꽉 채우면 무작위 삽입에서도 페이지 분할이 사라진다.`
      ],
      answer: 0,
      why: `무작위 키는 삽입이 모든 리프에 흩어져 캐시 미스, 잦은 분할, 체크포인트 직후 전체 페이지 WAL 증가를 부릅니다. 시간 정렬 키는 이를 줄입니다(RFC 9562의 v7은 48비트 밀리초 타임스탬프). 문자열 저장(B)은 키를 더 크게 만들고, 기본키 인덱스 제거(C)는 유일성 보장을 없애며, fillfactor 100(D)은 여유가 없어 분할을 오히려 늘립니다.`
    },
    {
      q: `[상황] RocksDB 기반 저장소에서 어느 날부터 쓰기 요청이 간헐적으로 몇 초씩 멈춥니다. 유입 쓰기량은 평소와 같고 디스크 쓰기 대역폭은 포화 상태입니다. 가장 가능성이 높은 원인과 확인할 지점은 무엇입니까?`,
      choices: [
        `B-트리 페이지 분할이 늘어난 것이므로 인덱스를 재구성해 페이지 단편화를 줄여야 한다.`,
        `memtable에만 쓰고 WAL을 쓰지 않아 데이터가 사라지는 것이 원인이므로 WAL을 켜야 한다.`,
        `compaction이 유입을 따라가지 못해 Level-0 파일과 대기 compaction 양이 쌓이며 엔진이 쓰기를 늦추거나 멈추는 write stall이다. Level-0 파일 수, 대기 compaction 바이트, 쓰기 증폭, 디스크 대역폭을 확인한다.`,
        `읽기 복제본의 복제 지연이 커져서 주 노드의 쓰기를 백프레셔로 막고 있다.`
      ],
      answer: 2,
      why: `LSM에서는 쓰기를 순차로 빠르게 받는 대신 compaction이 뒤에서 재작성을 맡으므로, compaction이 밀리면 파일이 쌓여 읽기가 느려지고 엔진이 스스로 쓰기를 늦추거나 멈춥니다(RocksDB의 write stall 조건은 memtable 수, Level-0 파일 수, 대기 compaction 바이트입니다). 같은 쓰기량인데도 디스크가 포화라면 쓰기 증폭이 커졌다는 신호입니다. B-트리 분할(A)은 다른 엔진의 문제이고, WAL 누락(B)은 데이터 소실 증상이지 정지 증상이 아니며, 복제 지연(D)은 RocksDB 쓰기 경로와 직접 관련이 없습니다.`
    }
  ],
  refs: [
    {
      title: `PostgreSQL 문서: Transaction Isolation`,
      url: `https://www.postgresql.org/docs/current/transaction-iso.html`,
      kind: `doc`,
      why: `Read Uncommitted가 Read Committed로 매핑되고 Repeatable Read가 스냅샷 격리, Serializable이 SSI임을 밝히며 40001 직렬화 실패의 재시도 의무와 오류 문구를 담은 1차 문서(18.6, 2026-11 확인). 레슨 5~6의 기준 자료.`
    },
    {
      title: `MySQL 8.4 Reference Manual: InnoDB Transaction Isolation Levels`,
      url: `https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html`,
      kind: `doc`,
      why: `InnoDB의 기본 Repeatable Read, 일반 읽기와 잠금 읽기의 차이, 갭·넥스트키 락, Read Committed에서의 변화, Serializable의 SELECT 변환을 정의한 1차 문서(2026-11 확인). PostgreSQL과 비교해 읽는다.`
    },
    {
      title: `PostgreSQL 문서: Reliability and the Write-Ahead Log (WAL 소개)`,
      url: `https://www.postgresql.org/docs/current/wal-intro.html`,
      kind: `doc`,
      why: `로그를 데이터 파일보다 먼저 영속화한다는 WAL 원칙, 커밋에는 WAL flush만 필요하다는 점, 크래시 시 REDO 재생과 시점 복구(PITR)의 기반을 설명한다. 레슨 7의 출발점.`
    },
    {
      title: `PostgreSQL 문서: Database Page Layout`,
      url: `https://www.postgresql.org/docs/current/storage-page-layout.html`,
      kind: `doc`,
      why: `8 kB 페이지의 헤더, 줄 포인터, 여유 공간, 행, 특수 공간 구성과 행 헤더의 xmin·xmax·ctid 필드를 표로 정의한다. 레슨 2의 크기 계산과 MVCC 이해의 근거.`
    },
    {
      title: `PostgreSQL 문서: Routine Vacuuming`,
      url: `https://www.postgresql.org/docs/current/routine-vacuuming.html`,
      kind: `doc`,
      why: `VACUUM의 목적(공간 회수, 통계 갱신, 가시성 맵 갱신, 래핑어라운드 방지), 약 20억 트랜잭션 기준의 트랜잭션 ID 래핑어라운드, 자동 정리, VACUUM FULL의 ACCESS EXCLUSIVE 락과 추가 디스크 비용을 다룬다(18.6, 2026-11 확인). MVCC 비용을 운영 관점에서 이해하는 핵심 문서.`
    },
    {
      title: `PostgreSQL 문서: Using EXPLAIN`,
      url: `https://www.postgresql.org/docs/current/using-explain.html`,
      kind: `doc`,
      why: `비용 단위, 추정 행 수와 실제 행 수, loops, BUFFERS, 스캔·조인 노드 종류를 예제로 설명하고 EXPLAIN ANALYZE가 문장을 실제로 실행한다는 경고와 롤백 패턴을 담았다. 레슨 4와 실습 1의 판독 기준.`
    },
    {
      title: `ARIES: A Transaction Recovery Method Supporting Fine-Granularity Locking and Partial Rollbacks Using Write-Ahead Logging`,
      url: `https://web.stanford.edu/class/cs345d-01/rl/aries.pdf`,
      kind: `paper`,
      why: `Mohan 등(ACM TODS 17(1), 1992)의 복구 알고리즘 원문. 분석·redo(역사 반복)·undo, 보상 로그 레코드(CLR), 퍼지 체크포인트를 정의한다. 분량이 크므로 개요와 복구 절차 부분을 우선 읽는다.`
    },
    {
      title: `The Log-Structured Merge-Tree (LSM-Tree)`,
      url: `https://www.cs.umb.edu/~poneil/lsmtree.pdf`,
      kind: `paper`,
      why: `O'Neil 등(Acta Informatica, 원고본)이 삽입이 많은 인덱스를 메모리와 디스크 컴포넌트로 나누고 rolling merge로 순차 I/O화해 쓰기 비용을 낮추는 방식을 제안한 원 논문. 권호 서지는 원고본 기준이라 확인하지 못했다.`
    },
    {
      title: `RocksDB Overview (RocksDB 위키)`,
      url: `https://github.com/facebook/rocksdb/wiki/RocksDB-Overview`,
      kind: `doc`,
      why: `memtable, WAL, SST, level·universal·FIFO compaction 스타일의 구조를 설명하는 구현 문서(2026-11 확인). LSM 증폭 트레이드오프를 실제 제품 용어로 읽는 자료.`
    },
    {
      title: `A Critique of ANSI SQL Isolation Levels`,
      url: `https://arxiv.org/abs/cs/0701157`,
      kind: `paper`,
      why: `Berenson, Bernstein, Gray 등(SIGMOD 1995)이 ANSI 세 현상 정의의 모호함을 지적하고 새 현상과 스냅샷 격리를 정의한 논문. 격리 수준을 이름이 아닌 이상 현상으로 말해야 하는 이유의 원전이다.`
    },
    {
      title: `Use The Index, Luke`,
      url: `https://use-the-index-luke.com/`,
      kind: `book`,
      why: `B+트리 구조, WHERE·조인·정렬·부분 결과에서 인덱스가 작동하는 방식을 개발자 관점에서 가르치는 무료 웹 교재. 레슨 3과 be-sql 모듈을 잇는 실전 자료.`
    },
    {
      title: `Jepsen: Consistency Models`,
      url: `https://jepsen.io/consistency/models`,
      kind: `doc`,
      why: `strict serializable부터 read committed까지, linearizable부터 causal까지의 포함 관계와 가용성 분류를 지도로 보여 준다(2026-11 접속). serializable 아래에서 repeatable read와 snapshot isolation이 서로 비교 불가능하다는 점도 여기서 확인한다.`
    },
    {
      title: `Jepsen: MariaDB Galera Cluster 12.1.2`,
      url: `https://jepsen.io/analyses/mariadb-galera-cluster-12.1.2`,
      kind: `article`,
      why: `innodb_flush_log_at_trx_commit = 0에서 동시 크래시 때 커밋 확인된 쓰기가 사라졌고, 1에서도 드물게 손실, 장애 없는 lost update와 stale read가 있었다는 분석(2026-03-16). 문서의 보장과 실제의 차이를 보여 주는 사례.`
    },
    {
      title: `Jepsen: Amazon RDS for PostgreSQL 17.4`,
      url: `https://jepsen.io/analyses/amazon-rds-for-postgresql-17.4`,
      kind: `article`,
      why: `Multi-AZ 클러스터에서 스냅샷 격리를 위반하는 Long Fork를 관찰한 분석(2025-04-29, 원인 설명 갱신 2025-05-03). 관리형 DB의 보장도 시험으로 확인해야 한다는 사례.`
    }
  ],
  gigs: [
    `고객은 대개 "DB가 느려요", "사양을 올리면 되죠?", "인덱스만 몇 개 추가해 주세요"로 의뢰합니다. "NoSQL로 바꾸면 빠르다던데" 같은 기술 교체나 벡터 DB 도입 요청도 레슨 8의 워크로드 질문으로 먼저 되돌립니다. 견적 전에 확인할 것: DB 제품과 버전, 관리형(RDS 등) 여부(관리형은 설정과 WAL, OS 접근이 막혀 있는 일이 많습니다), 데이터 규모와 읽기·쓰기 비율, 증상이 나타나는 시각과 빈도, 접근 권한(읽기 전용 진단 계정, pg_stat_statements 같은 확장 사용 가능 여부), 기존 모니터링, 백업과 복원 이력, 점검 가능 시간대입니다.`,
    `진단과 수정을 분리해 견적합니다. 1~3일짜리 고정 가격 진단(계획 분석, 락·체크포인트 지표, 원인과 조치안)을 먼저 하고 결과로 수정 견적을 냅니다. 대략의 경험치(환경에 따라 크게 달라짐): 느린 쿼리와 인덱스 감사 2~5일, 동시성 버그는 재현 시험까지 포함해 별도 견적입니다. 간헐 장애는 재현이 안 되면 일정이 무너지므로 "재현 환경 확보 여부"를 선행 조건으로 적습니다.`,
    `납품물은 코드가 아니라 증거와 재현 가능성입니다. 증거 중심 보고서(EXPLAIN 전후, 읽은 버퍼 수, 락 대기와 체크포인트 지표), 변경 스크립트(온라인 인덱스 생성, 롤백 방법), 동시성 시험 스크립트, 숫자 인수 기준(예: 동시 100요청에서 재고 음수 0건, 목록 p95 목표), 모니터링 쿼리 모음, 런북, 백업 복원 연습 기록을 포함합니다.`,
    `전형적인 함정: 운영 DB에서 변경 쿼리에 EXPLAIN ANALYZE를 실행함, 쓰기를 막는 DDL(인덱스 생성, 컬럼 추가)을 업무 시간에 실행함, 인덱스를 과다하게 추가해 쓰기가 느려짐, ORM의 N+1 쿼리를 인덱스로만 풀려 함, 격리 수준을 일괄 상향하고 재시도를 구현하지 않음, 읽기 복제본의 값으로 쓰기를 판단함, 관리형 DB에서 불가능하거나 재부팅이 필요한 설정을 약속함, 복제본을 백업으로 오해함.`,
    `내구성과 데이터 손실의 책임 범위를 서면으로 정합니다. fsync, synchronous_commit, innodb_flush_log_at_trx_commit 같은 옵션을 낮출 때는 "정전 시 최근 몇 ms~몇 초 분량의 커밋을 잃을 수 있음"을 고객이 이해하고 승인한 기록을 남깁니다. RPO와 RTO, 복원 연습 포함 여부를 범위에 적습니다. Jepsen 사례처럼 제품의 문서화된 보장이 실제와 다를 수 있으므로 돈이 걸린 불변식은 제약 조건과 시험으로 이중화하고, 계약에는 "제품의 문서화된 보장 범위 안에서"라는 한계를 명시합니다.`,
    `보안과 개인정보: 운영 데이터 접근은 서면으로 범위, 기간, 계정을 합의하고 종료 후 계정과 키를 회수합니다. 쿼리 통계와 로그에는 개인정보가 섞일 수 있으므로 보고서에 넣을 때 마스킹하고, 운영 데이터를 개인 PC로 내려받지 않습니다. 이 모듈의 범위는 방어적 점검과 성능·정합성 개선이며 침투 테스트는 별도 계약이 필요합니다.`,
    `버전과 수명도 견적에 넣습니다. 고객 DB 버전의 지원 종료 시점과 업그레이드 경로를 확인해 권고에 포함합니다(2026-11 기준 PostgreSQL 공식 문서의 current는 18.6이며, 이 모듈의 기본값 설명도 그 문서에 맞춘 것이므로 고객 버전의 문서로 다시 확인합니다). 인계 후 지원 기간과 SLA 범위(영업시간 대응인지 24시간 대기인지)를 문서로 정하고 24시간 대기는 별도 요금으로 분리합니다.`
  ]
};
