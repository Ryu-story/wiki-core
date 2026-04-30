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
> **status**: 2차. enroute 1차 합류 (Phase 4-A) 검증된 precedent 박스 §0-pre 추가 (Mercury 12차, 2026-04-30).
>
> **범위**: plugin 작성 5 박스 + 검증 체크리스트. router/renderer 코드는 wiki-core 측 추후 박제 (semver minor — additive). 이 가이드는 plugin 이 코어 + storage 만으로 합류 가능한 범위까지.

---

## 0-pre. Phase 4-A enroute precedent 박스 ★ rootric / plott reference

> Mercury 12차 (2026-04-30) 박제. enroute 1차 합류 (Ryu-story/enroute commit `8817d86`, smoke 96/96 + 0 build error) 검증 통과 결과 박스화.
> rootric / plott 합류 시 이 박스의 결정 5건 + 트랩 5종을 *기본값으로* 채택. 환경 차이만 따로 검토.

### 0-pre.1 link 패턴 환경 매트릭스 (Mercury 11차 박제)

| 환경 조건 | 채택 link 패턴 | 적용 도메인 |
|---|---|---|
| sibling ✓ + 본인 PC / 단일 컨테이너 배포 | (b) pnpm workspace sibling link | enroute (1단계 sibling, 검증 통과) / plott (2단계 sibling 예정) |
| Vercel / Cloud 단일 root 업로드 배포 (sibling 무관) | (a) git submodule + **`pack:dist` 후 `file:./dist-tarballs/*.tgz` dep** | rootric 예정 (Mercury 14차 패치) |
| Phase 5 evolution (모든 도메인) | (c) GitHub Packages publish | (모두 표준 npm 의존성으로 자연 마이그레이션) |

**1단계/2단계 sibling 둘 다 OK** — pnpm-workspace.yaml glob 한 줄 차이.

```yaml
# 1단계 sibling (enroute: develop/enroute/ ↔ develop/wiki-core/)
packages:
  - 'packages/*'
  - '../wiki-core/packages/*'

# 2단계 sibling (plott: develop/plott/plott-wiki/ ↔ develop/wiki-core/)
packages:
  - 'plott-wiki'
  - '../../wiki-core/packages/*'
```

#### (a) git submodule + `pack:dist` 패턴 (Mercury 14차 박제, Mercury 15차 정정 — 로고스 트랩 A.11/A.12/A.13 응답)

(a) submodule 환경에서는 npm 이 `workspace:*` 를 인식 못 함 (트랩 A.11). 해결 — wiki-core build 후 `pnpm pack` 으로 `.tgz` 4종 출력 → `file:./dist-tarballs/*.tgz` dep.

**wiki-core 측 자동 출력**: 루트 `pnpm pack:dist` script 가 `scripts/pack-dist.mjs` 실행 → `dist-tarballs/wiki-core-{core,storage,router,renderer}-0.1.0.tgz` 4종 생성. `workspace:*` 가 publish 시점 버전 (`0.1.0`) 으로 자동 변환됨 (npm 호환).

##### preinstall 패턴 — chicken-and-egg 해소 (Mercury 15차 정정)

**문제 (트랩 A.12)**: postinstall 에서 `pack:dist` 실행 시 — npm 이 의존성 해결 (file:.tgz 검색) → .tgz 없음 (postinstall 이전) → `ENOENT`. Vercel clean clone build 도 동일 문제 (critical path).

**해결**: postinstall → **preinstall** 전환. preinstall 은 의존성 해결 *이전* 실행 → .tgz 미리 생성 → file:.tgz 정상 해석.

##### corepack 의존 제거 (Mercury 15차 정정)

**문제 (트랩 A.13)**: Windows + Program Files Node 환경에서 `corepack enable` → `EPERM: operation not permitted, open 'C:\Program Files\nodejs\pnpm'` (admin 권한 없이 pnpm shim write 실패). Vercel 환경에서도 corepack 의존성 제거가 안전.

**해결**: `npx -y pnpm@9 ...` 직접 호출. corepack enable / corepack prepare 단계 제거.

##### rootric 측 셋업 (정정된 형태)

