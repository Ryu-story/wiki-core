/**
 * Noise filter 헬퍼 4종 + combine.
 *
 * 메커니즘 코어 / 룰 plugin 분리 (Mercury 2차 결정 — domain_feedback_log.md):
 * - 코어: HTML strip / 짧은 길이 / CSS 패턴 / 빈 줄
 * - Plugin: 도메인 특수 룰 (DART HTML 정규식 / URL 토큰 / 약사 인사말 등)
 *
 * SPEC: packages/core/SPEC.md §3.1
 */

const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const HTML_ENTITY_RE = /&(?:amp|lt|gt|quot|#39|nbsp);/g;
const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/**
 * HTML 태그 제거 + 주요 entity decode. 반환은 string (transform).
 * Predicate 가 아니므로 `combine` chain 의 *사전 처리* 단계에서 사용.
 */
export function stripHtml(text: string): string {
  return text
    .replace(HTML_TAG_RE, '')
    .replace(HTML_ENTITY_RE, (m) => HTML_ENTITY_MAP[m] ?? m);
}

/**
 * `text.trim().length < minChars` predicate.
 *
 * @param text  검사 대상
 * @param minChars  default 10. plugin 이 도메인 임계값 자유 지정.
 */
export function isTooShort(text: string, minChars: number = 10): boolean {
  return text.trim().length < minChars;
}

const CSS_NOISE_RE =
  /\{[^}]*:[^}]*\}|@(?:media|import|font-face|keyframes)\b|(?:^|\s)(?:\d+\.?\d*)(?:px|rem|em|vh|vw)\s*[;}]?/;

/**
 * CSS 노이즈 패턴 매치 — `{prop: val}` / `@media` / `12px;` 등.
 */
export function matchesCssNoise(text: string): boolean {
  return CSS_NOISE_RE.test(text);
}

/**
 * 공백·빈 문자열 검사.
 */
export function isBlankOrWhitespace(text: string): boolean {
  return text.trim().length === 0;
}

/**
 * Predicate or-chain. 첫 true 반환 시 즉시 drop.
 *
 * 예 (rootric — DART HTML):
 * ```ts
 * const dropPredicate = combine([
 *   (t) => isTooShort(t, 20),
 *   matchesCssNoise,
 *   dartHtmlNoise,                 // plugin 도메인 룰
 * ]);
 * const filter = (text: string) => dropPredicate(stripHtml(text));
 * ```
 */
export function combine(
  rules: Array<(text: string) => boolean>
): (text: string) => boolean {
  return (text) => {
    for (const rule of rules) {
      if (rule(text)) return true;
    }
    return false;
  };
}
