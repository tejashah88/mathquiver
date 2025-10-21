// New implementation of LaTeX variable extraction
// Based on context-aware visitor pattern with clear separation of concerns
// Author: Claude Sonnet 4.5 as of 10/19/2025

import { parseMath } from '@unified-latex/unified-latex-util-parse';
import * as Ast from '@unified-latex/unified-latex-types';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Greek letters - lowercase (24 letters)
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

const KNOWN_CONSTANTS = new Set(['e', 'i', '\\pi']);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ModifierAnalysis {
    isPureAlphabetic: boolean;
    containsVariables: boolean;
    isNumericOnly: boolean;
    nestingDepth: number;  // How many levels of nesting (0 = no nesting, 1 = one level, etc.)
    rawString: string;
    nodes: Ast.Node[];
}

// ============================================================================
// PART 1: CLASSIFICATION FUNCTIONS
// ============================================================================

/**
 * Checks if content is purely alphabetic (no operators, numbers, or functions).
 * This is used to determine if a subscript/superscript should be kept as part
 * of the variable name or extracted separately.
 *
 * Special handling: Inside braces like {b^{c^{d}}}, the parser creates strings like "b^"
 * followed by groups. We need to recognize this pattern as nested superscripts.
 */
function isContentPureAlphabetic(nodes: Ast.Node[]): boolean {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (node.type === 'string') {
            const content = node.content.trim();

            // Check for pattern like "b^" followed by a group (nested superscript inside braces)
            if (/^[a-zA-Z]+[\^_]$/.test(content)) {
                // This is a variable followed by ^ or _ as a character (not macro)
                // Check if next node is a group (the nested content)
                const nextNode = nodes[i + 1];
                if (nextNode && nextNode.type === 'group') {
                    // Recursively check if the group content is also pure alphabetic
                    if (!isContentPureAlphabetic(nextNode.content)) {
                        return false;
                    }
                    // Skip the group since we've already processed it
                    i++;
                    continue;
                }
                // If no group follows, treat the ^ or _ as a non-alphabetic character
                return false;
            }

            // Must be purely alphabetic (or empty/whitespace)
            if (content.length > 0 && !/^[a-zA-Z]+$/.test(content)) {
                return false;
            }
        } else if (node.type === 'macro') {
            // Greek letters are OK
            if (VARIABLE_MACROS.has(node.content)) {
                continue;
            }

            // Nested modifiers are OK if their content is also pure alphabetic
            if ((node.content === '^' || node.content === '_') && node.args) {
                for (const arg of node.args) {
                    if (!isContentPureAlphabetic(arg.content)) {
                        return false;
                    }
                }
                continue;
            }

            // Any other macro means not pure alphabetic
            return false;
        } else if (node.type === 'group') {
            if (!isContentPureAlphabetic(node.content)) {
                return false;
            }
        }
        // Whitespace, comments, etc. are OK - just skip them
    }

    return true;
}

/**
 * Checks if nodes contain any variables (not just numbers/operators).
 */
