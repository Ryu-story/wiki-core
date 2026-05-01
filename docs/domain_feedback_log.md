# 도메인 owner 피드백 로그

> 머큐리가 wiki-core 결정 박제 후, 3 도메인 owner의 검증·이의·보완 의견을 시간순으로 누적한다.
> 에드워드 경유로 도착한 텍스트만 박제 (행동 원칙 #4 — 머큐리는 도메인 owner와 직접 대화 X).
>
> **작성자**: 머큐리
> **위치**: 도메인 owner 자기 일관성 truth는 *각자 repo의 CLAUDE.md "마지막 세션 정보"*. 이 파일은 머큐리 측 수렴 기록.

---

## Phase 2 (plugin 모델 결정) 검증 — 2026-04-28

### 입력

머큐리 1차 종결(2026-04-27) commit `d3ca7c8`(`docs/abstraction_decision.md`) + `e570433`(`docs/edward_collaboration.md`) push 후, 에드워드가 3 도메인 owner에게 동일 안내 전달:

> 정독: §0 → §7 → §4.3 → §2
> 박제: 본인 repo CLAUDE.md "마지막 세션 정보" 1-3줄
> 안 해도 되는 것: 코어 인터페이스 변경 요청 / 도메인 owner 간 직접 합의

### 응답 누적 (Mercury 2차)

| 도메인 | 페르소나 | 검증 | 보완 의견 |
|---|---|---|---|
| rootric | 로고스 | ✅ plugin 모델 OK. §4.3 9 책임 모두 매핑 가능 | §5 #4 noiseFilter 코어 유지 권장 — DART HTML 노이즈 多, plugin 재구현 낭비 |
| enroute | 루터 | ✅ plugin 모델 OK. Multi-storage 1급 / WikiAccessControl trivial / Tier 0~4 / label_set "enroute_origin" 모두 자연 매핑 | 없음 (메모: C/A/O 3층 4요소 매핑은 Phase 4 plugin 작업 — 코어 이슈 X) |
| plott | 플로터 | ✅ plugin 모델 OK. §4.3 plott 컬럼 5종 모두 코어 hook 흡수 (WikiAccessControl/validateObjectType/provenanceExtension/labelRouter/StorageRouter) | 없음 |

→ **3 도메인 모두 plugin 모델 + 9 결정 + 부록 A 4항 검증 통과**.

### 머큐리 단독 결정

#### §5 #4 noiseFilter — C안 (코어 hook + 공통 헬퍼) 확정

**결정**: noiseFilter는 코어 hook 인터페이스 + `@wiki-core/core/utils/noise.ts` 공통 헬퍼 카탈로그 4종. 도메인 특수 룰은 plugin.

| 영역 | 책임 |
|---|---|
| 코어 | `noiseFilter(text) → boolean` hook 인터페이스 |
| 코어 헬퍼 | HTML strip / 짧은 길이 / CSS 패턴 / 빈 줄 (4종) |
| Plugin | 도메인 특수 룰 (DART HTML 정규식 / URL 토큰 / 약사 인사말 등). 헬퍼 import는 자유 |

**3안 비교 + C 채택 근거**:

| 안 | 내용 | 평가 |
|---|---|---|
| A. 완전 plugin (1차 잠정) | hook도 plugin, 코어 모름 | ❌ 로고스 우려 정당 — HTML strip 같은 공통 메커니즘 재구현 낭비 |
| B. 코어가 룰까지 박음 | default noise 룰 제공 | ❌ 도메인마다 noise 정의 다름 (plott 약사 인사말 ≠ enroute URL 토큰 ≠ rootric CSS) |
| **C. 코어 hook + 헬퍼** ✅ | 메커니즘 코어 / 룰 plugin | 채택 — 다른 8 결정과 패턴 일관 ("코어로 묶을 수 없는 영역 → hook + plugin이 정책") |

**도메인 owner 의견 처리**:
- 로고스 "코어 유지 권장 (DART HTML 재구현 낭비)" → **부분 채택**. 메커니즘 코어 / 룰 plugin 분리로 재구현 낭비 해결. DART 특수 정규식은 `@rootric/plugin` 자체 책임.
- 루터·플로터 무이의 → C안에 부담 신호 없음 간접 확인.

**박제 위치**: `docs/abstraction_decision.md` §5 #4 (잠정 → 확정 갱신). `packages/core/SPEC.md` 헬퍼 카탈로그 정의.

---

## 통보 메시지 (Mercury 2차 종결 시점 에드워드가 3 도메인 owner에게 전달)

```
[wiki-core 머큐리 → 3 도메인 owner]

§5 #4 noiseFilter 결정: C안 (코어 hook + 공통 헬퍼) 확정 박제 완료.
https://github.com/Ryu-story/wiki-core/blob/main/docs/abstraction_decision.md
(§5 #4 + packages/core/SPEC.md 의 noiseFilter 섹션 참조)

▶ 코어 책임
- noiseFilter(text) hook 인터페이스
- @wiki-core/core/utils/noise.ts 헬퍼 4종 (HTML strip / 짧은 길이 / CSS 패턴 / 빈 줄)

▶ Plugin 책임
- 도메인 특수 룰 (DART HTML 정규식 / URL 토큰 / 약사 인사말 등)
- 헬퍼 import는 자유 (안 써도 OK)

@로고스 — 의견 "코어 유지 권장 (DART HTML 재구현 낭비)" 부분 채택. 메커니즘 코어 / 룰 plugin 분리로 재구현 낭비 해결.
```

---

## Phase 3 코어 SPEC 검증 — 2026-04-28 (Mercury 3차)

### 입력

Mercury 2차 종결(2026-04-28) commit `1f8fd02`(`packages/core/SPEC.md`) + `9663db1`(`docs/edward_collaboration.md`) push 후, 에드워드가 3 도메인 owner 에게 동일 안내 전달:

> 정독 우선순위: §0~§2 (모두) → §3.1 noiseFilter 헬퍼 분리선 → §4.1 WikiAccessControl + ScopeRef → §4.2 StorageRouter.resolve() → §5 Plugin Manifest → 부록 (rootric 가설 코드)
> 박제: 본인 repo CLAUDE.md "마지막 세션 정보" 1-3줄 — "코어 SPEC OK" 또는 구체 이의

### 응답 누적

| 도메인 | 페르소나 | 검증 | 핵심 신호 |
|---|---|---|---|
| rootric | 로고스 | ✅ | 1차 noiseFilter 의견 채택 확인. §부록 가설 코드 명세서 §1.1-1.4 + §7.1 자연 매핑. 이의 0건. |
| plott | 플로터 | ✅ | §4.1 ScopeRef로 5단계 가시성+scope_id+역할매트릭스 매핑 충분 (★ 가장 부담 큰 영역 통과). §3.1 약사 도메인 룰은 plugin combine 으로 흡수. §4.2 drug_master sync 별도 adapter 분리 가능. |
| enroute | 루터 | ✅ | §4.2 StorageRouter.resolve() 권장 예시가 enroute multi-storage(시트=Trade Event / sqlite_local=C 레이어 / Postgres=일반) 그대로 반영. §4.1 trivial · §3.1 헬퍼 4종 · §5 Plugin Manifest 모두 정합. |

→ **3 도메인 모두 packages/core/SPEC.md 1차 통과. 코어 보완 요청 0건.** storage/router/renderer SPEC 진입 안전 확보.

### 머큐리 결정

- 추가 단독 결정 없음 — 코어 SPEC 그대로 stable.
- Mercury 3차 본격 진입 — `packages/storage/SPEC.md` + `packages/router/SPEC.md` + `packages/renderer/SPEC.md` 3 SPEC 묶음 작성.

---

## Phase 3 잔여 SPEC (storage/router/renderer) 검증 — 2026-04-28 (Mercury 4차 진입 전)

### 응답 누적

| 도메인 | 페르소나 | 검증 | 핵심 신호 |
|---|---|---|---|
| rootric | 로고스 | ✅ | 명세서 §5.1·§7.1·§8.3 + 30차 결정 4건 모두 수용. 보완 1건은 plugin 자체 컴포넌트 영역 (코어 변경 X). |
| enroute | 루터 | ✅ | Storage §3.1 resolver(시트=Trade·sqlite=C·postgres=일반), Router §3.3 5 tier(T4_local_forced sensitivity==='C', cloud_forbidden:true), Renderer 4 컴포넌트 + Constellation 자유 조합 모두 wiki_requirements.md 와 동형. (메모: isCLayer(target) 분류기는 Phase 4 plugin 책임 — 이미 SPEC §3.1 plugin 책임 박제) |
| plott | 플로터 | ✅ | plott 패턴(drug_master_view resolver / 4 Tier WARNING selector / VisibilityBadge wrapping) 모두 §3.1·§3.2·§4.2 직접 예시 박제 확인. **기존 wiki 4 테이블(`wiki_pages`/`wiki_links`/`wiki_versions`/`wiki_embeddings`) → 4요소 + plott_*_ext 매핑 가능** (Phase 4 마이그레이션 가이드 박제 활용). |

→ **3 도메인 모두 storage/router/renderer SPEC 통과. 이의 0건. 코어 보완 요청 0건.** Phase 3.5 코드 작성 + pnpm 셋업 진입 동의 명시.

---

## Phase 3.5 1차 — pnpm 셋업 + `@wiki-core/core` 코드 박제 — 2026-04-28 (Mercury 4차)

### 머큐리 단독 작업 (도메인 입력 없음)

- pnpm workspaces 모노레포 셋업 — `pnpm-workspace.yaml` + 루트 `package.json` + `tsconfig.base.json` + `.gitignore`
- `packages/core/` — `package.json` + `tsconfig.json` + 8 src 파일
- 코드 박제 내용:
  - `src/types.ts` — 4요소 + 보조 슬롯 + 기본 타입 (ID / ISOTimestamp / JSONValue / CreatedOrigin / Directionality / TargetKind)
  - `src/access.ts` — ActorContext / TargetRef / ScopeRef / WikiAccessControl
  - `src/hooks.ts` — CoreHooks (5 기본 hook)
  - `src/storage-router.ts` — StorageAdapter / StorageRouter / QueryFilter / AdapterCapabilities (인터페이스만, 구현은 `@wiki-core/storage`)
  - `src/utils/noise.ts` — stripHtml / isTooShort / matchesCssNoise / isBlankOrWhitespace / combine (predicate or-chain)
  - `src/plugin.ts` — WikiPlugin / LabelSet / validatePlugin / registerPlugin (현재 manifest 검증 + storageRouter 필수 체크. WikiCore 본체 구현은 Mercury 5차)
  - `src/index.ts` — public surface export
- TypeScript typecheck 통과 (strict + noUncheckedIndexedAccess + verbatimModuleSyntax)
- SPEC 부록 정정 — `packages/core/SPEC.md` §3.1 + 부록 rootric 가설 코드: `combine` 사용 패턴을 코드 일관 형태로 (stripHtml 은 transform → predicates chain 사전 처리)

### 머큐리 결정

- `registerPlugin` 1차 시그니처: `(plugin: WikiPlugin) => { plugin: WikiPlugin }` (manifest 검증 + storageRouter 필수). SPEC §5 의 `WikiCore` 반환은 Mercury 5차 storage 합류 후.
- `LabelSet` 타입 신설 — SPEC §5 `labelSets: Array<{id; labels[]}>` 인라인 → 명시적 타입.
- 도메인 어휘 0건 — 코어 코드 일체에 stock/drug/vision 등장 X (행동 원칙 #1 정합).

---

## @wiki-core/core 1차 코드 검증 — 2026-04-28 (Mercury 5차 진입 전)

### 응답 누적

| 도메인 | 페르소나 | 검증 | 핵심 신호 |
|---|---|---|---|
| rootric | 로고스 | ✅ | type surface 6 파일 모두 SPEC 그대로. rootric plugin 가설 validatePlugin·registerPlugin 통과. stripHtml transform/predicate 분리 정확. ActorContext Module Augmentation으로 tester/persona_mode 5종 확장 가능. |
| plott | 플로터 | ✅ | 6 파일 plott 도메인 표현 가능. Module Augmentation 주석 박제 확인. noise §3.1 정정 stripHtml 사전 처리 패턴 확인. |
| enroute | 루터 | ✅ | enroute plugin 가설(@enroute/wiki-plugin, objectTypes 12종, labelSets enroute_origin+enroute_sensitivity, accessControl trivial+storageRouter) validatePlugin 통과 가능. ActorContext trivial이라 미사용. dropPredicate(stripHtml(text)) 패턴 확인. (메모: registerPlugin storageRouter 필수 강제 — Mercury 5차 합류 후 실제 등록 가능) |

→ **3 도메인 모두 코어 1차 코드 통과. 코어 보완 요청 0건.** Mercury 5차 storage + WikiCore 본체 진입 동의 명시.

---

## Phase 3.5 2차 — @wiki-core/storage 코드 + WikiCore 본체 박제 — 2026-04-28 (Mercury 5차)

### 머큐리 단독 작업 (도메인 입력 없음)

- `packages/storage/` 패키지 셋업 + 코드 박제:
  - `src/postgres.ts` — PostgresAdapter 클래스 (4요소 + 보조 슬롯 CRUD + query). `pg` 모듈 직접 import 안 함 — `DbClient` 인터페이스로 추상화. plugin 이 `pg.Pool` / Supabase client 를 wrap.
  - `src/router.ts` — `createStorageRouter` helper. `adapter` / `byKind` / `resolver` 3 옵션. resolver 우선순위 가장 높음.
  - `src/migrations/0001_core.sql` — 4요소 + 보조 슬롯 6 table + index
  - `src/migrations/0002_rls.sql` — RLS defense-in-depth (plugin 이 자체 정책으로 강화)
  - `src/index.ts` — public surface
- `packages/core/src/wiki-core.ts` — WikiCore 본체:
  - 4요소 CRUD (create / get / update / delete) + 보조 슬롯 CRUD (Provenance / Label) + scopes
  - Hook chain — validateObjectType (Object create/update) / onAttributeWrite (Attribute create) / provenanceExtension (Provenance create)
  - Access control wrapping — checkRead / checkWrite (모든 CRUD)
  - Storage routing — `target.id === '_new'` convention (create 시) + plugin resolver/byKind/adapter fallback
- `packages/core/src/plugin.ts` 갱신 — `registerPlugin` → `WikiCore` 반환 (Mercury 4차 placeholder 형태 → 본체)
- `packages/core/src/index.ts` 갱신 — `WikiCore` / `createWikiCore` export
- TypeScript Project References 셋업 — 루트 `tsconfig.json` (composite + references) + 각 패키지 `composite: true` + `paths` mapping. `tsc -b` build mode 통과 (에러 0건).

### 머큐리 단독 결정

- `target.id === '_new'` magic — create 시점 router resolve convention. plugin resolver 가 인지하지 못하면 byKind / adapter fallback (createStorageRouter helper 가 처리).
- Relation create 시 양쪽 object write 권한 검증 (from + to). Event create 시 첫 object 만 검증 (다수 object 영향 시 plugin wrapping).
- deleteLabel 1차 — access control 없이 단순 delete (label row 의 target 알아야 하므로 추후 보강 후보).
- Storage SPEC §2 정정 — `Pool` (pg 직접 import) → `DbClient` (추상 인터페이스). Plugin 사용 예 박제 (pg.Pool wrap).

---

## storage + WikiCore 본체 검증 — 2026-04-28 (Mercury 5차 종결 후)

### 응답 누적

| 도메인 | 페르소나 | 검증 | 보완 의견 |
|---|---|---|---|
| rootric | 로고스 | ✅ | (1) DbClient wrap on Supabase 합류 가이드에 박스 필요 (rootric 은 supabase-js 만, pg/postgres.js 신규 의존성). (2) deleteLabel 인터페이스 누락 의도 확인. (3) `CREATE POLICY IF NOT EXISTS` PG 16+ 한정 → Supabase 15.x 깨짐, DROP+CREATE 패턴 권장. |
| plott | 플로터 | ✅ | ① WikiCore.deleteLabel 부재 (adapter 직접 호출 시 access control 우회). ② createEvent 가 object_ids[0] 만 checkWrite (Regulation event 멀티 타겟 권한 누수). |
| enroute | 루터 | ✅ | WikiCore.deleteLabel(id, actor) 인터페이스 누락 — 재분류 use case 에서 plugin 이 adapter.deleteLabel 직접 호출 시 access control 우회. (메모: `CREATE POLICY IF NOT EXISTS` PG 15+ 만, DROP POLICY IF EXISTS + CREATE 권장 — plugin 측 idempotency.) |

→ **3 도메인 모두 storage + WikiCore 본체 통과**. 보완 4건 cross-validate (3 도메인 합의 1건 + 단일 도메인 3건).

### 머큐리 단독 결정 — 보완 4건 모두 채택

| # | 보완 | 출처 | 결정 |
|---|---|---|---|
| 1 | **WikiCore.deleteLabel 인터페이스 누락** | 플로터 + 루터 + 로고스 (3 도메인 합의) | ✅ 즉시 추가 — `deleteLabel(id, actor)`. 구현: PostgresAdapter `getLabel(id)` 보강 → WikiCore 가 label.target read → checkWrite → adapter.deleteLabel. Mercury 5차 본체 작성 시 누락 (의도 X). |
| 2 | **createEvent multi-target 권한 누수** | 플로터 | ✅ 즉시 보강 — 모든 object_ids 에 checkWrite (보수적). plugin 이 우회 필요 시 자체 `canWrite` 에서 결정 가능. |
| 3 | **CREATE POLICY IF NOT EXISTS PG 15.x 미지원** | 로고스 + 루터 | ✅ 즉시 정정 — `DROP POLICY IF EXISTS …; CREATE POLICY …;` 패턴 (idempotent). Supabase 15.x 호환. |
| 4 | **Supabase DbClient wrap 박스** | 로고스 | storage SPEC §2 박스 즉시 추가 (postgres.js / supabase RPC 옵션) + Phase 4 합류 가이드에 본격 박스 (Mercury 6차+). 코어 변경 없음. |

### 박제 시점

Mercury 6차 첫 작업으로 patch 박제 완료 — commit `2a9b65f` (5 파일 / +100 / -19, tsc -b 통과). 4건 모두 적용:
- #1 WikiCore.deleteLabel + StorageAdapter.getLabel — `wiki-core.ts` / `storage-router.ts` / `postgres.ts`
- #2 createEvent 모든 object_ids checkWrite — `wiki-core.ts`
- #3 0002_rls.sql DROP POLICY IF EXISTS + CREATE 패턴 (12 정책)
- #4 storage SPEC §2 DbClient wrap 옵션 박스 (pg / postgres.js / Supabase RPC) — Phase 4 가이드 본격 박스는 별도

router/renderer 코드 박제는 patch 도메인 검토 통과 후 진입.

---

## patch 4건 검토 결과 — 2026-04-28 (Mercury 7차 진입)

### 응답 누적

| 도메인 | 페르소나 | 검증 | 핵심 신호 |
|---|---|---|---|
| plott | 플로터 | ✅ | #2 직접 영향 — Regulation event admin 발행 표준, 권한 누수 방지가 본질. 부분 성공 필요 시 클라이언트 사전 권한 필터링 후 object_ids 전달 패턴 OK. 완화 요청 없음. #1 단일 Postgres 라 multi-storage 영향 없음. #3·#4 정합. 박제 commit `a217abc`. |
| rootric | 로고스 | ✅ (단 #4 ⚠️ 부분 OK) | #1 ✅ 잘못 분류 정정 케이스. #2 ✅ supplies_to·competes_with 정합 (보수적 OK, plugin 자체 canWrite 우회 가능). #3 ✅ Supabase 15.x 호환. **#4 ⚠️ 옵션 C (Supabase RPC) "옵션 존재만 명시" 상태라 현재 §2 박스만으로는 plugin 코드 시작 불가**. 코어 인터페이스 변경 없음 인지. **Phase 4 합류 가이드 본격 박스 = rootric 합류의 critical path**. |
| enroute | 루터 | ✅ | #1 multi-storage 순회 정합 — UUID v7 글로벌 고유 + 최악 3 round-trip 허용 가능. #3 PG 9.1+ idempotent + Supabase 15.x (zeqnonlukuroexoxifem). #2 Container↔Activity multi-target 보수적 OK. **#4 enroute Phase 4 plugin 작성 시 옵션 C (Supabase RPC) 우선 검토 예정** — 이미 supabase-js + service-role 인프라 갖춤, pg/postgres.js 신규 의존성 회피. 박제 commit `52049a2`. |

→ **3 도메인 모두 patch 4건 OK. 코어 인터페이스 변경 요청 0건.**

### 머큐리 단독 결정 — 다음 작업: Phase 4 합류 가이드 우선

**근거**:
- rootric: "Phase 4 합류 가이드가 차단 요인. 옵션 C RPC 패턴 정의 없으면 plugin 작성 못 시작"
- enroute: "본격 박스 Mercury 7차+ Phase 4 합류 가이드에서 받음. supabase-js 단독 환경"
- plott: 차단 요인 명시 X (router/renderer / Phase 4 가이드 모두 OK)

→ 2/3 도메인이 Phase 4 합류 가이드 = critical path 로 명시. router/renderer 코드는 plugin 합류 후 semver minor 추가 가능 (additive). 행동 원칙 #5 YAGNI — plugin 작성에 즉시 필요한 게 우선.

### Phase 4 합류 가이드 신규 산출물 후보 (Mercury 7차)

산출물 위치 후보: `docs/phase4_plugin_guide.md` 또는 `packages/core/PLUGIN_GUIDE.md` (Phase 4 진입 시 결정).

핵심 박스:
1. **plugin manifest boilerplate** — 4요소 type 카탈로그 + 5 hook + storageRouter + labelSets
2. **Supabase RPC wrap 본격 박스** ★ rootric + enroute critical path
   - `wiki_query` Postgres function 정의 (security definer / params binding)
   - supabase-js 호출 패턴 (`.rpc()` 또는 PostgREST 우회)
   - service-role vs anon-key 가이드 + RLS 상호작용
3. **기존 schema 마이그레이션 가이드** — ★ plott wiki 4 테이블(`wiki_pages`/`wiki_links`/`wiki_versions`/`wiki_embeddings`) → 4요소 + `plott_*_ext` 매핑 케이스
4. **ingest 파이프라인 boilerplate** — `noiseFilter` → sensitivity 분류 → router → adapter (Mercury 5차 미해결 후보)
5. **검증 체크리스트** — plugin이 코어 hook·label_set·storage adapter 모두 구현했는지

---

## Phase 4 가이드 검증 결과 — 2026-04-28 (Mercury 8차 진입)

### 응답 누적

| 도메인 | 페르소나 | 검증 | 핵심 신호 |
|---|---|---|---|
| plott | 플로터 | ✅ | §3.2 plott wiki 4 테이블 매핑 plott Phase 4 plugin 시작점 충분. §1.4 accessControl 5단계 가시성+scope_id+역할매트릭스 정합. pgvector → `plott_attribute_ext` + `onAttributeWrite` hook + `ON CONFLICT UPDATE` OK. 코어 인터페이스 보완 요청 0건. |
| rootric | 로고스 | ✅ critical path 완전 해소 | §2 SupabaseAdapter 자체 빌드 + service-role/anon-key + RLS 2중 게이트 + RPC 트랜잭션 — 모두 rootric 환경 정합. **6차 #4 보완이 본격 박스로 완전 마무리, rootric plugin 코드 시작 가능 상태**. §3 rootric 영향 적음 (신규 합류, 기존 wiki 테이블 없음). 다음: router/renderer 코드 박제 후 enroute plugin 작성 진입. |
| enroute | 루터 | ✅ critical path 해소 | §2 SupabaseAdapter Next.js API routes + service-role 정합. multi-storage (시트 / sqlite_local / postgres) 자체 빌드 패턴 동일 적용 가능. §4.3 sensitivity 분류기 (A/B/C + C → Tier 4) "민감도 3계층 라우팅" 그대로. 박제 commit `2142f60`. **합류 시점 제약 — Phase 3-A 검증 데이 5일치 통과 후 (2026-05-04 이후)**. 현재 04-28 검증 데이 2일차. |

→ **3 도메인 모두 Phase 4 가이드 OK. 코어 인터페이스 보완 요청 0건.**

### 합류 순서 합의 — enroute → rootric → plott

3 도메인 모두 §6 머큐리 추천 동의.
- enroute 1차 (trivial accessControl + Phase 3-A 검증 통과 후 = 05-04 이후)
- rootric 2차 (멀티유저 SaaS, SupabaseAdapter 자체 빌드 검증)
- plott 3차 (5단계 가시성 + scope_id, 가장 복잡)

### 메모 2건 — 머큐리 결정: 가이드 변경 X (plugin 자유 영역)

| 메모 | 출처 | 머큐리 결정 |
|---|---|---|
| §1.4 accessControl `ownsTarget` 표현이 rootric 자동 ingest 환경에 어색 (Wiki 공개·편집 admin/service-role 한정 패턴) | 로고스 | 가이드 변경 X. 도메인 owner 명시 "plugin 자유 정의 영역". §0.2 일반 원칙(plugin 이 안 해도 되는 것)으로 박제됨. |
| §3.4 `enroute_attribute_ext.sensitivity_layer` 가 ext attr vs `enroute_sensitivity` labelSet 둘 다 옵션 (plugin 자유 선택) | 루터 | 가이드 변경 X. 동일 사유. enroute manifest 가설은 labelSet 으로 갈 가능성 높음 (plugin 자체 빌드 영역). |

### 머큐리 단독 결정 — Mercury 8차 본 작업: router/renderer 코드 박제

**근거**:
- 3 도메인 합류 순서 (enroute → rootric → plott) 합의
- enroute 합류 가능 시점 = 2026-05-04 이후 (약 1주 여유)
- 로고스 명시: "router/renderer 코드 박제 후 enroute plugin 작성 진입"
- 루터 명시: "Mercury 8차+ router/renderer 코드 도착 시 합류 작업 중 통합"

→ 1주 여유 안에 router/renderer 코드 박제 → enroute 합류 (05-04 이후) 시 통합. 행동 원칙 #5 YAGNI 정합 (즉시 필요한 게 우선).

---

## router 코드 검증 결과 — 2026-04-28 (Mercury 9차 진입)

### 응답 누적

| 도메인 | 페르소나 | 검증 | 핵심 신호 |
|---|---|---|---|
| plott | 플로터 | ✅ 100% 정합 | SPEC §3.2 가설 코드 (4 tier, T3 selector `hints?.label_candidate === 'WARNING'` + `meta.requires_human_confirm`) 와 createRouter 구현 100% 일치. WARNING 거짓음성 0% plugin selector 레벨 enforce 충분. 코어 변경 요청 X. |
| rootric | 로고스 | ✅ (단 1건 보완 의견) | createRouter 시그니처 SPEC §3.1 정확 일치. RouterTier 구조 그대로 매핑. T3 fallback (`selector: () => true`) NoTierMatch 회피 정합. ModelHandle wrap 가능 (현재 `lib/factsheet/ai.ts callAI()` 구조와 매우 유사 — Tier wrap trivial). budget_hook 월 $10 throw 정합. **보완 의견**: Budget window reset 메커니즘 미명시 — singleton 캐시 시 영원 누적 트랩. *이번 변경 요청 X* (가이드 박제로 충분). |
| enroute | 루터 | ✅ | T4_local_forced 가설 정합 (`sensitivity === 'C'` selector + `meta.cloud_forbidden: true` + `ModelCapabilities.local`). privacy-filter → sensitivity 흐름 §4.3 그대로. NoTierMatch 우려 발생 없음 (T3 ≠C / T4 ===C 분기로 항상 hit). multi-storage 와 router 독립 layer 충돌 X. 행동 원칙 #1 정합 (도메인 어휘 0건). 박제 commit `9584dc0`. |

→ **3 도메인 모두 router 코드 OK. 코어 인터페이스 변경 요청 0건.**

### 머큐리 단독 결정 — `Router.resetBudget()` 추가 (semver minor additive, 부분 채택)

**로고스 의견 처리**:
- 의견 "변경 요청 X (plugin README 자체 박제로 충분)" — *변경 거부* 부분 받아들임
- 단 **머큐리 자체 판단**으로 *방어적 추가* 결정 — `Router.resetBudget(newWindowStart?: string): void` 메서드 1개 노출 (semver minor additive)

**근거**:
1. 로고스 명시 트랩 — plugin singleton 캐시 시 budget 영원 누적이 *실제 발생 가능*. plugin 작성자가 매월 router 재생성 cron 잊으면 발생.
2. semver minor additive — 기존 plugin 호출 코드 영향 0건 (도메인 owner 부담 0).
3. `BudgetTracker.reset()` 이미 박제됨 — Router 인터페이스에 노출만 추가 (5분 작업).
4. 행동 원칙 #2 — 코어 인터페이스가 *방어적* 이어야 trap 차단 가능. plugin 책임에 모두 떠넘기는 것보다 코어가 reset 메커니즘 명시적 제공이 안전.
5. Mercury 2차 noiseFilter 패턴 동일 — 도메인 owner 의견 *부분 채택*, 머큐리 단독 결정으로 코어 design 보강.

**박제 위치**: `packages/router/src/types.ts` Router 인터페이스 / `packages/router/src/router.ts` createRouter 구현 / `packages/router/SPEC.md` §1·§2 (월별 reset 패턴 명시).

---

## Mercury 9차 검증 결과 — 2026-04-28 (Mercury 10차 진입, Phase 3.5 종결 합의)

### 응답 누적

| 도메인 | 페르소나 | 검증 | 핵심 신호 |
|---|---|---|---|
| plott | 플로터 | ✅ | (a) Router.resetBudget — budget_hook $0.5 alert + 월별 cron singleton 결합 정합. (b) renderer — `SourceCardExtension.is_official?: boolean` 명명 슬롯 + `[key: string]: JSONValue` 자유 슬롯 = plott 5단계 visibility 뱃지 wrapping (SPEC §4.2) 그대로 통과. JSX plugin 책임 OK (plott-stock Recharts 자산 활용). 코어 인터페이스 보완 요청 0건. |
| rootric | 로고스 | ✅ Phase 3.5 종결 동의 | (a) Router.resetBudget — 8차 의견 부분 채택 + 머큐리 방어적 추가 인정. SPEC §2.1 박스 자연 적용. (b) renderer — JSX plugin 책임 근거 동의 (boundary blur 회피). Next.js 14 + Recharts 자산 (PERBandChart/financial-chart) 활용 plugin 자체 빌드 부담 X. **`SourceCard.extension.strength` 명시 박제 ★** = `rootric_provenance_ext.strength` 자유 매핑. 4 컴포넌트 props rootric 도메인 정합 (시총/PER 추이 + on_point_click 출처 호출 / BU→Product→Customer + drop_isolated / 공시·리포트·뉴스 group_by='day'). |
| enroute | 루터 | ✅ | (a) Router.resetBudget — multi-tier (T0~T4) 일괄 reset 정합. Vercel cron 또는 systemd timer (Phase 3-A `enroute-kiwoom-sync.timer` 패턴 재사용). Trap 차단 박스 인지. (b) renderer — **JSX plugin 책임 결정 = enroute multi-storage backend 정합과 1:1 일치** ★ (sheets / sqlite_local / postgres 어댑터 모두 backend, 코어 backend surface 유지가 enroute 에 유리). `recharts ^3.8.1` 이미 보유 (SPEC §3 권장 표 정확). Constellation View 자유 조합 (RelationGraph radial + Timeline week + 자체 ConstellationView) 그대로 동작. 박제 commit `9822307`. |

→ **3 도메인 모두 patch + renderer OK. 코어 인터페이스 보완 요청 0건. Phase 3.5 종결 합의 박제.**

### Phase 3.5 종결 합의

| 패키지 | 상태 | 도메인 검증 통과 |
|---|---|---|
| `@wiki-core/core` | ✅ stable | Mercury 5차 storage + WikiCore 본체 검증 + Mercury 6차 patch (deleteLabel + multi-target + RLS + DbClient wrap) |
| `@wiki-core/storage` | ✅ stable | Mercury 5차 + 6차 patch |
| `@wiki-core/router` | ✅ stable | Mercury 8차 검증 + Mercury 9차 Router.resetBudget patch |
| `@wiki-core/renderer` | ✅ stable | Mercury 9차 (types + transforms, JSX plugin 책임) |

→ 코어 surface 변경 0건 상태로 첫 도메인 plugin 합류 진입 가능.

### 합류 순서 (3 도메인 합의)

| 순 | 도메인 | 진입 시점 |
|---|---|---|
| 1 | enroute | **2026-05-04 (월) 이후** (Phase 3-A 검증 데이 5일치 통과 후). 루터: "owner 가 plugin 작성 시작 신호 보내드리겠습니다." |
| 2 | rootric | enroute 1차 합류 검증 통과 후 |
| 3 | plott | rootric 2차 합류 검증 통과 후 (가장 복잡) |

---

## Mercury 11차 — link 패턴 환경 매트릭스 결정 — 2026-04-29

### 입력

루터 (enroute owner) 가 plugin 작성 진입 직전 wiki-core repo ↔ enroute repo link 방식 질문 도착 (3 옵션 — git submodule / pnpm workspace sibling / GitHub Packages publish). 머큐리 1차 권장 (b) pnpm workspace sibling. 에드워드 경유 3 도메인 owner 모두에게 동일 환경 점검 요청.

### 응답 누적

| 도메인 | 페르소나 | 패키지 매니저 | sibling | 배포 환경 | 권장 응답 |
|---|---|---|---|---|---|
| enroute | 루터 | npm → pnpm 마이그레이션 (05-04 본격 진입 직전) | 1단계 sibling ✓ (`develop/enroute/`) | 본인 PC | **(b) sibling link 채택** — 검증 데이 (04-29~05-01) 안정성 위해 마이그레이션 timing 본격 진입 직전. trap 5종 체크리스트 머큐리 박제. |
| rootric | 로고스 | npm 유지 | 부모 다름 ❌ (`c:/Users/woori/rootric/`) | **Vercel SaaS — 결정적 차단** | **(a) git submodule 채택** — Vercel 단일 root 업로드 → sibling link 빌드 시점 의존성 누락. submodule fetch 활성화 + postinstall pnpm build 패턴. (c) publish 대기는 합류 무한 지연 → 거부. |
| plott | 플로터 | pnpm (처음부터, MVP 미착수) | 2단계 sibling ✓ (`develop/plott/plott-wiki/`) | 미정 (MVP 미착수) | **(b) sibling link 채택** — 마이그레이션 0건. 2단계 sibling path (`../../wiki-core/packages/*`) 글롭 한 줄 차이. plott-wiki MVP 시작 시 pnpm 출발. |

→ **link 패턴은 plugin 환경별 결정**. 코어 surface 변경 0건. 머큐리 1차 권장 (b) 단일 권장 = enroute 환경 편향이었음. 인정 + 환경 매트릭스로 재박제.

### Mercury 11차 결정 응답 수렴 (2026-04-29)

| 도메인 | 페르소나 | 검증 | 모니터링 항목 |
|---|---|---|---|
| enroute | 루터 | ✅ trap 5종 체크리스트 인지. 05-04 마이그레이션 commit 단일 묶음 진행 예정 | 없음 |
| rootric | 로고스 | ✅ 합류 가이드 4 항목 모두 rootric 환경 정합. submodule + postinstall corepack+pnpm + file: deps + Vercel Settings 그대로 적용 가능. 합류 작업 ~30분 | **Vercel 빌드 캐시 미포함 시 첫 빌드 +30s~1m 가능** (캐시 후 영향 없음). 가이드 변경 X, 발생 시 별도 검토 |
| plott | 플로터 | ✅ 2단계 sibling glob 한 줄 차이. plott-wiki MVP 시작 시점 그대로 적용 | 없음 |

→ **3 도메인 모두 link 패턴 결정 OK. 코어 인터페이스 변경 요청 0건.** Phase 4 가이드 §0 박스 박제는 enroute 1차 합류 (b) 검증 통과 후 (Vercel 캐시 메모 함께 박제 예정).

### 머큐리 단독 결정 — 환경 매트릭스 박제

| 환경 조건 | 채택 link 패턴 | 머큐리 측 prep |
|---|---|---|
| sibling ✓ + 본인 PC/단일 컨테이너 배포 | **(b) pnpm workspace sibling link** | pnpm-workspace.yaml `'../wiki-core/packages/*'` 또는 `'../../wiki-core/packages/*'` (1/2단계 모두 OK) |
| Vercel/Cloud 단일 root 업로드 배포 (sibling 무관) | **(a) git submodule + postinstall build** | wiki-core 패키지 dist 빌드 출력 박제 (`main`/`types`/`files`) |
| Phase 5 evolution (모든 도메인) | (c) GitHub Packages publish | wiki-core CI publish 셋업 (Phase 4 종결 후) |

**1단계/2단계 sibling 둘 다 OK** 가이드 명시 (플로터 권장).

### Mercury 측 prep 작업 (rootric (a) 합류 차단 풀기)

각 wiki-core 패키지 `package.json` 박제 (semver 영향 0건, 빌드 출력 추가만):
- `"main": "./dist/index.js"` / `"types": "./dist/index.d.ts"` / `"files": ["dist"]`
- 각 패키지 `tsconfig.json` 이미 `outDir: dist`, `declaration: true` (composite 모드).

→ Mercury 11차 본 commit 에서 박제. enroute 1차 합류 (b) 검증 통과 후 별도 추가 작업 0건.

### Phase 4 가이드 박제 시점

`docs/phase4_plugin_guide.md` 신규 §0 박스 — link 패턴 환경 매트릭스 + npm→pnpm 마이그레이션 trap 5종. enroute 1차 합류 (b) 검증 통과 후 박제 (검증된 precedent 만 가이드에 박제 — 행동 원칙 #5 YAGNI).

### 합류 순서 영향 0건

enroute (b) 검증 → wiki-core dist build prep 박제 → rootric (a) submodule 검증 → plott (b) 합류. 합의 순서 (enroute → rootric → plott) 그대로.

---

## Mercury 12차 — enroute Phase 4-A 1차 합류 종결 + 가이드 §0-pre 박제 — 2026-04-30

### 입력

루터 (enroute owner) Phase 4-A 본 작성 1차 합류 종결 신호 도착 (Ryu-story/enroute commit `8817d86` push). 검증 결과 박제:

| 항목 | 결과 |
|---|---|
| pnpm workspace + sibling link | ✅ commit `de6e67a` |
| `@enroute/wiki-plugin` 사전 골격 9 파일 (link-free) | ✅ commit `2ef429f` |
| 통합 검증 smoke (manifest+sensitivity+Tier+hooks+routing+access) | ✅ 52/52 |
| SheetsAdapter JWT/fetch 본 구현 (Service Account RS256 → OAuth) | ✅ commit `05778cd` |
| 4요소 CRUD 실호출 smoke (Supabase round-trip) | ✅ 36/36 |
| RPC 4종 실호출 smoke | ✅ 8/8 |
| owner-isolation RLS (옵션 A: created_by 컬럼 + 위임 함수) | ✅ migration `enroute_plugin_0013_owner_isolation` |
| 빌드 | 0 error |
| **smoke 총합** | **96/96** |
| 코어 인터페이스 변경 요청 | **0건** |

루터 요청: Phase 4 가이드 §0 박스 갱신 (enroute precedent reference) + 트랩 1 (NOT NULL DEFAULT ON CONFLICT COALESCE 깨짐) 명시 박제 → 갱신 push 후 Edward 경유 rootric 합류 신호.

자세한 내용은 `c:/Users/woori/Desktop/개인/develop/enroute/docs/phase4-mercury-report.md` 참조.

### 머큐리 단독 결정 — Phase 4 가이드 §0-pre 박스 + 부록 A-2 트랩 5종 박제

**핵심 결정 5건 (enroute precedent → rootric/plott 기본값)**:

| # | 결정 | 박제 위치 |
|---|---|---|
| 1 | **`created_by` 컬럼: 옵션 A (코어 테이블 ALTER) ★** — RLS join 0 + 단일 패턴 + plott 5단계 가시성 확장 가능 (`circle_id` ALTER + `plott_target_visibility` 함수) | 가이드 §0-pre.3 #1 |
| 2 | SupabaseAdapter 자체 빌드 (PostgresAdapter wrap 거부) + `defaultCreatedBy` 옵션 (multi-user 도메인은 actor-aware 인스턴스 풀) | 가이드 §0-pre.3 #2 |
| 3 | hooks 팩토리 패턴 — `make<HookName>(client)` closure 로 client 주입, fire-and-forget (console.warn) | 가이드 §0-pre.3 #3 |
| 4 | RPC `SECURITY DEFINER + SET search_path = public + GRANT TO authenticated, service_role` 패턴 | 가이드 §0-pre.3 #4 |
| 5 | `source_ref` JSON 컨벤션 — `<source_kind>::<json_payload>`. 코어 schema 변경 X | 가이드 §0-pre.3 #5 |

**트랩 5종 (부록 A-2)**:

| # | 트랩 | 핵심 패턴 |
|---|---|---|
| A.6 ★ | NOT NULL DEFAULT 컬럼의 ON CONFLICT COALESCE 깨짐 (`wisdom` 사고) | NOT NULL DEFAULT 컬럼 → `CASE WHEN p_x IS NULL THEN <table>.x ELSE p_x END` / NULL 허용 컬럼만 EXCLUDED COALESCE |
| A.7 | `created_origin TEXT vs JSONB` 가정 충돌 | 옵션 A (별도 `created_by` 컬럼) 패턴 — 처음부터 채택 |
| A.8 | hooks signature 가 client 인자 못 받음 | 팩토리 패턴 (closure 주입) |
| A.9 | smoke `ERR_PACKAGE_PATH_NOT_EXPORTED` | smoke 파일 plugin 폴더 안 + `../src/...` 상대 import |
| A.10 | 코어 API 시그니처 가정 기반 작성 (`explainClassification` 사고) | smoke 작성 시 dist/src 직접 확인 |

**박제 결과**:
- `docs/phase4_plugin_guide.md` §0-pre 박스 신설 (link 매트릭스 + npm→pnpm trap 5종 + 결정 5건 + 검증 결과)
- 부록 A-2 트랩 5종 추가 (A.6~A.10)
- status: 1차 → 2차 (enroute precedent 박제)

**합류 순서 재확정**: enroute (✅ 1차 종결) → rootric (다음, (a) git submodule + 옵션 A + SupabaseAdapter + hooks 팩토리) → plott (마지막, 5단계 가시성 + scope_id (pharmacy_id, circle_id) 확장 + 2단계 sibling).

### 코어 측 보완 요청 0건 — backbone 검증 종결

enroute 측 후속 작업 (rootric/plott blocking 아님): anon-key 시뮬레이션 RLS smoke / ingestText 본 작성 (Phase 4-B) / 기존 nodes·containers·activity_logs·journal_entries → wiki_objects backfill (Phase 4-C) / legacy 테이블 archive (Phase 4-D). 코어 4 패키지 (core/storage/router/renderer) 그대로 stable.

---

## Mercury 13차 — rootric 합류 진입 신호 + 보완 의견 부분 채택 — 2026-04-30

### 입력

로고스 (rootric owner) Mercury 12차 가이드 §0-pre + 부록 A-2 검증 응답 도착 (rootric 33차 세션):

**검증 결과**: 이의 0건. §0-pre 7 패턴 + 부록 A-2 5 트랩 모두 rootric 환경 정합.

| # | 패턴 | rootric 정합 |
|---|---|---|
| 1 | (a) submodule | Mercury 11차 결정 + enroute Phase 4-A smoke 96/96 검증으로 확정 |
| 2 | created_by 옵션 A | RLS 정책 (`auth.uid()` 직접) 자연 통합 |
| 3 | SupabaseAdapter 자체 빌드 | supabase-js 단일 의존성, Next.js `cache()` request-scoped 정합 |
| 4 | hooks 팩토리 패턴 | strength·is_key·expires_at 재계산 hook 에 자연 적용 |
| 5 | RPC SECURITY DEFINER + SET search_path | Postgres 보안 정석 |
| 6 | source_ref JSON 컨벤션 | rootric source (매일경제·DART·연합뉴스) 매핑 가능 |
| 7 | rootric_target_owner STABLE 함수 | provenance/event polymorphic 참조 효율적 |

**부록 A-2 트랩**: `is_key` (NOT NULL DEFAULT BOOLEAN) 컬럼 A.6 패턴 처음부터 적용 예정. 나머지 4 트랩 모두 가이드 그대로 채택.

### 보완 의견 1건 — SupabaseAdapter cron 트리거 분기 패턴

**의견**: actor-aware 인스턴스 풀의 cron 트리거 (ingest-batch, no actor) 케이스 분기. user-scoped 캐시에 actor=undefined 들어가면 정합 깨짐. rootric IngestAdapter 에서 service-role 어댑터 별도 인스턴스로 처리 예정. plott 합류 시 admin 영역에서 동일 케이스 발생 가능.

**제안 패턴**:
```ts
function getAdapter(actor?: ActorContext): SupabaseAdapter {
  if (!actor || actor.role === 'service_role') {
    return cachedServiceRoleAdapter();
  }
  return cache(() => createUserAdapter(actor))();
}
```

### 머큐리 단독 결정 — 부분 채택 (가이드 §0-pre.3 #2 박스 갱신)

**채택**: 가이드 §0-pre.3 #2 (SupabaseAdapter) 본문에 **actor-aware 인스턴스 풀 — cron / service-role 분기 패턴** 박스 추가. 코드 예시 + 적용 영역 (ingest pipeline / admin 작업 / 일반 user) 명시.

**근거**:
1. enroute (single-user, `defaultCreatedBy` 1회) + rootric (multi-user, cron 분기) 모두 발생 → multi-user 도메인의 보편 패턴
2. plott multi-user 합류 시 admin 영역에서 동일 케이스 재발 예측 → precedent 박제 가치
3. 코어 인터페이스 변경 X (plugin 영역 가이드 박스 추가만) — semver 영향 0건
4. Mercury 9차 Router.resetBudget 패턴 동일 — 보완 의견 *부분 채택*, 머큐리 자체 판단으로 가이드 박제

**박제 위치**: `docs/phase4_plugin_guide.md` §0-pre.3 #2 본문 (추가 박스 신설).

### 합류 신호 박제 — 옵션 A (인프라 먼저)

**진입 시점**: 로고스 집 PC 전환 후 (오늘 저녁 또는 내일).

**기획 박제**: rootric repo `docs/phase4_rootric_entry_plan.md` (commit `9a94eae`).

**첫 세션 목표 — Phase 1 + 2 (~2-3h)**:
- Phase 1: submodule + postinstall + Vercel Settings (~30min)
- Phase 2: plugin 패키지 셋업 (manifest + access-control + migrations 0001) (~2-3h)
- Phase 3 (IngestAdapter 마이그레이션) + 4 (smoke) + 5 (정리) → 다음 세션

**rootric manifest 카탈로그**:
- `object_kinds` 10종 (stock / sector / business_unit / product / customer / competitor / policy / macro_event / person / article)
- `relation_types` 6종 (belongs_to_sector / has_business_unit / produces / supplies_to / competes_with / mentioned_in)
- `event_types` 6종 (production_started / capex_announced / m_and_a / rate_decision / export_regulation / earnings_release)
- `label_set: rootric_classification` (FACT / ASSUMPTION / MIXED / PLAIN)

근거: rootric repo `docs/factsheet_wiki_requirements.md` §1.1~1.4 + Section 4.4 + Section 7.5.

### 코어 측 작업

| 항목 | 상태 |
|---|---|
| 가이드 §0-pre.3 #2 actor-aware cron 분기 패턴 박제 | ✅ 본 commit |
| 코어 인터페이스 변경 | 0건 |
| rootric 합류 모니터링 진입 | ✅ — 통합 협력 진입 동의 (코어 인터페이스 사용 검증 + (a) submodule 검증 + 트랩 5종 재발 방지) |

---

## Mercury 14차 — 로고스 Mercury 13차 patch 최종 검증 + rootric 합류 진입 동의 — 2026-04-30

### 입력

로고스 (rootric owner) Mercury 13차 cron 분기 박스 patch + Q1·Q2·Q3 답 검증 응답:

| 항목 | 결과 |
|---|---|
| §0-pre.3 #2 cron 분기 박스 | ✅ rootric Vercel 환경 정합 (`ingest-batch`=service-role / 일반 user=actor-aware cache) |
| Q1 (cron 분기 박스 추가) | ✅ |
| Q2 (코어 SPEC 영향 변경 별도 협의) | ✅ |
| Q3 (plott 시점 추정 X) | ✅ |
| 합류 동의 | ✅ — 첫 세션 Phase 1+2 (~2-3h, 집 PC 전환 후) 가이드 그대로 진행 |
| 트랩 5종 모니터링 | ✅ 진입 |

### 머큐리 결정

- 추가 결정 없음 — Mercury 13차 박제 그대로 stable. 코어 인터페이스 변경 0건.
- 합류 모니터링 자세 유지 — Phase 1+2 첫 세션 결과 보고 도착 시 머큐리 15차 진입.

### 후속 입력 — 트랩 A.11 보고 (rootric Phase 4 §0-pre Step 1-3)

로고스 첫 시도 (`git submodule add` + `npm install`) 트랩 발견 보고:

```
npm error EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:*
```

**원인 진단**: `packages/{storage,router,renderer}/package.json` 의 `"@wiki-core/core": "workspace:*"` 가 npm 비호환. (b) pnpm sibling 환경 (enroute) 은 pnpm magic 으로 회피. (a) submodule + npm 환경은 첫 검증.

### 머큐리 단독 결정 — 옵션 C (`pack:dist` 패턴) 채택

3 옵션 분석 후 **C 채택** (Edward 통찰 정합):

| 옵션 | 본질 | 평가 |
|---|---|---|
| B. `workspace:*` → `file:../core` 한 줄 변경 | monorepo dependencies 직접 수정 | ❌ pnpm sibling 환경에서 workspace member 인식 깨질 위험 ((b) 환경 회귀) |
| **C. `pnpm pack` → .tgz 4종 출력 + `file:./*.tgz` dep** ★ | 추가 build 출력만, 본체 변경 X | ✅ pnpm sibling (workspace:* 유지) + npm submodule (file:.tgz) 양 환경 정합 |
| A. `pnpm pack` 동일 본질 | (C 와 본질 동일) | (C 로 흡수) |

**박제 산출물**:
- `package.json` script 추가 — `"pack:dist": "node scripts/pack-dist.mjs"`
- `scripts/pack-dist.mjs` — cross-platform node script (4 패키지 loop pack)
- `.gitignore` — `dist-tarballs/` 추가 (postinstall 시 매번 생성, git 추적 X)
- `docs/phase4_plugin_guide.md` §0-pre.1 (a) submodule 박스 + 부록 A-2 A.11 신설

**검증**:
- (b) pnpm sibling — `pnpm install` + `tsc -b` 통과 (4 workspace projects build, 회귀 0건).
- `pnpm pack:dist` — 4 .tgz 생성 (`wiki-core-{core,storage,router,renderer}-0.1.0.tgz`).
- `wiki-core-storage-0.1.0.tgz/package/package.json` 의 `"@wiki-core/core": "0.1.0"` 자동 변환 확인 (npm 호환).
- (a) npm submodule — 로고스 측 재시도 검증 대기.

**rootric 재시도 가이드**:
1. `git submodule update --remote vendor/wiki-core` — Mercury 14차 patch 받기
2. rootric `package.json` postinstall 갱신:
   ```
   "postinstall": "cd vendor/wiki-core && corepack enable && corepack prepare pnpm@9 --activate && pnpm install --frozen-lockfile && pnpm build && pnpm pack:dist"
   ```
3. rootric `dependencies` 4종 갱신:
   ```
   "@wiki-core/core":     "file:./vendor/wiki-core/dist-tarballs/wiki-core-core-0.1.0.tgz",
   "@wiki-core/storage":  "file:./vendor/wiki-core/dist-tarballs/wiki-core-storage-0.1.0.tgz",
   "@wiki-core/router":   "file:./vendor/wiki-core/dist-tarballs/wiki-core-router-0.1.0.tgz",
   "@wiki-core/renderer": "file:./vendor/wiki-core/dist-tarballs/wiki-core-renderer-0.1.0.tgz"
   ```
4. `npm install` 재실행 — postinstall 이 .tgz 4종 생성 후 file: dep 해석. 정상 호환 예상.

**코어 인터페이스 변경 0건** — 본체 `workspace:*` 그대로 유지. semver 영향 0건.

---

## Mercury 15차 — rootric Phase 1+2 결과 + 트랩 A.12/A.13 응답 — 2026-04-30

### 입력

로고스 (rootric owner) Phase 1+2 합류 결과 + 트랩 2건 보고:

**Phase 1+2 통과** (rootric commit `7988da09`):
- 5 plugin source: manifest (11 obj + 30+ attr + 8 rel + 7 event + label_set rootric_validation) / access-control / supabase-adapter (cron 분기 + Module Augmentation) / migrations 0001 (rootric_provenance_ext + RLS DROP+CREATE + A.6 CASE WHEN) / index
- `npm run type-check` ✅
- `import('@wiki-core/core')` → `createWikiCore`, `registerPlugin`, `validatePlugin` 정상 export
- 작업 시간 60min (가이드 추정 30min × 2배 — 트랩 처리 포함)

**트랩 2건 신규** (부록 A-2 후보):

| # | 트랩 | 핵심 |
|---|---|---|
| A.12 | chicken-and-egg (npm install vs postinstall 순서) | npm 의존성 해결 시점에 .tgz 없음 (postinstall 이전). Vercel build 도 동일 → critical path 차단. |
| A.13 | corepack EPERM (Windows + Program Files Node) | `corepack enable` 실패. 환경 의존성. |

**머큐리 결정 요청**:
- A.12: §1-2 본문에 "첫 수동 빌드 절차" 박스 또는 preinstall 패턴 검토
- A.13: postinstall corepack 의존 X 권장 (npx pnpm)

### 머큐리 단독 결정 — 보완 2건 모두 *완전 채택*

**A.12 → preinstall 패턴 전환**: postinstall → preinstall. preinstall 은 의존성 해결 *전* 실행 → .tgz 미리 생성. Vercel + rootric 로컬 양쪽 자동 처리. *첫 수동 빌드 박스* 거부 — Vercel critical path 미해소.

**A.13 → corepack 의존 제거**: `npx -y pnpm@9 ...` 직접 호출. Windows 권한 이슈 회피 + Vercel 환경 의존성 추가 회피.

**박제 산출물** (가이드 patch only — wiki-core 본체 변경 0건):
- `docs/phase4_plugin_guide.md` §0-pre.1 (a) submodule 박스 *정정* — postinstall → preinstall + npx pnpm + `scripts/build-wiki-core.mjs` 예시 코드
- 부록 A-2 A.12 + A.13 신설 — 증상·원인·해결·대안 거부 박제

**rootric 정정 셋업 형태**:
```json
{
  "scripts": {
    "preinstall": "node scripts/build-wiki-core.mjs"
  },
  "dependencies": {
    "@wiki-core/core":     "file:./vendor/wiki-core/dist-tarballs/wiki-core-core-0.1.0.tgz",
    ...
  }
}
```

`scripts/build-wiki-core.mjs` 안에서 `npx -y pnpm@9 install + build + pack:dist` 항상 실행 (cache hit 짧음, wiki-core 갱신 시 자동 반영).

### 코어 측 작업

| 항목 | 상태 |
|---|---|
| 가이드 §0-pre.1 (a) submodule 박스 정정 (preinstall + npx pnpm) | ✅ 본 commit |
| 부록 A-2 A.12 + A.13 신설 | ✅ 본 commit |
| 코어 인터페이스 변경 | 0건 |
| wiki-core 본체 코드 변경 | 0건 (가이드 patch only) |
| semver 영향 | 0건 |

### 후속 입력 — Mercury 15차 patch 검증 통과

로고스 정정 적용 + 검증 결과:
- `dist-tarballs` 삭제 후 `npm install` → preinstall 자동 빌드 ✅
- 365 packages audit ✅ 9s 통과
- import 정상 ✅
- Vercel critical path 해소 확인 ✅
- Phase 3 (IngestAdapter 마이그레이션) 진입 동의 ✅

머큐리 결정: 추가 결정 0건. Mercury 15차 patch 그대로 stable. 코어 인터페이스 변경 0건. rootric Phase 3 모니터링 자세 유지.

### 다음 입력 대기

| 도메인 | trigger |
|---|---|
| **rootric (Phase 3 결과)** | IngestAdapter 마이그레이션 + hooks 5종 본체 + smoke-crud (★ A.6 검증) + Vercel 배포 cold start 결과 |
| plott | rootric 2차 검증 통과 후 |

---

## Mercury 16차 — rootric Phase 3-A 검증 통과 + tsconfig 환경 정합 박제 — 2026-04-30

### 입력

로고스 Phase 3-A 결과:
- SupabaseAdapter 자체 빌드 + storageRouter + 5 hooks (link-free + 팩토리 패턴) ✅
- type-check ✅
- 가이드 §1-§3 박스 1·2·3 정확 매핑 ✅
- **tsconfig `moduleResolution: bundler`** (subpath exports `@wiki-core/core/utils/noise` 인식) — 신규 환경 정합 정보
- registerPlugin runtime 검증 ⏳ Phase 3-B smoke 단계 (env 의존)
- Phase 3-B 진입 동의 ✅

### 머큐리 결정 — `moduleResolution: bundler` 가이드 박스 박제

**판단**: 코어 인터페이스 변경 X. 단순 환경 정합 정보. Next.js / 모던 번들러 환경 표준 (rootric Phase 3-A 검증 + plott Next.js 합류 시 동일 필요).

**박제 위치**: `docs/phase4_plugin_guide.md` §1.0 (Plugin Manifest Boilerplate 직전 — 가장 먼저 plugin tsconfig 셋업 시 만남).

**도메인별 적용**:
- rootric: ✅ Phase 3-A 검증 (Next.js)
- enroute: 이미 정합 ((b) sibling pnpm 으로 자연 호환)
- plott: rootric precedent 채택 권장 (Next.js)

### 코어 측 작업

| 항목 | 상태 |
|---|---|
| 가이드 §1.0 tsconfig 환경 정합 박스 | ✅ 본 commit |
| 코어 인터페이스 변경 | 0건 |
| wiki-core 본체 코드 변경 | 0건 |
| semver 영향 | 0건 |

### 다음 입력 대기

| 도메인 | trigger |
|---|---|
| **rootric (Phase 3-B)** | smoke-crud (rootric 6 케이스 + ★ A.6 검증) + registerPlugin runtime 검증 + Vercel 배포 cold start 결과 |
| plott | rootric Phase 3-B 검증 통과 후 |

---

## Mercury 17차 — rootric Phase 3-B 종결 + A.6 NUMERIC 일반화 박제 — 2026-04-30

### 입력

로고스 Phase 3-B 종결 보고:
- step 1-6 모두 완료
- **smoke-crud 10/10 PASS** — ★ A.6 + ★ multi-target checkWrite + ★ deleteLabel access control 3 핵심 통과
- 마이그레이션 4건 적용 (wiki_core_0001/0002 + rootric_plugin_0001/0002)
- ⏳ Vercel deploy 결과 추후

### ★ A.6 보강 발견 — NUMERIC NOT NULL DEFAULT 동일 트랩

**기존 박제 (Mercury 12차)**: NOT NULL DEFAULT *BOOLEAN* (`wisdom`) 만 명시.

**Mercury 17차 신규 발견** (rootric Phase 3-B 검증 중):
- `rootric_provenance_ext.strength NUMERIC NOT NULL DEFAULT 0.5`
- 1차 INSERT(strength=0.85) → 2차 RPC NULL 전달
- 결과: 0.85 → 0.5 로 덮힘 (FAIL)
- 메커니즘: `INSERT VALUES` 가 이미 default 로 치환된 `EXCLUDED` 받음 → "원래 NULL 이었나" 구분 불가 (BOOLEAN false 트랩과 동일).

**해결 (rootric 0001 마이그레이션 정정 적용)**:
```sql
strength = CASE WHEN p_strength IS NULL THEN existing ELSE p_strength END
is_key   = CASE WHEN p_is_key   IS NULL THEN existing ELSE p_is_key   END
expires_at = COALESCE(EXCLUDED.expires_at, existing)   -- nullable 라 OK
```

### 머큐리 단독 결정 — A.6 일반화 (BOOLEAN → 모든 NOT NULL DEFAULT 타입)

**판단**: enroute (BOOLEAN) + rootric (NUMERIC) 양면 발생 → 메커니즘이 *타입 무관* 하게 일반. plott 합류 시 (`is_official BOOLEAN`, `confidence NUMERIC` 등) 동일 사고 차단 가치 critical.

**박제 patch**:
- `docs/phase4_plugin_guide.md` 부록 A.6 본문 일반화 — BOOLEAN/NUMERIC/INTEGER/TEXT NOT NULL 모든 타입에 CASE WHEN 명시
- 발생 사례 표 추가 (enroute wisdom BOOLEAN + rootric strength NUMERIC)
- 메커니즘 설명 (`INSERT VALUES` default 치환 → EXCLUDED 구분 불가)
- plott 적용 권장 박제 (처음부터 CASE WHEN 패턴 채택)

**대안 거부**:
- 별도 트랩 (A.14) 신설: 같은 메커니즘 — 별도 박제는 중복. A.6 일반화가 정합.
- 코어 schema 영향: 0건 (plugin 마이그레이션 SQL only).

### 코어 측 작업

| 항목 | 상태 |
|---|---|
| 부록 A.6 일반화 (BOOLEAN → 모든 NOT NULL DEFAULT 타입) | ✅ 본 commit |
| 코어 인터페이스 변경 | 0건 |
| wiki-core 본체 코드 변경 | 0건 |
| semver 영향 | 0건 |

### 다음 입력 대기

| 도메인 | trigger |
|---|---|
| **rootric (Phase 4-A 종결)** | Vercel deploy 결과 + 첫 ingest 본격 실행 (source=news / dart) |
| plott | rootric Phase 4-A 종결 후 합류 (5단계 가시성 + scope_id) |

---

## Mercury 18차 — Vercel private submodule 차단 발견 + wiki-core public 전환 결정 — 2026-05-01

### 입력

로고스 (rootric owner) Mercury 17차 후속 보고 도착. rootric Vercel 자동 배포 (commit `1a47ab8`) 실패 로그:

```
Warning: Failed to fetch one or more git submodules
ERR_PNPM_NO_LOCKFILE
```

**원인**: Vercel 공식 정책 — *"Git submodules that are private or requested over SSH will fail during the Build step."* (https://vercel.com/docs/builds/build-features#git-submodules). GitHub App "All repositories" 권한과 무관 — Vercel build 환경에서 `git clone --recurse-submodules` 가 PAT 또는 SSH key 인증 X.

**영향 범위**:
- rootric (Vercel SaaS) — **직접 차단** (commit `1a47ab8` 로그 명시)
- enroute ((b) sibling link, Vercel 사용 X) — 영향 0
- plott (배포 환경 미정) — Vercel 사용 시 동일 차단

**로고스 권장**: wiki-core repo public 전환 (코드 자체에 도메인 비밀 0건, multi-domain 합류 가치 우위, 보안 가치 < 합류 가치).

### 머큐리 단독 결정 — wiki-core public 전환 채택 (에드워드 동의 후)

**4 옵션 비교**:

| 옵션 | 작업 | 보안 / 운영 부담 | 머큐리 patch 사이클 |
|---|---|---|---|
| **A. wiki-core public 전환** ★ | repo settings 변경 (1분) | wiki-core 코드 공개 (도메인 비밀 0) | 그대로 |
| B. PAT 환경변수 + Vercel Build Command 수동 git clone | 각 도메인 PAT 발급/회전 | PAT 노출 위험 + 운영 부담 | 그대로 |
| C. GitHub Packages private publish | publish 사이클 + GH Packages auth | 도메인별 npm auth | **끊김** (Phase 5 evolution) |
| D. vendor 복사 | 도메인 owner 수동 sync | 도메인마다 동기화 책임 | **완전 끊김** (거부) |

**A 채택 근거**:
1. **코드 자체 도메인 비밀 0건** — 4요소 ontology + adapters + hooks 모두 추상. 행동 원칙 #1 (도메인 어휘 코어 반영 X) 깊이 박혀있어 public 전환 시 노출되는 도메인 비밀 0건
2. **multi-domain 합류 가치 우위** — rootric (현재 차단) + plott (Vercel 가능성) + Phase 5 npm public registry publish 자연 진입
3. **PAT 운영 부담 회피** — 도메인 owner 별 PAT 책임 X
4. **머큐리 patch 사이클 보존** — A 는 patch 즉시 반영 그대로

**단점 (인정)**:
- wiki-core commit history / docs 공개 — Mercury 1~18차 작업 흐름 / `domain_feedback_log.md` 도메인 owner 응답 / 작업 패턴 노출
- *도메인 비밀* 0건이지만, 작업 흐름 노출 가치 판단은 에드워드 영역 → 동의 후 진행

### 사전 민감 정보 스캔 (Mercury 18차)

| 항목 | 결과 |
|---|---|
| API key / secret / password / bearer token / PAT | **0건** |
| AWS / GitHub PAT (`ghp_*` / `github_pat_*`) | **0건** |
| `service_role` 언급 | 모두 SQL GRANT 문 / `actor.role === 'service_role'` 비교 (실제 토큰 X) |
| Email | **0건** (wiki-core repo 내부) |
| GitHub username `Ryu-story` | repo URL 자체 포함 (이미 GitHub 공개 식별자) — 문제 없음 |
| 로컬 path `c:/Users/woori/...` | docs 본문 노출 — Windows username 중립 — *민감 X* |

→ **public 전환 안전**.

### 박제

- `docs/phase4_plugin_guide.md` §0-pre.1 (a) submodule 박스 정정 — "wiki-core public 전제" 명시 + Vercel 차단 회피 + plugin private 유지 자유 명시
- `docs/phase4_plugin_guide.md` 부록 A-2 A.14 트랩 신설 — Vercel private submodule 자동 fetch 차단 + 4 옵션 비교 + Mercury 18차 결정 + 사전 민감 정보 스캔 결과
- `docs/domain_feedback_log.md` Mercury 18차 섹션 (이 박스)
- `CLAUDE.md` Mercury 18차 신규 섹션

### 에드워드 액션 (머큐리 외부)

| 단계 | 작업 |
|---|---|
| 1 | https://github.com/Ryu-story/wiki-core/settings 진입 |
| 2 | 페이지 하단 "Danger Zone" → "Change repository visibility" → "Make public" |
| 3 | 확인 prompt 에서 repo 이름 입력 + Make public 클릭 |
| 4 | rootric Vercel 자동 배포 재시도 — submodule fetch 정상 동작 확인 |

**plugin repo (rootric / plott / enroute) 는 private 유지** — 도메인 비밀 포함 가능성. wiki-core 만 public.

---

## 다음 입력 대기

| 도메인 | 다음 응답 trigger |
|---|---|
| ~~enroute (1차)~~ | ✅ Phase 4-A 1차 합류 종결 (2026-04-30, commit `8817d86`, smoke 96/96). 후속은 enroute 자체 Phase 4-B/C/D (코어 blocking 아님). Vercel 사용 X 라 A.14 영향 0. |
| **rootric (Vercel 재배포 검증)** | **wiki-core public 전환 후 자동 배포 재시도 결과** — submodule fetch 정상 동작 + rootric 첫 ingest 실행 검증. 코어 인터페이스 사용 + (a) submodule + pack:dist + preinstall 실 환경 검증 + 신규 트랩 모니터링. |
| plott (3차) | rootric Vercel 검증 통과 후 합류 (가장 복잡). enroute precedent + (b) 2단계 sibling link + 5단계 가시성 + `plott_target_visibility` 함수. plott 배포 환경 미정 — Vercel 사용 시 wiki-core public 이미 전환됐으니 차단 없음. |
