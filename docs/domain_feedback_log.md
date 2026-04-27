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

Mercury 5차 보강 patch 단일 commit — Edward "내일 이어서" 신호로 다음 세션 진입 시 즉시 처리. router/renderer (Mercury 6차) 는 patch 후 별도 진입.

---

## 다음 입력 대기

| 도메인 | 다음 응답 trigger |
|---|---|
| 모두 | Mercury 5차 보강 patch (deleteLabel + multi-target + RLS + Supabase 박스) 박제 후 — 검토 결과 (각 도메인 wrap 패턴 동작 가능성) |
