(window.LANG_DATA = window.LANG_DATA || []).push({
  id: "css",
  name: "CSS",
  kind: "웹 페이지 스타일링 언어",
  runnable: "html",
  use: "웹 페이지의 색, 글꼴, 간격, 배치 같은 겉모습을 꾸미는 데 쓰입니다. HTML과 함께 거의 모든 웹사이트와 웹 앱에서 사용됩니다.",
  tip: "CSS는 프로그래밍 언어라기보다 HTML 요소가 어떻게 보일지 정하는 스타일 규칙 언어입니다.",
  intro: "CSS(Cascading Style Sheets)는 HTML로 만든 문서에 스타일을 입히는 언어입니다. HTML이 글, 제목, 버튼 같은 내용의 뼈대를 만든다면 CSS는 그 뼈대의 색, 크기, 위치를 정해 줍니다. 규칙이 단순해서 코드를 바꾸면 결과가 바로 화면에 보이므로 입문하기 좋습니다.",
  lessons: [
    {
      title: "CSS 규칙의 모양: 선택자와 선언",
      body: "CSS는 '선택자 { 속성: 값; }' 형태의 규칙으로 이루어집니다. 선택자는 꾸밀 대상을 고르고, 중괄호 안의 선언은 속성과 값을 콜론(:)으로 이어 쓰고 세미콜론(;)으로 끝냅니다. 아래 예제는 h1 요소의 글자색을 바꾸고 p 요소의 글자 크기를 정합니다. /* ... */ 로 감싼 부분은 주석이라 화면에 영향을 주지 않습니다.",
      code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    /* h1 요소를 고르는 규칙 */
    h1 {
      color: royalblue;
    }
    p {
      font-size: 20px;
    }
  </style>
</head>
<body>
  <h1>안녕하세요, CSS!</h1>
  <p>이 문단은 글자 크기가 20px입니다.</p>
</body>
</html>`
    },
    {
      title: "클래스와 id 선택자",
      body: "요소 이름 대신 class 속성으로 이름표를 붙여 원하는 요소만 고를 수 있습니다. 클래스 선택자는 점(.)으로 시작하며 여러 요소가 같은 클래스를 함께 쓸 수 있습니다. id 선택자는 샵(#)으로 시작하고, 한 문서에서 id는 하나의 요소에만 붙이는 것이 원칙입니다.",
      code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .highlight {
      background-color: yellow;
    }
    #title {
      color: crimson;
    }
  </style>
</head>
<body>
  <h1 id="title">클래스와 id</h1>
  <p class="highlight">노란 배경 문단</p>
  <p>꾸미지 않은 문단</p>
  <p class="highlight">이 문단도 노란 배경</p>
</body>
</html>`
    },
    {
      title: "색상, 글꼴, 정렬",
      body: "color는 글자색, background-color는 배경색을 정합니다. font-family로 글꼴을 지정하고, 목록의 마지막에 sans-serif 같은 일반 글꼴 이름을 넣어 두면 앞의 글꼴이 없을 때 대신 쓰입니다. font-weight: bold는 굵게, text-align: center는 가운데 정렬입니다. 색은 이름(tomato), 16진수 코드(#336699), rgb() 등으로 쓸 수 있습니다.",
      code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      background-color: #f4f4f4;
      font-family: "Malgun Gothic", sans-serif;
    }
    h1 {
      color: #336699;
      text-align: center;
    }
    .note {
      color: rgb(200, 40, 40);
      font-weight: bold;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>색상과 글꼴</h1>
  <p class="note">굵고 붉은 가운데 정렬 글자</p>
</body>
</html>`
    },
    {
      title: "박스 모델: padding, border, margin",
      body: "브라우저는 모든 요소를 사각형 상자로 다룹니다. 안쪽부터 내용(content), 안쪽 여백(padding), 테두리(border), 바깥 여백(margin) 순서로 이루어집니다. padding은 내용과 테두리 사이를, margin은 테두리 바깥과 다른 요소 사이를 띄웁니다. width로 너비를 정할 수도 있습니다.",
      code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .box {
      width: 200px;
      padding: 20px;
      border: 3px solid darkgreen;
      margin: 30px;
      background-color: honeydew;
    }
  </style>
</head>
<body>
  <div class="box">안쪽 여백 20px, 테두리 3px, 바깥 여백 30px인 상자</div>
  <div class="box">두 번째 상자</div>
</body>
</html>`
    },
    {
      title: "Flexbox로 가로 배치하기",
      body: "부모 요소에 display: flex를 주면 자식 요소들이 기본적으로 가로 한 줄로 배치됩니다. gap은 자식 사이의 간격을 정하고, justify-content는 가로 방향 정렬을, align-items는 세로 방향 정렬을 정합니다. 아래 예제는 세 개의 상자를 가운데에 간격을 두고 늘어놓습니다.",
      code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      height: 150px;
      background-color: #eef;
    }
    .item {
      width: 80px;
      height: 80px;
      background-color: steelblue;
      color: white;
      text-align: center;
      line-height: 80px;
    }
  </style>
</head>
<body>
  <div class="row">
    <div class="item">1</div>
    <div class="item">2</div>
    <div class="item">3</div>
  </div>
</body>
</html>`
    }
  ],
  quiz: [
    {
      q: "CSS 규칙 'p { color: red; }'에서 'p'는 무엇입니까?",
      choices: ["속성", "선택자", "값", "주석"],
      answer: 1,
      why: "중괄호 앞에서 꾸밀 대상을 고르는 부분이 선택자입니다. color는 속성, red는 값입니다."
    },
    {
      q: "클래스 선택자를 쓸 때 이름 앞에 붙이는 기호는 무엇입니까?",
      choices: ["#", "*", "@", "."],
      answer: 3,
      why: "클래스 선택자는 점(.)으로 시작하고, 샵(#)은 id 선택자에 씁니다."
    },
    {
      q: "내용과 테두리 사이의 안쪽 여백을 정하는 속성은 무엇입니까?",
      choices: ["padding", "margin", "border", "gap"],
      answer: 0,
      why: "padding은 내용과 테두리 사이의 안쪽 여백이고, margin은 테두리 바깥쪽 여백입니다."
    },
    {
      q: "CSS에서 주석을 쓰는 올바른 방법은 무엇입니까?",
      choices: ["// 주석", "<!-- 주석 -->", "# 주석", "/* 주석 */"],
      answer: 3,
      why: "CSS 주석은 /* 로 시작해 */ 로 끝납니다. <!-- --> 는 HTML 주석입니다."
    },
    {
      q: "자식 요소들을 가로로 배치하는 Flexbox를 켜려면 부모 요소에 어떤 선언을 쓰나요?",
      choices: ["display: block;", "display: flex;", "text-align: flex;", "margin: flex;"],
      answer: 1,
      why: "부모에 display: flex를 지정하면 그 자식들이 플렉스 아이템이 되어 기본적으로 가로로 배치됩니다."
    },
    {
      q: "글자색을 바꾸는 속성은 무엇입니까?",
      choices: ["font-weight", "background-color", "color", "text-align"],
      answer: 2,
      why: "color가 글자색을 정합니다. background-color는 배경색, font-weight는 굵기, text-align은 정렬입니다."
    }
  ]
});
