(window.LANG_EXTRA = window.LANG_EXTRA || []).push({
  id: "python",
  levels: [
    {
      level: "입문",
      practice: [
        {
          title: "변수와 f-string으로 소개 문장 만들기",
          task: "변수 name에 \"지우\", age에 22를 저장하세요. f-string을 사용해 \"지우의 나이는 22살입니다.\" 라는 한 줄을 print()로 출력하세요.",
          hint: "문자열 앞에 f를 붙이고 {name}, {age}처럼 중괄호 안에 변수 이름을 넣습니다.",
          solution: `name = "지우"
age = 22
print(f"{name}의 나이는 {age}살입니다.")`,
          explain: "변수에 값을 저장한 뒤 f-string의 {} 안에 변수 이름을 쓰면 값이 문자열에 끼워 들어갑니다. 출력 결과는 '지우의 나이는 22살입니다.' 입니다."
        },
        {
          title: "점수에 따라 등급 출력하기",
          task: "변수 score에 73을 저장하고, 90 이상이면 \"A\", 80 이상이면 \"B\", 60 이상이면 \"C\", 그 외에는 \"F\"를 출력하는 if / elif / else 문을 작성하세요. score가 73이므로 \"C\"가 출력되어야 합니다.",
          hint: "큰 기준부터 차례로 검사해야 합니다. 각 조건 뒤에 콜론(:)과 들여쓰기를 잊지 마세요.",
          solution: `score = 73

if score >= 90:
    print("A")
elif score >= 80:
    print("B")
elif score >= 60:
    print("C")
else:
    print("F")`,
          explain: "위에서부터 조건을 차례로 검사하다가 처음 참이 되는 블록만 실행됩니다. 73은 90과 80 조건은 통과하지 못하고 60 이상 조건에서 참이 되어 C가 출력됩니다."
        },
        {
          title: "리스트 합계를 구하는 함수",
          task: "숫자 리스트를 받아 모든 값의 합을 돌려주는 함수 total(numbers)를 for 반복문으로 작성하세요(내장 sum()은 쓰지 않습니다). total([3, 5, 7])의 결과를 출력하면 15가 나와야 합니다.",
          hint: "함수 안에서 result = 0으로 시작하고, for 문으로 값을 하나씩 꺼내 result에 더한 뒤 return 합니다.",
          solution: `def total(numbers):
    result = 0
    for n in numbers:
        result += n
    return result

print(total([3, 5, 7]))  # 15`,
          explain: "누적할 변수를 0으로 초기화하고 반복문에서 값을 더해 가면 합계가 됩니다. 마지막에 return으로 결과를 돌려주면 3 + 5 + 7 = 15가 출력됩니다."
        }
      ]
    },
    {
      level: "중급",
      intro: "이 단계에서는 함수의 다양한 인자 방식, 컴프리헨션, 클래스, 예외 처리, 파일 입출력, 모듈처럼 실제 프로그램을 구성하는 핵심 문법을 배웁니다. 앞 단계의 기본 문법을 바탕으로 코드를 더 짧고 안전하게, 그리고 여러 파일로 나누어 작성하는 방법을 익힙니다.",
      lessons: [
        {
          title: "함수와 인자 (기본값, *args, **kwargs)",
          body: "매개변수에 기본값(def power(base, exp=2))을 주면 호출할 때 그 인자를 생략할 수 있고, 호출할 때는 exp=5처럼 이름을 붙여(키워드 인자) 순서와 상관없이 전달할 수도 있습니다. *args는 남는 위치 인자를 튜플로, **kwargs는 남는 키워드 인자를 딕셔너리로 모아 받아 개수가 정해지지 않은 입력을 처리할 때 유용합니다. 가장 흔한 실수는 기본값으로 리스트 같은 가변 객체를 쓰는 것입니다. 기본값은 함수를 정의할 때 딱 한 번만 만들어져 호출 사이에 공유되므로, 보통 None을 기본값으로 두고 함수 안에서 새로 만듭니다.",
          code: `def power(base, exp=2):
    return base ** exp

print(power(3))              # 9
print(power(2, exp=5))       # 32
print(power(exp=3, base=2))  # 8

def total(*nums):
    return sum(nums)         # nums는 튜플

def show(**info):
    for key, value in info.items():
        print(key, value)    # info는 딕셔너리

print(total(1, 2, 3))        # 6
show(name="민수", age=20)

# 가변 기본값의 함정
def add_item(item, items=[]):
    items.append(item)
    return items

print(add_item("a"))         # ['a']
print(add_item("b"))         # ['a', 'b']  <- 이전 호출의 값이 남아 있음

# 올바른 방법
def add_item_ok(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items

print(add_item_ok("a"))      # ['a']
print(add_item_ok("b"))      # ['b']`
        },
        {
          title: "리스트·딕셔너리·집합 컴프리헨션",
          body: "컴프리헨션은 반복문으로 새 자료구조를 만드는 과정을 한 줄로 쓰는 문법입니다. [식 for 변수 in 반복가능객체 if 조건]의 형태이며, 대괄호는 리스트, 중괄호에 key: value를 쓰면 딕셔너리, 중괄호에 값만 쓰면 집합이 됩니다. 반복문과 append를 쓰는 것보다 짧고 의도가 잘 드러나지만, 조건이나 반복이 중첩되어 읽기 어려워지면 일반 for 문으로 풀어 쓰는 편이 낫습니다. if를 뒤에 붙이면 걸러 내기이고, 값을 바꾸려면 식 부분에 A if 조건 else B를 씁니다. 이 두 위치를 혼동하는 것이 흔한 실수입니다.",
          code: `squares = [n * n for n in range(5)]
print(squares)                  # [0, 1, 4, 9, 16]

evens = [n for n in range(10) if n % 2 == 0]
print(evens)                    # [0, 2, 4, 6, 8]

lengths = {w: len(w) for w in ["apple", "kiwi"]}
print(lengths)                  # {'apple': 5, 'kiwi': 4}

remainders = {n % 3 for n in range(10)}
print(remainders)               # {0, 1, 2}

# 걸러 내기(if는 뒤)와 값 바꾸기(if else는 앞)
labels = ["짝" if n % 2 == 0 else "홀" for n in range(4)]
print(labels)                   # ['짝', '홀', '짝', '홀']`
        },
        {
          title: "클래스와 객체",
          body: "클래스는 데이터(속성)와 그 데이터를 다루는 동작(메서드)을 하나로 묶은 설계도이고, 클래스를 호출해 만든 것이 객체(인스턴스)입니다. __init__은 객체가 만들어질 때 자동으로 실행되는 초기화 메서드이며, 모든 메서드의 첫 번째 매개변수 self는 그 객체 자신을 가리킵니다. 클래스 이름 뒤 괄호에 부모 클래스를 쓰면 상속이 되어 부모의 속성과 메서드를 그대로 물려받고 새 기능을 더할 수 있습니다. 메서드를 정의할 때 self를 빼먹거나, 속성에 접근할 때 self. 없이 변수 이름만 쓰는 것이 초보자의 흔한 실수입니다.",
          code: `class Account:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount

    def __str__(self):
        return f"{self.owner}: {self.balance}원"

class Savings(Account):
    def add_interest(self, rate_percent):
        self.deposit(self.balance * rate_percent // 100)

acc = Account("민수", 1000)
acc.deposit(500)
print(acc)                      # 민수: 1500원

sav = Savings("지민", 1000)
sav.add_interest(10)            # 1000의 10% = 100
print(sav)                      # 지민: 1100원`
        },
        {
          title: "예외 처리 (try / except / else / finally)",
          body: "프로그램 실행 중 생기는 오류를 예외라고 하며, try 블록에서 예외가 나면 맞는 except 블록으로 넘어가 프로그램이 멈추지 않고 대처할 수 있습니다. 예상되는 예외 종류(ZeroDivisionError, ValueError 등)를 구체적으로 적는 것이 좋고, 아무 예외나 다 잡는 except만 쓰면 진짜 버그까지 숨겨 버립니다. 예외가 나지 않았을 때만 실행할 코드는 else에, 예외 발생 여부와 상관없이 항상 실행할 정리 코드는 finally에 씁니다. 직접 예외를 일으키고 싶을 때는 raise를 사용합니다.",
          code: `def safe_div(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        print("0으로 나눌 수 없어요")
        return None
    else:
        return result
    finally:
        print("계산 끝")

print(safe_div(10, 2))   # 계산 끝 -> 5.0
print(safe_div(1, 0))    # 0으로 나눌 수 없어요 -> 계산 끝 -> None

def set_age(age):
    if age < 0:
        raise ValueError("나이는 음수가 될 수 없습니다")
    return age

try:
    set_age(-1)
except ValueError as e:
    print("오류:", e)    # 오류: 나이는 음수가 될 수 없습니다`
        },
        {
          title: "파일 입출력과 with 문",
          body: "open(파일이름, 모드)로 파일을 열며, 모드 \"r\"는 읽기, \"w\"는 쓰기(기존 내용을 지우고 새로 씀), \"a\"는 끝에 이어 쓰기입니다. with open(...) as f: 형태로 쓰면 블록이 끝날 때 중간에 오류가 나더라도 파일이 자동으로 닫혀서 안전합니다. 한글이 들어 있는 텍스트 파일은 encoding=\"utf-8\"을 명시해 주면 운영체제에 따른 글자 깨짐을 막을 수 있습니다. 흔한 실수는 \"w\" 모드로 열었다가 기존 파일 내용을 모두 잃는 것이고, 존재하지 않는 파일을 읽으려 하면 FileNotFoundError가 발생합니다.",
          code: `with open("memo.txt", "w", encoding="utf-8") as f:
    print("첫째 줄", file=f)
    print("둘째 줄", file=f)

with open("memo.txt", "a", encoding="utf-8") as f:
    print("셋째 줄", file=f)

with open("memo.txt", "r", encoding="utf-8") as f:
    for line in f:
        print(line.strip())
# 첫째 줄
# 둘째 줄
# 셋째 줄

try:
    open("없는파일.txt", encoding="utf-8")
except FileNotFoundError:
    print("파일이 없습니다")`
        },
        {
          title: "모듈과 import",
          body: "모듈은 함수와 변수를 모아 둔 .py 파일이고, import로 가져와 쓰면 코드를 여러 파일로 나누어 재사용할 수 있습니다. import math 후 math.sqrt(16)처럼 쓰거나, from math import pi로 필요한 이름만 직접 가져오거나, import math as m처럼 별칭을 붙일 수 있습니다. 파일을 직접 실행하면 그 파일의 __name__은 \"__main__\"이 되고 다른 파일에서 import하면 모듈 이름이 되므로, if __name__ == \"__main__\": 블록은 직접 실행할 때만 동작하는 코드를 둘 때 씁니다. 직접 만든 파일 이름을 math.py처럼 표준 모듈과 같게 지으면 import가 꼬이는 일이 흔하니 피해야 합니다.",
          code: `import math
from math import pi
import statistics as st

print(math.sqrt(16))              # 4.0
print(round(pi, 2))               # 3.14
print(st.mean([1, 2, 3, 4]))      # 2.5

def main():
    print("프로그램 시작")

# 이 파일을 직접 실행했을 때만 main()이 호출됩니다.
# 다른 파일에서 import하면 호출되지 않습니다.
if __name__ == "__main__":
    main()`
        }
      ],
      quiz: [
        {
          q: `다음 코드를 실행하면 출력되는 값은?

def power(base, exp=2):
    return base ** exp

print(power(3))`,
          choices: ["6", "9", "TypeError 오류", "3"],
          answer: 1,
          why: "exp를 생략하면 기본값 2가 쓰이므로 3 ** 2 = 9가 출력됩니다."
        },
        {
          q: `다음 코드를 실행하면 마지막 print의 결과는?

def add(x, items=[]):
    items.append(x)
    return items

add(1)
print(add(2))`,
          choices: ["[2]", "[1]", "[2, 1]", "[1, 2]"],
          answer: 3,
          why: "기본값 리스트는 함수 정의 시 한 번만 만들어져 호출 사이에 공유되므로 첫 호출의 1이 남아 있어 [1, 2]가 됩니다."
        },
        {
          q: "def total(*nums): 로 정의한 함수 안에서 nums의 자료형은 무엇인가요?",
          choices: ["리스트(list)", "딕셔너리(dict)", "튜플(tuple)", "집합(set)"],
          answer: 2,
          why: "*args로 모은 남는 위치 인자는 튜플로 전달됩니다. 키워드 인자를 모으는 **kwargs가 딕셔너리입니다."
        },
        {
          q: `다음 코드의 출력 결과는?

print([n * 2 for n in range(4) if n % 2 == 1])`,
          choices: ["[2, 6]", "[0, 4]", "[1, 3]", "[0, 2, 4, 6]"],
          answer: 0,
          why: "range(4)에서 홀수인 1과 3만 걸러져 각각 2배가 되므로 [2, 6]입니다."
        },
        {
          q: `다음 코드의 출력 결과는?

class Cat:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return f"{self.name}: 야옹"

print(Cat("나비").speak())`,
          choices: ["Cat: 야옹", "나비", "self: 야옹", "나비: 야옹"],
          answer: 3,
          why: "Cat(\"나비\")가 만들어질 때 __init__이 name을 저장하고, speak()는 self.name을 사용해 '나비: 야옹'을 돌려줍니다."
        },
        {
          q: `다음 코드의 출력은? (한 줄씩 순서대로 출력됨)

try:
    print("A")
    int("x")
except ValueError:
    print("B")
finally:
    print("C")`,
          choices: ["A, C", "A, B, C", "A, B", "ValueError가 처리되지 않고 프로그램이 중단된다"],
          answer: 1,
          why: "int(\"x\")에서 ValueError가 발생해 except의 B가 출력되고, finally의 C는 항상 실행되므로 A, B, C 순서입니다."
        },
        {
          q: "open(\"data.txt\", \"w\")로 이미 내용이 있는 파일을 열면 어떻게 되나요?",
          choices: ["기존 내용이 지워지고 새로 쓰게 된다", "기존 내용 뒤에 이어서 쓰게 된다", "파일이 있으면 오류가 발생한다", "읽기만 가능하다"],
          answer: 0,
          why: "\"w\" 모드는 파일이 없으면 만들고, 있으면 기존 내용을 비운 뒤 새로 씁니다. 이어 쓰려면 \"a\" 모드를 사용합니다."
        },
        {
          q: "if __name__ == \"__main__\": 블록 안의 코드는 언제 실행되나요?",
          choices: ["다른 파일에서 import할 때만 실행된다", "항상 두 번 실행된다", "그 파일을 직접 실행할 때만 실행되고 import될 때는 실행되지 않는다", "파일을 저장할 때 실행된다"],
          answer: 2,
          why: "직접 실행하면 __name__이 \"__main__\"이 되어 블록이 실행되고, import되면 __name__이 모듈 이름이 되어 실행되지 않습니다."
        }
      ],
      practice: [
        {
          title: "평균을 구하는 가변 인자 함수",
          task: "개수에 상관없이 숫자를 받아 평균을 돌려주는 함수 average(*nums)를 작성하세요. print(average(1, 2, 3, 4))를 실행하면 2.5가 출력되어야 합니다.",
          hint: "*nums는 튜플로 전달되므로 sum(nums)와 len(nums)를 사용할 수 있습니다.",
          solution: `def average(*nums):
    return sum(nums) / len(nums)

print(average(1, 2, 3, 4))  # 2.5`,
          explain: "*nums로 모든 위치 인자를 튜플로 받고, 합계를 개수로 나누면 평균입니다. 1+2+3+4 = 10이고 10 / 4 = 2.5가 출력됩니다."
        },
        {
          title: "딕셔너리 컴프리헨션으로 긴 단어 길이 구하기",
          task: "words = [\"apple\", \"kiwi\", \"banana\"]에서 글자 수가 4보다 큰 단어만 골라 {단어: 글자 수} 딕셔너리를 컴프리헨션으로 만들어 출력하세요. 결과는 {'apple': 5, 'banana': 6}이어야 합니다.",
          hint: "{w: len(w) for w in words if ...} 형태에서 if 조건에 len(w) > 4를 씁니다.",
          solution: `words = ["apple", "kiwi", "banana"]
result = {w: len(w) for w in words if len(w) > 4}
print(result)  # {'apple': 5, 'banana': 6}`,
          explain: "딕셔너리 컴프리헨션 뒤에 if를 붙여 조건에 맞는 단어만 남깁니다. kiwi는 4글자라 제외되고 apple과 banana만 담깁니다."
        },
        {
          title: "잔액 부족 예외가 있는 계좌 클래스",
          task: "balance를 가지는 Account 클래스를 만들고, 잔액보다 큰 금액을 withdraw(amount)하면 ValueError(\"잔액 부족\")를 일으키게 하세요. Account(1000)에서 300을 출금한 뒤 잔액 700을 출력하고, 이어서 5000을 출금하면 예외 메시지 \"잔액 부족\"이 출력되어야 합니다.",
          hint: "withdraw 안에서 amount > self.balance이면 raise ValueError(...)를 하고, 호출하는 쪽에서 try / except ValueError as e로 잡습니다.",
          solution: `class Account:
    def __init__(self, balance):
        self.balance = balance

    def withdraw(self, amount):
        if amount > self.balance:
            raise ValueError("잔액 부족")
        self.balance -= amount

acc = Account(1000)
acc.withdraw(300)
print(acc.balance)   # 700
try:
    acc.withdraw(5000)
except ValueError as e:
    print(e)         # 잔액 부족`,
          explain: "조건에 맞지 않을 때 raise로 예외를 일으키고 호출하는 쪽에서 try / except로 처리하는 것이 기본 패턴입니다. 첫 출금은 성공해 700이 출력되고, 두 번째는 예외가 발생해 '잔액 부족'이 출력됩니다."
        }
      ]
    },
    {
      level: "고급",
      intro: "이 단계에서는 제너레이터, 데코레이터, 컨텍스트 매니저처럼 파이썬답게 코드를 쓰게 해 주는 도구와 타입 힌트, dataclass, asyncio 같은 현대적인 기능을 배웁니다. 각 개념이 어떤 문제를 해결하기 위해 만들어졌는지를 중심으로 이해하면 실무 코드를 읽고 설계하는 힘이 생깁니다.",
      lessons: [
        {
          title: "제너레이터와 yield",
          body: "제너레이터 함수는 return 대신 yield로 값을 하나씩 내보내며, 값을 내보낸 뒤 실행을 멈췄다가 다음 값을 요청받으면 멈춘 지점부터 이어서 실행합니다. 모든 값을 리스트로 한꺼번에 만들지 않고 필요할 때 하나씩 계산하므로 메모리를 아끼고, 끝없는 수열도 표현할 수 있습니다. 컴프리헨션의 대괄호를 소괄호로 바꾸면 제너레이터 표현식이 됩니다. 제너레이터는 한 번 다 소비하면 다시 쓸 수 없다는 점이 흔한 실수의 원인이며, 값이 다 떨어진 뒤 next()를 호출하면 StopIteration이 발생합니다.",
          code: `from itertools import islice

def countdown(n):
    while n > 0:
        yield n
        n -= 1

for x in countdown(3):
    print(x)                   # 3, 2, 1

g = (n * n for n in range(3))  # 제너레이터 표현식
print(next(g))                 # 0
print(next(g))                 # 1
print(list(g))                 # [4]
print(list(g))                 # []  (이미 모두 소비됨)

def fib():
    a, b = 0, 1
    while True:                # 끝없는 수열도 가능
        yield a
        a, b = b, a + b

print(list(islice(fib(), 6)))  # [0, 1, 1, 2, 3, 5]`
        },
        {
          title: "데코레이터",
          body: "함수는 값처럼 다른 함수에 전달하거나 반환할 수 있고, 데코레이터는 이 점을 이용해 기존 함수의 코드를 고치지 않고 앞뒤에 기능을 덧붙이는 함수입니다. 함수 위에 @이름을 쓰면 add = log_calls(add)와 같은 효과를 냅니다. 안쪽 wrapper 함수는 *args, **kwargs로 어떤 인자든 받아 원래 함수에 넘겨야 하며, 원래 함수의 결과를 return하는 것을 잊으면 None이 반환되는 것이 흔한 실수입니다. functools.wraps를 붙이면 원래 함수의 이름과 설명 같은 정보가 유지됩니다.",
          code: `import functools

def log_calls(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(f"호출: {func.__name__}{args}")
        result = func(*args, **kwargs)
        print(f"결과: {result}")
        return result
    return wrapper

@log_calls
def add(a, b):
    return a + b

add(2, 3)
# 호출: add(2, 3)
# 결과: 5

print(add.__name__)   # add  (wraps 덕분에 wrapper가 아님)`
        },
        {
          title: "컨텍스트 매니저",
          body: "컨텍스트 매니저는 with 문과 함께 쓰여 '준비'와 '정리'를 짝지어 실행해 주는 객체로, 파일 닫기나 잠금 해제처럼 반드시 해야 하는 정리를 보장합니다. 클래스로 만들 때는 __enter__에서 준비하고 __exit__에서 정리하며, with 블록 안에서 예외가 나도 __exit__은 호출됩니다. __exit__이 True를 반환하면 그 예외를 삼키므로 보통은 False(또는 None)를 반환해야 합니다. 클래스를 만드는 대신 contextlib.contextmanager 데코레이터를 쓰면 yield 앞은 준비, 뒤는 정리인 제너레이터 함수로 간단히 만들 수 있고, 정리 코드는 try / finally에 두어야 예외가 나도 실행됩니다.",
          code: `from contextlib import contextmanager

class Section:
    def __init__(self, name):
        self.name = name

    def __enter__(self):
        print(f"[{self.name}] 시작")
        return self

    def __exit__(self, exc_type, exc, tb):
        print(f"[{self.name}] 끝")
        return False          # 예외를 삼키지 않음

with Section("작업") as s:
    print("작업 중")
# [작업] 시작
# 작업 중
# [작업] 끝

@contextmanager
def tag(name):
    print(f"<{name}>")
    try:
        yield
    finally:
        print(f"</{name}>")

with tag("p"):
    print("본문")
# <p>
# 본문
# </p>`
        },
        {
          title: "타입 힌트",
          body: "타입 힌트는 변수나 함수의 매개변수와 반환값이 어떤 타입이어야 하는지 적어 두는 표기법으로, 코드의 의도를 알려 주고 편집기와 mypy, pyright 같은 정적 검사 도구가 실행 전에 실수를 찾게 해 줍니다. 중요한 점은 파이썬이 실행 중에는 타입 힌트를 강제하지 않는다는 것이며, 잘못된 타입을 넘겨도 힌트 때문에 오류가 나지 않습니다. list[int], dict[str, int]처럼 내장 타입에 바로 대괄호를 쓰는 표기는 Python 3.9부터, int | None 같은 합집합 표기는 3.10부터 쓸 수 있습니다. 값이 없을 수도 있다면 반환 타입에 None을 포함해 사용하는 쪽이 이를 처리해야 함을 알려 줍니다.",
          code: `def greet(name: str, times: int = 1) -> str:
    return (f"안녕, {name}! " * times).strip()

print(greet("민수", 2))   # 안녕, 민수! 안녕, 민수!

# 힌트는 실행 시 강제되지 않음: 잘못된 타입도 그냥 실행됨
print(greet(123))         # 안녕, 123!  (정적 검사 도구는 경고함)

def first(items: list[int]) -> int | None:
    return items[0] if items else None

scores: dict[str, int] = {"민수": 90}
print(first([5, 6]))      # 5
print(first([]))          # None`
        },
        {
          title: "dataclass",
          body: "@dataclass 데코레이터를 클래스에 붙이면 타입 힌트가 달린 필드 정의만으로 __init__, __repr__, __eq__ 같은 반복적인 메서드를 자동으로 만들어 주어, 데이터를 담는 클래스를 짧게 쓸 수 있습니다. 출력하면 Point(x=1, y=2)처럼 읽기 좋게 나오고, 같은 필드 값을 가진 두 객체는 == 로 비교하면 같다고 판단됩니다. 리스트처럼 가변 객체의 기본값은 그냥 쓰면 ValueError가 나므로 field(default_factory=list)를 써야 합니다. @dataclass(frozen=True)를 쓰면 만든 뒤 필드를 바꿀 수 없는 불변 객체가 됩니다.",
          code: `from dataclasses import dataclass, field, FrozenInstanceError

@dataclass
class Point:
    x: int
    y: int = 0

p = Point(1, 2)
print(p)                    # Point(x=1, y=2)
print(p == Point(1, 2))     # True

@dataclass
class Student:
    name: str
    scores: list[int] = field(default_factory=list)

    def average(self):
        return sum(self.scores) / len(self.scores)

s = Student("지민", [80, 90])
print(s)                    # Student(name='지민', scores=[80, 90])
print(s.average())          # 85.0

@dataclass(frozen=True)
class Color:
    name: str

c = Color("red")
try:
    c.name = "blue"
except FrozenInstanceError:
    print("변경 불가")`
        },
        {
          title: "비동기 프로그래밍과 asyncio 개념",
          body: "asyncio는 하나의 스레드 안에서 이벤트 루프가 여러 작업을 번갈아 실행해, 네트워크 응답처럼 기다리는 시간이 긴 작업(I/O 대기)을 효율적으로 처리하게 해 주는 모듈입니다. async def로 만든 함수는 호출하면 바로 실행되지 않고 코루틴 객체를 돌려주며, await를 만나면 그 작업이 끝나기를 기다리는 동안 다른 작업에 실행을 넘깁니다. asyncio.gather()로 여러 코루틴을 동시에 실행할 수 있고 결과는 넣은 순서대로 모입니다. await 없이 코루틴만 호출하면 실행되지 않으며, 계산이 오래 걸리는 CPU 작업이나 time.sleep() 같은 막는 호출은 이벤트 루프 전체를 멈추게 하므로 비동기의 이점이 없습니다.",
          code: `import asyncio

async def fetch(name, delay):
    await asyncio.sleep(delay)   # 기다리는 동안 다른 작업이 실행됨
    print(f"{name} 완료")
    return name.upper()

async def main():
    results = await asyncio.gather(
        fetch("a", 0.2),
        fetch("b", 0.1),
    )
    print(results)

asyncio.run(main())
# b 완료      (b가 더 짧게 기다리므로 먼저 끝남)
# a 완료
# ['A', 'B']  (결과는 gather에 넣은 순서)`
        }
      ],
      quiz: [
        {
          q: `다음 코드의 출력 결과는?

g = (n for n in range(3))
print(list(g))
print(list(g))`,
          choices: ["[0, 1, 2] 와 [0, 1, 2]", "[0, 1, 2] 와 오류 발생", "[0, 1, 2] 와 []", "[] 와 []"],
          answer: 2,
          why: "제너레이터는 한 번 소비하면 다시 쓸 수 없어, 첫 list(g)가 값을 모두 꺼낸 뒤 두 번째는 빈 리스트가 됩니다."
        },
        {
          q: "일반 함수의 return과 제너레이터의 yield의 가장 큰 차이는 무엇인가요?",
          choices: ["yield는 값을 내보내고 실행을 멈췄다가 다음 요청 때 그 지점부터 이어서 실행한다", "yield는 함수를 영구히 종료한다", "yield는 값을 반드시 리스트로 반환한다", "yield는 비동기 작업에서만 쓸 수 있다"],
          answer: 0,
          why: "yield는 함수의 상태를 유지한 채 값을 하나씩 내보내며, 다음 값을 요청받으면 멈춘 곳부터 이어서 실행합니다."
        },
        {
          q: `다음 코드를 실행하면 출력되는 내용은?

def deco(f):
    def w():
        print("전")
        f()
        print("후")
    return w

@deco
def hi():
    print("hi")

hi()`,
          choices: ["hi만 출력된다", "전과 후만 출력된다", "후, hi, 전 순서로 한 줄씩 출력된다", "전, hi, 후 순서로 한 줄씩 출력된다"],
          answer: 3,
          why: "@deco는 hi = deco(hi)와 같아서 hi()는 wrapper w를 실행하고, w가 전 출력, 원래 함수, 후 출력 순으로 실행합니다."
        },
        {
          q: "데코레이터 안의 wrapper 함수에 @functools.wraps(func)를 붙이는 이유는 무엇인가요?",
          choices: ["함수를 더 빠르게 실행하려고", "원래 함수의 이름과 설명 같은 정보를 wrapper에 유지하려고", "원래 함수를 두 번 실행하려고", "비동기 함수로 바꾸려고"],
          answer: 1,
          why: "wraps를 쓰지 않으면 데코레이트된 함수의 __name__ 등이 wrapper로 바뀝니다. wraps는 원래 함수의 메타데이터를 복사해 줍니다."
        },
        {
          q: "with 문 블록 안에서 예외가 발생했을 때 컨텍스트 매니저의 __exit__ 메서드는 어떻게 되나요?",
          choices: ["호출되지 않는다", "예외가 except로 잡힌 경우에만 호출된다", "with 문이 무시한다", "호출되어 정리 작업이 실행된다"],
          answer: 3,
          why: "__exit__은 블록이 정상 종료되든 예외로 중단되든 호출되므로 파일 닫기 같은 정리 작업이 보장됩니다."
        },
        {
          q: `다음 코드를 실행하면 출력되는 값은?

def f(x: int) -> int:
    return x * 2

print(f("ab"))`,
          choices: ["TypeError 오류", "ab", "abab", "None"],
          answer: 2,
          why: "파이썬은 실행 중에 타입 힌트를 강제하지 않으므로 문자열 \"ab\" * 2가 그대로 계산되어 abab가 출력됩니다. 타입 검사는 mypy 같은 도구의 몫입니다."
        },
        {
          q: `다음 코드를 실행하면 어떻게 되나요?

from dataclasses import dataclass

@dataclass
class A:
    items: list = []`,
          choices: ["클래스를 정의하는 시점에 ValueError가 발생한다", "정상적으로 정의되고 모든 객체가 같은 리스트를 공유한다", "객체를 만들 때 TypeError가 발생한다", "items가 자동으로 None이 된다"],
          answer: 0,
          why: "dataclass는 리스트 같은 가변 기본값을 허용하지 않고 ValueError를 일으킵니다. field(default_factory=list)를 사용해야 합니다."
        },
        {
          q: "async def로 만든 함수 f를 await 없이 f()로 호출만 하면 무엇이 반환되나요?",
          choices: ["함수의 return 값이 바로 반환된다", "코루틴 객체가 반환되고 함수 본문은 아직 실행되지 않는다", "스레드가 새로 만들어져 본문이 실행된다", "항상 SyntaxError가 발생한다"],
          answer: 1,
          why: "async def 함수를 호출하면 코루틴 객체를 돌려주며, await하거나 asyncio.run 등으로 실행해야 본문이 실행됩니다."
        }
      ],
      practice: [
        {
          title: "짝수를 내보내는 제너레이터",
          task: "0부터 limit까지의 짝수를 하나씩 yield하는 제너레이터 함수 evens(limit)를 작성하세요. print(list(evens(10)))를 실행하면 [0, 2, 4, 6, 8, 10]이 출력되어야 합니다.",
          hint: "range(0, limit + 1, 2)로 2씩 건너뛰며 반복하고, 각 값을 yield합니다.",
          solution: `def evens(limit):
    for n in range(0, limit + 1, 2):
        yield n

print(list(evens(10)))  # [0, 2, 4, 6, 8, 10]`,
          explain: "yield를 쓴 함수는 제너레이터가 되며, list()가 값을 모두 꺼내 리스트로 만듭니다. range의 세 번째 인자 2가 간격이어서 짝수만 나오고 limit + 1 덕분에 10도 포함됩니다."
        },
        {
          title: "결과를 두 배로 만드는 데코레이터",
          task: "함수의 반환값을 2배로 만들어 주는 데코레이터 double을 작성하세요. @double을 붙인 add(a, b)가 a + b를 반환할 때 print(add(2, 3))은 10을 출력해야 합니다.",
          hint: "double 안에 *args, **kwargs를 받는 wrapper를 만들고, 원래 함수의 결과에 2를 곱해 return합니다. 마지막에 wrapper를 return하세요.",
          solution: `def double(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs) * 2
    return wrapper

@double
def add(a, b):
    return a + b

print(add(2, 3))  # 10`,
          explain: "@double은 add = double(add)와 같아 add(2, 3)이 wrapper를 실행합니다. 원래 결과 5에 2를 곱해 10이 출력됩니다."
        },
        {
          title: "dataclass와 타입 힌트로 책 합계 구하기",
          task: "title(str)과 price(int)를 필드로 가지는 dataclass Book을 만들고, 책 리스트를 받아 가격 합계를 돌려주는 함수 total(books: list[Book]) -> int를 작성하세요. Book(\"파이썬\", 20000)과 Book(\"자바\", 30000)의 리스트로 합계를 출력하면 50000이 나와야 합니다.",
          hint: "from dataclasses import dataclass 후 클래스에 @dataclass를 붙이고, 합계는 sum(b.price for b in books)로 구합니다.",
          solution: `from dataclasses import dataclass

@dataclass
class Book:
    title: str
    price: int

def total(books: list[Book]) -> int:
    return sum(b.price for b in books)

books = [Book("파이썬", 20000), Book("자바", 30000)]
print(total(books))  # 50000`,
          explain: "dataclass가 __init__을 자동으로 만들어 주므로 Book(\"파이썬\", 20000)처럼 바로 객체를 만들 수 있습니다. total은 각 책의 price를 합산해 20000 + 30000 = 50000을 반환합니다."
        }
      ]
    }
  ]
});
