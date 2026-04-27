# 3 도메인 비교 매트릭스 (Section 2~8)

> wiki-core 추상화 결정의 2차 분석 산출물. 4요소 정렬에서 다루지 않은 *나머지 영역*을 검증한다.
>
> **작성자**: 머큐리 (wiki-core 코어 아키텍트)
> **작성일**: 2026-04-27
> **세션**: Mercury 1차 (Phase 2 — 비교·추상화 결정)
> **선행**: `docs/4element_alignment.md` (Section 0·1 = 4요소 결정에 흡수)
>
> **참고 입력**: `docs/{rootric, plott, enroute}_wiki_requirements.md` Section 2~10
>
> **목적**:
> 1. 4요소 결정(plugin 모델)이 *나머지 영역*에서 흔들리는지 검증
> 2. 추가 코어 인터페이스/hook 발견
> 3. 가장 위험한 미검증 영역(Section 6 visibility cross-cutting) 진단

---

## 0. 한 눈에 — 7 Section × 3 도메인

| Section | rootric | plott | enroute | 발산도 | 코어/plugin |
|---|---|---|---|---|---|
| 2 입력 소스 | 일 1500건, 자동 ingest 99% | 일 50-200건, 시트+공지 | 일 200-400 events, ActivityWatch+수동 혼합 | **매우 높음** | 어댑터 인터페이스만 코어 |
| 3 라벨 차원 | is_key/expires_at | is_official/is_pharmacy_specific/requires_review | wisdom/voluntary/is_balance_break | **매우 높음** | plugin extension table |
| 4 시간축·출처 | 분기/일/년 + strength | 일/분기/년 + is_official | 분/일/주/월/분기/년 + 3중 비교 | **높음** | 시간 단위 plugin, provenance 코어 (slot만) |
| 5 출력·시각화 | Stock/Topic/Sector Wiki | Drug/Procedure/Topic Wiki | Area/Vision/Project Wiki | 중간 | **시각화 4종 코어 후보 (★ 진짜 공통)** |
| 6 권한·공유 ★ | 2단계 (공개/비공개) | **5단계 + 멀티테넌트 + 멀티모임** | 1단계 (private) | **극단적** | **scope/visibility = cross-cutting hook** |
| 7 AI 라우터 | Tier 0-3, $10/월 | Tier 0-3, $0.5/월, WARNING 거짓음성 0% | **Tier 0-4, Tier 4 = 로컬강제** | 높음 | Tier *수* 가변, 라우팅 정책 plugin |
| 8 저장소 | Supabase 단일 | Supabase 단일 (+ pgvector) | **Supabase + Sheets + (향후) SQLite 다중** | 높음 | **multi-storage 1급 시민** |

→ **4요소 결정 흔들기 검증 결과**: 흔들지 않음. 단 **2개 추가 cross-cutting hook 필요** (visibility / multi-storage). Section 9 통합 결론 참조.

---

## 2. 입력 소스

### 2.1 비교 표

| 차원 | rootric | plott | enroute |
|---|---|---|---|
| **일일 처리량** | 1,000~1,500건 | 50~200건 | 200~400 events + 텍스트 5~20건 |
| **자동 vs 수동 비중** | 자동 99% (DART/뉴스/리포트 ingest) | 자동 50% + 수동 50% (시트+약사 메모) | 자동 70% (ActivityWatch) + 수동 30% |
| **소스 종류 수** | 6 (DART/리포트/뉴스/정책/컨센서스/유저메모) | 8 (연수/식약처/약가CSV/시트/메모/모임/drug_master/plott-stock) | 10 (ActivityWatch/봇/마인드맵/Journal/수동/시트/캘린더/GitHub/AI세션/HealthKit) |
| **Tier 0 필터 후 잔량** | 60% 차단 → 400-600건 | 30% 차단 → 35-140건 | 80%+ 차단 (특히 ActivityWatch) → 40-80건 |
| **신뢰도 분포** | DART > 리포트 > 뉴스 (3등급) | 식약처 > 연수 > 시트 > 메모 (4등급) | 자동(★★★) > 본인입력(★★★) > AI생성(★★) |
| **주요 입력 형식** | HTML / PDF / 정형 JSON | PDF / HTML / gsheet / Postgres row | JSON event / 자유 텍스트 / 시트 / API JSON |
| **24/7 처리 요구** | ✅ (cron 백그라운드, 30분 ingest) | ✅ (cron 야간 + 약사 직접 입력 즉시) | ✅ (10분 cron + 헤이즐 능동 메시지) |
| **lag 허용** | 1시간 (핵심 공시는 30분) | 1시간 (❓ 버튼은 캐시 즉시) | 분 단위 (헤이즐 능동성 요구) |

