(window.LANG_DATA = window.LANG_DATA || []).push({
  id: "csharp", name: "C#", kind: "마이크로소프트가 만든 범용 객체지향 언어", runnable: null,
  use: "Windows 프로그램, 웹 서버(ASP.NET Core), 업무용 시스템 개발에 쓰이며 Unity 게임 개발의 기본 언어이기도 합니다.",
  tip: "C#은 자료형이 엄격한 정적 타입 언어라서, 코드를 실행하기 전에 컴파일러가 많은 실수를 미리 알려줍니다.",
  intro: "C#(씨샵)은 마이크로소프트가 만든 언어로, .NET이라는 실행 환경 위에서 동작합니다. 문법이 비교적 깔끔하고 도구 지원이 좋아서 입문용으로도 많이 선택됩니다. 이 레슨에서는 출력, 변수, 조건문, 반복문, 메서드의 기초를 배웁니다.",
  lessons: [
    {
      title: "첫 프로그램: 화면에 출력하기",
      body: "C#에서 콘솔(검은 창)에 글자를 출력할 때는 Console.WriteLine을 사용합니다. 출력할 글자는 큰따옴표로 감싸고, 문장 끝에는 세미콜론(;)을 붙입니다. 최신 C#에서는 최상위 문(top-level statements) 덕분에 Main 메서드나 클래스를 쓰지 않고도 이렇게 한 줄만으로 프로그램을 시작할 수 있습니다.",
      code: `Console.WriteLine("안녕하세요, C#!");
Console.WriteLine("첫 번째 프로그램입니다.");`
    },
    {
      title: "변수와 자료형",
      body: "변수는 값을 담아 두는 이름 붙은 상자입니다. int는 정수, double은 소수, string은 문자열, bool은 참(true) 또는 거짓(false)을 저장합니다. C#은 변수를 만들 때 자료형을 정해야 하며, var를 쓰면 컴파일러가 오른쪽 값을 보고 자료형을 알아서 정해 줍니다.",
      code: `int age = 20;
double height = 175.5;
string name = "민수";
bool isStudent = true;
var score = 90; // int로 자동 결정

Console.WriteLine(name);
Console.WriteLine(age);`
    },
    {
      title: "문자열 보간과 계산",
      body: "문자열 앞에 $를 붙이면 중괄호 { } 안에 변수나 계산식을 바로 넣을 수 있습니다. 이를 문자열 보간이라고 하며, 글자를 + 로 이어 붙이는 것보다 읽기 쉽습니다. 더하기(+), 빼기(-), 곱하기(*), 나누기(/) 같은 산술 연산자도 그대로 쓸 수 있습니다.",
      code: `string name = "민수";
int a = 7;
int b = 3;

Console.WriteLine($"안녕하세요, {name}님!");
Console.WriteLine($"{a} + {b} = {a + b}");
Console.WriteLine($"{a} * {b} = {a * b}");`
    },
    {
      title: "조건문 if / else",
      body: "if는 조건이 참일 때만 중괄호 안의 코드를 실행합니다. 조건이 거짓일 때 실행할 코드는 else 블록에 적습니다. 조건에는 >, <, >=, <=, ==(같다), !=(다르다) 같은 비교 연산자를 사용하며, 결과는 true 또는 false가 됩니다.",
      code: `int score = 85;

if (score >= 90)
{
    Console.WriteLine("A 학점");
}
else if (score >= 80)
{
    Console.WriteLine("B 학점");
}
else
{
    Console.WriteLine("C 학점 이하");
}`
    },
    {
      title: "반복문과 메서드",
      body: "for 문은 정해진 횟수만큼 코드를 반복하고, foreach 문은 배열 같은 묶음의 요소를 하나씩 꺼내 처리합니다. 메서드는 자주 쓰는 코드를 이름 붙여 묶어 둔 것으로, 앞에 반환 자료형을 적고 return으로 결과를 돌려줍니다. 값을 돌려주지 않는 메서드는 반환 자료형 자리에 void를 씁니다. 최상위 문 방식에서는 메서드를 호출하는 코드보다 아래에 정의해도 됩니다.",
      code: `for (int i = 1; i <= 3; i++)
{
    Console.WriteLine($"반복 {i}번째");
}

int[] numbers = { 10, 20, 30 };
foreach (int n in numbers)
{
    Console.WriteLine(n);
}

int result = Add(2, 5);
Console.WriteLine($"2 + 5 = {result}");

static int Add(int x, int y)
{
    return x + y;
}`
    }
  ],
  quiz: [
    {
      q: "C#에서 콘솔에 한 줄을 출력할 때 사용하는 코드는 무엇일까요?",
      choices: ["print(\"안녕\")", "Console.WriteLine(\"안녕\");", "echo \"안녕\"", "System.out.println(\"안녕\");"],
      answer: 1,
      why: "C#은 Console.WriteLine으로 콘솔에 출력하며 문장 끝에 세미콜론을 붙입니다. 나머지는 다른 언어의 출력 방식입니다."
    },
    {
      q: "나이처럼 소수점이 없는 정수를 저장하기에 알맞은 자료형은 무엇일까요?",
      choices: ["int", "string", "bool", "double"],
      answer: 0,
      why: "int는 정수를 저장하는 자료형입니다. string은 문자열, bool은 참/거짓, double은 소수를 저장합니다."
    },
    {
      q: "문자열 보간에서 변수 값을 문자열 안에 넣을 때, 변수 이름을 감싸는 기호는 무엇일까요? (예: $\"안녕, {name}\")",
      choices: ["( )", "[ ]", "< >", "{ }"],
      answer: 3,
      why: "$ 를 붙인 문자열 안에서는 중괄호 { } 로 변수나 식을 감싸 값을 넣습니다."
    },
    {
      q: "for (int i = 0; i < 3; i++) 반복문의 중괄호 안 코드는 모두 몇 번 실행될까요?",
      choices: ["2번", "4번", "3번", "한 번도 실행되지 않는다"],
      answer: 2,
      why: "i가 0, 1, 2일 때 조건 i < 3이 참이므로 총 3번 실행되고, i가 3이 되면 반복이 끝납니다."
    },
    {
      q: "값을 돌려주지 않는 메서드를 만들 때 반환 자료형 자리에 쓰는 키워드는 무엇일까요?",
      choices: ["null", "void", "none", "empty"],
      answer: 1,
      why: "void는 메서드가 반환값이 없다는 뜻입니다. 값을 돌려주는 메서드는 int 같은 자료형을 쓰고 return을 사용합니다."
    },
    {
      q: "if 문의 조건이 거짓(false)일 때 실행되는 블록을 만드는 키워드는 무엇일까요?",
      choices: ["then", "elif", "otherwise", "else"],
      answer: 3,
      why: "C#에서는 if 조건이 거짓일 때 else 블록이 실행됩니다. 중간 조건은 else if로 씁니다."
    }
  ]
});