function containsVariables(nodes: Ast.Node[]): boolean {
    for (const node of nodes) {
        if (node.type === 'string') {
            if (/[a-zA-Z]/.test(node.content)) {
                return true;
            }
        } else if (node.type === 'macro') {
            if (VARIABLE_MACROS.has(node.content)) {
                return true;
            }
        } else if (node.type === 'group') {
            if (containsVariables(node.content)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Counts the nesting depth of superscripts/subscripts in a node tree.
 * Returns 0 for no nesting, 1 for one level (e.g., "x^a"), 2 for two levels (e.g., "x^{a^b}"), etc.
 */
function countNestingDepth(nodes: Ast.Node[]): number {
    let maxDepth = 0;

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (node.type === 'string') {
            // Check for pattern like "b^" followed by a group (nested modifier inside braces)
            if (/^[a-zA-Z]+[\^_]$/.test(node.content.trim())) {
                const nextNode = nodes[i + 1];
                if (nextNode && nextNode.type === 'group') {
                    // Recursively count depth in the group
                    const nestedDepth = 1 + countNestingDepth(nextNode.content);
                    maxDepth = Math.max(maxDepth, nestedDepth);
                    i++; // Skip the group
                    continue;
                }
            }
        } else if (node.type === 'macro' && (node.content === '^' || node.content === '_') && node.args) {
            // Count depth of nested modifiers
            const nestedDepth = 1 + countNestingDepth(node.args[0].content);
            maxDepth = Math.max(maxDepth, nestedDepth);
        } else if (node.type === 'group') {
            const nestedDepth = countNestingDepth(node.content);
            maxDepth = Math.max(maxDepth, nestedDepth);
        }
    }

    return maxDepth;
}

/**
 * Checks if content is purely numeric.
 */
function isNumericOnly(nodes: Ast.Node[]): boolean {
    for (const node of nodes) {
        if (node.type === 'string') {
            const content = node.content.trim();
            if (content.length > 0 && !/^\d+$/.test(content)) {
                return false;
            }
        } else if (node.type === 'group') {
            if (!isNumericOnly(node.content)) {
                return false;
            }
        } else if (node.type === 'macro' || node.type === 'whitespace' || node.type === 'parbreak') {
            // Skip whitespace, but any macro makes it non-numeric
            if (node.type === 'macro') {
                return false;
            }
        }
    }
    return true;
}

/**
 * Converts AST nodes to LaTeX string representation.
 * Follows LaTeX conventions for brace usage.
 *
 * Special handling: When inside braces, "b^" followed by a group represents nested
 * superscripts like {b^{c^{d}}}. We need to reconstruct this properly.
 */
function toLatexString(nodes: Ast.Node[]): string {
    const parts: string[] = [];

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (node.type === 'string') {
            const content = node.content;

            // Check for pattern like "b^" or "b_" followed by a group (nested modifier)
            if (/^[a-zA-Z]+[\^_]$/.test(content.trim())) {
                const nextNode = nodes[i + 1];
                if (nextNode && nextNode.type === 'group') {
                    // Reconstruct as: letter + modifier + {group}
                    const letter = content.trim().slice(0, -1); // Remove the ^ or _
                    const modifier = content.trim().slice(-1); // Get the ^ or _
                    const groupContent = toLatexString(nextNode.content);
                    parts.push(letter + modifier + `{${groupContent}}`);
                    i++; // Skip the group since we processed it
                    continue;
                }
            }

            parts.push(content);
        } else if (node.type === 'macro') {
            if (VARIABLE_MACROS.has(node.content)) {
                parts.push(`\\${node.content}`);
            } else if ((node.content === '^' || node.content === '_') && node.args) {
                const argStr = toLatexString(node.args[0].content);
                // Apply brace convention: single char doesn't need braces
                if (argStr.length === 1 && /^[\da-zA-Z]$/.test(argStr)) {
                    parts.push(node.content + argStr);
                } else {
                    parts.push(node.content + `{${argStr}}`);
                }
            }
        } else if (node.type === 'group') {
            parts.push(toLatexString(node.content));
        }
    }

    const result = parts.join('');
    return result;
}

/**
 * Formats a modifier string with appropriate braces.
 * LaTeX convention: single digits don't need braces, everything else does for consistency.
 */
function formatModifierString(rawString: string): string {
    // Single digit doesn't need braces
    if (/^\d$/.test(rawString)) {
        return rawString;
    }
    // Everything else (including single letters) needs braces for consistency
    return `{${rawString}}`;
}

// ============================================================================
// PART 2: VARIABLE BUILDER
// ============================================================================

/**
 * Constructs complete variables from a base and its modifiers.
 * Handles the logic of when to keep modifiers attached vs. when to extract them.
 */
class VariableBuilder {
    private base: string;
    private subscript: ModifierAnalysis | null = null;
    private superscript: ModifierAnalysis | null = null;

    constructor(base: string) {
        this.base = base;
    }

    /**
     * Analyzes a modifier to determine how it should be handled.
     */
    private analyzeModifier(nodes: Ast.Node[]): ModifierAnalysis {
        const rawString = toLatexString(nodes);

        return {
            isPureAlphabetic: isContentPureAlphabetic(nodes),
            containsVariables: containsVariables(nodes),
            isNumericOnly: isNumericOnly(nodes),
            nestingDepth: countNestingDepth(nodes),
            rawString: rawString,
            nodes: nodes
        };
    }

    addSubscript(nodes: Ast.Node[]): void {
        this.subscript = this.analyzeModifier(nodes);
    }

    addSuperscript(nodes: Ast.Node[]): void {
        this.superscript = this.analyzeModifier(nodes);
    }

    /**
     * Builds the final variable(s) based on the collected information.
     * Returns an array because in some cases we need to return both the
     * combined variable and the extracted components.
     *
     * Key rules:
     * - Subscripts: ALWAYS keep attached to base, never split (unless empty)
     * - Superscripts: Keep if pure alphabetic OR numeric-only, otherwise split
     * - Empty modifiers: Ignore them (treat as if they don't exist)
     */
    build(): string[] {
        const results: string[] = [];

        // Check if subscript/superscript are empty (important for edge cases like "tests_{}")
        const hasNonEmptySubscript = this.subscript && this.subscript.rawString.trim() !== '';
        const hasNonEmptySuperscript = this.superscript && this.superscript.rawString.trim() !== '';

        // Case 1: Both subscript and superscript present
        if (hasNonEmptySubscript && hasNonEmptySuperscript) {
            let varName = this.base;

            // Subscripts: Always attach (never split)
            varName += '_' + formatModifierString(this.subscript!.rawString);

            // Superscripts: Attach if pure alphabetic or numeric-only
            if (this.superscript!.isPureAlphabetic || this.superscript!.isNumericOnly) {
                if (!this.superscript!.isNumericOnly) {
                    varName += '^' + formatModifierString(this.superscript!.rawString);
                }
                results.push(varName);
            } else {
                // Mixed content superscript: keep base with subscript, extract superscript components
                results.push(varName);
                if (this.superscript!.containsVariables) {
                    results.push(...extractVariablesFromAST(this.superscript!.nodes));
                }
            }
        }
        // Case 2: Only subscript
        else if (hasNonEmptySubscript) {
            // Subscripts: Always attach to base (never split, regardless of content)
            const varName = this.base + '_' + formatModifierString(this.subscript!.rawString);
            results.push(varName);
        }
        // Case 3: Only superscript
        else if (hasNonEmptySuperscript) {
            if (this.superscript!.isNumericOnly) {
                // Numeric exponent: invisible for variable naming
                results.push(this.base);
            } else if (this.superscript!.isPureAlphabetic) {
                // Pure alphabetic: decide based on whether base is a constant
                const isBaseConstant = KNOWN_CONSTANTS.has(this.base);

                if (isBaseConstant) {
                    // Base is a constant: add it and extract superscript components
                    // Example: e^{e^{x}} → extract 'e' and 'x'
                    results.push(this.base);
                    if (this.superscript!.containsVariables) {
                        results.push(...extractVariablesFromAST(this.superscript!.nodes));
                    }
                } else {
                    // Pure alphabetic with non-constant base: ALWAYS keep together
                    // This handles ALL cases regardless of nesting depth:
                    // - M^{sl} (depth=0) → keep as 'M^{sl}'
                    // - x^{y^{z}} (depth=1) → keep as 'x^{y^{z}}'
                    // - a^{b^{c^{d}}} (depth=2) → keep as 'a^{b^{c^{d}}}'
                    const varName = this.base + '^' + formatModifierString(this.superscript!.rawString);
                    results.push(varName);
                }
            } else {
                // Mixed content: add base and extract components
                results.push(this.base);
                if (this.superscript!.containsVariables) {
                    results.push(...extractVariablesFromAST(this.superscript!.nodes));
                }
            }
        }
        // Case 4: No modifiers
        else {
            results.push(this.base);
        }

        return results;
    }
}

// ============================================================================
// PART 3: MAIN EXTRACTION ALGORITHM
// ============================================================================

/**
 * Extracts all variables from an array of AST nodes.
 * Uses a single-pass approach with lookahead for modifiers.
 */
function extractVariablesFromAST(nodes: Ast.Node[]): string[] {
    const variables = new Set<string>();
    let i = 0;

    while (i < nodes.length) {
        const node = nodes[i];

        // ----------------------------------------------------------------
        // PHASE 1: Handle string nodes (single letters or multi-char)
        // ----------------------------------------------------------------
        if (node.type === 'string') {
            const content = node.content.trim();

            // Check if string contains LaTeX modifier characters (^ or _)
            // This happens in deeply nested braces where the parser doesn't
            // recognize them as macros, e.g., in e^{e^{x^y}} the "x^y" becomes a string
            if (/[\^_]/.test(content)) {
                // Re-parse this string as LaTeX to recover the structure
                const reparsedAST = parseMath(content);
                extractVariablesFromAST(reparsedAST).forEach(v => variables.add(v));
                i++;
                continue;
            }

            // Single-letter string: check for modifiers
            if (content.length === 1 && /[a-zA-Z]/.test(content)) {
                const builder = new VariableBuilder(content);
                let j = i + 1;

                // Look ahead for subscript
                if (j < nodes.length &&
                    nodes[j].type === 'macro') {
                    const macro = nodes[j] as Ast.Macro;
                    if (macro.content === '_' && macro.args) {
                        builder.addSubscript(macro.args[0].content);
                        j++;
                    }
                }

                // Look ahead for superscript
                if (j < nodes.length &&
                    nodes[j].type === 'macro') {
                    const macro = nodes[j] as Ast.Macro;
                    if (macro.content === '^' && macro.args) {
                        builder.addSuperscript(macro.args[0].content);
                        j++;
                    }
                }

                // Build and add variables
                builder.build().forEach(v => variables.add(v));

                // Skip past the modifiers we processed
                i = j;
                continue;
            }

            // Multi-character string: split into individual letters
            for (const char of content) {
                if (/[a-zA-Z]/.test(char)) {
                    variables.add(char);
                }
            }

            i++;
            continue;
        }

        // ----------------------------------------------------------------
        // PHASE 2: Handle Greek letter macros
        // ----------------------------------------------------------------
        if (node.type === 'macro' && VARIABLE_MACROS.has(node.content)) {
            const builder = new VariableBuilder(`\\${node.content}`);
            let j = i + 1;

            // Look ahead for subscript
            if (j < nodes.length &&
                nodes[j].type === 'macro') {
                const macro = nodes[j] as Ast.Macro;
                if (macro.content === '_' && macro.args) {
                    builder.addSubscript(macro.args[0].content);
                    j++;
                }
            }

            // Look ahead for superscript
            if (j < nodes.length &&
                nodes[j].type === 'macro') {
                const macro = nodes[j] as Ast.Macro;
                if (macro.content === '^' && macro.args) {
                    builder.addSuperscript(macro.args[0].content);
                    j++;
                }
            }

            // Build and add variables
            builder.build().forEach(v => variables.add(v));

            i = j;
            continue;
        }

        // ----------------------------------------------------------------
        // PHASE 3: Handle standalone modifiers (not attached to variables)
        // ----------------------------------------------------------------
        if (node.type === 'macro' &&
            (node.content === '^' || node.content === '_') &&
            node.args) {

            // Check if previous node was a variable base
            const prevNode = i > 0 ? nodes[i - 1] : null;
            const isAttachedToVariable = prevNode && (
                (prevNode.type === 'string' && prevNode.content.trim().length === 1 && /[a-zA-Z]/.test(prevNode.content)) ||
                (prevNode.type === 'macro' && VARIABLE_MACROS.has(prevNode.content))
            );

            if (!isAttachedToVariable) {
                // Standalone modifier: extract contents recursively
                for (const arg of node.args) {
                    extractVariablesFromAST(arg.content).forEach(v => variables.add(v));
                }
            }

            i++;
            continue;
        }

        // ----------------------------------------------------------------
        // PHASE 4: Handle other macros with arguments (recursively)
        // ----------------------------------------------------------------
        if (node.type === 'macro' && node.args) {
            // Recursively extract from all arguments
            for (const arg of node.args) {
                extractVariablesFromAST(arg.content).forEach(v => variables.add(v));
            }

            i++;
            continue;
        }

        // ----------------------------------------------------------------
        // PHASE 5: Handle groups (recursively)
        // ----------------------------------------------------------------
        if (node.type === 'group') {
            extractVariablesFromAST(node.content).forEach(v => variables.add(v));
            i++;
            continue;
        }

        // ----------------------------------------------------------------
        // PHASE 6: Skip other nodes (whitespace, comments, etc.)
        // ----------------------------------------------------------------
        i++;
    }

    // Convert to array, filter constants, and sort
    return Array.from(variables)
        .filter(v => !KNOWN_CONSTANTS.has(v))
        .sort();
}

// ============================================================================
// PART 4: PUBLIC API
// ============================================================================

/**
 * Extracts all variables from a LaTeX expression string.
 *
 * @param latexExpr - The LaTeX expression to parse
 * @returns Sorted array of unique variable names
 */
function extractLatexVariables(latexExpr: string): string[] {
    const ast = parseMath(latexExpr);
    return extractVariablesFromAST(ast);
}

export { extractLatexVariables };
