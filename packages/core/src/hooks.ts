/**
 * Plugin이 코어에 제공하는 5 기본 hook.
 *
 * 모두 optional — plugin 이 필요한 것만 구현. 코어는 hook 없을 때 no-op.
 *
 * SPEC: packages/core/SPEC.md §3
 */

import type {
  WikiObject,
  WikiAttribute,
  WikiProvenance,
  WikiLabel,
} from './types.js';
import type { TargetRef } from './access.js';

export interface CoreHooks {
  /**
   * Object 생성·수정 시 호출. 검증 실패 시 throw.
   *
   * 예:
   * - rootric: ticker 6자리 검증 (`/^\d{6}$/`)
   * - plott:   HIRA 코드 검증
   * - enroute: type=vision 의 metric_type enum 검증
   */
  validateObjectType?(
    type: string,
    payload: Partial<WikiObject>
  ): void | Promise<void>;

  /**
   * Attribute 쓰기 후 fire-and-forget.
   * 시계열 누적 정책 (덮어쓰기 / append / 합산) 은 plugin 결정.
   *
   * 예:
   * - rootric: strength 재계산
   * - plott:   약국 단가 시계열 갱신
   * - enroute: Area 누적시간 갱신
   */
  onAttributeWrite?(attr: WikiAttribute): void | Promise<void>;

  /**
   * Ingest 텍스트 입력 전 노이즈 필터.
   * 코어 헬퍼 4종 (`@wiki-core/core/utils/noise`) 과 plugin 룰 결합 가능.
   *
   * @returns true = drop, false = keep
   */
  noiseFilter?(text: string): boolean;

  /**
   * Provenance row 생성 시. plugin 이 extension table row 동시 작성.
   *
   * 예:
   * - rootric: rootric_provenance_ext (strength / is_key / expires_at)
   * - plott:   plott_provenance_ext (is_official / is_pharmacy_specific)
   * - enroute: no-op (본인 데이터, ext 컬럼 없음)
   */
  provenanceExtension?(prov: WikiProvenance): void | Promise<void>;

  /**
   * 분류 라우터. content 를 받아 label_set 내 label 결정 → WikiLabel row 작성.
   * Plugin 이 LLM Tier 라우터 호출 자유.
   *
   * 예:
   * - rootric: FACT / ASSUMPTION / MIXED / PLAIN 분류
   * - plott:   FACT / PROCEDURE / POLICY / EXPERIENCE / WARNING / PLAIN
   * - enroute: 선언 / 실측 / 회고 / 노이즈
   */
  labelRouter?(
    target: TargetRef,
    content: string
  ): Promise<WikiLabel[]>;
}
