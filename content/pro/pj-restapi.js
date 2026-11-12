(window.PRO_MODULES = window.PRO_MODULES || {})["pj-restapi"] = {
  id: "pj-restapi",
  summary: `FastAPI와 SQLite로 메모 REST API를 처음부터 끝까지 만들어 입력 검증·CRUD·오류 응답·페이지네이션·pytest 테스트·API 키 인증·Docker 실행·OpenAPI 문서 확인까지 혼자 구현하고 납품 형태로 정리할 수 있다.`,
  hours: 28,
  goals: [
    `가상환경에서 FastAPI 서버를 띄우고, HTTP 요청이 경로·메서드 매칭을 거쳐 내 함수까지 가고 JSON 응답으로 돌아오는 과정을 설명하며 /docs로 엔드포인트를 호출해 확인할 수 있다`,
    `Pydantic 모델로 입력(MemoCreate)과 출력(MemoOut)을 분리하고 길이·공백·여분 필드 규칙을 정한 뒤, 422 응답의 loc·type·msg를 읽어 원인을 찾을 수 있다`,
    `표준 라이브러리 sqlite3로 요청 단위 연결·? 바인딩·with conn 트랜잭션·rowcount를 사용해 CRUD를 구현하고 SQL 인젝션과 스레드 오류를 피할 수 있다`,
    `상태 코드(200·201·204·401·404·409·422·500)를 상황에 맞게 고르고 예외 핸들러로 모든 오류를 하나의 JSON 모양으로 통일하며 500에서 내부 정보를 숨길 수 있다`,
    `limit·offset 페이지네이션과 LIKE 검색을 상한·정렬·와일드카드 이스케이프까지 갖춰 구현하고, offset 방식의 한계(밀림·깊은 페이지)를 재현해 키셋 방식과 비교할 수 있다`,
    `pytest와 TestClient로 테스트마다 새 DB를 쓰는 fixture를 만들고 dependency_overrides와 raise_server_exceptions를 활용해 정상·오류 경로를 자동으로 검증할 수 있다`,
    `API 키 헤더 인증(상수 시간 비교)과 pydantic-settings 설정 분리(환경 변수·.env·시작 시 검증)를 구현하고 비밀 값이 코드·저장소·이미지에 들어가지 않게 관리할 수 있다`,
    `Dockerfile·.dockerignore·볼륨으로 서비스를 컨테이너에서 실행하고 /docs·openapi.json으로 계약을 확인해, 고객에게 인수인계 가능한 형태로 납품하고 견적에 반영할 수 있다`
  ],
  lessons: [
    {
      title: `환경 준비와 첫 엔드포인트: 요청이 함수까지 가는 길`,
      body: `이 모듈에서는 **메모 REST API 서버**를 한 단계씩 쌓아 올립니다. 8단계가 끝나면 메모를 만들고(POST) 읽고(GET) 고치고(PUT) 지우는(DELETE) 서비스가 남고, 여기에 검색과 페이지 나누기, API 키 보호, 자동 테스트, Docker 실행이 붙습니다. 모든 단계는 "실행했을 때 이 화면이 보이면 통과"라는 확인으로 끝납니다. 코드는 눈으로 읽지 말고 직접 타이핑하세요. 오타를 고치며 오류 메시지를 읽는 연습이 혼자 만들 수 있게 되는 가장 빠른 길입니다.

### 서버는 무엇인가: 요청과 응답
HTTP는 단순한 약속입니다. 클라이언트가 **요청**(메서드, 경로, 헤더, 본문)을 보내면 서버가 **응답**(상태 코드, 헤더, 본문)을 돌려줍니다. 서버라는 말은 특별한 기계가 아니라 포트를 열어 놓고 요청을 기다리는 프로그램 하나를 뜻합니다. 이 프로젝트에서는 세 층이 일을 나눕니다.
- uvicorn: 소켓에서 바이트를 읽어 HTTP를 해석하는 서버 프로그램입니다.
- FastAPI: 메서드와 경로를 보고 어느 함수를 부를지 정하고, 값을 검증하고, 반환값을 JSON으로 바꾸고, 문서를 만듭니다.
- 내 함수: 할 일만 합니다. dict나 list를 반환하면 JSON이 됩니다.

### 데코레이터와 타입 힌트가 일의 대부분을 한다
‹@app.get("/memos/{memo_id}")›는 "GET 메서드로 이 경로 모양의 요청이 오면 아래 함수가 처리한다"는 등록입니다. 경로의 ‹{memo_id}›와 함수 인자 이름이 같으면 FastAPI가 값을 꺼내 ‹int›로 바꿔 줍니다. ‹/memos/abc›처럼 정수가 아니면 함수를 부르지 않고 422로 거절합니다. 검증 코드를 직접 쓰지 않아도 되고, 같은 정보로 문서(/docs)가 자동으로 만들어지는 것이 FastAPI를 쓰는 가장 큰 이유입니다.

### 환경 준비 (Windows PowerShell 기준)
Python은 3.12 이상을 권합니다(2026-11 기준). FastAPI 자체는 3.10 이상이지만 3.10은 2026-10-01에 지원이 끝났고, 최신 Starlette 1.10과 pydantic-settings 2.16은 3.11 이상을 요구합니다.
1. 폴더 ‹memo-api›를 만들고 그 안으로 이동합니다.
2. ‹py -m venv .venv›로 가상환경을 만들고 ‹.venv\\Scripts\\Activate.ps1›로 켭니다. 프롬프트 앞에 ‹(.venv)›가 보여야 합니다. 스크립트 실행이 막히면 ‹.venv\\Scripts\\python.exe -m pip ...›처럼 가상환경의 파이썬을 직접 부르면 됩니다.
3. ‹python -m pip install "fastapi[standard]"›로 설치합니다. ‹[standard]›에는 서버(uvicorn), 개발용 명령(‹fastapi dev›), 이후 레슨에서 쓸 httpx2·pydantic-settings가 들어 있습니다(PyPI 메타데이터 기준).
4. 아래 ‹main.py›를 저장하고 ‹fastapi dev main.py›를 실행합니다.

‹fastapi dev›는 개발 모드입니다. 파일을 저장하면 서버가 자동으로 다시 시작되고(reload) 내 컴퓨터(127.0.0.1)에서만 접속됩니다. 운영용 ‹fastapi run›은 reload가 꺼지고 0.0.0.0에서 받습니다(FastAPI 문서 기준).

### 설계 결정과 한계
- 없는 메모는 200에 null이나 에러 문구가 아니라 **404**로 답합니다. 클라이언트는 상태 코드를 보고 분기합니다(레슨 4에서 깊이 다룹니다).
- 데이터가 파이썬 리스트라 서버를 껐다 켜면 처음 상태로 돌아가고, 서버 프로세스를 둘 띄우면 프로세스마다 다른 리스트를 가집니다. 레슨 3에서 DB로 옮기는 이유입니다.
- ‹.gitignore›에 ‹.venv/›, ‹__pycache__/›, ‹*.db›, ‹.env›를 미리 적어 둡니다. 가상환경과 데이터 파일이 저장소에 들어가는 사고를 막습니다.
- 파일 이름을 ‹fastapi.py›처럼 라이브러리와 같게 짓지 마세요. 자기 자신을 import합니다.

### 확인
서버를 켜고 브라우저로 확인합니다. 터미널에 ‹http://127.0.0.1:8000›이 표시되고(공식 문서 예시 출력 기준), ‹/health›는 ‹{"status":"ok"}›, ‹/memos›는 메모 2건의 배열, ‹/memos/1›은 한 건, ‹/memos/99›는 404와 ‹{"detail":"memo not found"}›, ‹/memos/abc›는 422(‹int_parsing›)가 보여야 합니다. ‹/docs›에서 항목 3개를 "Try it out"으로 눌러 보세요.`,
      code: `from fastapi import FastAPI, HTTPException

app = FastAPI(title="Memo API", version="0.1.0")

# 아직 DB가 없으므로 메모리에 둔 샘플 데이터다. 서버를 다시 켜면 처음 상태로 돌아온다.
MEMOS = [
    {"id": 1, "title": "첫 메모", "content": "FastAPI 서버가 응답한다"},
    {"id": 2, "title": "두 번째 메모", "content": "경로 매개변수로 한 건을 찾는다"},
]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/memos")
def list_memos():
    return MEMOS


@app.get("/memos/{memo_id}")
def get_memo(memo_id: int):
    for memo in MEMOS:
        if memo["id"] == memo_id:
            return memo
    raise HTTPException(status_code=404, detail="memo not found")`,
      codeLang: `python`,
      key: [
        `HTTP는 요청(메서드·경로·본문)과 응답(상태 코드·본문)의 약속이고, 서버는 포트를 열고 기다리는 프로그램 하나다`,
        `데코레이터가 (메서드, 경로)를 함수에 연결하고, 타입 힌트가 변환·검증·문서를 만든다`,
        `‹fastapi dev main.py›는 개발용(reload, 127.0.0.1), ‹fastapi run›은 운영용(0.0.0.0)이다`,
        `없는 자원은 200이 아니라 404로 답한다. 데이터가 프로세스 메모리에 있으면 재시작하거나 프로세스가 둘이면 사라지거나 갈라진다`
      ],
      pitfalls: [
        `가상환경을 켜지 않고 pip install을 해서 전역 파이썬에 깔린다. 프롬프트 앞의 ‹(.venv)›를 확인하고, 헷갈리면 ‹python -m pip›로 설치한다`,
        `프로젝트 폴더가 아닌 곳에서 서버를 켜서 main을 찾지 못한다는 오류가 난다. 항상 ‹main.py›가 있는 폴더에서 실행한다`,
        `이전에 켜 둔 서버가 8000번 포트를 잡고 있어 새 서버가 뜨지 않는다. 옛 터미널에서 Ctrl+C로 끄거나 ‹--port 8001›을 쓴다`,
        `파일 이름을 fastapi.py·pydantic.py처럼 라이브러리 이름과 같게 지어 자기 자신을 import하는 이상한 오류를 만든다`
      ]
    },
    {
      title: `Pydantic 모델로 요청·응답 검증: 계약을 코드로 적기`,
      body: `레슨 1의 ‹memo_id: int›는 FastAPI가 알아서 검사해 줬습니다. 이번에는 **본문(JSON)으로 들어오는 값**을 다룹니다. 서버 밖에서 오는 입력은 모두 믿을 수 없습니다. 고객 앱의 버그, 오타, 아직 만들지 않은 화면, 악의적인 요청이 같은 문으로 들어옵니다. 검증을 함수 안의 if 문으로 흩어 놓으면 빠뜨리는 곳이 생기므로 **경계에서 한 번, 선언적으로** 검사합니다. Pydantic 모델이 그 선언입니다.

### 입력 모델과 출력 모델을 나누는 이유
- ‹MemoCreate›는 클라이언트가 **정하는** 값(title, content)만 가집니다.
- ‹MemoOut›은 서버가 **정하는** 값(id, created_at)까지 담아 응답으로 나가는 모양입니다.
하나로 합치면 클라이언트가 ‹id›나 ‹created_at›을 직접 보낼 수 있습니다. 남의 메모를 덮어쓰거나 가짜 날짜를 심는 mass assignment 문제의 출발점입니다. 반대로 ‹response_model=MemoOut›은 함수가 dict에 값을 더 담아 돌려줘도 **선언된 필드만** 응답에 남깁니다. 나중에 테이블에 내부용 열이 늘어도 실수로 새어 나가지 않는 안전망입니다.

### 규칙마다 이유가 있다
| 설정 | 하는 일 | 왜 필요한가 |
| min_length=1 | 제목 1자 이상 | 빈 제목은 목록에서 눌러 볼 수 없는 메모가 된다 |
| max_length (100, 10000) | 길이 상한 | 상한이 없으면 수백 MB 본문 하나로 메모리·DB·로그가 부푼다 |
| str_strip_whitespace | 앞뒤 공백 제거 | 공백뿐인 제목이 min_length를 통과하지 못하게 한다 |
| extra="forbid" | 모르는 필드는 거절 | titel 같은 오타가 조용히 버려져 값이 저장되지 않는 사고를 422로 드러낸다 |
마지막 규칙에는 트레이드오프가 있습니다. forbid는 새 버전 클라이언트가 서버에 아직 없는 필드를 보내면 깨집니다. 쓰기 입력은 엄격하게, 읽기 응답은 관대하게 두는 쪽이 보통 안전하고, 고객 앱의 배포 주기와 합의해 정합니다.

### 422 읽는 법
검증이 실패하면 FastAPI는 **함수를 호출하지 않고** 422를 돌려줍니다. 본문의 ‹loc›은 오류 위치(‹["body","title"]›), ‹type›은 오류 종류(‹string_too_short›, ‹missing›, ‹extra_forbidden›), ‹msg›는 사람이 읽는 설명, ‹ctx›는 기준값(‹min_length›: 1)입니다. 400이 아니라 422인 이유는 "JSON 문법은 맞지만 의미상 처리할 수 없다"는 뜻이기 때문입니다(RFC 9110의 422). 고객 앱 개발자는 ‹loc›을 보고 어느 입력칸에 빨간 줄을 칠지 정합니다.

### 시간은 서버가, UTC로
‹created_at›은 서버가 ‹datetime.now(timezone.utc)›로 정합니다. 클라이언트 시계는 틀릴 수 있고 시간대도 제각각입니다. 응답 끝의 ‹Z›는 UTC라는 표시이며 화면에 맞는 시간대로 바꾸는 일은 클라이언트가 합니다. 시간대 표시가 없는 naive datetime을 내보내면 "9시간 어긋난다"는 버그 리포트를 받게 됩니다.

### 파일 분리와 한계
계약(모델)을 ‹schemas.py›로 나눴습니다. 라우트가 늘어도 "이 API가 무엇을 받고 주는가"는 한 파일에서 읽힙니다. 저장소는 아직 딕셔너리라서 서버를 끄면 사라지고, 프로세스를 둘 띄우면 서로 다른 데이터를 봅니다. 레슨 3에서 해결합니다.

### 확인
서버를 다시 켜고 /docs의 ‹POST /memos›로 시험합니다. (1) ‹{"title": "장보기", "content": "우유"}›는 201과 ‹id: 1›, (2) ‹{"title": "   "}›는 422 ‹string_too_short›, (3) ‹{"title": "a", "titel": "x"}›는 422 ‹extra_forbidden›, (4) 제목 101자는 422 ‹string_too_long›, (5) ‹created_at›이 ‹Z›로 끝납니다. 터미널에서는 ‹python -c "import httpx; print(httpx.post('http://127.0.0.1:8000/memos', json={'title': ''}).json())"›처럼 한 줄로도 보낼 수 있습니다.`,
      code: `# ===== schemas.py (새 파일) =====
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MemoCreate(BaseModel):
    """클라이언트가 보내는 값만 담는다. id와 created_at은 서버가 정한다."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str = Field(min_length=1, max_length=100)
    content: str = Field(default="", max_length=10_000)


class MemoOut(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime

# ===== main.py (통째로 교체) =====
from datetime import datetime, timezone
from itertools import count

from fastapi import FastAPI, HTTPException

from schemas import MemoCreate, MemoOut

app = FastAPI(title="Memo API", version="0.2.0")

MEMOS: dict[int, dict] = {}  # id -> 메모. 아직 메모리 저장소다.
next_id = count(1)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/memos", response_model=MemoOut, status_code=201)
def create_memo(body: MemoCreate):
    memo = {
        "id": next(next_id),
        **body.model_dump(),
        "created_at": datetime.now(timezone.utc),
    }
    MEMOS[memo["id"]] = memo
    return memo


@app.get("/memos", response_model=list[MemoOut])
def list_memos():
    return list(MEMOS.values())


@app.get("/memos/{memo_id}", response_model=MemoOut)
def get_memo(memo_id: int):
    if memo_id not in MEMOS:
        raise HTTPException(status_code=404, detail="memo not found")
    return MEMOS[memo_id]`,
      codeLang: `python`,
      key: [
        `입력 모델(클라이언트가 정하는 값)과 출력 모델(서버가 정하는 값 포함)을 분리하면 id·created_at 조작과 내부 필드 노출을 막는다`,
        `검증은 경계에서 한 번: 실패하면 함수는 호출되지 않고 422(loc·type·msg)가 나간다`,
        `길이 상한·공백 제거·extra="forbid"는 각각 사고 하나를 막는 선택이며, 트레이드오프를 고객과 합의한다`,
        `시각은 서버가 UTC로 정하고 Z 표기로 내보낸다. 표시용 시간대 변환은 클라이언트의 몫이다`
      ],
      pitfalls: [
        `‹content: str = None›처럼 타입과 기본값이 어긋나게 쓴다. 비워도 되는 값은 기본값을 빈 문자열로 두거나 ‹str | None = None›으로 분명히 적는다`,
        `응답 모델 없이 dict나 DB 행을 그대로 반환해, 나중에 늘어난 내부 열(메모·해시 등)이 응답에 섞여 나간다`,
        `Pydantic v1 문법(‹.dict()›, ‹class Config›)을 v2에서 그대로 쓴다. v2는 ‹model_dump()›와 ‹model_config›다`,
        `422 본문에는 클라이언트가 보낸 원본 값(‹input›)이 그대로 들어 있다. 비밀번호 같은 필드가 생기면 응답·로그로 되돌아 나가지 않게 레슨 4처럼 직접 다듬는다`
      ]
    },
    {
      title: `SQLite 연동과 CRUD: 저장하고 되찾기`,
      body: `이제 데이터를 파일에 저장합니다. 사용하는 것은 파이썬 표준 라이브러리 ‹sqlite3›입니다. SQLite는 별도의 DB 서버가 없고 **라이브러리가 내 프로세스 안에서 파일 하나(‹memo.db›)를 직접 읽고 씁니다**. 설치도 계정도 포트도 필요 없어 작은 서비스와 사내 도구에 잘 맞습니다. 대신 한계가 뚜렷합니다. 쓰기는 한 번에 한 연결만 가능하고(파일 잠금), 서버 여러 대가 같은 파일을 공유할 수 없으며, 네트워크 드라이브 위에서는 위험합니다. "동시 쓰기가 적은 단일 서버"라는 범위를 기억하세요.

### 설계 결정 네 가지
1. **요청마다 연결을 열고 닫는다.** ‹Depends(get_conn)›은 ‹yield› 앞에서 연결을 만들어 주입하고 응답이 나간 뒤 ‹finally›에서 닫습니다. 전역 연결 하나를 공유하면 동시에 처리되는 요청의 트랜잭션이 한 연결 위에서 뒤섞입니다.
2. **‹check_same_thread=False›.** 일반 ‹def› 함수는 스레드풀에서 실행되고, 한 요청의 의존성과 라우트 함수가 서로 다른 스레드를 쓸 수 있습니다. 기본값(True)이면 연결을 만든 스레드가 아닌 곳에서 쓸 때 ‹ProgrammingError›가 납니다. FastAPI 공식 SQL 튜토리얼도 같은 이유를 설명합니다. 이 옵션이 안전한 것은 "연결 하나를 요청 하나만 쓴다"는 구조 덕분이고, 여러 요청이 연결을 공유하면 위험해집니다. 스레드가 재사용되는지는 타이밍에 달려 있어서, 개발 중엔 멀쩡하다가 부하가 걸리면 가끔 터지는 식으로 나타날 수 있습니다.
3. **값은 항상 ‹?›로 바인딩한다.** ‹f"... '{title}'"›처럼 문자열을 이어 붙이면 SQL 인젝션입니다. ‹(body.title, body.content)›처럼 값을 따로 넘기면 드라이버가 값을 SQL 문법과 분리합니다. 테이블·열 이름은 바인딩이 안 되므로 코드에 상수로 두고 사용자 입력으로 만들지 않습니다.
4. **쓰기는 ‹with conn:› 안에서.** 블록이 정상 종료되면 commit, 예외가 나면 rollback입니다. 연결을 닫지는 않으므로 닫는 일은 ‹get_conn›이 맡습니다. commit을 빠뜨리면 응답은 성공인데 연결이 닫히며 변경이 사라집니다.

### 스키마의 결정들
- ‹INTEGER PRIMARY KEY AUTOINCREMENT›: 이 키워드가 없으면 가장 큰 id의 행을 지운 뒤 같은 id가 다시 배정될 수 있습니다(SQLite 문서). 클라이언트가 id를 캐시하거나 링크로 저장하므로 삭제된 번호가 다른 메모를 가리키지 않게 합니다. 대가는 약간의 오버헤드입니다.
- ‹created_at›의 기본값은 ‹strftime('%Y-%m-%dT%H:%M:%SZ', 'now')›로 DB가 UTC 문자열(‹2026-11-12T01:02:03Z›)을 채웁니다. SQLite에는 날짜 타입이 따로 없어 TEXT로 저장하고, ISO-8601 문자열은 사전순 정렬이 시간순과 같습니다.
- ‹CREATE TABLE IF NOT EXISTS›는 서버가 시작할 때 한 번(lifespan) 실행합니다. 이미 있는 테이블은 **수정하지 않으므로**, 나중에 열을 더할 때는 별도의 변경 문(ALTER 또는 마이그레이션)이 필요합니다.

### CRUD와 HTTP의 대응
| HTTP | SQL | 성공 | 대상이 없을 때 |
| POST /memos | INSERT | 201 + 만들어진 메모 | - |
| GET /memos, /memos/{id} | SELECT | 200 | 한 건 조회는 404 |
| PUT /memos/{id} | UPDATE | 200 + 바뀐 메모 | 404 |
| DELETE /memos/{id} | DELETE | 204 (본문 없음) | 404 |
수정·삭제는 먼저 SELECT로 있는지 묻지 않고 **‹cursor.rowcount›**(영향받은 행 수)가 0인지로 404를 판단합니다. 조회와 수정 사이에 다른 요청이 지울 수 있어서(경쟁 상태) 한 문장의 결과를 믿는 편이 정확하고 왕복도 줄어듭니다. ‹sqlite3.Row›는 FastAPI가 그대로 읽지 못하므로 ‹dict(row)›로 바꿔 돌려줍니다.

### 확인
서버를 켜면 폴더에 ‹memo.db›가 생깁니다. POST로 메모 3건을 만든 뒤 서버를 껐다 켜도 ‹GET /memos›에 3건이 남아 있어야 합니다(레슨 2와의 차이). 목록은 id 역순(최신 먼저)이고, 가장 큰 id를 지운 뒤 만든 메모는 지운 번호가 아닌 새 번호를 받습니다. 제목에 ‹x'); DROP TABLE memos;--›를 넣어도 문자열 그대로 저장되고 테이블은 무사합니다. 없는 id의 PUT·DELETE는 404, 한 번 지운 id의 DELETE를 다시 보내도 404입니다.`,
      code: `# ===== db.py (새 파일) =====
import sqlite3

DB_PATH = "memo.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS memos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
)
"""


def connect(path: str = DB_PATH) -> sqlite3.Connection:
    # 요청 하나가 여러 스레드를 거칠 수 있어 False로 둔다. 연결은 요청마다 새로 만든다.
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(path: str = DB_PATH) -> None:
    conn = connect(path)
    conn.execute(SCHEMA)
    conn.close()


def get_conn():
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()

# ===== main.py (통째로 교체) =====
from contextlib import asynccontextmanager
from sqlite3 import Connection
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException

from db import get_conn, init_db
from schemas import MemoCreate, MemoOut

Conn = Annotated[Connection, Depends(get_conn)]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Memo API", version="0.3.0", lifespan=lifespan)


def find_memo(conn: Connection, memo_id: int) -> dict:
    row = conn.execute("SELECT * FROM memos WHERE id = ?", (memo_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="memo not found")
    return dict(row)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/memos", response_model=MemoOut, status_code=201)
def create_memo(body: MemoCreate, conn: Conn):
    sql = "INSERT INTO memos (title, content) VALUES (?, ?)"
    with conn:
        cur = conn.execute(sql, (body.title, body.content))
    return find_memo(conn, cur.lastrowid)


@app.get("/memos", response_model=list[MemoOut])
def list_memos(conn: Conn):
    rows = conn.execute("SELECT * FROM memos ORDER BY id DESC").fetchall()
    return [dict(row) for row in rows]


@app.get("/memos/{memo_id}", response_model=MemoOut)
def get_memo(memo_id: int, conn: Conn):
    return find_memo(conn, memo_id)


@app.put("/memos/{memo_id}", response_model=MemoOut)
def replace_memo(memo_id: int, body: MemoCreate, conn: Conn):
    sql = "UPDATE memos SET title = ?, content = ? WHERE id = ?"
    with conn:
        cur = conn.execute(sql, (body.title, body.content, memo_id))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="memo not found")
    return find_memo(conn, memo_id)


@app.delete("/memos/{memo_id}", status_code=204)
def delete_memo(memo_id: int, conn: Conn):
    with conn:
        cur = conn.execute("DELETE FROM memos WHERE id = ?", (memo_id,))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="memo not found")`,
      codeLang: `python`,
      key: [
        `SQLite는 서버 없는 파일 DB다. 설치가 필요 없지만 쓰기는 한 번에 하나이고 서버 여러 대가 같은 파일을 공유할 수 없다. 단일 서버·낮은 동시 쓰기에 맞다`,
        `요청마다 연결을 열고 닫는 yield 의존성과 ‹check_same_thread=False›를 함께 쓴다. 연결은 요청 하나만 쓴다`,
        `값은 ‹?›로 바인딩해 인젝션을 막고, 쓰기는 ‹with conn:›으로 묶어 성공이면 commit·예외면 rollback한다`,
        `존재 여부는 ‹rowcount›로 판단하고(경쟁 방지), ‹AUTOINCREMENT›로 삭제된 id의 재사용을 막는다`
      ],
      pitfalls: [
        `f-string으로 SQL을 조립한다. 검색어·제목뿐 아니라 정렬 열 이름 같은 값도 사용자 입력으로 만들면 안 된다`,
        `쓰기 뒤 commit을 빠뜨린다(‹with conn:› 누락). 응답은 201인데 연결이 닫히며 저장이 사라져, 서버를 껐다 켜기 전에는 눈치채기 어렵다`,
        `‹memo.db›를 상대 경로로 두어 실행한 폴더마다 다른 파일이 생기고, DB 파일을 git에 올린다. 경로는 레슨 7에서 설정으로 뺀다`,
        `연결 하나를 전역에 두고 모든 요청이 공유하거나, 스레드 오류가 났다고 옵션만 끄고 구조는 그대로 둔다`
      ]
    },
    {
      title: `오류 응답과 상태 코드: 실패도 설계한다`,
      body: `지금까지의 오류 응답은 우연히 생긴 것입니다. 없는 메모는 ‹{"detail":"memo not found"}›, 검증 실패는 ‹{"detail":[...]}›로 **모양이 둘**입니다. 클라이언트 개발자는 파서를 두 개 만들어야 하고, 예상 못한 예외는 일반 문구나 HTML로 나갑니다. 이번 레슨은 오류를 **계약**으로 만듭니다. 상태 코드는 기계가 분기하는 신호이고, 본문은 사람이 원인을 읽는 설명입니다.

### 상태 코드를 고르는 기준
| 코드 | 쓰는 때 | 이 프로젝트의 예 |
| 200 / 201 / 204 | 성공 / 만들었음 / 성공했지만 본문 없음 | GET·PUT / POST / DELETE |
| 401 | 인증 정보가 없거나 틀림. WWW-Authenticate 헤더 필수 | API 키 없음 (레슨 7) |
| 403 | 인증은 됐지만 그 일을 할 권한이 없음 | 역할을 도입할 때 |
| 404 | 대상이 없음 (존재를 숨길 때도 사용) | 없는 id |
| 409 | 현재 상태와 충돌 | 중복 제목 (랩 1) |
| 422 | 형식은 맞지만 값이 규칙에 어긋남 | 빈 제목 |
| 500 | 서버 내부 오류, 클라이언트 잘못이 아님 | 잡히지 않은 예외 |
401·403·409·422의 의미는 RFC 9110에 정의되어 있습니다. 가장 흔한 오설계는 **모든 오류를 200으로 주고 본문에 success: false를 넣는 것**입니다. 프록시·모니터링·재시도 로직·클라이언트 라이브러리가 모두 상태 코드를 기준으로 움직이므로, 오류가 성공처럼 보이면 장애가 대시보드에 나타나지 않습니다.

### 하나의 오류 모양
‹{"error": {"code": "not_found", "message": "memo not found"}}›. ‹code›는 코드가 비교할 안정적인 문자열(문구를 고쳐도 바뀌지 않음), ‹message›는 사람용 설명이고, 검증 오류에는 ‹fields›(어느 입력이 왜 틀렸나)를 더합니다. 표준 형식(RFC 9457 problem+json)을 쓰는 선택지도 있으니 고객 쪽 클라이언트가 이미 기대하는 형식이 있는지 먼저 묻습니다. 예외 핸들러 세 개로 모든 길을 덮습니다.
- ‹StarletteHTTPException›: 우리가 던지는 ‹HTTPException›은 이 클래스의 하위이고, 없는 경로(404)·허용되지 않는 메서드(405)처럼 프레임워크가 던지는 오류도 같은 클래스라 한 번에 통일됩니다. 인증의 ‹WWW-Authenticate› 헤더가 사라지지 않게 ‹exc.headers›를 넘깁니다.
- ‹RequestValidationError›: ‹exc.errors()›에서 ‹loc›과 ‹msg›만 골라 ‹fields›로 만듭니다. 기본 응답에 들어 있는 ‹input›(클라이언트가 보낸 원본 값)은 일부러 뺍니다.
- ‹Exception›: 예상 못한 오류입니다. 스택 트레이스는 서버 로그에만 남기고(‹log.exception›) 응답에는 일반 문구만 보냅니다. SQL 문, 파일 경로, 라이브러리 버전은 공격자에게 지도를 줍니다.

### 구조 정리
파일이 커졌으니 역할을 나눕니다. ‹main.py›는 조립, ‹routes.py›는 HTTP, ‹db.py›는 저장, ‹schemas.py›는 계약, ‹errors.py›는 오류 모양입니다. ‹routes.py›는 레슨 3의 ‹main.py›에서 라우트 함수를 옮기고 ‹@app.›을 ‹@router.›로, 경로 접두사 ‹/memos›는 ‹APIRouter(prefix="/memos")›로 옮기는 기계적인 작업입니다(코드 맨 아래 주석 참고). 옮긴 뒤 레슨 3의 확인 항목이 상태 코드 기준으로 그대로 통과해야 합니다. 이 작업은 동작을 바꾸지 않습니다.

### 두 번 지우면 어떻게 할까
DELETE를 두 번 보냈을 때 두 번째를 404로 할지 204로 할지는 **정책**입니다. 이 프로젝트는 404로 "이미 없음"을 알려 주지만, 재시도가 잦은 모바일 환경에서는 204를 고르는 팀도 많습니다. 정답이 아니라 문서에 적을 결정입니다.

### 확인
‹/memos/99›는 404와 ‹{"error":{"code":"not_found","message":"memo not found"}}›, ‹/nope›도 같은 모양의 404, ‹POST /health›는 405 ‹method_not_allowed›, 빈 제목 POST는 422와 ‹"field":"body.title"›이 든 ‹fields›, ‹/memos/abc›는 ‹path.memo_id›가 지목된 422여야 합니다. 라우트 함수 안에서 일부러 ‹raise RuntimeError("secret")›을 던져 보면 응답은 500과 일반 문구이고 "secret"은 **터미널 로그에만** 나타납니다. 확인하고 지우세요.`,
      code: `# ===== errors.py (새 파일) =====
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("memo")

CODES = {401: "unauthorized", 404: "not_found", 405: "method_not_allowed", 409: "conflict"}


def error_body(code: str, message: str, fields: list | None = None) -> dict:
    body = {"error": {"code": code, "message": message}}
    if fields:
        body["error"]["fields"] = fields
    return body


def install_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def on_http_error(request: Request, exc: StarletteHTTPException):
        body = error_body(CODES.get(exc.status_code, "http_error"), str(exc.detail))
        return JSONResponse(body, status_code=exc.status_code, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def on_invalid(request: Request, exc: RequestValidationError):
        fields = [
            {"field": ".".join(str(p) for p in e["loc"]), "message": e["msg"]}
            for e in exc.errors()
        ]
        body = error_body("validation_error", "request is invalid", fields)
        return JSONResponse(body, status_code=422)

    @app.exception_handler(Exception)
    async def on_unexpected(request: Request, exc: Exception):
        log.exception("unhandled error: %s %s", request.method, request.url.path)
        body = error_body("internal_error", "unexpected server error")
        return JSONResponse(body, status_code=500)

# ===== main.py (통째로 교체: 조립만 한다) =====
from contextlib import asynccontextmanager

from fastapi import FastAPI

from db import init_db
from errors import install_handlers
from routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Memo API", version="0.4.0", lifespan=lifespan)
install_handlers(app)
app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}

# ===== routes.py (새 파일: 레슨 3의 main.py에서 옮긴다) =====
# find_memo()와 CRUD 함수 5개를 Conn 별칭·import와 함께 옮기고 맨 위에 둔다.
#   router = APIRouter(prefix="/memos", tags=["memos"])
# @app.post("/memos") -> @router.post(""),  @app.put("/memos/{memo_id}") -> @router.put("/{memo_id}")`,
      codeLang: `python`,
      key: [
        `상태 코드는 기계가 분기하는 계약이다. 오류를 200으로 숨기면 모니터링·재시도·클라이언트가 모두 속는다`,
        `오류 본문은 한 가지 모양(안정적인 code + 사람용 message + 필요하면 fields)으로 통일하고, 핸들러 3종(HTTP·검증·예외)으로 모든 경로를 덮는다`,
        `500은 일반 문구만 응답하고 상세는 서버 로그에만 남긴다`,
        `401은 WWW-Authenticate 필수, 403은 권한 없음, 404는 대상 없음(존재 숨김 포함), 409는 충돌, 422는 값 규칙 위반이다`
      ],
      pitfalls: [
        `오류를 200으로 돌려주고 본문에 success: false를 넣는다. 반대로 모든 오류를 400 하나로 뭉뚱그려 클라이언트가 분기할 수 없게 만든다`,
        `예외 문자열(‹str(e)›)이나 검증 오류의 ‹input›을 응답에 그대로 넣어 내부 정보와 민감 값이 새어 나간다`,
        `‹except Exception: pass›로 오류를 삼켜서 장애가 흔적 없이 지나간다. 잡았다면 로그를 남기거나 다시 던진다`,
        `FastAPI의 ‹HTTPException›만 잡고 Starlette의 것을 놓쳐 404·405가 옛 모양으로 남는다. 핸들러는 ‹StarletteHTTPException›에 등록한다`
      ]
    },
    {
      title: `페이지네이션과 검색: 데이터가 늘어도 버티는 목록`,
      body: `메모가 3개일 때는 목록을 통째로 돌려줘도 됩니다. 10만 개가 되면 어떨까요? 메모 하나를 1KB로만 잡아도 응답이 100MB 가까이 되고, 서버는 그만큼을 읽고 직렬화하며, 모바일 앱은 받는 동안 멈춥니다. 데이터는 늘기만 하므로 **목록 API는 처음부터 "나눠서 주는 것"으로 설계**합니다. 이번 레슨은 limit·offset 페이지네이션과 검색을 만들고 한계를 직접 재현합니다.

### 응답은 배열이 아니라 봉투로
‹{"items": [...], "total": 120, "limit": 20, "offset": 0}›. 배열을 그대로 돌려주면 나중에 전체 개수 같은 정보를 더하는 순간 모양이 바뀌어 **이미 배포된 고객 앱이 깨집니다**. 이미 클라이언트가 있어 모양을 바꿀 수 없다면 본문은 두고 ‹X-Total-Count› 헤더에 싣거나 새 경로(버전)를 만듭니다. 이 프로젝트처럼 클라이언트가 아직 없을 때 바꾸는 것이 가장 쌉니다. 먼저 ‹schemas.py› 맨 아래에 ‹class MemoPage(BaseModel)›을 만들고 ‹items: list[MemoOut]›, ‹total: int›, ‹limit: int›, ‹offset: int› 네 필드를 적습니다(아래 코드에는 ‹routes.py›만 보입니다).

### 입력 상한이 방어선이다
‹limit›은 기본 20, 최대 100(‹Query(ge=1, le=100)›), ‹offset›은 0 이상입니다. 상한이 없으면 ‹?limit=100000000›이 서버를 멈추는 가장 쉬운 방법이 됩니다. 검색어 ‹q›도 100자로 제한합니다. 범위를 벗어나면 FastAPI가 422를 돌려주므로 함수 안에 검사 코드가 필요 없습니다. 정렬은 ‹ORDER BY id DESC›로 고정합니다. 정렬 없는 ‹LIMIT›는 순서를 보장하지 않아 페이지 사이에 같은 행이 반복되거나 빠질 수 있고, 정렬 열은 **유일해야** 안정적입니다(‹created_at›은 초 단위라 동률이 생깁니다).

### offset 방식의 한계
- **밀림**: 1페이지(id 11~7)를 받은 사이 새 메모(id 12)가 최신순 맨 앞에 끼면 offset 5가 한 칸 밀려, 2페이지에 id 7이 **다시** 나옵니다(이 모듈의 테스트 환경에서 재현했습니다). 반대로 지워지면 한 건이 **빠집니다**.
- **느려짐**: ‹OFFSET 100000›은 앞의 10만 행을 읽고 버린 뒤 결과를 줍니다. 앞쪽 페이지는 빠르고 뒤로 갈수록 느립니다.
대안은 **키셋(커서) 방식**입니다. "마지막으로 본 id보다 작은 것 20개"(‹WHERE id < ? ORDER BY id DESC LIMIT 20›)를 요청합니다. 위치가 아니라 값이 기준이라 밀리지 않고, 기본 키 인덱스를 타서 깊은 페이지도 빠릅니다(SQLite 실행 계획이 ‹SEARCH ... USING INTEGER PRIMARY KEY›로 나옵니다). 대신 임의의 페이지로 점프할 수 없습니다. 끝없이 내려가는 피드는 키셋, 번호를 눌러 이동하는 관리자 표는 offset으로 가르면 됩니다. 랩 2에서 직접 만듭니다.

### 검색: LIKE와 이스케이프
‹LIKE '%검색어%'›에서 ‹%›는 아무 문자열, ‹_›는 한 글자입니다. 사용자가 ‹100%›를 찾는데 이스케이프하지 않으면 ‹%›가 와일드카드로 작동해 엉뚱한 메모까지 걸립니다. 그래서 검색어의 ‹!›, ‹%›, ‹_›를 앞에 ‹!›를 붙여 이스케이프하고 SQL에 ‹ESCAPE '!'›를 적습니다(이스케이프 문자는 한 글자면 됩니다). SQLite의 LIKE는 기본적으로 **ASCII 영문만 대소문자를 무시**하므로 한글 검색에는 영향이 없고, 악센트가 있는 문자까지 무시하길 원하는 고객에게는 미리 알려야 합니다. ‹%검색어%›는 인덱스를 쓰지 못해 전체를 훑습니다. 수만 건까지는 문제가 없지만 그 이상이면 SQLite의 전문 검색(FTS5)을 검토합니다.

SQL 문자열은 끝까지 **상수**로 둡니다. 검색어가 있을 때와 없을 때의 SQL을 f-string으로 따로 만들지 않고, ‹WHERE ? IS NULL OR title LIKE ? ...›에서 검색어가 없으면 ‹None›을 넘겨 첫 조건이 참이 되게 했습니다. 문자열을 조립하는 습관은 언젠가 인젝션으로 돌아옵니다.

### 확인
메모 10여 건을 만든 뒤 ‹/memos›는 ‹total›과 ‹items›가 보이고, ‹?limit=3&offset=2›는 id가 내림차순인 3건, ‹?offset=999›는 ‹items: []›에 ‹total›은 그대로, ‹?q=100%›는 ‹100%›가 든 메모만, ‹?limit=101›·‹?limit=0›·‹?offset=-1›은 ‹query.limit›처럼 위치가 지목된 422여야 합니다.`,
      code: `from sqlite3 import Connection
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from db import get_conn
from schemas import MemoCreate, MemoOut, MemoPage

router = APIRouter(prefix="/memos", tags=["memos"])
Conn = Annotated[Connection, Depends(get_conn)]

# 검색어가 없으면 (? IS NULL)이 참이 되어 전체가 나온다. SQL 문자열은 항상 상수로 둔다.
WHERE = "WHERE ? IS NULL OR title LIKE ? ESCAPE '!' OR content LIKE ? ESCAPE '!'"


def find_memo(conn: Connection, memo_id: int) -> dict:
    row = conn.execute("SELECT * FROM memos WHERE id = ?", (memo_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="memo not found")
    return dict(row)


@router.post("", response_model=MemoOut, status_code=201)
def create_memo(body: MemoCreate, conn: Conn):
    sql = "INSERT INTO memos (title, content) VALUES (?, ?)"
    with conn:
        cur = conn.execute(sql, (body.title, body.content))
    return find_memo(conn, cur.lastrowid)


@router.get("", response_model=MemoPage)
def list_memos(
    conn: Conn,
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    text = (q or "").strip()
    like = None
    if text:  # LIKE의 와일드카드(% _)와 이스케이프 문자(!)를 글자 그대로 찾게 만든다
        like = "%" + text.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%"
    args = (like, like, like)
    total = conn.execute("SELECT COUNT(*) FROM memos " + WHERE, args).fetchone()[0]
    sql = "SELECT * FROM memos " + WHERE + " ORDER BY id DESC LIMIT ? OFFSET ?"
    rows = conn.execute(sql, (*args, limit, offset)).fetchall()
    items = [dict(row) for row in rows]
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/{memo_id}", response_model=MemoOut)
def get_memo(memo_id: int, conn: Conn):
    return find_memo(conn, memo_id)


@router.put("/{memo_id}", response_model=MemoOut)
def replace_memo(memo_id: int, body: MemoCreate, conn: Conn):
    sql = "UPDATE memos SET title = ?, content = ? WHERE id = ?"
    with conn:
        cur = conn.execute(sql, (body.title, body.content, memo_id))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="memo not found")
    return find_memo(conn, memo_id)


@router.delete("/{memo_id}", status_code=204)
def delete_memo(memo_id: int, conn: Conn):
    with conn:
        cur = conn.execute("DELETE FROM memos WHERE id = ?", (memo_id,))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="memo not found")`,
      codeLang: `python`,
      key: [
        `목록은 처음부터 봉투(items·total·limit·offset)로 설계한다. 배열 응답은 나중에 정보를 못 붙이고, 바꾸면 이미 배포된 클라이언트가 깨진다`,
        `limit 상한·offset 하한·검색어 길이를 ‹Query›로 제한하고, 정렬은 유일한 열로 고정한다`,
        `offset은 밀림(중복·누락)과 깊은 페이지의 느려짐이 있고, 키셋은 마지막 값 기준이라 둘 다 피한다. 피드는 키셋, 번호 이동은 offset이다`,
        `LIKE는 %·_를 이스케이프하고 값은 바인딩하며 SQL 문자열은 상수로 둔다. 앞뒤 %는 인덱스를 못 쓴다`
      ],
      pitfalls: [
        `limit 상한이 없거나 ORDER BY가 없다. 요청 한 번으로 서버를 멈추거나, 페이지 사이에 행이 겹치고 빠진다`,
        `검색어를 이스케이프하지 않아 ‹%›·‹_› 입력이 와일드카드가 되고, 검색어를 f-string으로 SQL에 붙여 인젝션 구멍을 만든다`,
        `이미 쓰는 클라이언트가 있는데 배열 응답을 봉투로 바꿔 앱을 깨뜨린다. 바꿔야 한다면 버전·헤더로 호환을 지킨다`,
        `정렬 기준을 ‹created_at›처럼 유일하지 않은 열로 잡아 같은 초에 만든 행의 순서가 요청마다 달라진다`
      ]
    },
    {
      title: `pytest + TestClient 테스트: 약속을 실행 가능하게`,
      body: `수동 확인(브라우저·/docs)은 레슨마다 5~10분이 들고, 코드를 고칠 때마다 이전 레슨의 동작이 살아 있는지 다시 봐야 합니다. 이것이 쌓이면 사람은 확인을 건너뛰고, 그때 버그가 들어옵니다. 테스트는 "이 서비스가 지켜야 하는 약속을 실행 가능한 문장으로 적어 둔 것"입니다. 고객에게는 납품물이 동작한다는 증거이고, 유지보수 계약에서는 코드를 고칠 때의 안전망입니다.

### TestClient가 하는 일
‹TestClient›는 서버를 띄우지 않고 앱 객체를 **직접 호출**해 요청과 응답을 흉내 냅니다. 네트워크도 포트도 필요 없어 요청 하나가 수 ms 수준이고, ‹client.get(...)›·‹client.post(json=...)›처럼 쓰며 테스트 함수는 일반 ‹def›라 ‹await›가 필요 없습니다. TestClient는 HTTP 클라이언트 패키지를 필요로 합니다. FastAPI 공식 테스트 튜토리얼은 아직 ‹httpx› 설치를 안내하지만, Starlette 1.10.0 소스는 ‹httpx2›를 먼저 찾고 ‹httpx›는 폐지 경고와 함께 대체로만 씁니다. ‹fastapi[standard]›에는 둘 다 들어 있습니다(2026-11 기준). 패키지가 없다는 오류가 나면 메시지가 요구하는 이름을 따르세요.

### 테스트 격리
핵심은 **테스트마다 새 DB**입니다. ‹tmp_path›는 pytest가 테스트마다 만들어 주는 임시 폴더이고, 여기에 ‹test.db›를 만들어 ‹init_db(path)›로 테이블을 만듭니다. 그리고 ‹app.dependency_overrides[db.get_conn]›으로 "이 의존성 대신 이 함수를 써라"고 바꿔 끼웁니다. 개발용 ‹memo.db›는 건드리지 않고, 테스트끼리 데이터를 공유하지 않아 실행 순서와 무관하게 통과합니다. fixture의 ‹yield› 뒤에서 ‹clear()›로 되돌리지 않으면 다음 테스트가 오염됩니다. ‹with TestClient(app)›으로 쓰지 않는 것도 의도입니다. with를 쓰면 lifespan이 실행되어 진짜 ‹memo.db›를 초기화합니다.

가짜(mock)를 쓰지 않고 **진짜 SQLite 파일**을 쓰는 이유는 빠르고(수 ms) 실제 SQL을 검증하기 때문입니다. 이 프로젝트에서 가장 틀리기 쉬운 코드는 SQL과 LIKE 이스케이프인데, mock으로는 틀린 SQL을 잡지 못합니다.

### 무엇을 테스트하나
- 행복 경로: 만들고 읽고 고치고 지우기
- 경계와 거절: 빈 제목, 없는 id, ‹limit› 범위
- 오류의 모양: 레슨 4의 계약 자체가 테스트 대상입니다
- 가장 틀리기 쉬운 곳: 검색 이스케이프, 페이지 창
테스트 이름은 요구사항 문장처럼 쓰고, 매번 바뀌는 ‹created_at›은 통째로 비교하지 말고 필요한 필드만 봅니다.

### 두 가지 함정을 일부러 밟아 본다
- **500 테스트**: 앱에는 ‹Exception› 핸들러가 있어 실제 서버는 500 JSON을 주지만, TestClient의 기본값 ‹raise_server_exceptions=True›는 서버에서 난 예외를 **테스트로 다시 던집니다**. 오류가 숨겨지지 않게 하려는 기본값이므로, 500 응답을 검사하려면 ‹TestClient(app, raise_server_exceptions=False)›를 따로 만듭니다(‹headers=client.headers›는 레슨 7에서 API 키 헤더를 이어받기 위한 준비입니다).
- **import 오류**: 기본 설정의 pytest는 ‹tests/› 폴더만 import 경로에 넣어서 ‹import db›가 ‹ModuleNotFoundError›가 됩니다. 프로젝트 루트에 ‹pytest.ini›를 만들고 ‹[pytest]›, ‹pythonpath = .›, ‹testpaths = tests›를 적습니다. ‹python -m pytest›로 실행하면 현재 폴더가 경로에 들어가 이 문제가 가려지므로, 한 번은 ‹pytest.ini› 없이 ‹pytest›로 일부러 깨 보세요.

### 확인
‹python -m pip install pytest›로 설치하고(TestClient용 패키지는 이미 있습니다) ‹pytest -v›를 실행해 **5 passed**가 보여야 합니다. 그다음 ‹routes.py›의 이스케이프(‹like = ...› 줄의 ‹replace› 세 개)를 일부러 지워 ‹test_pagination_and_search›가 실패하는지 확인합니다. 테스트가 코드를 지키는지 알아보는 가장 빠른 방법은 코드를 일부러 망가뜨려 보는 것입니다. 확인 후 되돌리세요.`,
      code: `# ===== tests/conftest.py (새 파일) =====
import pytest
from fastapi.testclient import TestClient

import db
from main import app


@pytest.fixture()
def client(tmp_path):
    path = str(tmp_path / "test.db")  # 테스트마다 새 파일: 서로 영향을 주지 않는다
    db.init_db(path)
    conn = db.connect(path)
    app.dependency_overrides[db.get_conn] = lambda: conn
    yield TestClient(app)
    app.dependency_overrides.clear()
    conn.close()

# ===== tests/test_memos.py (새 파일) =====
from fastapi.testclient import TestClient

import db
from main import app


def make(client, title="제목", content="내용"):
    res = client.post("/memos", json={"title": title, "content": content})
    assert res.status_code == 201
    return res.json()


def test_crud_lifecycle(client):
    url = f"/memos/{make(client)['id']}"
    assert client.get(url).json()["title"] == "제목"
    assert client.put(url, json={"title": "새 제목"}).json()["title"] == "새 제목"
    assert client.delete(url).status_code == 204
    assert client.get(url).status_code == 404


def test_blank_title_is_422_with_field_name(client):
    res = client.post("/memos", json={"title": "   "})
    assert res.status_code == 422
    assert res.json()["error"]["fields"][0]["field"] == "body.title"


def test_missing_memo_is_404(client):
    res = client.get("/memos/999")
    assert (res.status_code, res.json()["error"]["code"]) == (404, "not_found")


def test_pagination_and_search(client):
    for i in range(5):
        make(client, title=f"메모 {i}")
    make(client, title="100% 완료")
    page = client.get("/memos", params={"limit": 2, "offset": 2}).json()
    assert page["total"] == 6
    assert [m["title"] for m in page["items"]] == ["메모 3", "메모 2"]
    found = client.get("/memos", params={"q": "%"}).json()
    assert [m["title"] for m in found["items"]] == ["100% 완료"]


def test_unexpected_error_hides_details(client):
    def broken():
        raise RuntimeError("secret path C:/data/memo.db")

    app.dependency_overrides[db.get_conn] = broken
    quiet = TestClient(app, raise_server_exceptions=False, headers=client.headers)
    res = quiet.get("/memos")
    assert res.status_code == 500
    assert "secret" not in res.text`,
      codeLang: `python`,
      key: [
        `TestClient는 서버 없이 앱을 직접 호출한다. 테스트 함수는 일반 ‹def›다`,
        `테스트마다 ‹tmp_path›의 새 DB와 ‹dependency_overrides›로 격리하고, fixture의 ‹yield› 뒤에서 overrides를 정리한다`,
        `mock보다 진짜 SQLite 파일이 빠르고 SQL을 실제로 검증한다`,
        `500 응답을 검사하려면 ‹raise_server_exceptions=False›다. 기본값은 서버 예외를 테스트로 다시 던진다`,
        `‹pytest.ini›의 ‹pythonpath = .›가 없으면 tests 밖의 모듈을 import하지 못한다`
      ],
      pitfalls: [
        `테스트들이 같은 DB 파일을 공유해 실행 순서에 따라 통과와 실패가 갈리거나, 개발용 ‹memo.db›를 지워 버린다`,
        `‹dependency_overrides›를 정리하지 않아 다음 테스트가 가짜 의존성으로 돈다`,
        `상태 코드만 확인하고 본문은 보지 않거나 assert가 없는 테스트를 쓴다. 통과하지만 아무것도 지키지 못한다`,
        `‹created_at›·id처럼 매번 달라지는 값까지 통째로 비교해 간헐적으로 깨지는 테스트를 만든다`
      ]
    },
    {
      title: `간단한 인증 (API 키)과 설정 분리: 비밀을 코드 밖으로`,
      body: `지금까지 이 API는 URL만 알면 누구나 메모를 읽고 지울 수 있습니다. 여기서는 **API 키**로 막습니다. API 키는 "어떤 클라이언트(앱·서버)가 호출하는가"를 구분하는 약속된 비밀 문자열입니다. OWASP는 API 키를 **사용자 인증 수단으로 쓰지 말라**고 합니다. 사용자별 권한이 필요하면 OAuth·JWT 같은 별도 방식을 쓰고, API 키는 서버 대 서버나 사내 도구의 "클라이언트 식별"에 알맞습니다.

### 설계 결정
- **헤더로 받는다(‹X-API-Key›)**: 쿼리스트링(‹?key=...›)은 URL이라 서버·프록시 로그와 브라우저 기록에 남습니다.
- **HTTPS가 전제다**: 평문 HTTP의 키는 중간에서 보입니다. 암호화는 배포 환경(리버스 프록시·로드밸런서)이 맡습니다.
- **상수 시간 비교(‹secrets.compare_digest›)**: ‹==›은 처음 달라지는 곳에서 비교를 끝내므로 응답 시간 차이로 키를 추측하는 타이밍 공격이 가능합니다. 함정: ‹str›에 한글 같은 비ASCII 문자가 있으면 ‹TypeError›로 500이 되므로 두 값을 ‹.encode()›로 bytes로 바꿔 비교합니다.
- **401 + ‹WWW-Authenticate›**: RFC 9110은 401 응답에 이 헤더를 반드시 포함하라고 정합니다. 키는 유효하지만 그 자원에 권한이 없을 때가 403입니다.
- **‹auto_error=False›**: 헤더가 없을 때 보안 클래스가 자동으로 내는 오류는 FastAPI 0.122.0 전에는 403, 이후에는 401입니다. 검사와 401을 ‹require_api_key› 한 곳에서 직접 만들면 버전과 무관합니다. ‹Security(api_key_header)›로 선언하면 OpenAPI 문서에 보안 스키마가 등록되어 /docs에 **Authorize** 버튼이 생깁니다.
- **적용 범위**: ‹APIRouter(dependencies=[...])›로 ‹/memos› 전체에 한 번만 겁니다. ‹/health›는 모니터링이 키 없이 부르도록 공개합니다.

### 설정 분리: 코드와 환경을 가른다
키·DB 경로처럼 **환경마다 달라지는 값**은 코드에 넣지 않습니다. 코드에 박힌 키는 저장소에 영원히 남습니다. ‹pydantic-settings›의 ‹Settings›는 환경 변수를 읽어 타입을 바꾸고 검증합니다. 우선순위는 **환경 변수 > ‹.env› 파일 > 코드 기본값**이고, 변수 이름은 ‹MEMO_API_KEY›처럼 접두사에 필드 이름을 붙입니다.
- ‹api_key›에는 기본값이 없고 16자 이상이어야 합니다. 빠지면 서버가 **시작되지 않고** 문제 필드를 알려 줍니다(‹Field required›). 키 없이 조용히 열리는 것보다 시작 단계에서 멈추는 편이 안전합니다(fail fast). lifespan에서 ‹get_settings()›를 불러 시작 때 검증합니다.
- ‹@lru_cache›는 설정을 한 번만 만들어 요청마다 .env를 읽지 않게 합니다.
- 테스트에서는 ‹Settings(_env_file=None, api_key=..., db_path=...)›를 만들어 ‹dependency_overrides[get_settings]›로 바꿔 끼웁니다. ‹_env_file=None›이 없으면 개발자 PC의 진짜 ‹.env›가 테스트에 섞입니다.
- ‹.env›는 ‹.gitignore›에 넣고, 변수 이름만 적은 ‹.env.example›을 저장소에 둡니다. 키는 ‹python -c "import secrets; print(secrets.token_urlsafe(32))"›로 만듭니다(43자). 키를 로그·메신저에 남기지 않습니다.

### 코드에 담지 않은 변경
1. ‹db.py›: ‹DB_PATH›를 지우고 ‹connect(path)›·‹init_db(path)›의 기본값을 없앱니다. ‹get_conn(settings: Annotated[Settings, Depends(get_settings)])›가 ‹connect(settings.db_path)›를 부르게 합니다.
2. ‹main.py›: lifespan의 ‹init_db()›를 ‹init_db(get_settings().db_path)›로 바꾸고 ‹get_settings›를 import합니다.
3. ‹routes.py›: ‹from security import require_api_key›를 더하고 ‹router = APIRouter(prefix="/memos", tags=["memos"], dependencies=[Depends(require_api_key)])›로 바꿉니다.
4. 실행 전에 PowerShell에서 ‹$env:MEMO_API_KEY = "dev-key-0123456789abcd"›를 설정합니다.

### 확인
키 없이 ‹/memos›는 401과 ‹WWW-Authenticate: APIKey›, 틀린 키도 401, 올바른 키는 200, ‹/health›는 키 없이 200입니다. 환경 변수 없이 서버를 켜면 ‹api_key›가 필요하다는 검증 오류로 **시작이 중단**됩니다. /docs의 Authorize에 키를 넣으면 Try it out이 200이 되고, ‹pytest›는 **6 passed**여야 합니다.`,
      code: `# ===== settings.py (새 파일) =====
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MEMO_", env_file=".env", extra="ignore")

    api_key: str = Field(min_length=16)  # 기본값이 없다: 빠지면 서버가 시작하지 않는다
    db_path: str = "memo.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()

# ===== security.py (새 파일) =====
import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader

from settings import Settings, get_settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(
    key: Annotated[str | None, Security(api_key_header)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> None:
    # bytes로 바꿔 비교한다: 비ASCII 문자가 든 str을 compare_digest에 주면 TypeError가 난다
    expected = settings.api_key.encode()
    if key is None or not secrets.compare_digest(key.encode(), expected):
        headers = {"WWW-Authenticate": "APIKey"}
        raise HTTPException(401, "invalid or missing API key", headers=headers)

# ===== tests/conftest.py (통째로 교체) =====
import pytest
from fastapi.testclient import TestClient

from db import init_db
from main import app
from settings import Settings, get_settings

API_KEY = "test-key-0123456789"


@pytest.fixture()
def client(tmp_path):
    # .env를 읽지 않고(_env_file=None) 테스트 전용 설정을 직접 만든다
    settings = Settings(_env_file=None, api_key=API_KEY, db_path=str(tmp_path / "t.db"))
    init_db(settings.db_path)
    app.dependency_overrides[get_settings] = lambda: settings
    yield TestClient(app, headers={"X-API-Key": API_KEY})
    app.dependency_overrides.clear()

# ===== tests/test_memos.py (맨 아래에 추가) =====
def test_api_key_is_required(client):
    anonymous = TestClient(app)
    res = anonymous.get("/memos")
    assert res.status_code == 401
    assert res.headers["www-authenticate"] == "APIKey"
    wrong = TestClient(app, headers={"X-API-Key": "wrong-key-0123456789"})
    assert wrong.get("/memos").status_code == 401
    assert anonymous.get("/health").status_code == 200  # /health는 공개`,
      codeLang: `python`,
      key: [
        `API 키는 클라이언트 식별용이지 사용자 인증이 아니다. 헤더로 받고 HTTPS 위에서만 쓴다`,
        `비교는 ‹secrets.compare_digest›로 하되 비ASCII 때문에 ‹.encode()›한 bytes로 비교한다. 실패는 401 + ‹WWW-Authenticate›다`,
        `환경마다 다른 값은 환경 변수(> .env > 기본값)로 분리하고, 필수 값은 시작 시 검증해 fail fast 한다`,
        `비밀은 저장소·이미지·로그에 넣지 않는다(‹.gitignore›, ‹.dockerignore›, ‹.env.example›). 테스트는 Settings를 직접 만들어 override한다`
      ],
      pitfalls: [
        `키 기본값을 코드에 "dev-key"로 박아 두고, 설정을 깜빡한 운영 서버가 그 키로 그대로 열린다`,
        `키를 쿼리스트링으로 받거나 로그·오류 메시지에 출력한다. URL과 로그는 여러 곳에 복사되어 남는다`,
        `‹==›로 키를 비교하거나, ‹compare_digest›에 비ASCII ‹str›을 그대로 넘겨 500을 만든다`,
        `Settings를 모듈 import 시점에 만들어 테스트에서 바꿀 수 없게 하거나, 테스트가 개발자의 ‹.env›를 읽게 둔다`
      ]
    },
    {
      title: `Docker로 실행하고 OpenAPI 문서 확인: 포장·계약·납품`,
      body: `마지막 단계는 서비스를 **컨테이너로 포장해 어디서나 같은 방식으로 실행**하는 것, 그리고 **OpenAPI 문서로 계약을 확인**하는 것입니다. 그런 뒤 지금까지의 결정을 하나의 실제 의뢰에 적용해 봅니다.

### Dockerfile의 줄마다 이유
- ‹FROM python:3.13-slim›: 버전을 고정한 공식 이미지입니다. 태그를 생략하면 빌드할 때마다 달라질 수 있습니다. 3.13은 2029-10까지 보안 지원이 예정되어 있습니다(devguide, 2026-11 기준).
- 의존성 설치(‹COPY requirements.txt›, ‹RUN pip install›)를 **코드보다 먼저**: 코드만 바뀌면 느린 설치 층이 캐시에서 재사용됩니다.
- ‹COPY *.py ./›와 ‹.dockerignore›: 테스트·‹.env›·DB는 이미지에 넣지 않습니다. 비밀이 한 번 이미지 층에 들어가면 다음 줄에서 지워도 **이전 층에 남아서** 이미지를 받는 누구나 꺼낼 수 있습니다.
- ‹USER app›: 컨테이너가 뚫려도 root가 아니도록 일반 사용자로 실행합니다(Docker 모범 사례 문서).
- ‹VOLUME /data›와 ‹MEMO_DB_PATH›: 컨테이너 파일시스템은 컨테이너를 지우면 같이 사라지므로 DB는 이름 있는 볼륨에 둡니다.
- ‹CMD ["fastapi", "run", ...]›: **exec 형식**(JSON 배열)이면 종료 신호가 앱에 바로 전달되어 정상 종료와 lifespan 정리가 동작합니다(FastAPI 문서). ‹fastapi run›은 0.0.0.0에서 받아 컨테이너 밖에서 접속됩니다.
- ‹HEALTHCHECK›: ‹/health›를 주기적으로 불러 "프로세스는 있는데 응답을 못 하는" 상태를 알립니다.
SQLite 서비스는 **컨테이너 하나에 볼륨 하나**가 전제입니다. 같은 파일을 컨테이너 둘이 공유하거나 ‹--workers›를 크게 늘려 쓰기가 몰리면 ‹database is locked›가 납니다. 확장이 필요해지는 순간이 PostgreSQL로 옮길 시점입니다.

### OpenAPI: 계약서를 읽는 연습
/docs(Swagger UI), /redoc, /openapi.json은 코드에서 자동으로 만들어진 **계약서**입니다. 프런트엔드 팀은 이 문서로 개발하고 코드 생성기도 ‹openapi.json›을 입력으로 씁니다. 그래서 **문서가 실제 응답과 다르면 곧 버그**입니다. 실제로 FastAPI가 자동으로 적는 422 응답 스키마는 ‹detail› 배열인데 우리는 레슨 4에서 ‹error› 봉투로 바꿨습니다. 코드 아래처럼 ‹responses›에 ‹ErrorOut› 모델을 적어 일치시킵니다. 또 /docs는 화면 구성 파일을 외부 CDN(cdn.jsdelivr.net)에서 불러오므로, 인터넷이 막힌 고객사 내부망에서는 빈 화면이 됩니다(/docs HTML의 CDN 주소로 확인). 운영에서 문서를 공개할지도 고객과 정합니다(‹docs_url=None›).

### 통합 사례: 사내 지식 메모 API 납품
가상의 고객이 요청합니다. "20명 규모 팀이 쓸 사내 메모 API가 필요합니다. 서버는 1대, 하루 쓰기는 수백 건이고 모바일 팀이 나중에 연동합니다." 이 모듈의 결정이 그대로 제안의 근거가 됩니다.
1. 저장소: 단일 서버·낮은 쓰기량이라 SQLite로 충분하다고 설명하고, 이전 기준(서버 2대 이상, 쓰기 급증, 백업·복구 요건 강화)을 문서에 적습니다.
2. 계약: ‹openapi.json›을 내보내 모바일 팀에 먼저 전달합니다. ‹python -c "import json; from main import app; open('openapi.json','w',encoding='utf-8').write(json.dumps(app.openapi(), ensure_ascii=False, indent=2))"›로 만듭니다. PowerShell의 ‹>›는 UTF-16 파일을 만들 수 있어 파이썬으로 직접 씁니다.
3. 보안: 클라이언트별 API 키를 발급하고, HTTPS는 고객 인프라가 맡는다는 책임 분담을 적습니다.
4. 데이터: ‹memo.db›는 볼륨에 두고 ‹sqlite3.Connection.backup()›으로 정기적으로 백업하며 **복구까지 한 번 시험**합니다. 복구해 본 백업만 백업입니다.
5. 인수인계: 소스, 버전이 고정된 ‹requirements.txt›, ‹.env.example›, ‹Dockerfile›, ‹README›(실행·테스트·키 교체·백업과 복구), ‹openapi.json›, 테스트 결과를 묶어 전달합니다.

### 확인
1. ‹docker build -t memo-api .›가 성공합니다. 2. 아래 ‹docker run›으로 ‹http://127.0.0.1:8000/docs›가 열립니다. 3. Authorize에 키를 넣고 메모를 만든 뒤 컨테이너를 **지우고 같은 명령으로 다시 실행**해도 메모가 남아 있습니다(볼륨). 4. 키 없이 ‹/memos›는 401이고, 첫 점검 주기(30초쯤)가 지나면 ‹docker ps›의 STATUS에 ‹healthy›가 뜹니다. 5. /docs에서 422 응답이 ‹ErrorOut›으로 표시됩니다. Docker가 없다면 5번만 로컬에서 확인하세요.`,
      code: `# ===== Dockerfile =====
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \\
    MEMO_DB_PATH=/data/memo.db

WORKDIR /app

# 의존성 먼저: 코드만 바뀌면 이 층은 캐시에서 재사용된다
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY *.py ./

# 일반 사용자로 실행하고, DB 파일은 볼륨이 붙는 /data에 둔다
RUN useradd --create-home --uid 10001 app && mkdir /data && chown app /data
USER app
VOLUME /data
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"

CMD ["fastapi", "run", "main.py", "--port", "8000"]

# ===== .dockerignore =====
.venv
.git
.env
*.db
__pycache__
.pytest_cache
tests

# ===== requirements.txt (버전 숫자는 2026-11 기준) =====
fastapi[standard]==0.162.5
pydantic-settings==2.16.2

# ===== requirements-dev.txt =====
-r requirements.txt
pytest==9.2.0

# ===== schemas.py (맨 아래에 추가) =====
class ErrorBody(BaseModel):
    code: str
    message: str
    fields: list[dict[str, str]] | None = None


class ErrorOut(BaseModel):
    """모든 오류 응답의 공통 모양. errors.py가 실제로 이 모양을 돌려준다."""

    error: ErrorBody

# ===== routes.py (import 한 줄과 router 선언을 이렇게 바꾼다) =====
from schemas import ErrorOut, MemoCreate, MemoOut, MemoPage
from security import require_api_key

# 실제 응답과 문서가 어긋나지 않게: 422도 우리 오류 모양으로 문서화한다
ERRORS = {code: {"model": ErrorOut} for code in (401, 404, 422)}
router = APIRouter(
    prefix="/memos",
    tags=["memos"],
    dependencies=[Depends(require_api_key)],
    responses=ERRORS,
)

# ===== 실행 (PowerShell, 프로젝트 폴더에서) =====
docker build -t memo-api .
docker run --rm -p 8000:8000 -e MEMO_API_KEY=docker-test-key-0123456789 -v memo-data:/data memo-api
# 브라우저로 http://127.0.0.1:8000/docs 를 열고 Authorize에 위 키를 넣는다`,
      codeLang: `text`,
      key: [
        `Dockerfile은 의존성 → 코드 순서(캐시), 비루트 사용자, exec 형식 CMD, 볼륨에 둔 DB가 기본기다. 비밀은 이미지에 넣지 않고 실행 시 환경 변수로 준다`,
        `SQLite 서비스는 컨테이너 하나·볼륨 하나가 전제다. 여러 개로 늘리는 순간이 PostgreSQL 이전 시점이다`,
        `OpenAPI 문서는 고객과의 계약서다. 문서와 실제 응답이 다르면(예: 422 모양) 버그이고, /docs는 외부 CDN에 의존한다`,
        `납품은 코드가 아니라 묶음이다: 고정된 의존성, ‹.env.example›, Dockerfile, README(백업·복구·키 교체), ‹openapi.json›, 테스트 결과`
      ],
      pitfalls: [
        `‹COPY . .›에 ‹.dockerignore›가 없어 ‹.env›와 ‹memo.db›가 이미지 층에 들어간다. 나중에 지워도 이전 층에 남는다`,
        `볼륨 없이 운영해 컨테이너를 교체하는 순간 데이터가 사라지고, 백업을 받아만 두고 복구는 시험해 보지 않는다`,
        `‹latest›나 태그 생략으로 빌드해 어제와 오늘 이미지가 달라지고, 개발용 reload 옵션이나 root 사용자 그대로 운영한다`,
        `외부 CDN에 의존하는 /docs가 인터넷이 막힌 고객사에서 빈 화면이 되는데, 문서 전달 수단(‹openapi.json›·정적 문서)을 따로 준비하지 않는다`
      ]
    }
  ],
  labs: [
    {
      title: `PATCH 부분 수정과 중복 제목 409`,
      scenario: `고객 메시지: "앱에서 메모 내용만 고칠 때도 제목까지 매번 다시 보내야 해서 불편해요. 그리고 같은 제목의 메모가 여러 개 생기면 검색 결과가 헷갈리니 제목은 유일했으면 합니다." 레슨 8까지 완성한 프로젝트를 복사한 새 폴더(또는 git 브랜치)에서 작업합니다. 이미 운영 중인 memo.db에 같은 제목이 들어 있을 수 있다는 점까지 고려해 변경하세요. 정답 코드는 제공되지 않으며, 스스로 설계하고 테스트로 증명하는 것이 목표입니다.`,
      steps: [
        `시작하기 전에 ‹pytest›가 전부 통과하는지 확인하고 passed 개수를 적어 둔다(기준선)`,
        `‹schemas.py›에 ‹MemoPatch›를 만든다. ‹title›·‹content›는 모두 선택이고 모르는 필드는 거절한다. 아무 필드도 없는 ‹{}›는 422가 되어야 한다(힌트: Pydantic의 ‹model_validator›)`,
        `‹PATCH /memos/{id}›를 구현한다. 보낸 필드만 바뀌어야 하고 SQL 문자열을 이어 붙이지 않는다(‹COALESCE(?, title)› 패턴이나 고정된 SQL 여러 개). 없는 id는 404다`,
        `‹init_db›에 ‹CREATE UNIQUE INDEX IF NOT EXISTS›로 제목 유일성을 추가한다. 같은 제목이 이미 들어 있는 ‹memo.db›에서 서버를 켜면 어떻게 되는지 직접 확인하고, 해결 절차(중복을 찾아 정리하는 쿼리와 순서)를 README에 적는다`,
        `‹sqlite3.IntegrityError›를 409로 바꾼다(‹errors.py›에 핸들러를 추가하거나 라우트에서 변환). 응답 본문에 DB 내부 문구가 나가면 안 된다`,
        `POST·PUT·PATCH 세 경로 모두에서 중복 제목이 409인지, PATCH가 제목을 건드리지 않는지, 빈 PATCH가 422인지 테스트를 쓴다`,
        `문서용 ‹ERRORS›에 409를 추가하고 /docs에서 PATCH가 보이는지, 409 응답이 ‹ErrorOut›으로 표시되는지 확인한다`
      ],
      accept: [
        `‹PATCH {"content": "새 본문"}›은 200이고 제목은 그대로다(테스트로 증명)`,
        `‹PATCH {}›은 422이고 ‹error.code›가 ‹validation_error›다`,
        `POST·PUT·PATCH로 다른 메모와 같은 제목을 만들려 하면 모두 409이고 ‹error.code›가 ‹conflict›이며, 응답 본문에 ‹UNIQUE›라는 단어가 없다`,
        `기존 테스트가 전부 통과하고 새 테스트가 5개 이상 추가되어, ‹pytest -q›가 기준선보다 5개 이상 많은 passed로 끝난다`
      ],
      stretch: `제목 유일성을 대소문자 무시로 바꿔 Apple과 apple이 충돌하게 하세요(‹COLLATE NOCASE› 인덱스). 그 규칙이 한글 제목과 악센트가 있는 문자(É와 é)에서는 어떻게 동작하는지 실험으로 확인해 README에 한 문단으로 적으세요.`
    },
    {
      title: `키셋(커서) 페이지네이션으로 무한 스크롤 안정화`,
      scenario: `모바일 팀 메시지: "무한 스크롤을 내리다 보면 같은 메모가 두 번 나오고, 가끔은 하나가 빠집니다." 레슨 5의 offset 방식이 원인이라는 것을 먼저 테스트로 재현한 뒤, 새 방식의 엔드포인트를 추가합니다. 기존 GET /memos는 관리자 화면이 쓰고 있으므로 모양을 한 글자도 바꾸지 않습니다(하위 호환). 시간과 실행 계획은 환경마다 달라지므로 본인 PC에서 직접 측정한 값을 근거로 남깁니다.`,
      steps: [
        `재현 테스트부터 쓴다. 메모 12개를 만들고 ‹limit=5›로 1페이지를 받은 뒤 새 메모 1개를 만들고 ‹offset=5›로 2페이지를 받아, 두 페이지에 겹치는 id가 있음을 단언한다. 이 테스트는 기존 코드에서 통과해야 한다(버그를 증명하는 테스트)`,
        `‹GET /memos/feed?limit=&before_id=›를 추가한다. ‹before_id›가 없으면 가장 최신부터, 있으면 ‹id < before_id›인 메모를 ‹id DESC›로 준다. 라우트 선언 순서 때문에 ‹/memos/{memo_id}›에 가려지면 ‹feed›가 정수가 아니라는 422가 나온다`,
        `응답은 ‹{"items": [...], "next_before_id": 정수 또는 null}›이다. 다음 페이지가 없으면 null이다(힌트: ‹limit + 1›건을 읽어 남는지 보면 추가 쿼리가 필요 없다)`,
        `1페이지를 받은 뒤 새 메모를 넣고 다음 페이지를 받는 같은 시나리오를 feed로 돌려 겹침이 0임을 테스트로 증명한다. 순회 도중 메모를 3개 더 넣어도 처음에 있던 메모가 정확히 한 번씩만 나와야 한다`,
        `feed 쿼리의 ‹EXPLAIN QUERY PLAN›을 출력하는 스크립트를 만들고 결과를 README에 붙인다. 처음에는 ‹WHERE (? IS NULL OR id < ?)›로 써 보고 계획이 ‹SCAN›임을 확인한 뒤, ‹SEARCH›가 나오도록 고친다(힌트: 센티널 값과 ‹COALESCE›, 또는 SQL 두 가지)`,
        `메모 10,000건을 넣은 DB에서 ‹offset=9980›과 feed의 해당 구간을 각각 50번 호출해 평균 시간을 ‹time.perf_counter›로 재고 표로 기록한다. 측정 환경(PC·Python 버전)을 함께 적는다`,
        `‹limit›은 최대 100이고 101은 422임을 테스트로 고정한다`
      ],
      accept: [
        `재현 테스트가 기존 offset 방식에서 겹침(교집합 1건 이상)을 단언하고 통과한다`,
        `feed 순회 테스트에서 겹침 0, 누락 0이다(처음에 있던 id 집합과 순회 결과 집합이 같다)`,
        `‹EXPLAIN QUERY PLAN› 출력에 ‹SEARCH›와 ‹PRIMARY KEY›가 들어 있고 feed 쿼리가 ‹SCAN memos›로만 나오지 않는다`,
        `README에 offset과 keyset의 평균 시간(ms) 표와 측정 환경이 있다. 값이 어떻든 측정 방법을 다른 사람이 되풀이할 수 있어야 한다`,
        `기존 ‹GET /memos›의 응답 모양은 바뀌지 않았고 기존 테스트가 전부 통과한다`
      ],
      stretch: `검색어 q와 feed를 함께 쓸 수 있게 하세요. 그리고 정렬 기준을 created_at으로 바꿔 달라는 요구가 나오면 커서가 왜 (created_at, id) 두 값이어야 하는지, 커서를 의미를 숨긴 문자열(base64)로 감싸는 이유가 무엇인지 README에 서술하세요.`
    },
    {
      title: `[클라이언트 요청] 팀별 API 키와 데이터 분리 납품`,
      scenario: `사내 위키 운영팀 담당자의 메시지: "메모 API를 팀 3곳(개발·디자인·인사)이 함께 쓰려 합니다. 팀마다 다른 API 키를 쓰고, 각 팀은 자기 팀 메모만 보고 고칠 수 있어야 합니다. 이미 쌓인 메모는 '기존 메모'로 남겨 주세요. 키를 바꿀 때 서비스가 멈추면 안 됩니다. 저희 서버 담당자가 문서만 보고 Docker로 띄울 수 있어야 하고, 견적도 같이 주세요." 이 요청을 요구사항 정리, 구현, 인수인계, 견적까지 혼자 처리합니다. 가상의 고객이므로 모호한 부분(기존 메모를 누가 볼 수 있나 등)은 스스로 질문을 만들고 가정을 정해 문서에 적습니다.`,
      steps: [
        `요구사항에서 모호한 부분(기존 메모의 열람 범위, 팀 간 공유 여부, 키 발급·교체 절차, 백업 주기, 예상 데이터량, HTTPS 담당 등)을 질문 8개로 정리하고, 각 질문에 가정을 적어 docs/ASSUMPTIONS.md로 남긴다`,
        `설정: ‹MEMO_API_KEYS›를 JSON(‹{"dev": ["키1"], "design": ["키2", "키3"]}› 형태)으로 받아 ‹Settings.api_keys›(‹dict[str, list[str]]›)로 읽는다. 16자 미만 키, 빈 팀, 두 팀에 걸친 같은 키는 시작 시 검증 오류로 막는다`,
        `‹security.py›: 헤더의 키로 팀 이름을 찾아 돌려주는 의존성을 만든다. 모든 후보 키를 ‹compare_digest›로 비교해 일치하는 팀을 반환하고, 없으면 401이다`,
        `마이그레이션: ‹owner TEXT NOT NULL DEFAULT 'legacy'› 열을 기존 DB에 추가한다. 새 DB와 옛 DB 양쪽에서 ‹init_db›가 오류 없이 동작해야 한다(‹PRAGMA table_info›로 열이 있는지 보고 ‹ALTER TABLE›). 옛 스키마로 만든 memo.db를 따로 보관해 두고 시험한다`,
        `모든 SQL(생성·조회·검색·total·수정·삭제)에 owner 조건을 붙인다. 다른 팀의 메모는 403이 아니라 404로 답한다(존재 자체를 드러내지 않기 위함이며, RFC 9110이 허용한 방식이라는 근거를 문서에 한 줄로 적는다)`,
        `테스트 10개 이상: 팀 격리(GET·PUT·DELETE 각각 404, 목록·검색·total에 다른 팀 메모 0건), 기존 메모 접근 규칙, 키 두 개 동시 허용, 옛 키 제거 후 401, 약한 설정 거절`,
        `키 교체 절차를 실제로 한 번 시연한다. 새 키를 추가하고 재시작해 두 키가 모두 200인 것을 보고, 옛 키를 빼고 재시작해 옛 키만 401이 되는 것을 확인한다`,
        `컨테이너: 새 설정으로 ‹docker run›이 되도록 ‹.env.example›·README를 갱신하고 재시작 뒤 데이터가 남는지 확인한다. ‹openapi.json›을 내보내 docs/에 넣는다`,
        `docs/ESTIMATE.md에 견적서를 쓴다. 작업 항목별 시간(요구사항·구현·테스트·문서와 인수인계·버퍼), 포함되지 않는 것(HTTPS 인증서·서버 운영·사용자 로그인), 유지보수 옵션 1개를 넣는다`
      ],
      accept: [
        `팀 A의 키로 팀 B의 메모를 GET·PUT·DELETE하면 모두 404이고, 목록·검색·total에 팀 B의 메모가 0건이다(테스트가 증명)`,
        `마이그레이션 전 스키마의 memo.db를 그대로 두고 서버를 켜면 기존 메모가 모두 legacy 소유로 조회되고 건수가 변하지 않는다. 누가 볼 수 있는지가 ASSUMPTIONS에 적혀 있고 테스트로 고정되어 있다`,
        `팀 A에 키 2개를 설정하면 둘 다 200이고, 하나를 뺀 뒤에는 뺀 키만 401이다`,
        `새 폴더에 저장소를 복사해 README의 명령만 순서대로 따라 ‹docker run›이 되고 /docs가 열린다(명령 5줄 이내, 키와 볼륨 포함)`,
        `‹pytest›가 전부 통과하고 이 랩에서 추가한 테스트가 10개 이상이며, ESTIMATE.md에 항목별 시간과 제외 항목이 있다`
      ],
      stretch: `설정에 키 원문 대신 SHA-256 해시만 저장하고, 요청으로 온 키를 해시해서 비교하도록 바꾸세요. 충분히 길고 무작위인 키에는 빠른 해시로도 괜찮지만 사용자가 정한 비밀번호에는 왜 안 되는지를 README에 적으세요.`
    }
  ],
  quiz: [
    {
      q: `어느 날 서버 로그에 아래 오류가 가끔 찍힌다. 부하가 낮을 때는 거의 나오지 않는다.

sqlite3.ProgrammingError: SQLite objects created in a thread can only be used in that same thread. The object was created in thread id 8248 and this is thread id 15564.

db.py의 get_conn()이 sqlite3.connect("memo.db")로 연결을 만들어 yield하고, 일반 def 라우트 함수가 그 연결을 쓴다. 가장 적절한 조치는?`,
      choices: [
        `연결을 모듈 전역에 하나만 만들고 모든 요청이 공유하게 한다`,
        `오류를 try/except로 잡아 무시하고 요청을 다시 시도한다`,
        `요청마다 새 연결을 만들되 check_same_thread=False로 열고, 한 요청의 연결은 그 요청 안에서만 쓴다`,
        `서버 워커 수를 1로 줄여 스레드 이동이 없게 한다`
      ],
      answer: 2,
      why: `한 요청의 의존성과 라우트 함수는 스레드풀의 서로 다른 스레드에서 실행될 수 있어 기본값(True)이면 가끔 터집니다. 연결을 요청 하나만 쓰는 구조에서는 check_same_thread=False가 안전합니다. 전역 연결 공유(0)는 동시 요청의 트랜잭션이 뒤섞이는 더 큰 문제를 만들고, 워커 수(3)는 프로세스 개수라 스레드풀과 무관합니다.`
    },
    {
      q: `아래 엔드포인트에 GET /search?title=x' OR '1'='1 요청이 들어온다.

@router.get("/search")
def search(title: str, conn: Conn):
    sql = f"SELECT * FROM memos WHERE title = '{title}'"
    return [dict(r) for r in conn.execute(sql).fetchall()]

무슨 일이 생기며 올바른 수정은?`,
      choices: [
        `조건이 항상 참이 되어 모든 메모가 반환된다. conn.execute("... WHERE title = ?", (title,))처럼 값을 바인딩한다`,
        `따옴표 때문에 항상 500이 난다. title.replace("'", "")로 따옴표를 지운다`,
        `FastAPI가 str 타입을 검증하므로 안전하다. 수정할 필요가 없다`,
        `모든 메모가 반환된다. HTTP 메서드를 GET에서 POST로 바꾸면 해결된다`
      ],
      answer: 0,
      why: `문자열을 이어 붙인 SQL은 WHERE title = 'x' OR '1'='1' 이 되어 전부 조회됩니다. 해결은 값을 ?로 바인딩해 SQL 문법과 분리하는 것입니다. 따옴표 제거(1)는 우회 방법이 많은 블랙리스트이고, 타입 검증(2)은 문자열 안의 SQL 조각을 막지 못하며, 메서드 변경(3)은 입력 주입과 무관합니다.`
    },
    {
      q: `POST /memos 에 아래 요청을 보냈더니 응답이 이렇게 왔다. create_memo 함수의 첫 줄에는 print("호출됨")이 있다.

요청 본문: {"title": ""}

HTTP/1.1 422 Unprocessable Content
{"detail":[{"type":"string_too_short","loc":["body","title"],"msg":"String should have at least 1 character","input":"","ctx":{"min_length":1}}]}

이 요청 뒤 서버 터미널에는 무엇이 보이는가?`,
      choices: [
        `"호출됨"이 한 번 출력되고, 함수 안에서 422를 만들어 돌려준다`,
        `아무것도 출력되지 않는다. 검증이 함수 호출 전에 실패했으므로 함수는 실행되지 않았다`,
        `"호출됨"이 출력된 뒤 예외 트레이스백이 이어진다`,
        `메모가 빈 제목으로 저장된 뒤 422가 반환된다`
      ],
      answer: 1,
      why: `FastAPI는 파라미터와 본문을 먼저 검증하고, 실패하면 함수를 호출하지 않고 422를 돌려줍니다. 그래서 print도 저장도 일어나지 않습니다. 함수 안에서 검증한다고 생각하는 것(0, 2)이 가장 흔한 오해입니다.`
    },
    {
      q: `모바일 팀이 "무한 스크롤에서 같은 메모가 두 번 보인다"고 보고했다. 서버 로그는 이렇다.

GET /memos?limit=5&offset=0  -> ids [11, 10, 9, 8, 7]
(그 사이 새 메모 1건 등록: id 12)
GET /memos?limit=5&offset=5  -> ids [7, 6, 5, 4, 3]

목록은 ORDER BY id DESC 이다. 원인과 가장 적절한 대응은?`,
      choices: [
        `응답이 캐시된 것이다. Cache-Control: no-store 헤더를 추가한다`,
        `DB에 중복 행이 있는 것이다. memos 테이블에 UNIQUE 제약을 건다`,
        `limit이 너무 작은 것이다. 기본값을 100으로 늘린다`,
        `최신순 맨 앞에 새 행이 끼어 offset 기준이 한 칸 밀린 것이다. 무한 스크롤에는 마지막으로 본 id보다 작은 것을 가져오는 키셋(커서) 방식을 쓴다`
      ],
      answer: 3,
      why: `offset은 "앞에서 몇 번째"라는 위치 기준이라 앞쪽에 행이 끼면 같은 행이 다시 나옵니다(삭제되면 빠집니다). 값(id)을 기준으로 하는 키셋은 이 문제가 없습니다. 캐시나 중복 행 문제(0, 1)라면 id가 겹치는 양상이 이렇게 규칙적이지 않습니다.`
    },
    {
      q: `프로젝트 루트에서 pytest를 실행하자 이렇게 실패한다. 프로젝트에는 db.py가 루트에 있고, tests 폴더에 __init__.py가 없으며, pytest.ini는 없다.

$ pytest
ImportError while loading conftest 'C:\\work\\memo-api\\tests\\conftest.py'.
tests\\conftest.py:4: in <module>
    import db
E   ModuleNotFoundError: No module named 'db'

가장 적절한 수정은?`,
      choices: [
        `프로젝트 루트에 pytest.ini를 만들고 pythonpath = . 를 지정한다`,
        `pip install db 로 db 패키지를 설치한다`,
        `db.py를 tests 폴더 안으로 옮긴다`,
        `conftest.py의 import 줄을 try/except로 감싸 오류를 무시한다`
      ],
      answer: 0,
      why: `기본 설정의 pytest는 테스트 파일이 있는 tests 폴더를 import 경로에 넣을 뿐 프로젝트 루트는 넣지 않습니다. pythonpath = . 로 루트를 경로에 추가하는 것이 정석입니다(python -m pytest도 현재 폴더를 경로에 넣어 가려 줍니다). pip의 db 패키지(1)는 전혀 다른 물건이고, 파일을 옮기면(2) 앱이 깨지며, 오류 무시(3)는 다음 줄에서 다시 터집니다.`
    },
    {
      q: `고객 메시지: "사내 지식 메모용 API입니다. 사용자는 약 20명, 서버는 1대, 하루 메모 쓰기는 많아야 수백 건입니다. 개발자 지인이 'SQLite는 장난감이니 처음부터 PostgreSQL로 하라'고 합니다."

견적을 내기 전에 당신이 취할 가장 합리적인 행동은?`,
      choices: [
        `지인 말이 맞으니 무조건 PostgreSQL 기준으로 견적한다`,
        `고객에게 묻지 않고 SQLite로 만들고 한계는 말하지 않는다`,
        `조건(단일 서버·낮은 쓰기량)이면 SQLite로 충분하다고 설명하고, 이전을 검토할 기준(서버 증설·쓰기 급증·백업 요건)과 백업·복구 방법을 견적과 문서에 명시한다`,
        `SQLite로 만들되 한계는 고객이 알아서 판단하도록 인수인계 문서에 적지 않는다`
      ],
      answer: 2,
      why: `기술 선택은 조건에 맞춰 근거와 함께 제안해야 합니다. SQLite는 단일 서버·낮은 동시 쓰기에서 운영 부담이 가장 작고, 이전 기준을 문서로 남기면 나중에 추가 수주로도 이어집니다. 무조건 PostgreSQL(0)은 불필요한 운영 비용이고, 한계를 숨기는 선택(1, 3)은 장애 때 신뢰를 잃습니다.`
    },
    {
      q: `아래 Dockerfile로 이미지를 만들어 사내 레지스트리에 올리려 한다. .dockerignore는 없고, 프로젝트 폴더에는 실제 키가 든 .env 와 실제 데이터가 든 memo.db 가 있다.

FROM python:3.13-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["fastapi", "run", "main.py", "--port", "8000"]

가장 큰 문제는?`,
      choices: [
        `이미지가 조금 커질 뿐 보안 문제는 없다`,
        `.env와 memo.db가 이미지 층에 그대로 들어가, 이미지를 받는 사람이 키와 데이터를 꺼낼 수 있다`,
        `COPY . . 때문에 pip install이 실패한다`,
        `CMD가 exec 형식이라 환경 변수를 읽지 못한다`
      ],
      answer: 1,
      why: `COPY . . 는 폴더의 모든 파일을 이미지에 넣습니다. 한 번 층에 들어간 비밀은 뒤에서 RUN rm으로 지워도 이전 층에 남습니다. .dockerignore로 .env·*.db를 빼고 비밀은 실행 시 환경 변수로 줘야 합니다. exec 형식 CMD(3)는 오히려 권장 방식이고 환경 변수는 정상적으로 읽힙니다.`
    },
    {
      q: `컨테이너를 교체했더니 메모가 모두 사라졌다. Dockerfile에는 MEMO_DB_PATH=/data/memo.db 가 있다.

$ docker run -d -p 8000:8000 -e MEMO_API_KEY=k-0123456789abcdef --name memo memo-api
(메모 3건 등록) GET /memos -> {"items":[...3건...],"total":3,"limit":20,"offset":0}
$ docker rm -f memo
$ docker run -d -p 8000:8000 -e MEMO_API_KEY=k-0123456789abcdef --name memo memo-api
GET /memos -> {"items":[],"total":0,"limit":20,"offset":0}

원인과 수정은?`,
      choices: [
        `SQLite가 재시작할 때 테이블을 비운다. init_db에서 DROP 문을 지운다`,
        `-p 옵션이 빠졌다. -p 8001:8000 으로 바꾼다`,
        `키가 달라졌다. 같은 키를 쓰도록 맞춘다`,
        `/data가 컨테이너의 임시 파일시스템이라 컨테이너와 함께 지워졌다. 이름 있는 볼륨을 붙여 실행한다(-v memo-data:/data)`
      ],
      answer: 3,
      why: `볼륨을 붙이지 않으면 /data도 컨테이너 파일시스템의 일부라서 컨테이너를 지울 때 함께 사라집니다. 로그를 보면 키와 포트는 두 번 모두 같고(1, 2), init_db는 CREATE TABLE IF NOT EXISTS라 데이터를 비우지 않습니다(0).`
    },
    {
      q: `API 키를 검사하는 코드다. 한글이 든 키를 헤더에 보낸 클라이언트가 있었고, 서버는 500을 돌려주며 로그에 아래 오류를 남겼다.

if key is None or not secrets.compare_digest(key, settings.api_key):
    raise HTTPException(401, "invalid or missing API key")

TypeError: comparing strings with non-ASCII characters is not supported

올바른 수정은?`,
      choices: [
        `== 로 비교한다`,
        `except TypeError: pass 로 오류를 무시한다`,
        `두 값을 .encode()로 bytes로 바꿔 compare_digest에 넘긴다. 잘못된 키는 401이 된다`,
        `헤더 값에 한글을 쓰지 말라고 클라이언트 개발자에게 요청하고 서버는 그대로 둔다`
      ],
      answer: 2,
      why: `compare_digest는 str을 받을 때 ASCII만 허용하므로 bytes로 바꿔 비교합니다. == (0)은 타이밍 공격에 약하고, 오류 무시(1)는 인증 판단이 불확실해지며, 클라이언트에게 떠넘기기(3)는 악의적인 요청이 서버를 500으로 만들 수 있다는 점을 놓칩니다.`
    },
    {
      q: `GET /memos HTTP/1.1
(X-API-Key 헤더 없음)

클라이언트 개발자: "키가 없거나 틀리면 403으로 주세요. 401은 로그인 화면이 뜨는 것 같아서요." 당신의 제안은?`,
      choices: [
        `키가 없거나 유효하지 않으면 401 + WWW-Authenticate 헤더가 표준 의미(RFC 9110)다. 401 처리 방식은 앱 쪽에서 고치고, 403은 키는 유효하지만 그 자원 권한이 없을 때 쓴다`,
        `403이 더 안전한 코드이므로 무조건 403으로 통일한다`,
        `401 대신 200을 주고 본문에 {"ok": false}를 담는다`,
        `모든 인증 실패를 404로 통일해 존재 자체를 숨긴다`
      ],
      answer: 0,
      why: `RFC 9110은 인증 정보가 없거나 유효하지 않은 요청에 401과 WWW-Authenticate를 요구하고, 403은 서버가 이해했지만 거부하는 경우에 씁니다. 앱의 화면 전환 로직은 클라이언트가 분기를 고칠 일입니다. 200 + 본문 오류(2)는 모니터링을 속이고, 404 통일(3)은 인증 실패와 자원 없음을 구분하지 못하게 합니다.`
    },
    {
      q: `500 응답을 검사하는 테스트가 assert까지 가지 못하고 이렇게 죽는다. 앱에는 Exception 핸들러가 있어 실제 서버라면 500 JSON을 돌려준다.

def test_unexpected_error(client):
    app.dependency_overrides[get_conn] = broken   # RuntimeError("boom")를 던진다
    res = client.get("/memos")
    assert res.status_code == 500

E   RuntimeError: boom
tests/test_memos.py:12: RuntimeError

이유와 수정은?`,
      choices: [
        `핸들러가 등록되지 않았다. 핸들러 데코레이터를 app 대신 router에 단다`,
        `pytest는 예외를 항상 실패로 처리한다. pytest.raises로 감싸서 res를 얻는다`,
        `dependency_overrides는 예외를 던질 수 없다. 라우트 함수 안에서 직접 raise한다`,
        `TestClient의 기본값(raise_server_exceptions=True)이 서버에서 난 예외를 테스트로 다시 던진다. TestClient(app, raise_server_exceptions=False)로 만들어 500 응답을 검사한다`
      ],
      answer: 3,
      why: `Starlette는 Exception 핸들러가 응답을 보낸 뒤에도 예외를 다시 올려 서버 로그에 남기게 하고, TestClient는 기본적으로 그 예외를 테스트로 전달합니다. 500 응답 자체를 검사하려면 raise_server_exceptions=False 클라이언트를 따로 씁니다. 핸들러 등록 문제(0)였다면 오히려 다른 모양의 응답이 왔을 것이고, pytest.raises(1)로는 res를 얻을 수 없습니다.`
    },
    {
      q: `운영 중 fastapi run main.py --workers 4 로 띄운 서비스에서 쓰기 요청이 몰리자 가끔 아래 오류와 함께 500이 난다.

sqlite3.OperationalError: database is locked

가장 적절한 진단과 대응은?`,
      choices: [
        `워커가 부족한 것이다. 워커를 8개로 늘린다`,
        `SQLite는 쓰기를 한 번에 한 연결만 할 수 있어 대기하다 시간을 넘긴 것이다. 트랜잭션을 짧게 유지하고(with conn:), 대기 시간과 WAL 모드를 검토하며, 쓰기량이 계속 늘면 PostgreSQL 이전을 제안한다`,
        `파일 권한 문제다. memo.db에 chmod 777을 준다`,
        `읽기 요청이 많아서다. 목록의 limit 상한을 낮추면 해결된다`
      ],
      answer: 1,
      why: `SQLite는 동시에 한 연결만 쓸 수 있고, 기다리는 연결은 기본 5초(파이썬 sqlite3의 timeout 기본값) 뒤 이 오류를 냅니다. 워커를 늘리면(0) 경합이 더 심해지고, 권한 문제(2)였다면 항상 실패하지 가끔 실패하지 않으며, limit(3)은 쓰기 잠금과 무관합니다.`
    }
  ],
  refs: [
    { title: `FastAPI: First Steps`, url: `https://fastapi.tiangolo.com/tutorial/first-steps/`, kind: `doc`, why: `데코레이터·path operation 용어, /docs·/redoc·/openapi.json 주소, fastapi dev 실행 방법. 레슨 1의 근거입니다.` },
    { title: `FastAPI: Handling Errors`, url: `https://fastapi.tiangolo.com/tutorial/handling-errors/`, kind: `doc`, why: `HTTPException의 headers, 기본 핸들러를 덮어쓰는 방법, Starlette의 HTTPException에 핸들러를 등록하라는 권고. 레슨 4에서 그대로 따릅니다.` },
    { title: `FastAPI: Dependencies with yield`, url: `https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/`, kind: `doc`, why: `yield 의존성의 종료 코드가 기본적으로 응답을 보낸 뒤 실행된다는 설명과 연결·세션 수명 패턴. 레슨 3의 get_conn 구조의 근거입니다.` },
    { title: `FastAPI: SQL (Relational) Databases`, url: `https://fastapi.tiangolo.com/tutorial/sql-databases/`, kind: `doc`, why: `check_same_thread=False가 필요한 이유(요청 하나가 여러 스레드를 쓸 수 있음), 요청당 세션 의존성, limit 상한 예시. 이 모듈은 SQLModel 대신 sqlite3를 쓰지만 구조는 같습니다.` },
    { title: `FastAPI: Testing`, url: `https://fastapi.tiangolo.com/tutorial/testing/`, kind: `doc`, why: `TestClient 사용법과 def 테스트 함수, 파일 배치. 레슨 6의 기본 형태입니다.` },
    { title: `FastAPI: Settings and Environment Variables`, url: `https://fastapi.tiangolo.com/advanced/settings/`, kind: `doc`, why: `pydantic-settings의 BaseSettings, .env, lru_cache로 만든 get_settings, dependency_overrides로 테스트에서 설정 교체. 레슨 7의 설정 구조입니다.` },
    { title: `FastAPI in Containers - Docker`, url: `https://fastapi.tiangolo.com/deployment/docker/`, kind: `doc`, why: `Dockerfile 예시, 의존성 먼저 COPY하는 캐시 순서, exec 형식 CMD가 필요한 이유, 컨테이너 하나에 프로세스 하나 원칙. 레슨 8의 근거입니다.` },
    { title: `Python docs: sqlite3`, url: `https://docs.python.org/3/library/sqlite3.html`, kind: `doc`, why: `placeholder 사용 권고(인젝션), check_same_thread·timeout 기본값, with conn 트랜잭션 동작, rowcount·lastrowid, sqlite3.Row를 확인합니다.` },
    { title: `SQLite: AUTOINCREMENT`, url: `https://www.sqlite.org/autoinc.html`, kind: `doc`, why: `AUTOINCREMENT 유무에 따른 rowid 재사용 차이와 오버헤드 권고. 삭제된 id를 다시 쓰지 않으려는 선택의 근거입니다.` },
    { title: `SQLite: Expressions (LIKE operator)`, url: `https://www.sqlite.org/lang_expr.html`, kind: `doc`, why: `LIKE의 % · _ 와일드카드, ESCAPE 절, 기본적으로 ASCII만 대소문자를 무시한다는 설명. 레슨 5 검색 구현의 근거입니다.` },
    { title: `RFC 9110: HTTP Semantics`, url: `https://www.rfc-editor.org/rfc/rfc9110.html`, kind: `rfc`, why: `401(WWW-Authenticate 필수)·403·404·409·422·204의 정의. 상태 코드를 고르는 분쟁이 생겼을 때 돌아올 기준 문서입니다.` },
    { title: `OWASP API Security Top 10 2023: API2 Broken Authentication`, url: `https://api-security.owasp.org/editions/2023/en/0xa2-broken-authentication/`, kind: `standard`, why: `API 키는 사용자 인증 수단이 아니라 클라이언트 식별에 쓰라는 지침과 인증 방어 항목. 레슨 7의 적용 범위를 정할 때 읽습니다.` },
    { title: `Docker: Building best practices`, url: `https://docs.docker.com/build/building/best-practices/`, kind: `doc`, why: `.dockerignore, 비루트 USER, 태그와 다이제스트 고정, exec 형식 CMD 권고. 납품 이미지 점검표로 씁니다.` },
    { title: `pytest: pytest import mechanisms and sys.path/PYTHONPATH`, url: `https://docs.pytest.org/en/stable/explanation/pythonpath.html`, kind: `doc`, why: `prepend import 모드에서 sys.path에 들어가는 폴더와 pytest·python -m pytest의 차이. 레슨 6의 ModuleNotFoundError를 이해하는 데 필요합니다.` }
  ],
  gigs: [
    `**누가 무엇을 의뢰하나.** 이 유형은 "사내 도구용 데이터 API", "앱·웹이 부를 작은 백엔드", "엑셀·구글시트로 관리하던 데이터를 API로"가 가장 흔합니다. 의뢰서에는 보통 "CRUD 되는 API 하나, 인증은 간단히, 서버에 올려서"만 적혀 있어 범위가 모호합니다. 견적 전에 확인할 것: 사용자 수와 동시 접속, 하루 쓰기량, 데이터에 개인정보가 있는지, 호스팅 위치(고객 서버·클라우드·사내망), 인증 방식(API 키로 충분한지 사용자 로그인이 필요한지), 이미 정해진 클라이언트(앱·웹)와 일정.`,
    `**SQLite로 갈지 PostgreSQL로 갈지는 근거와 함께 제안합니다.** 단일 서버·낮은 동시 쓰기·소규모 데이터라면 SQLite가 운영 부담이 가장 작습니다. 서버 2대 이상, 쓰기 급증, 엄격한 백업·복구 요건이 나오면 이전 신호입니다. 기준 수치를 단정하지 말고 고객 환경에서 간단한 부하 시험으로 확인하며, 이전 기준과 이전 작업의 비용을 제안서에 적어 두면 나중의 추가 수주로 이어집니다.`,
    `**견적은 항목으로 쪼갭니다.** 요구사항 정리, 엔드포인트(개수 × 복잡도), 검증·오류 계약, 인증·설정, 테스트, Docker·배포 문서, 인수인계, 버퍼. 이 모듈 규모의 메모 API는 숙련자라면 며칠, 처음이라면 그 2~3배로 잡는 식으로 본인의 작업 기록으로 보정하세요(경험칙이며 시장 단가가 아닙니다). 테스트·문서·인수인계를 "있으면 좋은 것"으로 빼면 싸 보이지만 유지보수에서 되돌려 받습니다. 고정가라면 포함·제외 항목(HTTPS 인증서, 서버 운영, 사용자 로그인, 데이터 이전)을 문서로 못 박고 요구 변경은 변경 요청서로 따로 견적을 냅니다.`,
    `**납품물은 코드가 아니라 묶음입니다.** 소스, 버전이 고정된 requirements.txt, .env.example(비밀 값 제외), Dockerfile과 실행 명령, README(실행·테스트·키 교체·백업과 복구), 내보낸 openapi.json, 테스트 통과 기록, 알려진 한계 목록(SQLite 한계, 문서 공개 정책 등). API 키 같은 비밀 값은 이메일·메신저 본문이 아니라 고객이 정한 비밀 전달 수단으로 건넵니다.`,
    `**자주 터지는 함정.** (1) 범위 크리프: "로그인도 되죠?"는 변경 요청서로 분리합니다. (2) 문서와 실제 응답이 다르면 /docs를 믿고 개발한 클라이언트 개발자가 가장 먼저 항의합니다. (3) 인터넷이 막힌 고객 내부망에서 /docs가 빈 화면이 됩니다(외부 CDN 의존) → openapi.json이나 정적 문서를 같이 납품합니다. (4) 스키마를 바꿀 때 기존 데이터 마이그레이션을 빠뜨립니다. (5) 고객 서버의 Python·Docker 버전, 방화벽, 프록시를 몰라 납품일에 막힙니다 → 환경 확인을 일정에 넣습니다. (6) 로그에 메모 본문이나 API 키가 남습니다.`,
    `**개인정보와 책임.** 메모 서비스는 사용자가 무엇을 적을지 통제할 수 없어 개인정보나 비밀이 들어올 수 있습니다. 보관 기간, 삭제 요청 처리, 백업 파일의 접근 권한, 로그에 본문을 남기지 않는 원칙을 고객과 정하고, 데이터 관리 책임이 고객에게 있다는 점을 계약서에 적습니다. 구체 조항은 법률·계약 모듈과 전문가 검토를 따르세요.`,
    `**이어서 팔 수 있는 것.** 유지보수 계약(의존성 업데이트, 보안 패치, 백업·복구 점검. FastAPI는 아직 0.x라 올릴 때마다 릴리스 노트를 읽어야 합니다: 2026-11 기준 0.162.5), 사용자 로그인(JWT·OAuth), PostgreSQL 이전, 전문 검색(FTS5), 관리자 화면, CI·자동 배포, 모니터링·알림. 이 모듈에서 만든 오류 계약·테스트·문서가 있으면 이런 확장 견적이 쉬워집니다.`
  ]
};
