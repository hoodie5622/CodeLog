(window.PRO_MODULES = window.PRO_MODULES || {})["be-spring"] = {
  id: "be-spring",
  summary: `Spring Boot 4.1(Java 25·21, Kotlin)로 계층 구조·검증·ProblemDetail·트랜잭션·JPA·Testcontainers 테스트·운영 설정을 갖춘 API를 만들고, 3.5에서 4.1로의 마이그레이션 리포트와 인수인계 패키지까지 납품할 수 있다.`,
  hours: 120,
  goals: [
    `Spring Boot 4.1 애플리케이션의 기동 순서(Environment, 컴포넌트 스캔, 자동 구성 조건 평가, 빈 생성, 프록시, 서버 기동)를 설명하고 --debug 조건 평가 보고서로 기동 실패와 빈 누락의 원인을 찾을 수 있다`,
    `기능별 패키지와 레이어(web·service·domain)로 구조를 설계하고 record·sealed 타입과 DTO 분리로 요구사항 변경이 어느 층에서 끝나는지 설명할 수 있다`,
    `프로퍼티 소스 우선순위와 프로파일로 설정과 비밀을 코드 밖으로 빼고 @ConfigurationProperties 검증으로 잘못된 설정이 기동 시점에 실패하게 만들 수 있다`,
    `Bean Validation과 전역 예외 처리로 모든 오류 응답을 RFC 9457 ProblemDetail 계약으로 통일하고 오류 계약을 테스트로 고정할 수 있다`,
    `@Transactional의 프록시 동작·롤백 규칙·자기 호출 함정을 코드로 재현하고 JPA N+1을 쿼리 수 테스트로 잡아 fetch 전략으로 고칠 수 있다`,
    `슬라이스 테스트·@MockitoBean·Testcontainers(@ServiceConnection)로 실제 PostgreSQL 위의 통합 테스트를 구성하고 Boot 4의 테스트 API 변경점을 반영할 수 있다`,
    `Actuator 프로브·그레이스풀 셧다운·커넥션 풀 산수·가상 스레드 설정을 근거를 들어 정하고 MVC+가상 스레드와 WebFlux 중 하나를 선택할 수 있다`,
    `Boot 3.5 프로젝트를 4.1로 올리는 마이그레이션 계획·리포트·견적을 작성하고 Kotlin과 공공 SI(eGovFrame) 환경의 관례를 구분해 대응할 수 있다`
  ],
  lessons: [
    {
      title: `Spring Boot가 뜰 때 일어나는 일: IoC 컨테이너·자동 구성·빈 생명주기·버전 지도`,
      body: `Spring Boot는 설정이 필요 없는 마법이 아니라 **클래스패스를 보고 빈(bean) 정의를 대신 추가해 주는 도구**입니다. 이 모델을 알면 기동 실패 로그의 대부분을 읽을 수 있고, 모르면 오류 메시지가 외계어로 보입니다. 선수 모듈의 HTTP 메서드·상태 코드·오류 계약이 이 프레임워크의 어느 층에서 구현되는지 이어 붙이는 것이 이 모듈 전체의 목표입니다.

### 왜 한국 시장에서 이 모듈인가

위시켓 기간제(상주) 프로젝트 분석(2025-01~09)에서 백엔드 요청의 39.8%가 JAVA였고, 같은 회사의 2025 상반기 리포트에서 Spring Boot는 백엔드 기술 중 평균 단가가 가장 높았습니다(약 581만 원). 사람인 키워드 검색(2026-11-09 하루 기준)은 Spring Boot 569건, Spring Security 205건입니다. 다만 모두 마켓플레이스·채용 사이트 표본입니다. 글로벌 Stack Overflow 2026 설문의 웹 프레임워크 사용률은 Node.js 46.4%, Spring Boot 12.8%이고, 한국 비중을 직접 확인하지 못했다고 적은 조사도 있습니다. 그래서 이 수치는 "한국 상주·공공·금융 외주의 기본값" 정도로만 읽으세요.

### 기동 순서

1. ‹SpringApplication.run›이 설정 소스를 모은 Environment를 만들고 ApplicationContext(컨테이너)를 생성합니다.
2. ‹@SpringBootApplication›에 들어 있는 컴포넌트 스캔이 **그 클래스의 패키지 아래**에서 ‹@Component›·‹@Service›·‹@RestController› 클래스를 찾아 빈 정의로 등록합니다. 패키지 밖에 둔 클래스는 에러 없이 무시되므로 "빈이 없다"는 오류의 흔한 원인입니다.
3. 자동 구성이 조건(‹@ConditionalOnClass›·‹@ConditionalOnMissingBean›·‹@ConditionalOnProperty›)을 평가해 빈을 더합니다. 내가 같은 타입의 빈을 정의하면 자동 구성은 물러납니다. 실행 인자 ‹--debug›를 주면 어떤 자동 구성이 왜 켜지고 꺼졌는지 조건 평가 보고서가 출력됩니다.
4. 컨테이너가 빈을 만들고 의존성을 주입한 뒤 BeanPostProcessor가 가공합니다. ‹@Transactional›·‹@Retryable› 같은 기능은 여기서 **프록시로 감싸는 방식**으로 붙습니다(레슨 5·6).
5. 임베디드 Tomcat이 포트를 열고 요청을 받습니다.

### 빈 생명주기와 스코프

빈은 생성, 의존성 주입, ‹@PostConstruct› 초기화, (프록시 래핑), 사용, ‹@PreDestroy› 소멸 순서로 살아갑니다. 기본 스코프는 singleton이라 **빈 하나를 모든 요청 스레드가 공유**합니다. 서비스 클래스에 가변 필드(마지막 처리 결과, 공유 날짜 포맷터)를 두면 동시 요청에서 값이 섞입니다. 상태는 지역 변수나 DB에 두고 빈은 무상태로 만드세요. 생성자 주입을 쓰면 필드를 final로 둘 수 있고, 컨테이너 없이 new로 단위 테스트를 만들 수 있고, 순환 의존이 기동 시점에 실패로 드러납니다.

### 스타터와 BOM

스타터(‹spring-boot-starter-webmvc› 등)는 의존성 묶음이고, Boot의 의존성 관리(BOM)가 서로 호환되는 버전 조합을 고정합니다. 라이브러리 버전을 직접 지정하는 순간 호환성 책임이 내게 넘어옵니다. Boot 4.0부터 코드베이스가 더 작은 모듈로 쪼개져 스타터 이름이 바뀐 것이 많습니다(레슨 10).

### 버전 지도 (2026-11 기준)

| 항목 | 값 |
| 현행 GA | Spring Boot 4.1.2 (4.2.0-RC2가 2026-11-05, 4.2 GA는 미출시) |
| 요구 사양 | Java 17 이상(27까지 호환), Spring Framework 7.0.10+, Tomcat 11, Gradle 8.14+/9 (4.1.2 문서 기준) |
| 권장 JDK | 25 LTS(GA 2025-09-16), 21 LTS도 널리 사용 |
| 4.0의 의미 | 2025-11-20 출시, 모듈화·Jackson 3·JSpecify·API 버저닝이 들어온 큰 전환 |
| OSS 지원 종료(제3자 집계) | 3.5=2026-06-30(종료), 4.0=2026-12-31, 4.1=2027-07-31 |

마이너 릴리스의 OSS 지원이 최소 13개월이라는 정책(Spring Support Policy) 때문에 "버전을 올리는 일" 자체가 반복되는 업무가 됩니다. 집계 사이트는 날짜를 월말로 반올림하므로 계약서에 쓸 날짜는 공식 릴리스 일정으로 재확인하세요.

### 증상에서 원인으로

- ‹NoSuchBeanDefinitionException›: 스캔 범위 밖 패키지이거나, 조건 때문에 자동 구성이 꺼진 경우입니다.
- 기동은 되는데 기능이 없다: 스타터 누락입니다. Boot 4의 모듈 분리 이후 흔해졌습니다.
- 기동 중 순환 참조 오류: 설계 신호입니다. 설정으로 허용하지 말고 의존 방향을 고치세요.`,
      code: `package demo;

import java.time.Clock;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Service;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        var ctx = SpringApplication.run(DemoApplication.class, args);
        var svc = ctx.getBean(GreetingService.class);
        System.out.println(svc.greet("spring"));
        // 프록시가 감싸면 이름 뒤에 SpringCGLIB 표식이 붙는다(이 서비스는 프록시 대상이 아니라 그대로 출력된다)
        System.out.println(svc.getClass().getName());
        System.out.println("빈 정의 수 = " + ctx.getBeanDefinitionCount());
    }
}

@Configuration(proxyBeanMethods = false)
class TimeConfig {
    @Bean
    Clock clock() {                        // 시간을 빈으로 빼 두면 테스트에서 고정 시계를 주입할 수 있다
        return Clock.systemUTC();
    }
}

@Service
class GreetingService {
    private final Clock clock;             // final 필드 + 생성자 주입: 불변이고 컨테이너 없이 new 가능

    GreetingService(Clock clock) {         // 생성자가 하나뿐이면 @Autowired 생략
        this.clock = clock;
    }

    String greet(String name) {
        return "hello " + name + " @ " + clock.instant();
    }
}`,
      codeLang: `java`,
      key: [
        `기동은 Environment 생성, 컴포넌트 스캔, 자동 구성 조건 평가, 빈 생성·주입, 프록시 래핑, 서버 기동 순서로 진행된다.`,
        `자동 구성은 조건부 빈 추가이며 내가 정의한 빈이 우선한다. 원인 추적은 --debug 조건 평가 보고서로 한다.`,
        `싱글톤 빈은 모든 요청 스레드가 공유하므로 무상태로 만들고 생성자 주입을 쓴다.`,
        `2026-11 기준 현행은 Boot 4.1.2, Java 17+(권장 25 LTS), Framework 7, Tomcat 11이며 3.5의 OSS 지원은 2026-06-30에 끝났다.`
      ],
      pitfalls: [
        `@SpringBootApplication 클래스를 하위 패키지에 두어 상위 패키지의 컨트롤러가 스캔되지 않고 404만 반복해서 본다.`,
        `싱글톤 서비스에 가변 필드를 두어 동시 요청에서 값이 섞이고, 필드 주입 때문에 단위 테스트에서도 컨테이너가 필요해진다.`,
        `자동 구성을 마법으로 취급해 --debug 보고서 없이 의존성을 넣었다 뺐다 하며 시행착오를 반복한다.`,
        `라이브러리 버전을 BOM과 다르게 직접 고정해 두고 Boot를 올릴 때 호환성 문제를 통째로 떠안는다.`
      ]
    },
    {
      title: `프로젝트 구조: 레이어드와 기능별 패키지, DTO 분리, 모던 Java, 멀티모듈`,
      body: `구조 설계의 목적은 예쁜 다이어그램이 아니라 **요구사항 변경이 한 곳에서 끝나게 하는 것**입니다. 외주에서는 계약 기간 중 요구사항이 몇 번 바뀌는 것이 정상이고, 구조가 나쁘면 필드 하나 추가가 컨트롤러·서비스·엔티티·SQL 네 곳을 동시에 고치는 작업이 됩니다.

### 레이어와 의존 방향

- web(컨트롤러): HTTP를 다룹니다. 요청 파싱, 검증, 상태 코드, 응답 DTO 변환. 업무 규칙을 넣지 않습니다.
- service(유스케이스): 트랜잭션 경계와 업무 규칙. 메서드 하나가 유스케이스 하나입니다.
- domain·repository: 엔티티와 저장소. ‹HttpServletRequest› 같은 웹 타입을 모릅니다.

의존은 위에서 아래로만 흐릅니다. 서비스가 컨트롤러의 DTO를 알기 시작하면 배치나 메시지 소비자 같은 다른 진입점이 같은 서비스를 재사용하지 못합니다.

### 기능별 패키지

‹controller/service/repository›처럼 층별로 패키지를 나누면 작은 프로젝트에서는 편하지만 기능이 20개를 넘으면 기능 하나를 고치려고 폴더 세 곳을 오갑니다. ‹order/›, ‹member/›, ‹board/›처럼 **기능으로 묶고 그 안에서 층을 나누는 방식**이 변경 비용이 낮습니다. 클래스를 기본 접근 제어(package-private)로 두면 기능 밖에서 내부 구현 클래스를 마음대로 쓰지 못하게 컴파일러가 막아 줍니다. 컴포넌트 스캔은 접근 제어와 무관하게 동작합니다.

### DTO와 엔티티를 나누는 이유

엔티티를 그대로 JSON으로 내보내면 (1) 지연 로딩 컬렉션이 직렬화 도중 쿼리를 터뜨리고, (2) 컬럼 추가가 곧 API 변경이 되고, (3) 요청 본문을 엔티티로 바로 받으면 클라이언트가 보내서는 안 되는 필드(role, balance)까지 바인딩되는 mass assignment 취약점이 생깁니다. 요청과 응답은 별도 DTO로 받고 서비스에서 변환하세요. 매핑 코드가 지루해도 이 비용이 사고 비용보다 쌉니다.

### 모던 Java를 쓰는 지점

- ‹record›: 불변 DTO. 생성자·접근자·equals가 자동입니다(Java 16+).
- ‹sealed› 인터페이스와 패턴 매칭 ‹switch›: 서비스 결과를 "성공 / 재고 부족"처럼 닫힌 집합으로 표현하면 경우가 추가될 때 컴파일러가 처리 누락을 알려 줍니다(sealed는 Java 17, switch 패턴 매칭은 Java 21부터 정식). 예외를 흐름 제어에 쓰는 것보다 의도가 선명합니다.
- 한국 고객은 Java 17(eGovFrame 5.0이 요구하는 JDK 17+)이나 11·8에 머무는 경우가 많으니 새 문법이 고객 JDK에서 컴파일되는지 먼저 확인하세요.

### 빌드: Gradle과 Maven, 멀티모듈

Boot는 Gradle과 Maven을 모두 지원하고 한국 기업 코드베이스에서는 Maven도 흔합니다(State of Java 2025 조사는 Maven 67%로 보고). 둘 다 읽고 고칠 수 있어야 합니다. 멀티모듈(‹:api›, ‹:domain›, ‹:common›)은 모듈 간 의존 방향을 **컴파일 단계에서 강제**하지만 빌드 설정과 릴리스 복잡도가 늘어납니다. 팀이 작으면 단일 모듈과 패키지 규칙으로 시작하고, 같은 도메인을 쓰는 실행 단위가 둘 이상(API 서버와 배치)이 될 때 나누는 편이 안전합니다. ArchUnit 같은 테스트로 패키지 의존 규칙을 자동 검증하는 방법도 있습니다.

### 구조를 점수로 보는 법

요구사항 변경 3회를 가정해 보세요. (1) 주문에 쿠폰 할인 추가: 서비스 규칙과 DTO 필드. (2) 관리자용 목록 추가: 새 컨트롤러, 같은 서비스. (3) 알림 채널 교체: 인터페이스 구현체만 추가. 각 변경이 몇 파일·몇 층을 건드렸는지가 구조의 점수이고, 레슨 마지막의 실습에서 직접 기록합니다.`,
      code: `package demo.order;

import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.*;

// 도메인 결과를 닫힌 집합으로 표현: 경우가 늘면 아래 switch가 컴파일 오류로 알려 준다 (패턴 매칭 switch: Java 21+)
sealed interface PlaceResult permits PlaceResult.Placed, PlaceResult.OutOfStock {
    record Placed(long orderId) implements PlaceResult {}
    record OutOfStock(String sku) implements PlaceResult {}
}

record PlaceOrderRequest(String sku, int qty) {}   // 웹 계층 DTO: 엔티티를 밖으로 내보내지 않는다

@Service
class OrderService {
    PlaceResult place(String sku, int qty) {
        // 실제로는 재고 조회와 저장이 들어간다. 여기서는 골격만 보인다.
        return qty > 100 ? new PlaceResult.OutOfStock(sku) : new PlaceResult.Placed(42L);
    }
}

@RestController
@RequestMapping("/orders")
class OrderController {
    private final OrderService service;

    OrderController(OrderService service) {
        this.service = service;
    }

    @PostMapping
    ResponseEntity<?> place(@RequestBody PlaceOrderRequest req) {
        return switch (service.place(req.sku(), req.qty())) {
            case PlaceResult.Placed p ->
                ResponseEntity.created(URI.create("/orders/" + p.orderId())).build();
            case PlaceResult.OutOfStock o ->
                ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "재고 부족: " + o.sku()));
        };
    }
}`,
      codeLang: `java`,
      key: [
        `의존은 web, service, domain·repository 방향으로만 흐른다. 구조의 점수는 요구사항 변경이 건드리는 파일·층의 수다.`,
        `기능별 패키지와 package-private 클래스로 기능 경계를 컴파일러가 지키게 한다.`,
        `요청·응답은 record DTO로 분리한다. 지연 로딩 직렬화, API 변경 전파, mass assignment를 한 번에 막는다.`,
        `record는 16+, sealed는 17+, 패턴 매칭 switch는 21+이므로 고객 JDK를 확인한 뒤 쓴다.`,
        `멀티모듈은 의존 방향을 컴파일 시점에 강제하지만 비용이 크므로 실행 단위가 둘 이상일 때 나눈다.`
      ],
      pitfalls: [
        `엔티티를 요청 본문으로 바로 받아 role·balance 같은 필드가 클라이언트 입력으로 덮이는 mass assignment 취약점을 만든다.`,
        `컨트롤러에 업무 규칙과 트랜잭션을 넣어 같은 로직을 배치·메시지 소비자에서 재사용하지 못하고 복사한다.`,
        `처음부터 멀티모듈 10개로 쪼개 빌드 설정과 순환 의존 해결에 일정의 상당 부분을 쓴다.`,
        `고객 JDK가 17인데 Java 21 문법(패턴 매칭 switch)을 써서 납품 환경의 빌드가 실패한다.`
      ]
    },
    {
      title: `설정 외부화: 프로퍼티 우선순위·프로파일·비밀·@ConfigurationProperties`,
      body: `운영 장애의 상당수는 코드가 아니라 설정에서 나옵니다. 개발 PC에서는 되는데 운영에서 접속 주소가 틀리거나, 비밀번호가 저장소에 올라가 있는 식입니다. 이 레슨의 원칙은 둘입니다. **설정은 코드 밖에서 주입하고, 잘못된 설정은 기동 시점에 실패시킨다.**

### 프로퍼티 소스 우선순위

Boot는 여러 소스를 겹쳐 읽고 **뒤에 있는 것이 앞의 것을 덮어씁니다**. 공식 문서 기준으로 낮은 쪽에서 높은 쪽 순서의 핵심은 이렇습니다.

1. 기본 프로퍼티, ‹@PropertySource›
2. 설정 파일(application.properties·yml): jar 안보다 jar 밖이, 기본보다 프로파일별(application-prod.yml)이 높습니다.
3. OS 환경 변수
4. 자바 시스템 프로퍼티(-D)
5. 명령행 인자(‹--server.port=9000›)
6. 테스트용 프로퍼티(‹@TestPropertySource› 등)

그래서 컨테이너에서는 이미지에 들어간 yml을 건드리지 않고 환경 변수로 덮어쓰는 방식이 표준입니다. 환경 변수는 마침표를 밑줄로 바꾼 대문자 형태입니다(예: ‹SPRING_DATASOURCE_URL›). 이름에 대시가 들어간 속성의 표기는 헷갈리기 쉬우니 실제로 값을 주입해 바인딩되는지 테스트로 확인하는 습관을 들이세요. 같은 위치에 properties와 yml이 둘 다 있으면 properties가 이깁니다.

### 프로파일은 값만 바꾼다

‹spring.profiles.active=prod›로 환경별 설정을 고릅니다. 프로파일로 **빈 구성 자체**(운영에서만 다른 결제 구현)를 갈라놓으면 로컬에서 통과한 코드가 운영에서는 다른 코드를 타게 됩니다. 프로파일은 접속 주소·타임아웃·기능 토글 같은 값 차이에만 쓰고, 구현 교체가 필요하면 설정 값으로 고르는 명시적 전략 빈으로 만드세요.

### 비밀 값

저장소에 비밀번호나 API 키가 들어가면 이후 삭제해도 이력에 남습니다. 환경 변수, 쿠버네티스 Secret을 파일로 마운트하고 ‹spring.config.import=optional:configtree:/etc/secrets/›처럼 읽는 방법(파일 이름이 키가 되는 configtree), 클라우드 비밀 관리자를 씁니다. ‹application-local.yml›은 .gitignore에 넣고 예시 파일만 커밋합니다. 값이 로그나 Actuator의 env 엔드포인트로 새지 않는지도 확인합니다(레슨 8).

### @ConfigurationProperties로 타입 안전하게

‹@Value›로 문자열을 흩뿌리는 대신 접두어 하나에 묶어 record로 받습니다. 이점은 (1) 타입 변환(‹Duration›은 "3s" 같은 값), (2) 기본값(‹@DefaultValue›), (3) **Bean Validation으로 기동 시점 검증**입니다. 결제 서버 주소가 비어 있으면 첫 결제 요청에서 NPE가 나는 것이 아니라 배포 직후 기동이 실패하고 헬스 체크가 통과하지 못해 롤링 배포가 멈춥니다. 의도한 "빨리 실패"입니다. 중첩 객체는 값이 하나도 없으면 null이 될 수 있으므로 ‹@NotNull @Valid›를 같이 붙이세요.

### Boot 4.1에서 바뀐 바인딩 동작 (2026-11 기준)

4.1 릴리스 노트에 따르면 생성자 바인딩된 ‹Optional› 파라미터는 null이 아니라 ‹Optional.empty()›로 바인딩되고, YAML의 빈 객체가 PropertySource에 유지됩니다. 설정 코드가 null을 전제로 했다면 업그레이드 때 동작이 달라질 수 있습니다.

### 시간대와 단위

서버 기본 시간대가 UTC인 컨테이너에서 KST 기준 일 마감 배치를 돌리면 9시간이 어긋납니다. 시간대는 설정으로 명시하고, 저장은 ‹Instant›(UTC)로, 표시와 일 경계 계산만 ‹Asia/Seoul›로 하는 규칙을 문서에 적어 두세요.`,
      code: `package demo.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

// shop.payment.base-url, shop.payment.secrets.api-key 로 바인딩된다.
// 등록: 애플리케이션 클래스에 @ConfigurationPropertiesScan (또는 @EnableConfigurationProperties)
// 비밀은 환경 변수나 마운트한 파일로 주입하고, 값이 비어 있으면 기동 자체가 실패한다.
@Validated
@ConfigurationProperties(prefix = "shop.payment")
public record PaymentProperties(
        @NotBlank String baseUrl,
        @DefaultValue("3s") Duration connectTimeout,
        @DefaultValue("5s") Duration readTimeout,
        @Min(0) @DefaultValue("2") int maxRetries,
        @NotNull @Valid Secrets secrets) {

    public record Secrets(@NotBlank String apiKey) {}
}`,
      codeLang: `java`,
      key: [
        `뒤의 소스가 앞을 덮어쓴다. 설정 파일 < 환경 변수 < 시스템 프로퍼티 < 명령행 인자 순이므로 컨테이너에서는 환경 변수로 주입한다.`,
        `프로파일은 값의 차이에만 쓰고 빈 구성 자체를 가르지 않는다. 구현 교체는 설정 값으로 고르는 전략 빈으로 한다.`,
        `비밀은 저장소 밖(환경 변수, 마운트 파일, 비밀 관리자)에 둔다. 커밋하면 삭제해도 이력에 남는다.`,
        `@ConfigurationProperties record와 Bean Validation으로 잘못된 설정이 운영 중 NPE가 아니라 기동 실패로 드러나게 한다.`,
        `4.1은 생성자 바인딩 Optional을 Optional.empty()로, YAML 빈 객체를 유지로 바꿨으므로 업그레이드 때 설정 코드를 점검한다.`
      ],
      pitfalls: [
        `application-prod.yml에 DB 비밀번호를 적어 커밋한다. 나중에 지워도 git 이력에서 복구되어 키 폐기와 교체가 필요해진다.`,
        `prod 프로파일에서만 다른 구현 빈이 켜지도록 만들어, 로컬과 테스트가 운영 코드 경로를 한 번도 타지 못한다.`,
        `@Value를 여러 클래스에 흩뿌려 설정 이름 오타가 첫 호출 때에야 드러난다. 하나의 properties 타입으로 모은다.`,
        `컨테이너 기본 시간대가 UTC인 줄 모르고 KST 일 마감 로직을 작성해 하루 경계 데이터가 9시간 어긋난다.`
      ]
    },
    {
      title: `요청 검증·DTO·전역 예외 처리를 RFC 9457 ProblemDetail로 통일하기`,
      body: `요청이 컨트롤러 메서드에 도착하기까지, 그리고 예외가 응답으로 바뀌기까지의 경로를 알면 "왜 이 오류 JSON은 내 핸들러를 안 탔지?"가 풀립니다.

### DispatcherServlet 안에서

1. HandlerMapping이 URL과 메서드로 컨트롤러 메서드를 찾습니다(없으면 404, 메서드 불일치는 405).
2. ArgumentResolver가 파라미터를 채웁니다. ‹@RequestBody›는 HttpMessageConverter(Jackson)가 JSON을 객체로 바꾸고, 형식이 틀리면 여기서 400이 납니다.
3. ‹@Valid›가 있으면 Bean Validation을 실행하고, 위반 시 컨트롤러 호출 전에 ‹MethodArgumentNotValidException›이 납니다.
4. 컨트롤러 메서드가 실행되고, 반환값을 컨버터가 응답 본문으로 바꿉니다.
5. 중간에 예외가 나면 HandlerExceptionResolver 체인이 맡습니다. ‹@ExceptionHandler›와 ‹@ControllerAdvice›를 처리하는 리졸버가 먼저고, 아무도 처리하지 않으면 서블릿 컨테이너의 ‹/error›로 넘어가 Boot 기본 오류 JSON(timestamp·status·error·path)이 나갑니다.

필터 단계에서 터진 예외(보안 필터의 401 등)는 이 체인 **밖**이라 ‹@ControllerAdvice›를 타지 않습니다. 오류 포맷이 두 종류로 갈라지는 가장 흔한 원인입니다.

### 검증은 어디까지가 DTO의 일인가

- DTO 검증(400): 필수 값, 길이, 형식, 범위. ‹@NotBlank›·‹@Size›·‹@Positive›·‹@Email›처럼 요청 자체가 형식에 어긋난 경우입니다.
- 업무 규칙(409·422): 재고 부족, 중복 가입, 상태 전이 불가. 서비스가 DB 상태를 보고 판단해 도메인 예외로 알립니다.

record 컴포넌트에 제약을 붙이되, 중첩 객체와 리스트 원소에는 ‹@Valid›를 붙여야 안쪽까지 검증됩니다. 중복 가입을 "조회 후 검사"로만 막으면 동시 요청 두 건이 모두 통과하므로 **DB 유니크 제약이 최종 방어선**이고, 제약 위반 예외를 409로 번역합니다.

### JSON 직렬화: Jackson 3, 돈, 시간

Boot 4는 Jackson 3를 씁니다. 패키지가 ‹com.fasterxml.jackson›에서 ‹tools.jackson›으로 바뀌고(어노테이션 패키지는 유지), 자동 구성된 매퍼를 교체하려면 ‹JsonMapper› 빈을 정의해야 하며 ‹ObjectMapper› 빈만으로는 부족합니다. ‹@JsonComponent›는 ‹@JacksonComponent›로 이름이 바뀌었습니다. 기본 동작이 Jackson 2와 다른 곳이 있어 ‹spring.jackson.use-jackson2-defaults=true›로 이전 기본값에 가깝게 맞출 수 있지만 임시 조치로만 쓰세요(레슨 10).

- 금액은 ‹BigDecimal›(또는 원 단위 long)로 다룹니다. ‹double›은 0.1을 정확히 표현하지 못하고 ‹new BigDecimal(0.1)›은 그 오차를 그대로 가져옵니다. 문자열 생성자나 ‹BigDecimal.valueOf›를 쓰세요. ‹equals›는 scale까지 비교해 2.0과 2.00이 다르므로 값 비교에는 ‹compareTo›를 씁니다.
- 시간은 ‹java.time›입니다. 시점은 ‹Instant›·‹OffsetDateTime›(ISO-8601 문자열), 날짜는 ‹LocalDate›. ‹SimpleDateFormat›은 스레드 안전하지 않아 레거시 코드에서만 만납니다.

### ProblemDetail과 RFC 9457

오류 본문은 ‹application/problem+json›이며 type·title·status·detail·instance와 확장 멤버로 구성됩니다. Spring은 ‹ProblemDetail› 타입으로 이를 지원합니다. ‹spring.mvc.problemdetails.enabled=true›로 프레임워크 예외(400·404·405·415 등)를 이 형식으로 바꾸거나, ‹ResponseEntityExceptionHandler›를 상속한 ‹@RestControllerAdvice›에서 직접 제어합니다(직접 만든 그런 빈이 있으면 자동 구성 핸들러는 물러납니다). 원칙은 셋입니다. (1) 예외 메시지와 스택 트레이스를 그대로 내려주지 않고 안정된 ‹type›과 확장 필드를 내려준다. (2) 서버 로그에는 상세와 requestId를 남기고 응답에는 requestId만 준다. (3) 검증·404·401·500 모든 경로가 같은 포맷인지 테스트로 고정한다.`,
      code: `package demo.web;

import java.net.URI;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

class OrderNotFoundException extends RuntimeException {
    final long orderId;
    OrderNotFoundException(long orderId) { super("order " + orderId + " not found"); this.orderId = orderId; }
}

@RestControllerAdvice
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    ProblemDetail notFound(OrderNotFoundException e) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        pd.setType(URI.create("https://api.example.com/problems/order-not-found"));
        pd.setTitle("주문을 찾을 수 없습니다");
        pd.setProperty("orderId", e.orderId);   // 확장 멤버: 내부 메시지 대신 안정된 필드를 내려 준다
        return pd;
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail pd = ex.getBody();          // 프레임워크가 만든 기본 ProblemDetail에 필드별 사유를 더한다
        pd.setTitle("요청 값이 올바르지 않습니다");
        pd.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> Map.of("field", fe.getField(), "reason", String.valueOf(fe.getDefaultMessage())))
                .toList());
        return handleExceptionInternal(ex, pd, headers, status, request);
    }
}`,
      codeLang: `java`,
      key: [
        `예외는 HandlerExceptionResolver 체인이 응답으로 바꾸며, 필터 단계의 오류(보안 401 등)는 이 체인 밖이라 따로 처리해야 한다.`,
        `형식 오류는 DTO 검증(400), 상태에 따른 업무 규칙은 서비스의 도메인 예외(409·422), 동시성의 최종 방어는 DB 제약이다.`,
        `Boot 4는 Jackson 3(tools.jackson)를 쓰고 매퍼 교체는 JsonMapper 빈으로 한다. 금액은 BigDecimal, 시간은 java.time이다.`,
        `오류 본문은 application/problem+json(RFC 9457)으로 통일하고 내부 메시지·스택은 내리지 않는다.`,
        `오류 포맷 일관성은 400·404·405·409·500을 모두 찍어 보는 계약 테스트로 고정한다.`
      ],
      pitfalls: [
        `서비스에서 조회 후 중복 검사만 하고 유니크 제약을 만들지 않아, 동시 가입 요청 두 건이 모두 성공해 중복 행이 생긴다.`,
        `예외 메시지(e.getMessage())를 응답 detail에 그대로 담아 SQL 문장이나 내부 경로가 클라이언트에 노출된다.`,
        `중첩 객체·리스트 원소에 @Valid를 빠뜨려 겉 필드만 검증되고 안쪽 값은 통과한다.`,
        `금액을 double로 계산하거나 BigDecimal을 equals로 비교해 2.0과 2.00이 다르다고 나와 정산이 어긋난다.`
      ]
    },
    {
      title: `필터·인터셉터·AOP와 프록시의 한계: 어디에 끼어들 것인가`,
      body: `같은 공통 처리라도 어디에 넣느냐에 따라 **실행되는 범위와 시점이 다릅니다**. 요청 ID 로깅을 인터셉터에 넣었다가 401 응답 로그에는 ID가 없어서 장애 추적이 막히는 일이 실제로 생깁니다.

### 세 가지 끼어들기 지점

| 구분 | 위치 | 알 수 있는 것 | 대표 용도 |
| Filter | 서블릿 컨테이너, DispatcherServlet 앞 | 원시 요청·응답 | 요청 ID, 보안, CORS, 압축, 본문 래핑 |
| HandlerInterceptor | DispatcherServlet 안, 컨트롤러 앞뒤 | 매칭된 핸들러 메서드 | 핸들러 어노테이션 기반 검사, 로케일 |
| AOP(프록시) | 빈 메서드 호출 | 메서드 인자·반환·예외 | 트랜잭션, 재시도, 감사 로그, 메트릭 |

Spring Security도 서블릿 필터 체인입니다. 그래서 인증 실패 응답은 인터셉터와 ‹@ControllerAdvice›를 둘 다 거치지 않습니다. 요청 ID처럼 **모든 요청에 붙어야 하는 것은 필터**에 두고, ‹@Order›나 ‹FilterRegistrationBean›으로 보안 필터보다 앞에 놓습니다.

### MDC와 스레드

MDC(로그 컨텍스트)는 스레드 로컬이라 같은 스레드에서 실행되는 코드에만 보입니다. ‹@Async›나 별도 ‹Executor›로 넘어가면 사라지므로 ‹TaskDecorator›로 복사하거나 컨텍스트 전파 라이브러리를 씁니다. 필터의 ‹finally›에서 반드시 지워야 스레드 풀에서 재사용될 때 이전 요청의 ID가 새 요청 로그에 붙지 않습니다. 가상 스레드는 요청마다 새로 생기므로 이 문제가 줄지만 비동기 경계의 전파 문제는 그대로입니다.

### 프록시가 만드는 제약

‹@Transactional›·‹@Retryable›·‹@Cacheable›·‹@Async›는 모두 **프록시 객체가 원래 빈을 감싸고, 외부에서 프록시를 거쳐 들어온 호출에만** 부가 기능이 붙는 구조입니다. Boot는 기본으로 CGLIB(클래스 상속) 프록시를 만듭니다. 결과는 다음과 같습니다.

1. **자기 호출(self-invocation)**: 같은 클래스 안에서 다른 메서드를 부르면 프록시를 우회해 어노테이션이 무시됩니다. 레슨 6의 대표 함정입니다.
2. ‹final› 클래스·메서드는 서브클래싱이 안 되어 프록시를 만들 수 없습니다. Kotlin 클래스는 기본이 final이라 ‹kotlin-spring› 플러그인이 필요합니다(레슨 10).
3. ‹private› 메서드는 가로챌 수 없습니다.
4. 프록시는 초기화가 끝난 뒤에 만들어지므로 ‹@PostConstruct› 안에서는 부가 기능이 적용되지 않습니다.

### Boot 4와 Framework 7의 변화 (2026-11 기준)

- AOP 스타터는 ‹spring-boot-starter-aop›에서 ‹spring-boot-starter-aspectj›로 바뀌었고, AspectJ 어노테이션(‹@Aspect› 등)을 쓰지 않으면 의존성을 빼도 됩니다(Boot 4.0 마이그레이션 가이드).
- Framework 7은 ‹@Retryable›·‹@ConcurrencyLimit›을 코어에 넣었고 ‹@EnableResilientMethods›로 켭니다. 재시도 어드바이스는 ‹@Transactional›·‹@Cacheable›의 바깥에서 실행되므로 시도마다 새 트랜잭션이 열립니다(레슨 9).

### 로깅 주의

본문(body)을 필터에서 그대로 로그에 남기면 비밀번호·주민등록번호·카드번호가 로그 저장소로 흘러갑니다. 요청 본문은 한 번만 읽을 수 있어 래퍼(‹ContentCachingRequestWrapper›)가 필요하고, 남기더라도 필드 마스킹과 길이 제한을 둡니다. 외부에서 온 헤더 값(‹X-Request-Id›)을 검증 없이 로그에 쓰면 줄바꿈이 섞인 가짜 로그 줄을 심을 수 있으니 형식을 검사합니다(코드 참조).`,
      code: `package demo.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)   // 보안 필터보다 먼저: 401·403 로그에도 requestId가 남는다
class RequestIdFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(RequestIdFilter.class);
    private static final Pattern SAFE = Pattern.compile("[A-Za-z0-9-]{1,64}");

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String id = req.getHeader("X-Request-Id");
        if (id == null || !SAFE.matcher(id).matches()) {
            id = UUID.randomUUID().toString();     // 외부 값은 형식을 검사한다 (로그 위조 방지)
        }
        MDC.put("requestId", id);                  // 로그 패턴에서 %X{requestId} 형태로 출력한다
        res.setHeader("X-Request-Id", id);
        long start = System.nanoTime();
        try {
            chain.doFilter(req, res);
        } finally {
            long ms = (System.nanoTime() - start) / 1_000_000;
            log.info("{} {} -> {} ({} ms)", req.getMethod(), req.getRequestURI(), res.getStatus(), ms);
            MDC.remove("requestId");               // 스레드 재사용 시 이전 요청의 ID가 남지 않게 한다
        }
    }
}`,
      codeLang: `java`,
      key: [
        `모든 요청에 붙어야 하는 공통 처리(요청 ID, 접근 로그)는 서블릿 필터에, 핸들러 정보가 필요한 것은 인터셉터에, 메서드 단위 부가 기능은 AOP에 둔다.`,
        `Spring Security는 필터이므로 인증 실패 응답은 인터셉터와 ControllerAdvice를 거치지 않는다.`,
        `프록시 기반 기능은 프록시를 거친 외부 호출에만 적용된다. 자기 호출, final 클래스, private 메서드는 적용되지 않는다.`,
        `MDC는 스레드 로컬이라 finally에서 지우고, 비동기 경계에서는 TaskDecorator 등으로 전파한다.`,
        `Boot 4에서 AOP 스타터는 aspectj로 바뀌었고 Framework 7이 @Retryable·@ConcurrencyLimit을 제공한다.`
      ],
      pitfalls: [
        `requestId를 HandlerInterceptor에 넣어 두고 401·404·400 로그에는 ID가 비어 있어 장애 때 요청을 추적하지 못한다.`,
        `같은 클래스의 메서드끼리 호출하면서 @Transactional·@Retryable·@Async가 동작한다고 믿는다.`,
        `요청 본문 전체를 INFO 로그에 남겨 비밀번호와 개인정보가 로그 시스템에 평문으로 쌓인다.`,
        `MDC를 지우지 않아 스레드 풀 재사용 시 다른 사용자의 requestId가 로그에 찍혀 추적이 오도된다.`
      ]
    },
    {
      title: `트랜잭션과 JPA: 프록시 규칙·영속성 컨텍스트·N+1·커넥션 풀 산수`,
      body: `트랜잭션은 외주 백엔드에서 사고 비용이 가장 큰 영역입니다. 돈·재고·포인트가 걸린 곳에서 일부만 저장된 상태가 한 번이라도 나면 정산이 어긋납니다. 어노테이션 한 줄이 어떤 기계를 돌리는지 알아야 합니다.

### ‹@Transactional›이 실제로 하는 일

1. 프록시가 메서드 진입을 가로채 TransactionManager에게 트랜잭션 시작을 요청합니다.
2. 커넥션 풀(HikariCP)에서 커넥션 하나를 **빌려 와** autoCommit을 끄고 **현재 스레드에 묶습니다**(스레드 로컬).
3. 메서드 안의 JPA·JDBC 호출은 모두 그 커넥션을 씁니다.
4. 정상 종료면 커밋, 규칙에 맞는 예외면 롤백하고 커넥션을 풀에 돌려줍니다.

결론은 둘입니다. 트랜잭션이 열려 있는 동안 **커넥션이 점유**되므로 그 안에서 외부 HTTP 호출(타임아웃 3~30초)이나 파일 업로드를 하면 풀(HikariCP 기본 최대 10)이 순식간에 고갈됩니다. 그리고 트랜잭션은 **스레드에 묶이므로** ‹@Async›나 새 스레드로 넘어간 코드는 같은 트랜잭션에 속하지 않습니다.

### 외워야 할 규칙 (공식 문서 기준)

- 프록시 모드에서는 외부에서 들어온 호출만 가로챕니다. 같은 클래스의 다른 ‹@Transactional› 메서드를 부르면 트랜잭션이 생기지 않습니다.
- 기본 롤백은 ‹RuntimeException›과 ‹Error›뿐이고 **체크 예외는 커밋**됩니다. ‹rollbackFor = Exception.class›나 Framework 6.2+의 전역 설정으로 바꿉니다. 문서는 체크 예외가 없는 Kotlin에서 특히 전체 예외 롤백을 권합니다.
- ‹readOnly = true›는 최적화 힌트입니다. 쓰기를 막는 보안 장치가 아닙니다.
- 기본 전파는 REQUIRED(있으면 합류, 없으면 시작)입니다. 안쪽에서 던진 예외를 바깥이 catch해도 합류한 트랜잭션은 이미 rollback-only로 표시되어, 바깥이 커밋하려 할 때 ‹UnexpectedRollbackException›이 납니다. ‹REQUIRES_NEW›는 **두 번째 커넥션**을 쓰므로 풀 10개에 스레드 10개가 각자 하나씩 쥔 채 둘째를 기다리는 교착이 생길 수 있습니다.

### 영속성 컨텍스트

JPA(Hibernate 7.x. Boot 4.0은 7.2, 4.1은 7.4를 관리)는 트랜잭션 안에서 읽은 엔티티를 1차 캐시에 두고 **변경 감지(dirty checking)**로 커밋 시점에 UPDATE를 만듭니다. 그래서 managed 엔티티의 setter만 불러도 저장되고, 반대로 트랜잭션 밖에서는 저장되지 않아 "코드는 맞는데 DB가 안 바뀐다"는 사례가 생깁니다. ‹GenerationType.IDENTITY›는 INSERT마다 즉시 실행되어 JDBC 배치 삽입을 막으므로 대량 삽입은 다른 전략을 검토합니다.

### Open Session In View

‹spring.jpa.open-in-view›는 기본으로 켜져(공식 문서) 요청이 끝날 때까지 영속성 컨텍스트와 **커넥션**을 붙잡습니다. JSON 직렬화 중 지연 로딩이 "그냥 되기" 때문에 편하지만 직렬화 중에 쿼리가 나가고 풀 점유 시간이 길어집니다. 운영 API는 끄고, 서비스 트랜잭션 안에서 필요한 연관을 모두 가져와 DTO로 바꿔 내보내세요. 끄면 ‹LazyInitializationException›이 개발 중에 드러나는데 문제를 일찍 알려 주는 장치입니다.

### N+1과 쿼리 수 테스트

주문 100건을 조회하고 각 주문의 라인을 지연 로딩하면 쿼리가 1+100번 나갑니다. 쿼리당 몇 ms(환경별 직접 측정)라면 목록 응답이 수백 ms로 늘고 데이터가 커질수록 선형으로 나빠집니다. 대응은 (1) 페치 조인이나 ‹@EntityGraph›로 한 번에 가져오기, (2) ‹@BatchSize›·‹hibernate.default_batch_fetch_size›로 IN 절 묶음 조회, (3) 화면에 필요한 열만 DTO 프로젝션으로 조회입니다. 컬렉션 페치 조인에 페이징을 겹치면 Hibernate가 메모리에서 페이징한다는 경고를 내므로 "ID만 먼저 페이징한 뒤 ID 목록으로 상세 조회"하는 2단계나 배치 사이즈를 씁니다. 눈으로 잡히지 않는 회귀이므로 **쿼리 수를 세는 테스트**가 정답입니다.

### 스키마와 풀 산수

운영 스키마는 ‹ddl-auto›가 아니라 Flyway·Liquibase 마이그레이션으로 관리합니다(Boot 4는 ‹spring-boot-starter-flyway›). 풀 산수는 **파드 수 x maximum-pool-size가 DB max_connections에서 여유분을 뺀 값 이하**여야 한다는 것입니다. 파드 6개 x 20 = 120이면 PostgreSQL 기본 max_connections 100을 넘습니다. MyBatis를 쓰는 공공·금융 SI도 많고(사람인 2026-11-09 검색: JPA 168건, MyBatis 137건) 트랜잭션 규칙은 같습니다. 다만 SQL을 직접 쓰는 만큼 파라미터 바인딩(‹#{}›)과 문자열 치환(달러 중괄호 표기)을 구분해야 하며 치환 표기는 SQL 인젝션 통로입니다.`,
      code: `import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// OrderEntity(id, status, @OneToMany(mappedBy = "order") List<OrderLineEntity> lines)와 OrderStatus가 있다고 가정한다.
interface OrderRepository extends JpaRepository<OrderEntity, Long> {

    // (A) 목록 쿼리 1회 + 주문마다 lines 지연 로딩 N회 = 1+N
    List<OrderEntity> findByStatus(OrderStatus status);

    // (B) 연관을 같이 가져와 쿼리 1회. 컬렉션 fetch와 페이징을 한 쿼리에서 겹치지 않는다.
    @EntityGraph(attributePaths = "lines")
    @Query("select o from OrderEntity o where o.status = :status")
    List<OrderEntity> findWithLinesByStatus(@Param("status") OrderStatus status);
}

@Service
class OrderQueryService {
    private final OrderRepository repo;

    OrderQueryService(OrderRepository repo) {
        this.repo = repo;
    }

    // 트랜잭션은 서비스(유스케이스) 경계에서 연다. 엔티티는 여기서 DTO로 바꿔 밖으로 내보낸다.
    @Transactional(readOnly = true)
    public List<OrderSummary> pending() {
        return repo.findWithLinesByStatus(OrderStatus.PENDING).stream()
                .map(o -> new OrderSummary(o.getId(), o.getLines().size()))
                .toList();
    }

    public record OrderSummary(Long id, int lineCount) {}
}

// 쿼리 수 테스트 개요 (spring.jpa.properties.hibernate.generate_statistics=true):
//   Statistics stats = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
//   stats.clear();  service.pending();
//   assertThat(stats.getPrepareStatementCount()).isLessThanOrEqualTo(2);`,
      codeLang: `java`,
      key: [
        `@Transactional은 프록시가 커넥션을 빌려 스레드에 묶는 장치다. 안에서 느린 외부 호출을 하면 풀이 고갈되고, 새 스레드는 같은 트랜잭션이 아니다.`,
        `기본 롤백은 RuntimeException과 Error뿐이다. 체크 예외는 커밋되며 rollbackFor나 전역 설정이 필요하다. 자기 호출에는 트랜잭션이 걸리지 않는다.`,
        `운영 API는 open-in-view를 끄고 서비스 트랜잭션 안에서 DTO로 변환한다.`,
        `N+1은 쿼리 수 테스트로 잡고 fetch join, EntityGraph, batch size, DTO 프로젝션으로 고친다.`,
        `파드 수 x 풀 크기가 DB max_connections를 넘지 않게 한다. 스키마는 Flyway 같은 마이그레이션으로 관리한다.`
      ],
      pitfalls: [
        `트랜잭션 메서드 안에서 결제사 HTTP 호출을 해 지연 때 커넥션이 묶이고 풀이 고갈되어 전체 API가 멈춘다.`,
        `IOException 같은 체크 예외를 던지는 메서드에 @Transactional만 붙이고 롤백될 것으로 믿어 반쪽 저장이 남는다.`,
        `Lombok @Data를 엔티티에 써서 equals·hashCode·toString이 지연 연관을 건드려 예기치 않은 쿼리와 순환 참조가 생긴다.`,
        `운영에서 spring.jpa.hibernate.ddl-auto=update에 의존해 스키마 변경 이력이 없고 롤백이 불가능해진다.`
      ]
    },
    {
      title: `테스트 전략: 슬라이스·@MockitoBean·Testcontainers와 Boot 4 테스트 API 변경`,
      body: `테스트가 없는 Spring 코드는 업그레이드가 불가능합니다. 뒤의 운영·마이그레이션 레슨은 이 레슨의 결과물을 전제로 합니다.

### 어디까지를 컨테이너로 테스트할까

| 계층 | 도구 | 속도 | 검증 대상 |
| 단위 | JUnit, 생성자 주입 후 new | 밀리초 | 업무 규칙, 계산 |
| 웹 슬라이스 | @WebMvcTest | 초 | 라우팅, 검증, 오류 포맷, 직렬화 |
| 데이터 슬라이스 | @DataJpaTest | 초 | 리포지토리, 쿼리, 매핑 |
| 통합 | @SpringBootTest + Testcontainers | 수 초~수십 초 | 트랜잭션, 마이그레이션, 전 구간 |

생성자 주입을 쓰면 서비스 단위 테스트에 스프링이 필요 없습니다(레슨 1). 슬라이스는 필요한 빈만 올려 빠릅니다. ‹@WebMvcTest›는 컨트롤러·‹@ControllerAdvice›·필터·컨버터를 올리고 ‹@Service›는 올리지 않으므로 서비스는 ‹@MockitoBean›으로 대체합니다.

### 컨텍스트 캐시

Spring TestContext는 설정이 같은 테스트끼리 애플리케이션 컨텍스트를 재사용합니다. 반대로 ‹@MockitoBean› 조합, ‹@TestPropertySource›, ‹@DirtiesContext›가 클래스마다 다르면 그때마다 컨텍스트를 새로 띄웁니다. 기동이 5~10초(규모별로 직접 측정)이고 클래스 50개가 각자 다른 설정이면 4~8분이 CI에 쌓입니다. 공통 베이스 설정으로 조합 수를 줄이세요.

### Boot 4에서 바뀐 테스트 API (2026-11 기준)

마이그레이션 가이드와 참조 문서 기준입니다.

- ‹@MockBean›·‹@SpyBean›은 제거되었습니다. Spring Framework 쪽 ‹@MockitoBean›·‹@MockitoSpyBean›으로 바꿉니다.
- ‹@SpringBootTest›는 더 이상 MockMvc를 자동 제공하지 않으므로 ‹@AutoConfigureMockMvc›를 붙입니다. 슬라이스 어노테이션도 기술별 모듈 패키지로 옮겨졌습니다(예: ‹org.springframework.boot.webmvc.test.autoconfigure›).
- ‹TestRestTemplate›은 ‹spring-boot-resttestclient› 모듈로 이동했고, 새 ‹RestTestClient›(마이그레이션 가이드)와 AssertJ 스타일의 ‹MockMvcTester›(4.1 테스트 참조 문서의 예제)가 새 기본 도구입니다.
- 테스트 스타터는 기술별(‹spring-boot-starter-기술이름-test›)로 나뉘었고 급하면 ‹spring-boot-starter-test-classic›으로 임시 우회합니다.
- JUnit은 6이 기본입니다(Boot의 Kotlin 문서가 JUnit 6을 기본이자 권장으로 서술).

### 진짜 DB로 테스트하기: Testcontainers

H2 같은 메모리 DB에서 통과하고 운영 PostgreSQL이나 Oracle에서 터지는 사고는 흔합니다. SQL 방언, JSON 타입, 잠금, 격리 수준, 함수가 다르기 때문입니다. Testcontainers는 테스트 시작 때 실제 DB 컨테이너를 띄우고 끝나면 지웁니다. Boot의 ‹@ServiceConnection›은 컨테이너의 접속 정보를 DataSource 설정에 자동으로 이어 주므로 ‹@DynamicPropertySource› 보일러플레이트가 필요 없습니다. 공식 문서는 컨테이너를 ‹@Bean›으로 선언하는 방식을 권하는데, 컨텍스트 캐시와 컨테이너 수명이 어긋나는 문제를 피하기 위해서입니다. Testcontainers 2.x에서는 ‹PostgreSQLContainer›가 ‹org.testcontainers.postgresql› 패키지에 있고 제네릭이 아닙니다. CI에 Docker가 없는 환경(일부 사내 빌드 서버)이면 대안을 계약 전에 확인하세요.

### 테스트에 박아야 할 계약

1. 오류 포맷: 400·404·409·500이 모두 ‹application/problem+json›이고 500에 내부 메시지가 없다.
2. 쿼리 수: 목록 API의 쿼리 수가 데이터 크기와 무관하다(레슨 6).
3. 트랜잭션: 중간 실패 시 이전 쓰기가 롤백된다.
4. 마이그레이션: 빈 DB에 Flyway를 처음부터 적용해도 기동된다.

테스트 메서드에 ‹@Transactional›을 붙이면 끝날 때 자동 롤백되어 편하지만 서비스의 ‹@Transactional›이 그 트랜잭션에 **합류**하므로 커밋 시점 오류(제약 위반, 플러시 때의 예외)와 실제 커밋 후의 동시성을 볼 수 없습니다. 이런 검증은 테스트 트랜잭션 없이 여러 스레드로 실제 커밋하는 테스트로 따로 두세요.`,
      code: `package demo.order;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.testcontainers.postgresql.PostgreSQLContainer;

@TestConfiguration(proxyBeanMethods = false)
class PostgresTestConfig {
    @Bean
    @ServiceConnection                       // 컨테이너의 접속 정보를 DataSource 설정에 자동 연결
    PostgreSQLContainer postgres() {
        return new PostgreSQLContainer("postgres:17");
    }
}

// 실무에서는 create-drop 대신 Flyway가 만든 스키마로 검증한다
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@AutoConfigureMockMvc
@Import(PostgresTestConfig.class)
class OrderApiTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void placeOrder_returns201_with_location() {
        assertThat(mvc.post().uri("/orders").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"sku":"A-1","qty":2}
                        """))
                .hasStatus(HttpStatus.CREATED)
                .headers().containsHeader("Location");
    }
}`,
      codeLang: `java`,
      key: [
        `생성자 주입 덕분에 업무 규칙은 스프링 없이 단위 테스트하고, 웹은 @WebMvcTest, 저장소는 @DataJpaTest, 전 구간은 @SpringBootTest로 계층을 나눈다.`,
        `컨텍스트는 설정 조합이 같을 때만 캐시되므로 @MockitoBean·프로퍼티 조합을 늘리면 CI 시간이 선형으로 늘어난다.`,
        `Boot 4에서 @MockBean·@SpyBean은 제거되고 @MockitoBean으로, MockMvc는 @AutoConfigureMockMvc 명시로, 테스트 스타터는 기술별로 바뀌었다.`,
        `H2 대신 Testcontainers의 실제 DB와 @ServiceConnection으로 운영 DB의 방언·잠금·격리 동작을 검증한다.`,
        `오류 포맷, 쿼리 수, 롤백, 마이그레이션을 테스트로 고정한다. 테스트 메서드의 @Transactional은 커밋 시점 오류를 가린다.`
      ],
      pitfalls: [
        `H2에서만 테스트해 통과시키고 운영 PostgreSQL에서 JSON 컬럼·함수·잠금 때문에 배포 후 실패한다.`,
        `모든 테스트에 @SpringBootTest와 서로 다른 @MockitoBean 조합을 붙여 컨텍스트가 수십 번 새로 떠 CI가 20분을 넘긴다.`,
        `테스트 메서드의 @Transactional에 기대 롤백 테스트가 항상 통과하는데 실제로는 커밋 시점 제약 위반을 못 잡는다.`,
        `Boot 4 업그레이드 때 @MockBean 컴파일 오류를 test-classic 스타터로만 덮고 마이그레이션을 끝낸 것으로 보고한다.`
      ]
    },
    {
      title: `운영 준비: Actuator·프로브·그레이스풀 셧다운·스케줄링·Spring Batch·관측`,
      body: `기능이 되는 것과 **운영할 수 있는 것** 사이에는 차이가 있습니다. 위시켓의 프리랜서 시장 리포트(2025 상반기)는 직군별 포트폴리오 조언으로 운영·장애 대응·CI/CD 경험을 수치로 담으라고 말합니다. 이 레슨은 배포 단위를 운영 가능하게 만드는 최소 세트입니다.

### Actuator

- 기본 HTTP 노출은 ‹health›뿐입니다(공식 문서). ‹management.endpoints.web.exposure.include=*›는 ‹env›·‹beans›·‹heapdump› 같은 민감 엔드포인트까지 열기 쉬우니 운영에서는 필요한 것만 나열합니다(‹heapdump›는 기본 접근도 막혀 있습니다).
- 관리 포트를 분리(‹management.server.port›)하고 그 포트를 인그레스나 공인 IP에 노출하지 않습니다.
- ‹health›의 상세 노출(‹show-details›) 기본값은 ‹never›입니다. 상세를 열면 DB·브로커 주소 같은 내부 정보가 보입니다.

### 프로브: liveness와 readiness

Boot 4에서는 ‹/actuator/health/liveness›, ‹/actuator/health/readiness› 그룹이 기본으로 활성입니다. 의미가 다릅니다.

- liveness: "프로세스가 망가져 재시작이 필요한가." 여기에 DB 점검을 넣으면 DB 장애 때 **모든 파드가 연쇄 재시작**되어 복구가 더 늦어집니다.
- readiness: "지금 트래픽을 받을 수 있는가." 기동 중이거나 종료 중이면 실패합니다. DB 같은 핵심 의존성을 여기 넣을지는 신중히 정하세요. 넣으면 DB가 잠깐 흔들릴 때 전 파드가 로드밸런서에서 빠집니다.

### 그레이스풀 셧다운

4.1.2 참조 문서 기준 그레이스풀 셧다운은 기본값(‹server.shutdown=graceful›)입니다. 종료 신호를 받으면 새 요청은 거절하고 진행 중 요청은 ‹spring.lifecycle.timeout-per-shutdown-phase› 동안 마저 처리합니다(기본 30s, 4.1 속성 부록 기준). 쿠버네티스에서는 SIGTERM과 엔드포인트 제거가 동시에 시작되어 몇 초간 새 요청이 종료 중인 파드로 갈 수 있어서 preStop에서 잠깐 대기하는 것이 흔한 처방입니다. preStop도 같은 유예 시간 안에서 실행되므로 파드의 ‹terminationGracePeriodSeconds›(기본 30초)는 preStop 대기 시간과 이 유예 시간의 합보다 길어야 합니다. IDE의 중지 버튼은 SIGTERM을 보내지 않아 즉시 종료될 수 있으니 셧다운 테스트는 터미널에서 하세요.

### 스케줄링

‹@Scheduled›는 **모든 인스턴스에서 실행**됩니다. 인스턴스를 3대로 늘리면 새벽 정산 메일이 3통 나갑니다. 선택지는 (1) 분산 락(ShedLock 같은 라이브러리나 DB 락), (2) 쿠버네티스 CronJob처럼 단일 실행 주체로 분리, (3) 작업 행을 DB에서 ‹SELECT ... FOR UPDATE SKIP LOCKED›로 선점하는 방식입니다. 어느 쪽이든 **작업 자체를 멱등하게** 만들어야 재실행에 안전합니다. 기본 스케줄러 풀 크기는 1이라 긴 작업이 다른 작업을 막을 수 있으니 풀 크기를 정하거나 가상 스레드 스케줄러를 씁니다(가상 스레드 사용 시 풀 설정은 무시됩니다).

### Spring Batch

수십만 건 이상 처리, 중간 실패 후 이어서 재시작, 건너뛰기·재시도 정책이 필요하면 Spring Batch(Job과 Step, 청크 단위 읽기-처리-쓰기-커밋)를 씁니다. Boot 4는 배치 메타데이터를 **기본 인메모리**로 두므로(마이그레이션 가이드) 재시작 가능성이 필요하면 ‹spring-boot-starter-batch-jdbc›로 DB에 저장해야 합니다. 이 변경을 모르고 올리면 재기동 뒤 "처음부터 다시"가 됩니다.

### 관측

Micrometer로 지표를 만들고, Boot 4는 ‹spring-boot-starter-opentelemetry›로 OTLP 지표·트레이스 내보내기를 설정합니다(4.1은 ‹management.opentelemetry.*› 옵션이 늘었습니다). 처음 만들 대시보드는 다섯 개면 충분합니다. 요청 수·오류율·지연 p95, JVM 힙과 GC 시간, Hikari 활성·대기 커넥션, 스레드 수, 외부 호출 오류율. 풀 대기(pending) 커넥션이 0이 아닌 시간이 길면 그것이 병목입니다.`,
      code: `# application.yml (운영 공통). 비밀번호와 접속 주소는 환경 변수(SPRING_DATASOURCE_URL 등)로 주입한다
server:
  shutdown: graceful                 # 4.1 문서 기준 기본값이지만 의도를 남기려고 명시한다
spring:
  lifecycle:
    timeout-per-shutdown-phase: 20s  # 기본 30s. preStop 대기와 합쳐 terminationGracePeriodSeconds(기본 30초)보다 짧게
  datasource:
    hikari:
      maximum-pool-size: 15          # 파드 수 x 15 + 여유 <= DB max_connections
      connection-timeout: 3000       # 풀이 고갈되면 30초씩 매달리지 말고 3초에 실패시킨다
  jpa:
    open-in-view: false
management:
  server:
    port: 9090                       # 관리 포트 분리: 인그레스에는 노출하지 않는다
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: never
      probes:
        enabled: true                # liveness·readiness 그룹 (Boot 4에서 기본 활성)`,
      codeLang: `yaml`,
      key: [
        `Actuator는 필요한 엔드포인트만 노출하고 관리 포트를 분리하며 health 상세는 기본값(never)을 유지한다.`,
        `liveness에는 외부 의존성(DB)을 넣지 않는다. readiness는 트래픽을 받을 수 있는지를 나타낸다.`,
        `그레이스풀 셧다운은 기본이지만 쿠버네티스의 종료 유예 시간과 preStop을 맞춰야 롤링 배포에서 오류가 없다.`,
        `@Scheduled는 인스턴스마다 실행되므로 분산 락이나 단일 실행 주체와 멱등한 작업 설계가 필요하다.`,
        `Boot 4의 Spring Batch는 기본 인메모리 메타데이터다. 재시작이 필요하면 batch-jdbc 스타터를 쓴다.`
      ],
      pitfalls: [
        `exposure.include를 *로 두고 관리 엔드포인트를 인터넷에 노출해 env·heapdump로 비밀과 메모리 덤프가 유출된다.`,
        `liveness 프로브에 DB 점검을 넣어 DB 순단 한 번에 모든 파드가 재시작하는 연쇄 장애를 만든다.`,
        `preStop 대기 없이 롤링 배포해 배포 때마다 수 초간 502가 발생하고, IDE 중지 버튼으로만 셧다운을 시험한다.`,
        `스케줄 작업을 멱등하게 만들지 않고 락만 믿는다. 락 만료와 재시도 시 정산이 이중 실행된다.`
      ]
    },
    {
      title: `동시성 모델: MVC+가상 스레드·WebFlux·코루틴과 JVM 메모리 한 장`,
      body: `요청이 느려지는 이유를 "프레임워크가 느려서"로 돌리기 전에 **동시성 산수**를 해야 합니다. 이 레슨은 Tomcat 스레드, 가상 스레드, DB 풀, WebFlux의 관계와 JVM 메모리 기초를 한 줄로 묶습니다.

### Little의 법칙으로 시작

동시에 처리 중인 요청 수는 초당 요청 수 x 평균 처리 시간입니다. 초당 400건 x 0.5초 = 200건이 동시에 "진행 중"입니다. 전통적인 thread-per-request에서는 진행 중 요청마다 플랫폼 스레드 하나가 필요하고 Tomcat의 기본 최대 스레드는 200이라 이 지점에서 대기열이 생기고 지연이 폭증합니다. 스레드를 늘리면 스레드마다 스택 메모리(기본 약 1MB 예약)와 컨텍스트 스위칭 비용이 듭니다.

### 가상 스레드(JEP 444)

가상 스레드는 JVM이 관리하는 가벼운 스레드로 블로킹 I/O에서 막히면 실제 OS 스레드(캐리어)에서 내려와 다른 가상 스레드에게 양보합니다. 요청당 스레드 모델을 그대로 두고 동시 요청 수만 수만 개로 늘릴 수 있습니다. JEP의 지침은 (1) 풀링하지 말고 작업마다 만든다, (2) 동시성 제한은 풀 크기가 아니라 세마포어 같은 도구로 건다, (3) 값비싼 ‹ThreadLocal› 캐시를 가상 스레드마다 두지 않는다입니다. CPU를 오래 쓰는 작업에는 이점이 없습니다.

Boot에서는 Java 21+에서 ‹spring.threads.virtual.enabled=true›로 켭니다. 참조 문서 기준으로 자동 구성된 ‹applicationTaskExecutor›(‹@Async›, MVC 비동기 처리, JPA 부트스트랩 등)와 스케줄러가 가상 스레드를 쓰게 됩니다. 요청을 처리하는 Tomcat·Jetty 스레드도 이 설정을 따릅니다. Boot 3.2 릴리스 노트가 그렇게 적고, 4.1 속성 부록의 ‹server.tomcat.threads.max›도 가상 스레드가 켜지면 효과가 없다고 설명합니다. 켠 뒤에는 컨트롤러에서 ‹Thread.currentThread().isVirtual()›을 한 번 찍어 실제로 적용됐는지 확인하세요.

### 켜고 나면 병목이 옮겨 간다

가상 스레드가 없애는 것은 "스레드가 모자라서 대기"뿐입니다. DB 커넥션 풀(기본 10), 외부 API가 허용하는 동시성, CPU, 메모리는 그대로입니다. 켠 뒤 동시 요청이 200에서 2,000으로 늘면 풀 대기가 늘고 ‹Connection is not available, request timed out› 오류가 나는 것이 전형적 결과입니다. 처방은 풀을 무작정 키우는 것이 아니라(DB 한도가 정합니다) **병목 자원 앞에서 동시성을 제한**하는 것입니다. Framework 7의 ‹@ConcurrencyLimit›이 그 도구입니다(코드).

핀닝도 알아 두세요. JDK 21~23에서는 ‹synchronized› 블록 안에서 블로킹하면 캐리어 스레드가 묶였습니다. JEP 491(JDK 24+)이 이를 해소했고 네이티브 프레임 안의 블로킹과 클래스 초기화는 여전히 핀닝됩니다(Oracle 문서도 21판은 synchronized를, 25판은 native·외부 함수만 핀닝 원인으로 적습니다). JDK 25 LTS에서는 대부분 줄지만 21을 쓰는 고객 환경이라면 JFR의 ‹jdk.VirtualThreadPinned› 이벤트로 확인합니다.

### WebFlux는 언제?

WebFlux는 논블로킹 이벤트 루프(코어 수 정도의 소수 스레드) 위에서 돌고 **전 구간이 논블로킹일 때만** 이점이 있습니다. JPA·JDBC 같은 블로킹 호출이 하나만 끼어도 이벤트 루프가 멈춥니다. 선택 기준은 이렇습니다. 일반 CRUD·JPA·JDBC는 MVC + 가상 스레드. 스트리밍·SSE·백프레셔가 핵심이거나 R2DBC·리액티브 클라이언트가 전제면 WebFlux. Kotlin 팀이 구조적 동시성을 선호하면 코루틴(레슨 10). "성능 때문에 WebFlux로 바꾸자"는 요청에는 병목이 어디인지 측정하자고 답하세요.

### 자바 동시성 기본기가 여기서 쓰인다

- 싱글톤 빈 안의 가변 상태는 경쟁 조건입니다. ‹AtomicLong›·‹ConcurrentHashMap›·불변 객체로 바꿉니다.
- 실행기 없이 ‹CompletableFuture.supplyAsync›를 쓰면 공용 ForkJoinPool을 씁니다. 블로킹 작업을 넣으면 병렬 스트림까지 느려집니다.
- ‹@Async› 메서드의 예외는 호출자에게 전달되지 않습니다. void 반환이면 별도 핸들러가 필요합니다.

### JVM 메모리 한 장

컨테이너에서 JVM의 기본 최대 힙은 컨테이너 메모리의 25%입니다. 2GB 컨테이너라면 힙 512MB입니다. ‹-XX:MaxRAMPercentage=70›처럼 올리되 메타스페이스, 스레드 스택, 다이렉트 버퍼가 힙 밖에 있으므로 100%는 안 됩니다. 힙이 찬 ‹OutOfMemoryError›와 컨테이너의 OOMKilled(힙 밖까지 합쳐 한도 초과)는 증상도 처방도 다릅니다. ‹-XX:+HeapDumpOnOutOfMemoryError›, JFR(‹-XX:StartFlightRecording›), ‹jcmd›가 기본 장비입니다.`,
      code: `package demo.pay;

import demo.config.PaymentProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.resilience.annotation.ConcurrencyLimit;
import org.springframework.resilience.annotation.EnableResilientMethods;
import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

// application.yml: spring.threads.virtual.enabled: true  (Java 21+)
@Configuration(proxyBeanMethods = false)
@EnableResilientMethods                      // @Retryable·@ConcurrencyLimit 활성화 (Framework 7)
class ResilienceConfig {}

@Service
class PaymentGateway {
    private final RestClient client;

    PaymentGateway(PaymentProperties props) {
        this.client = RestClient.create(props.baseUrl());
    }

    // 가상 스레드는 요청 수만큼 늘어날 수 있다. 결제사로는 동시에 20건까지만 보낸다.
    // 승인(POST)에는 재시도를 걸지 않고 Idempotency-Key로 중복 승인을 막는다.
    @ConcurrencyLimit(20)
    public String authorize(String orderId, String idempotencyKey) {
        return client.post().uri("/authorize/{id}", orderId)
                .header("Idempotency-Key", idempotencyKey)
                .retrieve().body(String.class);
    }

    // 조회(GET)는 안전하고 멱등하므로 네트워크 오류에 한해 재시도한다 (총 1회 + 재시도 2회)
    @Retryable(includes = ResourceAccessException.class, maxRetries = 2, delay = 200, jitter = 50)
    public String status(String orderId) {
        return client.get().uri("/status/{id}", orderId).retrieve().body(String.class);
    }
}`,
      codeLang: `java`,
      key: [
        `동시 진행 요청 수는 초당 요청 수 x 평균 처리 시간이다. 이 값이 스레드·풀·외부 허용치를 넘는 곳이 병목이다.`,
        `가상 스레드는 스레드 부족 대기만 없앤다. 풀링하지 말고, 병목 자원 앞의 동시성은 @ConcurrencyLimit·세마포어로 제한한다.`,
        `spring.threads.virtual.enabled는 Java 21+에서 작업 실행기와 스케줄러를 가상 스레드로 바꾼다. JDK 24+의 JEP 491로 synchronized 핀닝은 해소됐다.`,
        `JPA·JDBC 기반 CRUD는 MVC + 가상 스레드가 기본값이고 WebFlux는 전 구간 논블로킹이나 스트리밍이 필요할 때 고른다.`,
        `컨테이너 JVM은 힙 비율과 힙 밖 메모리를 함께 계산하고 OOM 힙 덤프·JFR을 미리 켜 둔다.`
      ],
      pitfalls: [
        `가상 스레드를 켜고 풀 크기만 10에서 1,000으로 올려 DB가 연결 한도 초과로 거부하거나 느려진다.`,
        `블로킹 JPA 호출을 그대로 둔 채 컨트롤러 반환 타입만 Mono로 바꿔 이벤트 루프가 막히고 WebFlux의 이점 없이 복잡성만 얻는다.`,
        `POST 승인 API에 @Retryable을 걸어 네트워크 타임아웃 뒤 같은 결제가 두 번 승인된다.`,
        `JVM 최대 힙을 컨테이너 메모리의 95%로 잡아 힙 밖 메모리까지 합쳐 한도를 넘어 OOMKilled로 재시작이 반복된다.`
      ]
    },
    {
      title: `통합 사례: Boot 3.5를 4.1로 올리는 의뢰, Kotlin·공공 SI 관례, 견적과 인수인계`,
      body: `이 레슨은 앞의 아홉 레슨을 한 번에 쓰는 가상의 의뢰입니다.

### 상황

직원 40명의 B2B 물류 SaaS 회사가 연락해 왔습니다. 4년 전 외주로 만든 Spring Boot 서비스(현재 3.5.x, Java 17, Maven, JPA, 커스텀 Jackson 직렬화기, API 문서 라이브러리)를 운영 중인데, 보안 점검 보고서가 "지원 종료된 프레임워크 라인"을 지적했습니다(3.5의 OSS 지원은 2026-06-30 종료, 제3자 집계 기준). 요구는 "4.1로 올려 주세요. 2주, 고정가". 원래 개발자는 없고 테스트는 일부만 있습니다.

### 1단계: 진단(견적 전, 별도 소액 유료)

1. 버전 표: Boot 패치 버전, Java, Hibernate, Jackson 사용 방식(커스텀 직렬화기·@JsonComponent 존재), Security 설정.
2. 서드파티 의존성: Boot 4의 Framework 7·Jackson 3·Hibernate 7과 **호환되는 릴리스가 있는지** 라이브러리마다 확인합니다(API 문서, MapStruct, QueryDSL, Lombok, 락 라이브러리 등). 일정에서 가장 큰 불확실성이며, 확인하지 못한 것은 '미확인'으로 표기합니다.
3. 테스트: 개수, 통과율, 실제 DB 사용 여부. 없으면 업그레이드 전에 현재 동작을 고정하는 특성화 테스트를 먼저 씁니다.
4. 배포: 임베디드 서버인지 외부 Tomcat WAR인지(WAR면 ‹spring-boot-starter-tomcat-runtime›로 교체), 컨테이너와 CI.
5. 스키마 관리가 Flyway인지 ddl-auto인지.

### 2단계: 경로

1. 3.5의 최신 패치로 올리고 deprecated 경고를 모두 정리합니다. 마이그레이션 가이드가 이를 먼저 요구합니다.
2. 4.1은 4.0에서 deprecated된 항목을 **제거**했습니다. 4.0.x에서 경고를 정리한 뒤 4.1로 가는 두 단계가 안전하고, 작은 서비스는 한 번에 가도 됩니다. 단계마다 git 태그를 남깁니다.
3. 임시 다리: ‹spring-boot-starter-classic›과 ‹spring-boot-starter-test-classic›으로 먼저 컴파일·기동시키고 이후 기술별 스타터로 갈아탑니다.
4. 대표 수정 항목: ‹spring-boot-starter-web›은 ‹spring-boot-starter-webmvc›로, AOP 스타터는 aspectj 스타터로, Jackson 3(패키지, ‹@JacksonComponent›, ‹JsonMapper› 빈, ‹spring.jackson.json.read.*›로 이동한 속성), 테스트의 ‹@MockBean›은 ‹@MockitoBean›과 ‹@AutoConfigureMockMvc›로, Hibernate 7(‹hibernate-jpamodelgen›은 ‹hibernate-processor›로), 제거된 Undertow, 속성 이름 변경.
5. 4.1 주의점: Maven에서 ‹-DskipTests›가 더 이상 테스트 AOT 처리를 건너뛰지 않음, Optional 바인딩, Tomcat 임시 디렉터리 정리.
6. 업그레이드 전후를 같은 부하 스크립트로 비교합니다(p95, 기동 시간, 메모리, 쿼리 수).
7. 롤아웃은 블루/그린이나 카나리로 하고, DB 변경은 앞뒤 버전이 모두 호환되는 선에서만 합니다.

### Kotlin이 섞인 코드라면

Boot 문서는 Kotlin 2.2 이상을 요구하고 4.1은 Kotlin 2.3.21을 관리합니다(최신 Kotlin이 2.4.21이어도 Boot가 관리하는 버전을 따르는 편이 안전). ‹kotlin-spring› 플러그인으로 클래스를 열고, JPA 엔티티에는 ‹kotlin-jpa›(기본 생성자)를 쓰며 **엔티티를 data class로 만들지 않습니다**(equals·hashCode·toString이 연관을 건드립니다). Kotlin 2.1+는 JSpecify null 어노테이션을 엄격하게 해석하므로 Java 쪽 시그니처가 Kotlin 컴파일 오류로 드러날 수 있습니다. 컴파일러 옵션 ‹-Xannotation-default-target=param-property›가 권장됩니다(Boot 4.1 Kotlin 문서).

### 공공·금융 SI라면

eGovFrame 5.0 simple-backend 템플릿은 README 기준(2026-11 열람) Spring Boot 3.5.6, JDK 17, Jakarta EE 10 환경입니다. 3.5의 OSS 종료는 "내 마음대로 4.1로 올린다"가 아니라 **프레임워크 기준선과 상용 지원 여부를 발주처·원청과 합의**할 문제입니다. 레거시(Java 8/11, javax 패키지, Oracle, MyBatis)를 읽고 고치는 능력이 곧 단가입니다.

### 견적과 인수인계

진단과 별도로, 본 작업은 진단 결과에 따라 범위·가정·제외 항목을 적은 문서와 함께 제시하고, 서드파티 호환 이슈에는 별도 버퍼(예: 20~30%, 경험칙)를 둡니다. 인수 기준은 수치로 적습니다(p95 증가 10% 이하 같은 식). 납품물은 마이그레이션 리포트, 버전 표(날짜 표기), 런북(롤백 포함), 다음 업그레이드 정책입니다. 4.2는 2026-11 기준 RC 단계이므로 GA 후 재평가한다고 적어 둡니다.`,
      code: `// build.gradle.kts: kotlin("jvm"), kotlin("plugin.spring"), kotlin("plugin.jpa") 플러그인과
//   kotlin { compilerOptions { freeCompilerArgs.add("-Xannotation-default-target=param-property") } }
// 앱 진입점: @SpringBootApplication @ConfigurationPropertiesScan class ShopApplication + runApplication
package demo

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import java.time.Duration
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*

@Validated
@ConfigurationProperties(prefix = "shop.payment")   // base-url이 비어 있으면 기동 실패
data class PaymentProperties(
    @field:NotBlank val baseUrl: String,
    val readTimeout: Duration = Duration.ofSeconds(5),
    @field:Min(0) val maxRetries: Int = 2,
)

data class OrderView(val id: Long, val lineCount: Int)
sealed interface Lookup {
    data class Found(val view: OrderView) : Lookup
    data object Missing : Lookup
}
interface OrderFinder { fun find(id: Long): Lookup }

@Component
class StubOrderFinder : OrderFinder {      // 실제로는 JPA 저장소를 감싼 구현으로 바꾼다
    override fun find(id: Long): Lookup = if (id == 1L) Lookup.Found(OrderView(1, 3)) else Lookup.Missing
}

class OrderNotFoundException(val orderId: Long) : RuntimeException("order " + orderId + " not found")

@RestController
@RequestMapping("/orders")
class OrderController(private val finder: OrderFinder) {

    @GetMapping("/{id}")
    fun get(@PathVariable id: Long): OrderView = when (val r = finder.find(id)) {
        is Lookup.Found -> r.view
        Lookup.Missing -> throw OrderNotFoundException(id)   // 404는 ProblemDetail 핸들러가 변환한다
    }
}`,
      codeLang: `kotlin`,
      key: [
        `마이그레이션은 진단(소액 유료), 3.5 최신 패치와 deprecated 정리, 4.0.x 경유 4.1, classic 스타터 임시 다리, 전후 부하 비교, 롤아웃 순서로 한다.`,
        `일정의 최대 불확실성은 서드파티 라이브러리의 Framework 7·Jackson 3·Hibernate 7 호환이다. 확인하지 못한 것은 미확인으로 보고한다.`,
        `Kotlin은 Boot가 관리하는 버전(4.1은 2.3.21)을 따르고 kotlin-spring·kotlin-jpa를 쓰며 엔티티를 data class로 만들지 않는다.`,
        `공공 SI의 프레임워크 기준선(eGovFrame 5.0은 Boot 3.5.6 기반)과 지원 종료 대응은 발주처·원청과 서면으로 합의한다.`,
        `견적은 진단과 본 작업을 분리하고 가정·제외·수치형 인수 기준을 적는다. 납품물은 리포트, 버전 표, 런북이다.`
      ],
      pitfalls: [
        `진단 없이 2주 고정가를 확정한다. 서드파티 라이브러리가 Boot 4를 지원하지 않는 것이 뒤늦게 드러나 일정과 수익이 무너진다.`,
        `3.5에서 deprecated 정리를 건너뛰고 바로 4.1로 올려 4.0과 4.1에서 제거된 항목이 뒤섞인 오류 수백 줄을 한꺼번에 마주한다.`,
        `classic 스타터로 기동만 되게 하고 마이그레이션 완료로 보고한다. 이후 classic이 사라질 때 같은 작업이 다시 발생한다.`,
        `공공 프로젝트에서 원청의 프레임워크 표준을 무시하고 Boot 버전을 올려 납품해 호환·검수 문제로 반려된다.`
      ]
    }
  ],
  labs: [
    {
      title: `게시판 API 뼈대: 구조·설정 검증·ProblemDetail과 요구사항 변경 3회`,
      scenario: `동네 커뮤니티 서비스의 백엔드를 처음 맡았습니다. 1차 범위는 회원 가입, 게시글 CRUD, 관리자의 게시글 숨김입니다. 계약 기간 중 요구사항이 세 번 바뀐다고 가정합니다. (1) 게시글 상단 고정 기능과 필드 추가, (2) 관리자용 목록 API(상태 필터·정렬), (3) 신고 누적 시 자동 숨김과 알림 채널 교체(메일에서 슬랙으로). Spring Boot 4.1.x 위에서 구조를 잡고, 각 변경이 몇 개 파일과 몇 개 층을 건드렸는지 표로 기록해 구조의 점수를 매기세요.`,
      steps: [
        `Spring Initializr 또는 Gradle 직접 설정으로 Boot 4.1.x 현행 패치와 설치된 LTS JDK(25, 21, 17 중)로 프로젝트를 만들고, webmvc·validation·data-jpa·flyway·actuator·PostgreSQL 드라이버·테스트 스타터를 넣습니다. ‹--debug›로 기동해 DataSource 자동 구성이 켜진 이유와 꺼진 자동 구성 3개를 조건 평가 보고서에서 찾아 적습니다.`,
        `기능별 패키지(member, post)와 web·service·domain 층으로 나누고 요청·응답 record DTO를 만들어 엔티티가 컨트롤러 시그니처에 나타나지 않게 합니다.`,
        `@ConfigurationProperties record(게시글 최대 길이, 신고 임계값 등)를 만들고 @Validated로 검증합니다. 필수 값을 비운 채 기동해 실패 로그를 캡처하고, 환경 변수로 값을 주입해 기동되는 것까지 확인합니다.`,
        `Bean Validation과 ResponseEntityExceptionHandler 상속 어드바이스로 400·404·405·409·500이 모두 application/problem+json이 되게 합니다. 중복 가입은 DB 유니크 제약 위반을 409로 번역합니다.`,
        `RequestIdFilter(MDC)를 추가하고 로그 패턴에 requestId가 나오게 합니다. 줄바꿈이 섞인 X-Request-Id를 보내 새 UUID로 대체되는지 확인합니다.`,
        `Flyway 마이그레이션으로 스키마를 만들고 spring.jpa.hibernate.ddl-auto=validate, spring.jpa.open-in-view=false로 설정합니다.`,
        `요구사항 변경 3회를 차례로 적용하며 변경마다 수정한 파일 수와 층을 표에 기록하고, 5개를 넘는 변경은 원인을 분석해 리팩터링합니다.`,
        `MockMvcTester 또는 @WebMvcTest로 오류 포맷 계약 5종을 테스트로 고정하고 ‹./gradlew test›를 실행합니다.`
      ],
      accept: [
        `필수 설정을 비운 채 기동하면 프로세스가 0이 아닌 종료 코드로 끝나고, 로그에 누락된 프로퍼티 이름이 보이는 캡처가 있다.`,
        `400·404·405·409·500 응답 본문이 모두 application/problem+json이고 500 본문에 예외 메시지나 스택 트레이스가 없으며, 이를 검증하는 테스트가 5개 이상 통과한다.`,
        `컨트롤러 시그니처와 JSON 응답 어디에도 엔티티 클래스가 노출되지 않는다(코드 검색 결과 0건).`,
        `요구사항 변경 3회 기록표에서 변경 1회당 수정 파일이 5개 이하이고, 관리자 목록 API가 서비스 복제 없이 기존 서비스를 재사용해 추가되었다.`
      ],
      stretch: `ArchUnit으로 "web 패키지는 repository를 직접 참조할 수 없다" 규칙을 테스트로 만들고, 같은 프로젝트를 Gradle 멀티모듈(:api, :domain)로 분리해 컴파일 시점에 같은 규칙이 강제되는지 비교한 뒤 빌드 시간 차이를 기록하세요.`
    },
    {
      title: `트랜잭션·JPA·커넥션 풀·가상 스레드: 재현하고 측정하기`,
      scenario: `커뮤니티 서비스가 커지면서 세 가지 제보가 왔다고 가정합니다. 첫째, 결제 대기 주문 목록 API가 데이터가 늘수록 느려진다. 둘째, 정산 작업에서 가끔 "일부만 반영됐다"는 문의가 온다. 셋째, 가상 스레드를 켠 뒤 오류가 늘었다. Testcontainers의 PostgreSQL과 무료 부하 도구(k6 또는 hey)로 세 증상을 재현하고, 원인을 수치로 증명한 뒤 고치고, 전후 표를 보고서로 남기세요.`,
      steps: [
        `주문(1) 대 주문라인(N) 모델과 Flyway 스키마를 만들고 주문 500건, 주문당 5라인을 시드합니다. spring.jpa.properties.hibernate.generate_statistics=true를 켭니다.`,
        `목록 API를 지연 로딩으로 구현하고 Hibernate Statistics의 prepared statement 수를 테스트에서 읽어 1+N임을 증명합니다.`,
        `@EntityGraph 또는 batch fetch로 고치고 쿼리 수 상한 테스트(3개 이하)를 추가합니다. 전후 응답 시간(로컬 p95)을 기록합니다.`,
        `자기 호출 버그를 재현합니다. settleAll()이 같은 클래스의 @Transactional settleOne()을 호출하고 3번째 항목에서 RuntimeException을 던지게 해, 앞의 2건이 이미 커밋된 것을 DB 조회로 증명합니다. 별도 빈 분리 또는 TransactionTemplate으로 고쳐 요구에 맞는 동작(건별 독립 또는 전체 롤백)을 테스트로 고정합니다.`,
        `IOException을 던지는 메서드에서 DB 쓰기가 남는 것을 확인하고 rollbackFor로 고칩니다.`,
        `풀 고갈을 재현합니다. hikari maximum-pool-size를 5, connection-timeout을 2000(ms)으로 두고 핸들러에서 pg_sleep(0.5)을 실행하는 쿼리를 호출하게 한 뒤 동시 100 요청을 보내 오류율과 Actuator 지표(hikaricp.connections.pending)를 기록합니다. 대기 시간이 연결 타임아웃을 넘는 요청이 실패하는 것이 정상입니다.`,
        `spring.threads.virtual.enabled를 false와 true로 바꿔 같은 부하를 각 3회 반복하고 처리량, 오류율, p95를 표로 만듭니다.`,
        `@ConcurrencyLimit 또는 Semaphore로 풀 크기와 같은 한도를 DB 접근 구간 앞에 걸고 오류율과 p95의 변화를 비교합니다.`
      ],
      accept: [
        `N+1 버전의 쿼리 수가 501개 이상(주문 500건 기준)이고 수정 버전은 3개 이하이며, 쿼리 수 상한 테스트가 저장소에 있고 통과한다.`,
        `자기 호출 버그 재현 테스트가 앞 2건이 커밋되었음을 DB 조회 결과로 보여 주고, 수정 후 같은 테스트가 기대한 동작을 보인다.`,
        `풀 크기 5·동시 100 요청에서 풀 대기 오류 또는 지연 급증이 재현되고, 동시성 제한 적용 후 오류율이 낮아진 수치가 전후 표에 있다.`,
        `가상 스레드 켬/끔 비교표에 처리량, 오류율, p95가 각각 3회 평균으로 있고, 병목 자원이 무엇인지 한 문단으로 해석되어 있다.`
      ],
      stretch: `synchronized 블록 안에서 블로킹하는 코드를 가상 스레드로 실행하고, JDK 21과 25(가능하면)에서 JFR의 jdk.VirtualThreadPinned 이벤트가 나오는지 각각 비교하세요. JEP 491의 설명과 연결해 한 쪽짜리 보고서로 정리합니다.`
    },
    {
      title: `납품 미니 프로젝트: Boot 3.5에서 4.1로 마이그레이션 리포트와 인수인계 패키지`,
      scenario: `직원 40명의 물류 SaaS 회사가 "3.5.x 서비스를 4.1로 올려 주세요. 보안 점검에서 지원 종료 라인을 지적받았습니다"라고 요청했습니다. 원래 개발자는 없습니다. 이 의뢰를 가상으로 만들고 전 과정을 수행하세요. 진단, 단계별 업그레이드, 전후 측정, 견적서 샘플, 인수인계 문서까지 만들어 깨끗한 클론에서 인수 리허설을 통과시키는 것이 최종 목표입니다.`,
      steps: [
        `가상의 레거시를 만듭니다. Boot 3.5 라인의 최신 패치(Initializr에 보이지 않으면 Gradle 플러그인 버전을 직접 지정)로 서비스를 만들고 spring-boot-starter-web, spring-boot-starter-aop와 @Aspect 감사 로그 1개, @JsonComponent 커스텀 직렬화기 1개, JPA 엔티티 3개와 의도적 N+1 1곳, @MockBean 테스트, API 문서 라이브러리 1개, spring.jackson.* 속성 몇 개를 넣습니다. 테스트 15개 이상이 통과하는 상태에서 git 태그 legacy-3.5를 답니다.`,
        `진단표를 씁니다. 현재 버전 표, 서드파티 라이브러리별 Boot 4·Framework 7 지원 여부(공식 문서로 확인하고 확인하지 못하면 '미확인'), 위험 순위를 포함합니다.`,
        `업그레이드 전 기준선을 측정합니다. 같은 부하 스크립트로 p95, 기동 시간, 최대 메모리, 목록 API 쿼리 수를 기록합니다.`,
        `3.5 최신 패치에서 컴파일러의 deprecation 경고를 0건으로 정리합니다.`,
        `4.1.x로 올리되 classic 스타터로 먼저 기동시키고, 깨진 점을 하나씩 원인·해결·소요 시간·근거 문서와 함께 표에 기록합니다.`,
        `classic 스타터를 제거하고 기술별 스타터, Jackson 3(JsonMapper, JacksonComponent), @MockitoBean과 @AutoConfigureMockMvc, Hibernate 7 관련 변경을 반영합니다. 4.1의 Optional 바인딩 변경도 점검합니다.`,
        `같은 부하 스크립트로 전후 비교표를 만들고, 악화된 지표가 있으면 원인 가설과 확인 방법을 적습니다.`,
        `인수인계 문서를 만듭니다. 마이그레이션 리포트, README, 롤백을 포함한 런북, 버전과 지원 종료 표(날짜 표기), 진단과 본 작업을 분리한 견적서 샘플을 포함합니다.`,
        `깨끗한 디렉터리에서 git clone, 빌드, 테스트, 컨테이너 기동, readiness 확인까지 인수 리허설을 하고 소요 시간을 기록합니다.`
      ],
      accept: [
        `legacy-3.5 태그와 최종 4.1 결과 사이에서 테스트 수가 같거나 늘어 15개 이상이며 전부 통과하고, classic 스타터가 최종 빌드에 남아 있지 않다.`,
        `마이그레이션 리포트에 깨진 점이 10건 이상 원인·해결·소요 시간·근거 문서와 함께 표로 있고, 확인하지 못한 서드파티 호환성은 '미확인'으로 구분되어 있다.`,
        `전후 비교표에 기동 시간, p95, 최대 메모리, 목록 API 쿼리 수가 있고 악화된 지표가 있으면 원인 가설이 적혀 있다.`,
        `깨끗한 클론에서 문서만 보고 15분 안에 빌드·테스트·기동이 재현되고 readiness가 UP이다(스톱워치 기록).`,
        `견적서 샘플에서 진단과 본 작업이 분리되어 있고 가정, 제외 항목, 수치형 인수 기준이 각각 3개 이상이다.`
      ],
      stretch: `같은 프로젝트에 Kotlin 소스를 일부(컨트롤러 1개와 설정 record 1개) 도입해 kotlin-spring 플러그인 유무에 따른 프록시·기동 오류 차이를 재현하고, Java와 Kotlin 구현의 코드량과 테스트 용이성을 비교한 1쪽 메모를 쓰세요.`
    }
  ],
  quiz: [
    {
      q: `고객사가 Spring Boot 3.5.x(Java 17) 서비스를 4.1로 올려 달라고 합니다. 보안 점검에서 3.5 라인의 지원 종료를 지적받았고, 소스에는 @MockBean 테스트가 많으며 Jackson 커스텀 직렬화기가 있습니다. 가장 적절한 첫 작업은 무엇입니까?`,
      choices: [
        `빌드 파일의 Boot 버전을 4.1.2로 바꾸고 컴파일 오류가 나오는 대로 고쳐 나간다`,
        `먼저 3.5의 최신 패치로 올려 deprecated 경고를 정리하고 통과하는 기준선을 만든 뒤, 임시 classic 스타터로 4.x 기동부터 시킨다`,
        `변경 범위가 크므로 새 프로젝트를 만들어 기능을 전부 옮겨 쓴다`,
        `지원 종료는 보안 도구의 오탐이므로 3.5를 유지해도 문제없다고 답한다`
      ],
      answer: 1,
      why: `마이그레이션 가이드는 3.5의 최신 패치로 먼저 올려 deprecated API 호출을 고치라고 안내하고, classic 스타터는 빠른 업그레이드를 위한 임시 다리입니다. 가장 유혹적인 첫 번째 선택지는 4.0·4.1에서 제거된 항목과 deprecated 문제가 한꺼번에 섞여 원인 분리가 안 됩니다. 4번은 3.5의 OSS 지원이 2026-06-30에 끝났다는 사실(제3자 집계)과 맞지 않습니다.`
    },
    {
      q: `Boot 4.1로 올린 뒤 테스트 컴파일이 아래 오류로 실패합니다.

OrderApiTest.java:5: error: package org.springframework.boot.test.mock.mockito does not exist
import org.springframework.boot.test.mock.mockito.MockBean;
                                                 ^

같은 파일의 다른 import(SpringBootTest 등)는 문제가 없습니다. 원인과 올바른 조치는 무엇입니까?`,
      choices: [
        `spring-boot-starter-test 의존성이 빠졌으므로 추가한다`,
        `Mockito 버전이 낮아서이므로 mockito-core를 올린다`,
        `JUnit 확장이 빠졌으므로 @ExtendWith를 클래스에 추가한다`,
        `Boot 4에서 @MockBean·@SpyBean이 제거되었으므로 Spring Framework의 @MockitoBean·@MockitoSpyBean으로 바꾼다`
      ],
      answer: 3,
      why: `마이그레이션 가이드에 따르면 @MockBean과 @SpyBean은 제거되었고 @MockitoBean·@MockitoSpyBean이 대체입니다. 첫 번째 선택지가 유혹적이지만 같은 파일의 다른 Boot 테스트 import는 정상이라 의존성은 이미 있고, 추가해도 패키지 자체가 없어 오류가 그대로입니다. 참고로 가이드는 새 어노테이션을 테스트 클래스 필드에 쓰고 @Configuration 클래스에는 쓰지 못한다고 적습니다.`
    },
    {
      q: `공공 SI 하청으로 eGovFrame 5.0 템플릿(Spring Boot 3.5.6 기반) 위에서 기능을 추가하는 계약을 맡았습니다. 원청 PM이 "3.5는 OSS 지원이 끝났다니 이참에 Boot 4.1로 올려서 납품해 달라"고 구두로 요청했습니다. 가장 적절한 대응은 무엇입니까?`,
      choices: [
        `요청대로 4.1로 올려 납품하고 호환 문제는 인수 후에 대응한다`,
        `지원 종료된 프레임워크 위에서는 일할 수 없다며 계약을 거절한다`,
        `프레임워크 기준선을 바꿀지와 보안 패치 수단(상용 지원 또는 계획된 업그레이드)을 서면으로 합의하고, 업그레이드는 진단과 분리한 별도 견적으로 제안한다`,
        `eGovFrame을 쓰지 말고 직접 구성한 Spring Boot 프로젝트로 교체하자고 제안한다`
      ],
      answer: 2,
      why: `공공 SI의 프레임워크 기준선(Spring Boot, JDK, Jakarta EE 버전)은 발주처·원청의 표준일 수 있어 일방적으로 바꾸면 호환과 검수 문제가 생깁니다. 첫 번째 선택지가 유혹적이지만 구두 요청만으로 기준선을 바꾼 책임이 하청에게 돌아옵니다. 거절은 불필요하고, 직접 구성 프레임워크로의 교체는 더 큰 합의가 필요한 변경입니다.`
    },
    {
      q: `spring.jpa.open-in-view=false 로 바꾼 직후 주문 목록 API가 아래 오류를 냅니다. 컨트롤러는 서비스가 돌려준 OrderEntity 목록을 그대로 JSON으로 반환합니다.

org.hibernate.LazyInitializationException: Cannot lazily initialize collection of role 'OrderEntity.lines' ... (no session)
    at org.hibernate.collection.spi.AbstractPersistentCollection.throwLazyInitializationException(...)
    ... (응답 본문을 JSON으로 쓰는 직렬화 단계의 프레임)

가장 적절한 수정은 무엇입니까?`,
      choices: [
        `서비스 트랜잭션 안에서 필요한 연관을 fetch join이나 @EntityGraph로 가져와 DTO로 변환해 반환한다`,
        `open-in-view를 다시 true로 돌린다`,
        `lines 연관을 FetchType.EAGER로 바꾼다`,
        `컨트롤러 메서드에 @Transactional을 붙인다`
      ],
      answer: 0,
      why: `근본 원인은 트랜잭션이 끝난 뒤 엔티티를 직렬화하면서 지연 로딩이 일어나는 구조입니다. 필요한 연관을 서비스에서 한 번에 가져와 DTO로 내보내면 해결됩니다. OSIV를 켜면 오류는 사라지지만 직렬화 중 쿼리(N+1)와 커넥션 점유가 남아 가장 유혹적입니다. EAGER는 모든 조회에 항상 비용을 얹고, 컨트롤러 트랜잭션은 커넥션 점유 구간을 웹 계층까지 넓힙니다.`
    },
    {
      q: `가상 스레드(spring.threads.virtual.enabled=true)를 켠 뒤 부하 테스트에서 처리량은 오르지 않고 아래 오류가 쏟아집니다. DB 풀 설정은 기본값(최대 10)입니다.

HikariPool-1 - Connection is not available, request timed out after 30000ms

가상 스레드의 이점을 유지하면서 취할 가장 적절한 조치는 무엇입니까?`,
      choices: [
        `풀 최대 크기를 1,000으로 올린다`,
        `가상 스레드를 끄고 Tomcat 최대 스레드를 2,000으로 올린다`,
        `DB를 쓰는 구간 앞에서 동시성을 풀 크기 수준으로 제한하고, 풀 크기는 DB가 허용하는 연결 수에서 역산해 정한다`,
        `가상 스레드 위에 별도 스레드 풀을 만들어 요청을 풀링한다`
      ],
      answer: 2,
      why: `가상 스레드는 스레드 부족 대기만 없애므로 병목이 DB 풀로 옮겨 온 것입니다. 병목 자원 앞에서 동시성을 제한(@ConcurrencyLimit, 세마포어)하고 풀은 DB 허용 연결 수와 파드 수로 역산하는 것이 맞습니다. 풀을 1,000으로 올리는 것이 가장 유혹적이지만 DB 연결 한도를 넘겨 DB가 거부하거나 느려집니다. 가상 스레드는 풀링하지 않는 것이 JEP 444의 지침입니다.`
    },
    {
      q: `쿠버네티스에서 이 서비스를 파드 6개로 시작하고 부하 시 HPA로 최대 10개까지 늘립니다. PostgreSQL의 max_connections는 기본값 100입니다. 아래 설정의 문제는 무엇입니까?

spring:
  datasource:
    hikari:
      maximum-pool-size: 20
  jpa:
    open-in-view: false`,
      choices: [
        `open-in-view를 false로 두면 풀이 항상 고갈된다`,
        `최대 10개 파드 x 풀 20 = 200개 연결이 가능해 DB 한도 100을 넘으므로, 파드 수 x 풀 크기가 허용 연결 수 이하가 되게 풀을 낮추거나 한도를 조정해야 한다`,
        `HikariCP는 maximum-pool-size가 10을 넘으면 값을 무시한다`,
        `풀은 파드마다 독립이라 DB 한도와는 관계가 없다`
      ],
      answer: 1,
      why: `각 파드가 자기 풀을 가지므로 DB가 받는 총 연결 수는 파드 수 x 풀 크기입니다. 스케일 아웃 상한(10개)으로 계산하면 200개라 한도 100을 넘어 배포·스케일 때 연결 거부가 납니다. 네 번째 선택지는 "파드마다 풀이 따로 있다"는 사실에서 틀린 결론을 내린 것이라 유혹적입니다. 풀은 DB 입장에서 모두 합산됩니다.`
    },
    {
      q: `정산 메일을 보내는 @Scheduled(cron = "0 0 2 * * *") 작업이 있는 서비스를 인스턴스 3대로 늘렸더니 고객이 같은 메일을 3통 받았습니다. 가장 적절한 대응은 무엇입니까?`,
      choices: [
        `스케줄러 풀 크기를 3으로 늘린다`,
        `fixedDelay 방식으로 바꿔 실행 간격을 벌린다`,
        `가상 스레드를 켜서 중복 실행이 일어나지 않게 한다`,
        `한 번에 한 주체만 실행되도록 분산 락이나 단일 실행(CronJob 등)으로 분리하고, 작업도 발송 여부를 기록해 멱등하게 만든다`
      ],
      answer: 3,
      why: `@Scheduled는 인스턴스마다 독립적으로 실행되므로 실행 주체를 하나로 제한해야 하고, 락 만료·재시도 상황까지 고려해 작업도 멱등해야 합니다. 풀 크기를 늘리는 것은 한 인스턴스 안의 병렬성만 바꾸므로 가장 유혹적이지만 인스턴스 간 중복과 무관합니다. 가상 스레드와 fixedDelay도 중복 실행을 막지 못합니다.`
    },
    {
      q: `정산 서비스에서 settleOne을 건별 독립 트랜잭션으로 실행하려고 했습니다. 그런데 3번째 항목에서 예외가 나면 앞의 두 건이 이미 커밋되어 있고, settleOne 안에서 트랜잭션 활성 여부를 찍어 보면 false입니다. 왜 그렇습니까?

@Service
public class SettlementService {
    public void settleAll(List<Long> ids) {
        for (Long id : ids) {
            settleOne(id);
        }
    }

    @Transactional
    public void settleOne(Long id) {
        // 여러 테이블 갱신, 3번째 id에서 RuntimeException
    }
}`,
      choices: [
        `같은 클래스 안의 호출은 프록시를 거치지 않는 자기 호출이라 @Transactional이 무시된다. settleOne을 다른 빈으로 분리하거나 TransactionTemplate을 써야 한다`,
        `RuntimeException은 기본 롤백 대상이 아니므로 rollbackFor를 지정해야 한다`,
        `readOnly가 기본값이라 쓰기가 즉시 커밋되므로 readOnly = false를 지정해야 한다`,
        `settleOne의 반환 타입이 void라서 프록시가 만들어지지 않는다`
      ],
      answer: 0,
      why: `프록시 기반 트랜잭션은 프록시를 통해 들어온 호출에만 적용되며 같은 객체 안의 this 호출은 프록시를 우회합니다. 따라서 각 repository 호출이 자기 트랜잭션으로 즉시 커밋됩니다. rollbackFor 선택지는 유혹적이지만 RuntimeException은 기본적으로 롤백 대상이고 문제는 트랜잭션이 아예 없다는 점입니다. readOnly의 기본값은 false이고 반환 타입은 프록시와 무관합니다.`
    },
    {
      q: `모바일 팀이 "어떤 오류는 {timestamp, status, error, path} 형태, 검증 오류는 서버 팀이 만든 커스텀 JSON, 404는 HTML로 와서 파싱이 안 된다"고 합니다. 가장 적절한 개선은 무엇입니까?`,
      choices: [
        `모든 컨트롤러 메서드에서 try-catch로 직접 오류 JSON을 만들어 반환한다`,
        `ResponseEntityExceptionHandler를 상속한 @RestControllerAdvice로 프레임워크·도메인 예외를 모두 application/problem+json(RFC 9457)으로 통일하고, 필터에서 나는 401 같은 오류도 같은 형식이 되게 처리한 뒤 계약 테스트로 고정한다`,
        `클라이언트가 상태 코드만 보고 본문은 무시하도록 합의한다`,
        `서버 오류를 모두 200으로 내려 보내고 본문의 code 필드로 구분한다`
      ],
      answer: 1,
      why: `전역 어드바이스로 표준 형식(ProblemDetail)에 모으고, ControllerAdvice 밖에서 생기는 필터 오류와 /error 경로까지 포맷을 맞춘 뒤 테스트로 고정해야 일관성이 유지됩니다. try-catch 방식은 가장 유혹적이지만 누락과 중복이 생기고 프레임워크가 던지는 예외는 잡지 못합니다. 200으로 에러를 내리는 방식은 HTTP 의미론을 깨 모니터링과 캐시를 망가뜨립니다.`
    },
    {
      q: `장애 추적을 위해 모든 요청 로그에 requestId를 붙이려 합니다. 인증 실패(401), 존재하지 않는 경로(404), 본문 파싱 실패(400)의 로그에도 requestId가 있어야 합니다. 어디에 구현해야 합니까?`,
      choices: [
        `HandlerInterceptor.preHandle에 구현한다. 컨트롤러 앞에서 실행되므로 충분하다`,
        `서비스 계층의 AOP 어드바이스에 구현한다`,
        `각 컨트롤러 메서드의 첫 줄에서 MDC에 넣는다`,
        `서블릿 Filter(OncePerRequestFilter)를 보안 필터 체인보다 앞선 순서로 등록하고 finally에서 MDC를 정리한다`
      ],
      answer: 3,
      why: `보안 필터는 서블릿 필터 단계에서 401을 만들고, 매핑 실패(404)는 핸들러가 없어 인터셉터가 실행되지 않습니다. 그래서 모든 요청을 덮으려면 DispatcherServlet 앞의 필터여야 하고 보안 필터보다 먼저 와야 합니다. 인터셉터 선택지가 유혹적이지만 핸들러가 매칭된 요청에만 적용됩니다. 서비스 AOP와 컨트롤러 첫 줄은 그보다 더 안쪽입니다.`
    },
    {
      q: `회원 가입 후 프로필 이미지를 저장소에 올리는 코드입니다. 업로드가 IOException으로 실패했는데 회원 행이 DB에 남아 있습니다. 이유는 무엇입니까?

@Transactional
public void register(SignupRequest req) throws IOException {
    memberRepository.save(Member.from(req));
    storage.upload(req.profileImage());   // IOException 발생
}`,
      choices: [
        `기본 롤백 규칙이 RuntimeException과 Error만 대상이라 체크 예외 IOException에는 커밋된다. rollbackFor = Exception.class(또는 전역 롤백 설정)로 바꾼다`,
        `save()가 호출 즉시 별도 트랜잭션으로 커밋하는 메서드라서 어떤 설정을 해도 롤백되지 않는다`,
        `@Transactional의 readOnly 기본값이 true라서 롤백이 동작하지 않는다`,
        `IOException은 Error의 하위 클래스이므로 롤백 대신 재시도가 수행된다`
      ],
      answer: 0,
      why: `공식 문서 기준으로 기본 롤백은 RuntimeException과 Error이고 체크 예외는 커밋됩니다. 그래서 save가 이미 반영된 채 메서드가 예외로 끝나도 커밋됩니다. save()가 즉시 커밋한다는 설명은 그럴듯하지만 save는 현재 트랜잭션에 참여할 뿐이고 롤백 규칙만 바꾸면 해결됩니다. readOnly 기본값은 false이고 IOException은 Error가 아닙니다.`
    },
    {
      q: `초당 300건 수준의 JPA 기반 CRUD API(평균 응답 80ms)를 운영하는 고객이 "성능을 위해 WebFlux로 전환"해 달라고 요청합니다. 팀은 리액티브 경험이 없고 DB 접근은 JPA입니다. 가장 적절한 조언은 무엇입니까?`,
      choices: [
        `이벤트 루프 모델이 항상 더 빠르므로 바로 전환한다`,
        `JPA 호출은 그대로 두고 컨트롤러 반환 타입만 Mono로 바꾸면 된다`,
        `병목을 먼저 측정한다. 블로킹 JDBC/JPA 스택이면 MVC + 가상 스레드(Java 21+)와 풀·동시성 제한을 먼저 검토하고, WebFlux는 전 구간 논블로킹이거나 스트리밍·백프레셔가 핵심일 때 고려한다`,
        `스레드 풀을 키우는 것 외에는 방법이 없다고 안내한다`
      ],
      answer: 2,
      why: `초당 300건 x 0.08초는 동시 진행 약 24건이라 스레드 수가 병목일 가능성이 낮고, 병목은 DB·쿼리 쪽에 있을 가능성이 큽니다. 블로킹 스택이면 MVC + 가상 스레드가 변경 비용이 가장 낮습니다. 반환 타입만 Mono로 바꾸는 방법은 가장 유혹적이지만 블로킹 호출이 이벤트 루프를 막아 이점 없이 복잡성만 늘립니다.`
    }
  ],
  refs: [
    {
      title: `Spring Boot 4.0 Migration Guide (Spring Boot wiki)`,
      url: `https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide`,
      kind: `doc`,
      why: `3.5에서 4.x로 올릴 때 바뀌는 스타터 이름, Jackson 3, @MockitoBean, 제거된 기능, 속성 이름 변경이 정리되어 있다. 마이그레이션 의뢰의 1순위 체크리스트이며 페이지가 길어 일부 절은 직접 열어 확인해야 한다.`
    },
    {
      title: `Spring Boot 4.1 Release Notes (Spring Boot wiki)`,
      url: `https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.1-Release-Notes`,
      kind: `doc`,
      why: `4.1의 의존성 버전(Hibernate 7.4, Kotlin 2.3.21 등), 4.0 deprecated 항목 제거, OpenTelemetry 옵션, InetAddressFilter, 업그레이드 영향 변경이 나온다. 버전 숫자는 이 문서를 기준으로 재확인한다.`
    },
    {
      title: `Spring Boot System Requirements`,
      url: `https://docs.spring.io/spring-boot/system-requirements.html`,
      kind: `doc`,
      why: `Java·Spring Framework·Maven·Gradle·Tomcat·Jetty·GraalVM의 요구 버전을 현행 릴리스 기준으로 준다. 고객 환경 진단표의 기준값으로 쓴다.`
    },
    {
      title: `Spring Boot 지원 종료일 집계 (endoflife.date)`,
      url: `https://endoflife.date/spring-boot`,
      kind: `doc`,
      why: `3.5·4.0·4.1의 OSS 지원 종료일을 한눈에 본다. 제3자 집계이며 릴리스일을 월말로 반올림하므로 계약서에 쓸 날짜는 공식 일정으로 교차 확인한다.`
    },
    {
      title: `egovframe-template-simple-backend (eGovFramework GitHub)`,
      url: `https://github.com/eGovFramework/egovframe-template-simple-backend`,
      kind: `doc`,
      why: `전자정부 표준프레임워크 5.0.1 simple-backend 템플릿의 README다. 환경 표에 Spring Boot 3.5.6, JDK 17, Jakarta EE 10, Spring Framework 6.2.11이 나오고 Swagger·JWT 인증 설명과 Dockerfile·k8s 디렉터리가 있다(2026-11 열람). 한국 공공 SI 의뢰의 기준선을 확인할 때 연다.`
    },
    {
      title: `Testing Spring Boot Applications (Spring Boot Reference)`,
      url: `https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html`,
      kind: `doc`,
      why: `@SpringBootTest, 슬라이스 테스트, MockMvcTester, RestTestClient와 Boot 4의 모듈별 패키지 구조를 코드 예제로 확인한다. 테스트 어노테이션의 정확한 import 경로를 여기서 가져온다.`
    },
    {
      title: `Testcontainers (Spring Boot Reference)`,
      url: `https://docs.spring.io/spring-boot/reference/testing/testcontainers.html`,
      kind: `doc`,
      why: `@ServiceConnection으로 컨테이너와 DataSource를 연결하는 방법과 컨테이너를 @Bean으로 선언하라는 권고, 컨텍스트 캐시와의 관계를 설명한다.`
    },
    {
      title: `Resilience Features (Spring Framework Reference)`,
      url: `https://docs.spring.io/spring-framework/reference/core/resilience.html`,
      kind: `doc`,
      why: `Framework 7의 @Retryable, @ConcurrencyLimit, @EnableResilientMethods와 트랜잭션·캐시·비동기 어노테이션과의 적용 순서가 정리되어 있다.`
    },
    {
      title: `Using @Transactional (Spring Framework Reference)`,
      url: `https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html`,
      kind: `doc`,
      why: `프록시 모드의 자기 호출 한계, 메서드 가시성, 기본 롤백 규칙, 속성 표가 공식 문장으로 나온다. 트랜잭션 버그 리뷰의 근거 문서로 쓴다.`
    },
    {
      title: `Task Execution and Scheduling (Spring Boot Reference)`,
      url: `https://docs.spring.io/spring-boot/reference/features/task-execution-and-scheduling.html`,
      kind: `doc`,
      why: `spring.threads.virtual.enabled가 작업 실행기와 스케줄러에 미치는 영향, 풀 설정이 무시되는 조건, 사용자 정의 Executor 시 자동 구성이 물러나는 규칙을 다룬다.`
    },
    {
      title: `Actuator Endpoints (Spring Boot Reference)`,
      url: `https://docs.spring.io/spring-boot/reference/actuator/endpoints.html`,
      kind: `doc`,
      why: `엔드포인트 노출·접근 기본값, 헬스 그룹과 쿠버네티스 프로브 경로, show-details 설정을 확인한다. 운영 설정 리뷰의 체크리스트 원천이다.`
    },
    {
      title: `Externalized Configuration (Spring Boot Reference)`,
      url: `https://docs.spring.io/spring-boot/reference/features/external-config.html`,
      kind: `doc`,
      why: `프로퍼티 소스 우선순위, 프로파일 활성화 규칙, spring.config.import와 configtree 사용법이 나온다. 환경 변수 바인딩 절은 길어서 직접 열어 확인한다.`
    },
    {
      title: `Kotlin Support (Spring Boot Reference)`,
      url: `https://docs.spring.io/spring-boot/reference/features/kotlin.html`,
      kind: `doc`,
      why: `요구 Kotlin 버전, kotlin-spring 플러그인, 데이터 클래스 기반 @ConfigurationProperties, 테스트 도구와 컴파일러 옵션 권고를 정리한다.`
    },
    {
      title: `Virtual Threads (Oracle JDK 25 Core Libraries)`,
      url: `https://docs.oracle.com/en/java/javase/25/core/virtual-threads.html`,
      kind: `doc`,
      why: `가상 스레드를 풀링하지 말고 작업마다 만들 것, 동시성 제한은 Semaphore로 할 것, 핀닝은 native 메서드·외부 함수에서 생긴다는 지침이 있다. 같은 문서의 JDK 21판은 synchronized도 핀닝 원인으로 적는다. 가상 스레드 도입을 고객에게 설명할 때 근거로 쓴다.`
    }
  ],
  gigs: [
    `시장 지형: 위시켓 기간제(상주) 프로젝트 분석(2025-01~09)에서 백엔드 요청의 39.8%가 JAVA이고, 2025 상반기 기준 Spring Boot는 백엔드 기술 중 평균 단가가 가장 높았습니다(약 581만 원). 사람인 키워드 검색(2026-11-09 하루 기준)은 Spring Boot 569, Spring Security 205, JPA 168, MyBatis 137, 전자정부프레임워크 118건입니다. 모두 마켓플레이스·채용 표본이고 위시켓은 주니어를 프런트 위주로 배정하는 경향도 말하므로, 진입은 소규모 유지보수·마이그레이션 같은 마이크로 갭에서 시작해 운영·장애 대응 수치를 쌓는 경로가 현실적입니다.`,
    `견적 전 확인 목록: Boot·Java 버전과 3.5 이하 여부(OSS 지원 종료 2026-06-30, 제3자 집계), Maven 또는 Gradle, 사용 DB(Oracle·MySQL·PostgreSQL), ORM(JPA 또는 MyBatis), 배포 방식(임베디드 서버, 외부 WAS의 WAR, 컨테이너), CI 유무, 테스트 유무와 실제 DB 사용 여부, 소스 접근 권한, eGovFrame 등 원청 표준 프레임워크 여부. 이 중 둘 이상이 불명확하면 고정가 대신 진단을 먼저 소액으로 분리해 계약하세요.`,
    `마이그레이션을 상품으로 만들기: 진단(버전 표, 서드파티 호환성, 테스트 현황), 업그레이드 작업, 회귀·성능 검증 세 단계로 쪼개 견적합니다. 서드파티 라이브러리 호환 이슈에는 별도 버퍼(경험칙으로 20~30%)를 두고, 인수 기준은 테스트 N개 통과, deprecated 경고 0건, p95 증가 10% 이하처럼 수치로 적습니다. 상주 단가(2025 상반기 백엔드 평균 월 570만 원, 미드 579만 원, 시니어 732만 원)는 월 단가 산정의 참고일 뿐이고, 고정가는 인일 x 난이도에 위험 버퍼를 더해 따로 계산하세요.`,
    `납품물 체크리스트: 소스와 빌드 방법(깨끗한 클론에서 재현), OpenAPI(Swagger) 문서, ERD와 Flyway 마이그레이션, 환경 변수 목록(비밀 값 제외), 런북(배포·롤백·장애 대응), 테스트 리포트, 의존성 취약점 스캔 결과와 라이선스 목록(OWASP Dependency-Check, Dependabot 같은 도구의 결과), 버전과 지원 종료 표(날짜 표기). 크몽의 백엔드 상품도 API 문서와 소스·기술 문서 인수인계를 납품물에 포함합니다.`,
    `자주 걸리는 함정: 운영의 ddl-auto=update, open-in-view 기본값 방치, 엔티티를 그대로 응답으로 노출, 트랜잭션 안의 외부 호출, 체크 예외 롤백 누락, 자기 호출, H2로만 테스트, 컨테이너 기본 시간대(UTC)와 KST 일 마감 불일치, 저장소에 올라간 비밀 값, 파드 수 x 풀 크기가 DB 연결 한도 초과, 스케줄 작업의 다중 인스턴스 중복 실행. 인수받은 코드의 진단 체크리스트로 그대로 쓸 수 있습니다.`,
    `상주·공공·금융 SI: 위시켓 상주 목록(2026-11-09)에는 보험사 Java/Spring/EJB 운영·구축 공고 6건(월 600~700만 원, 360~390일)이 있었습니다. 요구는 장기 운영 경험, Java 8/11 레거시와 javax 패키지 읽기, Oracle, MyBatis, 보고 체계 적응입니다. 프레임워크 기준선(eGovFrame 5.0 템플릿은 Boot 3.5.6 기반)과 지원 종료 대응은 원청과 서면으로 합의하고, 포트폴리오에는 운영·장애 대응 사례를 수치로 담으세요.`,
    `다른 스택 요청 대응: Kotlin(사람인 206건), NestJS(96건), FastAPI(249건)는 모두 2026-11-09 키워드 검색 건수입니다. Kotlin은 Boot가 관리하는 버전을 따르면 되고, FastAPI 의뢰는 별도 모듈의 내용을 참고하세요. AI 코드 생성기가 만든 Spring 코드는 트랜잭션 경계, 인가 검사, 입력 검증, 동시성(싱글톤 가변 상태)을 우선 리뷰하고, 가상 스레드·WebFlux 같은 동시성 모델 선택은 측정 근거와 함께 문서(ADR)로 남기세요.`
  ]
};
