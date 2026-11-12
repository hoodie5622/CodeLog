(window.PRO_MODULES = window.PRO_MODULES || {})["be-cloud"] = {
  id: "be-cloud",
  summary: `컨테이너화, GitHub Actions CI, AWS(ECS Fargate·ALB·RDS) 배포와 롤백, Terraform IaC, 시크릿·비용 관리까지 고객에게 인계할 수 있는 배포 파이프라인을 직접 구축할 수 있다.`,
  hours: 110,
  goals: [
    `12-Factor와 build/release/run 분리 원칙으로 설정은 환경 변수, 로그는 stdout, 종료는 SIGTERM 우아한 종료를 갖춘 서비스를 설계하고 컨테이너화할 수 있다`,
    `멀티스테이지·비루트·.dockerignore·digest 고정·취약점 스캔을 적용한 Dockerfile을 작성하고, 빌드 캐시가 깨지는 원인을 진단해 이미지 크기와 빌드 시간 개선을 수치로 보일 수 있다`,
    `Compose로 앱+Postgres+Redis 환경을 구성하고, PID 1 시그널 무시·OOM(exit 137)·로그 드라이버 같은 컨테이너 런타임 장애를 로그와 명령으로 진단할 수 있다`,
    `GitHub Actions CI를 캐시·서비스 컨테이너·브랜치 보호와 함께 설계하고, 최소 권한 토큰·액션 SHA 고정·스크립트 인젝션 방어·pull_request_target 회피로 공급망 위험을 줄일 수 있다`,
    `VPC·서브넷·보안 그룹 체인·ALB·RDS·IAM 역할로 AWS 3계층 구조를 설계하고, NAT·퍼블릭 IPv4·로그 보존 같은 비용 함정을 계산해 예산 알림과 태그 정책으로 관리할 수 있다`,
    `ECS Fargate(Express Mode 포함)·EKS·단일 VM(Kamal/Compose) 중 팀 규모와 역량에 맞는 선택을 근거와 함께 설명하고(App Runner는 2026-04-30부터 신규 고객 불가), 작업 정의와 서비스 배포 파라미터(헬스체크 유예·종료 대기 포함)를 작성할 수 있다`,
    `롤링·블루그린·카나리의 trade-off를 설명하고, 서킷 브레이커·헬스체크·DB expand/contract·GitHub OIDC 신뢰 정책으로 장기 키 없이 1분대 롤백이 가능한 배포 파이프라인을 구성할 수 있다`,
    `Terraform(OpenTofu)으로 원격 상태·잠금·환경 분리를 갖춘 인프라를 코드로 재현하고, plan 출력에서 교체·삭제 같은 위험 변경을 걸러내 변경 승인 흐름에 반영할 수 있다`
  ],
  lessons: [
    {
      title: `배포의 멘탈 모델: 재현성, Build·Release·Run, 그리고 전체 지도`,
      body: `"내 컴퓨터에서는 되는데요"는 배포 문제의 가장 흔한 첫 문장입니다. 코드가 같아도 OS 패키지 버전, 런타임 버전, 환경 변수, 열린 포트, DB 주소 중 하나만 달라지면 결과가 달라집니다. 배포의 본질은 파일을 서버에 복사하는 일이 아니라 **코드·설정·의존성·런타임·인프라를 같은 모양으로 반복 재현하는 일**입니다. 이 모듈 전체는 그 재현성을 한 단계씩 자동화하고 검증하는 과정입니다.

### Build · Release · Run을 나눈다

12-Factor App(Heroku 개발자들이 정리한 클라우드 앱 원칙 12가지)의 핵심은 세 단계를 분리하는 것입니다.
- **Build**: 소스에서 실행 가능한 산출물(여기서는 컨테이너 이미지)을 만든다. 한 번 만들고 불변으로 취급한다.
- **Release**: 산출물에 환경별 설정을 결합해 이름 붙은 배포 단위로 만든다. 이미지 태그는 Git 커밋 SHA로 한다.
- **Run**: 릴리스를 실제 프로세스로 실행한다.

같은 이미지가 dev, staging, prod를 그대로 통과하고 환경 차이는 환경 변수와 시크릿으로만 주입합니다. 운영 서버에 SSH로 들어가 파일을 직접 고친 서버(흔히 눈송이 서버라 부릅니다)는 현재 상태를 아무도 설명하지 못하기 때문에 장애가 나면 똑같이 다시 만들 수 없습니다.

### 클라우드 앱이 지켜야 할 최소 계약

| 요인 | 실무에서의 의미
| 설정(Config) | DB 주소·키를 코드에 박지 않고 환경 변수로 받는다
| 프로세스(Stateless) | 세션·업로드 파일을 로컬 디스크에 두지 않는다
| 폐기 가능성 | 빨리 뜨고, SIGTERM을 받으면 진행 중 요청을 마치고 끝난다
| 로그 | 파일이 아니라 stdout/stderr로 낸다. 수집은 플랫폼 몫이다
| 백킹 서비스 | DB·캐시는 URL 하나로 바꿔 끼우는 외부 자원이다

로컬 디스크에 의존하는 앱은 컨테이너가 교체되는 순간 데이터를 잃고, 종료 신호를 무시하는 앱은 배포 때마다 요청을 끊습니다. 아래 예제 코드가 이 계약의 최소 구현입니다. 종료 신호를 받으면 readiness부터 내리고 ‹DRAIN_SECONDS›(기본 0)만큼 기다린 뒤 서버를 닫는데, 로드밸런서가 타깃 해제를 반영하는 데 몇 초 걸릴 수 있어 운영에서는 수 초의 대기를 두는 방식이 흔합니다(경험칙이므로 실제 값은 측정해서 정합니다).

### 한 줄로 보는 전체 지도

git push → CI(빌드·테스트·스캔) → 레지스트리(ECR) → CD(롤링 배포) → 런타임(ECS Fargate) → ALB·Route 53·ACM → 로그·알람.

단계마다 실패하는 방식이 다릅니다. CI는 깨진 코드가 들어오고, 레지스트리는 태그가 덮어써지고, CD는 새 버전이 헬스체크를 통과하지 못하고, 런타임은 OOM으로 죽고, 로드밸런서는 타임아웃 불일치로 502를 냅니다. 이후 레슨은 이 순서를 따라가며 각 단계의 내부 동작과 실패 모드를 다룹니다.

### 왜 이 영역이 외주의 값을 가르는가

사람인 키워드 검색(2026-11-09)에서 AWS 1,455건, Docker 913건, Kubernetes 644건, Terraform 164건, GitHub Actions 139건이 나옵니다. 크몽 서버·클라우드 가격 가이드(2025-09)는 단일 서버 50–80만 원, AWS+CI/CD 100–200만 원, 오토스케일·백업·모니터링 300만 원 이상으로 값이 계단식으로 오릅니다. 계단을 오르는 기준은 "띄웠다"가 아니라 **롤백·복구·비용까지 책임질 수 있다**입니다.

모든 설계 결정은 AWS Well-Architected의 6개 기둥(운영 우수성, 보안, 안정성, 성능 효율, 비용 최적화, 지속가능성)으로 점검하세요. NAT Gateway 하나만 두면 비용은 줄지만 안정성이 줄고, Multi-AZ RDS는 안정성이 오르지만 비용이 대략 두 배가 됩니다. 이 모듈의 모든 선택은 어느 기둥을 사고 어느 기둥을 파는가의 거래입니다.`,
      code: `import json, os, signal, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8080"))          # 설정은 환경 변수로
GREETING = os.environ.get("GREETING", "hello")
DRAIN = float(os.environ.get("DRAIN_SECONDS", "0"))  # SIGTERM 뒤 LB가 해제를 반영할 때까지 기다릴 시간
ready = threading.Event()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/healthz":                  # liveness: 프로세스가 살아 있는가
            self._send(200, {"status": "ok"})
        elif self.path == "/readyz":                 # readiness: 트래픽을 받아도 되는가
            self._send(200 if ready.is_set() else 503, {"ready": ready.is_set()})
        else:
            self._send(200, {"msg": GREETING})

    def _send(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):               # 로그는 파일이 아니라 stdout
        print(self.address_string(), fmt % args, flush=True)


class Server(ThreadingHTTPServer):
    daemon_threads = False    # server_close()가 진행 중인 요청 스레드를 기다린다


server = Server(("0.0.0.0", PORT), Handler)


def stop():
    time.sleep(DRAIN)         # 새 요청이 끊기길 기다린 뒤 닫는다(진행 중 요청은 server_close가 기다린다)
    server.shutdown()


def on_sigterm(signum, frame):
    ready.clear()             # 먼저 readiness를 내려 프로브·LB가 이 인스턴스를 빼게 한다
    threading.Thread(target=stop, daemon=True).start()   # 핸들러에서 shutdown()을 직접 부르면 교착


signal.signal(signal.SIGTERM, on_sigterm)
signal.signal(signal.SIGINT, on_sigterm)
ready.set()
print("listening on", PORT, flush=True)
server.serve_forever()
server.server_close()
print("bye", flush=True)`,
      codeLang: `python`,
      key: [
        `배포 = 코드·설정·의존성·런타임·인프라를 반복 재현하는 일이다. 한 번 빌드한 불변 산출물을 환경 사이에서 승격하고 환경 차이는 설정으로만 주입한다`,
        `Build(산출물 생성) · Release(산출물+설정, 커밋 SHA 태그) · Run(프로세스 실행)을 분리해야 롤백이 이전 릴리스 재실행으로 끝난다`,
        `클라우드 앱의 최소 계약은 환경 변수 설정, 무상태 프로세스, SIGTERM 우아한 종료, stdout 로그, 외부 백킹 서비스다`,
        `liveness(살아 있나)와 readiness(받을 준비가 됐나)는 다른 질문이며 LB 헬스체크는 readiness에 가깝다`,
        `외주 값의 계단은 구축 여부가 아니라 롤백·복구·비용 책임 범위로 결정된다`
      ],
      pitfalls: [
        `운영 서버에서 직접 파일을 고치는 핫픽스: 다음 배포에서 사라지고 환경이 소스와 달라져 재현이 불가능해진다`,
        `환경마다 이미지를 따로 빌드: staging에서 검증한 물건이 prod에 나가지 않는다. 같은 이미지를 승격해야 한다`,
        `SIGTERM을 처리하지 않는 앱: 배포·스케일 인 때마다 진행 중 요청이 끊겨 5xx로 보인다`,
        `업로드 파일·세션을 컨테이너 로컬 디스크에 저장: task가 교체되면 사라진다. S3나 외부 저장소를 쓴다`
      ]
    },
    {
      title: `Docker 이미지 내부 구조: 레이어, 빌드 캐시, 멀티스테이지, 안전한 Dockerfile`,
      body: `이미지는 **파일 시스템 변경분(레이어)의 쌓임 + 실행 설정(환경 변수·엔트리포인트) + 이를 가리키는 매니페스트**입니다. 레이어는 내용의 해시(sha256)로 식별되고 이미지 전체도 digest라는 해시 하나로 식별됩니다. 반면 ‹python:3.13-slim› 같은 태그는 누구든 가리키는 대상을 바꿀 수 있는 움직이는 포인터입니다. 어제 되던 빌드가 오늘 깨지는 일이 여기서 나옵니다. 재현성이 필요하면 ‹FROM python:3.13-slim@sha256:...›처럼 digest로 고정하고, 대신 보안 패치가 자동으로 들어오지 않으므로 digest 갱신 PR을 자동으로 받는 운영을 함께 둡니다. Docker 문서는 Dependabot(‹package-ecosystem: "docker"›)을 예로 들며, Renovate 같은 도구로도 같은 운영이 가능합니다.

### 빌드 캐시: 명령의 순서가 곧 속도

BuildKit은 명령마다 명령 문자열과 입력 파일의 체크섬으로 캐시 키를 만듭니다. 한 단계가 무효화되면 그 아래 단계는 전부 다시 실행됩니다. 그래서 변경이 드문 것을 위에, 자주 바뀌는 것을 아래에 둡니다. 의존성 목록(requirements.txt, package-lock.json)만 먼저 복사해 설치하고 소스는 그 다음에 복사합니다. ‹COPY . .›를 맨 앞에 두면 소스 한 줄만 고쳐도 의존성 설치가 처음부터 다시 도는데, 이것이 CI가 느린 가장 흔한 원인입니다.

### 멀티스테이지와 최소 이미지

컴파일러·헤더·패키지 캐시 같은 빌드 도구는 실행에 필요 없습니다. builder 스테이지에서 빌드하고 runtime 스테이지로 결과물만 복사하면 이미지가 작아지고 셸·패키지 매니저 같은 공격 표면과 CVE 수도 줄어듭니다. 베이스 이미지는 공식·검증된 출처에서 요구사항을 만족하는 가장 작은 것을 고릅니다. alpine은 작지만 musl libc 때문에 일부 파이썬 wheel과 네이티브 바이너리에서 호환 문제가 생겨, 보통은 Debian 계열 slim이 무난한 기본값입니다. Docker Hardened Images는 Community 티어가 무료(Apache 2.0)이고, 유료(Select·Enterprise) 티어는 중대·높음 CVE에 7일 SLA를 보장합니다. SBOM과 SLSA 3단계 출처 증명은 모든 티어에 포함됩니다(2026-11 열람). 고객이 컴플라이언스를 요구하면 선택지로 올립니다.

### 비루트, .dockerignore, 시크릿

컨테이너의 root는 호스트 커널 위의 uid 0입니다. 격리를 뚫는 취약점이 나오면 피해가 커지므로 ‹USER›로 고정 UID(예: 10001)를 지정합니다. ‹.dockerignore›는 ‹.git›, ‹node_modules›, ‹.env›, 빌드 산출물을 빌드 컨텍스트에서 빼서 전송량을 줄이고 시크릿 유입을 막습니다. 레이어는 쌓이기만 하므로(append-only) COPY로 들어간 ‹.env›를 다음 RUN에서 지워도 이전 레이어에 그대로 남아 ‹docker history›나 레이어 추출로 꺼낼 수 있습니다. 빌드 중 필요한 비밀은 BuildKit의 ‹RUN --mount=type=secret›으로 주입해 레이어에 남기지 않습니다.

### 태그 전략, 스캔, SBOM

- 태그는 Git SHA(또는 CI 빌드 번호)로 하고 ‹latest›에 의존하지 않는다. ECR은 태그 불변(immutable) 설정을 지원하므로 켜 둔다.
- CI에 이미지 스캔(ECR 스캔, Trivy 등)을 넣고 HIGH/CRITICAL 기준을 정한다. 모든 CVE가 악용 가능한 것은 아니므로 OS 패키지인지 앱 의존성인지, 수정본이 있는지로 분류하는 합의가 필요하다.
- SBOM(구성 요소 목록)을 이미지와 함께 보관하면 새 CVE가 공개됐을 때 우리 이미지에 들어 있는지 바로 답할 수 있다.
- 이미지의 ‹HEALTHCHECK›는 Docker·Compose에서만 동작한다. ECS는 작업 정의의 healthCheck만 모니터링하므로(AWS 문서) 두 곳을 맞춰 두고, 검사 명령은 이미지 안에 있어야 하니 slim 이미지에서는 curl 대신 파이썬 한 줄을 쓴다.
- Docker Engine은 29.x가 월 단위로 릴리스(29.9.3, 2026-11-03)되므로 러너와 서버의 Docker 버전 고정·갱신 정책도 둔다.`,
      code: `# syntax=docker/dockerfile:1
FROM python:3.13-slim AS builder
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /build
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
# 의존성 목록만 먼저 복사: 소스가 바뀌어도 아래 설치 레이어는 캐시에서 재사용된다
COPY requirements.txt .
RUN pip install -r requirements.txt

FROM python:3.13-slim AS runtime
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PATH="/opt/venv/bin:$PATH"
RUN groupadd --gid 10001 app \\
 && useradd --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --chown=app:app src/ ./src/
USER 10001:10001
EXPOSE 8080
# Docker·Compose용 검사. ECS는 이 줄을 보지 않으므로 작업 정의에도 healthCheck를 따로 쓴다
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \\
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/healthz', timeout=2)"]
# exec 형식: 파이썬이 PID 1이 되어 SIGTERM을 직접 받는다
CMD ["python", "-m", "src.main"]`,
      codeLang: `dockerfile`,
      key: [
        `이미지는 불변 레이어의 쌓임이며 digest가 진짜 식별자다. 태그는 움직이는 포인터이므로 재현성이 필요한 곳에서는 digest로 고정하고 갱신 PR을 자동화한다`,
        `캐시는 위에서 아래로 무효화된다. 의존성 파일 복사 → 설치 → 소스 복사 순서가 빌드 시간을 결정한다`,
        `멀티스테이지로 빌드 도구를 최종 이미지에서 제거하면 크기와 공격 표면이 함께 줄어든다`,
        `레이어는 append-only라서 지운 시크릿도 이전 레이어에 남는다. .dockerignore와 BuildKit 시크릿 마운트로 애초에 넣지 않는다`,
        `비루트 UID 고정, 태그는 커밋 SHA, 스캔과 SBOM을 CI에 넣는 것이 최소 위생이다`
      ],
      pitfalls: [
        `COPY . . 를 의존성 설치보다 앞에 두기: 한 줄 수정에도 매번 전체 설치가 돌아 CI 시간이 몇 배가 된다`,
        `latest 태그 배포: 롤백 대상이 무엇인지 알 수 없고 같은 태그가 다른 내용을 가리킬 수 있다`,
        `.env를 COPY한 뒤 RUN rm으로 지웠다고 안심: 이미 레이어에 들어가 이미지를 받은 누구나 꺼낼 수 있다`,
        `alpine으로 무조건 바꾸기: musl 호환 문제로 빌드·런타임 오류가 생기고 디버깅 시간이 크기 절감보다 커질 수 있다`
      ]
    },
    {
      title: `컨테이너 런타임, Compose, nginx: 로컬에서 단일 서버 운영까지`,
      body: `컨테이너는 가상 머신이 아니라 **호스트 커널을 공유하는 격리된 프로세스**입니다. 격리는 리눅스 namespace(pid·net·mnt·uts·ipc·user)가, 자원 제한은 cgroup이 맡고, 파일 시스템은 이미지 레이어를 겹친 rootfs입니다. 리눅스 모듈에서 배운 프로세스·시그널·메모리가 그대로 적용되고 장애도 거기서 나옵니다.

### PID 1과 시그널

컨테이너 안의 첫 프로세스는 PID 1입니다. 커널은 PID 1에 대해서는 핸들러를 등록하지 않은 시그널(SIGTERM 포함)을 무시합니다. 그래서 ‹CMD python app.py›처럼 셸 형식으로 쓰거나 래퍼 스크립트가 파이썬을 자식으로 실행하면, PID 1인 셸이 SIGTERM을 받고도 앱에 넘기지 않습니다. ‹docker stop›은 SIGTERM 후 기본 10초를 기다렸다가 SIGKILL을 보내고, ECS는 컨테이너 stopTimeout(기본 30초, Fargate 최대 120초, 2026-11 문서 기준) 뒤에 SIGKILL을 보냅니다. 증상은 배포가 오래 걸리고 진행 중이던 요청이 끊겨 5xx가 나는 것입니다. 해법은 exec 형식 ‹CMD [...]›, 래퍼 스크립트의 마지막 줄을 ‹exec›로 바꾸기, 필요하면 ‹--init›(tini)로 좀비 프로세스까지 수거하는 것입니다.

### 자원 제한: OOM과 CPU 스로틀링

메모리 한도를 넘으면 커널 OOM killer가 프로세스를 SIGKILL하고 종료 코드는 137(128+9)입니다. 앱은 죽는 순간까지 정상이라 로그에는 아무것도 남지 않습니다. 확인은 ‹docker inspect›의 OOMKilled 값과 ECS의 stopped reason입니다. JVM 힙, Node의 ‹--max-old-space-size›, 워커 프로세스 수를 컨테이너 한도 기준으로 맞춰야 합니다. CPU 한도는 CFS 쿼터로 구현되어 한도에 닿으면 실행이 잠깐씩 멈춥니다(스로틀링). 평균 CPU는 낮은데 p99 지연만 튀는 증상이 전형적입니다.

### 로그

컨테이너의 stdout/stderr는 로깅 드라이버가 수집합니다. 기본 json-file 드라이버는 로테이션을 설정하지 않으면 계속 커져 디스크를 채웁니다(‹max-size›, ‹max-file›). ECS에서는 awslogs 드라이버로 CloudWatch Logs에 보냅니다.

### Compose: 단일 호스트 선언형 환경

Compose는 services, 네트워크(서비스 이름이 DNS 이름이 됨), volumes, healthcheck를 YAML로 선언합니다. ‹depends_on›만 쓰면 시작 순서만 보장될 뿐 DB가 준비됐다는 뜻이 아니므로 healthcheck와 ‹condition: service_healthy›를 함께 씁니다. DB 데이터는 named volume에 두고 ‹docker compose down -v›가 볼륨을 지운다는 점을 기억해야 합니다. Compose는 한 호스트용 도구라 로컬, CI, 소규모 스테이징에 맞고 다중 호스트 롤링 배포나 자동 복구는 범위 밖입니다.

### nginx 리버스 프록시

nginx는 TLS 종료, 업스트림 분산, 정적 파일, 레이트 리밋, 버퍼링을 맡습니다. 기본값이 장애가 되는 곳이 있습니다. ‹client_max_body_size›는 1m라 큰 업로드가 413이 되고, ‹proxy_read_timeout›은 60초라 긴 처리는 504가 되며, 업스트림이 죽어 연결이 거부되면 502가 됩니다. 502는 연결 또는 응답 불량, 504는 시간 초과로 구분하면 원인 범위가 좁아집니다(네트워크 모듈 복습). 앱이 원 클라이언트 IP와 https 여부를 알려면 ‹X-Forwarded-For›, ‹X-Forwarded-Proto›를 전달해야 합니다. nginx는 최근 HTTP/3 등에서 CVE 수정이 연속되어 stable 1.30.6(2026-10-14), mainline 1.31.8(2026-10-21)까지 나와 있으므로 태그를 고정하되 정기적으로 올립니다. AWS에서는 ALB가 이 역할 대부분을 대신합니다. 단일 VM에서는 Kamal(SSH+Docker, 무중단 전환과 Let's Encrypt 지원, 2026-11 문서 표기 2.12.0)이나 Compose+nginx가 현실적인 최소 구성입니다.`,
      code: `services:
  api:
    build: .
    init: true                 # PID 1 문제와 좀비 수거를 tini에 맡긴다
    mem_limit: 512m            # OOM을 로컬에서 미리 겪어 본다
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://app:app-dev-only@db:5432/app
      REDIS_URL: redis://cache:6379/0
    depends_on:
      db:
        condition: service_healthy     # 시작 순서가 아니라 준비 완료를 기다린다
      cache:
        condition: service_started
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app-dev-only  # 로컬 전용. 운영 비밀번호는 이 파일에 두지 않는다
      POSTGRES_DB: app
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 5s
      timeout: 3s
      retries: 10
  cache:
    image: redis:8
volumes:
  pgdata:`,
      codeLang: `yaml`,
      key: [
        `컨테이너는 namespace로 격리되고 cgroup으로 제한되는 호스트 커널 위의 프로세스다. VM이 아니므로 시그널·메모리 규칙이 그대로 적용된다`,
        `PID 1은 핸들러 없는 SIGTERM을 무시한다. exec 형식 CMD, 래퍼의 exec, --init으로 종료 신호가 앱에 닿게 해야 한다`,
        `종료 코드 137은 SIGKILL(대개 OOM 또는 stop 타임아웃)이고 143은 SIGTERM으로 정상 종료한 것이다`,
        `Compose의 depends_on은 준비 완료를 보장하지 않는다. healthcheck와 service_healthy 조건이 필요하다`,
        `nginx 기본값(본문 1MB, 읽기 타임아웃 60초)과 502(연결·응답 불량) vs 504(시간 초과)의 구분을 외워 둔다`
      ],
      pitfalls: [
        `셸 형식 CMD나 exec 없는 래퍼 스크립트: 종료 신호가 앱에 전달되지 않아 배포마다 10~30초 지연과 요청 유실이 생긴다`,
        `컨테이너 메모리 한도를 모르고 JVM·Node 힙을 크게 잡기: 로그 없이 exit 137로 죽어 원인 파악에 시간이 든다`,
        `json-file 로그 로테이션 미설정: 몇 주 뒤 디스크가 차서 서버 전체가 멈춘다`,
        `compose down -v를 습관처럼 실행: DB 볼륨이 삭제되어 개발 데이터를 잃는다`
      ]
    },
    {
      title: `GitHub Actions CI 설계와 공급망 보안`,
      body: `CI의 목적은 모든 변경을 같은 조건에서 자동 검증해 main이 항상 배포 가능한 상태이게 하는 것입니다. 피드백은 빨라야 해서 보통 10분 안을 목표로 하고, 느리면 사람들이 CI를 우회하기 시작합니다.

### Actions의 구조

워크플로(‹.github/workflows› 아래 YAML)는 이벤트(‹on›)로 시작되고, 여러 job으로 구성됩니다. job은 기본적으로 병렬이며 **각자 새로 만들어진 러너(VM)** 에서 실행되므로 job 사이에 파일이 공유되지 않습니다. 넘겨야 할 것은 artifacts나 cache를 쓰고 순서는 ‹needs›로 지정합니다. job 안의 step은 ‹uses›(재사용 액션) 또는 ‹run›(셸 명령)입니다. ‹strategy.matrix›로 버전 조합을 병렬 실행하고, ‹services›로 Postgres 같은 서비스 컨테이너를 붙여 통합 테스트를 돌립니다. ‹timeout-minutes›를 따로 두지 않으면 job이 한도인 6시간(360분)까지 돌 수 있으므로(GitHub 한도 문서) 멈춘 job이 요금을 먹지 않게 짧게 지정합니다.

### 비용과 러너

GitHub-hosted 러너는 매번 깨끗한 일회용입니다. 2026-11 열람 기준 표준 2코어 x64 Linux는 분당 $0.006이고 플랜별 월 포함 사용량이 Free $12, Pro·Team $18, Enterprise Cloud $300입니다. 공개 저장소의 표준 hosted 러너와 셀프호스트 러너 사용은 무료로 표기됩니다(larger runner는 유료). 예를 들어 10분짜리 CI를 하루 20번, 22일 돌리면 4,400분이고 약 $26입니다. 2026-01-01부터 hosted 러너 요금이 최대 39% 내렸고 셀프호스트 러너 분당 $0.002 플랫폼 요금은 보류 상태입니다(새 일정 없음). 셀프호스트는 싸 보이지만 GitHub 보안 문서가 공개 저장소에서는 거의 쓰지 말라고 경고합니다. 누구나 PR을 열어 러너를 오염시킬 수 있고 러너가 기본적으로 일회용이 아니기 때문입니다.

### 속도: 캐시와 순서

setup 액션의 ‹cache› 옵션은 락 파일 해시를 키로 의존성을 저장합니다. 단계는 빠르고 싼 것부터(린트 → 단위 테스트 → 이미지 빌드 → 통합 테스트) 두어 실패를 빨리 알립니다. 같은 PR에 푸시가 연달아 오면 ‹concurrency›로 이전 실행을 취소합니다.

### 보안: Actions는 공급망 공격 표면

1. **GITHUB_TOKEN 최소 권한**: 기본을 읽기 전용(‹permissions: contents: read›)으로 하고 쓰기가 필요한 job에만 올린다.
2. **서드파티 액션은 전체 커밋 SHA로 고정**: 태그는 옮겨질 수 있다. 실제로 인기 액션(tj-actions/changed-files)의 태그가 악성 커밋으로 옮겨져 많은 저장소의 시크릿이 로그로 새어 나간 공개 사고가 2025-03에 있었다. 락파일 방식은 SHA 고정보다 더 강한 선택지다.
3. **스크립트 인젝션**: ‹run› 안에 PR 제목 같은 신뢰할 수 없는 컨텍스트를 달러 기호와 이중 중괄호 표현식으로 직접 끼우면, 값이 셸 스크립트 텍스트로 치환된 뒤 실행되어 제목에 심은 명령이 돈다. 값을 ‹env›로 받아 따옴표로 감싼 셸 변수로 참조한다.
4. **pull_request_target·workflow_run**: 기본 저장소 컨텍스트(시크릿·쓰기 토큰)로 실행되므로 외부 PR의 코드를 체크아웃해 실행하면 안 된다.
5. **시크릿 마스킹은 보장되지 않는다**: JSON·YAML로 감싼 시크릿이나 가공한 값(Base64)은 마스킹을 피한다. 로그에 샜다면 로그를 지우고 시크릿을 회전한다.
6. 장기 AWS 키는 두지 않는다. OIDC로 대체한다(레슨 7).

브랜치 보호로 CI 성공을 머지 필수 조건으로 만들어야 CI가 의미를 갖습니다.`,
      code: `name: ci
on:
  pull_request:
  push:
    branches: [main]

# 토큰 기본 권한을 읽기 전용으로. 쓰기가 필요한 job에만 따로 올린다
permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15          # 생략하면 최대 6시간: 멈춘 job이 요금을 먹지 않게
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: ci-only-password
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
    steps:
      # 2026-11 확인 최신 메이저: checkout v7, setup-python v7
      # 실무에서는 서드파티 액션을 태그가 아닌 전체 커밋 SHA로 고정한다
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.13"
          cache: pip
      - run: pip install -r requirements.txt ruff pytest   # 도구가 requirements에 없어도 돌도록
      - run: ruff check .
      - run: pytest -q
        env:
          DATABASE_URL: postgresql://postgres:ci-only-password@localhost:5432/postgres
      - name: 이미지 빌드 검증
        run: docker build -t shop-api:ci .`,
      codeLang: `yaml`,
      key: [
        `job은 서로 격리된 새 러너에서 돈다. 파일 공유는 artifact나 cache로, 순서는 needs로 표현한다`,
        `토큰은 기본 읽기 전용으로 두고 job 단위로 필요한 권한만 올린다. timeout-minutes도 반드시 지정한다`,
        `서드파티 액션은 전체 커밋 SHA로 고정한다. 태그는 가리키는 커밋이 바뀔 수 있다`,
        `run 블록에 신뢰할 수 없는 컨텍스트를 직접 보간하지 말고 env로 받아 인용된 셸 변수로 쓴다`,
        `pull_request_target 계열에서는 외부 PR 코드를 체크아웃하거나 실행하지 않는다. 셀프호스트 러너는 공개 저장소에서 피한다`
      ],
      pitfalls: [
        `fork PR 테스트를 위해 pull_request_target으로 바꾸고 PR 헤드를 체크아웃: 외부 기여자가 시크릿을 탈취할 수 있는 전형적 설정 오류다`,
        `시크릿을 echo로 찍어 디버깅하거나 JSON에 담아 넘기기: 마스킹이 실패해 로그로 샌다`,
        `캐시 키에 락 파일 해시를 쓰지 않아 오래된 의존성으로 테스트하기: 로컬과 CI 결과가 어긋난다`,
        `CI는 있지만 브랜치 보호가 없어 실패한 PR이 그대로 머지되는 상태: CI가 장식이 된다`
      ]
    },
    {
      title: `AWS 기초 인프라: IAM, VPC, EC2·RDS·S3, ALB, Route 53`,
      body: `AWS는 서비스가 수백 개지만 웹 백엔드 한 벌을 올리는 데 필요한 뼈대는 정해져 있습니다. 아래 순서로 이해하면 이후 어떤 서비스가 나와도 어디에 끼는지 보입니다.

### IAM: 누가 무엇을 할 수 있는가

루트 사용자는 MFA를 걸고 일상 작업에 쓰지 않습니다. 사람은 IAM Identity Center(SSO)나 임시 자격으로, 코드와 서비스는 **IAM 역할**로 권한을 받습니다. 역할은 두 문서로 이뤄집니다. 신뢰 정책(누가 이 역할을 맡을 수 있는가)과 권한 정책(맡으면 무엇을 할 수 있는가)입니다. 정책 평가에서는 명시적 Deny가 항상 이기고 기본은 거부입니다. 최소 권한을 지키려면 ‹*› 와일드카드를 리소스와 액션에서 줄여야 하고, 장기 액세스 키는 만들지 않는 것이 목표입니다.

### 리전, AZ, VPC

서울 리전은 ‹ap-northeast-2›입니다. 가용 영역(AZ)은 한 리전 안의 독립된 장애 도메인이고 Multi-AZ는 한 AZ가 죽어도 서비스가 사는 구성입니다. VPC는 내 전용 가상 네트워크로 CIDR(예: ‹10.0.0.0/16›)을 정하고 AZ마다 서브넷을 나눕니다. 서브넷이 퍼블릭인지는 라우트 테이블에 인터넷 게이트웨이(IGW)로 가는 ‹0.0.0.0/0› 경로가 있는지로 결정됩니다. 사설 서브넷의 인스턴스가 밖으로 나가려면 NAT Gateway를 거칩니다.

보안 그룹(SG)은 **상태 저장** 방화벽으로 인스턴스·ENI 단위에서 허용 규칙만 가지며, 네트워크 ACL은 서브넷 단위의 상태 비저장 필터입니다. 실무 패턴은 SG 체인입니다. ALB의 SG는 인터넷 443을 받고, 앱 SG는 ALB SG에서 오는 트래픽만, DB SG는 앱 SG에서 오는 5432만 허용합니다. IP가 아니라 SG를 참조하면 task가 교체되어 IP가 바뀌어도 규칙이 유지됩니다.

### 컴퓨트·스토리지·DB

- **EC2**: 인스턴스 타입 계열(범용·컴퓨트·메모리 최적화)과 EBS 볼륨. 인스턴스 스토어는 휘발성이다.
- **S3**: 객체 스토리지. 버킷은 기본 비공개로 두고 Block Public Access를 켠다. 버저닝과 수명주기 규칙으로 실수 삭제와 비용을 관리한다.
- **RDS**: 관리형 DB. 자동 백업과 시점 복구(PITR), Multi-AZ 인스턴스 배포(동기 복제 스탠바이, 읽기 용도 아님), 비동기 읽기 복제본. DB는 사설 서브넷에 두고 앱 SG만 허용한다.

### 진입로: ALB, ACM, Route 53, CloudFront

ALB는 L7 로드밸런서로 최소 두 AZ의 서브넷에 걸칩니다. 리스너(443)가 규칙(호스트·경로)에 따라 타겟 그룹으로 보내고 타겟은 헬스체크를 통과해야 트래픽을 받습니다. 퍼블릭 인증서는 ACM에서 ALB·CloudFront용으로 무료이며 자동 갱신됩니다. Route 53은 도메인의 호스팅 영역을 두고 알리아스 레코드로 ALB를 가리킵니다(zone apex에서도 가능, CNAME은 불가). CloudFront는 정적 파일과 캐시를 엣지에서 제공합니다.

### 요청이 지나가는 길과 장애 지점

요청은 DNS(Route 53) → ALB(두 AZ의 퍼블릭 서브넷) → 헬스체크를 통과한 타겟(사설 서브넷 task의 ENI) → RDS(사설 서브넷) 순서로 흐르고, 구간마다 깨지는 모양이 다릅니다. SG 체인 규칙이 빠지면 ALB가 타겟에 연결하지 못해 타임아웃(504)이 납니다. 헬스체크 경로나 포트가 틀리면 타겟이 unhealthy로 빠지는데, 정상 타겟이 부족하면 ALB는 등록된 모든 타겟으로 보내는 fail-open으로 동작하므로 오류가 사용자에게 그대로 보입니다. 사설 서브넷 task가 NAT나 VPC 엔드포인트 없이 ECR에 닿지 못하면 시작 단계에서 이미지 pull이 실패합니다. task가 한 AZ에만 있으면 그 AZ 장애에 서비스 전체가 멈춥니다. 설계서에 이 경로를 그림 한 장으로 그리고 구간별 증상을 적어 두면 인계 뒤 장애 분석이 빨라집니다.

### 비용 감각

비용의 기본 구조는 시간당 과금과 GB당 과금의 합입니다. 2026-11 열람 기준 NAT Gateway는 시간당 $0.045와 처리 GB당 $0.045(미국 동부 오하이오 요금표 기준이며 서울은 다를 수 있음)이고, 퍼블릭 IPv4 주소는 사용 여부와 무관하게 시간당 $0.005입니다. 730시간으로 환산하면 NAT 하나가 월 약 $33, IPv4 한 개가 월 약 $3.65를 처리량과 별개로 냅니다. 안 쓰는 ALB, 연결 안 된 EIP, 오래된 스냅샷, 보존 기간 없는 로그 그룹이 청구서를 키웁니다.`,
      code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ObjectAccessOnlyUnderInvoicesPrefix",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::shop-uploads-prod/invoices/*"
    },
    {
      "Sid": "ListOnlyThatPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::shop-uploads-prod",
      "Condition": {
        "StringLike": { "s3:prefix": ["invoices/*"] }
      }
    },
    {
      "Sid": "DenyPlainHttp",
      "Effect": "Deny",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::shop-uploads-prod",
        "arn:aws:s3:::shop-uploads-prod/*"
      ],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}`,
      codeLang: `json`,
      key: [
        `사람은 SSO·임시 자격, 코드는 IAM 역할. 역할 = 신뢰 정책(누가 맡나) + 권한 정책(무엇을 하나). 명시적 Deny가 항상 이긴다`,
        `퍼블릭 서브넷은 IGW 경로가 있는 서브넷이다. ALB만 퍼블릭에, 앱과 DB는 사설에 두고 SG 체인(ALB→앱→DB)으로 연결한다`,
        `SG는 상태 저장·허용 전용·ENI 단위, NACL은 상태 비저장·서브넷 단위다`,
        `RDS Multi-AZ는 가용성(자동 장애 조치)이고 읽기 확장이 아니다. 백업은 복원해 봐야 백업이다`,
        `NAT Gateway·퍼블릭 IPv4·ALB·로그 보존은 트래픽이 없어도 시간 단위로 과금되는 고정비다`
      ],
      pitfalls: [
        `개발 편의로 DB에 퍼블릭 접근을 열고 SG를 0.0.0.0/0으로 두기: 포트 스캔과 무차별 대입의 표적이 된다`,
        `S3 버킷 정책에서 리소스를 버킷 전체와 s3:* 로 쓰기: 키 하나가 유출되면 모든 객체가 노출된다`,
        `NAT Gateway를 환경마다 만들고 잊기: 사용량이 없어도 월 고정비가 쌓인다. 개발 환경은 구성을 재검토한다`,
        `ALB를 한 AZ에만 걸치거나 RDS를 단일 AZ로 두고 고가용성을 약속하기: 계약한 가용성과 구성이 어긋난다`
      ]
    },
    {
      title: `컨테이너 실행 플랫폼 선택: ECS/Fargate, Express Mode, 쿠버네티스, 단일 서버`,
      body: `컨테이너를 어디서 돌릴지는 기술 취향이 아니라 **누가 운영하느냐**의 문제입니다. AWS 의사결정 가이드(2025-05-16 갱신)는 컨테이너 서비스를 세 층으로 나눕니다. 용량(EC2, Fargate), 오케스트레이션(ECS, EKS), 묶음 서비스(App Runner 등)입니다. 가장 먼저 정할 것은 서버리스 운영 모델이냐 쿠버네티스 운영 모델이냐이고, 조직 규모와 역량이 핵심 기준이라고 안내합니다. App Runner가 가장 단순하고 ECS는 네트워크·보안 제어가 더 많으며 EKS는 가장 유연하다는 비교도 있습니다. 다만 이 가이드는 2025-05 기준입니다. AWS는 App Runner가 2026-04-30부터 신규 고객을 받지 않는다고 공지하고(기존 고객은 계속 사용) 대안으로 ECS Express Mode를 권합니다(2026-11 확인).

### ECS의 개념 모델

| Cluster | 서비스와 작업을 묶는 논리 단위
| Task Definition | 이미지·CPU·메모리·환경·시크릿·로그·헬스체크 명세(리비전 번호가 붙는 불변 문서)
| Task | 정의를 실제로 실행한 인스턴스. 함께 스케줄되는 컨테이너 묶음
| Service | 원하는 task 수를 유지하고 죽으면 대체하며 배포와 LB 연동을 맡는 스케줄러

Fargate는 호스트 EC2를 관리하지 않고 task 단위로 vCPU와 메모리를 할당해 과금합니다. 네트워크 모드는 awsvpc라 task마다 ENI와 사설 IP, SG가 붙어 SG 체인에 직접 참여합니다.

### 역할은 두 개다

- **Task Execution Role**: ECS 에이전트가 쓴다. ECR에서 이미지 pull, CloudWatch Logs 전송, secrets 값 주입.
- **Task Role**: 앱 코드가 쓴다. 예를 들어 S3 업로드.

시작 단계에서 시크릿을 못 가져온다는 오류가 나면 실행 역할 문제이고, 앱이 AWS API를 부르다 AccessDenied를 받으면 작업 역할 문제입니다.

### 서비스 배포 파라미터

REPLICA 서비스의 ‹minimumHealthyPercent› 기본값은 100, ‹maximumPercent›는 200입니다. desired가 4이면 새 task 4개를 먼저 띄운 뒤 구버전을 내리므로 무중단이지만 순간적으로 두 배 용량이 필요합니다. 용량이 빠듯하면 50/100처럼 낮춰 구버전을 먼저 줄입니다(그만큼 순간 용량이 감소). ‹healthCheckGracePeriodSeconds›의 기본값은 0이라, 부팅이 느린 앱은 헬스체크를 통과하기 전에 unhealthy로 판정되어 죽고 다시 뜨는 루프에 빠집니다(레슨 7).

### Express Mode, EKS, 단일 서버

**ECS Express Mode**는 컨테이너 이미지와 역할 두 개(작업 실행 역할, 인프라 역할)만 주면 Fargate 서비스, TLS가 붙은 ALB, 오토스케일링, 네트워킹, 모니터링을 한 번에 만들고 이후 업데이트에는 카나리 배포와 5xx 롤백 알람을 붙입니다. 추가 요금은 없고 만들어진 자원 요금만 냅니다(2026-11 문서 기준). 자원이 내 계정에 그대로 생겨 이 모듈의 개념(작업 정의, 서비스, ALB, SG)이 그대로 적용되며, 아래 예제는 구성 요소를 하나씩 이해하려고 일반 ECS 서비스로 진행합니다.

**쿠버네티스**는 서비스 디스커버리, 롤아웃·롤백, 셀프 힐링, 시크릿·설정 관리를 제공하지만 PaaS가 아니며 CI/CD, 로깅, 모니터링, DB를 제공하지 않습니다. 핵심 객체는 Pod, Deployment(롤링 업데이트·롤백), Service, ConfigMap·Secret, probe, requests/limits, HPA입니다.Secret은 base64 인코딩일 뿐 기본 암호화가 아니므로 저장 시 암호화를 따로 설정합니다. 운영 부담은 연 3회 minor 릴리스와 약 14개월의 지원 기간이라 업그레이드가 정기 업무가 된다는 점입니다(1.34는 2026-10-27 지원 종료, 1.37은 2027-10-28 종료 예정, 2026-11 기준). CNCF 2025 조사(2026-01-20)는 컨테이너 사용자의 82%가 프로덕션에서 쿠버네티스를 쓴다고 하므로 시장에서 알아야 하지만, 쓰지 말아야 할 때를 판단하는 것도 실력입니다.

**단일 VM + Compose/Kamal**은 가장 싸고 단순하며 단일 장애점이라는 대가가 있습니다.

### 선택 규칙(제안, 판단)

| 서비스 1~3개, 팀 1~5명, K8s 경험 없음 | ECS Fargate (Express Mode로 시작 가능)
| 예산 최소, 짧은 다운타임 허용 | 단일 VM + Compose/Kamal
| 고객이 이미 K8s 운영, 서비스 다수, GPU 스케줄링 | EKS/K8s
| 고객이 이미 App Runner 사용 중 | 유지하되 Express Mode 이전 계획 수립

국내 클라우드(NCP 등)는 사람인 검색 73건 대 AWS 1,455건(2026-11-09)으로 수요가 작지만 VPC, ACG(SG 대응), 로드밸런서, 관리형 DB 같은 개념은 대응됩니다. 고객 클라우드의 공식 문서로 개념부터 매핑하고, 공공·금융은 클라우드 보안 인증(CSAP 등) 요건을 먼저 확인합니다.`,
      code: `{
  "family": "shop-api",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::111122223333:role/shop-ecs-execution",
  "taskRoleArn": "arn:aws:iam::111122223333:role/shop-api-task",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "111122223333.dkr.ecr.ap-northeast-2.amazonaws.com/shop-api:3f9c2ab",
      "essential": true,
      "portMappings": [{ "containerPort": 8080, "protocol": "tcp" }],
      "stopTimeout": 45,
      "environment": [{ "name": "APP_ENV", "value": "prod" }],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:ssm:ap-northeast-2:111122223333:parameter/shop/prod/database_url"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "python -c \\"import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/healthz', timeout=2)\\""],
        "interval": 15,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 30
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/shop-api",
          "awslogs-region": "ap-northeast-2",
          "awslogs-stream-prefix": "api"
        }
      }
    }
  ]
}`,
      codeLang: `json`,
      key: [
        `선택 기준은 기능이 아니라 운영 주체와 역량이다. 팀이 작고 K8s 경험이 없으면 ECS Fargate(필요하면 Express Mode)가 기본 후보이고, App Runner는 2026-04-30부터 신규 고객을 받지 않는다`,
        `ECS: Task Definition(불변 명세) → Task(실행 단위) → Service(개수 유지·배포·LB 연동). Fargate는 awsvpc로 task마다 SG가 붙는다`,
        `실행 역할(이미지 pull·로그·시크릿 주입)과 작업 역할(앱의 AWS API 호출)을 구분하면 장애 원인을 빨리 가른다`,
        `롤링 배포의 기본값은 최소 정상 비율 100%, 최대 비율 200%이고 헬스체크 유예 시간은 0초다. 부팅이 느린 앱은 유예 시간을 반드시 늘려야 한다(minimumHealthyPercent, maximumPercent, healthCheckGracePeriodSeconds)`,
        `K8s는 PaaS가 아니다. 연 3회 minor 릴리스와 약 14개월 지원이라 업그레이드가 정기 업무이며, 쓰지 말아야 할 조건도 판단 기준에 포함된다`
      ],
      pitfalls: [
        `팀 두 명, 서비스 한 개인 고객에게 EKS 도입을 권하기: 인계 후 운영할 사람이 없어 업그레이드와 장애 대응이 고객의 부담이 된다`,
        `실행 역할과 작업 역할을 한 역할로 합치고 관리자 권한을 부여: 앱 취약점이 곧 계정 전체 권한 탈취가 된다`,
        `awslogs 로그 그룹을 미리 만들지 않아 task가 시작 직후 실패하는 경우를 놓치기: 원인이 앱이 아니라 설정이다`,
        `K8s Secret이 암호화된 것으로 오해하고 Git에 매니페스트를 그대로 올리기: base64는 암호화가 아니다`
      ]
    },
    {
      title: `CD 전략과 롤백: 롤링·블루그린·카나리, 서킷 브레이커, OIDC 배포`,
      body: `CD의 원칙은 두 가지입니다. 첫째, **한 번 빌드한 이미지를 환경 사이에서 승격한다.** staging에서 검증한 이미지(SHA 태그)가 prod에 그대로 가야 하고, 다시 빌드하면 검증한 것과 다른 물건이 나갈 수 있습니다. 둘째, **배포는 되돌릴 수 있어야 한다.** 장애 시간은 배포 속도보다 롤백 속도가 좌우합니다.

