# @wiki-core/renderer — SPEC

> wiki-core renderer 패키지. 시각화 4 컴포넌트의 *입력 형식 표준* + reference 구현. 페이지 템플릿은 plugin 책임.
>
> **작성자**: 머큐리 (wiki-core 코어 아키텍트)
> **작성일**: 2026-04-28
> **세션**: Mercury 3차 (Phase 3 — storage/router/renderer SPEC 묶음 작성)
> **선행**: `packages/core/SPEC.md` §1·§2 (4요소·보조 슬롯), `docs/comparison_matrix.md` §5 (시각화 4종 진짜 공통)
>
> **status**: 1차 SPEC. §5 #5 (4 컴포넌트 입력 표준화 형식) 답 박제.

---

## 0. 목적·scope

3 도메인이 모두 사용하는 시각화 컴포넌트 4종을 코어로 분리. 도메인 어휘 노출 X — 4요소 + 보조 슬롯 타입에만 의존.

### 0.1 코어가 제공하는 것

- **4 컴포넌트 input props 표준** (TypeScript 인터페이스)
- **입력 변환 헬퍼** — 4요소 row 들을 컴포넌트 props 로 reshape
- **reference 구현** (React + 기본 차트 라이브러리 — Phase 3.5 코드 작성 시점)
- 컴포넌트 capability declaration (interactive / static / responsive)

### 0.2 코어가 *제공하지 않는* 것

| 영역 | 이유 | plugin 책임 |
|---|---|---|
| Wiki 페이지 템플릿 | Stock vs Drug vs Area 섹션 구성 도메인 결정 | plugin 자체 React 컴포넌트 |
| 자연어 답변 톤 (객관 / 가시성뱃지 / 페르소나) | 도메인 의사결정 | plugin |
| 호출 진입점 (단독 SaaS / ❓ 버튼 / 봇) | 도메인 통합 방식 | plugin |
| Constellation View (별/은하) | enroute 만 | `@enroute/plugin` |
| 가시성 뱃지 출력 | plott 만 | `@plott/plugin` (renderer wrapping) |
| 차트 라이브러리 선택 (Recharts / D3 / vis.js) | plugin 자유 — reference 구현은 권장만 | plugin override 가능 |

### 0.3 의존성

- `@wiki-core/core` — 4요소·보조 슬롯 타입
- React (peer dependency, reference 구현용) — plugin 이 다른 framework 쓸 경우 input props 인터페이스만 import

Plugin 이 자체 컴포넌트 빌드 시 이 SPEC 의 input props 호환만 유지하면 됨.

---

## 1. 4 컴포넌트 Input Props (★ §5 #5 답)

```ts
// @wiki-core/renderer/src/types.ts
import type {
  WikiObject, WikiAttribute, WikiRelation, WikiEvent, WikiProvenance, ID, ISOTimestamp, JSONValue,
} from '@wiki-core/core';
```

### 1.1 TimeSeriesChart

```ts
export interface TimeSeriesPoint {
  valid_at: ISOTimestamp;
  value: number;
}

export interface TimeSeriesSeries {
  object_id: ID;
  key: string;                             // WikiAttribute.key
  label: string;                           // 사람이 읽는 이름 (도메인이 결정 — plugin 이 채움)
  points: TimeSeriesPoint[];
  unit?: string;                           // 첫 attribute 의 unit (변하면 plugin 이 정규화)
}

export interface TimeSeriesChartProps {
  series: TimeSeriesSeries[];
  /** 누적 정책 표시 (덮어쓰기 / append / 합산) — plugin 이 라벨 제공 */
  aggregation_label?: string;
  x_axis?: { from?: ISOTimestamp; to?: ISOTimestamp };
  y_axis?: { unit?: string; log_scale?: boolean };
  on_point_click?: (series: TimeSeriesSeries, point: TimeSeriesPoint) => void;
}
```

**도메인 사용**:
- rootric: Stock 시총/PER 분기 추이
- plott: Drug 단가/재고 일/주
- enroute: Vision/Area 누적시간 일/주/월

### 1.2 RelationGraph

```ts
export interface RelationGraphNode {
  /** WikiObject 그대로 + 표시 메타 */
  object: WikiObject;
  display?: {
    label?: string;                        // override (default = object.label)
    color?: string;
    size?: number;
    icon?: string;
  };
}

export interface RelationGraphEdge {
  relation: WikiRelation;
  display?: {
    label?: string;                        // default = relation.type
    color?: string;
    width?: number;                        // weight 시각화
  };
}

export interface RelationGraphProps {
  nodes: RelationGraphNode[];
  edges: RelationGraphEdge[];
  layout?: 'force' | 'tree' | 'radial' | 'hierarchical';
  on_node_click?: (node: RelationGraphNode) => void;
  on_edge_click?: (edge: RelationGraphEdge) => void;
}
```

