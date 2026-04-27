# @wiki-core/storage — SPEC

> wiki-core storage 패키지. `StorageAdapter` 인터페이스 + Postgres 1차 구현 + RLS 통합. multi-storage 1급 시민 보장.
>
> **작성자**: 머큐리 (wiki-core 코어 아키텍트)
> **작성일**: 2026-04-28
> **세션**: Mercury 3차 (Phase 3 — storage/router/renderer SPEC 묶음 작성)
> **선행**: `packages/core/SPEC.md` §4.2 (StorageRouter 인터페이스), `docs/comparison_matrix.md` §8 (Multi-storage 1급 결정)
>
> **status**: 1차 SPEC. Postgres 구현이 reference. Sheets/SQLite 어댑터는 plugin 자체 빌드 (도메인 책임).

---

## 0. 목적·scope

`@wiki-core/storage` 는 4요소 + 보조 슬롯을 *어떤 storage backend* 로도 read/write 가능하게 하는 추상층. 코어가 직접 storage 호출하지 않고 모두 이 패키지의 어댑터 거침.

### 0.1 코어가 제공하는 것

- `StorageAdapter` 인터페이스 (4요소 CRUD + Provenance/Label CRUD + query)
- **Postgres reference 구현** (`PostgresAdapter`) — Supabase + RLS 통합. 3 도메인 모두 공통 사용 가능.
- `StorageRouter` reference 구현 (코어 `packages/core/SPEC.md` §4.2 인터페이스의 base impl)
- 마이그레이션 SQL 골격 (4요소 + 보조 슬롯 + plugin extension hook table)

### 0.2 코어가 *제공하지 않는* 것

| 영역 | 이유 | plugin 책임 |
|---|---|---|
| Sheets adapter | enroute Trade event 만 사용 | `@enroute/plugin` 자체 빌드 |
| SQLite adapter (로컬·Hermes) | enroute C 레이어 격리만 사용 | `@enroute/plugin` 자체 빌드 |
| pgvector / 임베딩 | plott wiki_embeddings 만 사용 | `@plott/plugin` 자체 빌드 |
| drug_master sync | plott 외부 305K row | `@plott/plugin` adapter (StorageAdapter 구현) |
| 캐시 layer | renderer / plugin 책임 | — |
| Migration runner | 도메인 owner 책임 (부록 A.4) | plugin 자체 |

### 0.3 의존성

- `@wiki-core/core` — 4요소·보조 슬롯·Hook 타입
- `pg` (Postgres reference 구현용) — peer dependency

Plugin 이 추가 어댑터 빌드 시 이 패키지의 `StorageAdapter` 인터페이스만 implement.

---

## 1. StorageAdapter 인터페이스

```ts
// @wiki-core/storage/src/adapter.ts

import type {
  ID, ISOTimestamp, JSONValue, TargetRef, QueryFilter,
  WikiObject, WikiAttribute, WikiRelation, WikiEvent,
  WikiProvenance, WikiLabel,
} from '@wiki-core/core';

export interface StorageAdapter {
  /** "postgres" / "sheets" / "sqlite" / "drug_master_view" 등 plugin 자유 */
  readonly kind: string;

  // 4요소 CRUD
  createObject(payload: Omit<WikiObject, 'id' | 'created_at'>): Promise<WikiObject>;
  getObject(id: ID): Promise<WikiObject | null>;
  updateObject(id: ID, patch: Partial<WikiObject>): Promise<WikiObject>;
  deleteObject(id: ID): Promise<void>;

  createAttribute(payload: Omit<WikiAttribute, 'id' | 'recorded_at'>): Promise<WikiAttribute>;
  getAttribute(id: ID): Promise<WikiAttribute | null>;
  // (시계열 누적 정책은 plugin 의 onAttributeWrite hook 책임. adapter 는 row 1개 다룰 뿐)

  createRelation(payload: Omit<WikiRelation, 'id' | 'created_at'>): Promise<WikiRelation>;
  getRelation(id: ID): Promise<WikiRelation | null>;
  deleteRelation(id: ID): Promise<void>;

  createEvent(payload: Omit<WikiEvent, 'id' | 'recorded_at'>): Promise<WikiEvent>;
  getEvent(id: ID): Promise<WikiEvent | null>;

  // 보조 슬롯 CRUD
  createProvenance(payload: Omit<WikiProvenance, 'id'>): Promise<WikiProvenance>;
  listProvenance(target: TargetRef): Promise<WikiProvenance[]>;

  createLabel(payload: Omit<WikiLabel, 'id'>): Promise<WikiLabel>;
  listLabels(target: TargetRef): Promise<WikiLabel[]>;
  deleteLabel(id: ID): Promise<void>;

  // Query
  query<T>(filter: QueryFilter): Promise<T[]>;

  // Transaction (optional — 어댑터 capability)
  transaction?<T>(fn: (tx: StorageAdapter) => Promise<T>): Promise<T>;
}
```

