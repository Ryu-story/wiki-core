# @wiki-core/core — SPEC

> wiki-core 코어 패키지. 4요소(Object / Attribute / Relation / Event) + 보조 슬롯(Provenance / Label) + Hook 인터페이스(5 기본 + 2 cross-cutting) + 헬퍼 카탈로그 정의.
>
> **작성자**: 머큐리 (wiki-core 코어 아키텍트)
> **작성일**: 2026-04-28
> **세션**: Mercury 2차 (Phase 3 — 패키지 SPEC 작성)
> **선행**: `docs/abstraction_decision.md` §4, `docs/4element_alignment.md` §1·§4, `docs/comparison_matrix.md` §6·§8, `docs/domain_feedback_log.md`
>
> **status**: 1차 SPEC. 도메인 owner 검토 후 Phase 4 plugin 작성 단계에서 보완 가능 (semver 정책 §8 참조).

---

## 0. 목적·scope

`@wiki-core/core` 는 도메인 어휘를 *모르는* 채로 4요소 CRUD + Hook 분배만 담당한다. 도메인 enum / 라벨 / 가시성 정책 / storage 선택은 일체 plugin 책임.

### 0.1 코어가 제공하는 것

- 4요소 1급 시민 (`WikiObject` / `WikiAttribute` / `WikiRelation` / `WikiEvent`)
- 보조 슬롯 2종 (`WikiProvenance` / `WikiLabel`)
- Hook 인터페이스 7종 (5 기본 + 2 cross-cutting)
- 헬퍼 유틸 — 현재는 `noise` 1종 (HTML strip / 짧은 길이 / CSS 패턴 / 빈 줄)
- Plugin Manifest 등록 API

### 0.2 코어가 의도적으로 *제공하지 않는* 것

`docs/4element_alignment.md` §4 참조. 요약:

| 영역 | 이유 | plugin 책임 |
|---|---|---|
| Object/Attribute/Relation/Event `type` enum | 도메인 entity 카탈로그 발산 | plugin이 string으로 자유 등록 |
| Provenance `strength` / `confidence` / `is_official` | 출처 모델 의미 충돌 (rootric 가중치 ≠ plott 공식성 ≠ enroute 3중 비교) | plugin extension table |
| Label enum | 검증축/규범축/시간축 직교 | plugin이 label_set 정의 |
| Visibility 단계 / scope 종류 | 1·2·5 단계 발산 | `WikiAccessControl` plugin 구현 |
| Storage 종류 / multi-storage 정책 | 1·1·3 storage 발산 | `StorageRouter` plugin 구현 |
| 시간 단위 / 시계열 누적 정책 | 분기·일·분 5단위 차이, 덮어쓰기·append·합산 발산 | plugin이 `onAttributeWrite` hook에서 결정 |

### 0.3 의존성

코어는 `@wiki-core/storage` / `@wiki-core/router` / `@wiki-core/renderer` 에 *의존하지 않음*. 역방향 — 다른 코어 패키지가 `@wiki-core/core` 의 타입을 import.

Plugin은 `@wiki-core/core` 의 인터페이스를 implement + 자기 도메인 type/enum 자유 등록.

---

## 1. 4요소 인터페이스 (1급 시민)

