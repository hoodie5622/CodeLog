(window.PRO_MODULES = window.PRO_MODULES || {})["pj-todo"] = {
  id: "pj-todo",
  summary: `상태와 화면을 분리하는 설계로 할 일 앱을 단계별로 직접 만들고, 저장·필터·접근성·테스트·마감일·내보내기까지 붙여 비슷한 화면 앱을 혼자 만들고 납품할 수 있다.`,
  hours: 30,
  goals: [
    `화면에 필요한 모든 정보를 state 객체 하나로 표현하고, state만 읽어 목록을 통째로 다시 그리는 render 함수(몇 번 불러도 같은 결과)를 설계할 수 있다.`,
    `createElement와 textContent로 DOM을 만들고, ul 하나에 위임한 클릭 리스너에서 closest와 data-* 속성으로 어느 항목의 어떤 버튼인지 찾아 처리할 수 있다.`,
    `추가·완료·삭제를 id 기준으로 구현하고, 모든 상태 변경이 commit이라는 단일 출입구를 지나게 만들어 저장·렌더 누락을 막을 수 있다.`,
    `localStorage 저장·복원을 접근 차단·용량 초과·첫 실행·손상 데이터 네 가지 실패까지 처리해 구현하고, 막힌 환경에서도 앱이 죽지 않음을 직접 확인할 수 있다.`,
    `필터·남은 개수·빈 상태를 state에서 계산해 그리고, 화면 순번이 아니라 id로 대상을 찾아 필터 중 삭제·토글 버그를 막을 수 있다.`,
    `label·aria-label·role=status·focus-visible과 포커스 복원을 적용해 마우스 없이 모든 기능을 쓸 수 있게 하고 키보드만으로 점검할 수 있다.`,
    `로직을 순수 함수로 분리하고 console.assert 기반 check로 경계 사례(공백 입력, 깨진 JSON, 원본 불변)를 테스트로 고정하며, 테스트가 실패하는지 일부러 확인할 수 있다.`,
    `마감일·정렬·CSV 내보내기를 기존 저장 데이터를 깨지 않고 추가하고(데이터 이주, 현지 날짜, BOM·따옴표·수식 방어), 고객 요구를 질문·범위·견적·인수인계 문서로 바꿔 설명할 수 있다.`
  ],
  lessons: [
    {
      title: `상태와 화면을 나누는 설계: state → render`,
      body: `**먼저 이 모듈이 다루는 것.** 할 일 앱 하나를 8단계로 쌓아 올립니다. 단계마다 코드는 처음부터 끝까지 그대로 실행되는 완성본이고, 앞 단계 위에 새 블록이 더해집니다. 앞 모듈(포트폴리오)에서 HTML·CSS를 다뤘으니 여기서는 JavaScript가 화면을 바꾸는 방식에 집중합니다. 학습 시간은 레슨 8개와 실습 3개, 공식 문서 읽기를 합쳐 30시간 안팎(추정)입니다.

### 초보 코드가 꼬이는 이유
처음 만든 앱은 보통 버튼을 누르면 그 자리의 DOM을 직접 고치는 식으로 짜입니다. 완료 처리 하나에 (1) 취소선 클래스 (2) 남은 개수 글자 (3) 빈 목록 안내 (4) 저장된 사본, 네 곳을 손으로 맞춰야 합니다. 기능이 5개면 고칠 곳이 20곳이고 한 곳만 빠뜨려도 목록에는 3개인데 숫자는 4개라는 불일치가 생깁니다. 이런 버그는 재현이 어렵고 고객이 가장 먼저 발견합니다. 원인은 진실이 DOM 여기저기에 흩어져 있다는 것입니다.

### 해법: 화면은 상태의 함수다
- **state**: 앱이 아는 모든 것을 담은 평범한 객체. 여기서는 ‹{ todos: [{ id, text, done }] }›입니다. DOM 노드나 함수는 넣지 않습니다. JSON으로 바꿀 수 있어야 4단계에서 저장할 수 있기 때문입니다.
- **render()**: state를 읽어 화면을 만드는 함수. 읽기만 하고 state를 바꾸지 않으며, 같은 state면 늘 같은 화면을 냅니다.
- **변경 규칙**: 화면을 바꾸고 싶으면 DOM이 아니라 state를 바꾸고 render를 부릅니다.

이러면 진실은 state 한 곳이고 남은 개수·빈 안내·필터는 전부 render 안에서 계산됩니다. 불일치가 구조적으로 생기지 않습니다. React나 Vue 같은 프레임워크가 해 주는 일의 핵심도 같습니다. 다만 프레임워크는 바뀐 부분만 골라 갱신하고, 여기서는 ‹replaceChildren›으로 목록을 통째로 갈아 끼웁니다. 항목이 수백 개 안쪽이면 이 단순함이 버그를 없애 주는 이득이 훨씬 큽니다. 큰 목록에서는 달라질 수 있으니 ‹console.time›으로 직접 재 보세요.

### 설계 결정 세 가지
1. **id를 둡니다.** 순번은 삭제·필터·정렬 때마다 바뀌므로 안 바뀌는 이름표 ‹id›로 항목을 가리킵니다. 값은 문자열로 정했고 이유는 2단계에서 나옵니다.
2. **글자는 textContent로.** ‹innerHTML›에 사용자 입력을 넣으면 입력한 ‹<b>›가 태그로 해석되고, 악의적인 입력이면 스크립트가 실행되는 XSS 통로가 됩니다. MDN도 텍스트에는 ‹textContent›를 권합니다. 세 번째 항목의 ‹<b>태그</b>›가 글자 그대로 보이는지가 확인 포인트입니다.
3. **render는 멱등이어야 합니다.** 몇 번 불러도 결과가 같아야 하므로 ‹append›로 이어 붙이지 않고 통째로 교체합니다.

### 통째로 다시 그릴 때의 대가
목록을 갈아 끼우면 이전 노드가 사라지고 그 노드가 가진 포커스·스크롤 위치·입력 중이던 글자도 사라집니다. 6단계에서 포커스를 되돌려 주는 코드가 필요한 이유입니다. 설계의 이득과 대가를 같이 알고 쓰는 것이 실력입니다.

### 실행해서 확인할 것
- 목록에 항목 3개가 보이고 첫 항목에만 취소선이 있어야 합니다.
- 세 번째 항목에서 ‹<b>태그</b>›가 굵은 글씨가 아니라 글자 그대로 보여야 합니다.
- 아래 회색 상자에 state가 JSON으로 보여야 합니다. 코드에서 두 번째 항목의 ‹done›을 ‹true›로 고쳐 다시 실행하면 취소선이 생깁니다.
- 코드 끝에서 ‹render()›를 두 번 불렀는데도 항목은 3개여야 합니다.

### 이 뼈대를 다른 앱으로 옮기는 법
앱이 달라도 코드를 쓰기 전에 적을 것은 세 가지입니다. ① state의 모양 ② render가 계산해서 보여 줄 값 ③ 사용자가 할 수 있는 행동 목록. 이 셋이 정해지면 나머지는 2~7단계를 옮겨 적는 작업이 됩니다.
| 앱 | state에 저장 | render에서 계산 | 행동
| 가계부 | entries: id, 금액, 메모, 날짜 | 이달 합계, 날짜순 목록 | 추가·삭제
| 재고 메모 | items: id, 이름, 수량 | 부족 품목 수, 빈 안내 | 수량 증감·삭제
| 독서 기록 | books: id, 제목, 상태 | 상태별 개수 | 상태 변경·삭제

### 혼자 바꿔 보기
- 위 표에서 하나를 골라 이 코드의 state와 render만 갈아 끼우세요. 재고 메모라면 이름과 수량을 보여 주고, 총 수량은 ‹reduce›로 render 안에서 계산합니다.
- 확인: render를 연달아 5번 불러도 줄 수와 합계가 같고, 이름에 ‹<b>x</b>›를 넣어도 글자 그대로 보여야 합니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>할 일 앱 - 1단계</title>
<style>
  body { font: 16px system-ui; max-width: 420px; margin: 2rem auto; padding: 0 1rem; }
  .done { text-decoration: line-through; color: #777; }
  pre { background: #f4f4f4; padding: .5rem; white-space: pre-wrap; }
</style>
</head>
<body>
<h1>할 일</h1>
<ul id="list"></ul>
<p>state (진실의 원천)</p>
<pre id="debug"></pre>
<script>
// 1) 상태: 앱이 아는 모든 것. 화면에 보이는 것은 전부 여기서 계산한다.
const state = {
  todos: [
    { id: 'a1', text: 'HTML 복습하기', done: true },
    { id: 'a2', text: '할 일 앱 만들기', done: false },
    { id: 'a3', text: '<b>태그</b>도 글자로 보이는지 확인', done: false },
  ],
};

// 2) render: state를 읽어 화면을 통째로 다시 만든다. state는 절대 바꾸지 않는다.
function render() {
  const items = state.todos.map(todo => {
    const li = document.createElement('li');
    li.textContent = todo.text;           // 글자는 textContent로 (innerHTML은 XSS 통로)
    li.classList.toggle('done', todo.done);
    return li;
  });
  document.getElementById('list').replaceChildren(...items);
  document.getElementById('debug').textContent = JSON.stringify(state, null, 2);
}

render();
render();   // 두 번 불러도 항목이 두 배가 되지 않는다: 매번 "통째로 교체"하기 때문
</script>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `화면 = f(state): 진실은 state 한 곳, render는 읽기만 하고 같은 입력이면 같은 화면(멱등). 새 앱은 state 모양·계산값·행동 목록 셋을 먼저 적는다`,
        `state는 JSON으로 바꿀 수 있는 평범한 데이터만: DOM 노드·함수를 넣지 않는다`,
        `항목은 순번이 아니라 안 바뀌는 id로 가리킨다`,
        `사용자 글자는 textContent로, innerHTML에 넣지 않는다`,
        `통째로 다시 그리면 포커스·스크롤이 사라진다: 설계의 대가를 알고 쓴다`
      ],
      pitfalls: [
        `화면의 클래스나 글자를 읽어 로직을 판단한다(예: li.classList.contains). 진실이 DOM과 state 두 곳이 되어 곧 어긋난다.`,
        `render 안에서 append만 하고 비우지 않는다. 두 번째 호출부터 항목이 두 배가 된다.`,
        `사용자 입력을 innerHTML 문자열에 끼워 넣는다. 레이아웃이 깨지거나 스크립트 주입 통로가 된다.`,
        `state에 DOM 노드나 함수를 담는다. JSON.stringify로 저장할 수 없어 4단계에서 막힌다.`
      ]
    },
    {
      title: `DOM 요소 만들기와 이벤트 위임`,
      body: `1단계의 render는 항목마다 ‹li›를 만들었지만 아직 눌러 볼 수 없었습니다. 이번에는 항목을 눌렀을 때 어느 데이터의 항목인지 알아내는 길을 만듭니다. 핵심은 DOM 만들기와 이벤트 위임입니다.

### DOM 만들기: createElement + textContent + dataset
‹document.createElement›로 노드를 만들고, 글자는 ‹textContent›, 속성은 프로퍼티(‹box.checked›)나 ‹dataset›으로 채운 뒤 ‹append›로 조립합니다. HTML 문자열을 이어 붙이는 방식보다 줄은 늘지만 (1) 따옴표·이스케이프 실수가 없고 (2) 사용자 글자가 태그로 해석될 일이 없으며 (3) 속성 하나를 바꾸기 쉽습니다. 항목의 id는 ‹li.dataset.id›에 적어 둡니다. HTML로는 ‹data-id="a1"›이고 JS에서는 ‹dataset.id›로 읽으며, 화면에서 데이터로 돌아오는 유일한 다리입니다.

### 이벤트가 퍼지는 길
버튼을 누르면 이벤트는 눌린 요소(‹target›)에서 시작해 부모, 조부모를 거쳐 ‹document›까지 올라갑니다. 버블링입니다. MDN 설명대로 ‹event.target›은 이벤트가 시작된 요소로 끝까지 같고, ‹event.currentTarget›은 지금 리스너가 붙어 있는 요소라 올라가면서 바뀝니다. 이 성질 덕분에 항목마다 리스너를 달지 않고 ‹ul›에 하나만 달아도 됩니다. 이것이 이벤트 위임입니다.

### 왜 위임인가
- 우리 render는 매번 항목을 새로 만듭니다. 항목마다 리스너를 달면 render 때마다 n개를 새로 달고 옛 노드와 함께 버리게 됩니다. render 안에서 리스너를 달다가 같은 노드에 두 번 다는 실수도 흔합니다.
- 위임은 리스너가 ‹ul›에 한 번만 있고, 나중에 생긴 항목도 자동으로 처리됩니다. 항목이 1,000개여도 리스너는 1개입니다.
- 외주로 넘겨받는 코드에서 자주 만나는 버그가 이것입니다. 위임 리스너를 render 안에서 달면 render를 부를 때마다 리스너가 하나씩 쌓여, 한 번 눌렀는데 토글이 여러 번 일어나고 짝수 번이면 아무 변화가 없는 것처럼 보입니다. 리스너를 render 밖에서 한 번만 다는 것이 수정의 전부인 경우가 많습니다.

### closest로 어느 항목의 무슨 버튼인지 찾기
클릭된 ‹target›은 버튼 안의 글자나 아이콘 같은 자식일 수 있습니다. 그래서 ‹e.target.closest('[data-act]')›처럼 나부터 위로 올라가며 처음 맞는 요소를 찾습니다(MDN: 자기 자신도 검사하고, 못 찾으면 ‹null›). 반드시 ‹null›을 확인하고 빠져나옵니다. 그다음 ‹el.closest('li').dataset.id›로 항목 id를 얻습니다. 동작 종류는 ‹data-act="toggle"›처럼 속성에 적어 두면 분기가 읽기 쉽습니다. 체크박스는 Space 키로 눌러도 click 이벤트가 발생하므로 click 하나로 마우스와 키보드가 모두 처리됩니다.

### dataset은 문자열이다
‹dataset›의 값은 항상 문자열입니다. 항목 id가 숫자 ‹1›이면 ‹li.dataset.id›는 ‹"1"›이고 ‹t.id === "1"›은 거짓이라 어떤 항목도 못 찾습니다. 에러 없이 눌러도 반응이 없는 버그가 됩니다. 이 모듈은 처음부터 id를 문자열로 정해 이 함정을 피합니다.

### 클릭이 안 먹을 때 보는 순서
위임이 안 통하는 대표 원인은 ‹focus›·‹blur›·‹mouseenter›가 버블링하지 않는다는 것(위임하려면 ‹focusin›·‹focusout›)과, 중간 요소의 ‹stopPropagation()›입니다. 그 밖에는 연결을 한 칸씩 확인합니다. ① 리스너 첫 줄에 ‹console.log(e.target)›을 찍어 이벤트가 오는지 본다 ② ‹closest›가 ‹null›인지 본다 ③ ‹typeof id›로 문자열인지 본다 ④ ‹find›가 항목을 찾았는지 본다 ⑤ 상태를 바꾼 뒤 ‹render›가 불렸는지 본다. 어느 칸에서 끊겼는지 알면 고칠 곳도 정해집니다.

### 실행해서 확인할 것
- 체크박스를 누르면 그 항목에만 취소선이 생기고, 다시 누르면 사라져야 합니다.
- 글자를 눌러도 아직 아무 일이 없어야 합니다(6단계에서 label로 바뀝니다).
- F12 개발자 도구 Elements 탭에서 ‹li data-id="a1"› 같은 속성이 보여야 합니다. 이 id가 클릭과 state를 이어 줍니다.

### 혼자 바꿔 보기
- 항목에 ★ 버튼을 더해 보세요. 바꿀 곳은 ‹makeItem›의 버튼 한 개, 클릭 리스너의 ‹data-act="star"› 분기 한 줄, ‹star(id)› 함수 한 개, 항목의 ‹starred› 필드 하나뿐이어야 합니다.
- 확인: ‹addEventListener›는 여전히 ul에 1개이고, ★을 누른 항목만 굵게 보이며, ‹render()›를 한 번 더 불러도 유지됩니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>할 일 앱 - 2단계</title>
<style>
  body { font: 16px system-ui; max-width: 420px; margin: 2rem auto; padding: 0 1rem; }
  ul { padding: 0; list-style: none; }
  li { padding: .25rem 0; }
  .done span { text-decoration: line-through; color: #777; }
</style>
</head>
<body>
<h1>할 일</h1>
<ul id="list"></ul>
<script>
const $ = id => document.getElementById(id);
const state = {
  todos: [
    { id: 'a1', text: 'HTML 복습하기', done: true },
    { id: 'a2', text: '할 일 앱 만들기', done: false },
    { id: 'a3', text: '<b>태그</b>도 글자로 보이는지 확인', done: false },
  ],
};

// 항목 하나의 DOM을 만든다. 어느 데이터의 항목인지는 data-id에 적어 둔다.
function makeItem(todo) {
  const li = document.createElement('li');
  li.dataset.id = todo.id;
  li.className = todo.done ? 'done' : '';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = todo.done;
  box.dataset.act = 'toggle';
  const text = document.createElement('span');
  text.textContent = todo.text;
  li.append(box, text);
  return li;
}

function render() {
  $('list').replaceChildren(...state.todos.map(makeItem));
}

function toggle(id) {
  const todo = state.todos.find(t => t.id === id);
  if (todo) todo.done = !todo.done;
  render();
}

// 이벤트 위임: 리스너는 <ul> 하나에만 단다. 항목은 render마다 새로 만들어지기 때문이다.
$('list').addEventListener('click', e => {
  const el = e.target.closest('[data-act]');   // 클릭된 곳에서 위로 올라가며 찾는다
  if (!el) return;                             // 항목 밖(빈 곳, 글자)을 누른 경우
  const id = el.closest('li').dataset.id;      // dataset 값은 항상 문자열
  if (el.dataset.act === 'toggle') toggle(id);
});

render();
</script>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `노드는 createElement + textContent + dataset으로 조립한다 (문자열 HTML 금지)`,
        `data-id는 화면에서 데이터로 돌아오는 다리, dataset 값은 항상 문자열이다`,
        `이벤트는 target에서 위로 퍼진다(버블링): 부모 ul 하나에 리스너를 달면 모든 항목을 처리한다`,
        `e.target.closest('[data-act]')로 찾고, 못 찾으면(null) 즉시 빠져나온다`
      ],
      pitfalls: [
        `render나 makeItem 안에서 addEventListener를 부른다. 항목에 달면 매번 새로 달고 버려지고, ul에 달면 render마다 리스너가 쌓여 한 번 눌렀는데 토글이 짝수 번 일어나 아무 변화가 없어 보인다.`,
        `e.target.dataset.id로 바로 읽는다. 클릭이 자식 요소(글자, 아이콘)에 떨어지면 값이 비어 엉뚱하게 동작한다.`,
        `숫자 id와 dataset 문자열을 ===로 비교한다. 오류 없이 아무 항목도 못 찾는다.`,
        `중간 요소에서 stopPropagation을 습관처럼 부른다. 위임 리스너에 이벤트가 닿지 않는다.`
      ]
    },
    {
      title: `추가·완료·삭제 기능`,
      body: `이제 앱이 앱답게 움직이도록 추가·완료·삭제를 붙입니다. 세 기능은 모양이 같습니다. state를 바꾸고 commit()을 부릅니다. 이 규칙이 이번 단계의 설계입니다.

### commit이라는 단일 출입구
commit()은 지금은 render()만 부릅니다. 굳이 감싼 이유는 4단계에서 저장을 이 함수 안에 한 줄로 넣기 위해서입니다. 상태를 바꾸는 곳이 열 군데인데 저장 호출을 열 번 적으면 하나는 반드시 빠집니다. 상태 변경은 전부 commit을 지난다는 규칙 하나면 저장·로그·통계를 한 곳에 붙일 수 있습니다. 실제 프로젝트에서 이런 단일 출입구는 가장 싼 버그 예방책입니다.

### 추가: submit 이벤트와 입력 다듬기
입력창과 버튼을 ‹form›으로 묶고, 버튼 클릭이 아니라 ‹submit› 이벤트를 듣습니다. 그러면 Enter 키가 공짜로 동작하고 폰 키보드의 이동 버튼도 됩니다. 핸들러의 첫 줄은 ‹e.preventDefault()›입니다. 막지 않으면 브라우저가 폼을 전송하면서 페이지를 다시 불러와 방금 상태가 사라집니다. 고객 시연 중에 Enter를 쳤는데 화면이 새로고침되며 입력이 사라지면 그 한 번으로 앱 전체의 신뢰를 잃습니다. 이어서 ‹trim()›으로 앞뒤 공백을 지우고 비었으면 무시합니다. 공백뿐인 항목이 쌓이면 화면에서는 빈 줄로 보여 버그처럼 보입니다. ‹maxlength›로 길이도 제한합니다(여기서는 100자).

### id는 어디서 오는가
새 항목의 id는 ‹Date.now().toString(36)›에 랜덤 4글자를 붙여 만듭니다. 흔한 대안과 비교하면 이렇습니다.
- ‹todos.length + 1›: 3개 중 2번을 지운 뒤 추가하면 이미 있는 id와 겹치고, find가 엉뚱한 항목을 돌려줍니다. 위험합니다.
- ‹crypto.randomUUID()›: 좋은 선택이지만 MDN 기준 보안 컨텍스트(HTTPS 등)에서만 쓸 수 있어 환경에 따라 없을 수 있습니다(2026-11 기준). 쓰려면 대체 경로가 필요합니다.
- 서버가 생기면(풀스택 모듈) id는 DB가 줍니다.
같은 밀리초에 두 번 추가해도 랜덤 꼬리 덕분에 구별됩니다. 충돌 가능성이 0은 아니라는 점을 알고 쓰되, 이 규모에서는 충분합니다.

### 완료와 삭제
toggle은 ‹find›로 항목을 찾아 ‹done›을 뒤집고, remove는 ‹filter›로 해당 id만 뺀 새 배열을 ‹state.todos›에 다시 담습니다. 배열을 도는 중에 ‹splice›로 지우는 코드는 인덱스가 밀려 항목을 건너뛰는 고전 버그를 부르지만 ‹filter›는 그럴 일이 없습니다. 삭제 확인에 ‹confirm()›을 쓰고 싶겠지만 ‹sandbox› iframe에 ‹allow-modals›가 없으면 alert·confirm·prompt가 막힙니다(MDN). 이 실행창 같은 곳에서는 ‹confirm()›이 항상 ‹false›를 돌려줘 삭제가 안 되는 버그가 됩니다(‹allow-scripts›만 준 sandbox iframe에서 Edge로 직접 확인, 2026-11 기준). 확인이 필요하면 직접 만드는 실행 취소 방식이 낫고, 실습의 확장 과제로 남겨 둡니다.

### 이번 단계의 한계
state를 직접 고칩니다(push, done 뒤집기). 단순하지만 어느 함수가 state를 언제 바꿨는지 추적하기 어려워지는 출발점입니다. 7단계에서 새 배열을 돌려주는 순수 함수로 정리합니다.

### 실행해서 확인할 것
- 입력하고 Enter를 치면 항목이 추가되고, 입력창이 비면서 커서가 입력창에 남아야 합니다.
- 공백만 넣고 추가하면 아무 일도 없어야 합니다.
- 삭제를 누르면 그 항목만 사라져야 합니다. 같은 글자의 항목이 둘이어도 누른 쪽만 사라집니다.
- 추가하거나 삭제해도 화면이 처음 상태로 되돌아가지 않아야 합니다. preventDefault가 일하고 있다는 증거입니다.

### 혼자 바꿔 보기
- ‹완료한 항목 모두 지우기› 버튼을 만드세요. ‹clearDone()›은 ‹state.todos.filter(t => !t.done)›를 대입하고 commit을 한 번만 부릅니다. 확인창은 쓰지 않습니다.
- 확인: 완료 항목이 0개일 때 눌러도 오류가 없고, 3개 중 2개가 완료면 1개만 남으며, 남은 항목의 id는 그대로입니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>할 일 앱 - 3단계</title>
<style>
  body { font: 16px system-ui; max-width: 420px; margin: 2rem auto; padding: 0 1rem; }
  ul { padding: 0; list-style: none; }
  li { display: flex; gap: .5rem; padding: .25rem 0; }
  li span { flex: 1; }
  .done span { text-decoration: line-through; color: #777; }
</style>
</head>
<body>
<h1>할 일</h1>
<form id="form">
  <input id="text" maxlength="100" placeholder="할 일을 입력" autocomplete="off">
  <button>추가</button>
</form>
<ul id="list"></ul>
<script>
const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const state = {
  todos: [
    { id: 'a1', text: 'HTML 복습하기', done: true },
    { id: 'a2', text: '할 일 앱 만들기', done: false },
  ],
};

function makeItem(todo) {
  const li = document.createElement('li');
  li.dataset.id = todo.id;
  li.className = todo.done ? 'done' : '';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = todo.done;
  box.dataset.act = 'toggle';
  const text = document.createElement('span');
  text.textContent = todo.text;
  const del = document.createElement('button');
  del.textContent = '삭제';
  del.dataset.act = 'del';
  li.append(box, text, del);
  return li;
}
function render() { $('list').replaceChildren(...state.todos.map(makeItem)); }
function commit() { render(); }   // 상태를 바꾼 뒤에는 반드시 이 문을 지난다 (4단계에서 저장이 여기 들어간다)

// 상태를 바꾸는 함수들: 데이터만 고치고 commit으로 끝낸다
function add(text) { state.todos.push({ id: uid(), text, done: false }); commit(); }
function toggle(id) {
  const todo = state.todos.find(t => t.id === id);
  if (todo) todo.done = !todo.done;
  commit();
}
function remove(id) { state.todos = state.todos.filter(t => t.id !== id); commit(); }

$('list').addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const id = el.closest('li').dataset.id;
  if (el.dataset.act === 'toggle') toggle(id);
  if (el.dataset.act === 'del') remove(id);
});
$('form').addEventListener('submit', e => {
  e.preventDefault();                  // 기본 동작(페이지 새로 불러오기)을 막는다
  const text = $('text').value.trim();
  if (text) add(text);                 // 공백뿐인 입력은 무시
  $('text').value = '';
  $('text').focus();
});
render();
</script>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `상태를 바꾸는 모든 함수는 commit() 하나로 끝낸다: 저장·렌더를 한 곳에 붙일 수 있다`,
        `폼은 click이 아니라 submit을 듣고 첫 줄에서 preventDefault, 입력은 trim으로 다듬고 빈 값은 거른다`,
        `id는 순번(length+1)이 아니라 겹치지 않게 만든다: 삭제 뒤 추가해도 유일해야 한다`,
        `삭제는 filter로 새 배열을 만든다(순회 중 splice 금지), confirm은 샌드박스에서 막힌다`
      ],
      pitfalls: [
        `submit에서 preventDefault를 빼먹는다. 페이지가 다시 불러와지며 방금 한 일이 사라진다.`,
        `id를 todos.length + 1로 만든다. 삭제 후 추가하면 중복 id가 생겨 한 항목을 누르면 다른 항목이 바뀐다.`,
        `state만 바꾸고 commit(render)을 빼먹는다. 데이터는 바뀌었는데 화면이 그대로라 눌렀다가 새로고침해야 보인다.`,
        `삭제 확인을 confirm()으로 만든다. 샌드박스·임베드 환경에서 항상 거짓이라 삭제가 영영 안 된다.`
      ]
    },
    {
      title: `localStorage 저장과 복원 (손상·실패 처리 포함)`,
      body: `지금까지는 새로고침하면 모든 항목이 사라졌습니다. 이번에는 ‹localStorage›에 저장하고 복원합니다. 쉬운 부분은 ‹setItem›·‹getItem› 두 줄이고, 이 단계의 실력은 나머지 90%, 즉 저장이 안 되거나 저장된 값이 이상할 때 앱이 죽지 않게 하는 데 있습니다.

### localStorage가 하는 일
출처(프로토콜+도메인+포트)별로 문자열 키와 값을 브라우저에 보관합니다. 창을 닫아도 남고 동기 API이며, 값은 문자열뿐이라 객체는 ‹JSON.stringify›로 바꿔 넣고 ‹JSON.parse›로 꺼냅니다(MDN). 용량은 출처당 약 5MiB입니다(MDN 저장소 쿼터 문서, 2026-11 기준). 텍스트 할 일 수천 개는 들어가지만 사진 같은 것은 안 됩니다.

### 실패하는 네 가지 길
| 실패 | 언제 생기나 | 안 막으면
| 접근 차단 | sandbox iframe(allow-same-origin 없음), 쿠키·사이트 데이터 차단, 브라우저에 따라 file: 주소 | localStorage를 읽는 순간 SecurityError
| 쓰기 실패 | 용량 초과(QuotaExceededError) 등 | setItem에서 예외, 뒤 코드 중단
| 데이터 없음 | 첫 실행, 사용자가 지움, 브라우저 정리 | null 처리 누락
| 데이터 손상 | 직접 편집, 다른 버전 앱, 같은 키를 쓰는 다른 앱 | JSON.parse 예외로 앱 시작 불가

마지막이 가장 무섭습니다. 손상된 값을 읽다 예외가 나 앱이 시작을 못 하면, 값은 그대로 저장돼 있으니 새로고침해도 영원히 같은 흰 화면입니다. 고객이 껐다 켜도 안 된다고 연락하는 바로 그 장애입니다.

### 코드가 하는 일
- **probe**: ‹window.localStorage›에 접근하고 시험 키를 쓰고 지워 봅니다. 하나라도 예외면 ‹store = null›로 두고 앱은 메모리만으로 동작합니다. 이 실행창이 바로 그런 환경입니다. 퀴즈에서 실제 오류 메시지를 봅니다.
- **put**: 저장소가 없거나 ‹setItem›이 예외를 던지면 ‹false›를 돌려주고, 호출한 쪽이 화면에 안내를 띄웁니다. 저장 실패를 숨기지 않는 것이 원칙입니다. 조용히 실패하면 고객은 데이터가 없어진 뒤에야 압니다.
- **load**: 값이 없는 첫 실행(null)과 빈 목록을 저장한 상태를 구분합니다. 전자는 예시 항목, 후자는 빈 목록입니다. 값이 있으면 ‹JSON.parse›를 ‹try›로 감싸고, ‹todos›가 배열인지 모양을 검사하고, 항목마다 ‹id›·‹text›·‹done›의 타입을 확인해 이상한 항목만 거릅니다. 저장소의 값은 사용자가 개발자 도구로도 고칠 수 있는 외부 입력이므로 서버 응답처럼 검증합니다.
- **백업**: 파싱이 실패하면 원본 문자열을 ‹todo-app:v1:broken›에 복사해 두고 새로 시작합니다. 덮어쓰면 원인 분석도 복구도 불가능해집니다.

### 저장 형식과 키 이름
‹{ v: 1, todos: [...] }›처럼 배열을 객체로 한 번 감쌉니다. 나중에 필드를 더하거나(8단계의 마감일) 버전별 이주 코드를 짤 때 필요합니다. 키에는 ‹todo-app:v1›처럼 앱 이름을 붙입니다. 같은 주소(예: localhost:5500)에서 작은 앱 여러 개를 열면 ‹todos›라는 키를 서로 덮어씁니다.

### 알아 둘 한계
- 다른 탭이 바꾼 내용은 ‹storage› 이벤트로 알 수 있지만(MDN: 바꾼 탭 자신에게는 발생하지 않음) 이 앱은 듣지 않아, 두 탭을 동시에 쓰면 나중에 저장한 쪽이 이깁니다.
- 저장 내용은 평문이고 같은 출처의 모든 스크립트가 읽습니다. 비밀번호·개인정보는 넣지 않습니다. 공용 PC에서 쓰는 앱이면 고객에게 알립니다.
- 브라우저는 공간이 부족하면 오래 안 쓴 출처의 데이터를 지울 수 있습니다(MDN: 기본은 best-effort). 중요한 데이터라면 8단계의 내보내기 같은 백업 경로가 필요합니다.

### 실행해서 확인할 것
- 이 실행창: ‹이 실행창은 저장이 막혀 있어요. 새로고침하면 사라집니다.›라는 붉은 안내가 보이고, 앱은 정상 동작하며, 다시 실행하면 처음 항목으로 돌아가야 합니다.
- 진짜 저장: 코드를 내 PC에 todo.html로 저장해 크롬이나 엣지로 열고 항목을 추가한 뒤 F5를 눌러 남는지 보세요. file: 주소에서의 저장은 표준이 보장하지 않아 브라우저에 따라 다를 수 있습니다. F12 → Application → Local Storage에 ‹todo-app:v1›의 JSON이 보여야 합니다.
- 손상 실험: 그 값을 ‹{oops›로 고치고 새로고침하면 앱이 죽지 않고 붉은 안내가 뜨며 ‹todo-app:v1:broken›에 원본이 남아야 합니다.

### 혼자 바꿔 보기
- 저장 값을 글자 그대로 ‹null›, ‹5›, ‹{"todos":5}›, ‹[]› 네 가지로 차례로 바꿔 넣고 새로고침해 화면과 백업 키를 표로 적어 보세요.
- 확인: 네 가지 모두 앱이 죽지 않고, 원문이 ‹todo-app:v1:broken›에 남으며, 붉은 안내가 보여야 합니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>할 일 앱 - 4단계</title>
<style>
  body { font: 16px system-ui; max-width: 420px; margin: 2rem auto; padding: 0 1rem; }
  ul { padding: 0; list-style: none; }
  li { display: flex; gap: .5rem; padding: .25rem 0; }
  li span { flex: 1; }
  .done span { text-decoration: line-through; color: #777; }
  #notice { color: #b00020; }
</style>
</head>
<body>
<h1>할 일</h1>
<form id="form">
  <input id="text" maxlength="100" placeholder="할 일을 입력" autocomplete="off">
  <button>추가</button>
</form>
<p id="notice"></p>
<ul id="list"></ul>
<script>
const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const KEY = 'todo-app:v1';
const seed = () => [
  { id: 'a1', text: 'HTML 복습하기', done: true },
  { id: 'a2', text: '할 일 앱 만들기', done: false },
];

// ── 4단계: 저장소 (막히거나 깨져도 앱은 살아야 한다) ──
let store = null;
try { store = window.localStorage; store.setItem('__probe', '1'); store.removeItem('__probe'); }
catch (e) { store = null; }     // 접근 자체가 막힌 환경: sandbox 실행창, 쿠키 차단, 일부 사생활 모드
function put(key, value) {
  if (!store) return false;
  try { store.setItem(key, value); return true; } catch (e) { return false; }   // 용량 초과 등
}
const isTodo = t => t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.done === 'boolean';
function load() {
  if (!store) return { todos: seed(), msg: '이 실행창은 저장이 막혀 있어요. 새로고침하면 사라집니다.' };
  const raw = store.getItem(KEY);
  if (raw === null) return { todos: seed(), msg: '' };    // 처음 실행. "저장 안 함"과 "빈 목록 저장"은 다르다
  try {
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.todos)) throw new Error('형식이 다릅니다');
    return { todos: data.todos.filter(isTodo), msg: '' };
  } catch (e) {
    put(KEY + ':broken', raw);                            // 원본은 지우지 말고 백업
    return { todos: [], msg: '저장된 데이터를 읽지 못해 새로 시작합니다. 원본은 ' + KEY + ':broken 에 백업했어요.' };
  }
}
const loaded = load();
const state = { todos: loaded.todos };
$('notice').textContent = loaded.msg;

function makeItem(todo) {
  const li = document.createElement('li');
  li.dataset.id = todo.id;
  li.className = todo.done ? 'done' : '';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = todo.done;
  box.dataset.act = 'toggle';
  const text = document.createElement('span');
  text.textContent = todo.text;
  const del = document.createElement('button');
  del.textContent = '삭제';
  del.dataset.act = 'del';
  li.append(box, text, del);
  return li;
}
function render() { $('list').replaceChildren(...state.todos.map(makeItem)); }
function commit() {                  // 상태를 바꾼 뒤 지나는 문: 이제 저장도 여기서 한다
  const ok = put(KEY, JSON.stringify({ v: 1, todos: state.todos }));
  $('notice').textContent = ok ? '' : '저장하지 못했어요. 새로고침하면 사라질 수 있습니다.';
  render();
}

function add(text) { state.todos.push({ id: uid(), text, done: false }); commit(); }
function toggle(id) {
  const todo = state.todos.find(t => t.id === id);
  if (todo) todo.done = !todo.done;
  commit();
}
function remove(id) { state.todos = state.todos.filter(t => t.id !== id); commit(); }

$('list').addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const id = el.closest('li').dataset.id;
  if (el.dataset.act === 'toggle') toggle(id);
  if (el.dataset.act === 'del') remove(id);
});
$('form').addEventListener('submit', e => {
  e.preventDefault();
  const text = $('text').value.trim();
  if (text) add(text);
  $('text').value = '';
  $('text').focus();
});
render();
</script>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `localStorage는 출처별 문자열 저장소: 객체는 JSON.stringify/parse, 용량은 약 5MiB(MDN, 2026-11 기준)`,
        `실패 네 가지(접근 차단·쓰기 실패·데이터 없음·손상)를 모두 코드로 처리한다`,
        `저장 값은 외부 입력이다: JSON.parse를 try로 감싸고 모양과 항목 타입을 검증한다`,
        `손상 데이터는 덮어쓰기 전에 백업 키에 복사하고, 저장 실패는 화면에 알린다`,
        `키에는 앱 이름과 버전, 값은 객체로 감싸 { v, todos }: 나중의 변경을 대비한다`
      ],
      pitfalls: [
        `localStorage가 항상 있다고 가정하고 첫 줄에서 읽는다. sandbox·쿠키 차단 환경에서는 SecurityError로 앱이 시작조차 못 한다.`,
        `JSON.parse를 보호 없이 호출한다. 손상된 값이 남아 있으면 새로고침해도 영원히 같은 흰 화면이 된다.`,
        `파싱 실패 직후 빈 목록을 바로 저장한다. 고객 데이터를 덮어써 복구와 원인 분석이 모두 불가능해진다.`,
        `객체를 stringify 없이 setItem한다. 글자 그대로 object라고 적힌 문자열이 저장되어 다음 로드에서 파싱 오류가 난다.`
      ]
    },
    {
      title: `필터·남은 개수·빈 상태 화면`,
      body: `목록·개수·빈 화면이 모두 state에서 계산되는 단계입니다. 새 기능은 필터(전체·진행 중·완료), 남은 개수, 빈 상태 안내 세 가지인데, 진짜 주제는 저장할 데이터와 계산하면 나오는 데이터를 구분하는 것입니다.

### 파생 데이터는 저장하지 않는다
남은 개수를 ‹remaining› 변수에 담아 두고 토글할 때마다 1씩 더하고 빼면 언젠가 어긋납니다(삭제할 때 빼먹는다든지). 개수는 ‹state.todos›에서 언제든 계산할 수 있으니 render 안에서 매번 세면 어긋날 방법이 없습니다. 보이는 목록도 같습니다.
| 종류 | 예 | 두는 곳
| 원본 데이터 | todos | state, 저장함
| 화면 설정 | filter | state, 저장 안 함(결정 사항)
| 파생 데이터 | 보이는 목록, 남은 개수 | 저장 안 함, render에서 계산

filter를 저장할지는 정답이 없는 고객 경험의 결정입니다. 매번 전체에서 시작하길 바라는 앱이 많아 저장하지 않았습니다.

### 필터는 조건 함수의 표로
‹FILTERS = { all, active, done }›처럼 이름에 조건 함수를 매단 표를 만들고 ‹state.todos.filter(FILTERS[state.filter])›로 씁니다. if/else 사슬과 달리 필터를 늘리는 일이 한 줄이고, 개수 계산(‹FILTERS.active›)에도 같은 조건을 재사용합니다. 버튼은 ‹nav› 안에 ‹data-filter›만 적어 두고 위임 리스너 하나로 처리합니다(2단계와 같은 방식). 현재 필터는 ‹aria-pressed›로 표시해 스타일과 스크린리더가 같은 신호를 쓰게 합니다.

### 가장 위험한 두 실수
첫째, 필터 결과로 state를 덮어쓰는 것입니다. ‹state.todos = state.todos.filter(...)›를 보이는 것만 남기기로 쓰면 숨겨진 항목은 영영 사라집니다. 저장까지 되면 복구도 안 됩니다. 필터는 state를 바꾸지 않고 render에서 목록만 거르는 계산입니다. 둘째, 화면 순번으로 항목을 찾는 것입니다. 필터가 켜져 있으면 화면의 0번이 state의 0번이 아닙니다. 이 모듈이 처음부터 ‹data-id›로 찾는 이유입니다.

### 빈 상태도 화면이다
항목이 0개일 때의 흰 화면은 고객에게 고장으로 보입니다. 이 앱에는 빈 상태가 두 가지 있습니다.
- 전체가 0개: ‹아직 할 일이 없어요. 위에 하나 적어 보세요.› 처음 쓰는 사람에게 다음 행동을 알려 줍니다.
- 필터 결과가 0개: ‹이 필터에 맞는 항목이 없어요.› 데이터가 사라진 게 아니라는 안내입니다.
둘을 가르는 기준은 원본 개수(‹state.todos.length›)와 보이는 개수(‹shown.length›)를 비교하는 것입니다. 안내 문구는 ‹hidden› 속성으로 껐다 켭니다.

### 작은 UX 결정들
- 새 항목을 추가할 때 필터를 전체로 되돌립니다. 완료 필터에서 추가하면 새 항목이 안 보여 추가가 안 됐다고 오해합니다.
- 진행 중 필터에서 항목을 완료 처리하면 목록에서 사라지는데 의도된 동작입니다. 다만 키보드 사용자는 포커스가 사라지므로 6단계에서 다룹니다.
- 개수 문구는 ‹남은 할 일 N개 / 전체 M개›처럼 두 숫자를 함께 보여 주고, 0개일 때도 같은 형식을 유지해 레이아웃이 흔들리지 않게 합니다.

### 실행해서 확인할 것
- 처음에 ‹남은 할 일 1개 / 전체 2개›가 보여야 합니다.
- 완료 버튼을 누르면 완료 항목 1개만 보이고 그 버튼이 굵게 표시돼야 합니다.
- 완료 화면에서 그 항목의 체크를 풀면 목록에서 사라지고 ‹이 필터에 맞는 항목이 없어요.›가 보여야 합니다. 전체 버튼을 누르면 항목은 그대로 있습니다. 숨겨졌을 뿐입니다.
- 항목을 모두 지우면 ‹아직 할 일이 없어요.› 안내가 보이고, 완료 필터에서 새 항목을 추가하면 전체 필터로 돌아와야 합니다.

### 혼자 바꿔 보기
- 검색 입력창을 더해 보세요. 검색어는 ‹state.query›에 두고(저장하지 않음), render에서 필터 조건과 함께 ‹t.text.includes(state.query)›로 거릅니다.
- 확인: 완료 필터와 검색어가 동시에 적용되고, 검색어를 지우면 숨겨졌던 항목이 모두 돌아오며, 개수 문구의 전체 M개는 검색과 상관없이 그대로입니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>할 일 앱 - 5단계</title>
<style>
  body { font: 16px system-ui; max-width: 420px; margin: 2rem auto; padding: 0 1rem; }
  ul { padding: 0; list-style: none; }
  li { display: flex; gap: .5rem; padding: .25rem 0; }
  li span { flex: 1; }
  .done span { text-decoration: line-through; color: #777; }
  #notice { color: #b00020; }
  button[aria-pressed=true] { font-weight: bold; }
</style>
</head>
<body>
<h1>할 일</h1>
<form id="form">
  <input id="text" maxlength="100" placeholder="할 일을 입력" autocomplete="off">
  <button>추가</button>
</form>
<p id="notice"></p>
<nav id="filters">
  <button data-filter="all">전체</button>
  <button data-filter="active">진행 중</button>
  <button data-filter="done">완료</button>
</nav>
<p id="empty" hidden></p>
<ul id="list"></ul>
<p id="count"></p>
<script>
const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const KEY = 'todo-app:v1';
const FILTERS = { all: () => true, active: t => !t.done, done: t => t.done };
const seed = () => [
  { id: 'a1', text: 'HTML 복습하기', done: true },
  { id: 'a2', text: '할 일 앱 만들기', done: false },
];

let store = null;
try { store = window.localStorage; store.setItem('__probe', '1'); store.removeItem('__probe'); }
catch (e) { store = null; }
function put(key, value) {
  if (!store) return false;
  try { store.setItem(key, value); return true; } catch (e) { return false; }
}
const isTodo = t => t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.done === 'boolean';
function load() {
  if (!store) return { todos: seed(), msg: '이 실행창은 저장이 막혀 있어요. 새로고침하면 사라집니다.' };
  const raw = store.getItem(KEY);
  if (raw === null) return { todos: seed(), msg: '' };
  try {
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.todos)) throw new Error('형식이 다릅니다');
    return { todos: data.todos.filter(isTodo), msg: '' };
  } catch (e) {
    put(KEY + ':broken', raw);
    return { todos: [], msg: '저장된 데이터를 읽지 못해 새로 시작합니다. 원본은 ' + KEY + ':broken 에 백업했어요.' };
  }
}
const loaded = load();
const state = { todos: loaded.todos, filter: 'all' };   // filter는 화면 상태: 저장하지 않는다
$('notice').textContent = loaded.msg;

function makeItem(todo) {
  const li = document.createElement('li');
  li.dataset.id = todo.id;
  li.className = todo.done ? 'done' : '';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = todo.done;
  box.dataset.act = 'toggle';
  const text = document.createElement('span');
  text.textContent = todo.text;
  const del = document.createElement('button');
  del.textContent = '삭제';
  del.dataset.act = 'del';
  li.append(box, text, del);
  return li;
}
// ── 5단계: 보여 줄 목록·개수·빈 화면은 전부 state에서 계산한다 ──
function render() {
  const shown = state.todos.filter(FILTERS[state.filter]);
  $('list').replaceChildren(...shown.map(makeItem));
  $('empty').hidden = shown.length > 0;
  $('empty').textContent = state.todos.length ? '이 필터에 맞는 항목이 없어요.' : '아직 할 일이 없어요. 위에 하나 적어 보세요.';
  $('count').textContent = '남은 할 일 ' + state.todos.filter(FILTERS.active).length + '개 / 전체 ' + state.todos.length + '개';
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === state.filter)));
}
function commit() {
  const ok = put(KEY, JSON.stringify({ v: 1, todos: state.todos }));
  $('notice').textContent = ok ? '' : '저장하지 못했어요. 새로고침하면 사라질 수 있습니다.';
  render();
}

function add(text) { state.todos.push({ id: uid(), text, done: false }); state.filter = 'all'; commit(); }
function toggle(id) {
  const todo = state.todos.find(t => t.id === id);
  if (todo) todo.done = !todo.done;
  commit();
}
function remove(id) { state.todos = state.todos.filter(t => t.id !== id); commit(); }

$('list').addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const id = el.closest('li').dataset.id;      // 화면 순번이 아니라 id로 찾는다 (필터 때문에 순번이 달라진다)
  if (el.dataset.act === 'toggle') toggle(id);
  if (el.dataset.act === 'del') remove(id);
});
$('filters').addEventListener('click', e => {
  const b = e.target.closest('[data-filter]');
  if (b) { state.filter = b.dataset.filter; render(); }   // 보는 방식만 바뀌므로 저장(commit)은 필요 없다
});
$('form').addEventListener('submit', e => {
  e.preventDefault();
  const text = $('text').value.trim();
  if (text) add(text);
  $('text').value = '';
  $('text').focus();
});
render();
</script>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `원본 데이터만 저장하고 파생 데이터(보이는 목록·남은 개수)는 render에서 매번 계산한다`,
        `필터는 state를 덮어쓰지 않는다: state.filter에 이름만 두고 render에서 거른다`,
        `조건 함수의 표(FILTERS)로 필터를 한 줄씩 늘리고 개수 계산에도 재사용한다`,
        `항목은 화면 순번이 아니라 data-id로 찾는다`,
        `빈 상태는 두 가지(전체 0개 / 필터 결과 0개)로 나눠 각각 다음 행동을 알려 준다`
      ],
      pitfalls: [
        `남은 개수를 별도 변수에 저장해 토글·삭제마다 손으로 맞춘다. 한 경로만 빠뜨려도 개수가 틀린다.`,
        `필터 함수의 결과를 state.todos에 다시 대입한다. 숨겨진 항목이 영구히 삭제된다.`,
        `splice(화면 인덱스, 1)로 지운다. 필터가 켜져 있으면 엉뚱한 항목이 지워진다.`,
        `빈 목록에서 아무것도 보여 주지 않는다. 고객은 로딩 실패나 고장으로 받아들인다.`
      ]
    },
    {
      title: `접근성: 키보드·라벨·포커스 이동`,
      body: `접근성은 나중에 칠하는 광택이 아니라 앱이 제대로 만들어졌는지 확인하는 방법입니다. 모든 기능을 키보드로 쓸 수 있어야 하고(WCAG 2.2 성공기준 2.1.1 키보드, 레벨 A), 스크린리더가 각 요소의 이름과 상태를 읽어야 하며, 화면이 바뀌어도 사용자의 위치가 유지돼야 합니다. 공공·기업 납품에서는 접근성이 계약 조건에 들어오기도 하고, 아니어도 이 점검은 마우스 없이 쓰는 사용자 모두에게 이득입니다.

### 1. 기본 요소를 쓰면 키보드는 공짜
‹button›은 Tab으로 포커스를 받고 Enter·Space로 눌립니다. 체크박스는 Space로 토글되고 ‹form›은 Enter로 제출됩니다. 반대로 ‹div›에 ‹onclick›을 단 가짜 버튼은 Tab도 안 되고 Enter도 안 먹습니다. ‹tabindex="0"›을 더해도 키 처리를 직접 짜야 합니다. 진짜 버튼을 쓰는 것이 가장 싸고 정확합니다. WCAG 문서는 포인터 전용 이벤트만 쓰는 구현과 포커스를 일부러 치우는 스크립트를 실패 사례로 듭니다.

### 2. 모든 컨트롤에는 이름이 있어야 한다
- **입력창**: 눈에는 placeholder만 보여도 스크린리더에는 ‹label›이 이름입니다. ‹label for="text"›로 연결하고 CSS로 화면 밖으로 밀어 시각적으로만 숨깁니다. ‹display:none›이나 ‹hidden›은 접근성 트리에서도 지워 버리므로 안 됩니다.
- **체크박스**: 글자를 ‹label›로 감싸 한 덩어리로 만듭니다(MDN: 라벨을 누르면 포커스가 연결된 입력으로 가고 클릭 영역도 넓어집니다). 글자를 눌러도 체크가 토글되는지는 직접 눌러 확인하세요. 스크린리더는 우유 사기, 체크박스, 선택 안 됨처럼 읽습니다.
- **삭제 버튼**: 버튼 열 개가 모두 삭제라면 스크린리더의 버튼 목록에서 구별할 수 없습니다. ‹aria-label›에 항목 글자를 넣어 우유 사기 삭제로 만듭니다. 눈에 보이는 삭제라는 글자가 이름 안에 그대로 들어 있어야 음성 조작 사용자도 삭제라고 말해 누를 수 있습니다.

### 3. 바뀐 내용을 알려 주기: live region
남은 개수나 저장 실패 안내가 바뀌어도 스크린리더는 모릅니다. ‹role="status"›는 암묵적으로 ‹aria-live="polite"›라서 지금 읽던 말이 끝난 뒤 바뀐 내용을 읽어 줍니다. MDN은 호환성을 위해 ‹aria-live="polite"›를 중복해서 적으라고 하고, 영역을 처음 마크업에 넣어 두는 것이 가장 확실하다고 합니다. 그래서 코드의 ‹#notice›와 ‹#count›는 처음부터 HTML에 있고 JS는 글자만 바꿉니다. 로드 직후 곧바로 채운 안내는 읽히지 않을 수 있습니다(MDN은 등록될 시간을 주라고 함). ‹assertive›나 ‹role="alert"›는 말을 끊으므로 정말 급할 때만 씁니다.

### 4. 포커스 이동: 통째로 그리는 설계의 청구서
render가 목록을 갈아 끼우면 포커스를 가졌던 노드가 사라져 포커스가 ‹body›로 돌아갑니다. 이 뒤의 Tab은 Edge(Chromium)에서 목록의 첫 항목으로 갑니다(3단계 코드에서 12개 중 6번째를 지워 확인했고, 브라우저와 보조기기에 따라 다를 수 있습니다). 키보드 사용자는 삭제 하나마다 목록 처음부터 항목당 Tab 2번씩 다시 지나가야 하므로 30개 중 25번째를 지우면 약 50번입니다. 그래서 ‹focusItem(id, act)›으로 다시 그린 뒤 포커스를 돌려줍니다.
- 토글 후: 같은 항목의 체크박스
- 삭제 후: 다음 항목(없으면 이전 항목)의 삭제 버튼, 항목이 하나도 없으면 입력창
- 추가 후: 입력창에 그대로
‹focus()›는 대상이 포커스를 받을 수 없으면 조용히 아무 일도 하지 않으므로(MDN은 실패 시 예외를 규정하지 않습니다) 못 찾을 때 입력창으로 가는 대체 경로를 둡니다. ‹:focus-visible› 윤곽선은 보이게 두세요. ‹outline: none›만 쓰는 CSS는 키보드 사용자에게서 현재 위치를 빼앗습니다.

### 점검 방법
마우스를 치우고 Tab·Shift+Tab·Enter·Space만으로 추가, 완료, 필터, 삭제를 해 봅니다. 윤곽선이 항상 보이는지, 이동 순서가 화면 순서와 같은지 봅니다. 이 점검표를 결과와 함께 납품 문서에 붙이면 접근성을 말이 아니라 증거로 보여 줄 수 있습니다. 브라우저 개발자 도구의 접근성(Accessibility) 트리에서 각 요소의 이름이 읽히는지도 확인합니다. Windows라면 무료 스크린리더 NVDA로 직접 들어 보세요.

### 실행해서 확인할 것
- Tab으로 입력창, 추가, 필터 3개, 항목 순서로 이동하고 포커스 윤곽선이 항상 보여야 합니다.
- 체크박스에서 Space를 누르면 토글된 뒤에도 윤곽선이 같은 항목의 체크박스에 남아야 합니다.
- 삭제 버튼에서 Enter를 누르면 윤곽선이 다음 항목의 삭제 버튼으로 가고, 마지막 항목을 지우면 입력창으로 가야 합니다.
- 글자를 눌러도 체크가 토글되어야 합니다. 5단계까지는 되지 않던 동작입니다.

### 혼자 바꿔 보기
- 필터 버튼을 누르면 보이는 항목 수를 ‹role="status"› 영역에 ‹진행 중 1개 표시›처럼 알려 보세요. 지금은 목록이 바뀌었다는 알림이 없습니다.
- 확인: 필터를 바꿀 때마다 그 영역의 글자가 바뀌고, 개발자 도구 접근성 트리에서 live region으로 보여야 합니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>할 일 앱 - 6단계</title>
<style>
  body { font: 16px system-ui; max-width: 420px; margin: 2rem auto; padding: 0 1rem; }
  ul { padding: 0; list-style: none; }
  li { display: flex; gap: .5rem; padding: .25rem 0; }
  li label { flex: 1; }
  .done label { text-decoration: line-through; color: #777; }
  #notice { color: #b00020; }
  button[aria-pressed=true] { font-weight: bold; }
  :focus-visible { outline: 3px solid #06c; outline-offset: 2px; }
  .sr { position: absolute; left: -9999px; }
</style>
</head>
<body>
<h1>할 일</h1>
<form id="form">
  <label for="text" class="sr">새 할 일</label>
  <input id="text" maxlength="100" placeholder="할 일을 입력" autocomplete="off">
  <button>추가</button>
</form>
<p id="notice" role="status" aria-live="polite"></p>
<nav id="filters" aria-label="필터">
  <button data-filter="all">전체</button>
  <button data-filter="active">진행 중</button>
  <button data-filter="done">완료</button>
</nav>
<p id="empty" hidden></p>
<ul id="list" aria-label="할 일 목록"></ul>
<p id="count" role="status" aria-live="polite"></p>
<script>
const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const KEY = 'todo-app:v1';
const FILTERS = { all: () => true, active: t => !t.done, done: t => t.done };
const seed = () => [
  { id: 'a1', text: 'HTML 복습하기', done: true },
  { id: 'a2', text: '할 일 앱 만들기', done: false },
];

let store = null;
try { store = window.localStorage; store.setItem('__probe', '1'); store.removeItem('__probe'); }
catch (e) { store = null; }
function put(key, value) {
  if (!store) return false;
  try { store.setItem(key, value); return true; } catch (e) { return false; }
}
const isTodo = t => t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.done === 'boolean';
function load() {
  if (!store) return { todos: seed(), msg: '이 실행창은 저장이 막혀 있어요. 새로고침하면 사라집니다.' };
  const raw = store.getItem(KEY);
  if (raw === null) return { todos: seed(), msg: '' };
  try {
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.todos)) throw new Error('형식이 다릅니다');
    return { todos: data.todos.filter(isTodo), msg: '' };
  } catch (e) {
    put(KEY + ':broken', raw);
    return { todos: [], msg: '저장된 데이터를 읽지 못해 새로 시작합니다. 원본은 ' + KEY + ':broken 에 백업했어요.' };
  }
}
const loaded = load();
const state = { todos: loaded.todos, filter: 'all' };
$('notice').textContent = loaded.msg;
const visible = () => state.todos.filter(FILTERS[state.filter]);

// ── 6단계: 글자를 <label>로 감싸 체크박스의 이름으로 삼는다 ──
function makeItem(todo) {
  const li = document.createElement('li');
  li.dataset.id = todo.id;
  li.className = todo.done ? 'done' : '';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = todo.done;
  box.dataset.act = 'toggle';
  const text = document.createElement('span');
  text.textContent = todo.text;
  const label = document.createElement('label');
  label.append(box, text);                 // 글자를 눌러도 토글되고, 스크린리더는 체크박스 이름을 읽는다
  const del = document.createElement('button');
  del.textContent = '삭제';
  del.dataset.act = 'del';
  del.setAttribute('aria-label', '"' + todo.text + '" 삭제');   // "삭제"만 열 번 들리면 무엇을 지우는지 모른다
  li.append(label, del);
  return li;
}
function render() {
  const shown = visible();
  $('list').replaceChildren(...shown.map(makeItem));
  $('empty').hidden = shown.length > 0;
  $('empty').textContent = state.todos.length ? '이 필터에 맞는 항목이 없어요.' : '아직 할 일이 없어요. 위에 하나 적어 보세요.';
  $('count').textContent = '남은 할 일 ' + state.todos.filter(FILTERS.active).length + '개 / 전체 ' + state.todos.length + '개';
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === state.filter)));
}
function commit() {
  const ok = put(KEY, JSON.stringify({ v: 1, todos: state.todos }));
  $('notice').textContent = ok ? '' : '저장하지 못했어요. 새로고침하면 사라질 수 있습니다.';
  render();
}
// render가 DOM을 갈아치우면 포커스가 사라진다. 키보드 사용자의 위치를 직접 되돌려 준다.
function focusItem(id, act) {
  const li = [...$('list').children].find(x => x.dataset.id === id);
  const target = li && li.querySelector('[data-act="' + act + '"]');
  (target || $('text')).focus();           // 찾지 못하면 입력창으로
}

