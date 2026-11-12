(window.PRO_MODULES = window.PRO_MODULES || {})["ai-python"] = {
  id: "ai-python",
  summary: `NumPy·pandas·SQL로 표 데이터를 다루고 uv 락 파일·시드·스키마 검증·pytest·CI로 재현성을 고정해, 다른 사람이 명령 3개로 다시 돌릴 수 있는 EDA 리포트 저장소를 납품할 수 있다.`,
  hours: 55,
  goals: [
    `재현성을 코드·환경·데이터·난수 네 축으로 나눠, 다른 PC에서 결과가 달라진 사고의 원인을 축별 가설로 좁혀 설명할 수 있다.`,
    `uv로 pyproject.toml·uv.lock·.python-version을 구성하고 ‹uv sync --locked›로 환경을 복원하며, 인라인 스크립트 메타데이터와 pylock.toml 내보내기까지 상황에 맞게 고를 수 있다.`,
    `NumPy의 브로드캐스팅·dtype·뷰/복사 규칙으로 루프를 벡터화하고, 시드가 있는 Generator로 재현 가능한 실험 데이터를 만들 수 있다.`,
    `pandas 3.x의 Copy-on-Write·str dtype·datetime 해상도 변화를 이해하고, merge(validate=)·groupby·결측 처리로 조인 폭발과 조용한 오류를 막을 수 있다.`,
    `SQL(DuckDB)의 조인·윈도 함수로 pandas와 같은 결과를 내고, 시계열 피처에서 예측 시점 이후의 정보가 새지 않도록 프레임을 설계할 수 있다.`,
    `CSV·Parquet·JSONL 중 용도에 맞는 포맷을 고르고, 스키마·결측·중복·분포 점검을 자동화한 데이터 품질 게이트와 Pydantic 경계 검증을 작성할 수 있다.`,
    `matplotlib으로 목적 있는 EDA 그림을 만들고, 노트북 로직을 모듈과 스크립트로 옮겨 pytest·ruff·logging·환경변수 설정으로 보호할 수 있다.`,
    `소매 수요 EDA 리포트를 명령 3개로 재현되는 저장소(락 파일·CI·README·버전/EOL 표)로 납품하고, 인수·환경 정리·품질 점검을 견적 항목으로 분리할 수 있다.`
  ],
  lessons: [
    {
      title: `멘탈 모델: 재현 가능한 분석은 코드·환경·데이터·난수 네 축의 고정이다`,
      body: `데이터 분석 외주에서 가장 흔한 사고는 알고리즘이 틀린 것이 아니라 "내 PC에서는 되는데 고객 PC에서는 숫자가 다르다"입니다. 이 모듈은 NumPy·pandas·SQL로 표 데이터를 다루는 기술과, 그 결과를 다른 사람이 같은 값으로 다시 만들 수 있게 고정하는 기술을 한 묶음으로 익힙니다. Python은 2025 Stack Overflow 개발자 조사에서 사용률 57.9%로 전년보다 7%p 늘었고(2025 기준) AI·데이터 공고의 기본 요건이기도 합니다. 이후의 머신러닝·RAG·평가 모듈은 모두 이 바닥 위에서 돌아갑니다.

### 재현성은 네 축의 고정이다

결과가 달라지는 이유는 거의 네 가지로 나뉩니다. 사고가 났을 때 축별로 가설을 하나씩 지워 가며 원인을 좁히면 됩니다.

| 축 | 흔들리는 이유 | 고정 수단 |
| 코드 | 노트북 셀 실행 순서, 커밋되지 않은 수정 | git 커밋, 스크립트 진입점 |
| 환경 | Python·라이브러리(전이 의존 포함) 버전 차이 | pyproject.toml + 락 파일 + Python 버전 고정 |
| 데이터 | 원본 덮어쓰기, 인코딩·컬럼 순서 변화 | 불변 원본, 해시, 스키마 검증 |
| 난수 | 시드 없는 샘플링·분할·부트스트랩 | 진입점에서 시드를 받아 Generator 하나를 전달 |

### "같다"의 두 수준

같은 락 파일과 같은 시드를 쓰면 보통 같은 숫자가 나오지만 비트 단위 동일까지 보장되지는 않습니다. 부동소수점 덧셈은 결합법칙이 성립하지 않아 합산 순서가 바뀌면 마지막 자리가 달라지고, 멀티스레드 수치 라이브러리는 실행마다 합산 순서가 달라질 수 있습니다. NumPy 문서는 Generator의 난수열이 버전 사이에서 호환된다고 보장하지 않는다고 명시합니다(2026-11 열람). 그러므로 납품 기준은 "정수·집계 결과는 완전 일치, 부동소수점은 허용오차(‹np.allclose›) 안에서 일치"처럼 문서로 정해 두는 것이 현실적입니다.

### 노트북에서 패키지까지의 사다리

노트북은 탐색에는 최고의 도구지만 숨은 상태(셀을 어떤 순서로 실행했는가)가 있어 테스트와 diff가 어렵습니다. 그래서 단계마다 보증을 하나씩 더합니다.

1. 노트북: 탐색 단계. 최소 기준은 커널을 재시작하고 전체를 실행(Restart & Run All)해도 끝까지 통과하는 것.
2. 스크립트: 입력 경로·출력 경로·시드를 인자로 받고 명령 한 줄로 실행됨.
3. 패키지: 함수가 모듈로 나뉘고 테스트·의존성 선언·락 파일이 있음.

납품물이 1단계에 머물면 인수인계가 실패합니다. 3단계까지 가는 비용이 크지 않다는 것을 이 모듈 전체가 보여 줍니다.

### 버전은 "최신"이 아니라 "교집합"으로 고른다

Python 공식 다운로드 페이지는 3.15.2를 최신 안정판으로 안내하고 3.10은 2026-10-01에 지원이 끝났습니다(2026-11 기준). 그렇다고 3.15가 항상 정답은 아닙니다. 2026-11에 PyPI 메타데이터를 열람하니 NumPy 2.5.4는 Python 3.12 이상을 요구했고, pandas 3.1.1과 PyTorch 2.15.0의 분류자에는 3.15가 있었지만 scikit-learn 1.9.1은 3.14까지만 적혀 있었습니다. 분류자가 없다고 설치가 불가능한 것은 아니고 wheel 유무는 따로 확인해야 하지만, 쓸 핵심 라이브러리의 지원 범위 교집합 안에서 Python 버전을 고르고 고정하는 습관이 안전합니다. 이 값은 빨리 바뀌므로 프로젝트 시작 시점에 다시 확인하세요.

### 외주에서 보이는 모습

고객이 "지난달 보고서 숫자가 재실행하니 달라졌어요"라고 하면 환경(의존성 자동 업그레이드), 데이터(원본 갱신), 난수(시드 부재) 순으로 확인합니다. 결과 파일 옆에 실행 지문(파이썬·패키지 버전, 시드, 데이터 해시, 커밋)을 남겨 두면 이 조사가 몇 분으로 줄어듭니다. 아래 코드가 그 최소 구현입니다.`,
      code: `"""run_info.py - 결과 파일 옆에 남기는 실행 지문(provenance)."""
import hashlib
import json
import platform
import subprocess
import sys
from importlib import metadata
from pathlib import Path


def sha256_of(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while block := f.read(chunk):
            h.update(block)
    return h.hexdigest()


def git_commit() -> str:
    try:
        out = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True)
        return out.stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def run_info(data_file: Path, seed: int, packages: list[str]) -> dict:
    return {
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "git_commit": git_commit(),
        "seed": seed,
        "data_sha256": sha256_of(data_file),
        "packages": {p: metadata.version(p) for p in packages},
    }


if __name__ == "__main__":
    info = run_info(Path("data/raw/sales.csv"), seed=42, packages=["numpy", "pandas"])
    Path("outputs").mkdir(exist_ok=True)
    Path("outputs/run_info.json").write_text(json.dumps(info, indent=2, ensure_ascii=False), encoding="utf-8")`,
      codeLang: `python`,
      key: [
        `재현성은 코드·환경·데이터·난수 네 축의 고정이며, 하나라도 빠지면 "내 PC에서만 되는" 결과가 된다.`,
        `같은 락 파일과 같은 시드가 비트 단위 동일의 상한이고, 결과 비교는 정수·집계는 완전 일치, 부동소수점은 허용오차로 한다. NumPy Generator의 난수열은 버전 간 호환이 보장되지 않는다.`,
        `노트북→스크립트→패키지의 각 단계가 보증을 하나씩 더하며, 납품의 최소선은 명령 한 줄 실행과 락 파일이다.`,
        `Python 버전은 최신이 아니라 핵심 라이브러리 지원 범위의 교집합과 EOL 표로 고르고 프로젝트마다 고정한다(2026-11 기준 3.15.2 안정, 3.10 EOL).`,
        `결과 파일 옆에 Python·패키지 버전·시드·데이터 해시·커밋을 담은 실행 지문을 남기면 사고 조사가 몇 분으로 줄어든다.`
      ],
      pitfalls: [
        `노트북을 위에서 아래로 다시 실행해 보지 않고 납품한다. 셀 순서에 의존하거나 지운 셀의 변수에 기대는 코드가 고객 PC에서 처음 터진다.`,
        `requirements.txt에 패키지 이름만 적고 버전을 고정하지 않아, 한 달 뒤 설치하면 전이 의존성까지 다른 조합이 깔린다.`,
        `‹np.random.seed› 한 줄만 호출하고 scikit-learn·PyTorch·파이썬 ‹random›의 난수는 따로 둔 채 "시드를 고정했다"고 보고한다.`,
        `원본 CSV를 덮어써서 어떤 데이터로 낸 숫자인지 추적할 수 없게 만든다. 원본은 읽기 전용으로 두고 해시를 기록해야 한다.`
      ]
    },
    {
      title: `uv와 pyproject.toml·락 파일: Python 환경을 명령 3개로 복원하는 법`,
      body: `의존성 관리는 지루해 보이지만 인수인계에서 가장 먼저 막히는 곳입니다. ‹pip install pandas›는 설치하는 시점에 호환되는 최신 버전을 받습니다. pandas 하나가 NumPy와 날짜·시간대 라이브러리 같은 전이 의존성을 끌고 오므로, 한 달 뒤 같은 명령을 실행하면 다른 조합이 설치되어 있을 수 있습니다.

### 선언과 해결을 분리한다

- ‹pyproject.toml›: 사람이 쓰는 선언. "pandas는 3.0 이상" 같은 범위 제약.
- ‹uv.lock›: 도구가 해결한 결과. 전이 의존성까지 정확한 버전을 기록.

uv 문서에 따르면 락 파일이 낡았다고 판단되는 경우는 pyproject에 의존성을 추가했거나 제약 변경이 잠긴 버전을 배제할 때뿐이고, 새 패키지 릴리스가 나왔다는 이유만으로는 낡아지지 않습니다. 그래서 락 파일을 커밋하면 시간이 지나도 같은 조합이 복원됩니다. 업그레이드는 ‹uv lock --upgrade-package pandas›처럼 의도적으로 합니다.

### 명령 흐름과 안전장치

| 상황 | 명령 | 동작 |
| 개발 중 | uv run … | 실행 전에 lock·sync를 자동 수행 |
| CI·납품 검증 | uv sync --locked | 락이 낡았으면 갱신하지 않고 실패 |
| 락을 그대로 신뢰 | --frozen | 최신 여부를 검사하지 않고 락만 사용 |
| 락 점검 | uv lock --check | 낡았으면 오류 |

CI에서 ‹--locked›를 쓰는 이유는 "pyproject는 바뀌었는데 락을 갱신하지 않은 커밋"을 잡기 위해서입니다. ‹--frozen›은 이 불일치를 검사하지 않으므로 CI 게이트로는 약합니다.

### Python 버전과 의존성 그룹

‹uv python pin 3.14›는 .python-version 파일을 만듭니다. uv는 명시 요청(‹--python›), .python-version, requires-python과 호환되는 첫 인터프리터 순으로 고르고, 없으면 기본 설정에서 자동으로 내려받습니다. ‹requires-python›에는 지원하는 최소 버전(하한)만 적습니다. Python Packaging User Guide도 ‹<=3.10› 같은 상한은 두 번 생각한 뒤에 걸라고 경고하는데, 새 Python이 나올 때마다 해석 범위와 호환성 판단이 불필요하게 막히기 쉽기 때문입니다. 개발 도구는 ‹[dependency-groups]›(PEP 735)의 dev 그룹에 두며 uv는 이 그룹을 기본 sync에 포함합니다. 배포 메타데이터에 실리는 선택 기능은 extras(optional-dependencies)입니다.

### 단일 스크립트와 표준 락 파일

한 파일짜리 분석 스크립트는 맨 위의 ‹# /// script› 블록(PEP 723)에 requires-python과 dependencies를 적으면 ‹uv run script.py›만으로 임시 환경이 만들어집니다. ‹[tool.uv]›의 ‹exclude-newer›에 날짜를 적으면 그 이후 릴리스를 배제해 해석을 고정할 수 있습니다. 도구 종속을 줄이는 수단으로 PEP 751의 pylock.toml(2025-03-31 확정)이 있고 ‹uv export --format pylock.toml›로 내보냅니다. Poetry도 2.3.0(2026-01-18)부터 poetry-plugin-export를 통해 pylock.toml 내보내기를 지원합니다. PEP 본문은 이제 역사 문서이고 최신 명세는 PyPA specs 페이지가 관리합니다. uv.lock은 uv 전용 형식이라는 점을 기억하세요.

### 도구 자체의 위험 관리 (2026-11 기준)

uv 0.13.7, ruff 0.17.4처럼 도구가 아직 0.x라 옵션과 기본값이 바뀝니다. ruff 0.17.0(2026-10-09)은 대상 Python 버전을 따로 설정하지 않았을 때의 기본값을 3.10에서 3.11로 올리고, 줄 길이를 잴 때 후행 pragma 주석을 제외하도록 바꿔 도구를 고정하지 않은 저장소의 포맷 결과가 달라졌습니다. 또 Astral의 OpenAI 합류가 2026-03-19에 발표되어 고객 보안팀이 장기 지원을 물을 수 있습니다. 오픈소스 유지 약속이 있었더라도 미래가 확정된 것은 아니므로, 표준 필드 위주의 pyproject, pylock 내보내기, CI의 uv 버전 고정(setup-uv의 version 입력)으로 이전 비용을 낮춰 둡니다.

### 3.14·3.15 기능은 천천히

free-threaded(GIL 없는) 빌드는 옵션 빌드이고, 호환되지 않는 C 확장이 로드되면 GIL이 다시 켜집니다. 데이터 스택은 C 확장이 많아 일반 빌드를 쓰는 편이 안전합니다. 3.15는 UTF-8을 기본 인코딩으로 삼는 변화(PEP 686)가 있어 레슨 6의 파일 인코딩 문제와 이어집니다.`,
      code: `# pyproject.toml -- 선언(범위)만 적고, 정확한 버전은 uv.lock 이 기록한다
[project]
name = "retail-demand-eda"
version = "0.1.0"
description = "소매 수요 데이터 EDA 리포트"
readme = "README.md"
requires-python = ">=3.12"          # 하한만 적는다 (상한은 지양)
dependencies = [
    "numpy>=2.0",
    "pandas>=3.0",
    "pyarrow>=20",
    "duckdb>=1.0",
    "matplotlib>=3.9",
    "pydantic>=2.10",
]

[dependency-groups]                  # PEP 735: 개발용 그룹, uv 는 dev 를 기본 sync 한다
dev = ["pytest>=9.0", "ruff>=0.17"]

[tool.pytest.ini_options]            # pytest 9 는 네이티브 [tool.pytest] 표도 지원한다(두 표를 함께 쓰면 안 됨)
testpaths = ["tests"]
pythonpath = ["."]                   # 저장소 루트의 retail_eda/ 를 import 가능하게

[tool.ruff]
line-length = 100

# --- 재현 명령 3개 (README 에 그대로) ---
#   uv sync --locked                       # 락 파일대로 환경 복원 (낡았으면 실패)
#   uv run pytest -q                       # 테스트
#   uv run python -m retail_eda.report --seed 42
#
# --- 단일 스크립트라면 맨 위에 PEP 723 블록 ---
#   # /// script
#   # requires-python = ">=3.12"
#   # dependencies = ["pandas"]
#   # ///`,
      codeLang: `toml`,
      key: [
        `pyproject.toml은 선언(범위), uv.lock은 해결 결과(전이 의존성 포함 정확한 버전)다. 새 릴리스가 나와도 락은 낡아지지 않고, 의존성 추가나 제약 변경이 잠긴 버전을 배제할 때만 낡아진다.`,
        `개발 중에는 ‹uv run›(자동 lock·sync), CI·납품 검증에는 ‹uv sync --locked›(락이 낡으면 실패)를 쓴다. ‹--frozen›은 낡은 락도 그냥 쓴다.`,
        `Python 버전은 .python-version과 requires-python 하한으로 고정하고 상한은 걸지 않는다. 개발 도구는 dependency-groups의 dev에 둔다.`,
        `단일 스크립트는 PEP 723 인라인 메타데이터, 도구 이전 대비는 ‹uv export --format pylock.toml›(PEP 751)을 쓴다.`,
        `도구가 0.x이고 소유 구조도 바뀔 수 있으니(Astral–OpenAI, 2026-03-19) CI의 uv 버전을 고정하고 표준 필드 위주로 쓴다.`
      ],
      pitfalls: [
        `uv.lock을 .gitignore에 넣어 락이 저장소에 없다. 애플리케이션 저장소는 락을 반드시 커밋해야 재현된다.`,
        `‹uv pip install›이나 pip로 환경에 직접 설치해 pyproject·락과 실제 환경이 어긋난다. 의존성은 항상 ‹uv add›로 선언에 반영한다.`,
        `CI에서 ‹uv sync›만 써서 pyproject와 락의 불일치를 조용히 새로 풀어 버린다. 검증용 명령에는 ‹--locked›를 쓴다.`,
        `requires-python에 상한(예: <3.14)을 넣어 해석이 불필요하게 막히거나, 노트북 커널이 프로젝트 .venv가 아닌 시스템 Python을 가리켜 환경이 어긋난다.`
      ]
    },
    {
      title: `NumPy: 벡터화·브로드캐스팅·뷰와 복사, 그리고 재현 가능한 난수`,
      body: `NumPy는 pandas·scikit-learn·PyTorch의 공통 바닥입니다. 이 레슨의 목표는 ‹for› 루프를 배열 연산으로 바꾸는 요령이 아니라, 왜 배열 연산이 빠르고 어디서 조용히 틀리는지에 대한 모델을 갖는 것입니다.

### ndarray의 구조

ndarray는 하나의 연속 메모리 버퍼에 같은 dtype의 값을 빽빽이 담고, shape(차원별 크기)와 strides(다음 원소로 가려면 몇 바이트를 건너뛰는가)로 그것을 N차원처럼 보여 줍니다. 파이썬 리스트는 객체 포인터의 배열이고 각 실수가 별도 객체입니다(CPython 64비트에서 float 객체 하나가 24바이트). 100만 개 실수는 float64 배열이면 8MB, 리스트면 포인터까지 더해 대략 32MB라고 보면 됩니다(개념 비교용 추정). 연산이 빠른 이유도 같은 곳에 있습니다. ‹a * b›는 인터프리터가 100만 번 도는 것이 아니라 C 루프가 연속 메모리를 한 번 훑습니다. 보통 수십 배 차이가 나며 정확한 값은 랩 2에서 직접 재 보세요.

### 브로드캐스팅 규칙

두 배열의 shape를 끝 차원부터 비교해서 각 쌍이 같거나 한쪽이 1이면 호환이고, 앞쪽에 없는 차원은 1로 간주합니다. 호환되지 않으면 ‹ValueError: operands could not be broadcast together›가 납니다(NumPy 공식 문서 기준).

- (1000, 5)에서 (5,)를 빼기: 열별 평균 제거.
- (200, 1) − (1, 200): 모든 쌍의 차이, 즉 거리 행렬을 루프 없이 계산.
- (1000,) − (1000, 1): 호환되지만 결과가 (1000, 1000).

세 번째가 가장 위험합니다. 오류가 아니라 100만 칸짜리 배열이 조용히 생기고, n이 10만이면 1e10칸 × 8바이트 = 80GB라 프로세스가 죽습니다. 배열을 만든 직후 shape를 확인하고, 중요한 함수에는 ‹assert x.shape == (n,)›처럼 계약을 적어 두세요.

### 뷰와 복사

기본 슬라이싱(‹X[:10]›)은 같은 버퍼를 보는 뷰이고, 불리언·정수 배열 인덱싱(‹X[mask]›)은 복사입니다. 뷰를 고치면 원본이 바뀝니다. ‹np.shares_memory›로 확인하고, 분리하려면 ‹.copy()›를 씁니다. pandas 3.x는 Copy-on-Write로 이 문제를 사용자에게서 감췄지만 NumPy 수준에서는 뷰 규칙이 그대로입니다.

### dtype의 함정

- 정수 연산의 오버플로는 예외 없이 감겨 돕니다(NumPy 문서: 정수 산술은 모듈러). int32 배열끼리 더하거나 곱한 값이 약 21억을 넘으면 음수가 나옵니다. ‹arr.sum()›은 64비트 플랫폼에서 좁은 부호 있는 정수를 기본 정수형으로 올려 누적하므로 덜 위험하지만, ‹dtype=np.int32›처럼 좁은 누적형을 직접 주면 감깁니다. 큰 값을 다룰 열은 처음부터 int64나 float64로 둡니다.
- NaN은 float에만 있습니다. 정수 열에 결측이 섞이면 float로 승격되거나 별도의 nullable 타입이 필요합니다.
- NaN == NaN은 False입니다. 검사는 ‹np.isnan›, 통계는 ‹np.nanmean› 계열을 씁니다.
- float32는 메모리를 절반으로 줄이지만 유효숫자가 약 7자리라, 큰 합계를 누적하면 오차가 쌓입니다.

### 재현 가능한 난수

‹np.random.default_rng(seed)›로 만든 Generator 하나를 진입점에서 만들어 함수에 전달합니다. 전역 시드(‹np.random.seed›)는 라이브러리 내부 난수와 뒤섞여 추적이 어렵습니다. 독립된 난수열이 필요한 하위 작업이 여럿이면 ‹rng.spawn(n)›으로 자식 생성기를 만듭니다. 앞서 말했듯 같은 시드의 값은 NumPy 버전이 바뀌면 달라질 수 있으므로 버전은 락으로 고정합니다.

### 외주에서의 쓰임

"3시간 걸리는 루프를 빠르게" 요청의 절반은 벡터화로 풀리고 나머지 절반은 알고리즘이나 I/O 문제입니다. 먼저 프로파일하고, 벡터화가 거대한 중간 배열을 만들면 청크 단위로 나눠 처리합니다.`,
      code: `import numpy as np

rng = np.random.default_rng(42)                      # 시드 고정 Generator
X = rng.normal(loc=50, scale=10, size=(1_000, 5))    # 행 1000, 열 5

# 1) 브로드캐스팅: (1000, 5) 에서 (5,) 를 빼고 나눈다 -> 열별 표준화
mu = X.mean(axis=0)            # shape (5,)
sd = X.std(axis=0)             # shape (5,)
Z = (X - mu) / sd              # (1000, 5) op (5,) -> (1000, 5)

# 2) (n,1) 과 (1,m) 의 조합으로 거리 행렬 -- 루프 없이
a = X[:200, 0]                 # (200,)
dist = np.abs(a[:, None] - a[None, :])   # (200,1) - (1,200) -> (200,200)

# 3) 뷰와 복사
view = X[:10]                  # 기본 슬라이싱: 뷰
copy = X[X[:, 0] > 60]         # 불리언 인덱싱: 복사
view[0, 0] = -1.0
print(X[0, 0])                 # -1.0  (원본이 바뀜)
print(np.shares_memory(X, view), np.shares_memory(X, copy))   # True False

# 4) 의도치 않은 브로드캐스팅
y = rng.normal(size=1_000)     # (1000,)
col = X[:, 0:1]                # (1000, 1)
print((y - col).shape)         # (1000, 1000) -- 100만 칸이 조용히 생김
print((y - col[:, 0]).shape)   # (1000,)`,
      codeLang: `python`,
      key: [
        `ndarray는 연속 버퍼 + dtype + shape + strides이며, 벡터화는 반복이 파이썬이 아니라 C 루프 안에서 도는 것이다.`,
        `브로드캐스팅은 끝 차원부터 비교해 같거나 한쪽이 1이면 호환, 없는 차원은 1로 본다. (n,) − (n,1)은 오류가 아니라 (n,n)이 된다.`,
        `기본 슬라이싱은 뷰(메모리 공유), 불리언·정수 배열 인덱싱은 복사다. 좁은 정수형끼리의 연산은 오버플로가 조용히 감기고 NaN은 float에만 있다.`,
        `난수는 진입점에서 default_rng(seed) Generator 하나를 만들어 전달한다. 같은 시드의 값도 NumPy 버전이 바뀌면 달라질 수 있다.`
      ],
      pitfalls: [
        `(n,)와 (n,1)을 혼동해 (n,n) 행렬이 만들어진다. 작은 n에서는 정답처럼 보이다가 n이 커지면 메모리가 폭발한다.`,
        `슬라이스 뷰를 수정해 원본을 오염시키거나, 반대로 불리언 인덱싱 결과를 수정하고 원본이 바뀌길 기대한다.`,
        `int8·int32 배열끼리의 덧셈·곱셈이 조용히 감겨 도는 것과 float32 누적 오차를 모른 채 "계산이 맞는다"고 믿는다.`,
        `벡터화하느라 만든 거대한 중간 배열이 메모리를 터뜨리는데, 프로파일 없이 "빨라질 것"이라고 가정해 작업한다.`
      ]
    },
    {
      title: `pandas 3.x의 데이터 모델: 라벨 정렬·Copy-on-Write·결합과 groupby`,
      body: `pandas는 열마다 dtype을 가진 배열들과 행을 가리키는 인덱스 라벨의 조합입니다. 속도는 NumPy(또는 Arrow) 배열 위의 벡터화에서 나오고, 사고는 거의 항상 라벨 정렬·결합·결측·dtype 추론처럼 "알아서 해 주는" 부분에서 납니다.

### 라벨 정렬: 알아서 맞춰 주는 것의 대가

두 Series를 더하면 pandas는 위치가 아니라 인덱스 라벨이 같은 것끼리 계산하고, 한쪽에만 있는 라벨은 NaN이 됩니다. 의도와 맞으면 편리하지만, 인덱스가 어긋난 채 대입하면 값이 전부 NaN이 되어도 오류가 나지 않습니다. 의심스러우면 ‹.to_numpy()›로 위치 기반 연산으로 바꾸거나 ‹reset_index(drop=True)›로 기준을 통일합니다.

### pandas 3.x에서 바뀐 것 (3.0 릴리스 2026-01-21, PyPI 최신 3.1.1, 2026-11 열람)

1. Copy-on-Write가 기본입니다. 인덱싱·메서드 결과는 항상 복사처럼 동작해 원본을 바꾸지 않고, ‹SettingWithCopyWarning›은 사라졌으며 방어적 ‹.copy()›도 필요 없습니다.
2. 체인 할당이 동작하지 않습니다. ‹df["a"][mask] = 0›은 임시 복사본에만 쓰여 원본에 반영되지 않으니 ‹df.loc[mask, "a"] = 0›으로 씁니다. 3.1.1 API 문서는 이런 대입을 ‹ChainedAssignmentError› 경고의 대상으로 설명하지만, 경고가 보이든 아니든 값은 바뀌지 않습니다.
3. 문자열 기본 dtype이 ‹str›입니다. pyarrow가 있으면 Arrow 배열로, 없으면 object 배열로 저장하며 결측 표지는 항상 NaN이고 문자열이 아닌 값을 넣으면 실패합니다. 이전의 object가 아니어서 ‹dtype == object›로 문자열 열을 찾던 코드가 깨집니다.
4. datetime 해상도를 추론합니다. 문자열 파싱 결과는 기본 마이크로초라 ‹astype("int64")›로 정수를 얻던 코드가 이전보다 1000배 작은 값을 낼 수 있습니다. ‹as_unit›으로 단위를 명시하세요.
5. 최소 요구는 Python 3.11과 NumPy 1.26.0입니다.

릴리스 노트는 2.3으로 먼저 올려 경고를 해결한 뒤 3.0으로 가라고 권합니다. 고객 레거시 코드를 3.x로 올리는 일은 테스트부터 만들어야 하는 별도 작업으로 견적하세요.

### 결합(merge)과 조인 폭발

merge의 ‹how›는 SQL JOIN과 같지만 키가 중복되면 행이 곱해집니다. 좌변 1행이 우변 2행과 매칭되면 결과는 2행이 되고, 합계가 부풀어도 오류는 없습니다. 그래서 ‹validate="many_to_one"›(우변 키 유일)을 기본값처럼 쓰고 위반 시 ‹MergeError›로 즉시 멈추게 합니다. ‹indicator=True›는 ‹_merge› 열에 left_only·right_only·both를 남겨 매칭 실패 행을 셀 수 있게 합니다. pandas의 merge는 양쪽의 NaN 키끼리도 매칭해 SQL의 NULL 규칙과 다르다는 점도 기억하세요(API 문서에 명시).

### groupby와 결측

groupby는 쪼개고(split) 계산하고(apply) 합칩니다(combine). 그룹 수만큼 행이 줄어드는 집계는 ‹agg›, 원래 행 수를 유지하며 그룹 통계를 붙이는 것은 ‹transform›입니다. 기본값으로 그룹 키가 결측인 행은 빠지므로 합계가 총계와 달라질 수 있습니다. 결측은 "0"이 아니라 "모름"입니다. 평균으로 채우면 분산이 줄고, 전체 데이터로 계산한 평균으로 채우면 이후 분할에서 누수가 됩니다. 결측이 미판매인지 미보고인지를 고객에게 묻는 일이 코드보다 먼저입니다.

### 성능 감각

행마다 ‹apply(axis=1)›나 ‹iterrows›를 도는 것은 파이썬 루프입니다. 열 연산과 내장 집계로 바꾸고, 반복되는 문자열은 ‹category›, 정수는 작은 dtype으로 줄이며 ‹df.memory_usage(deep=True)›로 확인합니다. 수 GB를 넘으면 다음 레슨의 DuckDB나 청크 읽기를 고려합니다.`,
      code: `import pandas as pd

sales = pd.DataFrame({
    "store_id": [1, 1, 2, 2, 3],
    "sku": ["A", "B", "A", "B", "A"],
    "qty": [5, 3, 7, 2, 4],
})
# 의도: 매장 마스터는 store_id 당 1행이어야 한다 (실제로는 중복이 섞여 들어옴)
stores = pd.DataFrame({
    "store_id": [1, 2, 3, 3],
    "region": ["서울", "부산", "대구", "대구"],
})

try:
    sales.merge(stores, on="store_id", how="left", validate="many_to_one")
except pd.errors.MergeError as e:
    print("조인 전 차단:", str(e).splitlines()[0])

# 검증 없이 합치면 행이 늘어나 합계가 부풀려진다
bad = sales.merge(stores, on="store_id", how="left")
print(len(sales), "->", len(bad), "| qty 합", sales.qty.sum(), "->", bad.qty.sum())  # 5 -> 6, 21 -> 25

# 마스터를 정리한 뒤 합치고, 그룹 비율은 transform 으로
stores_ok = stores.drop_duplicates("store_id")
df = sales.merge(stores_ok, on="store_id", how="left", validate="many_to_one", indicator=True)
assert (df["_merge"] == "both").all() and len(df) == len(sales)
df["share_in_store"] = df["qty"] / df.groupby("store_id")["qty"].transform("sum")
print(df[["store_id", "sku", "qty", "share_in_store"]])`,
      codeLang: `python`,
      key: [
        `pandas 연산은 위치가 아니라 인덱스 라벨로 정렬되고 없는 라벨은 NaN이 된다. 어긋난 인덱스는 오류 없이 NaN을 만든다.`,
        `pandas 3.x는 Copy-on-Write 기본, 체인 할당 무효, 문자열 기본 dtype str, datetime 해상도 추론이 핵심 변화다(3.0 릴리스 2026-01-21).`,
        `조인 폭발은 우변 키 중복에서 오며 오류가 나지 않는다. ‹validate="many_to_one"›과 행 수·합계 불변식으로 막는다.`,
        `‹agg›는 그룹당 한 행, ‹transform›은 원래 행 수를 유지한다. 결측은 0이 아니라 "모름"이므로 의미를 고객에게 확인한다.`
      ],
      pitfalls: [
        `조인 키의 유일성을 확인하지 않고 merge해 행 수와 합계가 조용히 늘어난다. 보고서 합계가 원천 시스템 총계와 달라지는 전형적 원인이다.`,
        `체인 할당(‹df[a][mask] = v›)을 pandas 3.x에서도 쓴다. 값이 바뀌지 않고, 2.x에서는 경고와 불확실한 동작이 섞여 있었다.`,
        `‹dtype == object›로 문자열 열을 찾거나 datetime을 ‹astype("int64")›로 바꾸는 코드를 3.x에서 그대로 돌려 열이 사라지거나 값이 1000배 달라진다.`,
        `전체 데이터의 평균으로 결측을 채운 뒤 학습·평가 분할을 해 누수를 만들고, 수십만 행을 ‹iterrows›로 돌려 몇 분씩 낭비한다.`
      ]
    },
    {
      title: `SQL(DuckDB)과 시계열: 조인 추적, 윈도 함수, 예측 시점 누수`,
      body: `공고의 요건 목록에 SQL이 빠지는 일은 드뭅니다. 고객 데이터가 대개 이미 DB에 있고, 윈도 함수 같은 표현이 SQL에서 가장 간결하기 때문입니다. 이 레슨은 DuckDB로 SQL을 노트북 안에서 연습하고 pandas와 같은 결과를 내는지 대조하는 방법을 다룹니다.

### DuckDB: 서버 없는 분석용 SQL 엔진

DuckDB는 프로세스 안에서 도는 분석용 DB입니다. ‹uv add duckdb›(PyPI 최신 2.0.0, 2026-11 열람)로 설치하고, ‹duckdb.sql("SELECT * FROM 'a.parquet'")›처럼 CSV·Parquet 파일을 직접 질의하며, ‹.df()›로 pandas에 넘깁니다. 같은 스코프에 있는 pandas DataFrame 변수도 이름으로 참조할 수 있습니다. 도구 분담의 기준은 단순합니다. 메모리에 부담스러운 파일의 집계·조인은 DuckDB, 모델 입력용 피처 가공은 pandas, 그리고 양쪽 결과를 테스트로 대조합니다.

### 조인에서 행 수를 추적하라

INNER·LEFT·FULL 조인의 의미는 이미 아실 것입니다. 실무 사고는 두 가지로 모입니다. 첫째는 결합 키가 유일하지 않아 행이 늘어나는 조인 폭발입니다. 조인 전후의 행 수와 합계를 기록하는 습관이 방어선입니다. 둘째는 LEFT JOIN 뒤 WHERE에서 우변 컬럼을 조건으로 거는 실수입니다. 우변이 NULL인 행이 모두 탈락해 사실상 INNER JOIN이 되므로, 우변 조건은 ON 절에 둡니다.

### 윈도 함수

GROUP BY는 행을 접어 그룹당 한 행으로 만들지만 윈도 함수는 모든 행을 유지한 채 관련 행들 위에서 계산합니다(PostgreSQL 튜토리얼). 기본 모양은 ‹OVER (PARTITION BY 그룹 ORDER BY 정렬)›이고 쓰임은 네 가지로 압축됩니다.

- ‹row_number()›: 그룹별 최신 1건 선택(중복 제거).
- ‹lag()›·‹lead()›: 직전·직후 행의 값(전일 대비).
- ‹sum() OVER (ORDER BY …)›: 누적합.
- ‹avg() OVER (… ROWS BETWEEN …)›: 이동 평균.

ORDER BY가 있고 프레임을 쓰지 않으면 기본 프레임은 "파티션 처음부터 현재 행(과 정렬값이 같은 동순위 행)까지"입니다. 그래서 동순위 행은 누적합이 같은 값으로 찍힙니다. 이동 평균은 반드시 ‹ROWS BETWEEN›으로 범위를 명시하세요. 윈도 함수 결과는 WHERE에서 걸 수 없으므로 서브쿼리나 CTE로 감쌉니다.

### 시계열과 예측 시점

수요예측에서 피처는 "예측하는 시점에 알 수 있는 값"만 써야 합니다. 그날 판매량을 맞히는 모델에 "오늘을 포함한 7일 평균"을 넣으면 정답의 일부가 피처에 들어가 누수가 되고, 오프라인 점수만 높고 운영에서 무너집니다. 프레임을 ‹ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING›처럼 잡아 오늘을 제외합니다. pandas에서는 ‹shift(1)› 뒤에 ‹rolling›을 걸어 같은 결과를 냅니다.

### 시계열 인덱스의 함정

- 판매가 없는 날에는 행 자체가 없는 경우가 많아 "7행 이동 평균 = 7일 평균"이 깨집니다. 달력(날짜 테이블이나 ‹reindex›)을 만들어 0과 결측을 구분하세요.
- 타임존과 일 경계: UTC로 저장된 주문 시각을 그대로 날짜로 자르면 한국 날짜와 9시간이 어긋납니다.
- ‹pd.merge_asof›는 정렬된 키에서 "가장 가까운 과거 값"을 붙입니다. 시작일이 있는 가격표 같은 마스터에 씁니다.
- 주 시작 요일과 월말 처리를 리포트에 명시하세요.`,
      code: `import duckdb
import numpy as np
import pandas as pd

daily = pd.DataFrame({
    "store_id": [1] * 6 + [2] * 6,
    "day": list(pd.date_range("2026-01-01", periods=6)) * 2,
    "qty": [5, 7, 6, 9, 4, 8, 3, 3, 4, 10, 2, 5],
})

q = """
SELECT
    store_id, day, qty,
    -- 오늘을 제외한 직전 3일 평균: 예측 시점에 알 수 있는 값만 사용
    avg(qty) OVER w_prev AS prev3_avg,
    lag(qty, 1) OVER w AS prev_qty,
    sum(qty) OVER (PARTITION BY store_id ORDER BY day) AS running_qty
FROM daily
WINDOW
    w      AS (PARTITION BY store_id ORDER BY day),
    w_prev AS (PARTITION BY store_id ORDER BY day ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING)
ORDER BY store_id, day
"""
out = duckdb.sql(q).df()     # 같은 스코프의 DataFrame 'daily' 를 이름으로 참조

# pandas 로 같은 값: shift(1) 뒤에 rolling
chk = daily.sort_values(["store_id", "day"]).copy()
chk["prev3_avg"] = (
    chk.groupby("store_id")["qty"].transform(lambda s: s.shift(1).rolling(3, min_periods=1).mean())
)
print(out.head(3))
# 첫 행의 NULL 과 NaN 은 같게 취급하되, 한쪽만 NaN 인 불일치는 놓치지 않는다
print(np.allclose(out["prev3_avg"].to_numpy(), chk["prev3_avg"].to_numpy(), equal_nan=True))   # True`,
      codeLang: `python`,
      key: [
        `DuckDB는 서버 없이 CSV·Parquet를 SQL로 직접 질의하고 ‹.df()›로 pandas에 넘긴다. 큰 집계·조인은 DuckDB, 피처 가공은 pandas로 나누고 결과를 테스트로 대조한다.`,
        `윈도 함수는 행을 접지 않고 유지한다. ORDER BY만 있으면 기본 프레임이 "처음부터 현재 행(동순위 포함)까지"이므로 이동 평균은 ‹ROWS BETWEEN›으로 명시한다.`,
        `예측 시점 이후의 값이 피처에 들어가면 누수다. 직전 N일 평균은 ‹N PRECEDING AND 1 PRECEDING›으로, pandas에서는 ‹shift(1)› 뒤 ‹rolling›으로 만든다.`,
        `LEFT JOIN 뒤 WHERE의 우변 조건은 INNER JOIN이 된다. 조인 전후 행 수와 합계를 항상 기록한다.`
      ],
      pitfalls: [
        `LEFT JOIN 결과에 WHERE로 우변 컬럼을 걸어 NULL 행이 사라지는데, 사실상 INNER JOIN이 된 것을 모른다.`,
        `프레임을 쓰지 않은 ‹OVER (ORDER BY …)› 합계에서 동순위 행이 같은 누적값을 갖는 것을 오류로 오해하거나, 이동 평균 범위를 암묵적 기본값에 맡긴다.`,
        `시차·이동 평균 피처에 당일 값을 포함해 오프라인 점수가 부풀고 운영에서 성능이 급락한다.`,
        `판매 없는 날은 행이 없다는 사실을 무시하고 "7행 = 7일"로 가정하며, UTC 시각을 그대로 일자로 잘라 하루가 어긋난다.`
      ]
    },
    {
      title: `파일 포맷과 데이터 품질 게이트: CSV·Parquet·JSONL, Pydantic 경계 검증`,
      body: `고객 데이터는 항상 더럽습니다. 이 레슨은 파일을 읽는 단계에서 실패를 빨리 드러내고(fail fast), 품질 점검을 눈이 아니라 코드로 만드는 방법을 다룹니다.

### 포맷을 고르는 기준

| 포맷 | 장점 | 단점 | 쓰임 |
| CSV | 어디서나 열림, 사람이 읽음 | 타입 정보 없음, 인코딩·구분자·따옴표 변수 | 고객과 주고받는 원본 |
| Parquet | 열 단위 저장·압축, 스키마 포함, 필요한 열만 읽기 | 사람이 직접 못 읽음 | 중간 산출물·분석용 |
| JSON/JSONL | 중첩 구조, 한 줄 한 레코드로 append·스트리밍 | 용량이 큼, 타입 모호 | API 로그, LLM 데이터셋 |

Parquet은 컬럼형 파일 포맷으로 압축과 인코딩을 이용해 대량 데이터를 효율적으로 저장합니다(Apache Parquet 문서). 분석 파이프라인의 중간 산출물은 Parquet, 고객과의 교환은 CSV로 두는 조합이 흔합니다.

### CSV를 정직하게 읽기

기본 설정으로 읽으면 타입이 추측됩니다. 우편번호 ‹01234›가 정수 1234가 되고, 결측이 섞인 정수 열은 float가 됩니다. ‹dtype›으로 열 타입을, ‹parse_dates›와 ‹date_format›으로 날짜를, ‹usecols›로 필요한 열만 지정하고, 큰 파일은 ‹chunksize›로 나눠 읽습니다. 인코딩도 명시합니다. Excel에서 저장한 한글 CSV는 cp949인 경우가 많고 UTF-8 BOM(‹utf-8-sig›)도 흔합니다. 내장 ‹open()›은 3.14 이하에서 인수를 생략하면 로케일 인코딩(한국어 Windows는 보통 cp949)을 쓰다가 3.15(2026-10 릴리스, PEP 686)부터 UTF-8을 쓰고, ‹pandas.read_csv›는 encoding을 생략하면 UTF-8로 읽습니다(공식 문서의 매개변수 설명 기준). 같은 코드가 고객의 Windows PC, 리눅스 서버, Python 버전에 따라 다르게 동작할 수 있으니 ‹encoding›을 항상 적으세요. 원본이 UTF-8이 아니면 수신 시점에 한 번 정규화하고 그 사실을 README에 남깁니다.

### 데이터 품질 네 가지 질문

1. 스키마: 필요한 컬럼이 있고 타입이 맞는가?
2. 결측: 어느 열이 몇 %이고, 어떤 그룹·기간에 몰려 있는가?
3. 중복: 기대하는 키가 유일한가?
4. 분포: 값의 범위·단위·급변이 정상인가? (음수 수량, 단가 0원, 하루 만에 10배)

이 점검을 함수로 만들어 파이프라인 시작에서 실행하고, 치명적 위반은 중단하고 경미한 위반은 리포트에 기록합니다. 임계값(예: 결측 2% 초과)은 코드 상수가 아니라 설정으로 두고 고객과 합의합니다. 결측률은 전체 평균만 보지 말고 매장·월별로 쪼개 보세요. 평균 1%라도 특정 매장의 특정 달에 100%일 수 있습니다.

### 경계에서의 스키마 검증과 타입 힌트

Pydantic(v2, 최신 2.14.3, 2026-11-04 기준)은 외부에서 들어오는 값(설정, API 응답, 행 단위 레코드)을 모델로 검증하고 어느 필드가 왜 틀렸는지 알려 줍니다. ‹extra="forbid"›를 두면 오타 난 키가 조용히 무시되지 않습니다. 2.14.2에서 JSON 키·별칭 처리가 바뀌어 이 설정과 상호작용이 있었으므로 업그레이드 때 확인하세요. DataFrame 전체의 검증은 위 네 질문을 직접 코딩하는 편이 단순합니다. 타입 힌트는 함수 계약을 문서화하고 mypy(2.4.1)·pyright 같은 체커가 호출 오류를 잡게 하지만, ‹pd.DataFrame›이라는 힌트는 어떤 컬럼이 있는지는 알려 주지 못합니다. ty는 아직 1.0 이전(0.0.101, 2026-11-11 확인)이고 일부 기능이 프리뷰라 동작이 바뀔 수 있으므로 CI 게이트로 쓰기 전에 신중해야 합니다. 컬럼 계약은 검증 함수와 docstring으로 보완합니다.`,
      code: `import pandas as pd
from pydantic import BaseModel, ConfigDict, Field


class Rules(BaseModel):
    """품질 규칙도 데이터다: 코드 밖(YAML/JSON)에서 읽어 와 검증한다."""
    model_config = ConfigDict(extra="forbid")      # 오타 난 키는 즉시 실패
    required: list[str]
    key: list[str]
    max_null_ratio: float = Field(0.02, ge=0, le=1)
    qty_range: tuple[int, int] = (0, 10_000)


def quality_issues(df: pd.DataFrame, rules: Rules) -> list[str]:
    issues: list[str] = []
    missing = [c for c in rules.required if c not in df.columns]
    if missing:
        return [f"필수 컬럼 없음: {missing}"]          # 이후 검사가 무의미하므로 즉시 반환
    dup = int(df.duplicated(rules.key).sum())
    if dup:
        issues.append(f"키 {rules.key} 중복 {dup}행")
    for col in rules.required:
        ratio = float(df[col].isna().mean())
        if ratio > rules.max_null_ratio:
            issues.append(f"{col} 결측 {ratio:.1%} > 허용 {rules.max_null_ratio:.1%}")
    lo, hi = rules.qty_range
    bad = int((~df["qty"].between(lo, hi)).sum())      # NaN 은 between 이 False 라 같이 잡힌다
    if bad:
        issues.append(f"qty 범위({lo}~{hi}) 밖 또는 결측 {bad}행")
    return issues


rules = Rules(required=["store_id", "day", "qty"], key=["store_id", "day"])
df = pd.DataFrame({
    "store_id": [1, 1, 2],
    "day": ["2026-01-01"] * 2 + ["2026-01-02"],
    "qty": [5, 5, -3],
})
print(quality_issues(df, rules))   # 키 중복 1행, qty 범위 밖 1행`,
      codeLang: `python`,
      key: [
        `CSV는 교환용, Parquet는 열 단위 저장·압축·스키마 포함의 분석용, JSONL은 한 줄 한 레코드의 로그·데이터셋용이다.`,
        `CSV는 dtype·날짜·usecols·encoding을 명시해서 읽는다. Excel의 한글 CSV는 cp949가 흔하고, 3.15의 UTF-8 기본 변화 때문에 encoding은 항상 적는다.`,
        `품질 점검은 스키마·결측·중복·분포 네 질문을 함수로 만들어 파이프라인 시작에서 실행한다. 임계값은 설정으로 두고 고객과 합의한다.`,
        `Pydantic은 설정·API 응답·레코드 같은 경계 입력의 검증에 쓰고(‹extra="forbid"›), DataFrame 전체의 검증은 직접 짠 점검 함수가 단순하다.`
      ],
      pitfalls: [
        `CSV를 기본 설정으로 읽어 앞자리 0이 사라지고, 결측이 있는 코드 열이 float가 되며, 날짜가 문자열로 남는다.`,
        `cp949 파일을 UTF-8로 읽다 오류가 나자 ‹errors="ignore"›로 넘겨 일부 데이터가 조용히 사라진다.`,
        `품질 점검을 노트북 한 셀에서 눈으로만 해서 재실행 때 놓치고, 결측률을 전체 평균으로만 봐 특정 매장·기간에 몰린 결측을 못 본다.`,
        `Parquet이 만능이라고 믿고 고객 교환 포맷까지 바꿔 버려 고객이 열어 보지 못한다.`
      ]
    },
    {
      title: `시각화와 EDA 리포트: 정직한 그림, 노트북에서 스크립트로`,
      body: `EDA(탐색적 데이터 분석)는 그림을 많이 그리는 일이 아니라 데이터가 질문에 답할 수 있는지 의심하는 절차입니다. 고객이 읽는 것은 코드가 아니라 리포트이므로, 이 레슨은 EDA의 순서, 그림의 정직함, 노트북 로직을 스크립트로 옮기는 방법을 묶어서 다룹니다.

### EDA의 순서

1. 규모와 기간: 행 수, 날짜 범위, 키 유일성, 단위.
2. 결측과 중복: 레슨 6의 품질 게이트를 그대로 실행.
3. 분포: 히스토그램과 분위수(평균은 이상치에 약하니 중앙값을 병기).
4. 시간 추이: 일·주·월 단위 비교, 요일·계절 패턴, 이벤트 구간.
5. 그룹 비교: 매장·상품군별 차이와 표본 수.
6. 이상치: 제거하기 전에 원인(입력 오류인가, 실제 사건인가)을 고객에게 질문.
7. 상관: 관찰된 관계는 인과가 아니라 후속 확인이 필요한 가설로 서술.

### 그림 고르기와 정직하게 그리기

비교는 막대(0에서 시작), 추이는 선, 분포는 히스토그램·박스, 관계는 산점도, 구성은 누적 막대를 씁니다. 막대의 축을 잘라 차이를 부풀리거나 이중축으로 상관을 꾸며 보이는 그림은 신뢰를 잃게 합니다. 표본이 작은 그룹의 평균에는 n을 표기하고 단위·기간·필터 조건을 제목이나 주석에 남깁니다.

### matplotlib을 스크립트 환경에서 쓰기

pyplot의 전역 상태에 그리기보다 ‹fig, ax = plt.subplots()›로 Figure와 Axes를 명시적으로 다루는 객체지향 방식이 함수와 테스트에 안전합니다. CI나 서버에는 화면이 없으므로 ‹matplotlib.use("Agg")›로 파일 전용 백엔드를 쓰고, 저장한 뒤 ‹plt.close(fig)›로 해제합니다. 루프에서 수백 장을 그리며 close하지 않으면 메모리가 계속 늘고 경고가 납니다. 한글 라벨은 한글 폰트를 ‹rcParams["font.family"]›에 지정해야 하고(OS마다 폰트 이름이 다름) 그러지 않으면 글자가 네모로 나옵니다. 한글 폰트를 쓰면 마이너스 기호가 깨질 수 있어 ‹axes.unicode_minus›를 False로 둡니다. CI 서버에 폰트가 없을 수 있으니 리포트를 만드는 환경에서 한 번은 눈으로 확인하세요.

### 그림은 재현의 증거가 아니라 산출물이다

PNG의 바이트는 matplotlib·폰트·렌더링 라이브러리 버전과 OS에 따라 달라질 수 있어서, 두 환경의 그림 파일 해시가 같은지로 재현을 판정하면 멀쩡한 결과가 실패로 보입니다. 그림을 만든 집계 표(예: 주별 합계 CSV)를 같이 저장하고 숫자를 테스트·대조의 기준으로 삼으며, 그림은 사람이 검토합니다. 집계 함수와 그리기 함수를 나눠 두면 집계는 단위 테스트로 지킬 수 있고, 리포트의 숫자와 그림이 같은 표에서 나왔다는 것도 보증됩니다.

### 리포트의 구조

결론 3줄, 근거 그림과 표, 데이터의 한계와 가정, 부록(재현 방법·버전·시드) 순서로 씁니다. 고객은 위의 두 단락만 읽는다고 가정하고 쓰세요. Markdown이나 HTML로 코드가 생성하게 하면 재생성이 가능하고 변경 이력이 남습니다.

### 노트북에서 스크립트로

노트북은 숨은 상태 때문에 diff·테스트·재현이 어렵습니다. 옮기는 순서는 다음과 같습니다.

1. 탐색이 끝난 셀을 "입력 DataFrame → 출력 DataFrame 또는 Figure" 함수로 바꿉니다.
2. 함수를 패키지 모듈로 옮기고 노트북은 그것을 import해 호출하고 설명만 하게 합니다.
3. ‹argparse›로 입력·출력 경로와 시드를 받는 진입점을 만듭니다.
4. 노트북은 출력을 지우고 커밋하며(수 MB 이미지가 diff에 섞이지 않게), 제출 전에 Restart & Run All을 통과시킵니다.

이렇게 하면 분석 로직은 테스트 대상이 되고 노트북은 설명 문서의 역할만 합니다.`,
      code: `import argparse
from pathlib import Path

import matplotlib
import pandas as pd

matplotlib.use("Agg")                      # 화면 없는 CI/서버에서도 파일로 저장
import matplotlib.pyplot as plt  # noqa: E402


def plot_weekly_trend(daily: pd.DataFrame, out: Path) -> Path:
    """daily: 컬럼 day(datetime), qty. 주 단위 합계 추이를 PNG 로 저장한다."""
    weekly = daily.set_index("day")["qty"].resample("W").sum()
    fig, ax = plt.subplots(figsize=(8, 3.5))
    ax.plot(weekly.index, weekly.to_numpy(), marker="o", linewidth=1.5)
    ax.set_title("Weekly units sold")        # 한글 라벨은 한글 폰트를 rcParams 에 지정해야 한다
    ax.set_ylabel("units")
    ax.set_ylim(bottom=0)                    # 0 에서 시작해 변동 폭을 과장하지 않는다
    ax.grid(alpha=0.3)
    fig.autofmt_xdate()
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)                           # 여러 장을 그릴 때 메모리 누수 방지
    return out


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description="weekly trend figure")
    ap.add_argument("--input", type=Path, required=True)   # day, qty 컬럼을 가진 parquet
    ap.add_argument("--out", type=Path, default=Path("outputs/weekly.png"))
    args = ap.parse_args(argv)
    daily = pd.read_parquet(args.input)
    print(plot_weekly_trend(daily, args.out))


if __name__ == "__main__":
    main()`,
      codeLang: `python`,
      key: [
        `EDA는 규모→결측·중복→분포→시간 추이→그룹 비교→이상치→상관 순으로 진행하며, 이상치는 지우기 전에 원인을 묻고 상관은 가설로만 서술한다.`,
        `정직한 그림이란 막대는 0에서 시작, 단위·기간·표본 수를 표기, 이중축·축 절단으로 차이를 꾸미지 않는 것이다.`,
        `스크립트에서는 객체지향 API(‹plt.subplots›)와 Agg 백엔드를 쓰고 저장 후 ‹plt.close(fig)›를 호출하며, 한글 폰트는 rcParams에 지정한다.`,
        `노트북의 로직은 함수→모듈→argparse 진입점으로 옮기고, 노트북은 호출·설명만 하며 Restart & Run All을 통과시켜 제출한다.`
      ],
      pitfalls: [
        `셀 실행 순서를 바꿔 얻은 결과를 보고서에 인용하고, 제출 전에 Restart & Run All을 하지 않는다.`,
        `한글 폰트를 지정하지 않아 라벨이 네모로 나오거나, CI 서버에 폰트가 없어 로컬과 다른 그림이 나온다.`,
        `pyplot 전역 상태로 그리다 figure를 닫지 않아 그림이 겹치고 메모리가 늘어난다.`,
        `막대 그래프의 y축을 잘라 차이를 과장하고, 표본이 몇 건뿐인 그룹의 평균을 같은 무게로 비교하며, 상관을 인과로 쓴다.`
      ]
    },
    {
      title: `품질 도구: pytest·ruff·타입체커·logging·설정 분리·Git 워크플로`,
      body: `코드가 "돌아간다"와 "믿을 수 있다" 사이에는 테스트·린트·로그·설정이 있습니다. 데이터 프로젝트는 이를 건너뛰기 쉬워 인수인계에서 차이가 크게 납니다.

### 데이터 코드의 테스트

작은 고정 입력과 기대값으로 함수를 검사하고, 특히 불변식 테스트가 효과적입니다. 조인 후 행 수가 변하지 않는다, 합계가 보존된다, 키가 유일하다, 비율의 합이 1이다 같은 성질입니다. pytest 9(최신 9.2.0, 2026-10-27 기준)에서는 fixture로 입력을 준비하고, ‹parametrize›로 경계값을 여러 개 돌리며, ‹tmp_path›로 테스트마다 독립된 임시 디렉터리(‹pathlib.Path›)를 받습니다. 부동소수점은 ‹pytest.approx›나 ‹pd.testing.assert_frame_equal›로 비교하고 난수를 쓰는 입력은 시드를 고정합니다. 9.0에서 subtests·네이티브 TOML 설정(‹[tool.pytest]› 표)·strict 모드가 들어왔고, 9.2에서는 parametrize의 ‹indirect›·‹ids›·‹scope› 인자가 키워드 전용이 되어 위치 인자로 넘기던 코드가 TypeError를 냅니다. 이런 변화가 있으니 pytest 업그레이드는 별도 PR로 하세요.

### ruff와 타입체커

ruff는 린트와 포맷을 한 도구로 처리합니다. 처음에는 기본 규칙에 import 정렬(‹I›), 흔한 버그(‹B›), 문법 현대화(‹UP›)를 더하고 팀 합의로 넓힙니다. 0.17.0(최신 0.17.4, 2026-11-05 기준)은 버전을 설정하지 않았을 때의 기본 대상 Python을 3.11로 올리고, DTZ 규칙 7개를 기본에서 빼고, 줄 길이를 잴 때 후행 pragma 주석을 제외하도록 바꿔 기존 import가 다시 포맷될 수 있습니다. 도구 버전을 고정하지 않은 저장소는 어느 날 CI가 갑자기 빨개집니다. 타입체커는 하나만 CI 게이트로 정합니다(mypy 2.4.1, 2026-10-28 릴리스 같은 성숙한 도구). pandas의 타입 정보가 느슨하므로 핵심 모듈부터 점진적으로 엄격하게 만들고, 0.0.x 단계인 ty는 에디터 보조로 먼저 써 보는 정도가 안전합니다.

### 로깅과 설정

print는 레벨·출력 위치·형식을 통제할 수 없습니다. 모듈마다 ‹logging.getLogger(__name__)›를 쓰고 핸들러와 형식은 진입점 한 곳에서만 설정합니다. 라이브러리는 NullHandler 외에는 핸들러를 달지 않는 것이 Python 공식 가이드입니다. 레벨은 DEBUG 10, INFO 20, WARNING 30(기본), ERROR 40, CRITICAL 50이고, 메시지는 ‹logger.info("rows=%d", n)›처럼 인자를 분리해 걸러진 로그의 문자열 비용을 아낍니다. 파이프라인에는 입력·제거·출력 행 수, 소요 시간, 시드, 버전을 남겨야 "왜 합계가 달라졌나"를 로그로 추적할 수 있습니다. 개인정보 원문은 남기지 않습니다.

Twelve-Factor App은 배포마다 달라지는 값(DB 주소, 자격증명)을 코드가 아니라 환경 변수에 두라고 하고, 시험 기준을 "지금 코드를 공개해도 자격증명이 새지 않는가"로 제시합니다. 실무에서는 ‹.env›를 gitignore에 넣고 키 이름만 적은 ‹.env.example›을 커밋하며, 환경 변수가 문자열이라는 점을 감안해 타입 변환과 검증(레슨 6의 Pydantic)을 거칩니다. 시드·윈도 크기·임계값 같은 분석 파라미터는 설정 파일 한 곳에 모읍니다.

### Git 워크플로

브랜치, PR, CI 통과, 머지의 흐름을 1인 프로젝트에서도 지키면 변경 이력이 고객에게 설명 가능한 기록이 됩니다. 대용량 원본과 모델 파일은 일반 Git에 넣지 않고 내려받기 스크립트와 해시로 관리합니다. CI의 구성은 레슨 9에서 다룹니다.`,
      code: `# tests/test_pipeline.py  -- 한 파일로 보여 주기 위해 함수도 같이 둔다
import numpy as np
import pandas as pd
import pytest


def add_store_region(sales: pd.DataFrame, stores: pd.DataFrame) -> pd.DataFrame:
    """실제로는 retail_eda/pipeline.py 에 있을 함수."""
    return sales.merge(stores, on="store_id", how="left", validate="many_to_one")


@pytest.fixture
def sales() -> pd.DataFrame:
    rng = np.random.default_rng(0)              # 테스트 입력도 시드 고정
    return pd.DataFrame({
        "store_id": rng.integers(1, 4, size=50),
        "qty": rng.integers(0, 20, size=50),
    })


def test_merge_keeps_rows_and_totals(sales):
    stores = pd.DataFrame({"store_id": [1, 2, 3], "region": ["A", "B", "C"]})
    out = add_store_region(sales, stores)
    assert len(out) == len(sales)                    # 불변식 1: 행 수 유지
    assert out["qty"].sum() == sales["qty"].sum()    # 불변식 2: 합계 보존
    assert out["region"].notna().all()


@pytest.mark.parametrize("dup_ids", [[3], [1, 2], [1, 2, 3]])
def test_duplicate_master_is_rejected(sales, dup_ids):
    stores = pd.DataFrame({"store_id": [1, 2, 3] + dup_ids})
    stores["region"] = "X"
    with pytest.raises(pd.errors.MergeError):
        add_store_region(sales, stores)


def test_summary_written(tmp_path):
    out = tmp_path / "summary.csv"                   # 테스트마다 독립된 임시 경로
    pd.DataFrame({"a": [1]}).to_csv(out, index=False)
    assert out.read_text(encoding="utf-8").splitlines() == ["a", "1"]`,
      codeLang: `python`,
      key: [
        `데이터 코드는 불변식(조인 후 행 수 유지, 합계 보존, 키 유일, 비율 합 1)을 pytest로 테스트하고, fixture·parametrize·tmp_path를 기본기로 쓴다.`,
        `ruff·pytest·uv 같은 도구도 락에 포함해 버전을 고정하고 메이저 업그레이드는 별도 PR로 한다. 예: ruff 0.17.0은 기본 대상 Python을 3.11로 올리고 후행 pragma 주석을 줄 길이에서 제외했다.`,
        `로깅은 모듈마다 getLogger(__name__), 핸들러 설정은 진입점 한 곳, 레벨 값은 10·20·30(기본)·40·50이며 파이프라인 행 수·시드·버전을 남긴다.`,
        `환경 변수는 배포마다 달라지는 값과 비밀의 자리다. 지금 코드를 공개해도 자격증명이 새지 않아야 하고, .env는 gitignore하며 .env.example만 커밋한다.`
      ],
      pitfalls: [
        `노트북에서 한 번 돌려 본 것을 검증으로 간주하고, 행 수·합계·키 같은 불변식 테스트를 쓰지 않는다.`,
        `ruff·pytest를 버전 미고정으로 두었다가 어느 날 CI가 갑자기 실패한다. 도구 업그레이드가 코드 변경과 한 커밋에 섞여 원인을 찾기 어렵다.`,
        `라이브러리 모듈에서 ‹logging.basicConfig›를 호출하거나 곳곳에 print를 두어 로그 수준과 형식을 통제할 수 없게 만든다.`,
        `.env나 API 키를 저장소에 커밋한다. 이력에서 지우는 것보다 해당 키를 폐기·교체하는 것이 먼저다.`
      ]
    },
    {
      title: `통합 사례: 소매 수요 EDA 리포트를 재현 가능한 저장소로 납품하기`,
      body: `이 레슨은 앞의 여덟 레슨을 한 건의 가상 의뢰로 엮습니다.

### 의뢰

중소 소매 체인(매장 40곳)이 지난 2년 판매 이력으로 수요예측 PoC를 하기 전에 EDA 리포트와 "재현 가능한 코드"를 요구합니다. 전임 개발자가 노트북 한 장과 엑셀에서 저장한 CSV 12개를 남기고 떠났습니다. 증상은 두 가지입니다. 고객 PC에서 노트북이 오류로 멈추고, 내 PC에서 돌린 매출 합계가 POS 시스템 총계보다 1.8% 큽니다. (가정: 원본 약 2천만 행, CSV 합계 1.5GB, 분석 PC의 RAM 16GB.)

### 1단계: 인수 점검 (견적의 근거)

노트북을 Restart & Run All로 돌려 실패 지점을 목록화하고, 파일 12개의 인코딩·날짜 형식·행 수·컬럼을 인벤토리로 만듭니다. 이 결과가 "환경 정리"와 "데이터 정비"를 분석과 별도 견적 항목으로 분리하는 근거가 됩니다.

### 2단계: 환경 고정

pip freeze에서 직접 쓰는 패키지만 골라 pyproject로 옮기고 락을 만듭니다. Python 버전은 핵심 라이브러리 교집합으로 고릅니다. 2026-11 기준 PyPI 분류자는 NumPy 2.5.4(3.12 이상), pandas 3.1.1(3.11~3.15), scikit-learn 1.9.1(~3.14)이므로 후속 ML 작업까지 고려해 3.14를 선택하고 이유를 README의 버전 표에 적습니다. 기존 서버가 3.10이라면 이미 EOL(2026-10-01)이므로 업그레이드 필요성을 근거와 함께 제안합니다.

### 3단계: 데이터 정비와 원인 규명

엑셀 CSV는 원본 폴더에 읽기 전용으로 두고 해시를 기록한 뒤, 변환 스크립트로 UTF-8 Parquet을 만듭니다. 품질 게이트가 세 가지를 찾아냅니다. 파일 2개는 cp949 인코딩, 1개는 날짜의 일·월 순서가 다름, 매장 마스터에 같은 매장이 두 번 등록되어 있음. 마지막이 합계 1.8% 초과의 원인입니다. 전체 매출의 1.8%를 차지하는 매장 1곳의 키가 마스터에 두 번 있어, 조인할 때 그 매장의 판매 행이 모두 복제됩니다. ‹validate="many_to_one"›이 이를 MergeError로 막고, 테스트가 "조인 후 행 수·합계 불변"을 지킵니다.

### 4단계: 도구 분담과 분석

2천만 행을 pandas에 통째로 올리지 않고 DuckDB로 Parquet에서 매장×상품군×일 단위로 집계해(수십만 행) pandas로 가져옵니다. 직전 7일 평균 같은 피처는 오늘을 제외하는 윈도로 만들고 pandas 구현과 일치하는지 테스트합니다. 판매 행이 없는 날은 달력을 만들어 "0 판매"와 "미보고·품절 의심(연속 무판매)"을 구분합니다.

### 5단계: 리포트와 납품

리포트는 결론 3줄, 그림 6장, 데이터 이슈 목록(조인 폭발 원인 포함), 한계로 구성하고 시드·락·실행 지문이 포함된 저장소로 납품합니다. README는 명령 3개(‹uv sync --locked›, ‹uv run pytest›, ‹uv run python -m …›)로 끝나야 하고, CI에는 두 Python 버전을 돌립니다. 리포트 첫 장에는 합계를 POS 총계와 대조한 결과(합의한 허용 오차 이내)를 싣습니다. 인수인계 세션 1시간과 업그레이드 가이드(pandas·ruff의 메이저 변경 때 할 일)도 납품물에 포함합니다.

### 배운 점

기술적으로 어려운 부분은 없었습니다. 어려운 것은 눈으로 확인하던 것들을 코드·테스트·락으로 바꾸는 규율이었고, 그 규율이 곧 납품 품질입니다. CI의 Python 버전 매트릭스는 setup-uv의 python-version에 매트릭스 값을 넘기는 방식이 공식 가이드의 예시이며, 아래 코드는 같은 효과를 셸 루프로 낸 것입니다. 액션은 태그 대신 커밋 SHA로 고정해 두면 태그가 다른 커밋으로 옮겨지는 공급망 위험을 줄일 수 있고, uv 공식 가이드의 예시도 SHA 핀을 씁니다.`,
      code: `name: ci
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1  # v7.0.1
      - name: Install uv
        uses: astral-sh/setup-uv@c771a70e6277c0a99b617c7a806ffedaca235ff9  # v9.0.0
        with:
          version: "0.13.7"            # 도구 버전도 고정한다 (두 핀 모두 2026-11 기준 값)
          enable-cache: true
      - name: 락 파일 점검
        run: uv lock --check            # pyproject 와 uv.lock 이 어긋나면 실패
      - name: 3.14 / 3.15 에서 같은 락으로 검증
        run: |
          for v in 3.14 3.15; do
            uv sync --locked --python "$v"
            uv run --no-sync ruff check .
            uv run --no-sync ruff format --check .
            uv run --no-sync pytest -q
          done
      - name: 같은 명령으로 리포트 재현
        run: uv run python -m retail_eda.report --seed 42 --out outputs`,
      codeLang: `yaml`,
      key: [
        `인수받은 노트북은 먼저 Restart & Run All로 실패 목록을 만들고 데이터 인벤토리를 만든다. 이것이 환경 정리·데이터 정비를 분석과 분리해 견적하는 근거다.`,
        `합계 불일치의 1순위 용의자는 조인 키 중복(조인 폭발)이다. ‹validate›와 행 수·합계 불변식 테스트로 잡고, 원천 시스템 총계와 대조한 결과를 리포트 첫 장에 싣는다.`,
        `크기에 맞춘 도구 분담: 대용량 집계는 DuckDB(Parquet), 피처 가공과 모델 입력은 pandas, 두 경로의 결과는 테스트로 대조한다.`,
        `납품은 명령 3개로 재현되는 저장소 + 락 파일 + CI + 버전/EOL 표 + 데이터 한계 문서 + 인수인계 세션이다.`,
        `Python 버전은 핵심 라이브러리 지원 교집합과 EOL 표로 고르고 근거를 README에 남긴다.`
      ],
      pitfalls: [
        `인수 직후 분석부터 시작해 환경·데이터 문제를 견적 밖에서 무상으로 해결하게 된다.`,
        `고객 PC는 Windows인데 CI는 Linux만 돌려 경로 구분자·인코딩·줄바꿈 차이를 납품 후에 발견한다. 고객 환경에 맞는 러너를 하나는 포함한다.`,
        `합계를 원천 시스템 총계와 대조하지 않고 리포트를 제출해 1.8% 같은 오차를 고객이 먼저 발견한다.`,
        `판매 0과 결측(품절·미보고)을 구분하지 않고 평균 수요를 계산해 수요를 과소 추정한다.`
      ]
    }
  ],
  labs: [
    {
      title: `Lab 1. uv 프로젝트와 실행 지문: 새 폴더에서 같은 해시를 만든다`,
      scenario: `프리랜서로 일하던 중 고객에게서 "당신이 준 분석 스크립트가 우리 PC에서는 숫자가 다르다"는 연락을 받았습니다. 원인을 가리는 첫 단계는 "내 환경을 통째로 복원할 수 있는 저장소"와 "결과 옆에 남는 실행 지문"입니다. 시드가 고정된 합성 판매 데이터를 만들고, 월×매장 합계를 계산하는 작은 프로젝트를 uv로 구성한 뒤, 완전히 새 폴더에서 같은 결과 파일이 나오는지 해시로 검증하세요. 이 랩의 목표는 분석이 아니라 "재현 가능성을 측정 가능한 상태로 만드는 것"입니다.`,
      steps: [
        `빈 폴더에서 ‹git init›과 ‹uv init›으로 프로젝트를 만들고, 쓸 핵심 라이브러리의 Python 지원 범위를 PyPI에서 확인한 뒤 ‹uv python pin›으로 버전을 정해 .python-version을 커밋한다. 선택 근거는 README에 한 줄로 적는다.`,
        `‹uv add numpy pandas›, ‹uv add --dev pytest ruff›로 의존성을 추가하고, pyproject.toml과 uv.lock이 함께 바뀌는 것을 ‹git diff›로 확인한다.`,
        `gen_data.py: ‹np.random.default_rng(42)›로 매장 5곳 × 365일 판매량(포아송 분포 등)을 만들어 data/raw/sales.csv로 저장한다. 인코딩은 UTF-8, 줄바꿈은 LF로 고정한다.`,
        `summarize.py: 월×매장 합계를 outputs/summary.csv로 쓰고, 레슨 1의 run_info 코드로 outputs/run_info.json을 만든다. 입력·출력 경로와 시드는 argparse 인자로 받는다.`,
        `저장소를 새 폴더에 clone(또는 복사 후 .venv 삭제)하고 ‹uv sync --locked›, gen_data, summarize를 차례로 실행한 뒤 두 폴더의 summary.csv에 대해 ‹Get-FileHash›(또는 sha256sum)로 해시를 비교한다.`,
        `사고 시연: pyproject.toml에 scipy를 손으로 추가하고 uv.lock은 갱신하지 않은 채 ‹uv sync --locked›를 실행해 실패 메시지를 README의 트러블슈팅 절에 붙인다. 이어서 ‹uv lock›으로 복구하고 ‹uv lock --check›가 통과하는지 확인한다.`,
        `의존성 없는 폴더에 PEP 723 블록(requires-python, dependencies=["pandas"])을 가진 quick_look.py를 만들어 ‹uv run quick_look.py›로 실행한다.`,
        `README에 재현 명령 3개와 "이 저장소가 보증하는 것과 보증하지 않는 것(부동소수점 허용오차 등)"을 적는다.`
      ],
      accept: [
        `새 폴더(.venv 없음)에서 ‹uv sync --locked›와 실행 명령만으로 summary.csv가 생성되고, 원본 폴더의 파일과 sha256이 일치한다.`,
        `run_info.json에 Python·numpy·pandas 버전, seed, 입력 파일 sha256이 기록되어 있다.`,
        `낡은 락 상태에서 ‹uv sync --locked›가 실패하는 로그가 README에 있고, ‹uv lock› 후에는 성공한다.`,
        `git에는 uv.lock과 .python-version이 포함되고 .venv/와 data/raw는 gitignore로 제외되어 있다.`
      ],
      stretch: `WSL이나 컨테이너 같은 다른 OS에서 같은 락으로 재현해 해시를 비교하세요. 다르다면 원인(줄바꿈·부동소수점 출력 자릿수·정렬)을 찾아 README에 기록하고, ‹uv export --format pylock.toml› 결과의 패키지 목록이 uv.lock과 같은지 비교해 보세요.`
    },
    {
      title: `Lab 2. 벡터화·조인 폭발·SQL 윈도 대조 실험`,
      scenario: `고객 개발팀이 "분석 스크립트가 3시간 걸리고 합계가 가끔 총계와 안 맞는다"며 원인 진단을 요청했습니다. 원인 후보는 파이썬 루프, 조인 키 중복, 시계열 피처의 누수입니다. 100만 행 합성 판매 테이블에서 세 가지를 각각 재현하고 숫자로 증명하세요. 각 실험은 같은 데이터에 대해 "나쁜 방식"과 "좋은 방식"의 결과·시간·행 수를 표로 남기며, 마지막에 RESULTS.md로 고객이 읽을 수 있는 해석을 씁니다.`,
      steps: [
        `시드 7로 100만 행 합성 판매 테이블(store_id 1~50, sku 1~200, 365일, qty는 포아송, price는 로그정규)을 만들어 Parquet으로 저장하고 파일 크기를 기록한다(‹uv add pyarrow›).`,
        `매출(qty×price) 총합을 (a) 파이썬 for 루프 (b) NumPy (c) pandas 열 연산으로 계산하고, ‹time.perf_counter›로 각 5회 측정한 중앙값을 표로 만든다. 세 결과가 ‹np.allclose›로 같은지 확인한다.`,
        `매장별 qty 표준화를 groupby.transform 방식과 NumPy 방식으로 각각 구현해 결과가 같은지 확인한다. 또 (n,)와 (n,1)을 실수로 빼면 n=20,000에서 (n,n) 배열이 만들어짐을 계산(원소 수 × 8바이트)만 하고 실제로는 실행하지 않는다.`,
        `조인 폭발: 매장 마스터에 중복 키 3건을 주입하고, 기본 merge의 행 수·qty 합 증가분을 기록한다. ‹validate="many_to_one"›이 MergeError를 내는지, 레슨 6의 ‹quality_issues›가 중복을 보고하는지 확인한다.`,
        `DuckDB로 같은 Parquet에서 (store_id, day) 일 집계를 만들고 직전 7일 평균(당일 제외) 윈도 쿼리를 작성한다. pandas의 shift+rolling으로 같은 값을 만들어 최대 절대 차이를 기록한다.`,
        `누수 시연: 당일 포함 7일 평균 피처와 당일 제외 피처 각각과 qty의 상관계수를 구해 표로 비교한다.`,
        `pandas 3.x 확인: 문자열 열의 dtype을 출력하고, 체인 할당이 원본을 바꾸지 못함을 확인하고, 날짜 문자열을 datetime으로 파싱한 뒤 ‹astype("int64")›의 값과 ‹as_unit("ns")› 후의 값을 비교한다.`,
        `모든 표와 해석(원인·영향·재발 방지)을 RESULTS.md로 정리한다.`
      ],
      accept: [
        `벡터화(NumPy 또는 pandas) 구현이 for 루프 대비 중앙값 기준 10배 이상 빠르고, 세 구현의 합계가 allclose로 같다.`,
        `조인 폭발 실험에서 기본 merge의 증가 행 수와 합계 증가분이 숫자로 기록되어 있고, validate 버전은 MergeError를 낸다.`,
        `DuckDB와 pandas의 직전 7일 평균 최대 절대 차이가 1e-9 미만이다(첫 행의 NULL과 NaN은 같게 취급).`,
        `당일 포함 피처와 제외 피처의 상관계수 두 값과, 포함 쪽이 더 높게 나오는 이유에 대한 설명이 RESULTS.md에 있다.`
      ],
      stretch: `행 수를 1천만으로 늘려 "pandas로 전체를 읽어 집계"와 "DuckDB로 Parquet 직접 집계"의 시간과 피크 메모리(작업 관리자 등)를 기록하고, 어느 크기부터 격차가 벌어지는지와 그 이유를 한 단락으로 설명하세요.`
    },
    {
      title: `Lab 3. 납품 프로젝트: 소매 수요 EDA 리포트 저장소`,
      scenario: `가상 고객인 소매 체인(매장 20곳)이 판매 이력 CSV, 매장 마스터, 달력을 주며 "상품군별 요일·계절 패턴, 품절 의심 구간, 데이터 이슈 목록이 담긴 리포트와, 우리 쪽 개발자가 명령 3개로 다시 돌릴 수 있는 저장소"를 요청했습니다. 실제 고객 데이터를 쓰지 않도록 시드 고정 생성기로 합성 데이터를 만들고 알려진 결함 6종(중복 행, 결측 qty 약 3%, 날짜 형식 2종 혼재, 매장 마스터 키 중복 1건, 음수 수량, 연속 14일 무판매 구간)을 일부러 심습니다. 심은 결함 목록이 정답지가 되어 품질 게이트가 제대로 동작하는지 측정할 수 있습니다. 완성물은 그대로 포트폴리오 저장소가 됩니다.`,
      steps: [
        `‹uv init›으로 저장소를 만들고 retail_eda/ 패키지, tests/, README.md, .gitignore(data/, outputs/, .venv/, .env)를 구성한다. pyproject.toml의 pytest 설정에 pythonpath = ["."]를 추가하고 의존성을 선언해 락을 만든다.`,
        `retail_eda/generate.py: 시드 고정으로 매장 20곳 × 상품군 10개 × 2년의 일 단위 판매를 생성하고 결함 6종을 주입한다. 주입한 건수는 defects.json(정답지)에 기록한다.`,
        `retail_eda/quality.py: 레슨 6 방식의 품질 게이트를 구현한다. 심은 6종을 모두 보고하는지 정답지와 대조하는 테스트를 작성한다.`,
        `retail_eda/features.py: DuckDB로 일 단위 집계, 직전 7일 평균(당일 제외), 요일 평균을 만들고 pandas 구현과 같은 값인지 테스트한다. 달력을 완성해 "0 판매"와 "결측(품절 의심)"을 구분한다.`,
        `retail_eda/plots.py·report.py: 그림 4장 이상(월별 추이, 요일 패턴, 상품군 비교, 결측·품절 의심 구간)과 report.md(결론 3줄 → 근거 → 데이터 이슈 → 한계 → 부록), run_info.json을 만든다. 진입점은 ‹python -m retail_eda.report --seed 42 --out outputs›.`,
        `tests/에 8개 이상: 불변식(조인 후 행 수·합계), parametrize 경계값, tmp_path를 이용한 소규모 end-to-end, 같은 시드이면 같은 결과인지 확인하는 테스트를 포함한다.`,
        `ruff check와 ruff format을 통과시키고 .github/workflows/ci.yml(레슨 9 참고)을 작성한다. 로컬에서 같은 명령을 순서대로 실행해 모두 통과시킨다.`,
        `README: 재현 명령 3개, 버전·EOL 표(Python·uv·pandas·ruff·pytest 버전과 확인 날짜, 3.10 EOL 2026-10-01 포함), 데이터 사전, 알려진 한계 3개 이상, 업그레이드 가이드를 쓴다.`,
        `새 폴더에 clone해서 명령 3개만으로 재현하고 report.md(시각 필드 제외)의 sha256이 두 번 모두 같은지 확인한다. 인수인계 체크리스트 10줄을 README 끝에 적는다.`
      ],
      accept: [
        `clone 직후 ‹uv sync --locked›, ‹uv run pytest -q›, ‹uv run python -m retail_eda.report --seed 42› 세 명령만으로 리포트가 생성되고, 두 번 실행한 report.md가 타임스탬프를 제외하고 동일하다.`,
        `품질 게이트가 심은 결함 6종을 모두 보고하며(정답지 대조 테스트 통과), 결함 없는 데이터에서는 이슈가 0건이다.`,
        `pytest가 8개 이상 통과하고 ‹ruff check›와 ‹ruff format --check›가 오류 0이다.`,
        `README에 버전·EOL 표(확인 날짜 포함), 알려진 한계 3개 이상, 재현 명령 3개가 있고 report.md 첫 장에 원본 합계와 파이프라인 합계의 대조가 있다.`
      ],
      stretch: `CI에 Python 3.14·3.15 매트릭스와 windows-latest 러너를 추가해 실패 원인(경로·인코딩·줄바꿈)을 기록하고, report 모듈을 import해 호출만 하는 얇은 노트북 한 장을 함께 제공해 Restart & Run All 통과를 확인하세요.`
    }
  ],
  quiz: [
    {
      q: `고객이 "지난주에 받은 분석 숫자와 오늘 재실행한 숫자가 다르다"고 항의한다. 코드와 입력 CSV의 해시는 그대로이고, 저장소에는 requirements.txt(내용은 pandas, numpy 이름만 한 줄씩)뿐이다. 가장 먼저 할 일은?`,
      choices: [
        `난수 시드를 더 많은 곳에 추가하고 반복 횟수를 늘려, 실행마다 생기는 차이를 평균으로 묻는다.`,
        `지난주와 오늘의 설치 환경(pip freeze)을 비교해 버전 차이를 찾고, 원인 버전을 락 파일로 고정한다.`,
        `노트북을 처음부터 다시 작성해 새 결과를 기준값으로 삼고, 지난주 숫자는 오류였다고 설명한다.`,
        `고객 PC의 Python을 최신 안정판으로 올리면 라이브러리도 함께 맞춰져 결과가 같아질 것이라고 안내한다.`
      ],
      answer: 1,
      why: `코드와 데이터가 같다면 남는 축은 환경과 난수입니다. 버전을 고정하지 않으면 설치 시점의 최신 호환 조합을 받으므로 환경이 첫 용의자이고, pip freeze 비교가 가장 싸고 확실한 확인입니다. 시드 추가는 환경이 같을 때만 의미가 있어 순서가 틀렸고, Python을 최신으로 올리면 또 다른 조합이 설치되어 문제가 늘어납니다.`
    },
    {
      q: `CI 로그:
$ uv sync --locked
(실패) 메시지 요지: uv.lock이 pyproject.toml의 의존성과 맞지 않아 갱신이 필요한데 --locked가 지정되어 있다.

직전 커밋에서 동료가 pyproject.toml의 dependencies에 scikit-learn을 직접 적었고 uv.lock은 건드리지 않았다. 올바른 조치는?`,
      choices: [
        `CI 명령에서 --locked를 빼서, 락 상태와 상관없이 일단 통과하도록 만든다.`,
        `CI를 --frozen으로 바꿔, 갱신되지 않은 락 파일을 그대로 설치하게 한다.`,
        `로컬에서 uv lock으로 락을 갱신하고 uv.lock 변경을 같은 PR에 커밋한다.`,
        `uv.lock을 삭제하고 .gitignore에 추가해, CI가 매번 새로 해석하게 한다.`
      ],
      answer: 2,
      why: `--locked는 "선언은 바뀌었는데 락은 그대로"인 커밋을 잡으려는 안전장치이므로, 락을 갱신해 함께 커밋하는 것이 정석입니다. --locked를 빼면 CI가 통과는 하지만 매번 락을 새로 풀어 재현성을 잃고, --frozen은 낡은 락 그대로 설치해 scikit-learn이 빠진 채 나중에 import 오류로 터집니다.`
    },
    {
      q: `print(sales.shape, stores.shape)     # (1000, 3) (41, 2)   <- 매장은 40곳
out = sales.merge(stores, on="store_id", how="left")
print(out.shape)                     # (1042, 4)

행이 42개 늘었다. 가장 그럴듯한 원인과 예방책은?`,
      choices: [
        `stores에 같은 store_id가 두 번 있어 그 매장의 판매 42행이 복제되었다. validate="many_to_one"으로 막는다.`,
        `how="left"는 좌변 행을 항상 늘리는 방식이므로, how="inner"로 바꾸면 행 수가 원래대로 돌아온다.`,
        `pandas 3.x의 Copy-on-Write가 merge 중 행을 복사해 늘리므로, copy=False를 주어 막는다.`,
        `on 키의 dtype이 서로 달라 일부 행이 중복 매칭된 것이므로, astype으로 dtype을 맞춘다.`
      ],
      answer: 0,
      why: `매장이 40곳인데 마스터가 41행이면 키 하나가 중복이고, 그 키를 가진 판매 행(42개)이 각각 한 번 더 복제되어 1042행이 됩니다. 우변 키가 유일하다면 left join은 좌변 행 수를 늘리지 않으므로 how가 원인이 아니고, CoW는 값의 복사 시점에 관한 것이라 행 수와 무관하며, dtype 불일치는 보통 매칭 실패나 오류로 나타나지 중복 증가로 나타나지 않습니다.`
    },
    {
      q: `a = np.ones((3, 4))      # 3행 4열
b = np.array([10, 20, 30])
a + b
# ValueError: operands could not be broadcast together with shapes (3,4) (3,)

각 행 i에 b[i]를 더하고 싶다. 올바른 수정은?`,
      choices: [
        `a + b.T`,
        `a + b.reshape(1, 3)`,
        `a + np.resize(b, 4)`,
        `a + b[:, None]`
      ],
      answer: 3,
      why: `b[:, None]은 shape (3,1)이라 (3,4)와 끝 차원 비교에서 1이 늘어나 행별 덧셈이 됩니다. b.T는 1차원 배열에서 아무 일도 하지 않아 같은 오류가 나고, reshape(1,3)도 끝 차원 3과 4가 맞지 않아 오류입니다. np.resize(b, 4)는 [10,20,30,10]을 만들어 열 방향으로 더해 버리므로 오류 없이 틀린 값을 내는 가장 위험한 선택입니다.`
    },
    {
      q: `소매 고객의 Parquet 판매 이력이 8천만 행(디스크 약 2GB)이고 분석 PC는 RAM 16GB이다. 필요한 것은 매장×월 매출 합계와 상위 SKU 목록뿐인데, pd.read_parquet으로 전체를 올리면 메모리 부족 경고가 난다. 현실적인 해법은?`,
      choices: [
        `10% 무작위 표본으로 합계를 구한 뒤 10배 해서 보고하고, 표본 오차는 따로 설명하지 않는다.`,
        `고객에게 RAM 64GB PC를 사 달라고 요청해, 지금 코드를 그대로 돌릴 수 있게 한다.`,
        `DuckDB로 Parquet을 직접 질의해 SQL에서 집계하고, 결과(수천 행)만 pandas로 가져온다.`,
        `모든 문자열 열을 object로 바꿔 메모리를 줄인 뒤, 전체를 한 번에 읽어 집계한다.`
      ],
      answer: 2,
      why: `합계와 순위는 표본 추정이 아니라 정확한 값이 필요하고, DuckDB는 파일에서 필요한 열만 읽어 SQL로 집계하므로 전체를 메모리에 올릴 필요가 없습니다. RAM 증설은 비용과 시간이 들고 데이터가 커지면 같은 문제가 반복되며, 문자열을 object로 바꾸는 것은 대개 메모리를 줄이지 못합니다(pyarrow가 있으면 pandas 3.x의 기본 str dtype이 Arrow 배열로 저장되어 더 촘촘하고), 8천만 행을 통째로 올리는 구조도 그대로입니다.`
    },
    {
      q: `2026-11 기준으로 새 PoC를 시작한다. 스택은 NumPy·pandas·scikit-learn이고 이후 PyTorch도 쓸 수 있다. PyPI 분류자를 보니 pandas·PyTorch는 3.15까지, scikit-learn은 3.14까지 적혀 있고, python.org의 최신 안정판은 3.15.2이다. 가장 합리적인 결정은?`,
      choices: [
        `교집합인 3.14로 시작해 .python-version으로 고정하고, 3.15는 CI 매트릭스로 따로 시험한다.`,
        `최신 안정판이 항상 최선이므로 3.15.2를 쓰고, 설치되지 않는 패키지는 직접 소스 빌드로 해결한다.`,
        `이미 EOL이 지난 3.10을 그대로 유지하되, 고객에게는 따로 알리지 않고 넘어간다.`,
        `Python 버전은 고정하지 않고, 실행하는 PC마다 uv가 그때그때 고르도록 맡겨 둔다.`
      ],
      answer: 0,
      why: `프로젝트의 핵심 라이브러리가 모두 지원하는 범위에서 고르고 고정해야 재현성과 지원 가능성이 함께 확보됩니다. 최신판을 고집하면 wheel이 없는 패키지를 소스 빌드로 해결해야 하는 위험이 생기고, 3.10은 2026-10-01에 지원이 끝났으며, 버전을 고정하지 않으면 환경 재현성이 사라집니다. 분류자는 힌트일 뿐이므로 실제 설치와 테스트로 확인해야 합니다.`
    },
    {
      q: `-- 목적: 예측 시점이 "그날 아침"일 때 그날 qty를 맞히는 모델의 피처
SELECT store_id, day, qty,
       avg(qty) OVER (PARTITION BY store_id ORDER BY day
                      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma7
FROM daily;

오프라인 검증 점수가 비정상적으로 높고 운영에서는 급락한다. 가장 가능성 높은 원인은?`,
      choices: [
        `OVER 절에서 ORDER BY와 ROWS 프레임을 함께 쓰면 이동 평균이 정의되지 않아 값이 임의로 나온다.`,
        `PARTITION BY store_id 때문에 다른 매장의 값이 평균에 섞여 들어와 값이 오염된다.`,
        `avg는 집계 함수라 윈도 함수로 쓸 수 없으므로 서브쿼리로 미리 집계해 조인해야 한다.`,
        `프레임이 CURRENT ROW를 포함해 그날의 qty가 피처에 섞였다(누수). 끝을 1 PRECEDING으로 바꾼다.`
      ],
      answer: 3,
      why: `ma7의 프레임 끝이 CURRENT ROW라 맞혀야 할 그날의 qty가 평균에 들어갑니다. 예측 시점에 알 수 없는 값이므로 오프라인 점수만 부풀고 운영에서 무너지는 전형적 누수입니다. 나머지 세 선택지는 문법적으로 틀린 주장입니다. ORDER BY와 프레임은 함께 쓰고, avg는 윈도 함수로 쓸 수 있으며, PARTITION BY는 오히려 매장이 섞이지 않게 합니다.`
    },
    {
      q: `$ python load.py        # 리눅스 서버, 고객이 Excel에서 "CSV로 저장"한 한글 파일
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xb0 in position 0: invalid start byte

가장 적절한 대응은?`,
      choices: [
        `errors="ignore"로 읽어, 해독할 수 없는 바이트를 건너뛰고 나머지 데이터로 진행한다.`,
        `encoding="cp949"로 읽어 한글을 확인하고, 수신 단계에서 UTF-8로 정규화해 README에 적는다.`,
        `서버 Python을 다른 버전으로 바꿔서, 기본 인코딩이 달라져 오류가 사라지는지 확인해 본다.`,
        `pandas를 재설치해서, 파일의 인코딩을 자동으로 감지하는 기능이 복구되는지 확인한다.`
      ],
      answer: 1,
      why: `0xB0으로 시작하는 바이트는 cp949로 저장된 한글의 전형적인 선두 바이트이므로 파일 인코딩을 먼저 의심하는 것이 맞습니다. errors="ignore"는 오류를 지우는 대신 데이터를 조용히 잃게 하고, Python 버전이나 pandas 재설치는 파일의 인코딩과 무관합니다. 수신 시점에 정규화하면 이후 파이프라인은 UTF-8 하나만 신경 쓰면 됩니다.`
    },
    {
      q: `df = pd.read_csv("orders.csv")          # pandas 3.1
df[df["qty"] < 0]["qty"] = 0            # 음수 수량을 0으로 정리했다고 생각
print((df["qty"] < 0).sum())

orders.csv에 qty < 0인 행이 17개 있었다. 출력은 무엇이고 올바른 수정은?`,
      choices: [
        `17이 그대로 출력된다. 임시 복사본에만 쓰였기 때문이며, df.loc[df["qty"] < 0, "qty"] = 0으로 고친다.`,
        `0이 출력된다. 체인 할당이 df의 뷰를 통해 원본까지 값을 고치기 때문이다.`,
        `SettingWithCopyWarning을 출력한 뒤 0이 나온다. 경고를 무시해도 값은 바뀐다.`,
        `KeyError: 'qty'가 난다. 체인 인덱싱으로 이미 고른 열을 다시 고를 수 없기 때문이다.`
      ],
      answer: 0,
      why: `pandas 3.0부터 Copy-on-Write가 기본이라 df[mask]는 항상 복사처럼 동작하고, 그 복사본에 대입한 값은 df에 반영되지 않습니다. SettingWithCopyWarning은 3.0에서 제거되었고 대신 ChainedAssignmentError 경고가 뜰 수 있지만, 경고 메시지가 지나가 버려도 값이 바뀌지 않는다는 점이 위험합니다. 2.x에서 "가끔 동작하던" 기억 때문에 0이 나온다고 답하기 쉽지만 3.x에서는 맞지 않습니다.`
    },
    {
      q: `부트스트랩 신뢰구간을 계산하는 리포트 스크립트가 실행할 때마다 구간 끝값이 조금씩 다르다. 코드는 함수 안에서 np.random.default_rng()를 인자 없이 호출한다. 고객은 "같은 데이터인데 왜 매번 다른가"라고 묻는다. 가장 좋은 수정은?`,
      choices: [
        `반복 횟수를 10만 번으로 늘려, 구간 끝값의 변동이 눈에 띄지 않을 만큼 작아지게 한다.`,
        `파일 맨 위에서 파이썬 표준 random.seed(42)를 호출해 시드를 고정했다고 보고한다.`,
        `진입점에서 시드를 받아 default_rng(seed)를 한 번 만들어 전달하고, 사용한 시드를 리포트에 기록한다.`,
        `난수를 쓰는 분석은 원래 실행마다 달라지는 것이므로, "구간이 매번 다를 수 있다"고 문서에 적어 둔다.`
      ],
      answer: 2,
      why: `재현성은 시드를 한곳에서 받아 같은 Generator를 전달하고 그 값을 기록해야 확보됩니다. 반복 횟수를 늘리면 변동폭이 줄 뿐 값이 같아지지는 않고, 파이썬 random 모듈의 시드는 NumPy Generator에 영향을 주지 않습니다. 문서로만 때우는 것은 고객이 요구한 재실행 가능성을 만족시키지 못합니다.`
    },
    {
      q: `고객 보안팀이 묻는다. "Astral이 OpenAI에 합류한다는 발표(2026-03-19)가 있던데, uv로 환경을 관리해도 되나요? 몇 년 뒤 문제가 되면 우리 저장소는 어떻게 되죠?" 가장 적절한 답은?`,
      choices: [
        `uv는 오픈소스이므로 소유 구조가 바뀌어도 위험이 전혀 없다고 답하고, 별도 대비는 하지 않는다.`,
        `위험을 이유로 지금 모든 프로젝트를 requirements.txt만 쓰는 예전 방식으로 되돌린다.`,
        `신뢰할 수 없으므로 모든 저장소를 즉시 Poetry로 이전하고, 기존 uv.lock은 폐기한다.`,
        `표준 pyproject 필드와 pylock.toml 내보내기, CI의 uv 버전 고정으로 이전 비용을 낮춘다.`
      ],
      answer: 3,
      why: `오픈소스 유지 약속이 있어도 미래가 보장된 것은 아니므로 "위험 0"은 과장이고, 대응은 이전 비용을 낮추는 설계입니다. requirements.txt를 손으로 쓰는 방식으로 돌아가면(pip-tools 같은 별도 도구가 없다면) 전이 의존성 고정 같은 락 기능을 잃고, 근거 없는 즉시 전면 이전은 비용만 만듭니다. 표준 형식(pyproject, pylock.toml)과 버전 고정이 이전 가능성을 확보하는 방법입니다.`
    },
    {
      q: `# 저장소 루트의 .env  (git에 추적되어 원격에 push된 상태)
DB_URL=postgresql://analyst:Pa55word@db.client.internal:5432/sales
SEED=42

리뷰에서 무엇이 가장 먼저 문제인가?`,
      choices: [
        `SEED 같은 분석 파라미터는 환경 변수에 두면 안 되므로, 코드 상수로 옮기는 것이 가장 먼저다.`,
        `이미 push된 DB 비밀번호를 즉시 교체하고, .env를 추적에서 빼며 .env.example만 커밋한다.`,
        `DB_URL을 환경 변수가 아닌 코드 상수로 옮겨 가독성을 높이고, .env 파일은 삭제한다.`,
        `git 이력에서 파일을 지우면 비밀번호가 안전해지므로, 이력 정리(rewrite)만 먼저 한다.`
      ],
      answer: 1,
      why: `이미 원격에 올라간 자격증명은 유출된 것으로 보고 먼저 폐기·교체해야 하며, Twelve-Factor의 기준인 "지금 코드를 공개해도 자격증명이 새지 않는가"를 만족하도록 .env는 추적 대상에서 빼야 합니다. 이력 삭제만으로는 이미 복제된 사본을 되돌릴 수 없고, 비밀을 코드 상수로 옮기는 것은 상황을 악화시킵니다. SEED는 비밀이 아니므로 문제의 핵심이 아닙니다.`
    }
  ],
  refs: [
    {
      title: `Status of Python versions (Python Developer's Guide)`,
      url: `https://devguide.python.org/versions/`,
      kind: `doc`,
      why: `브랜치별 지원 상태·최초 릴리스·EOL 표(2026-11 열람)를 확인하는 1차 출처다. 견적서의 버전·EOL 표를 만들 때 쓴다.`
    },
    {
      title: `What's New In Python 3.15`,
      url: `https://docs.python.org/3.15/whatsnew/3.15.html`,
      kind: `doc`,
      why: `lazy import(PEP 810), UTF-8 기본 인코딩, frozendict·sentinel 내장 같은 3.15 변화의 공식 정리다. 3.14의 t-string·어노테이션 지연 평가·free-threaded 공식 지원은 같은 사이트의 3.14 What's New에서 이어서 읽는 심화 자료다.`
    },
    {
      title: `uv documentation: Locking and syncing`,
      url: `https://docs.astral.sh/uv/concepts/projects/sync/`,
      kind: `doc`,
      why: `uv lock·sync·run과 --locked·--frozen의 정확한 동작, 락이 낡았다고 판단하는 조건을 설명한다. 레슨 2의 명령 표를 검증하는 근거다.`
    },
    {
      title: `uv documentation: Using uv in GitHub Actions`,
      url: `https://docs.astral.sh/uv/guides/integration/github/`,
      kind: `doc`,
      why: `setup-uv 액션, uv 버전 고정, uv sync --locked, 캐시, Python 버전 매트릭스 구성의 공식 예시다. 랩 3의 CI 작성에 그대로 참고한다.`
    },
    {
      title: `PEP 751: A file format to record Python dependencies for installation reproducibility`,
      url: `https://peps.python.org/pep-0751/`,
      kind: `standard`,
      why: `도구 간 호환되는 표준 락 파일 pylock.toml의 명세다(2025-03-31 Final, 이후 최신 명세는 PyPA specs 페이지가 관리). uv.lock이 uv 전용 형식이라는 점과 대비해 이전 가능성을 설명할 때 쓴다.`
    },
    {
      title: `NumPy: Broadcasting`,
      url: `https://numpy.org/doc/stable/user/basics.broadcasting.html`,
      kind: `doc`,
      why: `브로드캐스팅 규칙(끝 차원부터 비교, 같거나 한쪽이 1)과 호환·비호환 shape 예시를 공식 문서로 확인한다.`
    },
    {
      title: `NumPy: Random Generator`,
      url: `https://numpy.org/doc/stable/reference/random/generator.html`,
      kind: `doc`,
      why: `default_rng·Generator·spawn과 "버전 간 스트림 호환 보장 없음" 정책이 명시된 문서다. 재현성의 한계를 고객에게 설명할 때 인용한다.`
    },
    {
      title: `pandas: What's new in 3.0.0 (January 21, 2026)`,
      url: `https://pandas.pydata.org/docs/whatsnew/v3.0.0.html`,
      kind: `doc`,
      why: `Copy-on-Write 기본, 체인 할당 불가, 문자열 str dtype, datetime 해상도 추론, 최소 버전(Python 3.11·NumPy 1.26.0), 2.3 경유 업그레이드 권고 등 3.x 전환 시 깨지는 항목의 1차 출처다. 업그레이드 견적의 체크리스트로 쓴다.`
    },
    {
      title: `pandas.merge API reference`,
      url: `https://pandas.pydata.org/docs/reference/api/pandas.merge.html`,
      kind: `doc`,
      why: `validate 인자의 허용값(one_to_one·one_to_many·many_to_one·many_to_many)과 indicator, 양쪽 키가 null이면 서로 매칭되어 SQL 조인과 다르다는 경고가 실려 있다. 조인 폭발 방어 코드의 근거다.`
    },
    {
      title: `PostgreSQL Tutorial: Window Functions`,
      url: `https://www.postgresql.org/docs/current/tutorial-window.html`,
      kind: `doc`,
      why: `윈도 함수와 GROUP BY의 차이, OVER·PARTITION BY·ORDER BY, 기본 프레임 규칙을 간결하게 설명한다. DuckDB의 윈도 SQL도 같은 개념을 따른다.`
    },
    {
      title: `DuckDB documentation: Python API (overview)`,
      url: `https://duckdb.org/docs/2.0/clients/python/overview.html`,
      kind: `doc`,
      why: `pip install duckdb, CSV·Parquet 직접 질의, .df()로 pandas 변환의 공식 스니펫이다. 대용량 집계를 노트북에서 처리하는 출발점이다.`
    },
    {
      title: `scikit-learn: Common pitfalls and recommended practices`,
      url: `https://scikit-learn.org/stable/common_pitfalls.html`,
      kind: `doc`,
      why: `전처리 누수를 Pipeline으로 막는 방법과 random_state로 난수를 통제하는 규칙이 수치 예시와 함께 나온다. 다음 ML 모듈의 예습 자료다.`
    },
    {
      title: `Python HOWTO: Logging`,
      url: `https://docs.python.org/3/howto/logging.html`,
      kind: `doc`,
      why: `라이브러리와 애플리케이션의 로깅 책임 분리, 레벨 값, print와 logging의 구분, 지연 포맷팅 권고를 공식 문서로 확인한다.`
    },
    {
      title: `The Twelve-Factor App: III. Config`,
      url: `https://12factor.net/config`,
      kind: `article`,
      why: `설정을 환경 변수에 두고 "코드를 공개해도 자격증명이 새지 않는가"로 판단하는 기준을 제시한다. .env·비밀 관리 규칙의 근거다.`
    }
  ],
  gigs: [
    `고객이 가정하는 것과 견적 전 확인: 대부분의 고객은 "노트북 한 장"이면 된다고 생각하지만 인수인계가 목적이면 재현 가능한 저장소가 필요합니다. 데이터 크기·형식·갱신 주기, 개인정보 포함 여부, 고객 PC의 OS와 Python 설치 권한(설치가 막혀 있으면 컨테이너나 uv 설치 허용 여부), 납품 형태(리포트·노트북·패키지), 인수인계 세션 포함 여부를 서면으로 확정하세요.`,
    `견적 항목을 분리하세요: 인수 점검과 환경 정리, 데이터 품질 게이트와 정비, 분석, 리포트 작성, 인수인계·문서. 데이터 이슈는 분석 시간을 크게 잡아먹는 경우가 흔하므로(본인의 작업 기록으로 비율을 보정하세요) 고객 데이터를 보기 전에는 "데이터 점검 단계 소액 고정가 → 본작업 견적"의 2단계 견적이 안전합니다.`,
    `납품물 체크리스트: pyproject.toml, uv.lock, .python-version, 명령 3개로 끝나는 README, 테스트와 CI, 실행 지문(run_info.json), 데이터 사전과 품질 리포트, 버전·EOL 표(예: Python 3.10은 2026-10-01 EOL, 확인 날짜 명시), 알려진 한계와 업그레이드 가이드. 이 목록을 계약서의 "완료 기준"에 넣으면 분쟁이 줄어듭니다.`,
    `자주 걸리는 함정: 고객 데이터에 개인정보(이름·전화·주문번호)가 섞여 있는데 로컬·저장소·외부 AI 서비스에 올려도 되는지 합의하지 않는 것, 노트북에 키를 직접 적고 커밋하는 것, Excel 저장 CSV의 cp949·날짜 형식, 고객 서버 Python이 이미 EOL인 경우의 업그레이드 책임 범위입니다. 계약서에 "고객 환경 변경은 별도 협의"를 명시하세요.`,
    `의존성과 도구 정책은 유지보수 계약의 항목입니다: pandas 2→3 같은 메이저 전환, ruff 0.17 같은 기본값 변경, Python 버전 EOL은 납품 후에도 생깁니다. 락 파일로 납품 시점을 고정하고 업그레이드는 별도 작업으로 견적하세요. 고객 보안팀이 uv의 장기 지원(Astral의 OpenAI 합류, 2026-03-19 발표)을 물으면 표준 pyproject와 pylock.toml 내보내기, 도구 버전 고정으로 답합니다.`,
    `기술 선택을 근거로 설명하세요: 대용량 파일 집계는 DuckDB, 모델 입력 피처는 pandas, 결과는 테스트로 대조한다는 식으로 "왜 이 도구인가"를 한 문장씩 적어 두면 고객 개발자가 이어받기 쉽고 견적의 신뢰가 올라갑니다. 최신 Python이 아니라 핵심 라이브러리의 지원 범위 교집합으로 버전을 고른 이유도 README에 남기세요(2026-11 기준 값은 시점이 지나면 달라지므로 확인 날짜를 적습니다).`,
    `포트폴리오와 채용 관점: 공고의 기본 요건인 Python은 2025 Stack Overflow 조사에서 57.9%로 사용률이 높아 지원자가 많습니다. 차별점은 "명령 3개로 재현되는 EDA 저장소"(락 파일·테스트·CI·데이터 품질 리포트)를 공개 저장소로 보여 주는 것입니다. 합성 데이터와 정답지 기반 테스트는 고객 데이터 없이도 역량을 증명하는 좋은 방법입니다.`
  ]
};
