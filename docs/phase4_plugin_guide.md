# Phase 4 — 도메인 plugin 합류 가이드

> 도메인 owner(rootric / plott / enroute)가 자기 repo 에 wiki-core plugin 패키지 작성 시 따라가는 가이드.
>
> **작성자**: 머큐리 (wiki-core 코어 아키텍트)
> **작성일**: 2026-04-28
> **세션**: Mercury 7차 (Phase 4 진입)
> **선행**:
> - `docs/abstraction_decision.md` §4·§7 (plugin 책임 + 도메인 owner 메시지)
> - `packages/core/SPEC.md` §1~§5 (4요소 + hook + Plugin Manifest)
> - `packages/storage/SPEC.md` §1~§4 (Adapter + Router + extension table)
> - `docs/domain_feedback_log.md` (검증 누적)
>
> **status**: 1차. 도메인 owner 검증 후 보완.
>
> **범위**: plugin 작성 5 박스 + 검증 체크리스트. router/renderer 코드는 wiki-core 측 추후 박제 (semver minor — additive). 이 가이드는 plugin 이 코어 + storage 만으로 합류 가능한 범위까지.

---

## 0. plugin 책임 (행동 원칙 #1 정합)

`@<domain>/wiki-plugin` 은 도메인 repo 에서 자체 빌드. 머큐리는 코어 4 패키지(core / storage / router / renderer)만, plugin 본체는 일체 다루지 않음.

### 0.1 plugin 의 5 의무

| # | 의무 | 코어 인터페이스 |
|---|---|---|
| 1 | 도메인 type 카탈로그 정의 (4요소 모두) | `WikiPlugin.objectTypes / attributeKeys / relationTypes / eventTypes` |
| 2 | label_set 1개 이상 정의 | `WikiPlugin.labelSets` |
| 3 | hook 구현 (5 기본 + access control + storage router) | `WikiPlugin.hooks` |
| 4 | storage adapter 주입 (단일 또는 multi) | `StorageRouter` |
| 5 | 마이그레이션 — 코어 0001/0002 SQL + plugin extension table | plugin 자체 SQL |

### 0.2 plugin 이 *안 해도 되는 것*

- 코어 인터페이스 변경 요청 (머큐리 단독 결정)
- 다른 plugin 과 직접 합의 (에드워드 경유)
- 자기 도메인 어휘를 코어에 반영 요구 (plugin extension table 으로 처리)

### 0.3 충돌 시 흐름

plugin 작성 중 코어 인터페이스가 자기 도메인 수용 못하는 케이스 발견 → 에드워드 경유 머큐리에게 전달 → 머큐리가 코어 hook 추가 검토 (도메인 어휘 코어 반영은 거부).

---

## 1. 박스 1 — Plugin Manifest Boilerplate

### 1.1 최소 형태

```ts
// @<domain>/wiki-plugin/src/index.ts

import type { WikiPlugin } from '@wiki-core/core';
import { registerPlugin } from '@wiki-core/core';
import { PostgresAdapter, createStorageRouter } from '@wiki-core/storage';

const dbClient = /* DbClient wrap — 박스 2 */;
const adapter = new PostgresAdapter({ db: dbClient });

export const plugin: WikiPlugin = {
  name: '@<domain>/wiki-plugin',
  version: '0.1.0',

  // 4요소 type 카탈로그 (모두 string — 코어는 의미 모름)
  objectTypes: [/* 'stock', 'sector', ... */],
  attributeKeys: [/* 'market_cap', 'per', ... */],
  relationTypes: [/* 'belongs_to', 'supplies_to', ... */],
  eventTypes: [/* 'earnings_release', 'm_a', ... */],

  // 라벨 set — id 유니크
  labelSets: [
    {
      id: '<domain>_<axis>',
      labels: [/* 'FACT', 'ASSUMPTION', ... */],
    },
  ],

  hooks: {
    storageRouter: createStorageRouter({ adapter }),
    // 5 기본 hook + accessControl 모두 optional — 필요한 것만
  },
};

export const wikiCore = registerPlugin(plugin);
```

### 1.2 Module Augmentation — `ActorContext` 확장

도메인이 user_id 외 추가 컨텍스트(pharmacy_id / role / sensitivity 등)를 필요로 하면:

