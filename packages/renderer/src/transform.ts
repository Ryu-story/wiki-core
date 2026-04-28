/**
 * 입력 변환 헬퍼 — 4요소 row 들을 컴포넌트 props 로 reshape.
 *
 * 변환 로직 도메인마다 재구현 X — plugin 이 storage 에서 read 후 이 헬퍼만 호출.
 *
 * SPEC: packages/renderer/SPEC.md §2
 */

import type {
  WikiAttribute,
  WikiEvent,
  WikiObject,
  WikiRelation,
  ID,
} from '@wiki-core/core';
import type {
  TimeSeriesPoint,
  TimeSeriesSeries,
  RelationGraphNode,
  RelationGraphNodeDisplay,
  RelationGraphEdge,
  RelationGraphEdgeDisplay,
  TimelineGroupBy,
} from './types.js';

// ─── attributesToTimeSeries ──────────────────────────────

export interface AttributesToTimeSeriesOptions {
  /**
   * (object_id, key) → 사람 읽기 라벨.
   * default: key 그대로.
   */
  label_resolver?: (object_id: ID, key: string) => string;

  /**
   * WikiAttribute.value → number.
   * default: number 그대로 / string은 Number() 시도 / 그 외 NaN.
   * NaN 반환 시 그 point 는 제외.
   */
  value_extractor?: (attr: WikiAttribute) => number;
}

/**
 * `WikiAttribute[]` → `TimeSeriesSeries[]`.
 * 같은 (object_id, key) 묶어 series 1개. valid_at 오름차순 정렬.
 * `valid_at` 없는 attribute / value extractor NaN 결과는 제외.
 */
export function attributesToTimeSeries(
  attributes: WikiAttribute[],
  options?: AttributesToTimeSeriesOptions
): TimeSeriesSeries[] {
  const labelResolver = options?.label_resolver ?? ((_oid, k) => k);
  const valueExtractor = options?.value_extractor ?? defaultValueExtractor;

  interface Group {
    object_id: ID;
    key: string;
    unit: string | undefined;
    points: TimeSeriesPoint[];
  }
  const grouped = new Map<string, Group>();

  for (const attr of attributes) {
    if (!attr.valid_at) continue;
    const value = valueExtractor(attr);
    if (!Number.isFinite(value)) continue;

    const groupKey = `${attr.object_id}::${attr.key}`;
    let entry = grouped.get(groupKey);
    if (!entry) {
      entry = {
        object_id: attr.object_id,
        key: attr.key,
        unit: attr.unit,
        points: [],
      };
      grouped.set(groupKey, entry);
    }
    entry.points.push({ valid_at: attr.valid_at, value });
  }

  return Array.from(grouped.values()).map((entry) => {
    const series: TimeSeriesSeries = {
      object_id: entry.object_id,
      key: entry.key,
      label: labelResolver(entry.object_id, entry.key),
      points: entry.points.sort(byValidAt),
    };
    if (entry.unit !== undefined) series.unit = entry.unit;
    return series;
  });
}

function defaultValueExtractor(attr: WikiAttribute): number {
  const v = attr.value;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return NaN;
}

function byValidAt(a: TimeSeriesPoint, b: TimeSeriesPoint): number {
  return a.valid_at < b.valid_at ? -1 : a.valid_at > b.valid_at ? 1 : 0;
}

// ─── buildRelationGraph ──────────────────────────────────

export interface BuildRelationGraphOptions {
  /** edge 없는 격리 노드 제거 */
  drop_isolated?: boolean;
  node_display?: (obj: WikiObject) => RelationGraphNodeDisplay | undefined;
  edge_display?: (rel: WikiRelation) => RelationGraphEdgeDisplay | undefined;
}

/**
 * `WikiObject[]` + `WikiRelation[]` → `{nodes, edges}`.
 * `drop_isolated` 시 edge 가 참조하지 않는 object 제거.
 */
export function buildRelationGraph(
  objects: WikiObject[],
  relations: WikiRelation[],
  options?: BuildRelationGraphOptions
): { nodes: RelationGraphNode[]; edges: RelationGraphEdge[] } {
  const referenced = new Set<ID>();
  for (const rel of relations) {
    referenced.add(rel.from_id);
    referenced.add(rel.to_id);
  }

  const filtered = options?.drop_isolated
    ? objects.filter((obj) => referenced.has(obj.id))
    : objects;

  const nodes: RelationGraphNode[] = filtered.map((obj) => {
    const display = options?.node_display?.(obj);
    return display ? { object: obj, display } : { object: obj };
  });

  const edges: RelationGraphEdge[] = relations.map((rel) => {
    const display = options?.edge_display?.(rel);
    return display ? { relation: rel, display } : { relation: rel };
  });

  return { nodes, edges };
}

// ─── groupEvents ─────────────────────────────────────────

/**
 * `WikiEvent[]` → `group_by` 적용한 group 구조. 각 group 의 events 는 occurred_at 오름차순.
 */
export function groupEvents(
  events: WikiEvent[],
  group_by: TimelineGroupBy = 'none'
): Array<{ key: string; events: WikiEvent[] }> {
  if (group_by === 'none') {
    return [{ key: 'all', events: [...events].sort(byOccurredAt) }];
  }

  const groups = new Map<string, WikiEvent[]>();
  for (const ev of events) {
    const key = computeGroupKey(ev, group_by);
    let arr = groups.get(key);
    if (!arr) {
      arr = [];
      groups.set(key, arr);
    }
    arr.push(ev);
  }

  return Array.from(groups.entries()).map(([key, evs]) => ({
    key,
    events: evs.sort(byOccurredAt),
  }));
}

function byOccurredAt(a: WikiEvent, b: WikiEvent): number {
  return a.occurred_at < b.occurred_at ? -1 : a.occurred_at > b.occurred_at ? 1 : 0;
}

function computeGroupKey(ev: WikiEvent, group_by: TimelineGroupBy): string {
  switch (group_by) {
    case 'object':
      return ev.object_ids[0] ?? '_no_object';
    case 'type':
      return ev.type;
    case 'day':
      return ev.occurred_at.slice(0, 10); // YYYY-MM-DD
    case 'week':
      return weekKey(ev.occurred_at);
    case 'none':
    default:
      return 'all';
  }
}

/**
 * ISO 8601 주차 키 (YYYY-Www). 날짜 파싱 실패 시 YYYY-MM-DD 로 fallback.
 */
function weekKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