### 2.2 핵심 발견

**(F-2.1) 처리량 발산 30배** — 일 1500 vs 50. 코어 router가 처리량 가정을 하면 안 됨. 배치/스트림 모드 모두 지원.

**(F-2.2) 자동 vs 수동 비중이 정반대 패턴** — 4요소 정렬 위험 신호 1 (객체 role 차이) 와 일치. `created_origin: ingest|manual|auto` 코어 필드가 *입력 layer*에서도 의미 있음 — ingest 어댑터 / 수동 폼 / 자동 측정 어댑터를 plugin이 골라 끼움.

**(F-2.3) 신뢰도 등급 체계가 도메인마다 직교 X**:
- rootric: 출처 *권위* (DART > 리포트 > 뉴스)
- plott: 출처 *권위* + *공식성* (`is_official`)
- enroute: 출처 *방식* (자동 vs 수동) — 본인 데이터라 권위 없음

→ "신뢰도"라는 단어가 셋 다 다른 의미. 4요소 정렬 위험 신호 2 (provenance 분기) 보강 — strength/confidence/is_official을 코어에 박지 않은 결정이 *입력 layer 차원*에서도 정당.

### 2.3 코어/plugin 결정

```
@wiki-core/core 의 Ingest 인터페이스 (1차 가설)
─────────────────────────────────────────────
interface IngestAdapter {
  source_kind: string;           // plugin 정의 ("dart", "activitywatch", "gsheet", ...)
  poll(): Promise<RawInput[]> | stream
  parse(raw: RawInput): WikiObject | WikiAttribute | WikiEvent
  // 의도적 누락: 신뢰도/우선순위 정책 — plugin이 자체 결정
}

interface NoiseFilter {              // ★ 3 도메인 모두 PLAIN/Noise 라벨 공통
  shouldDrop(text: string): boolean  // Tier 0 룰필터 - 코어가 hook만 제공
  // 단 구현은 plugin (정규식 룰이 도메인마다 다름)
}
```

**4요소 정렬 정합성**: 정합. 추가 변경 불필요.

---

## 3. 분류·라벨링 — 추가 차원 검증

> 4요소 정렬 3.3에서 라벨 enum 자체는 plugin으로 결정됨. 여기서는 *카테고리·플래그* 같은 라벨 외 차원만 점검.

### 3.1 비교 표

| 차원 | rootric | plott | enroute |
|---|---|---|---|
| **라벨 enum** (4요소 정렬에서 결정) | FACT/ASSUMPTION/MIXED/PLAIN | FACT/PROCEDURE/POLICY/EXPERIENCE/WARNING/PLAIN | 선언/실측/회고/노이즈 |
| **카테고리** | stock/policy/rate/economy (4) | PARA × 도메인(재고/조제실/약물카드/...) | 노드타입 5종 + Container타입 + Activity source + 민감도 + 활동질 |
| **특수 플래그** | `is_key`, `expires_at` | `is_official`, `is_pharmacy_specific`, `requires_review`, `is_drug_linked` | `wisdom`, `voluntary`, `is_balance_break`, `area_imbalance` |
| **시간 만료** | `expires_at` (예측 검증) + valid_from | `valid_from` / `valid_until` (Regulation) + 6개월 무수정 lint (Procedure) | `due_at` (Project) + Area stale 감지 (마지막 활동 N일 전) |
| **승격·강등 정책** | FACT 갱신 시 이전 → 히스토리 강등 | EXPERIENCE → FACT 승격 (6개월 누적 + review 플래그) | Atomic → wisdom 승격 (AI 추천 + 사용자 confirm) |

### 3.2 핵심 발견

**(F-3.1) 카테고리 차원 수가 1 → 1.5 → 5로 발산** — rootric은 단일 enum, plott은 PARA + 도메인 2축, enroute는 5축 multi-tag. 코어 카테고리 슬롯을 1개로 박으면 enroute 부담.

**(F-3.2) 특수 플래그 모두 도메인 1급 시민** — `is_key`(rootric)/`is_official`(plott)/`wisdom`(enroute) 셋 다 도메인 의사결정에 직결. 코어에 박을 공통 플래그 없음.

**(F-3.3) 승격·강등 정책이 도메인마다 다름**:
- rootric: 시간 기반 자동 (덮어쓰기)
- plott: 임계값 기반 + 수동 검토
- enroute: AI 추천 + 사용자 confirm

