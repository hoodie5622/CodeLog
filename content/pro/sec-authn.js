(window.PRO_MODULES = window.PRO_MODULES || {})["sec-authn"] = {
  id: "sec-authn",
  summary: `비밀번호·세션·JWT·OAuth/OIDC·접근통제·API 보안을 NIST SP 800-63B-4, RFC 9700, OWASP API Security Top 10:2023 같은 표준 조항에 맞춰 설계·구현·점검하고, 외주 프로젝트의 인증·인가 감사 보고서를 납품할 수 있다.`,
  hours: 76,
  goals: [
    `NIST SP 800-63B-4와 OWASP Password Storage Cheat Sheet를 근거로 비밀번호 정책(길이·차단목록·변경 규칙)과 Argon2id 파라미터를 정하고, 기존 해시를 로그인 시점에 안전하게 이전할 수 있다.`,
    `무차별 대입·패스워드 스프레잉·크리덴셜 스터핑을 구분하고, 동일 응답·더미 해시·점진 지연·MFA·패스키·복구 흐름 설계로 방어할 수 있다.`,
    `서버 세션과 쿠키 속성(Secure·HttpOnly·SameSite·__Host-), 세션 ID 재발급, 유휴/절대 만료, 서버 측 폐기, CSRF 방어를 설계하고 구현할 수 있다.`,
    `JWT 검증 절차(alg 허용목록·iss·aud·exp·typ)를 구현하고, alg none·알고리즘 혼동·공격자 키 서명·aud/iss/typ 불일치·만료 토큰이 모두 거부됨을 음성 테스트로 증명할 수 있다.`,
    `OAuth 2.0 Authorization Code + PKCE 흐름을 단계별로 설명하고, RFC 9700 항목(redirect URI 정확 일치·implicit/password grant 금지·refresh 회전·발신자 제약)을 pass/fail 점검표로 감사할 수 있다.`,
    `OIDC의 ID Token과 access token의 용도를 구분하고, 브라우저 앱에는 BFF·token-mediating backend·순수 브라우저 클라이언트 중 무엇을 쓸지 RFC 10017을 근거로 선택할 수 있다.`,
    `RBAC·ABAC·멀티테넌시 모델에서 BOLA·BFLA·BOPLA를 찾아 막고, 역할×엔드포인트×소유권 권한 매트릭스를 CI 자동 테스트로 만들 수 있다.`,
    `OWASP API Security Top 10:2023 전 항목으로 API를 점검해 SSRF 방어·요청 한도·RFC 9457 오류 응답·웹훅 서명을 적용하고, ASVS 5.0 매핑이 담긴 점검 보고서를 납품할 수 있다.`
  ],
  lessons: [
    {
      title: `인증·인가·세션·토큰의 정신 모델: 한 요청이 지나는 네 관문`,
      body: `인증(authentication)은 "이 요청을 보낸 주체가 누구인가"를 확인하는 일이고, 인가(authorization)는 "그 주체가 이 객체에 이 동작을 해도 되는가"를 결정하는 일입니다. HTTP는 요청마다 독립적이라서 서버가 로그인 때 확인한 사실을 다음 요청에서 다시 증명받아야 합니다. 이 "증명을 운반하는 수단"이 세션 쿠키와 액세스 토큰이고, 이 모듈의 모든 설계는 **증명의 발급 → 운반 → 검증 → 폐기** 네 단계를 어떻게 안전하게 만드느냐로 수렴합니다.

### 한 요청이 지나는 네 관문

| 관문 | 던지는 질문 | 대표 실패 |
| 자격 확인 | 비밀번호·패스키가 맞는가 | 약한 해시, 대입 공격 허용 |
| 증명 운반 | 다음 요청을 무엇으로 잇는가 | 세션 ID 고정, 토큰 탈취 |
| 검증 | 받은 증명이 진짜·유효·내 것인가 | alg 미검증, aud 누락 |
| 인가 | 이 객체에 이 동작이 허용되는가 | 소유권 검사 누락(BOLA) |

현업 사고는 거의 이 표의 한 칸에서 나옵니다. 로그인 화면은 멀쩡한데 세 번째 칸에서 서명을 제대로 검증하지 않거나, 네 번째 칸에서 URL의 ID만 바꿔도 남의 데이터가 열리는 식입니다. OWASP Top 10:2025에서 A07(Authentication Failures)과 A01(Broken Access Control)이 각각 앞 세 칸과 마지막 칸에 대응하고, CWE로는 CWE-287(부적절한 인증), CWE-862·863·639(인가 누락·오류·사용자 제어 키)가 대표입니다. 선수 모듈에서 목록으로 배운 항목을 이 모듈에서는 **구현 수준의 결정**으로 바꿉니다.

### 대부분의 증명은 bearer다

쿠키 속 세션 ID든 Authorization 헤더 속 JWT든 "가진 사람이 곧 주인"입니다. 복사하면 같은 권한이 생깁니다. 그래서 위협은 다섯 가지로 정리됩니다.
- 추측: 예측 가능한 세션 ID, 약한 난수
- 대입·스터핑: 자격 확인 단계를 자동화해 두드리기
- 탈취: XSS, 로그·URL에 남은 토큰, 악성 확장, 중간자
- 재생(replay): 탈취한 증명을 그대로 다시 제출
- 혼동: 토큰을 엉뚱한 수신자나 용도에 제출해 통과(confused deputy)

방어도 세 방향으로 정리됩니다. 탈취를 어렵게 하고, 탈취돼도 피해를 제한하고(짧은 수명·좁은 범위·발신자 제약), 탐지해서 폐기할 수 있어야 합니다. 이후 모든 강의의 설정값(만료 시간, 쿠키 속성, 토큰 수명)은 이 세 방향 중 어디를 위한 것인지로 설명할 수 있어야 합니다.

### 상태 있는 증명과 상태 없는 증명

서버 세션은 쿠키에는 의미 없는 난수만 담고 사용자·만료 정보는 서버 저장소에 둡니다. 요청마다 저장소를 한 번 조회하는 대가로 로그아웃·강제 만료가 즉시 먹힙니다. 자기완결 토큰(JWT)은 서명만 검증하면 되므로 조회가 필요 없고 여러 서비스에 퍼뜨리기 쉬운 대신, 만료 전에 거두어들이기 어렵습니다. 어느 쪽이 정답인 것이 아니라 5강에서 기준을 세웁니다.

### 표준 지도

- 비밀번호·인증자·세션: NIST SP 800-63B-4 (2025-07 최종)
- OAuth: RFC 6749·6750·7636, 보안 BCP RFC 9700(2025-01), 브라우저 앱 RFC 10017(2026-08), DPoP RFC 9449. OAuth 2.1은 draft-ietf-oauth-v2-1-17(2026-10-31)로 2026-11 기준 아직 RFC가 아님
- JWT: RFC 7519·7515, BCP RFC 8725, access token 프로필 RFC 9068
- 로그인(신원 계층): OpenID Connect Core 1.0
- 점검 체크리스트: OWASP ASVS 5.0(V6 인증·V7 세션·V8 인가·V9 자기완결 토큰·V10 OAuth/OIDC), OWASP API Security Top 10:2023

고객과 의견이 갈릴 때 "제 경험상"이 아니라 조항 번호로 말하는 것이 전문가의 습관입니다.

### 직접 만들 것인가

외주에서 첫 의사결정은 인증을 직접 구현할지입니다. 비밀번호 저장·MFA·복구·감사 로그·프로토콜 준수까지 직접 만들면 유지보수 비용을 고객이 영구히 부담합니다. 기본값은 검증된 프레임워크·라이브러리나 IdP(Keycloak, Auth0, Amazon Cognito, Microsoft Entra ID 등)를 쓰는 것이고, 직접 구현은 요구사항상 불가피할 때 범위를 명시하고 하는 것입니다. 이 모듈의 목표는 "직접 만들라"가 아니라 "만들어진 것을 올바르게 설정하고 검증하고 감사하라"입니다.`,
      code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Principal:
    user_id: int
    tenant_id: int
    roles: frozenset


class Unauthenticated(Exception):  # HTTP 401: 누구인지 모른다
    pass


class Forbidden(Exception):  # HTTP 403 또는 404: 알지만 허용하지 않는다
    pass


TOKENS = {"tok-kim": Principal(7, 1, frozenset({"member"}))}
INVOICES = {
    100: {"tenant_id": 1, "owner_id": 7, "total": 5000},
    101: {"tenant_id": 2, "owner_id": 9, "total": 99000},
}


def authenticate(headers):  # 관문 1~3: 누구인가
    scheme, _, token = headers.get("Authorization", "").partition(" ")
    if scheme.lower() != "bearer" or token not in TOKENS:
        raise Unauthenticated()
    return TOKENS[token]


def authorize_invoice(p, inv):  # 관문 4: 이 객체에 허용되는가
    same_tenant = inv["tenant_id"] == p.tenant_id
    allowed = "admin" in p.roles or inv["owner_id"] == p.user_id
    if not (same_tenant and allowed):
        raise Forbidden()


def get_invoice(headers, invoice_id):
    p = authenticate(headers)
    inv = INVOICES.get(invoice_id)
    if inv is None:
        raise Forbidden()  # 없는 객체와 남의 객체를 같은 응답으로 만든다
    authorize_invoice(p, inv)
    return inv


kim = {"Authorization": "Bearer tok-kim"}
assert get_invoice(kim, 100)["total"] == 5000
for bad_id in (101, 999):
    try:
        get_invoice(kim, bad_id)
    except Forbidden:
        pass
    else:
        raise SystemExit("leak: " + str(bad_id))
try:
    get_invoice({}, 100)
except Unauthenticated:
    print("ok")`,
      codeLang: `python`,
      key: [
        `인증은 "누구인가", 인가는 "이 객체에 이 동작이 허용되는가"이며 401과 403은 이 둘의 실패를 구분하는 신호다.`,
        `세션 ID·JWT 모두 bearer라서 복사하면 같은 권한이 된다. 방어는 탈취 방지, 피해 제한(짧은 수명·좁은 범위), 탐지·폐기의 세 방향이다.`,
        `JWT의 등록 클레임은 RFC 7519상 전부 선택이므로 필수 검증 항목은 애플리케이션이 강제해야 한다.`,
        `표준 근거: NIST SP 800-63B-4(비밀번호·세션), RFC 9700(OAuth BCP), RFC 8725(JWT BCP), ASVS 5.0 V6~V10, API Top 10:2023.`,
        `기본값은 검증된 라이브러리나 IdP를 쓰는 것이며 직접 구현은 범위와 유지보수 책임을 계약에 적고 한다.`
      ],
      pitfalls: [
        `로그인 성공 화면만 테스트하고 두 번째 사용자·다른 테넌트 계정으로 같은 URL을 호출해 보지 않는다. 인가 결함은 단일 계정 테스트로 드러나지 않는다.`,
        `인증과 인가를 한 미들웨어에 섞어 "로그인했으면 통과"로 끝낸다. 인증이 통과해도 객체별 인가 검사는 별도로 필요하다.`,
        `"JWT를 쓰니 stateless라 확장성이 좋다"를 근거로 선택하고 폐기 요구사항(퇴사자 차단, 비밀번호 변경 후 로그아웃)을 확인하지 않는다.`
      ]
    },
    {
      title: `비밀번호: NIST 정책과 Argon2id 저장`,
      body: `DB 유출은 "만약"이 아니라 "언제"의 문제로 설계해야 합니다. 비밀번호 해시의 목적은 유출 이후 공격자가 오프라인에서 추측을 시도하는 비용을 올리는 것입니다. SHA-256 같은 범용 해시는 빠르게 계산되도록 설계돼서 GPU로는 하드웨어에 따라 초당 수억~수십억 회가 가능하므로, 솔트를 붙여도 약한 비밀번호는 금방 깨집니다. 비밀번호 전용 함수(Argon2id, scrypt, bcrypt, PBKDF2)는 의도적으로 느리고, 앞의 둘은 메모리도 요구해 GPU 병렬화의 이점을 줄입니다.

### 선택과 최소 파라미터 (OWASP Password Storage Cheat Sheet, 2026-11 열람)

| 알고리즘 | 최소 설정 | 비고 |
| Argon2id | m=19 MiB, t=2, p=1 | 1순위. 동급 대안 46 MiB·t=1, 12 MiB·t=3, 9 MiB·t=4, 7 MiB·t=5 |
| scrypt | N=2^17(128 MiB), r=8, p=1 | Argon2id를 못 쓸 때 |
| bcrypt | 작업 계수 10 이상 | 레거시용, 입력 72바이트 한계 |
| PBKDF2 | HMAC-SHA256 60만 회 | FIPS 인증이 필요할 때 |

이 값은 **바닥**입니다. 튜닝 원칙은 서버에서 한 번 검증이 목표 시간에 들어오도록 올리는 것입니다(OWASP는 1초 미만을 일반 원칙으로 보고, 로그인 지연에 민감한 현업에서는 보통 수백 ms를 목표로 잡습니다). 여기에 반드시 곱셈을 하나 해야 합니다. 메모리 19 MiB짜리 해시를 동시에 200건 돌리면 약 3.7 GiB입니다. 로그인 폭주가 서버 메모리를 고갈시키면 해시 비용 자체가 DoS 증폭기가 되므로 동시 실행 수 제한(세마포어)과 로그인 스로틀(3강)이 짝으로 필요합니다.

### 솔트, 페퍼, 저장 형식

- 솔트: 사용자마다 고유한 난수로, 같은 비밀번호도 다른 해시가 되게 하고 레인보우 테이블을 무력화합니다. 비밀이 아니며 해시와 함께 저장합니다. NIST 최소는 32비트이고 라이브러리 기본은 대개 16바이트입니다.
- 페퍼: 모든 해시에 공통으로 쓰는 비밀 키로 DB 밖(KMS·HSM·시크릿 매니저)에 둡니다. NIST는 키 있는 해시 추가를 권고(SHOULD)하고 OWASP는 심층방어 수단으로 봅니다. 교체하려면 사용자 비밀번호를 알아야 하므로 처음부터 페퍼 버전 번호를 함께 저장하세요.
- PHC 문자열: ‹$argon2id$v=19$m=19456,t=2,p=1$솔트$해시›처럼 알고리즘·파라미터·솔트·해시가 한 문자열에 담깁니다. 덕분에 파라미터를 올려도 옛 해시와 새 해시가 공존합니다.
- 재해시: 로그인에 성공한 순간만 평문을 갖고 있습니다. 이때 저장된 파라미터가 현재 정책보다 약하면 새로 해시해 덮어씁니다. 몇 달씩 접속하지 않는 사용자의 해시는 옛 파라미터로 남으므로, 장기 미접속 계정의 처리 정책(재설정 요구 등)은 고객과 정해 둡니다.

### 정책: NIST SP 800-63B-4 (2025-07 최종)

- 단일 요소 인증이면 최소 15자, 다른 인증 요소와 함께 쓸 때만 최소 8자(SHALL)
- 최소 64자까지는 허용(SHOULD), 유니코드 허용, 한 글자가 한 문자로 계산됨
- 대소문자·숫자·특수문자 같은 복잡도 규칙 부과 금지(SHALL NOT)
- 주기적 변경 강제 금지, 침해 증거가 있을 때만 강제
- 새·변경 비밀번호를 유출·흔한·예상 값 차단목록과 대조
- 힌트·보안 질문 금지, 비밀번호 관리자·자동완성 허용, 붙여넣기 허용 권고
- 해시 전 유니코드 정규화(NFC) 권고

외주에서 "특수문자 필수, 90일마다 변경"을 요구받으면 이 조항 번호로 길이 중심 정책을 제안할 수 있습니다. 다만 고객사가 ISMS-P 같은 인증 심사를 받는다면 심사 기준·사내 규정과 충돌하지 않는지 먼저 확인하고, 충돌하면 문서에 근거를 남기고 고객 결정에 따릅니다. 한국에서는 개인정보 안전성 확보조치로 비밀번호 일방향 암호화가 요구되고(PRV-201 참조), 개인정보위의 2026-10-29 과징금 보도자료에서도 안전하지 않은 암호 알고리즘과 솔트 미사용 때문에 일부 비밀번호가 복호화될 수 있었다는 점이 지적됐습니다. Naiakshina 외(arXiv 1708.08759)의 정성 연구(CS 학생 20명)는 개발자가 비밀번호 저장을 왜 틀리는지를 다루므로 결론은 직접 읽어 보세요.`,
      code: `import unicodedata
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError

ph = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)  # t=2, m=19 MiB, p=1
BLOCKLIST = {"password", "qwerty123456789", "iloveyou1234567"}  # 실무: 유출 목록 수백만 건


def norm(pw):
    return unicodedata.normalize("NFC", pw)


def check_policy(pw, email, mfa=False):
    pw = norm(pw)
    if len(pw) < (8 if mfa else 15):
        return "too_short"
    if len(pw) > 128:  # 64자 이상은 허용하되 DoS 방지용 상한을 둔다
        return "too_long"
    low = pw.lower()
    local = email.split("@")[0].lower()
    if low in BLOCKLIST or (len(local) >= 4 and local in low):
        return "blocked"
    return None  # 대소문자·특수문자 규칙은 두지 않는다


def hash_password(pw):
    return ph.hash(norm(pw))


def verify_and_upgrade(stored, pw):
    """(성공 여부, 저장해야 할 해시)를 돌려준다."""
    try:
        ph.verify(stored, norm(pw))
    except (VerificationError, InvalidHashError):
        return False, stored
    if ph.check_needs_rehash(stored):  # 정책 파라미터가 올랐다면
        stored = hash_password(pw)  # 평문을 가진 이 순간에만 교체할 수 있다
    return True, stored`,
      codeLang: `python`,
      key: [
        `Argon2id 최소 m=19 MiB·t=2·p=1(또는 46 MiB·t=1), scrypt N=2^17·r=8·p=1, bcrypt 비용 10 이상, PBKDF2-HMAC-SHA256 60만 회. 이 값은 바닥이며 서버에서 측정해 올린다.`,
        `해시·솔트·파라미터를 PHC 문자열로 함께 저장하고, 로그인 성공 시 check_needs_rehash로 점진 이전한다.`,
        `NIST SP 800-63B-4: 단일 요소 15자·MFA 병용 8자, 최소 64자 허용, 복잡도 규칙·주기 변경 금지, 차단목록 대조, 붙여넣기·관리자 허용.`,
        `해시 비용은 메모리×동시 로그인 수로 계산해 DoS 증폭기가 되지 않게 동시성과 스로틀로 제한한다.`
      ],
      pitfalls: [
        `프레임워크 기본 해시를 두고 직접 SHA-256(솔트+비밀번호)을 짠다. 솔트가 있어도 해시가 빠르면 오프라인 대입에 취약하다.`,
        `bcrypt의 72바이트 한계를 모르고 긴 문장형 비밀번호를 허용한다. 한글은 글자당 3바이트라 24자 정도에서 잘린다. 신규 시스템은 Argon2id를 쓰면 이 문제가 없다.`,
        `튜닝을 개발 노트북에서만 하고 운영 인스턴스(vCPU·메모리 제한 컨테이너)에서 재측정하지 않아 로그인 지연이나 OOM이 나온다.`,
        `파라미터를 올린 뒤 전체 사용자를 강제 재설정시킨다. 로그인 시 재해시로 충분하고 강제 재설정은 침해 증거가 있을 때만 정당하다.`
      ]
    },
    {
      title: `로그인 방어: 계정 열거·크리덴셜 스터핑·MFA·복구`,
      body: `로그인 엔드포인트는 인터넷에서 가장 많이 두드려지는 곳입니다. 공격 유형부터 구분해야 방어를 고를 수 있습니다.
- 무차별 대입(brute force): 한 계정에 많은 비밀번호를 시도합니다. 계정별 제한으로 막기 쉽습니다.
- 패스워드 스프레잉: 흔한 비밀번호 몇 개를 수많은 계정에 한 번씩 시도합니다. 계정별 제한에 걸리지 않습니다.
- 크리덴셜 스터핑: 다른 서비스에서 유출된 (이메일, 비밀번호) 쌍을 그대로 대입합니다. 계정당 시도가 1~2회라 임계값에 안 걸리고, 비밀번호가 "맞기" 때문에 비밀번호 정책으로도 못 막습니다. 원인은 재사용이기 때문입니다.

그래서 방어는 계정·IP/기기·전역 세 신호를 함께 보고, 유출 비밀번호 차단목록과 MFA로 마무리하는 다층 구조가 됩니다.

### 열거 방지: 응답, 시간, 부수효과

"존재하지 않는 계정입니다"와 "비밀번호가 틀렸습니다"를 구분해 알려 주면 공격자가 유효 계정 목록을 먼저 얻습니다. 메시지만 맞춘다고 끝이 아닙니다. 존재하지 않는 계정은 해시 검증을 건너뛰어 수 ms에 응답하고 존재하는 계정은 수백 ms가 걸리면 시간 차로 구분됩니다. 대책은 계정이 없을 때도 미리 만들어 둔 더미 해시를 검증해 CPU 시간을 맞추는 것입니다. 상태 코드·본문 길이·리다이렉트 URL·헤더도 동일해야 하고, 비밀번호 찾기·회원 가입도 같은 문제를 갖습니다. "메일을 보냈습니다(가입된 주소라면)"로 항상 같은 응답을 주고 실제 분기는 메일로 처리하며, 메일 발송은 큐에 넣어 시간 차를 지웁니다. UX 비용이 크므로 일부 서비스는 열거를 위험으로 수용하고 레이트 리밋·봇 차단에 의존합니다. 그 결정을 고객과 문서로 남기는 것이 핵심입니다.

### 스로틀과 잠금

NIST SP 800-63B-4는 한 인증자에 대한 연속 실패를 100회 이하에서 막으라고 상한을 둡니다. 이 숫자는 "100회까지 해 줘도 된다"는 목표가 아니라 넘으면 안 되는 천장입니다. 영구 잠금은 피해자 DoS 도구가 됩니다. 공격자가 임의 계정을 일부러 틀려서 잠그면 되기 때문입니다. 대안은 점진 지연(예: 3회 후 1, 2, 4초… 최대 15분 — 예시 값), 의심 시 추가 인증(MFA·이메일 확인), 이상 시 알림입니다. 카운터는 서버 여러 대가 공유하는 Redis 같은 저장소에 두어야 하고, 프록시 뒤에서는 신뢰하는 프록시가 붙인 X-Forwarded-For 값만 IP로 씁니다. 기업 NAT 뒤 사용자가 한꺼번에 막히지 않도록 IP 임계값은 계정 임계값보다 훨씬 높게 잡습니다.

### MFA와 패스키

- TOTP·푸시·SMS OTP는 가짜 사이트에 입력된 코드를 실시간으로 중계하면 통과되므로 피싱에 약합니다. SMS는 SIM 스와핑 위험까지 있어 최후 수단입니다. 푸시는 승인 폭탄(MFA 피로)을 막으려면 번호 일치 입력과 횟수 제한이 필요합니다.
- 패스키(WebAuthn/FIDO2)는 사이트(origin)별 키 쌍을 만들고 서버에는 공개키만 둡니다. 서버 유출에도 재사용할 비밀이 없고 가짜 사이트에서는 서명이 만들어지지 않아 피싱 방지입니다.
- NIST 인증 보증 수준: AAL2는 2요소이며 피싱 방지 옵션을 제공해야 하고, AAL3는 피싱 방지·키 추출 불가가 필수이며 동기화되는 패스키는 AAL3가 되지 않습니다. 개인정보위의 「개인정보의 안전성 확보조치 기준」 안내서 개정(2026-11-04 보도자료)은 인증수단 예시를 7종에서 12종(패스키·QR코드·모바일앱 포함)으로 넓혔습니다.

### 복구가 가장 약한 고리

복구 경로가 로그인보다 약하면 공격자는 복구를 노립니다. 규칙은 이렇습니다. 보안 질문 같은 지식기반 인증은 쓰지 않고, 복구 링크 토큰은 CSPRNG로 만들어 단일 사용·짧은 수명으로 하며 DB에는 해시로 저장합니다. 복구를 마치면 기존 세션을 전부 폐기하고, 복구가 일어날 때마다 기존 연락처로 알림을 보냅니다. 이메일 주소 변경 같은 민감 변경은 재인증을 요구하고 이전 주소에도 알립니다. MFA 분실용 복구 코드는 해시로 저장하고 사용 후 교체합니다.`,
      code: `import time
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError

ph = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)
DUMMY_HASH = ph.hash("never-a-real-password")  # 시작 시 한 번 계산
FAILS = {}  # (종류, 값) -> (실패 횟수, 마지막 실패 시각). 운영에서는 Redis
FREE = {"acct": 3, "ip": 20}  # 지연 없이 허용하는 실패 횟수


def retry_after(key, now):
    count, last = FAILS.get(key, (0, 0.0))
    over = count - FREE[key[0]]
    wait = 0 if over < 0 else min(2 ** over, 900)  # 1, 2, 4 ... 최대 15분(초)
    return max(0.0, last + wait - now)


def login(get_user, email, password, ip, now=None):
    now = time.time() if now is None else now
    keys = [("acct", email.lower()), ("ip", ip)]  # 없는 계정도 똑같이 센다
    if any(retry_after(k, now) > 0 for k in keys):
        return 429, "too many attempts"
    user = get_user(email)  # 없으면 None
    stored = user["pw_hash"] if user else DUMMY_HASH  # 두 경우의 CPU 시간을 맞춘다
    try:
        ph.verify(stored, password)
        ok = user is not None
    except (VerificationError, InvalidHashError):
        ok = False
    for k in keys:
        if ok and k[0] == "acct":
            FAILS.pop(k, None)  # IP 카운터는 한 번의 성공으로 지우지 않는다
        elif not ok:
            FAILS[k] = (FAILS.get(k, (0, 0.0))[0] + 1, now)
    if not ok:
        return 401, "invalid email or password"  # 어떤 경우든 같은 메시지
    return 200, "ok"`,
      codeLang: `python`,
      key: [
        `스터핑은 계정당 시도가 적어 계정별 잠금이 무력하다. 계정·IP·전역 신호, 유출 비밀번호 차단, MFA를 함께 쓴다.`,
        `열거 방지는 메시지·상태 코드·본문 크기·응답 시간·메일 발송 부수효과까지 동일하게 만드는 일이며, 계정이 없을 때도 더미 해시를 검증한다.`,
        `NIST의 연속 실패 100회는 상한이다. 영구 잠금은 DoS 무기가 되므로 점진 지연과 알림, 추가 인증을 쓴다.`,
        `패스키(WebAuthn)는 origin 바인딩으로 피싱을 막는다. SMS OTP는 최후 수단이다.`,
        `복구 토큰은 단일 사용·짧은 수명·해시 저장, 복구 후 전체 세션 폐기와 알림을 둔다.`
      ],
      pitfalls: [
        `로그인은 동일 메시지로 고치고 비밀번호 찾기·회원 가입은 그대로 둬서 열거가 남는다. 세 흐름을 모두 확인한다.`,
        `카운터를 서버 프로세스 메모리에 둬서 인스턴스가 3대면 한도가 3배가 되고 재시작하면 초기화된다.`,
        `X-Forwarded-For 첫 값을 그대로 신뢰해 공격자가 헤더를 바꿔 IP 제한을 우회한다.`,
        `복구 메일 링크 토큰이 시간 기반이거나 짧은 숫자라 추측되고, 사용 후에도 만료되지 않는다.`
      ]
    },
    {
      title: `세션과 쿠키: ID 설계·고정 공격·속성·만료·CSRF`,
      body: `서버 세션은 가장 오래된 방식이지만 브라우저 웹앱에서는 지금도 가장 설명하기 쉽고 안전하게 운영하기 쉬운 방식입니다. 구조는 단순합니다. 로그인 성공 → 서버가 CSPRNG로 세션 ID 생성 → 저장소(Redis, DB)에 사용자·생성 시각·마지막 사용 시각 저장 → ID를 쿠키로 전달 → 이후 요청마다 쿠키의 ID로 조회. ID 자체에는 의미가 없고 **추측할 수 없다는 것**이 전부입니다.

### 세션 ID 설계

- 엔트로피: NIST SP 800-63B-4 5.1절은 세션 비밀을 승인된 난수 생성기로 만들고 64비트 이상이어야 한다고 요구합니다(SHALL). 실무 기본값은 128~256비트입니다. Python의 ‹secrets.token_urlsafe(32)›는 256비트, 43자입니다. 시각·사용자 번호·‹random()›을 조합해 직접 만들지 말고 프레임워크 기본 생성기를 씁니다.
- 저장은 해시로: 세션 ID는 고엔트로피라 느린 해시가 필요 없고 SHA-256이면 충분합니다. DB 덤프·Redis 스냅샷·백업·로그가 유출돼도 곧바로 쓸 수 있는 세션이 아니게 됩니다.
- 세션 고정(session fixation): 공격자가 얻은 ID를 피해자 브라우저에 심고 피해자가 그 ID로 로그인하면 공격자도 로그인 상태가 됩니다. 방어는 권한 상태가 바뀔 때마다(로그인, MFA 완료, 권한 상승, 비밀번호 변경) 새 ID를 발급하고 옛 ID를 즉시 폐기하는 것입니다. URL에 세션 ID를 싣지 않는 것은 기본입니다.

### 쿠키 속성이 막는 것

| 속성 | 막는 것 |
| Secure | HTTP 평문 구간으로 쿠키가 전송되는 것 |
| HttpOnly | JS(XSS)가 쿠키를 읽는 것. 요청을 보내는 것은 못 막음 |
| SameSite=Lax/Strict | 다른 사이트가 유발한 요청에 쿠키가 자동 첨부되는 것(CSRF) |
| __Host- 접두 | Secure·Path=/·Domain 미지정을 강제해 서브도메인의 쿠키 덮어쓰기를 방지 |
| Max-Age | 지정하면 영속 쿠키, 없으면 브라우저 세션 쿠키 |

HttpOnly는 "XSS가 있어도 쿠키 값은 못 훔친다"일 뿐 XSS가 사용자 권한으로 요청을 보내는 것은 막지 못합니다. XSS 방어와 CSP는 별도의 과제입니다. SameSite의 "same-site"는 등록 가능 도메인 기준이라 ‹app.example.com›과 ‹evil.example.com›은 같은 사이트입니다. 서브도메인이 탈취되거나 XSS가 있으면 SameSite로 막히지 않으므로 ‹Domain=.example.com›처럼 쿠키 범위를 넓히는 설정은 피하고 ‹__Host-› 접두를 씁니다. 쿠키 사양은 RFC 6265bis가 draft-22(2025-12-01)이며 2026-11 기준 RFC Editor 최종 승인 대기로 표시됩니다. SameSite와 접두사 규칙은 브라우저가 이미 구현했습니다.

### 수명과 폐기

- 시계는 둘입니다. 유휴(idle) 만료는 마지막 사용 후 N분, 절대(absolute) 만료는 로그인 후 최대 N시간입니다. NIST AAL2 기준 전체 재인증은 24시간 이하, 비활동 타임아웃은 1시간 이하가 권고입니다(SHOULD). 예시 값으로 업무 앱은 유휴 30분·절대 12시간 정도이고 관리자·금융은 더 짧게 잡습니다. "로그인 유지"는 별도의 장기 토큰으로 구현하고 위험을 수용했다는 기록을 남깁니다.
- 로그아웃은 서버 레코드 삭제입니다. 쿠키만 지우면 탈취된 ID는 계속 유효합니다. 비밀번호 변경·복구·MFA 재설정 때는 다른 세션을 모두 폐기하고 "모든 기기에서 로그아웃"을 제공합니다.
- 슬라이딩 갱신을 요청마다 저장소에 쓰면 부하가 커집니다. 갱신은 5분마다 한 번처럼 주기를 제한합니다.
- 비밀번호 변경·결제 수단 변경 같은 고위험 작업은 step-up 재인증 후 짧은 시간만 유효하게 합니다.

### CSRF

브라우저가 쿠키를 자동 첨부하는 한 CSRF는 있습니다. 층을 쌓습니다. (1) SameSite=Lax를 기본으로. (2) 상태 변경은 POST/PUT/DELETE로만 하고 GET은 안전하게 유지(Lax는 최상위 GET 이동에는 쿠키를 보냄). (3) 동기화 토큰이나 서명된 double-submit 토큰. (4) Origin·Sec-Fetch-Site 헤더 검증. (5) JSON API라고 Content-Type 검사만 믿지 않기. Authorization 헤더 토큰은 자동 첨부가 없어 CSRF 대상이 아니지만, 대신 토큰을 어디에 저장하느냐의 XSS 문제가 생깁니다(5·7강).

운영 면에서는 세션 저장소가 곧 로그인 가용성입니다. Redis가 죽으면 모두 로그아웃되므로 영속성·복제 설정을 고객과 정하고, 동시 세션 수 제한이 필요한지도 확인합니다.`,
      code: `import hashlib
import secrets
import time

IDLE, ABSOLUTE = 30 * 60, 12 * 3600  # 유휴 30분, 절대 12시간(예시 값)
STORE = {}  # sha256(토큰) -> 레코드. 운영에서는 Redis/DB


def _key(token):
    return hashlib.sha256((token or "").encode()).hexdigest()


def create_session(user_id, now=None):
    now = time.time() if now is None else now
    token = secrets.token_urlsafe(32)  # 256비트, 의미 없는 포인터
    STORE[_key(token)] = {"uid": user_id, "created": now, "seen": now}
    return token


def cookie_header(token):
    return ("Set-Cookie: __Host-sid=" + token +
            "; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=" + str(ABSOLUTE))


def load_session(token, now=None):
    now = time.time() if now is None else now
    rec = STORE.get(_key(token))
    if rec is None:
        return None
    if now - rec["created"] > ABSOLUTE or now - rec["seen"] > IDLE:
        STORE.pop(_key(token), None)
        return None
    rec["seen"] = now
    return rec


def rotate(old_token, now=None):  # 로그인·MFA 완료·권한 상승 직후 호출
    now = time.time() if now is None else now
    rec = STORE.pop(_key(old_token), None)
    if rec is None:
        return None
    new = secrets.token_urlsafe(32)
    STORE[_key(new)] = {**rec, "seen": now}  # created는 유지해 절대 만료를 늘리지 않는다
    return new


def destroy_all(user_id):  # 비밀번호 변경·복구·"모든 기기 로그아웃"
    for k in [k for k, r in STORE.items() if r["uid"] == user_id]:
        del STORE[k]`,
      codeLang: `python`,
      key: [
        `세션 ID는 CSPRNG 128~256비트의 의미 없는 포인터이며, 서버 저장소에는 SHA-256 해시로 보관한다.`,
        `로그인·MFA 완료·권한 상승 때마다 세션 ID를 재발급해 세션 고정을 막고 옛 ID는 즉시 폐기한다.`,
        `Secure·HttpOnly·SameSite와 __Host- 접두를 기본으로 쓰고, HttpOnly가 XSS의 요청 위조를 막아 주지는 않음을 기억한다.`,
        `만료는 유휴와 절대 두 시계로 관리하고, 로그아웃은 서버 레코드 삭제로 구현한다.`,
        `CSRF는 SameSite만 믿지 말고 토큰과 Origin/Sec-Fetch-Site 검증을 겹친다.`
      ],
      pitfalls: [
        `로그아웃 버튼이 쿠키만 지운다. 탈취된 세션 ID는 만료까지 계속 통한다.`,
        `Domain=.example.com으로 쿠키를 모든 서브도메인에 공유한다. 관리 소홀한 서브도메인 하나가 세션 탈취·덮어쓰기 통로가 된다.`,
        `슬라이딩 만료를 구현하면서 절대 만료를 두지 않아 활동만 이어지면 세션이 영원히 산다.`,
        `로그인 성공 직후 세션 ID를 갈지 않고 로그인 전 익명 세션을 그대로 승격시킨다.`
      ]
    },
    {
      title: `JWT 검증과 공격: alg·키·aud·typ, 세션과의 선택, 폐기`,
      body: `JWT는 JSON 클레임 집합을 서명(JWS)하거나 암호화(JWE)한 뒤 점(.)으로 이은 문자열입니다(RFC 7519·7515). 서명 JWT는 ‹헤더.페이로드.서명›이고 앞의 둘은 base64url로 **인코딩**됐을 뿐 암호화되지 않았습니다. 누구나 읽을 수 있으므로 개인정보나 내부 권한 상세를 넣지 않습니다.

### 구조와 클레임

- 헤더: ‹alg›(서명 알고리즘), ‹kid›(키 식별자), ‹typ›(토큰 종류).
- 등록 클레임 7개(‹iss› 발급자, ‹sub› 주체, ‹aud› 대상, ‹exp› 만료, ‹nbf› 시작 시각, ‹iat› 발급 시각, ‹jti› 고유 ID)는 RFC 7519상 **모두 선택**입니다. 라이브러리가 알아서 aud를 검사해 주지 않으므로 어떤 클레임을 필수로 강제할지는 애플리케이션 책임입니다.
- 서명 방식: HS256은 대칭이라 검증할 수 있는 모든 서비스가 위조도 할 수 있습니다. RS256·ES256·EdDSA는 비대칭이라 리소스 서버는 공개키(JWKS)만 가집니다. 서비스가 여럿이거나 외부 파트너가 검증해야 하면 비대칭을 씁니다.

### 검증 절차

1. 토큰 크기와 형식을 확인합니다(수 KB 상한).
2. ‹typ›이 기대한 종류인지 확인합니다. access token JWT 프로필(RFC 9068)은 ‹at+jwt›입니다.
3. 알고리즘은 **서버가 정한 허용 목록**으로만 검증합니다. 헤더의 alg는 참고 정보일 뿐이고, 키는 kid로 신뢰하는 JWKS에서 찾으며 키마다 알고리즘을 하나로 고정합니다.
4. 서명을 검증합니다. 어떤 암호 연산이든 실패하면 토큰 전체를 거부합니다.
5. ‹exp›·‹nbf›는 시계 오차(수십 초~몇 분)만 허용하고, ‹iss›는 정확히 일치, ‹aud›에는 내 서비스 식별자가 들어 있어야 합니다. RFC 9068은 aud가 맞지 않으면 반드시 거부하라고 규정합니다.
6. 그 뒤에야 scope·역할을 인가 로직(8강)에 넘깁니다.

실패하면 401과 ‹WWW-Authenticate: Bearer error="invalid_token"›(RFC 6750)을 주되 상세 사유는 클라이언트에 알리지 않고 로그에만 남깁니다.

### 알려진 공격 (RFC 8725)

- alg=none: 서명 없는 토큰을 받아들이는 구현.
- 알고리즘 혼동: 서버가 RS256 공개키로 검증해야 하는데 토큰이 HS256이라고 주장하고, 구현이 그 공개키를 HMAC 비밀로 써 버립니다. 공개키는 공개돼 있으므로 공격자가 위조할 수 있습니다. 허용 알고리즘 고정과 키 타입 검사로 막습니다.
- 약한 HMAC 키: "secret"이나 사람이 외운 문장은 오프라인 사전 공격으로 복구됩니다. HS256 키는 32바이트 이상 무작위 값이어야 합니다.
- kid·jku·x5u 신뢰: kid를 SQL이나 파일 경로에 그대로 쓰면 인젝션·경로 탐색이 되고, jku·x5u가 가리키는 URL에서 키를 받으면 공격자 키 사용과 SSRF가 됩니다. 무시하거나 허용 목록으로 제한합니다.
- 토큰 치환·cross-JWT 혼동: 같은 발급자가 만든 ID Token이나 다른 서비스용 토큰을 우리 API에 제출합니다. aud·typ·클레임 구조를 서로 겹치지 않게 검증합니다.

### 세션과 JWT, 폐기

| 기준 | 서버 세션 | JWT access token |
| 폐기 | 즉시(레코드 삭제) | 만료까지 유효, 별도 장치 필요 |
| 검증 비용 | 저장소 조회 | 서명 검증(조회 없음) |
| 서비스 간 전파 | 저장소 공유 필요 | 공개키만 있으면 됨 |
| 브라우저 저장 | HttpOnly 쿠키 | localStorage면 XSS에 노출 |

단일 도메인 브라우저 웹앱이면 서버 세션이 더 단순하고 안전합니다. 모바일·서드파티·마이크로서비스에는 수명이 짧은 JWT가 맞습니다. JWT로 세션을 흉내 내면서 denylist를 붙이면 상태 있는 시스템을 더 복잡하게 다시 만든 것입니다. 폐기 도구는 짧은 수명(예: 5~15분), 서버에 저장하고 회전하는 refresh token, 사용자별 ‹token_version›·‹not_before› 비교, jti denylist, introspection(RFC 7662)입니다. 외주 코드 리뷰에서 "JWT 만료 7일"은 첫 번째로 의심할 값입니다.`,
      code: `import jwt  # PyJWT 2.x
from jwt import PyJWKClient

ISSUER = "https://auth.example.com"
AUDIENCE = "https://api.example.com"
ALLOWED_ALGS = ["ES256"]  # 서버가 정한다. 토큰 헤더의 alg는 믿지 않는다
JWKS = PyJWKClient(ISSUER + "/.well-known/jwks.json")  # 설정에 고정한 URL, 토큰의 jku는 무시


def verify_access_token(token):
    # 호출부에서 jwt.PyJWTError 전체를 401 invalid_token으로 변환한다
    if len(token) > 4096:
        raise jwt.InvalidTokenError("too large")
    header = jwt.get_unverified_header(token)  # 서명 검증 전: 종류 확인에만 쓴다
    if str(header.get("typ", "")).lower() not in ("at+jwt", "application/at+jwt"):
        raise jwt.InvalidTokenError("wrong typ")  # ID Token·다른 종류 토큰 차단
    key = JWKS.get_signing_key_from_jwt(token).key  # kid로 신뢰 JWKS에서 조회
    return jwt.decode(
        token,
        key,
        algorithms=ALLOWED_ALGS,
        audience=AUDIENCE,
        issuer=ISSUER,
        leeway=30,  # 시계 오차(초)
        options={"require": ["exp", "iat", "iss", "aud", "sub"]},
    )


def require_scope(claims, needed):
    if needed not in claims.get("scope", "").split():
        raise PermissionError("insufficient_scope")  # HTTP 403`,
      codeLang: `python`,
      key: [
        `JWT 페이로드는 암호화가 아니라 인코딩이다. 민감 정보를 넣지 않는다.`,
        `검증은 typ·알고리즘 허용목록·서명·exp·iss·aud 순으로 하고 필수 클레임은 앱이 강제한다. 하나라도 실패하면 전체 거부한다.`,
        `alg none, RS/HS 알고리즘 혼동, 약한 HMAC 키, kid/jku 신뢰, cross-JWT 치환이 RFC 8725의 대표 위협이다.`,
        `브라우저 웹앱은 서버 세션이 단순하고, 모바일·서비스 간 호출은 짧은 JWT와 회전형 refresh token이 맞다.`,
        `JWT는 만료 전 폐기가 어렵다. 수명을 짧게 하고 refresh 폐기나 token_version으로 보완한다.`
      ],
      pitfalls: [
        `jwt.decode에 algorithms 인자를 주지 않거나 토큰 헤더의 alg를 그대로 넘긴다.`,
        `aud 검증을 끄고(verify_aud=False) "내부 서비스라서" 넘어간다. 같은 발급자의 다른 서비스용 토큰이 통과한다.`,
        `JWT를 localStorage에 넣고 만료를 7일 이상으로 잡는다. XSS 한 번이면 일주일짜리 열쇠가 유출된다.`,
        `HS256 비밀을 소스 저장소나 .env 예시 파일에 "secret" 같은 값으로 두고 운영에도 그대로 쓴다.`
      ]
    },
    {
      title: `OAuth 2.0: Authorization Code + PKCE와 RFC 9700`,
      body: `OAuth 2.0은 비밀번호를 넘기지 않고 제한된 권한을 위임하기 위한 프레임워크입니다(RFC 6749). 역할은 넷입니다. 자원 소유자(사용자), 클라이언트(앱), 인가 서버(AS), 리소스 서버(RS). 산출물은 RS가 읽는 access token과, AS에게만 제출해 새 access token을 받는 선택적 refresh token입니다. OAuth는 "이 클라이언트가 무엇을 할 수 있는가"의 프로토콜이고 "방금 누가 로그인했는가"는 다음 강의 OIDC가 맡습니다.

### Authorization Code + PKCE 흐름

1. 클라이언트가 ‹code_verifier›(난수)와 그 해시 ‹code_challenge›, CSRF용 ‹state›를 만들어 브라우저를 AS의 ‹/authorize›로 보냅니다.
2. AS가 사용자를 인증하고 동의를 받습니다.
3. AS가 ‹redirect_uri›로 ‹code›(일회용·단명)와 ‹state›를 돌려줍니다.
4. 클라이언트는 state를 대조한 뒤 ‹/token›에 ‹code›·‹redirect_uri›·‹code_verifier›를 백엔드 채널로 POST합니다.
5. AS는 SHA-256(verifier)가 1단계의 challenge와 같은지 확인한 뒤 access token(과 refresh token)을 발급합니다.

access token을 브라우저 주소로 직접 주지 않고 code를 한 번 거치게 한 이유는, URL은 히스토리·Referer·확장 프로그램에 남기 때문입니다(implicit grant의 문제). code는 URL로 와도 token 엔드포인트에서 한 번만 교환되고, 거기에서 PKCE가 마지막 방어선이 됩니다.

### PKCE가 막는 것 (RFC 7636)

공격자가 code를 가로채거나 자기 code를 피해자 세션에 주입해도, 처음 요청에 쓴 verifier를 모르면 token 요청이 실패합니다. verifier는 요청마다 새로 만드는 43~128자 문자열이고 challenge는 ‹BASE64URL(SHA256(verifier))›(S256)입니다. 해시가 아닌 plain 방식은 verifier가 요청에 노출되어 의미가 없습니다. RFC 9700은 공개 클라이언트에 PKCE를 필수(MUST)로 하고 기밀 클라이언트에도 권고(SHOULD)하며, AS는 challenge 없이 시작된 흐름에 verifier가 들어온 토큰 요청을 거부해야 합니다(다운그레이드 방어).

### RFC 9700(BCP 240, 2025-01)의 핵심

- redirect URI는 **정확한 문자열 일치**입니다(네이티브 앱의 localhost 포트만 예외). 와일드카드·접두사 일치는 open redirect와 합쳐져 code·token 탈취로 이어졌습니다.
- implicit grant(‹response_type=token›)는 쓰지 않는 것이 원칙(SHOULD NOT)이고, 리소스 소유자 비밀번호 자격 증명 grant는 쓰면 안 됩니다(MUST NOT). RFC 6749에 있다는 것은 근거가 되지 않습니다.
- 공개 클라이언트의 refresh token은 발신자 제약이거나 회전(rotation)이어야 합니다. 회전은 쓸 때마다 새 refresh token을 주고, 이미 쓴 토큰이 다시 오면 그 계열 전체를 폐기하는 방식입니다.
- access token은 최소 권한으로 발급하고 audience를 제한하며, RS는 자신을 대상으로 하지 않은 토큰을 거부합니다.
- AS를 여럿 쓰는 클라이언트는 mix-up을 방어합니다. 응답의 ‹iss›(RFC 9207)나 ID Token의 iss를 요청 시 저장한 값과 대조합니다.
- 발신자 제약 토큰(mTLS, DPoP)이 권장됩니다. 7강에서 다룹니다.

### Bearer 전달과 오류 (RFC 6750)

토큰은 ‹Authorization: Bearer› 헤더로 보냅니다. URI 쿼리 파라미터 전달은 액세스 로그·Referer에 남아 권장되지 않습니다. 오류는 토큰 문제면 401과 ‹invalid_token›, 형식 문제면 ‹invalid_request›, 권한 부족이면 403과 ‹insufficient_scope›입니다.

### grant 선택

| 상황 | grant |
| 사용자가 로그인하는 웹·모바일·SPA | Authorization Code + PKCE |
| 사용자 없는 서버 간 호출 | Client Credentials(시크릿·mTLS·private_key_jwt) |
| TV·CLI 같은 입력 제약 기기 | Device Authorization Grant(RFC 8628) |
| 앱이 사용자 비밀번호를 직접 받기 | 쓰지 않는다 |

모바일 앱이나 SPA 소스에 client secret을 넣는 것은 공개하는 것과 같습니다. 서버의 client credentials 비밀은 시크릿 매니저에 두고 회전합니다. 외주 현장에서는 AS를 새로 구현하는 일이 드물고 Keycloak 같은 제품이나 외부 IdP를 설정하는 일이 대부분이므로, 감사 포인트는 위 목록이 그 설정(redirect URI 목록, 활성화된 grant, refresh 옵션, 토큰 수명)에 반영됐는지입니다.`,
      code: `import base64
import hashlib
import hmac
import secrets
from urllib.parse import urlencode


def b64url(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def challenge_of(verifier):  # S256: BASE64URL(SHA256(ASCII(verifier)))
    return b64url(hashlib.sha256(verifier.encode("ascii")).digest())


def start_login(client_id, redirect_uri, scope):
    verifier = b64url(secrets.token_bytes(32))  # 43자, 256비트. 서버 세션에만 보관
    state = b64url(secrets.token_bytes(16))
    query = urlencode({
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,  # AS에 등록된 값과 문자열이 그대로 같아야 한다
        "scope": scope,
        "state": state,
        "code_challenge": challenge_of(verifier),
        "code_challenge_method": "S256",
    })
    return "https://auth.example.com/authorize?" + query, verifier, state


def server_check(stored_challenge, verifier):  # 토큰 엔드포인트(AS) 쪽 검사
    return hmac.compare_digest(stored_challenge, challenge_of(verifier))


# RFC 7636 부록 B의 시험 벡터
V = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
assert challenge_of(V) == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
assert server_check(challenge_of(V), V) and not server_check(challenge_of(V), V + "x")`,
      codeLang: `python`,
      key: [
        `Authorization Code + PKCE가 사용자 로그인 계열의 기본이며, code_challenge는 verifier의 SHA-256을 base64url(패딩 없음)로 인코딩한 값이다.`,
        `RFC 9700: redirect URI 정확 일치, implicit grant 지양, password grant 금지, 공개 클라이언트 refresh token은 회전 또는 발신자 제약.`,
        `토큰은 Authorization 헤더로 보낸다. 쿼리 파라미터 전달은 로그와 Referer에 남는다.`,
        `access token은 최소 권한·audience 제한으로 발급하고 RS는 자신을 대상으로 하지 않은 토큰을 거부한다.`,
        `모바일·SPA에는 client secret을 넣지 않는다. 서버 간 호출은 client credentials로 하되 비밀을 시크릿 매니저에 둔다.`
      ],
      pitfalls: [
        `redirect URI를 https://*.example.com/* 같은 패턴으로 등록해 두어 서브도메인 하나의 open redirect가 곧 code 탈취가 된다.`,
        `PKCE challenge를 SHA-256 16진수 문자열로 만든다. 표준은 raw digest의 base64url이라 AS가 invalid_grant로 거부한다.`,
        `state를 만들어 보내기만 하고 콜백에서 대조하지 않거나, 사용자 세션과 묶지 않은 고정값을 쓴다.`,
        `refresh token을 회전 없이 몇 달 유효하게 발급하고 localStorage에 둔다.`
      ]
    },
    {
      title: `OIDC·브라우저 앱(BFF)·발신자 제약 토큰과 OAuth 2.1`,
      body: `"OAuth로 로그인"이라는 말에는 함정이 있습니다. access token은 리소스 서버가 읽는 권한 증표이지, 클라이언트에게 "방금 이 사람이 로그인했다"를 보증하는 물건이 아닙니다. OpenID Connect(OIDC)는 OAuth 2.0 위에 신원 계층을 올린 표준입니다. 인증 요청에 ‹scope=openid›를 넣으면 AS가 서명된 JWT인 **ID Token**을 함께 줍니다.

### ID Token과 access token은 수신자가 다르다

| | ID Token | access token |
| 수신자(aud) | 클라이언트(client_id) | 리소스 서버 |
| 용도 | 로그인 사실·사용자 식별 | API 호출 권한 |
| API에 보내도 되나 | 안 된다 | 그것이 용도 |

ID Token의 핵심 클레임은 ‹iss›·‹sub›·‹aud›·‹exp›·‹iat›이고, 인증 요청에 ‹nonce›를 보냈다면 같은 값이 돌아옵니다. 클라이언트는 서명, iss 일치, aud에 내 client_id 포함(여러 개면 ‹azp›도 확인), exp, nonce 일치를 검사합니다. nonce는 ID Token을 재생하거나 다른 세션에 주입하는 공격을 막습니다. 추가 사용자 정보는 UserInfo 엔드포인트에서 받고, 설정과 키는 ‹/.well-known/openid-configuration›(discovery)과 JWKS로 찾습니다. "API가 ID Token을 받아 검증"하게 만든 코드는 흔한데, 이것이 5강에서 본 cross-JWT 혼동의 입구입니다.

### 계정 연결의 키는 (iss, sub)다

소셜 로그인에서 가장 흔한 사고는 이메일 클레임으로 기존 계정에 자동 연결하는 것입니다. 이메일은 IdP마다 검증 수준이 다르고, 사용자가 바꿀 수 있거나 도메인이 재사용될 수 있습니다. 공격자가 피해자 이메일을 단 IdP 계정을 만들면 피해자 계정으로 로그인됩니다. 규칙은 이렇습니다. 외부 신원의 키는 ‹(iss, sub)›이고, 기존 로컬 계정과의 연결은 그 로컬 계정으로 로그인(재인증)한 상태에서만 하며, ‹email_verified›는 필요조건일 뿐 충분조건이 아닙니다.

### 브라우저 앱은 토큰을 어디에 두나 (RFC 10017, BCP 212, 2026-08)

SPA의 JS가 토큰을 들고 있으면 XSS 한 번으로 탈취됩니다. localStorage는 물론이고 메모리나 Web Worker에 둬도 XSS는 정상 흐름을 호출해 새 토큰을 받을 수 있습니다. RFC 10017은 Authorization Code + PKCE를 기준선으로 하고 세 구조를 보안 순으로 제시합니다.
1. BFF(Backend for Frontend): 서버 컴포넌트가 OAuth 클라이언트가 되어 토큰을 보관하고, 브라우저는 쿠키 세션만 가집니다. RFC 10017은 이 쿠키에 ‹Secure›·‹HttpOnly›를 MUST로, ‹SameSite=Strict›·‹Path=/›·Domain 미지정·‹__Host-Http-› 접두를 SHOULD로 두며(접두 지원은 대상 브라우저에서 확인), 브라우저→BFF 요청에는 CSRF 방어가 필요하다고 합니다. BFF가 API를 부를 때 토큰을 붙입니다.
2. token-mediating backend: 서버가 토큰 획득을 돕지만 access token은 브라우저로 전달됩니다.
3. 순수 브라우저 OAuth 클라이언트: 가장 약합니다.

민감 데이터·개인정보를 다루는 앱에는 BFF가 권장됩니다. 대가는 서버 컴포넌트 운영, 세션 저장소, 쿠키·CSRF 설계(4강 내용을 그대로 씁니다)입니다.

### 발신자 제약 토큰

- DPoP(RFC 9449): 클라이언트가 키 쌍을 만들고 요청마다 DPoP proof(JWT: ‹htm›·‹htu›·‹iat›·‹jti›, 필요 시 ‹ath›·‹nonce›)를 서명해 보냅니다. access token은 키 지문에 묶이므로 토큰만 훔쳐서는 쓸 수 없고, 서버가 준 nonce로 proof의 수명을 제한할 수 있습니다. 한계는 XSS가 키로 서명을 요청하는 것까지 막지는 못한다는 점입니다. 추출 불가능한 WebCrypto 키로 완화하지만 완전하지 않습니다.
- mTLS(RFC 8705): 토큰을 클라이언트 인증서에 묶습니다. B2B·금융 API에서 씁니다.

### 표준 현황과 계약 문구 (2026-11 기준)

OAuth 2.1은 draft-ietf-oauth-v2-1-17(2026-10-31, Active I-D, 2027-05-04 만료)이며 아직 RFC가 아닙니다. PKCE 필수, implicit·password grant 제거, redirect URI 엄격 일치를 통합하는 방향이므로 RFC 9700을 지키면 사실상 같은 곳에 도달합니다. 확정되지 않은 문서를 계약에 적을 수는 없으니 "OAuth 2.1 준수" 대신 "RFC 9700 및 RFC 10017 준수"로 쓰는 것이 안전합니다.`,
      code: `import time


def check_id_token_claims(c, *, issuer, client_id, nonce, now=None, leeway=60):
    """서명 검증(JWKS·허용 알고리즘)은 이미 끝났다고 가정하고 클레임만 검사한다."""
    now = time.time() if now is None else now
    aud = c.get("aud")
    auds = [aud] if isinstance(aud, str) else list(aud or [])
    if c.get("iss") != issuer:
        raise ValueError("iss mismatch")
    if client_id not in auds:
        raise ValueError("aud must contain our client_id")
    if len(auds) > 1 and c.get("azp") != client_id:
        raise ValueError("azp required for multiple audiences")
    if not isinstance(c.get("exp"), (int, float)) or c["exp"] + leeway < now:
        raise ValueError("expired")
    if not nonce or c.get("nonce") != nonce:
        raise ValueError("nonce mismatch")
    if not c.get("sub"):
        raise ValueError("sub missing")
    return (c["iss"], c["sub"])  # 외부 신원의 키. email은 키가 아니다


claims = {"iss": "https://idp.example", "aud": "app1", "sub": "u-123",
          "exp": 2000000000, "nonce": "n1"}
ident = check_id_token_claims(claims, issuer="https://idp.example",
                              client_id="app1", nonce="n1", now=1999999999)
assert ident == ("https://idp.example", "u-123")`,
      codeLang: `python`,
      key: [
        `OIDC는 OAuth 위의 신원 계층이다. ID Token은 클라이언트가, access token은 리소스 서버가 소비하며 서로 대신 쓰지 않는다.`,
        `ID Token 검증: 서명, iss, aud(client_id), azp, exp, nonce. 외부 신원은 이메일이 아니라 (iss, sub)로 식별한다.`,
        `SPA 토큰은 XSS에 노출되므로 RFC 10017의 우선순위(BFF, token-mediating backend, 순수 브라우저)에 따라 민감 앱은 BFF로 간다.`,
        `DPoP·mTLS는 토큰을 키·인증서에 묶어 탈취된 토큰의 재사용을 막는다. XSS의 키 사용까지 막지는 못한다.`,
        `OAuth 2.1은 2026-11 기준 draft-17이다. 계약에는 RFC 9700과 RFC 10017 준수로 적는다.`
      ],
      pitfalls: [
        `소셜 로그인 이메일이 같으면 기존 계정에 자동 병합한다. IdP 쪽 이메일 검증 수준이 다르면 계정 탈취가 된다.`,
        `API가 ID Token을 Authorization 헤더로 받아 검증하게 만든다. 용도 혼동이며 audience가 맞지도 않는다.`,
        `SPA에서 "메모리에만 두니 안전하다"며 BFF를 건너뛴다. XSS는 메모리의 토큰을 읽고 흐름을 다시 호출할 수도 있다.`,
        `nonce를 보내지 않거나 보내고도 ID Token에서 대조하지 않는다.`
      ]
    },
    {
      title: `접근통제 설계: RBAC·ABAC·멀티테넌시와 BOLA·BFLA·BOPLA`,
      body: `접근통제(A01)는 OWASP Top 10:2025에서 1위이고, CWE Top 25(2025)에서는 CWE-862가 4위, CWE-863이 17위, CWE-639가 24위로 인가 계열이 세 자리를 차지했습니다(2026-11 열람). 인증은 라이브러리가 대신해 주지만 인가는 비즈니스 규칙이라 라이브러리가 대신 해 줄 수 없습니다. 코드의 모든 데이터 접근 지점에서 개발자가 결정해야 하므로 가장 자주 빠뜨립니다.

### 세 가지 수준 (API Top 10:2023)

- BOLA(API1, 객체 수준): ‹GET /orders/123›에서 123이 내 주문인지 확인하지 않습니다.
- BFLA(API5, 기능 수준): 일반 사용자가 ‹POST /admin/users›나 삭제 같은 기능 자체를 호출할 수 있습니다. 화면에서 버튼을 숨기는 것은 인가가 아닙니다.
- BOPLA(API3, 속성 수준): 내 객체이지만 읽거나 바꿀 수 없는 속성(‹role›·‹is_admin›·‹price›·내부 메모)을 응답에 보내거나 요청으로 수정할 수 있습니다(과다 노출·대량 할당).

"ID가 UUID라서 안전하다"는 틀린 말입니다. 추측하기 어렵다는 것은 인가가 아닙니다. URL이 로그·메일·Referer·공유 링크로 새면 끝입니다.

### 인가 모델

- RBAC: 사용자 → 역할 → 권한. 단순하고 감사하기 쉽지만 역할이 폭발할 수 있습니다.
- ABAC: 주체·객체·환경 속성(부서, 소유자, 데이터 등급, 시간)으로 규칙을 평가합니다. 유연한 대신 규칙의 테스트와 디버깅이 어렵습니다.
- ReBAC: "문서 → 폴더 → 팀" 같은 관계 그래프로 판단합니다. 공유와 계층 권한에 맞습니다.

대부분의 B2B 외주 API는 RBAC + 소유권(ABAC에서 가장 흔한 속성) + 테넌트 격리 조합이면 충분하고, 그것을 매트릭스로 명확히 적는 것이 복잡한 엔진보다 가치가 큽니다.

### 멀티테넌시: 모든 쿼리에 테넌트가 붙어야 한다

‹tenant_id› 조건을 쿼리마다 손으로 붙이면 언젠가 하나를 빠뜨립니다. 구조로 막습니다. (1) 저장소 계층이 principal을 받아 항상 테넌트 범위로 제한된 쿼리만 만들게 합니다. (2) DB에서 행 수준 보안(PostgreSQL RLS 등)을 심층방어로 걸어, 앱 버그가 있어도 다른 테넌트 행이 반환되지 않게 합니다. 타 테넌트 객체에는 403보다 404를 주어 존재 여부를 숨깁니다.

### 구조적 원칙

- 기본 거부(default deny): 인가 규칙이 없는 새 엔드포인트는 접근 불가여야 합니다. 검사를 빠뜨리면 열리는 구조가 아니라 빠뜨리면 막히는 구조로 만듭니다.
- 중앙화: 정책 함수·데코레이터·미들웨어에 모읍니다. 컨트롤러마다 if문을 복사하지 않습니다.
- 서버가 권위: 클라이언트가 보낸 role·user_id·tenant_id·price를 신뢰하지 않습니다. 토큰의 역할 클레임은 발급 시점의 스냅샷이므로 민감 작업은 서버의 현재 값으로 확인합니다.
- scope와 사용자 권한: OAuth scope는 클라이언트가 사용자 대신 할 수 있는 범위의 상한이고 사용자 권한은 별개입니다. 실제 허용은 둘의 교집합입니다.
- 서비스 간 호출: 내부 서비스가 서비스 계정으로 모든 데이터를 읽으면 사용자 권한이 우회됩니다(confused deputy). 최종 사용자 신원을 전달하거나 호출받는 쪽에서 인가해야 합니다.
- 관리자·고위험 기능: 별도 권한, step-up MFA, 감사 로그를 둡니다. 개인정보위의 고객센터 점검(2026-10-29 보도자료)에서는 이름이나 전화번호 한 가지만 입력해도 상세주소 등이 조회되는 사례가 확인됐습니다.

### 권한 매트릭스를 테스트로 만든다

역할 × 엔드포인트 × 소유권(내 것/남의 것/타 테넌트)을 표로 만들고 각 행을 자동 테스트로 실행합니다. 라우트 목록을 열거해 매트릭스에 없는 라우트가 있으면 CI를 실패시키면, 새 엔드포인트를 만드는 사람이 권한 정책을 결정하도록 강제됩니다. 이 표는 고객에게 납품하는 문서이자 회귀 테스트입니다.`,
      code: `def can(p, action, res):
    """p: 호출자, res: 대상 객체. 규칙이 없는 동작은 거부(default deny)."""
    if res["tenant_id"] != p["tenant_id"]:
        return False  # 테넌트 격리가 모든 규칙보다 먼저
    is_admin = p["role"] == "admin"
    is_owner = res["owner_id"] == p["id"]
    if action == "read":
        return is_admin or is_owner
    if action == "update":
        return is_admin or (is_owner and res["status"] == "draft")
    if action == "delete":
        return is_admin
    return False


MATRIX = [
    # 역할,    같은테넌트, 소유자, 상태,    동작,     기대
    ("member", True, True, "draft", "read", True),
    ("member", True, False, "draft", "read", False),
    ("member", False, True, "draft", "read", False),
    ("member", True, True, "draft", "update", True),
    ("member", True, True, "sent", "update", False),
    ("admin", True, False, "sent", "update", True),
    ("admin", False, False, "draft", "read", False),
    ("member", True, True, "draft", "delete", False),
    ("admin", True, False, "draft", "delete", True),
    ("admin", True, True, "draft", "export", False),
]

for role, same, owner, status, action, want in MATRIX:
    p = {"id": 1, "tenant_id": 1, "role": role}
    res = {"tenant_id": 1 if same else 2, "owner_id": 1 if owner else 9, "status": status}
    assert can(p, action, res) is want, (role, same, owner, status, action)
print("matrix ok:", len(MATRIX))`,
      codeLang: `python`,
      key: [
        `BOLA는 객체, BFLA는 기능, BOPLA는 속성 단위의 인가 실패다. UUID나 숨긴 버튼은 인가가 아니다.`,
        `기본 거부와 중앙화된 정책, 저장소 계층의 테넌트 범위 강제, DB 행 수준 보안으로 빠뜨릴 수 없는 구조를 만든다.`,
        `클라이언트가 보낸 role·tenant_id·price는 신뢰하지 않고 서버의 현재 값으로 판단한다.`,
        `OAuth scope는 클라이언트 권한의 상한이고 실제 허용은 scope와 사용자 권한의 교집합이다.`,
        `역할×엔드포인트×소유권 매트릭스를 테스트로 만들고, 매트릭스에 없는 라우트는 CI에서 실패시킨다.`
      ],
      pitfalls: [
        `GET은 검사하는데 PUT·DELETE·하위 경로(‹/orders/1/items/5›)에서는 상위 객체의 소유권만 보고 하위 객체의 소속을 검사하지 않는다.`,
        `목록 API에서 필터를 클라이언트 파라미터(‹?owner=me›)에 맡긴다. 서버가 항상 호출자 범위로 제한해야 한다.`,
        `관리자 여부를 JWT의 role 클레임에만 의존해, 권한을 회수한 뒤에도 만료 전까지 관리자 권한이 남는다.`,
        `업데이트 API가 요청 본문을 모델에 통째로 병합해 role·tenant_id 같은 필드를 사용자가 바꿀 수 있다.`
      ]
    },
    {
      title: `API 보안: Top 10:2023 전 항목, SSRF, 한도, 오류 표준, 웹훅 서명`,
      body: `OWASP API Security Top 10:2023은 API 외주의 점검 목록으로 바로 쓰입니다(2026-11 열람 기준 최신판). API1·2·5는 앞 강의에서 다뤘으니 나머지를 구현 관점에서 봅니다.

| 번호 | 이름 | 한 줄 대책 |
| API1 | Broken Object Level Authorization | 모든 객체 접근에 소유권 검사 |
| API2 | Broken Authentication | 1~7강 |
| API3 | Broken Object Property Level Authorization | 요청·응답 속성 허용목록 |
| API4 | Unrestricted Resource Consumption | 빈도·크기·비용 상한 |
| API5 | Broken Function Level Authorization | 기능별 권한 검사 |
| API6 | Unrestricted Access to Sensitive Business Flows | 흐름 단위 남용 방어 |
| API7 | Server Side Request Forgery | URL 허용목록·내부망 차단(2025판은 A01에 매핑) |
| API8 | Security Misconfiguration | CORS·디버그·헤더·TLS |
| API9 | Improper Inventory Management | API 목록·폐기 관리 |
| API10 | Unsafe Consumption of APIs | 외부 API 응답 불신 |

### API3: 속성 허용목록

2019판의 과다 노출과 대량 할당을 통합한 항목입니다. 응답은 DB 모델을 그대로 직렬화하지 말고 응답 스키마(DTO)에 필드를 명시합니다. 요청은 본문 전체를 모델 생성자에 펼쳐 넣는 패턴을 금지하고 수정 가능한 필드를 허용목록으로 둡니다. OpenAPI의 ‹additionalProperties: false›로 알 수 없는 필드를 거부하고 DTO와 맞춥니다.

### API4와 API6: 자원과 비즈니스 흐름

- 한도: 요청 빈도(토큰 버킷, 사용자·키·IP별), 페이지·본문·업로드 크기(예: limit 100 이하), 대량 내보내기 같은 고비용 연산의 큐와 쿼터. 건당 비용이 드는 SMS·메일·LLM 호출 엔드포인트는 남용이 곧 금전 피해입니다(CWE-770).
- API6: 쿠폰 선점·한정 수량·예약 슬롯 사재기는 요청 하나하나가 정상이라 요청 단위 탐지에 안 걸립니다. 계정·기기·결제수단 단위 흐름 한도와 이상 패턴 모니터링, 필요 시 추가 인증을 둡니다.

### API7: SSRF

서버가 사용자 입력 URL을 가져오는 기능(웹훅 등록, 이미지 가져오기, 링크 미리보기)은 서버를 내부망 프록시로 바꿉니다. 클라우드 메타데이터 주소(169.254.169.254)로 자격 증명이 새는 것이 대표 사고입니다. 방어는 층으로 합니다. https 스킴 허용목록 → 가능하면 호스트 허용목록 → DNS를 해석한 뒤 사설·루프백·링크 로컬 주소 차단 → 검증한 IP로 직접 연결(DNS rebinding 대비) → 리다이렉트 비활성 또는 매번 재검증 → 응답 크기·시간 상한 → 네트워크 수준 egress 제한과 IMDSv2. ‹localhost› 문자열 블랙리스트는 10진·16진 표기, IPv6, 내부 IP로 해석되는 도메인으로 우회됩니다.

### API8~10

- API8: Origin을 반사하면서 ‹Allow-Credentials: true›를 주는 CORS, 노출된 디버그·actuator·Swagger UI, 스택트레이스, 기본 계정.
- API9: 인증 없이 살아 있는 구버전 ‹/v1›, 운영 데이터를 가진 스테이징, 문서에 없는 그림자 API. OpenAPI를 단일 진실로 삼고 게이트웨이는 문서화된 라우트만 통과시킵니다.
- API10: 파트너·외부 API 응답도 신뢰하지 않는 입력이므로 스키마 검증, 타임아웃, 크기·리다이렉트 제한을 두고 값을 그대로 쿼리나 HTML에 넣지 않습니다.

### 오류 응답, 웹훅 서명, 신고 창구

- RFC 9457 Problem Details: ‹application/problem+json›에 ‹type›·‹title›·‹status›·‹detail›·‹instance›를 담아 모든 오류를 같은 모양으로 줍니다. ‹detail›에는 스택트레이스·SQL·내부 호스트명을 넣지 않습니다.
- 웹훅·서버 간 요청 서명: 공유 비밀 HMAC으로 (타임스탬프 + 본문)을 서명하고, 수신 측은 상수 시간 비교, 타임스탬프 허용 오차(예: 5분), 이벤트 ID 중복 제거로 재생을 막습니다. 표준 방식은 RFC 9421 HTTP Message Signatures로, 서명 대상 구성요소를 ‹Signature-Input›으로 밝히고 ‹Signature› 헤더로 전달합니다.
- RFC 9116 security.txt: ‹/.well-known/security.txt›에 필수 필드 ‹Contact›·‹Expires›를 두고 만료 전에 갱신합니다.
- 내부용 경로라고 인증·인가를 생략하지 않습니다(개인정보위 2026-10-29 보도자료: 관계사 웹서버의 회원 DB 직접 접근이 유출 경로가 됨). 인증 실패·대량 조회·인가 거부의 급증은 알림 규칙으로 만들고, 접속기록 요건은 PRV-201에서 다룹니다.`,
      code: `import ipaddress
import socket
from urllib.parse import urlsplit


def resolve_public(url, allow_hosts=None):
    """사용자가 준 URL을 검증하고 연결에 쓸 (호스트, 포트, IP 목록)을 돌려준다."""
    parts = urlsplit(url)
    if parts.scheme != "https" or not parts.hostname:
        raise ValueError("only https URLs with a host")
    if parts.username or parts.password:
        raise ValueError("userinfo not allowed")
    host = parts.hostname.lower()
    if allow_hosts is not None and host not in allow_hosts:
        raise ValueError("host not allowed")
    port = parts.port or 443
    ips = []
    for _, _, _, _, sockaddr in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM):
        ip = ipaddress.ip_address(sockaddr[0])  # 해석 불가한 값은 예외 = 거부
        if ip.version == 6 and ip.ipv4_mapped:
            ip = ip.ipv4_mapped  # ::ffff:127.0.0.1 같은 우회 차단
        if not ip.is_global or ip.is_multicast:
            raise ValueError("non-public address: " + str(ip))
        ips.append(str(ip))
    # 호출부: 이 IP로 직접 연결(검증과 사용 사이의 DNS 재조회 금지),
    # 리다이렉트는 따라가지 않거나 매번 이 함수로 재검증, 응답 크기·시간 상한
    return host, port, ips`,
      codeLang: `python`,
      key: [
        `API Top 10:2023의 10개 항목을 점검표로 외우고, 각 항목에 대응하는 코드·설정 증거(DTO, 한도, 허용목록)를 보고서에 적는다.`,
        `요청·응답 속성은 허용목록(DTO)으로, 한도는 빈도·페이지·본문·비용 모든 축에서 둔다. 비즈니스 흐름 남용은 흐름 단위로 막는다.`,
        `SSRF는 스킴·호스트 허용목록 + DNS 해석 후 IP 검사 + 검증한 IP로 연결 + 리다이렉트 제한 + egress 제한을 겹친다.`,
        `오류는 RFC 9457 형식으로 통일하고 내부 정보를 노출하지 않는다. 웹훅은 타임스탬프 포함 HMAC과 재생 방지로 서명한다.`,
        `OpenAPI를 API 인벤토리의 단일 진실로 삼고 게이트웨이는 문서화된 라우트만 연다.`
      ],
      pitfalls: [
        `URL 검증은 통과시키고 실제 요청 라이브러리가 다시 DNS를 조회하게 둔다. 그 사이 응답이 내부 IP로 바뀌면(DNS rebinding) 검사가 무의미하다.`,
        `‹Access-Control-Allow-Origin›에 요청 Origin을 반사하고 자격 증명을 허용해 어느 사이트든 로그인 상태로 API를 읽는다.`,
        `속도 제한을 API 게이트웨이 전체 IP 단위로만 걸어 한 사용자가 정상 한도 안에서 고비용 내보내기를 수백 번 실행한다.`,
        `웹훅 서명을 단순 문자열 비교(==)로 검증하고 타임스탬프를 확인하지 않아 타이밍 공격과 재생에 열려 있다.`
      ]
    },
    {
      title: `통합 사례: 외주 B2B 포털의 인증·인가 감사와 무중단 개선`,
      body: `이 강의는 실제로 자주 만나는 상황을 가정한 시나리오(가상)입니다. 물류 중견기업이 B2B 주문 포털의 모바일 앱·웹·파트너 API를 확장하려는 참에, 파트너사의 보안 점검에 대비해 로그인과 API를 점검·개선해 달라고 요청합니다. 조건은 서비스를 멈출 수 없고 일정은 6주입니다. 코드는 선행 개발사가 만든 것입니다. 점검(스테이징에서, 서면으로 승인받은 범위 안에서) 결과 다음이 나옵니다.

- 비밀번호 해시가 솔트 없는 MD5입니다.
- JWT는 HS256, 비밀은 소스에 고정된 짧은 문자열, 만료 30일, aud 검증 없음, 토큰은 localStorage에 있습니다.
- ‹GET /api/orders/{id}›가 소유권을 검사하지 않고 ID가 순차 정수입니다(BOLA).
- ‹PATCH /api/users/me›가 요청 본문을 모델에 그대로 병합해 ‹role›을 바꿀 수 있습니다(BOPLA).
- 구버전 ‹/api/v1›이 인증 없이 응답합니다(API9).
- 로그인 오류 메시지가 계정 존재 여부를 알려 주고 레이트 리밋이 없습니다.
- 비밀번호 재설정 토큰이 사용자 ID와 시각의 해시이고 만료가 없습니다.
- CORS가 Origin을 반사하며 자격 증명을 허용합니다.
- 파트너 웹훅에 서명이 없고, 콜백 URL 등록 기능이 서버에서 그 URL을 가져옵니다(SSRF).

### 우선순위: 악용 쉬움 × 영향 × 노출

직접 데이터 유출 통로를 먼저 닫습니다. **P0(첫 주)**: BOLA, 대량 할당, 인증 없는 v1 차단, JWT 비밀 교체와 aud·exp 강제, 재설정 토큰 교체. **P1(2~3주)**: 로그인 방어(스로틀·동일 응답), CORS 허용 Origin 목록, SSRF 가드, 비밀번호 해시 이전. **P2(4~6주)**: 토큰·세션 구조 개편(회전형 refresh, SPA에 BFF 도입 여부), 권한 매트릭스 CI, 웹훅 서명, 로그·알림. 순서의 근거는 "공격자가 오늘 밤 쓸 수 있는 것부터"입니다.

### 무중단 이전의 어려운 지점

- 해시: 로그인을 기다리지 않고 저장된 MD5 값을 Argon2id로 한 번 감싸 저장하는 일괄 배치(1단계)로 DB 유출 위험을 즉시 낮추고, 로그인에 성공하는 순간 평문으로 순수 Argon2id로 교체(2단계)합니다. 사용자는 비밀번호 변경을 요구받지 않습니다.
- JWT: 비밀이 소스에 있었으므로 기존 토큰 전체가 위조 가능하다고 봐야 합니다. 새 비대칭 키로 발급을 바꾸고 kid를 도입하며, 서버 측 컷오프(발급 시각이 배포 시점 이전인 토큰은 거부)로 모든 사용자를 재로그인시킵니다. 이는 가용성과 보안의 교환이므로 시각과 공지를 고객이 승인해야 합니다. 가장 어려운 설득이지만 키가 유출된 상태로 두는 쪽이 더 큰 위험입니다.
- 클라이언트 호환: aud를 강제하면 aud가 없는 토큰을 쓰던 구버전 모바일 앱이 깨집니다. 기능 플래그와 카나리 배포로 새 거부 사유를 로그로 관찰하고 앱 강제 업데이트 일정과 맞춥니다.
- 회귀 방지: 권한 매트릭스 테스트와 JWT 음성 테스트를 CI에 넣고, 해시 파라미터와 토큰 수명의 근거(NIST, RFC 9700, OWASP 조항)를 설계서에 적어 인수인계합니다.

### 납품물과 경계

점검 보고서(발견 사항별 재현 방법·원인·수정·재검증 증거·심각도·ASVS 장 매핑), 인증·세션·토큰 설계서, 권한 매트릭스, 키 회전·침해 대응 런북(전체 로그아웃 절차 포함), 테스트 스위트, 고객이 수용한 위험의 결정 기록입니다. "취약점 0"이나 "인증 심사 통과"를 약속하지 않고 증거와 잔여 위험을 보여 줍니다. 점검은 고객 소유 환경에서 서면 합의된 범위로만 하고, 발견 내용은 고객에게만 보고합니다. 6주를 설계 20%·구현 40%·테스트와 문서 25%·예비 15% 정도로 나누는 것은 예시이며 범위가 확정된 뒤 재견적합니다.`,
      code: `import hashlib
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError

ph = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)
WRAP = "wrapped:"


def wrap_legacy(md5_hex):
    """1단계(일괄 배치): DB의 MD5 값을 Argon2id로 한 겹 감싸 저장한다."""
    return WRAP + ph.hash(md5_hex)


def verify_user(user, password):
    """성공하면 True. 필요하면 user["pw_hash"]를 최신 형식으로 교체한다."""
    stored = user["pw_hash"]
    try:
        if stored.startswith(WRAP):
            # 이전 시스템 형식(MD5 16진수)을 재현해 감싼 해시를 검증
            md5_hex = hashlib.md5(password.encode("utf-8"), usedforsecurity=False).hexdigest()
            ph.verify(stored[len(WRAP):], md5_hex)
            user["pw_hash"] = ph.hash(password)  # 2단계: 평문이 있는 지금 순수 Argon2id로
            return True
        if stored.startswith("$argon2"):
            ph.verify(stored, password)
            if ph.check_needs_rehash(stored):
                user["pw_hash"] = ph.hash(password)
            return True
    except (VerificationError, InvalidHashError):
        return False
    return False`,
      codeLang: `python`,
      key: [
        `감사 결과는 악용 용이성·영향·노출로 우선순위를 매긴다. 직접 데이터 유출 통로와 키 유출을 첫 주에 닫는다.`,
        `해시 이전은 일괄 감싸기로 위험을 즉시 줄이고 로그인 시 순수 Argon2id로 교체하는 두 단계로 사용자 불편 없이 한다.`,
        `서명 키가 유출됐다면 기존 토큰 전체를 무효로 보고 새 키와 서버 측 컷오프로 재로그인시킨다. 시각과 공지는 고객이 승인한다.`,
        `보안 개선은 클라이언트 호환(구버전 앱)을 깨기 쉽다. 기능 플래그·카나리·로그 관찰과 앱 업데이트 일정이 필요하다.`,
        `납품물은 재현 가능한 증거, 설계 근거(조항 번호), 자동 테스트, 운영 런북, 위험 수용 기록이며 보장 문구는 쓰지 않는다.`
      ],
      pitfalls: [
        `기술적으로 옳은 순서만 고집해 고객 운영 일정(월말 정산, 프로모션)과 충돌하는 시각에 전체 로그아웃을 배포한다.`,
        `점검 중 발견한 취약점을 운영 환경에서 실제 데이터로 재현한다. 범위 밖 행위이며 개인정보 사고가 된다.`,
        `수정만 하고 회귀 테스트를 남기지 않아 다음 개발사가 같은 구멍을 다시 만든다.`
      ]
    }
  ],
  labs: [
    {
      title: `Lab 1. 비밀번호 파라미터 벤치마크와 열거 방지 로그인 하니스`,
      scenario: `가상의 고객사 "사내 주문 포털"의 로그인 API를 새로 만든다. 고객은 "로그인이 느리면 안 되고, DB가 유출돼도 버텨야 한다"고 요구한다. 어떤 해시 파라미터를 왜 골랐는지 본인 머신의 측정값으로 설명할 수 있어야 하고, 계정 열거와 스터핑 방어가 실제로 동작함을 수치로 보여 줘야 한다. 모든 실험은 로컬에서 합성 계정(예: user0001@test.local)만 대상으로 한다.`,
      steps: [
        `Python 3.11 이상 가상환경을 만들고 argon2-cffi를 설치한다. 합성 사용자 1,000명(이메일·임의 비밀번호)을 만드는 스크립트를 작성한다.`,
        `Argon2id 파라미터 3종(m=19 MiB·t=2·p=1, m=46 MiB·t=1·p=1, m=12 MiB·t=3·p=1)을 각각 30회 해시해 중앙값과 p95 시간을 기록하고, 작업 관리자나 psutil로 최대 메모리 사용량을 관찰해 표로 정리한다.`,
        `목표 지연(예: 해시 한 번 200~500ms)을 정하고 파라미터를 하나 선택해 근거를 한 문단으로 쓴다. 운영 서버의 vCPU와 메모리가 개발 머신보다 작을 경우를 가정해 재측정 계획도 적는다.`,
        `동시 로그인 50건을 스레드 풀로 실행해 전체 소요 시간과 최대 메모리를 측정하고, 동시 해시 수를 제한하는 세마포어(예: 4)를 넣은 뒤 다시 측정해 비교한다.`,
        `3강 코드를 바탕으로 로그인 함수를 구현한다. 더미 해시, 계정 단위·IP 단위 점진 지연, 모든 실패에 같은 메시지와 같은 상태 코드를 쓴다.`,
        `존재하는 계정과 없는 계정에 각각 200회 로그인 요청(틀린 비밀번호)을 보내 응답 시간 중앙값을 비교한다. 더미 해시를 빼면 차이가 얼마나 나는지도 같이 측정해 기록한다.`,
        `스터핑 시뮬레이션: 한 IP에서 합성 계정 1,000개에 각각 1회씩 틀린 비밀번호로 시도해 IP 임계에서 429가 나오는지, 한 계정에 연속 실패 시 지연이 늘어나는지 확인한다. 중간에 정상 로그인을 하나 성공시켜도 IP 카운터가 유지되는지 확인한다.`,
        `NIST SP 800-63B-4 정책 함수를 구현하고 테스트 15개 이상을 작성한다. 14자와 15자 경계, MFA 병용 시 8자, 64자 이상 긴 문장, 한글과 이모지, 공백, 차단목록, 이메일 아이디 포함을 포함한다.`
      ],
      accept: [
        `README에 파라미터 3종의 중앙값·p95·최대 메모리 표와, 선택한 값과 목표 지연을 연결한 근거 문단이 있다.`,
        `존재 계정과 없는 계정의 응답 시간 중앙값 차이가 존재 계정 중앙값의 10% 이내이고, 더미 해시를 뺐을 때의 차이(측정값)가 비교용으로 함께 기록돼 있다.`,
        `스터핑 시뮬레이션에서 IP 임계 초과 후 429가 반환되고, 정상 로그인 성공 뒤에도 IP 카운터가 초기화되지 않으며, 계정 단위 지연이 연속 실패 횟수에 따라 증가한다.`,
        `정책 테스트 15개 이상이 통과하고 복잡도(대소문자·특수문자) 규칙이 코드에 없으며 15자 경계와 MFA 8자 경계가 모두 검증된다.`
      ],
      stretch: `구 시스템의 솔트 없는 MD5 해시 1,000건을 담은 CSV를 만들고, 10강 방식의 두 단계 이전(일괄 감싸기 → 로그인 시 순수 Argon2id로 교체)을 구현해 로그인 성공 후 저장 해시가 교체되는 것과 잘못된 비밀번호에서는 교체되지 않는 것을 테스트로 증명한다. 일괄 배치 1,000건의 소요 시간으로 40만 건 이전 시간을 추정해 보고서에 적는다.`
    },
    {
      title: `Lab 2. JWT·PKCE 음성 테스트 스위트와 RFC 9700 점검표`,
      scenario: `외주로 만드는 리소스 서버(API)가 파트너 인가 서버가 발급한 JWT access token을 검증해야 한다. 검증 코드가 올바른지는 "정상 토큰이 통과한다"가 아니라 "잘못된 토큰이 전부 거부된다"로 증명해야 한다. 고객 보안팀이 요구할 법한 증거를 만든다는 마음으로, 로컬에서 테스트용 키로 발급한 토큰만 사용해 음성 테스트 스위트와 RFC 9700 pass/fail 점검표를 작성한다.`,
      steps: [
        `PyJWT와 cryptography를 설치하고 테스트용 ES256 키 쌍 2개(정상 발급자, 공격자)를 만든다. 정상 발급자의 공개키만 키 딕셔너리(kid → 공개키)로 보관하는 검증 함수를 5강 코드를 참고해 작성한다.`,
        `정상 토큰(typ=at+jwt, iss, aud, exp, iat, sub, scope)을 발급해 검증이 통과하는 테스트를 하나 만든다.`,
        `음성 테스트 10개 이상을 작성한다. alg=none 무서명 토큰, HS256으로 공개키 바이트를 비밀로 쓴 토큰(알고리즘 혼동), 공격자 키 서명, aud 누락, aud 불일치, iss 불일치, 만료, nbf 미래, typ가 JWT인 ID Token 형태, JWKS에 없는 kid, 헤더에 jku 포함, 서명 한 글자 변조, 4 KB 초과 토큰을 포함한다.`,
        `변이 테스트: 검증 단계(typ 확인, 알고리즘 허용목록, 서명, aud, iss, exp) 중 하나씩 코드에서 빼 보고 최소 한 개의 테스트가 실패하는지 확인해 결과를 표로 남긴다.`,
        `PKCE: RFC 7636 부록 B 시험 벡터 테스트, 16진수 인코딩 challenge를 거부하는 테스트, "challenge 없이 시작했는데 verifier가 온 토큰 요청"을 거부하는 서버 쪽 로직과 테스트를 작성한다.`,
        `RFC 9700 점검표를 8행(PKCE, redirect URI 정확 일치, implicit 비활성, password grant 비활성, refresh 회전 또는 발신자 제약, 토큰 수명, audience 제한, mix-up 방어)으로 만들고 각 행에 pass/fail과 근거(실제 설정 값 또는 조항 번호)를 적는다. 로컬 Keycloak 컨테이너나 가상의 IdP 설정 파일을 대상으로 한다.`,
        `(선택) PortSwigger Web Security Academy의 JWT 랩 2개를 풀고, 각 공격이 위 음성 테스트의 어느 행에 대응하는지 표로 연결한다.`
      ],
      accept: [
        `음성 테스트 10개 이상이 모두 예외로 거부되고 정상 토큰 테스트는 통과한다.`,
        `변이 테스트에서 제거한 검증 단계 6개 각각이 최소 1개 테스트를 실패시킨다(6/6). 실패하지 않는 단계가 있으면 그 단계를 잡는 음성 테스트를 추가한다.`,
        `PKCE 시험 벡터 통과, 16진수 challenge 거부, 다운그레이드 거부 테스트가 모두 포함돼 있다.`,
        `RFC 9700 점검표 8행 전부에 pass/fail과 근거가 적혀 있고 fail 행에는 수정 방안이 있다.`
      ],
      stretch: `DPoP(RFC 9449) proof 검증을 직접 구현한다. htm·htu 일치, iat 허용 오차, jti 재생 방지, 토큰 해시(ath) 일치를 검사하고, 탈취한 access token을 다른 키로 서명한 proof와 함께 제출하면 거부됨을 테스트로 증명한다.`
    },
    {
      title: `Lab 3. 납품 프로젝트: 주문 API 인증·인가 점검과 개선 패키지`,
      scenario: `가상의 고객사가 소규모 B2B 주문 API의 보안 점검과 개선을 의뢰했다. 먼저 의도적으로 결함 6개를 심은 로컬 API(v0)를 직접 만든 뒤, 고객에게 점검·개선을 납품하는 것처럼 점검 보고서·패치 코드·자동 테스트·인수인계 문서를 만든다. 모든 대상은 본인 PC의 localhost이고 데이터는 합성 데이터다. 실제 서비스나 타인의 시스템은 절대 대상으로 삼지 않는다.`,
      steps: [
        `한 페이지 요구서를 쓴다. 사용자 유형(고객사 직원 member·admin, 파트너), 테넌트 2개, 엔드포인트 8개 이상, 가정한 위험을 적는다.`,
        `v0을 구현한다(FastAPI, Flask, Express 중 하나, 약 150줄). 결함 6개: 주문 조회 BOLA, 사용자 수정 대량 할당(role 변경), 관리자 엔드포인트 BFLA, 로그인·재설정 열거 가능, 페이지 크기 무제한, URL을 가져오는 웹훅 등록의 SSRF. 시드 데이터(테넌트 2·사용자 4·주문 20)도 만든다.`,
        `권한 매트릭스(역할 × 엔드포인트 × 소유권 내 것/남의 것/타 테넌트)를 CSV로 쓰고, 이를 읽어 테스트 케이스를 만드는 하네스를 작성한다(30케이스 이상). v0에서 실행해 실패 6건 이상을 확인하고 결과를 저장한다.`,
        `결함별 curl 재현 스크립트 6개를 작성한다(localhost 한정). 각각 기대 응답과 실제 응답을 기록한다.`,
        `v1 패치: 저장소 계층의 테넌트 범위 강제, 요청·응답 DTO 허용목록, 관리자 라우트 정책, 로그인 동일 응답과 스로틀, limit 100 이하, 본문 크기 상한, 9강의 SSRF 가드, 오류의 RFC 9457 형식, 웹훅 발송·수신의 타임스탬프 포함 HMAC 서명과 재생 방지.`,
        `매트릭스 하네스를 CI(GitHub Actions 또는 로컬 pre-push)에 연결하고, 라우트 목록을 열거해 매트릭스에 없는 라우트가 있으면 실패하게 만든다.`,
        `사용자별 분당 100회 레이트 리밋을 구현해 초과 시 429, ‹Retry-After› 헤더, ‹application/problem+json› 본문을 반환하게 한다.`,
        `점검 보고서를 쓴다. 발견 6건마다 심각도·ASVS 5.0 장 번호(V2·V4·V6·V7·V8 등)·재현 명령·원인·수정 요약·재검증 결과를 적고, 잔여 위험과 점검하지 못한 범위를 별도 절로 적는다.`,
        `README에 실행법·테스트법·운영 설정 체크리스트(키 보관, 쿠키 속성, 허용 Origin, 레이트 리밋 저장소)를 쓰고, 30분 인수인계 데모 순서를 적는다.`
      ],
      accept: [
        `v0에서 매트릭스 테스트가 6건 이상 실패하고 v1에서는 전체 30건 이상이 통과한다.`,
        `매트릭스에 없는 라우트를 하나 추가하면 테스트(또는 CI)가 실패한다.`,
        `한도가 분당 100회일 때 101번째 요청이 429, ‹Retry-After›, ‹application/problem+json› 본문을 반환하는 테스트가 있다.`,
        `SSRF 가드 단위 테스트가 ‹http://127.0.0.1›, ‹https://localhost›, 메타데이터 주소 169.254.169.254, 사설 대역 10.x.x.x 입력을 모두 거부하고, 웹훅 서명 검증 테스트가 본문 변조와 5분을 넘긴 타임스탬프를 거부한다.`,
        `보고서에 발견 6건 전부의 재현 명령·수정 요약·재검증 결과·ASVS 장 번호가 있고 "취약점 없음"이나 "심사 통과 보장" 같은 문구가 없다.`
      ],
      stretch: `OWASP crAPI를 본인 PC의 Docker로 띄워 API Top 10 항목 최소 5개를 재현하고(본인 로컬 인스턴스에서만), 결과를 같은 보고서 형식으로 정리한 뒤 v1에 적용한 방어와 항목별로 대응시키는 표를 만든다.`
    }
  ],
  quiz: [
    {
      q: `고객사 보안 담당자가 "비밀번호는 8자 이상에 대소문자·숫자·특수문자를 모두 포함하고 90일마다 변경"하는 정책을 구현해 달라고 요청했습니다. 신규 서비스이고 인증 심사 일정은 아직 없습니다. 가장 적절한 대응은?`,
      choices: [
        `고객 요구사항이므로 근거를 따지지 않고 그대로 구현한다.`,
        `NIST SP 800-63B-4(2025-07)를 근거로 길이 중심(단일 요소 15자, MFA 병용 시 8자)·차단목록·침해 시에만 변경하는 정책을 제안하되, 사내 규정이나 심사 기준과 충돌하는지 확인하고 고객의 결정을 문서로 남긴다.`,
        `복잡도 규칙은 유지하고 변경 주기만 365일로 늘려 절충한다.`,
        `최소 길이를 6자로 낮추고 보안 질문을 추가해 사용성을 높인다.`
      ],
      answer: 1,
      why: `NIST SP 800-63B-4는 복잡도 규칙 부과와 주기적 변경 강제를 금지(SHALL NOT)하고 길이와 차단목록 대조를 요구합니다. 근거를 들어 제안하되 외부 인증 심사나 사내 규정이 우선일 수 있으므로 충돌을 확인하고 결정을 기록하는 것이 전문가의 방식입니다. 그대로 구현하면 사용자가 Password1!, Password2! 식으로 패턴을 만들어 오히려 약해집니다. 절충안은 여전히 금지된 규칙을 유지하고, 짧은 길이와 보안 질문은 NIST가 금지하거나 요건 미달입니다.`
    },
    {
      q: `저장된 비밀번호 해시와 정책 변경 내용입니다.

$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$...
정책 변경: 신규 해시는 m=47104, t=1, p=1로 만든다.

사용자 40만 명의 기존 해시를 안전하게 이전하는 방법은?`,
      choices: [
        `전 사용자의 비밀번호를 만료시키고 다음 로그인 때 재설정하게 한다.`,
        `DB에서 문자열 m=19456,t=2를 m=47104,t=1로 일괄 치환한다.`,
        `저장된 해시를 복호화해 평문을 얻은 뒤 새 파라미터로 다시 해시한다.`,
        `로그인 성공 시 check_needs_rehash로 파라미터를 비교해 새 값으로 다시 해시해 저장한다. 옛 해시는 PHC 문자열에 담긴 파라미터로 계속 검증된다.`
      ],
      answer: 3,
      why: `평문을 가진 순간은 로그인 성공 때뿐이므로 그때 재해시하는 것이 정석입니다. 해시는 단방향이라 복호화할 수 없고(복호화 선택지는 전제부터 틀림), 문자열만 치환하면 검증이 다른 파라미터로 수행돼 모든 로그인이 실패합니다. 강제 재설정은 사용자 불편과 지원 비용이 크고 침해 증거가 있을 때나 정당화됩니다.`
    },
    {
      q: `리소스 서버의 토큰 검증 코드(의사코드)입니다. 사용하는 라이브러리는 키 타입과 알고리즘의 일치를 검사하지 않는다고 가정합니다.

claims = verify_jwt(
    token,
    key=RSA_PUBLIC_KEY_PEM,
    allowed_algs=["RS256", "HS256"],
    verify_aud=False,
)

공격자가 서명 비밀을 모르면서도 위조 토큰을 통과시킬 수 있게 하는 직접 원인은 무엇입니까?`,
      choices: [
        `HS256을 허용하면서 같은 키 값을 HMAC 비밀로도 쓰기 때문에, 공개된 RSA 공개키를 비밀로 서명한 HS256 토큰이 통과한다(알고리즘 혼동).`,
        `verify_aud=False 때문에 서명 없는 토큰도 통과한다.`,
        `RS256 자체가 안전하지 않아 ES256으로 바꿔야 한다.`,
        `검증에 공개키를 사용하는 것 자체가 위조를 가능하게 한다.`
      ],
      answer: 0,
      why: `RS256 공개키는 공개돼 있으므로 HS256 비밀로 쓰이는 순간 누구나 같은 값으로 서명할 수 있습니다. 허용 알고리즘을 서버가 RS256 하나로 고정해야 합니다. verify_aud=False는 다른 서비스용 정상 서명 토큰을 받아들이는 토큰 치환 문제이지 서명 위조의 원인이 아니며(그럴듯하지만 서명 검증은 별개), 공개키로 검증하는 것은 비대칭 서명의 정상 사용입니다.`
    },
    {
      q: `의료 정보를 다루는 SPA를 외주로 개발 중입니다. 기존 코드는 access token(JWT, 만료 7일)을 localStorage에 저장하고, 보안 점검에서 XSS가 한 곳 발견됐습니다. RFC 10017의 관점에서 가장 적절한 구조 개선은?`,
      choices: [
        `토큰을 sessionStorage로 옮기고 만료를 24시간으로 줄인다.`,
        `JWT를 AES로 암호화해서 localStorage에 저장한다.`,
        `BFF를 도입해 서버가 토큰을 보관하고, 브라우저에는 __Host- HttpOnly SameSite 쿠키 세션만 두며 BFF에 CSRF 방어를 적용한다.`,
        `토큰을 JS 전역 변수에만 두고 새로고침 때마다 다시 로그인시킨다.`
      ],
      answer: 2,
      why: `RFC 10017은 민감한 앱에 BFF를 가장 권장합니다. 토큰이 브라우저 JS에 없으므로 XSS가 토큰을 읽을 수 없습니다. sessionStorage나 짧은 만료는 XSS가 있는 한 같은 문제를 갖고, 암호화 키가 JS에 있으면 의미가 없으며, 메모리에만 둬도 XSS가 흐름을 다시 호출해 새 토큰을 받을 수 있습니다.`
    },
    {
      q: `멀티테넌트 SaaS의 GET /api/invoices/{uuid} 엔드포인트가 로그인 여부만 확인하고 소유권은 확인하지 않습니다. 개발사 팀장은 "UUID라서 추측이 불가능해 안전하다"고 합니다. 가장 적절한 판단은?`,
      choices: [
        `맞다. UUIDv4는 122비트 난수라 사실상 안전하므로 수정이 필요 없다.`,
        `UUID 대신 순차 정수를 쓰고 대신 IP 허용목록을 추가한다.`,
        `위험하다. 추측 불가능성은 인가가 아니며 링크 유출·로그·공유로 UUID가 알려지면 다른 테넌트의 청구서가 열리므로, 서버가 호출자의 테넌트와 소유권을 항상 검사해야 한다.`,
        `응답 본문에서 금액 필드만 제거하면 충분하다.`
      ],
      answer: 2,
      why: `이것은 BOLA(API1)입니다. UUID는 심층방어일 뿐 접근 통제를 대신하지 못합니다. 그럴듯한 오답인 1번은 실제 위험이 추측이 아니라 노출 후 무검사라는 점을 놓칩니다. IP 허용목록은 외부 사용자 모델에 맞지 않고, 필드 제거는 객체 접근 자체를 막지 못합니다.`
    },
    {
      q: `로그인 API의 접근 로그입니다.

POST /login 401  11ms  email=nobody@corp.example
POST /login 401 243ms  email=kim@corp.example
POST /login 401 239ms  email=lee@corp.example
(세 응답의 본문은 모두 {"error":"invalid email or password"})

이 로그에서 보이는 문제와 올바른 수정은?`,
      choices: [
        `존재하지 않는 계정은 해시 검증을 건너뛰어 응답 시간으로 계정 존재 여부가 구분된다. 계정이 없을 때도 더미 해시를 검증해 처리 시간을 맞춘다.`,
        `본문 메시지가 모호하므로 "계정이 없습니다"와 "비밀번호가 틀렸습니다"를 구분해 안내한다.`,
        `401 대신 200을 반환해 상태 코드로 구분되지 않게 한다.`,
        `해시 비용을 낮춰 모든 응답이 빠르게 끝나게 한다.`
      ],
      answer: 0,
      why: `메시지를 맞춰도 11ms와 240ms의 시간 차이가 열거 통로가 됩니다. 더미 해시 검증으로 같은 비용을 치르게 하는 것이 표준 대응입니다. 메시지를 구분하면 열거가 더 쉬워지고, 상태 코드 변경은 시간 차이를 없애지 못하며, 해시 비용을 낮추면 유출 시 방어가 약해집니다.`
    },
    {
      q: `고객이 "로그인 5회 실패 시 계정을 영구 잠금하고 관리자가 풀어 주는 방식"을 요구합니다. 사용자는 5만 명이고 크리덴셜 스터핑 시도가 관측되고 있습니다. 가장 적절한 제안은?`,
      choices: [
        `요구대로 구현한다. 영구 잠금이 가장 강력한 방어다.`,
        `NIST의 상한이 100회이므로 100회를 목표값으로 삼고 영구 잠금은 유지한다.`,
        `잠금은 두지 않고 CAPTCHA를 모든 로그인에 상시 적용한다.`,
        `영구 잠금 대신 계정·IP별 점진 지연, 이상 알림, 유출 비밀번호 차단목록, MFA를 조합하고, 영구 잠금이 공격자가 임의 계정을 잠그는 DoS 수단이 된다는 점을 설명해 합의한다.`
      ],
      answer: 3,
      why: `스터핑은 계정당 시도가 1~2회라 5회 잠금에 거의 걸리지 않고, 영구 잠금은 공격자에게 피해자를 잠그는 무기를 줍니다. NIST의 100회는 넘으면 안 되는 상한이지 목표가 아닙니다. CAPTCHA는 보조 수단이며 단독으로 스터핑을 막지 못합니다.`
    },
    {
      q: `PKCE를 적용한 클라이언트 코드와 토큰 교환 실패 응답입니다.

verifier = b64url(os.urandom(32))
challenge = hashlib.sha256(verifier.encode()).hexdigest()
params = {"code_challenge": challenge, "code_challenge_method": "S256"}
# 토큰 교환 응답: {"error": "invalid_grant", "error_description": "PKCE verification failed"}

실패 원인은?`,
      choices: [
        `code_verifier가 32바이트라 너무 길다. 16바이트여야 한다.`,
        `S256 challenge는 SHA-256 원본 digest를 base64url(패딩 제거)로 인코딩해야 하는데 16진수 문자열을 보냈다.`,
        `S256 대신 plain 방식을 써야 한다.`,
        `state 파라미터가 없어서 AS가 PKCE 검증을 건너뛴다.`
      ],
      answer: 1,
      why: `RFC 7636의 S256은 BASE64URL(SHA256(ASCII(verifier)))입니다. 16진수 문자열은 AS가 계산한 값과 절대 일치하지 않습니다. verifier는 43자(32바이트의 base64url)로 허용 범위(43~128자) 안이며, plain은 verifier가 노출돼 권장되지 않고, state와 PKCE 검증은 별개입니다.`
    },
    {
      q: `파트너사가 "서브도메인이 많다"며 OAuth redirect URI를 https://*.partner.example/callback 와일드카드로 등록해 달라고 요청합니다. IdP 설정을 맡은 당신의 판단은?`,
      choices: [
        `서브도메인이 모두 파트너 소유라 위험이 없으니 와일드카드를 등록한다.`,
        `RFC 9700은 redirect URI를 정확한 문자열 일치로 검증하도록 요구하므로 쓰는 URI를 하나씩 등록하게 하고, 서브도메인의 open redirect나 탈취가 code 탈취로 이어지는 위험을 설명한다.`,
        `와일드카드를 허용하되 state 파라미터를 반드시 쓰게 해서 보완한다.`,
        `와일드카드를 허용하고 PKCE가 있으니 code가 탈취돼도 괜찮다고 안내한다.`
      ],
      answer: 1,
      why: `와일드카드에 걸리는 서브도메인 하나(탈취됐거나 open redirect가 있는 곳)를 공격자가 장악하면, 공격자는 자기 code_challenge를 넣고 redirect_uri를 그 서브도메인으로 지정한 인증 요청 링크를 만들어 피해자에게 로그인·동의를 시킵니다. code는 공격자에게 오고 verifier도 공격자가 갖고 있으므로 흐름을 공격자가 시작한 이상 PKCE는 이 경우를 막지 못합니다. state는 CSRF용이고 redirect 대상 검증이 아니므로, 정확 일치가 필요합니다.`
    },
    {
      q: `쇼핑몰 관리자 화면에 "이미지 URL을 입력하면 서버가 내려받아 썸네일을 만드는 기능"을 추가합니다. 개발자는 입력 문자열에 localhost나 127.0.0.1이 들어 있으면 거부하는 필터를 만들었습니다. 가장 적절한 개선은?`,
      choices: [
        `블랙리스트에 0.0.0.0과 169.254.169.254도 추가한다.`,
        `관리자만 쓰는 기능이고 인증이 있으므로 추가 조치가 필요 없다.`,
        `https만 허용하고 DNS를 해석한 결과 IP가 사설·루프백·링크 로컬이면 거부하며, 검증한 IP로 직접 연결하고 리다이렉트를 제한하고, 서버의 egress도 네트워크 수준에서 제한한다.`,
        `브라우저(클라이언트)에서만 URL 형식을 검사한다.`
      ],
      answer: 2,
      why: `문자열 블랙리스트는 10진·16진 IP 표기, IPv6, 내부 IP로 해석되는 도메인으로 우회됩니다. 관리자 계정이 탈취되면 인증은 방어가 되지 않으며, 클라이언트 검사는 우회가 자명합니다. 해석된 IP 검사와 검증한 IP로 연결하는 방식(DNS rebinding 대비), 네트워크 계층 제한이 SSRF 방어의 핵심입니다.`
    },
    {
      q: `운영 중인 서비스가 보내는 응답 헤더입니다.

Set-Cookie: sid=Kq3vZ8m1T5xR0yHn7uJc2WbA9dLe4FgS6oPiXtYw; Path=/; Domain=.example.com; HttpOnly

이 쿠키 설정에 대한 올바른 평가는?`,
      choices: [
        `Secure와 SameSite가 없고 Domain이 모든 서브도메인으로 범위를 넓힌다. __Host- 접두 이름에 Secure; Path=/; Domain 미지정; SameSite=Lax를 쓰는 형태로 바꿔야 한다.`,
        `HttpOnly가 있으므로 XSS로 세션을 악용하는 것이 불가능해 충분히 안전하다.`,
        `Domain=.example.com은 권장 설정이므로 유지하고 Secure만 추가하면 된다.`,
        `세션 ID가 영숫자로만 구성돼 있으면 쿠키 속성은 보안과 무관하다.`
      ],
      answer: 0,
      why: `Secure가 없으면 HTTP 구간에서 노출되고, SameSite가 없으면 브라우저 기본값에 기대게 되며, Domain 지정은 모든 서브도메인이 쿠키를 읽고 덮어쓸 수 있게 합니다. __Host- 접두는 이 세 가지를 강제합니다. HttpOnly는 쿠키 값 읽기만 막고 XSS가 사용자 권한으로 요청을 보내는 것은 막지 못합니다.`
    },
    {
      q: `API는 수명 24시간의 stateless JWT만 검증합니다. 고객이 "퇴사자의 접근을 몇 분 안에 끊을 수 있어야 한다"고 요구하고, 서비스 간 호출이 많아 매 요청마다 세션 저장소를 조회하는 구조는 피하고 싶습니다. 가장 적절한 설계는?`,
      choices: [
        `서명 키를 교체해 전 사용자를 로그아웃시키는 절차를 퇴사가 생길 때마다 실행한다.`,
        `JWT 만료는 24시간 그대로 두고, 퇴사자의 기기에서 앱을 삭제해 달라고 요청한다.`,
        `클라이언트가 토큰을 삭제하도록 로그아웃 API만 제공한다.`,
        `access token 수명을 5~15분으로 줄이고 서버에 저장되는 회전형 refresh token을 쓰되, 퇴사 시 그 사용자의 refresh token을 폐기(또는 token_version·not_before 갱신)하고 민감 API에는 introspection이나 denylist를 추가한다.`
      ],
      answer: 3,
      why: `폐기 지연이 access token 수명으로 줄어들고 매 요청 조회도 피할 수 있습니다. 키 교체는 전체 사용자에게 장애를 만드는 과한 조치이고, 클라이언트 쪽 삭제는 이미 복사된 토큰에 효과가 없으며, 만료를 그대로 두면 요구사항(분 단위 차단)을 충족하지 못합니다.`
    }
  ],
  refs: [
    {
      title: `NIST SP 800-63B-4 Digital Identity Guidelines: Authentication and Authenticator Management (2025-07)`,
      url: `https://pages.nist.gov/800-63-4/sp800-63b.html`,
      kind: `standard`,
      why: `비밀번호 길이·차단목록·솔트·스로틀·AAL·재인증 요건의 1차 근거다. 고객의 구식 정책을 조항 번호로 협상할 때 쓴다.`
    },
    {
      title: `OWASP Password Storage Cheat Sheet`,
      url: `https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html`,
      kind: `doc`,
      why: `Argon2id·scrypt·bcrypt·PBKDF2의 최소 파라미터, 페퍼, 해시 업그레이드 절차가 정리돼 있다. 수치는 열람 시점(2026-11) 기준으로 다시 확인한다.`
    },
    {
      title: `RFC 9700 Best Current Practice for OAuth 2.0 Security (BCP 240)`,
      url: `https://www.rfc-editor.org/rfc/rfc9700.html`,
      kind: `rfc`,
      why: `PKCE, redirect URI 정확 일치, implicit·password grant, refresh 토큰 보호, mix-up 방어 등 현행 OAuth 보안 기준선이다. 점검표의 항목 출처로 삼는다.`
    },
    {
      title: `RFC 7636 Proof Key for Code Exchange by OAuth Public Clients`,
      url: `https://www.rfc-editor.org/rfc/rfc7636.html`,
      kind: `rfc`,
      why: `code_verifier/code_challenge 생성 규칙과 부록 B의 시험 벡터가 있어 구현 검증에 바로 쓸 수 있다.`
    },
    {
      title: `RFC 10017 OAuth 2.0 for Browser-Based Applications (BCP 212)`,
      url: `https://www.rfc-editor.org/rfc/rfc10017.html`,
      kind: `rfc`,
      why: `SPA 토큰 저장 위험과 BFF, token-mediating backend, 순수 브라우저 클라이언트의 우선순위(2026-08 발행)를 제시하고 BFF의 쿠키·CSRF 요건을 적는다. 아키텍처 결정을 문서로 정당화할 때 인용한다.`
    },
    {
      title: `RFC 7519 JSON Web Token (JWT)`,
      url: `https://www.rfc-editor.org/rfc/rfc7519.html`,
      kind: `rfc`,
      why: `JWT 구조, 등록 클레임이 모두 선택이라는 점, 검증 절차의 원문이다. 클레임별 의미를 확인할 때 읽는다.`
    },
    {
      title: `RFC 8725 JSON Web Token Best Current Practices (BCP 225)`,
      url: `https://www.rfc-editor.org/rfc/rfc8725.html`,
      kind: `rfc`,
      why: `알고리즘 검증, 약한 키, kid·jku 신뢰, 토큰 치환 등 JWT 공격과 12개 권고가 있다. 음성 테스트 목록의 근거가 된다.`
    },
    {
      title: `RFC 9068 JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens`,
      url: `https://www.rfc-editor.org/rfc/rfc9068.html`,
      kind: `rfc`,
      why: `typ=at+jwt, 필수 클레임, 리소스 서버의 검증·거부 규칙을 정한다. ID Token과의 혼동을 막는 설계에 쓴다.`
    },
    {
      title: `RFC 9449 OAuth 2.0 Demonstrating Proof of Possession (DPoP)`,
      url: `https://www.rfc-editor.org/rfc/rfc9449.html`,
      kind: `rfc`,
      why: `토큰을 클라이언트 키에 묶어 탈취 후 재사용을 막는 방식이다. 고위험 API에서 발신자 제약 토큰을 제안할 때 읽는다.`
    },
    {
      title: `OpenID Connect Core 1.0 incorporating errata set 2 (2023-12-15)`,
      url: `https://openid.net/specs/openid-connect-core-1_0.html`,
      kind: `standard`,
      why: `ID Token 클레임과 검증 규칙, nonce, UserInfo의 원문이다. 소셜·SSO 로그인 구현의 검증 항목을 대조한다.`
    },
    {
      title: `OWASP API Security Top 10 (2023)`,
      url: `https://api-security.owasp.org/`,
      kind: `standard`,
      why: `API1~API10 목록과 예방책이 있다. API 점검 보고서의 항목 체계로 그대로 쓴다.`
    },
    {
      title: `OWASP Application Security Verification Standard 5.0.0`,
      url: `https://github.com/OWASP/ASVS/tree/v5.0.0/5.0/en`,
      kind: `standard`,
      why: `V6 인증·V7 세션·V8 인가·V9 자기완결 토큰·V10 OAuth/OIDC 등 17개 장의 검증 요구사항이다. 보고서의 매핑 기준으로 쓴다.`
    },
    {
      title: `OWASP crAPI (Completely Ridiculous API)`,
      url: `https://owasp.org/www-project-crapi/`,
      kind: `tool`,
      why: `API Top 10 기반의 의도적 취약 API다. 본인 로컬 환경에서 BOLA·BFLA·대량 할당 등을 재현하는 연습장으로 쓴다.`
    },
    {
      title: `PortSwigger Web Security Academy`,
      url: `https://portswigger.net/web-security`,
      kind: `course`,
      why: `JWT·OAuth·API 테스트 등의 무료 랩이 있다. 본인 랩 환경에서 공격을 재현한 뒤 방어 테스트와 연결해 본다.`
    }
  ],
  gigs: [
    `"로그인 붙여 주세요"라는 한 줄 요청을 견적 전에 해체한다. 사용자 유형(직원·고객·파트너), 클라이언트(웹·모바일·서버), 기존 IdP나 SSO(Google Workspace, Entra ID 등) 보유와 기존 사용자 DB 이전 여부, MFA·패스키 요구, 규제·인증(ISMS-P, 금융·의료)과 심사 일정, 퇴사자 차단 속도 같은 폐기 요구, 운영 환경(클라우드·온프레미스)을 확인한다. 이 답에 따라 IdP 도입과 라이브러리 구현의 견적이 크게 달라진다.`,
    `인증을 직접 구현할지 IdP(Keycloak, Auth0, Cognito, Entra ID 등)를 쓸지는 기능이 아니라 운영 책임의 문제다. 직접 구현은 비밀번호 저장·MFA·복구·감사 로그·키 회전·패치를 고객이 영구히 떠안는다. 기본안은 검증된 IdP나 프레임워크이며, 자체 구현이 불가피하면 범위와 유지보수 책임을 계약서에 적는다. 셀프 호스팅 IdP는 패치·백업·가용성 운영비를 견적에 넣는다.`,
    `납품물을 코드만으로 끝내지 않는다. 인증·세션·토큰 설계서(파라미터와 수명의 근거를 NIST·OWASP·RFC 조항 번호로 표시), 역할×엔드포인트×소유권 권한 매트릭스와 자동 테스트, JWT·PKCE 음성 테스트, 키 회전·침해 시 전체 로그아웃 런북, 쿠키·CORS·헤더 설정 체크리스트, OpenAPI와 오류 형식(RFC 9457) 문서를 포함한다. 점검 프로젝트라면 발견 사항별 재현·수정·재검증 증거와 ASVS 5.0 장 매핑이 담긴 보고서가 핵심 산출물이다.`,
    `전형적인 함정. 고객이 복잡도 규칙과 90일 변경을 요구하면 NIST SP 800-63B-4로 협상하되 인증 심사나 사내 규정이 우선인지 먼저 묻는다. "보안 점검 통과 보장"과 "취약점 0"은 약속하지 않는다. 해시 이전에서 전 사용자 강제 재설정을 하지 않도록 로그인 시 재해시를 제안한다. 보안 강화(aud 강제, 토큰 컷오프)가 구버전 모바일 앱을 깨므로 앱 업데이트 일정과 묶는다. 외부 IdP(소셜 로그인) 앱 등록·심사 대기 시간이 일정에 영향을 주므로 사전에 확인한다. 문서의 표준 현황(OAuth 2.1 draft, RFC 6265bis 등)은 2026-11 기준임을 명시한다.`,
    `견적 요령. 점검은 엔드포인트 수 × 역할 수 × 테넌트 구조가 규모를 정하고, 매트릭스의 행 수가 곧 테스트 케이스 수다. 신규 구축은 클라이언트 종류 수와 IdP 연동 여부가 좌우한다. 점검과 수정은 단계를 나눠 1단계 점검은 범위 고정 견적, 2단계 수정은 발견 항목별 견적으로 제안한다. 마이그레이션은 해시 일괄 감싸기, 토큰 컷오프, 호환 기간 같은 단계를 분리하고 예비 시간(경험칙으로 15~20%, 프로젝트마다 다름)을 둔다.`,
    `점검의 법적·윤리적 경계를 계약 단계에서 못 박는다. 대상 시스템·기간·환경(스테이징 우선)·허용 기법을 서면으로 합의하고 범위 밖 테스트를 하지 않는다. 운영 데이터는 최소한으로만 보고 마스킹된 데이터를 요청하며, 발견 취약점은 합의한 채널로 고객에게만 보고한다. 개인정보 안전조치(비밀번호 일방향 암호화, 접근 권한 관리, 접속기록)는 PRV-201과 함께 점검표에 넣고, 위탁·수탁 관계에서 외주사의 보안 의무가 계약에 어떻게 반영되는지 확인한다.`,
    `파트너 API 요청에는 온보딩 문서까지 납품물로 본다. API 키는 식별용 접두와 무작위 값으로 만들고 해시로 저장하며 생성 시 한 번만 보여 주고 회전·scope·IP 제한을 지원한다. 웹훅은 타임스탬프를 포함한 HMAC 서명과 검증 예제 코드를 제공하고, 오류는 RFC 9457 형식으로 통일하고, 레이트 리밋 정책과 security.txt(신고 창구)를 문서화한다. 이 문서가 부실하면 파트너사 문의가 모두 운영 비용으로 돌아온다.`
  ]
};
