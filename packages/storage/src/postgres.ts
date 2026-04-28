/**
 * PostgresAdapter — `@wiki-core/storage` 의 reference 구현.
 *
 * `pg` 모듈을 직접 import 하지 않고 `DbClient` 인터페이스로 추상화.
 * Plugin 이 pg.Pool / Supabase client / 기타 driver 를 DbClient 로 wrap 하여 주입.
 *
 * SPEC: packages/storage/SPEC.md §2
 */

import type {
  ID,
  WikiObject,
  WikiAttribute,
  WikiRelation,
  WikiEvent,
  WikiProvenance,
  WikiLabel,
  TargetRef,
  StorageAdapter,
  AdapterCapabilities,
  QueryFilter,
} from '@wiki-core/core';

/**
 * Database client 추상. plugin 이 `pg.Pool` / Supabase client / 기타 driver 를
 * 다음 형태로 wrap 하여 주입:
 *
 * ```ts
 * import { Pool } from 'pg';
 * const pool = new Pool({ connectionString: ... });
 * const dbClient: DbClient = {
 *   query: (sql, params) => pool.query(sql, params).then(({ rows }) => ({ rows })),
 * };
 * ```
 */
export interface DbClient {
  query<T = unknown>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[] }>;
}

export interface PostgresAdapterOptions {
  db: DbClient;
  /** default "wiki_" — table 명 prefix (wiki_objects / wiki_attributes / ...) */
  tablePrefix?: string;
  /** RLS context 주입 — 호출별 actor 정보. plugin 이 `SET app.current_user = $1` 등 실행 */
  setActor?: (db: DbClient, actorId: string) => Promise<void>;
}

const TARGET_KIND_TABLE: Record<TargetRef['kind'], string> = {
  object: 'objects',
  attribute: 'attributes',
  relation: 'relations',
  event: 'events',
};

export class PostgresAdapter implements StorageAdapter {
  readonly kind = 'postgres';

  private readonly db: DbClient;
  private readonly prefix: string;

  constructor(opts: PostgresAdapterOptions) {
    this.db = opts.db;
    this.prefix = opts.tablePrefix ?? 'wiki_';
  }

  capabilities(): AdapterCapabilities {
    return {
      transactional: true,
      rls: true,
      fullTextSearch: true,
      vector: false,
      ttl: false,
    };
  }

  // ─── Object ────────────────────────────────────────────