```ts
// @<domain>/wiki-plugin/src/types.d.ts
declare module '@wiki-core/core' {
  interface ActorContext {
    pharmacy_id?: string;   // plott
    circle_id?: string;     // plott
    role?: string;          // plott
    persona_mode?: string;  // enroute
    // ...
  }
}
```

코어 `ActorContext` 는 `user_id` 만. plugin 이 모듈 보강으로 자유 확장.

### 1.3 5 기본 hook 패턴

```ts
import { combine, isTooShort, matchesCssNoise, isBlankOrWhitespace, stripHtml } from '@wiki-core/core/utils/noise';

const dropPredicate = combine([
  isBlankOrWhitespace,
  (t) => isTooShort(t, 20),
  matchesCssNoise,
  // domain-specific noise rule
  // (t) => /<dart-specific-noise-pattern>/.test(t),
]);

const hooks: Partial<CoreHooks> = {
  validateObjectType(type, payload) {
    // 도메인 type 별 schema 검증
  },

  onAttributeWrite(attr) {
    // 시계열 누적 정책 (덮어쓰기 / append / 합산) — fire-and-forget
  },

  noiseFilter(text) {
    return dropPredicate(stripHtml(text));   // ★ stripHtml 사전 처리
  },

  provenanceExtension(prov) {
    // plugin extension table row 동시 작성 (rootric strength / plott is_official 등)
  },

  async labelRouter(target, content) {
    // LLM Tier 라우터 호출 → WikiLabel[] 반환
    return [];
  },
};
```

### 1.4 `accessControl` — 도메인별 패턴

| 도메인 | 복잡도 | 패턴 |
|---|---|---|
| rootric | trivial | `auth.uid()` 기반 — `canRead = true` (Wiki 공개), `canWrite = ownsTarget(actor, target)` |
| plott ★ | 5단계 + scope | `pharmacy_id` + `circle_id` + 역할매트릭스 (`canRead/canWrite` 모두 visibility · scope · role 조회) |
| enroute | trivial | `canRead/canWrite = isSelf(actor)` (사실상 본인만), `scopes() = []` |

```ts
// 예: plott (가장 복잡)
const accessControl: WikiAccessControl = {
  async canRead(actor, target) {
    const visibility = await getVisibility(target);
    if (visibility === 'public') return true;
    if (visibility === 'private') return await isOwner(actor, target);
    if (visibility === 'pharmacy') return actor.pharmacy_id === await getTargetPharmacyId(target);
    if (visibility === 'group_internal') return await isCircleMember(actor, target);
    if (visibility === 'group_public') return true;
    return false;
  },
  async canWrite(actor, target) { /* 역할매트릭스 + visibility */ },
  async scopes(target) {
    return [
      { kind: 'pharmacy', id: pharmacyId },
      { kind: 'circle', id: circleId, meta: { role: 'admin' } },
    ];
  },
};
```

---

## 2. 박스 2 — Supabase RPC wrap 본격 박스 ★ critical path

> rootric + enroute 합류의 **차단 요인**. supabase-js 단독 환경에서 pg/postgres.js 신규 의존성 회피.
>
> **머큐리 권장**: PostgresAdapter wrap 시도 X. **별도 SupabaseAdapter 클래스 자체 빌드** — supabase-js `.from()` chain 으로 4요소 CRUD 직접 구현. 보안 + 안정성 우선.

### 2.1 SupabaseAdapter 자체 빌드