→ 코어가 "라벨 transition" 인터페이스를 박으면 한 패턴 강제. plugin이 자체 transition 책임.

### 3.3 코어/plugin 결정

```
@wiki-core/core 의 Label 인터페이스 (4요소 정렬 1번 그대로)
─────────────────────────────────────────────
interface WikiLabel {
  target_kind: 'object' | 'attribute' | 'relation' | 'event'
  target_id: string
  label_set_id: string  // plugin이 자기 분류 체계 정의
  label_id: string
  // 의도적 누락: 카테고리, 특수 플래그, transition 정책 일체
}

// plugin extension 가이드
//   rootric: rootric_validation_label_set + rootric_label_extra(is_key, expires_at)
//   plott:   plott_norm_label_set + plott_label_extra(is_official, is_pharmacy_specific, ...)
//   enroute: enroute_origin_label_set + enroute_label_extra(wisdom, voluntary, ...)
```

**4요소 정렬 정합성**: 정합. 카테고리·플래그는 모두 plugin extension table.

---

## 4. 시간축·출처 추적

### 4.1 비교 표

| 차원 | rootric | plott | enroute |
|---|---|---|---|
| **시간 단위 (가장 작은 것 기준)** | **분기 (Q)** + 일 + 년 | **일** + 분기 + 년 + 즉시(timestamp) | **분(minute)** + 일 + 주 + 월 + 분기 + 년 |
| **provenance 모델** | source(권위3등급) + strength(중복가중치) | source(권위4등급) + is_official | source(자동/수동5종) + 3중 시간 비교 (container/activity/observation) |
| **만료 처리** | expires_at (ASSUMPTION 검증) + valid_from (FACT) | valid_from / valid_until (Regulation) | due_at (Project) + stale 감지 |
| **시계열 누적 정책** | 새 FACT 도착 시 이전 → 히스토리 (덮어쓰기) | 새 버전 등록 → 이전 versions 테이블 보존 (append) | 누적 합산 (Activity duration_minutes 합) |
| **출처 충돌 처리** | "여러 출처 = strength ↑" (가중치) | "여러 출처 = is_official 강화" | 출처 충돌 거의 없음 (본인 데이터). 대신 *간극* 분석 |

### 4.2 핵심 발견

**(F-4.1) 시간 단위 발산 — 분기에서 분까지 5단위 차이**. enroute는 분 단위가 1급이고 rootric은 분기가 1급. 코어가 시간 단위 enum을 정의하면 한 도메인 부담. → 코어는 timestamp(ISO8601)만 다루고, *집계 단위*는 plugin.

**(F-4.2) 시계열 누적 정책 3종 발산**:
- rootric: **덮어쓰기** (latest = current value)
- plott: **append + version** (history 보존)
- enroute: **누적 합산** (sum of durations)

같은 `WikiAttribute` 인터페이스에 3 정책이 들어가야 함. → `WikiAttribute` 자체는 row 1개만 다루고, 집계·덮어쓰기 정책은 plugin이 결정 (또는 별도 `WikiAttributeHistory` 테이블).

**(F-4.3) "출처 충돌" 개념 자체가 도메인마다 다름** — 4요소 정렬 위험 신호 2 보강. enroute는 *충돌 없음 + 간극 분석*이 본질. 코어가 "여러 provenance가 한 attribute를 가리킴"을 *지원*하지만 *집계 의미*는 plugin.

### 4.3 코어/plugin 결정

```
@wiki-core/core 의 Time/Provenance (4요소 정렬과 정합)
─────────────────────────────────────────────
interface WikiAttribute {
  // ... (4요소 정렬 그대로)
  valid_at?: timestamp        // ISO8601, 단위 제약 없음
  valid_until?: timestamp
}

interface WikiProvenance {
  source_kind: string
  source_ref: string
  recorded_at: timestamp
  // strength/confidence/is_official 등 일체 plugin extension
}

// plugin이 결정하는 것:
//   - 시간 집계 단위 (분기/일/분 등)
//   - 시계열 누적 정책 (덮어쓰기 / append / 합산)
//   - provenance 집계 (strength 가중치 / is_official 강화 / 간극 분석)
//   - 만료 정책 (expires_at / valid_until / due_at / stale)
```

**4요소 정렬 정합성**: 정합. provenance hook으로 plugin이 strength/is_official/3중비교 모두 처리.

---

## 5. 출력 (Wiki) · 시각화

