# @wiki-core/router — SPEC

> wiki-core router 패키지. Tier 가변 라우터 + ingest hook 시그니처 + 비용 추적. Tier 수와 의미는 plugin 정의.
>
> **작성자**: 머큐리 (wiki-core 코어 아키텍트)
> **작성일**: 2026-04-28
> **세션**: Mercury 3차 (Phase 3 — storage/router/renderer SPEC 묶음 작성)
> **선행**: `packages/core/SPEC.md` §3 (`noiseFilter`), §4 (Hook 인터페이스), `docs/comparison_matrix.md` §7
>
> **status**: 1차 SPEC. §5 #3 (ingest hook 시그니처) 답 박제.

---

## 0. 목적·scope

`@wiki-core/router` 는 LLM 호출 *Tier 추상화* 만 책임. Tier 수, model handle, 정확도 정책, 비용 임계값은 plugin.

### 0.1 코어가 제공하는 것

- `Router` 인터페이스 + `RouterTier` 타입
- `route(input)` 알고리즘 — 첫 selector 통과한 Tier 반환
- 비용 추적 hook (`cost_estimator`, `budget_hook`)
- ModelHandle 추상 — Anthropic / OpenAI / Ollama / Gemini SDK 어댑터 인터페이스
- Tier 0 룰필터 통합 (`noiseFilter` 코어 hook 호출)

### 0.2 코어가 *제공하지 않는* 것

| 영역 | 이유 | plugin 책임 |
|---|---|---|
| Tier 수 / 의미 | 도메인 발산 (rootric 4 / plott 4 / enroute 5) | plugin 등록 |
| 모델 카탈로그 (Sonnet / Gemma 등) | 도메인마다 모델 선택 다름 | plugin 가 ModelHandle 주입 |
| 정확도 임계값 | rootric FP 5% / plott WARNING FN 0% / enroute 누출 0건 | plugin selector 로직 |
| 민감도 분류 (A/B/C) | enroute 만 1급 | `@enroute/plugin` privacy-filter |
| 비용 limit 정책 | $0.5 / $5-10 / $10 발산 | plugin 의 budget_hook |

### 0.3 의존성

- `@wiki-core/core` — `noiseFilter` hook + Plugin Manifest
- 모델 SDK는 plugin 책임 (코어는 ModelHandle 인터페이스만)

---

## 1. Router 인터페이스

```ts
// @wiki-core/router/src/router.ts

import type { JSONValue } from '@wiki-core/core';

export interface Router {
  readonly tiers: RouterTier[];

  /**
   * 첫 selector 통과한 Tier 를 반환.
   * 모든 tier 가 fail → throw NoTierMatch
   */
  route(input: RouterInput): Promise<RouterDecision>;

  /** 누적 비용 조회 */
  getBudget(): BudgetSnapshot;

  /**
   * Budget window reset (Mercury 9차 추가, semver minor additive).
   * Plugin 이 매월/일 cron 호출 — 월별 reset 패턴.
   * Trap 차단: plugin singleton 캐시 시 budget 영원 누적.
   */
  resetBudget(newWindowStart?: string): void;
}

export interface RouterTier {
  /** plugin 정의 ("T0" / "T1" / "T2" / "T3" / "T4_local_forced") */
  id: string;

  /** 이 Tier 에 갈지 결정. 첫 true 가 채택. */
  selector: (input: RouterInput) => boolean | Promise<boolean>;

  /** 이 Tier 의 모델. Tier 0 (룰필터) 은 model = null */
  model: ModelHandle | null;

  /** 입력당 예상 비용 (USD). budget_hook 누적용. */
  cost_estimator?: (input: RouterInput) => number;

  /** plugin 자유 메타 (정확도 임계값 / fallback 정책 등) */
  meta?: Record<string, JSONValue>;
}
```

### 1.1 RouterInput (★ §5 #3 답 — ingest hook 시그니처)