```ts
// @<domain>/wiki-plugin/src/supabase-adapter.ts

import type {
  StorageAdapter, AdapterCapabilities,
  ID, TargetRef, QueryFilter,
  WikiObject, WikiAttribute, WikiRelation, WikiEvent,
  WikiProvenance, WikiLabel,
} from '@wiki-core/core';
import type { SupabaseClient } from '@supabase/supabase-js';

const TARGET_KIND_TABLE: Record<TargetRef['kind'], string> = {
  object: 'objects',
  attribute: 'attributes',
  relation: 'relations',
  event: 'events',
};

export interface SupabaseAdapterOptions {
  client: SupabaseClient;
  /** default "wiki_" */
  tablePrefix?: string;
}

export class SupabaseAdapter implements StorageAdapter {
  readonly kind = 'supabase';
  private readonly client: SupabaseClient;
  private readonly prefix: string;

  constructor(opts: SupabaseAdapterOptions) {
    this.client = opts.client;
    this.prefix = opts.tablePrefix ?? 'wiki_';
  }

  capabilities(): AdapterCapabilities {
    return {
      transactional: false,    // ★ supabase-js 단일 호출은 트랜잭션 X (필요 시 Postgres function RPC)
      rls: true,
      fullTextSearch: true,
      vector: false,           // pgvector 는 plugin 확장
      ttl: false,
    };
  }

  // ─── Object ────────────────────────────────────────────

  async createObject(payload: Omit<WikiObject, 'id' | 'created_at'>): Promise<WikiObject> {
    const { data, error } = await this.client
      .from(`${this.prefix}objects`)
      .insert({
        type: payload.type,
        label: payload.label,
        identifier: payload.identifier ?? null,
        created_origin: payload.created_origin,
        updated_at: payload.updated_at ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(`createObject: ${error.message}`);
    return data as WikiObject;
  }

  async getObject(id: ID): Promise<WikiObject | null> {
    const { data, error } = await this.client
      .from(`${this.prefix}objects`)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`getObject: ${error.message}`);
    return (data as WikiObject | null) ?? null;
  }

  async updateObject(id: ID, patch: Partial<WikiObject>): Promise<WikiObject> {
    const { id: _ignore_id, created_at: _ignore_ts, ...rest } = patch;
    const { data, error } = await this.client
      .from(`${this.prefix}objects`)
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`updateObject: ${error.message}`);
    return data as WikiObject;
  }

  async deleteObject(id: ID): Promise<void> {
    const { error } = await this.client.from(`${this.prefix}objects`).delete().eq('id', id);
    if (error) throw new Error(`deleteObject: ${error.message}`);
  }

  // ─── Attribute / Relation / Event / Provenance / Label ───

  // 동일 패턴 — `.from('${prefix}<table>').insert/select/update/delete()`
  // 전체 코드는 PostgresAdapter (packages/storage/src/postgres.ts) 와 1:1 매핑.

  // ─── Label (Mercury 6차 patch — getLabel 추가) ────────

  async getLabel(id: ID): Promise<WikiLabel | null> {
    const { data, error } = await this.client
      .from(`${this.prefix}labels`)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`getLabel: ${error.message}`);
    return (data as WikiLabel | null) ?? null;
  }

  // ─── Query ─────────────────────────────────────────────

  async query<T>(filter: QueryFilter): Promise<T[]> {
    const tableName = `${this.prefix}${TARGET_KIND_TABLE[filter.target_kind]}`;
    let q = this.client.from(tableName).select('*');
    if (filter.conditions) {
      for (const [key, value] of Object.entries(filter.conditions)) {
        q = q.eq(key, value as never);
      }
    }
    if (filter.limit) q = q.limit(filter.limit);
    const { data, error } = await q;
    if (error) throw new Error(`query: ${error.message}`);
    return (data ?? []) as T[];
  }
}
```

### 2.2 service-role vs anon-key 가이드

| Key | 용도 | RLS |
|---|---|---|
| **service-role** | 서버 사이드 / cron / migration / admin | RLS 우회 |
| **anon-key** | 클라이언트 / 일반 user 요청 | RLS 적용 (defense in depth) |

```ts
// 사용 예 — 두 환경 분리
import { createClient } from '@supabase/supabase-js';
import { SupabaseAdapter } from './supabase-adapter';

// (a) admin 작업 — RLS 우회 (cron / migration / 시스템)
const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const adminAdapter = new SupabaseAdapter({ client: supabaseAdmin });

// (b) user 요청 — RLS 적용
const supabase = createClient(url, anonKey);  // 또는 user JWT 토큰 주입
const userAdapter = new SupabaseAdapter({ client: supabase });
```

**WikiAccessControl + RLS 2중 게이트**:
- 1차 게이트: `WikiAccessControl.canRead/canWrite` (application layer — plugin 책임)
- 2차 게이트: Supabase RLS (anon-key 사용 시 자동 적용 — 코어 0002_rls.sql + plugin 자체 정책)

→ application 1차 게이트 통과 + RLS 2차 게이트 통과 모두 필요. service-role 사용 시 2차 게이트 우회되므로 **server-only 환경에서만**.

### 2.3 Postgres function 으로 트랜잭션 (선택)

