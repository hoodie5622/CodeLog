(window.PRO_MODULES = window.PRO_MODULES || {})["ai-dl"] = {
  id: "ai-dl",
  summary: `텐서·autograd와 역전파 직접 구현에서 출발해 초기화·옵티마이저·정규화·학습곡선 진단, 전이학습, 체크포인트·mixed precision·GPU 메모리 산정까지 갖춘 PyTorch 학습 파이프라인을 재현 가능하게 만들고 납품할 수 있다.`,
  hours: 95,
  goals: [
    `텐서의 shape·dtype·device·브로드캐스팅과 autograd 그래프(requires_grad, grad 누적, no_grad, in-place)를 설명하고, 흔한 shape·그래프 오류를 증상만 보고 디버깅할 수 있다.`,
    `스칼라 autograd를 직접 구현해 연쇄 법칙과 기울기 누적(+=)을 설명하고, 중앙차분 수치 미분으로 직접 만든 연산의 기울기를 검사할 수 있다.`,
    `MLP의 활성화·초기화가 순전파 신호와 기울기 크기에 미치는 영향을 층별 통계로 측정하고, 초기 loss가 ln(클래스 수)와 맞는지 점검해 설정 오류를 잡아낼 수 있다.`,
    `SGD+momentum·Adam·AdamW와 학습률 스케줄(warmup·cosine)·기울기 클리핑·배치 크기·gradient accumulation의 관계를 설명하고, 발산하거나 정체된 학습을 우선순위를 두고 점검할 수 있다.`,
    `BatchNorm·LayerNorm·dropout·weight decay·잔차 연결이 학습 때와 추론 때 다르게 동작하는 방식을 설명하고, train/eval 모드 실수를 찾아 고칠 수 있다.`,
    `학습 곡선으로 과적합·과소적합·파이프라인 버그를 구분하고, seed·결정적 연산·실험 기록으로 실험을 통계적으로 재현 가능하게 만들 수 있다.`,
    `CNN의 출력 크기와 파라미터 수를 계산하고, 사전학습 모델의 동결·차등 학습률 미세조정과 DataLoader·증강(훈련/검증 분리)을 올바르게 구성할 수 있다.`,
    `체크포인트 재개·mixed precision·GPU 메모리 산정(가중치·기울기·옵티마이저·활성값)으로 OOM을 진단하고, 소규모 이미지 분류 외주를 baseline 비교·실험 기록·모델 카드까지 납품할 수 있다.`
  ],
  lessons: [
    {
      title: `딥러닝의 멘탈 모델: 텐서·shape·autograd 계산 그래프`,
      body: `딥러닝은 한 문장으로 "미분 가능한 함수를 층층이 이어 붙이고, 손실의 기울기로 파라미터를 조금씩 고치는 일"입니다. 이전 모듈의 고전 ML이 사람이 만든 피처 위에서 모델을 고르는 일이었다면, 딥러닝은 픽셀·문자·토큰 같은 원시 입력에서 피처까지 함께 학습합니다. 그래서 이미지·음성·텍스트처럼 구조가 있는 비정형 데이터에서는 압도적이지만, 수만 행짜리 표 데이터에서는 GBDT가 더 빠르고 싸게 같거나 나은 점수를 내는 일이 흔합니다. "딥러닝으로 해 주세요"라는 의뢰를 받았을 때 이 판단을 근거와 함께 말할 수 있는 것이 이 모듈의 첫 번째 가치입니다. 이후 Transformer·LLM 파인튜닝·임베딩 검색 모듈은 모두 여기서 배우는 도구(텐서, 역전파, 옵티마이저, 정규화, 학습 루프) 위에 쌓입니다.

### 텐서: shape·dtype·device를 항상 의식한다

텐서는 dtype(float32, int64 등)과 device(cpu, cuda)를 가진 다차원 배열입니다. NumPy 배열과 다른 점은 GPU로 옮길 수 있다는 것, 그리고 연산 이력을 기록해 미분할 수 있다는 것 두 가지입니다. 딥러닝 버그의 상당수는 shape에서 나옵니다. 이미지 배치는 (N, C, H, W), 시퀀스 배치는 (N, T, D)처럼 각 축의 의미를 주석으로 고정하세요. 가장 위험한 것은 오류 없이 돌아가는 브로드캐스팅입니다. (32, 1) 모양의 예측에서 (32,) 모양의 정답을 빼면 (32, 32) 행렬이 되어 loss는 숫자로 나오지만 의미가 없습니다. 핵심 지점마다 ‹assert x.shape == (N, D)›를 넣는 습관이 디버깅 시간을 크게 줄입니다.

dtype에도 규칙이 있습니다. 분류 정답은 int64(long), 입력은 float32입니다. ‹nn.CrossEntropyLoss›는 softmax를 거치지 않은 raw logits를 받고 내부에서 log-softmax를 적용하므로(PyTorch 문서 확인), 모델 끝에 softmax를 붙이면 이중으로 적용되어 학습이 느려집니다. ‹view›·‹transpose›처럼 같은 메모리를 공유하는 연산도 있어서 한쪽을 고치면 다른 쪽도 바뀌며, 복사가 필요하면 ‹clone()›을 씁니다.

### autograd: 연산 이력이 곧 계산 그래프

‹requires_grad=True›인 텐서에 연산을 하면 PyTorch가 결과가 어떤 연산(‹grad_fn›)에서 나왔는지 기록해 방향 그래프를 만듭니다. ‹loss.backward()›는 이 그래프를 거꾸로 걸으며 leaf 텐서(파라미터)의 ‹.grad›에 기울기를 더합니다. 알아야 할 사실은 네 가지입니다.

- 기울기는 덮어쓰기가 아니라 누적(+=)입니다. 매 step마다 ‹zero_grad()›를 하지 않으면 이전 배치의 기울기가 섞입니다. 이 성질을 의도적으로 쓰는 것이 gradient accumulation입니다(레슨 4).
- backward가 끝나면 그래프는 기본적으로 해제됩니다. 같은 loss에 두 번 backward하면 오류가 납니다.
- backward를 위해 중간 활성값을 저장하므로 학습 메모리의 큰 몫이 활성값입니다(레슨 8).
- 추론·평가에서는 그래프가 필요 없으므로 ‹torch.no_grad()›나 ‹inference_mode›로 끕니다. 공식 문서는 inference mode가 더 빠르지만 그 안에서 만든 텐서는 이후 autograd 계산에 쓸 수 없다고 설명합니다. ‹model.eval()›은 기울기를 끄는 기능이 아니라 dropout·BatchNorm의 동작을 바꾸는 스위치이므로(레슨 5) 평가에서는 둘 다 필요합니다.

in-place 연산(‹x.add_(1)›, ‹x[0] = 0›처럼 값을 직접 수정)은 backward에 필요한 값을 덮어쓸 수 있어, 텐서마다 붙은 버전 카운터가 이를 감지해 오류를 냅니다. "modified by an inplace operation"이 들어간 RuntimeError를 보면 그 의심부터 하세요. 반대로 옵티마이저가 파라미터를 고치는 일은 no_grad 안에서 일어나므로 이 오류와 무관합니다.

### 현장에서는 이렇게 나타난다

첫째, 학습과 추론은 다른 일입니다. 학습은 한 번(또는 가끔) 큰 자원을 쓰고 서비스는 매 요청마다 작은 자원을 쓰므로, 고객의 운영 비용은 대부분 추론 쪽에서 생깁니다. 둘째, 파라미터 수가 메모리의 출발점입니다. 1천만 파라미터 모델의 fp32 가중치는 40MB(1천만 × 4바이트)이고, 학습 중에는 기울기와 옵티마이저 상태가 더해져 가중치의 4배 안팎이 됩니다(레슨 8). 셋째, 딥러닝은 "더 큰 모델이 정답"이 아니라 "문제에 맞는 구조 + 충분한 라벨 + 올바른 학습 절차"의 문제입니다. 아래 코드는 shape, 기울기 누적, no_grad, view의 메모리 공유를 한 번에 확인하는 최소 예제입니다.`,
      code: `import torch
import torch.nn.functional as F

torch.manual_seed(0)
x = torch.randn(32, 10)                        # (배치, 특징)
y = torch.randint(0, 3, (32,))                 # 정답은 int64 클래스 번호
w = torch.randn(10, 3, requires_grad=True)
b = torch.zeros(3, requires_grad=True)

logits = x @ w + b                             # (32, 3) + (3,) -> 브로드캐스팅
assert logits.shape == (32, 3)
loss = F.cross_entropy(logits, y)              # softmax 없이 raw logits
loss.backward()
g1 = w.grad.clone()

F.cross_entropy(x @ w + b, y).backward()       # zero_grad 없이 한 번 더
print("누적:", torch.allclose(w.grad, 2 * g1))  # True: 지우지 않으면 더해진다

w.grad = None                                  # optimizer.zero_grad가 하는 일
with torch.no_grad():
    pred = (x @ w + b).argmax(dim=1)
print("추론 텐서는 그래프 없음:", pred.requires_grad is False)

a = torch.arange(6)
v = a.view(2, 3)
v[0, 0] = 99
print("view는 메모리 공유:", a[0].item())       # 99`,
      codeLang: `python`,
      key: [
        `텐서는 shape·dtype·device 세 가지를 항상 확인하고, 축의 의미를 주석과 assert로 고정한다. 브로드캐스팅은 오류 없이 틀린다.`,
        `.grad는 누적된다. 매 step zero_grad가 필요하고, backward가 끝나면 그래프는 해제된다.`,
        `추론·평가는 no_grad(또는 inference_mode)와 model.eval()을 둘 다 적용한다. 둘은 서로 다른 일을 한다.`,
        `CrossEntropyLoss는 raw logits와 int64 정답을 받는다. softmax를 먼저 적용하지 않는다.`,
        `표 데이터는 GBDT baseline이 먼저이고, 딥러닝은 이미지·텍스트·음성 같은 비정형 데이터에서 진가가 나온다.`
      ],
      pitfalls: [
        `(32, 1)과 (32,)를 연산해 (32, 32)가 되는 브로드캐스팅 때문에 loss가 이상한데도 오류가 나지 않는다.`,
        `평가 때 no_grad만 쓰고 eval()을 빼서 dropout·BatchNorm이 학습 모드로 동작하거나, 반대로 eval()만 쓰고 no_grad를 빼서 메모리를 낭비한다.`,
        `loss 텐서를 그대로 리스트에 append해 그래프가 계속 유지되고 메모리가 서서히 샌다. loss.item()이나 detach()를 써야 한다.`,
        `모델 끝에 softmax를 붙인 뒤 CrossEntropyLoss에 넣어 확률에 다시 log-softmax를 적용한다.`
      ]
    },
    {
      title: `역전파를 직접 구현하기: 연쇄 법칙·기울기 누적·수치 검사`,
      body: `autograd를 마법으로 두면 NaN이 뜨거나 기울기가 0이 될 때 손을 쓸 수 없습니다. 역전파는 사실 작은 아이디어 하나입니다. 모든 계산을 단순한 연산(덧셈, 곱셈, tanh 등)의 연결로 보고, 각 연산이 "내 출력이 바뀌면 입력이 얼마나 바뀌는가"(국소 기울기)만 알면, 연쇄 법칙으로 최종 loss에서 거꾸로 곱해 나가 모든 파라미터의 기울기를 얻을 수 있다는 것입니다. Karpathy의 Neural Networks: Zero to Hero 첫 강의(micrograd, 약 2시간 25분)가 이 구현을 한 줄씩 보여 줍니다. 여기서는 직접 짤 수 있도록 핵심만 정리합니다.

### 연쇄 법칙과 국소 기울기

y = f(x), L = g(y)이면 dL/dx = dL/dy × dy/dx입니다. 각 노드는 자기 출력에 대한 L의 기울기(‹out.grad›)를 받아 국소 기울기를 곱해 입력 쪽으로 넘깁니다.

| 연산 | 순전파 | 입력으로 보내는 기울기 |
| 덧셈 c = a + b | a + b | a에 out.grad, b에 out.grad |
| 곱셈 c = a·b | a·b | a에 b·out.grad, b에 a·out.grad |
| tanh t = tanh(a) | tanh(a) | a에 (1 − t²)·out.grad |
| ReLU r = max(0, a) | max(0, a) | a가 양수면 out.grad, 아니면 0 |
| 거듭제곱 c = a^n | a^n | n·a^(n−1)·out.grad |

### 기울기는 더한다: 한 값이 여러 곳에 쓰일 때

y = a·b + a에서 a는 두 번 쓰입니다. a로 흘러오는 기울기는 두 경로의 합, 즉 dy/da = b + 1입니다. 그래서 구현에서 grad는 항상 ‹+=›입니다. 덮어쓰기(‹=›)로 쓰면 분기가 있는 모델(잔차 연결, 가중치 공유)에서 기울기가 조용히 틀립니다. PyTorch의 ‹.grad› 누적 규칙(레슨 1)과 같은 뿌리입니다.

### 순서: 위상 정렬의 역순

backward는 "출력 쪽 기울기가 전부 모인 뒤에 입력 쪽으로 보낸다"를 지켜야 합니다. 그래프를 깊이 우선으로 훑어 부모를 먼저 방문한 순서(위상 정렬)를 만들고, 그 역순으로 각 노드의 국소 backward를 부르면 됩니다. 출발점의 grad는 1.0입니다(dL/dL = 1).

### 벡터화해도 규칙은 같다

텐서 연산도 같은 규칙입니다. 선형층 Y = XW + b에서 dW = Xᵀ·dY, dX = dY·Wᵀ, db = dY를 배치 축으로 합한 값입니다(X는 (N, in), W는 (in, out)). softmax와 교차 엔트로피를 합치면 logits의 기울기가 (예측 확률 − 정답 원핫)/N으로 놀랄 만큼 단순해집니다. 초기 예측이 균등(확률 1/C)이면 정답 클래스 logit의 기울기는 (1/C − 1)/N으로 가장 크고, 정답에 가까워질수록 작아집니다. 이 단순함은 softmax와 loss를 따로 계산하지 않고 한 함수로 합쳐 두는 이유이기도 합니다. 합친 함수는 logits에서 최댓값을 빼고 log-sum-exp를 계산해 exp 오버플로를 피하며, 그래서 ‹CrossEntropyLoss›가 확률이 아니라 raw logits를 받습니다.

### 기울기 검사: 마지막 방어선

직접 만든 연산이나 커스텀 loss는 수치 미분과 비교합니다. (f(x+h) − f(x−h)) / 2h로 근사한 값과 역전파 값의 상대오차가 1e-6 이하여야 합니다. float32에서는 반올림 때문에 1e-3 수준까지 흔들리므로 float64로 검사하는 것이 관례입니다(PyTorch의 ‹gradcheck›도 double 입력을 전제로 합니다). 느리므로 개발 중에 작은 입력으로만 돌립니다.

### 실패 모드와 현장

- 기울기 소실: tanh·sigmoid가 포화하면 (1 − t²) ≈ 0이라 아래층으로 가는 신호가 사라집니다(레슨 3).
- 기울기 폭발: 1보다 큰 곱이 층마다 반복되면 지수적으로 커집니다(레슨 4의 클리핑).
- NaN: log(0), 0/0, exp 오버플로가 대표 원인입니다. ‹torch.autograd.set_detect_anomaly(True)›로 처음 NaN이 생긴 연산을 추적할 수 있지만 느리므로, 먼저 입력과 loss 단계의 값을 출력해 보세요.
- 외주에서 autograd 자체가 틀리는 일은 드뭅니다. 문제는 ‹detach()›나 ‹.item()›을 잘못 끼워 그래프가 끊기거나, 커스텀 연산을 구현할 때 생깁니다. 파라미터 일부의 grad가 None이거나 정확히 0이면 그래프가 끊긴 것입니다.

아래 코드는 스칼라 autograd의 최소 구현이며 마지막 세 줄이 기울기 검사입니다.`,
      code: `import math

class Value:
    def __init__(self, data, parents=()):
        self.data, self.grad = float(data), 0.0
        self._parents, self._backward = parents, lambda: None
    def __add__(self, other):
        out = Value(self.data + other.data, (self, other))
        def _backward():
            self.grad += out.grad              # 합류 지점은 += 로 누적
            other.grad += out.grad
        out._backward = _backward
        return out
    def __mul__(self, other):
        out = Value(self.data * other.data, (self, other))
        def _backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        return out
    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,))
        def _backward():
            self.grad += (1 - t * t) * out.grad
        out._backward = _backward
        return out
    def backward(self):
        order, seen = [], set()
        def visit(v):                          # 부모를 먼저 방문 = 위상 정렬
            if v not in seen:
                seen.add(v)
                for p in v._parents:
                    visit(p)
                order.append(v)
        visit(self)
        self.grad = 1.0                        # dL/dL
        for v in reversed(order):
            v._backward()

f = lambda a, b: (a * b + a).tanh()            # a가 두 번 쓰인다
a, b = Value(0.5), Value(-1.2)
f(a, b).backward()
h = 1e-6
num = (f(Value(0.5 + h), Value(-1.2)).data - f(Value(0.5 - h), Value(-1.2)).data) / (2 * h)
print("역전파:", a.grad, "수치 미분:", num)      # 거의 같아야 한다`,
      codeLang: `python`,
      key: [
        `역전파 = 연쇄 법칙 + 각 연산의 국소 기울기 + 위상 정렬 역순 실행이다.`,
        `한 값이 여러 곳에 쓰이면 기울기는 경로별 합이므로 구현은 항상 +=이다.`,
        `softmax와 교차 엔트로피를 합친 logits 기울기는 (예측 확률 − 정답 원핫)/N이다.`,
        `직접 만든 연산·loss는 float64 중앙차분 수치 미분으로 검사한다(상대오차 1e-6 이하).`,
        `파라미터의 grad가 None이거나 0이면 그래프 단절(detach, item, 값 복사)을 의심한다.`
      ],
      pitfalls: [
        `grad를 =로 덮어써서 분기가 있는 구조(잔차 연결, 가중치 공유)의 기울기가 조용히 틀린다.`,
        `float32로 수치 검사를 하면서 h를 1e-8처럼 너무 작게 잡아, 반올림 오차 때문에 정상 구현을 오류로 판정한다.`,
        `‹.data›나 ‹.item()›으로 값을 꺼내 계산에 다시 써서 그래프를 끊었는데 loss는 정상적으로 출력되어 모른 채 학습한다.`,
        `NaN이 나오면 원인 확인 없이 학습률만 낮춰 본다. log(0), 0/0, 입력의 NaN은 학습률을 낮춰도 사라지지 않는다.`
      ]
    },
    {
      title: `MLP·활성화·초기화: 학습이 시작되기 전에 이미 결정되는 것들`,
      body: `MLP(다층 퍼셉트론)는 Linear 층과 비선형 함수를 번갈아 쌓은 것입니다. 비선형이 없으면 선형 층 여러 개는 수학적으로 선형 층 하나와 같아서 깊이가 의미가 없습니다. 층 하나의 파라미터 수는 입력×출력+편향이며, 예를 들어 784 → 256 → 10 구조는 (784×256+256) + (256×10+10) = 203,530개입니다. 이 정도는 암산할 수 있어야 모델 크기와 메모리를 고객에게 바로 말할 수 있습니다.

### 활성화 함수의 선택

| 함수 | 특징 | 주의 |
| sigmoid | 0~1 출력, 양 끝에서 포화 | 기울기 소실, 0 중심 아님. 은닉층보다 이진 출력 층에 |
| tanh | −1~1, 0 중심 | 포화하면 기울기 ≈ 0 |
| ReLU | max(0, x), 계산이 싸다 | 음수 구간 기울기 0, 죽은 ReLU |
| GELU·SiLU | 부드러운 ReLU 계열 | 현대 Transformer 계열에서 흔함(※ 일반 지식) |

기본은 ReLU로 시작하고, 활성화를 바꿔서 성능이 갈리는 일은 드뭅니다. 초기화와 정규화가 훨씬 중요합니다.

### 초기화: 층마다 신호의 크기를 보존한다

Linear 출력의 분산은 대략 fan_in × Var(w) × E[x²]입니다. 이 곱이 1보다 크면 층마다 신호가 불어나고 작으면 줄어들며, 깊이가 L이면 그 배율이 L번 곱해져 지수적으로 커지거나 사라집니다. 폭 256에서 가중치를 표준정규(분산 1)로 뽑으면 ReLU까지 고려해도 층마다 분산이 약 128배(표준편차 약 11배)가 되어 10층에서 10^10 수준으로 폭발합니다.

- **Kaiming(He) 초기화**: ‹Var(w) = 2/fan_in›. ReLU가 절반을 0으로 만드는 것을 보정해 분산을 보존합니다.
- **Xavier(Glorot) 초기화**: ‹Var(w) = 2/(fan_in + fan_out)›. tanh나 선형 계열에 쓰입니다.
- PyTorch ‹nn.Linear›의 기본값은 ‹kaiming_uniform_(a=√5)›로 가중치를 U(−1/√fan_in, 1/√fan_in)에서 뽑으며 분산이 1/(3·fan_in)입니다(2.15 문서·소스 확인). 따라서 ReLU와 합쳐 층마다 신호가 대략 1/6배(표준편차 약 0.4배)로 줄어듭니다. 층이 몇 개 안 될 때는 문제가 없지만 깊은 plain MLP에서는 신호가 사라집니다. 아래 코드가 세 경우를 실측합니다.

### 마지막 층과 초기 loss 점검

아무것도 모르고 균등하게 찍는 모델의 loss는 ln(C)입니다. 10클래스면 약 2.30, 문자 27개면 약 3.30, 이진 분류면 약 0.69입니다. 학습 첫 배치의 loss가 이 값에서 크게 벗어나면(예: 27) 초기 logits가 너무 커서 "자신만만하게 틀리는" 상태로 시작한 것입니다. 원인은 마지막 층의 큰 가중치, 입력 정규화 누락(픽셀을 0~255 그대로 입력), 편향 초기화입니다. 대응은 입력 표준화, 마지막 층 가중치를 0.01배로 줄이거나 0에서 시작하는 것입니다. 이 한 줄 점검이 시작 단계 버그의 상당수를 잡으며, Karpathy의 makemore 강의가 반복해서 강조하는 습관입니다.

### 진단: 층별 통계를 눈으로 본다

층별 활성값의 평균·표준편차, tanh 계열이면 포화 비율(|h| > 0.97), ReLU면 항상 0인 유닛의 비율, 파라미터별 기울기 노름을 한 번 출력해 봅니다. 업데이트 크기 대비 가중치 크기(lr × |grad| / |w|)가 대략 1e-3 안팎이면 건강하다는 것이 Karpathy가 소개한 경험칙이며 절대 기준은 아닙니다. 이 값이 훨씬 작으면 학습이 안 되고 훨씬 크면 불안정합니다.

### 현장에서는 이렇게 나타난다

"loss가 안 줄어요"라는 요청을 받으면 다음 순서로 5분 안에 대부분 원인이 나옵니다. (1) 입력과 정답의 정렬(샘플 몇 개를 눈으로 확인), (2) 입력 정규화, (3) 초기 loss ≈ ln(C), (4) 16~32개 배치 하나로 과적합이 되는지, (5) 학습률. 큰 모델을 먼저 의심하지 말고 이 순서를 지키는 것이 비용이 가장 적게 듭니다.`,
      code: `import torch
from torch import nn

def deep_mlp(depth=10, width=256, init=None):
    layers = []
    for _ in range(depth):
        lin = nn.Linear(width, width)
        if init == "normal1":
            nn.init.normal_(lin.weight, std=1.0)               # 분산 1: 폭발
        elif init == "kaiming":
            nn.init.kaiming_normal_(lin.weight, nonlinearity="relu")  # Var = 2/fan_in
        nn.init.zeros_(lin.bias)
        layers += [lin, nn.ReLU()]
    return nn.Sequential(*layers)

torch.manual_seed(0)
x = torch.randn(512, 256)                                       # 표준화된 입력
for init in [None, "normal1", "kaiming"]:
    net = deep_mlp(init=init)
    h, stds = x, []
    with torch.no_grad():
        for layer in net:
            h = layer(h)
            if isinstance(layer, nn.ReLU):
                stds.append(h.std().item())
    print(f"{str(init):8s} 첫 층 {stds[0]:.3g}  마지막 층 {stds[-1]:.3g}")

# 초기 loss 점검: 균등 예측의 loss는 ln(C)
logits = torch.zeros(8, 10)
y = torch.randint(0, 10, (8,))
print(nn.functional.cross_entropy(logits, y).item(), "vs ln10 =", torch.log(torch.tensor(10.0)).item())`,
      codeLang: `python`,
      key: [
        `Linear의 파라미터 수는 입력×출력+편향이다. 모델 크기를 암산할 수 있어야 한다.`,
        `초기화는 층마다 신호의 분산을 보존하도록 정한다. ReLU는 Kaiming(2/fan_in), tanh·선형은 Xavier. 기본 nn.Linear 초기화는 깊은 plain MLP에서 신호를 수축시킨다.`,
        `균등 예측의 loss는 ln(C)다. 첫 배치 loss가 이와 크게 다르면 초기화·입력 스케일 버그다.`,
        `입력은 표준화하고, 층별 활성값·기울기 통계를 눈으로 확인한다.`,
        `loss가 안 줄 때의 점검 순서는 정렬 → 정규화 → 초기 loss → 한 배치 과적합 → 학습률이다.`
      ],
      pitfalls: [
        `입력 픽셀을 0~255 그대로 넣어 초기 loss가 수십이 되고 첫 몇 스텝에서 발산한다.`,
        `깊이를 늘렸는데 초기화·정규화를 그대로 두어 신호가 사라지고 "깊은 모델은 안 된다"고 결론 내린다.`,
        `ReLU 네트워크에서 학습률을 과하게 키워 편향이 음수로 밀리며 죽은 ReLU 비율이 높아지는데 통계를 보지 않아 모른다.`,
        `softmax나 sigmoid를 통과한 확률에 CrossEntropyLoss·BCEWithLogitsLoss를 다시 적용한다.`
      ]
    },
    {
      title: `옵티마이저·학습률·배치 크기: 학습을 움직이는 손잡이들`,
      body: `역전파가 기울기를 주면 옵티마이저가 그 기울기로 파라미터를 어떻게 고칠지 정합니다. 가장 중요한 하이퍼파라미터는 거의 언제나 학습률(lr)입니다. 목표는 옵티마이저가 하는 일을 식 수준에서 이해하고 학습이 이상할 때 손댈 순서를 갖는 것입니다.

### SGD, momentum, Adam, AdamW

- **SGD**: θ ← θ − lr·g. 미니배치로 추정한 기울기를 그대로 씁니다. 단순하고 메모리가 거의 들지 않지만 lr에 민감하고 좁고 긴 골짜기에서 진동합니다.
- **momentum**: v ← μ·v + g, θ ← θ − lr·v. μ = 0.9면 일관된 방향에서 실효 스텝이 약 1/(1−μ) = 10배가 되어 진동은 줄고 속도는 늡니다.
- **Adam**: 기울기의 지수이동평균 m(β1 = 0.9)과 제곱의 지수이동평균 v(β2 = 0.999)를 유지하고, θ ← θ − lr·m̂/(√v̂ + ε)로 갱신합니다(m̂, v̂는 초기 편향 보정). 파라미터마다 기울기 크기로 나누므로 한 번의 업데이트 크기가 대체로 lr 안팎으로 묶여 층마다 기울기 스케일이 달라도 잘 움직입니다. PyTorch 기본값은 lr = 1e-3, betas = (0.9, 0.999), eps = 1e-8입니다(2.15 문서, 2026-11 기준). 대가는 파라미터당 fp32 상태 2개(m, v)로 가중치 메모리의 2배가 더 든다는 점입니다(레슨 8).
- **AdamW**: 과적합을 막으려 L2 항을 손실에 더하면 SGD에서는 weight decay와 같지만, Adam에서는 그 항이 기울기와 함께 √v로 나뉘어 파라미터마다 감쇠 강도가 달라집니다. AdamW 논문(Loshchilov & Hutter)은 감쇠를 기울기 경로 밖에서 θ ← θ − lr·wd·θ로 분리하라고 제안했고, PyTorch AdamW의 기본 weight_decay는 0.01(Adam은 0)이고, 2.15 문서에는 ‹Adam›의 ‹decoupled_weight_decay=True› 옵션도 있습니다(2026-11 기준). 오늘날 Transformer·파인튜닝 레시피의 기본 선택입니다(※ 일반 지식). 관행적으로 bias와 정규화 층 같은 1차원 파라미터에는 감쇠를 적용하지 않습니다.

### 학습률을 고르는 방법

학습률은 한 자릿수씩이 아니라 자릿수 단위(1e-5, 1e-4, 1e-3, 1e-2)로 탐색합니다. **LR range test**는 아주 작은 lr(예: 1e-7)에서 시작해 배치마다 지수적으로 키우며 loss를 기록하고, loss가 가장 가파르게 내려가던 구간 또는 폭발 직전 값보다 한 자릿수 낮은 값을 후보로 잡는 방법입니다(fast.ai 코스의 ‹lr_find›가 대중화). 처음부터 학습하는 소형 모델의 Adam·AdamW는 1e-4~1e-3, 사전학습 모델 미세조정은 1e-5~1e-4부터 시작하고 반드시 내 데이터에서 확인합니다(※ 경험칙).

### 스케줄: warmup과 감쇠

초반에는 Adam의 v 추정이 불안정하고, 사전학습 가중치가 큰 업데이트에 망가질 수 있어 첫 수 %의 스텝 동안 lr을 0에서 선형으로 올리는 warmup을 둡니다. 이후 cosine 감쇠로 줄이면(예: 최종 lr을 최대값의 10%) 후반 손실이 부드럽게 수렴합니다. 일정 에포크마다 lr을 0.1배로 줄이는 step 감쇠(PyTorch 전이학습 튜토리얼은 7 에포크마다)나 OneCycle도 쓰입니다. 어떤 방식이든 총 스텝 수를 알고 스케줄을 짜므로, 에포크 수를 바꾸면 스케줄도 다시 정해야 합니다.

### 배치 크기와 gradient accumulation

배치가 크면 기울기 추정 노이즈가 줄고 GPU 처리량이 오르지만, 같은 에포크에서 업데이트 횟수는 줄고 최적 lr이 달라집니다. SGD에서는 "배치를 k배 키우면 lr도 k배(+warmup)"라는 선형 스케일링이 경험칙이고, Adam에서는 딱 떨어지는 규칙이 없어 lr을 다시 탐색합니다. GPU 메모리가 모자라면 작은 배치 N번의 기울기를 모은 뒤 한 번 step하는 gradient accumulation으로 유효 배치를 키웁니다. 이때 loss를 N으로 나눠야 평균이 유지되며, BatchNorm은 여전히 작은 배치의 통계를 쓰는 점이 다릅니다.

### 기울기 클리핑과 증상별 진단

‹nn.utils.clip_grad_norm_(params, max_norm)›은 전체 기울기 노름이 max_norm을 넘으면 제자리에서 비율로 줄이고, 줄이기 전의 총 노름을 돌려줍니다(문서 확인). 1.0이 흔한 시작값이며, 반환값을 매 스텝 로그에 남기면 발산의 조기 경보가 됩니다.

| 증상 | 가능성 높은 원인 | 먼저 할 일 |
| loss가 NaN·inf | lr 과대, 입력·라벨의 NaN, log(0), fp16 오버플로 | 입력 검사, lr 1/10, 클리핑, 이상 스텝의 기울기 노름 확인 |
| ln(C) 근처에서 안 내려감 | lr 과소, 죽은 ReLU, 입력-라벨 정렬 오류 | 한 배치 과적합, 샘플을 눈으로 확인 |
| 크게 진동하거나 갑자기 급등 | lr 과대, 작은 배치, 이상치 배치, warmup 없음 | lr 하향, warmup, 클리핑, 배치별 loss 로그 |

아래 코드는 감쇠 제외 그룹을 둔 AdamW, warmup + cosine, 클리핑과 노름 로깅을 보여 줍니다.`,
      code: `import math
import torch
from torch import nn

def make_optimizer(model, lr=3e-4, wd=0.05):
    decay, no_decay = [], []
    for p in model.parameters():
        if p.requires_grad:
            (decay if p.ndim >= 2 else no_decay).append(p)   # bias·norm 가중치는 1차원
    groups = [{"params": decay, "weight_decay": wd},
              {"params": no_decay, "weight_decay": 0.0}]
    return torch.optim.AdamW(groups, lr=lr, betas=(0.9, 0.999))

def warmup_cosine(step, warmup, total, min_ratio=0.1):
    if step < warmup:
        return (step + 1) / warmup                           # 선형 warmup
    t = (step - warmup) / max(1, total - warmup)
    return min_ratio + (1 - min_ratio) * 0.5 * (1 + math.cos(math.pi * t))

torch.manual_seed(0)
model = nn.Sequential(nn.Linear(20, 64), nn.ReLU(), nn.LayerNorm(64), nn.Linear(64, 2))
opt = make_optimizer(model)
total, warmup = 1000, 50
sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: warmup_cosine(s, warmup, total))
x, y = torch.randn(256, 20), torch.randint(0, 2, (256,))

for step in range(total):
    loss = nn.functional.cross_entropy(model(x), y)
    opt.zero_grad(set_to_none=True)
    loss.backward()
    gnorm = nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
    opt.step()
    sched.step()
    if step % 200 == 0:
        print(step, f"lr={sched.get_last_lr()[0]:.2e} loss={loss.item():.3f} gnorm={gnorm.item():.2f}")`,
      codeLang: `python`,
      key: [
        `Adam은 파라미터별 기울기 크기로 정규화한 스텝을 밟는다. AdamW는 weight decay를 기울기 경로 밖으로 분리한 것이며 오늘의 기본 선택이다.`,
        `학습률은 자릿수 단위로 탐색한다. LR range test와 짧은 warmup + cosine 감쇠를 기본 틀로 삼는다.`,
        `배치 크기를 바꾸면 최적 lr이 달라진다. 메모리가 부족하면 gradient accumulation으로 유효 배치를 키우되 loss를 N으로 나눈다.`,
        `clip_grad_norm_의 반환값(총 기울기 노름)을 로그에 남기면 발산을 미리 알 수 있다.`,
        `Adam 계열은 파라미터당 fp32 상태 2개를 더 쓴다. 메모리 계산에 반드시 포함한다.`
      ],
      pitfalls: [
        `Adam의 weight_decay에 SGD 때 쓰던 값을 그대로 넣거나, L2 방식(Adam)과 decoupled 방식(AdamW)을 같은 것으로 취급해 정규화 강도가 의도와 다르게 걸린다.`,
        `에포크 수를 늘렸는데 스케줄을 다시 짜지 않아 lr이 일찍 바닥으로 떨어지거나 끝까지 높게 남는다.`,
        `gradient accumulation에서 loss를 누적 횟수로 나누지 않아 사실상 lr이 N배가 된다.`,
        `loss가 튀는 증상에 lr만 만지고, 이상치 배치나 입력의 NaN 같은 데이터 원인을 로그로 확인하지 않는다.`
      ]
    },
    {
      title: `정규화 계층과 일반화: BatchNorm·LayerNorm·dropout·weight decay·잔차 연결`,
      body: `딥러닝 모델은 파라미터가 많아 훈련 데이터를 외우기 쉽고, 깊어질수록 학습 자체도 어려워집니다. 이 레슨의 도구들은 두 목적으로 나뉩니다. 학습을 쉽게 만드는 것(정규화 계층, 잔차 연결)과 일반화를 돕는 것(dropout, weight decay, 증강, 조기 종료)입니다. 공통된 함정은 "학습할 때와 추론할 때 동작이 다르다"는 점이며, 현장 사고의 상당수가 여기서 납니다.

### BatchNorm: 배치 통계로 정규화한다

BatchNorm은 미니배치에서 채널별 평균·분산을 구해 (x − μ)/√(σ² + ε)로 정규화한 뒤 학습 가능한 γ, β로 크기와 이동을 되돌립니다. 층 입력의 분포가 안정되어 더 큰 학습률과 덜 까다로운 초기화가 가능해진다는 것이 원 논문(Ioffe & Szegedy, 2015)의 주장입니다. 핵심은 두 가지 모드입니다.

- 학습 모드: 현재 배치의 통계로 정규화하면서 이동평균(‹running_mean›, ‹running_var›, PyTorch 기본 momentum 0.1)을 갱신합니다.
- 평가 모드: 배치 통계 대신 저장된 이동평균을 씁니다. 그래서 입력이 1개여도 추론이 됩니다.

배치가 작으면(대략 8 이하, ※ 경험칙) 통계 노이즈가 커서 학습과 추론의 격차가 생깁니다. 채널당 값이 1개뿐이면(예: ‹BatchNorm1d›에 배치 1) 학습 모드에서 "Expected more than 1 value per channel when training" 오류가 납니다. 합성곱 특징 맵은 공간 크기만큼 값이 있어 배치 1도 계산은 되지만 통계가 사진 한 장에 치우칩니다. 서비스 데이터의 분포가 학습 때와 다르면 이동평균이 어긋나 성능이 떨어집니다. conv 바로 뒤에 BN을 두면 conv의 bias는 BN이 상쇄하므로 ‹bias=False›가 관례입니다.

### LayerNorm: 샘플 안에서 정규화한다

LayerNorm은 샘플 하나의 특징 축에서 평균·분산을 구합니다. 배치와 무관하므로 학습과 추론 동작이 같고 배치 크기 1이나 가변 길이 시퀀스에서도 안정적이라, Transformer 계열의 표준입니다(평균 제거를 생략한 RMSNorm은 개념만 알아 둡니다, ※ 일반 지식). 이미지 CNN은 BatchNorm, 시퀀스 모델은 LayerNorm이 기본 짝입니다.

### Dropout과 weight decay

Dropout은 학습 중 각 유닛을 확률 p로 0으로 만들고 남은 값을 1/(1−p)배 해서 기대값을 맞춥니다(inverted dropout). 추론에서는 그대로 통과합니다. Srivastava 외(JMLR 2014)는 뉴런 간 과의존을 줄이고 수많은 얇은 망을 평균하는 효과로 설명합니다. 데이터가 작고 모델이 클 때 유효하지만, 합성곱 + BN 구조나 아주 큰 데이터로 학습하는 현대 대형 모델에서는 작게 쓰거나 생략하는 일이 많습니다(※ 일반 지식). p는 0.1~0.5 사이에서 검증 곡선으로 정합니다.

Weight decay는 가중치 크기를 억제해 함수를 매끄럽게 만듭니다. AdamW에서 0.01~0.1 범위를 검증 곡선으로 탐색하는 것이 흔합니다(※ 경험칙). 그 밖에 데이터 증강(레슨 7), 조기 종료(검증 지표가 나빠지면 멈추고 최고 체크포인트 사용), label smoothing(‹CrossEntropyLoss›의 ‹label_smoothing› 인자로 정답 확률을 1보다 살짝 낮춰 과신을 억제)도 정규화 도구입니다. 가장 강한 정규화는 여전히 더 많고 깨끗한 데이터입니다.

### 잔차 연결: 깊어져도 학습되게 하는 장치

y = x + F(x)의 기울기는 ∂y/∂x = I + ∂F/∂x이므로, F가 무엇이든 항등 경로를 따라 기울기가 감쇠 없이 아래층까지 흐릅니다. ResNet 논문(He 외, 2015)은 plain 구조를 깊게 쌓으면 오히려 훈련 오차가 나빠지는 현상을 이 구조로 풀어 ImageNet에서 152층까지 깊이를 늘렸습니다. Transformer 블록의 x + sublayer(norm(x)) 구조도 같은 아이디어입니다.

### 현장에서는 이렇게 나타난다

- "개발 때 92%, 서비스에서 70%"의 단골 원인은 ‹model.eval()› 누락, 전처리 불일치, BN 이동평균입니다. 같은 입력으로 추론을 두 번 했을 때 결과가 다르면 dropout이 켜져 있다는 결정적 신호입니다.
- 작은 배치로 미세조정할 때는 BN의 통계가 흔들리지 않게 BN을 eval 모드로 고정합니다(레슨 7).
- 평가 데이터에 무작위 증강이 켜져 있지 않은지 확인합니다. 점수가 실행마다 달라지는 이유가 되기도 합니다.

아래 코드는 BatchNorm이 train과 eval에서 어떻게 달라지는지, LayerNorm이 배치와 무관하다는 점, dropout의 두 모드를 직접 확인합니다.`,
      code: `import torch
from torch import nn

torch.manual_seed(0)
x = torch.randn(64, 4) * 3 + 5                   # 평균 5, 표준편차 3

bn = nn.BatchNorm1d(4)
bn.train()
y_tr = bn(x)                                     # 배치 통계로 정규화 + 이동평균 갱신
print("train 출력 평균:", round(y_tr.mean().item(), 3))          # 약 0
bn.eval()
print("eval 직후 평균:", round(bn(x).mean().item(), 2))          # 이동평균이 아직 초기값에 가까워 3 안팎
for _ in range(100):                             # 이동평균을 데이터에 맞춰 갱신
    bn.train()
    bn(x)
bn.eval()
print("100회 뒤 eval 평균:", round(bn(x).mean().item(), 3))      # 0 근처
print("eval은 배치 1개도 가능:", bn(x[:1]).shape)

ln = nn.LayerNorm(4)
print("LayerNorm은 샘플 단위:", round(ln(x[:1]).mean().item(), 4))   # 배치 크기 1이어도 0 근처

drop = nn.Dropout(p=0.5)
h = torch.ones(8)
drop.train()
print("dropout train:", drop(h))                 # 0 또는 2.0 (기대값 유지를 위해 1/(1-p)배)
drop.eval()
print("dropout eval :", drop(h))                 # 전부 1.0`,
      codeLang: `python`,
      key: [
        `BatchNorm은 학습 때 배치 통계, 평가 때 이동평균을 쓴다. 작은 배치와 분포 이동에 취약하다.`,
        `LayerNorm은 샘플 안에서 정규화하므로 학습·추론 동작이 같다. 시퀀스·Transformer의 표준이다.`,
        `Dropout은 학습 때만 유닛을 끄고 1/(1−p)배로 보정하며 평가 때는 그대로 통과시킨다.`,
        `Adam 계열에서는 decoupled weight decay(AdamW)를 쓰고, bias·정규화 파라미터는 감쇠에서 제외하는 것이 관행이다.`,
        `잔차 연결은 항등 경로로 기울기를 보존해 깊은 망을 학습 가능하게 한다. Transformer 블록에도 그대로 쓰인다.`
      ],
      pitfalls: [
        `추론 서버에서 model.eval()을 호출하지 않아 dropout이 켜진 채 서비스하고, 같은 입력의 결과가 요청마다 달라진다.`,
        `배치 4~8 정도의 작은 배치로 BN이 들어 있는 모델 전체를 미세조정해 통계가 흔들리고 검증 점수가 들쭉날쭉해진다.`,
        `BN의 이동평균이 학습 도메인에 맞춰져 있는데 서비스 입력의 분포(조명, 해상도, 전처리)가 달라 성능이 떨어지는 것을 모델 탓으로 돌린다.`,
        `평가 변환에 무작위 증강(RandomCrop, Flip)을 그대로 두어 검증 점수가 실행마다 달라진다.`
      ]
    },
    {
      title: `학습 곡선 진단·재현성·실험 추적: 감이 아니라 기록으로 판단한다`,
      body: `딥러닝 학습은 한 번 돌리는 데 몇 분에서 며칠이 걸리고 결과에 무작위 변동이 섞여 있어서, "이번 설정이 저번보다 좋다"를 판단하는 규율이 모델 구조 지식만큼 중요합니다. 이 레슨은 곡선을 읽는 법, 재현성을 확보하는 법, 실험을 기록하는 법을 다룹니다.

### 학습 곡선 읽기

에포크(또는 스텝)마다 train loss, val loss, 그리고 과제 지표(정확도·F1·PR-AUC)를 함께 기록해 그립니다.

| 곡선 모양 | 해석 | 처방 |
| train·val 모두 아직 내려가는 중 | 학습 부족 | 더 학습, lr 점검 |
| train은 내려가고 val이 올라가기 시작 | 과적합 | 증강, 정규화, 조기 종료, 모델 축소, 데이터 추가 |
| 둘 다 높은 값에서 평평 | 과소적합 또는 학습이 안 됨 | lr, 용량, 한 배치 과적합 테스트, 라벨·입력 버그 |
| val이 train보다 계속 낮음 | dropout·증강 효과이거나, val이 쉬움·누수 | 분할과 누수 점검 |
| val이 심하게 출렁임 | val이 작음, lr 과대, BN | val 확대, lr 하향, 이동평균 점검 |

val loss는 오르는데 val 정확도는 아직 오르는 경우도 있습니다(맞히는 샘플은 늘고, 틀리는 샘플은 더 확신해서 틀림). 조기 종료의 기준을 loss로 할지 과제 지표로 할지 미리 정해 두세요.

### 한 배치 과적합 테스트

16~32개 샘플 하나로 loss를 거의 0까지 내리지 못한다면 모델·loss·라벨·옵티마이저 중 어딘가에 버그가 있습니다. 큰 데이터로 몇 시간을 돌리기 전에 1분 만에 걸러 내는 가성비 최고의 점검입니다.

### 평가 규율은 그대로 적용된다

이전 모듈의 분할·누수 규율은 딥러닝에서도 같습니다. 같은 상품을 여러 각도로 찍은 사진이 train과 val에 나뉘면 사진 단위 무작위 분할은 누수이므로 상품·판매자 같은 그룹 단위로 나눕니다. 증강 이미지를 분할 전에 만들면 같은 원본이 양쪽에 들어갑니다. val로 하이퍼파라미터를 튜닝했다면 test는 마지막에 한 번만 봅니다.

### 무작위 변동과 비교

같은 설정이라도 seed에 따라 소규모 데이터에서는 정확도가 1%p 안팎 흔들리는 일이 흔합니다(데이터와 모델에 따라 크게 다름). 두 설정을 한 번씩 돌려 비교하면 변동을 개선으로 착각합니다. 3~5개 seed의 평균 ± 표준편차로 비교하고, 차이가 표준편차 안이면 "차이 없음"으로 보고합니다.

### 재현성: 어디까지 약속할 수 있나

- seed는 ‹random›, ‹numpy›, ‹torch› 세 곳에 모두 설정합니다. ‹torch.manual_seed›는 CPU와 CUDA 난수를 함께 시드합니다(PyTorch 문서 확인).
- DataLoader는 ‹generator›와 ‹worker_init_fn›으로 셔플과 워커의 난수를 고정합니다(문서에 예제가 있음).
- ‹torch.backends.cudnn.benchmark›가 True면 입력 크기마다 가장 빠른 합성곱 알고리즘을 골라 실행마다 달라질 수 있으므로 재현이 필요하면 False로 둡니다(문서 확인).
- ‹torch.use_deterministic_algorithms(True)›는 결정적 구현이 있으면 그것을 쓰고, 비결정적이면서 대안이 없는 연산은 오류를 냅니다(‹warn_only=True›면 경고만). 결정적 구현은 더 느릴 수 있습니다(문서 확인). 일부 CUDA 연산(cuBLAS)은 환경 변수 ‹CUBLAS_WORKSPACE_CONFIG›(‹:4096:8› 또는 ‹:16:8›, CUDA 초기화 전에 설정)도 요구합니다. NVIDIA cuBLAS 문서는 ‹:4096:8›이 GPU 메모리를 약 24MiB 더 쓰고 ‹:16:8›은 성능을 제한할 수 있다고 적습니다(2026-11 열람).
- 그래도 GPU 모델·드라이버·라이브러리 버전이 다르면 비트 단위 동일 결과는 보장되지 않습니다. 외주에서는 "같은 환경(컨테이너)에서 같은 seed면 같은 결과, 환경이 바뀌면 통계적 범위 안에서 재현"으로 약속합니다.

### 실험 기록

매 실행마다 최소한 하이퍼파라미터 전체(설정 파일), 데이터 버전(파일 해시나 분할 목록), 코드 버전(git 커밋), 라이브러리·GPU 정보, 에포크별 곡선, 최종 지표, 체크포인트 경로, 한 줄 메모(왜 돌렸고 무엇을 배웠나)를 남깁니다. TensorBoard·MLflow·Weights & Biases 같은 도구가 있지만(사용 조건과 무료 범위는 수시로 바뀜) 소규모 프로젝트는 JSONL 파일 하나와 곡선 PNG로 시작해도 충분합니다. 실패한 실험도 기록하세요. 인수인계 때 "이미 해 본 것의 목록"이 고객에게 가치가 되고 재작업을 막습니다. 고객 데이터를 외부 SaaS 추적 도구에 올릴 때는 계약상 허용되는지 먼저 확인해야 합니다. 아래 코드는 세 곳 seed와 DataLoader 난수, 한 줄 JSON 실험 기록의 최소 골격입니다.`,
      code: `import json, os, random, subprocess, time
import numpy as np
import torch

def set_seed(seed: int, deterministic: bool = False) -> torch.Generator:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if deterministic:                       # 느려질 수 있으니 필요할 때만
        os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")   # CUDA 초기화 전에 설정
        torch.use_deterministic_algorithms(True, warn_only=True)
        torch.backends.cudnn.benchmark = False
    g = torch.Generator()
    g.manual_seed(seed)
    return g                                # DataLoader(generator=g)로 전달

def seed_worker(worker_id):
    s = torch.initial_seed() % 2**32        # 워커마다 다른 값에서 numpy·random 시드
    np.random.seed(s)
    random.seed(s)

def log_run(cfg: dict, metrics: dict, path="runs.jsonl"):
    try:
        sha = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True).strip()
    except Exception:
        sha = "unknown"
    rec = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "git": sha,
           "torch": torch.__version__, "cfg": cfg, "metrics": metrics}
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\\n")

g = set_seed(42)
# loader = DataLoader(ds, batch_size=32, shuffle=True, generator=g, worker_init_fn=seed_worker, num_workers=2)
log_run({"lr": 3e-4, "wd": 0.05, "seed": 42}, {"val_f1": 0.871, "epoch": 12})`,
      codeLang: `python`,
      key: [
        `학습 곡선(train/val loss와 과제 지표)의 모양으로 학습 부족·과적합·과소적합·버그를 구분하고, 조기 종료 기준을 미리 정한다.`,
        `16~32개 샘플 한 배치로 loss를 거의 0까지 내려 보는 테스트가 파이프라인 버그를 가장 싸게 잡는다.`,
        `seed마다 점수가 흔들리므로 3~5개 seed의 평균 ± 표준편차로 비교하고, 차이가 변동 안이면 개선이 아니다.`,
        `재현성은 seed 3종 + DataLoader generator + cudnn.benchmark 끄기 + 필요 시 결정적 연산이며, 환경이 다르면 통계적 재현을 약속한다.`,
        `하이퍼파라미터·데이터 버전·git 커밋·환경·곡선을 매 실행마다 기록하고, 실패한 실험도 남긴다.`
      ],
      pitfalls: [
        `torch.manual_seed 하나만 설정하고 DataLoader 워커와 numpy 증강의 난수를 고정하지 않아 같은 seed인데 결과가 달라진다.`,
        `val 셋으로 하이퍼파라미터를 수십 번 튜닝한 뒤 같은 val 점수를 최종 성능으로 보고한다.`,
        `같은 상품·판매자의 사진이 train과 val에 나뉘는 사진 단위 무작위 분할로 점수가 부풀려진다.`,
        `use_deterministic_algorithms를 켜고 속도가 느려진 것을 모른 채 모든 실험을 그 설정으로 돌려 일정이 늘어난다.`
      ]
    },
    {
      title: `CNN·전이학습·DataLoader·증강: 적은 라벨로 쓸 만한 이미지 모델 만들기`,
      body: `이미지 외주의 현실은 라벨이 수백~수천 장뿐이라는 것입니다. 이 데이터로 처음부터 CNN을 학습하는 일은 드물고, 대부분 사전학습 모델을 가져와 내 과제에 맞춥니다. 이 레슨은 합성곱이 하는 일, 전이학습의 세 가지 전략, 그리고 학습 속도와 정확도를 좌우하는 DataLoader·증강을 다룹니다.

### 합성곱이 하는 일

224×224×3 입력을 완전연결층으로 은닉 1,000개에 연결하면 150,528 × 1,000 = 약 1억 5천만 개의 파라미터가 필요합니다. 합성곱은 (1) 지역 연결: 작은 창(예: 3×3)만 보고, (2) 가중치 공유: 같은 필터를 모든 위치에 적용합니다. 그 결과 파라미터가 극적으로 줄고, 물체가 이미지 안에서 움직여도 같은 필터가 반응합니다(이동 등변성). ‹Conv2d(Cin, Cout, k)›의 파라미터 수는 Cin × Cout × k²(+ Cout)입니다. 3 → 64, 7×7이면 9,408개(bias 제외), 64 → 64, 3×3이면 36,864개입니다. 출력 한 변의 크기는 floor((H + 2p − k)/s) + 1이며, H = 224, k = 7, s = 2, p = 3이면 112입니다.

CNN은 해상도를 줄이고 채널을 늘리며 쌓습니다. 앞쪽 층은 에지·질감, 뒤쪽 층은 부품·물체 같은 추상적인 특징에 반응하고, 끝에서 global average pooling과 Linear로 분류합니다. torchvision 문서 기준 ResNet-18은 11,689,512개, ResNet-50은 25,557,032개(약 1,170만·2,560만, 2026-11 열람)의 파라미터를 가집니다. 구현마다 다르니 ‹sum(p.numel())›로 직접 확인하세요.

### 전이학습: 세 가지 전략

앞쪽 층의 특징은 과제가 달라도 재사용되고 뒤쪽은 과제에 특화된다는 관찰이 전이학습의 근거입니다.

| 전략 | 학습 대상 | 맞는 상황 |
| 특징 추출기 | 새 헤드만 | 라벨 수백~수천 장, 도메인이 ImageNet과 비슷 |
| 부분 미세조정 | 마지막 블록 + 헤드, 차등 학습률 | 라벨 수천 장, 도메인이 약간 다름 |
| 전체 미세조정 | 전체, 작은 학습률 | 라벨이 많거나 도메인이 크게 다름(의료·위성 등) |

PyTorch 공식 전이학습 튜토리얼은 개미·벌 분류에서 두 방식을 비교하는데, 한 번 실행한 검증 정확도가 헤드만 학습한 쪽이 약 0.954, 전체 미세조정이 약 0.935로 보고되어 있습니다(2026-11 열람). 작은 데이터에서는 학습 대상을 줄이는 쪽이 과적합이 적어 유리할 수 있다는 예이지, 일반 법칙은 아닙니다. 실무에서는 헤드만 학습한 점수를 먼저 기록하고 한 단계씩 풀어 가며 이득이 있는지 확인하세요. 사전학습 모델의 전처리(리사이즈, ImageNet 평균·표준편차 정규화)를 그대로 맞추는 것이 중요하며(‹weights.transforms()›), 동결한 BatchNorm은 ‹train()› 중에도 통계가 갱신되므로 작은 배치로 미세조정할 때는 eval로 고정합니다. ‹model.train()›을 부를 때마다 모든 BN이 다시 학습 모드가 되므로 에포크마다 이 고정을 다시 적용해야 합니다. 사전학습 가중치와 그 학습 데이터의 라이선스가 상업 납품에 문제없는지도 계약 전에 확인해야 합니다.

### DataLoader: GPU가 놀고 있지 않은지 본다

학습이 느린 원인의 상당수는 모델이 아니라 데이터 공급입니다. ‹nvidia-smi›의 GPU 사용률이 계속 낮으면 로더가 병목입니다. PyTorch 문서 기준 ‹num_workers›의 기본값은 0(메인 프로세스에서 로딩)이고, ‹pin_memory›는 CUDA 전송을 빠르게 하며, ‹persistent_workers›는 에포크마다 워커를 다시 만들지 않게 하고, ‹prefetch_factor›는 워커당 미리 읽을 배치 수(기본 2)입니다. 파일 경로 같은 Python 객체의 큰 리스트를 Dataset에 들고 있으면 워커마다 메모리가 불어나므로 NumPy·PyArrow 형태로 두라는 것이 문서의 조언입니다. Windows에서는 워커가 spawn 방식이라 학습 스크립트를 ‹if __name__ == "__main__":› 아래에 두어야 합니다. BN이 있는 모델은 마지막 배치가 1~2개로 남지 않게 ‹drop_last=True›를 고려합니다.

### 증강: 훈련에만, 라벨을 보존하며

무작위 크롭·좌우 반전·색 변화는 훈련 변환에만 쓰고 검증·테스트는 결정적 변환(리사이즈 + 중앙 크롭 + 정규화)만 씁니다. 라벨이 바뀌는 증강은 금지입니다(숫자 6과 9에 회전, 방향이 의미인 표지판에 좌우 반전). 증강 결과를 이미지로 몇십 장 저장해 눈으로 확인하는 것이 가장 싼 검증입니다. 클래스 불균형이 크면 ‹CrossEntropyLoss›의 ‹weight›나 샘플러로 보정하고 정확도 대신 클래스별 재현율·macro-F1을 봅니다. 아래 코드는 동결, 새 헤드, 단계별 옵티마이저, BN 고정의 최소 골격입니다.`,
      code: `import torch
from torch import nn
from torchvision import models

weights = models.ResNet18_Weights.DEFAULT        # 처음 실행할 때 가중치를 내려받는다
model = models.resnet18(weights=weights)
preprocess = weights.transforms()                # 사전학습과 같은 리사이즈·정규화 (평가 변환)

for p in model.parameters():
    p.requires_grad = False                      # 1단계: 특징 추출기 동결
model.fc = nn.Linear(model.fc.in_features, 5)    # 새 헤드 5클래스 (새 층은 requires_grad=True)

def freeze_bn_stats(m):
    # 동결한 BatchNorm은 train() 중에도 이동평균이 갱신되므로 eval로 고정
    if isinstance(m, nn.BatchNorm2d) and not next(m.parameters()).requires_grad:
        m.eval()

def stage1_optimizer():
    return torch.optim.AdamW(model.fc.parameters(), lr=1e-3, weight_decay=1e-2)

def stage2_optimizer():                          # 2단계: 마지막 블록 해제 + 차등 학습률
    for p in model.layer4.parameters():
        p.requires_grad = True
    return torch.optim.AdamW([
        {"params": model.layer4.parameters(), "lr": 1e-4},   # 사전학습 층은 더 작게
        {"params": model.fc.parameters(), "lr": 5e-4},
    ], weight_decay=1e-2)

model.train()
model.apply(freeze_bn_stats)                     # model.train()을 부를 때마다(에포크 시작·단계 전환) 다시 호출
x = torch.randn(4, 3, 224, 224)
print(model(x).shape)                            # torch.Size([4, 5])
n_train = sum(p.numel() for p in model.parameters() if p.requires_grad)
print("1단계 학습 대상 파라미터:", n_train)        # 512*5+5 = 2565`,
      codeLang: `python`,
      key: [
        `Conv2d의 파라미터는 Cin×Cout×k², 출력 크기는 floor((H+2p−k)/s)+1이다. 지역 연결과 가중치 공유가 파라미터를 줄인다.`,
        `전이학습은 헤드만 → 마지막 블록 → 전체 순으로 한 단계씩 풀며 각 단계 점수를 기록하고, 이득이 없으면 멈춘다.`,
        `사전학습과 같은 전처리를 맞추고, 작은 배치 미세조정에서는 동결한 BatchNorm을 eval로 고정하고 model.train()을 부를 때마다 다시 적용한다.`,
        `GPU 사용률이 낮으면 데이터 로더가 병목이다. num_workers·pin_memory·persistent_workers를 조정한다.`,
        `증강은 훈련 변환에만 적용하고 라벨을 보존해야 하며, 결과를 눈으로 확인한다. 분할은 증강 전에, 그룹 단위로 한다.`
      ],
      pitfalls: [
        `사전학습 모델에 ImageNet 정규화를 빠뜨리거나 해상도를 마음대로 바꿔 전이 효과가 사라지고 "전이학습은 효과가 없다"고 결론 낸다.`,
        `모든 층을 큰 학습률(예: 1e-2의 SGD)로 미세조정해 사전학습된 특징을 첫 에포크에 망가뜨린다.`,
        `검증 변환에 RandomResizedCrop이 그대로 남아 있어 검증 점수가 매번 달라진다.`,
        `Windows에서 ‹__main__› 보호 없이 num_workers > 0을 써서 워커가 스크립트를 재실행하며 오류가 나거나 무한 생성된다.`
      ]
    },
    {
      title: `학습 루프 공학: 체크포인트·mixed precision·GPU 메모리 산정과 OOM 디버깅`,
      body: `학습이 몇 시간짜리 일이 되면 "중간에 죽어도 이어서 돌릴 수 있는가", "메모리와 시간에 맞는가"가 프로젝트를 좌우합니다.

### 학습 루프의 표준 순서

한 스텝의 순서는 device 이동 → ‹zero_grad› → (autocast 안에서) forward·loss → ‹backward› → (GradScaler면 unscale) → 클리핑 → ‹optimizer.step› → ‹scheduler.step›입니다. 에포크가 끝나면 ‹eval()›·‹no_grad›로 검증·기록·저장하고 ‹train()›으로 돌아옵니다.
### 체크포인트: 모델만 저장하면 재개할 수 없다

- 재개용에는 model, optimizer(Adam의 m·v), scheduler, scaler, epoch/step, best 지표를 넣습니다. optimizer 상태가 없으면 재개 직후 Adam 통계가 초기화되어 loss가 튀는 일이 흔합니다.
- 배포용은 가중치(‹state_dict›)만 저장합니다. fp32 가중치는 파라미터당 4바이트이고 재개용은 Adam 상태 때문에 대략 3배입니다.
- 임시 파일에 쓰고 ‹os.replace›로 바꾸면 쓰는 도중 죽어도 이전 파일이 남습니다. last와 best는 분리합니다.
- ‹torch.load›는 pickle 기반이라 출처를 모르는 파일을 열면 임의 코드가 실행될 수 있으므로 ‹weights_only=True›를 명시하고(기본값은 2.6, 2025-01부터 True) 가능하면 safetensors 형식을 씁니다.

### Mixed precision: 속도와 활성값 메모리를 얻는다

| 형식 | 부호/지수/가수 비트 | 특징 |
| fp32 | 1/8/23 | 기준 |
| fp16 | 1/5/10 | 범위가 좁아(최대 약 65,504) 작은 기울기가 0으로 사라진다. loss scaling 필요 |
| bf16 | 1/8/7 | fp32와 같은 지수 범위, 정밀도는 낮음. 보통 scaler 불필요, 지원 GPU 필요(※) |

‹torch.autocast›는 matmul·conv·linear 같은 연산을 저정밀로 실행하고 수치에 민감한 연산은 fp32로 둡니다. 문서는 forward와 loss만 autocast로 감싸고 backward는 밖에서 호출하라고 안내합니다. fp16에서는 ‹torch.amp.GradScaler›가 loss에 큰 값(기본 초기 scale 65536)을 곱해 backward하고, 기울기를 원래 크기로 되돌려(unscale) 클리핑한 뒤 step합니다. inf·NaN이 나온 스텝은 건너뛰고 scale을 절반으로 줄이며 정상 스텝이 이어지면 다시 키웁니다(문서 확인). 흔한 오해는 AMP가 모델 메모리를 절반으로 만든다는 것인데, autocast는 가중치를 fp32로 유지하므로 파라미터·기울기·옵티마이저 메모리는 그대로이고 줄어드는 것은 주로 활성값입니다.

### GPU 메모리 산정

학습 메모리는 대략 파라미터 + 기울기 + 옵티마이저 상태 + 활성값 + 워크스페이스·단편화의 합입니다. fp32 + AdamW에서 앞의 셋은 4 + 4 + 8 = 파라미터당 16바이트이므로 1억 파라미터면 1.6GB, 10억이면 16GB입니다(활성값 제외). 활성값은 배치 크기와 해상도·시퀀스 길이에 비례해 늘고, 추론은 가중치만 필요해 fp32면 4바이트, fp16이면 2바이트입니다. ResNet-50(약 2,560만 개)의 학습 상태는 약 410MB로 작아서 OOM은 거의 항상 활성값, 즉 배치와 해상도에서 납니다.

### OOM 디버깅 순서

1. 에러 메시지를 읽습니다. 시도한 할당 크기, GPU 총 용량, PyTorch가 할당한 양, "reserved but unallocated" 양이 나오며 마지막 값이 크면 단편화를 의심합니다.
2. 배치를 절반으로 줄여 통과하면 활성값 문제입니다.
3. 평가 코드의 ‹no_grad› 누락이나 loss 텐서를 그대로 쌓는 로그 코드를 봅니다. 에포크가 갈수록 메모리가 늘면 이 경우입니다.
4. AMP로 활성값을 줄이고, gradient accumulation으로 유효 배치를 유지합니다. gradient checkpointing은 활성값을 저장하는 대신 backward에서 다시 계산해 메모리를 시간과 맞바꿉니다.
5. 단편화에는 ‹PYTORCH_ALLOC_CONF=expandable_segments:True›(옛 이름 ‹PYTORCH_CUDA_ALLOC_CONF›는 별칭)가 도움이 될 수 있습니다(2.15 문서상 실험적 기능, 크기가 변하는 입력에 유효). 세부 추적에는 ‹torch.cuda.memory._record_memory_history()›, ‹_dump_snapshot()›과 시각화 페이지 memory_viz를 씁니다.
6. ‹nvidia-smi›는 캐시까지 포함해 크게 보이므로 ‹memory_allocated()›와 ‹max_memory_allocated()›로 실측하고, ‹empty_cache()›는 살아 있는 텐서를 해제하지 못합니다.

### 현장에서는 이렇게 나타난다

고객의 GPU(예: 8GB급)가 모델·해상도의 상한이므로 견적 전에 목표 해상도와 배치에서 한 스텝이 들어가는지 측정하고, 클라우드 GPU 가격과 무료 환경의 한도는 견적 시점에 다시 확인하세요. 아래는 재개 가능한 학습 루프의 골격입니다.`,
      code: `import os
import torch
from torch import nn

def make_amp(device):
    # Ampere(compute capability 8.x) 이상만 네이티브 bf16. is_bf16_supported()는 기본값이 에뮬레이션 포함
    native_bf16 = device == "cuda" and torch.cuda.get_device_capability()[0] >= 8
    use_fp16 = device == "cuda" and not native_bf16
    dtype = torch.float16 if use_fp16 else torch.bfloat16      # bf16이 가능하면 scaler 없이
    return dtype, torch.amp.GradScaler("cuda", enabled=use_fp16)

def save_ckpt(path, model, opt, sched, scaler, epoch, best):
    state = {"model": model.state_dict(), "opt": opt.state_dict(), "sched": sched.state_dict(),
             "scaler": scaler.state_dict(), "epoch": epoch, "best": best}
    torch.save(state, path + ".tmp")
    os.replace(path + ".tmp", path)             # 쓰다 죽어도 이전 파일이 남는다

def load_ckpt(path, model, opt, sched, scaler, device):
    s = torch.load(path, map_location=device, weights_only=True)
    model.load_state_dict(s["model"]); opt.load_state_dict(s["opt"])
    sched.load_state_dict(s["sched"]); scaler.load_state_dict(s["scaler"])
    return s["epoch"] + 1, s["best"]            # 다음 에포크부터 이어서

def train_epoch(model, loader, opt, sched, scaler, dtype, device, clip=1.0):
    model.train()
    total, n = torch.zeros((), device=device), 0
    for x, y in loader:
        x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
        opt.zero_grad(set_to_none=True)
        with torch.autocast(device_type=device, dtype=dtype, enabled=(device == "cuda")):
            loss = nn.functional.cross_entropy(model(x), y)
        scaler.scale(loss).backward()           # backward는 autocast 밖에서
        scaler.unscale_(opt)                    # 클리핑 전에 원래 크기로
        nn.utils.clip_grad_norm_(model.parameters(), clip)
        scaler.step(opt)                        # inf/NaN이면 이 스텝은 건너뛴다
        scaler.update()
        sched.step()
        total += loss.detach() * len(y)         # 매 스텝 .item()은 GPU 동기화를 부른다
        n += len(y)
    return (total / n).item()

@torch.no_grad()
def evaluate(model, loader, device):
    model.eval()
    hits = sum((model(x.to(device)).argmax(1).cpu() == y).sum().item() for x, y in loader)
    return hits / len(loader.dataset)`,
      codeLang: `python`,
      key: [
        `재개용 체크포인트에는 model·optimizer·scheduler·scaler·epoch·best를 모두 넣고, 임시 파일에 쓴 뒤 교체한다. 배포용은 가중치만 따로 둔다.`,
        `fp16은 loss scaling(GradScaler)이 필요하고 bf16은 fp32와 같은 지수 범위라 보통 필요 없다. AMP는 주로 활성값 메모리와 속도를 줄인다.`,
        `학습 메모리는 파라미터 + 기울기 + 옵티마이저 상태 + 활성값이다. fp32 + AdamW는 파라미터당 16바이트(활성값 제외).`,
        `OOM은 에러 메시지 읽기 → 배치 줄여 원인 분리 → no_grad·loss 누적 점검 → AMP → accumulation → checkpointing → 단편화 순으로 진단한다.`,
        `신뢰할 수 없는 체크포인트는 pickle 로딩 위험이 있다. weights_only=True나 safetensors를 쓴다.`
      ],
      pitfalls: [
        `모델 가중치만 저장해 재개했더니 Adam 상태와 스케줄러가 초기화되어 loss가 튀고, 이전 곡선과 이어지지 않는다.`,
        `fp16 autocast만 켜고 GradScaler를 쓰지 않아 작은 기울기가 0이 되고 학습이 정체된다(또는 scaler를 쓰면서 unscale 없이 클리핑해 기준이 틀어진다).`,
        `AMP를 켰으니 모델 메모리가 절반이 될 것이라 가정한다. 가중치·기울기·옵티마이저 상태는 그대로이고 줄어드는 것은 주로 활성값이다.`,
        `매 스텝 loss.item()을 호출하거나 로그용 텐서를 GPU에 쌓아 속도와 메모리를 동시에 잃는다.`
      ]
    },
    {
      title: `임베딩과 시퀀스 모델의 문턱: word2vec·토크나이저·attention의 기원`,
      body: `LLM, 검색, 추천의 공통 언어는 임베딩입니다. 이 레슨은 임베딩이 무엇이고 어떻게 학습되는지, 서브워드 토크나이저가 왜 비용과 성능에 영향을 주는지, 순환 신경망 시대의 병목이 어떻게 attention을 낳았는지를 정리해 다음 모듈(Transformer·LLM 내부 구조)의 문턱을 만듭니다.

### 임베딩: 학습 가능한 룩업 테이블

범주형 ID(단어, 상품, 사용자)를 연속 벡터로 바꾸는 것이 임베딩입니다. ‹nn.Embedding(V, D)›는 V × D 행렬이고, ID i를 넣으면 i번째 행을 꺼냅니다. 수학적으로는 원핫 벡터와 이 행렬의 곱과 같지만 룩업으로 구현해 훨씬 쌉니다. 어휘 32,000개, 차원 768이면 24,576,000개(약 2,460만) 파라미터이고 fp32로 약 98MB입니다. 역전파에서는 이번 배치에서 조회된 행만 기울기를 받습니다.

의미는 거리로 표현됩니다. "비슷한 문맥에 나타나는 단어는 비슷한 벡터를 갖는다"는 분포 가설이 바탕이며, word2vec(Mikolov 외, 2013)은 단어를 연속 벡터로 싸게 학습하는 두 가지 모델 구조를 제안하고 16억 단어를 하루 안에 학습했다고 보고합니다. 벡터 비교는 보통 코사인 유사도(정규화한 내적)로 합니다. 표 데이터에서도 임베딩은 유용합니다. 상품·사용자 ID처럼 카디널리티가 수만~수백만인 범주형을 원핫으로 넣으면 비효율적이어서, 추천·클릭률 예측 모델은 ID마다 임베딩을 학습하고 사용자·아이템 벡터의 내적으로 점수를 냅니다.

한계도 분명합니다. word2vec은 단어 하나에 벡터 하나라서 "bank"의 두 의미가 같은 벡터에 섞입니다. Transformer 기반 모델은 문맥에 따라 달라지는 표현을 만들고, 검색용 임베딩 모델은 문장·문서 단위의 표현을 만듭니다(다음 모듈에서 다룹니다). 어떤 임베딩이든 내 도메인의 평가셋(정답 유사 쌍 100~300개)으로 직접 검증해야 합니다.

### 토크나이저와 BPE

단어 단위 어휘는 크기가 폭발하고 처음 보는 단어를 처리하지 못합니다. 문자 단위는 시퀀스가 너무 길어집니다. Sennrich 외(2015)는 희귀어를 더 작은 서브워드 단위로 쪼개 번역 품질을 높였고, 이 BPE 계열이 현대 LLM 토크나이저의 뿌리입니다. 문자에서 시작해 가장 자주 이웃하는 쌍을 반복해서 합치며 목표 어휘 크기에 도달하는 방식입니다. 토큰 수는 곧 비용·지연·컨텍스트 한도이므로 같은 문서라도 언어와 토크나이저에 따라 비용이 달라집니다. 한국어는 영어보다 토큰이 더 많이 나오는 경향이 있으나(※ 토크나이저마다 다르므로 직접 측정해야 합니다), 이는 다음 모듈에서 실제로 재 봅니다.

### seq2seq의 병목과 attention의 기원

Sutskever 외(2014)의 seq2seq는 LSTM 인코더가 입력 문장 전체를 고정 길이 벡터 하나로 압축하고 LSTM 디코더가 그것을 출력 문장으로 풀어 냅니다. 문장이 길수록 이 벡터 하나가 병목이 됩니다. Bahdanau 외(2014)는 디코더가 단어를 하나 만들 때마다 원문의 각 위치에 점수를 매기고, softmax로 만든 가중치로 원문 표현을 가중합한 문맥 벡터를 쓰게 했습니다. 어디를 볼지를 학습하는 이 소프트 탐색이 오늘 attention의 직접적인 조상입니다. 개념식은 점수 e_i = score(질의, 키_i), 가중치 a = softmax(e), 출력 = Σ a_i × 값_i 입니다.

RNN 계열은 시점을 순서대로 처리해 병렬화가 어렵고, 먼 거리의 기울기가 곱해지며 사라집니다(레슨 3·4). Transformer가 순환을 버리고 attention만 쓰는 이유가 여기서 나옵니다.

### 현장에서는 이렇게 나타난다

유사 상품 추천, 중복 문서 탐지, 시맨틱 검색 같은 외주는 임베딩 모델 선택이 성패를 가릅니다. "공개 벤치마크 1위"를 고르지 말고 고객 데이터의 평가셋으로 비교하세요. 학습 데이터에 없는 신조어·상품명·업계 용어에서 성능이 떨어지는 일이 흔합니다. 아래 코드는 임베딩이 원핫 행렬곱과 같다는 점, 균등 예측의 초기 loss가 ln(V)라는 점, 문자 bigram 모델을 학습하는 과정을 보여 줍니다(Karpathy의 makemore 첫 단계에 해당).`,
      code: `import torch
import torch.nn.functional as F
from torch import nn

words = ["emma", "olivia", "ava", "isabella", "sophia", "mia", "amelia", "harper"]
chars = sorted(set("".join(words)))
stoi = {c: i + 1 for i, c in enumerate(chars)}
stoi["."] = 0                                    # 시작/끝 기호
V = len(stoi)

xs, ys = [], []
for w in words:
    seq = ["."] + list(w) + ["."]
    for a, b in zip(seq, seq[1:]):               # (이전 문자, 다음 문자) 쌍
        xs.append(stoi[a])
        ys.append(stoi[b])
xs, ys = torch.tensor(xs), torch.tensor(ys)

emb = nn.Embedding(V, V)                         # 행 = 이전 문자, 열 = 다음 문자의 logit
onehot = F.one_hot(xs, V).float()
print("룩업 == 원핫 행렬곱:", torch.allclose(emb(xs), onehot @ emb.weight))

nn.init.zeros_(emb.weight)                       # 균등 예측에서 시작
print("초기 loss", round(F.cross_entropy(emb(xs), ys).item(), 4),
      "ln V =", round(torch.log(torch.tensor(float(V))).item(), 4))
for step in range(300):
    loss = F.cross_entropy(emb(xs), ys)
    emb.zero_grad()
    loss.backward()
    with torch.no_grad():
        emb.weight -= 2.0 * emb.weight.grad
print("학습 후 loss", round(loss.item(), 4))

e = F.normalize(emb.weight.detach(), dim=1)      # 코사인 유사도 = 정규화한 내적
sim = e @ e.T
print("자기 자신과의 유사도:", sim.diagonal()[:3])   # 1 근처`,
      codeLang: `python`,
      key: [
        `nn.Embedding은 학습 가능한 룩업 테이블이며 원핫 벡터 × 행렬과 수학적으로 같다. 파라미터는 V × D개다.`,
        `의미는 벡터 공간의 거리(코사인 유사도)로 표현된다. 고카디널리티 범주형 피처에도 임베딩을 쓴다.`,
        `BPE 같은 서브워드 토크나이저는 자주 붙는 쌍을 반복 병합한다. 토큰 수가 곧 비용·지연·컨텍스트다.`,
        `seq2seq의 고정 길이 벡터 병목을 푼 것이 Bahdanau attention이고, 이것이 Transformer의 출발점이다.`,
        `임베딩 모델은 공개 벤치마크가 아니라 내 도메인의 평가셋으로 고른다.`
      ],
      pitfalls: [
        `공개 벤치마크 순위만 보고 임베딩 모델을 골라 고객 도메인(전문 용어, 신조어, 한국어)에서 검색 품질이 떨어진다.`,
        `사전학습 임베딩의 어휘에 없는 토큰을 모두 같은 미지 토큰으로 처리해 핵심 단어의 정보를 잃는다.`,
        `토큰 수를 영어 기준으로 추정해 한국어 문서의 비용과 컨텍스트 소비를 과소평가한다.`,
        `벡터를 정규화하지 않고 내적과 코사인 유사도를 섞어 써서 길이가 큰 벡터가 항상 유리해진다.`
      ]
    },
    {
      title: `통합 사례: 중고 의류 사진 분류 PoC, 딥러닝 여부 판단부터 납품까지`,
      body: `가상 고객은 중고거래 앱 운영사입니다. 상품 사진을 상의·하의·아우터·신발·가방 5개 카테고리로 자동 분류하고 싶고, 라벨이 붙은 사진은 1,400장(클래스당 90~600장으로 불균형), 서비스는 2 vCPU짜리 CPU 서버에서 응답 300ms 이내여야 합니다. 의뢰서에는 "ChatGPT 같은 최신 거대 모델로 정확도 95%"라고 적혀 있습니다. 앞 레슨의 도구를 하나의 납품 흐름으로 묶어 봅니다.

### 1. 의뢰 번역

타깃(5분류 단일 라벨인가), 오분류 비용(어느 방향 오류가 더 아픈가), 지표(클래스별 재현율과 macro-F1의 합격선), 추론 환경(CPU, 300ms, 모델 크기 상한), 데이터 권리(사진의 저작권·얼굴 포함 여부, 외부 클라우드로 반출 가능한가)를 문장으로 확정합니다. "95%"는 시험 구간·지표·baseline 대비 개선 기준으로 바꿔 계약서에 넣고, "거대 모델"은 소형 CNN 전이학습과 외부 비전 API를 건당 비용·지연·데이터 외부 전송 관점에서 비교해 제안합니다.

### 2. 데이터 감사: 딥러닝 프로젝트의 절반은 데이터다

- 같은 판매자가 같은 옷을 여러 장 올린 near-duplicate를 찾아 판매자 단위로 train/val/test(70/15/15)를 나눕니다. 사진 단위 무작위 분할은 누수입니다.
- 클래스마다 30장을 눈으로 확인해 라벨 오류율을 추정합니다. 오류가 5%면 점수의 천장도 그 근처입니다.
- 배경 편향을 확인합니다. 신발 사진이 항상 흰 배경이면 모델이 신발이 아니라 배경을 배웁니다.

### 3. baseline 사다리

| 단계 | 방법 | 목적 |
| 0 | 다수 클래스 예측 | 하한. 최대 클래스가 600/1,400이면 정확도 약 43% |
| 1 | 동결 특징 + 로지스틱 회귀 | 전이학습의 가치를 몇 분 만에 확인 |
| 2 | 헤드 학습(AdamW + 증강) | 1단계 대비 이득 확인 |
| 3 | 마지막 블록 미세조정 + 차등 학습률 | 2단계 대비 이득이 변동보다 클 때만 |
| 4 | 전체 미세조정, 더 큰 모델 | 데이터가 늘거나 도메인 격차가 클 때 |

### 4. 실험 운영과 오류 분석

한 배치 과적합 테스트, LR range test를 거쳐 단계마다 3~5개 seed로 돌리고 평균 ± 표준편차와 곡선을 JSONL에 기록합니다. 단계 3의 이득이 표준편차 안이면 단순한 단계 2를 채택합니다. 그다음 혼동 행렬과 확신에 차서 틀린 사진 30장을 직접 봅니다. 모델의 한계인지 라벨 오류인지 배경 편향인지 구분되고, 라벨을 고쳐 다시 학습하는 것이 모델을 바꾸는 것보다 효과가 큰 경우가 많습니다.

### 5. 배포 제약 검증과 비용 산정

CPU에서 배치 1로 워밍업을 제외하고 100회 이상 재서 전처리를 포함한 end-to-end p50·p95 지연을 기록하고, 모델 파일 크기를 적습니다. 300ms를 못 맞추면 더 작은 모델이나 낮은 해상도를 쓰고, 추론에서는 학습과 같은 전처리 함수를 공유하며 ‹eval()›과 ‹no_grad›를 적용합니다. 학습 쪽은 아래 코드로 파라미터와 활성값을 추정하고 실측으로 확인해, 고객 GPU 없이 무료 노트북 환경(사양과 한도는 수시로 바뀌므로 견적 시점에 확인)으로 충분한지 판단합니다.

### 6. 납품과 함정

납품물은 재현 저장소(환경 고정, seed, 3개 명령으로 재현), 학습·추론 스크립트, 가중치 파일과 해시, 평가 리포트(baseline 대비, 클래스별 재현율, 평균 ± 표준편차), 모델 카드(데이터 출처·라이선스·한계·배경 편향), 실패 실험을 포함한 실험 로그, 재학습 절차와 모니터링 제안입니다. 함정은 판매자 단위 누수, "95% 보장"이라는 약속, 라벨 오류가 만드는 천장, 서비스 환경(조명·앱 압축)의 분포 이동, 사전학습 가중치의 라이선스입니다.`,
      code: `import torch
from torch import nn

def count_params(model):
    return sum(p.numel() for p in model.parameters())

def activation_bytes_per_sample(model, sample):
    """leaf 모듈 출력 크기의 합. 저장되는 활성값의 대략적 추정이므로 실측으로 확인한다."""
    total = 0
    def hook(_, __, out):
        nonlocal total
        if isinstance(out, torch.Tensor):
            total += out.numel() * out.element_size()
    handles = [m.register_forward_hook(hook) for m in model.modules()
               if len(list(m.children())) == 0]
    model.eval()
    with torch.no_grad():
        model(sample)
    for h in handles:
        h.remove()
    return total

def estimate_train_gb(model, sample, batch, amp=False):
    n = count_params(model)
    weights, grads, adam = n * 4, n * 4, n * 8      # fp32 가중치·기울기·AdamW 상태 2개
    act = activation_bytes_per_sample(model, sample[:1]) * batch * (0.5 if amp else 1.0)
    parts = {"weights": weights, "grads": grads, "adamw": adam, "activations": act}
    parts["total"] = sum(parts.values())
    return {k: v / 1e9 for k, v in parts.items()}

m = nn.Sequential(nn.Conv2d(3, 16, 3, padding=1), nn.ReLU(), nn.AdaptiveAvgPool2d(1),
                  nn.Flatten(), nn.Linear(16, 5))
x = torch.randn(2, 3, 224, 224)
for k, v in estimate_train_gb(m, x, batch=64).items():
    print(f"{k:12s} {v:.4f} GB")
# GPU가 있다면 실측과 비교: torch.cuda.max_memory_allocated() / 1e9`,
      codeLang: `python`,
      key: [
        `의뢰의 모델 이름과 정확도 수치는 시험 구간·지표·baseline 대비 개선과 배포 제약(지연·크기·환경)이 있는 수용 기준으로 번역한다.`,
        `분할은 그룹(판매자) 단위로 하고, 라벨 오류율·배경 편향·중복을 먼저 감사한다. 딥러닝 프로젝트의 절반은 데이터 작업이다.`,
        `baseline 사다리(다수 클래스 → 동결 특징 + 로지스틱 → 헤드 → 부분 미세조정 → 전체)를 한 단계씩 오르며 각 이득을 3~5 seed의 평균 ± 표준편차로 보고한다.`,
        `오류 분석(혼동 행렬, 확신에 찬 오답)은 모델 교체보다 라벨 수정이 효과적인지 알려 준다.`,
        `납품 전에 배포 환경에서 지연(p50·p95)과 모델 크기를 재고, 학습·추론 전처리를 하나의 함수로 공유한다.`
      ],
      pitfalls: [
        `사진 단위 무작위 분할로 같은 판매자의 near-duplicate가 양쪽에 섞여 검증 점수가 부풀고 서비스 성능과 크게 어긋난다.`,
        `처음부터 큰 모델과 전체 미세조정으로 시작해 라벨 오류·누수 같은 데이터 문제를 모델 크기로 덮으려 한다.`,
        `GPU 서버에서 학습한 점수만 보고하고 CPU 배포 환경의 지연·메모리를 재지 않아 납품 후에 요구 사항을 못 맞춘다.`,
        `사전학습 가중치와 학습 데이터의 라이선스, 고객 사진의 외부 서비스 업로드 허용 여부를 확인하지 않고 진행한다.`
      ]
    }
  ],
  labs: [
    {
      title: `micrograd에서 학습 진단 일지까지: 역전파를 직접 짜고 일부러 망가뜨려 증상 기록하기`,
      scenario: `외부 서비스 없이 Python과 PyTorch(CPU)만으로 세 가지를 합니다. 첫째, 스칼라 autograd 엔진을 직접 구현해 PyTorch의 기울기와 맞는지 검증합니다. 둘째, 같은 작은 MLP를 직접 만든 엔진과 PyTorch로 각각 학습시켜 loss 곡선이 일치하는지 봅니다. 셋째, scikit-learn의 ‹load_digits›(8×8 숫자 이미지 1,797장, 10클래스, 내려받기 불필요)로 PyTorch MLP를 학습하면서 학습률, 초기화, 입력 스케일, zero_grad, 이중 softmax, eval 모드를 일부러 망가뜨려 증상을 수치로 기록하는 "학습 진단 일지"를 만듭니다. 이 일지가 이후 모든 "loss가 이상해요" 의뢰의 점검표가 되므로, 증상과 함께 어떤 진단 신호(초기 loss, 기울기 노름, 활성값 표준편차)로 원인을 구분했는지를 적는 것이 핵심입니다.`,
      steps: [
        `Value 클래스를 구현합니다: 덧셈, 곱셈, 거듭제곱, tanh, exp, relu와 위상 정렬 backward. 뺄셈·나눗셈은 덧셈·곱셈·거듭제곱으로 환원합니다. 강의 영상은 먼저 보지 말고 레슨 2의 골격에서 시작하세요.`,
        `기울기 검사를 합니다: 같은 식을 float64 torch 텐서로 계산해 grad를 비교하고 중앙차분 수치 미분과도 비교합니다. 식은 최소 다섯 개(한 값을 두 번 쓰는 a*b+a, tanh 포화 입력 3.0, relu 경계 바로 옆(±1e-3처럼 h보다 충분히 큰 거리), 나눗셈, 10단계 합성)를 씁니다.`,
        `직접 만든 엔진으로 2-16-1 MLP(tanh)를 make_moons 데이터 200개에 SGD로 100 스텝 학습하고 loss를 기록합니다. 같은 초기 가중치를 float64 PyTorch 모델에 복사해 같은 학습을 하고 두 곡선을 비교합니다.`,
        `load_digits에 표준화를 적용한 뒤 64 → 128 → 64 → 10 MLP를 AdamW(lr 3e-3)로 학습하는 정상 baseline을 만듭니다. 학습 전 첫 배치 loss와 ln(10) = 2.30을 비교하고, 32개 샘플 한 배치 과적합 테스트를 통과시킵니다.`,
        `고장 실험을 여섯 가지 이상 합니다: (a) lr = 10, (b) 가중치를 표준정규로 초기화, (c) 표준화 없이 원본 입력, (d) zero_grad 누락, (e) 모델 끝에 softmax를 붙이고 CrossEntropyLoss 사용, (f) dropout 0.5 모델을 eval() 없이 평가, (g) 라벨 셔플. 각 실험은 30 스텝 이상 돌리고 첫 5 스텝 loss와 최종 loss·정확도를 기록합니다.`,
        `진단 함수를 만듭니다: 층별 활성값 평균·표준편차, 파라미터별 기울기 노름, 첫 배치 loss와 ln(C)의 비교 경고. 모든 고장 실험에서 이 함수의 출력을 일지에 붙입니다.`,
        `일지 표를 완성합니다: 설정 변경 / 첫 5 스텝 loss / 최종 loss·정확도 / 증상 / 진단 신호 / 처방. 증상만 비슷하고 원인이 다른 쌍(예: lr 과대와 입력 스케일 문제)은 어떤 신호로 구분했는지를 한 줄로 적습니다.`,
        `정상 설정으로 돌아와 LR range test(1e-5에서 1까지 지수 증가, 60 스텝)를 직접 구현하고 loss–lr 곡선에서 loss가 폭발하는 lr과 선택한 lr, 그 근거를 한 문장으로 적습니다.`
      ],
      accept: [
        `최소 다섯 개 식 모두에서 직접 만든 엔진과 float64 PyTorch의 grad 최대 절대 오차가 1e-9 이하이고, 중앙차분과는 1e-6 이하이다.`,
        `같은 초기 가중치·같은 데이터·같은 스텝에서 직접 만든 엔진과 PyTorch의 100 스텝 loss가 모든 스텝에서 상대 차이 1e-6 이하로 일치한다.`,
        `정상 baseline의 첫 배치 loss가 ln(10)의 ±30% 이내이고, 32개 샘플 한 배치 과적합이 200 스텝 안에 loss 0.05 이하에 도달한다. 표준정규 초기화 실험의 첫 스텝 loss는 ln(10)의 5배 이상이다.`,
        `진단 일지에 최소 여섯 종의 고장이 수치와 진단 신호, 처방과 함께 기록되어 있고, LR range test의 폭발 lr과 선택 lr이 표시되어 있다.`
      ],
      stretch: `직접 만든 엔진에 Adam 옵티마이저를 추가하고(β1 = 0.9, β2 = 0.999, 편향 보정 포함), 같은 초기값에서 PyTorch AdamW(weight_decay = 0)의 처음 10 스텝 파라미터 값과 1e-9 이내로 일치하는지 확인하세요. 일치하지 않는다면 어느 항에서 어긋났는지 찾아 일지에 적습니다.`
    },
    {
      title: `소형 CNN 학습 파이프라인: 재현성·곡선 진단·체크포인트 재개·AMP`,
      scenario: `torchvision의 FashionMNIST(28×28 흑백, 10클래스)에서 훈련 데이터 중 10,000장만 써서 CPU에서도 에포크당 수십 초~수 분에 도는 작은 CNN 학습 파이프라인을 만듭니다. 레슨 5~8의 도구(정규화 계층, 곡선 진단, seed 고정, 실험 기록, 체크포인트 재개, mixed precision)를 하나의 학습 스크립트로 구현하고, 일부러 고장낸 학습을 진단해 일지로 남기는 실습입니다. GPU가 없다면 AMP·메모리 측정 단계는 Colab·Kaggle 같은 무료 GPU 세션(사양과 한도는 수시로 바뀜)에서 그 단계만 수행하거나 건너뛰고 사유를 기록하세요. 이 실습의 산출물은 정확도가 아니라 "같은 설정이면 같은 결과가 나오고, 중간에 죽어도 이어지고, 이상이 생기면 곡선과 로그로 원인을 말할 수 있는" 학습 코드입니다.`,
      steps: [
        `FashionMNIST 훈련 60,000장 중 10,000장을 train, 2,000장을 val로 seed를 고정해 나누고 test 10,000장은 마지막까지 열지 않습니다. 클래스 분포를 출력합니다.`,
        `모델을 만듭니다: Conv(1 → 16, 3×3)-BatchNorm-ReLU-MaxPool을 두 번 쌓고 Flatten 후 Linear로 10클래스. 파라미터 수를 손으로 계산한 뒤 sum(p.numel())과 비교합니다.`,
        `학습 스크립트를 짭니다: AdamW + warmup-cosine, 클리핑과 총 기울기 노름 로깅, 에포크마다 train/val loss·정확도를 JSONL로 기록, best·last 체크포인트(옵티마이저·스케줄러 포함, 임시 파일 후 교체).`,
        `재현성을 확보합니다: random·numpy·torch seed, DataLoader의 generator와 worker_init_fn을 적용하고 같은 seed로 두 번 실행해 첫 3 에포크 train loss를 비교합니다. 서로 다른 seed 5개로 최종 val 정확도의 평균 ± 표준편차를 냅니다.`,
        `재개 테스트를 합니다: 에포크 5 이후 프로세스를 강제 종료하고 체크포인트에서 재개해 loss 곡선이 이어지는지 봅니다. 같은 지점에서 모델 가중치만 저장해 재개한 실행도 만들어 loss가 튀는 정도를 비교합니다.`,
        `고장 실험을 다섯 가지 합니다: (a) 평가에서 model.eval() 누락(BN 때문에 배치 크기 1과 64의 평가 결과 차이), (b) 검증 변환에 무작위 증강, (c) lr = 0.5, (d) 입력 정규화 제거(0~255 스케일), (e) 훈련 데이터 500장만 사용해 과적합 유도. 곡선과 증상을 기록합니다.`,
        `과적합 유도 실험(500장)에서 val 곡선이 꺾이는 에포크와 조기 종료 에포크를 표시하고, 증강·dropout·weight decay 각각을 켠 효과를 3 seed 평균 ± 표준편차 표로 정리합니다. 표준편차 안의 차이는 "차이 없음"으로 표기합니다.`,
        `(GPU 사용 시) AMP를 켜고 끈 에포크 시간과 torch.cuda.max_memory_allocated 값을 비교하고, 레슨 10의 추정 함수 결과와 얼마나 다른지 적습니다. GPU가 없으면 CPU bf16 autocast로 정확도 변화만 비교합니다.`,
        `한 쪽짜리 실험 보고서를 씁니다: 설정, 곡선, 고장별 진단 신호, 재현성의 범위(어떤 조건에서 같은 결과를 기대할 수 있는가).`
      ],
      accept: [
        `같은 seed·같은 환경(CPU, 같은 스레드 수)에서 두 번 실행한 첫 3 에포크 train loss가 1e-4 이내로 일치한다. 일치하지 않으면 원인과 허용 오차가 문서화되어 있다.`,
        `5개 seed의 최종 val 정확도가 평균 ± 표준편차로 표기되어 있고, 최소 세 설정을 비교한 표에서 표준편차를 넘는 차이만 개선으로 판정되어 있다.`,
        `체크포인트 재개 실행의 재개 직후 에포크 loss가 직전 에포크 대비 20% 넘게 튀지 않고, 가중치만 저장해 재개한 실행과의 차이가 수치로 기록되어 있다.`,
        `고장 실험 다섯 가지 각각의 증상(수치)과 진단 신호, 처방이 정상 설정과 비교되어 표로 정리되어 있고, 파라미터 수 손 계산이 sum(p.numel())과 일치한다.`
      ],
      stretch: `num_workers를 0, 2, 4로 바꾸고 persistent_workers·pin_memory 조합까지 바꿔 가며 데이터 로더 처리량(images/sec)을 표로 만들고, GPU 사용률이나 에포크 시간이 로더 때문에 제한되는 지점을 찾으세요. Windows라면 __main__ 보호가 없을 때 어떤 오류가 나는지도 기록합니다.`
    },
    {
      title: `클라이언트 납품 미니 프로젝트: 소규모 이미지 분류 PoC의 평가 리포트·모델 카드·인수인계`,
      scenario: `가상 고객은 중고거래 앱 운영사이며 의뢰서는 "AI 이미지 분류, 정확도 95% 이상, 최신 거대 모델로"입니다. 서비스는 2 vCPU CPU 서버에서 응답 300ms 이내, 모델 파일 100MB 이하여야 하고(가정), 사진은 외부로 반출할 수 없습니다. 당신은 컨설턴트로서 의뢰 번역, 데이터 감사, baseline 사다리, 실험 운영, 오류 분석, 배포 검증, 납품 문서를 모두 제출합니다. "고객 제공 데이터"는 torchvision의 Flowers102나 OxfordIIITPet 같은 무료 공개 데이터에서 5개 클래스를 골라 클래스당 최대:최소가 약 4:1이 되도록 총 1,000~1,500장으로 구성합니다(각 데이터셋의 이용 조건을 확인해 모델 카드에 적습니다). 일부러 한 클래스의 라벨을 소량(약 3%) 틀리게 바꿔 두고, 감사 단계에서 이를 찾아내면 더 좋은 훈련이 됩니다.`,
      steps: [
        `의뢰 번역서 1~2쪽: 타깃 정의, 오분류 비용, 지표(macro-F1과 클래스별 재현율 하한), 배포 제약(지연 300ms, 모델 100MB, CPU), 데이터 권리, "정확도 95%"를 수용 기준(시험 구간, 지표, baseline 대비 개선, 변동 보고)으로 바꾼 문장, test 사전 봉인 규칙.`,
        `데이터 구성과 감사: 불균형 5클래스 구성, 그룹(같은 원본·같은 출처) 단위 분할 규칙, 파일 해시로 중복 확인, 클래스별 30장 육안 점검과 라벨 오류율 추정, 분할 후 test 봉인.`,
        `baseline 사다리를 실행합니다: 다수 클래스 예측, 동결 특징 + 로지스틱 회귀(scikit-learn), 헤드만 학습, 마지막 블록 미세조정(차등 학습률), 선택적으로 전체 미세조정. 단계마다 3~5 seed로 macro-F1과 클래스별 재현율의 평균 ± 표준편차를 냅니다.`,
        `실험 운영 증거를 남깁니다: 한 배치 과적합 테스트 통과 기록, LR range test 결과, JSONL 실험 로그, 곡선 PNG, 체크포인트로 재개할 수 있다는 확인.`,
        `오류 분석: 혼동 행렬, 확신 높은 오답 30장을 직접 보고 원인(라벨 오류 / 모델 한계 / 배경 편향)을 표로 분류합니다. 라벨 오류를 고쳐 다시 학습한 결과를 한 번 비교하되 test는 쓰지 않습니다.`,
        `배포 검증: CPU에서 배치 1, 워밍업 10회를 제외하고 100회 이상 재어 전처리 포함 end-to-end p50·p95 지연을 기록하고, 모델 파일 크기(MB)를 적습니다. 학습과 추론이 같은 전처리 함수를 쓰고 eval()과 no_grad가 적용되었는지 확인합니다.`,
        `레슨 10의 추정 함수로 학습 메모리를 예측하고 실측(GPU의 max_memory_allocated 또는 CPU 프로세스 메모리 피크)과 비교합니다.`,
        `문서 패키지: 평가 리포트(Markdown, baseline 대비와 변동 포함), 모델 카드(목적·비목적, 데이터 출처·라이선스, 한계, 배경 편향, 재학습 조건), README(환경 고정과 3개 명령 재현), 인수인계 체크리스트.`,
        `견적서 초안 1쪽: 항목별 작업 시간(상한), 재작업 조건(라벨 수정 후 재학습 횟수), 학습 컴퓨팅 비용의 처리 방식(실비 정산 또는 상한).`
      ],
      accept: [
        `수용 기준서가 정확도 보장이 아니라 시험 구간·지표·baseline 대비 개선·배포 제약으로 쓰여 있고 "보장" 표현이 없다.`,
        `깨끗한 환경에서 README의 3개 명령만으로 평가 리포트의 주요 표가 재현되며(같은 환경·seed에서 macro-F1 ±0.01 이내), 저장소에 환경 고정 파일이 있다.`,
        `사다리의 모든 단계가 3~5 seed 평균 ± 표준편차와 다수 클래스 baseline과 함께 제시되고, 채택 단계의 선택 근거(이득과 변동의 비교)가 문장으로 적혀 있다.`,
        `CPU 지연 p50·p95와 모델 크기가 측정값으로 보고되고 합격선(300ms, 100MB)의 충족 여부가 적혀 있으며, 미충족이면 조치와 재측정 결과가 있다. 모델 카드에 라이선스 확인 결과·한계·클래스별 재현율 최저값이 명시되어 있다.`
      ],
      stretch: `모델을 ONNX로 내보내 ONNX Runtime(CPU)에서 지연과 PyTorch 출력의 최대 절대 오차를 비교하고, 같은 데이터에서 클래스 가중 loss와 가중 샘플러 중 어느 쪽이 소수 클래스 재현율에 유리한지 3 seed로 비교해 보세요.`
    }
  ],
  quiz: [
    {
      q: `고객이 약 5만 행, 숫자·범주형 컬럼 40개로 이뤄진 표 형태 고객 데이터로 이탈 예측을 "딥러닝으로" 만들어 달라고 합니다. 라벨은 충분하고 텍스트·이미지 같은 비정형 데이터는 없습니다. 가장 적절한 진행은?`,
      choices: [
        `요청대로 큰 MLP를 먼저 만들고, 점수가 낮으면 층과 폭을 늘려 가며 성능을 끌어올린다`,
        `같은 분할에서 규칙·GBDT baseline을 먼저 만들고, 신경망은 비교 실험 하나로 추가해 점수·비용·운영 복잡도를 보고서에 함께 제시한다`,
        `딥러닝은 표 데이터에서 항상 GBDT보다 못하므로 신경망 실험은 거절하고 GBDT만 납품한다`,
        `표 데이터를 이미지로 변환해 CNN 전이학습을 적용해 "딥러닝"이라는 요구를 형식적으로 충족한다`
      ],
      answer: 1,
      why: `표 형태 데이터에서는 GBDT가 강한 baseline인 경우가 많으므로 같은 분할과 지표로 baseline을 세운 뒤 신경망의 이득이 비용을 정당화하는지를 근거로 보고하는 것이 외주의 정석입니다. 가장 그럴듯한 오답인 "항상 못하다"는 과한 일반화이고 고객 요구를 근거 없이 거절하는 것이며, baseline 없이 모델만 키우는 선택지나 억지 이미지 변환은 비용만 늘립니다.`
    },
    {
      q: `10클래스 분류(클래스 균형) 모델을 처음 학습시킨 로그입니다.

step 0  loss 27.41
step 1  loss 19.80
step 2  loss 61.30
step 3  loss nan

입력은 0~255 픽셀 값을 float로 바꾼 것이고 정규화는 하지 않았습니다. 가장 먼저 할 조치는?`,
      choices: [
        `옵티마이저를 SGD에서 Adam으로 바꾸면 파라미터별로 스텝 크기가 정규화되어 발산이 멎으므로 학습률은 그대로 두고 비교한다`,
        `배치 크기를 두 배로 늘려 기울기 노이즈를 줄이면 loss가 안정될 것이므로 메모리가 허용하는 가장 큰 배치로 다시 돌린다`,
        `모델이 너무 깊어 불안정한 것이므로 층 수를 절반으로 줄여 파라미터를 줄인 뒤 같은 설정으로 다시 학습한다`,
        `첫 loss가 ln(10) ≈ 2.3이 아니라 27이므로 초기 logits가 과대하다고 보고, 입력을 표준화하고 마지막 층 초기 가중치를 작게 한 뒤 초기 loss가 2.3 근처인지 먼저 확인한다`
      ],
      answer: 3,
      why: `균등하게 찍는 10클래스 모델의 loss는 약 2.3이므로 첫 loss 27은 초기 출력이 비정상적으로 크다는 신호이고, 원인은 스케일이 큰 입력입니다. 이 문제는 학습이 시작되기 전에 이미 생긴 것이라 옵티마이저 교체나 배치 확대로는 사라지지 않습니다. 가장 그럴듯한 오답인 Adam으로의 교체도 첫 스텝의 큰 logits와 기울기를 만드는 원인을 그대로 둡니다.`
    },
    {
      q: `다음 학습 루프에서 학습이 불안정하고 loss가 에포크가 지날수록 크게 흔들립니다. 문제는?

for x, y in loader:
    loss = F.cross_entropy(model(x), y)
    loss.backward()
    opt.step()`,
      choices: [
        `zero_grad()가 없어 이전 배치의 기울기가 계속 누적된 채로 step이 일어난다`,
        `loss.backward()를 step보다 먼저 호출해서 순서가 틀렸다`,
        `cross_entropy에 넣기 전에 logits에 softmax를 적용하지 않았다`,
        `model.train()을 호출하지 않아 기울기가 계산되지 않는다`
      ],
      answer: 0,
      why: `PyTorch의 .grad는 덮어쓰기가 아니라 누적이므로 매 스텝 비우지 않으면 과거 배치의 기울기가 더해져 업데이트가 점점 부풀고 흔들립니다. backward 뒤에 step을 부르는 순서는 올바르고, cross_entropy는 raw logits를 받아 내부에서 log-softmax를 적용하므로 softmax를 먼저 넣으면 오히려 틀립니다. train()은 dropout·BN 동작을 바꿀 뿐 기울기 계산 여부와는 무관합니다.`
    },
    {
      q: `이미지 분류 모델의 개발 환경 검증 정확도는 92%인데, 서비스 서버에서 요청을 1건씩 처리하면 70% 안팎이고 같은 이미지를 두 번 보내면 확률이 조금씩 다르게 나옵니다. 추론 함수에는 model.eval() 호출이 없습니다. 가장 적절한 조치와 확인 방법은?`,
      choices: [
        `서버 GPU가 달라서 생기는 수치 차이이므로 개발 환경과 같은 GPU를 쓰도록 서버를 바꾼다`,
        `요청이 1건이라 BatchNorm이 동작하지 않는 것이 원인이므로 BN을 모두 제거하고 다시 학습한다`,
        `추론 전에 model.eval()과 torch.no_grad()(또는 inference_mode)를 적용하고, 같은 입력을 두 번 넣어 출력이 부동소수 오차 범위 안에서 같은지로 dropout이 꺼졌는지 확인한다`,
        `요청마다 입력에 작은 잡음을 더해 여러 번 추론한 결과를 평균해 변동을 줄인다`
      ],
      answer: 2,
      why: `같은 입력의 출력이 달라지는 것은 dropout이 켜져 있다는 결정적 신호이고, train 모드에서는 BatchNorm도 현재 배치의 통계를 써서 요청 1건짜리 통계로 정규화하므로 정확도가 떨어집니다. GPU 모델 차이는 1e-6 안팎의 수치 오차를 만들 뿐 22%p의 하락을 설명하지 못합니다. BN을 제거하고 재학습하는 것은 원인이 모드 설정임을 놓친 과한 처방입니다.`
    },
    {
      q: `라벨 1,200장의 이미지 분류를 ResNet-18 전체 미세조정(lr 1e-3, 증강 없음)으로 학습했더니 다음과 같았습니다.

epoch  train_loss  val_loss  val_acc
1      1.10        0.95      0.68
3      0.42        0.61      0.79
6      0.08        0.74      0.80
10     0.01        1.12      0.77

가장 적절한 다음 단계는?`,
      choices: [
        `더 큰 모델(ResNet-50)로 바꿔 훈련 loss를 더 낮추면 검증 성능도 함께 오르므로 용량부터 키워 본다`,
        `에포크를 50으로 늘려 val loss가 다시 내려오는지 기다리고, 그동안 같은 설정으로 학습을 계속 이어 간다`,
        `epoch 3~6 부근 체크포인트를 채택(조기 종료)하고, 증강·weight decay·낮은 학습률·더 많은 동결 층·데이터 추가 같은 과적합 대책을 하나씩 바꿔 3개 seed로 비교한다`,
        `검증 셋에 훈련 데이터 일부를 합쳐 val loss가 낮아 보이도록 만든 뒤 개선된 값을 고객에게 보고한다`
      ],
      answer: 2,
      why: `train loss는 계속 내려가는데 val loss가 epoch 3 이후 올라가는 전형적인 과적합이므로, 가장 좋았던 구간의 체크포인트를 쓰고 일반화를 돕는 대책을 하나씩 바꿔 변동(seed)을 감안해 비교해야 합니다. 더 큰 모델은 훈련 데이터를 더 잘 외워 격차만 키우고, 에포크를 늘려 기다리는 것은 곡선이 이미 알려 주는 방향을 무시하는 것입니다. 검증 셋에 훈련 데이터를 섞으면 점수가 좋아 보일 뿐 일반화 성능을 더 이상 측정하지 못합니다.`
    },
    {
      q: `GPU에서 mixed precision을 적용했는데 몇 에포크가 지나도 loss가 거의 줄지 않고, fp32로 돌리면 정상입니다. 이 GPU는 bf16을 지원하지 않는 구형이라 fp16을 썼습니다.

for x, y in loader:
    opt.zero_grad()
    with torch.autocast("cuda", dtype=torch.float16):
        loss = F.cross_entropy(model(x.cuda()), y.cuda())
    loss.backward()
    opt.step()

가장 가능성 높은 원인과 수정은?`,
      choices: [
        `fp16에서 작은 기울기가 0으로 사라지는 underflow를 막는 loss scaling이 없다. GradScaler로 scale(loss).backward(), scaler.step(opt), scaler.update() 패턴을 적용한다`,
        `autocast 안에서 loss를 계산한 것이 잘못이므로 loss 계산을 autocast 밖으로 옮긴다`,
        `opt.zero_grad()를 autocast 이전에 호출한 것이 잘못이므로 backward 뒤로 옮긴다`,
        `모델 가중치를 fp16으로 바꿔야 하므로 model.half()를 호출한다`
      ],
      answer: 0,
      why: `fp16은 표현 범위가 좁아 작은 기울기가 0으로 사라지기 쉬워 loss scaling이 필요하고, 이 코드는 GradScaler 없이 fp16 autocast만 켰습니다. PyTorch 문서는 forward와 loss 계산을 함께 autocast로 감싸라고 안내하므로 loss를 밖으로 옮기는 것이 해법이 아니고, zero_grad의 위치도 원인이 아닙니다. model.half()로 가중치까지 fp16으로 만들면 autocast가 fp32 가중치를 유지하는 이점을 버려 더 불안정해집니다.`
    },
    {
      q: `ResNet-50(약 2,560만 파라미터)을 해상도 384, 배치 64로 16GB GPU에서 AdamW로 학습하는데 첫 스텝에서 CUDA OOM이 납니다. 같은 설정에서 배치 16은 통과합니다. 고객은 논문과 같은 유효 배치 64를 원합니다. 가장 적절한 대응은?`,
      choices: [
        `옵티마이저를 SGD로 바꿔 Adam의 상태 메모리를 줄이면 배치 64가 들어가므로 그렇게 바꿔 다시 학습한다`,
        `모델 상태가 410MB 안팎이라 메모리 문제가 아니므로 GPU 드라이버를 재설치한다`,
        `PYTORCH_CUDA_ALLOC_CONF만 바꾸면 GPU 총 용량이 늘어나므로 그것으로 해결한다`,
        `배치 16이 통과하므로 활성값이 병목이다. 배치 16 × 누적 4스텝으로 유효 배치 64를 만들고(loss를 4로 나눔) 필요하면 AMP를 더하며, BN이 배치 16 통계를 쓴다는 점을 기록한다`
      ],
      answer: 3,
      why: `파라미터 2,560만 개의 fp32 + AdamW 상태는 약 410MB라 작고, 배치를 줄이면 통과하므로 병목은 배치와 해상도에 비례하는 활성값입니다. gradient accumulation으로 유효 배치를 유지하고 AMP로 활성값을 줄이는 것이 맞는 처방입니다. SGD로 바꿔도 줄어드는 것은 모멘텀 유무에 따라 약 100~200MB 수준이고, 메모리 할당 설정은 단편화를 완화할 뿐 GPU 용량을 늘리지 못하며, 드라이버 재설치는 근거가 없습니다.`
    },
    {
      q: `학습이 에포크 40에서 서버 재부팅으로 중단되었고, 마지막에 저장한 model.state_dict()만 불러와 에포크 41부터 다시 돌렸더니 loss가 한동안 크게 튀었다가 천천히 회복합니다. 옵티마이저는 새로 만들었고 스케줄러는 처음부터 시작했습니다. 가장 적절한 설명과 개선은?`,
      choices: [
        `모델 파일이 손상된 것이므로 에포크 1부터 다시 학습해야 하고, 이후에는 체크포인트 저장 주기를 더 짧게 한다`,
        `Adam의 m·v 통계와 스케줄러(warmup 포함) 상태가 초기화되어 학습률 궤적과 업데이트 스케일이 달라졌기 때문이다. 이후로는 optimizer·scheduler·scaler·epoch·best를 함께 저장하고 임시 파일에 쓴 뒤 교체하는 방식으로 저장한다`,
        `서버가 바뀌며 난수 seed가 달라졌기 때문이므로 seed를 고정하면 loss 튐이 사라진다`,
        `BatchNorm의 이동평균이 저장되지 않아서이므로 BN 통계만 따로 저장하면 해결된다`
      ],
      answer: 1,
      why: `모델 가중치는 복원했지만 Adam의 1차·2차 모멘트와 스케줄러 위치가 초기화되어, 에포크 41에서 warmup이 다시 시작되거나 lr이 엉뚱한 지점에서 출발해 loss가 튑니다. seed는 데이터 순서에만 영향을 줄 뿐 이 현상을 설명하지 못하고, BN 이동평균은 buffer로서 state_dict에 이미 들어 있으며, 파일이 손상되었다면 로드 자체가 실패했을 것입니다.`
    },
    {
      q: `학습 중 다음 오류가 났습니다.

torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 1.20 GiB. GPU 0 has a total capacity of 15.57 GiB of which 0.90 GiB is free. Of the allocated memory 10.80 GiB is allocated by PyTorch, and 2.90 GiB is reserved by PyTorch but unallocated. If reserved but unallocated memory is large try setting PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True to avoid fragmentation.

학습은 이미지 크기가 에포크마다 달라지는 멀티스케일 학습입니다. 가장 먼저 시도할 만한 것은?`,
      choices: [
        `"Tried to allocate 1.20 GiB"라는 요청 크기를 보고 현재 GPU로는 불가능하다고 판단해 즉시 더 큰 GPU로 교체한다`,
        `nvidia-smi 사용량이 높으니 torch.cuda.empty_cache()를 매 스텝 호출해 살아 있는 텐서까지 해제한다`,
        `reserved but unallocated가 2.9GiB로 크고 입력 크기가 가변이므로 단편화를 의심해 expandable_segments:True를 먼저 시도하고, 안 되면 배치·해상도 축소와 AMP·누적으로 활성값을 줄인다`,
        `allocated가 10.8GiB이므로 메모리 누수가 확정이니 DataLoader의 num_workers를 0으로 낮춘다`
      ],
      answer: 2,
      why: `메시지가 예약만 되고 쓰이지 않는 메모리 2.9GiB를 따로 보여 주고 입력 크기가 계속 바뀌므로 단편화가 유력한 용의자이며, 로그가 권하는 설정을 먼저 시험하고 안 되면 활성값 감소책으로 넘어가는 것이 합리적입니다. empty_cache는 살아 있는 텐서를 해제하지 못하고 오히려 속도만 떨어뜨리며, num_workers는 CPU 프로세스 수라 GPU 메모리와 무관하고, 할당 요청 크기만 보고 장비를 바꾸는 것은 진단 없는 비용 지출입니다.`
    },
    {
      q: `라벨 800장의 제조 불량 사진 분류에서 ResNet-18 사전학습 모델 전체를 SGD(lr 1e-2, momentum 0.9), 배치 8로 미세조정했더니 첫 에포크 이후 검증 정확도가 랜덤 수준으로 떨어지고 BN 통계가 크게 흔들립니다. 가장 적절한 수정은?`,
      choices: [
        `헤드만 먼저 학습(특징 추출기 동결)하고, 이후 마지막 블록만 1e-4 안팎의 작은 학습률(차등 학습률)로 풀며, 작은 배치에서는 동결한 BN을 eval로 고정한다`,
        `학습률을 1e-1로 키우고 에포크를 줄여 새로운 특징을 더 빨리 학습시킨다`,
        `사전학습 가중치가 과제와 맞지 않아 망가진 것이므로 버리고 무작위 초기화로 처음부터 학습한다`,
        `배치 크기를 1로 줄여 샘플마다 BN 통계를 새로 갱신하면 통계 흔들림이 사라지므로 그렇게 설정한다`
      ],
      answer: 0,
      why: `큰 학습률로 전체를 흔들면 사전학습된 특징이 첫 에포크에 망가지고 작은 배치의 BN 통계까지 불안정해지므로, 헤드부터 학습해 단계적으로 풀고 사전학습 층에는 작은 학습률을 쓰며 BN 통계를 고정하는 것이 처방입니다. 학습률을 더 키우면 악화되고, 800장으로 처음부터 학습하면 전이학습의 이점을 잃어 과적합이 더 심해지며, 배치 1은 BN 통계를 더 불안정하게 만듭니다.`
    },
    {
      q: `팀원이 과적합을 줄이겠다며 옵티마이저 설정을 다음과 같이 바꾸었습니다. SGD에서 쓰던 weight_decay 값을 그대로 옮겼습니다.

# 변경 전
opt = torch.optim.SGD(model.parameters(), lr=0.1, momentum=0.9, weight_decay=5e-4)
# 변경 후
opt = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=5e-4)

올바른 평가는?`,
      choices: [
        `두 설정의 weight_decay는 같은 L2 정규화이므로 수학적으로 같은 효과가 나고 문제가 없다`,
        `Adam의 weight_decay는 기울기에 L2 항을 더하는 방식이라 적응형 스케일링(√v 나눗셈)을 통과해 SGD 때와 같은 감쇠가 되지 않는다. decoupled 방식의 AdamW로 바꾸고 감쇠 값은 새로 탐색하는 것이 맞다`,
        `Adam은 weight_decay 인자를 지원하지 않으므로 값이 오류 없이 무시되고 정규화는 적용되지 않는다`,
        `weight_decay는 Adam에서 학습률에 곱해지는 값이라 lr이 1e-3이면 감쇠가 사실상 0이다`
      ],
      answer: 1,
      why: `SGD에서는 L2 항을 기울기에 더하는 것과 가중치를 일정 비율로 깎는 것이 같지만, Adam에서는 L2 항이 기울기와 함께 √v로 나뉘어 파라미터마다 감쇠 강도가 달라지므로 같은 값이 같은 효과를 내지 않습니다. AdamW 논문이 감쇠를 기울기 경로에서 분리한 이유가 이것입니다. Adam은 weight_decay를 무시하지 않고 L2로 적용하며, 학습률에 곱해지는 형태는 AdamW 쪽 설명입니다.`
    },
    {
      q: `고객이 납품 코드를 자기 서버에서 다시 돌렸더니 val 정확도가 리포트의 0.874와 달리 0.866이 나왔다고 항의합니다. 코드는 torch.manual_seed(0)만 설정했고, DataLoader는 num_workers=4, 증강은 numpy 기반 랜덤 크롭이며, 고객 서버의 GPU 모델도 다릅니다. 가장 적절한 대응은?`,
      choices: [
        `리포트의 0.874가 정답이므로 고객 쪽 오류라고 답하고, 고객 서버에서 다시 측정한 값은 무시하기로 한다`,
        `torch.manual_seed 하나로 모든 난수가 고정되므로 고객 쪽 환경 설정 오류라고 답한다`,
        `모든 연산을 CPU로 옮기고 DataLoader를 num_workers=0으로 고정해 납품하겠다고 제안한다`,
        `seed 3종·DataLoader generator·worker_init_fn을 적용하고 필요하면 결정적 연산도 켜되, GPU·드라이버가 다르면 비트 단위 동일은 보장되지 않으므로 여러 seed의 평균 ± 표준편차를 리포트에 넣고 수용 기준도 그 범위로 합의한다`
      ],
      answer: 3,
      why: `torch.manual_seed는 torch의 난수만 시드하므로 numpy 증강과 DataLoader 워커의 난수는 따로 고정해야 하고, 그렇게 해도 GPU 모델·드라이버·라이브러리 버전이 다르면 비트 단위 동일 결과는 약속할 수 없습니다. 그래서 환경 안에서의 재현 장치와 환경 간의 통계적 재현(평균 ± 표준편차)을 함께 제시하는 것이 정직하고 실용적입니다. "고객 오류"로 몰거나 성능을 포기하는 CPU 고정은 근거 없는 대응입니다.`
    }
  ],
  refs: [
    {
      title: `Neural Networks: Zero to Hero (Andrej Karpathy)`,
      url: `https://karpathy.ai/zero-to-hero.html`,
      kind: `course`,
      why: `micrograd 역전파부터 makemore(활성값·BatchNorm·WaveNet), GPT, 토크나이저까지 8강 약 14.5시간. 레슨 2·3·9를 영상과 함께 직접 따라 치며 확인하는 핵심 교재이고, 코드를 보지 않고 먼저 시도한 뒤 비교하는 방식이 효과적입니다.`
    },
    {
      title: `Practical Deep Learning for Coders (fast.ai)`,
      url: `https://course.fast.ai/`,
      kind: `course`,
      why: `Part 1은 약 90분짜리 9강으로 컴퓨터 비전·NLP·탭 데이터·협업 필터링·웹앱 배포를 다루며 전이학습과 학습률 탐색(lr_find) 감각을 익히기 좋습니다. 2026-11 열람 시점의 페이지는 2022판 Part 1으로 표기되어 있고 더 최신 판이 있는지는 확인하지 못했습니다.`
    },
    {
      title: `Dive into Deep Learning (d2l.ai)`,
      url: `https://d2l.ai/`,
      kind: `book`,
      why: `수식·코드·토론이 결합된 대화형 교재로, 영문판(2026-11 열람 시 v1.0.3 표기)이 PyTorch 구현을 제공합니다. CNN·최적화·정규화 장을 선택해서 읽는 용도로 좋습니다. 한국어판(ko.d2l.ai)은 영문판 0.5.0 기반이고 열람한 페이지에서 Gluon(MXNet)만 언급되고 PyTorch는 보이지 않으므로, PyTorch 코드는 영문판으로 읽으세요. 이미지 쪽 심화는 Stanford CS231n 강의를 이어서 보세요.`
    },
    {
      title: `PyTorch 문서: Autograd mechanics`,
      url: `https://docs.pytorch.org/docs/2.15/notes/autograd.html`,
      kind: `doc`,
      why: `requires_grad가 기록되는 조건, no_grad와 inference_mode의 차이(inference mode에서 만든 텐서는 나중에 autograd 계산에 쓸 수 없음), in-place 연산의 버전 카운터를 공식 설명으로 확인합니다. 열람한 문서는 2.15판입니다(2026-11 기준 stable 주소가 이 판으로 이어짐).`
    },
    {
      title: `PyTorch 문서: Reproducibility`,
      url: `https://docs.pytorch.org/docs/2.15/notes/randomness.html`,
      kind: `doc`,
      why: `manual_seed, use_deterministic_algorithms, cudnn.benchmark·deterministic, DataLoader의 worker_init_fn과 generator 예제를 한곳에서 볼 수 있습니다. 재현성 약속의 범위를 정할 때 근거로 삼습니다(2026-11 기준 2.15판).`
    },
    {
      title: `PyTorch 문서: Automatic Mixed Precision package`,
      url: `https://docs.pytorch.org/docs/2.15/amp.html`,
      kind: `doc`,
      why: `autocast의 사용 범위(forward와 loss만), fp16·bf16 선택, GradScaler의 기본값과 API 이름(torch.amp.GradScaler), autocast가 저정밀로 실행하는 연산 목록을 확인합니다(2026-11 기준 2.15판).`
    },
    {
      title: `PyTorch 문서: CUDA semantics (메모리 관리)`,
      url: `https://docs.pytorch.org/docs/2.15/notes/cuda.html`,
      kind: `doc`,
      why: `캐싱 할당자(nvidia-smi에 캐시가 포함되어 보임), memory_allocated와 memory_reserved의 차이, empty_cache가 살아 있는 텐서를 해제하지 못한다는 점, PYTORCH_ALLOC_CONF(옛 이름 PYTORCH_CUDA_ALLOC_CONF는 별칭)의 expandable_segments 설명을 OOM 진단의 기준으로 삼습니다. 이 페이지의 후반부는 전부 읽지 못했으므로 필요한 항목은 직접 확인하세요(2026-11 기준 2.15판).`
    },
    {
      title: `PyTorch 문서: torch.utils.data`,
      url: `https://docs.pytorch.org/docs/2.15/data.html`,
      kind: `doc`,
      why: `DataLoader의 num_workers·pin_memory·persistent_workers·prefetch_factor·drop_last 기본값과, 워커마다 Python 객체가 복제되어 메모리가 불어나는 문제에 대한 조언을 확인합니다(2026-11 기준 2.15판, 후반부 일부는 읽지 못함).`
    },
    {
      title: `PyTorch 튜토리얼: Transfer Learning for Computer Vision`,
      url: `https://docs.pytorch.org/tutorials/beginner/transfer_learning_tutorial.html`,
      kind: `doc`,
      why: `특징 추출기 방식과 전체 미세조정 방식을 개미·벌 분류로 비교하는 공식 예제입니다. 새 헤드 교체, requires_grad 동결, ImageNet 정규화 상수, StepLR 사용을 코드로 확인할 수 있습니다.`
    },
    {
      title: `Decoupled Weight Decay Regularization (AdamW), Loshchilov & Hutter`,
      url: `https://arxiv.org/abs/1711.05101`,
      kind: `paper`,
      why: `SGD에서는 같은 L2 정규화와 weight decay가 Adam에서는 다르다는 점을 보이고 감쇠를 기울기 업데이트와 분리하는 방식을 제안합니다(ICLR 2019). 레슨 4의 AdamW 선택 근거이며 Adam 원 논문(arXiv 1412.6980)도 함께 알아 두면 좋습니다.`
    },
    {
      title: `Batch Normalization: Accelerating Deep Network Training (Ioffe & Szegedy)`,
      url: `https://arxiv.org/abs/1502.03167`,
      kind: `paper`,
      why: `미니배치 통계로 층 입력을 정규화해 더 큰 학습률과 덜 까다로운 초기화를 가능하게 한다는 원 논문입니다. 학습 때와 추론 때의 통계 차이를 이해하는 출발점입니다(venue 미표기).`
    },
    {
      title: `Deep Residual Learning for Image Recognition (ResNet), He 외`,
      url: `https://arxiv.org/abs/1512.03385`,
      kind: `paper`,
      why: `각 층이 입력 대비 잔차를 학습하게 해 ImageNet에서 152층까지 깊이를 늘린 논문입니다. skip connection은 Transformer 블록에도 그대로 쓰이므로 "깊어져도 학습되게 하는 장치"로 기억합니다.`
    },
    {
      title: `Efficient Estimation of Word Representations in Vector Space (word2vec), Mikolov 외`,
      url: `https://arxiv.org/abs/1301.3781`,
      kind: `paper`,
      why: `단어를 연속 벡터로 싸게 학습하는 두 모델 구조를 제안하고 16억 단어를 하루 안에 학습했다고 보고합니다. "의미를 벡터 공간의 거리로 표현한다"는 임베딩의 출발점입니다.`
    },
    {
      title: `Neural Machine Translation by Jointly Learning to Align and Translate (Bahdanau 외)`,
      url: `https://arxiv.org/abs/1409.0473`,
      kind: `paper`,
      why: `문장을 고정 길이 벡터 하나로 압축하는 seq2seq의 한계를 지적하고 관련 위치를 소프트하게 탐색하는 방식을 제안했습니다(ICLR 2015). 오늘날 attention의 직접적인 조상이며 다음 모듈 Transformer의 배경입니다.`
    }
  ],
  gigs: [
    `"딥러닝으로 해 주세요"라는 문의를 받으면 견적 전에 확인합니다: 데이터 종류(표·이미지·텍스트), 라벨 수와 품질, 오분류 비용과 평가 지표, 추론 환경(CPU·GPU·엣지, 지연·모델 크기 상한), 데이터 반출·개인정보·저작권, 지금 쓰는 방식(규칙·사람)의 성능. 표 데이터라면 규칙·GBDT baseline을 먼저 제안하고 신경망은 비교 실험 항목으로 견적에 넣습니다.`,
    `견적은 항목으로 쪼갭니다: 데이터 정리·감사, baseline 사다리, 전이학습·실험, 오류 분석·리포트, 문서·인수인계. 소규모 이미지 분류 PoC는 대략 7~12 작업일 정도로 보는 것이 필자의 추정입니다(※ 데이터 상태와 라벨 품질에 따라 크게 달라짐). 라벨 수정·재학습 횟수에 상한을 두고 초과분은 별도 견적으로 합니다.`,
    `컴퓨팅 비용은 별도 항목으로 다룹니다. 무료 노트북 환경의 사양·한도·세션 제한과 클라우드 GPU 시간당 가격은 수시로 바뀌므로 견적 시점에 다시 확인하고(이 모듈은 가격·한도 수치를 일부러 적지 않았습니다), 무료 환경의 가용성에 의존하는 일정은 위험으로 적어 둡니다. "실험 횟수 × 시간"으로 상한을 정하고 실비 정산이나 포함 범위를 계약에 명시합니다. 고객 데이터를 외부 클라우드나 실험 추적 SaaS에 올리는 일은 사전 동의가 필요합니다.`,
    `수용 기준은 "정확도 N% 보장"이 아니라 시험 구간·지표(macro-F1, 클래스별 재현율)·baseline 대비 개선·변동(3~5 seed의 평균 ± 표준편차)·배포 제약(지연, 모델 크기)으로 씁니다. 재현성은 "같은 환경과 같은 seed에서는 같은 결과, 환경이 바뀌면 통계적 범위 안에서 재현"으로만 약속합니다.`,
    `납품물 체크리스트: 재현 저장소(환경 고정, seed, 3개 명령), 학습·추론 스크립트(전처리 공유), 가중치 파일과 해시, 평가 리포트(baseline·클래스별·변동), 모델 카드(데이터 출처, 라이선스, 한계, 배경 편향), 실패 실험을 포함한 실험 로그, 재학습 절차와 모니터링 제안. 마지막 항목들이 유지보수 계약으로 이어지는 연결 고리입니다.`,
    `전형적인 함정: 라벨 오류와 클래스 불균형이 점수의 천장을 정하는데 감사를 건너뜀, 사진 단위 분할의 그룹 누수, "데이터가 더 있으면 오를 것"이라는 무한 반복(라벨링 예산과 반복 횟수를 합의), 개발과 서비스의 전처리 불일치, 사전학습 가중치·학습 데이터의 라이선스, 서비스 입력의 분포 이동(조명, 앱 압축), "최신 거대 모델이면 95%"라는 기대.`,
    `범위를 나눕니다: 서빙·API·모니터링(MLOps), LLM 파인튜닝과 대규모 사전학습, 엣지·모바일 최적화(양자화, ONNX)는 별도 모듈과 별도 견적입니다. 소규모 라벨(수천 장 이하)에서 처음부터 학습하자는 요구는 전이학습의 비교 결과로 설득하세요(※ 경험칙).`
  ]
};
