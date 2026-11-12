(window.LANG_EXTRA = window.LANG_EXTRA || []).push({
  id: "css",
  levels: [
    {
      level: "입문",
      practice: [
        {
          title: "클래스로 제목 꾸미기",
          task: `<h1 class="title">나의 첫 페이지</h1>를 직접 작성하고, .title 선택자로 글자색을 tomato로, 가로 정렬을 가운데로 만드세요. 기대 결과는 화면 가로 가운데에 토마토색(주황빛 붉은색) 제목 '나의 첫 페이지'가 보이는 것입니다.`,
          hint: `클래스 선택자는 점(.)으로 시작합니다. 글자색은 color, 가운데 정렬은 text-align입니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .title {
      color: tomato;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1 class="title">나의 첫 페이지</h1>
</body>
</html>`,
          explain: `.title은 class="title"이 붙은 요소를 고르는 클래스 선택자입니다. color는 글자색을, text-align: center는 줄 안의 내용을 가운데로 정렬합니다.`
        },
        {
          title: "박스 모델로 카드 만들기",
          task: `.card 요소에 너비 150px, 안쪽 여백 15px, 2px 실선 회색(gray) 테두리, 바깥 여백 20px, 배경색 #eeeeee를 지정하세요. 기대 결과는 회색 테두리가 있는 연회색 상자가 화면 가장자리에서 떨어져 보이는 것입니다.`,
          hint: `안쪽 여백은 padding, 바깥 여백은 margin입니다. 테두리는 border: 굵기 종류 색 순서로 한 줄에 씁니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .card {
      width: 150px;
      padding: 15px;
      border: 2px solid gray;
      margin: 20px;
      background-color: #eeeeee;
    }
  </style>
</head>
<body>
  <div class="card">카드 내용</div>
</body>
</html>`,
          explain: `padding은 내용과 테두리 사이, margin은 테두리 바깥 간격입니다. border 단축 속성은 굵기, 선 종류, 색을 한 번에 지정합니다.`
        },
        {
          title: "Flexbox로 상자 세 개 가운데 놓기",
          task: `HTML에 <div class="row">를 만들고 그 안에 <div class="item"></div> 세 개를 넣으세요. .row를 Flexbox 컨테이너로 만들어 .item 세 개를 가로로 배치하되, .row의 높이는 100px, 배경색은 #eef, 가로 방향은 가운데 정렬, 세로 방향도 가운데 정렬, 항목 사이 간격은 10px로 합니다. 각 .item은 너비 50px, 높이 50px, 배경색 steelblue로 지정합니다. 기대 결과는 파란 상자 세 개가 연한 배경 띠의 정중앙에 나란히 놓이는 것입니다.`,
          hint: `부모에 display: flex를 주고, justify-content, align-items, gap을 사용합니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      height: 100px;
      background-color: #eef;
    }
    .item {
      width: 50px;
      height: 50px;
      background-color: steelblue;
    }
  </style>
</head>
<body>
  <div class="row">
    <div class="item"></div>
    <div class="item"></div>
    <div class="item"></div>
  </div>
</body>
</html>`,
          explain: `display: flex는 자식들을 플렉스 아이템으로 만들고, 기본 가로 방향에서 justify-content는 가로, align-items는 세로 정렬을 담당합니다. gap은 아이템 사이에만 간격을 넣습니다.`
        }
      ]
    },
    {
      level: "중급",
      intro: `이 단계에서는 요소 크기가 실제로 어떻게 계산되는지(박스 모델), Flexbox로 레이아웃을 짜는 법, 어떤 규칙이 이기는지 결정하는 상속과 명시도를 배웁니다. 이어서 CSS 변수로 값을 재사용하고, 미디어 쿼리로 화면 너비에 맞춰 반응형으로 바꾸는 방법까지 익힙니다.`,
      lessons: [
        {
          title: "박스 모델 깊게 보기: box-sizing과 margin 상쇄",
          body: `기본값인 box-sizing: content-box에서는 width가 내용 영역의 너비만 뜻하므로, 실제로 화면에서 차지하는 너비는 width에 padding과 border를 더한 값입니다. box-sizing: border-box를 쓰면 width에 padding과 border가 포함되어 계산이 직관적이라 실무에서 많이 씁니다. 또 위아래로 이웃한 블록 요소의 세로 margin은 더해지지 않고 큰 쪽 하나로 합쳐지는데, 이를 margin 상쇄(collapse)라고 합니다. 부모에 padding이나 border가 없으면 첫 자식의 위쪽 margin이 부모 바깥으로 새어 나가 보이기도 하는데, 부모에 display: flow-root를 주면 이를 막을 수 있습니다. 흔한 실수는 width: 100%에 padding을 더해 content-box 상태로 부모를 넘치게 만드는 것입니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .box {
      width: 200px;
      padding: 20px;
      border: 5px solid navy;
      background-color: lightyellow;
      margin-bottom: 10px;
    }
    .bb { box-sizing: border-box; }
    .m { margin: 0; padding: 8px; }
    .a { margin-bottom: 30px; background-color: #cfc; }
    .b { margin-top: 20px; background-color: #fcc; }
    .parent { background-color: #ddd; }
    .child { margin-top: 40px; background-color: #9cf; }
    .fix { display: flow-root; }
  </style>
</head>
<body>
  <div class="box">content-box: 실제 너비 250px</div>
  <div class="box bb">border-box: 실제 너비 200px</div>
  <p class="m a">위 문단 (아래 margin 30px)</p>
  <p class="m b">아래 문단 (위 margin 20px): 간격은 50px이 아니라 30px</p>
  <div class="parent"><div class="child">부모 밖으로 margin이 새어 나감</div></div>
  <div class="parent fix"><div class="child">flow-root로 부모 안에 가둠</div></div>
</body>
</html>`
        },
        {
          title: "Flexbox 기초: 주축과 교차축",
          body: `Flexbox는 한 방향의 줄 위에 아이템을 배치하는 레이아웃입니다. flex-direction이 주축(main axis) 방향을 정하며 기본값은 row(가로)이고, 교차축(cross axis)은 그에 수직입니다. justify-content는 주축 방향 정렬을, align-items는 교차축 방향 정렬을 맡으므로, flex-direction: column으로 바꾸면 두 속성이 담당하는 화면 방향도 바뀝니다. 가장 흔한 실수는 '가로는 justify, 세로는 align'이라고 외워서 column에서 헷갈리는 것입니다. gap은 아이템 사이에만 간격을 주므로 margin보다 다루기 쉽습니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      height: 120px;
      padding: 10px;
      background-color: #eef;
    }
    .col {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      height: 150px;
      margin-top: 10px;
      background-color: #efe;
    }
    .item {
      padding: 10px 20px;
      background-color: steelblue;
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="item">A</div>
    <div class="item">B</div>
    <div class="item">C</div>
  </div>
  <div class="col">
    <div class="item">세로 배치 1</div>
    <div class="item">세로 배치 2</div>
  </div>
</body>
</html>`
        },
        {
          title: "Flexbox 크기 조절: flex와 flex-wrap",
          body: `flex는 flex-grow, flex-shrink, flex-basis를 묶은 단축 속성으로, flex: 1은 남는 공간을 비율 1로 나눠 받겠다는 뜻입니다(1 1 0%와 같습니다). flex: 0 0 150px처럼 쓰면 늘지도 줄지도 않고 기본 크기가 150px로 고정됩니다. 아이템이 한 줄에 다 들어가지 않을 때 기본값 flex-wrap: nowrap에서는 아이템이 줄어들며 한 줄을 유지하지만, flex-wrap: wrap을 주면 다음 줄로 넘어갑니다. 흔한 실수는 긴 내용이 있는 아이템이 줄어들지 않아 넘치는 경우인데, 이때 min-width: 0을 주면 해결되는 경우가 많습니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .layout {
      display: flex;
      gap: 10px;
      height: 100px;
    }
    .side {
      flex: 0 0 120px;
      background-color: #fc9;
    }
    .main {
      flex: 1;
      background-color: #9cf;
    }
    .wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      width: 250px;
      margin-top: 10px;
      background-color: #eee;
    }
    .tile {
      width: 100px;
      height: 40px;
      background-color: seagreen;
    }
  </style>
</head>
<body>
  <div class="layout">
    <div class="side">고정 120px</div>
    <div class="main">남는 공간 전부</div>
  </div>
  <div class="wrap">
    <div class="tile"></div>
    <div class="tile"></div>
    <div class="tile"></div>
  </div>
</body>
</html>`
        },
        {
          title: "상속과 우선순위(명시도)",
          body: `일부 속성(color, font-family, line-height 등 글자 관련)은 부모에서 자식으로 상속되지만, margin, padding, border처럼 박스 관련 속성은 상속되지 않습니다. 같은 요소에 여러 규칙이 충돌하면 먼저 중요도와 출처를 보고, 그다음 명시도(specificity)를 비교하며, 명시도가 같으면 나중에 쓴 규칙이 이깁니다. 명시도는 (id 개수, 클래스·속성·가상 클래스 개수, 요소·가상 요소 개수) 순서로 비교하며 id 하나가 클래스 아무리 많아도 이깁니다. 인라인 style 속성은 일반 선택자보다 강하고, !important는 이를 뒤집을 수 있지만 남용하면 덮어쓰기가 어려워지므로 마지막 수단으로만 씁니다. 흔한 실수는 규칙이 안 먹을 때 선택자를 점점 길게 만들어 명시도 전쟁을 일으키는 것입니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      color: darkgreen;
      border: 3px solid black;
    }
    p { color: gray; }
    .note { color: blue; }
    p.note { color: orange; }
    #special { color: crimson; }
    p.note { color: purple; }
  </style>
</head>
<body>
  <div>상속: body의 color를 물려받아 초록색 (border는 상속되지 않음)</div>
  <p>p 선택자: 회색</p>
  <p class="note">p.note 둘 중 나중 규칙: 보라색</p>
  <p class="note" id="special">id 선택자가 이겨서 붉은색</p>
  <p class="note" style="color: teal;">인라인 style이 이겨서 청록색</p>
</body>
</html>`
        },
        {
          title: "CSS 변수(사용자 정의 속성)",
          body: `--이름: 값; 형태로 선언한 사용자 정의 속성을 var(--이름)으로 꺼내 쓰면 같은 값을 여러 곳에서 재사용할 수 있습니다. 보통 :root에 전역 변수를 선언하고, 특정 요소에서 같은 이름을 다시 선언하면 그 요소와 자손에서만 값이 바뀌어 테마 전환에 유용합니다. var(--이름, 대체값)처럼 두 번째 인자를 주면 변수가 없을 때 대체값이 쓰입니다. 변수 이름은 대소문자를 구분하며, 흔한 실수는 --Main으로 선언하고 var(--main)으로 쓰는 것입니다. 변수는 기본적으로 상속되고, JavaScript의 setProperty로 값을 바꾸면 화면이 즉시 갱신됩니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    :root {
      --main: #3366cc;
      --pad: 12px;
    }
    .btn {
      padding: var(--pad);
      background-color: var(--main);
      color: white;
      border: 2px solid var(--edge, black);
      margin-bottom: 8px;
    }
    .theme-red {
      --main: crimson;
      --edge: darkred;
    }
  </style>
</head>
<body>
  <div class="btn">기본 버튼 (파랑, 테두리는 대체값 black)</div>
  <div class="theme-red">
    <div class="btn">같은 .btn인데 빨강 테마 (변수만 다름)</div>
  </div>
</body>
</html>`
        },
        {
          title: "미디어 쿼리와 반응형 레이아웃",
          body: `@media 규칙은 조건이 참일 때만 안의 CSS를 적용합니다. 가장 흔한 조건은 뷰포트 너비로, (min-width: 600px)는 너비가 600px 이상일 때, (max-width: 600px)는 600px 이하일 때 적용됩니다. 작은 화면용 스타일을 기본으로 쓰고 min-width로 큰 화면을 덧붙이는 모바일 우선(mobile-first) 방식이 관리하기 쉽습니다. 모바일에서 제대로 동작하려면 HTML head에 meta viewport 태그가 필요하며, 빠뜨리면 모바일 브라우저가 데스크톱 너비로 렌더링해 쿼리가 기대대로 동작하지 않습니다. 너비 외에도 prefers-color-scheme(다크 모드), prefers-reduced-motion(움직임 줄이기) 같은 사용자 환경 조건을 쓸 수 있습니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    .cards {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .card {
      padding: 16px;
      background-color: #cde;
    }
    @media (min-width: 600px) {
      .cards {
        flex-direction: row;
      }
      .card {
        flex: 1;
      }
    }
  </style>
</head>
<body>
  <p>창 너비가 600px 이상이면 가로, 미만이면 세로로 쌓입니다.</p>
  <div class="cards">
    <div class="card">카드 1</div>
    <div class="card">카드 2</div>
    <div class="card">카드 3</div>
  </div>
</body>
</html>`
        }
      ],
      quiz: [
        {
          q: `다음 CSS가 적용된 요소가 화면에서 실제로 차지하는 가로 너비는 얼마입니까?\n.box { width: 200px; padding: 20px; border: 5px solid black; }`,
          choices: ["200px", "250px", "240px", "210px"],
          answer: 1,
          why: `기본값 content-box에서는 width가 내용 영역이므로 200 + 좌우 padding 40 + 좌우 border 10 = 250px입니다.`
        },
        {
          q: `다음 CSS에서 두 문단이 위아래로 이웃해 있을 때 둘 사이의 간격은?\np.a { margin-bottom: 30px; }\np.b { margin-top: 20px; }`,
          choices: ["20px", "50px", "10px", "30px"],
          answer: 3,
          why: `이웃한 블록의 세로 margin은 합쳐지지 않고 더 큰 값 하나로 상쇄되므로 30px입니다.`
        },
        {
          q: `다음 CSS에서 아이템은 컨테이너 안 어디에 놓입니까?\n.c { display: flex; flex-direction: column; justify-content: center; align-items: flex-start; height: 300px; }`,
          choices: ["세로로는 가운데, 가로로는 왼쪽", "가로로는 가운데, 세로로는 위쪽", "세로와 가로 모두 가운데", "세로로는 위쪽, 가로로는 오른쪽"],
          answer: 0,
          why: `column이면 주축이 세로이므로 justify-content: center가 세로 가운데를, 교차축인 가로에서는 align-items: flex-start가 왼쪽(시작) 정렬을 만듭니다.`
        },
        {
          q: `너비 400px인 flex 컨테이너(gap, padding, border 없음) 안에 두 아이템이 있습니다. 각 아이템의 너비는?\n.a { flex: 1; }\n.b { flex: 3; }`,
          choices: ["각각 200px", "각각 100px", ".a는 100px, .b는 300px", ".a는 300px, .b는 100px"],
          answer: 2,
          why: `flex: 1과 flex: 3은 기본 크기 0에서 시작해 남는 공간을 1:3으로 나누므로 400px이 100px과 300px로 분배됩니다.`
        },
        {
          q: `다음 HTML과 CSS에서 div의 글자색은?\n<div id="box" class="box big">\n#box { color: red; }\ndiv.box.big { color: blue; }`,
          choices: ["red", "blue", "검정(기본값)", "두 색이 섞인 색"],
          answer: 0,
          why: `#box는 id 하나(1,0,0)이고 div.box.big은 클래스 둘과 요소 하나(0,2,1)이므로, id가 포함된 쪽이 더 높아 red가 적용됩니다.`
        },
        {
          q: `다음 중 부모에서 자식으로 기본적으로 상속되는 속성은 무엇입니까?`,
          choices: ["margin", "padding", "color", "border"],
          answer: 2,
          why: `color는 상속되는 속성이라 부모에 지정하면 자식 글자색에도 적용됩니다. margin, padding, border는 상속되지 않습니다.`
        },
        {
          q: `다음 CSS에서 .t의 글자색은 무엇입니까? (--missing 변수는 어디에도 선언되지 않았습니다)\n.t { color: var(--missing, green); }`,
          choices: ["상속된 기본 검정색", "선언이 무효라 red", "아무 색도 지정되지 않는다", "green"],
          answer: 3,
          why: `var()의 두 번째 인자는 변수가 없을 때 쓰는 대체값입니다. --missing이 없으므로 green이 사용됩니다.`
        },
        {
          q: `@media (min-width: 600px) { ... } 안의 규칙은 언제 적용됩니까?`,
          choices: ["뷰포트 너비가 600px 이하일 때", "뷰포트 너비가 600px 이상일 때", "프린터로 출력할 때만", "요소의 너비가 600px 이상일 때"],
          answer: 1,
          why: `min-width는 뷰포트 너비의 최솟값 조건이라 너비가 600px 이상일 때 참이 됩니다. 요소의 너비를 기준으로 하는 것은 컨테이너 쿼리입니다.`
        }
      ],
      practice: [
        {
          title: "border-box로 정확한 카드 너비 만들기",
          task: `.card 두 개가 padding 20px과 5px 실선 테두리를 가지면서, 테두리를 포함한 전체 너비가 정확히 300px이 되도록 하세요. 두 카드는 위아래로 놓이며 그 사이 margin 상쇄를 신경 쓸 필요는 없습니다. 기대 결과는 개발자 도구에서 측정했을 때 두 카드의 가로 너비가 모두 300px인 것입니다.`,
          hint: `width: 300px을 주고 box-sizing을 바꾸면 padding과 border가 width 안에 포함됩니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .card {
      box-sizing: border-box;
      width: 300px;
      padding: 20px;
      border: 5px solid navy;
      margin-bottom: 10px;
      background-color: lightyellow;
    }
  </style>
</head>
<body>
  <div class="card">카드 1</div>
  <div class="card">카드 2</div>
</body>
</html>`,
          explain: `box-sizing: border-box에서는 width가 padding과 border를 포함한 값이므로 내용 영역은 300 - 40 - 10 = 250px이 되고 전체 너비는 300px입니다. content-box였다면 총 350px이 되었을 것입니다.`
        },
        {
          title: "Flexbox로 사이드바와 본문 나누기",
          task: `HTML에 <div class="layout"> 안에 <div class="side">사이드바</div>와 <div class="main">본문</div>을 넣으세요. .layout 안에서 둘을 가로로 배치하되, .side는 너비 150px로 고정(늘지도 줄지도 않음)하고 배경색 #fc9, .main은 남은 공간을 모두 차지하고 배경색 #9cf로 지정합니다. 둘 사이 간격은 10px이고 .layout의 높이는 100px입니다. 기대 결과는 왼쪽에 150px 주황색 상자, 오른쪽에 나머지 너비를 채우는 파란 상자가 보이는 것입니다.`,
          hint: `.layout에 display: flex와 gap을 주고, .side에는 flex: 0 0 150px, .main에는 flex: 1을 씁니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .layout {
      display: flex;
      gap: 10px;
      height: 100px;
    }
    .side {
      flex: 0 0 150px;
      background-color: #fc9;
    }
    .main {
      flex: 1;
      background-color: #9cf;
    }
  </style>
</head>
<body>
  <div class="layout">
    <div class="side">사이드바</div>
    <div class="main">본문</div>
  </div>
</body>
</html>`,
          explain: `flex: 0 0 150px는 grow 0, shrink 0, basis 150px이라 너비가 고정됩니다. flex: 1은 나머지 공간을 모두 받아 창 크기에 따라 본문 너비가 변합니다.`
        },
        {
          title: "변수와 미디어 쿼리로 간격 바꾸기",
          task: `:root에 변수 --gap을 8px로 선언하고, .list를 세로 방향 flex 컨테이너로 만들어 gap에 var(--gap)을 쓰세요. 뷰포트 너비가 600px 이상이면 --gap을 24px로 바꾸고 .list를 가로 방향으로 바꿉니다. 기대 결과는 좁은 화면에서는 항목 사이가 8px인 세로 목록, 넓은 화면에서는 24px 간격의 가로 목록입니다.`,
          hint: `@media (min-width: 600px) 안에서 :root의 --gap을 다시 선언하고 flex-direction: row를 지정합니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --gap: 8px;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: var(--gap);
    }
    .list div {
      padding: 10px;
      background-color: #cde;
    }
    @media (min-width: 600px) {
      :root { --gap: 24px; }
      .list { flex-direction: row; }
    }
  </style>
</head>
<body>
  <div class="list">
    <div>항목 1</div>
    <div>항목 2</div>
    <div>항목 3</div>
  </div>
</body>
</html>`,
          explain: `미디어 쿼리 안에서 변수 값을 바꾸면 var(--gap)을 쓰는 모든 곳이 한꺼번에 바뀝니다. 기본 스타일이 모바일용이고 min-width로 큰 화면을 덧붙이는 모바일 우선 구조입니다.`
        }
      ]
    },
    {
      level: "고급",
      intro: `이 단계에서는 2차원 레이아웃인 Grid, 부드러운 움직임을 만드는 전환과 애니메이션, 부모 크기에 반응하는 컨테이너 쿼리를 배웁니다. 이어서 :has() 같은 최신 선택자, 레이어와 중첩으로 CSS를 구조화하는 법, 렌더링 성능을 지키는 습관까지 다룹니다.`,
      lessons: [
        {
          title: "CSS Grid: 2차원 레이아웃",
          body: `Grid는 행과 열을 동시에 다루는 레이아웃으로, 한 방향만 다루는 Flexbox와 달리 페이지 전체 구조를 짜는 데 알맞습니다. display: grid 컨테이너에서 grid-template-columns로 열을 정의하고, 1fr은 남는 공간의 한 몫을 뜻합니다. grid-template-areas로 영역에 이름을 붙여 배치하면 코드가 그림처럼 읽히고, grid-column: span 2처럼 아이템이 여러 칸을 차지하게 할 수도 있고, grid-column: 1 / 3처럼 선 번호로 범위를 줄 수도 있습니다(선은 칸 사이의 경계라 1/3은 첫째와 둘째 칸 두 개입니다). repeat(auto-fit, minmax(80px, 1fr))를 쓰면 미디어 쿼리 없이도 화면 너비에 맞춰 열 수가 자동으로 바뀌는 갤러리를 만들 수 있습니다. 흔한 실수는 grid-template-areas의 각 행에서 열 수를 맞추지 않거나, 영역 이름을 아이템에 grid-area로 지정하지 않는 것입니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .page {
      display: grid;
      grid-template-columns: 120px 1fr;
      grid-template-areas:
        "header header"
        "side   main"
        "footer footer";
      gap: 8px;
    }
    .page > div { padding: 12px; background-color: #cde; }
    .header { grid-area: header; }
    .side { grid-area: side; }
    .main { grid-area: main; }
    .footer { grid-area: footer; }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      gap: 8px;
      margin-top: 12px;
    }
    .gallery div { height: 40px; background-color: seagreen; }
    .gallery .wide { grid-column: span 2; background-color: darkorange; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">헤더</div>
    <div class="side">사이드</div>
    <div class="main">본문</div>
    <div class="footer">푸터</div>
  </div>
  <div class="gallery">
    <div class="wide"></div>
    <div></div>
    <div></div>
    <div></div>
  </div>
</body>
</html>`
        },
        {
          title: "전환(transition)과 애니메이션(@keyframes)",
          body: `transition은 속성 값이 바뀔 때 그 사이를 부드럽게 보간하며, transition: 속성 시간 타이밍함수 지연 순서로 씁니다. 상태가 바뀔 때(예: :hover)만 동작하고 값이 바뀌는 속성만 대상이 되며, display: none처럼 보간할 수 없는 값은 일반적으로 전환되지 않습니다. 반복이나 자동 재생이 필요하면 @keyframes로 단계를 정의하고 animation 속성으로 이름, 시간, 횟수, 방향을 지정합니다. animation: pulse 1s ease-in-out infinite alternate는 1초짜리 애니메이션을 무한히 앞뒤로 재생합니다. 움직임에 민감한 사용자를 위해 @media (prefers-reduced-motion: reduce)로 애니메이션을 끄거나 줄이는 배려를 권장합니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background-color: steelblue;
      color: white;
      transition: background-color 0.3s ease, transform 0.3s ease;
    }
    .btn:hover {
      background-color: darkorange;
      transform: scale(1.1);
    }
    @keyframes pulse {
      from { opacity: 1; }
      to { opacity: 0.3; }
    }
    .dot {
      width: 40px;
      height: 40px;
      margin-top: 20px;
      border-radius: 50%;
      background-color: crimson;
      animation: pulse 1s ease-in-out infinite alternate;
    }
    @media (prefers-reduced-motion: reduce) {
      .dot { animation: none; }
    }
  </style>
</head>
<body>
  <div class="btn">마우스를 올려 보세요</div>
  <div class="dot"></div>
</body>
</html>`
        },
        {
          title: "컨테이너 쿼리",
          body: `미디어 쿼리가 뷰포트 너비를 보는 반면, 컨테이너 쿼리는 부모 컨테이너의 크기를 보고 스타일을 바꿉니다. 같은 카드 컴포넌트를 넓은 본문에도, 좁은 사이드바에도 넣을 때 위치에 맞춰 알아서 모양이 바뀌므로 재사용 가능한 컴포넌트에 알맞습니다. 먼저 부모에 container-type: inline-size를 지정해 컨테이너로 만들고, 그 자손에 @container (min-width: 400px) { ... }로 규칙을 씁니다. 쿼리 대상이 되는 요소는 컨테이너의 자손이어야 하며 컨테이너 자기 자신은 자기 크기로 스타일링할 수 없습니다. inline-size 컨테이너는 가로 크기가 자식 내용에 의존하지 않는 것으로 취급되므로, 너비가 내용에 따라 정해지는 요소에 쓰면 폭이 0처럼 줄어들 수 있다는 점이 흔한 실수입니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .wrap {
      container-type: inline-size;
      margin-bottom: 16px;
      border: 2px dashed gray;
    }
    .card {
      padding: 12px;
      background-color: #cde;
    }
    .card .thumb {
      width: 60px;
      height: 60px;
      background-color: seagreen;
    }
    @container (min-width: 400px) {
      .card {
        display: flex;
        gap: 12px;
        background-color: #fdc;
      }
    }
  </style>
</head>
<body>
  <div class="wrap" style="width: 250px;">
    <div class="card"><div class="thumb"></div><p>좁은 컨테이너: 세로 배치</p></div>
  </div>
  <div class="wrap" style="width: 500px;">
    <div class="card"><div class="thumb"></div><p>넓은 컨테이너: 가로 배치</p></div>
  </div>
</body>
</html>`
        },
        {
          title: ":has()와 최신 선택자",
          body: `:has()는 '자손이나 형제 조건을 만족하는 요소'를 부모 쪽에서 고르는 관계 선택자로, 예를 들어 label:has(input:checked)는 체크된 입력을 품은 label을 고릅니다. 이전에는 자식 상태로 부모를 꾸미려면 JavaScript가 필요했습니다. :is()는 여러 선택자를 묶어 중복을 줄이고, :where()는 같은 역할이지만 명시도가 0이라 덮어쓰기 쉬운 기본 스타일에 알맞으며, :not()은 조건을 부정합니다. :is(), :not(), :has()의 명시도는 안에 든 가장 높은 선택자의 명시도를 따릅니다. :focus-visible은 키보드 이동처럼 포커스 표시가 필요할 때만 매칭됩니다. 흔한 실수는 :has() 안에 :has()를 중첩하는 것으로, 이는 허용되지 않습니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    label {
      display: block;
      padding: 8px;
      margin-bottom: 6px;
      border: 2px solid #ccc;
    }
    label:has(input:checked) {
      background-color: lightgreen;
      border-color: seagreen;
    }
    :is(h2, h3) {
      color: navy;
    }
    li:not(.done) {
      font-weight: bold;
    }
    button:focus-visible {
      outline: 3px solid orange;
    }
  </style>
</head>
<body>
  <h2>선택한 항목은 초록 배경</h2>
  <label><input type="checkbox" checked> 체크됨</label>
  <label><input type="checkbox"> 체크 안 됨</label>
  <ul>
    <li class="done">끝낸 일 (일반 굵기)</li>
    <li>할 일 (굵게)</li>
  </ul>
  <button>키보드로 포커스해 보세요</button>
</body>
</html>`
        },
        {
          title: "@layer와 중첩으로 CSS 구조화",
          body: `@layer는 CSS를 계층으로 나누어 계층의 선언 순서로 우선순위를 정하는 기능입니다. @layer base, components;처럼 순서를 먼저 선언해 두면 명시도가 낮아도 나중 계층의 규칙이 이기므로, 외부 라이브러리 스타일을 낮은 계층에 두고 내 스타일이 쉽게 덮어쓰게 만들 수 있습니다. 계층에 넣지 않은 스타일은 일반 선언에서 모든 계층보다 우선하고, !important 선언에서는 계층 순서가 반대로 뒤집힙니다. 네이티브 CSS 중첩은 .card { ... & h2 { ... } &:hover { ... } }처럼 규칙 안에 규칙을 쓰는 기능으로, 현재 주요 브라우저에서 지원되며 &로 부모 선택자를 가리킵니다. 흔한 실수는 중첩을 깊게 쓰다가 명시도가 의도보다 높아지는 것이므로 두세 단계 이내로 유지하는 것이 좋습니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    @layer base, components;

    @layer base {
      button#save {
        background-color: gray;
        color: white;
        padding: 10px 20px;
        border: none;
      }
    }

    @layer components {
      .btn {
        background-color: seagreen;
      }
    }

    .card {
      padding: 12px;
      background-color: #eee;
      & h2 {
        margin: 0 0 8px;
        color: navy;
      }
      &:hover {
        background-color: #ffd;
      }
    }
  </style>
</head>
<body>
  <button id="save" class="btn">저장 (낮은 명시도지만 나중 계층이라 초록)</button>
  <div class="card">
    <h2>중첩 예제</h2>
    <p>마우스를 올리면 배경이 바뀝니다.</p>
  </div>
</body>
</html>`
        },
        {
          title: "렌더링 성능을 지키는 CSS",
          body: `브라우저는 스타일 계산, 레이아웃, 페인트, 합성 순서로 화면을 그리는데, width, top, margin처럼 레이아웃을 다시 계산하게 만드는 속성을 애니메이션하면 프레임마다 많은 일이 생깁니다. 반면 transform과 opacity는 보통 레이아웃과 페인트를 건너뛰고 합성 단계에서 처리되어 애니메이션에 유리합니다. content-visibility: auto는 화면 밖 영역의 렌더링을 미루어 긴 페이지의 초기 렌더링을 빠르게 하며, contain-intrinsic-size로 대략의 높이를 알려 주어 스크롤바가 튀는 것을 막습니다. will-change는 정말 필요한 요소에만 잠깐 쓰는 힌트이며 모든 요소에 걸면 메모리만 낭비합니다. 선택자 길이 자체는 대개 병목이 아니므로, 선택자를 미세 최적화하기보다 레이아웃을 흔드는 작업과 화면 밖의 불필요한 렌더링을 줄이는 쪽이 효과적입니다.`,
          code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .lane {
      width: 200px;
      background-color: #eef;
    }
    .slide {
      width: 60px;
      height: 60px;
      background-color: steelblue;
      transition: transform 0.4s ease, opacity 0.4s ease;
    }
    .lane:hover .slide {
      transform: translateX(120px);
      opacity: 0.5;
    }
    .section {
      content-visibility: auto;
      contain-intrinsic-size: auto 50px;
      margin-top: 12px;
      padding: 12px;
      background-color: #eee;
    }
  </style>
</head>
<body>
  <div class="lane"><div class="slide"></div></div>
  <p>위 띠에 마우스를 올리면 상자가 transform과 opacity로만 움직입니다. (움직이는 요소 자신에 hover를 걸면 커서에서 벗어나 깜빡이므로 부모 띠에 hover를 겁니다.)</p>
  <div class="section">화면 밖에 있으면 렌더링을 미루는 구획 1</div>
  <div class="section">구획 2</div>
  <div class="section">구획 3</div>
</body>
</html>`
        }
      ],
      quiz: [
        {
          q: `다음 CSS에서 첫 번째 열과 두 번째 열의 너비는 각각 얼마입니까? (gap과 padding은 없습니다)\n.g { display: grid; width: 300px; grid-template-columns: 1fr 2fr; }`,
          choices: ["150px, 150px", "100px, 100px", "100px, 200px", "200px, 100px"],
          answer: 2,
          why: `1fr과 2fr은 남는 공간을 1:2로 나누므로 300px이 100px과 200px로 나뉩니다.`
        },
        {
          q: `3열 그리드 안의 아이템에 다음 CSS를 적용하면 어떻게 됩니까?\n.a { grid-column: 1 / 3; }`,
          choices: ["1번째와 2번째 열, 두 칸을 차지한다", "1번째부터 3번째 열까지 세 칸을 차지한다", "1번째 열 하나만 차지한다", "3번째 열 하나만 차지한다"],
          answer: 0,
          why: `grid-column: 1 / 3은 열 선(line) 1번에서 3번까지를 뜻하며 이는 첫 번째와 두 번째 열 두 칸입니다. 선 번호이므로 3번째 열은 포함되지 않습니다.`
        },
        {
          q: `다음 CSS 상태에서 마우스를 올리면 어떻게 됩니까?\n.btn { background: blue; transition: background 0.3s; }\n.btn:hover { background: red; width: 200px; }`,
          choices: ["아무것도 바뀌지 않는다", "배경색과 너비가 모두 0.3초에 걸쳐 바뀐다", "너비만 부드럽게 바뀌고 배경색은 즉시 바뀐다", "배경색만 부드럽게 바뀌고 너비는 즉시 바뀐다"],
          answer: 3,
          why: `transition에는 background만 지정되어 있어 그 속성만 0.3초 동안 보간됩니다. width는 전환 대상이 아니므로 즉시 바뀝니다.`
        },
        {
          q: `다음 애니메이션은 어떻게 동작합니까?\n@keyframes blink { from { opacity: 1; } to { opacity: 0; } }\n.x { animation: blink 1s 3; }`,
          choices: ["1초에 3번씩 영원히 반복한다", "1초짜리 애니메이션을 3번 재생한 뒤 멈춘다", "3초 뒤에 한 번만 재생한다", "한 번 재생하고 3초 동안 멈춘다"],
          answer: 1,
          why: `단축 속성에서 시간 단위가 붙은 첫 값은 지속 시간(1s)이고, 단위 없는 숫자 3은 반복 횟수입니다. 끝나면 원래 스타일로 돌아갑니다.`
        },
        {
          q: `다음 CSS의 .card 규칙은 적용됩니까?\n.wrap { width: 500px; }\n@container (min-width: 400px) { .card { display: flex; } }\n(.card는 .wrap의 자식이고 container-type은 어디에도 지정되지 않았습니다)`,
          choices: ["적용되지 않는다. 쿼리 대상이 될 컨테이너가 지정되지 않았기 때문이다", "적용된다. .wrap의 너비가 400px 이상이기 때문이다", "적용된다. 뷰포트 너비가 기준이 되기 때문이다", "문법 오류로 전체 스타일시트가 무시된다"],
          answer: 0,
          why: `컨테이너 쿼리는 container-type이 지정된 조상 요소를 기준으로 합니다. 그런 조상이 없으면 조건이 참이 되지 않아 규칙이 적용되지 않으며, 뷰포트로 대체되지도 않습니다.`
        },
        {
          q: `다음 선택자가 고르는 요소는 무엇입니까?\n.item:has(> img)`,
          choices: ["img 요소의 자식인 .item", "img 바로 뒤에 오는 .item", "자식으로 img를 직접 가진 .item 요소", "문서의 모든 img 요소"],
          answer: 2,
          why: `:has()는 괄호 안 조건을 만족하는 요소를 기준 요소(.item) 쪽에서 고릅니다. > img는 직접 자식 img를 뜻하므로, 바로 아래에 img가 있는 .item이 선택됩니다.`
        },
        {
          q: `다음 CSS에서 p의 글자색은 무엇입니까?\n@layer a, b;\n@layer a { p { color: red; } }\n@layer b { p { color: blue; } }`,
          choices: ["red", "blue", "오류가 발생한다", "두 색이 섞인 보라색"],
          answer: 1,
          why: `@layer a, b;로 순서를 선언했으므로 나중 계층인 b가 우선합니다. 명시도가 같더라도 계층 순서가 먼저 비교되어 blue가 적용됩니다.`
        },
        {
          q: `다음 중 일반적으로 레이아웃 재계산 없이 처리되어 애니메이션에 유리한 속성은 무엇입니까?`,
          choices: ["width", "top", "margin-left", "transform"],
          answer: 3,
          why: `transform은 보통 레이아웃을 다시 계산하지 않고 합성 단계에서 처리됩니다. width, top, margin-left를 바꾸면 레이아웃을 다시 계산하게 됩니다.`
        }
      ],
      practice: [
        {
          title: "Grid로 3열 갤러리 만들기",
          task: `HTML에 <div class="gallery"> 안에 <div class="cell"></div> 네 개를 넣으세요. .gallery를 3개의 동일한 너비 열(repeat 사용)과 10px 간격을 가진 그리드로 만들고, 각 .cell은 높이 60px, 배경색 seagreen으로 지정합니다. 첫 번째 .cell은 두 열을 차지해야 하며 배경색은 darkorange로 합니다. 기대 결과는 첫 줄에 넓은 칸 하나와 좁은 칸 하나가 놓이고, 둘째 줄에 좁은 칸 두 개가 놓이는 것입니다.`,
          hint: `grid-template-columns: repeat(3, 1fr)를 쓰고, 첫 번째 셀에는 grid-column: span 2를 주세요. :first-child로 첫 셀을 고를 수 있습니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .gallery {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .cell {
      height: 60px;
      background-color: seagreen;
    }
    .cell:first-child {
      grid-column: span 2;
      background-color: darkorange;
    }
  </style>
</head>
<body>
  <div class="gallery">
    <div class="cell"></div>
    <div class="cell"></div>
    <div class="cell"></div>
    <div class="cell"></div>
  </div>
</body>
</html>`,
          explain: `repeat(3, 1fr)은 같은 너비의 열 세 개를 만들고, span 2는 아이템이 두 칸을 차지하게 합니다. 첫 셀이 1~2열, 둘째 셀이 3열, 셋째와 넷째 셀이 둘째 줄 1열과 2열에 자동 배치됩니다.`
        },
        {
          title: "hover 전환 효과 만들기",
          task: `본문에 <div class="btn">버튼</div>을 직접 쓰고, 이 .btn을 display: inline-block, padding 12px 24px, 글자색 white, 배경 steelblue로 꾸미세요(inline 요소에는 transform이 적용되지 않으므로 inline-block이 필요합니다). 그 .btn에 마우스를 올리면 배경색이 steelblue에서 darkorange로 바뀌고 크기가 1.1배로 커지게 하세요. 변화는 0.3초 동안 부드럽게 일어나야 하며, 마우스를 떼면 같은 속도로 원래대로 돌아와야 합니다. 기대 결과는 hover 시 버튼이 주황색으로 변하며 살짝 커지는 것입니다.`,
          hint: `전환은 hover가 아니라 기본 상태(.btn)에 transition을 선언해야 돌아올 때도 적용됩니다. 크기는 transform: scale(1.1)을 씁니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    .btn {
      display: inline-block;
      margin: 20px;
      padding: 12px 24px;
      background-color: steelblue;
      color: white;
      transition: background-color 0.3s ease, transform 0.3s ease;
    }
    .btn:hover {
      background-color: darkorange;
      transform: scale(1.1);
    }
  </style>
</head>
<body>
  <div class="btn">버튼</div>
</body>
</html>`,
          explain: `transition을 기본 상태에 두면 hover로 들어갈 때와 나올 때 모두 0.3초 전환이 적용됩니다. transform: scale은 레이아웃을 바꾸지 않아 성능에도 유리합니다.`
        },
        {
          title: ":has()로 선택된 라벨 강조하기",
          task: `체크박스가 들어 있는 두 개의 label 중, 체크된 체크박스를 포함한 label의 배경을 lightgreen으로 만드세요. HTML에서 첫 번째 체크박스에는 checked 속성이 있고 두 번째에는 없습니다. 기대 결과는 첫 번째 label만 연두색 배경이고 두 번째는 배경이 없는 것입니다.`,
          hint: `label:has(input:checked) 선택자를 쓰세요. :checked는 체크된 입력에 매칭되는 가상 클래스입니다.`,
          solution: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    label {
      display: block;
      padding: 8px;
      margin-bottom: 6px;
    }
    label:has(input:checked) {
      background-color: lightgreen;
    }
  </style>
</head>
<body>
  <label><input type="checkbox" checked> 첫 번째 옵션</label>
  <label><input type="checkbox"> 두 번째 옵션</label>
</body>
</html>`,
          explain: `label:has(input:checked)는 자손으로 체크된 input을 가진 label만 고릅니다. 사용자가 체크 상태를 바꾸면 JavaScript 없이도 배경이 바로 갱신됩니다.`
        }
      ]
    }
  ]
});