### 1.1 Adapter capability flags

```ts
export interface AdapterCapabilities {
  transactional: boolean;        // Postgres ✓ / Sheets ✗ / SQLite ✓
  rls: boolean;                  // Postgres+Supabase ✓
  fullTextSearch: boolean;       // Postgres ✓ / Sheets 제한적
  vector: boolean;               // pgvector plugin ✓
  ttl: boolean;                  // 일부 어댑터 (Hermes SQLite) 만
}

export interface StorageAdapter {
  // ... 기본 CRUD
  capabilities(): AdapterCapabilities;
}
```

Plugin 이 `StorageRouter.resolve()` 정책에서 capability 보고 어댑터 선택 가능 (예: 트랜잭션 필요 시 Postgres 강제).

---

## 2. Postgres Reference 구현

```ts
// @wiki-core/storage/src/postgres.ts
//
// Mercury 5차 정정: pg 모듈을 직접 import 하지 않고 DbClient 인터페이스로 추상화.
// Plugin 이 pg.Pool / Supabase client / 기타 driver 를 DbClient 로 wrap 하여 주입.

import type { StorageAdapter, AdapterCapabilities } from '@wiki-core/core';

export interface DbClient {
  query<T = unknown>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[] }>;
}

export interface PostgresAdapterOptions {
  db: DbClient;                            // 외부 주입 — plugin 이 wrap
  tablePrefix?: string;                    // default "wiki_" (wiki_objects / wiki_attributes / ...)
  setActor?: (db: DbClient, actorId: string) => Promise<void>;
}

export class PostgresAdapter implements StorageAdapter {
  readonly kind = 'postgres';
  // ... 4요소 + 보조 슬롯 CRUD + query 구현
  capabilities(): AdapterCapabilities {
    return {
      transactional: true,
      rls: true,
      fullTextSearch: true,
      vector: false,                       // pgvector 는 plugin 확장
      ttl: false,
    };
  }
}
```

**plugin 사용 예 — pg.Pool wrap**:

```ts
import { Pool } from 'pg';
import { PostgresAdapter } from '@wiki-core/storage';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PostgresAdapter({
  db: {
    query: (sql, params) => pool.query(sql, params).then(({ rows }) => ({ rows })),
  },
});
```

### 2.1 마이그레이션 SQL 골격

