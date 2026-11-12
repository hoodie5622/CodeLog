(window.PRO_MODULES = window.PRO_MODULES || {})["ai-llm"] = {
  id: "ai-llm",
  summary: `Transformer·LLM의 토큰화·attention·KV cache·사전학습·스케일링 원리를 논문과 직접 구현으로 이해해, 모델 선정·GPU 사이징·비용 견적의 근거를 숫자로 설명할 수 있다.`,
  hours: 110,
  goals: [
    `토큰 열 → 임베딩 → Transformer 블록 → logits → 샘플링의 파이프라인과 학습·추론 두 모드의 병목 차이를 설명하고, 암산 규칙(추론 약 2N·학습 약 6N FLOPs, 가중치·학습 메모리)으로 모델의 비용을 가늠할 수 있다.`,
    `BPE를 직접 구현하고 같은 한국어·영어 문서의 모델별 토큰 수를 측정해, 영어 기준 견적이 한국어 서비스에서 틀리는 이유와 월 비용 오차를 수치로 보일 수 있다.`,
    `Attention Is All You Need를 자기 말로 설명하고, causal multi-head self-attention을 PyTorch로 구현해 shape·행 합·인과성 테스트를 통과시킬 수 있다.`,
    `층·d·FFN·헤드·KV 헤드·어휘 값만으로 파라미터 수와 토큰당 KV cache 바이트를 계산해 공개된 수치(예: Llama 3 8B 약 8.03B, 128KiB/토큰)와 1% 이내로 맞출 수 있다.`,
    `RoPE의 상대 위치 성질, 컨텍스트 확장이 별도 학습 비용이라는 점, Lost in the Middle과 context rot의 의미를 설명하고 장문 투입 설계의 위험을 지적할 수 있다.`,
    `temperature·top-p, prefill/decode, KV cache·GQA·FlashAttention·PagedAttention·연속 배칭·투기적 디코딩·양자화의 효과를 메모리 대역폭 모델로 설명하고 GPU 사이징 근사치를 낼 수 있다.`,
    `Kaplan·Chinchilla·Sardana 논문을 읽고 compute-optimal 계산과 추론 수요를 반영한 학습 규모 판단을 수행해, 자체 사전학습·오픈웨이트 자체 호스팅·상용 API 중 무엇을 권할지 숫자로 근거를 댈 수 있다.`,
    `오픈 모델의 기술 보고서(MoE·GQA·컨텍스트·평가 설정·라이선스)를 읽어 모델 선정 메모와 사이징 근거를 쓰고, 환각·비결정성·장문 편향 같은 한계를 수용 기준과 함께 고객에게 설명할 수 있다.`
  ],
  lessons: [
    {
      title: `멘탈 모델: LLM은 "다음 토큰 분포"를 내는 함수다`,
      body: `LLM을 한 문장으로 줄이면 이렇습니다. 토큰 id의 열을 받아서 "다음에 올 토큰 각각의 확률"을 돌려주는 함수입니다. 챗봇도, 코드 생성도, 에이전트도 이 함수를 반복해서 부르는 바깥 루프일 뿐입니다. 외주 현장에서 받는 질문의 상당수가 이 한 문장에서 풀립니다. 출력이 길수록 왜 느린지(함수를 그만큼 더 부르니까), 같은 질문에 왜 답이 달라지는지(확률분포에서 뽑으니까), 모르는 것도 왜 그럴듯하게 말하는지(분포는 어떤 입력에도 어떤 토큰이든 내놓으니까)가 모두 여기서 나옵니다.

### 파이프라인 여섯 단계

1. 토크나이저가 문자열을 정수 id의 열로 바꿉니다(2강).
2. 임베딩 표에서 id마다 d차원 벡터를 꺼냅니다.
3. Transformer 블록 L개가 attention과 MLP로 벡터를 차례로 갱신합니다(3~4강).
4. 마지막 위치의 벡터를 어휘 크기 V의 점수(logits)로 바꿉니다.
5. softmax로 확률을 만들고 토큰 하나를 고릅니다(6강).
6. 고른 토큰을 입력 끝에 붙여 1~5를 반복하다가 종료 토큰이나 길이 한도에서 멈춥니다.

### 학습과 추론은 다른 일입니다

학습에서는 문장 전체를 한 번에 넣고 모든 위치에서 동시에 "다음 토큰"을 맞히게 하며 교차 엔트로피를 줄입니다. 위치들이 병렬로 처리되므로 GPU 연산 능력을 꽉 채울 수 있습니다. 추론(디코딩)은 토큰 하나를 만들 때마다 모델 전체를 한 번 통과해야 하는 순차 작업입니다. 연산은 적은데 매번 가중치를 메모리에서 읽어야 하므로 메모리 대역폭에 묶입니다. Sardana 외(2023)는 출력 토큰 생성의 하드웨어 활용률(MFU)이 1% 수준까지 낮을 수 있는 반면 학습은 40~60%라고 지적합니다. "학습은 연산이 병목, 디코딩은 메모리가 병목"이라는 비대칭이 이 모듈 전체를 관통하는 축입니다(6~7강).

### 암산 규칙 세 가지

- 파라미터가 N개인 dense 모델은 토큰 하나를 생성하는 데 약 2N FLOPs, 학습은 토큰당 약 6N FLOPs가 듭니다(Kaplan 외 2020의 C≈6NBS, Sardana 외의 2N 가정).
- 가중치 메모리는 N × 바이트 수입니다. FP16·BF16은 2바이트, INT8은 1, INT4는 0.5이므로 80억 파라미터 모델은 FP16에서 약 16GB입니다.
- Llama 3 405B는 15.6T 토큰으로 학습했고 논문은 총 연산을 약 3.8e25 FLOPs로 밝힙니다. 6×405e9×15.6e12를 계산하면 약 3.79e25로 맞습니다. 공개 수치를 암산으로 검산하는 습관이 기술 보고서를 읽는 첫걸음입니다.

### 이 모듈의 지도와 외주에서의 쓰임

고객이 "AI가 왜 이런 답을 했나요?"라고 물으면 원인을 세 곳으로 좁힙니다. 입력(프롬프트·컨텍스트), 샘플링(온도 같은 무작위성), 학습(모델이 원래 모르거나 틀림)입니다. 이 모듈은 토큰(2강) → attention(3강) → 블록·자원 계산(4강) → 위치·컨텍스트(5강) → 디코딩·KV cache(6강) → 서빙 최적화(7강) → MoE·오픈 모델(8강) → 사전학습·스케일링(9강) 순으로 내부를 열고, 10강에서 모델 선정·사이징·견적의 근거로 묶습니다.`,
      code: `import torch

torch.manual_seed(0)
vocab = ["<bos>", "서버", "는", "느리다", "빠르다", "<eos>"]
V = len(vocab)

# 아주 작은 "언어 모델": 직전 토큰 하나만 보고 다음 토큰의 logits를 내는 표(bigram)
table = torch.zeros(V, V)
table[0, 1] = 5.0            # <bos> -> 서버
table[1, 2] = 5.0            # 서버 -> 는
table[2, 3] = 2.0            # 는 -> 느리다
table[2, 4] = 2.0            # 는 -> 빠르다
table[3, 5] = 5.0            # 느리다 -> <eos>
table[4, 5] = 5.0            # 빠르다 -> <eos>
# 점수가 0인 칸도 softmax 뒤에는 확률이 조금 남는다: 가끔 엉뚱한 토큰이 뽑히는 것도 "분포에서 뽑기"의 일부다

def next_token_probs(ids):
    logits = table[ids[-1]]                    # 실제 LLM은 여기서 Transformer 전체를 통과한다
    return torch.softmax(logits, dim=-1)       # 어휘 전체에 대한 확률분포

def generate(max_new=10):
    ids, logp = [0], 0.0
    for _ in range(max_new):                   # 바깥 루프: 분포에서 하나 뽑아 붙이고 반복
        probs = next_token_probs(ids)
        nxt = torch.multinomial(probs, 1).item()
        logp += torch.log(probs[nxt]).item()
        ids.append(nxt)
        if vocab[nxt] == "<eos>":
            break
    return [vocab[i] for i in ids], logp

for _ in range(3):                             # 같은 입력인데 결과가 다를 수 있다
    toks, logp = generate()
    print(" ".join(toks), "| 시퀀스 log-prob =", round(logp, 3))`,
      codeLang: `python`,
      key: [
        `LLM은 토큰 열을 받아 다음 토큰의 확률분포를 내는 함수이고, 챗봇·에이전트는 그 함수를 반복 호출하는 바깥 루프다.`,
        `학습은 모든 위치를 병렬로 처리해 연산이 병목이고, 디코딩은 토큰 하나마다 가중치를 읽어 메모리 대역폭이 병목이다.`,
        `암산 규칙: 추론 약 2N FLOPs/토큰, 학습 약 6N FLOPs/토큰, 가중치 메모리 = N × 바이트 수(FP16 2, INT8 1, INT4 0.5).`,
        `출력 토큰 수가 곧 모델 호출 횟수라서 지연과 비용은 출력 길이에 거의 비례한다.`
      ],
      pitfalls: [
        `LLM이 "지식을 검색해서 꺼내 온다"고 설명하는 것: 실제로는 분포에서 뽑는 장치이고 근거를 보증하지 않는다.`,
        `"모델이 생각한다"는 의인화로 고객 기대치를 올려 놓는 것: 한계(환각·비결정성)를 설명할 때 가장 먼저 무너진다.`,
        `입력 토큰과 출력 토큰의 구조 차이를 무시하는 것: 출력은 단가가 높고 순차적이라 지연의 대부분을 차지한다.`,
        `파라미터 수만 보고 메모리와 속도를 판단하는 것: KV cache, MoE의 활성 파라미터, 정밀도(바이트 수)를 빼먹는다.`
      ]
    },
    {
      title: `토크나이저: BPE, 한국어 토큰 비용, 토큰 경계의 한계`,
      body: `토크나이저는 문자열과 모델 사이의 번역기이고, 외주 현장에서는 비용·지연·컨텍스트 한도의 단위를 정하는 장치이기도 합니다. 대부분의 LLM은 BPE(byte-pair encoding) 계열을 씁니다. Sennrich 외(2015)가 신경 기계번역에서 희귀 단어를 더 작은 서브워드로 쪼개 처리하려고 가져온 방식입니다.

### BPE가 어휘를 만드는 법

알고리즘은 단순합니다. 학습 텍스트를 가장 작은 단위(요즘은 UTF-8 바이트 256개)로 쪼개 놓고, 인접한 쌍 중 가장 자주 나오는 것을 하나의 새 토큰으로 합치는 일을 정해진 어휘 크기까지 반복합니다. 합친 순서가 곧 규칙표이고, 인코딩은 이 규칙을 같은 순서로 적용하는 것입니다. 바이트에서 시작하면 어떤 문자열도 표현되므로 "미등록 단어"가 생기지 않습니다. 그 결과 학습 말뭉치에 자주 나온 문자열은 짧은 토큰열로, 드문 문자열은 긴 토큰열로 바뀝니다. 토큰 효율은 말뭉치 구성이 그대로 비친 것입니다.

### 한국어가 불리해지는 이유

한글 음절 하나는 UTF-8에서 3바이트입니다. 병합이 충분히 학습되지 않은 어휘에서는 한 글자가 여러 토큰으로 쪼개져 같은 뜻의 영어보다 토큰이 많이 나오는 경향이 있습니다. 정확한 배율은 모델과 문서 유형마다 달라서 추정하면 안 되고 측정해야 합니다(실습 1). 어휘 설계도 영향을 줍니다. Llama 3는 어휘를 128K로 키웠고 약 10만 개는 tiktoken 어휘에서, 28K는 비영어 지원을 위해 더했으며, 영어 샘플 기준으로 토큰당 평균 문자 수가 Llama 2의 3.17에서 3.94로 늘었다고 보고합니다(한국어의 압축률이 같은 폭으로 좋아졌다는 뜻은 아니므로 직접 잽니다). 어휘를 키우면 시퀀스가 짧아져 attention 비용과 KV cache가 줄지만 임베딩·출력 행렬이 커집니다. 128,000 × 4,096이면 행렬 하나가 약 5.2억 파라미터입니다.

### 비용과 운영에서 마주치는 것

과금, 속도 제한, 컨텍스트 한도가 모두 토큰 단위입니다. Anthropic 가격 문서는 Claude 4.7 이후 모델이 쓰는 새 토크나이저가 같은 텍스트에서 약 30% 더 많은 토큰을 내며 정확한 증가폭은 내용과 워크로드에 따라 다르다고 안내합니다(2026-11 열람). 단가가 같아도 모델을 바꾸면 청구액이 달라지므로, 월 비용 견적은 고객의 실제 문서로 대상 모델의 토큰 수를 재서 해야 합니다. 세는 방법은 둘입니다. 오픈 모델은 같은 토크나이저를 로컬에서 불러 세고, 상용 API 모델은 응답에 담기는 usage 값이나 벤더의 토큰 계수 기능으로 셉니다. 입력만 세지 말고 출력 길이의 분포도 함께 기록해야 합니다. 출력 단가가 입력보다 높은 것이 일반적이고(예: Claude Fable 5.2는 입력 8달러·출력 40달러/MTok, Anthropic 가격표 2026-11 열람) 지연도 출력이 좌우하기 때문입니다. 오픈 모델을 직접 서빙할 때는 chat template(역할 구분용 특수 토큰의 배치 규칙)이 모델마다 다릅니다. 템플릿이 어긋나면 에러 없이 품질만 조용히 나빠지는 일이 흔합니다. 사용자 입력 안에 특수 토큰과 같은 문자열이 들어올 때의 처리도 라이브러리마다 달라서 확인해야 합니다.

### 토큰 경계가 만드는 한계

모델은 글자가 아니라 토큰을 봅니다. 그래서 글자 수 세기, 철자 뒤집기, 자모 분해 같은 작업이 어렵고, 숫자가 어떻게 쪼개지느냐에 따라 자릿수 계산이 흔들립니다. 공백 하나, 줄바꿈 하나가 다른 토큰이 되므로 프롬프트의 사소한 포맷 차이가 출력을 바꾸기도 합니다. 이런 현상을 "모델이 멍청하다"가 아니라 "입력 단위가 다르다"로 설명하면 고객과의 대화가 훨씬 쉬워집니다.`,
      code: `from collections import Counter

def merge(seq, pair, new_id):
    out, i = [], 0
    while i < len(seq):
        if i + 1 < len(seq) and (seq[i], seq[i + 1]) == pair:
            out.append(new_id)
            i += 2
        else:
            out.append(seq[i])
            i += 1
    return out

def train_bpe(text, n_merges):
    seq = list(text.encode("utf-8"))          # 바이트(0~255)에서 시작: 어떤 문자열도 표현 가능
    merges = {}                                # (왼쪽, 오른쪽) -> 새 토큰 id. 학습 순서가 곧 적용 순서
    for new_id in range(256, 256 + n_merges):
        pairs = Counter(zip(seq, seq[1:]))
        if not pairs:
            break
        best, cnt = pairs.most_common(1)[0]
        if cnt < 2:                            # 반복되는 쌍이 더 없으면 중단
            break
        merges[best] = new_id
        seq = merge(seq, best, new_id)
    return merges

def encode(text, merges):
    seq = list(text.encode("utf-8"))
    for pair, new_id in merges.items():        # 학습 때와 같은 순서로 병합 적용
        seq = merge(seq, pair, new_id)
    return seq

ko = "서버가 느려요 서버 응답이 느려요 서버 재시작 후에도 느려요"
en = "the server is slow the server response is slow still slow after restart"
for name, text in (("ko", ko), ("en", en)):
    m = train_bpe(text, 30)
    print(name, "문자", len(text), "바이트", len(text.encode("utf-8")), "토큰", len(encode(text, m)))
# 출력 예: ko 문자 33 바이트 83 토큰 33 / en 문자 71 바이트 71 토큰 28
# 이 작은 말뭉치에서는 병합 30회를 채우기 전에 반복 쌍이 없어져 멈춘다(ko 17회, en 16회).
# 한글은 같은 병합 횟수에서도 바이트가 많아 토큰이 더 많이 남는다. 실제 모델의 배율은 말뭉치가 크므로 측정으로 확인한다.`,
      codeLang: `python`,
      key: [
        `BPE는 바이트(또는 문자)에서 시작해 가장 자주 붙는 인접 쌍을 어휘 크기까지 반복 병합한다. 토큰 효율은 학습 말뭉치의 구성을 반영한다.`,
        `어휘 크기는 시퀀스 길이(attention·KV cache 비용)와 임베딩·출력 행렬 크기를 맞바꾸는 설계 변수다(Llama 3: 128K).`,
        `과금·속도 제한·컨텍스트 한도가 모두 토큰 단위라서 같은 한국어 문서도 모델마다 비용이 다르다. 실제 문서로 측정한다.`,
        `글자 수 세기·철자·자릿수 계산이 약한 것은 모델이 글자가 아니라 토큰을 본다는 구조에서 나온다.`
      ],
      pitfalls: [
        `영어 샘플의 토큰 수로 한국어 서비스를 견적하는 것: 언어·모델에 따라 배율이 달라 월 비용이 크게 어긋난다.`,
        `모델 교체 때 단가만 비교하고 토크나이저 차이로 달라지는 토큰 수를 무시하는 것: 같은 단가여도 청구액이 변한다.`,
        `오픈 모델 서빙에서 chat template을 직접 만들거나 틀리는 것: 오류 없이 품질만 떨어진다.`,
        `사용자 입력 속 특수 토큰 문자열의 처리 방식을 확인하지 않는 것: 프롬프트 구조가 오염될 수 있다.`
      ]
    },
    {
      title: `Self-attention 정독: Attention Is All You Need를 내 말로 읽기`,
      body: `Attention Is All You Need(Vaswani 외, 2017)를 내 말로 요약하면 이렇습니다. 당시 번역 모델은 RNN이 문장을 앞에서 뒤로 한 토큰씩 읽으며 고정 길이 벡터에 압축하는 구조였습니다(Sutskever 외, 2014). Bahdanau 외(2014)가 출력할 때 원문의 관련 위치를 부드럽게 찾아보는 attention을 붙여 병목을 풀었고, Vaswani 외는 한 걸음 더 나가 순환 구조를 아예 버리고 attention만으로 모델을 만들었습니다. 이 논문의 진짜 기여는 순차 의존을 없애 학습을 병렬화한 것입니다.

### 한 층의 계산

토큰마다 은닉 벡터 x에서 세 가지를 만듭니다. 쿼리 q=xWq("내가 찾는 것"), 키 k=xWk("나를 찾을 때 쓸 간판"), 값 v=xWv("선택되면 건넬 내용")입니다. 위치 i의 점수는 q_i와 모든 k_j의 내적이고, 이를 √d_k로 나눈 뒤 softmax로 가중치를 만들어 v들의 가중 평균을 출력으로 씁니다. 나눗셈의 이유는 직접 계산해 볼 수 있습니다. q와 k의 성분이 평균 0, 분산 1로 독립이면 내적의 분산이 d_k가 됩니다. d_k가 클수록 점수가 커져 softmax가 한 곳으로 쏠리고 기울기가 거의 사라집니다. 논문도 같은 이유를 듭니다.

### 인과 마스크와 멀티헤드

GPT류 디코더 모델은 위치 i가 j≤i만 보도록 점수 행렬의 위쪽 삼각형을 softmax 전에 -inf로 막습니다. 그러면 문장 전체를 한 번에 넣어도 모든 위치가 미래를 훔쳐보지 않은 채 "다음 토큰"을 동시에 학습합니다. 마스크는 softmax 뒤가 아니라 앞에 적용해야 합니다. 뒤에 곱하면 분모에 미래 점수가 섞여 정보가 샙니다. 멀티헤드는 d_model을 h조각으로 나눠 조각마다 따로 attention을 한 뒤 이어 붙이고 Wo로 섞습니다. 논문의 기본 모델은 d_model=512, h=8이라 헤드당 d_k=d_v=64이고, 헤드를 나눠도 전체 연산량은 거의 같습니다.

### 논문 Table 1이 알려 주는 trade-off

논문은 층당 복잡도, 순차 연산 수, 임의의 두 위치 사이 최대 경로 길이를 비교합니다. self-attention은 O(n²·d), 순차 연산 O(1), 경로 길이 O(1)이고 recurrent는 O(n·d²), O(n), O(n)입니다. 병렬성과 "멀리 떨어진 토큰끼리 한 번에 연결"을 얻는 대신 길이 n에 제곱으로 비용을 낸다는 뜻입니다. 이 n² 항이 긴 컨텍스트가 비싼 이유의 뿌리이고 7강의 FlashAttention이 겨냥하는 지점입니다. 참고로 논문의 기본 모델은 6층, 약 6,500만 파라미터로 WMT14 영독 번역 BLEU 27.3을 냈고(큰 모델 28.4), 8개의 P100 GPU에서 10만 스텝(약 12시간)을 학습했습니다. 지금 기준으로는 아주 작지만 구조의 골격은 그대로입니다.

### 읽을 때의 주의

attention 가중치 시각화는 보기 좋지만 모델의 "설명"이 아닙니다. 높은 가중치가 곧 그 토큰이 결론의 원인이라는 뜻은 아닙니다. 고객에게 설명 가능성의 근거로 내밀면 안 됩니다.`,
      code: `import math
import torch
import torch.nn.functional as F

def causal_self_attention(x, Wq, Wk, Wv, Wo, n_heads):
    B, T, C = x.shape
    hd = C // n_heads                                              # head_dim = d_model / h (512/8 = 64)
    split = lambda t: t.view(B, T, n_heads, hd).transpose(1, 2)    # (B, T, C) -> (B, H, T, hd)
    q, k, v = split(x @ Wq), split(x @ Wk), split(x @ Wv)
    scores = q @ k.transpose(-2, -1) / math.sqrt(hd)               # (B, H, T, T): O(T^2) 비용이 여기서 생긴다
    mask = torch.tril(torch.ones(T, T, dtype=torch.bool))          # 하삼각: 위치 i는 j <= i만 본다
    scores = scores.masked_fill(~mask, float("-inf"))              # softmax 전에 -inf로 막는다
    att = F.softmax(scores, dim=-1)                                # 각 행의 합 = 1
    out = (att @ v).transpose(1, 2).reshape(B, T, C)               # 헤드를 다시 이어 붙인다
    return out @ Wo, att

torch.manual_seed(0)
B, T, C, H = 2, 6, 32, 4
x = torch.randn(B, T, C)
Wq, Wk, Wv, Wo = (torch.randn(C, C) / math.sqrt(C) for _ in range(4))
out, att = causal_self_attention(x, Wq, Wk, Wv, Wo, H)

assert out.shape == (B, T, C) and att.shape == (B, H, T, T)
assert torch.allclose(att.sum(-1), torch.ones(B, H, T))             # 모든 행의 합이 1
assert torch.allclose(att, att.tril())                               # 미래 위치의 가중치는 0
x2 = x.clone()
x2[:, -1] += 1.0                                                     # 마지막 토큰만 바꿔도
out2, _ = causal_self_attention(x2, Wq, Wk, Wv, Wo, H)
assert torch.allclose(out[:, :-1], out2[:, :-1], atol=1e-6)         # 앞 위치의 출력은 그대로(인과성)
print("ok")`,
      codeLang: `python`,
      key: [
        `Attention은 소프트 룩업이다: Q가 모든 K와 내적해 softmax 가중치를 만들고, 그 가중치로 V를 평균한다.`,
        `1/√d_k 스케일은 softmax 포화(기울기 소실)를 막고, causal mask는 softmax 전에 -inf로 미래 토큰의 누설을 막는다.`,
        `멀티헤드는 d_model을 h개 부분공간으로 나눠 병렬로 서로 다른 관계를 본다(기본 모델: 512 = 8 × 64).`,
        `층당 비용은 O(n²·d): 병렬성과 경로 길이 O(1)를 얻는 대가로 길이의 제곱 비용을 낸다.`
      ],
      pitfalls: [
        `마스크를 softmax 뒤에 곱하는 것: 분모에 미래 점수가 섞여 학습 때 미래 정보가 새고 행 합이 1이 아니게 된다.`,
        `view와 transpose 순서를 틀려 헤드·시퀀스 차원이 섞이는 것: shape 검사는 통과해도 값이 엉뚱해진다. 인과성 테스트로 잡는다.`,
        `스케일을 √d_model로 나누는 것: 헤드 차원(head_dim) 기준으로 나눠야 한다.`,
        `attention 가중치 그림을 모델의 판단 근거 설명으로 고객에게 제시하는 것.`
      ]
    },
    {
      title: `Transformer 블록·구조 세 가지·파라미터와 메모리 계산`,
      body: `Transformer 블록은 같은 모양을 L번 쌓은 것입니다. 한 블록은 "정규화 → attention → 잔차 더하기"와 "정규화 → MLP → 잔차 더하기" 두 부분으로 이루어집니다. 토큰마다 흐르는 벡터(잔차 스트림)를 공용 버스로 보고, 각 층이 거기서 읽어 계산한 뒤 결과를 더해 넣는다고 생각하면 이해가 빠릅니다. 잔차 연결은 ResNet(He 외, 2015)에서 가져온 장치로, 층이 깊어져도 기울기가 입력까지 흘러 학습이 되게 합니다.

### 현대 구성요소

원 논문은 서브레이어 출력을 더한 뒤 LayerNorm을 하는 post-norm이었습니다. 이후의 대형 모델에서는 서브레이어 앞에서 정규화하는 pre-norm, LayerNorm 대신 RMSNorm(Zhang·Sennrich 2019: 평균 빼기를 생략해 계산이 가볍고 실행 시간이 7~64% 줄었다고 보고), MLP 활성화로 SwiGLU(Shazeer 2020: GLU 변형이 ReLU·GELU보다 낫다고 보고)가 자주 보입니다. 다만 모델마다 다르므로 기술 보고서의 표에서 확인합니다(이 모듈이 직접 확인한 것은 Llama 3 표의 SwiGLU입니다). SwiGLU MLP는 행렬 세 개를 씁니다.

### 구조 세 가지: 마스크와 사전학습 목적의 차이

- 인코더 전용(BERT, 2018): 양방향 attention, 가려 둔 토큰 복원이 목적입니다. 생성은 못 하지만 문장 표현이 좋아 임베딩·분류·재순위화 모델의 조상입니다.
- 디코더 전용(GPT-3, Llama): 인과 attention, 다음 토큰 예측이 목적입니다. 모든 위치가 학습 신호가 되고 프롬프트만으로 과제를 지정합니다(GPT-3는 1,750억 파라미터로 few-shot을 보였습니다). 오늘날 범용 LLM의 표준입니다.
- 인코더-디코더(T5): 입력은 양방향 인코더가, 출력은 디코더가 인코더를 참조해 만들고 모든 과제를 "텍스트→텍스트"로 통일했습니다.

디코더 전용이 주류가 된 이유를 하나로 못 박기는 어렵습니다. 구조가 단순하고, 위치마다 학습 신호가 나오고, KV cache로 서빙하기 좋고, 스케일링 레시피가 잘 정리됐다는 점이 함께 거론됩니다(이 문장은 제 해석입니다).

### 파라미터를 직접 센다

Kaplan 외는 N≈12·L·d²라는 근사를 씁니다(attention 4d² + MLP 8d²). 실제 모델은 GQA와 SwiGLU 때문에 달라지므로 코드로 세는 편이 낫습니다. Llama 3 8B의 층 32, d=4096, ffn=14336, 헤드 32, KV 헤드 8, 어휘 약 128K를 넣으면 약 8.03B가 되고, 한 층에서 MLP가 약 81%(41.9M 대 176.2M, 제 계산)를 차지합니다. 임베딩·출력 행렬은 각각 어휘 × d입니다. Kaplan 외는 스케일링 법칙의 N에서 임베딩 파라미터를 뺐으므로, 법칙을 읽을 때는 N의 정의부터 확인합니다.

### 학습 메모리 암산

혼합정밀도와 Adam으로 학습하면 fp16 가중치 2바이트, fp16 그래디언트 2바이트, fp32 가중치 사본·모멘텀·분산 12바이트를 합쳐 파라미터당 16바이트가 듭니다(ZeRO 논문, Rajbhandari 외 2019의 계산이며 활성값은 빠져 있습니다). 8B 모델이면 활성값을 빼고도 약 128GB여서 80GB GPU 한 장에는 풀 파인튜닝이 들어가지 않습니다. ZeRO는 이 상태들을 여러 GPU에 나눠 저장해 중복을 없애는 방법이고, 데이터·텐서·파이프라인 병렬 같은 분산 학습 기법과 함께 쓰입니다. 여기서는 개요만 다루고 구현은 CS336 과제 2 수준의 심화입니다. 고객이 "우리 데이터로 풀 파인튜닝"을 말할 때 LoRA류 파라미터 효율 기법이나 다중 GPU 분산이 필요한 이유가 여기에 있습니다.`,
      code: `def dense_params(layers, d, ffn, heads, kv_heads, vocab, tied=False):
    hd = d // heads
    attn = d * d + 2 * d * kv_heads * hd + d * d     # Wq, (Wk+Wv), Wo   (GQA면 K,V가 작다)
    mlp = 3 * d * ffn                                 # SwiGLU: gate, up, down 세 행렬
    per_layer = attn + mlp + 2 * d                    # + RMSNorm 가중치 2개
    emb = vocab * d
    return layers * per_layer + d + emb * (1 if tied else 2)   # 마지막 norm + 임베딩 + 출력 행렬

MODELS = {   # 층·d·ffn·헤드는 Llama 3 논문의 표(2024), vocab은 8B config.json의 vocab_size(논문 표는 128,000)
    "8B":   dict(layers=32,  d=4096,  ffn=14336, heads=32,  kv_heads=8, vocab=128_256),
    "70B":  dict(layers=80,  d=8192,  ffn=28672, heads=64,  kv_heads=8, vocab=128_256),
    "405B": dict(layers=126, d=16384, ffn=53248, heads=128, kv_heads=8, vocab=128_256),
}

for name, cfg in MODELS.items():
    n = dense_params(**cfg)
    kv_tok = 2 * cfg["layers"] * cfg["kv_heads"] * (cfg["d"] // cfg["heads"]) * 2   # FP16 바이트/토큰
    print(f"{name}: {n / 1e9:.2f}B 파라미터, FP16 가중치 {2 * n / 2**30:.1f} GiB, KV {kv_tok // 1024} KiB/토큰")

# 학습 FLOPs 암산: C = 6 * N * D  (405B 모델, 15.6T 토큰)
print(f"6ND = {6 * 405e9 * 15.6e12:.2e} FLOPs")      # 논문이 밝힌 약 3.8e25와 맞는지 확인
# 출력 예: 8B 8.03B(FP16 15.0 GiB, KV 128 KiB) / 70B 70.55B(131.4 GiB, KV 320 KiB) / 405B 405.85B(756.0 GiB, KV 504 KiB) / 6ND = 3.79e+25`,
      codeLang: `python`,
      key: [
        `블록 = (정규화 → attention → 잔차) + (정규화 → MLP → 잔차)이고, 잔차 스트림이 층들이 읽고 쓰는 공용 버스다.`,
        `dense 모델 파라미터의 대부분은 MLP(SwiGLU는 행렬 3개)이고, 임베딩·출력 행렬은 각각 어휘 × d다.`,
        `BERT(양방향·복원), GPT(인과·다음 토큰), T5(텍스트→텍스트)의 차이는 attention 마스크와 사전학습 목적이다.`,
        `파라미터는 설정값으로 직접 세고(Llama 3 8B ≈ 8.03B), 학습 메모리는 혼합정밀+Adam 기준 파라미터당 16바이트 안팎으로 어림한다.`
      ],
      pitfalls: [
        `모델 이름의 "8B"를 정확한 값으로 취급하는 것: 임베딩 포함 여부와 입출력 임베딩 공유(tied) 여부로 달라진다.`,
        `스케일링 법칙 논문의 N 정의(Kaplan은 비임베딩)를 확인하지 않고 모델 크기를 대입하는 것.`,
        `학습 메모리를 가중치 크기만으로 계산하는 것: 그래디언트·옵티마이저 상태·활성값 때문에 OOM이 난다.`,
        `인코더 모델(BERT 계열)에 생성 작업을, 또는 생성 모델에 대량 임베딩 작업을 맡기는 설계.`
      ]
    },
    {
      title: `위치 표현(RoPE)과 컨텍스트 길이: 긴 컨텍스트의 실제 한계`,
      body: `Attention 자체는 위치를 모릅니다. 마스크 말고는 토큰 순서를 바꿔 넣어도 각 토큰의 계산이 같으므로, "개가 사람을 물었다"와 "사람이 개를 물었다"를 구분하려면 위치 정보를 따로 넣어야 합니다. 이 방법이 컨텍스트 길이 확장의 한계까지 정합니다.

### 세 가지 방식

- 원 논문의 sinusoidal 위치 인코딩: 위치 pos와 차원 i로 sin(pos/10000^(2i/d_model))과 cos 값을 만들어 입력 임베딩에 더합니다. 논문은 상대 위치를 선형 변환으로 표현하기 쉽고 더 긴 길이로 외삽될 것이라는 가설을 세웠습니다.
- 학습형 절대 위치 임베딩: 위치마다 벡터를 학습합니다(GPT-2류, 일반 지식). 학습한 최대 길이를 넘으면 쓸 수 없습니다.
- RoPE(Su 외, 2021): 더하지 않고 쿼리와 키를 위치에 비례한 각도로 회전시킵니다. 인접한 두 차원을 한 쌍으로 묶어 쌍마다 다른 주파수로 돌리면, 위치 m의 q와 위치 n의 k의 내적이 절대 위치가 아니라 상대 거리 n−m에만 의존합니다(코드로 확인합니다). 앞쪽 차원 쌍은 빠르게 돌아 가까운 거리를, 뒤쪽 쌍은 느리게 돌아 먼 거리를 구분합니다. Llama 3는 이 주파수의 기준값(base)으로 10,000이 아니라 500,000을 씁니다(논문 표).

### 컨텍스트 길이는 설정이 아니라 학습된 능력

학습 때 본 적 없는 길이에서는 회전 각도가 낯선 영역에 들어가 품질이 급락합니다. 그래서 긴 컨텍스트는 위치 보간·기준값 조정 같은 기법과 장문 데이터 추가 학습으로 만듭니다. Llama 3는 8K로 사전학습한 뒤 여섯 단계에 걸쳐 128K까지 늘렸고 약 8,000억 토큰을 썼으며, 단계마다 짧은 컨텍스트 성능을 회복하고 needle-in-a-haystack 과제를 푸는지 확인했습니다(논문). "컨텍스트 창 128K"는 설정 한 줄이 아니라 별도 학습 비용을 낸 결과입니다. 오픈 모델의 ‹max_position_embeddings› 같은 설정값만 올려서 늘리면 품질이 무너질 수 있습니다.

### 창이 크다고 다 잘 쓰는 것은 아니다

Lost in the Middle(Liu 외, 2023년 공개·TACL 2024 게재)은 다문서 QA와 키-값 검색에서 정답 정보가 입력의 처음이나 끝에 있을 때 성능이 가장 높고 중간에 있으면 크게 떨어진다고 보고했고, 긴 컨텍스트용 모델도 마찬가지였습니다. 다만 2023년 모델들의 결과이므로 지금 쓰는 모델에서 재현되는지는 직접 재야 합니다. Anthropic의 컨텍스트 엔지니어링 글(2025-09-29)은 토큰이 늘수록 정보 회수 정확도가 떨어지는 현상을 context rot이라 부르며, 모델에게 "가장 작은 고신호 토큰 집합"을 주라고 권합니다. needle-in-a-haystack은 사실 하나를 찾는 쉬운 시험이라, 여러 조각을 종합해야 하는 실제 업무의 품질을 보장하지 않습니다.

### 길이와 비용

길이 n에서 prefill의 attention 연산은 n²에, KV cache는 n에, 디코드 스텝당 읽는 KV도 n에 비례하고 입력 과금은 선형입니다. 지식 베이스가 약 20만 토큰 미만이면 전체 투입과 캐싱이 RAG보다 단순할 수 있다는 조언도 있지만(Anthropic, 2024-09, 벤더 자체 실험), 고객 데이터로 재검증해야 합니다.`,
      code: `import torch

def rope(x, base=10000.0):
    # x: (T, hd). 인접한 두 차원 (2i, 2i+1)을 한 쌍으로 보고 위치 m에 비례한 각도로 회전한다
    T, hd = x.shape
    inv_freq = base ** (-torch.arange(0, hd, 2).float() / hd)   # 쌍마다 다른 주파수 theta_i
    ang = torch.outer(torch.arange(T).float(), inv_freq)        # (T, hd/2): 위치 x 주파수
    cos, sin = ang.cos(), ang.sin()
    x1, x2 = x[:, 0::2], x[:, 1::2]
    out = torch.empty_like(x)
    out[:, 0::2] = x1 * cos - x2 * sin
    out[:, 1::2] = x1 * sin + x2 * cos
    return out

torch.manual_seed(0)
hd, T = 64, 16
q = torch.randn(hd).repeat(T, 1)          # 모든 위치에 같은 q 벡터
k = torch.randn(hd).repeat(T, 1)          # 모든 위치에 같은 k 벡터
qr, kr = rope(q), rope(k)
score = qr @ kr.T                          # score[m, n] = <R_m q, R_n k>

# 상대 거리 n - m 이 같으면 점수가 같아야 한다
print(torch.allclose(score[5, 2], score[8, 5], atol=1e-3), torch.allclose(score[3, 3], score[9, 9], atol=1e-3))
# 회전은 벡터 길이를 바꾸지 않는다
print(torch.allclose(qr.norm(dim=-1), q.norm(dim=-1), atol=1e-3))
# 상대 거리가 다르면 점수는 보통 다르다 (False가 정상)
print(torch.allclose(score[5, 2], score[8, 2], atol=1e-3))`,
      codeLang: `python`,
      key: [
        `Attention은 순서를 모르므로 위치를 주입해야 한다: sinusoidal은 입력에 더하고, RoPE는 Q와 K를 위치에 비례해 회전시켜 내적이 상대 거리에만 의존하게 한다.`,
        `컨텍스트 길이는 설정값이 아니라 학습된 능력이다: Llama 3는 8K 사전학습 뒤 여섯 단계, 약 8,000억 토큰으로 128K까지 확장했다.`,
        `Lost in the Middle: 핵심 정보가 입력 중간에 있을 때 정확도가 떨어지는 위치 편향이 보고됐으니 내 모델·내 데이터로 측정한다.`,
        `길이 n에서 prefill attention은 n², KV cache와 디코드 스텝당 KV 읽기는 n에 비례한다.`
      ],
      pitfalls: [
        `광고된 컨텍스트 크기가 곧 활용 가능한 품질이라고 가정하고 문서를 전부 투입하는 것.`,
        `중요한 지시와 근거를 긴 프롬프트의 중간에 배치하는 것.`,
        `RoPE 기반 오픈 모델의 최대 길이 설정값만 올려 컨텍스트를 늘리는 것: 확장 학습 없이는 품질이 무너질 수 있다.`,
        `needle-in-a-haystack 통과를 장문 이해 능력의 증명으로 보고하는 것.`
      ]
    },
    {
      title: `디코딩·KV cache·prefill/decode·추론 모델·비결정성`,
      body: `모델이 내놓는 것은 logits(어휘 크기 V개의 점수)이고, 다음 토큰을 어떻게 고를지는 모델 바깥의 디코딩 전략이 정합니다. 이 바깥 루프가 품질·재현성·비용을 모두 좌우합니다.

### 샘플링

softmax(z/T)에서 temperature T가 작으면 분포가 뾰족해지고 T→0이면 argmax(greedy)입니다. T가 크면 평평해져 낮은 확률의 토큰이 자주 뽑힙니다. top-k는 상위 k개만 남기고, top-p(nucleus, Holtzman 외 2019, ICLR 2020)는 확률 내림차순으로 누적해 p에 도달하는 최소 집합만 남깁니다. 분포 모양에 따라 후보 수가 자동으로 변하는 것이 장점입니다. 논문의 요지는, 가장 높은 확률만 계속 고르면 반복적이고 밋밋한 글로 퇴화하고 꼬리까지 순수 샘플링하면 엉뚱한 토큰이 섞이므로 그 사이를 잡자는 것입니다. beam search는 확률이 높은 후보 경로 k개를 끝까지 유지해 가장 그럴듯한 전체 문장을 찾는 방식으로, 정답 문장이 좁게 정해지는 번역·요약에는 오래 쓰였습니다. 개방형 생성에서는 같은 이유로 반복적이고 밋밋한 글이 되기 쉬워 지금의 채팅형 서비스는 대부분 샘플링을 씁니다(이 문장의 후반부는 제 정리입니다). 상용 API가 노출하는 샘플링 파라미터는 벤더와 모델마다 달라서 문서를 확인해야 합니다.

### 자기회귀와 KV cache

토큰 t를 만들려면 이전 모든 토큰의 K와 V가 필요합니다. 캐시가 없으면 매 스텝 과거를 전부 다시 계산해 길이 n 생성에 약 n²에 비례하는 토큰 처리를 합니다. KV cache는 각 층·각 KV 헤드의 K, V를 저장하고 새 토큰의 것만 계산해 붙입니다. 크기는 2(K와 V) × 층 × KV 헤드 × head_dim × 바이트 × 토큰 수입니다. Llama 3 8B는 2×32×8×128×2바이트로 토큰당 128KiB, 8K 컨텍스트 하나가 1GiB이고 동시 32개면 32GiB입니다. 70B는 토큰당 320KiB라 128K 컨텍스트 하나가 약 40GiB입니다(논문 표로 계산한 값). 참고로 PagedAttention 논문은 OPT-13B가 토큰당 약 800KB라고 계산합니다.

### prefill과 decode

prefill은 프롬프트 전체를 한 번에 병렬 처리하므로 행렬이 커서 연산이 병목이고 첫 토큰까지의 시간(TTFT)을 정합니다. decode는 한 번에 한 토큰이라 연산은 적은데 가중치와 KV를 읽어야 해서 메모리 대역폭이 병목이고 토큰 간 시간(TPOT)과 처리량을 정합니다. 입력이 길고 출력이 짧은 RAG와 입력이 짧고 출력이 긴 생성은 병목이 다르므로 서버 설정도 지표도 달라야 합니다.

### 추론 모델은 "더 긴 디코딩"

reasoning 모델은 답하기 전에 사고 토큰을 길게 생성합니다. DeepSeek-R1(Nature 2025)은 사람이 라벨링한 추론 과정 없이 순수 강화학습만으로 추론 능력을 끌어낼 수 있다고 보고했고, 대상은 수학·코딩처럼 정답을 검증할 수 있는 과제였습니다. 서빙 관점에서는 디코드 스텝이 늘어나는 것이라 지연과 비용이 사고 토큰 수에 비례합니다. OpenAI 가이드(2026-11 열람)는 reasoning 토큰이 보이지 않지만 출력 토큰 요율로 과금되고 ‹max_output_tokens›에 포함되어, 한도가 작으면 보이는 텍스트 없이 끝날 수 있다고 안내합니다. Snell 외(2024)는 문제 난이도에 맞춰 추론 계산을 배분하는 편이 효과적이라고 보였으니, 쉬운 질문에 높은 사고량을 쓰는 것은 낭비입니다.

### temperature 0도 결정적이지 않다

Thinking Machines(2025-09-10)는 Qwen3-235B-A22B-Instruct-2507에 같은 프롬프트를 temperature 0으로 1,000번 요청해 80가지 다른 결과를 얻었고, 103번째 토큰에서 갈라졌다고 보고합니다. 원인은 병렬 합산 순서 자체보다 서버 부하에 따라 배치 크기가 바뀌고 커널 결과가 배치 크기에 따라 달라지는 것(배치 불변성 부재)이었습니다. 커널을 고치자 1,000개가 모두 같아졌지만 Qwen3-8B 실험에서 26초가 55초(개선 후 42초)로 느려졌습니다. 재현성은 계약서에서 "보장"이 아니라 통계적 기준으로 다룹니다.`,
      code: `import math
import torch

torch.manual_seed(0)
d = 16
Wq, Wk, Wv = (torch.randn(d, d) / math.sqrt(d) for _ in range(3))

def attend(q, K, V):                          # q: (d,)  K, V: (t, d)   한 헤드·한 층의 단순화
    w = torch.softmax(K @ q / math.sqrt(d), dim=0)
    return w @ V

xs = torch.randn(6, d)                        # 6개 토큰의 (가상) 은닉 상태

full = []                                     # 1) 캐시 없음: 매 스텝 과거 전체의 K, V를 다시 계산
for t in range(len(xs)):
    K, V = xs[: t + 1] @ Wk, xs[: t + 1] @ Wv
    full.append(attend(xs[t] @ Wq, K, V))

cK, cV, cached = [], [], []                   # 2) 캐시 사용: 새 토큰의 K, V만 계산해 덧붙인다
for t in range(len(xs)):
    cK.append(xs[t] @ Wk)
    cV.append(xs[t] @ Wv)
    cached.append(attend(xs[t] @ Wq, torch.stack(cK), torch.stack(cV)))

print("같은 결과:", torch.allclose(torch.stack(full), torch.stack(cached), atol=1e-6))

def kv_bytes(layers, kv_heads, head_dim, tokens, dtype_bytes=2):
    return 2 * layers * kv_heads * head_dim * tokens * dtype_bytes     # 2 = K와 V

print(kv_bytes(32, 8, 128, 8192) / 2**30, "GiB")    # Llama 3 8B, 8K 컨텍스트, 시퀀스 1개: 1.0`,
      codeLang: `python`,
      key: [
        `temperature는 softmax 전에 logits를 나누는 값이고, top-p는 누적 확률이 p에 도달하는 최소 후보 집합에서만 샘플링한다.`,
        `KV cache 크기 = 2 × 층 × KV 헤드 × head_dim × 바이트 × 토큰 수다. Llama 3 8B는 토큰당 128KiB, 8K 컨텍스트 한 개가 1GiB다.`,
        `prefill은 연산이 병목(TTFT), decode는 메모리 대역폭이 병목(토큰 간 지연·처리량)이다.`,
        `추론 모델은 사고 토큰만큼 디코딩이 길어지고 출력 요율로 과금된다. temperature 0이어도 배치 크기 변화로 출력이 달라질 수 있다.`
      ],
      pitfalls: [
        `temperature 0이면 항상 같은 출력이라 가정하고 문자열 완전일치 회귀 테스트를 쓰는 것.`,
        `동시 사용자 수용량을 가중치 메모리만으로 산정하고 KV cache를 빼먹는 것.`,
        `추론 모델의 max_output_tokens를 일반 모델처럼 작게 잡아 사고 토큰이 한도를 먹고 빈 답이 나오는 것.`,
        `temperature와 top-p를 동시에 이것저것 바꿔 어느 쪽의 효과인지 분리하지 못하는 것.`
      ]
    },
    {
      title: `서빙 최적화: GQA·FlashAttention·PagedAttention·투기적 디코딩·양자화`,
      body: `서빙 최적화를 한 문장으로 줄이면, 디코드가 메모리 대역폭에 묶여 있으니 읽는 바이트를 줄이고 한 번 읽은 가중치로 더 많은 요청을 처리한다는 것입니다.

### 대역폭 모델로 감 잡기

디코드 한 스텝은 가중치 전체를 한 번 읽고(배치 안의 모든 요청이 공유), 요청마다 자기 KV cache를 읽습니다. 연산 시간을 무시하면 초당 토큰 수의 상한은 batch × 대역폭 ÷ (가중치 바이트 + batch × 요청당 KV 바이트)입니다. 대역폭을 1TB/s로 가정하고 8B FP16(16GB), 컨텍스트 4K(KV 0.5GiB)로 계산하면 배치 1에서 약 60 tokens/s, 배치 32에서 약 960 tokens/s입니다. 배치를 키울수록 가중치 읽기 비용이 요청들에 나뉘어 처리량이 크게 오르지만, KV 항이 배치에 비례해 늘어 곡선이 꺾이고 VRAM에도 한도가 있습니다. 가정값이므로 실제는 부하 테스트로 확인합니다.

### 읽는 바이트를 줄이는 기술

- **GQA/MQA**: 쿼리 헤드는 그대로 두고 KV 헤드를 줄입니다(Ainslie 외, 2023). Llama 3 8B는 쿼리 32개에 KV 8개라 KV cache가 MHA의 4분의 1입니다. 논문은 기존 MHA 체크포인트를 원 사전학습 계산량의 약 5%로 변환하는 방법도 제안합니다. DeepSeek-V3의 MLA는 KV를 저차원 잠재 벡터로 압축하는 다른 접근입니다.
- **FlashAttention**(Dao 외, 2022): n×n 점수 행렬을 GPU 메모리(HBM)에 쓰지 않고 작은 타일로 나눠 빠른 SRAM에서 처리합니다. 근사가 아니라 정확한 attention이며, 병목이 FLOPs가 아니라 메모리 이동이라는 관점을 줍니다. 논문은 GPT-2 학습 약 3배 가속을 보고했고 후속 v2(약 2배), v3(H100에서 1.5~2.0배)가 이어졌습니다. 보통 서빙 엔진과 프레임워크가 알아서 쓰므로 직접 구현할 일은 드뭅니다.
- **양자화**: 가중치를 INT8·INT4로 저장해 읽는 바이트를 줄입니다. LLM.int8()은 이상치 차원만 16비트로 두고 나머지를 8비트로 처리해 메모리를 약 절반으로 줄이면서 175B까지 성능 저하가 없다고 보고했고, GPTQ는 3~4비트까지, AWQ는 활성값 통계로 중요한 채널을 보호합니다. 품질 영향은 모델·과제·언어마다 달라서 한국어를 포함한 내 평가셋으로 재야 하며 공개 수치는 보증이 아닙니다. FP8 같은 저정밀 연산과 llama.cpp용 GGUF 파일 형식은 ai-serve 모듈에서 다룹니다.

### 한 번에 더 많이 처리하는 기술

- **PagedAttention과 연속 배칭(vLLM)**: 기존 시스템은 KV 메모리 중 실제 토큰 상태가 차지하는 비율이 20.4~38.2%에 그쳤다고 논문이 보고합니다(나머지는 단편화와 최대 길이 예약). OS 가상 메모리처럼 KV를 16토큰 블록으로 쪼개 필요할 때 블록 테이블로 할당하고, 같은 프롬프트를 쓰는 샘플은 블록을 공유하다가 쓸 때만 복사합니다. 연속 배칭은 요청 단위가 아니라 토큰 스텝 단위로 끝난 요청을 빼고 새 요청을 끼웁니다. 논문은 vLLM이 FasterTransformer·Orca 같은 기존 시스템보다 같은 지연에서 2~4배 처리량을 낸다고 보고합니다. 토큰 단위 스케줄링을 이미 하던 Orca와 비교해도 이득이 나오는 것은 KV 메모리를 낭비 없이 써서 배치를 키운 효과가 크다는 뜻이라고 저는 읽습니다. prefix caching(공통 시스템 프롬프트의 KV 재사용)은 API의 prompt caching과 같은 원리입니다.
- **투기적 디코딩**(Leviathan 외, 2022): 작은 모델이 여러 토큰을 제안하면 큰 모델이 한 번의 forward로 병렬 검증하며, 출력 분포는 큰 모델과 같게 유지됩니다. T5-XXL에서 2~3배를 보고했고 제안 수락률이 낮으면 이득이 줄어듭니다.

### 운영 지표

TTFT, TPOT, 처리량(tokens/s), p95·p99 지연, VRAM 사용률을 동시성 1/8/32에서 재서 표로 냅니다. GPU 사이징은 가중치 + KV(동시성 × 컨텍스트) + 런타임 오버헤드 + 헤드룸을 더하고 실측으로 확정합니다.`,
      code: `def decode_tps(n_params, weight_bytes, bandwidth, batch, kv_bytes_per_seq):
    # 디코드 한 스텝은 가중치 전체를 한 번 읽고(배치가 공유), 시퀀스마다 자기 KV를 읽는다.
    step_bytes = n_params * weight_bytes + batch * kv_bytes_per_seq
    step_seconds = step_bytes / bandwidth      # 연산 시간은 무시: 메모리 대역폭 상한 모델
    return batch / step_seconds                # 초당 생성 토큰 수 (모든 시퀀스 합계)

BW = 1.0e12                                    # 가정값: 1 TB/s. 실제 GPU는 제조사 사양서로 바꿀 것
N = 8.03e9                                     # Llama 3 8B
KV_PER_TOKEN = 2 * 32 * 8 * 128 * 2            # 131,072 바이트 (FP16 KV, GQA의 KV 헤드 8개)
CTX = 4096                                     # 요청당 컨텍스트 (KV는 FP16 그대로라고 가정)

print("정밀도  배치  tokens/s(상한)  요청당 tokens/s")
for label, wb in (("FP16", 2.0), ("INT8", 1.0), ("INT4", 0.5)):
    for batch in (1, 8, 32, 64):
        tps = decode_tps(N, wb, BW, batch, KV_PER_TOKEN * CTX)
        print(f"{label:>5} {batch:>5} {tps:>12,.0f} {tps / batch:>14,.1f}")`,
      codeLang: `python`,
      key: [
        `디코드 처리량의 상한은 batch × 대역폭 ÷ (가중치 바이트 + batch × 요청당 KV 바이트)이고, 그래서 배칭이 처리량을 크게 올린다.`,
        `GQA는 KV 헤드를 줄여 KV cache를 줄이고(Llama 3 8B: 32/8 → 4분의 1), FlashAttention은 메모리 이동을 줄여 정확한 attention을 빠르게 한다.`,
        `PagedAttention은 KV를 블록 단위로 동적 할당해 낭비(기존 시스템에서 토큰 상태 점유율 20.4~38.2%)를 줄이고, vLLM은 기존 시스템 대비 같은 지연에서 2~4배 처리량을 보고했다.`,
        `투기적 디코딩은 출력 분포를 바꾸지 않고 지연을 줄이지만, 양자화는 품질을 바꿀 수 있어 내 평가셋으로 검증해야 한다.`
      ],
      pitfalls: [
        `처리량(tokens/s)만 보고 TTFT·p95를 확인하지 않는 것: 평균은 좋은데 사용자 체감은 나쁜 서비스가 된다.`,
        `논문·벤더의 배수(2~4배 등)를 내 워크로드에 그대로 약속하는 것.`,
        `INT4 같은 양자화 모델을 한국어 평가 없이 납품하는 것.`,
        `GPU VRAM에 가중치만 맞추고 KV·동시성 여유를 두지 않아 피크 때 OOM이 나거나 요청이 거절되는 것.`
      ]
    },
    {
      title: `MoE·Mamba·오픈 모델 지형과 기술 보고서 읽는 법`,
      body: `dense 모델은 모든 토큰이 모든 파라미터를 통과합니다. MoE(Mixture of Experts)는 층의 MLP를 여러 전문가로 쪼개고, 작은 라우터가 토큰마다 상위 k개만 골라 그 출력을 가중합합니다. 용량(총 파라미터)은 키우면서 토큰당 연산은 활성 파라미터만큼만 쓰자는 발상입니다. Shazeer 외(2017)가 수천 개 전문가의 희소 게이팅으로 용량을 1,000배 넘게 키울 수 있음을 보였고, Switch Transformer(2021)는 토큰당 전문가를 하나로 단순화해 학습 안정성을 높였으며, Mixtral(2024)은 층마다 8개 중 2개를 골라 총 약 47B에 활성 약 13B를 쓰면서 Apache 2.0으로 공개됐습니다. DeepSeek-V3는 총 671B, 활성 37B이고 14.8T 토큰으로 약 278.8만 H800 GPU-시간에 학습했다고 보고합니다.

### MoE를 서빙할 때 틀리기 쉬운 것

"총 파라미터 ≠ 토큰당 계산량"입니다. 그렇다고 활성 13B만 메모리에 올리면 된다는 뜻은 아닙니다. 어떤 토큰이 어떤 전문가를 고를지 미리 알 수 없어 모든 전문가의 가중치가 메모리에 있어야 하므로, VRAM은 총 파라미터 기준(FP16이면 Mixtral은 약 94GB)이고 토큰당 연산과 지연은 활성 파라미터에 가깝습니다. 학습에서는 일부 전문가에만 토큰이 몰리지 않도록 균형을 잡는 장치가 필요하고, 코드의 ‹load› 값이 그 점검 지표입니다. 배치가 커지면 더 많은 전문가가 활성화되어 읽는 가중치도 늘어난다는 점(제 추론)도 처리량 예측에서 감안합니다.

### attention의 대안

Mamba(Gu·Dao, 2023)는 입력에 따라 무엇을 기억하고 잊을지 정하는 선택적 상태공간 모델입니다. attention 없이 시퀀스 길이에 선형 시간으로 동작하고 상태 크기가 고정이라 KV cache가 길이에 따라 늘지 않습니다. 다만 외주 프로젝트의 기본 선택지는 여전히 Transformer 계열 오픈 모델이라고 보며(2026-11 기준 제 판단), 대안 계보는 장문·저지연 같은 특수 요구에서 검토합니다.

### 오픈 모델 지형 (값은 각 보고서 기준)

| 모델(보고서 시점) | 구조 | 눈여겨볼 값 |
| Llama 3 (2024-07) | dense 8B/70B/405B, GQA | KV 헤드 8, 어휘 128K, 컨텍스트 128K |
| Mixtral (2024-01) | MoE, 8개 중 2개 선택 | 총 약 47B, 활성 약 13B, Apache 2.0 |
| DeepSeek-V3 (2024-12) | MoE + MLA | 총 671B, 활성 37B, 14.8T 토큰 |
| Qwen3 (2025-05) | dense와 MoE, 0.6B~235B | thinking/non-thinking 통합, 119개 언어, Apache 2.0 |
| gpt-oss (2025-08) | MoE 추론 모델 120b/20b | Apache 2.0, 도구 사용·에이전트 지향 |

### 기술 보고서 읽는 순서

1. 아키텍처 표: 층·d·ffn·헤드·KV 헤드·어휘·컨텍스트를 직접 파라미터와 KV로 계산해 공식 수치와 맞춰 봅니다(4·6강).
2. 학습 토큰 수와 데이터 구성: 한국어 비중과 오염 점검 여부를 찾습니다.
3. 컨텍스트 확장 방식: 실제로 어느 길이까지 학습했는지 봅니다.
4. 평가 설정: 몇 shot인지, 자체 평가인지 제3자 평가인지 봅니다. 공개 리더보드는 참고로만 씁니다(Leaderboard Illusion 논문은 Chatbot Arena 분석에서 비공개 테스트와 선택적 공개가 순위를 왜곡할 수 있다고 주장합니다).
5. 라이선스: 상업 이용·재배포·규모 조건을 원문에서 확인합니다.
6. 한국어 모델은 EXAONE 3.5(LG AI Research, 32B·7.8B·2.4B)와 HyperCLOVA X 보고서가 있고, 한국어 벤치마크 KMMLU(35,030문항·45과목)는 2024년 시점의 범위로 읽습니다.`,
      code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class MoE(nn.Module):
    def __init__(self, d, hidden, n_experts, k):
        super().__init__()
        self.k = k
        self.router = nn.Linear(d, n_experts, bias=False)
        self.experts = nn.ModuleList(
            nn.Sequential(nn.Linear(d, hidden), nn.SiLU(), nn.Linear(hidden, d))
            for _ in range(n_experts)
        )

    def forward(self, x):                                   # x: (tokens, d)
        topv, topi = self.router(x).topk(self.k, dim=-1)    # 토큰마다 상위 k개 전문가
        w = F.softmax(topv, dim=-1)                         # 선택된 k개끼리만 가중치 정규화
        out = torch.zeros_like(x)
        for e, expert in enumerate(self.experts):
            tok, slot = (topi == e).nonzero(as_tuple=True)  # 전문가 e를 고른 (토큰, 슬롯)
            if tok.numel():
                out[tok] += w[tok, slot].unsqueeze(-1) * expert(x[tok])
        load = torch.bincount(topi.flatten(), minlength=len(self.experts))
        return out, load                                    # load: 전문가별 처리 토큰 수

torch.manual_seed(0)
moe = MoE(d=64, hidden=256, n_experts=8, k=2)
x = torch.randn(1000, 64)
y, load = moe(x)
total = sum(p.numel() for p in moe.parameters())
active = moe.router.weight.numel() + 2 * sum(p.numel() for p in moe.experts[0].parameters())
print("전문가별 토큰 수:", load.tolist(), "합계", int(load.sum()))     # 2000 = 1000 토큰 x k=2
print(f"총 파라미터 {total:,}  토큰당 활성 {active:,}  비율 {active / total:.2f}")`,
      codeLang: `python`,
      key: [
        `MoE는 라우터가 토큰마다 k개 전문가만 활성화해, 연산·지연은 활성 파라미터를 따르고 VRAM은 총 파라미터를 따른다(Mixtral 약 47B/13B, DeepSeek-V3 671B/37B).`,
        `학습 시 전문가 부하 균형(load)이 깨지면 일부 전문가만 쓰이므로 균형 장치와 점검 지표가 필요하다.`,
        `Mamba류 상태공간 모델은 고정 크기 상태로 긴 시퀀스를 선형 시간에 처리하는 대안 계보이지만, 기본 선택지는 여전히 Transformer 계열이다(2026-11 기준 판단).`,
        `기술 보고서는 아키텍처 표 → 직접 계산 → 데이터·컨텍스트·평가 설정·라이선스 순으로 읽는다.`
      ],
      pitfalls: [
        `MoE의 "활성 13B"만 보고 13B급 GPU로 서빙할 수 있다고 견적하는 것.`,
        `모델 카드의 벤치마크 평균만 비교하고 평가 설정과 한국어 비중은 확인하지 않는 것.`,
        `"오픈 모델"이라는 말을 상업 이용 허용으로 받아들이는 것: 라이선스 원문의 조건을 읽어야 한다.`,
        `최신 모델 이름과 크기를 단정적으로 안내하는 것: 모델 지형은 몇 달 단위로 바뀌므로 날짜를 붙여 말한다.`
      ]
    },
    {
      title: `사전학습 데이터와 스케일링 법칙: Kaplan·Chinchilla·Sardana 읽기`,
      body: `사전학습은 웹 등 대규모 텍스트로 다음 토큰을 맞히게 하는 단계입니다. 품질은 데이터 파이프라인(수집 → 추출 → 품질 필터 → 중복 제거 → 평가 오염 제거)에서 크게 갈립니다. FineWeb(Penedo 외, 2024)는 Common Crawl 96개 스냅샷에서 15조 토큰을 만들었고 교육성 부분집합 FineWeb-Edu는 1.3조 토큰이며 설계 과정을 공개했습니다. Lee 외(2021)는 거의 같은 문서와 긴 반복 구간을 제거하면 암기가 줄고 train-test 중복이 줄어 평가가 믿을 만해진다고 보였습니다.

### Kaplan 외(2020): 거듭제곱 법칙

교차 엔트로피 손실이 비임베딩 파라미터 N, 데이터 D, 컴퓨트 C에 대해 매우 넓은 범위에서 거듭제곱으로 줄어든다는 관찰입니다. 지수는 α_N≈0.076, α_D≈0.095이고 컴퓨트는 최적 배치 크기 기준 α_C≈0.050입니다(고정 배치는 약 0.057). 손실의 절대 크기를 정하는 상수들은 어휘와 토크나이저에 따라 달라 그 자체로는 의미가 없다고 논문이 밝히며, 실험은 50,257 토큰 BPE 어휘의 WebText2 기준입니다. 풀어 읽으면 N을 10배 키울 때 손실이 약 0.84배(10의 −0.076제곱), D를 10배 늘릴 때 약 0.80배가 됩니다. 폭·깊이 같은 구조보다 규모가 중요하고, 컴퓨트가 고정이면 큰 모델을 수렴 전에 멈추는 쪽이 유리하다고 결론 내렸습니다(N∝C^0.73, D∝C^0.27). 모델을 8배 키우면 과적합을 피하려 데이터가 약 5배 필요하다는 서술도 있습니다.

### Hoffmann 외(2022), Chinchilla: 교정

400개 넘는 모델 실험의 세 가지 접근에서 모델 크기와 토큰 수를 거의 같은 비율로 늘려야 한다는 결과(지수 약 0.5 대 0.5, Kaplan은 0.73 대 0.27)를 얻었습니다. Gopher(280B, 3,000억 토큰)와 같은 계산량으로 70B에 1.4T 토큰을 쓴 Chinchilla가 앞섰습니다. 논문이 명시한 규칙은 모델 크기가 2배면 토큰도 2배라는 것이고, 파라미터당 약 20토큰이라는 흔한 요약은 Chinchilla 자신의 1.4T÷70B에서 나온 값입니다. 이 비율이면 C≈6ND에서 N=√(C/120)입니다. 논문의 적합식 L=E+A/N^α+B/D^β(E=1.69, A=406.4, B=410.7, α≈0.34, β≈0.28)로 직접 계산하면 Chinchilla가 약 1.94, Gopher가 약 1.99입니다. 다만 이 세 번째 접근의 적합값은 Besiroglu 외(2024)의 재현 시도에서 첫 두 접근과 맞지 않고 신뢰구간이 비현실적으로 좁다는 지적을 받았습니다. 값 자체보다 손실이 하한 + 모델 항 + 데이터 항으로 갈라진다는 형태를 배우는 용도로 씁니다.

### Sardana 외(2023): 추론 비용을 넣으면

학습은 약 6N·D, 추론은 토큰당 약 2N FLOPs로 놓고 추론 수요를 더하면, 수요가 매우 크면(약 10억 요청 규모) 더 작은 모델을 Chinchilla 권장보다 훨씬 많은 토큰으로 학습하는 편이 총비용에 유리합니다. 오픈 모델이 20토큰/파라미터를 크게 넘겨 학습되는 이유입니다. 논문이 든 예(30B Chinchilla급 품질, 추론 토큰 10^13)에서는 13.6B 모델을 더 많은 데이터로 학습하면 총 FLOPs가 28% 줄어듭니다. 아래 코드는 Hoffmann의 적합식을 그대로 써서 같은 13.6B에 약 1.15T 토큰(파라미터당 약 84)이 필요하고 총 FLOPs가 30B의 약 절반(약 48% 절감)으로 나옵니다. 절감폭이 다른 것은 Sardana 외가 자기 실험(47개 모델)으로 적합식을 따로 맞췄기 때문이며, 제 코드는 원리를 보이는 장난감 계산입니다. 논문 자신도 FLOPs가 비용이 아니고(추론 MFU가 약 1%까지 낮아질 수 있음), 1만 토큰/파라미터를 넘는 외삽은 더 연구가 필요하다고 밝힙니다. 참고로 Llama 3 405B는 15.6T÷405B≈38.5토큰/파라미터입니다.

### 비용 감각과 후학습

Schaeffer 외(2023)는 급격해 보이는 "창발 능력"이 비연속적인 평가 지표 선택의 산물일 수 있다고 주장합니다. 비용 감각으로는 DeepSeek-V3 약 278.8만 H800 GPU-시간, nanochat README의 8×H100 약 2시간·약 $48(GPT-2급 능력, 저장소 주장이며 2026-11 열람 시점 리더보드 최신 기록은 약 1.65시간이라 수치가 계속 줄고 있습니다)이 있습니다. 사전학습 모델은 글을 이어 쓰는 모델이고, 후학습이 SFT(시연으로 형식·지시 수행), 선호 최적화(RLHF·DPO), 검증 가능한 보상 기반 RL(RLVR·GRPO)로 행동을 입힙니다. InstructGPT에서는 1.3B가 175B GPT-3보다 선호됐습니다(저자들의 프롬프트 분포에서 한 사람 평가 기준). 합성 데이터와 증류도 학습 재료로 쓰이며 gpt-oss 모델 카드는 대규모 증류와 RL로 학습했다고 밝힙니다(상세는 ai-post 모듈).`,
      code: `E, A, B, ALPHA, BETA = 1.69, 406.4, 410.7, 0.34, 0.28   # Hoffmann 외(2022)가 보고한 적합값

def loss(n, d):
    return E + A / n**ALPHA + B / d**BETA

def tokens_for_loss(n, target):               # 목표 손실에 필요한 학습 토큰 수 (식을 d에 대해 푼다)
    rest = target - E - A / n**ALPHA
    return (B / rest) ** (1 / BETA) if rest > 0 else float("inf")

def total_flops(n, d_train, inference_tokens):
    return 6 * n * d_train + 2 * n * inference_tokens    # 학습 6ND + 추론 토큰당 2N

print("Chinchilla 70B/1.4T :", round(loss(70e9, 1.4e12), 3))
print("Gopher    280B/300B :", round(loss(280e9, 300e9), 3))   # 같은 계산량인데 손실은 더 높다

target = loss(30e9, 0.6e12)                   # 30B를 파라미터당 20토큰으로 학습했을 때의 손실
for n in (30e9, 16e9, 13.6e9, 8e9):
    d = tokens_for_loss(n, target)            # 같은 손실에 도달하려면 필요한 토큰
    for infer in (1e11, 1e13):                # 서비스 기간 동안 생성할 추론 토큰 수
        f = total_flops(n, d, infer)
        print(f"N={n / 1e9:5.1f}B D={d / 1e12:5.2f}T ({d / n:5.1f} tok/param) 추론토큰={infer:.0e} 총FLOPs={f:.2e}")`,
      codeLang: `python`,
      key: [
        `Kaplan: 손실은 N(비임베딩)·D·C에 대해 거듭제곱으로 줄고(α_N≈0.076, α_D≈0.095), 구조보다 규모가 중요하다.`,
        `Chinchilla: 고정 컴퓨트에서 N과 D를 거의 같은 비율로 늘린다. 규칙은 파라미터당 약 20토큰, C≈6ND, N=√(C/120).`,
        `Sardana: 추론 수요가 크면 더 작은 모델을 더 많은 토큰으로 학습하는 편이 총비용에 유리하다. 다만 FLOPs는 비용이 아니고 극단 비율의 외삽은 불확실하다.`,
        `데이터 품질(필터링·중복 제거·오염 제거)이 평가의 신뢰와 암기 위험을 좌우하고, 후학습(SFT·선호 최적화·RLVR)이 사전학습 모델에 행동을 입힌다.`
      ],
      pitfalls: [
        `Chinchilla의 "20토큰/파라미터"를 모든 상황의 최적으로 인용하는 것: 학습 계산량만 최소화하는 기준이다.`,
        `Kaplan과 Chinchilla의 지수(0.73 대 0.5)가 다른 것을 모르고 오래된 결론을 가져다 쓰는 것.`,
        `논문의 FLOPs 절감률을 곧 금액 절감률로 말하는 것: 학습과 추론의 하드웨어 활용률이 다르다.`,
        `"창발"이나 벤치마크 점수 변화를 지표 선택과 데이터 오염 확인 없이 모델의 본질적 변화로 해석하는 것.`
      ]
    },
    {
      title: `통합 사례: "우리 전용 LLM을 처음부터 학습해 달라"는 제조업 고객`,
      body: `실제 의뢰서에 가깝게 가정한 사례입니다(이름과 수치는 가공). 직원 800명의 제조업체가 이렇게 요청합니다. "사내 규정, 설비 매뉴얼, 품질 보고서를 한국어로 물어보면 답하는 우리만의 LLM을 처음부터 학습해서 사내 서버에 올려 주세요. 동시 사용자는 50명이고 문서는 30쪽짜리도 통째로 넣고 싶습니다. 문서를 외부로 보내면 안 됩니다."

### 1단계: 수단을 목표로 번역하기

"처음부터 학습"은 수단이고 진짜 목표는 사내 문서에 근거한 정확한 답, 데이터 반출 통제, 통제 가능한 비용입니다. 목표가 보이면 선택지가 열립니다. 이 번역이 기술 지식보다 먼저 외주의 성패를 가릅니다.

### 2단계: 사전학습은 암산으로 걸러낸다 (9강)

7B 모델을 compute-optimal로 학습하려면 파라미터당 약 20토큰이라 약 1,400억 토큰이 필요하고, 연산량은 6ND≈5.9e21 FLOPs입니다. GPU 한 장이 실효 300 TFLOPs를 낸다고 가정하면(가정값입니다) 약 5,400 GPU-시간입니다. 더 큰 문제는 데이터입니다. 사내 문서가 5억 토큰이라 해도 필요량의 0.4%이고, 반복 학습으로 메우면 과적합·암기가 심해집니다. 그렇게 만든 모델도 수조 토큰으로 학습한 오픈 모델보다 약할 것입니다. 사전학습은 권하지 않습니다.

### 3단계: 후학습과 RAG가 각각 해 주는 일

SFT는 형식과 지시 수행을, 선호 최적화는 사람이 더 좋아하는 답 쪽으로의 정렬을, 검증 가능한 보상 기반 RL은 수학·코드 같은 추론 행동을 끌어올립니다. 그러나 어느 것도 "사내 규정의 최신 사실"을 믿을 만하게 심어 주는 도구는 아닙니다. 사실은 바뀌고 출처가 필요하므로 외부 색인에서 가져오는 RAG(ai-rag 모듈)가 맞고, 말투나 출력 형식이 문제일 때만 가벼운 후학습을 얹습니다.

### 4단계: 모델 선정과 사이징 (6~8강)

30쪽 한국어 문서는 토큰이 수만 개일 수 있어(실측 필요, 2강) 32K 컨텍스트를 가정해 봅니다. 8B 모델은 토큰당 KV cache가 128KiB이므로 요청 하나가 4GiB, 동시 50개면 200GiB입니다. 가중치 16GB는 오히려 작은 항입니다. 등록 사용자 50명과 동시 활성 요청 수는 다르니 로그와 인터뷰로 피크를 실측하고, RAG로 컨텍스트를 6K 안팎으로 줄이면 50개 동시에도 약 37.5GiB입니다. 가중치와 합쳐 80GB급 GPU 한 장이 현실적인 후보가 됩니다. 이 값은 출발점이고, 서버를 띄워 동시성 1/8/32 부하 테스트로 TTFT·p95·tokens/s를 재서 확정합니다. 모델 후보는 라이선스 원문, 아키텍처 표, 한국어 자체 평가셋 순으로 비교하며 KMMLU 같은 공개 벤치마크는 범위와 연식이 한계입니다.

### 5단계: 한계를 설계와 계약에 넣기

환각은 학습·평가가 "모르겠다"보다 "일단 답하기"를 보상해서 생긴다는 분석이 있습니다(Kalai 외, 2025). 그래서 근거가 없으면 거절하도록 설계하고, 출처를 표기하고, 평가셋에 "문서에 답이 없는" 문항을 넣습니다. 규정 해석처럼 다단계 추론이 필요한 질문만 추론 모델로 보내면 사고 토큰이 만드는 지연·비용을 통제할 수 있습니다. "같은 질문에 항상 같은 답"은 배치 크기에 따른 비결정성 때문에 보장할 수 없다고 계약서에 적고, 대신 평가셋 통과율을 수용 기준으로 삼습니다.

### 제안서의 형태

진단·사이징 보고서(며칠) → PoC → 구축의 단계 계약으로 나누고 각 산출물에 가정과 미확정 항목을 표로 붙입니다. "처음부터 학습"을 그냥 거절하지 말고, 그 요구가 목표에 맞지 않는 이유를 숫자로 보여 주는 것이 신뢰를 만듭니다.`,
      code: `def pretrain_estimate(n_params, tok_per_param=20, eff_tflops=300.0):
    d = n_params * tok_per_param                   # Chinchilla 규칙: 파라미터당 약 20토큰
    flops = 6 * n_params * d                       # C = 6ND
    gpu_hours = flops / (eff_tflops * 1e12) / 3600  # eff_tflops: GPU 한 장의 실효 처리량(가정, 실측으로 교체)
    return d, flops, gpu_hours

def kv_gib(kv_bytes_per_token, ctx, concurrent):
    return kv_bytes_per_token * ctx * concurrent / 2**30

d, f, h = pretrain_estimate(7e9)
print(f"필요 토큰 {d:.2e}, FLOPs {f:.2e}, GPU-시간 {h:,.0f} (실효 300 TFLOPs 가정)")
company_tokens = 5e8                               # 사내 문서 5억 토큰이라고 가정 (실측 필요)
print(f"사내 데이터 / 필요 데이터 = {company_tokens / d:.1%}")

KV_8B = 2 * 32 * 8 * 128 * 2                       # Llama 3 8B: 토큰당 131,072 바이트
weights_gib = 8.03e9 * 2 / 2**30                   # FP16 가중치
for ctx, conc in ((32768, 50), (6144, 50), (6144, 10)):
    kv = kv_gib(KV_8B, ctx, conc)
    print(f"컨텍스트 {ctx:>6}, 동시 {conc:>3}: KV {kv:6.1f} GiB, 가중치 포함 {kv + weights_gib:6.1f} GiB")`,
      codeLang: `python`,
      key: [
        `고객이 말한 수단("처음부터 학습")이 아니라 목표(정확한 사내 답, 데이터 통제, 비용)로 요구를 해체한다.`,
        `사전학습 가능성은 C=6ND와 파라미터당 약 20토큰으로 암산한다: 7B면 약 1,400억 토큰이 필요한데 사내 데이터는 수억 토큰 수준이라 데이터부터 막힌다.`,
        `사이징은 가중치 + KV(컨텍스트 × 동시성)이며, 등록 사용자 수와 동시 활성 요청 수를 구분해 실측한다.`,
        `환각·비결정성·추론 비용 같은 한계는 설계(근거 없으면 거절·출처 표기·모델 라우팅)와 계약(평가셋 통과율)으로 다룬다.`
      ],
      pitfalls: [
        `고객이 쓴 기술 용어("파인튜닝", "자체 모델")를 그대로 견적하는 것: 목표에 맞는 수단인지 먼저 따져야 한다.`,
        `사이징 계산을 가정 표기 없이 확정치로 약속하는 것: 실효 처리량·대역폭·동시성은 실측 전에는 가정이다.`,
        `벤치마크 하나(예: KMMLU)로 모델 선정을 끝내는 것: 고객 문서·한국어 평가셋이 필요하다.`,
        `진단 단계 없이 고정가로 전체 구축을 계약하는 것: 토큰 수·동시성·정확도 목표가 불확실한 채로 위험을 떠안게 된다.`
      ]
    }
  ],
  labs: [
    {
      title: `토큰 비용 실험실: BPE 직접 구현과 한국어·영어 토큰 효율 측정`,
      scenario: `국내 물류 SaaS 회사가 월 10만 건의 한국어 문의를 요약하는 기능을 추가하려 하고 LLM API 모델 교체도 검토 중입니다. 영업 담당은 영어 샘플 기준으로 계산해 "월 비용이 싸다"고 보고했습니다. 당신은 실제 한국어 문서로 여러 토크나이저의 토큰 수를 재고, BPE를 직접 구현해 원리를 확인하고, 단가만 바꿔 다시 돌릴 수 있는 월 비용 시뮬레이터와 1쪽 결과 요약을 만들어 영업 담당의 가정을 검증합니다.`,
      steps: [
        `자유롭게 이용할 수 있고 개인정보가 없는 한국어 문서 20개 이상(공공 보도자료, 법령, 위키 문서 등)과 같은 내용의 영어 문서(번역본 또는 원문)를 쌍으로 모아 파일로 저장합니다. 문서 유형(뉴스·법령·대화체)을 라벨로 붙입니다.`,
        `pip로 tiktoken과 transformers를 설치하고, tiktoken의 cl100k_base·o200k_base와 Hugging Face의 Qwen/Qwen3-0.6B 토크나이저(공개 가중치)로 각 문서의 토큰 수, 문자당 토큰, 바이트당 토큰을 CSV로 저장하는 스크립트를 만듭니다.`,
        `2강의 BPE 코드를 확장해 decode(병합을 역으로 풀어 바이트로 되돌린 뒤 UTF-8 디코드)를 추가하고, 한국어 코퍼스로 병합 수 0/100/500/1000을 학습해 병합 수별 토큰 수 곡선을 그립니다.`,
        `테스트 문자열 100개(한글, 영문, 숫자, 이모지, 공백·줄바꿈 포함)에 대해 decode(encode(x)) == x를 검사하는 테스트를 pytest로 작성합니다.`,
        `문서 유형별 한국어 토큰 수 ÷ 영어 토큰 수 비율을 토크나이저 3종에 대해 표로 만들고, "서버", " 서버", "서버" 뒤에 줄바꿈을 붙인 문자열과 "12345678"이 어떻게 쪼개지는지 출력해 비교합니다.`,
        `월 비용 시뮬레이터를 만듭니다. 문서 평균 토큰, 월 건수, 입력·출력 단가는 코드에 박지 않고 CSV로 받고, 단가 CSV에는 가격 조사일과 출처 URL 칸을 둡니다.`,
        `영업 담당의 영어 기준 견적과 한국어 실측 견적의 차이(%)를 계산하고, 가정과 권고를 1쪽으로 정리합니다.`
      ],
      accept: [
        `3개 토크나이저 × 한국어 문서 20개 이상의 측정 CSV가 재현 스크립트와 함께 저장소에 있고, 스크립트를 다시 돌리면 같은 값이 나온다.`,
        `자작 BPE가 테스트 문자열 100개 전부에서 decode(encode(x)) == x를 만족하고(통과율 100%), 병합 수가 늘 때 토큰 수가 증가하지 않음을 곡선으로 보인다.`,
        `시뮬레이터가 단가 CSV만 바꿔도 월 비용을 다시 계산하고, 결과표에 가격 조사일과 모델명이 표기된다.`,
        `1쪽 요약에 영어 기준 견적 대비 오차율(%), 문서 유형별 편차, 측정하지 못한 항목과 그 이유가 적혀 있다.`
      ],
      stretch: `API 키가 있다면 같은 문서 10건을 실제로 호출해 응답의 usage 토큰 수와 로컬 토크나이저 추정치의 차이를 측정하고, 모델 세대가 바뀔 때 토큰 수가 얼마나 변하는지(예: 신규 토크나이저가 약 30% 더 많은 토큰을 낸다는 벤더 안내, 2026-11 기준)를 검증해 보세요. 또는 한국어 위주 말뭉치로 어휘 크기 2만·6만짜리 BPE를 학습해 토큰 효율 차이를 비교합니다.`
    },
    {
      title: `미니 GPT를 처음부터: attention·RoPE 구현, KV cache 동등성, 스케일링 곡선`,
      scenario: `팀에 "LLM 내부를 직접 설명할 수 있는 사람"이 필요하다는 요청을 받았습니다. Karpathy의 Let's build GPT를 따라가되 attention을 직접 구현하고, 위치 표현을 RoPE로 바꾸고, KV cache를 붙여 생성 결과가 완전히 같은지와 속도 이득을 측정하며, 크기가 다른 모델 네 개로 작은 스케일링 곡선까지 그립니다. 무료 Colab GPU나 CPU로 충분히 할 수 있는 크기(수백만 파라미터 이하)로 진행하고, 모든 결과는 한 저장소에 노트북·스크립트·측정표로 남깁니다.`,
      steps: [
        `저작권 문제 없는 텍스트(공개 도메인 한국어·영어 문서, 위키 일부 등) 1~5MB를 모아 글자 단위로 토크나이즈하고 90/10으로 나눕니다.`,
        `3강의 causal_self_attention을 멀티헤드 nn.Module로 구현하고, pytest로 shape·행 합·인과성(마지막 토큰을 바꿔도 앞 위치 출력이 같음) 테스트를 작성합니다.`,
        `RMSNorm, SwiGLU MLP, pre-norm 블록을 쌓아(d=128~256, 층 4~6, block_size 512 이상) 학습하고, 절대 위치 임베딩 대신 5강의 RoPE를 q·k에 적용합니다. val loss 곡선을 저장합니다.`,
        `unigram과 bigram 기준선의 교차 엔트로피를 계산해 모델의 val loss와 한 표에 비교합니다.`,
        `생성 함수에 KV cache를 구현하고, greedy로 200토큰 이상 생성한 결과가 캐시 사용 여부와 상관없이 같은지 비교한 뒤 컨텍스트 길이 64/256/512에서 tokens/s를 측정합니다.`,
        `4강의 방식으로 파라미터 수를 손으로 계산하고 sum(p.numel())과 비교합니다(입출력 임베딩 공유 여부 명시).`,
        `같은 데이터·같은 스텝 수로 d=32/64/128/256 네 크기를 학습해 val loss와 파라미터 수를 로그-로그 그래프로 그립니다.`
      ],
      accept: [
        `shape·행 합·인과성 테스트가 모두 통과하고 RoPE의 상대 위치 성질 테스트(5강 코드와 같은 방식)가 통과한다.`,
        `최종 val loss가 unigram 기준선보다 낮고, bigram과의 차이와 학습 곡선이 보고서에 기록되어 있다.`,
        `KV cache 사용·미사용의 greedy 생성 토큰열이 200토큰 이상에서 100% 같고, 컨텍스트 512에서 캐시 사용 쪽의 tokens/s가 더 높다는 측정표가 있다.`,
        `손으로 계산한 파라미터 수와 numel 합이 정확히 일치하며, 어긋나면 원인을 설명한다.`
      ],
      stretch: `네 모델의 손실-파라미터 곡선에 L = a·N^(-b) + c 를 피팅해 지수 b를 구하고 Kaplan 외의 α_N≈0.076과 비교해 보세요. 작은 규모, 글자 단위 토크나이저, 짧은 학습이라 값이 다른 이유를 세 줄로 설명하고(Kaplan 외가 손실의 절대 크기 상수는 토크나이저에 따라 달라진다고 밝힌 점 포함), 데이터를 반으로 줄였을 때 곡선이 어떻게 바뀌는지도 확인합니다.`
    },
    {
      title: `납품 미니 프로젝트: 온프렘 LLM 사이징·모델 선정 보고서`,
      scenario: `10강의 제조업 고객이 "사내 서버에 한국어 문서 질의응답 LLM을 올리고 싶다"며 진단 단계를 맡겼습니다. 당신의 납품물은 (1) 설정 파일에서 파라미터·메모리·KV cache·처리량 상한을 계산하는 사이징 계산기, (2) 후보 모델 3종의 기술 보고서·모델 카드를 읽어 만든 비교표, (3) 소형 모델로 한 부하 테스트 실측과 예측의 비교, (4) 가정과 한계를 명시한 8쪽 이내의 권고 메모입니다. 모든 숫자는 출처와 열람일 또는 "가정" 표시가 있어야 하며 고객이 다른 개발자에게 인계해도 재현 가능해야 합니다.`,
      steps: [
        `후보 오픈 모델 3종을 고르고, 각 모델의 config.json과 기술 보고서·모델 카드를 읽어 층 수·d·ffn·헤드·KV 헤드·어휘·컨텍스트·라이선스 조건·출시일을 출처 URL·열람일과 함께 표로 만듭니다.`,
        `calc.py를 만듭니다. config.json을 읽어 파라미터 수(임베딩 포함·제외), FP16·INT8·INT4 가중치 메모리, 토큰당 KV 바이트, 컨텍스트 × 동시성별 KV GiB, 7강 공식의 decode tokens/s 상한(대역폭은 입력 인자)을 출력합니다.`,
        `검증: Llama 3 8B·70B·405B 값을 넣어 약 8.03B·70.55B·405.85B(8B config.json의 vocab_size 128,256 사용)가 1% 이내로 재현되는지, KV가 토큰당 131,072바이트(8B)인지 확인하는 단위 테스트를 3개 이상 작성합니다.`,
        `시나리오 표를 만듭니다: 컨텍스트 6K/32K × 동시 활성 10/50 × FP16/INT4에서 필요한 VRAM과 GPU 구성 후보를 정리하고, GPU 사양은 제조사 사양서 URL과 열람일을 적어 가정으로 둡니다.`,
        `로컬에서 1~3B급 소형 모델을 llama.cpp, Ollama, vLLM 중 가능한 것으로 서빙해 동시성 1/4/8에서 TTFT, tokens/s, p95 지연을 측정하고 계산기 예측과 비교합니다.`,
        `사내 문서 대체용 공개 문서 하나로 한국어 질의 30문항 평가셋(정답 포함, 5문항은 문서에 답이 없는 문항)을 만들어 후보 모델의 정답·거절·환각을 판정합니다.`,
        `권고 메모를 씁니다: 결론, 가정 표, 미확정 항목, 상용 API·오픈웨이트 온프렘·하이브리드 세 대안의 비용·위험 비교, 보장하지 않는 것(동일 출력, 환각 0%, 성능 수치), 다음 단계 제안과 재견적 조건을 포함합니다.`
      ],
      accept: [
        `calc.py가 Llama 3 8B 계산에서 약 8.03B에 1% 이내, KV 131,072바이트/토큰을 재현하고 단위 테스트가 3개 이상 통과한다.`,
        `메모의 모든 수치에 출처(URL·열람일)나 "가정" 표시가 있고, 가정 목록이 별도 표로 정리되어 있다.`,
        `동시성 3단계에서 측정값과 예측값을 비교한 표와 오차 원인 분석(3줄 이상)이 있다.`,
        `"문서에 답 없음" 문항에서 모델별 거절률을 보고하고, 환각 사례 2개 이상을 원문과 함께 인용한다.`,
        `메모에 "보장하지 않는 것" 항목이 있고 재견적 조건이 명시되어 있다.`
      ],
      stretch: `부록으로 사전학습 견적(6ND, 필요 토큰 대비 사내 토큰 비율, GPU-시간)과 Sardana 외 방식의 추론 수요 민감도 표(추론 토큰 1e11/1e12/1e13)를 추가해 "왜 처음부터 학습하지 않는가"를 한 장으로 설명해 보세요. GPU가 있다면 vLLM의 최대 동시 요청 한계를 실측해 계산기의 KV 예측과 대조하고, 차이가 나는 원인(런타임 오버헤드, 블록 단위 할당 등)을 정리합니다.`
    }
  ],
  quiz: [
    {
      q: `한국어 고객지원 요약 기능을 견적 중입니다. 영업팀이 "영어 샘플 100건의 토큰 수 평균에 월 건수를 곱하면 된다"며 영어 기준으로 월 API 비용을 산정했습니다. 가장 적절한 대응은?`,
      choices: [
        `영어 샘플의 평균 토큰 수를 그대로 쓰고, 같은 뜻이 한국어에서는 글자 수가 더 짧으니 실제 청구액은 오히려 낮을 것이라고 보고서에 적는다`,
        `고객의 실제 한국어 문서 20~50건을 대상 모델의 토크나이저(또는 응답 usage)로 재서 견적하고, 모델 ID와 가격표 열람일을 가정으로 적는다`,
        `토큰 수는 모델이 달라도 거의 같으므로 영어로 한 번만 재고, 단가가 가장 낮은 모델 기준으로 후보 전체의 월 비용을 똑같이 산정한다`,
        `한국어 글자 수를 영어 단어 수로 환산한 뒤 영어의 평균 토큰/단어 비율을 곱하는 환산식을 만들어 모든 모델과 문서 유형에 공통으로 적용한다`
      ],
      answer: 1,
      why: `토큰은 모델의 토크나이저가 정하므로 같은 뜻의 문서도 언어와 모델에 따라 개수가 다릅니다. 한글은 UTF-8에서 3바이트라 병합이 부족하면 더 쪼개지고, Anthropic 가격 문서는 Claude 4.7 이후 모델의 새 토크나이저가 같은 텍스트에서 약 30% 더 많은 토큰을 낸다고 안내합니다(2026-11 열람). 가장 그럴듯해 보이는 "글자 수가 적으니 싸다"는 과금 단위가 글자가 아니라 토큰이라는 점을 놓친 것이고, 환산식과 단일 측정은 모델·문서 유형별 차이를 잡지 못합니다.`
    },
    {
      q: `인과(causal) self-attention을 구현했다는 아래 코드의 가장 큰 결함은?

scores = q @ k.transpose(-2, -1) / math.sqrt(head_dim)
att = torch.softmax(scores, dim=-1)
att = att * torch.tril(torch.ones(T, T))   # 하삼각 마스크
out = att @ v`,
      choices: [
        `스케일 인자가 head_dim이 아니라 d_model이어야 하며, 그래야 점수가 softmax에서 포화되지 않고 기울기가 유지된다`,
        `k를 전치하면 점수 행렬의 모양이 틀어지므로 전치하지 말고 q와 k를 원소별로 곱한 뒤 마지막 차원을 합쳐야 한다`,
        `점수의 마지막 차원은 쿼리 방향이라 dim=-1로 정규화하면 안 되고, 키 방향으로 정규화되도록 dim=0을 써야 한다`,
        `마스크를 softmax 뒤에 곱했다. 분모에 미래 점수가 섞여 정보가 새고 행의 합이 1이 아니므로 softmax 전에 -inf로 막아야 한다`
      ],
      answer: 3,
      why: `마스크를 softmax 뒤에 곱하면 미래 위치의 가중치만 0이 될 뿐, 남은 가중치는 미래 점수가 포함된 분모로 정규화되어 있어 미래 정보가 새고 합도 1보다 작아집니다. 올바른 방법은 softmax 전에 -inf로 채우는 것입니다. 스케일은 head_dim 기준이 맞고(d_model로 나누는 것은 오답), 점수 행렬 (T, T)의 마지막 차원이 키 방향이라 dim=-1이 맞으며, 전치도 코드가 맞습니다.`
    },
    {
      q: `온프렘 서버에 Llama 3 8B급 모델(FP16, 가중치 약 16GB, KV 헤드 8, 토큰당 KV cache 128KiB)을 올리려 합니다. 담당자가 "가중치가 16GB니 24GB GPU면 충분하다"고 했는데, 요구사항은 동시 활성 요청 40개, 요청당 컨텍스트 16K 토큰입니다. 가장 적절한 판단은?`,
      choices: [
        `KV cache만 약 80GiB(128KiB × 16,384 × 40)라 가중치와 합쳐 다시 산정하고, 동시성·컨텍스트 상한·KV 양자화·GPU 구성을 조정한 뒤 실측한다`,
        `KV cache가 모자라면 서버가 알아서 CPU 메모리로 옮기므로 24GB로 충분하고, 요청이 몰릴 때 조금 느려지는 정도의 문제로 본다`,
        `가중치를 INT4로 양자화하면 4GB 안팎이 되고 KV cache도 같은 비율로 줄어들기 때문에 24GB GPU 한 장이면 40개 동시 요청도 문제가 없다`,
        `요청 40개는 하나의 배치로 묶여 처리되고 K·V도 배치가 공유하므로, 메모리 사용량은 요청 한 개일 때(약 2GiB)와 같다고 본다`
      ],
      answer: 0,
      why: `128KiB × 16,384 = 2GiB가 요청 하나의 KV이고 40개면 80GiB입니다. 배치가 공유하는 것은 가중치뿐이고 K·V는 요청마다 따로 쌓입니다. 가중치 양자화가 KV의 형식을 자동으로 바꾸지는 않고(KV는 별도 설정), CPU로 내리면 지연이 크게 늘어 서비스 요건을 깹니다. 담당자의 "가중치만 맞으면 된다"가 가장 흔한 사이징 실수입니다.`
    },
    {
      q: `모델 설정 파일에 아래 값이 있습니다. FP16일 때 토큰 하나당 KV cache는 몇 바이트입니까? (head_dim = hidden_size / num_attention_heads)

"hidden_size": 4096,
"num_hidden_layers": 32,
"num_attention_heads": 32,
"num_key_value_heads": 8,
"torch_dtype": "float16"`,
      choices: [
        `524,288`,
        `65,536`,
        `131,072`,
        `262,144`
      ],
      answer: 2,
      why: `head_dim = 128이므로 2(K와 V) × 32층 × 8 KV 헤드 × 128 × 2바이트 = 131,072바이트입니다. 524,288은 KV 헤드를 32개(MHA)로 잘못 본 값, 65,536은 K와 V의 2배를 빠뜨린 값, 262,144는 FP32(4바이트)로 계산한 값입니다. 가장 흔한 실수는 num_attention_heads를 쓰고 num_key_value_heads를 무시하는 것입니다.`
    },
    {
      q: `고객이 "temperature를 0으로 설정했으니 회귀 테스트는 출력 문자열 완전일치로 하자"고 요구합니다. 모델은 클라우드 API이고 요청량에 따라 서버 부하가 변합니다. 가장 적절한 제안은?`,
      choices: [
        `temperature 0이면 출력이 완전히 결정적이므로 문자열 완전일치가 가장 엄격하고 안전한 회귀 테스트가 된다`,
        `요청에 시드를 고정해 전달하면 API에서도 동일 출력이 보장되므로 시드 파라미터를 쓰고 완전일치로 비교한다`,
        `채점 가능한 기준(스키마 일치, 정답 포함 여부, 루브릭)과 반복 실행 통과율로 테스트하고, 계약서에도 이 기준을 적는다`,
        `완전일치 테스트는 불안정하니 자동 테스트를 포기하고 릴리스 때 사람이 샘플을 눈으로 확인하는 절차로 대체한다`
      ],
      answer: 2,
      why: `Thinking Machines(2025-09-10)는 temperature 0에서도 같은 프롬프트로 1,000번 요청해 80가지 결과가 나왔고, 원인이 서버 부하에 따른 배치 크기 변화와 커널의 배치 불변성 부재라고 보고했습니다. 그러니 완전일치는 불필요하게 깨집니다. 시드 보장은 벤더·구현에 달려 있어 기대할 수 없고, 테스트 포기는 회귀 방어를 없앱니다. 채점 가능한 기준과 통과율이 해법입니다.`
    },
    {
      q: `자체 호스팅 중인 LLM 서버의 로그와 사용자 불만입니다. "답변이 오래 걸린다"는 신고가 급증했습니다.

Avg generation throughput: 188.2 tokens/s, Running: 12 reqs, Waiting: 41 reqs, GPU KV cache usage: 98.7%
p95 TTFT: 14.2 s (목표 2 s)

가장 가능성 높은 병목과 1차 조치는?`,
      choices: [
        `KV cache가 가득 차 대기열이 쌓이고 있다. 최대 컨텍스트·동시성 한도를 조정하고 KV 용량(VRAM, KV 양자화, prefix caching, GQA 모델)을 늘린다`,
        `GPU 연산량(FLOPs)이 부족한 상황이다. 디코드는 연산 병목이므로 GPU 클럭을 올리거나 FLOPs가 더 높은 GPU로 교체한다`,
        `네트워크 대역폭이 포화되어 응답 스트림이 밀리고 있다. 로드밸런서와 서버의 네트워크 대역폭을 늘리면 TTFT가 내려간다`,
        `어휘 크기가 작아 같은 답에도 토큰이 너무 많이 나온다. 더 큰 어휘의 토크나이저로 교체하면 지연이 해소된다`
      ],
      answer: 0,
      why: `KV cache 사용률 98.7%에 실행 12개·대기 41개라는 신호는 KV 메모리가 포화되어 새 요청이 들어가지 못하는 전형적인 모습입니다. 연산이 병목이라면 대기열보다 처리량 포화가 먼저 보이고, 네트워크·토크나이저는 이 로그가 가리키는 지점이 아닙니다. 연산 문제로 읽는 것이 가장 유혹적인 오답이지만 디코드는 메모리가 병목입니다.`
    },
    {
      q: `제조업 고객이 "사내 문서 3억 토큰으로 7B 모델을 처음부터 학습해 달라"고 합니다. 가장 적절한 대응은?`,
      choices: [
        `3억 토큰을 수백 번 반복(에폭)해 학습하면 Chinchilla가 요구하는 약 1,400억 토큰 분량을 채울 수 있다고 설명하고 7B로 진행한다`,
        `데이터가 모자랄 때는 큰 모델이 표본 효율이 더 좋다는 Kaplan 외의 결과를 근거로, 모델을 70B로 키워 같은 3억 토큰으로 학습하자고 제안한다`,
        `파라미터를 100M 안팎으로 줄여 처음부터 학습하면 사내 문서 질의응답에서 상용 모델급 품질이 나온다고 안내하고 진행한다`,
        `필요 데이터(약 1,400억 토큰)가 사내 데이터의 수백 배임을 숫자로 보이고, 오픈웨이트 모델 + RAG를 기본으로 하되 필요하면 가벼운 후학습을 얹자고 제안한다`
      ],
      answer: 3,
      why: `파라미터당 약 20토큰이면 7B에 약 1,400억 토큰이 필요해 3억 토큰의 약 470배입니다. 같은 데이터를 수백 번 반복하면 과적합·암기가 심해지고(Lee 외, 중복의 해로움), Kaplan 외의 과적합 식도 모델이 클수록 필요한 데이터가 늘어난다고 말하므로(모델 8배에 데이터 약 5배) 데이터 부족에서 모델을 키우는 것은 역효과입니다. 작은 모델을 처음부터 학습해도 수조 토큰으로 학습한 오픈 모델의 품질에 못 미칩니다.`
    },
    {
      q: `KV cache를 붙인 생성 코드의 일부입니다. 캐시 없는 생성과 비교하니 두 번째 생성 토큰부터 출력이 달라집니다.

for t in range(n_new):
    q, k, v = project(x_last)                      # x_last: (1, d)
    q, k = apply_rope(q, pos=0), apply_rope(k, pos=0)
    cacheK = torch.cat([cacheK, k]); cacheV = torch.cat([cacheV, v])
    out = attend(q, cacheK, cacheV)

가장 가능성 높은 원인은?`,
      choices: [
        `KV cache는 원리상 과거 K·V를 근사해서 재사용하는 기법이라, 생성 길이가 늘수록 오차가 쌓여 출력이 달라지는 것이 정상이다`,
        `새 토큰의 q·k를 항상 위치 0으로 회전시켜서 캐시된 K들과의 상대 거리가 틀어진다. 위치는 추가 전 캐시 길이(현재 토큰의 실제 인덱스)로 줘야 한다`,
        `RoPE는 q·k뿐 아니라 V에도 같은 회전을 적용해야 하는데 V 회전이 빠져서 캐시된 값과 새 값의 좌표계가 어긋난다`,
        `캐시에는 K·V만이 아니라 이전 쿼리 q도 함께 저장해 두어야 다음 토큰의 attention을 정확히 계산할 수 있다`
      ],
      answer: 1,
      why: `RoPE는 위치에 비례한 회전이라 새 토큰의 q·k에도 실제 위치 번호를 줘야 캐시된 K들과의 상대 거리가 맞습니다. pos=0 고정은 첫 토큰(상대 거리 0)만 우연히 맞고 두 번째 토큰부터 모든 거리를 틀리게 만듭니다. KV cache는 근사가 아니라 정확한 재사용이고(6강 코드처럼 allclose로 확인), RoPE는 V에 적용하지 않는 것이 맞으며, 과거 쿼리는 다시 쓰이지 않아 저장하지 않습니다. V에 적용해야 한다는 선택지가 가장 그럴듯한 오답입니다.`
    },
    {
      q: `사내 문서 RAG 챗봇이 검색된 문서 12개(각 약 1,500토큰)를 프롬프트에 넣습니다. 로그를 보니 정답 근거가 7번째 문서일 때 오답률이 눈에 띄게 높습니다. 가장 적절한 접근은?`,
      choices: [
        `컨텍스트 창이 18,000토큰을 충분히 담을 만큼 크므로 모델 문제가 아니며, 재현율을 높이려면 검색 문서를 더 많이 넣으면 된다`,
        `temperature를 올려 답변의 다양성을 키우면 중간에 놓인 문서에 대한 오답이 줄어드는 효과가 있으므로 temperature를 높인다`,
        `Lost in the Middle 유형의 위치 편향을 의심해 정답 위치별 정확도를 재고, 리랭킹으로 문서 수를 줄이며 핵심 근거를 앞이나 뒤에 둔다`,
        `모델 파라미터를 더 크게 사전학습시키면 위치 편향이 사라지므로 더 큰 모델을 처음부터 학습하는 방안을 고객에게 제안한다`
      ],
      answer: 2,
      why: `Liu 외(2023)는 정답 정보가 입력 중간에 있을 때 정확도가 떨어진다고 보고했습니다. 다만 모델마다 다르니 위치별 정확도를 직접 재서 확인하고, 문서 수를 줄이고 배치를 조정하는 것이 비용과 품질에 모두 이롭습니다. 창이 크다는 것은 "넣을 수 있다"일 뿐 "똑같이 잘 쓴다"가 아니며, temperature 조정은 위치 문제와 무관하고, 모델을 새로 키우는 것은 외주 범위 밖입니다.`
    },
    {
      q: `한 팀이 제안서에 "Chinchilla 논문에 따라 모든 LLM은 파라미터당 20토큰으로 학습해야 최적이므로, 우리가 쓸 모델의 학습 규모도 그렇게 잡았다"고 썼습니다. 이 서술의 문제는?`,
      choices: [
        `20토큰 규칙은 학습 계산량만 최소화하는 기준이라, 추론 수요가 크면 더 작은 모델을 훨씬 많은 토큰으로 학습하는 편이 총비용에 유리할 수 있다`,
        `Chinchilla 논문은 Kaplan의 결론대로 모델 크기를 최우선으로 키우라고 했으므로, 토큰 수 규칙이 아니라 파라미터 수 규칙으로 서술해야 한다`,
        `20토큰 규칙은 인코더 전용 모델(BERT류)에만 적용되고, 디코더 전용 LLM은 파라미터당 토큰을 더 적게 써도 같은 손실에 도달한다`,
        `학습 토큰 수는 사전학습 모델의 품질과 무관하다는 것이 Chinchilla의 결론이므로, 어떤 값을 써도 결과가 같다고 써야 한다`
      ],
      answer: 0,
      why: `Chinchilla는 고정된 학습 컴퓨트에서 손실을 최소화하는 크기·토큰 배분을 구한 것입니다. Sardana 외(2023)는 추론 비용을 넣으면 수요가 클수록 더 작은 모델을 더 오래 학습하는 쪽이 유리하다고 보였고, 그래서 오픈 모델들이 20을 크게 넘겨 학습됩니다. Chinchilla는 오히려 Kaplan의 "크기 우선"을 수정한 논문이므로 두 번째 선택지는 사실과 반대입니다.`
    },
    {
      q: `고객이 "Mixtral은 활성 파라미터가 약 13B니까 13B 모델과 같은 VRAM이면 서빙되죠?"라고 묻습니다. 가장 정확한 답은?`,
      choices: [
        `맞습니다. 토큰마다 라우팅되는 전문가만 메모리에 올리면 되므로, 활성 파라미터 13B에 해당하는 VRAM이면 서빙할 수 있습니다`,
        `아닙니다. MoE는 총 파라미터만큼 연산도 늘어 토큰당 지연이 활성 13B의 dense 모델보다 항상 훨씬 느려집니다`,
        `아닙니다. 쓰이지 않는 전문가는 호스트 메모리나 디스크에 두고 필요할 때 읽어 오면 되므로 VRAM 요구는 거의 없습니다`,
        `아닙니다. 토큰마다 고르는 전문가를 미리 알 수 없어 전부 상주해야 하므로 VRAM은 총 파라미터(FP16 약 94GB) 기준이고, 연산은 활성 파라미터에 가깝습니다`
      ],
      answer: 3,
      why: `Mixtral은 총 약 47B, 활성 약 13B입니다. 라우팅은 토큰마다 달라서 모든 전문가가 상주해야 하므로 FP16 기준 약 94GB가 필요하고, 토큰당 연산·지연은 활성 파라미터를 따릅니다. 첫 선택지는 활성과 상주를 혼동한 가장 흔한 오해이고, 둘째는 연산량을 총 파라미터로 착각한 것이며, 호스트 메모리·디스크 오프로딩은 가능하지만 토큰마다 전송이 끼어 지연이 크게 늘어 실시간 서비스에는 맞지 않습니다.`
    },
    {
      q: `top-p 샘플링을 직접 구현한 코드입니다. 일부 입력에서 NaN이나 multinomial 오류가 납니다. 원인은?

probs = torch.softmax(logits / temperature, dim=-1)
sp, idx = probs.sort(descending=True)
keep = sp.cumsum(dim=-1) <= top_p
sp = sp * keep
sp = sp / sp.sum()
token = idx[torch.multinomial(sp, 1)]`,
      choices: [
        `softmax 전에 logits를 temperature로 나누는 순서가 잘못되어, 정렬과 cumsum을 끝낸 뒤에 나눠야 top-p가 제대로 동작한다`,
        `최상위 토큰 확률이 top_p보다 크면 keep이 전부 False가 되어 합이 0이 되고 0으로 나눈다. 누적확률이 p를 처음 넘는 토큰까지 포함해야 한다`,
        `cumsum은 내림차순으로 정렬된 확률에는 쓸 수 없고, 오름차순으로 정렬했을 때만 올바른 누적 분포를 만들 수 있다`,
        `top-p는 확률이 아니라 softmax 이전의 logits 값에 직접 적용하는 방식이므로, logits를 정렬해 누적합으로 잘라야 한다`
      ],
      answer: 1,
      why: `예를 들어 top_p=0.9인데 최상위 토큰 확률이 0.95면 누적합 0.95 <= 0.9가 거짓이라 keep이 모두 False가 되고 sp.sum()이 0이 되어 NaN이 납니다. 누적확률이 p를 처음 넘는 토큰까지 포함하는 정의가 맞습니다. temperature는 softmax 전에 logits를 나누는 것이 맞고, cumsum은 내림차순 정렬과 함께 쓰는 것이 정상이며, top-p는 확률 분포에 적용합니다.`
    }
  ],
  refs: [
    {
      title: `Attention Is All You Need (Vaswani 외, 2017)`,
      url: `https://arxiv.org/abs/1706.03762`,
      kind: `paper`,
      why: `3강의 본문입니다. scaled dot-product attention, 멀티헤드, 위치 인코딩, 층당 복잡도 비교표를 직접 읽고 base 모델의 숫자(6층, d_model 512, 헤드 8)를 확인합니다.`
    },
    {
      title: `Scaling Laws for Neural Language Models (Kaplan 외, 2020)`,
      url: `https://arxiv.org/abs/2001.08361`,
      kind: `paper`,
      why: `거듭제곱 법칙, N의 정의(비임베딩), C≈6NBS, 컴퓨트 최적 배분(N∝C^0.73)을 확인합니다. 9강의 첫 번째 정독 논문입니다.`
    },
    {
      title: `Training Compute-Optimal Large Language Models (Hoffmann 외, 2022, Chinchilla)`,
      url: `https://arxiv.org/abs/2203.15556`,
      kind: `paper`,
      why: `세 가지 접근의 지수(약 0.5 대 0.5), 파라미터화 손실식, Gopher와의 비교를 읽고 Kaplan 외의 결론과 어디가 다른지 정리합니다. 세 번째 접근의 적합값은 Besiroglu 외(2024, arXiv 2404.10102)의 재현 시도에서 문제가 지적됐으니 함께 확인하세요.`
    },
    {
      title: `Beyond Chinchilla-Optimal: Accounting for Inference in Language Model Scaling Laws (Sardana 외, ICML 2024)`,
      url: `https://arxiv.org/abs/2401.00448`,
      kind: `paper`,
      why: `추론 수요를 넣은 스케일링 판단과 논문 스스로 밝히는 한계(추론 활용률 차이, 1만 토큰/파라미터 너머의 외삽, 47개 모델이라는 적합 규모)를 함께 읽습니다. 열람 시점(2026-11)의 최신 개정판은 2025-04의 v3입니다.`
    },
    {
      title: `The Llama 3 Herd of Models (2024)`,
      url: `https://arxiv.org/abs/2407.21783`,
      kind: `paper`,
      why: `기술 보고서 읽기 연습용입니다. 아키텍처 표(층·d·KV 헤드·어휘·RoPE base), 스케일링 법칙으로 405B를 정한 과정, 128K 컨텍스트 확장 절차를 따라 계산합니다.`
    },
    {
      title: `RoFormer: Enhanced Transformer with Rotary Position Embedding (Su 외, 2021)`,
      url: `https://arxiv.org/abs/2104.09864`,
      kind: `paper`,
      why: `RoPE의 원전입니다. 회전으로 상대 위치 의존성이 나오는 과정을 5강 코드의 테스트와 대조해 읽습니다.`
    },
    {
      title: `GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints (Ainslie 외, 2023)`,
      url: `https://arxiv.org/abs/2305.13245`,
      kind: `paper`,
      why: `KV 헤드를 줄여 KV cache를 줄이는 방법과 기존 체크포인트를 약 5% 계산량으로 변환하는 절차를 확인합니다(EMNLP 2023).`
    },
    {
      title: `FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness (Dao 외, 2022)`,
      url: `https://arxiv.org/abs/2205.14135`,
      kind: `paper`,
      why: `"병목은 FLOPs가 아니라 메모리 이동"이라는 관점과 타일링의 원리를 읽습니다. v2·v3는 같은 저자의 후속 논문이며 서빙 엔진이 알아서 사용합니다.`
    },
    {
      title: `Efficient Memory Management for Large Language Model Serving with PagedAttention (Kwon 외, 2023, SOSP)`,
      url: `https://arxiv.org/abs/2309.06180`,
      kind: `paper`,
      why: `KV cache 낭비 측정(토큰 상태 점유율 20.4~38.2%), 블록 테이블과 copy-on-write, 2~4배 처리량 보고를 직접 확인합니다.`
    },
    {
      title: `Lost in the Middle: How Language Models Use Long Contexts (Liu 외, 2023, TACL 2024)`,
      url: `https://arxiv.org/abs/2307.03172`,
      kind: `paper`,
      why: `긴 컨텍스트의 위치 편향을 보고한 논문입니다. 2023년 모델의 결과이므로 현재 모델로 재현 실험을 해 봅니다.`
    },
    {
      title: `Defeating Nondeterminism in LLM Inference (Thinking Machines, 2025-09-10)`,
      url: `https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/`,
      kind: `article`,
      why: `temperature 0에서도 출력이 달라지는 원인(배치 불변성 부재)과 해결의 속도 비용(Qwen3-8B 1,000건 기준 26초가 55초, 개선 후 42초)을 설명한 블로그 글입니다. 재현성 계약 문구의 근거로 씁니다.`
    },
    {
      title: `Neural Networks: Zero to Hero (Karpathy)`,
      url: `https://karpathy.ai/zero-to-hero.html`,
      kind: `course`,
      why: `GPT를 처음부터 구현하는 강의(약 1시간 56분)와 GPT 토크나이저 강의(약 2시간 13분)를 따라 치며 실습 2의 뼈대를 만듭니다.`
    },
    {
      title: `Stanford CS336: Language Modeling from Scratch`,
      url: `https://cs336.stanford.edu/`,
      kind: `course`,
      why: `토크나이저, 아키텍처, 스케일링 법칙, 추론, 데이터 파이프라인을 직접 구현하는 과정으로 이 모듈의 심화 경로입니다. 2026-11 열람 시점에 페이지는 Spring 2026 학기를 보여 주고 2025·2024 학기 자료로 가는 링크도 있으니, 과제 1(토크나이저·Transformer 구현)과 과제 3(스케일링 법칙 적합)부터 따라 해 보세요.`
    },
    {
      title: `Neural Machine Translation of Rare Words with Subword Units (Sennrich 외, ACL 2016)`,
      url: `https://arxiv.org/abs/1508.07909`,
      kind: `paper`,
      why: `BPE를 NLP에 도입한 원전입니다. 2강의 병합 알고리즘이 어디서 왔는지, 희귀 단어를 서브워드로 다루는 동기를 읽습니다.`
    }
  ],
  gigs: [
    `"우리 전용 LLM을 처음부터 학습해 달라"는 요청을 받으면 수단이 아니라 목표(정확한 사내 답, 데이터 반출 통제, 비용)부터 묻습니다. 그다음 6ND와 파라미터당 약 20토큰 규칙으로 필요한 토큰·GPU-시간과 고객이 가진 데이터 규모를 비교하는 한 장짜리 근거를 만들어 보여 주면 대부분 오픈웨이트 + RAG로 합의됩니다. 고객이 수단에 집착하면 이 분석을 별도 유료 진단 단계로 분리하세요.`,
    `한국어 서비스의 토큰 비용은 견적 전에 고객의 실제 문서 20~50건으로 대상 모델 토크나이저(또는 API usage)를 재서 산정합니다. 모델이 바뀌면 같은 문서의 토큰 수도 달라지므로(예: Anthropic 가격 문서는 신규 토크나이저가 약 30% 더 많은 토큰을 낸다고 안내, 2026-11 기준) 견적서에 모델 ID·가격표 열람일·측정 문서 수를 적고, 모델 교체 시 재견적한다는 조항을 둡니다.`,
    `온프렘 GPU 사이징 견적 전에 확인할 것: 동시 활성 요청 수(등록 사용자 수가 아님), 입력·출력 토큰의 평균과 최대, TTFT·p95 목표, 데이터 반출 제약, 허용 가능한 양자화 수준입니다. 산출물은 가중치 + KV + 오버헤드·헤드룸 계산식과 부하 테스트 실측표이고, 실측 전에는 SLA를 보증하지 않는다고 명시합니다. GPU 임차비는 정액에 묻지 말고 실비로 분리하세요.`,
    `"가장 성능 좋은 모델로 해 주세요"라는 요청에는 공개 리더보드를 근거로 삼지 말고 고객 데이터로 30~100문항 평가셋을 만들어 비교하자고 제안합니다(정답 라벨을 고객이 줄 수 있는지 확인하고 구축 작업은 별도 견적). 라이선스의 상업 이용·재배포 조건과 출시일, KMMLU 같은 한국어 벤치마크의 연식·범위 한계도 비교표에 넣습니다.`,
    `"문서를 전부 넣으면 되지 않나요?"라는 기대는 비용(입력 선형, attention n²), 위치 편향(Lost in the Middle)·context rot, KV 메모리로 반박할 수 있습니다. 다만 지식 베이스가 약 20만 토큰 미만이면 전체 투입 + 캐싱이 RAG보다 단순할 수 있다는 벤더 조언(Anthropic, 2024-09, 자체 실험)도 있으니, 고객 데이터로 두 방식을 비교하는 표를 제안서에 넣으세요.`,
    `계약서 문구에서 "temperature 0이어도 출력 동일성은 보장되지 않는다", "환각률 0%는 보장하지 않는다"를 명시하고, 대신 평가셋 통과율, 근거가 없을 때의 거절 비율, 출처 표기 같은 측정 가능한 수용 기준을 합의합니다. 보장하지 않는 항목을 적어 두는 것이 분쟁을 줄입니다.`,
    `내부 원리를 다루는 일은 컨설팅·진단형 상품으로 팔기 쉽습니다. 진단·사이징 보고서(수일) → PoC(1~3주) → 구축의 단계별 계약으로 나누고, 측정 결과에 따라 재견적하는 조항을 둡니다. 금액은 시장과 고객 규모에 따라 크게 다르므로 투입 일수 × 일 단가로 계산해 근거를 보여 주는 편이 설득력이 있습니다.`
  ]
};
