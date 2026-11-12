(window.PRO_MODULES = window.PRO_MODULES || {})["pj-pycli"] = {
  id: "pj-pycli",
  summary: `Windows 에서 가상환경을 만들고 dataclass·JSON·argparse·unittest·CSV·SQLite 로 가계부 명령줄 프로그램을 만든 뒤, 같은 순서를 다른 주제(독서 기록)로 혼자 반복해 비슷한 작은 Python 도구를 설계·검증·납품할 수 있다.`,
  hours: 36,
  goals: [
    `가상환경(.venv)을 만들어 활성화하고 ‹python -m 패키지› 로 프로젝트를 실행하며, ModuleNotFoundError 가 나는 이유(sys.path)를 설명하고 고칠 수 있다.`,
    `불변 dataclass 와 순수 함수로 데이터·계산·입출력을 나누어, 파일과 화면을 전혀 모르는 도메인 코드를 설계할 수 있다.`,
    `한글 데이터를 UTF-8 JSON 으로 저장·복원하고 임시 파일 + os.replace 로 안전하게 쓰며, 깨진 파일은 원본을 보존한 채 명확한 오류로 처리할 수 있다.`,
    `argparse 서브커맨드(add·list·summary)와 종료 코드로 명령줄 도구를 만들고, 사용법 오류 메시지를 읽어 원인을 찾을 수 있다.`,
    `경계(boundary)에서 입력을 검증하고 사용자 정의 예외를 번역해, 예상된 오류는 한 줄 메시지로 버그는 트레이스백으로 구분해 보여 줄 수 있다.`,
    `unittest 로 순수 함수·임시 폴더 파일·CLI(출력 캡처·종료 코드)를 테스트하고, 날짜나 경로에 의존해 가끔 깨지는 테스트를 결정적으로 고칠 수 있다.`,
    `월별 집계와 엑셀에서 한글이 깨지지 않는 CSV(utf-8-sig·newline 빈 문자열)를 내보내고, CSV 수식 주입 위험을 설명해 막을 수 있다.`,
    `pyproject.toml 로 설치 가능한 패키지와 README 를 만들고, 저장소를 JSON 에서 SQLite 로 바꿔도 도메인·보고 코드는 그대로 두는 구조를 구현할 수 있다.`
  ],
  lessons: [
    {
      title: `1단계. 프로젝트 폴더·가상환경·실행 방법 (Windows)`,
      body: `이 모듈은 읽고 끝나는 공부가 아니라 **하나의 프로그램을 8단계로 직접 만드는 공부**입니다. 만들 것은 지출을 기록하고 분류별·월별로 합산하며 CSV 로 내보내는 명령줄 가계부(이름: gagyebu)입니다. 작아 보여도 외주로 들어오는 소규모 자동화·데이터 처리 의뢰의 뼈대, 즉 입력 → 검증 → 저장 → 집계 → 출력, 그리고 테스트와 인수인계가 전부 들어 있어서, 끝낸 뒤에는 비슷한 도구를 혼자 설계할 수 있습니다. 각 단계의 코드는 그 시점의 프로젝트 상태이고, 코드 블록의 ‹# === 경로 ===› 줄은 파일 경계이니 그 경로에 파일을 만들어 붙여 넣으세요.

### 파이썬은 무엇을 실행하는가
‹python› 은 ① 인터프리터 실행 파일, ② 모듈을 찾는 경로 목록(‹sys.path›), ③ 설치된 패키지 폴더(site-packages)의 조합입니다. 컴퓨터 전체에 하나만 쓰면 프로젝트 A 는 라이브러리 1.0, B 는 2.0 이 필요할 때 충돌하고, 고객 PC 에서 "제 컴퓨터에서는 되는데요"를 재현할 수 없습니다. **가상환경(venv)** 은 프로젝트 전용 인터프리터 진입점과 전용 site-packages 를 가진 폴더(관례상 ‹.venv›)입니다. ‹pyvenv.cfg› 에 원본 파이썬 위치가 적혀 있고, 활성화는 현재 터미널의 PATH 앞에 ‹.venv\\Scripts› 를 붙이는 일일 뿐입니다. 그래서 활성화가 막혀도 ‹.venv\\Scripts\\python.exe› 를 직접 부르면 똑같이 동작합니다.

### 이번 단계에서 할 일 (Windows PowerShell)
1. ‹mkdir gagyebu› 후 ‹cd gagyebu›. 이 폴더가 **프로젝트 루트**입니다.
2. ‹python --version›. 3.12 이상을 권장합니다 (Python devguide, 2026-11 기준: 3.10 은 2026-10-01 에 지원이 끝났고 3.11 은 2027-10, 3.12 는 2028-10 종료 예정이며 이 모듈의 코드는 3.11 에서도 돌아갑니다). ‹python› 을 쳤는데 Microsoft Store 가 열리면 설치가 안 된 것이니 python.org 안내대로 설치하고(공식 문서는 Python install manager 를 권장), 그래도 같으면 "앱 실행 별칭 관리"에서 python 별칭을 확인한 뒤 터미널을 다시 엽니다.
3. ‹python -m venv .venv› (‹py -m venv .venv› 도 됩니다).
4. 활성화: PowerShell 은 ‹.venv\\Scripts\\Activate.ps1›, cmd 는 ‹.venv\\Scripts\\activate.bat›. 프롬프트 앞에 ‹(.venv)› 가 붙으면 성공입니다.
5. ‹mkdir gagyebu; mkdir tests› 로 패키지 폴더와 테스트 폴더를 만들고 아래 파일 3개를 만듭니다.

### 왜 ‹python -m gagyebu› 인가
폴더 하나가 패키지가 되려면 ‹__init__.py› 가 있어야 하고, ‹__main__.py› 는 ‹python -m 패키지› 로 실행할 때 시작되는 파일입니다. 프로젝트 루트에서 ‹python -m gagyebu› 를 치면 현재 폴더가 import 경로에 들어가 ‹from gagyebu import ...› 가 됩니다. 반대로 ‹python gagyebu\\__main__.py› 처럼 파일 경로로 실행하면 그 파일이 든 폴더(gagyebu/)가 경로 맨 앞이 되어 루트에 있는 패키지를 찾지 못하고 ‹ModuleNotFoundError: No module named 'gagyebu'› 가 납니다. 초보자가 가장 먼저 만나는 오류이고, 원인을 모르면 sys.path 를 코드로 건드리는 나쁜 해결책으로 가기 쉽습니다.

**확인:** 프로젝트 루트에서 ‹python -m gagyebu› 를 실행하면 ‹gagyebu 0.1.0›, Python 버전, 그리고 ‹.venv› 가 들어 있는 인터프리터 경로 3줄이 보여야 합니다. 경로에 ‹.venv› 가 없다면 전역 파이썬으로 실행 중인 것이니 활성화를 다시 확인하세요.

### 혼자 해 보기: 그림자 프로젝트 bookshelf
이 모듈을 끝낼 때까지 가계부와 **같은 순서로 독서 기록 도구 ‹bookshelf›(책 한 권 = 번호·제목·쪽수·읽은 날짜·평점 1~5)** 를 따로 만듭니다. 가계부 코드를 복사하지 말고 각 단계의 설계 결정만 옮기는 것이 연습의 핵심입니다. 이 단계의 몫은 다른 폴더에 ‹.venv› 를 만들고 ‹python -m bookshelf› 가 ‹bookshelf 0.1.0› 과 인터프리터 경로를 출력하게 하는 것입니다. 기준: 경로에 ‹.venv› 가 보이고, ‹python bookshelf\\__main__.py› 로 실행하면 ‹ModuleNotFoundError› 가 나서 -m 을 쓰는 이유를 직접 재현할 수 있어야 합니다.`,
      code: `# === gagyebu/__init__.py ===
__version__ = "0.1.0"

# === gagyebu/__main__.py ===
import sys

from gagyebu import __version__


def main():
    print(f"gagyebu {__version__}")
    print("Python:", sys.version.split()[0])
    print("인터프리터:", sys.executable)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# === tests/__init__.py ===
# 내용이 없어도 되는 파일. tests 폴더를 '패키지'로 만들어 unittest 가 찾게 한다.
`,
      codeLang: `python`,
      key: [
        `프로젝트마다 ‹.venv› 를 만들고 활성화하거나 ‹.venv\\Scripts\\python.exe› 를 직접 불러 항상 같은 인터프리터로 실행한다.`,
        `폴더 = 패키지(‹__init__.py›), 시작점 = ‹__main__.py›, 실행 = 프로젝트 루트에서 ‹python -m 패키지›.`,
        `‹python 파일경로› 는 그 파일이 든 폴더가 sys.path 맨 앞이 되어 패키지 import 가 깨진다.`,
        `‹.venv› 는 언제든 지우고 다시 만들 수 있는 산출물이라 소스와 함께 납품·커밋하지 않는다.`
      ],
      pitfalls: [
        `PowerShell 에서 Activate.ps1 이 "스크립트를 실행할 수 없으므로" 로 막히면 시스템 전체 정책을 열지 말고 ‹Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser› 로 현재 사용자만 완화하거나 python.exe 를 직접 호출한다.`,
        `활성화하지 않은 터미널에서 ‹pip install› 을 치면 전역 파이썬에 설치된다. 프롬프트의 ‹(.venv)› 와 ‹python -m pip --version› 의 경로를 확인하는 습관을 들인다.`,
        `가상환경 폴더를 다른 PC 로 복사하면 내부에 절대 경로가 박혀 있어 동작하지 않는다. 의존성 목록만 전달하고 현지에서 새로 만든다.`,
        `‹python gagyebu\\__main__.py› 가 실패한다고 코드 안에서 sys.path.append 로 때우면 다른 환경에서 또 깨진다. 실행 방법(‹-m›)을 고친다.`
      ]
    },
    {
      title: `2단계. 데이터 구조(dataclass)와 함수 나누기`,
      body: `코드를 짜기 전에 "이 프로그램이 다루는 한 덩어리 데이터가 무엇인가"부터 정합니다. 가계부의 한 건은 번호·날짜·금액·분류·메모입니다. 딕셔너리로도 만들 수 있지만 ‹entry["ammount"]› 같은 오타는 실행해 보기 전에는 아무도 알려 주지 않습니다. **dataclass** 는 필드 이름과 타입을 선언하면 ‹__init__›·‹__repr__›·‹__eq__› 를 만들어 주는 장치라, 오타는 즉시 오류가 되고 출력도 읽기 좋아집니다. ‹frozen=True› 를 주면 만든 뒤 값을 바꿀 수 없어 코드 어딘가에서 몰래 금액이 바뀌는 사고가 사라지고, 수정이 필요하면 ‹dataclasses.replace(entry, amount=...)› 로 새 객체를 만듭니다.

### 타입 결정 세 가지
- **금액은 int(원 단위)**. 원화에는 소수가 없고, float 는 ‹0.1 + 0.2› 가 ‹0.30000000000000004› 가 되듯 합계에 미세한 오차가 쌓입니다. 달러처럼 소수가 필요하면 센트 정수나 Decimal 을 씁니다.
- **날짜는 진짜 date**. 문자열로 저장하면 월 단위 묶기·정렬·기간 비교를 직접 파싱해야 합니다. 필드 이름은 타입 이름과 겹치지 않게 ‹day› 로 하고, 파일에 쓸 때의 키 이름 ‹date› 와의 번역은 ‹to_dict›·‹from_dict› 가 맡습니다. 파이썬 안의 모양과 파일 안의 모양을 분리해 두면 나중에 파일 형식이 바뀌어도 코드 전체가 흔들리지 않습니다.
- **번호는 max + 1**. ‹len(entries) + 1› 은 중간 항목을 삭제하는 순간 번호가 겹칩니다.

### 함수를 나누는 기준
핵심 규칙은 하나입니다. **계산하는 코드는 파일·화면·현재 시각을 몰라야 한다.** ‹report.py› 의 ‹total›·‹by_category› 는 항목 목록을 받아 값을 돌려줄 뿐 ‹print› 도 ‹open› 도 ‹date.today()› 도 부르지 않습니다. 이런 순수 함수는 테스트가 쉽고, 저장소를 JSON 에서 SQLite 로 바꿔도 한 줄 안 고치고 재사용됩니다(8단계에서 증명합니다). 파일은 ‹storage›, 입력 해석은 ‹cli›, 출력은 ‹commands› 로 층을 나눠 가는 것이 이후 단계의 지도입니다.

### 파일에서 읽은 값은 믿지 않는다
‹from_dict› 는 id·amount·category 의 타입을 검사합니다. ‹isinstance(x, int)› 가 아니라 ‹type(x) is int› 를 쓴 이유는 ‹True› 도 int 의 하위 타입이라 ‹"amount": true› 가 통과하기 때문입니다. 이 검사가 없으면 ‹"amount": "12000"› 같은 값이 조용히 들어와 한참 뒤 합계를 낼 때 엉뚱한 곳에서 터집니다. 오류는 값이 들어오는 경계에서 잡아야 원인이 가깝습니다.

**확인:** ‹python -m gagyebu› 를 실행하면 ‹Entry(id=1, day=datetime.date(2026, 11, 3), amount=12000, ...)› 세 줄, ‹합계: 24,500원›, ‹식비: 20,000원›, ‹교통: 4,500원› 이 보여야 합니다. 이 단계의 ‹__main__.py› 는 메모리 위 데모일 뿐이며 4단계에서 교체됩니다.

### 혼자 해 보기: bookshelf
‹Book›(frozen dataclass: id·title·pages·finished(date)·rating)과 ‹to_dict›·‹from_dict›·‹next_id› 를 직접 설계하세요. 정할 것은 쪽수·평점의 타입, 날짜 필드 이름, 타입 검사 대상입니다. 계산 함수는 ‹stats.py› 에 ‹total_pages(books)› 와 ‹count_by_rating(books)› 로 두고 print·open 을 쓰지 않습니다. 기준: 메모리 위 데모가 3권의 출력, 총 쪽수, 평점별 권수를 보여 주고, ‹"pages": true› 와 ‹"pages": "300"› 을 ‹from_dict› 가 ValueError 로 거부합니다.`,
      code: `# === gagyebu/models.py ===
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Entry:
    """지출 한 건. frozen=True 라서 만든 뒤에는 값을 바꿀 수 없다."""
    id: int
    day: date
    amount: int  # 원 단위 정수. 돈에 float 은 쓰지 않는다
    category: str
    memo: str = ""

    def to_dict(self):
        return {"id": self.id, "date": self.day.isoformat(),
                "amount": self.amount, "category": self.category,
                "memo": self.memo}

    @classmethod
    def from_dict(cls, d):
        for key, kind in (("id", int), ("amount", int), ("category", str)):
            if type(d[key]) is not kind:
                raise ValueError(f"{key} 의 형식이 잘못되었습니다: {d[key]!r}")
        return cls(d["id"], date.fromisoformat(d["date"]), d["amount"],
                   d["category"], d.get("memo", ""))


def next_id(entries):
    return max((e.id for e in entries), default=0) + 1


def make_entry(entries, day, amount, category, memo=""):
    return Entry(next_id(entries), day, amount, category, memo)

# === gagyebu/report.py ===
def total(entries):
    return sum(e.amount for e in entries)


def by_category(entries):
    """분류별 합계를 큰 순서로 [(분류, 합계), ...] 로 돌려준다."""
    sums = {}
    for e in entries:
        sums[e.category] = sums.get(e.category, 0) + e.amount
    return sorted(sums.items(), key=lambda kv: (-kv[1], kv[0]))

# === gagyebu/__main__.py ===
from datetime import date

from gagyebu import report
from gagyebu.models import make_entry


def main():
    entries = []
    for amount, category in [(12000, "식비"), (4500, "교통"), (8000, "식비")]:
        entries.append(make_entry(entries, date(2026, 11, 3), amount, category))
    for e in entries:
        print(e)
    print("합계:", f"{report.total(entries):,}원")
    for category, subtotal in report.by_category(entries):
        print(f"  {category}: {subtotal:,}원")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`,
      codeLang: `python`,
      key: [
        `한 건의 데이터는 dict 대신 ‹@dataclass(frozen=True)› 로 선언해 오타를 즉시 오류로 만들고 값 변경을 막는다.`,
        `돈은 int(원 단위), 날짜는 date 로 들고 있고, 파일용 모양과의 번역은 ‹to_dict›·‹from_dict› 한 곳에서만 한다.`,
        `계산 함수는 print·open·date.today() 를 부르지 않는 순수 함수로 둔다. 테스트가 쉽고 저장소를 바꿔도 재사용된다.`,
        `새 번호는 ‹max + 1›, 외부에서 온 값의 타입 검사는 ‹type(x) is int› 로 bool 까지 거른다.`
      ],
      pitfalls: [
        `‹memo: list = []› 처럼 가변 기본값을 쓰면 인스턴스끼리 같은 목록을 공유하는 사고가 나므로 dataclass 가 클래스를 정의하는 순간 ‹ValueError› 로 막는다. ‹field(default_factory=list)› 로 인스턴스마다 새 목록을 만든다.`,
        `frozen 객체에 ‹entry.amount = 5000› 처럼 대입하면 ‹FrozenInstanceError› 가 난다. 오류를 없애려고 frozen 을 지우지 말고, ‹dataclasses.replace› 로 값을 바꾼 새 객체를 만들어 목록에서 교체한다.`,
        `금액을 float 으로 두면 ‹0.1 + 0.2› 가 ‹0.30000000000000004› 가 되듯 오차가 합계에 쌓여 보고서와 CSV 가 어긋날 수 있다. 원 단위는 int 로 시작한다.`,
        `한 함수가 입력을 받고 계산하고 출력까지 하면 테스트하려고 입력을 흉내 내야 한다. 계산과 입출력을 처음부터 분리한다.`
      ]
    },
    {
      title: `3단계. JSON 파일 저장·불러오기와 손상된 파일 처리`,
      body: `메모리 속 데이터는 프로그램이 끝나면 사라집니다. 가장 단순한 영속화는 JSON 파일입니다. 텍스트라서 사람이 열어 볼 수 있고, 표준 라이브러리만으로 충분하며, Git 으로 변경을 비교할 수 있습니다. 대신 매번 파일 전체를 읽고 전체를 다시 쓰고, 동시에 여러 프로그램이 쓰는 상황을 모르고, 조건 검색이 없습니다. 이 한계는 8단계에서 SQLite 로 넘어가는 이유가 되므로 기억해 두세요.

### 파일 형식 설계
최상위를 목록이 아니라 ‹{"version": 1, "entries": [...]}› 객체로 둡니다. 목록만 저장하면 나중에 설정이나 수입/지출 구분 같은 정보를 넣을 자리가 없고, 파일 형식이 바뀌었는지 알 방법도 없습니다. ‹version› 은 외주 현장에서 "구버전 파일을 가진 고객이 업그레이드해도 깨지지 않게" 해 주는 가장 싼 보험입니다(Lab 2).

### 인코딩은 명시한다
‹open()› 의 기본 인코딩은 시스템 로캘을 따라 달라지며 한국어 Windows 에서는 보통 cp949 입니다. Python 3.15 부터 UTF-8 모드가 기본으로 켜진다고 공식 문서에 적혀 있지만(2026-11 기준) 3.14 이하를 쓰는 고객 PC 가 남아 있습니다. 그래서 항상 ‹encoding="utf-8"› 을 적고, ‹ensure_ascii=False› 로 한글을 ‹\\uc2dd\\ube44› 같은 이스케이프가 아닌 그대로 저장합니다. 읽을 때는 ‹utf-8-sig› 를 씁니다. 일부 편집기가 붙이는 BOM 이 있으면 ‹json.loads› 가 ‹Unexpected UTF-8 BOM› 으로 거부하기 때문에, 읽는 쪽은 관대하게 쓰는 쪽은 엄격하게 두는 것입니다.

### 쓰는 도중 꺼지면 어떻게 되나
‹open(path, "w")› 는 여는 순간 파일을 0바이트로 비웁니다. 그 뒤 쓰기 도중 전원이 나가거나 프로세스가 죽으면 빈 파일이나 잘린 JSON 이 남고, 사용자의 데이터는 전부 사라집니다. 해결은 같은 폴더의 임시 파일에 끝까지 쓴 다음 ‹os.replace› 로 한 번에 바꿔치기하는 것입니다. 공식 문서는 성공 시 이 교체가 원자적이라고 설명하므로(POSIX 요건) 읽는 쪽은 옛 파일 또는 새 파일 둘 중 하나만 보고, 서로 다른 파일시스템 사이에서는 실패할 수 있다고 적혀 있습니다. 임시 파일을 같은 폴더에 만드는 이유가 이것입니다. Windows 에서의 세부 보장은 그 문서에 따로 명시되어 있지 않습니다. 또 이 방식이 막는 것은 프로그램이 쓰는 도중 죽는 경우이고, OS 째로 갑자기 꺼지는 경우까지 지키려면 임시 파일에 ‹flush()› 와 ‹os.fsync()› 로 디스크 기록을 강제하는 단계가 더 필요합니다(os 문서의 fsync 항목). 어느 쪽이든 중요한 데이터라면 백업을 병행합니다.

### 손상은 세 종류다
① JSON 이 아님(잘림·빈 파일·직접 편집 실수), ② JSON 이지만 모양이 틀림(‹[]› 또는 ‹entries› 없음), ③ 모양은 맞는데 값이 틀림(‹"amount": "300"›, 존재하지 않는 날짜). ‹load› 는 세 경우 모두 ‹StorageError› 하나로 번역해 경로·원인 종류·행동 지침을 알려 줍니다. 핵심 결정은 **파일이 없을 때만 빈 목록을 돌려주고 손상은 절대 빈 목록으로 얼버무리지 않는다**는 것입니다. 손상을 빈 목록으로 취급하면 다음 ‹add› 가 그 빈 목록을 저장하면서 복구 가능했던 원본을 덮어씁니다. 예외 순서도 중요합니다. ‹FileNotFoundError› 는 ‹OSError› 의 하위 클래스라 먼저 잡아야 합니다.

**확인:** ‹python -m gagyebu› 를 두 번 실행하면 첫 번째는 1건, 두 번째는 2건이 출력되고 ‹demo.json› 이 한글 그대로 생깁니다. 파일 내용을 ‹{oops› 로 바꾸고 다시 실행하면 ‹오류: demo.json 의 내용이 올바르지 않습니다 (JSONDecodeError: ...)› 가 한 줄로 나오고 파일은 그대로여야 합니다.

### 혼자 해 보기: bookshelf
‹bookshelf› 의 ‹storage.py› 를 직접 만드세요(‹{"version": 1, "books": [...]}›, 임시 파일 + ‹os.replace›, 파일이 없을 때만 빈 목록). 기준 3가지: ① 두 번 실행하면 1권에서 2권이 되고 JSON 에 한글 제목이 그대로 보인다. ② 파일 내용이 빈 문자열, ‹[]›, ‹"pages": "300"› 일 때 각각 StorageError 가 나고 파일 내용이 바이트 단위로 그대로다. ③ 정상 저장이 끝난 뒤에는 ‹.tmp› 파일이 남아 있지 않다.`,
      code: `# === gagyebu/storage.py ===
import json
import os
from pathlib import Path

from gagyebu.models import Entry

VERSION = 1


class StorageError(Exception):
    """데이터 파일을 읽거나 쓸 수 없을 때. 메시지는 사용자에게 그대로 보여 준다."""


def load(path):
    path = Path(path)
    try:
        text = path.read_text(encoding="utf-8-sig")  # BOM 이 있어도 읽는다
    except FileNotFoundError:
        return []  # 첫 실행: 파일이 없는 것은 정상이다
    except (OSError, UnicodeDecodeError) as e:
        raise StorageError(f"{path} 을(를) 읽을 수 없습니다: {e}") from e
    try:
        return [Entry.from_dict(item) for item in json.loads(text)["entries"]]
    except (ValueError, KeyError, TypeError) as e:
        raise StorageError(
            f"{path} 의 내용이 올바르지 않습니다 ({type(e).__name__}: {e}). "
            "원본은 건드리지 않았으니 직접 확인하거나 다른 곳으로 옮겨 두세요."
        ) from e


def save(path, entries):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"version": VERSION, "entries": [e.to_dict() for e in entries]}
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\\n",
                   encoding="utf-8")
    os.replace(tmp, path)  # 임시 파일을 완성한 뒤 한 번에 바꿔치기

# === gagyebu/__main__.py ===
from datetime import date
from pathlib import Path

from gagyebu import storage
from gagyebu.models import make_entry

DATA = Path("demo.json")


def main():
    try:
        entries = storage.load(DATA)
    except storage.StorageError as e:
        print("오류:", e)
        return 1
    amount = 1000 * (len(entries) + 1)
    entries.append(make_entry(entries, date.today(), amount, "실험"))
    storage.save(DATA, entries)
    for e in entries:
        print(e.id, e.day, f"{e.amount:,}원", e.category)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`,
      codeLang: `python`,
      key: [
        `최상위를 ‹{"version", "entries"}› 객체로 두면 파일 형식을 바꿀 때 버전으로 구분할 수 있다.`,
        `파일은 항상 ‹encoding="utf-8"› 로 쓰고 ‹ensure_ascii=False›, 읽을 때는 ‹utf-8-sig› 로 BOM 을 용인한다.`,
        `임시 파일에 다 쓴 뒤 ‹os.replace› 로 교체하면 쓰는 도중 중단돼도 옛 파일이 남는다.`,
        `파일이 없으면 빈 목록, 손상이면 원본을 건드리지 않고 StorageError 로 알린다. 손상을 빈 목록으로 대체하지 않는다.`
      ],
      pitfalls: [
        `손상된 파일을 만나 ‹except: return []› 로 넘기면 다음 저장이 원본을 빈 데이터로 덮어쓴다. 사용자 데이터를 잃는 가장 흔한 경로다.`,
        `‹open(path, "w")› 로 직접 쓰면 쓰기 도중 중단 시 0바이트 파일이 남는다. 같은 폴더에 임시 파일을 만들고 교체한다(다른 드라이브에 만들면 replace 가 실패할 수 있다).`,
        `Windows 에서 data.json 을 편집기·백신·클라우드 동기화 프로그램이 열어 두고 있으면 ‹os.replace› 가 PermissionError 를 낼 수 있다. 5단계에서 OSError 도 한 줄 메시지로 처리한다.`,
        `인코딩을 생략하면 내 PC 에서는 되던 한글 파일이 고객 PC 에서 UnicodeDecodeError 나 깨진 글자가 된다.`
      ]
    },
    {
      title: `4단계. argparse 로 명령어 만들기 (add / list / summary)`,
      body: `지금까지는 코드를 고쳐야만 동작을 바꿀 수 있었습니다. 사용자나 고객이 쓰려면 **명령줄 인터페이스**가 필요합니다. ‹argparse› 는 표준 라이브러리만으로 사용법(usage)·도움말(-h)·오류 메시지·종료 코드를 한꺼번에 해결해 주고 ‹git add›·‹git log› 같은 서브커맨드도 지원합니다. 목표는 ‹add 금액 분류›, ‹list›, ‹summary› 세 명령입니다.

### 구조: 선언, 해석, 실행을 나눈다
- ‹build_parser()› 는 명령과 옵션을 **선언**만 합니다.
- ‹main(argv=None)› 는 해석(‹parse_args›) 후 처리 함수를 불러 **종료 코드를 돌려줍니다**. ‹argv=None› 이면 argparse 가 ‹sys.argv› 를 읽고, 테스트에서는 ‹main(["list"])› 처럼 목록을 직접 넘깁니다. 프로세스를 따로 띄우지 않고 CLI 를 검증하는 열쇠가 이 인자입니다.
- ‹commands.py› 는 처리 함수 모음입니다. 읽기 → 순수 함수 호출 → 저장 → 출력 순서이고, 서브커맨드마다 ‹set_defaults(handler=...)› 로 연결합니다(공식 문서 예제가 쓰는 방식이며 이름만 ‹func› 입니다). 문자열로 이름을 조립해 ‹getattr› 로 찾는 방식보다 오타가 일찍 드러납니다.

### 옵션 위치와 서브커맨드
‹--data› 는 최상위 파서에 정의했으므로 **서브커맨드 앞**에 와야 합니다. ‹gagyebu list --data demo.json› 은 ‹unrecognized arguments: --data demo.json› 으로 실패합니다. 서브커맨드 뒤의 인자는 그 서브커맨드의 파서가 해석하기 때문입니다. ‹required=True› 를 빼면 서브커맨드 없이 실행했을 때 친절한 사용법 대신 ‹AttributeError: 'Namespace' object has no attribute 'handler'› 처럼 내부 오류가 나옵니다. 기본 데이터 경로는 ‹Path.home() / ".gagyebu" / "data.json"› 입니다. 현재 폴더에 두면 어디서 실행했느냐에 따라 데이터가 갈라져 "가계부가 사라졌어요"가 됩니다. 대신 연습할 때는 ‹--data demo.json› 으로 프로젝트 폴더의 파일을 지정해 내용을 직접 열어 봅니다.

### 타입 변환과 아직 남은 구멍
‹type=int›, ‹type=date.fromisoformat› 은 문자열을 해석 시점에 바꿔 줍니다. 실패하면 ‹argument amount: invalid int value: '4,500'› 처럼 나오는데 일반적인 문구라 불친절합니다. 더 큰 문제는 ‹add -5 식비› 가 **통과한다**는 점입니다(-5원이 저장됩니다). 변환이 성공했다는 것은 값이 올바르다는 뜻이 아니라 정수로 읽혔다는 뜻일 뿐입니다. 또 이 단계에서 데이터 파일이 손상되면 StorageError 트레이스백이 그대로 보입니다. 둘 다 5단계의 주제입니다.

### 출력 규칙
정상 결과는 stdout, 오류는 stderr 로 보내야 ‹> result.txt› 나 파이프에서 오류가 결과에 섞이지 않습니다. 목록에서 한글 열을 고정 폭으로 맞추려 하면 한글이 터미널에서 두 칸을 차지해 줄이 어긋나므로, 한글 열은 줄 끝에 둡니다. 종료 코드는 0 이 성공이고 argparse 의 사용법 오류는 2 입니다.

**확인:** 먼저 3단계의 ‹demo.json› 을 지웁니다(‹del demo.json›). ‹python -m gagyebu --data demo.json add 12000 식비 --memo 점심 --date 2026-11-03› 은 ‹추가: #1 2026-11-03 12,000원 식비›. 이어서 ‹add 4500 교통 --date 2026-11-03› 과 ‹add 8000 식비 --date 2026-11-05 --memo 저녁› 을 넣고 ‹list› 를 실행하면 날짜순 3줄, ‹summary› 는 ‹식비: 20,000원›, ‹교통: 4,500원›, ‹합계: 24,500원› 이 나와야 합니다.

### 혼자 해 보기: bookshelf
‹bookshelf add 제목 쪽수 --rating 4 --date 2026-11-03›, ‹list›, ‹summary›(평점별 권수와 총 쪽수) 세 명령을 같은 구조(‹build_parser›·‹main(argv=None)›·‹commands›)로 만드세요. ‹commands.py› 는 가계부 것을 보지 않고 새로 씁니다. 기준: ‹python -m bookshelf list --data b.json› 처럼 옵션 위치를 틀리면 ‹unrecognized arguments› 가 나는 것을 직접 재현하고, 평점에 ‹9› 를 넣어도 지금은 통과한다는 사실(5단계에서 막을 구멍)을 메모해 두세요.`,
      code: `# === gagyebu/__main__.py ===
from gagyebu.cli import main

if __name__ == "__main__":
    raise SystemExit(main())

# === gagyebu/cli.py ===
import argparse
from datetime import date
from pathlib import Path

from gagyebu import commands

DEFAULT_DATA = Path.home() / ".gagyebu" / "data.json"


def build_parser():
    parser = argparse.ArgumentParser(prog="gagyebu", description="간단한 지출 가계부")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA,
                        help="데이터 파일 (기본: %(default)s)")
    sub = parser.add_subparsers(dest="command", required=True)
    add = sub.add_parser("add", help="지출 한 건 추가")
    add.add_argument("amount", type=int, help="금액(원)")
    add.add_argument("category", help="분류 (예: 식비)")
    add.add_argument("--memo", default="", help="메모")
    add.add_argument("--date", dest="day", type=date.fromisoformat,
                     help="YYYY-MM-DD (기본: 오늘)")
    add.set_defaults(handler=commands.cmd_add)
    lst = sub.add_parser("list", help="전체 내역")
    lst.set_defaults(handler=commands.cmd_list)
    summary = sub.add_parser("summary", help="분류별 합계")
    summary.set_defaults(handler=commands.cmd_summary)
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    return args.handler(args)

# === gagyebu/commands.py ===
from datetime import date

from gagyebu import report, storage
from gagyebu.models import make_entry


def cmd_add(args):
    entries = storage.load(args.data)
    entry = make_entry(entries, args.day or date.today(), args.amount,
                       args.category, args.memo)
    storage.save(args.data, entries + [entry])
    print(f"추가: #{entry.id} {entry.day} {entry.amount:,}원 {entry.category}")
    return 0


def cmd_list(args):
    entries = storage.load(args.data)
    if not entries:
        print("(내역이 없습니다)")
    for e in sorted(entries, key=lambda e: (e.day, e.id)):
        print(f"{e.id:>3}  {e.day}  {e.amount:>10,}원  {e.category}  {e.memo}".rstrip())
    return 0


def cmd_summary(args):
    entries = storage.load(args.data)
    for category, subtotal in report.by_category(entries):
        print(f"{category}: {subtotal:,}원")
    print(f"합계: {report.total(entries):,}원")
    return 0`,
      codeLang: `python`,
      key: [
        `parser 선언(‹build_parser›), 해석·종료 코드(‹main(argv=None)›), 실제 동작(‹commands›)을 나누면 CLI 를 프로세스 없이 테스트할 수 있다.`,
        `전역 옵션(‹--data›)은 서브커맨드 앞에 와야 하고, 서브커맨드 뒤 인자는 그 서브커맨드의 파서가 해석한다.`,
        `결과는 stdout, 오류는 stderr 로 보내고 종료 코드(0 성공, argparse 사용법 오류 2)로 성공 여부를 알린다.`,
        `‹type=int› 가 성공해도 값이 올바른 것은 아니다. 범위·형식 검증은 별도 단계가 필요하다.`
      ],
      pitfalls: [
        `‹python -m gagyebu list --data demo.json› 처럼 전역 옵션을 서브커맨드 뒤에 쓰면 ‹unrecognized arguments› 로 실패한다. 옵션을 두 파서에 중복 정의하면 기본값이 서로 덮어쓰는 혼란이 생기니 한 곳에만 둔다.`,
        `기본 데이터 파일을 현재 폴더에 두면 실행 위치에 따라 데이터가 갈라진다. 사용자별 고정 위치를 기본값으로 하고 옵션으로 바꿀 수 있게 한다.`,
        `한글을 ‹{category:<8}› 같은 고정 폭으로 맞추면 터미널에서 줄이 어긋난다. 한글 열은 줄 끝에 둔다.`,
        `‹main()› 안에 해석·계산·출력을 전부 쓰면 테스트도 확장도 어려워진다. 처리 함수를 분리해 서브커맨드가 늘어도 ‹main› 은 그대로 둔다.`
      ]
    },
    {
      title: `5단계. 입력 검증과 예외 처리`,
      body: `사용자는 반드시 이상한 값을 넣습니다. 오타, 쉼표가 섞인 금액, 존재하지 않는 날짜, 20자를 넘는 분류, 열려 있는 파일, 손상된 데이터. 프로그램의 품질은 정상 경로가 아니라 이런 경로를 어떻게 처리하느냐에서 갈립니다. 원칙은 세 가지입니다.

### 원칙 1. 값이 들어오는 경계에서 검증한다
CLI 인자와 파일은 **신뢰할 수 없는 입력**입니다. 그래서 ‹validate.py› 의 ‹parse_*› 함수가 문자열을 도메인 값으로 바꾸면서 규칙(형식·범위·길이)을 확인하고, 파일은 2단계의 ‹from_dict› 가 맡습니다. 경계 안쪽의 순수 함수는 값이 올바르다고 가정해도 됩니다. 규칙을 한 곳에 모으면 "금액 상한을 바꿔 주세요" 같은 요구가 한 줄 수정으로 끝납니다. 이번에 정한 규칙은 금액 ‹12000› 또는 ‹12,000›(쉼표는 3자리 묶음일 때만)과 1~1억 원, 날짜 ‹YYYY-MM-DD›(존재하는 날짜만), 분류 공백 정리 후 1~20자입니다. 1억 상한은 ‹1200000000› 같은 0 하나 더 붙인 오타를 막는 장치입니다.

### 원칙 2. 예상된 오류와 버그를 구분한다
사용자가 고칠 수 있는 오류(‹ValidationError›, ‹StorageError›, 쓰기 권한 같은 ‹OSError›)는 한 줄 메시지와 종료 코드로 알리고, 우리 코드의 버그(‹KeyError›, ‹TypeError›)는 트레이스백이 보이도록 그대로 둡니다. 그래서 ‹main()› 한 곳에서 **예상 가능한 예외만 이름을 지정해** 잡습니다. ‹except Exception: pass› 는 버그를 숨겨 가장 찾기 어려운 장애를 만듭니다. 공식 튜토리얼도 가능한 한 구체적인 예외만 처리하라고 말합니다.

### 원칙 3. 예외는 층마다 번역한다
‹ValidationError› 는 ‹ValueError› 를 상속한 사용자 정의 예외입니다. argparse 는 ‹type› 함수가 ‹ValueError›·‹TypeError› 를 내면 직접 쓴 메시지 대신 ‹invalid parse_amount value: '-5'› 같은 일반 문구로 바꾸고, ‹ArgumentTypeError› 일 때만 메시지를 그대로 보여 줍니다. 그렇다고 도메인 코드가 argparse 를 알게 만들면 층이 무너지므로, ‹argtype› 어댑터가 경계에서 번역합니다. ‹raise ... from None› 은 사용자용 메시지에서 내부 원인 사슬을 숨기고, 3단계의 ‹raise ... from e› 는 개발자가 원인을 추적하도록 남깁니다.

### 환경이 입력을 망가뜨리는 사례
PowerShell 에서 따옴표 없이 ‹add 12,000 식비› 를 치면 ‹12,000› 이 배열로 해석되어 프로그램에는 ‹12,0› 이 전달됩니다(이 모듈의 검증 환경인 Windows PowerShell 5.1 에서 확인). 쉼표를 지우기만 하는 코드였다면 **조용히 120원이 기록**됐을 것입니다. 쉼표 위치를 검증하는 정규식이 마지막 방어선이 되었고, 사용자에게는 ‹"12,000"› 처럼 따옴표를 쓰도록 안내합니다.

종료 코드는 0 성공, 1 실행 중 오류(파일 손상·권한), 2 사용법·입력 오류(argparse)로 정리했습니다. 스크립트가 자동화에서 이 숫자로 분기합니다.

**확인:** 아래 명령 앞에는 모두 ‹python -m gagyebu --data demo.json› 을 붙입니다. ‹add "12,000" " 식비 " --memo 점심 --date 2026-11-03› 은 분류 공백이 정리돼 저장됩니다. ‹add abc 식비›, ‹add -5 식비›, ‹add 5000 식비 --date 2026-02-30›, 따옴표 없는 ‹add 12,000 식비› 는 각각 한 줄 오류와 종료 코드 2(‹$LASTEXITCODE›)가 나와야 합니다. ‹demo.json› 을 ‹{oops› 로 바꾸고 ‹list› 를 실행하면 ‹오류: demo.json 의 내용이 올바르지 않습니다 ...› 한 줄과 종료 코드 1 이 나옵니다.

### 혼자 해 보기: bookshelf
‹validate.py› 에 규칙을 직접 정하고 구현하세요(예: 제목 1~100자, 쪽수 1~5000, 평점 1~5, 존재하는 날짜). 기준: ① 규칙마다 잘못된 입력 하나씩 모두 5개를 넣으면 전부 종료 코드 2 와 한 줄 메시지가 나온다. ② 데이터 파일을 일부러 망가뜨리면 종료 코드 1 이다. ③ 코드에 ‹except Exception› 이 한 번도 없고, ‹KeyError› 를 일부러 만들면 트레이스백이 보인다(버그를 숨기지 않는다).`,
      code: `# === gagyebu/validate.py ===
import re
from datetime import datetime

MAX_AMOUNT = 100_000_000  # 오타 방지용 상한: 1억 원
AMOUNT_RE = re.compile(r"-?([0-9]{1,3}(,[0-9]{3})+|[0-9]+)")  # 12000 또는 12,000


class ValidationError(ValueError):
    """사용자가 고칠 수 있는 입력 오류. 메시지는 그대로 보여 줘도 된다."""


def parse_amount(text):
    text = text.strip()
    if not AMOUNT_RE.fullmatch(text):
        raise ValidationError(f"금액 형식이 올바르지 않습니다 (예: 12000, 12,000): {text!r}")
    amount = int(text.replace(",", ""))
    if not 1 <= amount <= MAX_AMOUNT:
        raise ValidationError(f"금액은 1~{MAX_AMOUNT:,} 사이여야 합니다: {amount:,}")
    return amount


def parse_day(text):
    try:
        return datetime.strptime(text.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise ValidationError(f"날짜는 YYYY-MM-DD 형식이어야 합니다: {text!r}") from None


def parse_category(text):
    name = " ".join(text.split())  # 앞뒤 공백 제거, 연속 공백은 하나로
    if not 1 <= len(name) <= 20:
        raise ValidationError(f"분류는 1~20자여야 합니다: {text!r}")
    return name

# === gagyebu/cli.py ===
import argparse
import sys
from pathlib import Path

from gagyebu import commands
from gagyebu.storage import StorageError
from gagyebu.validate import (ValidationError, parse_amount, parse_category,
                              parse_day)

DEFAULT_DATA = Path.home() / ".gagyebu" / "data.json"


def argtype(func):
    """ValidationError 를 argparse 가 그대로 보여 주는 오류로 바꾼다."""
    def convert(text):
        try:
            return func(text)
        except ValidationError as e:
            raise argparse.ArgumentTypeError(str(e)) from None
    return convert


def build_parser():
    parser = argparse.ArgumentParser(prog="gagyebu", description="간단한 지출 가계부")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA,
                        help="데이터 파일 (기본: %(default)s)")
    sub = parser.add_subparsers(dest="command", required=True)
    add = sub.add_parser("add", help="지출 한 건 추가")
    add.add_argument("amount", type=argtype(parse_amount), help="금액(원)")
    add.add_argument("category", type=argtype(parse_category), help="분류")
    add.add_argument("--memo", default="", help="메모")
    add.add_argument("--date", dest="day", type=argtype(parse_day),
                     help="YYYY-MM-DD (기본: 오늘)")
    add.set_defaults(handler=commands.cmd_add)
    lst = sub.add_parser("list", help="전체 내역")
    lst.set_defaults(handler=commands.cmd_list)
    summary = sub.add_parser("summary", help="분류별 합계")
    summary.set_defaults(handler=commands.cmd_summary)
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        return args.handler(args)
    except (StorageError, OSError) as e:
        print(f"오류: {e}", file=sys.stderr)
        return 1
`,
      codeLang: `python`,
      key: [
        `값이 들어오는 경계(CLI 인자·파일)에서 형식·범위·길이를 검증하고, 규칙은 ‹validate.py› 한 곳에 모은다.`,
        `사용자가 고칠 수 있는 오류는 ‹main()› 한 곳에서 이름을 지정해 잡아 한 줄 메시지 + 종료 코드로, 버그는 트레이스백으로 보여 준다.`,
        `argparse 의 ‹type› 함수가 ValueError 를 내면 일반 문구로 바뀐다. ‹ArgumentTypeError› 로 번역하는 어댑터가 도메인 코드를 argparse 에서 분리한다.`,
        `종료 코드는 0 성공 · 1 실행 오류 · 2 사용법 오류로 정해 두고, 환경이 입력을 망가뜨려도(PowerShell 쉼표) 검증이 마지막 방어선이 되게 한다.`
      ],
      pitfalls: [
        `‹int(text.replace(",", ""))› 만으로 쉼표를 처리하면 PowerShell 이 넘긴 ‹12,0› 이 조용히 120 이 된다. 형식(3자리 묶음)까지 검증한다.`,
        `‹except Exception: pass› 나 ‹except:› 로 넓게 잡으면 버그가 숨는다. 잡을 예외를 이름으로 지정하고 나머지는 올라가게 둔다.`,
        `‹datetime.strptime› 은 ‹2026-1-5› 처럼 0 없는 날짜도 받아 준다. 저장할 때 ‹isoformat› 으로 정규화되는지까지 확인하고, 엄격한 형식이 필요하면 정규식을 추가한다.`,
        `검증 메시지에 입력값(‹{text!r}›)을 함께 보여 주지 않으면 사용자가 어느 값이 틀렸는지 모른다. 값은 ‹!r› 로 감싸 공백 문제도 보이게 한다.`
      ]
    },
    {
      title: `6단계. unittest 로 테스트 쓰기`,
      body: `5단계까지 우리는 명령을 손으로 쳐서 확인했습니다. 지금은 5분이면 되지만 기능이 늘수록 확인 시간은 늘어나고, 사람은 결국 일부를 건너뜁니다. **테스트는 실행할 수 있는 명세서**입니다. 한 번 쓰면 수정할 때마다 몇 초 안에 "예전 동작이 그대로인가"를 대신 확인해 주고, 7단계처럼 구조를 바꿀 때 안전망이 됩니다. 외주에서는 테스트가 있는 납품물이 인수 검사와 이후 유지보수 모두에서 신뢰를 줍니다.

### unittest 기본기
‹unittest.TestCase› 를 상속하고 이름이 ‹test› 로 시작하는 메서드가 테스트입니다. 각 테스트마다 새 인스턴스가 만들어지고 ‹setUp› 이 먼저 실행됩니다. 임시 자원은 ‹self.addCleanup(tmp.cleanup)› 으로 정리를 등록하면 ‹setUp› 이 중간에 실패해도 실행됩니다. 비교는 ‹assert› 문 대신 ‹assertEqual›·‹assertIn›·‹assertRaises› 를 씁니다. 실패했을 때 어느 값이 달랐는지 보여 주기 때문입니다(‹AssertionError: 15000 != 16000›). 표처럼 여러 입력을 돌릴 때는 ‹subTest› 로 감싸 실패한 입력만 따로 보고받고 나머지 입력도 계속 검사합니다.

### 찾아내는 규칙
‹python -m unittest› 는 ‹discover› 의 줄임으로 시작 폴더 ‹.›, 파일 패턴 ‹test*.py› 로 테스트를 찾습니다. Python 3.11 부터는 시작 폴더와 하위 폴더가 ‹__init__.py› 가 있는 정식 패키지여야 하므로 1단계에서 ‹tests/__init__.py› 를 만들어 둔 것입니다(3.14 문서는 시작 폴더의 네임스페이스 패키지를 다시 허용하지만 ‹__init__.py› 없는 하위 폴더는 여전히 검색하지 않는다고 적어, 결론은 같습니다). 이것이 없으면 ‹Ran 0 tests› 가 나옵니다. 3.12 부터는 그 뒤에 ‹NO TESTS RAN› 이 붙고 종료 코드가 5 가 되지만, 3.11 은 ‹OK› 와 종료 코드 0 으로 끝나 CI 가 초록으로 보이는 더 위험한 상황입니다. 파일 이름이 ‹test› 로 시작하지 않아도 마찬가지입니다.

### 무엇을 어떻게 테스트하나
- **순수 함수**(‹test_validate›): 입력과 기대값 표. 가장 싸고 가장 많이 씁니다.
- **파일 입출력**(‹test_storage›): 반드시 ‹tempfile› 의 임시 폴더를 씁니다. 홈 폴더의 진짜 데이터를 건드리는 테스트는 내 데이터를 지웁니다. 왕복(저장 후 읽기)과 손상 파일에서 원본이 보존되는지를 확인합니다.
- **CLI**(‹test_cli›): ‹main(argv)› 를 직접 부르고 ‹redirect_stdout›·‹redirect_stderr› 로 출력을 가로챕니다. argparse 는 사용법 오류에 ‹SystemExit(2)› 를 던지므로 잡아서 종료 코드로 바꿉니다.

테스트는 **결정적**이어야 합니다. 현재 날짜(‹date.today()›), 홈 폴더, 실행 순서에 의존하면 어느 날 갑자기 실패하는 테스트가 됩니다. 그래서 테스트에서는 항상 ‹--date› 를 명시했고, 11월에 통과하다 12월 1일에 실패하는 종류의 불안정한 테스트를 피했습니다. 또 구현 세부가 아니라 **동작**(종료 코드, 출력 문구, 파일 보존)을 검증해야 리팩터링에 깨지지 않습니다. 버그를 발견하면 먼저 그 버그를 재현하는 실패 테스트를 쓰고 고치는 습관이 같은 버그의 재발을 막습니다.

**확인:** 프로젝트 루트에서 ‹python -m unittest -v› 를 실행하면 테스트 8개가 나열되고 마지막에 ‹Ran 8 tests in 0.0xxs› 와 ‹OK› 가 보여야 합니다. 그다음 ‹storage.py› 의 오류 문구나 ‹validate.py› 의 상한을 일부러 바꿔 ‹FAIL› 과 어느 비교가 틀렸는지 보이는지 확인하고 되돌립니다.

### 혼자 해 보기: bookshelf
‹tests/› 에 테스트 8개 이상을 쓰세요: 검증 함수 표(‹subTest›), 임시 폴더 왕복과 손상 파일 보존, CLI 종료 코드 0·1·2 각각. 기준: ‹python -m unittest -v› 가 8개 이상을 나열하고 OK 로 끝납니다. 그다음 두 가지를 실험하고 되돌립니다. 평점 상한 5 를 6 으로 바꾸면 어느 테스트가 FAIL 하는지, ‹tests/__init__.py› 를 지우면 ‹Ran 0 tests› 가 나오는지 확인하세요.`,
      code: `# === tests/test_validate.py ===
import unittest

from gagyebu.validate import ValidationError, parse_amount, parse_day


class ValidateTest(unittest.TestCase):
    def test_amount_accepts_commas_and_spaces(self):
        self.assertEqual(parse_amount(" 12,000 "), 12000)

    def test_bad_inputs_raise(self):
        cases = [(parse_amount, "abc"), (parse_amount, "-5"),
                 (parse_amount, "12,0"), (parse_amount, "100000001"),
                 (parse_day, "2026-02-30")]
        for func, text in cases:
            with self.subTest(func=func.__name__, text=text):
                with self.assertRaises(ValidationError):
                    func(text)

# === tests/test_storage.py ===
import tempfile
import unittest
from datetime import date
from pathlib import Path

from gagyebu import storage
from gagyebu.models import Entry


class StorageTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.path = Path(tmp.name) / "data.json"

    def test_missing_file_is_empty(self):
        self.assertEqual(storage.load(self.path), [])

    def test_round_trip_keeps_korean(self):
        entries = [Entry(1, date(2026, 11, 3), 12000, "식비", "점심")]
        storage.save(self.path, entries)
        self.assertIn("식비", self.path.read_text(encoding="utf-8"))
        self.assertEqual(storage.load(self.path), entries)

    def test_broken_files_keep_original(self):
        for text in ["", "{not json", "[]", '{"entries": [{"id": 1}]}']:
            with self.subTest(text=text):
                self.path.write_text(text, encoding="utf-8")
                with self.assertRaises(storage.StorageError):
                    storage.load(self.path)
                self.assertEqual(self.path.read_text(encoding="utf-8"), text)

# === tests/test_cli.py ===
import contextlib
import io
import tempfile
import unittest
from pathlib import Path

from gagyebu.cli import main


def run(*argv):
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            code = main(list(argv))
        except SystemExit as e:  # argparse 는 사용법 오류에 SystemExit(2)
            code = e.code
    return code, out.getvalue(), err.getvalue()


class CliTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.data = str(Path(tmp.name) / "d.json")

    def test_add_then_summary(self):
        run("--data", self.data, "add", "12,000", "식비", "--date", "2026-11-03")
        run("--data", self.data, "add", "3000", "식비", "--date", "2026-11-04")
        code, out, _ = run("--data", self.data, "summary")
        self.assertEqual(code, 0)
        self.assertIn("식비: 15,000원", out)

    def test_bad_amount_is_usage_error(self):
        code, _, err = run("--data", self.data, "add", "-5", "식비")
        self.assertEqual(code, 2)
        self.assertIn("금액은", err)

    def test_corrupt_file_exits_1(self):
        Path(self.data).write_text("{oops", encoding="utf-8")
        code, _, err = run("--data", self.data, "list")
        self.assertEqual(code, 1)
        self.assertIn("올바르지 않습니다", err)
`,
      codeLang: `python`,
      key: [
        `테스트는 실행 가능한 명세서다. 수정할 때마다 몇 초 만에 기존 동작이 유지되는지 확인해 주고 구조 변경의 안전망이 된다.`,
        `‹python -m unittest› 는 ‹test*.py› 를 찾고, 3.11 이상에서는 ‹tests/__init__.py› 가 있어야 한다(없으면 ‹Ran 0 tests›, 3.12 이상은 종료 코드 5).`,
        `파일 테스트는 ‹tempfile› + ‹addCleanup›, CLI 테스트는 ‹main(argv)› 호출 + 출력 가로채기 + ‹SystemExit› 처리로 쓴다.`,
        `결정적으로 쓴다: ‹date.today()›·홈 폴더·실행 순서에 의존하지 않고, 구현이 아니라 동작(종료 코드·출력·파일 보존)을 검증한다.`
      ],
      pitfalls: [
        `‹tests› 에 ‹__init__.py› 가 없거나 파일명이 ‹check_cli.py› 처럼 ‹test› 로 시작하지 않으면 ‹Ran 0 tests› 가 나온다. 3.11 에서는 통과처럼 보이고 3.12 부터는 종료 코드 5 로 실패하므로, 어느 버전이든 실행된 테스트 개수를 확인한다.`,
        `‹--date› 를 생략하고 오늘 날짜에 의존한 테스트는 월말·연말에 갑자기 실패한다. 날짜는 인자로 고정한다.`,
        `홈 폴더의 실제 데이터 파일을 쓰는 테스트는 사용자 데이터를 지우고, 다른 PC 에서는 결과가 다르다. 임시 폴더만 쓴다.`,
        `‹assertTrue(a == b)› 는 실패해도 값을 보여 주지 않는다. ‹assertEqual(a, b)› 로 써야 ‹15000 != 16000› 처럼 원인이 보인다.`
      ]
    },
    {
      title: `7단계. 월별 집계와 CSV 내보내기`,
      body: `고객이 가장 먼저 요구하는 것은 두 가지입니다. "이번 달에 얼마 썼어요?"와 "세무사에게 보낼 파일 주세요." 이번 단계는 두 기능을 추가하면서, 6단계의 테스트가 **안전망**으로 작동하는지 확인하는 단계이기도 합니다. 코드를 바꾼 뒤 ‹python -m unittest› 가 계속 초록이면 기존 동작이 유지된 것입니다.

### 월 단위 집계의 설계
월을 ‹"2026-11"› 같은 문자열 키로 만듭니다. 사전순 정렬이 시간순과 같고, 사람이 읽고 CLI 인자로 받기도 쉽습니다. 규칙은 ‹month_key(day)› 한 함수에 모아 필터(‹in_month›)와 집계(‹by_month›)가 같은 규칙을 쓰게 합니다. 같은 규칙이 두 군데 복사되면 한쪽만 고쳐져 월 합계와 목록이 어긋납니다. 항목이 없는 달은 ‹합계: 0원› 만 출력해 "빈 달"과 "명령 실패"를 구분합니다. 이 구조는 전체를 메모리에 올려 걸러 내는 방식이라 수천~수만 건에서는 충분해 보이지만, 확장 전에 직접 재 보는 것이 맞습니다(Lab 1 stretch). 한편 CSV 쓰기는 파일을 여는 코드이므로 2단계의 규칙(계산 모듈은 파일을 모른다)에 따라 ‹report.py› 가 아니라 새 ‹export.py› 에 둡니다.

### CSV 에서 사람들이 깨뜨리는 세 가지
1. **쉼표·따옴표**: 메모에 ‹저녁, 회식› 이나 ‹He said "hi"› 가 들어갑니다. 문자열을 ‹",".join(...)› 으로 이으면 열이 밀립니다. ‹csv.writer› 는 필요할 때 따옴표로 감싸고 내부 따옴표를 두 번 써서 규칙대로 처리합니다.
2. **‹newline=""›**: 공식 문서가 csv 파일을 열 때 항상 지정해도 안전하다고 한 옵션입니다. 빼면 Windows 에서 줄 끝에 ‹\\r› 이 하나 더 붙어 줄 사이에 빈 줄이 생기고, 따옴표 안의 줄바꿈도 잘못 읽힙니다.
3. **인코딩과 BOM**: 한국어 Windows 의 Excel 에서 BOM 이 없는 UTF-8 CSV 를 더블클릭하면 ‹교통› 이 ‹援먰넻› 처럼 깨지는 일이 흔합니다(Excel 버전과 설정에 따라 다르니 고객 PC 에서 직접 확인). ‹utf-8-sig› 로 쓰면 맨 앞에 BOM 3바이트가 붙어 Excel 이 UTF-8 로 인식합니다. 다시 읽을 때도 ‹utf-8-sig› 를 써야 첫 열 이름에 BOM 이 섞이지 않습니다.

### 보안: CSV 수식 주입
메모나 분류가 ‹=›, ‹+›, ‹-›, ‹@› 로 시작하면 스프레드시트가 그 칸을 **수식**으로 해석할 수 있습니다(OWASP 의 CSV Injection). 내가 직접 쓴 데이터만 다루면 위험이 작지만 카드사 CSV·고객이 보낸 파일 같은 외부 입력이 섞이는 순간 현실이 됩니다. OWASP 문서가 소개하는 완화책은 그런 칸 앞에 작은따옴표나 탭을 붙이는 것인데, 데이터가 바뀌고 저장 후 다시 열면 효과가 사라질 수 있어 만능 방법은 없다고 설명합니다. 그래서 외부 입력이 섞이는지부터 확인하고 고객과 합의합니다.

### 변경 방법
변경이 5개 파일에 걸쳐 있어 코드 블록의 파일 경계 줄에 작업 방식을 적었습니다. ‹report.py›·‹validate.py› 는 맨 아래에 추가, ‹export.py› 는 새 파일, ‹commands.py› 는 맨 위 import 줄을 바꾸고 ‹def cmd_summary› 부터 파일 끝까지를 교체, ‹cli.py› 는 validate import 의 마지막 줄만 바꾸고 ‹return parser› 바로 위에 블록을 추가합니다. 새 코드가 어디에 붙는지 눈으로 확인하며 따라 하는 것도 남의 코드를 고치는 연습입니다.

**확인:** 이번에는 ‹demo.json› 을 지우고(아래 명령 앞에는 모두 ‹python -m gagyebu --data demo.json› 을 붙입니다) ‹add "12,000" 식비 --date 2026-10-30›, ‹add 4500 교통 --date 2026-11-03›, ‹add 8000 식비 --date 2026-11-05 --memo "저녁, 회식"› 을 넣습니다. ‹summary --month 2026-11› 은 식비 8,000, 교통 4,500, 합계 12,500원. ‹summary› 는 전체 분류 합계 뒤에 ‹월별 합계:› 아래 ‹2026-10  12,000원›, ‹2026-11  12,500원› 이 나와야 합니다. ‹export out.csv› 로 만든 파일을 Excel 에서 더블클릭해 한글이 정상이고 ‹저녁, 회식› 이 한 칸으로 들어 있는지 확인하고, 마지막으로 ‹python -m unittest› 가 여전히 8개 OK 인지 봅니다.

### 혼자 해 보기: bookshelf
읽은 달별 권수·쪽수 집계(‹--month 2026-11›)와 CSV 내보내기를 만들고, CSV 쓰기는 계산 모듈이 아니라 별도 ‹export.py› 에 두세요. 기준: 제목에 쉼표와 큰따옴표가 든 책이 엑셀에서 한 칸으로 보이고, 파일 첫 3바이트가 BOM 이며, 읽은 책이 없는 달은 ‹0권› 으로 출력됩니다. 기능을 넣은 뒤 기존 테스트부터 돌려 회귀가 없는지 확인하세요.`,
      code: `# === gagyebu/report.py (맨 아래에 추가) ===
def month_key(day):
    return f"{day.year}-{day.month:02d}"


def in_month(entries, month):
    """month 는 'YYYY-MM'. None 이면 전부 돌려준다."""
    return [e for e in entries if month is None or month_key(e.day) == month]


def by_month(entries):
    """{'2026-10': 합계, '2026-11': 합계} 를 월 오름차순으로."""
    sums = {}
    for e in sorted(entries, key=lambda e: e.day):
        key = month_key(e.day)
        sums[key] = sums.get(key, 0) + e.amount
    return sums

# === gagyebu/export.py (새 파일) ===
import csv


def write_csv(path, entries):
    rows = sorted(entries, key=lambda e: (e.day, e.id))
    # utf-8-sig: BOM 이 붙어 엑셀에서 한글이 깨지지 않는다
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "date", "amount", "category", "memo"])
        for e in rows:
            writer.writerow([e.id, e.day.isoformat(), e.amount, e.category, e.memo])
    return len(rows)

# === gagyebu/commands.py (맨 위의 from gagyebu import report, storage 줄을 이 줄로 교체) ===
from gagyebu import export, report, storage

# === gagyebu/commands.py (def cmd_summary 부터 파일 끝까지를 교체) ===
def cmd_summary(args):
    entries = report.in_month(storage.load(args.data), args.month)
    for category, subtotal in report.by_category(entries):
        print(f"{category}: {subtotal:,}원")
    print(f"합계: {report.total(entries):,}원")
    if args.month is None:
        print("월별 합계:")
        for month, subtotal in report.by_month(entries).items():
            print(f"  {month}  {subtotal:,}원")
    return 0


def cmd_export(args):
    entries = storage.load(args.data)
    count = export.write_csv(args.out, entries)
    print(f"{count}건을 {args.out} 에 저장했습니다")
    return 0

# === gagyebu/validate.py (맨 아래에 추가) ===
def parse_month(text):
    try:
        d = datetime.strptime(text.strip(), "%Y-%m")
    except ValueError:
        raise ValidationError(f"월은 YYYY-MM 형식이어야 합니다: {text!r}") from None
    return f"{d.year}-{d.month:02d}"

# === gagyebu/cli.py (validate import 의 마지막 줄만 이 줄로 교체) ===
                              parse_day, parse_month)
# === gagyebu/cli.py (return parser 바로 위에 추가) ===
    summary.add_argument("--month", type=argtype(parse_month), help="YYYY-MM")
    export = sub.add_parser("export", help="CSV 로 내보내기")
    export.add_argument("out", type=Path, help="저장할 CSV 경로")
    export.set_defaults(handler=commands.cmd_export)
`,
      codeLang: `python`,
      key: [
        `월 키 규칙(‹month_key›)을 한 함수에 모아 필터와 집계가 같은 기준을 쓰게 한다. 빈 달은 0원으로 명확히 출력한다.`,
        `csv 모듈은 쉼표·따옴표를 처리해 주며 파일은 ‹newline=""› 로 연다. 직접 ‹",".join› 으로 만들지 않는다.`,
        `Excel 용 한글 CSV 는 ‹encoding="utf-8-sig"› (BOM 포함)로 쓰고 읽을 때도 ‹utf-8-sig› 를 쓴다.`,
        `외부 입력이 섞인 CSV 는 ‹=+-@› 로 시작하는 칸이 수식으로 실행될 수 있다(CSV Injection). 접두 처리나 검증을 고객과 합의한다.`
      ],
      pitfalls: [
        `‹open(path, "w")› 로 CSV 를 쓰고 ‹newline=""› 을 빼면 Windows 에서 행 사이에 빈 줄이 끼고 따옴표 안 줄바꿈이 깨진다.`,
        `BOM 없는 UTF-8 CSV 는 한국어 Excel 에서 한글이 깨져 보인다. 고객 PC 의 Excel 로 직접 열어 확인한 뒤 납품한다.`,
        `월 문자열을 코드 여기저기서 ‹f"{d.year}-{d.month}"› 로 따로 만들면 한 자리 월(‹2026-1› 대 ‹2026-01›)이 어긋나 필터가 비어 버린다. 키 생성은 한 함수에서 한다.`,
        `기능을 추가하고 기존 테스트를 돌리지 않으면 회귀를 놓친다. 매 변경 뒤 ‹python -m unittest› 가 초록인지 먼저 확인하고, 새 코드에는 새 테스트를 붙인다.`
      ]
    },
    {
      title: `8단계. 패키징·README 와 확장 아이디어 (SQLite 로 바꾸기)와 통합 사례`,
      body: `마지막 단계는 **남이 쓸 수 있게 만들어 넘기는** 단계입니다. 설치법과 설명이 빠진 납품은 인수 단계에서 자주 문제가 됩니다.

### 패키징: pip 으로 설치되는 도구
‹pyproject.toml› 은 프로젝트의 이름·버전·필요한 파이썬 버전·실행 명령을 선언하는 표준 파일입니다. ‹[build-system]› 은 빌드 도구(setuptools, 요구 버전 ‹>= 77.0.3› 은 PyPA 가이드의 예시 값이며 2026-11 기준), ‹[project.scripts]› 의 ‹gagyebu = "gagyebu.cli:main"› 은 "설치하면 gagyebu 명령이 생기고 그 명령은 ‹sys.exit(main())› 에 해당하는 일을 한다"는 뜻입니다(PyPA 가이드). 4단계에서 ‹main()› 이 정수를 돌려주게 만든 이유입니다. ‹[tool.setuptools] packages› 로 설치할 패키지를 직접 적으면 자동 탐색(packages 와 py-modules 를 모두 적지 않았을 때만 동작)에 기대지 않고 무엇이 들어가는지 고정합니다. 가상환경을 켠 채 ‹pip install -e .› 를 실행하면 **편집 가능 설치**가 되어 소스를 고치면 바로 반영되고 그 가상환경 안에서 ‹gagyebu list› 로 실행됩니다.

### README 가 납품의 절반
최소 구성은 ① 한 줄 설명 ② 복사해 쓸 수 있는 Windows 설치 명령 ③ 사용 예와 실제 출력 ④ 데이터 파일 위치와 백업 방법 ⑤ 테스트 실행법 ⑥ 알려진 한계 ⑦ 연락처입니다. ‹.gitignore› 에는 ‹.venv/›, ‹__pycache__/› 와 실제 데이터 파일을 넣습니다. 고객의 가계 내역은 개인 금융 정보라 저장소에 올라가면 안 됩니다.

### SQLite 로 바꾸기
JSON 은 ① 매번 전체 재기록 ② 동시 쓰기에 무방비 ③ 조건 검색·부분 수정 불가가 한계입니다. 항목이 많아지거나 수정·검색이 잦거나 동시 사용이 생기면 서버 없이 파일 하나인 SQLite(표준 ‹sqlite3›)가 다음 단계입니다. 핵심 결과는 ‹SqliteStore› 가 ‹Entry› 를 주고받기만 하면 **‹models›·‹report›·‹validate› 를 한 줄도 바꾸지 않고** ‹report.by_category(store.all())› 이 그대로 동작한다는 점이며, 2단계에서 층을 나눈 보상입니다. 설계 포인트는 셋입니다. SQL 값은 ‹?› 자리표시자로만 넘깁니다(공식 문서의 SQL 주입 경고). ‹with con:› 는 성공하면 commit, 예외면 rollback 하지만 **연결을 닫지는 않습니다**. ‹CHECK (amount > 0)›·‹PRIMARY KEY› 제약은 5단계 검증의 마지막 방어선이며, 직접 실행하면 -5원은 ‹CHECK constraint failed: amount > 0›, 중복 id 는 ‹UNIQUE constraint failed: entries.id› 로 막히고 개수는 그대로입니다.

### 통합 사례: 번역가의 월말 정산
프리랜서 번역가가 엑셀로 지출을 정리하다 월말마다 세무사 제출 파일을 만드느라 하루를 씁니다. 월 40~60건, 사용자는 본인 한 명, PC 는 Windows 입니다. ① **인터뷰**: 파이썬 설치 여부, 건수, 사용자 수, 기존 엑셀 열 구성, 세무사가 원하는 열, 백업 습관. ② **범위·견적**: 추가·목록·월별 합계·CSV 는 기본, 삭제·수정은 선택, 화면(GUI/웹)은 별도 견적. 기능별로 쪼개 시간을 합산하고 버퍼를 얹습니다(gigs 의 예시 참고). ③ **인수**: 샘플 데이터로 시연하고, README 만으로 새 가상환경에서 설치가 재현되는지, 테스트 통과, 고객 Excel 에서 CSV 가 열리는지 확인합니다. ④ **확장 제안**: SQLite 이전은 백업 → 한 트랜잭션 가져오기 → 건수·합계 대조 → JSON 보존 순서로 합니다.

### 다른 도구로 옮기는 법
새 의뢰가 와도 이 모듈의 순서가 그대로 체크리스트입니다. ① 폴더·가상환경 ② dataclass ③ 저장·손상 처리 ④ 명령 ⑤ 검증·오류 번역 ⑥ 테스트 ⑦ 집계·내보내기 ⑧ 패키징·README. 바뀌는 것은 도메인뿐입니다. 재고(품목·수량, 부족 목록 집계)나 고객 연락처, 근태 기록도 같은 뼈대입니다.

**확인:** ‹pip install -e .› 후 ‹gagyebu --data demo.json summary› 가 ‹python -m› 없이 동작하고, ‹python -m unittest› 는 여전히 8개 OK 여야 합니다. 파이썬 셸에서 ‹SqliteStore("gagyebu.db")› 에 ‹import_entries(storage.load("demo.json"))› 한 뒤 ‹store.all() == storage.load("demo.json")› 이 ‹True› 로 나와야 합니다.

### 혼자 해 보기: bookshelf
‹bookshelf› 를 pyproject 로 설치되는 명령으로 완성하고 README 를 쓰세요(‹[project]› 에 ‹readme = "README.md"› 를 연결해 보세요). 기준: 새 가상환경에서 README 의 명령만 따라 설치·실행·테스트가 재현되고, 저장소를 SQLite 로 바꿔도 ‹stats.py› 는 한 줄도 바뀌지 않으며, 제약 위반 두 가지(평점 9, 중복 id)가 각각 IntegrityError 로 막힙니다.`,
      code: `# === pyproject.toml ===
[build-system]
requires = ["setuptools >= 77.0.3"]
build-backend = "setuptools.build_meta"

[project]
name = "gagyebu"
version = "0.1.0"
description = "간단한 지출 가계부 명령줄 프로그램"
requires-python = ">= 3.11"
dependencies = []

[project.scripts]
gagyebu = "gagyebu.cli:main"

[tool.setuptools]
packages = ["gagyebu"]

# === gagyebu/sqlite_store.py ===
import sqlite3
from datetime import date

from gagyebu.models import Entry

SCHEMA = """
CREATE TABLE IF NOT EXISTS entries (
    id       INTEGER PRIMARY KEY,
    day      TEXT    NOT NULL,
    amount   INTEGER NOT NULL CHECK (amount > 0),
    category TEXT    NOT NULL,
    memo     TEXT    NOT NULL DEFAULT ''
)
"""


class SqliteStore:
    def __init__(self, path):
        self.con = sqlite3.connect(path)
        with self.con:
            self.con.execute(SCHEMA)

    def add(self, day, amount, category, memo=""):
        with self.con:
            cur = self.con.execute(
                "INSERT INTO entries (day, amount, category, memo)"
                " VALUES (?, ?, ?, ?)",
                (day.isoformat(), amount, category, memo))
        return Entry(cur.lastrowid, day, amount, category, memo)

    def all(self):
        rows = self.con.execute(
            "SELECT id, day, amount, category, memo FROM entries"
            " ORDER BY id").fetchall()
        return [Entry(i, date.fromisoformat(d), a, c, m) for i, d, a, c, m in rows]

    def import_entries(self, entries):
        """JSON 에서 옮길 때: 기존 id 를 그대로 보존한다."""
        with self.con:
            self.con.executemany(
                "INSERT INTO entries (id, day, amount, category, memo)"
                " VALUES (?, ?, ?, ?, ?)",
                [(e.id, e.day.isoformat(), e.amount, e.category, e.memo)
                 for e in entries])

    def close(self):
        self.con.close()
`,
      codeLang: `python`,
      key: [
        `‹pyproject.toml› 의 ‹[project.scripts]› 가 설치 시 명령(‹gagyebu›)을 만들고, 그 명령은 ‹main()› 의 반환값을 종료 코드로 쓴다. ‹pip install -e .› 로 개발 중 설치한다.`,
        `README 는 설치·사용 예(실제 출력)·데이터 위치와 백업·테스트 실행·한계를 담고, ‹.gitignore› 로 ‹.venv›·실제 데이터를 제외한다.`,
        `층을 나눈 덕에 저장소를 JSON 에서 SQLite 로 바꿔도 ‹models›·‹report›·‹validate› 는 그대로다. 바뀌는 곳은 storage 계층뿐이다.`,
        `SQL 은 ‹?› 자리표시자만 쓰고, ‹with con:› 는 commit/rollback 만 하고 닫지 않으며, 제약(CHECK·PRIMARY KEY)을 마지막 방어선으로 둔다.`
      ],
      pitfalls: [
        `SQL 을 f-string 으로 조립하면(‹WHERE category = '{name}'›) 입력 하나로 쿼리가 바뀌는 SQL 주입이 된다. 값은 항상 ‹?› 로 넘긴다.`,
        `JSON 에서 SQLite 로 옮기며 원본을 지우면 되돌릴 길이 없다. 백업 → 가져오기 → 건수·합계 대조를 거친 뒤에도 JSON 은 한동안 보존한다. 같은 id 를 두 번 가져오면 UNIQUE 오류가 나므로 한 번만 실행되게 만든다.`,
        `README 없이 소스만 넘기면 고객은 설치·백업 방법을 몰라 장애마다 당신을 부른다. 새 가상환경에서 README 대로만 설치되는지 직접 재현한 뒤 납품한다.`,
        `‹pip install -e .› 후에도 ‹.venv› 를 끄고 새 터미널에서 ‹gagyebu› 를 치면 명령이 없다고 나온다. 명령은 그 가상환경 안에만 설치된 것이다.`
      ]
    }
  ],
  labs: [
    {
      title: `Lab 1. delete 명령과 회귀 테스트`,
      scenario: `가족이 쓰는 가계부에서 "잘못 넣은 항목을 지울 수 없다"는 불만이 들어왔습니다. 지금 방법은 data.json 을 손으로 고치는 것뿐이라 7단계에서 만든 월별 집계까지 어긋날 위험이 있습니다. 항목 삭제 기능을 추가하되, 먼저 7단계에서 테스트 없이 넘어간 report·export 모듈에 테스트를 붙여 안전망을 만든 다음 작업하세요. 답안은 제공하지 않으며 완성 기준은 아래 측정 조건입니다.`,
      steps: [
        `tests/test_report.py 에서 month_key·in_month·by_month 를, tests/test_export.py 에서 write_csv 를 테스트한다. 월 경계(2026-10-31 과 2026-11-01 이 다른 달), 빈 목록의 합계 0, 월 오름차순 정렬, 쉼표가 든 메모가 한 칸으로 읽히는지, CSV 첫 3바이트가 BOM 인지를 포함한다.`,
        `delete 명령의 실패하는 테스트부터 쓴다: 존재하는 id 삭제, 없는 id 삭제(종료 코드 1, 표준 오류 한 줄), id 에 abc 나 0 을 준 경우(종료 코드 2).`,
        `models.py 에 항목 목록에서 id 로 하나를 제거한 새 목록을 돌려주는 순수 함수를 만든다. 없는 id 는 직접 정의한 예외로 알린다.`,
        `validate.py 에 양의 정수 id 를 읽는 parse_id 를 추가하고, cli.py 에 delete 서브커맨드를 argtype 으로 연결한다. main() 에서 새 예외도 한 줄 메시지로 처리한다.`,
        `삭제 뒤 새로 추가하면 번호를 어떻게 매길지 정한다(max+1 이면 마지막 항목을 지웠을 때 번호가 재사용됨). 정책을 테스트로 고정하고 README 에 한 줄 적는다.`,
        `일부러 틀린 구현(예: 항상 첫 항목을 삭제)으로 새 테스트가 실제로 실패하는 것을 한 번 확인하고 되돌린다. 실패 로그 한 줄을 메모한다.`,
        `python -m unittest 로 전체를 실행해 모두 통과하는지 확인한다.`
      ],
      accept: [
        `항목 3개 중 id 2 를 delete 한 뒤 list 에 #2 가 없고 #1·#3 의 번호는 변하지 않는다.`,
        `없는 id 를 지우면 종료 코드 1 과 한 줄 오류 메시지(트레이스백 없음)가 나오고 데이터 파일 내용이 바뀌지 않는다.`,
        `새 테스트가 최소 7개(report·export 4개 이상 + delete 3개 이상)이고 python -m unittest 가 모두 통과한다.`,
        `테스트가 의도적인 오구현에서는 실패하고 올바른 구현에서는 통과하는 것을 직접 확인했다.`
      ],
      stretch: `edit 명령(edit 2 --amount 5000)을 dataclasses.replace 로 구현하고, 항목 10만 건짜리 JSON 을 만들어 list·summary 실행 시간을 time.perf_counter 로 재서 어느 지점부터 느리다고 느껴지는지 기록해 보세요.`
    },
    {
      title: `Lab 2. 수입/지출 구분과 기존 파일 호환 (스키마 v2)`,
      scenario: `사용자가 지출뿐 아니라 수입도 기록하고 싶어 합니다. 문제는 이미 몇 달 치 데이터가 version 1 형식 data.json 으로 쌓여 있다는 점입니다. 새 버전을 설치했더니 기존 파일이 열리지 않으면 고객은 데이터를 잃었다고 느낍니다. 3단계에서 version 필드를 넣어 둔 이유를 실제로 쓰는 작업이며, 하위 호환을 어떻게 증명하는지가 핵심입니다. 답안은 제공하지 않습니다.`,
      steps: [
        `tests/fixtures/v1.json 에 현재 형식(version 1, kind 없음)의 샘플 파일을 3건 만들어 둔다. 이후 이 파일은 수정하지 않는다.`,
        `Entry 에 kind 필드(expense 또는 income, 기본 expense)를 추가하고 to_dict·from_dict 를 고친다. kind 가 없는 옛 항목은 expense 로 읽고, 알 수 없는 값이면 오류를 낸다.`,
        `storage.py 의 VERSION 을 2 로 올리고 load 는 version 1 과 2 만 허용한다. 그 밖의 번호(예: 3)는 "더 새로운 프로그램으로 만든 파일입니다" 안내와 함께 StorageError 로 처리하고 원본을 건드리지 않는다.`,
        `add 에 --income 플래그를 추가하고, summary 는 수입 합계·지출 합계·순액(수입-지출)을 보여 준다. 월별 합계도 순액 기준으로 맞춘다.`,
        `CSV 에 kind 열을 맨 끝에 추가한다(기존 열 순서는 유지).`,
        `테스트를 쓴다: v1.json 로드, v2 저장 후 재로드, version 3 파일 거부, 잘못된 kind 거부, 수입·지출 혼합 합계.`
      ],
      accept: [
        `v1.json 을 수정 없이 읽어 모든 항목이 kind 가 expense 로 로드된다.`,
        `v1 파일에 add 로 항목을 하나 추가해 저장하면 파일의 version 이 2 로 바뀌고 기존 항목이 모두 보존된다.`,
        `version 3 파일을 열면 종료 코드 1 과 버전 안내 문구가 나오고 파일 내용이 그대로다.`,
        `수입 100,000원과 지출 30,000원을 넣으면 순액 70,000원이 출력된다.`,
        `추가한 테스트가 5개 이상이고 기존 8개와 함께 모두 통과한다.`
      ],
      stretch: `v1 파일을 v2 로 처음 저장하기 직전에 data.json.v1.bak 으로 한 번만 백업하는 기능을 넣고, 백업이 이미 있으면 덮어쓰지 않는 테스트를 추가하세요.`
    },
    {
      title: `Lab 3 (클라이언트 요청). 카드 내역 CSV 가져오기 import 명령`,
      scenario: `개인 사업자 고객이 매달 카드사 사이트에서 내려받은 CSV(열: 날짜, 가맹점, 금액)를 가계부에 한 번에 넣고 싶다고 합니다. 파일은 한국 카드사 특성상 cp949 인코딩일 때가 많고, 가끔 날짜나 금액이 깨진 행과 빈 줄이 섞여 있으며, 같은 파일을 실수로 두 번 가져와도 항목이 중복되면 안 됩니다. 고객은 개발자가 아니므로 오류는 몇 번째 줄이 왜 틀렸는지 한국어로 알려 줘야 합니다. 견적 전에 확인할 질문 목록(인코딩, 구분자, 금액 표기, 분류 규칙)도 함께 작성해 제출하세요.`,
      steps: [
        `질문 목록 5개 이상을 먼저 문서로 쓴다(인코딩, 헤더 유무, 날짜 표기(2026-11-03 인지 2026.11.03 인지), 금액의 쉼표·원 표기, 환불 행 처리, 분류 규칙). 날짜 표기가 5단계의 parse_day 와 다르면 변환 단계가 필요하다는 점을 견적에 반영한다.`,
        `샘플 CSV 두 개를 만든다. 같은 내용을 utf-8 과 cp949 로 각각 저장하고, 정상 5행·날짜 오류 1행·금액 오류 1행·빈 줄 1행을 넣는다.`,
        `import 서브커맨드를 만든다: import 파일 --encoding cp949 --category 미분류 --dry-run. 기본 인코딩은 utf-8-sig 로 한다.`,
        `행마다 5단계의 parse_day·parse_amount 를 재사용해 검증한다. 틀린 행은 건너뛰고 행 번호와 이유를 표준 오류에 모아 출력하며, 성공한 행만 모아 한 번의 save 로 저장한다.`,
        `중복 방지: 날짜·금액·메모(가맹점)가 모두 같은 항목이 이미 있으면 건너뛴다. 끝에 추가 N, 중복 N, 오류 N 요약을 한 줄로 출력한다.`,
        `오류 행이 하나라도 있으면 종료 코드 3, 없으면 0 으로 한다(자동화 스크립트가 감지하도록). --dry-run 은 저장하지 않고 요약만 보여 준다.`,
        `잘못된 인코딩을 지정해 읽으면 한 줄 오류로 끝나게 하고, README 에 사용법과 한글이 깨질 때의 대처(--encoding)를 적는다.`,
        `테스트를 6개 이상 쓴다(두 인코딩, 오류 행 보고, 재가져오기 중복, dry-run 무변경, 잘못된 인코딩).`
      ],
      accept: [
        `샘플 파일을 처음 가져오면 추가 5, 중복 0, 오류 2 요약이 나오고, 같은 파일을 다시 가져오면 추가 0, 중복 5, 오류 2 가 나온다.`,
        `오류 메시지에 행 번호가 들어 있다(예: 4행: 날짜 형식이 올바르지 않습니다).`,
        `--dry-run 실행 전후로 데이터 파일의 내용이 바이트 단위로 같다.`,
        `utf-8 샘플과 cp949 샘플 모두 한글 가맹점이 깨지지 않고 들어가며, 잘못된 인코딩 지정은 트레이스백 없이 한 줄 오류가 된다.`,
        `새 테스트가 6개 이상이고 기존 테스트와 함께 모두 통과한다. 오류 행이 있을 때 종료 코드가 3 이다.`
      ],
      stretch: `가맹점 이름에 포함된 단어로 분류를 정하는 rules.json 을 읽어 자동 분류하고(없으면 미분류), 메모가 =, +, -, @ 로 시작하면 CSV 로 다시 내보낼 때 앞에 작은따옴표를 붙여 수식 주입을 막는 옵션을 추가해 보세요.`
    }
  ],
  quiz: [
    {
      q: `프로젝트 구조: gagyebu 폴더(패키지) 안에 __init__.py 와 __main__.py 가 있고, __main__.py 의 3번째 줄은 from gagyebu import __version__ 이다.

PS C:\\work\\gagyebu-project> python -m gagyebu
gagyebu 0.1.0
PS C:\\work\\gagyebu-project> python gagyebu\\__main__.py
Traceback (most recent call last):
  File "C:\\work\\gagyebu-project\\gagyebu\\__main__.py", line 3, in <module>
    from gagyebu import __version__
ModuleNotFoundError: No module named 'gagyebu'

같은 코드인데 두 번째 방식만 실패하는 이유는?`,
      choices: [
        `가상환경이 활성화되지 않아 두 번째 명령이 다른 버전의 python 을 실행해서`,
        `__init__.py 가 비어 있어 gagyebu 가 패키지로 인식되지 않아서`,
        `파일 경로로 실행하면 그 파일이 든 gagyebu 폴더가 sys.path 맨 앞이 되어, 프로젝트 루트에 있는 gagyebu 패키지를 찾지 못해서`,
        `Windows 에서는 하위 폴더의 .py 파일을 직접 실행할 수 없어서`
      ],
      answer: 2,
      why: `-m 은 현재 폴더(프로젝트 루트)를 import 경로에 넣어 패키지로 실행하지만, 파일 경로 실행은 그 파일이 든 폴더를 경로 맨 앞에 둡니다. 그 폴더 안에는 gagyebu 라는 이름이 없으니 import 가 실패합니다. 두 명령은 같은 python 이라 가상환경 활성화 여부(가장 그럴듯한 오답)와 무관하고, 같은 __init__.py 가 -m 에서는 통했으므로 패키지 인식 문제도 아닙니다. 해결은 코드에서 sys.path 를 고치는 것이 아니라 루트에서 -m 으로 실행하는 것입니다.`
    },
    {
      q: `고객 PC(관리자 권한 없음)에서 가상환경을 켜려다 막혔다.

PS C:\\work\\gagyebu> .venv\\Scripts\\Activate.ps1
Activate.ps1 : 이 시스템에서 스크립트를 실행할 수 없으므로 Activate.ps1 파일을 로드할 수 없습니다.

시스템 보안 설정은 최소한만 바꾸고 싶다. 가장 적절한 조치는?`,
      choices: [
        `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser 로 현재 사용자만 허용하거나, 활성화 없이 .venv\\Scripts\\python.exe 를 직접 호출한다`,
        `Set-ExecutionPolicy Unrestricted -Scope LocalMachine 으로 컴퓨터 전체 정책을 푼다`,
        `가상환경을 포기하고 전역 파이썬에 pip install 한다`,
        `백신과 방화벽을 끈 뒤 다시 실행한다`
      ],
      answer: 0,
      why: `실행 정책은 범위(Scope)를 정할 수 있고 공식 문서도 CurrentUser 범위의 RemoteSigned 를 안내합니다. 활성화는 PATH 앞에 Scripts 폴더를 붙이는 일일 뿐이라 python.exe 를 직접 불러도 같은 결과입니다. LocalMachine 전체 해제는 관리자 권한이 필요하고 영향 범위가 지나치게 넓은 가장 그럴듯한 오답이며, 전역 설치는 의존성 충돌과 고객 PC 오염을 부르고, 백신·방화벽은 이 오류와 무관합니다.`
    },
    {
      q: `entry = Entry(1, date(2026, 11, 3), 12000, "식비")
entry.amount = 15000

dataclasses.FrozenInstanceError: cannot assign to field 'amount'

금액을 15,000원으로 고치는 가장 적절한 방법은?`,
      choices: [
        `@dataclass(frozen=True) 를 지워 어디서든 값을 바꿀 수 있게 한다`,
        `object.__setattr__(entry, "amount", 15000) 으로 강제로 바꾼다`,
        `entry.__dict__["amount"] = 15000 으로 직접 넣는다`,
        `dataclasses.replace(entry, amount=15000) 으로 새 Entry 를 만들어 목록의 기존 항목과 바꿔 끼운다`
      ],
      answer: 3,
      why: `frozen 은 "만든 뒤 몰래 바뀌지 않는다"는 보장을 주는 설계입니다. 변경은 값을 바꾼 새 객체를 만들어 목록에서 교체하는 방식이 맞고 replace 가 그 도구입니다. frozen 을 지우는 것은 되긴 하지만 보장을 버리는 선택(가장 그럴듯한 오답)이고, __setattr__ 이나 __dict__ 로 우회하는 것은 이후 코드가 객체를 불변이라고 믿는 가정을 깨뜨리는 해킹입니다.`
    },
    {
      q: `data.json
{"version": 1, "entries": [{"id": 1, "date": "2026-11-03", "amount": "12000", "category": "식비"}]}
(Entry.from_dict 에 타입 검사가 없다고 가정)

$ python -m gagyebu summary
Traceback (most recent call last):
  File "gagyebu/report.py", line 2, in total
    return sum(e.amount for e in entries)
TypeError: unsupported operand type(s) for +: 'int' and 'str'

트레이스백은 report.py 를 가리킨다. 근본 원인과 가장 적절한 수정은?`,
      choices: [
        `report.total 안에서 int(e.amount) 로 변환해 문제를 해결한다`,
        `값이 들어오는 경계(Entry.from_dict 와 storage.load)에서 타입을 검사해 StorageError 로 알리고, 도메인 코드는 올바른 값만 받는다고 가정한다`,
        `summary 명령 전체를 try/except Exception: pass 로 감싸 조용히 넘어간다`,
        `data.json 을 삭제하고 새로 시작하도록 안내한다`
      ],
      answer: 1,
      why: `잘못된 값은 파일을 읽는 순간 들어왔는데 오류는 한참 뒤 집계에서 터진 것이므로, 원인과 가까운 경계에서 검사해야 사용자에게 어느 파일의 어느 값이 틀렸는지 알려 줄 수 있습니다. 집계 함수에서 int() 로 변환하는 것은 증상만 가리는 땜질(가장 그럴듯한 오답)이라 다른 계산 함수에서 같은 문제가 또 터지고, 예외를 삼키는 것은 버그를 숨기며, 파일 삭제는 사용자 데이터를 버립니다.`
    },
    {
      q: `def save(path, entries):
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"version": 1, "entries": [e.to_dict() for e in entries]}, f, ensure_ascii=False)

고객: "저장하는 순간 컴퓨터가 꺼졌더니 data.json 이 0바이트가 됐어요. 어제까지의 내역이 전부 사라졌어요."

설계상 원인과 해법은?`,
      choices: [
        `open(path, "w") 는 여는 즉시 파일을 비우므로 쓰는 도중 중단되면 빈 파일이나 잘린 파일이 남는다. 같은 폴더의 임시 파일에 끝까지 쓴 뒤 os.replace 로 교체한다`,
        `ensure_ascii=False 가 파일을 불안정하게 만든 것이므로 True 로 바꾼다`,
        `encoding="utf-8" 지정이 원인이므로 인코딩 지정을 뺀다`,
        `json.dump 가 느려서 생긴 문제이니 indent 를 쓰지 않아 파일을 작게 만든다`
      ],
      answer: 0,
      why: `쓰기 모드로 여는 순간 기존 내용이 사라지는 것이 핵심입니다. 임시 파일 + os.replace 는 교체가 한 번에 일어나서 독자가 옛 파일이나 새 파일 중 하나만 보게 합니다(같은 파일시스템일 때). 나머지 선택지(ensure_ascii, encoding 지정)는 이 증상과 관계가 없고, 파일을 작게 만들어 쓰기 시간을 줄이는 방법은 중단될 확률을 조금 낮출 뿐 근본 구조를 그대로 둡니다.`
    },
    {
      q: `$ python -m gagyebu list --data demo.json
usage: gagyebu [-h] [--data DATA] {add,list,summary} ...
gagyebu: error: unrecognized arguments: --data demo.json

원인은?`,
      choices: [
        `demo.json 파일이 존재하지 않아서`,
        `list 서브커맨드는 파일을 열 수 없게 설계되어 있어서`,
        `--data 는 Windows 에서 예약된 옵션 이름이라서`,
        `--data 는 최상위 파서에 정의된 옵션이라 서브커맨드 앞에 와야 한다. python -m gagyebu --data demo.json list 로 쓴다`
      ],
      answer: 3,
      why: `서브커맨드 뒤의 인자는 그 서브커맨드의 파서가 해석하는데 list 파서에는 --data 가 없어 "unrecognized arguments" 가 됩니다. 파일이 없었다면 오류 문구가 다르고(해석 단계 이후에 나타남), 예약어 같은 것은 없습니다. 같은 옵션을 두 파서에 중복 정의해 해결하려 하면 기본값이 서로 덮어쓰는 혼란이 생기니 한 곳에만 두는 것이 낫습니다.`
    },
    {
      q: `class ValidationError(ValueError):
    pass

def parse_amount(text):
    amount = int(text)
    if amount < 1:
        raise ValidationError("금액은 1원 이상이어야 합니다")
    return amount

add.add_argument("amount", type=parse_amount)

$ python -m gagyebu add -5 식비
usage: gagyebu add [-h] [--memo MEMO] [--date DAY] amount category
gagyebu add: error: argument amount: invalid parse_amount value: '-5'

직접 쓴 메시지가 보이지 않는다. 가장 좋은 해결은?`,
      choices: [
        `오류 문구는 stdout 으로만 나오므로 2>&1 로 합쳐서 확인한다`,
        `argparse 는 type 함수의 예외를 전부 삼키므로 type= 을 쓰지 말고 모든 검증을 파싱 뒤에 한다`,
        `argparse 는 type 함수가 ValueError(하위 클래스 포함)나 TypeError 를 내면 일반 문구로 바꾸고 ArgumentTypeError 의 메시지만 그대로 보여 준다. ValidationError 를 ArgumentTypeError 로 번역하는 얇은 어댑터를 type 에 쓴다`,
        `ValidationError 가 ValueError 를 상속해서 문제이므로 Exception 을 직접 상속하게 바꾼다`
      ],
      answer: 2,
      why: `ValidationError 는 ValueError 의 하위 클래스이므로 argparse 가 잡아서 함수 이름이 들어간 일반 문구로 바꿉니다. 도메인 코드를 argparse 에 묶지 않으려면 경계에서 번역하는 어댑터가 맞습니다. Exception 을 직접 상속하게 바꾸면 반대로 argparse 가 예외를 잡지 못해 트레이스백이 터지고, 검증을 파싱 뒤로 미루면 type 변환의 이점(오류 위치와 사용법 자동 출력)을 버립니다.`
    },
    {
      q: `# 쉼표를 제거만 하는 검증 (잘못된 구현)
def parse_amount(text):
    return int(text.replace(",", ""))

PS> python -m gagyebu --data demo.json add 12,000 식비
추가: #1 2026-11-12 120원 식비

사용자는 12,000원을 기대했다. 원인과 최선의 대응은?`,
      choices: [
        `Python 의 int() 가 쉼표를 잘못 처리하는 버그다`,
        `PowerShell 이 따옴표 없는 12,000 을 배열로 해석해 프로그램에는 12,0 이 전달된다. "12,000" 처럼 따옴표를 쓰도록 안내하고, 쉼표가 3자리 묶음일 때만 허용하는 형식 검증으로 이런 값을 거부한다`,
        `한글 인코딩(cp949) 문제로 숫자가 깨진 것이니 PYTHONUTF8=1 을 설정한다`,
        `argparse 가 쉼표를 구분자로 보고 인자를 나누므로 nargs=1 을 지정한다`
      ],
      answer: 1,
      why: `프로그램이 받은 값은 12,0 이었고 쉼표를 지우면 120 이 됩니다. 실행 환경이 입력을 바꾼 사례라 사용자 안내(따옴표)와 프로그램의 형식 검증이 함께 필요합니다. int() 는 올바르게 동작했고(가장 그럴듯한 오답), 인코딩은 숫자와 무관하며, 쉼표를 구분자로 해석한 것은 argparse 가 아니라 PowerShell 입니다.`
    },
    {
      q: `gagyebu-project/
  gagyebu/
  tests/
    test_cli.py
    test_storage.py

PS> python -m unittest
----------------------------------------------------------------------
Ran 0 tests in 0.000s

NO TESTS RAN

테스트 파일이 분명히 있는데 0개다. Python 3.12 이상에서 가장 가능성이 높은 원인은?`,
      choices: [
        `tests 폴더에 __init__.py 가 없어 discovery 가 그 폴더를 패키지로 보지 않는다. 빈 __init__.py 를 만든다`,
        `unittest 는 pytest 가 설치되어 있어야 테스트를 찾는다`,
        `테스트 파일 안에 print 문이 하나도 없어서`,
        `가상환경이 비활성화되어 있어서`
      ],
      answer: 0,
      why: `공식 문서는 3.11 부터 discovery 의 시작 폴더와 하위 폴더가 __init__.py 가 있는 정식 패키지여야 한다고 설명합니다(3.14 문서는 시작 폴더의 네임스페이스 패키지를 다시 허용하지만 __init__.py 없는 하위 폴더는 여전히 검색하지 않습니다). 파일명이 test*.py 패턴이므로 이름은 문제가 없습니다. 이 증상은 3.12 부터 NO TESTS RAN 과 종료 코드 5 로 드러나지만, 3.11 에서는 Ran 0 tests 와 OK(종료 코드 0)로 끝나 CI 가 초록으로 보일 수 있다는 점이 위험합니다. 그래서 항상 실행된 테스트 개수를 확인합니다. pytest 설치 여부나 가상환경과는 무관합니다.`
    },
    {
      q: `def test_summary_this_month(self):
    run("--data", self.data, "add", "3000", "식비")      # --date 를 생략: 오늘 날짜
    code, out, _ = run("--data", self.data, "summary", "--month", "2026-11")
    self.assertIn("합계: 3,000원", out)

11월 내내 통과하던 CI 가 12월 1일 아침에 실패했다.
AssertionError: '합계: 3,000원' not found in '합계: 0원\\n'

원인과 해법은?`,
      choices: [
        `unittest 가 테스트 순서를 무작위로 바꾸므로 시드를 고정한다`,
        `임시 폴더 권한이 12월에 바뀌었으니 CI 권한을 수정한다`,
        `테스트가 실행 시점의 오늘 날짜에 의존한다. add 에 --date 2026-11-03 처럼 날짜를 고정하거나 날짜를 주입해 언제 돌려도 같은 결과가 나오게 한다`,
        `summary --month 가 12월에는 동작하지 않는 코드 버그이므로 월 계산 코드를 고친다`
      ],
      answer: 2,
      why: `--date 를 생략하면 오늘 날짜(12월 1일)로 저장되어 2026-11 합계는 0원이 됩니다. 코드는 정상이고 테스트가 환경(현재 시각)에 숨은 의존을 가진 것이 문제입니다. 이런 테스트는 말일·연말·자정에 가끔만 깨져 원인 찾기가 어렵습니다. 정상인 월 계산 코드를 고치면 오히려 버그를 만듭니다.`
    },
    {
      q: `with open("지출.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["id", "date", "amount", "category"])
    writer.writerow([1, "2026-11-03", 4500, "교통"])

고객: "엑셀에서 더블클릭하면 교통 이 援먰넻 처럼 보여요. 메모장으로 열면 정상이에요."

가장 적절한 수정은?`,
      choices: [
        `newline="" 때문이므로 제거한다`,
        `csv 모듈이 한글을 지원하지 않으므로 cp949 로 직접 인코딩한 문자열을 쓴다`,
        `쉼표 대신 탭을 구분자로 쓰도록 delimiter 를 바꾼다`,
        `BOM 이 없는 UTF-8 이라 Excel 이 다른 인코딩으로 추정한 것이다. encoding="utf-8-sig" 로 쓰고, 다시 읽을 때도 utf-8-sig 를 쓴다`
      ],
      answer: 3,
      why: `메모장에서 정상이라는 것은 파일 내용(UTF-8)이 맞다는 뜻이고, Excel 이 BOM 없는 파일의 인코딩을 잘못 추정하는 것이 원인입니다. utf-8-sig 는 BOM 을 붙여 UTF-8 임을 알려 줍니다. newline="" 은 줄바꿈 문제를 막기 위해 필요하므로 제거하면 안 되고, csv 모듈은 인코딩과 무관하게 한글을 다룹니다. 구분자는 한글 깨짐과 상관없습니다.`
    },
    {
      q: `고객 요청: "사무실 PC 3대에서 공유 폴더의 data.json 하나를 같이 쓰고 싶어요. 가끔 동시에 입력해요."

현재 구조는 저장할 때마다 파일 전체를 읽어 목록에 추가하고 전체를 다시 쓴다.
견적 전에 가장 현실적인 대응은?`,
      choices: [
        `os.replace 가 원자적이므로 동시에 써도 안전하다고 설명하고 그대로 납품한다`,
        `두 PC 가 같은 시점에 읽고 각자 쓰면 나중 저장이 앞 저장을 덮어쓰는 갱신 손실이 난다는 한계를 설명하고, 동시 입력 빈도를 확인한 뒤 서버 기반 저장소 같은 확장을 별도 범위·견적으로 제안한다`,
        `파일 확장자를 .db 로 바꾸면 자동으로 동시 접근이 처리된다고 안내한다`,
        `저장 주기를 짧게 해 충돌 확률을 낮추고 계약서에서 "가끔 문제가 생길 수 있음" 조항은 뺀다`
      ],
      answer: 1,
      why: `os.replace 는 파일 한 개가 반쯤 써진 상태로 보이는 것을 막을 뿐이고, 읽기-수정-쓰기 사이에 끼어든 다른 저장을 막지 못합니다. 그래서 마지막 저장이 이기는 갱신 손실이 생깁니다. "원자적이라 안전하다"는 가장 그럴듯한 오답은 이 차이를 오해한 것이고, 확장자만 바꾸면 된다는 안내는 사실이 아니며, 위험 조항을 빼는 것은 위험을 숨기는 비윤리적 대응입니다. 요구가 바뀌면 범위·견적도 바뀐다는 것을 분명히 하는 것이 외주의 기본입니다.`
    }
  ],
  refs: [
    { title: `venv — Creation of virtual environments (Python 공식 문서)`, url: `https://docs.python.org/3/library/venv.html`, kind: `doc`, why: `가상환경 생성, Windows 의 cmd·PowerShell 활성화 명령, pyvenv.cfg, PowerShell 실행 정책 안내를 확인한 1단계의 근거 문서.` },
    { title: `argparse — Parser for command-line options, arguments and subcommands`, url: `https://docs.python.org/3/library/argparse.html`, kind: `doc`, why: `add_subparsers(dest, required), set_defaults 로 처리 함수 연결(문서 예제는 func, 이 모듈은 handler), type 함수와 ArgumentTypeError, -5 같은 음수 위치 인자, 종료 코드 2 를 확인하는 4·5단계의 기준 문서.` },
    { title: `unittest — Unit testing framework`, url: `https://docs.python.org/3/library/unittest.html`, kind: `doc`, why: `test discovery 기본값과 3.11 의 패키지 요건(3.14 변경 포함), setUp 이 실패해도 addCleanup 이 실행된다는 점, subTest, 테스트가 없을 때 종료 코드 5 를 다루는 6단계의 근거.` },
    { title: `dataclasses — Data Classes`, url: `https://docs.python.org/3/library/dataclasses.html`, kind: `doc`, why: `frozen 과 FrozenInstanceError, 가변(해시 불가) 기본값이 ValueError 가 되는 규칙과 default_factory, replace 로 새 객체를 만드는 방법을 확인해 2단계의 설계 결정을 뒷받침한다.` },
    { title: `json — JSON encoder and decoder`, url: `https://docs.python.org/3/library/json.html`, kind: `doc`, why: `ensure_ascii·indent, JSONDecodeError 가 ValueError 의 하위라는 점, 역직렬화기가 BOM 이 있으면 ValueError 를 낸다는 점, RFC 가 UTF-8 을 권장한다는 점을 확인한 3단계의 근거.` },
    { title: `csv — CSV File Reading and Writing`, url: `https://docs.python.org/3/library/csv.html`, kind: `doc`, why: `newline="" 가 필요한 이유, DictWriter, 기본 줄 끝 문자, 인코딩은 open() 에서 지정한다는 점을 확인한 7단계의 근거.` },
    { title: `sqlite3 — DB-API 2.0 interface for SQLite databases`, url: `https://docs.python.org/3/library/sqlite3.html`, kind: `doc`, why: `? 자리표시자, 연결의 with 문이 commit/rollback 만 하고 닫지 않는다는 점, executemany, :memory: 를 확인한 8단계의 근거.` },
    { title: `Writing your pyproject.toml (Python Packaging User Guide)`, url: `https://packaging.python.org/en/latest/guides/writing-pyproject-toml/`, kind: `doc`, why: `build-system, project 필드, project.scripts 의 콘솔 스크립트 문법과 반환값이 종료 코드가 된다는 설명을 확인한 8단계의 근거.` },
    { title: `Configuring setuptools using pyproject.toml files`, url: `https://setuptools.pypa.io/en/latest/userguide/pyproject_config.html`, kind: `doc`, why: `tool.setuptools 의 packages 목록 지정, py-modules 와 packages 가 모두 없을 때 자동 탐색이 동작한다는 점, pyproject 의 project 설정이 setuptools 61.0.0 이상에서 지원된다는 점을 확인한 8단계의 근거.` },
    { title: `Errors and Exceptions (Python Tutorial)`, url: `https://docs.python.org/3/tutorial/errors.html`, kind: `doc`, why: `except 매칭 순서, raise from 과 from None, 사용자 정의 예외, 구체적 예외만 처리하라는 권고를 다룬 5단계의 근거.` },
    { title: `os — Miscellaneous operating system interfaces (os.replace)`, url: `https://docs.python.org/3/library/os.html`, kind: `doc`, why: `os.replace 가 기존 파일을 조용히 교체하고 성공 시 원자적이며 파일시스템이 다르면 실패할 수 있다는 점, 디스크 기록을 강제하는 flush 와 os.fsync 사용법을 확인한 3단계의 근거.` },
    { title: `Using Python on Windows`, url: `https://docs.python.org/3/using/windows.html`, kind: `doc`, why: `py 런처와 Python install manager, Microsoft Store 별칭 문제 해결, 3.15 에서 UTF-8 모드가 기본이 된다는 내용을 확인한 1단계의 근거(2026-11 기준).` },
    { title: `Status of Python versions (Python Developer's Guide)`, url: `https://devguide.python.org/versions/`, kind: `doc`, why: `3.10 의 지원 종료(2026-10-01)와 3.11(2027-10)·3.12(2028-10) 종료 예정일을 확인해 권장 파이썬 버전을 정하는 근거(2026-11 기준).` },
    { title: `CSV Injection (OWASP Community)`, url: `https://community.owasp.org/attacks/CSV_Injection`, kind: `article`, why: `=, +, -, @ 로 시작하는 칸(탭·줄바꿈 포함)이 수식으로 해석되는 위험, 작은따옴표·탭 접두 완화책, 그리고 만능 방어법은 없다는 설명을 확인한 7단계 보안 절의 근거.` }
  ],
  gigs: [
    `이런 의뢰는 "엑셀 대신 쓸 프로그램", "월말 정산 자동화", "CSV 정리 스크립트" 같은 말로 들어옵니다. 견적 전에 반드시 물을 것: 고객 PC 의 Windows 버전과 파이썬 설치 여부·관리자 권한, 데이터 건수와 사용자 수, 동시 사용 여부, 기존 엑셀 열 구성, 백업 습관, 결과물을 받는 사람(세무사 등)의 요구 형식. 이 답에 따라 같은 기능도 작업량이 두 배가 됩니다.`,
    `납품물 체크리스트: 소스 + pyproject.toml, README(새 가상환경에서 그대로 따라 하면 설치되는 명령, 사용 예와 실제 출력, 데이터 위치·백업 방법, 알려진 한계), 통과하는 테스트와 실행 방법, 샘플 데이터(가짜 값). 고객이 개발자가 아니면 설치·실행 명령을 .bat 한 줄로 감싸 주고 첫 설치는 함께 진행하는 것이 가장 분쟁이 적습니다. exe 로 묶는 도구도 있지만 백신 오탐·서명 같은 부수 문제가 있어 별도 항목으로 견적합니다.`,
    `견적은 기능 단위로 쪼개 시간을 합산하고 버퍼를 얹습니다. 예시: 설계 2h, 핵심 기능 8h, 입력 검증·오류 처리 3h, 테스트 4h, 문서·설치 지원 4h, 합계 21h 에 버퍼 30%(이 비율은 경험칙이므로 본인 실적으로 보정) 정도. 금액은 지역·경력·시장에 따라 크게 다르므로 이 모듈이 임의의 단가를 제시하지 않으니, 실제 견적 전에는 본인이 시장 단가를 직접 조사해 정하세요.`,
    `범위가 늘어나는 전형적 패턴: "삭제도 되면 좋겠어요" → "수정도" → "그래프도" → "다른 사람도 같이 쓰게". 각각을 변경 요청으로 받아 견적에 반영하고, 화면(GUI·웹)이나 동시 사용 요구는 이 구조와 다른 프로젝트(서버·DB 설계)로 분리해 별도 견적합니다. 처음 계약서에 포함 기능과 제외 기능을 목록으로 적어 두는 것이 최고의 방어입니다.`,
    `데이터는 고객의 유일한 자산이며 가계·사업 지출은 개인 금융 정보입니다. 샘플 데이터는 가짜로 만들고, 고객 파일을 받으면 작업 후 삭제한다고 약속하며, 코드가 파일을 덮어쓰기 전에 백업이 있는지 확인합니다. 손상된 파일을 빈 데이터로 취급하지 않는 설계와 백업 안내가 사고를 막는 가장 싼 장치입니다. 한글 엑셀 호환(utf-8-sig)은 고객 PC 에서 직접 열어 확인하고 넘기세요.`,
    `유지보수와 업그레이드: 납품 뒤 일정 기간의 버그 수정(예: 2주 같은 기간을 계약서에 명시)과 그 이후 유료 변경의 경계를 정합니다. 파이썬 버전은 지원 종료 일정이 있으므로 납품 시점의 권장 버전을 README 에 적습니다(2026-11 기준 3.10 은 종료, 3.11 은 2027-10 예정). SQLite 이전, CSV 가져오기, 월 예산 알림, 리포트 생성은 이 프로젝트에서 자연스럽게 이어지는 후속 제안 거리입니다.`
  ]
};