```ts
// @wiki-core/core/src/types.ts

export type ID = string;            // UUID v4 권장. 코어는 형식 강제 X
export type ISOTimestamp = string;  // ISO 8601 (e.g. "2026-04-28T12:00:00Z")
export type JSONValue =
  | string | number | boolean | null
  | JSONValue[] | { [k: string]: JSONValue };

/**
 * 1급 객체. 도메인 entity (Stock / Drug / Vision 등) 를 담음.
 * type 은 string — 코어는 카탈로그 모름. plugin 이 validateObjectType hook 으로 검증.
 */
export interface WikiObject {
  id: ID;
  type: string;                            // plugin 정의 ("stock" / "drug" / "vision" 등)
  label: string;                           // 사람이 읽는 이름
  identifier?: string;                     // 도메인 식별자 (ticker / HIRA / nodes.id)
  created_origin: 'ingest' | 'manual' | 'auto';  // 위험 신호 1 대응
  created_at: ISOTimestamp;
  updated_at?: ISOTimestamp;
}

/**
 * 객체의 속성 1개. 시계열 추적 시 valid_at / valid_until 채움.
 * 누적 정책 (덮어쓰기 / append / 합산) 은 plugin 의 onAttributeWrite 가 결정.
 */
export interface WikiAttribute {
  id: ID;
  object_id: ID;
  key: string;                             // plugin 정의 ("market_cap" / "stock_level" / "accumulated_minutes")
  value: JSONValue;
  unit?: string;                           // plugin 자유 ("KRW" / "minute" / "%" 등)
  valid_at?: ISOTimestamp;                 // 시계열 시작
  valid_until?: ISOTimestamp;              // 시계열 만료 (열린 구간이면 undefined)
  recorded_at: ISOTimestamp;               // attribute row 자체의 생성 시각
}

/**
 * 두 객체 간 관계.
 * weight 는 optional — enroute cross link 처럼 가중치 의미를 plugin 이 부여.
 */
export interface WikiRelation {
  id: ID;
  from_id: ID;
  to_id: ID;
  type: string;                            // plugin 정의 ("supplies_to" / "treats" / "cross")
  directionality: 'directed' | 'undirected';
  weight?: number;
  created_at: ISOTimestamp;
}

/**
 * 시간점 사건. payload 는 자유 슬롯 — plugin 이 schema 책임.
 */
export interface WikiEvent {
  id: ID;
  object_ids: ID[];                        // 사건이 영향 미친 객체 1+
  type: string;                            // plugin 정의
  occurred_at: ISOTimestamp;
  payload: JSONValue;
  recorded_at: ISOTimestamp;
}
```

### 1.1 코어가 보장하는 invariant

| Invariant | 책임 |
|---|---|
| `id` 유니크 (target_kind 내) | 코어 (storage adapter 가 보장) |
| `created_at` ≤ `updated_at` | 코어 |
| `valid_at` ≤ `valid_until` (둘 다 있을 때) | 코어 |
| `from_id` / `to_id` / `object_ids[]` 가 존재하는 `WikiObject.id` 인지 | 코어 (FK) |
| `type` / `key` 카탈로그 검증 | **plugin** (`validateObjectType` hook) |
| 시계열 누적 정책 | **plugin** (`onAttributeWrite` hook) |

---

## 2. 보조 슬롯 (Provenance / Label)

```ts
/**
 * 4요소 모든 row 에 0..N 개 붙는 출처 레코드.
 * strength / confidence / is_official 등은 plugin extension table 에서 처리.
 */
export interface WikiProvenance {
  id: ID;
  target_kind: 'object' | 'attribute' | 'relation' | 'event';
  target_id: ID;
  source_kind: string;                     // plugin 정의 ("dart" / "sheet" / "user" / "activitywatch")
  source_ref: string;                      // url / sheet_id+tab / user_id / aw_event_id
  recorded_at: ISOTimestamp;
}

/**
 * 4요소 모든 row 에 0..N 개 붙는 분류 레코드.
 * 같은 target 에 여러 label_set 동시 적용 가능 (부록 A.3 cross-label 허용).
 */
export interface WikiLabel {
  id: ID;
  target_kind: 'object' | 'attribute' | 'relation' | 'event';
  target_id: ID;
  label_set_id: string;                    // plugin 등록 (e.g. "rootric_validation")
  label_id: string;                        // plugin 정의 (e.g. "FACT")
  applied_at: ISOTimestamp;
}
```

### 2.1 Plugin extension 가이드

도메인 특수 컬럼은 별도 plugin extension table:

