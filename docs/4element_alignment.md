# 4요소 정렬 — Object / Property / Link / Action

> wiki-core 추상화 결정의 1차 분석 산출물.
> 3 도메인 명세서(rootric / plott / enroute)의 1.1~1.4 섹션을 팔란티어 온톨로지 4요소(Object / Property / Link / Action) 기준으로 정렬한다.
>
> **작성자**: 머큐리 (wiki-core 코어 아키텍트)
> **작성일**: 2026-04-27
> **세션**: Mercury 1차 (Phase 2 — 비교·추상화 결정)
> **위치**: 매트릭스(`comparison_matrix.md`) 작성 전 선행. 위험 신호 3개가 4요소에 집중되므로 여기서 plugin 경계 1차 확정 → 매트릭스는 나머지 영역(소스·권한·라우터·저장소) 검증용.
>
> **참고 입력**:
> - `docs/rootric_wiki_requirements.md` Section 1.1~1.4
> - `docs/plott_wiki_requirements.md` Section 1.1~1.4
> - `docs/enroute_wiki_requirements.md` Section 1.1~1.4
> - 로고스(rootric) 의견 — 위험 신호 3개 모두 타당 + 공통화 후보 4개 제시 (저장소 어댑터, AI Tier 라우터, 출처 레코드 메타, 시각화 모듈)

---

## 0. 분석 목적

3 도메인이 모두 팔란티어 4요소 어휘를 *형식적으로*는 채택했다. 그러나 같은 이름이 같은 의미인지는 별개 — *행동 원칙 #3 (공통점 검증 의무)* 에 따라 cross-check 필요.

이 문서가 답할 3 질문:

1. 4요소 각각이 3 도메인에서 **같은 의미**인가?
2. 코어 인터페이스에 어디까지 공통화할 수 있고, 어디서 plugin으로 분기해야 하나?
3. 위험 신호 3개 (객체 role / provenance 분기 / 라벨 직교 X) 가 실제 매핑에서 재현되는가?

---

## 1. 4요소 코어 인터페이스 후보 (1차 가설)

코어 패키지(`@wiki-core/core`)가 정의할 최소 인터페이스. 도메인 어휘 *중립* — rootric의 `Stock`, plott의 `Drug`, enroute의 `Vision` 같은 도메인 이름은 절대 등장 X.

```ts
// 1급 시민 4종
interface WikiObject {
  id: string;
  type: string;            // plugin이 정의 (e.g. "stock", "drug", "vision")
  label: string;           // 사람이 읽는 이름
  identifier?: string;     // 도메인 식별자 (ticker / HIRA / nodes.id)
  created_origin: 'ingest' | 'manual' | 'auto';  // CRUD 출처 분리 (위험 신호 1 대응)
  created_at: timestamp;
}

interface WikiAttribute {
  object_id: string;
  key: string;             // plugin 정의 (e.g. "market_cap", "stock_level", "accumulated_minutes")
  value: json;
  unit?: string;
  valid_at?: timestamp;    // 시계열 시 필수
  valid_until?: timestamp; // 만료/덮어쓰기 시점
}

interface WikiRelation {
  from_id: string;
  to_id: string;
  type: string;            // plugin 정의 (e.g. "supplies_to", "treats", "cross")
  directionality: 'directed' | 'undirected';
  weight?: number;         // optional — enroute cross link 가중치, plugin이 의미 부여
}

interface WikiEvent {
  id: string;
  object_ids: string[];    // 사건이 영향 미친 객체들 (1+)
  type: string;            // plugin 정의
  occurred_at: timestamp;
  payload: json;           // 사건별 데이터 (plugin이 schema 책임)
}

// 보조 슬롯 — 4요소 모두에 공통으로 붙음
interface WikiProvenance {
  source_kind: string;     // 코어 enum 없음 — plugin이 정의 (article / sheet / user / observation / ...)
  source_ref: string;      // url / sheet_id+tab / user_id / aw_event_id
  recorded_at: timestamp;
  // 의도적 누락: strength / confidence / is_official
  // → plugin extension table에서 처리 (위험 신호 2 대응)
}

interface WikiLabel {
  target_kind: 'object' | 'attribute' | 'relation' | 'event';
  target_id: string;
  label_set_id: string;    // plugin이 정의한 분류 체계 ID
  label_id: string;        // 그 체계 내의 라벨
  // 의도적 누락: rootric FACT/ASSUMPTION, plott PROCEDURE/POLICY, enroute 선언/실측 enum 등 일체
  // → 라벨 enum은 100% plugin (위험 신호 3 대응)
}
```