`SupabaseAdapter.capabilities().transactional = false` — 단일 supabase-js 호출은 자동 커밋. 트랜잭션 필요 시 (예: Object + Provenance + Label 동시 생성):

```sql
-- @<domain>/wiki-plugin migration
CREATE OR REPLACE FUNCTION wiki_create_object_with_provenance(
  obj_payload jsonb,
  prov_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  obj_id uuid;
  prov_id uuid;
BEGIN
  INSERT INTO wiki_objects (type, label, identifier, created_origin)
  VALUES (
    obj_payload->>'type',
    obj_payload->>'label',
    obj_payload->>'identifier',
    obj_payload->>'created_origin'
  ) RETURNING id INTO obj_id;

  INSERT INTO wiki_provenance (target_kind, target_id, source_kind, source_ref, recorded_at)
  VALUES (
    'object', obj_id,
    prov_payload->>'source_kind',
    prov_payload->>'source_ref',
    (prov_payload->>'recorded_at')::timestamptz
  ) RETURNING id INTO prov_id;

  RETURN jsonb_build_object('object_id', obj_id, 'provenance_id', prov_id);
END;
$$;
```

```ts
// supabase-js 호출
const { data, error } = await this.client.rpc('wiki_create_object_with_provenance', {
  obj_payload: objPayload,
  prov_payload: provPayload,
});
```

→ 단순 CRUD 는 `.from()` chain, 트랜잭션 필요 시 RPC. plugin 이 자유 결정.

### 2.4 마이그레이션 적용

코어 0001 + 0002 SQL을 Supabase Studio SQL Editor 또는 CLI 로 적용:

```bash
# Supabase CLI
supabase db push    # 마이그레이션 SQL 자동 적용
# 또는 Studio 에서 SQL Editor 직접 실행
```

플러그인 자체 마이그레이션도 동일 디렉토리 또는 `@<domain>/wiki-plugin/src/migrations/` 에서 sequential 적용.

---

## 3. 박스 3 — 기존 schema 마이그레이션 가이드

### 3.1 매핑 원리

기존 도메인 테이블을 코어 4요소 + plugin extension table 로 분해:

| 기존 컬럼 성격 | 매핑 위치 |
|---|---|
| 객체 식별·label | `wiki_objects` (type / label / identifier / created_origin) |
| 시계열 수치·시간점 속성 | `wiki_attributes` (object_id / key / value / valid_at / valid_until) |
| 객체 간 named edge | `wiki_relations` (from_id / to_id / type / directionality / weight) |
| 시간점 사건 | `wiki_events` (object_ids[] / type / occurred_at / payload) |
| 출처 url·source 메타 | `wiki_provenance` (target_kind / target_id / source_kind / source_ref) |
| 라벨·분류 enum | `wiki_labels` (target_kind / target_id / label_set_id / label_id) |
| **도메인 특수 컬럼** (strength / is_official / metric_type / wisdom 등) | **`<domain>_<table>_ext`** (FK to 코어 row) |

### 3.2 plott 기존 wiki 4 테이블 매핑 케이스 ★

플로터가 Mercury 4차 검증에서 명시: 기존 plott `wiki_pages` / `wiki_links` / `wiki_versions` / `wiki_embeddings` → 4요소 + `plott_*_ext` 매핑 가능.

| 기존 테이블 | 매핑 위치 | plott extension |
|---|---|---|
| `wiki_pages` (마크다운 본문) | `wiki_objects` (type='page') | `plott_object_ext.markdown_body` 등 |
| `wiki_links` ([[wikilink]] 백링크) | `wiki_relations` (type='wikilink') | (없음) |
| `wiki_versions` (버전 히스토리) | `wiki_events` (type='page_versioned') | `plott_event_ext.version_diff` |
| `wiki_embeddings` (pgvector) | `wiki_attributes` (key='embedding') | `plott_attribute_ext.embedding vector(1536)` |