### 전략 비교

| 전략 | 방식 | 롤백 | 주의
| 롤링 | 신·구 task를 점진 교체 | 이전 리비전으로 다시 롤링(분 단위) | 두 버전 공존, API·DB 호환 필수
| 블루/그린 | 새 환경을 띄우고 트래픽 전환 | 트래픽 되돌리기(초 단위) | 순간 두 배 비용, DB는 공유
| 카나리 | 소량(예 5%)만 신버전 | 가중치를 0으로 | 지표 기반 판정이 필요
| 재생성 | 전부 내리고 새로 기동 | 느림 | 다운타임 발생

ECS는 deployment controller ‹ECS›가 롤링·블루/그린·선형·카나리를 지원하고(2026-11 문서 기준) CodeDeploy 컨트롤러도 있습니다. 작은 서비스는 롤링에 서킷 브레이커를 얹는 것으로 대개 충분합니다.

### 롤링 + 서킷 브레이커

ECS 서킷 브레이커는 새 task가 RUNNING에 도달하지 못하거나 헬스체크 실패로 교체되는 횟수를 셉니다. 기본 임계값은 desired의 50%이고 최소 3, 최대 200으로 고정(BOUNDED_PERCENT)됩니다. desired가 1이거나 2여도 임계값은 3이라, 새 task가 세 번 연속 실패해야 배포가 FAILED로 판정됩니다. 롤백 옵션을 켜면 마지막 COMPLETED 배포로 자동으로 되돌아가며 이 기능은 rolling(ECS) 컨트롤러에서만 지원됩니다. COMPLETED 배포가 없는 첫 배포나 롤백이 끝나기 전에 시작한 배포는 되돌아갈 곳이 없어 멈춘 채 남으므로, ‹SERVICE_DEPLOYMENT_FAILED› 이벤트를 EventBridge 규칙으로 받아 알림을 걸어 두세요. 함정이 하나 있습니다. CI가 ‹aws ecs wait services-stable›(배포가 하나로 정리되고 실행 수가 원하는 수와 같아지면 통과, 15초 간격 40회 뒤 종료 코드 255)만 믿으면 롤백이 끝나 안정이 된 상태도 성공으로 보입니다. 배포 뒤에 서비스의 작업 정의가 새 리비전인지 확인해야 합니다(예제 코드 마지막 줄).