**1. preinstall script 작성** — `rootric/scripts/build-wiki-core.mjs`:

```js
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (!existsSync('vendor/wiki-core')) {
  console.log('[build-wiki-core] vendor/wiki-core not found — submodule init 먼저');
  process.exit(0);   // submodule 없으면 skip (git submodule update --init 후 재실행)
}

// 항상 빌드 — wiki-core submodule 갱신 시 자동 반영. 첫 install 도 OK.
console.log('[build-wiki-core] building vendor/wiki-core (install + build + pack:dist)...');
execSync('npx -y pnpm@9 install --frozen-lockfile && npx -y pnpm@9 build && npx -y pnpm@9 pack:dist', {
  cwd: 'vendor/wiki-core',
  stdio: 'inherit',
});
```

**2. `rootric/package.json`**:

```json
{
  "scripts": {
    "preinstall": "node scripts/build-wiki-core.mjs"
  },
  "dependencies": {
    "@wiki-core/core":     "file:./vendor/wiki-core/dist-tarballs/wiki-core-core-0.1.0.tgz",
    "@wiki-core/storage":  "file:./vendor/wiki-core/dist-tarballs/wiki-core-storage-0.1.0.tgz",
    "@wiki-core/router":   "file:./vendor/wiki-core/dist-tarballs/wiki-core-router-0.1.0.tgz",
    "@wiki-core/renderer": "file:./vendor/wiki-core/dist-tarballs/wiki-core-renderer-0.1.0.tgz"
  }
}
```

##### 진행 순서 (rootric clean clone / Vercel build 모두 동일)

```bash
# 1. submodule 추가 (clean clone 시 git clone --recurse-submodules 또는)
git submodule add https://github.com/Ryu-story/wiki-core.git vendor/wiki-core
git submodule update --init --recursive

# 2. package.json + scripts/build-wiki-core.mjs 적용

# 3. npm install — preinstall 이 vendor/wiki-core 안에서 pnpm install + build + pack:dist
#    실행 후 .tgz 4종 disk 출현. 그 후 npm 의존성 해결이 file:.tgz 정상 해석.
npm install
```

**Vercel 배포**: `vercel.json` 또는 Vercel Settings → Git submodule fetch 활성화. preinstall 자동 처리 — 별도 build command override 불필요.

**보장 invariant**:
- wiki-core 본체 변경 X — `workspace:*` 그대로. (b) sibling 회귀 0건.
- 추가 build 출력 (`dist-tarballs/`) 만 (.gitignore — submodule 안에서 생성/소비).
- semver 영향 0건.
- `corepack` 의존성 0건 (Windows 권한 / Vercel 환경 호환성).

### 0-pre.2 npm → pnpm 마이그레이션 trap 5종 (enroute 05-04 검증)

npm-only repo 가 (b) sibling link 채택 시 마이그레이션 필요. **plott 처럼 처음부터 pnpm 시작 시 0건**:

1. `package.json` 에 `"packageManager": "pnpm@9.x.x"` 추가 — Vercel 자동 감지 안정화 (enroute 적용 X 환경엔 무시)
2. `package-lock.json` 삭제 + `pnpm install` — lockfile 충돌 방지
3. peerDependency strict 해석 — npm 자동 hoist, pnpm strict. CI missing peer 경고 발생 시 React/Next major peer 만 명시 (대부분 무해)
4. `.npmrc` → `.pnpmrc` (auth token / registry 설정 그대로 옮김)
5. wiki-core sibling link 추가는 마이그레이션과 **같은 commit** 권장 — 두 commit 으로 나누면 중간 빌드 깨짐

### 0-pre.3 핵심 결정 5건 (enroute precedent)

#### 결정 #1 — `created_by` 컬럼: 옵션 A (코어 테이블 ALTER) ★

**채택**: plugin 마이그레이션이 `wiki_objects` / `wiki_events` 에 `created_by UUID` 컬럼을 ALTER TABLE 로 추가. RLS 는 이 컬럼 직접 비교.

**대안 (옵션 B)**: `<domain>_object_ext.user_id` + RLS join. 거부 — 단일 패턴 깨지고 join 비용 발생.