| Plugin | extension table 예 | 컬럼 |
|---|---|---|
| `@rootric/plugin` | `rootric_provenance_ext` | `provenance_id` FK, `strength` int, `is_key` bool, `expires_at` timestamp |
| `@plott/plugin` | `plott_provenance_ext` | `provenance_id` FK, `is_official` bool, `is_pharmacy_specific` bool |
| `@enroute/plugin` | `enroute_label_ext` | `label_id` FK, `wisdom` bool, `voluntary` bool |

코어는 이 table 의 schema 모름. plugin 이 `provenanceExtension` hook 에서 join.

---

## 3. Hook 인터페이스 (5 기본)

```ts
// @wiki-core/core/src/hooks.ts

export interface CoreHooks {
  /**
   * Object 생성·수정 시. 검증 실패 시 throw.
   * 예: rootric ticker 6자리 / plott HIRA 코드 / enroute type=vision 의 metric_type enum
   */
  validateObjectType?(
    type: string,
    payload: Partial<WikiObject>
  ): void | Promise<void>;

  /**
   * Attribute 쓰기 후 fire-and-forget.
   * 시계열 누적 정책 (덮어쓰기 / append / 합산) plugin 결정.
   * 예: rootric strength 재계산 / plott 약국 단가 시계열 갱신 / enroute Area 누적시간 갱신
   */
  onAttributeWrite?(attr: WikiAttribute): void | Promise<void>;

  /**
   * Ingest 텍스트 입력 전 노이즈 필터.
   * 코어 헬퍼(@wiki-core/core/utils/noise) 4종 + plugin 룰 결합.
   * true = drop, false = keep.
   * (Mercury 2차 결정 — domain_feedback_log.md 참조)
   */
  noiseFilter?(text: string): boolean;

  /**
   * Provenance row 생성 시. plugin 이 extension table row 동시 작성.
   * 예: rootric strength / plott is_official / enroute (없음, no-op)
   */
  provenanceExtension?(
    prov: WikiProvenance
  ): void | Promise<void>;

  /**
   * 분류 라우터. content 를 받아 label_set 내 label 결정 → WikiLabel row 작성.
   * 예: rootric FACT/ASSUMPTION 분류 / plott FACT/PROCEDURE/POLICY/WARNING / enroute 선언/실측/회고
   * plugin 이 LLM Tier 라우터 호출 자유.
   */
  labelRouter?(
    target: { kind: 'object' | 'attribute' | 'relation' | 'event'; id: ID },
    content: string
  ): Promise<WikiLabel[]>;
}
```

### 3.1 noiseFilter 헬퍼 카탈로그 (★ Mercury 2차 결정)

```ts
// @wiki-core/core/src/utils/noise.ts

/**
 * 4종 메커니즘 헬퍼. plugin 이 자유 import + 자기 도메인 룰 추가.
 * (rootric DART HTML / plott 약사 인사말 / enroute URL 토큰 모두 4종 조합으로 시작 가능)
 */

export function stripHtml(text: string): string {
  // <tag>...</tag> 제거 + entity decode
}

export function isTooShort(text: string, minChars = 10): boolean {
  return text.trim().length < minChars;
}

export function matchesCssNoise(text: string): boolean {
  // {color: ...} / @media / px·rem 단위 등 정규식
}

export function isBlankOrWhitespace(text: string): boolean {
  return text.trim().length === 0;
}

/**
 * Predicate or-chain (any true → drop).
 * stripHtml 은 string 반환 (transform) 이므로 chain 의 *사전 처리* 단계에서 사용.
 *
 * 예 (rootric — DART HTML):
 *   const dropPred = combine([
 *     (t) => isTooShort(t, 20),
 *     matchesCssNoise,
 *     dartHtmlNoise,                 // plugin 도메인 룰
 *   ]);
 *   const filter = (text: string) => dropPred(stripHtml(text));
 */
export function combine(
  rules: Array<(text: string) => boolean>
): (text: string) => boolean;
```