### 5.1 비교 표

| 차원 | rootric | plott | enroute |
|---|---|---|---|
| **Wiki 페이지 종류** | Stock / Topic / Sector | Drug / Procedure / Topic | Area / Vision / Project |
| **페이지 구성 요소** | 한눈에보기·핵심FACT·진행ASSUMPTION·만료ASSUMPTION·관련정책·원문타임라인 | 한눈에보기·복약지도·주의금기·약국정책·관련규정·약사노하우·원문타임라인 | 한눈에보기·시간분포·관련Project·정제Atomic·활동타임라인·횡단연결 |
| **시각화 4종** | 시계열·관계그래프·타임라인·출처카드 | 시계열·관계그래프(Force)·타임라인·출처카드 | 시계열·관계그래프(Force)·타임라인·신호등카드 + Constellation |
| **자연어 질의** | 그래프 탐색 (객체→속성/관계) | 동일 + 가시성 컨텍스트 적용 | 동일 + 페르소나 분석 |
| **앱 연동 호출** | factsheet 단독 SaaS | **plott-stock/log에서 ❓ 호출** (slug + 컨텍스트) | 헤이즐 봇 / 대시보드 채팅 |
| **답변 형식** | 마크다운 + 출처 링크 카드 | 마크다운 + 출처 카드 + **가시성 뱃지** | 마크다운 + 신호등 + 페르소나 톤 |

### 5.2 핵심 발견

**(F-5.1) 시각화 4종이 진짜 공통** — 시계열 그래프 / 관계 그래프(Force layout) / 타임라인 / 출처 카드 모두 셋 다 사용. 입력 형식 표준화 가능 → **`@wiki-core/renderer` 패키지의 정당성 확보**.

**(F-5.2) 페이지 구성은 도메인 템플릿** — Stock vs Drug vs Area는 섹션 구성·순서가 도메인 의사결정. 코어는 *컴포넌트* 만 제공, *페이지 템플릿*은 plugin.

**(F-5.3) 호출 패턴이 발산**:
- rootric: 단독 SaaS (직접 접근)
- plott: **다른 plott 앱(stock/log)의 컨텍스트 도움말** (❓ 버튼)
- enroute: 헤이즐 봇 능동 호출

→ "Wiki 페이지를 어떻게 호출하는가"는 plugin 책임. 코어는 *렌더 가능한 데이터 묶음*만 반환.

**(F-5.4) plott의 "가시성 뱃지" 출력 요구** — 답변에 *어느 가시성 레벨에서 보이는 콘텐츠인지* 표기 필요. 다른 도메인엔 없는 출력 차원. → Section 6 visibility cross-cutting과 연결.

### 5.3 코어/plugin 결정

```
@wiki-core/renderer 의 컴포넌트 (4 종 ★ 진짜 공통)
─────────────────────────────────────────────
- TimeSeriesChart  (input: WikiAttribute[])
- RelationGraph    (input: WikiObject[] + WikiRelation[])
- Timeline         (input: WikiEvent[])
- SourceCard       (input: WikiProvenance)

plugin 책임:
- Wiki 페이지 *템플릿* (어떤 컴포넌트를 어떤 순서로)
- 자연어 질의 답변 톤 (rootric=객관 / plott=가시성뱃지 / enroute=페르소나)
- 호출 진입점 (단독 / ❓ / 봇)
```

**5 패키지 후보 → 4 패키지 축소 정당성**: renderer가 진짜 공통이므로 코어 분리 정당. memory/extractor는 4요소 + ingest hook으로 흡수 가능 (Phase 3 SPEC에서 최종 확정).

---

## 6. 권한·공유 ★ 가장 위험한 영역

### 6.1 비교 표

| 차원 | rootric | plott | enroute |
|---|---|---|---|
| **유저 모델** | 멀티유저 SaaS | 멀티유저 + **멀티테넌트(약국)** + **멀티모임(circle)** | 싱글유저 + (선택) 가족 공유 |
| **격리 키** | `auth.uid()` (RLS) | `auth.uid()` + `pharmacy_id` + `circle_id` | `auth.uid()` (사실상 1명) |
| **가시성 단계** | **2단계** (Wiki공개 / 유저메모 비공개) | **5단계** (private / pharmacy / group_internal / group_public / public) | **1단계** (전부 private) |
| **역할 차등** | 페르소나 1차/1.5차/2차 (읽기→쓰기→공유형) | super_admin/admin/pharmacist/staff/online_pharmacist 5계층 + 직원 모임차단 | 본인 단일 + (선택) 가족 |
| **가시성 transition 이벤트** | 없음 (콘텐츠가 처음부터 공개/비공개로 분리) | **`visibility_changed` 1급 Event** (Section 1.4 명시) | 없음 |
| **scope_id 필요?** | 없음 (auth.uid 만) | **있음** (pharmacy_id / circle_id) | 없음 |
| **답변 시 가시성 표시** | 없음 | **있음** (가시성 뱃지) | 없음 |

