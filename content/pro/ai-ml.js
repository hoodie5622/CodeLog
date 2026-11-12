(window.PRO_MODULES = window.PRO_MODULES || {})["ai-ml"] = {
  id: "ai-ml",
  summary: `표 형태 데이터의 예측 과제를 문제 정의·분할·누수 점검·지표 설계·baseline 사다리·GBDT·해석까지 거쳐, 규칙 baseline 대비 개선을 비용으로 환산한 평가 리포트와 모델 카드로 납품할 수 있다.`,
  hours: 90,
  goals: [
    `사업 문제를 타깃·예측 시점·지평·행동과 비용·성공 기준 다섯 가지 질문으로 정의하고, 상수·규칙·선형 baseline 사다리를 먼저 만들어 복잡한 모델의 가치를 비용으로 환산할 수 있다.`,
    `선형·로지스틱 회귀의 손실과 L1/L2 정규화, 편향-분산 관계를 학습·검증 곡선으로 진단하고 정규화 강도 C 같은 복잡도 파라미터를 고를 수 있다.`,
    `무작위·계층·그룹·시간(gap 포함) 분할 중 운영 상황과 라벨 지평에 맞는 분할을 설계하고, Pipeline으로 전처리 누수를 구조적으로 막을 수 있다.`,
    `누수 다섯 유형(전처리·타깃·시간·그룹·튜닝)의 탐지 신호를 알고, 일부러 누수를 심은 데이터에서 부풀려진 점수와 정직한 점수의 차이를 측정할 수 있다.`,
    `분류(정밀도·재현율·PR-AUC·precision@k)와 예측(MAE·WAPE·MASE) 지표를 상황에 맞게 고르고, 비용 행렬에서 임계값을 계산하며 표본 수에 따른 불확실성 구간을 함께 보고할 수 있다.`,
    `결정 트리·랜덤포레스트·GBDT의 동작 원리를 직접 짠 미니 부스팅으로 설명하고, XGBoost·LightGBM·HistGradientBoosting의 핵심 파라미터를 조기 종료와 함께 조정할 수 있다.`,
    `예측 시점 기준(as-of) 집계·시차·범주형 인코딩(타깃 인코딩 교차적합 포함) 피처를 만들고, 누수와 학습-서빙 스큐를 막는 단위 테스트를 작성할 수 있다.`,
    `불균형·확률 보정·분포 이동(adversarial validation, PSI)을 다루고, permutation importance·SHAP·오류 분석을 근거로 평가 리포트와 모델 카드를 고객에게 납품할 수 있다.`
  ],
  lessons: [
    {
      title: `ML 프로젝트의 멘탈 모델: 문제 정의·지표·baseline이 모델보다 먼저다`,
      body: `머신러닝 프로젝트가 실패하는 가장 흔한 이유는 알고리즘 선택이 아니라, 무엇을 언제 예측해서 어떤 결정을 바꿀지 정하지 않은 채 모델부터 만들기 때문입니다. 이 모듈은 고전 머신러닝(표 형태 데이터의 지도학습)을 "평가를 믿을 수 있게 만드는 기술"로 다룹니다. 이전 모듈에서 익힌 NumPy·pandas·재현 가능한 환경이 도구라면, 여기서는 그 도구로 거짓 점수를 걸러 내는 규율을 배웁니다. 수요예측·이탈 예측·이상 탐지 외주의 상당수는 딥러닝이 아니라 규칙과 통계 baseline, 그리고 트리 앙상블(GBDT)에서 끝납니다.

### 지도학습의 정체

지도학습은 입력 x로 타깃 y를 맞히는 함수 f를 데이터에서 고르는 일입니다. 손실 함수(제곱오차, 로그 손실 등)를 정하고 훈련 데이터의 평균 손실을 줄이는 f를 찾는 것을 경험적 위험 최소화라고 합니다. 문제는 우리가 정말 줄이고 싶은 것이 훈련 데이터의 평균 손실이 아니라 "아직 보지 못한 미래 데이터의 기대 손실"이라는 점입니다. 용량이 큰 모델은 훈련 손실을 거의 0까지 내릴 수 있지만, 그것은 패턴이 아니라 외운 결과일 수 있습니다. 그래서 모든 평가 설계는 한 문장으로 요약됩니다. 훈련에 쓰지 않았고 운영 상황과 닮은 데이터로 잰다. 이 문장이 깨지는 모든 경로(누수, 분포 이동)가 이후 레슨의 주제입니다.

### 문제 정의의 다섯 가지 질문

고객이 "이탈 예측 AI를 만들어 주세요"라고 하면 다음을 문장으로 확정합니다.

1. 타깃: 무엇이 1인가. "해지"인가 "30일 무결제"인가. 정의가 바뀌면 이탈률이 5%에서 12%로도 바뀝니다(예시).
2. 예측 시점: 언제(매월 1일) 예측하는가. 피처는 그 시점에 알 수 있는 정보만 써야 합니다.
3. 지평: 시점 이후 얼마(30일) 안의 사건을 맞히는가. 지평은 레슨 3에서 훈련 구간 끝을 비우는 gap의 크기를 정합니다.
4. 행동과 비용: 예측으로 누가 무엇을 하는가. 쿠폰 1건 발송 비용 1,000원, 월 발송 한도 2,000건처럼 숫자로 받습니다.
5. 성공 기준: 지금 쓰는 방식(규칙, 담당자의 감)보다 얼마나 나아야 하는가.

Google의 Rules of Machine Learning은 ML 없이 먼저 출시해 보라고(Rule #1), 평가 지표를 일찍 설계하라고(Rule #2), 첫 모델은 단순하게 만들라고(Rule #4) 말합니다(2026-11 열람, 페이지에 날짜 미표기). 외주에서는 이 정신을 baseline 사다리로 구현합니다.

### baseline 사다리

| 단계 | 예 | 의미 |
| 1 상수 | 전부 비이탈, 훈련 평균값 | 이보다 못하면 버그 |
| 2 규칙·통계 | 마지막 주문 후 N일, 지난주 같은 요일 판매량 | 현업이 이미 쓰는 수준, 진짜 경쟁 상대 |
| 3 단순 모델 | 표준화 + 로지스틱·선형 회귀 | 해석 가능, 복잡 모델의 기준선 |
| 4 복잡 모델 | GBDT 등 | 3단계 대비 이득이 있을 때만 채택 |

이탈률이 5%라면 1단계의 정확도가 이미 95%입니다. 정확도로는 아무것도 가를 수 없으므로 2단계 규칙의 순위 성능(PR-AUC 등)이 진짜 기준이 됩니다. 모델이 규칙을 못 이기거나 이득이 비용에 못 미치면 모델을 넣지 않는 것이 정답입니다. 이 결론을 근거와 함께 보고하는 것이 신뢰를 쌓는 전문가의 태도입니다.

### 현장에서는 이렇게 나타난다

크몽의 데이터·ML·DL 카테고리 안내(2026-11 열람)는 의뢰 절차를 데이터 전달 → EDA → 모델 → 평가 → 배포(선택)로 소개하고 재현 코드·전처리 파이프라인·평가 리포트를 요구하라고 권합니다. 첫 미팅에서 위 다섯 가지 질문과 "이 데이터는 어느 시점의 스냅샷인가"를 묻는 것이 견적의 불확실성을 가장 많이 줄입니다. 아래 코드는 사다리 1~3단계를 한 화면에서 비교하는 최소 골격입니다. 여기서는 설명을 위해 무작위 분할을 썼지만, 시간 구조가 있는 실제 데이터는 레슨 3의 방식으로 나눠야 합니다.`,
      code: `import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score
from sklearn.model_selection import train_test_split

rng = np.random.default_rng(0)
n = 20000
df = pd.DataFrame({
    "days_since_last_order": rng.integers(0, 120, n),
    "orders_90d": rng.poisson(3, n),
})
logit = -4.0 + 0.03 * df["days_since_last_order"].to_numpy() - 0.25 * df["orders_90d"].to_numpy()
df["churn"] = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)

X, y = df[["days_since_last_order", "orders_90d"]], df["churn"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)

print("이탈률", round(y.mean(), 3))
print("전부 비이탈로 찍은 정확도", round(1 - y_te.mean(), 3))

scores = {
    "1 상수(prior)": DummyClassifier(strategy="prior").fit(X_tr, y_tr).predict_proba(X_te)[:, 1],
    "2 규칙: 마지막 주문 후 일수": X_te["days_since_last_order"].to_numpy(),
    "3 로지스틱": LogisticRegression(max_iter=1000).fit(X_tr, y_tr).predict_proba(X_te)[:, 1],
}
for name, s in scores.items():
    print(f"{name:<24} PR-AUC={average_precision_score(y_te, s):.3f}")`,
      codeLang: `python`,
      key: [
        `모든 ML 프로젝트는 타깃·예측 시점·지평·행동과 비용·성공 기준 다섯 가지를 문장으로 확정한 뒤 시작한다.`,
        `일반화 오차(처음 보는 데이터에서의 기대 손실)가 목표이고, 훈련 손실은 목표가 아니다.`,
        `baseline 사다리(상수 → 규칙 → 선형 → GBDT)에서 위 단계를 이기지 못하면 아래 단계를 쓰지 않는다.`,
        `불균형 문제에서 정확도는 변별력이 없다. 무정보 기준선(양성 비율)을 먼저 알아 둔다.`
      ],
      pitfalls: [
        `타깃 정의(해지 vs 휴면)를 확정하지 않고 모델부터 만들어, 납품 뒤 "우리가 말한 이탈이 아니다"라는 재작업을 부른다.`,
        `규칙 baseline 없이 "AUC 0.78"만 보고해서, 현업의 단순 규칙이 이미 0.74를 내는 사실을 고객이 나중에 알게 된다.`,
        `예측이 곧 행동 효과라고 가정한다. 이탈 확률이 높은 사람에게 쿠폰을 보내면 줄어든다는 것은 별도의 인과 문제다.`
      ]
    },
    {
      title: `선형·로지스틱 회귀, 정규화, 편향-분산: 가장 강한 baseline`,
      body: `선형 모델은 구식이 아니라 모든 평가의 기준자이자 설명 도구입니다. 점수가 비슷하다면 선형 모델이 설명·배포·감사 면에서 이기는 일이 흔합니다. 내부 동작을 알고 있어야 정규화와 과적합을 말로 설명할 수 있습니다.

### 손실과 최적화

선형 회귀는 예측값을 w·x + b로 두고 제곱오차의 평균을 최소화합니다(정규방정식 또는 경사하강). 로지스틱 회귀는 선형 점수 z = w·x + b를 시그모이드 1/(1+e^-z)로 확률로 바꾸고, 정답 라벨의 로그 확률을 최대화합니다. 이것이 베르누이 분포의 최대우도이고 곧 로그 손실 최소화입니다. 로그 손실은 확신을 갖고 틀린 예측을 크게 벌주기 때문에 "확률의 품질"을 직접 겨냥합니다. 일 판매량처럼 0 이상의 정수를 예측할 때는 로그 링크를 쓰는 포아송 회귀 같은 일반화선형모형(GLM)이 자연스럽습니다. 예측이 음수가 되지 않고 "주말에는 1.3배" 같은 곱셈 효과를 표현할 수 있습니다.

### 편향-분산 트레이드오프

기대 제곱오차는 편향의 제곱, 분산, 줄일 수 없는 노이즈의 합으로 분해됩니다. 모델이 너무 단순하면 편향이 커서 훈련·검증 점수가 모두 나쁘고, 너무 복잡하면 분산이 커서 훈련 점수는 높고 검증 점수는 낮아 간격이 벌어집니다. 진단은 학습 곡선(데이터 양에 따른 점수)과 검증 곡선(복잡도에 따른 점수)으로 합니다. 예를 들어 훈련 AUC 0.99, 검증 0.71이면 분산 문제이고 처방은 정규화 강화·피처 정리·데이터 보강입니다. 훈련 0.66, 검증 0.64이면 편향 문제이고 처방은 피처 추가나 비선형 모델입니다. 처방이 정반대이므로 진단이 먼저입니다.

### L1·L2 정규화와 C

L2(ridge)는 계수의 제곱합에 벌점을 주어 계수를 고르게 줄이고, L1(lasso)은 절댓값 합에 벌점을 주어 일부 계수를 정확히 0으로 만들어 변수 선택 효과를 냅니다. 베이지안으로 보면 L2는 계수에 가우시안 사전분포를 두는 MAP 추정과 같습니다. scikit-learn의 ‹LogisticRegression›에서 ‹C›는 정규화 강도의 역수입니다. ‹C›가 작을수록 강하게 규제하고 기본값은 1.0이며, 문서가 굵게 강조하듯 기본 설정부터 L2 정규화가 켜져 있어서 "정규화 없는 baseline"이라고 착각하기 쉽습니다. API도 바뀌었습니다(2026-11, 1.9.1 문서 기준). ‹penalty› 인자는 1.8에서 deprecated 되어 1.10에서 제거될 예정이고, L2는 ‹l1_ratio=0›(기본), L1은 ‹l1_ratio=1›과 liblinear 또는 saga solver, 무정규화는 ‹C=np.inf›로 씁니다. 예전 튜토리얼의 ‹penalty="l1"› 코드는 경고가 나올 수 있습니다. 벌점이 계수 크기에 걸리므로 피처의 단위에 결과가 좌우됩니다. 그래서 표준화가 필수이고, 표준화의 평균·표준편차는 훈련 fold에서만 계산해야 하므로 반드시 Pipeline 안에 넣습니다. 이 사실이 레슨 3의 누수 논의로 이어집니다.

### 계수 해석의 한계

표준화한 계수는 크기를 비교할 수 있지만, 상관이 높은 피처가 있으면 부호가 뒤집히거나 표본에 따라 크게 흔들립니다(다중공선성). 계수는 "다른 피처를 고정했을 때의 연관"이지 인과가 아닙니다. 고객에게 "이 변수가 이탈을 일으킨다"고 말하는 순간 모델이 보장하지 않는 주장을 하게 됩니다.

### 현장에서는 이렇게 나타난다

수요예측에서 요일·공휴일·프로모션 더미와 전주 판매량을 넣은 선형·포아송 모델이 GBDT와 거의 같은 WAPE를 내는 일이 흔합니다. 이때 선형 모델은 학습이 수 초이고 계수를 현업에 설명할 수 있어 유지보수 비용이 낮습니다. 반대로 임계값 효과나 피처 간 상호작용이 강한 문제에서는 트리 모델이 크게 이깁니다. 어느 쪽인지는 사다리의 3단계와 4단계를 같은 분할·같은 지표로 비교해야만 알 수 있습니다. 아래 코드는 정규화 강도 ‹C›를 바꾸며 훈련 점수와 검증 점수의 간격을 보는 검증 곡선입니다.`,
      code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, validation_curve
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = make_classification(n_samples=600, n_features=60, n_informative=6,
                           n_redundant=4, weights=[0.8, 0.2], random_state=0)

# 스케일러를 Pipeline 안에 넣어 fold마다 훈련 데이터로만 fit 되게 한다
model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))
Cs = np.logspace(-4, 2, 7)        # 1e-4 ... 1e2 : 작을수록 강한 정규화
cv = StratifiedKFold(5, shuffle=True, random_state=0)

train_sc, valid_sc = validation_curve(
    model, X, y, param_name="logisticregression__C", param_range=Cs,
    cv=cv, scoring="roc_auc")

for c, a, b in zip(Cs, train_sc.mean(axis=1), valid_sc.mean(axis=1)):
    print(f"C={c:9.4f}  train={a:.3f}  valid={b:.3f}  gap={a - b:+.3f}")

best = Cs[valid_sc.mean(axis=1).argmax()]
print("검증 AUC가 가장 높은 C:", best)
# 읽는 법: C가 크면 gap이 커지는지(분산), C가 너무 작으면 둘 다 낮은지(편향) 확인한다.`,
      codeLang: `python`,
      key: [
        `로지스틱 회귀 = 선형 점수 + 시그모이드 + 로그 손실(최대우도). 로그 손실은 확신하며 틀린 예측을 크게 벌준다.`,
        `훈련 점수와 검증 점수의 간격이 크면 분산(과적합), 둘 다 낮으면 편향(과소적합)이며 처방이 정반대다.`,
        `L2는 계수를 고르게 줄이고 L1은 일부를 0으로 만든다. sklearn의 C는 강도의 역수라 작을수록 강하다.`,
        `정규화 모델은 피처 단위에 민감하므로 표준화가 필수이고, 표준화는 Pipeline 안에서 훈련 fold로만 fit 한다.`
      ],
      pitfalls: [
        `C를 키우면 정규화가 강해진다고 오해해 방향을 거꾸로 튜닝한다.`,
        `표준화하지 않은 채 L1/L2를 걸어 단위가 큰 피처만 살아남게 만든다.`,
        `상관 높은 피처의 계수 부호를 보고 "이 요인이 줄이면 이탈이 늘어난다"고 인과로 보고한다.`,
        `같은 CV로 C를 고른 뒤 그 CV 점수를 최종 성능으로 보고한다. 선택에 쓴 점수는 낙관적이다.`
      ]
    },
    {
      title: `데이터 분할·교차검증·누수: 점수를 믿을 수 있는가`,
      body: `모델 점수를 믿을 수 있는지는 거의 전적으로 "평가를 어떻게 나눴는가"에 달려 있습니다. 분할은 데이터를 자르는 기술이 아니라 운영에서 모델이 처할 상황을 흉내 내는 시뮬레이션입니다. 운영의 모델은 과거 데이터로 학습되어 아직 일어나지 않은 미래의 새 행에 적용됩니다. 평가 분할이 이 상황과 다르면 점수는 부풀려집니다. 이 레슨이 이 모듈에서 가장 값비싼 레슨입니다.

### 무작위 분할이 정직한 조건

무작위 분할과 일반 K-겹 교차검증은 행들이 독립이고 동일 분포(i.i.d.)라는 가정 위에서만 정직합니다. scikit-learn 교차검증 문서(2026-11 열람, 문서 버전 1.9.1)도 이 가정이 현실에서 드물게 성립한다고 적고, 시간 의존 데이터에는 시계열 분할을, 그룹이 있는 데이터에는 그룹 분할을 권합니다. 외주 데이터에서는 세 가지 방식으로 깨집니다.

- 시간: 시간순 데이터를 섞으면 검증 행 바로 옆 날짜가 훈련에 들어가고, 시차·이동평균 피처가 그 이웃 정보를 그대로 전달합니다.
- 그룹: 같은 고객·기기·환자의 여러 행이 양쪽에 걸치면 모델은 패턴이 아니라 "그 고객"을 외웁니다.
- 중복: 조인 실수나 크롤링으로 같은 행이 복제되면 훈련과 검증에 똑같은 행이 존재합니다.

### 분할 도구 고르기

- StratifiedKFold: 양성이 드물 때 fold마다 클래스 비율을 유지합니다. 다만 문서는 계층화가 fold 간 지표 변동폭을 인위적으로 줄일 수 있다고 경고합니다.
- GroupKFold, StratifiedGroupKFold: 같은 그룹은 한 fold에만 들어갑니다. 후자의 배정은 탐욕적이라 최적이 아닐 수 있다고 문서가 밝힙니다.
- TimeSeriesSplit: 앞 구간으로 훈련하고 바로 뒤 구간으로 검증하며 훈련 구간이 점점 커집니다. ‹gap›은 각 훈련 세트의 끝에서 제거할 샘플 수입니다(API 문서 1.9.1 기준 0.24에서 추가). 이 도구는 행 번호 순서로 자르므로, 고객×월 패널처럼 같은 날짜의 행이 여러 개면 날짜 단위 컷오프를 직접 구현해야 합니다(레슨 9, 랩 2).

gap이 필요한 이유는 라벨의 지평입니다. 라벨이 "앞으로 30일 내 이탈"이면 훈련 구간 마지막 30일 행의 라벨은 검증 구간에서 벌어진 사건으로 정해집니다. 이 겹침을 제거(purge)하지 않으면 훈련이 검증 기간의 정보를 엿봅니다.

### 누수의 다섯 유형

| 유형 | 전형적 사례 | 막는 방법 |
| 전처리 | 전체 데이터로 스케일러·대치·특징 선택을 fit | Pipeline으로 fold 안에서 fit |
| 타깃 | 해지 사유·환불액처럼 결과 뒤에 채워지는 컬럼 | 컬럼별 "채워지는 시점" 표 |
| 시간 | 미래를 포함한 이동평균, 시간 데이터의 무작위 분할 | as-of 피처, 시간 분할 + gap |
| 그룹·중복 | 같은 고객 여러 행이 양쪽에 존재 | GroupKFold, 중복 제거 |
| 튜닝 | 테스트 점수를 보며 모델·임계값을 반복 선택 | 테스트는 한 번만, nested CV |

scikit-learn의 common pitfalls 문서에는 순수 잡음 특징 1만 개와 무작위 라벨로 전체 데이터에서 상위 25개를 고른 뒤 분할했더니 테스트 정확도 0.76이 나오고(기대 0.5), 분할 뒤 훈련 데이터로만 고르면 0.5가 나온 예가 있습니다. "전처리는 fold 안에서"가 취향이 아닌 이유입니다.

### 데이터 세 몫 규칙

훈련(학습), 검증(조기 종료·하이퍼파라미터·임계값 선택), 테스트(마지막에 한 번)로 나눕니다. 테스트 점수를 보고 모델을 고치는 순간 테스트는 검증이 됩니다. 탐색이 많으면 nested CV(바깥은 평가, 안쪽은 튜닝)나 별도 보관한 holdout을 씁니다.

### 현장에서는 이렇게 나타난다

고객 CSV의 모든 컬럼에 "이 값은 언제 채워지는가"를 적은 표를 만드세요. 누수 신호는 (1) 기대보다 지나치게 좋은 점수, (2) 단일 피처만으로 AUC 0.9 이상, (3) 무작위 분할 대비 시간 분할에서 점수 급락, (4) 중요도 상위가 ID·일련번호·날짜 파생 컬럼인 경우입니다. 하나라도 켜지면 모델링을 멈추고 데이터를 거슬러 올라가세요.`,
      code: `import numpy as np
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, TimeSeriesSplit, cross_val_score
from sklearn.pipeline import make_pipeline

rng = np.random.default_rng(0)
X = rng.normal(size=(120, 3000))          # 순수 잡음 특징
y = rng.integers(0, 2, size=120)          # 특징과 무관한 라벨 -> 정직한 AUC는 0.5 근처
cv = StratifiedKFold(5, shuffle=True, random_state=0)
clf = LogisticRegression(max_iter=1000)

# 잘못된 방식: 전체 데이터로 특징을 고른 뒤 교차검증 (라벨이 선택에 새어 들어감)
X_sel = SelectKBest(f_classif, k=20).fit_transform(X, y)
leaky = cross_val_score(clf, X_sel, y, cv=cv, scoring="roc_auc").mean()

# 올바른 방식: 특징 선택도 fold 안의 훈련 데이터로만 수행
pipe = make_pipeline(SelectKBest(f_classif, k=20), clf)
honest = cross_val_score(pipe, X, y, cv=cv, scoring="roc_auc").mean()
print(f"누수 AUC={leaky:.2f}   정직한 AUC={honest:.2f}")   # 누수 쪽이 0.5보다 훨씬 높게 나온다

# 시간 분할: 라벨 지평 2칸만큼 훈련 끝을 비운다(gap)
tscv = TimeSeriesSplit(n_splits=3, test_size=2, gap=2)
for tr, te in tscv.split(np.arange(12)):
    print("train", tr.tolist(), "test", te.tolist())
# train [0,1,2,3] test [6,7] / train [0..5] test [8,9] / train [0..7] test [10,11]`,
      codeLang: `python`,
      key: [
        `평가 분할은 운영 상황의 시뮬레이션이다. 시간이 있으면 시간 분할, 같은 주체가 반복되면 그룹 분할, 희귀 클래스면 계층화를 쓴다.`,
        `라벨 지평만큼 훈련 구간 끝을 비우는 gap(purge)이 없으면 훈련이 검증 기간의 사건을 엿본다.`,
        `전처리·특징 선택·대치는 모두 fold 안에서 fit 해야 하고, 그것을 구조적으로 보장하는 도구가 Pipeline이다.`,
        `누수 5유형: 전처리·타깃·시간·그룹/중복·튜닝. 너무 좋은 점수는 먼저 누수를 의심한다.`,
        `테스트는 마지막에 한 번만 본다. 보고 고치는 순간 검증 세트가 된다.`
      ],
      pitfalls: [
        `시계열 데이터를 KFold(shuffle=True)로 평가해 WAPE 8%를 보고했는데 운영 첫 달 21%가 나온다.`,
        `lag·rolling 피처를 만들 때 shift 없이 현재 행을 평균에 포함해 정답의 일부를 피처로 넣는다.`,
        `cross_val_predict로 얻은 예측을 모아 일반화 성능이라고 보고한다(문서가 적절한 일반화 오차 측정이 아니라고 경고).`,
        `StratifiedKFold만 쓰고 같은 고객의 여러 행이 양쪽 fold에 걸쳐 있는 것을 확인하지 않는다.`
      ]
    },
    {
      title: `평가 지표: 비즈니스 비용과 연결하고 불확실성을 함께 보고하기`,
      body: `지표는 비즈니스 비용의 대리입니다. 모델이 "좋다"는 말은 지표를 정하기 전에는 의미가 없습니다. 지표를 고르는 순서는 먼저 결정과 비용을 확인하고, 그 결정이 순위에 의존하는지 임계값에 의존하는지 판단한 뒤 지표를 고르는 것입니다.

### 분류: 임계값 이전과 이후

모델은 보통 확률(점수)을 내고, 결정은 임계값으로 점수를 0/1로 바꿔서 합니다. 임계값을 정하기 전에 보는 지표는 점수의 순위 품질입니다. 임계값을 정한 뒤의 지표는 혼동행렬에서 나옵니다.

| 지표 | 의미 | 쓰는 상황과 주의 |
| 정확도 | 맞힌 비율 | 이탈률 5%면 전부 아니오가 95%, 불균형에서는 변별력 없음 |
| 정밀도 | 양성 예측 중 진짜 양성 | 오경보 비용이 클 때 |
| 재현율 | 진짜 양성 중 잡은 비율 | 놓침 비용이 클 때 |
| F1 | 정밀도·재현율의 조화평균 | 비용이 대칭일 때만 합리적 |
| ROC-AUC | 무작위 양성이 음성보다 높게 점수받을 확률 | 순위 전반, 양성이 아주 드물면 낙관적 |
| PR-AUC(average precision) | 임계값별 정밀도를 재현율 증가분으로 가중해 합한 값 | 드문 양성, 무정보 기준선이 양성 비율 |
| precision@k | 상위 k건의 정밀도 | 월 2,000건 발송 같은 예산 고정 |

scikit-learn 문서(2026-11 열람)는 average precision이 PR 곡선을 선형 보간하지 않는다는 점을 밝히며, 선형 보간(사다리꼴)은 지나치게 낙관적일 수 있다고 경고합니다. 또 balanced accuracy는 클래스별 재현율의 평균이라 무정보 분류기가 1/클래스 수로 내려갑니다.

### 비용 행렬에서 임계값 계산하기

쿠폰 1건 비용이 1,000원이고, 이탈 고객에게 보냈을 때 기대 절감액(방지 성공률 20% × 고객 가치 30,000원)이 6,000원이라고 가정합니다(예시). 이탈 확률 p인 고객에게 보낼 때의 기대 이익은 p × 6,000 − 1,000이며, 이것이 0 이상이 되는 p는 1/6, 약 0.167입니다. 기본값 0.5로 자르면 이익이 나는 대상을 대부분 놓칩니다. 단 이 계산은 확률이 보정되어 있어야 의미가 있습니다(레슨 7).

### 회귀와 예측 지표

MAE는 중앙값에, RMSE는 평균에 최적화되며 RMSE는 이상치에 민감합니다. MAPE(백분율 오차)는 실제값이 0이면 정의되지 않고 과대예측과 과소예측에 비대칭이라 판매량이 작은 롱테일 품목에는 부적합합니다. 소매 수요예측에서는 WAPE = 절대오차 합 ÷ 실제값 합이 실무 표준에 가깝고, 서로 다른 스케일의 시계열을 비교할 때는 단순 예측(지난 시즌 값) 대비 비율인 MASE가 유용합니다. 품절 비용이 과잉재고 비용보다 크면 평균이 아니라 분위수(예: 0.75)를 예측해야 하며 이때 지표는 분위수 손실입니다.

### 불확실성을 같이 보고하기

테스트에 양성이 50건뿐이고 재현율이 0.80이면, 이항 표준오차는 √(0.8×0.2/50) ≈ 0.057이고 95% 구간은 대략 ±0.11입니다. 점수 0.80과 0.84의 차이는 노이즈일 수 있습니다. 부트스트랩이나 fold별 표준편차로 구간을 계산해 점수와 함께 적으세요. Rules of ML의 Rule #39도 출시 결정은 여러 지표를 함께 보며, 모든 지표가 좋아지거나 최소한 나빠지지 않을 때만 쉬운 결정이라는 취지로 말합니다.

### 현장에서는 이렇게 나타난다

고객은 "정확도가 몇 %냐"를 묻습니다. "월 상위 2,000명 기준 정밀도 X%, 규칙 대비 Y%p 개선, 비용 환산 월 Z원(구간 포함)"으로 바꿔 답하는 연습이 이 레슨의 목표입니다. 아래 코드는 비용 기반 임계값 탐색과 WAPE입니다.`,
      code: `import numpy as np
from sklearn.metrics import average_precision_score, roc_auc_score

def wape(y_true, y_pred):
    """가중 절대 백분율 오차: 실제값이 0인 날이 있어도 정의된다."""
    y_true, y_pred = np.asarray(y_true, float), np.asarray(y_pred, float)
    return np.abs(y_true - y_pred).sum() / np.abs(y_true).sum()

def best_threshold(y_true, proba, cost_contact=1000, gain_saved=6000):
    """발송 비용 대비 기대 이익이 최대인 임계값. gain_saved: 이탈자에게 보냈을 때의 기대 절감액."""
    y_true = np.asarray(y_true)
    best = (-np.inf, None)
    for t in np.unique(np.round(proba, 3)):
        sent = proba >= t
        profit = gain_saved * (sent & (y_true == 1)).sum() - cost_contact * sent.sum()
        if profit > best[0]:
            best = (profit, t)
    return best

rng = np.random.default_rng(1)
y = (rng.random(5000) < 0.05).astype(int)
proba = np.clip(0.05 + 0.25 * y + rng.normal(0, 0.12, 5000), 0, 1)   # 양성에게 약간 높은 점수

print("기저율", y.mean(), "ROC-AUC", round(roc_auc_score(y, proba), 3),
      "PR-AUC", round(average_precision_score(y, proba), 3))
profit, t = best_threshold(y, proba)
print(f"최적 임계값 {t}, 기대 이익 {profit:,.0f}원")
print(f"전원 발송 이익 {6000 * y.sum() - 1000 * len(y):,.0f}원")   # 음수: 다 보내면 손해
print("WAPE 예시:", wape([10, 0, 3, 7], [8, 1, 3, 9]))             # (2+1+0+2)/20 = 0.25`,
      codeLang: `python`,
      key: [
        `지표는 결정과 비용에서 거꾸로 고른다. 예산이 고정이면 precision@k, 임계값 결정이면 비용 행렬, 순위 전반이면 ROC/PR-AUC.`,
        `양성이 드물면 정확도·ROC-AUC가 낙관적이므로 PR-AUC와 양성 비율(무정보 기준선)을 함께 본다.`,
        `비용 구조에서 임계값을 계산한다. 이익 g, 비용 c이면 확률 p가 c/g 이상일 때 행동한다(확률 보정이 전제).`,
        `수요예측은 MAPE 대신 WAPE·MASE, 비대칭 비용이면 분위수 예측과 분위수 손실.`,
        `점수에는 항상 구간(부트스트랩, fold 표준편차)을 붙인다. 양성 50건이면 재현율 ±0.1 정도의 불확실성이 있다.`
      ],
      pitfalls: [
        `불균형 데이터에서 정확도·ROC-AUC만 보고하고 PR-AUC와 baseline 기준선을 빼서 성능을 과장한다.`,
        `F1을 최대화하는 임계값을 그대로 운영 임계값으로 쓴다. 비용이 비대칭이면 F1 최대점은 이익 최대점이 아니다.`,
        `실제값에 0이 섞인 판매 데이터에 MAPE를 써서 무한대나 수천 %가 나오고 지표를 임의로 제외한다.`,
        `테스트 양성이 수십 건인데 소수점 둘째 자리 차이로 모델을 고른다.`
      ]
    },
    {
      title: `트리·랜덤포레스트·GBDT: 내부에서 무슨 일이 일어나는가`,
      body: `표 형태 데이터에서 가장 강한 범용 도구는 트리 앙상블입니다. Grinsztajn 외(2022, arXiv 프리프린트, venue 미표기)는 45개 표 데이터셋 벤치마크에서 트리 기반 모델이 중간 규모(초록은 대략 1만 표본 수준)에서 여전히 최고라고 보고했습니다. 이 레슨은 "왜 되는지"를 내부 동작으로 설명하는 것이 목표입니다.

### 결정 트리 한 그루

트리는 각 노드에서 불순도(분류는 지니·엔트로피, 회귀는 분산)가 가장 크게 줄어드는 피처와 임계값을 탐색해 데이터를 둘로 가릅니다. 결과는 계단 모양의 함수라서 몇 가지 성질이 따라옵니다. 피처의 단조 변환(로그, 스케일링)에 불변이라 스케일링이 필요 없고, 피처 간 상호작용을 자동으로 잡으며, 결측과 이상치에 비교적 강합니다. 반면 훈련 범위 밖에서는 마지막 구간의 평균을 그대로 내므로 외삽을 못 합니다. 판매량이 계속 상승하는 추세를 트리에 맡기면 예측이 천장에 붙는 이유입니다. 또 사선 경계(x1 − x2 > 0)를 계단으로 근사해야 해서 비율·차이 피처를 직접 만들어 주면 도움이 됩니다. 한 그루는 분산이 커서 데이터가 조금만 달라져도 구조가 바뀝니다.

### 랜덤포레스트: 분산을 평균으로 줄인다

각 트리를 부트스트랩 표본으로 학습하고 노드마다 피처의 무작위 부분집합만 후보로 쓰면 트리 간 상관이 줄어듭니다. 상관이 낮은 깊은 트리들을 평균하면 편향은 거의 그대로이고 분산이 줄어듭니다. scikit-learn 문서(2026-11 열람, 1.9.1)는 ‹max_features›의 경험적 기본값으로 분류에는 ‹"sqrt"›(분류기의 생성자 기본값도 같음), 회귀에는 전체 피처(1.0)를 안내하고, ‹oob_score=True›는 부트스트랩에 뽑히지 않은 표본으로 일반화 오차를 추정합니다. 튜닝에 둔감하고 병렬이 쉽지만 깊은 트리를 수백 그루 저장해 메모리가 큽니다.

### 부스팅: 편향을 순차적으로 줄인다

GBDT는 얕은 트리를 하나씩 더해 갑니다. 매 단계에서 지금까지 모델이 틀린 정도(손실의 음의 기울기, 제곱 손실에서는 잔차)에 새 트리를 맞추고, 학습률(shrinkage)로 작은 보폭만 더합니다. XGBoost 공식 문서(Introduction to Boosted Trees)는 목적함수를 "손실 + 복잡도 벌점(리프 수와 리프 가중치 제곱)"으로 쓰고, 손실을 2차 테일러 근사해 기울기와 헤시안 통계만으로 분할을 평가하며, 분할의 이득이 γ를 넘어야 가지를 유지한다고 설명합니다. 아래 코드의 미니 부스팅이 이 구조의 가장 단순한 형태입니다.

### 구현 선택

| 구현 | 특징 |
| HistGradientBoosting (scikit-learn) | LightGBM에서 영감을 받은 히스토그램 방식(기본 최대 255 bin), 결측·범주형 네이티브, 표본이 1만 건을 넘으면 조기 종료 자동, 기본 max_leaf_nodes 31·min_samples_leaf 20·learning_rate 0.1(1.9.1 문서) |
| LightGBM | leaf-wise(best-first) 성장, 히스토그램, 튜닝 문서가 적절한 파라미터 없이는 과적합할 수 있다고 경고 |
| XGBoost | 정규화된 목적함수, 대규모·분산 학습, 기본 eta 0.3, max_depth 6(2026-11 stable 문서) |
| CatBoost | 범주형 처리와 ordered boosting(Prokhorenkova 외 2017이 예측 이동이라는 누수의 완화를 주장, arXiv 초록만 열람) |

우선순위가 높은 하이퍼파라미터는 (1) 학습률과 라운드 수(조기 종료로 결정), (2) 트리 복잡도(max_depth 또는 num_leaves, min_child_weight 또는 min_data_in_leaf), (3) 행·열 샘플링, (4) 정규화(lambda, alpha, gamma)입니다. LightGBM 문서는 leaf-wise에서는 num_leaves를 2^max_depth보다 작게 두라고 안내합니다. 조기 종료에 쓴 검증 구간의 점수는 낙관적이므로 별도 테스트가 필요하고, 그 검증 구간도 시간·그룹 규칙을 지켜 만들어야 합니다.

### 현장에서는 이렇게 나타난다

"일단 GBDT로 시작해 로지스틱과 비교"가 표형 데이터의 기본 진행입니다. 서빙 환경에서 LightGBM·XGBoost는 네이티브 바이너리 의존성이 있어 버전을 고정해야 하고, 학습과 서빙 라이브러리 버전이 다르면 예측이 달라질 수 있습니다.`,
      code: `import numpy as np
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor

class TinyGBM:
    """제곱 손실 GBDT: 매 단계에서 현재 잔차(= 손실의 음의 기울기)에 얕은 트리를 맞춘다."""
    def __init__(self, n_rounds=200, lr=0.1, depth=3):
        self.n_rounds, self.lr, self.depth = n_rounds, lr, depth

    def fit(self, X, y):
        self.base = float(np.mean(y))
        self.trees = []
        pred = np.full(len(y), self.base)
        for _ in range(self.n_rounds):
            resid = y - pred                              # 지금 모델이 틀린 방향
            tree = DecisionTreeRegressor(max_depth=self.depth, random_state=0).fit(X, resid)
            pred += self.lr * tree.predict(X)             # 작은 보폭으로만 이동
            self.trees.append(tree)
        return self

    def predict(self, X, n_rounds=None):
        trees = self.trees if n_rounds is None else self.trees[:n_rounds]
        out = np.full(len(X), self.base)
        for t in trees:
            out += self.lr * t.predict(X)
        return out

rng = np.random.default_rng(0)
X = rng.uniform(-3, 3, size=(1500, 4))
y = 2 * np.sin(X[:, 0]) + (X[:, 1] > 0) * X[:, 2] + rng.normal(0, 0.5, 1500)
X_tr, X_va, y_tr, y_va = train_test_split(X, y, test_size=0.3, random_state=0)

model = TinyGBM(n_rounds=400).fit(X_tr, y_tr)
for k in (1, 10, 50, 100, 200, 400):
    print(k, "라운드  검증 MAE =", round(mean_absolute_error(y_va, model.predict(X_va, k)), 3))
# 검증 MAE가 어느 라운드부터 평평해지거나 오르는지 보고 라운드 수를 정한다 = 조기 종료의 원리`,
      codeLang: `python`,
      key: [
        `트리는 불순도 감소가 최대인 (피처, 임계값)을 탐색한다. 스케일링 불필요, 상호작용 자동, 외삽 불가.`,
        `랜덤포레스트는 분산을 평균으로 줄이고(편향은 유지), GBDT는 잔차에 트리를 순차로 더해 편향을 줄인다.`,
        `GBDT의 핵심은 학습률 × 라운드 수(조기 종료)와 트리 복잡도(깊이·잎 수·최소 잎 표본)다.`,
        `HistGradientBoosting·LightGBM·XGBoost는 같은 계열이며 선택 기준은 성능 차이보다 설치·속도·범주형·파이프라인 일관성이다.`
      ],
      pitfalls: [
        `추세가 있는 판매량을 트리에 그대로 맡겨 예측이 훈련 최대치에 걸려 납작해진다. 차분·비율·선형 추세 성분과 결합해야 한다.`,
        `조기 종료 검증 세트를 무작위로 뽑아 시간 누수가 생기고, 그 검증 점수를 최종 성능으로 보고한다.`,
        `LightGBM의 num_leaves를 크게 두고 min_data_in_leaf를 기본값에 맡겨 소규모 데이터에서 과적합한다.`,
        `표본 1만 건 미만의 데이터에서 GBDT 하이퍼파라미터를 수백 회 탐색해 검증 세트에 과적합한다.`
      ]
    },
    {
      title: `피처 엔지니어링: as-of 집계·시차·범주형 인코딩`,
      body: `모델이 못 보는 정보는 모델이 알 수 없습니다. 같은 알고리즘이라도 피처가 달라지면 점수가 알고리즘 교체보다 크게 달라지는 일이 흔합니다. 피처 엔지니어링의 중심 원칙은 하나입니다. 모든 피처는 예측 시점 t에 실제로 알 수 있는 정보로만 계산합니다. 이 원칙을 어기면 레슨 3의 시간·타깃 누수가 됩니다.

### 스냅샷 테이블과 as-of 원칙

학습 데이터를 "예측 시점마다 한 행"으로 구성합니다. 예를 들어 매월 1일을 t로 잡고 고객마다 한 행을 만들되, 피처는 t 이전 데이터만으로 계산하고 라벨은 (t, t+30일] 구간의 사건으로 만듭니다. 이 테이블을 SQL이나 pandas로 만들 때 가장 흔한 사고는 조인입니다. "고객 마스터"의 현재 상태(등급, 구독 상태)를 t 시점이 아닌 현재 값으로 붙이면 미래가 들어갑니다. 이력 테이블을 시점 기준으로 조인(as-of join)해야 합니다.

### 집계·시차·달력 피처

- 집계(RFM): 최근성(마지막 구매 후 일수), 빈도(최근 7·30·90일 구매 횟수), 금액. 윈도를 여러 개 두면 추세(30일 대비 90일 비율)를 얻습니다.
- 시차와 이동 통계: lag_1, lag_7(같은 요일 지난주), 28일 이동평균. 이동 통계는 반드시 shift(1)을 먼저 적용한 뒤 계산합니다. 현재 행을 평균에 넣으면 정답의 일부가 피처로 들어갑니다.
- 달력: 요일, 월, 공휴일, 명절 전후. 한국 명절은 음력이라 해마다 날짜가 이동하므로 달력 테이블을 별도 관리합니다.
- 비율·차이: 트리가 어려워하는 사선 경계를 직접 만들어 줍니다. 0으로 나누기에 주의합니다.

### 범주형 인코딩

- one-hot: 범주 수가 적을 때(수십 개 이하). 선형 모델에 적합합니다.
- 빈도 인코딩: 범주의 등장 횟수. 누수가 없고 단순합니다.
- 타깃 인코딩: 우편번호처럼 고카디널리티 범주를 범주별 타깃 평균으로 바꿉니다. scikit-learn ‹TargetEncoder›는 평활화(소표본 범주를 전체 평균 쪽으로 당김)를 적용하며, ‹fit_transform›은 훈련 데이터를 교차적합(기본 5-fold)으로 인코딩해 자기 라벨이 인코딩에 섞이는 것을 막습니다. 문서는 ‹fit›으로 학습한 뒤 같은 훈련 데이터에 ‹transform›하는 방식이 누수를 만들 수 있어 권하지 않는다고 적고, 테스트는 ‹transform›으로 변환하라고 합니다. 범주가 훈련에 없으면 전체 평균으로 인코딩됩니다. 2026-11 기준 1.9.1 문서에서는 ‹shuffle›·‹random_state› 인자가 deprecated이고, 교차적합의 셔플이 필요하면 ‹cv›에 분할기 객체를 직접 넘기는 방식으로 바뀌는 중입니다.
- 네이티브 범주형: HistGradientBoosting·LightGBM·CatBoost는 범주 집합을 두 묶음으로 나누는 분할을 직접 지원합니다(sklearn 문서는 순서 없는 범주에서 one-hot이나 순서 인코딩보다 보통 낫다고 설명).

### 결측과 변환

결측 자체가 정보일 수 있습니다("주소 미기재" 고객이 이탈률이 높은 경우). HistGradientBoosting은 분할마다 결측을 좌우 어느 쪽으로 보낼지 학습하므로 대치가 필요 없습니다. 선형 모델은 대치와 함께 결측 지시자 컬럼을 추가합니다. 선형 모델에는 로그·구간화·스플라인이 도움이 되지만 트리에는 단조 변환이 무의미합니다.

### 현장에서는 이렇게 나타난다

납품물에 피처 정의서(이름, 정의, 계산 시점, 원천 테이블, 결측의 의미)를 넣으세요. Rules of ML이 경고하는 학습-서빙 스큐(학습 때와 운영 때 피처 값이 다르게 계산되는 문제)는 피처 계산 코드를 학습과 서빙이 공유할 때 줄어듭니다. 아래 코드는 시차·이동평균 피처와 "오늘 값이 피처에 섞이지 않았는가"를 검사하는 테스트입니다.`,
      code: `import pandas as pd

def make_features(df):
    """df: store, date, sales(일 단위). d일의 피처는 d-1일까지의 정보만 쓴다."""
    df = df.sort_values(["store", "date"]).copy()
    g = df.groupby("store")["sales"]
    df["lag_1"] = g.shift(1)
    df["lag_7"] = g.shift(7)                                  # 지난주 같은 요일
    # 이동평균은 shift(1) 뒤에 계산한다: 오늘 값이 평균에 섞이지 않게
    df["roll_mean_28"] = g.transform(lambda s: s.shift(1).rolling(28, min_periods=14).mean())
    df["dow"] = df["date"].dt.dayofweek
    df["is_weekend"] = (df["dow"] >= 5).astype(int)
    df["wow_ratio"] = df["lag_1"] / df["lag_7"].where(df["lag_7"] > 0)   # 0으로 나누기 방지
    return df

# 단위 테스트: 오늘 판매량을 바꿔도 오늘의 피처는 변하지 않아야 한다
days = pd.date_range("2026-01-01", periods=60)
demo = pd.DataFrame({"store": "A", "date": days, "sales": range(60)})
feat = make_features(demo)
row = feat[feat["date"] == "2026-01-30"].iloc[0]       # 30번째 날, 판매량 29
assert row["lag_1"] == 28
assert abs(row["roll_mean_28"] - 14.5) < 1e-9           # 1..28의 평균, 오늘(29)은 제외

tampered = demo.copy()
tampered.loc[tampered["date"] == "2026-01-30", "sales"] = 9999
row2 = make_features(tampered)
row2 = row2[row2["date"] == "2026-01-30"].iloc[0]
assert row2["lag_1"] == row["lag_1"]
assert abs(row2["roll_mean_28"] - row["roll_mean_28"]) < 1e-9
print("as-of 테스트 통과")`,
      codeLang: `python`,
      key: [
        `모든 피처는 예측 시점 t에 알 수 있는 정보만으로 계산한다. 이력 테이블은 시점 기준(as-of)으로 조인한다.`,
        `이동 통계는 shift(1) 뒤에 계산한다. 현재 행을 평균에 포함하면 정답이 피처로 새어 든다.`,
        `고카디널리티 범주는 평활화와 교차적합을 갖춘 타깃 인코딩이나 네이티브 범주형으로 처리한다. fit 후 같은 데이터 transform은 누수 위험이다.`,
        `트리는 단조 변환이 필요 없지만 비율·차이·집계는 직접 만들어 줘야 한다. 선형 모델은 로그·구간화·대치가 필요하다.`,
        `피처 정의서와 학습-서빙 코드 공유로 스큐를 막는다.`
      ],
      pitfalls: [
        `고객 마스터의 현재 등급을 과거 시점의 행에 붙여서, 이탈 이후에 바뀐 값이 학습에 들어간다.`,
        `rolling(28).mean()을 shift 없이 계산해 모델이 정답의 일부를 보고 점수가 폭등하는데 원인을 알아채지 못한다.`,
        `TargetEncoder.fit(X_tr, y_tr) 뒤 X_tr에 transform해 훈련 표현이 자기 라벨을 포함하고, 검증 점수는 좋은데 운영에서 무너진다.`,
        `결측을 평균으로 일괄 대치해 "결측 자체가 이탈 신호"인 정보를 지운다.`
      ]
    },
    {
      title: `불균형·확률 보정·하이퍼파라미터 탐색·분포 이동`,
      body: `기본 모델과 평가가 세워지면 운영에서 문제가 되는 네 가지가 남습니다. 클래스 불균형, 확률의 신뢰도, 튜닝의 한계, 시간이 지나면 달라지는 데이터입니다.

### 불균형: 진짜 문제는 비율이 아니라 양성의 수

양성이 5%여도 양성이 5,000건이면 비교적 잘 학습되지만, 0.3%에 양성이 200건이면 어려운 문제입니다. 대응책은 비용이 낮은 순으로 다음과 같습니다.

1. 아무것도 안 하고 임계값을 비용에 맞춰 조정한다. 순위 품질은 원 데이터로 학습한 모델이 보존하며, 대부분의 경우 이것으로 충분합니다.
2. 클래스 가중치(‹class_weight›, XGBoost의 ‹scale_pos_weight›). XGBoost 문서는 시작값으로 음성 수 합 ÷ 양성 수 합을 제안합니다(2026-11 stable 문서).
3. 언더샘플링: 학습이 빨라지지만 정보를 버립니다.
4. 오버샘플링(SMOTE 등): 합성 양성은 이웃 보간이라 반드시 훈련 fold 안에서만 적용합니다. 리샘플링 뒤에는 모델의 확률이 실제 비율보다 높게 나오므로 보정이 필요합니다. 평가는 항상 원래 분포의 검증·테스트 데이터로 합니다.

### 확률 보정(calibration)

보정된 모델은 "0.8이라 말한 건의 약 80%가 실제 양성"입니다. 비용 임계값 계산(레슨 4)이나 기대값 계산이 확률을 직접 쓸 때 필요합니다. 순위만 쓴다면 보정은 필요 없습니다. scikit-learn 문서(2026-11 열람)의 합성 데이터 비교 예에서는 로지스틱 회귀가 비교적 잘 보정되었고(로짓 링크와 로그 손실 덕분이며 모델이 데이터에 맞을 때의 이야기입니다), 랜덤포레스트는 0과 1 근처 확률이 드물게 나오는 쪽으로, 가우시안 나이브 베이즈는 0과 1로 쏠리는 쪽으로, 선형 SVM은 더 시그모이드형으로 왜곡되었습니다. 일반 법칙이 아니라 예시이므로 내 데이터에서 곡선으로 확인해야 합니다. ‹CalibratedClassifierCV›는 두 방법을 제공합니다. sigmoid(Platt)는 소표본에 효과적이지만 양성이 매우 드문 불균형 문제에서는 가정이 어긋날 수 있다고 문서가 적습니다. isotonic은 단조 왜곡을 모두 고칠 수 있지만 소표본에서 과적합하며 대략 1,000표본 이상에서 sigmoid와 같거나 낫습니다. isotonic은 동점을 만들어 AUC를 바꿀 수 있습니다. 보정기는 모델 훈련에 쓰지 않은 데이터로 학습해야 하며, 훈련 데이터로 보정하면 모델이 새 데이터에서보다 더 확신하는 것으로 학습됩니다. 확인은 보정 곡선(‹calibration_curve›)으로 합니다. Brier 점수와 로그 손실은 보정과 변별력이 섞인 종합 점수라 보정만의 척도로는 한계가 있다고 문서가 적으므로 곡선의 보조로 씁니다.

### 하이퍼파라미터 탐색

중요한 파라미터는 소수이므로 격자 탐색보다 무작위 탐색이 같은 예산에서 유리합니다. 학습률 같은 척도형 파라미터는 로그 구간에서 뽑고, 라운드 수는 탐색 대상이 아니라 조기 종료로 결정합니다. 평가는 레슨 3의 시간·그룹 규칙을 지킨 CV로 합니다. 탐색 횟수가 늘수록 검증 점수에 과적합하므로(수백 회 탐색 후 +0.003 AUC는 노이즈일 가능성이 큽니다), 탐색 예산을 미리 정하고 마지막에 한 번도 보지 않은 holdout으로 확인합니다. 보통 피처와 데이터를 개선하는 편이 튜닝보다 이득이 큽니다.

### 분포 이동

- 공변량 이동: 입력 분포 P(x)가 바뀜(가격 정책 변경, 신규 채널).
- 라벨 이동: 기저율이 바뀜(시즌, 경기).
- 개념 이동: P(y|x) 자체가 바뀜(고객 행동 규칙이 변함).

라벨은 늦게 확정되므로(이탈은 30일 뒤) 입력 분포 점검이 가장 빠른 경보입니다. adversarial validation은 "훈련 기간 행인지 최근 행인지"를 맞히는 분류기를 학습해 AUC를 봅니다. 0.5 근처면 분포가 비슷하고, 높으면 이동했으며 단일 피처 AUC나 중요도로 원인 피처를 찾습니다. PSI 같은 구간별 분포 비교도 쓰며 0.1, 0.25 같은 임계값은 업계 관행일 뿐 보편 규칙이 아닙니다.

### 현장에서는 이렇게 나타난다

"모델이 시간이 지나면 나빠지나요"라는 질문에는 과거 시점들에서 "재학습 없이 N개월 뒤" 성능이 얼마나 내려갔는지를 시간 분할로 측정해 답하고, 재학습 주기와 모니터링 지표를 그 결과로 정합니다.`,
      code: `import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

def adv_auc(X, is_recent, seed=0):
    """'훈련 기간 행 vs 최근 행'을 구분하는 분류기의 교차검증 AUC."""
    clf = HistGradientBoostingClassifier(max_iter=100, random_state=seed)
    cv = StratifiedKFold(5, shuffle=True, random_state=seed)
    p = cross_val_predict(clf, X, is_recent, cv=cv, method="predict_proba")[:, 1]
    return roc_auc_score(is_recent, p)

def drift_report(train_df, recent_df):
    X = pd.concat([train_df, recent_df], ignore_index=True)
    is_recent = np.r_[np.zeros(len(train_df)), np.ones(len(recent_df))].astype(int)
    total = adv_auc(X, is_recent)
    per_col = {c: adv_auc(X[[c]], is_recent) for c in X.columns}   # 피처 단독 AUC
    return total, sorted(per_col.items(), key=lambda kv: -kv[1])

rng = np.random.default_rng(0)
old = pd.DataFrame({"price": rng.normal(100, 10, 3000), "visits": rng.poisson(5, 3000)})
new = pd.DataFrame({"price": rng.normal(112, 10, 800), "visits": rng.poisson(5, 800)})  # price만 이동

total, cols = drift_report(old, new)
print(f"전체 adversarial AUC={total:.2f}")
for name, auc in cols:
    print(f"  {name:<8} 단독 AUC={auc:.2f}")
# price 쪽이 0.8 안팎, visits는 0.5 근처가 나와야 정상: 이동의 원인 피처를 가리킨다`,
      codeLang: `python`,
      key: [
        `불균형 대응은 임계값 조정 → 클래스 가중 → 리샘플링 순으로 비용이 오른다. 리샘플링은 훈련 fold 안에서만, 평가는 원래 분포로.`,
        `확률을 직접 쓰는 결정(비용 임계값, 기대 이익)에는 보정이 필요하고 순위만 쓰면 필요 없다. 보정기는 모델 훈련과 분리된 데이터로 학습한다.`,
        `하이퍼파라미터는 무작위 탐색 + 예산 상한 + 최종 holdout. 라운드 수는 조기 종료로 정한다.`,
        `분포 이동은 입력(adversarial validation, PSI)이 라벨보다 빠른 경보이고, 재학습 주기는 시간 분할로 측정한 성능 열화로 정한다.`
      ],
      pitfalls: [
        `SMOTE를 CV 이전에 전체 데이터에 적용해 검증 fold에 합성 양성이 섞이고 재현율 0.9 같은 거짓 점수를 얻는다.`,
        `class_weight로 학습한 모델의 predict_proba를 그대로 확률로 믿고 비용 임계값 공식을 적용한다.`,
        `튜닝 결과의 검증 점수를 그대로 최종 성능으로 보고하고 holdout 확인을 생략한다.`,
        `adversarial AUC가 높다는 이유로 곧바로 모델을 교체하고, 어떤 피처가 이동했는지(가격 정책, 로깅 변경)를 확인하지 않는다.`
      ]
    },
    {
      title: `해석·오류 분석·모델 카드: 왜 그렇게 예측하고 어디서 틀리는가`,
      body: `고객은 "AI가 왜 이 고객을 이탈로 봤나요", "어떤 상황에서 틀리나요"를 묻습니다. 해석은 세 가지 목적에 쓰입니다. 디버깅(누수와 버그 발견), 고객 신뢰와 감사 대응, 그리고 비즈니스 인사이트입니다. 해석 도구의 한계를 모르면 오해를 납품하게 됩니다.

### 전역 중요도: MDI와 permutation

트리 모델의 ‹feature_importances_›는 불순도 감소 합(MDI)이며 훈련 데이터 통계로 계산되어 고카디널리티 피처를 부풀리고 과적합된 피처를 중요하다고 말할 수 있습니다(scikit-learn 문서가 경고, 2026-11 열람). permutation importance는 검증·테스트 세트에서 피처 하나의 값을 섞고 점수가 얼마나 떨어지는지를 재며, ‹n_repeats›로 분산을 얻습니다. 문서가 지적하는 한계가 둘 있습니다. 첫째, 상관이 높은 피처는 서로를 대신하므로 하나를 섞어도 점수가 안 떨어져 둘 다 중요하지 않아 보입니다. 문서가 제시하는 해법은 상관 군집을 만들어 군집당 피처 하나만 남기는 것이고, 군집 전체를 한꺼번에 섞어 보는 변형도 실무에서 씁니다. 둘째, 그것은 "이 모델이 얼마나 의존하는가"이지 피처의 본질적 예측력이 아닙니다. 나쁜 모델에서의 중요도는 좋은 모델과 다를 수 있으므로 먼저 홀드아웃 성능을 확인하고 해석합니다.

### SHAP

SHAP(Lundberg & Lee, 2017, NIPS 게재 예정으로 표기된 논문)은 게임이론의 Shapley 값으로 예측 하나를 피처별 기여로 가산 분해합니다. 개별 예측 설명("이 고객은 최근성 때문에 +0.12")과 전역 요약(평균 절댓값)을 모두 낼 수 있습니다. 한계도 분명합니다. 상관 피처는 기여를 나눠 가지므로 각각이 중간 정도로 보이고, 값은 배경 분포 선택과 출력 공간(확률/로그 오즈)에 의존하며, 인과가 아닙니다. SHAP 공식 문서의 개요 튜토리얼 중에도 "Be careful when interpreting predictive models in search of causal insights"라는 제목의 글이 있습니다(목록 페이지에서 제목만 확인). "가격을 내리면 이탈이 줄 것"이라는 결론은 SHAP으로 정당화되지 않고 실험이 필요합니다.

### 단조 제약과 상식 점검

HistGradientBoosting은 ‹monotonic_cst›로 피처와 예측의 단조 관계(가격↑ → 수요↓)를 강제할 수 있습니다. 문서는 다중 클래스와 범주형 피처에 적용되지 않고 효과를 제한적으로만 구속한다는 한계를 적습니다. 도메인 상식과 어긋난 부분의존 곡선은 데이터 문제의 신호이기도 합니다.

### 오류 분석 습관

점수만 보지 말고 (1) 세그먼트별 성능(신규 vs 기존, 지역, 상품군, 월), (2) 가장 크게 틀린 50건 직접 읽기, (3) 라벨 오류 비율, (4) 오류 유형 분류를 합니다. 신규 가입 90일 미만 고객의 재현율이 낮다면 그 구간에는 별도 규칙을 병행하는 것이 모델 개선보다 싸게 먹힙니다.

### 모델 카드와 한계 문서

납품 문서에 목적과 비목적, 학습 데이터 기간·크기, 타깃 정의, 피처 목록, 분할 방식, 지표(구간 포함)와 baseline 대비, 세그먼트 성능, 알려진 한계(적용 범위 밖), 모니터링과 재학습 조건, 재현 명령을 넣습니다. 이것은 분쟁 방어 문서이자 인수인계 문서입니다.

### 현장에서는 이렇게 나타난다

"AI 판단 근거를 보여 달라"는 요구에는 전역 permutation 중요도 표와 대표 사례 3~5건의 SHAP 설명을 제공하되 "연관이며 인과가 아님"을 함께 적습니다. 아래 코드는 홀드아웃 permutation 중요도(노이즈 판정 포함)와 세그먼트별 오류 보고서입니다.`,
      code: `import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.model_selection import train_test_split

def explain_report(model, X_te, y_te, scoring="average_precision", seed=0):
    r = permutation_importance(model, X_te, y_te, scoring=scoring, n_repeats=20, random_state=seed)
    imp = pd.DataFrame({"feature": X_te.columns, "score_drop": r.importances_mean, "std": r.importances_std})
    imp["above_noise"] = imp["score_drop"] - 2 * imp["std"] > 0      # 노이즈 수준을 넘는가
    return imp.sort_values("score_drop", ascending=False)

def segment_report(df, y_col, proba_col, seg_col, threshold):
    rows = []
    for seg, d in df.groupby(seg_col):
        pred = d[proba_col] >= threshold
        tp = (pred & (d[y_col] == 1)).sum()
        rows.append({seg_col: seg, "n": len(d), "positives": int(d[y_col].sum()),
                     "recall": tp / max(d[y_col].sum(), 1), "precision": tp / max(pred.sum(), 1)})
    return pd.DataFrame(rows).sort_values("recall")

rng = np.random.default_rng(0)
n = 4000
X = pd.DataFrame({"recency": rng.integers(0, 90, n), "freq": rng.poisson(3, n), "noise": rng.normal(size=n)})
logit = -3 + 0.04 * X["recency"].to_numpy() - 0.2 * X["freq"].to_numpy()
y = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=y, random_state=0)
model = HistGradientBoostingClassifier(max_iter=150, learning_rate=0.05, random_state=0).fit(X_tr, y_tr)
print(explain_report(model, X_te, y_te))                     # noise 피처는 above_noise=False 여야 한다

df = X_te.assign(y=y_te, p=model.predict_proba(X_te)[:, 1],
                 seg=np.where(X_te["freq"] > 3, "heavy", "light"))
print(segment_report(df, "y", "p", "seg", threshold=0.2))    # 세그먼트별 재현율·정밀도`,
      codeLang: `python`,
      key: [
        `MDI(feature_importances_)는 훈련 통계라 고카디널리티를 부풀린다. 홀드아웃 permutation importance(n_repeats로 분산)가 기본 도구다.`,
        `상관 피처는 permutation에서 둘 다 낮게, SHAP에서 기여를 나눠 갖는 것으로 나온다. 군집 단위로 해석한다.`,
        `SHAP·중요도·계수는 모두 모델의 의존이며 인과가 아니다. 개입 효과는 실험(A/B)으로 확인한다.`,
        `오류 분석은 세그먼트별 성능과 큰 오류 50건 읽기에서 시작하며 다음 작업의 우선순위를 정해 준다.`,
        `모델 카드에는 목적·데이터·분할·지표(구간)·baseline 대비·한계·모니터링·재현 명령을 담는다.`
      ],
      pitfalls: [
        `훈련 세트에서 permutation importance를 계산해 과적합된 피처를 중요하다고 보고한다.`,
        `상관 피처 둘의 중요도가 모두 낮은 것을 보고 둘 다 삭제해 성능이 하락한다.`,
        `SHAP 기여도를 "이 요인을 바꾸면 결과가 이만큼 바뀐다"는 개입 효과로 고객에게 설명한다.`,
        `전체 평균 점수만 보고하고 신규·소수 세그먼트에서의 실패를 모델 카드에 적지 않는다.`
      ]
    },
    {
      title: `통합 사례: 구독 서비스 이탈 예측 외주를 납품까지`,
      body: `이 레슨은 앞의 여덟 레슨을 한 건의 외주로 묶습니다. 가상 의뢰인은 월 구독형 콘텐츠 서비스이며 의뢰서는 "이탈 예측 AI, 정확도 90% 이상, 딥러닝으로"입니다. 보유 데이터는 3년치 가입·결제·접속 로그를 모은 CSV이고, 월 쿠폰 발송 한도는 2,000건이며 건당 비용은 1,000원입니다. 아래 숫자는 설명을 위한 예시입니다.

### 1단계: 킥오프에서 문제를 다시 쓴다

의뢰서를 레슨 1의 질문으로 바꿉니다. 타깃은 "예측 시점 이후 30일 안에 해지 또는 결제 실패 후 미복구", 예측 시점은 매월 1일, 행동은 상위 2,000명에게 쿠폰, 비용은 건당 1,000원이고 이탈 방지 시 기대 절감을 6,000원으로 가정합니다. "정확도 90%"는 이탈률이 7%라면 전부 아니오로 찍어도 93%이므로 기준이 될 수 없다고 설명하고, 수용 기준을 "시험 구간(마지막 3개월)에서 상위 2,000명 정밀도와 비용 환산 이익이 현재 규칙(마지막 접속 21일 이상)보다 개선"으로 바꿔 합의합니다. 시험 구간의 사전 공개 범위도 계약서에 적습니다.

### 2단계: 데이터 감사와 누수 사냥

컬럼마다 "언제 채워지는가"를 묻는 표를 만듭니다. 예를 들어 ‹cancel_reason›(해지 사유)은 해지 후에야 채워집니다. 이 컬럼을 넣으면 시험 AUC가 0.97이 나오고(예시) 제거하면 0.78로 내려옵니다. 같은 고객이 매월 행으로 존재하므로 시간 분할을 쓰고, 라벨 지평 30일에 맞춰 훈련 끝 한 달을 gap으로 비웁니다. 고객 ID의 변형으로 생긴 중복 가입 행도 정리합니다.

### 3단계: 사다리 비교

같은 분할에서 (1) 상수, (2) 규칙, (3) 표준화 + 로지스틱, (4) HistGradientBoosting을 비교합니다. 보고 지표는 PR-AUC, precision@2,000, 비용 환산 이익입니다. 예시 결과는 규칙 precision@2,000 0.21, 로지스틱 0.28, GBDT 0.31이며 3개월 각 월의 값을 구간으로 함께 적습니다. GBDT가 로지스틱 대비 얻은 +0.03이 월별 변동 범위 안이면 "복잡한 모델의 추가 이득은 확인되지 않음"이라고 보고하고 설명 가능성이 높은 로지스틱을 권합니다. 딥러닝 요구에는 같은 분할에서 신경망을 비교하는 실험을 범위에 넣어 근거(Grinsztajn 외 2022)와 함께 설명합니다.

### 4단계: 해석·오류 분석·분포 점검

permutation 중요도에서 최근성과 접속 횟수가 상위를 차지하면 도메인 직관과 맞습니다. 세그먼트 분석에서 가입 90일 미만 고객의 재현율이 낮게 나오면 별도 온보딩 규칙을 권합니다. 최근 3개월과 이전 기간의 adversarial validation에서 가격 피처가 단독으로 높은 AUC를 보이면 가격 정책 변경을 확인하고 재학습 주기를 단축합니다.

### 5단계: 납품과 운영

- 평가 리포트: 사다리 표, 구간, 비용 환산, 오류 분석, 한계.
- 모델 카드, 피처 정의서(컬럼별 시점 포함), 재현 저장소(환경 고정, 3개 명령으로 재현).
- 운영 계획: 월별 precision@k와 PSI 점검, 라벨이 30일 늦게 확정되므로 입력 이동 지표를 선행 경보로 사용, 재학습 조건.
- 가장 중요한 한계 문서: 이 모델은 "누가 떠날 가능성이 높은가"를 예측할 뿐 "쿠폰이 누구에게 효과가 있는가"는 알려 주지 않습니다. 후자는 A/B 테스트나 uplift 모델링이 필요하며 별도 범위로 제안합니다.

아래 코드는 3단계 비교를 시간 분할과 gap으로 수행하고 비용 환산까지 출력하는 골격입니다.`,
      code: `import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

def precision_at_k(y, score, k):
    top = np.argsort(-score)[:k]
    return float(np.asarray(y)[top].mean())

def time_split_report(df, feats, label="y", time_col="month", test_months=3, k=500,
                      gain=6000, cost=1000):
    months = np.sort(df[time_col].unique())
    test = df[df[time_col] >= months[-test_months]]
    train = df[df[time_col] < months[-test_months - 1]]       # 라벨 지평 1개월만큼 비운다(purge)
    models = {
        "2 규칙(recency)": None,
        "3 로지스틱": make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)),
        "4 hist_gbdt": HistGradientBoostingClassifier(max_iter=200, learning_rate=0.05, random_state=0),
    }
    rows = []
    for name, m in models.items():
        if m is None:
            s = test["recency"].to_numpy()                    # 높을수록 이탈 위험으로 본다
        else:
            s = m.fit(train[feats], train[label]).predict_proba(test[feats])[:, 1]
        hit = precision_at_k(test[label], s, k)
        rows.append({"model": name, "PR-AUC": average_precision_score(test[label], s),
                     f"precision@{k}": hit, "expected_profit": k * (hit * gain - cost)})
    return pd.DataFrame(rows).round(3)

rng = np.random.default_rng(0)
n = 24000
df = pd.DataFrame({"month": rng.integers(1, 25, n), "recency": rng.integers(0, 90, n),
                   "sessions_30d": rng.poisson(8, n), "tenure_m": rng.integers(1, 48, n)})
z = -2.5 + 0.03 * df["recency"].to_numpy() - 0.12 * df["sessions_30d"].to_numpy() - 0.01 * df["tenure_m"].to_numpy()
df["y"] = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)
print(time_split_report(df, ["recency", "sessions_30d", "tenure_m"], k=500))`,
      codeLang: `python`,
      key: [
        `의뢰서의 "정확도 N%"는 시험 구간·지표·baseline이 있는 수용 기준으로 번역한다. 번역이 이 프로젝트의 첫 납품물이다.`,
        `컬럼별 "채워지는 시점" 표와 시간 분할 + gap이 누수 방어의 기본이다. 점수가 너무 좋으면 먼저 누수를 의심한다.`,
        `사다리(상수 → 규칙 → 선형 → GBDT)의 각 단계 개선을 월별 구간과 함께 보고하고, 추가 이득이 노이즈 안이면 단순한 모델을 권한다.`,
        `예측 모델은 개입 효과를 알려 주지 않는다. 쿠폰의 효과는 A/B 테스트나 uplift로 따로 측정한다.`,
        `납품물: 평가 리포트, 모델 카드, 피처 정의서, 재현 저장소, 모니터링·재학습 계획.`
      ],
      pitfalls: [
        `"정확도 90%"를 그대로 수락해 놓고 납품 뒤 비용 관점에서는 쓸모없다는 지적을 받는다.`,
        `시험 구간을 개발 중에 계속 열어 보며 튜닝해 보고 점수가 운영에서 재현되지 않는다.`,
        `예측이 정확하면 쿠폰 캠페인이 성공한다고 약속한다. 쿠폰은 어차피 남을 고객(sure thing)에게도 나간다.`,
        `재현 환경을 고정하지 않아 3개월 뒤 라이브러리 업데이트로 점수와 예측이 달라진다.`
      ]
    }
  ],
  labs: [
    {
      title: `누수 심기와 탐지: 같은 데이터에서 점수가 얼마나 부풀려지는가`,
      scenario: `가상 구독 서비스의 고객-월 패널 데이터를 직접 만들어 누수가 점수를 부풀리는 크기를 눈으로 확인하는 실험입니다. 외부 데이터나 유료 도구 없이 NumPy·pandas·scikit-learn만 씁니다. 생성기에는 고객별 고정 효과(고객마다 이탈 성향이 다름), 시간에 따라 변하는 최근성·접속 횟수, 약 5~8%의 월 이탈률을 넣고 seed를 고정합니다. 이 데이터에서 정직한 파이프라인(시간 분할 + gap + Pipeline)으로 점수를 먼저 기록한 다음, 누수 네 가지를 하나씩 켜서 점수가 얼마나 올라가는지, 그리고 어떤 신호로 그 누수를 잡을 수 있는지를 한 장의 표로 정리합니다. 이 표가 이후 모든 프로젝트의 점검표가 됩니다.`,
      steps: [
        `생성기를 작성합니다: 고객 3,000명 × 24개월, 고객별 고정 효과, 월별 최근성·접속 횟수·가입 기간, 이탈 라벨(앞으로 1개월 내 이탈). seed를 고정하고 이탈률을 출력합니다.`,
        `정직한 기준 실험을 합니다: 마지막 4개월을 시험 구간으로 두고 훈련 끝 1개월을 gap으로 비워 HistGradientBoosting을 학습해 PR-AUC와 ROC-AUC를 기록합니다. 이것이 "진짜 점수"입니다.`,
        `누수 1(타깃): 이탈한 달 이후에만 값이 생기는 해지 사유 컬럼(이탈 시 1~5의 값, 아니면 결측)을 추가하고 점수를 다시 잽니다. 피처별 단독 AUC 스캔(결측은 0으로 채워서 계산)으로 이 컬럼이 0.9 이상으로 튀는 것을 확인합니다.`,
        `누수 2(전처리): 순수 잡음 컬럼 1,000개를 추가한 뒤 (a) 전체 데이터로 SelectKBest를 고른 뒤 분할하는 방식, (b) Pipeline 안에서 고르는 방식의 점수를 비교합니다.`,
        `누수 3(그룹): 같은 데이터를 무작위 StratifiedKFold와 GroupKFold(고객 ID 기준)로 평가해 점수 차이를 기록합니다.`,
        `누수 4(시간): 28일 이동평균 피처를 shift 없이 계산한 버전(현재 행 포함)과 shift(1) 뒤에 계산한 버전의 점수를 비교하고, 레슨 6의 as-of 단위 테스트가 전자를 잡아내는지 확인합니다.`,
        `누수 점검 함수를 만듭니다: 단일 피처 AUC 스캔, 무작위 분할 대비 시간 분할 점수 차이 출력. 데이터프레임을 받아 경고 목록을 반환하게 합니다.`,
        `결과표를 작성합니다: 누수 유형 / 부풀려진 점수 / 정직한 점수 / 탐지 신호 / 방어 방법. 한 쪽 분량의 메모로 남깁니다.`
      ],
      accept: [
        `같은 seed로 재실행했을 때 정직한 기준 점수가 소수점 셋째 자리까지(±0.005 이내) 재현된다.`,
        `네 가지 누수 중 최소 세 가지에서 정직한 점수 대비 AUC가 0.03 이상 높게 나오며, 그렇게 되도록 생성기 설정(고정 효과 크기, 잡음 컬럼 수 등)을 조정했다면 그 설정이 문서화되어 있다.`,
        `점검 함수가 해지 사유 컬럼을 단독 AUC 경고로 잡아내고, 이동평균 누수를 as-of 단위 테스트가 실패로 판정한다.`,
        `결과표에 네 누수 모두의 부풀림 폭과 탐지 신호가 수치와 함께 기록되어 있다.`
      ],
      stretch: `gap=0과 gap=라벨 지평(1개월)의 시간 분할 점수를 비교해 라벨 지평 중첩이 만드는 부풀림 크기를 측정하고, 라벨 지평을 3개월로 늘렸을 때 필요한 gap과 점수 변화를 표로 만들어 보세요.`
    },
    {
      title: `baseline 사다리와 비용 환산: 수요예측 롤링 오리진 평가`,
      scenario: `가상 소매 체인(상점 20곳 × 일 단위 2년치)의 일 판매량을 예측해 발주를 돕는 과제입니다. 생성기에는 상점 규모 차이, 요일 계절성, 공휴일 효과, 프로모션 효과(곱셈), 완만한 추세, 포아송 노이즈를 넣습니다. 평가는 하루 뒤가 아니라 7일 뒤를 미리 예측하는 상황으로 정하고 시간순 롤링 오리진으로 5번 반복합니다. 비교 대상은 상수, 지난주 같은 요일 값(seasonal naive), 4주 같은 요일 평균, 선형(포아송) 모델, HistGradientBoosting입니다. 또 품절 비용이 과잉재고 비용의 3배라는 가정을 두고 평균 예측과 분위수 예측의 총비용을 비교합니다. 결과물은 개선을 비용으로 해석한 결과표입니다.`,
      steps: [
        `생성기를 작성합니다: 상점 20곳 × 730일, 요일 효과, 공휴일·프로모션 플래그, 상점별 규모, 포아송 노이즈. seed를 고정합니다.`,
        `평가 틀을 만듭니다: 날짜 기준 컷오프 5개(예: 마지막 150일 구간을 30일씩), 각 컷오프에서 훈련은 컷오프 7일 전까지, 테스트는 컷오프 이후 30일(예측 지평 7일 이상). 컷오프를 직접 구현해 상점 패널에서도 같은 날짜 분할이 되게 합니다.`,
        `baseline 사다리 1~2단계: 훈련 평균 상수, seasonal naive(7일 전 값), 4주 같은 요일 평균. 각 폴드의 WAPE·MAE·편향(평균 오차)을 기록합니다.`,
        `피처를 만듭니다: 레슨 6의 방식으로 예측 지평을 고려한 lag(지평 7일이면 lag_7 이상만), 이동평균(shift 후), 요일·공휴일·프로모션. 오늘 값을 바꿔도 피처가 변하지 않는 단위 테스트를 통과시킵니다.`,
        `3단계: PoissonRegressor(표준화 + 요일 더미). 4단계: HistGradientBoostingRegressor(loss 포아송). 같은 폴드로 평가해 사다리 표를 완성합니다.`,
        `비용 환산: 품절 비용 3, 과잉 1의 비대칭 가정에서 평균 예측 모델과 HistGradientBoostingRegressor(loss quantile, quantile 0.75) 예측의 총비용을 비교하고, 분위수 모델이 예측 상한 이하로 떨어지는 비율(커버리지)이 0.75 근처인지 확인합니다.`,
        `해석·오류 분석: 홀드아웃 permutation importance, 프로모션 날의 과소예측 여부, 상점 규모별 WAPE, 오차가 가장 큰 30건을 읽고 원인을 메모합니다.`,
        `결과 요약 한 쪽: "GBDT가 seasonal naive 대비 WAPE x% 개선, 선형 대비 y%"와 비용 환산 값을 폴드별 변동(평균 ± 표준편차)과 함께 적습니다.`
      ],
      accept: [
        `5개 폴드 모두에서 최소 다섯 가지 모델(상수·seasonal naive·4주 평균·선형·GBDT)의 WAPE가 표로 제시되고 폴드별 평균과 표준편차가 함께 적혀 있다.`,
        `모든 피처가 예측 지평을 지키며, 오늘 값을 바꿔도 피처가 변하지 않음을 보이는 단위 테스트가 통과한다.`,
        `비대칭 비용(3:1)에서 평균 예측과 분위수 예측의 총비용이 비교되고 분위수 모델의 커버리지가 보고된다.`,
        `최종 요약이 seasonal naive라는 규칙 baseline 대비 개선율을 폴드 변동과 함께 제시하며, GBDT 이득이 변동 범위 안이면 그렇게 해석해 적었다.`
      ],
      stretch: `이력이 없는 신규 상점(cold start)을 일부러 한 곳 추가해 모델이 어떻게 실패하는지 측정하고, 같은 지역·규모 상점의 평균으로 대체하는 fallback 규칙을 추가했을 때 WAPE 변화를 비교하세요.`
    },
    {
      title: `클라이언트 납품 미니 프로젝트: 구독 서비스 이탈 예측 평가 리포트와 모델 카드`,
      scenario: `가상 고객은 월 구독형 콘텐츠 서비스이며 의뢰서는 "이탈 예측 AI, 정확도 90% 이상, 딥러닝으로"입니다. 월 쿠폰 발송 한도 2,000건(실습에서는 규모를 줄여 상위 N명으로 대체), 건당 비용 1,000원, 방지 성공 시 기대 절감 6,000원(가정치)이라고 합니다. 당신은 컨설턴트로서 의뢰 번역, 데이터 감사, 모델링, 평가 리포트, 모델 카드, 인수인계를 납품합니다. 데이터는 랩 1의 생성기를 확장해 만든 "고객 제공 CSV"로 하되, 해지 사유 같은 사후 컬럼 1개, 고객 ID 변형으로 인한 중복 가입 행, 마지막 3개월의 가격 정책 변경으로 인한 분포 이동을 숨겨 놓습니다. 일주일 뒤 생성기 코드를 보지 않고 감사 메모만으로 이 세 가지를 찾아내면 더 좋은 훈련이 됩니다.`,
      steps: [
        `의뢰 번역 1~2쪽: 타깃 정의, 예측 시점·지평, 행동·비용, "정확도 90%"를 수용 기준(시험 구간, 지표, 규칙 baseline 대비 개선, 구간 보고)으로 바꾼 문장, 시험 구간 사전 공개 규칙.`,
        `데이터 감사 메모: 컬럼별 채워지는 시점 표, 중복·결측·분포 점검 결과, 발견한 결함 3종과 조치(제거·병합·재학습 주기 단축).`,
        `재현 저장소를 만듭니다: 환경 고정(uv 또는 pip-tools), 데이터·피처·학습·평가 스크립트, README의 3개 명령 재현 절차, 모든 난수 seed.`,
        `평가를 실행합니다: 시간 분할 + gap, 사다리 4단계(상수·규칙·로지스틱·HistGradientBoosting), PR-AUC·precision@k·비용 환산 이익과 월별 구간.`,
        `고객이 요구한 신경망 비교 실험을 같은 분할로 1개 추가하고(sklearn MLPClassifier 정도로 충분), 결과와 선택 근거를 한 문단으로 적습니다.`,
        `해석·오류 분석: permutation importance, 대표 사례 3건의 설명, 세그먼트별 재현율, 가장 큰 오류 30건 메모.`,
        `분포 점검: 최근 3개월 대 이전 기간의 adversarial validation 결과와 원인 피처, 재학습 주기 제안.`,
        `모델 카드와 한계 문서: 목적·비목적, 데이터·분할·지표·baseline 대비, 한계(쿠폰 효과는 인과가 아님), 모니터링 지표와 재학습 조건.`,
        `납품 패키지를 점검합니다: 평가 리포트(Markdown), 모델 카드, 피처 정의서, 저장소 링크 대체물, 인수인계 체크리스트.`
      ],
      accept: [
        `수용 기준서가 정확도가 아니라 시험 구간·지표(precision@k, 비용 환산 이익)·규칙 baseline 대비 개선으로 쓰여 있고 "보장" 표현이 없다.`,
        `깨끗한 환경에서 README의 3개 명령만으로 평가 리포트의 모든 표가 재현되고(수치 ±0.005 이내), 저장소에 환경 고정 파일이 있다.`,
        `리포트의 모든 점수에 월별 구간이나 fold 표준편차가 병기되며, 규칙 baseline 대비 개선이 비용으로 환산되어 있다.`,
        `감사 메모가 숨겨 둔 결함 세 가지 중 최소 두 가지를 설명과 조치 포함으로 찾아냈고, 모델 카드에 "쿠폰 효과는 별도 실험이 필요함"이 명시된다.`
      ],
      stretch: `쿠폰 효과를 측정하는 A/B 테스트 설계안(무작위 배정 단위, 표본 크기 어림, 지표, 기간) 한 쪽을 추가로 작성하고, LightGBM 또는 XGBoost를 설치해 같은 분할에서 HistGradientBoosting과 점수·학습 시간을 비교해 보세요.`
    }
  ],
  quiz: [
    {
      q: `구독 서비스 고객이 "이탈 예측 정확도 95% 이상"을 요구합니다. 월 이탈률은 5%이고 쿠폰은 한 달에 2,000건만 보낼 수 있습니다. 계약서에 넣을 수용 기준으로 가장 적절한 것은?`,
      choices: [
        `전체 정확도 97% 이상으로 더 높은 목표를 합의해 두고, 달성하지 못하면 무상으로 재작업한다`,
        `합의한 시험 구간에서 월 상위 2,000명의 정밀도와 비용 환산 이익이 현재 규칙 baseline보다 나은지를 기준으로 하고, 점수에는 구간을 병기한다`,
        `ROC-AUC 0.95 이상을 기준으로 바꿔서, 전체 순위 품질이 높은지를 계약의 합격선으로 삼는다`,
        `F1 점수 0.9 이상을 기준으로 바꿔서, 정밀도와 재현율의 균형이 맞는지를 계약의 합격선으로 삼는다`
      ],
      answer: 1,
      why: `이탈률이 5%면 전부 비이탈로 예측해도 정확도가 95%라 정확도는 변별력이 없고, 계약 기준은 행동(상위 2,000명 발송)과 비용에 맞아야 합니다. 가장 그럴듯한 ROC-AUC 0.95는 전체 순위 품질을 말할 뿐 예산 제약과 비용을 반영하지 못하고, 현실적으로 달성하기 어려운 값을 약속하게 만듭니다. F1도 비용이 대칭일 때만 합리적입니다.`
    },
    {
      q: `소매 체인의 일 판매량 예측 모델이 5겹 무작위 KFold 교차검증에서 WAPE 8%를 냈는데 배포 첫 달 실제 WAPE는 21%였습니다. 피처에는 lag_1, lag_7, 28일 이동평균이 있고 검증 행의 인접 날짜가 훈련에 섞여 있습니다. 가장 가능성 높은 원인과 조치는?`,
      choices: [
        `운영 모델이 과소적합이라 점수가 낮은 것이므로, 트리를 더 깊게 하고 라운드를 늘려 재학습한다`,
        `월초 프로모션이 몰린 우연의 영향이므로, seed를 바꿔 CV를 여러 번 돌려 평균 점수를 다시 보고한다`,
        `무작위 분할이 이웃 날짜 정보를 훈련에 넣은 시간 누수이므로, 과거로 학습하고 미래로 평가하는 롤링 오리진 분할에 예측 지평만큼의 gap을 두어 다시 평가한다`,
        `WAPE가 판매량 큰 상점에 쏠린 지표라 어긋난 것이므로, MAPE로 바꿔 다시 측정하면 운영 점수와 맞아떨어진다`
      ],
      answer: 2,
      why: `시계열을 섞어 나누면 시차·이동평균 피처 때문에 검증 행의 이웃이 훈련에 들어가 점수가 낙관적이 됩니다. 평가 분할을 운영 상황(과거로 학습, 미래를 예측)과 맞춰야 합니다. seed를 바꿔 반복하는 방법은 같은 누수를 여러 번 평균할 뿐이고, 모델을 키우면 훈련 쪽만 더 맞춰 격차가 커지며, 지표를 MAPE로 바꾸는 것은 원인과 무관하고 실제값 0에서 오히려 문제를 만듭니다.`
    },
    {
      q: `코드 리뷰 중 다음 코드를 봤습니다.

scaler = StandardScaler().fit(X)
X_s = scaler.transform(X)
X_tr, X_te, y_tr, y_te = train_test_split(X_s, y, test_size=0.2, random_state=0)
model = LogisticRegression().fit(X_tr, y_tr)
print(roc_auc_score(y_te, model.predict_proba(X_te)[:, 1]))

무엇이 문제이며 올바른 수정은 무엇입니까?`,
      choices: [
        `테스트 행의 통계가 스케일러의 평균·표준편차에 들어가는 전처리 누수입니다. 분할을 먼저 하고 훈련 데이터로만 fit 하도록 Pipeline으로 묶어야 합니다`,
        `문제 없습니다. 스케일링은 라벨을 쓰지 않으므로 어떤 경우에도 누수가 아니며, 누수는 타깃 정보가 새는 경우만 뜻합니다`,
        `test_size가 0.2로 작아 점수 분산이 커지는 것이 문제이므로, 0.5로 키우면 해결됩니다`,
        `random_state를 고정해 한 가지 분할만 평가하는 것이 문제이므로, None으로 바꿔 매번 다른 분할을 쓰면 해결됩니다`
      ],
      answer: 0,
      why: `라벨을 쓰지 않아도 테스트 행의 통계가 변환 파라미터에 들어가면 정보가 새고, scikit-learn 문서도 전처리는 훈련 데이터로만 fit 하라고 합니다. 스케일러는 영향이 작을 수 있지만 대치·특징 선택·PCA는 크게 부풀립니다. 가장 그럴듯한 "라벨을 안 쓰니 괜찮다"는 주장은 누수가 라벨을 통해서만 생긴다고 오해한 것입니다. test_size나 random_state는 원인과 무관합니다.`
    },
    {
      q: `이탈 모델(HistGradientBoostingClassifier를 max_leaf_nodes=None, min_samples_leaf=1, max_iter=500으로 설정해 복잡도를 거의 제한하지 않음)의 5겹 교차검증 결과입니다.

fold  train_auc  valid_auc
0     0.999      0.714
1     0.998      0.702
2     0.999      0.721
3     0.999      0.695
4     0.998      0.709

가장 먼저 시도할 조치는?`,
      choices: [
        `트리 깊이와 최대 잎 수를 더 늘려 훈련 AUC를 높이면 검증 AUC도 따라 오르므로 모델 용량을 키운다`,
        `검증 fold 데이터를 훈련 데이터에 합쳐 다시 학습해, 모델이 더 많은 데이터를 보게 만든다`,
        `피처를 더 추가해 편향을 줄이면 검증 점수와의 격차도 함께 줄어든다고 보고 피처 엔지니어링부터 한다`,
        `훈련-검증 격차가 큰 분산 문제이므로 최소 잎 표본 수·최대 잎 수 제한, 학습률 하향과 조기 종료, 정규화를 적용하고 격차가 줄어드는지 확인한다`
      ],
      answer: 3,
      why: `훈련 0.999에 검증 약 0.71이라는 큰 격차는 과적합(분산)의 전형이고 처방은 복잡도 제한과 정규화입니다. 복잡도를 늘리는 것은 처방이 반대이고, 피처를 더 넣는 것은 편향 문제의 처방입니다. 검증 fold를 합쳐 재학습하면 검증 점수를 더 이상 믿을 수 없게 되어 문제를 가립니다.`
    },
    {
      q: `이탈 예측 확률이 잘 보정되어 있다고 가정합니다. 쿠폰 한 장 비용은 1,000원이고, 이탈 확률 p인 고객에게 보내면 기대 절감액이 p × 6,000원입니다. 기대 이익이 비용을 넘기 시작하는 가장 낮은 이탈 확률은?`,
      choices: [
        `0.50, 분류기의 기본 임계값을 그대로 쓰는 것이 가장 안전하다`,
        `0.05, 전체 이탈률보다 이탈 확률이 높은 고객에게는 모두 보낸다`,
        `약 0.17, 쿠폰 비용 1,000원을 기대 절감액 6,000원으로 나눈 값`,
        `약 0.83, 순이익 5,000원을 기대 절감액 6,000원으로 나눈 값`
      ],
      answer: 2,
      why: `p × 6,000 − 1,000 ≥ 0 이면 p ≥ 1/6 ≈ 0.167입니다. 기본값 0.5는 비용 구조와 무관한 관례일 뿐이라 이익이 나는 대상 상당수를 놓칩니다. 가장 그럴듯한 0.83은 비율을 뒤집어 계산한 오류입니다. 이 공식은 확률이 보정되어 있다는 전제에서만 유효합니다.`
    },
    {
      q: `우편번호(약 3,000종) 피처를 인코딩하는 다음 코드를 쓴 뒤, 훈련 데이터를 다시 나눈 검증의 AUC는 0.93이었지만 시간 분할 테스트에서는 0.71이었습니다.

enc = TargetEncoder(smooth="auto")
enc.fit(X_tr[["zip"]], y_tr)
Z_tr = enc.transform(X_tr[["zip"]])
Z_te = enc.transform(X_te[["zip"]])

가장 가능성 높은 원인은?`,
      choices: [
        `smooth="auto"의 평활화가 AUC를 항상 낮추므로, smooth를 0으로 바꾸면 해결된다`,
        `fit 뒤 같은 훈련 데이터에 transform하면 교차적합이 없어 각 행의 자기 라벨이 인코딩에 섞인다. fit_transform(X_tr, y_tr)을 쓰고 가능하면 Pipeline 안에 둔다`,
        `우편번호 같은 범주형은 LabelEncoder의 정수 코드로 바꾸면 라벨 정보가 들어가지 않으므로 해결된다`,
        `고카디널리티 범주 피처는 시간 분할에서 원래 AUC가 0.7 정도를 넘기 어려우므로 정상적인 결과다`
      ],
      answer: 1,
      why: `scikit-learn 문서는 fit_transform이 훈련 데이터를 교차적합으로 인코딩해 목표 정보 누수를 막고, fit 후 같은 데이터에 transform하는 방식은 누수를 만들 수 있어 권하지 않는다고 설명합니다. 희귀 범주일수록 자기 라벨이 인코딩 값에 그대로 박혀 과적합됩니다. smooth를 0으로 줄이면 오히려 소표본 범주의 누수가 커지고, 정수 코드는 근거 없는 순서를 만듭니다.`
    },
    {
      q: `XGBoost를 max_depth=12, eta=0.3, subsample=1.0으로 최대 500 라운드까지 학습한 로그입니다(검증은 시간순으로 뒤쪽 20%).

[0]    train-logloss:0.4112  valid-logloss:0.4190
[50]   train-logloss:0.2301  valid-logloss:0.3478
[120]  train-logloss:0.1405  valid-logloss:0.3402
[200]  train-logloss:0.0723  valid-logloss:0.3611
[400]  train-logloss:0.0189  valid-logloss:0.4208

가장 적절한 조치는?`,
      choices: [
        `시간순 검증 구간으로 조기 종료를 걸고, eta를 낮추며 max_depth·min_child_weight·subsample 같은 복잡도 관련 파라미터를 조인다`,
        `훈련 손실이 계속 내려가므로 아직 덜 학습된 것이라 보고, 라운드를 2,000까지 늘려 더 학습시킨다`,
        `검증을 무작위 20%로 바꿔 검증 손실이 더 오래 내려가는 곡선을 얻고, 그 곡선으로 최적 라운드를 정한다`,
        `검증 손실의 상승은 변동에 의한 노이즈이므로, 500라운드까지 돌린 마지막 모델을 그대로 사용한다`
      ],
      answer: 0,
      why: `검증 손실이 120라운드 근처에서 최저이고 이후 올라가는 것은 과적합이므로, 최적 라운드에서 멈추는 조기 종료와 복잡도 제한이 처방입니다. 라운드를 늘리면 격차만 커지고, 무작위 검증은 시간 누수로 곡선을 아름답게 만들 뿐 문제를 가립니다. 가장 쉬운 선택인 "마지막 모델 사용"은 200·400라운드에서 일관되게 악화되는 추세를 노이즈로 오판한 것입니다.`
    },
    {
      q: `테스트 세트의 permutation importance 결과 sessions_7d와 sessions_30d(상관계수 0.95)는 둘 다 점수 하락이 0.001 이하였습니다. 팀원은 "접속 피처는 쓸모없으니 제거하자"고 합니다. 무엇이 잘못됐고 어떻게 확인해야 합니까?`,
      choices: [
        `잘못된 것이 없다. permutation importance가 0에 가까우면 어떤 경우에도 그 피처에는 정보가 없으므로 제거해도 된다`,
        `permutation importance는 훈련 세트에서만 의미가 있으므로, 훈련 세트로 다시 계산하면 두 피처의 중요도가 올바르게 나온다`,
        `SHAP으로 바꾸면 상관 피처의 고유 기여가 정확히 분리되므로 이런 문제가 생기지 않는다`,
        `상관된 짝이 서로를 대신하므로 한쪽을 섞어도 점수가 거의 떨어지지 않은 것이다. 상관 군집을 함께 섞거나 두 피처를 모두 뺀 모델을 재학습해 비교해야 한다`
      ],
      answer: 3,
      why: `scikit-learn 문서는 상관 피처 중 하나를 섞어도 모델이 짝을 통해 정보를 얻으므로 둘 다 중요도가 낮게 나올 수 있다고 경고하며, 군집으로 묶어 다루라고 권합니다. 훈련 세트에서 계산하면 오히려 과적합된 피처를 중요하다고 말하게 됩니다. SHAP도 상관 피처는 기여를 나눠 갖기 때문에 "정확히 분리"된다는 주장은 틀렸고, 가장 그럴듯한 "0이면 무정보"는 이 모델이 의존하지 않는다는 뜻일 뿐입니다.`
    },
    {
      q: `사기 탐지 데이터(양성 0.3%, 20만 행)를 다음 순서로 처리했고 5겹 교차검증 재현율이 0.91이 나왔습니다.

X_res, y_res = SMOTE().fit_resample(X, y)
scores = cross_val_score(model, X_res, y_res, cv=5, scoring="recall")

무엇이 문제입니까?`,
      choices: [
        `SMOTE는 범주형 피처가 섞인 데이터에서만 문제가 되며, 수치형만 있으면 이 순서가 맞다`,
        `합성 양성이 원본 양성의 이웃 보간이라 검증 fold에도 같은 양성에서 파생된 샘플이 섞이고 검증 분포도 실제 0.3%가 아니다. 리샘플링은 훈련 fold 안에서만 하고 검증은 원래 분포로 한다`,
        `재현율은 불균형 데이터에서 불안정한 지표이므로, 정확도로 바꿔 평가하면 해결된다`,
        `fold 수 5가 너무 작아 점수 분산이 큰 것이 문제이므로, 100겹으로 늘리면 해결된다`
      ],
      answer: 1,
      why: `교차검증 이전에 리샘플링하면 합성 샘플과 그 근원 샘플이 훈련·검증에 갈라져 들어가 누수가 되고, 검증 양성 비율도 인위적으로 높아집니다. 리샘플링은 fold 내부(예: imbalanced-learn의 Pipeline)에서 훈련 쪽에만 적용하고 평가는 원분포로 합니다. 정확도로 바꾸면 불균형에서 더 무의미해지고, fold 수는 원인과 무관합니다.`
    },
    {
      q: `6개월 전 배포한 이탈 모델의 월별 precision@2000이 0.31에서 0.19로 내려갔습니다. 라벨은 30일 뒤에야 확정됩니다. 최근 3개월 입력과 훈련 입력을 구분하는 adversarial validation의 AUC가 0.82이고 가격 관련 피처 하나가 단독으로 0.80을 만듭니다. 가장 적절한 다음 단계는?`,
      choices: [
        `가격 정책 변경에 따른 분포 이동을 의심해 해당 피처의 정의·분포 변화를 확인하고, 최근 데이터를 포함해 재학습한 뒤 시간 분할로 검증하며 같은 점검을 월간 모니터링에 넣는다`,
        `임계값을 낮춰 발송 건수를 예산 한도 이상으로 늘리는 방식으로, 놓치는 이탈자를 줄여 정밀도 하락을 보완한다`,
        `GBDT가 불안정하다고 결론짓고, 분포 변화에 덜 민감하다고 알려진 선형 모델로 교체해 문제를 해결한다`,
        `adversarial AUC는 라벨을 쓰지 않으므로 성능 저하와 무관한 지표라고 판단하고, 라벨이 확정될 때까지 조치를 미룬다`
      ],
      answer: 0,
      why: `adversarial AUC는 입력 분포의 이동을 라벨 확정 전에 알려 주는 선행 경보이고, 단일 피처 AUC가 원인 피처를 지목합니다. 처방은 원인 확인, 최근 데이터 재학습, 시간 분할 검증, 모니터링 편입입니다. "라벨을 안 쓰니 무관"이라는 가장 그럴듯한 반론은 바로 그 점이 장점(라벨 지연 동안 사용 가능)인 것을 놓칩니다. 임계값 조정은 원인을 건드리지 않고 발송 비용만 늘리며, 모델을 바꾼다고 이동한 입력이 해결되지는 않습니다.`
    },
    {
      q: `고객이 "표 데이터 2만 행, 피처 80개인 이탈 예측을 딥러닝으로 만들어 주세요. GBDT는 구식입니다"라고 요구합니다. 가장 좋은 대응은?`,
      choices: [
        `요구대로 신경망만 만들어 납품한다. 고객이 수단까지 지정했으므로 GBDT 비교는 범위 밖이고 일정도 줄어든다`,
        `이 규모의 표 데이터에서는 딥러닝이 무조건 불가능하다고 설명하고, 연구 근거를 들어 요구를 거절한다`,
        `같은 시간 분할·지표로 baseline 사다리(규칙·로지스틱·GBDT)와 신경망을 비교하는 실험을 범위에 넣고, 비용 환산 개선을 채택 기준으로 하며 트리가 강하다는 근거(Grinsztajn 외 2022 프리프린트)를 함께 설명한다`,
        `GBDT가 더 낫다는 것을 아는 전문가로서 GBDT만 납품하고, 고객이 신경망 결과를 따로 묻기 전에는 비교 실험을 하지 않는다`
      ],
      answer: 2,
      why: `고객의 요구는 수단이고 목표는 비용 환산 개선입니다. 같은 조건에서 비교한 결과로 설득하는 것이 신뢰를 쌓는 방법입니다. 신경망만 만들고 비교를 생략하면 더 나은 선택지를 검증 없이 버리고, "무조건 불가능"은 과장이며 근거(프리프린트이고 중간 규모에 한정됨)를 넘어섭니다. 묻지 않으면 안 한다는 태도는 고객이 요구한 사항에 대한 투명성을 해칩니다.`
    },
    {
      q: `일 단위 시계열 하나(한 행 = 하루)에서 라벨은 "이후 14일 안에 장애가 났는가"입니다. 날짜순으로 정렬한 데이터를 다음처럼 평가하려 합니다.

cv = TimeSeriesSplit(n_splits=5)
scores = cross_val_score(model, X_sorted, y_sorted, cv=cv, scoring="average_precision")

어떻게 고쳐야 합니까?`,
      choices: [
        `고칠 필요가 없다. TimeSeriesSplit은 어떤 라벨 정의에서도 미래 정보를 완전히 차단한다`,
        `n_splits를 14로 바꾸면 폴드가 14개로 늘어 라벨 지평만큼 간격이 생긴다`,
        `KFold(shuffle=True)로 바꿔 분포가 섞이도록 하면 시간에 따른 편향이 사라진다`,
        `TimeSeriesSplit(n_splits=5, gap=14)처럼 훈련 구간 끝 14일을 비운다. 훈련 끝 14일 행의 라벨은 이미 검증 구간 날짜의 사건으로 정해지기 때문이다`
      ],
      answer: 3,
      why: `TimeSeriesSplit은 행의 시간 순서만 지키며 라벨이 미래 구간을 바라보는 겹침까지 자동으로 막지는 않습니다. gap은 각 훈련 세트의 끝에서 제거할 샘플 수이므로 라벨 지평(14일)만큼 비워야 합니다. n_splits는 폴드 개수일 뿐 간격과 무관하고, 셔플은 시간 순서를 파괴해 누수를 만듭니다. "항상 차단한다"는 가장 그럴듯한 믿음이 바로 이 사고의 원인입니다.`
    }
  ],
  refs: [
    {
      title: `Rules of Machine Learning: Best Practices for ML Engineering (Martin Zinkevich, Google)`,
      url: `https://developers.google.com/machine-learning/guides/rules-of-ml`,
      kind: `doc`,
      why: `ML 없이 먼저 출시하라(Rule #1), 지표를 일찍 설계하라(#2), 첫 모델은 단순하게(#4), 조용한 실패를 감시하라(#10), 학습-서빙 스큐를 줄여라(#29~#32, #37), 출시 결정은 여러 지표로 하라(#39)를 포함한 43개 규칙의 원문입니다. 레슨 1의 baseline 사다리와 레슨 6의 스큐 논의의 출처로 읽습니다(페이지에 날짜 미표기).`
    },
    {
      title: `An Introduction to Statistical Learning (ISL/ISLP, James·Witten·Hastie·Tibshirani·Taylor)`,
      url: `https://www.statlearning.com/`,
      kind: `book`,
      why: `R판(2판, 2021)과 Python판(ISLP, 2023)이 있고 장마다 실습이 붙은 입문서이며 PDF를 무료로 내려받을 수 있다고 안내합니다(2026-11 열람). 회귀·분류·리샘플링·트리·SVM·비지도 학습을 다루므로, 이 모듈이 깊게 다루지 않은 SVM과 PCA·군집 같은 비지도 학습은 해당 장에서 보충하세요.`
    },
    {
      title: `scikit-learn User Guide: Common pitfalls and recommended practices`,
      url: `https://scikit-learn.org/stable/common_pitfalls.html`,
      kind: `doc`,
      why: `전처리·특징 선택 누수를 잡음 데이터 실험으로 보여 주고(분할 전 선택 시 0.76 vs 기대 0.5), Pipeline 사용과 random_state 관리 원칙을 정리합니다. 2026-11 열람 시 문서 버전은 1.9.1입니다.`
    },
    {
      title: `scikit-learn User Guide: Cross-validation: evaluating estimator performance`,
      url: `https://scikit-learn.org/stable/modules/cross_validation.html`,
      kind: `doc`,
      why: `StratifiedKFold·GroupKFold·StratifiedGroupKFold·TimeSeriesSplit의 동작과 i.i.d. 가정 경고, cross_val_predict의 한계, 튜닝 누수 경고를 한 곳에서 확인할 수 있습니다.`
    },
    {
      title: `scikit-learn User Guide: Ensembles (Random Forests, HistGradientBoosting)`,
      url: `https://scikit-learn.org/stable/modules/ensemble.html`,
      kind: `doc`,
      why: `히스토그램 GBDT의 결측·범주형 네이티브 지원, 조기 종료 기본 동작(표본 1만 건 초과), 단조 제약과 그 한계, 랜덤포레스트 max_features의 경험적 기본값과 oob_score, MDI 중요도의 편향 경고가 실려 있습니다. 2026-11 열람 시 문서 버전은 1.9.1입니다.`
    },
    {
      title: `scikit-learn User Guide: Metrics and scoring: quantifying the quality of predictions`,
      url: `https://scikit-learn.org/stable/modules/model_evaluation.html`,
      kind: `doc`,
      why: `average_precision_score의 정의(보간하지 않는 합이며 사다리꼴 선형 보간은 낙관적일 수 있음), ROC-AUC, F-beta, 그리고 불균형에서 정확도가 우연 수준 1/클래스 수로 내려가도록 만든 balanced accuracy의 정의를 확인합니다.`
    },
    {
      title: `scikit-learn User Guide: Probability calibration`,
      url: `https://scikit-learn.org/stable/modules/calibration.html`,
      kind: `doc`,
      why: `보정 곡선(reliability diagram), sigmoid와 isotonic의 선택 기준(대략 1,000표본 이상에서 isotonic), CalibratedClassifierCV가 교차검증으로 보정 데이터를 분리하는 이유, isotonic이 동점을 만들어 순위 지표를 바꿀 수 있다는 점, Brier 점수의 한계를 설명합니다. 모델별 보정 경향은 문서의 합성 데이터 예시일 뿐 일반 법칙이 아닙니다.`
    },
    {
      title: `scikit-learn User Guide: Permutation feature importance`,
      url: `https://scikit-learn.org/stable/modules/permutation_importance.html`,
      kind: `doc`,
      why: `홀드아웃에서 계산하는 이유, n_repeats로 얻는 분산, 상관 피처에서 중요도가 낮게 나오는 문제와 군집 해법을 문서 예제로 확인합니다.`
    },
    {
      title: `scikit-learn User Guide: Preprocessing data (TargetEncoder 절)`,
      url: `https://scikit-learn.org/stable/modules/preprocessing.html`,
      kind: `doc`,
      why: `타깃 인코딩의 평활화 식, fit_transform의 교차적합과 fit 후 transform이 누수를 만드는 이유, 훈련에 없던 범주의 처리를 설명합니다.`
    },
    {
      title: `XGBoost: A Scalable Tree Boosting System (Chen & Guestrin, arXiv 2016)`,
      url: `https://arxiv.org/abs/1603.02754`,
      kind: `paper`,
      why: `희소성 인지 분할 알고리즘, 가중 분위수 스케치, 캐시·압축 같은 시스템 설계를 제시한 XGBoost의 원 논문입니다. 페이지의 Comments에 KDD'16이 적혀 있고 관련 DOI가 표시됩니다. 열람한 것은 초록 페이지이며, 목적함수 유도는 이 목록의 XGBoost 공식 문서 항목과 함께 읽으세요.`
    },
    {
      title: `LightGBM Documentation: Parameters Tuning`,
      url: `https://lightgbm.readthedocs.io/en/stable/Parameters-Tuning.html`,
      kind: `doc`,
      why: `leaf-wise 성장에서 num_leaves를 2^max_depth보다 작게 두라는 지침, min_data_in_leaf의 역할, 과적합을 줄이는 파라미터 목록(max_bin, bagging, feature_fraction, 정규화)을 담고 있습니다.`
    },
    {
      title: `A Unified Approach to Interpreting Model Predictions (SHAP, Lundberg & Lee, arXiv 2017)`,
      url: `https://arxiv.org/abs/1705.07874`,
      kind: `paper`,
      why: `Shapley 값을 가산적 피처 기여도로 통합한 SHAP의 원 논문입니다(페이지에 NIPS 2017 게재 예정으로 표기). 초록 수준만 열람했으므로 공리와 근사 방법은 본문에서 확인하세요.`
    },
    {
      title: `Why do tree-based models still outperform deep learning on tabular data? (Grinsztajn, Oyallon, Varoquaux, arXiv 2022)`,
      url: `https://arxiv.org/abs/2207.08815`,
      kind: `paper`,
      why: `45개 표 데이터셋에서 트리 기반 모델이 중간 규모(초록 기준 대략 1만 표본)에서 최고였다는 벤치마크 프리프린트이며 venue는 미표기입니다. "딥러닝으로 해 달라"는 요구에 근거를 설명할 때 한계(프리프린트, 특정 벤치마크)와 함께 인용하세요.`
    },
    {
      title: `XGBoost Documentation: Introduction to Boosted Trees`,
      url: `https://xgboost.readthedocs.io/en/stable/tutorials/model.html`,
      kind: `doc`,
      why: `목적함수를 손실과 복잡도 벌점(리프 수 γ, 리프 가중치 L2 λ)으로 쓰고, 2차 테일러 근사의 기울기·헤시안 합으로 최적 리프 값과 분할 이득을 구하며, 이득이 γ보다 작으면 분할하지 않는 가지치기까지 유도합니다. 기본 eta 0.3·max_depth 6·scale_pos_weight 제안값은 같은 사이트의 XGBoost Parameters 페이지에서 2026-11에 확인했습니다. 페이지에 버전 표기는 없습니다.`
    }
  ],
  gigs: [
    `고객이 자주 하는 가정: "AI로 예측해 주세요", "정확도 N% 이상", "최신 딥러닝으로". 견적 전에 확인할 것: 타깃 정의(해지 vs 휴면), 예측 시점과 지평, 예측으로 하는 행동과 건당 비용, 현재 쓰는 규칙·수작업의 성능(baseline), 데이터가 어느 시점의 스냅샷인지와 컬럼별 채워지는 시점, 라벨이 확정되기까지의 지연, 개인정보 포함 여부. 이 목록이 채워지지 않으면 견적이 아니라 "문제 정의 선행 1주"를 별도 단계로 제안합니다.`,
    `시장에는 이런 안내가 있습니다(2026-11 크몽 데이터·ML·DL 카테고리 열람). 의뢰 절차는 데이터 전달 → EDA → 모델 → 평가 → 배포(선택)이고 일반 비용 범위를 약 30–200만 원(분석 30–80만, 모델 개발 80–200만 원으로 구분)으로 안내하고, 재현 코드·전처리 파이프라인·평가 리포트를 요구하라고 권합니다. 가격은 비교용 기준점일 뿐 데이터 상태와 범위로 크게 달라지며 시장 가격은 수시로 바뀝니다. 평가 리포트와 재현 코드를 견적서에 납품물로 명시하는 것이 차별점이자 분쟁 방어 수단입니다.`,
    `견적은 단계로 쪼갭니다: 문제 정의·데이터 감사, 분할과 baseline 구축, 모델링과 튜닝, 해석·오류 분석, 리포트·모델 카드·재현 저장소, (선택) 배포·모니터링. "정확도 N% 보장" 대신 "합의한 시험 구간에서 수용 기준서의 지표를 충족"으로 계약합니다. 공수 분배의 출발점으로 데이터 감사와 평가 설계에 전체의 25~35%를 잡는 가정을 두되(작성자의 가정치이므로 프로젝트에 맞게 조정) 데이터 품질이 낮을수록 늘어납니다.`,
    `전형적인 함정: (1) 고객 CSV의 사후 컬럼(해지 사유, 환불액)이 점수를 부풀림 → 컬럼별 시점 표를 먼저 요구. (2) 시험 구간(holdout)을 개발자에게 미리 공개해 튜닝 누수 → 고객이 보관하거나 납품 직전 공개. (3) 양성이 수십 건인 소표본에서 소수점 차이로 모델 선택 → 구간 보고와 단순 모델 권고. (4) "예측이 맞으면 쿠폰이 성공"이라는 믿음 → 인과 효과는 A/B 테스트로 별도 제안. (5) 환경 미고정으로 재학습 시 결과가 달라짐 → 라이브러리·seed·데이터 버전 고정.`,
    `납품물 체크리스트: 수용 기준서(시험 구간·지표·baseline), 데이터 감사 메모, 피처 정의서(계산 시점 포함), 재현 저장소(환경 고정 파일, 3개 명령 재현), 평가 리포트(사다리 표·구간·비용 환산·오류 분석·한계), 모델 카드, 운영 계획(월별 지표, 분포 점검, 재학습 조건). 학습한 모델을 pickle·joblib로 넘긴다면 신뢰할 수 있는 출처의 파일만 불러와야 한다는 점과 학습·서빙의 라이브러리 버전 일치를 인수인계 문서에 적습니다.`,
    `"딥러닝으로"라는 요구에는 거절이 아니라 같은 분할과 지표로 사다리와 신경망을 비교하는 실험을 범위에 넣어 수치로 답합니다. 표형 데이터에서 트리 계열이 강하다는 근거(Grinsztajn 외 2022 프리프린트)는 설득 재료이지 증명이 아니므로 고객 데이터에서 직접 보여 주는 것이 가장 강합니다. 이 모듈에서 다루지 않은 SVM·비지도 학습 요구가 오면 ISLP로 보충하고 범위가 크면 별도 견적으로 분리합니다.`,
    `유지보수 계약에는 "월별 precision@k와 입력 분포 점검 리포트", "분포 이동 경보 시 재학습 1회", "수용 기준 변경은 변경 요청", "라벨 확정 지연(예: 30일) 때문에 성능 판정이 늦어진다는 설명"을 넣으세요. 운영 후 성능이 내려갔을 때 입력 이동(adversarial validation)과 라벨 이동을 구분해 보고할 수 있으면 책임 소재를 둘러싼 분쟁이 크게 줄어듭니다.`
  ]
};
