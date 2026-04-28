/**
 * Router 본체 — Tier selector chain + budget tracking.
 *
 * 코어 책임:
 *   1. tier 순회 → 첫 selector pass → cost_estimator 호출 → budget 누적 → RouterDecision 반환
 *   2. tier id 유니크 검증
 *   3. 모든 tier fail 시 NoTierMatch throw
 *
 * Plugin 책임:
 *   - tier 정의 (T0~Tn) + selector 로직 + ModelHandle 주입
 *   - budget_hook 안에서 limit 정책 (throw / fallback / Tier 강제)
 *
 * SPEC: packages/router/SPEC.md §1
 */

import type {
  Router,
  RouterDecision,
  RouterInput,
  RouterOptions,
  RouterTier,
  BudgetSnapshot,
} from './types.js';
import { NoTierMatch } from './types.js';
import { BudgetTracker } from './budget.js';

export function createRouter(opts: RouterOptions): Router {
  if (!Array.isArray(opts.tiers) || opts.tiers.length === 0) {
    throw new TypeError('createRouter: opts.tiers must be a non-empty array');
  }

  const seenIds = new Set<string>();
  for (const tier of opts.tiers) {
    if (typeof tier.id !== 'string' || tier.id.length === 0) {
      throw new TypeError('RouterTier.id must be a non-empty string');
    }
    if (seenIds.has(tier.id)) {
      throw new TypeError(`RouterTier.id duplicated: ${tier.id}`);
    }
    seenIds.add(tier.id);
  }

  const tiers: RouterTier[] = [...opts.tiers];
  const budget = new BudgetTracker(opts.reset_at);

  async function route(input: RouterInput): Promise<RouterDecision> {
    for (const tier of tiers) {
      const passed = await tier.selector(input);
      if (!passed) continue;

      const estimated = tier.cost_estimator?.(input) ?? 0;
      if (estimated > 0) {
        budget.add(tier.id, estimated);
        opts.budget_hook?.(budget.snapshot(), {
          tier: tier.id,
          cost: estimated,
        });
      }

      return estimated > 0 ? { tier, estimated_cost: estimated } : { tier };
    }

    throw new NoTierMatch(input);
  }

  function getBudget(): BudgetSnapshot {
    return budget.snapshot();
  }

  function resetBudget(newWindowStart?: string): void {
    budget.reset(newWindowStart);
  }

  return {
    tiers,
    route,
    getBudget,
    resetBudget,
  };
}
