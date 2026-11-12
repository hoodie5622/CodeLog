(window.PRO_MODULES = window.PRO_MODULES || {})["pj-debug-py"] = {
  id: "pj-debug-py",
  summary: `버그 신고를 최소 재현 예제로 줄이고, 트레이스백·pdb·로그·EXPLAIN·cProfile로 Python·SQL·서버 장애의 원인을 찾아 고친 뒤, 고객에게 설명하고 재발 방지까지 기록할 수 있다.`,
  hours: 22,
  goals: [
    `버그 신고를 기대 동작·실제 동작·재현 절차로 정리하고, 데이터를 반씩 줄여 20줄 안팎의 최소 재현 예제를 만들 수 있다.`,
    `Python 트레이스백을 아래에서 위로 읽어 예외 종류·발생 위치·연쇄 예외(직접 원인 / 처리 중 발생)를 구분하고 원인 후보를 세울 수 있다.`,
    `print·logging·pdb(조건부 중단점, post-mortem)를 상황에 맞게 골라 가설을 검증할 수 있다.`,
    `가변 기본값·얕은 복사·이터레이터 소진·인코딩(BOM 포함)·경로(cwd) 버그를 증상만 보고 알아보고 고칠 수 있다.`,
    `JOIN 중복 집계·NULL 비교·NOT IN·GROUP BY·함수가 씌워진 컬럼 때문에 생기는 SQL 버그를 5행짜리 표로 재현하고 EXPLAIN으로 확인해 고칠 수 있다.`,
    `서버 로그에서 배포·설정 변경 시각과 첫 오류를 맞춰 보고, 소음과 신호를 구분해 원인을 좁힐 수 있다.`,
    `cProfile과 EXPLAIN으로 병목(N+1, 풀 스캔 등)을 측정해 찾고, 전후 수치로 개선을 입증할 수 있다.`,
    `장애를 고객이 이해하는 말로 설명하고, 타임라인·원인·재발 방지 조치가 담긴 무책(blameless) 포스트모템과 회귀 테스트로 기록할 수 있다.`
  ],
  lessons: [
    {
      title: `디버깅 방법론과 최소 재현 예제 만들기`,
      body: `버그는 "코드가 틀렸다"가 아니라 **내 머릿속의 기대와 실제 동작이 어긋났다**는 뜻입니다. 그래서 디버깅의 본질은 코드를 이리저리 바꿔 보는 일이 아니라, 내 모델을 현실에 맞게 고치는 일입니다. 가장 믿을 만한 방법은 과학의 순서와 같습니다. 관찰 → 가설 → 예측 → 실험 → 결론. Google SRE 책의 문제 해결 장도 같은 가설-검증 루프를 권합니다. 이 모듈 전체는 이 루프 하나를 Python·SQL·서버 로그에 적용하는 연습입니다.

### 나쁜 습관: 추측으로 코드 바꾸기
증상을 보자마자 "아마 이 줄이겠지" 하며 여러 곳을 고치고 돌려 보는 습관을 흔히 샷건 디버깅이라 부릅니다. 고쳐져도 어느 수정 덕분인지 모르고, 안 고쳐지면 새 버그만 늘어납니다. 원칙은 둘입니다. **한 번에 한 가지만 바꾼다.** **바꾸기 전에 실패를 먼저 재현한다.** 재현하지 못한 버그를 "고쳤다"고 말하는 것은 운이 좋았다는 뜻일 뿐입니다.

### 디버깅 여덟 걸음
1. 증상 정리: 기대 동작 / 실제 동작 / 재현 절차 / 환경(OS·Python 버전·데이터) / 언제부터. "가끔 틀려요"는 증상이 아니라 감상입니다. "1월 조회가 12,000이어야 하는데 1,842,300이 나온다"가 증상입니다.
2. 재현: 같은 입력이면 항상 같은 결과가 나오게 만듭니다.
3. 범위 좁히기: 이분 탐색(아래).
4. 가설: "이 값이 None이라서 터진다"처럼 틀렸음을 증명할 수 있는 문장으로 씁니다.
5. 예측: "가설이 맞다면 12번째 줄에서 x는 None일 것이다."
6. 확인: print·로그·디버거로 예측을 시험합니다. 틀리면 가설을 버립니다.
7. 수정과 회귀 테스트: 재현 예제가 곧 테스트가 됩니다.
8. 기록: 원인과 수정 이유를 한 줄이라도 남깁니다.

### "가끔" 생기는 버그에도 결정적 원인이 있다
재현이 안 되는 버그는 대개 입력(특정 데이터), 상태(이전 호출이 남긴 값), 시간(날짜·타임존·만료), 환경(OS·버전·인코딩·경로) 넷 중 하나가 다릅니다. 내 환경과 고객 환경의 차이를 목록으로 만들고 하나씩 맞춰 보세요.

### 이분 탐색과 최소 재현 예제
범위를 반으로 나누는 방법은 네 가지입니다. 데이터(입력을 반씩 줄이기), 코드(중간에 출력 하나를 넣어 앞/뒤 판정), 시간(잘 되던 커밋과 지금 사이를 반씩, git bisect), 환경(잘 되는 PC와 차이를 하나씩 맞추기). 1만 행에서 나쁜 행 하나는 약 14번의 반분(2의 14제곱 = 16,384)이면 찾습니다. 눈으로 스크롤하는 방식으로는 불가능한 속도입니다.

이렇게 얻은 가장 작은 입력과 가장 짧은 코드가 **최소 재현 예제(MRE)**입니다. 만드는 법은 간단합니다. 실패하는 전체에서 한 조각을 빼고, 여전히 실패하는지 확인하고, 반복합니다. 실패가 사라지면 방금 뺀 조각이 원인의 일부입니다. 효과는 네 가지입니다. 원인이 스스로 드러나고, 고객·동료에게 보여 줄 수 있고, 그대로 회귀 테스트가 되고, 고객 개인정보 없이(합성 데이터로) 공유할 수 있습니다.

습관 두 가지만 더. 가설-예측-결과를 한 줄씩 적는 **디버깅 일지**는 같은 가설의 되풀이를 막고, 외주에서는 보고와 청구의 근거가 됩니다. **30분 규칙**도 정해 두세요. 30분간 새 가설이 없으면 방법을 바꿉니다(범위를 다시 잡기, 남에게 설명하기, 로그 추가).

아래 코드는 1만 행 가계부에서 쉼표가 섞인 금액 한 줄을 기계적으로 찾아내는 과정입니다.`,
      code: `# [BUGGY] 가계부 CSV 1만 줄을 합산하다 가끔 터지는 함수
def total_won(rows):
    return sum(int(r["amount"]) for r in rows)

def fails(rows):                      # 버그가 보이면 True
    try:
        total_won(rows)
        return False
    except ValueError:
        return True

def shrink(rows):                     # 데이터 이분 탐색: 실패를 유지하는 더 작은 절반만 남긴다
    while len(rows) > 1:
        half = len(rows) // 2
        left, right = rows[:half], rows[half:]
        if fails(left):
            rows = left
        elif fails(right):
            rows = right
        else:                         # 두 행이 함께 있어야 터지는 버그: 여기서 멈추고 손으로 줄인다
            break
    return rows

rows = [{"memo": "m%d" % i, "amount": str(1000 + i % 50)} for i in range(10000)]
rows[7345]["amount"] = "1,200"        # 숨어 있는 나쁜 행 하나
minimal = shrink(rows)
print(len(minimal), minimal)          # 1 [{'memo': 'm7345', 'amount': '1,200'}]

# 최소 재현 예제: 이제 3줄이면 남에게 보여 줄 수 있다
try:
    int("1,200")
except ValueError as e:
    print(e)                          # invalid literal for int() with base 10: '1,200'

# [FIXED] 입력 경계에서 한 번만 정규화하고 검증한다
def parse_won(text):
    cleaned = text.replace(",", "").strip()
    if not (cleaned.isascii() and cleaned.isdigit()):    # isdigit만 쓰면 '²' 같은 문자도 통과한다
        raise ValueError("금액 형식 오류: %r" % text)
    return int(cleaned)

assert parse_won("1,200") == 1200
assert sum(parse_won(r["amount"]) for r in rows) > 0
print("fixed OK")`,
      codeLang: `python`,
      key: [
        `버그는 기대와 실제의 차이다. 먼저 "기대"를 숫자로 적는다.`,
        `재현하지 못한 버그는 고친 것이 아니다. 수정 전 실패, 수정 후 통과를 눈으로 확인한다.`,
        `한 번에 하나만 바꾸고, 가설마다 틀릴 수 있는 예측을 적는다.`,
        `최소 재현 예제는 입력을 반씩 줄이며 "여전히 실패하는가"를 확인한 결과다.`,
        `"가끔"은 입력·상태·시간·환경 중 어디가 다른지 찾으라는 신호다.`
      ],
      pitfalls: [
        `원인을 모른 채 try/except로 감싸 오류를 숨긴다. 증상만 사라지고 데이터는 계속 틀린다.`,
        `한 번에 여러 곳을 고치고 "됐다"고 선언한다. 어느 수정이 효과였는지 모르고 새 버그가 섞인다.`,
        `고객의 실제 데이터를 그대로 메신저·메일에 붙여 넣는다. 재현용 데이터는 합성하거나 익명화한다.`,
        `재현 없이 "아마 이거"를 고쳐 배포한다. 같은 증상이 다시 오면 신뢰만 잃는다.`
      ]
    },
    {
      title: `Python 오류 메시지·트레이스백 읽기`,
      body: `트레이스백은 불친절한 비명이 아니라 **프로그램이 남긴 가장 정확한 증거**입니다. 구조는 항상 같습니다. 첫 줄은 ‹Traceback (most recent call last):›, 그 아래에 호출 프레임이 **오래된 호출부터 가장 최근 호출 순**으로 쌓이고(파일·줄 번호·함수 이름과 그 줄의 소스), 맨 마지막 줄이 ‹예외 종류: 메시지›입니다. 읽는 순서는 아래에서 위입니다. 마지막 줄로 무슨 일이 났는지 알고, 바로 위 프레임으로 어디서 났는지 알고, 위로 올라가며 내 코드가 나오는 가장 아래 프레임부터 호출 경로를 따라갑니다.

### 터진 곳과 원인은 다르다
가장 흔한 오해입니다. 아래 코드에서 ‹find_budget›은 없는 분류에 None을 조용히 돌려주고, 한참 뒤 ‹remaining›에서 ‹None - int›가 되어 TypeError가 납니다. 트레이스백이 가리키는 곳은 계산 줄이지만 잘못된 곳은 None을 만든 함수입니다. 그래서 질문을 바꿉니다. "이 값은 어디서 왔는가?" 값의 출처를 거슬러 올라가는 것이 트레이스백 읽기의 절반입니다. 이런 오류는 원인에 가까운 곳에서 이름을 붙여 실패시키는 편이(레슨 코드의 FIXED) 뒤처리가 쉽습니다.

### 줄 안의 위치 표시와 예외 연쇄
Python 3.11부터 소스 줄 아래에 ‹~~~^~~~›나 ‹^^^^› 표시가 붙어 한 줄 안의 어느 부분식이 문제인지 알려 줍니다. 버전과 터미널에 따라 모양이 다르니 모양보다 "어느 조각인가"를 읽으세요.

예외가 여러 개 나란히 나오면 연쇄입니다. 두 문구를 구분해야 합니다.
- ‹The above exception was the direct cause of the following exception›: 코드가 일부러 ‹raise 새예외 from 원래예외›로 이은 것. 위의 예외가 원인입니다.
- ‹During handling of the above exception, another exception occurred›: except나 finally 처리 중에 또 다른 예외가 난 것. 대개 **복구 코드 자체의 버그**이므로, 처음 난 예외가 왜 났는지부터 조사하고 두 번째는 별도 결함으로 다룹니다.
연쇄에서는 가장 위의 예외가 시작점이고, 가장 아래가 프로그램을 죽인 예외입니다. ‹from None›은 원인을 숨기므로 디버깅에는 불리합니다.

### 자주 보는 예외와 첫 가설
|예외|흔한 원인|먼저 확인할 것|
|KeyError|없는 키, 철자, BOM 붙은 헤더|키를 repr로 출력, 데이터 출처|
|IndexError|빈 리스트, 범위 밖|len() 값, 입력이 비었는지|
|TypeError / AttributeError ('NoneType')|None이 전파됨|그 값을 돌려준 함수|
|ValueError (invalid literal)|숫자 아닌 문자열|원본 문자열을 repr로|
|UnicodeDecodeError|인코딩 불일치|파일이 실제로 어떤 인코딩인지|
|FileNotFoundError|상대 경로, 작업 디렉터리|os.getcwd()와 절대 경로|
|UnboundLocalError|함수 안 대입으로 지역 변수화|대입이 읽기보다 앞인지|
|RecursionError|종료 조건 없음|재귀 인자가 줄어드는지|

SyntaxError는 특별합니다. 보고된 줄은 파서가 "이상하다"고 깨달은 곳이라 실제 실수(닫히지 않은 괄호, 빠진 콜론)는 그 앞줄에 있을 수 있습니다.

### 실무 요령
프레임워크 트레이스백은 수십 프레임이라 겁나지만, 내 프로젝트 경로가 나오는 프레임만 먼저 보면 됩니다. 라이브러리 프레임은 호출 경로를 이해하는 용도입니다. 로그에는 ‹str(e)›만 남기지 말고 ‹logger.exception›이나 ‹traceback.format_exc()›로 **전체 트레이스백**을 남기세요. 위치 정보가 사라지면 원격 장애는 추적할 수 없습니다. 반대로 ‹except Exception: pass›는 증거를 지우는 코드입니다. 오류 메시지를 검색·질문에 붙일 때는 마지막 줄과 내 코드 프레임을 함께, 토큰·비밀번호·개인정보는 지우고 붙입니다.`,
      code: `import traceback

BUDGETS = {"식비": 300000}

def find_budget(category):               # [BUGGY] 없는 분류는 None을 조용히 돌려준다
    return BUDGETS.get(category)

def remaining(category, spent):
    budget = find_budget(category)
    return budget - spent

try:
    remaining("교통", 12000)
except TypeError:
    print(traceback.format_exc())

def find_budget(category):               # [FIXED] 원인 가까이에서 이름을 붙여 실패시킨다
    try:
        return BUDGETS[category]
    except KeyError as exc:
        raise LookupError("예산 없는 분류: %r" % category) from exc

try:
    remaining("교통", 12000)
except LookupError:
    print(traceback.format_exc())

# ---- BUGGY 실행 결과의 마지막 줄 (Python 3.14에서 실행): 터진 곳은 remaining, 원인은 find_budget
# TypeError: unsupported operand type(s) for -: 'NoneType' and 'int'
# ---- FIXED 실행 결과 전체 (Python 3.14에서 실행, 파일명을 ledger.py로 가정, 위 줄 번호 기준. ~ ^ 표시는 버전마다 조금 다르다)
# Traceback (most recent call last):
#   File "ledger.py", line 19, in find_budget
#     return BUDGETS[category]
#            ~~~~~~~^^^^^^^^^^
# KeyError: '교통'
#
# The above exception was the direct cause of the following exception:
#
# Traceback (most recent call last):
#   File "ledger.py", line 24, in <module>
#     remaining("교통", 12000)
#     ~~~~~~~~~^^^^^^^^^^^^^^^
#   File "ledger.py", line 9, in remaining
#     budget = find_budget(category)
#   File "ledger.py", line 21, in find_budget
#     raise LookupError("예산 없는 분류: %r" % category) from exc
# LookupError: 예산 없는 분류: '교통'`,
      codeLang: `python`,
      key: [
        `트레이스백은 아래에서 위로 읽는다: 마지막 줄(무슨 일) → 바로 위 프레임(어디서) → 내 코드 프레임(어떤 경로로).`,
        `터진 곳과 원인은 다르다. "이 값은 어디서 왔는가"로 출처를 거슬러 올라간다.`,
        `"direct cause"는 의도한 연결, "During handling"은 처리 코드가 또 실패한 것. 연쇄에서는 가장 위의 예외가 시작점이다.`,
        `로그에는 메시지만이 아니라 전체 트레이스백을 남긴다(logger.exception).`
      ],
      pitfalls: [
        `마지막 줄의 오류만 보고 그 줄을 try/except로 감싼다. 원인은 그대로 남고 증상만 숨는다.`,
        `SyntaxError가 가리킨 줄만 들여다본다. 닫히지 않은 괄호 같은 실수는 앞줄에 있는 경우가 많다.`,
        `except Exception: pass 나 str(e)만 기록하는 로그로 위치 정보를 버린다.`,
        `오류 전문을 그대로 검색창·채팅에 붙여 토큰·경로·개인정보를 유출한다.`
      ]
    },
    {
      title: `pdb와 print/logging으로 추적하기`,
      body: `도구는 상황으로 고릅니다. **print**는 가장 빠른 임시 도구입니다. **logging**은 재현이 어렵거나 운영 서버처럼 멈춰 볼 수 없는 곳에서 사후에 읽을 증거를 남깁니다. **디버거(pdb)**는 무엇을 봐야 할지 모를 때, 재시작 비용이 클 때, 실행 중간 상태를 탐색하고 싶을 때 씁니다. 보통 print나 로그로 범위를 좁힌 뒤 디버거로 들어갑니다(MIT Missing Semester의 디버깅 강의도 printf, 로깅, 디버거 순으로 도구를 소개합니다).

### print를 잘 쓰는 법
‹print(x)›만 찍으면 어느 줄의 무엇인지 알 수 없습니다. ‹print(f"{x=}")›(Python 3.8+)는 이름과 값을 같이 찍습니다. 문자열 문제(공백·BOM·개행)는 ‹repr›로 찍어야 보입니다. ‹print("DBG", ...)›처럼 grep할 수 있는 접두어를 붙이고, 고친 뒤에는 지우거나 logging.debug로 승격합니다.

### logging: 기본값부터 알기
레벨은 DEBUG 10, INFO 20, WARNING 30, ERROR 40, CRITICAL 50이고 기본 임계값은 WARNING입니다(공식 HOWTO). 그래서 ‹log.debug›를 써 놓고도 아무것도 안 나옵니다. 운영 요령은 세 가지입니다.
- 레벨을 코드가 아니라 환경 변수(‹LOG_LEVEL›)로 조절해, 재배포 없이 문제 구간에만 DEBUG를 켭니다.
- 포맷에 시각·레벨·함수:줄을 넣습니다(‹%(funcName)s:%(lineno)d›).
- ‹log.debug("balance=%s", balance)›처럼 인자를 따로 넘기면 해당 레벨이 꺼져 있을 때 문자열 조립 비용을 아낍니다. except 블록에서는 ‹log.exception›이 트레이스백까지 남깁니다. 단, 토큰·비밀번호·주민번호는 절대 로그에 쓰지 않습니다.

로거는 점으로 이어진 이름의 계층(‹app›, ‹app.db›)이고, 기록은 기본적으로 조상 로거의 핸들러에까지 전달(propagate)됩니다. 그래서 인수받은 프로젝트에서 두 가지 증상을 자주 만납니다. 같은 줄이 두 번씩 찍히면 핸들러를 자식과 조상 양쪽에 붙인 경우를 의심하세요(공식 문서도 가능한 한 높은 로거 한 곳에만 붙이라고 안내합니다). ‹basicConfig›를 불렀는데 레벨이 안 바뀌면, 루트 로거에 핸들러가 이미 있을 때 이 함수는 아무 일도 하지 않기 때문입니다(‹force=True›로 덮어쓸 수 있고 Python 3.8부터 지원). 프레임워크가 먼저 로깅을 설정해 둔 코드에서 흔한 일입니다.

### pdb 사용법
들어가는 길은 세 가지입니다. 코드에 ‹breakpoint()›(Python 3.7+, 환경 변수 PYTHONBREAKPOINT=0이면 전부 무시), 명령줄 ‹python -m pdb script.py›(예외로 죽으면 post-mortem으로 진입), 대화형 셸에서 ‹pdb.pm()›.
|명령|하는 일|
|n (next)|현재 함수의 다음 줄까지 실행(호출 안으로 안 들어감)|
|s (step)|호출 안으로 들어감|
|c (continue)|다음 중단점까지 실행|
|r (return)|현재 함수가 끝날 때까지 실행|
|b 줄, 조건|중단점. 조건이 참일 때만 멈춤|
|tbreak / cl|임시 중단점 / 중단점 삭제|
|p 식 / pp 식|값 출력 / 보기 좋게 출력|
|w / u / d|호출 스택 보기 / 위·아래 프레임 이동|
|l|주변 소스 보기|
|interact|현재 범위에서 파이썬 셸 열기|
빈 줄(Enter)은 직전 명령을 반복합니다. 입력한 것이 명령이 아니면 파이썬 식으로 실행되니, 변수 이름이 명령과 겹치면(예: ‹c›) 앞에 ‹!›를 붙입니다.

### 조건부 중단점이 핵심
반복이 1만 번인데 7,345번째에서만 이상하다면 Enter를 1만 번 누를 수 없습니다. ‹b 17, e["kind"] not in ("income", "expense")›처럼 **이상한 순간에만 멈추는 조건**을 걸면 됩니다. 레슨 코드의 세션이 그 예입니다. post-mortem은 죽은 뒤 스택을 거슬러 올라가며 값을 보는 방법이지만, 운영 서버에는 디버거를 붙이지 않고 로그가 그 역할을 대신합니다.

### 디버거의 함정
스레드·비동기 타이밍 버그는 멈추는 순간 달라지니 로그가 낫습니다. 커밋에 ‹breakpoint()›를 남기면 서버가 입력을 기다리며 멈춥니다. 린트나 pre-commit 검사로 막으세요.`,
      code: `import logging
import os

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"),
                    format="%(levelname)s %(funcName)s:%(lineno)d %(message)s")
log = logging.getLogger("ledger")

ENTRIES = [
    {"kind": "income", "amount": 500000},
    {"kind": "expense", "amount": 12000},
    {"kind": "Income", "amount": 30000},      # CSV에서 대문자가 섞여 들어온 행
]

def running_balance(entries, start=0):
    balance = start
    for i, e in enumerate(entries):
        balance += e["amount"] if e["kind"] == "income" else -e["amount"]   # [BUGGY]
        log.debug("i=%d kind=%r amount=%d balance=%d", i, e["kind"], e["amount"], balance)
    return balance

print(running_balance(ENTRIES))               # 458000 (기대: 518000)

KINDS = {"income": 1, "expense": -1}

def signed(e):                                # [FIXED] 경계에서 정규화하고 모르는 값은 즉시 실패
    sign = KINDS.get(e["kind"].strip().lower())
    if sign is None:
        raise ValueError("알 수 없는 kind: %r" % e["kind"])
    return sign * e["amount"]

def running_balance_ok(entries, start=0):
    return start + sum(signed(e) for e in entries)

assert running_balance_ok(ENTRIES) == 518000

# --- pdb 세션 (python -m pdb ledger.py), BUGGY 버전 / 출력은 ## 뒤에 적음 (실제 출력은 파일 전체 경로가 붙는다) ---
# (Pdb) b 17, e["kind"] not in ("income", "expense")   ## Breakpoint 1 at ledger.py:17
# (Pdb) c                                             ## > ledger.py(17)running_balance()
# (Pdb) p i, e                                        ## (2, {'kind': 'Income', 'amount': 30000})
# (Pdb) p balance                                     ## 488000  (이 줄 실행 전: 500000 - 12000)
# (Pdb) n                                             ## 한 줄 실행
# (Pdb) p balance                                     ## 458000  (+30000이어야 하는데 -30000)`,
      codeLang: `python`,
      key: [
        `print는 빠른 임시 도구, logging은 사후 증거, pdb는 "무엇을 볼지 모를 때"의 탐색 도구다.`,
        `logging 기본 임계값은 WARNING이다. DEBUG가 안 나오면 레벨부터 확인하고, 레벨은 환경 변수로 조절한다.`,
        `반복 안의 이상한 순간은 조건부 중단점(b 줄, 조건)으로 잡는다.`,
        `문자열 문제는 repr로 찍어야 보인다. 로그에 비밀·개인정보는 쓰지 않는다.`
      ],
      pitfalls: [
        `print를 여기저기 뿌리고 지우지 않은 채 커밋한다. 운영 로그가 오염되고 개인정보가 샌다.`,
        `breakpoint()를 남긴 채 배포해 서버 프로세스가 입력 대기로 멈춘다.`,
        `변수 이름이 pdb 명령(c, n, s, r 등)과 같은데 그냥 입력해 명령으로 실행된다. p 변수 또는 !변수를 쓴다.`,
        `운영 서버에 디버거를 붙이려 한다. 요청이 멈추고 장애가 커진다. 로그와 재현 환경으로 해결한다.`
      ]
    },
    {
      title: `자주 나오는 Python 버그 (가변 기본값·얕은 복사·이터레이터 소진·인코딩·경로)`,
      body: `다섯 가지 버그는 증상이 서로 달라 보여도 공통점이 있습니다. "내 PC에서는 되는데", "두 번째 호출부터", "가끔" 같은 말이 나오면 **공유된 상태**나 **환경 차이**를 의심하세요. 모두 레슨 코드에서 직접 돌려 볼 수 있습니다.

### 1. 가변 기본값
‹def add_tag(tag, tags=[])›의 ‹[]›는 호출할 때마다 만들어지는 것이 아니라 **함수를 정의하는 시점에 딱 한 번** 평가되어 함수 객체에 저장됩니다. 기본값을 쓰는 모든 호출이 같은 리스트를 공유하니 앞 호출의 결과가 뒤 호출에 섞입니다. 고치는 관용구는 ‹tags=None›으로 받고 함수 안에서 새로 만드는 것입니다(공식 FAQ). dataclass는 해시할 수 없는(변경 가능하다고 간주하는) 기본값, 곧 list·dict·set을 ValueError로 막고 ‹field(default_factory=list)›를 쓰게 합니다(Python 3.11 이후의 판정 기준은 해시 가능 여부). 가계부 CLI를 dataclass로 만들었다면 이미 그 안전장치를 만났을 겁니다.

### 2. 얕은 복사
‹dict(x)›, ‹list(x)›, ‹x.copy()›, ‹x[:]›, ‹copy.copy(x)›는 바깥 껍데기만 새로 만들고 **안쪽 객체는 같은 것을 가리킵니다.** 중첩 구조의 스냅샷·기본 설정·테스트 픽스처에서 터집니다. 증상은 "복사본을 건드렸더니 원본이 바뀐다" 또는 "테스트를 단독으로 돌리면 통과, 전체를 돌리면 실패"입니다. 중첩 구조에는 ‹copy.deepcopy›를 쓰거나, 매번 새로 만드는 팩토리 함수를 쓰세요. ‹a = b›는 복사가 아니라 이름표를 하나 더 붙이는 것입니다.

### 3. 이터레이터 소진
제너레이터 식, ‹map›, ‹filter›, ‹zip›, 파일 객체, ‹csv.reader›는 **한 번만 읽힙니다.** 두 번째 순회는 에러 없이 조용히 빈 결과를 냅니다. 합계는 맞는데 건수가 0이라면 이 버그를 의심하세요. 두 번 쓸 데이터는 ‹list(...)›로 구체화하세요(아주 큰 데이터는 메모리를 따져야 합니다). 파일도 한 번 ‹read()›하면 끝이라 다시 읽으려면 ‹seek(0)›이 필요합니다.

### 4. 인코딩
파일과 네트워크에는 글자가 아니라 바이트가 흐르고, 인코딩은 바이트와 글자 사이의 약속입니다. ‹open()›에 ‹encoding›을 생략하면 플랫폼 기본값을 씁니다. Python 3.15부터는 UTF-8이 기본(PEP 686, 2026-11 기준)이지만, 3.14 이하의 Windows에서는 로케일 인코딩(한국어 설정에서는 보통 cp949)입니다. 그래서 "Mac에서는 되는데 고객 Windows에서만 UnicodeDecodeError"가 나옵니다. 엑셀에서 "CSV UTF-8"로 저장한 파일은 보통 맨 앞에 BOM(‹\\ufeff›)이 붙어서, ‹utf-8›로 읽으면 첫 헤더가 ‹\\ufeff날짜›가 되고 KeyError가 납니다. 이때는 ‹utf-8-sig›로 읽습니다. 규칙은 하나입니다. **파일·네트워크·DB 경계에서는 항상 인코딩을 명시한다.** ‹errors="ignore"›는 데이터 손실을 가리는 임시방편입니다.

### 5. 경로
상대 경로는 스크립트 위치가 아니라 **프로그램을 실행한 위치(cwd)** 기준입니다. IDE, 작업 스케줄러, 서비스 관리자가 서로 다른 cwd로 실행하면 같은 코드가 FileNotFoundError를 냅니다. ‹Path(__file__).resolve().parent / "data" / "x.json"›처럼 파일 위치에서 출발하세요. Windows 경로를 ‹"C:\\temp\\data.csv"›처럼 일반 문자열에 쓰면 ‹\\t›가 탭 문자로 바뀌어 경로가 깨지고, 폴더 이름이 n으로 시작하면 줄바꿈 문자가 끼어듭니다. 원시 문자열(‹r"..."›)이나 ‹pathlib›을 씁니다.

고치는 코드보다 중요한 것은 **알아보는 눈**입니다. 증상 문장을 원인에 연결해 두세요. "두 번째 호출부터 이전 값이 보인다"는 가변 기본값, "복사본을 바꿨는데 원본이 바뀐다"는 얕은 복사, "두 번째 합계가 0"은 이터레이터 소진, "고객 PC에서만 글자 오류"는 인코딩, "실행 위치에 따라 파일이 없다"는 경로입니다.`,
      code: `import copy

# 1) 가변 기본값 -- [BUGGY] 기본값 리스트는 함수를 정의할 때 딱 한 번 만들어진다
def add_tag(tag, tags=[]):
    tags.append(tag)
    return tags
print(add_tag("식비"), add_tag("교통"))        # ['식비', '교통'] ['식비', '교통']  (같은 리스트)

def add_tag_ok(tag, tags=None):               # [FIXED]
    tags = [] if tags is None else tags
    tags.append(tag)
    return tags
print(add_tag_ok("식비"), add_tag_ok("교통"))  # ['식비'] ['교통']

# 2) 얕은 복사 -- [BUGGY] dict(...)는 바깥 껍데기만 복사한다
budget = {"식비": {"limit": 300000, "spent": 0}}
snap = dict(budget)
budget["식비"]["spent"] = 50000
print(snap["식비"]["spent"])                   # 50000  (기대: 0)
budget["식비"]["spent"] = 0
snap = copy.deepcopy(budget)                  # [FIXED]
budget["식비"]["spent"] = 50000
print(snap["식비"]["spent"])                   # 0

# 3) 이터레이터 소진 -- [BUGGY] 제너레이터는 한 번만 읽힌다
entries = [{"paid": True}, {"paid": False}, {"paid": True}]
paid = (e for e in entries if e["paid"])
print(sum(1 for _ in paid), sum(1 for _ in paid))   # 2 0
paid = [e for e in entries if e["paid"]]            # [FIXED] 두 번 쓸 거면 list로
print(len(paid), len(paid))                         # 2 2

# 4) 인코딩 -- 엑셀 'CSV UTF-8' 파일은 보통 맨 앞에 BOM(\\ufeff)이 붙는다
data = "날짜,금액\\n2026-10-03,12000\\n".encode("utf-8-sig")
head = data.decode("utf-8").split(",")[0]           # [BUGGY]
print(head == "날짜", repr(head))                    # False '\\ufeff날짜'
head = data.decode("utf-8-sig").split(",")[0]       # [FIXED]
print(head == "날짜")                                # True

# 5) 경로 -- 백슬래시 이스케이프와 현재 작업 디렉터리
print(len("C:\\new\\table.csv"), len(r"C:\\new\\table.csv"))   # 14 16  (\\n, \\t가 문자 하나로 바뀜)
# [BUGGY] open("data/ledger.json")  -> 실행한 위치(cwd)에 따라 FileNotFoundError
# [FIXED] Path(__file__).resolve().parent / "data" / "ledger.json"`,
      codeLang: `python`,
      key: [
        `기본값 식은 def를 실행할 때 한 번만 평가된다. 변경 가능한 기본값은 None 센티널로 대체한다.`,
        `dict(), list(), copy.copy(), [:]는 얕은 복사다. 중첩 구조는 deepcopy 또는 매번 새로 만드는 팩토리를 쓴다.`,
        `제너레이터·map·파일 객체는 한 번만 읽힌다. 두 번 쓸 데이터는 list로 구체화한다.`,
        `파일·네트워크 경계에서는 encoding을 항상 명시한다(엑셀 CSV는 utf-8-sig). 상대 경로는 cwd 기준이므로 __file__에서 출발한다.`
      ],
      pitfalls: [
        `얕은 복사로 만든 "백업"이 원본과 같이 바뀌는데, 값을 비교해 보지 않고 복사가 됐다고 믿는다.`,
        `두 번째 순회가 0건이라는 이유로 데이터 문제를 의심하며 DB를 뒤진다. 먼저 이터레이터인지 확인한다.`,
        `UnicodeDecodeError를 errors="ignore"로 덮어 글자를 조용히 잃는다.`,
        `IDE에서 되니 서버에서도 될 것이라 믿는다. cwd와 환경 변수가 다르면 경로 버그는 배포 후에 터진다.`
      ]
    },
    {
      title: `SQL 버그 (JOIN 중복·NULL·GROUP BY·인덱스가 안 타는 쿼리)`,
      body: `SQL 버그는 에러가 나지 않고 **그럴듯한 틀린 숫자**를 내서 더 위험합니다. 고객은 "매출이 2배로 나와요"라고 말하지 "JOIN이 팬아웃돼요"라고 말하지 않습니다. 대부분 다섯 가지 패턴 중 하나입니다. 모두 레슨 코드에서 sqlite3로 돌려 볼 수 있습니다.

### 1. JOIN 중복(팬아웃)
주문 1건에 품목이 3개면 ‹orders JOIN items›는 그 주문을 3행으로 늘립니다. 그 위에서 ‹SUM(o.total)›을 하면 주문 금액이 3번 더해집니다. 진단은 조인 전후의 행 수를 비교하는 것입니다. ‹SELECT o.id, COUNT(*) ... GROUP BY o.id HAVING COUNT(*) > 1›로 중복되는 키를 찾습니다. 해결은 **집계 단위를 맞추는 것**입니다. 주문 합계는 orders만으로 계산하거나, items를 주문 단위로 먼저 집계한 뒤 조인합니다. ‹SUM(DISTINCT o.total)›로 덮는 것은 금액이 같은 서로 다른 주문을 하나로 합쳐 버려서 또 다른 틀린 숫자를 만듭니다. ‹LEFT JOIN›에 ‹WHERE o.status = 'paid'›를 쓰면 NULL 행이 걸러져 사실상 INNER JOIN이 되니, 오른쪽 표의 조건은 ON 절에 둡니다.

### 2. NULL은 거짓이 아니라 "모름"
SQL은 참·거짓·모름(UNKNOWN) 세 값을 씁니다. ‹x = NULL›과 ‹x <> 'a'›는 NULL 행에서 참이 아니라 모름이라 WHERE에서 제외됩니다. NULL 검사는 ‹IS NULL›로 합니다. SQLite 문서 기준으로 ‹COUNT(*)›는 모든 행을, ‹COUNT(x)›는 NULL이 아닌 행만 세고, ‹SUM›·‹AVG›는 NULL을 무시하며 값이 하나도 없으면 NULL을 돌려줍니다(0이 아님). 가장 위험한 것은 ‹NOT IN›입니다. 서브쿼리에 NULL이 하나라도 있으면 어떤 값도 "확실히 포함되지 않음"이 되지 못해 결과가 통째로 빕니다. ‹NOT EXISTS›를 쓰거나 서브쿼리에 ‹IS NOT NULL›을 붙입니다.

### 3. GROUP BY 밖의 컬럼
SELECT 목록의 컬럼은 GROUP BY 키이거나 집계여야 합니다(기본 키로 묶으면 같은 표의 나머지 컬럼은 함수 종속이라 허용되는 예외가 있습니다). PostgreSQL은 이 규칙을 어기면 오류를 내지만, SQLite는 조용히 그룹 안의 아무 행에서 값을 골라 줍니다. MySQL은 ONLY_FULL_GROUP_BY 모드가 켜져 있으면 거부하고(기본값), 꺼져 있으면 서버가 아무 값이나 고르며 ORDER BY로도 통제할 수 없습니다. 개발 DB에서 되던 쿼리가 운영 DB 이전 뒤에 깨지거나, 더 나쁘게는 임의의 값이 섞여 나옵니다. 필요한 컬럼은 키에 넣거나 MAX 같은 집계로 명시하세요.

### 4. 인덱스가 안 타는 쿼리
인덱스는 ‹컬럼 연산자 값› 꼴의 조건에서 쓰입니다(SQLite 최적화 문서). 컬럼에 함수나 연산을 씌우면(‹substr(col,1,7)›, ‹strftime(...)›, ‹col + 0›) 그 꼴이 깨져 풀 스캔이 됩니다. 앞이 와일드카드인 ‹LIKE '%abc'›, 복합 인덱스의 왼쪽 컬럼을 건너뛴 조건, 타입이 다른 값과의 비교(DB에 따라 오류가 나거나 조용히 형변환되며 인덱스를 못 씁니다)도 같은 부류입니다. 해결은 컬럼을 그대로 두고 값 쪽을 바꾸는 것(범위 조건)이거나, 표현식 인덱스를 만드는 것입니다.

확인은 추측이 아니라 계획으로 합니다. SQLite는 ‹EXPLAIN QUERY PLAN›에서 ‹SCAN t›(전체 읽기)와 ‹SEARCH t USING INDEX ...›(인덱스 사용)를 구분합니다. 이 출력 형식은 릴리스마다 바뀔 수 있으니 안정된 API가 아니라 진단 도구로만 쓰세요. 행이 몇십 개인 표에서는 풀 스캔이 오히려 정상일 수 있으므로 실제 데이터 크기에서 확인합니다.

### 방법: 5행짜리 표로 줄이기
SQL 버그도 최소 재현이 통합니다. 문제의 쿼리를 3~5행짜리 테이블에서 돌려 같은 증상이 나오는지 보세요. 그 표가 곧 회귀 테스트의 입력이 됩니다.`,
      code: `import sqlite3

con = sqlite3.connect(":memory:")
con.executescript("""
CREATE TABLE customers(id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE orders(id INTEGER PRIMARY KEY, customer_id INTEGER, total INTEGER, ordered_at TEXT);
CREATE TABLE items(order_id INTEGER, sku TEXT, qty INTEGER);
CREATE INDEX idx_orders_date ON orders(ordered_at);
INSERT INTO customers VALUES (10, 'kim'), (11, 'lee');
INSERT INTO orders VALUES (1, 10, 30000, '2026-10-02'), (2, 10, 20000, '2026-10-15'),
                          (3, NULL, 5000, '2026-11-01');
INSERT INTO items VALUES (1, 'A', 1), (1, 'B', 2), (1, 'C', 1), (2, 'A', 1);
""")
q = lambda sql: con.execute(sql).fetchall()
plan = lambda sql: [r[3] for r in con.execute("EXPLAIN QUERY PLAN " + sql)]

# [BUGGY 1] JOIN 팬아웃: 품목이 3개인 주문 1이 3번 합산된다
print(q("SELECT SUM(o.total) FROM orders o JOIN items i ON i.order_id = o.id"))   # [(110000,)]
# [FIXED 1] 합산 전에 '주문 한 줄 = 한 행'으로 맞춘다 (EXISTS 또는 먼저 집계)
print(q("SELECT SUM(total) FROM orders o WHERE EXISTS "
        "(SELECT 1 FROM items i WHERE i.order_id = o.id)"))                      # [(50000,)]

# [BUGGY 2] NOT IN + NULL: 서브쿼리에 NULL이 하나라도 있으면 결과가 비어 버린다
print(q("SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)"))   # []
# [FIXED 2]
print(q("SELECT name FROM customers c WHERE NOT EXISTS "
        "(SELECT 1 FROM orders o WHERE o.customer_id = c.id)"))                  # [('lee',)]

# [BUGGY 3] 컬럼에 함수를 씌우면 인덱스를 못 쓴다
bad = "SELECT * FROM orders WHERE substr(ordered_at, 1, 7) = '2026-10'"
print(plan(bad))                                   # ['SCAN orders']
# [FIXED 3] 컬럼은 그대로 두고 범위로 바꾼다
good = "SELECT * FROM orders WHERE ordered_at >= '2026-10-01' AND ordered_at < '2026-11-01'"
print(plan(good))                                  # ['SEARCH orders USING INDEX idx_orders_date (ordered_at>? AND ordered_at<?)']
assert q(bad) == q(good)

# [BUGGY 4] GROUP BY 밖의 컬럼: SQLite는 조용히 아무 행의 값을 골라 준다 (PostgreSQL은 오류)
print(q("SELECT customer_id, ordered_at, SUM(total) FROM orders GROUP BY customer_id"))
# [(None, '2026-11-01', 5000), (10, '2026-10-02', 50000)]  <- ordered_at은 그룹 안의 임의 값 (SQLite 버전·실행 계획에 따라 다른 행이 나올 수 있다)`,
      codeLang: `python`,
      key: [
        `JOIN은 1:N에서 행을 늘린다. 합계가 N배라면 먼저 조인 전후의 행 수를 센다. DISTINCT로 덮지 않는다.`,
        `NULL은 "모름"이다. = NULL 대신 IS NULL, 서브쿼리에 NULL이 가능하면 NOT IN 대신 NOT EXISTS.`,
        `GROUP BY 밖의 컬럼은 DB마다 다르게 동작한다(PostgreSQL 오류, SQLite 임의 값). 집계나 키로 명시한다.`,
        `컬럼에 함수를 씌우면 인덱스를 못 쓴다. EXPLAIN에서 SCAN/Seq Scan인지 SEARCH/Index Scan인지 확인한다.`
      ],
      pitfalls: [
        `중복 때문에 합계가 커지면 SUM(DISTINCT ...)나 DISTINCT를 붙여 숫자를 "맞춘다". 값이 같은 서로 다른 행까지 합쳐져 다른 오류가 생긴다.`,
        `NOT IN이 0건을 돌려주면 "해당자가 없다"고 보고한다. NULL 행 때문에 쿼리가 비는 것일 수 있다.`,
        `인덱스를 만들고도 쿼리는 그대로 두어, 인덱스를 못 쓰는 형태가 유지된다. 계획으로 확인하지 않고 "인덱스 걸었다"고 보고한다.`,
        `행이 몇십 개인 개발 DB의 EXPLAIN만 보고 결론을 낸다. 실제 크기에서 다시 확인한다.`
      ]
    },
    {
      title: `서버 로그 읽기와 원인 추적`,
      body: `로그는 사고 현장에 남은 **유일한 사후 증거**입니다. 다만 로그는 "그때 남기기로 한 것"만 담고 있고, 서버 여러 대·비동기 처리에서는 줄의 순서가 곧 인과 순서도 아닙니다(두 서버의 시계가 몇 초만 어긋나도 원인과 결과가 뒤바뀐 듯 보입니다). 그래서 로그는 정답이 아니라 가설을 시험하는 증거로 읽어야 합니다. 읽기 전에 구조부터 알아야 합니다. 좋은 로그 한 줄에는 시각(타임존 표기 포함), 레벨, 요청 ID, 무엇을 했는지, 결과(상태 코드·소요 시간)가 있습니다. 서버마다 UTC(‹Z›)와 KST(‹+09:00›)가 섞여 있으면 "고객이 말한 시각"과 로그 시각이 9시간 어긋납니다. 가장 먼저 타임존을 맞추세요.

### 원인 추적 다섯 단계
1. **시간 범위 확정**: 고객 신고 시각 앞뒤로 넉넉히 잡습니다. 신고는 문제가 시작된 뒤에 오므로 시작 시각은 더 앞입니다.
2. **한 요청을 끝까지 따라가기**: 요청 ID(상관관계 ID)로 그 요청의 모든 줄을 모읍니다. SRE 책도 구성 요소를 가로지르는 일관된 식별자가 문제 해결을 크게 쉽게 한다고 말합니다. 요청 ID가 없다면 그것이 첫 개선 과제입니다.
3. **가장 시끄러운 오류가 아니라 첫 오류를 찾기**: 연쇄 장애에서는 뒤따르는 오류가 훨씬 많습니다. 시간순으로 정렬해 가장 먼저 나온 이상 신호를 보세요.
4. **변경 이벤트와 맞추기**: 배포, 설정 변경, 크론, 트래픽 급증, 인증서 만료 시각을 겹쳐 봅니다. 장애의 상당수는 "무언가 바뀐 직후"에 시작합니다.
5. **전후를 비교해 신호와 소음을 가르기**: 평소에도 같은 비율로 나오는 WARN은 소음입니다. 배포 전에는 없다가 후에 생긴 패턴이 신호입니다.

### 숫자로 말하기
"에러가 많다"가 아니라 **같은 엔드포인트의 5xx 수 ÷ 요청 수**로 말합니다. 소요 시간은 평균이 아니라 분포를 봅니다. 특히 **실패한 요청의 소요 시간이 특정 값에 몰려 있다면 그것은 설정 상수의 지문**입니다. 레슨 코드의 실패는 모두 300~302ms에 몰려 있고 새 타임아웃이 300ms입니다. 결제사 장애였다면 소요 시간이 제각각이거나 타임아웃 값과 무관하게 퍼졌을 겁니다.

### 가설을 틀릴 수 있게 세우기
"배포가 원인이다"라는 가설에서 예측을 꺼냅니다. "배포 전의 같은 요청은 성공하고 배포 후부터 실패한다." 로그에서 이 예측이 깨지면(배포 전에도 같은 비율로 실패) 가설을 버립니다. "결제사 장애다"라는 가설의 예측은 "다른 고객·다른 엔드포인트의 결제 호출도 같은 시각에 실패한다"입니다.

### 도구와 현실의 함정
‹grep›/‹rg›, ‹sort | uniq -c›, JSON 로그에는 ‹jq›, Windows에는 ‹Select-String›, 복잡해지면 레슨 코드처럼 짧은 Python 스크립트가 가장 안정적입니다. 함정은 많습니다. 로그 로테이션으로 필요한 시각의 로그가 이미 지워졌거나, 샘플링 때문에 일부만 남았거나, 서버가 여러 대라 다른 서버 로그를 보고 있을 수 있습니다. "로그에 없다"는 것도 증거입니다. 요청이 서버에 도착한 흔적이 아예 없다면 문제는 앞단(로드밸런서·DNS)입니다.

마지막으로 고객 로그를 받을 때는 개인정보가 섞여 있는지, 내 PC로 옮겨도 되는지를 먼저 합의하고, 저장 전에 마스킹하세요.`,
      code: `import re
from collections import Counter

# 아래 LOG는 '장애 당일 서버 로그'다 (실제 사고 기록이 아닌 가상의 예). 버그가 아니라 증거물이다.
LOG = """
14:19:41 INFO  req=a100 POST /orders 201 131ms
14:19:55 INFO  req=a101 POST /orders 201 118ms
14:19:58 INFO  deploy v1.8.2 payments.timeout_ms=300 (prev=3000)
14:20:03 INFO  req=a102 GET /orders/7 200 12ms
14:20:10 INFO  req=a103 POST /orders 201 250ms
14:20:20 ERROR req=a104 POST /orders 500 301ms ReadTimeout payments
14:20:31 ERROR req=a105 POST /orders 500 300ms ReadTimeout payments
14:20:40 INFO  req=a106 GET /orders/7 200 11ms
14:20:52 ERROR req=a107 POST /orders 500 302ms ReadTimeout payments
14:21:05 INFO  req=a108 POST /orders 201 140ms
14:21:11 ERROR req=a109 POST /orders 500 300ms ReadTimeout payments
14:21:44 INFO  req=a110 POST /orders 201 210ms
"""

LINE = re.compile(r"(\\S+) (\\w+)\\s+(.*)")
REQ = re.compile(r"req=(\\w+) (\\w+) (\\S+) (\\d+) (\\d+)ms ?(.*)")

phase, stats, causes, fail_ms = "전", {"전": [0, 0], "후": [0, 0]}, Counter(), []
for raw in LOG.strip().splitlines():
    ts, level, rest = LINE.match(raw).groups()
    if rest.startswith("deploy"):
        phase = "후"
        print("배포 시각", ts, "->", rest)
        continue
    m = REQ.match(rest)
    if m and m[2] == "POST" and m[3] == "/orders":
        stats[phase][0] += 1
        if m[4].startswith("5"):
            stats[phase][1] += 1
            causes[m[6]] += 1
            fail_ms.append(int(m[5]))

print("POST /orders [요청, 5xx]:", stats)       # {'전': [2, 0], '후': [7, 4]}
print("원인 분포:", dict(causes))                # {'ReadTimeout payments': 4}
print("실패 요청 소요시간(ms):", sorted(fail_ms))  # [300, 300, 301, 302]  <- 새 설정값 300ms 근처에 몰림
# 조치(FIXED): payments.timeout_ms를 3000으로 되돌리고(롤백), 같은 오타가 배포되지 않게 설정 검증을 추가한다 (레슨 8)`,
      codeLang: `python`,
      key: [
        `로그를 읽기 전에 타임존부터 맞춘다. 신고 시각보다 문제 시작 시각이 앞선다.`,
        `요청 ID로 한 요청을 끝까지 따라가고, 가장 시끄러운 오류가 아니라 시간순으로 첫 이상 신호를 찾는다.`,
        `배포·설정 변경 시각과 첫 오류를 겹쳐 보고, 배포 전후의 비율을 비교해 소음(항상 있는 것)과 신호(변화)를 가른다.`,
        `실패 소요 시간이 특정 값에 몰리면 그 값을 만든 설정 상수를 찾는다. 가설은 틀릴 수 있는 예측으로 시험한다.`
      ],
      pitfalls: [
        `가장 많이 찍힌 에러 메시지를 원인으로 단정한다. 연쇄 장애에서는 결과가 원인보다 훨씬 많이 찍힌다.`,
        `타임존을 확인하지 않고 고객이 말한 시각대의 로그만 보다가 엉뚱한 구간을 분석한다.`,
        `전후 비교 없이 WARN을 원인으로 몰아간다. 장애 전에도 같은 비율이던 소음일 수 있다.`,
        `고객이 준 로그를 마스킹 없이 개인 저장소·AI 서비스·메신저에 올린다.`
      ]
    },
    {
      title: `성능 문제를 찾는 법 (프로파일링·EXPLAIN)`,
      body: `성능 문제의 첫 원칙은 **측정 전에는 고치지 않는다**입니다. "느리다"를 숫자로 바꾸세요. 기대는 200ms, 실제는 6.9초. 어디서 시간이 쓰이는지 모르는 채 고친 곳의 90%는 병목이 아닙니다. 전체 시간의 10%를 차지하는 부분을 2배 빠르게 만들어도 전체는 5%만 줄어듭니다.

### 순서
1. 재현 가능한 벤치마크: 같은 입력, 같은 환경. 첫 실행은 캐시 때문에 다르니 여러 번 재고 첫 값은 버립니다.
2. 프로파일링: 시간이 쓰이는 곳을 찾습니다.
3. 가장 큰 덩어리 하나를 고칩니다.
4. 같은 벤치마크로 다시 재고, 결과가 같은지 먼저 확인합니다. 빠르지만 틀린 코드는 개선이 아닙니다.

### cProfile 읽기
cProfile은 **결정적(deterministic) 프로파일러**로 모든 함수 호출·반환 이벤트를 기록합니다(공식 문서). Python 3.15 문서에서는 ‹profiling.tracing›이 본체이고 ‹cProfile›은 하위 호환 별칭으로 계속 쓸 수 있습니다(2026-11 기준). 샘플링 방식의 ‹profiling.sampling›도 문서에 소개되는데, 호출 스택을 주기적으로 찍어 시간을 통계적으로 추정하므로 오버헤드는 보통 적지만 호출 횟수는 정확한 값이 아닙니다(결정적 방식은 정확한 호출 횟수를 줍니다).
|열|의미|
|ncalls|호출 횟수|
|tottime|그 함수 자체에서 쓴 시간(하위 호출 제외)|
|cumtime|하위 호출까지 합친 시간|
|percall|각각 시간을 호출 수로 나눈 값|
읽는 법은 세 가지입니다. ‹tottime›이 큰 함수는 그 함수의 루프가 무거운 것, ‹cumtime›은 큰데 ‹tottime›이 작으면 시간을 아래 호출에서 쓰는 것, ‹ncalls›가 이상하게 크면 **호출 폭증**입니다. 프로파일링 자체가 느려지게 하므로 절대 시간이 아니라 상대 비교로 보세요.

### 흔한 병목 다섯 가지
- **N+1 쿼리**: 목록 1번 + 항목마다 1번. 로컬 SQLite에서는 5,000번이 0.05초여도, 네트워크로 연결된 DB에서 왕복 1ms라고 가정하면 5초(가정치)입니다. 한 번에 묶어(IN, JOIN) 가져오세요.
- **인덱스 없는 조회**: 풀 스캔은 데이터가 늘수록 선형으로 느려집니다.
- **리스트 안의 ‹in›**: ‹x in some_list›는 길이에 비례합니다. 반복 안에서 쓰면 O(n²)이니 set·dict로 바꿉니다.
- **반복 안의 I/O**: 반복마다 파일을 열거나 HTTP를 호출합니다.
- **큰 문자열 조립**: 큰 반복에서는 리스트에 모아 한 번에 join합니다.

### EXPLAIN으로 쿼리 읽기
PostgreSQL의 ‹EXPLAIN›은 계획과 추정치만, ‹EXPLAIN ANALYZE›는 **실제로 쿼리를 실행**해 실제 시간·행 수·루프 수를 더해 줍니다. 실행되므로 UPDATE·DELETE는 ‹BEGIN; EXPLAIN ANALYZE ...; ROLLBACK;›으로 감쌉니다(공식 문서). 확인할 것은 첫째 추정 행 수와 실제 행 수의 차이(크면 통계가 낡았으니 ANALYZE), 둘째 ‹Seq Scan›에 붙은 ‹Filter›와 ‹Rows Removed by Filter›(많이 읽고 버린다는 증거), 셋째 ‹loops›(per-loop 평균이므로 곱해서 봄), 넷째 ‹BUFFERS›의 hit/read입니다. cost는 임의 단위라 ms와 직접 비교하지 않습니다. Seq Scan이 항상 나쁜 것도 아닙니다. 대부분의 행을 읽어야 한다면 풀 스캔이 더 빠릅니다. SQLite는 ‹EXPLAIN QUERY PLAN›의 SCAN/SEARCH로 비슷하게 봅니다. 인덱스는 읽기를 빠르게 하는 대신 쓰기 비용과 저장 공간을 치르므로, 개선은 항상 전후 수치로 입증하세요.`,
      code: `import cProfile
import io
import pstats
import sqlite3
import time

con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE orders(id INTEGER PRIMARY KEY, total INTEGER)")
con.executemany("INSERT INTO orders VALUES (?, ?)", ((i, i * 10) for i in range(1, 5001)))
ids = list(range(1, 5001))
queries = []
con.set_trace_callback(queries.append)          # 실행된 SQL을 센다

def totals_n_plus_one(ids):                     # [BUGGY] id마다 쿼리 1번 = N+1
    return [con.execute("SELECT total FROM orders WHERE id = ?", (i,)).fetchone()[0] for i in ids]

def totals_batched(ids, chunk=500):             # [FIXED] 묶어서 가져온다 (?의 개수 한도가 있어 chunk로 나눔. SQLite 기본값은 3.32.0 이전 999, 이후 32766)
    out = {}
    for k in range(0, len(ids), chunk):
        part = ids[k:k + chunk]
        sql = "SELECT id, total FROM orders WHERE id IN (%s)" % ",".join("?" * len(part))
        out.update(con.execute(sql, part).fetchall())
    return [out[i] for i in ids]

def timed(fn, *args):
    queries.clear()
    t = time.perf_counter()
    result = fn(*args)
    return result, len(queries), time.perf_counter() - t

r1, n1, t1 = timed(totals_n_plus_one, ids)
r2, n2, t2 = timed(totals_batched, ids)
assert r1 == r2                                 # 속도를 올리기 전에 결과가 같은지부터 확인한다
print("쿼리 수", n1, "->", n2, "/ 시간(초)", round(t1, 3), "->", round(t2, 3))   # 쿼리 수 5000 -> 10

pr = cProfile.Profile()
pr.enable()
totals_n_plus_one(ids)
pr.disable()
buf = io.StringIO()
pstats.Stats(pr, stream=buf).sort_stats("tottime").print_stats(3)
print(buf.getvalue())
# 출력 예 (숫자는 환경마다 다르다): ncalls가 5000인 execute가 맨 위에 온다
#    ncalls  tottime  percall  cumtime  percall filename:lineno(function)
#      5000    0.024    0.000    0.024    0.000 {method 'execute' of 'sqlite3.Connection' objects}
#         1    0.012    0.012    0.044    0.044 report.py:14(totals_n_plus_one)`,
      codeLang: `python`,
      key: [
        `측정 전에는 고치지 않는다. 기대값과 실제값을 숫자로, 같은 입력으로 전후를 비교한다. 결과 동일 여부도 먼저 확인한다.`,
        `cProfile에서 tottime은 자기 시간, cumtime은 하위 포함 시간, ncalls 폭증은 N+1 같은 호출 폭증의 신호다.`,
        `EXPLAIN ANALYZE는 쿼리를 실제로 실행한다. 데이터를 바꾸는 쿼리는 BEGIN과 ROLLBACK으로 감싼다.`,
        `추정 행 수와 실제 행 수의 차이, Seq Scan의 Filter와 Rows Removed, loops를 읽는다. cost는 ms가 아니다.`
      ],
      pitfalls: [
        `측정 없이 "이 루프가 느려 보여서" 마이크로 최적화를 하고, 실제 병목(DB 왕복)은 그대로 둔다.`,
        `로컬 소규모 DB에서만 재고 N+1을 무시한다. 네트워크 DB에서는 왕복 지연이 곱해져 장애가 된다.`,
        `UPDATE·DELETE에 EXPLAIN ANALYZE를 그대로 돌려 운영 데이터를 실제로 바꾼다.`,
        `첫 실행(캐시 없음)과 두 번째 실행(캐시 있음)을 비교해 개선했다고 착각한다.`
      ]
    },
    {
      title: `운영 장애를 고객에게 설명하는 법과 재발 방지 기록`,
      body: `이 레슨은 앞의 도구들을 한 사건으로 묶는 **통합 사례**입니다. 가상의 쇼핑몰 '한빛상회' 사장님이 11월 3일(화) 14:30에 연락합니다. "결제가 자꾸 실패했고, 대시보드 매출이 어제보다 이상하게 커요."

### 1. 접수와 증거 보존 (14:30)
증상을 기대/실제/시각/영향 범위로 되묻습니다. 로그를 먼저 복사해 두세요. 로테이션으로 사라지면 조사가 불가능합니다. 이 단계에서 "곧 해결됩니다"는 약속하지 않습니다. 원인을 모르기 때문입니다.

### 2. 완화가 먼저, 원인은 그다음 (14:35~14:50)
SRE 책은 문제 해결에서 서비스 복구(triage)를 근본 원인 탐색보다 앞에 둡니다. 레슨 6의 방법으로 로그를 보면 배포 v1.8.2(14:19:58) 직후 14:20:00부터 POST /orders의 500이 시작되고, 실패한 요청은 모두 ‹ReadTimeout payments›이며 소요 시간이 300~303ms에 몰려 있습니다. 배포 로그에는 ‹payments.timeout_ms=300 (prev=3000)›이 있습니다. 가설(설정 오타)의 예측은 "이전 값으로 되돌리면 실패가 멈춘다"이고, 14:50에 되돌리자 5xx가 0건이 되어 확인됩니다.

### 3. 두 번째 증상은 별개의 원인
대시보드 매출이 큰 것은 결제 장애와 상관이 없습니다. 2주 전 order_items 표가 도입된 뒤 리포트 쿼리가 주문을 품목 수만큼 늘려 합산하고 있었고, 우연히 같은 날 사장님이 발견했을 뿐입니다(레슨 5의 JOIN 팬아웃). 두 사건을 하나로 뭉뚱그리면 설명이 틀립니다. **같은 날 일어난 일이 같은 원인은 아닙니다.**

### 4. 수정과 회귀 테스트
설정은 복구, 쿼리는 주문 단위로 집계하도록 수정합니다. 최소 재현(주문 2건·품목 3건)을 테스트로 만들어 전후 수치를 보고서에 담습니다.

### 5. 고객에게 설명하기
고객이 알고 싶은 것은 기술이 아니라 **무슨 일이었나, 내 사업에 얼마나 영향이 있었나, 이제 안전한가, 내가 할 일이 있나**입니다. 좋은 안내문은 영향(건수·시간), 원인(전문용어 없이), 조치, 아직 확인하지 못한 것과 다음 안내 시각, 재발 방지 약속을 담습니다. 이 사례에서는 실패한 240건에 결제가 실제로 승인됐는지 아직 모릅니다(타임아웃은 "결과를 모른다"는 뜻입니다). 확인하지 않은 것을 "문제없다"고 쓰면 안 되고, 모른다고 적고 언제까지 알려 드리겠다고 약속합니다. 피할 것은 추측과 남 탓("결제사 문제로 보입니다"), 개인 비난, 모호한 사과("불안정했습니다"), 사실을 줄이거나 부풀리는 표현입니다.

### 6. 무책 포스트모템과 재발 방지
내부 문서는 영향·타임라인·근본 원인·잘된 점/아쉬운 점·액션 아이템으로 씁니다. SRE 책의 원칙은 **개인이 아니라 시스템을 고치는 것**입니다. "누가 오타를 냈나"가 아니라 "오타가 검증 없이 배포까지 간 이유"를 묻습니다. 사람은 고칠 수 없지만 검증·알림·절차는 고칠 수 있습니다. 액션 아이템에는 담당자·기한·완료를 확인하는 방법을 붙이고, 그 항목이 테스트나 자동 점검으로 남아야 재발이 막힙니다.

외주라면 마지막에 범위를 확인합니다. 긴급 대응·포스트모템 작성이 유지보수 계약에 포함되는지, 별도 견적인지를 사건이 터지기 전에 합의해 두어야 분쟁이 줄어듭니다.`,
      code: `[고객 안내문 — 예시] (가상 사례: 쇼핑몰 '한빛상회', 11월 3일)
제목: 11월 3일 주문 결제 오류 안내 (원인과 조치)

1) 무슨 일이 있었나요
   14:19 업데이트 이후 14:50까지 주문 요청 721건 중 240건(약 33%)이 실패했습니다.
2) 왜 생겼나요
   14:19 업데이트에서 결제사 응답을 기다리는 시간이 3초에서 0.3초로 잘못 설정되어,
   응답이 조금만 늦어도 주문이 실패 처리되었습니다.
3) 어떻게 해결했나요
   14:50에 설정을 원래 값으로 되돌렸고, 이후 같은 오류는 없습니다.
4) 아직 확인 중인 것
   실패한 240건의 결제 승인 여부는 결제사 내역과 대조 중입니다.
   11월 4일 오전 10시까지 결과와 필요한 조치를 별도로 안내드리겠습니다.
5) 앞으로
   업데이트 후 5분간 주문 실패율을 자동 점검하고, 기준을 넘으면 즉시 알림을 받아
   되돌리도록 11월 10일까지 적용하겠습니다.

[내부 포스트모템 — 요약] (무책 원칙: 사람이 아니라 시스템을 고친다)
- 영향: 배포 후 약 30분간(14:19:58~14:50), POST /orders 5xx 240/721 (33.3%), 고객 문의 1건
- 타임라인(KST): 14:19:58 배포 / 14:20:00 첫 500 / 14:30 고객 연락 / 14:41 설정 변경 의심
                14:50 설정 복구 / 14:55 5xx 0건 확인
- 근본 원인: 설정 값 오타(3000 -> 300)가 검증 없이 배포되고, 배포 후 점검도 없었다
- 탐지 공백: 고객 연락(10분 후)이 첫 신호였다. 자체 알림이 없었다
- 잘된 점 / 아쉬운 점: 로그 보존·완화 우선 / 요청 ID 없음, 롤백 절차 문서 없음
- 액션 아이템 (담당 / 기한 / 확인 방법)
  1. payments.timeout_ms < 1000 이면 배포 중단하는 설정 검증 (개발 / 11-06 / 단위 테스트)
  2. 배포 후 5분 5xx율 점검과 알림 (개발 / 11-10 / 모의 장애로 알림 도착 확인)
  3. 실패 240건 결제 승인 대조 (운영 / 11-04 / 대조 결과표)`,
      codeLang: `text`,
      key: [
        `사건의 순서는 접수·증거 보존 → 완화 → 원인 규명 → 수정과 회귀 테스트 → 고객 설명 → 무책 포스트모템이다. 완화가 원인 탐색보다 먼저다.`,
        `같은 날 생긴 두 증상이 같은 원인이라는 보장은 없다. 원인마다 따로 증거를 대고 설명한다.`,
        `고객 안내문에는 영향 수치·쉬운 말의 원인·조치·아직 모르는 것과 다음 안내 시각·재발 방지를 담고, 확인하지 않은 것은 단정하지 않는다.`,
        `포스트모템의 액션 아이템에는 담당·기한·검증 방법이 있어야 하며, 가능하면 테스트나 자동 점검으로 남긴다.`
      ],
      pitfalls: [
        `원인을 모르는 단계에서 "금방 해결됩니다"라고 약속하거나, 결과가 불확실한 것(결제 승인 여부)을 "문제없음"으로 적는다.`,
        `"결제사 탓"이나 "담당자 실수" 같은 추측·비난을 안내문과 포스트모템에 쓴다. 신뢰도 시스템 개선도 얻지 못한다.`,
        `재발 방지를 "더 주의하겠습니다"로 끝낸다. 검증할 수 없는 약속은 다음 사고를 막지 못한다.`,
        `긴급 대응과 포스트모템 작성이 계약에 포함되는지 모른 채 시작해 대금과 범위를 두고 다툰다.`
      ]
    }
  ],
  labs: [
    {
      title: `고장 난 가계부 유틸 고치기 (증상 5개, 원인 6개)`,
      scenario: `고객(개인 사업자)에게 인수받은 보조 모듈 ‹ledger_bug.py›가 있습니다. 아래 줄을 **그대로 위에서 아래 순서로** 파일에 붙여 넣으세요. 한 줄이 문장 하나입니다. 이것이 버그가 있는 원본(BUGGY)이며 고친 답은 어디에도 없습니다. 고객이 보고한 증상은 다섯 가지입니다.

- ‹import csv›
- ‹def add_entry(entry, bucket=[]): bucket.append(entry); return bucket›
- ‹def snapshot(budget): return dict(budget)›
- ‹def latest(entries): return max(entries, key=lambda e: e["date"])›
- ‹def category_stats(entries): cats = (e["category"] for e in entries); total = len(list(cats)); return total, len(set(cats))›
- ‹def load_rows(path): return [(r["날짜"], int(r["금액"])) for r in csv.DictReader(open(path, encoding="utf-8"))]›
- ‹def load_default(): return load_rows("data/in.csv")›
- ‹if __name__ == "__main__": print(load_default())›

테스트 데이터는 별도 파일 ‹make_data.py›로 만들고 프로젝트 폴더에서 한 번 실행합니다.

- ‹import os; os.makedirs("data", exist_ok=True)›
- ‹f = open("data/in.csv", "w", encoding="utf-8-sig"); print("날짜,금액", file=f); print("2026-10-03,12000", file=f); print("2026-10-12,8500", file=f); f.close()›

증상: (A) ‹add_entry›를 bucket 없이 두 번 부르면 두 번째 결과의 길이가 2입니다(기대 1). (B) ‹snapshot›으로 예산을 복사한 뒤 원본의 중첩 값을 바꾸면 스냅샷도 같이 바뀝니다. (C) 날짜가 ‹"2026-9-30"›과 ‹"2026-10-2"›일 때 ‹latest›가 9월 30일 행을 돌려줍니다. (D) 항목이 3개(분류 2종)인데 ‹category_stats›가 ‹(3, 0)›을 돌려줍니다(기대 ‹(3, 2)›). (E) ‹load_default()›가 ‹KeyError: '날짜'›로 죽고, 프로젝트 폴더 밖에서 실행하면 파일을 못 찾습니다.`,
      steps: [
        `두 파일을 만들고 ‹python make_data.py›로 데이터를 만든 뒤 ‹python ledger_bug.py›를 실행해 증상 E를 직접 확인한다. 나머지 증상(A~D)도 짧은 스크립트로 재현해 눈으로 확인한다.`,
        `‹test_ledger_bug.py›에 증상을 재현하는 unittest를 먼저 쓴다. A, B, C, D에 하나씩, E는 인코딩 하나와 경로 하나로 총 6개이며, 수정 전에는 6개 모두 실패(FAIL 또는 ERROR)해야 한다.`,
        `‹debug_log.md›에 증상마다 가설 한 줄과 틀릴 수 있는 예측 한 줄을 쓰고(예: 가설 "기본값 리스트가 공유된다", 예측 "두 번째 호출 결과에 첫 항목이 보인다"), print나 pdb로 예측을 확인한 결과를 적는다.`,
        `A와 B를 수정한다. 수정 전 테스트가 실패하다가 수정 후 통과하는 것을 확인한다.`,
        `C를 수정한다. 문자열 비교가 틀린 이유를 로그에 적고, 날짜를 숫자 튜플 등 비교 가능한 값으로 바꿔 해결한다.`,
        `D를 수정한다. 한 번 읽히면 끝나는 객체가 어디인지 로그에 적는다.`,
        `E를 수정한다. 인코딩과 경로, 두 원인을 각각 따로 고치고 각각의 테스트가 통과하는지 확인한다.`,
        `프로젝트 폴더의 상위 폴더에서 ‹python 폴더이름/ledger_bug.py›로 실행해 같은 출력이 나오는지 확인한다.`,
        `원인 → 수정 형태의 커밋 메시지를 6개 작성한다(예: "기본값 리스트 공유로 호출 간 오염 → None 센티널로 변경").`
      ],
      accept: [
        `수정 전 unittest 6개가 모두 실패하고, 수정 후 ‹python -m unittest -v›가 ‹Ran 6 tests›와 ‹OK›를 출력한다(테스트는 6개 이상).`,
        `‹load_default()›가 ‹[("2026-10-03", 12000), ("2026-10-12", 8500)]›를 돌려주고, 프로젝트 폴더 밖에서 실행해도 같다.`,
        `‹latest›가 ‹"2026-10-2"› 행을, ‹category_stats›가 ‹(3, 2)›를 돌려주며 ‹add_entry›를 두 번 불렀을 때 두 결과의 길이가 모두 1이다.`,
        `‹debug_log.md›에 증상별 가설·예측·확인 결과가 5줄 이상 있고, 각 수정이 어느 테스트를 통과시켰는지 적혀 있다.`
      ],
      stretch: `모듈을 dataclass ‹Entry›로 바꾸고(리스트 필드는 ‹field(default_factory=list)›), 날짜는 파일을 읽을 때 한 번만 ‹datetime.date›로 정규화하세요. 형식이 틀린 날짜는 "몇 번째 줄의 어떤 값"이 들어간 예외 메시지로 즉시 실패시키고, 그 실패 메시지도 테스트로 고정합니다.`
    },
    {
      title: `SQL 리포트 3종 바로잡기 (JOIN 중복·NULL·인덱스)`,
      scenario: `쇼핑몰 정산 리포트에서 숫자가 어긋난다는 제보가 왔습니다. 이 과제의 핵심은 쿼리를 고치는 기술보다 **고친 결과가 맞다고 증명하는 방법**입니다. 정답의 기준이 되는 숫자를 독립된 방법으로 먼저 구하고, 고친 쿼리가 그 숫자와 같아지는지, 실행 계획이 기대대로 바뀌는지를 확인하세요. 데이터는 고객 DB를 흉내 낸 가상의 것입니다. 아래 줄을 위에서 아래로 ‹shop_bug.py›에 붙여 넣으세요(한 줄이 문장 하나). Python 3 표준 라이브러리(sqlite3)만 씁니다. 앞의 여섯 줄은 데이터와 도우미 함수를 만들고, ‹Q1›~‹Q3›은 버그가 있는 원본 쿼리입니다. 고친 답은 어디에도 없습니다.

- ‹import sqlite3›
- ‹con = sqlite3.connect(":memory:"); con.executescript("CREATE TABLE customers(id INTEGER PRIMARY KEY, name TEXT); CREATE TABLE orders(id INTEGER PRIMARY KEY, customer_id INTEGER, total INTEGER, ordered_at TEXT); CREATE TABLE items(order_id INTEGER, sku TEXT, qty INTEGER);")›
- ‹con.executemany("INSERT INTO customers VALUES (?, ?)", ((i, "c%03d" % i) for i in range(1, 521)))›
- ‹con.executemany("INSERT INTO orders VALUES (?, ?, ?, ?)", ((i, None if i % 50 == 0 else i % 500 + 1, 1000 + (i * 37) % 9000, "2026-%02d-%02d" % (i % 12 + 1, i % 28 + 1)) for i in range(1, 20001)))›
- ‹con.executemany("INSERT INTO items VALUES (?, ?, ?)", ((i, "s%d" % k, 1 + (i + k) % 3) for i in range(1, 20001) for k in range(i % 3 + 1)))›
- ‹q = lambda sql: con.execute(sql).fetchall()›
- ‹Q1 = "SELECT c.name, SUM(o.total) FROM customers c JOIN orders o ON o.customer_id = c.id JOIN items i ON i.order_id = o.id GROUP BY c.id"›
- ‹Q2 = "SELECT COUNT(*) FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)"›
- ‹Q3 = "SELECT COUNT(*), SUM(total) FROM orders WHERE strftime('%Y-%m', ordered_at) = '2026-10'"›

제보 내용: (Q1) 고객별 매출 합계를 모두 더하면 정산 시스템 값의 약 2배입니다. (Q2) "주문이 한 번도 없는 고객" 명단이 0명인데 영업팀은 있다고 합니다. (Q3) 월별 매출 조회가 데이터가 늘수록 느려질 것 같다는 우려가 있고, 실행 계획을 확인해 달라는 요청이 왔습니다.`,
      steps: [
        `파일을 만들고 ‹q("SELECT COUNT(*) FROM customers")›, ‹orders›, ‹items›의 행 수가 각각 520, 20000, 40001인지 확인한다.`,
        `쿼리마다 3~6행짜리 표를 직접 만들어 같은 증상이 나오는 최소 재현 스크립트(각 15줄 이내)를 쓰고, 원인을 한 문장으로 적는다.`,
        `Q1: 먼저 정답의 기준을 독립된 쿼리로 구한다(예: 고객이 있는 주문의 총합). 그다음 Q1이 왜 부풀었는지 조인 전후의 행 수로 증명하고 수정한다. DISTINCT로 숫자를 맞추는 방법은 쓰지 않는다.`,
        `Q2: orders에 NULL ‹customer_id›가 몇 건인지 세는 쿼리로 원인을 증명하고, 두 가지 방식으로 수정해 결과가 같은지 비교한다.`,
        `Q3: ‹EXPLAIN QUERY PLAN›으로 원본의 계획을 기록한다. ‹CREATE INDEX idx_orders_date ON orders(ordered_at)›로 인덱스만 만들었을 때 계획이 어떻게 되는지 기록한다(바뀌지 않는 이유를 한 문장으로). 그다음 쿼리를 고쳐 인덱스를 타게 한다.`,
        `세 수정 쿼리의 기대값을 고정하는 ‹test_reports.py›를 unittest로 쓴다.`,
        `‹REPORT.md›에 쿼리별로 증상, 원인, 수정 쿼리, 전/후 결과와 실행 계획을 표로 정리한다.`
      ],
      accept: [
        `Q1 수정본은 주문이 있는 고객 490행을 돌려주고 고객별 합계의 총합이 ‹107609000›이다(원본의 총합은 ‹215193458›).`,
        `Q2 수정본의 결과는 ‹30›이고, ‹customer_id›가 NULL인 주문이 400건이라는 확인 쿼리 결과가 ‹REPORT.md›에 있다.`,
        `Q3 수정본은 원본과 같은 ‹(1666, 9156358)›을 돌려주고, 실행 계획에 ‹SEARCH orders USING INDEX›가 나온다. ‹ordered_at› 한 컬럼 인덱스만 만든 상태의 원본 Q3는 여전히 ‹SCAN orders›다(출력 문구는 SQLite 버전에 따라 조금 다를 수 있다).`,
        `‹python -m unittest›가 통과하고, ‹REPORT.md›에 전/후 표와 쿼리별 원인 문장이 있다.`
      ],
      stretch: `같은 스키마를 PostgreSQL에 만들 수 있다면(Docker 또는 로컬 설치) Q3의 원본과 수정본을 ‹EXPLAIN (ANALYZE, BUFFERS)›로 비교해 Seq Scan과 Index Scan, ‹Rows Removed by Filter›, 실행 시간을 표로 만드세요. UPDATE 같은 쿼리는 BEGIN과 ROLLBACK으로 감싸서 시험합니다. 없다면 GROUP BY 밖의 컬럼을 선택하는 쿼리가 SQLite에서는 실행되지만 다른 DB에서는 오류가 날 수 있는 이유를 한 쪽 분량으로 설명하세요.`
    },
    {
      title: `장애 조사 납품 패키지: 로그 분석 → 고객 안내문 → 재발 방지 테스트`,
      scenario: `고객(쇼핑몰 '한빛상회' 사장님)이 이렇게 요청했습니다. "오늘 오후 결제 실패가 많았어요. 원인이 뭔지, 다시 안 생기게 할 수 있는지 개발 용어 말고 쉽게 알려 주세요." 서버 로그가 필요하니 아래 줄을 위에서 아래로 ‹make_log.py›에 붙여 넣고 실행해 ‹access.log›를 만드세요(한 줄이 문장 하나, 가상의 데이터입니다).

- ‹import datetime as dt›
- ‹base = dt.datetime(2026, 11, 3, 14, 0, 0)›
- ‹def line(i): t = (base + dt.timedelta(seconds=i)).strftime("%H:%M:%S"); post = i % 5 in (0, 3); bad = i >= 1200 and post and i % 3 == 0; return "%s %s req=r%05d %s %s %d %dms%s" % (t, "ERROR" if bad else "INFO", i, "POST" if post else "GET", "/orders" if post else "/products", 500 if bad else 200, 300 + i % 4 if bad else 100 + (i * 37) % 150, " ReadTimeout payments" if bad else "")›
- ‹lines = [line(i) for i in range(3000)]›
- ‹lines += ["%02d:%02d:%02d WARN cache miss key=p%d" % (14, i // 60, i % 60, i) for i in range(0, 3000, 25)]›
- ‹lines.append("14:19:58 INFO deploy v1.8.2 payments.timeout_ms=300 (prev=3000)")›
- ‹lines.sort(); f = open("access.log", "w", encoding="utf-8"); print(*lines, sep=chr(10), file=f); f.close()›

로그는 3,121줄이며 한 줄 형식은 ‹시각 레벨 req=ID 메서드 경로 상태 소요시간 [오류]›입니다. 원인은 로그 안에 있고, 이 과제는 **조사 결과를 고객에게 납품 가능한 형태로 만드는 것**입니다. 결제사 승인 내역 같은 로그 밖 정보는 이 데이터로 알 수 없다는 점을 보고서에 반영하세요.`,
      steps: [
        `‹make_log.py›를 실행해 ‹access.log›를 만들고, 줄 수가 3,121줄인지 확인한다.`,
        `표준 라이브러리만으로 ‹analyze.py›를 쓴다. 정규식으로 줄을 파싱해 배포 시각, POST /orders의 요청 수와 5xx 수(배포 전/후), 오류 원인별 건수, 실패 요청 소요 시간의 최솟값·최댓값, WARN cache miss의 분당 발생 건수(배포 전/후)를 출력한다. 실행은 ‹python analyze.py access.log›.`,
        `가설 표를 만든다. 가설 3개(결제사 장애 / 트래픽 증가 / 배포의 설정 변경)마다 "참이라면 로그에 이런 패턴이 있을 것"이라는 예측과 실제 결과를 적는다.`,
        `WARN cache miss가 원인 후보에서 빠지는 이유를 배포 전후의 비율 숫자로 한 줄로 적는다.`,
        `‹should_rollback(lines)› 함수를 만든다. 로그 줄 목록을 받아 POST /orders의 5xx 비율이 5%를 넘으면 True를 돌려주고, 빈 입력에서도 예외 없이 False를 돌려준다.`,
        `unittest 3개를 쓴다. 배포 직후 5분 구간의 줄은 True, 배포 직전 5분 구간의 줄은 False, 빈 목록은 False가 나와야 한다.`,
        `‹INCIDENT.md›에 고객용 안내문(10줄 이하, 전문용어 없음: 무슨 일/왜/어떻게 해결/아직 확인 중인 것/앞으로)과 내부 포스트모템(영향·타임라인·근본 원인·잘된 점/아쉬운 점·액션 아이템)을 쓴다.`,
        `체크리스트로 자기 검수한다. 확인하지 않은 사실(결제 승인 여부)을 단정하지 않았는가, 추측·남 탓·개인 비난이 없는가, 숫자(건수·시각)가 분석 결과와 일치하는가.`
      ],
      accept: [
        `‹analyze.py›가 POST /orders 5xx 총 240건(전부 ‹ReadTimeout payments›), 첫 5xx 시각 14:20:00(배포 14:19:58 직후), 배포 후 5xx 비율 약 33.3%(240/721), 배포 전 0건(0/479)을 출력한다.`,
        `WARN cache miss가 배포 전후 모두 분당 약 2.4건으로 같다는 수치가 출력되고, 실패 요청 소요 시간이 300~303ms 범위라는 사실이 설정값 300ms와 연결되어 서술되어 있다.`,
        `unittest 3개가 통과한다(배포 직후 5분 구간은 POST /orders 약 120건 중 40건 안팎이 5xx. 구간 경계에 따라 한두 건 차이는 허용).`,
        `‹INCIDENT.md›의 고객용 안내문이 10줄 이하이며 결제 승인 여부를 "확인 중"으로 적고, 포스트모템에 액션 아이템이 3개 이상이며 각각 담당·기한·확인 방법이 있다.`
      ],
      stretch: `실패한 240건의 요청 ID를 CSV로 내보내고, 결제사 승인 내역을 흉내 낸 가상 CSV(요청 ID, 승인 여부)를 직접 만들어 대조하는 스크립트를 쓰세요. 그 결과를 반영해 "확인 중인 것" 항목을 확정 내용으로 바꾼 2차 안내문을 작성하고, 1차 안내문과 어디가 달라졌는지 비교합니다.`
    }
  ],
  quiz: [
    {
      q: `고객 PC에서 가계부 CLI가 시작하자마자 종료됩니다. 가장 먼저 조사할 곳은? (json 모듈 내부 프레임은 생략한 트레이스백입니다)

Traceback (most recent call last):
  File "store.py", line 9, in load
    return json.loads(text)
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "main.py", line 4, in <module>
    entries = load("ledger.json")
  File "store.py", line 11, in load
    return DEFAULTS["entries"]
KeyError: 'entries'`,
      choices: [
        `마지막 줄의 KeyError가 프로그램을 죽였으니 DEFAULTS에 "entries" 키를 추가해 프로그램이 시작되게 만들고 거기서 끝낸다`,
        `첫 예외다. ledger.json이 왜 비었거나 JSON이 아닌지(저장 중 종료, 잘못된 편집 등)부터 확인한다. KeyError는 복구 경로가 다시 실패한 2차 증상이다`,
        `main.py 4번째 줄에서 터졌으므로 load 호출을 try/except로 감싸 프로그램이 종료되지 않고 계속 실행되게 한다`,
        `json 모듈 자체에 문제가 있는 것으로 보고 고객 PC의 Python을 재설치해서 표준 라이브러리를 복구한다`
      ],
      answer: 1,
      why: `연쇄 예외에서는 가장 위의 예외가 시작점이고, "During handling" 아래의 예외는 처리(복구) 코드가 또 실패한 것입니다. "Expecting value: line 1 column 1 (char 0)"은 파일이 비었거나 JSON이 아니라는 뜻이라 고객 데이터가 손상됐을 수 있습니다. 가장 그럴듯한 오답(키 추가)은 프로그램을 빈 데이터로 시작시켜 손상된 파일과 데이터 손실을 가리기만 합니다. 복구 코드의 KeyError는 별도의 결함으로 나중에 고칩니다.`
    },
    {
      q: `요청마다 이벤트를 모으는 함수인데, 두 번째 요청에 첫 번째 요청의 이벤트가 섞여 나옵니다.

def log_event(msg, events=[]):
    events.append(msg)
    return events

print(log_event("login"))     # ['login']
print(log_event("logout"))    # ['login', 'logout']   기대: ['logout']

원인과 올바른 수정은?`,
      choices: [
        `append가 원본 리스트를 바꾸는 것이 문제이므로 함수가 끝날 때 return events[:] 로 복사본을 돌려주게 한다`,
        `events가 전역 변수처럼 동작해서 생기는 문제이므로 함수 안에서 global events를 선언해 범위를 명확히 한다`,
        `파이썬이 같은 인자의 호출 결과를 캐시하고 있으므로 서버를 재시작해서 캐시를 비워 준다`,
        `기본값 리스트는 함수를 정의할 때 한 번만 만들어져 모든 호출이 공유한다. events=None으로 받고 함수 안에서 새 리스트를 만든다`
      ],
      answer: 3,
      why: `기본값 식은 def가 실행될 때 한 번 평가되어 함수 객체에 저장되므로, 기본값을 쓰는 호출은 모두 같은 리스트를 바꿉니다. 가장 그럴듯한 오답(return events[:])은 append 뒤에 복사하므로 공유 리스트가 이미 오염된 뒤여서 두 번째 호출 결과는 여전히 ['login', 'logout']입니다. 올바른 수정은 None으로 받고 호출마다 새 리스트를 만드는 것입니다.`
    },
    {
      q: `대시보드의 10월 매출이 정산 시스템의 약 2배로 나옵니다. orders는 주문당 1행, order_items는 품목당 1행입니다.

SELECT SUM(o.total)
FROM orders o
JOIN order_items i ON i.order_id = o.id
WHERE o.ordered_at >= '2026-10-01'
  AND o.ordered_at <  '2026-11-01';

가장 알맞은 원인과 수정은?`,
      choices: [
        `주문 한 건이 품목 수만큼 행으로 늘어나(팬아웃) total이 품목 수만큼 더해진다. 합계는 orders만으로 계산하거나 items를 주문 단위로 먼저 집계해 조인한다`,
        `SUM(DISTINCT o.total)로 바꾸면 같은 주문의 중복 행이 제거되므로 합계가 정산 시스템과 같아진다`,
        `JOIN을 LEFT JOIN으로 바꾸면 품목 행이 따로 붙지 않아 주문이 한 번씩만 계산된다`,
        `ordered_at에 인덱스가 없어 같은 주문 행을 두 번 읽는 것이므로 ordered_at에 인덱스를 추가한다`
      ],
      answer: 0,
      why: `1:N 조인은 "1" 쪽 행을 N번 복제하므로 그 위에서 합산하면 N배가 됩니다. 가장 그럴듯한 오답인 SUM(DISTINCT total)은 금액이 같은 서로 다른 주문을 하나로 합쳐 버려 이번에는 숫자가 작아지는 새 오류를 만듭니다. LEFT JOIN은 행을 늘리는 성질을 바꾸지 못하고, 인덱스는 속도와 관련될 뿐 행 중복과는 무관합니다.`
    },
    {
      q: `주문이 한 번도 없는 고객 명단이 0명으로 나옵니다. 영업팀은 최소 30명은 있다고 합니다. (비회원 주문은 orders.customer_id가 NULL입니다.)

SELECT name FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);

원인은?`,
      choices: [
        `customers 테이블이 비어 있거나 조건 컬럼 이름이 틀려서 결과가 비어 있다. 먼저 SELECT COUNT(*) FROM customers를 확인한다`,
        `서브쿼리 결과에 같은 customer_id가 매우 많아서 NOT IN이 모든 행을 걸러 낸다. SELECT DISTINCT customer_id로 바꾸면 해결된다`,
        `서브쿼리에 NULL이 하나라도 있으면 NOT IN은 어떤 id에 대해서도 참이 되지 못한다(결과가 UNKNOWN). NOT EXISTS로 바꾸거나 서브쿼리에 customer_id IS NOT NULL을 추가한다`,
        `NOT IN은 문자열 비교에만 쓸 수 있어서 정수 id 비교가 조용히 실패한다. id를 문자열로 바꿔 비교해야 한다`
      ],
      answer: 2,
      why: `x NOT IN (…, NULL)은 모든 값과 "같지 않다"를 확정할 수 없어 UNKNOWN이 되고, WHERE는 UNKNOWN 행을 버리므로 결과가 통째로 빕니다. 가장 그럴듯한 오답(DISTINCT)은 중복을 줄일 뿐 NULL이라는 값은 그대로 남깁니다. NOT EXISTS는 NULL 비교를 하지 않아 의도대로 동작합니다.`
    },
    {
      q: `고객: "결제 연동이 가끔 실패해요. 결제사 장애 같은데 확인해 주세요." 서버 로그 일부입니다.

14:19:41 INFO  req=a100 POST /orders 201 131ms
14:19:58 INFO  deploy v1.8.2 payments.timeout_ms=300 (prev=3000)
14:20:10 INFO  req=a103 POST /orders 201 250ms
14:20:20 ERROR req=a104 POST /orders 500 301ms ReadTimeout payments
14:20:31 ERROR req=a105 POST /orders 500 300ms ReadTimeout payments
14:20:52 ERROR req=a107 POST /orders 500 302ms ReadTimeout payments

가장 알맞은 판단과 조치는?`,
      choices: [
        `ReadTimeout은 상대 서버가 느리다는 뜻이므로 결제사 문제로 보고, 결제사에 장애 문의를 보낸 뒤 답이 올 때까지 기다린다`,
        `실패가 배포 직후부터 시작되고 소요 시간이 새 타임아웃(300ms)에 몰려 있으니 설정 변경이 유력하다. 먼저 이전 값으로 되돌려 완화하고, 5xx가 멈췄는지 지표로 확인한다`,
        `일시적인 현상일 수 있으니 서버를 재시작해서 연결을 초기화하고, 한 시간 정도 지켜본 뒤 다시 판단한다`,
        `ReadTimeout이 반복되니 결제 호출의 재시도 횟수를 10회로 늘려, 일시적인 실패도 결국은 성공하게 만든다`
      ],
      answer: 1,
      why: `실패의 시작이 배포 직후이고 실패 소요 시간(300~302ms)이 새 설정값에 몰려 있다는 두 증거가 설정 변경 가설을 가리킵니다. 그 가설은 "되돌리면 멈춘다"는 틀릴 수 있는 예측을 주므로 완화와 검증이 한 번에 됩니다. 가장 그럴듯한 오답(결제사 탓)의 예측은 "소요 시간이 제각각이고 배포와 무관하게 실패한다"인데 로그가 반대입니다. 재시작이나 재시도 증가는 원인을 건드리지 않고 부하만 늘립니다.`
    },
    {
      q: `날짜별 주문 수 조회가 200ms 이상 걸립니다. created_at(timestamp 타입)에는 일반 B-tree 인덱스가 이미 있고 orders는 약 100만 행입니다.

EXPLAIN (ANALYZE) SELECT count(*) FROM orders WHERE created_at::date = '2026-10-01';

Aggregate  (cost=26334.00..26334.01 rows=1 width=8) (actual time=212.701..212.702 rows=1 loops=1)
  ->  Seq Scan on orders  (cost=0.00..26321.50 rows=5000 width=0) (actual time=0.031..211.902 rows=4871 loops=1)
        Filter: ((created_at)::date = '2026-10-01'::date)
        Rows Removed by Filter: 995129
Planning Time: 0.112 ms
Execution Time: 212.801 ms

가장 알맞은 개선은?`,
      choices: [
        `추정 행 수(5000)와 실제 행 수(4871)가 어긋나 있으므로 먼저 ANALYZE로 통계를 갱신해 플래너가 인덱스를 고르게 한다`,
        `id 컬럼에도 별도의 인덱스를 하나 더 만들어 count(*) 계산이 인덱스만으로 끝나게 한다`,
        `enable_seqscan을 off로 영구 설정해 서버 전체에서 풀 스캔이 선택되지 않게 만든다`,
        `컬럼에 형변환(::date)이 씌워져 created_at의 인덱스를 쓰지 못한다. created_at >= '2026-10-01' AND created_at < '2026-10-02' 범위 조건으로 바꾼다(또는 (created_at::date)에 표현식 인덱스를 만든다)`
      ],
      answer: 3,
      why: `Filter 줄에 (created_at)::date가 있고 99만여 행을 읽고 버린(Rows Removed by Filter) 것이 컬럼에 연산이 씌워져 인덱스를 못 쓴다는 증거입니다. 가장 그럴듯한 오답(ANALYZE)은 추정 5000과 실제 4871이 이미 거의 같아 통계 문제가 아님을 놓친 것입니다. 풀 스캔을 전역으로 금지하면 다른 쿼리가 망가지고, 무관한 컬럼의 인덱스는 이 쿼리와 상관이 없습니다.`
    },
    {
      q: `고객 리포트 생성이 7초 걸립니다. cProfile 결과(tottime 순) 일부입니다.

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
     8000    6.640    0.001    6.640    0.001 {method 'execute' of 'sqlite3.Connection' objects}
     8000    0.090    0.000    6.801    0.001 report.py:27(load_customer)
     8000    0.060    0.000    0.060    0.000 {method 'fetchone' of 'sqlite3.Cursor' objects}
        1    0.004    0.004    6.912    6.912 report.py:12(build_report)

가장 먼저 할 일은?`,
      choices: [
        `load_customer가 8000번 호출되고 매번 쿼리를 한 번씩 실행한다(N+1). 고객 ID를 묶어 한 번(또는 몇 번)의 IN/JOIN 쿼리로 가져오게 바꾼다`,
        `build_report의 for 루프를 리스트 컴프리헨션으로 바꿔 파이썬 코드 자체의 실행 속도를 최적화한다`,
        `리포트 결과 전체를 캐시해 두고 두 번째 요청부터는 저장된 결과를 돌려주어 빠르게 만든다`,
        `더 빠른 CPU와 더 많은 코어를 가진 서버로 올려 전체 처리 속도를 높인다`
      ],
      answer: 0,
      why: `시간의 96%(6.640 / 6.912)가 execute에 있고 호출 횟수가 8000회이므로 쿼리를 반복하는 N+1이 병목입니다. 가장 그럴듯한 오답(루프 최적화)은 build_report 자체의 tottime이 0.004초뿐이라 줄일 시간이 거의 없습니다. 전체 캐시는 첫 요청의 7초를 남기고 데이터가 바뀔 때마다 무효화가 필요하며, CPU 증설은 대기 시간(DB 왕복)을 줄이지 못합니다.`
    },
    {
      q: `개발자의 Mac에서는 잘 돌아가는데, 고객의 한국어 Windows PC(Python 3.12)에서만 아래 오류가 납니다. memo.txt는 UTF-8로 저장되어 있고 첫 줄은 "2026-10 식비 합계"입니다.

with open("memo.txt") as f:
    text = f.read()

UnicodeDecodeError: 'cp949' codec can't decode byte 0xec in position 8: illegal multibyte sequence

가장 알맞은 수정은?`,
      choices: [
        `open(..., errors="ignore")를 붙여 읽을 수 없는 글자는 건너뛰고 나머지 글자만 읽는다`,
        `memo.txt를 cp949로 다시 저장해서 고객 PC의 기본 인코딩에 맞춰 준다`,
        `open("memo.txt", encoding="utf-8")처럼 인코딩을 명시한다. 기본값은 플랫폼마다 달라서(3.14 이하 Windows는 로케일 인코딩) 파일·네트워크 경계마다 명시해야 한다`,
        `고객 PC의 Python 3.12를 제거하고 같은 버전을 다시 설치해서 설정을 초기화한다`
      ],
      answer: 2,
      why: `open()의 기본 인코딩은 플랫폼에 따라 달라서, 이 PC는 UTF-8 파일을 cp949로 읽다가 실패했습니다. 인코딩을 명시하면 어디서든 같게 동작합니다. 가장 그럴듯한 오답(errors="ignore")은 오류 메시지는 사라지지만 한글이 조용히 사라진 데이터가 만들어지고, cp949로 다시 저장하면 이번에는 Mac과 다른 환경에서 깨집니다. (Python 3.15부터는 UTF-8이 기본이지만 명시하는 습관은 여전히 유효합니다. 2026-11 기준)`
    },
    {
      q: `def settle(rows):                  # 1
    total = 0                      # 2
    for i, r in enumerate(rows):   # 3   rows는 1만 행
        total += r["amount"]       # 4
    return total                   # 5

i가 7345일 때의 r와 total을 보고 싶습니다. Enter를 7,345번 누르지 않고 멈추는 pdb 명령은?`,
      choices: [
        `until 7345`,
        `b 4, i == 7345 를 입력한 뒤 c`,
        `n 7345`,
        `tbreak 7345 를 입력한 뒤 c`
      ],
      answer: 1,
      why: `b 줄번호, 조건은 조건이 참일 때만 그 줄에서 멈추는 조건부 중단점이라 4번째 줄에 i == 7345를 걸면 원하는 순간에 한 번에 멈춥니다. (Python 3.14 pdb에서 i가 7345일 때 멈추는 것을 확인했습니다.) until과 tbreak의 숫자는 "반복 횟수"가 아니라 소스 파일의 줄 번호입니다(공식 문서). 줄 수가 7345보다 적은 파일에서 tbreak 7345는 "End of file"이라는 오류만 냅니다(3.14 pdb로 확인). 가장 그럴듯한 오답인 n 7345는 next가 횟수 인자를 받지 않는 명령이라(문서에 인자가 없고 3.14 pdb는 "Invalid argument" 오류를 냅니다) 원하는 곳으로 건너뛰지 못합니다.`
    },
    {
      q: `고객: "월 합계가 가끔 틀려요." 코드와 고객 PC의 로그입니다.

def month_total(entries, month):
    return sum(e["amount"] for e in entries if e["date"].startswith(month))

month=2026-01  total=12,000     (정상)
month=2026-1   total=1,842,300  (기대: 12,000)

가장 좋은 최소 재현 예제는?`,
      choices: [
        `entries 2건(2026-01-05 금액 12000, 2026-10-05 금액 30000)과 month="2026-1"로 month_total만 호출하고, 기대값 12000과 실제 결과를 비교하는 몇 줄`,
        `고객의 ledger.json 전체(1MB)를 받아서 python cli.py summary를 그대로 실행해 같은 결과가 나오는지 확인한다`,
        `서버 환경 전체를 Docker로 고객과 똑같이 구성한 뒤 고객이 보낸 것과 같은 요청을 그대로 보낸다`,
        `프로젝트의 단위 테스트 전체를 돌려 월 합계와 관련된 테스트가 실패할 때까지 기다린다`
      ],
      answer: 0,
      why: `최소 재현 예제는 실패를 유지하는 가장 작은 입력과 가장 짧은 코드입니다. 이 사례의 "가끔"은 입력 형식(월을 2026-1로 넘김)이고 원인은 startswith 접두사 비교라 2026-1이 2026-10~12까지 포함합니다. 가장 그럴듯한 오답(고객 파일 전체 실행)은 재현은 되겠지만 어디가 원인인지 알려 주지 못하고 고객 데이터를 옮겨야 합니다. 테스트 전체를 돌리는 것은 이 입력이 테스트에 없으면 아무것도 알려 주지 못합니다.`
    },
    {
      q: `장애는 복구됐고, 고객에게 보낼 안내문의 핵심 문장을 골라야 합니다. 내부 메모는 다음과 같습니다.

[내부 메모 · 11/3 15:10]
- 14:19:58 배포 v1.8.2: 결제 연동 타임아웃 3000ms -> 300ms (설정 값 오타)
- 14:19:58 배포 이후 14:50 복구 전까지 POST /orders 721건 중 240건이 500 (ReadTimeout)
- 14:50 설정 복구, 이후 5xx 0건
- 실패 240건의 결제 승인 여부: 결제사 내역과 대조 중 (미확인)

고객 안내문으로 가장 알맞은 것은?`,
      choices: [
        `"결제사 쪽 응답 지연으로 일부 주문이 실패했습니다. 저희 쪽 문제는 아니며 현재는 모두 정상입니다."`,
        `"일시적인 서버 불안정으로 불편을 드려 죄송합니다. 담당 개발자에게 주의를 주었으며 다시는 없을 것입니다."`,
        `"14:19 업데이트 이후 14:50까지 주문 721건 중 240건이 실패했습니다. 이 업데이트에서 결제 대기 시간이 잘못 설정된 것이 원인이며 14:50에 복구했습니다. 실패 건의 결제 승인 여부는 결제사와 대조 중이며 11/4 10:00까지 별도 안내드립니다. 업데이트 후 5분간 실패율을 점검하는 장치를 추가합니다."`,
        `"원인을 분석 중입니다. 확정되는 대로 안내드리겠습니다."`
      ],
      answer: 2,
      why: `좋은 안내문은 영향 수치, 쉬운 말의 원인, 조치, 아직 모르는 것과 다음 안내 시각, 재발 방지를 담고 확인하지 않은 것은 단정하지 않습니다. 첫 번째는 메모와 반대되는 남 탓이고, 두 번째는 모호한 사과에 개인 비난과 검증할 수 없는 약속이 섞여 있습니다. 가장 그럴듯한 오답인 마지막 안내문은 이미 확인된 사실이 있는데도 아무 정보를 주지 않아 고객이 사업상 판단을 할 수 없게 합니다.`
    },
    {
      q: `test_b를 단독으로 실행하면 통과하지만 전체를 실행하면 실패합니다.

DEFAULT_CONFIG = {"tags": [], "limit": 100}

def make_config(**override):
    cfg = dict(DEFAULT_CONFIG)
    cfg.update(override)
    return cfg

def test_a():
    cfg = make_config()
    cfg["tags"].append("x")
    assert cfg["tags"] == ["x"]

def test_b():
    cfg = make_config()
    assert cfg["tags"] == []        # 전체 실행 시 ['x']

원인과 수정은?`,
      choices: [
        `테스트 실행 순서가 매번 달라서 생기는 문제이므로 test_b 앞에 time.sleep을 넣어 실행 순서를 맞춘다`,
        `cfg.update(override)가 DEFAULT_CONFIG를 덮어쓰는 것이 문제이므로 update 대신 직접 대입하는 코드로 바꾼다`,
        `assert가 리스트를 값이 아니라 참조로 비교해서 틀리므로 == 대신 is로 비교하도록 바꾼다`,
        `dict()는 얕은 복사라 "tags" 리스트가 DEFAULT_CONFIG와 공유되어 test_a가 기본값을 오염시킨다. copy.deepcopy(DEFAULT_CONFIG)나 매번 새 리스트를 만드는 팩토리를 쓴다`
      ],
      answer: 3,
      why: `dict(DEFAULT_CONFIG)는 바깥 dict만 새로 만들고 "tags" 리스트는 같은 객체를 가리킵니다. test_a의 append가 공유 기본값을 바꿔 뒤의 테스트가 오염됩니다. 가장 그럴듯한 오답(update 문제)은 update가 새 dict(cfg)만 바꾸고 DEFAULT_CONFIG는 건드리지 않는다는 점을 놓친 것이며, sleep이나 is는 원인과 무관합니다. 단독 실행은 통과하고 전체는 실패하는 증상은 공유 상태의 전형입니다.`
    }
  ],
  refs: [
    {
      title: `Python docs: pdb — The Python Debugger`,
      url: `https://docs.python.org/3/library/pdb.html`,
      kind: `doc`,
      why: `pdb 명령(break·condition·tbreak·until·where·up·down·interact), breakpoint(), python -m pdb, post_mortem 사용법의 공식 설명. 레슨 3의 명령표를 이 문서로 확인했다 (2026-11 기준 Python 3.15 문서).`
    },
    {
      title: `Python docs: Errors and Exceptions (Tutorial)`,
      url: `https://docs.python.org/3/tutorial/errors.html`,
      kind: `doc`,
      why: `트레이스백의 형식, 예외 연쇄(raise from, During handling), from None, add_note, 광범위한 except를 피하라는 권고를 다룬다. 레슨 2의 읽기 순서 근거.`
    },
    {
      title: `Python docs: Built-in Exceptions`,
      url: `https://docs.python.org/3/library/exceptions.html`,
      kind: `doc`,
      why: `예외 계층, KeyError·IndexError·UnicodeDecodeError 등이 발생하는 조건, __cause__·__context__·__suppress_context__의 표시 규칙. 연쇄 예외를 정확히 읽는 기준.`
    },
    {
      title: `Python docs: Logging HOWTO`,
      url: `https://docs.python.org/3/howto/logging.html`,
      kind: `doc`,
      why: `로그 레벨 숫자와 기본 임계값 WARNING, basicConfig 사용법, 로거 계층과 전파, 지연 포맷, logger.exception. 레슨 3의 logging 설정 근거. (basicConfig의 force 인자와 핸들러 중복 주의는 같은 공식 문서의 logging 모듈 레퍼런스 페이지에 있다.)`
    },
    {
      title: `Python docs: Programming FAQ`,
      url: `https://docs.python.org/3/faq/programming.html`,
      kind: `doc`,
      why: `가변 기본값이 공유되는 이유와 None 관용구, 클로저의 늦은 바인딩, 복사(copy/deepcopy), UnboundLocalError를 설명하는 공식 FAQ. 레슨 4의 근거.`
    },
    {
      title: `Python docs: profiling.tracing (cProfile)`,
      url: `https://docs.python.org/3/library/profiling.tracing.html`,
      kind: `doc`,
      why: `모든 호출·반환·예외 이벤트를 기록하는 결정적 프로파일링의 정의, Profile 클래스의 enable/disable과 컨텍스트 매니저, profiling.sampling(통계적 샘플링)과의 대비. 3.15 문서에서 cProfile이 하위 호환 이름으로 계속 쓰인다는 설명을 확인했다 (2026-11 기준). ncalls·tottime 같은 열의 정의는 이 페이지가 아니라 pstats 문서에 있다.`
    },
    {
      title: `PEP 686: Make UTF-8 mode default`,
      url: `https://peps.python.org/pep-0686/`,
      kind: `standard`,
      why: `Python 3.15부터 UTF-8 모드가 기본이 되는 결정과 PYTHONUTF8=0 같은 옵트아웃, EncodingWarning 활용 방법. 레슨 4의 인코딩 설명과 퀴즈 8의 근거 (2026-11 기준 Final).`
    },
    {
      title: `Python docs: sqlite3 — DB-API 2.0 interface for SQLite`,
      url: `https://docs.python.org/3/library/sqlite3.html`,
      kind: `doc`,
      why: `플레이스홀더(?)와 문자열 조립의 SQL 인젝션 위험, sqlite3.Row, 트랜잭션 제어, execute와 executemany, 실행된 SQL을 세는 set_trace_callback(레슨 7 코드에서 사용). 실습 2의 코드 작성 기준.`
    },
    {
      title: `SQLite: EXPLAIN QUERY PLAN`,
      url: `https://www.sqlite.org/eqp.html`,
      kind: `doc`,
      why: `SCAN과 SEARCH, USING INDEX와 COVERING INDEX, USE TEMP B-TREE FOR ORDER BY를 읽는 법. 출력 형식이 릴리스마다 바뀔 수 있으니 진단용으로만 쓰라는 주의도 있다.`
    },
    {
      title: `SQLite: The SQLite Query Optimizer Overview`,
      url: `https://www.sqlite.org/optoverview.html`,
      kind: `doc`,
      why: `인덱스를 쓸 수 있는 WHERE 항의 꼴(컬럼 연산자 표현식), 복합 인덱스의 왼쪽 접두 규칙, 앞이 와일드카드가 아닌 LIKE의 최적화 조건, OR 처리. 컬럼에 함수를 씌운 조건이 이 꼴을 벗어난다는 점(문서가 직접 말하지는 않고 이 꼴에서 도출한 설명)과 표현식 인덱스 언급을 확인했다.`
    },
    {
      title: `PostgreSQL 18 Documentation: Using EXPLAIN`,
      url: `https://www.postgresql.org/docs/18/using-explain.html`,
      kind: `doc`,
      why: `cost·rows·width, EXPLAIN과 EXPLAIN ANALYZE의 차이(실제 실행), BUFFERS, Seq Scan·Index Scan·Bitmap Heap Scan, 추정/실제 행 수 비교, 데이터 변경 쿼리를 ROLLBACK으로 감싸라는 주의 (2026-11 기준 18 문서).`
    },
    {
      title: `Google SRE Book: Effective Troubleshooting`,
      url: `https://sre.google/sre-book/effective-troubleshooting/`,
      kind: `book`,
      why: `가설-검증 방식의 문제 해결 절차(보고, 선별, 조사, 진단, 시험과 처치, 치유), 흔한 함정, 요청 ID 같은 일관된 식별자로 디버깅하기 쉽게 만드는 방법. 레슨 1·6·8의 방법론 근거.`
    },
    {
      title: `Google SRE Book: Postmortem Culture — Learning from Failure`,
      url: `https://sre.google/sre-book/postmortem-culture/`,
      kind: `book`,
      why: `무책(blameless) 원칙, 포스트모템을 쓰는 기준을 미리 정하는 법, 영향·완화·근본 원인·후속 조치의 기록, 비난형과 건설형 문장의 대비. 레슨 8의 근거.`
    },
    {
      title: `MIT Missing Semester 2026: Debugging and Profiling`,
      url: `https://missing.csail.mit.edu/2026/debugging-profiling/`,
      kind: `course`,
      why: `printf 디버깅, 로깅, 디버거와 시스템 호출 추적, 샘플링 대 트레이싱 프로파일러(샘플링이 보통 오버헤드가 낮다)를 한 강의에서 훑는다. pdb는 예시 정도로만 나오므로 도구 선택의 보조 자료로 읽는다.`
    }
  ],
  gigs: [
    `의뢰는 대개 증상 문장으로 옵니다. "가끔 오류가 나요", "어제부터 숫자가 달라요", "느려졌어요", "인수받은 코드가 안 돌아가요." 견적 전에 확인할 것은 재현 여부, 로그와 모니터링의 유무, 운영 DB 접근 허용 범위, 테스트 환경 존재, 데이터의 민감도, 최근 변경(배포·설정) 이력입니다. 재현 정보가 없으면 견적이 아니라 질문부터 보냅니다.`,
    `원인을 모르는 상태에서 고정가로 수정까지 약속하는 것이 가장 큰 함정입니다. 진단과 수정을 두 단계로 나누어 제안하세요. 1단계는 시간 상한이 있는 진단(재현 절차, 원인, 수정안, 위험, 수정 견적을 담은 보고서), 2단계는 그 결과로 정한 수정 견적입니다. 진단 시간 상한은 케이스마다 다르니 시작 전에 고객과 합의하세요(필자의 경험칙이며 시장 표준이 아닙니다).`,
    `납품물은 코드 수정만이 아닙니다. 재현 절차, 비개발자용 1쪽 원인 설명, 수정 패치(PR), 회귀 테스트, 전후 수치(오류율·p95 응답 시간·쿼리 시간), 필요하면 포스트모템과 재발 방지 제안까지입니다. 위시켓의 「2025 상반기 프리랜서 개발자 리포트」(요즘IT, 2025-09-04)는 Java/Spring 백엔드 개발자에게 "개발 가능"이 아니라 운영 경험을 보이고, 장애 처리와 성능 개선 사례는 구체적인 수치와 함께 적으라고 조언합니다. 전후 수치를 남기는 습관이 그대로 포트폴리오가 됩니다.`,
    `하자보수와 유지보수를 구분해 계약에 적으세요. 일반적으로 내가 납품한 기능의 결함 수정은 하자보수 성격이고, 새 요구나 외부 환경 변화(결제사 API 변경, OS·라이브러리 업데이트)는 유지보수 성격입니다. 민법 제670조는 도급의 하자 보수·손해배상 청구와 계약 해제를 목적물을 인도받은 날부터 1년 안에 하도록 정하고, 소프트웨어 진흥법 제60조(소프트웨어사업의 하자담보책임)는 사업 종료일(시험·검사 뒤 최종 산출물을 인도한 날)부터 1년 이내에 생긴 하자에 책임을 지게 합니다(2026-11 기준. 국가법령정보센터에 접속하지 못해 위키문헌의 2020년 개정 전재본으로 확인했으니 현행 조문은 원문에서 다시 확인하세요). 민간 계약은 계약서 문구가 우선하고 이 글은 법률 자문이 아니므로, 범위와 기간을 문서로 정하세요.`,
    `긴급 대응은 별도 조건으로 가격을 매깁니다. 야간·주말 가산, 응답 시간과 해결 시간의 구분(응답은 약속할 수 있어도 해결 시간은 약속하지 않는 편이 안전합니다), 온콜 범위를 정하세요. SRE 책은 SLA를 SLO를 지켰을 때와 못 지켰을 때의 결과(대개 환급·위약금 같은 금전적 결과)가 붙은 명시적·암묵적 계약으로 정의하므로, 그런 결과를 정하지 않았다면 약속이 아니라 목표(SLO)로 표현하는 편이 안전합니다. 포스트모템 작성이 대응에 포함되는지도 미리 합의합니다.`,
    `운영 환경에서 지켜야 할 선이 있습니다. 운영 DB에 백업과 검토 없이 직접 UPDATE하지 않고, EXPLAIN ANALYZE도 데이터 변경 쿼리는 트랜잭션으로 감쌉니다. 고객 데이터를 내 PC로 옮기려면 서면 합의와 마스킹이 필요하고, 로그를 외부 AI 서비스에 붙여 넣기 전에도 개인정보와 비밀이 없는지 확인합니다. 수정 후에는 "다른 게 깨졌다"를 막기 위해 회귀 테스트와 배포 후 점검을 함께 제안하세요.`,
    `재현이 안 되는 버그는 "완료"의 정의를 먼저 합의합니다. 예를 들어 로그를 추가하고 일정 기간 관찰해 동일 증상이 없으면 종료하는 식입니다. 인수받은 코드는 이해하는 데 걸리는 시간을 과소 견적하기 쉬우니 읽기 시간을 별도 항목으로 잡으세요. 시장 감각은 참고만 하세요. 같은 리포트는 2025년 1~6월 자사 플랫폼에 의뢰된 약 2,000건을 분석해 계약된 프리랜서의 월 평균을 프론트엔드 약 572만 원, 백엔드 약 570만 원으로 밝히지만(한 플랫폼의 계약 건이라 선택 편향이 있고 표본·산출 방식 설명이 없으며 디버깅 전용 단가도 아님), 진단·수정 건은 시간 상한이 있는 시간제로 환산해 제안하는 것이 위험을 줄입니다.`
  ]
};
