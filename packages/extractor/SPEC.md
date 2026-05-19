# @wiki-core/extractor — SPEC

> wiki-core extractor 패키지. 계층 구조 문서(PDF·Markdown·HWP 등)에서 4요소를 추출하기 위한 **추출 파이프라인 레이어** 표준.
>
> **작성자**: 머큐리 (wiki-core 코어 아키텍트)
> **작성일**: 2026-05-19
> **세션**: Mercury 22차 (Phase 3+ 신규 패키지 — 4자 검증 통과 후 박제)
> **선행**: `packages/core/SPEC.md`, `packages/router/SPEC.md` (ModelHandle)
> **4자 검증**: rootric(로고스) + enroute(루터) + plott(플로터) + CroNode — 설계 방향 채택 권고, ContentRange 유니온 수정 4자 동의
>
> **status**: 1차 SPEC.

---

## 0. 목적·scope

### 0.1 왜 extractor가 별도 패키지인가 — 레이어 분리 원칙

wiki-core 4요소(WikiObject/WikiAttribute/WikiRelation/WikiEvent)는 **지식 그래프의 구성요소**다.
DocumentTree는 **추출 과정의 중간 구조물(processing artifact)**다.

두 레이어를 섞으면 발생하는 문제:
- `wiki_objects` 테이블에 섹션 포인터가 저장 → 지식 그래프 오염
- `WHERE type = 'section'` 쿼리 필요 → 두 레이어 경계 붕괴
- 추출 과정이 변경될 때마다 코어 인터페이스 변경 필요

**분리 원칙**:

```
Extraction Layer (@wiki-core/extractor)
    DocumentNode / DocumentTree / ContentRange
    navigateTree() — LLM 계층 탐색
    hybridExtract() — tree + vector 혼용
           ↓ (plugin이 변환)
Knowledge Layer (@wiki-core/core, 4요소)
    WikiObject / WikiAttribute / WikiRelation / WikiEvent
```

추출 결과물만 4요소로 변환되어 코어에 저장. **변환은 plugin 책임**.

### 0.2 코어가 제공하는 것

- `DocumentNode` / `DocumentTree` — 트리 구조 타입
- `ContentRange` — PDF 페이지·Markdown 섹션·라인 오프셋 유니온
- `navigateTree()` — ModelHandle을 사용한 LLM 계층 탐색 함수
- `hybridExtract()` — tree + vector 혼용 라우터
- `ExtractStrategy` — 추출 전략 유니온 타입

### 0.3 코어가 *제공하지 않는* 것

| 영역 | 이유 | 책임 |
|---|---|---|
| PDF 파서 (PyMuPDF 등) | 도메인 환경 의존 | plugin |
| HWP 파서 | plott 전용 | `@plott/plugin` |
| Markdown 파서 | enroute 전용 | `@enroute/plugin` |
| DocumentTree 생성 (LLM 호출로 트리 빌드) | 비용·모델 선택 도메인 결정 | plugin |
| 벡터 임베딩 / 벡터 DB | 도메인 인프라 | plugin |
| 4요소 변환 로직 | 도메인 스키마 의존 | plugin |

### 0.4 의존성

- `@wiki-core/core` — `JSONValue` 등 기본 타입
- `@wiki-core/router` — `ModelHandle` (navigateTree에서 재사용)
- **no storage / no renderer 의존** — 추출 파이프라인은 저장 전 단계

---

## 1. ContentRange 유니온 (Mercury 22차 — 4자 동의)

PageRange를 ContentRange 유니온으로 대체. PDF(rootric·plott·CroNode)와 Markdown(enroute) 공존.

```typescript
export type ContentRange =
  | { type: 'page';    start_page: number; end_page: number }  // PDF: rootric, plott, CroNode
  | { type: 'section'; id: string }                            // Markdown: enroute 헤딩 섹션 id
  | { type: 'offset';  start: number; end: number }            // 라인 오프셋: enroute fallback
```

**`page` 타입 필드명 (`start_page`/`end_page`) 근거** (CroNode 기술 근거):

| 이유 | 설명 |
|---|---|
| PageIndex 원본 정합 | `get_page_content('2-3')` — 페이지 번호 기반 |
| PyMuPDF 1:1 매핑 | `doc[start_page:end_page]` — 전체 메모리 적재 불필요 |
| DART PDF 안전 | 한국어 + 표 혼합 레이아웃 → 문자 인덱스 경계 보장 X |

**`pageReader` 시그니처** (4자 동의):

```typescript
pageReader: (range: ContentRange) => Promise<string>
```

`pageReader`는 완전히 **plugin 책임**. 파서 종류(PyMuPDF / libreoffice HWP / gray-matter Markdown)에 무관하게 extractor 인터페이스는 변경 없음.

---

## 2. DocumentNode / DocumentTree 타입

