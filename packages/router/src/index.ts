/**
 * @wiki-core/router — public surface.
 *
 * Tier 가변 LLM 라우터 + ModelHandle 추상 + 비용 추적.
 * Plugin 이 tier·model·budget 정의, 코어는 selector chain 만 (행동 원칙 #1 정합).
 *
 * SPEC: packages/router/SPEC.md
 */

// Router types
export type {
  Router,
  RouterTier,
  RouterInput,
  RouterDecision,
  RouterOptions,
  BudgetSnapshot,
} from './types.js';

// Model abstraction
export type {
  ModelHandle,
  ModelOptions,
  ModelResponse,
  ModelChunk,
  ModelCapabilities,
} from './types.js';

// Errors
export { NoTierMatch } from './types.js';

// Factory
export { createRouter } from './router.js';

// Budget tracker (plugin 자체 활용 가능)
export { BudgetTracker } from './budget.js';