**의도적 결정** (모두 위험 신호 검증 결과 — 다음 섹션 참조):
- `WikiObject.type` 은 string. enum 아님. 코어는 type 카탈로그를 모름. (2026-04-27 에드워드 검증 통과 — Phase 4 도메인 합류 시 `validateObjectType` hook이 typo·type 충돌 검증에 충분한지 재검증 예정)
- `WikiAttribute.key` 도 string. unit system도 plugin.
- `WikiRelation.type` enum 없음.
- `WikiEvent.type` enum 없음.
- `WikiProvenance` 에 strength / confidence / is_official 없음 — plugin extension에서 처리.
- `WikiLabel` 은 라벨 슬롯만 제공. 라벨 enum은 plugin.
- `created_origin` 은 코어 — 3 도메인이 ingest/manual/auto 비중이 정반대라 코어에서 origin 추적 못 하면 라우팅·UX 결정이 plugin마다 중복됨.

---

## 2. 도메인별 4요소 매핑

### 2.1 Object (객체)

| 도메인 | 객체 종류 (count) | 1급 entity 성격 | 생성 경로 |
|---|---|---|---|
| **rootric** | Stock / Sector / BusinessUnit / Product / Customer / Competitor / Policy / MacroEvent / Person / Article (10) | **외부 세계 entity** — 종목·기업·정책. 사용자가 만들지 않음. | 99% ingest (DART·리포트·뉴스 자동 추출) |
| **plott** | Drug / DrugIngredient / Disease / Pharmacy / Pharmacist / Staff / Wholesaler / Regulation / Procedure / Policy / Circle / Article / Sheet (13) | **외부(Drug/Regulation) + 운영(Procedure/Policy/Pharmacy) 혼합** | 50:50 — drug_master 자동 sync + 약국이 직접 등록한 절차 |
| **enroute** | Vision / Area / Project / Resource / Atomic / Container / Activity / Observation / Trade / JournalEntry / CalendarEvent / GitCommit (12) | **자기 정의 가치/목적 단위(5종) + 자동수집 시간 데이터(7종) 혼합** | Vision/Area/Project = 100% 수동 마인드맵 입력 / Activity/Observation = 100% 자동(ActivityWatch) |

**핵심 관찰**: 객체 *수*는 비슷(10/13/12)하나 *역할*이 다르다.
- rootric Object = 분석 *대상*
- plott Object = 분석 대상 + 운영 *주체*
- enroute Object = 자기 *목적* 단위 + 시간 *증거*

### 2.2 Property (속성)

| 도메인 | 시계열 비중 | 단위 시스템 | 특수 속성 |
|---|---|---|---|
| **rootric** | 매우 높음 — 시총·PER·매출·점유율 모두 분기/일 단위 | 금액(원·억) / 비율(%) / 배수(x) — 금융 표준 | strength·is_key (도메인 특화) |
| **plott** | 중간 — Drug 단가/재고는 일/주, 약가는 정적, 절차는 정적 | 개·원·% + EDI/EAN/HIRA 코드(식별자) | is_official·is_pharmacy_specific (도메인 특화) |
| **enroute** | 매우 높음 — 누적시간·진척도·자유지수 일/주/월 | **분(minute)** 이 1급 단위 + 누적/평균 집계 | metric_type(balance/freedom/null)·voluntary·wisdom (도메인 특화) |

**핵심 관찰**: 시계열 형식은 같으나 *단위 체계와 집계 정책*이 다르다.
- rootric: 절대값 + 추세 (시총 300조)
- plott: 절대값 + 식별자 코드 (단가 + EDI)
- enroute: **누적·집계·비율** (시간 자체가 1차 데이터)

특수 속성(is_key / is_official / metric_type / wisdom 등)은 모두 도메인 1급 시민이지만 다른 도메인엔 의미 없음 — plugin extension table 필수.