**RLS 패턴**:
- `wiki_objects` / `wiki_events` 직접: `FOR ALL USING (created_by = auth.uid())`
- `wiki_attributes` / `wiki_relations`: 부모 wiki_objects 의 created_by 경유 (`object_id IN (SELECT id FROM wiki_objects WHERE created_by = auth.uid())`)
- `wiki_provenance` / `wiki_labels`: target_kind 분기 STABLE SQL 함수 도입 → `<domain>_target_owner(target_kind, target_id) = auth.uid()` 한 줄

**확장 패턴** (plott 5단계 가시성):
- `wiki_objects.circle_id` ALTER 추가 → join 정책 다단으로 확장
- `plott_target_visibility(target_kind, target_id, viewer)` 함수 도입 — enroute `enroute_target_owner` 구조 그대로

**근거**: "plugin 이 코어 테이블 ALTER" 는 머큐리 가이드 §3.4 (마이그레이션 어댑터 패턴) 에 금지 명시 없음. 단일 RLS 패턴 + RLS join 0 + 확장 가능.

#### 결정 #2 — SupabaseAdapter 자체 빌드 (PostgresAdapter wrap 거부)

머큐리 7차 §2 박스 그대로. `supabase-js` `.from()` chain. `transactional: false` 명시 (supabase-js native tx 없음 — RPC function 으로 우회).

**`defaultCreatedBy` 옵션** — 싱글 유저 도메인 (enroute) 은 constructor 에 1회 주입, multi-user 도메인 (rootric/plott) 은 actor-aware 인스턴스 풀 (request-scoped).

**actor-aware 인스턴스 풀 — cron / service-role 분기 패턴** (Mercury 13차 박제 — 로고스 보완 의견 부분 채택):

multi-user 도메인이라도 cron 트리거 (ingest-batch / 정기 sync 등) 는 actor 가 없음. user-scoped 캐시에 actor=undefined 들어가면 정합 깨짐. → `getAdapter(actor?)` 시그니처에서 actor 부재 또는 service-role 케이스 분기:

```ts
// rootric/plott 측 plugin 에서 적용
function getAdapter(actor?: ActorContext): SupabaseAdapter {
  if (!actor || actor.role === 'service_role') {
    return cachedServiceRoleAdapter();   // 단일 cached service-role 인스턴스
  }
  return cache(() => createUserAdapter(actor))();  // user-scoped (Next.js cache() / request-scoped)
}
```

**적용 영역**:
- ingest pipeline (cron 트리거, no actor) — service-role 어댑터
- admin / 시스템 작업 (role==='service_role') — service-role 어댑터
- 일반 user 요청 (actor.role==='user') — actor-aware 어댑터

**근거**: enroute 는 single-user 라 `defaultCreatedBy` 1개로 종결, rootric/plott multi-user 는 cron 분기 케이스가 보편. 머큐리 단독 결정 — 보완 의견 부분 채택 (Mercury 9차 Router.resetBudget 패턴 동일 — 코어 인터페이스 변경 X, plugin 영역 가이드 박스 명시).

#### 결정 #3 — hooks 팩토리 패턴 (RPC 의존 hook)

**문제**: 코어 `CoreHooks.onAttributeWrite?(attr)` signature 단일 인자. RPC 호출에 client 가 필요한데 hook 자체엔 들어갈 자리 없음.

**해결**: 두 surface 동시 export.

```ts
// link-free placeholder (코어 SPEC 의존성 검사용)
export async function onAttributeWrite(attr: WikiAttribute): Promise<void> {
  // no-op
}

// 실제 동작 팩토리
export function makeOnAttributeWrite(
  client: SupabaseClient
): (attr: WikiAttribute) => Promise<void> {
  return async (attr) => {
    try {
      await client.rpc('<domain>_aggregate_sum', { ... });
    } catch (e) {
      console.warn('aggregate_sum failed', e); // fire-and-forget
    }
  };
}

// registerPlugin 측
hooks: {
  onAttributeWrite: makeOnAttributeWrite(opts.supabaseClient),
  provenanceExtension: makeProvenanceExtension(opts.supabaseClient),
  ...
}
```