**도메인 사용**:
- rootric: BU → Product → Customer 트리
- plott: Drug ↔ Disease ↔ Drug 그래프
- enroute: Vision ← cross — Area ← parent — Project (마인드맵)

### 1.3 Timeline

```ts
export interface TimelineProps {
  events: WikiEvent[];
  /** 시간순 group 기준 */
  group_by?: 'none' | 'object' | 'type' | 'day' | 'week';
  /** 각 event 의 label·색 — plugin 이 type 별 매핑 */
  event_display?: (event: WikiEvent) => {
    label: string;
    color?: string;
    icon?: string;
  };
  on_event_click?: (event: WikiEvent) => void;
}
```

**도메인 사용**:
- rootric: 공시·리포트·뉴스 시간순 30건
- plott: Regulation 시행일 + Procedure 변경 이력
- enroute: 일별 Activity·Container·Trade 타임라인

### 1.4 SourceCard

```ts
export interface SourceCardProps {
  provenance: WikiProvenance;
  /** 출처 카탈로그 표시명 (e.g. "DART" / "식약처" / "ActivityWatch") — plugin 이 source_kind 매핑 */
  display_label?: string;
  /** 추가 메타 — plugin extension table 에서 join 후 전달 */
  extension?: {
    strength?: number;                     // rootric
    is_official?: boolean;                 // plott
    confidence?: number;                   // 일반
    [key: string]: JSONValue;              // 도메인 자유
  };
  on_click?: (provenance: WikiProvenance) => void;
}
```

**의도적 설계**:
- 코어 props 는 `WikiProvenance` 만 강제. 도메인 특수 컬럼은 `extension` 자유 슬롯.
- `display_label` 은 plugin 이 source_kind 카탈로그를 사람 읽기용으로 매핑.

---

## 2. 입력 변환 헬퍼

4요소 row 들을 컴포넌트 props 로 reshape 하는 표준 헬퍼.

```ts
// @wiki-core/renderer/src/transform.ts

/**
 * WikiAttribute[] → TimeSeriesSeries[]
 * 같은 (object_id, key) 묶어 series 1개. valid_at 오름차순 정렬.
 */
export function attributesToTimeSeries(
  attributes: WikiAttribute[],
  options?: {
    label_resolver?: (object_id: ID, key: string) => string;
    value_extractor?: (attr: WikiAttribute) => number;  // default = Number(attr.value)
  }
): TimeSeriesSeries[];

/**
 * WikiObject[] + WikiRelation[] → RelationGraphNode[] + RelationGraphEdge[]
 * 격리된 노드 (edge 없는) 옵션 필터링.
 */
export function buildRelationGraph(
  objects: WikiObject[],
  relations: WikiRelation[],
  options?: {
    drop_isolated?: boolean;
    node_display?: (obj: WikiObject) => RelationGraphNode['display'];
    edge_display?: (rel: WikiRelation) => RelationGraphEdge['display'];
  }
): { nodes: RelationGraphNode[]; edges: RelationGraphEdge[] };

/**
 * WikiEvent[] → group_by 적용한 group 구조
 */
export function groupEvents(
  events: WikiEvent[],
  group_by: TimelineProps['group_by']
): Array<{ key: string; events: WikiEvent[] }>;
```

→ plugin 이 storage 에서 4요소 row read → 헬퍼로 변환 → 컴포넌트 props 주입. 변환 로직 도메인마다 재구현 X.

---

## 3. Reference 구현 (Phase 3.5 코드 작성 시점)

권장 라이브러리:

| 컴포넌트 | reference | 이유 |
|---|---|---|
| TimeSeriesChart | Recharts | React 친화 + 3 도메인 이미 사용 (plott Recharts 명시) |
| RelationGraph | react-force-graph | plott 명시 + Force layout 표준 |
| Timeline | react-vis-timeline 또는 자체 구현 | 도메인 timeline 요구 다양 |
| SourceCard | 자체 구현 (단순 카드) | 라이브러리 불필요 |

Plugin 이 reference 대신 자체 구현 시 input props 호환만 유지하면 됨.

