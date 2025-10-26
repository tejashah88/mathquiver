import { CharacterIndexItem } from './mathfield-dom-parser';

/**
 * Utility function to apply a style to a range of characters.
 *
 * @param index - The character index array
 * @param startIndex - Starting character index (inclusive)
 * @param endIndex - Ending character index (exclusive)
 * @param styles - CSS styles to apply
 */
export function applyStyleToRange(
  index: CharacterIndexItem[],
  startIndex: number,
  endIndex: number,
  styles: Partial<CSSStyleDeclaration>
): void {
  index
    .filter(item => item.index >= startIndex && item.index < endIndex)
    .forEach(item => {
      Object.assign(item.element.style, styles);
    });
}

/**
 * Utility function to clear all inline styles from character elements.
 *
 * @param index - The character index array
 */
export function clearColors(index: CharacterIndexItem[]): void {
  index.forEach(item => {
    // Preserve MathLive's original styles by only removing color
    item.element.style.color = '';
  });
}