**fire-and-forget 정책**: hook 내 RPC 실패는 `console.warn` 만 (throw X). 코어 흐름 깨지면 안 됨. aggregate / ext upsert 는 부수 효과라 1회 실패가 데이터 정합 손상 안 일으킴.

#### 결정 #4 — RPC SECURITY DEFINER + GRANT 패턴

```sql
CREATE OR REPLACE FUNCTION <domain>_aggregate_sum(...)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ...
END;
$$;

GRANT EXECUTE ON FUNCTION <domain>_aggregate_sum(...) TO authenticated, service_role;
```

hook 이 RLS 통과 후 호출하므로 함수 내부에선 elevated 권한. `search_path = public` 고정 (search_path injection 방지).

#### 결정 #5 — `source_ref` JSON 컨벤션

코어 `WikiProvenance` 가 `source_kind / source_ref` 만 (payload 슬롯 없음). plugin 자유 형식이라 `source_ref` 에 담는 게 가장 보수적. 스키마 변경 X.

```
manual::{"metric_type":"freedom","wisdom":true,"location":"집"}
auto::{"summary_date":"2026-04-30","persona":"hazel","period_type":"daily"}
legacy_node_id_12345           # :: 없으면 ext 작성 skip (legacy provenance)
```

**plott / rootric 도 동일 패턴 권장** — `kiwoom::{"order_id":"...","fill_at":"..."}` / `dart::{"company_code":"...","report_no":"..."}`.

### 0-pre.4 enroute 검증 결과 (precedent reference)

| 항목 | 결과 |
|---|---|
| 빌드 | 0 error |
| 사전 골격 smoke (link-free + DB 무관) | 52/52 |
| 4요소 CRUD 실호출 smoke (Supabase round-trip) | 36/36 |
| RPC 4종 실호출 smoke | 8/8 |
| 마이그레이션 | 8건 (코어 0001~0002 + plugin 0010~0015b) |
| 코어 인터페이스 변경 요청 | 0건 |

**enroute 측 후속** (rootric/plott blocking 아님): anon-key 시뮬레이션 RLS smoke / ingestText 본 작성 (Phase 4-B) / 기존 `nodes`·`containers` backfill (Phase 4-C).

자세한 내용은 `c:/Users/woori/Desktop/개인/develop/enroute/docs/phase4-mercury-report.md` 참조.

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

### 1.0 tsconfig 환경 정합 (Mercury 16차 박제 — 로고스 Phase 3-A 검증)

`@wiki-core/core/utils/noise` 같은 subpath exports 사용 시, plugin tsconfig 의 `moduleResolution` 이 모던 번들러 호환이어야 함:

```jsonc
// rootric/packages/wiki-plugin/tsconfig.json (또는 rootric tsconfig.json)
{
  "compilerOptions": {
    "moduleResolution": "bundler"   // "node" / "node10" 은 subpath exports 인식 X
    // ... 나머지 옵션
  }
}
```

**적용 도메인**:
- rootric Next.js 환경 — Phase 3-A 검증 시 `@wiki-core/core/utils/noise` 인식 위해 `bundler` 채택 (commit 검증 통과)
- enroute (b) sibling 환경 — pnpm 으로 자연 호환 (이미 정합)
- plott Next.js 환경 — rootric precedent 그대로 적용 권장

**대안**: `moduleResolution: "node16"` 또는 `"nodenext"` 도 subpath exports 인식. Next.js 표준은 `bundler` 권장.

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

## 부록 A-2 — enroute 1차 합류 트랩 5종 (Mercury 12차 박제)

### A.6 NOT NULL DEFAULT 컬럼의 ON CONFLICT COALESCE 깨짐 ★ 명시 박제 (Mercury 17차 일반화 — BOOLEAN/NUMERIC/INTEGER 모든 타입)

**증상**: ext_upsert RPC 함수에서 NOT NULL DEFAULT 컬럼을 `COALESCE(EXCLUDED.x, 기존.x)` 로 작성. INSERT 시 NULL 들어가면 DEFAULT 가 적용되어 EXCLUDED 에 default 값이 들어가고 → 기존 값을 default 로 덮음. 2차 호출 (다른 컬럼만 채움) 시 정합 사고.

