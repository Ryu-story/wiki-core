/**
 * @wiki-core/extractor — hybridExtract
 *
 * tree + vector 혼용 추출 라우터.
 * 혼용 라우팅 로직은 plugin 책임. 여기서는 타입 + 실행만.
 *
 * SPEC: packages/extractor/SPEC.md §4
 */

import type { DocumentNode, ExtractStrategy, NavigateResult } from './types.js';

/**
 * ExtractStrategy에 따라 추출 실행 후 텍스트 청크 배열 반환.
 *
 * @param strategy  tree / vector / hybrid 전략
 * @param query     추출 질의
 * @param rootNode  hybrid 전략 시 노드 단위 라우팅에 사용할 루트 노드
 */
export async function hybridExtract(
  strategy: ExtractStrategy,
  query: string,
  rootNode?: DocumentNode
): Promise<string[]> {
  if (strategy.type === 'vector') {
    return strategy.search(query);
  }

  if (strategy.type === 'tree') {
    const result: NavigateResult = await strategy.navigate(query);
    return result.nodes_visited;
  }

  // hybrid: rootNode 기준으로 자식 노드를 전략 분기
  if (strategy.type === 'hybrid') {
    if (rootNode === undefined) {
      // rootNode 없으면 tree_fn fallback
      const result = await strategy.tree_fn(query);
      return result.nodes_visited;
    }

    const treeNodes: DocumentNode[] = [];
    const vectorNodes: DocumentNode[] = [];

    for (const child of rootNode.children) {
      const chosen = strategy.selector(child);
      if (chosen === 'tree') {
        treeNodes.push(child);
      } else {
        vectorNodes.push(child);
      }
    }

    const results: string[] = [];

    if (treeNodes.length > 0) {
      const treeResult = await strategy.tree_fn(query);
      results.push(...treeResult.nodes_visited);
    }

    if (vectorNodes.length > 0) {
      const vectorResult = await strategy.vector_fn(query);
      results.push(...vectorResult);
    }

    return results;
  }

  // TypeScript exhaustive check
  const _never: never = strategy;
  return _never;
}