### 2.3 Link (관계)

| 도메인 | 관계 종류 (count) | 카디널리티 패턴 | weight 의미 |
|---|---|---|---|
| **rootric** | belongs_to / produces / supplies_to / competes_with / affected_by / mentioned_in (6) | 거의 모두 1:N 또는 N:N. 트리 구조 약함. | 없음 — 관계는 binary (있다/없다) + strength는 별도 |
| **plott** | works_at / member_of / owns / treats / contains / replaces / references / regulated_by / documented_in / shared_in / supplies (11) | 트리(works_at, owns) + 그래프(treats, references) 혼합. | 거의 없음 — replaces에서만 우선순위 |
| **enroute** | parent_id (트리) / cross (의미 기여 + weight) / area_node_id (배속) / mentioned_in (4) | **명확한 2층**: parent_id 트리 + cross 그래프. | **가중치가 1급 시민** — `cross`의 weight FLOAT (Area→Vision 0.8 등) |

**핵심 관찰**:
- rootric/plott: weight 없는 binary edge가 표준
- enroute: weight 있는 가중 edge가 1급 (cross link의 의미 기여도)
- 코어가 weight를 optional로 두면 양쪽 다 수용 가능. 단 weight *해석* 은 plugin (rootric의 strength ≠ enroute의 cross weight).

### 2.4 Action (행동/이벤트)

| 도메인 | 이벤트 종류 (count) | 트리거 출처 | 페이로드 복잡도 |
|---|---|---|---|
| **rootric** | mass_production_start / capex_announced / m_a / policy_enacted / earnings_release / target_price_change (6) | 모두 **외부 ingest** — 공시·리포트에서 추출 | 중간 — 금액·날짜·출처 |
| **plott** | regulation_changed / shortage_reported / alternative_announced / procedure_updated / policy_changed / training_completed / knowledge_shared / **visibility_changed** (8) | 외부 ingest + **약국 운영 액션** + **가시성 변경** 혼합 | 중간 + visibility_changed는 5단계 가시성 메타 필수 |
| **enroute** | activity_started/ended / container_opened/closed / task_completed / node_created / cross_link_added / journal_entered / trade_executed / gap_detected / vision_imbalance_detected / wisdom_atomic_promoted (12) | **자동 측정(ActivityWatch) + 사용자 직접 + AI 추천** 3중 | 매우 높음 — duration / source enum / metric_type 등 |

**핵심 관찰**:
- rootric: 외부 사건 기록 (모두 과거 시점, 사용자 행위 X)
- plott: 외부 + 운영 행위 + **메타 행위**(visibility_changed) — 시스템 자체에 대한 행위가 1급 이벤트
- enroute: **사용자/시스템/AI 모두 이벤트 발생자**. `gap_detected` 같은 *시스템 추론 결과*도 이벤트.

→ Event payload schema가 도메인마다 발산 폭이 큼. 코어는 `payload: json` 자유 슬롯만 제공.

---

## 3. 위험 신호 3개 검증

### 3.1 위험 신호 1 — 객체 role 차이

**가설**: rootric Object = 외부세계 entity / plott = 혼합 / enroute = 자기 목적 단위 + 시간 증거. CRUD 패턴이 정반대라 같은 인터페이스로 묶으면 한쪽이 부자연스러워짐.

**매핑 결과**: 재현됨. 2.1 표 "생성 경로" 컬럼이 99% ingest / 50:50 / 100% 수동+100% 자동 혼합으로 갈림.

**대응**:
- `WikiObject.created_origin: 'ingest' | 'manual' | 'auto'` 코어 필드로 추가.
- 객체 *type 카탈로그*는 plugin (코어는 string으로만 다룸).
- ingest 어댑터, 수동 입력 UI, 자동 측정 어댑터는 모두 plugin 책임. 코어는 4요소 CRUD API만 제공.

**미해결 검증 항목** (매트릭스에서 재확인):
- enroute의 *수동 5종(Vision/Area/Project/Resource/Atomic)* 과 *자동 7종(Container/Activity/Observation/Trade/JournalEntry/CalendarEvent/GitCommit)* 은 같은 `WikiObject` 인터페이스로 다뤄도 되나? 아니면 enroute 내부에서도 분리? → **enroute plugin 책임**, 코어는 모름.

