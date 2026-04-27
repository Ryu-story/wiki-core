/**
 * Core data types for wiki-core. 4요소 + 보조 슬롯.
 *
 * 도메인 어휘는 일체 등장하지 않음 — `type` / `key` / `source_kind` 등 모두 string 슬롯.
 * Plugin이 자기 도메인 카탈로그를 자유 등록.
 *
 * SPEC: packages/core/SPEC.md §1 (4요소), §2 (보조 슬롯)
 */

export type ID = string;
export type ISOTimestamp = string;

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [k: string]: JSONValue };

export type CreatedOrigin = 'ingest' | 'manual' | 'auto';
export type Directionality = 'directed' | 'undirected';
export type TargetKind = 'object' | 'attribute' | 'relation' | 'event';

/**
 * 1급 객체. 도메인 entity (Stock / Drug / Vision 등).
 * `type` 검증은 plugin의 `validateObjectType` hook 책임.
 */
export interface WikiObject {
  id: ID;
  type: string;
  label: string;
  identifier?: string;
  created_origin: CreatedOrigin;
  created_at: ISOTimestamp;
  updated_at?: ISOTimestamp;
}

/**
 * 객체의 속성 1개. 시계열 시 `valid_at` / `valid_until` 채움.
 * 누적 정책 (덮어쓰기 / append / 합산) 은 plugin의 `onAttributeWrite` hook.
 */
export interface WikiAttribute {
  id: ID;
  object_id: ID;
  key: string;
  value: JSONValue;
  unit?: string;
  valid_at?: ISOTimestamp;
  valid_until?: ISOTimestamp;
  recorded_at: ISOTimestamp;
}

/**
 * 두 객체 간 관계. `weight` 의미는 plugin이 부여 (rootric strength ≠ enroute cross 가중치).
 */
export interface WikiRelation {
  id: ID;
  from_id: ID;
  to_id: ID;
  type: string;
  directionality: Directionality;
  weight?: number;
  created_at: ISOTimestamp;
}

/**
 * 시간점 사건. `payload` schema는 plugin 책임.
 */
export interface WikiEvent {
  id: ID;
  object_ids: ID[];
  type: string;
  occurred_at: ISOTimestamp;
  payload: JSONValue;
  recorded_at: ISOTimestamp;
}

/**
 * 4요소 row 에 0..N 개 붙는 출처.
 * `strength` / `confidence` / `is_official` 등 도메인 컬럼은
 * plugin extension table 에서 처리 (storage SPEC §4 참조).
 */
export interface WikiProvenance {
  id: ID;
  target_kind: TargetKind;
  target_id: ID;
  source_kind: string;
  source_ref: string;
  recorded_at: ISOTimestamp;
}

/**
 * 4요소 row 에 0..N 개 붙는 분류.
 * 같은 target 에 여러 label_set 동시 적용 가능 (cross-label 허용).
 */
export interface WikiLabel {
  id: ID;
  target_kind: TargetKind;
  target_id: ID;
  label_set_id: string;
  label_id: string;
  applied_at: ISOTimestamp;
}