### 배포 중 5xx의 세 원인

1. **헬스체크 설계**: ALB가 보는 경로는 readiness여야 한다. 반대로 DB 연결까지 헬스체크에 넣으면 DB 장애 때 모든 task가 동시에 unhealthy가 되어 전체 교체 루프로 장애가 증폭된다.
2. **부팅 시간 > 유예 시간**: healthCheckGracePeriodSeconds와 컨테이너 startPeriod를 부팅 시간보다 길게 잡는다.
3. **종료 처리**: ALB deregistration delay의 기본값은 300초이며, 해제 중인 타겟은 새 요청을 받지 않고 진행 요청이 끝나길 기다린다(진행 중 요청과 연결이 없으면 곧바로 끝난다). 앱이 그 전에 연결을 끊으면 클라이언트는 5xx를 받는다. 요청이 몇 초 안에 끝나는 API라면 값을 30~60초로 줄여 배포 시간을 단축하되 가장 긴 요청 시간보다 길게 둔다.

### DB 스키마는 롤백되지 않는다

이미지는 되돌려도 마이그레이션은 되돌리기 어렵습니다. **expand/contract**로 나눕니다. ① 새 컬럼을 nullable로 추가(구버전과 호환) → ② 앱이 신·구 컬럼 모두 쓰기 → ③ 백필 → ④ 읽기 전환 → ⑤ 다음 릴리스에서 구 컬럼 제거. 마이그레이션은 앱 인스턴스가 기동하며 동시에 돌리게 두지 말고 파이프라인의 별도 단계(일회성 task)에서 한 번만 실행합니다.

