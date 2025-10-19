/**
 * Extracts the parts of an equation split by '=' and ','
 *
 * Uses string splitting to find the first '=' and first ',' to separate the equation into three parts:
 * - Index 0 (beforeEquals): Everything before the first '=' (or empty string if no '=' found)
 * - Index 1 (mainBody): Everything between the first '=' and first ',' (or entire string if neither found)
 * - Index 2 (afterComma): Everything after the first ',' (or empty string if no ',' found)
 *
 * Smart equals handling: The function skips '=' signs that are part of comparison operators
 * (<=, >=, !=) or LaTeX commands (\neq), so mathematical constraints are handled correctly.
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

  // Find first ',' in the remaining string to split mainBody and afterComma
  const commaIndex = rest.indexOf(',');
  let mainBody: string;
  let afterComma = '';

  if (commaIndex !== -1) {
    mainBody = rest.substring(0, commaIndex);
    afterComma = rest.substring(commaIndex + 1);
  } else {
    mainBody = rest;
  }

  return [beforeEquals, mainBody, afterComma];
}
