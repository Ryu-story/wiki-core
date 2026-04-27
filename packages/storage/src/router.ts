/**
 * StorageRouter helper — packages/core/SPEC.md §4.2 의 base impl.
 *
 * 3 도메인 사용 패턴 (storage SPEC §3.1):
 * - rootric: 단일 adapter (`adapter` 옵션)
 * - plott:   target 별 분기 (`resolver` 또는 `byKind`)
 * - enroute: multi-storage (`resolver` — 시트 / sqlite_local / postgres 분리)
 *
 * SPEC: packages/storage/SPEC.md §3
 */

import type {
  StorageAdapter,
  StorageRouter,
  TargetRef,
} from '@wiki-core/core';

export interface CreateStorageRouterOptions {
  /** 단일 어댑터 — 가장 단순 케이스 (rootric / plott 1 storage) */
  adapter?: StorageAdapter;

  /** target_kind 기준 분기 (코어 §4.2 권장 패턴 1) */
  byKind?: Partial<Record<TargetRef['kind'], StorageAdapter>>;

  /** plugin 자유 정책 (가장 일반) — resolver 우선순위 가장 높음 */
  resolver?: (target: TargetRef) => StorageAdapter | Promise<StorageAdapter>;

  /** 추가 어댑터 등록 (router.adapters 에 노출) — resolver 가 참조 가능 */
  adapters?: Record<string, StorageAdapter>;
}

export function createStorageRouter(
  opts: CreateStorageRouterOptions
): StorageRouter {
  const adapters: Record<string, StorageAdapter> = { ...opts.adapters };

  // adapter 옵션도 카탈로그에 노출
  if (opts.adapter) {
    adapters[opts.adapter.kind] ??= opts.adapter;
  }
  if (opts.byKind) {
    for (const adapter of Object.values(opts.byKind)) {
      if (adapter) adapters[adapter.kind] ??= adapter;
    }
  }

  const resolve: StorageRouter['resolve'] = async (target) => {
    if (opts.resolver) return opts.resolver(target);
    if (opts.byKind?.[target.kind]) return opts.byKind[target.kind]!;
    if (opts.adapter) return opts.adapter;
    throw new Error(
      `StorageRouter: no adapter for target.kind=${target.kind}. ` +
        `Provide adapter / byKind[${target.kind}] / resolver in CreateStorageRouterOptions.`
    );
  };

  return { adapters, resolve };
}