```sql
-- plott_object_ext: 마크다운 본문 + 가시성 메타
CREATE TABLE plott_object_ext (
  object_id        UUID PRIMARY KEY REFERENCES wiki_objects(id) ON DELETE CASCADE,
  markdown_body    TEXT,
  visibility       TEXT NOT NULL CHECK (visibility IN ('private', 'pharmacy', 'group_internal', 'group_public', 'public')),
  pharmacy_id      UUID,
  circle_id        UUID
);

-- plott_event_ext: version diff 등
CREATE TABLE plott_event_ext (
  event_id         UUID PRIMARY KEY REFERENCES wiki_events(id) ON DELETE CASCADE,
  version_diff     JSONB,
  visibility_from  TEXT,
  visibility_to    TEXT
);

-- plott_attribute_ext: pgvector 임베딩
CREATE TABLE plott_attribute_ext (
  attribute_id     UUID PRIMARY KEY REFERENCES wiki_attributes(id) ON DELETE CASCADE,
  embedding        VECTOR(1536)
);
CREATE INDEX plott_attribute_ext_embedding_idx ON plott_attribute_ext USING ivfflat (embedding vector_cosine_ops);
```

### 3.3 마이그레이션 어댑터 패턴

기존 row → 코어 row + extension row 동시 작성. plugin `provenanceExtension` / `onAttributeWrite` hook 에서 처리:

```ts
const hooks: Partial<CoreHooks> = {
  async onAttributeWrite(attr) {
    if (attr.key === 'embedding') {
      // pgvector 컬럼은 wiki_attributes.value 에 안 들어감 — extension table 로
      await dbClient.query(
        `INSERT INTO plott_attribute_ext (attribute_id, embedding) VALUES ($1, $2)
         ON CONFLICT (attribute_id) DO UPDATE SET embedding = EXCLUDED.embedding`,
        [attr.id, attr.value]
      );
    }
  },
};
```

### 3.4 다른 도메인 매핑 패턴 (참고)

| 도메인 | 기존 테이블 | 코어 매핑 | extension |
|---|---|---|---|
| rootric | `factsheet_articles` | `wiki_provenance` (source_kind='dart' 등) | `rootric_provenance_ext` (strength / is_key / expires_at) |
| rootric | `factsheet_topics` | `wiki_objects` (type='topic') + `wiki_attributes` | `rootric_topic_ext` |
| rootric | `financial_data` | `wiki_attributes` (key='market_cap' / 'per' / ...) | (없음, value JSONB 충분) |
| enroute | `nodes` (Vision/Area/Project 등 5종) | `wiki_objects` (type='vision'/'area'/...) | `enroute_object_ext` (metric_type / wisdom / voluntary) |
| enroute | `node_links` | `wiki_relations` (type='cross' / 'parent_id') | (없음, weight 충분) |
| enroute | `containers` / `activity_logs` | `wiki_objects` (type='container'/'activity') + `wiki_attributes` | `enroute_attribute_ext` (sensitivity_layer A/B/C) |

---

## 4. 박스 4 — Ingest 파이프라인 Boilerplate

> Mercury 5차 미해결 후보 (CLAUDE.md "Mercury 5차") — Phase 4 가이드에서 박제.
>
> 흐름: text 입력 → noiseFilter → sensitivity 분류 → router (Tier 결정) → model 호출 → 4요소 추출 → WikiCore CRUD.

### 4.1 파이프라인 골격

```ts
// @<domain>/wiki-plugin/src/ingest.ts

import type { WikiCore, ActorContext } from '@wiki-core/core';

export interface IngestSource {
  kind: string;        // 'dart' / 'sheet' / 'activitywatch' / ...
  ref: string;         // url / sheet_id+tab / aw_event_id
  recorded_at: string; // ISO8601
}

export interface IngestInput {
  text: string;
  source: IngestSource;
  actor: ActorContext;
}

export async function ingestText(
  wikiCore: WikiCore,
  plugin: WikiPlugin,
  input: IngestInput
): Promise<{ kept: boolean; objectIds: string[] }> {
  const { text, source, actor } = input;

  // 1. noiseFilter (Tier 0)
  if (plugin.hooks.noiseFilter?.(text)) {
    return { kept: false, objectIds: [] };
  }

  // 2. sensitivity 분류 (enroute Tier 4 강제 케이스)
  //    plugin 이 자체 분류기 — 코어는 모름
  const sensitivity = await classifySensitivity(text);

  // 3. Tier 라우팅 — router 패키지 (Mercury 7차 후 도착 예정)
  //    임시: plugin 이 자체 모델 직접 호출
  const tier = await selectTier({ text, sensitivity });
  const extracted = await tier.model.extract(text);

  // 4. 4요소 저장 — WikiCore 통한 hook chain + access control
  const objectIds: string[] = [];
  for (const obj of extracted.objects) {
    const created = await wikiCore.createObject(
      { ...obj, created_origin: 'ingest' },
      actor
    );
    objectIds.push(created.id);

    // Provenance — source 메타
    await wikiCore.createProvenance(
      {
        target_kind: 'object',
        target_id: created.id,
        source_kind: source.kind,
        source_ref: source.ref,
        recorded_at: source.recorded_at,
      },
      actor
    );

    // Label — labelRouter hook 통해 자동 분류
    if (plugin.hooks.labelRouter) {
      const labels = await plugin.hooks.labelRouter(
        { kind: 'object', id: created.id },
        text
      );
      for (const label of labels) {
        await wikiCore.createLabel(label, actor);
      }
    }
  }

  // ... Attribute / Relation / Event 도 동일 패턴

  return { kept: true, objectIds };
}
```

