// Author: Claude Sonnet 4.5 as of 10/18/2025

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
 * These are elements that don't contain meaningful text content and should not be traversed.
 *
 * IMPORTANT: Only include elements that should NOT be traversed at all.
 * Container elements like ML__vlist-t, ML__msubsup, ML__center etc. should NOT be here
 * because we need to traverse through them to reach the actual text nodes inside.
 */
export const SKIP_CLASSES = [
  'ML__strut',           // Vertical spacing helper
  'ML__strut--bottom',   // Vertical spacing helper
  'ML__pstrut',          // Positioning strut
  'ML__vlist-s',         // Contains zero-width space (​)
  'ML__frac-line',       // Fraction horizontal line (rendered as SVG/CSS, no text)
  'ML__sqrt-sign',       // Square root sign container
  'ML__sqrt-line',       // Square root overline
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
 *
 * Font classes from MathLive (mathlive/src/core/modes-math.ts):
 * - ML__mathit: Italic math font (variables)
 * - ML__cmr: Computer Modern Roman (main font for operators, numbers, punctuation)
 * - ML__mathbf, ML__mathbfit: Bold math fonts
 * - ML__ams: AMS symbols
 * - ML__sans: Sans-serif
 * - ML__cal: Calligraphic
 * - ML__script: Script
 * - ML__frak: Fraktur
 * - ML__tt: Typewriter/monospace
 * - ML__bb: Blackboard/double-struck
 */
export function classifyCharacter(char: string, element: HTMLElement): string {
  // Check CSS classes for hints
  const classList = element.className;

  // Math italic font - typically used for variables
  if (classList.includes('ML__mathit') || classList.includes('ML__mathbfit')) {
    return 'variable';
  }

  // Bold math font - typically variables in bold
  if (classList.includes('ML__mathbf')) {
    return 'variable';
  }

  // Script, calligraphic, fraktur, and blackboard fonts - typically variables
  if (
    classList.includes('ML__script') ||
    classList.includes('ML__cal') ||
    classList.includes('ML__frak') ||
    classList.includes('ML__bb')
  ) {
    return 'variable';
  }

  // Computer Modern Roman (main font) - context-dependent
  if (classList.includes('ML__cmr')) {
    // Check if it's a number, operator, or punctuation
    if (/^\d$/.test(char)) return 'number';
    if (/^[+\-*/=<>≤≥≠∈∉⊂⊃⊆⊇∪∩]$/.test(char)) return 'operator';
    if (/^[,;:.]$/.test(char)) return 'punctuation';
    if (/^[()[\]{}]$/.test(char)) return 'punctuation';
    return 'symbol';
  }

  // AMS symbols font - typically operators or symbols
  if (classList.includes('ML__ams')) {
    if (/^[+\-*/=<>≤≥≠∈∉⊂⊃⊆⊇∪∩]$/.test(char)) return 'operator';
    return 'symbol';
  }

  // Sans-serif and typewriter fonts - context-dependent
  if (classList.includes('ML__sans') || classList.includes('ML__tt')) {
    if (/^\d$/.test(char)) return 'number';
    if (/^[a-zA-Z]$/.test(char)) return 'variable';
    if (/^[+\-*/=<>≤≥≠]$/.test(char)) return 'operator';
    if (/^[,;:.]$/.test(char)) return 'punctuation';
    return 'symbol';
  }

  // Fallback: classify by character content
  if (/^\d$/.test(char)) return 'number';
  if (/^[a-zA-Z]$/.test(char)) return 'variable';
  if (/^[+\-*/=<>≤≥≠∈∉⊂⊃⊆⊇∪∩]$/.test(char)) return 'operator';
  if (/^[,;:.]$/.test(char)) return 'punctuation';
  if (/^[()[\]{}]$/.test(char)) return 'punctuation';

  return 'symbol';
}

/**
 * Determines the context of an element based on its position in the DOM tree.
 * Uses DOM structure ordering based on actual MathLive rendering behavior.
 *
 * MathLive DOM structure:
 * - Subscript/Superscript: ML__msubsup > ML__vlist-t > ML__vlist-r > ML__vlist > positioned spans
 *   First positioned span = subscript, second = superscript
 * - Fractions: ML__mfrac > ML__vlist-t > ML__vlist-r > ML__vlist > positioned spans with ML__center
 *   Looking at style.top values: more negative (smaller) = numerator, less negative = denominator
 */
export function getContext(element: HTMLElement): string {
  let current: HTMLElement | null = element;

  // Walk up the tree looking for context indicators
  while (current) {
    // Check if we're inside a subscript/superscript container
    if (current.classList.contains('ML__msubsup')) {
      // Navigate through the vlist structure: ML__msubsup > ML__vlist-t > ML__vlist-r > ML__vlist
      const vlistT = current.querySelector('.ML__vlist-t');
      if (vlistT) {
        const vlistR = vlistT.querySelector('.ML__vlist-r');
        if (vlistR) {
          const vlist = vlistR.querySelector('.ML__vlist');
          if (vlist) {
            // Get direct children of vlist that have style.top set (these are the positioned elements)
            const positionedChildren = Array.from(vlist.children).filter(
              (child): child is HTMLElement => {
                // In JSDOM, need to check if it's an Element with nodeType 1
                if (child.nodeType !== 1) return false;
                const htmlChild = child as HTMLElement;
                return (
                  htmlChild.style &&
                  htmlChild.style.top &&
                  htmlChild.style.top !== '' &&
                  !htmlChild.classList.contains('ML__vlist-s') // Skip the zero-width space marker
                );
              }
            );

            // Check which positioned child contains our element
            // MathLive renders: first positioned child = subscript, second = superscript
            for (let i = 0; i < positionedChildren.length; i++) {
              const positionedChild = positionedChildren[i];
              if (element === positionedChild || positionedChild.contains(element)) {
                // First positioned child = subscript, second = superscript
                return i === 0 ? 'subscript' : 'superscript';
              }
            }
          }
        }
      }
    }

    // Check if we're in a fraction
    if (current.classList.contains('ML__mfrac')) {
      // Navigate through the vlist structure: ML__mfrac > ML__vlist-t > ML__vlist-r > ML__vlist
      const vlistT = current.querySelector('.ML__vlist-t');
      if (vlistT) {
        const vlistR = vlistT.querySelector('.ML__vlist-r');
        if (vlistR) {
          const vlist = vlistR.querySelector('.ML__vlist');
          if (vlist) {
            // Get positioned children with ML__center class (numerator and denominator)
            // Skip the fraction line which doesn't have ML__center
            const centeredChildren = Array.from(vlist.children).filter(
              (child): child is HTMLElement => {
                // In JSDOM, need to check if it's an Element with nodeType 1
                if (child.nodeType !== 1) return false;
                const htmlChild = child as HTMLElement;
                return (
                  htmlChild.classList.contains('ML__center') &&
                  htmlChild.style &&
                  htmlChild.style.top &&
                  htmlChild.style.top !== ''
                );
              }
            );

            // Sort by top value (more negative = higher up = numerator)
            centeredChildren.sort((a, b) => {
              const topA = parseFloat(a.style.top) || 0;
              const topB = parseFloat(b.style.top) || 0;
              return topA - topB; // Sort ascending (most negative first)
            });

            // Check which child contains our element
            for (let i = 0; i < centeredChildren.length; i++) {
              const centeredChild = centeredChildren[i];
              if (element === centeredChild || centeredChild.contains(element)) {
                // First (most negative top) = numerator, second = denominator
                return i === 0 ? 'numerator' : 'denominator';
              }
            }
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
export function clearStyles(index: CharacterIndexItem[]): void {
  index.forEach(item => {
    // Preserve MathLive's original styles by only removing color
    item.element.style.color = '';
  });
}
