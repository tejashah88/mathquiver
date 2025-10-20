// Author: Claude Sonnet 4.5 as of 10/11/2025

import { parseMath } from '@unified-latex/unified-latex-util-parse';
import * as Ast from '@unified-latex/unified-latex-types';

// Reference: https://www.overleaf.com/learn/latex/List_of_Greek_letters_and_math_symbols

// Greek letters - lowercase (24 letters)
// Note: omicron is typically just 'o' in LaTeX
const GREEK_LOWERCASE = [
    'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
    'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma',
    'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'
];

// Greek letters - uppercase (11 letters that differ from Latin)
const GREEK_UPPERCASE = [
    'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma',
    'Upsilon', 'Phi', 'Psi', 'Omega'
];

// Greek letter variants (alternative forms)
const GREEK_VARIANTS = [
    'varepsilon', 'vartheta', 'varkappa', 'varpi',
    'varrho', 'varsigma', 'varphi'
];

// Combine all symbol categories into a single Set for O(1) lookup
const VARIABLE_MACROS = new Set([
    ...GREEK_LOWERCASE,
    ...GREEK_UPPERCASE,
    ...GREEK_VARIANTS,
]);

const KNOWN_CONSTANTS = ['e', 'i', '\\pi'];

/**
 * Checks if a collection of AST nodes contains any variables.
 *
 * Searches for letters (a-zA-Z) or Greek symbol macros in the node tree.
 *
 * @param nodes - Array of AST nodes or arguments to check
 * @returns True if any variables are found, false otherwise
 */
function nodeContainsVariable(nodes: (Ast.Node | Ast.Argument)[]): boolean {
    return nodes.some(node => {
        if (node.type === 'string') return /[a-zA-Z]/.test(node.content);
        if (node.type === 'macro') return VARIABLE_MACROS.has(node.content);
        if (node.type === 'argument') return nodeContainsVariable(node.content);
        if (node.type === 'group') return nodeContainsVariable(node.content);
        return false;
    });
}

/**
 * Extracts the string value from an AST argument node.
 *
 * Converts AST argument nodes to their LaTeX string representation, following
 * LaTeX conventions for brace usage (single digits don't use braces, multi-character content does).
 *
 * @param arg - The AST argument to extract from
 * @returns The extracted string value with appropriate braces
 */
function extractArgumentValue(arg: Ast.Argument): string {
    const parts = arg.content.map(node => {
        if (node.type === 'string')
            return node.content;

        if (node.type === 'macro') {
            if (VARIABLE_MACROS.has(node.content)) return `\\${node.content}`;
            // Handle nested subscripts/superscripts
            if (node.args?.[0] && (node.content === '_' || node.content === '^')) {
                return `${node.content}${extractArgumentValue(node.args[0])}`;
            }
        }

        if (node.type === 'group') {
            // Recursively extract from group contents
            const groupArg: Ast.Argument = {
                type: 'argument',
                content: node.content,
                openMark: '{',
                closeMark: '}'
            };

            return extractArgumentValue(groupArg);
        }

        return '';
    });

    const result = parts.join('');

    // LaTeX convention: single digits typically don't use braces (_1, _2, ^3)
    // but letters and multi-character content do (_{o}, _{AB}, ^{g})
    const isSingleDigit = /^\d$/.test(result);

    if (isSingleDigit) {
        return result;
    } else {
        return `{${result}}`;
    }
}

/**
 * Checks if a string is purely numeric (ignoring braces).
 *
 * @param str - The string to check
 * @returns True if the string contains only digits, false otherwise
 */
const isNumeric = (str: string): boolean => /^\d+$/.test(str.replace(/[{}]/g, ''));

/**
 * Processes a variable with potential subscript and superscript modifiers.
 *
 * Extracts the complete variable name including any subscripts and superscripts,
 * handling both standalone variables and those with modifiers.
 *
 * @param baseName - The base variable name (e.g., "x" or "\\theta")
 * @param nodes - Array of AST nodes to process
 * @param index - Current position in the nodes array
 * @param variables - Set to add discovered variables to
 * @returns The next index to process in the nodes array
 */
