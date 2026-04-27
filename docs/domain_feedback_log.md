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

## 다음 입력 대기

| 도메인 | 다음 응답 trigger |
|---|---|
| 모두 | Mercury 4차 종결 통보 후 — `@wiki-core/core` 1차 코드 검토 결과 (plugin 작성 시 import / 헬퍼 사용 / 타입 호환성) |