```sql
-- @wiki-core/storage/migrations/0001_core.sql
-- 4요소 + 보조 슬롯. 도메인 type 카탈로그는 plugin extension table 에서.

CREATE TABLE IF NOT EXISTS wiki_objects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL,                     -- plugin 정의 (검증은 validateObjectType hook)
  label           TEXT NOT NULL,
  identifier      TEXT,
  created_origin  TEXT NOT NULL CHECK (created_origin IN ('ingest', 'manual', 'auto')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ
);
CREATE INDEX wiki_objects_type ON wiki_objects(type);
CREATE INDEX wiki_objects_identifier ON wiki_objects(identifier) WHERE identifier IS NOT NULL;

CREATE TABLE IF NOT EXISTS wiki_attributes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id     UUID NOT NULL REFERENCES wiki_objects(id) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  value         JSONB NOT NULL,
  unit          TEXT,
  valid_at      TIMESTAMPTZ,
  valid_until   TIMESTAMPTZ,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_at IS NULL OR valid_until IS NULL OR valid_at <= valid_until)
);
CREATE INDEX wiki_attributes_object_key ON wiki_attributes(object_id, key);
CREATE INDEX wiki_attributes_valid_at ON wiki_attributes(valid_at) WHERE valid_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS wiki_relations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id         UUID NOT NULL REFERENCES wiki_objects(id) ON DELETE CASCADE,
  to_id           UUID NOT NULL REFERENCES wiki_objects(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  directionality  TEXT NOT NULL CHECK (directionality IN ('directed', 'undirected')),
  weight          DOUBLE PRECISION,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_id, to_id, type)
);
CREATE INDEX wiki_relations_from ON wiki_relations(from_id, type);
CREATE INDEX wiki_relations_to ON wiki_relations(to_id, type);

CREATE TABLE IF NOT EXISTS wiki_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_ids   UUID[] NOT NULL,
  type         TEXT NOT NULL,
  occurred_at  TIMESTAMPTZ NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wiki_events_occurred_at ON wiki_events(occurred_at);
CREATE INDEX wiki_events_object_ids ON wiki_events USING GIN (object_ids);
CREATE INDEX wiki_events_type ON wiki_events(type);

CREATE TABLE IF NOT EXISTS wiki_provenance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind   TEXT NOT NULL CHECK (target_kind IN ('object', 'attribute', 'relation', 'event')),
  target_id     UUID NOT NULL,
  source_kind   TEXT NOT NULL,
  source_ref    TEXT NOT NULL,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wiki_provenance_target ON wiki_provenance(target_kind, target_id);

CREATE TABLE IF NOT EXISTS wiki_labels (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind    TEXT NOT NULL CHECK (target_kind IN ('object', 'attribute', 'relation', 'event')),
  target_id      UUID NOT NULL,
  label_set_id   TEXT NOT NULL,
  label_id       TEXT NOT NULL,
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_kind, target_id, label_set_id, label_id)
);
CREATE INDEX wiki_labels_target ON wiki_labels(target_kind, target_id);
CREATE INDEX wiki_labels_set ON wiki_labels(label_set_id, label_id);
```

### 2.2 RLS 통합 (Supabase 가정)

```sql
-- @wiki-core/storage/migrations/0002_rls.sql
-- WikiAccessControl hook 이 application layer 에서 결정. RLS 는 그 위 안전망.

ALTER TABLE wiki_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_events ENABLE ROW LEVEL SECURITY;

-- 코어는 default policy 만 — plugin 이 ALTER POLICY 로 도메인별 강화.
-- rootric: auth.uid() 기반 단순 격리
-- plott:   auth.uid() + pharmacy_id + circle_id (plugin extension 정책)
-- enroute: auth.uid() 본인만
CREATE POLICY wiki_objects_default_select ON wiki_objects
  FOR SELECT USING (true);                 -- plugin 이 override
CREATE POLICY wiki_objects_default_modify ON wiki_objects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- (attributes/relations/events 동일 패턴)
```

**중요**: WikiAccessControl hook 이 1차 게이트. RLS 는 application bypass 시 안전망 (defense in depth).

---

## 3. StorageRouter Reference 구현

`packages/core/SPEC.md` §4.2 인터페이스의 base impl. plugin 이 자유 override.

