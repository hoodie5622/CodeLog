(window.LANG_EXTRA = window.LANG_EXTRA || []).push({
  id: "typescript",
  levels: [
    {
      level: "입문",
      practice: [
        {
          title: "두 수의 평균 함수",
          task: `매개변수 a, b(둘 다 number)를 받아 평균을 number로 반환하는 함수 average를 타입을 모두 붙여 작성하세요. average(4, 6)을 호출해 결과를 console.log로 출력합니다. 기대 출력은 5입니다.`,
          hint: "매개변수 뒤에 : number, 괄호 뒤에도 : number를 적습니다. 평균은 (a + b) / 2입니다.",
          solution: `function average(a: number, b: number): number {
  return (a + b) / 2;
}

console.log(average(4, 6));`,
          explain: "매개변수와 반환 타입을 모두 number로 적은 함수입니다. 문자열을 넘기면 컴파일 단계에서 오류가 나므로 실수를 미리 막을 수 있습니다."
        },
        {
          title: "선택 속성이 있는 User 설명하기",
          task: `id(number), name(string), email(선택 속성, string)을 가진 interface User를 만드세요. 그리고 User를 받아 email이 있으면 "이름 (이메일)" 형태, 없으면 이름만 반환하는 함수 describeUser를 작성합니다. { id: 1, name: "민지" }와 { id: 2, name: "준호", email: "junho@example.com" }를 각각 출력하면 첫 줄은 민지, 둘째 줄은 준호 (junho@example.com)가 됩니다.`,
          hint: "선택 속성은 이름 뒤에 ?를 붙입니다. user.email이 있는지 삼항 연산자로 확인해 보세요.",
          solution: `interface User {
  id: number;
  name: string;
  email?: string;
}

function describeUser(user: User): string {
  return user.email ? user.name + " (" + user.email + ")" : user.name;
}

console.log(describeUser({ id: 1, name: "민지" }));
console.log(describeUser({ id: 2, name: "준호", email: "junho@example.com" }));`,
          explain: "email?: string 덕분에 email이 없는 객체도 User로 인정됩니다. user.email의 타입은 string | undefined이므로 조건문에서 값이 있는지 확인한 뒤 사용합니다."
        },
        {
          title: "유니언 값을 문자열로 바꾸기",
          task: `string | number를 받아 string을 반환하는 함수 toText를 작성하세요. 문자열이면 대문자로 바꾼 값을, 숫자면 소수점 한 자리까지(toFixed(1)) 문자열로 반환합니다. toText("ab")와 toText(3)을 차례로 출력하면 AB, 3.0이 나옵니다.`,
          hint: "typeof 검사로 타입을 좁힌 뒤, 각 분기에서 그 타입 전용 메서드를 사용합니다.",
          solution: `function toText(value: string | number): string {
  if (typeof value === "string") {
    return value.toUpperCase();
  }
  return value.toFixed(1);
}

console.log(toText("ab"));
console.log(toText(3));`,
          explain: "if 안에서 value는 string으로 좁혀지고, 그 아래에서는 남은 number로 좁혀집니다. 좁히지 않고 toUpperCase를 바로 쓰면 number에는 없는 메서드라 오류가 납니다."
        }
      ]
    },
    {
      level: "중급",
      intro: "중급에서는 객체 모양을 정의하는 interface와 type의 차이, 유니언과 교차 타입으로 타입을 조합하는 방법을 배웁니다. 이어서 타입 좁히기와 제네릭으로 안전하면서도 재사용 가능한 코드를 작성하는 법을 익힙니다.",
      lessons: [
        {
          title: "인터페이스와 타입 별칭",
          body: "객체의 모양은 interface와 type 별칭 둘 다로 정의할 수 있고, 대부분의 경우 서로 바꿔 써도 됩니다. interface는 extends로 다른 interface를 확장하고, 같은 이름으로 다시 선언하면 속성이 합쳐지는 선언 병합이 일어납니다. type은 객체 모양뿐 아니라 string | number 같은 유니언이나 함수 타입에도 이름을 붙일 수 있지만, 같은 이름을 두 번 선언하면 오류입니다. 키 이름을 모르는 객체는 인덱스 시그니처로 표현합니다. 흔한 실수는 선언 병합을 모르고 import나 export가 없는 전역 파일에서 같은 이름의 interface를 또 만들어 의도치 않게 속성이 합쳐지는 경우입니다.",
          code: `interface User {
  id: number;
  name: string;
}

interface Admin extends User {
  role: "admin";
}

type ID = string | number;            // type은 유니언에도 이름을 붙일 수 있음
type Point = { x: number; y: number };
type Fn = (a: number) => number;      // 함수 타입

// 선언 병합: 같은 이름의 interface는 속성이 합쳐집니다
interface Config {
  host: string;
}
interface Config {
  port: number;
}
const cfg: Config = { host: "localhost", port: 3000 };

// 인덱스 시그니처: 키 이름은 모르지만 값 타입은 같을 때
interface Dict {
  [key: string]: number;
}
const scores: Dict = { math: 90, english: 85 };

const admin: Admin = { id: 1, name: "민지", role: "admin" };
const myId: ID = "A-1";
const start: Point = { x: 0, y: 0 };
const twice: Fn = (a) => a * 2;

console.log(admin.name, cfg.port, scores.math, myId, start.x, twice(4));`
        },
        {
          title: "유니언과 교차 타입",
          body: "유니언(A | B)은 둘 중 하나라는 뜻이고, 교차 타입(A & B)은 둘을 모두 만족해야 한다는 뜻입니다. 객체 타입을 &로 합치면 양쪽의 속성을 모두 가진 타입이 되므로 작은 타입을 조합해 큰 타입을 만들 때 유용합니다. 유니언 값에서는 모든 구성원에 공통으로 있는 멤버만 바로 접근할 수 있습니다. 서로 겹칠 수 없는 원시 타입을 &로 묶으면(string & number) 값이 존재할 수 없는 never가 됩니다. 유니언과 교차를 헷갈려 'name과 age를 둘 다 가진' 타입을 |로 적는 실수가 흔합니다.",
          code: `type Named = { name: string };
type Aged = { age: number };

// 교차 타입: 두 타입의 속성을 모두 가져야 함
type Person = Named & Aged;
const p: Person = { name: "민지", age: 25 };
// const q: Person = { name: "준호" }; // 오류: age가 없음

// 유니언 타입: 공통 멤버만 바로 접근 가능
type Cat = { name: string; meow: () => string };
type Dog = { name: string; bark: () => string };

function nameOf(pet: Cat | Dog): string {
  return pet.name;              // name은 둘 다 있으므로 가능
  // pet.meow();                // 오류: Dog에는 meow가 없음
}

type Id = string | number;
function formatId(id: Id): string {
  return typeof id === "string" ? id : String(id);
}

// 서로 겹칠 수 없는 타입의 교차는 never
type Impossible = string & number;

const cat: Cat = { name: "나비", meow: () => "야옹" };
console.log(p.name, p.age, nameOf(cat), formatId(7));`
        },
        {
          title: "타입 좁히기",
          body: "유니언 타입의 값은 그대로는 공통 기능만 쓸 수 있으므로, 조건문으로 범위를 좁혀 줘야 합니다. typeof는 원시 타입, instanceof는 클래스 인스턴스, in 연산자는 속성의 존재 여부, === 비교는 null과 리터럴 값을 기준으로 좁힙니다. TypeScript는 if, else, return의 흐름을 따라가며 각 지점의 타입을 자동으로 계산합니다. 값이 있는지만 보는 단순 truthiness 검사는 0이나 빈 문자열까지 걸러 버리므로, 0이 유효한 값일 때는 !== undefined처럼 정확히 비교해야 합니다.",
          code: `function pad(v: string | number | null): string {
  if (v === null) {
    return "none";                // 여기서 v는 null
  }
  if (typeof v === "string") {
    return v.trim();              // 여기서 v는 string
  }
  return v.toFixed(2);            // 남은 타입은 number
}

type Fish = { swim: () => void };
type Bird = { fly: () => void };

function moveAnimal(a: Fish | Bird): void {
  if ("swim" in a) {              // in 연산자로 좁히기
    a.swim();
  } else {
    a.fly();
  }
}

function toIso(d: Date | string): string {
  if (d instanceof Date) {        // instanceof로 좁히기
    return d.toISOString();
  }
  return d;
}

// 0도 유효한 값이므로 if (n)이 아니라 !== undefined로 정확히 비교
function orTen(n?: number): number {
  if (n !== undefined) {
    return n;               // orTen(0)은 0 (if (n)이었다면 10이 되어 버림)
  }
  return 10;
}

console.log(pad(null), pad("  hi "), pad(3.14159), orTen(), orTen(0));`
        },
        {
          title: "판별 유니언과 never 완전성 검사",
          body: "판별 유니언은 모든 구성원이 같은 이름의 리터럴 속성(보통 kind나 type)을 가지게 만든 유니언입니다. 이 속성을 switch나 if로 검사하면 TypeScript가 각 분기에서 정확한 구성원으로 좁혀 줍니다. default에서 값을 never 타입 변수에 대입해 두면, 나중에 유니언에 새 구성원이 추가되고 case를 빠뜨렸을 때 컴파일 오류가 나서 누락을 알려 줍니다. 이를 완전성 검사라고 합니다. 흔한 실수는 kind 속성을 string으로 선언해 리터럴이 아니게 만드는 것으로, 그러면 좁히기가 동작하지 않습니다.",
          code: `type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.round(3.14 * s.radius * s.radius * 100) / 100;
    case "rect":
      return s.width * s.height;
    default: {
      // 새 구성원을 추가하고 case를 빠뜨리면 여기서 컴파일 오류
      const unreachable: never = s;
      return unreachable;
    }
  }
}

console.log(area({ kind: "circle", radius: 2 }));
console.log(area({ kind: "rect", width: 3, height: 4 }));`
        },
        {
          title: "제네릭 기초",
          body: "제네릭은 타입을 함수의 매개변수처럼 넘겨받게 해서, 같은 로직을 여러 타입에 안전하게 재사용하는 기능입니다. function identity<T>(value: T): T처럼 꺾쇠 안에 타입 매개변수 T를 선언하면, 호출할 때 받은 값의 타입에 맞춰 T가 정해집니다. 대부분은 인자에서 T가 자동으로 추론되므로 직접 적을 필요가 없습니다. any를 쓰면 입력과 출력의 타입 관계가 끊어지지만 제네릭은 그 관계를 유지합니다. 흔한 실수는 제약이 없는 T의 값에 length 같은 특정 속성을 바로 쓰려는 것으로, T가 어떤 타입인지 알 수 없어 오류가 납니다.",
          code: `function identity<T>(value: T): T {
  return value;
}

const s = identity<string>("hi");   // T를 직접 지정
const n = identity(42);             // T가 인자로부터 추론됨

function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const firstNum = first([10, 20, 30]);   // number | undefined
const firstStr = first(["a", "b"]);     // string | undefined

// 타입 매개변수는 여러 개도 가능
function pair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}
const pr = pair("나이", 25);            // [string, number]

console.log(s, n, firstNum, firstStr, pr);`
        },
        {
          title: "제네릭 타입과 기본 타입 매개변수",
          body: "interface, type, class에도 타입 매개변수를 달 수 있습니다. 배열의 Array<T>나 Promise<T>도 모두 이런 제네릭 타입입니다. 타입 매개변수에 = 로 기본값을 주면 사용할 때 타입 인자를 생략할 수 있고, 생략하면 기본값이 쓰입니다. 클래스에 제네릭을 쓰면 인스턴스를 만들 때 담을 값의 타입을 정해 두고, 이후 맞지 않는 값은 컴파일 단계에서 막습니다. 기본값이 unknown이면 any보다 안전하지만, 흔한 실수는 타입 인자를 생략한 채 값을 바로 사용하려는 것으로 타입을 좁히기 전에는 메서드를 호출할 수 없습니다.",
          code: `interface Box<T> {
  value: T;
}
const numBox: Box<number> = { value: 123 };
const strBox: Box<string> = { value: "상자" };

// 기본 타입 매개변수
type ApiResponse<T = unknown> = {
  ok: boolean;
  data: T;
};
const res: ApiResponse<string[]> = { ok: true, data: ["a", "b"] };
const raw: ApiResponse = { ok: true, data: 123 };   // T는 unknown

class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }
}

const stack = new Stack<number>();
stack.push(1);
stack.push(2);
// stack.push("3");   // 오류: string은 number가 아님
console.log(stack.pop(), numBox.value, strBox.value, res.data.length, raw.ok);`
        }
      ],
      quiz: [
        {
          q: "interface로는 할 수 없고 type 별칭으로만 할 수 있는 것은?",
          choices: [
            "다른 타입을 확장해서 새 객체 타입 만들기",
            "객체의 속성 모양 정의하기",
            "string | number 같은 유니언에 이름 붙이기",
            "클래스가 implements로 따르기"
          ],
          answer: 2,
          why: "interface는 객체 모양을 정의하는 데 쓰이고, 유니언처럼 객체가 아닌 타입에 이름을 붙이는 것은 type 별칭만 할 수 있습니다. 나머지는 둘 다 가능합니다."
        },
        {
          q: "다음 코드의 결과는?\n\ninterface Config { host: string }\ninterface Config { port: number }\nconst c: Config = { host: \"a\" };",
          choices: [
            "오류: port 속성이 없음",
            "오류: Config가 중복 선언됨",
            "오류 없음",
            "오류: host는 string이 될 수 없음"
          ],
          answer: 0,
          why: "같은 이름의 interface는 중복 오류가 아니라 선언 병합으로 하나로 합쳐지므로 Config는 host와 port를 모두 필요로 합니다. 따라서 port가 빠졌다는 오류가 납니다."
        },
        {
          q: "다음 코드의 결과는?\n\ntype A = { name: string } & { age: number };\nconst a: A = { name: \"x\" };",
          choices: [
            "오류 없음",
            "오류: name이 string이 아님",
            "교차 타입은 객체에 쓸 수 없어 오류",
            "오류: age 속성이 없음"
          ],
          answer: 3,
          why: "교차 타입은 두 타입을 모두 만족해야 하므로 name과 age가 둘 다 있어야 합니다. age가 없어서 오류가 납니다."
        },
        {
          q: "다음 코드의 결과는?\n\nfunction f(x: string | number) {\n  return x.toFixed();\n}",
          choices: [
            "오류 없음. 숫자일 때만 실행된다",
            "오류: string에는 toFixed가 없어 바로 쓸 수 없다",
            "오류: number에는 toFixed가 없다",
            "컴파일은 되고 런타임에만 오류가 난다"
          ],
          answer: 1,
          why: "유니언 값에서는 모든 구성원에 있는 멤버만 접근할 수 있습니다. toFixed는 number에만 있으므로 typeof로 좁힌 뒤에 써야 합니다."
        },
        {
          q: "다음 함수 f의 반환 타입은?\n\nfunction f(v: string | number | null) {\n  if (v === null) return 0;\n  if (typeof v === \"string\") return v.length;\n  return v;\n}",
          choices: [
            "string | number | null",
            "number",
            "number | null",
            "string | number"
          ],
          answer: 1,
          why: "null은 0을, string은 length(number)를 반환하고, 마지막에 남은 v도 number로 좁혀져 있으므로 모든 반환값이 number입니다."
        },
        {
          q: "판별 유니언 Shape의 switch에서 default에 const x: never = s; 를 두었습니다. Shape에 새 구성원을 추가하고 case를 빠뜨리면 어떻게 될까요?",
          choices: [
            "아무 일도 없고 런타임에 undefined가 된다",
            "런타임에 never라는 문자열이 출력된다",
            "새 구성원이 never에 대입되지 않아 컴파일 오류로 누락을 알려 준다",
            "새 구성원은 자동으로 유니언에서 제외된다"
          ],
          answer: 2,
          why: "case를 빠뜨리면 default에 새 구성원 타입이 남아 있어 never에 대입할 수 없으므로 컴파일 오류가 납니다. 이것이 완전성 검사의 목적입니다."
        },
        {
          q: "다음 코드에서 값 r의 타입은?\n\nfunction first<T>(arr: T[]): T | undefined {\n  return arr[0];\n}\nconst r = first([\"a\", \"b\"]);",
          choices: [
            "string | undefined",
            "string[]",
            "any",
            "T | undefined"
          ],
          answer: 0,
          why: "인자 [\"a\", \"b\"]로부터 T가 string으로 추론되므로 반환 타입 T | undefined는 string | undefined가 됩니다."
        },
        {
          q: "다음 코드의 결과는?\n\ntype R<T = unknown> = { data: T };\nfunction show(r: R) {\n  r.data.toFixed();\n}",
          choices: [
            "오류 없음. data는 number로 추론된다",
            "오류 없음. 호출할 때 타입이 정해진다",
            "오류: R은 타입 인자를 반드시 받아야 한다",
            "오류: data가 unknown이라 toFixed를 바로 쓸 수 없다"
          ],
          answer: 3,
          why: "타입 인자를 생략하면 기본값 unknown이 쓰이므로 R은 R<unknown>입니다. unknown 값은 타입을 좁히기 전에는 메서드를 호출할 수 없습니다."
        }
      ],
      practice: [
        {
          title: "교차 타입으로 할인 가격 계산",
          task: `interface Product { id: number; name: string; price: number }를 만들고, type DiscountedProduct = Product & { discount: number }를 정의하세요. discount는 퍼센트이며, DiscountedProduct를 받아 할인된 가격(number)을 반환하는 함수 finalPrice를 작성합니다. { id: 1, name: "책", price: 20000, discount: 10 }을 넘겨 출력하면 18000이 나와야 합니다.`,
          hint: "할인 금액은 price * discount / 100입니다. 원래 가격에서 이 금액을 빼면 됩니다.",
          solution: `interface Product {
  id: number;
  name: string;
  price: number;
}

type DiscountedProduct = Product & { discount: number };

function finalPrice(p: DiscountedProduct): number {
  return p.price - (p.price * p.discount) / 100;
}

console.log(finalPrice({ id: 1, name: "책", price: 20000, discount: 10 }));`,
          explain: "교차 타입 덕분에 DiscountedProduct는 Product의 모든 속성에 discount까지 가집니다. 20000에서 할인액 2000을 빼서 18000이 출력됩니다."
        },
        {
          title: "판별 유니언으로 넓이 구하기",
          task: `type Shape = { kind: "square"; side: number } | { kind: "rect"; width: number; height: number }를 정의하고, Shape를 받아 넓이를 반환하는 함수 area를 switch로 작성하세요. area({ kind: "square", side: 4 })와 area({ kind: "rect", width: 3, height: 5 })를 차례로 출력하면 16, 15가 나와야 합니다.`,
          hint: "switch (s.kind)로 분기하면 각 case 안에서 s가 알맞은 구성원으로 좁혀집니다.",
          solution: `type Shape =
  | { kind: "square"; side: number }
  | { kind: "rect"; width: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "square":
      return s.side * s.side;
    case "rect":
      return s.width * s.height;
  }
}

console.log(area({ kind: "square", side: 4 }));
console.log(area({ kind: "rect", width: 3, height: 5 }));`,
          explain: "kind 값을 검사하면 case 안에서 s의 타입이 자동으로 좁혀져 side나 width에 안전하게 접근할 수 있습니다. 모든 구성원을 처리했으므로 반환 타입 number도 만족합니다."
        },
        {
          title: "제네릭으로 마지막 요소 구하기",
          task: `배열의 마지막 요소를 반환하는 제네릭 함수 last를 작성하세요. 빈 배열이면 undefined를 반환해야 하므로 반환 타입은 T | undefined입니다. last([1, 2, 3])과 last(["a", "b"])와 빈 number[]에 대한 last 호출을 차례로 출력하면 3, b, undefined가 나와야 합니다.`,
          hint: "function last<T>(arr: T[]): T | undefined 형태로 쓰고, 마지막 인덱스는 arr.length - 1입니다.",
          solution: `function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

const empty: number[] = [];

console.log(last([1, 2, 3]));
console.log(last(["a", "b"]));
console.log(last(empty));`,
          explain: "타입 매개변수 T 덕분에 숫자 배열에는 number, 문자열 배열에는 string이 반환되어 타입 관계가 유지됩니다. 빈 배열에서 arr[-1]은 undefined이므로 세 번째 출력은 undefined입니다."
        }
      ]
    },
    {
      level: "고급",
      intro: "고급에서는 제네릭에 제약을 걸고 사용자 정의 타입 가드로 타입을 좁히는 방법을 배웁니다. 이어서 매핑 타입, 조건부 타입, 유틸리티 타입으로 타입 자체를 계산하는 기법과 strict 설정의 의미를 익힙니다.",
      lessons: [
        {
          title: "제네릭 제약",
          body: "타입 매개변수에 extends로 제약을 걸면, 그 조건을 만족하는 타입만 받을 수 있고 함수 안에서 제약에 정의된 멤버를 안전하게 쓸 수 있습니다. 제약이 없는 T는 어떤 타입인지 모르므로 length 같은 속성에 접근할 수 없습니다. keyof T는 T의 키 이름들을 유니언으로 만든 타입으로, T가 { name: string; age: number }라면 \"name\" | \"age\"가 됩니다. K extends keyof T 패턴은 객체에 실제로 존재하는 키만 받도록 하고, 반환 타입 T[K]로 그 키의 값 타입을 정확히 돌려줍니다. 흔한 실수는 제약을 걸지 않고 as any로 우회하는 것인데, 이러면 타입 안전성이 사라집니다.",
          code: `// length 속성을 가진 타입만 허용
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

console.log(longest("abc", "de"));
console.log(longest([1, 2, 3], [1]));
// longest(10, 20);   // 오류: number에는 length가 없음

// keyof 제약: 객체에 있는 키만 허용
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "민지", age: 25 };
const userName = getProp(user, "name");   // string
const userAge = getProp(user, "age");     // number
// getProp(user, "email");                // 오류: user에 없는 키

console.log(userName, userAge);`
        },
        {
          title: "타입 가드",
          body: "사용자 정의 타입 가드는 반환 타입을 value is Type 형태로 적은 함수로, true를 반환한 분기에서 TypeScript가 값을 해당 타입으로 좁혀 줍니다. typeof나 instanceof만으로 구분하기 어려운 객체 타입을 판별할 때 유용합니다. asserts value is Type 형태의 단언 함수는 조건이 틀리면 예외를 던지고, 호출 이후 값의 타입을 좁힙니다. 컴파일러는 가드 함수 본문이 맞는지 검사하지 않으므로, 본문이 틀리면 타입 안전성이 깨집니다. 가드의 검사 로직은 반드시 정확하게 작성해야 합니다.",
          code: `interface Cat { meow(): string }
interface Dog { bark(): string }

function isCat(pet: Cat | Dog): pet is Cat {
  return (pet as Cat).meow !== undefined;
}

function speak(pet: Cat | Dog): string {
  if (isCat(pet)) {
    return pet.meow();   // 여기서 pet은 Cat
  }
  return pet.bark();     // 여기서 pet은 Dog
}

// 배열 filter와 함께 쓰면 요소 타입이 좁혀진 배열을 얻음
function isString(v: unknown): v is string {
  return typeof v === "string";
}
const mixed: unknown[] = ["a", 1, "b", true];
const strs: string[] = mixed.filter(isString);

// 단언 함수: 조건이 틀리면 예외, 통과하면 타입이 좁혀짐
function assertNumber(v: unknown): asserts v is number {
  if (typeof v !== "number") {
    throw new Error("숫자가 아닙니다");
  }
}

function doubleIt(v: unknown): number {
  assertNumber(v);
  return v * 2;          // 여기서 v는 number
}

const cat: Cat = { meow: () => "야옹" };
console.log(speak(cat), strs, doubleIt(21));`
        },
        {
          title: "매핑 타입",
          body: "매핑 타입은 기존 타입의 모든 키를 순회하며 새 타입을 만드는 기능으로, [K in keyof T] 문법을 씁니다. 속성마다 값 타입을 바꾸거나, ?와 readonly를 붙이거나 -?, -readonly로 제거할 수 있습니다. TypeScript 4.1부터 as 절로 키 이름을 바꾸거나 걸러낼 수도 있습니다. 같은 변환을 여러 타입에 반복하지 않고 한 번만 정의해 재사용할 수 있다는 것이 장점입니다. 이 변환은 얕게(한 단계만) 적용되므로 중첩 객체의 속성까지 바꾸려면 재귀적으로 정의해야 합니다.",
          code: `interface User {
  id: number;
  name: string;
  email: string;
}

// 모든 속성을 boolean으로
type Flags<T> = { [K in keyof T]: boolean };
const flags: Flags<User> = { id: true, name: false, email: true };

// 모든 속성을 읽기 전용 / 선택 속성으로
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
type MyPartial<T> = { [K in keyof T]?: T[K] };

// -readonly, -? 로 수정자 제거
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };

// as 절로 키 걸러내기: Exclude<K, "id">는 키 유니언에서 "id"를 뺀 것
type WithoutId<T> = { [K in keyof T as Exclude<K, "id">]: T[K] };

const ro: MyReadonly<User> = { id: 1, name: "민지", email: "m@example.com" };
// ro.name = "준호";   // 오류: 읽기 전용

const draft: MyPartial<User> = { name: "민지" };
const noId: WithoutId<User> = { name: "민지", email: "m@example.com" };
const editable: Mutable<MyReadonly<User>> = { id: 2, name: "준호", email: "j@example.com" };
editable.name = "하늘";
const full: MyRequired<MyPartial<User>> = { id: 3, name: "나래", email: "n@example.com" };

console.log(flags.id, ro.name, draft.name, noId.email, editable.name, full.id);`
        },
        {
          title: "조건부 타입과 infer",
          body: "조건부 타입은 T extends U ? X : Y 형태로, 타입 수준에서 if문처럼 결과 타입을 고릅니다. 조건 안에서 infer 키워드를 쓰면 매칭된 부분의 타입을 변수로 뽑아낼 수 있어, 배열의 요소 타입이나 함수의 반환 타입을 꺼낼 때 사용합니다. 검사 대상이 타입 매개변수 그 자체이면 유니언에 분배되어, 유니언의 각 구성원마다 따로 계산한 결과를 합칩니다. 분배를 막으려면 [T] extends [U]처럼 대괄호로 감쌉니다. 분배 동작을 모르고 쓰면 결과가 예상과 달라지는 것이 흔한 실수입니다.",
          code: `type IsString<T> = T extends string ? true : false;
const yes: IsString<"hi"> = true;
const no: IsString<number> = false;

// infer로 배열의 요소 타입 뽑기
type ElementType<T> = T extends (infer U)[] ? U : T;
const e1: ElementType<number[]> = 5;       // number
const e2: ElementType<string> = "문자열";    // string

// infer로 함수 반환 타입 뽑기
type MyReturn<T> = T extends (...args: any[]) => infer R ? R : never;
const r1: MyReturn<() => string> = "결과";

// 분배: 유니언의 각 구성원에 따로 적용됨
type ToArray<T> = T extends unknown ? T[] : never;
const d1: ToArray<string | number> = ["a"];       // string[] | number[]

// 대괄호로 감싸면 분배되지 않음
type ToArrayWhole<T> = [T] extends [unknown] ? T[] : never;
const d2: ToArrayWhole<string | number> = ["a", 1]; // (string | number)[]

console.log(yes, no, e1, e2, r1, d1, d2);`
        },
        {
          title: "유틸리티 타입",
          body: "TypeScript에는 자주 쓰는 변환이 유틸리티 타입으로 내장되어 있습니다. Partial은 모든 속성을 선택으로, Required는 필수로, Readonly는 읽기 전용으로 바꾸고, Pick과 Omit은 속성을 골라내거나 제외합니다. Record<K, V>는 키 집합과 값 타입으로 객체 타입을 만들고, Extract, Exclude, NonNullable은 유니언에서 구성원을 걸러냅니다. ReturnType과 Parameters는 typeof 함수이름으로 가져온 함수 타입에서 반환 타입과 매개변수 타입을 꺼냅니다. 대부분 앞서 배운 매핑 타입과 조건부 타입으로 만들어져 있습니다. Partial이나 Readonly는 얕게만 적용된다는 점에 주의하세요.",
          code: `interface Todo {
  id: number;
  title: string;
  done: boolean;
}

const base: Todo = { id: 1, title: "공부", done: false };

// Partial: 수정할 속성만 받기
function updateTodo(todo: Todo, patch: Partial<Todo>): Todo {
  return { ...todo, ...patch };
}
const updated = updateTodo(base, { done: true });

type TodoPreview = Pick<Todo, "id" | "title">;   // 속성 고르기
type TodoInput = Omit<Todo, "id">;               // 속성 제외하기
const preview: TodoPreview = { id: 1, title: "공부" };
const input: TodoInput = { title: "운동", done: false };

// Record: 키 집합 -> 값 타입
type TodoCount = Record<"todo" | "doing" | "done", number>;
const counts: TodoCount = { todo: 3, doing: 1, done: 5 };

const frozen: Readonly<Todo> = base;
// frozen.done = true;   // 오류: 읽기 전용

function makeTodo(title: string): Todo {
  return { id: 2, title, done: false };
}
type Made = ReturnType<typeof makeTodo>;       // Todo
type MakeArgs = Parameters<typeof makeTodo>;   // [title: string]

type OnlyString = Extract<string | number | boolean, string>;    // string
type NoBoolean = Exclude<string | number | boolean, boolean>;    // string | number
type Clean = NonNullable<string | null | undefined>;             // string

const made: Made = makeTodo("독서");
const args: MakeArgs = ["산책"];
const os: OnlyString = "s";
const nb: NoBoolean = 1;
const cl: Clean = "c";

console.log(updated, preview, input, counts, frozen.title, made.title, args, os, nb, cl);`
        },
        {
          title: "strict 설정",
          body: "tsconfig.json의 compilerOptions에서 strict를 true로 하면 엄격한 검사 옵션 묶음이 한꺼번에 켜집니다. 여기에는 noImplicitAny(암묵적 any 금지), strictNullChecks(null과 undefined를 별도 타입으로 취급), strictFunctionTypes, strictPropertyInitialization(클래스 속성 초기화 확인), useUnknownInCatchVariables(catch의 변수를 unknown으로 취급) 등이 포함됩니다. 새 프로젝트는 처음부터 strict를 켜는 것이 좋고, 기존 JavaScript 프로젝트는 옵션을 하나씩 켜며 옮길 수 있습니다. noUncheckedIndexedAccess는 매우 유용하지만 strict에 포함되지 않으므로 따로 켜야 합니다. 오류가 귀찮다고 any나 ! 단언으로 덮는 것이 가장 흔한 실수입니다.",
          code: `// tsconfig.json 예시
// {
//   "compilerOptions": {
//     "target": "ES2022",
//     "strict": true,
//     "noUncheckedIndexedAccess": true
//   }
// }

function findUser(users: string[], target: string): string | undefined {
  return users.find((u) => u === target);
}

const found = findUser(["민지", "준호"], "민지");
// console.log(found.length);   // strictNullChecks: found가 undefined일 수 있어 오류
if (found !== undefined) {
  console.log(found.length);
}

// noImplicitAny: 매개변수 타입을 생략하면 오류
// function twice(x) { return x * 2; }   // 오류: x는 암묵적 any
function twice(x: number): number {
  return x * 2;
}

// strictPropertyInitialization: 속성은 반드시 초기화
class Account {
  balance: number;
  constructor(initial: number) {
    this.balance = initial;   // 이 줄이 없으면 오류
  }
}

// useUnknownInCatchVariables: catch의 e는 unknown
try {
  JSON.parse("{");
} catch (e) {
  if (e instanceof Error) {
    console.log("파싱 실패");
  }
}

console.log(twice(21), new Account(100).balance);`
        }
      ],
      quiz: [
        {
          q: "다음 코드의 결과는?\n\nfunction f<T extends { length: number }>(x: T) {\n  return x.length;\n}\nf(10);",
          choices: [
            "10이 반환된다",
            "오류: number에는 length 속성이 없어 제약을 만족하지 않는다",
            "오류: 제네릭 함수에는 extends를 쓸 수 없다",
            "undefined가 반환된다"
          ],
          answer: 1,
          why: "T는 length를 가진 타입으로 제한되는데 number에는 length가 없으므로, 호출 시점에 제약을 만족하지 않는다는 컴파일 오류가 납니다."
        },
        {
          q: "다음 코드의 결과는?\n\nfunction getProp<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key];\n}\nconst user = { name: \"민지\", age: 25 };\ngetProp(user, \"email\");",
          choices: [
            "undefined를 반환한다",
            "컴파일은 되고 런타임에만 오류가 난다",
            "오류 없이 any를 반환한다",
            "오류: \"email\"은 user의 키가 아니라서 K의 제약을 만족하지 않는다"
          ],
          answer: 3,
          why: "K는 keyof T, 즉 \"name\" | \"age\"만 가능하므로 존재하지 않는 키 \"email\"은 컴파일 단계에서 거부됩니다."
        },
        {
          q: "함수의 반환 타입을 v is number로 적은 사용자 정의 타입 가드의 의미로 옳은 것은?",
          choices: [
            "true를 반환한 분기에서 v가 number로 좁혀진다",
            "함수가 항상 number를 반환한다",
            "컴파일러가 본문을 검사해 v가 정말 number인지 증명해 준다",
            "v를 number로 자동 변환해 준다"
          ],
          answer: 0,
          why: "타입 서술어는 true를 반환하면 해당 타입이라고 컴파일러에 알려 주는 약속입니다. 본문이 맞는지는 컴파일러가 검사하지 않으며 값을 변환하지도 않습니다."
        },
        {
          q: "다음 타입 F는?\n\ntype Flags<T> = { [K in keyof T]: boolean };\ntype F = Flags<{ a: string; b: number }>;",
          choices: [
            "{ a: string; b: number }",
            "{ a: boolean }",
            "{ a: boolean; b: boolean }",
            "boolean"
          ],
          answer: 2,
          why: "매핑 타입은 모든 키를 순회하며 값 타입을 boolean으로 바꾸므로 a와 b가 모두 boolean인 객체 타입이 됩니다."
        },
        {
          q: "다음 타입 R은?\n\ntype ToArray<T> = T extends unknown ? T[] : never;\ntype R = ToArray<string | number>;",
          choices: [
            "(string | number)[]",
            "string[] | number[]",
            "never",
            "string[]"
          ],
          answer: 1,
          why: "T가 타입 매개변수 그대로 검사되므로 조건부 타입이 유니언의 각 구성원에 분배되어 string[]과 number[]의 유니언이 됩니다."
        },
        {
          q: "다음 타입 X는?\n\ntype Elem<T> = T extends (infer U)[] ? U : T;\ntype X = Elem<boolean[]>;",
          choices: [
            "boolean[]",
            "never",
            "T",
            "boolean"
          ],
          answer: 3,
          why: "boolean[]은 (infer U)[] 형태와 일치하므로 U가 boolean으로 추론되어 결과는 boolean입니다."
        },
        {
          q: "Todo의 모든 속성을 선택 속성으로 바꾼 타입을 만드는 유틸리티 타입은?",
          choices: [
            "Required<Todo>",
            "Readonly<Todo>",
            "Partial<Todo>",
            "Pick<Todo, keyof Todo>"
          ],
          answer: 2,
          why: "Partial은 모든 속성에 ?를 붙여 선택 속성으로 만듭니다. Required는 반대로 필수로, Readonly는 읽기 전용으로 만듭니다."
        },
        {
          q: "tsconfig.json에서 strict: true를 켜도 함께 켜지지 않는 옵션은?",
          choices: [
            "noUncheckedIndexedAccess",
            "strictNullChecks",
            "noImplicitAny",
            "strictPropertyInitialization"
          ],
          answer: 0,
          why: "strictNullChecks, noImplicitAny, strictPropertyInitialization은 strict에 포함되지만 noUncheckedIndexedAccess는 포함되지 않아 따로 켜야 합니다."
        }
      ],
      practice: [
        {
          title: "keyof 제약으로 속성 뽑기",
          task: `객체 배열 items와 키 key를 받아 각 객체의 key 속성 값만 모은 배열을 반환하는 제네릭 함수 pluck을 작성하세요. 타입 매개변수는 T와 K extends keyof T를 쓰고 반환 타입은 T[K][]입니다. pluck([{ name: "a", age: 1 }, { name: "b", age: 2 }], "name")을 출력하면 [ 'a', 'b' ]가 나와야 합니다.`,
          hint: "items.map으로 각 요소에서 item[key]를 꺼내면 됩니다.",
          solution: `function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

const people = [
  { name: "a", age: 1 },
  { name: "b", age: 2 }
];

console.log(pluck(people, "name"));`,
          explain: "K extends keyof T 덕분에 존재하지 않는 키는 컴파일 단계에서 거부되고, 반환 타입 T[K][]로 name이면 string[]이 정확히 추론됩니다. 실행 결과는 [ 'a', 'b' ]입니다."
        },
        {
          title: "문자열 배열 타입 가드",
          task: `unknown 값이 string[]인지 판별하는 사용자 정의 타입 가드 isStringArray를 작성하세요. 배열이면서 모든 요소가 string이어야 true입니다. ["a", "b"], [1, 2], "ab"를 차례로 검사해 출력하면 true, false, false가 나와야 합니다.`,
          hint: "반환 타입은 value is string[]이고, Array.isArray와 every를 함께 사용합니다.",
          solution: `function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((x) => typeof x === "string");
}

const inputs: unknown[] = [["a", "b"], [1, 2], "ab"];

for (const v of inputs) {
  console.log(isStringArray(v));
}`,
          explain: "Array.isArray로 배열인지 먼저 확인한 뒤 every로 모든 요소의 타입을 검사합니다. true를 반환한 분기에서는 값이 string[]으로 좁혀지며, 결과는 true, false, false입니다."
        },
        {
          title: "조건부 타입으로 Promise 벗기기",
          task: `Promise의 결과 타입을 꺼내는 조건부 타입 Unwrap<T>를 infer로 정의하세요. T가 Promise<U>이면 U, 아니면 T 자체입니다. Unwrap<Promise<number>> 타입의 변수 a에 42를, Unwrap<string> 타입의 변수 b에 "hi"를 넣고 console.log(a, b)로 출력하면 42 hi가 나와야 합니다.`,
          hint: "type Unwrap<T> = T extends Promise<infer U> ? U : T; 형태로 작성합니다.",
          solution: `type Unwrap<T> = T extends Promise<infer U> ? U : T;

const a: Unwrap<Promise<number>> = 42;
const b: Unwrap<string> = "hi";

console.log(a, b);`,
          explain: "Promise<number>는 Promise<infer U>와 일치하므로 U가 number가 되고, string은 일치하지 않아 그대로 string이 됩니다. 그래서 두 변수에 각각 숫자와 문자열을 넣을 수 있고 출력은 42 hi입니다."
        }
      ]
    }
  ]
});
