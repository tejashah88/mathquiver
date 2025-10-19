/**
 * Parses MathLive's shadow DOM structure to build a character-level index
 * without mutating the original LaTeX expression.
 *
 * This allows for direct DOM manipulation and styling of rendered math content,
 * enabling features like selective coloring of equation parts.
 */

import { MathfieldElement } from 'mathlive';

/**
 * Represents a single character in the rendered mathfield with metadata
 * for positioning, styling, and context.
 */
export interface CharacterIndexItem {
  /** The actual character (e.g., '=', 'M', '2', '∈') */
  char: string;

  /** Sequential index starting from 0 */
  index: number;

  /** Reference to the DOM element containing this character */
  element: HTMLElement;

  /** MathLive's internal atom ID (from data-atom-id attribute) */
  atomId?: string;

  /** Character classification: 'variable', 'operator', 'number', 'punctuation', 'symbol' */
  type: string;

  /** Nesting depth: 0 = top-level, 1+ = nested (subscript, superscript, fraction, etc.) */
  depth: number;

  /** Context information: 'subscript', 'superscript', 'numerator', 'denominator', 'base' */
  context: string;
}

/**
 * CSS class names used by MathLive that should be skipped during traversal.
 * These are structural/spacing elements that don't contain actual characters.
 */
export const SKIP_CLASSES = [
  'ML__strut',           // Vertical spacing helper
  'ML__strut--bottom',   // Vertical spacing helper
  'ML__pstrut',          // Positioning strut
  'ML__vlist-s',         // Contains zero-width space (​)
  'ML__frac-line',       // Fraction horizontal line
  'ML__nulldelimiter',   // Empty delimiter spacer
  'ML__keyboard-sink',   // Hidden input element
  'ML__sr-only',         // Screen reader only content
  'ML__virtual-keyboard-toggle', // Virtual keyboard button
  'ML__menu-toggle',     // Menu button
  'ML__caret',           // Cursor/caret element
];

/**
 * Element types that increase nesting depth.
 * Used to track when we're inside subscripts, superscripts, or fractions.
 */
export const NESTING_CONTAINERS = [
  'ML__msubsup',  // Subscript/superscript container
  'ML__mfrac',    // Fraction container
];

/**
 * Classifies a character based on its content and CSS classes.
 */
export function classifyCharacter(char: string, element: HTMLElement): string {
  // Check CSS classes for hints
  const classList = element.className;

  if (classList.includes('ML__mathit')) {
    return 'variable';
  }

  if (classList.includes('ML__cmr')) {
    // Check if it's a number, operator, or punctuation
    if (/^\d$/.test(char)) return 'number';
    if (/^[+\-*/=<>≤≥≠]$/.test(char)) return 'operator';
    if (/^[,;:]$/.test(char)) return 'punctuation';
    return 'symbol';
  }

  // Fallback: classify by character content
  if (/^\d$/.test(char)) return 'number';
  if (/^[a-zA-Z]$/.test(char)) return 'variable';
  if (/^[+\-*/=<>≤≥≠]$/.test(char)) return 'operator';
  if (/^[,;:]$/.test(char)) return 'punctuation';

  return 'symbol';
}

/**
 * Determines the context of an element based on its position in the DOM tree.
 * Uses DOM structure ordering (more robust) instead of brittle style.top values.
 */
export function getContext(element: HTMLElement): string {
  let current: HTMLElement | null = element;

  // Walk up the tree looking for context indicators
  while (current) {
    // Check if we're inside a subscript/superscript container
    if (current.classList.contains('ML__msubsup')) {
      // Find the vlist container that holds positioned children
      const vlist = current.querySelector('.ML__vlist');
      if (vlist) {
        // Get all positioned children (those with style.top set)
        // MathLive guarantees: first positioned = subscript, second = superscript
        const positionedChildren = Array.from(vlist.children).filter(
          (child): child is HTMLElement =>
            child instanceof HTMLElement && child.style.top !== ''
        );

        // Check which positioned child contains our element
        for (let i = 0; i < positionedChildren.length; i++) {
          const positionedChild = positionedChildren[i];
          if (element === positionedChild || positionedChild.contains(element)) {
            // First positioned child = subscript, second = superscript
            return i === 0 ? 'subscript' : 'superscript';
          }
        }
      }
    }

    // Check if we're in a fraction
    if (current.classList.contains('ML__mfrac')) {
      // Find the vlist container
      const vlist = current.querySelector('.ML__vlist');
      if (vlist) {
        // Get positioned children with style.top
        const positionedChildren = Array.from(vlist.children).filter(
          (child): child is HTMLElement =>
            child instanceof HTMLElement && child.style.top !== ''
        );

        // Check which positioned child contains our element
        // MathLive renders: first = numerator, second = denominator
        for (let i = 0; i < positionedChildren.length; i++) {
          const positionedChild = positionedChildren[i];
          if (element === positionedChild || positionedChild.contains(element)) {
            return i === 0 ? 'numerator' : 'denominator';
          }
        }
      }
    }

    current = current.parentElement;
  }

  return 'base';
}

