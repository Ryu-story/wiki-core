/**
 * @wiki-core/router — type definitions.
 *
 * Tier 가변 LLM 라우터 + ModelHandle 추상 + 비용 추적.
 * 코어는 selector chain 만 — Tier 수·의미·모델 카탈로그·정확도 임계값·비용 limit
 * 모두 plugin 책임 (행동 원칙 #1 정합).
 *
 * SPEC: packages/router/SPEC.md §1, §2
 */

import type { ISOTimestamp, JSONValue } from '@wiki-core/core';

// ─── Router input/output ─────────────────────────────────

/**
 * Router 호출 입력.
 *
 * Plugin 의 ingest 파이프라인 흐름 (SPEC §1.1):
 *   1. `noiseFilter(text)` (코어 hook) — Tier 0 룰필터
 *   2. plugin 의 민감도 분류기 — `sensitivity` 채움 (enroute 만 1급)
 *   3. `router.route(input)` — Tier selector chain 실행
 *   4. plugin 이 ModelHandle 호출
 */
export interface RouterInput {
  /** 처리 대상 텍스트 */
  text: string;

  /** 출처 컨텍스트 — selector 가 source_kind 별 분기 가능 */
  context?: {
    source_kind?: string;
    user_id?: string;
    target?: { kind: string; id: string };
  };

  /**
   * 민감도 힌트 — plugin 이 미리 분류 후 채움.
   * 코어 router 는 의미 모름 — plugin selector 가 해석.
   * (예: enroute 'A' | 'B' | 'C', C 는 Tier 4_local_forced 강제)
   */
  sensitivity?: string;

  /**
   * Plugin 자유 hint — tier 강제 / 비용 우선순위 / 사용자 의도 / `is_noise: boolean` 등.
   * 코어 semver 영향 없음 (plugin extension 영역).
   */
  hints?: Record<string, JSONValue>;
}

export interface RouterDecision {
  tier: RouterTier;
  estimated_cost?: number;
}

// ─── Tier ────────────────────────────────────────────────

export interface RouterTier {
  /** plugin 정의 ("T0" / "T1" / "T2" / "T3" / "T4_local_forced") */
  id: string;

  /**
   * 이 Tier 에 갈지 결정. 첫 true 가 채택.
   * fail (false) 시 다음 tier 로 진행.
   */
  selector: (input: RouterInput) => boolean | Promise<boolean>;

  /**
   * 이 Tier 의 모델. Tier 0 (룰필터·drop) 은 model = null.
   * Plugin 이 ModelHandle 주입 (코어는 카탈로그 모름).
   */
  model: ModelHandle | null;

  /** 입력당 예상 비용 (USD). budget tracker 누적용. */
  cost_estimator?: (input: RouterInput) => number;

  /** plugin 자유 메타 (정확도 임계값 / fallback 정책 / cloud_forbidden 등) */
  meta?: Record<string, JSONValue>;
}

// ─── Router (factory return) ─────────────────────────────

export interface Router {
  readonly tiers: RouterTier[];

  /**
   * 첫 selector 통과한 Tier 반환. 모든 tier fail 시 throw `NoTierMatch`.
   * Plugin 이 fallback 원하면 마지막 tier 의 selector 를 `() => true` 로 둠.
   */
  route(input: RouterInput): Promise<RouterDecision>;

  /** 누적 비용 snapshot. */
  getBudget(): BudgetSnapshot;

  /**
   * Budget window reset — Mercury 9차 추가 (로고스 보완 의견 부분 채택, semver minor additive).
   *
   * Plugin 이 매월/일 cron 으로 호출 (월별 reset 패턴). 호출 시 누적 비용 = 0,
   * `window_start` = `newWindowStart ?? new Date().toISOString()`.
   *
   * Trap 차단: plugin singleton 캐시 시 budget 영원 누적. 이 메서드로 명시적 reset.
   */
  resetBudget(newWindowStart?: string): void;
}

export interface RouterOptions {
  tiers: RouterTier[];

  /**
   * 비용 누적 callback. plugin 이 limit 정책 결정 (throw / fallback / Tier 강제 등).
   * 예: rootric "월 $10 초과 시 throw", plott "$0.5 초과 시 console.warn"
   */
  budget_hook?: (
    snapshot: BudgetSnapshot,
    latest: { tier: string; cost: number }
  ) => void;

  /** budget window 시작점. plugin 이 자유 reset (BudgetTracker.reset 호출). */
  reset_at?: ISOTimestamp;
}

// ─── ModelHandle ─────────────────────────────────────────

/**
 * 모델 호출 추상. Anthropic / OpenAI / Ollama / Gemini SDK 어댑터.
 * Plugin 이 자기 도메인에 맞는 ModelHandle 빌드 (코어는 SDK 모름).
 */
export interface ModelHandle {
  /** "anthropic:claude-sonnet" / "ollama:gemma3:12b" / "google:gemini-flash-lite" 등 */
  readonly id: string;

  invoke(prompt: string, options?: ModelOptions): Promise<ModelResponse>;
  stream?(prompt: string, options?: ModelOptions): AsyncIterable<ModelChunk>;
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
  /** 토큰 (예: 200_000) */
  context_window: number;
  multimodal: boolean;
  tool_use: boolean;
  /** ★ enroute Tier 4_local_forced selector 가 사용 (cloud_forbidden 정합) */
  local: boolean;
}

// ─── Budget ──────────────────────────────────────────────

export interface BudgetSnapshot {
  total_usd: number;
  by_tier: Record<string, number>;
  window_start: ISOTimestamp;
}

// ─── Error ───────────────────────────────────────────────

/**
 * 모든 tier selector 가 fail 시 throw.
 * Plugin 이 fallback 원하면 마지막 tier 의 selector 를 `() => true` 로 두면 됨.
 */
export class NoTierMatch extends Error {
  constructor(input: RouterInput) {
    super(
      `Router: no tier matched. text length=${input.text.length}, ` +
        `sensitivity=${input.sensitivity ?? 'none'}, ` +
        `source_kind=${input.context?.source_kind ?? 'none'}`
    );
    this.name = 'NoTierMatch';
  }
}
