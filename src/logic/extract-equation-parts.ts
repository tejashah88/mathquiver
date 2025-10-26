// Author: Claude Sonnet 4.5 as of 10/25/2025
// AST-based implementation of equation parts extraction
// Uses AST for structural analysis but extracts from original string to preserve exact formatting

import { parseMath } from '@unified-latex/unified-latex-util-parse';
import * as Ast from '@unified-latex/unified-latex-types';

/**
 * Gets the character offset range for a node and all its content.
 * For macros with arguments, this includes the arguments.
 *
 * @param node - The node to get the range for
 * @returns Object with start and end offsets, or null if no position info
 */
function getNodeCharRange(node: Ast.Node): { start: number; end: number } | null {
  if (!node.position) {
    return null;
  }

  const start = node.position.start.offset;
  let end = node.position.end.offset;

  // For macros with arguments, we need to include the argument positions
  if (node.type === 'macro' && node.args) {
    for (const arg of node.args) {
      if (arg.type === 'argument' && arg.position) {
        end = Math.max(end, arg.position.end.offset);
      }
    }
  }

  return { start, end };
}

/**
 * Finds the character offset of the first equals sign that is NOT part of a comparison operator.
 * Skips equals signs that are preceded by <, >, !, or \ in the previous String node.
 *
 * @param nodes - Array of AST nodes to search
 * @returns Character offset of the first valid equals sign, or -1 if not found
 */
function findFirstEqualsOffset(nodes: Ast.Node[]): number {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Look for String nodes containing "="
    if (node.type === 'string' && node.content === '=') {
      // Check if previous node is a String ending with <, >, !, or \
      if (i > 0) {
        const prevNode = nodes[i - 1];
        if (prevNode.type === 'string') {
          const lastChar = prevNode.content.slice(-1);
          if (lastChar === '<' || lastChar === '>' || lastChar === '!' || lastChar === '\\') {
            // This is part of a comparison operator, skip it
            continue;
          }
        }
      }

      // This is a valid equals sign - return its character offset
      if (node.position) {
        return node.position.start.offset;
      }
    }
  }

  return -1;
}

/**
 * Tracks depth state while traversing nodes.
 * Depth increases when entering nested structures (parentheses, macro args, \left...\right).
 */
interface DepthTracker {
  parenDepth: number;     // Depth from ( and )
  leftRightDepth: number; // Depth from \left and \right macros
}

/**
 * Updates depth based on a node.
 * Returns the new depth after processing this node.
 *
 * @param node - The node to process
 * @param depth - Current depth state
 * @returns Updated depth state
 */
function updateDepth(node: Ast.Node, depth: DepthTracker): DepthTracker {
  const newDepth = { ...depth };

  if (node.type === 'string') {
    // Count parentheses in the string
    for (const char of node.content) {
      if (char === '(') {
        newDepth.parenDepth++;
      } else if (char === ')') {
        newDepth.parenDepth--;
      }
    }
  } else if (node.type === 'macro') {
    if (node.content === 'left') {
      newDepth.leftRightDepth++;
    } else if (node.content === 'right') {
      newDepth.leftRightDepth--;
    }
  }

  return newDepth;
}

/**
 * Finds the character offset of the first comma at top-level (depth 0).
 * Skips commas inside parentheses, macro arguments, and \left...\right blocks.
 *
 * @param nodes - Array of AST nodes to search
 * @param startIndex - Index to start searching from (default 0)
 * @returns Character offset of the first top-level comma, or -1 if not found
 */
function findFirstTopLevelCommaOffset(nodes: Ast.Node[], startIndex: number = 0): number {
  let depth: DepthTracker = { parenDepth: 0, leftRightDepth: 0 };

  for (let i = startIndex; i < nodes.length; i++) {
    const node = nodes[i];

    // Check if this node is a comma at depth 0 BEFORE updating depth
    // This ensures we catch commas before they're affected by depth changes
    if (
      node.type === 'string' &&
      node.content === ',' &&
      depth.parenDepth === 0 &&
      depth.leftRightDepth === 0
    ) {
      // Return the character offset of this comma
      if (node.position) {
        return node.position.start.offset;
      }
    }

    // Update depth for this node
    depth = updateDepth(node, depth);

    // For macros with args, we need to skip over the arguments
    // because they represent nested content (like subscripts/superscripts)
    if (node.type === 'macro' && node.args) {
      // Arguments are already parsed and nested, so they don't affect
      // our top-level comma search. We just skip them.
      // The comma inside a subscript like \theta_{y,3} is inside the args,
      // so it won't be encountered in this loop.
      continue;
    }
  }

  return -1;
}

