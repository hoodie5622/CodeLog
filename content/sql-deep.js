(window.LANG_EXTRA = window.LANG_EXTRA || []).push({
  id: "sql",
  levels: [
    {
      level: "입문",
      practice: [
        {
          title: "과일 중 비싼 상품 상위 2개 조회",
          task: `products(id, name, price, category) 테이블에 (1,'사과',3000,'과일'), (2,'바나나',2500,'과일'), (3,'포도',8000,'과일'), (4,'귤',4000,'과일'), (5,'우유',2800,'유제품') 이 들어 있습니다. category가 '과일'인 상품 중 가격이 가장 비싼 2개의 name과 price를 가격이 높은 순서로 조회하세요. 기대 결과는 (포도, 8000), (귤, 4000) 두 행입니다.`,
          hint: `WHERE로 카테고리를 거른 뒤 ORDER BY price DESC로 정렬하고 LIMIT으로 개수를 제한합니다.`,
          solution: `SELECT name, price
FROM products
WHERE category = '과일'
ORDER BY price DESC
LIMIT 2;`,
          explain: `WHERE가 먼저 과일 4개만 남기고, ORDER BY price DESC가 비싼 순으로 정렬한 다음, LIMIT 2가 위에서 2행만 가져옵니다. 문자열 '과일'은 작은따옴표로 감싸야 합니다.`
        },
        {
          title: "상품 추가 후 가격 수정하기",
          task: `비어 있는 products(id, name, price, category) 테이블이 있다고 하고, 먼저 id 1, 이름 '수박', 가격 12000, 카테고리 '과일'인 행을 추가하세요. 그다음 수박의 가격을 13000으로 수정하고, 마지막으로 name이 '수박'인 행의 name과 price를 조회하세요. 기대 결과는 (수박, 13000) 한 행입니다.`,
          hint: `INSERT INTO ... VALUES로 추가하고, UPDATE에는 반드시 WHERE를 붙입니다.`,
          solution: `INSERT INTO products (id, name, price, category)
VALUES (1, '수박', 12000, '과일');

UPDATE products
SET price = 13000
WHERE name = '수박';

SELECT name, price
FROM products
WHERE name = '수박';`,
          explain: `INSERT가 새 행을 만들고, UPDATE의 WHERE name = '수박' 조건이 그 행만 수정합니다. WHERE를 빼면 테이블의 모든 행 가격이 바뀌므로 주의해야 합니다.`
        },
        {
          title: "카테고리별 상품 수와 평균 가격",
          task: `products(id, name, price, category) 테이블에 (1,'사과',3000,'과일'), (2,'바나나',2500,'과일'), (3,'포도',8000,'과일'), (4,'귤',4000,'과일'), (5,'우유',2800,'유제품') 이 들어 있습니다. 카테고리별 상품 개수를 cnt, 평균 가격을 avg_price라는 별칭으로 구하고 cnt가 큰 순서로 정렬하세요. 기대 결과는 (과일, 4, 4375), (유제품, 1, 2800)이며 평균값의 소수점 자릿수 표시(4375.0, 4375.0000 등)는 DB마다 다를 수 있습니다.`,
          hint: `GROUP BY category와 COUNT(*), AVG(price)를 함께 사용하고, 별칭은 AS로 붙입니다.`,
          solution: `SELECT category,
       COUNT(*)   AS cnt,
       AVG(price) AS avg_price
FROM products
GROUP BY category
ORDER BY cnt DESC;`,
          explain: `GROUP BY category로 같은 카테고리끼리 묶으면 집계 함수가 그룹마다 계산됩니다. 과일은 (3000+2500+8000+4000)/4 = 4375, 유제품은 2800입니다. ORDER BY에서는 SELECT의 별칭 cnt를 쓸 수 있습니다.`
        }
      ]
    },
    {
      level: "중급",
      intro: `이 단계에서는 WHERE와 ORDER BY를 더 정밀하게 쓰고, 집계와 GROUP BY/HAVING으로 데이터를 요약하는 방법을 배웁니다. 이어서 여러 테이블을 JOIN으로 연결하고 서브쿼리로 쿼리 안에 쿼리를 넣어 실무에서 자주 쓰는 조회를 작성합니다.`,
      lessons: [
        {
          title: "WHERE 연산자와 NULL 다루기",
          body: `WHERE에서는 =, > 외에도 여러 값 중 하나를 고르는 IN, 양 끝값을 포함하는 범위 BETWEEN, 문자열 패턴을 찾는 LIKE(% 는 임의 길이, _ 는 한 글자)를 쓸 수 있습니다. AND는 OR보다 먼저 계산되므로 둘을 섞을 때는 괄호로 의도를 분명히 해야 하며, 이를 잊는 것이 흔한 실수입니다. NULL은 값이 없다는 뜻이라서 = NULL이나 <> NULL로는 비교할 수 없고 반드시 IS NULL, IS NOT NULL을 써야 합니다. 또 city <> '서울' 조건은 city가 NULL인 행을 결과에 포함하지 않는다는 점도 기억하세요(NULL과의 비교 결과가 TRUE도 FALSE도 아닌 UNKNOWN이 되기 때문입니다). NULL 대신 기본값을 보여 주고 싶으면 COALESCE(열, 기본값)을 씁니다.`,
          code: `-- 이 단계의 예제는 아래 테이블이 있다고 가정합니다.
--   products(id, name, price, category)
--   customers(id, name, city)
--   orders(id, customer_id, amount, status)

-- IN, BETWEEN(양 끝 포함), LIKE 조합
SELECT name, price FROM products
WHERE category IN ('과일', '채소')
  AND price BETWEEN 1000 AND 5000
  AND name LIKE '사%';

-- 괄호가 없으면 AND가 먼저 계산된다: '과일' 전부와 '3000 미만인 채소'가 나온다
SELECT name FROM products
WHERE category = '과일' OR category = '채소' AND price < 3000;

-- 괄호를 쓰면 의도대로 '과일 또는 채소' 중 3000 미만만 나온다
SELECT name FROM products
WHERE (category = '과일' OR category = '채소') AND price < 3000;

-- NULL 비교는 IS NULL / IS NOT NULL
SELECT name FROM customers WHERE city IS NULL;

-- <> 는 NULL 행을 빼므로 필요하면 IS NULL을 함께 쓴다
SELECT name FROM customers
WHERE city <> '서울' OR city IS NULL;

-- NULL 대체 표시
SELECT name, COALESCE(city, '미등록') AS city FROM customers;`
        },
        {
          title: "ORDER BY 심화와 페이징",
          body: `ORDER BY에는 여러 열을 쉼표로 나열할 수 있고, 앞의 열이 같을 때 다음 열로 순서를 정합니다. 열마다 ASC, DESC를 따로 지정할 수 있고 SELECT에 없는 열이나 SELECT에서 붙인 별칭으로도 정렬할 수 있습니다. 페이지 단위로 나눠 가져올 때는 LIMIT 개수 OFFSET 건너뛸 개수를 쓰는데(MySQL, PostgreSQL, SQLite), LIMIT은 가져올 행 수를, OFFSET은 앞에서 건너뛸 행 수를 뜻합니다. ORDER BY 없이 LIMIT만 쓰면 어떤 행이 나올지 보장되지 않고, 정렬 기준에 동점이 많으면 페이지 사이에 행이 겹치거나 빠질 수 있으므로 id 같은 유일한 열을 마지막 정렬 기준으로 넣어야 안전합니다. NULL이 정렬에서 앞에 오는지 뒤에 오는지는 DB마다 다릅니다.`,
          code: `-- 카테고리 오름차순, 같은 카테고리 안에서는 가격 내림차순, 그래도 같으면 id 순
SELECT id, name, category, price
FROM products
ORDER BY category ASC, price DESC, id ASC;

-- 한 페이지에 10개씩, 3번째 페이지(21~30번째 행)
SELECT id, name, price
FROM products
ORDER BY price DESC, id
LIMIT 10 OFFSET 20;

-- 별칭으로 정렬
SELECT name, price * 2 AS double_price
FROM products
ORDER BY double_price DESC;`
        },
        {
          title: "집계 함수와 GROUP BY 깊게 보기",
          body: `COUNT(*)는 NULL 여부와 관계없이 행의 개수를 세지만 COUNT(열)은 그 열이 NULL이 아닌 행만 셉니다. SUM, AVG, MIN, MAX도 NULL은 무시하고 계산하므로, 예를 들어 값이 10, 20, NULL, 30이면 AVG는 60/3 = 20입니다. GROUP BY를 쓰면 SELECT에는 GROUP BY에 적은 열이나 집계 함수만 쓸 수 있는 것이 원칙이며, 그 밖의 열을 그냥 적으면 대부분의 DB(MySQL도 기본 설정에서)가 오류를 내지만, SQLite는 오류 없이 그룹 안의 임의 행의 값을 돌려주므로 더 주의해야 합니다. 여러 열로 묶으려면 GROUP BY a, b처럼 나열하고, 중복을 제거하며 세고 싶으면 COUNT(DISTINCT 열)을 사용합니다. 그룹을 만들 때 열이 NULL인 행들은 하나의 그룹으로 묶입니다.`,
          code: `-- COUNT(*) 와 COUNT(열) 의 차이
SELECT COUNT(*) AS all_rows, COUNT(city) AS with_city
FROM customers;

-- 고객별 주문 수, 합계, 평균
SELECT customer_id,
       COUNT(*)    AS order_cnt,
       SUM(amount) AS total,
       AVG(amount) AS avg_amount
FROM orders
GROUP BY customer_id;

-- 상태별로 몇 명의 서로 다른 고객이 주문했는지
SELECT status, COUNT(DISTINCT customer_id) AS customer_cnt
FROM orders
GROUP BY status;`
        },
        {
          title: "HAVING과 WHERE의 차이",
          body: `SQL은 작성한 순서와 달리 FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT 순서로 처리된다고 이해하면 편합니다. WHERE는 그룹을 만들기 전에 개별 행을 걸러내고, HAVING은 그룹을 만든 뒤 집계 결과를 조건으로 걸러냅니다. 그래서 WHERE SUM(amount) > 300처럼 WHERE에 집계 함수를 쓰면 오류가 나며, 이때는 HAVING을 써야 합니다. 반대로 집계와 무관한 조건(status = 'paid' 등)은 WHERE에 두는 편이 먼저 행을 줄여 주므로 효율적입니다. HAVING 안에서는 SELECT 별칭 대신 집계식을 다시 쓰는 것이 DB 간 호환에 안전합니다.`,
          code: `-- 결제 완료 주문만 대상으로, 합계가 300 이상인 고객
SELECT customer_id, SUM(amount) AS total
FROM orders
WHERE status = 'paid'
GROUP BY customer_id
HAVING SUM(amount) >= 300
ORDER BY total DESC;

-- 오류 예: WHERE에는 집계 함수를 쓸 수 없다
-- SELECT customer_id FROM orders WHERE SUM(amount) > 300 GROUP BY customer_id;`
        },
        {
          title: "JOIN으로 테이블 연결하기 (INNER, LEFT)",
          body: `정규화된 데이터베이스에서는 정보가 여러 테이블에 나뉘어 있으므로 JOIN으로 연결해서 조회합니다. INNER JOIN은 ON 조건이 일치하는 행만 돌려주고, LEFT JOIN은 왼쪽 테이블의 모든 행을 유지하면서 오른쪽에 일치하는 행이 없으면 오른쪽 열을 NULL로 채웁니다. 주문이 없는 고객도 보고 싶다면 LEFT JOIN을 써야 합니다. 흔한 실수는 LEFT JOIN 뒤에 오른쪽 테이블 조건을 WHERE에 쓰는 것인데, 일치하지 않아 NULL이 된 행이 걸러져 사실상 INNER JOIN이 되어 버리므로 그 조건은 ON에 써야 합니다(오른쪽 열이 IS NULL인 행으로 짝 없는 행을 찾는 경우는 예외입니다). 또 1:N 관계를 JOIN하면 왼쪽 행이 오른쪽 행 수만큼 반복되므로 왼쪽 열을 합산할 때 중복 집계에 주의해야 합니다. LEFT JOIN 뒤에 개수를 셀 때는 COUNT(*) 대신 COUNT(오른쪽 테이블의 열)을 써야 짝이 없는 행이 1이 아니라 0으로 계산됩니다.`,
          code: `-- INNER JOIN: 주문이 있는 고객만
SELECT c.name, o.id AS order_id, o.amount
FROM customers c
INNER JOIN orders o ON o.customer_id = c.id;

-- LEFT JOIN: 주문이 없는 고객도 포함, 주문 수는 0으로 나온다
SELECT c.name, COUNT(o.id) AS order_cnt
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;

-- 결제 완료 주문만 세되 고객은 모두 보이게: 조건은 ON에 둔다
SELECT c.name, COUNT(o.id) AS paid_cnt
FROM customers c
LEFT JOIN orders o
  ON o.customer_id = c.id AND o.status = 'paid'
GROUP BY c.id, c.name;`
        },
        {
          title: "서브쿼리: 쿼리 안의 쿼리",
          body: `서브쿼리는 괄호로 감싼 SELECT로, 값 하나를 돌려주는 스칼라 서브쿼리는 비교 연산자와 함께, 여러 행을 돌려주는 서브쿼리는 IN과 함께 WHERE에서 쓸 수 있습니다. EXISTS는 서브쿼리 결과가 한 행이라도 있는지만 확인하며, 바깥 쿼리의 열을 참조하는 상관 서브쿼리와 자주 함께 쓰입니다. FROM 절에 서브쿼리를 넣어 임시 표처럼 쓸 수도 있는데, MySQL과 PostgreSQL 15 이하에서는 별칭이 반드시 필요하므로(PostgreSQL 16부터는 생략할 수 있습니다) 항상 붙이는 습관이 안전합니다. 중요한 함정은 NOT IN인데, 서브쿼리 결과에 NULL이 하나라도 있으면 NOT IN 조건이 어떤 행에 대해서도 참이 되지 않아 결과가 비어 버립니다. 이런 경우에는 NOT EXISTS를 쓰거나 서브쿼리에서 NULL을 제외하세요.`,
          code: `-- 스칼라 서브쿼리: 평균보다 큰 주문
SELECT id, amount
FROM orders
WHERE amount > (SELECT AVG(amount) FROM orders);

-- IN: 결제 완료 주문이 있는 고객
SELECT name FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE status = 'paid');

-- EXISTS: 500 이상 주문이 있는 고객
SELECT c.name FROM customers c
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.id AND o.amount >= 500
);

-- NOT EXISTS: 주문이 한 번도 없는 고객 (NULL에 안전)
SELECT c.name FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id
);

-- FROM 절 서브쿼리에는 별칭(AS t)을 붙인다 (MySQL 등에서는 필수)
SELECT t.customer_id, t.total
FROM (SELECT customer_id, SUM(amount) AS total
      FROM orders GROUP BY customer_id) AS t
WHERE t.total > 300;`
        }
      ],
      quiz: [
        {
          q: `테이블 t의 열 x에 값이 10, 20, NULL, 30 인 네 행이 있습니다. 다음 쿼리의 결과는?

SELECT COUNT(*), COUNT(x), SUM(x) FROM t;`,
          choices: ["4, 4, 60", "4, 3, 60", "3, 3, NULL", "4, 3, NULL"],
          answer: 1,
          why: `COUNT(*)는 NULL이 있는 행도 세므로 4이고, COUNT(x)는 NULL을 제외해 3입니다. SUM은 NULL을 무시하고 10+20+30 = 60을 돌려줍니다.`
        },
        {
          q: `WHERE a = 1 OR b = 2 AND c = 3 이라는 조건은 어떻게 해석될까요?`,
          choices: [
            "(a = 1 OR b = 2) AND c = 3",
            "왼쪽부터 차례대로 평가한다",
            "문법 오류가 난다",
            "a = 1 OR (b = 2 AND c = 3)"
          ],
          answer: 3,
          why: `AND가 OR보다 우선순위가 높으므로 b = 2 AND c = 3이 먼저 묶입니다. 다른 의도라면 괄호를 써야 합니다.`
        },
        {
          q: `orders(customer_id, amount)에 (1,100), (1,200), (2,50), (3,400), (3,100) 다섯 행이 있습니다. 결과는?

SELECT customer_id, SUM(amount) AS total
FROM orders
GROUP BY customer_id
HAVING SUM(amount) >= 300;`,
          choices: [
            "(1, 300), (3, 500) 두 행",
            "(3, 500) 한 행",
            "(1, 300), (2, 50), (3, 500) 세 행",
            "오류가 발생한다"
          ],
          answer: 0,
          why: `고객 1의 합계는 300, 고객 2는 50, 고객 3은 500입니다. HAVING은 그룹의 합계가 300 이상인 그룹만 남기므로 고객 1과 3이 나옵니다.`
        },
        {
          q: `다음과 같이 WHERE 절에서 집계 함수를 사용하면 어떻게 될까요?

SELECT customer_id FROM orders
WHERE SUM(amount) > 300
GROUP BY customer_id;`,
          choices: [
            "합계가 300을 넘는 그룹만 정상적으로 걸러진다",
            "행 하나씩 평가되어 일부 행만 남는다",
            "오류가 난다. WHERE에는 집계 함수를 쓸 수 없다",
            "결과가 항상 NULL이 된다"
          ],
          answer: 2,
          why: `WHERE는 그룹을 만들기 전에 실행되므로 집계 함수를 쓸 수 없습니다. 집계 결과로 걸러내려면 HAVING을 사용해야 합니다.`
        },
        {
          q: `customers에 (1,'김'), (2,'이'), (3,'박')이 있고 orders(id, customer_id)에 (10,1), (11,1), (12,3)이 있습니다. 결과에서 '이'의 cnt 값은?

SELECT c.name, COUNT(o.id) AS cnt
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;`,
          choices: ["'이'는 결과에 나오지 않는다", "0", "NULL", "1"],
          answer: 1,
          why: `LEFT JOIN은 주문이 없는 '이'도 남기고 o.id를 NULL로 채웁니다. COUNT(o.id)는 NULL을 세지 않으므로 0입니다.`
        },
        {
          q: `customers에 (1,'김'), (2,'이'), (3,'박')이 있고 orders(id, customer_id)에 (10,1), (11,1), (12,3)이 있습니다. 다음 쿼리가 돌려주는 name 열은 어떤 모양일까요?

SELECT c.name
FROM customers c
INNER JOIN orders o ON o.customer_id = c.id;`,
          choices: [
            "김, 이, 박",
            "김, 박",
            "김, 김, 박",
            "김, 김, 이, 박"
          ],
          answer: 2,
          why: `INNER JOIN은 일치하는 행만 돌려주므로 주문이 없는 '이'는 빠집니다. 김은 주문이 2건이라 두 번 나오고 박은 한 번 나옵니다.`
        },
        {
          q: `서브쿼리 결과에 NULL이 하나라도 포함되어 있을 때 WHERE x NOT IN (서브쿼리)는 어떻게 동작할까요?`,
          choices: [
            "NULL 비교가 UNKNOWN이 되어 어떤 행도 조건을 만족하지 못하므로 결과가 비어 버린다",
            "NULL은 자동으로 무시되고 나머지 값만으로 비교하므로 정상적으로 동작한다",
            "NULL 값과 일치하는 행만 결과로 나오고 나머지는 모두 제외된다",
            "서브쿼리에 NULL이 들어 있으면 문법 오류가 발생한다"
          ],
          answer: 0,
          why: `x NOT IN (1, NULL)은 x <> 1 AND x <> NULL과 같아서 두 번째 비교가 UNKNOWN이 되고, 전체가 TRUE가 되지 못합니다. 이런 경우 NOT EXISTS를 쓰는 것이 안전합니다.`
        },
        {
          q: `다음 쿼리는 정렬된 결과 중 어느 행들을 가져올까요?

SELECT id FROM products
ORDER BY id
LIMIT 10 OFFSET 20;`,
          choices: [
            "1번째부터 10번째 행",
            "10번째부터 20번째 행",
            "20번째부터 29번째 행",
            "21번째부터 30번째 행"
          ],
          answer: 3,
          why: `OFFSET 20은 앞의 20행을 건너뛴다는 뜻이고 LIMIT 10은 그다음 10행을 가져오라는 뜻이므로 21번째부터 30번째 행입니다.`
        }
      ],
      practice: [
        {
          title: "평균보다 큰 주문 찾기",
          task: `orders(id, customer_id, amount, status)에 (1,1,120,'paid'), (2,1,300,'cancelled'), (3,2,500,'paid'), (4,3,80,'paid'), (5,3,250,'paid'), (6,2,700,'paid') 가 들어 있습니다. 전체 주문의 평균 금액보다 amount가 큰 주문의 id와 amount를 id 오름차순으로 조회하세요. 평균은 325이므로 기대 결과는 (3, 500), (6, 700) 두 행입니다.`,
          hint: `평균은 서브쿼리 (SELECT AVG(amount) FROM orders)로 구해 WHERE에서 비교합니다.`,
          solution: `SELECT id, amount
FROM orders
WHERE amount > (
  SELECT AVG(amount)
  FROM orders
)
ORDER BY id;`,
          explain: `스칼라 서브쿼리가 전체 평균 325를 돌려주고 바깥 쿼리의 WHERE가 그보다 큰 행만 남깁니다. 300은 평균보다 작고 500과 700만 큽니다. 마지막에 ORDER BY id로 순서를 고정합니다.`
        },
        {
          title: "결제 완료 고객별 합계와 HAVING",
          task: `orders(id, customer_id, amount, status)에 (1,1,120,'paid'), (2,1,300,'cancelled'), (3,2,500,'paid'), (4,3,80,'paid'), (5,3,250,'paid'), (6,2,700,'paid') 가 들어 있습니다. status가 'paid'인 주문만 대상으로 customer_id별 주문 개수를 cnt, 금액 합계를 total로 구하고, 합계가 300 이상인 고객만 total이 큰 순서로 조회하세요. 기대 결과는 (2, 2, 1200), (3, 2, 330) 두 행입니다.`,
          hint: `개별 행 조건(status)은 WHERE에, 그룹 합계 조건은 HAVING에 씁니다.`,
          solution: `SELECT customer_id, COUNT(*) AS cnt, SUM(amount) AS total
FROM orders
WHERE status = 'paid'
GROUP BY customer_id
HAVING SUM(amount) >= 300
ORDER BY total DESC;`,
          explain: `WHERE가 paid 주문 5건만 남기고, 고객별 합계는 고객 1이 120, 고객 2가 1200, 고객 3이 330입니다. HAVING SUM(amount) >= 300으로 고객 1이 제외되고 total 내림차순으로 정렬됩니다.`
        },
        {
          title: "주문 없는 고객도 포함한 결제 건수",
          task: `customers(id, name)에 (1,'김민수'), (2,'이서연'), (3,'박지훈'), (4,'최유나')가 있고, orders(id, customer_id, amount, status)에 (1,1,120,'paid'), (2,1,300,'cancelled'), (3,2,500,'paid'), (4,3,80,'paid'), (5,3,250,'paid'), (6,2,700,'paid') 가 들어 있습니다. 모든 고객에 대해 name과 status가 'paid'인 주문 개수를 paid_cnt로 조회하고 customers.id 순서로 정렬하세요. 기대 결과는 (김민수, 1), (이서연, 2), (박지훈, 2), (최유나, 0) 네 행입니다.`,
          hint: `LEFT JOIN을 쓰고 status 조건은 WHERE가 아니라 ON에 넣습니다. 개수는 COUNT(o.id)로 셉니다.`,
          solution: `SELECT c.name, COUNT(o.id) AS paid_cnt
FROM customers c
LEFT JOIN orders o
  ON o.customer_id = c.id AND o.status = 'paid'
GROUP BY c.id, c.name
ORDER BY c.id;`,
          explain: `status 조건을 ON에 두면 paid가 아닌 주문은 매칭되지 않을 뿐 고객 행은 유지됩니다. 최유나는 매칭되는 주문이 없어 o.id가 NULL이고 COUNT(o.id)가 0이 됩니다. WHERE에 조건을 두면 그런 행이 사라지므로 주의하세요.`
        }
      ]
    },
    {
      level: "고급",
      intro: `이 단계에서는 정규화로 테이블을 설계하고 인덱스와 실행 계획으로 쿼리 성능을 점검하는 방법을 배웁니다. 또 트랜잭션과 ACID로 데이터 일관성을 지키고, CTE와 윈도 함수로 복잡한 분석 쿼리를 읽기 쉽게 작성합니다.`,
      lessons: [
        {
          title: "정규화: 중복 없는 테이블 설계",
          body: `정규화는 같은 정보가 여러 곳에 중복 저장되어 생기는 수정, 삽입, 삭제 이상을 막기 위해 테이블을 나누는 설계 방법입니다. 제1정규형(1NF)은 한 칸에 값이 하나만 들어가야 한다는 원칙이고 쉼표로 여러 상품명을 한 칸에 넣는 설계가 대표적인 위반입니다. 제2정규형(2NF)은 복합 기본키일 때 키의 일부에만 종속되는 열(부분 종속)이 없어야 한다는 것이고, 제3정규형(3NF)은 기본키가 아닌 열이 다른 일반 열에 의해 결정되는 이행 종속이 없어야 한다는 것입니다. 예를 들어 주문 테이블에 고객 도시를 같이 두면 도시가 고객에 의해 결정되므로 고객 테이블로 분리해야 합니다. 다만 정규화를 지나치게 하면 JOIN이 많아져 조회가 느려질 수 있어서, 읽기 성능이 중요한 곳에서는 일부러 중복을 허용하는 반정규화를 선택하기도 합니다.`,
          code: `-- 나쁜 설계: 한 칸에 여러 값, 고객 정보 중복
CREATE TABLE orders_bad (
  order_id      INT PRIMARY KEY,
  customer_name VARCHAR(50),
  customer_city VARCHAR(50),
  product_names VARCHAR(200)   -- '사과,배,귤' 처럼 여러 값 (1NF 위반)
);

-- 정규화된 설계
CREATE TABLE customers (
  id    INT PRIMARY KEY,
  name  VARCHAR(50) NOT NULL,
  email VARCHAR(100),
  city  VARCHAR(50)
);

CREATE TABLE products (
  id    INT PRIMARY KEY,
  name  VARCHAR(50) NOT NULL,
  price INT NOT NULL
);

CREATE TABLE orders (
  id          INT PRIMARY KEY,
  customer_id INT NOT NULL,
  amount      INT NOT NULL,        -- 주문 시점의 결제 금액
  status      VARCHAR(20) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers (id)
);

-- 주문과 상품은 N:M 관계이므로 연결 테이블을 둔다
CREATE TABLE order_items (
  order_id   INT NOT NULL,
  product_id INT NOT NULL,
  quantity   INT NOT NULL,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id)   REFERENCES orders (id),
  FOREIGN KEY (product_id) REFERENCES products (id)
);`
        },
        {
          title: "인덱스: 검색을 빠르게 하는 자료구조",
          body: `인덱스는 책의 색인처럼 특정 열의 값으로 행을 빠르게 찾게 해 주는 별도의 자료구조로, 대부분의 관계형 DB에서 기본 형태는 B-트리입니다. 인덱스가 없으면 DB는 테이블 전체를 훑는 풀 스캔을 해야 하지만, WHERE나 JOIN에 자주 쓰이는 열에 인덱스를 만들면 필요한 행만 찾아갈 수 있습니다. 여러 열로 만든 복합 인덱스는 보통 맨 앞 열부터 순서대로 사용되므로, (customer_id, status) 인덱스는 customer_id 조건에는 유용하지만 status만 조건으로 쓰는 쿼리에는 일반적으로 효과가 적습니다(일부 DB는 skip scan 같은 최적화로 어느 정도 보완하지만 맨 앞 열 조건이 있을 때만큼 효율적이지는 않습니다). 또 열에 함수를 씌우거나(LOWER(email) = ...) LIKE '%민수'처럼 앞에 와일드카드를 붙이면 일반 인덱스를 쓰기 어렵습니다. 인덱스는 공짜가 아니어서 INSERT, UPDATE, DELETE 때마다 함께 갱신되어 쓰기가 느려지고 저장 공간도 쓰므로, 필요한 곳에만 만들어야 합니다.`,
          code: `-- 단일 열 인덱스
CREATE INDEX idx_orders_customer ON orders (customer_id);

-- 복합 인덱스: 맨 앞 열(customer_id)부터 사용된다
-- (실무에서는 이 인덱스가 있으면 위의 단일 인덱스는 중복이라 보통 만들지 않는다)
CREATE INDEX idx_orders_cust_status ON orders (customer_id, status);

-- 유일 인덱스: 중복 값을 막고 검색도 빠르게 한다
CREATE UNIQUE INDEX uq_customers_email ON customers (email);

-- 인덱스를 활용하기 좋은 조건
SELECT * FROM orders WHERE customer_id = 7 AND status = 'paid';
SELECT * FROM orders WHERE customer_id = 7;

-- 일반 인덱스를 쓰기 어려운 조건
SELECT * FROM orders WHERE status = 'paid';              -- 맨 앞 열 조건 없음
SELECT * FROM customers WHERE LOWER(email) = 'a@x.com';  -- 열에 함수 적용
SELECT * FROM customers WHERE name LIKE '%민수';         -- 앞쪽 와일드카드`
        },
        {
          title: "실행 계획(EXPLAIN) 읽기",
          body: `실행 계획은 DB 옵티마이저가 쿼리를 어떤 순서와 방법(풀 스캔, 인덱스 사용, JOIN 방식 등)으로 실행할지 정한 결과이며, 쿼리가 느릴 때 가장 먼저 확인할 자료입니다. PostgreSQL과 MySQL은 EXPLAIN, SQLite는 EXPLAIN QUERY PLAN을 쿼리 앞에 붙여 계획을 볼 수 있습니다. PostgreSQL에서는 Seq Scan이 풀 스캔이고 Index Scan이 인덱스 사용이며, MySQL에서는 type 열의 ALL이 풀 스캔이고 key 열에서 실제로 선택된 인덱스를 볼 수 있습니다. PostgreSQL의 EXPLAIN ANALYZE는 쿼리를 실제로 실행해서 소요 시간까지 보여 주기 때문에, UPDATE나 DELETE에 붙이면 데이터가 실제로 바뀐다는 점이 흔한 실수입니다(필요하면 트랜잭션 안에서 실행하고 ROLLBACK합니다). 인덱스가 있어도 테이블이 아주 작거나 조건에 맞는 행이 많으면 옵티마이저가 풀 스캔을 고르는 것이 더 빠를 수 있고, 통계 정보가 오래되면 잘못된 계획이 나올 수 있습니다.`,
          code: `-- PostgreSQL, MySQL: 계획만 확인 (쿼리를 실행하지 않음)
EXPLAIN
SELECT * FROM orders WHERE customer_id = 7;

-- PostgreSQL: 실제로 실행하고 시간까지 측정 (DML에는 주의!)
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 7;

-- SQLite
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 7;

-- 안전하게 DELETE의 실제 비용을 재는 방법 (PostgreSQL)
BEGIN;
EXPLAIN ANALYZE DELETE FROM orders WHERE status = 'cancelled';
ROLLBACK;`
        },
        {
          title: "트랜잭션과 ACID",
          body: `트랜잭션은 여러 SQL 문을 하나의 작업 단위로 묶어, 전부 성공하면 COMMIT으로 확정하고 문제가 생기면 ROLLBACK으로 전부 되돌리는 기능입니다. 계좌 이체에서 출금만 되고 입금은 실패하는 일을 막는 것이 대표적인 예입니다. ACID는 트랜잭션의 네 가지 성질로, 원자성(Atomicity, 전부 수행되거나 전혀 수행되지 않음), 일관성(Consistency, 제약조건을 지키는 유효한 상태에서 유효한 상태로만 이동), 격리성(Isolation, 동시에 실행되는 트랜잭션이 서로 간섭하지 않음), 지속성(Durability, 커밋된 결과는 장애가 나도 유지됨)을 뜻합니다. 격리 수준(READ COMMITTED, REPEATABLE READ, SERIALIZABLE 등)이 높을수록 이상 현상은 줄지만 동시 처리 성능이 떨어질 수 있고, 기본 격리 수준은 DB마다 다릅니다. 트랜잭션을 너무 오래 열어 두면 다른 작업이 잠금 때문에 대기하거나 교착 상태(deadlock)가 생길 수 있으므로 짧게 유지하는 것이 좋습니다.`,
          code: `-- accounts(id, balance) 테이블에 ('a', 1000), ('b', 500)이 있다고 가정합니다.
-- 시작 문법: PostgreSQL, SQLite, MySQL은 BEGIN (MySQL은 START TRANSACTION도 가능)
--           SQL Server는 BEGIN TRANSACTION

-- 계좌 이체: a에서 b로 300 이체
BEGIN;

UPDATE accounts SET balance = balance - 300 WHERE id = 'a';
UPDATE accounts SET balance = balance + 300 WHERE id = 'b';

COMMIT;

-- 중간에 문제가 생기면 모두 취소
BEGIN;
UPDATE accounts SET balance = balance - 300 WHERE id = 'a';
ROLLBACK;  -- a의 잔액은 원래대로 돌아간다`
        },
        {
          title: "CTE로 복잡한 쿼리 정리하기",
          body: `CTE(공통 테이블 식)는 WITH 이름 AS (서브쿼리) 형태로 쿼리 앞에 이름 붙인 임시 결과를 정의해 두고 본 쿼리에서 테이블처럼 쓰는 문법입니다. 서브쿼리를 겹겹이 중첩하는 대신 단계별로 이름을 붙여 위에서 아래로 읽을 수 있고, 쉼표로 여러 CTE를 이어 앞의 CTE를 뒤에서 참조할 수 있습니다. 한 CTE는 해당 쿼리 하나에서만 유효하며 뷰나 테이블처럼 저장되지 않는다는 점을 기억하세요. WITH RECURSIVE를 쓰면 자기 자신을 참조하는 재귀 CTE로 조직도나 카테고리 트리 같은 계층 데이터를 따라가거나 숫자 열을 만들 수 있는데, 종료 조건이 없으면 무한히 반복되므로 반드시 WHERE 등으로 멈추는 조건을 넣어야 합니다. CTE는 PostgreSQL, MySQL 8.0 이상, SQLite 3.8.3 이상, SQL Server에서 지원되며 SQL Server는 RECURSIVE 키워드를 쓰지 않습니다.`,
          code: `-- 단계별 CTE: 결제 완료 주문 -> 고객별 합계 -> 이름 붙이기
WITH paid AS (
  SELECT customer_id, amount
  FROM orders
  WHERE status = 'paid'
),
totals AS (
  SELECT customer_id, SUM(amount) AS total
  FROM paid
  GROUP BY customer_id
)
SELECT c.name, t.total
FROM totals t
JOIN customers c ON c.id = t.customer_id
WHERE t.total >= 300
ORDER BY t.total DESC;

-- 재귀 CTE: 1부터 5까지 숫자 생성 (결과: 1, 2, 3, 4, 5)
WITH RECURSIVE n(x) AS (
  SELECT 1
  UNION ALL
  SELECT x + 1 FROM n WHERE x < 5
)
SELECT x FROM n;`
        },
        {
          title: "윈도 함수: 행을 줄이지 않는 집계",
          body: `윈도 함수는 OVER(...) 절과 함께 쓰며, GROUP BY와 달리 행을 하나로 합치지 않고 각 행 옆에 순위나 합계 같은 계산 결과를 붙여 줍니다. PARTITION BY는 계산 범위를 나누는 그룹이고 ORDER BY는 그 안에서의 순서를 정합니다. ROW_NUMBER는 동점이어도 1, 2, 3으로 번호를 매기고, RANK는 동점이면 같은 순위를 주고 다음 순위를 건너뛰며(1, 2, 2, 4), DENSE_RANK는 건너뛰지 않습니다(1, 2, 2, 3). SUM() OVER (ORDER BY ...)로 누적 합계를, LAG와 LEAD로 이전 행과 다음 행의 값을 구할 수 있고, 누적 합계에서는 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW처럼 범위를 명시하면 동점 행 처리가 분명해집니다. 윈도 함수는 SELECT와 ORDER BY에서만 쓸 수 있어 WHERE에 직접 쓰면 오류가 나므로, 순위로 거르려면 CTE나 서브쿼리로 한 번 감싸야 합니다. MySQL은 8.0부터, SQLite는 3.25부터 윈도 함수를 지원합니다.`,
          code: `-- employees(name, dept, salary), daily_sales(order_date, amount) 테이블이 있다고 가정합니다.

-- 부서별 급여 순위, 행 번호, 부서 합계
SELECT name, dept, salary,
       RANK()       OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk,
       ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC, name) AS rn,
       SUM(salary)  OVER (PARTITION BY dept) AS dept_total
FROM employees;

-- 누적 합계와 이전 행 값
SELECT order_date, amount,
       SUM(amount) OVER (
         ORDER BY order_date
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_total,
       LAG(amount) OVER (ORDER BY order_date) AS prev_amount
FROM daily_sales;

-- 윈도 함수 결과로 거르려면 CTE로 감싼다: 부서별 최고 급여자
WITH ranked AS (
  SELECT name, dept, salary,
         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC, name) AS rn
  FROM employees
)
SELECT name, dept, salary
FROM ranked
WHERE rn = 1;`
        }
      ],
      quiz: [
        {
          q: `scores(name, score)에 (A,90), (B,80), (C,80), (D,70) 네 행이 있습니다. D의 rnk 값은?

SELECT name, RANK() OVER (ORDER BY score DESC) AS rnk
FROM scores;`,
          choices: ["3", "2", "4", "1"],
          answer: 2,
          why: `RANK는 동점에 같은 순위를 주고 다음 순위를 건너뜁니다. A=1, B=2, C=2이고 그다음 D는 4입니다.`
        },
        {
          q: `scores(name, score)에 (A,90), (B,80), (C,80), (D,70) 네 행이 있습니다. RANK 대신 DENSE_RANK를 쓰면 D의 rnk 값은?

SELECT name, DENSE_RANK() OVER (ORDER BY score DESC) AS rnk
FROM scores;`,
          choices: ["3", "4", "2", "1"],
          answer: 0,
          why: `DENSE_RANK는 동점 뒤에도 순위를 건너뛰지 않습니다. A=1, B=2, C=2, D=3입니다.`
        },
        {
          q: `orders(customer_id, amount)에 (1,100), (1,200), (2,50), (3,400), (3,100)이 있습니다. 다음 쿼리가 돌려주는 customer_id는?

WITH big AS (
  SELECT customer_id, SUM(amount) AS total
  FROM orders
  GROUP BY customer_id
)
SELECT customer_id FROM big
WHERE total >= 300
ORDER BY customer_id;`,
          choices: ["1 하나만", "3 하나만", "1, 2, 3", "1, 3"],
          answer: 3,
          why: `CTE big은 고객별 합계를 (1,300), (2,50), (3,500)으로 만들고, total이 300 이상인 고객 1과 3이 남습니다.`
        },
        {
          q: `accounts(id, balance)에 ('a', 1000), ('b', 500)이 있을 때 다음을 실행한 뒤 a의 잔액은?

BEGIN;
UPDATE accounts SET balance = balance - 300 WHERE id = 'a';
UPDATE accounts SET balance = balance + 300 WHERE id = 'b';
ROLLBACK;
SELECT balance FROM accounts WHERE id = 'a';`,
          choices: ["700", "1000", "1300", "오류가 발생한다"],
          answer: 1,
          why: `ROLLBACK은 트랜잭션 안의 변경을 모두 취소하므로 a의 잔액은 원래 값인 1000입니다. COMMIT이었다면 700이 되었을 것입니다.`
        },
        {
          q: `트랜잭션 안의 모든 작업이 전부 성공하거나 하나라도 실패하면 전부 취소되는 성질은 ACID 중 무엇일까요?`,
          choices: [
            "원자성(Atomicity)",
            "일관성(Consistency)",
            "격리성(Isolation)",
            "지속성(Durability)"
          ],
          answer: 0,
          why: `전부 수행되거나 전혀 수행되지 않는다는 all-or-nothing 성질이 원자성입니다. 격리성은 동시 실행 간섭, 지속성은 커밋 후 보존에 관한 성질입니다.`
        },
        {
          q: `customers.email에 일반(B-트리) 인덱스가 있을 때 다음 쿼리에 대한 설명으로 옳은 것은?

SELECT * FROM customers WHERE LOWER(email) = 'a@x.com';`,
          choices: [
            "항상 email 인덱스를 그대로 사용해 빠르게 검색한다",
            "LOWER 함수는 WHERE 절에 쓸 수 없어 문법 오류가 난다",
            "열에 함수를 씌웠으므로 일반 인덱스를 쓰지 못해 풀 스캔이 될 수 있다",
            "DB가 인덱스를 자동으로 대소문자 무시 인덱스로 바꿔서 사용한다"
          ],
          answer: 2,
          why: `인덱스에는 email 원래 값이 정렬되어 있어서 LOWER(email) 값으로는 찾아갈 수 없습니다. 이런 검색이 많다면 함수 기반 인덱스를 지원하는 DB에서 그것을 만들거나 데이터를 소문자로 저장해 두는 방법이 있습니다.`
        },
        {
          q: `orders(order_id PRIMARY KEY, customer_id, customer_city) 테이블에서 customer_city는 customer_id에 의해 결정됩니다. 이 설계의 문제를 가장 정확히 설명한 것은?`,
          choices: [
            "1NF 위반: 한 칸에 여러 값이 들어 있다",
            "2NF 위반: 복합 키의 일부에 종속된다",
            "문제가 없는 정규화된 설계이다",
            "3NF 위반: 기본키가 아닌 열이 다른 일반 열에 종속되는 이행 종속이다"
          ],
          answer: 3,
          why: `order_id가 customer_id를, customer_id가 customer_city를 결정하는 이행 종속이므로 3NF 위반입니다. 기본키가 단일 열이라 부분 종속(2NF 위반)은 해당되지 않으며, customer_city는 고객 테이블로 분리해야 합니다.`
        },
        {
          q: `PostgreSQL에서 EXPLAIN ANALYZE DELETE FROM orders WHERE status = 'cancelled'; 를 트랜잭션 없이 실행하면 어떻게 될까요?`,
          choices: [
            "계획만 보여 주고 실제로는 삭제하지 않는다",
            "쿼리가 실제로 실행되어 행이 삭제된다",
            "문법 오류가 발생한다",
            "항상 읽기 전용으로 강제 실행된다"
          ],
          answer: 1,
          why: `EXPLAIN ANALYZE는 쿼리를 실제로 실행해 시간을 측정합니다. 그래서 DELETE나 UPDATE에 쓰면 데이터가 바뀌므로 BEGIN으로 감싸고 ROLLBACK해야 안전합니다.`
        }
      ],
      practice: [
        {
          title: "부서별 급여 순위 매기기",
          task: `employees(name, dept, salary)에 ('A','dev',500), ('B','dev',700), ('C','dev',600), ('D','ops',400), ('E','ops',400)이 들어 있습니다. 부서(dept) 안에서 salary가 높은 순서로 RANK를 구해 rnk라는 별칭으로 붙이고, 결과를 dept, rnk, name 순으로 정렬해 name, dept, rnk를 조회하세요. 기대 결과는 (B,dev,1), (C,dev,2), (A,dev,3), (D,ops,1), (E,ops,1) 다섯 행입니다.`,
          hint: `RANK() OVER (PARTITION BY dept ORDER BY salary DESC)를 사용하고, 전체 쿼리 끝에 ORDER BY를 따로 붙입니다.`,
          solution: `SELECT name,
       dept,
       RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk
FROM employees
ORDER BY dept, rnk, name;`,
          explain: `PARTITION BY dept로 부서별 그룹을 나누고 그 안에서 급여 내림차순으로 순위를 매깁니다. ops의 D와 E는 급여가 같아 둘 다 1위입니다. 윈도 함수 안의 ORDER BY와 쿼리 끝의 ORDER BY는 역할이 다르다는 점에 유의하세요.`
        },
        {
          title: "CTE로 부서 평균보다 높은 직원 찾기",
          task: `employees(name, dept, salary)에 ('A','dev',500), ('B','dev',700), ('C','dev',600), ('D','ops',400), ('E','ops',400)이 들어 있습니다. CTE로 부서별 평균 급여를 먼저 구한 뒤, 자기 부서 평균보다 salary가 엄격히 큰 직원의 name과 salary를 name 순으로 조회하세요. dev 평균은 600, ops 평균은 400이므로 기대 결과는 (B, 700) 한 행입니다.`,
          hint: `WITH dept_avg AS (...)로 dept별 AVG(salary)를 만들고 employees와 dept로 JOIN한 뒤 WHERE에서 비교합니다.`,
          solution: `WITH dept_avg AS (
  SELECT dept, AVG(salary) AS avg_sal
  FROM employees
  GROUP BY dept
)
SELECT e.name, e.salary
FROM employees e
JOIN dept_avg d ON d.dept = e.dept
WHERE e.salary > d.avg_sal
ORDER BY e.name;`,
          explain: `CTE가 부서별 평균(dev 600, ops 400)을 만들고 JOIN으로 각 직원 옆에 자기 부서 평균을 붙입니다. 600인 C와 400인 D, E는 평균과 같아 엄격한 부등호(>)에서 제외되고 700인 B만 남습니다.`
        },
        {
          title: "트랜잭션으로 계좌 이체하기",
          task: `accounts(id, balance)에 ('a', 1000), ('b', 500)이 들어 있습니다. 트랜잭션 하나 안에서 a의 잔액을 300 줄이고 b의 잔액을 300 늘린 뒤 커밋하고, 마지막에 id와 balance를 id 순으로 조회하세요. 기대 결과는 (a, 700), (b, 800) 두 행입니다.`,
          hint: `BEGIN으로 시작해 두 UPDATE에 각각 WHERE id를 붙이고 COMMIT으로 마칩니다.`,
          solution: `BEGIN;

UPDATE accounts SET balance = balance - 300 WHERE id = 'a';
UPDATE accounts SET balance = balance + 300 WHERE id = 'b';

COMMIT;

SELECT id, balance FROM accounts ORDER BY id;`,
          explain: `두 UPDATE가 하나의 트랜잭션으로 묶여 있어 둘 다 반영되거나 둘 다 취소됩니다. COMMIT 이후 a는 1000-300=700, b는 500+300=800이 됩니다. WHERE id 조건을 빼면 모든 계좌가 바뀌므로 주의해야 합니다.`
        }
      ]
    }
  ]
});
