# Rootric Factsheet Wiki — 도메인 요구사항 명세서

> wiki-core 공통 패키지(@wiki-core/*) 설계를 위해 rootric 측이 제출하는 도메인 명세서.
> 동일 양식을 plott / enroute가 평행 작성한 뒤, 3 명세서 교집합으로 wiki-core 추상화 결정.
>
> **작성자**: 로고스 (rootric 팩트시트 담당 AI)
> **최초 작성**: 2026-04-26
> **상태**: 초안 (Phase 1 — 평행 작성 단계)

---

## 0. 도메인 한 줄 정의

> **개인 가치투자자가 종목을 분석할 때 필요한 사실(공시·리포트·뉴스·정책)을 자동 수집·분류·누적하여, 종목별·테마별 Wiki 페이지 형태로 시간축과 출처를 추적 가능하게 제공하는 시스템.**

핵심 사용자 시나리오:
- "삼성전자 HBM 점유율 변화"를 묻고 싶다 → 시간순 FACT 누적 + 출처 링크 + 시각화
- "내가 작성한 가정(ASSUMPTION)이 실적 발표 후 어떻게 검증되었는가"
- "반도체 섹터 전체에서 최근 3개월간 보고된 capex 발표"

---

## 1. 객체 타입 카탈로그

도메인의 entity 종류, 각 객체의 속성, 객체 간 허용 관계.

### 1.1 객체 타입

| 타입 | 식별자 | 예시 | 출처 |
|---|---|---|---|
| **Stock (종목)** | ticker (6자리) | 005930 (삼성전자) | covered_stocks 테이블 |
| **Sector (섹터)** | sector_code | semiconductor / finance / ... | docs/sector_spec.md 12섹터 |
| **BusinessUnit (사업부)** | parent_ticker + name | 삼성전자/메모리 | 공시·리포트에서 추출 |
| **Product (제품)** | name | HBM3E / 1c DRAM | 공시·뉴스에서 추출 |
| **Customer (고객)** | name (or ticker) | 엔비디아 / 애플 | 공시·뉴스 |
| **Competitor (경쟁사)** | ticker (or name) | SK하이닉스 / TSMC | 공시·리포트 |
| **Policy (정책)** | policy_id | CHIPS Act / EUV 수출규제 | 정부 공시 |
| **MacroEvent (거시)** | event_type | 금리 인상 / 환율 / 경기지표 | 경제 뉴스 |
| **Person (인물)** | name | 이재용 / 최태원 | 공시·뉴스 (선택적) |
| **Article (원문)** | url hash | 특정 기사·리포트·공시 1건 | factsheet_articles 테이블 |

→ **객체 타입은 12섹터 × 평균 5-7 객체로 확장 예정**. `docs/sector_spec.md`에 섹터별 카탈로그 존재 (반도체 24개 KPI 완성).

### 1.2 객체 속성 (Attribute)

각 객체 타입이 가질 수 있는 속성. 시계열 변화 추적이 핵심.

| 객체 | 속성 예시 | 단위 | 시계열? |
|---|---|---|---|
| Stock | 시가총액, PER, PBR, ROE | 원, 배, % | ✅ 분기/일 |
| BusinessUnit | 매출, 영업이익, 점유율 | 억원, % | ✅ 분기 |
| Product | 출하량, ASP, capex 비중 | 단위/원/% | ✅ 분기 |
| Sector | 산업 평균 PER, 평균 OPM | 배, % | ✅ 분기 |
| Policy | 시행일, 적용 범위 | 날짜, 텍스트 | ❌ |
| MacroEvent | 발생일, 수치 | 날짜, 수치 | ✅ 일 |

### 1.3 객체 간 허용 관계 (Relation)

| 관계 | from → to | 예시 |
|---|---|---|
| `belongs_to` | BusinessUnit → Stock | 메모리 → 삼성전자 |
| `produces` | BusinessUnit → Product | 메모리 → HBM3E |
| `supplies_to` | Stock → Customer | 삼성전자 → 엔비디아 |
| `competes_with` | Stock ↔ Stock | 삼성전자 ↔ SK하이닉스 |
| `affected_by` | Stock → Policy/MacroEvent | 삼성전자 → CHIPS Act |
| `mentioned_in` | * → Article | 임의 객체 → 원문 |

### 1.4 행동 (Event)

객체에 일어난 시간점 사건. Wiki에 타임라인 형태로 누적.

| 이벤트 | 대상 | 예시 |
|---|---|---|
| `mass_production_start` | Product | "HBM3E 양산 시작 2025-Q1" |
| `capex_announced` | Stock + BusinessUnit | "메모리 17조 capex 2025" |
| `m_a` | Stock | "삼성전자 ↔ Harman 인수 완료" |
| `policy_enacted` | Policy | "CHIPS Act 2026-03-15 시행" |
| `earnings_release` | Stock | "2025-Q1 실적 발표" |
| `target_price_change` | Stock + Article | "리포트 목표가 95,000→110,000" |

---

## 2. 입력 소스 종류

어떤 텍스트가 들어오는지 (포맷, 출처, 빈도, 평균 길이).

| 소스 | 포맷 | 일일 빈도 | 평균 길이 | 신뢰도 | 처리 우선순위 |
|---|---|---|---|---|---|
| **DART 공시** | HTML / PDF | 50-200건 | 5-50K자 | ★★★ 최상 | High (실적·중요공시) |
| **증권사 리포트** | PDF / HTML | 30-100건 | 3-20K자 | ★★ 상 | High (목표가·전망 핵심) |
| **경제 뉴스** | HTML | 200-1000건 | 500-3K자 | ★ 중 | Mid (노이즈 多) |
| **정부 정책** | HTML / PDF | 5-20건 | 2-10K자 | ★★★ 최상 | Mid (영향 객체 많음) |
| **컨센서스 데이터** | 정형 JSON | 일 1회 sync | — | ★★★ | Low (수치 직접 사용) |
| **유저 메모** | 자유 텍스트 | 유저당 일 0-10건 | 50-500자 | — | High (개인화) |

→ **일일 처리량: ~1,000-1,500건** (뉴스 압도적). 라우터로 60% 이상 PLAIN 필터 필수.

소스별 저장 테이블:
- `dart_disclosures_parsed` (DART 본문)
- `factsheet_news` (뉴스 크롤링)
- `reports` (증권사 리포트)
- `policy` (정부 정책)
- `consensus` (수치 데이터)

---

## 3. 분류·라벨링 규칙

문장/객체에 붙이는 라벨 종류와 분류 기준.

### 3.1 문장 단위 분류 (현재 구현 중)

| 라벨 | 정의 | 예시 |
|---|---|---|
| **FACT** | 검증 가능한 과거·현재 사실 | "2024년 매출 300조" |
| **ASSUMPTION** | 미래 예측·전망·가정 | "2026년 HBM 점유율 50% 전망" |
| **MIXED** | 사실 + 숨은 가정 | "AI 수요 폭발로 매출 증가" (AI 수요=가정) |
| **PLAIN** | 노이즈·CSS·광고·단순 인사 | (필터링 대상) |

### 3.2 카테고리 (4종)

| 카테고리 | 사용처 |
|---|---|
| stock | 종목 직접 영향 |
| policy | 정책·규제 |
| rate | 금리·환율 |
| economy | 거시 경제 |

### 3.3 핵심 가정 플래그 (`is_key`)

ASSUMPTION 중 **유저 의사결정에 결정적 영향**을 주는 가정만 별도 플래그.
- 리포트의 핵심 가정: 0-3건
- 공시·사업보고서: 0-5건
- 뉴스·단신: 0-1건 (대부분 0)

### 3.4 시간 만료 (`expires_at`)

ASSUMPTION 중 시간 경과로 검증되는 것:
- "2026-Q1 실적 흑자 전환" → expires_at = 2026-Q1 실적발표일
- 만료된 ASSUMPTION은 **검증 결과(맞았다/틀렸다)**와 함께 별도 섹션 노출

---

## 4. 시간축·출처 추적 요구

### 4.1 시간 단위
- **분기 (Q1-Q4)**: 실적·재무 데이터 (financial_data)
- **일 (date)**: 공시·뉴스·정책 발표일 (`published_at`)
- **년도 (YYYY)**: Forecast 입력·연간 추세

### 4.2 출처 추적 (Provenance)

모든 FACT/ASSUMPTION은 **반드시 원문(Article) 1건 이상**에 연결.
- `article.url` (원본 URL)
- `article.source` (DART / 증권사명 / 언론사)
- `article.published_at` (발표일)
- 동일 사실이 여러 원문에 등장하면 → "강도(strength) = 출처 수" 가중치

### 4.3 만료·신선도 (Freshness)
- ASSUMPTION: `expires_at` 명시
- FACT: `valid_from` (발표 시점)
- 같은 객체·속성에 대해 **새로운 FACT가 들어오면 이전 FACT는 "히스토리"로 강등**, 최신 1건이 "현재값"

---

## 5. 출력 (Wiki) 포맷

### 5.1 Wiki 페이지 구조

**Stock Wiki (종목별)** — 가장 자주 보는 출력:

```
# 삼성전자 (005930)

## 한눈에 보기
- 시가총액 / PER / PBR / ROE (현재값 + 1년 변화)
- 사업부 비중 (메모리 35% / 파운드리 20% / ...)

## 사업 구조 (객체 그래프 view)
- 사업부 → 제품 → 고객 트리

## 최근 핵심 사실 (FACT, 시간순 30일)
- [2026-04-25] HBM3E 엔비디아 공급 시작 (출처: DART, 매일경제 외 5건)
- [2026-04-20] 메모리 capex 17조 발표 (출처: 사업보고서)

## 진행 중인 가정 (ASSUMPTION, expires_at 임박순)
- [~2026-Q2 실적] HBM 점유율 50% 회복 (★ 핵심가정, 출처: 미래에셋 리포트)
- [~2026-12] 1c DRAM 양산 (출처: 공시)

## 만료된 가정 (검증 결과)
- [2026-Q1 실적, ✅ 적중] 영업이익 9조 → 실제 9.2조
- [2026-Q1 실적, ❌ 빗나감] HBM 점유율 55% → 실제 48%

## 관련 정책·거시
- CHIPS Act, EUV 수출규제, 환율 1,400원대 ...

## 원문 타임라인
- 30건 시간순 (지금 timeline UI 그대로)
```

**Topic Wiki (테마별)** — 예: "HBM 시장":
- 같은 주제로 여러 종목 객체가 묶임
- 점유율 변화 그래프, 주요 사건 타임라인

**Sector Wiki (섹터별)** — 예: "반도체":
- 12섹터 docs/sector_spec.md 24 KPI 기반 자동 집계

### 5.2 자연어 질의 답변

유저 질문 → 그래프 탐색 → 답변:
- "삼성 HBM 점유율 최근 어땠어?" → BusinessUnit:메모리 → Product:HBM3E → 속성:점유율 시계열 추출
- "내가 한 가정 중 빗나간 거 보여줘" → ASSUMPTION + expires_at < now + 검증 결과

### 5.3 시각화 요소
- 시계열 그래프 (속성 변화)
- 객체 관계 그래프 (Force layout)
- 타임라인 (이벤트 시간순)
- 출처 링크 카드

---

## 6. 권한·공유 모델

### 6.1 멀티유저
- **rootric은 멀티유저 SaaS** — 유저별 분리 필수
- Supabase RLS로 row-level 격리 (auth.uid() 기준)

### 6.2 공개·비공개 단위

| 데이터 | 가시성 | 비고 |
|---|---|---|
| Wiki 페이지 (자동생성) | **공개** | 모든 유저 공유 (DART/리포트/뉴스 기반이므로) |
| 유저 메모 / 매매 / 가정 | **비공개** | 작성자만 |
| 유저가 추가한 FACT/태깅 | 선택 | 비공개 default, "공유" 버튼 |
| 공유된 Wiki 스냅샷 | 공개 (URL) | 특정 시점 freeze, 만료 가능 |

### 6.3 협업 모델
- 1차 페르소나(학습자): 읽기 위주
- 1.5차(훈련기): 자기 메모·가정 추가
- 2차(공유형): 자기 분석 Wiki 공개·구독

→ docs/target_persona.md 참고

---

## 7. AI 모델·라우터 요구

### 7.1 Tier별 모델 후보 (현재 인프라 기준)

| Tier | 작업 | 모델 후보 | 비용 | 정확도 요구 |
|---|---|---|---|---|
| **Tier 0** | 룰필터 (CSS·광고·짧은 문장) | 정규식·휴리스틱 | $0 | 거짓음성 5% 이하 |
| **Tier 1** | 카테고리 (stock/policy/rate/economy) | Gemini Flash Lite | 무료 500/일 | 80%+ |
| **Tier 2** | FACT/ASSUMPTION 분류 + 객체 추출 | gemma3:12b 로컬 OR Gemini Flash | 로컬 $0 / Flash 무료 | 85%+ (현재 80%) |
| **Tier 3** | Wiki 생성·자연어 질의 | Gemini Pro / Claude Sonnet | 페이지당 $0.001-0.01 | 90%+ (출처 정확) |

### 7.2 토큰 예산
- 일일 처리량: 1,000-1,500건 입력
- Tier 0이 60% 차단 → Tier 1-2 처리 400-600건
- Wiki 갱신: 객체별 일 1회 (~50-100 객체) → Tier 3 호출
- **목표 비용: 월 $10 이하** (Tier 3만 paid)

### 7.3 처리 시간
- 24/7 가능해야 함 (cron 백그라운드)
- 신규 입력 → Wiki 반영까지 **최대 1시간 lag** 허용
- 핵심 공시·리포트는 30분 이내 반영

### 7.4 정확도 요구
- FACT 분류: false positive 5% 이하 (잘못된 사실이 Wiki에 들어가면 신뢰 붕괴)
- 출처 매핑: 100% 정확 (모든 FACT는 원문 링크 보존)
- 객체 추출: 70%+ (틀린 객체보다 누락이 낫다)

---

## 8. 저장소 환경

### 8.1 DB
- **Supabase (Postgres)** — 기존 인프라. RLS 활용
- BigQuery 직접 쿼리 금지 (3월 ₩80만 사고 이력)
- 배치 동기화: BQ → daily_sync.py → Supabase

### 8.2 기존 스키마 (재활용 대상)
- `factsheet_articles` — 원문·ai_analysis JSONB
- `factsheet_topics` — 토픽 누적 (현재 단순 분류, 그래프 X)
- `dart_disclosures_parsed`, `factsheet_news`, `reports`, `policy` — 입력 소스
- `covered_stocks` — 종목 마스터 (sector·industry 컬럼 활용 가능)
- `financial_data`, `price_data`, `consensus` — 정형 수치

### 8.3 신규 필요 스키마
- `wiki_objects` (객체 노드)
- `wiki_attributes` (속성 시계열)
- `wiki_relations` (관계 엣지)
- `wiki_events` (행동·이벤트)
- `wiki_pages` (생성된 Wiki 페이지 캐시)
- `wiki_processing_log` (캐시·중복 회피)

→ wiki-core가 이 스키마를 추상화 인터페이스로 정의해야 함.

### 8.4 저장 어댑터 요구
- wiki-core는 **storage-agnostic** 이어야 함
  - rootric: Supabase (Postgres + RLS)
  - plott: 다를 수 있음
  - enroute: SQLite 가능성 있음

---

## 9. rootric 특수 요구 (다른 도메인과 다를 가능성 高)

wiki-core 추상화 시 **plott·enroute에 없을 수 있는 항목**:

1. **FACT/ASSUMPTION 분류** — 가치투자 특화. plott은 주제 분류, enroute는 태그 분류.
2. **`is_key` 핵심가정 플래그** — 투자 의사결정 특화.
3. **`expires_at` + 검증 결과 추적** — 예측의 사후 검증. enroute에 일부 가능, plott은 X.
4. **시계열 속성 변화 추적** — 종목 점유율·매출 추세. enroute의 습관 추적과 일부 유사.
5. **멀티유저 RLS** — plott도 가능, enroute는 싱글유저 가능성 高.
6. **공식 출처 신뢰도 등급** (DART > 리포트 > 뉴스) — rootric 특화.

→ 이 6가지는 **rootric config plugin**으로 처리하고, wiki-core는 **확장점(extension point)**만 제공하는 게 맞을 듯.

---

## 10. 다음 단계

1. **plott·enroute 명세서 평행 작성** (이 문서와 동일 양식)
2. **3 명세서 비교** — 항목 1·2·4·5·7·8 교집합이 wiki-core 추상화
3. **wiki-core 패키지 셋업** (`@wiki-core/engine`, `@wiki-core/router`, `@wiki-core/memory`, `@wiki-core/extractor`, `@wiki-core/renderer`)
4. **rootric config plugin 작성** (FACT/ASSUMPTION, is_key, expires_at, 출처 등급)
5. **plott·enroute 합류**

---

## 부록: 관련 docs

- `docs/factsheet_scoring_spec.md` — Section 8 LLM-Wiki 설계 (선행 작업)
- `docs/factsheet_ux_flow.md` v3 — News feed + 누적 팩트시트
- `docs/factsheet_ingest_pipeline.md` — 현재 ingest 파이프라인
- `docs/sector_spec.md` — 12섹터 KPI 카탈로그 (객체 타입 카탈로그 원천)
- `docs/target_persona.md` — 1차/1.5차/2차 페르소나