  async createObject(
    payload: Omit<WikiObject, 'id' | 'created_at'>
  ): Promise<WikiObject> {
    const sql = `
      INSERT INTO ${this.prefix}objects (type, label, identifier, created_origin, updated_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const params = [
      payload.type,
      payload.label,
      payload.identifier ?? null,
      payload.created_origin,
      payload.updated_at ?? null,
    ];
    const { rows } = await this.db.query<WikiObject>(sql, params);
    return ensureRow(rows, 'wiki_objects insert');
  }

  async getObject(id: ID): Promise<WikiObject | null> {
    const { rows } = await this.db.query<WikiObject>(
      `SELECT * FROM ${this.prefix}objects WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async updateObject(id: ID, patch: Partial<WikiObject>): Promise<WikiObject> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'id' || key === 'created_at') continue;
      fields.push(`${key} = $${idx++}`);
      params.push(value);
    }
    if (fields.length === 0) {
      const obj = await this.getObject(id);
      if (!obj) throw new Error(`object not found: ${id}`);
      return obj;
    }
    fields.push(`updated_at = now()`);
    params.push(id);
    const sql = `
      UPDATE ${this.prefix}objects
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;
    const { rows } = await this.db.query<WikiObject>(sql, params);
    return ensureRow(rows, 'wiki_objects update');
  }

  async deleteObject(id: ID): Promise<void> {
    await this.db.query(
      `DELETE FROM ${this.prefix}objects WHERE id = $1`,
      [id]
    );
  }

  // ─── Attribute ─────────────────────────────────────────

  async createAttribute(
    payload: Omit<WikiAttribute, 'id' | 'recorded_at'>
  ): Promise<WikiAttribute> {
    const sql = `
      INSERT INTO ${this.prefix}attributes (object_id, key, value, unit, valid_at, valid_until)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [
      payload.object_id,
      payload.key,
      JSON.stringify(payload.value),
      payload.unit ?? null,
      payload.valid_at ?? null,
      payload.valid_until ?? null,
    ];
    const { rows } = await this.db.query<WikiAttribute>(sql, params);
    return ensureRow(rows, 'wiki_attributes insert');
  }

  async getAttribute(id: ID): Promise<WikiAttribute | null> {
    const { rows } = await this.db.query<WikiAttribute>(
      `SELECT * FROM ${this.prefix}attributes WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  // ─── Relation ──────────────────────────────────────────

  async createRelation(
    payload: Omit<WikiRelation, 'id' | 'created_at'>
  ): Promise<WikiRelation> {
    const sql = `
      INSERT INTO ${this.prefix}relations (from_id, to_id, type, directionality, weight)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const params = [
      payload.from_id,
      payload.to_id,
      payload.type,
      payload.directionality,
      payload.weight ?? null,
    ];
    const { rows } = await this.db.query<WikiRelation>(sql, params);
    return ensureRow(rows, 'wiki_relations insert');
  }

  async getRelation(id: ID): Promise<WikiRelation | null> {
    const { rows } = await this.db.query<WikiRelation>(
      `SELECT * FROM ${this.prefix}relations WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async deleteRelation(id: ID): Promise<void> {
    await this.db.query(
      `DELETE FROM ${this.prefix}relations WHERE id = $1`,
      [id]
    );
  }

  // ─── Event ─────────────────────────────────────────────

  async createEvent(
    payload: Omit<WikiEvent, 'id' | 'recorded_at'>
  ): Promise<WikiEvent> {
    const sql = `
      INSERT INTO ${this.prefix}events (object_ids, type, occurred_at, payload)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const params = [
      payload.object_ids,
      payload.type,
      payload.occurred_at,
      JSON.stringify(payload.payload),
    ];
    const { rows } = await this.db.query<WikiEvent>(sql, params);
    return ensureRow(rows, 'wiki_events insert');
  }

  async getEvent(id: ID): Promise<WikiEvent | null> {
    const { rows } = await this.db.query<WikiEvent>(
      `SELECT * FROM ${this.prefix}events WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  // ─── Provenance ────────────────────────────────────────

  async createProvenance(
    payload: Omit<WikiProvenance, 'id'>
  ): Promise<WikiProvenance> {
    const sql = `
      INSERT INTO ${this.prefix}provenance (target_kind, target_id, source_kind, source_ref, recorded_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const params = [
      payload.target_kind,
      payload.target_id,
      payload.source_kind,
      payload.source_ref,
      payload.recorded_at,
    ];
    const { rows } = await this.db.query<WikiProvenance>(sql, params);
    return ensureRow(rows, 'wiki_provenance insert');
  }

  async listProvenance(target: TargetRef): Promise<WikiProvenance[]> {
    const { rows } = await this.db.query<WikiProvenance>(
      `SELECT * FROM ${this.prefix}provenance
       WHERE target_kind = $1 AND target_id = $2
       ORDER BY recorded_at DESC`,
      [target.kind, target.id]
    );
    return rows;
  }

  // ─── Label ─────────────────────────────────────────────

  async createLabel(
    payload: Omit<WikiLabel, 'id'>
  ): Promise<WikiLabel> {
    const sql = `
      INSERT INTO ${this.prefix}labels (target_kind, target_id, label_set_id, label_id, applied_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const params = [
      payload.target_kind,
      payload.target_id,
      payload.label_set_id,
      payload.label_id,
      payload.applied_at,
    ];
    const { rows } = await this.db.query<WikiLabel>(sql, params);
    return ensureRow(rows, 'wiki_labels insert');
  }

  async getLabel(id: ID): Promise<WikiLabel | null> {
    const { rows } = await this.db.query<WikiLabel>(
      `SELECT * FROM ${this.prefix}labels WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async listLabels(target: TargetRef): Promise<WikiLabel[]> {
    const { rows } = await this.db.query<WikiLabel>(
      `SELECT * FROM ${this.prefix}labels
       WHERE target_kind = $1 AND target_id = $2
       ORDER BY applied_at DESC`,
      [target.kind, target.id]
    );
    return rows;
  }

  async deleteLabel(id: ID): Promise<void> {
    await this.db.query(
      `DELETE FROM ${this.prefix}labels WHERE id = $1`,
      [id]
    );
  }

  // ─── Query ─────────────────────────────────────────────

  async query<T>(filter: QueryFilter): Promise<T[]> {
    const tableName = `${this.prefix}${TARGET_KIND_TABLE[filter.target_kind]}`;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filter.conditions) {
      for (const [key, value] of Object.entries(filter.conditions)) {
        conditions.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter.limit ? `LIMIT ${Number(filter.limit)}` : '';
    const sql = `SELECT * FROM ${tableName} ${where} ${limit}`;
    const { rows } = await this.db.query<T>(sql, params);
    return rows;
  }
}

function ensureRow<T>(rows: T[], context: string): T {
  const row = rows[0];
  if (!row) throw new Error(`${context}: no row returned`);
  return row;
}