**발생 사례**:
- enroute `wisdom BOOLEAN NOT NULL DEFAULT false` (Mercury 12차 발견) — 1차 true → 2차 NULL 전달 → false 로 덮힘
- rootric `strength NUMERIC NOT NULL DEFAULT 0.5` (Mercury 17차 발견) — 1차 0.85 → 2차 NULL 전달 → 0.5 로 덮힘

**원인 (메커니즘 일반)**: `INSERT VALUES` 단계에서 이미 default 로 치환된 EXCLUDED 를 받음 → "원래 NULL 이었나" 구분 불가. 타입 (BOOLEAN/NUMERIC/INTEGER) 무관하게 동일 메커니즘.

```sql
-- ❌ NOT NULL DEFAULT 컬럼 모두 깨짐 (BOOLEAN/NUMERIC/INTEGER)
INSERT INTO <domain>_object_ext (object_id, wisdom, strength, metric_type)
VALUES (p_object_id, p_wisdom, p_strength, p_metric_type)
ON CONFLICT (object_id) DO UPDATE SET
  wisdom      = COALESCE(EXCLUDED.wisdom, <domain>_object_ext.wisdom),       -- BOOLEAN false 로 덮힘
  strength    = COALESCE(EXCLUDED.strength, <domain>_object_ext.strength),   -- NUMERIC 0.5 로 덮힘
  metric_type = COALESCE(EXCLUDED.metric_type, <domain>_object_ext.metric_type);

-- ✅ NOT NULL DEFAULT 컬럼은 모두 CASE WHEN, NULL 허용 컬럼만 EXCLUDED COALESCE
INSERT INTO <domain>_object_ext (object_id, wisdom, strength, metric_type)
VALUES (p_object_id, p_wisdom, p_strength, p_metric_type)
ON CONFLICT (object_id) DO UPDATE SET
  wisdom      = CASE WHEN p_wisdom   IS NULL THEN <domain>_object_ext.wisdom   ELSE p_wisdom   END,
  strength    = CASE WHEN p_strength IS NULL THEN <domain>_object_ext.strength ELSE p_strength END,
  metric_type = COALESCE(EXCLUDED.metric_type, <domain>_object_ext.metric_type);
```

**규칙 (Mercury 17차 일반화)**:
- **NOT NULL DEFAULT 컬럼** (모든 타입 — BOOLEAN/NUMERIC/INTEGER/TEXT NOT NULL/...) → `CASE WHEN p_x IS NULL THEN <table>.x ELSE p_x END`
- **NULL 허용 컬럼** (TEXT/JSONB/TIMESTAMPTZ nullable 등) → `COALESCE(EXCLUDED.x, <table>.x)` 그대로 OK

**적용 도메인**:
- enroute (wisdom BOOLEAN) — Phase 4-A 검증 통과
- rootric (strength NUMERIC, is_key BOOLEAN) — Phase 3-B 검증 통과 (2026-04-30, 10/10 PASS)
- plott — NUMERIC/BOOLEAN ext 컬럼 사용 시 처음부터 CASE WHEN 패턴 적용 권장 (예: `is_official BOOLEAN NOT NULL DEFAULT false`, `confidence NUMERIC NOT NULL DEFAULT 0.5`)

### A.7 `created_origin TEXT vs JSONB` 가정 충돌 → 옵션 A 패턴 채택

코어 `0001_core.sql` 은 `created_origin TEXT NOT NULL CHECK (...)`. plugin 사전 박스 (`docs/phase4-plan.md`) 에서 `created_origin->>'user_id'` (JSONB) 로 RLS 작성 시 syntax error.

→ **옵션 A** (별도 `created_by UUID` 컬럼 ALTER TABLE) 채택. 가이드 §0-pre.3 결정 #1 그대로.

plott / rootric 도 처음부터 `created_by` 패턴 채택 권장. `created_origin` 은 코어 출처 분류 컬럼 (TEXT) 그대로 둠.

### A.8 hooks signature 가 client 인자 못 받음 → 팩토리 패턴

