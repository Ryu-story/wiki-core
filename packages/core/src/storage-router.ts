/**
 * Storage adapter / router 인터페이스. 구현은 `@wiki-core/storage` 또는 plugin.
 *
 * Multi-storage 1급 시민 — 한 도메인이 N개 어댑터 운영 가능.
 *
 * SPEC: packages/core/SPEC.md §4.2, packages/storage/SPEC.md §1
 */

import type {
  ID,
  JSONValue,
  TargetKind,
  WikiObject,
  WikiAttribute,
  WikiRelation,
  WikiEvent,
  WikiProvenance,
  WikiLabel,
} from './types.js';
import type { TargetRef } from './access.js';

export interface QueryFilter {
  target_kind: TargetKind;
  conditions?: Record<string, JSONValue>;
  limit?: number;
  cursor?: string;
}

export interface AdapterCapabilities {
  transactional: boolean;
  rls: boolean;
  fullTextSearch: boolean;
  vector: boolean;
  ttl: boolean;
}

export interface StorageAdapter {
  /** "postgres" / "sheets" / "sqlite" / plugin 자유 */
  readonly kind: string;

  // 4요소 CRUD
  createObject(payload: Omit<WikiObject, 'id' | 'created_at'>): Promise<WikiObject>;
  getObject(id: ID): Promise<WikiObject | null>;
  updateObject(id: ID, patch: Partial<WikiObject>): Promise<WikiObject>;
  deleteObject(id: ID): Promise<void>;

  createAttribute(payload: Omit<WikiAttribute, 'id' | 'recorded_at'>): Promise<WikiAttribute>;
  getAttribute(id: ID): Promise<WikiAttribute | null>;

  createRelation(payload: Omit<WikiRelation, 'id' | 'created_at'>): Promise<WikiRelation>;
  getRelation(id: ID): Promise<WikiRelation | null>;
  deleteRelation(id: ID): Promise<void>;

  createEvent(payload: Omit<WikiEvent, 'id' | 'recorded_at'>): Promise<WikiEvent>;
  getEvent(id: ID): Promise<WikiEvent | null>;

  // 보조 슬롯 CRUD
  createProvenance(payload: Omit<WikiProvenance, 'id'>): Promise<WikiProvenance>;
  listProvenance(target: TargetRef): Promise<WikiProvenance[]>;

  createLabel(payload: Omit<WikiLabel, 'id'>): Promise<WikiLabel>;
  getLabel(id: ID): Promise<WikiLabel | null>;
  listLabels(target: TargetRef): Promise<WikiLabel[]>;
  deleteLabel(id: ID): Promise<void>;

  // Query
  query<T>(filter: QueryFilter): Promise<T[]>;

  // Capability + optional transaction
  capabilities(): AdapterCapabilities;
  transaction?<T>(fn: (tx: StorageAdapter) => Promise<T>): Promise<T>;
}

export interface StorageRouter {
  adapters: Record<string, StorageAdapter>;
  resolve(target: TargetRef): StorageAdapter | Promise<StorageAdapter>;
}
