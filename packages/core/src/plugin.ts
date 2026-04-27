/**
 * Plugin Manifest + register/validate.
 *
 * 한 wiki-core instance 에 plugin 1개만 등록 — 도메인 격리 (행동 원칙 #1).
 *
 * SPEC: packages/core/SPEC.md §5
 */

import type { CoreHooks } from './hooks.js';
import type { WikiAccessControl } from './access.js';
import type { StorageRouter } from './storage-router.js';
import { createWikiCore, type WikiCore } from './wiki-core.js';

export interface LabelSet {
  /** plugin 고유 (e.g. "rootric_validation" / "plott_norm" / "enroute_origin") */
  id: string;
  labels: string[];
}

export interface WikiPlugin {
  /** 패키지 식별 ("@rootric/plugin" / "@plott/plugin" / "@enroute/plugin") */
  name: string;
  /** semver */
  version: string;

  // 도메인 type 카탈로그 (string 슬롯 — 코어는 의미 모름)
  objectTypes: string[];
  attributeKeys: string[];
  relationTypes: string[];
  eventTypes: string[];

  labelSets: LabelSet[];

  /** 7 hook 모두 optional — plugin 이 필요한 것만 */
  hooks: Partial<CoreHooks> & {
    accessControl?: WikiAccessControl;
    storageRouter?: StorageRouter;
  };
}

/**
 * Plugin Manifest 검증. 실패 시 throw.
 *
 * 다음을 확인:
 * - name / version 존재 + 비어있지 않음
 * - objectTypes / attributeKeys / relationTypes / eventTypes 가 string[] (빈 배열 허용)
 * - labelSets 의 id 유니크 + labels 가 string[]
 *
 * 도메인 어휘 자체는 검증하지 않음 (코어는 카탈로그 모름).
 */
export function validatePlugin(plugin: WikiPlugin): void {
  if (typeof plugin.name !== 'string' || plugin.name.length === 0) {
    throw new TypeError('plugin.name must be a non-empty string');
  }
  if (typeof plugin.version !== 'string' || plugin.version.length === 0) {
    throw new TypeError('plugin.version must be a non-empty string');
  }

  for (const field of ['objectTypes', 'attributeKeys', 'relationTypes', 'eventTypes'] as const) {
    const arr = plugin[field];
    if (!Array.isArray(arr) || !arr.every((s) => typeof s === 'string')) {
      throw new TypeError(`plugin.${field} must be string[]`);
    }
  }

  if (!Array.isArray(plugin.labelSets)) {
    throw new TypeError('plugin.labelSets must be LabelSet[]');
  }
  const seen = new Set<string>();
  for (const set of plugin.labelSets) {
    if (typeof set.id !== 'string' || set.id.length === 0) {
      throw new TypeError('LabelSet.id must be a non-empty string');
    }
    if (seen.has(set.id)) {
      throw new TypeError(`LabelSet.id duplicated: ${set.id}`);
    }
    seen.add(set.id);
    if (!Array.isArray(set.labels) || !set.labels.every((s) => typeof s === 'string')) {
      throw new TypeError(`LabelSet.labels must be string[] (id=${set.id})`);
    }
  }

  if (typeof plugin.hooks !== 'object' || plugin.hooks === null) {
    throw new TypeError('plugin.hooks must be an object');
  }
}

/**
 * Plugin 등록 + WikiCore 본체 반환 (Mercury 5차).
 *
 * 호출 시:
 * 1. Plugin Manifest 검증
 * 2. storageRouter 필수 확인
 * 3. WikiCore 본체 생성 (4요소 CRUD + hook chain + access control + storage routing)
 *
 * @throws plugin manifest 가 invalid 하거나 storageRouter 누락 시
 */
export function registerPlugin(plugin: WikiPlugin): WikiCore {
  validatePlugin(plugin);
  if (!plugin.hooks.storageRouter) {
    throw new Error(
      'plugin.hooks.storageRouter is required. Provide a StorageRouter implementation.'
    );
  }
  return createWikiCore(plugin);
}