### 6.2 핵심 발견 ★

**(F-6.1) 가시성 단계 발산 1·2·5 — 5배 차이**. 코어가 5단계 enum을 박으면 enroute는 늘 `private`, rootric은 늘 `public/private`만. 1단계 enum이면 plott이 망함.

**(F-6.2) plott의 visibility는 cross-cutting**. 검증된 증거:
- Object에 붙음 (Wiki 페이지 자체의 가시성)
- Attribute에 붙음 (POLICY 속성은 자동 `pharmacy` 가시성)
- Event에 붙음 (`visibility_changed`가 1급 이벤트)
- *답변 출력*에도 붙음 (가시성 뱃지 — Section 5.4)
- *역할 접근 제어*에도 붙음 (직원 모임차단)

→ visibility는 4요소 모두에 *횡단*. 단순 컬럼 추가로 해결 안 됨.

**(F-6.3) scope_id 차원이 plott만 있음**. rootric/enroute는 scope = user_id 단일. plott은 scope = (user_id, pharmacy_id, circle_id) 3축. 코어가 scope를 모르면 plott이 부담, 코어에 박으면 다른 2 도메인 NULL.

**(F-6.4) 가장 위험한 미검증 영역 진단 결과** — 4요소 정렬 Section 6에서 우려한 *visibility cross-cutting concern* 가 매트릭스에서 재현됨. 4요소 정렬 결정을 *흔들지는 않지만* (코어 4요소 인터페이스는 그대로), **추가 cross-cutting hook 1개 필요**.

### 6.3 코어/plugin 결정 — Visibility Hook

```
@wiki-core/core 의 Visibility Hook (★ 매트릭스 신규 발견)
─────────────────────────────────────────────
interface WikiAccessControl {
  // 코어가 4요소 모든 read/write 시 hook 호출
  canRead(actor: ActorContext, target: WikiObject | WikiAttribute | WikiRelation | WikiEvent): boolean
  canWrite(actor: ActorContext, target: ...): boolean
  scopes(target: ...): ScopeRef[]   // plugin이 [{kind: 'pharmacy', id: 'xxx'}, ...] 반환
  // 코어는 ScopeRef 의미 모름 — plugin이 정의
}

interface ActorContext {
  user_id: string
  // plugin extension: pharmacy_id?, circle_id?, role? 등
}

// plugin 책임:
//   rootric: 2단계 (auth.uid 기반) — canRead trivial, scopes() = []
//   plott:   5단계 + scope_id (pharmacy_id, circle_id) + 역할매트릭스
//   enroute: 1단계 (전부 private 단순 본인 체크) — scopes() = []
```

**의도적 결정**:
- 코어가 `visibility` enum 정의 X (5단계도 1단계도 아님 — plugin)
- 코어가 `scope_id` 컬럼 박지 X — plugin extension table
- 단 *hook은 코어*에 — 4요소 모든 CRUD가 이 hook 거침. plugin이 trivial 구현(rootric/enroute) 또는 복잡 구현(plott)
- `visibility_changed` Event는 plott plugin의 `Event.type` enum (코어는 모름)

**4요소 정렬 정합성**: 정합. 4요소 인터페이스 자체는 안 흔들림. 단 **WikiAccessControl hook이 코어의 cross-cutting 책임**으로 추가됨 — `@wiki-core/core` 패키지 인터페이스에 명시 필요.

---

## 7. AI 모델·라우터

### 7.1 비교 표

