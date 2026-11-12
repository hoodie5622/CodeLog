(window.LANG_EXTRA = window.LANG_EXTRA || []).push({
  id: "javascript",
  levels: [
    {
      level: "입문",
      practice: [
        {
          title: "변수로 합계 계산하기",
          task: "const로 price(1200)와 count(3)를 선언하고, 두 값을 곱한 합계를 console.log로 출력하세요. 기대 출력은 한 줄로 '합계: 3600'입니다.",
          hint: "console.log는 여러 값을 쉼표로 구분해 한 번에 출력할 수 있습니다. 곱셈 연산자는 *입니다.",
          solution: `const price = 1200;
const count = 3;
const total = price * count;
console.log("합계:", total);`,
          explain: "price와 count를 const로 선언하고 곱한 결과를 total에 담았습니다. console.log에 문자열과 숫자를 쉼표로 함께 넘기면 공백으로 구분되어 '합계: 3600'이 출력됩니다."
        },
        {
          title: "홀수와 짝수 판별 함수",
          task: "숫자 n을 받아 짝수이면 '짝수', 아니면 '홀수'를 return하는 함수 parity를 만드세요. parity(7)과 parity(10)의 결과를 각각 출력하면 '홀수', '짝수'가 두 줄로 나와야 합니다.",
          hint: "n을 2로 나눈 나머지는 % 연산자로 구하고, 같은지는 ===로 비교합니다.",
          solution: `function parity(n) {
  if (n % 2 === 0) {
    return "짝수";
  } else {
    return "홀수";
  }
}
console.log(parity(7));
console.log(parity(10));`,
          explain: "n % 2가 0이면 짝수이므로 if 쪽에서 '짝수'를 돌려주고, 아니면 else에서 '홀수'를 돌려줍니다. 함수는 return으로 결과를 돌려주고, 호출한 쪽에서 console.log로 출력합니다."
        },
        {
          title: "반복문으로 배열 합 구하기",
          task: "배열 [3, 5, 7, 9]의 모든 값을 for문으로 더해 합계를 출력하세요. 기대 출력은 24 한 줄입니다.",
          hint: "합계를 담을 변수는 값이 바뀌므로 let으로 0부터 시작하고, 반복 조건에는 배열의 length를 사용합니다.",
          solution: `const nums = [3, 5, 7, 9];
let sum = 0;
for (let i = 0; i < nums.length; i++) {
  sum = sum + nums[i];
}
console.log(sum);`,
          explain: "인덱스 i를 0부터 length 미만까지 늘리며 nums[i]를 sum에 계속 더했습니다. sum은 값이 바뀌어야 하므로 const가 아니라 let으로 선언합니다."
        }
      ]
    },
    {
      level: "중급",
      intro: "중급에서는 함수와 스코프의 규칙, 배열 메서드, 객체 구조 분해, 클래스, 에러 처리를 배워 실무에서 쓰는 JavaScript 코드를 읽고 쓸 수 있게 됩니다. 입문에서 배운 변수, 조건문, 반복문, 함수, 배열을 바탕으로 더 간결하고 안전한 코드를 만드는 방법에 집중합니다.",
      lessons: [
        {
          title: "함수 심화: 화살표 함수, 기본값, 나머지 매개변수",
          body: "함수는 function 선언 외에도 화살표 함수 (a, b) => a + b 형태로 간단히 만들 수 있습니다. 매개변수에 b = 10처럼 기본값을 주면 인자가 없거나 undefined일 때 그 값이 쓰이고, ...items 같은 나머지 매개변수는 남은 인자를 배열로 모아 줍니다. return이 없는 함수는 undefined를 돌려주므로, 결과를 쓰려는데 undefined가 나온다면 return을 빠뜨렸는지 먼저 확인하세요. 화살표 함수는 본문이 식 하나면 중괄호와 return을 생략할 수 있지만, 중괄호를 쓰면 return을 직접 적어야 한다는 점이 흔한 실수입니다.",
          code: `function add(a, b = 10) {
  return a + b;
}
const mul = (a, b) => a * b;
const count = (...items) => items.length;
function noReturn() {
  const x = 1;
}
console.log(add(1));
console.log(add(1, 2));
console.log(mul(3, 4));
console.log(count("a", "b", "c"));
console.log(noReturn());`
        },
        {
          title: "스코프와 var/let/const",
          body: "스코프는 변수를 사용할 수 있는 범위입니다. let과 const는 중괄호 { } 블록 안에서만 유효한 블록 스코프이고, var는 블록을 무시하고 함수 전체에서 유효합니다. let과 const는 선언 줄에 도달하기 전에 접근하면 ReferenceError가 나는데, 이 구간을 임시 사각지대(TDZ)라고 부릅니다. 안쪽 블록에서 같은 이름을 다시 선언하면 바깥 변수를 가리게(섀도잉) 되므로 이름 충돌로 인한 버그에 주의해야 하며, 요즘은 기본적으로 const를, 값이 바뀔 때만 let을 쓰고 var는 피하는 것이 권장됩니다.",
          code: `let x = "바깥";
{
  let x = "안쪽";
  console.log(x);
}
console.log(x);

function test() {
  if (true) {
    var v = "var는 함수 전체";
    let l = "let은 블록 안";
  }
  console.log(v);
  console.log(typeof l);
}
test();

try {
  console.log(a);
  let a = 1;
} catch (e) {
  console.log(e.name);
}`
        },
        {
          title: "배열 메서드: map, filter, reduce",
          body: "map은 각 값을 변환한 새 배열을, filter는 조건을 만족하는 값만 모은 새 배열을, reduce는 값을 하나로 누적한 결과를 돌려줍니다. 세 메서드 모두 원본 배열을 바꾸지 않고, 콜백 함수를 받아 반복을 대신해 주기 때문에 for문보다 의도가 잘 드러납니다. reduce는 두 번째 인자로 초기값을 반드시 주는 습관을 들이세요. 빈 배열에 초기값 없이 reduce를 쓰면 TypeError가 납니다. map이나 filter를 이어 붙이는 메서드 체이닝도 자주 쓰이며, 단순히 하나만 찾을 때는 find를 사용합니다.",
          code: `const nums = [1, 2, 3, 4, 5];
const doubled = nums.map((n) => n * 2);
const evens = nums.filter((n) => n % 2 === 0);
const sum = nums.reduce((acc, n) => acc + n, 0);
console.log(doubled);
console.log(evens);
console.log(sum);
console.log(nums.find((n) => n > 3));
console.log(nums.filter((n) => n % 2 === 1).map((n) => n * n));
console.log(nums);`
        },
        {
          title: "객체와 구조 분해",
          body: "객체는 이름(키)과 값의 쌍을 묶은 자료구조이고, 구조 분해 할당을 쓰면 필요한 속성이나 배열 요소를 변수로 한 번에 꺼낼 수 있습니다. { author: writer }처럼 이름을 바꿔 꺼내거나 { stock = 0 }처럼 기본값을 줄 수 있습니다. 전개 연산자(...)로 객체를 복사하면서 일부 값만 바꿀 수 있으며, 이 복사는 한 단계만 복사하는 얕은 복사입니다. const로 선언한 객체도 속성은 바꿀 수 있습니다. const가 막는 것은 변수 자체에 다른 값을 다시 대입하는 것뿐이라는 점을 자주 오해합니다.",
          code: `const book = { title: "자바스크립트", price: 20000, author: "김" };
const { title, price } = book;
console.log(title, price);
const { author: writer, stock = 0 } = book;
console.log(writer, stock);
const [first, , third] = ["사과", "배", "귤"];
console.log(first, third);
const sale = { ...book, price: 15000 };
console.log(sale.price, book.price);
book.price = 18000;
console.log(book.price);
console.log(Object.keys(book));
console.log(Object.entries({ a: 1, b: 2 }));`
        },
        {
          title: "클래스와 상속",
          body: "class는 같은 모양의 객체를 여러 개 만들기 위한 설계도이며, constructor에서 속성을 초기화하고 메서드를 정의합니다. extends로 다른 클래스를 상속하고, 자식 생성자에서는 this를 쓰기 전에 반드시 super()를 호출해야 합니다. 이름 앞에 #을 붙인 필드는 클래스 바깥에서 접근할 수 없는 비공개 필드이고, static은 인스턴스가 아니라 클래스 자체에 속합니다. 클래스를 new 없이 호출하면 TypeError가 나므로 객체를 만들 때는 항상 new를 붙여야 합니다.",
          code: `class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return this.name + "가 소리를 냅니다";
  }
}
class Dog extends Animal {
  #tricks = 0;
  static kind = "개";
  constructor(name) {
    super(name);
  }
  learn() {
    this.#tricks++;
    return this.#tricks;
  }
  speak() {
    return super.speak() + " (멍멍)";
  }
}
const d = new Dog("바둑이");
console.log(d.speak());
console.log(d.learn(), d.learn());
console.log(d instanceof Animal, Dog.kind);
try {
  Dog("x");
} catch (e) {
  console.log(e.name);
}`
        },
        {
          title: "에러 처리: try/catch/finally와 throw",
          body: "예상 가능한 문제는 throw new Error(메시지)로 직접 오류를 던지고, try/catch로 받아 프로그램이 멈추지 않게 처리합니다. finally 블록은 오류가 나든 안 나든 마지막에 항상 실행되어 정리 작업에 쓰입니다. Error를 상속한 사용자 정의 오류 클래스를 만들면 오류 종류를 name으로 구분할 수 있습니다. 오류 객체의 message와 name을 활용하되, 처리할 수 없는 오류를 catch에서 조용히 삼켜 버리면 원인 추적이 어려워지니 주의하세요. 참고로 Number('')는 0이 되므로 입력값 검증에서는 빈 문자열을 따로 확인해야 합니다.",
          code: `class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}
function parseAge(text) {
  const n = Number(text);
  if (Number.isNaN(n)) {
    throw new ValidationError("숫자가 아닙니다: " + text);
  }
  return n;
}
function test(text) {
  try {
    console.log("나이:", parseAge(text));
  } catch (err) {
    console.log(err.name + " - " + err.message);
  } finally {
    console.log("검사 끝");
  }
}
test("20");
test("abc");`
        }
      ],
      quiz: [
        {
          q: `다음 코드의 출력 결과는?

const f = (a, b = 5) => a + b;
console.log(f(1));`,
          choices: ["6", "NaN", "1", "오류가 발생한다"],
          answer: 0,
          why: "b에 인자가 전달되지 않으면 기본값 5가 쓰이므로 1 + 5 = 6이 출력됩니다."
        },
        {
          q: `다음 코드의 출력 결과는?

console.log([1, 2, 3, 4].filter((n) => n > 2).map((n) => n * 10));`,
          choices: ["[3, 4]", "[30, 40]", "[10, 20]", "[30, 40, 10, 20]"],
          answer: 1,
          why: "filter가 2보다 큰 3, 4만 남기고, map이 각각 10배 하여 [30, 40]이 됩니다."
        },
        {
          q: `다음 코드의 출력 결과는?

const r = [1, 2, 3, 4].reduce((acc, n) => acc + n, 10);
console.log(r);`,
          choices: ["10", "24", "20", "오류가 발생한다"],
          answer: 2,
          why: "누적 초기값이 10이므로 10 + 1 + 2 + 3 + 4 = 20입니다."
        },
        {
          q: "함수 안의 if 블록에서 var v와 let l을 선언한 뒤, if 블록 바깥(같은 함수 안)에서 두 변수를 읽으면 어떻게 될까요?",
          choices: ["둘 다 읽을 수 있다", "l은 읽을 수 있고 v는 ReferenceError가 난다", "둘 다 ReferenceError가 난다", "v는 읽을 수 있고 l은 ReferenceError가 난다"],
          answer: 3,
          why: "var는 블록 스코프가 아니라 함수 스코프라서 블록 밖에서도 보이지만, let은 블록 스코프라서 블록 밖에서 접근하면 ReferenceError가 납니다."
        },
        {
          q: `다음 코드의 출력 결과는?

const { a, b = 2 } = { a: 1 };
console.log(a, b);`,
          choices: ["1 2", "1 undefined", "undefined 2", "오류가 발생한다"],
          answer: 0,
          why: "객체에 b가 없으므로 구조 분해의 기본값 2가 쓰여 a는 1, b는 2가 됩니다."
        },
        {
          q: "class Dog extends Animal의 생성자에서 this를 사용하기 전에 반드시 먼저 해야 하는 것은?",
          choices: ["this.init() 호출", "super() 호출", "Animal.call(this) 호출", "new Animal() 호출"],
          answer: 1,
          why: "자식 클래스의 생성자에서는 부모 생성자를 부르는 super()를 먼저 호출해야 this를 사용할 수 있습니다. 그렇지 않으면 ReferenceError가 납니다."
        },
        {
          q: `다음 코드의 출력 결과는?

try {
  null.x;
} catch (e) {
  console.log(e.name);
} finally {
  console.log("끝");
}`,
          choices: ["TypeError만 출력", "ReferenceError, 끝 순서로 출력", "TypeError, 끝 순서로 출력", "끝만 출력"],
          answer: 2,
          why: "null의 속성을 읽으면 TypeError가 발생해 catch에서 TypeError를 출력하고, finally는 항상 실행되어 이어서 끝을 출력합니다."
        },
        {
          q: "const o = { n: 1 }; 다음에 o.n = 2; 를 실행하면 어떻게 될까요?",
          choices: ["TypeError가 발생한다", "SyntaxError가 발생한다", "변경은 무시되고 o.n은 1이다", "o.n이 2로 바뀐다"],
          answer: 3,
          why: "const는 변수 o에 다른 값을 다시 대입하는 것만 막을 뿐, 객체 내부의 속성 변경은 막지 않으므로 o.n은 2가 됩니다."
        }
      ],
      practice: [
        {
          title: "기본값이 있는 할인 함수",
          task: "가격 price와 할인율(퍼센트) rate를 받아 할인된 가격을 return하는 함수 applyDiscount를 만드세요. rate의 기본값은 10이며, applyDiscount(20000)과 applyDiscount(20000, 25)를 출력하면 18000, 15000이 두 줄로 나와야 합니다.",
          hint: "매개변수에 rate = 10처럼 기본값을 주고, 할인 금액은 price * rate / 100으로 계산합니다.",
          solution: `function applyDiscount(price, rate = 10) {
  return price - (price * rate) / 100;
}
console.log(applyDiscount(20000));
console.log(applyDiscount(20000, 25));`,
          explain: "rate에 인자가 오지 않으면 기본값 10이 쓰이므로 20000에서 2000이 빠져 18000이 됩니다. 두 번째 호출은 25가 전달되어 5000이 빠진 15000이 됩니다."
        },
        {
          title: "합격자 평균 구하기",
          task: "students 배열에 { name: '가', score: 55 }, { name: '나', score: 80 }, { name: '다', score: 92 }, { name: '라', score: 40 }, { name: '마', score: 71 }을 담으세요. score가 60 이상인 학생만 골라 점수 평균을 구해 출력하면 81이 나와야 합니다.",
          hint: "filter로 합격자만 남기고, reduce로 점수를 모두 더한 뒤 합격자 수로 나눕니다. 구조 분해로 ({ score })처럼 쓰면 편합니다.",
          solution: `const students = [
  { name: "가", score: 55 },
  { name: "나", score: 80 },
  { name: "다", score: 92 },
  { name: "라", score: 40 },
  { name: "마", score: 71 }
];
const passed = students.filter(({ score }) => score >= 60);
const total = passed.reduce((sum, { score }) => sum + score, 0);
console.log(total / passed.length);`,
          explain: "filter로 80, 92, 71점인 세 명만 남기고, reduce로 합계 243을 구한 뒤 3으로 나누면 81입니다. reduce의 초기값 0을 빠뜨리지 않는 것이 중요합니다."
        },
        {
          title: "입금 검증이 있는 계좌 클래스",
          task: "balance 속성을 가진 Account 클래스를 만들고, 0 이하의 금액이 들어오면 Error('금액은 0보다 커야 합니다')를 던지는 deposit(amount) 메서드를 구현하세요. 잔액 0으로 시작해 deposit(1000)을 하고, deposit(-5)는 try/catch로 받아 message를 출력한 뒤 마지막에 잔액을 출력하면 '금액은 0보다 커야 합니다'와 1000이 두 줄로 나와야 합니다.",
          hint: "검증은 메서드 맨 앞에서 if로 하고 throw new Error(...)를 사용합니다. 오류를 받을 때는 catch (e)에서 e.message를 출력합니다.",
          solution: `class Account {
  constructor(balance) {
    this.balance = balance;
  }
  deposit(amount) {
    if (amount <= 0) {
      throw new Error("금액은 0보다 커야 합니다");
    }
    this.balance += amount;
  }
}
const acc = new Account(0);
acc.deposit(1000);
try {
  acc.deposit(-5);
} catch (e) {
  console.log(e.message);
}
console.log(acc.balance);`,
          explain: "deposit은 잘못된 금액이면 잔액을 바꾸기 전에 오류를 던지므로 -5 입금은 반영되지 않습니다. try/catch가 오류를 받아 메시지를 출력하고 프로그램은 계속 진행되어 잔액 1000이 출력됩니다."
        }
      ]
    },
    {
      level: "고급",
      intro: "고급에서는 클로저와 프로토타입 같은 언어의 동작 원리부터 이벤트 루프, Promise와 async/await, 이터레이터와 제너레이터, 모듈 개념까지 JavaScript가 실제로 어떻게 실행되는지 배웁니다. 중급에서 익힌 함수, 스코프, 클래스를 토대로 비동기 흐름과 코드 구조를 정확히 이해하는 것이 목표입니다.",
      lessons: [
        {
          title: "클로저",
          body: "클로저는 함수가 자신이 만들어진 곳의 변수를 함수가 끝난 뒤에도 계속 기억하고 사용하는 현상입니다. makeCounter가 끝나도 반환된 함수는 count를 계속 참조하므로, 외부에서 직접 바꿀 수 없는 비공개 상태를 만드는 데 쓰입니다. 호출할 때마다 새로운 환경이 만들어지므로 makeCounter를 두 번 호출하면 서로 독립된 count를 갖습니다. 흔한 실수는 var로 반복문을 돌며 함수를 만드는 경우로, 모든 함수가 같은 변수 i를 공유해 마지막 값을 보게 되며 let을 쓰면 반복마다 새 변수가 만들어져 해결됩니다.",
          code: `function makeCounter() {
  let count = 0;
  return function () {
    count++;
    return count;
  };
}
const a = makeCounter();
const b = makeCounter();
console.log(a(), a(), a());
console.log(b());

var fns = [];
for (var i = 0; i < 3; i++) {
  fns.push(() => i);
}
console.log(fns.map((f) => f()));

const gs = [];
for (let j = 0; j < 3; j++) {
  gs.push(() => j);
}
console.log(gs.map((f) => f()));`
        },
        {
          title: "프로토타입과 프로토타입 체인",
          body: "JavaScript의 모든 객체는 다른 객체를 가리키는 숨은 연결인 프로토타입을 가지며, 속성을 찾을 때 자신에게 없으면 이 연결을 따라 위로 올라가며 찾습니다. 이것이 프로토타입 체인이고, 생성자 함수의 prototype에 넣은 메서드를 모든 인스턴스가 공유할 수 있는 이유입니다. Object.getPrototypeOf로 프로토타입을 확인하고 Object.create로 원하는 프로토타입을 가진 객체를 만들 수 있습니다. class 문법도 내부적으로는 프로토타입 기반이며 extends는 프로토타입 체인을 연결해 줍니다. 속성이 객체 자신의 것인지 상속받은 것인지는 Object.hasOwn으로 구분해야 하고, 둘을 혼동하는 것이 흔한 실수입니다.",
          code: `function Person(name) {
  this.name = name;
}
Person.prototype.hello = function () {
  return "안녕, " + this.name;
};
const p = new Person("민지");
console.log(p.hello());
console.log(Object.getPrototypeOf(p) === Person.prototype);
console.log(Object.hasOwn(p, "hello"));
console.log("hello" in p);

const base = {
  greet() {
    return "hi " + this.n;
  }
};
const child = Object.create(base);
child.n = "A";
console.log(child.greet());

class Student extends Person {}
console.log(Object.getPrototypeOf(Student.prototype) === Person.prototype);`
        },
        {
          title: "이벤트 루프와 태스크 큐",
          body: "JavaScript는 한 번에 하나의 코드만 실행하는 싱글 스레드 방식이며, 이벤트 루프가 호출 스택이 비었을 때 대기 중인 작업을 꺼내 실행합니다. setTimeout 같은 타이머 콜백은 매크로태스크 큐에, Promise의 then이나 queueMicrotask 콜백은 마이크로태스크 큐에 들어갑니다. 현재 실행 중인 동기 코드가 모두 끝나면 마이크로태스크를 전부 먼저 처리하고, 그다음에 매크로태스크를 하나 처리합니다. 그래서 setTimeout(fn, 0)이라도 이미 예약된 Promise 콜백보다 늦게 실행되며, 오래 걸리는 동기 코드는 모든 콜백을 막아 화면이 멈추는 원인이 됩니다.",
          code: `console.log("동기 1");
setTimeout(() => console.log("매크로태스크: setTimeout"), 0);
Promise.resolve().then(() => console.log("마이크로태스크: Promise"));
queueMicrotask(() => console.log("마이크로태스크: queueMicrotask"));
console.log("동기 2");`
        },
        {
          title: "Promise와 async/await",
          body: "Promise는 나중에 완료될 작업의 결과를 나타내는 객체로 대기, 이행(fulfilled), 거부(rejected) 상태를 가지며 then과 catch로 결과를 받습니다. async 함수는 항상 Promise를 반환하고, 그 안에서 await를 쓰면 Promise가 끝날 때까지 기다린 뒤 값을 꺼내 동기 코드처럼 읽기 쉽게 작성할 수 있습니다. 거부된 Promise를 await하면 오류가 던져지므로 try/catch로 처리합니다. 서로 의존하지 않는 작업은 Promise.all로 동시에 시작해야 시간이 줄며, 하나가 실패해도 전부 결과를 보고 싶다면 Promise.allSettled를 씁니다. await를 연달아 쓰면 순서대로 기다리게 된다는 점이 성능 면에서 흔한 실수입니다.",
          code: `const wait = (ms, v) =>
  new Promise((resolve) => setTimeout(() => resolve(v), ms));
const fail = (ms) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error("실패")), ms));

async function main() {
  const a = await wait(10, "A");
  console.log(a);
  const [b, c] = await Promise.all([wait(20, "B"), wait(10, "C")]);
  console.log(b, c);
  try {
    await fail(5);
  } catch (e) {
    console.log("잡음:", e.message);
  }
  const r = await Promise.allSettled([wait(5, "ok"), fail(5)]);
  console.log(r.map((x) => x.status));
  return "끝";
}
main().then((v) => console.log(v));
console.log("main 호출 직후");`
        },
        {
          title: "이터레이터와 제너레이터",
          body: "이터러블은 Symbol.iterator 메서드를 가진 객체이며, 이 메서드가 돌려주는 이터레이터는 { value, done }을 반환하는 next()를 가집니다. for...of와 전개 연산자(...)는 이 규약을 이용해 값을 하나씩 꺼냅니다. function*로 만드는 제너레이터 함수는 이터레이터를 쉽게 만들어 주며, yield에서 실행을 멈췄다가 next()가 호출될 때 이어서 실행되므로 값을 필요할 때만 만드는 지연 평가가 가능합니다. next(값)으로 값을 안으로 전달할 수도 있고, return으로 끝나면 done이 true가 됩니다. 제너레이터 함수는 호출해도 본문이 바로 실행되지 않고 이터레이터만 돌려준다는 점을 자주 놓칩니다.",
          code: `const range = {
  from: 1,
  to: 3,
  [Symbol.iterator]() {
    let cur = this.from;
    const end = this.to;
    return {
      next() {
        return cur <= end
          ? { value: cur++, done: false }
          : { value: undefined, done: true };
      }
    };
  }
};
console.log([...range]);

function* gen() {
  yield 1;
  const x = yield 2;
  console.log("받은 값:", x);
  return 3;
}
const g = gen();
console.log(g.next());
console.log(g.next());
console.log(g.next("hi"));

function* count(limit) {
  for (let n = 1; n <= limit; n++) {
    console.log("생성", n);
    yield n;
  }
}
for (const n of count(2)) {
  console.log("사용", n);
}`
        },
        {
          title: "모듈 개념",
          body: "모듈은 코드를 파일 단위로 나누고, 공개할 것만 export하고 다른 파일에서 import로 가져다 쓰는 방식입니다. ES 모듈은 자동으로 strict 모드이며 각 파일이 자기만의 스코프를 가져 최상위 변수가 전역을 오염시키지 않고, 한 번만 평가되어 재사용됩니다. 이름 있는 export는 import { add }처럼 중괄호로, 파일당 하나인 default export는 이름을 자유롭게 정해 가져옵니다. 브라우저에서는 script 태그에 type='module'을 붙여 사용하고, import한 값은 읽기 전용이라 가져온 쪽에서 재대입할 수 없습니다. 모듈 문법이 없던 시절에는 즉시 실행 함수와 클로저로 비공개 상태를 감추는 모듈 패턴을 썼고, 아래 예제는 그 원리를 한 파일 안에서 보여 줍니다.",
          code: `// ES 모듈은 파일을 나눠야 하므로 문법만 주석으로 보여 줍니다.
// math.js : export const add = (a, b) => a + b;
// main.js : import { add } from "./math.js";

const counterModule = (function () {
  let count = 0;
  function increment() {
    count++;
  }
  return {
    increment,
    get value() {
      return count;
    }
  };
})();
counterModule.increment();
counterModule.increment();
console.log(counterModule.value);
console.log(counterModule.count);`
        }
      ],
      quiz: [
        {
          q: `다음 코드의 출력 결과는?

function make() {
  let n = 0;
  return () => ++n;
}
const f = make();
f();
console.log(f());`,
          choices: ["1", "2", "0", "undefined"],
          answer: 1,
          why: "반환된 함수는 클로저로 n을 기억하므로 첫 호출에서 1, 두 번째 호출에서 2를 돌려줍니다."
        },
        {
          q: `다음 코드의 출력 결과는?

const fns = [];
for (var i = 0; i < 3; i++) {
  fns.push(() => i);
}
console.log(fns[0]());`,
          choices: ["0", "2", "undefined", "3"],
          answer: 3,
          why: "var i는 반복마다 새로 만들어지지 않고 모든 함수가 공유합니다. 함수를 호출하는 시점에는 반복이 끝나 i가 3이 되어 있습니다."
        },
        {
          q: `다음 코드의 출력 순서는?

console.log("a");
setTimeout(() => console.log("b"), 0);
Promise.resolve().then(() => console.log("c"));
console.log("d");`,
          choices: ["a b c d", "a d b c", "a d c b", "a c d b"],
          answer: 2,
          why: "동기 코드 a, d가 먼저 실행되고, 마이크로태스크인 Promise 콜백 c가 매크로태스크인 setTimeout 콜백 b보다 먼저 실행됩니다."
        },
        {
          q: "obj.method()를 호출했는데 obj 자신에게 method가 없으면 JavaScript는 어떻게 동작할까요?",
          choices: ["프로토타입 체인을 따라 올라가며 method를 찾는다", "즉시 TypeError를 던진다", "undefined를 반환하고 다음 줄로 넘어간다", "전역 객체에서만 찾는다"],
          answer: 0,
          why: "속성을 찾을 때 객체 자신에 없으면 프로토타입 체인을 따라 위로 올라가며 찾고, 끝까지 없을 때에만 undefined가 되어 호출 시 TypeError가 납니다."
        },
        {
          q: "async 함수가 호출되었을 때 반환하는 값은?",
          choices: ["항상 Promise", "return한 값 그대로", "undefined", "제너레이터 객체"],
          answer: 0,
          why: "async 함수는 return한 값이 무엇이든 Promise로 감싸서 반환하며, 오류가 나면 거부된 Promise가 됩니다."
        },
        {
          q: `다음 코드의 출력 결과는?

function* g() {
  yield 1;
  yield 2;
}
const it = g();
it.next();
console.log(it.next().value);`,
          choices: ["1", "2", "undefined", "[1, 2]"],
          answer: 1,
          why: "첫 next()가 1을 내보내고 멈추며, 두 번째 next()가 이어서 yield 2에서 값 2를 돌려줍니다."
        },
        {
          q: "Promise.all([p1, p2])에서 p2가 거부(reject)되면 전체 결과는 어떻게 될까요?",
          choices: ["p1의 결과만 반환된다", "성공한 결과만 모아 이행된다", "전체 Promise가 그 오류로 거부된다", "거부는 무시되고 계속 기다린다"],
          answer: 2,
          why: "Promise.all은 하나라도 거부되면 가장 먼저 발생한 그 거부 이유로 전체가 즉시 거부됩니다. 실패와 무관하게 모든 결과를 받으려면 Promise.allSettled를 씁니다."
        },
        {
          q: "ES 모듈에 대한 설명으로 옳은 것은?",
          choices: ["최상위 선언은 자동으로 전역 변수가 된다", "import한 값은 가져온 쪽에서 자유롭게 재대입할 수 있다", "같은 모듈을 import할 때마다 코드가 새로 실행된다", "export하지 않은 최상위 변수는 다른 파일에서 보이지 않는다"],
          answer: 3,
          why: "모듈은 자기만의 스코프를 가지므로 export하지 않은 최상위 변수는 외부에서 접근할 수 없습니다. 모듈은 한 번만 평가되며 import한 바인딩은 읽기 전용입니다."
        }
      ],
      practice: [
        {
          title: "클로저로 카운터 만들기",
          task: "시작값 start를 받아 호출할 때마다 1씩 증가한 값을 return하는 함수를 돌려주는 makeCounter(start)를 만드세요. makeCounter(10)으로 만든 함수를 세 번 호출해 각각 출력하면 11, 12, 13이 세 줄로 나와야 합니다.",
          hint: "makeCounter 안에 let count = start;를 두고, 그 값을 증가시켜 돌려주는 함수를 반환합니다.",
          solution: `function makeCounter(start) {
  let count = start;
  return function () {
    count += 1;
    return count;
  };
}
const c = makeCounter(10);
console.log(c());
console.log(c());
console.log(c());`,
          explain: "반환된 함수가 클로저로 count를 기억하므로 호출할 때마다 값이 이어서 증가합니다. count는 makeCounter 바깥에서 직접 접근할 수 없는 비공개 상태입니다."
        },
        {
          title: "프로토타입 상속 확인하기",
          task: "speak() 메서드가 this.name + ' 소리'를 return하는 animal 객체를 만드세요. Object.create(animal)로 dog를 만들고 dog.name을 '바둑이'로 설정한 뒤, dog.speak()의 결과와 Object.hasOwn(dog, 'speak')의 결과를 출력하면 '바둑이 소리'와 false가 두 줄로 나와야 합니다.",
          hint: "Object.create(부모)로 만든 객체는 부모를 프로토타입으로 가집니다. 메서드는 부모에만 있고 dog 자신에게는 없습니다.",
          solution: `const animal = {
  speak() {
    return this.name + " 소리";
  }
};
const dog = Object.create(animal);
dog.name = "바둑이";
console.log(dog.speak());
console.log(Object.hasOwn(dog, "speak"));`,
          explain: "dog에는 speak가 없어 프로토타입인 animal에서 찾아 실행하며, 이때 this는 호출한 dog이므로 '바둑이 소리'가 됩니다. speak는 dog 자신의 속성이 아니라 상속받은 것이라 hasOwn은 false입니다."
        },
        {
          title: "Promise.all로 동시에 기다리기",
          task: "delay(ms, value)는 ms 밀리초 뒤에 value로 이행되는 Promise를 돌려주는 함수입니다. 이 함수를 직접 만들고, async 함수 안에서 Promise.all로 delay(20, 'A')와 delay(10, 'B')를 동시에 기다린 뒤 결과를 '-'로 이어 붙여 출력하세요. 기대 출력은 한 줄 'A-B'입니다.",
          hint: "new Promise((resolve) => setTimeout(() => resolve(value), ms))로 delay를 만듭니다. Promise.all의 결과 배열은 완료 순서가 아니라 전달한 순서를 따릅니다.",
          solution: `const delay = (ms, value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

async function main() {
  const results = await Promise.all([delay(20, "A"), delay(10, "B")]);
  console.log(results.join("-"));
}
main();`,
          explain: "Promise.all은 두 작업을 동시에 시작하고 모두 끝나면 전달한 순서대로 결과 배열 ['A', 'B']를 돌려줍니다. B가 먼저 끝나도 순서는 바뀌지 않으므로 join('-')의 결과는 'A-B'입니다."
        }
      ]
    }
  ]
});
