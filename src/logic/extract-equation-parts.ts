/**
 * Extracts the parts of an equation split by '=' and ','
 *
 * Uses string splitting to find the first '=' and last top-level ',' to separate the equation into three parts:
 * - Index 0 (beforeEquals): Everything before the first '=' (or empty string if no '=' found)
 * - Index 1 (mainBody): Everything between the first '=' and last top-level ',' (or entire string if neither found)
 * - Index 2 (afterComma): Everything after the last top-level ',' (or empty string if no ',' found)
 *
 * Smart equals handling: The function skips '=' signs that are part of comparison operators
 * (<=, >=, !=) or LaTeX commands (\neq), so mathematical constraints are handled correctly.
 *
 * Smart comma handling: The function finds the LAST comma at nesting level 0 (not inside {}, [], or ()).
 * This correctly handles commas in LaTeX subscripts/superscripts and within constraints.
 *
 * This function is permissive and never throws errors - it handles all inputs gracefully,
 * including empty strings, trailing commas, and other edge cases. This is useful for
 * text coloring/rendering where you want to handle partial or incomplete input.
 *
 * @param equation - The equation string to parse
 * @returns Array of [beforeEquals, mainBody, afterComma] - all strings (empty if not present)
 *
 * @example
 * extractEquationParts('Ax^2+Bx+C')
 * // Returns: ['', 'Ax^2+Bx+C', '']
 *
 * @example
 * extractEquationParts('x=Ax^2+Bx+C')
 * // Returns: ['x', 'Ax^2+Bx+C', '']
 *
 * @example
 * extractEquationParts('x^2,x>0')
 * // Returns: ['', 'x^2', 'x>0']
 *
 * @example
 * extractEquationParts('y=x^2,x>0')
 * // Returns: ['y', 'x^2', 'x>0']
 *
 * @example
 * // Handles commas in subscripts correctly:
 * extractEquationParts('\\theta_{y,3}^{wr} = x^2, x > 0')
 * // Returns: ['\\theta_{y,3}^{wr}', 'x^2', ' x > 0']
 *
 * @example
 * // Handles commas in constraints correctly:
 * extractEquationParts('y = x^2, x \\in [0, 10]')
 * // Returns: ['y', 'x^2', ' x \\in [0, 10]']
 *
 * @example
 * // Edge cases - all handled gracefully:
 * extractEquationParts('')      // ['', '', '']
 * extractEquationParts('=')     // ['', '', '']
 * extractEquationParts('x=')    // ['x', '', '']
 * extractEquationParts(',')     // ['', '', '']
 * extractEquationParts('x^2,')  // ['', 'x^2', '']
 * extractEquationParts('x=y=5') // ['x', 'y=5', '']
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

  // Find last ',' at nesting level 0 (not inside {}, [], or ())
  // This correctly handles commas in subscripts like \theta_{y,3} and constraints like x \in [a, b]
  let depth = 0;
  let lastTopLevelCommaIndex = -1;

  for (let i = 0; i < rest.length; i++) {
    const char = rest[i];

    // Handle LaTeX delimiters \left and \right
    if (char === '\\' && i + 5 < rest.length) {
      const next5 = rest.substring(i, i + 5);
      if (next5 === '\\left') {
        // Skip past \left and count the delimiter
        i += 4; // Will be incremented by loop to skip the full \left
        continue;
      }
    }
    if (char === '\\' && i + 6 < rest.length) {
      const next6 = rest.substring(i, i + 6);
      if (next6 === '\\right') {
        // Skip past \right and count the delimiter
        i += 5; // Will be incremented by loop to skip the full \right
        continue;
      }
    }

    // Track nesting depth
    if (char === '{' || char === '[' || char === '(') {
      depth++;
    } else if (char === '}' || char === ']' || char === ')') {
      depth--;
    } else if (char === ',' && depth === 0) {
      // Found a comma at top level - record it
      lastTopLevelCommaIndex = i;
    }
  }

  let mainBody: string;
  let afterComma = '';

  if (lastTopLevelCommaIndex !== -1) {
    mainBody = rest.substring(0, lastTopLevelCommaIndex);
    afterComma = rest.substring(lastTopLevelCommaIndex + 1);
  } else {
    mainBody = rest;
  }

  return [beforeEquals, mainBody, afterComma];
}
