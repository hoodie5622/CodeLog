(window.PRO_MODULES = window.PRO_MODULES || {})["pj-debug-web"] = {
  id: "pj-debug-web",
  summary: `버그 재현부터 개발자 도구·스택 트레이스 읽기, JavaScript·CSS·이벤트 버그 진단, 이분 탐색, 회귀 테스트까지 갖춰 남이 만든 웹 코드의 고장을 스스로 찾아 고치고 고객에게 보고할 수 있다.`,
  hours: 24,
  goals: [
    `버그 신고를 재현 절차·기대 동작·실제 동작으로 정리하고, 입력·코드·변경 이력 중 하나를 절반씩 줄여 최소 재현 예제를 만들 수 있다.`,
    `브라우저 개발자 도구의 Console·Elements·Sources·Network 패널로 값 확인, 현재 DOM·CSS 확인, 중단점 실행 추적, 요청 상태 코드·응답 본문 확인을 상황에 맞게 골라 할 수 있다.`,
    `오류 이름·메시지·위치·스택 트레이스를 읽어 예외가 터진 줄과 잘못된 값이 만들어진 곳을 구분하고, 브라우저마다 메시지 문구가 다른 이유를 설명할 수 있다.`,
    `var 스코프·await 누락·문자열 숫자 변환·this 유실 같은 JavaScript 버그를 증상만 보고 의심한 뒤 짧은 실험으로 확정하고 고칠 수 있다.`,
    `명시도·박스 모델·넘치는 긴 문자열 때문에 깨진 레이아웃을 Styles·Computed·박스 모델 그림으로 원인까지 추적하고 !important 없이 고칠 수 있다.`,
    `중복 리스너·오래된 인덱스·누락된 render 호출처럼 이벤트와 상태가 어긋나는 버그를 불변식 검사와 Event Listeners 탭으로 찾을 수 있다.`,
    `모르는 코드를 진입점부터 데이터 흐름 순서로 읽고, git bisect 또는 중간값 출력으로 로그 시간 안에 원인 커밋·원인 단계를 찾을 수 있다.`,
    `수정마다 실패를 먼저 확인한 회귀 테스트와 입력 가드를 붙이고, 원인·수정·검증·영향 범위를 담은 고객용 보고서를 쓸 수 있다.`
  ],
  lessons: [
    {
      title: `디버깅의 심성 모델: 재현 → 범위 좁히기 → 가설 → 확인`,
      body: `디버깅을 "코드를 노려보다가 감으로 고치는 일"로 배우면 평생 운에 맡기게 됩니다. 이 모듈이 가르치는 방식은 반대입니다. 디버깅은 **작은 과학 실험**입니다. 현상을 관찰하고(재현), 의심 범위를 줄이고(범위 좁히기), 틀릴 수 있는 설명을 세우고(가설), 그 설명이 예측한 값을 직접 확인합니다(확인). 외주 현장에서는 남이 만든 코드가 갑자기 고장 났다는 의뢰가 흔해서, 코드를 얼마나 아느냐보다 얼마나 빨리 좁혀 가느냐가 곧 실력이 됩니다.

### 증상, 결함, 원인 경로를 구분한다
- 증상: 사람이 본 현상입니다. "항목이 11개일 때 마지막 페이지가 안 보여요."
- 결함: 코드에서 틀린 곳입니다. ‹Math.floor(total / size)›
- 원인 경로: 틀린 값이 어디서 만들어져 어디를 거쳐 증상이 됐는가입니다. 항목 11개 → 페이지 수 2 → 페이지 버튼 2개 → 3번째 페이지로 갈 수 없음.
고객은 증상으로 말하고 코드는 결함으로 말합니다. 디버깅은 증상에서 결함까지 이어진 줄을 거꾸로 따라가는 일이고, 줄이 길수록 중간중간 "여기까지는 정상"이라고 확정해 두는 지점이 필요합니다.

### 네 단계
1. **재현**: 같은 절차로 몇 번이든 다시 일으킬 수 있어야 합니다. 절차에는 환경(브라우저·버전·화면 폭), 데이터(어떤 항목이 몇 개), 순서(무엇을 먼저 눌렀나)를 적습니다. 재현이 안 되면 고치지 말고 정보를 더 모으세요. "가끔 발생"은 대개 조건을 아직 모르는 버그입니다.
2. **범위 좁히기**: 입력을 줄이고(항목 11개 → 1개), 코드를 줄이고(화면 전체 → 함수 하나), 시간을 줄입니다(어제 정상 → 오늘 비정상 사이의 변경). 줄이면서도 증상이 남는 가장 작은 예제가 **최소 재현**입니다.
3. **가설**: 반증할 수 있는 한 문장으로 씁니다. "pageCount가 나머지를 버려서 5의 배수가 아닐 때만 틀린다." 좋은 가설은 예측을 낳습니다. 이 가설이 맞다면 total=1일 때도 결과가 0이어야 합니다.
4. **확인**: 값을 찍거나 중단점을 걸어 예측이 맞는지 봅니다. 틀리면 가설을 버리고 다음 가설로 갑니다. 고친 뒤에는 처음 재현 절차를 다시 돌려 증상이 사라졌는지, 옆 기능이 안 깨졌는지 확인합니다.

### 아래 코드로 직접 본다
레슨 아래 코드는 먼저 버그 판과 고친 판을 한 표로 돌려 규칙을 찾게 합니다. 경계값(0, 1, 4, 5, 6, 10, 11, 12, 15)을 한꺼번에 넣으면 5의 배수에서만 맞는다는 규칙이 보입니다. 11개만 시험했다면 "11개가 이상하다"에서 멈췄겠지만, 표 하나로 "나머지가 있으면 틀린다"를 확정했습니다. 항목이 1~4개뿐인 가게에서는 목록 전체가 비어 보이는 더 큰 버그이기도 합니다.

### 디버깅 노트를 쓴다
머릿속 추리는 한 시간만 지나도 사라집니다. 다음 줄을 남기세요: 증상 / 재현 절차 / 기대 값과 실제 값 / 가설과 확인 결과 / 원인(한 줄) / 수정 / 검증 방법. 고객에게 보고할 때와 몇 달 뒤 같은 버그가 돌아왔을 때 이 노트가 가장 큰 자산입니다.

### 현장에서 흔한 실패
증상 쪽에서 덮어 버리는 땜질(try/catch로 오류를 삼키기, setTimeout으로 순서 맞추기), 한 번에 여러 곳을 고쳐 무엇이 효과였는지 모르게 만들기, 재현도 못 한 채 "고쳤습니다"라고 말하기가 대표적입니다. 이 셋만 피해도 재작업 요청이 눈에 띄게 줄어듭니다.`,
      code: `// [버그 버전] 항목 11개를 5개씩 보여 줄 때 마지막 페이지가 사라진다
function pageCountBuggy(total, size) {
  return Math.floor(total / size);
}
// [고친 버전] 나머지가 남으면 페이지가 하나 더 필요하다
function pageCountFixed(total, size) {
  return Math.ceil(total / size);
}

// 재현 + 범위 좁히기: 경계값을 한꺼번에 돌린다 (기대값은 손으로 센 값)
const size = 5;
const cases = [[0, 0], [1, 1], [4, 1], [5, 1], [6, 2], [10, 2], [11, 3], [12, 3], [15, 3]];
for (const [total, expected] of cases) {
  const bug = pageCountBuggy(total, size);
  const fix = pageCountFixed(total, size);
  console.log(
    "total=" + total + " 기대=" + expected +
    " | 버그판=" + bug + (bug === expected ? " ok" : " 틀림") +
    " | 수정판=" + fix + (fix === expected ? " ok" : " 틀림")
  );
}
`,
      codeLang: `javascript`,
      key: [
        `증상(사람이 본 것), 결함(틀린 코드), 원인 경로(틀린 값이 흘러온 길)를 구분하고 증상에서 거꾸로 따라간다.`,
        `네 단계는 재현 → 범위 좁히기 → 가설 → 확인이고, 재현이 안 되는 버그는 고치지 않고 조건부터 모은다.`,
        `좋은 가설은 반증 가능하며 "맞다면 이 값이 나와야 한다"는 예측을 함께 만든다.`,
        `경계값을 한 표로 돌리면 한 사례보다 규칙(5의 배수에서만 맞다)이 먼저 보인다.`,
        `한 번에 한 곳만 바꾸고, 고친 뒤 처음 재현 절차를 그대로 다시 실행한다.`
      ],
      pitfalls: [
        `try/catch로 오류를 삼키거나 setTimeout으로 순서를 맞추는 식으로 증상만 가리는 것. 원인은 그대로 남아 더 늦게, 더 큰 모습으로 돌아옵니다.`,
        `내 PC에서 한 번 성공했다고 고객 환경 문제로 단정하는 것. 브라우저·기기·데이터 조건이 다를 수 있으니 조건을 물어 같은 조건에서 재현해야 합니다.`,
        `여러 곳을 한꺼번에 고치고 "이제 된다"고 끝내는 것. 어떤 수정이 효과였는지 모르면 같은 버그가 돌아왔을 때 대응할 수 없습니다.`
      ]
    },
    {
      title: `브라우저 개발자 도구 읽기: Console·Elements·Sources·Network`,
      body: `브라우저 개발자 도구(DevTools)는 고객이 보는 화면 뒤에서 실제로 무슨 일이 일어났는지 보여 주는 계기판입니다. Edge에서 ‹F12›나 ‹Ctrl+Shift+I›를 누르면 직전에 쓰던 도구가 열리고, ‹Ctrl+Shift+J›는 Console로, ‹Ctrl+Shift+C›는 Elements로 바로 들어갑니다. ‹Ctrl+Shift+P›로 여는 Command Menu에 도구 이름을 입력하면 원하는 패널을 찾을 수 있습니다(2026-11 기준 Microsoft Edge 공식 문서). Chrome도 패널 구성이 같고 단축키가 비슷합니다.

### 네 패널이 답하는 질문
| 패널 | 답해 주는 질문 | 대표 도구 |
| Elements | 지금 화면의 DOM과 적용된 CSS는 무엇인가 | Styles(취소선), Computed, 박스 모델 그림, Event Listeners 탭 |
| Console | 코드가 무엇을 말했고 지금 값은 무엇인가 | 오류·경고, console.log·console.table, 즉석 실행 |
| Sources | 코드가 어느 줄에서 어떤 값으로 멈추는가 | 중단점, 단계 실행, Scope·Watch·Call Stack |
| Network | 어떤 요청이 나가 어떤 응답이 왔는가 | Status, Initiator, Timing, Headers·Payload·Response |

증상이 보이는 곳에서 시작하세요. 모양은 Elements, 오류 문구는 Console, 값의 출처는 Sources, 데이터가 안 오면 Network입니다.

### Console: 말을 듣고, 질문을 던진다
Console에는 코드가 남긴 메시지(오류·경고·로그)가 쌓이고, 오른쪽의 ‹파일:줄› 링크를 누르면 Sources의 그 줄로 이동합니다. 더 중요한 기능은 입력한 코드를 즉석에서 실행하는 것이라 가설을 코드 한 줄로 시험할 수 있습니다. 아래 예제에서 ‹document.querySelector('#savBtn')›를 입력하면 null이 나오고, 그 순간 "선택자 오타"가 확정됩니다. 객체는 펼친 시점의 값이 보일 수 있으니 찍던 순간의 값은 ‹JSON.stringify›로 남기세요.

### Elements: 소스 보기와 지금 DOM은 다르다
Elements는 파일에 적힌 HTML이 아니라 **브라우저가 지금 가진 DOM**을 보여 줍니다. JavaScript가 추가·삭제한 요소가 반영되므로 "서버가 준 HTML"과 다를 수 있고, 이 차이가 많은 버그의 단서입니다(MDN Debugging CSS도 같은 점을 짚습니다). Styles 창에서 취소선이 그어진 선언은 값이 무효이거나 더 강한 규칙에 덮인 것이고, 체크박스로 선언을 하나씩 꺼 보면 범인 줄이 바로 드러나고, Computed와 박스 모델 그림은 최종 계산값을 줍니다. Event Listeners 탭은 요소에 붙은 리스너를 보여 주어 레슨 6의 중복 리스너를 잡는 데 쓰입니다.

### Sources: 시간을 멈추고 안을 본다
줄 번호를 눌러 중단점을 걸면 그 줄이 실행되기 직전에 멈춥니다. 중단점 종류는 줄, 조건(식이 참일 때만), 이벤트 리스너(click 등이 발생할 때), 예외(던져질 때), XHR·fetch(주소에 특정 문자열이 포함될 때)가 있고(Chrome DevTools 문서), 코드를 고치지 않고 값만 찍는 로그포인트도 있습니다. 멈춘 뒤에는 한 줄씩 실행(Step over), 함수 안으로 들어가기(Step into), 다음 중단점까지 계속(Resume)을 쓰고, Scope 창에서 지역·전역·클로저 변수를, Watch에서 내가 정한 식의 값을 봅니다. console.log는 찍은 값만 보여 주지만 중단점은 그 시점의 모든 값을 보여 줍니다.

### Network: 통신의 증거
Network는 DevTools가 열려 있는 동안의 모든 요청을 표로 기록합니다. 기본 열은 이름, Status(HTTP 코드와 실패 표시), 종류, Initiator(요청을 일으킨 곳), 크기, 시간, 워터폴이고, 요청을 선택하면 Headers·Payload·Preview·Response·Timing 탭이 열립니다(Chrome DevTools 문서). 읽는 순서는 Status → Initiator → Response입니다. 404는 주소나 배포 문제, 4xx는 요청 쪽, 5xx는 서버 쪽, 200인데 화면이 이상하면 Response 본문이 기대한 JSON인지 봅니다. 새로고침 전후 요청을 비교하려면 Preserve log를, 옛 파일이 계속 보이면 Disable cache를, 느린 회선을 흉내 내려면 Throttling을 씁니다. 요청을 우클릭해 fetch나 cURL로 복사하면 서버 담당자에게 문제를 정확히 전달할 수 있습니다.

### 학습 앱에서 실행한 코드를 열어 볼 때
이 앱의 HTML 예제는 별도 iframe에서 돌기 때문에 DevTools Console 위쪽의 컨텍스트 선택에서 해당 프레임을 골라야 변수가 보이고, JavaScript 예제는 웹 워커에서 돌아 출력이 앱의 결과 상자에만 나옵니다. 가장 간단한 방법은 코드를 .html 파일로 저장해 브라우저로 여는 것입니다. 아래 예제는 화면에도 오류를 기록하지만 실습할 때는 DevTools Console 표시와 꼭 비교하세요.`,
      code: `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>메모 저장 (버그 버전)</title>
<style>body{font:16px sans-serif;padding:12px}pre{background:#eee;padding:8px;min-height:3em;white-space:pre-wrap}</style>
</head><body>
<button id="saveBtn">저장</button>
<p id="status">상태: 아직 저장 안 함</p>
<pre id="trace"></pre>
<script>
// 화면에도 기록한다: DevTools를 안 열어도 오류가 보이게 하는 장치
const trace = m => document.getElementById("trace").textContent += m + "\\n";
window.addEventListener("error", e =>
  trace("window.error → " + e.message + " (줄 " + e.lineno + ", 열 " + e.colno + ")"));

const memos = [{ id: 1, text: "우유" }, { id: 2, text: "빵" }];
console.table(memos);                          // Console에 표로 찍힌다
trace("1. memos 준비: " + memos.length + "건");

// [버그 버전] 버튼 id는 saveBtn인데 savBtn으로 오타 → null에 addEventListener를 호출
document.querySelector("#savBtn").addEventListener("click", () => {
  document.getElementById("status").textContent = "상태: " + memos.length + "건 저장됨";
});
trace("2. 리스너 연결 완료");                 // 위에서 예외가 나면 이 줄은 실행되지 않는다
// [고친 버전] 위 selector를 "#saveBtn"으로 고치면 버튼이 동작하고 2번 줄도 찍힌다
</script>
</body></html>
`,
      codeLang: `html`,
      key: [
        `증상이 보이는 패널에서 시작한다: 모양은 Elements, 값·오류는 Console, 실행 흐름은 Sources, 통신은 Network.`,
        `Elements는 소스 보기가 아니라 브라우저가 지금 가진 DOM과 계산된 스타일이다. 취소선 선언은 무효이거나 덮인 것이다.`,
        `Console은 REPL이라 가설을 한 줄 코드로 즉시 시험할 수 있다. 예: 선택자가 null을 돌려주는지.`,
        `중단점은 코드를 고치지 않고 그 시점의 모든 값을 보여 주며, 조건·이벤트·예외·fetch 중단점을 상황에 맞게 쓴다.`,
        `Network는 Status → Initiator → Response 순으로 읽고, 요청을 fetch/cURL로 복사해 서버 쪽에 그대로 전달한다.`
      ],
      pitfalls: [
        `DevTools를 연 뒤에 일어난 요청만 기록되는데, 이미 지나간 요청을 찾으며 헤매는 것. 패널을 연 채로 새로고침하고 필요하면 Preserve log를 켭니다.`,
        `iframe 안에서 돌아가는 코드를 Console에서 변수가 안 보인다고 코드 탓으로 돌리는 것. 컨텍스트 선택이 최상위 문서인지 먼저 봅니다.`,
        `객체를 console.log로 찍고 나중에 펼쳐 본 값이 그 시점의 값이라고 믿는 것. 찍는 순간의 값이 필요하면 문자열로 복사해 찍습니다.`
      ]
    },
    {
      title: `오류 메시지와 스택 트레이스 읽는 법`,
      body: `오류 메시지는 겁낼 대상이 아니라 **엔진이 남긴 진술서**입니다. 자바스크립트의 오류는 name(종류)과 message(설명), 그리고 stack(호출 경로)을 가진 객체입니다. MDN은 문제를 문법 오류(코드가 실행 자체를 못 함), 런타임 오류(실행하다 실패), 논리 오류(오류 없이 결과만 틀림)로 나눕니다. 앞의 둘은 메시지가 단서가 되고, 논리 오류는 레슨 1의 방법으로 값을 추적해야 합니다.

### 메시지를 읽는 네 가지 순서
1. **종류**: ReferenceError(없는 이름), TypeError(값의 종류가 안 맞음), SyntaxError(문법), RangeError(허용 범위 밖)처럼 어떤 규칙을 어겼는지 알려 줍니다.
2. **메시지 속 이름**: 따옴표나 점으로 이어진 이름이 지목된 대상입니다. 철자와 대소문자를 먼저 의심하세요. ‹addeventListener›는 ‹addEventListener›가 아니어서 함수가 아닙니다.
3. **위치**: ‹cart.js:14:38›은 파일, 줄, 열입니다. MDN은 실제 문제가 그 줄이 아닐 수도 있다고 경고합니다. 그 줄은 엔진이 포기한 지점이지 범인의 주소가 아닙니다.
4. **스택**: 위쪽이 가장 최근 호출(던진 곳), 아래쪽이 시작점입니다.

### 자주 만나는 메시지 (2026-11 기준 Edge 157에서 확인한 문구)
| 메시지 | 뜻 | 먼저 볼 곳 |
| ‹zzz is not defined› | 선언되지 않았거나 스코프 밖 | 철자, 선언 위치, 스크립트 로드 순서 |
| ‹o.f is not a function› | 점 앞은 있는데 그 속성이 함수가 아님 | 철자, 반환값이 비었는지, 배열이 아닌 값에 map 호출 |
| ‹Cannot read properties of null (reading 'x')› | null에서 속성을 읽음 | 그 값을 만든 querySelector·find·API 응답 |
| ‹Unexpected token '<', "<!DOCTYPE "... is not valid JSON› | JSON 자리에 HTML이 옴 | Network에서 Status(404·로그인 페이지·잘못된 주소) |
| ‹Assignment to constant variable.› | const를 다시 대입 | let으로 바꿀지, 대입 자체가 버그인지 |
| ‹Cannot access 'q' before initialization› | let·const를 선언 전에 사용 | 선언과 사용 순서 |
| ‹Failed to fetch› | 응답을 받기 전 통신 단계 실패 | Network의 Status(CORS·차단·오프라인) |
Cannot read properties 메시지의 of 뒤에는 null 말고도 "값이 아직 정해지지 않았다"는 뜻의 특수 값(un과 defined를 붙여 쓴 단어)이 자주 옵니다. 둘 다 "점 앞의 값이 비어 있다"는 같은 뜻입니다. 문구는 브라우저마다 다릅니다. MDN 예시에서 같은 오류를 Firefox는 ‹can't access property "textContent", lowOrHi is null›로, Chrome은 ‹Cannot set properties of null (setting 'textContent')›로 말합니다. 그래서 오류 문구를 검색할 때는 종류와 핵심 단어로 찾습니다.

### 스택 트레이스: 던진 곳과 잘못된 값이 만들어진 곳은 다르다
아래 코드의 첫 부분을 실행하면 ‹at serialize (about:srcdoc:8:40)›처럼 한 줄에 함수 이름과 위치가 나옵니다. V8 계열(Chrome·Edge)은 이 모양이고 Firefox는 ‹함수@파일:줄:열›처럼 다릅니다. MDN은 stack이 표준이 아니고 문자열 형식에 기대면 안 된다고 하지만 모든 주요 엔진이 구현해 디버깅에는 쓸 수 있다고 설명합니다. 이 예제에서 맨 위의 serialize가 던졌지만 serialize 안에는 잘못이 없습니다. 이 함수는 배열이 온다고 믿었는데, 아래 호출자 onSave가 아직 채워지지 않은 todos를 넘겼습니다. **맨 위 프레임에서 "어떤 값이 비었나"를 알고, 아래로 내려가며 "그 값을 누가 비워 넘겼나"를 찾습니다.** 이벤트 리스너, 타이머, Promise 콜백은 각자 새 호출 체인을 시작하므로 비동기 코드의 스택은 짧거나 중간에 끊겨 보입니다.

### 현장 팁
- 배포본 코드는 압축되어 ‹app.min.js:1:48213›처럼 위치가 무의미해집니다. 운영 오류를 다루려면 소스맵이 있는지 먼저 확인하세요.
- 처리되지 않은 오류는 window의 error 이벤트로, 거부된 Promise는 unhandledrejection 이벤트로 모을 수 있습니다. 모은 로그에는 고객 개인정보가 섞이지 않게 주의합니다.
- 고친 판처럼 입력을 경계에서 검사해 "누가 어떤 값을 줬는지"를 메시지에 담으면 다음 디버깅이 몇 분 줄어듭니다.`,
      code: `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>스택 트레이스 읽기</title></head>
<body><pre id="out"></pre>
<script>
const out = m => document.getElementById("out").textContent += m + "\\n";
let todos;                                       // 불러오기 전이라 값이 비어 있다

function serialize(list) { return list.map(t => t.title).join(","); }   // 터지는 곳
function saveTodos(list) { return serialize(list); }
function onSave() { return saveTodos(todos); }                            // 잘못된 값을 넘긴 곳

// [버그 버전] 예외가 어디서 났고, 값은 어디서 왔는지 스택으로 읽는다
try { onSave(); } catch (e) {
  out("[버그] " + e.name + ": " + e.message);
  out(e.stack.split("\\n").slice(1, 4).join("\\n"));   // 위가 최신 호출, 아래가 시작점
}

// [고친 버전] 입력을 검사해 '원인 쪽'에서 읽기 쉬운 메시지로 터뜨린다
function saveTodosSafe(list) {
  if (!Array.isArray(list)) throw new TypeError("saveTodos: 배열이 필요한데 " + typeof list + " 를 받음");
  return serialize(list);
}
try { saveTodosSafe(todos); } catch (e) { out("[고침] " + e.name + ": " + e.message); }
todos = [{ title: "우유" }, { title: "빵" }];
out("[정상] " + saveTodosSafe(todos));
</script></body></html>
`,
      codeLang: `html`,
      key: [
        `오류는 종류 → 메시지 속 이름 → 위치 → 스택 순서로 읽고, 위치의 줄은 엔진이 멈춘 곳이지 원인의 주소가 아닐 수 있다.`,
        `스택은 위가 가장 최근 호출이다. 던진 곳(맨 위)과 잘못된 값을 만든 곳(아래 호출자)을 구분한다.`,
        `메시지 문구와 스택 형식은 브라우저와 버전마다 다르므로 문구 전체보다 종류와 핵심 단어로 판단한다.`,
        `fetch 단계 오류(Failed to fetch)나 JSON 파싱 오류는 Console이 아니라 Network의 Status·Response에서 원인이 갈린다.`,
        `입력을 경계에서 검사하고 값의 종류를 메시지에 담으면 다음 스택이 훨씬 짧아진다.`
      ],
      pitfalls: [
        `오류가 난 줄만 고치려 드는 것. 그 줄은 비어 있는 값을 받았을 뿐이고, 값을 비운 호출자를 고치지 않으면 같은 오류가 다른 줄에서 다시 납니다.`,
        `Cannot read properties 오류를 만나면 무조건 ?. 연산자나 if로 막는 것. 값이 왜 비었는지 모른 채 막으면 화면은 조용해지고 데이터는 계속 틀립니다.`,
        `minify된 운영 코드의 줄 번호를 개발 코드의 줄 번호처럼 읽는 것. 소스맵이 없으면 위치 정보가 의미가 없습니다.`
      ]
    },
    {
      title: `자주 나오는 JavaScript 버그: 스코프·비동기·타입 변환·this`,
      body: `JavaScript 버그의 상당수는 네 가지 규칙을 오해해서 생깁니다. 규칙의 속을 알면 증상만 보고도 의심 대상을 좁힐 수 있습니다.

### 1) 스코프: var는 블록을 모른다
MDN에 따르면 var 변수는 가장 가까운 **함수** 단위로 묶이고, if·for 같은 블록은 var의 스코프를 만들지 않습니다. 또 선언은 위로 끌어올려지지만(호이스팅) 값은 대입 줄에 도달하기 전까지 비어 있습니다. 반복문 안에서 콜백을 만들면 콜백은 변수의 **값**이 아니라 **변수 자체**를 붙잡습니다. 콜백이 실행될 즈음 반복은 끝나 i는 마지막 값입니다. 그래서 버튼 3개가 모두 같은 번호를 말합니다. let은 반복마다 새 변수를 만들고, 선언 전에 쓰면 오류로 알려 줍니다(Cannot access before initialization).

### 2) 비동기: 기다리지 않으면 약속만 받는다
브라우저의 JavaScript는 한 번에 한 작업을 끝까지 실행합니다(run-to-completion). 타이머 콜백은 작업 큐에, Promise 콜백은 우선순위가 더 높은 마이크로태스크 큐에 들어가고, 현재 작업이 끝나야 실행됩니다(MDN 실행 모델과 마이크로태스크 안내). 따라서 async 함수를 await 없이 부르면 값이 아니라 Promise 객체를 받습니다. 그 객체에 1을 더하면 문자열 "[object Promise]1"이 됩니다. 또 하나, **fetch는 HTTP 404·500에서도 거부(reject)되지 않고** 정상 응답으로 이어집니다. 네트워크 자체가 실패했을 때만 거부되므로 res.ok나 status를 직접 확인해야 합니다. 처리하지 않은 거부는 unhandledrejection 이벤트로 나타납니다.

### 3) 타입 변환: 입력창의 값은 문자열이다
input의 value는 숫자를 입력해도 문자열입니다. 더하기 연산자는 한쪽이 문자열이면 이어 붙이기가 되어 "10" + 5는 "105"입니다. 비교도 문자열끼리는 사전 순이라 "10" > "9"는 거짓입니다. Number("")는 0이고 Number("abc")는 NaN이라, 변환한 뒤 Number.isFinite로 검사하지 않으면 빈 입력이 0으로, 오타가 NaN으로 화면에 번집니다.

### 4) this: 정의가 아니라 호출 방식이 정한다
MDN은 this가 함수가 어떻게 호출되었는지로 정해진다고 설명합니다. obj.f()처럼 점으로 부르면 this는 obj이지만, 메서드를 변수에 꺼내 f()로 부르면 점이 사라져 this를 잃습니다. 클래스 안은 항상 strict 모드라 이 경우 this가 비어 있어 TypeError가 납니다. setTimeout이나 setInterval에 this.tick을 그대로 넘기면 타이머가 전역 객체를 this로 호출해 NaN이 쌓입니다. 해법은 화살표 함수로 감싸 바깥 this를 물려받게 하거나, bind로 고정하는 것입니다.

### 증상으로 의심 대상 좁히기
| 증상 | 가장 먼저 의심 | 확인하는 한 줄 |
| 값이 모두 반복의 마지막 값 | var와 클로저 | 콜백 안에서 console.log(i) |
| Promise 객체가 찍힘, 순서가 뒤바뀜 | await 누락 | typeof 결과가 object인지 |
| 숫자가 이어 붙음, 비교가 이상함 | 문자열 값 | typeof 값 |
| this 관련 TypeError, NaN | 호출 방식 | 호출 줄에 점(.)이 있는지 |
아래 코드는 네 버그를 각각 [버그]와 [고침]으로 나란히 출력합니다.`,
      code: `const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  // 1) 스코프 - [버그] var는 블록이 아니라 함수 단위라 콜백 3개가 같은 i를 본다
  for (var i = 0; i < 3; i++) setTimeout(() => console.log("1 버그 var:", i), 0);
  await sleep(20);
  // [고침] let은 반복마다 새 변수를 만든다
  for (let j = 0; j < 3; j++) setTimeout(() => console.log("1 고침 let:", j), 0);
  await sleep(20);

  // 2) 비동기 - [버그] await를 빼먹으면 값이 아니라 Promise를 쓰게 된다
  const getCount = async () => { await sleep(5); return 41; };
  const bad = getCount();
  console.log("2 버그:", typeof bad, bad + 1);
  console.log("2 고침:", (await getCount()) + 1);

  // 3) 타입 변환 - 입력창 값은 항상 문자열이다
  const qty = "10";
  console.log("3 버그:", qty + 5, qty > "9");
  console.log("3 고침:", Number(qty) + 5, Number(qty) > 9);

  // 4) this - [버그] 메서드를 변수에 꺼내면 점(.)이 사라져 this를 잃는다
  class Counter { count = 0; inc() { this.count++; return this.count; } }
  const c = new Counter();
  const inc = c.inc;
  try { inc(); } catch (e) { console.log("4 버그:", e.name + ": " + e.message); }
  const bound = c.inc.bind(c);               // 또는 () => c.inc()
  console.log("4 고침:", bound(), bound());
}
main();
`,
      codeLang: `javascript`,
      key: [
        `var는 함수 단위이고 콜백은 값이 아니라 변수를 붙잡는다. 반복문 안 콜백이 모두 마지막 값을 보면 var를 의심한다.`,
        `async 함수는 항상 Promise를 돌려준다. await가 없으면 값 대신 약속을 쓰게 되고, fetch는 HTTP 오류 상태에서도 거부되지 않으니 res.ok를 확인한다.`,
        `입력값은 문자열이다. 더하기는 이어 붙이고 비교는 사전 순이므로 Number로 바꾼 뒤 Number.isFinite로 검사한다.`,
        `this는 정의가 아니라 호출 방식으로 정해진다. 메서드를 떼어 넘기거나 타이머에 그대로 넘기면 잃으니 화살표 함수나 bind를 쓴다.`,
        `증상 → 의심 → 한 줄 확인표를 머릿속에 두면 원인 후보를 몇 개로 줄일 수 있다.`
      ],
      pitfalls: [
        `반복문 안에서 콜백을 만들 때 var를 쓰고 setTimeout으로 순서를 맞추려는 것. 시간을 늘려도 변수 공유 문제는 사라지지 않습니다.`,
        `forEach 안에서 async 콜백에 await를 쓰고 forEach 전체가 기다려 줄 것이라고 기대하는 것. forEach는 콜백이 돌려준 Promise를 기다리지 않으므로 for...of나 Promise.all을 씁니다.`,
        `parseInt로 바꾸면 안전하다고 믿는 것. 12abc도 12로 읽혀 입력 오류를 놓치므로 형식 검사를 함께 합니다.`,
        `this 문제를 만나면 아무 곳에나 self = this를 만들어 가는 것. 호출 지점을 먼저 보고 화살표 함수나 bind 한 곳으로 정리합니다.`
      ]
    },
    {
      title: `자주 나오는 CSS 버그: 명시도·박스 모델·레이아웃 깨짐`,
      body: `CSS 버그는 "내가 쓴 규칙이 왜 안 먹지"와 "왜 한 칸이 모자라 줄이 바뀌지" 두 가지가 대부분입니다. 둘 다 눈으로 추측하지 말고 DevTools가 계산한 숫자를 읽으면 몇 분 안에 끝납니다.

### 캐스케이드: 누가 이기는가의 순서
브라우저는 같은 속성에 여러 규칙이 걸리면 순서대로 겨룹니다. MDN은 명시도를 비교하기 전에 출처, 중요도(!important), 캐스케이드 레이어를 먼저 본다고 설명합니다. 같은 층에서는 **명시도**를 ID-클래스-요소 세 칸으로 왼쪽부터 비교합니다. ID 선택자는 1-0-0, 클래스·속성·가상 클래스는 0-1-0, 요소·가상 요소는 0-0-1이고, ID 하나가 클래스 열 개보다 강합니다. :where()는 항상 0이고 :is()와 :not()은 인자 중 가장 센 선택자의 값을 가집니다. 명시도가 같을 때만 **나중에 적힌 규칙**이 이깁니다. 인라인 style은 일반 규칙보다 강하고, 이를 넘으려는 !important는 같은 층에서 서로 이기려는 군비 경쟁으로 번지므로 MDN도 나쁜 습관이라 말합니다.

사례: ‹#shop a { color: gray }›(1-0-1)와 ‹.btn { color: white }›(0-1-0)가 겹치면 ‹.btn›은 영원히 집니다. 규칙 순서를 바꿔도 소용없습니다. 해결은 센 쪽을 낮추는 것입니다. ‹:where(#shop) a›처럼 바꾸면 0-0-1이 되어 ‹.btn›이 이깁니다.

### 박스 모델: 폭에 무엇이 포함되는가
요소는 안쪽부터 content, padding, border, margin 네 겹입니다. 기본값(content-box)에서 width는 **content만의 폭**이라 padding과 border가 바깥에 더해집니다. MDN의 예시에서 width 350px, padding 25px, border 5px인 상자가 실제로 차지하는 가로 폭은 350+25+25+5+5=410px입니다. box-sizing: border-box로 바꾸면 width가 padding과 border를 포함한 폭이 되어 350px 그대로입니다. 그래서 ‹width: 100%›에 padding을 준 상자는 content-box에서는 부모보다 34px(16px×2+1px×2) 넓어져 가로 스크롤을 만듭니다. 프로젝트 맨 위에 ‹*, *::before, *::after { box-sizing: border-box }›를 두면 이 부류의 버그가 한꺼번에 사라집니다. 또 세로로 맞닿은 margin은 합쳐집니다(margin collapsing). 아래 간격 50px과 위 간격 30px이 만나면 80px이 아니라 50px입니다.

### 레이아웃 깨짐 진단 절차
1. 문제 요소를 Inspect로 잡고 Styles에서 취소선 줄을 찾습니다(덮였거나 무효).
2. Computed와 박스 모델 그림으로 폭·여백의 실제 숫자를 읽습니다.
3. 가로 스크롤은 범인을 직접 찾습니다. Console에서 ‹[...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth)›를 실행하면 화면 밖으로 나간 요소가 나옵니다.
4. 긴 영문 상품명이나 URL처럼 줄바꿈 지점이 없는 문자열은 상자를 넘칩니다. ‹overflow-wrap: anywhere›가 해법이고, 플렉스 아이템이 줄지 않으면 ‹min-width: 0›도 함께 봅니다.
5. 고친 뒤 창 폭을 360, 600, 900px로 바꿔 가며 다시 측정합니다.

### 한 겹을 고치면 다음 겹이 나온다
실무의 레이아웃 버그는 겹겹입니다. 아래 코드의 상자 폭은 344px로 틀렸고 버튼 색은 회색입니다. 박스 모델만 고치고 끝냈는데 긴 문자열이 새로 넘치는 일이 흔합니다. 매번 같은 측정 명령으로 숫자를 확인하는 습관이 필요합니다. 비용 순서도 정해 두세요. 선택자를 정리하는 것이 가장 싸고, 선언 순서를 바꾸는 것이 그다음, !important는 마지막 수단이며 사용했다면 이유를 주석으로 남깁니다.`,
      code: `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>CSS 버그 두 가지</title>
<style>
body{font:15px sans-serif;margin:8px}
.wrap{width:300px;background:#cde;margin-bottom:6px}
.card{width:100%;padding:20px;border:2px solid #36c;background:#fff}   /* 버그: content-box라 300+44 */
.card.ok{box-sizing:border-box}                                         /* 고침: 폭 안에 padding과 border 포함 */
#app button,#app2 button{padding:6px 12px;border:0}
#app button{background:#ccc;color:#000}     /* 버그: 명시도 1-0-1이 .danger(0-1-0)를 이긴다 */
:where(#app2) button{background:#ccc}       /* 고침: 0-0-1로 낮춰 .danger가 이기게 한다 */
.danger{background:crimson;color:#fff}
</style></head><body>
<div class="wrap"><div class="card" id="c1">버그: 카드</div></div>
<div class="wrap"><div class="card ok" id="c2">고침: 카드</div></div>
<div id="app"><button class="danger" id="b1">버그: 삭제</button></div>
<div id="app2"><button class="danger" id="b2">고침: 삭제</button></div>
<pre id="m"></pre>
<script>
addEventListener("load", () => {
  const w = id => document.getElementById(id).getBoundingClientRect().width;
  const bg = id => getComputedStyle(document.getElementById(id)).backgroundColor;
  document.getElementById("m").textContent =
    "카드 폭 버그=" + w("c1") + " 고침=" + w("c2") + " (래퍼 300)\\n" +
    "버튼 배경 버그=" + bg("b1") + " 고침=" + bg("b2");
});
</script></body></html>
`,
      codeLang: `html`,
      key: [
        `캐스케이드는 출처·중요도·레이어를 본 뒤 명시도(ID-클래스-요소)를 비교하고, 같을 때만 나중에 적힌 규칙이 이긴다.`,
        `ID 선택자 하나는 클래스 열 개보다 강하다. 안 먹는 규칙은 순서를 바꾸지 말고 이긴 규칙의 명시도를 낮추거나 구조를 정리한다.`,
        `기본 box-sizing에서는 width에 padding과 border가 더해진다(350+25+25+5+5=410px). border-box를 전역에 두면 폭 계산이 직관과 같아진다.`,
        `레이아웃은 눈이 아니라 getBoundingClientRect·Computed·박스 모델 그림의 숫자로 진단하고, 고칠 때마다 같은 측정을 반복한다.`,
        `!important는 마지막 수단이며 쓰면 이유를 주석에 남긴다. 줄바꿈 지점 없는 긴 문자열은 overflow-wrap으로 처리한다.`
      ],
      pitfalls: [
        `안 먹는 규칙을 파일 아래로 옮기거나 !important를 붙여 이기려는 것. 명시도가 다르면 순서는 무의미하고, !important는 다음 사람이 같은 방법을 쓰게 만들어 점점 풀기 어려워집니다.`,
        `가로 스크롤을 body에 overflow-x: hidden으로 가리는 것. 넘치는 요소는 그대로라서 모바일에서 오른쪽이 잘립니다. 넘친 요소를 찾아 원인을 고칩니다.`,
        `내 모니터 한 폭에서만 확인하고 끝내는 것. 360px, 600px, 900px처럼 폭을 바꿔 측정하지 않으면 모바일에서 깨지는 줄을 놓칩니다.`
      ]
    },
    {
      title: `이벤트와 상태가 어긋나는 버그`,
      body: `할 일 앱 같은 화면은 한 줄로 요약됩니다. **상태(데이터)가 바뀌면 render가 화면을 다시 그리고, 이벤트 핸들러는 상태를 바꾼 뒤 render를 부른다.** 버그의 대부분은 이 고리의 한 곳이 어긋난 것입니다. 상태는 바뀌었는데 화면이 안 바뀌거나, 화면은 바뀌었는데 상태가 그대로이거나, 핸들러가 엉뚱한 상태를 붙잡고 있거나, 핸들러가 한 번이 아니라 여러 번 불립니다.

### 이벤트가 흐르는 길
클릭하면 이벤트는 최상위에서 대상 요소로 내려가고(capture), 대상에서 발생하고, 다시 부모로 올라옵니다(bubble). addEventListener는 기본적으로 올라오는 단계에서 듣습니다(MDN 이벤트 버블링). event.target은 처음 이벤트가 일어난 요소이고 currentTarget은 지금 핸들러가 붙은 요소입니다. 부모에 리스너를 하나만 두고 target으로 어떤 자식인지 가려내는 **이벤트 위임**은 요소가 계속 새로 그려지는 목록에서 특히 안전합니다. 반대로 stopPropagation은 위쪽 리스너를 조용히 끊어 "가끔 안 되는 버튼"을 만들 수 있어 최후의 수단입니다.

### 어긋남의 세 유형
1. **갱신 누락**: ‹item.done = true›만 하고 render를 부르지 않아 화면과 "남은 일 N개"가 이전 상태로 남습니다. 반대로 DOM만 직접 고치고 상태를 안 바꾸면 다음 render에서 변경이 사라집니다.
2. **오래된 값 캡처**: 반복문에서 만든 핸들러가 인덱스 i를 붙잡았는데, 목록이 필터·정렬된 뒤에는 그 번호가 원본 배열의 번호와 다릅니다. 필터된 목록의 2번째 항목을 지우는데 원본의 2번째가 지워집니다. 인덱스 대신 항목 자체(참조)나 안정적인 id로 대상을 지정하세요.
3. **리스너 중복·누락**: addEventListener는 같은 함수 참조를 두 번 등록해도 한 번만 반영합니다. 하지만 render 안에서 화살표 함수를 매번 새로 만들어 붙이면 호출할 때마다 리스너가 하나씩 쌓입니다. 렌더가 몇 번 일어났는지에 따라 클릭 한 번이 1번, 2번, 4번 실행됩니다.

### 불변식으로 가둔다
"항상 참이어야 하는 문장"을 코드로 쓰면 어긋남이 생긴 순간 잡힙니다. 예: ‹todos.length === list.children.length›, ‹남은 일 숫자 === todos.filter(t => !t.done).length›, ‹id가 모두 다르다›. render 끝에서 검사하면 이분 탐색이 필요 없습니다. 처음 어긋난 호출이 곧 범인입니다.

### 도구로 보기
Elements 패널의 Event Listeners 탭은 선택한 요소에 붙은 리스너를 보여 주므로 "추가 버튼에 click이 몇 개 붙었나"를 한눈에 셉니다. Sources의 Event Listener 중단점은 click이 발생할 때 멈춰 어느 핸들러가 실행되는지 보여 줍니다(Chrome DevTools 문서). 아래 코드는 렌더마다 리스너가 쌓이는 버전과 한 번만 붙이는 버전을 나란히 돌려, 클릭 3번 뒤의 항목 수를 1 → 3 → 7 대 1 → 2 → 3으로 보여 줍니다. 한 번 클릭에 추가되는 개수가 1, 2, 4개로 배가되는 모양이 이 버그의 지문입니다.

### 고칠 때의 원칙
- 리스너는 요소를 만들 때 한 번만 붙이거나 부모에 위임합니다. render는 "그리기"만 합니다.
- 상태를 바꾸는 길을 한 함수(예: setState)로 모으고 그 끝에서만 render를 부르면 갱신 누락이 구조적으로 사라집니다.
- 대상 지정은 인덱스가 아니라 id나 항목 참조로 합니다.`,
      code: `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>리스너가 쌓이는 버그</title></head>
<body><pre id="log"></pre>
<script>
const log = m => document.getElementById("log").textContent += m + "\\n";

function mount(buggy) {
  const btn = document.createElement("button"), ul = document.createElement("ul");
  btn.textContent = buggy ? "추가(버그)" : "추가(고침)";
  document.body.append(btn, ul);
  const todos = [];
  let n = 0;
  function add() { todos.push("할 일 " + (++n)); render(); }
  function render() {
    ul.innerHTML = "";
    todos.forEach(t => ul.append(Object.assign(document.createElement("li"), { textContent: t })));
    if (buggy) btn.addEventListener("click", () => add());  // [버그] 그릴 때마다 리스너가 하나 더 쌓인다
  }
  if (!buggy) btn.addEventListener("click", add);            // [고침] 리스너는 한 번만 붙인다
  render();
  return { btn, todos, ul };
}

for (const buggy of [true, false]) {
  const app = mount(buggy), counts = [];
  for (let k = 0; k < 3; k++) { app.btn.click(); counts.push(app.todos.length); }
  log((buggy ? "[버그] " : "[고침] ") + "클릭 3번 뒤 개수: " + counts.join(" → ") + " (기대 1 → 2 → 3)");
}
</script></body></html>
`,
      codeLang: `html`,
      key: [
        `화면은 상태에서 그려진다. 버그는 상태 변경, render 호출, 핸들러가 붙잡은 값, 핸들러 개수 중 한 곳의 어긋남이다.`,
        `이벤트는 내려갔다 올라온다. target은 처음 일어난 요소, currentTarget은 핸들러가 붙은 요소이고, 위임은 새로 그려지는 목록에 안전하다.`,
        `필터·정렬된 목록의 인덱스로 원본 배열을 고치지 말고 id나 항목 참조로 대상을 지정한다.`,
        `render 안에서 새 화살표 함수를 리스너로 붙이면 호출할 때마다 쌓인다. 클릭 한 번에 1, 2, 4개씩 늘어나는 모양이 지문이다.`,
        `불변식(개수 일치, id 중복 없음)을 render 끝에서 검사하면 처음 어긋난 호출을 곧바로 잡는다.`
      ],
      pitfalls: [
        `리스너가 쌓이는 문제를 stopPropagation이나 flag 변수로 막는 것. 증상은 줄지만 원인(렌더마다 등록)이 남아 있어 다른 이벤트에서 다시 터집니다.`,
        `DOM의 상태(체크 여부, 입력 값)를 진실의 원천으로 삼고 상태 배열과 따로 관리하는 것. 어느 쪽이 맞는지 모르는 순간부터 화면과 데이터가 서로 다른 말을 합니다.`,
        `렌더를 부를 때마다 listener 개수를 확인하지 않고 click() 한 번만 해 보고 정상이라 판단하는 것. 처음엔 1개라 정상으로 보이고 두 번째 클릭부터 어긋납니다.`
      ]
    },
    {
      title: `남의 코드 읽는 법과 이분 탐색으로 원인 찾기`,
      body: `외주에서 만나는 코드는 대개 내가 쓰지 않았고, 문서가 없고, 이름이 낯설고, 쓴 사람은 연락이 안 됩니다. 전부 이해하려는 순간 길을 잃습니다. 목표는 이해가 아니라 **버그가 지나가는 경로만 읽는 것**입니다.

### 읽는 순서
1. **진입점**: HTML이면 ‹<script>›가 읽어 들이는 파일과 순서를, 프레임워크 프로젝트면 package.json의 scripts와 진입 파일(index·main)을 봅니다.
2. **데이터의 모양**: 상태를 담는 변수(예: todos 배열)와 그 항목이 가진 필드를 먼저 파악합니다. 데이터 모양을 알면 함수는 절반 이해된 것입니다.
3. **증상에서 거꾸로**: 화면의 문구나 오류 메시지를 전체 검색(VS Code 기준 Ctrl+Shift+F)하면 해당 기능의 코드 위치에 닿습니다. 그다음 "이 값은 어디서 만들어졌나, 누가 바꾸나"를 따라갑니다.
4. **흐름 그리기**: 이벤트 → 상태 변경 → render로 이어지는 경로를 종이에 화살표로 그립니다. 읽는 동안 코드는 고치지 않고 주석 대신 별도 메모에 적어 둡니다. 다른 사람의 습관을 평가하지 말고 "이 코드는 이런 약속 위에서 돈다"만 기록하세요.

### 이분 탐색: 의심 구간을 반으로 자른다
N개의 후보 중 하나가 원인이고 "이 지점까지는 정상인가"를 한 번에 판정할 수 있다면, 가운데를 확인해 후보를 절반씩 줄입니다. 확인 횟수는 순서대로 볼 때의 N번이 아니라 log₂N번입니다. 후보가 1000개여도 열 번 안팎입니다(2의 10제곱이 1024).
- **코드 구간**: 8단계 변환 파이프라인에서 4단계 뒤 값이 이미 틀렸다면 앞 4단계를, 맞다면 뒤 4단계를 봅니다. 값 출력 한 줄이 한 번의 확인입니다.
- **변경 이력**: 어제 정상, 오늘 비정상이라면 두 커밋 사이를 반으로 자릅니다. git bisect는 bad와 good 커밋을 알려 주면 가운데 커밋을 체크아웃해 주고, 내가 good/bad로 답할 때마다 범위가 절반이 됩니다. 문서의 예시에서 675개 남았을 때 "roughly 10 steps"로 나옵니다.
- **입력과 환경**: 데이터를 절반씩 지우고, 브라우저 확장을 끄고, 최근에 올린 라이브러리 버전을 되돌려 봅니다.

### git bisect run으로 자동화하기
재현 테스트를 스크립트로 만들 수 있으면 ‹git bisect start HEAD v1.4.0›, ‹git bisect run ./check.sh›로 끝까지 자동으로 돕니다. git 문서의 약속은 이렇습니다. 종료 코드 0은 좋음, 1~127(단 125 제외)은 나쁨, **125는 이 커밋은 시험할 수 없으니 건너뛰라**는 뜻이고 그 밖의 값은 중단입니다. 그래서 빌드가 깨진 중간 커밋에서 빌드 실패를 그냥 exit 1로 내보내면 그 커밋이 "버그 커밋"으로 오판됩니다. 빌드 명령은 ‹npm run build || exit 125›처럼 125로 건너뛰게 합니다. 끝나면 ‹git bisect reset›으로 원래 위치로 돌아옵니다.

### 읽을 때의 안전망
- 고치기 전에 지금 동작을 손으로 기록합니다(핵심 시나리오 5개의 입력과 화면). 수정 뒤 같은 시나리오로 비교하면 "원래 그랬던 것"과 "내가 깨뜨린 것"이 갈립니다.
- 작업은 새 브랜치에서 하고, 커밋을 원인별로 작게 쪼갭니다. bisect가 나중에 같은 방식으로 나를 도와줍니다.
- AI 도구가 만든 코드는 겉보기에 그럴듯해도 데이터 모양과 경계값에서 틀리는 일이 잦습니다. Stack Overflow 2025 개발자 설문의 AI 문항(복수 선택, 응답자 31,476명)에서 66%가 "거의 맞지만 완전히는 아닌 AI 답", 45.2%가 "AI가 만든 코드를 디버깅하는 데 더 오래 걸린다"를 골랐습니다(2025 설문 기준, 자기 보고). 읽기와 이분 탐색이 AI 도구를 쓰는 시대에도 필요한 이유입니다.

아래 코드는 10개 커밋 이력을 흉내 내고, 재현 테스트로 3번의 확인 만에 처음 나쁜 커밋을 찾습니다. 고친 판은 "계산은 원 단위로 유지하고 단위 변환은 표시할 때만"이라는 원칙으로 회귀를 되돌립니다.`,
      code: `// 같은 함수가 커밋마다 바뀌어 온 이력을 흉내 낸다 (c1~c10). c7에서 회귀(regression)가 들어갔다.
function priceAt(commit) {
  return (unit, qty) => {
    let total = unit * qty;
    if (commit >= 4) total = total * 1.1;                  // c4: 부가세 10% 추가 (의도한 변경)
    if (commit >= 7) total = Math.floor(total / 1000);     // c7: [버그] 천 원 단위로 줄여 버림 (의도 아님)
    return total;
  };
}
// 재현 테스트: 1000원짜리 3개는 3000원 이상이어야 한다. true면 좋음, false면 나쁨.
const isGood = commit => priceAt(commit)(1000, 3) >= 3000;

let good = 1, bad = 10, checks = 0;   // c1은 좋고 c10은 나쁘다는 걸 직접 확인한 상태에서 시작
console.log("시작: c1 좋음=" + isGood(1) + ", c10 좋음=" + isGood(10));
while (bad - good > 1) {
  const mid = Math.floor((good + bad) / 2);
  const ok = isGood(mid);
  checks++;
  console.log("확인 " + checks + ": c" + mid + " → " + (ok ? "좋음" : "나쁨"));
  if (ok) good = mid; else bad = mid;      // 범위를 절반으로 줄인다
}
console.log("처음 나쁜 커밋: c" + bad + " (확인 " + checks + "번, 처음부터 순서대로 보면 최대 9번)");

// [고친 버전] 계산은 원 단위로 유지하고, 단위 변환은 화면에 보여 줄 때만 한다
const priceFixed = (unit, qty) => unit * qty * 1.1;
const label = won => Math.floor(won / 1000) + "천원";
console.log("고침:", priceFixed(1000, 3) >= 3000, label(priceFixed(1000, 3)));
`,
      codeLang: `javascript`,
      key: [
        `남의 코드는 전부 이해하지 말고 진입점 → 데이터 모양 → 증상에서 거꾸로 → 이벤트·상태·render 흐름 순서로 버그 경로만 읽는다.`,
        `이분 탐색은 후보를 절반씩 줄이며 log₂N번 확인한다. 코드 구간, 변경 이력, 입력, 환경 어디에나 적용된다.`,
        `git bisect는 good·bad 커밋만 알면 가운데를 체크아웃해 주고, run 모드에서는 종료 코드 0=좋음, 1~127(125 제외)=나쁨, 125=건너뜀이다.`,
        `빌드가 깨진 커밋은 exit 125로 건너뛰게 해야 엉뚱한 커밋이 범인으로 지목되지 않는다.`,
        `고치기 전에 현재 동작을 핵심 시나리오로 기록하고, 작업은 새 브랜치에서 원인별로 작게 커밋한다.`
      ],
      pitfalls: [
        `코드를 처음부터 끝까지 읽은 뒤에 디버깅을 시작하는 것. 읽을수록 의심할 곳이 늘어 길을 잃고, 가설 없이 읽으면 같은 파일을 몇 번이고 다시 읽게 됩니다.`,
        `bisect의 good 커밋을 확인하지 않고 "예전엔 됐다"는 기억을 믿는 것. 기준점이 틀리면 결과 전체가 틀립니다. good과 bad를 직접 실행해 확인하세요.`,
        `이력이 깨진 상태(빌드 실패, 마이그레이션 누락)를 bad로 기록하는 것. 시험할 수 없는 커밋은 건너뛰어야 합니다.`
      ]
    },
    {
      title: `버그를 고친 뒤 재발 방지와 통합 사례: 회귀 테스트·가드·고객 보고`,
      body: `고쳤다는 말은 "내 눈에 증상이 사라졌다"가 아니라 **같은 버그가 다시 나오면 기계가 알려 준다**는 뜻이어야 합니다. 이 레슨은 레슨 1~7을 하나의 의뢰로 묶습니다.

### 의뢰: "삭제한 뒤에 다른 항목이 체크돼요"
고객의 할 일 앱에 이런 제보가 들어옵니다. "가끔 제가 누른 항목이 아니라 다른 항목이 체크돼요. 지운 다음에 특히 그래요." 증상만으로는 DOM, 이벤트, 데이터 어느 쪽인지 알 수 없습니다.

1. **재현**: 고객 말과 화면 녹화를 비교해 "추가 3개 → 중간 삭제 → 새로 추가 → 새 항목 체크" 순서일 때만 일어남을 확정합니다. 기대는 새 항목만 체크, 실제는 다른 항목이 체크됩니다.
2. **범위 좁히기**: 화면은 상태에서 그려지므로 화면을 의심하기 전에 상태 저장소의 add, remove, toggle 세 함수만 따로 떼어 봅니다. 이미 렌더·이벤트 계층은 제외됩니다.
3. **가설**: "삭제 뒤에 만든 항목의 id가 기존 항목과 같아서 toggle이 먼저 찾은 쪽을 바꾼다." 예측: Console에서 id 목록을 찍으면 중복이 보여야 합니다.
4. **확인**: ‹todos.map(t => t.id)›가 ‹[1, 3, 3]›입니다. 원인은 새 id를 ‹todos.length + 1›로 만든 것입니다. 하나 지우면 개수가 줄어 다음 id가 남아 있는 항목과 겹칩니다.
5. **수정**: 지워도 줄지 않는 카운터로 id를 만듭니다.
6. **재발 방지**: 고객이 신고한 시나리오 그대로를 회귀 테스트로 남깁니다.
7. **영향 범위**: 이미 저장된 사용자 데이터에 중복 id가 있으면 새 코드도 오동작합니다. 불러올 때 id를 한 번 다시 매기는 마이그레이션을 계획합니다. 이 항목을 빠뜨리면 고쳤는데도 일부 고객에게 증상이 남습니다.

### 회귀 테스트: 실패를 먼저 본다
순서는 (1) 버그를 재현하는 테스트를 쓰고 (2) 수정 전에 **실제로 실패하는 것을 눈으로 확인**한 뒤 (3) 고치고 (4) 통과하는 것을 보고 (5) 남겨 둡니다. 2단계를 건너뛰면 항상 통과하는 테스트를 만들 수 있습니다. 대입(=)과 비교(===)를 혼동한 단언이 대표적입니다(MDN도 이 실수를 자주 나오는 오류로 꼽습니다). 또 MDN은 console.assert가 조건이 거짓일 때 콘솔에 오류 메시지를 쓰고 아무것도 돌려주지 않는다고 설명합니다. 예외를 던진다는 설명은 없고 실제로도 프로그램을 멈추지 않으므로, 자동화에서 실패로 처리되려면 예외를 던지거나 종료 코드를 바꾸는 단언 함수나 테스트 러너가 필요합니다. 아래 예제는 아주 작은 check 함수로 통과·실패를 세고, 가드가 있는 버전에서는 원인 위치(id 중복)에서 곧바로 예외가 나는 모습을 보여 줍니다.

### 가드: 어긋남을 원인 가까이에서 터뜨린다
- **경계 검증**: 사용자 입력은 들어오는 곳에서 Number·Number.isFinite, 빈 값, 범위로 검사합니다. 가드 없는 코드가 중간에서 조용히 NaN을 만드는 것보다 입구에서 이유와 함께 거부하는 편이 쌉니다.
- **불변식 검사**: id 중복 없음, 개수 일치 같은 문장을 데이터가 바뀌는 지점에 둡니다. 증상이 아니라 원인의 위치에서 실패합니다.
- **관측**: 처리되지 않은 오류와 unhandledrejection을 수집해 두면 다음 제보를 재현 없이 읽을 수 있습니다. 개인정보가 섞이지 않게 걸러야 합니다.

### 고객 보고서 3줄
"무엇이 문제였나(삭제 뒤 새 항목이 기존 항목과 같은 번호를 받아 엉뚱한 항목이 체크됨) / 무엇을 바꿨나(번호를 지워도 줄지 않게 부여, 불러올 때 중복 번호 정리) / 어떻게 확인했나(신고된 순서 그대로 자동 테스트, 같은 방식의 불변식 검사 추가)." 영향 범위, 롤백 방법, 아직 확인하지 못한 가정(예: 서버에 저장된 오래된 데이터)을 한 줄씩 덧붙이면 신뢰가 쌓입니다.`,
      code: `// 하나의 저장소 코드에서 id 만드는 방식만 바꿔 버그판/고친 판을 비교한다
function createStore(nextId, withGuard) {
  const todos = [];
  const guard = () => {                       // 불변식: id는 서로 달라야 한다
    if (new Set(todos.map(t => t.id)).size !== todos.length)
      throw new Error("id 중복: " + todos.map(t => t.id).join(","));
  };
  return {
    todos,
    add(title) { todos.push({ id: nextId(todos), title, done: false }); if (withGuard) guard(); },
    remove(id) { const i = todos.findIndex(t => t.id === id); if (i >= 0) todos.splice(i, 1); },
    toggle(id) { const t = todos.find(t => t.id === id); if (t) t.done = !t.done; },
  };
}
const buggyId = todos => todos.length + 1;                  // [버그] 지우면 개수가 줄어 id가 겹친다
const makeCounter = () => { let n = 0; return () => ++n; }; // [고침] 지워도 줄지 않는 카운터

// 회귀 테스트: 신고된 시나리오 그대로 (A,B,C 추가 → B 삭제 → D 추가 → D 체크)
function regression(label, store) {
  let pass = 0, fail = 0;
  const check = (name, ok) => { ok ? pass++ : fail++; console.log("  " + (ok ? "통과" : "실패") + ": " + name); };
  console.log(label);
  try {
    ["A", "B", "C"].forEach(t => store.add(t));
    store.remove(2); store.add("D");
    const d = store.todos.find(t => t.title === "D");
    store.toggle(d.id);
    check("D만 완료 상태", d.done && store.todos.filter(t => t.done).length === 1);
    check("id는 모두 다르다", new Set(store.todos.map(t => t.id)).size === store.todos.length);
  } catch (e) { fail++; console.log("  예외: " + e.message); }
  console.log("  결과: 통과 " + pass + " / 실패 " + fail);
}
regression("[버그 버전, 가드 없음]", createStore(buggyId, false));
regression("[버그 버전, 가드 있음]", createStore(buggyId, true));
regression("[고친 버전]", createStore(makeCounter(), true));
`,
      codeLang: `javascript`,
      key: [
        `수정의 끝은 재현 절차 재실행이 아니라 같은 버그를 기계가 다시 잡는 회귀 테스트와 영향 범위 확인이다.`,
        `테스트는 고치기 전에 실패하는 것을 먼저 눈으로 확인하고 나서 고친다. 그렇지 않으면 항상 통과하는 테스트를 만들 수 있다.`,
        `console.assert는 메시지만 출력하고 예외를 던지지 않으므로 자동화의 실패 신호가 되지 못한다. 던지는 단언이나 테스트 러너를 쓴다.`,
        `가드는 입구에서 입력을 검사하고, 불변식은 데이터가 바뀌는 지점에 둬서 증상이 아니라 원인 위치에서 실패하게 한다.`,
        `고객 보고는 문제·변경·확인 세 줄에 영향 범위(저장된 옛 데이터)와 롤백 방법을 붙인다.`
      ],
      pitfalls: [
        `새 코드만 고치고 이미 저장된 데이터(중복 id, 문자열 수량)를 그대로 두는 것. 일부 고객에게 증상이 계속 남아 재작업 의뢰가 됩니다.`,
        `테스트가 실제로 실패하는지 확인하지 않는 것. 비교 연산자 오타 하나로 영원히 통과하는 테스트가 만들어집니다.`,
        `같은 계열의 버그가 다른 곳에도 있는지 검색하지 않는 것. length + 1로 id를 만든 코드가 다른 저장소 함수에도 있을 수 있으니 같은 패턴을 전체 검색합니다.`
      ]
    }
  ],
  labs: [
    {
      title: `깨진 할 일 목록 고치기: 삭제·완료·필터·입력 버그`,
      scenario: `고객 제보입니다. "삭제 버튼을 눌러도 아무 일이 없어요. 완료를 누르면 화면이 안 바뀌어요. 그리고 가끔 엉뚱한 항목이 지워져요. 빈 칸으로도 추가가 돼요." 아래는 고객이 쓰던 프로그램입니다(줄 번호는 목록 번호와 같습니다). 새 폴더에 lab1.html로 그대로 옮겨 적고 Edge로 열어 시작하세요. 정답 코드는 제공하지 않습니다. 레슨의 방법으로 스스로 찾아 고치세요.

1. ‹<!doctype html><html lang="ko"><meta charset="utf-8"><body>›
2. ‹<input id="t"> <button id="add">추가</button> <label><input type="checkbox" id="only"> 안 한 일만</label>›
3. ‹<ul id="list"></ul> <p id="left"></p>›
4. ‹<script>›
5. ‹var $ = function (id) { return document.getElementById(id); };›
6. ‹var todos = [{ title: "우유", done: true }, { title: "빵", done: false }, { title: "계란", done: false }];›
7. ‹function render() {›
8. ‹  var shown = $("only").checked ? todos.filter(function (t) { return !t.done; }) : todos;›
9. ‹  $("list").innerHTML = "";›
10. ‹  for (var i = 0; i < shown.length; i++) {›
11. ‹    var li = document.createElement("li");›
12. ‹    li.textContent = shown[i].title + (shown[i].done ? " (완료) " : " ");›
13. ‹    var done = document.createElement("button");›
14. ‹    done.textContent = "완료";›
15. ‹    done.onclick = function () { shown[i].done = true; };›
16. ‹    var del = document.createElement("button");›
17. ‹    del.textContent = "삭제";›
18. ‹    del.onclick = function () { todos.splice(i, 1); render(); };›
19. ‹    li.append(done, del);›
20. ‹    $("list").append(li);›
21. ‹  }›
22. ‹  $("left").textContent = "남은 일: " + todos.filter(function (t) { return !t.done; }).length;›
23. ‹}›
24. ‹$("add").onclick = function () { todos.push({ title: $("t").value, done: false }); render(); };›
25. ‹$("only").onchange = render;›
26. ‹render();›
27. ‹</script>›

합격 시나리오(매번 페이지를 새로 고친 뒤 시작합니다).
- T1: 필터를 끈 채 "빵" 삭제 → 목록은 우유 (완료)와 계란, 아래 문구는 "남은 일: 1".
- T2: "안 한 일만"을 켜고(빵과 계란이 보입니다) "빵" 삭제 → 필터를 끄면 우유 (완료)와 계란이 보이고 "남은 일: 1".
- T3: "빵"의 완료 클릭 → 즉시 빵 (완료)로 바뀌고 "남은 일: 1".
- T4: 빈 칸 또는 공백만 입력하고 추가 → 항목 수가 변하지 않음.
- T5: T1~T4를 하는 동안 Console에 빨간 오류가 0건.`,
      steps: [
        `lab1.html을 만들고 위 27줄을 옮겨 적은 뒤 Edge로 열고 F12로 Console을 연다. 먼저 수정 없이 T1~T5를 차례로 실행해 어떤 것이 실패하는지 표로 기록한다.`,
        `디버깅 노트 1번을 쓴다. 증상(삭제 눌러도 변화 없음)의 재현 절차, 기대 값, 실제 값을 적는다.`,
        `삭제·완료 버튼이 왜 이런지 가설을 둘 이상 쓰고, 15행과 18행에 중단점을 걸거나 console.log(i, shown.length)를 찍어 예측과 비교한다.`,
        `확인된 원인 하나만 고친다. 다시 T1~T5를 돌려 해결된 것과 새로 드러난 증상을 표에 갱신한다.`,
        `새로 드러난 증상(필터를 켠 삭제, 완료 뒤 화면과 남은 일 문구 미갱신)을 같은 방식으로 한 번에 하나씩 노트 2번, 3번으로 기록하며 고친다.`,
        `빈 칸·공백 입력을 거부하는 가드를 추가하고, 추가에 성공하면 입력창을 비운다.`,
        `render의 끝에 불변식 검사를 최소 두 개 넣는다. 예: 화면 li 개수 === 보이는 항목 수, 문구의 숫자 === 안 한 일 개수. 조건이 거짓이면 Error를 던진다.`,
        `Elements 패널의 Event Listeners 탭에서 추가 버튼에 click 리스너가 정확히 1개인지 확인하고, 최종 파일로 T1~T5를 다시 돌려 결과를 캡처한다.`
      ],
      accept: [
        `T1~T5가 모두 기대한 문구와 목록대로 나온다(수정 전 실패 항목과 수정 후 통과 항목이 표로 비교되어 있다).`,
        `디버깅 노트가 3건 이상이고 각 건에 재현 절차, 가설, 확인 방법, 원인 한 줄, 수정 내용이 있다. 한 번에 한 곳만 고친 흔적(수정 후 재실행 결과)이 남아 있다.`,
        `원본 대비 바뀐 줄이 25줄 이하이고 새 전역 변수를 늘리지 않았다.`,
        `render 끝의 불변식 검사가 2개 이상이며, 일부러 상태를 망가뜨려 보면(예: todos를 직접 비움) 검사가 Error로 알려 준다.`
      ],
      stretch: `삭제 항목을 5초 동안 "실행 취소"할 수 있게 하되, 취소가 상태와 화면 양쪽에 일관되게 반영되도록 불변식 검사를 확장해 보세요. 이벤트 위임으로 리스너를 목록 하나에만 붙이는 버전도 만들어 Event Listeners 탭의 개수를 비교해 보세요.`
    },
    {
      title: `깨진 상품 카드 레이아웃 고치기: 폭·명시도·넘치는 문자열`,
      scenario: `고객 제보입니다. "상품 카드가 세 장 한 줄로 나와야 하는데 세 번째가 아래로 떨어져요. 담기 버튼 글씨가 회색이라 안 보여요. 긴 상품명이 카드 밖으로 삐져나와서 모바일에서 가로로 스크롤돼요." 아래 코드를 lab2.html로 옮겨 적고 열어 시작하세요. 측정은 창 너비 900px에서 합니다(DevTools의 기기 에뮬레이션 반응형 모드에서 너비를 900으로 맞추면 됩니다). 정답은 제공하지 않습니다.

작업 방식도 평가 대상입니다. 한 번에 하나만 고치고, 고칠 때마다 아래 측정 명령 A~D를 다시 실행해 결과를 표로 남기세요. 첫 증상을 고친 뒤 다음 증상이 새로 드러나는 것은 정상이며, 그 과정을 노트에 적는 것이 이 실습의 핵심입니다. 세로 스크롤바가 생겨 폭 숫자가 달라지지 않도록 페이지는 짧게 유지하고, 숫자가 이상하면 창을 새로 고친 뒤 다시 재세요. 고객은 코드를 보지 않고 화면만 보므로, 마지막에는 눈으로도 세 카드가 가지런한지 확인합니다.

1. ‹<!doctype html><html lang="ko"><meta charset="utf-8">›
2. ‹<style>›
3. ‹body { margin: 0; font: 16px sans-serif; }›
4. ‹.grid { display: flex; flex-wrap: wrap; }›
5. ‹.card { width: 33.33%; padding: 16px; border: 1px solid #999; }›
6. ‹.card h3 { margin: 0 0 8px; }›
7. ‹#shop a { color: #888; text-decoration: none; }›
8. ‹.btn { color: #fff; background: #d33; padding: 6px 12px; border-radius: 4px; }›
9. ‹</style>›
10. ‹<div id="shop"><div class="grid">›
11. ‹<div class="card"><h3>머그컵</h3><a class="btn" href="#">담기</a></div>›
12. ‹<div class="card"><h3>노트</h3><a class="btn" href="#">담기</a></div>›
13. ‹<div class="card"><h3>Stainless_Steel_Vacuum_Insulated_Thermos_1200ml</h3><a class="btn" href="#">담기</a></div>›
14. ‹</div></div>›

측정 명령(Console에 붙여 넣어 실행합니다).
- A: ‹[...document.querySelectorAll('.card')].map(c => Math.round(c.getBoundingClientRect().top))›
- B: ‹getComputedStyle(document.querySelector('.btn')).color›
- C: ‹document.documentElement.scrollWidth <= innerWidth›
- D: ‹[...document.querySelectorAll('.card')].every(c => c.scrollWidth <= c.clientWidth)›`,
      steps: [
        `lab2.html을 만들고 창 너비를 900px로 맞춘 뒤 측정 명령 A~D를 수정 전에 실행해 결과를 기록한다(A의 세 번째 값이 앞의 두 값보다 커야, 즉 세 번째 카드가 다음 줄로 내려가야 재현된 것이다).`,
        `Inspect로 첫 카드를 잡고 박스 모델 그림에서 카드의 실제 가로 폭과 padding·border 값을 읽어, 33.33%만으로 왜 세 장이 한 줄에 못 들어가는지 계산식으로 노트에 적는다.`,
        `담기 버튼을 Inspect해 Styles에서 취소선이 그어진 color 선언을 찾고, 어느 규칙이 이겼는지 두 규칙의 명시도를 ID-클래스-요소 세 칸으로 적는다.`,
        `카드 폭 문제 하나만 고치고 A~D를 다시 실행한다. 새로 드러난 증상(가로 스크롤)을 노트에 기록한다.`,
        `Console에서 화면 밖으로 나간 요소를 찾는 한 줄을 직접 만들어 실행해 범인을 확인한다.`,
        `긴 문자열 문제를 고치고 버튼 색 문제를 고친다. 둘 다 !important 없이, 새 ID 선택자 없이 해결한다.`,
        `창 너비를 360, 600, 900px로 바꿔 가며 C와 D를 다시 실행하고 세 폭의 결과를 표로 남긴다.`,
        `DevTools의 Changes 도구(Command Menu에서 Show Changes)로 내가 바꾼 CSS 목록을 확인해 노트에 붙인다.`
      ],
      accept: [
        `너비 900px에서 A는 세 값이 모두 같고, B는 rgb(255, 255, 255), C는 true, D는 true가 나온다.`,
        `수정한 CSS에 !important가 0개이고 새 ID 선택자를 추가하지 않았다.`,
        `360px와 600px에서도 C와 D가 true이다(결과표 첨부).`,
        `노트에 박스 모델 계산식(폭 + padding + border)과 두 규칙의 명시도 비교가 적혀 있고, 고친 줄마다 어떤 증상을 고쳤는지 한 줄씩 대응되어 있다.`
      ],
      stretch: `카드를 CSS Grid로 다시 만들어 보세요(auto-fit과 minmax 사용). 같은 측정 명령 A~D가 360~1200px 모든 폭에서 통과하는지 확인하고, flex 버전보다 줄어든 규칙 수와 이유를 적어 보세요.`
    },
    {
      title: `의뢰 티켓 처리: 장바구니 합계 오류 4건 수정과 납품 노트`,
      scenario: `클라이언트 티켓입니다. "쇼핑몰 장바구니의 합계가 가끔 이상해요. (1) 쿠폰을 적용한 화면을 다시 그리면 할인이 두 번 들어갑니다. (2) 합계에 8491.5원처럼 소수점이 나옵니다. (3) 머그컵 수량 '+' 버튼을 누르면 3이 아니라 21이 됩니다. (4) 정확히 30,000원인 주문에 배송비가 붙습니다. 이번 주 안에 고치고, 무엇이 문제였는지 비전문가인 대표가 읽을 수 있게 정리해 주세요." 확정된 규칙은 이렇습니다. 쿠폰은 0~100 퍼센트, 단가마다 할인가를 원 단위로 반올림(Math.round)한 뒤 수량을 곱합니다. 합계 30,000원 이상은 배송비 0원, 미만은 3,000원입니다. 수량은 1 이상의 정수입니다. 현재 코드(cart.js)는 다음과 같습니다. 줄 번호는 목록 번호입니다.

1. ‹var cart = [{ name: "머그컵", price: 12900, qty: "2" }, { name: "노트", price: 3300, qty: 3 }, { name: "펜", price: 1990, qty: 5 }];›
2. ‹function applyCoupon(items, percent) {›
3. ‹  for (var i = 0; i < items.length; i++) { items[i].price = items[i].price * (1 - percent / 100); }›
4. ‹  return items;›
5. ‹}›
6. ‹function addOne(item) { item.qty = item.qty + 1; }›
7. ‹function subtotal(items) {›
8. ‹  var sum = 0;›
9. ‹  for (var i = 0; i < items.length; i++) { sum += items[i].price * items[i].qty; }›
10. ‹  return sum;›
11. ‹}›
12. ‹function shipping(sum) { return sum > 30000 ? 0 : 3000; }›
13. ‹function checkout(items, percent) {›
14. ‹  var sum = subtotal(applyCoupon(items, percent));›
15. ‹  return { sum: sum, shipping: shipping(sum), total: sum + shipping(sum) };›
16. ‹}›

납품물은 (a) 수정된 cart.js, (b) test.html 또는 test.js에 담긴 회귀 테스트, (c) 증상별 디버깅 노트 4건, (d) 대표님용 3줄 요약입니다. 기대 값 예: 위 cart로 checkout(cart, 10)을 두 번 불러도 둘 다 sum 41085, total 41085입니다.`,
      steps: [
        `cart.js로 저장하고 test.html에서 script 태그로 불러온 뒤 Console에서 함수들을 호출할 수 있게 한다. 원본 파일은 cart.orig.js로 복사해 보관한다.`,
        `티켓의 네 증상을 각각 재현하는 호출문을 쓰고 실제 출력을 재현표에 기록한다. 재현이 안 되는 증상이 있으면 어떤 추가 정보가 필요한지 적는다.`,
        `증상마다 실패하는 테스트를 먼저 쓴다. 경계값(29999, 30000)과 같은 장바구니를 두 번 계산하는 경우를 포함해 확인 항목을 8개 이상 만든다. 테스트는 거짓이면 Error를 던지는 check 함수로 직접 만든다.`,
        `cart.orig.js에 테스트를 돌려 실패 목록을 캡처한다. 4개 이상 실패해야 테스트가 버그를 잡는 것이다.`,
        `증상 하나씩 고친다. 고칠 때마다 전체 테스트를 다시 돌려 이전에 통과하던 항목이 깨지지 않았는지 확인하고, 수정은 증상당 하나의 diff 또는 커밋으로 분리한다.`,
        `가드를 추가한다. percent는 0~100 숫자, qty는 1 이상의 정수가 아니면 이유를 담은 RangeError나 TypeError를 던진다.`,
        `저장돼 있던 옛 데이터(qty가 문자열 "2")가 들어와도 동작하도록 불러올 때 정규화하는 함수를 만들고, 정규화에 대한 테스트도 추가한다.`,
        `디버깅 노트 4건(증상 → 재현 → 가설과 확인 → 원인 → 수정 → 검증)과 대표님용 3줄 요약, 영향 범위·롤백 방법 한 줄씩을 쓴다.`,
        `시크릿 창에서 test.html을 새로 열어 Console에 빨간 오류가 0건인지, 테스트가 전부 통과하는지 캡처한다.`
      ],
      accept: [
        `수정본에서 checkout(cart, 10)을 두 번 불러도 둘 다 sum 41085, shipping 0, total 41085이고 cart[0].price가 12900 그대로다.`,
        `가격 3330, 수량 3, 쿠폰 15는 sum 8493, total 11493이고 모든 합계가 정수이다. 합계 30000은 배송비 0, 29999는 3000이다. addOne 뒤 수량은 숫자 3이다.`,
        `테스트가 8개 이상이고, 원본(cart.orig.js)에서 4개 이상 실패하며 수정본에서는 전부 통과한 캡처가 있다. 거부 규칙도 통과한다. 쿠폰 150은 checkout에서, 수량 "abc"인 항목은 addOne에서, 수량 -1과 1.5인 항목은 checkout에서 오류를 던진다.`,
        `디버깅 노트 4건과 3줄 요약이 있고, 요약에는 전문용어 없이 문제·변경·확인 방법이 들어 있으며 옛 데이터 처리와 롤백 방법이 한 줄씩 적혀 있다.`
      ],
      stretch: `원본 코드에서 시작해 증상 하나씩을 고치는 커밋 네 개짜리 git 저장소를 만든 뒤, 일부러 마지막 커밋에 회귀를 넣고 git bisect run과 자신의 테스트 스크립트로 범인 커밋을 자동으로 찾아 보세요. 빌드가 필요 없다면 125를 쓰는 경우가 언제인지도 적어 보세요.`
    }
  ],
  quiz: [
    {
      q: `[고객 문의] 저장 버튼을 눌러도 가끔 저장이 안 돼요. 어제는 됐어요.
[내 PC 재현 시도] Chrome, 같은 계정, 짧은 메모("우유")로 5번 저장 → 5번 모두 성공
[고객이 보내 준 Network 캡처] POST /api/memos   Status 413   Request size 2.4 MB

다음 행동으로 가장 적절한 것은?`,
      choices: [
        `저장 함수를 try/catch로 감싸 실패가 화면에 나오지 않게 하고, 내 PC에서 5번 연속 성공한 결과를 근거로 수정했다고 고객에게 답한다`,
        `내 시도는 요청 크기가 달랐다. 약 2.4MB 메모로 같은 413을 재현하고 어제와 달라진 점(배포·설정·메모 크기)을 좁힌다`,
        `5번 모두 성공했으니 재현되지 않는 고객 PC나 회선의 문제로 보고, 다른 브라우저에서 다시 해 보라고 안내한 뒤 문의를 닫는다`,
        `재현하기 전에 서버의 업로드 제한을 무제한으로 풀어 두면 같은 오류가 다시 나지 않으므로 먼저 배포한다`
      ],
      answer: 1,
      why: `재현은 고객의 조건으로 해야 합니다. 내 시도는 짧은 메모라 413(요청 본문이 서버 한도보다 큼)이 날 수 없는 조건이었고, 캡처의 Status와 요청 크기가 곧 단서입니다. try/catch는 증상만 가리고, 고객 환경 탓으로 돌리면 단서를 버리게 됩니다. 제한을 무제한으로 푸는 것은 어디서(서버·프록시) 막혔는지와 어제 무엇이 달라졌는지를 모른 채 서버를 위험하게 만드는 땜질입니다.`
    },
    {
      q: `[Console] Uncaught (in promise) SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
[Network] todos.json   Status 404   Type fetch   Initiator app.js:22
[app.js 22행] const data = await (await fetch('/api/todos.json')).json();

원인과 올바른 수정은?`,
      choices: [
        `todos.json 파일 끝에 쉼표 같은 문법 오류가 남아 있어 JSON 파서가 실패했다. JSON 검사기로 파일 문법부터 고친다`,
        `fetch가 404에서 예외를 던졌는데 그 예외를 처리하지 않은 것이다. 호출을 try/catch로 감싸 오류를 조용히 넘긴다`,
        `서버가 404 HTML 오류 페이지를 줬는데 fetch는 이를 정상 응답으로 넘겼다. 주소를 고치고 json() 전에 res.ok를 확인한다`,
        `브라우저가 옛 응답을 캐시에서 꺼내 와 본문이 깨졌다. 개발자 도구에서 Disable cache를 켜고 새로고침하면 해결된다`
      ],
      answer: 2,
      why: `Status가 404이고 본문이 HTML(<!DOCTYPE)이라 JSON 파서가 첫 글자 <에서 실패한 것입니다. fetch는 HTTP 오류 상태에서도 거부되지 않으므로 try/catch만 추가하면 잘못된 주소가 그대로 남습니다. 파일 문법 문제라면 메시지가 DOCTYPE이 아니라 JSON 안의 위치를 말했을 것이고, 캐시 문제라면 Status가 404가 아니었을 것입니다.`
    },
    {
      q: `[고객 PC의 Console]
Uncaught TypeError: Cannot read properties of null (reading 'value')
    at readQty (cart.js:14:38)
    at onSubmit (cart.js:31:15)
    at HTMLFormElement.<anonymous> (cart.js:52:3)

[cart.js 14행]
  return Number(document.querySelector('#qty').value);

가장 먼저 확인할 것은?`,
      choices: [
        `14행 querySelector('#qty')가 null을 돌려준 이유. 그 시점의 DOM에 id가 qty인 요소가 있는지(철자·렌더 타이밍)`,
        `Number()에 넘어온 입력이 변환할 수 없는 문자열인지. 사용자가 숫자가 아닌 값을 넣었을 가능성부터 본다`,
        `스택 맨 아래인 52행의 submit 리스너 등록이 잘못됐는지. 가장 먼저 실행된 줄이 근본 원인일 가능성이 높다`,
        `고객 PC의 브라우저가 value 속성을 지원하지 않는 오래된 버전일 수 있다. 브라우저 버전부터 확인한다`
      ],
      answer: 0,
      why: `메시지가 null의 value를 읽으려 했다고 말하고 맨 위 프레임이 readQty의 14행 38열이므로, null을 만든 것은 같은 줄의 querySelector입니다. Number 변환 문제라면 TypeError가 아니라 NaN이 나왔을 것이고, 아래 프레임은 호출 경로일 뿐 던진 곳이 아닙니다.`
    },
    {
      q: `[코드]
for (var i = 1; i <= 3; i++) {
  document.querySelector('#b' + i).addEventListener('click', () => alert('버튼 ' + i));
}

[증상] 버튼 1, 2, 3 중 무엇을 눌러도 '버튼 4'가 뜬다. 원인과 수정은?`,
      choices: [
        `querySelector는 같은 선택자에 맞는 마지막 요소만 돌려준다. querySelectorAll과 forEach로 바꾼다`,
        `alert 안에서 숫자 i가 먼저 계산돼 4가 된다. String(i)로 바꿔 문자열로 고정한다`,
        `같은 버튼에 리스너가 여러 번 등록돼 마지막 등록분이 이긴다. removeEventListener로 이전 것을 지운다`,
        `var i는 세 콜백이 함께 쓰는 변수 하나이고 클릭 시점엔 4다. let으로 바꿔 반복마다 새 변수를 만든다`
      ],
      answer: 3,
      why: `콜백은 값이 아니라 변수 i를 붙잡고, 클릭할 때 i는 반복이 끝난 뒤의 값 4입니다. querySelector는 선택자에 맞는 요소를 정확히 찾았고(각 버튼에 리스너가 붙었으므로) 문자열 변환은 결과를 바꾸지 못하며, 리스너 중복이라면 알림이 여러 번 떴을 것입니다.`
    },
    {
      q: `[코드]
async function loadUser() {
  const res = await fetch('/api/me');
  return res.json();
}
function showName() {
  const user = loadUser();
  document.title = user.name;
}

[증상] 탭 제목에 이름이 안 나온다. Console에서 console.log(user)를 찍어 보면 Promise {<pending>}이 보인다. 가장 가능성 높은 원인과 수정은?`,
      choices: [
        `res.json()이 동기 함수여야 하는데 return에 await가 없어 Promise가 새어 나왔다. return await res.json()으로 바꾼다`,
        `loadUser()는 항상 Promise를 돌려주는데 showName이 기다리지 않는다. async로 바꾸고 await loadUser()로 받는다`,
        `fetch 주소가 틀려 서버가 응답하지 않아 아직 대기 중이다. Network에서 주소를 확인해 바로잡는다`,
        `document.title은 렌더링이 끝난 뒤에만 바꿀 수 있다. setTimeout으로 감싸 한 박자 늦게 실행한다`
      ],
      answer: 1,
      why: `async 함수의 반환값은 항상 Promise이고, user.name은 Promise 객체의 속성을 읽는 것이라 이름이 나올 수 없습니다. return await를 붙여도 loadUser가 Promise를 돌려주는 것은 같고, 주소가 틀렸다면 Network에 실패나 404가 보였을 것입니다. setTimeout을 끼워도 Promise를 기다리지 않는 구조는 그대로입니다.`
    },
    {
      q: `[코드]
const a = document.querySelector('#a').value;   // 사용자가 3 입력
const b = document.querySelector('#b').value;   // 사용자가 4 입력
result.textContent = a + b;

[증상] 결과가 7이 아니라 34다. 올바른 수정은?`,
      choices: [
        `result.textContent가 숫자를 그대로 받지 못하고 문자열로 바꿔 붙인다. innerText로 바꾸면 계산된 값이 표시된다`,
        `둘 중 한쪽만 숫자로 만들면 나머지도 따라 바뀐다. a * 1 + b로 바꿔 덧셈이 숫자 연산이 되게 한다`,
        `value는 문자열이라 +가 이어 붙이기가 된다. Number(a) + Number(b)로 바꾸고 isFinite로 검사한다`,
        `const 때문에 값이 문자열로 굳어진다. let으로 바꿔 숫자 타입이 유지되게 한 뒤 a + b를 그대로 쓴다`
      ],
      answer: 2,
      why: `input의 value는 숫자를 입력해도 문자열이라 더하기가 이어 붙이기가 됩니다. a * 1 + b는 앞쪽만 숫자가 되고 3 + "4"는 다시 "34"가 되므로 틀린 수정이고, 선언 방식(let)이나 출력 속성은 값의 타입과 무관합니다.`
    },
    {
      q: `[코드]
class Timer {
  seconds = 0;
  start() { setInterval(this.tick, 1000); }
  tick() { this.seconds++; console.log(this.seconds); }
}
new Timer().start();

[Console] NaN  NaN  NaN ...

원인과 수정은?`,
      choices: [
        `seconds = 0 같은 클래스 필드는 인스턴스가 아니라 클래스에 생긴다. constructor 안에서 this.seconds = 0으로 초기화한다`,
        `setInterval은 함수가 아니라 문자열 코드를 받아야 한다. 'this.tick()' 문자열로 넘긴다`,
        `tick이 1초 뒤 비동기로 실행돼 seconds가 아직 정해지지 않은 상태다. tick 앞에 await를 붙인다`,
        `this.tick만 넘기면 호출 때 this가 Timer 인스턴스가 아니다. () => this.tick() 또는 bind로 this를 고정한다`
      ],
      answer: 3,
      why: `this는 호출 방식으로 정해지고, 타이머는 콜백을 전역 객체를 this로 호출하므로 this.seconds는 전역의 빈 속성이고 ++ 결과가 NaN입니다. 클래스 필드는 인스턴스에 정상 생성되고, 문자열 코드를 넘기는 것은 권장되지 않는 오래된 방식이며, tick은 비동기 함수가 아닙니다.`
    },
    {
      q: `[CSS]
#sidebar a { color: gray; }
.link.active { color: red; }

[HTML]
<div id="sidebar"><a class="link active" href="/">홈</a></div>

[증상] 홈 링크가 빨강이 아니라 회색이다. 올바른 설명과 수정은?`,
      choices: [
        `ID 1개+요소 1개(1-0-1)가 클래스 2개(0-2-0)보다 강하다. 첫 규칙을 :where(#sidebar) a로 낮춘다`,
        `나중에 선언된 규칙이 항상 이긴다. .link.active 규칙을 #sidebar a 규칙보다 아래로 옮기면 빨강이 된다`,
        `클래스 2개짜리 선택자가 ID보다 구체적이라 빨강이 이겨야 한다. CSS가 캐시된 것이니 강력 새로고침한다`,
        `color는 상속 속성이라 부모의 값이 자식에 직접 걸린 규칙보다 우선한다. 부모의 color 선언을 지운다`
      ],
      answer: 0,
      why: `명시도는 ID, 클래스, 요소 세 칸을 왼쪽부터 비교하므로 ID가 하나라도 있으면 클래스 둘보다 강합니다. 순서는 명시도가 같을 때만 의미가 있고, 상속은 요소에 직접 걸린 규칙보다 항상 약합니다.`
    },
    {
      q: `[CSS]
.panel { width: 100%; padding: 16px; border: 1px solid #ccc; }

[증상] 폭 360px 휴대폰에서 가로 스크롤이 생기고 .panel의 오른쪽이 잘린다. 원인과 수정은?`,
      choices: [
        `body에 overflow-x: hidden을 주면 넘친 부분이 가려져 스크롤이 사라지므로 문제가 해결된다`,
        `내용 폭 100%에 padding 32px·border 2px이 더해져 34px 넘친다. box-sizing: border-box로 바꾼다`,
        `width: 100%가 부모가 아니라 화면 폭 기준이라 넘친다. width를 100vw로 바꾸면 화면에 정확히 맞는다`,
        `padding을 px로 쓰면 화면이 작아져도 줄지 않아 넘친다. padding을 %로 바꾸면 부모 폭에 맞춰 줄어든다`
      ],
      answer: 1,
      why: `기본 box-sizing(content-box)에서는 padding과 border가 width 바깥에 더해집니다. overflow-x: hidden은 넘침을 가릴 뿐이라 잘린 오른쪽이 그대로이고, 100vw는 세로 스크롤바 폭 때문에 오히려 넘치기 쉬우며, padding 단위를 바꿔도 더해지는 구조는 같습니다.`
    },
    {
      q: `[코드]
function render() {
  list.innerHTML = '';
  todos.forEach(t => list.append(makeItem(t)));
  addBtn.addEventListener('click', () => { todos.push(input.value); render(); });
}
render();

[QA 보고] 추가 버튼을 1번째 눌렀을 때는 1개, 2번째에는 2개, 3번째에는 4개가 한꺼번에 늘어난다. 원인과 수정은?`,
      choices: [
        `innerHTML = ''가 이전 항목을 제대로 지우지 못해 항목이 중복된다. list.remove()로 바꿔 목록을 다시 만든다`,
        `이벤트 버블링으로 클릭이 부모까지 전달돼 핸들러가 여러 번 실행된다. 핸들러에서 event.stopPropagation()을 호출한다`,
        `render()가 불릴 때마다 같은 버튼에 새 화살표 함수 리스너가 하나씩 더 붙는다. 등록을 render 밖으로 옮겨 한 번만 붙인다`,
        `todos.push가 비동기라 같은 값이 여러 번 들어간다. push를 setTimeout으로 감싸 실행 순서를 맞춘다`
      ],
      answer: 2,
      why: `render가 호출될 때마다 새 화살표 함수 리스너가 하나 늘고 각 리스너가 다시 render를 부르므로 한 번 클릭에 추가되는 개수가 1, 2, 4로 배가됩니다. 버블링은 부모 요소의 리스너를 부르는 현상이라 같은 버튼의 리스너 수와 무관하며, push는 동기 함수입니다.`
    },
    {
      q: `[bisect.sh]
#!/bin/sh
npm run build || exit 1
npm test

[실행]
$ git bisect start HEAD v1.4.0
$ git bisect run ./bisect.sh
3b1c9e2 is the first bad commit
    chore: 빌드 설정 파일 이동

[팀 확인] 그 커밋은 테스트가 아니라 빌드를 깨뜨린 커밋이었고 진짜 문제는 그 뒤 커밋이다. 스크립트의 어떤 부분이 문제이고 어떻게 고쳐야 할까?`,
      choices: [
        `bisect run은 출력 문구로 좋음·나쁨을 판정하므로 스크립트 끝에서 echo good 또는 echo bad를 출력해야 한다`,
        `npm test가 실패할 때 1이 아닌 코드를 내면 bisect가 나쁨으로 읽지 못한다. npm test || exit 1로 바꾼다`,
        `빌드가 깨진 커밋은 좋음으로 기록해야 범위가 줄어든다. npm run build || exit 0으로 빌드 실패를 통과시킨다`,
        `빌드 실패를 exit 1로 내면 시험도 못 한 커밋이 나쁨이 된다. npm run build || exit 125로 건너뛴다`
      ],
      answer: 3,
      why: `git 문서에서 종료 코드 0은 좋음, 1~127(125 제외)은 나쁨, 125는 건너뛰기입니다. 빌드가 깨진 커밋을 exit 1로 내면 시험도 못 한 커밋이 나쁨으로 기록됩니다. exit 0으로 숨기면 반대로 나쁜 커밋을 좋음으로 잘못 기록합니다. bisect run은 출력 문구가 아니라 종료 코드로 판정하고, 스크립트의 마지막 명령(npm test)의 종료 코드는 이미 그대로 전달됩니다.`
    },
    {
      q: `[회귀 테스트]
function testTotal() {
  let result = total([{ price: 1000, qty: 2 }]);
  console.assert(result = 2000, 'total이 틀림');
}
testTotal();

[상황] total에 같은 버그를 일부러 다시 넣었는데도 CI가 계속 통과한다. 이 테스트가 버그를 못 잡는 가장 직접적인 이유와 올바른 보완은?`,
      choices: [
        `result = 2000은 대입이라 늘 참이다. ===로 고치고 예외를 던지는 단언으로 바꾸며, 버그를 넣어 실패를 확인한다`,
        `console.assert는 브라우저 밖에서는 동작하지 않아 CI에서 건너뛴다. Node의 assert 모듈로 바꾸는 것만으로 충분하다`,
        `price와 qty가 문자열이라 곱셈이 NaN이 되고 NaN은 단언에서 건너뛴다. Number()로 변환해 비교한다`,
        `console.assert의 두 번째 인자는 메시지가 아니라 기대값이라 비교가 어긋난다. 인자 순서를 바꾼다`
      ],
      answer: 0,
      why: `대입식 result = 2000의 값은 2000이라 항상 참이므로 단언이 절대 실패하지 않습니다. 비교로 고쳐도 console.assert는 메시지만 출력하고 예외를 던지지 않으므로 자동화가 실패로 인식하게 하려면 예외나 종료 코드가 필요하고, 마지막으로 테스트가 실제로 실패하는 순간을 눈으로 확인해야 합니다. Node의 assert로 바꿔도 대입식이 남아 있으면 계속 통과합니다.`
    }
  ],
  refs: [
    {
      title: `Overview of DevTools - Microsoft Edge Developer documentation`,
      url: `https://learn.microsoft.com/en-us/microsoft-edge/devtools/overview`,
      kind: `doc`,
      why: `Edge에서 DevTools를 여는 방법(F12, Ctrl+Shift+I·J·C), Activity Bar의 도구 구성, Command Menu(Ctrl+Shift+P)와 Quick View 사용법을 공식 문서로 확인한다(2026-11 기준 갱신본).`
    },
    {
      title: `Get started debugging JavaScript - Microsoft Edge DevTools`,
      url: `https://learn.microsoft.com/en-us/microsoft-edge/devtools/javascript/`,
      kind: `doc`,
      why: `5 + 1이 51로 나오는 데모 버그를 재현하고 이벤트 리스너 중단점, 단계 실행, 줄 중단점, Scope·Watch·Console로 값의 타입을 확인한 뒤 고치는 공식 튜토리얼이라 레슨 1·2·4의 방법을 손으로 따라 해 볼 때 쓴다.`
    },
    {
      title: `Pause your code with breakpoints - Chrome DevTools`,
      url: `https://developer.chrome.com/docs/devtools/javascript/breakpoints`,
      kind: `doc`,
      why: `줄·조건 줄·로그포인트·DOM 변경·XHR/fetch(주소 일부 문자열)·이벤트 리스너·예외·함수 중단점의 종류와 쓰임새를 정리해 레슨 2·6에서 상황별로 어떤 중단점을 걸지 고르는 근거가 된다.`
    },
    {
      title: `Chrome DevTools - Network features reference`,
      url: `https://developer.chrome.com/docs/devtools/network/reference`,
      kind: `doc`,
      why: `Network 표의 Status·Initiator·Waterfall 열, Preserve log·Disable cache·Throttling, Headers·Payload·Response 탭, fetch/cURL로 복사하는 방법을 정리한 레퍼런스라 레슨 2의 읽는 순서를 확인하는 데 쓴다.`
    },
    {
      title: `MDN - What went wrong? Troubleshooting JavaScript`,
      url: `https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/What_went_wrong`,
      kind: `doc`,
      why: `문법·논리·런타임 오류의 구분, 오류 메시지의 줄이 진짜 원인이 아닐 수 있다는 경고, 같은 오류를 Firefox와 Chrome이 다른 문구로 보여 주는 예, 대입(=)과 비교(===) 혼동 사례를 실제 코드로 보여 주는 입문 디버깅 글이다.`
    },
    {
      title: `MDN - Error.prototype.stack`,
      url: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/stack`,
      kind: `doc`,
      why: `stack이 표준이 아니고 엔진마다 형식이 다르며(Firefox는 함수@파일:줄:열, Chrome은 at 함수 (파일:줄:열)) 이벤트 리스너·타이머·Promise 콜백이 각자 새 호출 체인을 시작한다는 점을 설명해 레슨 3의 스택 읽기 주의사항의 근거가 된다.`
    },
    {
      title: `MDN - this`,
      url: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this`,
      kind: `doc`,
      why: `this가 호출 방식으로 정해지는 규칙(메서드 호출, 단독 호출, strict 모드, 클래스 본문, 화살표 함수, bind, 이벤트 핸들러)을 예제와 함께 정리해 레슨 4의 this 유실 버그의 근거다.`
    },
    {
      title: `MDN - JavaScript execution model`,
      url: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop`,
      kind: `doc`,
      why: `호출 스택, 작업 큐, 한 작업이 끝나야 다음 작업이 도는 run-to-completion 규칙, 마이크로태스크가 작업보다 먼저 처리되는 우선순위를 설명해 비동기 버그에서 실행 순서를 예측하는 심성 모델을 준다.`
    },
    {
      title: `MDN - Using the Fetch API`,
      url: `https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_fetch`,
      kind: `doc`,
      why: `fetch가 404 같은 HTTP 오류 상태에서는 Promise를 거부하지 않으므로 response.ok나 status를 직접 확인해야 한다는 점과 네트워크 오류·중단(AbortError)으로 거부되는 경우를 보여 줘 레슨 4와 퀴즈 2의 근거가 된다.`
    },
    {
      title: `MDN - CSS specificity`,
      url: `https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity`,
      kind: `doc`,
      why: `ID-클래스-요소 세 칸 계산, :where·:is·:not의 가중치, 인라인 스타일과 !important, 동률일 때 소스 순서까지 캐스케이드 승부 규칙을 정리해 레슨 5의 명시도 사례의 근거다.`
    },
    {
      title: `MDN - The box model (Learn web development)`,
      url: `https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model`,
      kind: `doc`,
      why: `content·padding·border·margin 네 겹, 기본 모델과 border-box의 폭 계산 차이, 세로 margin 합침을 숫자 예제로 보여 주어 레슨 5의 폭 계산(350+25+25+5+5=410)의 근거다.`
    },
    {
      title: `MDN - Debugging CSS`,
      url: `https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Debugging_CSS`,
      kind: `doc`,
      why: `DevTools로 요소를 검사하고 취소선 선언·덮어쓰기·박스 모델을 읽는 법, 소스 보기와 지금 DOM이 다르다는 점, 최소 재현(reduced test case) 만들기 등 CSS 디버깅 절차를 설명한다.`
    },
    {
      title: `MDN - Event bubbling`,
      url: `https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling`,
      kind: `doc`,
      why: `이벤트 버블링과 캡처링, target과 currentTarget의 차이, stopPropagation, 이벤트 위임을 예제로 설명해 레슨 6의 이벤트 흐름 설명의 근거다.`
    },
    {
      title: `git-bisect Documentation`,
      url: `https://git-scm.com/docs/git-bisect`,
      kind: `doc`,
      why: `이진 탐색으로 버그가 들어온 커밋을 찾는 절차, git bisect run의 종료 코드 규칙(0 좋음, 1~127 나쁨, 125 건너뜀, 128 이상 중단), 예상 단계 수 예시, reset 방법을 공식 문서로 확인한다.`
    }
  ],
  gigs: [
    `이 일이 들어오는 모양: 홈페이지·쇼핑몰·사내 도구가 "갑자기 안 돼요", "화면이 깨져요", "가끔 오류가 나요"라며 맡기는 버그 수정·유지보수 의뢰, 그리고 AI 도구나 이전 개발자가 만든 코드를 인수해 정리해 달라는 의뢰입니다. 고객은 대개 증상만 말하고 재현 방법을 모릅니다. 견적 전에 재현 절차, 환경(브라우저·기기·운영체제), 문제가 시작된 시점과 그 무렵의 변경(배포·플러그인 업데이트), 소스 저장소와 스테이징 환경 접근 가능 여부, 배포 방법과 백업을 먼저 확인하세요.`,
    `견적은 진단과 수정을 나눠 받는 편이 안전합니다. 1단계 진단(재현 확정과 원인 보고서)은 시간 상한을 둔 고정가나 시간제로 하고, 원인이 확정된 뒤 2단계 수정 견적을 따로 냅니다. 원인이 비슷해 보여도 재현이 안 되면 얼마나 걸릴지 아무도 모릅니다. 재현이 끝내 안 될 때 무엇을 납품하고 어떻게 정산할지(추가 정보를 받아 재시도, 조사 보고서까지)를 미리 적어 두세요. 금액은 플랫폼과 경력에 따라 편차가 크므로(2026-11 기준) 같은 플랫폼의 비슷한 상품과 최근 의뢰를 직접 확인해 시간 단가에서 역산하고, 이 모듈의 어떤 숫자도 단가 근거로 쓰지 마세요.`,
    `납품물을 정해 두면 분쟁이 줄고 재의뢰가 생깁니다. 수정된 코드(원인별로 나눈 작은 커밋), 디버깅 노트(재현 절차·원인·수정·검증), 회귀 테스트 또는 수동 검증 체크리스트, 비전문가용 3줄 요약, 영향 범위(저장된 옛 데이터의 정리 필요 여부), 롤백 방법을 기본 패키지로 삼으세요. "고쳤습니다"만 보내는 사람과 "원인은 이것이고 이렇게 확인했고 같은 버그를 이 테스트가 막습니다"를 보내는 사람의 신뢰는 다릅니다.`,
    `범위의 함정: 버그 하나를 고치면 가려져 있던 다음 버그가 드러나는 일이 흔합니다(실습 1·2에서 체험합니다). 계약서나 상품 설명에 "신고된 증상 N건에 한정, 수정 중 발견된 추가 결함은 별도 협의, 무상 수정 횟수 M회"를 적어 두세요. 견적서나 상품 설명에도 무상 수정 범위와 유지보수를 별도 계약으로 둘지를 적어 두면 분쟁이 줄어듭니다. 하자보수(담보책임)와 유상 유지보수의 경계, 기간은 계약서와 법률에 따라 달라지므로 이 글은 일반 정보일 뿐 법률 자문이 아니며, 금액이 큰 계약은 변호사에게 확인하세요.`,
    `접근과 안전: 운영 서버나 운영 DB에서 바로 고치지 말고 스테이징이나 복사본에서 재현합니다. 고객의 로그·스크린샷·DB 덤프에는 개인정보가 섞여 있을 수 있으니 필요한 부분만 받고 작업 후 파기 시점을 합의하세요. 계정과 키는 공유 채팅에 붙여 넣지 않고 고객이 만든 임시 권한을 받아 작업이 끝나면 회수를 요청합니다. 수정 전에 현재 상태 백업과 롤백 절차를 합의하는 것이 첫 작업입니다.`,
    `포트폴리오와 시장: 전후 비교 한 쪽짜리 사례 3건(재현 화면, 원인 한 줄, 수정 diff, 회귀 테스트, 결과)이 "디버깅을 한다"는 말 열 마디보다 설득력이 있습니다. AI 도구나 이전 개발자가 만든 코드를 넘겨받아 고치는 일을 의뢰하는 고객이 있습니다. Stack Overflow 2025 개발자 설문의 AI 문항(복수 선택)에서 66%가 "거의 맞지만 완전히는 아닌 AI 답"을, 45.2%가 "AI가 만든 코드를 디버깅하는 데 더 오래 걸린다"를 골랐습니다(2025 설문 기준, 자기 보고이므로 시장 규모의 증거는 아닙니다). 읽고 좁혀 가고 증명하는 능력은 그런 코드를 넘겨받았을 때 쓸모가 있습니다.`
  ]
};