| 차원 | rootric | plott | enroute |
|---|---|---|---|
| **Tier 수** | 4 (T0~T3) | 4 (T0~T3) | **5 (T0~T4)** |
| **T0 룰필터** | 정규식 60% 차단 | 정규식 30% 차단 | 정규식 80%+ 차단 |
| **T1** | Gemini Flash Lite | Gemma 4 12B (Ollama 로컬) | Flash-Lite / Qwen via OpenRouter |
| **T2** | gemma3:12b 로컬 OR Flash | Gemini 2.5 Flash-Lite API | Flash / Haiku |
| **T3** | Gemini Pro / Sonnet | Sonnet (WARNING 검증, 선택적) | Sonnet (헤이즐 일일 리뷰, 페르소나) |
| **T4** | (없음) | (없음) | **Gemma 3 12B 로컬 강제 (C 레이어, 클라우드 금지)** |
| **월 비용 목표** | $10 이하 | $0.5 이하 | $5~10 |
| **정확도 정책 특이** | FP 5% 이하 (FACT 잘못된 사실 = 신뢰 붕괴) | **WARNING 거짓음성 0% 목표** (안전 직결) | C 레이어 누출 0건 (절대) |
| **처리 시점** | 24/7 cron, 1시간 lag | 24/7 cron + 즉시(약사입력) + 캐시(❓버튼) | 10분 cron + 헤이즐 능동 분단위 |

### 7.2 핵심 발견

**(F-7.1) Tier 수 가변** — 3 도메인이 4 Tier (T0~T3) 또는 5 Tier (T0~T4). 코어가 Tier 수를 박으면 enroute Tier 4 (로컬강제) 부재. → 코어는 *Tier 추상*만, Tier *수와 의미*는 plugin 정의.

**(F-7.2) Tier 4 = 민감도 라우팅** — enroute 특화. 텍스트 입력 → 민감도 분류 → C 레이어면 클라우드 차단. rootric/plott에 미세하게 유사(개인정보)하지만 1급 시민 아님.

**(F-7.3) 정확도 정책이 도메인 안전 모델과 직결**:
- rootric: 거짓 *사실* 방지 (FP 5%)
- plott: 거짓 *부재* 방지 (WARNING FN 0%) — *환자 안전*
- enroute: *데이터 누출* 방지 (C 레이어 0건) — *프라이버시*

→ 정확도 임계값 자체는 plugin이 결정. 코어는 measurement만.

**(F-7.4) 비용 격차 20배** — $0.5 vs $10. 라우터가 비용 추적 hook 제공해야 plugin이 budget 관리.

### 7.3 코어/plugin 결정

```
@wiki-core/router 의 인터페이스 (1차 가설)
─────────────────────────────────────────────
interface RouterTier {
  id: string                // plugin 정의 ("T0", "T1", ..., "T4_local_forced")
  selector: (input) => boolean   // 이 Tier에 갈지 결정 (plugin 정의)
  model: ModelHandle
  cost_estimator?: (input) => number  // $/1K tokens
}

interface Router {
  tiers: RouterTier[]       // 가변 N개 — plugin이 1, 4, 5 자유롭게
  route(input): RouterTier  // 첫 selector 통과한 Tier
  budget_hook?: (cost: number) => void   // 누적 비용 알림
}

// plugin 책임:
//   rootric: 4 tier (FACT/ASSUMPTION 분류 정확도 임계값 plugin)
//   plott:   4 tier + WARNING 거짓음성 0% 정책 = T3 항상 호출 + 수동 confirm
//   enroute: 5 tier + 민감도 분류기(privacy-filter) → T4 강제
```

**4요소 정렬 정합성**: 정합. router는 4요소와 독립. 단 enroute Tier 4 (민감도 라우팅) 가 *입력 ingest layer* 와도 연결됨 — `@wiki-core/router` 가 Ingest hook을 받을 수 있어야 함 (text 들어올 때 민감도 분류 → Tier 결정).

---

## 8. 저장소

### 8.1 비교 표

| 차원 | rootric | plott | enroute |
|---|---|---|---|
| **Truth source** | Supabase 단일 | Supabase 단일 (+ pgvector for wiki_embeddings) | **Supabase + Google Sheets + (향후) SQLite** |
| **RLS** | ✅ (auth.uid 기준) | ✅ (auth.uid + pharmacy_members) | ✅ (사실상 본인만) |
| **재활용 기존 schema** | factsheet_articles, factsheet_topics, dart_disclosures_parsed, factsheet_news, reports, policy, covered_stocks, financial_data, price_data, consensus | wiki_pages, wiki_links, wiki_versions, wiki_embeddings, drug_master, pharmacies, pharmacy_members, users | nodes, node_links, goal_layers, containers, activity_logs, journal_entries, tasks, hazel_daily_summaries, ai_sessions, github_dev_sessions, freedom_balance_*, area_tagging_rules |
| **신규 필요 테이블** | wiki_objects, wiki_attributes, wiki_relations, wiki_events, wiki_pages, wiki_processing_log | wiki_objects, wiki_attributes, wiki_relations, wiki_events, wiki_visibility, wiki_sources, **circles, circle_members** | wiki_pages, wiki_atomic_clusters, wiki_lint_issues, wiki_processing_log |
| **외부 강결합** | covered_stocks (종목마스터) | drug_master 305K건 (HIRA+EAN, **plott-stock에서 sync**) | (없음 — 본인 데이터) |
| **분리된 truth source 통합** | 없음 (단일 DB) | 없음 (단일 DB) | **있음** — 시트(체결) ↔ Supabase(시간) ↔ Hermes SQLite(대화) 3분리 |
| **민감도 라우팅** | 없음 (전부 Supabase) | 약함 (전부 Supabase, RLS만) | **강함** — C 레이어는 Supabase에 있어도 클라우드 LLM 차단 |