```typescript
export interface DocumentNode {
  /** 트리 내 유일 식별자. PageIndex 원본: "0006" */
  node_id: string;
  /** 섹션 제목 (선택) */
  title?: string;
  /** LLM이 생성한 섹션 요약 — navigateTree 탐색 판단 기준 */
  summary: string;
  /** 루트 = 0, 자식으로 갈수록 증가 */
  depth: number;
  /** 문서 내 위치 */
  range: ContentRange;
  /** 자식 노드 (리프 노드는 빈 배열) */
  children: DocumentNode[];
}

export interface DocumentTree {
  /** plugin이 부여하는 문서 식별자 */
  doc_id: string;
  /** 문서 제목 */
  title?: string;
  /** 문서 전체 요약 (PageIndex --if-add-doc-description에 해당) */
  description?: string;
  /** 원본 포맷 — pageReader 구현 선택에 참고 */
  format: 'pdf' | 'markdown' | 'html' | 'hwp' | (string & {});
  /** 트리 루트 노드 */
  root: DocumentNode;
}
```

**PageIndex 원본 JSON → DocumentNode 매핑**:

```json
// PageIndex 원본
{
  "title": "Financial Stability",
  "node_id": "0006",
  "start_index": 21,
  "end_index": 22,
  "summary": "...",
  "nodes": [...]
}

// DocumentNode 변환 (plugin 책임)
{
  "node_id": "0006",
  "title": "Financial Stability",
  "summary": "...",
  "depth": 1,
  "range": { "type": "page", "start_page": 21, "end_page": 22 },
  "children": [...]
}
```

`start_index`/`end_index` → `range.start_page`/`range.end_page`. plugin이 변환.

---

## 3. navigateTree 함수

### 3.1 시그니처

```typescript
export interface NavigateTreeOptions {
  /** LLM 탐색 최대 반복 횟수. 기본 10. */
  maxIterations?: number;
  /** 단일 페이지 읽기 최대 범위 (page 타입 기준). 기본 10. */
  maxPagesPerRead?: number;
}

export interface NavigateResult {
  /** 선택된 콘텐츠 범위 목록 */
  ranges: ContentRange[];
  /** LLM 탐색 경로 (루트 → 선택 노드) */
  path: DocumentNode[];
  /** 실제 반복 횟수 */
  iteration_count: number;
  /** 방문한 node_id 목록 */
  nodes_visited: string[];
}

export async function navigateTree(
  tree: DocumentTree,
  query: string,
  model: ModelHandle,                                   // @wiki-core/router 재사용
  pageReader: (range: ContentRange) => Promise<string>, // plugin 제공
  options?: NavigateTreeOptions
): Promise<NavigateResult>
```

### 3.2 탐색 루프 — PageIndex 4-step 패턴 구현

PageIndex의 Agentic tool-calling 루프를 `navigateTree` 내부로 캡슐화:

| PageIndex step | navigateTree 구현 |
|---|---|
| `get_document()` | `tree.title` + `tree.description` 프롬프트 포함 |
| `get_document_structure()` | 트리 노드 요약 직렬화 → 프롬프트 context |
| `get_page_content(pages)` | `pageReader(range)` callback 호출 |
| Final Answer | `NavigateResult` 반환 |

**구현 방식**: structured prompt 기반 (ModelHandle tool_use 비의존). 어떤 ModelHandle이든 동작.

```
Iteration 1: 트리 구조 요약 → LLM이 탐색할 노드 선택 (node_id 리스트)
Iteration 2+: 선택된 노드 content 읽기 → 충분히 찾았으면 종료, 아니면 깊이 탐색
```

### 3.3 ingest hook 연결 패턴

`navigateTree`는 plugin의 ingest 파이프라인에 삽입:

```typescript
// plugin ingest 파이프라인 예시
const plugin: WikiPlugin = {
  async processDocument(raw: string, context) {
    // 1. plugin이 DocumentTree 생성 (PageIndex 또는 자체 구현)
    const tree = await buildTree(raw, context.doc_id);
    // 2. navigateTree로 관련 섹션 선택
    const result = await navigateTree(tree, context.query, model, pageReader);
    // 3. 선택된 범위 content 읽기
    const contents = await Promise.all(result.ranges.map(r => pageReader(r)));
    // 4. LLM으로 4요소 추출 → core에 저장
    return extractWikiObjects(contents.join('\n'));
  }
};
```

---

## 4. ExtractStrategy — tree / vector / hybrid

### 4.1 타입 정의

```typescript
export type ExtractStrategy =
  | {
      type: 'tree';
      navigate: (query: string) => Promise<NavigateResult>;
    }
  | {
      type: 'vector';
      search: (query: string) => Promise<string[]>;
    }
  | {
      type: 'hybrid';
      selector: (node: DocumentNode) => 'tree' | 'vector';
      tree_fn:   (query: string) => Promise<NavigateResult>;
      vector_fn: (query: string) => Promise<string[]>;
    }
```

### 4.2 hybridExtract 함수

