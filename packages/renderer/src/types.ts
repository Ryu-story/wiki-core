/**
 * @wiki-core/renderer — 4 component input props.
 *
 * 4 컴포넌트 (TimeSeriesChart / RelationGraph / Timeline / SourceCard) 의 입력 형식 표준.
 * Plugin 이 4요소 row 들을 변환 헬퍼로 reshape 후 props 주입.
 *
 * Reference JSX components 는 plugin 책임 (Mercury 9차 결정 — frontend dep boundary 회피).
 *
 * SPEC: packages/renderer/SPEC.md §1
 */

import type {
  WikiObject,
  WikiRelation,
  WikiEvent,
  WikiProvenance,
  ID,
  ISOTimestamp,
  JSONValue,
} from '@wiki-core/core';

// ─── TimeSeriesChart ─────────────────────────────────────

export interface TimeSeriesPoint {
  valid_at: ISOTimestamp;
  value: number;
}

export interface TimeSeriesSeries {
  object_id: ID;
  /** WikiAttribute.key */
  key: string;
  /** 사람이 읽는 이름 — plugin 이 label_resolver 로 채움 */
  label: string;
  /** valid_at 오름차순 정렬됨 (변환 헬퍼 보장) */
  points: TimeSeriesPoint[];
  /** 첫 attribute 의 unit. 변하면 plugin 이 정규화 */
  unit?: string;
}

export interface TimeSeriesChartProps {
  series: TimeSeriesSeries[];
  /** 누적 정책 표시 ("덮어쓰기" / "append" / "합산") — plugin 이 라벨 제공 */
  aggregation_label?: string;
  x_axis?: { from?: ISOTimestamp; to?: ISOTimestamp };
  y_axis?: { unit?: string; log_scale?: boolean };
  on_point_click?: (series: TimeSeriesSeries, point: TimeSeriesPoint) => void;
}

// ─── RelationGraph ───────────────────────────────────────

export interface RelationGraphNodeDisplay {
  /** override (default = object.label) */
  label?: string;
  color?: string;
  size?: number;
  icon?: string;
}

export interface RelationGraphNode {
  object: WikiObject;
  display?: RelationGraphNodeDisplay;
}

export interface RelationGraphEdgeDisplay {
  /** default = relation.type */
  label?: string;
  color?: string;
  /** weight 시각화 */
  width?: number;
}

export interface RelationGraphEdge {
  relation: WikiRelation;
  display?: RelationGraphEdgeDisplay;
}

export interface RelationGraphProps {
  nodes: RelationGraphNode[];
  edges: RelationGraphEdge[];
  layout?: 'force' | 'tree' | 'radial' | 'hierarchical';
  on_node_click?: (node: RelationGraphNode) => void;
  on_edge_click?: (edge: RelationGraphEdge) => void;
}

// ─── Timeline ────────────────────────────────────────────

export type TimelineGroupBy = 'none' | 'object' | 'type' | 'day' | 'week';

export interface TimelineEventDisplay {
  label: string;
  color?: string;
  icon?: string;
}

export interface TimelineProps {
  events: WikiEvent[];
  /** 시간순 group 기준. default = 'none' */
  group_by?: TimelineGroupBy;
  /** 각 event 의 label·색·icon — plugin 이 type 별 매핑 */
  event_display?: (event: WikiEvent) => TimelineEventDisplay;
  on_event_click?: (event: WikiEvent) => void;
}

// ─── SourceCard ──────────────────────────────────────────

/**
 * Plugin extension table 에서 join 후 전달하는 자유 슬롯.
 * 도메인 특수 컬럼 (rootric strength / plott is_official 등) 또는 일반 confidence.
 */
export interface SourceCardExtension {
  strength?: number;
  is_official?: boolean;
  confidence?: number;
  [key: string]: JSONValue | undefined;
}

export interface SourceCardProps {
  provenance: WikiProvenance;
  /** "DART" / "식약처" / "ActivityWatch" 등 — plugin 이 source_kind → 표시명 매핑 */
  display_label?: string;
  extension?: SourceCardExtension;
  on_click?: (provenance: WikiProvenance) => void;
}