### 4.2 noise rule 도메인 결합 패턴

`@wiki-core/core/utils/noise` 헬퍼 4종 + 도메인 룰 결합:

```ts
import { combine, isTooShort, matchesCssNoise, isBlankOrWhitespace, stripHtml } from '@wiki-core/core/utils/noise';

// 도메인 노이즈 룰 (예: rootric DART HTML 특수 패턴)
const dartHtmlNoise = (t: string): boolean =>
  /^\(주\)|^본\s문장은|^\[원문\]/.test(t);

const dropPredicate = combine([
  isBlankOrWhitespace,
  (t) => isTooShort(t, 20),
  matchesCssNoise,
  dartHtmlNoise,                  // domain rule
]);

// ★ stripHtml 은 transform → predicates 사전 처리 (combine 안에 안 들어감)
const noiseFilter = (text: string): boolean => dropPredicate(stripHtml(text));
```

### 4.3 sensitivity 분류기 (enroute 우선)

enroute C 레이어 (일기·재무·가족) 클라우드 LLM 차단:

```ts
async function classifySensitivity(text: string): Promise<'A' | 'B' | 'C'> {
  // 도메인 규칙 (예: 일기 키워드 / 가족 실명 / 의료 용어 → C)
  if (matchesCRules(text)) return 'C';
  if (matchesBRules(text)) return 'B';
  return 'A';
}

// router 호출 시 Tier 4 강제 (router 패키지 도착 후 정확한 시그니처)
async function selectTier(input: { text: string; sensitivity: 'A' | 'B' | 'C' }) {
  if (input.sensitivity === 'C') {
    return { /* T4 — local model (Ollama gemma3) */ };
  }
  // ...
}
```

→ enroute plugin 책임. 코어는 sensitivity enum 모름.

---

## 5. 박스 5 — 검증 체크리스트

plugin 합류 PR 체크 시 머큐리·도메인 owner 가 함께 확인.

### 5.1 Manifest

- [ ] `name` (`@<domain>/wiki-plugin`) + `version` (semver) 비어있지 않음
- [ ] `objectTypes` / `attributeKeys` / `relationTypes` / `eventTypes` 모두 string[] (빈 배열 허용)
- [ ] `labelSets` 1개 이상, `id` 유니크, `labels` string[]
- [ ] `validatePlugin(plugin)` 통과 (코어 함수 호출)

### 5.2 Hook 구현

- [ ] `hooks.storageRouter` ★ 필수 (`registerPlugin` 에서 강제)
- [ ] `hooks.accessControl` 정의 (trivial OK — 본인만)
- [ ] (선택) `validateObjectType` — type별 schema 검증
- [ ] (선택) `onAttributeWrite` — 시계열 누적 정책
- [ ] (선택) `noiseFilter` — `@wiki-core/core/utils/noise` 헬퍼 + 도메인 룰 결합
- [ ] (선택) `provenanceExtension` — extension table row 작성
- [ ] (선택) `labelRouter` — LLM Tier 통한 자동 분류

### 5.3 Storage

- [ ] adapter 1개 이상 (PostgresAdapter / SupabaseAdapter / 자체 빌드)
- [ ] `createStorageRouter` 옵션 (adapter / byKind / resolver) 적절 선택
- [ ] multi-storage 시 resolver 정책 명확
- [ ] `capabilities()` 정확 (transactional / rls / vector 등)

### 5.4 마이그레이션