### 8.2 핵심 발견

**(F-8.1) Storage 단수 vs 복수 발산** — rootric/plott는 단일 truth source, enroute는 *3 storage 분리가 의도된 설계*. 코어가 단일 storage 가정하면 enroute 부담.

**(F-8.2) 다중 storage는 enroute의 *truth source 의존성* — 동기화가 아니라 분리** — 시트가 체결의 truth, Supabase가 시간의 truth, SQLite가 대화의 truth. 단순 캐시/replica 아님. → 코어가 *attribute/relation/event마다 다른 storage 가능* 하도록 설계해야 함.

**(F-8.3) 외부 강결합이 plott만 있음** — drug_master 305K row가 plott-stock에서 sync. plott plugin이 *외부 시스템과 sync 계약* 이 핵심 책임. → plugin이 외부 sync 어댑터 자유 정의.

**(F-8.4) 모든 도메인이 Supabase + RLS 사용** — 코어 storage 어댑터 1번 후보는 명백히 Postgres+RLS. Sheets/SQLite는 enroute plugin의 추가 어댑터.

### 8.3 코어/plugin 결정

```
@wiki-core/storage 의 인터페이스 (★ multi-storage 1급)
─────────────────────────────────────────────
interface StorageAdapter {
  kind: string              // "postgres" / "sheets" / "sqlite"
  read(target_kind, id): WikiObject | WikiAttribute | ...
  write(target): void
  query(filter): T[]
}

interface StorageRouter {
  // 한 도메인이 여러 어댑터를 동시 운영
  adapters: Record<string, StorageAdapter>
  resolve(target_kind, target_id): StorageAdapter   // plugin이 정책 정의
}

// plugin 책임:
//   rootric: 1 adapter (Postgres+RLS)
//   plott:   1 adapter (Postgres+RLS+pgvector) + drug_master sync 어댑터 (plott-stock)
//   enroute: 3 adapter (Postgres+RLS, Sheets, SQLite) + 민감도 라우팅 (C 레이어 격리)
```

**4요소 정렬 정합성**: 정합. 4요소 CRUD가 storage adapter 거치도록 추상화. 단 **multi-storage 가정을 1급으로 두는 것**이 매트릭스 신규 결정 — Section 9 통합 결론에서 박제.

---

## 9. 통합 결론

### 9.1 4요소 결정 정합성 검증

매트릭스 7 Section 검증 결과: **4요소 정렬 결정(plugin 모델) 흔들기 없음**.

| 잠정 결정 | 매트릭스 영향 |
|---|---|
| ① plugin 모델 채택 | ✅ 7 Section 모두 plugin 분리 정당화 |
| ② type 인터페이스 string | ✅ ingest source_kind / Tier id / storage kind 모두 string 일관 |
| ③ Provenance에 strength/confidence 안 넣음 | ✅ Section 4에서 출처 충돌 모델 3종 발산 재확인 |
| ④ 라벨 enum 일체 plugin | ✅ Section 3 카테고리·플래그도 plugin extension table |
| ⑤ 패키지 5→4 (Phase 3 보류) | ✅ Section 5에서 renderer 4 컴포넌트 공통성 확인 → 분리 정당 |

### 9.2 매트릭스 신규 발견 — 추가 코어 인터페이스 2종

매트릭스가 발견한 *추가 hook*:

#### A. WikiAccessControl Hook (★ Section 6 visibility cross-cutting)

**문제**: visibility는 Object/Attribute/Relation/Event 4요소 모두에 *횡단*. 단순 컬럼 추가로 해결 X.

**결정**: 코어가 `WikiAccessControl` hook 인터페이스 제공. plugin이 4요소 모든 CRUD 시 hook 거치도록.