```ts
export interface RouterInput {
  /** 처리 대상 텍스트 */
  text: string;

  /** 출처 컨텍스트 — selector 가 source_kind 별 분기 가능 */
  context?: {
    source_kind?: string;            // "dart" / "sheet" / "activitywatch" / "user_memo"
    user_id?: string;
    target?: { kind: string; id: string };  // 4요소 target 참조
  };

  /**
   * 민감도 힌트 — **plugin 이 미리 분류** 후 채움.
   * 코어 router 는 sensitivity 의미 모름 — plugin selector 가 해석.
   * enroute Tier 4 (로컬강제) 는 sensitivity === 'C' 일 때 selector 통과.
   */
  sensitivity?: string;              // plugin 자유 enum (예: 'A' | 'B' | 'C')

  /** plugin 자유 hint (tier 강제 / 비용 우선순위 / 사용자 의도 등) */
  hints?: Record<string, JSONValue>;
}

export interface RouterDecision {
  tier: RouterTier;
  estimated_cost?: number;
}
```

**§5 #3 답 박제**:

> Router 자체는 *민감도 정책 모름*. plugin 의 ingest 파이프라인이 다음 순서로 호출:
> 1. `noiseFilter(text)` — 코어 hook (Tier 0 룰필터 통과 여부)
> 2. plugin 의 민감도 분류기 (enroute 만 1급) — `RouterInput.sensitivity` 채움
> 3. `router.route(input)` — Tier selector 실행 → ModelHandle 반환
> 4. plugin 이 ModelHandle 호출
>
> Router 가 직접 `noiseFilter` 호출하지 않음 — plugin 의 IngestAdapter 가 순서 제어. Tier 0 selector 가 noiseFilter 결과를 hint 로 받을 수 있음 (`hints.is_noise: boolean`).

### 1.2 ModelHandle

```ts
export interface ModelHandle {
  /** "anthropic:claude-sonnet" / "ollama:gemma3:12b" / "google:gemini-flash-lite" 등 */
  readonly id: string;

  /** 단일 호출 (스트림 X) */
  invoke(prompt: string, options?: ModelOptions): Promise<ModelResponse>;

  /** 스트림 호출 (선택) */
  stream?(prompt: string, options?: ModelOptions): AsyncIterable<ModelChunk>;

  /** 모델 capability — plugin selector 가 사용 */
  capabilities(): ModelCapabilities;
}

export interface ModelOptions {
  max_tokens?: number;
  temperature?: number;
  system?: string;
  tools?: JSONValue[];
}

export interface ModelResponse {
  text: string;
  tokens: { input: number; output: number };
}

export interface ModelChunk {
  delta: string;
}

export interface ModelCapabilities {
  context_window: number;            // 토큰 (예: 200_000)
  multimodal: boolean;
  tool_use: boolean;
  local: boolean;                    // ★ enroute Tier 4 selector 가 사용
}
```

---

## 2. Budget·Cost 추적

```ts
// @wiki-core/router/src/budget.ts

export interface BudgetSnapshot {
  total_usd: number;
  by_tier: Record<string, number>;
  window_start: ISOTimestamp;
}

export interface RouterOptions {
  tiers: RouterTier[];

  /**
   * 비용 누적 callback. plugin 이 limit 정책 결정.
   * 예: rootric "월 $10 초과 시 Tier 3 차단" / plott "$0.5 초과 시 알림"
   */
  budget_hook?: (snapshot: BudgetSnapshot, latest: { tier: string; cost: number }) => void;

  /** budget window — 일/월 등. plugin 자유 reset. */
  reset_at?: ISOTimestamp;
}

export function createRouter(opts: RouterOptions): Router;
```

**책임 분리**:
- 코어 router: 비용 추적·snapshot 제공 + `resetBudget()` 메커니즘
- Plugin: limit 정책 (`budget_hook` 안에서 throw / fallback / Tier 강제 등) + reset cron (월별/일별)

### 2.1 월별 reset 패턴 (Mercury 9차 추가)

```ts
// plugin 측 — 매월 1일 cron
import { router } from './router-instance';   // singleton

// monthly reset (예: vercel cron / node-cron / Postgres pg_cron)
function monthlyResetBudget() {
  router.resetBudget(new Date().toISOString());
}
```

