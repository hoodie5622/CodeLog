(window.PRO_MODULES = window.PRO_MODULES || {})["be-async"] = {
  id: "be-async",
  summary: `Redis 캐시, 큐 기반 비동기 처리, 멱등 소비자·아웃박스·DLQ를 조합해 중복·장애·적체 속에서도 최종 상태가 맞는 파이프라인을 설계하고 장애 주입으로 증명할 수 있다.`,
  hours: 80,
  goals: [
    `cache-aside·write-through·write-behind를 읽기/쓰기 비율과 허용 stale 시간으로 비교해 고르고, 삭제 순서에서 생기는 무효화 경쟁을 설명하고 TTL 안전망으로 다룰 수 있다.`,
    `캐시 스탬피드·핫 키·캐시 관통을 재현하고 single-flight, soft/hard TTL, TTL 지터, 음성 캐시로 막은 뒤 hit율과 DB 쿼리 수로 효과를 증명할 수 있다.`,
    `Redis/Valkey의 maxmemory-policy, RDB/AOF 영속성, 라이선스 이력을 근거로 캐시용과 상태 저장용 인스턴스를 분리하는 설정 파일을 작성하고 선택 이유를 의뢰인에게 설명할 수 있다.`,
    `분산 락의 효율용/정확성용 구분과 fencing token 원리를 설명하고, 정확성이 걸린 곳을 DB 제약·조건부 갱신으로 바꿔 설계하며, Lua로 원자적 토큰 버킷 레이트 리미터를 구현할 수 있다.`,
    `큐·로그·pub/sub 모델과 SQS·RabbitMQ·Kafka·PostgreSQL 큐의 전달 의미론을 비교해 프로젝트 규모와 팀 역량에 맞는 선택을 ADR로 작성할 수 있다.`,
    `at-least-once 전제에서 중복이 생기는 지점을 짚고, 업무 쓰기와 같은 트랜잭션의 dedup 키·자연 멱등성·Idempotency-Key로 멱등 소비자를 구현해 장애 주입 테스트로 증명할 수 있다.`,
    `트랜잭셔널 아웃박스와 사가로 DB 갱신과 메시지 발행의 이중 쓰기 문제를 해결하고, 보상 흐름과 대사(reconciliation) 경로까지 설계할 수 있다.`,
    `오류 분류, 백오프+지터 재시도, DLQ 운영, Little's Law 기반 동시성 산정, 백프레셔로 적체와 재시도 폭풍을 방어하는 운영 설계와 런북을 작성할 수 있다.`
  ],
  lessons: [
    {
      title: `지연·처리량·정합성의 지도: 캐시·큐·로그는 무엇을 대신하는가`,
      body: `이 모듈의 도구는 전부 한 질문에서 나옵니다. 느리거나 불안정한 것을 사용자의 요청 경로 밖으로 어떻게 빼낼 것인가. 앞선 모듈의 PostgreSQL은 정확하지만 한 번 읽는 데 수 ms가 걸리고 동시 연결 수에도 한계가 있습니다. 동시성 모듈의 async 코드는 한 프로세스 안에서 기다림을 겹쳐 줄 뿐이라서, 프로세스가 죽으면 맡겨 둔 일도 같이 사라집니다. 캐시는 읽기 경로의 반복 작업을 메모리로 옮기고, 큐와 로그는 쓰기 경로의 느린 후속 작업을 프로세스 바깥의 내구성 있는 저장소로 옮깁니다. 둘 다 지연과 처리량을 얻는 대신 정합성과 단순함을 내줍니다. 이 모듈은 그 대가를 통제 가능한 비용으로 만드는 방법을 다룹니다.

### 세 도구의 정체
| 도구 | 풀려는 문제 | 데이터의 성격 | 내주는 것 |
| 캐시 | 반복 읽기의 지연과 DB 부하 | 원본의 복사본, 없어져도 됨 | 최신성, 무효화 부담 |
| 큐 | 느린 후속 작업, 트래픽 급증 흡수 | 해야 할 일, 처리되면 사라짐 | 즉시성, 중복·순서 보장 |
| 로그 | 여러 소비자의 재생·재처리 | 일어난 사실의 기록, 보관됨 | 운영 복잡도, 소비자 책임 |

가장 중요한 구분은 복사본이냐 원본이냐입니다. 캐시는 잃어도 정답이 바뀌지 않으므로 유실을 허용하고 최신성을 완화하는 쪽으로 설계합니다. 큐의 메시지는 그 자체가 해야 할 일이라서 잃으면 일이 사라지므로, 유실을 허용하지 않는 대신 중복을 허용하는 쪽으로 설계합니다. 철학이 정반대인데 Redis 하나가 두 역할을 다 할 수 있어서, 이 둘을 한 인스턴스에 섞는 순간 사고가 납니다(4강).

### 비동기로 뺄지 정하는 네 가지 질문
1. 사용자가 결과를 응답에 바로 필요로 하는가. 메일 발송, 영수증 PDF, 통계 집계는 필요 없으니 접수 후 202와 상태 조회로 바꿉니다.
2. 실패를 요청자에게 바로 알려야 하는가. 결제 승인은 알려야 하므로 동기로 두고, 그 뒤의 정산과 알림만 뺍니다.
3. 같은 작업이 두 번 실행되어도 괜찮은가. 아니라면 비동기화 전에 멱등성부터 설계합니다(7강).
4. 적체가 생겨도 되는가. 큐는 지연을 숨길 뿐 처리 용량을 만들지 않습니다. 도착률이 처리율을 넘으면 큐는 끝없이 자랍니다(9강).

### 캐시의 수학
캐시의 효과는 평균 지연보다 DB가 받는 부하에서 크게 드러납니다. 초당 2,000건이 들어오고 hit율이 95%이면 DB는 2,000×0.05=100건만 받습니다. 그런데 캐시가 비거나 죽으면 DB는 2,000건, 즉 평소의 20배를 받습니다. hit율이 높을수록 장애 때의 증폭 배수 1/(1-hit)도 커지므로, 99%인 시스템은 캐시가 사라지면 DB가 100배 부하를 맞습니다. AWS Builders' Library가 지적하듯 캐시는 어느새 최적화에서 필수 의존성으로 바뀌고, 평소엔 빠른데 배포 직후나 Redis 재시작 때 서비스가 죽는 외주 현장 사고의 원인이 됩니다(3강).

### 이 모듈의 길
2~5강은 읽기 경로(캐시, Redis, 락, 레이트 리미터), 6~9강은 쓰기 경로(브로커, 멱등성, 아웃박스, 재시도·DLQ·적체), 10강은 의뢰인 상황 하나를 진단부터 납품물까지 푸는 통합 사례입니다. 모든 강의에 같은 두 질문을 던지세요. 이것이 두 번 일어나면 어떻게 되는가, 그리고 이것이 사라지면 어떻게 되는가.`,
      code: `# 캐시 hit율이 DB 부하와 '장애 시 증폭 배수'를 어떻게 결정하는지 계산한다
def db_load(rps: float, hit: float) -> float:
    """캐시 뒤에서 DB가 받는 초당 요청 수(미스 분량)."""
    return rps * (1 - hit)

def blast_factor(hit: float) -> float:
    """캐시가 통째로 비었을 때 DB 부하가 평소의 몇 배가 되는가."""
    return 1 / (1 - hit)

def avg_latency_ms(hit: float, cache_ms: float, db_ms: float) -> float:
    # 미스는 캐시 조회(실패) 비용과 DB 조회 비용을 모두 낸다
    return hit * cache_ms + (1 - hit) * (cache_ms + db_ms)

for hit in (0.80, 0.95, 0.99):
    print(f"hit={hit:.0%}  DB부하={db_load(2000, hit):6.0f}/s  "
          f"장애시 증폭={blast_factor(hit):5.0f}배  "
          f"평균지연={avg_latency_ms(hit, 1, 30):5.2f}ms")
# hit=80%  DB부하=   400/s  장애시 증폭=    5배  평균지연= 7.00ms
# hit=95%  DB부하=   100/s  장애시 증폭=   20배  평균지연= 2.50ms
# hit=99%  DB부하=    20/s  장애시 증폭=  100배  평균지연= 1.30ms`,
      codeLang: `python`,
      key: [
        `캐시는 복사본이라 유실을 허용하고 최신성을 완화하며, 큐 메시지는 원본이라 유실을 허용하지 않고 중복을 허용한다.`,
        `DB 부하 = 요청률 × (1 - hit율). 캐시가 사라지면 부하는 1/(1-hit)배가 되므로 hit율이 높을수록 장애 증폭도 크다.`,
        `비동기로 빼기 전에 결과 필요성, 실패 통지, 중복 허용, 적체 허용 네 가지를 먼저 묻는다.`,
        `비동기는 지연을 숨길 뿐 용량을 만들지 않는다. 도착률이 처리율을 넘으면 큐는 끝없이 자란다.`
      ],
      pitfalls: [
        `캐시와 큐를 같은 Redis 인스턴스에 같은 eviction 정책으로 운영해, 메모리 압박 때 큐 메시지나 세션이 지워지거나 쓰기가 막힌다.`,
        `비동기로 바꾸고 접수 성공 응답만 보고 끝낸다. 후속 작업의 실패와 지연을 사용자나 운영자가 볼 방법(상태 조회, DLQ 알람)이 없다.`,
        `평균 지연만 보고 캐시 효과를 판단한다. p95/p99, 미스 때 DB 부하, 콜드 스타트 상황을 함께 보지 않는다.`
      ]
    },
    {
      title: `캐시 패턴과 무효화: cache-aside·write-through·write-behind와 TTL 설계`,
      body: `캐시 패턴은 누가 캐시를 채우고 누가 지우는가에 대한 약속입니다. 이름을 외우는 것보다, 각 패턴이 DB와 캐시 사이 어디에 낡은 값이 남는 틈을 만드는지를 아는 것이 실무 능력입니다.

### cache-aside (look-aside)
애플리케이션이 캐시와 DB를 직접 오갑니다. 읽기는 캐시 조회, 미스면 DB 조회, 캐시 적재, 반환 순서이고 쓰기는 DB를 먼저 갱신한 뒤 캐시 키를 삭제합니다. Facebook(현 Meta)의 Memcache 운영 논문(NSDI 2013)도 look-aside 캐시를 전제로 합니다. 이 구조는 캐시 계층이 죽어도 DB로 내려가면 서비스가 계속되고, 캐시를 단순한 키-값 저장소로 둘 수 있어 확장이 쉽다는 장점이 있습니다. 외주 프로젝트 대부분은 이 패턴이면 충분합니다.

### read-through, write-through, write-behind
- **read-through**: 미스 처리를 캐시 계층이 대신합니다. 앱 코드는 단순해지지만 캐시 제품과 로더 등록 방식에 종속됩니다.
- **write-through**: 쓰기를 캐시와 DB에 동기로 모두 반영합니다. 읽기는 항상 신선하지만 쓰기 지연이 늘고, 한 번도 읽히지 않을 값이 캐시 공간을 차지합니다.
- **write-behind**: 캐시에만 쓰고 DB 반영은 나중에 모아서 합니다. 쓰기가 빠르지만 캐시가 죽으면 반영 전 쓰기를 잃고, DB를 직접 보는 다른 경로(정산, 관리자 화면)는 낡은 값을 봅니다. 조회수나 좋아요처럼 조금 잃어도 되는 값에만 씁니다.

### 무효화: 갱신보다 삭제, 그리고 남는 경쟁
쓰기 때 캐시를 갱신(set)하기보다 삭제(delete)하는 편이 안전합니다. 두 요청이 동시에 갱신하면 DB에 반영된 순서와 캐시에 반영된 순서가 뒤집힐 수 있기 때문입니다. 삭제하면 다음 읽기가 DB의 최신 값을 다시 가져옵니다. 순서는 반드시 DB 커밋 다음 캐시 삭제입니다. 삭제를 먼저 하면 그 사이 도착한 읽기가 옛 값을 DB에서 읽어 캐시에 다시 적재합니다.

그래도 드문 경쟁이 남습니다. 읽기 A가 DB에서 옛 값을 읽은 직후 쓰기 B가 커밋하고 캐시를 삭제하면, A가 뒤늦게 옛 값을 캐시에 적재해 TTL이 끝날 때까지 낡은 값이 남습니다. 이 경쟁을 비용 없이 없애는 방법은 없습니다. 그래서 설계는 TTL을 안전망으로 두고 허용 가능한 stale 시간을 요구사항 문서로 합의하는 쪽으로 갑니다. Memcache 논문의 lease는 이 문제를 서버가 발급한 토큰으로 줄이는 장치입니다(3강).

### TTL은 비즈니스 결정이다
TTL은 얼마나 낡아도 되는가를 시간으로 쓴 약속입니다. 상품 설명과 카테고리는 분에서 시간 단위, 가격과 재고는 수정 시 삭제에 짧은 TTL을 안전망으로, 권한 정보는 아주 짧게 두거나 캐시하지 않습니다. 모든 키에 같은 TTL을 주면 같은 시각에 채워진 키들이 한꺼번에 만료되므로 ±10~20% 무작위 지터를 더합니다.

### 키 설계와 직렬화
키는 ‹shop:v3:product:123:ko›처럼 서비스, 형식 버전, 엔티티, id, 변형을 담습니다. 배포로 값 형식이 바뀌면 구버전 값을 역직렬화하다 터지는 사고가 나는데, 버전을 키에 넣어 두면 형식을 바꿀 때 버전만 올려 전체를 한 번에 무효화할 수 있습니다. 목록과 검색 결과는 어떤 엔티티가 바뀌어도 영향을 받아 개별 삭제가 어려우므로 짧은 TTL이나 세대 번호 키를 씁니다.

### HTTP 캐시가 먼저다
브라우저와 CDN 캐시(RFC 9111, be-http 모듈)는 같은 문제를 헤더로 푼 것이고, stale-while-revalidate는 곧 soft TTL입니다. 애플리케이션 캐시를 붙이기 전에 Cache-Control과 ETag로 걸러지는 요청부터 처리합니다.`,
      code: `import json, random
import redis

# 캐시 호출 상한 50ms: 느린 캐시는 없는 캐시보다 나쁘다
r = redis.Redis(decode_responses=True, socket_timeout=0.05, socket_connect_timeout=0.05)
BASE_TTL = 300
NEG_TTL = 30                                   # '없음'을 캐시하는 음성 캐시는 짧게(방금 생성된 데이터가 오래 안 보이는 사고 방지)

def key(pid: int) -> str:
    return f"shop:v3:product:{pid}"           # v3: 값 형식이 바뀌면 올려서 일괄 무효화

def get_product(pid: int, load_from_db):
    k = key(pid)
    try:
        hit = r.get(k)
        if hit is not None:
            return json.loads(hit)             # 'null' 문자열이면 None(음성 캐시)
    except redis.RedisError:
        pass                                   # 캐시 장애는 미스로 취급하고 DB로 내려간다
    row = load_from_db(pid)                    # 없으면 None
    try:
        base = BASE_TTL if row is not None else NEG_TTL
        ttl = int(base * random.uniform(0.9, 1.2))       # 지터: 동시 만료 분산
        r.set(k, json.dumps(row), ex=ttl)                # row가 None이면 'null'이 저장된다(음성 캐시)
    except redis.RedisError:
        pass
    return row

def update_product(pid: int, fields: dict, save_to_db) -> None:
    save_to_db(pid, fields)                    # 1) DB 커밋이 먼저(상품 생성 때도 같은 키를 지워 음성 캐시를 걷어낸다)
    try:
        r.delete(key(pid))                     # 2) 그다음 삭제(갱신 아님)
    except redis.RedisError:
        pass                                   # 삭제 실패 시 TTL이 안전망(중요 데이터면 재시도 큐)`,
      codeLang: `python`,
      key: [
        `cache-aside가 기본이다: 읽기는 캐시, DB, 적재 순서이고 쓰기는 DB 커밋 후 캐시 삭제다.`,
        `갱신(set)보다 삭제가 안전하고, 순서는 반드시 DB 커밋 다음 삭제다.`,
        `삭제 뒤에도 드문 경쟁이 남으므로 TTL을 안전망으로 두고 허용 stale 시간을 요구사항으로 합의한다.`,
        `write-behind는 잃어도 되는 값(카운터)에만, TTL에는 지터를, 키에는 형식 버전을 넣는다.`
      ],
      pitfalls: [
        `삭제를 DB 커밋보다 먼저 해서, 그 사이 들어온 읽기가 옛 값을 다시 적재한다.`,
        `캐시 호출에 타임아웃이 없어 캐시가 느려질 때 모든 요청이 캐시 앞에서 멈춘다.`,
        `값 형식이 바뀌는 배포에서 버전 없는 키를 써서 구버전 값이 역직렬화 오류를 낸다.`,
        `사용자별로 달라지는 응답을 사용자 구분 없는 키에 캐시해 다른 사용자에게 노출한다.`
      ]
    },
    {
      title: `캐시 스탬피드·핫 키·장애 격리: 캐시가 비는 순간을 설계한다`,
      body: `캐시가 잘 동작하는 평상시보다 캐시가 비는 순간이 위험합니다. 외주 현장에서 가장 비싼 캐시 사고는 값이 틀린 사고가 아니라, 캐시가 비었을 때 DB가 무너진 사고입니다.

### 스탬피드(thundering herd)
인기 키의 TTL이 만료되는 순간, 값을 다시 만드는 동안 도착한 모든 요청이 같이 미스가 나서 같은 쿼리를 DB로 보냅니다. 한 키를 다시 만드는 데 400ms가 걸리고 그 키에 초당 1,000건이 오면, 만료 직후 400ms 동안 같은 쿼리 약 400건이 동시에 DB를 때립니다. 재계산이 비쌀수록, 키가 뜨거울수록 심해지고, DB가 느려지면 재계산이 더 길어져 악순환이 됩니다.

### 방어 네 가지
1. **요청 병합(single-flight)**: 키당 하나의 요청만 재계산하고 나머지는 기다리거나 낡은 값을 받습니다. 한 프로세스 안에서는 키별 in-flight 맵으로, 여러 서버에 걸쳐서는 ‹SET key token NX PX›로 재계산 권한을 한 명에게만 줍니다.
2. **soft/hard TTL**: 값 안에 soft 만료 시각을 함께 저장하고 Redis TTL은 더 길게(hard) 둡니다. soft가 지난 뒤 첫 요청만 갱신하고 나머지는 낡은 값을 즉시 받습니다. HTTP의 stale-while-revalidate(RFC 5861)와 같은 발상입니다.
3. **지터와 조기 갱신**: 만료 시각을 흩뜨리고, 만료가 임박한 키는 확률적으로 미리 갱신합니다.
4. **사전 워밍**: 이벤트 시작이나 배포 전에 인기 키를 미리 채웁니다.

Facebook의 Memcache 논문은 같은 문제를 서버 쪽 lease로 풉니다. 미스를 낸 클라이언트에게 서버가 토큰을 주고 그 토큰을 가진 쪽만 값을 적재하게 해서 동시 재적재를 줄이고, 그 사이 무효화된 키에 옛 값을 뒤늦게 쓰는 stale set도 거부합니다. 이 모듈을 검수할 때는 논문 소개 페이지(초록)만 직접 읽었으므로, lease의 세부 동작과 수치는 본문 PDF에서 직접 확인하세요.

### 핫 키와 캐시 관통
- **핫 키**: 소수 키에 트래픽이 몰려 Redis 한 노드(클러스터면 한 슬롯)가 포화됩니다. 프로세스 안 L1 캐시(수 초 TTL)로 Redis 호출 자체를 줄이거나, 키를 ‹key#0›~‹key#N-1›로 복제해 무작위로 읽습니다.
- **캐시 관통(penetration)**: 존재하지 않는 키를 반복 조회하면(공격이든 버그든) 항상 미스라 매번 DB를 칩니다. 없다는 결과도 짧은 TTL(수십 초)로 캐시하는 음성 캐시, 입력 검증, 꼭 필요할 때만 블룸 필터를 씁니다.

### 캐시를 필수 의존성으로 만들지 않기
Builders' Library는 캐시가 최적화에서 필수 의존성으로 변하는 과정과 대응을 정리합니다. 요점은 캐시 장애를 미스로 취급하되 DB를 보호하라는 것입니다. 캐시 호출에는 짧은 타임아웃(수십 ms)과 서킷 브레이커를 둡니다. DB 동시 쿼리 수에 상한을 두고 넘으면 낡은 값을 주거나 빠르게 거절합니다(load shedding). 새 인스턴스와 Redis 재시작은 항상 콜드 캐시 구간을 만들므로 워밍 절차를 갖춥니다. 마지막으로 캐시를 끈 상태에서 부하 테스트를 해 보호 장치가 실제로 DB를 지키는지 확인합니다. 트리거가 사라진 뒤에도 재시도와 미스 폭주가 시스템을 나쁜 상태에 가두는 현상은 metastable failure(HotOS 2021)로 정리돼 있습니다.

### 측정
hit율은 ‹keyspace_hits / (keyspace_hits + keyspace_misses)›로 계산합니다(Redis 문서). 여기에 키 그룹별 미스 수, DB 동시 쿼리 수, 재계산 시간, 캐시 장애 시 p99를 대시보드에 둡니다.`,
      code: `import json, time, uuid
import redis

r = redis.Redis(decode_responses=True)
UNLOCK = r.register_script("""
if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end
""")
SOFT, HARD = 60, 600      # soft: 갱신을 시작할 시점, hard: Redis TTL(낡은 값을 보관하는 한계)

def get_or_load(k: str, load, lock_ms: int = 5000):
    raw = r.get(k)
    stale = None
    if raw is not None:
        env = json.loads(raw)                  # {"v": 값, "soft": 갱신 권장 시각}
        if env["soft"] > time.time():
            return env["v"]                    # 신선
        stale = env["v"]                       # soft 만료: 낡았지만 보유 중
    token = uuid.uuid4().hex
    if r.set(f"lock:{k}", token, nx=True, px=lock_ms):   # 한 명만 재계산 권한을 얻는다
        try:
            v = load()
            r.set(k, json.dumps({"v": v, "soft": time.time() + SOFT}), ex=HARD)
            return v
        except Exception:
            if stale is not None:
                return stale                   # stale-if-error: 재계산이 실패하면 낡은 값이라도 제공
            raise
        finally:
            UNLOCK(keys=[f"lock:{k}"], args=[token])     # 내 토큰일 때만 해제
    if stale is not None:
        return stale                           # 다른 요청이 갱신 중이면 낡은 값을 즉시 반환
    for _ in range(20):                        # 완전 미스인데 남이 로딩 중: 짧게 대기 후 재조회
        time.sleep(0.05)
        raw = r.get(k)
        if raw is not None:
            return json.loads(raw)["v"]
    return load()                              # 최후 수단(과부하 시에는 여기서 shed 정책 적용)`,
      codeLang: `python`,
      key: [
        `스탬피드는 만료 순간 같은 쿼리가 동시에 쏟아지는 현상이다. 키 하나당 중복 쿼리 수는 대략 재계산 시간 × 요청률이다.`,
        `방어는 single-flight, soft/hard TTL, 지터와 조기 갱신, 사전 워밍의 조합이다.`,
        `핫 키는 L1 캐시와 키 복제로, 캐시 관통은 음성 캐시와 입력 검증으로 다룬다.`,
        `캐시 장애는 미스로 취급하되 타임아웃과 DB 동시 쿼리 상한으로 보호하고, 캐시를 끈 부하 테스트로 증명한다.`
      ],
      pitfalls: [
        `락 TTL보다 재계산이 오래 걸려 락이 풀리고 다시 여러 요청이 재계산한다. 락 시간은 재계산 p99 기준으로 잡는다.`,
        `락을 고정 문자열로 잡고 DEL로 풀어, 만료 후 다른 요청이 잡은 락을 지운다. 토큰 비교 후 삭제가 필수다.`,
        `캐시 오류를 그대로 위로 던져 Redis가 죽으면 서비스 전체가 에러가 된다.`,
        `음성 캐시 TTL을 길게 잡아 방금 생성된 데이터가 한참 동안 없는 것으로 보인다.`
      ]
    },
    {
      title: `Redis/Valkey 실무: 자료구조·영속성·메모리 정책·라이선스`,
      body: `Redis는 인메모리 자료구조 서버입니다. 캐시, 세션, 카운터, 락, 레이트 리미터, 가벼운 큐까지 한 서버가 해내서 외주에서 가장 자주 만나는 구성요소이고(Stack Overflow 개발자 조사의 데이터베이스 항목에서 Redis 사용률은 2025년 28%, 2026년 28.3%), 그만큼 역할을 섞어 쓰다 사고가 납니다.

### 실행 모델과 자료구조
명령은 기본적으로 한 스레드가 순차 실행합니다. 그래서 개별 명령과 Lua 스크립트는 원자적이고, 반대로 느린 명령 하나가 모든 클라이언트를 막습니다. 운영 중 ‹KEYS *›, 거대한 컬렉션 전체 조회, 큰 키의 ‹DEL›은 금물이고 ‹SCAN›과 ‹UNLINK›를 씁니다. 용도별 선택은 이렇습니다.
- String: 캐시 값, 카운터(‹INCR›), 락 키
- Hash: 객체의 일부 필드만 갱신할 때, 토큰 버킷 상태
- Sorted Set: 순위표, 지연 작업 큐(점수가 실행 시각), 슬라이딩 윈도 로그
- List: 단순 큐. ack가 없어 소비자가 죽으면 작업을 잃으므로 중요한 작업에는 부적합
- Stream: 소비자 그룹과 ack(‹XACK›)가 있는 로그형 큐(6강)

### 영속성: 캐시냐 DB냐
공식 문서 기준으로 RDB는 fork한 자식 프로세스가 기록하는 주기적 스냅샷이라 백업과 빠른 재시작에 좋지만 마지막 몇 분을 잃을 수 있습니다. AOF는 쓰기 명령을 로그로 남기고, 기본 fsync 정책인 everysec이면 장애 때 최대 1초 분량을 잃습니다. 문서는 PostgreSQL에 준하는 안전을 원하면 둘을 함께 쓰라고 하고, 캐시 용도에서는 영속성을 끌 수도 있다고 합니다. 큰 데이터셋에서는 fork 때문에 수 ms에서 최대 약 1초 서비스가 멈출 수 있다는 점도 경고합니다. 판단 질문은 하나입니다. Redis가 통째로 사라졌을 때 정답이 바뀌는가. 바뀌지 않으면 캐시이고, 바뀌면 그 데이터의 원본은 Redis가 아니라 DB여야 합니다. 복제가 비동기라 failover 때 최근 쓰기를 잃을 수 있다는 점도 같은 결론을 뒷받침합니다.

### 메모리 정책
64비트에서 ‹maxmemory› 기본값은 0(무제한)이라, 컨테이너 메모리 한도와 함께 두면 OOM kill로 이어집니다. 한도를 넘었을 때의 행동이 ‹maxmemory-policy›입니다. 공식 문서 기준으로 noeviction은 새 데이터를 쓰는 명령에 오류를 돌려주고, allkeys-lru는 접근이 쏠린 일반 캐시에 좋은 기본값이며, allkeys-lfu는 빈도 기반입니다. volatile-* 계열은 TTL이 있는 키만 대상이라 TTL이 없으면 noeviction처럼 동작합니다. volatile-* 계열은 캐시와 영속 키를 한 인스턴스에 둘 때를 위한 정책이지만, 문서도 가능하면 인스턴스를 둘로 나누라고 권합니다. 복제·AOF 버퍼는 maxmemory 계산에 포함되지 않으므로 여유를 남깁니다.

### 클러스터와 모니터링
Redis Cluster는 키를 16384개 해시 슬롯으로 나눠 노드에 배분합니다. 여러 키를 한 번에 다루는 명령과 Lua는 같은 슬롯의 키끼리만 가능해서 해시 태그(‹{user:42}:cart›처럼 중괄호 안만 해시)로 묶어야 합니다. 관측은 ‹INFO stats›의 keyspace_hits/misses, evicted_keys, expired_keys와 메모리 지표로 합니다.

### 제품 선택과 라이선스 (2026-11 기준)
Redis 공식 저장소 README 기준으로 Redis는 7.2 이하가 BSD, 7.4~7.8이 RSALv2/SSPLv1, 8.0 이상은 RSALv2·SSPLv1·AGPLv3 중 선택이고, Valkey는 Linux Foundation이 후원하는 BSD 포크이고 지원 라인은 9.1·9.0·8.x·7.2입니다(9.1.3과 9.0.7이 2026-10-26~27 릴리스). 내부 서비스에서 쓰기만 하는 경우 영향이 작은 경우가 많지만 제품에 넣어 재배포하거나 관리형 서비스로 제공한다면 조건이 달라집니다. 법률 자문은 아니니 의뢰인 법무가 확인하게 하고, 클라우드 관리형 캐시는 제공사가 지원하는 엔진과 버전을 문서로 확인합니다. Redis 8에 통합된 JSON·검색·벡터 세트는 이미 Redis를 쓰는 작은 시스템의 단순화 수단일 수는 있어도 DB 대체가 아니므로 영속성 요구와 라이선스를 함께 따져 판단합니다.`,
      code: `# ===== redis-cache.conf : 순수 캐시(잃어도 정답이 바뀌지 않는다) =====
maxmemory 1gb
maxmemory-policy allkeys-lru     # 가득 차면 덜 쓰는 키부터 퇴출(정상 동작)
save ""                          # RDB 스냅샷 끔
appendonly no                    # AOF 끔

# ===== redis-state.conf : 세션·카운터 등 잃으면 곤란한 값(별도 인스턴스) =====
maxmemory 512mb
maxmemory-policy noeviction      # 가득 차면 쓰기를 거절한다(조용히 지우지 않는다)
appendonly yes
appendfsync everysec             # 장애 시 최대 약 1초 손실
save 3600 1                      # 백업·빠른 재시작용 RDB 병용(1시간에 1건 이상 변경 시)

# 관측(redis-cli): hit율 = keyspace_hits / (keyspace_hits + keyspace_misses)
#   redis-cli INFO stats | grep -E "keyspace_(hits|misses)|evicted_keys|expired_keys"`,
      codeLang: `conf`,
      key: [
        `명령은 기본적으로 한 스레드가 실행한다. 개별 명령은 원자적이지만 느린 명령 하나가 전체를 막으므로 KEYS는 금지하고 SCAN과 UNLINK를 쓴다.`,
        `판단 기준은 Redis가 사라졌을 때 정답이 바뀌는가이다. 바뀌면 원본은 DB다.`,
        `캐시 인스턴스는 allkeys-lru(또는 lfu)와 TTL과 영속성 끔, 상태 저장 인스턴스는 noeviction과 AOF everysec(+RDB)로 분리한다.`,
        `maxmemory 기본은 0(무제한)이고, volatile-* 정책은 TTL 없는 키를 지우지 못한다.`,
        `라이선스(2026-11 기준)는 Redis 8 이상이 3택, Valkey는 BSD다. 납품 전에 의뢰인 법무와 관리형 지원 엔진을 확인한다.`
      ],
      pitfalls: [
        `세션·작업 대기열·락과 캐시를 한 인스턴스에 두고 allkeys-lru를 켜서 로그인 세션이나 작업이 퇴출된다.`,
        `maxmemory 없이 컨테이너 메모리 한도만 둬서 트래픽이 늘면 OOM kill로 데이터와 서비스를 한꺼번에 잃는다.`,
        `Redis를 공인 IP에 인증 없이 열어 둔다. 내부망 바인딩, ACL과 비밀번호, TLS, 보안 그룹 제한이 기본이다.`,
        `클러스터에서 서로 다른 슬롯의 키를 묶는 MGET·Lua를 쓰다 운영 환경에서야 오류를 만난다.`
      ]
    },
    {
      title: `분산 락과 레이트 리미터: 락의 한계와 원자적 토큰 버킷`,
      body: `락과 레이트 리미터는 둘 다 Redis의 원자적 명령으로 만들 수 있어서 쉬워 보이지만, 락은 틀리게 만들기 쉽고 레이트 리미터는 정확하게 만들기 쉽습니다. 차이는 실패했을 때 무엇이 깨지는가에 있습니다.

### 락이 필요하다고 느낄 때 먼저 할 일
동시에 두 번 실행되면 안 되는 일(쿠폰 중복 발급, 재고 차감, 스케줄러 중복 실행)이 생기면 락부터 떠올리지만 대개 더 싼 답이 있습니다. 유니크 제약, ‹UPDATE ... WHERE stock > 0› 같은 조건부 갱신, version 컬럼 기반 낙관적 락, ‹SELECT ... FOR UPDATE›는 모두 데이터가 있는 곳에서 규칙을 강제하므로 락 서비스가 틀려도 데이터는 맞습니다.

### 효율용 락과 정확성용 락
Kleppmann의 2016년 글이 정리한 구분입니다. 효율용 락은 같은 계산을 두 번 하지 않으려는 용도라서 가끔 깨져도 비용만 조금 늘고, 정확성용 락은 깨지면 데이터가 망가집니다. 스탬피드 방지(3강)나 크론 작업 중복 방지는 효율용에 가깝고, 재고·결제·쿠폰은 정확성용입니다.

### Redis로 만드는 락의 모양
‹SET lock:order:42 TOKEN NX PX 30000›은 키가 없을 때만 만들고 30초 뒤 자동 삭제합니다. TOKEN은 추측 불가능한 난수여야 하고, 해제는 값이 내 token일 때만 지우는 Lua 스크립트로 합니다. 그렇지 않으면 내 락이 만료된 뒤 다른 클라이언트가 잡은 락을 내가 지웁니다. Redis 8.4부터는 ‹DELEX lock:order:42 IFEQ TOKEN›으로 값이 같을 때만 지우는 동작을 Lua 없이 한 명령으로 할 수 있습니다(2026-11 기준, 8.4 미만 버전이나 다른 엔진·관리형 서비스는 지원 여부를 따로 확인). 공식 SET 문서는 이 패턴을 소개하면서도 여러 노드를 쓰는 Redlock이 더 나은 보장을 준다는 이유로 이 단순 패턴을 권하지 않는다고 적어 둡니다.

### 정확성 락이 위험한 이유: 만료와 정지
클라이언트 A가 TTL 30초 락을 얻고 일하다가 GC, VM 정지, 네트워크 지연으로 35초 멈췄다고 합시다. 그 사이 락이 만료돼 B가 락을 얻어 쓰기를 마칩니다. 깨어난 A는 아직 락을 쥐었다고 믿고 쓰기를 해서 B의 결과를 덮어씁니다. 쓰기 직전에 만료를 검사해도 검사와 쓰기 사이에 정지가 일어날 수 있어 막지 못합니다. Kleppmann의 해법은 fencing token입니다. 락을 줄 때마다 단조 증가하는 번호를 발급하고, 보호 대상 저장소가 지금까지 본 가장 큰 번호보다 낮은 쓰기를 거절합니다. 그는 Redlock에 이런 번호를 만드는 장치가 없고 안전성이 네트워크 지연·프로세스 정지·시계 오차의 상한이라는 시간 가정에 기댄다고 비판하며, 단일 Redis 락은 효율용에만 권합니다. 정확성이 걸린 곳에는 ZooKeeper 같은 합의 기반 시스템의 번호(zxid)를 fencing token으로 쓰라고 제안합니다. Redlock의 저자 쪽에서 반론이 나와 논쟁이 이어졌다는 사실만 기억하고, 정확성이 걸린 곳은 제품 논쟁 대신 설계로 풉니다. DB 쓰기에서 fencing은 ‹UPDATE ... SET fence = :t WHERE id = :id AND fence < :t›처럼 번호 비교를 조건에 넣으면 됩니다(6강의 attempts 컬럼이 같은 역할을 합니다).

### 레이트 리미터 알고리즘
| 방식 | 특징 | 주의 |
| 고정 윈도 | 구현이 가장 단순 | 윈도 경계에서 한도의 최대 2배가 순간 통과 |
| 슬라이딩 로그 | 정확 | 요청마다 기록해 메모리가 요청 수에 비례 |
| 슬라이딩 카운터 | 두 윈도를 가중 평균한 근사, 저메모리 | 근사 오차 |
| 토큰 버킷 | 평균 속도와 버스트를 따로 설정 | 가장 널리 쓰이는 선택 |

분산 환경의 핵심은 원자성입니다. 읽고, 계산하고, 쓰는 과정을 클라이언트에서 나눠 하면 동시 요청이 서로의 값을 덮습니다. Lua 스크립트는 Redis 안에서 한 번에 실행되므로 이를 해결하고, 시간은 앱 서버 시계가 아니라 Redis의 TIME으로 읽어 서버 간 시계 편차를 피합니다. ‹INCR› 후 ‹EXPIRE›를 따로 호출하는 흔한 구현은 두 호출 사이에 죽으면 TTL 없는 키가 남아 사용자가 영구 차단됩니다.

### 응답과 장애 정책
한도를 넘으면 429와 Retry-After(RFC 6585)로 다시 시도할 시점을 알려 줍니다. 식별 키는 사용자나 API 키를 우선하고, IP는 NAT와 프록시 뒤에서 부정확하며 X-Forwarded-For를 신뢰할 범위를 정해야 합니다. Redis가 죽었을 때는 로그인·결제처럼 남용 방어가 중요한 곳은 fail-closed, 일반 조회 API는 fail-open에 프로세스 내 보조 제한을 두는 식으로 엔드포인트별 정책을 정해 문서화합니다.`,
      code: `import redis

# 토큰 버킷: 초당 rate개 보충, 최대 burst개 저장. Redis 5 이상(TIME을 스크립트 안에서 사용)
TOKEN_BUCKET = """
local rate  = tonumber(ARGV[1])
local burst = tonumber(ARGV[2])
local cost  = tonumber(ARGV[3])
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)   -- Redis 시계(ms)
local s = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(s[1])
local ts = tonumber(s[2])
if tokens == nil then tokens = burst; ts = now end
tokens = math.min(burst, tokens + (now - ts) * rate / 1000)
local allowed = 0
if tokens >= cost then tokens = tokens - cost; allowed = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(burst / rate * 1000) + 1000)   -- 쓰지 않는 키는 정리
return {allowed, math.floor(tokens)}
"""

r = redis.Redis(decode_responses=True)
bucket = r.register_script(TOKEN_BUCKET)

def allow(client_id: str, rate: float = 5, burst: int = 10):
    """(허용 여부, 남은 토큰). 거절하면 호출자가 429 + Retry-After를 응답한다."""
    ok, left = bucket(keys=[f"rl:{client_id}"], args=[rate, burst, 1])
    return bool(ok), left`,
      codeLang: `python`,
      key: [
        `락을 쓰기 전에 유니크 제약, 조건부 UPDATE, 낙관적 락으로 풀 수 있는지 먼저 본다.`,
        `효율용 락은 SET NX PX와 난수 토큰과 토큰 비교 해제로 충분하지만, 정확성용 락은 lease만으로 안전하지 않다(만료와 정지).`,
        `정확성은 fencing token(단조 증가 번호를 저장소가 검증)이나 DB 제약으로 보장한다.`,
        `레이트 리미터는 토큰 버킷을 Lua로 원자 실행하고, 시간은 Redis TIME을 쓰며, 거절은 429와 Retry-After로 알린다.`,
        `Redis 장애 시 fail-open/fail-closed 정책을 엔드포인트별로 정하고 문서화한다.`
      ],
      pitfalls: [
        `락 TTL보다 작업이 길어질 수 있는데 연장도 fencing도 없이 쿠폰·재고 정합성을 락에 맡긴다.`,
        `락 값을 고정 문자열로 두고 DEL로 풀어 남의 락을 지운다.`,
        `INCR 뒤 EXPIRE를 따로 호출해, 중간에 죽으면 TTL 없는 카운터가 사용자를 영구 차단한다.`,
        `고정 윈도만 쓰고 경계 버스트를 시험하지 않아 한도의 2배 트래픽이 하류로 흘러간다.`
      ]
    },
    {
      title: `큐·로그·pub/sub와 브로커 선택: SQS·RabbitMQ·Kafka·PostgreSQL 큐`,
      body: `비동기 처리의 두 번째 축은 쓰기 경로의 작업을 맡기는 일입니다. 제품 이름보다 모델을 먼저 구분해야 선택이 흔들리지 않습니다.

### 큐, 로그, pub/sub
| 모델 | 메시지의 운명 | 소비자 | 재생 |
| 작업 큐(SQS, RabbitMQ) | ack하면 삭제 | 경쟁 소비, 소비자 수가 병렬도 | 불가 |
| 로그(Kafka) | 보존 기간 동안 유지, 소비와 무관 | 그룹별 오프셋, 그룹 간 독립 | 오프셋 되감기로 가능 |
| pub/sub(Redis Pub/Sub) | 연결된 구독자에게만 전달, 아니면 소멸 | 전원에게 팬아웃 | 불가 |

큐에서는 브로커가 메시지마다 상태(대기, 처리 중, 완료)를 추적하고, 로그에서는 브로커가 같은 순서의 기록만 보관하며 소비자가 어디까지 읽었는지(오프셋)를 기억합니다. 이 차이가 나머지를 결정합니다. 로그는 소비자 하나가 느려도 다른 그룹에 영향이 없고 과거를 다시 읽을 수 있지만, 같은 그룹 안에서는 파티션 하나를 한 소비자만 읽으므로 병렬도 상한이 파티션 수입니다. Kafka 논문(NetDB 2011)은 순차 I/O, 배치, 소비자 pull로 처리량을 얻는다고 설명하고, 논문 실험에서 배치 1건과 50건의 게시 처리량이 초당 약 5만 건과 40만 건이었습니다(2011년 수치이니 현재 제품 성능과 구분하세요). Redis Pub/Sub은 알림 브로드캐스트나 캐시 무효화 신호에는 맞지만 작업 전달에는 쓰면 안 됩니다.

### 브로커별 사실 (2026-11 기준, 공식 문서 확인분)
- **SQS**: Standard는 최소 한 번 전달이고 FIFO는 메시지 그룹 안에서 순서를 지키며 5분 중복 제거 구간이 있습니다. 가시성 타임아웃은 기본 30초에 최대 12시간이고 ChangeMessageVisibility로 연장합니다. Standard의 처리 중(in-flight) 메시지는 약 12만 건이 한도이고, 보존은 기본 4일에 최대 14일입니다.
- **RabbitMQ**: exchange가 규칙에 따라 큐로 라우팅하고, 소비자 ack와 생산자 publisher confirm으로 신뢰성을 만듭니다. quorum queue는 Raft 복제 큐이고 4.0부터 기본 delivery-limit이 20이며, 공식 문서는 적체가 500만 건 이상으로 길어지는 큐에는 stream이 더 맞다고 안내합니다. 릴리스 지원 종료일 표는 조사 시점에 공식 페이지 안에서도 날짜가 어긋나 있었으니 도입 전에 직접 확인하세요.
- **Kafka**: 4.0(2025-03-18)부터 ZooKeeper 없이 KRaft만 씁니다. 새 소비자 그룹 프로토콜(KIP-848)이 4.0에서 GA됐지만 4.4 문서의 group.protocol 기본값은 여전히 classic입니다. 큐 의미론을 주는 share group은 비교적 새 기능이라 4.4(2026-10-22)에서 DLQ(KIP-1191)가 추가됐으며, 채택 전에 릴리스 노트로 상태를 확인합니다.
- **Redis Streams**: 소비자 그룹과 ack를 가진 가벼운 로그형 큐이지만, 내구성은 Redis의 영속성과 비동기 복제 한계를 그대로 물려받습니다.
- **PostgreSQL 큐**: ‹FOR UPDATE SKIP LOCKED›로 잠긴 행을 건너뛰며 여러 워커가 안전하게 작업을 집습니다. 공식 문서는 이 옵션이 큐처럼 쓰는 테이블의 경합 회피용이며 범용 용도에는 부적합하다고 밝힙니다. 이미 DB가 있고 처리량이 낮을 때(대략 초당 수십~수백 건까지를 출발점으로 보는 경험칙이며 검증된 상한이 아닙니다. 행 크기·인덱스·폴링 방식에 따라 크게 달라지니 직접 측정하세요) 인프라 추가 없이 쓸 수 있고, 업무 쓰기와 작업 등록을 한 트랜잭션에 넣을 수 있다는 큰 이점이 있습니다.

### 순서와 파티셔닝
전역 순서는 병렬성을 포기해야 얻습니다. 실무에 필요한 것은 대개 같은 주문의 이벤트끼리의 순서이고, 이는 키 기반 파티셔닝(Kafka의 메시지 키, SQS FIFO의 MessageGroupId)으로 얻습니다. 대가가 있습니다. 한 고객에게 트래픽이 몰리면 그 파티션이나 그룹이 병목이고, 실패 메시지 하나가 뒤의 메시지를 막으며(head-of-line blocking), 파티션 수를 늘리면 키와 파티션의 매핑이 바뀌어 순서가 일시적으로 깨질 수 있습니다.

### 선택 규칙 (제안)
승격은 근거가 생길 때만 합니다. 1) 이미 DB가 있고 부하가 낮으면 PostgreSQL 큐와 아웃박스, 2) AWS에서 단순 작업 큐면 SQS(팬아웃이 필요하면 SNS 병용), 3) 복잡한 라우팅·우선순위·낮은 지연이 필요하면 RabbitMQ, 4) 재생, 다수 소비자, 고처리량 스트림, CDC가 필요하면 Kafka. 며칠에서 몇 주 걸리는 다단계 업무는 큐가 아니라 Temporal 같은 내구 실행 엔진이 맞는 경우가 많습니다.`,
      code: `-- PostgreSQL 작업 큐: SKIP LOCKED + lease(임대 시간) + 시도 번호
CREATE TABLE job (
  id           bigserial   PRIMARY KEY,
  kind         text        NOT NULL,
  payload      jsonb       NOT NULL,
  state        text        NOT NULL DEFAULT 'ready',      -- ready | running | done | dead
  attempts     int         NOT NULL DEFAULT 0,
  run_at       timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz
);
CREATE INDEX job_claim_idx ON job (run_at) WHERE state IN ('ready', 'running');

-- 1) 가져오기: 대기 중이거나 lease가 만료된 작업 하나를 잠그고 running으로 바꾼다
UPDATE job SET state = 'running', attempts = attempts + 1,
               locked_until = now() + interval '5 minutes'
WHERE id = (
  SELECT id FROM job
  WHERE (state = 'ready' AND run_at <= now())
     OR (state = 'running' AND locked_until < now())
  ORDER BY run_at LIMIT 1
  FOR UPDATE SKIP LOCKED)
RETURNING id, kind, payload, attempts;

-- 2) 완료: 내가 받은 attempts가 그대로일 때만(lease가 만료돼 남이 가져갔다면 0행: fencing)
UPDATE job SET state = 'done', locked_until = NULL
WHERE id = $1 AND attempts = $2 AND state = 'running';

-- 3) 실패: 지수 백오프로 run_at을 미루고, 5회째면 dead
UPDATE job SET state = CASE WHEN attempts >= 5 THEN 'dead' ELSE 'ready' END,
               run_at = now() + interval '1 second' * 2 ^ attempts, locked_until = NULL
WHERE id = $1 AND attempts = $2 AND state = 'running';

-- 주의: 워커를 죽이는 포이즌 작업은 3)의 실패 경로를 타지 못한다. 1)의 조건에 attempts < 5를 넣거나
-- 별도 감시 쿼리로 attempts가 한도를 넘은 running 행을 dead로 옮겨야 무한 크래시 루프를 막는다.`,
      codeLang: `sql`,
      key: [
        `큐는 ack하면 삭제되는 경쟁 소비, 로그는 보존 기간 동안 남아 오프셋으로 읽는 재생 가능 모델, pub/sub은 연결된 구독자에게만 가는 휘발성 전달이다.`,
        `Kafka 병렬도 상한은 파티션 수이고, 순서는 파티션(키) 안에서만 보장된다. SQS FIFO는 메시지 그룹 안에서 보장된다.`,
        `SQS는 가시성 타임아웃 기본 30초·최대 12시간, FIFO 중복 제거 5분, RabbitMQ quorum 기본 delivery-limit 20(2026-11 기준).`,
        `이미 DB가 있고 부하가 낮으면 SKIP LOCKED 큐가 가장 싼 출발점이며, 승격은 재생·팬아웃·처리량이라는 근거가 생길 때 한다.`
      ],
      pitfalls: [
        `Redis Pub/Sub이나 List로 중요한 작업을 전달해 소비자가 잠시 죽는 사이 작업을 잃는다.`,
        `나중에 커질 것 같다는 이유만으로 Kafka를 고른다. 브로커, 파티션, 스키마, 소비자 그룹 운영 비용은 의뢰인이 납품 후 감당한다.`,
        `파티션이나 FIFO 그룹 키를 고객 ID처럼 쏠리는 값으로 잡아 한 파티션이 병목이 된다.`,
        `DB 큐에서 완료 행을 계속 쌓아 두어 테이블이 비대해지고 가져오기 쿼리가 느려진다.`
      ]
    },
    {
      title: `전달 보장과 멱등 소비자: at-least-once를 전제로 한 설계`,
      body: `큐를 도입하는 순간 가장 먼저 부딪히는 사실은 메시지가 두 번 올 수 있다는 것입니다. 이것을 버그가 아니라 전제로 받아들이고 설계하는 것이 비동기 백엔드의 핵심 역량입니다.

### 왜 정확히 한 번 전달은 없는가
소비자가 처리를 끝내고 ack를 보냈는데 ack가 네트워크에서 사라지면 브로커는 처리 여부를 알 수 없어 재전달합니다. 처리 후 ack 전에 소비자가 죽어도 같습니다. 반대로 ack를 먼저 보내고 처리하면 처리 전에 죽을 때 작업이 유실됩니다. 처리와 ack를 원자적으로 묶을 수 없으니 선택지는 둘입니다. **at-most-once**(유실 가능, 중복 없음)와 **at-least-once**(중복 가능, 유실 없음). 흔히 말하는 exactly-once는 at-least-once에 멱등 처리를 더해 효과가 한 번만 나타나게 만든 것입니다.

### 중복이 생기는 곳
1. 생산자 재시도: 브로커는 받았는데 응답만 잃어 다시 보냄
2. 소비자 크래시: 처리 완료 후 ack 전
3. 처리 시간이 가시성 타임아웃(SQS)이나 max.poll.interval.ms(Kafka 기본 5분)를 넘겨 재전달과 리밸런스 발생
4. 브로커 장애 전환과 네트워크 분리
5. 아웃박스 릴레이의 재발행(8강), 사람의 DLQ 재투입

### Kafka의 exactly-once는 어디까지인가
생산자의 enable.idempotence는 기본 true입니다(acks=all, retries 0 초과, max.in.flight.requests.per.connection 5 이하가 요건이고 충돌하는 설정을 명시하면 오류, Kafka 4.4 문서 2026-11 기준). 생산자 ID와 파티션별 시퀀스 번호로 브로커가 재시도 중복을 걸러냅니다(KIP-98). 트랜잭션은 여러 파티션 쓰기와 소비 오프셋 커밋을 원자적으로 묶고, 소비자는 isolation.level=read_committed여야 중단된 트랜잭션의 레코드를 보지 않습니다(기본은 read_uncommitted). 하지만 범위는 Kafka에서 읽고 Kafka에 쓰는 처리까지입니다. 이메일, 결제 API 호출, 외부 DB 쓰기 같은 부수효과는 보장 밖이라 같은 문제가 남습니다. 공식 설계 문서도 외부 시스템에는 상대의 협조가 필요하다고 설명합니다.

### 멱등 소비자를 만드는 세 가지 방법
1. **자연 멱등**: 증가가 아니라 절대값 대입(‹SET status='PAID'›), upsert, 이 이벤트까지 반영 같은 형태로 쓰고, 상태 기계로 PAID에서 PAID는 no-op, CANCELLED에서 PAID 같은 역행은 거부합니다.
2. **dedup 테이블**: ‹processed_message(consumer, msg_id)›에 유니크 제약을 두고 업무 쓰기와 같은 DB 트랜잭션에서 INSERT합니다. 충돌하면 중복입니다. Redis ‹SETNX›로 중복을 확인한 뒤 DB에 쓰는 방식은 두 저장소 사이가 원자적이지 않아서, SETNX 후 DB 실패면 영구 유실이고 순서를 뒤집으면 중복이 생깁니다. dedup 기록의 보존 기간은 재전달이 가능한 최대 기간보다 길어야 합니다.
3. **외부 호출에 멱등 키 전달**: 결제 API나 메일 API가 Idempotency-Key를 받으면 워커가 같은 키로 재시도해 상대 쪽 중복을 막습니다.

### 멱등 키 API의 요건
AWS Builders' Library는 클라이언트가 준 토큰을 상태 변경과 원자적으로 저장하고, 같은 토큰의 재요청에는 의미상 같은 응답을, 파라미터가 다르면 검증 오류를 돌려주라고 설명합니다. Stripe 문서는 첫 요청의 상태 코드와 본문을 저장해 재생하고(500 포함), 키 최대 길이 255자, 24시간이 지난 키는 삭제될 수 있다고 합니다(2026 접속본). IETF Idempotency-Key 초안(draft-08, 2026-10-22, 만료 2027-04-25이며 아직 초안)은 진행 중인 같은 키에 409, 다른 페이로드에 422, 필수인데 누락이면 400을 권합니다.

### 키는 무엇으로 정하나
메시지 ID로 dedup하면 생산자가 재시도하며 새 ID를 만드는 경우를 막지 못합니다. 결제 ID와 이벤트 종류, 아웃박스 이벤트 ID처럼 업무에 묶인 키가 안전합니다. 순서가 뒤집힐 수 있다면 이벤트에 버전이나 시퀀스를 넣어 낡은 이벤트를 무시합니다.`,
      code: `# 스키마(요약)
#   processed_message(consumer text, msg_id text, PRIMARY KEY (consumer, msg_id))
#   account(id bigint PRIMARY KEY, balance bigint NOT NULL)
import psycopg

# conn: psycopg.connect(..., autocommit=True) 연결을 가정한다
def on_message(conn: psycopg.Connection, msg_id: str, account_id: int, amount: int) -> str:
    """같은 msg_id가 몇 번 와도 잔액은 한 번만 바뀐다. 이 함수가 반환한 뒤에만 브로커에 ack한다."""
    with conn.transaction():                       # dedup 기록과 업무 쓰기를 한 트랜잭션으로
        cur = conn.execute(
            "INSERT INTO processed_message (consumer, msg_id) VALUES (%s, %s) "
            "ON CONFLICT DO NOTHING",
            ("billing", msg_id),
        )
        if cur.rowcount == 0:                      # 이미 처리된 메시지
            return "duplicate"
        conn.execute(
            "UPDATE account SET balance = balance - %s WHERE id = %s",
            (amount, account_id),
        )
    return "applied"                               # 커밋 성공 후에만 ack`,
      codeLang: `python`,
      key: [
        `처리와 ack를 원자적으로 묶을 수 없으므로 at-least-once가 현실이고, exactly-once 효과는 at-least-once에 멱등 처리를 더해 만든다.`,
        `중복은 생산자 재시도, ack 전 크래시, 타임아웃 초과, 장애 전환, 릴레이 재발행, DLQ 재투입에서 생긴다.`,
        `Kafka의 exactly-once는 Kafka 안(읽기-쓰기-오프셋 커밋)에서만 성립하고, 외부 부수효과는 멱등 키와 dedup으로 따로 막는다.`,
        `dedup 키는 업무 쓰기와 같은 DB 트랜잭션의 유니크 제약으로 기록하고, 키는 메시지 ID보다 업무 단위로 정한다.`
      ],
      pitfalls: [
        `Redis SETNX로 중복을 확인한 뒤 DB에 쓴다. 두 저장소 사이에는 원자성이 없어 유실이나 중복이 생긴다.`,
        `ack를 처리 전에 보내 처리 도중 죽으면 작업이 조용히 사라진다.`,
        `dedup 기록을 1시간만 보존하는데 DLQ 재투입이 며칠 뒤라 같은 메시지가 다시 적용된다.`,
        `메시지 ID로만 dedup하는데 생산자의 재시도가 새 ID를 발급해 중복을 막지 못한다.`
      ]
    },
    {
      title: `아웃박스·CDC·사가: DB 갱신과 메시지 발행을 함께 맞추는 법`,
      body: `주문을 DB에 저장하고 재고·알림 서비스에 메시지를 보내는 흔한 코드에는 숨은 결함이 있습니다. DB 쓰기와 메시지 발행이 서로 다른 시스템이라 둘을 한꺼번에 성공시키거나 실패시킬 수 없다는 것입니다. 이중 쓰기(dual write) 문제입니다.

### 어떻게 깨지는가
- 커밋 후 발행: 커밋과 발행 사이에 프로세스가 죽거나 배포로 종료되면 주문은 있는데 메시지는 없습니다. 재고가 차감되지 않고 알림이 안 갑니다.
- 발행 후 커밋: 발행은 됐는데 커밋이 실패하거나 롤백되면 없는 주문에 대한 유령 메시지가 나갑니다.
- 2PC(XA): 두 시스템이 모두 지원해야 하고, 코디네이터 장애 때 락이 오래 잡히며, 대부분의 브로커가 지원하지 않아 실무에서는 거의 쓰지 않습니다.

### 트랜잭셔널 아웃박스
메시지를 브로커에 바로 보내지 않고, 업무 데이터를 바꾸는 같은 DB 트랜잭션에서 outbox 테이블에 행으로 INSERT합니다. 둘은 함께 커밋되거나 함께 롤백됩니다. 메시지 릴레이가 outbox를 읽어 브로커로 발행하고 발행 완료를 표시합니다. 릴레이 방식은 두 가지입니다. 폴링 퍼블리셔는 주기적으로 미발행 행을 조회하고, 로그 테일링(CDC)은 DB의 트랜잭션 로그를 읽는 도구(예: Debezium)가 outbox 변경을 스트림으로 내보냅니다. 소규모 프로젝트는 폴링으로 충분하고, CDC는 지연이 낮고 폴링 부하가 없지만 커넥터 운영 부담이 늘어납니다.

릴레이가 발행에 성공하고 완료 표시 전에 죽으면 같은 메시지를 다시 발행합니다. 따라서 아웃박스의 결과는 at-least-once이고 소비자 멱등성(7강)이 짝이 되어야 합니다. 같은 집합체(aggregate)의 순서를 지키려면 id 순으로 읽는 릴레이를 하나만 두거나 집합체별로 담당을 나눠야 하고, 여러 릴레이가 ‹SKIP LOCKED›로 경쟁하면 순서가 뒤섞일 수 있습니다. 운영에서는 발행 완료 행을 삭제하거나 파티셔닝해 테이블 비대화를 막고, 가장 오래된 미발행 행의 나이를 핵심 알람으로 둡니다.

### 사가: 분산 트랜잭션 없는 긴 업무
주문, 결제, 재고처럼 여러 단계와 서비스에 걸친 업무는 각 단계를 로컬 트랜잭션으로 두고, 실패하면 앞 단계를 되돌리는 보상 트랜잭션을 실행합니다. Garcia-Molina와 Salem의 1987년 논문 Sagas가 긴 트랜잭션을 짧은 트랜잭션의 열과 단계별 보상으로 쪼갠 것이 원형입니다. 조율 방식은 둘입니다. 코레오그래피는 각 서비스가 이벤트에 반응해 다음 이벤트를 내는 방식으로 단순하지만 전체 흐름을 추적하기 어렵습니다. 오케스트레이션은 조정자가 상태를 갖고 단계를 지시해서 흐름이 명시적이지만 조정자가 복잡도의 중심이 됩니다.

보상은 의미적(semantic)입니다. 이미 나간 이메일은 취소할 수 없어 정정 메일을 보내고, 환불은 실패할 수 있으니 보상도 멱등·재시도·수동 개입 경로를 가져야 합니다. 사가에는 격리가 없어 중간 상태가 외부에 보이므로 PENDING 같은 중간 상태를 모델에 넣습니다. Helland의 CIDR 2007 논문은 같은 문제를 규모가 커지면 전역 트랜잭션 대신 엔티티 하나 안의 로컬 트랜잭션과 엔티티 사이의 at-least-once 메시징, 멱등 처리로 풀라고 주장하며, 불확실성을 업무 모델(예약과 확정, 취소)로 흡수하라고 말합니다.

### 소규모 외주의 현실적 선택
모놀리스에서 상태 컬럼, 아웃박스, 멱등 핸들러, 주기적 대사(reconciliation) 배치를 갖추는 쪽이 사가 프레임워크보다 대부분 낫습니다. 단계가 많고 수일이 걸리거나 사람 승인이 끼는 흐름이라면 워커가 죽어도 이력 재생으로 재개하는 내구 실행(Temporal 등)을 검토합니다.`,
      code: `import psycopg
from psycopg.types.json import Jsonb

# 스키마(요약): orders(id bigserial PK, user_id, total, status)
#   outbox(id bigserial PK, aggregate_id, type, payload jsonb, published_at timestamptz NULL)
# conn: psycopg.connect(..., autocommit=True) 연결을 가정한다
def place_order(conn: psycopg.Connection, user_id: int, total: int) -> int:
    with conn.transaction():                       # 주문과 outbox가 함께 커밋되거나 함께 롤백된다
        order_id = conn.execute(
            "INSERT INTO orders (user_id, total, status) VALUES (%s, %s, 'placed') RETURNING id",
            (user_id, total),
        ).fetchone()[0]
        conn.execute(
            "INSERT INTO outbox (aggregate_id, type, payload) VALUES (%s, 'OrderPlaced', %s)",
            (order_id, Jsonb({"order_id": order_id, "total": total})),
        )
    return order_id

def relay_once(conn: psycopg.Connection, publish, batch: int = 100) -> int:
    """publish(key, value, event_id)는 브로커의 확인(ack)을 받은 뒤 반환해야 한다. 실패하면 예외.
    발행 동안 행 잠금과 트랜잭션이 열려 있으므로 batch를 작게 유지한다. 릴레이가 하나일 때만 id 순서가 보존된다."""
    with conn.transaction():
        rows = conn.execute(
            "SELECT id, aggregate_id, type, payload FROM outbox "
            "WHERE published_at IS NULL ORDER BY id LIMIT %s FOR UPDATE SKIP LOCKED",
            (batch,),
        ).fetchall()
        for event_id, agg_id, etype, payload in rows:
            publish(key=str(agg_id), value=payload, event_id=event_id)   # 예외면 전체 롤백 후 재시도
        if rows:
            conn.execute("UPDATE outbox SET published_at = now() WHERE id = ANY(%s)",
                         ([r[0] for r in rows],))
    return len(rows)   # 발행 후 커밋 전에 죽으면 재발행된다: 소비자는 event_id로 멱등 처리`,
      codeLang: `python`,
      key: [
        `DB 쓰기와 메시지 발행은 이중 쓰기라서 어느 순서로 해도 유실이나 유령 메시지가 생긴다. 2PC는 실무에서 거의 쓰지 않는다.`,
        `아웃박스는 업무 쓰기와 같은 트랜잭션에 outbox 행을 INSERT하고 릴레이가 발행한다. 결과는 at-least-once이므로 소비자 멱등성이 짝이다.`,
        `릴레이는 폴링 또는 CDC이고, 순서가 필요하면 릴레이를 하나로 두거나 집합체별로 담당을 나눈다.`,
        `사가는 로컬 트랜잭션과 보상으로 이루어진다. 보상은 의미적이고 멱등이어야 하며 실패 경로가 필요하고, PENDING 같은 중간 상태를 모델에 넣는다.`,
        `소규모에서는 상태 컬럼, 아웃박스, 멱등 핸들러, 대사 배치 조합이 사가 프레임워크보다 현실적이다.`
      ],
      pitfalls: [
        `업무 쓰기와 outbox INSERT를 서로 다른 트랜잭션이나 연결에서 하면서 아웃박스라고 부른다.`,
        `릴레이를 여러 개 돌려 같은 주문의 이벤트 순서가 뒤집히고, 소비자가 낡은 상태로 덮어쓴다.`,
        `발행 완료 행을 지우지 않아 테이블이 비대해지고, 미발행 지연 알람이 없어 릴레이가 멈춘 것을 며칠 뒤에 안다.`,
        `보상 트랜잭션을 정상 경로만큼 시험하지 않아 환불이 중복되거나 실패한 채 방치된다.`
      ]
    },
    {
      title: `실패와 과부하: 재시도·DLQ·포이즌 메시지·적체·백프레셔`,
      body: `비동기 시스템의 가치는 평소가 아니라 실패와 과부하 때 결정됩니다. 이 강은 일이 실패했을 때 몇 번, 어떤 간격으로 다시 시도하고 언제 사람에게 넘길지, 일이 몰렸을 때 무엇을 지킬지를 다룹니다.

### 실패 분류가 먼저
일시적 오류(타임아웃, 429·503, 데드락)는 재시도하면 성공할 수 있고, 영구적 오류(검증 실패, 존재하지 않는 참조, 스키마 불일치)는 몇 번을 다시 해도 같은 결과입니다. 이를 구분하지 않고 계속 재시도되는 메시지가 포이즌 메시지입니다. 계속 실패하면서 자원을 먹고, 순서를 지키는 스트림에서는 뒤의 메시지까지 막습니다. 더 고약한 변종은 처리하다가 워커 프로세스를 죽이는 메시지(OOM, 무한 루프)입니다. 예외가 아니라 크래시라서 실패 처리 코드가 실행되지 않으니, 브로커의 수신 횟수 한도(maxReceiveCount, delivery-limit)나 DB 큐의 attempts 상한처럼 소비 코드 바깥에서 세는 장치가 있어야 격리됩니다.

### 재시도 설계
- 지수 백오프에 지터를 더합니다. full jitter는 0과 min(상한, 기본 간격 × 2의 n제곱) 사이의 균등 난수만큼 쉽니다. AWS 아키텍처 블로그의 시뮬레이션에서 지터 없는 방식은 클라이언트 작업량과 완료 시간 모두 가장 나빴고, 지터를 넣으면 서버 부하가 크게 줄었습니다. 지터가 없으면 실패한 클라이언트들이 같은 시각에 다시 몰립니다.
- 최대 횟수와 총 시간 상한(데드라인)을 둡니다.
- 재시도는 한 계층에서만 합니다. Builders' Library의 「Timeouts, retries, and backoff with jitter」는 5계층 호출 스택에서 계층마다 3번씩 재시도하면 데이터베이스 부하가 243배(3의 5제곱)가 된다고 계산합니다. 시도 횟수를 단순화한 최악의 경우지만 재시도가 곱해진다는 요점은 그대로입니다.
- 브로커마다 모양이 다릅니다. SQS는 가시성 타임아웃이 지나면 재수신하고 백오프가 없으므로 소비자가 ChangeMessageVisibility로 다음 시도 시각을 늘립니다. RabbitMQ는 공식 문서가 delivery-limit에만 기대지 말고 지연 재시도와 백오프를 쓰라고 권합니다. Kafka는 retry-5s, retry-1m 같은 재시도 토픽이나 소비자 내 백오프를 씁니다. 소비자 안에서 오래 sleep하면 poll 간격을 넘기므로 긴 지연은 브로커 쪽 지연에 맡깁니다.

### DLQ 운영
DLQ는 쓰레기통이 아니라 사람이 처리할 대기열입니다. DLQ 깊이가 0을 넘으면 알람을 보내고, 원인 분석에 필요한 정보(원래 오류, 시도 횟수, 헤더)를 함께 보관하며, 버그를 고친 뒤 원래 큐로 다시 넣는(redrive) 절차를 문서화합니다. 재투입은 중복을 만들 수 있어 멱등성이 전제입니다. SQS의 maxReceiveCount를 너무 낮게 잡으면 일시 장애만으로 DLQ로 가고(문서 예시: 1이면 실패 한 번으로 이동), 표준 큐에서 DLQ 메시지의 만료는 원래 enqueue 시각 기준이라 DLQ 보존 기간을 원 큐보다 길게 잡아야 합니다. FIFO 큐에 DLQ를 쓰면 순서가 깨질 수 있다고 문서가 주의합니다. RabbitMQ quorum queue는 모든 큐에 dead-letter 구성을 두라고 권고하며, 없으면 delivery-limit을 넘긴 메시지가 조용히 버려집니다.

### 적체와 Little's Law
필요한 동시성은 도착률 × 평균 처리 시간입니다. 초당 100건에 100ms면 약 10, 지연이 10초로 늘면 약 1,000이 되어 스레드 풀이 바닥납니다. 처리 용량이 도착률보다 작으면 큐는 선형으로 자라고, 복구는 장애 시간보다 오래 걸립니다. Builders' Library 예시에서는 30분 늦게 대응한 뒤 쌓인 양이 소비 용량의 10배면 해소에 약 300분이 걸립니다. 방어책은 고객별 속도 제한, 고객별·우선순위별 큐 분리와 초과분을 따로 처리하는 spillover, 오래된 메시지 폐기와 최신 우선, 하류를 지키는 소비자 동시성 상한입니다. 처리가 느려져 가시성 타임아웃을 넘기면 같은 메시지가 병렬로 중복 처리돼 더 느려지는 연쇄가 생기므로 하트비트로 연장하거나 타임아웃 시 작업을 중단합니다.

### 백프레셔
생산 속도를 소비 능력에 맞추는 신호입니다. 큐 지연이 임계를 넘으면 접수를 429/503으로 제한하고, 배치 크기를 줄이거나 prefetch를 낮추거나 Kafka의 pause()를 씁니다. 상한 없는 큐는 백프레셔가 없는 시스템이라 지연이 숨겨진 채 자원이 고갈될 때까지 갑니다. 핵심 지표는 깊이보다 가장 오래된 메시지의 나이와 consumer lag입니다. Kafka 소비자는 max.poll.interval.ms 기본 5분, max.poll.records 기본 500(Kafka 4.4 문서, 2026-11 기준)이라 레코드당 처리 시간 × 500이 5분을 넘으면 리밸런스 폭풍이 나고, enable.auto.commit 기본값이 true라 처리 완료와 무관한 시점에 오프셋이 커밋될 수 있으니 중요한 처리는 수동 커밋을 씁니다.`,
      code: `import random, time

TRANSIENT = (TimeoutError, ConnectionError)    # 재시도하면 성공할 수 있는 오류
MAX_ATTEMPTS, BASE, CAP = 5, 0.5, 30.0

class PermanentError(Exception):
    """검증 실패·존재하지 않는 참조 등 몇 번을 해도 같은 결과인 오류."""

def backoff(attempt: int) -> float:
    # full jitter: 0 ~ min(CAP, BASE * 2^attempt) 균등 난수. 재시도 시각을 흩뜨려 폭풍을 막는다
    return random.uniform(0, min(CAP, BASE * 2 ** attempt))

def handle_with_policy(msg: dict, process, send_dlq, now=time.monotonic) -> str:
    """'ok' 또는 'dead'를 반환한다. 호출자는 반환 후에만 ack/commit 한다.
    예상 밖의 예외는 그대로 올려 ack하지 않고, 브로커의 재전달 한도(maxReceiveCount 등)에 맡긴다."""
    deadline = now() + 120                      # 메시지당 총 재시도 시간 상한(초)
    for attempt in range(MAX_ATTEMPTS):
        try:
            process(msg)
            return "ok"
        except PermanentError as e:
            send_dlq(msg, reason=f"permanent: {e}", attempts=attempt + 1)
            return "dead"                       # 영구 오류는 재시도하지 않고 즉시 격리
        except TRANSIENT as e:
            delay = backoff(attempt)
            if attempt + 1 == MAX_ATTEMPTS or now() + delay > deadline:
                send_dlq(msg, reason=f"exhausted: {e!r}", attempts=attempt + 1)
                return "dead"
            time.sleep(delay)                   # 짧은 지연만 소비자 안에서. 긴 지연은 브로커 지연 기능으로
    return "dead"`,
      codeLang: `python`,
      key: [
        `오류를 일시적과 영구적으로 나눠 영구 오류는 즉시 DLQ로 보내고, 일시적 오류만 백오프와 지터로 제한된 횟수만 재시도한다.`,
        `재시도는 한 계층에서만 한다. 5계층 × 3회는 최악에 243배 요청이다.`,
        `DLQ는 알람, 분석 정보, redrive 절차와 짝이어야 하고 DLQ 보존 기간은 원 큐보다 길어야 한다(SQS 표준 큐).`,
        `필요 동시성 = 도착률 × 처리 시간(Little's Law)이다. 처리율이 도착률보다 낮으면 큐는 끝없이 자라므로 가장 오래된 메시지의 나이를 감시한다.`,
        `백프레셔(접수 제한, 동시성 상한)와 타임아웃으로 느려진 하류를 보호한다.`
      ],
      pitfalls: [
        `모든 예외를 재시도해 검증 오류 메시지가 큐를 영원히 순환한다.`,
        `소비자 안에서 sleep으로 길게 재시도해 poll 간격이나 가시성 타임아웃을 넘기고 재전달을 부른다.`,
        `적체가 생기자 워커와 스레드만 늘려 이미 느려진 하류(DB, 외부 API)를 더 때려 연쇄 장애를 만든다.`,
        `DLQ를 만들어 놓고 알람, 담당자, 재투입 절차가 없어 몇 달 뒤 수만 건이 쌓여 있다.`
      ]
    },
    {
      title: `통합 사례: 이벤트에 무너지는 쇼핑몰의 캐시·비동기 개편과 인수`,
      body: `가상의 의뢰인 상황 하나를 진단부터 인수까지 풀어 봅니다. 월 주문 약 3만 건의 중소 쇼핑몰(PostgreSQL 한 대, 앱 서버 두 대)이 이벤트 때마다 느려집니다. 이벤트 시간대에 상품 목록 API의 p95가 2.8초, DB CPU가 95%이고, 결제 완료 요청 안에서 이메일, 알림톡, 재고 동기화, 정산 기록을 모두 동기로 처리해 응답이 6초 걸립니다. 알림톡 API가 장애면 결제 자체가 실패하고, 이벤트 날 같은 알림이 두 번 갔다는 신고도 있었습니다. (수치는 학습용 가정입니다.)

### 1단계: 측정이 먼저다
의뢰인의 요청은 보통 Redis를 붙여 빠르게 해 주세요처럼 해법으로 옵니다. pg_stat_statements와 APM으로 엔드포인트별 호출량과 p95, 슬로우 쿼리, 읽기와 쓰기 비율을 먼저 잡습니다. 이번 사례에서는 상품 목록·상세가 DB 쿼리의 대부분이고 같은 쿼리가 반복된다고 가정합니다. 인덱스와 쿼리 개선(be-sql 모듈)으로 풀리는 부분은 캐시보다 먼저 처리합니다.

### 2단계: 읽기 경로
HTTP 캐시와 CDN으로 걸러지는 요청부터 처리하고, 남는 상품 상세와 카테고리 목록에 cache-aside를 적용합니다. TTL은 5분에 ±20% 지터, 가격과 재고는 수정 시 삭제와 10초 TTL, 존재하지 않는 id는 음성 캐시로 막습니다. 인기 키에는 soft/hard TTL과 single-flight를 겁니다. Redis는 캐시 전용 인스턴스로 allkeys-lru에 영속성 끔, 캐시 호출은 50ms 타임아웃, 장애는 미스로 처리하되 DB 동시 쿼리에 상한을 둡니다. 합의한 피크 부하로 캐시를 끈 시험까지 해서 DB가 버티는지 보여 줍니다.

### 3단계: 쓰기 경로
결제 승인은 멱등 키를 쓰는 동기 호출로 두고, 승인 결과 반영과 outbox INSERT를 한 트랜잭션에 넣습니다. 릴레이가 큐로 발행하고 워커가 알림톡, 이메일, 재고 동기화, 정산 기록을 각각 처리합니다. 워커는 dedup 테이블이나 외부 API 멱등 키로 멱등하게 만들고, 백오프와 지터 재시도, DLQ와 알람, 가시성 타임아웃 연장을 갖춥니다. 알림톡 API가 1시간 죽어도 결제는 성공하고 알림은 복구 후 따라옵니다.

### 4단계: 브로커 선택 ADR
월 3만 건이면 평균 초당 0.01건 수준이고 이벤트 피크도 초당 수십 건 이하라고 가정합니다. 재생과 팬아웃 요구가 없고 운영 인원은 한 명입니다. 새 인프라를 최소화하려고 이미 있는 PostgreSQL 큐(SKIP LOCKED)나 AWS라면 SQS를 고르고 탈락 이유를 적습니다. Kafka는 운영 비용 대비 근거가 없고 RabbitMQ는 클러스터 운영이 부담입니다. 재생이나 다수 소비자 요구가 생길 때 승격하는 조건도 ADR에 남깁니다.

### 5단계: 증명과 인수
장애 주입으로 증명합니다. 같은 메시지 3중 전달, 워커 kill -9, 브로커 재시작, 외부 API 장애 1시간, Redis 전체 flush, DLQ 재투입을 시나리오로 자동화하고, 모든 경우에 주문 수 = 결제 수 = 알림 기록 수와 중복 0을 판정합니다. 납품물에는 환경 재현(compose), ADR, TTL 표, 멱등·재시도·DLQ 정책, 대시보드와 알람 정의(hit율, 가장 오래된 메시지 나이, DLQ 깊이, outbox 지연), 런북이 들어갑니다.

### 6단계: 사후에 나올 질문
이벤트 당일 Redis 재시작으로 콜드 캐시가 되어 DB가 다시 폭주했다면 무엇이 빠졌는지 되짚습니다. 워밍 절차, DB 동시 쿼리 상한, 캐시를 끈 부하 시험 중 어느 것이 없었는지가 답입니다.`,
      code: `import random

def simulate(idempotent: bool, seed: int) -> dict:
    """at-least-once 큐 흉내: 처리 전 크래시, ack 유실(재전달), 순서가 뒤섞인 중복을 주입한다."""
    rnd = random.Random(seed)
    queue = [{"id": f"m{i}", "acct": i % 5, "amt": 10} for i in range(100)]
    balance = {a: 0 for a in range(5)}
    seen = set()                         # 실무에서는 업무 쓰기와 같은 트랜잭션의 dedup 테이블
    while queue:
        m = queue.pop(0)
        r = rnd.random()
        if r < 0.05:                     # 처리 전 크래시: 아무것도 적용되지 않고 재전달
            queue.append(m)
            continue
        if not (idempotent and m["id"] in seen):
            balance[m["acct"]] += m["amt"]
            seen.add(m["id"])
        if r < 0.25:                     # 처리는 됐는데 ack가 유실: 재전달
            queue.append(m)
        elif r < 0.35:                   # 순서가 뒤섞인 중복 전달
            queue.insert(rnd.randrange(len(queue) + 1), m)
    return balance

expected = {a: 200 for a in range(5)}    # 계정당 20건 x 10
assert all(simulate(True, s) == expected for s in range(200))    # 멱등 소비자: 항상 정답
assert any(simulate(False, s) != expected for s in range(200))   # 멱등이 아니면 중복이 잔액을 부풀린다
print("OK")`,
      codeLang: `python`,
      key: [
        `해법이 아니라 증상부터 측정한다. 엔드포인트별 p95, DB 상위 쿼리, 읽기/쓰기 비율이 인프라 선택의 근거다.`,
        `읽기는 HTTP 캐시, cache-aside(TTL, 지터, single-flight, 음성 캐시) 순으로 적용하고 캐시를 끈 부하 시험으로 DB 보호를 증명한다.`,
        `쓰기는 동기 핵심(결제)과 비동기 후속(아웃박스, 멱등 워커, DLQ)으로 나눠 외부 장애가 결제를 막지 않게 한다.`,
        `브로커는 규모, 재생 요구, 운영 인력으로 고르고 승격 조건을 ADR에 기록한다.`,
        `장애 주입 자동화, 런북, 지표 정의가 납품물의 증거다.`
      ],
      pitfalls: [
        `측정 없이 Redis나 Kafka부터 도입해서 원인이 쿼리와 인덱스인데 인프라만 늘어난다.`,
        `정상 경로 시연만으로 인수를 받아 이벤트 당일의 중복, 적체, 콜드 캐시에서야 문제가 드러난다.`,
        `납품 후 운영 주체와 알람 수신자, DLQ 처리 절차를 정하지 않는다.`,
        `허용 stale 시간, 중복 정책, 지연 SLO를 문서로 합의하지 않아 정상 동작을 하자라고 주장받는다.`
      ]
    }
  ],
  labs: [
    {
      title: `실습 1: Redis 캐시 도입 전후 측정과 스탬피드 재현·방어`,
      scenario: `가상의 쇼핑몰 API가 있습니다. PostgreSQL에 상품 10만 건이 있고 GET /products/{id} 한 번이 DB 쿼리 한 번입니다. 이벤트 때 트래픽의 90%가 상위 1%(1,000개) 인기 상품에 몰립니다. 이 실습에서는 캐시를 붙이기 전에 먼저 현재 성능을 측정하고, 캐시 적용 효과를 hit율과 p95로 증명한 뒤, 인기 키가 만료되는 순간의 스탬피드를 일부러 만들어 DB 쿼리 수로 방어 효과를 숫자로 비교합니다. 마지막으로 Redis가 죽거나 비었을 때 서비스가 어떻게 되는지도 확인합니다. 모든 도구는 무료이고 로컬 Docker로 충분합니다.`,
      steps: [
        `Docker로 PostgreSQL과 Redis(또는 Valkey)를 띄운다. 이미지 태그는 공식 문서에서 현재 지원 버전을 확인해 고정하고, 상품 10만 건을 시드한다.`,
        `선택한 언어(Python 또는 Node.js)로 GET /products/{id} API를 만든다. DB 조회에 ‹SELECT pg_sleep(0.03)›를 섞어 30ms짜리 무거운 쿼리를 흉내 내고, 요청당 DB 쿼리 수를 세는 카운터를 둔다.`,
        `k6 또는 hey로 200 동시 사용자, 60초 부하를 건다. 상위 1% 상품에 90% 트래픽이 가는 분포를 스크립트로 만들고(나머지 10%는 전체에 균등), 캐시 없는 기준선(p50, p95, 총 DB 쿼리 수)을 표로 기록한다. DB 커넥션 풀 크기도 함께 적어 둔다.`,
        `2강의 cache-aside(TTL 지터, 수정 시 삭제 포함)를 적용해 같은 부하를 다시 건다. ‹INFO stats›로 hit율을 계산하고 p95와 DB 쿼리 수를 기준선과 비교한다.`,
        `스탬피드 재현: 인기 상품 1개의 캐시 키를 지운 순간 동시 500요청을 보내고 그 키 하나에 대한 DB 쿼리 수를 기록한다.`,
        `3강의 방어(분산 락 기반 single-flight와 soft/hard TTL)를 적용하고 같은 실험을 반복해 DB 쿼리 수를 비교한다.`,
        `Redis를 중지한 상태와 FLUSHALL 직후에 부하를 건다. 캐시 오류를 미스로 처리하는지, DB 동시 쿼리 상한(세마포어로 커넥션 풀 크기 이하로 제한하고 1초 넘게 기다리면 503)이 DB를 지키는지 p99와 5xx 비율로 확인한다.`,
        `결과를 전/후 비교표, TTL 표(허용 stale 시간 포함), 무효화 규칙 1쪽으로 정리한다.`
      ],
      accept: [
        `캐시 적용 후 hit율이 85% 이상이고 p95가 기준선의 1/3 이하이며, 두 수치가 측정 표로 제출된다(꼬리 10%가 99,000개 키에 흩어져 있어 100%에 가까운 hit율은 나오지 않는 것이 정상이다).`,
        `방어 전 스탬피드 실험에서 만료된 키 하나에 DB 쿼리가 10회 이상 관측되고, 방어 후에는 2회 이하로 줄어든다.`,
        `Redis 중지 상태에서 5xx 비율이 1% 미만이고(DB 폴백과 동시 쿼리 상한 동작), Redis 복구 후 hit율이 원래 수준으로 돌아오는 것이 로그로 확인된다.`,
        `상품 수정 직후 읽기에서 옛 값이 보이는 최대 시간이 설정한 TTL 이하임이 시험으로 확인된다.`
      ],
      stretch: `프로세스 내 L1 캐시(2초 TTL)를 핫 키에만 추가해 Redis 초당 호출 수가 얼마나 줄어드는지 측정하고, 확률적 조기 갱신을 구현해 soft/hard TTL 방식과 스탬피드 시 DB 쿼리 수를 비교합니다. 같은 시험을 Redis와 Valkey 양쪽에서 돌려 결과 차이를 기록해 봅니다.`
    },
    {
      title: `실습 2: PostgreSQL 작업 큐와 멱등 소비자, 장애 주입으로 증명하기`,
      scenario: `결제 완료 후 포인트를 적립하는 후처리 작업 10,000건이 있습니다. 작업은 PostgreSQL 테이블 큐에 쌓이고 워커 4개가 SKIP LOCKED로 가져가 처리합니다. 요구사항은 세 가지입니다. 중복 전달이 일어나도 포인트가 두 번 적립되지 않을 것, 워커가 죽어도 작업이 사라지거나 멈추지 않을 것, 처리할 수 없는 작업은 DLQ에 격리되어 사람이 볼 수 있을 것. 6강의 큐 테이블과 7강의 dedup 패턴을 직접 구현하고, 정상 시연이 아니라 장애를 일부러 주입한 뒤 검증 SQL로 결과가 맞음을 증명합니다.`,
      steps: [
        `6강의 job 테이블, 가져오기 쿼리, 완료·실패 쿼리를 만든다. 사용자 포인트 원장(ledger)과 processed_message(consumer, msg_id) 테이블도 만든다.`,
        `워커를 구현한다. 가져오기, 같은 트랜잭션에서 dedup INSERT와 원장 INSERT, 완료 처리, 실패 시 백오프 후 재시도, 5회 초과 시 dead 처리를 한다.`,
        `작업 10,000건을 넣는다. 그중 100건은 잘못된 페이로드(영구 오류)이고, 정상 작업에는 약 5% 확률로 일시 오류를 주입한다.`,
        `정상 작업 중 2,000건을 골라 같은 업무 키를 가진 중복 작업으로 한 번씩 더 넣어(전체 12,000행) 중복 전달을 흉내 낸다.`,
        `워커 4개를 돌리면서 장애 주입 스크립트로 워커를 무작위 시점에 강제 종료(kill -9 또는 taskkill)하는 일을 20회 반복하고, PostgreSQL 컨테이너를 한 번 재시작한다.`,
        `모든 작업이 끝날 때까지 기다린 뒤 검증 SQL을 실행한다. 상태별 개수, 사용자별 포인트 합계와 기대값 대조, running으로 남은 행 수를 확인한다.`,
        `워커 1개와 4개의 처리량(건/초), 재처리 횟수 분포를 표로 만들고, 4개가 4배가 되지 않는 이유를 DB 락과 폴링 관점에서 설명한다.`
      ],
      accept: [
        `종료 후 done과 dead의 합이 전체 12,000행과 같고, dead는 주입한 영구 오류 100건과 정확히 일치한다(정상 작업이 dead가 된 경우 0).`,
        `사용자별 포인트 합계가 기대값(영구 오류 100건을 뺀 9,900개 업무 키를 한 번씩만 적립한 값)과 정확히 일치한다(중복 적립 0, 누락 0). 검증 SQL과 결과를 제출한다.`,
        `강제 종료 20회와 DB 재시작 이후에도 lease 만료 후 모든 작업이 재처리되어 running 상태로 남은 행이 0이다.`,
        `완료 쿼리에 attempts 조건이 있어서, lease가 만료돼 다른 워커가 가져간 작업을 늦게 끝낸 워커의 결과가 버려지는 것을 로그로 확인한다.`
      ],
      stretch: `같은 시나리오를 RabbitMQ quorum queue(또는 SQS 호환 로컬 에뮬레이터)로 옮겨 구현하고, 코드량, 장애 때 동작, DLQ 구성, 운영 항목을 표로 비교합니다. 가시성 타임아웃보다 오래 걸리는 작업을 넣어 하트비트(연장)가 중복 실행을 막는지도 시험합니다.`
    },
    {
      title: `실습 3: 주문→결제→알림 파이프라인 인수 패키지 (납품형 미니 프로젝트)`,
      scenario: `가상의 의뢰인은 소규모 쇼핑몰 운영자입니다. 요청은 이렇습니다. 이벤트 때 상품 조회가 느리니 캐시를 붙여 주세요. 주문 후 알림과 재고 처리를 비동기로 분리하되 알림이 두 번 가거나 빠지면 안 됩니다. 알림 서비스가 죽어도 주문은 받아야 합니다. 납품은 코드만이 아니라 인수 기준을 증명하는 자료까지입니다. 요구사항 합의서, 브로커 선택 ADR, 한 번에 재현되는 docker compose, 장애 주입 자동화 스크립트와 결과표, 지표와 알람 정의, 런북을 갖춘 인수 패키지를 만드세요. 외부 알림 API는 일부러 느리고 가끔 5xx를 내는 가짜 서버로 대체합니다.`,
      steps: [
        `1쪽 합의서를 쓴다. 허용 stale 시간(상품 5분, 재고 10초), 알림 지연 SLO(주문 후 p95 30초), 중복 정책(알림 중복 0), 합의 피크 RPS와 데이터 크기를 적는다.`,
        `브로커 선택 ADR을 쓴다. PostgreSQL 큐, SQS 호환 에뮬레이터, RabbitMQ, Kafka(Redpanda 등) 중 하나를 고르고 탈락시킨 두 개의 이유와 승격 조건을 적는다.`,
        `주문 API를 구현한다. Idempotency-Key를 받아 orders와 outbox를 한 트랜잭션에 저장하고, 릴레이가 큐로 발행하며, 워커가 결제·재고·알림을 멱등하게 처리한다.`,
        `상품 조회에는 cache-aside와 soft/hard TTL을, 주문 API에는 토큰 버킷 레이트 리미터(429와 Retry-After)를 붙인다.`,
        `docker compose up 한 번과 시드 스크립트로 전체가 재현되게 한다. 이미지 태그는 고정한다.`,
        `장애 주입 스크립트를 자동화한다. 같은 메시지 3중 전달, 워커 강제 종료, 브로커(또는 DB) 재시작, 외부 API 10분 장애, Redis 전체 flush, DLQ 재투입 여섯 가지다. 각 시나리오 후 주문 수, 결제 수, 알림 기록 수, 중복 수를 자동 판정한다.`,
        `지표와 알람을 정의하고 출력한다. outbox 최고령 미발행 행의 나이, 큐의 가장 오래된 메시지 나이, DLQ 깊이, 캐시 hit율을 /metrics나 SQL 결과로 보인다.`,
        `런북(DLQ 처리, 적체 시 대응, Redis 장애 시 동작, 재투입 절차)과 인수 보고서(장애별 복구 시간표 포함)를 작성한다.`
      ],
      accept: [
        `compose 기동 후 스크립트 한 번으로 여섯 시나리오가 자동 실행·판정되고, 모든 시나리오에서 주문 수, 결제 수, 알림 기록 수가 같고 알림 중복이 0이다.`,
        `같은 Idempotency-Key로 동시에 10번 요청하면 주문이 정확히 1건이고 모든 응답이 의미상 같다.`,
        `Redis를 비운 상태에서 합의 피크 부하를 걸어도 주문 API 오류율이 1% 미만이거나, 한도 초과분이 정의된 방식(429, Retry-After)으로 거절된다.`,
        `장애별 정상 처리 재개까지 걸린 시간의 측정값이 복구 시간표에 있고, 런북의 절차와 일치한다.`,
        `ADR, 합의서, 런북, 인수 보고서가 저장소에 있고 처음 보는 사람이 README만으로 환경을 띄워 시나리오를 재현할 수 있다.`
      ],
      stretch: `같은 파이프라인을 Kafka(또는 Redpanda)로 옮겨 키 기반 파티셔닝과 read_committed 소비자를 적용해 보고, 처리 지연, 코드량, 운영 항목을 ADR 표에 추가합니다. 또는 결제-재고-알림 흐름을 Temporal 같은 내구 실행으로 구현해 사가 직접 구현안과 비교합니다.`
    }
  ],
  quiz: [
    {
      q: `상품 목록 API가 피크 2,000 rps이고 Redis 캐시 hit율은 95%라서 DB는 초당 약 100건만 받고 있었다. 배포 중 Redis를 재시작해 캐시가 완전히 비었고, 복구된 뒤에도 한동안 DB가 과부하라 응답이 느리다. 재발을 막는 가장 적절한 설계 변경은?`,
      choices: [
        `Redis 메모리를 두 배로 늘려 hit율을 99%까지 올린다. 캐시가 비는 일이 줄고 장애가 나도 DB가 받는 부하가 함께 줄어든다.`,
        `미스 때 키별 요청 병합과 DB 동시 쿼리 상한을 두고, 재시작과 배포 전에 인기 키를 워밍하며, 캐시를 끈 부하 테스트로 DB가 버티는지 검증한다.`,
        `모든 키의 TTL을 24시간으로 늘리고 지터는 제거한다. 만료 횟수가 줄어든 만큼 DB로 내려가는 요청도 줄어든다.`,
        `DB 읽기 전용 복제본을 추가해 읽기를 분산하고, 캐시 코드와 배포·재시작 절차는 그대로 둔다.`
      ],
      answer: 1,
      why: `캐시가 비면 hit율이 0이 되어 DB는 평소의 20배(2,000/100)를 받는다. hit율을 99%로 올리면 캐시가 사라졌을 때의 증폭 배수 1/(1-hit)가 오히려 100배로 커진다(0번). TTL 연장은 재시작으로 캐시가 비는 콜드 스타트와 무관하고 지터를 없애면 동시 만료가 늘어난다(2번). 복제본으로 20배 부하를 흡수하기는 어렵고 같은 키를 동시에 재로딩하는 낭비도 그대로다(3번). Builders' Library가 캐시의 필수 의존성화에 대한 대응으로 드는 병합, 상한, 워밍, 캐시 없는 부하 테스트가 정답이다.`
    },
    {
      q: `상품 가격 수정 코드다. 읽기 쪽은 cache-aside(미스 시 DB 조회 후 캐시 적재)이고 캐시 TTL은 10분이다.

def update_price(pid, price):
    cache.delete(f"p:{pid}")
    db.execute("UPDATE product SET price=%s WHERE id=%s", (price, pid))
    db.commit()

가끔 가격을 수정했는데도 옛 가격이 최대 10분 동안 보인다. 가장 직접적인 원인과 올바른 개선은?`,
      choices: [
        `cache.delete가 비동기로 실행돼 가끔 누락된다. 삭제를 한 번 더 호출하는 재시도 코드를 넣으면 해결된다.`,
        `Redis가 단일 스레드라서 delete와 UPDATE가 뒤섞인다. Redis 클러스터로 옮기면 명령이 분산돼 해결된다.`,
        `삭제와 커밋 사이에 다른 요청이 미스를 내 옛 값을 읽고 캐시에 다시 적재한다. 커밋 뒤에 삭제하도록 순서를 바꾸고 TTL을 안전망으로 둔다.`,
        `삭제 대신 캐시에 새 가격을 set한다. 두 요청이 동시에 갱신해도 순서가 뒤집히지 않아 경쟁이 사라진다.`
      ],
      answer: 2,
      why: `삭제를 커밋 앞에 두면 그 사이 도착한 읽기가 DB의 옛 값을 다시 캐시에 채워 TTL(10분)이 끝날 때까지 낡은 값이 남는다. 커밋 후 삭제로 바꾸면 이 틈이 사라지고, 읽기가 옛 값을 읽은 직후 쓰기가 끝나는 드문 경쟁만 남으므로 TTL을 안전망으로 둔다. set(갱신)은 두 쓰기의 DB 반영 순서와 캐시 반영 순서가 뒤집힐 수 있어 경쟁이 없어지지 않는다(3번). delete는 동기 호출이라 재시도로 풀릴 문제가 아니고(0번), Redis는 명령 단위로 직렬 실행되므로 문제는 호출 순서에 있다(1번).`
    },
    {
      q: `선착순 쿠폰 1,000장을 발급한다. 개발자가 Redis 분산 락(SET NX PX 10초) 안에서 재고를 확인하고 발급 행을 INSERT하도록 구현했다. 운영 중 가끔 1,003장이 발급됐고, 락을 쥔 앱 인스턴스가 12초 GC 정지에서 깨어나 락이 이미 만료된 줄 모르고 INSERT한 것이 원인이었다. 정확성이 걸린 이 문제의 최선의 수정은?`,
      choices: [
        `락에 정확성을 맡기지 않고 DB에서 보장한다. (coupon_id, user_id) 유니크 제약과 remaining > 0 조건부 UPDATE를 한 트랜잭션에 두고, 락은 부하 완화용으로만 남긴다.`,
        `락 TTL을 60초로 늘리고, 작업 중 TTL을 주기적으로 연장하는 watchdog 스레드를 추가해 락이 만료되지 않게 한 뒤 발급은 락 안에서만 처리한다.`,
        `Redis를 5노드 Redlock으로 바꿔 락의 가용성을 높이고, 과반수 노드에서 락을 얻은 요청만 발급하도록 해 두 클라이언트가 동시에 락을 갖는 일을 막는다.`,
        `INSERT 직전에 락의 남은 TTL을 조회해 충분히 남았을 때만 INSERT하고, 부족하면 락을 다시 잡아 재고를 재확인한다.`
      ],
      answer: 0,
      why: `정지는 TTL 조회와 INSERT 사이에도, 연장 스레드까지 함께 멈추는 GC 동안에도 일어나므로 사전 검사나 watchdog은 근본 해결이 아니다(1·3번). Redlock은 단조 증가하는 fencing token을 주지 않고 지연·시계에 대한 시간 가정에 기댄다는 비판을 받으므로 가용성을 높여도 이 사고를 막지 못한다(2번). 정확성은 저장소가 직접 검증해야 하므로 DB 제약과 조건부 갱신이 가장 견고하다.`
    },
    {
      q: `Kafka 소비자 서비스 로그다(그룹 billing, 파티션 6개, 소비자 3개). 배포 후 같은 청구가 가끔 두 번 처리된다는 신고가 들어왔다.

12:00:03 INFO  polled 500 records (partition 2, offsets 41000-41499)
12:00:03 INFO  processing... (평균 레코드당 800ms)
12:05:04 WARN  consumer poll timeout has expired: time between subsequent calls to poll() was longer than max.poll.interval.ms (300000)
12:05:04 INFO  member left group; rebalance triggered
12:06:44 INFO  committing offsets up to 41499 failed: CommitFailedException (rebalance in progress)
12:06:45 INFO  polled 500 records (partition 2, offsets 41000-41499)

가장 적절한 진단과 대응은?`,
      choices: [
        `브로커 장애로 메시지가 중복 저장됐다. 토픽의 복제 계수를 올리고 min.insync.replicas를 조정해 브로커 쪽 내구성과 일관성을 높인다.`,
        `생산자가 같은 청구를 두 번 발행했다. 생산자 쪽 재시도 설정과 멱등 생산자 설정을 점검하고 중복 발행 여부부터 추적한다.`,
        `enable.auto.commit을 true로 바꿔 오프셋이 주기적으로 자동 커밋되게 하면 커밋 실패가 사라져 같은 레코드가 다시 오지 않는다.`,
        `배치 처리 시간(500건 x 0.8초, 약 400초)이 max.poll.interval.ms(5분)를 넘겨 리밸런스가 났고 늦은 커밋이 실패해 같은 오프셋이 재전달됐다. max.poll.records나 처리 시간을 줄이고 소비자를 멱등하게 만든다.`
      ],
      answer: 3,
      why: `로그의 시간 순서가 원인을 보여 준다. 500건을 처리하는 데 약 400초가 걸려 poll 간격 한도 300초를 넘기고(12:05:04 경고), 소비자가 그룹에서 빠져 리밸런스가 일어나며, 늦은 커밋이 실패해 같은 오프셋 범위(41000-41499)가 다시 전달된다. 생산자 중복이라면 같은 내용이 서로 다른 오프셋에 쌓이므로 같은 오프셋 범위가 다시 읽히는 이 로그와 다르다(1번). 브로커 복제 계수는 이 증상과 무관하다(0번). enable.auto.commit의 기본값은 이미 true이고 poll 타임아웃과 무관하다(2번). 대응은 배치 크기와 처리 시간 조정, 그리고 재전달을 전제로 한 멱등 처리다.`
    },
    {
      q: `SQS Standard 큐로 PDF 보고서 생성 작업을 처리한다. 큐 설정은 기본값(가시성 타임아웃 30초)이고, 보고서 하나는 보통 20초, 큰 고객은 최대 4분이 걸린다. 큰 고객 보고서가 두 번 생성되어 고객에게 메일이 두 통 갔다. 가장 적절한 대응은?`,
      choices: [
        `FIFO 큐로 바꾼다. FIFO는 중복을 만들지 않으므로 가시성 타임아웃이 지나도 같은 메시지가 다시 전달되지 않는다.`,
        `가시성 타임아웃을 최대 처리 시간(p99 이상)에 맞추거나 작업 중 ChangeMessageVisibility로 주기적으로 연장하고, 메일 발송 단계에는 멱등 키를 둔다.`,
        `소비자를 하나로 줄여 같은 메시지를 두 소비자가 동시에 받는 일을 원천 차단하고, 발송 단계는 그대로 둔다.`,
        `SQS가 중복을 보내는 것이 문제이므로 Kafka로 이전한다. Kafka는 메시지를 소비자에게 정확히 한 번만 전달한다.`
      ],
      answer: 1,
      why: `처리가 30초를 넘기면 메시지가 다시 보이게 되어 다른 소비자(또는 같은 소비자)가 재수신한다. 해법은 타임아웃을 처리 시간에 맞추거나 하트비트로 연장하고(최대 12시간 한도), 부수효과(메일)에는 멱등 키를 두는 것이다. FIFO의 중복 제거는 5분 안의 발행 재시도에 대한 것이고, 같은 메시지 그룹을 순서대로 처리할 뿐 타임아웃 뒤 재전달은 여전히 일어난다(0번). 소비자가 하나여도 타임아웃 뒤 재수신될 수 있다(2번). Kafka도 소비 쪽 기본은 at-least-once라 중복 문제가 사라지지 않는다(3번).`
    },
    {
      q: `캐시 전용으로 만든 Redis의 설정과 오류 로그다.

maxmemory 2gb
maxmemory-policy noeviction

(error) OOM command not allowed when used memory > 'maxmemory'.

트래픽이 늘자 앱이 캐시 SET마다 이 오류를 내고 읽기는 정상이라, 새 데이터가 캐시에 안 들어가 대부분의 요청이 DB로 내려가 지연이 늘었다. 이 인스턴스는 캐시만 담는다. 올바른 조치는?`,
      choices: [
        `maxmemory를 0으로 바꿔 메모리 제한을 없애고 컨테이너의 메모리 한도에 맡긴다.`,
        `maxmemory-policy를 volatile-lru로 바꾼다. TTL 유무와 상관없이 가장 오래 쓰지 않은 키부터 퇴출된다.`,
        `maxmemory-policy를 allkeys-lru(또는 allkeys-lfu)로 바꾸고 모든 키에 TTL을 두며, evicted_keys와 hit율을 모니터링한다.`,
        `appendonly yes로 바꿔 데이터를 디스크에 남기면 메모리 압박이 줄어 쓰기 거절이 사라진다.`
      ],
      answer: 2,
      why: `noeviction은 가득 차면 쓰기를 거절하는 정책이라 캐시에는 맞지 않고, 캐시는 오래 안 쓴 키를 퇴출하는 것이 정상 동작이다. maxmemory 0은 64비트에서 무제한이라 컨테이너 OOM kill 위험이 커진다(0번). volatile-* 정책은 TTL이 있는 키만 대상이라 TTL이 없으면 noeviction처럼 동작한다(1번). AOF는 메모리를 줄이지 못하고 오히려 버퍼를 더 쓴다(3번).`
    },
    {
      q: `주문 API는 주문 행을 DB에 커밋한 다음 브로커에 OrderPlaced를 발행한다. 지난주 서버가 커밋 직후 배포로 종료되어 일부 주문의 재고 차감 메시지가 사라졌다. 의뢰인은 메시지를 절대 잃지 않게 해 달라고 한다. 가장 적절한 설계는?`,
      choices: [
        `주문과 outbox 행을 같은 DB 트랜잭션에 INSERT하고, 별도 릴레이가 읽어 발행한 뒤 완료 표시한다. 중복 발행은 소비자 멱등성으로 처리한다.`,
        `발행을 DB 커밋보다 먼저 하도록 순서를 뒤집는다. 발행이 성공한 뒤에만 커밋하면 메시지가 유실되지 않는다.`,
        `발행에 실패하면 로그만 남기고, 운영자가 로그를 보고 수동으로 재발행하는 절차를 런북에 적는다.`,
        `브로커와 DB를 2PC(XA)로 묶어 두 쓰기를 원자적으로 커밋하고 exactly-once를 보장한다.`
      ],
      answer: 0,
      why: `이중 쓰기 문제는 같은 트랜잭션 안에 메시지를 행으로 남기는 아웃박스로 푼다. 순서를 뒤집으면 커밋이 롤백될 때 존재하지 않는 주문의 유령 메시지가 나간다(1번). 수동 재발행은 유실을 사람이 막겠다는 뜻이라 보장이 아니다(2번). 2PC는 브로커 대부분이 지원하지 않고 결합과 가용성 문제가 커 실무에서 거의 쓰지 않는다(3번). 아웃박스는 at-least-once라 소비자 멱등성이 반드시 짝이다.`
    },
    {
      q: `소비자 코드다. 중복 처리를 막으려고 Redis 집합을 쓴다.

def on_message(msg):
    if redis.sismember("done", msg.id):
        return                      # 이미 처리
    apply_to_db(msg)                # DB 트랜잭션 커밋
    redis.sadd("done", msg.id)
    ack(msg)

부하 시험에서 일부 메시지가 두 번 반영됐다. 가장 정확한 설명과 해법은?`,
      choices: [
        `sismember 호출이 느려서 생기는 문제다. 확인과 기록 명령을 파이프라인으로 묶어 왕복 시간을 줄이면 틈이 사라져 중복이 없어진다.`,
        `Redis가 단일 스레드라 sadd가 가끔 유실된다. appendfsync를 always로 바꿔 모든 쓰기를 동기화하면 기록이 보장되어 해결된다.`,
        `ack가 너무 늦어 브로커가 재전달한다. ack를 함수 맨 앞으로 옮겨 처리 전에 확인을 보내면 같은 메시지가 다시 오지 않는다.`,
        `확인과 기록이 업무 쓰기와 다른 저장소에서 따로 일어나 원자적이지 않다. 동시 수신이나 커밋 직후 크래시가 틈이므로 dedup 키를 업무 쓰기와 같은 DB 트랜잭션에서 유니크 제약으로 INSERT한다.`
      ],
      answer: 3,
      why: `확인-처리-기록이 세 단계로 나뉘어 있고 서로 다른 저장소에 걸쳐 원자성이 없다. 같은 메시지가 동시에 두 소비자에게 가거나 커밋 후 sadd 전에 죽으면 둘 다 통과한다. 파이프라인은 속도 문제일 뿐 원자성을 주지 않는다(0번). appendfsync always는 크래시 창을 줄일 뿐 동시 처리 경쟁을 막지 못한다(1번). ack를 먼저 보내면 처리 전에 죽을 때 작업이 유실되는 at-most-once가 된다(2번).`
    },
    {
      q: `Kafka 토픽 order-events(파티션 6개)에 주문 생성, 결제, 취소 이벤트가 발행된다. 현재 생산자는 키 없이 보내고 소비자는 6개다. 가끔 취소 이벤트가 결제 이벤트보다 먼저 처리되어 주문 상태가 꼬인다. 처리량은 유지해야 한다. 가장 적절한 수정은?`,
      choices: [
        `토픽의 파티션을 1개로 줄여 모든 이벤트가 한 줄로 처리되게 하고, 처리량은 소비자의 처리 속도를 높여 보완한다.`,
        `소비자를 1개로 줄여 한 인스턴스가 모든 파티션을 읽게 하면 이벤트가 한 줄로 들어오므로 순서가 보장된다.`,
        `메시지 키를 order_id로 지정해 같은 주문의 이벤트가 같은 파티션으로 가게 하고, 이벤트에 버전 번호를 넣어 소비자가 낡은 이벤트를 무시하게 한다.`,
        `소비자 앞에 타임스탬프로 정렬하는 버퍼를 두고 수 초 동안 모은 뒤 시간순으로 정렬해서 처리한다.`
      ],
      answer: 2,
      why: `Kafka의 순서는 파티션 안에서만 보장되고 키가 같으면 같은 파티션으로 간다. 같은 주문의 이벤트에 order_id 키를 주면 처리량(파티션 병렬)을 유지하면서 주문 단위 순서를 얻는다. 파티션 1개는 병렬도를 포기하는 방법이다(0번). 키 없는 메시지는 파티션이 갈려 있어 소비자를 1개로 줄여도 파티션 사이 순서가 보장되지 않는다(1번). 정렬 버퍼는 지연과 버퍼 크기 한계를 만들 뿐 근본 해결이 아니다(3번). 파티션 수를 나중에 늘리면 키와 파티션의 매핑이 바뀌는 점은 주의한다.`
    },
    {
      q: `분당 100회 제한을 아래처럼 구현했다.

count = r.incr(key)
if count == 1:
    r.expire(key, 60)
if count > 100:
    return 429

운영 중 특정 사용자가 영구적으로 429만 받는 사고가 났다. Redis에 해당 키가 TTL 없이 남아 있다. 가장 가능성 높은 원인과 해법은?`,
      choices: [
        `INCR 직후 EXPIRE 전에 프로세스가 죽거나 EXPIRE가 실패하면 TTL이 영영 붙지 않는다(재시도도 없다). INCR과 EXPIRE를 Lua 스크립트로 원자적으로 실행한다.`,
        `Redis 키는 60초가 지나면 항상 사라지므로 서버와 클라이언트의 시계 차이로 생긴 문제다. 양쪽 시계를 NTP로 맞추면 해결된다.`,
        `카운트가 100을 넘으면 INCR이 오류를 반환해 이후 호출이 TTL을 붙이지 못한다. 한도를 올리거나 오류를 무시하도록 예외 처리를 넣는다.`,
        `고정 윈도 방식은 TTL이 없어도 윈도가 자동으로 넘어가므로 문제가 없다. expire 줄을 지우고 키를 그대로 두면 된다.`
      ],
      answer: 0,
      why: `INCR은 없는 키를 만들 때 TTL을 붙이지 않는다. TTL은 별도 EXPIRE 호출이 붙여야 하고 이 코드는 첫 호출에서만 시도하므로, 그 한 번이 실패하면 카운터가 영원히 남아 count가 100을 넘은 사용자는 영구 차단된다. 원자적 실행(Lua)이나 키를 SET NX EX로 먼저 만드는 방식이 해법이다. TTL은 시계와 무관하게 키에 붙어야만 동작한다(1번). INCR은 한도를 넘어도 오류를 내지 않는다(2번). expire를 지우면 윈도가 영원히 리셋되지 않는다(3번).`
    },
    {
      q: `프리랜서 1인이 맡은 소규모 SaaS(AWS 사용, 개발팀 없음)에서 월 약 50만 건의 이메일·PDF 생성 작업을 요청 경로 밖으로 빼야 한다. 재생(replay)이나 여러 소비자 팬아웃 요구는 없고, 납품 후 운영은 의뢰인 담당자 1명이 한다. 가장 적절한 선택은?`,
      choices: [
        `Kafka 3브로커 클러스터를 구성한다. 지금은 과하지만 나중에 트래픽이 커질 때를 미리 대비하는 것이다.`,
        `Redis Pub/Sub으로 작업을 전달한다. 가장 빠르고 구성이 단순하며 워커가 채널을 구독하기만 하면 된다.`,
        `RabbitMQ를 직접 클러스터로 구성해 운영한다. 라우팅과 우선순위를 나중에 쓸 수 있어 확장에 유리하다.`,
        `SQS 큐와 DLQ와 멱등 워커(또는 이미 있는 PostgreSQL의 SKIP LOCKED 큐)로 시작하고, 재생이나 팬아웃 요구가 생기면 승격을 검토한다.`
      ],
      answer: 3,
      why: `월 50만 건은 평균 초당 0.2건 정도라 처리량 문제가 아니고 운영 부담이 선택 기준이다. 관리형 SQS나 이미 있는 DB 큐는 새 인프라 운영이 거의 없다. Pub/Sub은 구독자가 연결돼 있지 않으면 메시지가 사라져 작업 전달에 부적합하다(1번). Kafka와 자가 구성 RabbitMQ는 운영 인력이 1명인 상황에서 비용 대비 근거가 없다(0·2번). 승격 조건을 ADR에 적어 두면 나중 요구에도 대응할 수 있다.`
    },
    {
      q: `워커 풀(스레드 40개)이 큐에서 작업을 가져와 외부 API를 호출한다. 평소 도착률은 초당 120건, 건당 평균 처리 시간은 250ms였다. 외부 API가 느려져 평균 처리 시간이 1.0초가 됐고 도착률은 그대로다. 무슨 일이 일어나며 무엇을 해야 하는가?`,
      choices: [
        `필요 동시성이 30에서 40으로 조금 늘 뿐이라 스레드 40개로 충분하다. 큐 깊이가 약간 늘 수 있으나 별도 대응은 필요 없다.`,
        `필요 동시성이 120으로 늘어 40개 스레드는 초당 40건만 처리하고 적체가 초당 약 80건씩 쌓인다. 호출 타임아웃과 서킷 브레이커, 접수 제한(백프레셔), 가장 오래된 메시지 나이 알람으로 대응한다.`,
        `스레드를 1,000개로 늘려 여유를 확보한다. 외부 API는 요청이 늘어도 처리 시간이 변하지 않으므로 부작용이 없다.`,
        `소비자의 prefetch를 키워 더 많은 메시지를 미리 가져오면 처리율이 올라가 적체가 해소되고 외부 API 지연도 상쇄된다.`
      ],
      answer: 1,
      why: `Little's Law로 필요 동시성은 120 x 1.0 = 120이다. 40개 스레드는 초당 40건(40/1.0)만 처리하므로 120 - 40 = 80건/초씩 적체가 쌓인다(평소엔 120 x 0.25 = 30이라 충분했다). 필요 동시성이 40으로 조금 늘 뿐이라는 계산은 틀렸다(0번). 1,000개로 늘리면 이미 느려진 외부 API에 더 큰 부하를 줘 연쇄 장애를 키울 수 있다(2번). 프리페치는 미리 가져오는 양일 뿐 처리 능력이 아니다(3번). 느린 하류를 끊고 도착을 제한하는 것이 핵심이다.`
    }
  ],
  refs: [
    {
      title: `Scaling Memcache at Facebook (NSDI 2013)`,
      url: `https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala`,
      kind: `paper`,
      why: `Facebook이 memcached를 초당 수십억 요청 규모의 분산 키-값 저장소로 키운 경험(NSDI 2013, 385~398쪽)을 담은 원전. 이 모듈 검수에서는 소개 페이지의 초록만 확인했으니, 2·3강을 공부한 뒤 소개 페이지의 PDF 링크로 본문을 열어 look-aside 구조와 lease 절(stale set, thundering herd 완화)을 직접 읽어 보세요.`
    },
    {
      title: `Builders' Library: Caching challenges and strategies`,
      url: `https://builder.aws.com/content/3K9TeXp6strMiJ4vhakpRD7BQWO/caching-challenges-and-strategies`,
      kind: `article`,
      why: `캐시가 최적화에서 필수 의존성으로 변하는 과정, soft/hard TTL, 음성 캐시, 요청 병합, 캐시 없는 테스트를 정리한 글. 3강과 실습 1의 체크리스트로 씁니다.`
    },
    {
      title: `Redis 문서: Redis persistence`,
      url: `https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/`,
      kind: `doc`,
      why: `RDB와 AOF의 장단점, fsync 정책(always, everysec, no)과 손실 범위, 둘을 함께 쓰라는 권고, 백업 방법을 공식 문서로 확인합니다. 4강의 영속성 판단 근거입니다.`
    },
    {
      title: `Redis 문서: Key eviction`,
      url: `https://redis.io/docs/latest/develop/reference/eviction/`,
      kind: `doc`,
      why: `maxmemory와 maxmemory-policy별 동작, 복제·AOF 버퍼가 maxmemory에 포함되지 않는 이유, hit율 계산식을 설명합니다. 캐시 인스턴스 설정과 장애 로그 해석에 직접 씁니다.`
    },
    {
      title: `Martin Kleppmann: How to do distributed locking (2016-02-08)`,
      url: `https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html`,
      kind: `article`,
      why: `효율용 락과 정확성용 락의 구분, 만료와 정지 시나리오, fencing token, Redlock의 시간 가정 비판을 담은 글. 5강의 핵심 근거이며 Redis 쪽 반론과 함께 읽어 논쟁의 양면을 파악하세요.`
    },
    {
      title: `Apache Kafka 4.4 문서: Design (Message Delivery Semantics 절)`,
      url: `https://kafka.apache.org/44/design/design/`,
      kind: `doc`,
      why: `at-most-once, at-least-once, exactly-once의 정의, 소비자 오프셋과 처리 순서의 관계, 멱등 생산자와 트랜잭션, 외부 시스템에서의 exactly-once에는 상대 시스템의 협조가 필요하다는 설명을 공식 설계 문서로 확인합니다. 6·7강의 1차 자료입니다(2026-11 기준 4.4 문서).`
    },
    {
      title: `Kafka: a Distributed Messaging System for Log Processing (NetDB 2011)`,
      url: `https://pages.cs.wisc.edu/~akella/CS744/F17/838-CloudPapers/Kafka.pdf`,
      kind: `paper`,
      why: `토픽, 파티션, 오프셋, 소비자 pull, 순차 I/O와 배치로 처리량을 내는 로그 모델의 원전. 2011년 실험 수치는 현재 제품 성능과 구분해서 읽으세요.`
    },
    {
      title: `KIP-98: Exactly Once Delivery and Transactional Messaging`,
      url: `https://cwiki.apache.org/confluence/display/KAFKA/KIP-98+-+Exactly+Once+Delivery+and+Transactional+Messaging`,
      kind: `doc`,
      why: `생산자 ID와 파티션별 시퀀스로 재시도 중복을 제거하고 트랜잭션 코디네이터와 read_committed로 원자적 쓰기를 제공하는 설계. 7강에서 exactly-once의 범위와 한계를 이해하는 근거입니다.`
    },
    {
      title: `Amazon SQS 문서: Visibility timeout`,
      url: `https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html`,
      kind: `doc`,
      why: `기본 30초, 최대 12시간, ChangeMessageVisibility 하트비트, in-flight 한도, FIFO 그룹 처리 규칙을 정리합니다. 실습 2와 퀴즈 5번의 사실 근거입니다.`
    },
    {
      title: `Amazon SQS 문서: Using dead-letter queues`,
      url: `https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html`,
      kind: `doc`,
      why: `maxReceiveCount, redrive policy, DLQ 보존 기간이 원래 enqueue 시각 기준으로 계산되는 점, FIFO와 DLQ의 순서 주의사항을 설명합니다. 9강 DLQ 운영 설계의 근거입니다.`
    },
    {
      title: `RabbitMQ 문서: Quorum Queues`,
      url: `https://www.rabbitmq.com/docs/quorum-queues`,
      kind: `doc`,
      why: `Raft 복제 큐의 사용·회피 조건, delivery-limit과 포이즌 메시지 처리, at-least-once dead-lettering, publisher confirm과 수동 ack 권고를 담은 공식 문서. 버전별 동작이 바뀌므로 도입 전에 현재 문서로 재확인하세요.`
    },
    {
      title: `Builders' Library: Making retries safe with idempotent APIs`,
      url: `https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/`,
      kind: `article`,
      why: `클라이언트 토큰을 상태 변경과 원자적으로 저장하고, 같은 토큰에 같은 의미의 응답을, 다른 파라미터에는 검증 오류를 돌려주는 멱등 API 설계. 7강과 be-http 모듈을 잇는 자료입니다.`
    },
    {
      title: `Builders' Library: Avoiding insurmountable queue backlogs`,
      url: `https://builder.aws.com/content/3EuRcgkTP1MI0c7zM8W6HL3WIqA/avoiding-insurmountable-queue-backlogs`,
      kind: `article`,
      why: `큐 적체가 복구 불가능해지는 이유(30분 늦은 대응 뒤 소비 용량의 10배가 쌓이면 해소에 약 300분), Little's Law 계산, 고객별 제한, shuffle sharding, spillover, DLQ, 하트비트 연장을 다룹니다. 9강 적체와 백프레셔 설계의 핵심 자료입니다.`
    },
    {
      title: `Pat Helland: Life beyond Distributed Transactions: an Apostate's Opinion (CIDR 2007)`,
      url: `https://www.ics.uci.edu/~cs223/papers/cidr07p15.pdf`,
      kind: `paper`,
      why: `규모가 커지면 전역 분산 트랜잭션 대신 엔티티 단위 트랜잭션, at-least-once 메시징, 멱등 처리로 설계하라는 입장문. 8강 사가와 7강 멱등성의 이론적 배경입니다.`
    }
  ],
  gigs: [
    `의뢰인은 증상이 아니라 해법으로 말합니다("Redis 붙여 주세요", "Kafka 도입해 주세요"). 견적 전에 엔드포인트별 p95, DB CPU, 슬로우 쿼리 상위, 피크 RPS, 읽기와 쓰기 비율부터 측정하고, 이 진단을 1~2일짜리 별도 항목으로 먼저 계약하세요. 원인이 인덱스나 N+1이면 캐시와 브로커는 필요 없을 수 있습니다.`,
    `견적 전에 서면으로 확인할 것: 허용 stale 시간(상품, 재고, 권한별), 중복 처리가 돈이나 법적 문제가 되는 작업 목록, 유실 허용 여부, 평균과 피크 처리량, 알림·결제 외부 API의 한도, 납품 후 장애 대응 담당자, 클라우드 계정과 월 인프라 예산(관리형 큐·캐시 비용은 의뢰인 부담이며 가격은 계약 시점에 공식 요금표로 확인), Redis 라이선스와 관리형 지원 엔진에 대한 법무 의견.`,
    `납품물 체크리스트: docker compose 재현 환경, 브로커 선택 ADR(탈락 이유와 승격 조건 포함), 키·큐·토픽 명명 규칙과 TTL 표, 멱등·재시도·DLQ 정책 문서, 장애 주입 테스트와 결과표, 지표와 알람 정의(hit율, 가장 오래된 메시지 나이, DLQ 깊이, outbox 지연), 런북(DLQ 처리, 적체 대응, Redis 장애 동작). 증거가 없으면 하자 분쟁에서 말만 남습니다.`,
    `약속하지 말아야 할 문구: "exactly-once 보장", "메시지 유실 0", "캐시로 항상 최신 데이터". 대신 "at-least-once 전달과 멱등 처리로 중복 효과 0을 시험으로 증명", "허용 stale 5분을 합의서로 명시", "브로커 장애 시 복구 후 재처리" 같은 검증 가능한 문장으로 계약하세요.`,
    `전형적 함정: Redis를 영속성 없이 세션, 주문, 큐의 원본 저장소로 쓰기, Redis 락으로 재고·결제 정합성을 보장하겠다고 약속하기, 월 수만 건에 Kafka 3대 구성하기, 캐시와 큐를 한 인스턴스에 섞기, 알림 서비스 장애가 결제를 막게 두기, 캐시 도입 뒤 데이터 불일치 클레임을 막을 합의서가 없는 상태. 이 중 상당수가 납품 후 첫 이벤트 날에 터집니다.`,
    `견적 감(저자의 경험칙 수준 추정이며 검증된 시장 단가가 아닙니다. 단가는 공고와 상품 페이지로 따로 확인): 읽기 핫패스 3~5개의 캐시 도입은 측정, 구현, 무효화 규칙, 부하 테스트까지 3~6일, 멱등 워커와 DB 큐 또는 SQS와 DLQ와 런북은 5~10일, 아웃박스와 브로커 신규 도입은 10일 이상으로 보고, 범위가 불분명하면 진단, 캐시, 비동기화 세 단계로 나눠 단계별로 계약하세요.`,
    `보안과 개인정보: 캐시와 큐 페이로드에 개인정보와 토큰을 평문으로 오래 두지 말고(TTL, 필드 최소화, 필요 시 암호화), Redis와 브로커는 공인망에 열지 말고 내부망 바인딩, 인증과 ACL, TLS, 보안 그룹으로 제한하세요. 인터넷에 노출된 인증 없는 Redis는 외주 납품물에서 가장 흔하고 가장 큰 보안 사고 원인 중 하나입니다.`
  ]
};
