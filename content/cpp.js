(window.LANG_DATA = window.LANG_DATA || []).push({
  id: "cpp", name: "C++", kind: "컴파일 방식의 범용 프로그래밍 언어", runnable: null,
  use: "게임 엔진, 운영체제와 드라이버, 임베디드 시스템, 고성능 프로그램, 코딩 테스트와 알고리즘 대회 등에서 많이 쓰입니다.",
  tip: "코드를 먼저 컴파일러로 기계어로 바꾼 뒤 실행하며, 타입을 직접 적어야 하고 문장 끝에 세미콜론(;)을 붙여야 합니다.",
  intro: "C++는 C 언어를 바탕으로 객체지향 등 여러 기능을 더해 만든 언어로, 빠른 실행 속도와 세밀한 제어가 강점입니다. 소스 코드를 컴파일러로 번역해 실행 파일을 만든 다음 실행합니다. 처음에는 규칙이 엄격하게 느껴지지만, 기본 문법을 익히면 컴퓨터가 어떻게 동작하는지 깊이 이해할 수 있습니다.",
  lessons: [
    {
      title: "첫 프로그램: Hello, World",
      body: "C++ 프로그램은 main 함수에서 시작합니다. #include <iostream>은 입출력 기능을 가져오는 줄이고, std::cout은 화면에 글자를 출력합니다. << 기호로 출력할 내용을 이어 붙이며, 각 문장은 세미콜론(;)으로 끝냅니다.",
      code: `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`
    },
    {
      title: "변수와 자료형",
      body: "변수는 값을 담아 두는 이름 붙은 상자이고, C++에서는 만들 때 자료형을 적어야 합니다. 정수는 int, 소수는 double, 참/거짓은 bool, 문자열은 std::string(<string> 헤더 필요)을 씁니다. int끼리 나누면 소수점 아래가 버려져서 7 / 2의 결과는 3이 됩니다.",
      code: `#include <iostream>
#include <string>

int main() {
    int age = 20;
    double height = 175.5;
    bool isStudent = true;
    std::string name = "민수";

    std::cout << name << " " << age << std::endl;
    std::cout << height << std::endl;
    std::cout << isStudent << std::endl;
    std::cout << 7 / 2 << std::endl;
    return 0;
}`
    },
    {
      title: "입력받기와 조건문",
      body: "std::cin >> 변수; 로 키보드 입력을 변수에 저장할 수 있습니다. if 문은 괄호 안의 조건이 참일 때만 중괄호 안의 코드를 실행하고, 아니면 else 쪽을 실행합니다. 같은지 비교할 때는 =가 아니라 ==를 사용합니다.",
      code: `#include <iostream>

int main() {
    int score;
    std::cout << "점수를 입력하세요: ";
    std::cin >> score;

    if (score >= 60) {
        std::cout << "합격" << std::endl;
    } else {
        std::cout << "불합격" << std::endl;
    }
    return 0;
}`
    },
    {
      title: "반복문",
      body: "같은 일을 여러 번 할 때는 반복문을 씁니다. for (초기화; 조건; 증가) 형태는 횟수가 정해져 있을 때 편하고, while (조건)은 조건이 참인 동안 계속 반복합니다. i++는 i의 값을 1 증가시킨다는 뜻입니다.",
      code: `#include <iostream>

int main() {
    for (int i = 0; i < 5; i++) {
        std::cout << "for: " << i << std::endl;
    }

    int n = 3;
    while (n > 0) {
        std::cout << "while: " << n << std::endl;
        n--;
    }
    return 0;
}`
    },
    {
      title: "함수와 vector",
      body: "함수는 자주 쓰는 코드를 이름을 붙여 묶은 것으로, 반환할 값의 자료형을 앞에 적고 값을 돌려줄 때 return을 씁니다. 돌려줄 값이 없으면 반환 자료형으로 void를 씁니다. std::vector는 크기가 늘어나는 배열처럼 쓰는 자료형이며, push_back으로 끝에 값을 추가하고 size()로 개수를 알 수 있습니다.",
      code: `#include <iostream>
#include <vector>

int add(int a, int b) {
    return a + b;
}

void sayHi() {
    std::cout << "안녕하세요" << std::endl;
}

int main() {
    sayHi();
    std::cout << add(3, 4) << std::endl;

    std::vector<int> nums;
    nums.push_back(10);
    nums.push_back(20);
    nums.push_back(30);

    for (int x : nums) {
        std::cout << x << std::endl;
    }
    std::cout << nums.size() << std::endl;
    return 0;
}`
    }
  ],
  quiz: [
    {
      q: "C++에서 화면에 글자를 출력할 때 사용하는 것은?",
      choices: ["std::cin", "std::cout", "return", "#include"],
      answer: 1,
      why: "std::cout은 출력 스트림으로, << 와 함께 화면에 값을 출력합니다. std::cin은 입력에 쓰입니다."
    },
    {
      q: "정수 값을 저장하는 변수를 만들 때 쓰는 자료형은?",
      choices: ["int", "double", "bool", "std::string"],
      answer: 0,
      why: "int는 정수 자료형입니다. double은 소수, bool은 참/거짓, std::string은 문자열을 담습니다."
    },
    {
      q: "int 자료형끼리 계산한 7 / 2의 결과를 출력하면 무엇이 나올까요?",
      choices: ["3.5", "4", "3", "2"],
      answer: 2,
      why: "정수끼리 나누면 소수점 아래가 버려지므로 3이 됩니다."
    },
    {
      q: "for (int i = 0; i < 5; i++) { ... } 의 중괄호 안 코드는 몇 번 실행될까요?",
      choices: ["3번", "4번", "6번", "5번"],
      answer: 3,
      why: "i가 0, 1, 2, 3, 4일 때 조건 i < 5가 참이므로 모두 5번 실행됩니다."
    },
    {
      q: "값을 돌려주지 않는 함수를 만들 때 반환 자료형으로 쓰는 것은?",
      choices: ["int", "void", "bool", "main"],
      answer: 1,
      why: "void는 반환할 값이 없다는 뜻입니다."
    },
    {
      q: "std::vector 끝에 새 값을 추가하는 멤버 함수는?",
      choices: ["size()", "return()", "push_back()", "cin()"],
      answer: 2,
      why: "push_back(값)은 vector의 맨 뒤에 값을 추가합니다. size()는 원소 개수를 알려 줍니다."
    }
  ]
});
