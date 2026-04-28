/**
 * @wiki-core/renderer — public surface.
 *
 * 4 컴포넌트 input props 표준 + 4요소 → props 변환 헬퍼.
 *
 * Mercury 9차 결정: JSX reference 컴포넌트는 plugin 책임 (frontend dep boundary 회피).
 *   - 코어: input props 인터페이스 + 변환 헬퍼 (4요소 row 들을 props 로 reshape)
 *   - Plugin: TimeSeriesChart / RelationGraph / Timeline / SourceCard JSX 자체 빌드
 *     · 권장 라이브러리: Recharts / react-force-graph / 자체 timeline / 자체 카드
 *     · input props 호환만 유지하면 plugin 자유 (override OK)
 *
 * SPEC: packages/renderer/SPEC.md
 */

// 4 컴포넌트 input props
export type {
  TimeSeriesPoint,
  TimeSeriesSeries,
  TimeSeriesChartProps,
  RelationGraphNode,
  RelationGraphNodeDisplay,
  RelationGraphEdge,
  RelationGraphEdgeDisplay,
  RelationGraphProps,
  TimelineGroupBy,
  TimelineEventDisplay,
  TimelineProps,
  SourceCardExtension,
  SourceCardProps,
} from './types.js';

// 변환 헬퍼
export {
  attributesToTimeSeries,
  buildRelationGraph,
  groupEvents,
} from './transform.js';

export type {
  AttributesToTimeSeriesOptions,
  BuildRelationGraphOptions,
} from './transform.js';