### 장기 키 없이 배포하기: GitHub OIDC

GitHub Secrets에 IAM 액세스 키를 넣으면 유출 시 만료 없이 쓰입니다. OIDC에서는 job마다 GitHub가 단기 서명 토큰(JWT)을 발급하고(‹permissions: id-token: write›), AWS STS가 신뢰 정책을 검사해 임시 자격을 줍니다. 신뢰 정책의 핵심 조건은 aud(‹sts.amazonaws.com›)와 sub입니다. sub는 ‹repo:ORG/REPO:ref:refs/heads/BRANCH›나 ‹repo:ORG/REPO:environment:ENV› 형식이고, ‹repo:ORG/REPO:*›처럼 와일드카드를 쓰면 그 저장소의 모든 브랜치와 PR이 이 역할을 맡을 수 있습니다. prod 역할은 environment:prod로 좁히고 GitHub Environment에 필수 리뷰어를 겁니다. 2026-07-15 이후 생성된 저장소(또는 opt-in한 저장소)는 sub에 불변 owner·repo ID가 포함되는 형식이 되므로 신뢰 정책의 sub를 그 형식에 맞춰야 합니다(GHES 제외, 2026-11 문서 기준). 배포 역할 권한은 ECR push, ECS 작업 정의 등록·서비스 갱신, 그리고 task·execution 역할로만 한정한 ‹iam:PassRole›이면 됩니다.`,
      code: `name: deploy-prod
on:
  push:
    tags: ["v*"]

permissions:
  id-token: write      # OIDC 토큰 발급에 필요
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: prod  # 필수 리뷰어와 환경 보호 규칙이 여기서 걸린다
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      # 2026-11 확인 최신 메이저: configure-aws-credentials v6 (실무에서는 SHA 고정)
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::111122223333:role/gha-deploy-prod
          aws-region: ap-northeast-2
      - name: 빌드와 푸시 (이미지 태그 = 커밋 SHA)
        run: |
          REGISTRY=111122223333.dkr.ecr.ap-northeast-2.amazonaws.com
          IMAGE="$REGISTRY/shop-api:$GITHUB_SHA"
          aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY"
          docker build -t "$IMAGE" .
          docker push "$IMAGE"
          echo "IMAGE=$IMAGE" >> "$GITHUB_ENV"
      - name: 새 작업 정의 등록 후 서비스 갱신
        run: |
          aws ecs describe-task-definition --task-definition shop-api --query taskDefinition > td.json
          jq --arg img "$IMAGE" 'del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy) | .containerDefinitions[0].image = $img' td.json > td-new.json
          NEW=$(aws ecs register-task-definition --cli-input-json file://td-new.json --query taskDefinition.taskDefinitionArn --output text)
          aws ecs update-service --cluster shop --service shop-api --task-definition "$NEW" > /dev/null
          aws ecs wait services-stable --cluster shop --services shop-api
          # 안정 상태가 롤백 후 안정일 수 있으므로 서비스가 새 리비전인지 확인한다
          aws ecs describe-services --cluster shop --services shop-api | jq -e --arg td "$NEW" '.services[0].taskDefinition == $td'`,
      codeLang: `yaml`,
      key: [
        `같은 이미지(SHA 태그)를 환경 사이에서 승격한다. 재빌드는 검증을 무효로 만든다`,
        `ECS 서킷 브레이커 기본 임계값은 desired의 50%를 최소 3·최대 200으로 고정한 값이고, rolling(ECS) 컨트롤러에서만 쓸 수 있다. 롤백 옵션을 켜야 자동 복귀한다`,
        `배포 중 5xx의 3대 원인은 헬스체크 설계, 유예 시간 부족, 종료 처리(deregistration delay 기본 300초, SIGTERM 처리)다`,
        `스키마는 앱처럼 롤백되지 않는다. expand/contract로 여러 릴리스에 나누고 마이그레이션은 파이프라인에서 한 번만 실행한다`,
        `OIDC 신뢰 정책은 aud=sts.amazonaws.com과 구체적인 sub(저장소+환경)로 좁힌다. 와일드카드 sub는 모든 PR에 prod 권한을 주는 것과 같다`
      ],
      pitfalls: [
        `services-stable 대기 성공만 보고 배포 성공으로 판단: 서킷 브레이커가 롤백한 뒤의 안정 상태도 성공처럼 보인다`,
        `헬스체크 엔드포인트가 DB 쿼리를 수행: 일시적인 DB 지연이 전 task를 동시에 unhealthy로 만들어 전체 장애가 된다`,
        `컬럼 삭제·이름 변경을 앱 배포와 같은 릴리스에 넣기: 롤백해도 구버전이 새 스키마와 맞지 않아 오류가 계속된다`,
        `ECR 수명주기 정책이 롤백 대상 이미지를 지우는 설정: 롤백 시점에 이미지를 가져오지 못한다. 최근 N개 이상은 항상 보존한다`
      ]
    },
    {
      title: `IaC: Terraform과 OpenTofu, 상태·드리프트·변경 승인`,
      body: `콘솔 클릭으로 만든 인프라는 재현할 수 없고, 리뷰할 수 없고, 인수인계할 수 없습니다. dev·staging·prod 세 환경을 손으로 만들면 어느새 서로 달라집니다(드리프트). IaC는 원하는 최종 상태를 코드(HCL)로 선언하고 Git으로 버전 관리하며 PR에서 변경을 리뷰하는 방식입니다.

### 세 요소: 코드, 상태, 프로바이더

Terraform은 **설정 파일(HCL)**, **상태(state)**, **프로바이더(AWS API 호출 플러그인)** 로 동작합니다. 상태는 코드 속 리소스와 실제 리소스를 짝지은 기록입니다. ‹plan›은 의존성 그래프를 만들고 실제 리소스를 새로 읽어 상태와 코드를 비교해 차이를 계산합니다. ‹+› 생성, ‹~› 제자리 수정, ‹-/+› 교체(삭제 후 재생성), ‹-› 삭제로 표시됩니다. ‹apply›가 그 계획을 실행합니다. 상태를 잃으면 Terraform은 이미 있는 리소스를 모르는 채 다시 만들려 하므로, 상태는 원격(S3 + 버저닝 + 암호화)에 두고 동시 실행은 잠금으로 막습니다. S3 백엔드는 ‹use_lockfile = true›로 S3 자체에 잠금 파일을 두는 방식을 지원하고 DynamoDB 잠금은 deprecated 상태입니다(2026-11 문서 기준). 상태에는 DB 비밀번호 같은 값이 평문으로 들어갈 수 있으므로 상태 버킷 접근을 제한하고 암호화합니다. ‹sensitive› 변수는 출력만 가릴 뿐 상태에는 남습니다.

### plan 읽기가 핵심 기술이다

가장 위험한 줄은 ‹must be replaced›와 ‹-/+›입니다. 보안 개선 PR이 DB의 ‹storage_encrypted›를 바꾸면 plan은 DB 교체를 보여 주고, apply하면 새 빈 DB가 만들어지고 기존 DB는 사라집니다. 맨 끝줄 ‹Plan: 1 to add, 0 to change, 1 to destroy›에서 destroy가 0이 아닌지 먼저 봅니다. 방어선은 RDS ‹deletion_protection›과 최종 스냅샷, Terraform의 ‹lifecycle { prevent_destroy = true }›, 그리고 CI에서 plan 결과를 PR에 코멘트로 남기는 리뷰입니다.

### 드리프트와 변경 승인

누군가 콘솔에서 값을 바꾸면 다음 plan이 되돌리려 합니다. ‹terraform plan -refresh-only›로 차이를 확인하고 사람에게 콘솔 쓰기 권한을 주지 않는 것이 근본 대책입니다. 승인 흐름은 PR → CI에서 fmt·validate·plan → 리뷰 → main 머지 → 환경 승인 후 apply입니다. plan 역할은 읽기 전용, apply 역할은 별도 OIDC 역할로 분리합니다.

### 구조: 환경 분리와 모듈

환경별로 디렉터리(‹envs/dev›, ‹envs/prod›)와 별도의 상태 키를 두면 한 환경의 실수가 다른 환경으로 번지지 않습니다. 반복되는 묶음은 모듈로 만들고 프로바이더 버전을 제약(‹~> 6.0›)하며 ‹.terraform.lock.hcl›을 커밋해 모든 사람이 같은 프로바이더를 씁니다. 이미 있는 인프라를 인계받으면 ‹import› 블록으로 단계적으로 코드로 옮깁니다.

### Terraform과 OpenTofu

2026-11 열람 기준 Terraform은 1.17.x(1.17.1), OpenTofu는 1.13.x(1.13.9) 계열입니다. HashiCorp는 Terraform에 BSL 1.1 라이선스를 적용합니다. 이 문서는 경쟁 제품을 제3자에게 제공하는 용도를 제한하고, 버전별로 최대 4년 뒤 MPL 2.0으로 전환된다고 설명합니다. 고객 인프라를 관리하는 일반 용도와는 거리가 멀지만, IaC 기능을 서비스로 제공하는 구조라면 확인이 필요합니다. 현재 각 버전의 구체적 적용·전환일은 확인한 자료에 없으므로 계약 전에 확인하세요. OpenTofu는 Linux Foundation 산하이고 MPL-2.0으로 표기되며 상태 암호화(1.7) 같은 고유 기능이 있습니다. 두 도구는 같은 코드로 시작할 수 있어도 버전별 기능이 갈라지므로 **계약서와 README에 도구·버전을 명시하고 한 저장소에서 섞어 쓰지 않습니다.**`,
      code: `terraform {
  required_version = ">= 1.11"          # S3 네이티브 잠금(use_lockfile)은 1.11부터 정식
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
  backend "s3" {
    bucket       = "acme-tfstate-111122223333"   # 버저닝·암호화·접근 제한을 켠 전용 버킷
    key          = "shop/prod/terraform.tfstate"
    region       = "ap-northeast-2"
    encrypt      = true
    use_lockfile = true                          # S3 네이티브 잠금(.tflock 파일)
  }
}

provider "aws" {
  region = "ap-northeast-2"
  default_tags {
    tags = { Project = "shop", Env = "prod", ManagedBy = "terraform" }
  }
}

# GitHub OIDC 공급자는 계정에 한 번 만들어 두었다고 가정한다
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_role" "deploy" {
  name = "gha-deploy-prod"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = data.aws_iam_openid_connect_provider.github.arn }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:acme-corp/shop-api:environment:prod"
        }
      }
    }]
  })
}`,
      codeLang: `hcl`,
      key: [
        `IaC는 선언형 코드 + 상태 + 프로바이더다. plan(차이 계산)과 apply(실행)를 분리하고 PR에서 plan을 리뷰한다`,
        `상태는 원격(S3 버저닝·암호화)에 두고 잠금(use_lockfile)을 켠다. 상태에는 시크릿이 평문으로 들어갈 수 있으니 접근을 제한한다`,
        `plan에서 먼저 볼 것은 must be replaced, -/+, destroy 개수다. DB는 deletion_protection, 최종 스냅샷, prevent_destroy로 방어한다`,
        `드리프트는 plan(-refresh-only 포함)으로 발견하고 콘솔 쓰기 권한 제거로 예방한다. 환경별로 디렉터리와 상태 키를 분리한다`,
        `Terraform(BSL 1.1)과 OpenTofu(MPL-2.0)는 도구와 버전을 계약서·README에 명시하고 혼용하지 않는다`
      ],
      pitfalls: [
        `plan 요약의 add 개수만 보고 승인: 교체는 add 1과 destroy 1로 나타나 데이터 손실을 놓친다`,
        `상태 파일을 로컬에 두거나 Git에 커밋: 분실·충돌로 리소스가 고아가 되고 시크릿이 저장소에 노출된다`,
        `하나의 상태에 모든 환경을 넣고 workspace만 바꿔 쓰기: 잘못된 workspace에서 apply하면 prod가 바뀐다`,
        `provider 버전 제약과 lock 파일 없이 배포: 같은 코드가 팀원마다 다르게 동작하고 업그레이드로 갑자기 깨진다`
      ]
    },
    {
      title: `운영 기본기: 시크릿, 도메인·TLS, 로그, 비용, 백업`,
      body: `배포가 돌아가도 운영이 취약하면 고객은 불안합니다. 외주에서 이 영역은 눈에 안 보이지만 사고가 나면 가장 크게 보입니다.

