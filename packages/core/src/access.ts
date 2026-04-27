/**
 * Access control hook + scope reference.
 *
 * 코어는 `ScopeRef` 의미 모름 — plugin이 정의:
 * - rootric: trivial (auth.uid 단일 → scopes() = [])
 * - plott:   5단계 가시성 + scope_id (pharmacy_id, circle_id) + 역할매트릭스
 * - enroute: trivial (사실상 본인만 → scopes() = [])
 *
 * SPEC: packages/core/SPEC.md §4.1
 */

import type { ID, JSONValue, TargetKind } from './types.js';

/**
 * Plugin 이 Module Augmentation 으로 확장:
 *
 * ```ts
 * declare module '@wiki-core/core' {
 *   interface ActorContext {
 *     pharmacy_id?: string;
 *     circle_id?: string;
 *     role?: string;
 *   }
 * }
 * ```
 */
export interface ActorContext {
  user_id: string;
}

export interface TargetRef {
  kind: TargetKind;
  id: ID;
}

/**
 * `kind` = scope 종류 (e.g. "pharmacy" / "circle" / "user_only"). plugin 자유 정의.
 * `id`   = 그 scope 의 식별자 (e.g. pharmacy_id UUID).
 * `meta` = plugin 자유 (역할 매트릭스 등 부가 정보).
 */
export interface ScopeRef {
  kind: string;
  id: string;
  meta?: JSONValue;
}

export interface WikiAccessControl {
  canRead(actor: ActorContext, target: TargetRef): boolean | Promise<boolean>;
  canWrite(actor: ActorContext, target: TargetRef): boolean | Promise<boolean>;
  scopes(target: TargetRef): ScopeRef[] | Promise<ScopeRef[]>;
}
