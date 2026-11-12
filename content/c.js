(window.LANG_DATA = window.LANG_DATA || []).push({
  id: "c", name: "C", kind: "컴파일 방식의 저수준 범용 프로그래밍 언어", runnable: null,
  use: "운영체제, 임베디드(마이크로컨트롤러) 소프트웨어, 장치 드라이버처럼 하드웨어와 가까운 프로그램을 만들 때 많이 쓰입니다. 속도와 메모리 제어가 중요한 라이브러리에도 쓰입니다.",
  tip: "C는 메모리를 직접 다루는 언어라서 자유도가 높은 만큼 실수에 대한 안전장치가 적고, 코드를 먼저 컴파일해야 실행할 수 있습니다.",
  intro: "C는 1970년대 초 데니스 리치(Dennis Ritchie)가 벨 연구소에서 만든 언어로, 유닉스 운영체제를 작성하는 데 쓰이면서 널리 퍼졌습니다. 소스 코드를 컴파일러로 기계어로 바꾼 뒤 실행하는 방식이며, 많은 현대 언어가 C의 문법에 영향을 받았습니다. 문법이 비교적 작아서 컴퓨터가 동작하는 원리를 배우기에 좋습니다.",
  lessons: [
    {
      title: "첫 프로그램: Hello, C!",
      body: "C 프로그램은 main 함수에서 실행이 시작됩니다. #include <stdio.h>는 화면 출력 함수 printf를 쓰기 위해 필요한 줄입니다. \\n은 줄바꿈을 뜻하고, 각 문장은 세미콜론(;)으로 끝납니다. return 0;은 프로그램이 정상적으로 끝났다는 뜻입니다.",
      code: `#include <stdio.h>

int main(void) {
    printf("Hello, C!\\n");
    return 0;
}`
    },
    {
      title: "변수와 자료형",
      body: "변수는 값을 담는 이름 붙은 상자이고, C에서는 만들 때 자료형을 반드시 적어야 합니다. int는 정수, double은 소수, char는 문자 한 글자를 담습니다. printf에서는 %d(정수), %f(소수), %c(문자) 같은 서식 지정자로 값이 들어갈 자리를 표시합니다. 문자는 작은따옴표('A'), 문자열은 큰따옴표(\"abc\")를 씁니다.",
      code: `#include <stdio.h>

int main(void) {
    int age = 20;
    double height = 175.5;
    char grade = 'A';

    printf("나이: %d\\n", age);
    printf("키: %.1f\\n", height);
    printf("등급: %c\\n", grade);
    return 0;
}`
    },
    {
      title: "조건문 if / else",
      body: "if 문은 조건이 참일 때만 중괄호 안의 코드를 실행하고, 아니면 else 쪽을 실행합니다. 값을 비교할 때는 같은지 묻는 ==, 크거나 같은지 묻는 >= 등을 씁니다. 등호 하나(=)는 비교가 아니라 값을 저장하는 대입이므로 헷갈리지 않게 주의하세요.",
      code: `#include <stdio.h>

int main(void) {
    int score = 85;

    if (score >= 90) {
        printf("A\\n");
    } else if (score >= 80) {
        printf("B\\n");
    } else {
        printf("C\\n");
    }
    return 0;
}`
    },
    {
      title: "반복문 for",
      body: "for 문은 같은 작업을 여러 번 반복할 때 씁니다. 괄호 안에는 시작값, 반복 조건, 매 반복 후 실행할 증가식이 세미콜론으로 구분되어 들어갑니다. 아래 예제는 i가 1부터 5까지 변하며 5번 반복하고, 값을 sum에 더해 합계 15를 구합니다. i++는 i를 1 증가시킵니다.",
      code: `#include <stdio.h>

int main(void) {
    int sum = 0;

    for (int i = 1; i <= 5; i++) {
        sum = sum + i;
    }

    printf("1부터 5까지의 합: %d\\n", sum);
    return 0;
}`
    },
    {
      title: "함수 만들기",
      body: "함수는 자주 쓰는 작업에 이름을 붙여 묶어 둔 것입니다. 함수 앞에는 결과 자료형을 적는데, int add(int a, int b)는 정수 두 개를 받아 정수를 돌려준다는 뜻입니다. 돌려줄 값이 없으면 결과 자료형으로 void를 씁니다. 함수는 부르는 곳(여기서는 main)보다 앞에 정의(또는 선언)해 두어야 합니다.",
      code: `#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

void say_hello(void) {
    printf("안녕하세요!\\n");
}

int main(void) {
    int result = add(3, 4);
    printf("3 + 4 = %d\\n", result);
    say_hello();
    return 0;
}`
    }
  ],
  quiz: [
    {
      q: "C 프로그램에서 실행이 시작되는 함수는 무엇일까요?",
      choices: ["start()", "main()", "run()", "begin()"],
      answer: 1,
      why: "C 프로그램은 항상 main 함수에서 실행을 시작합니다."
    },
    {
      q: "printf에서 정수(int) 값을 출력할 자리를 나타내는 서식 지정자는 무엇일까요?",
      choices: ["%c", "%f", "%s", "%d"],
      answer: 3,
      why: "%d는 정수를 출력하는 서식 지정자입니다. %c는 문자, %f는 소수에 쓰입니다."
    },
    {
      q: "C에서 하나의 문장을 끝낼 때 붙이는 기호는 무엇일까요?",
      choices: [";", ":", ".", ","],
      answer: 0,
      why: "C의 문장은 세미콜론(;)으로 끝납니다."
    },
    {
      q: "for (int i = 1; i <= 5; i++) { ... } 는 중괄호 안의 코드를 몇 번 실행할까요?",
      choices: ["4번", "6번", "5번", "끝없이 반복"],
      answer: 2,
      why: "i가 1, 2, 3, 4, 5일 때 조건이 참이므로 모두 5번 실행됩니다."
    },
    {
      q: "문자 한 글자('A')를 저장하기에 알맞은 자료형은 무엇일까요?",
      choices: ["int", "char", "double", "void"],
      answer: 1,
      why: "char는 문자 한 글자를 담는 자료형입니다. double은 소수, int는 정수를 담습니다."
    },
    {
      q: "값을 돌려주지 않는 함수를 만들 때 결과 자료형으로 쓰는 것은 무엇일까요?",
      choices: ["int", "char", "double", "void"],
      answer: 3,
      why: "돌려줄 값이 없는 함수는 결과 자료형을 void로 적습니다."
    }
  ]
});
