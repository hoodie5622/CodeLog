(window.PRO_MODULES = window.PRO_MODULES || {})["be-fastapi"] = {
  id: "be-fastapi",
  summary: `uv·ruff·pytest·mypy 툴체인 위에서 FastAPI·Pydantic v2·SQLAlchemy 2·Alembic으로 테스트되고 무중단 마이그레이션이 가능한 멀티테넌트 API를 만들어 인수인계 패키지로 납품할 수 있다.`,
  hours: 100,
  goals: [
    `ASGI 스택(서버·미들웨어·라우팅·의존성·Pydantic·응답 직렬화)에서 요청이 지나는 순서와 코드가 실행되는 위치(이벤트 루프/스레드풀)를 설명하고 장애 증상을 층별로 좁힐 수 있다`,
    `uv·ruff·pytest·mypy와 CI로 락 파일 기준의 재현 가능한 프로젝트를 구성하고 다른 PC·컨테이너에서 동일하게 재현할 수 있다`,
    `Pydantic v2로 입력·패치·출력 모델을 분리하고 extra·strict·exclude_unset 정책과 RFC 9457 오류 계약을 구현할 수 있다`,
    `async def와 def의 실행 차이를 측정으로 입증하고 블로킹 호출을 찾아 고치며 워커 수와 DB 풀 크기의 곱셈을 계산해 설정할 수 있다`,
    `SQLAlchemy 2.x로 Mapped 모델·요청 단위 세션·트랜잭션 경계를 설계하고 비동기 환경의 로딩 전략으로 N+1을 쿼리 수 테스트로 잡을 수 있다`,
    `Alembic 마이그레이션을 리뷰하고 expand/contract와 lock_timeout으로 무중단 컬럼 변경을 수행하며 락 영향을 측정할 수 있다`,
    `의존성 오버라이드·실제 PostgreSQL·트랜잭션 롤백으로 API 테스트를 구성하고 테넌트 격리와 오류 계약을 자동 검증할 수 있다`,
    `키셋 페이지네이션·SSE 스트리밍·BackgroundTasks의 한계·컨테이너 배포 방식을 상황에 맞게 선택하고 인수인계 가능한 패키지로 납품할 수 있다`
  ],
  lessons: [
    {
      title: `요청 한 건의 여정: ASGI·Starlette·FastAPI·Pydantic·SQLAlchemy 지도`,
      body: `프로덕션 FastAPI 문제의 상당수는 문법을 몰라서가 아니라 **요청 한 건이 어떤 층을 지나 어떤 스레드에서 실행되는지** 몰라서 생깁니다. 이 레슨은 지도를 먼저 그립니다. 선수 모듈에서 배운 메서드·상태 코드·오류 계약이 이 스택의 어느 층에서 구현되는지 연결하는 것이 목표입니다.

### 여섯 개의 층

1. 서버(uvicorn 등): 소켓을 열고 HTTP를 파싱해 ASGI 메시지로 바꿉니다. 이벤트 루프 하나가 많은 연결을 번갈아 처리합니다.
2. ASGI: 서버와 앱 사이의 계약입니다. 앱은 ‹async def app(scope, receive, send)› 함수 하나이고, scope의 type이 http·websocket·lifespan 중 무엇인지 알려 줍니다.
3. Starlette: 라우팅, 미들웨어, 요청·응답 객체, lifespan을 제공합니다.
4. FastAPI: Starlette 위에서 함수 시그니처를 읽어 경로·쿼리·본문 파라미터를 결정하고, ‹Depends› 그래프를 풀고, OpenAPI 문서를 만듭니다.
5. Pydantic v2: 입력 검증과 출력 직렬화를 맡습니다. 핵심 엔진은 Rust로 작성되어 있습니다.
6. SQLAlchemy와 DB 드라이버: 데이터 계층입니다(레슨 6).

### 요청의 생애

1. 서버가 바이트를 읽어 ASGI scope를 만들고 앱을 호출합니다.
2. 미들웨어 체인을 바깥에서 안쪽으로 통과합니다. 가장 나중에 추가한 미들웨어가 가장 바깥에 놓이므로(FastAPI 문서 기준), 인증을 미들웨어로 구현했다면 CORS 미들웨어를 마지막에 추가해야 그 미들웨어가 직접 돌려주는 401 응답에도 CORS 헤더가 붙습니다. 다만 Starlette의 ‹ServerErrorMiddleware›는 항상 가장 바깥층이라 처리되지 않은 예외로 나가는 500에는 CORS 헤더가 빠질 수 있습니다(Starlette 문서는 앱 전체를 CORSMiddleware로 감싸는 방법을 안내합니다).
3. 라우터가 경로와 메서드를 매칭합니다(경로가 없으면 404, 메서드가 다르면 405).
4. FastAPI가 의존성 그래프를 풀고 파라미터를 검증합니다. 실패하면 **함수를 호출하지 않고** 422를 돌려줍니다.
5. 경로 함수가 실행됩니다. ‹async def›는 이벤트 루프 스레드에서 직접, 일반 ‹def›는 스레드풀에서 돕니다(레슨 4).
6. 반환값이 응답 모델로 검증·필터링·직렬화됩니다.
7. 응답이 전송된 **뒤에** BackgroundTasks와 yield 의존성의 정리 코드(기본값)가 실행됩니다.

이 순서를 알면 "DB 세션이 왜 응답을 보낸 뒤에야 반납되는가", "검증 오류는 왜 내 핸들러 로그에 안 남는가" 같은 질문에 답할 수 있습니다.

### 증상에서 층으로

| 증상 | 먼저 의심할 층 |
| 422가 갑자기 늘었다 | Pydantic 스키마와 클라이언트 계약 (레슨 3) |
| 한 API가 느린데 전 API가 같이 멈춘다 | 이벤트 루프 블로킹 (레슨 4) |
| QueuePool limit 오류 | 세션 수명과 풀 크기 (레슨 5~6) |
| 배포 직후 500 | 마이그레이션과 코드 버전의 순서 (레슨 7) |
| 브라우저에서만 CORS 오류 | 미들웨어 순서 또는 프록시 |

### 시간의 감각

DB 왕복은 같은 네트워크 안에서 쿼리 하나에 대체로 몇 ms입니다(자릿수 감각이며 환경마다 직접 측정하세요). 그래서 목록 API의 응답 시간은 프레임워크 오버헤드보다 **쿼리 수 × 왕복 시간**이 좌우합니다. "FastAPI가 빠르다"는 말이 SLA가 될 수 없는 이유입니다.

### 0.x 프레임워크라는 사실

FastAPI는 2026-11-07 기준 0.162.2로 아직 0.x이고, 릴리스 노트 날짜로 보면 2026-10-21에 0.157.0이 나온 뒤 사흘 만인 10-23에 0.162.0까지 올라갔습니다. 0.160.0(10-22)과 0.162.0(10-23)의 릴리스 노트에는 Breaking Changes 절이 있으나 이번 조사에서는 본문을 확인하지 못했습니다(불확실, 업그레이드 전에 직접 읽을 것). 그래서 락 파일로 버전을 고정하고 올릴 때마다 릴리스 노트를 읽고 테스트로 회귀를 잡는 절차가 이 스택의 기본 위생입니다. 같은 시점의 현행 값은 Pydantic 2.14.3, SQLAlchemy 2.1.8, Alembic 1.20.1입니다.`,
      code: `import time

from fastapi import FastAPI, Query
from pydantic import BaseModel


# 1) ASGI 계약의 실체: 앱은 이 함수 하나다 (uvicorn 모듈:app_raw 로 실행해 볼 수 있다)
async def app_raw(scope, receive, send):
    if scope["type"] != "http":
        return                                     # lifespan·websocket은 생략
    await send({"type": "http.response.start", "status": 200,
                "headers": [(b"content-type", b"text/plain; charset=utf-8")]})
    await send({"type": "http.response.body", "body": b"ok"})


# 2) 같은 일을 FastAPI가 해 주는 모습: 시그니처가 곧 계약이다
api = FastAPI()


class Health(BaseModel):
    status: str
    echo: int


@api.get("/health")
async def health(n: int = Query(0, ge=0, le=10)) -> Health:   # ?n=abc 는 함수 호출 전에 422
    return Health(status="ok", echo=n)


# 3) 미들웨어: 요청 전후를 감싼다. 가장 나중에 추가한 것이 가장 바깥층
@api.middleware("http")
async def add_timing(request, call_next):
    t0 = time.perf_counter()
    response = await call_next(request)
    response.headers["x-elapsed-ms"] = f"{(time.perf_counter() - t0) * 1000:.1f}"
    return response`,
      codeLang: `python`,
      key: [
        `FastAPI 앱은 ASGI 앱이다. Starlette(라우팅·미들웨어·lifespan) 위에 시그니처 기반 파라미터 해석·의존성 주입·OpenAPI 생성·Pydantic 검증이 얹혀 있다.`,
        `검증 실패(422)는 경로 함수를 호출하기 전에 끝난다. 응답 직렬화는 함수가 반환한 뒤에 일어난다.`,
        `BackgroundTasks와 yield 의존성의 정리 코드는 기본적으로 응답을 보낸 뒤 실행된다(자원 수명 설계의 출발점).`,
        `FastAPI는 0.x다. 락 파일로 고정하고, 올릴 때마다 릴리스 노트와 계약 테스트로 확인한다.`,
        `응답 시간은 프레임워크가 아니라 쿼리 수와 외부 호출이 지배한다. 느리다는 제보는 층별로 가설을 세워 좁힌다.`
      ],
      pitfalls: [
        `"FastAPI라서 빠르다"를 고객에게 성능 약속처럼 말한다. 병목은 대부분 DB 쿼리 수와 외부 API이므로 목표 p95를 측정으로 합의해야 한다.`,
        `인증을 미들웨어로 구현하면서 CORS 미들웨어를 안쪽에 둔다. 미들웨어가 직접 돌려준 401 응답에 CORS 헤더가 빠져 브라우저가 "CORS 오류"로만 보여 주고 진짜 원인은 숨는다. 처리되지 않은 예외의 500도 같은 증상을 내므로 서버 로그를 함께 본다.`,
        `전역 dict 캐시나 카운터가 워커 여러 개에서 공유된다고 가정한다. 프로세스마다 따로 존재하므로 공유 상태는 Redis·DB 같은 바깥 저장소에 둔다.`,
        `@app.middleware("http")를 만능으로 쓴다. BaseHTTPMiddleware 기반이라 엔드포인트에서 바꾼 ContextVar가 위로 전파되지 않는 등 제약이 있어(Starlette 문서), 정확성이 중요하면 순수 ASGI 미들웨어를 쓴다.`
      ]
    },
    {
      title: `프로덕션 툴체인: uv·ruff·pytest·타입 체커와 Python 수명주기`,
      body: `외주에서 첫 번째 관문은 기능이 아니라 **재현성**입니다. 인수 첫날 "내 PC에서는 되는데"가 나오면 이후의 모든 협의가 느려집니다. 이 레슨은 도구 이름보다 도구가 푸는 문제를 중심으로 봅니다.

### Python 수명주기부터

버전 선택은 도구 선택보다 먼저입니다(2026-11 기준). Python 3.10은 2026-10-01에 EOL이 되었고, 3.15가 2026-10-09에 첫 릴리스되어 3.15.2(2026-10-25)까지 나왔습니다. FastAPI와 Alembic은 3.10 이상, SQLAlchemy 2.1.8은 3.11 이상을 요구합니다(PyPI 메타데이터 조사 기준). 고객 서버가 3.10 이하라면 보안 패치가 끊긴 런타임이므로 업그레이드를 견적 항목으로 올립니다. 신규 납품이라면 3.15가 막 나온 시점이라 의존 라이브러리의 휠 지원을 확인한 뒤 3.13 또는 3.14를 기본으로 두고 3.15는 CI 매트릭스에 올려 두는 편이 보수적입니다(판단). 언어 기능(3.14의 t-string과 어노테이션 지연 평가, 3.15의 명시적 lazy import PEP 810·기본 UTF-8·frozendict)은 매력적이지만 고객 런타임이 확정되기 전에는 납품 코드의 전제로 삼지 않고 ‹requires-python›을 먼저 맞춥니다.

### uv가 푸는 문제

uv는 인터프리터 설치, 가상환경, 의존성 해결, 락 파일, 실행을 한 도구로 묶습니다. 핵심은 두 파일의 역할 분담입니다. ‹pyproject.toml›은 **의도**(어떤 범위의 라이브러리를 원하는가), ‹uv.lock›은 **결과**(간접 의존성까지 정확한 버전과 해시)입니다. 일상 명령은 ‹uv add›, ‹uv run›, ‹uv sync›이고, CI와 Docker에서는 ‹uv sync --locked›를 씁니다. ‹--locked›는 락 파일이 pyproject와 어긋나 있으면 실패하고, ‹--frozen›은 검사 없이 락 파일을 그대로 설치합니다. 전자는 "락 갱신을 깜빡한 푸시"를 빌드 단계에서 막고, 후자는 그 실수를 운영까지 보냅니다. Dockerfile에서는 pyproject와 uv.lock만 먼저 복사해 의존성 레이어를 캐시하고, 소스는 그 뒤에 복사합니다.

락 파일 형식은 표준화 중입니다. PEP 751(pylock.toml)이 2025-03-31에 확정되었고 Poetry 2.3은 이를 내보낼 수 있습니다. uv.lock은 uv 전용 형식이므로 도구를 바꿀 가능성이 있다면 표준 형식으로 내보낼 수 있는지 확인해 둡니다.

### ruff와 pytest

ruff는 린트와 포맷을 한 번에 처리합니다. 규칙 집합은 E·F(기본 오류), I(import 정렬), B(버그 유발 패턴), UP(구문 현대화), **ASYNC**(async 함수 안의 블로킹 호출), S(보안), RUF를 추천합니다. ruff 0.17(2026-11 기준 0.17.4)에서 기본 대상 Python이 3.11로 바뀌었으므로 ‹target-version›은 항상 명시합니다. 포맷터 버전이 바뀌면 대량 diff가 생기므로 ruff 업그레이드는 별도 PR로 분리합니다. FastAPI의 ‹Depends›를 기본값 위치에 쓰면 B008이 반응하므로 ‹Annotated› 스타일을 쓰거나 immutable-calls 설정으로 예외를 둡니다.

pytest는 9.2.0(2026-10-27 기준)이고, 9.0(2025-11-05)에서 subtests(실험적)·TOML 네이티브 설정·strict 모드가 들어왔으며, 9.2에서는 ‹parametrize›의 ‹indirect›·‹ids›·‹scope› 인자가 키워드 전용이 되어 위치 인자로 넘기던 오래된 테스트는 TypeError가 납니다. 메이저·마이너를 올릴 때는 changelog를 먼저 읽습니다.

### 타입 체커 고르기

타입 힌트는 실행 시 강제되지 않으므로 체커가 CI의 관문이 되어야 의미가 있습니다. 안정성이 중요한 납품에는 mypy(2.4.1)나 pyright를 관문으로 두고, Astral의 ty는 아직 0.0.x(2026-11-09 릴리스 페이지 기준 0.0.100)이고 프리뷰 기능의 형식이 바뀔 수 있다고 명시되어 있으므로 에디터와 비차단 CI 잡에서 비교용으로 씁니다. "mypy보다 10~100배 빠르다"는 수치는 공급자의 자체 벤치마크이며 독립 검증이 아닙니다.

### 거버넌스 리스크

uv와 ruff를 만드는 Astral은 2026-03-19 OpenAI의 인수 발표와 함께 OpenAI에 합류한다고 밝혔고, OpenAI는 오픈소스 도구 지원을 이어 가겠다고 했습니다. 당장 도구가 막히는 일은 아니지만 단일 벤더 의존이므로, 표준 메타데이터(pyproject)를 쓰고 락 파일 이식 경로를 확인해 두며 이 판단을 ADR에 한 줄 적어 인계합니다.`,
      code: `[project]
name = "booking-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.162.2",         # 0.x: 마이너 업그레이드마다 릴리스 노트 확인. 실제 버전은 uv.lock이 고정
  "pydantic-settings",
  "sqlalchemy[asyncio]>=2.1",
  "asyncpg",
  "alembic>=1.20",
  "uvicorn",
]

[dependency-groups]
dev = ["pytest>=9.2", "httpx", "ruff>=0.17", "mypy>=2.4"]

[tool.ruff]
target-version = "py312"      # 0.17부터 기본 대상이 3.11이므로 항상 명시한다
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "ASYNC", "S", "RUF"]

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S101"]         # 테스트의 assert는 허용

[tool.ruff.lint.flake8-bugbear]
extend-immutable-calls = ["fastapi.Depends", "fastapi.Query"]

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-ra --strict-markers"

[tool.mypy]
strict = true
plugins = ["pydantic.mypy"]`,
      codeLang: `toml`,
      key: [
        `pyproject.toml은 의도, uv.lock은 결과다. CI·Docker는 uv sync --locked로 락이 낡았으면 실패하게 만든다(--frozen은 검사하지 않는다).`,
        `Python 버전은 수명주기 표로 정한다(2026-11 기준 3.10 EOL, 3.15 첫 릴리스 2026-10-09). 라이브러리별 최소 버전이 다르다.`,
        `ruff는 target-version을 명시하고 ASYNC·S·B 규칙을 켠다. 도구 업그레이드는 포맷 diff를 분리한 별도 PR로 한다.`,
        `타입 체커는 CI 관문으로 쓸 만큼 안정적인 것(mypy·pyright)을 고르고, 0.0.x인 ty는 비차단으로 병행한다. pytest 9.2는 parametrize의 indirect·ids·scope를 키워드 전용으로 바꿨다.`,
        `도구 거버넌스 리스크와 대비책(표준 메타데이터, 락 이식 경로)을 인수인계 문서에 적는다.`
      ],
      pitfalls: [
        `requirements.txt를 pip freeze로 만들어 직접 의존성과 간접 의존성이 섞인다. 무엇이 의도였는지 알 수 없어 업그레이드가 불가능해진다.`,
        `CI에서 uv sync --frozen을 쓴다. pyproject만 고치고 락을 안 올린 커밋이 통과해 운영에서 ImportError가 난다.`,
        `ruff를 올리고 포맷 결과를 기능 PR에 섞는다. 리뷰가 불가능한 수천 줄 diff가 생기고 git blame이 망가진다.`,
        `mypy를 처음부터 strict로 레거시 코드 전체에 켜서 수천 개 오류가 나오고 결국 꺼 버린다. 신규 모듈부터 strict, 레거시는 모듈별 예외 목록으로 줄여 간다.`
      ]
    },
    {
      title: `Pydantic v2와 타입 힌트: 신뢰 경계에서 검증하기`,
      body: `Pydantic v2는 FastAPI의 **신뢰 경계**입니다. HTTP 본문, 쿼리, 설정, 큐 메시지처럼 바깥에서 들어오는 데이터는 타입이 보장되지 않는 바이트이고, 경계에서 한 번 검증해 타입이 붙은 객체로 바꾸면 내부 코드는 타입 체커를 믿고 짤 수 있습니다. 파이썬의 타입 힌트는 실행 시 아무것도 강제하지 않으므로 역할을 나눕니다. 정적 검사(mypy)는 내부 코드, 런타임 검증(Pydantic)은 경계입니다.

### 모델은 스키마이고 스키마는 계약이다

모델 하나가 검증 규칙, 직렬화 규칙, OpenAPI 스키마를 동시에 정의합니다. 모델을 바꾸는 일은 곧 API 계약을 바꾸는 일이므로 선수 모듈의 하위 호환 규칙이 그대로 적용됩니다. 실무 규칙 세 가지입니다.

1. **입력·패치·출력 모델을 분리합니다.** 하나의 모델로 생성·수정·응답을 다 처리하면 클라이언트가 ‹id›나 ‹is_admin› 같은 서버 소유 필드를 본문에 실어 보내도 반영되는 대량 할당(mass assignment) 문제가 생깁니다. 입력 모델에는 서버가 정하는 필드를 아예 두지 않습니다.
2. **입력 모델은 ‹extra="forbid"›를 기본으로 합니다.** 기본값 ‹ignore›는 오타 필드(‹gest›)를 조용히 버려서 "저장했는데 반영이 안 된다"는 버그를 만듭니다. 다만 새 필드를 먼저 보내는 클라이언트가 있는 롤링 배포에서는 422가 늘 수 있으므로 공개 API라면 정책을 계약에 적고 결정합니다.
3. **출력은 응답 모델(또는 반환 타입)로 걸러냅니다.** ORM 객체를 그대로 돌려주면 ‹password_hash›까지 나갈 수 있습니다. 응답 모델은 마지막 방어선입니다.

### 검증 모드와 값의 표현

기본(lax) 모드는 문자열 "123"을 int 123으로 바꿔 주지만 strict 모드는 거부합니다. 외부 시스템 JSON은 lax가 편하고, 타입이 어긋나면 위험한 곳은 strict를 씁니다. 돈은 float가 아니라 ‹Decimal›이나 정수 최소 단위(원, 센트)로 다룹니다. 0.1 + 0.2 문제가 장부에 들어가는 순간 정산 분쟁이 됩니다. 날짜는 ‹datetime›을 받되 tzinfo가 없는 값은 거부하는 검증기를 둡니다. "2026-12-01T10:00:00"이 서울 시각인지 UTC인지 모르는 시스템은 예약 겹침 판정부터 틀립니다.

### PATCH와 명시적 null

PATCH는 "보낸 필드만 바꾸기"이므로 ‹model_dump(exclude_unset=True)›를 씁니다. 기본값과 클라이언트가 명시한 값을 구분해 주기 때문입니다. 그런데 ‹{"memo": null}›은 명시된 null이라 필드가 set으로 취급되어 "메모를 지워라"가 됩니다. 이것이 의도인지, null을 금지할 필드인지 필드별로 정해 문서에 적어 두세요.

### 2.14.2의 JSON 처리 변경 (2026-11 기준)

Pydantic 변경 기록의 2.14.2(2026-10-29) 항목에 따르면 JSON 검증이 필드 조회와 추가 데이터를 Python 검증과 같은 방식으로 처리하도록 바뀌었습니다. 사용되지 않은 별칭이나 필드명에만 일치하는 키는 이제 extra로 취급되어 ‹extra="forbid"›에서는 ‹extra_forbidden› 오류가 납니다. 그동안 조용히 버려지던 키가 갑자기 422를 만들 수 있다는 뜻이므로, 마이너 업그레이드 PR에는 changelog 읽기와 계약 테스트가 필요합니다. 최소 Python 버전은 changelog에 2.14.0에서 3.9 지원이 빠졌다고만 적혀 있고, PyPI 설명이 Python 3.10+를 명시하므로 3.10이 최저입니다(2026-11-10 확인).

### ORM과의 접점

‹from_attributes=True›는 ORM 객체의 속성에서 값을 읽어 출력 모델을 만듭니다. 변환은 세션이 열려 있는 동안, 필요한 관계가 이미 로딩된 상태에서 하세요(레슨 6). 변환 도중 지연 로딩이 터지는 사고가 흔합니다. 한편 JSON 문자열을 직접 받는 곳(큐 메시지, 웹훅)에서는 ‹model_validate_json›이 JSON을 dict로 직접 파싱해 ‹model_validate›를 부르는 것보다 일반적으로 더 빠르다고 문서에 적혀 있습니다(성능이 중요하면 직접 측정하세요).`,
      code: `from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]


class BookingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")          # 오타·서버 소유 필드는 422로 거부
    room_id: int = Field(gt=0)
    guest: Name
    starts_at: datetime
    ends_at: datetime

    @field_validator("starts_at", "ends_at")
    @classmethod
    def must_be_aware(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("timezone offset is required")
        return v

    @model_validator(mode="after")
    def check_order(self) -> Self:
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self


class BookingPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    guest: Name | None = None
    ends_at: datetime | None = None


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)    # ORM 객체의 속성에서 읽는다
    id: int
    room_id: int
    guest: str
    starts_at: datetime
    ends_at: datetime


# PATCH: 클라이언트가 보낸 필드만 반영한다
changes = BookingPatch.model_validate_json('{"guest": "  Kim "}').model_dump(exclude_unset=True)
assert changes == {"guest": "Kim"}`,
      codeLang: `python`,
      key: [
        `Pydantic은 경계(HTTP·설정·메시지)의 런타임 검증, 타입 체커는 내부의 정적 검사다. 둘은 대체가 아니라 분업이다.`,
        `입력(Create)·패치(Patch)·출력(Out) 모델을 분리하고 서버 소유 필드는 입력 모델에 두지 않는다.`,
        `입력 모델은 extra="forbid"를 기본으로 하되, 롤링 배포와 공개 API에서는 허용 정책을 계약으로 정한다.`,
        `PATCH는 exclude_unset으로 보낸 필드만 반영한다. 명시적 null의 의미는 필드별로 정해 문서화한다.`,
        `돈은 Decimal이나 정수 최소 단위, 시각은 타임존이 있는 datetime으로 받는다.`
      ],
      pitfalls: [
        `하나의 모델을 생성·수정·응답에 재사용한다. is_admin 같은 필드가 본문으로 들어오거나 password_hash가 응답으로 나간다.`,
        `모델 기본값 extra="ignore"를 그대로 둔다. 클라이언트의 필드명 오타가 아무 오류 없이 버려져 "저장은 됐는데 값이 안 바뀐다"는 제보가 몇 주 뒤에 온다.`,
        `Pydantic 마이너 업그레이드를 changelog 없이 올린다. 2.14.2처럼 JSON 처리 일관화 변경이 forbid 모델에서 새 422를 만들 수 있다.`,
        `ORM 객체를 세션이 닫힌 뒤 응답 모델로 변환한다. 변환 중 지연 로딩이 터져 비동기 환경에서는 MissingGreenlet 오류가 난다.`
      ]
    },
    {
      title: `async def와 def: 이벤트 루프, 스레드풀, GIL, 워커 수 산수`,
      body: `FastAPI에서 가장 비싼 오해는 "async def를 쓰면 빠르다"입니다. 동시성 모델을 기계적으로 이해해야 장애를 예측할 수 있습니다.

### 이벤트 루프는 스레드 하나다

uvicorn 프로세스 하나에는 이벤트 루프가 하나 있고, 그 루프가 도는 스레드 하나가 모든 연결의 읽기·쓰기와 ‹async def› 경로 함수를 번갈아 실행합니다. 협력형이라 코루틴이 ‹await›에서 스스로 양보해야만 다른 요청이 진행됩니다. 양보 없이 1초 걸리는 일을 하면 **그 프로세스의 모든 요청이 1초 멈춥니다.** 동시 요청 10건이면 마지막 요청은 약 10초를 기다리고, 그동안 /health도 응답하지 못해 오케스트레이터가 컨테이너를 죽이는 연쇄 장애로 이어질 수 있습니다.

FastAPI 문서의 규칙(2026-11 열람 기준)은 단순합니다.

- await 가능한 라이브러리(httpx.AsyncClient, asyncpg, SQLAlchemy 비동기 세션)를 쓰면 ‹async def›.
- 블로킹 라이브러리(requests, psycopg2, 동기 SQLAlchemy, 파일·PDF 처리)를 쓰면 일반 ‹def›. 이 함수는 스레드풀에서 실행되어 이벤트 루프를 막지 않습니다.
- 확신이 없으면 ‹def›. 최악의 조합은 ‹async def› 안에서 블로킹 호출을 하는 것입니다.

### 스레드풀에는 한도가 있다

일반 ‹def› 경로 함수와 의존성은 AnyIO 워커 스레드에서 실행됩니다. 동시에 쓸 수 있는 스레드 수에는 한도가 있고 기본값은 40입니다(AnyIO 문서 기준 기본 리미터 값이며 실습에서 직접 출력해 확인하세요). 41번째 동시 요청은 대기하므로 동기 코드도 무한히 확장되지 않습니다. 동기 DB 드라이버를 쓰는 서비스에서 스레드 수와 DB 풀 크기를 함께 맞춰야 하는 이유입니다.

### GIL과 CPU 작업

스레드는 I/O 대기를 겹치는 데는 좋지만 순수 파이썬 CPU 작업은 GIL 때문에 스레드 여러 개로 병렬화되지 않습니다. GIL이 없는 free-threaded 빌드는 3.14부터 공식 지원되지만 선택 빌드이고 단일 스레드 오버헤드가 있으며(문서에 따라 3.14 문서는 약 5~10%, 3.15 기준 문서는 플랫폼별 약 1~8%로 서술해 수치가 일치하지 않습니다), 호환되지 않는 C 확장이 로드되면 GIL이 다시 켜집니다. 고객 서버가 이 빌드라고 가정하면 안 됩니다. 이미지 변환·큰 데이터 변환·암호 해시 같은 CPU 작업은 프로세스 풀이나 별도 워커로 분리합니다.

### 풀의 산수

프로세스·스레드·DB 연결은 곱셈으로 늘어납니다. SQLAlchemy 기본 풀은 pool_size 5에 max_overflow 10이라 프로세스 하나가 최대 15개 연결을 쓸 수 있습니다. 파드 4개 × 워커 2개 × 15 = 120개로, PostgreSQL 기본 max_connections 100을 넘습니다. 평소에는 멀쩡하다가 트래픽이 몰리는 순간에야 "too many connections"가 터지는 전형적인 장애입니다. 배포 설정을 검토할 때는 항상 이 곱셈을 종이에 쓰세요.

### 워커 모델

‹--workers N›은 같은 앱을 프로세스 N개로 복제합니다(메모리 N배, 전역 상태 공유 없음). 쿠버네티스처럼 오케스트레이터가 복제를 맡는 환경에서는 컨테이너당 단일 프로세스가 FastAPI 문서의 권장이고, 단일 VM이라면 코어 수 근처에서 시작해 측정으로 조정합니다. CPU limit이 1코어인 컨테이너에서 워커 4개를 띄우면 스로틀링과 메모리 4배만 얻습니다.

### 바깥 호출과 구조적 동시성

외부 API 호출에는 항상 타임아웃을 명시합니다. httpx 기본 타임아웃은 5초이고 requests는 기본이 무한대라 한 번 멈춘 상대가 워커를 영구히 붙잡을 수 있습니다. 여러 호출을 겹칠 때는 ‹asyncio.TaskGroup›(3.11 이상)으로 묶어 하나가 실패하면 나머지가 취소되게 하고, 참조를 저장하지 않은 ‹create_task›는 실행 도중 수거될 수 있으므로 피합니다.`,
      code: `import asyncio
import time

import anyio.to_thread
from fastapi import FastAPI

app = FastAPI()


def render_pdf(pages: int) -> int:
    time.sleep(1)                                   # 블로킹 라이브러리 호출을 흉내 낸다
    return pages


@app.get("/bad")
async def bad() -> dict[str, str]:
    time.sleep(1)                                   # 루프 스레드를 1초 점유: 이 프로세스의 모든 요청이 멈춘다
    return {"path": "bad"}


@app.get("/ok-sync")
def ok_sync() -> dict[str, str]:
    time.sleep(1)                                   # 스레드풀에서 실행: 다른 요청을 막지 않는다
    return {"path": "ok-sync"}


@app.get("/ok-async")
async def ok_async() -> dict[str, str]:
    await asyncio.sleep(1)                          # await에서 양보: 루프는 그동안 다른 일을 한다
    return {"path": "ok-async"}


@app.get("/offload")
async def offload() -> dict[str, int]:
    pages = await anyio.to_thread.run_sync(render_pdf, 12)   # async 함수에서 블로킹을 스레드로 넘기는 법
    return {"pages": pages}


@app.get("/limit")
async def limit() -> dict[str, float]:
    return {"threads": anyio.to_thread.current_default_thread_limiter().total_tokens}`,
      codeLang: `python`,
      key: [
        `이벤트 루프는 프로세스당 스레드 하나다. async def 안의 블로킹 호출은 그 프로세스의 모든 요청을 멈춘다.`,
        `await 가능한 라이브러리면 async def, 블로킹 라이브러리면 def, 확신이 없으면 def. def는 스레드풀(AnyIO)에서 돈다.`,
        `순수 파이썬 CPU 작업은 GIL 때문에 스레드로 병렬화되지 않는다. 프로세스 풀이나 외부 워커로 분리한다.`,
        `연결 수는 파드 × 워커 × (pool_size + max_overflow)로 계산해 DB의 max_connections보다 작게 유지한다.`,
        `외부 호출에는 항상 명시적 타임아웃을 둔다. 쿠버네티스에서는 컨테이너당 단일 프로세스가 문서 권장이다.`
      ],
      pitfalls: [
        `async def 안에서 requests·psycopg2·time.sleep·동기 파일 처리를 부른다. 단건 테스트에서는 멀쩡하다가 동시 사용자가 늘면 전체 API가 정지한다.`,
        `느려졌다고 --workers만 늘린다. 블로킹 원인은 그대로 남아 동시 요청이 워커 수를 넘으면 다시 멈추고, 메모리와 DB 연결 수만 곱으로 늘어난다.`,
        `asyncio.create_task를 반환값 없이 던진다. 참조가 사라지면 작업이 중간에 사라질 수 있고 예외도 조용히 묻힌다.`,
        `free-threaded 빌드가 모든 병목을 해결한다고 약속한다. 선택 빌드이고 C 확장 호환성이 걸림돌이라 고객 환경에서 확인되기 전에는 전제로 삼지 않는다.`
      ]
    },
    {
      title: `의존성 주입·lifespan·설정·오류 응답·인증 경계`,
      body: `앞 레슨이 "코드가 어디서 도는가"였다면 이 레슨은 "자원과 정책이 어디서 만들어지고 정리되는가"입니다. FastAPI에서는 이것이 **의존성 그래프**와 **lifespan**으로 정리됩니다.

### Depends는 조립 지점이다

‹Depends›로 선언한 함수는 요청마다 한 번 해석되고, 같은 요청 안에서 같은 의존성을 여러 곳이 쓰면 결과가 캐시됩니다. DB 세션, 현재 사용자, 페이지네이션 파라미터, 설정 객체가 전형적인 의존성입니다. ‹Annotated›로 별칭(‹SessionDep›, ‹CurrentUser›)을 만들면 시그니처가 짧아지고 린터의 기본값 함수 호출 경고도 피합니다. 의존성을 바꿔 끼울 수 있다는 점이 테스트의 핵심입니다(레슨 8).

### yield 의존성의 수명

‹yield›를 쓰는 의존성은 앞부분이 요청 처리 전에, 뒷부분이 **기본적으로 응답이 전송된 뒤** 실행됩니다(2026-11 문서 기준). 문서에는 ‹Depends(..., scope="function")›(0.121.0 추가)로 경로 함수가 끝난 직후, 응답 전송 전에 정리 코드를 돌리는 옵션이 있습니다. 과거(0.118.0 이전)에는 이쪽이 기본이라 StreamingResponse가 이미 닫힌 세션을 만나는 문제가 있었고 0.118.0에서 지금의 동작으로 되돌려졌다고 문서에 적혀 있으니, 오래된 코드를 인수할 때 참고하세요. 구분이 중요한 이유는 DB 연결입니다. 기본 동작에서는 응답이 끝날 때까지 세션이 연결을 붙잡으므로, 60초짜리 스트리밍 응답에서는 연결 한 개가 60초 묶입니다(레슨 9). 문서가 안내하는 우회는 세션을 짧은 구간에만 쓰고 직접 닫는 조기 종료입니다. 또 경로 함수의 예외가 이 의존성으로 전달되므로, 잡아 놓고 다시 던지지 않으면 클라이언트는 500을 받는데 서버 로그에는 아무것도 남지 않습니다.

### lifespan과 설정

연결 풀, HTTP 클라이언트처럼 프로세스 수명 동안 하나만 있어야 하는 자원은 ‹lifespan›에서 만들고 정리합니다. 예전의 ‹on_event›는 deprecated이고 lifespan을 지정하면 호출되지 않습니다. lifespan은 메인 앱에서만 실행되고 마운트된 하위 앱에서는 실행되지 않습니다. 설정은 pydantic-settings의 ‹BaseSettings›로 환경 변수에서 읽고 비밀 값은 ‹SecretStr›로 감싸 로그와 repr에 노출되지 않게 합니다. 필수 값이 없으면 부팅 시점에 실패하게 해서 "배포는 됐는데 첫 요청에서 죽는" 상황을 막습니다. ‹.env›는 개발용이고 운영 비밀은 플랫폼의 시크릿 저장소에서 주입하며, 한 번이라도 저장소에 커밋된 비밀은 폐기하고 새로 발급합니다.

### 오류 계약: RFC 9457

오류는 한 가지 형식으로 통일합니다. RFC 9457의 ‹application/problem+json›은 ‹type›, ‹title›, ‹status›, ‹detail›, ‹instance›를 정의하고 확장 필드를 허용합니다. 매핑 원칙은 세 가지입니다. 검증 오류는 422이고 필드별 목록을 확장 필드에 담습니다. 도메인 충돌(겹치는 예약)은 409입니다. 예상 못 한 예외는 500과 상관관계 ID만 돌려주고 스택 트레이스는 로그에만 남깁니다. 다른 테넌트의 객체를 요청하면 403이 아니라 404를 줘서 ID 존재 여부가 새지 않게 합니다.

### 인증과 인가의 경계

JWT를 쓴다면 RFC 8725(BCP 225)의 권고가 체크리스트입니다. 허용 알고리즘 집합을 서버 코드에 고정해 토큰 헤더의 alg를 맹신하지 않고(‹none›은 명시적으로 허용한 경우가 아니면 받지 않음), 서명뿐 아니라 발급자(‹iss›)와 대상(‹aud›) 클레임을 검증합니다. 만료(‹exp›) 검증은 JWT 표준 RFC 7519의 기본 규칙이고, 액세스 토큰 수명을 짧게 두는 것은 운영 원칙입니다. OAuth 2.0 연동이 필요하면 RFC 9700의 모범 사례(PKCE, 리다이렉트 URI 정확 일치, implicit 회피)를 따릅니다. 그리고 인증보다 더 자주 터지는 것이 **객체 수준 인가**입니다. OWASP API Security Top 10(2023)의 1위가 이 항목입니다. 모든 쿼리에 ‹tenant_id› 조건이 붙도록 구조를 강제하고 테스트로 고정하세요. 비밀번호 해시는 직접 구현하지 않고 검증된 argon2나 bcrypt 라이브러리를 씁니다.`,
      code: `from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_", env_file=".env")
    database_url: str
    jwt_secret: SecretStr                     # 값이 없으면 Settings() 시점, 즉 부팅 때 실패한다


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = Settings()
    engine = create_async_engine(settings.database_url, pool_size=5, max_overflow=5, pool_pre_ping=True)
    app.state.sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    yield
    await engine.dispose()


app = FastAPI(lifespan=lifespan)


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.sessionmaker() as session:
        yield session                         # 정리 코드는 기본적으로 응답 전송 뒤에 실행된다


SessionDep = Annotated[AsyncSession, Depends(get_session)]


class DomainError(Exception):
    def __init__(self, status: int, title: str, detail: str) -> None:
        self.status, self.title, self.detail = status, title, detail


@app.exception_handler(DomainError)
async def problem(request: Request, exc: DomainError) -> JSONResponse:
    body = {"type": "about:blank", "title": exc.title, "status": exc.status,
            "detail": exc.detail, "instance": request.url.path}
    return JSONResponse(body, status_code=exc.status, media_type="application/problem+json")`,
      codeLang: `python`,
      key: [
        `Depends는 요청 단위 조립 지점이고 같은 요청 안에서는 결과가 캐시된다. 테스트에서 dependency_overrides로 바꿔 끼운다.`,
        `yield 의존성의 정리 코드는 기본적으로 응답 전송 뒤에 돈다. 연결을 오래 쥐는(스트리밍) 엔드포인트에서는 세션을 읽기 구간에서만 짧게 열고 닫는다. scope="function"(0.121.0 이후)이 제너레이터형 스트리밍에서 어떻게 동작하는지는 직접 테스트로 확인한다.`,
        `프로세스 수명 자원은 lifespan에서 만들고 정리한다. 설정은 BaseSettings와 SecretStr로 읽고 필수 값이 없으면 부팅에서 실패시킨다.`,
        `오류는 RFC 9457 problem+json 한 형식으로 통일하고, 타 테넌트 객체는 404로 응답한다.`,
        `JWT는 알고리즘 고정과 iss·aud·exp 검증이 기본이고, 더 자주 터지는 것은 객체 수준 인가(tenant 조건) 누락이다.`
      ],
      pitfalls: [
        `yield 의존성에서 예외를 잡고 다시 던지지 않는다. 클라이언트는 500을 받는데 서버 로그에는 흔적이 없어 원인 추적이 불가능하다.`,
        `JWT 검증 시 토큰 헤더의 alg를 그대로 믿거나 iss·aud·exp를 검증하지 않는다. 서명만 맞으면 통과하는 구현은 알고리즘 검증과 iss·aud 검증을 요구하는 RFC 8725가 경고하는 전형적 실수이고, exp 누락은 만료된 토큰을 영구히 유효하게 만든다.`,
        `.env를 저장소에 커밋한다. 나중에 지워도 git 기록에 남으므로 비밀 폐기와 재발급이 필요해지고 인수인계 때 사고로 번진다.`,
        `500 응답에 예외 메시지나 스택 트레이스를 그대로 담는다. 내부 구조와 쿼리가 노출되고 클라이언트는 파싱할 수 없는 형식을 받는다.`
      ]
    },
    {
      title: `SQLAlchemy 2.x: Session·트랜잭션 경계·비동기 로딩 전략`,
      body: `SQLAlchemy는 두 층입니다. Core는 SQL 표현식과 연결·트랜잭션을 다루고, ORM은 그 위에 **identity map**과 **unit of work**를 얹습니다. 2.0 스타일은 ‹select()›로 문장을 만들고 ‹session.execute()›·‹session.scalars()›로 실행하며 매핑은 ‹Mapped[]›로 타입을 적습니다. 예전의 ‹session.query()›는 레거시 API입니다. 현행은 2.1 계열입니다. 2.1 문서 머리말이 2.1.8을 current release(2026-11-03)로 표시하고 PyPI 메타데이터는 Python 3.11 이상을 요구합니다(2026-11-10 확인). 다만 다운로드 페이지에 2.1 최초 릴리스(2026-01-21) 표기와 beta 표기가 섞여 있다는 조사 기록이 있어 안정도 해석이 불확실하므로, 프로젝트를 시작할 때 What's New와 릴리스 상태를 직접 확인하세요.

### Session은 작업 단위다

Session은 로드한 객체를 한 세션 안에서 PK당 하나로 유지하고(identity map), 속성 변경을 추적하다가 ‹flush›에서 의존 순서에 맞춰 SQL을 보냅니다. ‹commit›은 flush에 COMMIT을 더한 것입니다. 트랜잭션은 첫 작업에서 자동으로 시작됩니다(autobegin). 기본값 ‹expire_on_commit=True›는 커밋 뒤 모든 속성을 만료시켜 다음 접근에서 SELECT를 다시 보내는데, 비동기 환경에서는 이 암묵적 IO가 불가능하므로 문서가 권장하는 대로 ‹False›로 둡니다.

### 트랜잭션 경계는 유스케이스가 소유한다

요청 하나에 세션 하나, 커밋은 유스케이스(서비스 함수)의 끝에서 한 번이 기본형입니다. 저장소 함수가 제각각 커밋하면 "예약은 저장됐는데 결제 기록은 없다" 같은 반쪽 상태가 생깁니다. 반대로 **트랜잭션 안에서 외부 HTTP 호출을 기다리면** 안 됩니다. 트랜잭션이 길어지면 행 잠금과 연결을 오래 쥐고, 오래 열린 트랜잭션은 PostgreSQL의 vacuum이 죽은 튜플을 청소하지 못하게 막습니다. 외부 호출은 트랜잭션 밖에서, 결과만 짧은 트랜잭션으로 기록합니다.

### 비동기 세션의 규칙

AsyncSession 하나는 동시에 여러 태스크가 쓰면 안 됩니다(문서가 명시). ‹asyncio.gather›로 병렬 쿼리를 하려면 태스크마다 세션을 따로 엽니다. 풀은 기본 pool_size 5에 max_overflow 10이고, 방화벽이나 프록시가 유휴 연결을 끊는 환경에서는 ‹pool_pre_ping›이나 ‹pool_recycle›이 필요합니다.

### 로딩 전략과 N+1

관계 속성의 기본은 지연 로딩이라, 목록 100건에 자식 접근이 하나씩 붙으면 쿼리 101개가 나갑니다(건당 2ms라면 약 200ms, 자릿수 감각). 비동기에서는 지연 로딩이 아예 **오류**가 됩니다(MissingGreenlet). 해법은 ‹selectinload›(부모 ID들로 IN 쿼리 하나, 컬렉션에 적합), ‹joinedload›(JOIN 한 번, 다대일에 적합하고 컬렉션은 행이 곱해짐)로 미리 로딩하고, 관계에 ‹lazy="raise"›를 걸어 실수로 지연 로딩이 일어나면 즉시 실패하게 만드는 것입니다. 쿼리 수는 눈으로 세지 말고 테스트로 고정합니다(레슨 10).

### 정합성은 DB가 최종 심판이다

"겹치는 예약 금지"를 애플리케이션의 if로만 검사하면 동시 요청 두 개가 모두 통과합니다. 유니크 제약이나 PostgreSQL의 배제 제약(EXCLUDE) 같은 DB 제약을 최종 방어선으로 두고, ‹IntegrityError›를 409로 매핑합니다. 행 단위로 잠가야 하는 경우 ‹with_for_update()›를 쓰되 트랜잭션을 짧게 유지합니다.

### 멀티테넌시와 DB 방언

모든 테넌트 소유 테이블에 ‹tenant_id›를 두고 (tenant_id, 조회 키) 복합 인덱스를 만듭니다. 소프트 삭제를 쓴다면 유니크 제약이 삭제된 행과 충돌하므로 PostgreSQL의 부분 유니크 인덱스(WHERE deleted_at IS NULL)가 필요합니다. 이처럼 PostgreSQL 전용 기능을 쓸지는 고객 DB가 확정된 뒤에 결정하고 ADR에 남기세요.`,
      code: `from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, MetaData, String, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, selectinload

NAMING = {"ix": "ix_%(column_0_label)s", "uq": "uq_%(table_name)s_%(column_0_name)s",
          "ck": "ck_%(table_name)s_%(constraint_name)s",
          "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
          "pk": "pk_%(table_name)s"}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)       # 제약 이름을 예측 가능하게: 마이그레이션이 쉬워진다


class Room(Base):
    __tablename__ = "room"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(index=True)
    name: Mapped[str] = mapped_column(String(80))
    bookings: Mapped[list["Booking"]] = relationship(back_populates="room", lazy="raise")


class Booking(Base):
    __tablename__ = "booking"
    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("room.id"), index=True)
    guest: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    room: Mapped[Room] = relationship(back_populates="bookings", lazy="raise")


async def rooms_with_bookings(session: AsyncSession, tenant_id: int) -> list[Room]:
    stmt = (select(Room).where(Room.tenant_id == tenant_id)
            .options(selectinload(Room.bookings)).order_by(Room.id))   # 방이 몇 개든 쿼리는 2개
    return list((await session.scalars(stmt)).all())


async def add_booking(session: AsyncSession, room_id: int, guest: str) -> Booking:
    booking = Booking(room_id=room_id, guest=guest)
    session.add(booking)
    await session.commit()          # 경계는 유스케이스가 소유한다. 중복·겹침은 DB 제약이 IntegrityError로 막는다
    return booking                  # expire_on_commit=False 이므로 커밋 뒤에도 속성을 읽을 수 있다`,
      codeLang: `python`,
      key: [
        `Session은 identity map과 unit of work다. commit은 flush에 COMMIT을 더한 것이고, 트랜잭션은 첫 작업에서 자동 시작된다.`,
        `비동기 앱은 expire_on_commit=False, 요청당 AsyncSession 하나, 태스크 간 공유 금지를 기본 규칙으로 한다.`,
        `트랜잭션 경계는 유스케이스가 소유하고, 트랜잭션 안에서는 외부 호출을 기다리지 않는다.`,
        `관계는 selectinload·joinedload로 미리 로딩하고 lazy="raise"로 실수를 즉시 드러낸다. 쿼리 수는 테스트로 고정한다.`,
        `정합성(겹침·중복)은 애플리케이션 if가 아니라 DB 제약이 최종 방어선이고, 테넌트 조건은 모든 쿼리에 붙인다.`
      ],
      pitfalls: [
        `비동기 엔드포인트에서 관계를 지연 로딩한다. 동기 환경에서는 조용히 N+1이 되고 비동기에서는 MissingGreenlet으로 500이 난다.`,
        `하나의 AsyncSession을 asyncio.gather의 여러 태스크에 넘긴다. 동시 사용은 지원되지 않아 간헐적 오류가 난다.`,
        `저장소 함수마다 commit을 호출한다. 한 유스케이스가 중간에 실패하면 일부만 저장된 반쪽 상태가 남는다.`,
        `겹침 검사를 SELECT 후 INSERT로만 구현한다. 동시 요청 두 개가 같은 빈 슬롯을 보고 둘 다 통과해 이중 예약이 생긴다.`
      ]
    },
    {
      title: `Alembic과 무중단 마이그레이션: autogenerate의 한계, expand/contract, 락`,
      body: `마이그레이션 사고는 운영 장애의 단골입니다. 이유는 스키마 변경이 **코드 배포와 시간차**를 두고 일어나기 때문입니다. 롤링 배포 중에는 구버전 파드와 신버전 파드가 같은 DB를 보고, 롤백하면 신버전 스키마를 구버전 코드가 만납니다. Alembic은 이 변경을 리비전 체인(‹down_revision›)으로 기록하고 ‹alembic_version› 테이블에 현재 위치를 남기는 도구입니다. 비동기 프로젝트는 ‹alembic init -t async› 템플릿으로 시작하고 ‹env.py›의 ‹target_metadata›를 모델의 metadata에 연결합니다. 현행은 1.20.1(2026-10-21)이고 1.20.0에서 SQLAlchemy 1.4 지원이 끝나 2.0 이상이 필요합니다.

### autogenerate는 초안일 뿐이다

autogenerate는 모델 metadata와 실제 DB를 비교해 후보 스크립트를 만듭니다. 문서(2026-11 열람)에 따르면 테이블·컬럼의 추가와 삭제, nullable 변경, 컬럼 타입 변경(‹compare_type› 기본 켜짐), 기본적인 인덱스·외래 키·이름 있는 유니크 제약은 감지하지만 **테이블·컬럼 이름 변경은 감지하지 못하고** drop과 add로 만들어 냅니다. 이름 없는 제약과 네이티브 ENUM이 없는 백엔드의 Enum 타입도 놓치고, PRIMARY KEY와 EXCLUDE 제약은 안정적으로 감지하지 못하며, 서버 기본값 비교(‹compare_server_default›)는 옵션입니다. 문서가 스스로 "완벽하도록 의도되지 않았다"고 말합니다. 그래서 생성된 스크립트는 항상 사람이 읽고 고치며, CI에서 ‹alembic check›로 "모델과 마이그레이션이 어긋났는가"를 검사합니다. 제약에는 처음부터 ‹naming_convention›을 줍니다. 이름이 없으면 PostgreSQL이 임의로 붙인 이름을 카탈로그에서 찾아야 지울 수 있습니다.

### expand/contract

컬럼 이름을 guest에서 guest_name으로 바꾸는 한 줄짜리 변경도 무중단으로 하려면 단계를 나눕니다.

1. **expand**: 새 컬럼을 nullable로 추가하고(메타데이터 변경만이라 빠름) 마이그레이션으로 배포합니다.
2. 앱을 배포해 두 컬럼에 모두 쓰고(dual write) 읽기는 옛 컬럼 기준으로 둡니다.
3. **백필**: 기존 행을 배치로 채웁니다. 배치마다 커밋해야 장기 트랜잭션과 긴 행 잠금이 생기지 않습니다. 이중 쓰기가 배포된 뒤에 돌려야 백필 도중·직후에 들어온 행이 빠지지 않습니다.
4. 읽기를 새 컬럼으로 전환하고 한 릴리스 동안 롤백 여지를 둡니다.
5. **contract**: 옛 컬럼 쓰기를 멈추고 다음 릴리스에서 제거합니다.

### 락을 읽는 법 (PostgreSQL)

DDL 대부분은 테이블에 강한 락(ACCESS EXCLUSIVE)을 요구합니다. 위험한 것은 락 시간 자체보다 **대기열**입니다. 오래 걸리는 쿼리가 있는 테이블에 ALTER가 락을 기다리면, 그 뒤에 도착한 모든 쿼리가 ALTER 뒤에 줄을 서서 서비스 전체가 멈춥니다. 마이그레이션 시작에 ‹SET LOCAL lock_timeout› 같은 짧은 제한을 두면 실패하고 다시 시도할 수 있습니다. 그 밖의 규칙입니다.

- 기본값 없이(NULL) 추가하는 컬럼은 재작성이 없고, 상수 기본값도 PostgreSQL 11 이후 재작성이 없지만, 휘발성 기본값(예: ‹clock_timestamp()›)은 테이블과 인덱스를 통째로 다시 씁니다. 재작성이 없어도 ACCESS EXCLUSIVE 락은 필요하므로 대기열 문제는 그대로입니다.
- NOT NULL 추가는 전체 스캔을 하므로 큰 테이블에서는 CHECK 제약을 NOT VALID로 추가하고 VALIDATE한 뒤 SET NOT NULL 하는 순서로 나눕니다(PostgreSQL 12 이상에서 검증된 제약이 스캔을 생략).
- 인덱스는 ‹CREATE INDEX CONCURRENTLY›로 만들되 트랜잭션 밖에서 실행해야 하며, 실패하면 INVALID 인덱스가 남습니다.
- 외래 키도 NOT VALID로 추가한 뒤 VALIDATE 합니다.

### 운영 규칙

마이그레이션은 앱 시작 시 자동 실행하지 않고 배포 파이프라인의 별도 단계(Job)로 한 번만 실행합니다. 파드 세 개가 동시에 ‹upgrade›를 시도하는 상황을 피하기 위해서입니다. 트랜잭션 밖에서 돌려야 하는 문장(동시 인덱스, 배치 커밋)은 ‹autocommit_block›으로 감싸는데, 이 블록은 직전까지의 트랜잭션을 무조건 커밋하므로 Alembic 문서는 ‹transaction_per_migration›을 켜 두라고 권합니다. 그렇지 않으면 앞선 리비전까지 한꺼번에 커밋됩니다. 마이그레이션 파일에서 앱의 ORM 모델을 import하지 않습니다. 모델은 계속 바뀌지만 과거 마이그레이션은 고정되어야 하므로 ‹sa.text›나 마이그레이션 안의 간단한 테이블 정의를 씁니다. downgrade는 데이터 손실이 있으면 진짜 되돌림이 아니므로, 운영 정책은 "앞으로 고치기(forward-fix)"와 사전 백업으로 둡니다.`,
      code: `"""expand: booking.guest_name 추가 + 배치 백필 + 동시 인덱스 생성

데모를 위해 한 리비전에 묶었다. 운영에서는 이중 쓰기 배포 뒤에 백필을 실행하거나,
contract 전에 guest_name IS NULL 행이 없는지 확인한다. guest는 NOT NULL이라고 가정한다.
"""
import sqlalchemy as sa
from alembic import op

revision = "3c1f9a7b2d40"
down_revision = "8a52e0d4c611"
BATCH = 5000


def upgrade() -> None:
    op.execute("SET LOCAL lock_timeout = '3s'")        # 락 대기열에 오래 서서 서비스 전체를 막지 않는다
    op.add_column("booking", sa.Column("guest_name", sa.String(80), nullable=True))

    with op.get_context().autocommit_block():           # 직전까지 커밋하고, 안에서는 문장마다 즉시 커밋(env.py에 transaction_per_migration=True 권장)
        conn = op.get_bind()
        while True:
            done = conn.execute(
                sa.text("UPDATE booking SET guest_name = guest WHERE id IN ("
                        " SELECT id FROM booking WHERE guest_name IS NULL ORDER BY id LIMIT :n)"),
                {"n": BATCH},
            ).rowcount
            if done == 0:
                break
        op.create_index("ix_booking_guest_name", "booking", ["guest_name"],
                        postgresql_concurrently=True)    # 트랜잭션 밖에서만 가능


def downgrade() -> None:
    op.drop_index("ix_booking_guest_name", table_name="booking")
    op.drop_column("booking", "guest_name")`,
      codeLang: `python`,
      key: [
        `스키마 변경은 코드 배포와 시간차가 있다. 마이그레이션은 구버전과 신버전 코드가 모두 견디도록 expand → 백필 → contract로 나눈다.`,
        `autogenerate는 초안이다. 이름 변경을 drop+add로 만들고 이름 없는 제약·EXCLUDE 제약 등을 놓치므로 사람이 검토하고 alembic check를 CI에 둔다.`,
        `naming_convention은 첫 마이그레이션 전에 정한다. 제약 이름이 예측 가능해야 안전하게 지울 수 있다.`,
        `ALTER의 진짜 위험은 락 대기열이다. lock_timeout을 걸고, NOT NULL·FK는 NOT VALID 후 VALIDATE, 인덱스는 CONCURRENTLY로 한다.`,
        `마이그레이션은 배포 파이프라인에서 한 번만 실행하고, 앱 ORM 모델에 의존하지 않으며, 정책은 forward-fix와 사전 백업이다.`
      ],
      pitfalls: [
        `리네임 후 autogenerate 결과를 검토 없이 적용한다. drop_column이 실행되어 기존 데이터가 사라지고, 롤링 배포 중인 구버전 코드는 컬럼 부재로 500을 낸다.`,
        `백필을 마이그레이션 하나의 트랜잭션 안에서 반복문으로 돌린다. 배치마다 커밋하지 않으면 전체가 하나의 긴 트랜잭션이라 행 잠금이 쌓이고 vacuum이 막힌다.`,
        `CREATE INDEX CONCURRENTLY가 실패한 뒤 같은 이름으로 재시도한다. INVALID 인덱스가 남아 있어 존재 검사만 하는 코드는 건너뛰므로, 실패 후에는 INVALID 인덱스를 확인하고 지운다.`,
        `앱 시작 시 upgrade를 자동 실행한다. 파드가 여러 개이면 동시에 시도하고, 실패한 마이그레이션이 파드 재시작을 반복시킨다.`
      ]
    },
    {
      title: `테스트 전략: dependency_overrides, httpx, 실제 PostgreSQL, 트랜잭션 롤백`,
      body: `API 테스트의 목표는 "함수가 돈다"가 아니라 **계약이 지켜진다**를 자동으로 증명하는 것입니다. 상태 코드, problem+json 본문, 테넌트 격리, 충돌(409), 검증(422)이 계약의 내용입니다. 인수 기준이 테스트 목록으로 바뀔 때 비로소 "완료"를 서로 다툴 여지가 줄어듭니다.

### 클라이언트 선택: TestClient와 AsyncClient

동기 테스트에는 ‹TestClient›가 간단합니다. 테스트 함수 자체가 async여야 하거나 async DB 호출을 테스트 안에서 직접 await 해야 하면 ‹httpx.AsyncClient›에 ‹ASGITransport›를 붙이고 ‹@pytest.mark.anyio›를 씁니다. 문서가 짚는 함정이 하나 있습니다. ASGITransport는 **lifespan 이벤트를 실행하지 않습니다.** lifespan에서 만든 자원(‹app.state›)에 의존하는 앱은 asgi-lifespan의 LifespanManager로 감싸거나, 의존성을 오버라이드해서 그 경로를 아예 우회해야 합니다.

### dependency_overrides

‹app.dependency_overrides[원본] = 대체›는 앱 어디서 쓰이든 의존성을 바꿔 끼웁니다. 세션, 현재 사용자(토큰 검증 우회), 시계, LLM 클라이언트 같은 외부 의존이 대상입니다. 테스트가 끝나면 반드시 비웁니다. 오버라이드가 남으면 다음 테스트가 가짜에 의존한 채 통과하는 오염이 생깁니다. 외부 서비스 경계(결제·LLM·메일)는 필요한 메서드만 담은 ‹Protocol›로 정의해 두면 운영 구현과 테스트용 가짜가 같은 타입으로 취급되고, mypy가 두 시그니처의 일치를 검사해 줍니다.

### DB는 실제 PostgreSQL로

SQLite로 테스트하고 PostgreSQL로 운영하면 테스트가 통과해도 운영에서 깨집니다. JSONB, 부분 인덱스, 배제 제약, 행 잠금, 타임존 처리, 대소문자 비교가 다릅니다. CI에서는 서비스 컨테이너나 Testcontainers 같은 도구로 실제 PostgreSQL을 띄우고, 스키마는 ‹alembic upgrade head›로 만듭니다. 마이그레이션 자체가 테스트에 들어오기 때문입니다.

### 테스트 격리: 바깥 트랜잭션 + 세이브포인트

테스트마다 테이블을 지우는 것은 느립니다. 대신 연결 하나에서 바깥 트랜잭션을 열고 세션을 ‹join_transaction_mode="create_savepoint"›로 묶으면, 코드가 ‹commit()›을 불러도 세이브포인트 해제일 뿐이고 테스트 끝에 바깥 트랜잭션을 롤백하면 모든 흔적이 사라집니다. 한계도 압니다. 커밋 시점에 검사되는 지연 제약이나 두 연결이 겹치는 **진짜 동시성**은 이 방식으로 검증되지 않으므로, 이중 예약 같은 케이스는 별도의 실커밋 테스트로 둡니다.

### 무엇을 테스트할까

- 계약 테스트: 각 엔드포인트의 성공·404·409·422 응답 형식, problem+json 필드. OpenAPI 스냅샷을 저장소에 두고 CI에서 diff로 의도하지 않은 변경을 잡습니다.
- 격리 테스트: 테넌트 A 토큰으로 B의 객체를 조회하면 404인지.
- 쿼리 수 테스트: 목록 API의 SELECT가 데이터 양과 무관하게 상수인지(레슨 10).
- 순수 로직은 DB 없이 단위 테스트로 빠르게.

### pytest 운영

비동기 fixture는 함수 범위로 시작하고 필요할 때만 넓힙니다. 범위가 넓은 async fixture는 이벤트 루프 수명과 충돌하기 쉽습니다. 시간과 난수는 주입해서 고정하고, 병렬 실행(pytest-xdist 등)을 쓰려면 워커마다 DB를 분리해야 합니다. 테스트가 느려지면 개발자는 건너뜁니다. 수백 개 테스트가 1~2분 안에 끝나는 것을 팀 규칙으로 삼으세요.`,
      code: `import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.deps import get_session
from app.main import app

TEST_DB = "postgresql+asyncpg://app:app@localhost:5433/app_test"   # alembic upgrade head 로 미리 만든 DB


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
async def engine():
    eng = create_async_engine(TEST_DB, poolclass=NullPool)
    yield eng
    await eng.dispose()


@pytest.fixture
async def session(engine):
    async with engine.connect() as conn:
        outer = await conn.begin()
        async with AsyncSession(bind=conn, join_transaction_mode="create_savepoint",
                                expire_on_commit=False) as s:
            yield s                              # s.commit()은 세이브포인트 해제일 뿐이다
        await outer.rollback()                   # 테스트가 끝나면 전부 되돌린다


@pytest.fixture
async def client(session):
    async def override():
        yield session
    app.dependency_overrides[get_session] = override     # lifespan 없이도 동작하게 세션을 직접 주입
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_overlapping_booking_is_409(client):       # room 1은 시드 데이터라고 가정
    body = {"room_id": 1, "guest": "kim", "starts_at": "2026-12-01T10:00:00+09:00",
            "ends_at": "2026-12-01T11:00:00+09:00"}
    assert (await client.post("/bookings", json=body)).status_code == 201
    r = await client.post("/bookings", json=body)
    assert r.status_code == 409 and r.headers["content-type"].startswith("application/problem+json")`,
      codeLang: `python`,
      key: [
        `테스트는 계약(상태 코드·problem+json·테넌트 격리·409·422)을 증명하는 도구이고, 인수 기준을 테스트 목록으로 바꾼다.`,
        `ASGITransport는 lifespan을 실행하지 않는다. LifespanManager를 쓰거나 dependency_overrides로 자원 생성 경로를 우회한다.`,
        `운영이 PostgreSQL이면 테스트도 PostgreSQL이다. 스키마는 alembic upgrade head로 만들어 마이그레이션을 함께 검증한다.`,
        `바깥 트랜잭션과 create_savepoint 모드로 테스트를 격리하되, 실제 동시성은 실커밋 별도 테스트로 검증한다.`,
        `오버라이드는 테스트가 끝나면 비운다. 비동기 fixture는 함수 범위로 시작한다.`
      ],
      pitfalls: [
        `SQLite 인메모리로 CI를 돌린다. JSONB·부분 인덱스·행 잠금·타임존이 달라 테스트는 통과하고 운영에서 깨진다.`,
        `dependency_overrides를 비우지 않는다. 이전 테스트의 가짜 사용자나 가짜 세션이 남아 순서에 따라 통과하거나 실패하는 불안정한 테스트가 된다.`,
        `롤백 격리만 믿고 동시성 버그를 검증한 것으로 간주한다. 두 연결이 동시에 커밋하는 상황은 한 연결 안의 세이브포인트로 재현되지 않는다.`,
        `테스트마다 엔진을 만들고 풀을 유지해 이벤트 루프가 다른 객체가 섞인다. 함수 범위 엔진과 NullPool로 시작하고 속도 문제가 확인될 때만 최적화한다.`
      ]
    },
    {
      title: `API 운영 기능: 키셋 페이지네이션, SSE 스트리밍, BackgroundTasks의 한계, 배포`,
      body: `계약 설계는 선수 모듈에서 다뤘으니 여기서는 FastAPI와 SQLAlchemy로 **구현할 때** 갈리는 운영 판단만 봅니다.

### 페이지네이션과 정렬

offset 방식은 구현이 쉽지만 깊은 페이지에서 앞의 행을 읽고 버리므로 비용이 offset에 비례하고, 페이지를 넘기는 사이 새 행이 끼어들면 중복·누락이 생깁니다. 키셋(커서) 방식은 마지막으로 본 키보다 큰 행만 인덱스 범위 스캔으로 읽으므로 깊이와 무관하게 일정하고 안정적입니다. 조건은 **유일하고 안정적인 정렬 키**입니다. 정렬 키가 겹칠 수 있으면(생성 시각 등) ID를 보조 키로 붙입니다. 정렬·필터 필드를 사용자 입력 문자열로 그대로 ‹order_by›에 넘기지 말고 허용 목록으로 매핑합니다. 한 번에 최대 개수(‹le=100›)는 서버에서 제한합니다.

### OpenAPI를 계약으로 쓰기

‹app.openapi()›의 결과를 저장소에 스냅샷으로 두고 CI에서 diff를 검사하면, 필드 삭제나 타입 변경 같은 의도하지 않은 하위 호환 파괴가 PR에서 드러납니다. 경로 함수에 ‹operation_id›를 안정적으로 부여하면 생성되는 클라이언트 SDK의 함수 이름이 흔들리지 않습니다. 버전은 ‹APIRouter(prefix="/v1")›처럼 구조로 표현합니다.

### 스트리밍: LLM 토큰을 흘려보내기

FastAPI 문서(2026-11 열람)에는 0.135.0에 추가된 서버 전송 이벤트(SSE) 지원이 있습니다. 경로 함수에서 ‹yield›하고 ‹response_class=EventSourceResponse›를 지정하면 각 항목이 JSON으로 인코딩되어 ‹data:› 필드로 나가고, 유휴 상태에서는 15초마다 keep-alive ping을 보내며 ‹Cache-Control: no-cache›와 ‹X-Accel-Buffering: no›를 설정합니다. 문서에 없는 버전이라면 ‹StreamingResponse›에 ‹text/event-stream›을 직접 지정하는 방식이 대안입니다. 운영 체크리스트는 다음과 같습니다.

- 프록시·로드밸런서가 응답을 버퍼링하거나 유휴 연결을 끊지 않는지 확인합니다(유휴 타임아웃은 제품마다 달라 60초 안팎인 경우가 많으니 사용하는 제품의 값을 확인하고 15초 ping 간격과 비교합니다).
- 클라이언트가 끊으면 상류 LLM 호출도 취소해 비용이 새지 않게 합니다.
- 스트림이 끝날 때까지 DB 세션을 붙잡지 않습니다. 필요한 데이터는 ‹async with› 블록으로 짧게 연 세션에서 읽고, 블록이 끝난 뒤에 스트리밍을 시작합니다(레슨 5의 정리 시점 문제). ‹scope="function"›이 제너레이터형 스트리밍 엔드포인트에서 어떻게 동작하는지는 문서에서 확인하지 못했으니 직접 테스트하세요.
- 단방향 토큰 전송이면 SSE로 충분하고, 양방향 상호작용이 필요할 때 WebSocket을 고려합니다.

### BackgroundTasks는 어디까지

BackgroundTasks는 **같은 프로세스에서 응답 뒤에** 실행됩니다. 메일 알림처럼 작고 유실돼도 괜찮은 일에 맞고, FastAPI 문서도 무겁거나 여러 프로세스·서버에서 돌려야 하는 일에는 Celery 같은 큐 기반 도구를 권합니다. 배포나 재시작으로 프로세스가 죽으면 작업이 사라지고, 재시도·상태 조회·다중 서버 분산이 없습니다. 무겁거나 반드시 끝나야 하는 일은 작업 레코드를 같은 트랜잭션으로 DB에 기록(outbox)하고 별도 워커 프로세스가 처리하는 구조로 분리합니다. 특정 큐 라이브러리의 비교는 이번 조사에서 확인하지 못했으므로 고객 인프라(Redis·SQS 등)에 맞춰 선택합니다.

### 배포

이미지는 ‹uv sync --locked --no-dev›로 만들고 비루트 사용자로 실행하며 프로세스는 컨테이너당 하나로 둡니다. 헬스(살아 있는가)와 레디니스(트래픽을 받아도 되는가, DB 연결 가능)를 분리합니다. 종료 신호(SIGTERM)를 받으면 진행 중 요청을 마무리한 뒤 내려가야 하고, 쿠버네티스 기본 종료 유예는 30초이므로 스트리밍 요청이 그보다 길면 끊긴다는 점을 미리 합의합니다. 로그는 JSON으로 stdout에 남기고 요청마다 상관관계 ID를 붙입니다.`,
      code: `import asyncio
from collections.abc import AsyncIterable
from typing import Annotated

from fastapi import APIRouter, Query
from fastapi.sse import EventSourceResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.deps import SessionDep
from app.models import Booking

router = APIRouter(prefix="/v1")


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    guest: str


class Page(BaseModel):
    items: list[BookingOut]
    next_after_id: int | None                     # 다음 페이지 시작 커서. None이면 마지막 페이지


class Token(BaseModel):
    text: str


@router.get("/bookings")
async def list_bookings(session: SessionDep, limit: Annotated[int, Query(ge=1, le=100)] = 50,
                        after_id: int | None = None) -> Page:
    stmt = select(Booking).order_by(Booking.id).limit(limit + 1)    # 한 건 더 읽어 다음 페이지 여부를 안다
    if after_id is not None:
        stmt = stmt.where(Booking.id > after_id)                    # OFFSET 대신 키셋: 깊은 페이지도 인덱스 범위 스캔
    rows = list((await session.scalars(stmt)).all())
    page = rows[:limit]
    return Page(items=[BookingOut.model_validate(r) for r in page],
                next_after_id=page[-1].id if len(rows) > limit else None)


@router.get("/summary/stream", response_class=EventSourceResponse)
async def stream_summary() -> AsyncIterable[Token]:
    for word in "예약 요약을 생성하는 중입니다".split():
        await asyncio.sleep(0.2)                  # 실제로는 LLM 클라이언트의 비동기 스트림을 중계한다
        yield Token(text=word)`,
      codeLang: `python`,
      key: [
        `키셋 페이지네이션은 깊이와 무관하게 일정하다. 유일하고 안정적인 정렬 키가 필요하고, 정렬·필터 필드는 허용 목록으로 제한한다.`,
        `app.openapi() 스냅샷을 저장소에 두고 CI에서 diff 검사하면 하위 호환 파괴가 PR에서 드러난다.`,
        `SSE는 프록시 버퍼링, 유휴 타임아웃, 클라이언트 끊김 시 상류 호출 취소, DB 세션 점유를 함께 점검한다.`,
        `BackgroundTasks는 같은 프로세스에서 응답 뒤에 돈다. 유실되면 안 되거나 재시도가 필요한 작업은 outbox와 별도 워커로 분리한다.`,
        `컨테이너당 프로세스 하나, uv sync --locked 빌드, 헬스와 레디니스 분리, SIGTERM 유예 시간 합의가 배포의 기본이다.`
      ],
      pitfalls: [
        `정렬 키가 유일하지 않은데 키셋 페이지네이션을 쓴다. 같은 값의 행이 페이지 경계에서 누락되거나 중복된다.`,
        `사용자가 보낸 sort 문자열을 그대로 order_by에 넣는다. 정렬 불가능한 컬럼으로 풀 스캔을 유발하거나 예기치 않은 컬럼을 노출한다.`,
        `SSE 엔드포인트에서 DB 세션 의존성이 응답이 끝날 때까지 연결을 점유한다. 동시 접속이 늘면 풀이 고갈되어 관계없는 API까지 실패한다.`,
        `배포 직후 프록시가 SSE를 버퍼링하는데 로컬에서만 테스트한다. 토큰이 한 번에 몰려 나오거나 60초 근처에서 끊기는 문제를 운영에서 처음 본다.`
      ]
    },
    {
      title: `통합 사례: 인수받은 FastAPI 서비스 안정화와 인수인계 패키지`,
      body: `이 레슨은 앞의 아홉 레슨을 한 번에 쓰는 가상의 인수 프로젝트입니다.

### 상황

객실 예약 SaaS를 운영하는 직원 8명의 스타트업이 연락해 왔습니다. 6개월 전 외주 개발자가 만든 FastAPI 서비스가 점심 직전 피크에 느려지고 주 1~2회 500 오류가 나며, 그 개발자는 이미 떠났습니다. 요구는 세 가지입니다. 안정화, 인수인계 가능한 상태, 다음 달 출시할 "예약 요약 AI" 기능(응답 스트리밍).

### 1단계: 견적 전 진단 (별도 유료, 1~2일)

코드를 열어 보기 전에는 고정가를 부르지 않습니다. 진단 결과 이런 것들이 나왔다고 가정합니다.

1. 의존성은 pip freeze 결과이고 운영 런타임은 Python 3.10(2026-10-01 EOL)입니다.
2. ‹async def› 안에서 requests와 동기 DB 드라이버를 호출합니다(레슨 4).
3. 모듈 전역 Session 하나를 모든 요청이 공유합니다(레슨 6).
4. 마이그레이션이 없습니다. ‹create_all›과 수동 SQL로 운영 DB를 만졌습니다.
5. 예약 100건 목록에 쿼리가 101개 나갑니다(N+1).
6. 컨테이너 CMD가 ‹--workers 8›이고 풀 기본값이라 파드 2개로 8 × 15 × 2 = 240개 연결이 가능한데 DB는 max_connections 100입니다.
7. 테스트가 없고, 오류 응답 형식이 제각각이며, .env가 저장소에 있습니다.

### 2단계: 위험 대비 효과로 순서 정하기

1. 설정만으로 되는 것: 워커·풀 산수 정정, 외부 호출 타임아웃, 전역 세션 제거. 코드 변경이 작고 효과가 큽니다.
2. 블로킹 호출 제거(httpx 비동기 또는 def 전환).
3. **리팩터링 전에 특성화 테스트**: 지금의 동작을 고정하는 테스트를 먼저 씁니다. 그래야 고쳤다는 증거가 생깁니다.
4. N+1 제거와 쿼리 수 테스트.
5. Alembic 베이스라인: 운영 스키마와 같은 초기 리비전을 만들고, 스테이징에 복원한 사본에서 ‹alembic stamp head›로 위치를 찍은 뒤 ‹alembic check›와 ‹pg_dump --schema-only› 비교로 일치를 확인합니다. 이후 변경만 expand/contract로 진행합니다.
6. 툴체인·CI·컨테이너: uv.lock, ruff, mypy, 이미지 빌드.
7. 신기능은 별도 라우터로 만들고 DB 세션 점유를 피합니다(레슨 9).

### 3단계: 측정으로 합의하기

개선 전후에 **같은 부하 스크립트**로 p95 지연, 오류율, 요청당 쿼리 수, 최대 DB 연결 수를 기록합니다. "빨라졌습니다"가 아니라 "목록 API p95가 얼마에서 얼마로, 요청당 쿼리가 101에서 3으로"를 인수 기준으로 문서에 박습니다. 위시켓 법무팀장의 조언처럼 기능별 완료 기준을 계약에 넣는 일의 기술적 형태입니다.

### 4단계: 인수인계 패키지

README(깨끗한 환경에서 10분 안에 기동), OpenAPI 스냅샷, 런북(배포·롤백·마이그레이션·장애 대응), 버전과 EOL 표(2026-11 기준 날짜 표기), ADR(async 드라이버, 테넌트 격리, 백그라운드 처리 선택 이유), 비밀 교체 기록, 업그레이드 정책(0.x인 FastAPI를 월 1회 PR로 올릴지)입니다. 마지막으로 깨끗한 환경에서 ‹git clone› 부터 테스트 통과까지 리허설을 하고 소요 시간을 기록합니다.

### 견적과 위험

진단은 고정 소액으로 분리하고, 이후 작업은 진단 결과를 근거로 범위·가정·제외 항목을 쓴 문서와 함께 제시합니다. 운영 DB에 접근하는 마이그레이션 단계는 고객의 백업 확인과 점검 시간 합의를 선행 조건으로 적습니다.`,
      code: `from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine

SKIP = ("SAVEPOINT", "RELEASE", "ROLLBACK", "BEGIN", "COMMIT")


@contextmanager
def count_queries(engine: AsyncEngine) -> Iterator[list[str]]:
    """with 블록 안에서 엔진이 실행한 SQL 문장을 모은다 (트랜잭션 제어 문장은 제외)."""
    statements: list[str] = []

    def before(conn, cursor, statement, parameters, context, executemany) -> None:
        if not statement.lstrip().upper().startswith(SKIP):
            statements.append(statement)

    event.listen(engine.sync_engine, "before_cursor_execute", before)
    try:
        yield statements
    finally:
        event.remove(engine.sync_engine, "before_cursor_execute", before)


# tests/test_rooms.py : 방이 200개여도 쿼리 수는 상수여야 한다
# @pytest.mark.anyio
# async def test_rooms_list_constant_queries(client, engine):
#     with count_queries(engine) as q:
#         r = await client.get("/v1/rooms")
#     assert r.status_code == 200
#     assert len(q) <= 3, q          # 실패하면 어떤 SQL이 반복됐는지 그대로 출력된다`,
      codeLang: `python`,
      key: [
        `인수 프로젝트는 진단(유료, 소액) → 위험 대비 효과 순서의 안정화 → 측정으로 합의 → 인수인계 패키지 순서로 간다.`,
        `리팩터링 전에 특성화 테스트로 현재 동작을 고정하고, 개선 전후를 같은 부하 스크립트로 측정해 인수 기준 수치로 남긴다.`,
        `기존 DB에는 Alembic 베이스라인(초기 리비전 + stamp head)을 먼저 세우고 이후 변경만 expand/contract로 한다.`,
        `설정 산수(워커 × 풀 × 파드 vs max_connections)와 타임아웃 같은 저비용 조치가 가장 먼저다.`,
        `납품물의 완성은 깨끗한 환경에서 문서만으로 재현되는지를 리허설로 확인하는 것이다.`
      ],
      pitfalls: [
        `진단 없이 고정가를 부른다. 열어 보니 테스트·마이그레이션·락 파일이 모두 없는 코드라면 견적의 몇 배 공수가 든다.`,
        `테스트 없이 구조부터 갈아엎는다. 기능이 달라졌는지 증명할 수 없고 고객은 "전보다 느려졌다"는 말만 남긴다.`,
        `운영 DB 스키마를 모른 채 새 마이그레이션 체인을 만든다. 베이스라인이 실제 스키마와 다르면 첫 배포에서 이미 존재하는 객체와 충돌한다.`,
        `개선 효과를 체감으로 보고한다. 수치 없이 "빨라졌다"고 하면 인수 기준 다툼이 생기고 재작업 요구를 막을 근거가 없다.`
      ]
    }
  ],
  labs: [
    {
      title: `재현 가능한 템플릿 저장소와 이벤트 루프 블로킹 실측`,
      scenario: `외주로 FastAPI 서비스를 맡게 되었고 첫 납품물은 "다른 PC에서도 5분 안에 똑같이 도는 저장소"입니다. 동시에 클라이언트 개발자가 "async def 안에 time.sleep을 넣었더니 서버 전체가 멈춘다"는 현상을 재현해 설명해 달라고 요청했습니다. uv·ruff·pytest·mypy와 CI(GitHub Actions 또는 로컬 스크립트)로 템플릿을 만들고, 세 가지 엔드포인트의 동시 요청 시간을 측정해 한 페이지 보고서에 표로 남기세요.`,
      steps: [
        `프로젝트 폴더에서 uv init으로 booking-api를 만들고, requires-python을 설치되어 있는 3.12 이상 버전으로 정한 뒤, 운영 의존성(fastapi, uvicorn)과 개발 의존성(pytest, httpx, ruff, mypy)을 uv add 명령으로 각각 추가합니다.`,
        `pyproject에 ruff(select에 ASYNC·S·B 포함, target-version 명시), pytest, mypy strict 설정을 넣고 uv run ruff check, ruff format --check, mypy, pytest가 모두 통과하도록 최소 테스트 하나를 작성합니다.`,
        `app/main.py에 상태 확인용 /health와, 레슨 4 코드의 /bad·/ok-sync·/ok-async·/limit 엔드포인트를 만듭니다(/offload는 선택). /bad는 async def 안에서 time.sleep(1)을 부르고, /ok-sync는 일반 def에서 같은 호출을 하며, /ok-async는 async def에서 await asyncio.sleep(1)을 쓰고, /limit은 스레드풀 한도를 돌려줍니다.`,
        `scripts/load.py에 httpx.AsyncClient로 같은 엔드포인트를 동시에 10건 호출하는 코드를 작성합니다. 총 소요 시간과, 호출 도중 /health 응답 시간을 각 엔드포인트마다 3회 측정해 평균을 냅니다.`,
        `ruff가 /bad의 블로킹 호출을 ASYNC 계열 규칙으로 지적하는지 확인하고, noqa 없이 코드를 고쳐 지적이 0건이 되게 합니다. 고친 방식(def 전환, await 가능한 호출, to_thread)을 비교해 적습니다.`,
        `/limit으로 스레드풀 한도를 출력하고, /ok-sync를 동시 50건으로 올려 소요 시간이 계단식으로 늘어나는지 확인합니다. 한도 값과 측정치가 맞는지 보고서에 해석을 적습니다.`,
        `임시 디렉터리에 저장소를 새로 clone해 uv sync --locked로 환경을 재현하고, uv sync --locked --no-dev를 쓰는 Dockerfile로 이미지를 빌드해 컨테이너에서 /health를 호출합니다.`,
        `Python 3.13과 3.14(가능하면 3.15)로 같은 테스트를 돌리는 CI 매트릭스(또는 로컬 스크립트)를 만들고, 결과와 사용한 도구 버전을 보고서에 표로 정리합니다.`
      ],
      accept: [
        `새로 clone한 디렉터리에서 uv sync --locked, ruff check, ruff format --check, mypy, pytest가 모두 종료 코드 0으로 끝난다.`,
        `측정표에서 /bad 동시 10건의 총 소요 시간이 9초 이상, /ok-sync와 /ok-async는 2초 이하이며(환경 편차는 허용하되 기준 수치를 적는다), /bad 진행 중 /health 응답이 1초 이상 지연된 증거가 있다.`,
        `ruff가 /bad의 블로킹 호출을 ASYNC 계열 규칙으로 보고한 로그가 보고서에 있고, 수정 후에는 보고가 0건이다.`,
        `스레드풀 한도 출력값과 동시 50건 /ok-sync의 실측 소요 시간이 한도와 연결된 설명과 함께 기록되어 있다.`
      ],
      stretch: `uv audit 같은 취약점 점검 단계(프리뷰 여부는 문서로 확인)와 ty 비차단 잡을 CI에 추가하고, ty와 mypy가 서로 다르게 지적하는 코드 사례를 세 개 찾아 정리하세요.`
    },
    {
      title: `SQLAlchemy·Alembic: N+1 제거와 무중단 컬럼 rename 시뮬레이션`,
      scenario: `예약 SaaS의 tenant·room·booking 세 테이블이 있고 booking은 20만 행입니다. 고객은 booking.guest 컬럼을 guest_name으로 바꾸고 싶고, 배포하는 동안에도 조회 API가 끊기면 안 됩니다. 별개로 /rooms 목록이 방 수에 비례해 느려진다는 불만도 있습니다. Docker로 PostgreSQL을 띄우고 쿼리 수와 락 영향을 직접 측정해 보고서로 만드세요.`,
      steps: [
        `공식 postgres 이미지를 5433 포트로 띄우고 SQLAlchemy 2.x 모델(Mapped, naming_convention)을 작성한 뒤 alembic init -t async로 환경을 만들고 env.py의 target_metadata를 연결합니다. 초기 리비전은 autogenerate 후 직접 검토합니다.`,
        `tenant 5개, room 200개, booking 20만 행을 시드 스크립트(배치 insert 또는 COPY)로 채웁니다.`,
        `/rooms를 일부러 지연 로딩 방식으로 구현해 레슨 10의 count_queries로 쿼리 수를 측정하고, selectinload로 고친 뒤 다시 측정합니다. 관계에 lazy="raise"를 걸어 지연 로딩이 즉시 실패하는지도 확인합니다.`,
        `별도 프로세스에서 20ms 간격으로 booking 조회 쿼리를 반복하며 지연을 기록하는 부하 스크립트를 만들어 최대 지연과 오류 수를 남깁니다.`,
        `나쁜 방식: 모델 속성 이름만 바꾸고 autogenerate를 실행해 drop+add가 만들어지는 것을 확인하고, 복제본 DB에서 적용해 guest 데이터가 사라지는 것을 SELECT로 증명한 뒤 되돌립니다.`,
        `좋은 방식: expand 마이그레이션(lock_timeout, nullable 컬럼 추가, 배치당 커밋하는 백필, CONCURRENTLY 인덱스)을 부하 스크립트가 도는 동안 적용합니다. 앱 쪽 이중 쓰기 코드도 작성합니다.`,
        `contract 단계: CHECK (guest_name IS NOT NULL) NOT VALID 추가, VALIDATE CONSTRAINT, SET NOT NULL, 옛 컬럼 제거 순서로 적용하며 각 단계의 최대 지연과 pg_stat_activity·pg_locks로 본 락 대기를 기록합니다.`,
        `alembic upgrade head, downgrade -1, upgrade head 왕복을 실행하고 alembic check로 모델과 스키마가 일치하는지 확인합니다. 결과를 단계별 표로 정리합니다.`
      ],
      accept: [
        `N+1 버전은 방 200개 목록에서 쿼리 201개 이상, 수정 버전은 3개 이하이며, 후자가 쿼리 수 테스트로 저장소에 고정되어 있다.`,
        `나쁜 방식 적용 후 guest 값이 사라진 것을 보여 주는 SELECT 결과가 보고서에 있다.`,
        `좋은 방식의 expand·contract 전 과정 동안 부하 스크립트의 오류가 0건이고 최대 지연이 500ms 미만이다(환경 편차가 크면 기준 수치와 근거를 보고서에 명시).`,
        `백필이 배치마다 커밋되었다는 증거(배치 수와 트랜잭션 수 또는 로그)가 있고, alembic check가 변경 없음을 보고하며 upgrade·downgrade 왕복이 성공한다.`
      ],
      stretch: `행 수를 2천만으로 늘린 테이블에서 SET NOT NULL을 직접 실행했을 때와 3단계 방식의 락 보유 시간을 비교하고, Testcontainers로 같은 시나리오를 pytest에서 자동 재현하세요. 겹침 예약을 막는 PostgreSQL 배제 제약도 구현해 보세요.`
    },
    {
      title: `납품 미니 프로젝트: 멀티테넌트 예약 API와 인수인계 패키지`,
      scenario: `한 스타트업이 "여러 매장이 각자의 객실을 예약받는" API 백엔드를 FastAPI로 2주 안에 만들어 달라고 요청했습니다. 요구는 JWT 인증, 매장(tenant) 간 데이터 격리, 겹치는 예약 거부(409), RFC 9457 오류 형식, 예약 요약의 SSE 스트리밍(LLM은 가짜 생성기로 대체), 컨테이너 배포, 그리고 개발자가 바뀌어도 이어받을 수 있는 인수인계 문서입니다. 이 요구를 납품물 패키지로 만들고 깨끗한 환경에서 인수 리허설까지 통과시키세요.`,
      steps: [
        `요구 정리 1페이지를 씁니다. 범위, 가정, 제외 항목, 수치가 있는 인수 기준(예: 예약 1만 건 데이터에서 목록 API p95 200ms 이하, 로컬 측정 기준)을 포함합니다.`,
        `레슨 2의 pyproject·CI·Dockerfile을 바탕으로 저장소 뼈대를 만들고 app/ 아래를 main·deps·models·schemas·services·api로 나눕니다.`,
        `tenant·user·room·booking 모델과 Alembic 베이스라인을 만듭니다. naming_convention, tenant_id 복합 인덱스, 겹침 방지 제약(유니크 또는 배제 제약)을 포함하고 IntegrityError를 409로 매핑합니다.`,
        `JWT 인증 의존성을 구현합니다. 허용 알고리즘 고정, iss·aud·exp 검증, tenant 클레임 추출을 포함하고 비밀번호 해시는 argon2나 bcrypt 라이브러리를 씁니다(사용자는 시드로 생성).`,
        `bookings의 생성·조회·패치·삭제 엔드포인트와 키셋 페이지네이션을 구현하고, 401·404·409·422·500 모두 application/problem+json으로 응답하게 RequestValidationError와 예외 핸들러를 만듭니다.`,
        `/v1/summary/stream SSE 엔드포인트를 가짜 토큰 생성기로 구현하고 클라이언트 끊김 시 정리되는지, DB 세션을 오래 점유하지 않는지 확인합니다.`,
        `테스트를 작성합니다. 실제 PostgreSQL, 롤백 격리, 오류 형식 계약, 테넌트 격리(A 토큰으로 B 예약 조회 시 404), 쿼리 수, 두 연결이 동시에 같은 슬롯을 예약할 때 하나만 성공하는 실커밋 동시성 테스트를 포함합니다.`,
        `문서 패키지를 만듭니다. README(10분 기동), openapi.json 스냅샷과 CI diff 검사, 런북(배포·롤백·마이그레이션·장애 대응), 버전과 EOL 표(날짜 표기), ADR 3편을 포함합니다.`,
        `깨끗한 디렉터리에서 git clone, docker compose up, 헬스 확인, 테스트, 부하 스크립트까지 인수 리허설을 하고 소요 시간을 기록합니다.`
      ],
      accept: [
        `문서만 보고 깨끗한 환경에서 10분 안에 기동과 테스트 통과가 재현되며 스톱워치 기록이 있다.`,
        `테넌트 격리·겹침 예약·오류 형식·쿼리 수·동시성 테스트를 포함해 20개 이상 테스트가 통과하고 ruff와 mypy 오류가 0건이다.`,
        `401·404·409·422·500 응답이 모두 application/problem+json이고 500 본문에 스택 트레이스나 내부 메시지가 없다.`,
        `이미지가 uv sync --locked로 빌드되고 비루트 사용자로 실행되며 /health와 /ready가 응답하고, openapi.json 스냅샷 diff 검사가 CI에 포함되어 있다.`,
        `요구 정리 문서의 인수 기준 수치 각각에 대해 측정 결과와 통과 여부가 표로 제시되어 있다.`
      ],
      stretch: `POST /bookings에 Idempotency-Key 헤더를 지원해 같은 키의 재시도가 같은 응답을 돌려주게 하거나, outbox 테이블과 별도 워커 프로세스로 예약 확정 이메일(가짜 발송)을 처리해 재시작 중에도 유실되지 않음을 시연하세요.`
    }
  ],
  quiz: [
    {
      q: `고객사 FastAPI 서비스(uvicorn 프로세스 1개)에서 PDF 변환 API를 호출할 때마다 /health까지 1~2초 멈춘다는 제보가 왔습니다. 코드는 아래와 같습니다.

@app.post("/convert")
async def convert(file: UploadFile):
    data = await file.read()
    resp = requests.post(CONVERTER_URL, data=data, timeout=30)   # 평균 1.5초
    return {"size": len(resp.content)}

가장 적절한 1차 조치는 무엇입니까?`,
      choices: [
        `requests 호출이 이벤트 루프를 막고 있으므로 이 함수를 def로 바꾸거나 httpx.AsyncClient로 await 호출하도록 바꾼다`,
        `uvicorn --workers를 4로 늘려 프로세스 수로 해결한다`,
        `timeout=30을 5로 줄여 블로킹 시간의 상한을 낮춘다`,
        `모든 엔드포인트를 def로 일괄 변환하고 async def는 금지한다`
      ],
      answer: 0,
      why: `async def 안의 동기 호출은 이벤트 루프 스레드를 점유해 같은 프로세스의 모든 요청이 멈춥니다. def로 바꾸면 스레드풀에서 돌고, httpx.AsyncClient를 쓰면 await에서 양보합니다. 워커 증설은 증상을 4배로 가릴 뿐 동시 4건이면 다시 전부 정지하고 메모리와 DB 연결만 늘립니다. 타임아웃을 줄이면 오류만 늘고 일괄 def 변환은 await 가능한 라이브러리의 이점을 버립니다.`
    },
    {
      q: `PATCH /bookings/7 의 본문이 {"memo": null} 입니다. 모델과 코드가 아래와 같을 때 두 print의 출력은 무엇입니까?

class Patch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    guest: str | None = None
    memo: str | None = None

p = Patch.model_validate_json('{"memo": null}')
print(p.model_dump(exclude_unset=True))
print(p.model_dump())`,
      choices: [
        `{} 와 {'guest': None, 'memo': None}`,
        `{'memo': None} 와 {'guest': None, 'memo': None}`,
        `{'memo': None} 와 {'memo': None}`,
        `ValidationError: memo는 None일 수 없다`
      ],
      answer: 1,
      why: `exclude_unset은 입력에 실제로 등장한 필드만 남기므로 명시적 null도 "설정된 값"으로 포함되어 {'memo': None}이 됩니다. model_dump()는 기본값 필드까지 모두 내보냅니다. 첫 번째 보기({}로 시작)가 솔깃한 이유는 null을 "없음"으로 오해하기 때문인데, 명시된 null은 set으로 취급되어 메모를 지우라는 뜻이 됩니다. memo의 타입이 str | None이므로 검증 오류도 나지 않습니다.`
    },
    {
      q: `비동기 엔드포인트가 항상 아래 오류로 500을 냅니다 (SQLAlchemy 2.x, AsyncSession).

sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called; can't call await_only() here. Was IO attempted in an unexpected place?
  File "app/api.py", line 31, in get_room
    return {"bookings": [b.guest for b in room.bookings]}

room은 바로 위에서 await session.get(Room, room_id)로 가져왔고 Room.bookings는 기본 지연 로딩입니다. 올바른 수정은 무엇입니까?`,
      choices: [
        `엔진의 pool_size를 늘린다`,
        `async def를 def로 바꾸고 AsyncSession은 그대로 쓴다`,
        `조회할 때 selectinload(Room.bookings) 옵션을 걸어 await 안에서 미리 로드하고, 필요하면 relationship에 lazy="raise"를 걸어 같은 실수를 일찍 드러낸다`,
        `greenlet 패키지를 재설치한다`
      ],
      answer: 2,
      why: `관계 속성 접근이 지연 로딩 SQL을 암묵적으로 실행하려 해서 비동기 컨텍스트에서 실패한 것입니다. 쿼리에서 selectinload로 미리 가져오면 await 안에서 끝납니다. def로 바꿔도 AsyncSession은 await 없이 쓸 수 없어 해결되지 않고, 풀 크기나 패키지 재설치는 원인과 무관합니다.`
    },
    {
      q: `Booking.guest 속성의 이름을 guest_name으로 바꾼 뒤 alembic revision --autogenerate를 실행했더니 아래 마이그레이션이 만들어졌습니다. 이 스크립트를 검토 없이 운영에 적용하면 무엇이 문제입니까?

def upgrade():
    op.add_column('booking', sa.Column('guest_name', sa.String(length=80), nullable=True))
    op.drop_column('booking', 'guest')`,
      choices: [
        `nullable=True 때문에 NOT NULL 제약이 사라져 데이터 품질이 떨어진다`,
        `add_column이 테이블 전체를 재작성해 수 분간 락이 걸린다`,
        `autogenerate가 만든 코드에는 항상 문법 오류가 있어 실행 자체가 되지 않는다`,
        `이름 변경을 감지하지 못해 drop과 add로 만들어졌으므로 기존 guest 데이터가 사라지고, 배포 중인 구버전 코드는 guest 컬럼이 없어 오류를 낸다`
      ],
      answer: 3,
      why: `autogenerate는 컬럼·테이블 이름 변경을 감지하지 못하고 drop과 add 쌍으로 만듭니다. 그대로 실행하면 데이터가 소실되고 롤링 배포 중인 구버전은 즉시 깨집니다. 해법은 expand/contract입니다. "테이블을 재작성해 락이 걸린다"는 보기가 그럴듯하지만, 기본값 없이 nullable 컬럼을 추가하는 것은 테이블 재작성이 필요 없는 변경이라 이 스크립트의 진짜 위험은 락이 아니라 데이터 손실입니다.`
    },
    {
      q: `PostgreSQL 운영 DB의 4천만 행 booking 테이블에 NOT NULL을 걸기 위해 평일 낮에 op.alter_column("booking", "guest_name", nullable=False)를 배포했더니 몇 분간 API가 전부 타임아웃 났습니다. 다음 배포에서 가장 안전한 접근은 무엇입니까?`,
      choices: [
        `새벽에 같은 마이그레이션을 다시 실행한다. 사용자가 적으니 안전하다`,
        `SET LOCAL lock_timeout으로 대기 시간을 제한하고, CHECK (guest_name IS NOT NULL)을 NOT VALID로 추가한 뒤 VALIDATE CONSTRAINT를 하고 SET NOT NULL을 실행하는 순서로 나눈다`,
        `컬럼을 drop하고 NOT NULL 컬럼으로 다시 만든다`,
        `statement_timeout을 0으로 풀어 마이그레이션이 끝까지 돌게 한다`
      ],
      answer: 1,
      why: `SET NOT NULL은 전체 스캔 동안 강한 락을 잡아 뒤에 줄 선 모든 쿼리를 막습니다. NOT VALID CHECK 추가는 빠르고, VALIDATE는 읽기·쓰기를 허용하는 약한 락으로 스캔하며, PostgreSQL 12 이상에서는 검증된 CHECK가 있으면 SET NOT NULL이 스캔을 건너뜁니다. lock_timeout은 락 대기열 장애를 막습니다. 새벽 실행은 요청이 적을 뿐 락 시간은 그대로이고 새벽 작업이 실패하면 같은 사고가 납니다.`
    },
    {
      q: `고객 프로젝트의 CI는 속도를 이유로 SQLite 인메모리 DB를 씁니다. 운영은 PostgreSQL이고 겹치는 예약 방지에 부분 유니크 인덱스, SELECT ... FOR UPDATE, JSONB 컬럼을 사용합니다. 최근 테스트는 모두 통과했는데 운영에서 이중 예약이 발생했습니다. 가장 적절한 개선은 무엇입니까?`,
      choices: [
        `CI에서도 실제 PostgreSQL(서비스 컨테이너나 Testcontainers)을 쓰고, 스키마는 alembic upgrade head로 만들고, 테스트 격리는 트랜잭션 롤백으로 하며, 동시성은 실커밋 테스트로 따로 검증한다`,
        `SQLite 테스트 수를 늘리고 mock을 더 촘촘히 만든다`,
        `운영 DB를 SQLite로 바꿔 개발과 운영을 일치시킨다`,
        `동시성 문제이므로 코드 리뷰만 강화하고 테스트는 그대로 둔다`
      ],
      answer: 0,
      why: `부분 유니크 인덱스, 행 잠금, JSONB는 SQLite와 동작이 달라 SQLite 테스트는 이 계약을 검증하지 못합니다. 실제 PostgreSQL과 마이그레이션 기반 스키마로 바꾸면 환경 차이가 사라지고, 롤백 격리로 속도도 확보됩니다. mock을 늘리면 오히려 가짜 안심이 커지고, 운영 DB 교체는 요구사항과 맞지 않습니다.`
    },
    {
      q: `FastAPI 컨테이너를 쿠버네티스에 배포합니다. 파드 CPU limit은 1코어, replicas는 3이고 HPA를 씁니다. Dockerfile의 CMD가 uvicorn app.main:app --workers 4 입니다. 인수 검토 의견으로 가장 적절한 것은 무엇입니까?`,
      choices: [
        `워커가 많을수록 처리량이 선형으로 늘어나므로 8로 올린다`,
        `--workers를 지정하면 uvicorn이 알아서 CPU limit에 맞춰 조절하므로 그대로 둔다`,
        `컨테이너당 프로세스를 1개로 두고 확장은 replicas와 HPA에 맡기며, 파드 수 × 워커 수 × 풀 크기가 DB의 max_connections를 넘지 않는지도 계산한다`,
        `workers 4를 유지하고 대신 replicas를 1로 줄여 비용을 아낀다`
      ],
      answer: 2,
      why: `FastAPI 문서는 --workers를 복제와 약간의 재시작 대응을 위한 옵션으로 설명하고, 쿠버네티스에서는 워커 대신 컨테이너당 Uvicorn 프로세스 하나를 두는 편을 권합니다(복제는 replicas와 HPA의 몫). 1코어 제한에 프로세스 4개는 스로틀링과 메모리 4배만 만들고 연결 수도 곱으로 늘립니다. 워커를 8로 올리는 보기는 선형 증가라는 가정이 틀렸고, replicas를 1로 줄이는 보기는 가용성과 롤링 배포의 여유를 없앱니다.`
    },
    {
      q: `LLM 요약을 SSE로 최대 60초 동안 스트리밍하는 엔드포인트를 추가한 뒤, 동시 사용자 30명에서 다른 API까지 "QueuePool limit of size 5 overflow 5 reached" 오류로 실패합니다. 이 엔드포인트는 시작할 때 DB에서 예약 한 건만 읽고 이후에는 LLM 스트림만 중계합니다. 세션 의존성은 async with sessionmaker() as s: yield s 형태입니다. 원인과 해결은 무엇입니까?`,
      choices: [
        `pool_size가 작은 것이 원인이므로 pool_size를 100으로 올린다`,
        `SSE가 워커 스레드를 점유하므로 스레드풀 크기를 늘린다`,
        `LLM 응답이 느린 것이 원인이므로 LLM 타임아웃만 줄인다`,
        `yield 의존성의 정리 코드는 기본적으로 응답이 끝난 뒤 실행되어 스트림이 끝날 때까지 세션과 연결을 붙잡고 있다. 세션을 Depends로 받지 않고, 예약 한 건을 읽는 구간에서만 async with로 짧게 열고 닫은 뒤 스트리밍을 시작한다`
      ],
      answer: 3,
      why: `기본 동작에서는 yield 의존성의 정리 코드가 응답 전송 뒤에 실행되므로, 읽기만 하고 닫지 않은 세션이 연결을 스트림 길이(최대 60초)만큼 쥡니다. 동시 30명의 연결 요구가 풀 최대치 10개(5+5)를 고갈시킨 것입니다. pool_size를 100으로 올리면 프로세스·파드 수를 곱해 DB의 max_connections를 넘길 위험만 키우고 원인은 남습니다. SSE 비동기 핸들러는 워커 스레드를 점유하지 않으므로 스레드풀을 늘려도 소용없고, LLM 타임아웃만 줄이면 응답이 끊길 뿐 연결 점유 구조는 그대로입니다.`
    },
    {
      q: `고객 API는 camelCase 별칭을 쓰는 Pydantic 모델에 extra="forbid"를 설정해 두었습니다. 락 파일을 Pydantic 2.14.1에서 2.14.2로 올린 뒤, 일부 모바일 클라이언트가 snake_case 필드명으로 보낸 JSON에서 422 extra_forbidden을 받기 시작했습니다. 가장 적절한 대응은 무엇입니까?`,
      choices: [
        `changelog의 2.14.2 JSON 검증 일관화 항목으로 원인을 특정하고, 별칭과 필드명의 허용 정책을 계약으로 명시한 뒤 클라이언트를 고치거나 의도적으로 허용하고, 해당 케이스를 계약 테스트로 고정한다`,
        `extra를 ignore로 되돌려 422를 없앤다`,
        `Pydantic을 2.14.1로 영구 고정하고 이후 업그레이드를 중단한다`,
        `FastAPI의 버그로 보고 FastAPI를 이전 버전으로 내린다`
      ],
      answer: 0,
      why: `2.14.2에서 JSON 검증이 Python 검증과 같은 방식으로 필드 조회·추가 데이터를 처리하게 바뀌어, 사용되지 않은 별칭이나 필드명에만 일치하는 키가 extra가 되어 forbid에서 오류가 납니다. 그동안 조용히 버려지던 필드가 드러난 것이므로 계약을 명시하고 테스트로 고정하는 것이 정석입니다. ignore로 되돌리면 같은 데이터 유실 버그를 다시 숨기고, 영구 고정은 보안·호환 업데이트를 막습니다.`
    },
    {
      q: `Dockerfile 일부입니다.

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY src ./src

동료가 pyproject.toml에 httpx를 추가했지만 uv.lock은 갱신하지 않은 채 푸시했습니다. CI와 이미지 빌드는 모두 통과했는데 운영에서 ImportError가 났습니다. 무엇이 문제이고 어떻게 고칩니까?`,
      choices: [
        `--no-dev 때문에 httpx가 빠졌으므로 --no-dev를 제거한다`,
        `--frozen은 락 파일이 pyproject와 맞는지 검사하지 않고 그대로 설치한다. --locked로 바꿔 락이 낡았으면 빌드가 실패하게 하고, CI에서 uv lock --check로도 확인한다`,
        `uv 대신 pip install -r requirements.txt를 사용한다`,
        `COPY 순서가 잘못되어 src를 먼저 복사해야 한다`
      ],
      answer: 1,
      why: `--frozen은 락 파일을 갱신·검증하지 않고 있는 그대로 설치하므로, 락에 없는 httpx는 이미지에 들어가지 않아 운영에서 ImportError가 납니다. --locked는 락이 pyproject와 어긋나면 실패하므로 같은 실수를 빌드 단계에서 잡습니다. --no-dev는 개발 그룹만 제외하는 옵션이고 COPY 순서는 캐시 효율의 문제일 뿐입니다.`
    },
    {
      q: `예약 확정 시 PDF 영수증 생성(약 6초)과 이메일 발송을 요청 안에서 처리해 응답이 느립니다. 고객 요구는 "배포나 재시작 중에도 작업이 유실되면 안 되고, 실패하면 3회 재시도하며, 처리 현황을 조회할 수 있어야 한다"입니다. 가장 적절한 설계는 무엇입니까?`,
      choices: [
        `BackgroundTasks.add_task로 옮긴다. 응답이 즉시 반환되므로 요구를 충족한다`,
        `asyncio.create_task로 띄우고 참조를 변수에 보관한다`,
        `같은 트랜잭션에서 작업 레코드(outbox)를 DB에 기록하고 응답은 즉시 돌려주며, 별도 워커 프로세스가 레코드를 읽어 재시도와 상태 갱신을 수행한다`,
        `uvicorn --workers를 늘려 PDF 생성을 병렬화한다`
      ],
      answer: 2,
      why: `BackgroundTasks는 같은 프로세스에서 응답 뒤에 실행되므로 프로세스가 죽으면 작업이 사라지고 재시도나 상태 조회가 없습니다. 문서도 무겁고 프로세스를 넘나드는 작업에는 별도 도구를 권합니다. 작업 기록을 비즈니스 데이터와 같은 트랜잭션으로 남기는 outbox와 별도 워커가 유실 방지·재시도·조회 요구를 모두 충족합니다. create_task도 같은 프로세스 안이라 재시작에 약합니다.`
    },
    {
      q: `테스트가 아래 오류로 실패합니다. 앱은 lifespan에서 app.state.sessionmaker를 만들고, 테스트는 httpx AsyncClient(transport=ASGITransport(app=app))로 호출합니다.

AttributeError: 'State' object has no attribute 'sessionmaker'
  File "app/deps.py", line 9, in get_session
    async with request.app.state.sessionmaker() as session:

무엇이 원인이고 올바른 수정은 무엇입니까?`,
      choices: [
        `pytest가 fixture를 잘못 로드하고 있으므로 conftest.py를 프로젝트 루트로 옮긴다`,
        `app.state는 요청마다 새로 만들어지므로 모듈 전역 변수로 바꾼다`,
        `ASGITransport가 경로 매칭에 실패해 404 대신 AttributeError를 낸다`,
        `ASGITransport는 lifespan 이벤트를 실행하지 않아 startup 코드가 돌지 않았다. LifespanManager로 앱을 감싸 lifespan을 실행하거나, get_session을 dependency_overrides로 대체한다`
      ],
      answer: 3,
      why: `FastAPI 문서가 명시하듯 AsyncClient와 ASGITransport 조합은 lifespan을 실행하지 않으므로 lifespan에서 만든 app.state 자원이 존재하지 않습니다. asgi-lifespan의 LifespanManager로 감싸거나 세션 의존성을 오버라이드해 우회하면 해결됩니다. app.state는 요청마다 새로 만들어지는 것이 아니라 앱 수명 동안 유지되므로 "요청마다 새로 만들어진다"는 보기의 전제가 틀렸고, 전역 변수로 바꾸는 것은 테스트 격리를 해칩니다.`
    }
  ],
  refs: [
    {
      title: `FastAPI: Concurrency and async / await`,
      url: `https://fastapi.tiangolo.com/async/`,
      kind: `doc`,
      why: `async def와 def의 선택 규칙, 스레드풀 실행 방식, 확신이 없으면 def라는 기준의 1차 출처. 레슨 4와 랩 1의 근거.`
    },
    {
      title: `FastAPI: Dependencies with yield`,
      url: `https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/`,
      kind: `doc`,
      why: `정리 코드의 실행 시점(기본은 응답 전송 뒤), scope 옵션, 예외 전달과 다시 던지기 규칙. 세션 수명과 스트리밍 설계의 핵심.`
    },
    {
      title: `FastAPI: Server Workers`,
      url: `https://fastapi.tiangolo.com/deployment/server-workers/`,
      kind: `doc`,
      why: `--workers가 복제와 약간의 재시작 대응용이며 쿠버네티스에서는 워커 대신 컨테이너당 단일 프로세스를 권하는 배포 문서. 워커·풀 산수의 출발점.`
    },
    {
      title: `FastAPI: Server-Sent Events`,
      url: `https://fastapi.tiangolo.com/tutorial/server-sent-events/`,
      kind: `doc`,
      why: `EventSourceResponse 기반 SSE 지원(0.135.0 추가), keep-alive와 버퍼링 방지 헤더 동작. LLM 토큰 스트리밍 구현 근거.`
    },
    {
      title: `FastAPI Release Notes`,
      url: `https://fastapi.tiangolo.com/release-notes/`,
      kind: `doc`,
      why: `0.x 프레임워크의 변경 이력(2026-11-07 기준 0.162.2, 0.157.0이 10-21·0.162.0이 10-23, 0.160.0·0.162.0에 Breaking Changes 절). 업그레이드 PR마다 읽는 문서.`
    },
    {
      title: `Pydantic: Models`,
      url: `https://pydantic.dev/docs/validation/latest/concepts/models/`,
      kind: `doc`,
      why: `extra 정책, from_attributes, model_validate와 model_validate_json의 차이를 다루는 공식 개념 문서.`
    },
    {
      title: `Pydantic Changelog`,
      url: `https://pydantic.dev/docs/validation/latest/get-started/changelog/`,
      kind: `doc`,
      why: `2.14.2의 JSON 키·별칭 처리 변경처럼 forbid 모델에 영향을 주는 마이너 변경을 확인하는 출처(2026-11 기준 2.14.3).`
    },
    {
      title: `SQLAlchemy 2.1: Asynchronous I/O (asyncio)`,
      url: `https://docs.sqlalchemy.org/en/21/orm/extensions/asyncio.html`,
      kind: `doc`,
      why: `async_sessionmaker, expire_on_commit=False, 지연 로딩 문제와 selectinload·lazy="raise"·awaitable_attrs, 세션 공유 금지 경고의 1차 출처.`
    },
    {
      title: `SQLAlchemy 2.1: Session Basics`,
      url: `https://docs.sqlalchemy.org/en/21/orm/session_basics.html`,
      kind: `doc`,
      why: `commit과 flush의 관계, autobegin, 웹 요청 단위의 세션 수명 권고를 정리한 문서. 트랜잭션 경계 설계의 근거.`
    },
    {
      title: `Alembic: Auto Generating Migrations`,
      url: `https://alembic.sqlalchemy.org/en/latest/autogenerate.html`,
      kind: `doc`,
      why: `autogenerate가 감지하는 것과 못 하는 것(이름 변경, 이름 없는 제약, 네이티브 ENUM이 없는 백엔드의 Enum)과 alembic check를 명시한 문서. 마이그레이션 리뷰 체크리스트의 근거.`
    },
    {
      title: `Alembic: The Importance of Naming Constraints`,
      url: `https://alembic.sqlalchemy.org/en/latest/naming.html`,
      kind: `doc`,
      why: `naming_convention 딕셔너리와 이름 없는 제약이 마이그레이션을 어렵게 하는 이유를 설명하는 문서.`
    },
    {
      title: `uv documentation`,
      url: `https://docs.astral.sh/uv/`,
      kind: `tool`,
      why: `프로젝트·락 파일·Python 설치·스크립트·워크스페이스를 포괄하는 uv 공식 문서. 재현 가능한 환경과 CI·Docker 사용법의 출처.`
    },
    {
      title: `RFC 9457: Problem Details for HTTP APIs`,
      url: `https://www.rfc-editor.org/rfc/rfc9457.html`,
      kind: `rfc`,
      why: `application/problem+json의 필드와 확장 규칙(RFC 7807 대체). 오류 계약 표준화의 근거.`
    },
    {
      title: `PostgreSQL: ALTER TABLE`,
      url: `https://www.postgresql.org/docs/current/sql-altertable.html`,
      kind: `doc`,
      why: `ADD COLUMN의 테이블 재작성 조건, SET NOT NULL의 스캔 생략 조건, NOT VALID·VALIDATE CONSTRAINT의 락 수준을 설명하는 1차 출처(문서 18 기준, 2026-11 확인). 레슨 7 락 규칙의 근거.`
    }
  ],
  gigs: [
    `시장 위치(2026-11 기준): 사람인 키워드 검색(2026-11-09)에서 FastAPI 249건은 Spring Boot 569건·Node.js 416건보다 적고 NestJS 96건보다 많으며, Stack Overflow 웹 프레임워크 사용률은 2025년 조사 14.8%, 2026년 조사 18.5%입니다. 위시켓은 Python 의뢰 비중이 늘었지만 경쟁률은 상대적으로 낮다고 보고 있습니다(2025 상반기 데이터). 한국 외주의 주력은 Java/Spring이므로 FastAPI는 AI·데이터 연계 백엔드와 스타트업 MVP에서 강한 보조 스택으로 포지셔닝하는 것이 근거에 맞습니다(판단). FastAPI 프로젝트의 단가에 대한 정량 근거는 이번 조사에서 확인하지 못했으니 견적은 공수 기반으로 합니다.`,
    `견적 전에 확인할 것: Python 버전과 호스팅 방식(컨테이너·VM·서버리스), DB 종류와 소유 여부(기존 스키마, 마이그레이션 도구 유무, 운영 DB 접근 절차), 인증 방식(자체 JWT·외부 IdP·SSO), 동기·비동기 드라이버 선호, 기존 코드 인수인지 신규인지, 예상 트래픽과 목표 p95, 개인정보 포함 여부(개정 개인정보 보호법이 2026-09-11 시행되어 보안 요구가 계약 조항이 되는 추세). 모르는 항목은 가정으로 문서에 적어 견적서에 붙입니다.`,
    `납품물 체크리스트: 락 파일을 포함한 저장소, 10분 기동 README, .env.example(비밀 제외), Dockerfile과 CI, Alembic 마이그레이션과 복구 절차, openapi.json 스냅샷, 테스트 목록(커버리지 숫자보다 계약·테넌트 격리·동시성 테스트 항목), 런북, 버전과 EOL 표(날짜 표기), ADR. 크몽 백엔드 상품도 API 문서(Swagger UI)와 소스·기술 문서 인수인계를 납품물로 두는 것이 일반적이고, 위시켓은 기능별 완료 기준을 계약에 넣으라고 권합니다.`,
    `흔한 함정 1, 기존 코드 인수: Pydantic v1 스타일, SQLAlchemy 1.x 스타일(session.query, declarative_base), 마이그레이션 없이 create_all로 만든 운영 DB가 흔합니다. 업그레이드 범위가 견적을 좌우하므로 코드 감사를 별도 유료 선행 작업(1~3일 규모의 시간 상한 계약)으로 분리하세요.`,
    `흔한 함정 2, 성능과 AI 기능: "FastAPI라서 빠르다"를 SLA로 약속하지 말고 측정 가능한 목표를 합의합니다. LLM 스트리밍은 프록시 버퍼링·유휴 타임아웃·비용 폭주(클라이언트 끊김 시 상류 호출 취소, 사용자별 한도)를 요구사항에 넣어야 하고, 외부 LLM API 장애 시의 대체 동작도 계약에 적습니다.`,
    `흔한 함정 3, 버전 드리프트: FastAPI가 0.x이고 2026-10-21부터 10-23까지 사흘 사이에 0.157.0에서 0.162.0까지 올라갔습니다(릴리스 노트 날짜 기준, 2026-11-07 현재 0.162.2). 유지보수 계약에 의존성 업그레이드 주기(월 1회 PR 등), 보안 패치 대응 시간, Python EOL 대응(3.10은 2026-10-01 EOL)을 포함하고, 이를 빼면 6개월 뒤 아무도 못 올리는 서비스가 됩니다.`,
    `견적 힌트: 엔드포인트 개수만으로 곱하지 말고 인증·테넌트 격리·마이그레이션 체계·CI·컨테이너·문서 같은 고정비 항목을 따로 적고, 엔드포인트는 복잡도 등급(단순 CRUD, 검증·동시성 있음, 외부 연동)으로 나눠 추정합니다. 운영 DB에 접근하는 마이그레이션은 고객의 백업 확인과 점검 시간 합의를 선행 조건으로 적고, 범위 밖 요청의 기준은 위시켓 법무팀장 글의 권고처럼 완료 기준과 변경 관리로 문서화합니다.`
  ]
};
