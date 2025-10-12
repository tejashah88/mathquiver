// LaTeX Variable Extractor
// Authored by Claude Sonnet 4.5 as of 10/11/2025

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

const KNOWN_CONSTANTS = ['e', '\\pi'];

// Check if nodes contain any variables (letters or Greek symbols)
function nodeContainsVariable(nodes: (Ast.Node | Ast.Argument)[]): boolean {
    return nodes.some(node => {
        if (node.type === 'string') return /[a-zA-Z]/.test(node.content);
        if (node.type === 'macro') return VARIABLE_MACROS.has(node.content);
        if (node.type === 'argument') return nodeContainsVariable(node.content);
        if (node.type === 'group') return nodeContainsVariable(node.content);
        return false;
    });
}

// Extract string value from argument, using LaTeX conventions for brace usage
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

// Check if string is purely numeric
const isNumeric = (str: string): boolean => /^\d+$/.test(str.replace(/[{}]/g, ''));

// Process a variable with potential subscript and superscript
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

            // If superscript contains variables, extract them separately
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

// Extract variables from AST nodes
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
                        // Multi-char string: just add each letter as standalone
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

// Extract variables from LaTeX string using parseMath
function extractLatexVariables(latexExpr: string): string[] {
    const ast = parseMath(latexExpr);
    return extractVariablesFromAST(ast);
}

export { extractLatexVariables };
