(window.LANG_EXTRA = window.LANG_EXTRA || []).push({
  id: "java",
  levels: [
    {
      level: "입문",
      practice: [
        {
          title: "기온에 따른 메시지 출력",
          task: "int 변수 temp에 28을 저장하고 if / else if / else로 판단하세요. 30 이상이면 \"더움\", 20 이상이면 \"적당함\", 그 외에는 \"추움\"을 출력합니다. temp가 28이므로 기대 출력은 한 줄, 적당함 입니다.",
          hint: "큰 기준부터 차례로 검사하세요. 첫 번째 조건이 거짓이면 else if가 검사됩니다.",
          solution: `public class Main {
    public static void main(String[] args) {
        int temp = 28;

        if (temp >= 30) {
            System.out.println("더움");
        } else if (temp >= 20) {
            System.out.println("적당함");
        } else {
            System.out.println("추움");
        }
    }
}`,
          explain: "28은 30 이상이 아니므로 첫 조건은 거짓이고, 20 이상이므로 두 번째 조건이 참이 되어 적당함이 출력됩니다. else if는 앞의 조건이 모두 거짓일 때만 검사된다는 점이 핵심입니다."
        },
        {
          title: "배열에서 최댓값 찾기",
          task: "int 배열 {3, 8, 1, 9, 4}에서 가장 큰 값을 for 문으로 찾아 출력하세요. 기대 출력은 한 줄, 9 입니다.",
          hint: "첫 번째 원소를 max에 담아 두고, 반복하면서 더 큰 값을 만나면 max를 바꿉니다.",
          solution: `public class Main {
    public static void main(String[] args) {
        int[] numbers = {3, 8, 1, 9, 4};
        int max = numbers[0];

        for (int i = 1; i < numbers.length; i++) {
            if (numbers[i] > max) {
                max = numbers[i];
            }
        }

        System.out.println(max);
    }
}`,
          explain: "max를 첫 원소로 시작해 인덱스 1부터 끝까지 비교하며 더 큰 값이 나오면 갱신합니다. 반복이 끝나면 max에 가장 큰 값 9가 남습니다."
        },
        {
          title: "넓이를 계산하는 클래스",
          task: "가로(width)와 세로(height)를 생성자로 받는 Rectangle 클래스를 만들고, 넓이를 반환하는 int area() 메서드를 추가하세요. main에서 new Rectangle(3, 4)의 넓이를 출력하면 기대 출력은 한 줄, 12 입니다.",
          hint: "생성자에서 this.width = width; 처럼 필드를 채우고, area()는 두 필드를 곱해 return 합니다.",
          solution: `class Rectangle {
    int width;
    int height;

    Rectangle(int width, int height) {
        this.width = width;
        this.height = height;
    }

    int area() {
        return width * height;
    }
}

public class Main {
    public static void main(String[] args) {
        Rectangle r = new Rectangle(3, 4);
        System.out.println(r.area());
    }
}`,
          explain: "생성자가 필드를 초기화하고, area() 메서드가 필드 값을 곱해 int로 돌려줍니다. new로 만든 객체의 메서드를 호출하면 3 * 4 = 12가 출력됩니다."
        }
      ]
    },
    {
      level: "중급",
      intro: "이 단계에서는 상속과 인터페이스로 객체를 설계하고, 컬렉션과 제네릭으로 데이터를 안전하게 다루는 방법을 배웁니다. 또 예외 처리로 오류 상황을 우아하게 다루는 법까지 익혀 실무 수준의 Java 코드를 읽고 쓸 준비를 합니다.",
      lessons: [
        {
          title: "클래스와 상속",
          body: "상속은 extends 키워드로 기존 클래스(부모)의 필드와 메서드를 물려받아 새 클래스(자식)를 만드는 기능입니다. 자식은 부모의 메서드를 @Override로 재정의할 수 있고, 부모 타입 변수로 자식 객체를 가리켜도 실제 객체의 재정의된 메서드가 호출됩니다(다형성). 부모에 매개변수가 있는 생성자만 있다면 자식 생성자는 첫 줄에서 super(...)로 부모 생성자를 반드시 호출해야 합니다. Java의 클래스는 하나의 부모만 extends할 수 있다는 점과, 재정의할 때 @Override를 빼먹으면 철자 실수를 컴파일러가 잡아주지 못한다는 점이 흔한 함정입니다.",
          code: `class Animal {
    protected String name;

    Animal(String name) {
        this.name = name;
    }

    String sound() {
        return "...";
    }

    void introduce() {
        System.out.println(name + ": " + sound());
    }
}

class Dog extends Animal {
    Dog(String name) {
        super(name);
    }

    @Override
    String sound() {
        return "멍멍";
    }
}

class Cat extends Animal {
    Cat(String name) {
        super(name);
    }

    @Override
    String sound() {
        return "야옹";
    }
}

public class Main {
    public static void main(String[] args) {
        Animal[] animals = { new Dog("바둑이"), new Cat("나비"), new Animal("미확인") };
        for (Animal a : animals) {
            a.introduce();
        }
    }
}
// 출력:
// 바둑이: 멍멍
// 나비: 야옹
// 미확인: ...`
        },
        {
          title: "인터페이스",
          body: "인터페이스는 클래스가 반드시 제공해야 할 메서드의 규칙(계약)만 정의하고, 구현은 implements 하는 클래스가 맡습니다. 클래스는 부모를 하나만 상속할 수 있지만 인터페이스는 여러 개를 구현할 수 있어서, 서로 관련 없는 클래스들에 공통 기능을 부여할 때 유용합니다. 인터페이스 메서드는 기본적으로 public abstract이며, default 메서드로 기본 구현을 함께 줄 수 있습니다. 구현 클래스에서 메서드를 public으로 적지 않아 접근 제한 오류가 나는 것이 흔한 실수입니다.",
          code: `interface Shape {
    double area();

    default String describe() {
        return getClass().getSimpleName() + " 넓이=" + area();
    }
}

class Rect implements Shape {
    private final double w;
    private final double h;

    Rect(double w, double h) {
        this.w = w;
        this.h = h;
    }

    @Override
    public double area() {
        return w * h;
    }
}

class Square implements Shape {
    private final double side;

    Square(double side) {
        this.side = side;
    }

    @Override
    public double area() {
        return side * side;
    }
}

public class Main {
    public static void main(String[] args) {
        Shape[] shapes = { new Rect(3, 4), new Square(5) };
        for (Shape s : shapes) {
            System.out.println(s.describe());
        }
    }
}
// 출력:
// Rect 넓이=12.0
// Square 넓이=25.0`
        },
        {
          title: "컬렉션 (1) List",
          body: "컬렉션은 여러 값을 담고 다루기 위한 표준 자료구조 모음이며, 배열과 달리 크기가 자동으로 늘어납니다. List는 순서가 있고 중복을 허용하는 컬렉션으로, 대표 구현체는 ArrayList입니다. 변수는 List 같은 인터페이스 타입으로 선언하고 new ArrayList<>()로 생성하는 것이 일반적입니다. List<Integer>에서 remove(1)은 값 1이 아니라 인덱스 1을 지우는 반면, remove(Integer.valueOf(1))은 값을 지우므로 헷갈리지 않도록 주의해야 합니다.",
          code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>();
        names.add("민수");
        names.add("지수");
        names.add("민수");

        System.out.println(names);          // [민수, 지수, 민수]
        System.out.println(names.size());   // 3

        names.remove("민수");               // 처음 만나는 "민수" 하나만 제거
        System.out.println(names);          // [지수, 민수]
        System.out.println(names.get(0));   // 지수
        System.out.println(names.contains("민수")); // true

        for (String n : names) {
            System.out.println("이름: " + n);
        }
    }
}`
        },
        {
          title: "컬렉션 (2) Map과 Set",
          body: "Map은 키와 값을 짝지어 저장하며 키로 값을 빠르게 찾습니다. 같은 키로 put하면 기존 값이 교체되고, 없는 키를 get하면 null이 반환되므로 getOrDefault로 기본값을 줄 수 있습니다. Set은 중복을 허용하지 않는 컬렉션이며 add가 이미 있는 값이면 false를 돌려줍니다. HashMap과 HashSet은 순회 순서를 보장하지 않으므로, 입력 순서가 필요하면 LinkedHashMap, LinkedHashSet을, 정렬이 필요하면 TreeMap, TreeSet을 사용합니다.",
          code: `import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> stock = new LinkedHashMap<>();
        stock.put("사과", 3);
        stock.put("배", 5);
        stock.put("사과", 4);                          // 같은 키 -> 값 교체
        System.out.println(stock);                      // {사과=4, 배=5}
        System.out.println(stock.get("배"));            // 5
        System.out.println(stock.getOrDefault("포도", 0)); // 0

        String[] words = "a b a c b a".split(" ");
        Map<String, Integer> count = new LinkedHashMap<>();
        for (String w : words) {
            count.put(w, count.getOrDefault(w, 0) + 1);
        }
        System.out.println(count);                      // {a=3, b=2, c=1}

        Set<Integer> set = new LinkedHashSet<>();
        System.out.println(set.add(1));                 // true
        set.add(2);
        System.out.println(set.add(2));                 // false (중복)
        System.out.println(set);                        // [1, 2]
    }
}`
        },
        {
          title: "예외 처리",
          body: "예외는 프로그램 실행 중 발생하는 오류 상황을 나타내는 객체이며, try에서 실행하고 catch에서 잡아 처리하고 finally는 예외 발생 여부와 관계없이 마지막에 항상 실행됩니다. 직접 예외를 일으킬 때는 throw new ...을 사용합니다. IOException처럼 반드시 try-catch 또는 throws로 처리해야 하는 것을 checked 예외라 하고, RuntimeException 계열(NullPointerException, IllegalArgumentException 등)은 처리를 강제하지 않는 unchecked 예외입니다. catch 블록을 비워 두어 오류를 삼켜 버리는 것이 가장 흔한 나쁜 습관이며, 파일처럼 닫아야 하는 자원은 try-with-resources로 다루는 것이 안전합니다.",
          code: `public class Main {
    static int parse(String s) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            System.out.println("숫자가 아님: " + s);
            return -1;
        } finally {
            System.out.println("parse 종료: " + s);
        }
    }

    static void checkAge(int age) {
        if (age < 0) {
            throw new IllegalArgumentException("나이는 음수일 수 없음: " + age);
        }
    }

    public static void main(String[] args) {
        System.out.println(parse("12"));
        System.out.println(parse("abc"));

        try {
            checkAge(-5);
        } catch (IllegalArgumentException e) {
            System.out.println("오류: " + e.getMessage());
        }
    }
}
// 출력:
// parse 종료: 12
// 12
// 숫자가 아님: abc
// parse 종료: abc
// -1
// 오류: 나이는 음수일 수 없음: -5`
        },
        {
          title: "제네릭 기초",
          body: "제네릭은 클래스나 메서드가 다룰 타입을 <T>처럼 매개변수로 받아, 컴파일 시점에 타입 안전성을 확보하는 기능입니다. List<String>에 숫자를 넣으면 컴파일 오류가 나고, 꺼낼 때 형변환도 필요 없습니다. 제네릭에는 int 같은 기본형을 쓸 수 없고 Integer 같은 래퍼 클래스를 써야 하며, List<Integer>는 List<Number>의 하위 타입이 아니라는 점이 흔한 오해입니다. <T extends Comparable<T>>처럼 상한을 두면 T가 비교 가능한 타입임을 보장할 수 있습니다.",
          code: `class Box<T> {
    private T value;

    Box(T value) {
        this.value = value;
    }

    T get() {
        return value;
    }

    void set(T value) {
        this.value = value;
    }
}

public class Main {
    static <T extends Comparable<T>> T max(T a, T b) {
        return a.compareTo(b) >= 0 ? a : b;
    }

    public static void main(String[] args) {
        Box<String> s = new Box<>("hello");
        String text = s.get();               // 형변환 불필요
        System.out.println(text);            // hello

        Box<Integer> n = new Box<>(10);
        int plus = n.get() + 1;
        System.out.println(plus);            // 11

        System.out.println(max(3, 7));               // 7
        System.out.println(max("apple", "banana"));  // banana
    }
}`
        }
      ],
      quiz: [
        {
          q: "다음 코드의 출력 결과는?\n\nclass A { String who() { return \"A\"; } }\nclass B extends A { String who() { return \"B\"; } }\n// main 안에서\nA obj = new B();\nSystem.out.println(obj.who());",
          choices: ["A", "B", "컴파일 오류", "런타임 오류"],
          answer: 1,
          why: "변수 타입은 A이지만 실제 객체가 B이므로 재정의된 B의 who()가 호출됩니다. 이것이 다형성(동적 바인딩)입니다."
        },
        {
          q: "Java의 상속과 인터페이스에 대한 설명으로 옳은 것은?",
          choices: ["클래스는 여러 클래스를 extends 할 수 있다", "인터페이스는 하나만 implements 할 수 있다", "클래스는 하나의 클래스만 extends 하지만 여러 인터페이스를 implements 할 수 있다", "인터페이스는 객체를 직접 new로 생성할 수 있다"],
          answer: 2,
          why: "Java는 클래스 다중 상속을 허용하지 않지만, 인터페이스는 여러 개를 구현할 수 있습니다. 인터페이스 자체는 new로 생성할 수 없습니다."
        },
        {
          q: "클래스가 인터페이스의 규칙을 구현한다고 선언할 때 사용하는 키워드는?",
          choices: ["implements", "extends", "inherits", "interface"],
          answer: 0,
          why: "클래스가 인터페이스를 구현할 때는 implements를 씁니다. extends는 클래스끼리의 상속(또는 인터페이스끼리의 상속)에 사용합니다."
        },
        {
          q: "다음 코드를 실행한 뒤 출력되는 결과는?\n\nList<Integer> list = new ArrayList<>(List.of(10, 20, 30));\nlist.remove(1);\nSystem.out.println(list);",
          choices: ["[20, 30]", "[10, 20]", "[10, 20, 30]", "[10, 30]"],
          answer: 3,
          why: "int 인자를 받는 remove(int index)가 호출되어 인덱스 1의 값 20이 제거됩니다. 값 20을 지우려면 remove(Integer.valueOf(20))처럼 객체를 넘겨야 합니다."
        },
        {
          q: "Map에 존재하지 않는 키로 get(키)를 호출하면 어떻게 될까요? (HashMap 기준)",
          choices: ["null을 반환한다", "NoSuchElementException이 발생한다", "0을 반환한다", "컴파일 오류가 난다"],
          answer: 0,
          why: "Map.get은 키가 없으면 null을 반환합니다. 기본값이 필요하면 getOrDefault를 사용할 수 있습니다."
        },
        {
          q: "다음 코드의 출력 순서는?\n\ntry {\n    System.out.println(\"A\");\n    int x = 5 / 0;\n    System.out.println(\"B\");\n} catch (ArithmeticException e) {\n    System.out.println(\"C\");\n} finally {\n    System.out.println(\"D\");\n}",
          choices: ["A B D", "A C D", "A C", "A B C D"],
          answer: 1,
          why: "A를 출력한 뒤 5 / 0에서 ArithmeticException이 발생하므로 B는 건너뛰고 catch의 C가 실행됩니다. finally의 D는 항상 실행됩니다."
        },
        {
          q: "다음 중 try-catch 또는 throws로 반드시 처리해야 하는 checked 예외는?",
          choices: ["NullPointerException", "IllegalArgumentException", "IOException", "ArrayIndexOutOfBoundsException"],
          answer: 2,
          why: "IOException은 checked 예외라서 처리하지 않으면 컴파일 오류가 납니다. 나머지는 RuntimeException 계열의 unchecked 예외입니다."
        },
        {
          q: "다음 코드를 컴파일하면 어떻게 될까요?\n\nList<String> list = new ArrayList<>();\nlist.add(10);",
          choices: ["정상 실행되고 [10]이 저장된다", "런타임에 ClassCastException이 발생한다", "10이 문자열로 자동 변환되어 추가된다", "컴파일 오류가 난다"],
          answer: 3,
          why: "List<String>에는 String만 추가할 수 있고, int 10은 String으로 자동 변환되지 않습니다. 제네릭은 이런 오류를 컴파일 시점에 잡아 줍니다."
        }
      ],
      practice: [
        {
          title: "상속과 메서드 재정의",
          task: "이름을 생성자로 받는 Animal 클래스(sound()는 \"...\" 반환)와, 이를 상속해 sound()를 \"짹짹\"으로 재정의하는 Bird 클래스를 만드세요. Animal 타입 변수에 new Bird(\"짹이\")를 담고 이름과 소리를 \"이름: 소리\" 형식으로 출력하면 기대 출력은 한 줄, 짹이: 짹짹 입니다.",
          hint: "Bird 생성자에서 super(name)을 호출하고, sound()에는 @Override를 붙이세요. 이름 필드는 protected나 접근자로 읽을 수 있습니다.",
          solution: `class Animal {
    protected String name;

    Animal(String name) {
        this.name = name;
    }

    String sound() {
        return "...";
    }
}

class Bird extends Animal {
    Bird(String name) {
        super(name);
    }

    @Override
    String sound() {
        return "짹짹";
    }
}

public class Main {
    public static void main(String[] args) {
        Animal a = new Bird("짹이");
        System.out.println(a.name + ": " + a.sound());
    }
}`,
          explain: "Bird는 super(name)으로 부모의 필드를 초기화하고 sound()를 재정의합니다. 변수 타입이 Animal이어도 실제 객체가 Bird이므로 \"짹짹\"이 호출됩니다. name은 같은 패키지의 Main에서 접근할 수 있어 a.name으로 읽을 수 있습니다."
        },
        {
          title: "단어 개수 세기",
          task: "문자열 배열 {\"apple\", \"banana\", \"apple\", \"cherry\", \"banana\", \"apple\"}에서 단어별 등장 횟수를 LinkedHashMap으로 세어 맵 전체를 출력하세요. 기대 출력은 한 줄, {apple=3, banana=2, cherry=1} 입니다.",
          hint: "각 단어마다 map.put(w, map.getOrDefault(w, 0) + 1)을 실행하세요. 출력 순서를 입력 순서로 유지하려면 LinkedHashMap을 씁니다.",
          solution: `import java.util.LinkedHashMap;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        String[] words = {"apple", "banana", "apple", "cherry", "banana", "apple"};
        Map<String, Integer> count = new LinkedHashMap<>();

        for (String w : words) {
            count.put(w, count.getOrDefault(w, 0) + 1);
        }

        System.out.println(count);
    }
}`,
          explain: "getOrDefault로 아직 없는 단어는 0에서 시작해 1씩 더합니다. LinkedHashMap은 처음 삽입한 순서를 유지하므로 출력이 항상 같은 순서로 나옵니다."
        },
        {
          title: "0으로 나누기 예외 처리",
          task: "두 정수를 받아 나눈 몫을 돌려주는 static int divide(int a, int b) 메서드를 만들되, ArithmeticException이 발생하면 -1을 반환하게 하세요. divide(10, 2)와 divide(5, 0)의 결과를 각각 한 줄씩 출력하면 기대 출력은 5, -1 입니다.",
          hint: "나눗셈을 try 안에 넣고 catch (ArithmeticException e)에서 -1을 반환하세요. 정수를 0으로 나누면 ArithmeticException이 발생합니다.",
          solution: `public class Main {
    static int divide(int a, int b) {
        try {
            return a / b;
        } catch (ArithmeticException e) {
            return -1;
        }
    }

    public static void main(String[] args) {
        System.out.println(divide(10, 2));
        System.out.println(divide(5, 0));
    }
}`,
          explain: "10 / 2는 정상적으로 5를 반환합니다. 5 / 0은 ArithmeticException을 일으켜 catch 블록이 실행되고 -1이 반환됩니다."
        }
      ]
    },
    {
      level: "고급",
      intro: "이 단계에서는 람다와 스트림, Optional, record로 현대적이고 간결한 Java 코드를 작성하는 법을 배웁니다. 이어서 Executor 기반 동시성과 JVM의 메모리 구조 및 GC 개념까지 이해해 안정적인 프로그램을 설계하는 시야를 얻습니다.",
      lessons: [
        {
          title: "람다와 함수형 인터페이스",
          body: "람다식은 (매개변수) -> 식 형태로 짧은 익명 함수를 표현하며, 추상 메서드가 하나뿐인 함수형 인터페이스 자리에서 사용할 수 있습니다. java.util.function 패키지에는 Function(변환), Predicate(조건 검사), Supplier(값 공급), Consumer(값 소비), BiFunction(인자 2개 변환) 등이 준비되어 있고, Runnable도 함수형 인터페이스입니다. String::length처럼 이미 있는 메서드를 가리키는 메서드 참조로 더 간단히 쓸 수도 있습니다. 람다 안에서 사용하는 바깥 지역 변수는 final이거나 값이 바뀌지 않는(effectively final) 변수여야 하며, 값을 바꾸려 하면 컴파일 오류가 납니다.",
          code: `import java.util.function.BiFunction;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class Main {
    public static void main(String[] args) {
        Function<Integer, Integer> square = x -> x * x;
        BiFunction<Integer, Integer, Integer> add = (a, b) -> a + b;
        Predicate<String> isEmpty = s -> s.isEmpty();
        Supplier<String> hello = () -> "hello";
        Consumer<String> printer = s -> System.out.println("출력: " + s);
        Runnable r = () -> System.out.println("run");

        System.out.println(square.apply(5));   // 25
        System.out.println(add.apply(2, 3));   // 5
        System.out.println(isEmpty.test(""));  // true
        System.out.println(hello.get());       // hello
        printer.accept("람다");                // 출력: 람다
        r.run();                               // run

        Function<String, Integer> len = String::length;  // 메서드 참조
        System.out.println(len.apply("java")); // 4

        int base = 10;                         // 값이 바뀌지 않으므로 캡처 가능
        Function<Integer, Integer> addBase = x -> x + base;
        System.out.println(addBase.apply(5));  // 15
    }
}`
        },
        {
          title: "스트림 API",
          body: "스트림은 컬렉션의 데이터를 filter, map 같은 중간 연산과 collect, count, sum 같은 최종 연산의 파이프라인으로 선언적으로 처리하는 API입니다. 중간 연산은 지연 실행되어 최종 연산이 호출될 때 비로소 한꺼번에 수행되며, 원본 컬렉션은 변경되지 않습니다. 스트림은 한 번 소비하면 재사용할 수 없고 다시 쓰면 IllegalStateException이 발생합니다. 기본형 값을 합산할 때는 mapToInt 같은 기본형 스트림을 쓰면 박싱 비용 없이 sum 등을 쓸 수 있고, 최종 연산을 빼먹어 아무 일도 일어나지 않는 것이 흔한 실수입니다.",
          code: `import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Main {
    public static void main(String[] args) {
        List<Integer> nums = List.of(1, 2, 3, 4, 5, 6);

        List<Integer> result = nums.stream()
                .filter(n -> n % 2 == 0)     // 짝수만
                .map(n -> n * n)             // 제곱
                .collect(Collectors.toList());
        System.out.println(result);          // [4, 16, 36]

        int sum = nums.stream().mapToInt(Integer::intValue).sum();
        System.out.println(sum);             // 21

        long count = nums.stream().filter(n -> n > 3).count();
        System.out.println(count);           // 3

        String joined = Stream.of("a", "b", "c").collect(Collectors.joining(", "));
        System.out.println(joined);          // a, b, c
    }
}`
        },
        {
          title: "Optional",
          body: "Optional은 값이 있을 수도 없을 수도 있음을 타입으로 표현해, null 반환으로 인한 NullPointerException을 줄여 주는 컨테이너입니다. Optional.of는 null이면 예외를 던지므로 null일 수 있는 값은 Optional.ofNullable로 감싸고, 값이 없음은 Optional.empty()로 나타냅니다. map, orElse, ifPresent 같은 메서드로 값 유무를 분기 없이 처리하는 것이 권장되는 사용법입니다. 비어 있는지 확인하지 않고 get()을 호출하면 NoSuchElementException이 발생하며, 필드나 메서드 매개변수에 Optional을 쓰는 것은 일반적으로 권장되지 않고 주로 메서드의 반환 타입으로 사용합니다.",
          code: `import java.util.Optional;

public class Main {
    static Optional<String> findName(int id) {
        return id == 1 ? Optional.of("민수") : Optional.empty();
    }

    public static void main(String[] args) {
        Optional<String> a = findName(1);
        Optional<String> b = findName(2);

        System.out.println(a.get());                        // 민수
        System.out.println(b.orElse("알 수 없음"));          // 알 수 없음
        a.ifPresent(n -> System.out.println("찾음: " + n)); // 찾음: 민수
        System.out.println(a.map(String::length).orElse(0)); // 2
        System.out.println(b.map(String::length).orElse(0)); // 0
        System.out.println(b.isPresent());                  // false
    }
}`
        },
        {
          title: "record",
          body: "record(Java 16 정식 도입)는 값을 담는 불변 데이터 클래스를 한 줄로 선언하는 문법입니다. 선언한 구성요소마다 private final 필드와 접근자 메서드(x(), y())가 자동 생성되고, 생성자, equals, hashCode, toString도 자동으로 만들어집니다. 컴팩트 생성자에서 값을 검증할 수 있으며, 일반 메서드도 추가할 수 있습니다. record는 setter가 없는 불변 객체이고 다른 클래스를 상속할 수 없다는 점을 기억해야 하며, 필드를 나중에 바꿔야 하는 용도에는 맞지 않습니다.",
          code: `record Point(int x, int y) {
    Point {
        if (x < 0 || y < 0) {
            throw new IllegalArgumentException("음수 불가");
        }
    }

    double distanceFromOrigin() {
        return Math.sqrt(x * x + y * y);
    }
}

public class Main {
    public static void main(String[] args) {
        Point p = new Point(3, 4);

        System.out.println(p);                        // Point[x=3, y=4]
        System.out.println(p.x());                    // 3
        System.out.println(p.distanceFromOrigin());   // 5.0
        System.out.println(p.equals(new Point(3, 4))); // true (값 기반 비교)

        try {
            new Point(-1, 0);
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());       // 음수 불가
        }
    }
}`
        },
        {
          title: "동시성: 스레드와 Executor",
          body: "스레드는 프로그램 안에서 동시에 실행되는 흐름이며, 직접 만들기보다 스레드 풀을 관리해 주는 ExecutorService를 사용하는 것이 일반적입니다. 결과가 필요한 작업은 Callable로 submit하고 반환된 Future의 get()으로 결과를 받으며, get()은 작업이 끝날 때까지 기다립니다. 여러 스레드가 같은 변수를 동시에 수정하면 count++ 같은 연산이 원자적이지 않아 값이 유실되는 경쟁 상태가 생기므로 AtomicInteger나 synchronized로 보호해야 합니다. 작업을 다 제출한 뒤에는 shutdown()을 호출해야 하며, 호출하지 않으면 풀의 스레드가 남아 프로그램이 끝나지 않을 수 있습니다.",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(3);
        List<Future<Integer>> futures = new ArrayList<>();

        for (int i = 1; i <= 3; i++) {
            final int n = i;
            futures.add(pool.submit(() -> n * 10));   // Callable
        }
        for (Future<Integer> f : futures) {
            System.out.println(f.get());              // 10, 20, 30 (제출 순서대로 get)
        }
        pool.shutdown();

        AtomicInteger counter = new AtomicInteger();
        Runnable task = () -> {
            for (int k = 0; k < 1000; k++) {
                counter.incrementAndGet();            // 원자적 증가
            }
        };
        Thread t1 = new Thread(task);
        Thread t2 = new Thread(task);
        t1.start();
        t2.start();
        t1.join();
        t2.join();
        System.out.println(counter.get());            // 2000
    }
}`
        },
        {
          title: "메모리와 GC 개념",
          body: "JVM 메모리에서 지역 변수와 메서드 호출 정보는 스레드마다 있는 스택에, new로 만든 객체는 모든 스레드가 공유하는 힙에 저장됩니다. 가비지 컬렉션(GC)은 힙에서 더 이상 어떤 참조로도 도달할 수 없는 객체를 자동으로 회수해 주므로, C 언어처럼 직접 메모리를 해제할 필요가 없습니다. 대부분의 객체는 금방 버려진다는 가정 아래 힙을 젊은 영역과 오래된 영역으로 나누어 관리하는 방식이 일반적이며, 사용하는 GC 종류는 JVM 설정에 따라 다릅니다. GC가 있어도 static 컬렉션에 객체를 계속 쌓아 두면 참조가 남아 회수되지 않는 메모리 누수가 생길 수 있고, System.gc()는 실행을 보장하지 않는 힌트에 불과합니다.",
          code: `public class Main {
    static class Node {
        int value;
        Node next;

        Node(int value) {
            this.value = value;
        }
    }

    public static void main(String[] args) {
        int a = 10;                       // 기본형 지역 변수: 스택
        Node n1 = new Node(1);            // 객체는 힙, 참조 변수 n1은 스택
        Node n2 = n1;                     // 같은 객체를 가리키는 두 번째 참조

        n1 = null;                        // 참조 하나를 끊어도
        System.out.println(n2.value);     // 1  (n2로 여전히 도달 가능)

        n2 = null;                        // 이제 어떤 참조로도 도달 불가 -> GC 대상
        // 언제 회수될지는 JVM이 결정하며, 코드에서 정확한 시점을 알 수 없다

        Runtime rt = Runtime.getRuntime();
        System.out.println(rt.maxMemory() > 0);  // true
    }
}`
        }
      ],
      quiz: [
        {
          q: "다음 코드를 컴파일하면 어떻게 될까요?\n\nint count = 0;\nRunnable r = () -> count++;\nr.run();",
          choices: ["0이 출력된다", "1이 출력된다", "컴파일 오류가 난다", "런타임에 IllegalStateException이 발생한다"],
          answer: 2,
          why: "람다 안에서 사용하는 바깥 지역 변수는 final이거나 effectively final이어야 합니다. count++로 값을 바꾸므로 컴파일 오류가 납니다."
        },
        {
          q: "다음 코드의 결과로 맞는 것은?\n\nList.of(1, 2, 3, 4).stream()\n    .filter(n -> n % 2 == 1)\n    .map(n -> n * 10)\n    .collect(Collectors.toList());",
          choices: ["[10, 30]", "[20, 40]", "[10, 20, 30, 40]", "[1, 3]"],
          answer: 0,
          why: "filter가 홀수 1, 3만 남기고 map이 각각 10을 곱해 [10, 30]이 됩니다."
        },
        {
          q: "스트림에서 filter와 map만 호출하고 최종 연산(collect, count 등)을 호출하지 않으면 어떻게 될까요?",
          choices: ["filter와 map이 즉시 실행되어 결과가 만들어진다", "컴파일 오류가 난다", "빈 리스트가 반환된다", "최종 연산이 없으면 중간 연산은 실행되지 않는다"],
          answer: 3,
          why: "스트림의 중간 연산은 지연 실행되며 최종 연산이 호출될 때 비로소 수행됩니다."
        },
        {
          q: "다음 코드의 출력 결과는?\n\nOptional<String> o = Optional.empty();\nSystem.out.println(o.orElse(\"기본\"));",
          choices: ["null", "기본", "NoSuchElementException 발생", "빈 문자열"],
          answer: 1,
          why: "Optional이 비어 있으면 orElse가 전달된 기본값을 돌려주므로 기본이 출력됩니다."
        },
        {
          q: "값이 비어 있는 Optional에 get()을 호출하면 어떻게 될까요?",
          choices: ["NoSuchElementException이 발생한다", "null을 반환한다", "빈 문자열을 반환한다", "컴파일 오류가 난다"],
          answer: 0,
          why: "비어 있는 Optional의 get()은 NoSuchElementException을 던집니다. 그래서 orElse, ifPresent 같은 메서드를 쓰는 것이 권장됩니다."
        },
        {
          q: "다음 코드의 출력 결과는?\n\nrecord User(String name, int age) {}\n// main 안에서\nUser u = new User(\"민수\", 20);\nSystem.out.println(u);",
          choices: ["User(name=민수, age=20)", "User@해시코드 형태의 문자열", "name=민수, age=20", "User[name=민수, age=20]"],
          answer: 3,
          why: "record는 toString이 자동 생성되며 클래스이름[필드=값, ...] 형식으로 출력됩니다."
        },
        {
          q: "ExecutorService에 작업 제출을 마친 뒤, 새 작업은 받지 않고 이미 제출된 작업은 끝까지 수행하도록 종료하는 메서드는?",
          choices: ["stop()", "shutdown()", "terminate()", "finish()"],
          answer: 1,
          why: "shutdown()은 새 작업 제출을 막고 이미 제출된 작업을 마친 뒤 풀을 종료합니다. stop(), terminate(), finish()는 ExecutorService에 없는 메서드입니다."
        },
        {
          q: "JVM의 가비지 컬렉션(GC)이 회수하는 대상으로 가장 알맞은 것은?",
          choices: ["main 메서드 안의 모든 지역 변수", "static으로 참조되는 모든 객체", "더 이상 어떤 참조로도 도달할 수 없는 힙의 객체", "오랫동안 사용하지 않은 객체"],
          answer: 2,
          why: "GC는 도달 가능성을 기준으로 판단하여, 어떤 참조로도 접근할 수 없는 힙의 객체를 회수합니다. 사용한 지 오래되었는지는 기준이 아니며, static 참조로 연결된 객체는 도달 가능합니다."
        }
      ],
      practice: [
        {
          title: "record와 스트림으로 합계 구하기",
          task: "record Product(String name, int price)를 만들고 (\"펜\", 500), (\"노트\", 1500), (\"가방\", 30000) 세 개로 List.of를 구성하세요. 가격이 1000 이상인 상품의 가격 합계를 스트림으로 구해 출력하면 기대 출력은 한 줄, 31500 입니다.",
          hint: "filter로 조건을 걸고 mapToInt(Product::price)로 가격만 꺼낸 뒤 sum()을 호출하세요. record의 접근자는 price()입니다.",
          solution: `import java.util.List;

public class Main {
    record Product(String name, int price) {}

    public static void main(String[] args) {
        List<Product> items = List.of(
                new Product("펜", 500),
                new Product("노트", 1500),
                new Product("가방", 30000));

        int total = items.stream()
                .filter(p -> p.price() >= 1000)
                .mapToInt(Product::price)
                .sum();

        System.out.println(total);
    }
}`,
          explain: "filter가 가격 1000 이상인 노트와 가방만 남기고, mapToInt가 가격을 int 스트림으로 바꿔 1500 + 30000을 더합니다. record는 price() 접근자를 자동으로 제공합니다."
        },
        {
          title: "Optional로 안전하게 변환하기",
          task: "Map.of(\"a\", \"apple\", \"b\", \"banana\")에서 키로 값을 찾아 Optional<String>으로 돌려주는 find(String key) 메서드를 만드세요. find(\"a\")는 대문자로 바꿔 출력하고, find(\"z\")는 값이 없으면 \"없음\"을 출력합니다. 기대 출력은 두 줄, APPLE 과 없음 입니다.",
          hint: "Optional.ofNullable(map.get(key))로 감싸고, 호출하는 쪽에서 map(String::toUpperCase).orElse(\"없음\")을 사용하세요.",
          solution: `import java.util.Map;
import java.util.Optional;

public class Main {
    static Optional<String> find(String key) {
        Map<String, String> m = Map.of("a", "apple", "b", "banana");
        return Optional.ofNullable(m.get(key));
    }

    public static void main(String[] args) {
        System.out.println(find("a").map(String::toUpperCase).orElse("없음"));
        System.out.println(find("z").map(String::toUpperCase).orElse("없음"));
    }
}`,
          explain: "map.get은 키가 없으면 null을 돌려주므로 ofNullable로 감싸 빈 Optional을 만듭니다. 값이 있으면 map으로 대문자로 바뀌고, 비어 있으면 orElse의 기본값이 사용됩니다."
        },
        {
          title: "Executor로 제곱의 합 구하기",
          task: "스레드 2개짜리 ExecutorService에 1, 2, 3의 제곱을 각각 계산하는 Callable 작업 3개를 제출하세요. 반환된 Future들의 결과를 모두 더해 출력하면 기대 출력은 한 줄, 14 입니다.",
          hint: "람다에서 쓰는 반복 변수는 final int n = i; 처럼 복사해서 사용하세요. 결과는 future.get()으로 받고 마지막에 pool.shutdown()을 호출합니다.",
          solution: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        List<Future<Integer>> fs = new ArrayList<>();

        for (int i = 1; i <= 3; i++) {
            final int n = i;
            fs.add(pool.submit(() -> n * n));
        }

        int sum = 0;
        for (Future<Integer> f : fs) {
            sum += f.get();
        }
        pool.shutdown();

        System.out.println(sum);
    }
}`,
          explain: "각 작업이 1, 4, 9를 계산해 Future로 돌려주고, get()으로 결과를 받아 더하면 14가 됩니다. 반복 변수 i는 바뀌는 값이라 람다에서 쓸 수 없으므로 final 복사본 n을 사용하며, 작업이 끝나면 shutdown()으로 풀을 종료합니다."
        }
      ]
    }
  ]
});