### 시크릿

시크릿은 코드, 이미지, Git, compose 파일, tfvars, Actions 로그 어디에도 넣지 않습니다. AWS에서는 두 저장소를 씁니다. **SSM Parameter Store**(SecureString, KMS 암호화, 표준 파라미터는 추가 비용 없음)와 **Secrets Manager**(자동 로테이션 지원, 시크릿당 월 정액과 API 호출 요금이 붙으니 최신 요금표 확인)입니다. ECS의 ‹secrets› 필드는 task 시작 시점에 값을 주입하므로 값을 바꾸면 새 task를 띄워야 반영되고, 이 주입은 실행 역할의 권한이 필요합니다. 앱이 SDK로 직접 읽는 방식은 재배포 없이 갱신할 수 있지만 코드와 권한이 늘어납니다. 경로 기반 권한(‹/shop/prod/*›)으로 환경을 분리합니다. 유출 대응은 순서가 중요합니다. 폐기·회전이 먼저, CloudTrail로 사용 이력 확인, 원인 제거, Git 히스토리 정리는 그 다음입니다. 공개된 키는 이미 유출된 것으로 가정합니다. gitleaks나 GitHub secret scanning(push protection)을 CI에 넣어 예방합니다.

### 도메인, DNS, TLS

흐름은 등록기관 → NS 위임 → Route 53 호스팅 영역 → 알리아스 → ALB 443(ACM 인증서) → 타겟입니다. ACM의 DNS 검증용 CNAME 레코드는 갱신에도 쓰이므로 지우면 몇 달 뒤 인증서 갱신이 실패해 만료 장애가 납니다. 직접 certbot을 운영한다면 갱신 실패 알림을 반드시 걸고, 공개 인증서 수명이 짧아지는 추세이므로 자동화가 필수입니다. 도메인 컷오버 전에는 TTL을 미리 낮춰 두어야 되돌리기가 빠릅니다(네트워크 모듈의 DNS 캐시 복습).

### 로그와 알람

앱은 구조화 JSON을 stdout으로 내보내고 CloudWatch Logs에 모읍니다. **로그 그룹의 보존 기간은 기본 무기한**이라 설정하지 않으면 비용이 계속 쌓입니다. 최소 알람은 ALB 5xx 비율, 타겟 헬스, ECS CPU·메모리, RDS 연결 수·여유 스토리지입니다. 관측성의 깊이는 별도 모듈에서 다루지만 이 최소 세트 없이 인계하면 안 됩니다.

### 비용 관리

청구서의 구성은 컴퓨트(Fargate vCPU·GB 시간), ALB(시간+사용량), NAT Gateway, 퍼블릭 IPv4, RDS(인스턴스·스토리지·백업·Multi-AZ), 데이터 전송, 로그 수집·저장, ECR 저장입니다. 2026-11 열람 기준 NAT Gateway는 시간당 $0.045와 GB당 $0.045(오하이오 요금표), 퍼블릭 IPv4는 시간당 $0.005이므로 NAT 1개가 월 약 $33, 주소 5개가 월 약 $18입니다(처리량·리전 별개). 관리 수단은 AWS Budgets의 예산과 80%·100% 알림, 비용 할당 태그(Project, Env, Owner를 만들고 결제 콘솔에서 활성화), Cost Explorer, 개발 환경의 야간 중지, 정리 스크립트입니다. 월 비용 추정은 AWS Pricing Calculator로 하고 가정(트래픽, 로그 양, 인스턴스 수)을 함께 적습니다.

### 백업과 복구

RDS 자동 백업 보존 기간과 PITR, 수동 스냅샷, S3 버저닝, Terraform 상태 버저닝을 둡니다. **복원해 본 적 없는 백업은 백업이 아닙니다.** 새 인스턴스로 실제 복원하고 걸린 시간을 RTO로, 잃는 데이터 구간을 RPO로 기록합니다. Multi-AZ는 가용성이지 백업이 아니라는 점도 구분해 설명합니다.

### 방어적 보안 기본선

루트 MFA, CloudTrail 활성화, S3 Block Public Access, SSH 포트 대신 Session Manager, IMDSv2, 개인정보가 오가면 접근 로그와 암호화 위치 확인. 개정 개인정보 보호법(2026-09-11 시행)이 유출 통지와 과징금을 강화했으므로 고객은 이 항목들을 계약 요건으로 요구할 수 있습니다.`,
      code: `import os


def load_config(prefix: str = "/shop/prod/") -> dict:
    """로컬에서는 환경 변수, AWS에서는 SSM Parameter Store(SecureString)에서 읽는다."""
    if os.environ.get("APP_ENV", "local") == "local":
        return {k: v for k, v in os.environ.items() if k in ("DATABASE_URL", "REDIS_URL")}

    import boto3                                       # 로컬 개발 환경에는 boto3가 없어도 된다
    ssm = boto3.client("ssm")
    cfg, token = {}, None
    while True:
        kwargs = {"Path": prefix, "Recursive": True, "WithDecryption": True}
        if token:
            kwargs["NextToken"] = token
        page = ssm.get_parameters_by_path(**kwargs)    # 한 번에 최대 10개: 페이지 처리 필수
        for p in page["Parameters"]:
            cfg[p["Name"].removeprefix(prefix).upper()] = p["Value"]
        token = page.get("NextToken")
        if not token:
            return cfg`,
      codeLang: `python`,
      key: [
        `시크릿은 코드·이미지·Git·로그 밖에 둔다. SSM SecureString 또는 Secrets Manager, 경로 기반 최소 권한. ECS secrets 주입은 task 시작 시점이다`,
        `유출 대응 순서는 폐기·회전 → 사용 이력 확인(CloudTrail) → 원인 제거 → 히스토리 정리다. 공개된 값은 이미 유출로 본다`,
        `ACM 검증 CNAME을 지우지 않는다. 컷오버 전에 TTL을 낮추고, 만료·갱신 실패에 알림을 건다`,
        `로그 그룹 보존 기간을 설정한다(기본 무기한). 최소 알람은 5xx, 타겟 헬스, CPU·메모리, DB 연결·스토리지다`,
        `예산 알림·비용 할당 태그·가정이 적힌 비용 추정서가 비용 관리의 최소 세트이고, 복원 훈련을 해 봐야 백업이다`
      ],
      pitfalls: [
        `환경 변수에 시크릿을 평문으로 넣고 작업 정의를 Git에 커밋: 정의 문서에서 값이 그대로 드러난다. 값 대신 참조(valueFrom)를 쓴다`,
        `ACM 검증 레코드나 hosted zone을 정리 작업 중 삭제: 인증서가 갱신되지 않아 몇 달 뒤 사이트가 갑자기 만료 경고를 낸다`,
        `예산 알림 없이 실습·테스트 환경을 방치: NAT·ALB·RDS의 시간 과금으로 예상 밖 청구서가 나온다`,
        `백업이 있다는 사실만 확인하고 복원은 한 번도 하지 않기: 필요할 때 복원이 실패하거나 RTO가 계약과 맞지 않는다`
      ]
    },
    {
      title: `통합 사례: 수동 SSH 배포 서비스를 재현 가능한 파이프라인으로 인수인계하기`,
      body: `고객은 직원 7명의 쇼핑몰 스타트업입니다. API는 EC2 한 대에서 돌고 배포는 개발자가 SSH로 들어가 ‹git pull›과 서비스 재시작을 하는 방식입니다. DB는 같은 EC2의 MySQL이고, 비밀번호가 코드에 있으며, 백업은 없고, 배포 때 1~2분 다운됩니다. 요청은 네 가지입니다. 무중단에 가까운 배포, 장애 시 빠른 롤백, 월 비용을 예측할 수 있을 것, 개발자가 바뀌어도 이어받을 수 있을 것입니다. 이 레슨은 앞의 모든 것을 한 프로젝트로 엮습니다.

### 1단계: 견적 전 발견

코드를 보기 전에 질문합니다. 현재 구조와 월 청구액, 피크 트래픽, DB 크기, 허용 다운타임, 가용성 목표, 개인정보 포함 여부, AWS 계정 소유자와 권한, 월 비용 상한, 개발팀의 운영 역량, 이후 운영 책임 주체입니다. 결과물은 **가정과 위험 목록**입니다. 예를 들어 DB 크기 20GB, 컷오버 시 15분 점검창 허용, 계정은 고객 소유이고 내가 역할을 위임받는다는 식입니다.

### 2단계: 후보 비교와 선택

- A. 단일 EC2 + Compose + Kamal: 가장 싸지만 단일 장애점이고 DB 백업을 직접 챙겨야 한다.
- B. ECS Fargate + ALB + RDS: 팀에 K8s 경험이 없고 서버 관리를 줄이고 싶다는 요구에 맞는다. 고정비(ALB, RDS, 퍼블릭 IPv4)가 생긴다. App Runner는 신규 계정에서 쓸 수 없어 후보에서 뺀다.
- C. EKS: 서비스 한 개에는 과하고 인계 후 운영 부담이 고객에게 간다.

B를 기본으로 두고 비용 구조를 항목별로 적습니다. 컴퓨트, ALB, RDS(단일 AZ와 Multi-AZ 두 안), 퍼블릭 IPv4, 로그, 데이터 전송입니다. NAT Gateway는 월 약 $33(오하이오 요금표 기준 730시간, 2026-11)의 고정비라서, 이 규모에서는 퍼블릭 서브넷의 task에 SG로 ALB 트래픽만 허용하는 구성을 먼저 검토하고 보안 요건이 엄격하면 NAT나 VPC 엔드포인트를 추가한다고 trade-off를 설명합니다. 정확한 금액은 Pricing Calculator로 산출해 가정과 함께 붙입니다.

### 3단계: 단계적 이전

1주차: Dockerfile과 CI(레슨 2·4), 시크릿을 코드에서 SSM으로 이동하고 이전 비밀번호를 회전. 2주차: Terraform으로 VPC, ALB, ECR, ECS, RDS, 로그, 예산 알림(레슨 5~8). 3주차: OIDC 배포 파이프라인과 서킷 브레이커, 스테이징에서 롤백 훈련(레슨 7). 4주차: 데이터 이전과 DNS 컷오버, 모니터링·런북·인계.

컷오버는 이렇게 설계합니다. 며칠 전에 TTL을 낮추고, 점검창에서 쓰기를 멈춘 뒤 덤프를 복원하고, 새 환경에서 스모크 테스트를 통과하면 DNS를 전환합니다. 구 서버는 7일간 읽기 전용으로 유지합니다. **롤백 트리거는 사전에 합의**합니다. 예를 들어 5xx 비율이 5분 이상 임계값을 넘으면 DNS를 되돌립니다.

### 4단계: 인수인계

납품물은 코드만이 아닙니다. Terraform 코드와 README(아키텍처 그림, 배포·롤백 명령 한 줄), 장애 유형별 런북(5xx 급증, DB 연결 포화, 배포 실패, 인증서·도메인, 디스크·메모리), 권한과 시크릿 위치 목록, 비용 추정서와 예산 알림 화면, 인수인계 세션 기록입니다. 마지막으로 내 임시 권한을 회수합니다.

### 사고 시나리오로 검증

배포 직후 5xx가 올랐다면 우선 서킷 브레이커가 작동했는지 이벤트를 보고, 아니면 롤백 스크립트로 직전 리비전을 배포합니다(코드). 그 뒤에 원인을 찾습니다. 이 순서를 훈련으로 한 번 해 본 팀만이 새벽 장애에서 실제로 쓸 수 있습니다. 마이그레이션이 섞인 릴리스라면 이미지 롤백이 소용없을 수 있으므로 expand/contract 규칙을 릴리스 체크리스트에 넣습니다.`,
      code: `#!/usr/bin/env bash
# 사용법: ./rollback.sh <cluster> <service>   (직전 작업 정의 리비전으로 되돌린다)
# 주의: "직전 리비전"이 "마지막으로 정상 배포된 리비전"과 다를 수 있다(등록만 하고 배포 안 한 리비전).
#       실무에서는 정상 배포 때마다 리비전 번호를 기록해 두고 그 값을 인자로 받는 편이 안전하다.
set -euo pipefail
cluster="$1"; service="$2"

current=$(aws ecs describe-services --cluster "$cluster" --services "$service" \\
  --query 'services[0].taskDefinition' --output text)
family=$(basename "$current" | cut -d: -f1)

# 최신순 목록에서 현재 리비전 바로 다음 항목(= 직전 리비전)을 고른다
previous=$(aws ecs list-task-definitions --family-prefix "$family" --sort DESC \\
  --query 'taskDefinitionArns' --output text | tr '\\t' '\\n' \\
  | grep "/$family:" | grep -A1 -Fx "$current" | tail -n1 || true)

if [ -z "$previous" ] || [ "$previous" = "$current" ]; then
  echo "되돌릴 직전 리비전이 없다" >&2
  exit 1
fi

echo "rollback: $current -> $previous"
aws ecs update-service --cluster "$cluster" --service "$service" --task-definition "$previous" > /dev/null
aws ecs wait services-stable --cluster "$cluster" --services "$service"
echo "done"`,
      codeLang: `bash`,
      key: [
        `견적 전 발견 단계의 산출물은 가정과 위험 목록이다. 계정 소유, 허용 다운타임, 가용성 목표, 비용 상한이 범위를 결정한다`,
        `후보(단일 VM, ECS Fargate, EKS)를 비용 구조와 운영 부담으로 비교해 고객의 역량에 맞는 것을 고르고 trade-off를 문서로 남긴다`,
        `컷오버는 TTL 사전 인하, 점검창, 스모크 테스트, 구 서버 유지, 사전에 합의한 롤백 트리거로 설계한다`,
        `인수인계 = IaC + 한 줄 배포·롤백 명령 + 런북 + 권한·시크릿 목록 + 비용 추정서와 예산 알림 + 내 권한 회수`,
        `롤백은 스크립트로 만들어 훈련해 두어야 새벽에 쓸 수 있다. 마이그레이션이 섞이면 이미지 롤백만으로 부족하다`
      ],
      pitfalls: [
        `견적서에 가정을 적지 않고 무중단이나 고가용성을 약속: 데이터 이전·DB 스키마 변경이 포함되는지 합의가 없어 범위 분쟁이 생긴다`,
        `새 환경 검증 없이 DNS를 바로 전환하고 구 서버를 즉시 삭제: 문제가 생기면 돌아갈 곳이 없다`,
        `인계 문서 없이 코드만 전달: 담당자가 바뀌면 배포·롤백 절차를 아무도 모르고 결국 콘솔로 수동 수정해 드리프트가 생긴다`,
        `작업 종료 후에도 내 IAM 권한과 토큰을 남기기: 이후 사고에서 책임 소재가 불분명해지고 보안 위험이 된다`
      ]
    }
  ],
  labs: [
    {
      title: `Docker 이미지 다이어트와 시그널 처리 실험`,
      scenario: `고객이 넘긴 샘플 API(FastAPI나 Node, 직접 만든 것도 좋다)는 풀 사이즈 베이스 이미지에 COPY . . 한 줄로 만든 Dockerfile을 쓰고 있다. 빌드는 매번 몇 분 걸리고, 이미지는 크고, 컨테이너는 root로 돌며, docker stop을 하면 10초 가까이 걸린다. 당신의 일은 이 이미지를 측정 가능한 방식으로 개선하고 전후를 숫자로 보고하는 것이다. 준비물은 Docker(또는 Docker Desktop), 샘플 API 한 개, 무료 CLI인 Trivy다. 모든 실험은 로컬에서 이뤄지며 비용이 들지 않는다.`,
      steps: [
        `/healthz, /readyz가 있고 SIGTERM을 처리하는 샘플 API를 준비한다(레슨 1 예제를 써도 된다). 나쁜 Dockerfile(풀 이미지, COPY . . 먼저, root, 셸 형식 CMD, .dockerignore 없음)로 빌드해 docker images의 크기와 빌드 시간을 baseline으로 기록한다.`,
        `소스 한 줄만 바꿔 다시 빌드하고 의존성 설치 단계가 다시 실행되는 것을 확인한 뒤 걸린 시간을 기록한다.`,
        `의존성 파일을 먼저 복사하도록 순서를 고치고 .dockerignore(.git, 가상환경, .env, 테스트 산출물)를 추가한다. 소스만 바꿔 재빌드해 의존성 단계가 CACHED로 표시되는지 확인한다.`,
        `멀티스테이지, slim 베이스, 고정 UID(10001) 비루트 실행으로 바꾼 뒤 크기와 빌드 시간을 기록하고 docker run --rm 이미지 id로 uid가 0이 아님을 확인한다.`,
        `시그널 실험: ENTRYPOINT를 exec 없이 파이썬을 호출하는 start.sh로 바꿔 time docker stop을 측정한다. 마지막 줄을 exec python으로 고쳐 다시 측정한다.`,
        `.env를 COPY한 이미지를 만들고 다음 RUN에서 지운 뒤 docker history와 docker save로 파일이 레이어에 남아 있음을 확인한다. 그다음 .dockerignore로 막고 다시 확인한다.`,
        `Trivy로 전후 이미지를 스캔해 HIGH·CRITICAL 개수를 기록하고, 남은 항목을 베이스 이미지 갱신으로 해결되는 것과 앱 의존성 문제로 분류한다.`,
        `컨테이너에 --memory=64m 제한을 걸고 메모리를 계속 할당하는 엔드포인트로 OOM을 재현해 종료 코드와 docker inspect의 OOMKilled 값을 기록한다.`,
        `전후 수치를 표로 정리하고 Dockerfile 설계 근거 5줄을 README에 적는다.`
      ],
      accept: [
        `최종 이미지 크기가 baseline 대비 50% 이상 줄었고 두 수치가 docker images 출력과 함께 README 표에 있다`,
        `소스 한 줄만 바꾼 재빌드에서 의존성 설치 단계가 CACHED로 표시되고 재빌드 시간이 baseline 재빌드의 절반 이하다`,
        `docker run --rm 이미지 id가 uid 0이 아님을 보이고, exec 형식의 docker stop이 3초 이내이며 exec 없는 래퍼는 10초 안팎임을 측정값으로 제시한다`,
        `OOM 실험의 종료 코드 137과 OOMKilled true 증거가 있고, docker history 검사로 .env가 최종 이미지에 없음을 확인한 기록이 있다`
      ],
      stretch: `Docker Hardened Images 또는 distroless 베이스로 바꿔 크기와 CVE 수를 비교하고, BuildKit 시크릿 마운트로 private 패키지 설치를 구현하며, buildx로 amd64와 arm64 멀티 아키텍처 이미지를 만들어 보라.`
    },
    {
      title: `GitHub Actions CI와 공급망 보안 하드닝`,
      scenario: `고객 저장소에는 CI가 없어 테스트 없이 PR이 머지되고, 누군가 만든 워크플로가 PR 제목을 셸에 그대로 끼워 넣는다는 보안 지적이 들어왔다. 당신은 공개 연습 저장소(공개 저장소의 GitHub-hosted 러너 사용은 무료)를 만들어 CI를 설계하고, 취약한 워크플로를 일부러 만들어 공격을 재현한 뒤 고친다. 모든 실험은 본인 소유 저장소에서만 하고 페이로드는 echo 같은 무해한 명령만 쓴다. 준비물은 GitHub 계정과 Lab 1의 샘플 API다.`,
      steps: [
        `연습 저장소(공개)에 Lab 1의 API, pytest 테스트 5개 이상(DB 접속 테스트 1개 포함), Dockerfile을 올린다.`,
        `ci.yml을 작성한다. PR과 main push 트리거, permissions contents read, timeout-minutes, Postgres 서비스 컨테이너, 린트 → 테스트 → docker build 순서로 앞 단계 실패 시 중단되게 한다.`,
        `의존성 캐시 없이 3회, 캐시를 켜고 3회 실행해 job 소요 시간의 중앙값을 비교 기록한다.`,
        `브랜치 보호 규칙으로 CI 성공을 머지 필수 조건으로 만들고, 일부러 테스트를 깨뜨린 PR이 머지 차단되는 화면을 캡처한다.`,
        `취약 워크플로를 별도 파일로 작성한다. PR 제목 컨텍스트를 run 블록 안에 달러 기호와 이중 중괄호 표현식으로 직접 끼워 echo하게 한다. 제목이 x"; echo INJECTED; echo " 인 PR을 열어 로그에 INJECTED가 별도 명령의 출력으로 찍히는지 확인한다.`,
        `고치기: 값을 env로 받아 따옴표로 감싼 셸 변수로 참조하게 바꾸고, 같은 제목으로 다시 실험해 이번에는 문자열이 그대로 출력됨을 확인한다.`,
        `모든 서드파티 uses를 전체 커밋 SHA(40자리)로 고정하고 주석에 태그를 적는다. Dependabot 설정(github-actions, docker 생태계)을 추가한다.`,
        `워크플로의 uses 중 SHA로 고정되지 않은 것이 0개임을 확인하는 검사 스크립트(grep이나 정규식)를 CI에 넣는다.`,
        `저장소 설정에서 Actions 기본 토큰 권한을 읽기 전용으로 바꾸고, 쓰기 권한이 필요한 job만 permissions를 명시했는지 점검표로 작성한다.`
      ],
      accept: [
        `캐시 on/off 별 job 시간 중앙값(각 3회)이 표로 있고, 차이가 없다면 이유를 설명했다`,
        `테스트를 깨뜨린 PR의 머지 차단 캡처, 취약 워크플로의 INJECTED 재현 로그, 수정 후 리터럴 출력 로그가 모두 있다`,
        `uses 중 SHA 미고정이 0개임을 CI가 자동 검사하고 최상위 permissions가 최소 권한이다`,
        `워크플로와 로그에 시크릿이 평문으로 노출되지 않았음을 확인한 저장소 전체 grep 결과가 첨부되어 있다`
      ],
      stretch: `pull_request_target 워크플로가 왜 위험한지 본인의 다른 계정 저장소에서 안전하게 재현해 보고, workflow_run으로 권한을 분리한 설계로 바꿔 보라. zizmor 같은 워크플로 정적 분석 도구(무료)를 돌려 나온 지적 사항을 정리하라.`
    },
    {
      title: `[납품형] ECS Fargate 자동 배포 + Terraform + 1분대 롤백 + 비용 추정서`,
      scenario: `가상의 고객은 EC2 한 대에서 SSH로 배포하는 쇼핑몰 API를 운영하는 스타트업이다. 요구는 네 가지다. 태그 기준 자동 배포, 장애 시 1분대 롤백, 월 AWS 비용 추정과 상한 알림, 인프라를 코드로 인수인계. 당신은 Lab 1의 샘플 API로 이 납품물을 만들고 고객용 인수인계 문서까지 제출한다. 필요한 것은 AWS 계정(개인 실습 계정), Terraform 또는 OpenTofu, GitHub 저장소다. ALB·Fargate·RDS는 시간 과금이므로 예산 알림을 먼저 걸고 끝나면 반드시 destroy한다. 비용을 줄이려면 NAT Gateway 없이 퍼블릭 서브넷의 task에 SG로 ALB 트래픽만 허용하고, RDS는 생략하거나 최소 사양으로 시간을 제한한다.`,
      steps: [
        `AWS Budgets 월 예산과 80%·100% 이메일 알림을 먼저 만들고, 루트 MFA와 일상용 IAM Identity Center(또는 IAM 사용자)를 확인한다.`,
        `Terraform 원격 상태(S3 버킷 버저닝·암호화, use_lockfile)를 부트스트랩한다. VPC(2 AZ 퍼블릭 서브넷), ALB와 SG 체인, ECR(태그 불변, 수명주기 정책), ECS 클러스터와 서비스(Fargate 2 task, 서킷 브레이커 롤백 켬), 타겟 그룹(deregistration delay 30초, 헬스체크 간격 10초), 로그 그룹(보존 14일), 태그(Project, Env, Owner)를 코드로 정의한다.`,
        `GitHub OIDC 공급자와 배포 역할을 Terraform으로 만든다. 신뢰 정책 sub를 특정 저장소와 환경으로 제한하고, 권한은 ECR push, ECS 작업 정의 등록·서비스 갱신, task 역할로 한정한 PassRole만 준다. 저장소에는 장기 액세스 키를 넣지 않는다.`,
        `레슨 7의 deploy 워크플로를 작성한다(태그 푸시 → 이미지 빌드·푸시 → 새 작업 정의 → 서비스 갱신 → 새 리비전 확인). GitHub Environment prod에 필수 리뷰어를 설정한다.`,
        `/version이 Git SHA를 반환하게 하고, 배포 중 1초 간격으로 curl을 돌려 응답 코드와 버전을 기록하는 deploy-watch.sh를 만든다. v1에서 v2로 배포하며 기록을 저장한다.`,
        `장애 주입 1: 부팅 직후 종료하는 v3 이미지를 배포해 서킷 브레이커가 자동 롤백하는지, 걸린 시간과 deploy-watch의 실패 응답 수를 기록한다.`,
        `장애 주입 2: 헬스체크는 통과하지만 /version이 오류를 내는 v4를 배포한 뒤 레슨 10의 롤백 스크립트로 되돌리고, 명령 실행부터 이전 버전 응답까지 걸린 시간을 3회 측정한다.`,
        `terraform plan이 변경 없음임을 확인한 뒤 콘솔에서 desired count를 바꿔 드리프트를 만들고 plan이 이를 감지하는 화면을 캡처한 다음 apply로 복구한다.`,
        `README와 런북을 작성한다. 아키텍처 그림, 배포·롤백 명령 한 줄, 시크릿·권한 목록, 장애 유형 5가지별 1차 대응, AWS Pricing Calculator 기반 월 비용 추정표(가정 명시)와 예산 알림 화면을 담는다. 마지막으로 terraform destroy 후 잔여 리소스(ALB, EIP, 로그 그룹, ECR 이미지)가 없음을 확인한다.`
      ],
      accept: [
        `태그 푸시부터 새 버전이 /version에 보이기까지의 시간이 기록되어 있고, 저장소 Secrets에 AWS 장기 키가 0개이며 신뢰 정책 sub가 단일 저장소와 환경으로 제한되어 있다`,
        `장애 주입 1의 서킷 브레이커 자동 롤백 로그와 최종 리비전 확인, 장애 주입 2의 수동 롤백 소요 시간 3회 측정값이 있다(목표 60~90초, 초과하면 원인과 설정값을 함께 보고)`,
        `deploy-watch 기록으로 배포 중 비정상 응답 건수를 수치로 제시하고(목표 0~2건) 원인 후보(헬스체크, deregistration delay, 종료 처리)를 분석했다`,
        `Terraform으로 환경 전체가 재현되고 apply 직후 plan이 No changes이며, 예산 알림·태그·로그 보존 기간이 코드에 포함되어 있다`,
        `비용 추정표에 가정 5개 이상과 NAT·IPv4·로그 항목이 있고, 문서만 보고 새 환경에서 배포와 롤백을 30분 안에 재현해 본 기록이 있다`
      ],
      stretch: `ECS 내장 블루/그린 전략(또는 CodeDeploy)으로 바꿔 롤백을 초 단위로 줄이고 롤링과 비교표를 만들어라. 또는 ECS Express Mode로 같은 앱을 올려 직접 구성한 서비스와 설정 시간·월 비용·제어 범위를 비교하라. OpenTofu로 같은 코드가 도는지 확인하고, GitHub Actions에서 PR마다 plan 결과를 코멘트로 남기는 흐름을 추가해도 좋다.`
    }
  ],
  quiz: [
    {
      q: `ECS Fargate 롤링 배포 때마다 몇 초씩 502가 난다. 앱은 SIGTERM을 받으면 진행 중 요청을 마치고 종료하도록 구현돼 있다. 컨테이너 설정은 아래와 같다.

ENTRYPOINT ["/app/start.sh"]

# start.sh
#!/bin/sh
python -m app.main

가장 먼저 고칠 것은?`,
      choices: [
        `ALB 유휴 타임아웃을 늘린다`,
        `start.sh 마지막 줄을 exec python -m app.main 으로 바꿔 SIGTERM이 앱 프로세스에 전달되게 한다`,
        `서비스의 healthCheckGracePeriodSeconds를 늘린다`,
        `desired count를 두 배로 늘린다`
      ],
      answer: 1,
      why: `셸 스크립트가 PID 1로 남아 SIGTERM을 파이썬에 넘기지 않으므로 앱의 우아한 종료 코드가 실행되지 못하고, stopTimeout 뒤 SIGKILL로 끊기면서 진행 중이던 요청이 502로 보인다. exec로 앱을 PID 1로 만들어야 한다. healthCheckGracePeriodSeconds는 부팅 직후 헬스체크를 유예하는 값이라 종료 문제와 무관하고, task를 늘리는 것은 용량만 늘릴 뿐 종료 시 끊김을 해결하지 못한다.`
    },
    {
      q: `프로덕션 배포 역할(gha-deploy-prod)의 신뢰 정책 조건이 아래와 같다. 보안 리뷰에서 가장 먼저 지적해야 할 점은?

"Condition": {
  "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
  "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:acme-corp/shop-api:*" }
}`,
      choices: [
        `aud 조건에 StringEquals를 써서 너무 엄격하다`,
        `OIDC는 장기 액세스 키보다 위험하므로 키 방식으로 되돌려야 한다`,
        `StringLike 대신 StringEquals로 repo:acme-corp/shop-api 만 적어야 한다`,
        `sub가 저장소 전체를 와일드카드로 허용해 어떤 브랜치나 PR의 워크플로든 prod 배포 역할을 맡을 수 있다. environment:prod 같은 구체 값으로 좁히고 환경에 필수 리뷰어를 건다`
      ],
      answer: 3,
      why: `sub 와일드카드는 그 저장소의 모든 ref와 PR을 통과시키므로 개발용 브랜치 워크플로가 prod에 배포할 수 있다. 구체 환경이나 브랜치로 좁혀야 한다. 2번처럼 StringEquals에 접두사만 적으면 실제 sub는 항상 뒤에 ref나 environment가 붙어 어떤 토큰도 일치하지 못해 역할을 아무도 못 맡게 된다. OIDC가 장기 키보다 안전하다는 점은 변함이 없다.`
    },
    {
      q: `소스 한 줄만 고쳐도 CI의 이미지 빌드가 매번 4분 걸린다. Dockerfile이 아래와 같을 때 원인과 해결로 가장 알맞은 것은?

FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm ci
CMD ["node", "server.js"]`,
      choices: [
        `COPY . . 가 npm ci보다 앞에 있어 소스 변경이 의존성 설치 레이어의 캐시를 무효화한다. package.json과 lock 파일만 먼저 COPY하고 npm ci를 한 뒤 소스를 COPY한다`,
        `node:22-slim은 빌드 캐시를 지원하지 않으므로 alpine으로 바꿔야 한다`,
        `npm ci 대신 npm install을 쓰면 캐시가 유지된다`,
        `WORKDIR를 두 번 선언해야 캐시가 적용된다`
      ],
      answer: 0,
      why: `캐시 키는 명령과 입력 파일의 체크섬이고 한 단계가 무효화되면 이후 모든 단계가 다시 실행된다. COPY . . 로 소스 전체가 먼저 들어가므로 파일 하나만 바뀌어도 npm ci가 매번 다시 돈다. 의존성 목록만 먼저 복사하면 소스 변경은 마지막 레이어만 무효화한다. npm install은 오히려 결과가 달라질 수 있고 캐시 문제를 해결하지 못하며 베이스 이미지 종류와 캐시 지원은 무관하다.`
    },
    {
      q: `고객의 개발 환경 청구서에서 가장 큰 항목이 NAT Gateway의 데이터 처리 요금이다. 사설 서브넷의 Fargate task들이 배포 때마다 ECR에서 이미지를 받고 S3와 CloudWatch Logs를 쓴다. 가장 적절한 조치는?`,
      choices: [
        `NAT Gateway를 AZ마다 하나씩 더 만든다`,
        `Fargate를 Fargate Spot으로 바꾼다`,
        `S3 게이트웨이 엔드포인트(무료)와 필요한 서비스의 인터페이스 엔드포인트로 AWS 서비스 트래픽을 NAT 밖으로 돌리거나, 개발 환경이면 NAT가 꼭 필요한지 재검토한다`,
        `ALB를 삭제한다`
      ],
      answer: 2,
      why: `NAT Gateway는 시간당 요금에 처리 GB당 요금이 더해지고 이미지 pull과 S3·로그 트래픽이 NAT를 지나면 GB 요금이 쌓인다. 엔드포인트는 이 트래픽을 NAT 밖으로 빼 준다(단 인터페이스 엔드포인트도 시간당 요금이 있으므로 계산해 본다). NAT를 더 만드는 것은 가용성용이고 비용만 늘리며, Spot은 컴퓨트 단가와 관련될 뿐 NAT 처리 요금과 무관하다.`
    },
    {
      q: `ECS 콘솔에서 서비스 task가 갑자기 종료됐다. 확인한 정보는 아래와 같다. 가장 가능성이 높은 원인은?

Stopped reason: Essential container in task exited
Container: api   Exit code: 137
CloudWatch MemoryUtilization: 98% -> 100% -> (task stopped)
Task definition: cpu 512 / memory 1024`,
      choices: [
        `배포 중 SIGTERM을 받아 정상 종료했다(exit 143)`,
        `컨테이너가 메모리 한도(1024 MiB)를 넘겨 커널 OOM killer에게 SIGKILL을 받았다(128+9=137)`,
        `ALB 헬스체크 실패로 ECS가 task를 교체했다`,
        `task execution role에 시크릿 읽기 권한이 없었다`
      ],
      answer: 1,
      why: `종료 코드 137은 SIGKILL이고 메모리 사용률이 한도까지 올라가다 끊겼으므로 OOM이 가장 일치한다. 대응은 메모리 한도 상향, 누수 수정, 힙 설정을 한도에 맞추는 것이다. SIGTERM 정상 종료라면 143이 되고, 헬스체크 실패는 stopped reason에 ELB 헬스체크 실패가 표시되며, 시크릿 권한 문제는 컨테이너가 시작되기 전에 작업이 시작 실패로 끝난다.`
    },
    {
      q: `고객 개발자가 AWS 액세스 키가 든 .env를 공개 GitHub 저장소에 push했고 5분 뒤 삭제 커밋을 올렸다. 가장 먼저 해야 할 일은?`,
      choices: [
        `해당 키를 즉시 비활성화하고 회전한 뒤 CloudTrail로 그 사이 사용 이력을 확인한다. Git 히스토리 정리는 그 다음이다`,
        `force push로 히스토리에서 파일을 지우면 끝이다`,
        `저장소를 비공개로 바꾸고 상황을 지켜본다`,
        `키 대신 비밀번호를 .env에 넣는 방식으로 바꾼다`
      ],
      answer: 0,
      why: `공개 저장소에 올라간 키는 자동 스캐너가 수 분 안에 수집한다고 가정해야 하므로 삭제 커밋이나 히스토리 정리가 있어도 이미 유출이다. 키 폐기와 회전이 최우선이고 CloudTrail로 오용 여부를 확인해야 한다. force push와 비공개 전환은 이미 복사된 키를 되돌리지 못하고, 비밀번호를 .env에 넣는 것은 같은 문제를 반복한다.`
    },
    {
      q: `인프라 보안 개선 PR이 RDS의 암호화를 켠다. CI가 남긴 terraform plan 출력은 아래와 같다. 리뷰어로서 가장 적절한 판단은?

  # aws_db_instance.main must be replaced
-/+ resource "aws_db_instance" "main" {
      ~ storage_encrypted = false -> true # forces replacement
        identifier        = "shop-prod"
        # (31 unchanged attributes hidden)
    }

Plan: 1 to add, 0 to change, 1 to destroy.`,
      choices: [
        `add가 1개뿐인 추가성 변경이므로 안전하다. 승인한다`,
        `CI에서 -auto-approve로 적용하고 문제가 생기면 롤백한다`,
        `terraform refresh를 실행하면 교체가 사라진다`,
        `교체(destroy 포함)이므로 그대로 apply하지 않는다. 스냅샷 복원 기반의 암호화 이전 계획과 유지보수 창을 잡고 deletion_protection과 prevent_destroy로 실수 삭제를 막는다`
      ],
      answer: 3,
      why: `must be replaced와 -/+는 기존 DB를 삭제하고 새 빈 DB를 만든다는 뜻이고, 요약의 destroy 1이 그 증거다. 암호화되지 않은 RDS를 제자리에서 암호화할 수 없으므로 스냅샷을 암호화 복사해 복원하는 별도 절차가 필요하다. add 개수만 보면 교체를 추가로 오해하기 쉽고, auto-approve는 데이터를 잃는 변경을 검토 없이 적용하며, refresh는 상태를 갱신할 뿐 교체 계획을 없애지 못한다.`
    },
    {
      q: `월 사용자 수천 명인 서비스의 FastAPI 한 개와 PostgreSQL을 AWS에 올려 달라는 의뢰가 왔다. 개발자는 2명이고 쿠버네티스 경험이 없으며, "서버 관리는 하고 싶지 않고 인프라 예산은 작게"라고 한다. 가장 알맞은 구성은? (2026-11 기준, 고객 계정은 AWS를 처음 쓰는 신규 계정이다)`,
      choices: [
        `EKS 클러스터를 만들고 Argo CD로 GitOps를 구성한다`,
        `EC2 한 대에 SSH로 접속해 git pull하는 배포를 유지한다`,
        `ECS Fargate + ALB + RDS로 구성하고 GitHub Actions(OIDC)로 배포하며 서킷 브레이커 롤백을 켠다`,
        `서버리스(Lambda)로 전체를 재작성한다`
      ],
      answer: 2,
      why: `서버 관리를 줄이고 싶은 소규모 팀에는 호스트를 직접 운영하지 않는 ECS Fargate가 AWS 가이드의 선택 기준(조직 규모와 역량)에 맞고, 롤백과 인계도 쉽다. EKS는 업그레이드와 운영 부담이 인계 후 고객에게 남아 과하다. 수동 SSH 배포는 재현성과 롤백이 없고, 전면 재작성은 요구 범위를 벗어난 비용과 위험을 만든다. App Runner도 같은 계열의 단순한 선택지였지만 2026-04-30부터 신규 고객을 받지 않아 지금은 ECS Express Mode가 그 자리를 대신한다.`
    },
    {
      q: `공개 저장소에서 외부 fork PR의 테스트를 돌리려고 워크플로를 아래처럼 구성했다. 가장 큰 문제와 해결책은?

on: pull_request_target
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          ref: <PR 헤드 커밋 SHA>      # 외부 기여자의 코드를 체크아웃
      - run: npm ci && npm test
        env:
          DEPLOY_TOKEN: <저장소 시크릿>`,
      choices: [
        `npm test가 느리다. 의존성 캐시를 쓴다`,
        `pull_request_target은 기본 저장소의 컨텍스트(시크릿과 쓰기 권한 토큰)로 실행되는데 외부 PR 코드를 체크아웃해 실행하므로 시크릿 탈취가 가능하다. fork PR은 시크릿 없는 pull_request로 테스트하고 권한이 필요한 작업은 workflow_run 등으로 분리한다`,
        `checkout 액션을 SHA로 고정하지 않았다`,
        `ubuntu-latest 대신 셀프호스트 러너를 써야 안전하다`
      ],
      answer: 1,
      why: `외부 기여자가 package.json 스크립트나 테스트 코드를 바꾸면 그 코드가 시크릿이 주입된 환경에서 실행된다. pull_request 이벤트는 fork PR에 시크릿을 주지 않으므로 테스트는 그쪽으로 옮긴다. SHA 고정은 좋은 습관이지만 이 문제의 핵심이 아니고, 셀프호스트 러너는 GitHub 문서가 공개 저장소에서 피하라고 한 더 위험한 선택이다.`
    },
    {
      q: `새 버전 배포가 계속 실패하고 task가 죽었다 다시 뜨기를 반복한다. 로그 요약과 설정은 아래와 같다. 가장 직접적인 원인과 해결은?

10:02:11 service shop-api: (task 7c1e) started
10:02:41 ALB: target 10.0.2.17 Target.FailedHealthChecks
10:03:10 service shop-api: (task 7c1e) failed ELB health checks. stopping
10:03:35 service shop-api: (task 8d20) started    (같은 현상 반복)
app log: Started ShopApplication in 71.3 seconds
설정: healthCheckGracePeriodSeconds = 0, 타겟 그룹 헬스체크 interval 15s, unhealthy threshold 2`,
      choices: [
        `maximumPercent를 올려 더 많은 task를 동시에 띄운다`,
        `서킷 브레이커를 꺼서 반복을 멈춘다`,
        `앱 부팅에 약 71초가 걸리는데 유예 시간이 0이라 부팅 중 헬스체크 실패로 task가 종료된다. 부팅 시간보다 긴 grace period(예: 120초)와 컨테이너 startPeriod를 설정하고 부팅 시간 자체도 줄인다`,
        `타겟 그룹 헬스체크 간격을 5초로 줄인다`
      ],
      answer: 2,
      why: `앱이 준비되기 전(약 71초)에 ALB가 약 30초 만에 unhealthy로 판정하고 ECS가 task를 종료하는 부팅 루프다. 유예 시간이 부팅 시간을 덮어야 한다. 서킷 브레이커를 끄면 실패한 배포가 롤백되지 않고 계속 반복되며, 간격을 줄이면 더 빨리 unhealthy가 되어 악화되고, maximumPercent는 동시 기동 개수만 바꿀 뿐 부팅 중 헬스체크 판정과 무관하다.`
    },
    {
      q: `v42 배포 후 오류율이 8%로 올라 이전 이미지(v41)로 롤백했는데 오류가 그대로다. v42 릴리스에는 users.phone 컬럼을 mobile로 이름 바꾸는 마이그레이션이 포함되어 있었다. 가장 가능성이 높은 원인과 교훈은?`,
      choices: [
        `스키마는 앞으로만 진행돼 v41 코드가 존재하지 않는 phone 컬럼을 찾는다. 롤백 가능한 배포를 위해 컬럼 이름 변경·삭제는 expand/contract로 여러 릴리스에 나눠야 한다`,
        `ECR 수명주기 정책이 v41 이미지를 삭제했다`,
        `DNS TTL 때문에 이전 서버로 돌아가지 못했다`,
        `ALB가 이전 오류 응답을 캐시하고 있다`
      ],
      answer: 0,
      why: `애플리케이션 롤백은 코드만 되돌리고 DB 스키마는 되돌리지 않으므로 구버전이 신스키마와 맞지 않아 오류가 지속된다. 새 컬럼을 추가해 신구 호환 기간을 두고 구 컬럼 제거는 다음 릴리스에서 하는 방식이 해법이다. 이미지가 삭제됐다면 오류율이 아니라 이미지 pull 실패로 task가 뜨지 못하고, ALB는 응답을 캐시하지 않으며, 같은 서비스 롤백은 DNS와 무관하다.`
    },
    {
      q: `고객이 "AWS에 올리고 CI/CD 붙여 주세요, 예산은 100만 원"이라고 한다. 견적을 확정하기 전 가장 적절한 행동은?`,
      choices: [
        `시장 가격 범위 안이므로 바로 수락한다`,
        `안전하게 EKS와 멀티 AZ로 가장 큰 구성을 기준으로 견적한다`,
        `일단 콘솔로 만들어 주고 문서와 IaC는 생략해 일정을 맞춘다`,
        `환경 수(dev/stg/prod), AWS 계정 소유와 권한, 가용성 목표와 허용 다운타임, 데이터 이전 범위, 월 AWS 비용 상한, 인수인계 범위를 확인하고 가정을 견적서에 명시한다`
      ],
      answer: 3,
      why: `같은 문장이 환경 1개짜리 단순 배포일 수도, 멀티 환경과 데이터 이전을 포함할 수도 있어서 범위가 가격을 좌우한다. 가정을 문서로 남겨야 이후 범위 분쟁을 막는다. 즉시 수락은 숨은 범위를 떠안게 되고, 과대 구성은 고객의 운영 역량과 예산을 넘으며, 콘솔 수동 구성은 재현과 인계가 안 되어 납품 품질이 낮다.`
    }
  ],
  refs: [
    {
      title: `Docker Docs: Building best practices`,
      url: `https://docs.docker.com/build/building/best-practices/`,
      kind: `doc`,
      why: `멀티스테이지, 최소 베이스, digest 고정과 Dependabot 갱신, .dockerignore, 비루트 UID, exec 형식 CMD, apt-get 규칙이 한 문서에 정리되어 있어 Dockerfile 리뷰 기준으로 쓴다.`
    },
    {
      title: `The Twelve-Factor App`,
      url: `https://12factor.net/`,
      kind: `doc`,
      why: `코드베이스, 설정, 빌드·릴리스·실행 분리, 프로세스, 폐기 가능성, 로그 등 클라우드 앱이 지켜야 할 12가지 원칙의 원문이다(요인별 상세는 하위 페이지). 레슨 1의 최소 계약과 K8s·ECS 설계의 공통 전제다.`
    },
    {
      title: `GitHub Docs: Secure use reference (Actions)`,
      url: `https://docs.github.com/en/actions/reference/security/secure-use`,
      kind: `doc`,
      why: `스크립트 인젝션, SHA 고정, 최소 권한 토큰, pull_request_target 위험, 셀프호스트 러너 경고를 공식 기준으로 확인할 수 있다.`
    },
    {
      title: `GitHub Docs: OpenID Connect in AWS`,
      url: `https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws`,
      kind: `doc`,
      why: `id-token 권한, aud·sub 조건의 신뢰 정책 예시, 2026-07-15 이후 저장소의 sub 형식 변화를 확인한다. 장기 키 없는 배포의 기준 문서다.`
    },
    {
      title: `AWS Decision guide: Choosing an AWS container service`,
      url: `https://docs.aws.amazon.com/decision-guides/latest/containers-on-aws-how-to-choose/choosing-aws-container-service.html`,
      kind: `doc`,
      why: `컨테이너 서비스를 용량·오케스트레이션·묶음 서비스 층으로 나누고 조직 규모와 역량을 선택 기준으로 제시한다. 2025-05-16 갱신본이라 App Runner의 신규 고객 중단(아래 항목)은 반영하지 않으니 함께 읽는다.`
    },
    {
      title: `Amazon ECS Express Mode`,
      url: `https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html`,
      kind: `doc`,
      why: `이미지와 역할 두 개로 Fargate 서비스·ALB·오토스케일링을 만들어 주는 기능의 범위, 추가 요금 없음, 제공 방식을 확인한다. App Runner를 대신하는 가장 단순한 선택지로 설명할 때 근거로 쓴다.`
    },
    {
      title: `AWS App Runner availability change`,
      url: `https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html`,
      kind: `doc`,
      why: `App Runner가 신규 고객에게 닫혔고 기존 고객은 계속 쓸 수 있으며 ECS Express Mode로의 이전을 권한다는 공지다. 고객이 App Runner를 지정했을 때 가장 먼저 확인한다.`
    },
    {
      title: `Amazon ECS: How the deployment circuit breaker detects failures`,
      url: `https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html`,
      kind: `doc`,
      why: `2단계 실패 판정, 임계값 계산(BOUNDED_PERCENT 기본 50%, 최소 3·최대 200), resetOnHealthyTask, 롤백 대상 선택 규칙, SERVICE_DEPLOYMENT_FAILED 알림 권고를 정확히 확인한다.`
    },
    {
      title: `Elastic Load Balancing: Edit target group attributes for your Application Load Balancer`,
      url: `https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html`,
      kind: `doc`,
      why: `deregistration delay(기본 300초), slow start, 라우팅 알고리즘, 스티키 세션의 동작을 확인해 배포 중 5xx와 종료 대기 시간을 조정한다.`
    },
    {
      title: `Amazon ECS: Service definition parameters`,
      url: `https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_definition_parameters.html`,
      kind: `doc`,
      why: `minimumHealthyPercent·maximumPercent 기본값, healthCheckGracePeriodSeconds, 배포 컨트롤러 종류와 전략을 서비스 설정의 기준으로 확인한다.`
    },
    {
      title: `Terraform docs: S3 backend`,
      url: `https://developer.hashicorp.com/terraform/language/backend/s3`,
      kind: `doc`,
      why: `원격 상태 설정, use_lockfile 네이티브 잠금, DynamoDB 잠금 deprecated 상태, 버저닝과 암호화 권고를 확인한다.`
    },
    {
      title: `Kubernetes Documentation: Overview`,
      url: `https://kubernetes.io/docs/concepts/overview/`,
      kind: `doc`,
      why: `쿠버네티스가 제공하는 것과 제공하지 않는 것(PaaS가 아님, CI/CD·로깅·DB 미제공)을 공식 문서로 확인하고 도입 판단의 근거로 쓴다.`
    },
    {
      title: `Kamal: deploy web apps anywhere`,
      url: `https://kamal-deploy.org/`,
      kind: `tool`,
      why: `베어메탈부터 클라우드 VM까지 컨테이너화한 웹 앱을 무중단 롤링 재시작, 원격 빌드, 부속 서비스 관리로 배포하는 도구다(문서 2.12.0 표기, 2026-11 확인). 소규모 외주에서 ECS 대신 쓸 수 있는 최소 구성의 대안으로 읽는다.`
    },
    {
      title: `AWS VPC pricing`,
      url: `https://aws.amazon.com/vpc/pricing/`,
      kind: `doc`,
      why: `NAT Gateway의 시간당·GB당 요금과 퍼블릭 IPv4 주소 요금을 확인해 비용 추정서를 작성한다. 리전별로 값이 다르므로 항상 대상 리전의 표를 본다.`
    }
  ],
  gigs: [
    `견적 전 확인 항목을 체크리스트로 고정하세요: 환경 수(dev/stg/prod), AWS 계정 소유자와 권한 위임 방식, 가용성 목표와 허용 다운타임, 데이터 이전과 컷오버 범위, 월 AWS 비용 상한, 개인정보 포함 여부, 인수인계 범위와 이후 운영 책임. 크몽 서버·클라우드 가격 가이드(2025-09 기준)는 단일 서버 50–80만 원, AWS+CI/CD 100–200만 원, 오토스케일·백업·모니터링 300만 원 이상으로 구간을 나누는데, 이는 플랫폼 자체 참고치이므로 항목별 범위를 견적서에 문장으로 못 박아야 가격을 방어할 수 있습니다.`,
    `납품물은 코드만이 아닙니다: Terraform(또는 OpenTofu) 코드, CI/CD 파이프라인, 한 줄 배포·롤백 명령이 적힌 README, 장애 유형별 런북, 권한·시크릿 위치 목록, 가정이 적힌 월 비용 추정서와 예산 알림 화면, 롤백 시연 기록을 포함하세요. 위시켓 리포트(2025 상반기)는 포트폴리오에 운영 경험과 CI/CD 설명을 수치로 담으라고 조언하므로, 롤백 소요 시간 같은 측정값을 인수인계 문서에 남기는 것이 곧 실력 증명입니다.`,
    `계정과 권한: 고객 소유 AWS 계정에서 IAM Identity Center나 역할 위임으로 작업하고 루트 자격 증명을 요구하지 마세요. 내 계정에 먼저 만들고 이전하는 방식은 청구, 데이터 처리 책임, 개인정보 문제를 만듭니다. 작업이 끝나면 내 권한과 토큰을 회수하고 그 사실을 문서에 남깁니다. 개정 개인정보 보호법(2026-09-11 시행)으로 유출 통지와 과징금이 강화되었으므로 개인정보가 오가는 시스템은 접근 로그, 암호화, 백업 위치에 대한 질문이 계약 요건으로 올 수 있습니다.`,
    `자주 나오는 함정: (1) 무중단이라는 말의 범위(DB 마이그레이션과 컷오버 포함 여부)를 합의하지 않음, (2) NAT Gateway·ALB·퍼블릭 IPv4·로그 보존 같은 고정비를 고객에게 설명하지 않아 첫 청구서에서 분쟁, (3) 운영 책임이 암묵적으로 무기한 따라옴. 장애 대응과 모니터링은 별도 월 유지보수 계약(응답 시간, 범위, 비용)으로 분리하고 하자보수 기간을 명시하세요. (4) 콘솔에서 수동 수정한 리소스가 IaC와 어긋나 다음 apply에서 사라지는 일은 '콘솔 변경 금지'를 계약서와 권한 설계로 막습니다.`,
    `견적 산정은 작업 단위로 쪼개는 습관이 좋습니다. 경험칙(판단이며 고객·스택에 따라 크게 다름)으로 컨테이너화와 CI 구축은 각각 며칠, Terraform 기본 환경(VPC·ALB·ECS·RDS) 구성은 그보다 길고, 데이터 이전과 컷오버는 리허설 시간을 따로 잡습니다. 시장 참고치로 위시켓 2025 상반기 데이터에서 백엔드 프리랜서 월 단가는 미드 약 579만 원, 시니어 약 732만 원이며 주니어는 프런트 위주로 배정되는 경향이라고 분석되므로, 운영 책임을 지는 작업일수록 시니어 단가에 가깝게 근거를 제시할 수 있습니다.`,
    `고객이 쿠버네티스를 요구할 때: 이미 운영 중인 클러스터가 있는지, 서비스 수와 팀 규모, 업그레이드를 담당할 사람이 누구인지부터 묻습니다. 쿠버네티스는 연 3회 minor 릴리스에 지원 기간이 약 14개월(1.34는 2026-10-27 지원 종료)이라 고객이 이미 쓰는 클러스터라면 버전 지원 종료 확인이 첫 작업이 됩니다. 새로 도입한다면 서비스 한두 개에는 ECS Fargate를 권하고 그 근거(AWS 선택 가이드, 인계 후 운영 부담)를 제안서에 적으세요. CKA·CKAD·CKS 자격은 신뢰 신호로 쓰이지만 자격보다 운영 사례가 값을 가릅니다. 고객이 "App Runner로 해 달라"고 하면 AWS가 2026-04-30부터 신규 고객을 받지 않으므로(기존 고객은 계속 사용 가능) 고객 계정이 기존 사용자인지부터 확인하고, 신규라면 ECS Express Mode나 Fargate 직접 구성을 제안하세요.`,
    `도구와 라이선스는 계약서에 명시하세요: Terraform은 BSL 1.1(경쟁 제품을 제3자에게 제공하는 용도 제한, 버전별로 최대 4년 뒤 MPL 2.0 전환)이고 OpenTofu는 MPL-2.0 표기라서, 고객 인프라를 관리하는 일반 용도에는 문제가 되지 않는 경우가 많지만 IaC를 서비스로 제공하는 구조라면 법무 확인이 필요합니다. 어떤 도구와 버전(2026-11 기준 Terraform 1.17.x, OpenTofu 1.13.x 계열)을 쓰는지 README에 적고 한 저장소에서 섞지 않으며, GitHub Actions 요금(2026-11 열람 기준 2코어 Linux 분당 $0.006)도 고객 조직 요금제 기준으로 월 CI 비용을 추정해 두세요.`
  ]
};
