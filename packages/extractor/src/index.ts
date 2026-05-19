/**
 * @wiki-core/extractor — public API
 *
 * 계층 구조 문서 추출 파이프라인 레이어.
 * SPEC: packages/extractor/SPEC.md
 */

export type {
  ContentRange,
  DocumentNode,
  DocumentTree,
  NavigateTreeOptions,
  NavigateResult,
  PageReader,
  ExtractStrategy,
  ModelHandle,
} from './types.js';

export { navigateTree } from './navigate.js';
export { hybridExtract } from './hybrid.js';
