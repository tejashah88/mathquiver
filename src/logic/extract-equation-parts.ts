// Author: Claude Sonnet 4.5 as of 10/18/2025

/**
 * Extracts the parts of an equation split by '=' and ','
 *
 * Uses string splitting to find the first '=' and first top-level ',' to separate the equation into three parts:
 * - Index 0 (beforeEquals): Everything before the first '=' (or empty string if no '=' found)
 * - Index 1 (mainBody): Everything between the first '=' and first top-level ',' (or entire string if neither found)
 * - Index 2 (afterComma): Everything after the first top-level ',' (or empty string if no ',' found)
 *
 * Smart equals handling: The function skips '=' signs that are part of comparison operators
 * (<=, >=, !=) or LaTeX commands (\neq), so mathematical constraints are handled correctly.
 *
 * Smart comma handling: The function finds the FIRST comma at nesting level 0 (not inside {}, [], or ()).
 * This correctly separates the equation body from constraints while handling commas in LaTeX
 * subscripts/superscripts and within \left...\right delimiters.
 *
 * This function is permissive and never throws errors - it handles all inputs gracefully,
 * including empty strings, trailing commas, and other edge cases. This is useful for
 * text coloring/rendering where you want to handle partial or incomplete input.
 *
 * @param equation - The equation string to parse
 * @returns Array of [beforeEquals, mainBody, afterComma] where:
 *   - beforeEquals: Everything before the first '='
 *   - mainBody: Everything between the first '=' and first top-level ','
 *   - afterComma: Everything after the first top-level ','
 */
export default function extractEquationParts(equation: string): [string, string, string] {
  // Find first '=' that is NOT part of '<=', '>=', '!=', or '\neq'
  // We look for '=' that is not preceded by '<', '>', '!', or '\'
  let equalsIndex = -1;
  for (let i = 0; i < equation.length; i++) {
    if (equation[i] === '=') {
      const prevChar = i > 0 ? equation[i - 1] : '';
      // Skip if this '=' is part of <=, >=, !=, or \neq (in LaTeX)
      if (prevChar !== '<' && prevChar !== '>' && prevChar !== '!' && prevChar !== '\\') {
        equalsIndex = i;
        break;
      }
    }
  }

  let beforeEquals = '';
  let rest: string = equation;

  if (equalsIndex !== -1) {
    beforeEquals = equation.substring(0, equalsIndex);
    rest = equation.substring(equalsIndex + 1);
  }

  // Find first ',' at nesting level 0 (not inside {}, [], or (), and not inside \left...\right)
  // This correctly handles commas in subscripts like \theta_{y,3} and constraints like x \in [a, b]
  let depth = 0;
  let leftRightDepth = 0;
  let firstTopLevelCommaIndex = -1;

  for (let i = 0; i < rest.length; i++) {
    const char = rest[i];

    // Handle LaTeX delimiters \left and \right
    if (char === '\\' && i + 5 <= rest.length) {
      const next5 = rest.substring(i, i + 5);
      if (next5 === '\\left') {
        leftRightDepth++;
        i += 4; // Will be incremented by loop to skip the full \left
        continue;
      }
    }
    if (char === '\\' && i + 6 <= rest.length) {
      const next6 = rest.substring(i, i + 6);
      if (next6 === '\\right') {
        leftRightDepth--;
        i += 5; // Will be incremented by loop to skip the full \right
        continue;
      }
    }

    // Track nesting depth
    if (char === '{' || char === '[' || char === '(') {
      depth++;
    } else if (char === '}' || char === ']' || char === ')') {
      depth--;
    } else if (char === ',' && depth === 0 && leftRightDepth === 0) {
      // Found a comma at top level - record it and break (we want the FIRST one)
      firstTopLevelCommaIndex = i;
      break;
    }
  }

  let mainBody: string;
  let afterComma = '';

  if (firstTopLevelCommaIndex !== -1) {
    mainBody = rest.substring(0, firstTopLevelCommaIndex);
    afterComma = rest.substring(firstTopLevelCommaIndex + 1);
  } else {
    mainBody = rest;
  }

  return [beforeEquals, mainBody, afterComma];
}