/**
 * Recursively traverses a DOM node and extracts characters in order.
 */
export function traverseNode(
  node: Node,
  result: CharacterIndexItem[],
  depth: number,
  currentIndex: { value: number }
): void {
  // Skip text nodes that are just whitespace or zero-width spaces
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    // Skip whitespace and zero-width space (​)
    if (text.trim() === '' || text === '\u200B') {
      return;
    }

    // Extract meaningful characters
    const parentElement = node.parentElement;
    if (!parentElement) return;

    // Skip if parent has a skip class
    if (SKIP_CLASSES.some(cls => parentElement.classList.contains(cls))) {
      return;
    }

    // Process each character in the text node
    for (const char of text) {
      if (char.trim() === '') continue;

      const atomId = parentElement.getAttribute('data-atom-id') || undefined;
      const type = classifyCharacter(char, parentElement);
      const context = getContext(parentElement);

      result.push({
        char,
        index: currentIndex.value++,
        element: parentElement,
        atomId,
        type,
        depth,
        context,
      });
    }
    return;
  }

  // Only process element nodes
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as HTMLElement;

  // Skip elements with skip classes
  if (SKIP_CLASSES.some(cls => element.classList.contains(cls))) {
    return;
  }

  // Check if this element increases nesting depth
  const isNestingContainer = NESTING_CONTAINERS.some(cls =>
    element.classList.contains(cls)
  );

  const newDepth = isNestingContainer ? depth + 1 : depth;

  // Recursively process children
  for (const child of Array.from(element.childNodes)) {
    traverseNode(child, result, newDepth, currentIndex);
  }
}

/**
 * Parses a MathfieldElement's shadow DOM to build a character-level index.
 *
 * @param mathfield - The MathfieldElement to parse
 * @returns Array of CharacterIndexItem objects in visual order
 *
 * @example
 * const mathfield = document.querySelector('math-field');
 * const index = parseMathfieldDOM(mathfield);
 *
 * // Find the equals sign
 * const equalsItem = index.find(item => item.char === '=' && item.depth === 0);
 *
 * // Color everything before the equals sign gray
 * if (equalsItem) {
 *   index
 *     .filter(item => item.index < equalsItem.index)
 *     .forEach(item => item.element.style.color = 'gray');
 * }
 */
export function parseMathfieldDOM(mathfield: MathfieldElement): CharacterIndexItem[] {
  const shadowRoot = mathfield.shadowRoot;
  if (!shadowRoot) {
    throw new Error('Shadow root not accessible on mathfield element');
  }

  // Find the base container that holds the rendered math content
  const baseElement = shadowRoot.querySelector('.ML__base');
  if (!baseElement) {
    throw new Error('Could not find .ML__base element in shadow root');
  }

  const result: CharacterIndexItem[] = [];
  const currentIndex = { value: 0 };

  // Start traversal from the base element
  traverseNode(baseElement, result, 0, currentIndex);

  return result;
}

/**
 * Utility function to apply a style to a range of characters.
 *
 * @param index - The character index array
 * @param startIndex - Starting character index (inclusive)
 * @param endIndex - Ending character index (exclusive)
 * @param styles - CSS styles to apply
 *
 * @example
 * const index = parseMathfieldDOM(mathfield);
 * const equalsSign = findCharacter(index, '=');
 *
 * if (equalsSign) {
 *   // Color everything before equals sign gray
 *   applyStyleToRange(index, 0, equalsSign.index, { color: 'gray' });
 * }
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
 *
 * @example
 * const index = parseMathfieldDOM(mathfield);
 * clearStyles(index); // Remove all custom colors/styles
 */
export function clearStyles(index: CharacterIndexItem[]): void {
  index.forEach(item => {
    // Preserve MathLive's original styles by only removing color
    item.element.style.color = '';
  });
}
