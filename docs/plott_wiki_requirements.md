# Plott Wiki — 도메인 요구사항 명세서

> wiki-core 공통 패키지(@wiki-core/*) 설계를 위해 plott 측이 제출하는 도메인 명세서.
> 동일 양식을 rootric / enroute가 평행 작성한 뒤, 3 명세서 교집합으로 wiki-core 추상화 결정.
>
> **작성자**: 플로터 (Plott 모노레포 총괄)
> **최초 작성**: 2026-04-27
> **상태**: 초안 (Phase 1 — 평행 작성 단계)
> **참고**: rootric/docs/factsheet_wiki_requirements.md (동일 구조), eopla.net 41642 (팔란티어 온톨로지 4요소)

---

## 0. 도메인 한 줄 정의

> **약국 운영(매뉴얼·정책)과 약무 지식(약물·규정·DUR)을 마크다운 위키로 누적하되, 약국 단위 멀티테넌트와 모임(circle) 단위 5단계 가시성을 지원하여 같은 콘텐츠가 약국 내부 / 모임 내부 / 공개 영역에서 다르게 노출되도록 하는 시스템.**

핵심 사용자 시나리오:
- 약사가 약국 운영 매뉴얼(반품 절차·로테이션)을 위키로 정리하고, 같은 약국 직원만 열람
- 약사 모임이 자체 약무 자료(연수교육·신약 정보)를 모임 내부에만 공유
- 모임 운영자가 일부 자료를 "공개"로 승격 → 비회원도 검색 가능 (약무정책·DUR 같은 공통 지식)
- plott-stock 화면에서 ❓ 버튼 클릭 → 컨텍스트 위키 페이지 사이드패널로 호출

---

## 1. 객체 타입 카탈로그 (Ontology)

> 팔란티어 온톨로지 4요소(Object / Property / Link / Action) 기준으로 약국 도메인을 모델링.

### 1.1 객체 타입 (Object)

| 타입 | 식별자 | 예시 | 출처 |
|---|---|---|---|
| **Drug (약물)** | HIRA 보험약가코드 (product_code) + EAN-13 (standard_code) | 마미렉틴장용정 30T (653405250) | `drug_master` 테이블 (305,522건, plott-stock에서 sync) |
| **DrugIngredient (성분)** | 일반명 코드 | metformin / atorvastatin | `drug_master.ingredient_code` (TBD 정확한 컬럼명) |
| **Disease (질환)** | KCD-7 코드 또는 키워드 | E11 (제2형 당뇨), 고혈압 | 약사 지식·시트 입력 |
| **Pharmacy (약국)** | pharmacies.id (UUID) | "더샵 약국" | `pharmacies` 테이블 (plott-home Phase 1 완료) |
| **Pharmacist (약사)** | users.id (role=admin/pharmacist) | 김약사 | `users` + `pharmacy_members` |
| **Staff (직원)** | users.id (role=staff) | 창고 직원 | `pharmacy_members` |
| **Wholesaler (도매상)** | wholesaler 코드 | geoyoung / baekje / theshop | `user_accounts.wholesaler` (plott-stock) |
| **Regulation (규정)** | 시행일 + 출처 | DUR-병용금기, 약가인하 고시 | 식약처·심평원 공지 |
| **Procedure (절차)** | 약국 ID + 절차명 | 더샵약국/오픈절차 | 약국 자체 매뉴얼 |
| **Policy (정책)** | 약국 ID + 영역 | 더샵약국/적정재고 기준 | 약국 자체 결정 |
| **Circle (모임)** | circles.id (TBD — Phase 2 미구현) | 강남구 약사회 / 신약공부모임 | 신규 `circles` 테이블 필요 |
| **Article (원문)** | url hash | 연수자료 PDF, 식약처 공지 | `wiki_sources` (신규) |
| **Sheet (구글시트)** | sheet_id + tab | 약국매뉴얼.gsheet/조창탭 | plott-wiki ROADMAP에 31개+ 시트 분석 완료 |

### 1.2 객체 속성 (Property)

| 객체 | 속성 예시 | 단위 | 시계열? |
|---|---|---|---|
| Drug | 적정재고, 사용량 추세, 단가 | 개·원·% | ✅ 일/주 (plott-stock 데이터) |
| Drug | 보험약가, EDI코드, 일반명 | 원·코드·텍스트 | ❌ (개정 시점만) |
| Pharmacy | 직원 수, 위치, 거래 도매상 수 | 명·텍스트·개 | △ 변경 시점 |
| Procedure | 단계 수, 담당자 역할, 빈도 | 개·텍스트·텍스트 | ❌ |
| Regulation | 시행일, 적용범위, 만료일 | 날짜·텍스트·날짜 | ❌ |
| Circle | 회원 수, 공개정책, 카테고리 | 명·enum·텍스트 | △ |
| Drug→Disease | 적응증 강도 (추후) | enum (1차/2차 선택) | TBD |

### 1.3 객체 간 허용 관계 (Link)

| 관계 | from → to | 예시 |
|---|---|---|
| `works_at` | Pharmacist/Staff → Pharmacy | 김약사 → 더샵약국 |
| `member_of` | Pharmacist → Circle | 김약사 → 강남구약사회 |
| `owns` | Pharmacy → Procedure/Policy | 더샵약국 → 오픈절차 |
| `treats` | Drug → Disease | 메트포르민 → 제2형 당뇨 |
| `contains` | Drug → DrugIngredient | 마미렉틴장용정 → 성분코드 |
| `replaces` | Drug → Drug | 품절 시 대체약 매핑 |
| `references` | Procedure/Policy → Regulation/Drug | 반품절차 → 약가인하 고시 |
| `regulated_by` | Drug → Regulation | 마약류 → 마약류관리법 |
| `documented_in` | * → Article/Sheet | 약무지식 → 연수자료 |
| `shared_in` | WikiPage → Circle | 신약카드 → 신약공부모임 |
| `supplies` | Wholesaler → Pharmacy | 지오영 → 더샵약국 (정형 데이터, plott-stock) |

### 1.4 행동 (Action / Event)

| 이벤트 | 대상 | 예시 |
|---|---|---|
| `regulation_changed` | Regulation | "약가인하 고시 2026-04-01 시행" |
| `shortage_reported` | Drug | "마미렉틴 30T 전국 품절 2026-04" |
| `alternative_announced` | Drug + Drug | "품절 시 X→Y 대체" |
| `procedure_updated` | Procedure | "더샵약국/오픈절차 v2 (2026-04)" |
| `policy_changed` | Policy | "적정재고 기준 변경 2026-Q2" |
| `training_completed` | Pharmacist + Article | "김약사 연수회 수강" |
| `knowledge_shared` | WikiPage + Circle | "신약카드 → 강남약사회 공유" |
| `visibility_changed` | WikiPage | "private → pharmacy → public" |

---

## 2. 입력 소스 종류

| 소스 | 포맷 | 일일 빈도 | 평균 길이 | 신뢰도 | 처리 우선순위 |
|---|---|---|---|---|---|
| **약사회 연수교육** | PDF | 모임당 월 1-3건 | 5-50K자 | ★★★ 최상 | High (검증된 약무 지식) |
| **식약처·심평원 공지** | HTML / PDF | 5-30건 | 1-20K자 | ★★★ 최상 | High (규정 변경 즉시 반영) |
| **약가 정보 CSV** | 정형 (심평원) | 분기 1회 sync | — | ★★★ | Low (수치 직접 사용, 이미 plott-stock에서 305,522건 sync 중) |
| **약국 자체 매뉴얼 (구글시트)** | gsheet → 시트 분석 완료 31개+ | 약국당 월 1-5건 갱신 | 100-3K자/탭 | ★★ 상 | High (약국 운영 매뉴얼 1차 소스) |
| **약사 개인 메모** | 자유 텍스트 | 약사당 일 0-5건 | 50-500자 | ★ 중 | Mid (private/pharmacy 가시성) |
| **모임 공유 자료** | PDF / 링크 / 텍스트 | 모임당 월 0-10건 | 1-10K자 | ★★ (모임마다 다름) | Mid (가시성 협업 핵심) |
| **drug_master (정형)** | Postgres row | 분기 sync (305K건) | — | ★★★ | Low (객체 마스터로 직접 참조) |
| **plott-stock 운영 데이터** | Postgres row | 5분 wave / 1시간 health | — | ★★ | Low (재고·단가 시계열, Drug 속성으로 연결) |

→ **일일 처리량 추정: 50-200건** (rootric의 1,000-1,500 대비 적음. 약국·모임이 늘면 선형 증가).
→ Tier 0 룰필터로 PLAIN 30% 차단 후 Tier 1-2 처리.

소스별 저장 테이블 (TBD — 신규 정의 필요):
- `wiki_sources` — 원문 메타 (URL/PDF 해시)
- `wiki_pages.is_raw=true` — 원문 본문 보관 (CLAUDE.md 248줄 기존 스키마 활용)
- `drug_master`, `pharmacies`, `pharmacy_members` — 정형 객체 마스터 (재활용)

---

## 3. 분류·라벨링 규칙

### 3.1 문장 단위 분류 (plott 도메인 특화)

> rootric의 FACT/ASSUMPTION/MIXED/PLAIN과 다름 — 약국 도메인은 "예측"보다 "절차·정책·경험"이 핵심.

| 라벨 | 정의 | 예시 |
|---|---|---|
| **FACT** | 검증 가능한 약무 사실 (규정·약물 정보·일반명) | "메트포르민 eGFR<30 금기" / "DUR 병용금기 코드 1342" |
| **PROCEDURE** | 단계적 업무 절차 | "1. 박스 정리 2. 수거 요청 3. 포스 입력" |
| **POLICY** | 약국 자체 정책 (변경 가능) | "분기 사용량 1.5배를 적정재고로 본다" |
| **EXPERIENCE** | 검증되지 않은 약사 경험·노하우 | "X 환자에겐 시럽이 잘 받더라" |
| **WARNING** | 안전·주의·금기 | "신생아 처방 시 dose 재계산 필수" |
| **PLAIN** | 노이즈 (인사말·CSS·중복) | (필터링 대상) |

→ FACT vs POLICY 구분이 핵심: FACT는 약국과 무관하게 참 (약무지식), POLICY는 약국별로 다름 (운영 결정).
→ EXPERIENCE는 검증 전 → 시간 누적되면 FACT/POLICY로 승격 가능 (수동 또는 출처 보강).

### 3.2 카테고리 (PARA 기반 + 도메인 확장)

> CLAUDE.md ROADMAP의 PARA 4분류와 도메인 카테고리 결합.

| PARA | 도메인 카테고리 | 사용처 |
|---|---|---|
| Project | 약가인하 대응 / 약국 이전 / 신약 도입 | 기한 있는 업무 |
| Area | 재고관리 / 조제실 / 접수 / 반품 | 지속 영역 (약국 내부) |
| Resource | 약물카드 / 질환별 가이드 / DUR / 보험청구 | Zettel 형식 약무지식 |
| Archive | 폐기 매뉴얼 / 옛 정책 | 보존만 |

### 3.3 특수 플래그

| 플래그 | 의미 | 영향 |
|---|---|---|
| `is_official` | 공식 출처 (식약처·심평원·연수회) | Wiki에 ★ 표시, EXPERIENCE 라벨 위에 우선 노출 |
| `is_pharmacy_specific` | 약국별 정책 (Procedure/Policy) | 약국 ID 필수, 다른 약국에 노출 X |
| `requires_review` | 검토 대기 (EXPERIENCE→FACT 승격 후보) | 모임 운영자 또는 admin 검토 필요 |
| `is_drug_linked` | drug_master row에 직접 연결 | EAN/HIRA 코드 보장, plott-stock에서 ❓ 버튼으로 호출 |

### 3.4 시간 만료·검증 개념

| 케이스 | 처리 |
|---|---|
| Regulation 시행일·만료일 | `valid_from` / `valid_until` 명시. 만료된 규정은 Archive로 자동 이동 |
| Policy 변경 | 새 버전 등록 → 이전 버전은 versions 테이블에 보존 (CLAUDE.md 220줄 기존 스키마) |
| FACT 갱신 | 약물 가이드라인 개정 시 새 FACT가 들어오면 이전은 "히스토리"로 강등 |
| EXPERIENCE 검증 | 6개월 이상 동일 EXPERIENCE가 누적되면 review 플래그 → FACT 승격 후보 |

---

## 4. 시간축·출처 추적 요구

### 4.1 시간 단위
- **일 (date)**: Regulation 시행, 공지, 약국 정책 변경
- **분기 (Q)**: 약가 개정, 적정재고 재계산
- **년 (YYYY)**: 연수교육 사이클, 라이선스 갱신
- **즉시 (timestamp)**: 약사 메모, 모임 공유 (created_at)

### 4.2 출처 추적 (Provenance)

모든 FACT/PROCEDURE/POLICY/WARNING은 **반드시 출처(Article/Sheet/User) 1건 이상**에 연결.

| 출처 종류 | 필수 메타 |
|---|---|
| Article (PDF/HTML) | url, source(식약처/심평원/연수기관), published_at, hash |
| Sheet (구글시트) | sheet_id, tab_name, last_synced_at |
| User (약사 메모) | author_id, pharmacy_id, created_at |
| Drug DB | drug_master row의 마지막 sync 시점 |

→ 같은 FACT가 여러 출처(연수자료 + 식약처 공지)에 등장하면 **신뢰도 가중치 ↑** (rootric의 strength 개념과 동일).

### 4.3 만료·신선도 (Freshness)

| 콘텐츠 | 만료 처리 |
|---|---|
| Regulation | `valid_until` 도달 시 Archive 자동 이동 |
| Procedure/Policy | 약국별 6개월 무수정 → "최신 가이드라인 확인 필요" Lint 경고 |
| FACT (약물) | 가이드라인 개정 감지(예: 새 연수자료) 시 review 플래그 |
| EXPERIENCE | 만료 없음. 단 6개월 이상 누적되면 review 후보 |

---

## 5. 출력 (Wiki) 포맷

### 5.1 Wiki 페이지 구조

**Drug Wiki (약물별)** — plott-stock에서 ❓ 호출 빈도 높음:

```
# 마미렉틴장용정 30T (보험약가 653405250)

## 한눈에 보기
- 일반명 / 성분 / 효능 / 적응증
- 보험약가 / EDI / EAN / 단가 추세 (plott-stock 시계열)
- 적정재고 (이 약국 기준)

## 복약지도 (FACT)
- (약사회 연수자료, ★ official)

## 주의·금기 (WARNING)
- DUR 병용금기 / 신기능 저하 시 / 임부

## 우리 약국 정책 (POLICY, pharmacy 가시성)
- 적정재고 100T (분기 사용량 기준)
- 폐기 절차: 유기 90일 전 반품 요청

## 관련 규정
- 약가인하 고시 2026-04 (출처: 심평원)

## 약사 노하우 (EXPERIENCE, pharmacy 가시성)
- 김약사 메모: "어린이 환자 시럽 선호"

## 원문 타임라인
(연수자료·공지·메모 시간순)
```

**Procedure Wiki (절차)** — plott-stock/log에서 ❓ 호출:

```
# 반품 절차 (더샵약국 / pharmacy 가시성)

## 단계 (PROCEDURE)
1. 박스 정리 (창고 담당)
2. 수거 요청 (도매상별)
3. 포스 입력

## 관련 규정 (FACT, public)
- 약가인하 고시 → 반품 사유 코드

## 변경 이력
- v2 (2026-04): 도매상별 수거 요청 분리
```

**Topic Wiki (모임별·테마별)** — circles 가시성 적용:

- 신약공부모임 / 강남구약사회 / 인슐린모임
- 같은 주제로 여러 Drug·Regulation 객체가 묶임

### 5.2 자연어 질의 답변 방식

> CLAUDE.md AI 라우팅 로직 기반: Tier 1(Gemma 로컬) 단순 질의, Tier 2(Gemini API) 복잡 질의.

- "마미렉틴 품절 시 대체약?" → Drug:마미렉틴 → `replaces` 관계 → 후보 Drug + EXPERIENCE 메모
- "DUR 1342 코드 뜻?" → Regulation 객체 → FACT 본문 + 출처 링크
- "우리 약국 반품 절차?" → 약국 ID 컨텍스트 → Procedure 객체 (pharmacy 가시성 적용)
- "강남구약사회에서 공유된 신약 자료?" → Circle 객체 → `shared_in` 역방향 → group_internal 페이지

답변 형식: 마크다운 + 출처 링크 카드 + 가시성 뱃지 (FACT는 모든 답변에 출처 필수).

### 5.3 시각화 요소
- 시계열 그래프 (Drug 단가·사용량 — plott-stock 데이터 재사용, Recharts)
- 객체 관계 그래프 (Force layout, react-force-graph) — Drug↔Disease↔Drug 등
- 타임라인 (Regulation 시행일·약국 Procedure 변경 이력)
- 출처 링크 카드 (PDF·시트·메모)

---

## 6. 권한·공유 모델 ★ plott 핵심 차별점

### 6.1 멀티유저 + 멀티테넌트 + 멀티모임

> rootric은 "멀티유저 SaaS", plott은 "멀티유저 + 약국 단위 격리 + 모임 단위 가시성" 3중 구조.

| 단위 | 격리 방식 |
|---|---|
| User | Supabase auth.uid() RLS |
| Pharmacy | `pharmacy_members.pharmacy_id` 매칭 (직원 격리) |
| Circle | `circle_members.circle_id` 매칭 (모임 격리, TBD 신규 테이블) |

### 6.2 5단계 가시성 (Visibility) ★ 핵심

| 레벨 | 누가 볼 수 있나 | 사용 예 |
|---|---|---|
| `private` | 작성자 본인만 | 약사 개인 메모, 미정리 자료 |
| `pharmacy` | 같은 `pharmacy_id` 직원 (admin/pharmacist/staff) | 약국 매뉴얼·정책·운영 절차 |
| `group_internal` | 같은 `circle_id` 회원만 | 모임 내부 자료 (연수회 자료, 신약 정보) |
| `group_public` | 모임 회원 + 비회원도 검색·열람 가능 | 모임이 외부 공개로 승격한 자료 |
| `public` | 누구나 (비로그인 포함) | 약무정책, DUR, 보험청구, 일반 약물 카드 |

→ **가시성 변경은 Action 이벤트로 기록** (`visibility_changed`). 누가 언제 어떤 페이지를 어디로 이동했는지 추적.
→ **directionality 단방향**: private → pharmacy → group_internal → group_public → public (역방향 승격은 가능, 강등은 별도 정책 필요).

### 6.3 역할별 접근 제어

> PLANNER 192-194 "직원이 소모임 접근 불가" 정책 반영.

| 역할 | private | pharmacy | group_internal | group_public | public |
|---|---|---|---|---|---|
| `super_admin` | own | all | all | all | all |
| `admin` (대표약사) | own | own pharmacy | joined circles | all | all |
| `pharmacist` | own | own pharmacy | joined circles | all | all |
| `staff` (창고직원) | own | own pharmacy (read) | ❌ (잠정 차단) | ❌ | all |
| `online_pharmacist` | own | ❌ (자기 약국 없음) | joined circles | all | all |

### 6.4 협업 모델

- **모임 운영자(circle_admin)**: 모임 가입 승인, 페이지 가시성 승격(`group_internal` → `group_public`)
- **약국 대표약사(admin)**: 약국 페이지 가시성 변경, 직원 초대
- **개인 약사**: 자기 메모를 약국·모임으로 공유 (private → pharmacy / group_internal)
- **공개 페이지(public)**: 비로그인 검색 가능, 댓글 가능 (online_pharmacist 페르소나)

---

## 7. AI 모델·라우터 요구

### 7.1 Tier별 모델 후보 (CLAUDE.md 라우팅 기존 결정 + Tier 0 추가)

| Tier | 작업 | 모델 후보 | 비용 | 정확도 요구 |
|---|---|---|---|---|
| **Tier 0** | 룰필터 (CSS·짧은 인사·중복) | 정규식·휴리스틱 | $0 | 거짓음성 5% 이하 |
| **Tier 1** | Ingest 초안, Link 제안, 단순 Query, 분류 | Gemma 4 12B (Ollama 로컬, RTX 4070 SUPER 12GB) | $0 | 80%+ |
| **Tier 2** | 복잡 Query, Lint(모순·노후), 긴 문맥 | Gemini 2.5 Flash-Lite API | 월 $0.1-0.5 | 90%+ |
| **Tier 3** (선택) | 약무 검증 / 위험 메시지 검토 | Claude Sonnet API | 케이스당 $0.001-0.01 | 95%+ (WARNING은 거짓음성 0%) |

→ Tier 0/1이 80% 처리, Tier 2는 주간 Lint + 복잡 질의, Tier 3는 WARNING 라벨 검증에만 한정 사용.

### 7.2 토큰 예산
- 일일 처리량: 50-200건 입력 (약국당 5-20건 + 모임당 1-5건 가정)
- Tier 0/1이 90% 처리 → Tier 2는 일 5-20건
- Wiki 갱신: 객체별 수동 트리거 + 일 1회 백그라운드
- **목표 비용: 월 $0.5 이하** (Tier 2만 paid, CLAUDE.md 비용표 유지)

### 7.3 처리 시간
- 24/7 cron: 백그라운드 Lint 주 1회
- 신규 입력 → Wiki 반영까지 **최대 1시간 lag** 허용
- 약사 직접 입력: 즉시 반영 (Tier 0/1 동기 처리)
- ❓ 버튼 호출 (plott-stock/log): 캐시된 페이지 즉시, 미캐시는 1초 내

### 7.4 정확도 요구

| 라벨 | 거짓양성 (잘못된 분류 추가) | 거짓음성 (놓친 분류) |
|---|---|---|
| WARNING | 5% 이하 (잘못된 안전 정보 = 환자 위험) | **0% 목표** (놓친 안전 경고는 치명적) |
| FACT | 5% 이하 (잘못된 약무 정보) | 10% 허용 |
| PROCEDURE | 10% 허용 | 10% 허용 |
| POLICY | 10% 허용 (약국별이라 영향 적음) | 10% 허용 |
| EXPERIENCE | 20% 허용 (검증 전) | 20% 허용 |
| 출처 매핑 | 100% 정확 (모든 FACT/WARNING은 원문 링크 보존) | — |
| 객체 추출 | 70%+ (틀린 객체보다 누락이 낫다) | — |

---

## 8. 저장소 환경

### 8.1 DB
- **Supabase (Postgres + pgvector + RLS)** — 기존 인프라
- plott-home / plott-stock / plott-finance / plott-admin 모두 동일 Supabase 인스턴스
- 마이그레이션은 Supabase MCP로 적용 (PLANNER 235줄 참조)

### 8.2 기존 스키마 (재활용 대상)

| 테이블 | 출처 | 활용 방식 |
|---|---|---|
| `users` (role enum) | plott-home Phase 1 | 권한 체크 |
| `pharmacies` | plott-home Phase 1 | Pharmacy 객체 마스터 |
| `pharmacy_members` | plott-home Phase 1 | 약국 멤버십 (RLS 키) |
| `drug_master` (305,522건) | plott-stock | Drug 객체 마스터 (HIRA + EAN) |
| `wiki_pages` (CLAUDE.md 220줄) | plott-wiki MVP | 마크다운 본문 |
| `wiki_links` | plott-wiki MVP | [[위키링크]] 백링크 |
| `wiki_versions` | plott-wiki MVP | 버전 히스토리 |
| `wiki_embeddings` | plott-wiki MVP | pgvector 유사도 |

### 8.3 신규 필요 스키마

| 테이블 | 용도 | 비고 |
|---|---|---|
| `wiki_objects` | 객체 노드 (Drug/Procedure/Regulation 등) | 타입 + 외부 ID(drug_master 등) FK |
| `wiki_attributes` | 속성 시계열 (Drug 단가·재고) | plott-stock inventory_snapshots와 정합 |
| `wiki_relations` | 관계 엣지 (treats/replaces/references) | from·to·type |
| `wiki_events` | Action 이벤트 (regulation_changed 등) | 시간점 |
| `wiki_visibility` | 페이지 가시성 메타 | private/pharmacy/group_internal/group_public/public + scope_id |
| `wiki_sources` | 원문 메타 | URL·hash·source 종류 |
| `circles` (★ plott 신규) | 모임 마스터 | name·category·visibility_default |
| `circle_members` (★ plott 신규) | 모임 멤버십 | circle_id·user_id·role(circle_admin/member) |

→ **plott-home Phase 2의 circles 스펙과 통합 필요** (PLANNER 184-194). plott-wiki가 단독으로 진행하면 충돌. 통합 스펙 단일 세션 필요.

### 8.4 storage-agnostic 요구사항

- wiki-core는 **Postgres·SQLite·Firestore 등 어떤 저장소도 어댑터로 받을 수 있어야** 함
- plott: Supabase Postgres + RLS (멀티테넌트 + 모임 가시성)
- rootric: Supabase Postgres + RLS (멀티유저 SaaS) — 가시성은 2단계
- enroute: SQLite 가능성 (단일 유저, 로컬)
- 인터페이스: `WikiStorage`, `WikiVisibilityProvider`, `WikiAuthContext` 추상화 필요

---

## 9. plott 도메인 특수 요구 (다른 도메인에 없을 가능성 高)

> wiki-core 코어가 아니라 **plott 전용 plugin**으로 분리될 가능성이 높은 항목.

1. **5단계 가시성 (private / pharmacy / group_internal / group_public / public)** — rootric은 2단계(공개/유저별 비공개), enroute는 1단계(전부 비공개) 가능성. plott은 5단계 + scope_id(pharmacy_id / circle_id) 매핑이 핵심.
2. **약국 단위 멀티테넌트** — 같은 plott 인스턴스에서 N개 약국이 격리 운영. 직원은 자기 약국 외 접근 불가. rootric/enroute에 없음.
3. **모임(circle) 가시성 + 직원 차단** — 모임은 약사만, 직원은 잠정 차단 (PLANNER 194줄). rootric에 없음.
4. **drug_master 외부 강결합** — Drug 객체는 plott-stock의 305K건 row와 strong link (HIRA + EAN). 위키에서 약물 페이지 자동 생성 시 drug_master row가 source-of-truth. rootric은 stock master, enroute는 외부 마스터 없음.
5. **plott-stock/log 화면에서 ❓ 호출** — 위키가 단독 SaaS가 아니라 다른 plott 앱의 컨텍스트 도움말로 쓰임. URL 슬러그 + 컨텍스트(약국 ID·약물 ID) 라우팅 필요.
6. **시트→마크다운 자동 변환** — 약국별 구글시트 31개+가 1차 입력 (CLAUDE.md ROADMAP 84-127). Sheet 객체 + Tab 단위 sync 필요. rootric/enroute에 없음.
7. **FACT vs POLICY 구분** — rootric은 FACT/ASSUMPTION(예측), plott은 FACT(약무지식, 약국 무관)/POLICY(약국별 정책)로 축이 다름.
8. **약국 정책의 가시성 자동 결정** — POLICY는 자동으로 `pharmacy` 가시성, FACT는 `public` 권장 등 라벨→가시성 자동 매핑.
9. **WARNING 라벨의 거짓음성 0% 요구** — 환자 안전 직결, AI 검증 후 수동 confirm 필요. rootric은 비슷한 절대 정확도 요구 없음.
10. **앱 연동 API (`GET /api/wiki/{slug}`)** — plott-stock/log/label에서 호출. 가시성 컨텍스트(어느 약국, 어느 모임)를 헤더로 전달받아야 함.

→ wiki-core는 **확장점(extension point)만 제공**, 위 10항은 plott config plugin (`@wiki-core/plugin-plott`)으로 구현하는 게 맞음.

---

## 10. 부록 — 관련 기존 docs

이미 작성된 plott 측 docs 파일 인덱스:

| 파일 | 내용 |
|---|---|
| `plott-wiki/CLAUDE.md` | wiki-core 공유 전략, AI 라우팅, DB 스키마 초안, 위키 구조(약국 매뉴얼·약무지식) |
| `plott-wiki/ROADMAP.md` | Phase 구현 계획 (MVP→v2.0), PARA 레이어, 시트 분석 결과 31개+ |
| `PLANNER.md` (160-166줄) | wiki-core 공유 전략 결정 (2026-04-16) |
| `PLANNER.md` (168-194줄) | plott-home Phase 1 완료 + Phase 2(circles/wiki) 미정. circles 스펙 작성 시 wiki 가시성 통합 필요 |
| `plott-stock/CLAUDE.md` | 5계층 역할(super_admin/admin/pharmacist/staff/online_pharmacist) — wiki 권한 모델 일치 |
| `plott-home/SPEC/unified-app-architecture.md` | 통합 앱 아키텍처 (2026-04-23) |
| `plott-home/SPEC/unified-app-phase1.md` | Phase 1 완료 스펙 (pharmacies/pharmacy_members) |
| `plott-stock/backend/app/api/drug_master.py` | drug_master sync 305K건 (Drug 객체 마스터) |

미작성 / TBD:
- `plott-home/SPEC/unified-app-phase2-circles.md` — circles 테이블 스펙 (이 명세서와 통합 작업 필요)
- `plott-wiki/SPEC/wiki-core-architecture.md` — 3 명세서 합쳐서 작성 (Phase 2)

---

## 다음 단계 (Phase 1 → 2)

1. **enroute 명세서 평행 작성 대기** — 이 문서와 동일 양식
2. **3 명세서 비교** — 공통 추상화 후보:
   - 1.1 객체 타입 카탈로그 / 1.3 관계 / 1.4 행동 → 모든 도메인 공통 (Object/Property/Link/Action)
   - 2 입력 소스 → 어댑터 인터페이스만 공통, 구체 소스는 plugin
   - 4 시간축·출처 → 공통 (provenance 인터페이스)
   - 5.3 시각화 → 공통 (그래프 + 타임라인 + 카드)
   - 7 AI 라우터 → 공통 (Tier 추상화 + 모델 주입)
   - 8.4 storage-agnostic → 공통 (WikiStorage 인터페이스)
3. **plott 전용 plugin 영역 (Section 9의 10항)** — `@wiki-core/plugin-plott`
4. **단일 통합 세션 (에드워드 주관)** — wiki-core 추상화 결정 (풀 추상화 / plugin 모델 / 별도 진행 중 선택)

---

## 작성 시 가정 / TBD

- **drug_master 정확한 스키마**: ingredient_code 컬럼 등 일부 항목은 검증 필요 (현재는 product_code/standard_code/item_code 확인됨)
- **circles 테이블 구조**: PLANNER에 "Phase 2 미정"으로만 기록, 실제 스키마는 plott-home에서 결정
- **Sheet 객체**: 31개+ 시트의 자동 sync 방식 (Apps Script / 수동 export) 미정
- **Tier 3 (Claude Sonnet) 사용 여부**: WARNING 라벨 검증에 한정, 비용·필요성은 Phase 2 운영 후 판단
- **모임 가시성 강등 정책**: `group_public` → `group_internal` 강등 시 캐시·검색 색인 어떻게 처리할지 TBD
- **약국·모임 동시 소속 시 우선순위**: 같은 페이지가 약국·모임 양쪽에 공유될 때 라우팅 규칙 TBD