`CoreHooks.onAttributeWrite?(attr)` signature 단일 인자. RPC 호출에 `SupabaseClient` 가 필요한데 hook 자체엔 들어갈 자리 없음.

→ **팩토리 패턴** (가이드 §0-pre.3 결정 #3). `makeOnAttributeWrite(client)` 가 closure 로 client 캡처 후 hook signature 함수 반환.

코어 hook signature 변경 X (모든 도메인 plugin 이 같은 패턴 채택).

### A.9 smoke 모듈 resolution — `ERR_PACKAGE_PATH_NOT_EXPORTED`

`npx tsx packages/wiki-plugin/scripts/smoke-crud.ts` 실행 시 `Cannot find module '@<domain>/wiki-plugin'` 또는 `ERR_PACKAGE_PATH_NOT_EXPORTED`.

→ smoke 파일을 plugin 폴더 안에 두고 `../src/...` 상대 import. plugin 내부에서:

```bash
cd packages/wiki-plugin
npx tsx scripts/smoke-crud.ts
```

### A.10 코어 API 시그니처는 *코드를 읽고* 검증

사전 박스가 `explainClassification → {layer, reasons: []}` 가정했으나 실제 구현은 `{layer, matchedRule: string}`. smoke test 작성 시 가정 기반이면 첫 실행 시 깨짐.

→ smoke / 통합 테스트 작성 시 코어 패키지 dist (또는 src) 직접 확인 후 작성.

### A.11 (a) submodule 환경 — `workspace:*` 가 npm 에서 fail (Mercury 14차 박제 — 로고스 발견)

**증상**: rootric 합류 첫 시도 (`git submodule add` + `npm install`) 시:
```
npm error EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:*
```

**원인**: wiki-core 의 `packages/{storage,router,renderer}/package.json` dependencies 에 `"@wiki-core/core": "workspace:*"`. npm 이 `workspace:` protocol 모름 (pnpm/yarn berry 전용). file: dep 가 vendor/wiki-core/packages/storage 같은 monorepo 디렉토리 가리키면, 거기 package.json 의 workspace:* 도 npm 이 해석 시도 → fail. postinstall 도달 X.

**enroute 가 회피한 이유**: (b) sibling pnpm workspace 환경 — wiki-core/packages/* 와 enroute-plugin 이 같은 pnpm root. workspace:* 가 정상 동작 (pnpm magic). (a) 환경 검증 X.

**해결 — `pack:dist` 패턴** (가이드 §0-pre.1 (a) submodule 박스 참조):
- wiki-core 루트에 `pnpm pack:dist` script (Mercury 14차) — `pnpm pack` 4회 실행 → `dist-tarballs/wiki-core-*-0.1.0.tgz` 4종 출력. `workspace:*` 가 publish 시점 `0.1.0` 으로 자동 변환됨.
- rootric `package.json` postinstall 에 `pnpm pack:dist` 추가 — submodule 안에서 매번 자동 실행.
- rootric `dependencies` 4종 → `file:./vendor/wiki-core/dist-tarballs/wiki-core-<pkg>-0.1.0.tgz` (npm 호환).

**검증** (Mercury 14차):
- (b) pnpm sibling — `workspace:*` 그대로. `pnpm install` + `tsc -b` 통과 (회귀 0건).
- pack:dist — 4 .tgz 생성. `wiki-core-storage-0.1.0.tgz/package/package.json` 의 `dependencies."@wiki-core/core"` = `"0.1.0"` 자동 변환 확인.
- (a) npm submodule — 로고스 측 재시도로 검증 (Mercury 14차 commit push 후).

**대안 거부**:
- `workspace:*` → `file:../core` 한 줄 변경 (옵션 B): pnpm sibling 환경에서 *workspace member 인식* 깨질 가능성 — workspace:* 는 magic 한 sibling 참조, file:../core 는 외부 디렉토리. 회귀 위험.
- 코어 패키지 dependencies 직접 변경 (옵션 D): semver 영향 + (b) 환경 비효율. 거부.

### A.12 chicken-and-egg — npm install 의존성 해결 vs postinstall 시점 (Mercury 15차 박제 — 로고스 발견)

**증상**: rootric Phase 1+2 합류 첫 시도 (Mercury 14차 patch 적용 후), `npm install` 실행 시:
```
ENOENT: no such file or directory, open '...wiki-core-core-0.1.0.tgz'
```

**원인**: npm install 의 의존성 해결 단계 → postinstall 실행 단계. `file:./vendor/wiki-core/dist-tarballs/wiki-core-core-0.1.0.tgz` 해결이 의존성 해결 단계인데, .tgz 는 그 이후 postinstall 에서 생성. 의존성 해결 시점에 .tgz 부재 → fail.

**Vercel 영향**: 매 build 가 clean clone — git submodule fetch 후 `npm install` 첫 실행. 동일 chicken-and-egg → Vercel critical path 차단.

**해결 — preinstall 패턴**: postinstall → **preinstall** 전환. preinstall 은 의존성 해결 *전* 실행 → vendor/wiki-core 안에서 `pnpm install + build + pack:dist` → .tgz 4종 출현 → 그 후 npm 의존성 해결이 file:.tgz 정상 해석.

**rootric `package.json`** (가이드 §0-pre.1 (a) submodule 박스 정정 형태):
```json
{
  "scripts": {
    "preinstall": "node scripts/build-wiki-core.mjs"
  }
}
```

`scripts/build-wiki-core.mjs` 코드는 가이드 §0-pre.1 참조.

**검증** (Mercury 15차):
- rootric Phase 1+2 첫 수동 빌드 우회 (preinstall 도입 전): `cd vendor/wiki-core && npx pnpm@9 install + build + pack:dist` → 그 후 `npm install` 정상 (rootric `7988da09`).
- 정정 형태: preinstall 자동 처리 — Vercel + 로컬 양쪽 자동.

**대안 거부**:
- 첫 수동 빌드 박스만 (preinstall 없음): rootric 로컬 OK 단 Vercel 매 build 차단. critical path 미해소.
- dist-tarballs/ git 추적: bin file commit + repo 비대. 거부.
- pre-publish 별도 release 채널: complexity 과도. 가이드 단순성 위반.

### A.13 corepack EPERM — Windows + Program Files Node 권한 이슈 (Mercury 15차 박제 — 로고스 발견)

**증상**: rootric 첫 수동 빌드 시도:
```
$ corepack enable
Internal Error: EPERM: operation not permitted, open 'C:\Program Files\nodejs\pnpm'
```

**원인**: Windows 에서 Program Files 경로 설치된 Node 는 admin 권한 없이 corepack 이 pnpm shim 을 write 못함. 사용자 경로 설치 또는 admin 권한 필요. Vercel 환경에서도 corepack 활성화 단계가 *환경 의존성* 추가 — 안 쓰는 게 안전.

**해결**: `npx -y pnpm@9 ...` 직접 호출. corepack enable / prepare 단계 제거.

**가이드 §0-pre.1 (a) submodule postinstall 명령 정정**:
- 이전 (Mercury 14차): `corepack enable && corepack prepare pnpm@9 --activate && pnpm install ...`
- 정정 (Mercury 15차): `npx -y pnpm@9 install --frozen-lockfile && npx -y pnpm@9 build && npx -y pnpm@9 pack:dist`

**Trade-off**:
- 장점: corepack 의존 제거 (Windows 권한 / CI / Vercel 호환성 향상)
- 단점: npx 호출 매번 pnpm@9 캐시 hit 검사 (~수초 오버헤드) — 무시 가능

---

**작성 — 2026-04-28 (Mercury 7차) / enroute precedent 박스 + 트랩 5종 추가 — 2026-04-30 (Mercury 12차) / A.11 + §0-pre.1 (a) submodule 박스 추가 — 2026-04-30 (Mercury 14차) / A.12·A.13 + (a) submodule 박스 정정 (preinstall + npx pnpm) — 2026-04-30 (Mercury 15차)**
**다음 액션**: rootric Phase 3 진입 — hooks 본체 5종 + storageRouter + router-tiers + ingest + smoke + Vercel 배포. plott 합류는 rootric 검증 통과 후.