- rootric: trivial 구현 (auth.uid 기반 2단계)
- plott: 5단계 + scope_id (pharmacy_id, circle_id) + 역할매트릭스 + visibility_changed 이벤트 자체 정의
- enroute: trivial 구현 (사실상 본인만)

코어는 ScopeRef 의미를 모름 — plugin이 정의.

#### B. Multi-Storage 1급 시민 (★ Section 8)

**문제**: enroute는 의도적 3 storage 분리. 코어가 단일 storage 가정하면 부담.

**결정**: `StorageRouter` 가 코어 1급. 한 도메인이 N개 adapter 운영 가능. 4요소 CRUD가 항상 router 거침.

- rootric/plott: 1 adapter
- enroute: 3 adapter (Postgres + Sheets + SQLite)

### 9.3 코어 패키지 인터페이스 최종 (1차 가설)

```
@wiki-core/core (4요소 + 신규 cross-cutting hook 2종)
─────────────────────────────────────────────
4요소: WikiObject / WikiAttribute / WikiRelation / WikiEvent
보조:  WikiProvenance / WikiLabel
hook:  validateObjectType / onAttributeWrite / noiseFilter / provenanceExtension / labelRouter
       + WikiAccessControl(canRead/canWrite/scopes) ★ 신규
       + StorageRouter(adapters/resolve) ★ 신규

@wiki-core/storage  — adapter 인터페이스 + Postgres 구현 (Sheets/SQLite는 plugin 또는 별도)
@wiki-core/router   — Tier 가변 라우터 + 비용 hook + Ingest 연동
@wiki-core/renderer — TimeSeriesChart / RelationGraph / Timeline / SourceCard 4 컴포넌트
```

### 9.4 abstraction_decision.md로 넘길 항목

- 4요소 정렬 결정 7개 (plugin 모델, type=string, provenance 분리, 라벨 분리, 패키지 4개, repo 분리, plugin 네이밍 자율)
- 매트릭스 신규 결정 2개 (WikiAccessControl hook, multi-storage 1급)
- 부록 A 4항 (모두 닫힘) 박제
- Phase 3 SPEC 작성 시 재검증할 항목 목록

### 9.5 미해결 — Phase 3 SPEC에서 답할 것

| # | 질문 | 영향 |
|---|---|---|
| 1 | `WikiAccessControl.scopes()` 가 반환하는 `ScopeRef` 의 정확한 schema | 코어 인터페이스 |
| 2 | `StorageRouter.resolve()` 정책 (target_kind 기준? plugin 정책?) | storage 패키지 |
| 3 | router가 ingest text를 받는 hook 시그니처 (enroute Tier 4 민감도 분류) | router 패키지 |
| 4 | `noiseFilter` 가 코어에 있어야 하나 plugin마다 자체? (YAGNI 적용) | core vs plugin |
| 5 | renderer 4 컴포넌트의 *입력 표준화 형식* (예: TimeSeriesChart가 받는 attribute 형식) | renderer 패키지 |

→ 위 5항은 Phase 3 SPEC 작성 시 답. Phase 2(추상화 결정)에는 영향 없음.

---

## 10. 다음 단계

1. **abstraction_decision.md 작성** — 4요소 정렬 + 매트릭스 결정 종합 박제 (이 문서가 이미 90% 골격)
2. **에드워드 최종 검토** — WikiAccessControl hook + multi-storage 1급에 대한 OK
3. **commit & push** — 도메인 세션이 결정 받아갈 수 있게
4. **Phase 3 — 패키지 SPEC 작성** (`packages/{core,storage,router,renderer}/SPEC.md`)
5. **Phase 4 — 도메인 plugin 합류 가이드** (도메인 owner 작업)

---

## 부록 — Wiki 페이지·시각화 컴포넌트 입력 형식 (Phase 3 미리보기)

renderer 4 컴포넌트가 받을 표준 형식 (Phase 3에서 확정):

```
TimeSeriesChart: {
  series: { object_id, key, points: [{valid_at, value}] }[]
  unit?: string
}

RelationGraph: {
  nodes: WikiObject[]
  edges: WikiRelation[]
  layout?: 'force' | 'tree' | 'radial'
}

Timeline: {
  events: WikiEvent[]
  group_by?: 'object' | 'type'
}

SourceCard: {
  provenance: WikiProvenance
  label?: string  // 도메인 표시명 (DART / 식약처 / Activity Watch ...)
}
```

→ 4요소 인터페이스에 직접 의존. plugin이 자기 도메인 데이터로 4요소 채우면 자동 렌더 가능.
