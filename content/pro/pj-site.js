(window.PRO_MODULES = window.PRO_MODULES || {})["pj-site"] = {
  id: "pj-site",
  summary: `HTML과 CSS만으로 시맨틱 구조, Flexbox·Grid 반응형 레이아웃, 다크 모드와 접근성, 검증되는 연락 폼을 갖춘 포트폴리오 사이트를 직접 만들고 무료 호스팅에 배포해 고객에게 인계할 수 있다.`,
  hours: 24,
  goals: [
    `‹header›·‹nav›·‹main›·‹section›·‹article›·‹footer›로 페이지 뼈대를 짜고 제목 단계와 landmark 구조를 개발자 도구에서 확인할 수 있다`,
    `CSS 변수로 색·간격 토큰을 만들고 rem·line-height·clamp()로 한글 타이포그래피를 설계해 한 줄 수정으로 브랜드 색을 바꿀 수 있다`,
    `Flexbox의 주축·교차축·flex-wrap·flex 축약형으로 내비게이션과 카드 내부를 배치하고 마지막 줄 카드가 늘어나는 이유를 설명할 수 있다`,
    `Grid의 repeat(auto-fit, minmax(min(), 1fr))로 미디어 쿼리 없이 1·2·3열로 바뀌는 갤러리를 만들고 이미지 비율과 자리를 예약할 수 있다`,
    `viewport 메타와 모바일 우선 min-width 미디어 쿼리로 320~1440px에서 가로 스크롤 없는 레이아웃을 만들고 콘솔로 측정할 수 있다`,
    `prefers-color-scheme 다크 모드를 토큰 재정의로 구현하고 WCAG 대비 4.5:1·:focus-visible·건너뛰기 링크·alt 기준으로 점검할 수 있다`,
    `label·required·type·minlength·pattern으로 연락 폼의 기본 검증을 구성하고 클라이언트 검증의 한계와 서버 검증의 필요를 설명할 수 있다`,
    `메타 태그·이미지 성능·링크를 배포 전에 점검하고 GitHub Pages 같은 무료 정적 호스팅에 올려 README와 함께 고객에게 인계할 수 있다`
  ],
  lessons: [
    {
      title: `페이지 뼈대와 시맨틱 HTML: 구조는 세 종류의 독자가 읽는다`,
      body: `이 모듈에서는 가상의 프리랜서 "김하늘"의 포트폴리오 사이트를 한 장의 HTML 파일로 처음부터 끝까지 만듭니다. 8단계 각각의 코드는 그 단계까지 완성된 전체 프로젝트이므로 실행해 보고, 고쳐 보고, 다음 단계와 비교해 무엇이 늘었는지 읽으면 됩니다. 이 앱의 실행 버튼을 쓰거나, 메모장에 ‹index.html›을 **UTF-8**로 저장한 뒤 브라우저에 끌어다 놓아도 됩니다. 저장 인코딩이 UTF-8이 아니면 ‹meta charset›을 맞춰도 한글이 깨집니다.

### 멘탈 모델: HTML은 모양이 아니라 의미를 적는 언어

브라우저는 HTML 텍스트를 읽어 **DOM 트리**를 만들고, 그 트리 하나에서 세 가지를 파생합니다. 기본 화면 모양(제목은 크고 굵게, 링크는 파란 밑줄), 스크린 리더 같은 보조 기술이 읽는 접근성 트리, 검색엔진이 이해하는 문서 구조입니다. ‹div›만으로 만든 페이지는 눈에는 같아 보여도 뒤의 두 독자에게는 이름 없는 상자 더미입니다. 시맨틱 요소를 고른다는 것은 "이 덩어리가 무엇인가"를 이름으로 남기는 일입니다.

### 이 프로젝트의 뼈대

- ‹header›와 ‹nav›: 로고와 주 메뉴. 내비게이션이 둘 이상이면 ‹aria-label›로 구분합니다.
- ‹main›: 이 페이지 고유의 핵심 내용. MDN 기준 숨겨지지 않은 ‹main›은 문서에 하나만 둘 수 있고, 로고·메뉴·저작권처럼 여러 페이지에 반복되는 것은 넣지 않습니다. 보조 기술은 이것을 main 랜드마크로 노출해 한 번에 점프하게 해 줍니다.
- ‹section›: 주제 묶음. MDN은 ‹section›에 거의 예외 없이 제목(‹h1›~‹h6›)이 있어야 한다고 설명하고, 암묵적 역할이 이름(accessible name)이 있을 때만 region이고 없으면 일반(generic) 상자라고 적습니다. 스타일만을 위한 묶음이면 ‹div›를 쓰라고 합니다.
- ‹article›: 따로 떼어 배포해도 뜻이 통하는 단위. 프로젝트 카드가 여기에 해당합니다.
- ‹footer›: 저작권·연락처 같은 마무리 정보.

### 제목 단계와 문서 머리

‹h1›은 페이지 주제 하나, 그 아래 ‹h2›, ‹h3›로 내려갑니다. 글자 크기가 마음에 안 든다고 ‹h3›을 ‹h2› 자리에 쓰거나 단계를 건너뛰지 마세요. 크기는 CSS의 일이고, 스크린 리더 사용자는 제목 목록만 훑어 페이지를 파악하기 때문입니다. ‹!doctype html›이 빠지면 브라우저가 구형 호환 모드(quirks mode)로 계산해 레이아웃이 달라지고, ‹html lang="ko"›는 발음·번역 제안·줄바꿈 규칙에 쓰이며, ‹title›은 탭·북마크·검색 결과의 제목이 됩니다. ‹meta name="viewport"›는 5단계에서 이유를 설명하되 처음부터 넣어 둡니다.

### 설계 결정: 콘텐츠 먼저, CSS는 나중에

모든 글과 링크와 제목을 CSS 없이 먼저 완성하는 데는 이유가 있습니다. 실무에서 고객과 합의할 것은 색이 아니라 "어떤 섹션이 있고 무슨 문장이 들어가는가"이므로, 이 단계의 결과물이 곧 사이트맵과 문구 확인 자료가 됩니다. CSS가 로딩에 실패해도 읽히는 문서가 되고, 이후 스타일을 입힐 때 구조를 고칠 일이 줄어듭니다. 링크와 버튼도 구분하세요. 다른 곳으로 이동하면 ‹a›, 그 자리에서 동작을 일으키면 ‹button›이며, ‹div›에 클릭 이벤트를 붙인 가짜 버튼은 키보드로 접근할 수 없습니다.

### 확인

실행하면 CSS 없는 기본 화면이 보여야 합니다. 제목이 가장 크고, 링크는 파란 밑줄이고, 섹션이 위에서 아래로 쌓입니다. 페이지를 한 번 클릭하고 Tab 키를 누르면 포커스가 김하늘 → 소개 → 프로젝트 → 연락 → 메일 주소 순서로 **5번** 이동해야 합니다. 개발자 도구(F12)의 Elements에서 ‹header›·‹nav›·‹main›·‹footer›는 한 개씩, ‹section›은 세 개, ‹article›은 세 개이고, 제목은 ‹h1› 하나, ‹h2› 두 개, ‹h3› 세 개인지 세어 보세요.

### 혼자 해 보기

정답 코드를 가리고 동네 서점 소개 페이지의 뼈대(섹션 3개, 카드 2개 이상)를 CSS 없이 직접 타이핑하세요. 제목 단계를 건너뛴 곳이 0개이고, ‹h1›과 ‹main›이 각각 1개이며, Tab 이동 순서가 화면에서 읽는 순서와 같으면 성공입니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>김하늘 | 웹사이트 제작 포트폴리오</title>
</head>
<body>
<header><a href="#about">김하늘</a>
<nav aria-label="주 메뉴"><a href="#about">소개</a> <a href="#projects">프로젝트</a> <a href="#contact">연락</a></nav></header>
<main>
<section id="about">
<h1>작은 가게를 위한 빠르고 읽기 쉬운 웹사이트를 만듭니다</h1>
<p>프리랜서 프런트엔드 개발자 김하늘입니다. HTML과 CSS로 모바일에서도 편하게 읽히는 소개 페이지를 제작합니다.</p>
</section>
<section id="projects">
<h2>프로젝트</h2>
<article><h3>동네 카페 메뉴 사이트</h3><p>메뉴판과 위치를 한 화면에 담은 모바일 우선 사이트</p></article>
<article><h3>학원 소개 페이지</h3><p>시간표와 수강료를 표로 정리하고 상담 신청 폼을 붙였습니다</p></article>
<article><h3>개인 가계부 화면</h3><p>다크 모드와 키보드 조작까지 지원하는 연습용 화면</p></article>
</section>
<section id="contact">
<h2>연락하기</h2>
<p>메일로 편하게 문의하세요: <a href="mailto:hello@example.com">hello@example.com</a></p>
</section>
</main>
<footer><p>© 2026 김하늘</p></footer>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `HTML은 의미를 적는 언어다: DOM 하나에서 화면 모양, 접근성 트리, 검색엔진용 구조가 파생된다`,
        `요소는 모양이 아니라 의미로 고른다: ‹header›·‹nav›·‹main›·‹section›·‹article›·‹footer›`,
        `‹h1›은 페이지당 하나, 제목 단계는 건너뛰지 않고 크기는 CSS로 정한다`,
        `‹!doctype html›·‹lang›·‹meta charset›(UTF-8)·‹title›·viewport는 모든 문서의 기본 뼈대다`,
        `이동은 ‹a›, 동작은 ‹button›으로 만든다`
      ],
      pitfalls: [
        `글자 크기가 마음에 든다는 이유로 ‹h3›을 쓰거나 제목 단계를 건너뛴다. 스크린 리더의 제목 목록이 엉킨다`,
        `모든 것을 ‹div›로 만들고 클래스 이름으로만 구분한다. 화면은 같아 보여도 접근성 트리와 검색 구조가 비어 있다`,
        `파일을 UTF-8이 아닌 인코딩으로 저장하고 ‹meta charset›만 믿는다. 한글이 깨져 보인다`,
        `제목 없는 ‹section›을 스타일용 상자로 남발한다. 그 용도는 ‹div›다`
      ]
    },
    {
      title: `타이포그래피와 색 토큰: CSS 변수로 결정에 이름 붙이기`,
      body: `2단계는 구조에 겉모양을 입히되 "값"이 아니라 "결정"을 코드로 남기는 단계입니다. 도구는 CSS 사용자 지정 속성(변수)입니다. ‹:root›에 ‹--brand: #2456d6›처럼 선언하고 ‹var(--brand)›로 꺼내 씁니다. 이 단순한 기능이 모듈 전체의 설계 축입니다. 6단계 다크 모드는 토큰 값만 바꿔 끼우는 일이고, 고객이 "파란색을 조금 더 진하게"라고 하면 한 줄만 고치면 됩니다.

### 변수는 어떻게 동작하나

사용자 지정 속성은 기본적으로 상속되고, 값은 선언된 곳이 아니라 쓰이는 요소에서 해석됩니다(MDN). ‹:root›에 두면 문서 전체가 읽고, 어떤 요소에서 다시 선언하면 그 요소와 자손만 바뀝니다. ‹var(--x, 대체값)›은 변수가 없을 때 쓸 값이고, 값이 속성에 맞지 않으면 선언이 계산 시점에 무효가 되어 상속값이나 초기값으로 돌아갑니다. 예를 들어 ‹--brand: 16px›로 잘못 적고 ‹color: var(--brand)›를 쓰면 오류 표시 없이 글자색이 상속된 색으로 되돌아갑니다. 이름 오타도 조용히 무시되므로 DevTools의 Styles 패널에서 취소선과 계산된 값을 확인하는 습관이 필요합니다.

### 토큰은 "역할"로 이름 짓는다

‹--blue-500›처럼 값을 이름에 넣으면 다크 모드에서 연한 파랑으로 바뀔 때 이름이 거짓말이 됩니다. 이 프로젝트는 ‹--bg›(바탕), ‹--surface›(카드 바탕), ‹--text›, ‹--muted›(보조 글자), ‹--brand›, ‹--on-brand›(브랜드 색 위의 글자), ‹--line›(구분선), ‹--space›(기본 간격)처럼 역할로 부릅니다. 작은 사이트에는 색 토큰 8개 안팎이면 충분하고, 토큰이 많다고 좋은 설계가 되는 것은 아닙니다.

### 타이포그래피 결정

- ‹rem›: 브라우저 기본 글자 크기(보통 16px)에 비례합니다. 사용자가 설정에서 글자를 키우면 따라 커지므로 ‹px› 고정보다 접근성이 좋습니다.
- ‹line-height: 1.7›: 단위 없는 값은 자기 글자 크기의 배수로 상속됩니다. 한글은 획이 조밀해 줄 간격이 넉넉해야 편합니다.
- ‹word-break: keep-all›: 한글 문장을 단어 중간이 아니라 띄어쓰기에서 줄바꿈합니다. 기본값은 글자 사이 어디서나 끊을 수 있어 좁은 화면에서 단어가 쪼개집니다. 긴 URL이 넘칠 수 있는 곳에는 ‹overflow-wrap: anywhere›를 더합니다.
- ‹font-family›: ‹system-ui›에 ‹"Noto Sans KR"›, ‹"Malgun Gothic"›을 겹쳐 OS 글꼴을 씁니다. 한글 웹폰트는 글리프가 많아 파일이 큰 편이라 첫 화면 속도를 해치기 쉽고 라이선스도 고객과 확인해야 하므로, 기본은 시스템 글꼴입니다.
- ‹clamp(1.75rem, 5vw, 2.75rem)›: 제목 크기를 "최소, 선호, 최대"로 정합니다. 뷰포트 375px에서는 5vw가 18.75px이라 최소값 28px에 고정되고, 560px에서 880px 사이에 28px에서 44px로 부드럽게 커지며, 그 이상은 44px에서 멈춥니다(Edge에서 직접 측정).
- ‹box-sizing: border-box›: width가 패딩과 테두리를 포함하게 합니다. 없으면 ‹width: 100%›에 패딩을 더한 요소가 부모를 넘쳐 가로 스크롤이 생깁니다.

한 줄에 규칙을 여러 개 몰아 쓴 것은 코드를 짧게 보이려는 형식일 뿐이고, 읽기 편하게 줄바꿈해도 동작은 같습니다. 본문 폭은 ‹max-width: 60rem›(960px)으로 제한했습니다. 글줄이 화면 폭만큼 끝없이 늘어나면 읽기 어렵기 때문입니다.

### 확인

실행하면 시스템 글꼴, 파란 링크, 모서리가 둥근 파란색 "제작 문의하기" 버튼, 회색 바탕에 모서리가 둥근 카드 3장이 보여야 합니다. ‹--brand›를 ‹#6d28d9›(보라)로 바꾸면 링크와 버튼이 동시에 바뀌어야 합니다. 이 색은 흰 바탕에서 대비 7.1:1입니다(계산법은 6단계). 창 폭을 줄여 560px 아래에서 제목이 더 작아지지 않는지도 확인하세요.

### 혼자 해 보기

‹--brand› 한 줄만 바꿔 서로 다른 색 3개를 시험하고, 흰 바탕 위 링크 대비를 DevTools 색 선택기로 읽어 4.5:1 이상인 색만 남기세요. 컴포넌트 CSS를 한 글자도 고치지 않고 끝내면 성공입니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>김하늘 | 웹사이트 제작 포트폴리오</title>
<style>
:root{--bg:#fff;--surface:#f1f4f9;--text:#1c2230;--muted:#4a5568;--brand:#2456d6;--on-brand:#fff;--line:#c9d1df;--space:1rem}
*,*::before,*::after{box-sizing:border-box}body{margin:0;font:1rem/1.7 system-ui,"Noto Sans KR","Malgun Gothic",sans-serif;word-break:keep-all;background:var(--bg);color:var(--text)}
h1{font-size:clamp(1.75rem,5vw,2.75rem);line-height:1.25}h2{font-size:1.5rem}p{color:var(--muted)}a{color:var(--brand)}
header,main,footer{max-width:60rem;margin:0 auto;padding:var(--space)}section{padding-block:calc(var(--space)*2)}
.btn{display:inline-block;padding:.7rem 1.2rem;border-radius:8px;background:var(--brand);color:var(--on-brand);font-weight:700;text-decoration:none}
.card{margin-bottom:var(--space);padding:var(--space);background:var(--surface);border:1px solid var(--line);border-radius:12px}.card>*{margin:0 0 .5rem}
footer{color:var(--muted);font-size:.9rem}
</style></head>
<body>
<header><a href="#about">김하늘</a>
<nav aria-label="주 메뉴"><a href="#about">소개</a> <a href="#projects">프로젝트</a> <a href="#contact">연락</a></nav></header>
<main>
<section id="about">
<h1>작은 가게를 위한 빠르고 읽기 쉬운 웹사이트를 만듭니다</h1>
<p>프리랜서 프런트엔드 개발자 김하늘입니다. HTML과 CSS로 모바일에서도 편하게 읽히는 소개 페이지를 제작합니다.</p>
<a class="btn" href="#contact">제작 문의하기</a>
</section>
<section id="projects">
<h2>프로젝트</h2>
<article class="card"><h3>동네 카페 메뉴 사이트</h3><p>메뉴판과 위치를 한 화면에 담은 모바일 우선 사이트</p></article>
<article class="card"><h3>학원 소개 페이지</h3><p>시간표와 수강료를 표로 정리하고 상담 신청 폼을 붙였습니다</p></article>
<article class="card"><h3>개인 가계부 화면</h3><p>다크 모드와 키보드 조작까지 지원하는 연습용 화면</p></article>
</section>
<section id="contact">
<h2>연락하기</h2>
<p>메일로 편하게 문의하세요: <a href="mailto:hello@example.com">hello@example.com</a></p>
</section>
</main>
<footer><p>© 2026 김하늘</p></footer>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `변수는 결정에 붙인 이름이다: ‹:root›에 선언하고 ‹var()›로 쓴다`,
        `토큰은 값이 아니라 역할로 이름 짓는다: ‹--brand›·‹--surface›·‹--text›`,
        `단위 없는 ‹line-height: 1.7›과 ‹word-break: keep-all›이 한글 가독성의 기본이다`,
        `rem과 clamp()로 글자가 사용자 설정과 화면 폭을 따라가게 한다`,
        `‹box-sizing: border-box›는 모든 프로젝트의 첫 규칙이다`
      ],
      pitfalls: [
        `변수 값이 속성에 맞지 않거나 이름에 오타가 있어도 오류 없이 조용히 무시된다. DevTools로 확인하지 않으면 원인을 못 찾는다`,
        `토큰을 만들어 놓고 컴포넌트에는 ‹#fff›를 직접 쓴다. 6단계 다크 모드에서 흰 박스가 남는다`,
        `웹폰트를 습관처럼 붙여 첫 화면이 느려지고 라이선스 문제를 놓친다`,
        `글자 크기를 px로 고정해 사용자의 글자 크기 설정을 무시한다`
      ]
    },
    {
      title: `Flexbox로 내비게이션과 카드 배치: 한 방향 배치의 원리`,
      body: `3단계의 도구는 Flexbox입니다. MDN은 이것을 한 번에 행이나 열 중 한 차원만 다루는 1차원 배치 모델이라고 설명합니다. 항목들을 한 방향으로 늘어놓고 남는 공간을 나누고 정렬하는 일에 가장 잘 맞습니다.

### 주축과 교차축

‹display: flex›를 준 요소가 컨테이너, 직계 자식이 항목입니다. 항목은 ‹flex-direction›이 정한 주축(기본은 가로)을 따라 놓이고, 거기에 수직인 방향이 교차축입니다. ‹justify-content›는 주축의 남는 공간을 나누고 ‹align-items›는 교차축 정렬을 맡습니다. 방향을 ‹column›으로 바꾸면 두 속성이 맡는 방향도 서로 바뀝니다. "justify는 주축, align은 교차축"만 기억하세요.

### 이 단계의 세 가지 배치

1. 헤더: ‹justify-content: space-between›으로 로고는 왼쪽, 메뉴는 오른쪽으로 밀고 ‹align-items: center›로 세로 가운데를 맞춥니다. ‹flex-wrap: wrap›과 ‹gap: .5rem 1rem›을 함께 주면 좁은 화면에서 줄이 감겨도 간격이 유지됩니다. 마진으로 간격을 만들면 맨 끝 항목의 바깥 마진을 따로 지워야 하지만 ‹gap›은 항목 사이에만 생깁니다.
2. 메뉴 링크: ‹nav a›에 ‹padding: .5rem›을 주어 글자보다 눌리는 영역을 넓힙니다. 손가락으로 누르는 화면에서 작은 링크는 오입력의 원인입니다.
3. 카드 목록: ‹.cards›에 ‹flex-wrap: wrap›, 카드에 ‹flex: 1 1 16rem›을 줍니다.

### flex 축약형 읽기

‹flex: 1 1 16rem›은 ‹flex-grow: 1›, ‹flex-shrink: 1›, ‹flex-basis: 16rem›의 순서입니다(MDN). "16rem(256px)에서 시작하고, 남는 공간이 있으면 똑같이 나눠 늘어나며, 모자라면 줄어들 수 있다"는 뜻입니다. ‹wrap›이 더해지면 브라우저가 기본 폭 256px 카드가 한 줄에 몇 개 들어가는지 계산해 넘치는 카드를 다음 줄로 보냅니다. 3장이 한 줄에 놓이려면 3×256px + 간격 2×16px = 800px가 필요합니다.

### 한계: 줄마다 따로 늘어난다

MDN이 설명하듯 감긴 각 줄은 자기만의 flex 컨테이너처럼 공간을 나눕니다. 그래서 컨테이너가 800px보다 좁아지면 카드 2장이 한 줄, 나머지 1장이 다음 줄이 되고, 마지막 줄의 카드는 줄 전체로 늘어납니다. 768px 창(세로 스크롤바 15px 포함)에서 측정한 카드 폭은 353px, 353px, 721px이었습니다. 버그가 아니라 설계된 동작이며, 4단계에서 Grid로 바꾸는 이유입니다.

### 카드 안쪽도 Flexbox

카드는 ‹flex-direction: column›으로 제목·설명·링크를 세로로 쌓고 링크에 ‹margin-top: auto›를 줍니다. 자동 마진은 남는 공간을 전부 흡수하므로 설명 길이가 달라도 링크가 카드 바닥에 붙습니다. 같은 줄의 카드는 기본값 ‹align-items: stretch›로 높이가 같아지므로 세 링크가 한 줄로 정렬됩니다(1100px 창에서 세 링크의 y 좌표가 같음을 확인했습니다). ‹.card > *›에 ‹margin: 0 0 .5rem›을 준 것은 flex 항목의 마진은 블록 레이아웃처럼 겹치지 않아 ‹h3›·‹p›의 기본 마진이 두 배로 벌어지기 때문이고, ‹align-self: flex-start›는 링크가 카드 폭 전체로 늘어나 빈 곳을 눌러도 이동하는 일을 막습니다.

### 확인

1100px 안팎에서는 카드 3장이 한 줄에 같은 폭으로 놓이고 세 링크의 세로 위치가 같아야 합니다. 창을 줄여 약 850px(스크롤바 포함 창 폭이며 본문 폭으로는 800px 미만) 아래로 내려가면 3번째 카드가 아래 줄에서 가로 전체로 늘어나야 하고, 더 줄이면 한 줄에 한 장이 됩니다. 이 늘어나는 현상을 직접 본 뒤 다음 단계로 가세요.

### 혼자 해 보기

각 카드에 기술 태그 목록(‹ul›)을 넣고 Flexbox와 ‹gap›만으로 줄바꿈되게 하세요. 태그를 8개로 늘려도 320px 폭에서 가로 스크롤 값이 0이고 마진으로 간격을 만든 곳이 없으면 성공입니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>김하늘 | 웹사이트 제작 포트폴리오</title>
<style>
:root{--bg:#fff;--surface:#f1f4f9;--text:#1c2230;--muted:#4a5568;--brand:#2456d6;--on-brand:#fff;--line:#c9d1df;--space:1rem}
*,*::before,*::after{box-sizing:border-box}body{margin:0;font:1rem/1.7 system-ui,"Noto Sans KR","Malgun Gothic",sans-serif;word-break:keep-all;background:var(--bg);color:var(--text)}
h1{font-size:clamp(1.75rem,5vw,2.75rem);line-height:1.25}h2{font-size:1.5rem}p{color:var(--muted)}a{color:var(--brand)}
header,main,footer{max-width:60rem;margin:0 auto;padding:var(--space)}section{padding-block:calc(var(--space)*2)}
header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem 1rem}
nav{display:flex;gap:1rem}nav a{padding:.5rem;text-decoration:none}
.btn{display:inline-block;padding:.7rem 1.2rem;border-radius:8px;background:var(--brand);color:var(--on-brand);font-weight:700;text-decoration:none}
.cards{display:flex;flex-wrap:wrap;gap:var(--space)}
.card{flex:1 1 16rem;display:flex;flex-direction:column;padding:var(--space);background:var(--surface);border:1px solid var(--line);border-radius:12px}
.card>*{margin:0 0 .5rem}.card a{margin-top:auto;align-self:flex-start}
footer{color:var(--muted);font-size:.9rem}
</style></head>
<body>
<header><a href="#about">김하늘</a>
<nav aria-label="주 메뉴"><a href="#about">소개</a><a href="#projects">프로젝트</a><a href="#contact">연락</a></nav></header>
<main>
<section id="about">
<h1>작은 가게를 위한 빠르고 읽기 쉬운 웹사이트를 만듭니다</h1>
<p>프리랜서 프런트엔드 개발자 김하늘입니다. HTML과 CSS로 모바일에서도 편하게 읽히는 소개 페이지를 제작합니다.</p>
<a class="btn" href="#contact">제작 문의하기</a>
</section>
<section id="projects">
<h2>프로젝트</h2>
<div class="cards">
<article class="card"><h3>동네 카페 메뉴 사이트</h3><p>메뉴판과 위치를 한 화면에 담은 모바일 우선 사이트</p><a href="#contact">카페 사이트 문의하기</a></article>
<article class="card"><h3>학원 소개 페이지</h3><p>시간표와 수강료를 표로 정리하고 상담 신청 폼을 붙였습니다</p><a href="#contact">학원 사이트 문의하기</a></article>
<article class="card"><h3>개인 가계부 화면</h3><p>다크 모드와 키보드 조작까지 지원하는 연습용 화면</p><a href="#contact">가계부 화면 문의하기</a></article>
</div></section>
<section id="contact">
<h2>연락하기</h2>
<p>메일로 편하게 문의하세요: <a href="mailto:hello@example.com">hello@example.com</a></p>
</section>
</main>
<footer><p>© 2026 김하늘</p></footer>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `Flexbox는 1차원이다: 주축은 ‹justify-content›, 교차축은 ‹align-items›`,
        `‹flex: grow shrink basis› 순서이며 감기는 목록에서는 basis가 한 줄에 몇 개가 들어갈지 정한다`,
        `‹gap›은 항목 사이에만 생기는 간격이라 마진 꼼수보다 안전하다`,
        `카드 안쪽은 ‹flex-direction: column›과 ‹margin-top: auto›로 링크를 바닥에 붙인다`,
        `감긴 flex 목록의 마지막 줄 항목은 남는 공간으로 늘어난다`
      ],
      pitfalls: [
        `‹flex-wrap›을 빼서(기본값 nowrap) 모바일에서 항목이 찌그러지거나 화면을 넘친다`,
        `‹column›으로 방향을 바꾼 뒤에도 ‹justify-content›가 가로를 맡는다고 착각한다`,
        `flex 항목에서는 마진이 겹치지 않는데 기본 마진을 지우지 않아 간격이 두 배가 된다`,
        `Flexbox로 페이지 전체의 2차원 격자까지 억지로 만든다. 그 일은 Grid가 한다`
      ]
    },
    {
      title: `Grid로 프로젝트 갤러리와 반응형 열: 미디어 쿼리 없이 열 수 바꾸기`,
      body: `Grid는 행과 열을 동시에 정의하는 2차원 배치입니다. Flexbox가 "항목이 흐르는 방향을 따라 나누는 도구"라면 Grid는 "칸(트랙)을 먼저 그려 놓고 항목을 채우는 도구"입니다. 갤러리처럼 모든 카드가 같은 열 폭을 공유해야 할 때 Grid가 맞습니다.

### 이 한 줄이 하는 일

‹grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr))›을 안쪽부터 읽습니다.

1. ‹min(16rem, 100%)›: 16rem과 컨테이너 폭 중 작은 값. 컨테이너가 256px보다 좁은 극단에서 열이 넘치지 않게 하는 안전장치입니다.
2. ‹minmax(최소, 1fr)›: 열은 최소 그 폭이고, 남는 공간은 ‹fr› 비율로 똑같이 나눕니다.
3. ‹repeat(auto-fit, …)›: 컨테이너에 들어갈 만큼 열을 반복해서 만듭니다.

미디어 쿼리가 한 줄도 없는데 열 수가 1, 2, 3으로 바뀝니다. 측정 결과 375px에서 1열, 768px에서 2열, 1100px에서 3열이었습니다. 열 수는 내용(카드의 최소 폭)이 정하므로 특정 기기 폭을 외울 필요가 없습니다. 2열이 되려면 컨테이너가 2×256+16=528px, 3열이 되려면 800px 이상이어야 합니다.

### 3단계와 무엇이 다른가

| 768px 창의 카드 폭 | Flexbox 3단계: 353, 353, 721 | Grid 4단계: 353, 353, 353 |
| 마지막 줄 | 남는 공간으로 늘어남 | 열 폭 그대로 |

감긴 flex는 줄마다 따로 공간을 나누지만 Grid는 열 트랙을 모든 행이 공유하기 때문입니다. 그래서 갤러리·상품 목록·가격표 같은 격자는 Grid, 한 줄짜리 막대·태그·카드 내부 정렬은 Flexbox로 나눠 쓰는 것이 기본 원칙입니다. 이 프로젝트의 카드가 바깥은 Grid, 안쪽은 Flexbox인 이유입니다.

### auto-fit과 auto-fill, 그리고 min()

MDN 설명대로 ‹auto-fit›은 ‹auto-fill›처럼 열을 만든 뒤 항목이 없는 빈 열을 0px로 접습니다. 그래서 ‹1fr› 열에 놓인 항목이 남는 공간을 차지합니다. 차이는 항목이 적을 때 드러납니다. 카드가 1장뿐이면 1000px 창(본문 폭 928px)에서 ‹auto-fit›은 카드를 컨테이너 전체 폭 928px로 늘리고 ‹auto-fill›은 열 폭 그대로(약 299px) 둡니다(직접 측정). 항목 수가 들쭉날쭉한 목록은 ‹auto-fill›이 안전합니다. ‹min()›을 빼고 ‹minmax(24rem, 1fr)›처럼 큰 최소값을 쓰면 375px 폰에서 열 폭 384px가 화면을 넘어 25px 가로 스크롤이 생기고(스크롤바가 없는 모바일 기준이며 Windows 창에서는 스크롤바 때문에 40px), ‹min(24rem, 100%)›로 막으면 0이 됩니다(직접 측정).

### 이미지 넣기: width·height 속성과 height:auto

카드마다 ‹img›를 넣었습니다. ‹src›의 긴 ‹data:› 주소는 파일 없이 실행되도록 넣은 자리 표시용 단색 이미지이고, 실제 프로젝트에서는 ‹images/cafe.jpg› 같은 파일 경로로 바꿉니다. 중요한 것은 ‹width="320" height="200"› 속성입니다. 이미지가 로딩되기 전에 브라우저가 가로세로 비율로 자리를 미리 잡아 두므로 이미지가 뜰 때 아래 내용이 밀리지 않습니다(MDN). 그런데 CSS에서 ‹width: 100%›만 주고 ‹height: auto›를 빼면 높이가 속성값 200px에 고정되어 이미지가 찌그러집니다. 375px 창에서 이미지 폭이 294px일 때 ‹height: auto›가 없으면 294×200, 더하면 294×184로 8:5 비율이 유지됩니다(직접 측정). ‹alt›는 일단 짧게 달고 6단계에서 다듬습니다.

### 확인

1100px 이상에서 카드 3열, 약 850px 아래에서 2열(세 번째 카드가 열 폭 그대로 왼쪽 아래에 남음), 약 575px 아래에서 1열이 되어야 합니다(스크롤바 15px를 포함한 창 폭 기준이며 직접 측정한 경계는 847px와 575px였습니다). 이미지 비율이 8:5로 유지되고 가로 스크롤이 없어야 합니다. ‹gap›을 ‹2rem›으로 바꿔 열 수가 바뀌는 폭이 어떻게 움직이는지 관찰해 보세요.

### 혼자 해 보기

카드를 6장으로 늘리고 320·768·1100px에서의 열 수를 먼저 예측해 적은 뒤 DevTools로 실제 값을 읽어 비교하세요. 세 곳 모두 맞으면 성공이고, 틀렸다면 ‹minmax›의 최소 폭과 ‹gap›으로 어디서 계산이 어긋났는지 설명해 보세요.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>김하늘 | 웹사이트 제작 포트폴리오</title>
<style>
:root{--bg:#fff;--surface:#f1f4f9;--text:#1c2230;--muted:#4a5568;--brand:#2456d6;--on-brand:#fff;--line:#c9d1df;--space:1rem}
*,*::before,*::after{box-sizing:border-box}body{margin:0;font:1rem/1.7 system-ui,"Noto Sans KR","Malgun Gothic",sans-serif;word-break:keep-all;background:var(--bg);color:var(--text)}
h1{font-size:clamp(1.75rem,5vw,2.75rem);line-height:1.25}h2{font-size:1.5rem}p{color:var(--muted)}a{color:var(--brand)}
header,main,footer{max-width:60rem;margin:0 auto;padding:var(--space)}section{padding-block:calc(var(--space)*2)}
header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem 1rem}
nav{display:flex;gap:1rem}nav a{padding:.5rem;text-decoration:none}
.btn{display:inline-block;padding:.7rem 1.2rem;border-radius:8px;background:var(--brand);color:var(--on-brand);font-weight:700;text-decoration:none}
.cards{display:grid;gap:var(--space);grid-template-columns:repeat(auto-fit,minmax(min(16rem,100%),1fr))}
.card{display:flex;flex-direction:column;padding:var(--space);background:var(--surface);border:1px solid var(--line);border-radius:12px}
.card>*{margin:0 0 .5rem}.card a{margin-top:auto;align-self:flex-start}.card img{width:100%;height:auto;border-radius:8px}
footer{color:var(--muted);font-size:.9rem}
</style></head>
<body>
<header><a href="#about">김하늘</a>
<nav aria-label="주 메뉴"><a href="#about">소개</a><a href="#projects">프로젝트</a><a href="#contact">연락</a></nav></header>
<main>
<section id="about">
<h1>작은 가게를 위한 빠르고 읽기 쉬운 웹사이트를 만듭니다</h1>
<p>프리랜서 프런트엔드 개발자 김하늘입니다. HTML과 CSS로 모바일에서도 편하게 읽히는 소개 페이지를 제작합니다.</p>
<a class="btn" href="#contact">제작 문의하기</a>
</section>
<section id="projects">
<h2>프로젝트</h2>
<div class="cards">
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23457b9d'/%3E%3C/svg%3E" width="320" height="200" alt="카페 사이트 화면"><h3>동네 카페 메뉴 사이트</h3><p>메뉴판과 위치를 한 화면에 담은 모바일 우선 사이트</p><a href="#contact">카페 사이트 문의하기</a></article>
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23b5651d'/%3E%3C/svg%3E" width="320" height="200" alt="학원 사이트 화면"><h3>학원 소개 페이지</h3><p>시간표와 수강료를 표로 정리하고 상담 신청 폼을 붙였습니다</p><a href="#contact">학원 사이트 문의하기</a></article>
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23547a3a'/%3E%3C/svg%3E" width="320" height="200" alt="가계부 화면"><h3>개인 가계부 화면</h3><p>다크 모드와 키보드 조작까지 지원하는 연습용 화면</p><a href="#contact">가계부 화면 문의하기</a></article>
</div></section>
<section id="contact">
<h2>연락하기</h2>
<p>메일로 편하게 문의하세요: <a href="mailto:hello@example.com">hello@example.com</a></p>
</section>
</main>
<footer><p>© 2026 김하늘</p></footer>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `Grid는 2차원이다: 트랙(열·행)을 정의하고 항목을 채운다`,
        `‹repeat(auto-fit, minmax(min(16rem, 100%), 1fr))›이 반응형 갤러리의 기본형이다`,
        `‹auto-fit›은 빈 트랙을 접어 항목을 늘리고 ‹auto-fill›은 열 폭을 유지한다`,
        `격자는 Grid, 한 방향 정렬은 Flexbox: 바깥은 Grid, 카드 안쪽은 Flex로 조합한다`,
        `‹img›에 width·height 속성과 CSS ‹height: auto›를 함께 쓰면 비율 유지와 자리 예약이 된다`
      ],
      pitfalls: [
        `‹minmax›의 최소값이 화면보다 커서 가로 스크롤이 생긴다. ‹min(값, 100%)›로 방어한다`,
        `항목이 1~2개일 때 ‹auto-fit›이 카드를 화면 전체로 늘리는 것을 놓친다`,
        `이미지에 ‹width: 100%›만 주고 ‹height: auto›를 빼 비율이 찌그러진다`,
        `열 수를 ‹repeat(3, 1fr)›로 고정하고 모바일용 쿼리를 잊는다`
      ]
    },
    {
      title: `미디어 쿼리와 모바일 우선 설계: viewport부터 토큰 바꾸기까지`,
      body: `5단계는 화면 폭에 따라 규칙을 바꾸는 미디어 쿼리입니다. 먼저 코드에 보이지 않는 전제부터 확인합니다.

### viewport 메타가 없으면 무엇이 달라지나

많은 모바일 브라우저는 데스크톱용으로 만든 페이지를 위해 화면보다 훨씬 넓은 가상 뷰포트에서 레이아웃을 계산한 뒤 축소해서 보여 줍니다. MDN은 640px 화면이 980px 뷰포트로 렌더링되는 예를 듭니다. 이 경우 640px나 480px에서 켜지게 만든 미디어 쿼리는 영영 켜지지 않습니다. ‹meta name="viewport" content="width=device-width, initial-scale=1"›은 "레이아웃 폭을 기기 폭으로 하라"는 선언이며 1단계부터 넣어 두었습니다. MDN은 ‹width=device-width›만 쓰는 예를 보이며 ‹initial-scale=1›은 보통 불필요하다고 적지만, 함께 쓰는 것도 흔합니다. 피해야 할 것은 ‹user-scalable=no›입니다. MDN은 이것이 저시력 사용자의 읽기를 막는다고 경고하고 WCAG가 최소 2배 확대를 요구한다고 적습니다. 낮은 ‹maximum-scale›도 같은 이유로 피합니다.

### 모바일 우선이란

기본 CSS를 가장 좁은 화면 기준으로 쓰고, 화면이 넓어질 때만 ‹@media (min-width: 48em)›처럼 규칙을 더하는 방식입니다. 이유는 세 가지입니다. 제약이 가장 큰 기기(작은 화면, 느린 회선)가 가장 적은 규칙만 처리하고, 덮어쓰기 연쇄가 짧아지며, 콘텐츠 우선 설계와 사고방식이 맞습니다. 데스크톱 기준으로 쓰고 ‹max-width›로 줄여 가면 앞서 쓴 규칙을 계속 되돌려야 해서 버그가 늘어납니다.

### 중단점은 내용이 정한다

기기 목록으로 중단점을 정하지 마세요. 기기는 계속 늘어납니다. 창을 천천히 넓히다가 내용이 어색해지는 폭에서 규칙을 더합니다. 이 프로젝트는 3·4단계의 Flex·Grid가 줄바꿈과 열 수를 이미 알아서 맞추므로 구조가 정말 바뀌는 곳은 히어로(소개 영역) 하나입니다. ‹48em›은 기본 글자 크기 16px에서 768px이고, 쿼리 안의 ‹em›은 문서 CSS가 아니라 브라우저 기본 글자 크기를 기준으로 계산됩니다(CSS Media Queries Level 4 명세 1.3절). MDN에는 ‹(width >= 48em)› 같은 범위 문법도 소개되어 있으나 이 모듈은 가장 널리 쓰이는 ‹min-width›를 씁니다.

### 설계 결정: 쿼리가 규칙이 아니라 토큰을 바꾼다

쿼리 블록은 두 가지만 합니다. ‹:root›의 ‹--space›를 1rem에서 1.5rem으로 키우고, ‹.hero›를 한 열에서 ‹1fr 10rem›의 두 열로 바꿉니다. ‹--space›는 컨테이너 패딩·카드 패딩·그리드 간격·섹션 위아래 여백에 모두 쓰이므로 값 하나로 여백이 한꺼번에 커집니다. 컴포넌트마다 쿼리를 쓰지 않아도 되니 쿼리 수가 줄고 유지보수가 쉬워집니다. 히어로는 모바일에서 세로(설명, 아바타 순), 768px 이상에서 가로로 놓입니다. 아바타 이미지는 이 단계에서 추가했습니다.

### 소스 순서 함정과 가로 스크롤

미디어 쿼리는 선택자의 우선순위를 올려 주지 않습니다. 우선순위가 같으면 나중에 쓴 규칙이 이기므로, 쿼리 블록을 ‹.hero { grid-template-columns: 1fr }›보다 위에 쓰면 1000px 창에서도 열이 한 개(912px)로 남고 아래에 쓰면 728px와 160px 두 열이 됩니다(이 단계 코드로 직접 확인). 쿼리 블록은 스타일시트 맨 아래에 모읍니다. 폰에서 가로로 밀리는 페이지는 고정 폭 요소, ‹box-sizing› 누락, ‹width: 100vw› 중 하나가 원인인 경우가 대부분입니다. ‹100vw›는 세로 스크롤바 폭까지 포함해 데스크톱 창에서 15px 넘쳤습니다(직접 측정). 폭이 필요하면 ‹100%›를 쓰세요.

### 확인

320, 375, 768, 1280px에서 확인합니다. DevTools에서 Ctrl+Shift+M으로 기기 모드를 켜고 폭을 직접 입력하세요. 375px에서는 히어로가 세로로 쌓이고 아바타가 버튼 아래에 보이며, 768px부터는 오른쪽 열에 아바타가 놓이고 여백이 16px에서 24px로 커져야 합니다. 어느 폭에서도 콘솔의 ‹document.documentElement.scrollWidth - document.documentElement.clientWidth›가 0이어야 합니다.

### 혼자 해 보기

쿼리 블록 하나만 써서 768px 이상에서 ‹h2› 글자 크기만 키우세요. 바꿀 것이 토큰인지 규칙인지 먼저 한 줄로 적고, 767px와 768px 두 폭에서 계산된 글자 크기를 콘솔로 읽어 값이 달라지는 경계가 정확히 768px인지 확인하면 성공입니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>김하늘 | 웹사이트 제작 포트폴리오</title>
<style>
:root{--bg:#fff;--surface:#f1f4f9;--text:#1c2230;--muted:#4a5568;--brand:#2456d6;--on-brand:#fff;--line:#c9d1df;--space:1rem}
*,*::before,*::after{box-sizing:border-box}body{margin:0;font:1rem/1.7 system-ui,"Noto Sans KR","Malgun Gothic",sans-serif;word-break:keep-all;background:var(--bg);color:var(--text)}
h1{font-size:clamp(1.75rem,5vw,2.75rem);line-height:1.25}h2{font-size:1.5rem}p{color:var(--muted)}a{color:var(--brand)}
header,main,footer{max-width:60rem;margin:0 auto;padding:var(--space)}section{padding-block:calc(var(--space)*2)}
header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem 1rem}
nav{display:flex;gap:1rem}nav a{padding:.5rem;text-decoration:none}
.hero{display:grid;gap:var(--space);align-items:center}.avatar{width:8rem;height:auto;border-radius:50%}
.btn{display:inline-block;padding:.7rem 1.2rem;border-radius:8px;background:var(--brand);color:var(--on-brand);font-weight:700;text-decoration:none}
.cards{display:grid;gap:var(--space);grid-template-columns:repeat(auto-fit,minmax(min(16rem,100%),1fr))}
.card{display:flex;flex-direction:column;padding:var(--space);background:var(--surface);border:1px solid var(--line);border-radius:12px}
.card>*{margin:0 0 .5rem}.card a{margin-top:auto;align-self:flex-start}.card img{width:100%;height:auto;border-radius:8px}
footer{color:var(--muted);font-size:.9rem}
@media (min-width:48em){:root{--space:1.5rem}.hero{grid-template-columns:1fr 10rem}}
</style></head>
<body>
<header><a href="#about">김하늘</a>
<nav aria-label="주 메뉴"><a href="#about">소개</a><a href="#projects">프로젝트</a><a href="#contact">연락</a></nav></header>
<main>
<section id="about" class="hero">
<div><h1>작은 가게를 위한 빠르고 읽기 쉬운 웹사이트를 만듭니다</h1>
<p>프리랜서 프런트엔드 개발자 김하늘입니다. HTML과 CSS로 모바일에서도 편하게 읽히는 소개 페이지를 제작합니다.</p>
<a class="btn" href="#contact">제작 문의하기</a></div>
<img class="avatar" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Crect width='8' height='8' fill='%238d99ae'/%3E%3C/svg%3E" width="160" height="160" alt="김하늘의 프로필 일러스트">
</section>
<section id="projects">
<h2>프로젝트</h2>
<div class="cards">
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23457b9d'/%3E%3C/svg%3E" width="320" height="200" alt="카페 사이트 화면"><h3>동네 카페 메뉴 사이트</h3><p>메뉴판과 위치를 한 화면에 담은 모바일 우선 사이트</p><a href="#contact">카페 사이트 문의하기</a></article>
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23b5651d'/%3E%3C/svg%3E" width="320" height="200" alt="학원 사이트 화면"><h3>학원 소개 페이지</h3><p>시간표와 수강료를 표로 정리하고 상담 신청 폼을 붙였습니다</p><a href="#contact">학원 사이트 문의하기</a></article>
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23547a3a'/%3E%3C/svg%3E" width="320" height="200" alt="가계부 화면"><h3>개인 가계부 화면</h3><p>다크 모드와 키보드 조작까지 지원하는 연습용 화면</p><a href="#contact">가계부 화면 문의하기</a></article>
</div></section>
<section id="contact">
<h2>연락하기</h2>
<p>메일로 편하게 문의하세요: <a href="mailto:hello@example.com">hello@example.com</a></p>
</section>
</main>
<footer><p>© 2026 김하늘</p></footer>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `viewport 메타가 없으면 모바일은 넓은 가상 뷰포트로 계산해 폭 기준 쿼리가 의도대로 켜지지 않는다`,
        `모바일 우선: 기본은 좁은 화면, ‹min-width› 쿼리로 규칙을 더한다`,
        `중단점은 기기가 아니라 내용이 어색해지는 폭에서 정한다`,
        `쿼리 안에서 토큰(‹--space›)을 바꾸면 컴포넌트 규칙을 다시 쓰지 않아도 된다`,
        `우선순위가 같으면 나중 규칙이 이기므로 쿼리 블록은 기본 규칙 아래에 둔다`
      ],
      pitfalls: [
        `viewport 메타를 빼먹거나 ‹user-scalable=no›로 확대를 막는다`,
        `데스크톱 기준으로 쓰고 ‹max-width›로 되돌려 규칙들이 서로 덮어쓰는 구조를 만든다`,
        `쿼리 블록을 기본 규칙 위에 써서 아무 효과가 없는 것처럼 보인다`,
        `‹100vw›나 고정 px 폭으로 가로 스크롤을 만들고, 장치 모드만 믿고 실제 폰 확인을 생략한다`
      ]
    },
    {
      title: `다크 모드와 접근성: 토큰 재정의, 대비, 키보드, alt`,
      body: `6단계는 두 가지를 합니다. 사용자의 OS 설정을 따라가는 다크 모드, 그리고 시각·운동 능력이 다른 사용자도 쓸 수 있게 하는 접근성입니다. 둘 다 추가 기능이 아니라 품질 기준이어서 납품 점검표에 들어갑니다.

### 다크 모드: 토큰만 다시 선언한다

‹@media (prefers-color-scheme: dark)› 안에서 ‹:root›의 색 토큰만 다시 선언합니다. 이 미디어 기능은 OS나 브라우저의 라이트·다크 설정을 읽으며 MDN 기준 2020년 1월부터 주요 브라우저에서 널리 지원됩니다. 컴포넌트가 ‹#hex› 대신 ‹var(--surface)›를 썼으므로 컴포넌트 CSS는 한 줄도 바뀌지 않습니다. 어딘가에 ‹background: #fff›를 직접 쓴 상자는 다크 모드에서 흰 박스로 남습니다. 이 블록을 ‹:root› 선언보다 위에 쓰면 우선순위가 같아 나중에 쓴 라이트 값이 이기므로 다크 OS에서도 배경이 흰색입니다(직접 확인). 라이트 기본, 그 아래 다크 덮어쓰기 순서를 지키세요.

‹color-scheme: light dark›는 별개의 장치입니다. MDN에 따르면 이 선언이 있으면 브라우저가 직접 그리는 캔버스 배경·스크롤바·폼 컨트롤의 기본 색이 모드에 맞춰지고, 우리가 정한 배경·글자색은 ‹prefers-color-scheme› 쿼리로 직접 바꿔야 합니다. 다크 팔레트는 색을 단순 반전하지 않습니다. 순수 검정·흰색의 극단 대비 대신 부드러운 ‹#10141b›·‹#e8ecf3›을 쓰고, 브랜드 색은 어두운 바탕에서 읽히도록 밝은 ‹#8fb0ff›로 올리되 그 위의 버튼 글자(‹--on-brand›)는 반대로 어두운 색으로 뒤집었습니다.

### 대비는 계산할 수 있다

WCAG 2.2 기준 1.4.3(AA)은 일반 글자에 4.5:1, 큰 글자(18pt 이상 또는 굵은 14pt 이상, 대략 24px·18.5px)에 3:1을 요구하고 반올림하지 않으므로 4.499:1은 탈락입니다. 이 팔레트를 WCAG 공식으로 직접 계산한 값입니다(2026-11).

| 조합 | 라이트 | 다크 |
| 본문 / 바탕 | 15.9 | 15.58 |
| 보조 글자 / 바탕 | 7.53 | 8.83 |
| 보조 글자 / 카드 바탕 | 6.83 | 7.82 |
| 링크(브랜드) / 바탕 | 6.22 | 8.63 |
| 링크(브랜드) / 카드 바탕 | 5.64 | 7.64 |
| 버튼 글자 / 브랜드 | 6.22 | 8.63 |
| 구분선 / 바탕 | 1.54 | 1.77 |

구분선은 장식이라 괜찮지만 7단계의 입력칸 테두리는 경계를 알리는 요소라 더 진한 색을 씁니다. 겉보기에 충분해 보이는 ‹#777777›은 흰 바탕에서 4.48:1로 탈락하고 ‹#767676›은 4.54:1로 통과합니다. 브랜드를 갈색 ‹#b5651d›로 바꾸면 흰 바탕에서 4.34:1이라 링크가 탈락합니다. 색을 고를 때는 DevTools 색 선택기의 대비 값을 확인하세요.

### 키보드와 alt

‹outline: none›으로 포커스 링을 지우면 키보드 사용자는 자기 위치를 알 수 없습니다. 대신 ‹:focus-visible›로 모양을 바꿉니다. 이 선택자는 마우스 클릭에서는 링을 숨기고 키보드 이동에서는 보여 주도록 브라우저가 판단합니다. 건너뛰기 링크(‹.skip›)는 Tab을 한 번 누르면 나타나 ‹#main›으로 곧장 이동시켜 메뉴를 매 페이지 통과하지 않게 합니다. 화면 밖(‹left: -999px›)에 두고 포커스를 받을 때만 제자리로 옮기며, ‹display: none›은 포커스를 받지 못해 쓸 수 없습니다(직접 확인).

alt는 W3C 판단 순서를 따릅니다. 정보를 더하는 이미지는 의미를 전하는 짧은 문장, 주변 글이 이미 같은 말을 하거나 장식이면 ‹alt=""›(보조 기술이 건너뜀), 링크나 버튼 안의 이미지는 목적지나 동작을 적습니다. ‹alt› 속성을 아예 빼는 것과 빈 값은 다릅니다. 카드 이미지는 제목이 이미 이름을 말하므로 "카페 사이트 화면" 대신 "메뉴와 영업시간이 보이는 카페 사이트 모바일 화면"처럼 보이는 내용을 적었습니다(예제 이미지는 단색 자리 표시용이므로 실제 스크린샷으로 바꿀 때 내용에 맞게 고칩니다). 링크 문구도 같은 원칙이라 "여기" 대신 "카페 사이트 문의하기"로 목적을 적었습니다. 마지막으로 ‹prefers-reduced-motion: no-preference›일 때만 부드러운 스크롤을 켭니다.

### 확인

OS 설정이나 DevTools(Ctrl+Shift+P, Rendering)에서 다크로 바꾸면 배경이 ‹#10141b›으로, 버튼 글자가 어두운색으로 바뀌어야 합니다. 페이지를 한 번 클릭하고 Tab을 누르면 왼쪽 위에 "본문으로 건너뛰기"가 나타나고, 이어서 포커스 링이 로고, 메뉴 순서로 보여야 합니다.

### 혼자 해 보기

‹--brand›를 ‹#b5651d›로 바꾸고 흰 바탕과 카드 바탕에서 링크·버튼 글자의 대비를 DevTools로 읽어 AA에 탈락하는 조합을 모두 적으세요. 그다음 토큰 값만 고쳐 전부 4.5:1 이상으로 만들면 성공이며 컴포넌트 CSS 수정은 0줄이어야 합니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>김하늘 | 웹사이트 제작 포트폴리오</title>
<style>
:root{--bg:#fff;--surface:#f1f4f9;--text:#1c2230;--muted:#4a5568;--brand:#2456d6;--on-brand:#fff;--line:#c9d1df;--space:1rem;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#10141b;--surface:#1a202b;--text:#e8ecf3;--muted:#aab4c6;--brand:#8fb0ff;--on-brand:#10141b;--line:#334056}}
*,*::before,*::after{box-sizing:border-box}body{margin:0;font:1rem/1.7 system-ui,"Noto Sans KR","Malgun Gothic",sans-serif;word-break:keep-all;background:var(--bg);color:var(--text)}
h1{font-size:clamp(1.75rem,5vw,2.75rem);line-height:1.25}h2{font-size:1.5rem}p{color:var(--muted)}a{color:var(--brand)}
:focus-visible{outline:3px solid var(--brand);outline-offset:3px}.skip{position:absolute;left:-999px}.skip:focus{left:var(--space);top:var(--space);padding:.5rem 1rem;background:var(--bg)}
header,main,footer{max-width:60rem;margin:0 auto;padding:var(--space)}section{padding-block:calc(var(--space)*2)}
header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem 1rem}
nav{display:flex;gap:1rem}nav a{padding:.5rem;text-decoration:none}
.hero{display:grid;gap:var(--space);align-items:center}.avatar{width:8rem;height:auto;border-radius:50%}
.btn{display:inline-block;padding:.7rem 1.2rem;border-radius:8px;background:var(--brand);color:var(--on-brand);font-weight:700;text-decoration:none}
.cards{display:grid;gap:var(--space);grid-template-columns:repeat(auto-fit,minmax(min(16rem,100%),1fr))}
.card{display:flex;flex-direction:column;padding:var(--space);background:var(--surface);border:1px solid var(--line);border-radius:12px}
.card>*{margin:0 0 .5rem}.card a{margin-top:auto;align-self:flex-start}.card img{width:100%;height:auto;border-radius:8px}
footer{color:var(--muted);font-size:.9rem}
@media (min-width:48em){:root{--space:1.5rem}.hero{grid-template-columns:1fr 10rem}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
</style></head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header><a href="#about">김하늘</a>
<nav aria-label="주 메뉴"><a href="#about">소개</a><a href="#projects">프로젝트</a><a href="#contact">연락</a></nav></header>
<main id="main">
<section id="about" class="hero">
<div><h1>작은 가게를 위한 빠르고 읽기 쉬운 웹사이트를 만듭니다</h1>
<p>프리랜서 프런트엔드 개발자 김하늘입니다. HTML과 CSS로 모바일에서도 편하게 읽히는 소개 페이지를 제작합니다.</p>
<a class="btn" href="#contact">제작 문의하기</a></div>
<img class="avatar" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Crect width='8' height='8' fill='%238d99ae'/%3E%3C/svg%3E" width="160" height="160" alt="김하늘의 프로필 일러스트">
</section>
<section id="projects">
<h2>프로젝트</h2>
<div class="cards">
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23457b9d'/%3E%3C/svg%3E" width="320" height="200" alt="메뉴와 영업시간이 보이는 카페 사이트 모바일 화면"><h3>동네 카페 메뉴 사이트</h3><p>메뉴판과 위치를 한 화면에 담은 모바일 우선 사이트</p><a href="#contact">카페 사이트 문의하기</a></article>
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23b5651d'/%3E%3C/svg%3E" width="320" height="200" alt="시간표와 수강료 표가 보이는 학원 소개 화면"><h3>학원 소개 페이지</h3><p>시간표와 수강료를 표로 정리하고 상담 신청 폼을 붙였습니다</p><a href="#contact">학원 사이트 문의하기</a></article>
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23547a3a'/%3E%3C/svg%3E" width="320" height="200" alt="월별 지출 막대가 보이는 가계부 화면"><h3>개인 가계부 화면</h3><p>다크 모드와 키보드 조작까지 지원하는 연습용 화면</p><a href="#contact">가계부 화면 문의하기</a></article>
</div></section>
<section id="contact">
<h2>연락하기</h2>
<p>메일로 편하게 문의하세요: <a href="mailto:hello@example.com">hello@example.com</a></p>
</section>
</main>
<footer><p>© 2026 김하늘</p></footer>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `다크 모드는 라이트 기본 선언 아래의 ‹prefers-color-scheme› 블록에서 토큰만 재정의한다`,
        `‹color-scheme: light dark›는 브라우저가 그리는 컨트롤·스크롤바용이고 우리 색은 직접 바꿔야 한다`,
        `WCAG AA: 일반 글자 4.5:1, 큰 글자 3:1이며 반올림하지 않는다`,
        `포커스 링은 지우지 말고 ‹:focus-visible›로 바꾸고, 건너뛰기 링크는 화면 밖에 둔다`,
        `alt는 정보면 의미를, 장식이면 ‹alt=""›를 쓴다`
      ],
      pitfalls: [
        `토큰 대신 ‹#fff› 같은 색을 컴포넌트에 직접 써서 다크 모드에서 흰 박스가 남는다`,
        `다크 블록을 ‹:root› 선언보다 위에 써서 아무 효과가 없다`,
        `‹#777777› 같은 회색 글자를 "충분해 보인다"며 쓴다. 4.48:1로 AA 탈락이다`,
        `‹outline: none›, ‹display: none› 건너뛰기 링크, ‹alt="이미지"›나 파일명 alt 같은 형식적 접근성`
      ]
    },
    {
      title: `연락 폼과 HTML 기본 검증: 브라우저가 해 주는 일과 못 해 주는 일`,
      body: `7단계는 사용자 입력을 받는 첫 화면, 연락 폼입니다. 포트폴리오의 목적이 일을 받는 것이므로 이 폼이 동작하지 않으면 다른 모든 것이 의미를 잃습니다.

### 폼이 하는 일과 라벨

폼은 ‹name›이 붙은 입력칸의 이름과 값 쌍을 모아 보냅니다. ‹name›이 없는 칸은 전송되지 않습니다. ‹method="post"›는 값을 요청 본문에 담고, ‹get›이면 값이 주소창 쿼리 문자열에 붙어 기록에 남습니다. 이 예제는 서버가 없어서 마지막의 짧은 스크립트가 전송을 막고 안내 문구를 띄웁니다. ‹label›이 입력칸과 연결되면 글자를 눌러도 포커스가 가고 스크린 리더가 "이름, 필수"로 읽습니다. 연결은 ‹label for›와 ‹input id›, 또는 예제처럼 ‹label›이 입력칸을 감싸는 방식입니다. 연결하지 않으면 입력칸의 labels가 0개입니다(직접 확인). ‹placeholder›는 라벨이 아닙니다. 입력을 시작하면 사라지고 대비도 낮습니다.

### 기본 검증 속성

- ‹required›: 비어 있으면 안 됨. 체크박스는 체크해야 통과하므로 동의 항목에 씁니다.
- ‹type="email"›: 형식 검사지만 느슨해서 ‹a@b›도 통과하고 ‹a b@c.co›는 거부됩니다(직접 확인). 실수 방지일 뿐 주소가 실제로 있다는 보증이 아닙니다.
- ‹minlength›·‹maxlength›: 길이. 사용자가 직접 입력할 때만 적용되고 스크립트로 넣은 값은 보고되지 않습니다(MDN).
- ‹pattern›: 정규식이 값 전체와 일치해야 합니다(MDN: 앞뒤가 고정된 것처럼 동작). ‹[0-9]{5}›에 ‹123456›은 불일치입니다(직접 확인). 예제의 연락처 패턴은 ‹010-1234-5678›과 ‹01012345678›을 통과시키고 ‹02-123-4567›과 공백이 낀 형식은 막으며 빈 값은 선택 항목이라 통과시킵니다. ‹type="tel"›은 형식을 검사하지 않으므로(MDN) 패턴이 필요하고, ‹title›에 허용 형식 예시를 적어 둡니다.

### 검증은 언제 도는가

제출 버튼을 누르면 브라우저가 검증을 먼저 돌리고, 틀린 칸이 있으면 첫 칸에 포커스를 주고 안내 말풍선을 띄운 뒤 제출을 막습니다. 그래서 ‹submit› 이벤트 처리기는 모든 검증을 통과했을 때만 호출됩니다. 필수 칸을 비운 채 제출하면 호출이 0번, 채우면 1번이었습니다(직접 확인). ‹form›에 ‹novalidate›를 주면 브라우저 검증이 꺼져 비운 채로도 호출됩니다(직접 확인). 자체 검증 화면을 직접 만들 때만 쓰는 속성입니다.

### 스타일: :invalid와 :user-invalid

‹:invalid›는 비어 있는 필수 칸에 페이지가 열리자마자 매치됩니다(직접 확인). 이것으로 빨간 테두리를 입히면 사용자가 아무것도 하지 않았는데 폼이 온통 오류처럼 보입니다. ‹:user-invalid›는 사용자가 상호작용하거나 제출을 시도한 뒤에만 매치되고(MDN, 2023년 11월부터 주요 브라우저 지원) 예제는 이것으로 테두리를 ‹--bad› 색으로 바꿉니다. 색만으로 오류를 전하지 않도록 브라우저 말풍선 글자 안내를 그대로 두었습니다. 입력칸 테두리는 ‹--line›(1.54:1) 대신 ‹--muted›(7.53:1)로 칸의 경계가 보이게 했습니다.

### 클라이언트 검증은 보안이 아니다

HTML 검증은 사용자가 실수를 바로 고치게 돕는 UX 장치입니다. MDN도 경고하듯 우회가 쉬워서(개발자 도구로 속성 삭제, 요청 직접 전송) 서버가 같은 규칙을 다시 검증해야 합니다. 서버 검증·스팸 방지(요청 제한, 숨은 함정 칸, CAPTCHA)는 이후 백엔드 모듈에서 다룹니다. 서버가 없는 정적 사이트의 수신 방법은 세 가지입니다. ‹mailto:› 링크(사용자 PC에 메일 프로그램이 있어야 해서 불안정, 예제의 보조 문장), Formspree·Netlify Forms·Google Forms 같은 외부 서비스(요금·한도가 바뀌므로 계약 전 공식 문서 확인), 직접 만든 서버 엔드포인트. 이름·이메일은 개인정보라서 수집 목적과 보관 기간을 알리는 문구가 필요할 수 있습니다. 이는 일반 정보일 뿐 법률 자문이 아니므로 고객의 개인정보 처리방침과 전문가에게 확인하세요.

### 확인

비운 채 "보내기"를 누르면 이름 칸에 브라우저 안내가 뜨고 상태 문구는 바뀌지 않아야 합니다. 이름 한 글자, 이메일 ‹abc›, 연락처 ‹123›, 5글자 문의는 각각 막혀야 합니다. 이름 ‹김하늘›, 이메일 ‹a@b.co›, 10자 이상 문의, 동의 체크를 채우면 "접수되었습니다" 문구가 뜨고 폼이 비워져야 합니다. 제출을 시도한 뒤에는 틀린 칸의 테두리가 ‹--bad› 색이어야 합니다.

### 혼자 해 보기

'희망 예산(만 원)' 숫자 칸(‹type="number"›, ‹min›, ‹max›, ‹step›)과 '문의 종류' ‹select›를 추가하세요. 예산에 -1, 1.5, 빈 값을 넣었을 때 각각 막히는지 통과하는지 표로 적고, 통과한 값이 서버에서도 안전한지 한 줄로 평가하면 성공입니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>김하늘 | 웹사이트 제작 포트폴리오</title>
<style>
:root{--bg:#fff;--surface:#f1f4f9;--text:#1c2230;--muted:#4a5568;--brand:#2456d6;--on-brand:#fff;--line:#c9d1df;--bad:#b42318;--space:1rem;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#10141b;--surface:#1a202b;--text:#e8ecf3;--muted:#aab4c6;--brand:#8fb0ff;--on-brand:#10141b;--line:#334056;--bad:#ff9b8f}}
*,*::before,*::after{box-sizing:border-box}body{margin:0;font:1rem/1.7 system-ui,"Noto Sans KR","Malgun Gothic",sans-serif;word-break:keep-all;background:var(--bg);color:var(--text)}
h1{font-size:clamp(1.75rem,5vw,2.75rem);line-height:1.25}h2{font-size:1.5rem}p{color:var(--muted)}a{color:var(--brand)}
:focus-visible{outline:3px solid var(--brand);outline-offset:3px}.skip{position:absolute;left:-999px}.skip:focus{left:var(--space);top:var(--space);padding:.5rem 1rem;background:var(--bg)}
header,main,footer{max-width:60rem;margin:0 auto;padding:var(--space)}section{padding-block:calc(var(--space)*2)}
header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem 1rem}
nav{display:flex;gap:1rem}nav a{padding:.5rem;text-decoration:none}
.hero{display:grid;gap:var(--space);align-items:center}.avatar{width:8rem;height:auto;border-radius:50%}
.btn,button{display:inline-block;padding:.7rem 1.2rem;border:0;border-radius:8px;background:var(--brand);color:var(--on-brand);font:inherit;font-weight:700;text-decoration:none;cursor:pointer}
.cards{display:grid;gap:var(--space);grid-template-columns:repeat(auto-fit,minmax(min(16rem,100%),1fr))}
.card{display:flex;flex-direction:column;padding:var(--space);background:var(--surface);border:1px solid var(--line);border-radius:12px}
.card>*{margin:0 0 .5rem}.card a{margin-top:auto;align-self:flex-start}.card img{width:100%;height:auto;border-radius:8px}
form{display:grid;gap:var(--space);max-width:36rem}label{display:grid;gap:.25rem;font-weight:700}.check{display:flex;gap:.5rem;font-weight:400}
input:not([type=checkbox]),textarea{padding:.6rem .75rem;font:inherit;color:var(--text);background:var(--surface);border:1px solid var(--muted);border-radius:8px}
input:user-invalid,textarea:user-invalid{border-color:var(--bad)}
footer{color:var(--muted);font-size:.9rem}
@media (min-width:48em){:root{--space:1.5rem}.hero{grid-template-columns:1fr 10rem}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
</style></head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header><a href="#about">김하늘</a>
<nav aria-label="주 메뉴"><a href="#about">소개</a><a href="#projects">프로젝트</a><a href="#contact">연락</a></nav></header>
<main id="main">
<section id="about" class="hero">
<div><h1>작은 가게를 위한 빠르고 읽기 쉬운 웹사이트를 만듭니다</h1>
<p>프리랜서 프런트엔드 개발자 김하늘입니다. HTML과 CSS로 모바일에서도 편하게 읽히는 소개 페이지를 제작합니다.</p>
<a class="btn" href="#contact">제작 문의하기</a></div>
<img class="avatar" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Crect width='8' height='8' fill='%238d99ae'/%3E%3C/svg%3E" width="160" height="160" alt="김하늘의 프로필 일러스트">
</section>
<section id="projects">
<h2>프로젝트</h2>
<div class="cards">
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23457b9d'/%3E%3C/svg%3E" width="320" height="200" alt="메뉴와 영업시간이 보이는 카페 사이트 모바일 화면"><h3>동네 카페 메뉴 사이트</h3><p>메뉴판과 위치를 한 화면에 담은 모바일 우선 사이트</p><a href="#contact">카페 사이트 문의하기</a></article>
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23b5651d'/%3E%3C/svg%3E" width="320" height="200" alt="시간표와 수강료 표가 보이는 학원 소개 화면"><h3>학원 소개 페이지</h3><p>시간표와 수강료를 표로 정리하고 상담 신청 폼을 붙였습니다</p><a href="#contact">학원 사이트 문의하기</a></article>
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23547a3a'/%3E%3C/svg%3E" width="320" height="200" alt="월별 지출 막대가 보이는 가계부 화면"><h3>개인 가계부 화면</h3><p>다크 모드와 키보드 조작까지 지원하는 연습용 화면</p><a href="#contact">가계부 화면 문의하기</a></article>
</div></section>
<section id="contact">
<h2>문의하기</h2>
<form id="contact-form" method="post">
<label>이름<input name="name" autocomplete="name" required minlength="2" maxlength="30"></label>
<label>이메일<input type="email" name="email" autocomplete="email" required></label>
<label>연락처 (선택)<input type="tel" name="tel" autocomplete="tel" pattern="01[0-9]-?[0-9]{3,4}-?[0-9]{4}" title="예: 010-1234-5678"></label>
<label>문의 내용<textarea name="message" rows="4" required minlength="10" maxlength="1000"></textarea></label>
<label class="check"><input type="checkbox" name="agree" required>답변을 위해 이름과 이메일을 사용하는 것에 동의합니다</label>
<button>보내기</button><p id="status" role="status"></p></form>
<p>폼이 안 되면 <a href="mailto:hello@example.com">hello@example.com</a>으로 보내 주세요.</p>
</section>
</main>
<footer><p>© 2026 김하늘</p></footer>
<script>
document.getElementById('contact-form').addEventListener('submit', function (e) {
  e.preventDefault(); e.target.reset(); document.getElementById('status').textContent = '접수되었습니다. (연습용이라 실제로 전송되지는 않습니다)';
});
</script>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `폼은 ‹name›이 있는 칸만 전송하고, ‹label›로 연결해야 접근 가능하다`,
        `‹required›·‹type›·‹minlength›·‹maxlength›·‹pattern›(값 전체 일치)이 기본 검증이며 통과해야 ‹submit› 이벤트가 호출된다`,
        `‹:invalid›는 즉시, ‹:user-invalid›는 상호작용 뒤에 매치되므로 오류 스타일에는 후자를 쓴다`,
        `‹type="email"›은 느슨하다(‹a@b› 통과): 형식 검사는 존재 확인이 아니다`,
        `클라이언트 검증은 UX이며 서버가 같은 규칙을 다시 검증해야 한다`
      ],
      pitfalls: [
        `‹placeholder›를 라벨 대신 쓰거나 ‹label› 연결을 빼먹는다`,
        `‹name› 속성을 빼서 값이 전송되지 않는데 실제 전송 테스트를 하지 않는다`,
        `‹type="email"› 통과를 유효한 주소로 믿고 서버 검증을 생략한다`,
        `‹:invalid›로 스타일을 입혀 처음부터 빨간 폼을 보여 주거나 색만으로 오류를 전한다`
      ]
    },
    {
      title: `배포 전 점검과 무료 호스팅: 메타·성능·링크, 그리고 인계까지의 사례`,
      body: `마지막 단계는 기능이 되는 사이트를 남에게 건네도 되는 상태로 만드는 점검표입니다.

### 1. 문서 머리와 성능

- ‹title›은 "김하늘 | 웹사이트 제작 포트폴리오"처럼 누구의 무엇인지 적습니다. ‹meta name="description"›은 검색엔진이 결과 요약을 만들 때 쓰는 문장입니다(MDN). 순위 보장 수단이 아님을 고객에게 알리세요.
- Open Graph(ogp.me 기준 ‹og:title›·‹og:type›·‹og:image›·‹og:url›은 필수, ‹og:description›은 권장)는 메신저 링크 미리보기 카드를 정합니다. ‹og:url›은 정식 주소이고 명세 예시의 ‹og:image›도 모두 ‹https://› 전체 주소라서 배포 주소가 정해진 뒤에 채우므로 예제는 주석으로 남겼습니다.
- ‹theme-color›는 브라우저 UI에 제안하는 색, ‹meta name="color-scheme"›은 라이트·다크 지원을 알려 로딩 중 깜빡임을 줄이고, 파비콘이 없으면 브라우저가 따로 요청해 404가 기록됩니다.
- 작은 정적 사이트의 속도는 이미지가 좌우합니다. 모든 ‹img›에 ‹width›·‹height›를 주어 자리를 예약하세요(web.dev: 레이아웃 이동 CLS 0.1 이하 좋음, 0.25 초과 나쁨, 75번째 백분위수 기준). ‹loading="lazy"›는 첫 화면 밖의 이미지에만 줍니다. web.dev는 첫 화면 이미지에 기본값 ‹eager›를 쓰라고 안내하는데, 이 예제의 카드 이미지는 1280×800 창에서 위에서 약 650px, 375px 폰에서도 약 720px라 첫 화면에 걸려 lazy를 달지 않았습니다(직접 측정). 수 MB 원본 사진은 표시 크기의 약 2배 폭으로 줄여 올립니다.

### 2. 링크와 내용 점검

- 모든 ‹href="#id"›에 대응하는 ‹id›가 있는지 확인합니다(예제의 앵커 9개는 전부 확인했습니다). 남은 ‹href="#"›는 맨 위로 튀는 죽은 링크입니다.
- 새 탭 링크는 ‹target="_blank" rel="noopener noreferrer"›와 "(새 탭)" 안내를 씁니다. MDN은 최신 브라우저가 ‹_blank›에 noopener 효과를 암묵적으로 준다고 설명하지만, ‹rel›은 오래된 환경을 위해 명시해 둡니다.
- ‹hello@example.com›은 예시 주소입니다. 고객의 실제 주소로 바꾸는 것을 잊는 사고가 흔합니다.
- 파일명 대소문자: Windows는 ‹Logo.png›와 ‹logo.png›를 같게 보지만 리눅스 서버는 다른 파일이라 내 PC에서는 보이던 이미지가 배포 후 깨집니다.
- Chrome DevTools의 Lighthouse는 성능·접근성·SEO 등을 점검합니다(Chrome 문서). 점수보다 실패 항목 목록을 읽어 고치고, 자동 도구가 못 잡는 폭 320/375/768/1280px, 다크 모드, 키보드만으로 폼 제출, 확대 200%는 직접 봅니다.

### 3. 무료 정적 호스팅에 올리기

정적 사이트는 파일만 올리면 됩니다. GitHub Pages 공식 문서(2026-11 기준)의 흐름은 다음과 같습니다.

1. 저장소를 만든다. 사용자 사이트는 ‹사용자이름.github.io›(소문자) 이름을 쓰고, 무료 플랜은 저장소가 공개여야 한다.
2. ‹index.html›을 발행 폴더의 최상위에 올린다(웹 업로드 또는 git push).
3. 저장소 Settings의 Pages에서 발행 소스(브랜치와 폴더)를 고른다.
4. 반영에는 최대 10분이 걸릴 수 있다. 프로젝트 사이트 주소는 ‹https://사용자이름.github.io/저장소이름/›다.

한도(2026-11 기준 공식 문서)는 발행 사이트 1GB 이하, 월 대역폭 100GB, 시간당 10빌드(둘은 소프트 한도)이고, 쇼핑몰·상업용 SaaS용 무료 호스팅이나 비밀번호·카드 정보 같은 민감 거래용으로는 의도된 용도가 아니라고 밝힙니다. Cloudflare Pages 문서(2026-11 기준)는 프레임워크 없는 정적 HTML이면 빌드 명령을 ‹exit 0›으로 두고 최상위에 ‹index.html›을 두라고 안내합니다. Netlify·Vercel 등 대안은 한도와 요금이 바뀌므로 계약 전에 공식 문서로 확인하세요.

### 통합 사례: 동네 베이커리 사장님 (가상 시나리오)

사장님은 "인스타 말고 공식 사이트가 필요하다, 영업시간·메뉴·위치·예약 문의를 보여 달라, 손님은 거의 폰이다, 예산은 적고 메뉴는 가끔 바뀐다"고 말합니다. 견적 전에 사진·로고·문구를 누가 언제 주는지, 도메인과 문의 수신 방식(이메일·전화·카카오 채널), 수정 주체와 빈도를 확인합니다. 납품은 코드만이 아닙니다. 저장소와 도메인 계정을 사장님 명의로 만들고, 메뉴 수정·이미지 교체·색 변경을 적은 한 장짜리 README와 점검 결과(Lighthouse 화면, 기기별 확인)를 함께 줍니다. "메뉴를 직접 고치게 해 달라"는 요구는 사실상 CMS 구축이므로 별도 견적입니다.

### 확인

소스 보기에서 title·description·og·theme-color·파비콘이 보이고, Lighthouse 실패 항목을 하나씩 읽고 설명할 수 있어야 합니다. 게시한 주소를 폰에서 열어 같은 화면이 나오면 배포가 끝난 것입니다.`,
      code: `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>김하늘 | 웹사이트 제작 포트폴리오</title>
<meta name="description" content="소상공인과 1인 사업자를 위한 반응형 웹사이트를 만드는 프리랜서 김하늘의 포트폴리오와 문의 방법.">
<meta property="og:title" content="김하늘 | 웹사이트 제작 포트폴리오"><meta property="og:type" content="website">
<meta property="og:description" content="반응형 웹사이트 제작 사례와 문의 방법"><!-- 배포 후 주소가 정해지면 og:url, og:image(절대 주소)를 추가 -->
<meta name="theme-color" content="#2456d6"><meta name="color-scheme" content="light dark">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Crect width='8' height='8' rx='2' fill='%232456d6'/%3E%3C/svg%3E">
<style>
:root{--bg:#fff;--surface:#f1f4f9;--text:#1c2230;--muted:#4a5568;--brand:#2456d6;--on-brand:#fff;--line:#c9d1df;--bad:#b42318;--space:1rem;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#10141b;--surface:#1a202b;--text:#e8ecf3;--muted:#aab4c6;--brand:#8fb0ff;--on-brand:#10141b;--line:#334056;--bad:#ff9b8f}}
*,*::before,*::after{box-sizing:border-box}body{margin:0;font:1rem/1.7 system-ui,"Noto Sans KR","Malgun Gothic",sans-serif;word-break:keep-all;background:var(--bg);color:var(--text)}
h1{font-size:clamp(1.75rem,5vw,2.75rem);line-height:1.25}h2{font-size:1.5rem}p{color:var(--muted)}a{color:var(--brand)}
:focus-visible{outline:3px solid var(--brand);outline-offset:3px}.skip{position:absolute;left:-999px}.skip:focus{left:var(--space);top:var(--space);padding:.5rem 1rem;background:var(--bg)}
header,main,footer{max-width:60rem;margin:0 auto;padding:var(--space)}section{padding-block:calc(var(--space)*2)}
header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem 1rem}
nav{display:flex;gap:1rem}nav a{padding:.5rem;text-decoration:none}
.hero{display:grid;gap:var(--space);align-items:center}.avatar{width:8rem;height:auto;border-radius:50%}
.btn,button{display:inline-block;padding:.7rem 1.2rem;border:0;border-radius:8px;background:var(--brand);color:var(--on-brand);font:inherit;font-weight:700;text-decoration:none;cursor:pointer}
.cards{display:grid;gap:var(--space);grid-template-columns:repeat(auto-fit,minmax(min(16rem,100%),1fr))}
.card{display:flex;flex-direction:column;padding:var(--space);background:var(--surface);border:1px solid var(--line);border-radius:12px}
.card>*{margin:0 0 .5rem}.card a{margin-top:auto;align-self:flex-start}.card img{width:100%;height:auto;border-radius:8px}
form{display:grid;gap:var(--space);max-width:36rem}label{display:grid;gap:.25rem;font-weight:700}.check{display:flex;gap:.5rem;font-weight:400}
input:not([type=checkbox]),textarea{padding:.6rem .75rem;font:inherit;color:var(--text);background:var(--surface);border:1px solid var(--muted);border-radius:8px}
input:user-invalid,textarea:user-invalid{border-color:var(--bad)}
footer{color:var(--muted);font-size:.9rem}
@media (min-width:48em){:root{--space:1.5rem}.hero{grid-template-columns:1fr 10rem}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
</style></head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header><a href="#about">김하늘</a>
<nav aria-label="주 메뉴"><a href="#about">소개</a><a href="#projects">프로젝트</a><a href="#contact">연락</a></nav></header>
<main id="main">
<section id="about" class="hero">
<div><h1>작은 가게를 위한 빠르고 읽기 쉬운 웹사이트를 만듭니다</h1>
<p>프리랜서 프런트엔드 개발자 김하늘입니다. HTML과 CSS로 모바일에서도 편하게 읽히는 소개 페이지를 제작합니다.</p>
<a class="btn" href="#contact">제작 문의하기</a></div>
<img class="avatar" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Crect width='8' height='8' fill='%238d99ae'/%3E%3C/svg%3E" width="160" height="160" alt="김하늘의 프로필 일러스트">
</section>
<section id="projects">
<h2>프로젝트</h2>
<div class="cards">
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23457b9d'/%3E%3C/svg%3E" width="320" height="200" alt="메뉴와 영업시간이 보이는 카페 사이트 모바일 화면"><h3>동네 카페 메뉴 사이트</h3><p>메뉴판과 위치를 한 화면에 담은 모바일 우선 사이트</p><a href="#contact">카페 사이트 문의하기</a></article>
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23b5651d'/%3E%3C/svg%3E" width="320" height="200" alt="시간표와 수강료 표가 보이는 학원 소개 화면"><h3>학원 소개 페이지</h3><p>시간표와 수강료를 표로 정리하고 상담 신청 폼을 붙였습니다</p><a href="#contact">학원 사이트 문의하기</a></article>
<article class="card"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%23547a3a'/%3E%3C/svg%3E" width="320" height="200" alt="월별 지출 막대가 보이는 가계부 화면"><h3>개인 가계부 화면</h3><p>다크 모드와 키보드 조작까지 지원하는 연습용 화면</p><a href="#contact">가계부 화면 문의하기</a></article>
</div></section>
<section id="contact">
<h2>문의하기</h2>
<form id="contact-form" method="post">
<label>이름<input name="name" autocomplete="name" required minlength="2" maxlength="30"></label>
<label>이메일<input type="email" name="email" autocomplete="email" required></label>
<label>연락처 (선택)<input type="tel" name="tel" autocomplete="tel" pattern="01[0-9]-?[0-9]{3,4}-?[0-9]{4}" title="예: 010-1234-5678"></label>
<label>문의 내용<textarea name="message" rows="4" required minlength="10" maxlength="1000"></textarea></label>
<label class="check"><input type="checkbox" name="agree" required>답변을 위해 이름과 이메일을 사용하는 것에 동의합니다</label>
<button>보내기</button><p id="status" role="status"></p></form>
<p>폼이 안 되면 <a href="mailto:hello@example.com">hello@example.com</a>으로 보내 주세요.</p>
</section>
</main>
<footer><p>© 2026 김하늘 · 참고 문서: <a href="https://developer.mozilla.org/ko/" target="_blank" rel="noopener noreferrer">MDN Web Docs (새 탭)</a></p></footer>
<script>
document.getElementById('contact-form').addEventListener('submit', function (e) {
  e.preventDefault(); e.target.reset(); document.getElementById('status').textContent = '접수되었습니다. (연습용이라 실제로 전송되지는 않습니다)';
});
</script>
</body>
</html>`,
      codeLang: `html`,
      key: [
        `head 점검: title·description·og(절대 주소는 배포 후에)·theme-color·파비콘`,
        `이미지: width·height는 필수, lazy는 첫 화면 밖에만, 올리기 전에 크기와 용량을 줄인다`,
        `링크: 죽은 ‹#›, 예시 메일, 새 탭 ‹rel›, 파일명 대소문자를 확인한다`,
        `GitHub Pages: 발행 폴더 최상위 ‹index.html›, 반영 지연, 한도(2026-11 기준)와 용도 제한을 안다`,
        `납품은 코드와 계정 명의 이전, 한 장 README, 점검 결과까지 포함한다`
      ],
      pitfalls: [
        `‹example.com› 같은 예시 주소와 임시 문구를 그대로 납품한다`,
        `첫 화면 이미지에 lazy를 달거나 수 MB 원본 사진을 그대로 올려 느려진다`,
        `Windows에서만 보던 대소문자가 다른 파일명이 리눅스 서버에서 깨진다`,
        `결제·민감 정보를 다루는 서비스를 무료 정적 호스팅 약관 확인 없이 올린다`
      ]
    }
  ],
  labs: [
    {
      title: `내 포트폴리오로 다시 짓기: 시맨틱·토큰 점검`,
      scenario: `지금까지 만든 사이트는 가상의 김하늘 것입니다. 이번에는 본인(또는 가상의 인물)의 포트폴리오를 처음부터 직접 타이핑해서 만듭니다. 예제 코드를 복사하지 말고 1단계 구조부터 한 단계씩 올라가세요. 목표는 같은 뼈대를 다른 내용으로 혼자 재현할 수 있는지 확인하는 것입니다. 결과 파일은 ‹portfolio/index.html› 한 장이고, 점검은 브라우저 개발자 도구 콘솔과 눈으로 합니다.`,
      steps: [
        `새 폴더에 ‹index.html›을 UTF-8로 만들고 doctype·lang·charset·viewport·title을 갖춘 뼈대를 직접 타이핑한다`,
        `CSS 없이 먼저 소개·기술·프로젝트·연락 4개 이상의 ‹section›, 프로젝트 ‹article› 2개 이상, ‹nav›, ‹footer›를 만든다`,
        `‹:root›에 역할 이름의 색 토큰 8개 이상과 간격 토큰 1개를 만들고 본문·카드·링크·버튼이 토큰만 쓰게 한다`,
        `브랜드 색 후보 3개를 흰 바탕에서 DevTools 색 선택기로 대비 값을 읽어 표로 적고 4.5:1 이상인 것만 고른다`,
        `콘솔에서 ‹document.querySelectorAll('h1').length›, ‹document.querySelectorAll('main').length›를 실행해 결과를 적는다`,
        `Tab 키만으로 모든 링크에 닿는 순서를 확인하고 포커스 링이 보이는지 확인한다`,
        `브랜드 토큰 한 줄만 바꿔 전체 색이 바뀌는지 확인하고 변경 전후 화면을 저장한다`
      ],
      accept: [
        `‹h1›은 1개, ‹main›은 1개이고 제목 단계를 건너뛴 곳이 없다`,
        `‹header›·‹nav›·‹main›·‹footer›가 각각 있고 ‹section›마다 제목이 있다`,
        `스타일 안에서 ‹:root› 선언 밖에 쓴 ‹#› 16진수 색이 0개다(검색으로 확인)`,
        `선택한 브랜드 색의 흰 바탕 대비가 4.5:1 이상이고 기록한 표가 있다`,
        `Tab 순서가 화면의 읽는 순서와 같고 모든 링크에서 포커스 링이 보인다`
      ],
      stretch: `‹html› 요소의 ‹data-theme› 속성 값(‹ocean›·‹forest›·‹sunset›)에 따라 토큰을 재정의하는 선택자 ‹[data-theme="forest"]›를 만들고, DevTools에서 속성만 바꿔 세 가지 시안을 고객에게 보여 주는 화면을 구성하세요. 세 테마 모두 본문·링크 대비 4.5:1을 통과해야 합니다.`
    },
    {
      title: `갤러리 확장과 반응형 검증: 프로젝트 6개와 대표작 강조`,
      scenario: `고객이 "프로젝트 6개를 모두 보여 주고, 첫 번째 대표작은 더 크게 강조해 달라"고 합니다. 모바일에서는 한 열로, 태블릿 이상에서는 격자로 보여야 하고, 이미지가 늦게 떠도 화면이 밀리지 않아야 합니다. 4단계와 5단계에서 만든 코드를 직접 확장하되 정답 코드를 보지 않고 풀고, 각 폭에서의 결과를 콘솔 값으로 증명하세요. 결과는 폭별 측정 표 한 장으로 정리해 고객에게 보여 줄 수 있어야 합니다.`,
      steps: [
        `카드를 6개로 늘리고 모든 ‹img›에 ‹width›·‹height›·보이는 내용을 설명하는 ‹alt›를 단다`,
        `첫 번째 카드가 ‹48em› 이상에서 두 열을 차지하게 하되, 한 열 화면에서는 일반 카드와 같은 폭이 되게 한다. 쿼리 안과 밖 중 어디에 규칙을 써야 하는지 먼저 예측해 적는다`,
        `카드마다 기술 태그(예: HTML, CSS)를 ‹ul›로 넣고 Flexbox로 줄바꿈되게 한다`,
        `DevTools 장치 모드에서 폭을 320·375·768·1024·1440px로 바꿔 가며 가로 스크롤 값(‹scrollWidth - clientWidth›)과 열 수를 콘솔에서 읽어 표로 기록한다`,
        `카드 이미지 하나의 ‹width›·‹height›를 제거한 판과 있는 판을 만들고 네트워크를 느리게(스로틀링) 해서 이미지가 뜰 때 아래 내용이 밀리는지 비교해 적는다`,
        `첫 화면에 보이는 이미지는 ‹loading› 속성을 빼고, 화면 아래 카드 이미지에만 ‹lazy›를 준 이유를 한 문장으로 적는다`
      ],
      accept: [
        `폭 320·375·768·1024·1440px 다섯 곳 모두 가로 스크롤 값이 0이다`,
        `열 수가 320·375px에서 1, 768px에서 2, 1024·1440px에서 3으로 기록되어 있다`,
        `첫 번째 카드는 768px 이상에서 두 열 폭이고 375px에서는 새 열이 생기지 않는다`,
        `콘솔 ‹document.querySelectorAll('img:not([alt]), img:not([width]), img:not([height])').length›가 0이다`,
        `이미지 크기 속성 유무에 따른 레이아웃 이동 비교 결과가 기록되어 있다`
      ],
      stretch: `대표작 카드를 이미지 왼쪽·글 오른쪽의 가로 배치로 바꾸고 폭이 좁아지면 세로로 돌아오게 하세요. 미디어 쿼리 없이 Flexbox의 ‹flex-wrap›과 ‹flex-basis›만으로 구현하는 방법도 시도해 두 방식의 장단점을 세 줄로 정리하세요.`
    },
    {
      title: `고객 납품 미니 프로젝트: 동네 미용실 원페이지 사이트`,
      scenario: `고객 메시지(가상): "안녕하세요, 작은 미용실을 하고 있습니다. 인스타만 쓰다가 검색해도 나오는 공식 사이트가 필요해요. 영업시간, 시술 가격표, 오시는 길, 예약 문의가 있으면 좋겠고 손님은 거의 폰으로 봅니다. 가격은 가끔 바뀌는데 제가 직접 바꾸고 싶어요. 조카가 어두운 화면 모드도 되면 좋다네요. 도메인은 아직 없고 예산은 많지 않아요." 이 메시지를 받은 프리랜서가 되어 질문서부터 배포·인계까지 혼자 끝내세요. 이미지와 문구는 가상 자리표시를 쓰되 실제 고객에게 보낸다고 가정하고 품질을 맞춥니다.`,
      steps: [
        `메시지에서 확정된 요구와 불분명한 부분을 나누고 견적 전에 물을 질문 5개 이상(사진 제공, 가격표 항목 수, 문의 수신 방식, 도메인, 개인정보 문구 등)을 적는다`,
        `섹션 5개 이내의 사이트맵과 콘텐츠 목록 한 장을 만든다`,
        `영업시간은 ‹table›과 ‹caption›, 시술 가격표도 표로 만들고, 오시는 길은 외부 지도 서비스 링크(새 탭 안내 포함)로 둔다`,
        `예약 문의 폼을 만들고 ‹required›·‹type="email"›·‹minlength›·‹pattern› 중 4가지 이상을 쓰고 동의 체크박스를 넣는다`,
        `정적 호스팅에는 문의를 받을 서버가 없으므로 수신 방식(mailto·외부 폼 서비스·전화 중 하나)을 고르고 그 한계를 README에 한 줄로 적는다`,
        `다크 모드와 건너뛰기 링크, 한 개의 ‹h1›, 보이는 내용을 설명하는 alt를 갖춘다`,
        `Lighthouse를 돌려 결과 화면을 저장하고 실패 항목을 고친 뒤 다시 돌린다`,
        `GitHub Pages나 Cloudflare Pages로 공개 주소를 만들고 폰에서 열어 확인한다`,
        `가격표 수정·이미지 교체·색 변경·재배포 방법을 적은 한 장 README와 고객에게 보낼 납품 메시지 초안을 쓴다`
      ],
      accept: [
        `공개 HTTPS 주소에서 320px·375px·1280px 모두 가로 스크롤 값이 0이다`,
        `Lighthouse 접근성·SEO 실패 항목이 0개이거나, 남은 항목은 이유와 고객 합의 필요 여부를 적었다`,
        `빈 폼 제출 시 ‹submit› 처리기가 호출되지 않음을 콘솔 로그로 증명했다(처리기에 ‹console.log›를 넣고 확인)`,
        `다른 사람에게 README만 주고 가격 하나를 고쳐 다시 배포하게 했을 때 5분 안에 성공했다(시간 기록)`,
        `파일 전체 검색에서 ‹example.com›·임시 문구가 0건이다`
      ],
      stretch: `가격표를 ‹details›·‹summary›로 접는 버전과 영어 안내 페이지(‹lang="en"›)를 추가하고 두 페이지를 서로 링크하세요. 월 유지보수 제안서 한 장(포함 범위, 응답 시간, 제외 항목)도 작성해 보세요.`
    }
  ],
  quiz: [
    {
      q: `고객이 보낸 폰 화면 캡처에서 사이트가 데스크톱 화면을 작게 줄인 것처럼 보이고, 아래 쿼리가 적용되지 않습니다.
<head>
<meta charset="utf-8">
<title>가게 소개</title>
<style>@media (max-width: 600px) { nav { display: none; } }</style>
</head>
가장 가능성 높은 원인은?`,
      choices: [
        `max-width 쿼리는 일부 모바일 브라우저에서 지원되지 않으므로 min-width 쿼리로 바꿔야 모든 폰에서 동작한다`,
        `파일이 UTF-8이 아닌 인코딩으로 저장되어 폰 브라우저가 style 안의 CSS 규칙을 해석하지 못한다`,
        `viewport 메타 태그가 없어 모바일 브라우저가 넓은 가상 뷰포트(예: 980px)로 계산하므로 600px 쿼리가 켜지지 않는다`,
        `쿼리 블록 안쪽 규칙의 닫는 중괄호 뒤에 세미콜론이 없어서 문법 오류가 나고 쿼리 전체가 무시된다`
      ],
      answer: 2,
      why: `MDN에 따르면 viewport 메타가 없을 때 많은 모바일 브라우저는 화면보다 훨씬 넓은 가상 뷰포트로 레이아웃을 계산해 축소해 보여 주므로 600px 이하 조건이 성립하지 않습니다. "min-width로 바꿔야 한다"는 보기가 그럴듯하지만 min-width와 max-width는 모두 유효하며, 문제는 폭 값이 아니라 뷰포트가 600px에 도달하지 못한다는 점입니다.`
    },
    {
      q: `.hero가 1000px 창에서도 한 열로만 보입니다.
@media (min-width: 48em) {
  .hero { grid-template-columns: 1fr 10rem; }
}
.hero { display: grid; grid-template-columns: 1fr; }
원인은?`,
      choices: [
        `우선순위가 같으면 나중에 쓴 규칙이 이기는데, 쿼리가 기본 규칙보다 위에 있어 기본값 1fr이 덮어쓴다`,
        `48em은 1000px보다 커서 창 폭이 조건을 만족하지 못하므로 쿼리 안의 규칙이 적용되지 않는다`,
        `미디어 쿼리 안에서는 grid 관련 속성을 선언할 수 없고 display, color 같은 단순 속성만 쓸 수 있다`,
        `display: grid 선언보다 먼저 쓴 미디어 쿼리 블록은 파싱 단계에서 통째로 버려져 적용되지 않는다`
      ],
      answer: 0,
      why: `미디어 쿼리는 우선순위를 올리지 않으므로 같은 선택자에서는 소스 순서가 결과를 정합니다. 5단계 코드로 직접 측정하면 순서가 틀릴 때 912px 한 열, 쿼리를 아래로 옮기면 728px와 160px 두 열이었습니다. 48em은 16px 기준 768px이라 1000px 창에서 조건은 참이므로 "쿼리 조건이 거짓"이라는 보기는 틀립니다.`
    },
    {
      q: `375px 폰에서 가로 스크롤이 생깁니다. (main의 좌우 패딩은 16px)
.cards {
  display: grid; gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
}
가장 알맞은 수정은?`,
      choices: [
        `gap을 0으로 줄여 열 사이 간격 16px만큼 폭을 더 확보해 가로 스크롤을 없앤다`,
        `auto-fit을 auto-fill로 바꿔 빈 열을 접지 않게 해서 열 폭이 컨테이너를 넘지 않게 한다`,
        `.cards에 overflow-x: hidden을 주어 컨테이너 밖으로 넘친 부분을 잘라 낸다`,
        `minmax(min(24rem, 100%), 1fr)로 열의 최소 폭이 컨테이너를 넘지 않게 한다`
      ],
      answer: 3,
      why: `24rem은 384px로 375px 화면의 컨테이너(343px)보다 커서 25px가 넘칩니다(스크롤바 없는 모바일 기준, 직접 측정). min(24rem, 100%)로 막으면 0이 됩니다. auto-fill은 열 최소 폭이 그대로라 해결하지 못하고, 열이 하나뿐이라 gap은 폭에 영향이 없으며, overflow-x: hidden은 넘친 내용을 잘라 숨길 뿐 레이아웃을 고치지 못합니다.`
    },
    {
      q: `OS를 다크 모드로 바꿨는데 페이지 배경이 계속 흰색입니다.
@media (prefers-color-scheme: dark) {
  :root { --bg: #10141b; --text: #e8ecf3; }
}
:root { --bg: #fff; --text: #1c2230; }
body { background: var(--bg); color: var(--text); }
원인은?`,
      choices: [
        `prefers-color-scheme은 Edge·Chrome에서 지원되지 않아 Firefox 전용 설정이 필요하다`,
        `두 :root 규칙의 우선순위가 같아 나중에 쓴 라이트 값이 이긴다. 다크 블록을 라이트 선언 아래로 옮긴다`,
        `CSS 변수는 미디어 쿼리 안에서 선언할 수 없어 JavaScript로 바꿔야 한다`,
        `color-scheme: light dark가 없어서 다크 쿼리 자체가 비활성화된다`
      ],
      answer: 1,
      why: `직접 확인한 결과 다크 설정에서도 배경이 rgb(255, 255, 255)였고 순서를 바꾸면 rgb(16, 20, 27)이 되었습니다. color-scheme은 브라우저가 그리는 컨트롤과 캔버스 기본색에 관한 속성이라 쿼리의 활성 여부와 무관합니다.`
    },
    {
      q: `접근성 점검 결과 (예시)
- 항목: 글자와 배경의 색 대비가 충분하지 않음
- 요소: p.price   전경 #777777   배경 #ffffff   16px 보통 굵기
- 측정 대비: 4.48:1   필요 대비: 4.5:1
고객은 "회색 느낌은 그대로 두고 싶다"고 합니다. 가장 알맞은 조치는?`,
      choices: [
        `4.48은 소수 첫째 자리로 반올림하면 4.5이므로 AA를 통과한 것으로 보고 그대로 둔다`,
        `글자를 18px로 키워 큰 글자 기준(3:1)을 적용받게 하고 색은 그대로 둔다`,
        `회색을 조금 진하게(예: #767676, 4.54:1) 바꾸고 보조 글자 토큰 한 곳만 수정한다`,
        `글자에 연한 그림자(text-shadow)를 넣어 또렷해 보이게 하고 대비 계산에도 반영한다`
      ],
      answer: 2,
      why: `WCAG 1.4.3은 비율을 반올림하지 않는 엄격한 기준이라 4.48은 탈락입니다. #767676은 직접 계산하면 4.54:1로 통과하고 회색 느낌이 유지됩니다. 18px 보통 굵기는 큰 글자 기준(약 24px, 굵으면 약 18.5px)에 못 미쳐 여전히 4.5:1이 필요하고, 그림자는 대비 계산에 포함되지 않습니다.`
    },
    {
      q: `스크린 리더가 이 칸을 "편집, 필수"로만 읽고, 라벨 글자를 눌러도 입력칸에 포커스가 가지 않습니다.
<label>이름</label>
<input name="name" required>
원인과 수정은?`,
      choices: [
        `label이 input과 연결되지 않았다. for와 id로 연결하거나 label이 input을 감싸게 한다`,
        `required 속성 때문에 생기는 현상이다. required를 제거하면 라벨 연결 문제도 사라진다`,
        `name 속성이 라벨 글자와 같아서 충돌한다. name을 다른 값으로 바꿔야 한다`,
        `input에 placeholder="이름"을 넣으면 접근 가능한 이름이 생겨 라벨 없이도 해결된다`
      ],
      answer: 0,
      why: `연결되지 않은 label은 입력칸의 labels가 0개였고(직접 확인), 감싸거나 for/id로 연결하면 1개가 됩니다. placeholder를 일부 보조 기술이 대체 이름으로 읽을 수는 있어도 라벨 글자를 눌러도 포커스가 가지 않는 문제는 그대로이고, 입력을 시작하면 사라지며 대비도 낮아 라벨의 대체물이 아닙니다.`
    },
    {
      q: `<input name="zip" pattern="[0-9]{5}" required>
사용자가 123456(6자리)을 입력하고 제출하면?`,
      choices: [
        `앞 5자리가 일치하므로 통과한다`,
        `숫자만 들어 있으므로 통과하고 서버가 잘라 쓴다`,
        `pattern은 type="number"에서만 동작하므로 검사하지 않는다`,
        `pattern은 값 전체와 일치해야 하므로 불일치로 제출이 막힌다`
      ],
      answer: 3,
      why: `MDN의 pattern 속성 문서 설명대로 pattern은 전체 일치(앞뒤가 고정된 것처럼 동작)라 6자리는 불일치이고 직접 확인에서도 patternMismatch가 true였습니다. 부분 일치로 착각하는 것이 가장 흔한 오해이고, pattern은 text·tel·email 같은 텍스트 계열 입력에서 동작합니다.`
    },
    {
      q: `<form id="f"><input name="name" required><button>보내기</button></form>
<script>
document.getElementById('f').addEventListener('submit', function (e) {
  e.preventDefault();
  console.log('submit 호출');
});
</script>
이름을 비운 채 "보내기"를 누르면 콘솔에는?`,
      choices: [
        `'submit 호출'이 한 번 찍히고 그 뒤에 브라우저 안내가 뜬다`,
        `아무것도 찍히지 않고 브라우저의 검증 안내만 뜬다`,
        `'submit 호출'이 찍히고 required는 무시된다`,
        `오류가 발생해 스크립트가 멈춘다`
      ],
      answer: 1,
      why: `제출 시도 때 브라우저가 검증을 먼저 하고 실패하면 제출을 막으므로 submit 이벤트는 호출되지 않았습니다(직접 확인: 비움 0번, 채움 1번). 처리기가 먼저 돈다고 생각하기 쉽지만 순서가 반대입니다. novalidate를 주면 비워도 호출됩니다.`
    },
    {
      q: `클라이언트가 묻습니다. "문의 폼에 required와 type=email을 넣었으니 서버(API) 쪽 검증은 따로 안 해도 되죠? 개발비를 줄이고 싶어요." 가장 알맞은 답은?`,
      choices: [
        `맞습니다. 브라우저가 이미 잘못된 값을 막아 주므로 서버 검증은 중복 작업이라 생략해도 됩니다`,
        `서버 검증이 필요하긴 하지만 pattern 속성으로 이메일 형식을 더 엄격하게 막아 두면 그것으로 충분합니다`,
        `아닙니다. 속성은 개발자 도구나 직접 요청으로 우회할 수 있어 UX용이고, 서버가 같은 규칙을 다시 검증해야 합니다`,
        `아닙니다. 대신 폼을 JavaScript로만 제출하면 우회가 불가능해집니다`
      ],
      answer: 2,
      why: `MDN은 클라이언트 검증이 보안 수단이 아니며 서버가 반드시 다시 검증해야 한다고 경고합니다. JavaScript로 제출하더라도 공격자는 서버 주소에 직접 요청을 보낼 수 있으므로 우회가 막히지 않고, pattern을 더해도 같은 한계입니다.`
    },
    {
      q: `한 고객이 "온라인 쇼핑몰(카드 결제 포함)을 돈 안 드는 GitHub Pages에 올려 달라"고 합니다. 가장 알맞은 대응은? (2026-11 기준 GitHub 공식 문서)`,
      choices: [
        `공식 문서가 전자상거래용 무료 사이트와 카드 정보 같은 민감 거래를 의도된 용도가 아니라고 밝히므로, 쇼핑몰에 맞는 호스팅과 결제 서비스를 따로 제안한다`,
        `사이트 용량이 발행 한도인 1GB 이하이고 대역폭도 월 100GB 안에 들어오므로 용도와 상관없이 문제없이 올려도 된다고 안내한다`,
        `저장소를 비공개로 두면 용도 제한이 적용되지 않으므로 카드 결제가 붙은 쇼핑몰도 안전하게 올릴 수 있다고 안내한다`,
        `Cloudflare Pages 같은 다른 무료 서비스로 올리면 약관 확인 없이도 같은 조건이 자동으로 면제된다고 안내한다`
      ],
      answer: 0,
      why: `공식 문서의 한도(발행 1GB, 월 100GB 소프트 한도 등)는 크기 기준이고 용도 제한은 별개입니다. 비공개 저장소나 다른 서비스가 제한을 없앤다는 근거는 없으므로 각 서비스의 약관을 확인해 맞는 구성을 제안하는 것이 안전합니다.`
    },
    {
      q: `Lighthouse 보고 일부 (예시)
레이아웃 이동(CLS) 0.31 — 나쁨
원인 요소: <img src="hero.jpg" alt="가게 전경">
CSS: img { max-width: 100%; }
이미지가 늦게 뜰 때 아래 글이 밀려 내려갑니다. 가장 알맞은 수정은?`,
      choices: [
        `이 이미지에 loading="lazy"를 추가해 화면에 가까워질 때만 불러오게 하고 초기 로딩 부담을 줄인다`,
        `alt 문장을 더 길게 써서 이미지가 늦게 뜨는 동안 대체 텍스트가 이미지 자리를 충분히 채우게 한다`,
        `이미지를 JPEG에서 PNG로 바꿔 화질을 높이고 압축 방식을 바꿔 로딩을 안정적으로 만든다`,
        `width와 height 속성(예: 1200, 800)을 주고 CSS에 height: auto를 더해 비율대로 자리를 미리 잡게 한다`
      ],
      answer: 3,
      why: `MDN에 따르면 width·height 속성은 로딩 전에 비율을 계산해 자리를 예약해 레이아웃 이동을 줄입니다. 첫 화면 이미지에 lazy를 붙이면 더 늦게 뜰 수 있어 오히려 해롭고, alt나 파일 형식은 이동과 무관합니다. web.dev는 CLS 0.25 초과를 나쁨으로 봅니다.`
    },
    {
      q: `키보드 사용자를 위한 건너뛰기 링크를 만들었는데 Tab을 눌러도 나타나지 않고 포커스도 받지 못합니다.
<a class="skip" href="#main">본문으로 건너뛰기</a>
.skip { display: none; }
.skip:focus { display: block; }
원인과 수정은?`,
      choices: [
        `:focus 대신 :hover를 써야 링크가 나타나는 조건이 만족되고 마우스와 키보드 모두로 접근된다`,
        `display: none인 요소는 포커스를 받을 수 없어 :focus 규칙이 적용되지 않는다. 화면 밖(left: -999px)에 두고 포커스를 받을 때 제자리로 옮긴다`,
        `링크의 이동 대상인 main 요소에 tabindex="0"을 줘야 건너뛰기 링크 자체가 Tab으로 포커스를 받을 수 있다`,
        `a 태그는 키보드 포커스를 받지 못하는 요소이므로 button 요소와 클릭 이벤트 처리기로 바꿔야 한다`
      ],
      answer: 1,
      why: `직접 확인에서 display:none 링크의 focus() 결과는 false, 화면 밖에 둔 링크는 true였습니다. 포커스를 받지 못하면 :focus 규칙이 발동할 수 없습니다. :hover는 마우스용이고, 링크가 이동 대상이므로 button으로 바꿀 이유는 없습니다.`
    }
  ],
  refs: [
    { title: `MDN: ‹section› 요소`, url: `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/section`, kind: `doc`, why: `section에 제목이 필요한 이유, 이름 없는 section이 landmark가 아닌 규칙, div·article·nav와의 구분 기준을 확인한다.` },
    { title: `MDN: CSS 사용자 지정 속성 사용하기`, url: `https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties`, kind: `doc`, why: `var()·대체값·상속·계산 시점 무효 처리 규칙으로 토큰이 조용히 실패하는 원인을 이해한다.` },
    { title: `MDN: Flexbox 기본 개념`, url: `https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts`, kind: `doc`, why: `주축·교차축, flex-wrap, flex 축약형의 순서와 1차원 모델이라는 설명을 정확히 읽는다.` },
    { title: `MDN: repeat() 함수`, url: `https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/repeat`, kind: `doc`, why: `auto-fit과 auto-fill의 정의와 제약을 확인해 반응형 격자의 동작 원리를 설명할 수 있게 된다.` },
    { title: `MDN: 미디어 쿼리 사용하기`, url: `https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using`, kind: `doc`, why: `min-width·max-width 문법, 범위 문법, prefers-color-scheme·prefers-reduced-motion 같은 사용자 선호 기능의 목록을 본다.` },
    { title: `MDN: viewport 메타 태그`, url: `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport`, kind: `doc`, why: `모바일의 가상 뷰포트 동작과 확대를 막으면 안 되는 접근성 경고를 확인한다.` },
    { title: `MDN: prefers-color-scheme`, url: `https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme`, kind: `doc`, why: `다크 모드 미디어 기능의 값, 기본 패턴, 지원 상태를 확인한다.` },
    { title: `W3C WCAG 2.2 Understanding: 대비(최소) 1.4.3`, url: `https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html`, kind: `standard`, why: `4.5:1·3:1 기준, 큰 글자의 정의, 예외, 반올림하지 않는 규칙의 원문 설명이다.` },
    { title: `W3C WAI: 이미지 alt 결정 트리`, url: `https://www.w3.org/WAI/tutorials/images/decision-tree/`, kind: `doc`, why: `정보 이미지·장식 이미지·링크 안 이미지에 어떤 alt를 쓸지 판단하는 순서를 배운다.` },
    { title: `MDN: 클라이언트 측 폼 검증`, url: `https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation`, kind: `doc`, why: `기본 검증 속성, :valid·:invalid·:user-invalid, novalidate, 서버 검증이 필요하다는 경고를 정리한 글이다.` },
    { title: `MDN: ‹img› 요소`, url: `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img`, kind: `doc`, why: `빈 alt와 alt 생략의 차이, width·height로 자리를 예약해 레이아웃 이동을 줄이는 방법, loading의 eager·lazy 동작을 확인한다.` },
    { title: `GitHub Docs: GitHub Pages 사이트 만들기`, url: `https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site`, kind: `doc`, why: `저장소 이름, 발행 소스, index.html 위치, 반영 시간을 공식 절차로 따라 한다(화면 이름은 바뀔 수 있다).` },
    { title: `GitHub Docs: GitHub Pages 사용 한도`, url: `https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits`, kind: `doc`, why: `사이트 크기, 대역폭, 빌드 한도와 쇼핑몰·민감 거래 용도 제한을 고객 안내 전에 확인한다(수치는 변경될 수 있다).` },
    { title: `Chrome for Developers: Lighthouse 개요`, url: `https://developer.chrome.com/docs/lighthouse/overview`, kind: `tool`, why: `DevTools·명령줄·Node 모듈·PageSpeed Insights로 성능·접근성·SEO 등을 점검하는 방법을 파악한다.` }
  ],
  gigs: [
    `전형적인 의뢰: 소상공인·학원·1인 전문직의 원페이지 소개 사이트, 이벤트·신제품 랜딩 페이지, 개인 포트폴리오입니다. 고객은 흔히 인스타·네이버 지도 링크와 사진 몇 장만 들고 옵니다. 견적 전에 문구·사진·로고를 누가 언제까지 주는지, 페이지·섹션 수, 사용 기기(대부분 폰인지), 도메인과 호스팅 보유 여부를 문서로 확정하세요. 콘텐츠가 늦게 오는 것이 일정 지연의 첫째 원인입니다.`,
    `문의 폼은 가장 자주 요구되지만 정적 호스팅만으로는 수신이 안 됩니다. 이메일·카카오 채널·전화 중 어디로 받을지, 외부 폼 서비스를 써도 되는지(요금·한도는 계약 전 공식 문서로 확인), 개인정보 수집 문구와 보관 기간을 누가 정하는지를 미리 정하고, 폼 백엔드는 별도 항목으로 견적하세요. 법적 판단은 제 영역이 아니므로 고객의 처리방침이나 전문가 확인이 필요하다고 안내합니다.`,
    `산출물 목록을 계약에 적으세요: 소스 폴더(또는 저장소), 배포된 공개 주소, 한 장짜리 README(문구·이미지·색 수정과 재배포 방법), 점검 결과(Lighthouse 화면, 320·375·768·1280px 확인, 다크 모드·키보드 확인), 이미지 원본 보관본. 저장소·도메인·호스팅 계정은 처음부터 고객 명의로 만들고 제 계정에 묶어 두지 않는 것이 분쟁을 줄입니다.`,
    `견적 산정 힌트: 섹션 수×난이도(폼·표·갤러리·다크 모드·다국어)로 작업 시간을 잡고, 콘텐츠 정리·수정 라운드(보통 횟수를 계약에 명시)·배포·인계 작업을 별도 항목으로 넣습니다. 경험이 적을 때는 예상의 1.5배 안팎의 버퍼를 두는 것이 안전합니다(경험칙이며 사람마다 다릅니다). 금액 수준은 시장과 경력에 따라 달라 여기서 숫자를 제시하지 않으며 지인·플랫폼의 실제 사례와 비교해 정하세요.`,
    `흔한 함정: "메뉴를 사장님이 직접 고치게 해 달라"는 요구는 CMS 구축이라 별도 프로젝트입니다. 저화질·수 MB 원본 사진, 막판의 문구 전면 교체, 저작권이 불분명한 이미지·유료 글꼴, 검색 1페이지 노출 보장 요구(약속할 수 없음)도 자주 나옵니다. 무료 호스팅의 용도 제한(2026-11 기준 GitHub Pages는 쇼핑몰·민감 거래 용도를 의도된 용도로 보지 않음)과 한도를 확인하지 않고 약속하지 마세요.`,
    `확장 영업: 월 유지보수(문구·이미지 교체, 점검), 폼 백엔드 구축, 방문 통계 설정, 예약 연동, 성능·접근성 개선 감사, 블로그·CMS 추가로 이어집니다. 이 모듈 다음 단계인 할 일 앱·데이터 대시보드 프로젝트 모듈과 백엔드 모듈이 이 확장 요구를 감당하는 기술입니다. 본인의 포트폴리오 사이트가 곧 견본이므로 공개 주소, 반응형 화면, 점검 결과 캡처를 함께 보여 주세요.`
  ]
};
