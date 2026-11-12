(window.LANG_EXTRA = window.LANG_EXTRA || []).push({
  id: "html",
  levels: [
    {
      level: "입문",
      practice: [
        {
          title: "제목과 강조 문단",
          task: `<h1>에 "내 소개"라는 제목을 쓰고, 그 아래 <p> 문단에 "저는 HTML을 배우는 중입니다."라는 문장을 넣으세요. 문장 중 "HTML"만 <strong> 태그로 감싸야 합니다. 결과로 큰 제목 아래에 한 줄 문단이 보이고 HTML만 굵게 표시되어야 합니다.`,
          hint: `<body> 안에 <h1>과 <p>를 차례로 쓰고, <p> 안에서 HTML 글자만 <strong>과 </strong>으로 감싸세요.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>내 소개</title>
</head>
<body>
  <h1>내 소개</h1>
  <p>저는 <strong>HTML</strong>을 배우는 중입니다.</p>
</body>
</html>`,
          explain: `h1은 페이지의 가장 큰 제목이고 p는 문단입니다. strong은 감싼 글자를 중요하게 표시하며 브라우저에서 기본적으로 굵게 보입니다.`
        },
        {
          title: "링크와 이미지 넣기",
          task: `"예시 사이트"라는 글자를 누르면 https://example.com 으로 이동하는 링크를 만들고, 그 아래에 alt가 "파란 사각형"인 이미지를 넣으세요. 이미지의 src는 data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='50'%3E%3Crect width='100' height='50' fill='blue'/%3E%3C/svg%3E (파란색 사각형)로 하고 width 100, height 50을 지정합니다. 결과로 파란 사각형 위쪽에 링크 글자가 한 줄로 보여야 합니다.`,
          hint: `링크는 <a href="...">글자</a> 형태이고, 이미지는 <img src="..." alt="..."> 형태로 닫는 태그가 없습니다. 주소는 data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='50'%3E%3Crect width='100' height='50' fill='blue'/%3E%3C/svg%3E 입니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>링크와 이미지</title>
</head>
<body>
  <p><a href="https://example.com">예시 사이트</a></p>
  <img
    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='50'%3E%3Crect width='100' height='50' fill='blue'/%3E%3C/svg%3E"
    alt="파란 사각형"
    width="100"
    height="50">
</body>
</html>`,
          explain: `링크의 목적지는 href, 이미지의 파일 주소는 src에 씁니다. alt는 이미지를 볼 수 없을 때 대신 읽히는 설명이므로 내용을 알맞게 적어야 합니다.`
        },
        {
          title: "이름 입력 폼 만들기",
          task: `form 안에 "이름"이라는 label과 type이 text인 input을 만들고, label을 클릭하면 입력칸이 선택되도록 연결하세요. 입력칸 바로 뒤에 글자가 "제출"이고 type이 button인 버튼을 넣습니다. 결과로 "이름" 글자, 입력칸, 제출 버튼이 한 화면에 보이고 "이름" 글자를 누르면 입력칸에 커서가 가야 합니다.`,
          hint: `input에 id="username"을 주고 label에 for="username"을 쓰면 서로 연결됩니다. 버튼은 <button type="button">제출</button> 입니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>이름 입력</title>
</head>
<body>
  <form>
    <label for="username">이름</label>
    <input type="text" id="username">
    <button type="button">제출</button>
  </form>
</body>
</html>`,
          explain: `label의 for 값과 input의 id 값이 같으면 둘이 연결되어, 글자를 눌러도 입력칸이 선택됩니다. 버튼을 type="button"으로 두면 눌러도 폼이 전송되지 않습니다.`
        }
      ]
    },
    {
      level: "중급",
      intro: `이 단계에서는 폼 입력 요소와 표를 제대로 구성하고, 시맨틱 태그와 접근성 기본기로 의미 있는 문서를 만드는 법을 배웁니다. 또한 오디오와 비디오 같은 미디어, 그리고 head의 메타 태그를 다루는 방법을 익힙니다.`,
      lessons: [
        {
          title: "폼과 입력 요소",
          body: `<form>의 action은 데이터를 보낼 주소, method는 전송 방식(get 또는 post)입니다. 서버로 전송되는 값의 이름은 input의 name 속성이 정하므로, name이 없는 입력칸은 전송되지 않습니다. type을 email, number, date, password 등으로 지정하면 알맞은 입력 방식과 기본 검증을 브라우저가 제공하고, required, min, max, minlength, pattern 같은 속성으로 제약을 걸 수 있습니다. 여러 줄 글은 <textarea>, 선택지는 <select>와 <option>으로 만듭니다. 흔한 실수는 label을 빼먹거나 placeholder를 label 대신 쓰는 것인데, placeholder는 입력하면 사라지므로 이름표가 될 수 없습니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>회원 가입 폼</title>
</head>
<body>
  <form action="#" method="post">
    <p>
      <label for="email">이메일</label>
      <input type="email" id="email" name="email" required>
    </p>
    <p>
      <label for="age">나이</label>
      <input type="number" id="age" name="age" min="1" max="120">
    </p>
    <p>
      <label for="city">도시</label>
      <select id="city" name="city">
        <option value="seoul">서울</option>
        <option value="busan">부산</option>
      </select>
    </p>
    <p>
      <label for="memo">자기소개</label><br>
      <textarea id="memo" name="memo" rows="3" cols="30"></textarea>
    </p>
    <button type="submit">가입</button>
  </form>
</body>
</html>`
        },
        {
          title: "표 제대로 만들기",
          body: `표는 구조를 나누면 의미가 분명해집니다. <thead>는 머리글 행, <tbody>는 본문, <tfoot>는 요약 행을 묶고, <caption>은 표의 제목입니다. 제목 칸 <th>에는 scope="col"(열 제목) 또는 scope="row"(행 제목)를 지정하면 보조 기술이 칸의 의미를 이해합니다. 칸을 합칠 때는 colspan(가로)과 rowspan(세로)을 씁니다. 표는 데이터를 보여주는 용도이므로, 페이지 레이아웃을 잡으려고 표를 쓰는 것은 흔한 실수입니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>표</title>
  <style>
    table { border-collapse: collapse; }
    th, td { border: 1px solid #888; padding: 6px 12px; }
  </style>
</head>
<body>
  <table>
    <caption>과일 판매 현황</caption>
    <thead>
      <tr>
        <th scope="col">과일</th>
        <th scope="col">수량</th>
        <th scope="col">가격</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">사과</th>
        <td>3</td>
        <td>3000원</td>
      </tr>
      <tr>
        <th scope="row">바나나</th>
        <td>2</td>
        <td>2000원</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <th scope="row" colspan="2">합계</th>
        <td>5000원</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`
        },
        {
          title: "시맨틱 태그",
          body: `시맨틱 태그는 모양이 아니라 의미를 나타내는 태그입니다. <header>는 소개나 머리말 영역, <nav>는 주요 탐색 링크, <main>은 문서의 핵심 내용(문서에 하나만), <article>은 독립적으로 읽을 수 있는 글, <section>은 주제별 구획, <aside>는 부가 정보, <footer>는 꼬리말입니다. 의미 있는 태그를 쓰면 검색 엔진과 스크린 리더가 구조를 이해하고, 코드를 읽기도 쉬워집니다. 흔한 실수는 모든 곳에 의미 없는 <div>를 남발하거나, 단지 크기를 키우려고 제목 태그를 고르는 것입니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>시맨틱 레이아웃</title>
</head>
<body>
  <header>
    <h1>나의 블로그</h1>
    <nav>
      <a href="#posts">글 목록</a> |
      <a href="#about">소개</a>
    </nav>
  </header>
  <main>
    <article id="posts">
      <h2>첫 번째 글</h2>
      <p>시맨틱 태그를 쓰면 구조가 분명해집니다.</p>
    </article>
    <aside id="about">
      <h2>알림</h2>
      <p>이 영역은 부가 정보입니다.</p>
    </aside>
  </main>
  <footer>
    <p>2026 나의 블로그</p>
  </footer>
</body>
</html>`
        },
        {
          title: "접근성 기본",
          body: `접근성은 시각, 청각, 운동 능력과 상관없이 누구나 웹을 쓸 수 있게 하는 것입니다. 기본기는 html의 lang 지정, 이미지의 알맞은 alt, 입력칸과 연결된 label, 순서를 지킨 제목 계층(h1 다음에 h2)입니다. 버튼 동작은 <div>가 아니라 <button>을 써야 키보드(Tab, Enter, Space)로 조작할 수 있습니다. 장식용 이미지는 alt=""로 비워 보조 기술이 건너뛰게 합니다. 흔한 실수는 alt에 "이미지" 같은 의미 없는 말을 쓰거나, CSS로 포커스 표시를 아예 없애는 것입니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>접근성 기본</title>
</head>
<body>
  <a href="#content">본문으로 건너뛰기</a>
  <h1>접근성 점검</h1>
  <main id="content">
    <h2>이미지</h2>
    <img
      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60'%3E%3Crect width='120' height='60' fill='green'/%3E%3C/svg%3E"
      alt="초록색 사각형 로고"
      width="120"
      height="60">
    <h2>입력</h2>
    <label for="q">검색어</label>
    <input type="search" id="q" name="q">
    <button type="button">검색</button>
  </main>
</body>
</html>`
        },
        {
          title: "미디어: 오디오, 비디오, figure",
          body: `<video>와 <audio>는 controls 속성을 주면 재생 버튼이 나타납니다. 여러 형식을 제공하려면 <source>를 여러 개 넣고, 브라우저가 지원하는 첫 형식을 사용합니다. 태그 안의 대체 문구는 <video>와 <audio>를 아예 모르는 오래된 브라우저에서만 보이고, 파일을 못 불러온 경우에는 오류 상태의 플레이어가 나타납니다. 자막은 <track kind="captions">로 연결합니다. poster는 재생 전 보여줄 그림이고, 소리 있는 자동재생은 브라우저가 막는 경우가 많으므로 autoplay는 muted와 함께 써야 합니다. 이미지나 영상에 설명을 붙일 때는 <figure>와 <figcaption>을 씁니다. 아래 예제의 sample.mp4와 sample.mp3 파일은 실제로 존재하지 않으므로 poster와 컨트롤 모양만 확인하세요.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>미디어</title>
</head>
<body>
  <figure>
    <video controls width="320" height="160"
      poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='160'%3E%3Crect width='320' height='160' fill='gray'/%3E%3C/svg%3E">
      <source src="sample.mp4" type="video/mp4">
      <p>이 브라우저는 비디오를 지원하지 않습니다.</p>
    </video>
    <figcaption>그림 1. 예시 영상 영역</figcaption>
  </figure>
  <audio controls>
    <source src="sample.mp3" type="audio/mpeg">
    오디오를 재생할 수 없습니다.
  </audio>
</body>
</html>`
        },
        {
          title: "메타 태그",
          body: `메타 정보는 <head> 안에 넣으며 화면에는 보이지 않습니다. <meta charset="UTF-8">은 문자 인코딩, <meta name="viewport" content="width=device-width, initial-scale=1">은 모바일에서 화면 폭에 맞춰 보이게 합니다. <meta name="description">은 검색 결과 설명에 쓰일 수 있는 요약이고, Open Graph(og:title, og:description, og:image)는 링크를 공유할 때 나오는 미리보기 정보입니다. <link rel="icon">은 탭 아이콘을 지정합니다. 흔한 실수는 viewport를 빼먹어 모바일에서 데스크톱 폭으로 작게 보이는 것, 그리고 charset을 문서 앞쪽(처음 1024바이트 안)에 두지 않는 것입니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>메타 태그 예제</title>
  <meta name="description" content="메타 태그의 기본 사용법을 보여주는 예제 페이지입니다.">
  <meta property="og:title" content="메타 태그 예제">
  <meta property="og:description" content="링크 공유 시 보이는 설명입니다.">
  <meta name="theme-color" content="#336699">
</head>
<body>
  <h1>메타 태그 예제</h1>
  <p>head 안의 정보는 화면에 보이지 않습니다. 개발자 도구로 확인해 보세요.</p>
</body>
</html>`
        }
      ],
      quiz: [
        {
          q: "서버로 폼을 전송할 때 입력값의 이름(키)을 정하는 속성은 무엇일까요?",
          choices: ["id", "name", "for", "placeholder"],
          answer: 1,
          why: "전송되는 값의 이름은 name 속성이 정합니다. id는 label 연결이나 스타일 선택에 쓰이며 전송 이름이 아닙니다."
        },
        {
          q: `다음 코드에서 사용자가 이메일 칸을 비워 둔 채 제출 버튼을 누르면 어떻게 될까요?

<form action="#">
  <input type="email" name="email" required>
  <button type="submit">보내기</button>
</form>`,
          choices: ["그냥 제출된다", "빈 값이 서버로 전송된다", "아무 일도 일어나지 않고 경고도 없다", "브라우저가 제출을 막고 입력하라는 안내를 보여준다"],
          answer: 3,
          why: "required가 있으면 값이 비어 있을 때 브라우저의 기본 검증이 제출을 막고 안내 메시지를 보여줍니다."
        },
        {
          q: `다음 표에서 첫 번째 행의 칸은 총 몇 개의 열을 차지할까요?

<table>
  <tr><th colspan="2">이름</th><th>점수</th></tr>
  <tr><td>김</td><td>이</td><td>90</td></tr>
</table>`,
          choices: ["3개", "2개", "1개", "4개"],
          answer: 0,
          why: "colspan=\"2\"인 칸이 2열을 차지하고 점수 칸이 1열이므로 합쳐서 3열이며, 둘째 행의 칸 3개와 맞습니다."
        },
        {
          q: "표의 본문 행들을 묶는 데 알맞은 태그는 무엇일까요?",
          choices: ["<caption>", "<thead>", "<tbody>", "<tfoot>"],
          answer: 2,
          why: "<tbody>는 본문 행을, <thead>는 머리글 행을, <tfoot>은 요약 행을 묶고 <caption>은 표의 제목입니다."
        },
        {
          q: `다음 코드에서 label을 눌러도 입력칸이 선택되지 않습니다. 이유는 무엇일까요?

<label for="user">아이디</label>
<input type="text" id="name">`,
          choices: ["input에 name 속성이 없어서", "label은 input과 함께 쓸 수 없어서", "label의 for 값(user)과 input의 id 값(name)이 달라서", "type이 text라서"],
          answer: 2,
          why: "label의 for 값은 연결할 input의 id와 정확히 같아야 합니다. 여기서는 user와 name으로 서로 달라 연결되지 않습니다."
        },
        {
          q: "한 문서에서 핵심 내용을 담으며 원칙적으로 하나만 쓰는 시맨틱 태그는 무엇일까요?",
          choices: ["<main>", "<section>", "<aside>", "<article>"],
          answer: 0,
          why: "<main>은 문서의 핵심 내용을 나타내며 문서에 하나만 둡니다. section, aside, article은 여러 번 쓸 수 있습니다."
        },
        {
          q: `다음 중 장식용일 뿐 내용 전달에 필요 없는 이미지를 올바르게 처리한 코드는 무엇일까요?`,
          choices: ["<img src=\"line.png\">", "<img src=\"line.png\" alt=\"이미지\">", "<img src=\"line.png\" alt=\"line.png\">", "<img src=\"line.png\" alt=\"\">"],
          answer: 3,
          why: "장식용 이미지는 alt를 빈 문자열로 두어 보조 기술이 건너뛰게 합니다. alt를 아예 생략하면 파일 이름을 읽을 수 있어 좋지 않습니다."
        },
        {
          q: "모바일 화면에서 페이지가 화면 폭에 맞게 보이도록 head에 넣는 메타 태그는 무엇일까요?",
          choices: ["<meta charset=\"UTF-8\">", "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">", "<meta name=\"description\" content=\"...\">", "<meta property=\"og:image\" content=\"...\">"],
          answer: 1,
          why: "viewport 메타 태그가 모바일에서 레이아웃 폭을 기기 화면 폭에 맞추도록 합니다. 나머지는 인코딩, 요약, 공유 미리보기용입니다."
        }
      ],
      practice: [
        {
          title: "필수 이메일 폼",
          task: `form 안에 "이메일" label과 연결된 type이 email인 input을 만들고, 비어 있으면 제출되지 않도록 required를 지정하세요. input의 name은 email로 하고, 입력칸 바로 뒤에 글자가 "구독"인 type이 submit인 버튼을 넣으세요. 결과로 이메일 칸을 비운 채 버튼을 누르면 브라우저가 입력을 요구하는 안내를 보여야 합니다.`,
          hint: `form에는 action="#"을 주고, input에는 type="email" id="email" name="email" required를 모두 적으세요. label의 for는 id와 같아야 합니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>구독 폼</title>
</head>
<body>
  <form action="#">
    <label for="email">이메일</label>
    <input type="email" id="email" name="email" required>
    <button type="submit">구독</button>
  </form>
</body>
</html>`,
          explain: `type="email"은 이메일 형식을 검사하고 required는 빈 값을 막습니다. name이 있어야 제출될 때 값의 이름이 정해집니다.`
        },
        {
          title: "머리글이 있는 표",
          task: `caption이 "시험 점수"인 표를 만드세요. thead에는 "이름"과 "점수" 열 제목(th, scope="col")을 두고, tbody에는 한 행으로 "민수"와 "90"을 넣습니다. 결과로 제목 한 줄과 데이터 한 줄이 있는 2열 표가 보여야 합니다.`,
          hint: `table 안의 순서는 caption, thead, tbody입니다. thead와 tbody 안에 각각 tr을 쓰고, 열 제목은 th, 데이터는 td를 쓰세요.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>시험 점수</title>
  <style>
    th, td { border: 1px solid #888; padding: 4px 10px; }
  </style>
</head>
<body>
  <table>
    <caption>시험 점수</caption>
    <thead>
      <tr><th scope="col">이름</th><th scope="col">점수</th></tr>
    </thead>
    <tbody>
      <tr><td>민수</td><td>90</td></tr>
    </tbody>
  </table>
</body>
</html>`,
          explain: `caption은 표의 제목이고 thead와 tbody로 머리글과 본문을 나눕니다. th에 scope="col"을 주면 각 칸이 어느 열 제목에 속하는지 보조 기술이 알 수 있습니다.`
        },
        {
          title: "시맨틱 페이지 뼈대",
          task: `body 안에 header(안에 h1 "우리 동네"), nav(안에 링크 "홈" 하나), main(안에 article이 있고 그 안에 h2 "소식"과 p "오늘은 맑음"), footer(안에 p "끝")를 순서대로 만드세요. div는 쓰지 않습니다. 결과로 위에서 아래로 제목, 링크, 소식 제목과 문단, 꼬리말이 차례로 보여야 합니다.`,
          hint: `태그 이름 자체가 의미를 나타냅니다. header, nav, main, article, footer를 위에서 아래 순서로 쓰고 article은 main 안에 넣으세요. 링크는 href="#"으로 충분합니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>우리 동네</title>
</head>
<body>
  <header>
    <h1>우리 동네</h1>
  </header>
  <nav>
    <a href="#">홈</a>
  </nav>
  <main>
    <article>
      <h2>소식</h2>
      <p>오늘은 맑음</p>
    </article>
  </main>
  <footer>
    <p>끝</p>
  </footer>
</body>
</html>`,
          explain: `각 영역의 역할을 알려 주는 시맨틱 태그만으로 구조를 만들었습니다. 이렇게 하면 div와 class 이름에 의존하지 않고도 스크린 리더가 영역을 탐색할 수 있습니다.`
        }
      ]
    },
    {
      level: "고급",
      intro: `이 단계에서는 ARIA로 보조 기술에 정확한 정보를 전달하는 법과 반응형 이미지, template과 웹 컴포넌트의 기초를 배웁니다. 마지막으로 details, dialog, popover 같은 최신 요소와 SEO 및 성능을 위한 모범 사례를 익힙니다.`,
      lessons: [
        {
          title: "ARIA 기초: 역할과 이름",
          body: `ARIA(WAI-ARIA)는 HTML만으로 표현하기 어려운 역할, 이름, 상태를 보조 기술에 알려 주는 속성 모음입니다. 첫 번째 규칙은 알맞은 네이티브 요소(<button>, <nav> 등)가 있다면 ARIA 대신 그것을 쓰는 것입니다. 이름이 필요할 때는 눈에 보이는 글이 없으면 aria-label, 화면의 다른 요소를 이름으로 쓰려면 aria-labelledby에 그 요소의 id를 적습니다. 같은 종류의 영역이 여럿이면 이름으로 구별하게 해 줍니다. 흔한 실수는 <div role="button">에 키보드 처리를 빠뜨리는 것, 그리고 role을 잘못 붙여 오히려 접근성을 해치는 것입니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>ARIA 이름</title>
</head>
<body>
  <nav aria-label="주 메뉴">
    <a href="#a">홈</a> | <a href="#b">소개</a>
  </nav>
  <nav aria-label="페이지 하단 메뉴">
    <a href="#c">문의</a>
  </nav>
  <section aria-labelledby="news-title">
    <h2 id="news-title">최신 소식</h2>
    <p>section은 위 제목을 이름으로 가집니다.</p>
  </section>
  <button type="button" aria-label="닫기">&times;</button>
</body>
</html>`
        },
        {
          title: "ARIA 상태와 라이브 영역",
          body: `aria-expanded, aria-pressed, aria-current, aria-hidden 같은 상태 속성은 값이 바뀔 때마다 JavaScript로 갱신해야 합니다. aria-expanded는 버튼이 제어하는 영역이 펼쳐졌는지(true) 접혔는지(false)를 알려 주고, aria-controls는 제어 대상의 id를 가리킵니다. 화면 일부가 바뀌었음을 읽어 주게 하려면 aria-live="polite"인 영역에 내용을 바꿔 넣습니다. 흔한 실수는 상태 속성을 처음에만 쓰고 이후 갱신하지 않아 실제 화면과 보조 기술의 정보가 어긋나는 것이며, 이를 막으려면 화면이 바뀌는 코드와 속성 갱신을 한 곳에 묶는 것이 좋습니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>ARIA 상태</title>
</head>
<body>
  <button type="button" id="toggle" aria-expanded="false" aria-controls="panel">
    자세히 보기
  </button>
  <div id="panel" hidden>
    <p>여기에 자세한 내용이 있습니다.</p>
  </div>
  <p id="status" aria-live="polite"></p>
  <script>
    const btn = document.getElementById('toggle');
    const panel = document.getElementById('panel');
    const statusEl = document.getElementById('status');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
      statusEl.textContent = open ? '접혔습니다' : '펼쳐졌습니다';
    });
  </script>
</body>
</html>`
        },
        {
          title: "반응형 이미지",
          body: `화면 크기와 해상도에 맞는 이미지를 내려받게 하면 데이터를 아끼고 선명도도 지킬 수 있습니다. <img>의 srcset에 후보 파일과 실제 가로 폭을 w 단위로 적고, sizes에 이미지가 화면에서 차지할 너비를 알려 주면 브라우저가 알맞은 파일을 고릅니다. 화면에 따라 이미지 자체를 바꾸는 아트 디렉션이 필요하면 <picture> 안에 media 조건이 있는 <source>를 쓰고 마지막에 기본 <img>를 둡니다. 어떤 경우에도 <img>에는 alt와 width, height를 넣어 로딩 중 화면이 밀리지 않게 합니다. 흔한 실수는 sizes를 생략하는 것인데, 이러면 브라우저가 이미지가 화면 전체 폭만큼 클 것이라고 가정해 필요 이상으로 큰 파일을 고를 수 있습니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>반응형 이미지</title>
  <style>
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <img
    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect width='400' height='200' fill='steelblue'/%3E%3C/svg%3E"
    srcset="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='200'%3E%3Crect%20width='400'%20height='200'%20fill='steelblue'/%3E%3C/svg%3E 400w,
            data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='800'%20height='400'%3E%3Crect%20width='800'%20height='400'%20fill='steelblue'/%3E%3C/svg%3E 800w"
    sizes="(max-width: 400px) 100vw, 400px"
    alt="파란색 배너"
    width="400"
    height="200">
</body>
</html>`
        },
        {
          title: "template과 웹 컴포넌트 개념",
          body: `<template>은 화면에 렌더링되지 않는 HTML 조각으로, JavaScript에서 content를 cloneNode(true)로 복제해 필요할 때 문서에 넣습니다. 웹 컴포넌트는 브라우저 표준으로 만드는 재사용 요소이며, 커스텀 엘리먼트(customElements.define), Shadow DOM(캡슐화된 DOM과 스타일), template과 slot으로 구성됩니다. 커스텀 엘리먼트 이름에는 반드시 하이픈이 있어야 하며(예: user-card), 클래스는 HTMLElement를 상속합니다. Shadow DOM 안의 스타일 규칙은 바깥에 새지 않고, 바깥의 선택자와 규칙도 안의 요소에 적용되지 않습니다. 다만 color나 font처럼 상속되는 속성과 CSS 변수(--이름)는 경계를 넘어 안으로 전달됩니다. 흔한 실수는 이름에 하이픈을 빼먹거나, 같은 template을 복제하지 않고 content를 그대로 삽입해 한 번밖에 쓰지 못하는 것입니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>웹 컴포넌트</title>
</head>
<body>
  <template id="card-tpl">
    <style>
      div { border: 1px solid #888; padding: 8px; }
      strong { color: crimson; }
    </style>
    <div><strong><slot name="title">제목 없음</slot></strong>: <slot>내용 없음</slot></div>
  </template>

  <user-card>
    <span slot="title">공지</span>
    웹 컴포넌트 예제입니다.
  </user-card>
  <user-card></user-card>

  <script>
    class UserCard extends HTMLElement {
      connectedCallback() {
        const tpl = document.getElementById('card-tpl');
        const root = this.attachShadow({ mode: 'open' });
        root.appendChild(tpl.content.cloneNode(true));
      }
    }
    customElements.define('user-card', UserCard);
  </script>
</body>
</html>`
        },
        {
          title: "details, dialog, popover",
          body: `<details>와 <summary>는 JavaScript 없이 펼치고 접는 영역을 만들며, open 속성이 있으면 처음부터 펼쳐집니다. 같은 name 값을 가진 여러 details는 하나만 열리는 아코디언처럼 동작합니다. <dialog>는 대화 상자 요소로, showModal()로 열면 배경을 막는 모달이 되고 Esc 키로 닫히며 포커스 관리도 브라우저가 도와줍니다. 닫을 때는 close()를 부르거나 안의 <form method="dialog"> 버튼을 씁니다. popover 속성이 있는 요소는 popovertarget을 가진 버튼으로 JavaScript 없이 열고 닫을 수 있습니다. 흔한 실수는 모달을 띄우려고 show()를 부르는 것인데, show()는 배경을 막지 않는 비모달로 엽니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>최신 요소</title>
</head>
<body>
  <details open>
    <summary>자주 묻는 질문</summary>
    <p>details는 스크립트 없이 접고 펼칠 수 있습니다.</p>
  </details>

  <button type="button" id="openDlg">대화 상자 열기</button>
  <dialog id="dlg">
    <p>모달 대화 상자입니다.</p>
    <form method="dialog">
      <button>닫기</button>
    </form>
  </dialog>

  <button type="button" popovertarget="tip">도움말</button>
  <div id="tip" popover>팝오버 안내문입니다.</div>

  <script>
    document.getElementById('openDlg').addEventListener('click', () => {
      document.getElementById('dlg').showModal();
    });
  </script>
</body>
</html>`
        },
        {
          title: "SEO와 성능 모범 사례",
          body: `검색 엔진 최적화(SEO)의 기본은 페이지마다 고유한 <title>과 meta description, 의미 있는 제목 구조(보통 h1은 한 개), 설명이 담긴 링크 글자와 alt입니다. 같은 내용의 주소가 여럿이면 <link rel="canonical">로 대표 주소를 알려 주고, JSON-LD(script type="application/ld+json")로 구조화 데이터를 제공하면 검색 결과를 풍부하게 만드는 데 도움이 됩니다. 성능 면에서는 이미지에 width와 height를 지정해 화면 밀림을 막고, 화면 밖 이미지는 loading="lazy", 화면 첫머리의 중요한 이미지는 loading="lazy"를 쓰지 않으며 필요하면 fetchpriority="high"를 줍니다. 스크립트는 defer로 불러 HTML 파싱을 막지 않게 합니다. 흔한 실수는 첫 화면 이미지에까지 lazy를 걸어 오히려 느려지게 하는 것입니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HTML 심화 학습 가이드</title>
  <meta name="description" content="HTML 중급과 고급 내용을 정리한 학습 가이드입니다.">
  <link rel="canonical" href="https://example.com/html-guide">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "HTML 심화 학습 가이드"
  }
  </script>
</head>
<body>
  <h1>HTML 심화 학습 가이드</h1>
  <img
    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='100'%3E%3Crect width='300' height='100' fill='teal'/%3E%3C/svg%3E"
    alt="청록색 배너"
    width="300"
    height="100"
    fetchpriority="high">
  <h2>아래쪽 이미지</h2>
  <img
    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='100'%3E%3Crect width='300' height='100' fill='purple'/%3E%3C/svg%3E"
    alt="보라색 배너"
    width="300"
    height="100"
    loading="lazy">
</body>
</html>`
        }
      ],
      quiz: [
        {
          q: "ARIA의 첫 번째 규칙에 가장 알맞은 설명은 무엇일까요?",
          choices: ["모든 요소에 role을 붙인다", "div에 aria 속성을 많이 붙일수록 좋다", "알맞은 네이티브 HTML 요소가 있으면 ARIA 대신 그것을 쓴다", "aria-label은 항상 title 속성으로 대체한다"],
          answer: 2,
          why: "네이티브 요소(button, nav 등)는 역할, 키보드 동작, 상태를 이미 갖추고 있어, ARIA는 그것으로 부족할 때만 보충해야 합니다."
        },
        {
          q: `다음 버튼을 처음 눌러 패널이 펼쳐진 직후, 스크립트가 aria-expanded를 올바르게 갱신했다면 값은 무엇일까요?

<button aria-expanded="false" aria-controls="p">보기</button>
(클릭 시 패널이 열림)`,
          choices: ["true", "false", "open", "expanded"],
          answer: 0,
          why: "aria-expanded는 true 또는 false 값을 가지며, 펼쳐진 상태면 true여야 합니다. 상태가 바뀔 때 스크립트로 같이 갱신해야 합니다."
        },
        {
          q: `다음 코드에서 스크린 리더가 section의 이름으로 읽는 글은 무엇일까요?

<section aria-labelledby="t">
  <h2 id="t">공지사항</h2>
  <h3>작은 제목</h3>
</section>`,
          choices: ["작은 제목", "section", "t", "공지사항"],
          answer: 3,
          why: "aria-labelledby는 id가 t인 요소의 내용을 이름으로 사용하므로, 이름은 h2의 글인 공지사항입니다."
        },
        {
          q: `다음 img에서 sizes 속성이 하는 일은 무엇일까요?

<img src="s.jpg" srcset="s.jpg 400w, l.jpg 800w" sizes="(max-width: 600px) 100vw, 400px" alt="풍경">`,
          choices: ["이미지의 실제 파일 크기를 줄인다", "화면에서 이미지가 차지할 너비를 브라우저에 알려 알맞은 후보를 고르게 한다", "이미지를 강제로 400px로 확대한다", "alt 대신 설명을 제공한다"],
          answer: 1,
          why: "sizes는 레이아웃에서 이미지가 차지할 폭을 알려 주는 힌트이며, 브라우저가 srcset 후보 중 알맞은 것을 고르는 데 씁니다."
        },
        {
          q: "화면 폭에 따라 서로 다르게 잘린(아트 디렉션) 이미지를 보여 주려면 어떤 구조가 알맞을까요?",
          choices: ["<img> 여러 개를 나란히 둔다", "<picture> 안에 media 조건이 있는 <source>를 넣고 마지막에 <img>를 둔다", "<video>에 poster를 여러 개 지정한다", "<figure>에 srcset을 지정한다"],
          answer: 1,
          why: "picture 안의 source에 media 조건을 걸어 상황별 이미지를 고르게 하고, 마지막 img가 기본값이자 필수 요소 역할을 합니다."
        },
        {
          q: `다음 코드를 실행하면 customElements.define에서 오류가 납니다. 이유는 무엇일까요?

class Card extends HTMLElement {}
customElements.define('card', Card);`,
          choices: ["클래스가 HTMLElement를 상속해서", "template을 사용하지 않아서", "Shadow DOM이 없어서", "커스텀 엘리먼트 이름에 하이픈이 없어서"],
          answer: 3,
          why: "커스텀 엘리먼트 이름은 기존 태그와 충돌하지 않도록 반드시 하이픈을 포함해야 합니다. 예를 들어 my-card처럼 써야 합니다."
        },
        {
          q: `다음 코드에서 button을 눌렀을 때 일어나는 일은 무엇일까요?

<dialog id="d"><p>안녕</p></dialog>
<button onclick="document.getElementById('d').showModal()">열기</button>`,
          choices: ["대화 상자가 열리고 배경을 막는 모달로 동작한다", "비모달로 열려 뒤 화면을 계속 조작할 수 있다", "dialog에 open 속성이 없어서 아무 일도 없다", "페이지가 새 탭으로 이동한다"],
          answer: 0,
          why: "showModal()은 dialog를 모달로 열어 배경 조작을 막고 Esc로 닫히게 합니다. 비모달로 열려면 show()를 사용합니다."
        },
        {
          q: "화면 첫머리에 바로 보이는 대표 이미지와 페이지 맨 아래 이미지에 대한 설명으로 가장 알맞은 것은 무엇일까요?",
          choices: ["둘 다 loading=\"lazy\"를 걸어야 한다", "맨 아래 이미지에만 width와 height를 쓴다", "둘 다 alt를 생략해도 된다", "첫머리 이미지는 lazy를 쓰지 않고, 맨 아래 이미지에 loading=\"lazy\"를 쓴다"],
          answer: 3,
          why: "화면에 바로 보이는 이미지에 lazy를 걸면 로딩이 늦어질 수 있습니다. 화면 밖 이미지에만 lazy를 쓰고 모든 이미지에 width, height, alt를 지정합니다."
        }
      ],
      practice: [
        {
          title: "접고 펼치는 FAQ",
          task: `details와 summary로 FAQ 한 항목을 만드세요. summary 글자는 "배송은 얼마나 걸리나요?", 펼쳐지는 p 내용은 "보통 2일 걸립니다."이며, 처음부터 펼쳐진 상태로 보여야 합니다. 결과로 질문과 답이 함께 보이고 질문을 누르면 답이 접혀야 합니다.`,
          hint: `<details> 안에 <summary>와 <p>를 차례로 쓰고, 처음부터 펼치려면 details 태그에 open 속성을 적으세요.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>FAQ</title>
</head>
<body>
  <details open>
    <summary>배송은 얼마나 걸리나요?</summary>
    <p>보통 2일 걸립니다.</p>
  </details>
</body>
</html>`,
          explain: `summary는 항상 보이는 제목이고 나머지 내용이 펼침 영역이 됩니다. open 속성은 처음 상태를 펼침으로 만들며 JavaScript가 필요 없습니다.`
        },
        {
          title: "srcset과 sizes 지정",
          task: `img 하나에 srcset과 sizes를 지정하세요. srcset에는 가로 폭 200인 작은 파일 "small.png 200w"와 400인 "large.png 400w"를 쓰고, sizes는 "200px"로 지정합니다. alt는 "상품 사진", width는 200, height는 100으로 하고 src는 small.png로 합니다. 결과로 실제 파일이 없으므로 200x100 크기의 이미지 자리에 깨진 이미지 표시와 alt 글자 "상품 사진"이 보이며, 소스에는 srcset과 sizes가 올바르게 들어 있어야 합니다.`,
          hint: `srcset의 각 후보는 "파일 이름 폭w" 형식이며 쉼표로 구분합니다. sizes에는 이미지가 차지할 너비를 적습니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>srcset</title>
</head>
<body>
  <img
    src="small.png"
    srcset="small.png 200w, large.png 400w"
    sizes="200px"
    alt="상품 사진"
    width="200"
    height="100">
</body>
</html>`,
          explain: `srcset은 후보 파일과 그 실제 폭을, sizes는 화면에서 차지할 폭을 알려 주어 브라우저가 알맞은 파일을 고르게 합니다. width와 height로 로딩 전에도 자리를 확보합니다.`
        },
        {
          title: "template 복제해 목록 만들기",
          task: `빈 ul(id가 list)과 template(id가 item, 안에 글자가 "항목"인 li 하나)을 직접 만드세요. 그리고 script에서 template의 content를 두 번 복제해 ul에 붙이세요. 결과로 화면에 "항목" 글자가 있는 li가 정확히 2개 보여야 합니다.`,
          hint: `document.getElementById('item').content.cloneNode(true)로 복제하고 ul.appendChild로 붙이세요. for문으로 2번 반복하면 됩니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>template</title>
</head>
<body>
  <ul id="list"></ul>
  <template id="item"><li>항목</li></template>
  <script>
    const list = document.getElementById('list');
    const tpl = document.getElementById('item');
    for (let i = 0; i < 2; i++) {
      list.appendChild(tpl.content.cloneNode(true));
    }
  </script>
</body>
</html>`,
          explain: `template의 content는 화면에 나타나지 않는 조각이므로 cloneNode(true)로 복제해 붙여야 합니다. 복제하면 같은 template을 여러 번 쓸 수 있습니다.`
        }
      ]
    }
  ]
});