- [ ] 코어 0001_core.sql 적용 (4요소 + 보조 슬롯 6 table)
- [ ] 코어 0002_rls.sql 적용 (RLS defense in depth)
- [ ] plugin extension table 적용 (FK to 코어 row, ON DELETE CASCADE)
- [ ] plugin 자체 RLS 정책 추가 (가능 시 default policy DROP + 강화)

### 5.5 빌드·타입

- [ ] TypeScript strict + `noUncheckedIndexedAccess` + `verbatimModuleSyntax` 통과
- [ ] `@wiki-core/core` / `@wiki-core/storage` peer dependency
- [ ] `tsc -b` build 에러 0건

### 5.6 통합 동작

- [ ] `registerPlugin(plugin)` 성공 → `WikiCore` 인스턴스 반환
- [ ] 4요소 CRUD 1차 동작 (createObject → getObject → updateObject → deleteObject)
- [ ] hook chain 호출 확인 (validateObjectType / onAttributeWrite / provenanceExtension)
- [ ] access control 거부 케이스 동작 (canWrite false 시 `access denied` throw)
- [ ] (선택) ingest 파이프라인 1차 동작 — 1 source → 1 object 저장

---

## 6. 합류 순서

| 순 | 도메인 | 진입 신호 |
|---|---|---|
| 1 | (가장 단순한 도메인 먼저) | trivial accessControl + 단일 storage |
| 2 | (multi-storage 또는 복잡 가시성) | multi adapter + WikiAccessControl 복잡 |
| 3 | (가장 복잡) | 5단계 가시성 + scope_id + 역할매트릭스 |

머큐리 추천 순: **enroute → rootric → plott**.
- enroute: trivial accessControl (본인만), Phase 4 합류 가이드 검증 1차
- rootric: 멀티유저 SaaS 추가
- plott: 5단계 가시성 + scope_id 추가 (가장 복잡)

→ 단 도메인 owner 작업 가능 시점에 따라 순서 변경 자유. 합의는 에드워드 경유.

---

## 7. 변경 정책 (이 가이드)

- **major**: plugin 인터페이스 breaking change (`WikiPlugin` 필드 추가/제거)
- **minor**: 신규 박스 / 새 도메인 케이스 박제
- **patch**: 오타·예시 보강

---

## 8. 다음 작업

1. **3 도메인 owner 검증** — 가이드 5 박스 + 체크리스트 OK 또는 보완 의견
2. **router/renderer 코드 박제** (Mercury 8차+) — 가이드 §4.3 Tier 라우터 정확한 시그니처 도착
3. **첫 도메인 plugin 합류** — 가이드 따라 작성, 통합 테스트 후 Phase 4 종료

---

## 부록 A — 자주 만날 트랩

### A.1 storageRouter 누락

`registerPlugin` 시 throw:

```
Error: plugin.hooks.storageRouter is required.
```

→ `createStorageRouter({ adapter })` 최소 1개 필수.

### A.2 stripHtml 을 combine 안에 넣음

`stripHtml` 은 transform (string → string), `combine` 은 predicate or-chain (text → boolean). 잘못 결합 시 TypeError.

```ts
// ❌
const drop = combine([stripHtml, isTooShort, ...]);

// ✅
const drop = combine([isTooShort, ...]);
const filter = (t: string) => drop(stripHtml(t));
```

### A.3 service-role 키를 클라이언트에 노출

service-role 은 RLS 우회. 절대 브라우저 / 모바일 클라이언트에 노출 X. server-side 만.

### A.4 `CREATE POLICY IF NOT EXISTS` 사용 (PG 15.x 미지원)

Mercury 6차 patch — `DROP POLICY IF EXISTS … ; CREATE POLICY …` 패턴 사용. plugin 자체 정책에도 동일 적용.

### A.5 multi-storage label 조회

label 은 4요소 보조 슬롯 (TargetKind 에 'label' 없음). `WikiCore.deleteLabel` 은 `router.adapters` 순회로 label 위치 찾음 (Mercury 6차 patch). multi-storage 시 최악 N round-trip 비용 — UUID v7 글로벌 고유라 ID 충돌 X.

---

**작성 완료 — 2026-04-28 (Mercury 7차)**
**다음 액션**: 3 도메인 owner 검증 후 Phase 4 본격 plugin 합류 진입.
