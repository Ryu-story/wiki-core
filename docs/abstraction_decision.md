# wiki-core 추상화 결정 — Phase 2 최종

> 4요소 정렬 + 7섹션 매트릭스 분석 결과를 1곳에 박제하는 종합 결정 문서.
> Phase 3 (패키지 SPEC 작성) 진입 전 도메인 owner들이 받아갈 1차 결과물.
>
> **작성자**: 머큐리 (wiki-core 코어 아키텍트)
> **작성일**: 2026-04-27
> **세션**: Mercury 1차 (Phase 2 종결)
> **선행**: `docs/4element_alignment.md`, `docs/comparison_matrix.md`
> **검증자**: 에드워드 (행동 원칙 #4 — 도메인 owner 직접 대화 X, 에드워드를 통한 검증)

---

## 0. 결정 한 줄

> **풀 추상화 거부, plugin 모델 채택.** wiki-core repo는 코어 4 패키지만, plugin은 각 도메인 repo에서 자체 빌드.

---

## 1. 3 옵션 비교

Phase 2 시작 시 머큐리에게 주어진 선택지 3개. 매트릭스·4요소 분석 결과 plugin 모델만 정합.

| 옵션 | 의미 | 채택? | 거부 이유 |
|---|---|---|---|
| **A. 풀 추상화** | `@wiki-core/*` 패키지가 Stock/Drug/Vision 등 도메인 어휘 enum까지 통합 | ❌ | 4요소 정렬 위험 신호 3개 모두 매핑에서 재현 — 한 도메인 어휘를 코어가 받아들이면 다른 2 도메인이 부자연스러워짐 (FACT/ASSUMPTION enum, 5단계 가시성, Vision 3축 모두 도메인 1급 시민) |
| **B. plugin 모델** ✅ | `@wiki-core/core` + 도메인별 plugin (`@rootric/wiki-plugin` 등) | **✅ 채택** | 코어가 "구조"만, plugin이 "정책" — 이미 4요소 type=string, 라벨 enum plugin 같은 결정에서 패턴 일관 |
| **C. 별도 진행** | wiki-core 폐기. 3 도메인이 각자 독립 wiki 시스템 구축 | ❌ | 매트릭스 결과 *공통 영역 존재 확인* — 시각화 4 컴포넌트, Tier 라우터 추상, storage 어댑터, 4요소 인터페이스. 각자 독립 시 이 공통 부분이 3번 중복 구현됨 (낭비) |

### 1.1 옵션 B 정당성 핵심 근거

매트릭스 7 Section 검증 결과:

| Section | plugin 분리 정당화 |
|---|---|
| 2 입력 소스 | 처리량 30배·자동/수동 비중 정반대 → adapter 인터페이스만 코어 |
| 3 라벨 차원 | 카테고리 1·2·5축 발산 + 특수 플래그 모두 도메인 1급 → plugin extension table |
| 4 시간축 | 시간 단위 분기↔분, 누적 정책 3종 (덮어쓰기/append/합산) → plugin |
| 5 시각화 | **시각화 4 컴포넌트 진짜 공통** → `@wiki-core/renderer` 정당 |
| 6 권한 | 5단계/2단계/1단계 발산 + scope_id 차원 plott만 → cross-cutting hook |
| 7 라우터 | Tier 수 4·4·5 가변, 정확도 정책 도메인 안전 모델 직결 → Tier 가변 라우터 |
| 8 저장소 | 1·1·3 storage 발산 → multi-storage 1급 |

→ 코어 패키지 분리 정당, 단 도메인 어휘는 100% plugin.

---

## 2. 채택된 결정 9건

### 2.1 4요소 정렬 결정 7건 (에드워드 검증 통과)

| # | 결정 | 근거 |
|---|---|---|
| 1 | **풀 추상화 거부, plugin 모델 채택** | 위험 신호 3개 매핑 재현 |
| 2 | 4요소 type을 **string**으로 (enum X) | 코어가 type 카탈로그 모르는 채로 plugin 자유 추가 — Phase 4 hook 충분성 재검증 |
| 3 | Provenance에 **strength/confidence/is_official 안 넣음** — plugin extension table | rootric 가중치 ≠ enroute 3중비교 ≠ plott is_official, 의미 직교 X |
| 4 | 라벨 enum **일체 plugin** — 코어는 (label_set_id, label_id) 슬롯만 | 검증축/규범축/시간축 직교, 환산 불가 |
| 5 | 패키지 **5→4 축소** (engine/router/memory/extractor/renderer → core/storage/router/renderer) — Phase 3 최종 확정 | memory/extractor는 plugin에 흡수 |
| 6 | wiki-core repo는 **코어만**. plugin은 도메인 repo 자체 빌드 | 머큐리 행동 원칙 #1 정합 — 도메인 어휘 노출 차단 |
| 7 | plugin namespace **도메인 자율** (예: `@rootric/wiki-plugin`) | repo 분리 결정에 따라 자연 도출 |

### 2.2 매트릭스 신규 결정 2건 (에드워드 검증 통과)

| # | 결정 | 근거 |
|---|---|---|
| 8 | **`WikiAccessControl` cross-cutting hook** 추가 — visibility를 코어 정책 X, plugin 정책 ✓ | plott 5단계 가시성이 4요소 모두에 횡단 (Object/Attribute/Relation/Event), 단순 컬럼 추가로 해결 X |
| 9 | **Multi-storage 1급 시민** — `StorageRouter` 가 N개 adapter 운영 | enroute의 truth source 3분리 (시트=체결, Postgres=시간, SQLite=대화) 의도된 설계 |

### 2.3 결정 패턴 일관성

9건 모두 같은 원리:
> **"코어로 묶을 수 없는 영역 → hook 인터페이스로 두고 plugin이 정책 구현"**

| 결정 | 묶을 수 없는 이유 | hook |
|---|---|---|
| #2 type=string | 도메인 entity 카탈로그 발산 | validateObjectType |
| #3 provenance 분리 | 출처 모델 의미 충돌 | provenanceExtension |
| #4 라벨 분리 | 라벨 축 직교 | labelRouter |
| #8 access control | 가시성 단계 발산 | WikiAccessControl |
| #9 multi-storage | storage 분리도 발산 | StorageRouter |

→ 5개 hook이 코어의 *cross-cutting 책임*. 4요소 인터페이스는 변경 X.

---

## 3. 부록 A 4항 (모두 닫힘)

| # | 항목 | 결정 |
|---|---|---|
| A.1 | plugin 패키지 네이밍 | 도메인 namespace 자율 (`@rootric/wiki-plugin` 등) |
| A.2 | 단일 repo vs 별도 repo | **별도 repo** (도메인 repo 자체 빌드) |
| A.3 | plugin 간 cross-reference | (a) 코드 import 허용 (도메인 자율) + (b) 데이터 cross-label 허용 (코어 설계 반영) |
| A.4 | 기존 schema 마이그레이션 | **plugin 책임** — 도메인 owner가 plugin 작성 시 매핑. 머큐리는 매트릭스에서 코어 인터페이스 수용성 검증 |

→ Phase 2 → 3 진행에 추가 차단 없음.

---

## 4. 코어 패키지 인터페이스 최종 (1차 가설)

Phase 3에서 SPEC 작성 시 보강될 골격.

### 4.1 wiki-core repo 구조

```
wiki-core/
├── packages/
│   ├── core/        — 4요소 인터페이스 + 5 hook + 보조 슬롯 (provenance/label)
│   ├── storage/     — adapter 인터페이스 + Postgres 구현
│   ├── router/      — Tier 가변 라우터 + 비용 hook + Ingest 연동
│   └── renderer/    — TimeSeriesChart / RelationGraph / Timeline / SourceCard
├── docs/
│   ├── *_wiki_requirements.md  (3 도메인 명세서)
│   ├── 4element_alignment.md   (4요소 결정)
│   ├── comparison_matrix.md    (7섹션 매트릭스)
│   └── abstraction_decision.md (이 문서)
└── CLAUDE.md
```

### 4.2 코어 인터페이스 골격

```ts
// @wiki-core/core
// 4요소 (1급 시민)
WikiObject     { id, type:string, label, identifier?, created_origin, created_at }
WikiAttribute  { object_id, key:string, value, unit?, valid_at?, valid_until? }
WikiRelation   { from_id, to_id, type:string, directionality, weight? }
WikiEvent      { id, object_ids[], type:string, occurred_at, payload }

// 보조 슬롯
WikiProvenance { source_kind:string, source_ref, recorded_at }
WikiLabel      { target_kind, target_id, label_set_id, label_id }

// Hook (5종)
validateObjectType(type, payload) → boolean
onAttributeWrite(attr) → void
noiseFilter(text) → boolean        // ★ 3 도메인 PLAIN/Noise 공통 (Phase 3 YAGNI 재검토)
provenanceExtension(prov) → ProvenanceExt
labelRouter(target, content) → WikiLabel
WikiAccessControl { canRead, canWrite, scopes }   // ★ 매트릭스 신규
StorageRouter { adapters[], resolve(target) }     // ★ 매트릭스 신규
```

### 4.3 도메인 plugin 의무 구현 (Phase 4 가이드 시작점)

각 plugin이 구현해야 할 최소 인터페이스:

| 인터페이스 | rootric 예 | plott 예 | enroute 예 |
|---|---|---|---|
| Object type 카탈로그 | Stock/Sector/BU/Product/Customer/... | Drug/Pharmacy/Procedure/... | Vision/Area/Project/Container/Activity/... |
| Label set | rootric_validation (FACT/ASSUMPTION/...) | plott_norm (FACT/PROCEDURE/POLICY/WARNING/...) | enroute_origin (선언/실측/회고/...) |
| `validateObjectType` | ticker 6자리 | HIRA 코드 | type=vision의 metric_type enum |
| `provenanceExtension` | strength 컬럼 | is_official 컬럼 | (없음, 본인 데이터) |
| `labelRouter` | FACT/ASSUMPTION 분류 | FACT/PROCEDURE/POLICY/WARNING 분류 | 선언/실측/회고 분류 |
| `WikiAccessControl` | trivial (auth.uid 2단계) | 5단계 + scope_id + 역할매트릭스 | trivial (본인만) |
| `StorageRouter` | Postgres 1 adapter | Postgres + drug_master sync | Postgres + Sheets + (향후) SQLite |
| Ingest adapter | DART/리포트/뉴스/정책/컨센서스 | 시트/공지/약가CSV/메모/모임 | ActivityWatch/봇/마인드맵/Journal/캘린더/GitHub |
| Tier 카탈로그 | T0~T3 ($10/월) | T0~T3 + WARNING 검증 ($0.5/월) | T0~T4 + 민감도 라우팅 ($5-10/월) |
| Wiki 페이지 템플릿 | Stock/Topic/Sector | Drug/Procedure/Topic | Area/Vision/Project |

---

## 5. 다음 단계 (Phase 3 → 4)

### Phase 3 — 패키지 SPEC 작성 (머큐리 작업 영역)

`packages/{core,storage,router,renderer}/SPEC.md` 작성. Phase 3 진입 전 답할 것 5개:

| # | 미해결 질문 | 영향 |
|---|---|---|
| 1 | `WikiAccessControl.scopes()` 의 `ScopeRef` schema | core |
| 2 | `StorageRouter.resolve()` 정책 (target_kind 기준? plugin?) | storage |
| 3 | router의 ingest text hook 시그니처 (Tier 4 민감도 분류) | router |
| 4 | `noiseFilter` 코어 vs plugin (YAGNI 적용 여부) | core/plugin 경계 |
| 5 | renderer 4 컴포넌트 입력 표준화 형식 | renderer |

→ 답은 SPEC 작성 자체에서 자연 도출. Phase 2 결정에는 영향 없음.

### Phase 4 — 도메인 plugin 합류 (도메인 owner 작업)

머큐리가 작성할 합류 가이드 (Phase 3 SPEC 완료 후):

1. **plugin 책임 명세** — 4.3 표 확장
2. **plugin 작성 boilerplate** — 코어 인터페이스 구현 템플릿
3. **합류 순서 결정** — rootric 먼저? plott 먼저? (도메인 owner의 작업 가능 시점에 따라)
4. **기존 schema 마이그레이션 가이드** — plugin이 기존 테이블을 코어 인터페이스로 read/write 어댑터 작성
5. **검증 체크리스트** — plugin이 코어 hook 5개 모두 구현했는지, label_set 등록했는지 등

---

## 6. 머큐리 행동 원칙과의 정합 검토

이 결정이 CLAUDE.md 행동 원칙 5개와 어떻게 정합하는지:

| 원칙 | 정합 결과 |
|---|---|
| #1 도메인 작업 거부 | ✅ plugin은 도메인 repo에서 도메인 owner가 작성. 머큐리는 코어만. |
| #2 인터페이스 합의 → 구현 | ✅ Phase 2 (이 문서)에서 인터페이스 골격 합의 → Phase 3에서 SPEC → Phase 4에서 plugin 구현 |
| #3 공통점 검증 의무 | ✅ 4요소 정렬에서 cross-check, 매트릭스에서 7섹션 재검증. "공통이다" 선언 전 모두 검증함 |
| #4 에드워드를 검증자로 | ✅ 에드워드가 ① ~ ⑦ + 부록 A 4항 모두 검증. 도메인 owner들과 직접 대화 X |
| #5 YAGNI 우선 | ✅ Phase 2에선 추상화 후보 도출만. 코드 작성은 Phase 3 이후. `noiseFilter` 같은 미묘한 항목도 YAGNI 재검토로 미룸 |

---

## 7. 도메인 owner들에게 전달할 메시지 (에드워드 경유)

### 7.1 한 줄 요약

> wiki-core는 plugin 모델로 갑니다. 각 도메인이 자기 repo에서 plugin을 작성하시면 됩니다.

### 7.2 도메인 owner 책임 (Phase 4 합류 시)

- 자기 repo에 wiki-plugin 패키지 생성 (네이밍 자율)
- 코어 인터페이스(@wiki-core/core)에 맞춰 4요소 type 카탈로그 + label_set + 5 hook + ingest adapter + Wiki 페이지 템플릿 구현
- 기존 schema(rootric `factsheet_articles`, plott `wiki_pages` 등, enroute `nodes`/`node_links` 등) → 코어 인터페이스 매핑 어댑터 작성

### 7.3 도메인 owner가 안 해도 되는 것

- 코어 인터페이스 변경 요청 X (머큐리가 단독 결정 권한)
- 다른 도메인 owner와 직접 합의 X (에드워드 경유)
- 자기 도메인 어휘를 코어에 반영 요구 X (plugin extension으로 처리)

### 7.4 충돌 시 해결

- plugin 작성 중 코어 인터페이스가 자기 도메인 수용 못하는 케이스 발견 → 에드워드 경유 머큐리에게 전달
- 머큐리가 코어 인터페이스 보완 또는 hook 추가 검토
- 단 도메인 어휘를 코어에 끌어들이는 변경은 거부 (plugin extension으로 해결)

---

## 8. 결정 박제 체크리스트

| # | 항목 | 박제 위치 |
|---|---|---|
| ✅ | plugin 모델 채택 결정 | 이 문서 §0, §2.1 |
| ✅ | 9 결정 종합 | 이 문서 §2 |
| ✅ | 부록 A 4항 닫힘 | 이 문서 §3 + 4element_alignment.md 부록 A |
| ✅ | 코어 인터페이스 골격 | 이 문서 §4 + 4element_alignment.md §1, §4 |
| ✅ | 매트릭스 신규 hook 2종 | 이 문서 §2.2 + comparison_matrix.md §6, §8 |
| ✅ | Phase 3·4 액션 플랜 | 이 문서 §5 |
| ✅ | 도메인 owner 메시지 | 이 문서 §7 |

→ Phase 2 산출물 3개(4element_alignment / comparison_matrix / abstraction_decision) 모두 완료. 머큐리 1차 세션 결정 박제 완료.