```ts
// @wiki-core/renderer/src/index.ts
export { TimeSeriesChart } from './components/TimeSeriesChart';
export { RelationGraph } from './components/RelationGraph';
export { Timeline } from './components/Timeline';
export { SourceCard } from './components/SourceCard';
export * from './types';
export * from './transform';
```

---

## 4. Plugin 사용 예 (잠정)

### 4.1 rootric Stock Wiki 페이지 (가설)

```tsx
// @rootric/plugin/src/pages/StockWiki.tsx
import { TimeSeriesChart, RelationGraph, Timeline, SourceCard,
         attributesToTimeSeries, buildRelationGraph } from '@wiki-core/renderer';

export function StockWikiPage({ stock_id }: { stock_id: string }) {
  // ... storage 에서 4요소 row read
  const series = attributesToTimeSeries(attributes, {
    label_resolver: (oid, key) => labelMap[key] ?? key,  // "PER" / "ROE" 등
  });
  const graph = buildRelationGraph(objects, relations);

  return (
    <article>
      <h1>{stock.label}</h1>
      <section>
        <h2>한눈에 보기</h2>
        <TimeSeriesChart series={series} y_axis={{ unit: '원' }} />
      </section>
      <section>
        <h2>사업 구조</h2>
        <RelationGraph {...graph} layout="tree" />
      </section>
      <section>
        <h2>최근 핵심 사실</h2>
        <Timeline events={events} group_by="day" />
      </section>
      {provenances.map(prov =>
        <SourceCard
          key={prov.id}
          provenance={prov}
          display_label={sourceLabelMap[prov.source_kind]}
          extension={{ strength: rootricExt[prov.id]?.strength }}
        />
      )}
    </article>
  );
}
```

### 4.2 plott Drug Wiki — 가시성 뱃지 wrapping

```tsx
// @plott/plugin/src/pages/DrugWiki.tsx
import { TimeSeriesChart, SourceCard } from '@wiki-core/renderer';
import { VisibilityBadge } from './VisibilityBadge';  // plott 자체 컴포넌트

export function DrugWikiPage({ drug_id, scope }: ...) {
  // ... read + access control
  return (
    <article>
      <h1>{drug.label} <VisibilityBadge level={visibility} /></h1>
      <TimeSeriesChart series={series} />
      {/* 가시성 뱃지가 SourceCard 출력에도 — plugin wrapping */}
      {provenances.map(prov => (
        <div>
          <SourceCard provenance={prov} display_label={sourceLabel(prov)} />
          <VisibilityBadge level={prov_visibility[prov.id]} />
        </div>
      ))}
    </article>
  );
}
```

→ 플로터 검증: "가시성 뱃지" 출력 (comparison_matrix.md §5.4 신호) 는 plugin wrapping 으로 자연 흡수.

### 4.3 enroute Constellation View (코어 4 컴포넌트 + 자체 추가)

```tsx
// @enroute/plugin/src/pages/Constellation.tsx
import { RelationGraph, Timeline } from '@wiki-core/renderer';
import { ConstellationView } from './ConstellationView';  // enroute 자체 — Project=별 / Area=별자리 / Vision=은하

export function VisionPage({ vision_id }) {
  // ... 4요소 read
  return (
    <>
      <ConstellationView vision={vision} areas={areas} projects={projects} />  {/* 자체 컴포넌트 */}
      <RelationGraph {...graph} layout="radial" />                               {/* 코어 */}
      <Timeline events={events} group_by="week" />                               {/* 코어 */}
    </>
  );
}
```

→ 코어 4 컴포넌트 + plugin 추가 컴포넌트 자유 조합.

---

## 5. 변경 정책 (semver)

- **major**: input props 인터페이스 / 헬퍼 시그니처 breaking change
- **minor**: 신규 props 옵션 추가 (additive) / 신규 헬퍼
- **patch**: reference 구현 내부 / 차트 라이브러리 버전

`extension` / `display` 자유 슬롯은 plugin 자유 — 코어 semver 영향 없음.

---

## 6. 다음 작업

- 이 SPEC 박제 + Phase 3 미해결 5 질문 모두 답 (#1·#2 코어 SPEC, #3 router SPEC, #4 코어 SPEC, #5 이 SPEC)
- Phase 3.5 — 코드 작성 (storage/router/renderer 구현 + 코어 base impl)
- pnpm workspaces 모노레포 셋업
- Phase 4 — 도메인 plugin 합류 가이드 (plugin boilerplate + ingest 파이프라인 + 마이그레이션 가이드)
