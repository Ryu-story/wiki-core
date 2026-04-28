/**
 * Budget tracker — Tier 별 누적 비용 + window snapshot.
 *
 * 책임 분리 (SPEC §2):
 *   - 코어 (이 클래스): 추적·snapshot 제공
 *   - Plugin (`budget_hook`): limit 정책 (throw / fallback / Tier 강제)
 *
 * SPEC: packages/router/SPEC.md §2
 */

import type { BudgetSnapshot } from './types.js';

export class BudgetTracker {
  private total = 0;
  private byTier: Record<string, number> = {};
  private windowStart: string;

  constructor(windowStart?: string) {
    this.windowStart = windowStart ?? new Date().toISOString();
  }

  /**
   * Tier 별 비용 추가. 0 이하 / NaN / Infinity 는 무시 (defensive).
   */
  add(tierId: string, cost: number): void {
    if (!Number.isFinite(cost) || cost <= 0) return;
    this.total += cost;
    this.byTier[tierId] = (this.byTier[tierId] ?? 0) + cost;
  }

  snapshot(): BudgetSnapshot {
    return {
      total_usd: this.total,
      by_tier: { ...this.byTier },
      window_start: this.windowStart,
    };
  }

  /**
   * window reset. plugin 이 일/월/분기 등 자유 cycle 로 호출.
   * `newWindowStart` 미지정 시 현재 시각 (ISO8601).
   */
  reset(newWindowStart?: string): void {
    this.total = 0;
    this.byTier = {};
    this.windowStart = newWindowStart ?? new Date().toISOString();
  }
}