```ts
// @wiki-core/storage/src/router.ts

import type { StorageRouter, StorageAdapter, TargetRef } from './adapter';

export interface DefaultStorageRouterOptions {
  /** 단일 어댑터 사용 시 가장 간단 케이스 (rootric) */
  adapter?: StorageAdapter;

  /** target_kind 기준 분기 (코어 §4.2 권장 패턴 1) */
  byKind?: Partial<Record<TargetRef['kind'], StorageAdapter>>;

  /** plugin 자유 정책 (가장 일반) */
  resolver?: (target: TargetRef) => StorageAdapter | Promise<StorageAdapter>;
}

export function createStorageRouter(opts: DefaultStorageRouterOptions): StorageRouter {
  const adapters: Record<string, StorageAdapter> = {};

  // ... 등록 + resolve 우선순위 (resolver > byKind > adapter)
  return { adapters, resolve };
}
```

### 3.1 도메인 사용 예 (코어 §4.2 권장 박제 재확인)

```ts
// rootric
const rootricRouter = createStorageRouter({
  adapter: postgresAdapter,                // 1 adapter
});

// plott
const plottRouter = createStorageRouter({
  resolver: async (target) => {
    if (target.kind === 'object') {
      const obj = await postgres.getObject(target.id);
      if (obj?.type === 'drug') return drugMasterViewAdapter;  // plott-stock sync
    }
    return postgresAdapter;
  },
});

// enroute (★ multi-storage 1급)
const enrouteRouter = createStorageRouter({
  resolver: async (target) => {
    if (target.kind === 'event') {
      const ev = await postgresAdapter.getEvent(target.id);
      if (ev?.type === 'trade_executed') return sheetsAdapter;  // 시트 = Trade truth
    }
    if (await isCLayer(target)) return sqliteLocalAdapter;       // C 레이어 격리
    return postgresAdapter;                                       // 일반
  },
});
```

→ 루터 검증: "권장 예시가 enroute multi-storage 분리 그대로 반영" — 이 SPEC §3.1 그대로.

---

## 4. Plugin extension hook table 패턴

도메인 특수 컬럼은 별도 table. 코어는 row id 만 참조.

```sql
-- 예: @rootric/plugin 마이그레이션
CREATE TABLE rootric_provenance_ext (
  provenance_id  UUID PRIMARY KEY REFERENCES wiki_provenance(id) ON DELETE CASCADE,
  strength       INTEGER NOT NULL DEFAULT 1,
  is_key         BOOLEAN NOT NULL DEFAULT false,
  expires_at     TIMESTAMPTZ
);

-- 예: @plott/plugin
CREATE TABLE plott_provenance_ext (
  provenance_id          UUID PRIMARY KEY REFERENCES wiki_provenance(id) ON DELETE CASCADE,
  is_official            BOOLEAN NOT NULL DEFAULT false,
  is_pharmacy_specific   BOOLEAN NOT NULL DEFAULT false
);

-- 예: @enroute/plugin
CREATE TABLE enroute_label_ext (
  label_id    UUID PRIMARY KEY REFERENCES wiki_labels(id) ON DELETE CASCADE,
  wisdom      BOOLEAN NOT NULL DEFAULT false,
  voluntary   BOOLEAN NOT NULL DEFAULT false
);
```

**규칙**:
- plugin extension table 은 plugin 이 자체 마이그레이션
- FK는 코어 table 한 방향만
- plugin 이 `provenanceExtension` hook 에서 join 책임

---

## 5. 변경 정책 (semver)

- **major**: `StorageAdapter` 인터페이스 / 마이그레이션 SQL breaking change
- **minor**: 신규 capability flag / 신규 마이그레이션 (additive)
- **patch**: Postgres 구현 내부

---

## 6. 다음 작업

이 SPEC 박제 후 storage 구현은 Phase 3.5 (Phase 3 SPEC 모두 완료 후 코드 작성). pnpm 모노레포 셋업 시 `packages/storage` 디렉토리에 `src/` 추가.