```typescript
export async function hybridExtract(
  strategy: ExtractStrategy,
  query: string,
  rootNode?: DocumentNode
): Promise<string[]>
```

**루터(enroute) 혼용 예시** — "특정 섹션은 벡터, 특정 섹션은 트리":

```typescript
// enroute plugin
const strategy: ExtractStrategy = {
  type: 'hybrid',
  selector: (node) => {
    // 구조가 명확한 아키텍처 노트 → 트리 탐색
    if (node.depth <= 2 && node.children.length > 0) return 'tree';
    // 자유 형식 세션 아카이브 → 벡터 검색
    return 'vector';
  },
  tree_fn:   (q) => navigateTree(tree, q, model, pageReader),
  vector_fn: (q) => vectorSearch(q, vectorStore),
};

const chunks = await hybridExtract(strategy, query, tree.root);
```

**설계 원칙**: 혼용 라우팅 로직은 plugin 책임. extractor는 타입 + utility만 제공.

---

## 5. source_ref 연결 패턴

추출 결과를 WikiObject에 저장할 때 `source_ref` JSON 필드로 출처 박제 (코어 인터페이스 변경 0건).

**ContentRange의 `start_page`/`end_page`와 source_ref 필드명 통일** (4자 동의):

```typescript
// plugin이 WikiObject 저장 시
const sourceRef = {
  type:       'pageindex',
  node_id:    node.node_id,     // "0006"
  start_page: range.start_page, // 21  — ContentRange.page 필드명 일치
  end_page:   range.end_page,   // 22  — ContentRange.page 필드명 일치
  doc_id:     tree.doc_id,      // "dart_2024_annual"
};

await wikiCore.createAttribute(objectId, 'source_ref', JSON.stringify(sourceRef));
```

`source_ref`는 기존 `TEXT` 컬럼 — JSON 구조는 plugin 자유. 필드명 통일은 디버깅 편의.

---

## 6. 3+1 도메인 사용 예시

### 6.1 rootric — DART 사업보고서 (PDF)

```typescript
// contentRange type: 'page'
const pageReader = async (range: ContentRange): Promise<string> => {
  if (range.type !== 'page') throw new Error('rootric: page 타입만 지원');
  // PyMuPDF (Python 백엔드) API 호출
  return await dartPdfApi.getPages(doc_id, range.start_page, range.end_page);
};

const result = await navigateTree(dartTree, '재무제표 매출총이익 2023', model, pageReader);
// → 재무제표 섹션 페이지 범위 선택 → KPI 추출 → factsheet_articles에 저장
```

### 6.2 enroute — 아키텍처 노트 (Markdown), 혼용

```typescript
// contentRange type: 'section' (Markdown 헤딩) 또는 'offset' (라인)
const pageReader = async (range: ContentRange): Promise<string> => {
  if (range.type === 'section') {
    return markdownSections[range.id] ?? '';
  }
  if (range.type === 'offset') {
    return lines.slice(range.start, range.end).join('\n');
  }
  throw new Error('enroute: page 타입 미지원');
};

// 혼용 전략
const strategy: ExtractStrategy = {
  type: 'hybrid',
  selector: (node) => node.depth <= 2 ? 'tree' : 'vector',
  tree_fn:   (q) => navigateTree(mdTree, q, model, pageReader),
  vector_fn: (q) => enrouteVectorSearch(q),
};
```

### 6.3 plott — 의약품 첨부문서 PDF + HWP 고시

```typescript
// PDF: PyMuPDF
const pdfReader = async (range: ContentRange): Promise<string> => {
  if (range.type !== 'page') throw new Error('plott-pdf: page 타입만');
  return await plottFastApi.getPdfPages(docId, range.start_page, range.end_page);
};

// HWP: FastAPI + python-hwp 파서 (plugin 완전 책임 — extractor 인터페이스 변경 0건)
const hwpReader = async (range: ContentRange): Promise<string> => {
  if (range.type !== 'page') throw new Error('plott-hwp: page 타입만');
  return await plottFastApi.getHwpPages(docId, range.start_page, range.end_page);
};

// 문서 포맷에 따라 pageReader만 교체 — navigateTree 호출은 동일
const result = await navigateTree(tree, '급여 조건 인슐린 2형 당뇨', model,
  tree.format === 'hwp' ? hwpReader : pdfReader);
```

### 6.4 CroNode — (공통 PDF 패턴)

rootric·plott와 동일한 `page` 타입 ContentRange + PyMuPDF 패턴.

---

## 7. 패키지 의존 그래프

```
기존:   core ← storage
                core ← router
                        core ← renderer

추가:           core ← extractor
                router ← extractor   (ModelHandle 재사용)
```

extractor는 core + router에만 의존. storage / renderer에는 의존 없음.

---

## 8. 갱신 이력

| 일자 | 세션 | 변경 |
|---|---|---|
| 2026-05-19 | Mercury 22차 | 최초 작성 — 4자 검증 통과 후 박제. ContentRange 유니온 (4자 동의). |
