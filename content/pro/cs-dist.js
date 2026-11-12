(window.PRO_MODULES = window.PRO_MODULES || {})["cs-dist"] = {
  id: "cs-dist",
  summary: `분산 시스템의 시간·합의·일관성 이론과 Lamport·Raft·Dynamo·Spanner·Jepsen 논문을 직접 읽고, 중복·장애·파티션에서도 상태가 맞는 설계를 장애 주입 테스트로 증명해 납품할 수 있다.`,
  hours: 160,
  goals: [
    `부분 실패와 타임아웃의 모호성, RPC 의미론(at-most-once·at-least-once·exactly-once 효과)으로 외부 API 호출의 재시도·멱등 설계를 결정할 수 있다`,
    `happened-before와 Lamport·벡터 시계를 직접 구현해 두 이벤트가 인과 관계인지 동시인지 판정하고, 물리 타임스탬프 정렬과 last-write-wins의 위험을 설명할 수 있다`,
    `FLP 불가능성, CAP(Brewer 2012 정정 포함), PACELC를 정확한 진술로 설명하고 연산별 파티션 중·평시 선택표로 설계 리뷰에서 방어할 수 있다`,
    `선형성·직렬성·순차·인과·최종 일관성과 세션 보장을 구분하고, 짧은 연산 이력이 선형화 가능한지 판정하며 Jepsen 보고서를 주장·관찰·원인 표로 정리할 수 있다`,
    `Paxos Made Simple과 Raft 논문의 핵심 불변식(투표 제한·로그 매칭·이전 term 커밋 규칙)을 설명하고 etcd 3노드 장애 실험으로 재선출 시간과 쓰기 중단을 측정할 수 있다`,
    `리스·fencing token·split-brain·쿼럼 크기·장애 도메인 배치를 근거로 분산 락과 리더 선출 설계를 검토하고 위험을 지적할 수 있다`,
    `GFS·MapReduce·Bigtable·Dynamo·Spanner 논문을 문제→기법→포기한 것의 표로 정리하고, 논문 숫자와 현재 제품 스펙을 구분해 제품 선택 근거를 말할 수 있다`,
    `Outbox·Saga·멱등 소비자·Idempotency-Key로 중복 전달에도 최종 상태가 맞는 흐름을 설계하고, 장애 주입과 불변식 검사 결과를 보고서로 납품할 수 있다`
  ],
  lessons: [
    {
      title: `분산 시스템의 멘탈 모델: 부분 실패, 시스템 모델, 타임아웃의 한계`,
      body: `분산 시스템이란 네트워크로 연결된 여러 프로세스가 하나의 서비스처럼 동작하는 시스템입니다. 앱 서버 두 대와 데이터베이스 한 대만 있어도 이미 분산 시스템이고, 이 모듈의 모든 논문은 "한 대짜리 사고방식이 깨지는 지점"에서 출발합니다. 단일 머신에서는 함수 호출이 성공하거나 예외가 나거나 둘 중 하나이고 모든 코드가 같은 시계와 같은 메모리를 봅니다. 분산 환경에서는 공유 메모리, 공유 시계, 그리고 "상대가 살아 있는지 즉시 아는 능력"이 사라집니다.

### 부분 실패와 타임아웃의 모호함

가장 중요한 차이는 **부분 실패**입니다. 일부는 죽고 일부는 살아 있으며, 느린 것과 죽은 것은 밖에서 구분되지 않습니다. 결제 서버에 요청을 보내고 3초 타임아웃이 났다면 가능성은 셋입니다. (1) 요청이 서버에 도착하지 못했다. (2) 서버가 처리를 끝냈지만 응답이 유실됐다. (3) 서버가 아직 처리 중이다. 호출자는 셋을 구분할 수 없으므로 "실패했으니 다시 보낸다"는 결정은 (2)에서 이중 결제가 됩니다. 타임아웃은 "실패"가 아니라 "모름"입니다. 이것이 RPC 의미론의 출발점입니다.

- **at-most-once**: 재시도하지 않습니다. 중복은 없지만 유실이 생길 수 있습니다.
- **at-least-once**: 응답을 받을 때까지 재시도합니다. 유실은 없지만 중복이 생깁니다.
- **exactly-once 효과**: at-least-once에 수신 측 중복 제거(멱등성)를 더해 효과가 한 번만 일어난 것처럼 만듭니다. 네트워크가 정확히 한 번 배달하는 것이 아니라 중복을 무해하게 만드는 것입니다.

### 시스템 모델: 알고리즘은 가정 위에서만 맞다

분산 알고리즘의 정확성은 항상 모델 안에서 증명됩니다. 모델은 세 축입니다. **타이밍**(동기: 지연 상한을 앎 / 부분동기: 대체로 상한이 있으나 가끔 깨짐 / 비동기: 상한 없음), **장애**(crash-stop, crash-recovery, omission, Byzantine=임의 오동작), **네트워크**(메시지 손실·중복·재정렬 가능, 파티션). 실무에서 가장 현실적인 모델은 "부분동기 + crash-recovery + 손실·중복 가능한 네트워크"이며 Paxos와 Raft도 이 모델을 겨냥합니다. 논문을 읽을 때 첫 질문이 "어떤 모델을 가정했나"인 이유입니다. 가정이 내 환경에서 깨지면 증명도 깨집니다(시계 속도 가정, fsync가 거짓말하지 않는다는 가정 등).

성질도 두 종류로 나눕니다. **안전성(safety)** 은 "나쁜 일은 절대 일어나지 않는다"(같은 term에 리더가 둘이 없다, 확정된 값이 바뀌지 않는다)이고 **활동성(liveness)** 은 "좋은 일은 결국 일어난다"(요청이 언젠가 처리된다)입니다. 좋은 설계는 안전성을 어떤 장애에서도 지키고 활동성은 시스템이 충분히 안정적일 때만 약속합니다. 장애 중에 멈추는 것은 허용되지만 틀린 값을 내는 것은 허용되지 않습니다.

### 논문을 읽는 법(이 모듈 전체의 방법)

Lamport, Paxos, Raft, Dynamo, Spanner, Jepsen 보고서를 다섯 질문으로 읽습니다. ① 어떤 시스템 모델과 가정인가. ② 무엇을 보장(safety)하고 어떤 조건에서 진행(liveness)하는가. ③ 증명된 것과 실험으로 보인 것을 구분했는가. ④ 숫자는 어느 시대 어떤 하드웨어의 것인가(2003~2013년 논문의 수치는 지금 제품 스펙이 아닙니다). ⑤ 내 환경에서 깨지는 가정은 무엇인가. 순서는 초록과 결론, 그림과 표, 설계 절, 평가 절이며 알고리즘은 반드시 손으로 시공간 다이어그램을 그려 봅니다.

의뢰인 프로젝트에서 이 어휘는 단순하게 쓰입니다. "결제 API가 가끔 타임아웃인데 재시도해도 되나요?", "Redis 락을 걸었는데 가끔 두 번 돌아요" 같은 질문에 "어떤 모델에서 어떤 보장이 필요한가"를 되물을 수 있어야 합니다.`,
      code: `import random, uuid

class Server:
    def __init__(self):
        self.balance = 100
        self.seen = {}                      # request_id -> 결과 (멱등 장치)

    def debit(self, request_id, amount, dedupe):
        if dedupe and request_id in self.seen:
            return self.seen[request_id]
        self.balance -= amount              # 부수효과는 이미 발생
        self.seen[request_id] = self.balance
        return self.balance

def call_with_lossy_reply(server, request_id, amount, dedupe, loss=0.5):
    result = server.debit(request_id, amount, dedupe)
    if random.random() < loss:
        raise TimeoutError("응답 유실: 서버는 처리를 끝냈을 수 있다")
    return result

def client(dedupe, retries=5):
    s = Server()
    rid = str(uuid.uuid4())                 # 재시도마다 같은 요청 ID를 쓴다
    for _ in range(retries):
        try:
            call_with_lossy_reply(s, rid, 30, dedupe)
            break
        except TimeoutError:
            continue
    return s.balance                        # 올바른 값은 70

random.seed(7)
print("dedupe=False:", [client(False) for _ in range(6)])   # 70 아래로 내려가는 값이 섞인다
print("dedupe=True :", [client(True) for _ in range(6)])    # 항상 70`,
      codeLang: `python`,
      key: [
        `타임아웃은 "실패"가 아니라 "모름"이다: 도착 못함, 처리 후 응답 유실, 처리 중을 호출자가 구분할 수 없다`,
        `at-least-once 재시도 + 수신 측 멱등성 = exactly-once 효과. 중복을 없애는 것이 아니라 무해하게 만든다`,
        `알고리즘은 모델(타이밍·장애·네트워크) 안에서만 맞다. 안전성은 항상, 활동성은 안정적일 때만 약속한다`,
        `논문은 가정 → 보장 → 증명 vs 실험 → 숫자의 시대 → 내 환경에서 깨지는 가정 순으로 읽는다`
      ],
      pitfalls: [
        `재시도 로직을 넣고 서버에는 중복 제거가 없어 결제·포인트·메일이 이중 처리된다`,
        `중복 제거 기록(request_id 저장)을 상태 변경과 다른 트랜잭션에 저장해, 그 사이에 프로세스가 죽으면 중복 처리나 유실이 생긴다`,
        `타임아웃을 평균 지연 근처로 잡아 정상 요청까지 실패로 처리하고 재시도 폭주를 부른다`,
        `2003년 논문의 수치(청크 크기, 디스크 성능)를 오늘의 요구사항 산정에 그대로 가져다 쓴다`
      ]
    },
    {
      title: `시간과 순서: Lamport 1978 논문 읽기, 논리 시계와 벡터 시계`,
      body: `분산 시스템에서 "무엇이 먼저 일어났는가"는 생각보다 어려운 질문입니다. 서로 다른 머신의 물리 시계는 항상 어긋나고, 시간 동기화 서비스가 시계를 보정하면 시계가 뒤로 가거나 점프할 수 있으며, 가상머신이 몇 초 멈췄다 깨어나면 시계가 현실과 크게 벌어집니다. 서로 다른 서버의 로그가 섞이는 순간 타임스탬프로 이벤트 순서를 재구성하는 일은 믿을 수 없습니다. 1978년 Lamport의 "Time, Clocks, and the Ordering of Events in a Distributed System"은 이 문제를 시계 없이 푸는 방법을 보여 준 논문이고, 분산 시스템의 어휘를 만들었습니다.

### Lamport 논문의 세 가지 아이디어

**① happened-before(→)** 는 물리 시간이 아니라 인과 가능성으로 정의됩니다. 같은 프로세스에서 a가 b보다 먼저면 a→b, 메시지 송신은 그 수신보다 먼저, 그리고 이행적 닫힘(a→b, b→c이면 a→c)입니다. 어느 쪽도 성립하지 않는 두 이벤트는 **동시(concurrent)** 입니다. 이는 "같은 시각"이 아니라 "서로 영향을 줄 수 없었다"는 뜻입니다.

**② 논리 시계**는 이 부분 순서를 숫자로 근사합니다. 프로세스마다 카운터를 두고 이벤트마다 1을 올리고, 송신할 때 값을 메시지에 싣고, 수신할 때 ‹max(내 값, 메시지 값) + 1› 로 갱신합니다. a→b이면 C(a) < C(b)가 보장되지만 **역은 성립하지 않습니다**. 숫자가 작다고 원인인 것은 아닙니다. 동률은 프로세스 번호로 깨면 모든 이벤트에 전체 순서(total order)가 생깁니다.

**③ 이 전체 순서로 상태기계를 복제**할 수 있습니다. 모든 복제본이 같은 명령을 같은 순서로 결정적으로 적용하면 같은 상태가 됩니다. 논문은 이 순서로 분산 상호배제를 만드는 예를 보여 주는데, 이것이 이후 합의(Paxos, Raft)가 풀려는 "명령 순서에 모두가 동의하기"의 원형입니다. 논문 후반은 논리 시계를 물리 시계와 연결하고 시계 오차의 한계를 논하는데, 시계 오차를 감추지 않고 API로 드러내는 Spanner의 TrueTime(레슨 8)과 같은 문제의식으로 읽을 수 있습니다(이 연결은 내 해석입니다). 읽을 때는 정의 절만 따라가며 시공간 다이어그램을 직접 그려 보면 충분합니다.

### 벡터 시계: 동시성을 감지한다

논리 시계는 "인과인지 동시인지"를 구분하지 못합니다. 벡터 시계는 프로세스마다 칸을 가진 배열입니다. 수신하면 칸별 최댓값을 취한 뒤 자기 칸을 1 올립니다. 두 벡터에서 모든 칸이 V1 ≤ V2이면 V1이 인과적으로 앞서고, 서로 어느 쪽도 아니면 동시입니다. Dynamo는 이것으로 같은 키의 병행 갱신(버전 충돌)을 감지하고 충돌 해결을 애플리케이션에 맡깁니다. 비용은 참여자 수에 비례하는 벡터 크기이며 Dynamo는 벡터가 너무 커지면 오래된 항목을 잘라냅니다.

### 분산 스냅샷과 실무 연결

Chandy–Lamport(1985)는 실행을 멈추지 않고 마커 메시지로 일관된 전역 상태를 기록합니다. 스트림 처리의 체크포인트가 비슷한 발상을 쓴다는 점은 내 해석이므로 각 시스템 문서에서 확인하세요.

실무에서는 세 곳에 나타납니다. 첫째, 서버 여러 대의 로그를 ‹created_at› 으로 정렬해 이벤트를 재생하면 순서가 틀립니다. 인과를 추적하려면 trace id와 부모 span을 전파합니다. 둘째, last-write-wins(가장 늦은 타임스탬프가 이긴다)는 시계가 빠른 노드의 쓰기가 항상 이겨 정상 쓰기를 조용히 지웁니다. 셋째, 낙관적 락의 버전 컬럼은 단일 키 수준의 논리 시계입니다.`,
      code: `class Lamport:
    def __init__(self, pid):
        self.pid, self.t = pid, 0

    def local(self):
        self.t += 1
        return self.t

    def send(self):
        self.t += 1
        return self.t                       # 메시지에 실어 보낸다

    def recv(self, ts):
        self.t = max(self.t, ts) + 1        # +1만 하면 인과가 깨진다
        return self.t

    def stamp(self):
        return (self.t, self.pid)           # 동률은 pid로 깨 전체 순서를 만든다

def vc_leq(a, b):
    return all(a[k] <= b[k] for k in a)

def relation(a, b):
    if a == b:
        return "same"
    if vc_leq(a, b):
        return "a -> b"
    if vc_leq(b, a):
        return "b -> a"
    return "concurrent"

A = {"A": 1, "B": 0, "C": 0}                # A가 쓴 첫 버전
B = {"A": 1, "B": 1, "C": 0}                # B가 A의 버전을 보고 수정
C = {"A": 1, "B": 0, "C": 1}                # C도 A의 버전을 보고 수정
print(relation(A, B))                       # a -> b
print(relation(B, C))                       # concurrent: 충돌, 병합이 필요`,
      codeLang: `python`,
      key: [
        `happened-before는 인과 가능성이다. 어느 쪽도 아니면 concurrent(동시)이며 "같은 시각"이 아니다`,
        `Lamport 시계는 a→b이면 C(a) < C(b)이지만 역은 불성립. 동시성은 벡터 시계만 감지한다`,
        `전체 순서 + 결정적 상태기계 = 복제 상태기계. 합의가 풀려는 문제의 원형이다`,
        `LWW와 물리 타임스탬프 정렬은 시계 오차·점프에 취약하다. 인과는 ID 전파(trace id, 버전)로 추적한다`
      ],
      pitfalls: [
        `서버별 로컬 시각 로그를 합쳐 이벤트 순서를 단정한다(시간 동기화 보정으로 순서가 역전될 수 있다)`,
        `수신 시 max를 취하지 않고 +1만 하는 논리 시계 구현으로 인과 순서가 깨진다`,
        `벡터 시계에 클라이언트마다 ID를 부여해 벡터가 무한히 커진다`,
        `"동시"를 "충돌 없음"으로 오해하거나, 반대로 동시 갱신을 감지하지 못하고 한쪽을 덮어쓴다`
      ]
    },
    {
      title: `불가능성과 트레이드오프: FLP, Byzantine, CAP의 정확한 진술, PACELC`,
      body: `분산 시스템 이론에는 "이건 불가능하다"는 결과가 몇 개 있고, 그것을 정확히 알아야 제안서의 "무중단·완전한 일관성" 같은 과장된 약속을 걸러낼 수 있습니다. 이 레슨은 FLP, Byzantine, CAP, PACELC를 정확한 진술과 흔한 오해의 형태로 정리합니다.

### FLP 불가능성(1985)

Fischer–Lynch–Paterson 논문은 **완전 비동기 모델**(지연 상한도 시계도 없음)에서 프로세스 하나만 crash할 수 있어도 **항상 종료하는 결정적 합의 알고리즘은 없다**고 증명합니다. 직관은 이렇습니다. 느린 프로세스와 죽은 프로세스를 구분할 수 없으므로 결정을 미루면 안전하지만 영원히 기다릴 수 있고, 결정하면 나중에 반대 값을 가진 느린 프로세스가 나타날 수 있습니다. 증명은 아직 어느 값도 확정되지 않은(bivalent) 초기 상태가 존재하고, 적대적인 메시지 순서가 그 상태를 영원히 유지할 수 있음을 보입니다.

"합의는 불가능하다"는 뜻이 아닙니다. **안전성은 항상 지키고 활동성은 가정이 맞을 때만 보장한다**는 설계로 우회합니다. 우회로는 타임아웃으로 부분동기를 가정하기(Paxos와 Raft의 리더 선출), 랜덤화(Raft의 무작위 선거 타임아웃이 동시 출마를 흩뜨림), 실패 감지기입니다. 그래서 Raft 클러스터는 네트워크가 불안정하면 리더 없이 멈출 수는 있어도 서로 다른 두 값을 확정하지는 않습니다.

### Byzantine 장애

Lamport–Shostak–Pease(1982)는 노드가 임의로(거짓 메시지, 상대에 따라 다른 말) 오동작할 때의 합의를 다룹니다. 서명 없는 메시지 모델에서 f개의 오동작 노드를 견디려면 최소 3f+1개 노드가 필요하다는 것이 대표 결과입니다. 사내 서비스 외주는 crash 장애 모델이면 거의 충분하고, 서로 믿지 않는 여러 조직이 참여하는 블록체인·컨소시엄에서 비로소 필요해집니다. PBFT는 심화 주제로 넘깁니다.

### CAP: 정확한 진술

Brewer가 2000년 PODC 기조연설에서 제기하고 Gilbert–Lynch(2002)가 형식화한 정리를 정확히 쓰면 이렇습니다. **네트워크 파티션이 발생했을 때 선형성(C)과 모든 정상 노드의 응답 가능성(A)을 동시에 가질 수 없다.** 흔한 오해는 둘입니다. "세 가지 중 둘을 고른다"(파티션은 고르는 것이 아니라 일어나는 사건이고, 파티션이 없는 "CA"는 단일 노드와 같다), 그리고 "시스템 전체를 CP 또는 AP로 분류한다". Brewer 본인이 2012년에 정정했습니다. 파티션은 드물고, 파티션 중의 선택은 연산과 데이터마다 다르며, 핵심은 파티션을 감지해 제한된 모드로 동작하다가 복구 후 상태를 합치고 보상하는 일입니다.

### PACELC와 비판

Abadi의 PACELC는 CAP이 말하지 않는 평시를 채웁니다. 파티션(P)이면 가용성(A)과 일관성(C) 중 선택하고, 아닐 때(Else)에도 지연(L)과 일관성(C) 중 선택합니다. 일관성을 위해 복제본의 응답을 더 기다릴수록 느려지기 때문입니다. Abadi의 글은 Dynamo·Cassandra의 기본 설정을 PA/EL, 완전한 ACID DB를 PC/EC, PNUTS를 PC/EL로 분류하며, 이는 기본 설정 기준이고 R과 W 같은 튜닝으로 위치가 옮겨 갑니다. Kleppmann은 CAP의 A와 C 정의가 실제 시스템과 어긋난다고 비판하며 연산 지연이 네트워크 지연에 얼마나 민감한가(delay-sensitivity)로 보자고 제안했습니다(초록만 확인한 내용이므로 본문을 직접 읽어 확인하세요).

### 설계 리뷰에서 쓰는 형식

"우리는 AP입니다" 대신 연산별 표를 만듭니다.

| 연산 | 파티션 중 | 평시 선택 |
| 결제 승인 | 거부(C 우선) | 강한 일관성, 지연 감수 |
| 상품 목록 | 캐시 응답(A 우선) | 낮은 지연 우선 |
| 장바구니 담기 | 양쪽 쓰기 허용 후 병합(A 우선) | 낮은 지연 우선 |`,
      code: `def handle_write(group, total, mode):
    """파티션으로 갈라진 한쪽 그룹이 쓰기 요청을 받았을 때의 동작"""
    majority = len(group) * 2 > total
    if mode == "CP":
        return "OK" if majority else "REJECT (unavailable)"
    return "OK (복구 후 충돌 병합 필요할 수 있음)"   # AP: 항상 받는다

total = 5
sides = {"left": ["n1", "n2", "n3"], "right": ["n4", "n5"]}
for mode in ("CP", "AP"):
    for name, group in sides.items():
        print(mode, name, "->", handle_write(group, total, mode))

def write_latency(rtts_ms, w):
    """평시(파티션 없음): W개 응답을 기다리는 시간 = W번째로 빠른 응답"""
    return sorted(rtts_ms)[w - 1]

rtts = [2, 3, 85]                           # 같은 AZ 2대, 먼 지역 1대
print(write_latency(rtts, 2), write_latency(rtts, 3))   # 3 85: 평시에도 일관성은 지연으로 값을 치른다`,
      codeLang: `python`,
      key: [
        `FLP: 완전 비동기 + crash 1개면 항상 종료하는 결정적 합의는 불가. 우회는 부분동기(타임아웃)·랜덤화·실패 감지기이며 안전성은 항상 유지한다`,
        `Byzantine 합의는 서명 없는 모델에서 3f+1 노드가 필요하다. 사내 서비스는 보통 crash 모델이면 충분하다`,
        `CAP: 파티션이 났을 때 선형성과 모든 노드의 가용성을 함께 가질 수 없다. "3중 2"도 시스템 전체 라벨도 아니다(Brewer 2012)`,
        `PACELC: 파티션이면 A↔C, 아니면 L↔C. 분류는 기본 설정 기준이고 튜닝으로 이동한다`,
        `설계 리뷰는 제품 라벨이 아니라 연산별 선택표(파티션 중 동작 / 평시 지연 예산)로 한다`
      ],
      pitfalls: [
        `"CA 시스템"이라는 분류를 쓰거나 "A는 CP, B는 AP" 같은 제품 라벨을 근거 없이 주장한다`,
        `FLP를 "합의는 불가능"으로 읽거나, "Raft가 FLP를 깼다"고 말한다`,
        `동기 복제의 왕복 지연 같은 평시 비용을 무시하고 CAP만으로 결정한다`,
        `파티션을 "완전히 끊김"으로만 생각한다. 긴 GC 정지, 단방향 손실, 일부 경로의 극심한 지연도 파티션처럼 동작한다`
      ]
    },
    {
      title: `일관성 모델의 지도와 Jepsen 보고서 읽기`,
      body: `"일관성"은 분야마다 뜻이 달라 외주 현장에서 가장 많이 어긋나는 용어입니다. 이 레슨은 Jepsen의 관점처럼 일관성 모델을 "관측될 수 있는 이력(history)의 집합"으로 정의하고, 강한 것부터 약한 것까지 지도를 그린 뒤 실제 사고 보고서를 읽어 봅니다.

### 단일 객체 모델의 사다리

**선형성(linearizability, Herlihy–Wing 1990)**: 각 연산이 호출과 응답 사이의 한 순간에 원자적으로 일어난 것처럼 보여야 하고, 이미 끝난 연산은 이후에 시작한 연산보다 앞서는 것으로 취급됩니다(실시간 순서 존중). 쓰기가 끝났다는 응답을 받은 뒤에 시작한 읽기가 옛값을 보면 위반입니다. **순차 일관성**: 모두가 같은 하나의 전체 순서를 보고 각 프로세스의 순서는 보존되지만 실시간과는 무관합니다. **인과 일관성**: 인과 관계가 있는 연산만 모두에게 같은 순서로 보입니다. **최종 일관성**: 갱신이 멈추면 결국 복제본이 같은 값으로 수렴한다는 약속뿐입니다. Vogels가 정리한 **세션 보장**은 그 위에 얹는 실용적 조각입니다. read-your-writes(내 쓰기는 내가 본다), monotonic reads(읽은 값보다 과거로 되돌아가지 않는다), monotonic writes, writes-follow-reads입니다.

### 다중 객체(트랜잭션) 모델과 이상 현상

**직렬성(serializability)** 은 트랜잭션들의 결과가 어떤 직렬 실행과 같다는 뜻이고 실시간 조건이 없습니다. 선형성과 직렬성을 모두 만족하면 **strict serializability** 입니다. 그 아래에 snapshot isolation, repeatable read, read committed가 있고, 이름이 같아도 제품마다 허용하는 이상 현상이 다르므로(PostgreSQL의 Repeatable Read는 snapshot isolation) 이름이 아니라 허용되는 이상 현상으로 판단합니다. 대표 현상은 stale read(옛값 읽기), lost update(갱신 소실), write skew(서로 다른 행을 읽고 쓴 두 트랜잭션이 함께 규칙을 깸), long fork(관찰자마다 갱신 순서가 다르게 보임)입니다.

### 가용성과 쿼럼

Jepsen 지도는 모델을 파티션 중 가용성으로도 분류합니다. 선형성과 순차 일관성은 일부 노드가 응답할 수 없고, 인과·read-your-writes는 클라이언트가 같은 서버에 붙어 있으면 응답할 수 있으며(sticky available), read committed 같은 약한 모델은 어느 노드든 응답할 수 있습니다(totally available). 세부 분류는 지도에서 확인하세요. N개 복제본에 W개로 쓰고 R개로 읽을 때 R+W>N이면 읽기 집합과 쓰기 집합이 한 노드 이상 겹쳐 최신 쓰기를 하나는 봅니다. 하지만 이것이 선형성은 아닙니다. 동시 쓰기, sloppy quorum(원래 담당이 아닌 노드에 임시로 쓰기), 전파 도중의 읽기 때문에 쿼럼 읽기도 옛값을 줄 수 있습니다.

### Jepsen 보고서 읽는 법

Jepsen은 동시 클라이언트로 연산 이력을 기록하면서 네트워크 분할, 프로세스 kill, 일시정지를 주입하고, 검사기(선형성은 Knossos, 트랜잭션 이상 현상은 Elle)가 이력이 주장한 모델에 속하는지 판정합니다. 보고서는 "주장 → 설정과 버전 → 관찰된 위반 → 원인 → 벤더 대응" 표로 정리하며 읽습니다. 예를 들어 PostgreSQL 12.3은 serializable에서 G2-item 이상이 관찰되었고(2020-06-12) 충돌 탐지 버그로 설명되었습니다. Amazon RDS for PostgreSQL 17.4 Multi-AZ 클러스터는 장애 주입 없이도 Snapshot Isolation 위반(Long Fork)이 관찰되었고(2025-04-29, 05-03 갱신), AWS는 primary가 메모리 락 순서로, secondary가 WAL 순서로 가시성을 정해 순서가 갈라지는 것이 원인이라고 설명했습니다. MariaDB Galera 12.1.2 이상(12.2.2까지 시험)은 모든 노드가 동시에 죽는 장애에서 커밋이 확인된 트랜잭션이 손실되었고(‹innodb_flush_log_at_trx_commit=0› 설정), 장애 주입이 없어도 lost update와 stale read가 관찰되었다고 보고되었습니다(2026-03-16). 결과는 해당 버전 기준이므로 이후 수정 여부는 직접 확인해야 합니다(2026-11 기준 미확인).`,
      code: `from itertools import permutations

# op = (이름, 종류, 값, 호출시각, 응답시각)
def respects_real_time(order):
    # a가 b의 호출보다 먼저 끝났다면 a는 b보다 앞에 와야 한다
    for i, a in enumerate(order):
        for b in order[i + 1:]:
            if b[4] < a[3]:                 # b가 a의 호출 전에 이미 끝났는데 뒤에 놓임
                return False
    return True

def linearizable(history, init=0):
    for order in permutations(history):
        if not respects_real_time(order):
            continue
        reg, ok = init, True
        for _, kind, val, _, _ in order:
            if kind == "w":
                reg = val
            elif val != reg:                # 읽은 값이 직전 쓰기 값과 다르다
                ok = False
                break
        if ok:
            return True
    return False

h = [("w1", "w", 1, 0, 10),
     ("w2", "w", 2, 12, 20),
     ("r1", "r", 1, 25, 30)]                # w2가 끝난 뒤 시작한 읽기가 1을 봄
print(linearizable(h))                      # False: stale read
h[2] = ("r1", "r", 2, 25, 30)
print(linearizable(h))                      # True`,
      codeLang: `python`,
      key: [
        `일관성 모델은 허용되는 이력의 집합이다. 선형성(실시간 순서)·순차·인과·최종 순으로 약해진다`,
        `직렬성(다중 객체 트랜잭션, 실시간 조건 없음)과 선형성(단일 객체, 실시간)은 다르다. 둘 다면 strict serializable이다`,
        `R+W>N은 읽기·쓰기 집합이 겹친다는 뜻일 뿐 선형성 보증이 아니다`,
        `제품 이름(Repeatable Read)이 아니라 허용되는 이상 현상(write skew, long fork 등)으로 판단한다`,
        `Jepsen 보고서는 주장 → 설정·버전 → 위반 → 원인 → 벤더 대응으로 읽고, 결과가 버전 한정임을 기록한다`
      ],
      pitfalls: [
        `요구서에 "강한 일관성"이라고만 쓰고 선형성인지 직렬성인지, 어떤 연산 범위인지 정의하지 않는다`,
        `쿼럼(R+W>N) 설정만으로 항상 최신 값을 읽는다고 안내한다`,
        `읽기 복제본에서 방금 쓴 값이 안 보이는 현상을 정상으로 방치해 "저장했는데 안 보여요" 문의를 만든다`,
        `Jepsen 결과를 제품 전체의 평가로 일반화한다(특정 버전과 설정에 한정된 결과다)`
      ]
    },
    {
      title: `복제와 합의의 문제 정의, Paxos Made Simple 읽기`,
      body: `데이터를 여러 서버에 복제하는 이유는 장애 시 가용성, 읽기 처리량 분산, 사용자와의 거리(지연)입니다. 복제의 난점은 하나입니다. 복제본들이 같은 변경을 같은 순서로 적용하게 만드는 것입니다.

### 복제 방식의 지도

- **primary-backup**: primary가 쓰기를 받아 backup에 전달합니다. 비동기 복제는 빠르지만 primary가 죽어 failover하면 아직 전달되지 않은 쓰기가 사라집니다(복제 지연이 곧 잠재적 손실량). 동기 복제는 손실이 없지만 backup 하나가 느리거나 죽으면 쓰기가 멈춥니다.
- **체인 복제**: 쓰기는 head에서 tail로 전파되고 읽기는 tail이 담당해 선형성을 단순하게 얻습니다.
- **상태기계 복제(SMR)**: 결정적 상태기계와 모든 복제본이 같은 순서로 적용하는 명령 로그입니다. 문제는 "누가 로그의 다음 칸을 정하는가"이고 이것이 합의입니다.
- **쿼럼(과반) 복제**: 동기와 비동기의 중간 해법으로 전체가 아니라 과반만 확인하면 진행합니다. 2f+1대가 f대의 crash를 견딥니다(3대는 1대, 5대는 2대).

### 합의 문제와 세 가지 안전성 조건

합의는 여러 후보 중 하나의 값을 모두가 같게 결정하는 문제입니다. Paxos Made Simple은 안전성을 세 문장으로 못 박습니다. 제안된 값만 선택될 수 있다, 하나의 값만 선택된다, 값이 정말 선택되기 전에는 아무도 선택되었다고 학습하지 않는다. 논문의 독특한 전개는 이 조건에서 출발해 acceptor가 지켜야 할 규칙을 거꾸로 유도하는 것입니다. 읽을 때 알고리즘 박스부터 보지 말고 "어떤 규칙이 어떤 안전성 위반을 막는가"를 표로 만드세요.

### Paxos 한 번의 결정

제안자는 번호 n을 고르고 두 단계를 수행합니다.

1. **Prepare/Promise**: 과반 acceptor에게 prepare(n)을 보냅니다. acceptor는 n이 지금까지 약속한 번호보다 크면 "n보다 작은 제안은 수락하지 않겠다"고 약속하고, 이미 수락한 (번호, 값) 중 가장 높은 것을 응답에 담습니다.
2. **Accept/Accepted**: 제안자는 응답 중 가장 높은 번호로 수락된 값이 있으면 **그 값을 이어받아** 제안하고, 없을 때만 자기 값을 씁니다. 약속을 어기지 않는 acceptor는 수락하고, 과반이 수락하면 값이 선택(chosen)된 것입니다.

첫 단계는 과거 조사(이미 선택되었을 수 있는 값을 발견)와 미래 차단(낮은 번호 제안의 수락을 막음)을 동시에 합니다. "과반이 수락한 값이 있으면 이후 더 높은 번호의 제안은 반드시 그 값이다"라는 불변식이 Paxos의 심장입니다. 두 제안자가 번호를 번갈아 올리며 서로의 2단계를 막는 문제(듀얼링)는 안전성이 아니라 활동성 문제이고 FLP 때문에 피할 수 없으므로, 안정적인 리더 한 명을 두어 완화합니다.

### Multi-Paxos와 현실

실제 시스템은 로그의 칸마다 Paxos를 한 번씩 돌립니다. 안정된 리더가 있으면 1단계를 모든 칸에 대해 한 번만 하고 이후 칸은 2단계 한 왕복으로 끝나며, 배칭과 파이프라이닝으로 처리량을 올립니다. 디스크에 기록하는 지연이 성능을 좌우한다는 점은 SRE 책 23장이 강조합니다. 다만 Paxos Made Simple은 구성 변경, 로그 공백 메우기, 스냅샷 같은 구현 세부를 거의 남겨 둬 구현마다 달라졌고 이것이 Raft의 배경입니다. 원전 The Part-Time Parliament(1998 게재, 1990 최초 투고)는 이야기체라서 처음에는 Paxos Made Simple을 권합니다.

### 2PC와의 관계

2단계 커밋(2PC)은 코디네이터가 죽으면 참가자가 불확실 상태로 막힙니다. Gray–Lamport의 Paxos Commit은 코디네이터의 결정을 Paxos로 복제해 이를 해결하며, 2PC는 장애를 0개 허용하는 Paxos Commit이라는 설명이 논문 소개에 있습니다(본문은 이번 조사에서 읽지 않았습니다). Spanner가 이 조합을 씁니다(레슨 8).`,
      code: `class Acceptor:
    def __init__(self):
        self.promised = 0                   # 약속한 가장 높은 번호 (실제로는 디스크에 영속화)
        self.acc_n, self.acc_v = 0, None    # 수락한 (번호, 값)

    def prepare(self, n):
        if n > self.promised:
            self.promised = n
            return ("promise", self.acc_n, self.acc_v)
        return ("reject",)

    def accept(self, n, v):
        if n >= self.promised:
            self.promised = n
            self.acc_n, self.acc_v = n, v
            return "accepted"
        return "reject"

def propose(acceptors, n, my_value):
    promises = [r for a in acceptors if (r := a.prepare(n))[0] == "promise"]
    if len(promises) * 2 <= len(acceptors):
        return None                                 # 과반 약속을 못 받음
    prior = max(promises, key=lambda p: p[1])       # 이미 수락된 최고 번호의 값
    value = prior[2] if prior[1] > 0 else my_value  # 있으면 그 값을 이어받는다
    oks = sum(a.accept(n, value) == "accepted" for a in acceptors)
    return value if oks * 2 > len(acceptors) else None

nodes = [Acceptor() for _ in range(3)]
print(propose(nodes, 1, "A"))   # A
print(propose(nodes, 2, "B"))   # A: 이미 선택된 값을 B 제안자도 이어받는다`,
      codeLang: `python`,
      key: [
        `합의의 안전성: 제안된 값만 선택 / 하나만 선택 / 선택되기 전에는 학습 금지`,
        `Paxos 불변식: 과반이 수락한 값이 있으면 이후 더 높은 번호 제안은 그 값을 이어받는다. 1단계는 과거 조사와 미래 차단이다`,
        `2f+1대가 f대 crash를 견딘다. 듀얼링은 활동성 문제이며 안정 리더로 완화한다`,
        `Multi-Paxos는 안정 리더가 있으면 칸당 한 왕복이고 디스크 기록 지연이 성능을 좌우한다. 구현 세부의 공백이 Raft의 배경이다`
      ],
      pitfalls: [
        `합의 알고리즘을 직접 구현해 운영 코드에 넣는다(검증된 etcd·ZooKeeper 같은 시스템을 쓴다)`,
        `비동기 복제의 failover 손실 가능량(RPO)을 말하지 않고 "이중화되어 있다"고만 설명한다`,
        `acceptor의 약속·수락 상태를 영속화하지 않아 재시작 후 약속이 사라지고 안전성이 깨진다`,
        `2PC 코디네이터 장애 시 참가자가 막힐 수 있다는 점을 간과한다`
      ]
    },
    {
      title: `Raft 논문 읽기: 리더 선출, 로그 복제, 안전성, 구성 변경`,
      body: `Raft(Ongaro·Ousterhout, USENIX ATC 2014)는 Paxos와 같은 결과를 내면서 문제를 리더 선출, 로그 복제, 안전성으로 나눠 이해하기 쉽게 만든 합의 알고리즘입니다. 논문에는 학생 43명 대상 퀴즈 실험(33명이 Raft 점수가 더 높았고 평균은 60점 만점에 25.7 대 20.8)이 있지만 학생 대상이고 저자가 수행한 실험이라는 한계가 있어 참고로만 받아들이면 됩니다. 가장 실용적인 부분은 Figure 2의 요약표로, 구현자가 지킬 규칙이 압축되어 있습니다.

### 상태와 term

노드는 follower, candidate, leader 중 하나입니다. **term**은 단조 증가하는 정수로 논리 시계 구실을 하고, 한 term에는 노드마다 한 번만 투표하므로 한 term의 리더는 최대 한 명입니다. 더 높은 term의 메시지를 받으면 노드는 즉시 follower로 돌아가 term을 갱신합니다. 이 규칙 하나가 낡은 리더를 무력화합니다.

### 리더 선출

follower는 리더의 heartbeat가 선거 타임아웃 안에 오지 않으면 candidate가 되어 term을 올리고 자신에게 투표한 뒤 RequestVote를 보냅니다. 과반 득표하면 리더가 됩니다. 타임아웃은 논문 예시로 150~300ms 범위의 무작위 값이라 동시에 출마해 표가 갈릴 확률이 낮고, 갈리면 다음 무작위 타임아웃 뒤에 다시 시도합니다. 투표에는 **선거 제한**이 붙습니다. 후보의 로그가 투표자의 로그만큼 최신(마지막 엔트리의 term이 더 크거나, 같으면 더 길다)일 때만 표를 줍니다. 이 제한 덕분에 과반에 복제된(커밋된) 엔트리는 새 리더에게 반드시 존재합니다. 과반인 두 집합은 항상 겹치기 때문입니다.

### 로그 복제

리더는 명령을 로그에 추가하고 AppendEntries로 follower에게 보냅니다. 요청에는 새 엔트리 바로 앞 엔트리의 (index, term)이 들어 있고 follower는 자기 로그에 그 엔트리가 있을 때만 받습니다(**로그 매칭 속성**: 같은 index와 term이면 같은 명령이고 그 앞 로그도 같다). 거절되면 리더가 한 칸씩 물러나 일치하는 지점을 찾고 follower의 충돌 구간을 자기 로그로 덮어씁니다. 과반에 복제된 엔트리는 커밋되어 상태기계에 적용됩니다.

### 가장 미묘한 규칙: 이전 term의 엔트리

새 리더는 **이전 term의 엔트리를 "과반에 복제됐다"는 사실만으로 커밋하면 안 됩니다**. 논문 Figure 8은 과반에 복제됐던 엔트리가 이후 리더 교체로 덮어써질 수 있음을 보여 줍니다. 리더는 자기 term의 엔트리가 과반에 복제되었을 때 커밋하고, 그 앞 엔트리는 간접적으로 커밋됩니다. 구현은 취임 직후 빈 엔트리(no-op)를 하나 넣어 이를 빨리 일으키는 경우가 많습니다.

### 구성 변경, 스냅샷, 읽기, 운영

서버 집합을 한꺼번에 바꾸면 같은 시점에 서로 다른 과반이 둘 생겨 리더가 둘이 될 수 있습니다. 논문은 joint consensus(옛 구성과 새 구성 양쪽의 과반을 요구하는 과도기)로 해결하고, 이후 Ongaro의 박사논문이 제안한 단순화(서버를 한 번에 하나씩 변경)가 널리 쓰입니다. 로그는 스냅샷으로 압축합니다. 읽기는 리더가 로컬 상태를 그냥 돌려주면 이미 교체된 줄 모르는 옛 리더의 stale read가 될 수 있어 리더 지위를 확인하는 절차가 필요합니다. 쓰기 지연은 리더의 fsync와 과반 follower의 응답 왕복으로 정해지므로 3노드를 먼 지역에 두면 그 RTT가 모든 쓰기에 더해집니다. 선거 타임아웃이 GC 정지나 순간적 네트워크 지연보다 짧으면 불필요한 리더 교체가 반복되고, 너무 길면 장애 후 쓰기 중단이 깁니다. etcd, Consul, Kafka의 KRaft 컨트롤러가 이 계열이며 Kafka 3.3.1(2022-10-03 릴리스)의 릴리스 항목에 KIP-833(KRaft를 production ready로 표기)이 올라 있습니다(2026-11 릴리스 이력 페이지 확인). 중단 시간은 직접 측정합니다(실습 2).`,
      code: `class Node:
    def __init__(self):
        self.term, self.voted_for = 0, None
        self.log = []                           # [(term, command)], index는 1부터

    def last(self):
        return (self.log[-1][0], len(self.log)) if self.log else (0, 0)

    def _see_term(self, t):
        if t > self.term:                       # 더 새로운 term을 보면 따라간다
            self.term, self.voted_for = t, None

    def on_request_vote(self, term, cand_id, cand_last):
        self._see_term(term)
        if term < self.term:
            return self.term, False
        fresh = cand_last >= self.last()        # (마지막 term, 마지막 index) 사전식 비교
        if fresh and self.voted_for in (None, cand_id):
            self.voted_for = cand_id            # 실제로는 응답 전에 디스크에 영속화
            return self.term, True
        return self.term, False

    def on_append(self, term, prev_idx, prev_term, entries):
        self._see_term(term)
        if term < self.term:
            return self.term, False
        if prev_idx > len(self.log) or (prev_idx > 0 and self.log[prev_idx - 1][0] != prev_term):
            return self.term, False             # 로그 매칭 실패: 리더가 한 칸 물러나 재시도
        for i, e in enumerate(entries):
            idx = prev_idx + 1 + i
            if idx <= len(self.log) and self.log[idx - 1][0] != e[0]:
                del self.log[idx - 1:]          # 충돌이 있을 때만 뒤를 잘라낸다
            if idx > len(self.log):
                self.log.append(e)
        return self.term, True

n = Node()
print(n.on_append(1, 0, 0, [(1, "a"), (1, "b")]))   # (1, True): term 1의 로그 [a, b]를 받는다
print(n.on_request_vote(2, "X", (1, 1)))            # (2, False): 후보 로그가 더 짧다(선거 제한)
print(n.on_request_vote(2, "Y", (1, 2)))            # (2, True): 로그가 같은 만큼 최신이면 표를 준다
print(n.on_request_vote(2, "Z", (1, 2)))            # (2, False): 같은 term에는 한 번만 투표한다`,
      codeLang: `python`,
      key: [
        `Raft = 리더 선출 + 로그 복제 + 안전성. term은 논리 시계이고 한 term에 리더는 최대 한 명이다`,
        `선거 제한(후보 로그가 투표자 로그만큼 최신)이 커밋된 엔트리가 새 리더에 남는 것을 보장한다`,
        `로그 매칭 속성: (index, term)이 같으면 그 앞까지 로그가 같다`,
        `이전 term의 엔트리는 복제 개수만으로 커밋하지 않는다(Figure 8). 자기 term의 엔트리가 과반이어야 한다`,
        `선거 타임아웃은 네트워크·GC 지연과 장애 후 쓰기 중단 시간 사이의 절충이며, 중단 시간은 측정해서 안다`
      ],
      pitfalls: [
        `currentTerm·votedFor·로그를 응답 전에 fsync하지 않아 재시작 후 이중 투표나 로그 유실이 생긴다`,
        `선거 타임아웃을 고정값으로 두거나 heartbeat 간격에 너무 가깝게 설정해 불필요한 리더 교체가 반복된다`,
        `이전 term의 엔트리를 복제 개수만으로 커밋한다`,
        `리더의 로컬 읽기를 선형 읽기라고 믿는다. 낡은 리더는 자신이 교체된 줄 모를 수 있다`
      ]
    },
    {
      title: `코디네이션 서비스, 리스와 fencing token, 리더 선출과 split-brain`,
      body: `합의 알고리즘을 앱마다 구현하는 것은 비싸고 위험합니다. 그래서 업계는 합의를 한 번 잘 구현한 **코디네이션 서비스**를 두고 앱이 그 위에서 리더 선출, 락, 설정 저장을 하게 합니다. Google의 Chubby, Yahoo!의 ZooKeeper, 그리고 etcd와 Consul이 이 역할입니다.

### Chubby와 ZooKeeper: 같은 목표, 다른 인터페이스

Chubby(OSDI 2006)는 **거친 단위(coarse-grained) 락**과 소량의 신뢰할 수 있는 저장소를 파일 시스템 모양으로 제공합니다. 짧게 자주 잡는 락이 아니라 "마스터가 누구인가" 같은 오래 유지되는 결정을 위한 것이고, 클라이언트는 세션과 캐시 무효화 콜백으로 연결됩니다. Bigtable 같은 Google 시스템이 마스터 선출과 메타데이터에 의존합니다. ZooKeeper(USENIX ATC 2010)는 락을 직접 주지 않고 **wait-free** 데이터 객체(계층형 znode)와 변경 알림(watch)을 주며, 락과 리더 선출은 그 위에서 클라이언트가 조합합니다. 쓰기는 리더를 거쳐 순서가 정해지고 읽기는 복제본이 로컬로 처리해 빠르지만 옛값일 수 있어, 최신이 필요하면 별도 동기화를 해야 합니다.

### 리스와 그 한계

리스(lease)는 시간제한이 있는 락입니다. 소유자가 죽어도 만료되면 다른 노드가 이어받습니다. 문제는 만료를 소유자가 스스로 알아차려야 한다는 점입니다. 소유자 프로세스가 GC, 가상머신 일시정지, 스왑, 네트워크 지연으로 멈췄다 깨어나면 리스가 끝난 줄 모르고 쓰기를 수행합니다. 그 사이 다른 노드가 새 리스를 얻어 쓰고 있다면 두 소유자가 동시에 쓰는 것입니다. 리스는 시간 흐름에 대한 가정에 기대는 기법이라 정확성의 유일한 근거가 될 수 없습니다.

### 효율용 락과 정확성용 락, fencing token

Kleppmann의 분석(2016)은 락을 목적으로 나눕니다. **효율용**은 중복 작업을 피하려는 것이라 실패해도 메일이 두 번 나가는 정도이며 단일 Redis 인스턴스로 충분한 경우가 많습니다. **정확성용**은 실패하면 데이터가 깨지는 경우이며 **fencing token**이 필요합니다. 락 서비스가 락을 줄 때마다 단조 증가하는 번호(예: 17, 18)를 발급하고, 보호받는 저장소가 지금까지 본 최대 번호를 기억해 더 작은 번호의 요청을 거부합니다. 17번을 받고 멈췄던 소유자가 깨어나 쓰려 해도 18번이 이미 다녀갔으므로 거부됩니다. 핵심은 검사를 보호받는 쪽(저장소)이 한다는 점입니다. Kleppmann은 Redlock이 타이밍 가정이 과하고 fencing token을 만들 수 없다고 비판합니다. 이에 대한 반박 글은 이번 조사에서 읽지 않았으므로 양쪽을 직접 읽고 판단하세요(출처 간 불일치, 2026-11 기준).

### 리더 선출과 split-brain

리더는 단일 장애점이자 확장 한계입니다. AWS Builders' Library의 리더 선출 글은 가능하면 멱등 API와 낙관적 락으로 리더 없이 해결하고, 필요할 때만 리스를 쓰되 정확성은 별도의 안전장치로 보장하라는 취지입니다. **split-brain**은 네트워크 분할로 양쪽이 서로를 죽었다고 보고 둘 다 primary가 되는 사고이며, heartbeat와 타임아웃만으로 failover하는 2노드 구성에서 전형적입니다. 과반 쿼럼을 요구하면 한쪽만 진행할 수 있습니다.

### 클러스터 크기, 배치, 모니터링

합의 클러스터는 보통 3대 또는 5대입니다. 3대는 1대, 5대는 2대의 장애를 견딥니다. 크기를 늘릴수록 쓰기가 더 많은 노드를 기다려 느려집니다. 장애 도메인 배치가 중요합니다. 두 가용 영역(AZ)에 2대와 1대를 두면 2대가 있는 AZ가 죽는 순간 쿼럼을 잃으므로 세 AZ에 1대씩이 기본입니다. 모니터링 항목은 건강한 멤버 수, 리더 존재 여부, 리더 교체 빈도, 커밋 인덱스 진행, 디스크 fsync 지연입니다. 합의 클러스터는 소량의 메타데이터용이므로 대용량·고빈도 데이터를 넣지 않습니다.`,
      code: `import itertools

class LockService:
    def __init__(self):
        self.counter = itertools.count(1)
        self.holder, self.expires = None, 0

    def acquire(self, who, now, ttl):
        if self.holder is None or now >= self.expires:
            self.holder, self.expires = who, now + ttl
            return next(self.counter)           # fencing token: 단조 증가
        return None

class Storage:
    def __init__(self):
        self.max_token, self.value = 0, None

    def write(self, token, value):
        if token < self.max_token:              # 오래된 소유자의 쓰기를 저장소가 차단
            return "REJECTED (stale token %d < %d)" % (token, self.max_token)
        self.max_token, self.value = token, value
        return "OK"

lock, store = LockService(), Storage()
t_a = lock.acquire("A", now=0, ttl=10)          # A가 token 1을 받고 긴 GC 정지에 들어간다
t_b = lock.acquire("B", now=11, ttl=10)         # 리스 만료 후 B가 token 2를 받는다
print(store.write(t_b, "from B"))               # OK
print(store.write(t_a, "from A (늦게 깨어남)"))   # REJECTED`,
      codeLang: `python`,
      key: [
        `합의를 직접 구현하지 말고 etcd·ZooKeeper·Consul 같은 코디네이션 서비스를 소량 메타데이터용으로 쓴다`,
        `리스는 시간·프로세스 정지에 취약하다. 정확성이 필요한 락은 fencing token을 저장소가 검사해야 한다`,
        `효율용 락(중복 작업 방지)과 정확성용 락(데이터 보호)을 구분해 비용을 정한다`,
        `쿼럼은 3 또는 5대, AZ는 3개에 분산한다. 2+1 배치는 큰 쪽 AZ 장애에 쿼럼을 잃는다`,
        `모니터링: 멤버 수, 리더 존재·교체 빈도, 커밋 진행, fsync 지연`
      ],
      pitfalls: [
        `Redis의 SET NX PX 락을 재고·결제 같은 정확성 보호에 쓰고 fencing이나 DB 조건부 갱신이 없다`,
        `2노드 + heartbeat 자동 failover로 운영해 네트워크 분할 때 split-brain이 생긴다`,
        `락 TTL을 평균 작업 시간보다 조금만 길게 잡고 작업 중 갱신 없이 긴 작업을 한다`,
        `합의 클러스터를 일반 데이터 저장소처럼 써서 용량과 fsync 병목을 만든다`
      ]
    },
    {
      title: `대규모 스토리지 논문의 계보: GFS·MapReduce·Bigtable·Dynamo·Spanner`,
      body: `이 레슨은 2003~2013년의 대형 시스템 논문을 "문제 → 기법 → 포기한 것"의 표로 읽는 연습입니다. 전문가가 가져가는 것은 숫자가 아니라 설계 이유이고, 그 이유가 현대 제품(Cassandra, Spanner 계열, HBase류, Kafka, Spark)을 고르는 근거가 됩니다. 계보는 GFS(2003) → Bigtable(2006) → Spanner(2012), Dynamo(2007) → Cassandra(2009, Dynamo와 Bigtable의 성격을 섞은 계보라는 점은 내 해석), MapReduce(2004) → Spark RDD(2012)입니다. 논문의 수치(64MB 청크, 2004년 클러스터 크기)는 당시 하드웨어 기준이므로 지금 제품 스펙과 섞지 마세요.

### GFS, MapReduce, Bigtable

**GFS**는 단일 마스터가 메타데이터만 쥐고 데이터는 64MB 청크로 나눠 기본 3곳에 복제합니다. 대용량 순차 읽기와 뒤에 덧붙이는 쓰기라는 워크로드에 맞춰 일관성을 느슨하게 하고 record append(최소 한 번 원자적 추가)를 제공했습니다. 최소 한 번이라 중복 레코드가 생길 수 있어 애플리케이션이 고유 ID나 체크섬으로 걸러냅니다. 교훈은 "워크로드에 맞게 보장을 줄이면 설계가 단순해진다"입니다. **MapReduce**는 작업을 map과 reduce 두 함수로 쓰게 하고 분할, 스케줄링, 장애 재실행을 런타임이 맡습니다. 재실행해도 같은 결과가 나오는 작은 단위(결정성·멱등성)로 쪼개는 사고가 핵심이며, 느린 태스크는 백업 태스크로 완화합니다. 논문의 정렬 실험은 백업 태스크를 끄면 44% 느려졌습니다(2004). **Bigtable**은 (row, column, timestamp)로 색인되는 정렬된 맵을 tablet 단위로 나눠 여러 서버가 서빙하고, 락과 마스터 선출은 Chubby에 기댑니다. 메모리 쓰기 버퍼와 불변 정렬 파일(SSTable)을 합치는 구조가 오늘날 LSM 계열 저장소의 출발점입니다.

### Dynamo: 항상 쓸 수 있는 키-값 저장소

Dynamo(SOSP 2007)는 장바구니처럼 쓰기가 거절되면 매출이 사라지는 서비스를 위해 일관성을 양보했습니다. 목표도 평균이 아니라 "99.9% 요청이 300ms 이내" 같은 백분위 SLA로 정의했습니다. 문제마다 기법을 하나씩 붙이는 구조가 읽는 포인트입니다.

| 문제 | 기법 |
| 데이터를 노드에 분산 | 일관 해싱 + 가상 노드 |
| 병행 갱신 감지 | 벡터 시계, 충돌 해결은 애플리케이션 |
| 일시적 노드 장애 중 쓰기 | sloppy quorum + hinted handoff |
| 영구 장애 후 복제본 동기화 | Merkle tree 기반 anti-entropy |
| 멤버십과 장애 감지 | gossip |

복제본 수 N, 쓰기 응답 수 W, 읽기 응답 수 R이며 대표 설정은 (N, R, W) = (3, 2, 2)입니다. R+W>N이면 집합이 겹치지만 레슨 4에서 봤듯 선형성은 아니고, R이나 W를 낮추면 지연이 줄고 일관성이 약해집니다(PACELC의 EL 쪽). **일관 해싱**은 키와 노드를 같은 해시 링에 올려 키를 시계 방향 첫 노드에 맡기며, 노드가 N대에서 N+1대로 늘 때 이동하는 키는 새 노드가 가져가는 약 1/(N+1)뿐입니다. 반면 ‹hash(key) % N› 방식은 4대에서 5대로 늘리면 약 80%의 키가 다른 서버로 옮겨 가 캐시가 사실상 비워집니다. 가상 노드는 노드당 링 위치를 여러 개 줘 부하를 고르게 합니다.

### Spanner: 시계 불확실성을 API로 드러내다

Spanner(OSDI 2012)는 전 지구 분산 DB에서 **외부 일관성** 트랜잭션을 제공합니다. 데이터는 Paxos 그룹으로 복제하고, 여러 그룹에 걸친 트랜잭션은 2PC로 조율합니다. 핵심은 **TrueTime**입니다. 시계가 정확하다고 가정하는 대신 ‹TT.now()›가 [earliest, latest] 구간을 돌려주고(GPS와 원자시계 기반, 논문은 불확실성이 대개 10ms 미만이라고 보고), 커밋 타임스탬프를 정한 뒤 그 시각이 확실히 과거가 될 때까지 기다립니다(**commit wait**, 논문 측정에서 약 5ms). 그러면 먼저 끝난 트랜잭션의 타임스탬프가 나중에 시작한 트랜잭션보다 항상 작아집니다. 일관성을 지연으로 치르므로 PACELC로는 PC/EC 쪽 사례로 볼 수 있습니다(이 분류는 내 해석). Brewer의 2017년 글은 Google의 자체 네트워크가 파티션을 드물게 만든다는 점을 논거로 삼는 것으로 보이나 초록만 확인했으므로 원문으로 확인하세요. 평범한 클라우드로 옮길 때 무엇이 바뀌는지 항상 물어야 합니다.

### 그 밖의 논문들

Percolator와 Aurora는 초록 수준만 확인했습니다. 전자는 분산 트랜잭션과 알림으로 색인을 증분 갱신하고 후자는 redo 처리를 스토리지 계층으로 내립니다. FoundationDB는 트랜잭션 계층과 저장 계층을 분리하고 결정론적 시뮬레이션으로 테스트합니다(레슨 10).`,
      code: `import bisect, hashlib

def h(s):
    return int(hashlib.md5(s.encode()).hexdigest(), 16)

class Ring:
    def __init__(self, nodes, vnodes=100):
        self.vnodes = vnodes
        self.ring = []                          # 정렬된 (해시, 노드)
        for n in nodes:
            self.add(n)

    def add(self, node):
        for i in range(self.vnodes):            # 노드당 가상 노드 여러 개
            bisect.insort(self.ring, (h(node + "#" + str(i)), node))

    def owner(self, key):
        i = bisect.bisect(self.ring, (h(key), "")) % len(self.ring)
        return self.ring[i][1]

keys = ["user:%d" % i for i in range(20000)]
ring = Ring(["n1", "n2", "n3", "n4"])
before = {k: ring.owner(k) for k in keys}
ring.add("n5")                                  # 4대 -> 5대
moved = sum(before[k] != ring.owner(k) for k in keys) / len(keys)
mod_moved = sum(h(k) % 4 != h(k) % 5 for k in keys) / len(keys)
print("ring moved: %.2f   modulo moved: %.2f" % (moved, mod_moved))   # 약 0.2 / 약 0.8`,
      codeLang: `python`,
      key: [
        `논문은 문제 → 기법 → 포기한 것의 표로 읽고, 숫자는 당시 하드웨어 기준임을 표시한다`,
        `GFS·MapReduce: 워크로드 특화 단순화와, 재실행해도 같은 결과가 나오는 작업 단위(+백업 태스크)`,
        `Dynamo: 일관 해싱·벡터 시계·sloppy quorum+hinted handoff·Merkle tree·gossip, (3,2,2), 백분위 SLA`,
        `Spanner: TrueTime 구간과 commit wait로 외부 일관성을 얻는 대신 쓰기 지연을 지불한다`,
        `모듈로 해싱은 N→N+1에서 대부분의 키가 이동하고(4→5대면 약 80%), 일관 해싱은 약 1/(N+1)만 이동한다`
      ],
      pitfalls: [
        `논문의 (3,2,2)나 64MB 같은 숫자를 현재 제품의 기본값으로 단정한다. 이름이 비슷한 제품도 논문과 구현이 다르다`,
        `Spanner류의 외부 일관성을 평범한 NTP 환경에서 흉내 내며 commit wait 없이 타임스탬프 순서만으로 주장한다`,
        `해시 링에 가상 노드 없이 노드 3~4대로 운영해 부하가 한쪽으로 쏠린다`,
        `Dynamo식 저장소에서 충돌 해결을 "자동"이라고 설명한다. 병합 의미는 애플리케이션이 정해야 한다`
      ]
    },
    {
      title: `로그·메시징·멱등 처리: Kafka, Outbox, Saga, Idempotency-Key`,
      body: `결제, 주문, 알림 연동은 결국 "같은 메시지가 두 번 오거나 한 번도 안 와도 최종 상태가 맞는가"를 묻는 일입니다. 이 레슨은 로그 기반 메시징의 보장이 정확히 어디까지인지, 그 위에서 정합성을 어떻게 만드는지 다룹니다.

### Kafka의 로그 모델과 전달 보장

Kafka(NetDB 2011 논문)는 토픽을 파티션으로 나눈 추가 전용 로그로 보고, 소비자가 오프셋을 들고 직접 가져가는(pull) 구조입니다. **순서는 파티션 안에서만** 보장되므로 같은 주문의 이벤트가 순서대로 처리되어야 하면 주문 ID를 파티션 키로 씁니다. 소비자 그룹은 파티션을 나눠 갖고 멤버가 바뀌면 리밸런스가 일어납니다. 전달 보장은 **오프셋을 언제 커밋하느냐**로 갈립니다. 처리 후 커밋하면 at-least-once(처리 중 죽으면 재전달되어 중복), 커밋 후 처리하면 at-most-once(처리 중 죽으면 유실)입니다. 처리량은 순차 I/O, sendfile 제로카피, 배치에서 나오며 논문 실험은 배치 1건과 50건에서 초당 게시량이 약 5만과 40만 건이었습니다(2011년 수치).

### exactly-once의 범위

KIP-98은 두 기능을 더했습니다. **idempotent producer**는 producer ID와 파티션별 시퀀스 번호로 재시도가 만든 중복 기록을 브로커가 걸러냅니다. 이 보장은 한 producer 세션 안에서만 유효하고, 재시작을 넘어서려면 안정적인 ‹transactional.id› 가 필요합니다. **트랜잭션**은 여러 파티션에 대한 쓰기와 오프셋 커밋을 원자적으로 만들고 소비자는 ‹isolation.level=read_committed› 로 커밋된 것만 읽습니다(소비자 기본값은 read_uncommitted, 2026-11 Kafka 4.4 문서 기준). 하지만 이 보장은 Kafka 안에서 읽고-처리하고-쓰는 범위에 한정됩니다. 외부 DB 갱신, 결제 API 호출, 이메일 발송은 Kafka 트랜잭션 밖이므로 그 부수효과는 소비자가 멱등하게 만들어야 합니다.

### 이중 쓰기 문제와 Outbox

주문을 DB에 저장하고 메시지도 발행해야 할 때 둘을 차례로 하면 한쪽만 성공하는 틈이 생깁니다. DB 커밋 후 발행 전에 죽으면 알림이 누락되고, 발행 후 DB가 실패하면 유령 이벤트가 나갑니다. **Outbox 패턴**은 비즈니스 데이터와 발행할 메시지를 같은 DB 트랜잭션에서 outbox 테이블에 기록하고, 별도 릴레이(또는 CDC)가 읽어 발행합니다. 릴레이가 죽었다 재시작하면 같은 행을 다시 발행하므로 결과는 at-least-once이고 소비자 멱등성과 한 쌍으로 씁니다(이 패턴은 이번 조사에서 별도 출처를 확인하지 못한 일반 지식입니다).

### Saga와 엔티티 단위 설계

여러 서비스에 걸친 분산 트랜잭션(2PC)은 가용성과 결합도 비용이 큽니다. Garcia-Molina·Salem의 Saga(1987)는 긴 작업을 짧은 로컬 트랜잭션의 열과 각 단계의 **보상 트랜잭션**으로 쪼갭니다. 보상은 완전한 롤백이 아니라 의미적 취소입니다(발송한 이메일은 되돌릴 수 없고 환불은 기록으로 남습니다). 중간 상태가 외부에 노출되므로 주문 상태에 PENDING 같은 단계를 명시합니다. Helland의 "Life beyond Distributed Transactions"는 규모가 커지면 엔티티 하나 안의 로컬 트랜잭션과 엔티티 사이의 메시징으로 설계하고, 메시지는 중복·재정렬이 일어난다고 가정해 멱등하게 처리하며, 불확실성은 잠정 예약과 확인/취소로 다루라고 주장합니다.

### Idempotency-Key 서버와 백로그 방어

멱등 API는 클라이언트가 보낸 키를 요청 처리와 같은 트랜잭션으로 저장하고, 같은 키가 오면 저장된 결과를 돌려줍니다. 같은 키에 다른 파라미터가 오면 클라이언트 버그이므로 검증 오류로 거절하고, 같은 키가 동시에 두 번 도착하면 하나만 진행시킵니다. 큐에서는 Builders' Library가 고객별 제한, 전용 큐, shuffle sharding, DLQ(dead-letter queue), 하트비트를 소개합니다. 동시성 한도는 리틀의 법칙(동시 처리 수 = 도착률 × 체류 시간)으로 잡습니다. 초당 100건에 평균 100ms면 약 10개, 지연이 10초로 늘면 약 1,000개가 필요하고, 이것이 백로그가 한 번 쌓이면 복구가 어려운 이유입니다.`,
      code: `import sqlite3

db = sqlite3.connect(":memory:")
db.executescript("""
CREATE TABLE processed(msg_id TEXT PRIMARY KEY);
CREATE TABLE payment(order_id TEXT PRIMARY KEY, amount INTEGER);
""")

def handle(msg_id, order_id, amount):
    try:
        with db:                                    # 한 트랜잭션: 처리 기록 + 상태 변경
            db.execute("INSERT INTO processed VALUES (?)", (msg_id,))
            db.execute("INSERT INTO payment VALUES (?, ?)", (order_id, amount))
        return "applied"
    except sqlite3.IntegrityError:
        return "duplicate-ignored"                  # 재전달된 메시지: 부수효과 없음

for _ in range(3):                                  # 같은 메시지가 3번 재전달된다
    print(handle("m-1001", "o-77", 5000))
print(db.execute("SELECT COUNT(*) FROM payment").fetchone())   # (1,)`,
      codeLang: `python`,
      key: [
        `Kafka의 순서는 파티션 안에서만 보장된다. 오프셋 커밋 시점이 at-least-once와 at-most-once를 가른다`,
        `KIP-98의 exactly-once는 Kafka 내부 범위다. 외부 부수효과(결제·메일)는 소비자 멱등이 책임진다`,
        `Outbox: 상태 변경과 발행할 메시지를 한 DB 트랜잭션에 기록하고 릴레이가 at-least-once로 발행한다`,
        `Saga의 보상은 의미적 취소이고 중간 상태가 외부에 노출된다. Helland는 엔티티 단위 + 멱등 메시징을 권한다`,
        `리틀의 법칙: 동시 처리 수 = 도착률 × 체류 시간. 지연이 늘면 필요한 동시성이 폭증한다`
      ],
      pitfalls: [
        `처리가 끝나기 전에 오프셋이 자동 커밋되도록 두어 장애 시 메시지가 유실된다`,
        `멱등 키 기록과 상태 변경을 서로 다른 트랜잭션에 저장해 그 사이 장애에서 중복 처리나 유실이 생긴다`,
        `Kafka의 exactly-once 설정을 켰으니 외부 결제 API도 한 번만 호출된다고 보고한다`,
        `DLQ를 쌓아 두기만 하고 원인 메타데이터, 알림, 재처리 도구가 없다`
      ]
    },
    {
      title: `통합 케이스 스터디: 쇼핑몰 주문·결제·재고, 장애 주입으로 증명해 납품하기`,
      body: `상황(가상의 사례): 국내 중소 쇼핑몰이 이벤트 때마다 "재고보다 많이 팔림", "이중 결제 문의", "가끔 주문이 사라짐"을 겪습니다. 구조는 앱 서버 4대, 단일 PostgreSQL, Redis 락으로 재고 차감, 외부 PG사 결제 호출, 이메일 발송용 메시지 큐입니다. 의뢰인은 "Kafka를 도입해 MSA로 바꾸고 이중화해서 무중단으로 만들어 달라"고 요청합니다.

### 1~2단계: 요구를 연산별 표로, 장애 모델 열거

기술을 고르기 전에 연산마다 필요한 보장과 손실 허용치를 문서로 만듭니다. 재고 차감은 초과 판매 금지, 결제는 이중 청구 금지, 알림은 중복 허용·유실 최소화. 트래픽도 숫자로 받습니다. 피크가 초당 수백 건이면 단일 PostgreSQL과 적절한 인덱스로 충분할 수 있고 분산 도입이 오히려 장애 원인을 늘립니다. 그다음 증상을 레슨 1~9의 어휘로 분류합니다. (a) PG 호출이 타임아웃인데 실제로는 승인됨(응답 유실) → 재시도가 이중 결제. (b) Redis 락 TTL 30초가 느린 쿼리와 정지로 만료 → fencing 없이 두 요청이 재고를 차감. (c) 소비자가 처리 후 ack 전에 죽어 메일 중복. (d) DB 커밋 후 큐 발행 전에 죽어 알림 유실(이중 쓰기).

### 3단계: 처방

- 재고: Redis 락 대신 ‹UPDATE stock SET qty = qty - :n WHERE id = :id AND qty >= :n› 같은 조건부 갱신으로 DB가 직렬화하게 합니다. 영향 행 수가 0이면 품절입니다.
- 결제: 주문마다 고정된 Idempotency-Key를 PG 호출에 쓰고 결제 상태기계(PENDING → AUTHORIZED / FAILED)를 DB에 기록합니다. 타임아웃이면 같은 키로 조회·재시도합니다.
- 알림: Outbox + 소비자 멱등(메시지 ID 테이블).
- Kafka와 MSA는 현재 문제의 원인이 아니므로 보류하고 근거를 보고서에 적습니다. 가용성은 DB 복제와 자동 failover를 쓰되 비동기 복제의 손실 가능 구간(RPO)을 문서에 명시합니다.

### 4단계: 검증, 증명 자료를 납품한다

"설계가 맞다"는 말은 증거가 아닙니다. 작은 Jepsen식 시험을 만듭니다. 동시 클라이언트 수십 개가 주문을 넣고 요청·응답·타임아웃 이력을 기록하며 장애를 주입합니다. 앱 프로세스 ‹kill -9›, DB 재시작, 앱과 PG 모의 서버 사이의 지연·분할, 메시지 중복 재전달입니다. 끝난 뒤 불변식 검사기가 확인합니다. 재고는 음수가 아니다, 주문당 결제는 최대 1건, 확정 주문 수 + 남은 재고 = 초기 재고, 성공 응답을 받은 주문은 DB에 존재한다. 시드를 고정하면 위반이 재현됩니다. FoundationDB는 이를 극단까지 밀어 네트워크·디스크·시계를 모두 시뮬레이션 안에 넣고 시드로 재현하는 결정론적 시뮬레이션으로 테스트합니다.

핵심 불변식 하나(예: 같은 재고를 두 주문이 확정하지 않는다)는 TLA+로 명세해 TLC 모델 검사기로 작은 모델의 모든 상태를 탐색할 수도 있습니다. 구분을 기억하세요. **테스트**는 실제 코드가 실행한 경로만, **모델 검사**는 설계 모델의 작은 범위를 전수 탐색(코드 검증이 아니며 상태 폭발의 한계), **증명**은 모든 경우를 보이지만 비용이 큽니다. 외주에서는 테스트와, 필요하면 작은 모델 검사가 현실적입니다.

### 5단계: 인계

납품물은 연산별 일관성 표, 불변식 목록, 장애 매트릭스(장애별 기대 동작과 실제 결과), 테스트 하네스와 시드별 결과, 모니터링 항목(소비자 lag, 미발행 outbox 건수, DLQ 크기, 결제 PENDING 체류 시간), 검증하지 않은 가정 목록입니다. 장애 주입 결과가 첨부되면 "정상일 때만 되는 시스템"이 아님을 보여 줄 수 있습니다.`,
      code: `import random

def trial(seed, dedupe=True, orders=300):
    rnd = random.Random(seed)                       # 시드 고정: 실패를 재현할 수 있다
    stock, charged, seen = 100, {}, set()
    for oid in range(orders):
        deliveries = 1 + (rnd.random() < 0.3)       # 30%는 메시지가 두 번 전달된다
        for _ in range(deliveries):
            if rnd.random() < 0.05:                 # 처리 도중 프로세스 kill: 롤백되어 흔적이 없다
                continue
            if dedupe and oid in seen:              # 멱등 소비자
                continue
            if stock > 0:
                stock -= 1
                charged[oid] = charged.get(oid, 0) + 1
            seen.add(oid)
    return stock, charged

def check(seed, dedupe):
    stock, charged = trial(seed, dedupe)
    assert stock >= 0, "재고 음수"
    assert all(c == 1 for c in charged.values()), "이중 결제"
    assert len(charged) + stock == 100, "재고-결제 불일치"

def first_violation(dedupe):
    for s in range(1000):
        try:
            check(s, dedupe)
        except AssertionError as e:
            return s, str(e)
    return None

print("dedupe on :", first_violation(True))         # None: 1000개 시드에서 위반 없음
print("dedupe off:", first_violation(False))        # (시드, '이중 결제'): 그 시드로 재현`,
      codeLang: `python`,
      key: [
        `요구는 연산별 표(일관성·손실 허용·피크 트래픽 숫자)로 먼저 바꾸고, 기술 도입은 그다음에 정한다`,
        `증상을 장애 모델(응답 유실·락 만료·재전달·이중 쓰기)로 분류하면 처방이 나온다`,
        `처방: DB 조건부 갱신, Idempotency-Key + 상태기계, Outbox + 멱등 소비자, 필요한 곳에만 fencing`,
        `검증은 이력 기록 + 장애 주입 + 불변식 검사이며 시드를 고정해 재현한다. 검사기가 위반을 잡는지도 확인한다`,
        `테스트·모델 검사·증명의 용도를 구분하고, 납품물에 장애 매트릭스와 검증하지 않은 가정을 포함한다`
      ],
      pitfalls: [
        `불변식을 정의하지 않고 "장애 테스트 통과"만 보고한다(무엇을 검사했는지 알 수 없다)`,
        `시드와 장애 스케줄을 기록하지 않아 실패를 재현하지 못한다`,
        `테스트 환경이 운영과 달라(fsync 꺼짐, 단일 노드) 결과가 의미 없다`,
        `의뢰인 요청에 맞춰 Kafka·MSA를 비판 없이 도입하고 운영 부담과 비용을 설명하지 않는다`
      ]
    }
  ],
  labs: [
    {
      title: `시뮬레이터 구현: 벡터 시계와 N/R/W 쿼럼 읽기 결과표`,
      scenario: `장바구니 서비스를 Dynamo 스타일 3중 복제 저장소로 운영하려는 의뢰인의 개발자가 "R=1, W=1이면 빠르고 충분하지 않나요?"라고 묻습니다. 말로 반박하지 않고, 직접 만든 작은 시뮬레이터로 설정별 stale read 비율, 파티션 중 쓰기·읽기 성공률, 동시 갱신(sibling) 발생을 숫자와 로그로 보여 주는 것이 과제입니다. 결과표는 PACELC 관점의 5줄 요약과 함께 의뢰인에게 그대로 설명할 수 있는 형태여야 합니다.`,
      steps: [
        `Python 3로 복제본 N개(기본 3)의 딕셔너리 저장소와, 메시지 지연·유실 확률을 가진 가짜 네트워크를 만든다. 난수 시드를 인자로 받는다.`,
        `값에 벡터 시계를 붙이고 두 버전의 관계(앞섬/뒤처짐/동시)를 판정하는 함수를 만든 뒤, 동시 쓰기를 포함한 단위 테스트 5개 이상을 작성한다.`,
        `쓰기는 W개 복제본의 확인을 받으면 성공으로 하고 나머지 복제본에는 비동기로 지연 전파한다. 읽기는 R개 응답 중 인과적으로 가장 새로운 버전을 돌려주고 동시 버전이 있으면 모두 돌려준다(sibling).`,
        `(N,R,W)를 (3,1,1), (3,2,2), (3,3,1), (3,1,3)으로 바꿔 "쓰기 직후 읽기"를 1,000회씩 시드 고정으로 실행하고 stale read 비율과 평균·p99 지연(모의 지연 단위)을 표로 기록한다.`,
        `복제본 1개가 응답하지 않는 경우와 2개가 응답하지 않는 경우를 추가해 각 설정의 쓰기·읽기 성공률을 측정한다.`,
        `서로 다른 두 클라이언트가 파티션 중에 같은 키를 갱신해 sibling이 생기는 장면을 로그로 출력하고, 병합 함수(장바구니는 합집합)로 해소한다.`,
        `결과표 아래에 각 설정을 PA/EL, PC/EC 같은 PACELC 용어로 분류한 5줄 요약을 쓴다.`
      ],
      accept: [
        `파티션이 없는 조건에서 (3,2,2)의 stale read 비율은 시드 10개 모두에서 0%이고 (3,1,1)은 0%보다 크다`,
        `벡터 시계 단위 테스트 5개 이상이 통과하고 동시 쓰기 1건 이상이 sibling으로 탐지된다`,
        `복제본 2개가 응답하지 않는 조건에서 (3,2,2)의 쓰기 성공률은 0%, (3,1,1)은 100%임을 표로 보이고 그 의미를 설명한다`,
        `같은 시드로 재실행하면 결과표의 모든 수치가 동일하다`
      ],
      stretch: `hinted handoff(sloppy quorum)를 추가해 (3,2,2)에서 파티션 중 쓰기 성공률이 어떻게 바뀌는지, 복구 후 sibling이 얼마나 늘어나는지 측정한다. 이어서 Merkle tree 기반 anti-entropy로 두 복제본의 차이를 찾는 함수를 구현한다.`
    },
    {
      title: `etcd 3노드 장애 실험과 Raft 안전성 규칙 단위 테스트`,
      scenario: `의뢰인의 서비스가 설정 저장과 리더 선출에 etcd 3노드를 쓰려 하고, 운영팀이 "노드 하나가 죽으면 얼마나 멈추나요? 두 개가 죽으면요?"라고 묻습니다. 문서의 일반론이 아니라 내 환경에서 측정한 숫자로 답하는 것이 과제입니다. 동시에 Raft 논문의 안전성 규칙을 레슨 6의 Node 클래스를 확장한 단위 테스트로 옮겨, 규칙이 왜 필요한지 코드로 확인합니다.`,
      steps: [
        `로컬에서 etcd 3노드 클러스터를 Docker 또는 공식 바이너리로 띄우고 etcdctl로 멤버와 현재 리더를 확인한다.`,
        `클라이언트 스크립트로 100ms마다 키에 쓰기를 시도하고 시각, 성공 여부, 지연을 CSV로 기록한다(요청 타임아웃 1초).`,
        `리더 프로세스를 kill -9(또는 컨테이너 중지)로 죽이고 쓰기 실패 구간의 길이(첫 실패부터 첫 성공까지)를 측정한다. 10회 반복해 최소·중앙·최대를 기록한다.`,
        `팔로워 1대를 죽인 경우와, 리더와 팔로워 2대를 함께 죽여 과반을 잃은 경우의 쓰기·읽기 동작을 관찰하고, 과반을 복구한 뒤 재개되는 시점을 기록한다.`,
        `etcd의 선거 타임아웃과 heartbeat 간격 설정을 두 가지 조합으로 바꿔 3번을 반복하고 중단 시간 변화를 표로 정리한다.`,
        `레슨 6의 Node 클래스를 확장해 단위 테스트 6개 이상을 작성한다(예: 더 짧은 로그의 후보는 표를 못 받는다, 더 높은 term을 보면 follower로 돌아간다, 충돌하는 엔트리는 덮어쓰고 일치하는 엔트리는 유지한다, 이전 term 엔트리는 복제 수만으로 커밋하지 않는다).`,
        `결과를 "측정 환경 / 방법 / 표 / 해석 / 한계" 1쪽 보고서로 정리한다.`
      ],
      accept: [
        `리더 kill 10회 각각의 쓰기 중단 시간이 CSV로 남아 있고 보고서에 최소·중앙·최대가 있다`,
        `과반을 잃은 동안 쓰기 성공이 0건이었고, 과반 복구 후 재개됨을 로그로 보인다`,
        `설정 2종의 중단 시간 비교표가 있고 해석이 실측값과 모순되지 않는다`,
        `단위 테스트가 6개 이상 통과하고 테스트 이름이 Raft 규칙을 설명한다`
      ],
      stretch: `컨테이너 네트워크를 분리해 리더를 소수 쪽에 고립시킨 뒤 옛 리더가 쓰기를 확정하지 못하고 다수 쪽에서 새 리더가 선출되는 것을 확인한다. 이어서 MIT 6.5840 Raft 랩을 자습한다(정답 코드는 공개하지 않는다).`
    },
    {
      title: `클라이언트 납품형 미니 프로젝트: 주문·결제·재고 saga와 장애 주입 검증 보고서`,
      scenario: `레슨 10의 쇼핑몰 의뢰인이 "이벤트 때 재고 초과 판매와 이중 결제가 없다는 걸 보여 달라"고 요청했습니다. 당신의 납품물은 코드 한 벌이 아니라 요구 표, 설계 결정과 근거, 재현 가능한 장애 주입 하네스, 불변식 검사 결과, 장애 매트릭스, 복구 시간표, 검증하지 않은 가정 목록이 들어간 보고서입니다. 인수 담당자가 README만 보고 시드를 지정해 같은 결과를 재현할 수 있어야 합니다.`,
      steps: [
        `요구 표를 1쪽으로 작성한다. 연산별(재고 차감, 결제, 알림) 보장과 손실 허용치, 피크 트래픽 가정을 적고, 불변식 4개 이상(재고 ≥ 0, 주문당 결제 ≤ 1, 성공 응답을 받은 주문은 DB에 존재, 확정 주문 수 + 남은 재고 = 초기 재고)을 문장으로 확정한다.`,
        `PostgreSQL(Docker) 또는 SQLite로 주문·재고·결제·outbox·처리 완료 메시지 기록 테이블을 설계하고, 각 테이블의 기본키와 유니크 제약이 어떤 중복을 막는지 한 줄씩 적는다. 재고는 조건부 UPDATE로 차감한다.`,
        `가짜 PG 서버(응답 지연·응답 유실·실패를 확률로 주입하는 작은 HTTP 서버)를 만들고, 주문 ID 기반 Idempotency-Key로 결제를 호출하며 PENDING → AUTHORIZED / FAILED 상태기계를 구현한다. 타임아웃이면 같은 키로 조회·재시도한다.`,
        `주문 확정 시 알림 이벤트를 같은 트랜잭션으로 outbox에 기록하고, 릴레이가 Redis Streams 또는 단순 큐로 발행하며, 소비자는 메시지 ID 테이블로 멱등 처리한다.`,
        `동시 클라이언트 20개 정도가 주문 1,000건을 넣고 모든 요청·응답·타임아웃을 JSON Lines 이력으로 기록하는 하네스를 만든다.`,
        `장애를 주입한다. 앱 프로세스 kill -9 3회, 메시지 중복 재전달 10%, PG 응답 유실 10%, DB 재시작 1회. 시드를 모두 기록한다.`,
        `불변식 검사기를 작성해 이력과 DB 최종 상태를 대조한다. 멱등 처리를 일부러 끈 변형 버전에서 위반이 검출되는지도 확인해 검사기의 감도를 입증한다.`,
        `보고서를 작성한다. 요구 표, 설계 결정과 근거(Kafka·MSA를 도입하지 않은 이유 포함), 장애 매트릭스, 시드별 결과, 복구 시간표, 한계와 검증하지 않은 가정, 운영 모니터링 항목을 넣는다.`
      ],
      accept: [
        `세 종류 장애를 모두 포함한 5개 이상의 시드 실행에서 불변식 위반이 0건이다`,
        `멱등 처리를 끈 변형 버전에서 최소 1개 시드가 위반(이중 결제 또는 재고 불일치)을 검출한다`,
        `재고 음수 0건, 주문당 결제 최대 1건, 성공 응답을 받은 주문이 전부 DB에 존재한다`,
        `보고서에 복구 시간표와 한계 목록이 있고, README의 명령만으로 시드를 지정해 재실행·재현할 수 있다`
      ],
      stretch: `Redis 락 기반 재고 차감 버전을 따로 만들어 락 만료와 일시정지를 주입해 이중 차감을 재현하고, fencing 또는 조건부 갱신 버전과 비교한다. 이어서 재고 예약 프로토콜의 불변식을 TLA+로 명세하고 TLC로 검사한다.`
    }
  ],
  quiz: [
    {
      q: `의뢰인의 쇼핑몰 서버가 외부 결제 API를 호출했는데 3초 타임아웃이 났습니다. 개발자는 "실패했으니 바로 다시 호출하면 되죠"라고 합니다. 결제 API는 Idempotency-Key 헤더를 지원합니다. 가장 적절한 결정은 무엇입니까?`,
      choices: [
        `타임아웃은 요청이 서버에 도착하지 못했다는 뜻이므로 새 요청 ID로 즉시 재시도한다`,
        `재시도는 이중 결제 위험이 있으므로 어떤 경우에도 재시도하지 않고 사용자에게 실패로 안내한다`,
        `주문 단위로 고정한 Idempotency-Key를 그대로 써서 재시도하거나 결과를 조회하고, 결제 상태를 PENDING으로 남겨 최종 확인한다`,
        `타임아웃을 30초로 늘리면 응답 유실 가능성이 사라지므로 재시도 로직이 필요 없다`
      ],
      answer: 2,
      why: `타임아웃은 "도착 못함 / 처리 후 응답 유실 / 처리 중"을 구분하지 못합니다. 같은 키로 재시도하면 서버가 중복을 걸러 주므로 안전하고, 상태를 PENDING으로 두면 확인 전까지 거짓 성공·실패를 만들지 않습니다. 새 요청 ID로 재시도(0)는 응답 유실 때 이중 결제가 되고, 재시도 금지(1)는 이미 승인된 결제를 실패로 안내해 불일치를 만들며, 타임아웃 연장(3)은 유실 가능성을 없애지 못합니다.`
    },
    {
      q: `논리 시계를 구현했는데 인과 순서가 가끔 뒤집힙니다. 무엇이 문제입니까?

def send(self):
    self.t += 1
    return self.t

def recv(self, msg_ts):
    self.t += 1
    return self.t`,
      choices: [
        `recv가 메시지의 타임스탬프와 비교하지 않는다. self.t = max(self.t, msg_ts) + 1 이어야 한다`,
        `send에서 카운터를 증가시키면 안 되며 recv에서만 증가시켜야 한다`,
        `카운터는 정수가 아니라 실제 시각(time.time)을 써야 한다`,
        `recv가 값을 반환하면 안 된다. 반환값 때문에 순서가 뒤집힌다`
      ],
      answer: 0,
      why: `수신 측이 보낸 쪽의 시각을 따라잡지 않으면 "송신 → 수신"에서 수신의 타임스탬프가 송신보다 작아질 수 있어 a→b이면 C(a) < C(b)라는 성질이 깨집니다. 물리 시각(2)은 시계 오차로 더 쉽게 어긋나고, send의 증가(1)는 정상이며 반환값(3)은 무관합니다.`
    },
    {
      q: `운영 중인 5노드 합의 클러스터(Raft 계열)에서 현재 리더를 포함한 2대가 동시에 장애로 내려갔습니다. 남은 3대는 서로 통신이 됩니다. 이 클러스터는 어떻게 동작합니까?`,
      choices: [
        `리더가 죽었으므로 관리자가 수동으로 새 리더를 지정하기 전까지 읽기·쓰기가 모두 불가능하다`,
        `5대 중 2대가 죽어 살아 있는 노드 수가 짝수가 아니므로 재선출이 불가능하다`,
        `남은 3대 중 가장 최신 로그를 가진 노드가 자동으로 리더가 되지만 과반(4대)이 필요하므로 쓰기는 불가능하다`,
        `남은 3대는 과반(3/5)이므로 선거 타임아웃 뒤 새 리더를 뽑고 쓰기를 재개한다. 쓰기 중단은 재선출에 걸린 시간만큼이다`
      ],
      answer: 3,
      why: `5대의 과반은 3대이므로 3대가 살아 서로 통신하면 선거 타임아웃 뒤 자동으로 리더가 선출되고 쓰기가 재개됩니다. 수동 지정 필요(0)는 Raft의 자동 재선출과 맞지 않고, 과반을 4대로 계산한 것(2)이 가장 흔한 오답입니다. 짝수·홀수 문제(1)는 과반 계산과 무관합니다.`
    },
    {
      q: `다중 AZ로 운영하는 예약 서비스의 설계 리뷰입니다. 팀장이 "우리 시스템은 AP로 간다"고 선언했습니다. 이 서비스에는 좌석 확정(중복 판매 금지), 좌석 조회, 마이페이지 목록이 있습니다. 가장 좋은 대응은 무엇입니까?`,
      choices: [
        `전체를 AP로 두고 좌석 확정 충돌은 나중에 고객센터에서 수동으로 정리한다`,
        `연산별로 선택한다. 좌석 확정은 파티션 중 거부하는 일관성 우선으로, 조회와 목록은 오래된 값을 허용하는 가용성 우선으로 정하고 평시 지연 예산도 함께 적는다`,
        `CA를 선택한다. 파티션은 단일 AZ 안에서는 일어나지 않으므로 포기할 필요가 없다`,
        `PACELC에 따라 전체를 PC/EC로 통일하면 설계 논의가 단순해진다`
      ],
      answer: 1,
      why: `Brewer가 2012년에 정정했듯 파티션 중의 선택은 시스템 전체가 아니라 연산과 데이터마다 다릅니다. 중복 판매 금지는 일관성이, 조회·목록은 가용성이 어울립니다. 전체 AP(0)는 중복 판매를 수동 정리에 떠넘기고, CA(2)는 AZ 간 파티션과 지연된 노드가 실제로 일어난다는 점을 무시하며, 전체 PC/EC 통일(3)은 조회에도 불필요한 지연과 불가용을 강요합니다.`
    },
    {
      q: `다음은 단일 키 x에 대한 클라이언트 이력입니다(시각 단위 ms, 초기값 0).

A: write(x,1)  호출 0   응답 10
B: write(x,2)  호출 12  응답 20
C: read(x)     호출 25  응답 30  결과 1

이 이력에 대한 설명으로 옳은 것은 무엇입니까?`,
      choices: [
        `선형화 가능하다. C가 B와 동시에 실행된 것으로 볼 수 있기 때문이다`,
        `선형화 가능하지 않다. B가 C의 호출보다 먼저 끝났으므로 C는 2를 읽어야 한다. 다만 최종 일관성 시스템에서는 허용될 수 있는 읽기다`,
        `선형화 가능하지만 직렬화 가능하지는 않다`,
        `선형화 가능하지 않으며, 이는 최종 일관성 시스템에서도 허용되지 않는 읽기다`
      ],
      answer: 1,
      why: `B의 응답(20)이 C의 호출(25)보다 앞서므로 실시간 순서상 C는 B 뒤에 놓여야 하고 따라서 2를 읽어야 합니다. 1을 읽었으니 선형성 위반(stale read)입니다. 최종 일관성은 갱신이 멈춘 뒤의 수렴만 약속하므로 이런 옛값 읽기를 허용합니다. 동시 실행으로 본 해석(0)은 두 연산 구간이 겹치지 않아 불가능합니다.`
    },
    {
      q: `Dynamo 스타일 저장소를 (N,R,W)=(3,1,1)로 운영 중인데 "방금 저장한 프로필이 새로 고침하면 옛 값으로 보인다"는 문의가 옵니다. 쓰기 지연은 가능하면 낮게 유지해야 합니다. 가장 적절한 조치는 무엇입니까?`,
      choices: [
        `N을 5로 늘린다. 복제본이 많을수록 최신 값을 볼 확률이 올라간다`,
        `R은 1로 두고 W를 3으로 올려 모든 복제본에 쓴다. 읽기 지연은 그대로이고 쓰기 가용성도 변함없다`,
        `벡터 시계를 제거해 충돌 해결 시간을 줄인다`,
        `R+W>N이 되도록 (3,2,2)로 바꾸거나, 해당 화면에만 read-your-writes 세션 보장(같은 복제본 고정, 쓴 버전 이후만 읽기)을 적용한다. 쓰기 지연 증가는 감수 대상이다`
      ],
      answer: 3,
      why: `R+W=2는 N=3 이하라 읽기 집합이 최신 쓰기를 놓칠 수 있습니다. 집합이 겹치도록 (3,2,2)로 바꾸거나, 문제가 되는 화면에만 세션 보장을 적용하는 것이 문제의 원인을 직접 다룹니다. N을 늘리는 것(0)은 R, W가 같으면 오히려 겹침을 줄이고, W=3(1)은 복제본 한 대만 느려도 쓰기가 막혀 가용성과 쓰기 지연이 나빠지므로 "변함없다"는 설명이 틀렸습니다.`
    },
    {
      q: `주문 1001의 재고 차감이 한 번만 일어나도록 워커들이 Redis 락으로 보호하는 코드입니다. 작업은 보통 2초 걸리지만 GC나 VM 정지로 가끔 40초 멈춥니다. 간헐적으로 같은 주문의 재고가 두 번 차감됩니다. 원인과 올바른 보완은 무엇입니까?

ok = redis.set("lock:order:1001", worker_id, nx=True, px=30000)
if ok:
    db.execute("UPDATE stock SET qty = qty - 1 WHERE id = 42")
    redis.delete("lock:order:1001")`,
      choices: [
        `30초 뒤 락이 만료되어 다른 워커가 같은 주문을 처리했는데, 멈췄던 워커가 깨어나 만료를 모른 채 쓰기를 이어 간다. 정확성이 중요하므로 DB 쪽에서 처리 이력의 유니크 키나 fencing token(버전) 조건부 갱신으로 오래된 소유자의 쓰기를 거부해야 한다`,
        `TTL이 짧아서 생긴 문제이므로 TTL을 1시간으로 늘리면 해결된다`,
        `delete 대신 expire를 호출하면 해결된다`,
        `Redis가 단일 인스턴스라서 생긴 문제이므로 Redis 노드를 5대로 늘려 Redlock을 쓰면 정확성이 보장된다`
      ],
      answer: 0,
      why: `리스는 프로세스 정지를 감지하지 못하므로 소유자가 만료를 모른 채 쓸 수 있고, 이것을 막는 것은 보호받는 저장소의 검사(fencing·조건부 갱신·처리 이력 유니크 키)뿐입니다. 무조건 delete하는 해제 코드도 이미 남이 가져간 락을 지울 수 있다는 점이 부차적 결함입니다. TTL 연장(1)은 정지가 TTL보다 길어질 가능성을 줄일 뿐 없애지 못하고 장애 시 락이 오래 묶입니다. Redlock(3)은 타이밍 가정에 기대며 fencing token을 만들지 못해 정확성용으로는 부족하다는 비판이 있습니다.`
    },
    {
      q: `주문 이벤트를 Kafka에서 읽어 (1) 결제 PG를 호출하고 (2) 이메일을 발송하는 소비자를 만들었습니다. 프로듀서에 idempotent 옵션과 트랜잭션을 켰으니 "exactly-once라 중복 처리가 없다"고 보고하려 합니다. 가장 정확한 평가는 무엇입니까?`,
      choices: [
        `맞다. Kafka의 exactly-once 설정은 소비자의 모든 부수효과를 한 번만 실행하도록 보장한다`,
        `틀렸다. Kafka는 어떤 설정으로도 중복을 막을 수 없으므로 exactly-once는 불가능하다`,
        `보장 범위는 Kafka 내부의 읽기-처리-쓰기까지다. PG 호출과 이메일은 외부 부수효과이므로 소비자가 멱등 키와 처리 이력 테이블로 중복을 막아야 한다`,
        `오프셋 커밋을 처리 전에 하면 외부 부수효과도 정확히 한 번 실행된다`
      ],
      answer: 2,
      why: `KIP-98의 idempotent producer와 트랜잭션은 Kafka 안에서 중복 기록과 원자적 쓰기를 다루지만, 소비자가 호출하는 외부 시스템은 그 트랜잭션에 참여하지 않습니다. 모든 부수효과를 보장한다는 주장(0)이 가장 흔한 오해입니다. 완전 불가능(1)도 틀렸고, 커밋을 처리 전에 하면(3) 처리 중 죽을 때 유실되는 at-most-once가 됩니다.`
    },
    {
      q: `다음 합의 클러스터(Raft 계열, 쓰기에 과반 필요)를 설계 리뷰합니다.

node-1  AZ-a
node-2  AZ-a
node-3  AZ-b

요구사항: "AZ 하나가 통째로 장애여도 쓰기가 계속되어야 한다". 이 구성은 어떻습니까?`,
      choices: [
        `충족한다. 노드가 3대라서 어떤 AZ 장애에도 과반이 남는다`,
        `충족한다. AZ-b 노드가 하나 있어 장애 시 자동으로 리더가 된다`,
        `충족하지 않지만 노드를 5대로 늘려 AZ-a와 AZ-b에 3대와 2대로 두면 해결된다`,
        `충족하지 않는다. AZ-a가 죽으면 3대 중 1대만 남아 과반을 잃는다. 세 AZ에 1대씩 두는 구성이 필요하다`
      ],
      answer: 3,
      why: `AZ-a에 2대가 있어 그 AZ가 죽으면 남는 노드는 1대(과반 2대 미만)라 쓰기가 멈춥니다. 노드 수가 아니라 장애 도메인별 분포가 쿼럼을 결정합니다. 5대를 3+2로 두는 안(2)도 3대가 있는 AZ가 죽으면 2대만 남아 같은 문제가 생깁니다. 과반 없이 리더가 되는 일은 없습니다(1).`
    },
    {
      q: `캐시 서버 4대를 hash(key) % 4 로 샤딩하고 있습니다. 트래픽 증가로 1대를 추가하려는데 팀원이 "증설 직후 DB 부하가 폭증할 것 같다"고 걱정합니다. 이 걱정과 대응으로 옳은 것은 무엇입니까?`,
      choices: [
        `걱정은 근거 없다. 5대로 늘려도 키의 약 절반만 이동한다`,
        `걱정은 타당하다. 4에서 5로 바뀌면 키의 약 80%가 다른 서버에 매핑되어 캐시 미스가 폭증한다. 가상 노드를 둔 일관 해싱이면 이동하는 키가 약 1/5로 줄어든다`,
        `걱정은 타당하다. 일관 해싱을 써도 증설 시 이동하는 키 비율은 모듈로 방식과 같다`,
        `서버를 2배인 8대로 늘리면 이동하는 키가 0%가 되므로 8대로 증설한다`
      ],
      answer: 1,
      why: `k mod 4 와 k mod 5 가 같은 키는 20개 주기 중 4개뿐이라 약 80%가 이동합니다. 일관 해싱은 새 노드가 가져가는 구간만큼, 즉 약 1/(N+1)(여기서는 1/5)의 키만 옮깁니다. 4에서 8로 늘려도 k mod 4 와 k mod 8 이 같은 키는 절반뿐이라 약 50%가 이동하므로 0%(3)가 아닙니다.`
    },
    {
      q: `Spanner 논문의 commit wait가 하는 일을 가장 정확히 설명한 것은 무엇입니까?`,
      choices: [
        `커밋 타임스탬프 s를 정한 뒤 TrueTime 불확실성 때문에 s가 확실히 과거가 될 때까지 기다린 후 커밋을 공개해, 먼저 끝난 트랜잭션이 나중에 시작한 트랜잭션보다 작은 타임스탬프를 갖게 한다`,
        `모든 Paxos 복제본이 디스크에 쓸 때까지 기다리는 내구성 보장 절차이며 시계와는 무관하다`,
        `GPS와 원자시계가 오차 없이 일치하도록 서버 시계를 동기화하는 절차다`,
        `읽기 전용 트랜잭션이 쓰기 트랜잭션의 락이 풀릴 때까지 기다리는 절차다`
      ],
      answer: 0,
      why: `TrueTime은 시계의 정확한 값이 아니라 [earliest, latest] 불확실성 구간을 돌려주고, commit wait는 그 구간만큼 기다려 타임스탬프 순서가 실제 시간 순서와 맞도록 합니다. 논문은 이 대기가 약 5ms였다고 보고합니다. 내구성 대기(1)는 Paxos 복제의 몫이고, 시계를 오차 없이 맞추는 것(2)은 불가능하기 때문에 불확실성을 드러내는 방식을 택한 것입니다.`
    },
    {
      q: `고객사가 새 분산 DB 도입을 검토하며 "벤더 문서에 Serializable 지원이라고 적혀 있으니 안전하죠?"라고 묻습니다. 근거 있게 답하는 가장 좋은 방법은 무엇입니까?`,
      choices: [
        `제품 문서와 마케팅 자료가 같으므로 벤더 주장을 그대로 신뢰해도 된다고 답한다`,
        `CAP 정리에 따라 분산 DB는 Serializable을 제공할 수 없다고 답한다`,
        `해당 제품·버전의 Jepsen 같은 독립 검증 보고서가 있는지 찾아 주장과 관찰을 비교하고, 없다면 자사 워크로드로 장애 주입과 이력 검사를 하는 시험을 견적에 포함한다. 결과는 버전과 설정에 한정됨을 명시한다`,
        `최신 버전을 쓰면 과거 보고서의 문제는 모두 고쳐졌으므로 별도 검증이 필요 없다고 답한다`
      ],
      answer: 2,
      why: `Jepsen은 PostgreSQL 12.3의 serializable 이상 현상, RDS PostgreSQL 17.4 Multi-AZ의 Long Fork, MariaDB Galera 12.1.2의 커밋 손실처럼 문서와 실제 동작의 간극을 반복해서 보였으므로 주장과 관찰을 따로 확인해야 합니다. CAP이 분산 DB의 직렬성을 금지한다는 말(1)은 틀렸고(파티션 중 가용성을 포기하면 가능합니다), 최신 버전이면 안전하다는 가정(3)은 검증 없이 믿는 것입니다.`
    }
  ],
  refs: [
    {
      title: `Time, Clocks, and the Ordering of Events in a Distributed System (Lamport, CACM 1978)`,
      url: `https://lamport.azurewebsites.net/pubs/time-clocks.pdf`,
      kind: `paper`,
      why: `happened-before와 논리 시계, 전체 순서와 상태기계 복제의 출발점. 레슨 2의 정의 절을 따라 시공간 다이어그램을 그리며 읽는다(OCR 텍스트라 도형 일부가 깨질 수 있다).`
    },
    {
      title: `Impossibility of Distributed Consensus with One Faulty Process (FLP, JACM 1985)`,
      url: `https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf`,
      kind: `paper`,
      why: `비동기 모델에서 장애 1개만으로 합의가 불가능함을 보인 증명. 증명 전체보다 모델 가정과 결론의 정확한 문장을 읽는 것이 목표다.`
    },
    {
      title: `Paxos Made Simple (Lamport, 2001)`,
      url: `https://lamport.azurewebsites.net/pubs/paxos-simple.pdf`,
      kind: `paper`,
      why: `안전성 조건에서 acceptor 규칙을 단계적으로 유도하는 짧은 논문. 알고리즘 박스보다 유도 과정을 표로 정리하며 읽는다.`
    },
    {
      title: `In Search of an Understandable Consensus Algorithm, Extended Version (Raft, USENIX ATC 2014)`,
      url: `https://raft.github.io/raft.pdf`,
      kind: `paper`,
      why: `리더 선출·로그 복제·안전성·구성 변경을 다룬 합의 알고리즘. Figure 2 요약표와 Figure 8(이전 term 커밋 규칙)을 반드시 직접 따라가 본다.`
    },
    {
      title: `Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)`,
      url: `https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf`,
      kind: `paper`,
      why: `일관 해싱, 벡터 시계, sloppy quorum, hinted handoff, Merkle tree를 한 시스템에 조합한 사례. 문제마다 기법을 하나씩 붙이는 논문 구조를 표로 옮겨 본다.`
    },
    {
      title: `Spanner: Google's Globally-Distributed Database (OSDI 2012)`,
      url: `https://static.googleusercontent.com/media/research.google.com/en//archive/spanner-osdi2012.pdf`,
      kind: `paper`,
      why: `TrueTime 불확실성 구간과 commit wait로 외부 일관성을 얻는 방법. 시계 오차를 감추지 않고 API로 드러낸 설계 철학이 핵심이다.`
    },
    {
      title: `CAP Twelve Years Later: How the "Rules" Have Changed (Brewer, 2012)`,
      url: `https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/`,
      kind: `paper`,
      why: `Brewer 본인이 "3개 중 2개" 틀을 정정한 글. 파티션 중 선택이 연산별로 다르고 복구와 보상이 핵심이라는 논지를 설계 리뷰에 그대로 쓴다.`
    },
    {
      title: `Abadi, Consistency Tradeoffs in Modern Distributed Database System Design: CAP is Only Part of the Story (PACELC, IEEE Computer 2012)`,
      url: `https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf`,
      kind: `paper`,
      why: `파티션 중 A 대 C뿐 아니라 평시 지연 대 일관성도 따져야 한다는 PACELC의 학술판. 제품 분류가 기본 설정 기준임을 함께 확인한다.`
    },
    {
      title: `Jepsen: Consistency Models (일관성 모델 지도)`,
      url: `https://jepsen.io/consistency/models`,
      kind: `doc`,
      why: `선형성·직렬성·순차·인과 등의 포함 관계와 파티션 중 가용성 분류를 한 장으로 보여 주는 지도. 레슨 4의 용어를 이 지도에 대응시킨다.`
    },
    {
      title: `Jepsen: Analyses (분석 보고서 목록)`,
      url: `https://jepsen.io/analyses`,
      kind: `doc`,
      why: `실제 시스템의 장애 시험 보고서 모음(2026-11 접속 기준 34건, 최신은 2026-10-31). 보고서 한 건을 골라 주장·관찰·원인 표로 정리하는 연습 재료다. 결과는 해당 버전 기준이다.`
    },
    {
      title: `How to do distributed locking (Kleppmann, 2016)`,
      url: `https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html`,
      kind: `article`,
      why: `효율용 락과 정확성용 락의 구분, 프로세스 정지 때의 리스 실패, fencing token을 설명한다. Redlock 비판에 대한 반박 글도 직접 찾아 함께 읽는다.`
    },
    {
      title: `Google SRE Book, ch.23 Managing Critical State: Distributed Consensus for Reliability`,
      url: `https://sre.google/sre-book/managing-critical-state/`,
      kind: `book`,
      why: `합의를 운영 관점에서 다룬 장. 복제 수 3 또는 5, 장애 도메인 배치, split-brain 사례, 합의 시스템 모니터링 항목을 정리할 때 근거로 쓴다.`
    },
    {
      title: `MIT 6.5840 Distributed Systems, Schedule (Spring 2026)`,
      url: `https://pdos.csail.mit.edu/6.5840/schedule.html`,
      kind: `course`,
      why: `MapReduce, GFS, Raft, ZooKeeper, Spanner 등의 읽기 목록과 Raft 랩이 있는 대학원 과목 일정. 이 모듈의 논문 읽기 순서와 구현 실습의 기준으로 쓴다.`
    },
    {
      title: `Life beyond Distributed Transactions: an Apostate's Opinion (Helland, CIDR 2007)`,
      url: `https://www.ics.uci.edu/~cs223/papers/cidr07p15.pdf`,
      kind: `paper`,
      why: `규모가 커지면 분산 트랜잭션 대신 엔티티 단위 설계와 멱등 메시징으로 가야 한다는 입장문. Outbox와 Saga 설계의 사고방식을 잡아 준다.`
    }
  ],
  gigs: [
    `의뢰인은 문제 대신 해법 이름(Kafka 도입, MSA 전환, 이중화, 무중단)으로 말한다. 견적 전에 (a) 연산별 일관성 요구와 손실 허용치(RPO·RTO), (b) 피크 트래픽 숫자, (c) 지금 겪는 장애 증상과 로그, (d) 운영 인력과 예산을 확인한다. 단일 DB와 복제로 충분한 경우가 많고, 분산 도입은 운영 비용과 장애 원인을 늘린다는 점을 숫자로 설명해 범위를 정한다.`,
    `"exactly-once", "무중단", "데이터 유실 0" 같은 문구를 계약서·제안서에 그대로 쓰지 않는다. 모델과 조건을 함께 적는다(예: 단일 AZ 장애 시 RTO 몇 분 이내, 비동기 복제 구간 RPO 몇 초, 리전 장애 제외). 보증 문구에는 그것을 확인하는 장애 주입 시험을 짝지어 둔다.`,
    `납품물은 코드만이 아니다. 연산별 일관성 표, 불변식 목록, 장애 매트릭스(장애별 기대 동작과 실제 결과), 시드와 실행 명령이 있는 장애 주입 하네스, 시험 결과 보고서, 모니터링 항목(소비자 lag, 미발행 outbox 건수, DLQ 크기, 결제 PENDING 체류 시간), 검증하지 않은 가정 목록을 포함한다. 이 문서가 인수 기준이 되도록 계약 단계에서 합의한다.`,
    `전형적 함정 체크리스트로 기존 시스템을 진단한다. 정확성용 Redis 락(fencing 없음), 이중 쓰기(DB 커밋과 큐 발행 분리), 멱등성 없는 재시도, 2노드 heartbeat 자동 failover, 합의 클러스터의 AZ 배치, 읽기 복제본의 stale read, 물리 타임스탬프 기반 last-write-wins, 벤더 주장 무검증. 이 진단을 별도 상품(코드·인프라 리뷰)으로 먼저 판매하면 범위가 명확해진다.`,
    `견적 힌트(내 추정이며 시장 단가는 검증하지 않음, 2026-11 기준): 설계·코드 진단은 2~4 M/D 정액, 멱등·outbox 적용은 서비스당 3~8 M/D, 장애 주입 하네스와 보고서는 5~10 M/D로 별도 항목으로 분리한다. 시험에서 발견되는 버그의 수정은 결과에 따라 범위가 변하므로 별도 범위나 별도 견적으로 계약한다.`,
    `합의 알고리즘, 분산 DB 엔진, 자체 락 서비스를 직접 구현해 달라는 의뢰는 위험을 고지하고 검증된 etcd·ZooKeeper·PostgreSQL 등의 사용을 권한다. 꼭 필요하다면 모델(TLA+ 등)과 장애 시험을 범위에 넣어 기간을 크게 잡는다. MIT 6.5840 같은 과목의 랩을 자습한 결과는 포트폴리오로 쓸 수 있지만 정답 코드는 공개하지 않는다.`
  ]
};
