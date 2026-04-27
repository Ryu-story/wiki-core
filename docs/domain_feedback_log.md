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

## 다음 입력 대기

| 도메인 | 다음 응답 trigger |
|---|---|
| 모두 | Mercury 2차 종결 통보 후 — `packages/core/SPEC.md` 검토 결과 (이의 / 보완 / OK) |