**책임 분리 재확인**:
- 코어: 메커니즘 (HTML strip / 짧은 길이 / CSS 패턴 / 빈 줄)
- Plugin: 도메인 특수 룰 (DART HTML 정규식 / URL 토큰 / 약사 인사말 / 짧은 시스템 로그)
- Plugin 이 헬퍼 import 는 자유 — 안 써도 됨

Phase 4 plugin 작성 시 헬퍼 부족 발견되면 4종 → 추가. 단 *도메인 룰* 은 절대 코어로 안 옴 (행동 원칙 #1).

---

## 4. Cross-cutting Hook 2종 (★ 매트릭스 신규)

### 4.1 WikiAccessControl

```ts
// @wiki-core/core/src/access.ts

/**
 * 4요소 모든 read/write 시 hook 호출. plugin 이 가시성·역할 정책 구현.
 *
 * 도메인 발산 폭:
 * - rootric: trivial (auth.uid 기반 2단계)
 * - plott:   5단계 (private/pharmacy/group_internal/group_public/public) + scope_id (pharmacy_id, circle_id) + 역할매트릭스
 * - enroute: trivial (사실상 본인만)
 */
export interface WikiAccessControl {
  canRead(actor: ActorContext, target: TargetRef): boolean | Promise<boolean>;
  canWrite(actor: ActorContext, target: TargetRef): boolean | Promise<boolean>;
  scopes(target: TargetRef): ScopeRef[] | Promise<ScopeRef[]>;
}

export interface ActorContext {
  user_id: string;
  // plugin 이 Module Augmentation 으로 확장:
  //   declare module '@wiki-core/core' {
  //     interface ActorContext { pharmacy_id?: string; circle_id?: string; role?: string }
  //   }
}

export interface TargetRef {
  kind: 'object' | 'attribute' | 'relation' | 'event';
  id: ID;
}

/**
 * §5 #1 답 — ScopeRef schema.
 * 코어는 ScopeRef 의미 모름 — plugin 이 정의.
 * kind = scope 종류 (e.g. "pharmacy" / "circle" / "user_only").
 * id  = 그 scope 의 식별자 (e.g. pharmacy_id UUID).
 * meta = plugin 자유 (역할 매트릭스 등 부가 정보).
 */
export interface ScopeRef {
  kind: string;
  id: string;
  meta?: JSONValue;
}
```

**§5 #1 답 박제** (Phase 3 미해결 질문):

> ScopeRef = `{ kind: string; id: string; meta?: JSONValue }`. plugin 이 kind 카탈로그 자유 정의.
>
> 예시:
> - rootric: `[]` (scope 없음 — auth.uid 단일)
> - plott: `[{kind: 'pharmacy', id: 'xxx'}, {kind: 'circle', id: 'yyy', meta: {role: 'admin'}}]`
> - enroute: `[]`

### 4.2 StorageRouter

```ts
// @wiki-core/core/src/storage-router.ts (인터페이스. 구현은 @wiki-core/storage)

/**
 * 한 도메인이 N 개 storage adapter 운영 가능.
 *
 * 도메인 발산:
 * - rootric: 1 adapter (Postgres+RLS)
 * - plott:   1 adapter (Postgres+RLS+pgvector) + drug_master sync
 * - enroute: 3 adapter (Postgres + Sheets + SQLite)
 */
export interface StorageRouter {
  adapters: Record<string, StorageAdapter>;
  resolve(target: TargetRef): StorageAdapter | Promise<StorageAdapter>;
}

export interface StorageAdapter {
  kind: string;                            // "postgres" / "sheets" / "sqlite"
  read<T>(target: TargetRef): Promise<T | null>;
  write<T>(target: TargetRef, payload: T): Promise<void>;
  query<T>(filter: QueryFilter): Promise<T[]>;
}

export interface QueryFilter {
  target_kind: 'object' | 'attribute' | 'relation' | 'event';
  conditions?: Record<string, JSONValue>;
  limit?: number;
  cursor?: string;
}
```

**§5 #2 답 박제** (Phase 3 미해결 질문):

> `StorageRouter.resolve()` 정책은 **plugin 자유 결정** — 코어는 *resolve 가능한 인터페이스* 만 보장.
>
> 권장 패턴:
> 1. `target_kind` 기준 1차 분기 (e.g. `object` → Postgres, `event` → Sheets)
> 2. plugin 이 자기 도메인 truth-source 매핑 직접 정의
>
> 예시:
> - rootric: `() => adapters.postgres`
> - plott: `target => target.kind === 'object' && drugLinkedTypes.has(...) ? adapters.drug_master_view : adapters.postgres`
> - enroute: `target => target.kind === 'event' && tradeTypes.has(...) ? adapters.sheets : (sensitiveLayer(target) ? adapters.sqlite_local : adapters.postgres)`

---

## 5. Plugin Manifest

Plugin 이 코어에 자기 책임 등록.

```ts
// @wiki-core/core/src/plugin.ts

export interface WikiPlugin {
  /** 패키지 식별 ("@rootric/plugin" / "@plott/plugin" / "@enroute/plugin") */
  name: string;
  version: string;                         // semver

  /** 도메인 type 카탈로그 */
  objectTypes: string[];
  attributeKeys: string[];
  relationTypes: string[];
  eventTypes: string[];

  /** 라벨 set */
  labelSets: Array<{ id: string; labels: string[] }>;

  /** 7 hook 구현 — 모두 optional, plugin 이 필요한 것만 */
  hooks: Partial<CoreHooks> & {
    accessControl?: WikiAccessControl;
    storageRouter?: StorageRouter;
  };
}

/**
 * 코어 부트스트랩 시 plugin 등록.
 * 한 instance 당 1 plugin 만 — 도메인 격리 (행동 원칙 #1).
 */
export function registerPlugin(plugin: WikiPlugin): WikiCore;

export interface WikiCore {
  // 4요소 CRUD API (storage router 거침)
  createObject(payload: Omit<WikiObject, 'id' | 'created_at'>, actor: ActorContext): Promise<WikiObject>;
  getObject(id: ID, actor: ActorContext): Promise<WikiObject | null>;
  // ... attribute / relation / event 동일 패턴
}
```

---

## 6. 미해결 질문 답 (§5 박제)

| # | 질문 | 답 위치 | 답 |
|---|---|---|---|
| 1 | `WikiAccessControl.scopes()` ScopeRef schema | §4.1 | `{kind: string; id: string; meta?: JSONValue}`, kind/meta plugin 자유 |
| 2 | `StorageRouter.resolve()` 정책 | §4.2 | plugin 자유. target_kind 기준 1차 분기 권장 |
| 3 | router ingest text hook 시그니처 | `packages/router/SPEC.md` (다음 작업) | 코어는 `noiseFilter(text) → boolean` 만 보장. router 가 추가 시그니처 정의 |
| 4 | noiseFilter 코어 vs plugin (YAGNI) | §3.1 | C안 (코어 hook + 헬퍼 4종) — Mercury 2차 확정 |
| 5 | renderer 4 컴포넌트 입력 표준화 | `packages/renderer/SPEC.md` (다음 작업) | 4요소 인터페이스에 직접 의존 (이 SPEC §1) |

→ §3·#4 SPEC 작성 시 이 SPEC 의존. 코어 인터페이스 변경 없이 진행 가능.

---

## 7. 의도적 누락·재확인

이 SPEC 이 *제공하지 않는* 것 (§0.2 재강조 + 신규):

| 영역 | 이유 |
|---|---|
| `WikiPlugin.commands` / `WikiPlugin.queries` 등 RPC 정의 | API surface 결정은 router/renderer 의 책임. 코어는 데이터 layer 만. |
| 트랜잭션 / 동시성 모델 | storage adapter (`@wiki-core/storage`) 책임 |
| 캐시 layer | renderer 또는 plugin 자체 |
| 인덱스·검색 | storage / router 책임 |
| Migration 도구 | 부록 A.4 — plugin 책임 (각 도메인 owner) |

---

## 8. 변경 정책 (semver)

- **major**: 4요소 인터페이스 / Hook 시그니처 / Plugin Manifest 형식 breaking change
- **minor**: 신규 hook 추가 / 헬퍼 카탈로그 확장 (기존 유지)
- **patch**: 문서·헬퍼 내부 구현 / 타입 narrowing

도메인 owner 작업 부담 = breaking change → major 결정은 머큐리가 도메인 검증 받은 후 (행동 원칙 #4). deprecation cycle 최소 1 minor 이상.

---

## 9. 다음 작업 (Phase 3 잔여)

| # | 작업 | 의존 | 작업량 |
|---|---|---|---|
| 1 | `packages/storage/SPEC.md` | 이 SPEC §4.2 | 2-3h |
| 2 | `packages/router/SPEC.md` | 이 SPEC §3 (`noiseFilter`) + §4.1 (actor) | 2-3h |
| 3 | `packages/renderer/SPEC.md` | 이 SPEC §1 (4요소) + `WikiProvenance` | 2-3h |
| 4 | pnpm workspaces 모노레포 셋업 | 위 4 SPEC 완료 후 | 1-2h |
| 5 | Phase 4 plugin 합류 가이드 (boilerplate) | Phase 3 모두 완료 후 | 2-3h |

→ 이 SPEC 박제 후 도메인 owner 검토 1차. 통과하면 storage/router/renderer 진입.

---

## 부록 — Plugin 작성 시 코어 인터페이스 사용 예 (rootric 가설)

```ts
// @rootric/plugin/src/index.ts
import {
  registerPlugin, WikiPlugin, ActorContext, TargetRef, ScopeRef,
  combine, stripHtml, isTooShort, matchesCssNoise,
} from '@wiki-core/core';

const dartHtmlNoise = (text: string) => /class="[^"]*ad[^"]*"/.test(text);

export const rootricPlugin: WikiPlugin = {
  name: '@rootric/plugin',
  version: '0.1.0',
  objectTypes: ['stock', 'sector', 'business_unit', 'product', 'customer', 'competitor', 'policy', 'macro_event', 'person', 'article'],
  attributeKeys: ['market_cap', 'per', 'pbr', 'roe', /* ... */],
  relationTypes: ['belongs_to', 'produces', 'supplies_to', 'competes_with', 'affected_by', 'mentioned_in'],
  eventTypes: ['mass_production_start', 'capex_announced', 'm_a', 'policy_enacted', 'earnings_release', 'target_price_change'],
  labelSets: [
    { id: 'rootric_validation', labels: ['FACT', 'ASSUMPTION', 'MIXED', 'PLAIN'] },
  ],
  hooks: {
    validateObjectType: (type, payload) => {
      if (type === 'stock' && !/^\d{6}$/.test(payload.identifier ?? '')) {
        throw new Error('ticker must be 6 digits');
      }
    },
    noiseFilter: (text) => {
      const dropPred = combine([
        (t) => isTooShort(t, 20),
        matchesCssNoise,
        dartHtmlNoise,         // rootric 도메인 룰
      ]);
      return dropPred(stripHtml(text));   // stripHtml = 코어 헬퍼 (transform → predicates)
    },
    accessControl: {
      canRead: (actor, target) => true,                    // rootric trivial
      canWrite: (actor, target) => target.kind !== 'object' || actor.user_id != null,
      scopes: () => [],                                     // scope 없음
    },
    storageRouter: {
      adapters: { postgres: postgresAdapter },
      resolve: () => postgresAdapter,
    },
  },
};

registerPlugin(rootricPlugin);
```

→ 이 패턴으로 plott · enroute 도 동일 골격. plugin 빌드 시 코어 어휘만 사용 (도메인 어휘 = 자기 plugin 내부).