### 3.2 위험 신호 2 — provenance 의미 분기

**가설**: rootric/plott는 "여러 출처 → strength 가중치", enroute는 "선언 vs 실측 간극(3중 비교)". 같은 슬롯에 담으면 enroute는 strength NULL, rootric은 3중 비교 X.

**매핑 결과**: 재현됨.
- rootric Section 4.2: "동일 사실이 여러 원문에 등장하면 → 강도(strength) = 출처 수"
- plott Section 3.3: `is_official` 플래그로 출처 등급 구분
- enroute Section 4.2: "본인 데이터라 출처 충돌 거의 없음. 다만 선언 vs 실측 간극 (Container 시간 vs Activity 시간 vs Observation 시간 3중 비교)이 핵심"

**대응**:
- `WikiProvenance` 코어는 `source_kind / source_ref / recorded_at` 만.
- `strength`, `confidence`, `is_official` 은 **plugin extension table** (예: `rootric_source_strength`, `plott_source_official_flag`).
- enroute의 3중 비교는 `WikiAttribute` 의 `key` 를 다르게 줘서 표현 (예: `container_minutes`, `activity_minutes`, `observation_minutes`) — 같은 객체에 3 attribute로 누적 → plugin이 "간극" 계산.

**미해결 검증 항목**:
- 코어가 "여러 provenance가 같은 attribute를 가리킨다"는 N:1 관계를 *지원*은 해야 함 (rootric strength 계산이 거기서 시작). 단 *집계 의미*는 plugin.

### 3.3 위험 신호 3 — 분류 라벨 직교 X

**가설**: rootric 검증축 / plott 규범축 / enroute 시간·인지축. 강제 합의 시 한 축 아래 다른 축이 잡음으로 침투.

**매핑 결과**: 재현됨.

| 도메인 | 라벨 축 | 라벨 enum |
|---|---|---|
| rootric | **검증축** (참 vs 미검증, 시간 만료 검증 가능) | FACT / ASSUMPTION / MIXED / PLAIN + is_key / expires_at |
| plott | **규범축** (지식 vs 절차 vs 안전) | FACT / PROCEDURE / POLICY / EXPERIENCE / WARNING / PLAIN |
| enroute | **시간·인지축** (origin·시간성) | 선언 / 실측 / 회고 / 노이즈 |

3 축은 **상호 환산 불가**:
- rootric의 ASSUMPTION을 plott에 매핑하면? (POLICY? EXPERIENCE? — 둘 다 의미 다름)
- plott의 WARNING을 enroute에 매핑하면? (없음 — enroute에 안전 개념 없음)
- enroute의 "선언 vs 실측"을 rootric에 매핑하면? (FACT 만 있음 — 선언이라는 개념 없음)

**대응**:
- 코어 `WikiLabel` 은 `(label_set_id, label_id)` 만 제공. enum 일체 정의 X.
- 각 plugin이 자기 label_set 정의:
  - `@plugin/rootric` → `rootric_validation` set: FACT/ASSUMPTION/MIXED/PLAIN
  - `@plugin/plott` → `plott_norm` set: FACT/PROCEDURE/POLICY/EXPERIENCE/WARNING/PLAIN
  - `@plugin/enroute` → `enroute_origin` set: 선언/실측/회고/노이즈
- **공통 발견**: 3 도메인 모두 *PLAIN/Noise* 라벨이 있고 의미도 같음 (필터링 대상). → 코어가 noise filter hook 1개만 제공 가능. 그러나 굳이 코어에 박을 필요는 없음 — plugin이 각자 noise label로 처리해도 충분 (YAGNI).

**미해결 검증 항목**:
- 다른 plugin의 label_set을 cross-reference 해야 하나? (예: 같은 콘텐츠가 rootric+enroute 양쪽에 라벨링) → **3 도메인 모두 단일 plugin 환경 가정**이라 N/A. 미래 통합 시 재검토.

---

## 4. 코어 vs Plugin 경계선 (1차 확정)

