/**
 * WikiCore 본체 — 4요소 CRUD + hook chain + access control + storage routing.
 *
 * Hook 호출 순서 (CRUD 별):
 *   create:  validateObjectType (Object 만) → router.resolve → adapter.create
 *            → checkWrite → onAttributeWrite (Attribute 만) / provenanceExtension (Provenance 만)
 *   read:    checkRead → router.resolve → adapter.get
 *   update:  checkWrite → validateObjectType (type 변경 시) → router.resolve → adapter.update
 *   delete:  checkWrite → router.resolve → adapter.delete
 *
 * SPEC: packages/core/SPEC.md §5
 */

import type {
  ID,
  WikiObject,
  WikiAttribute,
  WikiRelation,
  WikiEvent,
  WikiProvenance,
  WikiLabel,
} from './types.js';
import type {
  ActorContext,
  TargetRef,
  ScopeRef,
} from './access.js';
import type { WikiPlugin } from './plugin.js';

export interface WikiCore {
  // Object CRUD
  createObject(
    payload: Omit<WikiObject, 'id' | 'created_at'>,
    actor: ActorContext
  ): Promise<WikiObject>;
  getObject(id: ID, actor: ActorContext): Promise<WikiObject | null>;
  updateObject(
    id: ID,
    patch: Partial<WikiObject>,
    actor: ActorContext
  ): Promise<WikiObject>;
  deleteObject(id: ID, actor: ActorContext): Promise<void>;

  // Attribute CRUD
  createAttribute(
    payload: Omit<WikiAttribute, 'id' | 'recorded_at'>,
    actor: ActorContext
  ): Promise<WikiAttribute>;
  getAttribute(id: ID, actor: ActorContext): Promise<WikiAttribute | null>;

  // Relation CRUD
  createRelation(
    payload: Omit<WikiRelation, 'id' | 'created_at'>,
    actor: ActorContext
  ): Promise<WikiRelation>;
  getRelation(id: ID, actor: ActorContext): Promise<WikiRelation | null>;
  deleteRelation(id: ID, actor: ActorContext): Promise<void>;

  // Event CRUD
  createEvent(
    payload: Omit<WikiEvent, 'id' | 'recorded_at'>,
    actor: ActorContext
  ): Promise<WikiEvent>;
  getEvent(id: ID, actor: ActorContext): Promise<WikiEvent | null>;

  // Provenance CRUD
  createProvenance(
    payload: Omit<WikiProvenance, 'id'>,
    actor: ActorContext
  ): Promise<WikiProvenance>;
  listProvenance(
    target: TargetRef,
    actor: ActorContext
  ): Promise<WikiProvenance[]>;

  // Label CRUD
  createLabel(
    payload: Omit<WikiLabel, 'id'>,
    actor: ActorContext
  ): Promise<WikiLabel>;
  listLabels(target: TargetRef, actor: ActorContext): Promise<WikiLabel[]>;

  // Access control 노출
  scopes(target: TargetRef, actor: ActorContext): Promise<ScopeRef[]>;
}

/**
 * `target.id === '_new'` convention — create 시점.
 * Plugin resolver 가 이 magic 을 인지하지 못하면 byKind / adapter fallback.
 */
const NEW_ID: ID = '_new';

