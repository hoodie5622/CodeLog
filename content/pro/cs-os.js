(window.PRO_MODULES = window.PRO_MODULES || {})["cs-os"] = {
  id: "cs-os",
  summary: `프로세스·가상 메모리·파일 시스템 원리를 바탕으로 리눅스 서버를 systemd와 관측 도구로 운영하고, 컨테이너(namespace·cgroup)의 OOM·CPU 제한 장애를 진단해 인계 가능한 보고서로 정리할 수 있다.`,
  hours: 110,
  goals: [
    `사용자/커널 모드 전환, 시스템콜, fork·exec·wait, 시그널의 동작을 설명하고 strace와 /proc으로 실행 중인 프로세스를 관찰할 수 있다`,
    `실행 대기열·로드 애버리지·컨텍스트 스위치·락 경합 지표로 CPU 포화, 락 대기, I/O 대기를 구분해 진단할 수 있다`,
    `페이징·페이지 폴트·COW·오버커밋 원리로 RSS/VSZ/PSS와 page cache를 해석하고 전역 OOM과 cgroup OOM의 원인을 추적할 수 있다`,
    `inode·page cache·fsync·저널링 모델로 크래시에도 안전한 파일 쓰기를 구현하고 디스크 풀(용량·inode·삭제된 열린 파일) 장애를 처리할 수 있다`,
    `UID·모드 비트·capability로 최소 권한 서비스 계정을 설계하고 systemd 유닛(Type, Restart, 의존성, 샌드박스, 자원 한도)을 작성·검증할 수 있다`,
    `USE 방법론과 vmstat·iostat·pidstat·ss·PSI로 첫 10분 진단을 수행하고 증거 중심 보고서로 정리할 수 있다`,
    `namespace·cgroup v2·overlayfs·capability·seccomp가 컨테이너를 구성하는 방식을 설명하고 unshare와 cgroup 파일로 직접 재현할 수 있다`,
    `컨테이너의 OOMKilled, CPU throttling, PID 1 시그널 문제를 재현·진단·수정하고 인수 기준과 런북으로 인계할 수 있다`
  ],
  lessons: [
    {
      title: `커널, 시스템콜, 프로세스: 운영체제의 멘탈 모델`,
      body: `운영체제는 한 문장으로 "여러 프로그램이 하드웨어를 안전하게 나눠 쓰도록 만드는 특권 소프트웨어"입니다. 이 정의에서 서버 실무가 기대는 약속 세 가지가 나옵니다. **가상화**는 각 프로세스가 CPU와 메모리를 혼자 쓰는 것처럼 보이게 하고, **동시성**은 여러 일이 얽혀도 결과가 망가지지 않게 하며, **영속성**은 전원이 꺼져도 데이터를 남깁니다. OSTEP이 책을 이 세 부분으로 나눈 이유이고, 이 모듈의 레슨 2~4도 같은 순서로 갑니다. 격리와 보호는 세 약속이 서로를 침범하지 않게 하는 바닥이며 레슨 5~7의 주제입니다.

### 두 개의 세계: 사용자 모드와 커널 모드

CPU에는 최소 두 가지 특권 수준이 있습니다. 일반 프로그램이 도는 사용자 모드에서는 디스크·NIC·페이지 테이블을 직접 만질 수 없고, 정해진 문인 시스템콜로 커널에 부탁해야 합니다. x86-64 리눅스에서는 ‹syscall› 명령이 CPU를 커널 모드로 넘기고, 커널이 일을 마치면 돌려보냅니다. 모드가 바뀌는 사건은 세 가지이며 통틀어 **트랩**이라 부릅니다.

- 시스템콜: 프로그램이 의도적으로 요청합니다 (‹open›, ‹read›, ‹write›, ‹futex›).
- 예외: 실행 중 발생합니다 (0으로 나누기, 페이지 폴트).
- 인터럽트: 하드웨어가 비동기로 호출합니다 (타이머, NIC 수신, 디스크 완료).

타이머 인터럽트 덕분에 무한 루프를 도는 프로그램에서도 커널이 CPU를 되찾을 수 있고, 이것이 선점형 스케줄링의 출발점입니다. 시스템콜 한 번은 함수 호출보다 비싸지만 대체로 마이크로초 미만이라 문제는 횟수입니다. 1바이트씩 ‹write›를 수십만 번 부르는 로그 코드는 버퍼링한 코드보다 몇 배 느릴 수 있고, 실습 1에서 직접 측정합니다.

### 프로세스가 들고 있는 것

프로세스는 "실행 중인 프로그램"이지만 커널 눈에는 자원 묶음입니다. 가상 주소 공간(코드·힙·스택·매핑), **파일 서술자(fd) 표**, UID/GID와 capability, 시그널 처리 설정, 스케줄링 정보가 한 덩어리입니다. 리눅스에서는 파일뿐 아니라 소켓·파이프·타이머도 fd이므로 fd는 유한한 자원입니다. 서버가 ‹Too many open files›로 죽는 일은 연결이나 파일을 닫지 않는 누수에서 가장 흔하게 시작됩니다. ‹ls /proc/PID/fd | wc -l›과 ‹cat /proc/PID/limits›가 첫 확인입니다.

### 만들고 지우기: fork, exec, wait

유닉스는 프로세스 생성을 둘로 쪼갰습니다. ‹fork›는 호출자를 복제하고, ‹exec›는 복제본의 주소 공간을 새 프로그램으로 바꿉니다. 둘 사이에 자식이 fd를 재배치(리다이렉션)하거나 UID를 낮출 수 있어서, 셸과 컨테이너 런타임 같은 도구가 이 틈에서 환경을 꾸밉니다. 자식이 끝나도 종료 상태는 부모가 ‹wait›로 읽어 갈 때까지 프로세스 표에 **좀비(Z)** 로 남습니다. 이미 죽은 프로세스이므로 ‹kill -9›는 소용이 없고, 부모가 회수하게 고치거나 부모를 재시작해야 합니다. 부모가 먼저 죽은 고아는 PID 1(또는 subreaper)이 입양해 회수하는데, 이 책임을 못 지는 PID 1이 컨테이너에서 문제를 만듭니다 (레슨 7).

### 시그널

시그널은 커널이 프로세스에 보내는 비동기 알림입니다. SIGTERM은 "정리하고 끝내라"는 요청이며 핸들러를 걸 수 있고, SIGKILL과 SIGSTOP은 잡거나 무시할 수 없습니다. 표준 시그널은 큐에 쌓이지 않아 막혀 있는 동안 여러 번 와도 한 번으로 합쳐질 수 있습니다 (signal(7)). fork는 처분을 복사하고, exec는 핸들러를 기본 동작으로 되돌리되 "무시"는 유지합니다. 운영에서는 이렇게 읽으면 됩니다. ‹kill -9›는 정리 코드를 건너뛰어 락 파일·임시 파일·진행 중 트랜잭션을 남기므로, 기본 종료 절차는 SIGTERM, 유예 시간, 그래도 안 끝나면 SIGKILL입니다.

### strace: 블랙박스를 여는 가장 싼 도구

‹strace -f -tt -T -p PID›는 프로세스가 부르는 시스템콜과 소요 시간을 보여 줍니다. 어떤 파일을 여는지, 어디서 막혔는지(‹read›, ‹futex›, ‹epoll_wait›), 어떤 오류(‹ENOENT›, ‹EACCES›, ‹EMFILE›)가 나는지 소스 없이 알 수 있습니다. ‹strace -c›는 호출 횟수 요약표를 만듭니다. 다만 ptrace 기반이라 대상이 크게 느려질 수 있어 운영 프로세스에 오래 붙이지 않습니다 (대안은 레슨 6의 perf·eBPF).

### 커널 구조 한 줄

리눅스는 드라이버·파일 시스템·네트워크가 한 주소 공간에 있는 모놀리식 커널이라 빠르지만, 커널 코드의 버그 하나가 시스템 전체를 멈출 수 있습니다. 마이크로커널은 서비스를 사용자 공간으로 내보내 격리를 얻는 대신 메시지 전달 비용을 냅니다. 외주 실무에서 이 구분을 따질 일은 드물지만, 드라이버·커널 모듈을 건드리는 작업이 왜 위험한지의 근거가 됩니다.`,
      code: `import os, signal, time

pid = os.fork()
if pid == 0:                                  # 자식
    os.execvp("sleep", ["sleep", "30"])       # 주소 공간을 sleep 프로그램으로 교체
else:                                         # 부모
    time.sleep(0.2)
    print("parent", os.getpid(), "child", pid)
    os.kill(pid, signal.SIGTERM)              # 정중한 종료 요청
    _, status = os.waitpid(pid, 0)            # 회수하지 않으면 자식은 좀비(Z)로 남는다
    print("signaled:", os.WIFSIGNALED(status), "signal:", os.WTERMSIG(status))
    # 출력: signaled: True signal: 15`,
      codeLang: `python`,
      key: [
        `사용자 모드와 커널 모드의 전환은 시스템콜·예외·인터럽트(트랩)로만 일어나며, 비용은 한 번이 아니라 호출 횟수로 쌓인다.`,
        `프로세스는 주소 공간, fd 표, 자격(UID/GID·capability), 시그널 설정의 묶음이고 fd는 유한한 자원이다.`,
        `fork로 복제하고 exec로 프로그램을 바꾸며, 부모가 wait하지 않으면 자식은 좀비(Z)로 남는다.`,
        `SIGTERM은 잡을 수 있는 종료 요청이고 SIGKILL·SIGSTOP은 잡을 수 없다. 표준 시그널은 큐에 쌓이지 않는다.`,
        `첫 관측 도구는 strace -c 와 /proc/PID/fd, limits, status 이다.`
      ],
      pitfalls: [
        `종료 절차를 kill -9로 고정해 락 파일, 임시 파일, 진행 중인 작업을 계속 남긴다. 기본은 SIGTERM, 유예, SIGKILL 순서다.`,
        `좀비 프로세스에 kill -9를 반복한다. 이미 죽은 프로세스이므로 부모의 wait 누락을 고치거나 부모를 재시작해야 한다.`,
        `운영 중인 프로세스에 strace -f 를 오래 붙여 서비스를 더 느리게 만든다.`,
        `ulimit -n 이 기본값(흔히 1024)인 채로 연결 수가 많은 서비스를 올려 Too many open files 를 만난다.`
      ]
    },
    {
      title: `스케줄링, 스레드, 동기화: CPU를 나누는 방식`,
      body: `스케줄러가 푸는 문제는 "CPU 시간을 누구에게 얼마나 줄까"이고, 처리량·응답 시간·공정성은 서로 충돌합니다. OSTEP이 소개하는 MLFQ는 작업 길이를 모르는 채로 짧은 대화형 작업을 먼저 돌리려는 설계입니다. 큐를 여러 개 두고, 타임슬라이스를 다 쓴 작업은 아래 큐로 내리고, 주기적으로 모두 위로 올려 굶주림을 막습니다. 리눅스의 일반 작업용 스케줄러는 MLFQ가 아니라 가중치에 비례해 CPU 시간을 나누는 공정성 기반 계열이고 세부 알고리즘이 커널 버전마다 달라졌으므로, 이 레슨은 알고리즘 이름보다 **관측 가능한 지표**에 집중합니다.

### 실행 대기열과 포화

CPU마다 실행 가능(runnable) 스레드가 줄 서는 실행 대기열이 있습니다. "CPU가 부족하다"의 정확한 뜻은 사용률이 높다는 것보다 **줄이 길다(포화)** 는 것입니다. ‹vmstat 1›의 ‹r› 열이 코어 수보다 지속적으로 크면 포화입니다. 반대로 한 코어만 100%이고 나머지가 놀면 단일 스레드 병목이므로 ‹mpstat -P ALL 1›로 코어별로 봅니다.

**로드 애버리지**는 실행 가능 스레드와 uninterruptible sleep(D 상태, 주로 I/O 대기) 스레드 수의 1·5·15분 지수 이동 평균입니다. 8코어에서 로드 8은 대략 포화 경계지만 D 상태가 섞여 있어, CPU 문제인지 디스크·NFS 문제인지는 ‹vmstat›의 ‹b›, ‹wa›로 따로 가립니다. 로드가 40인데 CPU idle이 높다면 늘려야 할 것은 코어가 아니라 I/O 경로입니다.

### 컨텍스트 스위치와 멀티코어

스레드를 바꾸는 직접 비용은 레지스터 저장·복원 정도라 작지만, 진짜 비용은 새 스레드가 CPU 캐시와 TLB를 다시 채우는 간접 비용입니다. 스레드가 코어보다 훨씬 많거나 락 경합으로 자주 잠들면 ‹vmstat›의 ‹cs›가 치솟고 처리량이 오히려 떨어집니다. 멀티코어에서는 코어별 대기열을 주기적으로 균형 맞추되 캐시가 데워진 코어에 계속 두려 하며(친화도), NUMA 서버에서는 메모리가 먼 노드에 있으면 느려지므로 ‹numactl --hardware›로 구조를 확인합니다.

우선순위는 ‹nice›(-20~19)와 cgroup의 ‹cpu.weight›(기본 100, 범위 1~10000)로 조절하는데, 둘 다 CPU가 모자랄 때의 **상대 비율**일 뿐 상한이 아닙니다. 상한은 ‹cpu.max›가 정하며 지연을 만드는 방식이 직관과 달라서 계산해 봅니다. 한도 2 CPU는 ‹200000 100000›, 곧 100ms 주기마다 CPU 시간 200ms의 예산입니다. 스레드 16개가 동시에 달리면 12.5ms 만에 예산이 바닥나고 남은 87.5ms 동안 전원이 멈춥니다. 평균 사용률은 낮아도 p99 지연은 크게 튀며, ‹cpu.stat›의 ‹nr_throttled›가 증거입니다.

### 스레드와 동기화

리눅스에서 스레드는 주소 공간을 공유하는 태스크입니다. 공유는 빠르고 편한 대신 레이스 컨디션을 부릅니다. 뮤텍스는 경합이 없으면 사용자 공간의 원자 연산 하나로 끝나지만, 경합이 생기면 ‹futex› 시스템콜로 커널에서 잠듭니다. 그래서 락 경합의 전형적인 모습은 **CPU 사용률은 낮은데 지연은 높고, ‹cs›와 futex 호출이 많다**입니다. 스레드 덤프나 ‹perf›에서 대부분이 같은 락을 기다리면 확진입니다.

- 조건 변수는 반드시 ‹while› 안에서 기다립니다. 가짜 깨움이 있고, 깨어난 사이 다른 스레드가 조건을 소비할 수 있기 때문입니다.
- 교착 상태는 락 순서를 전역으로 고정하거나 타임아웃을 두어 예방합니다.
- 락을 쥔 채 네트워크·DB 같은 느린 호출을 하지 않습니다. 임계구역이 길어질수록 대기가 폭발적으로 늘어납니다.
- 커널은 읽기가 많은 자료구조에 RCU를 씁니다. 읽는 쪽은 락 없이 읽고, 쓰는 쪽은 새 버전을 게시한 뒤 옛 버전을 보던 독자가 끝나길 기다려 정리합니다. 불변 스냅샷을 통째로 교체하는 설계와 같은 발상입니다.
- 코어를 늘려도 단일 락이나, 여러 스레드가 같은 캐시 라인(보통 64바이트)을 쓰는 false sharing이 있으면 확장이 멈춥니다.`,
      code: `import threading, collections

class Bounded:
    """크기가 제한된 큐: 생산자는 가득 차면, 소비자는 비면 잠든다."""
    def __init__(self, cap):
        self.q, self.cap = collections.deque(), cap
        self.lock = threading.Lock()
        self.not_full = threading.Condition(self.lock)
        self.not_empty = threading.Condition(self.lock)

    def put(self, x):
        with self.lock:
            while len(self.q) >= self.cap:    # if 가 아니라 while: 깨어난 뒤 조건을 다시 검사
                self.not_full.wait()
            self.q.append(x)
            self.not_empty.notify()

    def get(self):
        with self.lock:
            while not self.q:
                self.not_empty.wait()
            x = self.q.popleft()
            self.not_full.notify()
            return x

if __name__ == "__main__":
    b, out = Bounded(2), []
    t = threading.Thread(target=lambda: [out.append(b.get()) for _ in range(5)])
    t.start()
    for i in range(5):
        b.put(i)
    t.join()
    print(out)    # [0, 1, 2, 3, 4]`,
      codeLang: `python`,
      key: [
        `포화(실행 대기열 길이)와 사용률은 다른 지표다. vmstat의 r 열과 mpstat 코어별 값으로 구분한다.`,
        `로드 애버리지에는 D 상태(I/O 대기)가 섞이므로 CPU 문제와 I/O 문제는 vmstat의 r, b, wa로 가른다.`,
        `락 경합은 낮은 CPU, 높은 지연, 많은 cs와 futex 호출로 나타난다.`,
        `조건 변수는 while 안에서 기다리고, 락을 쥔 채 느린 외부 호출을 하지 않는다.`,
        `cpu.max 는 주기(보통 100ms)마다의 예산이라서 순간 병렬도가 크면 평균이 낮아도 스로틀링된다.`
      ],
      pitfalls: [
        `로드 애버리지를 코어 수와만 비교해 CPU 증설부터 제안한다. D 상태 때문에 올라간 로드는 코어를 늘려도 그대로다.`,
        `스레드 풀·워커 수를 많을수록 좋다고 잡아 컨텍스트 스위치와 메모리 사용만 늘린다.`,
        `컨테이너 CPU 한도는 작게 잡으면서 런타임은 호스트 코어 수만큼 스레드를 만들게 두어 스로틀링 지연을 만든다.`,
        `락 안에서 DB·HTTP 호출을 하고 타임아웃을 두지 않아 연쇄 대기와 교착을 만든다.`
      ]
    },
    {
      title: `가상 메모리, 페이지 폴트, OOM`,
      body: `가상 메모리는 "프로세스마다 자기만의 주소 공간"을 만들어 줍니다. CPU의 MMU가 페이지 테이블을 보고 가상 주소를 물리 주소로 바꾸며, x86-64 리눅스의 흔한 페이지 크기는 4 KiB입니다. 이 간접층 덕분에 프로세스끼리 서로의 메모리를 볼 수 없고(격리), 같은 라이브러리 페이지를 여럿이 공유하며, 쓰기 전까지 물리 메모리를 배정하지 않는 **지연 할당**이 가능해집니다.

### 페이지 폴트: 가상 메모리의 엔진

접근한 가상 페이지에 유효한 매핑이 없거나 권한이 맞지 않으면 CPU가 트랩을 올리고 커널이 처리합니다. 이것이 페이지 폴트이며 고장이 아니라 정상 메커니즘입니다.

| 종류 | 상황 | 비용 |
| minor | 디스크 I/O 없이 해결: 0으로 채운 새 페이지 배정, page cache에 있는 파일 페이지 연결, COW 복사 | 마이크로초 수준 |
| major | 디스크에서 읽어 와야 함: 파일 매핑, swap-in | 장치 지연만큼 (HDD는 수 ms) |
| invalid | 매핑 없는 주소에 접근 | SIGSEGV |

‹malloc(1GB)›나 ‹mmap›이 성공해도 물리 메모리는 페이지를 처음 건드릴 때 한 장씩 붙습니다. 그래서 **VSZ**(가상 크기)는 거의 정보가 없고, **RSS**(실제로 상주하는 양, 익명+파일+공유 메모리의 합)가 의미 있으며, 여러 프로세스가 공유하는 페이지는 ‹smaps›의 **PSS**가 비례 분배해 줍니다. TLB는 변환 결과 캐시이며 워킹셋이 크면 미스가 늘어 2 MiB 같은 huge page가 도움이 되기도 하지만, 지연 스파이크를 만들 수 있어 DB 문서가 THP 설정을 따로 권하기도 하므로 워크로드별로 측정합니다.

### COW와 mmap

‹fork›는 메모리를 복사하지 않고 부모·자식이 같은 물리 페이지를 읽기 전용으로 공유하다가, 누군가 쓰면 그 페이지만 복사합니다(copy-on-write). 그래서 fork는 빠르지만, 쓰기가 많은 시간대에 fork 기반 스냅샷(Redis의 BGSAVE 같은 방식)을 뜨면 쓰인 페이지만큼 복사본이 생깁니다. 쓰기가 데이터셋 전체로 퍼지는 최악의 경우 이론상 메모리가 최대 약 두 배가 되므로, 용량 산정에는 평균이 아니라 이 최악값을 넣어야 합니다. ‹mmap›은 파일을 주소 공간에 매핑해 ‹read›/‹write› 호출 없이 접근하게 합니다. 필요한 부분만 폴트로 올라오고 page cache를 공유하는 장점이 있지만, 접근 지연이 예측 불가해지고 I/O 오류가 SIGBUS로 나타납니다.

### 오버커밋, page cache, swap

‹vm.overcommit_memory›는 0(휴리스틱, 기본), 1(항상 허용), 2(엄격 계산)입니다. 모드 2에서는 약속한 총량이 swap 전체에 RAM의 ‹overcommit_ratio›%(기본 50)를 더한 값을 넘지 못해 할당이 오류로 돌아오고, 한도는 ‹/proc/meminfo›의 ‹CommitLimit›·‹Committed_AS›로 봅니다. 남는 RAM은 page cache가 쓰므로 ‹free›의 free 열이 작은 것은 정상이고, **MemAvailable**이 새 프로그램에 줄 수 있는 추정치입니다. swap은 쓰지 않는 페이지를 내보내 RAM을 아끼지만 워킹셋이 RAM을 넘으면 계속 오가는 **thrashing**이 일어납니다. ‹vmstat›의 ‹si›/‹so›와 PSI의 memory ‹full›이 신호입니다.

### OOM

메모리를 회수할 수 없으면 OOM killer가 희생자를 골라 SIGKILL을 보냅니다. 범위는 둘입니다. 시스템 전체가 고갈될 때, 그리고 cgroup의 ‹memory.max›에 닿아 회수가 안 될 때(컨테이너가 보통 이 경우)입니다. ‹memory.high›는 넘어도 OOM 없이 회수 압박과 스로틀링만 겁니다. 후보 점수는 ‹/proc/PID/oom_score›이고 ‹oom_score_adj›(-1000~1000)로 조정하지만 -1000은 그 프로세스 대신 다른 프로세스를 죽이게 하니 신중해야 합니다. 로그는 ‹journalctl -k›나 ‹dmesg›에서 ‹Out of memory: Killed process›(전역) 또는 ‹Memory cgroup out of memory›(cgroup)로 구분하고, 컨테이너 종료 코드 137은 128+9, 즉 SIGKILL이라는 뜻입니다. 137이 모두 OOM이라는 뜻은 아닙니다.`,
      code: `import mmap

def mem_kb():
    out = {}
    with open("/proc/self/status") as f:
        for line in f:
            if line.startswith(("VmSize:", "VmRSS:")):
                k, v = line.split(":")
                out[k] = int(v.split()[0])
    return out

SIZE = 512 * 1024 * 1024                  # 512 MiB
print("start        ", mem_kb())
# 파이썬 mmap의 기본 flags는 MAP_SHARED라서 fork 후에도 자식과 진짜로 공유된다(COW 아님).
# malloc 힙처럼 fork 시 COW가 되는 private 익명 매핑을 쓰려면 MAP_PRIVATE를 명시한다.
m = mmap.mmap(-1, SIZE, flags=mmap.MAP_PRIVATE | mmap.MAP_ANONYMOUS)   # 가상 주소만 예약한다
print("after mmap   ", mem_kb())          # VmSize 만 약 512 MiB 증가, VmRSS 는 거의 그대로
for off in range(0, SIZE // 2, 4096):     # 절반의 페이지를 처음 건드린다
    m[off] = 1                            # 페이지마다 minor page fault 1회
print("touched half ", mem_kb())          # VmRSS 가 약 256 MiB 증가`,
      codeLang: `python`,
      key: [
        `가상 메모리는 격리, 지연 할당, 공유(COW·라이브러리)를 함께 제공한다. malloc 성공은 물리 메모리 확보가 아니다.`,
        `VSZ는 거의 정보가 없고 RSS가 상주량이며, 공유가 많으면 PSS로 본다. 새 프로그램에 줄 수 있는 양은 MemAvailable이다.`,
        `minor 폴트는 디스크 I/O 없이 해결되고 major 폴트는 장치 지연만큼 느리다.`,
        `OOM은 시스템 전체와 cgroup(memory.max) 두 범위에서 일어나고, memory.high는 kill 없이 스로틀링만 한다.`,
        `종료 코드 137은 SIGKILL(128+9)이며 OOM은 그 원인 중 하나일 뿐이다.`
      ],
      pitfalls: [
        `free 명령의 free 열만 보고 메모리가 부족하다고 진단한다. page cache는 회수 가능하므로 MemAvailable을 본다.`,
        `VSZ가 크다고 누수로 단정한다. JVM·Go 런타임은 가상 주소를 크게 예약해 둔다.`,
        `컨테이너 한도를 JVM 힙(-Xmx)과 같게 둔다. 메타스페이스, 스레드 스택, 다이렉트 버퍼, page cache까지 한도에 들어간다.`,
        `oom_score_adj를 -1000으로 주어 서비스를 보호했다고 생각하지만, 실제로는 sshd 같은 다른 프로세스가 대신 죽는다.`
      ]
    },
    {
      title: `파일 시스템, 저장 장치, I/O 경로`,
      body: `파일 하나를 읽는 요청이 지나가는 길을 먼저 그려 둡니다. 앱 → ‹read›/‹write› 시스템콜 → VFS(파일 시스템 공통 계층) → ext4·XFS 같은 파일 시스템 → **page cache** → 블록 계층 → 장치 드라이버 → 디스크. 대부분의 성능·내구성 사건은 이 경로의 어느 층에서 기다렸는지, 또는 어느 층에서 속았는지로 설명됩니다.

### 이름, inode, 데이터

파일의 실체는 **inode**입니다. 소유자·모드·크기·시각과 데이터 블록(extent) 위치가 들어 있고 이름은 없습니다. 이름은 디렉터리 항목(이름 → inode 번호)이 맡습니다. 여기서 실무에 중요한 성질이 줄줄이 나옵니다.

- 하드 링크는 같은 inode를 가리키는 두 번째 이름입니다.
- 같은 파일 시스템 안의 ‹rename›은 원자적입니다. 독자는 옛 파일 또는 새 파일만 봅니다.
- 삭제(‹unlink›)는 링크 수를 줄일 뿐이고, 열린 fd가 있으면 데이터는 살아 있습니다. 그래서 ‹df›는 100%인데 ‹du›는 40%인 일이 생기며, ‹lsof +L1›이 삭제됐지만 열려 있는 파일을 찾아 줍니다.
- ext4는 inode 개수가 파일 시스템을 만들 때 정해지므로, 작은 파일 수백만 개면 용량이 남아도 ‹ENOSPC›가 납니다. ‹df -i›로 확인합니다.

### write가 돌아와도 디스크에는 없다

‹write›는 데이터를 커널의 page cache에 복사하고 dirty로 표시한 채 돌아옵니다. 장치에 쓰는 것은 나중이므로 전원이 나가면 그 데이터는 사라질 수 있습니다. ‹fsync(fd)›는 그 파일의 dirty 데이터와 메타데이터를 장치까지 내리고 끝나길 기다리며, 걸리는 시간은 장치 지연이라 밀리초 단위일 수 있습니다. DB가 WAL을 쓰고 커밋마다 fsync하는 이유입니다. 새 파일을 만들거나 이름을 바꾼 경우 디렉터리 항목도 내구성이 필요해서 디렉터리 fd에도 fsync합니다.

**저널링**은 메타데이터 변경을 먼저 로그에 적고 커밋한 뒤 본래 위치에 반영해, 크래시 후 로그를 재생하는 것만으로 구조가 일관되게 복구되도록 합니다(전체 fsck 스캔이 필요 없음). ext4 기본인 ordered 모드는 데이터를 먼저 쓰고 메타데이터를 저널에 커밋하므로 "파일 시스템 구조"는 안전하지만 **앱 수준의 원자성은 보장하지 않습니다**. ‹open(path, "w")›는 열자마자 파일을 0바이트로 잘라 버리므로 그 직후 전원이 나가면 빈 설정 파일이 남을 수 있습니다. ext4에는 이런 패턴(truncate 후 쓰기, rename 교체)을 감지해 할당을 서두르는 ‹auto_da_alloc›(기본 켜짐) 완화책이 있지만 fsync를 대신하지는 못하고, 파일 시스템마다 다릅니다. 해법은 같은 디렉터리의 임시 파일에 쓰고, fsync, rename, 디렉터리 fsync입니다 (아래 코드).

### 저장 장치와 I/O 대기

HDD는 시크와 회전 지연이 밀리초이고 순차 접근이 압도적으로 유리합니다. SSD는 랜덤 접근이 빠르고 내부 병렬성이 크지만 쓰기 증폭과 내부 정리 때문에 꼬리 지연이 생깁니다. RAID는 가용성·성능 도구이지 백업이 아닙니다(실수로 지운 파일도 그대로 복제됩니다). 클라우드 블록 스토리지에는 IOPS·처리량 상한이 있어서 넘으면 대기열이 쌓이므로 ‹iostat -x›의 대기 시간(await, 버전에 따라 r_await·w_await로 나뉨)과 큐 길이(aqu-sz)를 봅니다. SSD·RAID처럼 요청을 병렬 처리하는 장치에서는 ‹%util› 100%가 성능 한계를 뜻하지 않는다고 sysstat 문서도 적고 있습니다.

블록 I/O 완료를 기다리는 태스크는 **D 상태**로 자며 SIGKILL로도 즉시 깨울 수 없습니다. NFS 서버가 멎으면 클라이언트 프로세스가 줄줄이 D로 빠지고 로드 애버리지가 폭등합니다. 앱이 쓰는 I/O 모델은 셋입니다. 블로킹 호출, ‹epoll›로 준비를 기다리는 논블로킹(일반 파일은 ‹epoll›에 등록되지 않아서 Node의 libuv처럼 스레드 풀로 처리하는 런타임이 많음), 그리고 제출·완료 큐를 쓰는 ‹io_uring›(환경 정책에 따라 막혀 있을 수 있음)입니다.

### 네트워크 수신 경로 한 장면

패킷은 NIC가 메모리로 DMA한 뒤 인터럽트를 올리고, 커널의 소프트웨어 인터럽트(NAPI 폴링)가 프로토콜을 처리해 소켓 수신 버퍼에 넣으면 앱이 ‹read›합니다. 트래픽이 과하면 인터럽트 처리가 CPU를 다 먹어 앱이 읽을 틈이 없는 **수신 라이브락**이 되고, 폴링과 배치 처리가 대책입니다. 관측은 ‹ss -s›, ‹nstat›, ‹ss -ltn›(LISTEN 소켓의 Recv-Q가 쌓이면 accept가 느린 것)로 합니다.`,
      code: `import os, tempfile

def atomic_write(path: str, data: bytes) -> None:
    d = os.path.dirname(os.path.abspath(path))
    fd, tmp = tempfile.mkstemp(dir=d)         # 같은 파일 시스템 안의 임시 파일 (모드 0600 주의)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())              # 내용과 메타데이터를 장치까지
        os.replace(tmp, path)                 # 원자적 교체: 독자는 옛 것 또는 새 것만 본다
        dfd = os.open(d, os.O_RDONLY)
        try:
            os.fsync(dfd)                     # 디렉터리 항목 변경도 내려보낸다
        finally:
            os.close(dfd)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise

atomic_write("config.json", b'{"version": 2}')`,
      codeLang: `python`,
      key: [
        `파일의 실체는 inode이고 이름은 디렉터리 항목이다. rename은 같은 파일 시스템에서 원자적이다.`,
        `write의 반환은 디스크 기록이 아니다. 내구성은 fsync(파일)와 fsync(디렉터리)로 얻는다.`,
        `저널링은 파일 시스템 구조의 일관성을 지킬 뿐 앱 수준의 원자성은 아니다. 임시 파일, fsync, rename 패턴을 쓴다.`,
        `df와 du가 다르면 삭제됐지만 열린 파일을, ENOSPC인데 용량이 남으면 inode 고갈을 의심한다.`,
        `D 상태는 SIGKILL로도 못 깨우고 로드 애버리지에 포함된다.`
      ],
      pitfalls: [
        `내구성이 필요한 곳에서 fsync 없이 저장 완료를 응답한다. 반대로 요청마다 fsync해서 처리량을 무너뜨리기도 하므로 배치(그룹 커밋)를 검토한다.`,
        `임시 파일로 교체할 때 mkstemp의 기본 모드(0600)와 소유자 때문에 원래 파일의 권한이 바뀌는 점을 놓친다.`,
        `로그 파일을 rm으로 지워 공간을 확보하려 하지만 프로세스가 계속 열고 있어 공간이 돌아오지 않는다. 비우거나 로그 로테이션 후 다시 열게 한다.`,
        `RAID 구성을 백업이라고 설명하거나 클라우드 볼륨의 IOPS 상한을 확인하지 않고 용량만 늘린다.`
      ]
    },
    {
      title: `권한 모델과 systemd 서비스 운영`,
      body: `서비스 운영의 기본은 "이 프로세스가 누구 권한으로, 무엇을 할 수 있고, 죽으면 누가 어떻게 살리는가"에 답하는 것입니다. 앞의 절반이 권한 모델, 뒤의 절반이 systemd입니다.

### 권한: 누가 무엇을 할 수 있는가

프로세스에는 실제·유효·저장·파일시스템 UID/GID와 보조 그룹이 있고, 파일 접근 판정은 파일시스템 UID/GID와 보조 그룹으로 이루어집니다 (credentials(7)). 파일 모드는 소유자·그룹·기타 각각의 rwx이며 디렉터리에서는 의미가 달라집니다. r은 목록, w는 항목 생성·삭제, x는 통과입니다. 경로 중간 디렉터리 하나에만 x가 없어도 막히므로 ‹namei -l /경로›로 구성요소별 권한을 한 번에 봅니다. 새 파일의 기본 모드는 파일 666, 디렉터리 777에서 ‹umask›를 뺀 값이라 022면 644와 755입니다. 서비스의 umask는 로그인 셸과 다를 수 있습니다. ‹setuid› 비트는 실행 파일을 소유자 권한으로 돌리므로 root 소유 setuid 파일은 곧 공격 표면입니다.

**capability**는 root의 권한을 쪼갠 단위입니다. 1024 미만 포트 바인딩은 ‹CAP_NET_BIND_SERVICE›, 네트워크 설정은 ‹CAP_NET_ADMIN› 식입니다. 스레드마다 permitted·effective·inheritable·bounding·ambient 집합이 있고, ‹CAP_SYS_ADMIN›은 잡다한 권한이 몰려 있어 "새로운 root"로 불립니다. 원칙은 **전용 일반 사용자 + 필요한 capability 하나**입니다. 모드 비트가 맞는데도 ‹Permission denied›라면 SELinux나 AppArmor 같은 필수 접근 통제가 막았을 수 있으니 감사 로그(‹ausearch -m avc›, ‹journalctl›)를 봅니다. 비밀 값은 0600/0640 파일에 두고 유닛 파일이나 명령줄에 쓰지 않습니다 (‹ps›와 ‹systemctl show›에 보입니다).

### systemd: 서비스 관리자

systemd는 PID 1로서 유닛(service, socket, timer, mount, target 등)을 의존성 그래프로 띄우고, 서비스마다 cgroup을 만들어 자식 프로세스까지 추적합니다. 그래서 stop은 그 cgroup 전체를 정리할 수 있습니다. 유닛을 설계할 때 정할 것은 다섯 가지입니다.

- **시작 판정(‹Type=›)**: ‹simple›은 fork 직후 성공으로 간주해 바이너리 경로 오류나 없는 ‹User=›도 시작은 성공으로 보고합니다. ‹exec›는 실제 execve 성공을 기다려 장기 서비스에 권장되고, 준비 신호가 필요하면 ‹notify›(앱이 READY=1을 보냄)입니다.
- **재시작**: ‹Restart=on-failure›와 ‹RestartSec›. 짧은 시간에 반복 실패하면 시작 제한(기본 10초 안에 5회)에 걸려 systemd가 포기하며, 풀 때는 ‹systemctl reset-failed›를 씁니다.
- **종료**: ‹ExecStop›이 없으면 SIGTERM을 보내고 ‹TimeoutStopSec› 뒤 SIGKILL을 보냅니다. 앱이 SIGTERM에서 진행 중 요청을 마치고 나가야 무중단에 가깝습니다.
- **의존성**: ‹Requires=›·‹Wants=›는 "함께 띄운다"이고 ‹After=›는 "순서"입니다. 둘은 별개라 DB가 뜬 뒤에 시작하려면 둘 다 씁니다. 네트워크 주소가 필요하면 ‹network-online.target›을 씁니다.
- **자원과 샌드박스**: ‹MemoryMax›·‹CPUQuota›·‹TasksMax›는 cgroup 파일에 대응합니다. ‹NoNewPrivileges›, ‹ProtectSystem=strict›, ‹ProtectHome›, ‹PrivateTmp›, ‹DynamicUser›, ‹StateDirectory›가 기본 방어선이며 ‹systemd-analyze security 서비스명›이 노출 점수를 보여 줍니다.

운영 명령은 ‹systemctl status›, ‹journalctl -u 서비스명 -b --since›, ‹systemctl cat›입니다. 설정은 패키지 업데이트에 덮이는 /usr/lib의 원본이 아니라 ‹systemctl edit›로 drop-in(/etc/systemd/system/서비스명.service.d/)에 두며, /etc가 /usr/lib보다 우선합니다. 재부팅 뒤에도 저널을 남기려면 ‹/var/log/journal› 디렉터리가 있어야 하는 배포판 설정이 흔하니 확인합니다.

유닛 파일 문법도 하나 짚습니다. systemd.syntax(7)는 줄이 ‹#›이나 ‹;›로 시작할 때만 주석으로 정의하므로, 값 뒤에 같은 줄 주석을 달면 그 글자까지 값에 들어가 ‹TimeoutStopSec=30 # 메모› 같은 줄은 시간 해석에 실패합니다. 주석은 별도 줄에 쓰고 수정 뒤에는 ‹systemd-analyze verify›로 파싱 오류를 먼저 걸러 냅니다.`,
      code: `[Unit]
Description=Orders API
Wants=network-online.target
After=network-online.target
Requires=postgresql.service
After=postgresql.service

[Service]
Type=exec
User=orders
Group=orders
# 주석은 줄 맨 앞에만 쓴다. 값 뒤에 같은 줄 주석을 달면 그 글자까지 값으로 읽힌다.
# 환경 파일: 모드 0600, root 소유. 비밀은 유닛 본문에 쓰지 않는다.
EnvironmentFile=/etc/orders/env
ExecStart=/opt/orders/bin/server --port 8080
Restart=on-failure
RestartSec=2
# SIGTERM 후 30초 안에 정리하지 못하면 SIGKILL
TimeoutStopSec=30
LimitNOFILE=65536
MemoryMax=1G
TasksMax=512
NoNewPrivileges=true
# 파일 시스템 대부분을 읽기 전용으로 (/dev, /proc, /sys 제외)
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
# /var/lib/orders 를 만들어 주고 이곳만 쓰기 가능하게 연다
StateDirectory=orders

[Install]
WantedBy=multi-user.target`,
      codeLang: `ini`,
      key: [
        `파일 접근은 파일시스템 UID/GID와 보조 그룹으로 판정하며, 경로의 모든 디렉터리에 x가 있어야 한다. namei -l 로 확인한다.`,
        `서비스는 전용 일반 사용자와 필요한 capability(예: CAP_NET_BIND_SERVICE) 하나로 돌리고 root와 chmod 777로 풀지 않는다.`,
        `Type=simple은 fork 직후 성공으로 보고하고 Type=exec는 execve 성공까지 기다린다.`,
        `Requires/Wants(함께 띄움)와 After/Before(순서)는 별개이며 보통 쌍으로 쓴다.`,
        `종료는 SIGTERM 후 TimeoutStopSec 뒤 SIGKILL이고, 설정은 drop-in으로 고치며 /etc가 /usr/lib보다 우선한다.`
      ],
      pitfalls: [
        `권한 오류를 root 실행과 chmod 777로 덮어 보안 부채를 고객에게 넘긴다.`,
        `Requires만 쓰고 After를 빼서 의존 서비스보다 먼저 떠 시작 실패를 만든다.`,
        `Restart=always에 RestartSec를 극단적으로 짧게 두어 즉시 죽는 서비스가 로그를 폭주시키고 외부 의존 서버를 두드리거나 시작 제한에 걸린다.`,
        `EnvironmentFile을 644로 두거나 비밀을 유닛 본문에 써서 일반 사용자에게 노출한다.`
      ]
    },
    {
      title: `리눅스 성능 관측: USE, 핵심 도구, PSI, eBPF`,
      body: `성능 문제는 "느리다"는 증상에서 시작하고, 추측으로 도구를 흔들면 시간만 갑니다. Brendan Gregg의 **USE 방법**은 모든 자원마다 사용률(Utilization), 포화(Saturation), 오류(Errors)를 확인하라는 체크리스트로 병목을 빠르게 좁힙니다.

| 자원 | 사용률 | 포화 | 오류 |
| CPU | mpstat 코어별 %usr+%sys | vmstat r, PSI cpu | 커널 로그의 하드웨어 오류, 열 스로틀링 |
| 메모리 | MemAvailable | si/so, PSI memory full | dmesg의 OOM 로그 |
| 디스크 | iostat %util | aqu-sz, await(r_await·w_await) | dmesg의 I/O 오류 |
| 네트워크 | sar -n DEV 처리량 | 소켓 큐, 드롭, 재전송 | ip -s link 의 errors |

### 첫 60초 점검 순서

운영 서버에 들어가 처음 하는 일은 읽기 전용 명령 10개 안팎으로 전체를 훑는 것입니다. 널리 쓰는 순서는 ‹uptime›(로드의 추세), ‹dmesg -T | tail›(OOM·드라이버 오류), ‹vmstat 1›(r, b, si/so, us/sy/id/wa, cs), ‹mpstat -P ALL 1›, ‹pidstat 1›(프로세스별), ‹iostat -xz 1›, ‹free -m›, ‹sar -n DEV 1›, ‹sar -n TCP,ETCP 1›, ‹top›입니다. 읽을 때의 요령은 이렇습니다.

- ‹r›이 코어 수를 넘으면 CPU 포화, ‹b›·‹wa›가 높으면 I/O 대기, ‹cs›가 급등하면 락 경합이나 스레드 과다를 의심합니다.
- NVMe처럼 병렬 장치는 ‹%util›이 100%여도 포화가 아닐 수 있으므로 await와 큐 길이를 함께 봅니다.
- 평균은 꼬리를 숨깁니다. 지연은 분위수(p95, p99)로 봅니다.

### PSI: 막힌 시간을 직접 재기

‹/proc/pressure/cpu›, ‹memory›, ‹io›에는 ‹some›(일부 태스크가 자원 때문에 막힌 시간 비율)과 ‹full›(비유휴 태스크 전부가 동시에 막힘)이 10·60·300초 평균과 누적 마이크로초로 나옵니다. cgroup v2에서는 컨테이너별 ‹memory.pressure›도 있습니다. 다만 cpu의 ‹full›은 시스템 전체 값이 0으로 고정되어 있어(줄 자체는 커널 5.13부터 표시) cpu는 ‹some›을 봅니다. 사용률이 아니라 "일이 얼마나 막혔나"이므로 thrashing과 CPU 쿼터 스로틀링을 사용률 그래프보다 빨리 드러내고, 임계값을 넘으면 ‹poll›로 깨우는 트리거로 경보나 사용자 공간 OOM 대응도 만들 수 있습니다.

### /proc, 소켓, 프로파일러

- 프로세스별: ‹/proc/PID/status›(VmRSS, 스레드 수), ‹/proc/PID/limits›, ‹/proc/PID/fd›, ‹/proc/PID/io›.
- 소켓: ‹ss -s›(상태별 개수), ‹ss -ltn›(LISTEN의 Recv-Q가 쌓이면 accept 지연). CLOSE_WAIT이 계속 늘면 앱이 close를 하지 않는 버그입니다.
- 커널 메시지: ‹journalctl -k›에서 OOM, 파일 시스템 오류, 링크 플랩, 연결 추적 테이블 가득 참을 찾습니다.
- ‹perf›는 샘플링으로 CPU를 쓰는 함수를 보여 주고 flame graph로 요약합니다. ‹strace -c›는 시스템콜 집계입니다.
- **eBPF**(bpftrace, bcc의 runqlat·tcplife 같은 도구)는 커널이 검증한 작은 프로그램을 돌려 낮은 오버헤드로 스케줄 지연이나 TCP 수명을 재는 것이 강점이지만, 커널 지원과 권한(CAP_BPF, CAP_PERFMON은 커널 5.8부터, 그 전에는 CAP_SYS_ADMIN)이 필요하고 관리형 환경에서는 쓸 수 없는 일이 많습니다.

### 관측의 규율

변경 전에 기준선을 저장합니다(명령 출력과 시각을 파일로). 한 번에 하나만 바꾸고 전후를 비교합니다. 도구 자체의 오버헤드(strace, 상세 tcpdump)를 고려합니다. 증상 시각을 ‹journalctl --since›와 ‹sar› 히스토리에 맞춰 상관을 봅니다. 상시 지표(node_exporter 같은 수집기와 대시보드)가 없다면 첫 산출물은 수정이 아니라 **관측 도입**일 수 있습니다.`,
      code: `#!/usr/bin/env bash
# 첫 60초: 읽기 전용 명령으로 USE(사용률·포화·오류)를 훑는다. sysstat 패키지 필요.
# 결과를 시각과 함께 파일로 남겨 두면 기준선이 된다.
out="baseline-$(hostname)-$(date +%Y%m%d-%H%M%S).txt"
{
  uptime
  dmesg -T 2>/dev/null | tail -n 20      # dmesg_restrict 설정이면 sudo 필요
  vmstat 1 5                             # r(포화), b, si/so, wa, cs
  mpstat -P ALL 1 3                      # 한 코어만 100% 이면 단일 스레드 병목
  pidstat 1 3                            # 어느 프로세스가 CPU 를 쓰는가
  iostat -xz 1 3                         # await(또는 r_await·w_await), aqu-sz, %util
  free -m
  for r in cpu memory io; do echo "== PSI $r"; cat /proc/pressure/$r 2>/dev/null; done
  ss -s                                  # 소켓 상태별 개수
} > "$out" 2>&1
echo "saved: $out"`,
      codeLang: `bash`,
      key: [
        `USE: 모든 자원에 대해 사용률, 포화, 오류를 확인한다. CPU 포화는 r 열, 메모리 포화는 si/so와 PSI, 디스크 포화는 큐 길이로 본다.`,
        `vmstat의 r, b, wa, cs와 mpstat 코어별 값이 CPU 포화, I/O 대기, 락 경합, 단일 스레드 병목을 가른다.`,
        `PSI는 사용률이 아니라 막힌 시간을 직접 재므로 thrashing과 스로틀링을 빨리 드러낸다.`,
        `strace -c, perf, eBPF는 오버헤드와 권한이 다르다. 운영 서버에서는 가벼운 것부터 쓴다.`,
        `기준선을 먼저 저장하고 한 번에 하나만 바꿔 전후를 비교한다.`
      ],
      pitfalls: [
        `평균 CPU 사용률 그래프만 보고 문제없다고 말한다. 포화, 분위수 지연, 쿼터 스로틀링은 평균에 안 보인다.`,
        `iostat의 %util 100%를 NVMe 같은 병렬 장치에서도 곧바로 포화로 해석한다.`,
        `증상 시각의 로그와 지표를 맞춰 보지 않고 현재 값만 본다. 문제는 이미 지나갔을 수 있다.`,
        `운영 서버에서 상세 tcpdump나 strace -f 를 오래 켜 둬 관측 도구가 장애를 키운다.`
      ]
    },
    {
      title: `컨테이너의 기반: namespace, cgroup, overlayfs, 격리의 한계`,
      body: `"컨테이너"는 커널에 있는 하나의 기능이 아니라 기능들의 조합입니다. 보통의 프로세스에 **namespace**(보이는 것 제한), **cgroup**(쓸 수 있는 양 제한), **capability·seccomp·LSM**(할 수 있는 일 제한), 그리고 이미지로 만든 **루트 파일 시스템**을 입힌 것이 컨테이너 프로세스입니다. 가상 머신과 달리 호스트 커널을 그대로 공유한다는 점이 가벼움과 약한 격리 양쪽의 출발점입니다.

### namespace: 보이는 세계를 바꾼다

| 종류 | 격리 대상 |
| mnt | 마운트 지점 |
| pid | 프로세스 번호 |
| net | 네트워크 장치·스택·포트 |
| uts | 호스트 이름 |
| ipc | System V IPC, POSIX 메시지 큐 |
| user | UID/GID와 capability의 범위 |
| cgroup | cgroup 루트의 시야 |
| time | 부팅·단조 시계 |

프로세스가 속한 namespace는 ‹/proc/PID/ns/›의 링크로 보이며 inode 번호가 같으면 같은 namespace입니다. 만드는 호출은 ‹clone›(CLONE_NEW* 플래그)·‹unshare›, 들어가는 호출은 ‹setns›이며 셸 도구는 ‹unshare›, ‹nsenter›입니다. 도구가 없는 컨테이너는 ‹nsenter -t PID -n ss -tanp›로 그 네트워크 namespace에 호스트 도구를 가져다 디버깅합니다.

**PID namespace**의 첫 프로세스는 PID 1이 되어 고아를 입양합니다. 이 프로세스에는 **핸들러를 설치한 시그널만** 전달되고, 상위 namespace에서 보내는 SIGKILL·SIGSTOP만 예외입니다. 그래서 핸들러가 없는 프로그램이 PID 1이면 ‹docker stop›이 보낸 SIGTERM이 무시되어 유예 시간 뒤 SIGKILL로 끝납니다. 대책은 앱을 PID 1로 직접 실행(exec 형식, 셸이면 exec)하거나 init 프로세스(‹--init›, tini 등)를 앞세우고 앱이 SIGTERM을 처리하게 하는 것입니다. **user namespace**는 안의 UID 0을 밖의 일반 UID로 사상(‹uid_map›)하고 capability의 효력을 그 namespace가 가진 자원으로 한정해 rootless 컨테이너의 기반이 됩니다.

### cgroup v2: 쓸 수 있는 양을 제한한다

cgroup v2는 단일 계층이며 Linux 4.5에서 공식화됐습니다 (cgroups(7)). 확인은 ‹stat -fc %T /sys/fs/cgroup›가 ‹cgroup2fs›인지 봅니다.

| 파일 | 의미 |
| memory.max | 하드 한도. 회수 불가면 그 cgroup에서 OOM kill |
| memory.high | 넘으면 스로틀링과 회수 압박만, kill 없음 |
| memory.events | oom, oom_kill 카운터 |
| cpu.max | 쿼터와 주기 (200000 100000 이면 2 CPU) |
| cpu.weight | 경쟁 시 상대 비율 (기본 100) |
| cpu.stat | nr_throttled, throttled_usec |
| pids.max | 프로세스·스레드 수 상한, 초과 시 fork가 EAGAIN |
| io.max | 장치별 bps/iops 제한 |

오케스트레이터의 ‹limits›나 OCI 런타임 사양의 memory.limit, cpu.quota/period, pids.limit도 결국 위 파일 값이 되니 실제 파일을 열어 확인합니다. 컨트롤러는 부모의 ‹cgroup.subtree_control›로 켜며, 자기 프로세스가 있는 비루트 cgroup은 하위로 켤 수 없습니다(no internal process 규칙). systemd 252부터 v1 전용 옵션(‹CPUShares=›, ‹MemoryLimit=› 등)은 deprecated이며 v2에서는 ‹CPUWeight=›, ‹MemoryMax=›를 씁니다 (2026-11 기준 문서).

### 이미지와 격리의 한계

이미지는 읽기 전용 레이어를 **overlayfs**로 쌓습니다. ‹lowerdir›(읽기 전용 스택), ‹upperdir›(컨테이너의 쓰기 레이어), ‹merged›(보이는 결과)이며, 하위 파일을 수정하면 파일 전체가 upper로 복사(copy-up)되고 삭제는 whiteout 표식으로 기록됩니다. 그래서 큰 파일의 일부 수정이 느리고, 컨테이너를 지우면 쓰기 레이어가 사라지니 영속 데이터는 볼륨에 둡니다.

보안은 겹겹으로 쌓습니다. capability를 기본 세트에서 더 줄이고(‹--cap-drop ALL›로 시작해 필요한 것만 추가), seccomp로 시스템콜을 거르고, ‹no-new-privileges›, 읽기 전용 루트, ‹/proc›의 일부 경로 마스킹을 씁니다. 그래도 커널은 하나이므로 커널 취약점은 곧 호스트 탈출 경로입니다. 신뢰할 수 없는 고객 코드를 돌리는 멀티테넌트에서는 VM이나 microVM, 사용자 공간 커널 샌드박스를 추가 층으로 고려합니다. 2018년 공개된 Meltdown은 비순차 실행으로 커널 메모리를 읽는 공격이었고, 격리의 가정이 하드웨어까지 내려간다는 사례입니다.`,
      code: `# 일반 사용자로 새 user+pid+mount+uts namespace 안의 셸을 연다.
# (일부 배포판은 비특권 user namespace를 막아 두었다. 실패하면 sudo unshare ... 로 시도)
unshare --user --map-root-user --pid --fork --mount-proc --uts bash

# --- 아래는 새 셸 안에서 ---
hostname sandbox          # 이 namespace 안의 호스트 이름만 바뀐다
echo $$                   # 1  (이 namespace의 첫 프로세스)
ps -ef                    # 이 pid namespace의 프로세스만 보인다
id -u                     # 0  (밖에서는 일반 사용자로 사상된다)
ls -l /proc/self/ns/pid   # 호스트 셸에서 본 값과 inode 번호가 다르다
cat /proc/self/uid_map    # "0 <호스트 UID> 1"

# --fork 를 빼면 unshare 자신은 옛 pid namespace에 남고 첫 자식이 PID 1 이 된다.
# 그 자식이 끝나면 namespace의 init 이 죽어 이후 fork 가 ENOMEM 으로 실패한다.`,
      codeLang: `bash`,
      key: [
        `컨테이너는 namespace(시야) + cgroup(양) + capability/seccomp/LSM(권한) + overlayfs 루트의 조합이며 호스트 커널을 공유한다.`,
        `PID namespace의 PID 1은 핸들러 없는 시그널을 무시한다. exec 형식, init(tini/--init), 앱의 SIGTERM 핸들러가 필요하다.`,
        `메모리 하드 한도(memory.max)는 OOM kill을 일으키고 memory.high는 kill 없이 스로틀링만 한다. 증거는 memory.events의 oom_kill 카운터이며, CPU 한도의 증거는 cpu.stat의 nr_throttled이다.`,
        `overlayfs는 읽기 전용 lower와 쓰기 upper를 합치고, 수정은 copy-up, 삭제는 whiteout이다. 영속 데이터는 볼륨에 둔다.`,
        `신뢰할 수 없는 코드의 멀티테넌트 격리는 컨테이너만으로 충분하지 않다. VM·microVM 같은 층을 더한다.`
      ],
      pitfalls: [
        `컨테이너 안의 free, nproc, /proc/cpuinfo를 한도라고 믿는다. 많은 도구가 호스트 값을 보여 준다.`,
        `컨테이너를 VM과 같은 수준의 보안 경계로 설명하고 --privileged, docker.sock 마운트, CAP_SYS_ADMIN 부여를 가볍게 승인한다.`,
        `셸 형식 CMD로 sh를 PID 1로 만들어 SIGTERM이 앱에 닿지 않고 매번 유예 시간 뒤 SIGKILL로 끝난다.`,
        `쓰기 레이어(overlay)에 대용량·영속 데이터를 쓰다가 컨테이너 교체 때 데이터를 잃거나 성능이 떨어진다.`
      ]
    },
    {
      title: `통합 사례: 주기적으로 죽고 느려지는 컨테이너 API 진단`,
      body: `의뢰 상황: 중소 이커머스 고객사가 VM 한 대(vCPU 8, RAM 16GB)에서 docker compose로 주문 API를 운영합니다. 증상은 세 가지입니다. 세일 시간대 p99 지연이 4초까지 오르고, 하루 2~3번 API 컨테이너가 재시작(종료 코드 137)되며, 배포 때마다 ‹docker stop›이 10초 걸리고 진행 중 요청이 끊깁니다. 최근에는 ‹df›도 95%입니다. 고객은 "서버 사양을 올려 달라"고 요청했습니다. 아래는 이 모듈의 도구를 순서대로 쓰는 예시이고, 수치는 설명을 위한 가상 값입니다.

### 1단계: 범위와 기준선 합의

진단 전에 접근 범위(읽기 전용 계정, 작업 가능 시간), 환경 정보(‹uname -r›, ‹/etc/os-release›, cgroup v1/v2, compose 파일, 컨테이너 한도), 기존 모니터링 유무를 확인하고 증상이 있었던 시각 3건을 받습니다. 변경은 진단 보고서에 동의받은 뒤에 합니다. 기준선으로 첫 60초 점검 결과를 파일로 저장합니다.

### 2단계: 증거 수집과 가설

호스트 전체는 한가합니다. ‹vmstat›의 r은 1~3, wa는 낮고 호스트의 MemAvailable은 넉넉합니다. 그런데 API 컨테이너의 cgroup을 열어 보면 사정이 다릅니다 (코드 참고).

- ‹memory.max›는 1 GiB인데 ‹memory.events›의 ‹oom_kill›이 7이고 ‹journalctl -k›에는 ‹Memory cgroup out of memory›가 찍혀 있습니다. 호스트 OOM이 아니라 **컨테이너 한도 OOM**입니다.
- ‹cpu.max›는 ‹200000 100000›(2 CPU)인데 ‹nr_throttled›/‹nr_periods›가 약 38%입니다. 평균 사용률은 낮은데 스로틀이 잦으니 레슨 2의 계산처럼 순간 병렬도가 문제입니다.
- 가설: 앱 서버가 워커 수를 호스트 코어 수 기준(코어×2+1 = 17개)으로 만들었다. 컨테이너 안의 ‹nproc›은 쿼터가 아니라 호스트 코어 수를 보여 주는 일이 흔합니다. 워커 하나의 RSS가 ‹/proc/PID/status›로 약 120 MiB면 17×120 = 약 2 GiB로 1 GiB 한도를 넘고, 17개 워커가 동시에 달리면 200ms 예산이 12ms 안팎에 바닥납니다.
- 종료 지연: compose의 ‹command›가 ‹sh -c "... | tee ..."› 형태라 sh가 PID 1이고, SIGTERM이 앱에 닿지 않아 10초 뒤 SIGKILL됩니다 (레슨 7).
- 디스크: 컨테이너 로그가 기본 json-file 드라이버로 로테이션 없이 커지고(기본값에서는 크기 제한이 없어 직접 지정해야 함), 과거에 누군가 ‹rm›으로 지운 파일을 프로세스가 계속 열고 있습니다 (‹lsof +L1›).

### 3단계: 수정 계획 (작은 변경부터, 롤백 가능하게)

1. 워커 수를 4로 고정하고 설정에 근거를 남깁니다. 기준은 워커당 RSS × 4 + 여유(캐시·버퍼)가 한도의 80% 미만입니다.
2. 메모리 한도를 1.5 GiB로 올리고 ‹memory.high›나 알림으로 "한도에 닿기 전" 신호를 만듭니다. CPU 쿼터는 워커 수에 맞추거나 쿼터 대신 가중치만 두는 방안을 비교해, 이웃 컨테이너 보호와 스로틀 지연이라는 트레이드오프를 고객에게 제시합니다.
3. 시작 명령을 exec 형식으로 바꿔 앱이 PID 1이 되게 하고 SIGTERM 핸들러(진행 요청을 마친 뒤 종료)와 ‹stop_grace_period›를 설정합니다. 로그는 stdout으로만 내보냅니다.
4. 로그 드라이버에 ‹max-size›·‹max-file›을 지정하고, 삭제된 파일을 열고 있는 프로세스를 점검 시간에 재시작합니다.
5. 호스트의 docker 서비스는 ‹systemctl enable›, 저널은 영속화합니다. 재부팅, kill -9, 디스크 풀 시나리오로 복구를 확인합니다.

### 4단계: 인수 기준과 인계

"사양 증설" 대신 측정 가능한 기준으로 닫습니다. 24시간 동안 ‹oom_kill› 증가 0, ‹nr_throttled›/‹nr_periods› 5% 미만, 세일 시간대 p99가 기준선의 절반 이하, ‹docker stop› 소요 3초 이내, 로그 로테이션 후 ‹df› 안정. 인계물은 변경 내역(설정 diff), 런북("137이 뜨면", "느릴 때" 결정 트리), 알림 규칙(oom_kill 증가, PSI memory full), 남은 위험(메모리 누수 가능성, 단일 VM)입니다. 증설은 마지막 선택지이며 데이터로 정당화될 때만 제안합니다.`,
      code: `#!/usr/bin/env bash
# 컨테이너 안(또는 nsenter로 진입한 뒤)에서 cgroup v2 상태를 한 번에 수집한다. 읽기 전용.
cg=/sys/fs/cgroup
echo "== 환경"; uname -r; stat -fc %T "$cg"          # cgroup2fs 이면 v2
echo "== 메모리"
cat "$cg/memory.max" "$cg/memory.current"
grep -E '^(anon|file) ' "$cg/memory.stat"            # anon 이 한도에 붙는지, file 캐시인지 구분
cat "$cg/memory.events"                              # oom_kill 카운터
echo "== CPU"
cat "$cg/cpu.max"
grep -E 'nr_periods|nr_throttled|throttled_usec' "$cg/cpu.stat"
echo "== 압력(PSI)"
cat "$cg/memory.pressure" "$cg/cpu.pressure"
echo "== 코어 수 착시"; nproc; cat "$cg/cpu.max"      # nproc 은 호스트 코어 수일 수 있다
echo "== 프로세스"
ps -o pid,ppid,rss,nlwp,args -p 1                    # PID 1 이 앱인지 sh 인지 init 인지
ps -eo pid,ppid,rss,nlwp,args --sort=-rss | head -n 8   # RSS 상위 프로세스와 스레드 수(nlwp)`,
      codeLang: `bash`,
      key: [
        `진단 순서: 범위·기준선 합의, 증거 수집(USE, cgroup 파일, 커널 로그), 가설 검증, 작은 변경과 롤백 계획, 측정 가능한 인수 기준, 인계.`,
        `컨테이너 OOM은 호스트가 아니라 cgroup 한도 문제다. memory.events의 oom_kill과 Memory cgroup out of memory 로그로 확인한다.`,
        `평균 사용률이 낮아도 순간 병렬도가 크면 CPU 쿼터가 스로틀링한다. nr_throttled/nr_periods로 본다.`,
        `워커·스레드 수가 호스트 코어 수를 기준으로 정해지는 런타임이 많다. 한도와 맞춰 고정한다.`,
        `사양 증설은 마지막 선택지이며 변경은 한 번에 하나, 롤백 가능하게, 전후 수치와 함께 보고한다.`
      ],
      pitfalls: [
        `고객의 사양 증설 요청을 그대로 수행해 원인(워커 수, 한도, PID 1)을 그대로 두고 비용만 늘린다.`,
        `한 번에 설정 다섯 개를 바꿔 어떤 변경이 효과가 있었는지, 무엇이 부작용을 냈는지 알 수 없게 만든다.`,
        `호스트의 free와 top만 보고 컨테이너 문제를 놓친다. 컨테이너 cgroup 파일을 열어야 한다.`,
        `수정 후 재부팅, kill -9, 디스크 풀 같은 복구 시나리오를 시험하지 않고 인계한다.`
      ]
    }
  ],
  labs: [
    {
      title: `실습 1: strace와 /proc으로 프로세스와 메모리를 숫자로 해부하기`,
      scenario: `신입 팀원이 "시스템콜은 공짜다", "메모리는 malloc한 만큼 바로 잡힌다", "좀비는 kill -9로 지우면 된다"라고 주장합니다. 본인 리눅스 환경(Ubuntu VM, 또는 systemd와 cgroup v2 설정을 확인한 WSL2)에서 세 주장을 직접 측정해 1쪽짜리 결과표로 반박하세요. 말이 아니라 숫자와 명령 출력으로 설득하는 연습이며, 운영 서버가 아니라 본인 VM에서만 실행합니다.`,
      steps: [
        `환경을 기록합니다. uname -r, /etc/os-release, vCPU와 RAM, stat -fc %T /sys/fs/cgroup 결과를 env.txt에 저장합니다.`,
        `1바이트씩 100만 번 os.write(1, b"x")를 호출하는 파이썬 스크립트(a.py)와, 64 KiB 버퍼에 모아 쓰는 스크립트(b.py)를 만들고 출력은 /dev/null로 보냅니다. time으로 각각의 실행 시간을 재고 strace -c -f 로 write 호출 수를 기록합니다.`,
        `레슨 3의 mmap 코드를 실행해 start, after mmap, touched half 세 시점의 VmSize와 VmRSS를 표로 만듭니다.`,
        `레슨 3 코드의 MAP_PRIVATE 익명 매핑(512 MiB)을 부모가 전부 건드린 뒤 fork하고, 자식이 sleep하는 동안 /proc/자식PID/smaps_rollup 의 Rss, Pss, Shared_Dirty, Private_Dirty를 기록합니다. 그다음 자식이 절반(256 MiB)을 쓰게 하고 다시 기록해 COW 전후를 비교합니다. (파이썬 mmap의 기본값 MAP_SHARED로 만들면 COW가 아니라 진짜 공유가 되어 결과가 달라지니 비교 실험으로 한 번 더 해 봅니다.)`,
        `/usr/bin/time -v 로 레슨 3 코드를 실행해 Minor page faults 수를 확인하고, 계산한 값(페이지 수 = 256 MiB / 4 KiB)과 비교합니다. /sys/kernel/mm/transparent_hugepage/enabled 값을 함께 기록합니다(always면 huge page 때문에 폴트 수가 훨씬 적을 수 있습니다).`,
        `부모가 자식을 wait하지 않고 60초간 자는 스크립트를 만들어 ps -o pid,ppid,stat,cmd 에서 Z 상태를 확인합니다. 좀비에 kill -9를 보내 효과가 없음을 기록하고, 부모를 종료한 뒤 좀비가 사라지는 것을 확인합니다.`,
        `ls /proc/PID/fd | wc -l 과 /proc/PID/limits 의 Max open files 를 확인하고, ulimit -n 을 64로 낮춘 셸에서 파일을 100개 여는 스크립트를 실행해 EMFILE 오류를 재현합니다.`,
        `결과표(주장, 측정값, 해석, 사용한 명령) 1쪽을 results.md로 정리합니다.`
      ],
      accept: [
        `a.py와 b.py의 write 시스템콜 횟수가 strace -c 출력으로 제시되고, b.py는 20회 이하이며 a.py는 약 100만 회이다. 두 실행 시간의 배수가 표에 있다.`,
        `mmap 직후 VmSize 증가량은 512 MiB의 ±5% 이내이고 VmRSS 증가량은 10 MiB 미만이며, 절반을 건드린 뒤 VmRSS 증가량은 256 MiB의 ±5% 이내이다.`,
        `자식이 쓰기 전에는 Private_Dirty가 20 MiB 미만이고 Pss가 Rss의 약 절반이며, 256 MiB를 쓴 뒤에는 Private_Dirty 증가량이 256 MiB의 ±10% 이내이고 Pss 증가량은 약 128 MiB(±20%)임이 기록되어 있다. Pss 증가량이 쓴 양의 절반인 이유(나머지 절반의 공유 페이지는 부모와 나눠 계산)가 한 문장으로 설명되어 있다.`,
        `ps 출력에 STAT가 Z인 줄이 포함되고, kill -9 후에도 남아 있다는 것과 부모 종료 후 사라졌다는 것이 각각 명령 출력으로 증명된다.`,
        `EMFILE(Too many open files) 오류 메시지와 ulimit -n 값이 results.md에 함께 있다.`
      ],
      stretch: `같은 실험을 C로 다시 작성해 perf stat -e page-faults,context-switches 로 비교하고, THP를 켠 경우와 끈 경우(/sys/kernel/mm/transparent_hugepage/enabled)에 minor fault 수가 어떻게 달라지는지 표로 만드세요.`
    },
    {
      title: `실습 2: systemd 서비스 만들기와 장애 훈련`,
      scenario: `고객사가 nohup으로 띄워 쓰던 작은 HTTP API를 systemd 서비스로 이전해 달라고 합니다. 권한은 최소로, 죽으면 자동으로 살아나고, 종료할 때는 진행 중 요청을 마치며, 메모리 폭주에도 호스트가 살아 있어야 합니다. 본인 VM에서 유닛을 작성하고 장애 훈련으로 증명하세요. WSL2를 쓴다면 /etc/wsl.conf 에 systemd를 켜는 설정이 필요하니 가능하면 Ubuntu VM을 권합니다.`,
      steps: [
        `systemctl is-system-running 과 systemctl --version 을 기록합니다. 환경이 systemd로 부팅되지 않았다면 먼저 해결합니다.`,
        `/opt/demo/app.py 를 작성합니다. 포트 8080에서 응답하고, /leak 요청마다 메모리를 20 MiB씩 할당해 전역 리스트에 보유하며(0으로 채운 bytearray는 지연 할당이라 RSS가 안 늘 수 있으니 b"x" * N 처럼 실제 값으로 채웁니다), /crash 요청에서는 즉시 종료합니다. SIGTERM을 받으면 draining 로그를 남기고 2초 뒤 정상 종료합니다.`,
        `시스템 전용 계정 demo를 홈 디렉터리 없이 만들고(useradd --system --no-create-home), 레슨 5의 유닛을 참고해 서비스 파일을 작성합니다. 시작 판정은 exec, 재시작은 실패 시에만 2초 간격, 종료 유예는 10초, 메모리 상한은 200M(MemorySwapMax=0도 함께 두어야 swap으로 밀려나지 않고 한도에서 OOM이 납니다), 권한 상승 금지와 파일 시스템 읽기 전용, 전용 tmp를 넣습니다. 유닛 파일에는 같은 줄 주석을 쓰지 않습니다. 그다음 설정을 다시 읽히고 바로 시작하도록 등록합니다(daemon-reload, enable --now).`,
        `훈련 A: kill -9 로 메인 프로세스를 죽이고 journalctl -u demo 의 타임스탬프로 재시작 간격을 기록합니다.`,
        `훈련 B: systemctl stop demo 를 실행하고 draining 로그가 남았는지, 종료까지 걸린 시간이 몇 초인지 기록합니다.`,
        `훈련 C: /leak 을 반복 호출해 MemoryMax를 넘깁니다. journalctl -k 의 OOM 로그, cgroup의 memory.events 의 oom_kill 값, 서비스 자동 복구 여부를 기록합니다.`,
        `훈련 D: ExecStart 경로를 일부러 틀리게 하고 Type=simple 과 Type=exec 에서 systemctl start 의 종료 코드와 status 출력이 어떻게 다른지 표로 만듭니다. RestartSec를 500ms로 낮추고 즉시 종료하는 버전으로 시작 제한(start-limit-hit)을 재현한 뒤 systemctl reset-failed 로 풉니다. (RestartSec=2 에서는 6번째 시작이 10초 경계에 걸려 기본 제한인 10초 안 5회에 걸리지 않을 수 있습니다.)`,
        `systemd-analyze security demo.service 의 점수를 샌드박스 옵션 추가 전후로 기록하고, systemctl cat 과 systemd-analyze verify 출력을 첨부합니다.`
      ],
      accept: [
        `kill -9 후 서비스가 RestartSec(2초)에서 ±1초 이내에 active (running) 으로 돌아온 것이 journalctl 출력으로 확인된다.`,
        `systemctl stop 시 SIGTERM 수신 로그(draining)가 남고 종료 소요 시간이 TimeoutStopSec 이내이다.`,
        `MemoryMax 초과 시 memory.events 의 oom_kill 이 1 이상 증가하고, 호스트의 다른 프로세스는 영향을 받지 않았으며 서비스가 자동 복구되었다.`,
        `잘못된 경로에서 Type=simple 과 Type=exec 의 start 결과 차이가 표로 정리되어 있다. (시점에 따라 달라질 수 있으니 관찰한 그대로 기록)`,
        `systemd-analyze security 점수가 샌드박스 옵션 추가 전후로 기록되어 있고 추가 후 노출 수준 값이 낮아졌다.`
      ],
      stretch: `socket activation(demo.socket)으로 포트를 systemd가 먼저 받아 두게 하고 재시작 중에도 연결이 유실되지 않는지 측정하세요. 백업 스크립트를 timer 유닛으로 옮기고 Persistent=true 동작도 확인합니다.`
    },
    {
      title: `실습 3 (납품형 미니 프로젝트): 미니 컨테이너 격리 시연과 장애 재현 키트, 진단 보고서`,
      scenario: `고객사 개발팀이 "컨테이너가 왜 죽고 왜 느려지는지 감이 없다"며 인수인계 자료를 요청했습니다. 납품물은 (1) 리눅스 격리 원리를 보여 주는 시연 스크립트, (2) 메모리 OOM과 CPU 스로틀링을 재현하는 키트, (3) 증거 기반 진단 보고서와 런북입니다. 본인 VM(vCPU 2개 이상)에서 한 번의 명령으로 재현되게 만들고, 처음 보는 사람이 README만 읽고 따라 할 수 있는 수준으로 다듬어 고객에게 넘기듯 납품하세요.`,
      steps: [
        `저장소 구조를 만듭니다. minibox/ 아래에 README.md, demo.sh, workloads/(mem_grow.py, cpu_burst.py, latency_probe.py), runbook.md, report.md, results/ 를 둡니다. README에는 요구 환경, 실행법, 본인 VM에서만 실행하라는 안전 고지를 씁니다.`,
        `workloads 를 작성합니다. mem_grow.py 는 매초 16 MiB를 할당해 실제로 건드리며 누적량을 출력합니다. cpu_burst.py 는 N개 프로세스가 busy loop를 도는 구조입니다. latency_probe.py 는 5ms sleep을 반복하며 실제 경과 시간을 재고 종료 시 p50과 p99를 출력합니다.`,
        `demo.sh 파트 1(namespace)을 작성합니다. 레슨 7의 unshare 명령으로 user, pid, mount, uts namespace 안의 셸을 열고, 안쪽에서 본 PID 1과 호스트에서 본 같은 프로세스의 PID, /proc/self/ns 링크의 inode 비교, uid_map 내용을 results/ns.txt 에 저장합니다.`,
        `demo.sh 파트 2(OOM): sudo systemd-run --scope -p MemoryMax=128M -p MemorySwapMax=0 bash -c '...' 로 scope 안에서 bash를 띄우고, 그 bash가 mem_grow.py 를 실행해 종료 코드($?)를 받은 뒤 같은 bash 안에서 cat /sys/fs/cgroup$(cut -d: -f3 /proc/self/cgroup)/memory.events 를 읽어 results/oom.txt 에 저장하게 합니다. scope는 안의 프로세스가 모두 끝나면 cgroup이 사라져서 밖에서는 memory.events 를 읽을 수 없습니다.`,
        `demo.sh 파트 3(CPU): 같은 방식으로 CPUQuota=100% scope 안의 bash에서 cpu_burst.py(프로세스 4개)와 latency_probe.py 를 함께 돌리고 종료 직전에 cpu.stat 을 읽습니다. 쿼터 없는 기준선 실행도 한 번 합니다. nr_throttled 와 두 실행의 p50/p99 표를 results/throttle.txt 에 저장합니다. systemd-run --user 는 cpu 컨트롤러가 위임되어 있어야 쿼터가 적용되니 확인하거나 sudo를 씁니다.`,
        `report.md 를 씁니다. 증상, 증거(결과 파일과 줄 번호 인용), 원인, 조치안과 트레이드오프, 재발 방지, 남은 위험 순서로 구성하고 환경(커널, cgroup 버전, 날짜)을 맨 앞에 적습니다.`,
        `runbook.md 를 씁니다. "컨테이너가 137로 죽을 때", "지연이 튈 때", "docker stop 이 10초 걸릴 때" 세 가지 결정 트리와 읽기 전용 확인 명령 목록, 운영 서버에서 하면 안 되는 일 목록을 넣습니다.`,
        `새 계정이나 새 VM에서 README만 보고 ./demo.sh 를 실행해 재현되는지 확인하고 걸린 시간을 report.md 에 기록합니다.`
      ],
      accept: [
        `./demo.sh 한 번으로 results/ns.txt, oom.txt, throttle.txt 가 생성되고 비어 있는 파일이 없다.`,
        `oom.txt 에 memory.events 의 oom_kill 이 1 이상이고 종료 코드 137이 함께 기록되어 있다.`,
        `throttle.txt 에서 nr_throttled 가 0보다 크고, 쿼터 적용 시 p99 지연이 기준선의 3배 이상이며, 쿼터를 해제한 기준선에서는 재현되지 않는다.`,
        `report.md 의 모든 원인 주장에 근거 파일과 줄 번호 또는 명령 출력이 연결되어 있고 환경 정보(커널, cgroup 버전, 날짜)가 있다.`,
        `새 계정(또는 새 VM)에서 README만으로 20분 안에 재현했다는 기록이 있다.`
      ],
      stretch: `같은 한도를 docker run --memory=128m --cpus=1 로 재현해 컨테이너 cgroup 파일(memory.max, cpu.max)의 값이 위 수동 실험과 어떻게 대응하는지 표로 만들고, PSI 트리거(memory some 임계값)로 OOM 직전에 경보를 보내는 스크립트를 추가하세요.`
    }
  ],
  quiz: [
    {
      q: `[상황] 고객사 API 컨테이너(메모리 한도 512Mi)가 하루 몇 번씩 종료 코드 137로 재시작됩니다. 컨테이너 안에서 free를 치면 호스트의 16GB가 보이고, 고객은 "호스트에 swap을 추가하면 되지 않느냐"고 묻습니다. 가장 먼저 할 일은 무엇입니까?`,
      choices: [
        `호스트에 swap 2GB를 추가한다. 호스트 메모리가 늘면 컨테이너도 OOM을 피한다.`,
        `컨테이너 cgroup의 memory.events(oom_kill), memory.current, memory.stat을 확인해 한도 도달 여부를 증명하고, 시간 순으로 어떤 메모리(워커 수, 캐시, 누수)가 늘었는지 추적한다.`,
        `oom_score_adj를 -1000으로 설정해 OOM killer가 이 프로세스를 건너뛰게 한다.`,
        `vm.overcommit_memory를 1로 바꿔 할당이 항상 성공하게 만든다.`
      ],
      answer: 1,
      why: `컨테이너의 137은 대개 cgroup 한도(memory.max)에서 발생한 OOM kill이므로 컨테이너 자기 cgroup의 oom_kill 카운터와 사용량 구성(anon/file)이 증거입니다. 호스트 swap(A)이나 overcommit(D)은 cgroup 한도와 무관하고, -1000(C)은 문제를 숨긴 채 다른 프로세스가 대신 죽거나 할당이 막히게 만듭니다.`
    },
    {
      q: `[로그] 컨테이너 cgroup에서 읽은 값입니다. 모니터링의 평균 CPU 사용량은 한도 대비 약 30%인데 p99 지연이 자주 튑니다.

$ cat /sys/fs/cgroup/cpu.max
200000 100000
$ cat /sys/fs/cgroup/cpu.stat
usage_usec 1105201873
nr_periods 18420
nr_throttled 7311
throttled_usec 366124507

가장 타당한 해석은 무엇입니까?`,
      choices: [
        `평균 사용량이 낮으므로 CPU는 병목이 아니고 원인은 DB일 가능성이 높다.`,
        `nr_periods가 크다는 것은 cgroup이 오래 살아 있었다는 뜻일 뿐 지연과는 관계없다.`,
        `cpu.max를 max로 바꾸면 쿼터와 무관하게 항상 지연이 개선되므로 DB를 먼저 의심할 이유가 없다.`,
        `순간적으로 여러 스레드가 동시에 달려 100ms 주기마다 주어진 200ms 예산을 일찍 소진하고(약 40%의 주기에서) 남은 구간 동안 멈추는 스로틀링이 지연의 원인이다.`
      ],
      answer: 3,
      why: `nr_throttled / nr_periods = 7311 / 18420 은 약 40%입니다. cpu.max는 주기마다의 예산이라 평균이 낮아도 순간 병렬도가 높으면 예산이 일찍 바닥나 전체 스레드가 정지합니다. 평균 사용량만 보고 CPU를 배제하는 것(A)이 가장 흔한 오진입니다.`
    },
    {
      q: `[상황] 배포 스크립트는 systemctl start orders 의 종료 코드가 0이면 성공으로 보고합니다. 이번 릴리스에서 바이너리 경로가 틀려 서비스가 곧바로 status=203/EXEC로 실패했는데 배포는 성공으로 끝났습니다. 유닛은 Type을 지정하지 않았습니다(simple이 기본). 가장 적절한 개선은 무엇입니까?`,
      choices: [
        `Type=exec로 바꿔 execve 성공까지 start가 기다리게 하고, 배포 후 is-active 확인 또는 헬스체크를 추가한다.`,
        `Restart=always로 바꿔 성공할 때까지 반복 시도하게 한다.`,
        `TimeoutStartSec를 길게 늘려 시작 판정을 더 오래 기다린다.`,
        `Type=forking으로 바꾼다. 데몬 방식이 가장 안정적이다.`
      ],
      answer: 0,
      why: `Type=simple은 프로세스를 fork한 직후 시작 성공으로 간주해 execve 실패나 없는 User=를 start 결과에 반영하지 못합니다. exec는 실제 실행 성공까지 기다립니다. Restart(B)는 잘못된 경로를 고치지 못하고 시작 제한에 걸릴 뿐이며, 타임아웃(C)은 판정 시점과 무관합니다.`
    },
    {
      q: `[코드] 크기가 제한된 큐의 put 메서드입니다. 무엇이 잘못되었습니까?

def put(self, x):
    with self.lock:
        if len(self.q) >= self.cap:
            self.not_full.wait()
        self.q.append(x)
        self.not_empty.notify()`,
      choices: [
        `lock을 잡은 채 wait()를 호출하면 항상 교착 상태가 된다.`,
        `notify() 대신 notify_all()을 써야 해서 put이 영원히 깨어나지 못한다.`,
        `깨어난 뒤 다른 생산자가 먼저 자리를 채웠거나 가짜 깨움이 있어도 조건을 다시 검사하지 않아 용량을 넘겨 append할 수 있다. if를 while로 바꿔야 한다.`,
        `deque는 스레드 안전하지 않아서 lock이 있어도 append가 손상될 수 있다.`
      ],
      answer: 2,
      why: `조건 변수의 wait는 깨어난 시점에 조건이 참임을 보장하지 않으므로 while로 다시 검사해야 합니다. wait는 내부에서 락을 풀고 잠들기 때문에 교착이 되지 않고(A), notify_all은 필수가 아니며(B), lock으로 보호된 deque 접근은 안전합니다(D).`
    },
    {
      q: `[코드와 증상] 이미지 변환 서비스가 요청마다 작업 프로세스를 띄웁니다. 며칠 뒤 ps에 좀비가 수천 개 쌓였습니다.

def spawn_worker():
    pid = os.fork()
    if pid == 0:
        os.execvp("convert-job", ["convert-job"])
    return pid          # 부모는 pid를 버리고 요청 처리를 계속한다

$ ps -eo pid,ppid,stat,cmd | grep convert
4121   980 Z   [convert-job] <defunct>
4122   980 Z   [convert-job] <defunct>

올바른 진단과 대응은 무엇입니까?`,
      choices: [
        `좀비가 메모리를 차지하는 누수이므로 kill -9 로 좀비를 하나씩 정리하는 크론을 추가한다.`,
        `PID 1이 입양해 정리하므로 문제가 아니다. 시스템을 재부팅할 때까지 둔다.`,
        `부모(PID 980)가 자식의 종료 상태를 wait 계열로 회수하지 않아 생긴 좀비다. SIGCHLD 처리나 waitpid로 회수하도록 부모 코드를 고친다.`,
        `ulimit -u 로 프로세스 수 한도를 높여 좀비가 쌓일 공간을 늘린다.`
      ],
      answer: 2,
      why: `좀비는 이미 종료됐지만 부모가 종료 상태를 읽어 가지 않은 프로세스입니다. kill -9(A)는 죽은 프로세스에 효과가 없습니다. PID 1은 부모가 먼저 죽은 고아를 입양하지만 부모(980)가 살아 있는 한 입양되지 않고(B), 한도를 높이면(D) 고갈 시점만 늦춥니다.`
    },
    {
      q: `[상황] 고객 서버에서 df -h /var 는 100%인데 du -sh /var 는 38G이고 파티션 크기는 100G입니다. 어제 담당자가 큰 로그 파일을 rm으로 지웠다고 합니다. 가장 가능성 높은 원인과 조치는 무엇입니까?`,
      choices: [
        `삭제됐지만 프로세스가 열고 있는 파일이 공간을 잡고 있다. lsof +L1 로 찾아 해당 프로세스를 재시작하거나 /proc/PID/fd 의 파일을 비운다.`,
        `파일 시스템이 손상되었으므로 즉시 마운트된 상태에서 fsck -y 를 실행한다.`,
        `du가 틀렸고 df만 맞으므로 /var 아래를 일괄 삭제해 공간을 확보한다.`,
        `메모리 부족으로 page cache가 디스크 공간으로 잡혀 있으므로 free 를 점검한다.`
      ],
      answer: 0,
      why: `unlink는 이름만 지우고, 열린 fd가 남아 있으면 데이터 블록은 반환되지 않아 df와 du가 어긋납니다. 마운트된 파일 시스템에 fsck를 돌리는 것(B)은 위험하고 원인이 아니며, 일괄 삭제(C)는 데이터 손실을 부를 뿐입니다.`
    },
    {
      q: `[로그] 장애 시점의 지표입니다. 서버는 8코어입니다.

$ uptime
 14:02:11 up 41 days, load average: 38.2, 35.9, 30.1
$ vmstat 1 3
procs ---------memory-------- --swap-- ---io--- -system- ------cpu-----
 r  b  swpd   free   buff  cache  si so   bi    bo   in   cs us sy id wa st
 1 34     0 812344  91204 5120044  0  0 1840  9210  900 2100  2  1 12 85  0
 0 36     0 811980  91204 5120044  0  0 1802  9477  881 2054  1  1 10 88  0

고객은 코어를 32개로 늘려 달라고 합니다. 가장 적절한 대응은 무엇입니까?`,
      choices: [
        `로드가 코어 수의 약 5배이므로 요청대로 코어를 증설한다.`,
        `nice 값을 올려 애플리케이션의 우선순위를 낮춘다.`,
        `D 상태에 빠진 프로세스를 kill -9 로 모두 정리한다.`,
        `r은 낮고 b와 wa가 높으므로 로드는 I/O 대기(D 상태) 때문이다. iostat -x, pidstat -d, NFS 같은 원격 마운트와 스토리지 지연을 조사한다.`
      ],
      answer: 3,
      why: `로드 애버리지에는 uninterruptible sleep이 포함됩니다. r이 1~0이고 b가 34~36, wa가 85% 이상이면 CPU가 아니라 I/O 대기가 병목이라 코어 증설(A)은 효과가 없습니다. D 상태는 SIGKILL로도 즉시 깨어나지 않으므로 kill -9(C)도 해법이 아닙니다.`
    },
    {
      q: `[상황] 고객이 Python 웹 서비스를 443 포트로 직접 서비스해 달라고 합니다. 보안 점검에서 root 실행은 금지입니다. systemd로 운영한다면 가장 적절한 구성은 무엇입니까?`,
      choices: [
        `root로 실행하되 ProtectSystem만 켜서 피해 범위를 줄인다.`,
        `전용 일반 사용자(User=)로 실행하고 AmbientCapabilities=CAP_NET_BIND_SERVICE 와 같은 값의 CapabilityBoundingSet 으로 필요한 capability 하나만 준다.`,
        `Python 실행 파일에 chmod u+s 를 걸어 setuid-root로 만든다.`,
        `setcap으로 시스템의 python3 바이너리에 CAP_NET_BIND_SERVICE를 부여한다.`
      ],
      answer: 1,
      why: `전용 사용자와 필요한 capability 하나가 최소 권한 원칙입니다. root(A)는 요구 위반이고, setuid-root(C)는 어떤 스크립트든 root로 돌리는 공격 표면이며, 공용 python3에 capability를 주는 것(D)은 그 인터프리터로 실행되는 모든 코드에 권한을 주는 셈입니다.`
    },
    {
      q: `[설정과 증상] 컨테이너 종료가 매번 느립니다.

# Dockerfile (일부)
ENTRYPOINT ["sh", "-c", "python /app/server.py 2>&1 | tee -a /var/log/app.log"]

$ time docker stop orders
orders
real    0m10.2s
$ docker inspect orders --format '{{.State.ExitCode}}'
137

왜 매번 10초 걸리고 종료 코드가 137입니까?`,
      choices: [
        `PID 1인 sh가 SIGTERM 핸들러가 없어 신호를 무시하고 앱에 전달하지도 않아, 유예 시간(기본 10초) 뒤 SIGKILL이 갔기 때문이다. exec 형식으로 앱을 PID 1로 두거나 init을 쓰고 앱이 SIGTERM을 처리하게 한다.`,
        `docker 데몬이 느려서 종료 요청이 늦게 전달된다.`,
        `앱의 메모리 누수로 OOM killer가 작동했다. 137은 항상 OOM을 뜻한다.`,
        `tee가 로그를 쓰느라 디스크 I/O를 기다려 SIGTERM 처리가 늦어졌다.`
      ],
      answer: 0,
      why: `PID namespace의 PID 1은 핸들러를 설치하지 않은 시그널을 무시하며, sh는 파이프라인 구성에서 자식에게 SIGTERM을 넘겨주지 않습니다. 137은 128+9, 즉 SIGKILL이라는 뜻일 뿐 OOM 전용 코드가 아닙니다(C). 정확히 약 10초라는 것(docker stop 기본 유예 시간, 2026-11 기준)이 타임아웃 후 강제 종료의 단서입니다.`
    },
    {
      q: `[상황] 고객이 코딩 교육 플랫폼을 만들며 수강생이 제출한 임의의 코드를 서버에서 실행하려 합니다. 컨테이너마다 namespace와 cgroup을 쓰니 VM과 같은 수준으로 안전하다고 설명합니다. 가장 적절한 조언은 무엇입니까?`,
      choices: [
        `맞다. namespace가 모든 자원을 격리하므로 추가 조치가 필요 없다.`,
        `user namespace만 켜면 커널 취약점도 막히므로 충분하다.`,
        `컨테이너는 호스트 커널을 공유해 커널 취약점이 곧 탈출 경로가 된다. 신뢰할 수 없는 코드는 VM·microVM이나 사용자 공간 커널 샌드박스를 더하고, seccomp·capability 최소화·cgroup 한도·네트워크 격리를 겹쳐 쓴다.`,
        `seccomp 프로파일 하나만 적용하면 VM 수준이 된다.`
      ],
      answer: 2,
      why: `namespace와 cgroup은 커널 위의 구분일 뿐 커널 자체는 하나입니다. 커널 버그나 하드웨어 수준 취약점(Meltdown류)은 컨테이너 경계를 넘을 수 있습니다. user namespace(B)와 seccomp(D)는 좋은 방어층이지만 단독으로 VM 수준의 경계가 되지 않습니다.`
    },
    {
      q: `[로그] 학습자가 PID namespace 실험을 하다 다음을 만났습니다. 무엇이 잘못되었습니까?

$ sudo unshare --pid bash
# ls /
bin boot dev etc home ...
# ls /
bash: fork: Cannot allocate memory`,
      choices: [
        `RAM이 부족하므로 메모리를 증설해야 한다.`,
        `--fork 없이 실행해 bash가 새 namespace에 들어가지 못하고 첫 자식(ls)이 PID 1이 되었다. 그 자식이 끝나 namespace의 init이 죽었으므로 이후 fork가 ENOMEM으로 실패한다. --fork를 붙인다.`,
        `cgroup의 pids.max에 도달해서 fork가 거부되었다.`,
        `ulimit -u 값이 작아서 사용자 프로세스 수 한도에 걸렸다.`
      ],
      answer: 1,
      why: `unshare --pid는 호출한 프로세스 자신이 아니라 이후에 만드는 자식을 새 PID namespace에 넣습니다. 첫 자식이 PID 1(init)이 되고 그것이 종료되면 namespace가 사실상 죽어 fork가 ENOMEM을 돌려줍니다. 메시지는 메모리 부족처럼 보이지만(A) 실제 메모리 문제가 아닙니다.`
    },
    {
      q: `[상황] 설정 파일을 저장하는 서비스가 다음 코드를 씁니다. 정전 후 config.json 이 0바이트로 남았다는 신고가 들어왔습니다.

with open("config.json", "w") as f:
    json.dump(cfg, f)

가장 적절한 수정은 무엇입니까?`,
      choices: [
        `json.dump 뒤에 f.flush()를 추가한다.`,
        `close 뒤에 time.sleep(1)을 넣어 커널이 쓸 시간을 준다.`,
        `ext4 대신 XFS로 파일 시스템을 바꾸면 해결된다.`,
        `같은 디렉터리의 임시 파일에 쓰고 fsync한 뒤 os.replace로 교체하고, 디렉터리도 fsync한다. 이미 있던 파일의 권한과 소유자 유지도 확인한다.`
      ],
      answer: 3,
      why: `open(..., "w")는 열자마자 파일을 0바이트로 잘라 기존 내용을 잃게 합니다. flush는 데이터를 커널 page cache까지만 보낼 뿐 디스크 내구성을 주지 못하고(A), sleep(B)이나 파일 시스템 교체(C)는 원자성과 무관합니다. 임시 파일, fsync, rename, 디렉터리 fsync가 표준 패턴입니다.`
    }
  ],
  refs: [
    {
      title: `Operating Systems: Three Easy Pieces (OSTEP)`,
      url: `https://pages.cs.wisc.edu/~remzi/OSTEP/`,
      kind: `book`,
      why: `가상화·동시성·영속성 3부 구성의 무료 교재(v1.10, 2023-11 기준 표기). 이 모듈 레슨 1~4의 정독 교재로, 스케줄링(MLFQ), 페이징·TLB, 락과 조건 변수, FSCK와 저널링 장을 우선 읽는다.`
    },
    {
      title: `xv6: a simple, Unix-like teaching operating system (rev5)`,
      url: `https://pdos.csail.mit.edu/6.1810/2025/xv6/book-riscv-rev5.pdf`,
      kind: `book`,
      why: `116쪽 분량의 소형 유닉스 커널 해설서(rev5, 2025-09-02 기준). 시스템콜, 페이지 테이블, 트랩, 락, 스케줄링, 파일 시스템이 실제 코드로 어떻게 구현되는지 확인하는 심화 자료.`
    },
    {
      title: `Control Group v2 (Linux kernel documentation)`,
      url: `https://docs.kernel.org/admin-guide/cgroup-v2.html`,
      kind: `doc`,
      why: `memory.max/high/min, cpu.max/weight/stat, pids.max, io.max, no internal process 규칙, delegation, PSI 파일의 정확한 의미와 형식을 담은 1차 문서. 컨테이너 한도 장애 진단의 기준.`
    },
    {
      title: `namespaces(7) - Linux manual page`,
      url: `https://man7.org/linux/man-pages/man7/namespaces.7.html`,
      kind: `doc`,
      why: `8종 namespace와 /proc/PID/ns, clone·unshare·setns의 동작을 정리한 매뉴얼. 컨테이너가 커널 기능의 조합이라는 점을 확인하는 출발점.`
    },
    {
      title: `systemd.service(5): Type, Restart, 종료 순서`,
      url: `https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html`,
      kind: `doc`,
      why: `Type=simple/exec/notify의 차이, Restart 옵션, RestartSec, TimeoutStopSec와 기본 종료 순서(SIGTERM 후 SIGKILL)를 규정하는 공식 문서. 유닛 설계의 기준.`
    },
    {
      title: `systemd.exec(5): 실행 환경과 샌드박스 옵션`,
      url: `https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html`,
      kind: `doc`,
      why: `NoNewPrivileges, ProtectSystem, PrivateTmp, CapabilityBoundingSet, AmbientCapabilities, DynamicUser, StateDirectory 등 서비스 하드닝 옵션의 정의. 분량이 크니 필요한 옵션을 검색해 읽는다.`
    },
    {
      title: `systemd.resource-control(5): 자원 제어와 cgroup 대응`,
      url: `https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html`,
      kind: `doc`,
      why: `MemoryMax, MemoryHigh, MemorySwapMax, CPUQuota, CPUWeight, TasksMax가 cgroup v2의 어떤 파일에 대응하는지와, v1 전용 옵션이 systemd 252 항목에서 deprecated로 표시된 이력(2026-11 기준 문서)을 확인한다.`
    },
    {
      title: `PSI - Pressure Stall Information (Linux kernel documentation)`,
      url: `https://docs.kernel.org/accounting/psi.html`,
      kind: `doc`,
      why: `/proc/pressure/* 의 some/full 의미, avg10·avg60·avg300과 total, poll 트리거 사용법. 사용률이 아닌 막힌 시간을 재는 지표를 이해하는 1차 문서.`
    },
    {
      title: `The USE Method (Brendan Gregg)`,
      url: `https://www.brendangregg.com/usemethod.html`,
      kind: `article`,
      why: `모든 자원에 대해 사용률·포화·오류를 확인하는 병목 탐색 체크리스트의 원문(페이지 표기상 마지막 갱신 2017-08). CPU·메모리·스토리지 I/O·네트워크별 일반 지표 예시가 있고, 리눅스 도구 목록은 같은 저자의 별도 페이지에 있다.`
    },
    {
      title: `Linux Performance (Brendan Gregg)`,
      url: `https://www.brendangregg.com/linuxperf.html`,
      kind: `article`,
      why: `관측·정적 분석·벤치마크·튜닝 도구 지도와 perf, ftrace, eBPF/bcc, bpftrace, flame graph 자료의 관문. 도구 이미지의 연도를 확인하며 읽으라는 저자의 조언이 있다.`
    },
    {
      title: `capabilities(7) - Linux manual page`,
      url: `https://man7.org/linux/man-pages/man7/capabilities.7.html`,
      kind: `doc`,
      why: `capability 종류와 permitted·effective·inheritable·bounding·ambient 집합, CAP_SYS_ADMIN의 과부하 문제를 설명한다. 최소 권한 서비스와 컨테이너 권한 설계의 근거.`
    },
    {
      title: `Overcommit accounting (Linux kernel documentation)`,
      url: `https://docs.kernel.org/mm/overcommit-accounting.html`,
      kind: `doc`,
      why: `vm.overcommit_memory 0/1/2 모드와 overcommit_ratio, /proc/meminfo의 CommitLimit·Committed_AS의 정의. 할당 실패와 OOM의 차이를 설명할 때 근거로 삼는다.`
    },
    {
      title: `Overlay Filesystem (Linux kernel documentation)`,
      url: `https://docs.kernel.org/filesystems/overlayfs.html`,
      kind: `doc`,
      why: `lowerdir, upperdir, workdir, merged 뷰와 copy-up, whiteout 동작을 정의한 문서. 컨테이너 이미지 레이어와 쓰기 성능 특성을 이해하는 1차 자료.`
    },
    {
      title: `OCI Runtime Specification: Linux configuration`,
      url: `https://github.com/opencontainers/runtime-spec/blob/main/config-linux.md`,
      kind: `standard`,
      why: `컨테이너 런타임이 받는 namespaces, cgroup 자원(memory, cpu, pids), seccomp, maskedPaths·readonlyPaths 설정의 규격. 도커·쿠버네티스 설정이 커널 기능으로 번역되는 방식을 확인한다.`
    }
  ],
  gigs: [
    `고객은 대개 "서버가 자꾸 느려요/죽어요" 한 줄로 의뢰하며 사양 증설을 해법으로 가정합니다. 견적 전에 확인할 것: 배포판과 커널(uname -r, /etc/os-release), 배포 방식(systemd, docker compose, 쿠버네티스), cgroup v1/v2, 접근 권한(sudo 가능 여부, 읽기 전용 진단 계정), 증상이 나타나는 시각과 빈도, 기존 모니터링(Prometheus, CloudWatch, sar), 유지보수 가능 시간, 백업·스냅샷 유무, 앱 코드 수정까지 범위에 포함인지.`,
    `진단과 수정을 분리해 견적합니다. 1~3일짜리 고정 가격 진단(기준선, 증거, 원인, 조치안)을 먼저 하고 그 결과로 수정 견적을 냅니다. 환경이 복잡할수록 첫 견적은 틀립니다. 대략의 경험치(환경과 인수 조건에 따라 크게 다름): systemd 전환·하드닝 서비스당 반나절~1일, 컨테이너 한도 재설계와 계측 1~3일. 단가 산정의 참고선으로 한국인공지능·소프트웨어산업협회(KOSA)가 공표한 2026 적용 SW기술자 일 평균임금 414,762원(전 직무 평균, +4.7%, ZDNet Korea 2025-12-23 보도 기준)이 있습니다. 이 값은 고용주 부담분을 포함한 인건비 기준이고 직무·등급별로 다르므로 본인 이력과 책임 범위에 맞춰 조정합니다 (2026-11 기준).`,
    `납품물은 코드가 아니라 증거와 재현 가능성입니다. 진단 보고서(증상, 지표, 원인, 조치, 재발 방지, 남은 위험), 변경 내역(유닛 파일, sysctl.d, 로그 로테이션 설정을 git 또는 문서로), 롤백 방법, 알림 규칙, 인수 시험 기록(재부팅, kill -9, 디스크 풀, 의존 서비스 중단), 런북을 포함합니다. 인수 기준은 "oom_kill 24시간 0회", "p99 기준선의 절반 이하"처럼 숫자로 합의합니다.`,
    `전형적인 함정: 운영 서버에 strace/perf/tcpdump를 오래 붙여 장애를 키움, sysctl -w 로만 바꿔 재부팅 후 설정이 사라짐(/etc/sysctl.d 에 영속화 필요), 방화벽·sshd 설정을 바꾸다 스스로 접속이 끊김(두 번째 세션을 유지하고 타이머로 자동 롤백), 인터넷 튜닝 글을 근거 없이 따라 swap·overcommit·THP 같은 전역 값을 변경, root로 실행하고 chmod 777로 마무리, 고객이 root 비밀번호나 키를 메신저로 공유, 로그의 개인정보 노출. 전역 설정 변경은 반드시 측정으로 정당화합니다.`,
    `보안·계약: 고객 서버 접근은 서면으로 범위, 기간, 계정을 합의하고 작업 종료 뒤 계정과 키를 회수합니다. 개인정보가 섞인 로그는 마스킹해서 보고서에 넣습니다. 이 모듈의 범위는 방어적 점검과 운영 개선이며, 침투 테스트나 취약점 점검은 별도 계약과 승인 없이 하지 않습니다.`,
    `관리형 환경의 한계를 미리 확인합니다. PaaS, 서버리스 컨테이너, 관리형 쿠버네티스 노드에서는 호스트 커널 설정, perf, eBPF, 호스트 cgroup 접근이 막혀 있는 일이 많습니다. 이 경우 가능한 관측 수단(컨테이너 지표, 애플리케이션 계측)으로 범위를 다시 합의하지 않으면 약속한 진단을 할 수 없습니다. 배포판·커널의 지원 종료 시점도 확인해 견적과 권고안에 포함합니다.`,
    `인계가 곧 품질입니다. 다음 장애 때 고객 팀이 처음 10분을 혼자 수행할 수 있도록 USE 기준 대시보드 3개, 알림 임계값의 근거, 런북, 장애 훈련 기록을 남깁니다. 지원 기간과 SLA 범위(영업시간 대응인지, 24시간 대기인지)를 문서로 정하고 24시간 대기는 별도 요금으로 분리합니다.`
  ]
};
