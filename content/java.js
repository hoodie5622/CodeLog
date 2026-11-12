(window.LANG_DATA = window.LANG_DATA || []).push({
  id: "java", name: "Java", kind: "범용 객체지향 프로그래밍 언어", runnable: null,
  use: "대규모 서버 백엔드, 안드로이드 앱, 기업용 시스템 개발에 널리 쓰입니다.",
  tip: "Java는 정적 타입 언어라서 모든 변수의 자료형이 컴파일 시점에 정해지고(입문 단계에서는 int, String처럼 직접 적습니다), 대소문자를 엄격히 구분합니다.",
  intro: "Java는 객체지향 방식을 따르는 범용 프로그래밍 언어입니다. 소스 코드를 바이트코드로 컴파일한 뒤 JVM(자바 가상 머신)에서 실행하기 때문에 JVM이 있는 환경이라면 운영체제와 관계없이 실행할 수 있습니다. 오랫동안 쌓인 방대한 라이브러리와 안정성 덕분에 기업 환경에서 특히 많이 사용됩니다.",
  lessons: [
    {
      title: "첫 프로그램: Hello, Java",
      body: "Java의 모든 코드는 클래스 안에 들어갑니다. 프로그램은 `public static void main(String[] args)` 메서드에서 시작하며, 화면에 글자를 출력할 때는 System.out.println을 사용합니다. 문장은 세미콜론(;)으로 끝내고, 파일 이름은 public 클래스 이름과 같아야 합니다(예: Main.java).",
      code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}`
    },
    {
      title: "변수와 자료형",
      body: "변수는 값을 담는 이름 붙은 상자이며, Java에서는 자료형을 먼저 적습니다. 정수는 int, 소수는 double, 참/거짓은 boolean, 문자열은 String을 사용합니다. 문자열은 큰따옴표로 감싸고, + 연산자로 문자열과 값을 이어 붙일 수 있습니다.",
      code: `public class Main {
    public static void main(String[] args) {
        String name = "민수";
        int age = 20;
        double height = 175.5;
        boolean isStudent = true;

        System.out.println("이름: " + name);
        System.out.println("나이: " + age);
        System.out.println("키: " + height);
        System.out.println("학생 여부: " + isStudent);
    }
}`
    },
    {
      title: "조건문 if / else",
      body: "if 문은 조건이 true일 때만 중괄호 안의 코드를 실행합니다. 조건이 맞지 않을 때 실행할 코드는 else if와 else로 적을 수 있습니다. 값을 비교할 때는 >, <, >=, <=, == 같은 비교 연산자를 사용합니다.",
      code: `public class Main {
    public static void main(String[] args) {
        int score = 85;

        if (score >= 90) {
            System.out.println("A 등급");
        } else if (score >= 80) {
            System.out.println("B 등급");
        } else {
            System.out.println("C 등급 이하");
        }
    }
}`
    },
    {
      title: "반복문과 배열",
      body: "for 문은 초깃값; 조건; 증감식의 세 부분으로 반복 횟수를 조절합니다. 배열은 같은 자료형의 값을 여러 개 모아 두는 구조이며, 인덱스는 0부터 시작하고 length로 길이를 알 수 있습니다. 아래 코드는 배열의 모든 값을 더해 합계를 구합니다.",
      code: `public class Main {
    public static void main(String[] args) {
        int[] numbers = {10, 20, 30, 40};
        int sum = 0;

        for (int i = 0; i < numbers.length; i++) {
            sum += numbers[i];
        }

        System.out.println("합계: " + sum);
    }
}`
    },
    {
      title: "메서드와 클래스",
      body: "메서드는 자주 쓰는 동작에 이름을 붙여 재사용하는 기능으로, 반환 타입과 매개변수를 지정합니다. 값을 돌려주지 않는 메서드는 반환 타입을 void로 적습니다. 클래스는 데이터(필드)와 동작(메서드)을 묶는 설계도이며, new 키워드로 객체를 만들어 사용합니다.",
      code: `class Dog {
    String name;

    Dog(String name) {
        this.name = name;
    }

    void bark() {
        System.out.println(name + ": 멍멍!");
    }
}

public class Main {
    static int add(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        System.out.println(add(3, 4));

        Dog dog = new Dog("바둑이");
        dog.bark();
    }
}`
    }
  ],
  quiz: [
    {
      q: "Java 프로그램이 실행을 시작하는 지점은 어디일까요?",
      choices: ["start() 메서드", "main 메서드", "run() 메서드", "init 블록"],
      answer: 1,
      why: "Java 프로그램은 `public static void main(String[] args)` 메서드에서 실행이 시작됩니다."
    },
    {
      q: "화면에 한 줄을 출력하고 줄을 바꾸는 올바른 코드는 무엇일까요?",
      choices: ["System.out.println(\"안녕\");", "print(\"안녕\")", "console.log(\"안녕\");", "echo \"안녕\""],
      answer: 0,
      why: "Java에서는 System.out.println으로 출력하며, 문장 끝에 세미콜론을 붙입니다."
    },
    {
      q: "나이처럼 정수 값을 저장하기에 알맞은 자료형은 무엇일까요?",
      choices: ["String", "boolean", "int", "double"],
      answer: 2,
      why: "int는 정수를 저장하는 자료형입니다. double은 소수, boolean은 참/거짓, String은 문자열용입니다."
    },
    {
      q: "문자열 변수를 올바르게 선언한 것은 무엇일까요?",
      choices: ["string name = 'Java';", "String name = 'Java';", "text name = \"Java\";", "String name = \"Java\";"],
      answer: 3,
      why: "Java의 문자열 자료형은 대문자로 시작하는 String이며, 값은 큰따옴표로 감쌉니다."
    },
    {
      q: "for (int i = 0; i < 3; i++) 반복문의 본문은 몇 번 실행될까요?",
      choices: ["2번", "3번", "4번", "무한 반복"],
      answer: 1,
      why: "i가 0, 1, 2일 때 조건 i < 3이 참이므로 본문은 3번 실행됩니다."
    },
    {
      q: "값을 반환하지 않는 메서드의 반환 타입으로 쓰는 키워드는 무엇일까요?",
      choices: ["void", "null", "empty", "none"],
      answer: 0,
      why: "반환할 값이 없는 메서드는 반환 타입을 void로 적습니다."
    }
  ]
});
