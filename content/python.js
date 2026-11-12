(window.LANG_DATA = window.LANG_DATA || []).push({
  id: "python",
  name: "Python",
  kind: "범용 인터프리터 방식 프로그래밍 언어",
  runnable: null,
  use: "데이터 분석, 인공지능과 머신러닝, 웹 서버 개발, 자동화 스크립트, 교육 등 매우 다양한 분야에서 쓰입니다.",
  tip: "중괄호 대신 들여쓰기로 코드 블록을 구분하기 때문에 코드가 깔끔하게 읽힙니다.",
  intro: "Python은 문법이 간결하고 읽기 쉬워서 처음 프로그래밍을 배우는 사람에게 많이 추천되는 언어입니다. 코드를 한 줄씩 실행하는 인터프리터 방식이라 결과를 바로 확인하며 배울 수 있습니다. 풍부한 라이브러리 덕분에 작은 스크립트부터 큰 서비스까지 폭넓게 활용됩니다.",
  lessons: [
    {
      title: "print()로 화면에 출력하기",
      body: "print() 함수는 괄호 안의 값을 화면에 보여 줍니다. 글자(문자열)는 큰따옴표(\") 또는 작은따옴표(')로 감쌉니다. # 기호 뒤에 쓴 내용은 주석이라서 실행되지 않고, 설명을 남길 때 사용합니다.",
      code: `# 화면에 글자를 출력합니다
print("안녕하세요, 파이썬!")
print('작은따옴표도 괜찮아요')
print(1 + 2)  # 숫자 계산 결과: 3`
    },
    {
      title: "변수와 자료형",
      body: "변수는 값에 이름을 붙여 저장하는 상자와 같고, = 기호로 값을 넣습니다. 정수(int), 실수(float), 문자열(str), 참/거짓(bool)이 대표적인 자료형입니다. type() 함수로 값의 자료형을 확인할 수 있습니다. f-string(문자열 앞에 f를 붙임)을 쓰면 {} 안에 변수 값을 끼워 넣을 수 있습니다.",
      code: `name = "민수"
age = 20
height = 175.5
is_student = True

print(name, age, height, is_student)
print(type(age))      # <class 'int'>
print(type(height))   # <class 'float'>
print(f"{name}의 나이는 {age}살입니다.")`
    },
    {
      title: "조건문 if / elif / else",
      body: "조건문은 조건이 참인지 거짓인지에 따라 실행할 코드를 고릅니다. 조건 뒤에는 콜론(:)을 붙이고, 실행할 코드는 들여쓰기(보통 공백 4칸)로 표시합니다. Python은 중괄호 대신 이 들여쓰기로 코드 블록을 구분하므로 들여쓰기가 매우 중요합니다. 같음 비교는 == 를 사용합니다.",
      code: `score = 85

if score >= 90:
    print("A 등급")
elif score >= 80:
    print("B 등급")
else:
    print("C 등급 이하")

# score가 85이므로 "B 등급"이 출력됩니다`
    },
    {
      title: "리스트와 for 반복문",
      body: "리스트는 여러 값을 대괄호 [] 안에 순서대로 담는 자료형입니다. 번호(인덱스)는 0부터 시작하므로 첫 번째 값은 fruits[0]입니다. for 반복문은 리스트의 값을 하나씩 꺼내 같은 작업을 반복합니다. range(3)은 0, 1, 2를 차례로 만들어 줍니다.",
      code: `fruits = ["사과", "바나나", "포도"]
print(fruits[0])      # 사과
fruits.append("딸기") # 리스트 끝에 추가
print(len(fruits))    # 4

for fruit in fruits:
    print("과일:", fruit)

for i in range(3):
    print(i)          # 0, 1, 2`
    },
    {
      title: "함수 만들기",
      body: "함수는 자주 쓰는 코드를 묶어 이름을 붙인 것으로, def 키워드로 정의합니다. 괄호 안의 매개변수로 값을 전달받고, return으로 결과를 돌려줍니다. 한 번 만들어 두면 이름만 불러서 여러 번 재사용할 수 있습니다.",
      code: `def add(a, b):
    return a + b

def greet(name):
    return f"안녕하세요, {name}님!"

result = add(3, 5)
print(result)             # 8
print(greet("지민"))      # 안녕하세요, 지민님!`
    }
  ],
  quiz: [
    {
      q: "print(\"안녕\")이 하는 일은 무엇인가요?",
      choices: ["사용자에게 값을 입력받는다", "괄호 안의 값을 화면에 출력한다", "파일을 저장한다", "변수를 삭제한다"],
      answer: 1,
      why: "print() 함수는 괄호 안의 값을 화면에 출력합니다."
    },
    {
      q: "Python에서 주석을 시작하는 기호는 무엇인가요?",
      choices: ["#", "//", "--", "/* */"],
      answer: 0,
      why: "Python에서는 # 기호 뒤의 내용이 주석으로 처리되어 실행되지 않습니다."
    },
    {
      q: "type(3.14)의 결과로 알맞은 것은 무엇인가요?",
      choices: ["<class 'int'>", "<class 'str'>", "<class 'float'>", "<class 'bool'>"],
      answer: 2,
      why: "3.14처럼 소수점이 있는 숫자는 실수이므로 float 자료형입니다."
    },
    {
      q: "Python에서 if문 등의 코드 블록을 구분하는 방법은 무엇인가요?",
      choices: ["중괄호 { }", "begin과 end 키워드", "세미콜론 ;", "들여쓰기"],
      answer: 3,
      why: "Python은 중괄호 대신 콜론(:)과 들여쓰기로 코드 블록을 구분합니다."
    },
    {
      q: "for i in range(3): print(i) 를 실행하면 출력되는 값은 무엇인가요?",
      choices: ["1, 2, 3", "0, 1, 2", "0, 1, 2, 3", "1, 2"],
      answer: 1,
      why: "range(3)은 0부터 시작해 3 미만의 정수인 0, 1, 2를 차례로 만듭니다."
    },
    {
      q: "Python에서 함수를 정의할 때 사용하는 키워드는 무엇인가요?",
      choices: ["function", "func", "def", "define"],
      answer: 2,
      why: "Python은 def 키워드로 함수를 정의합니다."
    }
  ]
});
