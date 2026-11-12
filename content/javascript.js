(window.LANG_DATA = window.LANG_DATA || []).push({
  id: "javascript", name: "JavaScript", kind: "웹 브라우저에서 동작하는 범용 스크립트 언어", runnable: "js",
  use: "웹사이트의 동작과 화면 변화를 만드는 데 가장 널리 쓰이며, Node.js를 통해 서버 프로그램이나 도구를 만드는 데에도 쓰입니다.",
  tip: "별도의 설치 없이 웹 브라우저의 개발자 도구 콘솔에서 바로 코드를 실행해 볼 수 있습니다.",
  intro: "JavaScript는 웹 페이지에 동작을 더하기 위해 만들어진 프로그래밍 언어로, 지금은 웹 프런트엔드의 핵심 언어입니다. 브라우저뿐 아니라 Node.js 같은 환경에서도 실행할 수 있어 서버와 도구 개발에도 쓰입니다. 문법이 비교적 간결해서 처음 프로그래밍을 배우는 사람이 시작하기에 좋습니다.",
  lessons: [
    {
      title: "console.log로 출력하기",
      body: "console.log()는 괄호 안의 값을 콘솔에 출력하는 함수입니다. 글자(문자열)는 따옴표로 감싸고, 숫자는 그대로 씁니다. 문장 끝에는 보통 세미콜론(;)을 붙이며, //로 시작하는 줄은 주석이라 실행되지 않습니다.",
      code: `// 이 줄은 주석이라 실행되지 않습니다
console.log("안녕하세요, JavaScript!");
console.log(1 + 2);
console.log("여러 값도", "한 번에", 3);`
    },
    {
      title: "변수: let과 const",
      body: "변수는 값을 담아 두는 이름표입니다. 나중에 값이 바뀔 수 있으면 let, 한 번 정하면 바꾸지 않을 값이면 const로 선언합니다. const로 선언한 변수에 다시 값을 대입하면 오류가 납니다.",
      code: `let score = 10;
score = score + 5;
const userName = "민지";
console.log(userName);
console.log(score);`
    },
    {
      title: "자료형과 연산",
      body: "JavaScript의 기본 값에는 숫자(number), 문자열(string), 참/거짓(boolean) 등이 있고, typeof로 종류를 확인할 수 있습니다. 숫자끼리의 +는 덧셈이지만 문자열이 섞이면 이어 붙이기가 됩니다. %는 나눈 나머지를 구하는 연산자입니다.",
      code: `console.log(typeof 42);
console.log(typeof "안녕");
console.log(typeof true);
console.log(5 + 3);
console.log("5" + 3);
console.log(10 % 3);`
    },
    {
      title: "조건문과 반복문",
      body: "if문은 조건이 참일 때만 중괄호 안의 코드를 실행하고, 아니면 else 쪽을 실행합니다. 같은지 비교할 때는 ===를 사용합니다. for문은 같은 일을 정해진 횟수만큼 반복할 때 씁니다.",
      code: `const age = 20;
if (age >= 19) {
  console.log("성인입니다");
} else {
  console.log("미성년자입니다");
}

for (let i = 1; i <= 3; i++) {
  console.log(i + "번째 반복");
}`
    },
    {
      title: "함수와 배열",
      body: "함수는 자주 쓰는 코드를 묶어 이름을 붙여 둔 것으로, function 키워드로 만들고 return으로 결과를 돌려줍니다. 배열은 여러 값을 대괄호 []로 묶은 목록이며, 번호(인덱스)는 0부터 시작합니다. length로 개수를, push로 끝에 새 값을 추가할 수 있습니다.",
      code: `function add(a, b) {
  return a + b;
}
console.log(add(2, 3));

const fruits = ["사과", "배", "귤"];
console.log(fruits[0]);
fruits.push("포도");
console.log(fruits.length);`
    }
  ],
  quiz: [
    {
      q: "console.log()의 역할로 가장 알맞은 것은?",
      choices: ["파일을 삭제한다", "값을 콘솔에 출력한다", "변수를 상수로 바꾼다", "웹 페이지를 새로고침한다"],
      answer: 1,
      why: "console.log()는 괄호 안의 값을 콘솔에 출력하는 함수로, 코드 결과를 확인할 때 가장 많이 쓰입니다."
    },
    {
      q: "const x = 1; 다음에 x = 2; 를 실행하면 어떻게 될까요?",
      choices: ["오류가 발생한다", "x가 2가 된다", "x가 3이 된다", "아무 일도 일어나지 않고 1이 유지된다"],
      answer: 0,
      why: "const로 선언한 변수에는 다시 값을 대입할 수 없어서 오류가 발생합니다."
    },
    {
      q: "console.log(typeof 42)를 실행하면 무엇이 출력될까요?",
      choices: ["string", "boolean", "42", "number"],
      answer: 3,
      why: "42는 숫자이므로 typeof 결과는 \"number\"입니다."
    },
    {
      q: "console.log(\"5\" + 3)의 출력 결과는?",
      choices: ["8", "5 3", "53", "오류"],
      answer: 2,
      why: "+의 한쪽이 문자열이면 덧셈이 아니라 이어 붙이기가 되어 문자열 \"53\"이 출력됩니다."
    },
    {
      q: "console.log(10 % 3)의 출력 결과는?",
      choices: ["3", "1", "0", "3.33"],
      answer: 1,
      why: "%는 나눈 나머지를 구하며, 10을 3으로 나누면 몫이 3이고 나머지는 1입니다."
    },
    {
      q: "const fruits = [\"사과\", \"배\", \"귤\"]; 일 때 fruits[0]의 값은?",
      choices: ["배", "귤", "undefined", "사과"],
      answer: 3,
      why: "배열의 번호(인덱스)는 0부터 시작하므로 fruits[0]은 첫 번째 값인 \"사과\"입니다."
    }
  ]
});