| 4요소 | 코어 책임 | Plugin 책임 |
|---|---|---|
| **Object** | id / type(string) / label / identifier? / created_origin / created_at / CRUD API | type enum 카탈로그, type별 schema 검증, ingest/manual/auto 어댑터 |
| **Property** | object_id / key(string) / value / unit? / valid_at? / valid_until? | unit system, 시계열 정책 (덮어쓰기 vs 누적), 도메인 key 카탈로그, 집계 함수 |
| **Link** | from / to / type(string) / directionality / weight? | type enum, weight 의미(strength vs cross 가중치), 카디널리티 검증, 트리 vs 그래프 구분 |
| **Action** | id / object_ids[] / type(string) / occurred_at / payload(json) | type enum, payload schema, 트리거 로직, 자동 감지(gap_detected 등) |
| **Provenance (보조)** | source_kind(string) / source_ref / recorded_at | strength / confidence / is_official, 출처 등급 정책, 다중 출처 집계 |
| **Label (보조)** | label_set_id / label_id / target | 라벨 enum 일체, 라벨 라우터, 만료/검증 정책 |

### 코어가 의도적으로 *제공하지 않는* 것

위험 신호 검증 결과 코어에 들어가면 한 도메인을 침해함:

| 영역 | 어디 plugin? | 이유 |
|---|---|---|
| rootric `is_key` / `expires_at` / FACT vs ASSUMPTION | `@plugin/rootric` | 검증축은 rootric만. plott·enroute에 의미 없음. |
| plott `is_pharmacy_specific` / `WARNING` 라벨 / 5단계 가시성 / `Circle` 객체 | `@plugin/plott` | 약국 운영 + 모임 가시성은 plott만. |
| enroute `metric_type=balance/freedom` / `voluntary` / `wisdom=true` / Vision 3축 | `@plugin/enroute` | 개인 가치 축은 enroute만. |
| 출처 strength 가중치 / confidence 점수 | plugin (rootric/plott 각자) | 알고리즘이 도메인마다 다름. |
| 3중 시간 비교 (container/activity/observation) | `@plugin/enroute` | 선언 vs 실측 간극은 enroute만. |
| 라벨 enum 자체 | plugin 모두 | 3 축이 상호 환산 불가. |

### 코어가 *제공하는* 확장점 (plugin이 hook 거는 지점)

| Hook | 호출 시점 | plugin 활용 예 |
|---|---|---|
| `validateObjectType(type, payload)` | `WikiObject` 생성·수정 시 | rootric: ticker 6자리 검증 / plott: HIRA 코드 검증 / enroute: type=vision의 metric_type enum 검증 |
| `onAttributeWrite(attr)` | `WikiAttribute` 쓰기 후 | rootric: strength 재계산 / plott: 약국 단가 시계열 갱신 / enroute: Area 누적시간 갱신 |
| `noiseFilter(text)` | 텍스트 입력 ingest 전 | 3 도메인 공통 — PLAIN/Noise 분류 (구현은 plugin) |
| `provenanceExtension(prov)` | provenance 레코드 생성 시 | rootric: strength 컬럼 추가 / plott: is_official 추가 |
| `labelRouter(target, content)` | 분류 라우터 입력 시 | rootric FACT/ASSUMPTION 분류 / plott FACT/PROCEDURE/POLICY/WARNING 분류 / enroute 선언/실측/회고 분류 |

---

## 5. 결정 (Phase 2 1차 잠정)

**풀 추상화 거부, plugin 모델 채택.**

근거:
1. 위험 신호 3개 모두 매핑 검증에서 재현됨 (Section 3).
2. 4요소 *형식*은 공통이지만 *enum·의미·생명주기*는 도메인마다 다름.
3. 코어가 도메인 어휘를 단 하나라도 받아들이면 다른 2 도메인이 부자연스러워짐 (예: FACT enum, 5단계 가시성, Vision 3축).