**Trap 차단**: plugin 이 router 를 singleton 캐시 + reset 호출 안 하면 budget 영원 누적 → `budget_hook` limit (예: 월 $10 throw) 가 영원히 trigger 후 모든 tier fail 가능. `resetBudget()` 명시적 호출로 차단.

**대안 (resetBudget 사용 안 함)**: router 자체를 매월 재생성 (createRouter 새로 호출). 단 plugin singleton 패턴과 충돌 가능 — `resetBudget()` 권장.

---

## 3. 도메인 사용 예 (잠정 — Phase 4 plugin 작성 시 확정)

### 3.1 rootric (4 tier, 월 $10 이하)

```ts
const router = createRouter({
  tiers: [
    {
      id: 'T0',
      selector: (input) => input.hints?.is_noise === true || input.text.length < 20,
      model: null,                        // 룰필터 (drop)
    },
    {
      id: 'T1',
      selector: (input) => input.context?.source_kind === 'news' && input.text.length < 500,
      model: geminiFlashLite,
    },
    {
      id: 'T2',
      selector: (input) => input.text.length < 5000,
      model: gemma3LocalOrFlash,
      cost_estimator: () => 0,            // 로컬
    },
    {
      id: 'T3',
      selector: () => true,               // fallback
      model: claudeSonnet,
      cost_estimator: (input) => input.text.length / 1000 * 0.003,
    },
  ],
  budget_hook: (snap) => {
    if (snap.total_usd > 10) throw new Error('monthly budget exceeded');
  },
});
```

### 3.2 plott (4 tier + WARNING 거짓음성 0%)

```ts
const router = createRouter({
  tiers: [
    { id: 'T0', selector: ruleFilter, model: null },
    { id: 'T1', selector: localCapable, model: gemma4Local },
    { id: 'T2', selector: complexQuery, model: geminiFlashLite },
    {
      id: 'T3',
      selector: (input) => input.hints?.label_candidate === 'WARNING',
      model: claudeSonnet,                // WARNING 검증 시에만
      cost_estimator: (input) => input.text.length / 1000 * 0.003,
      meta: { requires_human_confirm: true },
    },
  ],
  budget_hook: (snap) => {
    if (snap.total_usd > 0.5) console.warn('budget alert');
  },
});
```

### 3.3 enroute (5 tier + Tier 4 로컬강제 ★)

```ts
const router = createRouter({
  tiers: [
    { id: 'T0', selector: ruleFilter, model: null },
    {
      id: 'T1',
      selector: (input) => input.sensitivity === 'A' && input.text.length < 500,
      model: geminiFlashLiteOrQwen,
    },
    {
      id: 'T2',
      selector: (input) => input.sensitivity !== 'C' && input.text.length < 5000,
      model: claudeHaiku,
    },
    {
      id: 'T3',
      selector: (input) => input.sensitivity !== 'C',
      model: claudeSonnet,
    },
    {
      // ★ C 레이어 강제 로컬
      id: 'T4_local_forced',
      selector: (input) => input.sensitivity === 'C',
      model: gemma3Local,
      cost_estimator: () => 0,
      meta: { cloud_forbidden: true },
    },
  ],
});

// plugin ingest 파이프라인에서:
const sensitivity = await privacyFilter.classify(text);  // 로컬 분류 (cloud 금지)
const decision = await router.route({ text, sensitivity });
const response = await decision.tier.model!.invoke(text);
```

→ 루터 검증 시 "Tier 0~4 라우팅" 자연 매핑 — 위 §3.3 그대로.

---

## 4. 변경 정책 (semver)

- **major**: `Router` / `RouterTier` / `RouterInput` 인터페이스 breaking change
- **minor**: `RouterInput.hints` 표준 키 추가 (additive) / 신규 capability flag
- **patch**: 내부 알고리즘 / 비용 추적 정확도 개선

`RouterInput.sensitivity` / `hints` 는 plugin 자유 영역 — 코어 semver 영향 없음.

---

## 5. 다음 작업

이 SPEC 박제 후 router 구현은 Phase 3.5 (코드 작성). Phase 4 plugin 작성 가이드에서 *ingest 파이프라인 boilerplate* 확정 (noiseFilter → 민감도 분류 → router → ModelHandle).
