/**
 * @wiki-core/storage — public surface.
 *
 * SPEC: packages/storage/SPEC.md
 */

export type { DbClient, PostgresAdapterOptions } from './postgres.js';
export { PostgresAdapter } from './postgres.js';

export type { CreateStorageRouterOptions } from './router.js';
export { createStorageRouter } from './router.js';

// Storage 인터페이스 자체는 @wiki-core/core 에서 정의 — re-export 편의
export type {
  StorageAdapter,
  StorageRouter,
  AdapterCapabilities,
  QueryFilter,
} from '@wiki-core/core';
