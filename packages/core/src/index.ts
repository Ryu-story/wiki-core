/**
 * @wiki-core/core — public surface.
 *
 * SPEC: packages/core/SPEC.md
 */

// 4요소 + 보조 슬롯 + 기본 타입
export type {
  ID,
  ISOTimestamp,
  JSONValue,
  CreatedOrigin,
  Directionality,
  TargetKind,
  WikiObject,
  WikiAttribute,
  WikiRelation,
  WikiEvent,
  WikiProvenance,
  WikiLabel,
} from './types.js';

// Access control
export type {
  ActorContext,
  TargetRef,
  ScopeRef,
  WikiAccessControl,
} from './access.js';

// Hooks
export type { CoreHooks } from './hooks.js';

// Storage router 인터페이스 (구현은 @wiki-core/storage)
export type {
  QueryFilter,
  AdapterCapabilities,
  StorageAdapter,
  StorageRouter,
} from './storage-router.js';

// Plugin Manifest + WikiCore
export type { LabelSet, WikiPlugin } from './plugin.js';
export { validatePlugin, registerPlugin } from './plugin.js';
export type { WikiCore } from './wiki-core.js';
export { createWikiCore } from './wiki-core.js';
