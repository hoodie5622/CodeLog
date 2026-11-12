(window.PRO_MODULES = window.PRO_MODULES || {})["pj-fullstack"] = {
  id: "pj-fullstack",
  summary: `할 일 앱 프런트를 FastAPI·SQLite API와 로그인 토큰으로 연결하고, 오류 처리와 Docker 배포·도메인·HTTPS·백업·인수인계 문서까지 갖춘 풀스택 서비스를 혼자 납품할 수 있다.`,
  hours: 32,
  goals: [
    `프런트·API·DB 세 층의 책임과 요청 한 건의 데이터 흐름을 설명하고, 경로·JSON·상태 코드·오류 모양을 담은 API 계약을 코드보다 먼저 적어 구현의 기준으로 삼을 수 있다`,
    `FastAPI와 SQLite로 소유자 범위가 걸린 할 일 CRUD API를 만들고 외래 키 활성화·WAL·요청별 연결 같은 SQLite 운영 설정을 이유와 함께 적용할 수 있다`,
    `same-origin 규칙과 preflight 요청의 동작을 설명하고, CORSMiddleware와 환경 변수로 개발·운영 설정을 분리하며, CORS 오류와 서버 오류를 구분해 진단할 수 있다`,
    `fetch 기반 api() 계층으로 프런트를 서버에 연결하고, 데모 서버로 화면을 먼저 만든 뒤 API_BASE 한 줄로 진짜 서버로 전환할 수 있다`,
    `솔트와 PBKDF2로 비밀번호를 저장하고 해시로 저장되는 만료형 불투명 토큰으로 로그인·로그아웃·401 처리를 구현하며, 토큰 보관 위치의 보안 트레이드오프를 설명할 수 있다`,
    `네트워크·4xx·5xx·401 오류별 처리 방침을 정하고, 타임아웃·지수 백오프·멱등성에 근거해 읽기 요청만 자동 재시도하며 중복 생성이 없는 재시도 화면을 만들 수 있다`,
    `PaaS와 VPS를 데이터 보관 방식·비용·운영 부담으로 비교해 고르고, Dockerfile·볼륨·환경 변수로 배포한 뒤 도메인과 HTTPS(Caddy)를 연결할 수 있다`,
    `SQLite 온라인 백업과 복구 리허설을 수행하고, 인수인계 문서와 납품 체크리스트로 클라이언트가 혼자 운영할 수 있는 상태로 납품할 수 있다`
  ],
  lessons: [
    {
      title: `전체 구조 설계와 데이터 흐름: 신뢰 경계·계약·DB 계층`,
      body: `지금까지 만든 두 프로그램은 서로를 모릅니다. 할 일 앱은 목록을 브라우저의 localStorage에 저장하고, 메모 서비스는 DB가 있지만 화면이 없습니다. 둘을 잇는 일에서 가장 큰 변화는 **데이터의 주인이 바뀐다**는 점입니다. 연결 전에는 '이 브라우저의 목록'이 진실이었고, 연결 후에는 서버의 DB가 진실이며 브라우저는 그것을 보여 주는 창입니다. 이 한 문장이 검증·권한·오류·백업 설계를 정합니다.

### 세 개의 층과 신뢰 경계

| 층 | 맡는 일 | 믿어도 되는 범위 |
| 프런트(브라우저) | 화면, 입력 편의 검사, 요청 보내기 | 아무것도 믿지 않는다 |
| API 서버(FastAPI) | 검증, 인증·권한, 규칙, 응답 만들기 | 자기 코드와 DB 값 |
| DB(SQLite) | 영속 저장, 제약 조건 | 제약 조건이 마지막 방어선 |

핵심은 **신뢰 경계**입니다. 프런트의 ‹maxlength›나 ‹required›는 사용자 편의일 뿐이라 curl로 요청을 직접 보내면 우회됩니다. 그래서 서버가 같은 규칙을 다시 검사하고(레슨 2) 권한 판단도 서버에서만 합니다(레슨 5).

### 클릭 한 번의 데이터 흐름

1. 제출하면 프런트가 ‹fetch›로 POST /api/todos를 보낸다
2. 오리진이 다르면 브라우저가 먼저 OPTIONS 요청으로 허용 여부를 묻는다 (레슨 3)
3. uvicorn이 HTTP를 읽어 FastAPI에 넘기고 라우팅·의존성·Pydantic 검증이 차례로 실행된다
4. SQL INSERT가 실행·커밋되고 서버가 201과 JSON을 돌려준다
5. 프런트가 목록을 다시 받아 render한다

같은 컴퓨터의 SQLite 쿼리는 대개 1ms 안팎이지만 해외 리전 서버는 왕복만 100ms를 넘기기도 하니(직접 재 보세요), 레슨 7에서 로딩·오류 화면을 만듭니다.

### 계약부터 적는다

양쪽을 따로 만들 때 가장 흔한 사고는 서로 다른 모양을 상상하는 것입니다(서버는 ‹title›, 프런트는 ‹text›). 코드 전에 아래 표를 적으면 서버·프런트·데모 서버가 같은 기준을 따릅니다. 오류 본문은 FastAPI 기본 ‹{"detail": ...}›입니다.

| 메서드와 경로 | 로그인 | 요청 | 성공 | 실패 |
| POST /api/auth/register | 불필요 | email, password | 201 | 409, 422 |
| POST /api/auth/login | 불필요 | email, password | 200 access_token | 401, 422 |
| POST /api/auth/logout | 필요 | 없음 | 204 | 401 |
| GET /api/todos | 필요 | 없음 | 200 목록 | 401 |
| POST /api/todos | 필요 | text | 201 항목 | 401, 422 |
| PATCH /api/todos/{id} | 필요 | text 또는 done | 200 항목 | 401, 404, 422 |
| DELETE /api/todos/{id} | 필요 | 없음 | 204 | 401, 404 |

### DB 설계에서 지금 정할 것

테이블은 users, sessions, todos 세 개입니다. 로그인은 레슨 5에 나오지만 ‹todos.user_id›는 지금 만듭니다. 소유자 컬럼은 나중에 붙이면 쌓인 행의 주인부터 정해야 하지만 지금은 공짜입니다. SQLite에서는 세 가지를 코드로 챙깁니다.

- ‹PRAGMA foreign_keys = ON›은 **연결마다** 실행합니다. 기본값이 꺼짐이라 빼먹으면 ‹ON DELETE CASCADE›가 조용히 무시됩니다.
- ‹PRAGMA journal_mode = WAL›은 읽기와 쓰기가 서로 막지 않게 합니다. 대신 ‹-wal›·‹-shm› 파일이 함께 생겨 백업 방법이 달라집니다(레슨 9).
- 연결은 요청마다 만들고 닫습니다. 일반 ‹def› 경로는 스레드풀에서 돌아 연결을 만든 스레드와 쓰는 스레드가 다를 수 있어 ‹check_same_thread=False›를 줍니다(한 연결을 한 요청만 쓰니 안전).

운영에서는 FastAPI가 화면도 내보내 같은 오리진이 되고(레슨 8), 개발 중에는 포트가 달라 CORS가 필요합니다(레슨 3). 이 차이를 환경 변수로 흡수합니다.

### 이번 단계의 확인

폴더 ‹todo-fullstack/backend›와 ‹todo-fullstack/frontend›를 만들고 backend에서 가상환경을 켠 뒤 ‹pip install fastapi uvicorn›을 실행합니다. 아래 ‹db.py›를 저장한 뒤 backend 폴더의 대화형 ‹python›에서 ‹import db; db.init_db(); con = db.connect()›를 실행합니다. ‹[r["name"] for r in con.execute("select name from sqlite_master where type='table' order by name")]›은 ‹['sessions', 'sqlite_sequence', 'todos', 'users']›를, ‹con.execute("pragma journal_mode").fetchone()[0]›은 ‹'wal'›을 돌려주고 폴더에 ‹todo.db›가 생겨야 합니다.`,
      code: `import sqlite3

DB_PATH = "todo.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  email   TEXT NOT NULL UNIQUE,
  pw_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS todos (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  text    TEXT NOT NULL,
  done    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);
"""


def connect():
    con = sqlite3.connect(DB_PATH, timeout=5, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def init_db():
    con = connect()
    con.execute("PRAGMA journal_mode = WAL")
    con.executescript(SCHEMA)
    con.close()


def get_db():
    con = connect()
    try:
        yield con
    finally:
        con.close()`,
      codeLang: `python`,
      key: [
        `데이터의 주인이 localStorage에서 서버 DB로 옮겨 간다. 브라우저는 서버의 진실을 보여 주는 창이고, 브라우저에서 온 값은 서버가 다시 검증한다`,
        `코드 전에 계약(경로·JSON 필드·상태 코드·오류 모양)을 표로 적는다. 서버·프런트·데모 서버가 같은 표를 따른다`,
        `소유자 컬럼(todos.user_id)은 처음부터 설계에 넣는다. 나중에 붙이면 마이그레이션과 고아 데이터가 따라온다`,
        `SQLite는 foreign_keys를 연결마다 켜고, WAL을 쓰며, 요청마다 연결을 열고 닫는다. 스레드풀 때문에 check_same_thread=False가 필요하다`,
        `운영은 같은 오리진(FastAPI가 화면도 제공), 개발은 두 오리진(CORS 필요). 차이는 환경 변수로 흡수한다`
      ],
      pitfalls: [
        `입력 검사를 프런트에서만 하고 서버를 믿는 설계. curl 한 줄이면 우회되고, 그 순간 DB에 검증 안 된 값이 들어간다`,
        `외래 키 PRAGMA를 켜지 않고 ON DELETE CASCADE를 믿는 것. 에러도 없이 무시되어 지운 사용자의 데이터가 남는다`,
        `check_same_thread 기본값 때문에 'SQLite objects created in a thread can only be used in that same thread' 오류를 만나고, 해결한다며 전역 연결 하나를 모든 요청이 공유하게 만드는 것`,
        `DB 파일 경로를 상대 경로로 두고 실행 위치를 바꿔 빈 DB가 새로 생기는 것. '데이터가 사라졌다'는 문의의 흔한 원인이다`
      ]
    },
    {
      title: `API 뼈대: 계약대로 만드는 할 일 CRUD`,
      body: `이번 단계는 레슨 1의 계약표를 코드로 옮기는 일입니다. 메모 서비스에서 해 본 CRUD와 모양이 같으니 여기서는 **설계 결정**을 읽어 주세요. 같은 코드가 어디서 실무 사고를 막는지가 핵심입니다.

### 결정 1: 모든 쿼리에 소유자 조건을 넣고, 그 자리를 함수 하나로 비워 둔다

로그인은 아직 없지만 모든 SQL에 ‹user_id IS ?›가 들어 있고, 값은 ‹current_user_id()›가 줍니다. 지금은 ‹None›을 돌려주는 가짜입니다. 레슨 5에서 이 함수만 진짜로 바꾸면 모든 경로가 인증·소유자 검사를 얻습니다. 경로 함수를 하나도 고치지 않으므로, 인증을 붙이다 어느 경로 하나를 빼먹는 사고(실무에서 가장 흔한 권한 버그)를 구조로 막습니다. 인증 지점을 한 곳에 모으는 것이 설계의 요점입니다.

여기서 ‹=› 대신 ‹IS›를 쓰는 이유는 SQL의 NULL 규칙입니다. ‹user_id = NULL›은 NULL을 포함해 어떤 행에도 참이 되지 않습니다. ‹IS›는 NULL끼리도 같다고 봐서, 로그인 전(None)에도 로그인 후(정수)에도 같은 쿼리가 동작합니다.

### 결정 2: 남의 항목은 403이 아니라 404

‹find_todo›는 ‹id›와 ‹user_id›를 함께 조건으로 조회하고 없으면 404를 냅니다. 다른 사람의 항목 번호를 찍어 보는 공격자는 '존재하지만 접근 금지'와 '존재하지 않음'을 구분할 수 없습니다. 존재 여부 자체를 숨기는 것입니다.

### 결정 3: 응답은 response_model로 모양을 고정한다

‹response_model=Todo›는 응답을 ‹id, text, done›으로 걸러냅니다. DB 행에는 ‹user_id›가 있지만 나가지 않습니다. 나중에 ‹pw_hash› 같은 내부 컬럼이 행에 섞여도 응답에는 새지 않습니다. 같은 모델이 ‹/docs›에도 계약으로 나타나므로 프런트 개발자와 대화할 때 문서 역할도 합니다.

### 상태 코드와 검증

- 생성은 201, 삭제는 **204(본문 없음)**입니다. 프런트가 204 응답에 ‹res.json()›을 부르면 빈 본문 때문에 오류가 나므로 레슨 4에서 처리합니다.
- ‹ConfigDict(str_strip_whitespace=True)›는 앞뒤 공백을 지운 뒤 길이를 검사합니다. 공백만 있는 입력은 ‹min_length=1›에서 걸려 422가 됩니다.
- PATCH는 보낸 필드만 바꿉니다. 필드가 ‹None›이면 '안 보냄'으로 해석하므로 ‹null›로 값을 지우는 기능은 이 모델에 없습니다(실습 1에서 다룹니다).
- 쓰기는 ‹with db:›로 감쌉니다. 성공하면 커밋, 예외가 나면 롤백합니다. ‹with›만으로는 연결이 닫히지 않으므로 닫는 일은 ‹get_db›의 ‹finally›가 맡습니다.
- 생성·수정 뒤에 다시 조회해서 돌려줍니다. ‹lastrowid›로 방금 만든 행을 읽으면 DB가 채운 값(기본값 등)까지 응답에 들어갑니다.

### 이번 단계의 확인

backend 폴더에서 ‹uvicorn main:app --reload›를 실행하면 콘솔에 ‹Uvicorn running on http://127.0.0.1:8000›이 보입니다. 브라우저로 ‹http://127.0.0.1:8000/docs›를 열면 health 하나와 todos 네 개, 모두 5개 경로가 보여야 합니다(계약표의 로그인 세 개는 레슨 5에서 생깁니다). PowerShell에서 ‹Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/todos -ContentType 'application/json' -Body '{"text":"buy milk"}'›를 실행하면 ‹id 1, text buy milk, done False›가 나오고, 같은 명령에서 본문을 ‹{"text":"   "}›로 바꾸면 ‹(422)› 오류가 나야 합니다. 없는 번호를 지우면 ‹(404)›입니다. 폴더에 ‹todo.db›가 있고 서버를 껐다 켜도 목록이 남아 있으면 성공입니다.`,
      code: `from fastapi import Depends, FastAPI, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field

from db import get_db, init_db

app = FastAPI(title="Todo API")
init_db()


def current_user_id():
    return None  # 레슨 5에서 로그인한 사용자의 id를 돌려주는 함수로 바꾼다


class Todo(BaseModel):
    id: int
    text: str
    done: bool


class TodoIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    text: str = Field(min_length=1, max_length=200)


class TodoPatch(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    text: str | None = Field(default=None, min_length=1, max_length=200)
    done: bool | None = None


def find_todo(db, todo_id, uid):
    row = db.execute("SELECT * FROM todos WHERE id = ? AND user_id IS ?", (todo_id, uid)).fetchone()
    if row is None:
        raise HTTPException(404, "할 일을 찾을 수 없습니다")
    return dict(row)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/todos", response_model=list[Todo])
def list_todos(db=Depends(get_db), uid=Depends(current_user_id)):
    return [dict(r) for r in db.execute("SELECT * FROM todos WHERE user_id IS ? ORDER BY id", (uid,))]


@app.post("/api/todos", status_code=201, response_model=Todo)
def create_todo(body: TodoIn, db=Depends(get_db), uid=Depends(current_user_id)):
    with db:
        cur = db.execute("INSERT INTO todos (user_id, text) VALUES (?, ?)", (uid, body.text))
    return find_todo(db, cur.lastrowid, uid)


@app.patch("/api/todos/{todo_id}", response_model=Todo)
def update_todo(todo_id: int, body: TodoPatch, db=Depends(get_db), uid=Depends(current_user_id)):
    old = find_todo(db, todo_id, uid)
    text = old["text"] if body.text is None else body.text
    done = old["done"] if body.done is None else int(body.done)
    with db:
        db.execute("UPDATE todos SET text = ?, done = ? WHERE id = ?", (text, done, todo_id))
    return find_todo(db, todo_id, uid)


@app.delete("/api/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int, db=Depends(get_db), uid=Depends(current_user_id)):
    find_todo(db, todo_id, uid)
    with db:
        db.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
    return Response(status_code=204)`,
      codeLang: `python`,
      key: [
        `인증 지점을 current_user_id() 한 함수로 모으고 모든 SQL에 소유자 조건을 넣는다. 나중에 함수만 바꾸면 모든 경로가 보호된다`,
        `SQL에서 = NULL은 항상 거짓이고 IS는 NULL을 비교한다. 로그인 전후를 같은 쿼리로 다루려고 IS를 쓴다`,
        `남의 항목은 403이 아니라 404로 응답해 존재 여부를 숨긴다`,
        `response_model은 응답에 나갈 필드를 고정한다. 내부 컬럼(user_id, pw_hash)이 새는 것을 막고 /docs 계약도 된다`,
        `생성 201, 삭제 204(본문 없음), 검증 실패 422. 쓰기는 with db:로 커밋·롤백을 묶는다`
      ],
      pitfalls: [
        `경로마다 소유자 조건을 직접 쓰다가 하나를 빼먹는 것. 서버 로그에는 오류가 없고 사용자가 남의 데이터를 보는 순간에야 드러난다`,
        `행을 그대로 반환해 내부 컬럼이 JSON에 섞여 나가는 것. 응답 모델이 없으면 컬럼을 추가할 때마다 노출 범위가 조용히 넓어진다`,
        `with db: 없이 INSERT만 하고 커밋을 잊는 것. 요청은 201인데 연결이 닫히면서 데이터가 사라진다`,
        `backend가 아닌 폴더에서 uvicorn을 실행해 ModuleNotFoundError: No module named 'db'를 만나는 것. 실행 위치가 import 경로를 정한다`
      ]
    },
    {
      title: `CORS와 환경 변수: 개발과 운영의 설정 분리`,
      body: `프런트를 API에 붙이는 첫 순간 거의 모든 초보자가 같은 빨간 오류를 만납니다. 원인을 모르면 ‹allow_origins=["*"]›를 검색해 붙여 넣고 넘어가는데, 그게 왜 위험한지 알아야 의뢰인의 보안 질문에 답할 수 있습니다.

### 브라우저의 규칙: 오리진이 같아야 읽을 수 있다

오리진은 **프로토콜 + 도메인 + 포트**입니다. ‹http://localhost›와 ‹http://localhost:8080›은 다른 오리진이고, ‹localhost›와 ‹127.0.0.1›도 다릅니다. 스크립트가 다른 오리진으로 ‹fetch›하면 서버가 허용 헤더를 붙여 주지 않는 한 브라우저가 **응답을 읽지 못하게** 막습니다. 막는 주체는 서버가 아니라 브라우저입니다. 그래서 curl이나 서버끼리의 호출에는 CORS가 없습니다.

중요한 사실 하나. 단순 요청(예: 헤더 없는 GET)은 서버로 **실제로 전달되어 실행**됩니다. 브라우저는 돌아온 응답만 숨깁니다. 콘솔에 CORS 오류가 떠도 단순 요청 형태의 POST(폼 전송 등)는 이미 DB에 들어갔을 수 있다는 뜻입니다. CORS는 서버를 지키는 장치가 아니라 사용자의 브라우저가 남의 사이트에 이용당하지 않게 하는 장치이고, 서버 권한 검사는 별개입니다.

### preflight: 실제 요청 전에 묻는다

GET·HEAD·POST이고 헤더가 안전 목록(Accept 등)이며 Content-Type이 form·text 계열이면 단순 요청입니다. 그 밖에, 즉 PATCH·DELETE, ‹Content-Type: application/json›, ‹Authorization› 헤더가 하나라도 있으면 브라우저는 먼저 OPTIONS 요청을 보냅니다.

1. 브라우저가 ‹OPTIONS /api/todos›를 ‹Origin›, ‹Access-Control-Request-Method›, ‹Access-Control-Request-Headers›와 함께 보낸다
2. 서버가 허용 오리진·메서드·헤더를 응답 헤더로 알려 준다 (Starlette는 허용되면 200, 아니면 400)
3. 허용되면 비로소 실제 요청을 보낸다. 거절되면 **실제 요청은 나가지 않는다**

‹Authorization› 헤더는 와일드카드(*)로 허용되지 않아 명시해야 한다고 MDN이 설명합니다. 그래서 설정에서 메서드와 헤더를 ‹["Authorization", "Content-Type"]›처럼 적습니다. 허용 결과는 브라우저가 캐시하며(Starlette의 ‹max_age› 기본값 600초), 로그인을 붙이면 GET에도 preflight가 생기므로 이 캐시가 체감 속도를 지켜 줍니다.

### 설정은 코드 밖으로: 환경 변수

허용 오리진은 개발(‹http://127.0.0.1:5500›)과 운영(없음, 같은 오리진)이 다릅니다. 값이 배포마다 다르면 코드에 쓰지 않고 환경 변수로 받습니다. The Twelve-Factor App의 기준은 '비밀을 노출하지 않고 코드를 공개할 수 있는가'입니다. 이 모듈은 ‹settings.py›에서 한 번만 읽고 다른 파일은 ‹settings›만 import합니다.

- 개발 편의로 ‹.env›를 읽지만 **이미 있는 실제 환경 변수는 덮어쓰지 않습니다**(‹setdefault›). 운영의 실제 값이 파일보다 우선해야 사고가 없습니다.
- 환경 변수는 전부 문자열이라 ‹int(...)›나 쉼표 분리를 직접 해야 합니다. 형식이 틀리면 서버가 뜰 때 바로 죽게 해서(빠른 실패) 운영에서 뒤늦게 발견되지 않게 합니다.
- ‹.env›는 Git과 Docker 이미지에 넣지 않습니다. 대신 값만 비운 ‹.env.example›을 저장소에 둡니다.
- 설정은 import 시점에 한 번 읽으므로 ‹.env›를 고치면 서버를 **다시 시작**해야 합니다. ‹--reload›는 ‹.py› 파일 변경만 봅니다.

### 이번 단계의 확인

코드를 반영하고 서버를 켠 뒤, 프로젝트 폴더에서 ‹python -m http.server 5500 --directory frontend --bind 127.0.0.1›로 화면용 서버를 엽니다. ‹http://127.0.0.1:5500›을 열고 개발자 도구 콘솔에서 ‹fetch("http://127.0.0.1:8000/api/health")›를 실행하면 ‹blocked by CORS policy› 계열 오류가 나야 합니다(문구는 브라우저마다 조금 다릅니다). 그런데 uvicorn 콘솔에는 ‹GET /api/health 200›이 찍혀 있어야 합니다. 요청은 도착했고 브라우저가 응답만 숨긴 것입니다. backend 폴더에 ‹.env› 파일을 만들어 ‹CORS_ORIGINS=http://127.0.0.1:5500›을 적고 서버를 재시작한 뒤 같은 명령을 다시 실행하면 이번에는 응답을 읽을 수 있습니다. 주소창을 ‹http://localhost:5500›으로 바꾸면 다시 막혀야 합니다. 이것이 오리진 문자열의 정확한 일치입니다.`,
      code: `# ===== backend/settings.py (새 파일) =====
import os


def load_dotenv(path=".env"):
    """개발 편의용: .env의 KEY=VALUE를 읽되, 이미 있는 실제 환경 변수는 덮어쓰지 않는다."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip("\\"'"))


load_dotenv()

DB_PATH = os.getenv("DB_PATH", "todo.db")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
TOKEN_TTL_HOURS = int(os.getenv("TOKEN_TTL_HOURS", "12"))
FRONTEND_DIR = os.getenv("FRONTEND_DIR", "")


# ===== backend/db.py : 맨 위의 DB_PATH = "todo.db" 한 줄을 아래 줄로 바꾼다 =====
from settings import DB_PATH


# ===== backend/main.py : 앞의 import 두 줄은 맨 위 import 모음에, app.add_middleware(...) 블록은 app = FastAPI(...) 줄 바로 아래에 넣는다 =====
from fastapi.middleware.cors import CORSMiddleware
from settings import CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)`,
      codeLang: `python`,
      key: [
        `오리진 = 프로토콜 + 도메인 + 포트. localhost와 127.0.0.1은 서로 다른 오리진이다`,
        `CORS는 브라우저가 응답 읽기를 막는 장치다. 단순 요청은 서버에서 이미 실행되므로 권한 검사를 CORS에 맡기지 않는다`,
        `PATCH·DELETE·JSON·Authorization이 있으면 OPTIONS preflight가 먼저 나가고, 거절되면 실제 요청은 나가지 않는다. Authorization은 명시해야 한다`,
        `배포마다 다른 값은 환경 변수로. 실제 환경 변수가 .env보다 우선하고, .env는 저장소·이미지에 넣지 않으며, 고치면 재시작한다`,
        `운영을 같은 오리진으로 배포하면 CORS 설정 자체가 필요 없다. 빈 목록은 어떤 외부 오리진도 허용하지 않는 안전한 기본값이다`
      ],
      pitfalls: [
        `allow_origins=["*"]를 습관처럼 붙이는 것. 보안 점검에서 첫 지적 사항이 되고, 쿠키나 인증 정보와 함께 쓰려 하면 브라우저가 어차피 거부한다`,
        `콘솔의 CORS 오류를 서버 문제와 구분하지 못하는 것. 처리되지 않은 예외로 500이 나면 응답에 CORS 헤더가 빠져 같은 오류처럼 보이므로 서버 로그와 Network 탭의 상태 코드를 먼저 본다`,
        `.env를 수정하고 --reload가 알아서 반영하리라 기대하는 것. 설정은 import 시점에 한 번만 읽는다`,
        `.env를 Git에 커밋하거나 Docker 이미지에 복사하는 것. 한번 올라간 비밀은 지워도 이력에 남으므로 키를 새로 발급해야 한다`
      ]
    },
    {
      title: `할 일 앱 프런트를 API에 연결하기`,
      body: `할 일 앱에서 배운 '상태가 바뀌면 화면을 다시 그린다'는 구조는 그대로 씁니다. 바뀌는 것은 **쓰기 경로**입니다. localStorage 버전은 상태를 고치고 저장했습니다. 이제는 서버에 부탁하고, 성공하면 서버의 목록을 다시 받아 그립니다. 화면의 상태는 서버 진실의 복사본일 뿐입니다. 이 방식을 비관적 갱신이라 부릅니다. 서버 응답을 기다린 뒤에만 화면을 바꾸므로 조금 느려 보이지만 틀릴 일이 없고, 실패했을 때 되돌릴 것도 없습니다. 먼저 이것으로 시작하고 체감 속도가 문제일 때만 낙관적 갱신(먼저 그리고 나중에 확인)을 검토합니다.

### fetch가 알려 주지 않는 것

- ‹fetch›는 **네트워크 오류 같은 실패에서만 reject**합니다. 404나 500은 정상 응답으로 resolve되므로 ‹res.ok›를 직접 확인해야 합니다(MDN). 확인을 빼먹으면 서버가 실패했는데 화면은 성공한 척합니다.
- 삭제 같은 204 응답은 **본문이 없습니다**. ‹res.json()›을 부르면 ‹Unexpected end of JSON input› 오류가 납니다.
- 서버 오류 본문의 ‹detail›은 문자열(직접 낸 오류)일 수도, 배열(422 검증 오류)일 수도 있습니다. 배열을 그대로 문자열로 만들면 화면에 의미 없는 객체 표기가 찍히므로 모양을 구분합니다.
- ‹Content-Type: application/json›은 본문이 있을 때만 붙입니다. 본문 없는 GET은 헤더가 없어 단순 요청이 되고, POST·PATCH·DELETE는 preflight를 탑니다. Network 탭에서 직접 확인할 수 있는 차이입니다.

### 모든 통신은 api() 한 곳으로

URL 조립, 헤더, 오류 정리를 ‹api()› 한 함수에 모았습니다. 화면 코드는 ‹fetch›를 직접 부르지 않습니다. 레슨 6에서 토큰을, 레슨 7에서 타임아웃과 재시도를 붙일 때 이 함수만 고치면 되기 때문입니다. 통신 코드가 화면 코드 곳곳에 흩어져 있으면 그때마다 수십 군데를 고치게 됩니다.

### 데모 서버와 API_BASE

이 앱의 코드 실행 창은 보안 샌드박스 안의 iframe이라 오리진이 ‹null›이고 localStorage도 막힙니다. 서버 없이도 화면을 만들고 실행해 볼 수 있도록 같은 계약을 흉내 내는 데모 서버(‹mockFetch›)를 페이지 안에 넣었습니다. ‹API_BASE›가 세 값 중 무엇이냐로 동작이 갈립니다.

| API_BASE | 의미 | 언제 |
| mock | 페이지 안의 데모 서버 | 서버 없이 화면 개발, 이 앱의 실행 창 |
| http://127.0.0.1:8000 | 따로 띄운 개발 서버 | 로컬에서 진짜 API와 연결 |
| 빈 문자열 | 같은 오리진 | 배포 (레슨 8) |

실무에서도 백엔드가 끝나기 전에 계약표만 보고 프런트를 먼저 만드는 일이 흔하고, 그때 데모 서버가 큰 도움이 됩니다. 대신 데모가 진짜 서버와 어긋나는지 정기적으로 ‹/docs›와 대조해야 합니다.

### 보안 한 줄

서버에서 온 글은 ‹textContent›로만 넣습니다. ‹innerHTML›에 넣으면 누군가 할 일에 ‹<img onerror=...>›를 저장하는 순간 모든 사용자의 브라우저에서 스크립트가 실행됩니다(XSS). 서버가 한 번 걸러 주더라도 화면에서 다시 지키는 것이 원칙입니다.

### 이번 단계의 확인

이 앱에서 실행하면 '불러오는 중…'이 잠깐 보인 뒤 빈 목록이 나옵니다. 항목을 추가하면 0.25초쯤 뒤 목록에 나타나고, 체크·삭제도 됩니다. 진짜 서버와 연결하려면 이 코드를 ‹frontend/index.html›로 저장하고 ‹API_BASE›를 ‹"http://127.0.0.1:8000"›으로 바꿉니다. 레슨 3의 방식으로 서버와 화면용 서버를 켜고 ‹http://127.0.0.1:5500›을 열면, 개발자 도구 Network 탭에서 ‹GET /api/todos 200›은 OPTIONS 없이, ‹POST›는 ‹OPTIONS 200› 다음에 ‹POST 201›로 나가야 합니다. 새로고침해도 항목이 남아 있고, 다른 브라우저로 같은 주소를 열어도 같은 목록이 보이면 데이터의 주인이 서버로 옮겨 간 것입니다. 서버를 끄고 추가를 누르면 '서버에 연결할 수 없습니다' 안내가 떠야 합니다.`,
      code: `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>할 일</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; max-width: 420px; margin: 12px auto; padding: 0 12px; } ul { padding: 0; list-style: none; }
  h1 { font-size: 20px; margin: 0 0 6px; } p { margin: 4px 0; }
  form, li { display: flex; gap: 6px; margin: 6px 0; } input[type=text], li span { flex: 1; min-width: 0; }
  .done span { text-decoration: line-through; color: #888; } .err { color: #b00020; }
</style></head>
<body>
<h1>할 일</h1>
<p id="msg" role="status"></p>
<form id="add"><input id="text" type="text" aria-label="새 할 일" placeholder="할 일" maxlength="200" required><button>추가</button></form>
<ul id="list"></ul>
<script>
// 데모 서버(개발용): 진짜 API와 같은 계약을 이 페이지 안에서 흉내 낸다. 진짜 서버에 연결하면 이 블록은 필요 없다.
const mem = { n: 0, todos: [] };
async function mockFetch(url, o) {
  await new Promise(r => setTimeout(r, 250));
  const p = url.slice(API_BASE.length), b = JSON.parse(o.body || "{}"), re = (s, d) => ({ status: s, ok: s < 400, json: async () => d });
  const t = mem.todos.find(x => "/api/todos/" + x.id === p);
  if (p === "/api/todos") return o.method === "GET" ? re(200, mem.todos) : re(201, mem.todos[mem.todos.push({ id: ++mem.n, text: b.text, done: false }) - 1]);
  if (!t) return re(404, { detail: "할 일을 찾을 수 없습니다" });
  if (o.method === "PATCH") return re(200, Object.assign(t, b));
  mem.todos.splice(mem.todos.indexOf(t), 1); return re(204);
}
</script>
<script>
const API_BASE = "mock";   // "mock" = 데모 서버 · "http://127.0.0.1:8000" = 개발 서버 · "" = 같은 출처(배포)
const $ = id => document.getElementById(id);
const say = (text, bad) => { $("msg").textContent = text; $("msg").className = bad ? "err" : ""; };

async function api(path, { method = "GET", body } = {}) {
  const res = await (API_BASE === "mock" ? mockFetch : fetch)(API_BASE + path, {
    method, body: body && JSON.stringify(body), headers: body ? { "Content-Type": "application/json" } : {} });
  const data = res.status === 204 ? null : await res.json().catch(() => null);   // 204는 본문이 없다
  if (!res.ok) {                                                  // fetch는 404·500에서도 reject하지 않는다
    const d = data && data.detail;
    throw new Error(typeof d === "string" ? d : "요청에 실패했습니다 (" + res.status + ")");
  }
  return data;
}
async function run(fn) {
  say("불러오는 중…");
  try { await fn(); say(""); return true; }
  catch (e) { say(e instanceof TypeError ? "서버에 연결할 수 없습니다 (서버가 꺼졌거나 CORS에서 막혔습니다)" : e.message, true); return false; }
}
const refresh = async () => render(await api("/api/todos"));
const act = (path, opt) => run(async () => { await api(path, opt); await refresh(); });
function render(list) {
  $("list").replaceChildren(...list.map(t => {
    const li = document.createElement("li"), cb = Object.assign(document.createElement("input"), { type: "checkbox", checked: t.done });
    const del = Object.assign(document.createElement("button"), { textContent: "삭제" }), name = Object.assign(document.createElement("span"), { textContent: t.text });
    cb.onchange = () => act("/api/todos/" + t.id, { method: "PATCH", body: { done: cb.checked } });
    del.onclick = () => act("/api/todos/" + t.id, { method: "DELETE" });
    li.className = t.done ? "done" : ""; li.append(cb, name, del); return li;
  }));
}
$("add").onsubmit = async e => {
  e.preventDefault();
  if (await act("/api/todos", { method: "POST", body: { text: $("text").value.trim() } })) $("text").value = "";
};
run(refresh);
</script>
</body></html>`,
      codeLang: `html`,
      key: [
        `쓰기 경로가 '상태 수정 후 저장'에서 '서버에 요청 후 다시 받아 그리기'로 바뀐다. 화면 상태는 서버 진실의 복사본이다`,
        `fetch는 네트워크 오류 같은 실패에서만 reject하고 404·500은 resolve한다. res.ok를 확인하고, 204는 본문이 없으니 json()을 부르지 않는다`,
        `모든 통신을 api() 한 함수에 모은다. 토큰·타임아웃·재시도는 이 함수만 고쳐서 붙인다`,
        `API_BASE로 데모 서버·개발 서버·같은 오리진을 한 줄로 전환한다. 계약표가 있으면 프런트를 서버보다 먼저 만들 수 있다`,
        `서버에서 온 글은 textContent로만 화면에 넣는다. 본문 있는 요청만 preflight를 타는 것을 Network 탭에서 확인한다`
      ],
      pitfalls: [
        `res.ok를 확인하지 않아 서버가 404·500을 냈는데도 화면이 성공한 것처럼 보이는 것`,
        `DELETE의 204 응답에 res.json()을 불러 'Unexpected end of JSON input'을 만나는 것`,
        `서버 오류의 detail이 배열(422)일 때 그대로 문자열로 만들어 화면에 의미 없는 객체 표기를 보이는 것`,
        `catch에서 TypeError를 전부 서버 꺼짐으로 안내하는 것. 코드 버그나 CORS 차단도 같은 TypeError라서 개발자 도구를 열어 원인을 확인해야 한다`
      ]
    },
    {
      title: `로그인(토큰) 흐름 ① 서버: 가입·로그인·토큰 검증`,
      body: `HTTP는 요청마다 독립이라 서버는 '아까 로그인한 그 사람'을 기억하지 못합니다. 로그인 성공 때 **증표(토큰)**를 주고 이후 모든 요청이 그 증표를 들고 오게 하는 것이 토큰 흐름입니다. 증표는 보통 ‹Authorization: Bearer 토큰› 헤더로 오고, 없거나 틀리면 서버는 401과 ‹WWW-Authenticate: Bearer›로 답합니다(RFC 6750). 같은 RFC는 베어러 토큰을 TLS(https) 위에서만 쓰라고 요구합니다(레슨 9).

### 토큰의 종류와 이번 선택

| 방식 | 서버가 저장 | 즉시 폐기 | 비고 |
| 세션 쿠키 | 예 | 쉬움 | 브라우저가 자동 전송, CSRF 대비 필요 |
| JWT | 아니오 | 어려움 | 서명 키 관리, 만료 전 폐기가 번거로움 |
| 불투명 토큰(이 모듈) | 예(해시) | 쉬움 | 요청마다 DB 조회 1회 |

요청당 DB 조회 한 번은 작은 서비스에 부담이 없고, 로그아웃과 분실 대응이 서버에서 지우면 끝나는 쪽을 택했습니다. 병목이 되면 JWT나 캐시를 검토합니다.

### 비밀번호는 느린 해시로

비밀번호 평문이나 SHA-256 한 번은 DB가 유출되면 초당 수십억 번 대입으로 뚫립니다. 비밀번호용 해시는 일부러 느리고 사용자마다 다른 **솔트**(무작위 값, Python 문서는 16바이트 이상 권장)를 섞습니다. 이 모듈은 표준 라이브러리의 PBKDF2-HMAC-SHA256을 600,000회 반복합니다. OWASP가 권장하는 값이며(2026-11 확인) 1순위는 Argon2id이니, 패키지를 추가해도 되면 argon2-cffi를 고려하세요. 저장 문자열을 ‹반복횟수:솔트:해시›로 적어 두면 나중에 반복 횟수를 올려도 옛 해시를 그 횟수로 검증할 수 있습니다.

비용도 알아야 합니다. 이 해시는 한 번에 수백 ms가 걸립니다(WebAssembly에서 약 0.5초였으니 서버에서 직접 재서 정하세요). 호출 한 번이 CPU를 오래 쓰므로 공개 가입을 열어 두면 반복 호출만으로 서버가 느려집니다. 직원용이라면 가입을 닫고 관리자가 계정을 만드는 편이 안전합니다.

### 토큰은 무작위로, DB에는 해시만

‹secrets.token_urlsafe(32)›는 256비트 무작위 값입니다. 사용자에게는 이 값을 주고 DB에는 SHA-256 해시만 저장하니, DB 파일이나 백업이 새어도 로그인할 수 없습니다. 토큰은 이미 무작위라 느린 해시가 필요 없습니다. 만료 시각은 ‹datetime('now', '+12 hours')›로 DB가 계산하고, 로그인할 때 만료된 세션을 지웁니다.

### 오류는 같은 문장으로, 시간도 같게

이메일이 없을 때와 비밀번호가 틀렸을 때 같은 문장과 같은 소요 시간으로 답합니다. 없는 이메일이어도 가짜 해시로 같은 횟수를 계산하고, 비교는 ‹hmac.compare_digest›로 합니다. 응답으로 가입 여부를 알아내는 열거 공격을 막으려는 것입니다. 가입 API의 409는 존재 여부를 알려 주니 민감한 서비스는 초대 방식으로 바꿉니다.

### 레슨 2의 이음매를 연결한다

‹token_of›는 헤더를 읽고, ‹current_user_id›는 DB에서 확인해 사용자 번호를 돌려줍니다. ‹main.py›는 세 곳만 고칩니다.

- ‹def current_user_id():›로 시작하는 가짜 함수를 지웁니다
- import 줄에 ‹from auth import current_user_id, router as auth_router›를 추가합니다
- ‹app.add_middleware(...)› 아래에 ‹app.include_router(auth_router)›를 추가합니다

레슨 2의 할 일 경로는 한 줄도 고치지 않았는데 전부 로그인 필수와 소유자 범위가 적용됩니다. 옛 항목(‹user_id›가 NULL)은 아무에게도 안 보이니 개발용 ‹todo.db›는 지워도 됩니다.

### 이번 단계의 확인

서버를 재시작하고 PowerShell로 확인합니다. ‹Invoke-RestMethod http://127.0.0.1:8000/api/todos›는 ‹(401)› 오류가 납니다. 가입은 ‹Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/auth/register -ContentType 'application/json' -Body '{"email":"kim@example.com","password":"password123"}'›이고, 로그인은 같은 방식으로 ‹/api/auth/login›에 보내 ‹$t = (...).access_token›에 담습니다. ‹Invoke-RestMethod -Uri http://127.0.0.1:8000/api/todos -Headers @{Authorization="Bearer $t"}›는 빈 목록을 돌려줘야 합니다. 비밀번호를 틀리면 ‹(401)›, 로그아웃(‹/api/auth/logout› POST) 뒤 같은 토큰도 ‹(401)›입니다. 파이썬 대화형 모드(backend 폴더에서 ‹import db›)에서 ‹[r[0] for r in db.connect().execute("select length(token_hash) from sessions")]›은 ‹[64]›를 보여야 합니다.`,
      code: `import hashlib
import hmac
import secrets
import sqlite3

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import BaseModel, Field

from db import get_db
from settings import TOKEN_TTL_HOURS

router = APIRouter(prefix="/api")
ITERATIONS = 600_000  # PBKDF2-HMAC-SHA256 권장값 (OWASP, 2026-11 확인)


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\\s]+@[^@\\s]+$")
    password: str = Field(min_length=8, max_length=128)


def pbkdf2(password, salt, n):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), n).hex()


def sha(token):
    return hashlib.sha256(token.encode()).hexdigest()


def unauthorized(message="로그인이 필요합니다"):
    return HTTPException(401, message, headers={"WWW-Authenticate": "Bearer"})


def token_of(authorization: str | None = Header(default=None)):
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise unauthorized()
    return token


def current_user_id(token=Depends(token_of), db=Depends(get_db)):
    row = db.execute("SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > datetime('now')",
                     (sha(token),)).fetchone()
    if row is None:
        raise unauthorized("로그인이 만료되었거나 올바르지 않습니다")
    return row["user_id"]


@router.post("/auth/register", status_code=201)
def register(body: Credentials, db=Depends(get_db)):
    salt = secrets.token_hex(16)
    stored = f"{ITERATIONS}:{salt}:{pbkdf2(body.password, salt, ITERATIONS)}"
    try:
        with db:
            db.execute("INSERT INTO users (email, pw_hash) VALUES (?, ?)", (body.email.lower(), stored))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "이미 가입된 이메일입니다")
    return {"email": body.email.lower()}


@router.post("/auth/login")
def login(body: Credentials, db=Depends(get_db)):
    user = db.execute("SELECT id, pw_hash FROM users WHERE email = ?", (body.email.lower(),)).fetchone()
    n, salt, digest = (user["pw_hash"] if user else f"{ITERATIONS}:x:").split(":")
    good = hmac.compare_digest(pbkdf2(body.password, salt, int(n)), digest)
    if user is None or not good:
        raise unauthorized("이메일 또는 비밀번호가 올바르지 않습니다")
    token = secrets.token_urlsafe(32)
    with db:
        db.execute("DELETE FROM sessions WHERE expires_at <= datetime('now')")
        db.execute("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', ?))",
                   (sha(token), user["id"], f"+{TOKEN_TTL_HOURS} hours"))
    return {"access_token": token, "token_type": "bearer", "expires_in": TOKEN_TTL_HOURS * 3600}


@router.post("/auth/logout", status_code=204)
def logout(token=Depends(token_of), uid=Depends(current_user_id), db=Depends(get_db)):
    with db:
        db.execute("DELETE FROM sessions WHERE token_hash = ?", (sha(token),))
    return Response(status_code=204)`,
      codeLang: `python`,
      key: [
        `토큰 흐름: 로그인 때 증표를 주고, 이후 요청은 Authorization: Bearer 헤더로 보낸다. 없거나 틀리면 401과 WWW-Authenticate. 전송은 TLS(https)로만 한다`,
        `비밀번호는 솔트 + 느린 해시(PBKDF2 600,000회 또는 Argon2id)로 저장하고, 형식 안에 반복 횟수를 적어 나중에 올릴 수 있게 한다`,
        `토큰은 256비트 무작위 값, DB에는 SHA-256 해시와 만료 시각만 저장한다. DB가 새어도 토큰은 쓸 수 없고, 서버에서 지우면 즉시 폐기된다`,
        `없는 이메일과 틀린 비밀번호를 같은 문장·같은 시간으로 답해 열거 공격을 어렵게 한다. 해시 비교는 compare_digest로 한다`,
        `인증 지점을 current_user_id 한 의존성으로 모았기 때문에 레슨 2의 경로는 수정 없이 보호된다. 느린 해시 때문에 공개 가입은 서버 부하와 직결된다`
      ],
      pitfalls: [
        `비밀번호를 SHA-256 한 번이나 솔트 없이 저장하는 것. 유출되면 짧은 시간에 대부분 복구되어 사용자의 다른 사이트 계정까지 위험해진다`,
        `토큰 평문을 DB나 로그에 남기는 것. 로그 수집 시스템이나 백업 파일로 세션이 탈취된다`,
        `로그인 실패 메시지를 '비밀번호가 틀렸습니다'와 '없는 이메일입니다'로 나누는 것. 가입한 사람 목록을 공개하는 것과 같다`,
        `토큰을 URL 쿼리(?token=...)로 보내는 것. 주소는 서버 로그·브라우저 기록·Referer에 남는다. 반드시 헤더로 보낸다`
      ]
    },
    {
      title: `로그인(토큰) 흐름 ② 화면: 토큰 보관·Authorization 헤더·401`,
      body: `서버가 토큰을 주게 되었으니 프런트가 할 일은 네 가지입니다. 받은 토큰을 **보관**하고, 모든 요청에 **헤더로 실어** 보내고, 서버가 401로 거절하면 **로그인 화면으로 돌아가고**, 로그아웃하면 **지웁니다**. 모두 ‹api()› 한 곳과 ‹view()›·‹keep()› 두 도우미에서 일어납니다. 레슨 4에서 통신을 한 함수에 모아 둔 덕분에 목록·추가·삭제 코드는 한 줄도 바뀌지 않았습니다.

### 토큰을 어디에 둘 것인가

| 위치 | 새로고침 | JS가 읽을 수 있나 | 위험 |
| 메모리(변수) | 사라짐 | 예 | 가장 안전하지만 매번 로그인 |
| sessionStorage | 탭이 닫힐 때까지 | 예 | XSS가 읽음 |
| localStorage | 유지 | 예 | XSS가 읽고, 오래 남음 |
| HttpOnly 쿠키 | 유지 | **아니오** | CSRF 대비 필요, 같은 사이트 배포가 편함 |

OWASP HTML5 보안 치트시트는 세션 식별자를 localStorage에 두지 말라고 하며, 데이터가 JavaScript에서 항상 읽히므로 XSS 한 번이면 전부 빼앗긴다고 설명합니다. 대안으로 HttpOnly 쿠키를 들고, 영속 저장이 필요 없으면 localStorage 대신 sessionStorage를 쓰라고 합니다. 이 모듈은 구현을 단순하게 하려고 localStorage를 쓰지만 대가를 압니다. 그래서 (1) 서버 글은 ‹textContent›로만 그리고(레슨 4), (2) 토큰 수명을 12시간으로 짧게 하며, (3) 서버에서 폐기할 수 있게 해 두었습니다. 민감한 데이터를 다루는 의뢰라면 FastAPI가 화면도 같은 오리진에서 내보내는 구조를 이용해 HttpOnly·SameSite 쿠키로 바꾸는 편이 낫고, 이는 실습 3의 확장 과제입니다.

### 저장소 접근은 언제든 실패할 수 있다

시크릿 창, 저장소 차단 설정, 그리고 이 앱의 실행 창(샌드박스 iframe)에서는 ‹localStorage› 접근 자체가 ‹SecurityError›를 던집니다. 그래서 읽기와 쓰기를 모두 ‹try/catch›로 감쌌습니다. 저장이 막혀도 앱은 로그인할 수 있고, 다만 새로고침하면 다시 로그인해야 합니다. 보관은 편의 기능이지 필수 기능이 아니라는 태도입니다.

### 401과 403은 다르다

- **401**: 증표가 없거나 만료·폐기되었다. 프런트의 행동은 '토큰을 버리고 로그인 화면으로'입니다.
- **403**: 누구인지는 알지만 권한이 없다. 로그인 화면으로 보내면 안 되고 '권한이 없습니다'만 알립니다.

이 API는 남의 항목을 404로 숨기므로 403을 쓰지 않지만, 관리자 기능(실습 3)에서는 403이 나옵니다. ‹api()›는 토큰이 있는 상태의 401을 받으면 토큰과 목록을 지우고 로그인 화면을 보여 줍니다. 토큰이 없는 상태의 401(로그인 실패)은 그냥 오류 메시지로 보여 줍니다. 이 구분을 빼먹으면 비밀번호를 틀릴 때마다 화면이 깜박입니다.

### 시작할 때의 상태

저장된 토큰이 있다고 해서 유효한 것은 아닙니다. 시작할 때 일단 앱 화면을 보여 주고 목록을 요청해 봅니다. 서버가 401을 주면 위의 규칙대로 로그인 화면으로 돌아갑니다. 서버에 '이 토큰 유효해?'를 따로 묻는 요청을 두지 않고, 실제로 필요한 요청의 결과로 판단하는 편이 요청도 적고 경쟁 상태도 없습니다.

### preflight가 늘어난다

이제 모든 요청에 ‹Authorization› 헤더가 붙으므로 GET도 preflight를 탑니다. Network 탭에 ‹OPTIONS›가 두 배로 보이는 것은 정상이고, 서버가 알려 주는 허용 결과를 브라우저가 한동안 캐시하므로 요청마다 반복되지는 않습니다.

### 이번 단계의 확인

이 앱에서 실행하면 로그인 폼이 먼저 보입니다. 비밀번호를 8자 미만으로 넣으면 브라우저의 검증 말풍선이 먼저 막고(서버 호출 없음), 8자 이상이면 할 일 화면이 나옵니다(데모 서버는 아무 이메일이나 통과시킵니다). 실험으로 코드 편집기에서 ‹minlength="8"›을 지우고 짧은 비밀번호를 넣으면 이번에는 데모 서버가 '이메일 또는 비밀번호가 올바르지 않습니다'를 돌려줍니다. 프런트 검사와 서버 검사가 다른 층이라는 것을 눈으로 보는 것입니다. 로그아웃하면 다시 로그인 폼이 보이고 목록은 지워져야 합니다. 진짜 서버로는 ‹API_BASE›를 바꾸고 레슨 3처럼 두 서버를 켠 뒤 가입·로그인합니다. 개발자 도구 Application 탭의 Local Storage에 ‹token›이 생기고, Network 탭의 요청 헤더에 ‹Authorization: Bearer ...›가 보여야 합니다. 세션 만료는 파이썬에서 ‹UPDATE sessions SET expires_at = datetime('now','-1 minutes')›를 실행해 시험합니다. 다음 동작에서 화면이 로그인 폼으로 돌아가고 '로그인이 만료되었거나 올바르지 않습니다'가 보이면 성공입니다.`,
      code: `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>할 일</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; max-width: 420px; margin: 12px auto; padding: 0 12px; } ul { padding: 0; list-style: none; }
  h1 { font-size: 20px; margin: 0 0 6px; } p { margin: 4px 0; }
  form, li { display: flex; gap: 6px; margin: 6px 0; } input[type=text], input[type=email], input[type=password], li span { flex: 1; min-width: 0; }
  .done span { text-decoration: line-through; color: #888; } .err { color: #b00020; } [hidden] { display: none !important; }
</style></head>
<body>
<h1>할 일</h1>
<p id="msg" role="status"></p>
<form id="auth"><input id="email" type="email" aria-label="이메일" placeholder="이메일" required>
  <input id="pw" type="password" aria-label="비밀번호" placeholder="비밀번호 (8자 이상)" minlength="8" required>
  <button>로그인</button><button type="button" id="reg">가입</button></form>
<div id="app" hidden><button id="out">로그아웃</button>
  <form id="add"><input id="text" type="text" aria-label="새 할 일" placeholder="할 일" maxlength="200" required><button>추가</button></form><ul id="list"></ul></div>
<script>
// 데모 서버(개발용): 진짜 API와 같은 계약을 이 페이지 안에서 흉내 낸다. 진짜 서버에 연결하면 이 블록은 필요 없다.
const mem = { n: 0, todos: [], on: false };
async function mockFetch(url, o) {
  await new Promise(r => setTimeout(r, 250));
  const p = url.slice(API_BASE.length), b = JSON.parse(o.body || "{}"), re = (s, d) => ({ status: s, ok: s < 400, json: async () => d });
  const t = mem.todos.find(x => "/api/todos/" + x.id === p);
  if (p === "/api/auth/register") return re(201, {});
  if (p === "/api/auth/login") return String(b.password).length < 8 ? re(401, { detail: "이메일 또는 비밀번호가 올바르지 않습니다" }) : (mem.on = true, re(200, { access_token: "demo" }));
  if (!mem.on) return re(401, { detail: "로그인이 필요합니다" });
  if (p === "/api/auth/logout") { mem.on = false; return re(204); }
  if (p === "/api/todos") return o.method === "GET" ? re(200, mem.todos) : re(201, mem.todos[mem.todos.push({ id: ++mem.n, text: b.text, done: false }) - 1]);
  if (!t) return re(404, { detail: "할 일을 찾을 수 없습니다" });
  if (o.method === "PATCH") return re(200, Object.assign(t, b));
  mem.todos.splice(mem.todos.indexOf(t), 1); return re(204);
}
</script>
<script>
const API_BASE = "mock";   // "mock" = 데모 서버 · "http://127.0.0.1:8000" = 개발 서버 · "" = 같은 출처(배포)
const $ = id => document.getElementById(id);
let token = null;
try { token = localStorage.getItem("token"); } catch (e) {}   // 샌드박스·시크릿 창에서는 막힐 수 있다
const keep = t => { token = t; try { t ? localStorage.setItem("token", t) : localStorage.removeItem("token"); } catch (e) {} };
const view = on => { $("auth").hidden = on; $("app").hidden = !on; if (!on) $("list").replaceChildren(); };
const say = (text, bad) => { $("msg").textContent = text; $("msg").className = bad ? "err" : ""; };

async function api(path, { method = "GET", body } = {}) {
  const res = await (API_BASE === "mock" ? mockFetch : fetch)(API_BASE + path, { method, body: body && JSON.stringify(body),
    headers: { ...(body && { "Content-Type": "application/json" }), ...(token && { Authorization: "Bearer " + token }) } });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && token) { keep(null); view(false); }          // 만료되었거나 폐기된 토큰: 로그인 화면으로
  if (!res.ok) {
    const d = data && data.detail;
    throw new Error(typeof d === "string" ? d : "요청에 실패했습니다 (" + res.status + ")");
  }
  return data;
}
async function run(fn, label) {
  say(label || "처리 중…");
  try { await fn(); say(""); return true; }
  catch (e) { say(e instanceof TypeError ? "서버에 연결할 수 없습니다 (서버가 꺼졌거나 CORS에서 막혔습니다)" : e.message, true); return false; }
}
const refresh = async () => render(await api("/api/todos"));
const act = (path, opt) => run(async () => { await api(path, opt); await refresh(); });
function render(list) {
  $("list").replaceChildren(...list.map(t => {
    const li = document.createElement("li"), cb = Object.assign(document.createElement("input"), { type: "checkbox", checked: t.done });
    const del = Object.assign(document.createElement("button"), { textContent: "삭제" }), name = Object.assign(document.createElement("span"), { textContent: t.text });
    cb.onchange = () => act("/api/todos/" + t.id, { method: "PATCH", body: { done: cb.checked } });
    del.onclick = () => act("/api/todos/" + t.id, { method: "DELETE" });
    li.className = t.done ? "done" : ""; li.append(cb, name, del); return li;
  }));
}
const sign = register => run(async () => {
  const body = { email: $("email").value.trim(), password: $("pw").value };
  if (register) await api("/api/auth/register", { method: "POST", body });
  keep((await api("/api/auth/login", { method: "POST", body })).access_token);
  $("pw").value = ""; view(true); await refresh();
}, "확인 중…");
$("auth").onsubmit = e => { e.preventDefault(); sign(false); };
$("reg").onclick = () => $("auth").reportValidity() && sign(true);
$("add").onsubmit = async e => { e.preventDefault(); if (await act("/api/todos", { method: "POST", body: { text: $("text").value.trim() } })) $("text").value = ""; };
$("out").onclick = async () => { try { await api("/api/auth/logout", { method: "POST" }); } catch (e) {} keep(null); view(false); say("로그아웃했습니다"); };
if (token) { view(true); run(refresh, "불러오는 중…"); } else view(false);
</script>
</body></html>`,
      codeLang: `html`,
      key: [
        `토큰 흐름의 프런트 쪽: 보관 → Authorization: Bearer 헤더로 전송 → 401이면 로그인 화면 → 로그아웃 시 삭제. 모두 api()와 view()에 모은다`,
        `토큰 보관은 메모리·sessionStorage·localStorage·HttpOnly 쿠키가 각각 다른 위험을 가진다. OWASP는 localStorage에 세션 식별자를 두지 말라고 권한다`,
        `localStorage 접근은 try/catch로 감싼다. 시크릿 창·차단 설정·샌드박스 iframe에서 SecurityError가 난다`,
        `401은 증표 문제(로그인 화면으로), 403은 권한 문제(그대로 두고 안내). 토큰이 있을 때의 401과 로그인 실패 401을 구분한다`,
        `저장된 토큰이 유효하다고 가정하지 않는다. 실제 요청의 결과로 판단하고, Authorization 때문에 GET에도 preflight가 생긴다`
      ],
      pitfalls: [
        `localStorage를 try/catch 없이 호출해 시크릿 창이나 저장소 차단 환경에서 앱 전체가 시작도 못 하는 것`,
        `401을 처리하지 않아 토큰이 만료된 사용자가 빈 목록과 이유 없는 실패 메시지만 보는 것. 서버 쪽 로그에는 정상 거절로만 남아 원인을 찾기 어렵다`,
        `로그아웃 요청이 실패(오프라인)했다고 로컬 토큰을 지우지 않는 것. 서버 호출 결과와 상관없이 로컬은 항상 지운다`,
        `서버 글을 innerHTML로 그려 XSS 한 번에 localStorage의 토큰이 통째로 유출되게 만드는 것`
      ]
    },
    {
      title: `오류·로딩 처리와 재시도`,
      body: `개발 중에는 서버가 항상 켜져 있고 1ms 만에 답합니다. 실서비스에서는 와이파이가 끊기고, 서버가 재시작되고, 응답이 10초 걸립니다. 의뢰인이 '앱이 먹통이에요'라고 연락하는 순간의 대부분은 버그가 아니라 처리하지 않은 느림과 실패입니다. 이 레슨은 실패를 종류별로 나누고 종류마다 정해진 반응을 만듭니다.

### 실패의 종류와 반응

| 종류 | 신호 | 반응 |
| 네트워크 끊김·서버 꺼짐 | fetch가 reject (TypeError) | 읽기는 재시도, 안내 후 다시 시도 버튼 |
| 느림 | 타임아웃 (TimeoutError) | 같은 방식, 문구만 '너무 느립니다' |
| 4xx (입력·계약 오류) | 400번대 상태 코드 | 서버 메시지를 보여 주고 **재시도하지 않음** |
| 5xx·503 (서버 사정) | 500번대 | 읽기는 자동 재시도, 쓰기는 안내와 수동 재시도 |
| 401 | 토큰 거절 | 로그인 화면 (레슨 6) |

4xx는 같은 요청을 반복해도 같은 결과이므로 재시도 버튼도 숨깁니다. 한 가지 덧붙이면, CORS 차단은 JS에서 네트워크 오류와 구분되지 않습니다. 브라우저가 세부 원인을 스크립트에 알려 주지 않기 때문이고(MDN), 콘솔이 유일한 단서입니다.

### 무엇을 자동으로 재시도해도 되는가

MDN은 GET·PUT·DELETE를 멱등(여러 번 보내도 결과가 같음)으로, POST와 PATCH는 보장되지 않는 것으로 설명합니다. 멱등한 요청은 응답을 못 받았을 때 다시 보내도 안전합니다. 하지만 '추가'를 자동 재시도하면 위험합니다. 요청은 서버에 도착해 저장됐는데 **응답만 잃어버린** 경우가 있기 때문입니다. 그때 재시도하면 같은 항목이 둘 생깁니다. 그래서 이 모듈의 정책은 이렇습니다.

- GET만 최대 3번 자동 시도합니다(대기 0.3초, 0.6초: 지수 백오프).
- 쓰기는 한 번만 시도하고 실패하면 안내와 '다시 시도' 버튼을 보여 줍니다. 사용자가 판단합니다.
- 쓰기가 성공한 뒤 목록 다시 받기만 실패했다면 재시도 대상을 **다시 받기로 바꿉니다**(‹last = refresh›). 안 그러면 버튼이 쓰기까지 다시 실행해 중복이 생깁니다. 데모 서버에 이 상황을 만들어 중복 없음을 확인했습니다.

큰 서비스에서는 서버가 멱등 키(요청 번호)를 받아 중복을 막아 주기도 합니다. 그 수준이 필요한 요구(결제 등)라면 별도 설계입니다.

### 타임아웃은 숫자로 계산한다

‹AbortSignal.timeout(8000)›은 8초가 지나면 요청을 끊고 ‹TimeoutError›를 냅니다. 타임아웃이 없으면 응답이 영영 안 오는 요청에서 화면이 영원히 '불러오는 중'입니다. 그렇다고 마냥 길게 잡으면 곤란합니다. 서버가 연결은 받는데 답을 안 주는 최악의 경우 GET은 3번 × 8초 + 대기 0.9초로 **약 25초**를 기다려야 오류가 보입니다. 서버가 아예 꺼졌다면 연결 거부가 즉시 돌아와서 1초쯤이면 끝납니다. 읽기 타임아웃은 평소 응답의 서너 배 정도로 짧게 잡는 것이 흔한 출발점입니다.

### 로딩과 이중 제출

요청이 시작되자마자 '처리 중…'을 보이고 모든 버튼을 잠급니다. 잠그지 않으면 느린 네트워크에서 사용자가 '추가'를 두 번 눌러 항목이 둘 생깁니다. 잠금 해제는 성공·실패와 무관하게 ‹finally›에서 합니다. 해제를 ‹try› 안에 두면 예외 한 번에 버튼이 영구히 잠깁니다. 상태 문구는 ‹role="status"› 영역에 넣어 스크린 리더도 읽게 합니다.

### 실패한 뒤의 화면은 서버의 마지막 상태로

체크박스는 클릭하는 즉시 브라우저가 바꿉니다. PATCH가 실패했는데 칸만 체크된 채 남으면 화면이 거짓말을 합니다. 그래서 실패하면 마지막으로 받은 서버 목록(‹items›)으로 다시 그립니다. 사용자는 오류 문구와 함께 원래 상태를 봅니다.

### 이번 단계의 확인

이 앱에서 코드의 ‹failRate: 0›을 ‹0.5›로 바꿔 실행하고 로그인합니다(데모 서버의 실패는 로그인 뒤 요청에만 적용됩니다). 항목을 여러 번 추가하면 '서버가 잠시 바쁩니다'와 '다시 시도' 버튼이 나타나고, 몇 번 누르면 성공해야 합니다. 같은 항목이 두 개 생기면 안 됩니다. ‹failRate: 1›로 바꿔 로그인하면 목록을 불러오는 데 약 1.6초가 걸린 뒤 오류가 보이고(요청 3번 × 0.25초 + 대기 0.9초), 오류 중에도 버튼이 다시 눌려야 합니다. 진짜 서버는 uvicorn을 끈 채 '추가'를 눌러 보세요. 1초 안팎에 '서버에 연결할 수 없습니다'가 보이고 입력창의 글이 남아 있어야 합니다. 서버를 다시 켜고 '다시 시도'를 누르면 입력이 비워지며 항목이 한 개 생깁니다.`,
      code: `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>할 일</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; max-width: 420px; margin: 12px auto; padding: 0 12px; } ul { padding: 0; list-style: none; }
  h1 { font-size: 20px; margin: 0 0 6px; } p { margin: 4px 0; }
  form, li { display: flex; gap: 6px; margin: 6px 0; } input[type=text], input[type=email], input[type=password], li span { flex: 1; min-width: 0; }
  .done span { text-decoration: line-through; color: #888; } .err { color: #b00020; } [hidden] { display: none !important; }
</style></head>
<body>
<h1>할 일</h1>
<p><span id="msg" role="status"></span> <button id="retry" hidden>다시 시도</button></p>
<form id="auth"><input id="email" type="email" aria-label="이메일" placeholder="이메일" required>
  <input id="pw" type="password" aria-label="비밀번호" placeholder="비밀번호 (8자 이상)" minlength="8" required>
  <button>로그인</button><button type="button" id="reg">가입</button></form>
<div id="app" hidden><button id="out">로그아웃</button>
  <form id="add"><input id="text" type="text" aria-label="새 할 일" placeholder="할 일" maxlength="200" required><button>추가</button></form><ul id="list"></ul></div>
<script>
// 데모 서버(개발용): 진짜 API와 같은 계약을 이 페이지 안에서 흉내 낸다. 배포 전에 이 블록은 지운다.
const MOCK = { delay: 250, failRate: 0 }, mem = { n: 0, todos: [], on: false };   // failRate를 0.5로 올리면(로그인 뒤 요청에 적용) 오류·재시도를 볼 수 있다
async function mockFetch(url, o) {
  await new Promise(r => setTimeout(r, MOCK.delay));
  const p = url.slice(API_BASE.length), b = JSON.parse(o.body || "{}"), re = (s, d) => ({ status: s, ok: s < 400, json: async () => d });
  const t = mem.todos.find(x => "/api/todos/" + x.id === p);
  if (mem.on && Math.random() < MOCK.failRate) return re(503, { detail: "서버가 잠시 바쁩니다" });
  if (p === "/api/auth/register") return re(201, {});
  if (p === "/api/auth/login") return String(b.password).length < 8 ? re(401, { detail: "이메일 또는 비밀번호가 올바르지 않습니다" }) : (mem.on = true, re(200, { access_token: "demo" }));
  if (!mem.on) return re(401, { detail: "로그인이 필요합니다" });
  if (p === "/api/auth/logout") { mem.on = false; return re(204); }
  if (p === "/api/todos") return o.method === "GET" ? re(200, mem.todos) : re(201, mem.todos[mem.todos.push({ id: ++mem.n, text: b.text, done: false }) - 1]);
  if (!t) return re(404, { detail: "할 일을 찾을 수 없습니다" });
  if (o.method === "PATCH") return re(200, Object.assign(t, b));
  mem.todos.splice(mem.todos.indexOf(t), 1); return re(204);
}
</script>
<script>
const API_BASE = "mock";   // "mock" = 데모 서버 · "http://127.0.0.1:8000" = 개발 서버 · "" = 같은 출처(배포)
const $ = id => document.getElementById(id), sleep = ms => new Promise(r => setTimeout(r, ms));
let token = null, last = null, items = [];
try { token = localStorage.getItem("token"); } catch (e) {}   // 샌드박스·시크릿 창에서는 막힐 수 있다
const keep = t => { token = t; try { t ? localStorage.setItem("token", t) : localStorage.removeItem("token"); } catch (e) {} };
const view = on => { $("auth").hidden = on; $("app").hidden = !on; if (!on) { items = []; $("list").replaceChildren(); } };
const say = (text, bad, again) => { $("msg").textContent = text; $("msg").className = bad ? "err" : ""; $("retry").hidden = !again; };
const fail = (message, retry) => Object.assign(new Error(message), { retry });

async function api(path, { method = "GET", body } = {}) {
  const tries = method === "GET" ? 3 : 1;                      // 읽기(GET)만 자동 재시도한다
  for (let n = 1; ; n++) {
    let res = null, data = null;
    try {
      res = await (API_BASE === "mock" ? mockFetch : fetch)(API_BASE + path, { method, body: body && JSON.stringify(body), signal: AbortSignal.timeout(8000),
        headers: { ...(body && { "Content-Type": "application/json" }), ...(token && { Authorization: "Bearer " + token }) } });
      data = res.status === 204 ? null : await res.json().catch(() => null);
    } catch (e) {
      if (n >= tries) throw fail(e.name === "TimeoutError" ? "서버 응답이 너무 느립니다" : "서버에 연결할 수 없습니다", true);
    }
    if (res && res.ok) return data;
    if (res && res.status === 401 && token) { keep(null); view(false); }
    if (res && (res.status < 500 || n >= tries)) {
      const d = data && data.detail;
      throw fail(typeof d === "string" ? d : Array.isArray(d) ? "입력값을 확인해 주세요" : "서버 오류 (" + res.status + ")", res.status >= 500);
    }
    await sleep(300 * 2 ** (n - 1));                            // 0.3초, 0.6초 (지수 백오프)
  }
}
async function run(fn, label) {                                 // 로딩 표시 · 중복 클릭 방지 · 오류 표시 · 재시도 연결
  const lock = on => document.querySelectorAll("button").forEach(b => { b.disabled = on; });
  last = fn; say(label || "처리 중…"); lock(true);
  try { await fn(); say(""); return true; } catch (e) { render(items); say(e.message, true, e.retry); return false; } finally { lock(false); }
}
const refresh = async () => render(await api("/api/todos"));
const act = (path, opt, after) => run(async () => { await api(path, opt); if (after) after(); last = refresh; await refresh(); });   // 쓰기가 끝나면 재시도 대상은 재조회뿐
function render(list) {
  items = list;
  $("list").replaceChildren(...list.map(t => {
    const li = document.createElement("li"), cb = Object.assign(document.createElement("input"), { type: "checkbox", checked: t.done });
    const del = Object.assign(document.createElement("button"), { textContent: "삭제" }), name = Object.assign(document.createElement("span"), { textContent: t.text });
    cb.onchange = () => act("/api/todos/" + t.id, { method: "PATCH", body: { done: cb.checked } });
    del.onclick = () => act("/api/todos/" + t.id, { method: "DELETE" });
    li.className = t.done ? "done" : ""; li.append(cb, name, del); return li;
  }));
}
const sign = register => run(async () => {
  const body = { email: $("email").value.trim(), password: $("pw").value };
  if (register) await api("/api/auth/register", { method: "POST", body });
  keep((await api("/api/auth/login", { method: "POST", body })).access_token);
  $("pw").value = ""; view(true); last = refresh; await refresh();
}, "확인 중…");
$("auth").onsubmit = e => { e.preventDefault(); sign(false); };
$("reg").onclick = () => $("auth").reportValidity() && sign(true);
$("add").onsubmit = e => { e.preventDefault(); act("/api/todos", { method: "POST", body: { text: $("text").value.trim() } }, () => { $("text").value = ""; }); };
$("out").onclick = async () => { try { await api("/api/auth/logout", { method: "POST" }); } catch (e) {} keep(null); view(false); say("로그아웃했습니다"); };
$("retry").onclick = () => run(last);
if (token) { view(true); run(refresh, "불러오는 중…"); } else view(false);
</script>
</body></html>`,
      codeLang: `html`,
      key: [
        `실패를 네트워크·느림·4xx·5xx·401로 나눠 각각 정해진 반응을 만든다. 4xx는 재시도하지 않고, CORS 차단은 JS에서 네트워크 오류와 구분되지 않는다`,
        `자동 재시도는 멱등한 GET만 한다. 쓰기는 응답만 잃은 경우 중복이 생기므로 사용자가 누르는 수동 재시도로 둔다`,
        `쓰기가 성공했다면 재시도 대상을 다시 받기로 바꾼다. 그렇지 않으면 재시도 버튼이 쓰기를 반복한다`,
        `타임아웃은 최악 대기 시간을 계산해 정한다. GET 3회 × 8초 + 0.9초 ≈ 25초. 타임아웃이 없으면 로딩이 끝나지 않는다`,
        `요청 중에는 버튼을 잠그고 finally에서 푼다. 실패하면 서버의 마지막 상태로 다시 그려 화면이 거짓말하지 않게 한다`
      ],
      pitfalls: [
        `모든 요청에 같은 재시도 래퍼를 씌워 POST가 중복 생성되는 것. 네트워크가 나쁠수록 데이터가 오염되므로 시험에서 잘 드러나지 않는다`,
        `잠금 해제를 try 안에서만 해 예외 한 번에 버튼이 영구히 잠기는 것. finally가 필요하다`,
        `대기 없이 즉시 재시도를 반복하거나 상한이 없는 것. 서버가 이미 힘든 순간에 모든 사용자가 동시에 몰려 장애를 키운다`,
        `catch에서 오류를 삼키고 아무것도 보여 주지 않는 것. 사용자는 아무 일도 안 일어난 것으로 알고 다시 눌러 중복이나 혼란이 생긴다`
      ]
    },
    {
      title: `배포 선택지 비교(PaaS vs VPS)와 실제 배포 순서`,
      body: `내 컴퓨터에서 돌아가는 것과 의뢰인이 접속할 수 있는 것 사이에는 큰 간격이 있습니다. 호스팅은 '무료인가 싼가'보다 먼저 **이 앱의 데이터가 어디에 남는가**로 골라야 합니다. 이 프로젝트의 데이터는 SQLite **파일 하나**입니다. 파일은 서버가 다시 시작·재배포돼도 남는 저장소(볼륨)에 있어야 하고, 같은 파일을 쓰는 인스턴스는 하나여야 합니다.

### PaaS와 VPS

| 항목 | PaaS | VPS |
| OS·보안 패치·방화벽 | 플랫폼이 맡음 | 직접 |
| 배포 | Git 푸시나 이미지 지정 | SSH 접속 후 Docker 실행 |
| SQLite 파일 | 볼륨·디스크 기능이 있어야 하고 일부는 유료 | 서버 디스크를 그대로 사용 |
| 장애 | 플랫폼이 인스턴스를 재시작 | 직접 감시·복구 |
| 이식성 | 플랫폼별 설정이 생김 | Docker 이미지 그대로 |

### 2026-11 기준 공식 페이지에서 확인한 사실

- Render 무료 웹 서비스: 15분간 요청이 없으면 잠들고 다시 깨어나는 데 약 1분이 걸립니다. 파일 시스템은 일시적이라 재배포·재시작·잠들기 때마다 로컬 파일 변경이 사라지고, 무료에서는 영구 디스크를 못 붙입니다(render.com/docs/free). 유료에서는 디스크를 붙일 수 있지만 인스턴스가 하나로 제한되고 무중단 배포가 꺼지며, 24시간마다 스냅샷이 7일간 보관됩니다(render.com/docs/disks).
- Fly.io: 새 조직은 무료 플랜이 없고 7일짜리 1달러 체험 크레딧을 줍니다. shared-cpu-1x 256MB 머신은 월 2.19달러(가동한 시간만 초 단위로 청구), 볼륨은 GB당 월 0.15달러입니다(docs.fly.io/about/pricing).
- Railway: 무료 플랜은 월 1달러 크레딧에 메모리 0.5GB·볼륨 0.5GB이고, Hobby는 월 5달러(5달러어치 사용 포함)입니다(docs.railway.com/reference/pricing/plans).
- VPS: Hetzner Cloud 공유 vCPU 서버는 월 5.49유로부터(VAT 별도, hetzner.com/cloud), DigitalOcean Basic Droplet은 월 4달러(512MiB)와 6달러(1GiB)부터입니다(digitalocean.com/pricing/droplets). 가격표는 자주 바뀌므로 견적 때 다시 확인하세요.

결론은 단순합니다. **파일 DB + 실서비스**라면 '잠들고 지워지는 무료 플랜'은 맞지 않습니다. 볼륨이 있는 유료 PaaS나 월 5달러 안팎의 VPS가 현실적인 선택이고, 이 모듈은 이식성이 높은 VPS + Docker를 기본으로 삼습니다. 의뢰인이 서버 관리를 원치 않거나 데이터가 커지면 관리형 PostgreSQL로 옮기는 길이 있고, 그것은 코드 변경이 따르는 별도 작업입니다.

### 실제 배포 순서

1. 화면 파일을 정리합니다. ‹API_BASE›를 ‹""›(같은 오리진)로 바꾸고 데모 서버 ‹<script>› 블록을 지웁니다
2. ‹main.py›에 화면 서빙을 추가합니다(아래 코드). 의존성은 ‹pip freeze›로 고정합니다
3. ‹Dockerfile›과 ‹.dockerignore›를 만들고 로컬에서 ‹docker build›·‹docker run›을 합니다
4. 연기 테스트: ‹/api/health›, 가입, 추가, **컨테이너를 지우고 다시 만들어도 데이터가 남는지**
5. 서버에 이미지를 올리고 환경 변수와 볼륨을 설정해 실행합니다
6. 이전 이미지를 남겨 두어 되돌릴 수 있게 합니다. 스키마를 바꾼 배포는 옛 코드로 못 돌아갈 수 있으므로 컬럼은 먼저 **추가만** 하고 지우는 일은 다음 배포로 미룹니다

화면과 API가 같은 컨테이너에서 같은 오리진으로 나가므로 운영에서는 CORS가 필요 없고 ‹CORS_ORIGINS›를 비워 둡니다. uvicorn은 기본이 ‹127.0.0.1›이라 컨테이너 안에서는 ‹--host 0.0.0.0›이 필요하고, ‹--reload›는 개발용이라 쓰지 않습니다. 작업자 수는 기본 1이며 이 규모에는 충분합니다. (최신 FastAPI 문서는 ‹app.frontend()›도 안내하지만 이 모듈은 ‹StaticFiles›를 씁니다.)

### 이번 단계의 확인

Docker가 있다면 프로젝트 폴더에서 ‹docker build -t todo-fullstack .›와 ‹docker run -d --name todo -p 8000:8000 -v todo-data:/data todo-fullstack›을 실행합니다. ‹Invoke-RestMethod http://127.0.0.1:8000/api/health›가 ‹ok True›를 주고, 브라우저로 ‹http://127.0.0.1:8000/›을 열면 할 일 앱이 보여야 합니다. 가입하고 항목을 추가한 뒤 ‹docker rm -f todo›로 컨테이너를 지우고 같은 ‹docker run›을 다시 실행해도 항목이 남아 있어야 합니다. Docker가 없다면 backend 폴더에서 ‹$env:FRONTEND_DIR = "../frontend"›를 지정하고 ‹uvicorn main:app›을 실행해 같은 화면이 ‹http://127.0.0.1:8000/›에서 뜨는지 봅니다.`,
      code: `# ===== Dockerfile (프로젝트 맨 위 폴더: backend/ 와 frontend/ 와 같은 위치) =====
FROM python:3.14-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY frontend/ ./frontend/
ENV DB_PATH=/data/todo.db FRONTEND_DIR=/app/frontend
RUN useradd --create-home app && mkdir /data && chown app /data
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD ["python", "-c", "import urllib.request as u; u.urlopen('http://127.0.0.1:8000/api/health')"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]


# ===== .dockerignore (Dockerfile 옆) : 비밀·개발 찌꺼기가 이미지에 들어가지 않게 =====
**/.env
**/.venv
**/__pycache__
**/*.db
**/*.db-wal
**/*.db-shm
.git


# ===== backend/requirements.txt : 본인이 테스트한 버전으로 고정한다 (아래는 2026-11 기준 PyPI 최신값의 예) =====
fastapi==0.162.5
uvicorn==0.54.0


# ===== backend/main.py : 두 군데를 고친다 (이미 settings import 줄이 있으니 FRONTEND_DIR만 덧붙인다) =====
from fastapi.staticfiles import StaticFiles                  # 위쪽 import에 추가
from settings import CORS_ORIGINS, FRONTEND_DIR              # 기존 settings import 줄을 이렇게 바꾼다

if FRONTEND_DIR:  # 파일 맨 아래에 추가: API 경로를 모두 등록한 뒤에 "/" 를 마운트해야 한다
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="web")`,
      codeLang: `text`,
      key: [
        `호스팅은 데이터가 어디에 남는지로 고른다. SQLite 파일은 재시작·재배포에도 남는 볼륨이 필요하고, 같은 파일을 쓰는 인스턴스는 하나여야 한다`,
        `무료 플랜은 잠들고(Render 15분) 파일 시스템이 일시적이라 파일 DB를 두기 어렵다. 가격은 날짜를 적고 견적 때 공식 페이지를 다시 본다`,
        `Docker 이미지는 이식성이 높다. 비밀(.env)과 개발 찌꺼기(.venv, *.db)는 .dockerignore로 이미지에서 뺀다`,
        `컨테이너 안에서는 uvicorn을 0.0.0.0으로 바인드하고, DB 경로는 볼륨 마운트 경로(/data)에 둔다. 환경 변수로 설정을 주입한다. 호스트 폴더를 바인드 마운트하면 그 폴더의 소유자를 컨테이너의 app 사용자에 맞춰야 한다`,
        `연기 테스트의 핵심은 컨테이너를 지우고 다시 만들어도 데이터가 남는지. 되돌릴 이전 이미지를 남기고 스키마는 추가만 한다`
      ],
      pitfalls: [
        `볼륨 없이 컨테이너 안에 SQLite를 두는 것. 재배포 때마다 데이터가 사라지고 처음 며칠은 눈치채지 못한다`,
        `COPY backend/ . 때 .env나 .venv, 개발용 todo.db까지 이미지에 들어가 비밀이 이미지에 박히거나 이미지가 수백 MB가 되는 것`,
        `uvicorn을 기본 127.0.0.1로 띄워 포트를 열었는데도 컨테이너 밖에서 접속이 안 되는 것`,
        `배포 후에도 API_BASE가 mock이거나 데모 서버가 남아 운영 화면이 가짜 데이터로 동작하는 것. 체크리스트에 넣어 확인한다`
      ]
    },
    {
      title: `도메인·HTTPS·백업과 복구`,
      body: `서비스가 IP 주소로만 열려 있으면 의뢰인은 '제품'이 아니라 '시제품'으로 받아들이고, 운영이 시작되면 가장 값비싼 질문은 '어제 데이터를 되살릴 수 있나요?'입니다. 이 레슨은 도메인·HTTPS·백업을 갖춥니다.

### 도메인과 DNS

도메인은 등록 업체에서 사서 DNS 레코드로 서버를 가리킵니다. ‹A› 레코드는 IPv4 주소, ‹AAAA›는 IPv6 주소, ‹CNAME›은 다른 이름의 별명(PaaS가 알려 주는 호스트 이름을 연결할 때)입니다. 레코드의 캐시 시간(TTL)이 길면 서버를 옮겨도 한참 옛 주소로 가는 사용자가 생기므로 이전 작업 전에 미리 줄여 둡니다. 가장 중요한 것은 사무적인 부분입니다. **도메인과 DNS 계정은 의뢰인 명의**로 만들고 개발자는 위임 접근만 받습니다. 개발자 개인 계정에 묶인 도메인은 계약이 끝나는 날 분쟁의 씨앗입니다.

### 왜 HTTPS인가

로그인 비밀번호와 베어러 토큰이 평문으로 오가면 공용 와이파이의 누구든 읽거나 바꿀 수 있습니다. RFC 6750은 베어러 토큰을 쓸 때 TLS(https)를 반드시 쓰라고 요구합니다. 다행히 인증서는 직접 만지지 않아도 됩니다. Caddy는 도메인 이름이 설정에 있으면 인증서를 발급받고 갱신하고 HTTP를 HTTPS로 돌려보내는 일을 자동으로 합니다. 조건은 네 가지입니다.

- DNS의 A/AAAA 레코드가 이 서버를 가리킬 것
- 80번과 443번 포트가 밖에서 닿을 것 (방화벽·보안 그룹 확인)
- Caddy의 데이터 디렉터리가 쓰기 가능하고 **영구**일 것 (컨테이너라면 볼륨)
- 설정 파일에 도메인 이름이 있을 것

Caddyfile은 세 줄입니다.

| todo.example.com {
| reverse_proxy 127.0.0.1:8000
| }

앱 컨테이너는 ‹-p 127.0.0.1:8000:8000›으로 서버 안에서만 열고, 바깥에는 Caddy의 80·443만 노출합니다. Let's Encrypt의 기본 인증서는 90일짜리이고 60일마다 갱신하길 권장하며, Caddy가 알아서 갱신합니다(2026-11 기준 공식 문서). 다만 **발급에는 제한이 있습니다**. 같은 이름 조합의 인증서는 7일에 5장, 같은 이름의 검증 실패는 계정당 한 시간에 5번까지입니다(2026-11 기준). DNS가 옛 서버를 가리킨 채 Caddy를 반복 재시작하면 제한에 걸려 한참 기다려야 하니(Caddy는 알아서 간격을 두고 재시도합니다), 실패하면 원인(DNS·포트)부터 고치고 실험은 스테이징 환경에서 합니다. PaaS를 쓴다면 플랫폼이 TLS와 도메인 연결을 제공하니 레코드 안내를 따르면 됩니다.

### 백업: 파일 복사는 백업이 아니다

WAL 모드의 SQLite는 아직 본 파일에 반영되지 않은 커밋이 ‹-wal› 파일에 있을 수 있고, SQLite 문서는 DB 파일을 WAL 파일과 따로 복사하면 커밋된 트랜잭션이 사라지거나 파일이 깨질 수 있다고 경고합니다. 서버가 켜진 채 ‹cp todo.db›로 뜬 백업은 복구해 보기 전까지는 믿을 수 없습니다. 올바른 방법은 SQLite의 **온라인 백업 API**입니다. 파이썬에서는 ‹Connection.backup()›이고, 다른 연결이 쓰는 중에도 일관된 복사본을 만듭니다. ‹backup.py›는 다음을 지킵니다.

- 원본이 없으면 빈 DB를 새로 만들지 않고 중단합니다 (경로 오타를 조용한 빈 백업으로 만들지 않기 위해)
- 복사한 파일에 ‹PRAGMA integrity_check›를 돌려 ‹ok›가 아니면 지웁니다
- 날짜가 들어간 이름으로 저장하고 14일이 지난 백업만 지웁니다

### 백업 계획은 숫자로 합의한다

하루 한 번 백업이면 최악의 경우 최대 24시간치 데이터를 잃습니다(RPO). 장애에서 서비스를 되살리는 데 걸리는 시간 목표(RTO)도 있습니다. 의뢰인과 '하루치 잃어도 되나요, 몇 시간 안에 복구돼야 하나요'를 숫자로 정하면 백업 주기와 보관 방식이 따라옵니다. 같은 디스크에만 두면 디스크가 죽을 때 함께 사라지므로 **다른 장소로 복사**(다른 서버·클라우드 저장소)가 따라야 합니다. 플랫폼의 디스크 스냅샷은 보조 수단입니다.

그리고 **복구 리허설**을 합니다. 컨테이너 중지, 현재 ‹todo.db›·‹-wal›·‹-shm› 치우기, 백업 파일을 ‹todo.db›로 복사, 시작, 항목 수 비교. 한 번도 복구해 보지 않은 백업은 희망일 뿐입니다. 서버에서는 크론에 ‹10 3 * * * docker exec todo python backup.py /data/backups›를 등록합니다.

### 이번 단계의 확인

backend 폴더에서 ‹python backup.py backups›를 실행하면 ‹백업 완료: backups/todo-날짜-시각.db (할 일 N개, 검증 ok)›가 나와야 합니다. 서버가 켜진 채로도 됩니다. 백업 파일을 파이썬 ‹sqlite3›로 열어 ‹select count(*) from todos›가 원본과 같은지 비교하고, ‹todo.db›를 지운 뒤 백업을 ‹todo.db›로 복사해 서버를 켜면 데이터가 돌아와야 합니다. 환경 변수 ‹DB_PATH›를 없는 경로로 바꿔 실행하면 ‹DB 파일이 없습니다›로 끝나고 새 파일이 생기지 않아야 합니다.`,
      code: `import os
import sqlite3
import sys
import time

from settings import DB_PATH

DEST = sys.argv[1] if len(sys.argv) > 1 else "backups"
KEEP_DAYS = int(os.getenv("KEEP_DAYS", "14"))

if not os.path.exists(DB_PATH):  # 경로가 틀리면 connect()가 빈 DB를 새로 만들어 버린다
    sys.exit("DB 파일이 없습니다: " + DB_PATH)
os.makedirs(DEST, exist_ok=True)
name = os.path.join(DEST, time.strftime("todo-%Y%m%d-%H%M%S.db"))

src = sqlite3.connect(DB_PATH)
dst = sqlite3.connect(name)
with dst:
    src.backup(dst)  # 서버가 쓰는 중에도 일관된 스냅숏을 만든다
check = dst.execute("PRAGMA integrity_check").fetchone()[0]
count = dst.execute("SELECT COUNT(*) FROM todos").fetchone()[0]
src.close()
dst.close()
if check != "ok":
    os.remove(name)
    sys.exit("백업 검증 실패: " + check)

limit = time.time() - KEEP_DAYS * 86400
for f in os.listdir(DEST):
    path = os.path.join(DEST, f)
    if f.startswith("todo-") and f.endswith(".db") and os.path.getmtime(path) < limit:
        os.remove(path)
print(f"백업 완료: {name} (할 일 {count}개, 검증 {check})")`,
      codeLang: `python`,
      key: [
        `도메인과 DNS 계정은 의뢰인 명의로 만든다. A/AAAA는 IP, CNAME은 별명이고 이전 전에 TTL을 줄인다`,
        `베어러 토큰은 TLS 위에서만 보낸다(RFC 6750). Caddy는 DNS·80/443 포트·영구 데이터 디렉터리가 갖춰지면 인증서 발급·갱신·리다이렉트를 자동으로 한다`,
        `발급에는 제한이 있다(2026-11 기준 같은 이름 조합 7일 5장, 검증 실패 계정당 시간당 5번). 실패하면 원인부터 고치고 실험은 스테이징에서 한다. 기본 인증서 수명은 90일이고 더 짧은 프로필(45일·약 6일)이 도입되는 중이라 갱신은 자동화에 맡긴다(2026-11 기준)`,
        `WAL 모드에서 DB 파일만 복사하면 커밋이 빠질 수 있다. 온라인 백업 API(Connection.backup)로 뜨고 integrity_check로 검증한다`,
        `백업은 RPO·RTO를 숫자로 합의하고, 다른 장소에 복사하고, 복구 리허설로 검증한다. 복구해 보지 않은 백업은 백업이 아니다`
      ],
      pitfalls: [
        `서버가 켜진 채로 todo.db만 cp 하는 것. WAL에 남은 커밋이 빠진 백업이 만들어지고 복구하는 날에야 알게 된다`,
        `백업을 같은 서버·같은 디스크에만 두는 것. 디스크 장애나 서버 삭제 한 번에 원본과 백업이 같이 사라진다`,
        `DNS가 반영되기 전에 Caddy를 띄워 발급 실패를 반복하다 발급 제한에 걸리는 것`,
        `도메인·서버 계정을 개발자 개인 명의로 만들어 두는 것. 의뢰인이 접근 권한이나 갱신 알림을 받지 못해 만료·분쟁으로 이어진다`
      ]
    },
    {
      title: `인수인계 문서와 납품 체크리스트: 통합 사례`,
      body: `프로그램이 돌아가는 것과 납품이 끝난 것은 다른 일입니다. 납품은 **내가 없어도 의뢰인이 운영할 수 있는 상태**입니다. 6개월 뒤 서버가 멈췄을 때 연락이 안 닿는 개발자의 프로젝트는 그 순간부터 의뢰인의 부채입니다. 그래서 인수인계 문서는 부록이 아니라 납품물의 일부입니다. 가상 사례로 지금까지의 레슨을 하나로 묶어 봅니다.

### 사례: 직원 5명의 인테리어 스튜디오

요구는 간단합니다. 현장 방문 전 준비물과 할 일을 직원마다 관리하고 휴대폰에서도 보고, 데이터가 사라지지 않고, 자기네 도메인 주소로 열리게 해 달라는 것입니다. 의뢰인은 서버 경험이 없습니다. 결정은 이렇게 나옵니다.

| 요구 | 결정 | 근거 |
| 직원마다 자기 목록 | users 테이블, 소유자 조건, 토큰 로그인 | 레슨 1·5 |
| 휴대폰 사용 | 화면의 viewport 설정과 한 줄 레이아웃 | 레슨 4 |
| 데이터 보존 | VPS의 볼륨 + 일일 백업 + 복구 리허설 | 레슨 8·9 |
| 자기네 주소 | 의뢰인 명의 도메인 + Caddy 자동 HTTPS | 레슨 9 |
| 운영 부담 최소 | 컨테이너 1개, 가입 닫고 관리자가 계정 생성 | 레슨 5·8 |

가상의 일정은 설계 3시간, API 8, 화면 8, 로그인 6, 오류 처리 4, 배포·도메인 6, 백업·복구 3, 문서·인수 4 시간으로 합계 42시간에 예비 30%를 더해 약 55시간입니다. 이 숫자는 경험칙일 뿐이니 자신의 작업 기록으로 보정하세요. 눈여겨볼 점은 코드 밖의 일(배포·도메인·백업·문서·인수)이 13시간으로 전체의 약 3할이라는 것이고, 견적서에서 이 부분을 빼면 그만큼이 무상 노동이 됩니다.

### 인수인계 문서에 들어갈 것

아래 코드 영역의 예시 문서를 보세요. 읽는 사람은 이 프로젝트를 처음 보는 비개발자 운영 담당 또는 6개월 뒤의 나입니다. 그래서 절 구성이 질문 순서를 따릅니다. 이게 뭐고, 누구 명의 계정에 뭐가 있고, 설정값은 뭐고, 새 버전은 어떻게 올리고, 데이터는 어떻게 되살리고, 고장 나면 어디부터 보고, 아직 안 되는 건 뭔가. 환경 변수 표에는 비밀 값 자체를 적지 않고 **어디에 있는지**만 적습니다. 비밀은 비밀번호 관리자의 공유 기능으로 건네고 인수 직후 새로 바꿉니다. 메신저에 평문으로 보내지 마세요.

### 납품 체크리스트 (8항목)

1. 깨끗한 폴더에서 문서만 보고 빌드·실행해 30분 안에 접속한다 (남에게 시켜 본다)
2. ‹API_BASE›가 빈 문자열이고 데모 서버가 없으며, ‹.env›·‹.db›가 저장소와 이미지에 없다
3. 주소가 HTTPS이고 인증서 경고가 없으며 http로 들어오면 https로 넘어간다
4. 가입 정책(닫음 또는 초대)이 의뢰인과 합의한 대로다
5. 백업이 자동으로 돌고 다른 장소에 복사되는 것을 확인했다
6. 복구 리허설 기록(소요 시간, 항목 수 일치)이 문서에 있다
7. 도메인·서버·저장소 계정의 소유자가 의뢰인으로 바뀌었다
8. 의뢰인이 직접 시나리오(로그인, 추가·완료·삭제, 로그아웃)를 수행해 통과했다

항목마다 '된다/안 된다'로 답할 수 있어야 하고, 결과를 문서 마지막의 서명란에 남깁니다. 합의한 보증 기간(예: 30일의 결함 수정)과 범위 밖 요청의 처리 방식도 같은 문서에 적어 두면 분쟁이 줄어듭니다. 지금까지의 레슨은 결국 이 여덟 줄을 참으로 만드는 과정이었습니다.

### 이번 단계의 확인

예시 문서를 자신의 프로젝트에 맞게 고쳐 쓰고, **다른 폴더나 다른 PC**에서 그 문서만 보고 설치부터 접속까지 따라 해 봅니다. 막히거나 물어보고 싶은 곳마다 문서를 고칩니다. 같은 일을 다른 사람이 30분 안에 끝내면 통과입니다. 체크리스트 8개를 모두 참으로 만든 뒤에야 납품이라고 부릅니다.`,
      code: `# 별빛 인테리어 스튜디오 할 일 서비스 인수인계 문서 (가상 사례)

작성일 2026-11-12 / 버전 v1.0 / 작성자 개발자 / 인수자 스튜디오 운영 담당

## 1. 한눈에 보기
- 주소 https://todo.example.com (example.com은 문서용 예시 도메인)
- 구성 브라우저 -> Caddy(HTTPS) -> 컨테이너 1개(FastAPI가 API와 화면을 함께 제공) -> SQLite 파일(/data/todo.db)
- 사용자 직원 5명, 각자 로그인해 자기 목록만 본다. 가입은 닫혀 있고 관리자가 계정을 만든다.

## 2. 소유 계정 (모두 스튜디오 명의, 개발자는 위임 접근만)
| 항목 | 소유자 | 어디서 | 비고 |
| 도메인 | 스튜디오 | 등록 업체 콘솔 | 만료일 2027-11-12, 자동 갱신 켬 |
| DNS A 레코드 | 스튜디오 | 같은 콘솔 | todo -> 서버 IP |
| 서버(VPS) | 스튜디오 | 호스팅 콘솔 | 1 vCPU / 1 GB, 월 비용은 4절 |
| 소스 저장소 | 스튜디오 | Git 호스팅 | main 브랜치가 배포 기준 |

## 3. 환경 변수 (서버의 /opt/todo/app.env, 저장소에는 없다)
| 이름 | 값 예시 | 설명 |
| DB_PATH | /data/todo.db | 볼륨 경로, 바꾸면 데이터가 새로 시작된다 |
| CORS_ORIGINS | (빈 값) | 같은 오리진 배포라 비워 둔다 |
| TOKEN_TTL_HOURS | 12 | 로그인 유지 시간 |
| FRONTEND_DIR | /app/frontend | 이미지 안 화면 파일 위치 |

## 4. 비용 (2026-11 기준 공식 가격표를 보고 적은 값)
- 서버 월 4~6 USD대, 도메인 연 1회 갱신비, 인증서 무료(자동 갱신)

## 5. 배포 절차 (새 버전 올리기, 약 10분)
1. 로컬에서 docker build -t todo:새태그 . 후 docker run으로 /api/health 확인
2. 서버에서 이미지를 받고 기존 컨테이너를 멈춰 이름을 바꿔 둔다: docker stop todo, docker rename todo todo-old (DB 파일은 한 번에 컨테이너 하나만 쓴다)
3. docker run -d --name todo --restart unless-stopped -p 127.0.0.1:8000:8000 -v todo-data:/data --env-file /opt/todo/app.env todo:새태그
4. https://todo.example.com 접속, 로그인, 항목 추가가 되면 docker rm todo-old
5. 문제가 있으면 되돌리기: docker rm -f todo, docker rename todo-old todo, docker start todo

## 6. 백업과 복구
- 매일 03:10 docker exec todo python backup.py /data/backups 실행, 14일 보관
- 다른 장소 복사: 매일 03:30 백업 폴더를 스튜디오 클라우드 저장소로 동기화
- 복구: 컨테이너 중지 -> /data/todo.db, -wal, -shm 치우기 -> 백업 파일을 todo.db로 복사 -> 시작 -> 항목 수 확인
- 마지막 복구 리허설 2026-11-12, 소요 8분, 항목 수 일치 (기록 파일 첨부)

## 7. 장애 대응표
| 증상 | 먼저 볼 것 | 조치 |
| 접속 불가 | docker ps, caddy 상태 | docker start todo, systemctl restart caddy |
| 인증서 오류 | DNS A 레코드, 80/443 열림 | 재시도를 반복하지 말고 원인부터 (발급 제한 있음) |
| 로그인이 갑자기 풀림 | 서버 시간, TOKEN_TTL_HOURS | 시간 동기화 확인 후 재로그인 |
| 목록이 비어 보임 | DB_PATH, 볼륨 마운트 | 컨테이너 설정을 5절 3번과 비교 |

## 8. 알려진 제한과 다음 후보
- 비밀번호 재설정은 없다 (관리자가 새 비밀번호로 계정을 다시 만든다)
- 단일 서버라 서버가 멈추면 복구 전까지 서비스가 중단된다
- 다음 후보: 비밀번호 재설정 메일, 접속 모니터링 알림

## 9. 인수 확인 서명
항목 8개 중 8개 통과 / 인수자 ____ / 날짜 ____ / 개발자 ____ / 보증 기간 30일 (결함 수정)`,
      codeLang: `text`,
      key: [
        `납품은 내가 없어도 의뢰인이 운영할 수 있는 상태다. 인수인계 문서는 부록이 아니라 납품물이다`,
        `문서의 절 구성은 읽는 사람의 질문 순서를 따른다. 무엇·누구 명의·설정값·배포·복구·장애 대응·한계`,
        `환경 변수 표에는 값이 아니라 위치를 적고, 비밀은 비밀번호 관리자로 전달한 뒤 인수 직후 교체한다`,
        `납품 체크리스트는 된다/안 된다로 답하는 8개 문장이다. 다른 사람에게 시켜 보는 문서 리허설(30분)이 첫 항목이다`,
        `견적에는 배포·백업·문서·인수 시간을 별도 항목으로 넣는다. 코드 밖의 일이 전체의 큰 몫이다`
      ],
      pitfalls: [
        `문서를 납품 직전 기억으로 한 번에 쓰는 것. 내가 아는 것을 빼먹으므로 반드시 남이 따라 해 보며 고친다`,
        `비밀번호·토큰 값을 문서나 메신저에 평문으로 적는 것. 문서가 공유되는 순간 비밀도 공유된다`,
        `보증 범위와 기간을 적지 않아 몇 달 뒤 신규 기능 요청이 무상 수정으로 오는 것`,
        `체크리스트를 내가 혼자 확인하고 끝내는 것. 의뢰인이 직접 시나리오를 수행하는 인수 테스트가 없으면 서명받기 어렵다`
      ]
    }
  ],
  labs: [
    {
      title: `마감일 기능을 DB부터 화면까지: 데이터를 지우지 않고`,
      scenario: `스튜디오 직원들이 '현장 방문일 전에 끝내야 하는 일'을 눈에 띄게 구분하고 싶다며 할 일마다 마감일을 넣게 해 달라고 합니다. 문제는 직원들이 이미 서비스를 쓰고 있어 항목이 쌓여 있다는 점입니다. 개발 중에는 todo.db를 지우고 새로 만들면 그만이었지만 이번에는 그럴 수 없습니다. 계약표, 스키마 변경, API, 화면, 데모 서버를 한 줄기로 고치되 기존 데이터를 한 건도 잃지 않는 것이 목표입니다. 정답 코드는 주어지지 않습니다. 레슨 1~7의 방식을 스스로 확장하세요.`,
      steps: [
        `계약표에 ‹due› 필드를 먼저 적습니다. 형식은 YYYY-MM-DD 문자열 또는 null이고, 생성 때는 선택이며, PATCH로 바꾸거나 지울 수 있어야 합니다`,
        `작업 전에 ‹python backup.py backups›로 현재 DB를 백업하고 항목 수를 적어 둡니다`,
        `‹db.py›에 스키마 버전 관리를 만듭니다. ‹PRAGMA user_version›을 읽어 0이면 ‹ALTER TABLE todos ADD COLUMN due TEXT›를 실행하고 1로 올립니다. 서버를 몇 번 재시작해도 오류가 없어야 합니다`,
        `Pydantic 모델에 ‹due: date | None›을 추가해 잘못된 날짜(예: 2026-13-40)가 422로 막히게 하고, 응답에도 due를 포함합니다`,
        `PATCH에서 '필드를 안 보냄'과 'null을 보냄'을 구분합니다(‹body.model_fields_set›). 레슨 2의 코드는 이 둘을 구분하지 못합니다`,
        `데모 서버와 화면을 고칩니다. 날짜 입력칸을 두고, 마감일이 오늘보다 앞서고 완료되지 않은 항목만 빨간 글씨로 표시합니다(오늘은 로컬 날짜 기준 문자열 비교)`,
        `변경 후 항목 수와 due 값을 확인하고, 새 코드를 이전 버전으로 되돌리면 어떻게 되는지(컬럼은 남지만 옛 코드는 무시) 한 줄로 기록합니다`
      ],
      accept: [
        `변경 전 N개였던 항목이 변경 후에도 N개이고 기존 항목의 due는 모두 null이다 (DB 파일을 지우지 않았다)`,
        `‹PRAGMA user_version›이 1이고 서버를 두 번 재시작해도 오류가 나지 않는다`,
        `due가 2026-13-40인 POST는 422, 2026-12-24인 POST는 201이며 응답에 due가 들어 있다`,
        `‹PATCH {"done": true}›는 기존 due를 유지하고 ‹PATCH {"due": null}›은 due를 지운다. 두 요청의 결과가 서로 다르다`,
        `화면에서 마감이 지난 미완료 항목만 빨갛게 보이고, 완료한 항목과 마감일이 없는 항목은 그렇지 않다`
      ],
      stretch: `‹GET /api/todos?sort=due›로 마감일 순 정렬을 지원하고(마감일 없는 항목은 뒤로), ‹user_id, due›에 인덱스를 만든 뒤 ‹EXPLAIN QUERY PLAN›으로 인덱스가 실제로 쓰이는지 확인해 결과를 한 줄로 기록하세요.`
    },
    {
      title: `장애 리허설: 일부러 고장 내고 화면이 정해진 대로 반응하는지 확인`,
      scenario: `납품 직전에 의뢰인이 '인터넷이 느릴 때, 서버가 멈췄을 때 직원들이 당황하지 않게 해 달라'고 합니다. 오류 처리 코드를 썼다고 안전한 것이 아닙니다. 실제로 고장을 만들어 화면이 문서에 적은 대로 반응하는지 숫자로 확인해야 납품할 수 있습니다. 장애 여섯 가지를 직접 만들어 점검표를 채우세요. 특히 개발 환경(화면 5500번, API 8000번)과 배포 환경(화면과 API가 8000번 하나)에서 같은 서버 오류가 화면에 다르게 보이는 이유를 서버 로그를 근거로 설명하는 것이 이번 실습의 핵심입니다.`,
      steps: [
        `표를 만듭니다. 열은 '장애, 만드는 방법, 기대하는 화면 반응, 실측 시간, 원인 한 줄'이고 행은 아래 여섯 개입니다`,
        `서버 중지: uvicorn을 끄고 추가와 목록 조회를 해 봅니다. 문구가 나오기까지의 시간, 입력창 글 보존 여부, 다시 시도 버튼 동작을 기록합니다`,
        `느린 서버: 경로 하나에 임시로 ‹time.sleep(12)›를 넣고 쓰기와 읽기의 오류 표시까지 걸리는 시간을 잽니다. 레슨 7의 계산값과 비교합니다`,
        `서버 500: 경로에 ‹raise RuntimeError("boom")›을 넣고, 개발 환경(교차 오리진)과 uvicorn이 화면을 함께 내보내는 환경(단일 오리진)에서 화면 문구가 어떻게 다른지 비교합니다. uvicorn 로그의 상태 코드와 Network 탭을 함께 봅니다`,
        `토큰 만료: ‹UPDATE sessions SET expires_at = datetime('now','-1 minutes')›를 실행하고 다음 동작에서의 화면 변화를 확인합니다`,
        `오리진 불일치: 화면을 ‹http://localhost:5500›으로 열어 문구와 콘솔 오류를 점검표에 옮깁니다`,
        `DB 잠금: 다른 파이썬 창에서 연결을 열어 ‹BEGIN IMMEDIATE›로 쓰기 잠금을 쥔 채 두고 POST를 보냅니다. 몇 초 뒤 어떤 오류가 나는지 보고, 잠금을 풀고 '다시 시도'로 성공하는지 확인합니다`,
        `모든 재시도가 끝난 뒤 DB의 항목 수를 직접 세어 중복이 없는지 확인합니다`
      ],
      accept: [
        `점검표 여섯 행에 화면 문구, 실측 시간, 원인 한 줄이 모두 채워져 있다`,
        `어떤 장애에서도 화면이 빈 채로 멈추거나 버튼이 잠긴 채 남지 않으며, 입력창의 글은 사라지지 않는다`,
        `서버 중지는 3초 안에 안내가 뜨고, 쓰기 타임아웃은 8~9초, 응답 없는 서버의 GET은 약 25초(±2초)에 오류가 보이는 실측값이 기록되어 있다`,
        `장애 상황에서 다시 시도를 눌러 성공한 뒤에도 같은 항목이 DB에 둘 이상 생기지 않았다 (항목 수 직접 확인)`,
        `같은 500이 개발 환경에서 연결 오류처럼 보이는 이유를 'CORS 헤더가 빠진 응답' 근거(서버 로그의 500)와 함께 한 문장으로 설명했다`
      ],
      stretch: `지수 백오프에 무작위 지터(대기 시간의 ±30%)를 넣고, 실패할 때마다 ‹console.error›로 요청 경로·상태·소요 시간을 남기세요. 그다음 지터가 있는 경우와 없는 경우, 동시에 열린 탭 20개가 서버가 복구되는 순간 보내는 요청 간격이 어떻게 달라지는지 한 문단으로 정리하세요.`
    },
    {
      title: `의뢰 대응: 학원 수업 준비 체크리스트 서비스를 한 달 운영 가능하게 납품`,
      scenario: `작은 학원의 원장이 의뢰했습니다. 강사 4명이 각자 수업 준비 체크리스트를 관리하고, 원장은 전체 진행 상황을 숫자로만 확인하길 원합니다. 조건은 다섯 가지입니다. 아무나 가입하면 안 되고 원장이 정한 초대 코드를 아는 사람만 가입할 수 있어야 합니다. 통계는 원장(관리자)만 볼 수 있어야 합니다. 주소는 HTTPS여야 합니다. 데이터는 매일 백업되어야 합니다. 원장은 서버 경험이 없으므로 인수인계 문서만 보고 한 달 동안 혼자 운영할 수 있어야 합니다. 이 모듈의 프로젝트를 이 요구에 맞게 바꿔 납품 상태까지 만드세요.`,
      steps: [
        `요구사항 확인표를 씁니다. 의뢰인에게 물을 질문 5개(사용자 수, 개인정보 범위, 접속 환경, 허용 가능한 데이터 손실과 중단 시간, 도메인·호스팅 소유와 예산)를 적고 가정한 답을 달아 포함/제외 범위를 한 쪽으로 정리합니다`,
        `계약표를 고칩니다. 가입에 ‹invite_code›를 추가하고(틀리면 403), ‹GET /api/admin/stats›(관리자만, 아니면 403)를 새로 적습니다`,
        `‹users›에 ‹is_admin› 컬럼을 마이그레이션으로 추가합니다(실습 1의 방식). 환경 변수 ‹INVITE_CODE›가 없으면 가입이 모두 닫히게 하고, ‹ADMIN_EMAIL›로 가입한 계정만 관리자가 되게 합니다`,
        `관리자 전용 의존성(‹require_admin›)을 만들고 통계(가입자 수, 전체 항목 수, 완료 비율 %)를 DB 집계 한 번으로 구합니다`,
        `화면에 초대 코드 입력칸을 더하고, 관리자 계정에게만 통계 한 줄이 보이게 합니다(403이면 숨김). 데모 서버도 같은 계약으로 고칩니다`,
        `Docker 이미지를 빌드해 환경 변수로 INVITE_CODE·ADMIN_EMAIL을 주입해 실행하고, 컨테이너를 지우고 다시 만들어도 계정과 항목이 남는지 확인합니다`,
        `하루 한 번 백업이 자동 실행되도록 크론(또는 작업 스케줄러)을 설정하고 다른 폴더로 복사한 뒤 복구 리허설의 소요 시간과 항목 수를 기록합니다`,
        `레슨 10의 문서를 이 사례에 맞게 고쳐 쓰고 다른 사람(또는 환경을 초기화한 자신)에게 문서만 보고 따라 하게 합니다`,
        `납품 체크리스트 8항목을 통과/미통과와 증거 한 줄로 채웁니다`
      ],
      accept: [
        `초대 코드가 없거나 틀리면 가입이 403이고 올바른 코드면 201이며, INVITE_CODE를 설정하지 않으면 모든 가입이 403이다`,
        `강사 계정의 토큰으로 /api/admin/stats는 403이고 관리자 토큰으로는 200이며, 세 숫자가 DB를 직접 집계한 값(‹select count(*)›)과 일치한다`,
        `컨테이너를 삭제 후 재생성해도 계정과 항목이 남고, 백업 파일로 복구했을 때 항목 수가 일치하며 소요 시간이 문서에 적혀 있다`,
        `다른 사람이 인수인계 문서만 보고 30분 안에 접속·로그인에 성공했고, 막혔던 지점이 문서에 반영되어 있다`,
        `체크리스트 8개 항목마다 통과 여부와 증거(명령 결과 또는 화면 캡처)가 한 줄씩 있다`
      ],
      stretch: `토큰을 localStorage 대신 HttpOnly·SameSite 쿠키로 옮기는 변형을 설계하세요. 로그인 응답의 Set-Cookie, CORS의 credentials 설정, 상태를 바꾸는 요청에서의 CSRF 대비를 나눠 문서로 쓰고, 한 요청 경로만이라도 실제로 구현해 개발자 도구에서 JS가 쿠키를 읽을 수 없음을 확인하세요.`
    }
  ],
  quiz: [
    {
      q: `개발 중인 화면(http://localhost:5500)에서 API를 호출했더니 콘솔에 이렇게 나온다.

Access to fetch at 'http://127.0.0.1:8000/api/todos' from origin 'http://localhost:5500' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.

서버의 .env에는 CORS_ORIGINS=http://127.0.0.1:5500 이 적혀 있고 서버도 재시작했다. 가장 가능성 높은 원인은?`,
      choices: [
        `allow_methods에 PATCH가 빠져 있어 preflight가 거절된 것이다`,
        `허용 목록의 127.0.0.1:5500과 요청 오리진 localhost:5500이 일치하지 않는다`,
        `uvicorn이 꺼져 있거나 8000번 포트를 다른 프로그램이 쓰고 있어 응답 자체가 오지 않은 것이다`,
        `설정은 맞으니 CORS_ORIGINS를 ["*"]로 바꾸면 보안 문제 없이 해결되는 일시적인 오류다`
      ],
      answer: 1,
      why: `오리진은 프로토콜+도메인+포트의 정확한 일치이고, 로그의 요청 오리진(localhost:5500)은 허용 목록(127.0.0.1:5500)에 없어서 preflight 응답에 허용 헤더가 붙지 않았습니다(Starlette는 허용되지 않은 오리진의 preflight에 400을 돌려줍니다). 서버가 꺼졌다면 응답이 없다는 연결 오류가 나오지 헤더가 없다는 문구가 나오지 않습니다. 메서드가 빠졌다면 메서드가 허용되지 않는다는 문구가 따로 있습니다. ["*"]는 무엇이든 열어 주는 임시방편이고 보안 점검에서 지적받는 설정이며, 이 경우의 원인도 아닙니다.`
    },
    {
      q: `@app.get("/api/todos")
def list_todos(db=Depends(get_db), uid=Depends(current_user_id)):
    rows = db.execute("SELECT * FROM todos WHERE user_id = ? ORDER BY id", (uid,))
    return [dict(r) for r in rows]

로그인을 붙이기 전에는 current_user_id()가 None을 돌려주고, todos에는 user_id가 NULL인 행이 3개 있다. 이 요청의 결과와 이유는?`,
      choices: [
        `3개가 나온다. None은 NULL로 바인딩되고 SQL에서는 NULL끼리 같다고 비교되기 때문이다`,
        `sqlite3.ProgrammingError가 난다. None은 SQL 매개변수로 바인딩할 수 없는 값이기 때문이다`,
        `빈 목록이 나온다. user_id = NULL은 NULL 행에도 참이 되지 않아 IS로 비교해야 한다`,
        `모든 사용자의 행이 나온다. 조건 값이 NULL이면 DB가 WHERE 조건을 무시하기 때문이다`
      ],
      answer: 2,
      why: `SQL의 NULL은 '알 수 없음'이라 = 비교의 결과도 참이 아닌 NULL이 됩니다. 그래서 행이 하나도 선택되지 않고 빈 목록이 나옵니다. IS는 NULL끼리도 같다고 비교하므로 로그인 전(None)과 후(정수)를 같은 쿼리로 처리할 수 있습니다. None은 NULL로 정상 바인딩되기 때문에 예외는 나지 않고, WHERE가 무시되는 일도 없습니다. 조용히 빈 결과가 나오는 점이 이 실수의 위험한 부분입니다.`
    },
    {
      q: `의뢰인이 '무료로 충분하다'며 SQLite 파일 DB를 쓰는 이 앱을 Render의 무료 웹 서비스에 올려 달라고 한다. 일주일 뒤 '가끔 등록한 데이터가 통째로 사라지고 첫 접속이 매우 느리다'는 문의가 온다. Render 공식 문서(2026-11 기준)에 비추어 가장 알맞은 진단은?`,
      choices: [
        `무료 플랜의 파일 시스템은 일시적이라 재시작·잠들기 때마다 파일이 사라지고 깨어나는 데 약 1분 걸린다`,
        `SQLite의 WAL 모드는 클라우드 환경에서 지원되지 않아 쓰기 일부가 롤백되고, 첫 접속은 콜드 스타트로 느려진다`,
        `FastAPI 워커가 여러 개 떠서 같은 DB 파일을 서로 덮어쓰고, 첫 접속 지연은 인증서 협상 때문이다`,
        `브라우저 localStorage 용량 제한 때문에 서버 데이터가 지워지고, 첫 접속은 캐시가 비어 느려진다`
      ],
      answer: 0,
      why: `문서에 따르면 무료 웹 서비스는 15분간 요청이 없으면 잠들고, 깨어나는 데 약 1분이 걸리며, 로컬 파일 변경은 재배포·재시작·잠들기 때 사라지고 영구 디스크를 붙일 수 없습니다. 증상(데이터 소실과 느린 첫 접속)이 정확히 이 설명과 맞습니다. WAL은 같은 호스트의 파일 시스템 문제이지 클라우드 지원 여부가 아니고, 워커 수나 localStorage는 서버 DB 파일의 소실과 무관합니다. 파일 DB는 영구 저장소가 전제라는 것이 호스팅 선택의 첫 질문이며, 해결은 영구 디스크가 있는 유료 구성이나 VPS입니다.`
    },
    {
      q: `async function remove(id) {
  const res = await fetch("/api/todos/" + id, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail);
  await refresh();
}

삭제는 서버에서 정상 처리되어 DB에서 사라지는데 화면에는 콘솔 오류 'SyntaxError: Unexpected end of JSON input'이 나오고 목록이 갱신되지 않는다. 원인과 해결은?`,
      choices: [
        `서버가 깨진 JSON을 보냈으므로 FastAPI의 response_model 설정을 고쳐야 한다`,
        `DELETE는 CORS 때문에 응답 본문이 항상 비는 메서드라서 서버의 CORS 설정을 바꿔야 한다`,
        `refresh() 호출에 await가 빠져 Promise가 처리되지 않았으므로 await를 더 붙인다`,
        `204는 본문이 없어 res.json()이 실패한다. 파싱을 건너뛰고 res.ok로 판단한다`
      ],
      answer: 3,
      why: `삭제 API는 204 No Content를 돌려주므로 본문이 비어 있고, 빈 문자열을 JSON으로 읽으면 Unexpected end of JSON input이 납니다. 서버는 규칙대로 응답했으므로 서버 쪽 수정이 아니라 클라이언트가 204를 처리해야 합니다. CORS가 문제라면 응답 자체를 읽지 못하는 오류가 나지 이 메시지가 아닙니다. 이 오류가 'DB에서는 지워졌는데 화면만 안 바뀌는' 증상을 만듭니다.`
    },
    {
      q: `Traceback (most recent call last):
  File "main.py", line 41, in list_todos
    rows = db.execute("SELECT * FROM todos ORDER BY id").fetchall()
sqlite3.ProgrammingError: SQLite objects created in a thread can only be used in that same thread. The object was created in thread id 14284 and this is thread id 9132.

get_db()는 요청마다 sqlite3.connect(DB_PATH)로 연결을 만들어 yield 하는 일반(동기) 의존성이다. 가장 적절한 수정은?`,
      choices: [
        `연결을 모듈 전역에 하나만 만들어 두고 check_same_thread=False를 줘서 모든 요청이 그 연결을 함께 쓰게 한다`,
        `연결은 요청마다 따로 만들고 check_same_thread=False를 준다. 동기 의존성은 스레드풀에서 실행되기 때문이다`,
        `경로 함수를 async def로 바꾸면 이벤트 루프 스레드 하나에서만 실행되므로 항상 해결된다`,
        `WAL 모드를 끄고 journal_mode를 DELETE로 되돌리면 스레드 검사도 함께 사라진다`
      ],
      answer: 1,
      why: `FastAPI는 동기 의존성(yield)과 일반 def 경로를 스레드풀에서 실행하므로 연결을 만든 스레드와 쓰는 스레드가 달라질 수 있고, sqlite3의 기본 검사가 이를 막습니다. 연결을 요청마다 따로 만들어 한 요청이 혼자 쓰면 검사를 끄는 것이 안전합니다. 전역 연결 하나를 모든 요청이 동시에 쓰는 것은 레이스를 만드는 해법이고, 경로만 async def로 바꿔도 동기 의존성은 여전히 스레드풀에서 돌아 같은 오류가 납니다. WAL과는 무관합니다.`
    },
    {
      q: `서버 로그에는 한 번의 '추가' 클릭에 대해 이렇게 남았고 화면에는 같은 항목이 두 개 생겼다.

POST /api/todos 201   (첫 요청: 저장은 끝났지만 응답이 네트워크에서 유실되어 브라우저는 실패로 판단)
POST /api/todos 201   (클라이언트의 자동 재시도)

async function api(path, opt) {
  for (let n = 1; n <= 3; n++) {
    try { return await doFetch(path, opt); }
    catch (e) { if (n === 3) throw e; await sleep(300 * n); }
  }
}

올바른 개선은?`,
      choices: [
        `재시도 횟수를 5번으로 늘리고 대기 시간도 지수적으로 늘려서 응답이 유실되는 구간을 넘겨 버린다`,
        `타임아웃을 30초로 늘려서 응답이 유실되기 전에 서버의 응답이 먼저 도착하게 만들어 중복을 없앤다`,
        `자동 재시도는 GET만 하고 쓰기는 재시도 버튼으로 사용자가 정한다. 필요하면 멱등 키를 쓴다`,
        `서버에서 같은 text를 가진 항목은 중복으로 보고 UNIQUE 제약을 걸어 항상 거부하도록 만든다`
      ],
      answer: 2,
      why: `응답만 잃어버린 쓰기를 자동으로 다시 보내면 중복이 생기는 것은 POST가 멱등이 아니기 때문입니다. 횟수나 대기 시간, 타임아웃을 조정해도 원인(재시도 대상의 선택)이 그대로라 중복 가능성은 남습니다. 같은 text를 거부하는 것은 정당한 같은 이름의 항목('우유 사기'를 두 번)을 막는 부작용이 있고 문제의 본질도 아닙니다. 읽기만 자동 재시도하고 쓰기는 사용자가 판단하게 하거나 멱등 키로 서버가 중복을 알아보게 해야 합니다.`
    },
    {
      q: `FROM python:3.14-slim
WORKDIR /app
COPY backend/ .
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8000
CMD ["uvicorn", "main:app", "--port", "8000"]

docker run -p 8000:8000 으로 실행했고 컨테이너 로그에는 'Uvicorn running on http://127.0.0.1:8000'이 보이는데, 호스트 브라우저에서 http://127.0.0.1:8000 에 접속하면 응답 없이 끝난다. 원인은?`,
      choices: [
        `uvicorn이 127.0.0.1에만 바인드되어 있다. CMD에 --host 0.0.0.0을 줘야 한다`,
        `EXPOSE가 포트를 실제로 열어 주지 않으므로 docker run을 -p 대신 -P로 다시 실행해야 한다`,
        `CMD를 exec 형식(JSON 배열)으로 썼기 때문에 --port 인자가 uvicorn까지 전달되지 않는다`,
        `python:3.14-slim 이미지에는 네트워크 도구가 빠져 있어 컨테이너가 포트를 열지 못한다`
      ],
      answer: 0,
      why: `uvicorn의 --host 기본값은 127.0.0.1이라 컨테이너의 loopback에서만 접속됩니다. 컨테이너 밖에서 들어오는 트래픽을 받으려면 0.0.0.0으로 바인드해야 하고 로그의 주소가 단서입니다. EXPOSE는 문서화 표시일 뿐 실제 게시는 -p가 하며 이미 지정했습니다. exec 형식은 인자를 정상적으로 넘기고(오히려 권장 형식), slim 이미지에도 네트워크는 있습니다.`
    },
    {
      q: `# /srv/todo/nightly.sh (크론이 매일 03:10에 실행하는 스크립트)
cp /srv/todo/data/todo.db /srv/backups/todo-$(date +%F).db

DB는 WAL 모드이고 서비스는 24시간 켜져 있다. 한 달 뒤 복구 훈련에서 어제 백업으로 시작하니 마지막 며칠의 일부 항목이 비어 있고 가끔 'database disk image is malformed'가 난다. 가장 알맞은 설명과 대책은?`,
      choices: [
        `cp가 느려서 복사하는 동안 파일 내용이 계속 바뀐 것이므로 더 빠른 rsync로 바꾸면 해결된다`,
        `크론이 한 달에 한 번쯤 실행을 건너뛰어 그날 백업이 비는 것이므로 하루 두 번 실행한다`,
        `백업 디스크의 용량이 부족해 파일이 잘려 저장된 것이므로 용량을 늘리고 오래된 백업을 지운다`,
        `WAL 커밋이 빠진 복사본이다. backup()으로 뜨고 integrity_check로 검증한다`
      ],
      answer: 3,
      why: `SQLite 문서는 WAL 파일이 DB의 영속 상태의 일부이고 DB 파일을 따로 복사하면 커밋된 트랜잭션이 사라지거나 파일이 깨질 수 있다고 경고합니다. 증상(일부 항목 누락, malformed)이 정확히 이 설명과 맞습니다. rsync도 같은 파일 복사라서 해결이 안 되고, 실행 횟수나 용량과는 무관합니다. 백업 API(파이썬의 Connection.backup)는 서비스가 켜진 채로도 일관된 스냅숏을 만듭니다.`
    },
    {
      q: `token = secrets.token_urlsafe(32)
db.execute("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', '+12 hours'))",
           (hashlib.sha256(token.encode()).hexdigest(), user_id))
return {"access_token": token, "token_type": "bearer"}

sessions 테이블에 토큰 원문 대신 SHA-256 해시만 저장하는 이유로 가장 알맞은 것은?`,
      choices: [
        `해시는 원문보다 짧아서 sessions 테이블의 저장 공간과 인덱스 크기가 눈에 띄게 줄어들기 때문이다`,
        `서버가 나중에 필요하면 해시를 복호화해서 사용자에게 토큰 원문을 다시 보여 줄 수 있기 때문이다`,
        `유출돼도 해시로는 요청에 쓸 토큰을 만들 수 없고, 토큰은 무작위 256비트라 느린 해시가 필요 없다`,
        `SHA-256은 해시 알고리즘 중에서 가장 느려서 무차별 대입으로 토큰을 맞히기 어렵기 때문이다`
      ],
      answer: 2,
      why: `핵심은 DB 유출 시의 피해 한정입니다. 해시는 되돌릴 수 없어 서버도 원문을 복원하지 못하므로 유출된 해시로는 로그인할 수 없습니다. 토큰이 충분히 긴 무작위 값이라 사전 대입이 불가능하고 그래서 빠른 SHA-256으로 충분합니다. 비밀번호는 사람이 정하는 짧은 값이라 느린 해시(PBKDF2 등)가 필요한 점이 다릅니다. 해시는 복호화되지 않고, SHA-256은 느린 알고리즘이 아니며, 저장 공간은 이유가 아닙니다.`
    },
    {
      q: `Uncaught SecurityError: Failed to read the 'localStorage' property from 'Window': The document is sandboxed and lacks the 'allow-same-origin' flag.
    at index.html:41

let token = localStorage.getItem("token");   // 41번째 줄

학습 앱의 코드 실행 창(샌드박스 iframe)에서만 화면이 하얗게 멈추고, 내 PC에서 파일로 열면 정상이다. 가장 적절한 처리는?`,
      choices: [
        `localStorage 접근을 try/catch로 감싸고 실패하면 메모리 변수로 이어 간다. 저장은 편의 기능이다`,
        `학습 앱 쪽 sandbox 설정에 allow-same-origin을 넣어 달라고 요청해서 localStorage를 열어 둔다`,
        `토큰을 쿠키에 저장하도록 바꾼다. 쿠키는 샌드박스 안에서도 문제없이 읽고 쓸 수 있다`,
        `오류를 무시하고 토큰 검사 없이 모든 요청이 통과하도록 로그인 절차를 우회해 버린다`
      ],
      answer: 0,
      why: `샌드박스, 시크릿 창, 저장소 차단 설정에서는 localStorage 접근이 예외를 던질 수 있으므로 방어적으로 감싸고 대체 경로(메모리)로 이어 가는 것이 정석입니다. 환경을 바꿔 달라는 요청은 코드의 결함을 환경 탓으로 돌리는 것이고 앱의 보안 모델도 바꿉니다. allow-same-origin이 없는 샌드박스 문서는 특별한 오리진으로 취급되어 저장소와 쿠키 접근이 막힐 수 있으므로(MDN iframe sandbox) 쿠키도 대안이 되지 못하며, 로그인 우회는 보안 결함입니다.`
    },
    {
      q: `const tries = method === "GET" ? 3 : 1;
...
res = await fetch(url, { signal: AbortSignal.timeout(8000) });
...
await sleep(300 * 2 ** (n - 1));   // 시도 사이 대기 (마지막 시도 뒤에는 대기하지 않고 오류를 던진다)

서버가 TCP 연결은 받지만 응답을 전혀 주지 않는다. 목록 GET이 오류 메시지를 보여 주기까지 최악으로 걸리는 시간은 대략 얼마인가?`,
      choices: [
        `8초 (첫 시도의 타임아웃에서 끝난다)`,
        `약 9초 (한 번 시도 + 대기 0.9초면 끝난다)`,
        `약 16초 (두 번 시도하고 끝난다)`,
        `약 25초 (8초 × 3번 + 대기 0.9초)`
      ],
      answer: 3,
      why: `세 번의 시도가 모두 8초 타임아웃까지 가고, 시도 사이에 0.3초와 0.6초를 기다리므로 24 + 0.9 = 약 24.9초입니다. 8초는 시도가 한 번뿐일 때의 계산이고, 16초는 두 번만 센 값입니다. 서버가 아예 꺼져 연결 거부가 즉시 오는 경우와 달리 '연결은 받고 답이 없는' 경우가 가장 오래 걸리므로, 읽기 타임아웃은 평소 응답의 서너 배 정도로 짧게 잡는 편이 좋습니다.`
    },
    {
      q: `새 서버에서 Caddy를 시작했는데 도메인의 A 레코드가 아직 옛 서버 IP를 가리켜 HTTPS 인증서 발급이 실패한다. 설정이 틀렸다고 생각한 개발자가 한 시간 동안 Caddy를 열 번 재시작했다. 그 뒤 DNS를 바로잡았는데도 발급이 거절된다. Let's Encrypt 공식 문서(2026-11 기준)에 비추어 가장 알맞은 설명과 다음 행동은?`,
      choices: [
        `Let's Encrypt 서비스 장애이므로 ZeroSSL 같은 다른 인증 기관 계정을 새로 만들어야 한다`,
        `검증 실패 한도(시간당 5번)를 넘었다. 재시작을 멈추고 DNS·포트를 점검한 뒤 기다린다`,
        `인증서는 90일에 한 번만 발급할 수 있으므로 90일이 지난 뒤에 다시 시도해야 한다`,
        `와일드카드 인증서로 바꾸면 발급 제한이 적용되지 않으므로 *.도메인으로 다시 신청한다`
      ],
      answer: 1,
      why: `문서에 따르면 같은 이름(identifier)의 인증 실패는 계정당 한 시간에 5번까지이고 초과하면 제한이 풀릴 때까지 새 주문이 막힙니다. 원인은 DNS가 반영되기 전의 반복 시도이므로 반복 재시작을 멈추고 DNS와 80·443 포트를 점검한 뒤 제한이 풀리길 기다립니다. 90일은 인증서의 유효 기간이지 발급 간격이 아니고, 와일드카드는 DNS-01 검증이 필요할 뿐 제한을 면제하지 않으며, 장애라고 단정할 근거도 없습니다. Caddy는 Let's Encrypt가 실패하면 ZeroSSL로도 시도하므로 계정을 새로 만들 일이 아닙니다. 실험은 스테이징에서 하고, 스테이징은 제한이 훨씬 높아 설정 실험에 알맞습니다.`
    }
  ],
  refs: [
    {
      title: `MDN: Cross-Origin Resource Sharing (CORS)`,
      url: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS`,
      kind: `doc`,
      why: `단순 요청과 preflight 요청의 조건, 허용 헤더가 없는 응답을 브라우저가 어떻게 막는지, 오류 상세가 JS에 전달되지 않는다는 점을 정리한 기준 문서입니다(레슨 3·7).`
    },
    {
      title: `MDN: Access-Control-Allow-Headers`,
      url: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Headers`,
      kind: `doc`,
      why: `Authorization 헤더는 와일드카드로 허용되지 않고 명시해야 한다는 규칙의 출처입니다. 토큰 인증을 붙일 때 CORS 설정이 빠지는 지점입니다(레슨 3).`
    },
    {
      title: `Starlette: Middleware (CORSMiddleware)`,
      url: `https://starlette.dev/middleware/`,
      kind: `doc`,
      why: `FastAPI의 CORSMiddleware가 쓰는 인자와 기본값, preflight의 200·400 응답, 처리되지 않은 예외 응답에서 CORS 헤더가 빠지는 상황의 주의점이 있습니다(레슨 3).`
    },
    {
      title: `MDN: Using the Fetch API`,
      url: `https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch`,
      kind: `doc`,
      why: `fetch가 404 같은 오류 상태에서는 reject되지 않으므로 res.ok를 확인해야 한다는 점과 AbortController로 요청을 취소하는 방법을 설명합니다(레슨 4·7). 타임아웃용 AbortSignal.timeout()은 MDN의 별도 문서에 있고 2024-04부터 주요 브라우저에서 지원됩니다.`
    },
    {
      title: `RFC 6750: The OAuth 2.0 Authorization Framework: Bearer Token Usage`,
      url: `https://www.rfc-editor.org/rfc/rfc6750`,
      kind: `rfc`,
      why: `Authorization: Bearer 헤더 형식, 401과 WWW-Authenticate 응답, 베어러 토큰은 TLS 위에서만 보내야 한다는 요구의 원문입니다(레슨 5·9). 이후 RFC 9700 등이 일부를 갱신했습니다.`
    },
    {
      title: `OWASP Cheat Sheet: Password Storage`,
      url: `https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html`,
      kind: `doc`,
      why: `Argon2id 우선, PBKDF2-HMAC-SHA256 600,000회 등 비밀번호 저장 알고리즘과 반복 횟수의 현재 권장치(2026-11 확인)와 솔트 지침을 담았습니다(레슨 5).`
    },
    {
      title: `OWASP Cheat Sheet: HTML5 Security (Local Storage)`,
      url: `https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html`,
      kind: `doc`,
      why: `세션 식별자를 localStorage에 두지 말라는 근거(XSS 한 번이면 접근 가능)와 sessionStorage·HttpOnly 쿠키 대안을 설명합니다(레슨 6).`
    },
    {
      title: `The Twelve-Factor App: III. Config`,
      url: `https://12factor.net/config`,
      kind: `doc`,
      why: `설정을 코드에서 분리해 환경 변수로 두는 이유와 '비밀을 노출하지 않고 코드를 공개할 수 있는가'라는 점검 기준을 줍니다(레슨 3).`
    },
    {
      title: `Python docs: sqlite3 (Connection.backup, check_same_thread)`,
      url: `https://docs.python.org/3/library/sqlite3.html`,
      kind: `doc`,
      why: `백업 메서드의 사용법, 스레드 안전성 설명, with 문이 트랜잭션만 처리하고 연결을 닫지 않는다는 사실, sqlite3.Row를 확인할 수 있습니다(레슨 1·9).`
    },
    {
      title: `SQLite: Write-Ahead Logging`,
      url: `https://www.sqlite.org/wal.html`,
      kind: `doc`,
      why: `WAL의 동작, 읽기·쓰기의 동시성, 네트워크 파일 시스템 제약, DB 파일을 WAL 파일과 따로 복사하면 커밋이 사라질 수 있다는 경고의 출처입니다(레슨 1·9).`
    },
    {
      title: `Caddy: Automatic HTTPS`,
      url: `https://caddyserver.com/docs/automatic-https`,
      kind: `doc`,
      why: `도메인 DNS·80/443 포트·영구 데이터 디렉터리라는 조건과 인증서 자동 발급·갱신·HTTP 리다이렉트 동작을 정리했습니다(레슨 9).`
    },
    {
      title: `Let's Encrypt: Rate Limits`,
      url: `https://letsencrypt.org/docs/rate-limits/`,
      kind: `doc`,
      why: `같은 이름 조합의 7일 5장 제한, 계정당 검증 실패 시간당 5번 제한, 실험은 스테이징에서 하라는 안내가 있습니다(문서 갱신일 2026-08-05, 수치는 바뀔 수 있으니 확인). 인증서 기본 수명 90일은 같은 사이트의 FAQ·profiles 문서에서 확인했습니다.`
    },
    {
      title: `Render Docs: Free Instance Types`,
      url: `https://render.com/docs/free`,
      kind: `doc`,
      why: `무료 웹 서비스의 15분 잠들기, 약 1분 재기동, 일시적 파일 시스템, 영구 디스크 불가를 확인할 수 있습니다(2026-11 기준, 레슨 8). 같은 사이트의 disks 문서에 유료 디스크의 제약이 있습니다.`
    },
    {
      title: `Fly.io Docs: Pricing`,
      url: `https://docs.fly.io/about/pricing`,
      kind: `doc`,
      why: `무료 플랜 없이 종량제라는 점, 소형 머신·볼륨·스냅숏 가격 구조를 확인합니다(2026-11 기준). 견적 직전에 반드시 다시 열어 보세요(레슨 8).`
    }
  ],
  gigs: [
    `전형적인 의뢰는 '로그인이 있는 간단한 업무용 웹앱을 만들어 서버에 올려 달라'입니다. 견적 전에 확인할 것: 사용자 수와 동시 접속, 저장하는 정보에 개인정보가 있는지, 휴대폰 사용 여부, 도메인과 호스팅을 이미 갖고 있는지, 허용 가능한 데이터 손실과 중단 시간(RPO·RTO), 가입 방식(개방·초대·관리자 생성), 관리자 기능, 소스 인도와 계정 소유, 유지보수 범위. 이 질문표 자체가 전문가로 보이게 하는 산출물이니 레슨 1의 계약표와 함께 제안서에 넣으세요.`,
    `견적은 기능 단위에 더해 코드 밖의 고정 항목(환경 구성, 도메인·HTTPS, 백업과 복구 리허설, 문서, 인수 테스트)을 별도 줄로 적습니다. 레슨 10의 가상 사례는 42시간에 예비 30%를 더한 약 55시간이었고, 코드 밖의 일이 약 3할이었습니다. 이 비율은 경험칙이니 자신의 작업 기록으로 보정하세요. 요구가 바뀌면 계약표(API 계약) 변경이 곧 변경 요청 단위가 됩니다. '필드 하나만 추가'도 DB·API·화면·데모·문서를 모두 건드리므로 기능 단가에 반영합니다.`,
    `호스팅은 의뢰인 명의 계정과 결제 수단으로 만들고 개발자는 위임 접근만 받는 것이 원칙입니다. 2026-11 기준 공식 가격표에서 VPS는 DigitalOcean이 월 4달러·6달러대, Hetzner가 월 5.49유로(VAT 별도)부터였고 Fly.io 소형 머신은 월 2.19달러 수준이었습니다. 가격은 수시로 바뀌니 견적 날짜와 함께 적고 확정 전에 다시 확인하세요. '무료 플랜이면 충분하다'는 요청에는 잠들기와 일시적 파일 시스템 때문에 데이터가 사라질 수 있음을 설명하고, 선택을 서면에 남겨 두세요.`,
    `가입 정보(이메일·비밀번호 해시)는 개인정보일 수 있으므로 수집 고지와 처리 방침이 필요한지 의뢰인 쪽 법무나 전문가에게 확인을 요청하고, 그 결과를 문서의 '확인 필요 사항'으로 남기세요. 이 모듈은 일반 정보일 뿐 법률 자문이 아닙니다. 기술적으로는 로그에 비밀번호·토큰·이메일을 남기지 않고, 백업 파일도 개인정보를 담고 있으니 접근 권한과 보관 기간을 정해 두는 것이 최소한의 기본입니다.`,
    `유지보수는 월 정액 계약으로 분리합니다. 포함 범위의 예: 백업 성공 여부 확인, 베이스 이미지·의존성 보안 업데이트, 인증서·도메인 만료 알림 점검, 장애 대응 시간(예: 근무시간 내 응답). 신규 기능은 별도 견적입니다. 인수 후 일정 기간(예: 30일)의 결함 수정은 무상 보증으로 구분해 문서에 적으세요. 보증과 유지보수를 섞으면 몇 달 뒤 신규 기능 요청이 무상 수정으로 들어옵니다.`,
    `흔한 함정: '관리자 화면 하나만 더', 비밀번호 재설정 메일(메일을 보내려면 도메인 인증 같은 별도 설정과 외부 서비스가 필요), 앱스토어용 앱, 소셜 로그인, 실시간 알림 같은 요청이 처음 범위에 슬쩍 들어옵니다. 제안서에 '포함'과 '제외'를 두 칸 표로 적고 서명받으세요. 또 의뢰인이 모르는 사이 서버나 도메인을 내 개인 계정에 두면 계약 종료 때 분쟁이 됩니다.`,
    `납품 뒤에는 추가 견적 단위로 확장을 제안할 수 있습니다: 비밀번호 재설정 메일, 관리자의 사용자 관리 화면, 접속 모니터링과 장애 알림, PostgreSQL 이전, HttpOnly 쿠키 전환, 자동 배포(CI/CD), 감사 로그. 포트폴리오에는 완성 서비스보다 계약표·장애 점검표·복구 리허설 기록·인수인계 문서 샘플을 함께 보여 주면 '만들고 끝'이 아니라 '운영까지 책임지는' 사람이라는 신호가 됩니다.`
  ]
};
