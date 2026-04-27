# Enroute Wiki — 도메인 요구사항 명세서

> wiki-core 공통 패키지(@wiki-core/*) 설계를 위해 enroute 측이 제출하는 도메인 명세서.
> 동일 양식을 plott / rootric 가 평행 작성한 뒤, 3 명세서 교집합으로 wiki-core 추상화 결정.
>
> **작성자**: 루터 (enroute Navigator AI)
> **최초 작성**: 2026-04-27
> **상태**: 초안 (Phase 1 — 평행 작성 단계)
> **참고**: rootric 명세서 `rootric/docs/factsheet_wiki_requirements.md` (양식만 따르되 도메인은 다름)

---

## 0. 도메인 한 줄 정의

> **단일 사용자(Edward) 의 삶 전체 데이터(시간 사용·매매·일기·메모·활동·캘린더·폰)를 자동 수집·온톨로지화하여, AI 동반자 헤이즐이 능동적으로 코칭·리뷰하고 Vision/Area/Project Wiki 로 누적 시각화하는 시스템.**

핵심 사용자 시나리오:
- "이번 주 깊이 Vision 시간 거의 0 — 어떻게 보충하실까요?" (헤이즐 능동 메시지)
- "Finances Area 의 최근 30일 추세 + 자유 Vision 기여도" (대시보드 자동 집계)
- "내 매매 패턴이 자유 Vision 에 어떻게 기여했는가, 지난 분기 대비" (Wiki 누적 분석)
- "이 일기 내용을 어느 Area 에 연결해야 할까?" (Journal → Area 자동 제안)

차별점 (rootric · plott 와의 본질적 차이):
- **싱글 유저 + 본인 일상 데이터** (rootric: 멀티 유저 SaaS, 외부 공시·뉴스 / plott: 약국 운영 데이터)
- **C 레이어 (일기·재무·가족·의료·위치) 비중 큼** — 클라우드 LLM 금지 영역 多
- **Vision 3축 (폭·자유·깊이)** 같은 개인 가치 축이 wiki 의 1급 시민
- **Container/Activity/Observation 3층 측정** — 시간 데이터의 선언 vs 실측 간극 자체가 wiki 인사이트의 핵심

---

## 1. 객체 타입 카탈로그

### 1.1 객체 타입

| 타입 | 식별자 | 예시 | 출처 |
|---|---|---|---|
| **Vision** | `nodes.id` (type='vision') | "육각형 인간(폭)", "경제적 자유", "지혜(깊이)" | nodes 테이블, 사용자 직접 정의 |
| **Area** | `nodes.id` (type='area') | "Finances", "약국 업무", "개발", "가족", "성찰" | nodes, 사용자 직접 정의 |
| **Project** | `nodes.id` (type='project') | "자산 N억 달성", "Plott MVP 출시", "1980년대 경제사 깊이 파기" | nodes |
| **Resource** | `nodes.id` (type='resource') | 책·논문·링크·아티클 클립 | nodes (Phase 2 자동 추출 예정) |
| **Atomic** | `nodes.id` (type='atomic') | "인플레이션의 본질", "재무제표 ROE 의미" 같은 정제 개념 1개 | nodes (Phase 2 LLM Wiki 가 정제) |
| **Container** | `containers.id` | "09-18시 약국 근무" / "21-23시 집중 세션" 같은 시간 슬롯 | containers 테이블 |
| **Activity** | `activity_logs.id` | Container 안에서 실제 한 일 (개발 30분, 약 주문 20분 등) | activity_logs 테이블, ActivityWatch / 헤이즐 봇 / 수동 입력 |
| **Observation** | `aw_events` 등 | PC 활동 자동 감지 — 앱·창 제목·URL 도메인 | ActivityWatch agent → Supabase |
| **Trade** | 구글시트 행 | 키움 체결 1건 (매수/매도/단가/수량) | 시트 "국내체결내역"·"해외체결내역" 탭 (Phase 3-A) |
| **JournalEntry** | `journal_entries.id` | 자유 텍스트 일기·메모 1건 | journal_entries 테이블 |
| **CalendarEvent** | `calendar_events.id` | 외부 캘린더 일정 | Google Calendar API (Phase 1.6-B) |
| **GitCommit** | `github_dev_sessions.id` | 개발 세션 1건 (commit 묶음) | GitHub REST API agent |

→ **Vision/Area/Project/Resource/Atomic 5종이 마인드맵의 1급 시민**, 나머지는 시간 데이터·외부 입력. cross 링크로 N:N 연결 가능.

### 1.2 객체 속성 (Attribute)

| 객체 | 속성 | 단위 | 시계열 |
|---|---|---|---|
| Vision | `metric_type` (`balance`/`freedom`/NULL), `accumulated_minutes` | 분 (집계) | ✅ 일/주/월 |
| Area | 누적 시간, 기여하는 Vision 가중치, 활동 빈도, "마지막 활동 N일 전" | 분, % | ✅ 일/주/월 |
| Project | 진척도 % (L1~L5 체크박스 기반), 마감일, 누적 시간 | %, 분 | ✅ 갱신 |
| Resource | 정제도(읽음 / 인용됨 / Atomic 추출됨) | 카테고리 | ❌ |
| Atomic | 양방향 링크 수, `wisdom=true` 플래그, 다른 Area 횡단 여부 | 정수, bool | ✅ 갱신 |
| Container | started_at, ended_at, duration, type, location | 시각, 분 | ✅ 일 |
| Activity | started_at, ended_at, duration_minutes, area_node_id, source, note | 시각, 분 | ✅ 일 |
| Trade | executed_at, quantity, price, amount, fee, side | 시각, 정수, 원 | ✅ 일 |

### 1.3 객체 간 허용 관계

| 관계 | from → to | 카디널리티 | 예시 |
|---|---|---|---|
| `parent_id` (구조 포함) | Area → Area | 1:N (트리) | "주식" Area → "Finances" Area |
| `parent_id` | Project → Area | 1:N | "Plott MVP" → "개발" Area |
| `parent_id` | Resource/Atomic → Area | 1:N | 책 → "투자" Area |
| `cross` (의미 기여) | Area → Vision | N:N (단방향, 가중치) | Finances → 자유(0.8) + 폭(0.4) |
| `cross` | Area ↔ Area | N:N (양방향 가능) | "성찰" ↔ "주식" (서로 강화) |
| `cross` | Atomic ↔ Atomic | N:N (양방향) | 격자적 사고 — 다른 Area 의 개념 연결 |
| `area_node_id` | Activity → Area | N:1 | 활동 1건이 Area 에 속함 |
| `area_node_id` | Container → Area | N:1 | Container 가 맥락 Area 에 속함 |
| `mentioned_in` | (any) → JournalEntry | N:1 | 일기 본문에 등장한 노드 (Phase 2 자동) |

> **Vision↔Vision 관계**: 수평이면 링크 없음 (현재 3축 전부 수평). 상하/강화면 단방향 또는 양방향 cross. 자세한 규칙 CLAUDE.md "Vision↔Vision cross 규칙" 참조.

### 1.4 행동 (Event)

| 이벤트 | 대상 | 예시 |
|---|---|---|
| `activity_started` / `activity_ended` | Activity | "개발 09:00~12:00" |
| `container_opened` / `container_closed` | Container | "수면 container 23:00 시작" |
| `task_completed` | Project (L5) | "ROADMAP 단계 7 체크박스 [x]" |
| `node_created` | nodes | 마인드맵에서 새 노드 추가 |
| `cross_link_added` | node_links | Area → Vision 가중치 부여 |
| `journal_entered` | JournalEntry | 자유 텍스트 1건 입력 |
| `trade_executed` | Trade | 키움 체결 |
| `gap_detected` | (Area or Project) | "Family Area 60일째 활동 없음" 자동 감지 |
| `vision_imbalance_detected` | Vision | "깊이 Vision 7일 누적 0" |
| `wisdom_atomic_promoted` | Atomic | AI 가 wisdom=true 추천 (Phase 2-B) |

---

## 2. 입력 소스 종류

| 소스 | 포맷 | 일일 빈도 | 평균 길이 | 신뢰도 | 처리 우선순위 |
|---|---|---|---|---|---|
| **ActivityWatch (PC)** | JSON 이벤트 | 100~300 events | 앱명 + 창 제목 ≤50자 | ★★★ 자동·정확 | High |
| **헤이즐 텔레그램 봇** | 자유 텍스트 | 5~20건 | 한 줄 ~ 1문장 | ★★ 본인 입력 | High |
| **마인드맵 UI 노드 추가** | 구조화 (title + type + parent + cross) | 0~10 노드 | ~30자 | ★★★ 본인 직접 | High |
| **Journal (대시보드)** | 자유 텍스트 | 0~3건 | 50~500자 | ★★ 본인 직접 | High |
| **Activity 수동 입력 (대시보드)** | 구조화 (start/end/area/note) | 5~20건 | ≤200자 | ★★★ 본인 직접 | High |
| **키움 체결내역 (시트)** | 정형 (날짜·종목·수량·단가) | 0~50건 (장 열림 시) | — | ★★★ API 자동 | High |
| **Google Calendar** | iCal/JSON | 0~10 이벤트 | ≤200자 | ★★★ | Mid |
| **GitHub commits** | API JSON | 0~30 commits | 메시지 ≤100자 | ★★★ | Mid |
| **AI 세션 요약 (ai_sessions)** | 텍스트 요약 | ~10건 (10분 간격) | 200~2000자 | ★★ AI 생성 | Mid |
| **(미래) iOS HealthKit** | CSV/JSON 일별 export | 1회 sync | — | ★★★ | TBD (Phase 2 이후) |

→ **일일 처리량 추정: 200~400 이벤트** (PC ActivityWatch 압도적). C 레이어 (일기·재무·가족·의료) 는 별도 라우팅.

소스별 저장 테이블:
- `activity_logs` (Activity)
- `containers` (Container)
- `aw_events` 또는 ActivityWatch 원본 (Observation)
- `nodes` / `node_links` (Vision/Area/Project/Resource/Atomic + 관계)
- `goal_layers` (L1~L5)
- `journal_entries` (Journal)
- `tasks` / `task_instances` / `recurring_tasks` (실행 단위)
- `calendar_events` (CalendarEvent)
- `github_dev_sessions` (GitCommit 묶음)
- `ai_sessions` (대화 요약)
- `hazel_daily_summaries` / `hazel_persona_reviews` (헤이즐·루터·거울 리뷰 저장)
- `kiwoom-trades` 는 **시트가 truth source** — 별도 테이블 없음 (Phase 3-A 결정)

---

## 3. 분류·라벨링 규칙

### 3.1 문장 단위 분류

Enroute 는 rootric 의 FACT/ASSUMPTION 같은 **검증 지향** 분류는 사용 안 함. 대신:

| 라벨 | 정의 | 예시 |
|---|---|---|
| **선언 (Declaration)** | 사용자 의도·계획 | "오늘 개발 4시간" (마인드맵 노드, 일정) |
| **실측 (Measurement)** | 자동 수집된 행동 | ActivityWatch 의 앱 사용 30분 |
| **회고 (Reflection)** | 사후 해석·메모 | 헤이즐 일일 리뷰, Journal 일기 |
| **노이즈 (Noise)** | 필터링 대상 | URL 토큰·CSS·짧은 시스템 로그 |

→ Enroute 의 핵심 분석 가치는 **선언 vs 실측 간극** (Phase 1.5-I C안 참조).

### 3.2 카테고리·태그

| 카테고리 | 사용처 |
|---|---|
| **노드 타입** | Vision/Area/Project/Resource/Atomic 5종 (필수, 1급 시민) |
| **Container 타입** | sleep / work_shift / focus_session / commute / leisure 등 (계약된 enum) |
| **Activity source** | manual / activitywatch / hazel_bot / planner / cron |
| **민감도 레이어** | A (공개 OK) / B (필터 후 OK) / C (절대 로컬) — 라우팅 결정용 |
| **활동 질 태그** | 몰입 / 산만 / 학습 / 실행 / 회복 / 누수 (TBD — Phase 2-O 갭 분석에서 확정) |

### 3.3 특수 플래그

| 플래그 | 적용 객체 | 의미 |
|---|---|---|
| `wisdom=true` | Atomic | "여러 Area 를 관통하는 원칙으로 체화됨" (Phase 2-B 결정) |
| `voluntary=true` | Container/Activity | 의무 vs 선택 활동 구분 (자유 Vision 측정용) |
| `is_balance_break=true` | (집계 결과) | Vision 균형 위협 신호 (TBD — 자동 계산 룰) |
| `area_imbalance=true` | (Area 집계) | Area 누락·과집중 (TBD) |

### 3.4 시간 만료·검증

- Enroute 는 rootric 의 `expires_at` (예측 검증) **개념 부분 적용**:
  - Project 진척도는 마감일 (`due_at`) 가짐 — 미달 시 자동 강조
  - 마인드맵 노드 자체엔 만료 없음 (영속 정의)
  - 활동 로그·체결은 완료 시점 기록만, 만료 X
- **신선도** 관점: "Area N일째 활동 없음" 같은 정체 신호는 자동 계산

---

## 4. 시간축·출처 추적 요구

### 4.1 시간 단위
- **분 (minute)**: Activity·Container 의 기본 측정 단위
- **일 (date, KST)**: 헤이즐 일일 리뷰, ActivityWatch 일별 집계, 시트 체결내역
- **주 (week)**: 거울·루터 주간 페르소나 리뷰
- **월 (month)**: 페르소나 분석, Project 진척 추이
- **분기 (quarter)**: Goal Track L2 마일스톤
- **연 (year)**: Vision 누적 검토

### 4.2 출처 추적 (Provenance)

모든 Activity·Container·Trade 는 **반드시 source 필드** 가짐:
- `activity_logs.source`: `manual` / `activitywatch` / `hazel_bot` / `planner` / `cron`
- `containers` 도 동일 source 추적
- 시트 체결내역의 K열/L열 `주문번호` = 키움 API 의 trde_no (1:1 매핑)
- Journal·노드는 user_id 만 (본인이 단일 source)
- AI 가 자동 생성한 메모(헤이즐 일일 리뷰)는 별도 테이블 (hazel_daily_summaries) — 작성자 = 페르소나 (헤이즐/루터/거울)

> rootric 처럼 "여러 출처가 한 사실을 가리키는 강도(strength)" 개념은 Enroute 에 약함 — 본인 데이터라 출처 충돌 거의 없음. 다만 **선언 vs 실측 간극** 은 핵심 (Container 시간 vs Activity 시간 vs Observation 시간 3중 비교).

### 4.3 만료·신선도

- Project: `due_at` 임박 시 대시보드 강조
- Area: 마지막 Activity 시각으로 stale 감지 ("60일째 활동 없음")
- Vision: 누적 시간 0 일수 카운트 (CLAUDE.md 행동 원칙 #7 의 L1 자동 측정)
- 일별 리뷰 (hazel_daily_summaries): summary_date 기준 30~90일 보존 (장기 페르소나 분석 후 archive 검토 — TBD)

---

## 5. 출력 (Wiki) 포맷

### 5.1 Wiki 페이지 구조

**Area Wiki (가장 자주 보는 출력 — Area Track 의 Layer 2)**:

```
# 개발 Area

## 한눈에 보기
- 누적 시간 (이번 주 / 이번 달 / 누적)
- 기여하는 Vision: 자유(0.8) + 폭(0.4) [Edge 가중치]
- 마지막 활동: 2026-04-26 21:50 (오늘)
- 진행 중 Project: 2개 (Plott MVP, Enroute Phase 3-A)

## 시간 분포
- ActivityWatch 자동 측정: 32h / 이번 주
- Container 선언: 30h
- 간극: +2h (실측이 선언보다 많음 — 짬내기 개발 추정)

## 관련 Project (진척 %)
- Enroute Phase 3-A: 70% (단계 7 완료)
- Plott MVP: 45% (8개 sub-task 중 4개)

## 정제된 개념 (Atomic)
- "BACKFILL 옵션 패턴" (2026-04-24 추출, wisdom 후보)
- "Edge Function vs VM 트레이드오프" (2026-04-24)
- "Service Account 인증 플로우" (2026-04-24)

## 최근 활동 타임라인 (시간순 30건)
- [2026-04-26 21:50] Phase 3-A IP 사고 진단 (메모: VM 재시작 후 IP 변경)
- [2026-04-25 18:30] timer 자동 실행 (체결 0건 정상)
- ...

## 누락·과집중 신호
- (해당 없음)

## 횡단 연결 (다른 Area 의 Atomic)
- "주식 Area 의 시계열 분석 패턴" ↔ 이 Area 의 "Time-series 처리 코드"
```

**Vision Wiki**:
```
# 자유 (Freedom Vision)

## metric_type: freedom
## 누적 시간: 이번 주 18h / 이번 달 75h

## 기여 Area (가중치 × 시간)
- Finances: 0.8 × 12h = 9.6h
- 개발: 0.6 × 30h = 18h (총 자유 기여 큰 비중)
- ...

## 진행 중 Project
- "자산 N억 달성" (Project / Finances)
- "Enroute 자동화" (Project / 개발)

## 자유 지수 (TBD — Phase 1.5-F freedom_balance 스펙 참조)
- 이번 주 자유 지수: 0.62
- 추세: 지난 4주 0.55 → 0.62 (상승)

## 누락·경고
- 이번 주 자유 기여 Activity 중 voluntary=false 비중 65% (의무 시간이 아직 큼)
```

**Project Wiki**: ROADMAP 의 체크박스 상태 + 활동 기여 + 마감 추세.

### 5.2 자연어 질의 답변

유저가 헤이즐 봇·대시보드 채팅에 던지는 질문:
- "이번 주 깊이 Vision 어땠어?" → Vision Wiki 자동 요약
- "Plott MVP 얼마나 남았어?" → Project Wiki + ETA 추정
- "어제 일기 어디 Area 에 연결할까?" → JournalEntry → Area 매칭 제안 (Phase 2)
- "Edward 가 자주 빠뜨리는 영역은?" → 페르소나 분석 + Area 누락 신호

→ 헤이즐(Hermes 후보) 가 Wiki 캐시 + 원본 DB 모두 접근해 답변. **CLAUDE.md 행동 원칙 #7 (측정 vs 판단 경계)** 에 따라 정밀 % 와 방향 신호 분리 표현.

### 5.3 시각화 요소

- **시계열 그래프** — Vision/Area 누적 시간 추이 (이미 일부 대시보드 구현)
- **객체 관계 그래프** (Force layout) — 마인드맵 뷰 (Phase 1-A2 graph_view_spec 참조)
- **Constellation View (별/은하)** — Phase 2-D, Project=별, Area=별자리, Vision=은하
- **타임라인** — 일별 활동 (이미 대시보드 구현)
- **신호등 카드** — 정성 평가 (정량 카드와 분리, 행동 원칙 #7 에 따름)

---

## 6. 권한·공유 모델

### 6.1 멀티유저
- **싱글 유저 기본** (Edward 본인만)
- 가족 멤버 일부 데이터 공유 가능 (확정 안 됨, "공유 구조" CLAUDE.md 섹션 참조)
- 멀티 user_id 지원하지만 RLS 로 본인 row 만 접근

### 6.2 공개·비공개 단위

| 데이터 | 가시성 | 비고 |
|---|---|---|
| Vision/Area/Project 노드 | private | 본인 마인드맵 |
| Activity 로그 / 체결 / 시간 데이터 | private | C 레이어 가능성 大 |
| Journal | private | 절대 공유 안 됨 (RLS) |
| 헤이즐 일일 리뷰 / 거울 페르소나 | private | 본인 회고 |
| (선택) family scope | family 멤버 | "공동 목표·가계 자산" — 미구현 |
| (선택) public 링크 | URL 공유 | "목표 달성 현황 보여주기" — 미구현 |

### 6.3 협업 모델
- 가족 (배우자) 일부 공동 목표 공유 — Phase 2 후반 또는 Phase 4
- 외부 공유 없음 (rootric 처럼 SaaS 가입 모델 아님)

---

## 7. AI 모델·라우터 요구

### 7.1 Tier 별 모델 후보

| Tier | 작업 | 모델 후보 | 비용 | 정확도 요구 |
|---|---|---|---|---|
| **Tier 0** | 룰 필터 (B 레이어 블랙리스트, 짧은 노이즈 제거) | 정규식·휴리스틱 (`agent/privacy-filter.ts`) | $0 | C 레이어 누출 0% (필수) |
| **Tier 1** | A 레이어 — 분류·짧은 요약 (Vision 정렬·Area 매칭·노드 타입 자동 분류) | Gemini Flash-Lite / Qwen via OpenRouter | 무료 또는 ~$0.001/1K | 80%+ |
| **Tier 2** | B 레이어 — Activity 질 태그 추론·Atomic 자동 추출 | Gemini Flash / Claude Haiku | ~$0.001/1K | 85%+ |
| **Tier 3** | A·B 레이어 — Wiki 페이지 생성, 헤이즐 일일 리뷰, 페르소나 분석 (정성) | Claude Sonnet (`hazel_persona_text` 등 풍부한 텍스트) | 페이지당 $0.005~0.02 | 90%+ (자연스러운 문장 + 출처 정확) |
| **Tier 4 (강제 로컬)** | **C 레이어 — 일기·재무·가족 실명·의료·위치 분석** | **Gemma 3 12B (Ollama, 로컬)** 강제 | $0 | 70%+ (충분, 정확도보다 누출 방지가 우선) |

### 7.2 토큰 예산
- 일일 처리량: 200~400 events + 5~20 텍스트 입력 + 헤이즐 일일 리뷰 1회
- Tier 0/1 이 80%+ 흡수, Tier 3 호출은 일 1~3회 (헤이즐 리뷰 등)
- Tier 4 (로컬) 는 비용 0 — 일기·재무 분석 모두 여기서
- **목표 비용**: 월 $5~10 (Hermes 데몬 도입 시 OpenRouter 라우팅 활용)

### 7.3 처리 시간
- ActivityWatch 동기화: 10분 cron (현재 운영)
- 헤이즐 일일 리뷰: 매일 21:00 KST cron 또는 헤이즐 능동 트리거
- 페르소나 주간/월간 리뷰: 일요일·말일 자동 또는 수동 호출 (`/거울-리뷰`, `/루터-리뷰` 스킬)
- 노드·관계 자동 정제 (Phase 2-A LLM Wiki): 야간 배치 (매일 03:00 KST)
- 실시간성 요구: **헤이즐 능동 메시지** (Hermes 도입 시) — 이벤트 트리거 즉시 (분 단위)

### 7.4 정확도 요구
- C 레이어 누출 (클라우드 LLM 으로 전송): **0건** (절대 금지)
- 노드 타입 자동 분류 (Vision/Area/Project/Resource/Atomic): false positive 10% 이하 (사용자 confirm 필수)
- Activity → Area 자동 태깅: 70%+ (틀려도 본인이 수정 쉬움)
- 헤이즐 메시지 톤: 가짜 정밀도 금지 (CLAUDE.md 원칙 #7) — 모호 영역에선 "신호" 형태

---

## 8. 저장소 환경

### 8.1 DB
- **Supabase (Postgres)** — 메인 truth source. RLS 활용. ap-southeast-1 또는 ap-south-1 (Vercel 함수와 같은 리전)
- **Google Sheets** — 키움 체결내역의 truth source (Phase 3-A 결정)
- **(향후) Hermes SQLite** (`~/.hermes/state.db`) — 헤이즐 본체 도입 시 대화 메모리 저장소
- **로컬 파일** — Service Account JSON, .env 등 시크릿 (git 제외)

### 8.2 기존 스키마 (재활용 대상)

**핵심 마인드맵·온톨로지**:
- `nodes` (Vision/Area/Project/Resource/Atomic + parent_id)
- `node_links` (cross 링크, weight FLOAT 컬럼 이미 존재)
- `goal_layers` (L1~L5 분해)

**시간 측정 3층**:
- `containers` (Container, type/started_at/ended_at)
- `activity_logs` (Activity, area_node_id 외래키)
- ActivityWatch 원본 — 별도 테이블 또는 raw JSON

**입력 채널**:
- `journal_entries` (Phase 1.5)
- `tasks` / `task_instances` / `recurring_tasks` / `calendar_events`
- `hazel_daily_summaries` / `hazel_persona_reviews`
- `ai_sessions` (대화 요약)
- `github_dev_sessions`

**보조**:
- `area_tagging_rules` (자동 분류 룰)
- `freedom_balance_*` (Phase 1.5-F 자유/균형 측정)

### 8.3 신규 필요 스키마 (Phase 2 LLM Wiki 도입 시)

- `wiki_pages` — Area/Vision/Project 별 자동 생성 Wiki 캐시 (재생성 비용 절감)
- `wiki_atomic_clusters` — Atomic 횡단 클러스터 (지혜 레이어, Phase 2-B)
- `wiki_lint_issues` — 모순·누락·고립 노드 색인
- `wiki_processing_log` — Tier 별 LLM 호출 로그 + 비용 추적

→ wiki-core 가 이 스키마를 추상화 인터페이스로 정의해야 함.

### 8.4 storage-agnostic 요구사항

- **읽기 어댑터**: Supabase 직접 SQL / 시트 API / SQLite 셋 다 지원해야 (Hermes 시점)
- **쓰기 어댑터**: 주로 Supabase, 일부 시트 (체결내역), Hermes SQLite (대화 메모리)
- **truth source 분산**: 단일 DB 가정 X. 도메인별 적절한 저장소 (구글시트 = 체결내역, Supabase = 시간 데이터, SQLite = AI 메모리)
- **민감도 라우팅 hook**: 모든 read/write 시 레이어 (A/B/C) 분류 → C 는 클라우드 LLM 차단

---

## 9. enroute 특수 요구 (다른 도메인에 없을 가능성)

wiki-core 추상화 시 **plott·rootric 에 없을 수 있는 항목** — 이는 enroute config plugin 으로 처리:

1. **Container/Activity/Observation 3층 측정** — 시간의 선언 vs 실측 간극을 명시적으로 다룸. plott (약국 운영) 도 어쩌면 가능, rootric (외부 데이터) 은 X.
2. **Vision 3축 (폭·자유·깊이) + metric_type** — 개인 가치 축 측정. 다른 도메인은 비즈니스 KPI 가 1급 시민.
3. **민감도 3계층 라우팅 (A/B/C)** + **로컬 LLM 강제 (Gemma)** — Enroute 의 일기·재무·가족 등 C 레이어 비중. plott 도 일부 (환자 정보), rootric 은 적음.
4. **헤이즐 능동성 (먼저 말 건다)** — 사용자가 묻기 전에 패턴 감지·메시지. Hermes 같은 always-on 데몬 의존. plott·rootric 은 사용자 호출 기반 가능성 높음.
5. **페르소나 다중 (헤이즐·루터·거울)** — 같은 데이터를 여러 시각으로 분석. plott 의 "플로터" 와 유사하지만 enroute 는 페르소나 톤·역할 차별화 강함.
6. **선언 vs 실측 간극 분석** — 마인드맵 (선언) vs ActivityWatch (실측) 차이가 핵심 인사이트. plott 도 일부 (스케줄 vs 실제 처방 시간), rootric 은 X.
7. **싱글 유저 + 가족 부분 공유** — plott 은 약국 멀티 사용자 가능, rootric 은 SaaS 멀티유저 분리 강함.
8. **온톨로지 우선 원칙** (CLAUDE.md 행동 원칙 #6) — 새 기능 도입 시 온톨로지 매핑부터. plott·rootric 도 비슷한 성격 가능하지만 명문화 정도 차이.
9. **수동 + 자동 입력 혼합 비중** — Enroute 는 사용자 수동 입력 (마인드맵 노드, 일기, 헤이즐 봇) 비중 큼. rootric 은 자동 ingest 비중 압도적.

→ 이 9가지는 **enroute config plugin** 으로 처리하고, wiki-core 는 다음 확장점만 제공:
- 객체 타입 정의 (5종 + 시간 측정 3층 + 외부 입력)
- 라벨링 룰 (분류·민감도)
- 출처 추적 정책
- 시각화 모듈 (시계열·관계 그래프·타임라인 공통)
- LLM 라우터 (Tier 별 모델 선택)
- 저장소 어댑터 (Supabase/Sheets/SQLite)

---

## 10. 다음 단계

1. **plott · rootric 명세서 평행 작성 완료 대기** (rootric 은 이미 완료, plott 작성 중)
2. **3 명세서 비교 워크숍** (Edward 주관) — 항목 1·2·4·5·7·8 교집합이 wiki-core 추상화
3. **wiki-core 추상화 결정** — 풀 추상화 / plugin 모델 / 별도 진행 중 선택
4. **wiki-core 패키지 셋업** — `@wiki-core/engine`, `@wiki-core/router`, `@wiki-core/memory`, `@wiki-core/extractor`, `@wiki-core/renderer` 등
5. **enroute config plugin 작성** — 9가지 특수 요구 매핑
6. **Phase 2-O 온톨로지 갭 분석** (Enroute 측 선결 작업) — Area→Vision 가중치, Activity 질 태그, 4번째 Vision 등 미정 사항 결정 후 wiki-core 합류
7. **Hermes Agent 시범 운영** — 헤이즐 본체 후보로 1주 시범 운영하며 wiki-core 와의 호환성 검증

---

## 부록 — 관련 기존 docs

### 핵심 (Phase 2 / 온톨로지)
- `ROADMAP.md` Phase 2 (LLM Wiki·Goal Track 코칭·Constellation View)
- `ROADMAP.md` Phase 2-O (온톨로지 갭 분석, 2026-04-26 신설)
- `CLAUDE.md` 행동 원칙 #6 (온톨로지 우선) · #7 (측정 vs 판단 경계)
- `docs/phase2_journal_spec.md` — Journal 입력 채널 + AI 파싱 파이프라인

### 시간 측정 3층 모델
- `docs/phase1-5i_container_shift.md` — Container/Activity/Observation 3 Layer 모델 (C안)
- `docs/phase1-5f_freedom_balance_spec.md` — 자유/균형 측정

### 보안·민감도
- `docs/phase1-5d_privacy.md` — 민감도 3계층 + 블랙리스트 정의
- `CLAUDE.md` "민감도 3계층 라우팅" 섹션

### 마인드맵·노드
- `docs/phase1a_mindmap_spec.md` — 마인드맵 기본 구조
- `docs/phase1a2_graph_view_spec.md` — 그래프 뷰
- `docs/phase1a3_goal_track_spec.md` — Goal Track L1~L5

### AI·헤이즐
- `docs/phase1b_hazel_bot_spec.md` — 헤이즐 텔레그램 봇
- `docs/phase1-9-hazel-dashboard.md` — 헤이즐 대시보드 위젯
- `docs/phase2-f-0-persona-split.md` — 페르소나 다중 (헤이즐·루터·거울)

### 입력·실행층
- `docs/phase1-6_execution_layer.md` — 캘린더·아이젠하워·GTD·반복업무
- `docs/phase1-7-insights.md` — 패턴·인사이트

### Phase 3 데이터
- `docs/phase3a-kiwoom-trades.md` — 키움 체결내역 자동 집계 (외부 시트 데이터 통합 사례)

---

**작성 완료 — 2026-04-27**
**다음 액션**: Edward 가 3 도메인 명세서 모두 도착 후 통합 워크숍 시작.
