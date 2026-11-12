(window.LANG_DATA = window.LANG_DATA || []).push({
  id: "html", name: "HTML", kind: "웹 페이지 구조를 만드는 마크업 언어", runnable: "html",
  use: "웹 페이지의 뼈대와 내용을 만드는 데 쓰입니다. 모든 웹사이트와 웹 앱의 기본이 됩니다.",
  tip: "HTML은 프로그래밍 언어가 아니라 문서의 구조를 표시하는 마크업 언어이며, 꾸미기는 CSS, 동작은 JavaScript가 맡습니다.",
  intro: "HTML(HyperText Markup Language)은 웹 페이지에 어떤 내용이 있는지 브라우저에 알려주는 언어입니다. 제목, 문단, 링크, 이미지 같은 내용을 태그라는 표시로 감싸서 구조를 만듭니다. 파일 하나만 있으면 브라우저에서 바로 결과를 볼 수 있어 입문하기 좋습니다.",
  lessons: [
    {
      title: "HTML 문서의 기본 구조",
      body: "HTML 문서는 <!DOCTYPE html>로 시작하고, 전체를 <html> 태그가 감쌉니다. <head> 안에는 페이지 정보(제목, 문자 인코딩 등)를 넣고, <body> 안에는 화면에 실제로 보이는 내용을 넣습니다. <title>은 브라우저 탭에 표시되는 이름입니다. 한글이 깨지지 않게 <meta charset=\"UTF-8\">를 head에 넣어 주세요.",
      code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>나의 첫 페이지</title>
</head>
<body>
  안녕하세요, HTML 세계에 오신 것을 환영합니다!
</body>
</html>`
    },
    {
      title: "제목과 문단",
      body: "제목은 <h1>부터 <h6>까지 있으며, 숫자가 작을수록 더 큰 제목입니다. 글 단락은 <p> 태그로 감쌉니다. 글자를 굵게 강조하려면 <strong>, 기울여 강조하려면 <em>을 사용합니다. 태그는 <p>처럼 열고 </p>처럼 닫는 것이 기본입니다.",
      code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>제목과 문단</title>
</head>
<body>
  <h1>가장 큰 제목</h1>
  <h2>그보다 작은 제목</h2>
  <p>이것은 <strong>굵게</strong> 강조한 글자와 <em>기울인</em> 글자가 있는 문단입니다.</p>
  <p>문단은 이렇게 따로 나뉩니다.</p>
</body>
</html>`
    },
    {
      title: "링크와 이미지",
      body: "<a> 태그는 다른 페이지로 이동하는 링크를 만들며, 이동할 주소는 href 속성에 적습니다. <img> 태그는 이미지를 보여주며, 파일 주소는 src 속성에, 이미지를 설명하는 대체 텍스트는 alt 속성에 적습니다. img는 닫는 태그가 없는 빈 태그입니다. 아래 예제의 이미지는 주소 대신 코드로 직접 넣은 간단한 그림입니다.",
      code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>링크와 이미지</title>
</head>
<body>
  <p><a href="https://example.com" target="_blank" rel="noopener">예시 사이트로 이동</a></p>
  <img
    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='80'%3E%3Crect width='160' height='80' fill='orange'/%3E%3C/svg%3E"
    alt="주황색 사각형"
    width="160"
    height="80">
</body>
</html>`
    },
    {
      title: "목록과 표",
      body: "순서가 없는 목록은 <ul>, 순서가 있는 목록은 <ol>로 만들고, 각 항목은 <li>로 씁니다. 표는 <table>로 만들며, 한 행은 <tr>, 제목 칸은 <th>, 일반 칸은 <td>로 표현합니다. 기본 상태의 표는 테두리가 없어서, 예제에서는 border 속성으로 선을 보이게 했습니다.",
      code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>목록과 표</title>
</head>
<body>
  <h2>좋아하는 과일</h2>
  <ul>
    <li>사과</li>
    <li>바나나</li>
  </ul>
  <h2>할 일 순서</h2>
  <ol>
    <li>일어나기</li>
    <li>공부하기</li>
  </ol>
  <table border="1">
    <tr>
      <th>과일</th>
      <th>가격</th>
    </tr>
    <tr>
      <td>사과</td>
      <td>1000원</td>
    </tr>
  </table>
</body>
</html>`
    },
    {
      title: "입력 양식(폼)",
      body: "<form> 태그 안에 입력칸과 버튼을 넣어 사용자에게 입력을 받을 수 있습니다. <input> 태그의 type 속성으로 글자 입력, 체크박스 같은 종류를 정하고, <label>은 입력칸의 이름표 역할을 합니다. label의 for 값과 input의 id 값을 같게 하면 서로 연결됩니다. <button>은 누르는 버튼입니다. 아래 예제는 서버로 보내지 않도록 버튼 type을 button으로 지정했습니다.",
      code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>입력 양식</title>
</head>
<body>
  <form>
    <label for="name">이름</label>
    <input type="text" id="name" placeholder="이름을 입력하세요">
    <br><br>
    <input type="checkbox" id="agree">
    <label for="agree">약관에 동의합니다</label>
    <br><br>
    <button type="button">확인</button>
  </form>
</body>
</html>`
    }
  ],
  quiz: [
    {
      q: "웹 페이지 화면에 실제로 보이는 내용을 넣는 태그는 무엇일까요?",
      choices: ["<head>", "<body>", "<title>", "<meta>"],
      answer: 1,
      why: "화면에 보이는 내용은 <body> 안에 넣습니다. <head>에는 제목, 문자 인코딩 같은 페이지 정보를 넣습니다."
    },
    {
      q: "다음 중 가장 큰 제목을 만드는 태그는 무엇일까요?",
      choices: ["<h6>", "<h3>", "<h2>", "<h1>"],
      answer: 3,
      why: "<h1>부터 <h6>까지 숫자가 작을수록 더 큰 제목이며, <h1>이 가장 큽니다."
    },
    {
      q: "<a> 태그에서 이동할 주소를 적는 속성은 무엇일까요?",
      choices: ["href", "src", "alt", "type"],
      answer: 0,
      why: "링크의 목적지 주소는 href 속성에 적습니다. src는 이미지 같은 파일의 주소를 적을 때 씁니다."
    },
    {
      q: "<img> 태그의 alt 속성은 무엇을 위한 것일까요?",
      choices: ["이미지의 파일 주소", "이미지의 크기", "이미지를 설명하는 대체 텍스트", "이미지를 누르면 이동할 주소"],
      answer: 2,
      why: "alt는 이미지를 설명하는 대체 텍스트로, 이미지를 볼 수 없을 때 대신 쓰입니다."
    },
    {
      q: "번호가 매겨지는 순서 있는 목록을 만드는 태그는 무엇일까요?",
      choices: ["<ul>", "<li>", "<tr>", "<ol>"],
      answer: 3,
      why: "<ol>은 순서 있는 목록, <ul>은 순서 없는 목록입니다. <li>는 목록의 각 항목입니다."
    },
    {
      q: "표(table)에서 한 줄(행)을 나타내는 태그는 무엇일까요?",
      choices: ["<td>", "<tr>", "<th>", "<li>"],
      answer: 1,
      why: "<tr>이 표의 한 행을 나타내며, 그 안에 제목 칸 <th>나 일반 칸 <td>를 넣습니다."
    }
  ]
});