**패키지 구조** (2026-04-27 결정 — 부록 A #1·#2 참조):

```
# wiki-core repo (이 repo, 머큐리 작업 영역)
@wiki-core/core         — 4요소 인터페이스 + Hook 정의 + label_set 슬롯
@wiki-core/storage      — Postgres / SQLite / Sheets 어댑터
@wiki-core/router       — Tier 0~N 라우터 추상 (Tier 4 로컬강제는 plugin이 enable)
@wiki-core/renderer     — 시계열 / 관계 그래프 / 타임라인 컴포넌트 (입력 형식만 표준화)

# 도메인 repo (각자 자체 빌드, 도메인 owner 작업 영역)
# ↓ 패키지 이름은 도메인 owner 자율 — 아래는 예시
@rootric/wiki-plugin    — Stock/Sector 등 type, FACT/ASSUMPTION label_set, strength 가중치
@plott/wiki-plugin      — Drug/Procedure 등 type, 5단계 가시성, WARNING 거짓음성 0% 정책
@enroute/wiki-plugin    — Vision/Area 등 type, 선언/실측 label_set, Tier 4 로컬강제, 3중 시간 비교
```

**중요**:
- wiki-core repo는 **코어 4 패키지만** 보유. plugin 본체는 일체 두지 않음 (머큐리 행동 원칙 #1 *도메인 작업 거부* 와 정합).
- plugin은 각 도메인 repo에서 자체 빌드. 도메인 owner가 코어 인터페이스에 맞춰 작성.
- 5 패키지 후보(engine/router/memory/extractor/renderer)는 **3+core로 축소** (storage / router / renderer + core). memory/extractor는 plugin에 흡수. Phase 3에서 최종 확정.
- 도메인 어휘 차단을 위해 코어 4 패키지에 *최소 fake plugin 1개* 만 테스트 픽스처로 둠 (type=`foo`, label=`bar` 같은 무의미 어휘).

---

## 6. 후속 — comparison_matrix.md 작성 시 검증할 항목

4요소 정렬에서 코어/plugin 경계가 1차 확정됐으니, 매트릭스는 *나머지 영역*만 검증하면 된다:

| Section | 검증 초점 | 4요소 결정에 미칠 영향 |
|---|---|---|
| 2 입력 소스 | ingest 어댑터 인터페이스가 3 도메인 수용 가능한가 | 거의 없음 (plugin) |
| 3 분류·라벨링 (이 문서 3.3과 중복) | 추가 라벨 차원 발견 시 label_set 슬롯 재검토 | 라벨 hook 시그니처 |
| 4 시간축·출처 | provenance extension hook이 충분한가 | provenance 인터페이스 |
| 5 출력 시각화 | 입력 형식 표준화 가능 영역 확정 | renderer 패키지 분리 결정 |
| 6 권한·공유 | 5단계/2단계/1단계가 코어 침해 없이 plugin에서 분리 가능한가 | **재검증 필요** — visibility hook이 4요소 모두에 붙는 cross-cutting concern일 수 있음 |
| 7 AI 라우터 | Tier 추상이 enroute Tier 4(로컬강제)를 수용하는가 | router 패키지 인터페이스 |
| 8 저장소 | storage-agnostic 인터페이스 — 3 storage(Postgres/SQLite/Sheets) 수용 | storage 패키지 인터페이스 |

**가장 위험한 미검증 영역**: Section 6 권한·공유. visibility는 Object/Attribute/Event 모두에 붙는 cross-cutting field라 코어/plugin 경계가 4요소처럼 깔끔하지 않을 가능성. 매트릭스에서 우선 검증.

---

## 7. 다음 액션

1. **에드워드 검토** — 이 문서의 1차 잠정 결정(plugin 모델)에 대한 동의 필요. 머큐리는 단독 결정 권한 있으나 행동 원칙 #4에 따라 에드워드를 검증자로 활용.
2. **comparison_matrix.md 작성** — 위 6번 표대로 Section 2~8 매트릭스 (Section 0~1은 이 문서로 대체).
3. **abstraction_decision.md** — 매트릭스 결과 종합해 최종 결정 + plugin 모델 vs 별도 진행 비교 표.
4. (Phase 3) 패키지 SPEC 작성 — `packages/{core,storage,router,renderer}/SPEC.md`.

---

## 부록 A — 미해결 질문 추적

머큐리 단독 결정으로 부족했던 영역. 2026-04-27 머큐리 1차에서 에드워드 검증으로 4항 모두 처리.

### A.1 plugin 패키지 네이밍 — ✅ 닫힘 (2026-04-27)

**결정**: 도메인 namespace 자율. 정확한 이름은 도메인 owner의 패키지 컨벤션에 따라 결정.

예시: `@rootric/wiki-plugin` / `@plott/wiki-plugin` / `@enroute/wiki-plugin` (단 도메인 owner가 단일 패키지 repo 운영 시 `@rootric/wiki` 같이 갈 수도 있음 — 머큐리는 강제하지 않음).

**근거**: A.2와 동시 결정. 별도 repo이므로 plugin namespace는 도메인 자율이 자연스러움.

### A.2 단일 repo vs 별도 repo — ✅ 닫힘 (2026-04-27)

**결정**: 별도 repo. wiki-core repo는 **코어만**, plugin은 도메인 repo에서 자체 빌드.

**근거**:
1. 3 도메인 owner들이 이미 자기 repo 보유 (rootric / plott / enroute).
2. plugin이 도메인 어휘(Stock/Drug/Vision 등)를 다루는데, plugin을 wiki-core repo에 두면 머큐리가 도메인 어휘에 노출됨 → 행동 원칙 #1 *도메인 작업 거부* 위반 위험.
3. 마이그레이션·schema 결정도 도메인 owner 책임이라야 함 (A.4 참조).

**함의 (Phase 3에 영향)**:
- 코어 인터페이스 stability가 1급 책임 — breaking change = 3 도메인 owner의 작업 부담. semver 엄격, deprecation cycle 명시.
- plugin SPEC 필수 (Phase 4 산출물) — 머큐리가 작성, 도메인 owner가 구현.
- 테스트 픽스처: wiki-core repo에 *최소 fake plugin 1개*만 둠 (도메인 어휘 일체 사용 X).

### A.3 plugin 간 cross-reference 허용 여부 — ✅ 닫힘 (2026-04-27)

**결정**: 두 차원 모두 허용.

| 차원 | 의미 | 정책 |
|---|---|---|
| **(a) 코드 import** | plugin 코드끼리 의존 (예: enroute plugin이 rootric plugin을 import) | ✅ 허용 — 도메인 owner 자율, 머큐리 관여 X |
| **(b) 데이터 cross-label** | 같은 객체에 여러 plugin의 label_set / extension 동시 적용 | ✅ 허용 — 코어 인터페이스가 받아들임 (`WikiLabel`이 같은 target_id에 여러 label_set_id 허용) |

**현재 가정**: 3 도메인은 단일 plugin 환경 (한 사용자가 한 도메인만 사용). 그러나 미래 통합·교차 운영 가능성을 차단하지 않도록 코어가 (b) cross-label을 *허용*만 함 (강제 X).

**코어 설계 영향**: Section 1의 `WikiLabel { label_set_id, label_id, target_id }` 가 같은 target에 multi-row 가능하도록 이미 설계됨. 추가 변경 불필요.

### A.4 기존 schema 마이그레이션 범위 — ✅ 정책 결정 (2026-04-27)

**결정**: **마이그레이션은 plugin 책임.**

도메인 owner가 자기 plugin 작성 시 기존 schema를 코어 인터페이스에 매핑:
- rootric: `factsheet_articles` / `factsheet_topics` / `dart_disclosures_parsed` / `factsheet_news` / `reports` / `policy` / `covered_stocks` / `financial_data` 등
- plott: `wiki_pages` / `wiki_links` / `wiki_versions` / `wiki_embeddings` / `drug_master` / `pharmacies` / `pharmacy_members` 등
- enroute: `nodes` / `node_links` / `goal_layers` / `containers` / `activity_logs` / `journal_entries` 등

**머큐리 책임**: 도메인 owner에게 묻지 않고 직접 발견. 매트릭스(특히 Section 8 저장소) 작성 시 *코어 인터페이스가 기존 schema 패턴을 수용 못하는 케이스*가 있는지 검증. 발견 시 코어 인터페이스 보완 또는 plugin extension hook 추가.

**행동 원칙 정합**: 도메인 owner에게 schema 매핑을 묻는 건 행동 원칙 #1 (도메인 본문 편집 금지) 위반 회피. 도메인 owner가 자기 plugin 안에서 해결.

---

**부록 A 처리 결과**: 4항 모두 닫힘 (2건 닫힘 + 1건 허용 + 1건 정책결정). Phase 2 → 3 진행에 추가 차단 없음.