export function createWikiCore(plugin: WikiPlugin): WikiCore {
  const router = plugin.hooks.storageRouter;
  if (!router) {
    throw new Error('plugin.hooks.storageRouter is required');
  }
  const access = plugin.hooks.accessControl;
  const { validateObjectType, onAttributeWrite, provenanceExtension } =
    plugin.hooks;

  async function checkRead(
    actor: ActorContext,
    target: TargetRef
  ): Promise<void> {
    if (!access) return;
    const ok = await access.canRead(actor, target);
    if (!ok) {
      throw new Error(`access denied: read ${target.kind}/${target.id}`);
    }
  }

  async function checkWrite(
    actor: ActorContext,
    target: TargetRef
  ): Promise<void> {
    if (!access) return;
    const ok = await access.canWrite(actor, target);
    if (!ok) {
      throw new Error(`access denied: write ${target.kind}/${target.id}`);
    }
  }

  return {
    // ─── Object ─────────────────────────────────────────

    async createObject(payload, actor) {
      if (validateObjectType) {
        await validateObjectType(payload.type, payload);
      }
      await checkWrite(actor, { kind: 'object', id: NEW_ID });
      const adapter = await router.resolve({ kind: 'object', id: NEW_ID });
      return adapter.createObject(payload);
    },

    async getObject(id, actor) {
      await checkRead(actor, { kind: 'object', id });
      const adapter = await router.resolve({ kind: 'object', id });
      return adapter.getObject(id);
    },

    async updateObject(id, patch, actor) {
      await checkWrite(actor, { kind: 'object', id });
      if (patch.type && validateObjectType) {
        await validateObjectType(patch.type, patch);
      }
      const adapter = await router.resolve({ kind: 'object', id });
      return adapter.updateObject(id, patch);
    },

    async deleteObject(id, actor) {
      await checkWrite(actor, { kind: 'object', id });
      const adapter = await router.resolve({ kind: 'object', id });
      await adapter.deleteObject(id);
    },

    // ─── Attribute ──────────────────────────────────────

    async createAttribute(payload, actor) {
      // Attribute 의 access 는 부모 object 기준
      await checkWrite(actor, { kind: 'object', id: payload.object_id });
      const adapter = await router.resolve({ kind: 'attribute', id: NEW_ID });
      const attr = await adapter.createAttribute(payload);
      if (onAttributeWrite) {
        await onAttributeWrite(attr);
      }
      return attr;
    },

    async getAttribute(id, actor) {
      await checkRead(actor, { kind: 'attribute', id });
      const adapter = await router.resolve({ kind: 'attribute', id });
      return adapter.getAttribute(id);
    },

    // ─── Relation ───────────────────────────────────────

    async createRelation(payload, actor) {
      // 양쪽 object 모두 write 권한 검증
      await checkWrite(actor, { kind: 'object', id: payload.from_id });
      await checkWrite(actor, { kind: 'object', id: payload.to_id });
      const adapter = await router.resolve({ kind: 'relation', id: NEW_ID });
      return adapter.createRelation(payload);
    },

    async getRelation(id, actor) {
      await checkRead(actor, { kind: 'relation', id });
      const adapter = await router.resolve({ kind: 'relation', id });
      return adapter.getRelation(id);
    },

    async deleteRelation(id, actor) {
      await checkWrite(actor, { kind: 'relation', id });
      const adapter = await router.resolve({ kind: 'relation', id });
      await adapter.deleteRelation(id);
    },

    // ─── Event ──────────────────────────────────────────

    async createEvent(payload, actor) {
      // 첫 object 의 write 권한 검증 (event 는 N개 object 영향)
      const firstObjectId = payload.object_ids[0];
      if (firstObjectId) {
        await checkWrite(actor, { kind: 'object', id: firstObjectId });
      }
      const adapter = await router.resolve({ kind: 'event', id: NEW_ID });
      return adapter.createEvent(payload);
    },

    async getEvent(id, actor) {
      await checkRead(actor, { kind: 'event', id });
      const adapter = await router.resolve({ kind: 'event', id });
      return adapter.getEvent(id);
    },

    // ─── Provenance ─────────────────────────────────────

    async createProvenance(payload, actor) {
      await checkWrite(actor, {
        kind: payload.target_kind,
        id: payload.target_id,
      });
      const adapter = await router.resolve({
        kind: payload.target_kind,
        id: payload.target_id,
      });
      const prov = await adapter.createProvenance(payload);
      if (provenanceExtension) {
        await provenanceExtension(prov);
      }
      return prov;
    },

    async listProvenance(target, actor) {
      await checkRead(actor, target);
      const adapter = await router.resolve(target);
      return adapter.listProvenance(target);
    },

    // ─── Label ──────────────────────────────────────────

    async createLabel(payload, actor) {
      await checkWrite(actor, {
        kind: payload.target_kind,
        id: payload.target_id,
      });
      const adapter = await router.resolve({
        kind: payload.target_kind,
        id: payload.target_id,
      });
      return adapter.createLabel(payload);
    },

    async listLabels(target, actor) {
      await checkRead(actor, target);
      const adapter = await router.resolve(target);
      return adapter.listLabels(target);
    },

    // ─── Access control 노출 ────────────────────────────

    async scopes(target, _actor) {
      if (!access) return [];
      return access.scopes(target);
    },
  };
}
