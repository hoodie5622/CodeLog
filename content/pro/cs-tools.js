(window.PRO_MODULES = window.PRO_MODULES || {})["cs-tools"] = {
  id: "cs-tools",
  summary: `WSL2·리눅스 VM에서 재현 가능한 개발 환경을 만들고, 셸 스크립트·SSH·Git(내부 구조 포함)·디버거·sanitizer로 인수받은 고객 저장소의 회귀 버그를 찾아 고치고 인계 문서까지 남길 수 있다.`,
  hours: 50,
  goals: [
    `WSL2·리눅스 VM·클라우드 VM 중 상황에 맞는 환경을 고르고, 파일 위치·메모리 한도·systemd 설정을 조정해 새 PC에서 30분 안에 개발 환경을 복원할 수 있다`,
    `셸이 한 줄을 확장·리다이렉션·fork/exec하는 순서를 설명하고, set -euo pipefail의 한계를 알고 trap·멱등성·flock을 갖춘 스크립트와 cron 점검 작업을 작성할 수 있다`,
    `SSH 키·config·ProxyJump·rsync·tmux로 원격 서버에서 안전하게 작업하고 호스트 키 경고와 권한 오류를 진단할 수 있다`,
    `Git의 객체 모델(blob·tree·commit·ref·index·packfile)을 plumbing 명령으로 직접 만들어 보이고, reset·rebase·gc가 객체와 포인터에 하는 일을 설명할 수 있다`,
    `rebase·reflog·bisect·force-with-lease·rerere로 히스토리를 정리하고 사고를 복구하며, 회귀를 일으킨 커밋을 이분 탐색으로 자동 판정해 찾을 수 있다`,
    `PR·브랜치 보호·CODEOWNERS·Conventional Commits·주석 태그로 협업 규칙을 설계하고, 시크릿이 커밋됐을 때의 대응 절차와 인계 문서(README·ADR·런북)를 만들 수 있다`,
    `재현→축소→가설→관측 순서로 디버깅하고 gdb·pdb·원격 디버거·코어 덤프·ASan/UBSan 리포트를 읽어 원인 줄을 특정할 수 있다`,
    `Makefile·잠금 파일·venv·컨테이너·린터·pre-commit으로 재현 가능한 빌드와 품질 게이트를 구성하고, 에이전트 코딩 도구의 산출물을 검증하는 절차를 적용할 수 있다`
  ],
  lessons: [
    {
      title: `개발 환경의 멘탈 모델: 프로세스가 받는 입력과 WSL2·VM 선택`,
      body: `개발 환경은 "내 컴퓨터에 설치된 것들의 모음"이 아니라 **프로그램이 실행될 때 받는 입력의 집합**입니다. 리눅스에서 프로그램을 실행하면 커널은 실행 파일 경로, 인자 목록(argv), 환경 변수 목록, 작업 디렉터리, 열린 파일 서술자(0 입력, 1 출력, 2 오류), 실행 사용자를 묶어 새 프로세스를 만듭니다. "내 PC에서는 되는데 서버에서는 안 된다"는 거의 모든 사건은 이 입력 중 하나가 달랐다는 뜻입니다. PATH가 다른 python을 가리키거나, 환경 변수가 없거나, 상대 경로의 기준 디렉터리가 다르거나, 사용자 권한이 다른 경우입니다. 이 모듈의 도구(셸, ssh, git, 디버거, 빌드 도구, 컨테이너)는 모두 이 입력을 만들고, 확인하고, 고정하는 도구입니다.

### 층을 구분하기: 터미널, 셸, 프로그램

터미널은 글자를 그리고 키 입력을 전달할 뿐이고, 셸(bash, zsh)은 한 줄을 해석해 프로그램을 실행하는 평범한 프로그램이며, 실제 일은 그 자식 프로세스가 합니다. Windows Terminal의 탭 하나는 PowerShell, 다른 탭은 WSL의 bash, 또 다른 탭은 ssh로 접속한 원격 서버일 수 있고 이들은 서로 다른 OS 환경입니다. 어느 층에 있는지 모르면 명령이 엉뚱한 곳에서 실행됩니다. ‹hostname›, ‹uname -a›, ‹echo $SHELL›, ‹pwd›로 위치를 확인하는 습관을 들이세요.

### Windows 학습자의 선택지

서버·백엔드·AI 작업의 실행 환경은 사실상 리눅스이므로 학습 환경도 리눅스로 맞추는 편이 사고를 줄입니다.

- **WSL2**: Microsoft 문서 기준(2026-11 확인) ‹wsl --install› 한 줄로 필요한 기능을 켜고 기본값으로 Ubuntu를 설치하며(Windows 10 build 19041 이상 또는 Windows 11), 새 설치는 WSL 2가 기본입니다. WSL 2는 Microsoft가 빌드한 리눅스 커널을 가벼운 가상 머신 안에서 돌립니다. 일상 개발의 기본 선택입니다.
- **리눅스 VM(Hyper-V, VirtualBox 등)**: systemd·cgroup·커널 기능을 마음껏 만지거나 과제가 특정 배포판을 요구할 때 씁니다. 예를 들어 CMU의 BusTub README는 Ubuntu 24.04를 개발 환경으로 권하고 WSL은 지원하지 않는다고 밝힙니다(2026-11 확인).
- **클라우드 VM**: 상시 켜 둘 실습 서버나 고객과 같은 배포판이 필요할 때 씁니다. 요금 관리가 필요합니다.
- **이중 부팅**: GPU 직접 접근처럼 하드웨어가 필요할 때만 고려합니다.

### WSL2에서 반드시 알아야 할 네 가지

1. **파일은 리눅스 쪽에 둡니다.** 문서는 리눅스 도구로 작업한다면 ‹/home/사용자/project›에 두라고 안내합니다. ‹/mnt/c›(Windows 드라이브)는 DrvFs라는 연동용 플러그인으로 마운트되어 리눅스 쪽 파일 시스템보다 한 겹을 더 거칩니다. 문서는 속도 차이를 숫자 없이 권고로만 적으므로 실습 1에서 직접 재어 보세요. 경험적으로는 파일을 많이 열고 상태를 조회하는 작업(git status, npm install, 테스트)에서 차이가 크게 나타납니다. 파일 권한 메타데이터도 기본적으로 꺼져(‹metadata› 기본값 disabled) chmod가 기대대로 동작하지 않을 수 있습니다. Windows 쪽에서 보려면 ‹explorer.exe .›나 VS Code의 WSL 확장(‹code .›)을 씁니다.
2. **자원은 .wslconfig로 제한합니다.** ‹%UserProfile%\\.wslconfig›의 ‹[wsl2]›에서 ‹memory›(기본값은 Windows 메모리의 50%), ‹processors›, ‹swap›을 정하고 ‹wsl --shutdown› 후 다시 열어야 반영됩니다.
3. **systemd는 ‹/etc/wsl.conf›의 ‹[boot]›에 ‹systemd=true›를 넣어 켭니다.** 서비스·타이머·journalctl 실습에 필요합니다(문서상 Windows 11 대상 설정).
4. **두 세계의 도구가 섞입니다.** 기본 설정(‹/etc/wsl.conf›의 ‹[interop]›에서 ‹appendWindowsPath› 기본값 true)에서는 Windows의 PATH가 리눅스 PATH에 덧붙어 WSL 안에서 git.exe나 node.exe를 실수로 실행할 수 있습니다. ‹command -v git›이 ‹/mnt/c/›로 시작하면 잘못된 도구입니다. 줄바꿈(CRLF)과 대소문자 구분도 두 세계에서 다릅니다.

### 목표: 망가져도 30분 안에 복원되는 환경

설치한 것의 목록(apt 패키지, 런타임 버전, 전역 도구)을 스크립트로 남기고 설정 파일(‹.gitconfig›, ‹.bashrc›, ‹~/.ssh/config›)을 저장소로 관리하면 새 PC나 고객이 지정한 VM에서 같은 환경을 다시 만들 수 있습니다. "내 환경에서만 도는 코드"는 인수 거절 사유가 됩니다.`,
      code: `#!/usr/bin/env bash
# env-doctor.sh : 환경 진단(읽기 전용). 확인 결과를 results.md 에 붙여 넣는다.
echo "kernel : $(uname -r)"
. /etc/os-release && echo "distro : $PRETTY_NAME"
echo "cpus   : $(nproc)"
echo "memory : $(free -m | awk '/^Mem:/ {print $2 " MiB"}')"

if grep -qi microsoft /proc/version; then
  echo "wsl    : yes"
  case "$PWD" in
    /mnt/*) echo "WARN   : 작업 디렉터리가 Windows 드라이브(/mnt)입니다. ~/work 로 옮기세요." ;;
  esac
else
  echo "wsl    : no"
fi

for t in git curl jq make gcc python3; do
  p=$(command -v "$t") || { echo "MISSING: $t"; continue; }
  case "$p" in
    /mnt/*) echo "WARN   : $t 가 Windows 실행 파일입니다 ($p)" ;;
    *)      echo "ok     : $t -> $p" ;;
  esac
done`,
      codeLang: `bash`,
      key: [
        `프로그램 실행은 (실행 파일, argv, 환경 변수, 작업 디렉터리, 열린 fd, 사용자)의 조합이며 "내 PC에서만 된다"는 이 중 하나가 다르다는 뜻이다.`,
        `WSL 2는 Microsoft가 빌드한 리눅스 커널을 가벼운 VM에서 돌린다. 문서는 리눅스 도구로 작업할 때 파일을 /home 아래 리눅스 파일 시스템에 두라고 안내한다.`,
        `자원 한도는 %UserProfile%\\.wslconfig(WSL 2 전체), 배포판별 설정(systemd 등)은 /etc/wsl.conf에 두며 wsl --shutdown 뒤에 반영된다.`,
        `수업이나 고객이 요구하는 환경이 WSL을 제외하면(예: BusTub의 Ubuntu 24.04, 2026-11 확인) 리눅스 VM이나 클라우드 VM을 쓴다.`,
        `환경은 설치 스크립트와 dotfile 저장소로 복원 가능하게 만들고, command -v 로 실제 실행될 도구의 경로를 확인한다.`
      ],
      pitfalls: [
        `프로젝트를 /mnt/c 아래에 둔 채 npm install과 테스트가 느린 것을 WSL 자체의 한계로 결론 짓는다.`,
        `WSL 안에서 Windows의 git.exe, node.exe가 PATH에서 먼저 잡히는 것을 모르고 줄바꿈·권한 문제를 코드 탓으로 돌린다.`,
        `.wslconfig를 고치고 wsl --shutdown 없이 바로 반영되기를 기대한다.`,
        `도구를 손으로 하나씩 설치하고 목록을 남기지 않아 PC가 바뀔 때마다 하루를 쓴다.`
      ]
    },
    {
      title: `셸은 한 줄을 어떻게 실행하는가: 확장, 파이프, 종료 코드, 환경 변수`,
      body: `셸은 한 줄을 읽어 단어로 쪼개고, 확장하고, 리다이렉션을 연결한 뒤에야 프로그램을 실행합니다. 이 순서를 모르면 따옴표·와일드카드·파이프 버그를 감으로 고치게 됩니다.

### 실행 전에 셸이 하는 일

bash는 대략 이 순서로 처리합니다. 따옴표 해석, 중괄호 확장(‹a{1,2}›), 틸드(‹~›), 변수 확장(‹$VAR›), 명령 치환(‹$(cmd)›), 산술 확장, **단어 분리**, **파일 이름 확장(글로빙)**, 따옴표 제거입니다. 여기서 두 가지가 중요합니다.

- 글로빙은 프로그램이 아니라 셸이 합니다. ‹ls *.txt›에서 ls는 ‹*.txt›를 보지 못하고 이미 펼쳐진 파일 목록을 받습니다. 따옴표로 막은 패턴(‹find . -name "*.txt"›)은 셸이 건드리지 않고 find가 직접 해석합니다. 일치하는 파일이 없으면 기본 설정에서는 패턴 문자열이 그대로 넘어갑니다.
- 따옴표 없는 변수 확장은 값을 공백으로 쪼갭니다. ‹f="my file.txt"›일 때 ‹rm $f›는 인자 두 개(‹my›, ‹file.txt›)를 지웁니다. 변수 확장은 거의 항상 ‹"$f"›처럼 큰따옴표로 감쌉니다.

### 프로세스와 fd: 리다이렉션과 파이프

셸은 자식을 fork한 뒤 exec 직전에 fd를 재배치합니다. ‹cmd > f›는 fd 1을 파일 f로 바꾸고 ‹2>&1›은 "fd 2를 지금 fd 1이 가리키는 곳으로" 바꿉니다. 왼쪽에서 오른쪽으로 평가되므로 ‹cmd > f 2>&1›(둘 다 파일)과 ‹cmd 2>&1 > f›(오류는 터미널, 출력만 파일)는 다릅니다. 파이프 ‹a | b›는 셸이 pipe를 만들고 두 프로세스를 **동시에** 띄워 a의 fd 1과 b의 fd 0을 잇습니다. 리눅스 파이프의 기본 용량은 16페이지, 즉 65,536바이트(페이지 4,096바이트 기준, man pipe(7))이고 가득 차면 쓰는 쪽이 기다립니다. 읽는 쪽이 먼저 끝나면 쓰는 쪽은 SIGPIPE를 받아 종료하는데, ‹yes | head -1›이 무한히 돌지 않는 이유입니다.

### 종료 코드는 셸의 반환값입니다

프로세스는 0~255의 종료 코드를 남기고 0이 성공입니다. POSIX 셸 관례로 126은 실행 불가, 127은 명령 없음이고, 시그널로 죽으면 128+번호입니다. 컨테이너가 137(128+9)로 죽었다면 SIGKILL을 받은 것입니다. 파이프라인의 종료 코드는 기본적으로 **마지막 명령**의 것이라 ‹false | true›는 0입니다. ‹set -o pipefail›을 켜면 가장 오른쪽 실패가 반영되고, bash의 ‹PIPESTATUS›로 단계별 값을 볼 수 있습니다.

### 환경 변수와 PATH

환경 변수는 프로세스가 **복사해서 물려받는** 문자열 목록입니다. 자식이 바꿔도 부모에는 영향이 없고, ‹export›하지 않은 셸 변수는 자식에게 가지 않습니다. ‹VAR=값 명령›은 그 명령에만 변수를 줍니다. 슬래시 없는 명령 이름은 PATH의 디렉터리를 왼쪽부터 찾으므로 ‹type -a python›이나 ‹command -v python›으로 "실제로 실행되는 것"을 확인합니다. 대화형 로그인 셸과 비대화형 실행(cron, ssh 원격 명령, systemd)은 읽는 시작 파일이 달라 같은 명령이 환경에 따라 다른 PATH를 봅니다.

### 서브셸의 함정

파이프의 각 단계와 ‹( … )›, ‹$( … )›는 별도 프로세스에서 돕니다. 그래서 ‹cat f | while read x; do n=$((n+1)); done›이 끝난 뒤 ‹n›은 부모 셸에서 바뀌지 않습니다(bash 기본 동작). 루프에 ‹< f›를 직접 연결하거나 프로세스 치환을 쓰면 해결됩니다.

### 현장에서 사고가 되는 조합

고객 서버의 배포 스크립트에서 흔한 사고는 위 규칙들의 조합입니다. ‹rm -rf $BUILD_DIR/*›에서 변수가 비면 ‹/*›가 되어 루트 아래를 지우려 하고, 공백이 든 경로는 인자 둘로 갈라지며, cron에서 ‹./deploy.sh > log›로 돌린 스크립트의 오류는 로그 파일에 남지 않습니다. 원인을 좁힐 때는 ‹bash -x 스크립트›로 확장이 끝난 실제 명령줄을 출력해 보세요. 셸이 프로그램에 무엇을 넘겼는지가 그대로 보이므로 "내 눈에 보이는 명령"과 "실제로 실행된 명령"의 차이가 드러납니다.`,
      code: `# 1) 리다이렉션 순서: 왼쪽에서 오른쪽으로 fd 를 복사한다
ls /nonexistent > out.txt 2>&1     # 출력과 오류 모두 out.txt
ls /nonexistent 2>&1 > out.txt     # 오류는 터미널(옛 stdout), 출력만 out.txt

# 2) 종료 코드
false | true; echo $?              # 0  (마지막 명령의 상태)
set -o pipefail
false | true; echo $?              # 1  (파이프 중 하나라도 실패하면 실패)

# 3) 따옴표와 단어 분리
f="my file.txt"; touch "$f"
ls $f                              # 인자가 'my', 'file.txt' 두 개 -> 오류
ls "$f"                            # 인자 한 개 -> 성공

# 4) 환경 변수는 자식에게 복사될 뿐 부모로 돌아오지 않는다
X=1; bash -c 'echo [$X]'           # []   (export 하지 않았으므로 자식은 모름)
export X; bash -c 'echo [$X]'      # [1]
bash -c 'X=2'; echo $X             # 1    (자식의 변경은 부모에 영향 없음)

# 5) 실제로 무엇이 실행되는지 확인
type -a python3; command -v python3`,
      codeLang: `bash`,
      key: [
        `셸은 따옴표 해석 → 확장 → 단어 분리 → 글로빙 순서로 처리한 뒤 fork·exec 하며, 글로빙은 프로그램이 아니라 셸이 한다.`,
        `변수 확장은 거의 항상 큰따옴표로 감싼다. 따옴표가 없으면 공백으로 쪼개지고 글로빙까지 일어난다.`,
        `리다이렉션은 왼쪽에서 오른쪽으로 fd를 복사하므로 > f 2>&1 과 2>&1 > f 의 결과가 다르다.`,
        `종료 코드 0은 성공, 126 실행 불가, 127 명령 없음, 128+n은 시그널 n이다. 파이프라인은 기본적으로 마지막 명령의 코드를 돌려준다.`,
        `환경 변수는 자식에게 복사될 뿐 부모로 돌아오지 않으며, 실제 실행 파일은 command -v 와 type -a 로 확인한다.`
      ],
      pitfalls: [
        `rm -rf "$dir"/* 에서 dir이 빈 문자열이면 /* 가 된다. set -u는 설정되지 않은 변수만 잡고 빈 문자열은 못 잡으므로 삭제 전에 [ -n "$dir" ] 를 직접 검사한다.`,
        `2>&1 의 위치를 바꿔 써서 오류가 로그 파일에 남지 않는 것을 운영 중에야 알게 된다.`,
        `cmd | while read 루프 안에서 바꾼 변수가 루프 뒤에 비어 있는 것을 도구의 버그로 오해한다(서브셸 때문이다).`,
        `PATH에 ~/.local/bin 같은 경로가 대화형 셸에만 있어서 cron·systemd·ssh 원격 명령에서 명령을 찾지 못한다.`
      ]
    },
    {
      title: `셸 스크립트와 텍스트 도구, 자동화: curl·jq·정규식·cron`,
      body: `셸 스크립트는 "명령 몇 개를 순서대로 실행하는 파일"이지만 운영에서는 **실패했을 때의 동작**이 품질을 결정합니다. 고객 서버에 남는 스크립트는 한밤중 cron에서 혼자 돌기 때문에, 조용히 실패하거나 반쯤 실행되고 멈추는 것이 가장 위험합니다.

### 안전 장치와 그 한계

스크립트 맨 위의 ‹set -euo pipefail›은 흔한 관용구인데 각각의 구멍을 알아야 합니다. bash 매뉴얼 기준으로 ‹-e›는 명령이 0이 아닌 상태로 끝나면 셸을 종료하지만, ‹if› 조건부, ‹&&›·‹||› 목록의 마지막이 아닌 명령, 파이프의 마지막이 아닌 단계(pipefail이 꺼진 경우)에서는 무시됩니다. 함수가 이런 문맥에서 호출되면 함수 안에서도 ‹-e›가 꺼집니다. ‹-u›는 설정되지 않은 변수 확장을 오류로 만들지만 빈 문자열은 잡지 못하고, ‹-o pipefail›은 파이프의 가장 오른쪽 실패를 상태로 삼습니다. 따라서 이 세 줄은 **안전망이지 정확성 보장이 아닙니다.** 중요한 단계는 ‹|| exit 1›이나 ‹if ! cmd; then …; fi›로 직접 처리합니다. 반대로 ‹grep -c›처럼 "없음"이 종료 코드 1인 명령은 ‹-e› 아래에서 스크립트를 죽이므로, 의도된 실패는 ‹|| true›로 표시합니다.

### 멱등성, 정리, 동시 실행

좋은 스크립트는 두 번 실행해도 결과가 같습니다(멱등). ‹mkdir -p›, ‹ln -sfn›, ‹grep -q 줄 파일 || echo 줄 >> 파일›이 그 예입니다. 임시 파일은 ‹mktemp›로 만들고 ‹trap 'rm -f "$tmp"' EXIT›로 어떤 경로로 끝나든 지웁니다. 실행 시간이 cron 주기보다 길면 같은 작업이 겹치므로 ‹flock -n /tmp/job.lock 명령›으로 막습니다. 인자는 ‹"$@"›로 그대로 전달합니다. 100줄이 넘거나 배열·JSON 처리가 복잡해지면 Python으로 옮기는 편이 유지보수 비용이 낮고, ‹shellcheck›는 따옴표 누락 같은 흔한 함정을 정적으로 찾아 줍니다.

### 텍스트 도구 묶음

- ‹grep -E›, ‹sed›, ‹awk›, ‹sort | uniq -c | sort -rn›은 로그에서 상위 IP나 상태 코드 분포를 뽑는 기본기입니다.
- ‹curl›: ‹-f›는 HTTP 4xx/5xx를 실패 종료 코드로 바꾸고, ‹-sS›는 진행 표시를 끄되 오류는 남기며, ‹--max-time›·‹--retry›는 무한 대기를 막고, ‹-w '%{http_code} %{time_total}'›는 상태와 시간을 출력합니다. API 문제는 브라우저가 아니라 curl 한 줄로 재현해야 요청과 응답을 그대로 기록할 수 있습니다.
- ‹jq›: ‹jq -r '.items[].id'›로 값을 뽑고, ‹jq -e›는 결과가 null/false이면 실패 코드를 내 조건문에 쓸 수 있습니다.
- 정규식은 방언이 다릅니다(grep 기본은 BRE, ‹-E›는 ERE, ‹-P›는 GNU의 PCRE). 중첩된 반복 같은 패턴은 입력에 따라 매칭 시간이 폭증(정규식 DoS)할 수 있어 외부 입력에 쓸 때 위험합니다.

운영에서 스크립트는 대개 조용히 죽습니다. 백업 스크립트가 ‹tar› 실패를 무시한 채 다음 줄의 오래된 파일 정리를 이어 가거나, 이전 실행이 끝나기 전에 다음 실행이 시작되어 서로의 임시 파일을 덮어쓰는 것이 전형적인 사고입니다. 그래서 스크립트 끝에 "성공했다"는 증거(종료 코드, 소요 시간, 처리 건수를 한 줄 로그로)를 남기고, 실패 알림이나 마지막 성공 시각 확인 같은 감시를 함께 정해 두어야 합니다. 고객이 원하는 것은 스크립트 자체가 아니라 "문제가 생기면 사람이 알게 되는 구조"입니다.

### 예약 실행: cron과 그 환경

cron은 5개 필드(분 시 일 월 요일)로 주기를 정하고, 로그인 셸이 아니므로 PATH가 최소이며 ‹~/.bashrc›를 읽지 않습니다. 스크립트 맨 위에서 PATH를 지정하거나 절대 경로를 쓰고, 출력은 ‹>> 로그 2>&1›로 남겨야 실패를 볼 수 있습니다. systemd 환경에서는 timer 유닛이 로그(journalctl)와 재시도 설정 면에서 낫습니다(cs-os 모듈). WSL은 유휴 타임아웃(.wslconfig의 ‹vmIdleTimeout›·‹instanceIdleTimeout›, 2026-11 문서의 기본값은 각각 60초·15초)에 따라 종료될 수 있어 cron도 같이 멈출 수 있으므로 운영용 예약 작업은 WSL이 아니라 서버에서 돌립니다.`,
      code: `#!/usr/bin/env bash
# healthcheck.sh URL [MAX_MS] : 상태가 ok 이고 지연이 MAX_MS 이하이면 종료 코드 0
# crontab 예: */5 * * * * /opt/ops/healthcheck.sh https://api.example.com/health 300 >> /var/log/hc.log 2>&1
set -euo pipefail
PATH=/usr/local/bin:/usr/bin:/bin           # cron 의 최소 PATH 에 기대지 않고 명시한다
[ $# -ge 1 ] || { echo "usage: healthcheck.sh URL [MAX_MS]" >&2; exit 2; }
url=$1
max_ms=500
if [ $# -ge 2 ]; then max_ms=$2; fi

body=$(mktemp)
trap 'rm -f "$body"' EXIT                  # 어떤 경로로 끝나도 임시 파일 삭제

# -f: HTTP 4xx/5xx 를 실패로, -sS: 진행바는 끄고 오류는 표시, -w: 총 소요 시간(초)
secs=$(curl -fsS --max-time 5 --retry 2 -o "$body" -w '%{time_total}' "$url")
ms=$(awk -v s="$secs" 'BEGIN { printf "%d", s * 1000 }')

# -e: 결과가 null/false 이면 실패, -r: 따옴표 없는 문자열
status=$(jq -er '.status' "$body")

if [ "$status" != "ok" ] || [ "$ms" -gt "$max_ms" ]; then
  echo "FAIL status=$status latency_ms=$ms" >&2
  exit 1
fi
echo "OK latency_ms=$ms"`,
      codeLang: `bash`,
      key: [
        `set -e는 if 조건·&&/|| 앞쪽·파이프 중간 단계 등에서 무시되고 함수 안으로도 전파되지 않을 수 있어서, set -euo pipefail은 안전망이지 정확성 보장이 아니다.`,
        `스크립트는 멱등(두 번 실행해도 같은 결과), trap EXIT 정리, flock 중복 방지, "$@" 인자 전달로 설계한다.`,
        `curl -fsS --max-time --retry 와 jq -e 를 조합하면 HTTP 상태·지연·본문 값을 종료 코드로 판정할 수 있다.`,
        `cron은 로그인 셸이 아니라 PATH가 최소이므로 절대 경로, PATH 지정, 로그 리다이렉션이 필수이다.`,
        `100줄을 넘거나 복잡한 자료구조가 필요하면 Python 같은 언어로 옮기고, shellcheck로 정적 검사한다.`
      ],
      pitfalls: [
        `count=$(grep -c ERROR log) 가 일치 없음(종료 코드 1)에서 set -e에 걸려 스크립트가 아무 출력 없이 끝난다.`,
        `curl 에 -f 와 --max-time 없이 상태 코드를 확인하지 않아 500 응답이나 무한 대기를 성공으로 처리한다.`,
        `nvm·pyenv로 설치한 도구를 cron에서 쓰면서 PATH를 지정하지 않아 수동 실행은 되고 예약 실행만 실패한다.`,
        `비멱등 스크립트를 재실행할 때마다 설정 파일에 같은 줄이 계속 추가되거나 이미 존재하는 사용자·디렉터리에서 오류가 난다.`
      ]
    },
    {
      title: `리눅스 서버 기본과 SSH 원격 작업`,
      body: `외주 현장에서 서버는 대개 이미 만들어져 있고 접근 수단은 SSH입니다. 낯선 서버에 들어가 **아무것도 망가뜨리지 않고 상태를 읽는 능력**이 첫 번째 실력입니다.

### 리눅스 서버를 읽는 최소 지도

- 디렉터리: ‹/etc›(설정), ‹/var/log›(로그), ‹/var/lib›(서비스 데이터), ‹/opt›·‹/srv›(수동 설치 앱·서비스 파일), ‹/home›(사용자), ‹/proc›·‹/sys›(커널이 보여 주는 가상 파일).
- 권한: 파일마다 소유자·그룹·기타 세 묶음에 읽기(4)·쓰기(2)·실행(1) 비트가 있고 ‹644›, ‹755›, ‹600›처럼 8진수로 씁니다. 디렉터리의 x는 "안으로 들어가 이름을 찾을 수 있음"입니다. ‹umask 022›이면 새 파일은 644, 새 디렉터리는 755가 됩니다. 서비스는 root가 아닌 전용 계정으로 돌리고 쓰기 권한은 필요한 디렉터리에만 줍니다. ‹chmod 777›은 원인을 모른 채 막힌 것을 뚫는 임시방편이며 거의 항상 보안 결함입니다.
- 읽기 전용 상태 확인: ‹df -h›·‹df -i›(용량·inode), ‹free -h›, ‹ss -ltnp›(열린 포트와 프로세스), ‹ps aux --sort=-%mem | head›, ‹systemctl status 서비스›, ‹journalctl -u 서비스 -n 100 --no-pager›, ‹last›(접속 기록). 깊은 진단은 cs-os 모듈에서 다룹니다.

### SSH의 동작과 키 관리

SSH는 서버의 신원을 **호스트 키**로, 사용자의 신원을 비밀번호나 **공개 키**로 확인한 뒤 암호화된 채널을 엽니다. 공개 키 방식에서는 개인 키(‹~/.ssh/id_ed25519›)가 내 PC에만 있고 공개 키(‹.pub›)를 서버의 ‹~/.ssh/authorized_keys›에 넣습니다. ed25519를 권하고, 개인 키에는 패스프레이즈를 걸고 ‹ssh-agent›로 한 번만 풉니다. 개인 키 파일 권한이 느슨하면 OpenSSH가 사용을 거부하며, 서버 쪽은 ‹~/.ssh›를 700, ‹authorized_keys›를 600으로 두는 것이 안전합니다(sshd_config의 ‹StrictModes›는 기본 yes이며 로그인을 받기 전에 사용자 파일과 홈 디렉터리의 권한·소유자를 검사합니다). 고객마다 키를 **따로** 만들고 계약이 끝나면 서버의 공개 키 삭제를 요청하세요. 개인 키는 메신저로도 보내지 않습니다.

처음 접속할 때 지문을 확인하라는 질문은 중간자 공격 방지 장치입니다. 이후 ‹REMOTE HOST IDENTIFICATION HAS CHANGED›가 나오면 서버가 재설치됐거나 누군가 끼어든 것이므로, ‹known_hosts›의 줄을 지우기 전에 콘솔·클라우드 대시보드처럼 **SSH와 다른 경로로** 지문을 확인받습니다. ‹StrictHostKeyChecking no›는 이 보호를 꺼 버리므로 쓰지 않습니다.

### ~/.ssh/config와 전송·터널

‹Host›별로 ‹HostName›, ‹User›, ‹IdentityFile›, ‹IdentitiesOnly›(설정한 키만 제시), ‹ProxyJump›(점프 서버 경유), ‹ServerAliveInterval›(유휴 연결 유지), ‹ControlMaster›·‹ControlPersist›(연결 재사용)를 정해 두면 ‹ssh acme-app› 한 줄로 끝납니다. 사설망의 DB는 ‹ssh -L 15432:localhost:5432 서버›로 로컬 포트에 연결해 DB 포트를 인터넷에 열지 않고 씁니다. 파일 전송은 ‹scp›보다 ‹rsync -av›가 중단·재개와 변경분 전송에 유리하며, ‹--delete›를 쓸 때는 반드시 ‹-n›(모의 실행)을 먼저 돌립니다. 원본 경로 끝의 슬래시 유무(‹dist/› 대 ‹dist›)가 "내용물"과 "디렉터리 자체"를 가르는 것도 흔한 실수입니다.

### tmux로 연결이 끊겨도 작업 살리기

SSH 연결이 끊기면 그 세션의 프로세스에 HUP이 가서 오래 걸리는 작업이 죽을 수 있습니다. ‹tmux new -s deploy›로 세션을 만들고 ‹Ctrl-b d›로 분리하면 연결이 끊겨도 서버에서 계속 돌고, ‹tmux attach -t deploy›로 다시 붙습니다. 운영에서 상시 돌 것은 tmux가 아니라 systemd 서비스로 만드세요. 접속이 불안하면 ‹ssh -vvv›로 인증 과정을 보고, 방화벽·sshd 설정을 바꿀 때는 두 번째 세션을 열어 둔 채 작업합니다.`,
      code: `# ~/.ssh/config  (chmod 600)
Host bastion-acme
    HostName bastion.acme.example
    User deploy
    IdentityFile ~/.ssh/id_ed25519_acme
    IdentitiesOnly yes
    ServerAliveInterval 30

Host acme-app
    HostName 10.0.1.20
    User deploy
    ProxyJump bastion-acme
    IdentityFile ~/.ssh/id_ed25519_acme
    IdentitiesOnly yes

# 고객 전용 키 생성(패스프레이즈 입력) 후 공개 키만 전달
#   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_acme -C "me@acme-contract-2026"
# 읽기 전용으로 상태 확인
#   ssh acme-app 'df -h /var && systemctl is-active app'
# 배포 파일 동기화: -n 으로 먼저 모의 실행, 슬래시 위치에 주의
#   rsync -avzn --delete ./dist/ acme-app:/srv/app/
# 로컬 15432 -> 서버가 보는 localhost:5432 (DB 포트를 인터넷에 열지 않는다)
#   ssh -N -L 15432:localhost:5432 acme-app   (-N: 원격 명령 없이 터널만 유지)
# 끊겨도 살아남는 세션
#   tmux new -s deploy   (분리: Ctrl-b d, 재접속: tmux attach -t deploy)`,
      codeLang: `bash`,
      key: [
        `낯선 서버에서는 읽기 전용 명령(df, free, ss, systemctl status, journalctl)으로 상태를 먼저 파악하고 바꾸는 명령은 그다음에 한다.`,
        `권한은 소유자/그룹/기타 × rwx 비트의 8진수이며, 서비스는 전용 비root 계정으로 돌리고 키와 설정 파일은 600/700으로 둔다.`,
        `SSH는 서버 신원(호스트 키)과 사용자 신원(내 키)을 따로 검증한다. 고객마다 별도 ed25519 키를 쓰고 계약 종료 때 회수한다.`,
        `~/.ssh/config의 ProxyJump·IdentitiesOnly·ServerAliveInterval·ControlPersist와 -L 포트 포워딩으로 명령을 줄이고 DB 포트는 닫아 둔 채 접근한다.`,
        `긴 작업은 tmux로 분리하고, rsync --delete 는 -n 으로 먼저 확인하며, 상시 서비스는 systemd로 만든다.`
      ],
      pitfalls: [
        `호스트 키 변경 경고에 known_hosts 줄을 바로 지우거나 StrictHostKeyChecking=no 로 우회한다.`,
        `개인 키 하나를 모든 고객에게 쓰고, 계약이 끝나도 서버의 공개 키 삭제를 확인하지 않아 접근 권한이 남는다.`,
        `chmod -R 777 로 권한 오류를 해결하고 원인(소유자·그룹·umask)을 확인하지 않는다.`,
        `rsync --delete 를 모의 실행 없이 돌리고 슬래시를 잘못 붙여 대상 디렉터리의 다른 파일까지 지운다.`
      ]
    },
    {
      title: `Git 내부 구조: 객체, 참조, 인덱스, 팩 파일`,
      body: `Git은 파일 변경 목록을 저장하는 도구가 아니라 **내용으로 주소를 매기는 키-값 저장소 위에 만든 스냅샷 데이터베이스**입니다. 이 구조를 알면 rebase, reset, 시크릿 유출 같은 "왜 이렇게 동작하지?"의 대부분이 한 그림으로 설명됩니다.

### 객체 네 종류

Pro Git 기준으로 저장소의 내용은 객체이고, 이름은 내용에서 계산한 SHA-1 해시(40자리 16진수)입니다. git init 문서는 ‹--object-format=sha256›으로 SHA-256 저장소도 만들 수 있다고 하지만 기본값은 sha1이고 두 형식 저장소 사이에는 상호 운용이 없다고 적습니다(2026-11 확인). 이 모듈은 SHA-1 기준으로 설명합니다.

- **blob**: 파일 내용만 담습니다. 파일 이름이 없습니다.
- **tree**: 디렉터리입니다. 항목마다 모드(‹100644› 일반 파일, ‹100755› 실행 파일, ‹120000› 심볼릭 링크, ‹040000› 디렉터리), 종류, 해시, 이름이 있습니다.
- **commit**: 최상위 tree 하나, 부모 커밋(들), 작성자·커미터와 시각, 메시지입니다.
- **tag**(주석 태그): 대상 객체, 이름, 태그 작성자와 메시지를 담은 객체입니다.

저장 방식은 이렇습니다. 종류, 공백, 바이트 크기, 널 문자 순의 헤더를 내용 앞에 붙여 SHA-1을 계산하고, 같은 바이트열을 zlib으로 압축해 ‹.git/objects/해시 앞 2글자/나머지 38글자›에 저장합니다. 같은 내용은 같은 해시라 한 번만 저장되고, 한 바이트만 달라도 완전히 다른 객체가 됩니다. 커밋은 **diff가 아니라 스냅샷**(tree)을 가리키며, 화면의 diff는 두 tree를 그때그때 비교한 결과입니다.

### 참조, HEAD, 인덱스

해시는 외우기 어려우므로 이름(ref)을 붙입니다. 브랜치는 ‹.git/refs/heads/이름› 파일이고 안에는 커밋 해시 한 줄뿐이라 만들고 지우는 비용이 거의 없습니다. ‹HEAD›는 보통 ‹ref: refs/heads/main›처럼 브랜치를 가리키는 **심볼릭 참조**이고, 태그나 해시를 직접 체크아웃하면 해시가 들어가 detached HEAD가 됩니다. 경량 태그는 커밋을 직접 가리키는 ref이고 주석 태그는 태그 객체를 만든 뒤 그것을 가리킵니다. ‹refs/remotes/origin/main›은 "마지막으로 통신했을 때 원격 브랜치가 있던 곳"의 기록이며 ‹git fetch›가 갱신합니다. **인덱스(스테이징 영역)**는 "다음 커밋이 될 tree의 초안"입니다. 작업 디렉터리 → ‹git add›(인덱스) → ‹git commit›(객체 생성과 ref 이동)의 세 단계는 이 구조의 직접 결과입니다.

### 팩 파일과 가비지 컬렉션

낱개 파일만으로는 비효율적이므로 Git은 비슷한 객체를 델타로 묶은 **packfile**과 위치 색인(‹.idx›)으로 저장하며, 최신 버전을 온전히 두고 이전 버전을 델타로 둡니다. ‹git gc›는 느슨한 객체를 팩으로 묶고, 어디에서도 도달할 수 없는 객체는 유예 기간(‹gc.pruneExpire› 기본 2주)이 지난 뒤 정리합니다. 느슨한 객체가 약 6,700개(‹gc.auto›)를 넘으면 자동 gc가 돌고, reflog 항목은 기본 90일(도달 가능)·30일(도달 불가능) 뒤 만료됩니다(git-gc 문서, 2026-11 확인).

### 이 구조가 설명하는 현상

- **rebase는 커밋을 옮기는 것이 아니라 복제**합니다. 부모가 다르면 해시가 달라지므로 새 커밋이 생기고, 이미 공유된 커밋을 rebase하면 같은 일을 하는 다른 커밋이 공존합니다.
- **브랜치를 지워도 커밋은 남습니다.** reflog와 gc 유예 기간 동안 복구할 수 있습니다.
- **한번 커밋된 시크릿은 객체로 남습니다.** 지운 커밋도 다른 브랜치·태그·포크·클론에 있으면 그대로입니다. 대응의 첫 단계가 키 폐기인 이유입니다(레슨 7).
- **큰 파일은 히스토리에 계속 남습니다.** 나중에 지워도 clone 크기가 줄지 않으므로 처음부터 .gitignore와 대용량 파일 정책(LFS 등)을 정합니다.
- Windows에서는 줄바꿈 변환(‹.gitattributes›의 ‹text eol=lf›)과 대소문자 구분이 "내용은 같은데 변경됨" 현상을 만듭니다.`,
      code: `set -e
git init -q demo && cd demo
git config user.name demo && git config user.email demo@example.com

blob=$(echo 'hello' | git hash-object -w --stdin)        # 1. 내용 -> blob 객체 저장
printf 'blob 6\\0hello\\n' | sha1sum                      #    헤더+내용을 직접 해시: 같은 값
git cat-file -t "$blob"                                   #    blob

git update-index --add --cacheinfo 100644 "$blob" hello.txt   # 2. 인덱스에 등록
tree=$(git write-tree)                                    # 3. 인덱스 -> tree 객체
commit=$(echo 'first' | git commit-tree "$tree")          # 4. tree -> commit 객체
git update-ref refs/heads/main "$commit"                  # 5. 브랜치 = 해시가 든 파일
git symbolic-ref HEAD refs/heads/main                     # 6. HEAD 는 브랜치를 가리키는 참조

git cat-file -p "$commit"       # tree <해시> / author ... / first
cat .git/refs/heads/main        # 커밋 해시 40자리
find .git/objects -type f       # 객체 파일 3개 (blob, tree, commit)
git log --oneline               # porcelain 명령이 같은 데이터를 읽는다`,
      codeLang: `bash`,
      key: [
        `Git 객체는 blob(내용)·tree(디렉터리)·commit(스냅샷+부모+메타)·tag이며, 이름은 "종류 크기 널문자 내용"의 SHA-1이다.`,
        `커밋은 diff가 아니라 스냅샷이고 부모 포인터로 그래프를 이룬다. 같은 내용은 객체 하나로 저장된다.`,
        `브랜치는 커밋 해시 한 줄이 든 refs/heads 파일, HEAD는 브랜치를 가리키는 심볼릭 참조, 인덱스는 다음 커밋의 초안이다.`,
        `팩 파일은 델타 압축이고 gc는 도달 불가능 객체를 유예 기간(기본 2주) 뒤 정리하며 reflog는 기본 90일/30일 뒤 만료된다.`,
        `rebase는 새 커밋을 만들고, 한번 커밋된 시크릿은 객체로 남는다.`
      ],
      pitfalls: [
        `커밋을 diff의 목록으로 이해해서 rebase·cherry-pick 후 해시가 달라지는 이유와 중복 커밋이 생기는 이유를 설명하지 못한다.`,
        `브랜치를 지우거나 reset --hard 한 뒤 커밋이 사라졌다고 단정하고 작업을 다시 한다. reflog와 gc 유예 기간 동안 객체는 남아 있다.`,
        `.gitattributes 없이 Windows(CRLF)와 리눅스 서버를 오가서 셸 스크립트가 실행되지 않는 줄바꿈 문제를 만든다.`,
        `.env나 큰 바이너리를 커밋하고 다음 커밋에서 삭제하면 해결됐다고 믿는다. 이전 커밋의 객체는 그대로 남는다.`
      ]
    },
    {
      title: `Git 히스토리 다루기: reset·rebase·reflog·bisect`,
      body: `일상의 Git 실력은 명령을 많이 아는 것이 아니라 **세 영역과 커밋 그래프에서 지금 무슨 일이 일어나는지 말할 수 있는 것**입니다.

### 세 영역과 reset

Pro Git 기준으로 Git은 HEAD(현재 브랜치의 마지막 커밋), 인덱스(다음 커밋 초안), 작업 디렉터리 세 곳을 오갑니다. ‹git reset›은 먼저 브랜치를 옮기고(‹--soft›는 여기까지), 인덱스를 맞추고(‹--mixed›, 기본값), 작업 디렉터리까지 덮어씁니다(‹--hard›). 데이터를 파괴하는 것은 ‹--hard›뿐이며 커밋하지 않은 변경은 reflog에도 남지 않습니다. 잠시 치울 때는 ‹git stash›(기본은 추적 중인 파일만, 새 파일은 ‹-u›)를 씁니다.

### merge와 rebase

merge는 두 브랜치의 끝을 부모로 하는 새 커밋을 만들어 **실제로 일어난 병렬 작업을 기록**합니다. rebase는 공통 조상 이후의 내 커밋들을 임시로 떼어 대상 위에 하나씩 다시 적용해 **새 커밋 열**을 만들고, 결과 스냅샷은 같지만 히스토리는 선형이 됩니다. 규칙은 하나로 줄어듭니다. **이미 다른 사람이 가져갔을 수 있는 커밋은 rebase하지 않는다.** 내 PR 브랜치를 정리하는 것(‹git rebase -i origin/main›의 pick·squash·fixup·reword·drop, ‹git commit --fixup›과 ‹--autosquash›)은 괜찮고, 공유 브랜치의 재작성은 금지입니다. 공유된 변경을 되돌릴 때는 히스토리를 고치지 않고 ‹git revert›로 되돌리는 새 커밋을 만듭니다(병합 커밋은 ‹-m 1›로 부모를 지정).

### 충돌 해결

충돌은 두 쪽이 같은 줄을 다르게 바꿨을 때 Git이 판단을 포기한 상태이며 파일에 ‹<<<<<<<›, ‹=======›, ‹>>>>>>>› 표식이 들어갑니다. 순서는 ‹git status›로 목록 확인, 양쪽 의도를 읽고 편집(‹merge.conflictStyle diff3›를 켜면 공통 조상 버전도 보임), ‹git add›, ‹git rebase --continue›(또는 merge 커밋)입니다. rebase 중에는 ‹ours›가 내가 올려놓는 대상 브랜치이고 ‹theirs›가 지금 재적용 중인 내 커밋이라 merge와 뜻이 뒤집힙니다. 같은 충돌을 반복해 푸는 장기 브랜치라면 ‹git config --global rerere.enabled true›로 해결을 기억시킵니다. 해결 후에는 반드시 빌드와 테스트를 돌립니다. 표식이 없어도 의미상 충돌은 있을 수 있기 때문입니다.

### 사고 복구: reflog

reflog는 **내 저장소 안에서** 브랜치 끝과 HEAD가 움직인 기록이며 clone·push로 공유되지 않습니다. ‹HEAD@{2}›는 "HEAD가 두 번 전에 있던 곳"입니다. reset --hard나 잘못된 rebase 뒤에는 ‹git reflog›에서 잃은 커밋을 찾아 ‹git branch rescue 해시›로 이름을 붙여 확인합니다(기본 만료 90일/30일).

### 안전한 강제 푸시

rebase 뒤에는 원격과 갈라져 push가 거부됩니다. ‹--force›는 원격에 무엇이 있든 덮어쓰지만 ‹--force-with-lease›는 원격 브랜치가 내가 마지막으로 본 값일 때만 덮어써 동료의 새 커밋을 지켜 줍니다. 다만 편집기나 크론이 백그라운드로 ‹git fetch›를 돌리면 "마지막으로 본 값"이 조용히 갱신되어 보호가 무력화됩니다. 이를 막으려면 ‹--force-if-includes›(원격 추적 브랜치의 끝이 내 로컬 브랜치의 reflog에서 도달 가능한, 즉 내가 통합한 경우에만 허용)를 ‹--force-with-lease›와 함께 쓰거나 기대 값을 명시합니다. 이 옵션은 인자 없는 ‹--force-with-lease›나 ‹=브랜치› 형태에서만 효과가 있고 ‹=브랜치:해시› 형태에서는 아무 일도 하지 않습니다(git-push 문서, 2026-11 확인).

### bisect: 회귀 커밋 이분 탐색

"어제까지 됐는데"는 추측 대신 탐색합니다. ‹git bisect start 나쁜커밋 좋은커밋 --›으로 시작하면 Git이 중간 커밋을 체크아웃하고 판정마다 범위를 절반으로 줄여, 후보가 N개이면 약 log2(N)번 판정합니다(1,000개면 약 10번). ‹git bisect run 명령›은 이를 자동화하며 종료 코드로 판정합니다. 0은 좋음, 1~127(125 제외)은 나쁨, 125는 "판정 불가, 건너뜀", 128 이상은 탐색 중단입니다. 그래서 빌드가 깨지는 커밋은 125로 돌려야 엉뚱한 커밋이 범인으로 지목되지 않습니다. 판정 스크립트와 테스트는 저장소 밖에 두거나 과거 커밋에 없는 테스트를 매번 복사해 넣어야 합니다. ‹git log -S문자열›(그 문자열의 개수가 바뀐 커밋 찾기)과 ‹git blame›은 후보를 좁히는 보조 도구입니다.`,
      code: `# A. 실수 복구: reset --hard 로 커밋 3개를 날렸을 때
git reflog -5                      # HEAD@{1} 등 이전 위치 확인
git branch rescue HEAD@{1}         # 잃은 커밋 끝에 이름을 붙여 우선 안전 확보
git log --oneline rescue -4        # 내용 확인 후 필요하면: git reset --hard rescue

# B. 내 PR 브랜치 정리 후 안전하게 푸시
git fetch origin
git rebase -i origin/main          # pick/squash/fixup/reword 로 커밋 정리
git push --force-with-lease --force-if-includes origin feature/refund

# C. 회귀 커밋 자동 탐색 (판정 스크립트는 저장소 밖에 둔다)
cat > /tmp/judge.sh <<'EOF'
#!/usr/bin/env bash
make -s build >/dev/null 2>&1 || exit 125     # 빌드 불가 커밋은 판정에서 제외
/tmp/orders_regression_test.sh                 # 통과 0, 실패 1
EOF
chmod +x /tmp/judge.sh
git bisect start HEAD v2.3.0 --                # 나쁨(HEAD), 좋음(v2.3.0)
git bisect run /tmp/judge.sh
git bisect log | tail -5                       # 범인 커밋과 탐색 기록
git bisect reset                               # 원래 브랜치로 복귀`,
      codeLang: `bash`,
      key: [
        `reset은 브랜치 → 인덱스 → 작업 디렉터리 순으로 덮어쓴다(--soft/--mixed/--hard). 데이터를 파괴하는 것은 --hard뿐이고 커밋하지 않은 변경은 reflog에도 없다.`,
        `merge는 병렬 작업을 기록하고 rebase는 커밋을 새로 복제해 선형으로 만든다. 공유된 커밋은 rebase하지 않고 revert한다.`,
        `reflog는 로컬 이동 기록(기본 90일/30일 만료)이라 reset --hard·브랜치 삭제 사고의 복구 수단이다.`,
        `--force-with-lease(+ --force-if-includes)는 동료의 푸시를 덮어쓰지 않는 조건부 강제 푸시다.`,
        `bisect run의 종료 코드는 0 좋음, 1~127(125 제외) 나쁨, 125 건너뜀, 128 이상 중단이며 후보 N개에 약 log2(N)번 판정한다.`
      ],
      pitfalls: [
        `공유된 브랜치를 rebase한 뒤 --force로 밀어 동료 커밋을 덮어쓰거나 중복 커밋을 만든다.`,
        `reset --hard 전에 stash나 commit 없이 작업 파일을 날려서 reflog로도 복구하지 못한다.`,
        `bisect 판정 스크립트가 빌드 실패에 1을 반환해 "빌드가 처음 깨진 커밋"이 범인으로 보고된다.`,
        `충돌 표식만 지우고 빌드·테스트 없이 rebase --continue 해서 의미상 충돌을 놓친다.`
      ]
    },
    {
      title: `팀 협업 Git: PR, 보호 규칙, 커밋 규칙, 시크릿, 문서화`,
      body: `혼자 쓰는 Git과 팀·고객이 쓰는 Git의 차이는 **되돌리기 어려운 사고를 규칙으로 막는가**입니다. 공개된 외주 가이드와 판매 페이지(위시켓 블로그, 크몽 상품 페이지, 2026-11 확인)는 소스코드·기술 문서 인수인계와 저장소·서버 접근 권한의 이관을 납품 절차로 다루므로, 협업 규칙은 곧 납품물의 품질입니다.

### 브랜치와 PR 흐름

짧게 사는 기능 브랜치 → PR → 자동 검사(CI) → 리뷰 → 병합이 기본 흐름입니다. 브랜치가 며칠을 넘기면 충돌과 리뷰 부담이 눈덩이처럼 커지므로 PR은 한 가지 목적으로 작게 쪼갭니다. 병합 방식에는 정책이 필요합니다. merge commit은 기록 보존, squash는 PR당 커밋 하나, rebase merge는 선형 유지입니다. GitHub의 "선형 히스토리 요구" 규칙은 merge commit을 막아 squash나 rebase 병합만 허용합니다.

### 보호 규칙과 CODEOWNERS

GitHub 문서 기준으로 보호 브랜치에서 걸 수 있는 규칙은 필수 리뷰(승인 수, 오래된 승인 무효화, 마지막 푸시를 작성자가 아닌 사람이 승인), 필수 상태 검사(‹Require branches to be up to date›를 켜면 엄격 모드), 서명된 커밋 요구, 선형 히스토리, 강제 푸시와 삭제 금지(기본값)입니다. 관리자와 우회 권한이 있는 역할은 기본적으로 예외이므로 "우회 허용 안 함"을 켜야 관리자에게도 적용됩니다. 일부 제한 기능은 요금제에 따라 제공됩니다. ‹CODEOWNERS›(‹.github/›, 루트, ‹docs/› 중 먼저 발견되는 파일)는 gitignore 스타일 경로 패턴과 소유자를 적고, **마지막으로 일치하는 패턴이 우선**하며, 보호 규칙에서 코드 소유자 리뷰를 필수로 켜야 강제됩니다. 해당 파일의 소유자 중 한 명만 승인해도 충족되고, 소유자는 쓰기 권한이 있어야 합니다. CODEOWNERS 파일 자체도 보호 대상으로 두고, 마이그레이션·인프라·결제 코드처럼 사고 비용이 큰 경로에 적용합니다.

### 커밋 메시지, 태그, 릴리스

Conventional Commits 1.0.0은 ‹type(scope): 설명›에 선택적 본문과 푸터를 붙이는 구조입니다. ‹fix›는 SemVer의 PATCH, ‹feat›는 MINOR, ‹!› 표기나 ‹BREAKING CHANGE:› 푸터는 MAJOR 변경을 뜻합니다. 규칙의 가치는 릴리스 노트를 커밋 로그에서 생성하고 ‹git log --grep›으로 찾을 수 있다는 점입니다. 릴리스에는 주석 태그(‹git tag -a v1.4.0 -m …›)를 쓰고 ‹git push origin v1.4.0›으로 올립니다. 경량 태그와 달리 태그 작성자와 메시지가 객체로 기록됩니다.

### 시크릿과 설정

Twelve-Factor App의 설정 원칙은 배포마다 달라지는 값(DB 주소, 자격 증명)을 코드가 아니라 환경 변수에 두라는 것이고, 판단 기준은 "지금 이 저장소를 공개해도 자격 증명이 새지 않는가"입니다. 저장소에는 ‹.env.example›(키 이름과 가짜 값)만 두고 ‹.env›는 ‹.gitignore›에 넣습니다. 이미 시크릿이 커밋됐다면 GitHub secret scanning 문서의 순서대로 **먼저 폐기·교체(rotate)** 합니다. 탐지가 전체 히스토리를 대상으로 하므로 푸시한 순간 노출된 것으로 보고, 키를 폐기한 뒤에는 히스토리 삭제가 시간만 들고 불필요한 경우가 많다고 문서가 설명합니다. 재발 방지는 pre-commit 훅이나 서버 측 push protection으로 합니다.

### 문서화 습관

‹README›(무엇, 실행, 테스트, 배포, 문제 해결), ‹CONTRIBUTING›(브랜치·커밋 규칙, 리뷰 기준), ADR(결정 한 건당 맥락·결정·결과를 한 쪽으로 남긴 기록), ‹CHANGELOG›, 운영 런북은 "내가 떠난 뒤 고객 팀이 혼자 할 수 있는가"의 증거입니다. 인계는 코드만이 아니라 ‹git clone --mirror›로 모든 ref를 담은 백업과 접근 권한 이관 기록까지입니다.`,
      code: `# 저장소 루트에서 실행한다. CODEOWNERS 는 아래에 있을수록 우선한다(마지막 일치 규칙이 적용됨)
mkdir -p .github
cat > .github/CODEOWNERS <<'EOF'
*                  @acme/backend
/migrations/       @acme/dba
/infra/            @acme/platform
/.github/          @acme/platform
EOF

# 커밋 메시지 예 (Conventional Commits)
#   feat(order): 환불 API 추가
#   fix(auth)!: 세션 만료 시간 단위를 초에서 밀리초로 변경
#
#   BREAKING CHANGE: 클라이언트는 expires_in 을 밀리초로 해석해야 한다

# 릴리스: 주석 태그를 만들고 올린다
git switch main && git pull --ff-only
git tag -a v1.4.0 -m "release 1.4.0"
git push origin v1.4.0

# 시크릿 방지: .env 는 무시하고 예시 파일만 추적한다
printf '%s\\n' '.env' '.venv/' '__pycache__/' >> .gitignore
git rm --cached .env 2>/dev/null || true   # 이미 추적 중이면 추적만 해제(히스토리에는 여전히 남는다!)`,
      codeLang: `bash`,
      key: [
        `협업 규칙(PR 크기, 병합 방식, 필수 리뷰·검사, CODEOWNERS)은 되돌리기 어려운 사고를 구조로 막는 장치다.`,
        `보호 브랜치 규칙: 필수 리뷰, 필수 상태 검사(엄격 모드는 최신 상태 요구), 서명 요구, 선형 히스토리, 강제 푸시·삭제 금지. 관리자 우회는 따로 꺼야 한다.`,
        `CODEOWNERS는 마지막 일치 패턴이 우선하고, 코드 소유자 리뷰 필수를 켜야 강제되며 소유자 한 명의 승인이면 충족된다.`,
        `Conventional Commits의 type과 ! 규칙은 SemVer(PATCH/MINOR/MAJOR)와 릴리스 노트 자동화로 이어지고, 릴리스에는 주석 태그를 쓴다.`,
        `시크릿이 커밋되면 폐기·교체가 1순위이고 히스토리 삭제는 그다음이다. 설정은 환경 변수로, 저장소에는 .env.example만 둔다.`
      ],
      pitfalls: [
        `시크릿 커밋 뒤 force push로 지우고 안심한다. 클론·포크·캐시에 남아 있고 키는 여전히 유효하다.`,
        `보호 규칙을 걸고도 관리자 우회를 끄지 않아 관리자 계정(대개 프리랜서 본인)이 규칙을 건너뛰고 직접 푸시할 수 있다.`,
        `거대한 PR을 한 번에 올려 리뷰어가 읽지 않고 승인하고, 병합 방식이 제각각이라 히스토리가 읽을 수 없게 된다.`,
        `납품할 때 저장소를 개인 계정에 둔 채 접근만 열어 주고 끝낸다. 소유권 이전과 권한 회수 기록이 빠진다.`
      ]
    },
    {
      title: `디버깅 습관: 재현, 디버거, 코어 덤프, sanitizer`,
      body: `디버깅은 영감이 아니라 **가설을 하나씩 반증하는 절차**입니다. 같은 버그도 절차가 있는 사람은 한 시간에, 없는 사람은 하루에 풉니다.

### 절차: 재현 → 축소 → 가설 → 관측 → 수정 → 회귀 테스트

1. **재현**: 환경(OS·버전·커밋 해시)과 입력을 적고 명령 한 줄로 실패를 재현합니다. 재현이 안 되면 로그와 지표로 "언제부터, 누구에게만"을 좁힙니다.
2. **축소**: 입력과 코드를 반으로 줄여 가며 실패가 남는 최소 사례를 만듭니다. git bisect는 이 이분 탐색의 시간축 버전입니다.
3. **가설과 관측**: "X라면 Y가 보여야 한다"를 적고 **한 번에 한 가지만** 바꿔 확인합니다. 관측 수단은 출력문, 디버거, 로그 레벨, strace입니다.
4. **수정과 증명**: 증상이 아니라 원인을 고치고 그 버그를 잡는 테스트를 남깁니다. sleep이나 재시도로 가린 수정은 수정이 아닙니다.

### 스택 트레이스 읽기

Python은 가장 최근 호출이 마지막 줄이므로 맨 아래의 예외 종류와 메시지부터 읽고 거슬러 올라갑니다. Java는 맨 위가 예외 발생 위치이고 ‹Caused by:›가 연쇄된 근본 원인이므로 **가장 아래의 Caused by**를 봅니다. 우리 코드가 처음 나오는 프레임이 출발점입니다.

### 로그 기반과 디버거 기반

운영 환경에는 디버거를 붙이기 어려우므로 로그가 관측의 전부입니다. 레벨을 구분하고, 요청 ID를 모든 줄에 붙이고, 비밀번호·토큰·개인정보는 남기지 않습니다. 개발 환경에서는 디버거가 더 빠릅니다. Python은 ‹breakpoint()›(기본은 pdb), IDE는 중단점·조건부 중단점·watch 식을 씁니다. 서버 안 프로세스는 디버그 어댑터(debugpy, Java의 JDWP 등)를 **로컬호스트에만** 열고 ‹ssh -L›로 터널링해 붙입니다. 디버그 포트는 임의 코드 실행 통로이므로 인터넷에 열면 안 됩니다.

### 네이티브 디버거와 코어 덤프

C/C++/Rust는 ‹-g -O0›으로 빌드하고 ‹gdb ./prog›에서 ‹break 파일:줄›, ‹run›, ‹bt›(호출 스택), ‹frame N›, ‹info locals›, ‹print 식›, ‹watch 변수›(값이 바뀌는 순간 정지), ‹next›·‹step›·‹continue›를 씁니다. 이미 죽은 프로그램은 코어 덤프(‹ulimit -c unlimited›, systemd 환경은 ‹coredumpctl›)를 ‹gdb ./prog core›로 열어 죽은 시점의 스택을 부검합니다. 코어 덤프에는 메모리 내용(토큰, 비밀번호)이 들어가므로 외부로 반출하지 않습니다. 최적화(-O2) 빌드는 변수가 사라지고 줄이 건너뛰므로 재현용 빌드는 따로 만듭니다.

### Sanitizer: 컴파일러가 심는 감시자

‹-fsanitize=address›(ASan)는 힙·스택·전역 범위 밖 접근, use-after-free, double free, 누수를 잡습니다. LLVM 문서는 ‹-fsanitize=address›에 더해 합리적인 성능을 위한 ‹-O1› 이상과 읽기 좋은 스택을 위한 ‹-fno-omit-frame-pointer›를 권하고(문서의 예제 명령은 ‹-g›도 붙입니다) 전형적인 속도 저하를 2배로 적습니다. 리포트는 오류 종류와 접근 크기(READ/WRITE), 번호가 붙은 스택 프레임(#0, #1), "할당 영역 안·뒤 N바이트", 그리고 **해제한 위치와 할당한 위치의 스택**을 보여 주므로 위에서 아래로 읽으면 소유권이 어디서 어긋났는지 보입니다. UBSan(UndefinedBehaviorSanitizer)은 ‹-fsanitize=› 뒤에 표준 검사 묶음의 그룹 이름(LLVM UBSan 문서 첫머리의 예제 명령에서 확인)을 주거나 ‹signed-integer-overflow›, ‹null›, ‹shift›처럼 개별 검사를 지정해 부호 있는 정수 오버플로, 널 참조, 잘못된 시프트를 잡습니다. 부호 없는 정수 오버플로는 표준 묶음에 들어 있지 않아 따로 지정해야 하고, ‹UBSAN_OPTIONS=print_stacktrace=1›로 스택을 얻으며 ‹-fno-sanitize-recover=…›를 주면 첫 위반에서 멈춥니다(LLVM 문서, 2026-11 확인). ‹-fsanitize=thread›(TSan)는 데이터 경쟁 탐지용으로 LLVM 문서 기준 5~15배 느리고 메모리를 5~10배 쓰는 개발용 도구이며 ASan과는 따로 빌드합니다. CMU BusTub는 Debug 빌드에서 ASan이 기본으로 켜집니다(README, 2026-11 확인).

### 성능 문제는 추측 말고 프로파일

느림은 ‹perf stat›(총계), ‹perf record›·‹perf report›(샘플링), flame graph로 봅니다. 플레임 그래프의 가로 폭은 샘플에 나타난 비율, 세로는 스택 깊이이며 가로축은 시간이 아닙니다. 폭이 넓은 윗부분이 CPU를 쓰는 곳입니다. 시스템콜 관점은 ‹strace -c›, 자원 관점은 cs-os 모듈의 USE 방법을 봅니다.`,
      code: `// bug.c  --  빌드: gcc -g -O1 -fsanitize=address -fno-omit-frame-pointer bug.c -o bug
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *a = malloc(4 * sizeof(int));        // 16바이트 영역
    for (int i = 0; i <= 4; i++)             // off-by-one: i == 4 에서 영역 밖에 쓴다
        a[i] = i * 10;
    printf("a[3]=%d\\n", a[3]);
    free(a);
    return 0;
}
/* 실행: ./bug -> 아래와 같은 형태의 리포트가 stderr 에 나온다(주소는 매번 다르다)
   ERROR: AddressSanitizer: heap-buffer-overflow on address 0x...
   WRITE of size 4 at 0x... thread T0
       #0 0x... in main bug.c:8
   0x... is located 0 bytes after 16-byte region [0x...,0x...)
   allocated by thread T0 here:
       #0 0x... in malloc
       #1 0x... in main bug.c:6
   읽는 순서: 종류(heap-buffer-overflow) -> 접근한 줄(bug.c:8) -> 할당한 줄(bug.c:6)
   수정: 반복 조건을 i < 4 로 바꾸고 다시 실행해 리포트가 사라지는지 확인한다. */`,
      codeLang: `c`,
      key: [
        `디버깅 절차는 재현(환경·입력·한 줄 명령) → 축소 → 가설 하나씩 → 관측 → 원인 수정 → 회귀 테스트다.`,
        `스택 트레이스는 Python은 맨 아래 줄부터, Java는 가장 아래 Caused by를 근본 원인으로 읽는다.`,
        `운영은 로그(레벨·요청 ID·민감정보 제외), 개발은 디버거(중단점·watch)로 본다. 원격 디버그 포트는 localhost에 두고 SSH 터널로만 접근한다.`,
        `gdb는 -g -O0 빌드에서 break·run·bt·frame·print·watch를 쓰고, 죽은 프로세스는 코어 덤프를 gdb prog core 로 부검한다.`,
        `ASan(-fsanitize=address, 전형적으로 약 2배 느림) 리포트는 오류 종류 → 접근 스택 → 할당·해제 스택 순으로 읽고, UBSan·TSan은 별도 빌드로 쓴다.`
      ],
      pitfalls: [
        `여러 가설을 한꺼번에 바꿔서 어떤 변경이 효과를 냈는지 모른 채 "고쳐졌다"고 보고한다.`,
        `재현 없이 로그만 보고 추측으로 고치거나 sleep·retry로 증상만 가려서 운영에서 재발한다.`,
        `-O2 빌드를 gdb로 보면서 변수가 사라지고 줄이 건너뛰는 것을 버그로 오해한다.`,
        `디버그 포트(JDWP, debugpy)를 0.0.0.0으로 열어 두거나 로그·코어 덤프에 토큰과 개인정보가 그대로 남는다.`
      ]
    },
    {
      title: `빌드, 의존성, 재현 환경, 품질 게이트, 에이전트 산출물 검증`,
      body: `"내 컴퓨터에서는 돼요"를 없애는 마지막 조각은 **빌드와 의존성을 코드로 고정하는 것**입니다. 이 레슨은 빌드 도구, 의존성 잠금, 컨테이너, 품질 게이트, 에이전트 산출물 검증을 한 흐름으로 묶습니다.

### 빌드 시스템

Make는 "타깃: 선행 조건" 규칙과 파일 수정 시각으로 필요한 것만 다시 만듭니다. ‹.PHONY›는 파일이 아닌 작업 이름(test, clean)에 붙이고 레시피 들여쓰기는 탭입니다. CMake는 빌드 파일을 만들어 주는 생성기라서 소스 밖 디렉터리에서 ‹cmake ..›, ‹make -j›로 쓰고 ‹-DCMAKE_BUILD_TYPE=Debug›로 디버그 빌드를 만듭니다(BusTub README의 절차가 이 형태). 언어 생태계마다 대응물이 있습니다. Python은 venv와 pip 또는 uv, Node는 npm·pnpm, JVM은 Gradle·Maven입니다. 팀의 공통 진입점을 ‹make setup›, ‹make check›처럼 짧은 이름으로 감춰 두면 새 사람이 도구 차이를 몰라도 됩니다.

### 의존성: 선언과 잠금

‹requirements.txt›·‹package.json›은 "어떤 범위를 허용하는가"를, 잠금 파일(‹package-lock.json›, ‹uv.lock› 등)은 "정확히 무엇을 설치했는가"를 간접 의존성까지 기록합니다. CI와 배포는 잠금 그대로 설치해야 하므로 ‹npm ci›(잠금 파일이 필수이고 node_modules를 지우고 시작하며 package.json과 어긋나면 실패하고 파일을 고치지 않음)나 ‹uv sync --locked›(잠금이 오래되면 오류) 같은 명령을 씁니다. ‹npm install›은 잠금을 갱신할 수 있습니다. Python venv는 문서 기준으로 소스 관리에 넣지 않는 일회용 폴더이고(스크립트에 절대 경로가 박혀 옮기면 깨질 수 있음) 활성화 없이 ‹.venv/bin/python›을 직접 호출해도 됩니다. 새 의존성은 이름 오타·유사 이름 패키지, 라이선스, 유지 상태를 확인한 뒤 추가하고, 사람이든 AI든 제안받은 패키지를 그대로 설치하지 않습니다.

### 컨테이너와 재현 환경

컨테이너는 파일 시스템과 프로세스 격리를 이용해 **실행 환경 자체를 이미지로 묶습니다.** 개발용 DB·큐를 Compose로 띄우면 "내 PC에 Postgres 설치"가 사라집니다. Dockerfile의 기본 위생은 멀티스테이지 빌드, 최소 베이스 이미지, 버전 고정, ‹.dockerignore›, 비루트 사용자입니다(Docker 문서 요지). WSL2에서는 바인드 마운트 원본이 /mnt/c 위에 있으면 레슨 1의 이유로 느려지기 쉬우므로 리눅스 파일 시스템에 둡니다(실습 1의 스트레치에서 직접 측정). 컨테이너는 호스트 커널을 공유하므로 커널 기능·systemd 실습을 대체하지 못합니다.

### 품질 게이트

포매터(ruff format, prettier 등)는 스타일 논쟁을 없애고, 린터(ruff, ESLint, Checkstyle, ktlint, SpotBugs)는 흔한 결함을 잡고, 테스트 러너(pytest, JUnit)와 타입 검사가 동작을 검증합니다. ‹.editorconfig›는 에디터 설정을 맞춥니다. ‹pre-commit› 훅은 커밋 직전에 이를 돌려 빠른 피드백을 주지만 ‹--no-verify›로 우회되므로 **CI가 최종 게이트**여야 합니다. 오래 걸리는 검사는 훅이 아니라 CI에 둡니다.

### 에이전트 코딩 도구를 쓸 때의 검증 습관

AI 코딩 도구는 일상이 되었습니다. Stack Overflow가 2026-10-06에 발표한 2026 조사 해설은 AI 코딩 도구 사용자의 73%가 매일 쓴다고 전하고, GitHub Octoverse 2026은 2026-09 기준 PR의 40% 이상이 에이전트가 시작한 것이라고 밝혔습니다(둘 다 발표 주체의 자기 보고 수치). 한편 숙련 오픈소스 개발자 16명·246개 과제의 무작위 시험(arXiv 2025-07 초록)에서는 AI를 허용했을 때 완료 시간이 19% 늘었습니다. 다만 METR는 2026-02에 후속 연구가 선택 편향으로 신뢰도가 낮다며 실험 설계를 바꾼다고 밝혔으니 이 수치를 일반 법칙처럼 쓰면 안 됩니다. 속도 이득은 조건에 따라 다르고 검증 비용은 사라지지 않는다는 뜻이며, 프리랜서의 납품물은 누가 썼든 납품자 책임입니다.

- 실패하는 테스트로 **재현을 먼저** 만든 뒤 수정을 맡깁니다.
- 작은 단위로 맡기고 매번 커밋해 ‹git diff›를 전부 읽습니다. 커밋이 작아야 revert와 bisect가 됩니다.
- 테스트를 약화한 흔적(기대값 수정, skip, 광범위한 except), 예상 밖 파일 변경, 새 의존성, 설정·권한 변경을 먼저 봅니다.
- 시크릿·고객 데이터를 프롬프트에 넣지 않고, 에이전트가 쓰는 실행 환경과 자격 증명 권한은 최소로 제한합니다.
- "왜 이렇게 고쳤는가"를 내가 설명할 수 없는 코드는 납품하지 않습니다.`,
      code: `# Makefile  (레시피 접두 문자를 탭 대신 > 로 바꾸는 .RECIPEPREFIX 는 GNU make 기능이다. 관례는 탭)
.RECIPEPREFIX = >
.PHONY: setup lint test check clean

VENV := .venv
PY   := $(VENV)/bin/python

# requirements.txt 가 바뀔 때만 환경을 다시 만든다(수정 시각 기반 재빌드)
setup: $(VENV)/.stamp
$(VENV)/.stamp: requirements.txt
> python3 -m venv $(VENV)
> $(PY) -m pip install -r requirements.txt
> touch $@

lint: setup
> $(PY) -m ruff check .

test: setup
> $(PY) -m pytest -q

check: lint test

clean:
> rm -rf $(VENV) .pytest_cache

# 사용: make setup / make check   (CI 에서도 같은 make check 를 실행한다)
# 전제: requirements.txt 에 ruff 와 pytest 가 들어 있다. venv 활성화 없이 .venv/bin/python 을 직접 부른다.`,
      codeLang: `make`,
      key: [
        `Make는 타깃·선행 조건·수정 시각으로 필요한 것만 다시 빌드하고, CMake는 소스 밖 빌드 디렉터리에 빌드 파일을 생성한다. 팀 진입점은 make setup, make check처럼 고정한다.`,
        `선언(허용 범위)과 잠금(정확한 버전, 간접 의존성 포함)은 다르며 CI·배포는 npm ci, uv sync --locked 처럼 잠금을 지키는 명령을 쓴다.`,
        `venv·node_modules는 일회용이라 커밋하지 않고, 새 의존성은 이름·라이선스·유지 상태를 확인한 뒤 추가한다.`,
        `pre-commit은 빠른 피드백이고 --no-verify로 우회되므로 최종 게이트는 CI다.`,
        `에이전트 산출물은 실패 테스트로 재현부터 시키고, 작은 커밋·전체 diff 읽기·테스트 약화 흔적 확인·권한 최소화로 검증한다.`
      ],
      pitfalls: [
        `잠금 파일 없이 의존성 범위를 느슨하게 두어 어제와 오늘의 설치 결과가 달라진다.`,
        `CI에서 npm install을 써서 잠금이 무시되거나, 개발 중에 몰래 바뀐 잠금 파일을 확인 없이 커밋한다.`,
        `venv, node_modules, .env를 저장소에 커밋한다.`,
        `훅이 느려서 모두 --no-verify를 쓰는데 CI에는 같은 검사가 없다.`
      ]
    },
    {
      title: `통합 사례: 인수받은 저장소를 복원하고 회귀 버그를 잡아 인계하기`,
      body: `의뢰 상황입니다. 물류 스타트업이 퇴사한 개발자가 남긴 Python 백엔드 저장소와 운영 서버(Ubuntu) SSH 계정을 건넸습니다. 요청은 이렇습니다. "지난주 배포 뒤부터 주문 조회 API가 간헐적으로 500을 낸다. 문서는 없고 배포는 서버에서 git pull로 한다. 2주 안에 안정화하고 우리 팀이 이어받게 해 달라." 이 모듈의 도구를 순서대로 쓰는 과정입니다.

### 0단계: 접근과 범위 합의

서면으로 접근 범위(어떤 서버, 읽기 전용 여부, 기간)를 합의하고, 이 고객 전용 ed25519 키를 만들어 공개 키만 전달하며 ‹~/.ssh/config›에 ProxyJump까지 등록합니다. 개인 키와 비밀번호를 메신저로 받지 않습니다. 저장소는 고객 조직 소유로 두고 나는 초대받은 협력자로 일합니다.

### 1단계: 복원 (환경, 셸, Git)

WSL2의 리눅스 파일 시스템 안에서 ‹git clone›, ‹make setup›, ‹make check›를 실행하고 걸린 시간을 기록합니다. 처음 돌려 본 결과가 곧 현재 상태의 진단입니다. 테스트가 없거나 깨져 있으면 그것이 첫 보고 사항입니다. 목표는 "README 없이도 30분"이며, 그 과정에서 알게 된 것을 즉시 README에 적습니다. 처음 보는 환경의 첫 복원은 30분을 넘기는 일이 흔하므로 고객에게 약속하는 시간이 아니라 인계 때 달성할 목표로 둡니다.

### 2단계: 서버 읽기 전용 파악

서버에서 ‹git status›, ‹git log -1›, ‹git diff --stat›로 **서버의 작업 복사본이 저장소와 같은지**(누군가 서버에서 직접 고친 흔적) 확인하고, ‹systemctl status›, ‹journalctl -u app --since "7 days ago"›, ‹df -h›, ‹ss -ltnp›로 상태를 봅니다. 5xx가 난 시각을 로그에서 뽑아 ‹sort | uniq -c›로 시간대와 엔드포인트 분포를 만듭니다. 이 단계에서는 아무것도 바꾸지 않습니다. 서버에서 발견한 로컬 수정이나 노출된 시크릿은 고객에게 알리고 사본을 보관한 뒤에야 정리합니다.

### 3단계: 재현과 이분 탐색

로그에서 실패한 요청을 골라 curl 한 줄로 재현하고, 동시에 20번 호출하면 간헐적으로 500이 난다는 것을 확인했다고 합시다. 이를 실패하는 테스트로 만든 뒤 마지막 정상 배포 지점(태그가 없으면 배포 시각으로 추정한 커밋)부터 HEAD까지 ‹git bisect run›을 돌립니다. 후보가 약 200커밋이면 약 8번 판정이고 판정당 1분이면 10분 안팎에 끝납니다. 판정 스크립트는 저장소 밖에 두고 빌드·수집 오류는 125로 돌려 건너뜁니다. 지목된 커밋을 읽고 스택 트레이스의 Caused by와 디버거로 본 변수 상태로 원인(예: 요청 사이에 공유되는 전역 DB 세션)을 증명합니다.

### 4단계: 수정, PR, 에이전트 사용

수정 브랜치에서 실패 테스트를 먼저 커밋하고(‹test(order): 동시 조회 재현›) 수정 커밋(‹fix(order): 요청별 DB 세션 사용›)을 따로 둡니다. 초안을 AI 에이전트에게 맡겼다면 diff 전체를 읽고, 테스트가 약해지지 않았는지, 새 의존성이 없는지 확인한 뒤 ‹make check›를 직접 실행합니다. PR 본문에는 원인, 재현 방법, 영향 범위, 롤백 방법을 씁니다. 이때 보호 브랜치와 CODEOWNERS를 설정하고, ‹.env›가 커밋된 흔적을 발견하면 키 교체를 먼저 요청합니다.

### 5단계: 배포와 인계

서버에서 ‹git pull›로 하는 배포는 사람의 손이 닿는 만큼 실수 여지가 큽니다. 이번 범위에서는 태그 ‹v1.0.1›을 달고 배포 절차를 스크립트 한 개와 런북으로 문서화하는 데까지만 하고, CI/CD 도입은 별도 견적으로 제안합니다. 인계 패키지는 README(복원 소요 시간 기록), 런북(5xx 시 확인 순서), ADR 1건(DB 세션 관리 방식 결정), 변경 요약, 접근 권한 회수 확인서입니다. 마지막으로 고객 팀원이 새 환경에서 README만 보고 따라 해 보게 하고 막히는 곳을 문서의 결함으로 고칩니다.`,
      code: `#!/usr/bin/env bash
# /tmp/repro.sh : git bisect run 용 판정 스크립트(저장소 밖에 두고 chmod +x 로 실행 권한을 준다)
# 0 = 정상, 1 = 버그 재현, 125 = 이 커밋은 판정 불가(빌드·수집 오류)
make -s setup >/dev/null 2>&1 || exit 125           # 환경 구성이 안 되는 커밋은 건너뜀
cp /tmp/test_orders_concurrent.py tests/ 2>/dev/null || exit 125   # 과거 커밋에는 테스트가 없으므로 복사
.venv/bin/python -m pytest -q -x tests/test_orders_concurrent.py >/dev/null 2>&1
rc=$?
rm -f tests/test_orders_concurrent.py               # 다음 체크아웃을 방해하지 않도록 정리
[ "$rc" -eq 0 ] && exit 0                           # 통과 = 정상
[ "$rc" -eq 1 ] && exit 1                           # 테스트 실패 = 버그
exit 125                                            # 수집 오류·사용법 오류 등은 판정 불가

# 사용 예 (별도 실행):
#   git bisect start HEAD v1.0.0 --
#   git bisect run /tmp/repro.sh
#   git bisect reset`,
      codeLang: `bash`,
      key: [
        `인수 작업의 순서는 접근·범위 합의 → 로컬 복원(시간 기록) → 서버 읽기 전용 파악 → 재현 → 이분 탐색 → 수정 PR → 인계다.`,
        `서버 작업 복사본의 로컬 수정이나 시크릿 노출 같은 발견은 바꾸기 전에 기록하고 고객에게 알린다.`,
        `재현 가능한 실패 테스트가 있으면 bisect run으로 회귀 커밋을 몇 분 안에 찾는다(후보 200개면 약 8번 판정).`,
        `수정은 테스트 커밋 → 수정 커밋으로 나누고 PR에 원인·재현·영향·롤백 방법을 쓴다.`,
        `인계가 끝났다는 증거는 "새 사람이 README만으로 복원하고 검증했다"는 기록이다.`
      ],
      pitfalls: [
        `서버에서 바로 고치고 저장소에 반영하지 않아 서버 사본과 저장소가 계속 어긋난다.`,
        `접근 범위와 권한 회수를 합의하지 않고 시작해서 종료 뒤에도 키와 계정이 남는다.`,
        `재현 없이 "원인 같은" 커밋에 수정을 얹고 회귀 테스트를 남기지 않아 같은 장애가 반복된다.`,
        `문서를 내가 쓰고 나만 검증해서 "내 환경 전용" 절차를 고객에게 인계한다.`
      ]
    }
  ],
  labs: [
    {
      title: `실습 1: 재현 가능한 개발 환경 키트와 파일 시스템 성능 측정`,
      scenario: `새 고객 프로젝트를 시작하는데, 노트북을 포맷해도 30분 안에 같은 환경으로 복구할 수 있어야 합니다. 이전 프리랜서는 "C 드라이브 아래에서 npm install을 돌렸더니 20분 걸렸다"고 말합니다. 본인 PC(Windows는 WSL2, macOS나 Linux는 Ubuntu 24.04 VM 또는 네이티브 리눅스)에서 환경 진단 스크립트와 복원 스크립트를 만들고, 파일 위치에 따른 성능 차이를 숫자로 확인하세요. 모든 작업은 본인 PC에서만 실행하며 고객 서버나 운영 환경에는 하지 않습니다.`,
      steps: [
        `환경을 기록합니다. Windows는 PowerShell에서 wsl --version 과 wsl -l -v 출력을, 리눅스 쪽에서 uname -r 과 /etc/os-release 를 env.txt에 저장합니다. 비 Windows 환경이면 VM의 vCPU와 메모리를 적습니다.`,
        `레슨 1의 env-doctor.sh 를 만들어 실행하고, MISSING과 WARN이 모두 사라질 때까지 apt로 git curl jq make gcc python3 를 설치합니다. WSL에서 git 경로가 /mnt/c 로 시작하면 리눅스용 git을 설치해 우선순위를 바로잡습니다.`,
        `.wslconfig(또는 VM 설정)에서 memory=4GB, processors=2 로 제한합니다. 사양이 부족하면 절반 값을 씁니다. wsl --shutdown 후 다시 접속해 free -m 과 nproc 이 설정에 맞게 바뀐 것을 기록합니다. (WSL에서는 /etc/wsl.conf 의 [boot] systemd=true 도 한 번 켜 보고 systemctl is-system-running 결과를 적습니다.)`,
        `성능 측정: ~/perf-test 와 /mnt/c/Users/내이름/perf-test (비 WSL이면 서로 다른 디스크 위치, 예를 들어 /tmp 와 공유 폴더) 에 같은 스크립트로 1KB 파일 10,000개를 만들고 git init, git add -A, git status 를 각각 time으로 3번씩 재어 중앙값을 표로 만듭니다.`,
        `setup.sh 를 작성합니다. apt 패키지 목록 설치, git 전역 설정(user.name 은 인자로 받기, init.defaultBranch=main, core.autocrlf=input), ~/.ssh 와 config 뼈대 생성(권한 700/600), dotfiles 복사를 포함하고 두 번 실행해도 같은 결과가 되도록(멱등) 만듭니다.`,
        `새 사용자 계정(sudo adduser tester)으로 로그인해 빈 홈 디렉터리에서 setup.sh 를 실행하고 소요 시간을 기록합니다. 가능하면 새 VM에서도 한 번 더 합니다.`,
        `results.md 에 환경 정보, 진단 출력, 위치별 시간 표(중앙값과 비율), 복원 소요 시간, 막혔던 지점을 정리합니다.`
      ],
      accept: [
        `env-doctor.sh 가 MISSING과 WARN 없이 끝나고 그 출력이 results.md 에 첨부되어 있다.`,
        `리소스 제한 전후의 free -m 총 메모리와 nproc 값이 기록되어 있고, 제한 후 값이 설정값의 ±10% 이내이다.`,
        `두 위치의 git status 시간(각 3회의 중앙값)과 비율이 표에 있고, 결과가 예상과 다르면 그대로 기록하며 원인 가설이 한 문장 있다.`,
        `setup.sh 를 연속 두 번 실행해도 오류 없이 끝나고 git config --global --get-all user.name 이 한 줄만 출력된다.`,
        `새 사용자 계정에서 setup.sh 로 복원한 소요 시간이 30분 이내로 기록되어 있다.`
      ],
      stretch: `setup.sh 의 내용을 devcontainer 또는 Dockerfile로 옮겨 컨테이너 안에서도 같은 env-doctor 결과가 나오게 하고, 바인드 마운트 원본이 /mnt/c 일 때와 리눅스 홈일 때의 시간 차이를 추가로 측정하세요.`
    },
    {
      title: `실습 2: Git 내부 해부와 사고 복구 훈련`,
      scenario: `신입 팀원이 "Git은 변경 내역을 저장하는 거죠? reset --hard 하면 끝 아닌가요?"라고 묻습니다. 빈 디렉터리에서 객체를 직접 만들어 구조를 증명하고, 사고 세 가지(커밋 유실, 브랜치 삭제, 강제 푸시 충돌)를 일부러 내어 복구하는 과정을 기록해 팀 교육 자료로 남기세요. 모든 저장소는 로컬 임시 디렉터리에 만들고 실제 고객 저장소에서는 하지 않습니다.`,
      steps: [
        `레슨 5의 plumbing 스크립트를 실행해 blob, tree, commit을 직접 만들고, printf 로 계산한 sha1sum 값이 git hash-object 결과와 같음을 확인합니다. git cat-file -p 로 commit과 tree를 출력하고 .git/objects 아래 객체 파일 3개의 경로를 기록합니다.`,
        `레슨 5의 스크립트는 작업 디렉터리에 파일을 만들지 않으므로 먼저 git restore hello.txt 로 인덱스의 파일을 꺼내고, 이 시점의 git count-objects -v count 값을 적어 둡니다. 그다음 파일 한 줄을 바꿔 일반 명령(git add, git commit)으로 커밋합니다. 커밋 뒤의 count 값과 비교하고, git cat-file -p HEAD^{tree} 로 hello.txt 항목이 새 blob 해시를 가리키는지(이전 커밋의 tree와 비교) 확인합니다. git gc 후 .git/objects/pack 의 파일 목록과 git verify-pack -v 출력 일부를 기록합니다.`,
        `사고 A: 커밋 5개를 만든 뒤 git reset --hard HEAD~3 으로 날리고 git reflog 에서 해시를 찾아 git branch rescue 로 복구합니다. 사고 B: 병합하지 않은 브랜치를 git branch -D 로 지우고 reflog 로 복구합니다. 두 복구에 쓴 명령과 해시를 기록합니다.`,
        `bisect: 30개 커밋(각 커밋은 counter.txt 에 숫자 한 줄 추가)을 만들고 19번째 커밋에서 check.sh 가 실패하도록 파일 하나를 망가뜨립니다(이후 계속 실패). check.sh 는 저장소 밖에 두고 git bisect run 으로 범인을 찾습니다. 별도 실행으로, 일부 커밋에서 check.sh 가 125를 반환하게 만들어 건너뛰기도 확인합니다.`,
        `git init --bare 로 만든 로컬 원격과 두 클론(A, B)으로 동료 시나리오를 만듭니다. A가 feature를 push하고 B가 pull한 뒤 커밋을 push합니다. A는 B의 커밋을 가져오지 않은 채 rebase -i 로 커밋을 정리하고 git push --force-with-lease 를 실행해 거부되는 출력을 확인합니다. git fetch 후 git log origin/feature 로 B의 커밋이 원격에 있음을 보이고, --force 였다면 이 커밋이 사라졌을 것임을 설명합니다.`,
        `rerere: git config rerere.enabled true 로 켭니다. main과 feature가 같은 줄을 다르게 수정하게 만들고 merge 충돌을 푼 뒤 병합 커밋까지 만듭니다. git reset --hard HEAD~1 로 그 병합을 취소하고 같은 브랜치를 다시 merge해서 이전 해결이 자동 적용되었다는 메시지를 확인합니다.`,
        `lab-notes.md 에 단계별 명령, 출력 핵심 줄, 배운 점 한 줄씩을 정리합니다.`
      ],
      accept: [
        `printf 와 sha1sum 으로 계산한 해시와 git hash-object 가 출력한 해시가 같고, .git/objects 아래 객체 파일 경로 3개가 적혀 있다.`,
        `한 줄을 바꿔 커밋한 뒤 count-objects 의 count 값이 정확히 3 증가했고(blob, 루트 tree, commit), 그 이유가 한 문장으로 설명되어 있다.`,
        `사고 A와 B가 모두 reflog에서 찾은 해시로 복구되었고 복구 후 git log --oneline 의 해시 목록이 사고 전과 같다.`,
        `skip 없는 bisect run 이 19번째 커밋을 범인으로 지목했고 판정 횟수가 6회 이하이며 git bisect log 가 첨부되어 있다.`,
        `강제 푸시가 거부된 출력과 그 이유(원격에 내가 보지 못한 커밋이 있음), 그리고 rerere가 해결을 기록하고 자동 적용했다는 두 메시지가 모두 기록되어 있다.`
      ],
      stretch: `가짜 키 문자열(실제 키 아님)을 커밋한 저장소를 만든 뒤 git log -S 로 찾아내고, git filter-repo 같은 히스토리 재작성 도구로 제거해 보세요(GitHub 문서는 --sensitive-data-removal 옵션에 git-filter-repo 2.47 이상이 필요하다고 안내합니다, 2026-11 확인). 재작성 후에도 옛 객체가 reflog와 기존 클론에 남는 경로를 git count-objects 와 git gc --prune=now 결과로 확인하고, 왜 키 폐기가 먼저인지 한 쪽으로 정리합니다.`
    },
    {
      title: `실습 3 (납품형 미니 프로젝트): 인수인계 가능한 저장소 키트와 회귀 버그 보고서`,
      scenario: `고객사가 주문 CSV를 집계하는 작은 사내 도구의 유지보수를 맡기려 합니다. 요구는 세 가지입니다. 새 개발자가 README만 보고 15분 안에 실행하고 테스트할 수 있을 것, 협업 규칙이 저장소 안에 명시될 것, 회귀 버그 1건의 원인 보고서가 있을 것입니다. 본인 PC에 가짜 고객 저장소(acme-orders-tool)를 만들어 고객에게 넘기듯 납품하세요. 시크릿은 반드시 가짜 값만 사용하고 실제 키는 어떤 파일에도 넣지 않습니다.`,
      steps: [
        `CSV를 읽어 일자별 합계를 출력하는 Python 명령줄 도구(orders.py)와 pytest 테스트 5개 이상을 작성합니다. 저장소 루트에는 Makefile(setup, lint, test, check), requirements.txt, .gitignore, .env.example, .gitattributes(*.sh text eol=lf)를 둡니다.`,
        `문서를 작성합니다. README.md(요구 환경, 설치, 실행, 테스트, 문제 해결 3가지), CONTRIBUTING.md(브랜치·커밋 규칙, PR 체크리스트), docs/adr/0001-csv-parser-choice.md, .github/PULL_REQUEST_TEMPLATE.md, .github/CODEOWNERS 를 포함합니다.`,
        `Conventional Commits 형식으로 커밋 15개 이상을 만듭니다. 10번째 커밋은 리팩터링처럼 보이지만 경계 조건(예: <= 를 < 로 변경해 마지막 행 누락)을 깨뜨리는 회귀를 일부러 넣고 그 해시를 따로 적어 둡니다. 이 사실은 보고서를 쓸 때까지 숨깁니다.`,
        `pre-commit 훅을 만들어 (a) 가짜 시크릿 패턴(예: API_KEY= 뒤에 20자 이상)이 스테이징된 커밋을 막고 (b) lint와 빠른 테스트를 돌리게 합니다. 가짜 키로 훅이 막는 출력을 캡처합니다.`,
        `회귀 보고: 실패하는 테스트를 먼저 작성하고, 저장소 밖의 판정 스크립트로 git bisect run 을 돌려 범인을 찾습니다. 범인 커밋에서 breakpoint() 또는 pdb 로 변수를 확인하고, 수정은 fix/ 브랜치에서 테스트 커밋과 수정 커밋으로 나눠 만듭니다. PR 본문(원인, 재현, 영향, 롤백)은 docs/pr-1.md 로 작성합니다.`,
        `협업 시뮬레이션: 두 번째 클론에서 같은 파일의 같은 줄을 수정한 브랜치를 만들어 충돌을 일으키고 해결합니다. 충돌 표식 일부, 선택 이유, 해결 후 검증 명령(make check)을 docs/conflict-log.md 에 기록합니다.`,
        `docs/debug/bug.c(레슨 8)를 ASan으로 빌드해 리포트를 3줄로 해석하고 README의 "디버깅 사례"에 넣습니다. 수정 후 리포트가 사라진 것도 확인합니다.`,
        `주석 태그 v0.1.0, CHANGELOG.md, git clone --mirror 로 만든 인계용 백업을 만듭니다. 새 사용자 계정(또는 새 클론과 새 venv)에서 README만 보고 make check 를 통과시키고 소요 시간을 README 끝에 기록합니다.`
      ],
      accept: [
        `새 계정(또는 새 클론+새 venv)에서 README만으로 make check 가 통과하고 소요 시간이 15분 이하로 기록되어 있다.`,
        `모든 커밋 메시지가 Conventional Commits 형식이어서 아래 검사 명령의 출력이 0이고(git log --oneline | grep -vcE '^[0-9a-f]+ (feat|fix|docs|test|refactor|chore)([(].+[)])?!?: '), 주석 태그 v0.1.0 이 존재한다.`,
        `bisect log 가 첨부되어 있고 지목된 커밋이 의도적으로 넣은 회귀 커밋의 해시와 일치하며 판정 횟수가 5회 이하이다.`,
        `가짜 시크릿 커밋이 훅에 의해 차단된 출력이 있고 git ls-files | grep -c '^.env$' 의 출력이 0이다.`,
        `충돌 해결 기록에 충돌 파일, 선택 근거, 해결 후 make check 통과가 포함되어 있고, ASan 리포트 해석과 수정 후 정상 실행 출력이 README에 있다.`
      ],
      stretch: `GitHub 비공개 저장소에 올려 보호 브랜치(PR 필수, 상태 검사 필수), 코드 소유자 리뷰 필수, make check 를 실행하는 Actions 워크플로를 설정하세요. 관리자 우회를 끈 경우와 켠 경우에 직접 push가 어떻게 달라지는지 확인해 화면 캡처와 함께 점검 결과를 추가합니다.`
    }
  ],
  quiz: [
    {
      q: `[상황] 고객 프로젝트(Node.js)를 Windows C 드라이브에 두고 WSL2 Ubuntu 터미널에서 /mnt/c/work/shop 으로 들어가 작업합니다. npm install이 20분 걸리고 테스트와 파일 변경 감지도 느립니다. 백신 예외는 이미 넣었습니다. 가장 적절한 조치는 무엇입니까?`,
      choices: [
        `WSL1로 되돌린다. 문제의 원인은 WSL2의 가상 머신 구조 자체이므로 버전을 낮추면 해결되고, 프로젝트 위치는 그대로 두어도 된다.`,
        `프로젝트를 리눅스 파일 시스템(~/work/shop)으로 옮기고 VS Code는 WSL 확장으로 연결한다. /mnt/c 는 한 겹을 더 거쳐 작은 파일 작업이 느리다.`,
        `.wslconfig 의 memory 값을 두 배로 늘리고 swap도 키운다. 메모리가 충분해지면 /mnt/c 위의 파일 입출력도 같이 빨라진다.`,
        `WSL 안에서 Windows의 npm.exe 를 호출해 설치한다. 같은 Windows 파일 시스템 위에서 Windows 프로세스가 돌면 변환 비용이 사라진다.`
      ],
      answer: 1,
      why: `Microsoft 문서는 리눅스 도구로 작업할 때 파일을 리눅스 파일 시스템(/home/사용자/...)에 두라고 안내합니다. /mnt/c 는 DrvFs로 마운트된 Windows 드라이브라 리눅스 쪽보다 한 겹을 더 거치고, 파일이 많은 작업에서 그 비용이 누적됩니다. 메모리를 늘려도(C) 이 경로 비용은 사라지지 않고, WSL1로 내리는 것(A)은 원인(파일 위치)을 그대로 둔 채 실제 리눅스 커널을 포기하는 우회이며, Windows 도구를 섞으면(D) 경로·줄바꿈·권한 문제가 추가됩니다.`
    },
    {
      q: `[로그] 동료가 reset --hard 를 실수로 실행한 직후입니다. 사라진 커밋 3개(refund migration, model, endpoint)를 안전하게 되찾고 싶습니다.

$ git reflog
8a4b6c2 HEAD@{0}: reset: moving to HEAD~3
b71d0e4 HEAD@{1}: commit: add refund endpoint
c90aa12 HEAD@{2}: commit: add refund model
5d1e7f3 HEAD@{3}: commit: add refund migration
8a4b6c2 HEAD@{4}: checkout: moving from main to feature/refund

가장 적절한 조치는 무엇입니까?`,
      choices: [
        `git branch rescue b71d0e4 로 잃은 끝 커밋에 이름을 붙여 내용을 확인한 뒤, 맞으면 현재 브랜치를 그 커밋으로 되돌린다.`,
        `git revert HEAD 를 실행한다. reset 을 되돌리는 새 커밋이 만들어지므로 reflog를 뒤질 필요 없이 세 커밋의 내용이 한 번에 돌아온다.`,
        `git reflog expire --expire=now --all 후 git gc 로 정리한다. reflog를 새로 만들고 나면 이전 상태가 깨끗하게 복원된다.`,
        `git checkout -- . 로 작업 디렉터리를 복원한다. reset --hard 가 지운 것은 작업 파일뿐이므로 커밋 그래프에는 손댈 필요가 없다.`
      ],
      answer: 0,
      why: `reflog의 HEAD@{1} 이 reset 직전 끝인 b71d0e4 를 가리키고, 커밋 객체는 gc 유예 기간 동안 남아 있습니다. 이름을 붙여(branch) 두면 안전하게 확인·복구할 수 있습니다. revert HEAD(B)는 현재 HEAD(8a4b6c2)의 변경을 되돌리는 새 커밋이라 잃은 커밋을 가져오지 못하고, expire/gc(C)는 오히려 복구 수단을 지우며, checkout -- .(D)는 인덱스에서 파일을 복원할 뿐 커밋 그래프를 바꾸지 않습니다.`
    },
    {
      q: `[코드] 이 스크립트는 app.log 에 ERROR가 하나도 없는 날 아무 출력 없이 종료 코드 1로 끝납니다. 파일은 존재합니다. 이유는 무엇입니까?

#!/usr/bin/env bash
set -euo pipefail
count=$(grep -c ERROR app.log)
echo "errors: $count"`,
      choices: [
        `set -u 때문에 count 변수가 설정되지 않은 것으로 처리되어 종료한다. 대입이 실패하면 변수가 만들어지지 않기 때문이다.`,
        `grep -c 는 일치가 없으면 아무것도 출력하지 않고 종료 코드 0을 반환하므로 빈 문자열이 대입되고, 그 빈 값 때문에 echo 가 실패해 종료한다.`,
        `grep은 선택된 줄이 없으면 종료 코드 1을 반환하고, 명령 치환을 대입한 문장의 상태가 그 값이 되어 set -e 가 스크립트를 종료시킨다.`,
        `pipefail 이 켜져 있어 grep의 표준 출력이 닫히면서 SIGPIPE를 받아 종료한다. 이 설정은 명령 치환 안에서도 파이프처럼 동작한다.`
      ],
      answer: 2,
      why: `GNU grep은 일치하는 줄이 없으면 -c 로 0을 출력하더라도 종료 코드 1을 돌려줍니다. 변수 대입에서는 명령 치환의 종료 코드가 문장 전체의 상태가 되므로 set -e 가 echo 전에 스크립트를 끝냅니다. 의도된 실패는 count=$(grep -c ERROR app.log || true) 로 표시합니다. -u(A)는 설정되지 않은 변수를 확장할 때만 오류를 내는데 이 스크립트는 count를 확장하는 줄에 도달하지도 못하고, 파이프가 없으니 pipefail과 SIGPIPE(D)도 무관하며, grep이 일치 없음에 0을 돌려준다는 전제(B)는 사실과 반대입니다.`
    },
    {
      q: `[로그] 수동 실행은 되는데 cron에서만 실패합니다.

# crontab -l
*/10 * * * * /home/deploy/bin/sync-report.sh >> /var/log/sync.log 2>&1

# /var/log/sync.log
/home/deploy/bin/sync-report.sh: line 4: node: command not found

(node는 deploy 사용자가 nvm으로 설치했고 ~/.bashrc 에서 PATH에 추가됩니다.) 가장 적절한 수정은 무엇입니까?`,
      choices: [
        `스크립트 첫 줄을 #!/bin/sh 로 바꾼다. sh는 bash보다 PATH 탐색 범위가 넓어 사용자가 설치한 도구도 찾는다.`,
        `cron 서비스를 재시작한다. 재시작하면 deploy 사용자의 셸 환경을 새로 읽어 nvm이 추가한 PATH도 함께 반영된다.`,
        `crontab 대신 ~/.bashrc 에 같은 명령을 넣어 셸이 열릴 때마다 실행한다. 그러면 PATH가 이미 설정된 상태로 돈다.`,
        `cron은 ~/.bashrc 를 읽지 않고 PATH도 최소이므로, 스크립트에서 PATH를 명시하거나 node를 절대 경로로 호출한다.`
      ],
      answer: 3,
      why: `cron은 대화형 로그인 셸의 시작 파일을 읽지 않고 최소한의 환경으로 실행하므로 nvm이 PATH에 추가한 경로를 모릅니다. 절대 경로나 PATH 명시가 정석입니다. sh로 바꾸거나(A) cron을 재시작해도(B) 시작 파일은 읽히지 않고, .bashrc 에 넣는 것(C)은 예약 실행이 아니라 셸을 여는 때마다 실행되는 전혀 다른 동작입니다.`
    },
    {
      q: `[상황] 3개월 만에 고객 서버에 접속하자 아래 경고가 나오고 접속이 거부됩니다. 고객 담당자는 "서버를 재설치한 적은 없는 것 같다"고 합니다.

@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Offending ECDSA key in /home/me/.ssh/known_hosts:12

가장 적절한 대응은 무엇입니까?`,
      choices: [
        `고객에게 콘솔·클라우드 대시보드처럼 SSH와 다른 경로로 현재 호스트 키 지문을 확인받고, 일치할 때만 known_hosts 12번 줄을 지우고 다시 접속한다.`,
        `ssh-keygen -R 로 known_hosts 의 해당 줄을 지우고 새 지문 질문에 바로 yes 한다. 이런 경고는 대개 서버 재설치나 IP 재할당 때문에 생긴다.`,
        `-o StrictHostKeyChecking=no 로 이번 한 번만 접속해 작업을 끝낸다. 통신은 여전히 암호화되므로 상대가 누구든 내용이 새지 않는다.`,
        `내 개인 키를 새로 만들어 서버의 authorized_keys 에 다시 등록한다. 이 경고는 서버가 내 키를 거부했다는 뜻이므로 사용자 키 문제다.`
      ],
      answer: 0,
      why: `호스트 키는 서버의 신원을 증명하며, 바뀌었다면 재설치일 수도 있지만 중간자 공격일 수도 있습니다. 구분하려면 별도 경로로 지문을 확인해야 합니다. 줄을 바로 지우고 yes 하거나(B) 검사를 끄면(C) 정확히 그 보호를 포기하고, 암호화가 유지돼도 상대가 공격자일 수 있습니다. 이 경고는 사용자 키가 아니라 서버 키에 관한 것입니다(D).`
    },
    {
      q: `[상황] 내 PR 브랜치 feature/invoice 의 커밋을 git rebase -i origin/main 으로 정리했더니 push가 거부됩니다. 이 브랜치는 내가 만들었고 보통 나만 쓰지만, 리뷰어가 제안 커밋을 올렸을 수도 있습니다. 가장 안전한 방법은 무엇입니까?`,
      choices: [
        `git push --force origin feature/invoice. 내가 만든 브랜치이므로 원격 내용을 덮어써도 잃을 것이 없고 가장 단순하다.`,
        `git push --force-with-lease --force-if-includes origin feature/invoice. 통합하지 않은 원격 커밋이 있으면 거부된다.`,
        `먼저 git fetch 를 한 뒤 --force-with-lease 만 사용한다. 원격 상태를 방금 받았으므로 리뷰어 커밋을 덮어쓸 일이 없다.`,
        `git pull 로 원격을 merge한 뒤 push 한다. 새 merge 커밋이 생기지만 force 없이 거부를 피하고 리뷰어 커밋도 보존한다.`
      ],
      answer: 1,
      why: `--force-with-lease 는 원격이 내가 마지막으로 본 값일 때만 덮어쓰고, --force-if-includes 는 원격 추적 브랜치의 끝이 내 로컬 브랜치 이력에 통합된 경우에만 허용합니다. 단순 fetch 뒤 lease 만 쓰면(C) fetch가 추적 참조를 갱신해서 통합하지 않은 리뷰어 커밋도 덮어쓰며 통과할 수 있습니다. --force(A)는 무조건 덮어쓰고, pull merge(D)는 rebase 이전의 옛 커밋을 되살려 중복 커밋을 만듭니다.`
    },
    {
      q: `[코드] 회귀를 찾으려고 아래처럼 bisect를 돌렸더니, 범인으로 코드를 전혀 건드리지 않은 'chore: bump build tool to 3.0' 커밋이 지목되었습니다.

git bisect start HEAD v2.3.0 --
git bisect run sh -c './build.sh && pytest -q tests/test_orders.py'

(build.sh 는 실패 시 종료 코드 2를 반환하고, v2.3.0 이후 일부 커밋은 빌드 도구 버전 불일치로 빌드에 실패합니다.) 원인과 수정은 무엇입니까?`,
      choices: [
        `bisect run 은 sh -c 같은 셸 래퍼를 지원하지 않아 종료 코드가 전달되지 않는다. 별도 스크립트 파일로 만들어야 판정이 정확해진다.`,
        `bisect 는 병합 커밋을 판정하지 못해 엉뚱한 커밋을 고른다. 선형 히스토리가 아니면 --first-parent 없이는 쓸 수 없다.`,
        `빌드 실패(종료 코드 2)가 1~127 범위라 "나쁨"으로 기록되었다. 빌드 불가 커밋은 125로 종료해 건너뛰게 한다(./build.sh || exit 125).`,
        `good 으로 지정한 v2.3.0 이 틀렸다. 정상이 확실한 가장 최근 태그를 좋음으로 지정해야 범인이 정확히 나오고, 오래된 태그는 탐색 범위만 늘린다.`
      ],
      answer: 2,
      why: `git bisect run 은 0이면 좋음, 1~127(125 제외)이면 나쁨, 125이면 건너뜀으로 해석합니다. 빌드 실패가 2를 반환하니 "버그 있음"으로 기록되어 빌드가 처음 깨진 커밋이 범인으로 지목됩니다. 빌드 불가는 125로 돌려야 합니다. sh -c 는 정상적으로 쓸 수 있고(A), --first-parent 는 병합 브랜치 문제를 다루는 선택 옵션이며 이 증상의 원인이 아니고(B), 좋음 기준을 최근으로 옮기면 회귀가 범위 밖이 될 수 있습니다(D).`
    },
    {
      q: `[상황] 클라이언트의 비공개 GitHub 저장소에 DB 비밀번호가 담긴 .env 가 3일 전 커밋·푸시된 것을 발견했습니다. 고객은 "히스토리를 지워서 해결해 달라"고 요청합니다. 가장 먼저 할 일은 무엇입니까?`,
      choices: [
        `git rm .env 로 지우는 커밋을 올리고 .gitignore 에 추가한다. 최신 커밋에서 파일이 사라지면 이후의 노출은 끝난다.`,
        `main에 git push --force 로 해당 커밋을 제거하고 팀에 다시 clone 하라고 공지한다. 원격에서 사라지면 접근할 방법도 사라진다.`,
        `저장소를 삭제하고 새로 만든다. 새 저장소의 히스토리에는 비밀번호가 없으므로 이전 노출은 더 이상 문제가 되지 않는다.`,
        `DB 비밀번호를 즉시 교체(폐기)하고 노출 기간의 접속 기록을 점검한 뒤, 필요하면 히스토리 정리는 별도 작업으로 진행한다.`
      ],
      answer: 3,
      why: `비밀번호가 한 번이라도 푸시되었다면 이미 노출된 것으로 보고 즉시 폐기·교체하는 것이 1순위입니다. GitHub 문서(secret scanning 소개, 2026-11 확인)도 자격 증명을 바로 교체하라고 하고, 이미 폐기한 뒤라면 히스토리 제거가 시간이 많이 들고 불필요한 경우가 많다고 설명합니다. 삭제 커밋(A)은 이전 커밋에 남고, force push(B)와 저장소 재생성(C)은 이미 만들어진 클론·포크·캐시의 복사본과 여전히 유효한 비밀번호를 해결하지 못합니다.`
    },
    {
      q: `[로그] 장바구니 서비스(C)를 ASan 빌드로 돌렸더니 아래 리포트가 나왔습니다. 가장 먼저 의심할 곳은 어디입니까?

==4217==ERROR: AddressSanitizer: heap-use-after-free on address 0x602000000010
READ of size 4 at 0x602000000010 thread T0
    #0 0x55d1c3b2a1f7 in print_total report.c:42
    #1 0x55d1c3b2a2c4 in main report.c:61
0x602000000010 is located 0 bytes inside of 16-byte region [0x602000000010,0x602000000020)
freed by thread T0 here:
    #0 0x7f3a1c0b2e0f in free
    #1 0x55d1c3b2a0a3 in reset_cart cart.c:30
previously allocated by thread T0 here:
    #0 0x7f3a1c0b3a1f in malloc
    #1 0x55d1c3b29f6d in new_cart cart.c:12`,
      choices: [
        `new_cart(cart.c:12)가 구조체보다 작은 16바이트를 할당했다. 요구보다 작게 잡은 할당 크기를 키우면 오류가 사라진다.`,
        `reset_cart(cart.c:30)가 해제한 메모리를 print_total(report.c:42)이 읽는다. 해제 뒤에도 쥐고 있는 포인터의 수명 문제이므로 두 위치를 본다.`,
        `print_total이 배열 끝을 넘어 읽는 경계 오류다. 읽는 위치(report.c:42 근처)의 반복문 상한을 한 칸 줄이면 리포트가 사라진다.`,
        `free와 read가 겹쳐 일어난 두 스레드의 데이터 경쟁이므로 ASan 리포트만으로는 알 수 없고 TSan 빌드로 다시 확인해야 한다.`
      ],
      answer: 1,
      why: `오류 종류가 heap-use-after-free이고 접근 위치가 영역 "안 0바이트"이므로 범위를 넘은 읽기가 아닙니다. 리포트는 해제한 곳(reset_cart)과 읽은 곳(print_total)을 직접 알려 주므로 두 곳의 수명 관계를 보면 됩니다. 크기 부족(A)이나 경계 오류(C)였다면 heap-buffer-overflow로 나오고, 모든 스택이 thread T0 하나라 데이터 경쟁(D)의 근거도 없습니다.`
    },
    {
      q: `[상황] 고객 저장소의 실패하던 테스트 test_refund_amount 를 AI 에이전트에게 고치게 했더니 "all tests passed"라고 보고합니다. git diff --stat 를 보니 src 파일 하나와 tests 파일 하나가 바뀌었는데, tests의 변경은 assert amount == 1200 을 assert amount in (1200, 1320) 으로 바꾼 것입니다. 어떻게 하시겠습니까?`,
      choices: [
        `테스트 변경을 되돌려 원래 기대값(1200)으로 실패를 재현하고 src 수정이 만족하는지 본다. 기대값 변경은 고객 요구사항으로 정당화한다.`,
        `테스트가 통과했으니 그대로 병합한다. 에이전트가 이미 테스트를 돌려 확인했고, 문제가 생기면 배포 뒤 모니터링과 롤백으로 대응하면 된다.`,
        `tests 변경은 보통 단순한 정리이므로 src 변경만 꼼꼼히 리뷰하고, 테스트 파일은 통과 여부만 확인하면 충분하다.`,
        `에이전트에게 같은 작업을 새 세션에서 다시 시켜 두 결과가 같으면 신뢰한다. 서로 독립적인 두 번의 일치는 충분한 검증이다.`
      ],
      answer: 0,
      why: `기대값을 느슨하게 바꿔 통과시킨 것은 테스트 약화의 전형적 흔적이며, 통과 보고는 정답이라는 증거가 되지 못합니다. 원래 기대값으로 재현하고 요구사항으로 판단해야 합니다. 보고를 믿고 병합(B)하면 고객 환불 금액 오류가 운영으로 가고, tests 변경을 리뷰하지 않는 것(C)과 재실행 결과의 일치(D)는 같은 오류를 반복해도 일치하므로 검증이 아닙니다.`
    },
    {
      q: `[로그] Windows 에서 편집한 배포 스크립트를 Git으로 서버(Ubuntu)에 올려 실행하자 아래 오류가 납니다.

$ ./deploy.sh
/usr/bin/env: 'bash\\r': No such file or directory

파일은 존재하고 실행 권한도 있습니다. 가장 정확한 원인과 영구 대책은 무엇입니까?`,
      choices: [
        `실행 권한 비트가 Windows를 거치며 사라져 셸이 파일을 실행하지 못한다. 서버에서 chmod +x 를 다시 해 주면 영구적으로 해결된다.`,
        `서버에 bash 인터프리터가 설치되어 있지 않아 env가 찾지 못한다. apt로 bash를 설치하면 스크립트가 정상 실행된다.`,
        `줄바꿈이 CRLF라서 shebang이 CR이 붙은 bash를 찾는다. .gitattributes 에 *.sh text eol=lf 로 LF를 고정한다.`,
        `env 명령이 /usr/bin 에 없어 실행되지 않는다. shebang을 #!/bin/env bash 로 바꾸면 경로 문제가 해결된다.`
      ],
      answer: 2,
      why: `오류 메시지가 찾지 못한 이름이 bash 뒤에 \\r(CR)이 붙은 값이므로 CRLF 줄바꿈이 원인입니다. gitattributes의 text eol=lf 는 체크아웃되는 줄바꿈을 LF로 고정해 재발을 막습니다. 실행 권한 문제라면 Permission denied가 나오고(A), bash가 없다면 이름에 CR이 붙지 않으며(B), 오류 메시지의 첫 부분이 /usr/bin/env 의 출력이므로 env는 존재합니다(D).`
    },
    {
      q: `[상황] 고객 저장소에서 "결제 취소 금액이 틀린다"는 회귀가 보고되었습니다. 6개월 전 릴리스 태그(정상)와 현재 HEAD(오류) 사이에 선형 커밋이 약 1,000개 있고, 재현 테스트는 빌드를 포함해 1회 약 40초이며 스크립트로 자동화할 수 있습니다. 가장 효율적인 접근과 대략의 소요 시간은 무엇입니까?`,
      choices: [
        `최근 커밋부터 하나씩 거꾸로 체크아웃해 직접 테스트한다. 평균 500회, 약 5시간이 들지만 어떤 경우에도 결과가 확실하다.`,
        `git blame 으로 결제 모듈 전체를 읽으며 의심 줄을 찾는다. 소요 시간은 예측할 수 없지만 코드를 이해하므로 항상 가장 빠르다.`,
        `git bisect 를 수동으로 돌린다. 후보 1,000개에 약 100번 판정이 필요하고 매번 40초이므로 약 70분이 걸리지만 가장 안전하다.`,
        `git bisect run 으로 재현 테스트를 자동 판정시킨다. 후보 약 1,000개면 약 10번 판정이라 대략 7분(10회 x 40초)이다.`
      ],
      answer: 3,
      why: `이분 탐색은 후보를 절반씩 줄이므로 1,000개면 약 10번이고, 40초 x 10회는 7분 안팎입니다. 순차 탐색(A)은 평균 수백 번이고, blame(B)은 어느 줄이 마지막으로 바뀌었는지만 알려 줄 뿐 회귀 시점과 직접 연결되지 않으며 항상 빠르지도 않습니다. 수동 bisect도 약 10번이고(C) run 으로 자동화할 수 있으므로 100번이라는 전제가 틀렸습니다.`
    }
  ],
  refs: [
    {
      title: `The Missing Semester of Your CS Education (MIT, 2026)`,
      url: `https://missing.csail.mit.edu/`,
      kind: `course`,
      why: `셸, 커맨드라인 환경, 개발 환경·도구, 디버깅·프로파일링, Git, 패키징, 에이전트 코딩, Beyond the Code, 코드 품질의 9강으로 이루어진 공개 강좌(2026-01-12~23 IAP 개설분, CC BY-NC-SA, 2026-11 확인). 이 모듈 전체의 보조 교재로 강의 노트를 읽는다.`
    },
    {
      title: `Pro Git: Git Internals - Git Objects`,
      url: `https://git-scm.com/book/en/v2/Git-Internals-Git-Objects`,
      kind: `book`,
      why: `blob·tree·commit 객체, 헤더를 붙인 SHA-1 계산, .git/objects 경로, hash-object·cat-file·commit-tree를 직접 실행하며 보여 주는 장. 레슨 5와 실습 2의 정독 자료.`
    },
    {
      title: `Pro Git: Git Branching - Rebasing`,
      url: `https://git-scm.com/book/en/v2/Git-Branching-Rebasing`,
      kind: `book`,
      why: `rebase가 공통 조상 이후의 패치를 새 커밋으로 다시 적용하는 과정과 "공유된 커밋은 rebase하지 않는다"는 규칙의 근거, merge와의 트레이드오프를 설명한다.`
    },
    {
      title: `Pro Git: Git Tools - Reset Demystified`,
      url: `https://git-scm.com/book/en/v2/Git-Tools-Reset-Demystified`,
      kind: `book`,
      why: `HEAD·인덱스·작업 디렉터리 세 영역을 기준으로 reset --soft/--mixed/--hard와 checkout의 차이를 표로 정리한 장. 데이터가 사라지는 경우를 정확히 구분한다.`
    },
    {
      title: `git-bisect documentation`,
      url: `https://git-scm.com/docs/git-bisect`,
      kind: `doc`,
      why: `bisect start·good·bad·skip·run과 run의 종료 코드 규칙(0 좋음, 1~127 중 125 제외 나쁨, 125 건너뜀, 그 밖의 코드는 128 이상을 포함해 탐색 중단)이 정의된 공식 문서. 판정 스크립트 설계의 기준.`
    },
    {
      title: `git-push documentation: --force-with-lease and --force-if-includes`,
      url: `https://git-scm.com/docs/git-push`,
      kind: `doc`,
      why: `조건부 강제 푸시의 세 가지 형태와 백그라운드 fetch가 보호를 무력화하는 경우, --force-if-includes의 보완 방식을 설명한다. 히스토리를 다시 쓴 뒤 푸시하는 절차의 기준 문서.`
    },
    {
      title: `Microsoft Learn: Working across file systems (WSL)`,
      url: `https://learn.microsoft.com/en-us/windows/wsl/filesystems`,
      kind: `doc`,
      why: `리눅스 도구로 작업할 때 파일을 어느 파일 시스템에 둘지, /mnt/c의 의미, Windows와 리눅스 명령의 상호 호출, WSLENV를 설명한다(문서 갱신 2026-06 표기). 레슨 1과 실습 1의 근거.`
    },
    {
      title: `Microsoft Learn: Advanced settings configuration in WSL`,
      url: `https://learn.microsoft.com/en-us/windows/wsl/wsl-config`,
      kind: `doc`,
      why: `.wslconfig(전역, VM 자원)와 wsl.conf(배포판별)의 차이, systemd 활성화, memory·processors·swap 기본값, 네트워킹 모드를 정리한 문서(2026-10 갱신 표기). 설정 변경 후 wsl --shutdown이 필요한 이유도 있다.`
    },
    {
      title: `CMU BusTub README`,
      url: `https://github.com/cmu-db/bustub`,
      kind: `doc`,
      why: `Ubuntu 24.04 권장과 WSL 비지원, cmake/make 빌드 절차, Debug 빌드에서 ASan 기본 활성화를 밝힌 교육용 DBMS 저장소. 수업 과제가 환경을 지정하는 실제 사례로 읽는다(2026-11 확인).`
    },
    {
      title: `Clang AddressSanitizer documentation`,
      url: `https://clang.llvm.org/docs/AddressSanitizer.html`,
      kind: `doc`,
      why: `-fsanitize=address와 함께 쓰는 -O1 이상·-fno-omit-frame-pointer 권장, 탐지하는 오류 종류(힙·스택·전역 범위 밖 접근, use-after-free, double free 등), 전형적 2배 속도 저하, ASAN_OPTIONS, 리포트의 구성(오류 종류·접근 스택·할당/해제 위치)을 다룬다. 레슨 8의 기준 문서.`
    },
    {
      title: `OpenBSD ssh_config(5) manual`,
      url: `https://man.openbsd.org/ssh_config`,
      kind: `doc`,
      why: `Host, HostName, IdentityFile, IdentitiesOnly, ProxyJump, ServerAliveInterval, ControlMaster·ControlPersist, StrictHostKeyChecking 등 ~/.ssh/config 지시어의 정확한 의미를 확인하는 매뉴얼.`
    },
    {
      title: `GitHub Docs: About protected branches`,
      url: `https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches`,
      kind: `doc`,
      why: `필수 리뷰(오래된 승인 무효화, 마지막 푸시를 작성자가 아닌 사람이 승인), 필수 상태 검사(엄격 모드), 서명된 커밋, 선형 히스토리, 강제 푸시·삭제 기본 금지, 관리자·우회 권한 역할의 기본 예외와 "우회 불허" 옵션, 푸시 제한 기능의 요금제 조건을 설명한다. 협업 규칙을 고객 저장소에 적용할 때의 기준(2026-11 확인).`
    },
    {
      title: `GitHub Docs: About code owners`,
      url: `https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners`,
      kind: `doc`,
      why: `CODEOWNERS 파일 위치, gitignore 스타일 패턴, 마지막 일치 규칙 우선, 필수 코드 소유자 리뷰와의 연동, 지원하지 않는 패턴 문법을 정리한다.`
    },
    {
      title: `GNU Bash Reference Manual: The Set Builtin`,
      url: `https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html`,
      kind: `doc`,
      why: `set -e(errexit)가 무시되는 문맥(while·until 조건, if 검사, &&·|| 목록의 마지막이 아닌 명령, 파이프의 마지막이 아닌 단계, ! 반전)과 함수 안에서의 동작, pipefail·-u(nounset)의 정확한 의미를 정의한 공식 매뉴얼. 레슨 3의 "set -euo pipefail은 안전망일 뿐"이라는 주장을 직접 읽어 확인한다.`
    }
  ],
  gigs: [
    `고객은 대개 "개발 환경 세팅"을 1~2시간짜리 일로 가정하고 "문서는 없지만 코드를 보면 알 것"이라고 말합니다. 견적 전에 확인할 것: 배포 대상 OS·배포판, 접근 방식(SSH 키, VPN, 점프 서버)과 접근 가능한 범위, 저장소 호스팅과 소유권(고객 조직인지 퇴사자 개인 계정인지), 브랜치 전략과 배포 방식(서버에서 git pull인지 CI/CD인지), 기존 테스트·CI 유무, 시크릿 보관 방식, 빌드가 지금 실제로 되는지. 확인 전에는 고정가를 약속하지 말고 "인수·진단"을 1~3일짜리 단계로 분리해 먼저 견적합니다(경험치이며 환경에 따라 크게 다름). 단가 참고선으로 한국인공지능·소프트웨어산업협회(KOSA)가 공표한 2026년 적용 SW기술자 일 평균임금 414,762원(전 직무 평균, 고용주 부담분 포함 인건비 기준, 2026-11 확인)과 크몽 가격 가이드의 백엔드 최소·평균·최대 5만/46만/140만 원 이상(2025-09-17 게시, 플랫폼 자체 콘텐츠)이 있고 이 값을 본인 경력과 책임 범위에 맞춰 조정합니다.`,
    `납품물은 코드만이 아닙니다. 복원 스크립트(setup.sh, make setup/check), README(요구 환경, 실행, 테스트, 문제 해결, 복원 소요 시간 기록), CONTRIBUTING, PR 템플릿, CODEOWNERS, .env.example, 런북, ADR, 릴리스 태그와 CHANGELOG, git clone --mirror 백업, 접근 권한 이관·회수 체크리스트를 인수 시험 기록(새 사람이 README만으로 복원한 시간)과 함께 넘깁니다. 한국 외주 가이드 글(위시켓 블로그)도 요구사항 정리, 견적, 계약, 마일스톤, 인수인계를 절차로 설명하므로 인수 기준을 계약서의 완료 조건에 숫자와 증거로 적어 두면 분쟁이 줄어듭니다.`,
    `접근 권한과 보안은 계약 사항입니다. 서면으로 서버·저장소·클라우드 접근 범위와 기간을 합의하고, 고객마다 별도 SSH 키를 만들어 공개 키만 전달하며, 종료 시 계정·키 회수를 확인합니다. 개인 키·비밀번호를 메신저로 주고받지 않고, 코어 덤프·로그·DB 덤프는 개인정보와 토큰이 들어 있을 수 있어 고객 환경 밖으로 반출하지 않습니다. 작업 중 시크릿 노출이나 서버 위 직접 수정 같은 발견은 바꾸기 전에 기록해 고객에게 알리고, 키 폐기는 고객(권한 보유자)이 하도록 요청합니다. 이 모듈의 범위는 방어적 점검과 운영 개선이며, 침투 테스트는 별도 계약과 승인 없이 하지 않습니다.`,
    `전형적인 함정: 서버에서 누군가 직접 고친 코드와 저장소의 불일치, 문서·테스트 없는 레거시, Windows의 CRLF와 대소문자 차이로 생기는 배포 오류, 공유 브랜치 강제 푸시, 시크릿 커밋 후 히스토리만 지우고 키는 방치, 운영 서버에 strace·perf·디버거를 오래 붙임, 디버그 포트를 인터넷에 개방, 고객 요청 없이 전역 설정(권한, cron, sysctl)을 변경. 첫 복원은 처음 보는 환경에서 30분을 넘기는 일이 흔하므로 환경 복원 시간에는 버퍼(경험치로 20~30% 이상)를 두고, "30분 복원"은 약속이 아니라 인계 시점의 달성 목표로 문서화합니다.`,
    `고객이 "AI로 빨리 되죠?"라는 기대를 보일 때는 검증 비용을 견적에 분리해 설명합니다. Stack Overflow 2026 조사 해설(2026-10-06)은 AI 코딩 도구 사용자의 73%가 매일 쓴다고 하고 GitHub Octoverse 2026은 2026-09 기준 PR의 40% 이상이 에이전트 시작이라고 하지만(모두 발표 주체의 자기 보고), 숙련 개발자 대상 무작위 시험(arXiv 2025-07)에서는 AI 허용 시 완료 시간이 19% 늘었습니다. 에이전트 사용은 고객의 비밀유지·AI 사용 정책(코드와 데이터를 외부 서비스에 보내도 되는지)을 계약 전에 확인하고, 산출물의 책임은 납품자에게 있으므로 실패 테스트 우선, 작은 커밋, 전체 diff 검토를 작업 방식으로 명시합니다.`,
    `협업 규칙 도입(보호 브랜치, 필수 리뷰, CODEOWNERS, Conventional Commits, PR 템플릿)은 팀 문화를 바꾸는 일이라 고객의 합의가 필요하고, 일부 보호 기능은 호스팅 요금제에 따라 제한되므로(GitHub 문서 기준) 고객 플랜을 먼저 확인합니다. 규칙은 한 번에 모두 켜지 말고 "main 직접 푸시 금지 + 필수 검사"부터 단계적으로 제안하고, 관리자 우회 설정과 예외 절차를 문서로 남깁니다. 저장소 소유권은 고객 조직으로 두고 프리랜서는 협력자로 일하는 구조를 기본으로 제안합니다.`,
    `견적과 일정 추정의 경험치(환경에 따라 크게 다르며 확정 수치가 아님): 개발 환경 표준화 스크립트와 저장소 템플릿 1~3일, 서버·저장소 인수 진단 보고서 1~3일, 재현 가능한 회귀 버그의 이분 탐색과 수정 반나절~2일(재현이 안 되면 별도 조사 단계로 분리), CI/CD 도입은 별도 견적. 재현 불가·테스트 부재·접근 지연이 일정 지연의 3대 원인이므로 계약서에 고객 측 선행 조건(접근 계정 제공 기한, 담당자 응답 시간)을 적고, 선행 조건이 늦어진 만큼 일정이 순연됨을 명시합니다.`
  ]
};
