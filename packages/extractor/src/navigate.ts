/**
 * @wiki-core/extractor — navigateTree
 *
 * LLM 계층 탐색 함수. PageIndex 4-step 패턴 구현.
 * Structured prompt 기반 — ModelHandle tool_use 비의존, 어떤 모델이든 동작.
 *
 * SPEC: packages/extractor/SPEC.md §3
 */

import type {
  DocumentNode,
  DocumentTree,
  ContentRange,
  NavigateResult,
  NavigateTreeOptions,
  PageReader,
  ModelHandle,
} from './types.js';

// ─── 트리 직렬화 ─────────────────────────────────────────

function serializeTree(node: DocumentNode, indent = 0): string {
  const pad = '  '.repeat(indent);
  const lines: string[] = [
    `${pad}[${node.node_id}] ${node.title ?? '(no title)'} — ${node.summary}`,
  ];
  for (const child of node.children) {
    lines.push(serializeTree(child, indent + 1));
  }
  return lines.join('\n');
}

function findNode(root: DocumentNode, nodeId: string): DocumentNode | undefined {
  if (root.node_id === nodeId) return root;
  for (const child of root.children) {
    const found = findNode(child, nodeId);
    if (found !== undefined) return found;
  }
  return undefined;
}

function buildPath(root: DocumentNode, targetId: string): DocumentNode[] {
  if (root.node_id === targetId) return [root];
  for (const child of root.children) {
    const sub = buildPath(child, targetId);
    if (sub.length > 0) return [root, ...sub];
  }
  return [];
}

// ─── 프롬프트 빌드 ────────────────────────────────────────

function buildNavigationPrompt(
  tree: DocumentTree,
  query: string,
  treeText: string,
  previousContext: string,
  iteration: number
): string {
  return [
    `Document: ${tree.title ?? tree.doc_id}`,
    tree.description ? `Summary: ${tree.description}` : '',
    `Format: ${tree.format}`,
    '',
    `Query: ${query}`,
    '',
    'Document structure (node_id — title — summary):',
    treeText,
    previousContext ? `\nAlready read:\n${previousContext}` : '',
    '',
    'Task: Select node_ids to read for answering the query.',
    iteration === 1
      ? 'List 1-3 most relevant node_ids. Reply only with node_ids separated by commas, or DONE if you have enough.'
      : 'Reply with additional node_ids needed, or DONE if you have enough information.',
  ]
    .filter(Boolean)
    .join('\n');
}

// ─── navigateTree ─────────────────────────────────────────

/**
 * LLM이 DocumentTree를 계층 탐색하여 관련 ContentRange를 반환.
 *
 * @param tree      대상 DocumentTree
 * @param query     탐색 질의
 * @param model     @wiki-core/router ModelHandle — 어떤 모델이든 동작
 * @param pageReader plugin 제공 콘텐츠 리더 (파서 무관)
 * @param options   최대 반복 횟수 등
 */
export async function navigateTree(
  tree: DocumentTree,
  query: string,
  model: ModelHandle,
  pageReader: PageReader,
  options?: NavigateTreeOptions
): Promise<NavigateResult> {
  const maxIterations = options?.maxIterations ?? 10;
  const treeText = serializeTree(tree.root);

  const selectedRanges: ContentRange[] = [];
  const nodesVisited: string[] = [];
  const pathNodes: DocumentNode[] = [];
  let previousContext = '';
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    const prompt = buildNavigationPrompt(
      tree,
      query,
      treeText,
      previousContext,
      iteration
    );

    const response = await model.invoke(prompt, { max_tokens: 256, temperature: 0 });
    const text = response.text.trim();

    if (text.toUpperCase().startsWith('DONE') || text === '') break;

    const nodeIds = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let readAny = false;
    for (const nodeId of nodeIds) {
      if (nodesVisited.includes(nodeId)) continue;

      const node = findNode(tree.root, nodeId);
      if (node === undefined) continue;

      nodesVisited.push(nodeId);
      const nodePath = buildPath(tree.root, nodeId);
      for (const n of nodePath) {
        if (!pathNodes.find((p) => p.node_id === n.node_id)) {
          pathNodes.push(n);
        }
      }

      const content = await pageReader(node.range);
      selectedRanges.push(node.range);
      previousContext += `\n[${nodeId}] ${node.title ?? ''}: ${content.slice(0, 500)}`;
      readAny = true;
    }

    // 아무 노드도 읽지 못했으면 종료 (LLM이 없는 node_id 반환)
    if (!readAny) break;
  }

  return {
    ranges: selectedRanges,
    path: pathNodes,
    iteration_count: iteration,
    nodes_visited: nodesVisited,
  };
}
