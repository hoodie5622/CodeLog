(window.PRO_MODULES = window.PRO_MODULES || {})["pj-fetch"] = {
  id: "pj-fetch",
  summary: `가짜 서버 함수 위에 fetch·async/await, 네 가지 화면 상태, 디바운스와 요청 취소, 페이지네이션, 캐시와 재시도를 한 단계씩 쌓아 데이터 대시보드를 혼자 만들고, CORS와 API 키 규칙을 지켜 실제 API로 갈아 끼울 수 있다.`,
  hours: 28,
  goals: [
    `Promise의 세 상태와 async/await의 실행 순서를 설명하고, fetch의 두 단계(헤더 도착, 본문 읽기)·res.ok 검사·JSON 해석 실패를 코드로 처리할 수 있다.`,
    `지연, HTTP 오류, 네트워크 실패, 깨진 응답을 모드로 일으키는 가짜 서버 함수를 만들어 실제 서버 없이 모든 실패 경로를 결정적으로 재현할 수 있다.`,
    `status 값 하나로 로딩·성공·오류·빈 상태 화면을 관리하고, 서버와 사용자의 문자열을 이스케이프해 XSS를 막을 수 있다.`,
    `디바운스와 AbortController로 입력마다 나가는 불필요한 요청을 줄이고, 오래된 응답이 새 화면을 덮는 경합을 로그로 증명하며 막을 수 있다.`,
    `검색·정렬·페이지 조건을 주소 하나로 표현하고, 조건이 바뀌면 page를 1로 되돌리는 규칙과 offset 방식의 한계를 설명할 수 있다.`,
    `TTL 캐시와 지터가 있는 지수 백오프 재시도를 구현하고, 4xx·취소·비멱등 요청처럼 재시도하면 안 되는 경우를 가려낼 수 있다.`,
    `동일 출처 정책과 CORS 프리플라이트를 설명하고, API 키를 화면 코드에 두지 않는 프록시 구조와 가짜 서버를 진짜 fetch로 바꾸는 교체 지점을 설계할 수 있다.`,
    `서로 독립인 요청(목록·차트)의 실패를 분리하고 즐겨찾기를 안전하게 저장하는 확장을 고객 요구에 맞춰 추가하고 인수 점검표로 납품할 수 있다.`
  ],
  lessons: [
    {
      title: `JSON과 fetch 기본: Promise와 async/await로 기다리는 코드 쓰기`,
      body: `이 모듈에서는 책 목록 대시보드를 한 단계씩 만듭니다. 할 일 앱의 데이터는 내 브라우저 안에만 있었지만, 이제 화면은 내 컴퓨터 밖에 있는 데이터를 기다려야 합니다. 로딩 화면, 오류 처리, 취소, 캐시 같은 실무 문제가 전부 이 기다림에서 생깁니다. 실제 서버는 쓰지 않고 가짜 서버 함수로 연습하며, 7강에서 진짜 fetch로 바꾸는 법을 배웁니다.

### 왜 기다림이 문제인가
브라우저의 자바스크립트는 한 번에 한 작업만 실행합니다. MDN은 이를 작업 큐와 이벤트 루프로 설명하고, 실행 중인 작업은 끝나기 전에 끼어들 수 없다고 말합니다. 서버 응답은 보통 수십에서 수천 밀리초가 걸리고, 화면 한 프레임이 약 16ms이니 응답 300ms는 프레임 열여덟 개 분량입니다. 그동안 코드가 멈춰 서 있으면 버튼도 스크롤도 먹통이 됩니다. 그래서 결과가 오면 알려 달라고 맡겨 두고 다른 일을 계속하는 방식이 필요하고, 그 약속의 표준 형태가 Promise입니다.

### Promise는 미래 값의 영수증
- 상태는 pending(대기), fulfilled(성공), rejected(실패) 셋이고, 한 번 정해지면(settled) 바뀌지 않습니다.
- ‹new Promise(실행함수)›의 실행함수는 즉시 실행되고, ‹then›으로 단 콜백은 현재 코드가 모두 끝난 뒤에 실행됩니다.
- ‹async› 함수는 항상 Promise를 돌려주고, ‹await›는 그 함수만 멈춥니다. 브라우저 전체는 멈추지 않아 클릭 같은 다른 이벤트는 계속 처리됩니다.
- reject된 Promise를 ‹await›하면 그 자리에서 예외가 던져지므로 평범한 ‹try/catch›로 잡습니다.

### async/await는 then의 다른 표기다
‹const res = await fakeFetch(url)›는 ‹fakeFetch(url).then(res => { 이어지는 줄들 })›와 같은 일을 합니다. await 아래의 줄들이 then에 넘긴 콜백 본문이 되고 ‹try/catch›가 ‹catch›에 해당합니다. 코드가 위에서 아래로 읽힐 뿐 동작 방식은 같습니다. 순서를 직접 느껴 보려면 이 예를 보세요. 함수 f가 "1"을 찍고 ‹await›를 만나 멈추면 호출한 쪽이 먼저 "2"를 찍고, 그 뒤에야 f가 이어져 "3"을 찍습니다. 출력 순서는 1, 2, 3입니다. 이 감각이 없으면 await 아래 줄이 지금 바로 실행될 것처럼 착각해 데이터가 오기 전에 화면을 그리는 버그를 만듭니다.

### 순차와 병렬은 시간이 다르다
서로 상관없는 요청 둘을 ‹await›로 이어 쓰면 500ms + 500ms = 1000ms가 걸리고, ‹Promise.all›로 동시에 출발시키면 500ms입니다. 의존 관계가 있을 때만 순차로 쓰는 것이 기본기입니다. 단 ‹Promise.all›은 하나라도 실패하면 전체가 reject되므로, 일부 실패를 허용하려면 각자 ‹try/catch›를 두거나 ‹Promise.allSettled›를 씁니다(8강).

### JSON: 네트워크에는 문자열만 흐른다
서버는 객체를 ‹JSON.stringify›로 문자열로 만들어 보내고, 클라이언트가 ‹JSON.parse›로 되돌립니다. 키와 문자열은 큰따옴표만 허용되고 마지막 쉼표도 안 됩니다. 함수와 정의되지 않은 값은 객체 안에서 사라지고, Date는 ISO 형식 문자열로 바뀌어 전달되므로 받는 쪽에서는 날짜가 Date 객체가 아니라 문자열입니다(MDN). 형식이 깨진 문자열은 ‹SyntaxError›를 던지며, 이 오류는 2강에서 일부러 만들어 봅니다.

### fetch는 두 단계이고, 404도 성공이다
‹fetch›는 상태 코드와 헤더가 도착하면 Response로 이행하고, 본문은 ‹res.json()›으로 한 번 더 기다려 읽습니다. 가장 흔한 오해는 404나 500에서 fetch가 reject된다는 믿음입니다. MDN에 따르면 fetch는 HTTP 오류 상태에서도 이행되므로 ‹res.ok›(상태가 200대인지)를 직접 검사해야 합니다. reject되는 경우는 네트워크 실패, CORS 차단, 취소처럼 응답 자체를 받지 못했을 때입니다.

이번 단계의 ‹fakeFetch›는 이 모양을 그대로 흉내 냅니다. 설계 결정은 진짜 fetch와 같은 인터페이스(‹ok›, ‹status›, ‹json()›)를 지키는 것입니다. 그래야 7강에서 코드 한 줄만 바꿔 진짜 서버로 갈아 끼울 수 있습니다.

### 확인
실행하면 **책 불러오기**는 0.5초 뒤 책 3권을 목록에 띄우고 로그에 "성공"을 찍어야 합니다. **없는 주소 요청**은 "실패: HTTP 404"를 찍고 목록은 바뀌지 않아야 합니다. **순차 vs 병렬**은 순차가 약 1000ms, 병렬이 약 500ms로 찍혀야 합니다. 코드를 .html 파일로 저장해 브라우저에서 열면 개발자 도구(F12)의 Console과 Network 탭도 함께 쓸 수 있습니다.

### 혼자 해 보기
‹fakeFetch›에 ‹/api/books/2› 주소를 추가해 책 한 권만 돌려주고, 없는 번호는 404가 되게 하세요. 버튼을 하나 더 달아 "SQL 실전"과 "실패: HTTP 404"가 로그에 각각 찍히면 성공입니다.`,
      code: `<!doctype html>
<html lang="ko">
<meta charset="utf-8">
<title>책 대시보드 1단계</title>
<style>body{font:15px system-ui;max-width:560px;margin:12px auto;padding:0 12px}li{padding:4px 0}
#log{background:#111;color:#9f9;padding:8px;min-height:90px;font:12px monospace}</style>
<body>
<button id="ok">책 불러오기</button> <button id="bad">없는 주소 요청</button> <button id="two">순차 vs 병렬</button>
<ul id="list"></ul>
<div id="log"></div>
<script>
const $ = id => document.getElementById(id);
const log = m => $('log').append(m, document.createElement('br'));

// 가짜 서버가 가진 데이터. 네트워크 위로는 이런 "JSON 문자열"만 오간다.
const SERVER_TEXT = JSON.stringify({ items: [
  { id: 1, title: '파이썬 입문', price: 15000 },
  { id: 2, title: 'SQL 실전', price: 18000 },
  { id: 3, title: '리눅스 가이드', price: 21000 } ] });

// fetch와 같은 모양: 0.5초 뒤에 { ok, status, json() }으로 이행(resolve)되는 Promise
function fakeFetch(url) {
  return new Promise(resolve => setTimeout(() => {
    if (url !== '/api/books') return resolve({ ok: false, status: 404, json: async () => ({}) });
    resolve({ ok: true, status: 200, json: async () => JSON.parse(SERVER_TEXT) });
  }, 500));
}

async function loadBooks(url) {
  const res = await fakeFetch(url);                    // 1단계: 상태 코드와 헤더가 도착
  if (!res.ok) throw new Error('HTTP ' + res.status);  // 404는 reject가 아니라 ok:false 로 온다
  const data = await res.json();                       // 2단계: 본문 문자열을 객체로 해석
  return data.items;
}

$('ok').onclick = async () => {
  log('요청 시작'); $('list').textContent = '';
  try {
    for (const b of await loadBooks('/api/books')) {
      const li = document.createElement('li'); li.textContent = b.title + ' - ' + b.price + '원'; $('list').append(li);
    }
    log('성공');
  } catch (e) { log('실패: ' + e.message); }
};
$('bad').onclick = async () => { try { await loadBooks('/api/nothing'); } catch (e) { log('실패: ' + e.message); } };
$('two').onclick = async () => {
  let t = performance.now();
  await loadBooks('/api/books'); await loadBooks('/api/books');           // 하나 끝난 뒤 다음: 순차
  log('순차 ' + Math.round(performance.now() - t) + 'ms'); t = performance.now();
  await Promise.all([loadBooks('/api/books'), loadBooks('/api/books')]);  // 동시에 출발: 병렬
  log('병렬 ' + Math.round(performance.now() - t) + 'ms');
};
</script>
`,
      codeLang: `html`,
      key: [
        `Promise는 pending에서 fulfilled 또는 rejected로 딱 한 번 바뀌는 미래 값의 영수증이다.`,
        `await는 그 async 함수만 멈추고 브라우저는 계속 일하며, reject는 try/catch로 잡는다.`,
        `fetch는 두 단계(헤더 도착, 본문 읽기)이고 404·500도 이행되므로 res.ok를 반드시 검사한다.`,
        `서로 독립인 요청은 Promise.all로 병렬 실행한다(500ms + 500ms 순차 1000ms, 병렬 500ms).`,
        `네트워크에는 문자열만 오가며 JSON.parse 실패는 SyntaxError다.`
      ],
      pitfalls: [
        `res.ok 검사 없이 res.json()만 호출해 404 본문을 정상 데이터처럼 쓰고, 한참 뒤 render 안에서 엉뚱한 TypeError를 만난다.`,
        `독립 요청을 await 두 줄로 이어 써서 로딩 시간이 두 배가 된다.`,
        `await를 빼먹고 Promise 객체 자체를 데이터처럼 쓴다. 예를 들어 const data = loadBooks()의 data는 결과가 아니라 대기 중인 Promise다.`,
        `async 함수 호출부에 try/catch나 catch를 달지 않아 reject가 화면에는 아무 표시도 없이 콘솔에만 남는다.`
      ]
    },
    {
      title: `가짜 서버 함수로 연습하기: 지연과 실패를 내 손으로 만든다`,
      body: `실제 API로 바로 연습하면 학습이 막힙니다. 서버가 느려지거나 실패하는 순간을 내가 원할 때 만들 수 없고, 호출 한도·키·CORS 문제가 섞여 무엇을 배우는지 흐려지며, 인터넷이 없거나 이 학습 앱처럼 네트워크가 막힌 환경에서는 아예 실행되지 않습니다. 현업 프런트엔드 개발자도 서버가 아직 없을 때 같은 이유로 가짜(mock) 서버를 먼저 세웁니다.

### 설계 결정: 모양은 진짜와 같게, 행동은 내 마음대로
‹fakeApi(url)›는 fetch처럼 ‹{ ok, status, json() }›로 이행되는 Promise를 돌려줍니다. 서버 쪽은 응답을 JSON 문자열로 만들고 클라이언트가 ‹json()›에서 파싱합니다(1강의 원칙). 가짜 서버의 상태는 ‹SIM› 객체 하나(지연 ms, 모드)로 조절합니다. 책 40권은 규칙으로 만든 고정 데이터라 실행할 때마다 결과가 같습니다. 재현 가능한 실패는 디버깅의 전제 조건이므로, 이 모듈의 실패는 무작위가 아니라 모드 선택으로 일으킵니다. 이 가짜 서버는 훗날 자동 테스트에서 실제 서버를 대신하는 대역으로도 그대로 쓰이고, 고객에게 서버 준비 전 시연을 할 때도 유용합니다.

### 실패의 네 가지 얼굴
| 상황 | fetch에서의 모습 | 가짜 서버 모드 |
| 서버에 닿지 못함 | Promise가 reject, TypeError | 오프라인 |
| 서버가 실패 코드로 응답 | 이행됨, ok가 false, status 503 | 오류 |
| 200인데 본문이 JSON이 아님 | 이행됨, json()이 SyntaxError로 reject | 깨진 응답 |
| 응답이 너무 느림 | 오래 pending | SIM.delay |

세 번째가 의외로 흔합니다. 앞단 프록시, CDN, 점검 페이지가 오류를 HTML로 돌려주면서 상태는 200일 수 있어서, ok만 믿으면 파싱 단계에서 뜻밖의 곳이 터집니다. 네 번째와 관련해, fetch에는 타임아웃 옵션이 없어서 시간 제한은 취소 신호로 직접 걸어야 합니다(4강, 7강).

### getJSON: 모든 응답이 지나가는 하나의 문
‹getJSON›은 ‹ok›를 검사하고, 실패면 ‹status›를 붙인 ‹Error›를 던지고, 성공이면 파싱한 객체만 돌려줍니다. 앞으로 만들 화면, 재시도, 캐시는 Response를 직접 만지지 않고 이 함수만 부릅니다. 이렇게 한 곳에 모아 두면 3강의 오류 분류, 6강의 재시도 규칙, 7강의 가짜에서 진짜로의 교체가 각각 한 지점에서 끝납니다. 핵심은 실패의 종류를 에러 객체의 ‹name›(TypeError, SyntaxError, Error)과 ‹status›로 구분할 수 있게 남기는 것입니다. 오류 문구(‹message›)는 브라우저와 엔진마다 다르므로 분기에는 쓰지 않습니다. 재시도할 오류(503, 네트워크)와 재시도하면 안 되는 오류(404)를 가르는 기준이 바로 이 값들입니다.

### 지연은 화면 설계의 재료다
Jakob Nielsen이 정리한 고전적 기준은 이렇습니다. 0.1초 안이면 즉각적이라고 느끼고, 1초까지는 지연을 알아채도 흐름이 이어지며, 그보다 길면 시스템이 일하는 중임을 알리는 표시가 필요하고, 10초를 넘으면 집중이 흩어져 진행 상황 안내가 필요합니다(Nielsen Norman Group). 기본 지연 600ms는 즉각과 1초 사이라 로딩 화면이 보이는지 바로 확인됩니다. 코드의 ‹SIM.delay›를 0이나 3000으로 바꿔 보면 로딩 화면이 깜빡이는지, 너무 오래 떠 있는지 직접 느낄 수 있습니다.

### 확인
**불러오기**를 정상 모드에서 누르면 로그에 "→ GET /api/books"와 "← 성공: 40권 중 8권 (약 600ms)"가 찍히고 목록에 8권이 보여야 합니다. 서버 상태를 **오류**로 바꾸면 "✗ Error: HTTP 503", **깨진 응답**이면 "✗ SyntaxError"로 시작하는 문장, **오프라인**이면 "✗ TypeError: Failed to fetch"가 찍혀야 합니다. 같은 버튼이 네 가지 다른 로그를 만드는 것이 이 단계의 합격 조건입니다.

### 혼자 해 보기
서버 상태에 **한도 초과**를 추가하세요. ‹done(429, '{"error":"한도 초과"}')›를 돌려주게 하면 로그에 "✗ Error: HTTP 429"가 찍힙니다. 이 오류를 6강에서 어떻게 다룰지(바로 재시도해도 되는지) 한 줄로 예측해 적어 두세요.`,
      code: `<!doctype html>
<html lang="ko">
<meta charset="utf-8">
<title>책 대시보드 2단계</title>
<style>body{font:15px system-ui;max-width:600px;margin:12px auto;padding:0 12px}.row{display:flex;gap:8px;margin:8px 0;align-items:center}
#log{background:#111;color:#9f9;padding:8px;height:150px;overflow:auto;font:12px monospace}</style>
<body>
<div class="row"><button id="go">불러오기</button> 서버 상태
  <select id="mode"><option>정상</option><option>오류</option><option>깨진 응답</option><option>오프라인</option></select></div>
<ul id="list"></ul>
<div id="log"></div>
<script>
const $ = id => document.getElementById(id), SIM = { delay: 600, mode: '정상' };   // SIM: 가짜 서버의 속도와 상태
const log = m => { $('log').append(m, document.createElement('br')); $('log').scrollTop = 1e9; };

// ---- 가짜 서버: 책 40권을 가지고 있고, 느리거나 실패하는 척한다 ----
const T = ['파이썬', '자바스크립트', 'SQL', '리눅스', '네트워크', '알고리즘', '디자인', '보안'], K = ['입문', '실전', '가이드', '레시피', '핸드북'];
const CAT = ['데이터', '웹', '데이터', '인프라', '인프라', '기초', '웹', '인프라'];
const DB = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, title: T[i % 8] + ' ' + K[i / 8 | 0], cat: CAT[i % 8], price: 12000 + i * 7 % 10 * 1000, rating: (30 + i * 11 % 21) / 10 }));
function handle(url) {
  const p = new URL(url, 'http://fake').searchParams, q = (p.get('q') || '').toLowerCase();
  const rows = DB.filter(b => b.title.toLowerCase().includes(q));
  return { total: rows.length, items: rows.slice(0, 8) };
}
function fakeApi(url) {
  return new Promise((resolve, reject) => setTimeout(() => {
    const done = (status, text) => resolve({ ok: status < 400, status, json: async () => JSON.parse(text) });
    if (SIM.mode === '오프라인') reject(new TypeError('Failed to fetch'));   // 연결 자체가 실패: Promise가 reject
    else if (SIM.mode === '오류') done(503, '{"error":"점검 중"}');           // 답은 왔지만 실패 코드
    else if (SIM.mode === '깨진 응답') done(200, '<html>점검 중</html>');     // 200인데 JSON이 아님
    else done(200, JSON.stringify(handle(url)));
  }, SIM.delay));
}

// ---- 클라이언트: 응답을 믿을 수 있는 값으로 바꾸는 단 한 곳 ----
async function getJSON(url) {
  const res = await fakeApi(url);
  if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status), { status: res.status });
  return res.json();
}
const li = text => Object.assign(document.createElement('li'), { textContent: text });
$('mode').onchange = () => { SIM.mode = $('mode').value; };
$('go').onclick = async () => {
  const t = performance.now(), ms = () => Math.round(performance.now() - t) + 'ms';
  log('→ GET /api/books');
  try {
    const d = await getJSON('/api/books');
    $('list').replaceChildren(...d.items.map(b => li(b.title + ' ' + b.price + '원')));
    log('← 성공: ' + d.total + '권 중 ' + d.items.length + '권 (' + ms() + ')');
  } catch (e) { log('✗ ' + e.name + ': ' + e.message + ' (' + ms() + ')'); }
};
</script>
`,
      codeLang: `html`,
      key: [
        `가짜 서버는 진짜 fetch와 같은 모양(ok, status, json())을 지켜야 나중에 한 줄로 교체된다.`,
        `실패는 네 가지다. 연결 실패(reject), 오류 상태(ok가 false), 깨진 본문(json() 실패), 느림.`,
        `모든 응답은 getJSON 한 곳을 통과시키고, 실패는 name과 status로 분류할 수 있게 남긴다.`,
        `실패 재현은 무작위가 아니라 모드로 결정적으로 만든다.`
      ],
      pitfalls: [
        `가짜 서버가 항상 성공만 해서 실패 경로 코드가 한 번도 실행되지 않은 채 납품된다.`,
        `가짜와 진짜의 응답 모양이 달라(예: 가짜는 객체를 바로 반환) 교체할 때 호출부를 전부 고친다.`,
        `200 응답이면 항상 JSON이라고 믿고 json()의 SyntaxError를 처리하지 않는다.`,
        `실패를 Math.random으로만 일으켜 가끔 안 되는데 재현이 안 되는 상태에 빠진다.`
      ]
    },
    {
      title: `로딩·성공·오류·빈 상태: 화면은 status 하나의 함수다`,
      body: `화면은 지금 어떤 상태인가의 함수여야 합니다. 서버 데이터를 다루는 화면에는 최소 네 가지 모습이 있습니다. 불러오는 중(loading), 성공(success), 오류(error), 성공했지만 결과가 0건인 빈 상태(empty)입니다. 이 넷을 처음부터 설계하지 않으면 고객이 가장 먼저 보는 것은 하얀 화면입니다. 느린 응답, 서버 점검, 오타 검색은 개발 PC에서는 드물지만 사용자에게는 일상입니다. 3강부터 코드에는 ★ 주석이 붙은 줄이 나옵니다. 그 단계에서 새로 생기거나 바뀐 줄이라는 표시이므로, 코드가 길어져도 ★ 줄만 읽으면 새 내용을 놓치지 않습니다.

### 설계 결정: 불리언 여러 개 대신 status 하나
isLoading, isError, isEmpty를 따로 두면 로딩 중이면서 오류인 모순된 조합이 생기고, 그 조합을 처리하는 if가 늘어납니다. 대신 ‹S.status›에 'idle', 'loading', 'success', 'error' 중 하나만 담습니다. 빈 상태는 별도 status가 아니라 success이면서 ‹items.length›가 0인 경우로 둡니다. 값이 하나면 모순이 구조적으로 불가능합니다.

흐름은 항상 같습니다. ‹load()›가 status를 바꾸고(상태 변경은 한 곳), ‹render()›가 status를 읽어 화면을 통째로 다시 그립니다(그리기도 한 곳). 클릭 핸들러가 화면을 직접 만지기 시작하면 코드가 서로 어긋나므로, 상태에서 화면으로 한 방향만 허용하는 것이 규칙입니다.

### 네 화면의 설계
- 로딩: 자리 표시 문구. 응답이 매우 빠를 때는 깜빡임이 거슬리므로 표시를 300~400ms 늦추는 기법도 있습니다(랩 2).
- 오류: 사람이 읽을 문장과 다시 시도 버튼. 원인을 세 부류(네트워크, 서버 오류, 응답 해석 실패)로 나눠 안내하고, 개발자용 상세는 로그에 남깁니다.
- 빈 상태: 검색어를 되풀이해 보여 주고 다른 검색어를 암시합니다. 오류가 아니므로 붉은색을 쓰지 않습니다.
- 성공: 목록.

빈 상태와 오류를 섞는 것이 가장 비싼 실수입니다. 서버가 죽었는데 검색 결과가 없다고 보이면 사용자는 장애가 아니라 내 데이터가 없다고 판단하고, 운영자는 한참 뒤에야 압니다.

### 실패를 사람의 말로 바꾸기
‹explain(e)›는 2강에서 남겨 둔 단서를 씁니다. ‹SyntaxError›면 응답 해석 실패, ‹status›가 있으면 서버 오류, 둘 다 아니면 네트워크 실패입니다. 이 분기가 한 함수에 있으면 문구 수정이나 번역도 한 곳에서 끝납니다. 분기 기준은 ‹e.name›과 ‹e.status›이고 ‹e.message› 문구는 브라우저마다 달라 쓰지 않습니다. 실무에서는 여기에 한 가지를 더합니다. 오류 화면 구석에 발생 시각이나 요청 번호를 작게 남겨 두면, 고객이 화면을 캡처해 보내 주었을 때 서버 로그와 바로 맞춰 볼 수 있습니다.

### innerHTML과 이스케이프
‹innerHTML›로 그릴 때 서버 응답이나 사용자 입력을 그대로 이어 붙이면, 태그가 든 문자열이 실제 태그로 해석되어 스크립트가 실행됩니다(XSS). 검색 결과 없음 문구처럼 사용자가 친 검색어를 화면에 되돌려 주는 곳이 단골 구멍입니다. ‹esc()›는 앰퍼샌드, 꺾쇠 괄호 두 종류, 큰따옴표를 숫자 문자 참조로 바꿔 글자로만 보이게 합니다. 가능하면 ‹textContent›로 쓰는 편이 더 안전하고, 문자열을 이어 붙여야 한다면 모든 값을 ‹esc›에 통과시키는 것을 규칙으로 삼으세요.

### 확인
처음 실행하면 불러오는 중 상자가 0.6초 보인 뒤 8권 목록이 나와야 합니다. 검색창에 zzz를 넣고 검색하면 빈 상태 상자가, 서버를 **오류**로 바꿔 검색하면 붉은 상자와 **다시 시도** 버튼이, **깨진 응답**이면 올바른 JSON이 아니라는 문구가, **오프라인**이면 네트워크에 연결할 수 없다는 문구가 보여야 합니다. 마지막으로 검색창에 꺾쇠로 감싼 b 태그 문자열을 넣어 빈 상태 문구에 글자 그대로 나오면 이스케이프가 동작하는 것입니다.

### 혼자 해 보기
마지막 줄의 ‹load()› 호출을 지우고 실행하면 화면이 비어 있습니다. ‹idle› 상태를 그리는 분기가 없기 때문입니다. ‹render›에 "검색어를 입력하고 검색을 누르세요" 안내 상자를 추가하고 처음에 ‹render()›를 한 번 부르세요. 콘솔 오류 없이 이 문구가 보이고, 검색을 누르면 목록으로 바뀌면 성공입니다.`,
      code: `<!doctype html>
<html lang="ko">
<meta charset="utf-8">
<title>책 대시보드 3단계</title>
<style>
body{font:15px system-ui;max-width:600px;margin:12px auto;padding:0 12px}.row{display:flex;gap:6px;margin:6px 0;align-items:center}
.box{padding:12px;border-radius:8px;background:#e8eefc}.err{background:#fde0e0}li{padding:5px 0;border-bottom:1px solid #ddd}
#log{background:#111;color:#9f9;padding:8px;height:110px;overflow:auto;font:12px monospace}
</style>
<body>
<div class="row"><input id="q" placeholder="제목 검색"><button id="search">검색</button> 서버
  <select id="mode"><option>정상</option><option>오류</option><option>깨진 응답</option><option>오프라인</option></select></div>
<div id="view"></div>
<div id="log"></div>
<script>
const $ = id => document.getElementById(id), SIM = { delay: 600, mode: '정상' };
const log = m => { $('log').append(m, document.createElement('br')); $('log').scrollTop = 1e9; };
const esc = s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');   // ★ 사용자·서버 문자열의 HTML 특수문자를 무력화

// ---- 가짜 서버 (2단계와 같다) ----
const T = ['파이썬', '자바스크립트', 'SQL', '리눅스', '네트워크', '알고리즘', '디자인', '보안'], K = ['입문', '실전', '가이드', '레시피', '핸드북'];
const CAT = ['데이터', '웹', '데이터', '인프라', '인프라', '기초', '웹', '인프라'];
const DB = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, title: T[i % 8] + ' ' + K[i / 8 | 0], cat: CAT[i % 8], price: 12000 + i * 7 % 10 * 1000, rating: (30 + i * 11 % 21) / 10 }));
function handle(url) {
  const p = new URL(url, 'http://fake').searchParams, q = (p.get('q') || '').toLowerCase();
  const rows = DB.filter(b => b.title.toLowerCase().includes(q));
  return { total: rows.length, items: rows.slice(0, 8) };
}
function fakeApi(url) {
  return new Promise((resolve, reject) => setTimeout(() => {
    const done = (status, text) => resolve({ ok: status < 400, status, json: async () => JSON.parse(text) });
    if (SIM.mode === '오프라인') reject(new TypeError('Failed to fetch'));
    else if (SIM.mode === '오류') done(503, '{"error":"점검 중"}');
    else if (SIM.mode === '깨진 응답') done(200, '<html>점검 중</html>');
    else done(200, JSON.stringify(handle(url)));
  }, SIM.delay));
}
async function getJSON(url) {
  const res = await fakeApi(url);
  if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status), { status: res.status });
  return res.json();
}

// ---- 화면: 상태는 status 하나로만 관리한다 ----                                     ★ 이번 단계의 핵심
const S = { status: 'idle', data: null, error: '', q: '' };                           // ★
const explain = e => e.name === 'SyntaxError' ? '서버 응답이 올바른 JSON이 아닙니다'      // ★ 실패의 종류를 사람 말로
  : e.status ? '서버 오류 (HTTP ' + e.status + ')' : '네트워크에 연결할 수 없습니다';
function render() {                                                                   // ★ status → 화면, 이 함수 하나가 전부
  const v = $('view'), d = S.data;
  if (S.status === 'loading') v.innerHTML = '<div class="box">불러오는 중...</div>';
  else if (S.status === 'error') v.innerHTML = '<div class="box err">' + esc(S.error) + ' <button id="retry">다시 시도</button></div>';
  else if (!d.items.length) v.innerHTML = '<div class="box">"' + esc(S.q) + '" 검색 결과가 없습니다</div>';
  else v.innerHTML = '<ul>' + d.items.map(b => '<li><b>' + esc(b.title) + '</b> ' + esc(b.price) + '원 · 평점 ' + esc(b.rating) + '</li>').join('') + '</ul>';
}
async function load() {                                                               // ★ 상태를 바꾸고 → 그린다
  const url = '/api/books?q=' + encodeURIComponent(S.q);
  S.status = 'loading'; render(); log('→ ' + decodeURIComponent(url));
  try { S.data = await getJSON(url); S.status = 'success'; log('← 성공 ' + S.data.total + '권'); }
  catch (e) { S.status = 'error'; S.error = explain(e); log('✗ ' + e.name + ': ' + e.message); }
  render();
}
$('mode').onchange = () => { SIM.mode = $('mode').value; };
$('search').onclick = () => { S.q = $('q').value.trim(); load(); };
$('view').onclick = e => { if (e.target.id === 'retry') load(); };
load();
</script>
`,
      codeLang: `html`,
      key: [
        `화면은 status 하나('idle', 'loading', 'success', 'error')의 함수이고, 빈 상태는 success이면서 0건이다.`,
        `load()는 상태만 바꾸고 render()는 상태만 읽어 그린다. 상태에서 화면으로 한 방향이다.`,
        `오류는 네트워크, 서버 오류, 응답 해석 실패로 분류해 사람 말로 보여 주고 다시 시도를 준다.`,
        `서버와 사용자의 문자열을 innerHTML에 넣을 때는 반드시 이스케이프하거나 textContent를 쓴다.`
      ],
      pitfalls: [
        `catch에서 status를 error로 바꾸지 않아 로딩 화면이 영원히 남는다.`,
        `오류와 빈 상태를 같은 문구로 처리해 장애가 검색 결과 없음으로 위장된다.`,
        `검색어를 그대로 innerHTML에 되돌려 보여 주어 XSS 구멍을 만든다.`,
        `응답 필드가 없을 때(서버가 필드 이름을 바꿈) 성공 화면 코드 안에서 TypeError가 난다. 응답 모양은 한 곳에서 검증해야 한다.`
      ]
    },
    {
      title: `검색 디바운스와 요청 취소: 경합을 AbortController로 끊기`,
      body: `검색창은 글자를 칠 때마다 이벤트가 발생합니다. 한글은 조합 중에도 이벤트가 연달아 오므로 "파이썬"을 치는 동안 요청이 서너 개 나갑니다. 서버 부하와 비용만의 문제가 아닙니다. 더 위험한 것은 응답이 요청한 순서대로 오지 않는다는 점입니다.

### 첫 번째 방어: 디바운스
디바운스는 마지막 이벤트 뒤에 일정 시간 조용하면 그때 한 번만 실행하는 장치입니다. 이벤트가 올 때마다 타이머를 지우고 새로 겁니다(‹clearTimeout›, ‹setTimeout›). 300ms는 흔한 출발점입니다. 너무 짧으면 효과가 없고 길면 반응이 굼뜹니다. 숫자는 서버 비용과 체감 속도의 절충이라 고객 요구에 맞춰 조정합니다. 비슷한 쓰로틀은 일정 간격마다 최대 한 번 실행하므로 스크롤 같은 연속 이벤트에 맞습니다. 디바운스 함수는 한 번만 만들어 이벤트에 연결해야 합니다. 핸들러 안에서 호출할 때마다 새로 만들면 타이머 변수가 매번 새로 생겨 아무것도 취소하지 못합니다.

### 두 번째 문제: 경합(race condition)
이번 단계의 가짜 서버는 한 글자 검색을 3배 느리게 만듭니다. 검색어 "자"는 1800ms, "자바"는 600ms가 걸립니다. 전체를 훑어야 하는 짧은 검색어가 느린 것은 실제 서버에서도 흔합니다. 사용자가 "자"를 치고 잠시 멈췄다가 "바"를 더하면 다음 일이 벌어집니다.
- 0ms: 요청 A(q=자) 출발, 1800ms에 도착 예정
- 350ms: 요청 B(q=자바) 출발, 950ms에 도착
- 950ms: B의 5권이 화면에 그려짐
- 1800ms: 뒤늦게 A의 결과(총 10권 중 8권)가 도착해 화면을 덮어씀. 입력창은 "자바"인데 화면은 "자" 결과

결과가 간헐적이라 재현이 어렵고, 개발 PC의 빠른 서버에서는 안 보이다가 운영에서 터집니다. 그래서 가짜 서버가 일부러 이 상황을 만들어 줍니다.

### 해법: 오래된 요청은 취소한다
‹AbortController›를 만들어 그 ‹signal›을 요청에 넘기고 ‹abort()›를 부르면 요청이 ‹AbortError›로 reject됩니다(MDN). 새 요청을 시작하기 직전에 이전 컨트롤러를 abort하면 내가 보낸 것 중 마지막 하나만 화면에 영향을 준다는 것이 보장됩니다. 지킬 규칙은 셋입니다.
1. 신호는 한 번 abort되면 영원히 abort 상태이므로 요청마다 새 컨트롤러를 만듭니다.
2. 취소는 고장이 아니므로 catch에서 ‹e.name›이 ‹AbortError›인지 가려내 오류 화면 없이 조용히 빠져나옵니다.
3. 취소는 클라이언트가 응답을 기다리지 않을 뿐입니다. 서버는 이미 일을 시작했을 수 있어서 결제나 주문 같은 쓰기 요청의 취소는 없던 일이 아닙니다.

가짜 서버도 진짜 fetch처럼 동작해야 하므로 ‹signal›의 ‹abort› 이벤트에서 타이머를 끄고 ‹signal.reason›으로 reject합니다. 시간 제한은 ‹AbortSignal.timeout(ms)›으로 만들 수 있고, 이때 오류 이름은 ‹TimeoutError›라 수동 취소의 ‹AbortError›와 구분됩니다(MDN, 2026-11 기준).

### 대안: 요청 번호로 낡은 응답 버리기
취소를 지원하지 않는 함수를 쓸 때는 요청마다 번호를 매기는 방법도 같은 목적을 이룹니다. ‹const my = ++seq›로 번호를 기억해 두었다가 ‹await›에서 돌아왔을 때 ‹my !== seq›이면 최신이 아니므로 결과를 버립니다. 네트워크 요청은 끝까지 진행되어 낭비지만 화면은 지킵니다. 실무에서는 취소와 번호 확인을 함께 두기도 합니다.

### 확인
검색창에 "파이썬"을 빠르게 쳐서 로그를 보면 화살표(→) 줄이 하나만 늘어야 합니다(디바운스). 이번에는 "자"를 치고 0.4초쯤 기다렸다가 "바"를 붙이면 로그에 "✗ 취소됨"이 나타나고 마지막 화면이 5권("자바" 결과)이어야 합니다. 마지막으로 코드에서 ‹ctrl?.abort();› 부분을 지우고 같은 동작을 해 보세요. 입력은 "자바"인데 8권짜리 목록이 남고 로그에는 "← 성공 10권"이 찍히는 버그가 눈으로 확인되면 취소 코드의 필요성을 이해한 것입니다.

### 혼자 해 보기
디바운스를 0ms와 1000ms로 바꿔 "파이썬"을 쳐 보고 → 줄 수를 비교하세요. 그다음 ‹ctrl?.abort()›를 지우고 위 요청 번호 방식으로 같은 경합을 막아 보세요. "자" 뒤에 0.4초 쉬고 "바"를 쳐도 화면에 5권만 남고, 낡은 응답을 버렸다는 로그가 찍히면 성공입니다.`,
      code: `<!doctype html>
<html lang="ko">
<meta charset="utf-8">
<title>책 대시보드 4단계</title>
<style>
body{font:15px system-ui;max-width:600px;margin:12px auto;padding:0 12px}.row{display:flex;gap:6px;margin:6px 0;align-items:center}
.box{padding:12px;border-radius:8px;background:#e8eefc}.err{background:#fde0e0}li{padding:5px 0;border-bottom:1px solid #ddd}
#log{background:#111;color:#9f9;padding:8px;height:110px;overflow:auto;font:12px monospace}
</style>
<body>
<div class="row"><input id="q" placeholder="제목 검색 (입력하면 자동 검색)"> 서버
  <select id="mode"><option>정상</option><option>오류</option><option>깨진 응답</option><option>오프라인</option></select></div>
<div id="view"></div>
<div id="log"></div>
<script>
const $ = id => document.getElementById(id), SIM = { delay: 600, mode: '정상' };
const log = m => { $('log').append(m, document.createElement('br')); $('log').scrollTop = 1e9; };
const esc = s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');

// ---- 가짜 서버: 이제 취소 신호(signal)를 알아듣고, 한 글자 검색은 3배 느리다 ----
const T = ['파이썬', '자바스크립트', 'SQL', '리눅스', '네트워크', '알고리즘', '디자인', '보안'], K = ['입문', '실전', '가이드', '레시피', '핸드북'];
const CAT = ['데이터', '웹', '데이터', '인프라', '인프라', '기초', '웹', '인프라'];
const DB = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, title: T[i % 8] + ' ' + K[i / 8 | 0], cat: CAT[i % 8], price: 12000 + i * 7 % 10 * 1000, rating: (30 + i * 11 % 21) / 10 }));
function handle(url) {
  const p = new URL(url, 'http://fake').searchParams, q = (p.get('q') || '').toLowerCase();
  const rows = DB.filter(b => b.title.toLowerCase().includes(q));
  return { total: rows.length, items: rows.slice(0, 8) };
}
function fakeApi(url, { signal } = {}) {                                              // ★ 두 번째 인자: { signal }
  return new Promise((resolve, reject) => {
    const q = new URL(url, 'http://fake').searchParams.get('q') || '';
    const done = (status, text) => resolve({ ok: status < 400, status, json: async () => JSON.parse(text) });
    const t = setTimeout(() => {
      if (SIM.mode === '오프라인') reject(new TypeError('Failed to fetch'));
      else if (SIM.mode === '오류') done(503, '{"error":"점검 중"}');
      else if (SIM.mode === '깨진 응답') done(200, '<html>점검 중</html>');
      else done(200, JSON.stringify(handle(url)));
    }, SIM.delay * (q.length === 1 ? 3 : 1));                                         // ★ 한 글자 검색은 느린 서버
    const stop = () => { clearTimeout(t); reject(signal.reason); };                   // ★ 취소되면 타이머를 끄고 reject
    if (signal?.aborted) stop(); else signal?.addEventListener('abort', stop);        // ★
  });
}
async function getJSON(url, opts) {                                                   // ★ opts를 그대로 전달
  const res = await fakeApi(url, opts);
  if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status), { status: res.status });
  return res.json();
}

const S = { status: 'idle', data: null, error: '', q: '' };
const explain = e => e.name === 'SyntaxError' ? '서버 응답이 올바른 JSON이 아닙니다'
  : e.status ? '서버 오류 (HTTP ' + e.status + ')' : '네트워크에 연결할 수 없습니다';
function render() {
  const v = $('view'), d = S.data;
  if (S.status === 'loading') v.innerHTML = '<div class="box">불러오는 중...</div>';
  else if (S.status === 'error') v.innerHTML = '<div class="box err">' + esc(S.error) + ' <button id="retry">다시 시도</button></div>';
  else if (!d.items.length) v.innerHTML = '<div class="box">"' + esc(S.q) + '" 검색 결과가 없습니다</div>';
  else v.innerHTML = '<ul>' + d.items.map(b => '<li><b>' + esc(b.title) + '</b> ' + esc(b.price) + '원 · 평점 ' + esc(b.rating) + '</li>').join('') + '</ul>';
}
let ctrl;                                                                             // ★ 가장 최근 요청의 취소 장치
async function load() {
  ctrl?.abort(); ctrl = new AbortController();                                        // ★ 진행 중이던 요청을 취소하고 새 컨트롤러
  const url = '/api/books?q=' + encodeURIComponent(S.q);
  S.status = 'loading'; render(); log('→ ' + decodeURIComponent(url));
  try { S.data = await getJSON(url, { signal: ctrl.signal }); S.status = 'success'; log('← 성공 ' + S.data.total + '권'); }
  catch (e) {
    if (e.name === 'AbortError') return log('✗ 취소됨 (더 새로운 요청이 있다)');       // ★ 취소는 오류 화면이 아니다
    S.status = 'error'; S.error = explain(e); log('✗ ' + e.name + ': ' + e.message);
  }
  render();
}
const debounce = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };   // ★ 마지막 입력 후 ms 동안 조용하면 실행
$('q').oninput = debounce(() => { S.q = $('q').value.trim(); load(); }, 300);                          // ★
$('mode').onchange = () => { SIM.mode = $('mode').value; };
$('view').onclick = e => { if (e.target.id === 'retry') load(); };
load();
</script>
`,
      codeLang: `html`,
      key: [
        `디바운스는 마지막 입력 뒤 ms만큼 조용할 때 한 번 실행하며, 디바운스 함수는 한 번만 만들어 연결한다.`,
        `응답 순서는 요청 순서와 다를 수 있어 오래된 응답이 새 화면을 덮는 경합이 생긴다.`,
        `새 요청 전에 이전 AbortController를 abort하고, 요청마다 새 컨트롤러를 만든다.`,
        `AbortError는 오류 화면이 아니라 조용히 무시한다. 취소해도 서버는 이미 처리했을 수 있다.`,
        `시간 제한은 AbortSignal.timeout이 만드는 TimeoutError로 수동 취소와 구분한다.`
      ],
      pitfalls: [
        `이벤트 핸들러 안에서 debounce를 호출해 매번 새 타이머를 만들어 디바운스가 전혀 동작하지 않는다.`,
        `취소만 하고 AbortError를 걸러내지 않아 입력할 때마다 오류 화면이 번쩍인다.`,
        `하나의 AbortController를 모든 요청에 재사용해 첫 abort 이후 모든 요청이 즉시 취소된다.`,
        `쓰기(POST) 요청에까지 새 입력이 오면 취소하는 패턴을 적용해 서버는 처리했는데 화면은 실패로 보인다.`
      ]
    },
    {
      title: `페이지네이션과 정렬: 서버가 자르고 주소가 조건을 나른다`,
      body: `목록이 40권일 때는 한 번에 다 받아도 되지만 현업 데이터는 수천에서 수십만 건입니다. 전부 내려받으면 네트워크도 느려지고 브라우저 메모리도 부담스럽습니다. 그래서 서버가 한 페이지만 잘라서 주고, 정렬과 검색도 서버가 전체를 대상으로 처리합니다.

### 왜 정렬을 서버에서 해야 하나
클라이언트가 지금 받은 8권만 가격순으로 정렬하면 1페이지는 그 8권 중 싼 순서일 뿐 전체 최저가가 아닙니다. 올바른 순서는 서버가 (1) 검색 조건으로 거르고 (2) 전체를 정렬한 다음 (3) 해당 페이지를 잘라 주는 것입니다. 우리 ‹handle()›도 그 순서를 따릅니다.

### 조건 전체를 주소 하나로
화면 조건(검색어, 정렬, 페이지, 크기)은 ‹S›에 있고, ‹URLSearchParams›가 이를 주소로 만듭니다. 예를 들어 ‹/api/books?q=%EC%9E%90&sort=price&page=2&size=8›처럼 한글과 공백이 자동으로 인코딩됩니다. 직접 문자열을 이어 붙이면 앰퍼샌드나 공백이 든 검색어에서 주소가 깨집니다. 이 주소가 곧 요청의 정체라서 6강의 캐시 키도 이 문자열을 그대로 씁니다. 조건이 하나라도 빠진 주소로 캐시하면 다른 정렬 결과가 엉뚱하게 재사용됩니다.

### 응답 모양과 페이지 수
서버는 ‹{ total, items }›를 줍니다. 클라이언트는 ‹Math.ceil(total / size)›로 페이지 수를 계산합니다. 40권을 8권씩이면 5쪽, 5권이면 1쪽입니다. 큰 테이블에서는 전체 개수를 세는 일 자체가 비싸서 total을 생략하거나 근사값만 주는 API도 있는데, 그러면 다음 버튼은 빈 목록이 올 때까지 활성 상태로 둘 수밖에 없습니다. 가격 낮은 순 첫 페이지에 비싼 상품이 섞여 있다는 신고를 받으면 먼저 이 두 가지(클라이언트 쪽 정렬, 조건이 바뀔 때 페이지 미초기화)를 의심해 보세요. 정렬과 페이지를 서버가 처리하는지는 API 문서에서 견적 전에 확인할 항목입니다.

### 상태 전이 규칙
- 검색어나 정렬이 바뀌면 ‹page›를 1로 되돌립니다. 3쪽을 보다가 검색해서 결과가 5권뿐이면 3쪽은 존재하지 않아 빈 화면이 나옵니다.
- 이전과 다음 버튼은 범위(1부터 총 페이지)를 벗어나지 못하게 비활성화하고, 서버도 범위 밖 요청에 빈 목록이나 400으로 방어합니다.
- 페이지를 넘길 때도 4강의 취소와 같은 로드 파이프라인을 그대로 씁니다.

### offset 방식의 한계와 커서
page와 size는 앞에서 N개를 건너뛰고 M개를 가져오는 offset 방식입니다. 단순하지만 약점이 둘 있습니다. 첫째, 사용자가 1쪽을 보는 사이 새 항목이 앞에 추가되면 2쪽을 열 때 같은 항목이 또 나오거나 하나가 빠집니다. 둘째, 깊은 페이지는 DB가 앞부분을 세고 버려야 해서 느려집니다. 피드나 로그처럼 계속 변하는 큰 목록은 마지막으로 본 항목의 id 다음부터 N개를 요청하는 커서(keyset) 방식을 씁니다. 응답에 다음 위치를 가리키는 값이 있으면 그것을 그대로 돌려보내는 계약입니다. 대신 17쪽으로 바로 이동은 어려워지므로 목록의 성격에 따라 고릅니다.

정렬 값이 같은 항목(우리 데이터는 가격 12000원이 4권)은 순서가 불안정하면 쪽 경계에서 중복이나 누락이 생깁니다. 실제 DB에서는 id 같은 유일한 값을 두 번째 정렬 키로 덧붙입니다.

### 확인
처음에 "1 / 5 (총 40권)"이 보이고 이전 버튼은 비활성이어야 합니다. 다음을 네 번 누르면 "5 / 5"에서 다음 버튼이 비활성이 됩니다. 정렬을 **평점 높은 순**으로 바꾸면 1쪽으로 돌아가고 첫 책의 평점이 5가 되어야 합니다. 3쪽으로 간 뒤 파이썬을 검색하면 "1 / 1 (총 5권)"로 바뀌어야 합니다.

### 혼자 해 보기
쪽당 개수를 고르는 선택 상자(4, 8, 16권)를 추가하세요. ‹SIZE› 상수를 상태 ‹S.size›로 옮기고 바꿀 때 page를 1로 되돌립니다. 16이면 "1 / 3 (총 40권)", 4이면 "1 / 10 (총 40권)"이 보이면 성공입니다. 주소에 size가 이미 실려 있어 서버 쪽은 고칠 것이 없다는 점도 확인하세요.`,
      code: `<!doctype html>
<html lang="ko">
<meta charset="utf-8">
<title>책 대시보드 5단계</title>
<style>
body{font:15px system-ui;max-width:600px;margin:12px auto;padding:0 12px}.row{display:flex;gap:6px;margin:6px 0;align-items:center}
.box{padding:12px;border-radius:8px;background:#e8eefc}.err{background:#fde0e0}li{padding:5px 0;border-bottom:1px solid #ddd}
#log{background:#111;color:#9f9;padding:8px;height:110px;overflow:auto;font:12px monospace}
</style>
<body>
<div class="row"><input id="q" placeholder="제목 검색">
  <select id="sort"><option value="">정렬 안 함</option><option value="price">가격 낮은 순</option><option value="rating:desc">평점 높은 순</option></select>
  서버 <select id="mode"><option>정상</option><option>오류</option><option>깨진 응답</option><option>오프라인</option></select></div>
<div id="view"></div>
<div class="row"><button id="prev">이전</button><span id="pg"></span><button id="next">다음</button></div>
<div id="log"></div>
<script>
const $ = id => document.getElementById(id), SIM = { delay: 600, mode: '정상' }, SIZE = 8;
const log = m => { $('log').append(m, document.createElement('br')); $('log').scrollTop = 1e9; };
const esc = s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');

// ---- 가짜 서버: 이제 정렬(sort)과 페이지(page, size)를 서버가 처리한다 ----
const T = ['파이썬', '자바스크립트', 'SQL', '리눅스', '네트워크', '알고리즘', '디자인', '보안'], K = ['입문', '실전', '가이드', '레시피', '핸드북'];
const CAT = ['데이터', '웹', '데이터', '인프라', '인프라', '기초', '웹', '인프라'];
const DB = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, title: T[i % 8] + ' ' + K[i / 8 | 0], cat: CAT[i % 8], price: 12000 + i * 7 % 10 * 1000, rating: (30 + i * 11 % 21) / 10 }));
function handle(url) {
  const p = new URL(url, 'http://fake').searchParams, q = (p.get('q') || '').toLowerCase(), [k, dir] = (p.get('sort') || '').split(':');   // ★
  const rows = DB.filter(b => b.title.toLowerCase().includes(q)), page = +p.get('page') || 1, size = +p.get('size') || SIZE;               // ★
  if (k) rows.sort((a, b) => ((a[k] > b[k]) - (a[k] < b[k])) * (dir === 'desc' ? -1 : 1));                                                // ★ 전체를 정렬한 다음에
  return { total: rows.length, items: rows.slice((page - 1) * size, page * size) };                                                      // ★ 한 페이지만 자른다
}
function fakeApi(url, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const q = new URL(url, 'http://fake').searchParams.get('q') || '';
    const done = (status, text) => resolve({ ok: status < 400, status, json: async () => JSON.parse(text) });
    const t = setTimeout(() => {
      if (SIM.mode === '오프라인') reject(new TypeError('Failed to fetch'));
      else if (SIM.mode === '오류') done(503, '{"error":"점검 중"}');
      else if (SIM.mode === '깨진 응답') done(200, '<html>점검 중</html>');
      else done(200, JSON.stringify(handle(url)));
    }, SIM.delay * (q.length === 1 ? 3 : 1));
    const stop = () => { clearTimeout(t); reject(signal.reason); };
    if (signal?.aborted) stop(); else signal?.addEventListener('abort', stop);
  });
}
async function getJSON(url, opts) {
  const res = await fakeApi(url, opts);
  if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status), { status: res.status });
  return res.json();
}

const S = { status: 'idle', data: null, error: '', q: '', sort: '', page: 1 };                   // ★ sort, page 추가
const pages = () => Math.max(1, Math.ceil((S.data ? S.data.total : 0) / SIZE));                  // ★ 총 페이지 수는 서버가 준 total에서 계산
const explain = e => e.name === 'SyntaxError' ? '서버 응답이 올바른 JSON이 아닙니다'
  : e.status ? '서버 오류 (HTTP ' + e.status + ')' : '네트워크에 연결할 수 없습니다';
function render() {
  const v = $('view'), d = S.data;
  if (S.status === 'loading') v.innerHTML = '<div class="box">불러오는 중...</div>';
  else if (S.status === 'error') v.innerHTML = '<div class="box err">' + esc(S.error) + ' <button id="retry">다시 시도</button></div>';
  else if (!d.items.length) v.innerHTML = '<div class="box">"' + esc(S.q) + '" 검색 결과가 없습니다</div>';
  else v.innerHTML = '<ul>' + d.items.map(b => '<li><b>' + esc(b.title) + '</b> ' + esc(b.price) + '원 · 평점 ' + esc(b.rating) + '</li>').join('') + '</ul>';
  $('pg').textContent = S.page + ' / ' + pages() + (S.data ? ' (총 ' + S.data.total + '권)' : '');                  // ★ 페이지 표시줄
  $('prev').disabled = S.page <= 1; $('next').disabled = S.page >= pages();                                      // ★ 범위 밖으로 못 가게
}
let ctrl;
async function load() {
  ctrl?.abort(); ctrl = new AbortController();
  const url = '/api/books?' + new URLSearchParams({ q: S.q, sort: S.sort, page: S.page, size: SIZE });   // ★ 조건 전부를 주소 하나로
  S.status = 'loading'; render(); log('→ ' + decodeURIComponent(url));
  try { S.data = await getJSON(url, { signal: ctrl.signal }); S.status = 'success'; log('← 성공 ' + S.data.total + '권'); }
  catch (e) {
    if (e.name === 'AbortError') return log('✗ 취소됨 (더 새로운 요청이 있다)');
    S.status = 'error'; S.error = explain(e); log('✗ ' + e.name + ': ' + e.message);
  }
  render();
}
const debounce = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };
$('q').oninput = debounce(() => { S.q = $('q').value.trim(); S.page = 1; load(); }, 300);              // ★ 조건이 바뀌면 1페이지로
$('sort').onchange = () => { S.sort = $('sort').value; S.page = 1; load(); };                          // ★
$('prev').onclick = () => { S.page--; load(); };                                                       // ★
$('next').onclick = () => { S.page++; load(); };                                                       // ★
$('mode').onchange = () => { SIM.mode = $('mode').value; };
$('view').onclick = e => { if (e.target.id === 'retry') load(); };
load();
</script>
`,
      codeLang: `html`,
      key: [
        `정렬·검색·페이지는 전체 데이터를 아는 서버가 처리해야 결과가 맞다.`,
        `URLSearchParams로 조건 전체를 주소 하나로 만들고, 그 주소가 요청의 정체이자 캐시 키다.`,
        `페이지 수는 Math.ceil(total / size)이고, 검색이나 정렬이 바뀌면 page를 1로 되돌린다.`,
        `offset은 단순하지만 데이터가 변하면 중복과 누락이 생기고 깊을수록 느리다. 커서 방식이 대안이다.`
      ],
      pitfalls: [
        `조건이 바뀌어도 page를 1로 되돌리지 않아 존재하지 않는 페이지를 요청하고 빈 화면을 보여 준다.`,
        `클라이언트가 현재 페이지 8개만 정렬해 놓고 정렬이 됐다고 믿는다.`,
        `주소를 문자열 덧붙이기로 만들어 검색어의 앰퍼샌드나 공백에서 요청이 깨진다.`,
        `동점 값만으로 정렬해 쪽 경계에서 항목이 중복되거나 빠진다.`
      ]
    },
    {
      title: `캐싱과 재시도: 다시 묻지 않기, 다시 해 보기, 그리고 하지 말아야 할 때`,
      body: `네트워크는 느리고 가끔 실패합니다. 이 단계에서는 두 가지로 대응합니다. 이미 받은 응답은 다시 묻지 않고(캐싱), 일시적 실패는 다시 시도합니다(재시도). 둘 다 하지 말아야 할 때를 아는 것이 실력입니다.

### 캐싱: 같은 질문엔 저장한 답
5강에서 요청의 정체가 주소 하나로 정리되었으므로 그 주소를 키로 쓰는 ‹Map›이 가장 단순한 캐시입니다. 값에는 응답과 저장 시각을 함께 넣고, ‹TTL›(수명, 여기서는 30000ms)이 지나면 무시합니다. 1쪽, 2쪽, 다시 1쪽으로 돌아오면 세 번째 이동은 네트워크 없이 즉시 그려지고 로그에 캐시 적중이 찍힙니다.

위험도 분명합니다.
- 낡은 데이터: TTL 동안은 서버가 바뀌어도 모릅니다. 관리자가 가격을 고치면 해당 캐시를 지우거나(무효화) TTL을 짧게 잡습니다. 숫자는 요구사항에서 나옵니다. 재고는 수 초, 책 소개는 수 분처럼 변하는 속도에 맞춥니다.
- 오류 응답은 캐시하지 않습니다. 성공했을 때만 저장합니다.
- 키가 불완전하면 엉뚱한 결과가 재사용됩니다(5강).
- 메모리가 끝없이 늘 수 있으니 개수 상한이나 오래된 것부터 버리는 정책이 필요합니다.
- 캐시된 객체를 화면 코드가 수정하면 원본이 오염됩니다.

브라우저와 서버가 하는 HTTP 캐시는 다른 층입니다. 서버가 ‹Cache-Control: max-age›로 수명을 주면 브라우저가 알아서 재사용하고, ‹no-cache›는 저장은 하되 재사용 전에 서버에 재검증하라는 뜻이고(저장 자체를 막는 것은 ‹no-store›), ‹ETag›와 ‹If-None-Match›로 바뀌지 않았다고 확인되면 본문 없이 304가 돌아옵니다(MDN). 앱 안의 Map 캐시는 그와 별개로 화면 전환을 즉시로 만드는 UI 층의 캐시입니다. 둘을 혼동하지 않는 것이 첫 단추입니다.

### 재시도: 다시 해도 되는 실패만
| 실패 | 재시도 | 이유 |
| 네트워크 끊김, 503 | 한다 | 일시적일 가능성이 큼 |
| 400, 401, 404 | 안 한다 | 같은 요청은 같은 답, 요청이 잘못됨 |
| 취소(AbortError) | 안 한다 | 사용자가 원한 결과 |
| 429(요청 과다) | 기다린 뒤 | Retry-After 헤더를 존중 |

이번 코드는 429를 ‹e.status < 500› 검사에서 걸러 즉시 포기하고, 랩 2에서 Retry-After를 따르도록 확장합니다. 응답이 깨진 오류(SyntaxError)는 status가 없어 재시도 대상이 되는데, 점검 페이지는 곧 풀릴 수 있다는 판단입니다. 계속 깨지는 서버라면 횟수 상한이 안전장치입니다.

더 중요한 것은 메서드입니다. GET처럼 반복해도 결과가 같은 요청은 재시도가 안전하지만, 주문 생성 POST는 서버가 이미 처리했는데 응답만 잃었을 수 있어 재시도하면 중복 주문이 됩니다. 쓰기 요청은 서버가 같은 요청임을 알아보는 멱등 키가 있을 때만 재시도합니다.

### 지수 백오프와 지터
실패하자마자 즉시 다시 보내면 이미 힘든 서버를 더 괴롭힙니다. 그래서 간격을 300ms, 600ms, 1200ms처럼 두 배씩 늘립니다(지수 백오프). 여기에 무작위를 섞는 것이 지터입니다. AWS 아키텍처 블로그의 시뮬레이션 비교에서 지터 없는 백오프는 호출 수도 완료 시간도 가장 나빴고, 지터를 넣은 방식 중 대기를 0부터 상한 사이 무작위로 정하는 full jitter가 총 호출 수가 가장 적었습니다. 같은 시각에 실패한 클라이언트들이 같은 간격으로 재시도하면 매번 한꺼번에 몰리기 때문입니다. 우리 코드의 대기는 0부터 300ms에 2의 (n-1)제곱을 곱한 값 사이의 무작위입니다. 횟수에도 상한(3번)이 필요합니다. 지연 600ms를 세 번 겪고 백오프가 최대 900ms이면 최악의 경우 약 2.7초 뒤에야 오류 화면이 뜨기 때문입니다.

### 확인
서버를 **불안정**으로 바꾸고 다음을 누르면 로그에 "재시도 1회 (HTTP 503)", "재시도 2회"가 차례로 찍히고 세 번째 시도에서 성공해야 합니다. **정상**으로 되돌리고 이전을 누르면 "캐시 적중"과 함께 지연 없이 1쪽이 나와야 합니다. **오류** 모드에서는 재시도 두 번 뒤 붉은 오류 화면이 떠야 하고, 다시 **정상**으로 바꿔 **다시 시도**를 누르면 성공해야 합니다. 오류가 캐시되지 않았다는 증거입니다.

### 혼자 해 보기
캐시가 끝없이 늘지 않게 상한을 두세요. ‹cache.set› 뒤에 ‹cache.size›가 5를 넘으면 ‹cache.keys().next().value›(가장 먼저 넣은 키)를 ‹delete›하고 ‹log('캐시 ' + cache.size)›를 찍습니다. 서로 다른 검색어 7개를 입력해도 로그가 5를 넘지 않으면 성공입니다.`,
      code: `<!doctype html>
<html lang="ko">
<meta charset="utf-8">
<title>책 대시보드 6단계</title>
<style>
body{font:15px system-ui;max-width:600px;margin:12px auto;padding:0 12px}.row{display:flex;gap:6px;margin:6px 0;align-items:center}
.box{padding:12px;border-radius:8px;background:#e8eefc}.err{background:#fde0e0}li{padding:5px 0;border-bottom:1px solid #ddd}
#log{background:#111;color:#9f9;padding:8px;height:110px;overflow:auto;font:12px monospace}
</style>
<body>
<div class="row"><input id="q" placeholder="제목 검색">
  <select id="sort"><option value="">정렬 안 함</option><option value="price">가격 낮은 순</option><option value="rating:desc">평점 높은 순</option></select>
  서버 <select id="mode"><option>정상</option><option>오류</option><option>불안정</option><option>깨진 응답</option><option>오프라인</option></select></div>
<div id="view"></div>
<div class="row"><button id="prev">이전</button><span id="pg"></span><button id="next">다음</button></div>
<div id="log"></div>
<script>
const $ = id => document.getElementById(id), SIM = { delay: 600, mode: '정상', n: 0 }, SIZE = 8, TTL = 30000;   // ★ SIM.n: 불안정 모드의 호출 횟수, TTL: 캐시 수명(ms)
const log = m => { $('log').append(m, document.createElement('br')); $('log').scrollTop = 1e9; };
const esc = s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');

// ---- 가짜 서버 ('불안정' 모드 추가: 3번 중 2번 503) ----
const T = ['파이썬', '자바스크립트', 'SQL', '리눅스', '네트워크', '알고리즘', '디자인', '보안'], K = ['입문', '실전', '가이드', '레시피', '핸드북'];
const CAT = ['데이터', '웹', '데이터', '인프라', '인프라', '기초', '웹', '인프라'];
const DB = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, title: T[i % 8] + ' ' + K[i / 8 | 0], cat: CAT[i % 8], price: 12000 + i * 7 % 10 * 1000, rating: (30 + i * 11 % 21) / 10 }));
function handle(url) {
  const p = new URL(url, 'http://fake').searchParams, q = (p.get('q') || '').toLowerCase(), [k, dir] = (p.get('sort') || '').split(':');
  const rows = DB.filter(b => b.title.toLowerCase().includes(q)), page = +p.get('page') || 1, size = +p.get('size') || SIZE;
  if (k) rows.sort((a, b) => ((a[k] > b[k]) - (a[k] < b[k])) * (dir === 'desc' ? -1 : 1));
  return { total: rows.length, items: rows.slice((page - 1) * size, page * size) };
}
function fakeApi(url, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const q = new URL(url, 'http://fake').searchParams.get('q') || '';
    const done = (status, text) => resolve({ ok: status < 400, status, json: async () => JSON.parse(text) });
    const t = setTimeout(() => {
      if (SIM.mode === '오프라인') reject(new TypeError('Failed to fetch'));
      else if (SIM.mode === '오류' || (SIM.mode === '불안정' && ++SIM.n % 3)) done(503, '{"error":"점검 중"}');   // ★ 불안정: 3번째마다 성공
      else if (SIM.mode === '깨진 응답') done(200, '<html>점검 중</html>');
      else done(200, JSON.stringify(handle(url)));
    }, SIM.delay * (q.length === 1 ? 3 : 1));
    const stop = () => { clearTimeout(t); reject(signal.reason); };
    if (signal?.aborted) stop(); else signal?.addEventListener('abort', stop);
  });
}
async function getJSON(url, opts) {
  const res = await fakeApi(url, opts);
  if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status), { status: res.status });
  return res.json();
}
async function withRetry(fn, tries = 3) {                                                  // ★ 실패하면 기다렸다가 다시, 최대 tries번
  for (let n = 1; ; n++) {
    try { return await fn(); } catch (e) {
      if (e.name === 'AbortError' || n >= tries || e.status < 500) throw e;                  // 취소·마지막 시도·4xx는 그대로 던진다
      log('재시도 ' + n + '회 (' + e.message + ')');
      await new Promise(r => setTimeout(r, Math.random() * 300 * 2 ** (n - 1)));            // 지터를 섞은 지수 백오프
    }
  }
}
const cache = new Map();                                                                   // ★ 주소 → { v: 응답, t: 저장 시각 }
async function cached(url, opts) {                                                         // ★
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < TTL) { log('캐시 적중 ' + decodeURIComponent(url)); return hit.v; }
  const v = await withRetry(() => getJSON(url, opts));
  cache.set(url, { v, t: Date.now() });                                                    // 성공한 응답만 저장한다
  return v;
}

const S = { status: 'idle', data: null, error: '', q: '', sort: '', page: 1 };
const pages = () => Math.max(1, Math.ceil((S.data ? S.data.total : 0) / SIZE));
const explain = e => e.name === 'SyntaxError' ? '서버 응답이 올바른 JSON이 아닙니다'
  : e.status ? '서버 오류 (HTTP ' + e.status + ')' : '네트워크에 연결할 수 없습니다';
function render() {
  const v = $('view'), d = S.data;
  if (S.status === 'loading') v.innerHTML = '<div class="box">불러오는 중...</div>';
  else if (S.status === 'error') v.innerHTML = '<div class="box err">' + esc(S.error) + ' <button id="retry">다시 시도</button></div>';
  else if (!d.items.length) v.innerHTML = '<div class="box">"' + esc(S.q) + '" 검색 결과가 없습니다</div>';
  else v.innerHTML = '<ul>' + d.items.map(b => '<li><b>' + esc(b.title) + '</b> ' + esc(b.price) + '원 · 평점 ' + esc(b.rating) + '</li>').join('') + '</ul>';
  $('pg').textContent = S.page + ' / ' + pages() + (S.data ? ' (총 ' + S.data.total + '권)' : '');
  $('prev').disabled = S.page <= 1; $('next').disabled = S.page >= pages();
}
let ctrl;
async function load() {
  ctrl?.abort(); ctrl = new AbortController();
  const url = '/api/books?' + new URLSearchParams({ q: S.q, sort: S.sort, page: S.page, size: SIZE });
  S.status = 'loading'; render(); log('→ ' + decodeURIComponent(url));
  try { S.data = await cached(url, { signal: ctrl.signal }); S.status = 'success'; log('← 성공 ' + S.data.total + '권'); }      // ★ getJSON → cached
  catch (e) {
    if (e.name === 'AbortError') return log('✗ 취소됨 (더 새로운 요청이 있다)');
    S.status = 'error'; S.error = explain(e); log('✗ ' + e.name + ': ' + e.message);
  }
  render();
}
const debounce = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };
$('q').oninput = debounce(() => { S.q = $('q').value.trim(); S.page = 1; load(); }, 300);
$('sort').onchange = () => { S.sort = $('sort').value; S.page = 1; load(); };
$('prev').onclick = () => { S.page--; load(); };
$('next').onclick = () => { S.page++; load(); };
$('mode').onchange = () => { SIM.mode = $('mode').value; };
$('view').onclick = e => { if (e.target.id === 'retry') load(); };
load();
</script>
`,
      codeLang: `html`,
      key: [
        `캐시 키는 요청 조건 전체(주소)이고, 값에 저장 시각을 넣어 TTL로 만료시키며 성공 응답만 저장한다.`,
        `낡은 데이터는 TTL 단축과 무효화로 다루고, 브라우저의 HTTP 캐시(Cache-Control, ETag)와 앱 캐시는 다른 층이다.`,
        `재시도는 일시적 실패(네트워크, 5xx)와 멱등 요청에만 하고, 4xx와 취소는 하지 않는다.`,
        `지수 백오프에 지터를 섞고 횟수 상한을 두며, Retry-After가 있으면 따른다.`
      ],
      pitfalls: [
        `4xx까지 재시도해 같은 실패를 세 번 반복하고 사용자는 세 배 오래 기다린다.`,
        `지터 없이 같은 간격으로 재시도해 모든 클라이언트가 같은 순간에 서버를 다시 두드린다.`,
        `실패 응답까지 캐시에 저장해 서버가 복구된 뒤에도 TTL 동안 오류가 재생된다.`,
        `비멱등 요청(주문 POST)을 재시도 래퍼로 감싸 중복 처리를 만든다.`
      ]
    },
    {
      title: `CORS와 실제 API 연결: 키는 화면 코드에 두지 않는다`,
      body: `지금까지 모든 것은 가짜 서버 위에서 돌았습니다. 진짜 API로 가는 길에서 가장 자주 사고가 나는 두 가지, CORS와 API 키를 다룹니다. 이 학습 앱의 실행 창은 네트워크가 막혀 있으므로 여기서는 구조와 판단 기준을 익히고, 실제 호출은 파일로 저장해 PC에서 실험합니다.

### CORS: 서버가 허락하고 브라우저가 집행한다
출처(origin)는 프로토콜, 도메인, 포트의 조합이고, 브라우저는 기본적으로 다른 출처의 응답을 스크립트가 읽지 못하게 합니다(동일 출처 정책). CORS는 서버가 응답 헤더로 이 출처는 읽어도 좋다고 알리는 방법입니다(MDN).
- 응답에 ‹Access-Control-Allow-Origin›(허용 출처 하나 또는 ‹*›)이 있어야 합니다.
- GET, HEAD, POST이면서 안전한 헤더만 쓰고 ‹Content-Type›이 form 전송 형식 세 가지뿐인 단순 요청은 바로 나갑니다. ‹Authorization› 헤더나 ‹Content-Type: application/json›을 쓰면 브라우저가 먼저 ‹OPTIONS› 프리플라이트를 보내고, 서버가 ‹Access-Control-Allow-Methods›와 ‹Access-Control-Allow-Headers›로 승인해야 본 요청이 갑니다. 프리플라이트 결과는 ‹Access-Control-Max-Age›초 동안 캐시되며 기본값은 5초이고, 브라우저마다 상한이 있어 Chromium은 2시간입니다(MDN, 2026-11 기준).
- 쿠키 같은 자격 증명을 함께 보내면 ‹*›를 쓸 수 없고, 구체적인 출처와 ‹Access-Control-Allow-Credentials: true›가 필요합니다.

두 가지를 기억하세요. 이 규칙은 서버가 아니라 브라우저가 집행하므로 curl은 영향을 받지 않습니다. 그리고 실패하면 JS가 받는 것은 오프라인과 구별되지 않는 ‹TypeError›뿐이고(문구는 브라우저마다 다릅니다) 자세한 이유는 콘솔에만 적힙니다(MDN). 그래서 우리 앱은 **CORS 차단** 모드에서 콘솔에만 문장을 남기고 화면에는 오프라인이거나 CORS 차단일 수 있으니 콘솔을 확인하라고 안내합니다. 해결은 허락을 주는 서버 쪽에서 합니다. 프런트에서 ‹mode: 'no-cors'›를 켜면 요청은 나가지만 응답을 읽을 수 없는 불투명한 상태가 되어 해결이 아닙니다. 서버를 못 고치면 우리가 관리하는 프록시가 대신 호출합니다.

### API 키: 화면 코드는 공개 코드다
브라우저에 내려간 JS는 누구나 소스 보기와 Network 탭으로 읽습니다. 난독화나 인코딩은 읽는 시간을 조금 늘릴 뿐입니다. 비밀 키가 화면 코드에 있으면 이미 유출된 것으로 보고, 구조를 이렇게 잡습니다.
1. 브라우저는 우리 서버(같은 출처)의 ‹/api/books›만 부른다. 같은 출처라 CORS도 필요 없다.
2. 우리 서버(또는 서버리스 함수)가 키를 환경 변수로 보관하고 외부 API를 호출해 결과만 돌려준다.
3. 우리 서버에서 호출 한도, 캐시, 입력 검증을 한 번 더 건다.
OWASP REST 보안 치트 시트는 키와 토큰을 주소(쿼리스트링)에 넣지 말고 헤더나 본문에 실으라고 하며, 이유는 웹 서버 로그에 남기 때문입니다. 지도 SDK 키처럼 발급처가 도메인 제한을 걸어 공개용으로 설계한 키도 있으므로 키의 종류는 발급처 문서로 확인합니다.

### 교체 지점은 한 곳
이번 단계에서 ‹api()›가 추가되었습니다. ‹CONFIG.USE_REAL›이 참이면 ‹fetch(CONFIG.BASE + url)›, 아니면 ‹fakeApi›를 부릅니다. ‹getJSON› 맨 앞에는 안전망이 있어 주소에 ‹apikey=›, ‹token=›, ‹secret=›이 보이면 요청 전에 오류를 던지고, 4xx로 취급해 재시도하지 않습니다. 실제 API의 응답이 우리 모양(‹{ total, items }›)과 다르면 화면을 고치지 말고, 응답을 우리 모양으로 바꾸는 어댑터 함수를 ‹getJSON› 뒤에 끼웁니다. 응답이 오지 않는 서버를 대비한 제한 시간은 랩 2에서 다룹니다.

### 확인
서버를 **CORS 차단**으로 바꿔 검색하면 재시도 끝에 붉은 상자에 오프라인이거나 CORS 차단일 수 있다는 문구가 보이고, 개발자 도구 콘솔에 CORS policy 문장이 찍혀야 합니다. ‹URLSearchParams›에 ‹apikey: 'abc'›를 일부러 추가해 실행하면 요청이 나가기 전에 로그에 "✗ Error: 주소(URL)에 비밀 키를 싣지 마세요"가 뜨고 재시도 로그는 없어야 합니다(화면에는 400이라 서버 오류로 보이지만 요청은 나가지 않았습니다). ‹USE_REAL: true›로 바꾸면 이 학습 창에서는 fetch가 TypeError로 실패하는 것이 정상입니다.

### 혼자 해 보기
실제 API가 ‹{ count, results: [{ id, name, cost, score }] }›로 답한다고 가정하세요. ‹handle› 끝줄을 그 모양으로 바꾸고, ‹getJSON› 뒤에 ‹adapt()›를 끼워 ‹{ total, items: [{ id, title, price, rating }] }›로 되돌립니다. ‹render›를 한 줄도 고치지 않고 8권 목록이 나오면 성공입니다.`,
      code: `<!doctype html>
<html lang="ko">
<meta charset="utf-8">
<title>책 대시보드 7단계</title>
<style>
body{font:15px system-ui;max-width:600px;margin:12px auto;padding:0 12px}.row{display:flex;gap:6px;margin:6px 0;align-items:center}
.box{padding:12px;border-radius:8px;background:#e8eefc}.err{background:#fde0e0}li{padding:5px 0;border-bottom:1px solid #ddd}
#log{background:#111;color:#9f9;padding:8px;height:110px;overflow:auto;font:12px monospace}
</style>
<body>
<div class="row"><input id="q" placeholder="제목 검색">
  <select id="sort"><option value="">정렬 안 함</option><option value="price">가격 낮은 순</option><option value="rating:desc">평점 높은 순</option></select>
  서버 <select id="mode"><option>정상</option><option>오류</option><option>불안정</option><option>깨진 응답</option><option>오프라인</option><option>CORS 차단</option></select></div>
<div id="view"></div>
<div class="row"><button id="prev">이전</button><span id="pg"></span><button id="next">다음</button></div>
<div id="log"></div>
<script>
const $ = id => document.getElementById(id), SIM = { delay: 600, mode: '정상', n: 0 }, SIZE = 8, TTL = 30000;
const CONFIG = { USE_REAL: false, BASE: '' };   // ★ 진짜 서버 연결 스위치. BASE가 ''이면 같은 출처(우리 서버)의 /api 주소로 간다
const log = m => { $('log').append(m, document.createElement('br')); $('log').scrollTop = 1e9; };
const esc = s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');

// ---- 가짜 서버 ('CORS 차단' 모드 추가: JS에는 오프라인과 똑같은 TypeError만 보인다) ----
const T = ['파이썬', '자바스크립트', 'SQL', '리눅스', '네트워크', '알고리즘', '디자인', '보안'], K = ['입문', '실전', '가이드', '레시피', '핸드북'];
const CAT = ['데이터', '웹', '데이터', '인프라', '인프라', '기초', '웹', '인프라'];
const DB = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, title: T[i % 8] + ' ' + K[i / 8 | 0], cat: CAT[i % 8], price: 12000 + i * 7 % 10 * 1000, rating: (30 + i * 11 % 21) / 10 }));
function handle(url) {
  const p = new URL(url, 'http://fake').searchParams, q = (p.get('q') || '').toLowerCase(), [k, dir] = (p.get('sort') || '').split(':');
  const rows = DB.filter(b => b.title.toLowerCase().includes(q)), page = +p.get('page') || 1, size = +p.get('size') || SIZE;
  if (k) rows.sort((a, b) => ((a[k] > b[k]) - (a[k] < b[k])) * (dir === 'desc' ? -1 : 1));
  return { total: rows.length, items: rows.slice((page - 1) * size, page * size) };
}
function fakeApi(url, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const q = new URL(url, 'http://fake').searchParams.get('q') || '';
    const done = (status, text) => resolve({ ok: status < 400, status, json: async () => JSON.parse(text) });
    const t = setTimeout(() => {
      if (SIM.mode === 'CORS 차단') console.error("Access to fetch at '" + url + "' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.");   // ★ 이 문장은 콘솔에만 찍힌다
      if (SIM.mode === '오프라인' || SIM.mode === 'CORS 차단') reject(new TypeError('Failed to fetch'));                                                                                           // ★
      else if (SIM.mode === '오류' || (SIM.mode === '불안정' && ++SIM.n % 3)) done(503, '{"error":"점검 중"}');
      else if (SIM.mode === '깨진 응답') done(200, '<html>점검 중</html>');
      else done(200, JSON.stringify(handle(url)));
    }, SIM.delay * (q.length === 1 ? 3 : 1));
    const stop = () => { clearTimeout(t); reject(signal.reason); };
    if (signal?.aborted) stop(); else signal?.addEventListener('abort', stop);
  });
}

// ---- 클라이언트: 가짜와 진짜를 갈아 끼우는 단 하나의 이음새 ----
const api = (u, o) => CONFIG.USE_REAL ? fetch(CONFIG.BASE + u, o) : fakeApi(u, o);                         // ★ 진짜 fetch와 가짜의 인터페이스가 같다
async function getJSON(url, opts) {
  if (/[?&](api_?key|token|secret)=/i.test(url)) throw Object.assign(new Error('주소(URL)에 비밀 키를 싣지 마세요'), { status: 400 });   // ★ 키가 주소에 실리면 개발 중에 바로 막는다 (4xx라 재시도도 안 한다)
  const res = await api(url, opts);                                                                          // ★ fakeApi → api
  if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status), { status: res.status });
  return res.json();
}
async function withRetry(fn, tries = 3) {
  for (let n = 1; ; n++) {
    try { return await fn(); } catch (e) {
      if (e.name === 'AbortError' || n >= tries || e.status < 500) throw e;
      log('재시도 ' + n + '회 (' + e.message + ')');
      await new Promise(r => setTimeout(r, Math.random() * 300 * 2 ** (n - 1)));
    }
  }
}
const cache = new Map();
async function cached(url, opts) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < TTL) { log('캐시 적중 ' + decodeURIComponent(url)); return hit.v; }
  const v = await withRetry(() => getJSON(url, opts));
  cache.set(url, { v, t: Date.now() });
  return v;
}

const S = { status: 'idle', data: null, error: '', q: '', sort: '', page: 1 };
const pages = () => Math.max(1, Math.ceil((S.data ? S.data.total : 0) / SIZE));
const explain = e => e.name === 'SyntaxError' ? '서버 응답이 올바른 JSON이 아닙니다'
  : e.status ? '서버 오류 (HTTP ' + e.status + ')' : '네트워크에 연결할 수 없습니다 (오프라인이거나 CORS 차단일 수 있습니다. 콘솔을 확인하세요)';   // ★
function render() {
  const v = $('view'), d = S.data;
  if (S.status === 'loading') v.innerHTML = '<div class="box">불러오는 중...</div>';
  else if (S.status === 'error') v.innerHTML = '<div class="box err">' + esc(S.error) + ' <button id="retry">다시 시도</button></div>';
  else if (!d.items.length) v.innerHTML = '<div class="box">"' + esc(S.q) + '" 검색 결과가 없습니다</div>';
  else v.innerHTML = '<ul>' + d.items.map(b => '<li><b>' + esc(b.title) + '</b> ' + esc(b.price) + '원 · 평점 ' + esc(b.rating) + '</li>').join('') + '</ul>';
  $('pg').textContent = S.page + ' / ' + pages() + (S.data ? ' (총 ' + S.data.total + '권)' : '');
  $('prev').disabled = S.page <= 1; $('next').disabled = S.page >= pages();
}
let ctrl;
async function load() {
  ctrl?.abort(); ctrl = new AbortController();
  const url = '/api/books?' + new URLSearchParams({ q: S.q, sort: S.sort, page: S.page, size: SIZE });
  S.status = 'loading'; render(); log('→ ' + decodeURIComponent(url));
  try { S.data = await cached(url, { signal: ctrl.signal }); S.status = 'success'; log('← 성공 ' + S.data.total + '권'); }
  catch (e) {
    if (e.name === 'AbortError') return log('✗ 취소됨 (더 새로운 요청이 있다)');
    S.status = 'error'; S.error = explain(e); log('✗ ' + e.name + ': ' + e.message);
  }
  render();
}
const debounce = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };
$('q').oninput = debounce(() => { S.q = $('q').value.trim(); S.page = 1; load(); }, 300);
$('sort').onchange = () => { S.sort = $('sort').value; S.page = 1; load(); };
$('prev').onclick = () => { S.page--; load(); };
$('next').onclick = () => { S.page++; load(); };
$('mode').onchange = () => { SIM.mode = $('mode').value; };
$('view').onclick = e => { if (e.target.id === 'retry') load(); };
load();
</script>
`,
      codeLang: `html`,
      key: [
        `CORS는 서버가 응답 헤더로 허락하고 브라우저가 집행한다. JS에는 TypeError로만 보이고 자세한 이유는 콘솔에만 나온다.`,
        `Authorization 헤더나 application/json 요청은 OPTIONS 프리플라이트가 먼저 나가며, 고치는 곳은 서버(또는 프록시)다.`,
        `화면 코드의 키는 공개된 키다. 비밀 키는 서버나 프록시가 환경 변수로 보관하고 브라우저는 같은 출처의 우리 API만 부른다.`,
        `가짜에서 진짜로의 교체는 api() 한 지점과 어댑터 한 함수로 끝나게 설계한다.`
      ],
      pitfalls: [
        `CORS 오류를 프런트에서 no-cors로 풀려다 응답을 읽지 못하는 상태에 빠진다.`,
        `API 키를 소스, 번들 환경 변수, 로컬스토리지에 넣고 난독화했으니 안전하다고 믿는다.`,
        `키를 쿼리스트링에 실어 서버 로그, 브라우저 기록, Referer로 흘린다.`,
        `와일드카드(*)와 쿠키 인증을 함께 쓰려다 브라우저가 응답을 막는다.`
      ]
    },
    {
      title: `확장과 종합 사례: 차트·즐겨찾기를 얹은 책방 대시보드 납품`,
      body: `마지막 단계는 고객이 여기에 이것도 넣어 달라고 말할 때 어떻게 확장하는지 보여 주는 종합 사례입니다. 가상의 의뢰는 이렇습니다. 동네 책방 사장님이 도서 목록 화면에 카테고리별 권수 차트와 관심 도서 즐겨찾기를 붙여 달라고 합니다. 서버가 느리거나 죽어도 목록은 계속 쓸 수 있어야 하고, 나중에 실제 재고 API로 바꿀 예정입니다.

### 요구를 설계 결정으로 번역하기
| 고객의 말 | 설계 결정 | 해당 강 |
| 검색이 버벅여요 | 디바운스와 이전 요청 취소 | 4 |
| 가끔 하얀 화면이 떠요 | 네 상태 화면과 다시 시도 | 3 |
| 느리고 가끔 안 돼요 | 캐시와 지터 재시도 | 6 |
| API 키가 노출됐대요 | 서버 프록시, 화면엔 키 없음 | 7 |
| 차트도 넣어 주세요 | 서버 집계와 독립 요청 | 8 |

### 차트: 집계는 서버, 요청은 독립
카테고리별 권수를 얻으려고 40권(또는 4만 권)을 전부 내려받아 세면 5강의 페이지네이션이 무의미해집니다. 서버가 ‹/api/stats›로 집계된 작은 객체를 주게 하고 클라이언트는 그리기만 합니다. 라이브러리 없이 ‹div›의 너비로 막대를 그렸고 값을 글자로도 적어 두어 색을 못 보는 사용자에게도 정보가 전달됩니다. 이 요청은 목록과 독립입니다. ‹Promise.all›로 묶으면 차트 하나가 실패할 때 목록까지 못 보게 되므로 각자 ‹try/catch›를 두거나 ‹Promise.allSettled›로 성공과 실패를 따로 받습니다. MDN은 all이 하나만 reject돼도 곧바로 reject되고, allSettled는 모두 끝난 뒤 각자의 결과를 모아 이행한다고 구분합니다. 차트가 죽으면 차트 자리에만 안내 문구가 나오고 목록은 그대로입니다.

### 즐겨찾기: 상태, 저장, 이벤트 위임
- 상태: ‹Set›에 책 id를 담습니다. 중복이 구조적으로 불가능하고 추가, 삭제, 포함 검사가 간단합니다.
- 저장: ‹localStorage›에 JSON 문자열로 저장합니다. 단 저장소는 실패할 수 있습니다. 사생활 보호 모드, 용량 초과, 이 학습 창 같은 샌드박스에서는 접근 자체가 예외를 던지기도 하므로 읽기와 쓰기 모두 ‹try/catch›로 감싸고 실패해도 메모리 상태로 계속 동작하게 합니다. 이 학습 창에서는 저장이 막혀 로그에 안내가 뜨고 새로고침하면 초기화되는 것이 정상이며, 저장한 HTML 파일을 브라우저에서 열면 유지됩니다. 기기 간 동기화가 필요하면 서버에 저장하고, 화면을 먼저 바꾼 뒤 실패하면 되돌리는 낙관적 업데이트를 씁니다. 쓰기 요청이므로 6강의 멱등 키 원칙을 다시 떠올리세요.
- 이벤트 위임: 목록은 ‹innerHTML›로 통째로 다시 그려지므로 버튼마다 리스너를 달아도 곧 사라집니다. 부모(‹#view›)에 리스너 하나를 달고 ‹e.target.dataset.id›로 어느 버튼인지 알아냅니다.

### 납품 전 점검
가짜 서버를 남겨 두면 서버 상태 선택으로 모든 실패 화면을 시연하고 회귀 시험까지 할 수 있습니다. 실제 API로 바꿀 때는 ‹CONFIG›와 어댑터 두 곳만 만집니다. 이 기준을 인수 점검표에 적어 고객에게 함께 넘기는 것이 외주 납품의 마무리입니다.

### 확인
실행하면 목록 아래에 막대 네 개(데이터 10, 웹 10, 인프라 15, 기초 5)가 나타나야 합니다. 별(☆)을 누르면 ★로 바뀌어야 하고, 이 학습 창에서는 로그에 저장 불가 안내가 뜹니다. 이번에는 ‹loadChart› 안의 ‹'/api/stats'›를 ‹'/api/stats?apikey=1'›로 바꿔 실행해 보세요. 차트 자리에만 불러오지 못했다는 문구가 나오고 목록은 정상으로 남아야 합니다.

### 혼자 해 보기
차트 막대를 누르면 그 분류만 보이게 하세요. 서버 ‹handle›이 ‹cat› 매개변수로 거르게 하고, ‹S.cat›을 ‹URLSearchParams›에 실으며, 바꿀 때 page를 1로 되돌립니다. "웹" 막대를 누르면 "1 / 2 (총 10권)"이 보이고, 분류가 다른 두 주소가 캐시에서 섞이지 않으면 성공입니다.`,
      code: `<!doctype html>
<html lang="ko">
<meta charset="utf-8">
<title>책 대시보드 8단계</title>
<style>
body{font:15px system-ui;max-width:600px;margin:12px auto;padding:0 12px}.row{display:flex;gap:6px;margin:6px 0;align-items:center}
.box{padding:12px;border-radius:8px;background:#e8eefc}.err{background:#fde0e0}li{display:flex;gap:8px;padding:5px 0;border-bottom:1px solid #ddd}
li b{flex:1}.bar{background:#46c;color:#fff;margin:2px 0;padding:1px 6px;white-space:nowrap}
#log{background:#111;color:#9f9;padding:8px;height:110px;overflow:auto;font:12px monospace}
</style>
<body>
<div class="row"><input id="q" placeholder="제목 검색">
  <select id="sort"><option value="">정렬 안 함</option><option value="price">가격 낮은 순</option><option value="rating:desc">평점 높은 순</option></select>
  서버 <select id="mode"><option>정상</option><option>오류</option><option>불안정</option><option>깨진 응답</option><option>오프라인</option><option>CORS 차단</option></select></div>
<div id="view"></div>
<div class="row"><button id="prev">이전</button><span id="pg"></span><button id="next">다음</button></div>
<div id="chart"></div>
<div id="log"></div>
<script>
const $ = id => document.getElementById(id), SIM = { delay: 600, mode: '정상', n: 0 }, SIZE = 8, TTL = 30000;
const CONFIG = { USE_REAL: false, BASE: '' };
const log = m => { $('log').append(m, document.createElement('br')); $('log').scrollTop = 1e9; };
const esc = s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');

// ---- 가짜 서버 (통계 주소 /api/stats 추가) ----
const T = ['파이썬', '자바스크립트', 'SQL', '리눅스', '네트워크', '알고리즘', '디자인', '보안'], K = ['입문', '실전', '가이드', '레시피', '핸드북'];
const CAT = ['데이터', '웹', '데이터', '인프라', '인프라', '기초', '웹', '인프라'];
const DB = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, title: T[i % 8] + ' ' + K[i / 8 | 0], cat: CAT[i % 8], price: 12000 + i * 7 % 10 * 1000, rating: (30 + i * 11 % 21) / 10 }));
function handle(url) {
  const u = new URL(url, 'http://fake'), p = u.searchParams, q = (p.get('q') || '').toLowerCase(), [k, dir] = (p.get('sort') || '').split(':');
  if (u.pathname === '/api/stats') return DB.reduce((c, b) => (c[b.cat] = (c[b.cat] || 0) + 1, c), {});          // ★ 카테고리별 권수를 센 객체
  const rows = DB.filter(b => b.title.toLowerCase().includes(q)), page = +p.get('page') || 1, size = +p.get('size') || SIZE;
  if (k) rows.sort((a, b) => ((a[k] > b[k]) - (a[k] < b[k])) * (dir === 'desc' ? -1 : 1));
  return { total: rows.length, items: rows.slice((page - 1) * size, page * size) };
}
function fakeApi(url, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const q = new URL(url, 'http://fake').searchParams.get('q') || '';
    const done = (status, text) => resolve({ ok: status < 400, status, json: async () => JSON.parse(text) });
    const t = setTimeout(() => {
      if (SIM.mode === 'CORS 차단') console.error("Access to fetch at '" + url + "' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.");
      if (SIM.mode === '오프라인' || SIM.mode === 'CORS 차단') reject(new TypeError('Failed to fetch'));
      else if (SIM.mode === '오류' || (SIM.mode === '불안정' && ++SIM.n % 3)) done(503, '{"error":"점검 중"}');
      else if (SIM.mode === '깨진 응답') done(200, '<html>점검 중</html>');
      else done(200, JSON.stringify(handle(url)));
    }, SIM.delay * (q.length === 1 ? 3 : 1));
    const stop = () => { clearTimeout(t); reject(signal.reason); };
    if (signal?.aborted) stop(); else signal?.addEventListener('abort', stop);
  });
}

// ---- 클라이언트 (7단계와 같다) ----
const api = (u, o) => CONFIG.USE_REAL ? fetch(CONFIG.BASE + u, o) : fakeApi(u, o);
async function getJSON(url, opts) {
  if (/[?&](api_?key|token|secret)=/i.test(url)) throw Object.assign(new Error('주소(URL)에 비밀 키를 싣지 마세요'), { status: 400 });
  const res = await api(url, opts);
  if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status), { status: res.status });
  return res.json();
}
async function withRetry(fn, tries = 3) {
  for (let n = 1; ; n++) {
    try { return await fn(); } catch (e) {
      if (e.name === 'AbortError' || n >= tries || e.status < 500) throw e;
      log('재시도 ' + n + '회 (' + e.message + ')');
      await new Promise(r => setTimeout(r, Math.random() * 300 * 2 ** (n - 1)));
    }
  }
}
const cache = new Map();
async function cached(url, opts) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < TTL) { log('캐시 적중 ' + decodeURIComponent(url)); return hit.v; }
  const v = await withRetry(() => getJSON(url, opts));
  cache.set(url, { v, t: Date.now() });
  return v;
}

// ---- 상태·화면 ----
const S = { status: 'idle', data: null, error: '', q: '', sort: '', page: 1 }, fav = new Set();                      // ★ fav: 즐겨찾기 id 집합
const pages = () => Math.max(1, Math.ceil((S.data ? S.data.total : 0) / SIZE));
const explain = e => e.name === 'SyntaxError' ? '서버 응답이 올바른 JSON이 아닙니다'
  : e.status ? '서버 오류 (HTTP ' + e.status + ')' : '네트워크에 연결할 수 없습니다 (오프라인이거나 CORS 차단일 수 있습니다. 콘솔을 확인하세요)';
function render() {
  const v = $('view'), d = S.data;
  if (S.status === 'loading') v.innerHTML = '<div class="box">불러오는 중...</div>';
  else if (S.status === 'error') v.innerHTML = '<div class="box err">' + esc(S.error) + ' <button id="retry">다시 시도</button></div>';
  else if (!d.items.length) v.innerHTML = '<div class="box">"' + esc(S.q) + '" 검색 결과가 없습니다</div>';
  else v.innerHTML = '<ul>' + d.items.map(b => '<li><button data-id="' + esc(b.id) + '">' + (fav.has(b.id) ? '★' : '☆') + '</button><b>' + esc(b.title) + '</b>'   // ★ 즐겨찾기 버튼
    + esc(b.price) + '원 · 평점 ' + esc(b.rating) + '</li>').join('') + '</ul>';
  $('pg').textContent = S.page + ' / ' + pages() + (S.data ? ' (총 ' + S.data.total + '권)' : '');
  $('prev').disabled = S.page <= 1; $('next').disabled = S.page >= pages();
}
let ctrl;
async function load() {
  ctrl?.abort(); ctrl = new AbortController();
  const url = '/api/books?' + new URLSearchParams({ q: S.q, sort: S.sort, page: S.page, size: SIZE });
  S.status = 'loading'; render(); log('→ ' + decodeURIComponent(url));
  try { S.data = await cached(url, { signal: ctrl.signal }); S.status = 'success'; log('← 성공 ' + S.data.total + '권'); }
  catch (e) {
    if (e.name === 'AbortError') return log('✗ 취소됨 (더 새로운 요청이 있다)');
    S.status = 'error'; S.error = explain(e); log('✗ ' + e.name + ': ' + e.message);
  }
  render();
}
async function loadChart() {                                                                                           // ★ 목록과 따로 실패할 수 있는 두 번째 요청
  try {
    const c = await cached('/api/stats');
    $('chart').innerHTML = '<h4>카테고리별 책 수</h4>' + Object.entries(c).map(([k, n]) => '<div class="bar" style="width:' + n * 12 + 'px">' + esc(k) + ' ' + n + '</div>').join('');
  } catch (e) { $('chart').textContent = '차트를 불러오지 못했습니다 (' + e.message + ')'; }                              // 차트가 실패해도 목록은 산다
}
const save = () => { try { localStorage.setItem('fav', JSON.stringify([...fav])); } catch (e) { log('저장소를 쓸 수 없어 즐겨찾기는 이 화면에서만 유지됩니다'); } };   // ★
try { JSON.parse(localStorage.getItem('fav') || '[]').forEach(id => fav.add(id)); } catch (e) { /* 저장소가 막힌 환경: 빈 상태로 시작 */ }                  // ★
const debounce = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };
$('q').oninput = debounce(() => { S.q = $('q').value.trim(); S.page = 1; load(); }, 300);
$('sort').onchange = () => { S.sort = $('sort').value; S.page = 1; load(); };
$('prev').onclick = () => { S.page--; load(); };
$('next').onclick = () => { S.page++; load(); };
$('mode').onchange = () => { SIM.mode = $('mode').value; };
$('view').onclick = e => {                                                                                             // ★ 이벤트 위임: 목록 전체에 리스너 하나
  if (e.target.id === 'retry') return load();
  const id = +e.target.dataset.id; if (id) { fav.has(id) ? fav.delete(id) : fav.add(id); save(); render(); }
};
load(); loadChart();
</script>
`,
      codeLang: `html`,
      key: [
        `서로 독립인 요청(목록과 차트)은 각자 실패를 처리해 하나의 실패가 전체를 막지 않게 한다.`,
        `집계는 서버가 하고 클라이언트는 작은 결과만 받아 그린다. 차트는 값을 글자로도 표시한다.`,
        `즐겨찾기는 Set과 localStorage(JSON)이며, 저장소 접근은 항상 try/catch로 감싸 실패해도 메모리로 동작시킨다.`,
        `innerHTML로 다시 그리는 목록에는 이벤트 위임으로 부모 하나에 리스너를 단다.`,
        `고객 요구는 설계 결정 표로 번역하고, 교체 지점(CONFIG, 어댑터)을 인수 점검표에 적어 납품한다.`
      ],
      pitfalls: [
        `Promise.all로 목록과 차트를 묶어 차트 오류가 목록 화면까지 오류로 만든다.`,
        `localStorage 접근을 try/catch 없이 호출해 사생활 보호 모드나 샌드박스에서 앱이 시작도 못 한다.`,
        `다시 그려지는 요소마다 리스너를 달아 클릭이 가끔 안 먹는다.`,
        `클라이언트가 전체 데이터를 받아 집계해 대량 데이터에서 느려지고 페이지네이션 설계가 무너진다.`
      ]
    }
  ],
  labs: [
    {
      title: `다른 주제로 갈아 끼우기: 영화 목록 앱의 네 가지 화면`,
      scenario: `가상의 영화 동호회가 상영 예정 영화 목록을 검색하는 화면을 만들어 달라고 의뢰했습니다. 서버가 아직 없어서 가짜 데이터로 먼저 보여 달라는 조건입니다. 이 실습의 목적은 1~3강 코드를 복사하는 것이 아니라 같은 구조를 새 주제에서 처음부터 다시 세워 보며 몸에 익히는 것입니다. 막히면 해당 강의 코드를 한 부분씩만 확인하세요. 도구는 텍스트 편집기와 브라우저(개발자 도구)뿐이고 모두 무료입니다.`,
      steps: [
        `새 HTML 파일 하나를 만들고 영화 30편의 데이터를 규칙으로 생성한다. 제목, 장르 3종, 개봉 연도, 평점을 갖는다.`,
        `fakeApi(url)를 직접 작성한다. Promise를 돌려주고, ‹{ ok, status, json() }› 모양이며, 지연(‹SIM.delay›)과 서버 모드 4종(정상, 오류, 깨진 응답, 오프라인)을 지원한다. 응답은 JSON 문자열로 만들고 json()에서 파싱한다.`,
        `getJSON(url)을 작성한다. ok를 검사하고 실패는 status를 붙인 Error로 던지며, 화면 코드는 Response를 직접 만지지 않는다.`,
        `상태 객체의 status 하나로 로딩, 오류, 빈 상태, 성공 네 화면을 render() 한 함수에서 그린다. 불리언 상태 변수는 쓰지 않는다.`,
        `검색 입력과 버튼을 붙이고 q 파라미터로 서버가 제목을 걸러 주게 한다. 빈 상태 문구에는 검색어를 이스케이프해 보여 준다.`,
        `explain(e)로 세 가지 실패(네트워크, 서버 오류, 응답 해석 실패)를 서로 다른 문구로 보여 준다. 오류 화면에는 다시 시도 버튼을 둔다.`,
        `서버 상태 select로 모드를 바꿔 가며 각 화면을 재현하고 스크린샷을 찍는다.`,
        `영화 한 편의 제목을 꺾쇠로 감싼 b 태그가 든 문자열로 바꿔 목록과 빈 상태 문구에 글자 그대로 나오는지 확인한다.`
      ],
      accept: [
        `서버 모드 4종과 0건 검색을 합쳐 서로 다른 화면 5가지를 재현한 스크린샷 5장이 있다.`,
        `소스 전체에서 응답 객체(ok, status, json)를 직접 다루는 곳이 getJSON 한 함수뿐이다. 검색으로 확인한다.`,
        `제목에 b 태그 문자열이 들어 있어도 목록과 빈 상태 모두 글자 그대로 보인다.`,
        `isLoading 같은 불리언 상태 변수가 0개이고, 로딩 중 오류 상자가 같이 보이는 순간이 한 번도 없다.`
      ],
      stretch: `네 화면을 renderLoading, renderError, renderEmpty, renderList 함수 네 개로 나누고, 가짜 상태 객체를 넣었을 때 결과 HTML에 특정 문구가 들어 있는지 console.assert로 확인하는 점검 코드를 작성한다.`
    },
    {
      title: `제한 시간·진행 안내·재시도 정책: 불안정한 서버에 버티는 클라이언트`,
      scenario: `가상의 고객이 이렇게 신고했습니다. 지방 지점 PC에서 가끔 화면이 영원히 불러오는 중에 멈추고, 재시도를 하는 건지도 알 수 없다. 8강까지 완성한 대시보드를 새 파일로 복사해 응답이 없는 서버와 불안정한 서버에서 버티게 고치는 것이 이 실습입니다. 각 정책의 숫자는 감이 아니라 측정으로 정해야 하므로 시간을 로그로 남기는 습관을 함께 들입니다. 도구는 브라우저와 텍스트 편집기뿐입니다.`,
      steps: [
        `가짜 서버에 응답 없음 모드(지연 30초)를 추가한다.`,
        `요청마다 제한 시간 8초를 건다. 컨트롤러에 이름이 TimeoutError인 DOMException을 넘겨 abort하는 방식으로 구현하고(가짜 서버가 signal.reason으로 reject하게 되어 있다), 브라우저가 AbortSignal.timeout을 지원하는지 MDN 호환성 표로 확인해 가능하면 그것으로도 한 번 구현해 본다. 새 입력으로 인한 수동 취소와 시간 제한을 한 요청에 함께 걸려면 AbortSignal.any([취소 신호, 시간 제한 신호])로 합칠 수 있다.`,
        `시간 초과는 AbortError와 달리 오류 화면으로 보여 주고, 문구는 서버가 8초 안에 응답하지 않았다는 내용으로 따로 만든다. 시간 초과를 재시도할지 말지 정하고 이유를 코드 주석 한 줄로 적는다.`,
        `로딩 상자를 요청 시작 400ms 뒤에야 보이게 한다. 응답이 빠르면 로딩 상자가 아예 나타나지 않아야 한다.`,
        `재시도 중임을 로딩 상자에 다시 시도하는 중 (2/3)처럼 표시한다. 시도 횟수를 상태에 기록해 render가 읽게 한다.`,
        `가짜 서버에 429 모드를 추가해 응답에 Retry-After: 2 값을 싣고, withRetry가 이 값이 있으면 백오프 대신 그만큼 기다리게 한다.`,
        `404 모드도 추가해 재시도 로그가 0줄인지 확인한다.`,
        `모드별(정상, 불안정, 오류, 응답 없음, 429)로 사용자가 최종 화면을 보기까지 걸린 시간을 5번씩 측정해 표로 정리한다.`
      ],
      accept: [
        `응답 없음 모드에서 시간 초과를 재시도하지 않기로 했다면, 요청 시작 후 8초(오차 1초 이내)에 시간 초과 오류 화면과 다시 시도 버튼이 보인다.`,
        `지연을 150ms로 둔 정상 모드에서 로딩 상자가 한 번도 나타나지 않고, 1500ms로 두면 나타난다.`,
        `불안정 모드에서 로딩 상자의 재시도 횟수 표시가 (1/3), (2/3)로 갱신되고, 404 모드의 재시도 로그는 0줄이다.`,
        `429와 Retry-After: 2 모드에서 첫 재시도까지의 대기가 로그 시각 기준 2초(오차 0.3초 이내)다.`
      ],
      stretch: `재시도 총 시간 예산(예: 6초)을 정하고, 남은 시간이 다음 대기보다 짧으면 즉시 포기하는 마감 시각(deadline) 방식으로 withRetry를 바꿔 모드별 최악 대기 시간 표가 예산 안에 들어오는지 증명한다.`
    },
    {
      title: `지점별 매출 현황 대시보드 납품: 의뢰서에서 인수 점검표까지`,
      scenario: `가상의 커피 프랜차이즈 본사 운영팀장이 이런 메일을 보냈습니다. 전국 120개 지점의 어제 매출을 한 화면에서 보고 싶습니다. 지점명 검색, 매출순 정렬, 20개씩 페이지, 지역별 매출 합계 막대 차트, 자주 보는 지점 즐겨찾기가 필요합니다. 데이터는 사내 API에서 받는데 주소는 다음 주에 확정되고, 접근에는 API 키가 필요하며 키는 보안팀이 관리합니다. 네트워크가 가끔 불안정해서 오류가 나도 직원이 이유를 알아야 합니다. 일단 가짜 데이터로 시연하고 API가 정해지면 바꿔 주세요. 여러분은 이 의뢰를 질문, 설계, 구현, 문서, 인수 점검표까지 한 묶음으로 납품합니다.`,
      steps: [
        `의뢰서에서 불명확한 점을 질문 목록으로 만든다. 응답 모양, 총 개수 제공 여부, 정렬 가능 필드, 호출 한도, CORS 허용 여부, 키 전달 방식, 갱신 주기, 지원 브라우저 등 8개 이상이며 각각 답에 따라 설계가 어떻게 달라지는지 한 줄을 붙인다.`,
        `가짜 서버를 만든다. 지점 120개(지역 5개), 검색, 매출 정렬, 20개씩 페이지, 지역별 합계(‹/api/stats›), 서버 모드 5종(정상, 오류, 불안정, 깨진 응답, 오프라인)을 지원한다.`,
        `화면을 만든다. 네 가지 상태 화면, 디바운스와 요청 취소, 페이지네이션, TTL을 설정으로 뺀 캐시(기본 60초), 지터 있는 재시도를 포함한다.`,
        `지역별 막대 차트(값을 글자로도 표시)와 즐겨찾기(저장소 실패 대비)를 붙이고, 차트 실패가 목록을 막지 않게 분리한다.`,
        `키 정책을 문서화한다. 화면 코드에는 키가 없고, CONFIG 한 곳과 어댑터 함수로 교체하며, 비밀 키 때문에 프록시가 필요하다는 구조를 글로 된 그림 한 장으로 그린다.`,
        `README를 쓴다. 실행 방법, 서버 상태 시험법, 실제 API로 교체하는 절차 체크리스트, 알려진 제한을 담는다.`,
        `인수 점검표를 20줄 이내로 쓴다. 각 줄은 이렇게 하면 이것이 보여야 합격이라는 형식이다.`,
        `견적 메모를 쓴다. 이 범위를 시간 단위로 쪼개고, 실제 API 연결과 프록시 서버는 별도 항목으로 분리해 가정과 함께 적는다.`
      ],
      accept: [
        `질문 목록 8개 이상에 각각 설계 영향 한 줄이 있다.`,
        `가짜 서버로 120건, 6쪽(20개씩), 지역 5개 막대가 보이고 서버 모드 5종 모두에서 의도한 화면이 나온다.`,
        `검색창에 한글 5글자를 0.2초 간격으로 입력하면 요청 로그가 1건이고, 한 글자 검색이 느린 상황에서도 마지막 입력의 결과만 최종 화면에 남는다.`,
        `소스 전체에서 키나 토큰으로 보이는 값이 0개이고, 실제 API로 바꿀 때 수정할 곳이 CONFIG와 어댑터 두 곳뿐이다.`,
        `README만 보고 처음 보는 사람이 5분 안에 실행하고 서버 상태 시험까지 마칠 수 있다. 타이머로 확인한다.`
      ],
      stretch: `키를 환경 변수에서 읽는 20줄 안팎의 프록시 서버를 직접 만들어(언어 자유) 가짜 상류 서버를 대신 호출하게 하고, 브라우저에서는 같은 출처의 주소만 부르도록 BASE를 바꿔 CORS 헤더 없이 동작하며 화면 소스에 키가 없음을 개발자 도구로 증명한다.`
    }
  ],
  quiz: [
    {
      q: `서버에 없는 책을 요청하면 404 상태와 본문 {"error":"not found"}가 돌아온다. render는 배열을 받아 map으로 목록을 그린다고 할 때, 아래 코드를 실행하면 무슨 일이 일어나는가?

async function show() {
  const res = await fetch('/api/books/999');
  const data = await res.json();
  render(data.items);
}`,
      choices: [
        `fetch가 404 상태에서 reject되므로 render는 호출되지 않고 오류가 콘솔에만 남는다`,
        `fetch와 json()은 성공하지만 data.items가 정의되지 않은 값이라 render 안의 map에서 TypeError가 난다`,
        `res.json()이 오류 응답의 본문은 읽지 못하게 막아 두어서 두 번째 줄의 await에서 예외가 난다`,
        `await가 응답 상태 코드가 400 이상이면 자동으로 예외를 던지므로 render 줄에는 도달하지 못한다`
      ],
      answer: 1,
      why: `fetch는 HTTP 오류 상태에서도 Response로 이행하고, 본문 {"error":"not found"}는 올바른 JSON이라 json()도 성공한다. 그래서 data.items가 정의되지 않은 값인 채로 render가 호출되어 엉뚱한 곳에서 TypeError가 난다. 가장 그럴듯한 오답은 404에서 reject된다는 보기인데, reject는 네트워크 실패, CORS 차단, 취소처럼 응답을 받지 못했을 때만 일어난다(MDN Using Fetch). await도 상태 코드를 보지 않는다. 올바른 코드는 res.ok를 먼저 검사한다.`
    },
    {
      q: `검색창에서 "자"를 친 뒤 "자바"를 이어 쳤다. 고객은 가끔 입력과 다른 결과가 남는다고 한다. 요청 로그다.

t=0ms     → GET /api/books?q=자
t=350ms   → GET /api/books?q=자바
t=950ms   ← q=자바 5건 (화면 갱신)
t=1800ms  ← q=자 10건 (화면 갱신)

가장 적절한 수정은?`,
      choices: [
        `서버를 증설하고 한 글자 검색용 인덱스를 추가해 응답 시간을 줄이면 순서가 뒤바뀌는 일도 사라진다`,
        `디바운스 시간을 3000ms로 늘려 사용자가 완전히 멈춘 뒤에만 요청을 보내게 해서 겹치는 요청을 없앤다`,
        `응답이 도착해도 1초 동안 화면 갱신을 보류했다가 가장 마지막에 도착한 응답으로 한꺼번에 그린다`,
        `새 요청 전에 이전 요청의 AbortController를 abort하고, AbortError는 오류 화면 없이 무시한다`
      ],
      answer: 3,
      why: `문제는 속도가 아니라 도착 순서가 요청 순서와 다른 경합이다. 오래된 요청을 취소하면 마지막 요청만 화면에 영향을 준다. 서버 증설은 가장 그럴듯하지만 응답 시간이 줄어도 네트워크 지연이 제각각이라 순서가 뒤바뀔 가능성이 남는다. 디바운스를 길게 하면 반응만 느려지고 경합은 다른 모양으로 다시 나타나며, 갱신 보류도 순서 역전을 막지 못한다.`
    },
    {
      q: `검색 입력에 디바운스를 달았는데도 글자를 칠 때마다 요청이 나간다. 원인은?

$('q').oninput = () => {
  const run = debounce(load, 300);
  run();
};`,
      choices: [
        `핸들러가 실행될 때마다 debounce가 새 타이머 변수를 만들어 이전 타이머를 취소하지 못한다`,
        `300ms는 사람의 타자 간격보다 너무 길어서 타이머가 동작하지 않고 모든 입력이 즉시 전달된다`,
        `oninput 이벤트에서는 디바운스가 동작하지 않으므로 onchange 이벤트에 연결해야만 한다`,
        `load가 async 함수라서 Promise를 반환하므로 디바운스로 감쌀 수 없다`
      ],
      answer: 0,
      why: `debounce는 클로저 안의 타이머 변수에 이전 타이머를 기억해 지운다. 핸들러 안에서 매번 debounce를 호출하면 클로저가 매번 새로 생겨 지울 대상이 없다. 한 번 만든 함수를 핸들러에 연결해야 한다. oninput에서도 디바운스는 정상 동작하며(onchange로 바꾸면 입력 중 자동 검색이라는 요구만 사라진다), 300ms는 흔한 값이고, async 함수도 얼마든지 디바운스할 수 있다.`
    },
    {
      q: `상품 조회 중 아래 로그가 나왔다.

→ GET /api/books/999
재시도 1회 (HTTP 404)
재시도 2회 (HTTP 404)
✗ Error: HTTP 404   (총 2.4초)

무엇이 잘못되었고 어떻게 고치는가?`,
      choices: [
        `재시도 횟수가 모자라서 실패했다. 횟수를 5회로 늘리고 간격도 늘려 성공할 때까지 반복하게 한다`,
        `백오프 간격이 길어서 총 시간만 늘었다. 간격을 0으로 줄여 실패하면 바로 다시 시도하게 한다`,
        `404는 같은 요청을 반복해도 같은 답이므로 재시도에서 뺀다. 네트워크 실패와 5xx 같은 일시적 실패만 재시도한다`,
        `404는 서버 쪽 문제이므로 오류 응답을 캐시에 저장해 두었다가 같은 주소를 요청할 때 재사용한다`
      ],
      answer: 2,
      why: `4xx는 요청 자체가 잘못되었다는 신호라 반복해도 결과가 같다. 재시도는 사용자를 2.4초 더 기다리게 하고 서버만 괴롭힌다. 횟수를 늘리는 것은 문제를 악화시키고, 간격 0은 힘든 서버를 더 몰아붙이는 방향이다. 오류 응답을 캐시하면 서버가 복구된 뒤에도 오류를 재생하게 된다.`
    },
    {
      q: `외주 고객이 이렇게 말한다. "날씨 API 키를 script.js 맨 위에 const KEY = 'a1b2c3'; 로 넣고 코드를 난독화해서 배포하면 안전하지 않나요? 서버는 따로 만들기 싫어요." 가장 적절한 답변은?`,
      choices: [
        `난독화 도구로 코드를 변환하면 사실상 읽을 수 없으므로, 서버 없이 키를 코드에 두어도 일반 사용자와 공격자 모두에게 충분히 안전하다`,
        `내려간 코드와 요청은 누구나 볼 수 있어 키가 유출된 것으로 봐야 한다. 서버나 서버리스 함수가 키를 보관해 대신 호출하거나, 도메인 제한이 걸린 공개용 키만 쓴다`,
        `키를 base64로 인코딩해 두고 실행할 때만 디코딩하면 소스 보기와 개발자 도구에서도 키가 그대로 보이지 않으므로 안전하다`,
        `키를 localStorage에 넣어 두고 첫 방문 때 불러 쓰면 소스 코드 파일에는 나타나지 않으므로 공개된 코드에 키가 노출되지 않는다`
      ],
      answer: 1,
      why: `화면 코드와 그 코드가 보내는 요청은 사용자의 브라우저에서 읽을 수 있어서 Network 탭만 열어도 키가 보인다. 난독화와 인코딩은 시간을 조금 늘릴 뿐 방어가 아니고, localStorage에 넣어도 같은 브라우저에서 읽힌다. 서버를 만들 수 없다면 호출 한도와 도메인 제한이 걸린 공개용 키만 쓰는 쪽으로 요구사항을 조정해야 한다.`
    },
    {
      q: `https://my.site 에서 실행한 코드가 아래 오류를 낸다.

Access to fetch at 'https://api.example.com/books' from origin 'https://my.site' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.

curl로 같은 주소를 호출하면 정상적으로 JSON이 온다. 올바른 해결 위치는?`,
      choices: [
        `fetch 호출에 mode: 'no-cors'를 추가해 브라우저의 차단을 우회하고 응답 본문을 받아 온다`,
        `catch에서 이 오류를 무시하고 미리 넣어 둔 기본 데이터를 대신 보여 주는 것으로 마무리한다`,
        `fetch 대신 XMLHttpRequest로 같은 주소를 호출하도록 바꿔 CORS 정책을 적용받지 않게 한다`,
        `api.example.com 서버(또는 우리 프록시)가 응답에 Access-Control-Allow-Origin 헤더를 주게 설정한다`
      ],
      answer: 3,
      why: `CORS는 서버의 허락 헤더를 보고 브라우저가 집행하는 규칙이라 curl은 영향을 받지 않는다. 고치는 곳은 허락을 주는 쪽이다. no-cors는 요청을 보내게는 해도 응답을 읽을 수 없는 불투명한 상태가 되어 데이터를 얻지 못한다(MDN). 가장 그럴듯한 오답이다. XMLHttpRequest도 같은 정책을 받고, 오류를 무시하는 것은 원인 해결이 아니다.`
    },
    {
      q: `상품 번호 5개의 상세를 받아 오는 코드다. 요청은 서로 독립이고 하나에 600ms가 걸린다.

const books = [];
for (const id of ids) {
  books.push(await getJSON('/api/books/' + id));
}

총 소요 시간과 가장 적절한 개선은?`,
      choices: [
        `약 3000ms다. ids.map으로 요청을 먼저 모두 시작하고 Promise.all로 기다리면 약 600ms이며, 부분 실패 허용은 allSettled로 한다`,
        `약 3000ms다. for 대신 forEach에 async 콜백을 넘기면 요청이 병렬이 되고, 끝난 뒤 books에 모든 결과가 담기므로 가장 간단하다`,
        `약 600ms다. 요청이 서로 독립이므로 for 안의 await도 브라우저가 알아서 병렬로 처리하니 따로 개선할 필요가 없다`,
        `약 3000ms다. 브라우저는 한 번에 요청 하나만 보낼 수 있어서 병렬 처리로 바꿀 방법이 없고 순차 실행이 유일하다`
      ],
      answer: 0,
      why: `await는 해당 줄이 끝나야 다음 반복으로 넘어가므로 600 x 5 = 3000ms다. 요청을 먼저 모두 시작해 Promise.all로 기다리면 가장 느린 하나만큼인 약 600ms다. 단 all은 하나만 실패해도 전체가 reject되므로 일부 실패를 허용하려면 allSettled가 맞다(MDN Promise). 가장 그럴듯한 오답은 forEach 보기다. forEach는 async 콜백이 끝나기를 기다리지 않아서 다음 줄이 실행될 때 books는 아직 비어 있다. 브라우저는 여러 요청을 동시에 보낼 수 있고, await는 줄마다 기다린다.`
    },
    {
      q: `정렬을 가격 낮은 순으로 하고 3쪽을 보다가 검색창에 파이썬을 입력했다. 검색 결과는 5권(1쪽 분량)인데 화면에는 검색 결과가 없다고 나온다. 로그를 보니 요청은 q=파이썬&sort=price&page=3&size=8 이었다. 가장 근본적인 수정은?`,
      choices: [
        `서버가 page가 몇이든 항상 1쪽만 돌려주도록 바꿔서 어떤 경우에도 빈 화면이 나오지 않게 한다`,
        `빈 상태 문구를 결과가 없거나 페이지가 잘못되었습니다로 바꿔 사용자가 상황을 이해하게 한다`,
        `검색어나 정렬 같은 조건이 바뀌면 page를 1로 되돌린 뒤 요청한다. 서버도 범위 밖 page에 대비한다`,
        `정렬이 원인이므로 정렬을 끈 상태에서만 검색할 수 있도록 화면에서 안내 문구를 보여 준다`
      ],
      answer: 2,
      why: `조건이 바뀌면 결과 집합이 달라지므로 이전 조건의 페이지 번호는 의미를 잃는다. 클라이언트의 상태 전이 규칙이 빠진 버그다. 문구만 바꾸는 것이 가장 쉬운 선택이지만, 사용자는 여전히 결과가 있는 검색에서 빈 화면을 본다. 서버가 1쪽만 주면 페이지네이션 자체가 무너진다.`
    },
    {
      q: `운영 화면에 서버 응답이 올바른 JSON이 아니라는 문구가 가끔 뜬다. 해당 요청의 로그다.

→ GET /api/books?page=2
← HTTP 200 (text/html)
✗ SyntaxError: Unexpected token '<', "<html>점검 중</html>" is not valid JSON

가장 가능성 높은 원인과 적절한 대응은?`,
      choices: [
        `클라이언트의 JSON.parse가 응답 안의 한글을 제대로 처리하지 못하는 인코딩 문제이므로 UTF-8 설정을 바꾼다`,
        `앞단 프록시나 점검 페이지가 오류를 HTML로 200 응답했을 가능성이 크다. 파싱 실패를 별도 오류로 분류해 안내하고 서버 원인을 조사한다`,
        `서버는 정상이고, 클라이언트 코드가 같은 응답의 본문을 두 번 읽어서 생긴 문제이므로 읽는 횟수를 한 번으로 줄인다`,
        `fetch가 응답을 자동으로 파싱하다 실패한 것이므로 브라우저나 fetch 구현의 버전을 올려서 문제를 해결한다`
      ],
      answer: 1,
      why: `상태가 200이고 형식이 text/html이며 본문이 태그로 시작하므로 서버 앱이 아닌 중간 계층이 HTML 페이지를 준 것이다. ok 검사만으로는 이를 못 잡으므로 json() 실패를 별도로 처리해야 한다. JSON은 한글을 문제없이 다루고, fetch는 본문을 자동으로 파싱하지 않는다. 본문을 두 번 읽으면 문법 오류가 아니라 이미 읽었다는 별개의 오류가 난다(MDN은 본문을 한 번만 읽을 수 있다고 설명한다).`
    },
    {
      q: `검색할 때마다 항상 AbortError가 나서 결과가 한 번도 안 뜬다.

const ctrl = new AbortController();
async function load() {
  ctrl.abort();
  S.data = await getJSON(url, { signal: ctrl.signal });
  render();
}

무엇이 잘못되었는가?`,
      choices: [
        `getJSON이 async 함수가 아니라서 signal 옵션이 무시되고 있으므로 async 함수로 바꿔야 한다`,
        `abort()는 요청을 이미 보낸 뒤에만 호출할 수 있으므로 호출 순서를 await 뒤로 바꿔야 한다`,
        `render를 await 앞으로 옮겨 화면을 먼저 갱신한 뒤 데이터를 채우도록 순서를 바꿔야 한다`,
        `컨트롤러를 한 번만 만들어 재사용한다. abort된 신호는 되돌릴 수 없으므로 요청마다 새로 만들고 이전 것만 abort해야 한다`
      ],
      answer: 3,
      why: `AbortSignal은 한 번 abort되면 되돌릴 수 없어서 같은 컨트롤러를 계속 쓰면 첫 호출부터 이미 취소된 신호로 요청한다. 가장 그럴듯한 오답은 호출 시점이 문제라는 보기지만, 이미 abort된 신호로 시작한 요청은 곧바로 실패하므로 abort가 요청 뒤에만 가능하다는 말은 사실이 아니다. render 순서나 async 여부는 원인과 무관하다.`
    },
    {
      q: `검색 결과 없음 화면이 아래처럼 그려진다.

v.innerHTML = '<div class="box">"' + S.q + '" 검색 결과가 없습니다</div>';

보안 점검에서 취약점으로 지적되었다. 공격자가 링크로 검색어를 미리 채워 두면 어떤 일이 생길 수 있고, 어떻게 고치는가?`,
      choices: [
        `검색어가 길면 레이아웃이 깨질 뿐 보안 문제는 아니므로 입력 길이를 적당히 제한하는 것만으로 충분하다`,
        `서버가 검색어를 모두 소문자로 바꿔 돌려주면 태그가 동작하지 않게 되므로 이 처리 하나로 해결된다`,
        `검색어에 심은 태그와 스크립트가 HTML로 해석되어 실행될 수 있다(XSS). 값을 이스케이프하거나 textContent로 넣는다`,
        `innerHTML 대신 insertAdjacentHTML로 삽입 방식을 바꾸면 해석 방식이 달라져 안전해진다`
      ],
      answer: 2,
      why: `사용자 입력을 HTML로 해석되는 곳에 그대로 넣으면 입력에 든 태그가 실행된다. 이스케이프는 특수문자를 글자로만 보이게 만든다. 길이 제한은 짧은 공격 문자열을 막지 못하고, 소문자 변환은 대소문자와 무관하게 동작하는 태그를 막지 못하며, insertAdjacentHTML도 똑같이 HTML로 해석한다.`
    },
    {
      q: `결제 요청(POST /payments)이 가끔 8초 타임아웃에 걸린다. 팀원이 GET에 쓰던 withRetry로 감싸면 되지 않느냐고 제안한다. 가장 적절한 판단은?`,
      choices: [
        `위험하다. 타임아웃으로는 서버가 처리했는지 알 수 없으므로, 재시도마다 같은 멱등 키(Idempotency-Key)를 보내 중복을 알아보게 해야 한다`,
        `POST도 HTTP 규격상 멱등한 메서드이므로 같은 요청을 몇 번 보내도 서버에는 한 번만 반영되니 그대로 재시도해도 문제없다`,
        `재시도 횟수를 1회로 줄이고 대기 간격에 지터를 넣으면 중복 결제 위험이 사라지므로 이 구성으로 안전하게 쓸 수 있다`,
        `타임아웃을 8초에서 60초로 충분히 늘리고 재시도는 하지 않기로 하면, 서버가 처리했는지 모르는 문제도 함께 사라진다`
      ],
      answer: 0,
      why: `응답을 잃었을 뿐 서버가 이미 결제를 처리했을 수 있어서 재시도는 곧 이중 처리 위험이다. 멱등 키가 있으면 서버가 같은 의도를 알아보고 같은 응답을 돌려준다(Idempotency-Key는 결제 API들이 쓰는 관례이고 2026-11 기준 IETF 초안 단계다). RFC 9110은 POST를 멱등 메서드로 정의하지 않고, 비멱등 요청은 자동으로 재시도하지 말라고 권고한다. 재시도를 1회로 줄이거나 지터를 넣어도 위험의 크기와 시점만 달라지고, 타임아웃 연장도 연결이 끊기는 상황 자체를 없애지 못한다.`
    }
  ],
  refs: [
    {
      title: `MDN: Using the Fetch API`,
      url: `https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch`,
      kind: `doc`,
      why: `fetch가 HTTP 오류 상태에서 reject되지 않는다는 점, response.ok 검사, 본문을 별도 단계로 한 번만 읽는 방식, AbortController 연동의 원문 설명이다.`
    },
    {
      title: `MDN: Promise`,
      url: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise`,
      kind: `doc`,
      why: `세 가지 상태와 settled의 뜻, then 콜백이 현재 코드가 끝난 뒤 비동기로 실행된다는 보장, Promise.all과 allSettled의 이행·거부 조건 차이를 정리한 기준 문서다.`
    },
    {
      title: `MDN: JavaScript execution model`,
      url: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model`,
      kind: `doc`,
      why: `작업 큐(이벤트 루프), run-to-completion, 마이크로태스크 우선순위를 설명해 await가 왜 브라우저를 멈추지 않는지 이해하는 바탕이 된다.`
    },
    {
      title: `MDN: Working with JSON`,
      url: `https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/JSON`,
      kind: `doc`,
      why: `JSON과 자바스크립트 객체 리터럴의 문법 차이(큰따옴표, 후행 쉼표 금지, 함수·Date·정의되지 않은 값 불가)와 parse·stringify의 쓰임을 다룬다.`
    },
    {
      title: `MDN: AbortController`,
      url: `https://developer.mozilla.org/en-US/docs/Web/API/AbortController`,
      kind: `doc`,
      why: `signal과 abort()로 진행 중인 비동기 작업을 취소하는 인터페이스의 기본 설명이다. 4강의 취소 패턴의 근거다.`
    },
    {
      title: `MDN: AbortSignal`,
      url: `https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal`,
      kind: `doc`,
      why: `abort(), any(), timeout() 정적 메서드, 시간 초과가 TimeoutError로 수동 취소의 AbortError와 구분된다는 점, aborted·reason 속성과 abort 이벤트를 설명한다.`
    },
    {
      title: `MDN: Cross-Origin Resource Sharing (CORS)`,
      url: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS`,
      kind: `doc`,
      why: `동일 출처 정책, 단순 요청과 프리플라이트, Access-Control-* 헤더, 프리플라이트 캐시 기본값, 자격 증명과 와일드카드 규칙, 실패 이유가 JS에 노출되지 않는다는 점을 정리한 7강의 핵심 문서다.`
    },
    {
      title: `MDN: HTTP caching`,
      url: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching`,
      kind: `doc`,
      why: `Cache-Control의 max-age·no-cache·no-store, ETag와 304 재검증, 개인 캐시와 공유 캐시의 차이로 앱 캐시와 HTTP 캐시의 층을 구분하게 해 준다.`
    },
    {
      title: `MDN: Retry-After`,
      url: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After`,
      kind: `doc`,
      why: `503, 429, 3xx 응답에서 얼마나 기다렸다 다시 요청할지 알리는 헤더의 두 가지 값 형식(초, 날짜)을 확인할 수 있다.`
    },
    {
      title: `RFC 6585: Additional HTTP Status Codes (2012-04)`,
      url: `https://www.rfc-editor.org/rfc/rfc6585`,
      kind: `rfc`,
      why: `4절에서 429 Too Many Requests를 정의하고 응답에 Retry-After를 실을 수 있다고 규정한 원문이라 호출 한도 응답을 다루는 근거가 된다.`
    },
    {
      title: `RFC 9110: HTTP Semantics (2022-06)`,
      url: `https://www.rfc-editor.org/rfc/rfc9110.html`,
      kind: `rfc`,
      why: `9.2.2절이 멱등 메서드(GET, PUT, DELETE 등)를 정의하고 POST는 포함하지 않으며, 비멱등 요청을 자동으로 재시도하지 말라고 권고한다. 6강 재시도 규칙과 퀴즈 12번의 근거다.`
    },
    {
      title: `AWS Architecture Blog: Exponential Backoff And Jitter`,
      url: `https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/`,
      kind: `article`,
      why: `지터 없는 백오프가 호출 수와 완료 시간 모두 가장 나쁘고, 지터를 넣은 방식 중 full jitter가 총 호출 수가 가장 적다는 시뮬레이션 비교로 6강의 재시도 간격 설계를 뒷받침한다.`
    },
    {
      title: `OWASP REST Security Cheat Sheet`,
      url: `https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html`,
      kind: `article`,
      why: `API 키 같은 민감 값을 주소가 아닌 헤더나 본문으로 보내고, 입력을 검증하며, 너무 빠른 요청에는 429로 응답하고, CORS 출처를 필요한 만큼만 구체적으로 열라는 실무 지침이다.`
    },
    {
      title: `Nielsen Norman Group: Response Times: The 3 Important Limits`,
      url: `https://www.nngroup.com/articles/response-times-3-important-limits/`,
      kind: `article`,
      why: `Jakob Nielsen이 정리한 0.1초, 1초, 10초 기준과 지연 길이에 따른 피드백 원칙으로, 로딩 표시를 언제 띄울지 정하는 3강과 랩 2의 근거다.`
    }
  ],
  gigs: [
    `이 프로젝트는 외주에서 목록과 차트 화면을 API에 붙여 주세요 형태로 가장 자주 들어옵니다. 견적 전에 꼭 확인할 것: API 문서와 실제 샘플 응답이 있는지, 인증 방식과 키를 누가 관리하는지, 호출 한도와 유료 과금 여부(발급처 정책은 바뀌므로 견적 시점에 직접 확인, 2026-11 기준), 브라우저에서 직접 호출이 허용되는지(CORS), 데이터 건수와 갱신 주기, 지원할 브라우저와 기기. 응답 샘플 없이 시작하면 화면 전체를 한 번 더 만들게 되는 일이 흔합니다.`,
    `고객은 서버 없이 화면만이라고 기대하지만 비밀 키가 있으면 프록시(서버리스 함수 포함)가 필요해져 범위와 운영 비용이 늘어납니다. 이 사실을 견적 단계에서 설명하고 서버 항목을 별도 줄로 분리하세요. 고객이 끝내 키를 화면에 넣어 달라고 하면 노출 위험과 도메인 제한이 걸린 공개용 키가 맞는지 확인한 내용을 메일로 남기고 동의를 받아 두는 편이 분쟁을 막습니다.`,
    `납품물은 코드만이 아닙니다. 동작하는 화면, 네 가지 상태 화면 스크린샷, 서버 상태를 바꿔 실패 화면을 시연하는 가짜 서버, 실제 API 교체 절차 체크리스트(CONFIG와 어댑터 위치), 키 관리 안내, 20줄 이내 인수 점검표를 함께 넘기세요. 점검표는 이렇게 하면 이것이 보여야 합니다 형식이어야 고객이 직접 확인하고 검수할 수 있습니다.`,
    `견적 구조 예: 화면 수, 호출할 API 수, 상태 처리(로딩·오류·빈 상태·재시도)를 기본 품질로 포함하되 항목으로 명시, 실제 API 연결과 프록시는 별도, 시험과 문서, 수정 횟수 제한. API 주소가 아직 미정이면 가짜 서버로 1차 납품하고 실제 연결을 별도 견적으로 나누는 방식이 일정 위험을 줄입니다. 주문·결제 같은 쓰기 요청이 끼어 있으면 중복 처리를 막는 재시도·멱등 키 합의를 읽기 요청과 별도 항목으로 견적하세요. 금액은 시간 곱하기 단가로 환산하되 시장과 경력에 따라 크게 달라 이 모듈은 절대 금액을 제시하지 않습니다.`,
    `자주 걸리는 함정: 데이터 규모를 잘못 가정(120건인 줄 알았는데 12만 건)해서 서버 페이지네이션이 필요해지는 것, 외부 API의 필드 이름 변경이나 장애와 폐지로 화면이 깨지는 것(어댑터와 실패 화면으로 대비), 유료 API의 호출량 과금(디바운스·취소·캐시가 비용 절감 기능이라고 고객에게 설명), 시간대와 문자 인코딩 차이. 마지막 항목은 날짜와 한글을 다루는 화면에서 의외로 자주 나옵니다.`,
    `납품 뒤 운영 범위를 정해 두세요. 외부 API 장애는 내 책임이 아니라는 경계, 실패 로그와 알림을 남길지, 월 정액 유지보수에 무엇이 들어가는지(API 변경 대응, 키 교체 지원)를 계약서에 적습니다. 장애 시 고객이 먼저 아는 상황을 피하려면 오류 화면에 사람이 읽을 이유와 다시 시도 버튼, 그리고 내부용 요청 로그를 남기는 것이 최소선입니다.`,
    `확장 제안은 자연스러운 후속 매출입니다. 서버 프록시와 캐시 계층, CSV 내보내기, 즐겨찾기의 서버 동기화, 관리자 화면, 접근성(키보드 조작, 색에 의존하지 않는 차트), 다국어. 포트폴리오에는 서버 상태 토글이 있는 데모를 올리면 실패까지 설계했다는 점이 한눈에 보여 신뢰를 줍니다.`
  ]
};
