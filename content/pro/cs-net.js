(window.PRO_MODULES = window.PRO_MODULES || {})["cs-net"] = {
  id: "cs-net",
  summary: `TCP·DNS·TLS 1.3·HTTP/2·HTTP/3(QUIC)·로드밸런서의 동작 원리를 바탕으로 curl·dig·ss·tcpdump·Wireshark로 지연과 502 장애를 계층별로 진단하고, 설정 변경과 인계 문서까지 만들 수 있다.`,
  hours: 130,
  goals: [
    `계층·캡슐화·지연 구성요소와 RTT 수치로 새 HTTPS 요청의 최소 대기 시간을 계산하고, RFC의 Obsoletes 관계와 BCP 14 규칙으로 올바른 규격 조항을 인용할 수 있다`,
    `CIDR·longest-prefix match·NAT·MTU/PMTUD를 이용해 "작은 요청은 되는데 큰 응답만 멈춘다" 같은 증상의 원인 후보를 좁힐 수 있다`,
    `TCP 상태기계(TIME_WAIT·CLOSE_WAIT), 재전송 타이머, 수신 윈도, 혼잡 제어(slow start·Cubic·BBR 개념)로 처리량·지연 현상을 설명하고 ss·tcpdump로 증거를 수집할 수 있다`,
    `DNS 해석 흐름, TTL과 음성 캐시, UDP 512바이트에서 TCP 폴백까지의 규칙을 설명하고, 도메인 전환 계획과 dig 기반 장애 진단을 수행할 수 있다`,
    `소켓 API(backlog·accept 큐), epoll 이벤트 루프, HTTP/1.1 프레이밍, SSE·WebSocket 스트리밍의 운영 함정을 설명하고 설정으로 대응할 수 있다`,
    `TLS 1.3 1-RTT 핸드셰이크, 인증서 체인·SAN·ALPN, 0-RTT 재생 위험을 설명하고 RFC 9325 기준으로 서버 TLS 설정을 감사할 수 있다`,
    `HTTP/2 프레임·HPACK·TCP HoL과 QUIC·HTTP/3 구조의 차이를 비교하고, 도입 여부를 본인의 측정 결과로 제안할 수 있다`,
    `L4/L7 로드밸런서·프록시·CDN의 타임아웃·keepalive·재시도·헬스체크를 설계하고 502/503/504 원인을 구분해 진단 보고서와 런북으로 인계할 수 있다`
  ],
  lessons: [
    {
      title: `네트워크 멘탈 모델: 계층, 지연, 한 요청의 비용`,
      body: `인터넷은 "믿을 수 없는 배달망 위에 신뢰성을 얹은 시스템"입니다. 중간 라우터는 패킷을 최선 노력(best effort)으로 넘길 뿐 도착·순서·중복 제거를 약속하지 않고, 필요한 보장은 통신의 양 끝점이 만듭니다. Saltzer·Reed·Clark의 end-to-end 논거가 바로 이 이야기입니다. 하위 계층이 재전송을 도와도 데이터가 끝까지 올바르게 처리됐는지는 양 끝에서만 확인할 수 있으므로 중간 계층의 기능은 성능 최적화로만 정당화된다는 것입니다. 실무로 옮기면, TCP가 바이트를 다 전달했다는 것은 상대 커널이 받았다는 뜻일 뿐 상대 애플리케이션이 처리했다는 뜻이 아니므로 결제·주문 API는 응답이 유실될 때를 대비해 멱등 키와 애플리케이션 수준 확인을 둡니다.

### 계층과 캡슐화

링크(이더넷·Wi-Fi), 인터넷(IP), 전송(TCP·UDP·QUIC), 응용(HTTP·DNS) 네 계층이 각자 헤더를 붙여 포장합니다. HTTP 메시지는 TCP 세그먼트(헤더 20바이트 이상)에, 그것은 IP 패킷(헤더 20바이트 이상)에, 그것은 이더넷 프레임에 담깁니다. 이더넷 MTU가 1500바이트이면 TCP 세그먼트 하나에 실리는 데이터(MSS)는 보통 1460바이트입니다. OSI 7계층은 용어집으로 남아 "L4 로드밸런서", "L7 프록시"처럼 번호로만 쓰입니다.

### 지연의 네 조각

패킷 지연은 **전파**(신호가 거리를 가는 시간), **직렬화**(패킷 크기 ÷ 대역폭), **큐잉**(라우터 버퍼 대기), **처리**의 합입니다. 광섬유 속 신호는 대략 초속 20만 km이므로 서울에서 미국 서부(약 9,500km)까지 왕복의 물리적 하한은 약 95ms이고, 실제 경로는 더 돌아가므로 이보다 큽니다. 회선을 10배 늘려도 전파 지연은 그대로이기 때문에, 작은 요청이 많은 웹·API에서는 대역폭보다 **왕복 횟수**가 성능을 좌우합니다. 대역폭 × RTT인 대역폭-지연 곱(BDP)은 "망 안에 떠 있어야 하는 데이터량"이며 1Gbps·100ms 구간에서 약 12.5MB입니다(레슨 3~4).

### 새 HTTPS 요청 하나의 비용

| 단계 | 왕복 | 비고 |
| DNS 조회 | 0~여러 번 | 캐시 적중이면 0, 미스면 재귀 질의 횟수만큼 |
| TCP 핸드셰이크 | 1 | SYN, SYN-ACK, ACK |
| TLS 1.3 핸드셰이크 | 1 | TLS 1.2는 보통 2 |
| HTTP 요청·응답 | 1 | 서버 처리 시간은 별도 |

RTT가 100ms이고 DNS가 캐시에서 풀려도 새 연결의 첫 응답은 최소 약 300ms 뒤에 옵니다. 연결 재사용, TLS 세션 재개, QUIC(전송과 암호 핸드셰이크 결합), CDN은 모두 이 곱셈을 줄이는 기술입니다.

### 규격 읽기와 관찰 습관

RFC는 상태(Standards Track, BCP, Informational)와 ‹Obsoletes›·‹Updates› 관계를 먼저 봅니다. TCP는 RFC 9293(STD 7, 2022-08)이 RFC 793을 대체했고, HTTP/1.1의 RFC 7230~7235는 2022-06에 RFC 9110~9112로 대체되었습니다. 폐기된 번호를 인용하면 논쟁에서 집니다. MUST·SHOULD·MAY는 대문자일 때만 요구 수준이라는 BCP 14(RFC 2119, 8174)도 알아 두세요. 라이브러리 동작을 두고 다툴 때는 조항과 키워드(예: "RFC 9113 6.5.2의 SHOULD")로 말합니다.

관찰 도구는 층마다 다릅니다. 경로는 ‹mtr›, 연결은 ‹ss›·‹tcpdump›, 이름은 ‹dig›, 암호는 ‹openssl s_client›, HTTP는 ‹curl -v›·‹curl -w›입니다. 이 모듈의 목표는 "느리다"를 "어느 단계에서 몇 ms"라는 문장으로 바꾸는 것입니다.`,
      code: `import socket, ssl, time

host, port = "example.com", 443
t0 = time.perf_counter()
family, stype, proto, _, addr = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)[0]
t_dns = time.perf_counter()                     # 이름 해석 완료

sock = socket.socket(family, stype, proto)
sock.settimeout(5)
sock.connect(addr)                              # TCP 3-way handshake
t_tcp = time.perf_counter()

ctx = ssl.create_default_context()
tls = ctx.wrap_socket(sock, server_hostname=host)   # TLS 핸드셰이크
t_tls = time.perf_counter()
version = tls.version()

request = "GET / HTTP/1.1\\r\\nHost: " + host + "\\r\\nConnection: close\\r\\n\\r\\n"
tls.sendall(request.encode())
tls.recv(1)                                     # 응답의 첫 바이트
t_ttfb = time.perf_counter()
tls.close()

steps = [("dns", t0, t_dns), ("tcp", t_dns, t_tcp), ("tls", t_tcp, t_tls), ("ttfb", t_tls, t_ttfb)]
for name, a, b in steps:
    print("%-5s %7.1f ms" % (name, (b - a) * 1000))
print("negotiated:", version)`,
      codeLang: `python`,
      key: [
        `새 HTTPS 연결의 첫 응답 하한은 왕복 수 × RTT이다. DNS 캐시 적중·TLS 1.3이면 TCP 1 + TLS 1 + HTTP 1 = 3 RTT, TLS 1.2면 4 RTT다.`,
        `전파 지연은 물리 한계(광섬유 약 초속 20만 km)라 대역폭을 늘려도 줄지 않는다. 작은 요청이 많으면 왕복 수가 성능을 정한다.`,
        `신뢰성은 끝점이 완성한다. TCP ACK는 상대 커널의 수신일 뿐이므로 중요한 API는 멱등 키와 애플리케이션 수준 확인을 둔다.`,
        `RFC는 상태와 Obsoletes/Updates를 먼저 보고, 대문자 MUST/SHOULD/MAY만 요구 수준으로 읽는다(BCP 14).`,
        `증거 도구는 층마다 다르다: mtr, ss/tcpdump, dig, openssl s_client, curl -w.`
      ],
      pitfalls: [
        `대역폭이나 서버 대수를 늘려 "느림"을 해결하려다 실제 병목인 왕복 수(DNS, 핸드셰이크, 순차 호출)를 놓친다.`,
        `폐기된 RFC(793, 7230~7235)를 근거로 인용하거나 소문자 must를 규범으로 읽어 논쟁에서 틀린 조항을 든다.`,
        `한 번 잰 값으로 결론을 낸다. 지연은 분포이므로 수십 회 이상 재고 p50과 p95로 말해야 한다.`,
        `"TCP를 쓰니 요청이 유실되지 않는다"고 가정해 재시도와 멱등성 설계 없이 결제 API를 만든다.`
      ]
    },
    {
      title: `IP, 서브넷, NAT, 라우팅, MTU: 패킷이 길을 찾는 방식`,
      body: `패킷이 목적지까지 가는 일은 "같은 링크 안에서 건네기"와 "링크를 넘어 길 찾기"로 나뉩니다.

### 같은 링크 안: 서브넷, ARP, 게이트웨이

같은 이더넷·Wi-Fi 세그먼트의 호스트끼리는 MAC 주소로 프레임을 주고받고, IP를 MAC으로 바꿔 주는 것이 ARP입니다(IPv6는 NDP). 스위치는 출발 MAC을 학습해 포트 표를 만들고 모르는 목적지는 모든 포트로 뿌립니다(flooding). 스위치 사이에 루프가 생기면 프레임이 계속 돌기 때문에 스패닝 트리(STP)가 일부 링크를 막아 두고, VLAN은 한 물리 스위치를 여러 개의 브로드캐스트 도메인으로 나눕니다. 호스트는 자기 IP와 서브넷 마스크로 "목적지가 내 서브넷인가"를 판정해, 맞으면 직접 보내고 아니면 기본 게이트웨이로 보냅니다. CIDR 표기 ‹10.1.2.0/24›는 앞 24비트가 네트워크, 나머지 8비트가 호스트이므로 주소가 256개입니다. 사설 대역은 RFC 1918의 ‹10.0.0.0/8›, ‹172.16.0.0/12›, ‹192.168.0.0/16›이고, 통신사 공유 주소 ‹100.64.0.0/10›과 링크 로컬 ‹169.254.0.0/16›도 별도 용도입니다. 클라우드 메타데이터 주소가 링크 로컬 대역(169.254.169.254)에 있어서, 서버가 사용자가 준 URL을 대신 가져오는 기능은 이 대역을 차단해야 SSRF에 안전합니다. 외주에서 가장 흔한 실수는 VPC·온프레미스·고객사 VPN의 CIDR을 겹치게 설계해 나중에 피어링이나 VPN을 못 잇는 것이므로 주소 계획표부터 받아 겹침을 확인합니다.

### 링크를 넘어: 라우팅

라우터는 "목적지 접두사 → 다음 홉" 표를 갖고, 여러 항목이 맞으면 가장 긴 접두사(longest prefix match)를 고릅니다. 10.1.2.7은 ‹10.1.2.0/24›, ‹10.1.0.0/16›, ‹0.0.0.0/0›에 모두 맞지만 /24가 이깁니다. 리눅스에서는 ‹ip route get 목적지›로 실제 선택을 확인합니다. 조직 내부 경로는 링크 상태(OSPF)나 거리 벡터 방식이 계산하고, 조직(AS) 사이 경로는 BGP가 정책에 따라 광고합니다. BGP는 상대의 광고를 대체로 믿는 구조라 잘못된 광고가 장애로 번지며, 2021-10 Facebook 장애는 BGP 경로가 철회되어 DNS 서버까지 닿지 못한 사례로 널리 알려져 있습니다. 서버 개발자가 BGP를 설정할 일은 드물어도 "라우팅이 죽으면 DNS도 죽는다"는 의존 관계는 알아야 합니다.

### NAT: 주소 부족의 대가

NAT 게이트웨이는 사설 (IP, 포트)를 공인 (IP, 포트)로 바꾸고 매핑을 연결 추적 표에 보관합니다. 결과가 세 가지입니다. 첫째, 매핑은 유휴 타임아웃 뒤 지워져 오래 조용한 TCP 연결이 아무 신호 없이 죽습니다. 둘째, 같은 공인 IP에서 같은 목적지로 나가는 동시 연결은 포트 수(최대 약 6만 5천, 실제로는 그보다 적음)에 묶여 짧은 연결이 몰리면 포트 고갈이 납니다. 셋째, 서버는 회사나 통신사 전체를 한 IP로 보므로 IP 기반 rate limit이 무고한 사용자까지 막습니다. IPv6는 주소가 128비트라 NAT 없이 쓰는 경우가 많지만 방화벽 정책은 똑같이 필요합니다.

### MTU와 경로 MTU 발견

이더넷 MTU 1500에 터널·VPN·오버레이(VXLAN은 약 50바이트 오버헤드)가 헤더를 얹으면 실효 MTU가 줄어듭니다. DF 비트가 선 큰 패킷이 좁은 구간을 만나면 라우터가 ICMP "fragmentation needed"를 돌려보내 송신자가 크기를 줄이는데(PMTUD), 방화벽이 ICMP를 통째로 막으면 이 신호가 사라져 **PMTUD 블랙홀**이 됩니다. 증상이 특징적입니다. 핸드셰이크와 작은 요청은 되는데 큰 응답이나 큰 POST만 멈춥니다. ‹ping -M do -s 1472 대상›(1472+28=1500)으로 경계를 찾고, ICMP 3번(Fragmentation Needed) 허용이나 MSS 클램핑으로 고칩니다. IPv6는 라우터가 조각내지 않으므로 ICMPv6 Packet Too Big을 막으면 같은 증상이 더 확실하게 나타납니다. QUIC도 UDP 데이터그램 최소 1200바이트가 지나야 하므로(RFC 9000) 터널 구간 MTU가 중요합니다.`,
      code: `import ipaddress

routes = {
    "0.0.0.0/0":   "gw-internet",
    "10.0.0.0/8":  "vpn-tunnel",
    "10.1.0.0/16": "vpc-peering",
    "10.1.2.0/24": "local-subnet",
}
table = [(ipaddress.ip_network(cidr), hop) for cidr, hop in routes.items()]

def lookup(dst):
    ip = ipaddress.ip_address(dst)
    matches = [(net.prefixlen, hop, net) for net, hop in table if ip in net]
    return max(matches, key=lambda m: m[0])      # 가장 긴 접두사가 이긴다

for dst in ["10.1.2.7", "10.1.9.9", "10.200.0.1", "8.8.8.8"]:
    plen, hop, net = lookup(dst)
    print("%-11s -> %-13s via %s" % (dst, hop, net))
# 10.1.2.7    -> local-subnet  via 10.1.2.0/24
# 10.1.9.9    -> vpc-peering   via 10.1.0.0/16
# 10.200.0.1  -> vpn-tunnel    via 10.0.0.0/8
# 8.8.8.8     -> gw-internet   via 0.0.0.0/0

subnet = ipaddress.ip_network("10.1.2.0/24")
print(subnet.num_addresses, subnet.netmask, subnet.broadcast_address)   # 256 255.255.255.0 10.1.2.255
# 주소 계획 검증: 겹치는 CIDR은 나중에 피어링이 불가능하다
print(ipaddress.ip_network("10.1.0.0/16").overlaps(subnet))             # True`,
      codeLang: `python`,
      key: [
        `목적지가 내 서브넷이면 직접, 아니면 기본 게이트웨이로 보낸다. 라우터는 longest prefix match로 다음 홉을 고른다.`,
        `CIDR /n은 호스트 비트가 (32-n)개이고 주소가 2의 (32-n)제곱 개다. 사설 대역은 RFC 1918의 세 개이며 100.64/10과 169.254/16은 별도 용도다.`,
        `NAT는 연결 추적 표 때문에 유휴 타임아웃, 포트 고갈, 클라이언트 IP 은폐라는 세 가지 부작용을 낳는다.`,
        `PMTUD는 ICMP에 의존한다. ICMP를 막으면 작은 요청은 되고 큰 응답만 멈추는 블랙홀이 생긴다.`,
        `ip route get, ping -M do -s, mtr로 경로와 MTU를 확인한다.`
      ],
      pitfalls: [
        `VPC·온프레미스·파트너 VPN의 CIDR 겹침을 설계 단계에서 확인하지 않아 나중에 피어링이 불가능해진다.`,
        `보안 강화 명목으로 ICMP를 전부 차단해 PMTUD 블랙홀을 만들고, "로그인은 되는데 목록 API만 멈춘다"는 증상을 앱 버그로 오진한다.`,
        `NAT 뒤 클라이언트 IP를 사용자 식별이나 rate limit 키로 그대로 써서 한 사무실이나 통신사 전체를 차단한다.`,
        `사용자가 입력한 URL을 서버가 가져오는 기능에서 사설·링크 로컬 대역(169.254.169.254 등)을 차단하지 않는다.`
      ]
    },
    {
      title: `UDP와 TCP: 연결, 재전송, 흐름 제어, 실패의 모양`,
      body: `전송 계층은 "호스트 사이" 배달을 "프로세스 사이" 대화로 바꿉니다. 포트 번호가 프로세스를 가리키고, 연결 하나는 (출발 IP, 출발 포트, 도착 IP, 도착 포트, 프로토콜)의 5-튜플로 식별됩니다.

### UDP와 TCP의 계약

**UDP**는 8바이트 헤더로 데이터그램을 던질 뿐 도착·순서·중복 제거를 약속하지 않지만 메시지 경계는 보존합니다. DNS, QUIC, 실시간 미디어가 씁니다. **TCP**(RFC 9293, STD 7)는 순서가 보장되고 재전송되는 **바이트 스트림**입니다. 스트림이라서 송신 한 번과 수신 한 번이 대응하지 않으며 메시지 경계는 애플리케이션이 만들어야 합니다(레슨 6).

### 연결의 시작과 끝

핸드셰이크는 SYN → SYN-ACK → ACK이고 양쪽이 임의의 초기 순번(ISN)을 교환합니다. 서버 커널은 SYN을 받으면 반개방 연결을 SYN 큐에 두고, 핸드셰이크가 끝나면 accept 큐로 옮겨 앱의 ‹accept()›를 기다립니다. 종료는 방향마다 FIN을 보내는 독립 절차(반닫기 가능)이고 RST는 즉시 중단입니다. 먼저 닫은 쪽은 **TIME_WAIT**에 머물러 늦게 도착한 옛 세그먼트가 새 연결에 섞이지 않게 합니다. 규격(RFC 9293 3.6.1)은 2×MSL(MSL은 2분으로 정의)을 요구하지만 리눅스 커널은 이 시간을 60초 상수(‹TCP_TIMEWAIT_LEN›)로 둡니다. 두 상태는 읽는 법이 다릅니다. TIME_WAIT가 수천 개인 것은 짧은 연결을 많이 닫는 쪽의 정상 모습이지만, **CLOSE_WAIT**가 쌓이면 상대가 FIN을 보냈는데 내 앱이 ‹close()›를 부르지 않는 누수 버그입니다.

### 신뢰성: ACK, 타이머, 재전송

수신자는 받은 바이트까지 누적 ACK를 보냅니다. 송신자는 RTT 평균과 편차로 재전송 타이머(RTO)를 계산하고 만료될 때마다 두 배로 늘립니다(RFC 6298, 초기값 1초). 그래서 실패의 모양이 시간으로 남습니다. 리눅스 문서 기준(2026-11 확인) ‹tcp_syn_retries›의 기본은 6회입니다. 옛 커널은 간격이 1+2+4+8+16+32+64 = 127초까지 늘어난 뒤에야 connect를 포기했고, ‹tcp_syn_linear_timeouts›(기본 4)가 있는 최신 커널은 처음 몇 번을 1초 간격으로 보내 약 131초 뒤에 포기합니다. 연결 뒤 데이터 재전송 한도(‹tcp_retries2›, 기본 15회)는 문서상 약 924.6초, 즉 15분 안팎입니다. 앱에 타임아웃이 없으면 죽은 상대를 몇 분씩 기다립니다. 중복 ACK 3개가 오면 타이머를 기다리지 않고 재전송합니다(빠른 재전송, RFC 5681).

### 흐름 제어: 수신자가 느릴 때

수신자는 헤더의 **윈도**로 "내 버퍼에 이만큼 더 받을 수 있다"를 알립니다. 윈도 스케일 옵션(RFC 7323)이 없으면 최대 65,535바이트라서 RTT 100ms에서 처리량이 약 5.2Mbps(65,535×8÷0.1)를 넘지 못합니다. 현대 OS는 자동으로 키우지만, 수신 앱이 느리면 윈도가 0까지 줄어 송신 쪽 ‹write()›가 막힙니다. "클라이언트 하나가 느려서 서버 스레드가 묶인다"는 장애는 이 백프레셔가 원인입니다.

### 작은 쓰기 지연과 keepalive

Nagle 알고리즘은 작은 쓰기를 모아 보내고 수신 쪽의 지연 ACK는 응답을 미루는데, 둘이 맞물리면 리눅스에서 약 40ms 멈춤이 생깁니다. 요청 하나를 ‹write› 두 번으로 쪼개지 말고(헤더와 본문을 합쳐서), 지연에 민감한 RPC는 ‹TCP_NODELAY›를 켭니다. TCP keepalive는 리눅스 기본이 유휴 7200초 뒤에 시작하고 75초 간격 프로브를 9번 보내는 방식이라, 수 분 안에 연결을 지우는 NAT·LB의 유휴 타임아웃을 막지 못합니다. 장기 연결에는 애플리케이션 수준 ping이나 더 짧은 keepalive 설정이 필요합니다. 마지막으로 end-to-end 논거를 떠올리세요. TCP ACK는 상대 커널이 받았다는 증거일 뿐이고 처리됐다는 증거는 애플리케이션 응답과 멱등 키가 줍니다.`,
      code: `import socket, threading, time

ready = []

def silent_server():
    srv = socket.socket()
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", 0))                  # 0 = 빈 포트를 커널이 고른다
    srv.listen(1)
    ready.append(srv.getsockname()[1])
    conn, _ = srv.accept()                      # 연결은 받지만 아무 응답도 보내지 않는다
    time.sleep(3)
    conn.close()
    srv.close()

threading.Thread(target=silent_server, daemon=True).start()
while not ready:
    time.sleep(0.01)

# connect 타임아웃(1초)과 read 타임아웃(0.5초)은 서로 다른 실패다
c = socket.create_connection(("127.0.0.1", ready[0]), timeout=1.0)
c.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)   # 작은 쓰기를 모으지 않고 즉시 전송
c.sendall(b"PING 1\\n")                                    # 헤더와 본문은 한 번에 쓴다
c.settimeout(0.5)
start = time.perf_counter()
try:
    c.recv(100)
except socket.timeout:
    print("read timeout after %.2fs: 연결은 ESTABLISHED, 응답만 없다" % (time.perf_counter() - start))
finally:
    c.close()`,
      codeLang: `python`,
      key: [
        `TCP는 메시지가 아니라 바이트 스트림이다. 경계는 애플리케이션이 길이 접두나 구분자로 만든다.`,
        `TIME_WAIT는 먼저 닫은 쪽의 정상 대기(리눅스 60초)이고, CLOSE_WAIT 누적은 앱이 close를 하지 않는 누수다.`,
        `RTO는 지수 백오프한다. 리눅스 기본에서 connect는 약 127~131초(커널 버전별), 연결 후 재전송은 약 15분 뒤에야 포기하므로 앱 타임아웃이 필수다.`,
        `수신 윈도 65,535바이트 × RTT 100ms면 최대 약 5.2Mbps다. 느린 수신자는 윈도 0으로 송신자를 막는다(백프레셔).`,
        `TCP keepalive 기본(7200초)은 NAT·LB 유휴 타임아웃보다 길어 무력하다. 애플리케이션 ping이나 짧은 설정을 쓴다.`
      ],
      pitfalls: [
        `connect·read·전체 요청 타임아웃을 구분하지 않거나 아예 두지 않아 죽은 상대를 수 분간 기다린다.`,
        `TIME_WAIT 개수만 보고 커널 파라미터부터 만진다. 먼저 연결을 왜 매번 새로 만드는지(풀링·keep-alive 부재)를 본다.`,
        `CLOSE_WAIT 누적을 네트워크 문제로 오진한다. 원인은 거의 항상 응답·연결 close를 빠뜨린 애플리케이션 코드다.`,
        `헤더와 본문을 write 두 번으로 나눠 보내 Nagle과 지연 ACK의 40ms 지연을 만든다.`
      ]
    },
    {
      title: `혼잡 제어, 처리량, 꼬리 지연`,
      body: `송신자는 망 전체가 얼마나 막혔는지 모릅니다. 혼잡 제어는 손실과 지연이라는 간접 신호로 "지금 보내도 되는 양"(혼잡 윈도, cwnd)을 스스로 조절해 망이 무너지는 것을 막는 알고리즘입니다. 실제로 나가는 양은 min(cwnd, 수신 윈도)입니다.

### 고전 모델 (RFC 5681)

- **slow start**: cwnd를 작게 시작해 ACK마다 늘려 RTT마다 약 2배가 됩니다. RFC 5681 자체의 초기값 상한은 2~4 MSS지만, 실험(Experimental) 규격인 RFC 6928이 제안한 10 MSS(약 14.6KB)를 리눅스 커널이 기본값(‹TCP_INIT_CWND›)으로 씁니다.
- **congestion avoidance**: ssthresh를 넘으면 RTT마다 1 MSS씩 늘립니다.
- **손실 반응**: 중복 ACK 3개(빠른 재전송·빠른 회복)면 ssthresh를 비행 중 데이터의 절반(최소 2 MSS)으로 낮추고 그 근처에서 이어 가며, 재전송 타임아웃이면 cwnd를 1 MSS로 급락시킵니다.

첫 RTT에 약 14.6KB가 나가므로 작은 API 응답은 연결이 막 생겼어도 한두 RTT에 끝나지만, 수백 KB 파일은 slow start를 몇 바퀴 돌아야 속도가 오릅니다. 새 연결이 비싼 이유는 핸드셰이크뿐 아니라 **cwnd가 다시 작아진다**는 점이고, 이것이 연결 재사용의 이득입니다.

### 손실과 RTT가 처리량을 정한다

Reno 계열의 정상 상태 처리량은 대략 (MSS ÷ RTT) × 1.22 ÷ √p (p는 손실률, 1.22는 √(3/2))로 근사됩니다(Mathis 모델). 지연 ACK처럼 가정이 달라지면 상수가 바뀌는 근사식이라 자릿수를 보는 용도입니다. MSS 1460바이트, RTT 100ms에서 손실 1%면 약 1.4Mbps, 0.01%면 약 14Mbps입니다. 회선이 1Gbps여도 해외 모바일 구간에서 연결 하나가 몇 Mbps에 머무는 이유입니다. Cubic 이후의 알고리즘은 이 식과 다르지만 "손실과 RTT가 대역폭만큼 중요하다"는 결론은 유지됩니다. 클라이언트 프로젝트에서는 해외 사용자의 대용량 다운로드나 업로드가 느릴 때 서버 증설 대신 CDN으로 RTT를 줄이거나, 연결을 여러 개로 나누거나, 같은 조건의 전후 측정으로 혼잡 제어를 비교하는 순서로 접근합니다.

### Cubic, BBR, 버퍼블로트

리눅스 일반 배포판의 기본은 Cubic입니다(손실 기반이되 윈도를 시간의 3차 함수로 키움). BBR은 병목 대역폭과 최소 RTT를 추정해 큐를 채우지 않고 보내려는 모델 기반 방식입니다. 라우터에 큰 버퍼가 있어 손실은 없는데 지연이 수백 ms로 부푸는 **버퍼블로트** 환경에서 유리할 수 있지만, 다른 흐름과의 공정성과 버전별 동작이 환경마다 달라서 ‹sysctl net.ipv4.tcp_congestion_control› 한 줄을 바꾸는 일은 쉬워도 효과는 같은 조건의 전후 측정으로만 판단합니다.

### 꼬리 지연: 평균은 거짓말을 한다

Dean과 Barroso의 "The Tail at Scale"의 핵심 산수입니다. 요청 하나가 서버 100대로 팬아웃되고 서버마다 1%의 응답이 느리다면, 요청이 느린 응답을 하나라도 맞을 확률은 1−0.99^100 ≈ 63%입니다. 그래서 평균이나 p50이 아니라 p95·p99로 보고, 팬아웃이 큰 경로일수록 개별 서버의 꼬리를 줄여야 합니다. 대응은 타임아웃과 재시도 설계로 이어집니다. 재시도는 멱등 요청에만, 지수 백오프와 지터를 섞어서, 전체 요청 대비 재시도 비율에 상한(재시도 예산)을 두고 합니다. 장애 중에 모든 클라이언트가 같은 간격으로 재시도하면 회복 중인 서버를 다시 쓰러뜨리는 재시도 폭풍이 됩니다. 늦는 요청을 다른 서버에도 보내 먼저 온 쪽을 쓰는 hedged 요청은 꼬리를 줄이는 대신 부하를 늘리는 거래입니다.

관측의 기본은 ‹ss -ti›(cwnd, rtt, retrans), ‹iperf3›, 지연·손실을 인위로 넣는 ‹tc netem›입니다.`,
      code: `import math

def aimd(rtts=24, iw=10, ssthresh=64, loss_at=(18,)):
    cwnd = float(iw)                       # 단위: MSS(약 1460바이트)
    for rtt in range(1, rtts + 1):
        print("RTT %2d  cwnd=%5.1f MSS  ssthresh=%.0f" % (rtt, cwnd, ssthresh))
        if rtt in loss_at:                 # 중복 ACK 3개로 손실 감지: 절반으로
            ssthresh = max(cwnd / 2, 2)
            cwnd = ssthresh
        elif cwnd < ssthresh:              # slow start: RTT마다 약 2배
            cwnd = min(cwnd * 2, ssthresh)
        else:                              # congestion avoidance: RTT마다 +1 MSS
            cwnd += 1

aimd()                                     # 10 -> 20 -> 40 -> 64 -> 65 ... 78, 손실 후 39 -> 40 ...

def mathis_mbps(p, mss=1460, rtt=0.1):     # Reno 계열의 정상 상태 처리량 근사
    return mss * 8 / rtt * 1.22 / math.sqrt(p) / 1e6

for p in (0.01, 0.0001):
    print("loss=%.2f%%  ->  %.2f Mbit/s" % (p * 100, mathis_mbps(p)))   # 1.42, 14.25

# 팬아웃 꼬리: 서버 100대에 요청을 흩뿌릴 때 느린 응답을 하나라도 만날 확률
print("%.3f" % (1 - 0.99 ** 100))           # 0.634`,
      codeLang: `python`,
      key: [
        `전송량은 min(cwnd, 수신 윈도)다. slow start는 RTT마다 2배, congestion avoidance는 RTT마다 +1 MSS, 손실 시 절반(타임아웃이면 1 MSS)이다.`,
        `초기 윈도 10 MSS(약 14.6KB) 때문에 작은 응답은 1~2 RTT에 끝나고, 새 연결은 cwnd가 다시 작아서 비싸다.`,
        `Reno 계열 처리량은 (MSS/RTT) × 1.22/√p로 근사되어 손실률과 RTT가 대역폭만큼 중요하다.`,
        `버퍼블로트는 손실 없이 지연이 부푸는 현상이고, 혼잡 제어 알고리즘 교체 효과는 전후 측정으로만 판단한다.`,
        `팬아웃 100대에서 서버 1%가 느리면 요청의 약 63%가 느린 응답을 만난다. p95·p99와 재시도 예산, 지터, hedged 요청으로 다룬다.`
      ],
      pitfalls: [
        `평균 지연이나 p50만 보고 "문제없다"고 보고한다. 사용자 체감은 꼬리가 결정한다.`,
        `장애 중 모든 클라이언트가 고정 간격으로 무제한 재시도하게 만들어 재시도 폭풍으로 회복을 막는다.`,
        `BBR로 바꾸면 빨라진다는 글만 믿고 측정 없이 운영 서버의 sysctl을 바꾼다.`,
        `iperf3 같은 단일 연결 처리량 측정을 "회선 대역폭"으로 해석한다. 연결 하나는 손실·RTT·윈도에 묶인다.`
      ]
    },
    {
      title: `DNS: 이름이 풀리는 길과 장애 패턴`,
      body: `DNS는 이름을 값(주소 등)으로 바꾸는 전 세계 분산 데이터베이스이고 거의 모든 연결의 첫 단계입니다. 그래서 DNS 장애는 "서비스가 통째로 사라진 것"처럼 보입니다.

### 누가 누구에게 묻는가

앱(스텁 리졸버)은 OS에 설정된 **재귀 리졸버**(회사·통신사·공용 DNS)에 한 번 묻습니다. 재귀 리졸버는 캐시에 없으면 루트 → TLD(.com, .kr) → 해당 도메인의 **권한 서버** 순서로 위임을 따라가 답을 얻고 TTL 동안 캐시합니다. 어느 구간이 느리거나 틀린지는 ‹dig +trace›로 위임 사슬을 따라가 봅니다. 앱이 실제로 쓰는 경로(‹/etc/hosts›, ‹nsswitch›, 리졸버 설정)는 ‹getent hosts›가 재현하고 ‹dig›는 그 경로를 우회한다는 점이 자주 헷갈립니다.

### 메시지와 레코드

DNS 메시지(RFC 1035)는 12바이트 헤더(ID, 플래그, 질문·답변·권한·추가 레코드 수)와 네 섹션으로 이루어집니다. 플래그에는 응답 여부(QR), 권한 응답(AA), **절단(TC)**, 재귀 요청(RD)·가능(RA), 응답 코드(RCODE)가 있습니다. 같은 도메인 이름이 반복되므로 뒤쪽은 앞 이름을 가리키는 14비트 포인터로 줄이는 이름 압축을 씁니다. 자주 만나는 레코드는 A·AAAA(주소), CNAME(별칭. 같은 이름의 다른 레코드와 공존할 수 없어 루트 도메인에는 못 쓰고 사업자의 ALIAS 기능으로 우회), NS, MX, TXT(SPF·소유 검증), SOA, PTR입니다. 최근에는 HTTPS 레코드(SVCB, RFC 9460)로 h2·h3 지원을 알리기도 합니다.

### UDP 512바이트와 TCP 폴백

기본은 UDP 53이고 원래 응답은 512바이트까지였습니다. EDNS(0)(RFC 6891)가 더 큰 UDP 응답을 허용합니다. 이 규격은 4096바이트를 출발점으로 제안하고, 응답이 사라지면 1280~1410바이트 안팎으로, 마지막에는 512바이트로 내려가라고 설명합니다. 그래도 넘치면 서버는 TC 비트를 세워 잘라 보내고, 클라이언트는 같은 질의를 TCP 53으로 다시 보냅니다. 그래서 "TCP 53은 필요 없다"며 막은 방화벽이 큰 TXT·DNSSEC 응답에서만 간헐 장애를 만듭니다.

### TTL, 음성 캐시, 전환 절차

TTL은 캐시가 답을 쥐고 있어도 되는 시간입니다. 이름이 없다는 답(NXDOMAIN)도 SOA의 TTL과 MINIMUM 필드 중 작은 값만큼 캐시되므로(RFC 2308), 새 호스트를 만들기 직전에 조회해 본 이름이 한동안 안 보이는 일이 생깁니다. IP를 옮기는 정석은 (1) 기존 TTL만큼 앞서 TTL을 낮추고, (2) 전환하고, (3) 구 서버를 TTL 이상 유지하다가, (4) 안정되면 TTL을 올리는 것입니다. TTL을 줄여도 JVM·일부 HTTP 클라이언트·장기 연결 풀은 이름을 자체 캐시에 오래 쥐므로 전환 계획에는 클라이언트 쪽 캐시 정책 확인이 들어가야 합니다.

### 실무에서 자주 터지는 곳

응답 코드를 구분합니다. NOERROR인데 답이 비면(NODATA) 이름은 있으나 그 타입이 없다는 뜻이고, NXDOMAIN은 이름 자체가 없음, SERVFAIL은 해석 실패(DNSSEC 검증 실패 포함)입니다. 쿠버네티스 파드의 기본 ‹resolv.conf›(공식 문서의 예시, 2026-11 확인)는 ‹ndots:5›라서 점이 5개 미만인 이름(예: api.example.com)은 search 도메인을 붙인 질의를 여러 번 보낸 뒤에야 원래 이름을 질의합니다. 외부 도메인 호출이 많은 서비스는 이름 끝에 점을 붙이거나 ‹ndots›를 조정해 질의 수를 줄입니다. ‹getaddrinfo›는 A와 AAAA를 함께 묻고, 듀얼 스택에서는 Happy Eyeballs(RFC 8305)로 IPv6와 IPv4를 경주시켜(연결 시도 간격 기본 250ms, IPv4 응답이 먼저 왔을 때 AAAA를 기다리는 시간 50ms를 권고) 한쪽이 막힌 환경의 지연을 숨깁니다.`,
      code: `import random, socket, struct

def read_name(msg, pos):                          # 이름 압축(RFC 1035 4.1.4) 해석
    labels, end = [], None
    for _ in range(128):                          # 포인터 루프 방지
        n = msg[pos]
        if n == 0:
            return ".".join(labels), end or pos + 1
        if n & 0xC0 == 0xC0:                      # 상위 2비트 11 = 압축 포인터
            end = end or pos + 2
            pos = ((n & 0x3F) << 8) | msg[pos + 1]
        else:
            labels.append(msg[pos + 1:pos + 1 + n].decode())
            pos += 1 + n
    raise ValueError("compression loop")

def ask(name, server="1.1.1.1"):
    q = struct.pack("!HHHHHH", random.randrange(65536), 0x0100, 1, 0, 0, 0)   # RD=1, QDCOUNT=1
    q += b"".join(bytes([len(p)]) + p.encode() for p in name.split(".")) + b"\\x00"
    q += struct.pack("!HH", 1, 1)                 # QTYPE=A, QCLASS=IN
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.settimeout(2)
        s.sendto(q, (server, 53))
        msg, _ = s.recvfrom(4096)
    _, flags, qd, an, _, _ = struct.unpack("!HHHHHH", msg[:12])
    print("TC:", bool(flags & 0x0200), "RCODE:", flags & 0xF, "answers:", an)   # TC=1이면 TCP로 재질의
    pos = 12
    for _ in range(qd):
        _, pos = read_name(msg, pos)
        pos += 4                                  # QTYPE + QCLASS
    for _ in range(an):
        owner, pos = read_name(msg, pos)
        rtype, _, ttl, rdlen = struct.unpack("!HHIH", msg[pos:pos + 10])
        rdata = msg[pos + 10:pos + 10 + rdlen]
        pos += 10 + rdlen
        if rtype == 1:
            print(owner, ttl, socket.inet_ntoa(rdata))
        elif rtype == 5:
            print(owner, ttl, "CNAME", read_name(msg, pos - rdlen)[0])

ask("www.example.com")`,
      codeLang: `python`,
      key: [
        `해석은 스텁 → 재귀 리졸버 → 루트/TLD/권한 서버 순이며 모든 단계가 TTL만큼 캐시된다. dig +trace로 위임 사슬을, getent hosts로 앱과 같은 경로를 본다.`,
        `UDP 512바이트(EDNS로 확장) 초과 시 TC 비트로 절단하고 클라이언트는 TCP 53으로 재질의한다. TCP 53을 막으면 간헐 장애가 난다.`,
        `NXDOMAIN도 캐시된다(음성 캐시). IP 전환은 기존 TTL만큼 앞서 TTL을 낮추고, 전환 후 구 서버를 TTL 이상 유지한다.`,
        `CNAME은 같은 이름의 다른 레코드와 공존하지 못하고 루트 도메인에 쓸 수 없다.`,
        `NODATA, NXDOMAIN, SERVFAIL을 구분하고, 쿠버네티스의 ndots:5 같은 resolv.conf 설정이 질의 수와 지연을 키운다는 점을 안다.`
      ],
      pitfalls: [
        `TTL만 낮추고 클라이언트(JVM, HTTP 클라이언트, 연결 풀)의 자체 DNS 캐시를 확인하지 않아 전환 뒤에도 옛 IP로 트래픽이 간다.`,
        `dig 결과가 정상이라 DNS가 문제없다고 결론짓는다. 앱은 hosts, nsswitch, 컨테이너 resolv.conf를 거치므로 getent로도 확인해야 한다.`,
        `방화벽에서 TCP 53을 막아 큰 응답(TXT, DNSSEC)만 간헐적으로 실패시킨다.`,
        `전환 직전에야 TTL을 낮춰 이미 길게 캐시된 응답이 만료되기를 기다리지 않는다.`
      ]
    },
    {
      title: `소켓, I/O 다중화, HTTP/1.1, 스트리밍`,
      body: `서버 프로그래밍의 바닥은 소켓 API입니다. 서버는 ‹socket›→‹bind›→‹listen›→‹accept›, 클라이언트는 ‹socket›→‹connect›를 부르고 이후는 파일 서술자(fd)에 ‹read›·‹write›하는 것과 같습니다. Beej's Guide 같은 무료 C 소켓 가이드로 한 번 직접 짜 보면 아래 현상이 몸에 붙습니다.

### 바이트 스트림과 프레이밍

TCP에서는 ‹send› 한 번이 ‹recv› 한 번과 짝지어지지 않습니다. 작은 두 번이 한 번에 합쳐 오기도 하고 큰 한 번이 여러 번에 쪼개져 오기도 합니다. 그래서 모든 TCP 프로토콜은 경계를 스스로 정합니다. 길이 접두(4바이트 길이 뒤 본문), 구분자(개행), HTTP의 ‹Content-Length›나 chunked가 그 방법이고, 어느 쪽이든 "완성될 때까지 반복해서 읽는" 루프가 필요합니다.

### listen 큐: 연결이 앱에 닿기 전

서버 커널은 SYN 큐와 accept 큐를 갖습니다. 앱이 ‹accept›를 따라가지 못하면 accept 큐가 차고 새 연결은 무시되거나 지연되어 클라이언트에는 connect 타임아웃으로 보입니다. 앱 로그에는 흔적이 없다는 점이 특징입니다. ‹ss -ltn›에서 LISTEN 소켓의 Recv-Q는 현재 대기 수, Send-Q는 큐 한도이며 한도는 ‹listen(backlog)›와 ‹net.core.somaxconn› 중 작은 값입니다(somaxconn 기본값은 리눅스 5.4부터 4096, 그 이전 128). 큐가 가득 차면 클라이언트가 ECONNREFUSED를 받거나 서버가 SYN이나 마지막 ACK를 버려 클라이언트의 재시도에 맡기는 식으로 동작하며, ListenOverflows·ListenDrops 카운터(‹nstat -az›)가 올라갑니다.

### 동시 연결을 다루는 모델

스레드가 연결 하나씩 맡으면 코드는 단순하지만 연결이 수천 개가 되면 메모리와 컨텍스트 스위치가 문제입니다. 이벤트 루프는 ‹epoll›로 "읽을 준비가 된 fd"만 받아 한 스레드가 수만 연결을 다룹니다(‹select›·‹poll›은 매번 전체 목록을 훑는 O(n)). nginx, Node.js, asyncio, Netty가 이 구조입니다. 대가는 **콜백 안에서 막으면 모든 연결이 멈춘다**는 점입니다. 동기 DNS 조회, 파일 읽기, 긴 CPU 연산, 블로킹 DB 드라이버 한 줄이 전체 지연을 만듭니다. 한도도 있습니다. fd 수(‹ulimit -n›)와, 클라이언트 쪽 임시 포트 범위(리눅스 기본 32768~60999, 약 28,000개)입니다. 같은 목적지로 요청마다 새 연결을 만들고 닫으면 TIME_WAIT 60초가 쌓여 초당 약 470개(28,232÷60)에서 포트가 고갈되고 ‹Cannot assign requested address›가 납니다. 해법은 포트 범위 확대가 아니라 연결 풀과 keep-alive입니다.

### HTTP/1.1과 URI

HTTP/1.1은 시작줄, 헤더, 빈 줄, 본문의 텍스트 프로토콜이고 연결은 기본 지속입니다. 본문 길이는 ‹Content-Length›나 chunked로 알리는데, 프록시와 백엔드가 이 둘을 다르게 해석하면 요청 밀수(request smuggling)가 되므로 모호한 요청은 거부하고 프록시를 최신으로 유지합니다(RFC 9112). 한 연결에서 응답은 요청 순서대로만 나가 앞의 느린 응답이 뒤를 막기 때문에 파이프라이닝은 사실상 쓰이지 않고 브라우저는 호스트당 연결을 6개 안팎(브라우저마다 다름)으로 엽니다. 본문이 JSON이면 RFC 8259가 교환용 텍스트는 UTF-8이어야 하고, 같은 이름의 중복 키는 파서마다 결과가 달라지니 기대지 말며, 2^53−1을 넘는 정수는 배정밀도 부동소수점 파서(JavaScript 등)에서 정밀도가 깨질 수 있다고 경고하므로 큰 ID는 문자열로 주고받습니다. URI(RFC 3986)는 scheme, authority, path, query, fragment로 구성되고 fragment는 서버로 가지 않으며, 퍼센트 인코딩과 정규화를 파서마다 다르게 구현하면 우회와 SSRF 버그가 됩니다.

### 스트리밍: SSE와 WebSocket

LLM 응답처럼 서버가 조금씩 밀어 주는 데이터에는 두 선택지가 있습니다. **SSE**는 일반 HTTP 응답 하나를 길게 열어 ‹text/event-stream›으로 이벤트를 흘리고, 브라우저의 ‹EventSource›는 끊기면 ‹Last-Event-ID›로 자동 재연결합니다. 단방향이라 기존 인증·프록시와 잘 맞아 토큰 스트리밍의 기본 후보입니다. **WebSocket**(RFC 6455)은 HTTP ‹Upgrade›로 101을 받은 뒤 양방향 프레임을 주고받으며 클라이언트 프레임은 마스킹합니다. 운영 함정은 같습니다. 프록시 버퍼링이 켜져 있으면 토큰이 모였다가 한꺼번에 나오고, 유휴 타임아웃이 연결을 끊고, 클라이언트가 떠난 뒤에도 서버가 생성을 계속해 비용이 샙니다. 버퍼링을 끄고(‹X-Accel-Buffering: no›), 15초 안팎(SSE 규격이 예로 든 주기)마다 주석 줄(‹: ping›)을 보내 연결을 살려 두고, 끊김을 감지해 생성을 취소합니다.`,
      code: `import selectors, socket

sel = selectors.DefaultSelector()               # 리눅스에서는 epoll
srv = socket.socket()
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(("127.0.0.1", 8080))
srv.listen(128)
srv.setblocking(False)
sel.register(srv, selectors.EVENT_READ)
bufs = {}

BODY = b"hello\\n"
RESP = (b"HTTP/1.1 200 OK\\r\\nContent-Type: text/plain\\r\\n"
        b"Content-Length: " + str(len(BODY)).encode() + b"\\r\\n\\r\\n" + BODY)

def close(conn):
    sel.unregister(conn)
    bufs.pop(conn, None)
    conn.close()

while True:
    for key, _ in sel.select():
        sock = key.fileobj
        if sock is srv:
            conn, _ = srv.accept()
            conn.setblocking(False)
            sel.register(conn, selectors.EVENT_READ)
            bufs[conn] = b""
            continue
        try:
            data = sock.recv(4096)
            bufs[sock] += data
            while b"\\r\\n\\r\\n" in bufs[sock]:     # 빈 줄 = 요청 하나의 끝 (본문 없는 GET만 지원)
                _, bufs[sock] = bufs[sock].split(b"\\r\\n\\r\\n", 1)
                sock.sendall(RESP)               # 데모용: 작은 응답이라 sendall을 허용
        except ConnectionError:                  # RST 등: 읽기든 쓰기든 연결이 죽었다
            data = b""
        if not data:                             # 상대가 FIN(또는 RST)을 보냈다
            close(sock)`,
      codeLang: `python`,
      key: [
        `TCP 읽기는 메시지 단위가 아니다. 길이 접두, 구분자, Content-Length 같은 프레이밍과 완성까지 반복 읽기가 필요하다.`,
        `accept 큐가 차면 앱 로그 없이 클라이언트만 connect 타임아웃을 본다. ss -ltn의 Recv-Q와 Send-Q로 확인한다.`,
        `epoll 이벤트 루프는 소수 스레드로 다수 연결을 다루지만 콜백 안의 블로킹 호출 하나가 전체를 멈춘다.`,
        `임시 포트(기본 약 28,000개)와 TIME_WAIT 60초로 같은 목적지로의 새 연결은 초당 약 470개가 한계다. 해법은 연결 재사용이다.`,
        `SSE는 단방향 HTTP 스트림(Last-Event-ID 재연결)이고 WebSocket은 Upgrade 후 양방향이다. 둘 다 프록시 버퍼링과 유휴 타임아웃을 다뤄야 한다.`
      ],
      pitfalls: [
        `recv 한 번이 메시지 하나라고 가정해 로컬 테스트에서는 되다가 운영 부하에서 JSON이 잘리거나 붙는다.`,
        `이벤트 루프 서버(Node, asyncio)에서 동기 파일 읽기, CPU 연산, 블로킹 라이브러리를 호출해 전체 지연이 튄다.`,
        `SSE·WebSocket 경로에 프록시 버퍼링과 기본 60초 안팎의 read timeout을 그대로 두어 스트림이 모였다 나오거나 끊긴다.`,
        `포트 고갈을 ephemeral 포트 범위나 tcp_tw 계열 파라미터 조정으로만 해결하고 연결 풀 부재라는 원인을 방치한다.`
      ]
    },
    {
      title: `TLS 1.3와 인증서: 핸드셰이크, 전방 비밀성, 운영 기준`,
      body: `TLS는 TCP(또는 QUIC) 위에서 기밀성, 무결성, 서버 인증을 제공합니다. HTTPS는 HTTP를 TLS 위에 올린 것이고 HTTP 자체는 바뀌지 않습니다.

### TLS 1.3 핸드셰이크: 1-RTT

RFC 8446의 흐름입니다.

1. 클라이언트가 ‹ClientHello›를 보냅니다. 지원 버전(‹supported_versions› 확장, 옛 필드 ‹legacy_version›은 0x0303 고정), 암호군, 서버 이름(SNI), 지원 프로토콜 목록(ALPN, 예: h2·http/1.1), 그리고 (EC)DHE 공개값(‹key_share›)을 미리 담습니다.
2. 서버는 ‹ServerHello›로 선택한 값과 자기 공개값을 답합니다. 이 시점에 양쪽이 같은 비밀을 계산할 수 있어 이후 모든 핸드셰이크 메시지(‹EncryptedExtensions›, ‹Certificate›, ‹CertificateVerify›, ‹Finished›)는 암호화됩니다. ‹CertificateVerify›는 서버가 인증서의 개인키를 가졌다는 서명 증명입니다.
3. 클라이언트가 ‹Finished›를 보내면 끝입니다. 서버 Finished를 받은 클라이언트는 바로 요청을 보내므로 TCP 핸드셰이크 뒤 1 RTT만 더 쓰고, 보통 2 RTT인 TLS 1.2보다 한 바퀴 빠릅니다.

키는 공유 비밀과 핸드셰이크 기록의 해시에서 HKDF로 단계별로 뽑습니다. TLS 1.3은 정적 RSA·정적 DH 키 교환, AEAD가 아닌 암호, 압축, 재협상을 없애고 항상 (EC)DHE를 쓰므로 **전방 비밀성**이 기본입니다. 서버 개인키가 나중에 유출돼도 이미 녹화된 과거 트래픽은 풀리지 않습니다.

### 재개와 0-RTT

서버가 준 세션 티켓(PSK)으로 다음 접속은 인증서 단계를 건너뜁니다. **0-RTT**는 한 걸음 더 나아가 첫 비행에 응용 데이터를 실어 왕복 하나를 아끼지만 대가가 있습니다. 전방 비밀성이 없고, 공격자가 같은 0-RTT 데이터를 다시 보내는 **재생(replay)**을 TLS가 막아 주지 못합니다. 그래서 결제·주문 같은 비멱등 요청에는 쓰지 않고, 서버가 명시적으로 허용한 멱등 GET에 한정합니다(RFC 8446, RFC 9325 3.10의 경고). HTTP에서는 RFC 8470이 프록시가 early data로 받은 요청에 붙이는 ‹Early-Data› 헤더와, 오리진이 "핸드셰이크가 끝난 뒤 다시 보내라"고 요구하는 상태 코드 425 Too Early를 정의합니다.

### 인증서 체인과 현장 장애

서버는 leaf 인증서와 중간 CA 인증서(fullchain)를 보내고, 클라이언트는 신뢰하는 루트까지 서명 사슬을 검증합니다. 호스트명은 인증서의 SAN(Subject Alternative Name)과 맞춰 보며 CN은 쓰지 않습니다. 자주 나는 사고는 이렇습니다.

- 중간 인증서 누락: 브라우저는 AIA로 보충해 되는데 curl·Java·Python만 ‹unable to get local issuer certificate›로 실패합니다.
- 만료: 가장 흔하고 가장 막기 쉬운 장애입니다. CA/Browser Forum의 SC-081 결정(Baseline Requirements 6.3.2)으로 공개 서버 인증서의 최대 유효기간이 398일에서 단계적으로 줄어듭니다. 2026-03-15 이후 발급분은 200일, 2027-03-15 이후는 100일, 2029-03-15 이후는 47일이며(2026-11 확인) 지금은 200일 단계입니다. 수동 갱신 운영은 곧 장애 달력이므로 ACME 자동 갱신과 만료 경보(30·14·7일 전)를 기본으로 둡니다.
- SNI 없이 접속하면 기본 인증서가 와서 호스트명 불일치가 납니다.
- 서버 시계 오차로 "아직 유효하지 않음"이 납니다.

### 협상과 운영 기준

ALPN으로 TLS 안에서 h2와 http/1.1 중 고릅니다. 운영 기준선은 RFC 8996(TLS 1.0/1.1 폐기, 2021-03)과 RFC 9325(BCP 195, 2022-11)입니다. RFC 9325는 TLS 1.2 지원 필수, 1.3 지원 권장(지원하면 우선 협상), ECDHE와 AEAD(AES-GCM 등), RSA·DHE 2048비트 이상, 0-RTT는 해당 프로토콜의 명시 규격이 있을 때만 쓰라고 요구합니다. TLS를 어디서 끝낼지(CDN, LB, 앱)도 결정 사항입니다. 종료 뒤 구간이 평문이면 그 구간이 신뢰 경계 안이어야 하고, 서비스 간 통신은 mTLS로 양방향 인증을 하기도 합니다.`,
      code: `import socket, ssl, time

def inspect(host, port=443):
    ctx = ssl.create_default_context()           # 시스템 CA 사용, 호스트명 검증 켜짐
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    ctx.set_alpn_protocols(["h2", "http/1.1"])
    with socket.create_connection((host, port), timeout=5) as raw:
        with ctx.wrap_socket(raw, server_hostname=host) as tls:   # SNI + 호스트명 검증
            cert = tls.getpeercert()
            left = (ssl.cert_time_to_seconds(cert["notAfter"]) - time.time()) / 86400
            sans = [v for k, v in cert["subjectAltName"] if k == "DNS"]
            print("version:", tls.version(), "| cipher:", tls.cipher()[0])
            print("alpn   :", tls.selected_alpn_protocol())
            print("SAN    :", sans[:3])
            print("expires: %.0f days left" % left)
            return left

try:
    if inspect("example.com") < 14:
        print("ALERT: renew now")
except ssl.SSLCertVerificationError as e:
    # 중간 인증서 누락, 호스트명 불일치, 만료가 여기로 온다
    print("verify failed:", e.verify_message)`,
      codeLang: `python`,
      key: [
        `TLS 1.3은 ClientHello(key_share) → ServerHello 이후 전부 암호화 → Finished로 1-RTT에 끝나며 항상 (EC)DHE라 전방 비밀성이 기본이다.`,
        `정적 RSA/DH, 비-AEAD 암호, 압축, 재협상은 TLS 1.3에서 제거되었다. 버전 협상은 supported_versions 확장으로 한다.`,
        `0-RTT는 전방 비밀성이 없고 재생될 수 있으므로 비멱등 요청에는 쓰지 않는다.`,
        `호스트명 검증은 SAN으로 하며, 서버는 leaf와 중간 CA를 함께 보내야 한다. 중간 인증서 누락은 브라우저에서만 숨겨진다.`,
        `운영 기준은 TLS 1.2 필수·1.3 권장, 1.0/1.1 비활성(RFC 8996), ECDHE와 AEAD(RFC 9325)이며 인증서 최대 수명이 2026-03-15부터 200일로 줄어든 흐름(2026-11 확인)에 맞춰 ACME 자동화와 만료 경보를 둔다.`
      ],
      pitfalls: [
        `브라우저에서만 테스트해 중간 인증서 누락을 놓치고, 모바일 앱·Java 클라이언트·웹훅 호출 쪽에서 장애가 난다.`,
        `CDN이나 LB에서 0-RTT를 켜 두고 결제·주문 POST 경로에 대한 영향을 검토하지 않는다.`,
        `인증서를 수동으로 갱신하고 달력에만 적어 둔다. 담당자 교체나 휴가 중에 만료가 난다.`,
        `테스트가 안 된다며 인증서 검증을 끄고(verify=False, curl -k) 운영 코드에 남긴다.`
      ]
    },
    {
      title: `HTTP/2, QUIC, HTTP/3: 다중화와 head-of-line blocking`,
      body: `HTTP/1.1은 연결 하나에서 응답이 순서대로만 나가 느린 응답이 뒤를 막고(HTTP HoL), 요청마다 같은 헤더(쿠키 등)를 되풀이하며, 병렬성을 얻으려 연결을 여럿 열면 연결마다 핸드셰이크와 slow start를 따로 치릅니다. HTTP/2와 HTTP/3는 이 문제를 푸는 시도이고, **의미(메서드·상태 코드·헤더)는 RFC 9110 그대로**이며 바뀌는 것은 전달 방식입니다.

### HTTP/2 (RFC 9113)

연결 하나(TCP+TLS) 안에 **스트림**을 여러 개 다중화하고 모든 것이 바이너리 프레임입니다. 프레임 헤더는 9옥텟(길이 24비트, 타입 8, 플래그 8, 예약 1과 스트림 ID 31비트)이고 클라이언트가 시작한 스트림은 홀수 ID입니다. 흐름 제어는 스트림별·연결별 크레딧 방식이며 초기 윈도는 65,535바이트라서, RTT가 크고 응답이 큰 경로에서는 WINDOW_UPDATE 왕복이 병목이 되어 서버·프록시가 윈도를 키웁니다. 동시 스트림 수 설정은 100 이상이 권장됩니다. **HPACK**은 이전 요청과 같은 헤더를 인덱스로 줄이는 표(기본 4,096옥텟)를 양쪽이 상태로 공유합니다. 압축 크기 변화로 비밀을 추측하는 공격이 있어 민감 헤더를 인덱싱하지 않는 등 설계가 얽혀 있으니 직접 구현하지 않습니다. 우선순위는 RFC 7540의 트리 방식이 폐기되고 Priority 헤더(urgency 0~7, 기본 3, RFC 9218)로 바뀌었습니다. 2023-10의 Rapid Reset(CVE-2023-44487)처럼 스트림을 열자마자 취소하기를 반복해 서버를 소진시키는 공격이 있었으므로 서버·프록시를 최신으로 유지하고 스트림 리셋 속도를 제한합니다.

### TCP 위의 한계

h2는 응용 계층에서 스트림을 나눴지만 아래는 하나의 TCP 바이트 스트림입니다. 패킷 하나가 손실되면 그 뒤에 도착한 다른 스트림의 데이터도 커널이 순서를 맞출 때까지 앱에 올라오지 못합니다. 손실이 있는 모바일 환경에서는 연결 여러 개를 쓰던 h1보다 p99가 나빠질 수 있습니다.

### QUIC (RFC 9000, 9001, 9002)

QUIC은 UDP 위에서 전송 기능을 사용자 공간에 다시 만든 프로토콜입니다.

- **독립 스트림**: 한 스트림의 손실이 다른 스트림을 막지 않습니다(스트림 내부는 순서 보장).
- **TLS 1.3 내장**: 핸드셰이크 메시지가 CRYPTO 프레임에 실리고 패킷 보호 키가 TLS 비밀에서 파생되어, 전송과 암호 핸드셰이크가 합쳐져 1 RTT에 끝납니다. 재방문은 0-RTT가 가능하며 재생 위험은 레슨 7과 같습니다.
- **Connection ID**: 연결을 IP·포트가 아닌 ID로 식별하므로 Wi-Fi에서 LTE로 바뀌어도 유지됩니다(마이그레이션은 클라이언트가 시작).
- **반증폭**: 주소 검증 전에 서버는 받은 바이트의 3배까지만 보낼 수 있어 클라이언트의 첫 데이터그램은 최소 1200바이트로 채웁니다.
- **손실 복구**(RFC 9002): 패킷 번호 공간별 ACK와 PTO를 쓰며 기본 혼잡 제어는 NewReno와 비슷합니다. 재전송 패킷도 새 번호를 받아 RTT 측정이 모호하지 않습니다.

대가는 분명합니다. UDP를 막는 망이 있어 폴백이 필수이고(RFC 9114는 QUIC이 막히면 TCP 기반 버전을 시도하라고 권고), 사용자 공간 처리라 서버 CPU 비용이 늘며, LB·방화벽·모니터링이 UDP 443과 QUIC을 이해해야 합니다. 배경 읽기로는 Google의 SIGCOMM 2017 논문(Chrome·YouTube 등에 대규모 배치한 경험 보고)이 좋고, 이 논문은 당시 QUIC이 인터넷 트래픽의 약 7%라고 추정했습니다.

### HTTP/3 (RFC 9114)와 도입 판단

HTTP/3는 요청 하나를 QUIC 스트림 하나에 대응시키고 헤더는 QPACK으로 압축하며 ALPN 값은 ‹h3›입니다. 클라이언트는 보통 처음에 TCP로 접속해 ‹Alt-Svc› 응답 헤더(또는 DNS HTTPS 레코드)로 h3 지원을 알게 되고 이후 UDP 443을 시도하며 실패하면 h2로 폴백합니다. W3Techs는 2026-11 기준 HTTP/3 사용 웹사이트를 약 41%, HTTP/2를 약 35%로 보고합니다. 두 페이지가 서로의 관계(중복 여부)를 설명하지 않고 사용자 트래픽 비율도 아니므로 합산하거나 순위처럼 비교하지 말고 "이미 대중화됐다"는 추세로만 읽으세요. h3의 이득은 손실·RTT가 큰 모바일·해외 구간과 연결 전환이 잦은 환경에서 두드러지고, 안정된 유선이나 같은 리전 구간에서는 차이가 작으며 서버 비용이 오릅니다. 서버 간 통신(gRPC)은 h2가 주류입니다. 결론은 "켠다/안 켠다"가 아니라 UDP 443 경로 확인, 폴백, 기준선 대비 A/B 측정입니다.`,
      code: `import struct

H2_TYPES = {0: "DATA", 1: "HEADERS", 3: "RST_STREAM", 4: "SETTINGS",
            6: "PING", 7: "GOAWAY", 8: "WINDOW_UPDATE"}

def parse_h2_frame_header(b):                    # RFC 9113 4.1: 9옥텟
    length = int.from_bytes(b[0:3], "big")       # 24비트 길이
    ftype, flags = b[3], b[4]
    stream_id = struct.unpack("!I", b[5:9])[0] & 0x7FFFFFFF   # 최상위 1비트는 예약
    return length, ftype, flags, stream_id

# SETTINGS 프레임: 길이 6, 타입 4, 플래그 0, 스트림 0,
# 본문 = (설정 ID 3 = MAX_CONCURRENT_STREAMS, 값 100)
sample = bytes([0, 0, 6, 4, 0, 0, 0, 0, 0]) + struct.pack("!HI", 3, 100)
length, t, flags, sid = parse_h2_frame_header(sample[:9])
print(length, H2_TYPES[t], flags, sid)           # 6 SETTINGS 0 0
print(struct.unpack("!HI", sample[9:15]))        # (3, 100)

def quic_varint(b):                              # RFC 9000: 상위 2비트가 길이(1/2/4/8바이트)
    n = 1 << (b[0] >> 6)
    v = b[0] & 0x3F
    for x in b[1:n]:
        v = (v << 8) | x
    return v, n

print(quic_varint(bytes([0x25])))                # (37, 1)
print(quic_varint(bytes([0x7B, 0xBD])))          # (15293, 2)`,
      codeLang: `python`,
      key: [
        `HTTP/2 프레임 헤더는 9옥텟(길이 24비트, 타입, 플래그, 예약 1비트+스트림 ID 31비트)이다. 클라이언트 스트림은 홀수이고 초기 흐름 제어 윈도는 65,535바이트다.`,
        `h2는 TCP 하나 위에서 다중화하므로 패킷 손실이 모든 스트림을 막는 TCP 수준 HoL이 남는다. QUIC은 스트림별로 독립시킨다.`,
        `QUIC은 UDP 위에서 TLS 1.3을 내장하고 Connection ID로 연결 마이그레이션을 지원하며, 주소 검증 전 3배 전송 제한 때문에 첫 데이터그램을 1200바이트 이상으로 채운다.`,
        `HTTP/3는 h3 ALPN, QPACK, Alt-Svc(또는 HTTPS 레코드) 발견과 h2 폴백을 쓴다. 의미는 RFC 9110 그대로다.`,
        `도입 판단은 UDP 443 경로, 폴백, 기준선 대비 A/B 측정이다. 채택 통계(W3Techs 2026-11)는 추세 참고용이다.`
      ],
      pitfalls: [
        `"HTTP/3가 항상 더 빠르다"고 약속한다. 안정된 유선·같은 리전에서는 차이가 작고 서버 CPU 비용은 늘어난다.`,
        `LB·방화벽·보안그룹이 UDP 443을 통과시키는지 확인하지 않고 h3만 켜서 폴백 지연이나 접속 실패를 만든다.`,
        `h1 시절의 도메인 샤딩, 스프라이트, 과도한 파일 병합 최적화를 h2/h3에서도 유지해 오히려 캐시 효율과 다중화 이득을 잃는다.`,
        `h2 서버·프록시를 오래된 버전으로 방치해 Rapid Reset 같은 알려진 취약점에 노출한다.`
      ]
    },
    {
      title: `로드밸런서, 리버스 프록시, CDN: 타임아웃과 재시도의 설계`,
      body: `로드밸런서(LB)와 프록시는 용량, 가용성, 무중단 배포, TLS 종료, 보호를 위해 클라이언트와 앱 사이에 들어갑니다. 대신 연결이 둘(클라이언트-프록시, 프록시-백엔드)로 쪼개져 타임아웃과 장애 지점이 늘어납니다.

### L4와 L7

**L4 LB**는 TCP/UDP 연결 단위로 백엔드를 고릅니다. 빠르고 HTTP를 몰라서 경로 라우팅·헤더 수정·재시도는 못 하며, 클라이언트 IP 보존은 방식에 따라 다릅니다(PROXY protocol로 전달하기도 함). **L7 LB·리버스 프록시**는 HTTP를 끝내고 백엔드로 새 연결을 맺어 경로·호스트·헤더 기반 라우팅, 재시도, 압축, WAF, 연결 풀링(백엔드 연결 수 절감)을 제공하지만 CPU와 지연이 더해집니다. 분산 알고리즘은 라운드로빈, 최소 연결, 가중치, 해시이고, 일관 해시는 서버가 늘고 줄 때 재배치를 최소화합니다. 스티키 세션은 편하지만 쏠림과 배포 중 세션 유실을 부르므로 상태는 Redis 같은 외부 저장소로 뺍니다.

### 헬스체크와 드레이닝

능동 체크는 주기적으로 ‹/healthz›를 호출하고, 수동 체크는 실제 요청의 실패를 셉니다(nginx 업스트림 기본은 10초 안에 1회 실패 시 10초 제외, max_fails·fail_timeout 문서 기준). 얕은 체크(프로세스 생존)와 깊은 체크(DB 연결)를 구분하세요. DB가 잠깐 느릴 때 깊은 체크로 모든 인스턴스가 동시에 빠지면 연쇄 장애가 됩니다. 배포·스케일 인 때는 새 요청을 끊고 진행 중 요청을 끝내는 **커넥션 드레이닝**과, 앱의 SIGTERM 처리(진행 중 요청 완료 후 종료)가 짝이어야 합니다.

### 502, 503, 504를 읽는 법

RFC 9110 기준으로 502는 게이트웨이가 업스트림에서 잘못된 응답을 받았거나 연결이 끊겼다는 뜻, 503은 일시적 과부하·점검(Retry-After 가능), 504는 업스트림 응답 시간 초과입니다. 502는 백엔드 크래시·재시작, 프로토콜 불일치, keepalive 경합을, 504는 느린 백엔드나 타임아웃 값 불일치를 먼저 의심합니다.

### 대표 장애: keepalive 경합

LB가 유휴 연결을 재사용하려는 바로 그 순간 백엔드가 그 연결을 닫으면 요청이 RST를 맞고 502가 납니다. AWS ALB 문서는 유휴 타임아웃 기본이 60초이고 앱의 유휴 타임아웃을 LB보다 크게 두라고 권고하며 이 경우의 502를 직접 언급합니다(2026-11 기준 문서 확인).

Node.js의 ‹server.keepAliveTimeout›은 문서상 기본 5초로 짧아 자주 걸립니다. 다만 최신 문서는 ‹http.createServer()› 옵션의 기본을 65초로 적어 같은 문서 안에서도 어긋나고(2026-11 확인), Node 22.19·24.6부터는 소켓이 ‹keepAliveTimeout›에 ‹keepAliveTimeoutBuffer›(기본 1초)를 더한 시간 뒤에 닫히므로 실제 값은 운영 중인 버전에서 직접 출력해 확인합니다. nginx 업스트림 keepalive의 유휴 시간(‹keepalive_timeout›, 문서 기준 기본 60초)도 같은 규칙으로 백엔드보다 짧아야 하고, 최신 nginx 문서는 1.29.7부터 업스트림 keepalive 연결 캐시가 기본(워커당 32개)으로 켜진다고 적으므로 직접 설정하지 않은 구성도 이 경합에 노출될 수 있습니다.

정리하면**유휴 연결 타임아웃은 바깥(LB)이 짧고 안쪽(백엔드)이 길게**, 반대로 **요청 처리 타임아웃은 안쪽이 짧고 바깥이 길게** 둡니다(안쪽이 먼저 정상 오류를 돌려주도록).

### 재시도, 클라이언트 IP, 스트리밍

nginx의 ‹proxy_next_upstream›은 기본이 ‹error timeout›이고, POST·PATCH 같은 비멱등 요청은 이미 업스트림에 전달된 뒤에는 다음 서버로 넘기지 않으며 ‹non_idempotent›로 명시해야만 허용됩니다(문서 기준). 결제 요청에 이를 켜면 중복 결제의 지름길이고 RFC 9110 9.2.2도 프록시가 비멱등 요청을 자동 재시도해서는 안 된다고 규정하므로 멱등 키를 씁니다. ‹X-Forwarded-For›는 클라이언트가 위조할 수 있어 신뢰하는 프록시가 덧붙인 값만 오른쪽부터 해석하고, 최외곽 프록시는 받은 값을 버리고 실제 연결 주소로 덮어씁니다. SSE·WebSocket 경로는 버퍼링을 끄고 read timeout을 늘리며, ALB 문서는 HTTP/2 PING 프레임을 지원하지 않아 유휴 타이머를 리셋하지 못한다고 적고 타임아웃 전에 최소 1바이트를 보내라고 안내하므로 주석 줄 같은 실제 데이터 바이트를 보냅니다. ALB는 클라이언트 연결의 수명(HTTP client keepalive duration, 기본 3600초)도 제한하므로 장시간 연결은 재연결을 전제로 설계합니다(2026-11 확인). CDN은 엣지 캐시·TLS 종료·DDoS 흡수를 맡지만 캐시 키와 ‹Vary›, 오리진 보호, 장애 시 우회 경로를 설계에 넣어야 합니다. 데이터센터 안은 leaf-spine 토폴로지에서 ECMP 해시로 흐름을 분산하며, 큰 흐름이 같은 경로에 쏠리는 현상이 지연 변동의 한 원인입니다(깊이는 참고 자료로).`,
      code: `upstream api_backend {
    server 10.0.1.11:8080 max_fails=2 fail_timeout=10s;
    server 10.0.1.12:8080 max_fails=2 fail_timeout=10s;
    keepalive 32;
    keepalive_timeout 55s;           # 백엔드 앱의 keep-alive 타임아웃(예: 65s)보다 반드시 짧게
}

server {
    listen 443 ssl;
    server_name api.example.com;
    ssl_certificate     /etc/ssl/api.example.com/fullchain.pem;   # leaf + 중간 인증서
    ssl_certificate_key /etc/ssl/api.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";                  # 업스트림 연결 재사용
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;   # 최외곽 프록시: 받은 값은 버린다
        proxy_connect_timeout 3s;
        proxy_read_timeout 30s;                          # 요청 처리 타임아웃: 안쪽 < 바깥
        proxy_next_upstream error timeout http_502 http_503;   # POST 등 비멱등은 기본적으로 재시도 안 함
        proxy_next_upstream_tries 2;
    }

    location /events {                                   # SSE (LLM 토큰 스트리밍 등)
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}`,
      codeLang: `nginx`,
      key: [
        `L4는 연결 단위로 빠르지만 HTTP를 모르고, L7은 경로·헤더 라우팅과 재시도·연결 풀링을 주는 대신 CPU와 지연을 더한다.`,
        `502는 업스트림의 잘못된 응답·연결 끊김, 503은 일시 과부하·점검, 504는 업스트림 시간 초과다. 숫자만으로 어느 구간을 볼지 정한다.`,
        `유휴 연결 타임아웃은 LB가 짧고 백엔드가 길게, 요청 처리 타임아웃은 안쪽이 짧고 바깥이 길게 둔다.`,
        `재시도는 멱등 요청에만 한다. nginx는 비멱등 요청을 기본적으로 다음 서버로 넘기지 않으며 non_idempotent로 풀면 중복 처리 위험이 생긴다.`,
        `헬스체크는 얕은 것과 깊은 것을 구분하고, 배포는 커넥션 드레이닝과 앱의 SIGTERM 처리로 마무리한다. X-Forwarded-For는 신뢰 경계 안에서만 해석한다.`
      ],
      pitfalls: [
        `백엔드 keep-alive 타임아웃을 기본값(수 초)으로 두고 LB 유휴 타임아웃을 60초로 두어 한산한 시간대에 간헐 502를 만든다.`,
        `깊은 헬스체크가 공용 DB 상태에 묶여 DB 지연 때 모든 인스턴스가 동시에 LB에서 빠지는 연쇄 장애를 만든다.`,
        `X-Forwarded-For의 맨 앞 값을 그대로 신뢰해 클라이언트가 보낸 위조 IP로 접근 제어나 rate limit을 우회당한다.`,
        `SSE·WebSocket 경로에 일반 API와 같은 버퍼링·타임아웃을 적용해 스트림이 끊기거나 몰아서 나온다.`
      ]
    },
    {
      title: `통합 사례: 관측 도구와 간헐적 502, 해외 첫 화면 지연`,
      body: `네트워크 문제의 어려움은 증상이 하나(느리다, 502)인데 원인이 여러 계층에 있다는 점입니다. 이 레슨은 진단 방법과 도구를 정리하고, 가공의 고객 사례 하나로 앞의 레슨을 묶습니다.

### 진단 방법: 층으로 나누고 증거로 줄인다

증상을 받으면 (1) 언제부터·얼마나 자주·누구에게(지역, 통신사, 기기)인지 범위를 적고, (2) 요청 경로를 클라이언트→DNS→CDN→LB→프록시→앱→DB로 그린 뒤, (3) 각 구간에 가설과 반증할 증거를 답니다. 설정을 만지기 전에 기준선을 저장하고, 한 번에 하나만 바꾸고, 전후를 같은 방법으로 잽니다. "타임아웃을 늘렸더니 좋아졌다"는 증거가 아니라 증상 가리기일 수 있습니다.

| 질문 | 도구 | 읽을 것 |
| 이름이 풀리고 누가 답하나 | dig, dig +trace | 상태, TTL, 응답 시간, 위임 사슬 |
| 경로와 손실 | mtr -rwc 100 | 홉별 손실률(마지막 홉 기준 판단) |
| 연결 상태 | ss -s, ss -tin | 상태별 개수, rtt, retrans, Recv-Q |
| TLS | openssl s_client | 프로토콜, 체인, 만료일, ALPN |
| HTTP 단계별 시간 | curl -w | namelookup, connect, appconnect, starttransfer |
| 패킷 증거 | tcpdump, Wireshark | SYN 재전송, RST, 윈도 0, TLS alert |

### tcpdump로 읽는 대표 패턴

- 같은 SYN만 간격을 늘려 가며 재전송(1초·2초·4초…, 최신 리눅스는 처음 몇 번을 1초로 둠): SYN이나 SYN-ACK이 닿지 않는 방화벽·보안그룹·라우팅 문제이거나 상대 accept 큐 포화입니다. 앱 로그가 아닌 곳을 봅니다.
- RST: 누가 어느 방향으로 보냈는지가 단서입니다(LB 유휴 타임아웃인지, 앱이 죽었는지).
- 수신 윈도 0: 수신 측 앱이 읽지 못합니다.
- 중복 ACK와 재전송이 많음: 경로 손실이고, 큰 패킷만 사라지면 MTU입니다.
- 패킷에는 개인정보가 담길 수 있으니 헤더만(‹-s 96›) 뜨고 범위와 보관 기간을 합의합니다.

### 사례: 쇼핑몰 앱의 간헐적 502와 해외 첫 화면 지연

(가공 시나리오이며 숫자는 예시입니다.) 모바일 쇼핑몰의 구성은 ALB → nginx → Node.js API이고 신고는 두 가지입니다. 하루 수십 건의 502(전체의 0.05%)와, 해외 사용자의 앱 첫 화면 3초입니다.

**502.** 시각 분포를 보니 한산한 새벽과 점심 직후, 즉 연결이 한동안 유휴였다가 재사용되는 때에 몰립니다. 백엔드 로그에 그 요청이 없다는 점은 요청이 앱에 닿기 전에 끊겼다는 단서입니다. 가설은 백엔드의 keep-alive 유휴 타임아웃이 짧아 LB가 이미 닫힌 연결을 쓴다는 것입니다(레슨 9). 확인은 백엔드에서 ‹tcpdump›로 서버의 FIN 직후 도착한 요청이 RST로 끝나는 시퀀스를 보고 Node 서버의 keepAliveTimeout 값을 읽는 것입니다. 조치는 연결이 두 구간이므로 구간마다 순서를 맞추는 것입니다. ALB→nginx 구간은 nginx의 클라이언트 쪽 keepalive_timeout이 ALB 유휴 타임아웃(60초)보다 긴지 확인하고, nginx→Node 구간은 nginx 업스트림 keepalive_timeout(60초)보다 Node의 keep-alive 유휴 시간을 길게(예: 65초) 둡니다. 재시도는 멱등 GET에만 허용하고 결제 POST는 멱등 키로 보호합니다. 검증은 같은 시간대의 502 비율과 1만 건 재현 테스트의 전후 비교입니다.

**첫 화면 3초.** curl의 시간 값은 **누적**임에 주의하며 해외 지점에서 쪼갰더니 namelookup 0.03, connect 0.18, appconnect 0.55, starttransfer 0.95초였다고 합시다. TCP 구간 0.15초는 RTT 약 150ms이고, TLS 구간 0.37초는 약 2 RTT에 연산을 더한 값이라 TLS 1.2의 흔적이며, 마지막 0.40초는 1 RTT와 서버 처리 약 0.25초입니다. 조치는 TLS 1.3 활성화로 1 RTT 절약, 연결 재사용과 HTTP/2, 정적 응답의 CDN, 필요하면 h3 A/B 측정입니다. 앱 서버 튜닝보다 왕복 수를 줄이는 편이 값쌉니다.

### 인계 문서

증상·범위, 타임라인, 가설-증거-결론 표, 변경 diff와 롤백 방법, 타임아웃 사다리 표(클라이언트·CDN·LB·nginx·앱·DB의 값), 모니터링 임계(5xx 비율, p95/p99, 인증서 만료일, CLOSE_WAIT·재전송률), 재발 시 런북. 이 문서가 고객이 다음 담당자에게 넘길 수 있는 최종 산출물입니다.`,
      code: `#!/usr/bin/env bash
# usage: ./probe.sh api.example.com   (본인 서버나 서면 허가를 받은 서버에만 사용)
host="$1"

echo "== DNS =="
dig +noall +answer +stats "$host" A | grep -E ' IN |Query time'

echo "== TLS =="
echo | openssl s_client -connect "$host:443" -servername "$host" -alpn h2 2>/dev/null \\
  | grep -E 'Protocol|Cipher is|ALPN|Verif'
echo | openssl s_client -connect "$host:443" -servername "$host" 2>/dev/null \\
  | openssl x509 -noout -enddate -subject

echo "== HTTP timing (10 runs, 값은 누적) =="
fmt='dns=%{time_namelookup} tcp=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total} code=%{http_code}\\n'
for i in $(seq 1 10); do
  curl -sS -o /dev/null -w "$fmt" "https://$host/"
done

echo "== sockets =="
ss -s
ss -tin state established '( dport = :443 )' | head -20`,
      codeLang: `bash`,
      key: [
        `진단은 범위 확정 → 요청 경로 그리기 → 구간별 가설과 반증 증거 → 최소 변경 → 같은 방법으로 전후 측정 순서다.`,
        `curl -w의 시간 값은 누적이다. 단계별 소요는 인접한 값의 차이로 구한다(tcp = connect - namelookup 등).`,
        `tcpdump 패턴: SYN 재전송은 도달 실패나 accept 큐, RST는 보낸 쪽 확인, 윈도 0은 수신 앱 정체, 큰 패킷만 실패는 MTU.`,
        `간헐 502는 발생 시각의 유휴 패턴과 FIN 직후 요청 시퀀스로 keepalive 경합을 확인한다.`,
        `인계 문서에는 타임아웃 사다리, 변경 diff와 롤백, 모니터링 임계, 런북이 들어간다.`
      ],
      pitfalls: [
        `증거 없이 타임아웃을 늘리거나 서버를 증설해 증상만 가린다.`,
        `curl -w 값을 단계별 소요로 착각해 TLS 시간을 과대 계산하고 엉뚱한 곳을 최적화한다.`,
        `운영 서버에서 전체 페이로드 tcpdump를 오래 돌리거나 승인 없이 캡처해 개인정보와 부하 문제를 만든다.`,
        `한 번의 캡처·측정으로 원인을 단정하고 재발 방지용 모니터링 없이 종료한다.`
      ]
    }
  ],
  labs: [
    {
      title: `한 요청의 타임라인을 재구성하고 RFC 조항으로 주석 달기`,
      scenario: `해외 사용자가 "앱 첫 화면이 느리다"고 불평하는 스타트업이 의뢰했습니다. 아직 서버 코드를 보기 전에, 본인이 고른 공개 HTTPS 사이트(본인 소유 서비스 또는 트래픽 부담이 작은 정적 사이트, 측정 요청은 총 100회 이하)에 대해 HTTPS 요청 한 건이 DNS, TCP, TLS, HTTP를 거치는 과정을 도구로 실측하고, 각 단계에 근거 RFC 조항을 단 1~2쪽 보고서를 만듭니다. 이 보고서는 이후 진단에서 "어느 단계가 몇 ms인가"를 말하는 기준 형식이 됩니다.`,
      steps: [
        `dig, curl, tcpdump, openssl이 있는 Linux나 macOS 셸(Windows는 WSL2나 VM)을 준비한다. 대상 사이트를 정하고 ‹dig +trace 도메인›으로 루트 → TLD → 권한 서버 위임 사슬과 각 단계의 NS, 최종 A/AAAA의 TTL을 표로 기록한다.`,
        `‹curl -sS -o /dev/null -w›로 time_namelookup, time_connect, time_appconnect, time_starttransfer, time_total을 출력하는 형식을 만들고, 연결 재사용 없이 30회 측정해 CSV로 저장한다. 값이 누적임을 반영해 단계별 소요(dns, tcp, tls, 서버 대기)를 계산한다.`,
        `‹ping›이나 ‹mtr›로 같은 대상의 RTT를 측정하고, tcp 단계 중앙값이 RTT의 몇 배인지 계산한다.`,
        `캡처를 켠 채로 curl을 1회 실행한다. 명령은 ‹tcpdump -i any -nn -w trace.pcap› 뒤에 대상 IP와 443 포트로 거른 필터를 붙인 형태이며, 끝나면 Wireshark로 열어 SYN, SYN-ACK, ACK, ClientHello(SNI와 ALPN 목록), ServerHello(선택된 버전)의 패킷 번호를 각각 기록한다.`,
        `‹openssl s_client -connect 호스트:443 -servername 호스트 -tls1_2›와 ‹-tls1_3›을 각각 실행해 프로토콜, 암호군, 인증서 체인 길이, 만료일, ALPN을 비교한다(서버가 지원하지 않는 버전이면 그 사실을 기록한다).`,
        `각 단계에 근거 조항을 단다: TCP 연결 수립(RFC 9293 3.5), DNS 메시지 구조(RFC 1035 4), TLS 1.3 개요(RFC 8446 2), HTTP 의미(RFC 9110). 규격을 읽고 최소 4개 조항 번호를 본인 문장으로 요약한다.`,
        `보고서를 쓴다: 타임라인 표, 단계별 중앙값과 p95, 가장 큰 단계 1개와 개선안 2개(예: 연결 재사용, TLS 1.3, CDN)를 근거와 함께 적는다.`
      ],
      accept: [
        `30회 측정 CSV와 dns·tcp·tls·ttfb 4단계의 중앙값과 p95를 담은 표가 있다.`,
        `pcap에서 3-way 핸드셰이크, ClientHello의 SNI와 ALPN 목록, ServerHello가 선택한 버전의 패킷 번호가 캡처 화면 또는 텍스트로 제시되어 있다.`,
        `보고서의 각 단계 설명에 RFC 번호와 조항이 4개 이상 인용되어 있고 폐기된 RFC(793, 7230~7235)를 근거로 쓰지 않았다.`,
        `tcp 단계 중앙값을 측정 RTT와 비교한 값(배수)이 적혀 있고, 0.8~1.5배를 벗어나면 이유 가설이 적혀 있다.`
      ],
      stretch: `레슨 5의 DNS 클라이언트를 확장해 TC 비트가 서 있으면 TCP 53으로 재질의(2바이트 길이 접두)하도록 만들고, 응답을 dig와 필드별로 대조하세요. 더 나아가 Stanford CS144의 바이트 스트림·TCP 수신기 체크포인트를 자기 속도로 풀어 보면 이 레슨의 재전송·윈도 개념이 구현 수준으로 굳어집니다.`
    },
    {
      title: `HTTP/1.1·2·3 동시 서빙, 손실 주입 측정, TLS 설정 감사`,
      scenario: `모바일 앱 고객이 "HTTP/3를 켜면 앱이 빨라지나요? 내일 켜 주세요"라고 요청했습니다. 효과를 약속하기 전에 재현 가능한 실험이 필요합니다. Linux(VM, WSL2 또는 NET_ADMIN 권한을 준 Docker 컨테이너)에서 Caddy나 nginx로 h1·h2·h3를 함께 제공하고, 지연·손실을 인위로 주입한 조건에서 프로토콜별 완료 시간을 본인 측정치로 비교하며, 동시에 TLS 설정을 RFC 9325 체크리스트로 감사해 "켜도 되는 조건과 측정 계획"을 문서로 제안합니다.`,
      steps: [
        `Caddy(또는 nginx)로 로컬 인증서(자체 발급 또는 mkcert)를 써서 h1·h2·h3를 동시에 제공한다. 1KB 작은 파일 30개와 약 200KB 파일 1개를 둔다. 사용 버전의 공식 문서에서 h3 활성화 방법과 UDP 443 개방을 확인한다.`,
        `‹curl -V›에 HTTP3가 표시되는지 확인한다. 표시되면 ‹--http1.1›, ‹--http2›, ‹--http3-only›로 각각 접속하고 ‹-w '%{http_version}'›로 협상된 버전을 로그로 남긴다. 표시되지 않으면 브라우저 개발자 도구의 Protocol 열(h2, h3)로 대체하고 그 사실을 기록한다.`,
        `환경 변수 ‹SSLKEYLOGFILE›을 지정해 curl(또는 브라우저) 트래픽을 캡처하고 Wireshark에 키 로그 파일을 설정해 h2 프레임(SETTINGS, HEADERS, DATA, WINDOW_UPDATE)을 읽는다. SETTINGS의 MAX_CONCURRENT_STREAMS 값을 적는다.`,
        `‹tc qdisc add dev 인터페이스 root netem delay 50ms loss 1%› 형태로 손실 0%, 1%, 3%와 지연 50ms 조건을 만든다(조건을 바꿀 때는 ‹del› 후 다시 ‹add›). 서버와 클라이언트가 같은 머신이라 ‹lo›에 적용하면 양방향에 모두 걸려 RTT는 약 100ms, 한 왕복의 손실 확률은 설정값의 약 2배가 되므로 이 사실을 결과 표에 함께 적는다. 실험이 끝나면 ‹tc qdisc del dev 인터페이스 root›로 반드시 되돌린다.`,
        `조건 3가지 × 프로토콜 3가지(h1, h2, h3)마다 작은 파일 30개를 병렬로(‹curl --parallel›) 받는 전체 완료 시간을 20회 이상 측정해 p50과 p95 표를 만든다.`,
        `testssl.sh, sslyze, nmap의 ssl-enum-ciphers 중 하나를 본인 서버에만 실행해 RFC 9325 기준 체크리스트(TLS 1.2 이상 지원, 1.0/1.1 비활성, ECDHE 전방 비밀성, AEAD 암호, 2048비트 이상 키, 0-RTT 설정, SAN·체인·만료)를 10항목 이상 통과/실패로 정리한다.`,
        `제안서 1쪽을 쓴다: 측정 조건과 결과 표, 본인 측정치에 근거한 결론(예: 손실 3%에서 h3의 p95가 h2 대비 어떻게 달라졌는가), UDP 443·폴백·롤백 계획, 점진적 활성화 단계.`
      ],
      accept: [
        `세 프로토콜이 각각 http_version 1.1, 2, 3(또는 개발자 도구의 h2, h3 표시)으로 협상되었다는 로그가 있다.`,
        `손실 0%, 1%, 3%와 프로토콜 3종으로 이루어진 9칸 표에 각 칸 20회 이상의 p50과 p95가 채워져 있고, 서술된 결론이 표의 숫자와 일치한다.`,
        `Wireshark 캡처에서 읽은 SETTINGS의 MAX_CONCURRENT_STREAMS 값과 9옥텟 프레임 헤더 해석 결과(레슨 8의 파서 사용)가 일치한다.`,
        `TLS 감사 표가 10항목 이상이며 실패 항목마다 수정 방법이 적혀 있다.`,
        `netem 설정이 원복되었음을 보여 주는 명령 출력이 포함되어 있다.`
      ],
      stretch: `Wireshark에서 QUIC Initial 패킷의 데이터그램 크기가 1200바이트 이상이고 Connection ID가 보이는지 확인해 보고서에 추가하세요. 시간이 있으면 같은 손실 조건에서 ‹sysctl net.ipv4.tcp_congestion_control›을 cubic과 bbr로 바꿔(커널이 지원할 때) h2 완료 시간이 어떻게 달라지는지도 측정합니다.`
    },
    {
      title: `[납품형] 간헐적 502 재현, 원인 수정, 인수 문서 작성`,
      scenario: `고객은 소규모 쇼핑몰이며 "ALB 뒤 Node API에서 한산한 시간대에 하루 수십 건 502가 나는데 원인을 모르겠다. 재발 방지와 인수 문서까지 달라"고 의뢰했습니다. 실제 인프라에 접근할 수 없으므로 로컬에서 nginx(LB 역할)와 keep-alive 타임아웃이 짧은 Node.js 백엔드를 띄워 같은 증상을 재현하고, 원인을 패킷으로 증명하고, 수정한 뒤 전후를 숫자로 비교하고, 제3자가 그대로 따라 할 수 있는 인수 문서를 납품 형태로 만듭니다.`,
      steps: [
        `Node.js http 서버를 만들고 ‹server.keepAliveTimeout = 2000›(2초)과 ‹server.keepAliveTimeoutBuffer = 0›으로 설정한다(후자는 Node 22.19·24.6 이상에서 소켓 종료 시점을 keepAliveTimeout에 맞추는 옵션이며 낮은 버전에서는 무시된다). ‹process.version›과 설정값을 시작 로그에 찍고 응답은 작은 JSON으로 한다.`,
        `nginx를 앞에 두고 업스트림에 ‹keepalive 16›, ‹proxy_http_version 1.1›, ‹proxy_set_header Connection ""›을 설정한다. 업스트림 ‹keepalive_timeout›은 60초로 명시한다(백엔드보다 길다).`,
        `부하 스크립트를 만든다: nginx로 요청 1건을 보내고 N초 쉰 뒤 다시 보내는 것을 반복한다(nginx가 백엔드 연결을 재사용해야 하므로 업스트림 keepalive가 켜져 있어야 한다). 쉬는 시간을 1.9초부터 2.1초까지 0.01초 간격으로 바꿔 구간별로 100회씩 보내며 502 비율을 표로 기록한다. 루프백에서는 FIN이 도착하기 전의 틈이 수십 마이크로초뿐이라 0건이 나올 수 있으므로, Linux나 WSL2라면 ‹sudo tc qdisc add dev lo root netem delay 50ms›로 틈을 넓힌 조건도 함께 측정하고(끝나면 ‹del›로 원복) 틈이 좁다는 사실도 표에 적는다.`,
        `502가 나는 구간에서 ‹tcpdump -i lo -nn -w case.pcap 'port 8080'›으로 캡처해, 백엔드가 보낸 FIN과 직후 nginx가 보낸 요청, 그에 대한 RST의 패킷 번호와 시간 차를 Wireshark에서 찾는다. nginx ‹error.log›의 해당 메시지(‹upstream prematurely closed connection› 또는 ‹Connection reset by peer›)도 함께 첨부한다.`,
        `수정한다: 백엔드 ‹keepAliveTimeout›을 nginx 업스트림 ‹keepalive_timeout›보다 길게(예: 65초 대 60초) 바꾸고, ‹proxy_next_upstream›은 멱등 GET에서만 의미가 있게 두며 POST가 재시도되지 않음을 로그로 확인한다.`,
        `같은 스윕을 다시 실행하고 전체 1만 요청에서 502가 0건임을 확인한다(수정 전 최대 비율과 나란히 표로 비교한다).`,
        `인수 문서(3~4쪽)를 쓴다: 증상, 재현 방법, 증거(표·패킷 번호), 원인, 변경 diff, 롤백 절차, 타임아웃 사다리 표(클라이언트·nginx·백엔드), 모니터링 항목과 임계(5xx 비율, upstream 응답 시간 p95, CLOSE_WAIT 수), 재발 시 런북.`,
        `새 디렉터리에서 문서의 지시만 따라 재현 스크립트를 실행해 같은 결과가 나오는지 확인한다(가능하면 다른 사람이 수행한다).`
      ],
      accept: [
        `수정 전 스윕 표에서 502가 나는 구간(경계 부근)과 그 비율이 기록되어 있고, 경계에서 먼 구간에서는 거의 나지 않는다는 패턴이 확인된다.`,
        `pcap에서 FIN, 직후 요청, RST의 패킷 번호와 시간 차(밀리초 단위)가 제시되어 있다.`,
        `수정 후 1만 요청에서 502가 0건이며 수정 전후 비교 표가 문서에 있다.`,
        `POST 요청이 업스트림 오류에서 재시도되지 않음을 보여 주는 로그가 있다.`,
        `인수 문서에 타임아웃 사다리 표와 롤백 절차가 있고, 새 디렉터리에서 문서만으로 재현에 성공했다.`
      ],
      stretch: `백엔드에 SIGTERM을 받으면 새 연결을 거부하고 진행 중인 요청을 끝낸 뒤 종료하는 graceful shutdown을 구현하고, 반복 배포(프로세스 재시작) 중 502가 0건임을 같은 부하 스크립트로 증명하세요. 이어서 nginx 업스트림 상태 지표를 Prometheus로 내보내는 대시보드까지 만들면 납품물의 가치가 올라갑니다.`
    }
  ],
  quiz: [
    {
      q: `서울의 사용자가 해외 서버에 접속한다. RTT는 100ms이고 서버 처리 시간은 0, DNS는 캐시에서 즉시 풀리며, TLS 1.3을 쓰고 연결 재사용은 없다. 새 HTTPS 요청의 첫 응답이 도착하기까지 물리적 하한에 가장 가까운 값은?`,
      choices: [
        `약 100ms`,
        `약 200ms`,
        `약 300ms`,
        `약 400ms`
      ],
      answer: 2,
      why: `TCP 핸드셰이크 1 RTT, TLS 1.3 핸드셰이크 1 RTT, HTTP 요청과 응답 1 RTT로 총 3 RTT, 즉 약 300ms입니다. 200ms는 요청과 응답 자체도 한 번의 왕복이라는 점을 빠뜨린 값이고, 400ms는 TLS 1.2(2 RTT)이거나 DNS 캐시 미스 한 번이 더해진 경우의 값이라 이 조건에는 맞지 않습니다.`
    },
    {
      q: `새 API 서버를 배포했더니 브라우저에서는 정상인데 파트너사의 서버(curl, Java)에서는 아래 오류가 난다.

$ curl -sS https://api.partner-demo.example/v1/orders
curl: (60) SSL certificate problem: unable to get local issuer certificate

가장 가능성 높은 원인과 조치는?`,
      choices: [
        `서버가 leaf 인증서만 보내고 중간 CA 인증서를 보내지 않았다. 중간 인증서를 포함한 fullchain 파일로 서버를 설정한다`,
        `서버가 TLS 1.3을 지원하지 않는다. TLS 1.3을 활성화한다`,
        `클라이언트가 SNI를 보내지 않았다. curl에 --resolve 옵션을 붙인다`,
        `curl 버전이 낮다. -k 옵션으로 검증을 끄고 운영한다`
      ],
      answer: 0,
      why: `브라우저는 AIA 정보로 빠진 중간 인증서를 스스로 가져오기도 해서 서버의 체인 누락이 가려지고, curl과 Java는 그러지 않아 "local issuer"를 찾지 못합니다. TLS 버전은 이 오류와 무관하고, SNI 문제라면 보통 호스트명 불일치 메시지가 나옵니다. -k로 검증을 끄는 것은 오류를 숨길 뿐 중간자 공격에 노출되는 잘못된 해결입니다.`
    },
    {
      q: `A 레코드 TTL이 86400초(24시간)인 서비스를 내일 새벽 2시에 새 IP로 옮기려 한다. 가장 안전한 절차는?`,
      choices: [
        `전환 직전에 TTL을 60초로 바꾸고 곧바로 IP를 바꾼다. 곧 반영된다`,
        `전환 시각보다 기존 TTL(24시간) 이상 앞서 TTL을 낮춰 두고, 전환 후 구 서버를 TTL 이상 유지하다가 안정되면 TTL을 다시 올린다`,
        `A 레코드를 CNAME으로 바꾸면 캐시가 사라지므로 TTL을 신경 쓰지 않아도 된다`,
        `TTL은 권고일 뿐이므로 IP를 바꾸고 구 서버를 바로 종료한다`
      ],
      answer: 1,
      why: `이미 24시간 TTL로 캐시된 응답은 최대 24시간 동안 옛 IP를 가리키므로 TTL을 낮추는 변경 자체가 전환보다 최소 한 TTL 앞서 전파되어야 합니다. 직전에 TTL을 바꾸면 캐시에 남은 옛 값은 그대로 최대 24시간 살아 있습니다. CNAME도 캐시되고, 구 서버를 바로 종료하면 옛 캐시를 쥔 클라이언트가 장애를 맞습니다.`
    },
    {
      q: `새벽에 서버 점검 중 아래 결과를 얻었다.

$ ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c
   4120 CLOSE-WAIT
     35 ESTAB
    210 TIME-WAIT

무엇을 의미하고 어떻게 대응해야 하는가?`,
      choices: [
        `TIME-WAIT가 많은 것이 문제다. tcp_tw_reuse를 켜 TIME-WAIT를 없앤다`,
        `ESTAB이 적으니 서버 성능이 부족하다. 인스턴스를 늘린다`,
        `방화벽이 FIN 패킷을 막고 있다. 보안그룹을 점검한다`,
        `상대가 FIN을 보냈는데 애플리케이션이 소켓을 close하지 않아 쌓인 연결 누수다. 응답과 연결을 닫는 코드를 점검한다`
      ],
      answer: 3,
      why: `CLOSE_WAIT는 상대의 FIN을 받은 뒤 내 앱이 close를 호출하지 않을 때 쌓이는 상태이므로 애플리케이션 버그를 의심합니다. TIME-WAIT 210개는 정상 범위이고 이 문제의 단서는 4,120개의 CLOSE-WAIT입니다. 방화벽이 FIN을 막았다면 상대 FIN 자체를 받지 못해 CLOSE_WAIT가 생기지 않고, 서버 증설은 누수를 숨길 뿐입니다.`
    },
    {
      q: `ALB(유휴 타임아웃 60초) 뒤의 Node.js API가 트래픽이 한산한 새벽과 점심 직후에만 간헐적으로 502를 낸다. 부하 테스트에서는 재현되지 않고 백엔드 로그에는 해당 요청의 흔적이 없다. 가장 가능성 높은 원인과 조치는?`,
      choices: [
        `백엔드의 keep-alive 유휴 타임아웃이 LB의 60초보다 짧아, LB가 이미 닫힌 연결로 요청을 보내 502가 난다. 백엔드의 유휴 타임아웃을 LB보다 길게 한다`,
        `새벽에는 헬스체크가 실패하기 때문이다. 헬스체크 간격을 늘린다`,
        `ALB가 TLS 1.3을 쓰기 때문이다. 리스너를 TLS 1.2로 낮춘다`,
        `DNS TTL이 길어 오래된 IP로 간다. TTL을 줄인다`
      ],
      answer: 0,
      why: `연결이 오래 유휴 상태였다가 재사용되는 시점에 몰리고, 백엔드가 요청을 보지 못했다는 단서가 keepalive 경합의 전형입니다. AWS 문서도 앱의 유휴 타임아웃을 LB보다 크게 두라고 권고하며 이때의 502를 직접 언급합니다. 헬스체크 실패는 대상이 일정 시간 계속 빠지는 장애로 나타나지, 한산한 시간 뒤 첫 요청 몇 건만 502가 되는 패턴이 아닙니다. TLS 버전이나 DNS TTL은 요청이 백엔드에 닿기 전에 끊기는 이 증상을 설명하지 못합니다.`
    },
    {
      q: `결제 승인 API(POST /payments)가 있는 서비스의 nginx 설정이다. 무엇이 가장 위험한가?

upstream api {
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
    keepalive 32;
}
location / {
    proxy_pass http://api;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_next_upstream error timeout non_idempotent;
    proxy_next_upstream_tries 3;
}`,
      choices: [
        `keepalive 32가 너무 작아 연결이 자주 끊긴다`,
        `http_502를 지정하지 않아 502 응답이 재시도되지 않는다`,
        `non_idempotent 때문에 이미 업스트림에 전달된 결제 POST도 다른 서버로 재전송되어 중복 결제가 날 수 있다`,
        `TLS 설정이 없어 업스트림 연결이 거부된다`
      ],
      answer: 2,
      why: `nginx는 기본적으로 POST 같은 비멱등 요청을 업스트림에 보낸 뒤에는 다음 서버로 넘기지 않으며, non_idempotent는 이를 명시적으로 허용합니다. 응답이 늦거나 유실된 결제 요청이 두 번 처리될 수 있으므로 제거하고 멱등 키로 보호해야 합니다. 502를 재시도하지 않는 것은 위험이 아니라 보수적인 동작이고, keepalive 값과 업스트림 TLS는 이 설정의 위험과 관계가 없습니다.`
    },
    {
      q: `모바일 앱 고객이 "HTTP/3를 켜면 API가 빨라지겠죠? 내일 켜 주세요"라고 한다. 현재 구성은 클라이언트 → NLB(TCP 리스너만) → nginx다. 첫 대응으로 가장 적절한 것은?`,
      choices: [
        `HTTP/3는 항상 더 빠르므로 내일 바로 켜고 개선을 보증한다`,
        `UDP 443이 방화벽·보안그룹·LB 경로에서 허용되는지와 h2 폴백을 확인하고, 현재 지표를 기준선으로 삼아 A/B 측정 뒤 점진적으로 켠다`,
        `HTTP/3는 TCP를 쓰므로 현재 TCP 리스너만으로 충분하다고 안내한다`,
        `HTTP/3 대신 HTTP/1.1로 내려야 모바일에서 빠르다고 안내한다`
      ],
      answer: 1,
      why: `HTTP/3는 UDP 위의 QUIC을 쓰므로 TCP 리스너만 있는 경로로는 도달하지 못하고, 효과도 손실·RTT가 큰 환경에서 두드러질 뿐 보증할 수 없습니다. 그래서 경로 확인, 폴백, 기준선과 A/B 측정이 먼저입니다. "HTTP/3는 TCP를 쓴다"는 틀린 전제이고, h1로 내리면 다중화 이득을 잃어 일반적으로 악화됩니다.`
    },
    {
      q: `클라이언트 서버 A(10.0.1.5)에서 서버 B(10.0.2.9:443)로 접속이 안 된다. A에서 캡처한 패킷이다.

10:01:02.100 IP 10.0.1.5.41022 > 10.0.2.9.443: Flags [S], seq 1000, length 0
10:01:03.101 IP 10.0.1.5.41022 > 10.0.2.9.443: Flags [S], seq 1000, length 0
10:01:05.103 IP 10.0.1.5.41022 > 10.0.2.9.443: Flags [S], seq 1000, length 0
10:01:09.107 IP 10.0.1.5.41022 > 10.0.2.9.443: Flags [S], seq 1000, length 0

가장 적절한 해석은?`,
      choices: [
        `서버 애플리케이션이 느려서 응답이 늦는 것이므로 쿼리를 최적화한다`,
        `TLS 인증서가 만료되어 핸드셰이크가 실패하고 있다`,
        `DNS 해석이 실패하고 있다`,
        `SYN이 B에 도달하지 못하거나 SYN-ACK이 돌아오지 못하고 있다. 방화벽·보안그룹·라우팅 또는 B의 accept 큐 포화를 점검한다`
      ],
      answer: 3,
      why: `SYN만 1초, 2초, 4초 간격(지수 백오프)으로 재전송되고 SYN-ACK이 오지 않으므로 아직 TCP 연결도 맺어지지 않은 단계입니다(최신 리눅스는 처음 몇 번을 같은 1초 간격으로 보내 간격 패턴은 커널마다 다르지만 "SYN만 반복"이라는 점은 같습니다). 앱의 쿼리, TLS 인증서, DNS는 이 단계 이후나 이전의 문제라 이 캡처로는 설명되지 않습니다(이미 IP로 SYN을 보내고 있으므로 DNS는 해결됨).`
    },
    {
      q: `CDN 콘솔에 "0-RTT 활성화(첫 요청 속도 향상)" 옵션이 있다. 이 서비스에는 POST /orders(결제 승인 포함)가 있다. 가장 적절한 결정은?`,
      choices: [
        `속도가 빨라지므로 모든 경로에 켠다`,
        `0-RTT는 전방 비밀성이 있어 안전하므로 POST에도 허용한다`,
        `0-RTT 데이터는 재생될 수 있으므로 결제 같은 비멱등 경로에서는 끄거나 거부하고, 멱등 GET에만 제한적으로 허용한다`,
        `0-RTT는 TLS 1.2의 기능이므로 TLS 1.3 환경에서는 신경 쓸 필요가 없다`
      ],
      answer: 2,
      why: `0-RTT early data는 공격자가 그대로 다시 보내는 재생을 TLS가 막지 못하고 전방 비밀성도 없습니다. 같은 결제 요청이 두 번 처리될 수 있어 비멱등 경로에서는 쓰지 않아야 합니다. 전방 비밀성이 있다는 주장은 사실과 반대이고, 0-RTT는 TLS 1.3(과 QUIC)에서 쓰이는 기능입니다.`
    },
    {
      q: `내부 서비스 호출 코드다. 부하가 올라가면 간헐적으로 JSONDecodeError가 난다.

sock = socket.create_connection(("api.internal", 9000))
sock.sendall(b'{"cmd":"a"}')
sock.sendall(b'{"cmd":"b"}')
data = sock.recv(4096)
resp = json.loads(data)

근본 원인은?`,
      choices: [
        `TCP 대신 UDP를 써야 메시지 경계가 보존된다`,
        `TCP는 바이트 스트림이라 recv 한 번이 메시지 하나와 대응하지 않는다. 길이 접두나 구분자로 프레이밍하고 완성될 때까지 반복해 읽어야 한다`,
        `버퍼 4096바이트가 작기 때문이다. recv 크기를 65536으로 키우면 해결된다`,
        `TCP_NODELAY가 꺼져 있어 JSON이 합쳐진다. 켜면 해결된다`
      ],
      answer: 1,
      why: `TCP는 경계를 보존하지 않으므로 응답 두 개가 한 번에 붙어 오거나 하나가 중간에 잘려 올 수 있어 한 번의 recv로 JSON 하나를 기대하는 코드가 깨집니다. UDP는 경계는 보존하지만 신뢰성이 없어 대체가 못 되고, 버퍼를 키워도 붙음과 잘림은 사라지지 않습니다. NODELAY를 켜도 수신 측에서 데이터가 합쳐져 도착하는 일은 막지 못합니다.`
    },
    {
      q: `배치 서버가 외부 API(단일 IP, 443)로 초당 약 600건의 요청을 보내며 요청마다 새 연결을 맺고 클라이언트가 먼저 닫는다. 몇 분 뒤부터 "Cannot assign requested address" 오류가 난다(리눅스 기본 임시 포트 범위 32768~60999). 가장 먼저 할 조치는?`,
      choices: [
        `HTTP keep-alive와 커넥션 풀로 연결을 재사용해 새 연결 수 자체를 줄인다`,
        `net.ipv4.tcp_fin_timeout을 줄여 TIME_WAIT를 짧게 만든다`,
        `임시 포트 범위를 넓히고 해결된 것으로 본다`,
        `외부 API 서버를 증설해 달라고 요청한다`
      ],
      answer: 0,
      why: `임시 포트가 약 28,000개이고 TIME_WAIT가 60초 머물므로 같은 목적지로의 신규 연결은 초당 약 470개가 한계인데 600건을 넘으니 고갈됩니다. 근본 해법은 연결 재사용입니다. tcp_fin_timeout은 FIN_WAIT_2에 관한 값이라 리눅스의 60초 TIME_WAIT를 줄이지 못하고, 포트 범위 확대는 한계를 조금 늦출 뿐이며 외부 서버 증설은 클라이언트 쪽 포트 고갈과 무관합니다.`
    },
    {
      q: `이미지 API를 HTTP/1.1에서 HTTP/2로 올렸다. 사무실 Wi-Fi에서는 빨라졌지만, 손실이 잦은 지하철 LTE에서는 p99가 오히려 나빠졌다. 가장 그럴듯한 구조적 원인과 다음 실험은?`,
      choices: [
        `HPACK 헤더 압축의 CPU 비용 때문이다. 헤더 압축을 끈다`,
        `h2는 스트림 우선순위를 지원하지 않기 때문이다`,
        `서버의 SETTINGS_MAX_CONCURRENT_STREAMS가 1로 고정되어 있기 때문이다`,
        `h2는 모든 스트림이 하나의 TCP 연결을 공유해 패킷 손실 하나가 모든 스트림의 전달을 지연시키는 HoL이 있다. 같은 조건에서 QUIC 기반 HTTP/3를 A/B 측정한다`
      ],
      answer: 3,
      why: `손실이 잦은 환경에서 h2의 약점은 TCP 수준 HoL입니다. 하나의 TCP 연결에서 손실된 패킷이 재전송될 때까지 뒤따르는 모든 스트림이 기다리고, h1의 여러 연결은 서로 독립이라 영향이 덜합니다. QUIC은 스트림별로 손실을 격리하므로 비교 실험할 가치가 있습니다. HPACK의 CPU 비용은 작고, 우선순위는 지원되며(RFC 9218), 동시 스트림 수는 100 이상이 권장됩니다.`
    }
  ],
  refs: [
    {
      title: `RFC 9293: Transmission Control Protocol (TCP)`,
      url: `https://www.rfc-editor.org/rfc/rfc9293.html`,
      kind: `rfc`,
      why: `RFC 793과 수십 년의 수정을 하나로 합친 TCP 기본 규격(STD 7, 2022-08). 상태기계, 핸드셰이크, 윈도를 조항 단위로 확인할 때 쓴다(TIME-WAIT의 2×MSL은 3.6.1, MSL 정의는 3.4.2, 기본 MSS는 3.7.1).`
    },
    {
      title: `RFC 5681: TCP Congestion Control`,
      url: `https://www.rfc-editor.org/rfc/rfc5681.html`,
      kind: `rfc`,
      why: `slow start, congestion avoidance, fast retransmit/recovery의 정의. 레슨 4의 AIMD 모델과 처리량 직관의 출처.`
    },
    {
      title: `RFC 1035: Domain Names - Implementation and Specification`,
      url: `https://www.rfc-editor.org/rfc/rfc1035.html`,
      kind: `rfc`,
      why: `DNS 메시지 구조, 리소스 레코드, 이름 압축, UDP 512바이트 한계와 TCP 길이 접두. 레슨 5 코드의 근거 규격.`
    },
    {
      title: `RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3`,
      url: `https://www.rfc-editor.org/rfc/rfc8446.html`,
      kind: `rfc`,
      why: `1-RTT 핸드셰이크, 제거된 기능, 항상 (EC)DHE, 0-RTT 재생 위험의 1차 출처. 2장 개요부터 읽는다.`
    },
    {
      title: `RFC 9325: Recommendations for Secure Use of TLS and DTLS`,
      url: `https://www.rfc-editor.org/rfc/rfc9325.html`,
      kind: `rfc`,
      why: `TLS 1.2 필수·1.3 권장(3.1.1), ECDHE와 AES-GCM, 최소 키 길이(4.5), 0-RTT 제한(3.10) 등 서버 TLS 감사의 체크리스트 기준(BCP 195, 2022-11).`
    },
    {
      title: `RFC 9113: HTTP/2`,
      url: `https://www.rfc-editor.org/rfc/rfc9113.html`,
      kind: `rfc`,
      why: `9옥텟 프레임 헤더, 스트림 다중화, 65,535 초기 윈도, SETTINGS 기본값. 레슨 8 파서와 실습 2의 프레임 해석에 쓴다.`
    },
    {
      title: `RFC 9114: HTTP/3`,
      url: `https://www.rfc-editor.org/rfc/rfc9114.html`,
      kind: `rfc`,
      why: `HTTP 의미를 QUIC 스트림에 매핑하는 규격. QPACK, h3 ALPN, Alt-Svc 발견, GOAWAY를 다룬다.`
    },
    {
      title: `RFC 9000: QUIC: A UDP-Based Multiplexed and Secure Transport`,
      url: `https://www.rfc-editor.org/rfc/rfc9000.html`,
      kind: `rfc`,
      why: `독립 스트림, Connection ID와 마이그레이션, 주소 검증과 3배 제한, 최소 1200바이트 데이터그램(14.1), 가변 길이 정수(16, 부록 A.1의 예시), 0-RTT 경고. 앞부분 개요를 먼저 읽는다.`
    },
    {
      title: `RFC 9110: HTTP Semantics`,
      url: `https://www.rfc-editor.org/rfc/rfc9110.html`,
      kind: `rfc`,
      why: `h1·h2·h3 공통 의미론. 메서드의 멱등성과 502·503·504 같은 상태 코드의 정의를 확인할 때의 기준 문서.`
    },
    {
      title: `End-to-End Arguments in System Design (Saltzer, Reed, Clark, 1984)`,
      url: `https://web.mit.edu/Saltzer/www/publications/endtoend/endtoend.pdf`,
      kind: `paper`,
      why: `신뢰성·중복 제거·암호화가 양 끝점에서만 완성된다는 원칙. 멱등 키와 재시도 설계의 사고방식을 준다.`
    },
    {
      title: `The Tail at Scale (Dean, Barroso, CACM 2013)`,
      url: `https://www.barroso.org/publications/TheTailAtScale.pdf`,
      kind: `paper`,
      why: `팬아웃에서 드문 지연이 사용자 지연을 지배한다는 산수(100대·1% 느림 → 63%)와 hedged 요청 등 완화책.`
    },
    {
      title: `High Performance Browser Networking (Ilya Grigorik)`,
      url: `https://hpbn.co/`,
      kind: `book`,
      why: `지연과 대역폭, TCP·UDP·TLS, HTTP/1.x와 HTTP/2, SSE·WebSocket을 다루는 무료 웹판(CC BY-NC-ND 4.0). 2013년판이라 HTTP/3는 RFC 9000과 9114로 보충한다.`
    },
    {
      title: `Computer Networks: A Systems Approach (Peterson, Davie)`,
      url: `https://book.systemsapproach.org/`,
      kind: `book`,
      why: `기초부터 인터네트워킹, 종단 프로토콜, 혼잡 제어, 보안, 응용까지 온라인으로 읽는 교재. 레슨 2~4를 깊게 파고 싶을 때의 정독 자료.`
    },
    {
      title: `AWS Elastic Load Balancing: Edit attributes for your Application Load Balancer`,
      url: `https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html`,
      kind: `doc`,
      why: `연결 유휴 타임아웃 기본 60초(범위 1~4000초), 앱 유휴 타임아웃을 LB보다 길게 두라는 권고와 502 설명, HTTP/2 PING 프레임 미지원, 클라이언트 keepalive 기본 3600초. 레슨 9의 keepalive 경합 근거(2026-11 확인).`
    }
  ],
  gigs: [
    `고객이 말하는 "네트워크가 느려요", "서버가 자꾸 죽어요"는 증상일 뿐입니다. 견적 전에 구성도(클라이언트 → CDN → LB → 프록시 → 앱 → DB), 각 구간의 타임아웃 값 목록, 최근 변경 이력, 재현 빈도와 시간대, 로그 접근권(LB 접근 로그, nginx, 앱 로그)을 받아 두세요. 이 다섯 가지가 없으면 견적이 도박이 됩니다.`,
    `산출물은 코드보다 문서가 가치입니다. 증상-가설-증거-결론 표, 변경 diff와 롤백 방법, 타임아웃 사다리 표, 모니터링 임계값, 재발 시 런북을 납품 목록에 명시해 "설정만 바꿔 주면 끝"이라는 기대를 조정합니다. 간헐 장애는 수정보다 증거 수집이 일의 절반입니다.`,
    `TLS·인증서 의뢰에서는 인증서 수명 단축 추세(CA/Browser Forum SC-081: 최대 유효기간이 2026-03-15 이후 발급분 200일, 2027-03-15 이후 100일, 2029-03-15 이후 47일로 단계적 축소, 2026-11 확인)를 근거로 수동 갱신이 아닌 ACME 자동화와 만료 경보를 제안하세요. DNS-01 방식이 필요하면 DNS API 키의 권한 범위를 최소로 하고, 개인키 보관·인계 규칙을 계약서에 적습니다.`,
    `"HTTP/3나 CDN을 켜 주세요" 요청은 효과를 보증하지 마세요. UDP 443 허용 여부(방화벽·보안그룹·LB 지원), h2 폴백, 현재 지표(p95, 오류율), 비용(CDN 요금제, egress)을 확인하고 A/B 측정을 범위에 넣습니다. 측정 기간(보통 며칠의 실트래픽)은 일정에 반영해야 합니다.`,
    `책임 범위를 문서로 못 박으세요. 고객사의 방화벽·프록시·VPN 장비는 접근할 수 없는 경우가 많으므로 "고객 네트워크 장비 설정은 범위 밖이며 진단 정보를 제공한다"고 적고, 운영 서버에서의 tcpdump·설정 변경은 변경 승인 절차와 점검 시간대를 받은 뒤 수행합니다.`,
    `패킷 캡처와 포트·TLS 스캔은 법적·보안 이슈가 있습니다. 캡처에는 개인정보가 담길 수 있으니 헤더만(예: 96바이트) 저장하고 보관·삭제 기간을 합의하며, nmap·testssl 같은 스캔은 고객 소유이거나 서면 허가를 받은 서버에만 실행합니다. 진단 결과 보고서에도 비밀(토큰·쿠키)이 섞이지 않게 마스킹합니다.`,
    `견적은 두 단계로 나누는 편이 안전합니다. 1단계는 진단(고정가: 관측 도입, 로그·캡처 수집, 원인 보고서), 2단계는 수정과 검증(1단계 결과에 따른 조건부 견적). 재현이 어려운 간헐 장애는 관측에 최소 1~2일의 실트래픽이 필요하고, 클라우드 LB의 기본 타임아웃 같은 값은 고객 계정에서 실제 설정을 확인한 뒤 말하세요(기본값은 문서마다, 시기마다 다릅니다).`
  ]
};