function add(text) { state.todos.push({ id: uid(), text, done: false }); state.filter = 'all'; commit(); }
function toggle(id) {
  const todo = state.todos.find(t => t.id === id);
  if (todo) todo.done = !todo.done;
  commit();
  focusItem(id, 'toggle');
}
function remove(id) {
  const v = visible(), i = v.findIndex(t => t.id === id);
  const next = v[i + 1] || v[i - 1];       // 지운 뒤 포커스를 받을 이웃
  state.todos = state.todos.filter(t => t.id !== id);
  commit();
  if (next) focusItem(next.id, 'del'); else $('text').focus();
}

$('list').addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const id = el.closest('li').dataset.id;
  if (el.dataset.act === 'toggle') toggle(id);
  if (el.dataset.act === 'del') remove(id);
});
$('filters').addEventListener('click', e => {
  const b = e.target.closest('[data-filter]');
  if (b) { state.filter = b.dataset.filter; render(); }
});
$('form').addEventListener('submit', e => {
  e.preventDefault();
  const text = $('text').value.trim();
  if (text) add(text);
  $('text').value = '';
  $('text').focus();
});
render();
</script>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `button·input·form 같은 기본 요소를 쓰면 키보드(Tab·Enter·Space)가 공짜다: div에 onclick을 달지 않는다`,
        `모든 컨트롤에 이름: 입력창은 label, 체크박스는 label로 감싸기, 같은 글자 버튼은 aria-label에 대상 포함`,
        `role=status(live region)는 처음 마크업에 두고 글자만 바꾼다: 내용이 바뀌어야 읽히고 aria-live="polite"를 중복 지정하면 호환성이 좋다`,
        `render가 DOM을 갈아치우면 포커스가 사라진다: 토글은 같은 항목, 삭제는 이웃 항목, 없으면 입력창으로 직접 옮긴다`,
        `focus-visible 윤곽선을 지우지 않는다: 마우스 없이 Tab만으로 전 기능을 해 본다`
      ],
      pitfalls: [
        `div나 span에 클릭 핸들러를 달아 버튼처럼 쓴다. Tab으로 못 가고 Enter·Space도 반응하지 않으며 스크린리더는 버튼으로 읽지 않는다.`,
        `디자인이 거슬린다며 outline: none을 전역에 쓴다. 키보드 사용자는 지금 어디에 있는지 알 수 없다.`,
        `입력창 label을 display:none이나 hidden으로 숨긴다. 접근성 트리에서도 사라져 이름이 없는 입력창이 된다.`,
        `삭제·토글 뒤 포커스를 복원하지 않는다. 키보드 사용자는 조작할 때마다 목록 처음부터 Tab으로 다시 찾아가야 한다.`
      ]
    },
    {
      title: `리팩터링과 콘솔 assert 테스트`,
      body: `기능이 늘면 코드가 커지고, 코드가 커지면 고치다가 다른 것을 깨뜨리는 일이 생깁니다. 리팩터링은 동작을 바꾸지 않고 구조만 고치는 작업이고, 동작이 안 바뀌었다는 증거를 주는 것이 테스트입니다. 이번 단계의 주제는 로직을 순수 함수로 꺼내기와 콘솔 assert 테스트입니다.

### 순수 함수란
같은 입력이면 항상 같은 출력을 주고, 입력을 바꾸지 않으며, DOM·저장소·현재 시각·난수를 건드리지 않는 함수입니다. ‹addTodo(todos, text, id)›는 배열과 글자와 id를 받아 새 배열을 돌려줍니다. id를 밖에서 받는 이유는 난수가 함수 안에 있으면 결과를 예측할 수 없어 테스트할 수 없기 때문입니다. 8단계의 ‹todayStr(d)›가 날짜를 인자로 받는 것도 같은 이유입니다. ‹[...todos, x]›, ‹map›, ‹{ ...t, done: !t.done }›, ‹filter›는 원본을 두고 복사본을 만듭니다. ‹push›·‹splice›·‹sort›·‹t.done = ...›은 원본을 바꿉니다.

### 핵심과 껍데기로 나누기
앱의 두뇌(상태가 어떻게 바뀌는가)를 순수 함수에, 몸(DOM·저장·이벤트)을 핸들러에 둡니다. 핸들러는 순수 함수를 불러 결과를 state에 넣고 commit하는 짧은 코드가 됩니다. 그 결과 (1) 두뇌는 브라우저 없이 한 줄씩 시험할 수 있고 (2) 핸들러가 얇아 버그가 숨을 곳이 적으며 (3) 나중에 서버로 옮길 때 두뇌를 그대로 가져갑니다.

### console.assert의 성질
‹console.assert(조건, 메시지)›는 조건이 참이면 아무것도 하지 않고 거짓이면 콘솔에 Assertion failed와 메시지를 오류로 찍습니다. 예외를 던지지 않으므로 이후 코드는 계속 실행됩니다(MDN). 장점은 한 줄이 실패해도 나머지가 돌아간다는 것, 단점은 성공이 무소식이라 실패 한 줄이 수십 줄 로그에 묻히기 쉽다는 것입니다. 그래서 ‹check(이름, 함수)›로 감쌉니다. 함수가 예외를 던지면 실패로 세고, 실패 이름을 모아, 화면에 한 줄로 요약합니다. 로그를 읽지 않아도 테스트 7개 모두 통과인지 한눈에 보입니다.

### 무엇을 시험하나
정상 입력은 이미 눈으로 봅니다. 테스트는 눈이 못 보는 경계에서 값을 합니다. 공백뿐인 입력, 없는 id, 깨진 JSON, 모양이 다른 JSON, 필드가 빠진 항목이 그렇습니다. 한 번 고친 버그도 테스트로 남깁니다(회귀 테스트). 원본이 안 바뀌는지는 ‹Object.freeze›로 입력을 얼려 확인합니다. ‹'use strict'› 아래에서 얼린 객체를 고치려 하면 TypeError가 나서 몰래 변경이 즉시 드러납니다. 이 환경에서 확인한 동작입니다.

### 테스트의 테스트
통과하는 것만으로는 부족합니다. 코드를 일부러 망가뜨렸을 때 테스트가 실패하는지 확인해야 합니다. 어떤 변경에도 통과하는 테스트는 안심만 줄 뿐입니다.

### 현실 프로젝트와의 거리
외주에서는 납품 뒤에도 작은 수정 요청이 반복됩니다. 테스트가 없으면 매번 전체를 눈으로 다시 확인하느라 시간을 쓰고, 그 시간은 대개 무상 지원 기간의 내 부담이 됩니다. 테스트는 그 재확인 비용을 줄이는 투자입니다. 여기서는 학습을 위해 로드할 때마다 테스트를 돌립니다. 납품 코드에서는 테스트를 별도 파일(또는 ‹?test› 같은 스위치 뒤)에 두어 고객 화면에는 나가지 않게 합니다. Vitest나 Jest 같은 도구는 같은 아이디어를 파일 감시·리포트·커버리지로 키운 것이라 이 단계의 감각이 그대로 이어집니다.

### 리팩터링 순서
5·6단계 코드로 수동 점검표(추가, 토글, 삭제, 새로고침)를 먼저 한 번 돌립니다. 함수 하나를 꺼내고, 점검하고, 그 함수의 테스트를 쓰고, 다음 함수로 갑니다. 한 번에 여러 개를 바꾸면 깨졌을 때 원인을 못 좁힙니다.

### 실행해서 확인할 것
- 화면 아래에 테스트 7개 모두 통과가 보이고, 앱 동작은 6단계와 같아야 합니다.
- 실험 1: ‹addTodo›의 ‹text.trim() ?›를 ‹text ?›로 고치면 테스트 실패: addTodo는 공백 입력을 거부한다가 보여야 합니다. 되돌리면 통과로 바뀝니다.
- 실험 2: ‹toggleTodo›를 ‹(todos, id) => { todos.find(t => t.id === id).done = true; return todos; }›처럼 중괄호 본문으로 망가뜨려 어느 테스트가 실패하는지 읽어 보세요. 얼린 배열을 고치려 해 TypeError가 나고, check가 그것을 실패로 셉니다.

### 혼자 바꿔 보기
- ‹clearDone(todos)›(완료 항목만 지운 새 배열)를 테스트부터 쓰세요. check만 먼저 추가해 실패 요약이 뜨는 것을 보고, 그다음 함수를 만들어 통과시킵니다. 빈 배열·모두 완료·완료 없음 세 경우를 넣으세요.
- 확인: 함수를 만들기 전에는 ‹테스트 실패›가, 만든 뒤에는 ‹테스트 10개 모두 통과›(기존 7개 + 새 3개)가 보여야 합니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>할 일 앱 - 7단계</title>
<style>
  body { font: 16px system-ui; max-width: 420px; margin: 2rem auto; padding: 0 1rem; }
  ul { padding: 0; list-style: none; }
  li { display: flex; gap: .5rem; padding: .25rem 0; }
  li label { flex: 1; }
  .done label { text-decoration: line-through; color: #777; }
  #notice, #tsum { color: #b00020; }
  button[aria-pressed=true] { font-weight: bold; }
  :focus-visible { outline: 3px solid #06c; outline-offset: 2px; }
  .sr { position: absolute; left: -9999px; }
</style>
</head>
<body>
<h1>할 일</h1>
<form id="form">
  <label for="text" class="sr">새 할 일</label>
  <input id="text" maxlength="100" placeholder="할 일을 입력" autocomplete="off">
  <button>추가</button>
</form>
<p id="notice" role="status" aria-live="polite"></p>
<nav id="filters" aria-label="필터">
  <button data-filter="all">전체</button>
  <button data-filter="active">진행 중</button>
  <button data-filter="done">완료</button>
</nav>
<p id="empty" hidden></p>
<ul id="list" aria-label="할 일 목록"></ul>
<p id="count" role="status" aria-live="polite"></p>
<p id="tsum"></p>
<script>
'use strict';
const $ = id => document.getElementById(id);
const KEY = 'todo-app:v1';
const FILTERS = { all: () => true, active: t => !t.done, done: t => t.done };

// ── 7단계: 순수 함수. 입력 → 출력뿐이고 DOM·저장소·시계를 모른다 (그래서 테스트하기 쉽다) ──
const addTodo = (todos, text, id) => text.trim() ? [...todos, { id, text: text.trim(), done: false }] : todos;
const toggleTodo = (todos, id) => todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
const removeTodo = (todos, id) => todos.filter(t => t.id !== id);
const visibleTodos = (todos, filter) => todos.filter(FILTERS[filter]);
const remaining = todos => todos.filter(FILTERS.active).length;
const isTodo = t => t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.done === 'boolean';
const parse = raw => { try { const d = JSON.parse(raw); return Array.isArray(d.todos) ? d.todos.filter(isTodo) : null; } catch (e) { return null; } };

// ── 저장소: 막히거나 깨져도 앱은 산다 ──
let store = null;
try { store = window.localStorage; store.setItem('__probe', '1'); store.removeItem('__probe'); }
catch (e) { store = null; }
function put(key, value) {
  if (!store) return false;
  try { store.setItem(key, value); return true; } catch (e) { return false; }
}
function load() {
  const seed = [{ id: 'a1', text: '할 일 앱 만들기', done: false }];
  if (!store) return { todos: seed, msg: '이 실행창은 저장이 막혀 있어요. 새로고침하면 사라집니다.' };
  const raw = store.getItem(KEY);
  if (raw === null) return { todos: seed, msg: '' };
  const todos = parse(raw);
  if (todos) return { todos, msg: '' };
  put(KEY + ':broken', raw);
  return { todos: [], msg: '저장된 데이터를 읽지 못해 새로 시작합니다. 원본은 ' + KEY + ':broken 에 백업했어요.' };
}
const loaded = load();
const state = { todos: loaded.todos, filter: 'all' };
$('notice').textContent = loaded.msg;
const visible = () => visibleTodos(state.todos, state.filter);

// ── 화면: state를 읽어 통째로 그린다 ──
function makeItem(todo) {
  const li = document.createElement('li');
  li.dataset.id = todo.id;
  li.className = todo.done ? 'done' : '';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = todo.done;
  box.dataset.act = 'toggle';
  const text = document.createElement('span');
  text.textContent = todo.text;
  const label = document.createElement('label');
  label.append(box, text);
  const del = document.createElement('button');
  del.textContent = '삭제';
  del.dataset.act = 'del';
  del.setAttribute('aria-label', '"' + todo.text + '" 삭제');
  li.append(label, del);
  return li;
}
function render() {
  const shown = visible();
  $('list').replaceChildren(...shown.map(makeItem));
  $('empty').hidden = shown.length > 0;
  $('empty').textContent = state.todos.length ? '이 필터에 맞는 항목이 없어요.' : '아직 할 일이 없어요. 위에 하나 적어 보세요.';
  $('count').textContent = '남은 할 일 ' + remaining(state.todos) + '개 / 전체 ' + state.todos.length + '개';
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === state.filter)));
}
function commit() {
  const ok = put(KEY, JSON.stringify({ v: 1, todos: state.todos }));
  $('notice').textContent = ok ? '' : '저장하지 못했어요. 새로고침하면 사라질 수 있습니다.';
  render();
}
function focusItem(id, act) {
  const li = [...$('list').children].find(x => x.dataset.id === id);
  const target = li && li.querySelector('[data-act="' + act + '"]');
  (target || $('text')).focus();
}

// ── 이벤트: 상태 변경은 순수 함수를 부르고 결과를 state에 넣는 한 줄로 끝난다 ──
$('list').addEventListener('click', e => {
  const el = e.target.closest('[data-act]'), li = el && el.closest('li');
  if (!li) return;
  const id = li.dataset.id;
  if (el.dataset.act === 'toggle') { state.todos = toggleTodo(state.todos, id); commit(); focusItem(id, 'toggle'); }
  if (el.dataset.act === 'del') {
    const v = visible(), i = v.findIndex(t => t.id === id), next = v[i + 1] || v[i - 1];
    state.todos = removeTodo(state.todos, id); commit();
    if (next) focusItem(next.id, 'del'); else $('text').focus();
  }
});
$('filters').addEventListener('click', e => {
  const b = e.target.closest('[data-filter]');
  if (b) { state.filter = b.dataset.filter; render(); }
});
$('form').addEventListener('submit', e => {
  e.preventDefault();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const next = addTodo(state.todos, $('text').value, id);
  if (next !== state.todos) { state.todos = next; state.filter = 'all'; commit(); }
  $('text').value = '';
  $('text').focus();
});
render();

// ── 콘솔 assert 테스트: 실패한 이름만 화면과 콘솔에 남긴다 ──
const fails = [];
let total = 0;
function check(name, fn) {
  let ok = false;
  try { ok = fn() === true; } catch (e) { ok = false; }   // 예외도 실패로 센다
  console.assert(ok, name);                                // 실패할 때만 콘솔에 "Assertion failed: 이름"
  total++;
  if (!ok) fails.push(name);
}
const T = Object.freeze([Object.freeze({ id: 'a', text: 'x', done: false })]);   // 얼려 두면 몰래 고칠 때 에러가 난다
check('addTodo는 공백 입력을 거부한다', () => addTodo(T, '   ', 'b') === T);
check('addTodo는 다듬은 새 배열을 돌려준다', () => addTodo(T, ' y ', 'b')[1].text === 'y' && T.length === 1);
check('toggleTodo는 원본을 바꾸지 않는다', () => toggleTodo(T, 'a')[0].done === true && T[0].done === false);
check('removeTodo는 해당 id만 지운다', () => removeTodo(T, 'a').length === 0 && removeTodo(T, 'zz').length === 1);
check('visibleTodos와 remaining', () => visibleTodos(toggleTodo(T, 'a'), 'done').length === 1 && remaining(T) === 1);
check('parse는 깨진 JSON에 null', () => parse('{oops') === null && parse('null') === null && parse('{"todos":5}') === null);
check('parse는 이상한 항목만 버린다', () => parse('{"todos":[{"id":"a","text":"x","done":false},{"id":1}]}').length === 1);
$('tsum').textContent = fails.length ? '테스트 실패: ' + fails.join(' / ') : '테스트 ' + total + '개 모두 통과';
</script>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `순수 함수: 입력만 보고 새 값을 돌려주고, 입력·DOM·저장소·시각·난수를 건드리지 않는다`,
        `두뇌(순수 함수)와 껍데기(핸들러)를 나누면 두뇌는 브라우저 없이 시험할 수 있다`,
        `console.assert는 예외를 던지지 않고 성공은 무소식: check로 감싸 개수와 실패 이름을 화면에 요약한다`,
        `경계(공백·없는 id·깨진 JSON)와 고친 버그를 테스트로 남기고 Object.freeze로 원본 불변을 검증한다`,
        `테스트가 실패해야 할 때 실제로 실패하는지 일부러 코드를 망가뜨려 확인한다`
      ],
      pitfalls: [
        `순수 함수라면서 안에서 push·sort·직접 대입으로 입력을 바꾼다. state를 넘기면 원본이 몰래 바뀌어 추적 불가한 버그가 생긴다.`,
        `테스트가 DOM이나 localStorage에 기대어 순서와 환경에 따라 통과와 실패가 바뀐다.`,
        `console.assert만 쓰고 요약이 없다. 수십 줄 로그에 실패 한 줄이 묻혀 지나간다.`,
        `정상 입력만 시험한다. 실제 사고는 빈 값·깨진 데이터·없는 id 같은 경계에서 난다.`
      ]
    },
    {
      title: `확장과 납품 사례: 마감일·정렬·내보내기`,
      body: `마지막 단계는 코드와 고객 상황을 함께 다룹니다. 아래 의뢰는 가상이지만 요청 문장은 현실에서 자주 듣는 모양입니다. **가상 의뢰**:소규모 인테리어 팀(5명)의 대표가 말합니다. "현장 점검 목록을 폰으로 체크하고, 마감 지난 건 빨갛게, 마감 빠른 순으로 보고, 월말에 엑셀로 뽑고 싶어요. 인터넷이 잘 안 터지는 현장이 많아요."

### 요구를 질문과 결정으로
| 질문 | 가정한 답 | 결정
| 여러 명이 같은 목록을 봐야 하나 | 각자 자기 폰 | localStorage로 충분. 공유가 필요하면 서버가 필요해 범위·견적이 달라진다
| 데이터 분실을 용납하나 | 아니오 | 내보내기를 백업 경로로 기본 범위에 넣고 안내문을 쓴다
| 엑셀은 어떤 환경 | 한국어 엑셀 | UTF-8 BOM이 붙은 CSV
| 개인정보가 들어가나 | 없음 | 평문 저장 허용. 있었다면 설계를 다시 한다

### 데이터 이주: 이미 저장된 데이터를 깨지 않기
항목에 ‹due›를 추가하면 고객 폰에 이미 저장된 옛 데이터에는 ‹due›가 없습니다. 읽는 쪽 ‹clean()›이 모양을 현재 형식으로 맞추게 하면(없으면 빈 문자열) 이주 스크립트 없이 해결됩니다. 원칙은 읽을 때는 너그럽게, 쓸 때는 엄격하게입니다. 저장 형식 번호 ‹v›는 2로 올렸고, 더 큰 변경 때 버전별 변환 함수를 붙일 자리입니다. 대비하지 않으면 업데이트 한 번에 기존 데이터가 읽히지 않을 수 있습니다.

### 날짜: 현지 시각으로, 문자열 그대로
‹input type="date"›의 값은 항상 ‹yyyy-mm-dd› 문자열이고 비어 있으면 빈 문자열입니다(MDN). 이 형식은 문자열 비교만으로 날짜 순서가 맞아 마감 지남은 ‹due < today›로 충분합니다. 함정은 오늘 날짜를 만드는 방법입니다. ‹new Date().toISOString().slice(0, 10)›은 UTC 날짜라서 한국(UTC+9)에서는 00:00~09:00에 어제 날짜가 나옵니다. 이 환경에서 현지 01:00의 ‹toISOString()›이 전날 날짜를 주는 것을 확인했습니다. 어제 마감 항목이 오전 9시가 되어야 빨개지는 버그가 됩니다. ‹getFullYear›·‹getMonth›·‹getDate›로 현지 날짜를 직접 만들고, 인자로 받는 ‹todayStr(d)›로 두어 테스트합니다. 또 ‹new Date('2026-01-05')›는 날짜만 있는 ISO 문자열이라 UTC 자정으로 해석되므로(MDN Date.parse) 마감일 문자열을 Date로 바꿔 비교하지 마세요.

날짜 입력에는 ‹max="9999-12-31"›도 둡니다. 연도를 5자리로 치면 값이 ‹20260-01-05›처럼 나오는데(Edge에서 확인), 저장 뒤 ‹clean()›의 4자리 검사에서 걸러져 마감일이 조용히 사라집니다.

### 정렬: 복사본에, 안정적으로
‹Array.prototype.sort›는 원본 배열을 제자리에서 바꿉니다(MDN). ‹state.todos.sort(...)›를 부르면 저장된 순서가 영구히 바뀝니다. 그래서 ‹[...list].sort(...)›로 복사본을 정렬하고 정렬은 화면 계산에만 둡니다. 2019년 표준(ES2019) 이후 정렬은 안정적이라 같은 마감일 항목은 추가한 순서를 유지합니다(MDN). 마감일이 없는 항목은 센티널 값 ‹'9999'›로 맨 뒤로 보내고, 한글 이름순은 ‹localeCompare(b, 'ko')›를 씁니다.

### 내보내기: CSV의 세 가지 함정
- 쉼표·큰따옴표·줄바꿈이 든 칸은 큰따옴표로 감싸고 안의 큰따옴표는 두 개로 씁니다.
- 한국어 엑셀은 BOM이 없는 UTF-8 파일의 한글을 깨뜨리는 일이 흔해(버전·설정에 따라 다름) 맨 앞에 BOM 문자(‹U+FEFF›)를 붙입니다.
- =, +, -, @, 탭, CR로 시작하는 칸은 수식으로 해석될 수 있어 앞에 작은따옴표를 붙입니다(OWASP). 엑셀에 따옴표가 그대로 보이고 완벽한 방어는 아니라는 한계를 고객에게 알립니다.

다운로드는 ‹Blob›과 ‹URL.createObjectURL›로 가짜 링크를 만들어 누르고, 다 쓴 주소는 ‹revokeObjectURL›로 해제합니다(MDN). 이 실행창은 다운로드를 막을 수 있어 같은 내용을 텍스트 상자에도 보여 줍니다.

### 견적과 인수인계 (교육용 추정)
| 작업 | 시간
| 상태·렌더·추가/완료/삭제 | 3
| 저장·복원·손상 처리 | 2
| 필터·개수·빈 상태 | 1.5
| 접근성 점검·수정 | 2
| 테스트 | 2
| 마감일·정렬 | 2
| CSV 내보내기 | 1.5
| 폰·브라우저 3종 확인 | 2
| README·인수인계 | 1.5

합계 17.5시간에 버퍼 30%를 더해 23시간 안팎, 처음 해 보는 유형이면 1.5배로 잡습니다. 단가는 지역과 시장에 따라 달라 제시하지 않습니다. 인수인계 README에는 여는 법, 저장 위치와 한계, 월말 백업 절차, 테스트 보는 법, 알려진 한계와 버전을 넣습니다.

### 실행해서 확인할 것
- 과거 날짜의 마감일로 항목을 추가하면 붉은 글씨로 표시되고, 완료하면 붉은색이 사라져야 합니다.
- 정렬에서 마감일 빠른 순을 고르면 마감일 없는 항목이 맨 뒤로 가야 합니다.
- CSV 내보내기를 누르면 아래 상자에 첫 줄이 할 일,완료,마감일인 CSV가 보여야 합니다. 내 PC에 저장해 연 파일이라면 todos.csv가 내려받아집니다.
- 화면 아래에 테스트 9개 모두 통과가 보여야 합니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>할 일 앱 - 완성</title>
<style>
  body { font: 16px system-ui; max-width: 460px; margin: 2rem auto; padding: 0 1rem; }
  ul { padding: 0; list-style: none; }
  li { display: flex; gap: .5rem; padding: .25rem 0; }
  li label { flex: 1; }
  .done label { text-decoration: line-through; color: #777; }
  .late { color: #b00020; }
  #notice, #tsum { color: #b00020; }
  button[aria-pressed=true] { font-weight: bold; }
  :focus-visible { outline: 3px solid #06c; outline-offset: 2px; }
  .sr { position: absolute; left: -9999px; }
  #out { width: 100%; height: 5rem; }
</style>
</head>
<body>
<h1>할 일</h1>
<form id="form">
  <label for="text" class="sr">새 할 일</label>
  <input id="text" maxlength="100" placeholder="할 일을 입력" autocomplete="off">
  <input id="due" type="date" aria-label="마감일" max="9999-12-31">
  <button>추가</button>
</form>
<p id="notice" role="status" aria-live="polite"></p>
<nav id="filters" aria-label="필터">
  <button data-filter="all">전체</button>
  <button data-filter="active">진행 중</button>
  <button data-filter="done">완료</button>
</nav>
<select id="sort" aria-label="정렬">
  <option value="manual">추가한 순서</option>
  <option value="due">마감일 빠른 순</option>
  <option value="text">가나다순</option>
</select>
<p id="empty" hidden></p>
<ul id="list" aria-label="할 일 목록"></ul>
<p id="count" role="status" aria-live="polite"></p>
<button id="export">CSV 내보내기</button>
<textarea id="out" readonly hidden aria-label="내보낸 CSV"></textarea>
<p id="tsum"></p>
<script>
'use strict';
const $ = id => document.getElementById(id);
const KEY = 'todo-app:v1';
const FILTERS = { all: () => true, active: t => !t.done, done: t => t.done };
const SORTS = {   // 복사본을 정렬한다. state.todos 자체의 순서는 건드리지 않는다
  manual: list => list,
  due: list => [...list].sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')),
  text: list => [...list].sort((a, b) => a.text.localeCompare(b.text, 'ko')),
};

// ── 순수 함수: DOM·저장소·시계를 모른다 ──
const pad = n => String(n).padStart(2, '0');
const todayStr = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const addTodo = (todos, text, due, id) => text.trim() ? [...todos, { id, text: text.trim(), done: false, due }] : todos;
const toggleTodo = (todos, id) => todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
const removeTodo = (todos, id) => todos.filter(t => t.id !== id);
const visibleTodos = (todos, filter) => todos.filter(FILTERS[filter]);
const remaining = todos => todos.filter(FILTERS.active).length;
// 읽은 데이터를 현재 모양으로 맞춘다. 옛 데이터(due 없음)도 여기서 자연스럽게 이주된다
const clean = t => t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.done === 'boolean'
  ? { id: t.id, text: t.text, done: t.done, due: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t.due) ? t.due : '' } : null;
const parse = raw => { try { const d = JSON.parse(raw); return Array.isArray(d.todos) ? d.todos.map(clean).filter(Boolean) : null; } catch (e) { return null; } };
const cell = v => '"' + (/^[-=+@\\t\\r]/.test(v) ? "'" : '') + String(v).replace(/"/g, '""') + '"';   // 따옴표 이스케이프 + 수식 방어(탭·CR 시작도)
const BOM = String.fromCharCode(0xFEFF);   // 엑셀이 UTF-8로 읽게 하는 표식
const toCsv = todos => BOM + ['할 일,완료,마감일', ...todos.map(t => [cell(t.text), t.done ? 'Y' : 'N', t.due].join(','))].join('\\r\\n');

// ── 저장소: 막히거나 깨져도 앱은 산다 ──
let store = null;
try { store = window.localStorage; store.setItem('__probe', '1'); store.removeItem('__probe'); }
catch (e) { store = null; }
function put(key, value) {
  if (!store) return false;
  try { store.setItem(key, value); return true; } catch (e) { return false; }
}
function load() {
  const seed = [{ id: 'a1', text: '할 일 앱 완성하기', done: false, due: '' }];
  if (!store) return { todos: seed, msg: '이 실행창은 저장이 막혀 있어요. 새로고침하면 사라집니다.' };
  const raw = store.getItem(KEY);
  if (raw === null) return { todos: seed, msg: '' };
  const todos = parse(raw);
  if (todos) return { todos, msg: '' };
  put(KEY + ':broken', raw);
  return { todos: [], msg: '저장된 데이터를 읽지 못해 새로 시작합니다. 원본은 ' + KEY + ':broken 에 백업했어요.' };
}
const loaded = load();
const state = { todos: loaded.todos, filter: 'all', sort: 'manual' };
$('notice').textContent = loaded.msg;
const visible = () => SORTS[state.sort](visibleTodos(state.todos, state.filter));

// ── 화면: state를 읽어 통째로 그린다 ──
function makeItem(todo, today) {
  const li = document.createElement('li');
  li.dataset.id = todo.id;
  li.className = todo.done ? 'done' : '';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = todo.done;
  box.dataset.act = 'toggle';
  const text = document.createElement('span');
  text.textContent = todo.text + (todo.due ? ' (~' + todo.due + ')' : '');
  const label = document.createElement('label');
  if (todo.due && todo.due < today && !todo.done) label.className = 'late';   // 마감 지남: 문자열 비교로 충분하다
  label.append(box, text);
  const del = document.createElement('button');
  del.textContent = '삭제';
  del.dataset.act = 'del';
  del.setAttribute('aria-label', '"' + todo.text + '" 삭제');
  li.append(label, del);
  return li;
}
function render() {
  const shown = visible(), today = todayStr();
  $('list').replaceChildren(...shown.map(t => makeItem(t, today)));
  $('empty').hidden = shown.length > 0;
  $('empty').textContent = state.todos.length ? '이 필터에 맞는 항목이 없어요.' : '아직 할 일이 없어요. 위에 하나 적어 보세요.';
  $('count').textContent = '남은 할 일 ' + remaining(state.todos) + '개 / 전체 ' + state.todos.length + '개';
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === state.filter)));
}
function commit() {
  const ok = put(KEY, JSON.stringify({ v: 2, todos: state.todos }));   // v2: due 추가. clean()이 v1도 읽는다
  $('notice').textContent = ok ? '' : '저장하지 못했어요. 새로고침하면 사라질 수 있습니다.';
  render();
}
function focusItem(id, act) {
  const li = [...$('list').children].find(x => x.dataset.id === id);
  const target = li && li.querySelector('[data-act="' + act + '"]');
  (target || $('text')).focus();
}

// ── 이벤트 ──
$('list').addEventListener('click', e => {
  const el = e.target.closest('[data-act]'), li = el && el.closest('li');
  if (!li) return;
  const id = li.dataset.id;
  if (el.dataset.act === 'toggle') { state.todos = toggleTodo(state.todos, id); commit(); focusItem(id, 'toggle'); }
  if (el.dataset.act === 'del') {
    const v = visible(), i = v.findIndex(t => t.id === id), next = v[i + 1] || v[i - 1];
    state.todos = removeTodo(state.todos, id); commit();
    if (next) focusItem(next.id, 'del'); else $('text').focus();
  }
});
$('filters').addEventListener('click', e => {
  const b = e.target.closest('[data-filter]');
  if (b) { state.filter = b.dataset.filter; render(); }
});
$('sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
$('form').addEventListener('submit', e => {
  e.preventDefault();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const next = addTodo(state.todos, $('text').value, $('due').value, id);
  if (next !== state.todos) { state.todos = next; state.filter = 'all'; commit(); }
  $('text').value = '';
  $('due').value = '';
  $('text').focus();
});
$('export').addEventListener('click', () => {
  const csv = toCsv(state.todos), a = document.createElement('a');
  $('out').hidden = false;
  $('out').value = csv;                    // 다운로드가 막힌 환경(이 실행창)에서도 복사할 수 있게
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'todos.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
render();

// ── 콘솔 assert 테스트 ──
const fails = [];
let total = 0;
function check(name, fn) {
  let ok = false;
  try { ok = fn() === true; } catch (e) { ok = false; }
  console.assert(ok, name);
  total++;
  if (!ok) fails.push(name);
}
const T = Object.freeze([Object.freeze({ id: 'a', text: 'x', done: false, due: '' })]);
check('addTodo는 공백 입력을 거부한다', () => addTodo(T, '   ', '', 'b') === T);
check('addTodo는 원본을 바꾸지 않는다', () => addTodo(T, ' y ', '2026-01-02', 'b')[1].due === '2026-01-02' && T.length === 1);
check('toggleTodo는 원본을 바꾸지 않는다', () => toggleTodo(T, 'a')[0].done === true && T[0].done === false);
check('parse는 깨진 JSON에 null, 옛 데이터는 due를 채운다', () => parse('{oops') === null && parse('{"todos":[{"id":"a","text":"x","done":false}]}')[0].due === '');
check('todayStr은 UTC가 아닌 로컬 날짜다', () => todayStr(new Date(2026, 0, 5, 0, 30)) === '2026-01-05');
check('마감일순은 마감일 없는 항목을 뒤로 보낸다', () => SORTS.due([{ due: '' }, { due: '2026-01-02' }])[0].due === '2026-01-02');
check('CSV는 BOM과 따옴표 이스케이프를 지킨다', () => {
  const csv = toCsv([{ text: 'a"b', done: true, due: '' }]);
  return csv.startsWith(BOM) && csv.includes('"a""b",Y,');
});
check('CSV는 수식으로 읽힐 글자를 막는다', () => toCsv([{ text: '=1+1', done: false, due: '' }]).includes("'=1+1"));
check('CSV는 탭으로 시작하는 칸도 막는다', () => toCsv([{ text: '\\tx', done: false, due: '' }]).includes("'\\tx"));
$('tsum').textContent = fails.length ? '테스트 실패: ' + fails.join(' / ') : '테스트 ' + total + '개 모두 통과';
</script>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `저장 형식을 바꿀 때는 읽는 쪽에서 모양을 맞추고(clean) 버전 번호를 올린다: 이미 저장된 고객 데이터를 깨지 않는다`,
        `오늘 날짜는 getFullYear·getMonth·getDate로 현지 기준, yyyy-mm-dd 문자열은 문자열 그대로 비교한다`,
        `sort는 원본을 바꾼다: 복사본을 정렬하고 정렬은 화면 계산에만 둔다`,
        `CSV는 따옴표 이스케이프, 한국어 엑셀을 위한 UTF-8 BOM, 수식 시작 글자 방어 세 가지를 지킨다`,
        `고객 요구는 질문 → 결정 → 견적(버퍼 포함) → README로 바꿔 납품한다`
      ],
      pitfalls: [
        `오늘 날짜를 toISOString().slice(0, 10)으로 만든다. 한국에서 00:00~09:00에 전날이 되어 마감 지남 표시가 어긋난다.`,
        `state.todos.sort(...)를 그대로 호출한다. 원본 순서가 영구히 바뀌고 저장까지 된다.`,
        `CSV를 단순 join으로 만든다. 항목 글자에 쉼표가 있으면 열이 밀리고, BOM이 없으면 엑셀에서 한글이 깨진다.`,
        `저장 형식을 바꾸면서 옛 데이터 읽기를 시험하지 않는다. 업데이트 뒤 고객의 기존 데이터가 모두 사라진 것처럼 보인다.`
      ]
    }
  ],
  labs: [
    {
      title: `장보기 수량 앱: 코드를 보지 않고 처음부터 (1~3단계 마일스톤)`,
      scenario: `친구가 부모님 가게의 장보기 메모를 폰에서 쓸 간단한 페이지를 부탁했습니다. 이 모듈의 코드를 열어 보지 않고 빈 파일에서 시작해 품목 이름과 수량을 가진 목록을 만듭니다. 품목마다 + 와 − 버튼으로 수량을 바꾸고, 수량이 0이 되면 그 품목이 사라집니다. 같은 품목을 다시 넣으면 새 줄이 아니라 수량이 늘어야 합니다. 저장은 아직 필요 없습니다. 목표는 state → render, 이벤트 위임, commit 구조를 기억만으로 다시 짜는 것입니다.`,
      steps: [
        `새 HTML 파일을 만들고 state를 ‹{ items: [{ id, name, qty }] }› 형태로 정의한다. 화면에 필요한 모든 정보가 이 객체에서 나오는지 종이에 적어 확인한다.`,
        `render()를 쓴다. state만 읽어 목록을 그리고, 글자는 textContent로만 넣는다. render를 연달아 5번 불러도 항목 수가 같아야 한다.`,
        `ul에 클릭 리스너를 한 번만 달고 data-act(inc/dec)와 data-id로 분기한다. closest로 찾고 못 찾으면 바로 빠져나온다.`,
        `입력 form으로 품목을 추가한다. 이름을 trim하고, 빈 이름은 거부하고, 앞뒤 공백·대소문자만 다른 같은 이름이면 새 항목 대신 수량을 1 올린다.`,
        `dec로 수량이 0이 되면 항목을 지운다. 모든 변경은 commit() 하나를 지나게 한다.`,
        `총 품목 N개 / 총 수량 M개를 render 안에서 계산해 보여 준다. 변수에 따로 저장하지 않는다.`,
        `이름에 ‹<img src=x onerror=alert(1)>›을 넣어 글자 그대로 보이는지, 개발자 도구 콘솔에 오류가 없는지 확인한다.`,
        `완성한 뒤에 이 모듈 1~3단계 코드와 비교해 구조 차이를 세 줄로 적는다.`
      ],
      accept: [
        `우유와 ‹ 우유 ›를 연달아 추가하면 항목은 1개이고 수량이 2가 된다.`,
        `수량 3인 항목에서 −를 세 번 누르면 목록에서 사라지고 총 품목 수가 1 줄어든다.`,
        `‹<img ...>› 입력이 글자 그대로 보이고 콘솔 오류가 0개다.`,
        `Ctrl+F로 코드를 검색했을 때 목록에 거는 addEventListener 클릭 리스너가 정확히 1개이고, 총 개수를 저장하는 별도 변수가 없다.`,
        `콘솔에서 render()를 5번 연달아 불러도 화면이 같다.`
      ],
      stretch: `수량 칸을 직접 입력할 수 있게 하고 음수·소수·빈칸·1000 초과는 거부하세요. 이어서 마지막 삭제를 되돌리는 실행 취소 한 단계를 만들고, 이 모듈 7단계처럼 순수 함수 3개를 뽑아 console.assert 테스트를 붙여 보세요.`
    },
    {
      title: `북마크 보관함: 저장·접근성·테스트까지 (4~7단계 마일스톤)`,
      scenario: `개발 블로그를 운영하는 지인이 읽을 글의 링크를 모아 두는 페이지를 원합니다. 항목은 제목, 주소, 태그이고 태그별로 걸러 볼 수 있어야 합니다. 저장은 localStorage를 쓰되 저장소가 막혔거나 값이 깨져도 앱이 죽으면 안 됩니다. 마우스 없이 키보드만으로 쓸 수 있어야 하고, 핵심 로직에는 테스트가 있어야 합니다. 이번 실습의 핵심은 저장소를 인자로 받는 구조로 만들어, 실제 브라우저가 없어도 가짜 저장소로 실패 상황을 재현해 테스트하는 것입니다.`,
      steps: [
        `순수 함수부터 쓴다: ‹addLink(links, title, url, tag, id)›, ‹removeLink›, ‹byTag(links, tag)›, ‹parseLinks(raw)›. DOM을 전혀 쓰지 않는다.`,
        `주소 검증을 만든다. ‹new URL(값)›으로 해석되고 프로토콜이 http나 https일 때만 허용한다. javascript: 주소는 거부한다(링크로 렌더링할 때 스크립트 주입 통로가 된다).`,
        `‹loadLinks(store)›와 ‹saveLinks(store, links)›가 저장소를 인자로 받게 한다. getItem·setItem만 가진 가짜 저장소 3종(정상, setItem이 예외를 던짐, 손상된 JSON을 돌려줌)을 만들어 테스트한다.`,
        `check 함수로 console.assert 테스트를 10개 이상 쓰고, 통과 개수나 실패 이름을 화면에 요약한다.`,
        `UI를 붙인다: a 링크와 삭제 버튼, 태그 필터(aria-pressed), 이벤트 위임, 삭제 뒤 이웃 항목으로의 포커스 복원, 개수 live region.`,
        `마우스를 치우고 추가 → 필터 → 삭제를 키보드만으로 해 보며 첫 항목까지 필요한 Tab 횟수를 기록한다.`,
        `코드를 일부러 두 군데 망가뜨려(예: trim 제거, 프로토콜 검사 제거) 테스트가 실패하는지 캡처한다. 그런 뒤 되돌린다.`
      ],
      accept: [
        `가짜 저장소 3종 모두에서 load와 save가 예외 없이 끝나고, 손상 JSON이면 원본이 백업 키에 남는다.`,
        `테스트가 10개 이상 통과하고, 의도적으로 넣은 결함 2개 이상에서 실패 이름이 화면에 보인다.`,
        `javascript:alert(1) 주소는 저장되지 않고, http와 https 주소만 저장된다.`,
        `마우스 없이 추가·필터·삭제가 가능하고, 삭제 직후 포커스 윤곽선이 다음 항목에 있다.`
      ],
      stretch: `다른 탭의 변경을 storage 이벤트로 반영해 두 탭이 어긋나지 않게 하거나, JSON 내보내기·가져오기를 만들되 가져올 때 parseLinks와 같은 검증을 거치게 하세요.`
    },
    {
      title: `카페 개점·마감 체크리스트 납품 (고객 요청형 미니 프로젝트)`,
      scenario: `가상 의뢰입니다. 동네 카페 사장님이 말합니다. "개점과 마감 체크리스트를 알바생이 매일 폰으로 체크해요. 항목 목록은 그대로 두고 매일 아침 체크만 전부 초기화되면 좋겠어요. 누가 몇 시에 체크했는지(시각)도 보이면 좋고요. 월말에 제가 엑셀로 보고 싶어요. 가게 와이파이가 약하고 앱 설치는 싫어요." 이 모듈 8단계의 앱을 개조해 요구를 질문·범위·구현·문서로 바꿔 납품하는 연습입니다. 코드뿐 아니라 무엇을 묻고 무엇을 빼는지가 평가 대상입니다.`,
      steps: [
        `요구사항 질문 8개를 쓴다(기기 몇 대인가, 여러 명이 같은 목록을 보는가, 데이터를 얼마나 오래 보관하는가, 사진이 필요한가 등). 각 질문 옆에 답에 따라 달라지는 범위를 한 줄씩 적는다.`,
        `한 장짜리 범위서를 쓴다. 포함·제외·가정을 나누고 기기 간 동기화와 로그인은 제외 항목에 둔다.`,
        `8단계 코드를 복사해 개조한다: 항목에 구역(오픈·마감)을 추가하고, 체크할 때 현지 시각 HH:MM을 기록하며, 오늘 초기화 버튼(항목은 유지하고 체크와 시각만 비움)을 만든다. 초기화는 confirm 대신 되돌리기 한 번을 제공한다.`,
        `저장 형식을 v3로 올리고, v2 데이터를 읽어도 깨지지 않게 clean을 고친다. v2 샘플 데이터를 읽는 마이그레이션 테스트를 쓴다.`,
        `CSV에 구역·체크 시각 열을 더한다. BOM·따옴표 이스케이프·수식 방어는 유지하고 테스트를 추가한다.`,
        `폰 화면(개발자 도구의 360px 폭 에뮬레이션)에서 가로 스크롤이 없는지, 버튼 크기가 WCAG 2.2의 최소 기준 2.5.8(24×24 CSS px, AA)을 넘고 가능하면 향상 기준 2.5.5의 44×44 CSS px에 가까운지 개발자 도구로 재서 적는다(2026-11 기준).`,
        `README를 한 장 쓴다: 여는 법, 데이터가 저장되는 곳과 한계(브라우저·기기별 저장, 사이트 데이터를 지우면 손실), 월말 백업 절차, 테스트 보는 법, 알려진 한계.`,
        `견적서를 한 장 쓴다: 작업별 시간(추정), 버퍼, 제외 범위, 범위 밖 요청은 별도 견적이라는 변경 규칙.`
      ],
      accept: [
        `새로고침과 브라우저 재시작 뒤에도 체크 상태와 시각이 유지된다.`,
        `v2 형식 데이터를 localStorage에 넣고 열어도 모든 항목이 보이고 구역 기본값이 채워지며, 이를 확인하는 테스트가 통과한다.`,
        `오늘 초기화 뒤 항목 수는 그대로이고 체크·시각이 모두 비며, 되돌리기로 이전 상태가 복구된다.`,
        `쉼표와 큰따옴표가 든 항목이 있는 CSV를 엑셀(또는 LibreOffice)로 열었을 때 한글이 깨지지 않고 열이 밀리지 않는다.`,
        `README에 한계가 3개 이상 적혀 있고, 견적서에 시간 합계·버퍼·제외 범위가 모두 있다.`
      ],
      stretch: `서버 없이 기기 간 이전하는 길을 만드세요. JSON 내보내기와 가져오기(검증 포함), 그리고 이 기기에만 저장됩니다라는 상시 안내입니다. 또는 서버 저장으로 바꾸는 별도 견적서(추가 작업 목록과 위험)를 풀스택 모듈을 참고해 써 보세요.`
    }
  ],
  quiz: [
    {
      q: `할 일 앱의 render가 아래와 같다. 항목을 하나 추가하고 render()를 부르면 화면이 [우유, 빵, 우유, 빵, 달걀]처럼 이전 항목이 되풀이된다.

function render() {
  state.todos.forEach(t => {
    const li = document.createElement('li');
    li.textContent = t.text;
    list.append(li);
  });
}

원인과 가장 알맞은 수정은?`,
      choices: [
        `state.todos에 같은 항목이 중복 저장된 것이므로 추가 전에 includes로 중복을 검사한다`,
        `render가 이전 DOM을 비우지 않고 이어 붙이는 것이 원인이다. 만든 항목들을 replaceChildren으로 통째로 교체해 몇 번 불러도 같은 화면이 나오게 한다`,
        `forEach가 비동기로 도는 것이 원인이므로 for 문으로 바꾸고 setTimeout으로 감싼다`,
        `li에 id를 지정하면 브라우저가 중복 노드를 걸러 주므로 li.id를 붙인다`
      ],
      answer: 1,
      why: `state는 정상(기존 2개 + 새 항목 1개 = 3개)입니다. render가 append만 해서 이미 그려진 항목 뒤에 전체를 또 붙인 것이 원인이고, 화면이 state의 함수가 되려면 render는 몇 번 불러도 같은 결과(멱등)여야 하므로 replaceChildren으로 교체합니다. includes로 중복을 검사하자는 0번은 멀쩡한 state를 고치는 것으로, 증상 한 줄만 보고 원인을 데이터로 오해할 때 가장 그럴듯하게 나오는 오답입니다.`
    },
    {
      q: `항목 구조와 위임 리스너가 아래와 같다.

<li data-id="a1"><input type="checkbox" data-act="toggle"> <span>우유</span></li>

list.addEventListener('click', e => {
  const id = e.target.dataset.id;
  toggle(id);
});

체크박스를 눌러도 항목이 바뀌지 않는다. toggle에 넘어가는 id가 비어 있기 때문이다. 가장 알맞은 수정은?`,
      choices: [
        `const id = e.target.closest('li').dataset.id; 처럼 클릭된 요소에서 위로 올라가 항목을 찾는다`,
        `input, span, button 같은 모든 자식 요소에 data-id를 복사해 넣는다`,
        `e.currentTarget.dataset.id 로 바꾼다`,
        `리스너를 위임하지 말고 render 안에서 각 input에 따로 단다`
      ],
      answer: 0,
      why: `e.target은 실제로 눌린 가장 안쪽 요소(input)이고 data-id는 바깥의 li에 있으므로, closest로 위로 올라가 찾아야 합니다. 모든 자식에 data-id를 복사하는 1번은 일단 동작하지만 같은 값을 여러 곳에 두는 중복이라 렌더링 코드가 늘고 불일치 위험이 생기는 우회입니다. currentTarget은 리스너가 붙은 ul이므로 id가 없습니다.`
    },
    {
      q: `저장 데이터와 코드가 아래와 같다.

// 저장된 데이터
state.todos = [{ id: 1, text: '우유', done: false }];

// render
li.dataset.id = todo.id;

// 클릭 핸들러
const id = li.dataset.id;
const todo = state.todos.find(t => t.id === id);
if (todo) todo.done = !todo.done;
commit();

체크박스를 눌러도 아무 변화가 없고 오류도 나지 않는다. 가장 알맞은 설명은?`,
      choices: [
        `commit이 render보다 먼저 불려 화면이 갱신되지 않는다`,
        `find는 첫 항목만 검사하므로 id가 1인 항목은 찾을 수 없다`,
        `dataset 값은 항상 문자열이라 숫자 1과 문자열 "1"은 엄격 비교에서 다르다. find가 아무것도 찾지 못해 if가 조용히 건너뛴다. id를 처음부터 문자열로 쓰거나 비교 전에 변환해야 한다`,
        `checked 속성은 읽기 전용이라 done을 바꿔도 반영되지 않는다`
      ],
      answer: 2,
      why: `dataset은 숫자를 문자열로 바꿔 보관하므로 t.id === id가 거짓이 되고, find 결과가 비어 if 안이 실행되지 않으니 에러도 변화도 없습니다. commit 순서 문제(0번)는 증상이 다릅니다. 순서가 틀렸다면 한 번 늦게라도 화면이 바뀌었을 것이고, 여기서는 state 자체가 안 바뀝니다.`
    },
    {
      q: `고객이 앱이 흰 화면이고 껐다 켜도 안 된다고 연락했다. 콘솔에는 이 오류가 있다.

Uncaught SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)
    at JSON.parse (<anonymous>)
    at load (app.js:12)

app.js 12번째 줄: const todos = JSON.parse(localStorage.getItem('todos')).todos;

가장 알맞은 근본 대응은?`,
      choices: [
        `고객에게 브라우저의 사이트 데이터를 지우라고 안내하고 끝낸다`,
        `JSON.parse 대신 eval로 읽어 모양이 조금 깨진 값도 받아들인다`,
        `setItem을 두 번 호출해 저장 실패를 줄인다`,
        `읽기를 try/catch로 감싸고 모양을 검증한 뒤, 실패하면 원본을 백업 키에 복사하고 빈 상태나 기본값으로 시작하며 화면에 안내를 보여 준다`
      ],
      answer: 3,
      why: `저장된 값이 손상돼 있고 파싱 예외가 앱 시작을 막으며, 값은 그대로 남아 있으니 새로고침해도 영원히 반복되는 장애입니다. 앱이 외부 입력(저장소)을 검증하고 실패해도 살아남아야 합니다. 사이트 데이터 삭제(0번)는 그 순간 증상은 없애지만 고객 데이터가 사라지고 원인 분석도 못 하며 같은 일이 재발합니다. eval은 보안 구멍입니다.`
    },
    {
      q: `고객 사이트의 iframe(sandbox 속성 있음) 안에 우리 할 일 앱을 넣었더니 앱이 전혀 뜨지 않고 콘솔에 이렇게 나온다.

Uncaught SecurityError: Failed to read the 'localStorage' property from 'Window': The document is sandboxed and lacks the 'allow-same-origin' flag.

우리 코드의 첫 줄은 const raw = localStorage.getItem('todo-app:v1'); 이다. 가장 알맞은 대응은?`,
      choices: [
        `고객에게 sandbox 속성을 제거해 달라고 요구한다`,
        `localStorage 접근과 시험 쓰기를 try/catch로 감싸 저장소를 쓸 수 없으면 메모리만으로 동작하게 하고, 저장되지 않는다는 안내를 화면에 띄운다`,
        `localStorage 대신 sessionStorage를 쓴다`,
        `오류를 삼키는 빈 catch만 추가하고 안내는 하지 않는다`
      ],
      answer: 1,
      why: `접근 자체가 막힌 환경에서도 앱이 살아 있도록 앱 쪽에서 방어하고 사용자에게 알려야 합니다. sessionStorage(2번)도 같은 sandbox에서 같은 SecurityError로 막힙니다(이 환경에서 확인). 고객에게 속성 제거를 요구(0번)하는 것은 우리가 통제할 수 없는 쪽에 기대는 것이고, 빈 catch(3번)는 저장이 안 되는 걸 사용자가 데이터가 사라진 뒤에야 알게 하는 조용한 실패입니다.`
    },
    {
      q: `필터 버튼 핸들러가 아래와 같다.

function setFilter(name) {
  state.todos = state.todos.filter(FILTERS[name]);
  render();
}

완료를 눌렀다가 전체를 눌렀더니 완료하지 않은 항목이 모두 사라졌다. 무엇이 잘못됐고 어떻게 고치나?`,
      choices: [
        `필터 결과로 원본 state를 덮어써 숨겨진 항목이 영구히 사라졌다. state.filter에 이름만 저장하고 render에서 state.todos.filter(FILTERS[state.filter])로 보일 목록을 계산한다`,
        `FILTERS 객체의 키가 영어라서 한글 버튼과 맞지 않는다`,
        `render를 두 번 불러야 필터가 적용되므로 render를 한 번 더 부른다`,
        `filter 대신 splice를 쓰면 원본이 유지된다`
      ],
      answer: 0,
      why: `filter 결과는 새 배열이고 그것을 state.todos에 대입하면 숨겨진 항목은 어디에도 남지 않습니다. 필터는 화면에 무엇을 보일지의 계산이지 데이터의 삭제가 아닙니다. splice(3번)는 오히려 원본을 직접 바꾸는 쪽이라 더 위험합니다.`
    },
    {
      q: `접근성 점검에서 아래 마크업에 대해 키보드로 삭제할 수 없고 스크린리더가 버튼으로 읽지 않는다는 지적을 받았다.

<ul id="list">
  <li><span>우유 사기</span> <div class="btn" onclick="removeTodo('a1')">삭제</div></li>
</ul>

가장 알맞은 수정은?`,
      choices: [
        `div에 tabindex="0"만 추가한다`,
        `div에 aria-hidden="true"를 붙여 스크린리더에서 숨긴다`,
        `button type="button" data-act="del" aria-label="우유 사기 삭제"로 바꾸고, 클릭은 목록에 위임한 리스너가 처리하게 한다`,
        `마우스를 올리면 커서를 손가락 모양으로 바꾼다`
      ],
      answer: 2,
      why: `기본 button은 Tab 포커스, Enter·Space 동작, 버튼 역할 안내를 한꺼번에 줍니다. tabindex만 더하는 0번은 포커스는 받지만 onclick은 마우스 클릭에만 반응하므로 Enter·Space로는 여전히 삭제되지 않아 가장 그럴듯한 미완성 수정입니다. aria-hidden은 요소를 보조기술에서 지워 문제를 오히려 키웁니다.`
    },
    {
      q: `삭제 함수가 아래와 같다.

function remove(id) {
  state.todos = state.todos.filter(t => t.id !== id);
  render();
}

키보드 사용자가 항목의 삭제 버튼에서 Enter를 누르면 방금 있던 자리의 포커스가 사라지고(활성 요소가 body가 된다), 다시 Tab을 누르면 목록의 첫 항목부터 시작한다. 원인과 해결로 가장 알맞은 것은?`,
      choices: [
        `render를 setTimeout으로 늦춘다`,
        `삭제 버튼에 autofocus를 붙인다`,
        `tabindex를 3 이상의 양수로 지정해 순서를 고정한다`,
        `render가 목록의 노드를 새로 갈아 끼워 포커스를 가졌던 노드가 사라지기 때문이다. 삭제 전에 이웃 항목을 정해 두고, render 뒤에 그 항목의 삭제 버튼(없으면 입력창)에 focus()를 부른다`
      ],
      answer: 3,
      why: `포커스를 가진 노드가 DOM에서 빠지면 포커스는 body로 돌아갑니다. 통째로 다시 그리는 설계에서는 그린 뒤에 포커스를 직접 돌려놓아야 합니다. 타이밍을 늦추는 0번은 노드가 사라지는 사실을 바꾸지 못합니다. autofocus는 문서에서 처음 한 번만 처리되는 속성이라 삭제할 때마다 포커스를 옮겨 주지 못하고, 양수 tabindex는 오히려 탭 순서를 망가뜨려 권장되지 않습니다.`
    },
    {
      q: `테스트 화면과 콘솔에 이렇게 나온다.

Assertion failed: toggleTodo는 원본을 바꾸지 않는다
테스트 실패: toggleTodo는 원본을 바꾸지 않는다

const toggleTodo = (todos, id) => {
  const t = todos.find(x => x.id === id);
  t.done = !t.done;
  return todos;
};

테스트는 얼린(Object.freeze) 배열을 넣고 원본의 done이 그대로인지 확인한다. 원인과 수정은?`,
      choices: [
        `함수가 입력 객체의 done을 직접 고치고 같은 배열을 돌려줘 순수하지 않다. todos.map(t => t.id === id ? { ...t, done: !t.done } : t)처럼 복사본을 만들어 돌려준다`,
        `console.assert는 예외를 던지므로 try/catch를 지운다`,
        `find 대신 filter를 쓰면 원본이 보호된다`,
        `얼린 배열을 테스트에 쓰는 것이 잘못이므로 얼리지 않고 비교한다`
      ],
      answer: 0,
      why: `함수가 입력을 직접 바꾸고 있고 테스트가 그것을 정확히 잡아낸 것이므로 고칠 곳은 함수입니다. 테스트를 약하게 만드는 3번은 가장 그럴듯한 유혹이지만 실패의 원인을 가리고 같은 버그를 다음에 놓치게 합니다. console.assert는 예외를 던지지 않습니다(MDN). 그래서 이 모듈의 check가 try/catch와 요약 한 줄을 더해 실패를 놓치지 않게 합니다.`
    },
    {
      q: `고객이 말한다. 직원 5명이 각자 폰에서 같은 할 일 목록을 같이 보고, 서로 체크한 것이 바로 보이면 좋겠어요. 지금 가진 것은 localStorage를 쓰는 단일 HTML 앱이고, 첫 견적은 그 기준으로 이미 냈다. 가장 알맞은 대응은?`,
      choices: [
        `storage 이벤트를 쓰면 되므로 코드 몇 줄 추가로 해결된다고 답한다`,
        `같은 HTML 파일을 5명에게 보내면 목록도 공유된다고 설명한다`,
        `localStorage는 브라우저·기기별 저장이라 공유가 안 된다고 설명하고, 서버·로그인·동기화가 필요한 별도 범위로 보고 새 견적이나 단계 분리를 제안한다`,
        `5명이 한 PC의 같은 브라우저를 번갈아 쓰게 하자고 제안한다`
      ],
      answer: 2,
      why: `저장 위치가 각자의 브라우저라 기기 간 공유는 구조적으로 불가능하고, 서버와 로그인이 들어오면 범위와 견적이 달라지므로 요구를 재협상해야 합니다. storage 이벤트(0번)는 같은 브라우저·같은 출처의 다른 탭에만 알려 주는 기능이라(MDN) 기기 간 동기화가 아닙니다. 가장 흔한 오해이고, 안이하게 답하면 납품 단계에서 책임 문제가 됩니다.`
    },
    {
      q: `마감 지남 표시 코드가 아래와 같다.

const today = new Date().toISOString().slice(0, 10);
const late = todo.due && todo.due < today && !todo.done;

한국(UTC+9)의 고객이 어제 마감인 항목이 매일 오전 9시가 지나야 빨갛게 바뀐다고 한다. 이 환경에서 현지 시각 01:00에 toISOString의 날짜가 전날로 나오는 것을 확인했다. 원인과 수정은?`,
      choices: [
        `문자열 비교가 틀렸으므로 due를 new Date(due)로 바꿔 시각까지 비교한다`,
        `slice(0, 10)이 날짜를 잘못 자르므로 slice(0, 11)로 바꾼다`,
        `브라우저가 날짜를 캐시하므로 매번 새로고침하라고 안내한다`,
        `toISOString은 UTC 날짜를 주므로 한국의 00:00~09:00에는 전날 날짜가 나온다. getFullYear·getMonth()+1·getDate로 현지 날짜 문자열을 직접 만들어 비교한다`
      ],
      answer: 3,
      why: `이 형식(yyyy-mm-dd)은 문자열 비교가 날짜 순서와 같아서 비교 방식은 문제가 아니고, 오늘 날짜를 UTC 기준으로 만든 것이 원인입니다. new Date('2026-11-11')로 바꾸는 0번은 날짜만 있는 문자열을 UTC 자정으로 해석하기 때문에 현지 시각과 다시 어긋나 가장 그럴듯하게 틀린 수정입니다.`
    },
    {
      q: `내보낸 파일을 한국어 엑셀에서 열었더니 한글이 깨지고 둘째 줄이 네 칸으로 나뉜다.

할 일,완료,마감일
우유, 빵 사기,N,2026-11-20

이 파일의 문제와 수정으로 가장 알맞은 것은?`,
      choices: [
        `확장자를 .txt로 바꿔 저장한다`,
        `쉼표가 든 칸을 큰따옴표로 감싸고(안의 큰따옴표는 두 개로 쓴다), 파일 맨 앞에 UTF-8 BOM을 붙인다`,
        `구분자를 쉼표에서 탭으로만 바꾼다`,
        `한글을 모두 영문으로 바꾼다`
      ],
      answer: 1,
      why: `두 가지 결함이 겹쳐 있습니다. 우유, 빵 사기의 쉼표가 열 구분자로 읽혀 칸이 밀리는 문제는 큰따옴표 감싸기로, BOM 없는 UTF-8을 엑셀이 다른 인코딩으로 읽는 문제는 BOM으로 고칩니다. 구분자만 탭으로 바꾸는 2번은 칸 밀림은 피하지만 글자 깨짐은 그대로이고, 칸에 탭이 있으면 같은 문제가 재발하므로 반쪽짜리 처방입니다.`
    }
  ],
  refs: [
    { title: `MDN: Window.localStorage`, url: `https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage`, kind: `doc`, why: `문자열만 저장하는 출처별 저장소의 동작, 창을 닫아도 유지되는 성질, 정책이나 사용자 설정으로 접근이 막힐 때의 SecurityError, file: 주소에서는 동작이 브라우저마다 다를 수 있다는 점을 확인한다(4단계의 근거).` },
    { title: `MDN: Using the Web Storage API`, url: `https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API`, kind: `doc`, why: `저장소가 있어 보여도 못 쓰는 경우를 쓰기 시험으로 확인하는 방법, QuotaExceededError 처리, 다른 탭에서만 발생하는 storage 이벤트를 다룬다.` },
    { title: `MDN: Storage quotas and eviction criteria`, url: `https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria`, kind: `doc`, why: `localStorage 용량 한도(출처당 5MiB, 2026-11 기준)와 기본 저장소가 공간이 부족하면 브라우저에 의해 지워질 수 있다는 점(best-effort)이 백업 경로가 필요한 이유임을 보여 준다.` },
    { title: `MDN: Event bubbling (Learn web development)`, url: `https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling`, kind: `doc`, why: `버블링, target과 currentTarget의 차이, 이벤트 위임, stopPropagation을 예제로 설명한다(2단계의 근거).` },
    { title: `MDN: iframe element (sandbox attribute)`, url: `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe`, kind: `doc`, why: `sandbox 토큰의 효과를 확인한다. allow-modals가 없으면 alert·confirm·prompt가 막히고, allow-same-origin이 없으면 저장소 접근이 막힐 수 있고, allow-downloads가 없으면 다운로드가 막힌다. 이 실행창에서 삭제 확인·저장·CSV 내려받기가 안 되는 이유다.` },
    { title: `MDN: console.assert()`, url: `https://developer.mozilla.org/en-US/docs/Web/API/console/assert_static`, kind: `doc`, why: `조건이 참이면 아무 일도 없고 거짓이면 Assertion failed 메시지를 찍는다는 점, 예제에서 실패 뒤에도 반복이 계속되어 예외로 멈추지 않는다는 점을 확인한다(7단계 check 함수의 설계 근거).` },
    { title: `OWASP: CSV Injection`, url: `https://community.owasp.org/attacks/CSV_Injection`, kind: `article`, why: `내보낸 CSV를 스프레드시트가 열 때 수식으로 실행될 수 있는 시작 글자(=, +, -, @, 탭, CR 등)와 완화책(큰따옴표·작은따옴표 접두), 그리고 완벽한 방어는 없다는 한계를 확인한다(8단계 내보내기).` },
    { title: `MDN: HTMLElement.focus()`, url: `https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus`, kind: `doc`, why: `focus 호출과 preventScroll·focusVisible 옵션을 확인한다. 포커스를 받을 수 없을 때의 동작은 문서에 명시되어 있지 않으므로 대체 경로(입력창)를 두는 근거로 쓴다.` },
    { title: `MDN: ARIA live regions`, url: `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions`, kind: `doc`, why: `role=status를 포함한 live region 역할, 호환성을 위해 aria-live="polite"를 중복해서 적으라는 권고, 영역을 처음 마크업에 넣어 두는 것이 가장 확실하다는 점, assertive를 아껴 써야 하는 이유를 확인한다(6단계).` },
    { title: `MDN: label element`, url: `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/label`, kind: `doc`, why: `for와 id로 잇는 방식과 컨트롤을 감싸는 방식, 라벨을 누르면 포커스가 연결된 입력으로 가는 동작, 스크린리더 이름과 클릭 영역이 넓어지는 효과를 확인한다.` },
    { title: `W3C: Understanding Success Criterion 2.1.1 Keyboard (WCAG 2.2)`, url: `https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html`, kind: `standard`, why: `모든 기능을 키보드로 쓸 수 있어야 한다는 레벨 A 기준과 실패 사례(포인터 전용 핸들러, 포커스 제거 스크립트)를 확인한다.` },
    { title: `MDN: Node.textContent`, url: `https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent`, kind: `doc`, why: `textContent와 innerHTML의 차이, 텍스트를 다룰 때 innerHTML을 피하라는 이유(XSS에 취약할 수 있음), textContent를 설정하면 자식이 모두 교체되는 동작을 확인한다.` },
    { title: `MDN: Array.prototype.sort()`, url: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort`, kind: `doc`, why: `제자리 정렬(원본 변경), 비교 함수의 규칙, 안정 정렬 보장, 복사본을 정렬하는 방법을 확인한다(8단계 정렬).` },
    { title: `MDN: URL.createObjectURL()`, url: `https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static`, kind: `doc`, why: `Blob을 가리키는 주소를 만들고 다 쓰면 revokeObjectURL로 해제하는 방법을 확인한다(CSV 내려받기).` }
  ],
  gigs: [
    `이런 의뢰는 엑셀·종이·메신저로 하던 점검표·재고 메모·예약 확인표를 웹페이지로 옮겨 달라는 요청, 계산기와 설문 같은 단일 페이지 도구로 자주 나옵니다. 고객은 보통 한 사람이 한 기기에서 쓴다고 말하지만 실제로는 여러 명이 같이 보고 싶다는 요구가 숨어 있습니다. 견적 전에 같은 목록을 여러 사람이나 여러 기기에서 봐야 하는지 꼭 묻습니다. 그렇다면 localStorage로는 불가능하고(브라우저·기기별 저장) 서버와 로그인이 필요해 범위와 견적이 한 단계 이상 커집니다(풀스택 모듈).`,
    `데이터 책임을 문서로 남깁니다. localStorage는 사용자가 사이트 데이터를 지우거나 브라우저가 공간 정리를 하면 사라질 수 있습니다(MDN, 2026-11 기준 기본은 best-effort). 납품 문서에 이 사실과 월 1회 같은 백업 절차를 적고, 내보내기를 기본 범위에 넣을지 확인합니다. 분실 시 책임 범위를 범위서에 명시해 두면 나중에 분쟁이 줄어듭니다.`,
    `한국어 엑셀과의 호환은 사후 문의 1순위입니다. CSV는 UTF-8 BOM, 따옴표 이스케이프, 수식 시작 글자 방어를 지키고, 납품 전에 쉼표·따옴표가 든 항목으로 실제 엑셀에서 열어 본 화면을 증거로 남깁니다. 수식 방어는 완벽하지 않다는 OWASP의 지적과, 엑셀에 작은따옴표가 보인다는 점도 미리 알립니다.`,
    `지원 기기와 브라우저를 계약에 적습니다. 예를 들어 최신 크롬·엣지·사파리와 안드로이드 폰 1대처럼 구체적으로 정하고, 직접 확인한 조합만 보증한다고 씁니다. 폰의 앱 내 브라우저(메신저에서 링크를 연 경우)는 저장소 동작이 다를 수 있어 별도로 확인합니다.`,
    `견적은 기능별 시간(추정) 합에 버퍼를 더해 만듭니다. 8단계 표처럼 항목을 나눠 합산하고, 오차 기록으로 보정한 버퍼 30% 안팎을 더하며, 처음 하는 유형은 1.5배로 잡습니다. 마감일 하나, 정렬 하나처럼 작아 보이는 추가 요청도 데이터 형식 이주·테스트·README까지 영향을 주므로 시간 단위로 환산해 변경 요청으로 처리합니다. 가격은 시장·지역마다 달라 이 모듈은 숫자를 제시하지 않습니다.`,
    `납품물은 단일 HTML(또는 폴더), README(여는 법, 데이터 위치와 한계, 백업 절차), 테스트 실행 방법, 버전 표기입니다. 호스팅을 고객 계정에서 한다면 계정 권한 이전도 인수인계에 넣습니다. 테스트 코드는 고객 화면에 노출되지 않게 분리하거나 스위치 뒤에 둡니다.`,
    `접근성과 개인정보는 사전에 확인합니다. 공공기관·대기업 납품은 접근성 기준이 계약 조건일 수 있습니다. 이름·전화번호 같은 개인정보가 들어가면 localStorage 평문 저장이 부적절할 수 있어 서버 설계와 법적 검토가 필요합니다. 이 모듈은 법률 자문이 아니니 해당 사안은 전문가에게 확인하세요.`
  ]
};