/**
 * Finds the index of the node that contains or comes after a given character offset.
 *
 * @param nodes - Array of AST nodes
 * @param charOffset - Character offset to search for
 * @returns Index of the node at or after this offset, or nodes.length if offset is beyond all nodes
 */
function findNodeIndexAtOffset(nodes: Ast.Node[], charOffset: number): number {
  for (let i = 0; i < nodes.length; i++) {
    const range = getNodeCharRange(nodes[i]);
    if (range && charOffset < range.end) {
      return i;
    }
  }
  return nodes.length;
}

/**
 * Extracts the parts of an equation split by '=' and ','
 *
 * Uses AST-based parsing to find the first '=' and first top-level ',' to separate the equation into three parts:
 * - Index 0 (funcDeclare): Everything before the first '=' (or empty string if no '=' found)
 * - Index 1 (formulaBody): Everything between the first '=' and first top-level ',' (or entire string if neither found)
 * - Index 2 (limitDef): Everything after the first top-level ',' (or empty string if no ',' found)
 *
 * Smart equals handling: The function skips '=' signs that are part of comparison operators
 * (<=, >=, !=) by checking if the previous node is a String ending with <, >, or !.
 *
 * Smart comma handling: The function finds the FIRST comma at nesting level 0 (not inside (),
 * macro args, or \left...\right blocks). This correctly separates the equation body from
 * constraints while handling commas in LaTeX subscripts/superscripts and intervals.
 *
 * This function is permissive and never throws errors - it handles all inputs gracefully,
 * including empty strings, trailing commas, and other edge cases. This is useful for
 * text coloring/rendering where you want to handle partial or incomplete input.
 *
 * Implementation note: This uses a hybrid approach - AST for structural analysis but
 * substring extraction from the original string to preserve exact formatting and whitespace.
 *
 * @param equation - The equation string to parse
 * @returns Array of [funcDeclare, formulaBody, limitDef] where:
 *   - funcDeclare: Everything before the first '='
 *   - formulaBody: Everything between the first '=' and first top-level ','
 *   - limitDef: Everything after the first top-level ','
 */
export default function extractEquationParts(equation: string): [string, string, string] {
  // Handle empty string
  if (equation.length === 0) {
    return ['', '', ''];
  }

  // Parse the equation into an AST
  const ast = parseMath(equation);

  // If parsing resulted in empty AST, return empty parts
  if (ast.length === 0) {
    return ['', '', ''];
  }

  // Find the character offset of the first equals sign
  const equalsOffset = findFirstEqualsOffset(ast);

  let funcDeclare = '';
  let restStartOffset = 0;

  if (equalsOffset !== -1) {
    // Split at the equals sign
    funcDeclare = equation.substring(0, equalsOffset);
    restStartOffset = equalsOffset + 1; // +1 to skip the equals character
  }

  // Find the node index where we should start searching for commas
  // (we need to search from after the equals sign)
  const startNodeIndex = findNodeIndexAtOffset(ast, restStartOffset);

  // Find the character offset of the first top-level comma in the rest
  const commaOffset = findFirstTopLevelCommaOffset(ast, startNodeIndex);

  let formulaBody: string;
  let limitDef = '';

  if (commaOffset !== -1) {
    // Split at the comma
    formulaBody = equation.substring(restStartOffset, commaOffset);
    limitDef = equation.substring(commaOffset + 1); // +1 to skip the comma character
  } else {
    // No comma found
    formulaBody = equation.substring(restStartOffset);
  }

  return [funcDeclare, formulaBody, limitDef];
}
