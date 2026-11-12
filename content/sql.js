(window.LANG_DATA = window.LANG_DATA || []).push({
  id: "sql", name: "SQL", kind: "데이터베이스 질의 언어", runnable: null,
  use: "관계형 데이터베이스(MySQL, PostgreSQL, SQLite, SQL Server 등)에서 데이터를 조회하고 저장하고 수정할 때 쓰입니다. 웹 서비스 백엔드, 데이터 분석, 보고서 작성 등에 널리 사용됩니다.",
  tip: "SQL은 '어떻게' 가져올지가 아니라 '무엇을' 원하는지를 적는 선언형 언어이고, 데이터베이스마다 세부 문법이 조금씩 다릅니다.",
  intro: "SQL은 Structured Query Language의 약자로, 표(테이블) 형태로 저장된 데이터를 다루기 위한 언어입니다. 엑셀의 시트처럼 행과 열로 된 표에서 원하는 데이터를 골라 오거나 추가, 수정, 삭제할 수 있습니다. 문법이 영어 문장과 비슷해서 입문자도 비교적 빠르게 읽고 쓸 수 있습니다.",
  lessons: [
    {
      title: "SELECT로 데이터 조회하기",
      body: "SQL에서 가장 기본이 되는 문장은 SELECT입니다. SELECT 뒤에 가져올 열(컬럼) 이름을, FROM 뒤에 표(테이블) 이름을 적습니다. 모든 열을 가져오고 싶으면 별표(*)를 씁니다. 문장의 끝에는 보통 세미콜론(;)을 붙입니다.",
      code: `-- products 테이블에서 이름과 가격만 조회
SELECT name, price FROM products;

-- 모든 열 조회
SELECT * FROM products;`
    },
    {
      title: "WHERE로 조건 걸기",
      body: "WHERE를 쓰면 조건에 맞는 행만 골라낼 수 있습니다. 비교에는 =, <>, >, <, >=, <= 같은 연산자를 쓰고, 여러 조건은 AND, OR로 묶습니다. 문자열 값은 작은따옴표(')로 감싸야 합니다.",
      code: `-- 가격이 10000 이상인 상품
SELECT name, price FROM products
WHERE price >= 10000;

-- 카테고리가 '과일'이고 가격이 5000 미만인 상품
SELECT name, price FROM products
WHERE category = '과일' AND price < 5000;`
    },
    {
      title: "ORDER BY와 LIMIT로 정렬하고 개수 제한하기",
      body: "ORDER BY는 결과를 정렬합니다. 기본은 오름차순(ASC)이고, 내림차순은 DESC를 붙입니다. LIMIT은 가져올 행의 개수를 제한하며, MySQL, PostgreSQL, SQLite에서 사용할 수 있습니다. (SQL Server는 TOP을 사용하는 등 데이터베이스마다 방식이 다릅니다.)",
      code: `-- 비싼 순서로 정렬
SELECT name, price FROM products
ORDER BY price DESC;

-- 가장 비싼 상품 3개만 조회
SELECT name, price FROM products
ORDER BY price DESC
LIMIT 3;`
    },
    {
      title: "INSERT, UPDATE, DELETE로 데이터 바꾸기",
      body: "INSERT INTO는 새 행을 추가하고, UPDATE는 기존 행의 값을 바꾸며, DELETE FROM은 행을 삭제합니다. UPDATE와 DELETE에서 WHERE를 빼먹으면 표의 모든 행이 바뀌거나 지워지므로 항상 조심해야 합니다.",
      code: `-- 새 상품 추가
INSERT INTO products (name, price, category)
VALUES ('사과', 3000, '과일');

-- id가 1인 상품의 가격 수정
UPDATE products
SET price = 3500
WHERE id = 1;

-- id가 2인 상품 삭제
DELETE FROM products
WHERE id = 2;`
    },
    {
      title: "집계 함수와 GROUP BY",
      body: "COUNT, SUM, AVG, MIN, MAX 같은 집계 함수는 여러 행을 계산해 하나의 값으로 만들어 줍니다. GROUP BY를 함께 쓰면 같은 값을 가진 행끼리 묶어서 그룹별로 계산할 수 있습니다. 아래 예제는 카테고리별 상품 개수와 평균 가격을 구합니다.",
      code: `-- 전체 상품 개수
SELECT COUNT(*) FROM products;

-- 카테고리별 상품 개수와 평균 가격
SELECT category, COUNT(*) AS cnt, AVG(price) AS avg_price
FROM products
GROUP BY category;`
    }
  ],
  quiz: [
    {
      q: "테이블에서 데이터를 조회할 때 가장 기본이 되는 SQL 문장은 무엇일까요?",
      choices: ["GET", "SELECT", "SHOW ONLY", "FETCH ROWS"],
      answer: 1,
      why: "데이터를 조회하는 기본 문장은 SELECT이며, 'SELECT 열 FROM 테이블' 형태로 씁니다."
    },
    {
      q: "테이블의 모든 열을 한 번에 조회할 때 SELECT 뒤에 쓰는 기호는 무엇일까요?",
      choices: ["#", "%", "&", "*"],
      answer: 3,
      why: "별표(*)는 테이블의 모든 열을 의미하므로 SELECT * FROM 테이블; 로 전체 열을 조회합니다."
    },
    {
      q: "가격이 10000 이상인 행만 골라내려면 어떤 키워드를 사용해야 할까요?",
      choices: ["WHERE", "GROUP BY", "ORDER BY", "LIMIT"],
      answer: 0,
      why: "WHERE는 조건에 맞는 행만 걸러내는 키워드입니다. 예: WHERE price >= 10000."
    },
    {
      q: "price 열을 기준으로 큰 값부터 작은 값 순서(내림차순)로 정렬하는 올바른 문장은 무엇일까요?",
      choices: [
        "ORDER BY price ASC",
        "SORT price DOWN",
        "ORDER BY price DESC",
        "GROUP BY price DESC"
      ],
      answer: 2,
      why: "정렬은 ORDER BY로 하고, 내림차순은 DESC를 붙입니다. ASC는 오름차순입니다."
    },
    {
      q: "UPDATE 문을 쓸 때 WHERE 조건을 빼먹으면 어떻게 될까요?",
      choices: [
        "아무 행도 수정되지 않는다",
        "테이블의 모든 행이 수정된다",
        "문법 오류가 반드시 발생한다",
        "첫 번째 행만 수정된다"
      ],
      answer: 1,
      why: "WHERE가 없으면 조건 없이 모든 행에 적용되므로, 테이블의 모든 행이 수정됩니다. DELETE도 마찬가지입니다."
    },
    {
      q: "카테고리별로 상품 개수를 세고 싶을 때 COUNT(*)와 함께 사용하는 구문은 무엇일까요?",
      choices: ["GROUP BY category", "ORDER BY category DESC", "INSERT INTO category", "LIMIT category"],
      answer: 0,
      why: "GROUP BY category를 쓰면 같은 카테고리끼리 묶이고, COUNT(*)가 그룹별로 행 개수를 계산합니다."
    }
  ]
});
