/**
 * @wiki-core/extractor — type definitions.
 *
 * 추출 파이프라인 레이어 타입 (지식 그래프 4요소와 분리).
 * SPEC: packages/extractor/SPEC.md §1·§2·§4
 */

import type { ModelHandle } from '@wiki-core/router';

// ─── ContentRange (Mercury 22차 — 4자 동의 유니온) ──────

/**
 * 문서 내 콘텐츠 위치 표현.
 * PDF(rootric·plott·CroNode) / Markdown 섹션·오프셋(enroute) 공존.
 *
 * SPEC §1 참조.
 */
export type ContentRange =
  | { type: 'page';    start_page: number; end_page: number }  // PDF: PyMuPDF doc[start:end]
  | { type: 'section'; id: string }                            // Markdown: 헤딩 섹션 id
  | { type: 'offset';  start: number; end: number };           // 라인 오프셋

// ─── DocumentNode / DocumentTree ─────────────────────────

/**
 * PageIndex 스타일 트리 노드.
 * SPEC §2 참조.
 */
export interface DocumentNode {
  /** 트리 내 유일 식별자 (PageIndex 원본: "0006") */
  node_id: string;
  /** 섹션 제목 */
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

/**
 * 전체 문서 트리.
 * Plugin이 생성 (DocumentTree 빌드 = LLM 호출 포함, plugin 책임).
 */
export interface DocumentTree {
  /** plugin 부여 문서 식별자 */
  doc_id: string;
  /** 문서 제목 */
  title?: string;
  /** 문서 전체 요약 (PageIndex --if-add-doc-description 해당) */
  description?: string;
  /**
   * 원본 포맷. pageReader 구현 선택에 참고.
   * HWP 파서는 plugin 완전 책임 — extractor 인터페이스 변경 0건.
   */
  format: 'pdf' | 'markdown' | 'html' | 'hwp' | (string & {});
  /** 트리 루트 노드 */
  root: DocumentNode;
}

// ─── navigateTree I/O ────────────────────────────────────

export interface NavigateTreeOptions {
  /** LLM 탐색 최대 반복 횟수. 기본 10. */
  maxIterations?: number;
  /** 단일 읽기 최대 페이지 범위 (page 타입 기준). 기본 10. */
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

/** Plugin이 범위를 실제 텍스트로 변환하는 콜백. 파서 종류에 무관. */
export type PageReader = (range: ContentRange) => Promise<string>;

// ─── ExtractStrategy ─────────────────────────────────────

/**
 * 추출 전략 유니온.
 * 혼용(hybrid) 라우팅 로직은 plugin 책임. extractor는 타입만 표준화.
 * SPEC §4 참조.
 */
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
      /** 노드 단위 전략 선택 */
      selector: (node: DocumentNode) => 'tree' | 'vector';
      tree_fn:   (query: string) => Promise<NavigateResult>;
      vector_fn: (query: string) => Promise<string[]>;
    };

// ModelHandle 재수출 — extractor 사용자가 router 직접 import 불필요
export type { ModelHandle };