function processVariable(
    baseName: string,
    nodes: Ast.Node[],
    index: number,
    variables: Set<string>
): number {
    const subscript = nodes[index + 1];
    const hasSub = subscript?.type === 'macro' && subscript.content === '_' && subscript.args;

    if (!hasSub) {
        // Check for standalone superscript
        const superscript = nodes[index + 1];
        if (superscript?.type === 'macro' && superscript.content === '^' && superscript.args) {
            const superVal = extractArgumentValue(superscript.args[0]);

            // If superscript contains variables, check if the entire tree is purely alphabetic
            if (nodeContainsVariable(superscript.args[0].content)) {
                variables.add(baseName);
                extractVariablesFromAST(superscript.args[0].content).forEach(v => variables.add(v));
                return index + 2;
            }

            // Add base or base with superscript
            variables.add(isNumeric(superVal) ? baseName : `${baseName}^${superVal}`);
            return index + 2;
        }

        // Standalone variable
        variables.add(baseName);
        return index + 1;
    }

    // Has subscript
    const subVal = extractArgumentValue(subscript.args![0]);
    let varName = `${baseName}_${subVal}`;

    // Check for superscript after subscript
    const superscript = nodes[index + 2];
    let nextIndex = index + 2;

    if (superscript?.type === 'macro' && superscript.content === '^' && superscript.args) {
        const superVal = extractArgumentValue(superscript.args[0]);
        if (!isNumeric(superVal)) {
            varName += `^${superVal}`;
        }

        nextIndex = index + 3;
    }

    variables.add(varName);
    return nextIndex;
}

/**
 * Extracts all variables from an array of AST nodes.
 *
 * Recursively traverses the AST to find all variable names, including those with
 * subscripts and superscripts. Excludes known mathematical constants.
 *
 * @param nodes - Array of AST nodes to extract variables from
 * @returns Sorted array of unique variable names found in the AST
 */
function extractVariablesFromAST(nodes: Ast.Node[]): string[] {
    const variables = new Set<string>();

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Handle multi-character strings by extracting each letter
        if (node.type === 'string') {
            // Strip trailing ^ or _ operators (they'll be followed by group nodes)
            const content = node.content.trim().replace(/[\^_]+$/, '');

            // Extract individual letters from the string
            for (const char of content) {
                if (/[a-zA-Z]/.test(char)) {
                    // Check if this letter has a subscript/superscript following
                    // Only if it's a single-letter string should we check for modifiers
                    if (content.length === 1) {
                        i = processVariable(char, nodes, i, variables) - 1;
                        break;
                    } else {
                        // Multi-char string: split into individual letters
                        variables.add(char);
                    }
                }
            }

            continue;
        }

        // Variable macros (Greek letters, special symbols, etc.)
        if (node.type === 'macro' && VARIABLE_MACROS.has(node.content)) {
            i = processVariable(`\\${node.content}`, nodes, i, variables) - 1;
            continue;
        }

        // Macro with arguments
        if (node.type === 'macro' && node.args) {
            node.args.forEach(arg => {
                extractVariablesFromAST(arg.content).forEach(v => variables.add(v));
            });
        }

        if (node.type === 'group') {
            extractVariablesFromAST(node.content).forEach(v => variables.add(v));
        }
    }

    // Exclude known mathematical constants like e and pi
    const varList = Array
        .from(variables)
        .filter(_var => !KNOWN_CONSTANTS.includes(_var));

    return varList.sort();
}

/**
 * Extracts all variables from a LaTeX expression string.
 *
 * Parses the LaTeX string into an AST and extracts all variable names,
 * including those with subscripts and superscripts. Greek letters and
 * multi-character variables are supported. Mathematical constants are excluded.
 *
 * @param latexExpr - The LaTeX expression to parse
 * @returns Sorted array of unique variable names found in the expression
 */
function extractLatexVariables(latexExpr: string): string[] {
    const ast = parseMath(latexExpr);
    return extractVariablesFromAST(ast);
}

export { extractLatexVariables };
