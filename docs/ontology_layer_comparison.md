# 온톨로지 레이어 비교 분석 — datastrate 3편 vs wiki-core

> **작성자**: 머큐리 (wiki-core 코어 아키텍트)
> **작성일**: 2026-05-04
> **세션**: Mercury 20차 (Phase 4-A 양 도메인 종결 직후, plott 합류 대기 중)
> **목적**: 외부 온톨로지 모범 패턴 (datastrate 블로그 3편 + Palantir Foundry docs) 과 현재 wiki-core 의 정합성 검토. *코어 변경은 보류* (행동 원칙 #5 YAGNI) — Phase 5+ evolution reference 박제.

---

## 0. 출처

| # | 글 | 핵심 |
|---|---|---|
| 1 | [온톨로지의 세 가지 레이어: 시맨틱, 키네틱, 다이내믹](https://m.blog.naver.com/datastrate/224251145826) | Palantir 3 레이어 + 폐쇄 루프 (감지→숙고→실행→관찰) |
| 2 | [온톨로지(Ontology) 개념과 중요성](https://m.blog.naver.com/datastrate/224251125739) | 온톨로지 정의 + 3 핵심 (객체/관계/액션) + AI 시대 가치 4종 |
| 3 | [DB는 숫자를 알지만 의미를 모른다 — 온톨로지가 데이터 아키텍처를 확장하는 방식](https://m.blog.naver.com/datastrate/224253511437) | (DB=Fact) + (온톨로지=Context) ⇒ Intelligence. Concept/Relation/Rule + RDF/OWL/SWRL/SPARQL + LLM 하이브리드 |

---

## 1. 글 3편 핵심 추출

### 1.1 Article 2 — 온톨로지 개념 (기초)

- 정의: 도메인 개념·용어·관계·제약을 *기계가 읽을 수 있게* 정리한 **공유 개념 모델**
- 핵심 3 구성요소:
  - **객체 (Object/Entity)**: 현실 세계의 명사 (고객/주문/기계/계약)
  - **관계 (Link/Relation)**: 객체 간 연결 ("고객은 주문을 한다")
  - **액션 (Action)**: 객체에 수행할 업무 동작 (승인/배포/수정/삭제)
- Palantir 정의: 온톨로지 = 조직 운영 현실의 **디지털 트윈**
- AI 시대 가치 4종:
  1. **Single Source of Truth** — 부서별 다른 정의 통합
  2. **LLM 환각 해결** — 검증된 사실 기반 응답
  3. **다단계 추론 (Multi-hop)** — 관계 따라 단계적 추론
  4. **데이터 거버넌스** — 규칙·제약 시스템적 검증

### 1.2 Article 3 — Semantic Layer 심화

- **공식**: (DB = 기억) + (온톨로지 = 이해) ⇒ 지능형 서비스
- RDB vs 온톨로지:
  - RDB = Fact (구조화/원자적/검증). What/How many. CWA (Closed World — 없으면 거짓)
  - 온톨로지 = Context. Why/What-if. OWA (Open World — 모르면 추론)
- 온톨로지 3 핵심:
  - **Concept (개념·계층)**: 클래스 + 상하위 (`subClassOf`). 예: `:DiabeticNephropathyRiskPatient ⊂ :DiabeticPatient ⊂ :ChronicDiseasePatient ⊂ :Patient`
  - **Relation (관계·트리플)**: 주어-술어-목적어. JOIN ≠ Relation (JOIN은 "같은 값 찾아 붙임" / Relation은 "이 둘은 이런 관계" 지식)
  - **Rule (규칙·IF-THEN)**: 자동 추론. 규칙 연쇄 (Chaining) — 단순 규칙 조합으로 복잡 판단 도출
- W3C Semantic Web 표준: **RDF + OWL + SWRL + SPARQL**
  - RDF — 트리플 기록
  - OWL — 클래스·속성·제약 정의
  - SWRL — IF-THEN 규칙
  - SPARQL — 의미 기반 질의 ("고위험 당뇨병성 신증" 개념 직접 검색)
- LLM + Semantic Layer = **Neuro-Symbolic AI 하이브리드**
  - LLM: 자연어 이해 + 환각 ↔ Semantic Layer: 추론 + 결정 설명
  - 흐름: 자연어 입력 → LLM 파싱 → Semantic Layer 질의 → SWRL 추론 → SPARQL 조회 → LLM 자연어 정리

### 1.3 Article 1 — 온톨로지 3 레이어 (advanced)

| 레이어 | 역할 | 언어 비유 | 주요 구성 | 담당 |
|---|---|---|---|---|
| **시맨틱 (Semantic)** | "세계를 정의하다" | 명사 (Nouns) | 객체·속성·관계 | 데이터/도메인 설계자 |
| **키네틱 (Kinetic)** | "현실과 연결하다" | 동사 (Verbs) | 액션·함수·**라이트백** | 데이터 엔지니어 |
| **다이내믹 (Dynamic)** | "미래를 시뮬레이션하다" | 가정문 (What-if) | **시나리오·규칙·접근제어·시뮬레이션** | 비즈니스 분석가/AI |

- **키네틱 = 컨트롤 플레인** — 모든 운영 소프트웨어의 보편 컨트롤. 핵심 비즈니스 로직 변경 시 레거시 시스템 재개발 X
- **다이내믹 = 디지털 샌드박스** — What-if 시뮬레이션. 시나리오 자체가 객체로 저장 → 협업 → 적용(Apply) 시 키네틱으로 전달
- **폐쇄 루프 (Closed-loop)**: 감지(시맨틱) → 숙고(다이내믹) → 실행(키네틱) → 관찰(시맨틱 피드백)
- 진화: *기록 시스템(System of Record)* → *행동·결정 시스템(System of Action and Decision)*

---

## 2. wiki-core 와 line-by-line 비교

### 2.1 정합 매트릭스

| # | 글 패턴 | wiki-core 매핑 | 평가 |
|---|---|---|---|
| 1 | 객체 / 속성 / 관계 (Article 2·3) | `WikiObject` / `WikiAttribute` / `WikiRelation` | ✅ **정합** |
| 2 | 액션 (Article 2 — 업무 동작 = 승인/배포) | `WikiEvent` (*발생 사실* — 출하/M&A/금리결정) | ⚠ **의미 차이** — Mercury 1차 *의도된 선택* (위키 = 기록 시스템 우선) |
| 3 | 시맨틱 레이어 (Article 1 — 명사 정의) | `WikiPlugin.manifest` (`objectTypes` / `attributeKeys` / `relationTypes` / `eventTypes` / `labelSets`) | ✅ **정합** |
| 4 | 트리플 주어-술어-목적어 (Article 3) | `WikiRelation` (`from_id` / `to_id` / `type`) | ✅ **정합** (트리플 그대로) |
| 5 | Single Source of Truth (Article 2) | `WikiObject.id` 단일 + `WikiProvenance` | ✅ **정합** |
| 6 | **Concept 계층 (subClassOf)** (Article 3) | `kind` 단일 평면 — 상하위 관계 X | ❌ **미반영** ★ |
| 7 | **Rule 엔진 (IF-THEN 자동 추론)** (Article 3·SWRL) | hook 으로 plugin 자체 구현 가능 / 코어 추론 엔진 X | ❌ **미반영** ★★ |
| 8 | JOIN ≠ Relation (Article 3) | Relation 자체에 `type` 메타데이터 — *왜 연결되는지* 표현 가능 | ✅ **정합** (Rule 엔진 결합 시 진가) |
| 9 | OWA (Open World Assumption) (Article 3) | 가정 명시 X — plugin 자유 / 추론 엔진 미장착이라 OWA 활용 가치 미실현 | ⚠ **부분** |
| 10 | **키네틱 — 라이트백** (Article 1) | plugin 측 자체 구현 (rootric Vercel/Supabase write / enroute Sheets write) / 코어 *외부 시스템 라이트백 hook* X | ❌ **미반영** ★★ |
| 11 | **다이내믹 — 시나리오/시뮬레이션** (Article 1) | wiki-core 자체 *What-if 시나리오 객체화* 메커니즘 X | ❌ **미반영** ★★★ (가장 큰 누락) |
| 12 | 폐쇄 루프 (감지→숙고→실행→관찰) (Article 1) | *감지(시맨틱)* 만 박제. 숙고/실행/관찰 미박제 | ❌ **미반영** |
| 13 | LLM + Semantic Layer 하이브리드 (Article 3) | router (Tier-variable LLM 호출) 만 박제. *자연어→의미 검색→결과 자연어 정리* 워크플로우 X | ⚠ **부분** |
| 14 | LLM 환각 해결 / 다단계 추론 / 거버넌스 (Article 2) | `accessControl` + `provenance` 거버넌스 ✅ / 다단계 추론·환각 해결 메커니즘 X | ⚠ **부분** |
| 15 | RDF/OWL/SWRL/SPARQL 표준 (Article 3) | Postgres relational schema 만 채택 (트리플 그래프 X) | ⚠ **의도된 결정** (도메인 owner 친숙도 + Supabase RLS / Vercel ecosystem) |

### 2.2 정합·미반영 요약

#### ✅ 정합 (이미 구현)
- 4요소 (Object / Attribute / Relation / Event) — Palantir 모범 패턴 그대로
- 시맨틱 레이어 (manifest + label_set + provenance)
- Single Source of Truth 메커니즘
- WikiRelation 트리플 구조

#### ⚠ 부분 정합 (의도된 선택)
- 액션 vs 이벤트 의미 차이 (Mercury 1차 의도된 결정)
- RDF/OWL 미채택 (Postgres relational 의도된 선택)
- OWA 가정 명시 X (plugin 자유)

#### ❌ 미반영 (보강 가치 검토)
- Concept 계층 (subClassOf)
- Rule 엔진 (IF-THEN 자동 추론)
- 키네틱 라이트백 hook
- 다이내믹 레이어 시나리오 시뮬레이션 (★ 가장 큰 누락)
- 폐쇄 루프 (숙고/실행/관찰)
- LLM + Semantic Layer 하이브리드 워크플로우

---

## 3. 보강 가치 Tier 분류 + 행동 원칙 정합 검토

### 3.1 Tier S — 결정적 누락

#### 다이내믹 레이어 (What-if 시나리오 시뮬레이션)
- *"기록 시스템 → 결정 시스템"* 진화의 핵심 단절
- plugin 영역 가능? **어렵다 (cross-cutting)** — 시나리오 객체화 + 협업 + Apply 메커니즘 모두 코어 영역
- 코어 추가 가치: **★★★ 높음** — 신규 패키지 후보 (`@wiki-core/scenario`)
- 행동 원칙 #5 YAGNI: ⚠ 도메인 owner 실제 신호 0건 (현재) — 보류
- 적용 시점: 도메인 owner 가 시나리오 분기 (rootric "10대 KPI 만약 변경 시 영향" / plott "약국 매출 What-if" / enroute "freedom 점수 시나리오") 명시 신호 도착 시

### 3.2 Tier A — 보강 가치 있음

#### Rule 엔진 (IF-THEN 자동 추론)
- SWRL 같은 표준 채택 또는 자체 패턴
- plugin 영역 가능? **어렵다 (cross-cutting)** — 도메인 측 자체 구현 흔적 있음 (rootric "factsheet 가설 코드" / plott "약사 인사말 분류" / enroute "freedom 점수 자동 계산")
- 코어 추가 가치: **★★ 높음** — 신규 패키지 후보 (`@wiki-core/inference`) 또는 hook 추가 (`onAttributeWrite` 확장)
- 행동 원칙 #5 YAGNI: ⚠ 도메인 측 자체 구현이 *3 도메인 모두 발생* 함 → *공통 패턴* 박제 가치 있음. 단 도메인 owner 가 *코어 추론 엔진 필요* 명시 신호 대기

#### 키네틱 라이트백 hook
- 외부 운영 시스템 (ERP / 주문 / 알림) 으로 결정 라이트백
- plugin 영역 가능? **가능** (현재 plugin 측 처리 — rootric Vercel write, enroute Sheets write)
- 코어 추가 가치: **★ 중간** — `onWriteback` hook 추가 (semver minor additive). plugin 측 통일 패턴 박제로 가이드 명확성 ↑
- 행동 원칙 #5 YAGNI: ⚠ 현재 plugin 자체 구현으로 충분. 다음 도메인 합류 시 *통일 hook 필요* 신호 도착 시 박제

#### Concept 계층 (subClassOf)
- `kind` 단일 평면 → 상하위 관계
- plugin 영역 가능? **가능** (plugin extension table 로 처리)
- 코어 추가 가치: **★ 중간** — 코어 type 정의에 optional `parent_kind` 추가 (semver minor additive)
- 행동 원칙 #5 YAGNI: ⚠ 도메인 owner 신호 도착 시 (rootric "factsheet 가설 코드" 단계 가능성)

### 3.3 Tier B — Phase 5+ evolution 후보

#### LLM + Semantic Layer 하이브리드 (Neuro-Symbolic 워크플로우)
- 자연어 → LLM 파싱 → Semantic 질의 → 추론 → 결과 자연어 정리
- 현재 router (Tier-variable) 만 박제 — 하이브리드 워크플로우 X
- 적용 시점: rootric KPI 큐레이션 / plott 약사 인사말 / enroute 자연어 검색 진입 시

#### RDF/OWL/SWRL/SPARQL 표준 어댑터
- relational ↔ 트리플 양방향 adapter
- 의도된 선택 (Postgres) 위에서 *추가 어댑터* 형태로 가능
- 적용 시점: 외부 SPARQL endpoint 연동 필요 시 (현재 0건)

---

## 4. 머큐리 결정 — 현 시점

### 4.1 코어 변경 — *보류*

**행동 원칙 #5 YAGNI 적용**:
- 검증된 precedent 만 박제 원칙 (Mercury 12차 §0-pre 박스 박제 시점과 동일 원칙)
- 도메인 owner 가 *실제 필요* 신호 보낼 때까지 대기
- Phase 4-A 양 도메인 (enroute + rootric) 종결 직후라 *현재 사용* 패턴이 stable — 신규 추가는 검증 부담 ↑

### 4.2 박제 — *현재 분석 자체*

이 문서 (`docs/ontology_layer_comparison.md`) 가 박제 산출물:
- 글 3편 핵심 추출 (재현 가능)
- 정합 매트릭스 15 항목
- Tier S/A/B 분류 + 행동 원칙 정합 검토
- 미반영 4 항목 (다이내믹 시나리오 / Rule 엔진 / 라이트백 / Concept 계층) 의 *향후 진입 시점* 명시

향후 도메인 owner 신호 도착 시 이 문서가 진입 결정 근거.

### 4.3 도메인 owner 메시지 — *불필요*

도메인 영향 0 (코어 변경 X) — 알릴 필요 없음. 이 분석은 *머큐리 측 reference* 박제.

---

## 5. 향후 진입 시나리오

### 5.1 Tier S 진입 신호 (다이내믹 시나리오)

다음 중 1+ 발생 시 협의:
- rootric "10대 KPI 변경 시 What-if 영향 분석 시뮬레이션" 명시 요청
- plott "약국 매출 What-if 시나리오" 또는 "circle 정책 변경 시 visibility 영향" 시뮬레이션 명시
- enroute "freedom 점수 변경 시 hazel 추천 영향" 시뮬레이션 명시
- 또는 3 도메인 *모두* 시나리오 객체화 자체 구현 발생 시 (공통 추출)

### 5.2 Tier A 진입 신호

| 항목 | 진입 신호 |
|---|---|
| Rule 엔진 | 도메인 owner 1+ 가 *공통 추론 엔진 필요* 명시 (현재: 각자 자체 구현) |
| 라이트백 hook | 도메인 owner 1+ 가 *통일 hook 필요* 명시 (현재: 각자 자체 구현 OK) |
| Concept 계층 | rootric factsheet 가설 코드 단계 진입 또는 plott 5단계 가시성 + 객체 분류 hierarchy 명시 |

### 5.3 Phase 5 evolution (모든 도메인 합류 종결 후)

- LLM + Semantic Layer 하이브리드 — Neuro-Symbolic 워크플로우 박제
- RDF/OWL 어댑터 (외부 SPARQL endpoint 연동 시)
- GitHub Packages publish (link 패턴 (c) — Mercury 11차 박제)

---

## 6. 행동 원칙 정합 검토 (이 문서 자체)

| 원칙 | 정합 결과 |
|---|---|
| #1 도메인 작업 거부 | ✅ 코어 추상화 영역 분석. 도메인 어휘 0건 (의료/약국/주식/시간 도메인 예시는 *원문 인용*). |
| #2 인터페이스 합의 → 구현 | ✅ 코어 인터페이스 변경 0건. 분석 박제만. |
| #3 공통점 검증 의무 | ✅ Tier A "Rule 엔진" 박제 가치 검토 시 *3 도메인 모두 자체 구현 발생* 확인 후 박제 가치 명시 (단 코어 변경은 보류). |
| #4 에드워드를 검증자로 | ✅ 외부 자료 (datastrate 3편) 검토 → 머큐리 분석 → 에드워드 동의 후 박제. 도메인 owner 직접 대화 X. |
| #5 YAGNI 우선 | ✅ 코어 변경 *보류* 결정. 도메인 owner 실제 신호 대기. 분석 박제만. |

---

## 7. 도메인 owner 사전 신호 — 정식 트랙 5/14 후 (Mercury 21차, 2026-05-04)

Mercury 20차 종결 직후 **3 도메인 owner 모두** 외부 자료 정합성 자기 명세서 박제 + 사전 신호 도착. 정식 결정은 5/14 PoC 후 — *지금 코어 변경 X*.

### 7.1 도메인 owner 박제 위치

| 도메인 | 박제 | 사전 신호 영역 |
|---|---|---|
| rootric (로고스 38차) | `docs/factsheet_wiki_requirements.md` Section 11 | 4 영역 (Rule entity / W3C 표준 / 다이내믹 시나리오 / Neuro-Symbolic) |
| enroute (루터 38차) | `docs/wiki_requirements.md` Section 11 (commit `9857d3c`) | 4 영역 + **차별 강점 2건 명시** ★ |
| **plott (플로터, 2026-05-04)** | `docs/wiki_requirements.md` Section 11 (commit `828169a`, 11.1~11.6 동일 양식) | 4 영역 + **차별 강점 4건 + 신호 강도 분포** ★★ (가장 강한 신호 도메인) |

→ **3 명세서 모두 도착** (2026-05-04). 진입 시점 5/14 PoC 후 (도메인 owner 합의).

### 7.2.0 plott 차별 강점 4건 + 신호 강도 분포 — Tier 분류 영향 (2026-05-04 추가)

plott 차별 강점 4개:
1. **WARNING 거짓음성 0%** — MVP 안전 본질 (5단계 가시성 + safety RLS 정합)
2. **5단계 가시성 + scope_id** — Mercury 7/12차 박제된 `plott_target_visibility` 함수 정합
3. **drug_master 외부 마스터 강결합** — 외부 entity reference 패턴 (rootric DART 강결합 유사)
4. **앱 연동 API 키네틱 writeback** ★ — Tier A "키네틱 라이트백 hook" 박제 가치 *상승* 신호

머큐리 신호 6건 중 plott 강도 분포:
- ★★ 다단 RLS (`plott_target_visibility`)
- ★★ Rule entity (drug_master 강결합 + classification rule)
- ★ Neuro-Symbolic
- → **plott 이 가장 강한 신호 도메인** (★★ 2건 + ★ 1건)

**MVP 안전 본질 보강 1건** ★★ — OWA "Unknown" 라벨:
- eGFR 누락 시 메트포르민 잘못 안전 추론 함정 차단
- 플로터 측 통합앱 Phase 2 진입 시 즉시 반영 (머큐리 영역 X)
- 단 정식 트랙 진입 시 Article 3 "OWA (Open World Assumption)" 가정 명시 박제 가치 검토 입력 (현재 §2.1 #9 "부분" 분류)

### 7.2 enroute 차별 강점 2건 — Tier 분류 영향

#### (a) `area_tagging_rules` 이미 운영 중 = "데이터로서의 Rule" 패턴 정합 데이터

→ Tier A "Rule 엔진" 박제 가치 **상승**:
- enroute 가 *이미 SWRL 정신 정합 데이터* 운영 중 (룰 자체가 entity, rule_order INSERT/UPDATE)
- rootric 4영역 #1 "Rule entity" 와 직접 매핑 — rootric 은 룰 코드/프롬프트 박힘 / enroute 는 entity 화
- → wiki-core 표준 Rule entity 인터페이스 정의 시 **enroute schema 가 reference 후보**

#### (b) Container / Activity / Observation 3층 시간 측정 = enroute 고유

→ Tier 추가 검토 영역:
- 외부 베스트 프랙티스 (글 3편) 에 없음. 동일 시간 3 계층 병치 측정 — "선언 vs 실측 간극" 자체가 인사이트
- rootric (외부 데이터) / plott (약국 운영) 명세서엔 부재 가능성
- 결정 영역: **코어 표준 vs 옵트인 plugin** (3 도메인 비교 시 검토)
  - 옵트인이면 코어 변경 X (현재 patterns 그대로 OK)
  - 코어 표준 채택 시 Tier S 후보 추가 가능성

### 7.3 정식 트랙 진입 시점 — 5/14 PoC 후

머큐리 측 액션 시퀀스:
1. plott 합류 시점 (통합앱 Phase 2) 또는 5/14 PoC 후 — 둘 중 먼저 도착하는 시점. 단 plott 시점이 더 늦을 가능성 → 5/14 후 *rootric + enroute* 2 명세서로 1차 비교 + plott 도착 시 통합
2. 3 (또는 2) 명세서 Section 11 통합 비교 — Tier S/A/B 분류 cross-validate
3. 4 신호 영역 결정 (각각 코어 변경 / plugin 영역 / 보류)
4. enroute 차별 강점 2건 처리 — 코어 표준 vs 옵트인 plugin
5. 머큐리 단독 결정 → 5단계 protocol (`edward_collaboration.md` §7.1) 으로 도메인 owner 검증

### 7.4 머큐리 사전 자료 보유

- `docs/ontology_layer_comparison.md` (이 문서) — Mercury 20차 박제
- `C:\Users\woori\AppData\Local\Temp\datastrate_extracted.txt` (28KB) — 글 3편 본문 추출 (curl 우회 fetch + Python 파서)
- 글 fetch 우회 명령 (재현 가능):
  ```bash
  curl -sL "https://m.blog.naver.com/datastrate/{ID}" -A "Mozilla/5.0 (...)" \
    -o /tmp/datastrate_{N}.html
  ```

---

## 8. 갱신 이력

| 일자 | 세션 | 변경 |
|---|---|---|
| 2026-05-04 | Mercury 20차 | 최초 작성 — datastrate 3편 vs wiki-core 비교 분석 + Tier S/A/B 분류 + Phase 5+ evolution reference 박제 |
| 2026-05-04 | Mercury 21차 | §7 추가 — 3 도메인 owner 사전 신호 동시 수신 박제. enroute 차별 강점 2건 명시 (Rule entity 운영 데이터 + Container/Activity/Observation 3층). Tier A "Rule 엔진" 박제 가치 상승. 정식 트랙 5/14 후 진입 |
| 2026-05-04 | Mercury 21차 (plott §11 도착) | §7.1 plott 라인 박제 완료 갱신 (commit `828169a`) + §7.2.0 plott 차별 강점 4건 + 신호 강도 분포 박제. **3 명세서 모두 도착으로 정식 트랙 진입 조건 완료**. Tier A "키네틱 라이트백" 박제 가치 상승 (plott 앱 연동 API writeback ★). plott = 가장 강한 신호 도메인 (★★ 2건 + ★ 1건). MVP 안전 본질 1건 (OWA "Unknown") 사전 인지. |
