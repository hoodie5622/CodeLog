(window.LANG_EXTRA = window.LANG_EXTRA || []).push({
  id: "c",
  levels: [
    {
      level: "입문",
      practice: [
        {
          title: "두 수의 합과 곱",
          task: `정수 변수 a = 7, b = 3을 만들고 합과 곱을 각각 한 줄씩 출력하세요. 기대 출력은 첫 줄 "합: 10", 둘째 줄 "곱: 21"입니다.`,
          hint: `int 변수 두 개를 선언하고 printf의 %d 서식 지정자를 사용하세요. 줄바꿈은 \\n으로 합니다.`,
          solution: `#include <stdio.h>

int main(void) {
    int a = 7;
    int b = 3;
    printf("합: %d\\n", a + b);
    printf("곱: %d\\n", a * b);
    return 0;
}`,
          explain: `printf 안에서 a + b와 a * b를 바로 계산해 %d 자리에 넣을 수 있습니다. 변수에는 자료형(int)을 먼저 적어야 한다는 점을 연습하는 문제입니다.`
        },
        {
          title: "1부터 10까지 짝수의 합",
          task: `for 문을 사용해 1부터 10까지의 정수 중 짝수만 더한 합을 구해 출력하세요. 기대 출력은 "30"입니다 (2 + 4 + 6 + 8 + 10).`,
          hint: `어떤 수가 짝수인지는 i % 2 == 0으로 검사할 수 있습니다. if 문과 for 문을 함께 쓰세요.`,
          solution: `#include <stdio.h>

int main(void) {
    int sum = 0;
    for (int i = 1; i <= 10; i++) {
        if (i % 2 == 0) {
            sum = sum + i;
        }
    }
    printf("%d\\n", sum);
    return 0;
}`,
          explain: `% 연산자는 나머지를 구하므로 i % 2가 0이면 짝수입니다. 짝수일 때만 sum에 더하면 2 + 4 + 6 + 8 + 10 = 30이 됩니다.`
        },
        {
          title: "큰 수를 돌려주는 함수",
          task: `int max2(int a, int b) 함수를 만들어 두 정수 중 더 큰 값을 돌려주게 하세요. main에서 max2(8, 15)를 호출한 결과를 출력하면 "15"가 나와야 합니다.`,
          hint: `함수 안에서 if (a > b) 로 비교하고 return으로 큰 값을 돌려주세요. 함수는 main보다 앞에 정의합니다.`,
          solution: `#include <stdio.h>

int max2(int a, int b) {
    if (a > b) {
        return a;
    }
    return b;
}

int main(void) {
    printf("%d\\n", max2(8, 15));
    return 0;
}`,
          explain: `a가 b보다 크면 a를, 아니면 b를 돌려줍니다. 8은 15보다 크지 않으므로 b인 15가 반환되어 출력됩니다.`
        }
      ]
    },
    {
      level: "중급",
      intro: "중급에서는 C의 핵심인 포인터를 시작으로 배열, 문자열, 구조체를 다루고, 여러 파일로 프로그램을 나누는 법과 동적 메모리 할당까지 배웁니다. 메모리가 실제로 어떻게 쓰이는지 이해하는 것이 목표입니다.",
      lessons: [
        {
          title: "포인터 기초: 주소와 역참조",
          body: `포인터는 값이 아니라 다른 변수의 메모리 주소를 담는 변수입니다. &x는 x의 주소를 구하는 연산이고, int *p는 int 변수를 가리키는 포인터를 선언하며, *p는 그 주소에 있는 값을 읽거나 쓰는 역참조입니다. 포인터를 쓰면 변수를 복사하지 않고 원본을 직접 다룰 수 있어서 함수, 배열, 동적 메모리에서 꼭 필요합니다. 흔한 실수는 아무 값도 가리키지 않는 초기화되지 않은 포인터를 역참조하는 것이므로, 가리킬 대상이 없으면 NULL로 초기화해 두세요.`,
          code: `#include <stdio.h>

int main(void) {
    int x = 10;
    int *p = &x;   /* p는 x의 주소를 담는다 */

    printf("x = %d\\n", x);
    printf("*p = %d\\n", *p);

    *p = 20;       /* p를 통해 x를 바꾼다 */
    printf("x = %d\\n", x);
    return 0;
}`
        },
        {
          title: "포인터와 함수: 값 전달 vs 주소 전달",
          body: `C에서 함수 인자는 항상 값이 복사되어 전달됩니다. 그래서 void swap(int a, int b)처럼 만들면 복사본만 바뀌고 호출한 쪽의 변수는 그대로입니다. 원본을 바꾸고 싶다면 변수의 주소를 &x처럼 넘기고, 함수에서는 int *a로 받아 *a로 접근합니다. 이 방식은 값을 여러 개 돌려주거나 큰 데이터를 복사 없이 넘길 때도 쓰입니다. 흔한 실수는 호출할 때 &를 빼먹거나, 함수 안에서 *를 빼고 포인터 자체를 바꿔 버리는 것입니다.`,
          code: `#include <stdio.h>

void swap(int *a, int *b) {
    int tmp = *a;
    *a = *b;
    *b = tmp;
}

int main(void) {
    int x = 3, y = 7;
    swap(&x, &y);
    printf("x=%d, y=%d\\n", x, y);   /* x=7, y=3 */
    return 0;
}`
        },
        {
          title: "배열과 문자열",
          body: `배열은 같은 자료형의 값을 메모리에 연속으로 나란히 저장하며, 인덱스는 0부터 시작합니다. C의 문자열은 별도 자료형이 아니라 char 배열이고, 끝에 널 문자 '\\0'이 자동으로 붙어서 끝을 표시합니다. 그래서 "Hello"는 글자 5개지만 배열 크기는 6이 되며, strlen은 널 문자를 뺀 길이를 돌려줍니다. 문자열을 비교할 때는 ==가 아니라 strcmp를, 복사할 때는 = 가 아니라 strcpy를 써야 하고, 복사 대상 배열이 충분히 커야 합니다. 배열 범위를 벗어나 읽거나 쓰는 것은 흔하지만 위험한 실수입니다.`,
          code: `#include <stdio.h>
#include <string.h>

int main(void) {
    int nums[5] = {10, 20, 30, 40, 50};
    int sum = 0;
    for (int i = 0; i < 5; i++) {
        sum += nums[i];
    }
    printf("합계: %d\\n", sum);

    char word[] = "Hello";
    printf("길이: %zu, 크기: %zu\\n", strlen(word), sizeof(word));

    char copy[16];
    strcpy(copy, word);
    printf("복사: %s\\n", copy);
    printf("같은가: %d\\n", strcmp(word, copy) == 0);
    return 0;
}`
        },
        {
          title: "구조체: 관련 데이터 묶기",
          body: `구조체(struct)는 서로 다른 자료형의 변수들을 하나의 이름 아래 묶어 새로운 자료형처럼 쓰게 해 줍니다. 학생의 이름과 점수처럼 함께 움직이는 데이터를 한 덩어리로 다룰 수 있어 코드가 읽기 쉬워집니다. 멤버는 변수에서는 점(.)으로, 포인터에서는 화살표(->)로 접근하며, p->score는 (*p).score와 같은 뜻입니다. 구조체를 함수에 그대로 넘기면 통째로 복사되므로, 크거나 수정이 필요하면 포인터로 넘기세요(읽기만 한다면 const를 붙입니다). typedef를 쓰면 매번 struct를 쓰지 않아도 됩니다.`,
          code: `#include <stdio.h>

typedef struct {
    char name[20];
    int score;
} Student;

void print_student(const Student *s) {
    printf("%s: %d점\\n", s->name, s->score);
}

int main(void) {
    Student a = {"Kim", 90};
    Student *p = &a;
    p->score = 95;
    print_student(&a);

    Student b = a;      /* 구조체 대입은 멤버를 모두 복사한다 */
    b.score = 70;
    printf("%d %d\\n", a.score, b.score);   /* 95 70 */
    return 0;
}`
        },
        {
          title: "함수와 헤더: 여러 파일로 나누기",
          body: `프로그램이 커지면 코드를 여러 .c 파일로 나누고, 함수의 선언(원형)만 담은 헤더(.h) 파일을 만들어 공유합니다. 다른 파일에서 #include "mathutil.h"로 선언을 가져오면 컴파일러는 함수를 호출할 수 있고, 실제 정의는 링커가 다른 .c 파일에서 찾아 연결합니다. 헤더에는 같은 헤더가 여러 번 포함되어 생기는 중복 정의 오류를 막기 위해 #ifndef / #define / #endif로 된 인클루드 가드를 씁니다. 흔한 실수는 헤더에 함수 정의를 넣어 여러 파일에서 중복 정의 오류가 나게 하거나, .c 파일을 컴파일 명령에서 빼먹어 링크 오류가 나는 것입니다.`,
          code: `/* ---- mathutil.h ---- */
#ifndef MATHUTIL_H
#define MATHUTIL_H

int square(int n);

#endif

/* ---- mathutil.c ---- */
#include "mathutil.h"

int square(int n) {
    return n * n;
}

/* ---- main.c ---- */
#include <stdio.h>
#include "mathutil.h"

int main(void) {
    printf("%d\\n", square(7));   /* 49 */
    return 0;
}

/* 빌드: gcc main.c mathutil.c -o app */`
        },
        {
          title: "동적 할당: malloc과 free",
          body: `지역 변수와 배열은 크기가 컴파일할 때 정해지지만, malloc으로 힙(heap) 메모리를 실행 중에 원하는 크기만큼 빌릴 수 있습니다. malloc은 <stdlib.h>에 있으며 실패하면 NULL을 돌려주므로 사용 전에 반드시 검사해야 합니다. 다 쓴 메모리는 free로 돌려주어야 하고, 돌려준 뒤에는 그 포인터를 쓰면 안 되므로 NULL로 바꿔 두면 안전합니다. malloc은 값을 초기화하지 않으며, 0으로 초기화하려면 calloc을, 크기를 바꾸려면 realloc을 씁니다. 흔한 실수는 free를 잊어버리는 것(메모리 누수), 같은 메모리를 두 번 free하는 것, 할당한 크기보다 많이 쓰는 것입니다.`,
          code: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 5;
    int *arr = malloc(n * sizeof *arr);
    if (arr == NULL) {
        printf("메모리 할당 실패\\n");
        return 1;
    }

    int sum = 0;
    for (int i = 0; i < n; i++) {
        arr[i] = (i + 1) * 10;
        sum += arr[i];
    }
    printf("합계: %d\\n", sum);   /* 150 */

    free(arr);
    arr = NULL;
    return 0;
}`
        }
      ],
      quiz: [
        {
          q: `다음 코드를 실행하면 출력되는 값은 무엇일까요?\n\n#include <stdio.h>\nint main(void) {\n    int x = 5;\n    int *p = &x;\n    *p = 9;\n    printf("%d\\n", x);\n    return 0;\n}`,
          choices: ["9", "5", "x의 주소값", "컴파일 오류"],
          answer: 0,
          why: `p는 x의 주소를 가리키므로 *p = 9는 x 자체를 9로 바꿉니다. 따라서 x를 출력하면 9입니다.`
        },
        {
          q: `void swap(int a, int b)처럼 값으로 받는 함수를 만들고 swap(x, y)로 호출하면 x와 y가 바뀌지 않습니다. 그 이유는 무엇일까요?`,
          choices: ["함수의 결과 자료형이 void여서", "변수 이름이 서로 달라서", "int는 수정할 수 없는 자료형이어서", "인자는 값이 복사되어 전달되어서"],
          answer: 3,
          why: `C는 인자를 값으로 복사해 전달하므로 함수 안에서 바꾸는 것은 복사본입니다. 원본을 바꾸려면 주소를 넘기고 포인터로 받아야 합니다.`
        },
        {
          q: `다음 코드의 출력은 무엇일까요?\n\n#include <stdio.h>\n#include <string.h>\nint main(void) {\n    char s[] = "Hello";\n    printf("%zu %zu\\n", strlen(s), sizeof(s));\n    return 0;\n}`,
          choices: ["5 5", "5 6", "6 6", "6 5"],
          answer: 1,
          why: `strlen은 널 문자를 제외한 글자 수인 5를 돌려주고, sizeof(s)는 끝의 널 문자까지 포함한 배열 크기 6을 돌려줍니다.`
        },
        {
          q: `Student *ps = &s; 일 때, 구조체 멤버 score에 접근하는 올바른 식은 무엇일까요?`,
          choices: ["ps.score", "*ps->score", "ps->score", "ps::score"],
          answer: 2,
          why: `구조체 포인터로 멤버에 접근할 때는 화살표(->)를 씁니다. ps->score는 (*ps).score와 같은 뜻입니다.`
        },
        {
          q: `다음 코드가 출력하는 값은 무엇일까요?\n\n#include <stdio.h>\nint main(void) {\n    int a[4] = {5, 6, 7, 8};\n    printf("%d\\n", a[1] + a[2]);\n    return 0;\n}`,
          choices: ["13", "11", "12", "14"],
          answer: 0,
          why: `인덱스는 0부터 시작하므로 a[1]은 6, a[2]는 7이고 합은 13입니다.`
        },
        {
          q: `헤더 파일에 #ifndef / #define / #endif로 된 인클루드 가드를 쓰는 주된 이유는 무엇일까요?`,
          choices: ["컴파일 속도를 높이기 위해", "함수 이름을 짧게 만들기 위해", "실행 파일의 크기를 줄이기 위해", "같은 헤더가 중복 포함되어 생기는 재정의 오류를 막기 위해"],
          answer: 3,
          why: `한 파일이 같은 헤더를 여러 경로로 포함하면 같은 선언이 반복되어 오류가 날 수 있습니다. 인클루드 가드는 두 번째 포함부터 내용을 건너뛰게 합니다.`
        },
        {
          q: `malloc으로 빌린 메모리를 다 쓴 뒤 돌려줄 때 사용하는 함수는 무엇일까요?`,
          choices: ["delete(p);", "close(p);", "free(p);", "remove(p);"],
          answer: 2,
          why: `malloc, calloc, realloc으로 할당한 메모리는 free로 해제합니다. delete는 C++의 연산자이며 C에는 없습니다.`
        },
        {
          q: `malloc이 메모리를 할당하지 못했을 때 돌려주는 값은 무엇일까요?`,
          choices: ["0이 아닌 임의의 값", "NULL", "-1", "프로그램이 즉시 종료되어 아무것도 돌려주지 않는다"],
          answer: 1,
          why: `malloc은 실패하면 NULL을 돌려줍니다. 그래서 할당 직후에 NULL인지 검사해야 안전합니다.`
        }
      ],
      practice: [
        {
          title: "포인터로 값을 두 배로",
          task: `void double_it(int *p) 함수를 만들어 포인터가 가리키는 값을 두 배로 만드세요. main에서 int x = 21; 로 호출한 뒤 x를 출력하면 "42"가 나와야 합니다.`,
          hint: `함수에는 &x로 주소를 넘기고, 함수 안에서는 *p *= 2; 처럼 역참조해서 바꿉니다.`,
          solution: `#include <stdio.h>

void double_it(int *p) {
    *p = *p * 2;
}

int main(void) {
    int x = 21;
    double_it(&x);
    printf("%d\\n", x);
    return 0;
}`,
          explain: `주소를 넘겼기 때문에 함수 안의 *p는 main의 x와 같은 메모리입니다. 그래서 *p를 두 배로 바꾸면 x가 42가 됩니다.`
        },
        {
          title: "문자열 속 모음 세기",
          task: `char 배열 "education"에서 모음(a, e, i, o, u)이 몇 개인지 세어 출력하세요. 기대 출력은 "5"입니다 (e, u, a, i, o).`,
          hint: `널 문자('\\0')를 만날 때까지 s[i]를 한 글자씩 검사하는 for 문을 쓰세요. 조건은 || 로 이어 붙입니다.`,
          solution: `#include <stdio.h>

int main(void) {
    char s[] = "education";
    int count = 0;
    for (int i = 0; s[i] != '\\0'; i++) {
        char c = s[i];
        if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') {
            count++;
        }
    }
    printf("%d\\n", count);
    return 0;
}`,
          explain: `문자열은 널 문자로 끝나므로 s[i] != '\\0'이 반복 조건이 됩니다. e, u, a, i, o 다섯 글자가 조건에 맞아 count는 5입니다.`
        },
        {
          title: "구조체로 사각형 넓이 구하기",
          task: `가로 w와 세로 h를 담는 struct Rect를 만들고, int area(struct Rect r) 함수가 넓이를 돌려주게 하세요. main에서 w = 4, h = 5인 사각형의 넓이를 출력하면 "20"이 나와야 합니다.`,
          hint: `struct Rect r = {4, 5}; 처럼 초기화하고, 함수 안에서는 r.w * r.h를 돌려주세요.`,
          solution: `#include <stdio.h>

struct Rect {
    int w;
    int h;
};

int area(struct Rect r) {
    return r.w * r.h;
}

int main(void) {
    struct Rect r = {4, 5};
    printf("%d\\n", area(r));
    return 0;
}`,
          explain: `구조체 멤버는 점(.)으로 접근합니다. 구조체는 값으로 복사되어 함수에 전달되고, 4 * 5 = 20이 반환됩니다.`
        }
      ]
    },
    {
      level: "고급",
      intro: "고급에서는 포인터 연산과 함수 포인터, 메모리 오류와 미정의 동작, 파일 입출력, 비트 연산을 익히고 마지막으로 소스가 실행 파일이 되는 컴파일 과정을 살펴봅니다. C가 왜 빠르고 동시에 위험한지 원리 수준에서 이해하는 것이 목표입니다.",
      lessons: [
        {
          title: "포인터 연산과 배열",
          body: `포인터에 정수를 더하면 바이트가 아니라 가리키는 자료형의 크기만큼 이동합니다. 즉 int *p에서 p + 1은 다음 int 요소를 가리키며, arr[i]는 *(arr + i)와 같은 뜻입니다. 같은 배열의 두 포인터를 빼면 요소 개수 차이가 나오고 그 자료형은 ptrdiff_t(출력은 %td)입니다. 배열 이름은 대부분의 식에서 첫 요소의 주소로 바뀌기 때문에 함수에 배열을 넘기면 크기 정보가 사라지고, 크기는 따로 넘겨야 합니다. 흔한 실수는 배열 범위를 벗어난 위치(끝 다음 한 칸까지만 가리킬 수 있음)로 포인터를 옮기는 것입니다.`,
          code: `#include <stdio.h>

int main(void) {
    int arr[4] = {10, 20, 30, 40};
    int *p = arr;

    printf("%d %d\\n", *p, *(p + 1));        /* 10 20 */
    p += 2;
    printf("%d\\n", *p);                      /* 30 */
    printf("차이: %td\\n", (arr + 3) - arr);   /* 3 */
    printf("개수: %zu\\n", sizeof(arr) / sizeof(arr[0]));   /* 4 */
    return 0;
}`
        },
        {
          title: "함수 포인터",
          body: `함수도 메모리에 주소가 있어서 그 주소를 담는 함수 포인터를 만들 수 있습니다. int (*op)(int, int)는 int 두 개를 받아 int를 돌려주는 함수를 가리키는 포인터이고, 괄호를 빼면 포인터를 돌려주는 함수 선언이 되어 뜻이 완전히 달라집니다. 함수 포인터를 인자로 넘기면 동작을 바꿔 끼울 수 있어서 정렬 비교 함수(qsort), 콜백, 명령 테이블 같은 곳에 쓰입니다. 함수 이름은 그 자체로 주소이므로 apply(add, 3, 4)처럼 &없이 넘길 수 있습니다. 흔한 실수는 시그니처(인자와 반환형)가 다른 함수를 넣는 것입니다.`,
          code: `#include <stdio.h>

int add(int a, int b) { return a + b; }
int mul(int a, int b) { return a * b; }

int apply(int (*op)(int, int), int x, int y) {
    return op(x, y);
}

int main(void) {
    printf("%d\\n", apply(add, 3, 4));   /* 7 */
    printf("%d\\n", apply(mul, 3, 4));   /* 12 */

    int (*ops[2])(int, int) = {add, mul};
    printf("%d\\n", ops[1](5, 6));       /* 30 */
    return 0;
}`
        },
        {
          title: "메모리 누수와 미정의 동작",
          body: `메모리 누수는 malloc으로 빌린 메모리를 free하지 않고 주소를 잃어버려 프로그램이 끝날 때까지 되돌릴 수 없는 상태입니다. 미정의 동작(undefined behavior)은 C 표준이 결과를 정하지 않은 동작으로, 해제한 메모리 사용, 같은 메모리 두 번 free, 배열 범위 밖 접근, 초기화되지 않은 변수 읽기, NULL 역참조, 부호 있는 정수 오버플로 등이 있습니다. 미정의 동작은 우연히 잘 돌아가 보이다가 컴파일러 최적화나 환경에 따라 갑자기 깨질 수 있어서 한 번 통과했다고 안전한 것이 아닙니다. 예방하려면 할당과 해제를 짝으로 관리하고, free 뒤에는 NULL을 대입하고, 크기를 항상 확인하세요. 도구로는 gcc나 clang의 -fsanitize=address 옵션이나 valgrind로 오류를 찾을 수 있습니다.`,
          code: `#include <stdio.h>
#include <stdlib.h>

/* 할당과 해제를 한 쌍의 함수로 관리하는 패턴 */
int *create_array(size_t n) {
    return calloc(n, sizeof(int));   /* 0으로 초기화, 실패 시 NULL */
}

void destroy_array(int **pp) {
    free(*pp);
    *pp = NULL;                      /* 해제 뒤 댕글링 포인터 방지 */
}

int main(void) {
    size_t n = 3;
    int *a = create_array(n);
    if (a == NULL) return 1;

    for (size_t i = 0; i < n; i++) {   /* 범위 안에서만 접근 */
        a[i] = (int)i * 2;
    }
    printf("%d %d %d\\n", a[0], a[1], a[2]);   /* 0 2 4 */

    destroy_array(&a);
    /* 아래는 해제 뒤 사용이라 미정의 동작이므로 쓰면 안 된다:
       printf("%d\\n", a[0]);  (a가 NULL이면 NULL 역참조) */
    return 0;
}`
        },
        {
          title: "파일 입출력",
          body: `파일은 FILE 포인터를 통해 다루며, fopen으로 열고 사용한 뒤 fclose로 닫습니다. 모드는 읽기 "r", 쓰기 "w"(기존 내용을 지움), 이어쓰기 "a" 등이 있고, 열기에 실패하면 fopen은 NULL을 돌려주므로 항상 검사해야 합니다. 텍스트는 fprintf와 fscanf로 서식에 맞춰 쓰고 읽을 수 있으며, fscanf는 성공적으로 읽은 항목 수를 돌려주므로 그 값으로 반복을 제어합니다. 문자열을 읽을 때는 %19s처럼 너비를 지정해 버퍼 넘침을 막으세요. 닫지 않으면 버퍼에 남은 데이터가 파일에 기록되지 않거나 자원이 낭비될 수 있습니다.`,
          code: `#include <stdio.h>

int main(void) {
    FILE *fp = fopen("scores.txt", "w");
    if (fp == NULL) {
        printf("파일을 열 수 없습니다\\n");
        return 1;
    }
    fprintf(fp, "%s %d\\n", "Kim", 90);
    fprintf(fp, "%s %d\\n", "Lee", 85);
    fclose(fp);

    fp = fopen("scores.txt", "r");
    if (fp == NULL) return 1;

    char name[20];
    int score;
    while (fscanf(fp, "%19s %d", name, &score) == 2) {
        printf("%s -> %d\\n", name, score);
    }
    fclose(fp);
    return 0;
}`
        },
        {
          title: "비트 연산",
          body: `비트 연산자는 정수를 비트 단위로 다루며 AND(&), OR(|), XOR(^), NOT(~), 왼쪽 시프트(<<), 오른쪽 시프트(>>)가 있습니다. 하드웨어 레지스터, 권한 플래그, 압축, 해시처럼 값 하나에 여러 on/off 정보를 담는 곳에 쓰입니다. 비트 켜기는 flags |= MASK, 끄기는 flags &= ~MASK, 뒤집기는 flags ^= MASK, 검사는 (flags & MASK) != 0으로 합니다. 비트 연산은 부호 없는 정수(unsigned)에 쓰는 것이 안전한데, 부호 있는 음수의 오른쪽 시프트 결과는 구현에 따라 다르고 자료형 비트 수 이상의 시프트는 미정의 동작이기 때문입니다. 흔한 실수는 &&, ||(논리 연산)와 &, |(비트 연산)를 혼동하는 것입니다.`,
          code: `#include <stdio.h>

#define FLAG_READ  (1u << 0)
#define FLAG_WRITE (1u << 1)
#define FLAG_EXEC  (1u << 2)

int main(void) {
    unsigned int a = 6, b = 3;      /* 0110, 0011 */
    printf("%u %u %u\\n", a & b, a | b, a ^ b);   /* 2 7 5 */
    printf("%u %u\\n", a << 1, a >> 1);            /* 12 3 */

    unsigned int flags = 0;
    flags |= FLAG_READ | FLAG_WRITE;               /* 3 */
    printf("쓰기 있음: %d\\n", (flags & FLAG_WRITE) != 0);   /* 1 */
    flags &= ~FLAG_READ;                           /* 2 */
    flags ^= FLAG_EXEC;                            /* 6 */
    printf("flags = %u\\n", flags);
    return 0;
}`
        },
        {
          title: "컴파일 과정: 소스에서 실행 파일까지",
          body: `gcc hello.c 한 줄 뒤에는 전처리, 컴파일, 어셈블, 링크의 네 단계가 있습니다. 전처리기는 #include와 #define을 처리해 텍스트를 확장하고, 컴파일러는 C 코드를 어셈블리로, 어셈블러는 이를 기계어 목적 파일(.o)로 바꿉니다. 마지막으로 링커가 여러 목적 파일과 라이브러리를 이어 붙여 실행 파일을 만들며, 함수를 선언만 하고 정의하지 않았을 때 나는 undefined reference 오류가 이 단계에서 발생합니다. 각 단계는 gcc 옵션(-E, -S, -c)으로 따로 실행해 결과를 볼 수 있습니다. 실무에서는 -Wall -Wextra로 경고를 켜고, 디버깅에는 -g, 최적화에는 -O2를 함께 씁니다.`,
          code: `/* hello.c */
#include <stdio.h>

int main(void) {
    printf("Hello, build!\\n");
    return 0;
}

/* 단계별 명령 (터미널에서 실행)
   gcc -E hello.c -o hello.i     전처리 결과(.i)
   gcc -S hello.i -o hello.s     어셈블리(.s)
   gcc -c hello.s -o hello.o     목적 파일(.o)
   gcc hello.o -o hello          링크해 실행 파일 생성

   한 번에: gcc -Wall -Wextra -O2 hello.c -o hello */`
        }
      ],
      quiz: [
        {
          q: `다음 코드의 출력은 무엇일까요?\n\n#include <stdio.h>\nint main(void) {\n    int a[] = {10, 20, 30, 40};\n    int *p = a + 1;\n    printf("%d\\n", *(p + 2));\n    return 0;\n}`,
          choices: ["30", "40", "20", "정의되지 않음"],
          answer: 1,
          why: `p는 a[1]을 가리키고 p + 2는 a[3]을 가리키므로 값은 40입니다. 배열 범위 안이라 정의된 동작입니다.`
        },
        {
          q: `int (*fp)(int, int); 선언이 뜻하는 것은 무엇일까요?`,
          choices: ["int 두 개를 받아 int를 돌려주는 함수를 가리키는 포인터", "int 포인터 두 개를 담는 배열", "int 포인터를 돌려주는 함수의 선언", "int 두 개를 담을 수 있는 포인터 변수"],
          answer: 0,
          why: `*fp를 괄호로 묶었기 때문에 fp는 포인터이고, 그 대상은 (int, int)를 받아 int를 돌려주는 함수입니다. 괄호를 빼면 포인터를 돌려주는 함수 선언이 됩니다.`
        },
        {
          q: `메모리 누수(memory leak)를 가장 정확하게 설명한 것은 무엇일까요?`,
          choices: ["free를 같은 포인터에 두 번 호출하는 것", "NULL 포인터를 역참조하는 것", "배열 범위 밖의 값을 읽는 것", "할당한 메모리를 해제하지 않은 채 그 주소를 잃어버려 더 이상 해제할 수 없는 상태"],
          answer: 3,
          why: `누수는 할당만 하고 해제할 방법이 없어진 메모리를 말합니다. 나머지 보기는 이중 해제, NULL 역참조, 범위 초과 접근으로 모두 다른 종류의 오류입니다.`
        },
        {
          q: `다음 코드가 출력하는 값은 무엇일까요?\n\n#include <stdio.h>\nint main(void) {\n    unsigned int a = 6, b = 3;\n    printf("%u\\n", a ^ b);\n    return 0;\n}`,
          choices: ["2", "7", "5", "3"],
          answer: 2,
          why: `6은 0110, 3은 0011이며 XOR은 비트가 다를 때 1이므로 0101, 즉 5입니다. AND는 2, OR는 7입니다.`
        },
        {
          q: `fopen이 파일을 열지 못했을 때 돌려주는 값은 무엇일까요?`,
          choices: ["NULL", "-1", "EOF", "0이 아닌 FILE 포인터"],
          answer: 0,
          why: `fopen은 실패하면 NULL을 돌려주므로 반환값을 반드시 검사해야 합니다. EOF는 읽기 함수가 파일 끝이나 오류를 알릴 때 쓰는 값입니다.`
        },
        {
          q: `다음 코드에 대한 설명으로 옳은 것은 무엇일까요?\n\n#include <stdio.h>\n#include <stdlib.h>\nint main(void) {\n    int *p = malloc(sizeof(int));\n    *p = 5;\n    free(p);\n    printf("%d\\n", *p);\n    return 0;\n}`,
          choices: ["항상 5가 출력된다", "항상 0이 출력된다", "컴파일 오류가 발생한다", "해제한 메모리를 읽으므로 미정의 동작이다"],
          answer: 3,
          why: `free 뒤의 메모리는 더 이상 쓸 수 없고 읽으면 미정의 동작입니다. 우연히 5가 나올 수도 있지만 보장되지 않으며 컴파일은 보통 통과합니다.`
        },
        {
          q: `gcc가 C 소스를 실행 파일로 만드는 단계의 올바른 순서는 무엇일까요?`,
          choices: ["컴파일 → 전처리 → 어셈블 → 링크", "링크 → 전처리 → 컴파일 → 어셈블", "전처리 → 컴파일 → 어셈블 → 링크", "어셈블 → 전처리 → 링크 → 컴파일"],
          answer: 2,
          why: `먼저 전처리로 #include 등을 확장하고, 컴파일로 어셈블리를 만들고, 어셈블로 목적 파일을 만든 뒤, 링크로 실행 파일을 완성합니다.`
        },
        {
          q: `unsigned int flags에서 MASK에 해당하는 비트만 끄고(0으로) 나머지는 그대로 두는 식은 무엇일까요?`,
          choices: ["flags |= MASK;", "flags &= ~MASK;", "flags ^= ~MASK;", "flags &= MASK;"],
          answer: 1,
          why: `~MASK는 해당 비트만 0이고 나머지는 1이므로 &를 하면 그 비트만 꺼집니다. flags &= MASK는 반대로 그 비트만 남기고 나머지를 지웁니다.`
        }
      ],
      practice: [
        {
          title: "함수 포인터로 연산 고르기",
          task: `add와 sub 함수를 만들고, 함수 포인터 int (*op)(int, int)에 차례로 담아 10과 4에 적용해 결과를 각각 한 줄씩 출력하세요. 기대 출력은 "14"와 "6"입니다.`,
          hint: `op = add; 처럼 함수 이름을 대입하고 op(10, 4)로 호출합니다. 같은 포인터에 sub를 다시 대입해 재사용하세요.`,
          solution: `#include <stdio.h>

int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }

int main(void) {
    int (*op)(int, int);
    op = add;
    printf("%d\\n", op(10, 4));
    op = sub;
    printf("%d\\n", op(10, 4));
    return 0;
}`,
          explain: `함수 이름은 함수의 주소이므로 포인터에 바로 대입할 수 있고, op(10, 4)로 가리키는 함수를 호출합니다. add일 때 14, sub일 때 6이 출력됩니다.`
        },
        {
          title: "켜진 비트 개수 세기",
          task: `unsigned int n = 13;에서 2진수로 1인 비트가 몇 개인지 세어 출력하세요. 13은 2진수 1101이므로 기대 출력은 "3"입니다.`,
          hint: `n & 1로 가장 아래 비트를 검사하고 n >>= 1로 한 칸씩 밀면서 n이 0이 될 때까지 반복하세요.`,
          solution: `#include <stdio.h>

int main(void) {
    unsigned int n = 13;
    int count = 0;
    while (n != 0) {
        count += n & 1;
        n >>= 1;
    }
    printf("%d\\n", count);
    return 0;
}`,
          explain: `n & 1은 맨 아래 비트가 1이면 1, 아니면 0입니다. 1101을 오른쪽으로 밀며 1, 0, 1, 1을 차례로 더해 3이 됩니다.`
        },
        {
          title: "파일에 쓰고 다시 읽어 합계 구하기",
          task: `"nums.txt" 파일에 10 20 30을 공백으로 구분해 쓴 뒤, 다시 열어 읽은 정수들의 합을 출력하세요. 기대 출력은 "60"입니다.`,
          hint: `쓰기는 fopen(..., "w")와 fprintf, 읽기는 "r"과 fscanf를 쓰세요. fscanf가 1을 돌려주는 동안 반복하고 마지막에 fclose를 잊지 마세요.`,
          solution: `#include <stdio.h>

int main(void) {
    FILE *fp = fopen("nums.txt", "w");
    if (fp == NULL) return 1;
    fprintf(fp, "10 20 30\\n");
    fclose(fp);

    fp = fopen("nums.txt", "r");
    if (fp == NULL) return 1;
    int v, sum = 0;
    while (fscanf(fp, "%d", &v) == 1) {
        sum += v;
    }
    fclose(fp);
    printf("%d\\n", sum);
    return 0;
}`,
          explain: `쓰기 모드로 연 파일을 닫아야 내용이 확실히 저장되므로 fclose 후 다시 읽기 모드로 엽니다. fscanf는 정수를 읽을 때마다 1을 돌려주고 파일 끝에서 멈추어 10 + 20 + 30 = 60이 됩니다.`
        }
      ]
    }
  ]
});
