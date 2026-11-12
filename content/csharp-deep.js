(window.LANG_EXTRA = window.LANG_EXTRA || []).push({
  id: "csharp",
  levels: [
    {
      level: "입문",
      practice: [
        {
          title: "문자열 보간으로 소개 문장 만들기",
          task: "string 변수 name에 \"지수\", int 변수 age에 25를 저장하세요. 문자열 보간을 사용해 '지수님은 25살입니다.' 한 줄을 출력합니다.",
          hint: "문자열 앞에 $를 붙이고, 변수 이름을 중괄호 { } 로 감싸 보세요.",
          solution: `string name = "지수";
int age = 25;
Console.WriteLine($"{name}님은 {age}살입니다.");`,
          explain: "$ 를 붙인 문자열 안에서는 { } 안의 변수 값이 그대로 들어갑니다. + 로 이어 붙이는 것보다 읽기 쉽고 실수도 적습니다."
        },
        {
          title: "if / else로 합격 판정하기",
          task: "int 변수 score에 75를 저장합니다. score가 60 이상이면 '합격', 아니면 '불합격'을 출력하세요. 이 입력에서는 '합격'이 출력되어야 합니다.",
          hint: "비교 연산자 >= 를 조건에 쓰고, 거짓일 때는 else 블록을 사용합니다.",
          solution: `int score = 75;

if (score >= 60)
{
    Console.WriteLine("합격");
}
else
{
    Console.WriteLine("불합격");
}`,
          explain: "75 >= 60 은 true 이므로 if 블록이 실행되어 '합격'이 출력됩니다. score를 50으로 바꾸면 else 블록이 실행됩니다."
        },
        {
          title: "메서드로 1부터 n까지 더하기",
          task: "정수 n을 받아 1부터 n까지의 합을 돌려주는 static int Sum(int n) 메서드를 만드세요. Sum(5)를 호출해 '1부터 5까지의 합: 15'를 출력합니다.",
          hint: "메서드 안에서 합계를 담을 변수를 만들고, for 문으로 1부터 n까지 더한 뒤 return 합니다.",
          solution: `int result = Sum(5);
Console.WriteLine($"1부터 5까지의 합: {result}");

static int Sum(int n)
{
    int total = 0;
    for (int i = 1; i <= n; i++)
    {
        total += i;
    }
    return total;
}`,
          explain: "for 문이 i를 1부터 5까지 늘리며 total에 더하므로 1+2+3+4+5 = 15가 됩니다. 반환 자료형 int와 return이 짝을 이루어야 합니다."
        }
      ]
    },
    {
      level: "중급",
      intro: "이 단계에서는 클래스와 속성으로 데이터와 동작을 묶고, 인터페이스로 공통 약속을 정하는 방법을 배웁니다. 이어서 컬렉션, 제네릭, 예외 처리를 익혀 실제 프로그램에 가까운 코드를 작성할 수 있게 됩니다.",
      lessons: [
        {
          title: "클래스와 객체, 생성자",
          body: "클래스는 데이터(필드)와 동작(메서드)을 하나로 묶은 설계도이고, new 로 만든 결과물이 객체입니다. 생성자는 클래스와 이름이 같은 특별한 메서드로, 객체를 만들 때 초기값을 채우는 역할을 합니다. 최상위 문 방식에서는 클래스 선언을 실행 코드보다 아래(파일 끝 쪽)에 두어야 합니다. 흔한 실수는 생성자에 필요한 인자를 빼먹고 new Person() 처럼 호출하는 것으로, 이 경우 컴파일 오류가 납니다.",
          code: `var p = new Person("민수", 20);
p.Introduce();
Console.WriteLine(p.Name);

class Person
{
    public string Name;
    public int Age;

    public Person(string name, int age)
    {
        Name = name;
        Age = age;
    }

    public void Introduce()
    {
        Console.WriteLine($"저는 {Name}, {Age}살입니다.");
    }
}`
        },
        {
          title: "속성(Property)으로 안전하게 노출하기",
          body: "필드를 public 으로 열어 두면 어디서든 값을 마음대로 바꿀 수 있어 위험합니다. 속성은 { get; set; } 형태로 값을 읽고 쓰는 통로를 제공하며, set 앞에 private 을 붙이면 클래스 안에서만 값을 바꿀 수 있습니다. set 을 아예 쓰지 않으면 생성자에서만 값을 정할 수 있는 읽기 전용 속성이 됩니다. => 로 쓰는 식 본문 속성은 다른 값에서 계산되는 값을 보여 줄 때 편리합니다. 흔한 실수는 private set 인 속성에 바깥에서 값을 대입하려다 컴파일 오류를 만나는 것입니다.",
          code: `var acc = new Account("민수");
acc.Deposit(5000);
acc.Deposit(-100); // 잘못된 금액은 무시됨
Console.WriteLine($"{acc.Owner}: {acc.Balance}원");
Console.WriteLine(acc.IsEmpty);
// acc.Balance = 0; // 컴파일 오류: set 접근자가 private

class Account
{
    public string Owner { get; }
    public int Balance { get; private set; }
    public bool IsEmpty => Balance == 0;

    public Account(string owner)
    {
        Owner = owner;
    }

    public void Deposit(int amount)
    {
        if (amount <= 0) return;
        Balance += amount;
    }
}`
        },
        {
          title: "인터페이스로 공통 약속 정하기",
          body: "인터페이스는 '이런 멤버를 반드시 제공한다'는 약속만 적어 둔 형식이며, 관례상 이름 앞에 I 를 붙입니다. 클래스는 콜론(:) 뒤에 인터페이스를 적어 구현하고, 하나의 클래스가 여러 인터페이스를 함께 구현할 수도 있습니다. 서로 다른 클래스를 같은 인터페이스 형식으로 다루면, 호출하는 쪽은 구체적인 클래스를 몰라도 되어 코드가 유연해집니다. 인터페이스는 new 로 직접 만들 수 없고, 구현 클래스의 객체를 담는 변수 형식으로 사용합니다.",
          code: `IShape[] shapes = { new Rectangle(3, 4), new Circle(1) };

foreach (IShape shape in shapes)
{
    Console.WriteLine($"{shape.Name}: {shape.Area():F2}");
}

interface IShape
{
    string Name { get; }
    double Area();
}

class Rectangle : IShape
{
    private readonly double _width;
    private readonly double _height;

    public Rectangle(double width, double height)
    {
        _width = width;
        _height = height;
    }

    public string Name => "직사각형";
    public double Area() => _width * _height;
}

class Circle : IShape
{
    private readonly double _radius;

    public Circle(double radius)
    {
        _radius = radius;
    }

    public string Name => "원";
    public double Area() => Math.PI * _radius * _radius;
}`
        },
        {
          title: "컬렉션: List와 Dictionary",
          body: "배열은 크기가 고정이지만 List<T> 는 Add, Remove 로 요소를 자유롭게 늘리고 줄일 수 있습니다. Dictionary<TKey, TValue> 는 키로 값을 빠르게 찾는 자료구조이며, 같은 키는 하나만 존재합니다. 없는 키를 인덱서(d[키])로 읽으면 KeyNotFoundException 이 발생하므로, 있는지 확신할 수 없을 때는 TryGetValue 를 사용하세요. 또 List 를 foreach 로 순회하는 도중에 요소를 추가하거나 삭제하면 InvalidOperationException 이 나는 점도 흔한 실수입니다(Dictionary 도 순회 중 추가하면 마찬가지입니다). 컬렉션은 순회가 끝난 뒤에 수정하세요.",
          code: `var names = new List<string> { "민수", "지수" };
names.Add("철수");
names.Remove("지수");
Console.WriteLine(names.Count);
foreach (var n in names)
{
    Console.WriteLine(n);
}

var ages = new Dictionary<string, int>
{
    ["민수"] = 20,
    ["철수"] = 25
};
ages["영희"] = 22;

if (ages.TryGetValue("철수", out int age))
{
    Console.WriteLine($"철수: {age}");
}
Console.WriteLine(ages.ContainsKey("없음"));
Console.WriteLine(ages.Count);`
        },
        {
          title: "제네릭 기초",
          body: "제네릭은 형식을 T 같은 자리 표시자로 두고, 사용할 때 실제 형식을 정하는 기능입니다. List<int> 나 Dictionary<string, int> 도 모두 제네릭이며, 덕분에 형식 변환 없이 안전하게 값을 꺼낼 수 있고 잘못된 형식을 넣으면 컴파일 단계에서 막힙니다. where T : IComparable<T> 같은 제약을 걸면 T 가 어떤 능력을 가져야 하는지 컴파일러에게 알려 줄 수 있습니다. 제약 없이 T 에 대해 비교나 덧셈 같은 연산을 시도하면 컴파일 오류가 나는 것이 흔한 실수입니다.",
          code: `var number = new Box<int>(42);
Console.WriteLine(number.Value);

var text = new Box<string>("안녕");
Console.WriteLine(text.Value);

Console.WriteLine(Max(3, 9));
Console.WriteLine(Max("apple", "banana"));

static T Max<T>(T a, T b) where T : IComparable<T>
{
    return a.CompareTo(b) >= 0 ? a : b;
}

class Box<T>
{
    public T Value { get; }

    public Box(T value)
    {
        Value = value;
    }
}`
        },
        {
          title: "예외 처리: try / catch / finally",
          body: "예외는 프로그램 실행 중 발생하는 오류 상황으로, 처리하지 않으면 프로그램이 중단됩니다. 예외가 날 수 있는 코드를 try 에 넣고 catch 에서 원하는 예외 형식만 잡아 처리하며, finally 는 예외 발생 여부와 상관없이 항상 실행됩니다. catch 가 여러 개일 때는 구체적인 예외를 위에, 범위가 넓은 Exception 은 맨 아래에 둡니다. 직접 오류 상황을 알리고 싶다면 throw 로 예외를 던질 수 있습니다. 모든 예외를 빈 catch 로 삼켜 버리면 원인을 찾기 어려워지므로 피해야 합니다.",
          code: `Console.WriteLine(Parse("123"));
Console.WriteLine(Parse("abc"));

try
{
    int[] arr = new int[2];
    arr[5] = 1;
}
catch (IndexOutOfRangeException)
{
    Console.WriteLine("범위 오류");
}
finally
{
    Console.WriteLine("정리 작업");
}

try
{
    Withdraw(100, 500);
}
catch (InvalidOperationException ex)
{
    Console.WriteLine(ex.Message);
}

static int Parse(string text)
{
    try
    {
        return int.Parse(text);
    }
    catch (FormatException)
    {
        Console.WriteLine("숫자가 아닙니다.");
        return -1;
    }
}

static void Withdraw(int balance, int amount)
{
    if (amount > balance)
    {
        throw new InvalidOperationException("잔액이 부족합니다.");
    }
}`
        }
      ],
      quiz: [
        {
          q: "속성 public int Balance { get; private set; } 에 대한 설명으로 옳은 것은 무엇일까요?",
          choices: [
            "클래스 바깥에서 값을 읽을 수도, 바꿀 수도 있다",
            "클래스 바깥에서는 읽기만 가능하고, 값 변경은 클래스 내부에서만 가능하다",
            "클래스 내부에서도 값을 읽을 수 없다",
            "값을 읽는 것은 클래스 내부에서만 가능하다"
          ],
          answer: 1,
          why: "get 은 public 이라 어디서든 읽을 수 있고, set 은 private 이라 클래스 내부에서만 값을 바꿀 수 있습니다."
        },
        {
          q: `다음 코드를 컴파일하면 어떻게 될까요?

var a = new A();
a.X = 5;
Console.WriteLine(a.X);

class A
{
    public int X { get; private set; }
}`,
          choices: ["5가 출력된다", "0이 출력된다", "실행 중에 예외가 발생한다", "컴파일 오류가 발생한다"],
          answer: 3,
          why: "X 의 set 접근자가 private 이므로 클래스 바깥에서 a.X = 5 처럼 값을 대입하면 컴파일 단계에서 오류가 납니다."
        },
        {
          q: "인터페이스에 대한 설명으로 옳은 것은 무엇일까요?",
          choices: [
            "한 클래스가 여러 인터페이스를 구현할 수 있다",
            "new 연산자로 인터페이스의 객체를 직접 만들 수 있다",
            "한 클래스는 인터페이스를 하나만 구현할 수 있다",
            "인터페이스에는 반드시 필드(변수)를 선언해야 한다"
          ],
          answer: 0,
          why: "클래스는 콜론 뒤에 쉼표로 여러 인터페이스를 나열해 구현할 수 있습니다. 인터페이스는 직접 만들 수 없고 인스턴스 필드도 가질 수 없습니다."
        },
        {
          q: `다음 코드의 출력 결과는 무엇일까요?

var l = new List<int> { 1, 2, 3 };
l.Add(4);
l.Remove(1);
Console.WriteLine(l[0]);`,
          choices: ["1", "3", "2", "4"],
          answer: 2,
          why: "Add(4) 후 목록은 1, 2, 3, 4 이고, Remove(1) 이 값 1 을 지워 2, 3, 4 가 됩니다. 따라서 첫 번째 요소 l[0] 은 2 입니다."
        },
        {
          q: `다음 코드를 실행하면 어떻게 될까요?

var d = new Dictionary<string, int>();
d["a"] = 1;
Console.WriteLine(d["b"]);`,
          choices: ["0이 출력된다", "빈 줄이 출력된다", "KeyNotFoundException 이 발생한다", "null 이 출력된다"],
          answer: 2,
          why: "Dictionary 에 없는 키를 인덱서로 읽으면 KeyNotFoundException 이 발생합니다. 없을 수도 있다면 TryGetValue 를 사용합니다."
        },
        {
          q: `다음 코드를 컴파일하면 어떻게 될까요?

var numbers = new List<int>();
numbers.Add("abc");`,
          choices: [
            "컴파일 오류가 발생한다",
            "정상 실행되고 abc 가 추가된다",
            "실행 중에 예외가 발생한다",
            "0 이 추가된다"
          ],
          answer: 0,
          why: "List<int> 는 int 만 담을 수 있도록 형식이 고정된 제네릭이라, string 을 넣으려는 코드는 컴파일 단계에서 오류가 납니다."
        },
        {
          q: `다음 코드가 출력하는 결과는 무엇일까요?

try
{
    Console.Write("A");
    int.Parse("x");
    Console.Write("B");
}
catch (FormatException)
{
    Console.Write("C");
}
finally
{
    Console.Write("D");
}`,
          choices: ["ABCD", "ABD", "AD", "ACD"],
          answer: 3,
          why: "A 를 출력한 뒤 int.Parse(\"x\") 에서 FormatException 이 발생해 B 는 건너뛰고 catch 의 C 가 실행됩니다. finally 의 D 는 항상 실행되므로 ACD 입니다."
        },
        {
          q: "이름(string)으로 나이(int)를 빠르게 찾아야 할 때 가장 알맞은 컬렉션은 무엇일까요?",
          choices: ["List<int>", "Dictionary<string, int>", "int[]", "List<string>"],
          answer: 1,
          why: "이름을 키, 나이를 값으로 저장하는 Dictionary<string, int> 는 키로 값을 바로 찾을 수 있어 이런 용도에 알맞습니다."
        }
      ],
      practice: [
        {
          title: "Student 클래스와 읽기 전용 속성",
          task: "Name(string)과 Score(int) 읽기 전용 속성을 가진 Student 클래스를 만드세요. Score가 60 이상이면 true 를 돌려주는 식 본문 속성 IsPass 도 추가합니다. new Student(\"민수\", 75) 를 만들어 '민수 True' 를 출력하세요.",
          hint: "속성은 { get; } 로 선언하고 생성자에서 값을 채웁니다. IsPass 는 => Score >= 60 으로 씁니다.",
          solution: `var s = new Student("민수", 75);
Console.WriteLine($"{s.Name} {s.IsPass}");

class Student
{
    public string Name { get; }
    public int Score { get; }
    public bool IsPass => Score >= 60;

    public Student(string name, int score)
    {
        Name = name;
        Score = score;
    }
}`,
          explain: "읽기 전용 속성은 생성자에서만 값이 정해집니다. IsPass 는 저장된 값이 아니라 Score 로 계산되며, bool 값은 True 로 출력됩니다."
        },
        {
          title: "인터페이스를 구현한 두 클래스",
          task: "string Greet() 메서드를 가진 IGreeter 인터페이스를 만들고, 이를 구현하는 KoreanGreeter(\"안녕하세요\" 반환)와 EnglishGreeter(\"Hello\" 반환)를 작성하세요. 두 객체를 IGreeter 배열에 담아 foreach 로 Greet() 결과를 한 줄씩 출력합니다. 기대 결과는 '안녕하세요', 'Hello' 두 줄입니다.",
          hint: "배열 요소 형식을 IGreeter 로 선언하면 서로 다른 클래스를 함께 담을 수 있습니다.",
          solution: `IGreeter[] greeters = { new KoreanGreeter(), new EnglishGreeter() };
foreach (IGreeter g in greeters)
{
    Console.WriteLine(g.Greet());
}

interface IGreeter
{
    string Greet();
}

class KoreanGreeter : IGreeter
{
    public string Greet() => "안녕하세요";
}

class EnglishGreeter : IGreeter
{
    public string Greet() => "Hello";
}`,
          explain: "두 클래스가 같은 인터페이스를 구현하므로 IGreeter 형식으로 한꺼번에 다룰 수 있습니다. 호출 쪽은 구체적인 클래스를 몰라도 각 객체의 Greet 가 실행됩니다."
        },
        {
          title: "리스트와 예외 처리로 합계 구하기",
          task: "List<string> 에 \"10\", \"x\", \"30\" 을 담고 foreach 로 각 항목을 int.Parse 로 변환해 합계를 구하세요. 변환에 실패한 항목은 '건너뜀: x' 처럼 출력하고 넘어갑니다. 마지막에 '합계: 40' 을 출력합니다.",
          hint: "int.Parse 호출을 try 안에 넣고, 변환 실패 시 발생하는 FormatException 을 catch 로 잡으세요.",
          solution: `var items = new List<string> { "10", "x", "30" };
int sum = 0;

foreach (string item in items)
{
    try
    {
        sum += int.Parse(item);
    }
    catch (FormatException)
    {
        Console.WriteLine($"건너뜀: {item}");
    }
}

Console.WriteLine($"합계: {sum}");`,
          explain: "\"x\" 는 숫자가 아니므로 int.Parse 가 FormatException 을 던지고, catch 가 이를 처리해 반복이 계속됩니다. 10 과 30 만 더해져 합계는 40 입니다."
        }
      ]
    },
    {
      level: "고급",
      intro: "이 단계에서는 델리게이트와 이벤트, LINQ 로 동작을 값처럼 다루고 데이터를 선언적으로 처리하는 방법을 배웁니다. 또 async/await 비동기 코드, record, null 허용 참조 형식을 익혀 현대적인 C# 코드를 읽고 쓸 수 있게 됩니다.",
      lessons: [
        {
          title: "델리게이트와 람다식",
          body: "델리게이트는 메서드를 값처럼 변수에 담고 다른 메서드에 넘길 수 있게 해 주는 형식입니다. 실무에서는 직접 정의하기보다 값을 돌려주지 않는 Action<...> 과 값을 돌려주는 Func<..., 반환형> 을 주로 사용합니다. x => x * 2 처럼 쓰는 람다식은 이름 없는 메서드를 간단히 만드는 문법입니다. Func 의 마지막 형식 인자가 반환 형식이라는 점을 헷갈려 인자 순서를 잘못 쓰는 것이 흔한 실수입니다.",
          code: `Func<int, int, int> add = (a, b) => a + b;
Action<string> greet = name => Console.WriteLine($"안녕, {name}!");

Console.WriteLine(add(2, 3));
greet("민수");

Console.WriteLine(Apply(4, x => x * x));
Console.WriteLine(Apply(4, x => x + 100));

static int Apply(int value, Func<int, int> op)
{
    return op(value);
}`
        },
        {
          title: "이벤트",
          body: "이벤트는 어떤 일이 일어났음을 구독자들에게 알리는 구조로, 내부적으로 델리게이트를 사용합니다. event 키워드로 선언하면 클래스 바깥에서는 += 로 핸들러를 등록하고 -= 로 해제하는 것만 가능하고, 직접 호출하거나 = 로 덮어쓸 수 없습니다. 알리는 쪽에서는 구독자가 없을 때를 대비해 ?.Invoke(...) 로 호출하는 것이 안전합니다. 구독한 뒤 해제하지 않으면 객체가 메모리에 계속 남을 수 있다는 점도 주의해야 합니다. 아래 예제의 Action<string>? 표기는 null 일 수 있음을 뜻하며, 마지막 레슨에서 자세히 다룹니다.",
          code: `var button = new Button();
button.Clicked += msg => Console.WriteLine($"핸들러1: {msg}");
button.Clicked += msg => Console.WriteLine($"핸들러2: {msg}");

button.Click();

class Button
{
    public event Action<string>? Clicked;

    public void Click()
    {
        Clicked?.Invoke("클릭됨");
    }
}`
        },
        {
          title: "LINQ로 데이터 다루기",
          body: "LINQ 는 컬렉션을 Where(걸러내기), Select(변환), OrderBy(정렬), Sum, Any, Count 같은 메서드로 선언적으로 처리하는 기능이며, 람다식을 인자로 받습니다. Where 나 Select 같은 쿼리는 지연 실행되어, 결과를 실제로 순회하거나 ToList() 같은 메서드를 호출할 때 비로소 계산됩니다. 그래서 쿼리를 만든 뒤 원본 컬렉션이 바뀌면 그 변경이 결과에 반영됩니다. 같은 쿼리를 여러 번 순회하면 매번 다시 계산된다는 점이 흔한 함정이므로, 결과를 재사용하려면 ToList() 로 확정해 두세요.",
          code: `int[] numbers = { 5, 2, 8, 1, 9, 4 };

var result = numbers.Where(n => n > 3).OrderBy(n => n).Select(n => n * 10);
Console.WriteLine(string.Join(", ", result));
Console.WriteLine(numbers.Sum());
Console.WriteLine(numbers.Any(n => n > 8));
Console.WriteLine(numbers.Count(n => n > 4));

// 지연 실행: 쿼리를 만든 뒤 원본이 바뀌면 결과에 반영된다
var list = new List<int> { 1, 2, 3 };
var query = list.Where(n => n > 1);
list.Add(4);
Console.WriteLine(string.Join(",", query.ToList()));`
        },
        {
          title: "async / await 비동기 프로그래밍",
          body: "async 메서드는 오래 걸리는 작업(파일, 네트워크, 대기 등)을 기다리는 동안 스레드를 붙잡아 두지 않고 다른 일을 할 수 있게 합니다. 반환 형식은 값이 없으면 Task, 값이 있으면 Task<T> 를 쓰고, await 로 작업이 끝나길 기다린 뒤 결과를 받아 이어서 실행합니다. 여러 작업을 동시에 시작하고 모두 끝나길 기다릴 때는 Task.WhenAll 을 사용합니다. await 를 빼먹으면 작업이 끝나기 전에 다음 줄이 실행되고, 이벤트 핸들러 외에는 async void 를 피해야 하며, .Result 나 .Wait() 로 막고 기다리면 교착 상태가 생길 수 있다는 점이 흔한 실수입니다.",
          code: `Console.WriteLine("시작");

string text = await LoadAsync();
Console.WriteLine(text);

int[] values = await Task.WhenAll(ComputeAsync(1), ComputeAsync(2));
Console.WriteLine(string.Join(",", values));

static async Task<string> LoadAsync()
{
    await Task.Delay(100);
    return "데이터 로드 완료";
}

static async Task<int> ComputeAsync(int x)
{
    await Task.Delay(50);
    return x * 10;
}`
        },
        {
          title: "record로 불변 데이터 표현하기",
          body: "record 는 값을 담는 데이터 형식을 짧게 선언하게 해 주는 기능으로, record Person(string Name, int Age); 한 줄이면 속성, 생성자, 분해 기능이 만들어집니다. 일반 클래스와 달리 == 비교가 참조가 아니라 모든 속성 값이 같은지를 비교하고, ToString 도 내용을 보기 좋게 출력해 줍니다. 위치 지정 방식으로 선언한 속성은 init 전용이라 만든 뒤에는 바꿀 수 없고, 일부만 다른 새 객체가 필요하면 with 식으로 복사본을 만듭니다. 클래스처럼 값이 바뀌리라 기대하고 p.Age = 21 같은 대입을 시도하면 컴파일 오류가 나는 것이 흔한 실수입니다.",
          code: `var p1 = new Person("민수", 20);
var p2 = new Person("민수", 20);

Console.WriteLine(p1 == p2);
Console.WriteLine(p1);

var p3 = p1 with { Age = 21 };
Console.WriteLine(p3);
Console.WriteLine(p1.Age);

var (name, age) = p1;
Console.WriteLine($"{name}, {age}");

record Person(string Name, int Age);`
        },
        {
          title: "null 허용 참조 형식",
          body: "null 허용 컨텍스트를 켜면(최신 .NET 프로젝트 템플릿의 기본값) string 은 null 이 아니어야 하는 형식이고, null 이 될 수 있는 값은 string? 처럼 물음표를 붙여 표시합니다. string 변수에 null 을 넣거나 string? 값을 검사 없이 .Length 로 쓰면 컴파일러가 경고(warning)를 내 NullReferenceException 을 미리 예방하게 도와줍니다. 안전하게 쓰는 도구로는 null 이 아닐 때만 접근하는 ?. 연산자, 기본값을 정하는 ?? 연산자, is not null 검사가 있습니다. 변수 뒤에 ! 를 붙여 경고를 끄는 방법도 있지만, 실제로 null 이 올 수 있다면 예외가 되살아나므로 확신이 있을 때만 쓰세요.",
          code: `string name = "민수";
Console.WriteLine(name.Length);

string? nick = FindNickname("철수");
Console.WriteLine(nick?.Length ?? -1);
Console.WriteLine(nick ?? "별명 없음");

string? found = FindNickname("민수");
if (found is not null)
{
    Console.WriteLine(found.Length);
}

static string? FindNickname(string who)
{
    return who == "민수" ? "민이" : null;
}`
        }
      ],
      quiz: [
        {
          q: `다음 코드의 출력 결과는 무엇일까요?

Func<int, int> f = x => x * 2;
Console.WriteLine(f(f(3)));`,
          choices: ["6", "9", "12", "18"],
          answer: 2,
          why: "f(3) 은 6 이고, 그 결과를 다시 f 에 넣으면 f(6) = 12 입니다."
        },
        {
          q: "event 키워드로 선언된 이벤트를 클래스 바깥에서 다룰 때 할 수 있는 일은 무엇일까요?",
          choices: [
            "+= 와 -= 로 핸들러를 등록하거나 해제할 수 있다",
            "Invoke 를 호출해 이벤트를 직접 발생시킬 수 있다",
            "= 로 등록된 핸들러 전체를 새 핸들러로 덮어쓸 수 있다",
            "이벤트에 등록된 모든 핸들러를 임의로 비울 수 있다"
          ],
          answer: 0,
          why: "event 로 선언하면 바깥에서는 += 와 -= 만 허용되고, 이벤트를 발생시키는 일은 선언한 클래스 내부에서만 할 수 있습니다."
        },
        {
          q: `다음 코드의 출력 결과는 무엇일까요?

var list = new List<int> { 1, 2, 3 };
var q = list.Where(n => n > 1);
list.Add(4);
Console.WriteLine(q.Count());`,
          choices: ["1", "2", "4", "3"],
          answer: 3,
          why: "Where 는 지연 실행되므로 Count() 를 호출하는 시점에 계산됩니다. 그때 목록은 1, 2, 3, 4 이고 1 보다 큰 값은 2, 3, 4 세 개입니다."
        },
        {
          q: "async 메서드 안에서 await 를 사용하는 것에 대한 설명으로 옳은 것은 무엇일까요?",
          choices: [
            "await 는 항상 새 스레드를 만들어 작업을 실행한다",
            "작업이 끝날 때까지 스레드를 막지 않고 기다렸다가, 끝나면 이어서 실행한다",
            "async 가 붙지 않은 일반 메서드에서도 항상 await 를 쓸 수 있다",
            "기다리는 작업에서 발생한 예외는 항상 무시된다"
          ],
          answer: 1,
          why: "await 는 스레드를 블로킹하지 않고 작업 완료를 기다린 뒤 다음 코드를 이어서 실행합니다. 새 스레드를 반드시 만드는 것은 아니며, 작업의 예외는 await 하는 곳에서 다시 던져집니다."
        },
        {
          q: `다음 코드의 출력 결과는 무엇일까요?

var a = new P("가", 1);
var b = new P("가", 1);
Console.WriteLine(a == b);

record P(string N, int V);`,
          choices: ["False", "True", "컴파일 오류", "런타임 예외"],
          answer: 1,
          why: "record 는 == 비교 시 참조가 아니라 모든 속성 값이 같은지를 비교합니다. 두 객체의 값이 같으므로 True 가 출력됩니다."
        },
        {
          q: `다음 코드의 출력 결과는 무엇일까요?

var a = new P("가", 1);
var b = a with { V = 2 };
Console.WriteLine($"{a.V},{b.V}");

record P(string N, int V);`,
          choices: [
            "2,2",
            "1,1",
            "record 속성은 바꿀 수 없으므로 컴파일 오류가 난다",
            "1,2"
          ],
          answer: 3,
          why: "with 식은 원본을 바꾸지 않고 일부 값만 다른 복사본을 만듭니다. 그래서 a.V 는 그대로 1이고 b.V 는 2가 됩니다."
        },
        {
          q: `다음 코드에서 마지막 줄의 출력 결과는 무엇일까요?

string? s = null;
Console.WriteLine(s?.Length ?? 0);`,
          choices: ["0", "빈 줄(null)", "NullReferenceException 발생", "컴파일 오류"],
          answer: 0,
          why: "s 가 null 이면 s?.Length 는 예외 없이 null 이 되고, ?? 0 이 그 null 을 0 으로 바꿔 줍니다."
        },
        {
          q: "null 허용 컨텍스트가 켜진 기본 설정에서, string 형(물음표 없음) 변수에 null 을 대입하면 어떻게 될까요?",
          choices: [
            "컴파일 오류로 빌드가 실패한다",
            "아무 경고도 나오지 않는다",
            "컴파일러가 경고(warning)를 표시한다",
            "대입하는 순간 런타임 예외가 발생한다"
          ],
          answer: 2,
          why: "null 허용 참조 형식은 기본적으로 오류가 아니라 경고로 알려 줍니다. 코드는 빌드되지만 경고를 무시하면 나중에 NullReferenceException 이 날 수 있습니다."
        }
      ],
      practice: [
        {
          title: "LINQ로 걸러내고 변환하기",
          task: "int[] numbers = { 3, 8, 12, 5, 20 } 에서 10보다 큰 수만 골라 각각 2배로 만드세요. string.Join(\", \", ...) 으로 합쳐 '24, 40' 을 출력합니다.",
          hint: "Where 로 조건에 맞는 값을 거르고, Select 로 값을 변환합니다.",
          solution: `int[] numbers = { 3, 8, 12, 5, 20 };

var result = numbers.Where(n => n > 10).Select(n => n * 2);
Console.WriteLine(string.Join(", ", result));`,
          explain: "Where 가 12 와 20 만 남기고, Select 가 각각 24 와 40 으로 바꿉니다. string.Join 이 순회하면서 쿼리가 실제로 실행됩니다."
        },
        {
          title: "이벤트로 값 변화 알리기",
          task: "정수 값을 가진 Counter 클래스를 만들고, 값이 바뀔 때마다 새 값을 알리는 event Action<int>? Changed 를 선언하세요. Increase() 를 호출하면 값이 1 증가하고 이벤트가 발생합니다. 구독 핸들러가 '값: 번호' 를 출력하게 하고 Increase() 를 두 번 호출해 '값: 1', '값: 2' 두 줄을 출력하세요.",
          hint: "Increase 안에서 값을 1 늘린 뒤 Changed?.Invoke(value) 로 이벤트를 발생시킵니다. 바깥에서는 += 로 핸들러를 등록합니다.",
          solution: `var counter = new Counter();
counter.Changed += v => Console.WriteLine($"값: {v}");

counter.Increase();
counter.Increase();

class Counter
{
    private int _value;
    public event Action<int>? Changed;

    public void Increase()
    {
        _value++;
        Changed?.Invoke(_value);
    }
}`,
          explain: "Increase 가 호출될 때마다 값을 올리고 등록된 핸들러에 새 값을 전달합니다. 첫 호출은 1, 두 번째 호출은 2 를 출력합니다."
        },
        {
          title: "async 메서드로 값 계산하기",
          task: "정수를 받아 50밀리초 기다린 뒤 그 값의 2배를 돌려주는 static async Task<int> DoubleAsync(int x) 메서드를 만드세요. 최상위 문에서 await DoubleAsync(21) 의 결과를 받아 '결과: 42' 를 출력합니다.",
          hint: "메서드 안에서 await Task.Delay(50) 으로 기다린 다음 return x * 2 를 합니다. 호출하는 쪽에서도 await 를 붙입니다.",
          solution: `int result = await DoubleAsync(21);
Console.WriteLine($"결과: {result}");

static async Task<int> DoubleAsync(int x)
{
    await Task.Delay(50);
    return x * 2;
}`,
          explain: "async Task<int> 메서드는 int 값을 return 하면 Task<int> 로 감싸져 돌아가고, await 가 이를 풀어 int 로 받습니다. 21 의 2배인 42 가 출력됩니다."
        }
      ]
    }
  ]
});
