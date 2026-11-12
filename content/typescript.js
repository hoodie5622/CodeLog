(window.LANG_DATA = window.LANG_DATA || []).push({
  id: "typescript", name: "TypeScript", kind: "JavaScript에 정적 타입을 더한 프로그래밍 언어", runnable: null,
  use: "대규모 웹 프론트엔드(React, Angular, Vue 등)와 Node.js 서버 개발에서 널리 쓰입니다. 코드가 커질수록 실수를 미리 잡아 주기 때문에 팀 프로젝트에서 특히 인기가 많습니다.",
  tip: "TypeScript는 실행 전에 tsc 같은 도구로 JavaScript로 변환되며, 타입 정보는 변환 과정에서 사라집니다.",
  intro: "TypeScript는 Microsoft가 만든 언어로, JavaScript 문법 위에 타입 시스템을 얹은 것입니다. 변수나 함수에 어떤 종류의 값이 들어가는지 적어 두면, 코드를 실행하기 전에 편집기와 컴파일러가 실수를 알려 줍니다. 기존 JavaScript 코드도 대부분 그대로 사용할 수 있어서 조금씩 도입하기 좋습니다.",
  lessons: [
    {
      title: "기본 타입 표기하기",
      body: "TypeScript에서는 변수 이름 뒤에 콜론(:)과 타입을 적어 어떤 값을 담을지 알려 줍니다. 자주 쓰는 기본 타입은 string, number, boolean입니다. 타입이 맞지 않는 값을 넣으면 오류로 알려 줍니다. 초기값이 있으면 타입을 생략해도 TypeScript가 알아서 추론합니다.",
      code: `let userName: string = "민지";
let age: number = 25;
let isStudent: boolean = true;

// 초기값이 있으면 타입을 생략해도 추론됩니다
let city = "서울"; // string으로 추론

// age = "스물다섯"; // 오류: string은 number에 넣을 수 없음`
    },
    {
      title: "배열과 any, unknown",
      body: "배열의 타입은 요소 타입 뒤에 []를 붙여 number[]처럼 적습니다. any 타입은 타입 검사를 꺼 버리므로 꼭 필요할 때만 써야 합니다. 어떤 값이 올지 모를 때는 unknown이 더 안전한데, 사용하기 전에 타입을 확인해야 하기 때문입니다.",
      code: `let scores: number[] = [90, 85, 77];
let fruits: string[] = ["사과", "배"];

scores.push(100);       // 가능
// scores.push("백점"); // 오류: string은 number가 아님

let anything: any = 10;
anything = "아무거나"; // any는 검사하지 않음

let mystery: unknown = "hello";
// mystery.toUpperCase(); // 오류: 먼저 타입을 확인해야 함`
    },
    {
      title: "함수에 타입 붙이기",
      body: "함수의 매개변수에는 타입을 적고, 괄호 뒤에 콜론으로 반환 타입을 적을 수 있습니다. 이렇게 하면 잘못된 인자를 넘기거나 엉뚱한 값을 반환하는 실수를 막을 수 있습니다. 값을 반환하지 않는 함수의 반환 타입은 void입니다. 매개변수 이름 뒤에 ?를 붙이면 생략해도 되는 선택적 매개변수가 됩니다.",
      code: `function add(a: number, b: number): number {
  return a + b;
}

const greet = (name: string, title?: string): string => {
  return title ? title + " " + name : name;
};

function logMessage(msg: string): void {
  console.log(msg);
}

add(2, 3);        // 가능
// add(2, "3");   // 오류: 문자열은 안 됨
greet("민지");     // title은 생략 가능`
    },
    {
      title: "객체 모양 정하기: interface와 type",
      body: "객체가 어떤 속성을 가져야 하는지 interface나 type 별칭으로 정의할 수 있습니다. 속성 이름 뒤에 ?를 붙이면 있어도 되고 없어도 되는 선택 속성이 됩니다. readonly를 붙이면 처음 값을 정한 뒤 바꿀 수 없습니다. 정의한 모양과 다른 객체를 쓰면 오류가 납니다.",
      code: `interface User {
  readonly id: number;
  name: string;
  email?: string; // 선택 속성
}

type Point = {
  x: number;
  y: number;
};

const user: User = { id: 1, name: "민지" };
const p: Point = { x: 10, y: 20 };

// user.id = 2;        // 오류: readonly라서 변경 불가
// const bad: User = { id: 2 }; // 오류: name이 빠짐`
    },
    {
      title: "유니언 타입과 타입 좁히기",
      body: "유니언 타입은 | 기호로 여러 타입 중 하나를 허용하는 타입입니다. 예를 들어 string | number는 문자열이거나 숫자일 수 있다는 뜻입니다. 이런 값은 typeof 검사로 타입을 좁힌 뒤에야 각 타입 전용 기능을 안전하게 쓸 수 있습니다. 또한 \"left\" | \"right\"처럼 특정 값만 허용하는 리터럴 유니언도 만들 수 있습니다.",
      code: `let id: string | number;
id = 101;
id = "A-101";
// id = true; // 오류: boolean은 허용되지 않음

function printId(id: string | number): void {
  if (typeof id === "string") {
    console.log(id.toUpperCase()); // 여기서는 string
  } else {
    console.log(id.toFixed(1));    // 여기서는 number
  }
}

type Direction = "left" | "right";
let dir: Direction = "left";
// dir = "up"; // 오류: 허용된 값이 아님`
    }
  ],
  quiz: [
    {
      q: "TypeScript와 JavaScript의 관계를 가장 잘 설명한 것은?",
      choices: [
        "JavaScript와 전혀 관계없는 별개의 언어이다",
        "JavaScript 문법에 타입 시스템을 더한 언어이다",
        "JavaScript를 대체하여 브라우저가 직접 실행하는 언어이다",
        "JavaScript보다 이전에 만들어진 언어이다"
      ],
      answer: 1,
      why: "TypeScript는 JavaScript 위에 정적 타입을 더한 언어이며, 실행 전에 JavaScript로 변환되어 쓰입니다."
    },
    {
      q: "숫자를 담는 변수 count를 올바르게 선언한 것은?",
      choices: [
        "let count: number = 5;",
        "let number count = 5;",
        "let count = number(5): ;",
        "number count: 5;"
      ],
      answer: 0,
      why: "TypeScript에서는 변수 이름 뒤에 콜론과 타입을 적습니다. 그래서 let count: number = 5; 형태가 맞습니다."
    },
    {
      q: "문자열로 이루어진 배열의 타입을 올바르게 적은 것은?",
      choices: [
        "string",
        "array<string>[]",
        "[string]()",
        "string[]"
      ],
      answer: 3,
      why: "배열 타입은 요소 타입 뒤에 []를 붙여 string[]처럼 적습니다."
    },
    {
      q: "값이 어떤 타입일지 모를 때, 사용 전에 타입 확인을 강제해서 any보다 안전한 타입은?",
      choices: [
        "void",
        "number",
        "unknown",
        "readonly"
      ],
      answer: 2,
      why: "unknown은 어떤 값이든 담을 수 있지만, 타입을 확인하기 전에는 마음대로 사용할 수 없어 any보다 안전합니다."
    },
    {
      q: "interface의 속성 이름 뒤에 ?를 붙이면(예: email?: string) 어떤 뜻일까?",
      choices: [
        "이 속성은 반드시 있어야 한다",
        "이 속성은 있어도 되고 없어도 된다",
        "이 속성은 값을 바꿀 수 없다",
        "이 속성의 타입은 알 수 없다"
      ],
      answer: 1,
      why: "속성 이름 뒤의 ?는 선택 속성을 뜻하며, 객체에 그 속성이 없어도 오류가 나지 않습니다."
    },
    {
      q: "let value: string | number; 에 대한 설명으로 옳은 것은?",
      choices: [
        "문자열과 숫자를 동시에 저장해야 한다",
        "문자열만 저장할 수 있다",
        "boolean도 저장할 수 있다",
        "문자열 또는 숫자 중 하나를 저장할 수 있다"
      ],
      answer: 3,
      why: "| 기호로 만든 유니언 타입은 나열한 타입 중 하나를 허용하므로 string 또는 number 값을 담을 수 있습니다."
    }
  ]
});
