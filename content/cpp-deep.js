(window.LANG_EXTRA = window.LANG_EXTRA || []).push({
  id: "cpp",
  levels: [
    {
      level: "입문",
      practice: [
        {
          title: "합격 여부 판단하기",
          task: "int 변수 score에 75를 저장하고, if / else 문으로 score가 60 이상이면 \"합격\", 아니면 \"불합격\"을 출력하세요. 기대 출력은 합격 한 줄입니다.",
          hint: "비교에는 >= 연산자를 쓰고, 출력에는 std::cout과 std::endl을 사용합니다.",
          solution: `#include <iostream>

int main() {
    int score = 75;
    if (score >= 60) {
        std::cout << "합격" << std::endl;
    } else {
        std::cout << "불합격" << std::endl;
    }
    return 0;
}`,
          explain: "75는 60 이상이므로 조건이 참이 되어 if 블록이 실행되고 합격이 출력됩니다. 같은지 비교할 때는 =가 아니라 ==를 쓴다는 점도 기억하세요."
        },
        {
          title: "1부터 5까지의 합",
          task: "for 반복문으로 1부터 5까지의 정수를 모두 더해 마지막에 합계를 한 번만 출력하세요. 기대 출력은 15입니다.",
          hint: "합계를 담을 int 변수를 0으로 초기화하고, 반복마다 i를 더합니다.",
          solution: `#include <iostream>

int main() {
    int sum = 0;
    for (int i = 1; i <= 5; i++) {
        sum += i;
    }
    std::cout << sum << std::endl;
    return 0;
}`,
          explain: "i가 1부터 5까지 변하는 동안 sum에 i를 더하므로 1+2+3+4+5 = 15가 됩니다. 반복 조건을 i <= 5로 써야 5까지 포함됩니다."
        },
        {
          title: "vector 원소의 합을 구하는 함수",
          task: "std::vector<int> 를 값으로 받아 모든 원소의 합을 반환하는 함수 total을 만드세요. main에서 {4, 8, 15} 를 담은 vector로 호출해 결과를 출력합니다. 기대 출력은 27입니다.",
          hint: "범위 기반 for 문 for (int x : v) 로 원소를 하나씩 꺼내 더하면 됩니다.",
          solution: `#include <iostream>
#include <vector>

int total(std::vector<int> v) {
    int sum = 0;
    for (int x : v) {
        sum += x;
    }
    return sum;
}

int main() {
    std::vector<int> nums = {4, 8, 15};
    std::cout << total(nums) << std::endl;
    return 0;
}`,
          explain: "함수가 반환할 값의 자료형을 int로 적고 return으로 합계를 돌려줍니다. 4+8+15 = 27이 출력됩니다."
        }
      ]
    },
    {
      level: "중급",
      intro: "중급에서는 데이터와 동작을 묶는 클래스, 복사 없이 값을 다루는 참조, 문자열과 STL 컨테이너(vector, map), 이름 충돌을 막는 네임스페이스를 배웁니다. 이 도구들을 익히면 입문에서 쓰던 변수와 함수만으로는 어렵던 프로그램의 구조를 잡을 수 있습니다.",
      lessons: [
        {
          title: "클래스와 생성자/소멸자",
          body: "클래스는 데이터(멤버 변수)와 그 데이터를 다루는 함수(멤버 함수)를 하나로 묶은 사용자 정의 자료형입니다. 생성자는 클래스 이름과 같은 함수로 객체가 만들어질 때 자동으로 호출되어 멤버를 초기화하고, 소멸자는 이름 앞에 ~를 붙인 함수로 객체가 사라질 때 자동으로 호출됩니다. 지역 객체는 선언된 블록이 끝날 때 소멸하며, 여러 객체가 있으면 만든 순서의 반대로 소멸합니다. 멤버는 생성자의 초기화 리스트(: name(n), value(start))로 초기화하는 것이 좋고, 이때 초기화는 리스트에 적은 순서가 아니라 멤버를 선언한 순서대로 일어납니다. 값을 바꾸지 않는 멤버 함수에는 get() const처럼 const를 붙이는 습관을 들이세요.",
          code: `#include <iostream>
#include <string>

class Counter {
public:
    Counter(std::string n, int start) : name(n), value(start) {
        std::cout << name << " 생성" << std::endl;
    }
    ~Counter() {
        std::cout << name << " 소멸" << std::endl;
    }
    void increase() { value++; }
    int get() const { return value; }

private:
    std::string name;
    int value;
};

int main() {
    Counter a("A", 10);
    {
        Counter b("B", 0);
        b.increase();
        std::cout << b.get() << std::endl;
    }
    a.increase();
    std::cout << a.get() << std::endl;
    return 0;
}
// 출력: A 생성 / B 생성 / 1 / B 소멸 / 11 / A 소멸`
        },
        {
          title: "참조(reference)",
          body: "참조는 이미 있는 변수의 또 다른 이름(별명)으로, 선언할 때 반드시 초기화해야 하며 이후 다른 변수를 가리키도록 바꿀 수 없습니다. 함수 매개변수를 int& 로 받으면 복사하지 않고 원본을 직접 바꿀 수 있고, 값을 읽기만 할 때는 const std::string& 처럼 const 참조로 받으면 큰 객체의 복사 비용을 피하면서 원본도 보호됩니다. 임시 객체(예: 문자열 리터럴에서 만들어진 std::string)는 const가 아닌 일반 참조(T&)에 연결할 수 없으므로, 그런 값을 넘기려면 const 참조를 써야 합니다. 흔한 실수는 함수가 끝나면 사라지는 지역 변수를 참조로 반환하는 것으로, 이렇게 하면 이미 사라진 객체를 가리키게 되어 정의되지 않은 동작이 됩니다.",
          code: `#include <iostream>
#include <string>

void addOne(int& x) {
    x++;
}

void addTen(int x) {
    x += 10;
}

void printTwice(const std::string& s) {
    std::cout << s << std::endl;
    std::cout << s << std::endl;
}

int main() {
    int n = 5;
    addOne(n);
    addTen(n);
    std::cout << n << std::endl;

    int& r = n;
    r = 100;
    std::cout << n << std::endl;

    printTwice("hello");
    return 0;
}
// 출력: 6 / 100 / hello / hello`
        },
        {
          title: "문자열 std::string 다루기",
          body: "std::string은 문자열을 편하게 다루는 표준 클래스로, +와 +=로 이어 붙이고 size()로 길이(바이트 수)를 알 수 있습니다. substr(시작, 길이)는 일부를 잘라 내고, find는 찾는 문자열이 시작되는 위치를 돌려주며 찾지 못하면 std::string::npos를 돌려줍니다. find의 결과를 확인하지 않고 위치로 바로 쓰는 것이 흔한 실수입니다. 숫자와 문자열의 변환에는 std::to_string(숫자)와 std::stoi(문자열)를 쓰며, stoi는 숫자로 바꿀 수 없는 문자열이면 예외를 던집니다. 한글은 UTF-8에서 글자 하나가 보통 여러 바이트이므로 size()가 글자 수와 다를 수 있다는 점도 알아 두세요.",
          code: `#include <iostream>
#include <string>

int main() {
    std::string s = "Hello";
    s += ", C++";
    std::cout << s << std::endl;
    std::cout << s.size() << std::endl;
    std::cout << s.substr(0, 5) << std::endl;

    size_t pos = s.find("C++");
    std::cout << pos << std::endl;

    if (s.find("Java") == std::string::npos) {
        std::cout << "Java not found" << std::endl;
    }

    int n = std::stoi("123");
    std::cout << n + 1 << std::endl;

    std::string t = "score: " + std::to_string(90);
    std::cout << t << std::endl;
    return 0;
}
// 출력: Hello, C++ / 10 / Hello / 7 / Java not found / 124 / score: 90`
        },
        {
          title: "STL vector 깊게 보기",
          body: "vector는 원소를 연속된 메모리에 저장하는 동적 배열로, push_back으로 끝에 추가하고 pop_back으로 끝을 제거하며 back()으로 마지막 원소를 읽습니다. v[i]는 범위를 검사하지 않아 범위를 벗어나면 정의되지 않은 동작이지만, v.at(i)는 범위를 벗어나면 std::out_of_range 예외를 던집니다. 범위 기반 for 문에서 int x 로 받으면 원소의 복사본이 되어 원본이 바뀌지 않고, int& x 로 받아야 원본을 수정할 수 있으며, 큰 원소는 const auto& 로 읽는 것이 효율적입니다. 순회 중에 push_back을 하면 내부 메모리가 다시 할당되어 기존 참조나 반복자가 무효가 될 수 있으니 조심해야 합니다.",
          code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {5, 3, 8};
    v.push_back(1);
    std::cout << v.size() << std::endl;
    std::cout << v[0] << std::endl;
    std::cout << v.back() << std::endl;

    v.pop_back();
    std::cout << v.size() << std::endl;

    for (int& x : v) {
        x *= 2;
    }
    for (int x : v) {
        std::cout << x << " ";
    }
    std::cout << std::endl;
    return 0;
}
// 출력: 4 / 5 / 1 / 3 / 10 6 16`
        },
        {
          title: "STL map",
          body: "std::map은 키와 값의 쌍을 키 순서대로 정렬해 저장하는 컨테이너로, m[키] = 값 으로 넣거나 바꾸고, 순회하면 각 원소가 first(키)와 second(값)를 가진 pair로 나옵니다. 흔한 실수는 m[키]로 값을 읽는 것으로, 키가 없으면 기본값(int는 0)으로 새 원소가 만들어져 map의 크기가 늘어납니다. 키가 있는지만 확인하려면 find(키) == end() 비교나 count(키)를 쓰면 원소가 추가되지 않습니다. 같은 키에 다시 대입하면 새 원소가 생기는 것이 아니라 기존 값이 바뀝니다.",
          code: `#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> score;
    score["kim"] = 90;
    score["lee"] = 75;
    score["kim"] = 95;
    std::cout << score.size() << std::endl;
    for (const auto& p : score) {
        std::cout << p.first << "=" << p.second << std::endl;
    }

    if (score.find("park") == score.end()) {
        std::cout << "park none" << std::endl;
    }
    score["park"];
    std::cout << score.size() << std::endl;
    return 0;
}
// 출력: 2 / kim=95 / lee=75 / park none / 3`
        },
        {
          title: "네임스페이스",
          body: "네임스페이스는 이름이 겹치지 않게 함수, 클래스, 변수의 이름을 묶어 두는 공간으로, namespace 이름 { ... } 으로 만들고 이름::함수() 처럼 범위 지정 연산자 ::로 사용합니다. 서로 다른 라이브러리가 같은 이름의 함수를 가져도 네임스페이스가 다르면 충돌하지 않으며, 표준 라이브러리의 이름은 대부분 std 안에 있습니다. using std::cout; 처럼 필요한 이름만 가져오는 것은 괜찮지만, 헤더 파일에서 using namespace std; 를 쓰면 그 헤더를 포함하는 모든 코드에 영향을 주어 이름 충돌을 일으킬 수 있으므로 피해야 합니다. 네임스페이스 안에 다른 네임스페이스를 중첩할 수 있고, 긴 이름에는 namespace 별칭 = 긴이름; 으로 별칭을 만들 수 있습니다.",
          code: `#include <iostream>

namespace korean {
    void hello() { std::cout << "안녕하세요" << std::endl; }
}

namespace english {
    void hello() { std::cout << "Hello" << std::endl; }

    namespace formal {
        void hello() { std::cout << "Good day" << std::endl; }
    }
}

int main() {
    using std::cout;
    using std::endl;

    korean::hello();
    english::hello();
    english::formal::hello();

    namespace ef = english::formal;
    ef::hello();

    cout << "done" << endl;
    return 0;
}
// 출력: 안녕하세요 / Hello / Good day / Good day / done`
        }
      ],
      quiz: [
        {
          q: `다음 코드를 실행하면 화면에 출력되는 문자열은?

#include <iostream>
class T {
public:
    T()  { std::cout << "A"; }
    ~T() { std::cout << "B"; }
};
int main() {
    T t1;
    {
        T t2;
    }
    std::cout << "C";
    return 0;
}`,
          choices: ["AACBB", "ABACB", "AABCB", "AABBC"],
          answer: 2,
          why: "t1, t2 생성으로 AA가 출력되고, 안쪽 블록이 끝나면 t2가 소멸해 B가 출력됩니다. 이어서 C가 출력되고, main이 끝날 때 t1이 소멸해 마지막 B가 출력되어 AABCB가 됩니다."
        },
        {
          q: `다음 코드를 실행하면 출력되는 값은?

#include <iostream>

void f(int& x) { x += 2; }
void g(int x)  { x += 10; }

int main() {
    int n = 1;
    f(n);
    g(n);
    std::cout << n;
}`,
          choices: ["3", "13", "1", "12"],
          answer: 0,
          why: "f는 참조로 받아 원본 n을 3으로 바꿉니다. g는 값으로 받아 복사본만 바꾸므로 n은 그대로 3입니다."
        },
        {
          q: `다음 코드의 출력은?

std::string s = "abcdef";
std::cout << s.substr(2, 3) << s.find("d");`,
          choices: ["bcd2", "cde2", "cdef3", "cde3"],
          answer: 3,
          why: "substr(2, 3)은 인덱스 2부터 3글자인 cde이고, 문자 d는 인덱스 3에 있으므로 find가 3을 돌려줍니다. 따라서 cde3이 출력됩니다."
        },
        {
          q: `다음 코드를 컴파일하면 어떻게 될까요?

#include <iostream>
#include <string>

void print(std::string& s) {
    std::cout << s;
}
int main() {
    print("hello");
}`,
          choices: [
            "hello가 정상적으로 출력된다",
            "컴파일 오류: 임시 std::string 객체를 const가 아닌 일반 참조(std::string&)에 연결할 수 없다",
            "실행 중에 예외가 발생한다",
            "빈 문자열이 출력된다"
          ],
          answer: 1,
          why: "문자열 리터럴은 임시 std::string으로 변환되는데, 임시 객체는 const가 아닌 일반 참조(lvalue 참조)에 연결할 수 없어 컴파일 오류가 납니다. 매개변수를 const std::string& 로 바꾸면 해결됩니다."
        },
        {
          q: `다음 코드의 출력은?

std::map<std::string, int> m;
m["a"] = 1;
int x = m["b"];
std::cout << m.size() << x;`,
          choices: ["10", "21", "11", "20"],
          answer: 3,
          why: "m[\"b\"]는 키가 없으면 기본값 0으로 새 원소를 만들어 돌려주므로 map의 크기는 2가 되고 x는 0입니다. 그래서 20이 출력됩니다."
        },
        {
          q: "vector의 원소에 접근할 때 범위를 벗어나면 std::out_of_range 예외를 던지는 방법은?",
          choices: ["v[i]", "v.at(i)", "v.front(i)", "v.get(i)"],
          answer: 1,
          why: "at(i)만 범위를 검사해 예외를 던집니다. v[i]는 검사하지 않아 범위를 벗어나면 정의되지 않은 동작이고, front()는 인자를 받지 않으며 get은 vector의 멤버가 아닙니다."
        },
        {
          q: "서로 다른 네임스페이스 korean과 english에 같은 이름의 hello 함수가 있을 때, 둘을 구분해 호출하는 올바른 방법은?",
          choices: [
            "korean::hello() 처럼 범위 지정 연산자 ::로 네임스페이스 이름을 앞에 붙인다",
            "두 함수의 이름을 반드시 서로 다르게 바꿔야 한다",
            "함수 앞에 #define을 붙인다",
            "함수에 static을 붙이면 자동으로 구분된다"
          ],
          answer: 0,
          why: "네임스페이스는 같은 이름이 충돌하지 않게 해 주며, 이름::함수() 형태로 어느 쪽인지 지정해 호출합니다."
        },
        {
          q: "C++ 클래스의 소멸자에 대한 설명으로 옳은 것은?",
          choices: [
            "매개변수를 여러 개 받아 오버로딩할 수 있다",
            "반환 자료형으로 void를 반드시 적어야 한다",
            "이름 앞에 ~를 붙이며 객체가 사라질 때 자동으로 호출된다",
            "객체를 만든 뒤 프로그래머가 직접 호출해야만 실행된다"
          ],
          answer: 2,
          why: "소멸자는 ~클래스이름()의 형태로 반환 자료형과 매개변수가 없고, 객체의 수명이 끝날 때 자동으로 호출됩니다."
        }
      ],
      practice: [
        {
          title: "Rectangle 클래스 만들기",
          task: "가로와 세로를 생성자로 받아 저장하고, 넓이를 반환하는 const 멤버 함수 area()를 가진 Rectangle 클래스를 만드세요. main에서 Rectangle(3, 4)를 만들어 넓이를 출력합니다. 기대 출력은 12입니다.",
          hint: "멤버 변수는 private에 두고, 생성자의 초기화 리스트로 값을 채웁니다. area()는 가로 * 세로를 반환합니다.",
          solution: `#include <iostream>

class Rectangle {
public:
    Rectangle(int w, int h) : width(w), height(h) {}
    int area() const { return width * height; }

private:
    int width;
    int height;
};

int main() {
    Rectangle r(3, 4);
    std::cout << r.area() << std::endl;
    return 0;
}`,
          explain: "생성자가 width와 height를 3과 4로 초기화하고, area()가 3 * 4 = 12를 돌려줍니다. 값을 바꾸지 않는 함수라 const를 붙였습니다."
        },
        {
          title: "참조로 두 값 바꾸기",
          task: "두 int 참조를 받아 값을 서로 맞바꾸는 함수 swapValues를 만드세요. main에서 a = 1, b = 2로 호출한 뒤 a와 b를 한 줄에 공백으로 구분해 출력합니다. 기대 출력은 2 1입니다.",
          hint: "매개변수를 int& 로 선언하면 원본이 바뀝니다. 임시 변수 하나를 사용해 값을 옮기세요.",
          solution: `#include <iostream>

void swapValues(int& x, int& y) {
    int temp = x;
    x = y;
    y = temp;
}

int main() {
    int a = 1;
    int b = 2;
    swapValues(a, b);
    std::cout << a << " " << b << std::endl;
    return 0;
}`,
          explain: "x와 y가 a와 b의 별명이므로 함수 안에서 바꾼 값이 원본에 반영됩니다. 값으로 받으면 복사본만 바뀌어 맞바꾸기가 되지 않습니다."
        },
        {
          title: "map으로 단어 개수 세기",
          task: "std::vector<std::string> 에 \"a\", \"b\", \"a\", \"c\", \"a\" 를 담고, std::map<std::string, int> 로 각 단어가 몇 번 나왔는지 센 뒤 키 순서대로 한 줄에 하나씩 키=개수 형태로 출력하세요. 기대 출력은 a=3, b=1, c=1 세 줄입니다.",
          hint: "counts[단어]++ 를 하면 키가 없을 때 0에서 시작해 1이 됩니다. map을 순회하면 키 순서대로 나옵니다.",
          solution: `#include <iostream>
#include <map>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> words = {"a", "b", "a", "c", "a"};
    std::map<std::string, int> counts;
    for (const auto& w : words) {
        counts[w]++;
    }
    for (const auto& p : counts) {
        std::cout << p.first << "=" << p.second << std::endl;
    }
    return 0;
}`,
          explain: "map의 [] 연산자는 키가 없으면 값 0인 원소를 만들어 주므로 곧바로 ++ 할 수 있습니다. map은 키를 정렬해 저장하므로 a, b, c 순서로 출력됩니다."
        }
      ]
    },
    {
      level: "고급",
      intro: "고급에서는 자원을 안전하게 관리하는 RAII와 스마트 포인터, 복사를 줄이는 이동 의미론, 타입에 상관없이 쓰는 템플릿, 그리고 람다와 STL 알고리즘으로 현대적인 C++ 코드를 작성하는 방법을 배웁니다. 모든 예제는 C++14 이상(특히 C++17 권장)의 표준을 기준으로 합니다.",
      lessons: [
        {
          title: "RAII: 자원 관리의 기본 원칙",
          body: "RAII는 자원(메모리, 파일, 잠금 등)의 획득을 객체의 생성자에, 해제를 소멸자에 묶는 기법입니다. 객체가 스코프를 벗어나면 소멸자가 반드시 호출되므로 return이 여러 곳에 있어도, 예외가 발생해도 자원이 새지 않습니다. 예외가 던져져 스코프를 빠져나갈 때 지역 객체들의 소멸자가 호출되는 과정을 스택 되감기(stack unwinding)라고 하며, catch 블록이 실행되기 전에 일어납니다. new로 힙에 만든 자원은 delete로 직접 해제해야 하는데, 이 둘을 직접 짝지어 쓰면 중간에 return이나 예외가 있을 때 delete를 놓치기 쉬워 메모리 누수의 대표적인 원인이 됩니다. 표준 라이브러리의 std::string, std::vector, 스마트 포인터, std::lock_guard 등이 모두 RAII를 따릅니다.",
          code: `#include <iostream>
#include <stdexcept>
#include <string>

class FileLog {
public:
    // explicit: 인자가 하나인 생성자가 의도치 않은 암시적 변환에 쓰이지 않게 막는다
    explicit FileLog(const std::string& n) : name(n) {
        std::cout << "open " << name << std::endl;
    }
    ~FileLog() {
        std::cout << "close " << name << std::endl;
    }

private:
    std::string name;
};

void work(bool fail) {
    FileLog log("a.txt");
    if (fail) {
        throw std::runtime_error("fail");
    }
    std::cout << "work done" << std::endl;
}

int main() {
    try {
        work(true);
    } catch (const std::exception& e) {
        std::cout << "caught: " << e.what() << std::endl;
    }
    work(false);
    return 0;
}
// 출력: open a.txt / close a.txt / caught: fail / open a.txt / work done / close a.txt`
        },
        {
          title: "스마트 포인터: unique_ptr와 shared_ptr",
          body: "std::unique_ptr는 객체를 단독으로 소유하는 스마트 포인터로, 소멸할 때 자동으로 객체를 delete하며 복사할 수 없고 std::move로 소유권을 넘길 수만 있는데, 넘겨 준 포인터는 nullptr(빈 포인터)이 됩니다. std::shared_ptr는 여러 포인터가 같은 객체를 공유하고, 내부 참조 카운트(use_count)가 0이 되면 객체를 해제하며, 포인터가 스코프를 벗어나거나 reset()으로 비워지면 카운트가 1 줄어듭니다. 생성할 때는 new를 직접 쓰기보다 std::make_unique(C++14)와 std::make_shared를 쓰는 것이 안전하고 간결합니다. 소유권이 하나면 unique_ptr를 기본으로 선택하고, 정말 공유가 필요할 때만 shared_ptr를 쓰세요. shared_ptr끼리 서로를 가리키는 순환 참조는 참조 카운트가 0이 되지 않아 누수가 생기므로, 한쪽을 std::weak_ptr로 바꿔야 합니다.",
          code: `#include <iostream>
#include <memory>
#include <utility>

struct Item {
    int id;
    explicit Item(int i) : id(i) {
        std::cout << "Item " << id << " 생성" << std::endl;
    }
    ~Item() {
        std::cout << "Item " << id << " 소멸" << std::endl;
    }
};

int main() {
    auto u = std::make_unique<Item>(1);
    std::unique_ptr<Item> u2 = std::move(u);
    std::cout << (u == nullptr) << std::endl;

    auto s1 = std::make_shared<Item>(2);
    {
        auto s2 = s1;
        std::cout << s1.use_count() << std::endl;
    }
    std::cout << s1.use_count() << std::endl;
    return 0;
}
// 출력: Item 1 생성 / 1 / Item 2 생성 / 2 / 1 / Item 2 소멸 / Item 1 소멸`
        },
        {
          title: "이동 의미론: 복사 대신 자원 넘기기",
          body: "이동 의미론은 곧 사라질 임시 객체나 더 이상 쓰지 않을 객체의 자원을 복사하지 않고 훔쳐 오는 기능입니다. 오른값 참조 T&& 를 받는 이동 생성자가 이를 구현하며, std::move(x)는 x를 오른값으로 캐스팅할 뿐 스스로 아무것도 옮기지 않고, 실제 이동은 이동 생성자나 이동 대입이 수행합니다. 이동된 뒤의 객체는 유효하지만 값이 정해지지 않은 상태이므로 다시 대입하거나 소멸시키는 것 외에는 가정하지 말아야 합니다(예제의 Buffer는 이동 생성자가 직접 비워 두었기 때문에 size()가 0입니다). 이동 생성자에는 noexcept를 붙이는 것이 좋은데, 그래야 vector가 커질 때 복사 대신 이동을 쓸 수 있기 때문입니다. 지역 변수를 반환할 때 return std::move(x); 처럼 쓰면 오히려 컴파일러의 최적화를 막을 수 있으니 그냥 return x; 로 쓰세요. 복사 생성자, 소멸자 등을 직접 정의했다면 복사 대입과 이동 대입까지 함께 고민해야 하며(5의 규칙), 가능하면 vector나 스마트 포인터를 멤버로 써서 직접 정의하지 않는 쪽이 가장 안전합니다.",
          code: `#include <iostream>
#include <utility>

class Buffer {
public:
    explicit Buffer(int n) : size_(n), data_(new int[n]()) {}

    Buffer(const Buffer& o) : size_(o.size_), data_(new int[o.size_]) {
        for (int i = 0; i < size_; i++) {
            data_[i] = o.data_[i];
        }
        std::cout << "복사" << std::endl;
    }

    Buffer(Buffer&& o) noexcept : size_(o.size_), data_(o.data_) {
        o.size_ = 0;
        o.data_ = nullptr;
        std::cout << "이동" << std::endl;
    }

    ~Buffer() { delete[] data_; }

    int size() const { return size_; }

private:
    int size_;
    int* data_;
};

int main() {
    Buffer a(100);
    Buffer b = a;
    Buffer c = std::move(a);
    std::cout << c.size() << " " << a.size() << std::endl;
    return 0;
}
// 출력: 복사 / 이동 / 100 0`
        },
        {
          title: "템플릿",
          body: "템플릿은 자료형을 매개변수로 받아 하나의 코드로 여러 자료형에 쓸 수 있게 하는 기능입니다. 함수 템플릿은 호출 인자로부터 T를 추론하며, maxOf(3, 2.5)처럼 같은 T 자리에 int와 double이 함께 오면 추론이 충돌해 컴파일 오류가 납니다. 이때는 maxOf<double>(3, 2.5)처럼 T를 직접 지정합니다. 클래스 템플릿은 Box<std::string>처럼 꺾쇠 안에 자료형을 적어서 사용하며, C++17부터는 Box b(5);처럼 생성자 인자로 추론할 수 있는 경우 생략해도 됩니다. 템플릿은 사용될 때 컴파일러가 실제 자료형으로 코드를 만들어 내므로 정의를 보통 헤더 파일에 두며, 지원하지 않는 연산(예: operator>가 없는 타입)을 쓰면 길고 읽기 어려운 오류 메시지가 나옵니다.",
          code: `#include <iostream>
#include <string>

template <typename T>
T maxOf(T a, T b) {
    return (a > b) ? a : b;
}

template <typename T>
class Box {
public:
    explicit Box(T v) : value(v) {}
    T get() const { return value; }

private:
    T value;
};

int main() {
    std::cout << maxOf(3, 7) << std::endl;
    std::cout << maxOf(2.5, 1.5) << std::endl;
    std::cout << maxOf<double>(3, 2.5) << std::endl;

    Box<std::string> b("hi");
    std::cout << b.get() << std::endl;
    return 0;
}
// 출력: 7 / 2.5 / 3 / hi`
        },
        {
          title: "람다 표현식",
          body: "람다는 이름 없는 함수 객체를 그 자리에서 만드는 문법으로 [캡처](매개변수) { 본문 } 형태입니다. 대괄호 안의 캡처는 바깥 변수를 가져오는 방법을 정하며, [x]는 만들어지는 순간의 값을 복사하고 [&x]는 참조로 가져와 이후 변화가 반영됩니다. 복사 캡처한 값을 람다 안에서 바꾸려면 mutable을 붙여야 하고, 바뀐 값은 람다 객체 안에서만 유지됩니다. 매개변수 자리에 auto를 쓰는 제네릭 람다와 [n = 0] 같은 초기화 캡처는 C++14부터 쓸 수 있습니다. 참조 캡처한 지역 변수가 사라진 뒤에 람다를 호출하면 이미 사라진 변수를 가리키게 되므로, 람다를 함수 밖으로 돌려줄 때는 값으로 캡처해야 합니다.",
          code: `#include <iostream>

int main() {
    int base = 10;
    auto addBase = [base](int x) { return x + base; };
    auto addRef = [&base](int x) { return x + base; };
    base = 20;
    std::cout << addBase(1) << std::endl;
    std::cout << addRef(1) << std::endl;

    auto counter = [n = 0]() mutable { return ++n; };
    std::cout << counter() << std::endl;
    std::cout << counter() << std::endl;

    auto sq = [](auto x) { return x * x; };
    std::cout << sq(3) << std::endl;
    std::cout << sq(1.5) << std::endl;
    return 0;
}
// 출력: 11 / 21 / 1 / 2 / 9 / 2.25`
        },
        {
          title: "STL 알고리즘",
          body: "<algorithm>과 <numeric>은 반복자 범위 [begin, end)를 받아 정렬, 검색, 개수 세기 같은 작업을 해 주는 함수들을 제공하며, 직접 반복문을 쓰는 것보다 의도가 잘 드러나고 검증되어 있습니다. std::sort는 기본적으로 오름차순이고, 세 번째 인자로 비교 람다를 주면 기준을 바꿀 수 있으며 이때 비교 함수는 a > b처럼 엄격한 순서를 만족해야 합니다(a >= b처럼 같을 때 참이 되면 안 됩니다). find는 원소를 가리키는 반복자를 돌려주고 없으면 end()를 돌려주며, count_if는 조건을 만족하는 원소 수를, accumulate는 합계를 구합니다. remove_if는 원소를 실제로 지우지 않고 남길 원소를 앞으로 모아 새 끝 위치를 돌려줄 뿐이므로, v.erase(remove_if(...), v.end()) 형태(erase-remove 관용구)로 함께 써야 크기가 줄어듭니다(C++20부터는 std::erase_if(v, 조건)으로 한 번에 처리할 수도 있습니다).",
          code: `#include <algorithm>
#include <iostream>
#include <numeric>
#include <vector>

void print(const std::vector<int>& v) {
    for (int x : v) {
        std::cout << x << " ";
    }
    std::cout << std::endl;
}

int main() {
    std::vector<int> v = {5, 2, 8, 1, 9, 3};

    std::sort(v.begin(), v.end());
    print(v);

    std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });
    print(v);

    auto it = std::find(v.begin(), v.end(), 5);
    std::cout << (it - v.begin()) << std::endl;

    int evens = std::count_if(v.begin(), v.end(), [](int x) { return x % 2 == 0; });
    std::cout << evens << std::endl;

    std::cout << std::accumulate(v.begin(), v.end(), 0) << std::endl;

    v.erase(std::remove_if(v.begin(), v.end(), [](int x) { return x < 4; }), v.end());
    print(v);
    return 0;
}
// 출력: 1 2 3 5 8 9 / 9 8 5 3 2 1 / 2 / 2 / 28 / 9 8 5`
        }
      ],
      quiz: [
        {
          q: `다음 코드를 컴파일하면 어떻게 될까요?

#include <memory>

int main() {
    auto p = std::make_unique<int>(5);
    auto q = p;
}`,
          choices: [
            "q와 p가 모두 5를 가리킨다",
            "컴파일 오류: unique_ptr는 복사할 수 없다",
            "p는 nullptr이 되고 q가 5를 가리킨다",
            "실행 중에 예외가 발생한다"
          ],
          answer: 1,
          why: "unique_ptr는 단독 소유를 보장하기 위해 복사 생성자가 삭제되어 있어 컴파일 오류가 납니다. 소유권을 넘기려면 auto q = std::move(p); 처럼 이동해야 합니다."
        },
        {
          q: `다음 코드를 실행하면 출력되는 값은?

auto a = std::make_shared<int>(1);
auto b = a;
auto c = a;
b.reset();
std::cout << a.use_count();`,
          choices: ["1", "3", "0", "2"],
          answer: 3,
          why: "a, b, c 세 개가 공유하면 use_count는 3이지만, b.reset()으로 b가 객체를 놓으면 a와 c 두 개만 남아 2가 출력됩니다."
        },
        {
          q: "RAII의 핵심 아이디어를 가장 정확하게 설명한 것은?",
          choices: [
            "자원의 획득을 객체의 생성자에, 해제를 소멸자에 맡겨 수명을 객체의 스코프와 연결한다",
            "자원을 항상 힙에만 만들고 프로그램이 끝날 때 한꺼번에 해제한다",
            "예외가 발생하면 프로그램을 즉시 종료해 자원을 운영체제가 정리하게 한다",
            "new로 만든 자원을 반드시 delete로 직접 해제하도록 강제한다"
          ],
          answer: 0,
          why: "RAII는 자원의 수명을 객체의 수명에 묶어, 스코프를 벗어나면 소멸자가 자동으로 자원을 해제하게 하는 기법입니다. 예외가 발생해도 소멸자는 호출됩니다."
        },
        {
          q: `다음 코드의 출력은?

int x = 1;
auto f = [x]() { return x; };
x = 5;
std::cout << f();`,
          choices: ["5", "6", "1", "컴파일 오류"],
          answer: 2,
          why: "[x]는 람다가 만들어지는 시점의 x 값 1을 복사해 두므로 이후 x를 바꿔도 f()는 1을 돌려줍니다. 5를 보려면 [&x]로 참조 캡처해야 합니다."
        },
        {
          q: `다음 코드를 컴파일하면 어떻게 될까요?

#include <iostream>

template <typename T>
T maxOf(T a, T b) { return (a > b) ? a : b; }

int main() {
    std::cout << maxOf(3, 2.5);
}`,
          choices: [
            "3이 출력된다",
            "컴파일 오류: T가 int와 double로 서로 다르게 추론된다",
            "2.5가 출력된다",
            "실행 중에 예외가 발생한다"
          ],
          answer: 1,
          why: "첫 인자 3에서는 T가 int, 두 번째 인자 2.5에서는 double로 추론되어 충돌하므로 컴파일 오류입니다. maxOf<double>(3, 2.5)처럼 T를 직접 지정하면 해결됩니다."
        },
        {
          q: "std::move(x)가 하는 일에 대한 설명으로 옳은 것은?",
          choices: [
            "x의 메모리를 즉시 다른 위치로 옮기고 원본을 삭제한다",
            "x가 가진 값을 모두 0으로 초기화한다",
            "x를 복사한 새 객체를 힙에 만든다",
            "x를 오른값으로 캐스팅할 뿐이며, 실제 자원 이동은 이동 생성자나 이동 대입이 수행한다"
          ],
          answer: 3,
          why: "std::move는 이름과 달리 아무것도 옮기지 않고 오른값 참조로 형변환만 합니다. 그 결과 이동 생성자나 이동 대입이 선택되어 자원을 넘겨받습니다."
        },
        {
          q: `다음 코드를 실행한 뒤 v에 남는 원소는?

std::vector<int> v = {1, 2, 3, 4, 5};
v.erase(std::remove_if(v.begin(), v.end(),
        [](int x) { return x % 2 == 0; }), v.end());`,
          choices: ["1 2 3 4 5", "2 4", "1 3 5", "3 5"],
          answer: 2,
          why: "remove_if가 짝수를 제외한 1, 3, 5를 앞으로 모으고 새 끝 위치를 돌려주며, erase가 그 뒤쪽을 실제로 지워 1 3 5만 남습니다."
        },
        {
          q: "std::sort로 int 벡터를 내림차순으로 정렬할 때 올바른 비교 람다는?",
          choices: [
            "[](int a, int b) { return a > b; }",
            "[](int a, int b) { return a < b; }",
            "[](int a, int b) { return a <= b; }",
            "[](int a) { return a > 0; }"
          ],
          answer: 0,
          why: "a가 b보다 앞에 와야 할 때 true를 돌려주므로 a > b가 내림차순입니다. a < b는 오름차순이고, a <= b는 같은 값에서도 참이 되어 엄격한 순서 조건을 어기며, 인자가 하나인 람다는 비교 함수로 쓸 수 없습니다."
        }
      ],
      practice: [
        {
          title: "unique_ptr 소유권 이전",
          task: "std::make_unique<int>(42)로 unique_ptr p를 만들고, std::move로 소유권을 새 unique_ptr q에 넘기세요. 그 다음 *q 를 한 줄에, (p == nullptr) 의 결과를 다음 줄에 출력합니다. 기대 출력은 42와 1 두 줄입니다.",
          hint: "<memory>와 <utility> 헤더가 필요합니다. 소유권을 넘긴 뒤의 p는 nullptr이 되고, bool을 cout으로 출력하면 true는 1로 나옵니다.",
          solution: `#include <iostream>
#include <memory>
#include <utility>

int main() {
    auto p = std::make_unique<int>(42);
    std::unique_ptr<int> q = std::move(p);
    std::cout << *q << std::endl;
    std::cout << (p == nullptr) << std::endl;
    return 0;
}`,
          explain: "unique_ptr는 복사할 수 없으므로 std::move로 소유권을 q에 넘기고, 넘겨 준 p는 비어 있게 됩니다. 그래서 *q는 42이고 p == nullptr 은 true이므로 1이 출력됩니다."
        },
        {
          title: "함수 템플릿 minOf",
          task: "두 값 중 작은 값을 돌려주는 함수 템플릿 minOf를 만들고, minOf(3, 9), minOf(2.5, 1.5), minOf(std::string(\"pear\"), std::string(\"apple\")) 의 결과를 각각 한 줄에 출력하세요. 기대 출력은 3, 1.5, apple 세 줄입니다.",
          hint: "template <typename T> 아래에 T minOf(T a, T b)를 정의하고 (a < b) ? a : b 를 돌려줍니다. 문자열은 < 로 사전 순 비교가 됩니다.",
          solution: `#include <iostream>
#include <string>

template <typename T>
T minOf(T a, T b) {
    return (a < b) ? a : b;
}

int main() {
    std::cout << minOf(3, 9) << std::endl;
    std::cout << minOf(2.5, 1.5) << std::endl;
    std::cout << minOf(std::string("pear"), std::string("apple")) << std::endl;
    return 0;
}`,
          explain: "컴파일러가 인자의 자료형에 맞게 T를 int, double, std::string으로 추론해 각각의 함수를 만들어 줍니다. 문자열은 사전 순으로 비교되어 apple이 더 작으므로 apple이 출력됩니다."
        },
        {
          title: "람다와 알고리즘으로 정렬하고 세기",
          task: "std::vector<int> 에 {4, 7, 2, 9, 6} 을 담고, 람다를 사용해 내림차순으로 정렬한 뒤 원소를 공백으로 구분해 한 줄에 출력하세요. 이어서 count_if와 람다로 5보다 큰 원소의 개수를 다음 줄에 출력합니다. 기대 출력은 9 7 6 4 2 와 3 두 줄입니다(첫 줄 끝의 공백은 있어도 됩니다).",
          hint: "std::sort(begin, end, [](int a, int b) { return a > b; }) 로 정렬하고, count_if에는 [](int x) { return x > 5; } 를 넘깁니다. <algorithm> 헤더가 필요합니다.",
          solution: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {4, 7, 2, 9, 6};
    std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });
    for (int x : v) {
        std::cout << x << " ";
    }
    std::cout << std::endl;
    std::cout << std::count_if(v.begin(), v.end(), [](int x) { return x > 5; }) << std::endl;
    return 0;
}`,
          explain: "비교 람다가 a > b이므로 큰 값이 앞에 오는 내림차순 9 7 6 4 2가 됩니다. 5보다 큰 원소는 9, 7, 6 세 개이므로 3이 출력됩니다."
        }
      ]
    }
  ]
});
