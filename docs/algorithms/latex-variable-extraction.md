# LaTeX Variable Extraction
- **Original Author**: Claude Sonnet 4.5
- **Implementation**: [`src/logic/latex-var-extract.ts`](../../src/logic/latex-var-extract.ts)
- **Tests**: [`tests/logic/latex-var-extract.test.ts`](../../tests/logic/latex-var-extract.test.ts)

## Overview

This algorithm scans a LaTeX expression for math variables, attempting to preserve subscript and superscript notation. It tries to distinguish between variables that should be kept together (like `M^{sl}`) and those that should be split into components (like `e^{ax+b}`).

## Design Principles

### Context-Aware Processing

The algorithm makes decisions based on the content type:
- **Pure alphabetic modifiers** → Keep together as one variable
- **Mixed content (operators/numbers)** → Split and extract components
- **Constants (e, π)** → Extract variables from their modifiers
- **Decorator macros** → Treat as part of variable identity (entire decorated expression is one variable)

### Modifier Rules

**Subscripts**: Always stay attached to the base (never split)
```
x_{i+1}  →  x_{i+1}    (not x, i, 1)
```

**Superscripts**: Behavior depends on content
```
M^{sl}   →  M^{sl}     (pure alphabetic, keep)
e^{ax+b} →  a, x, b    (mixed content, split)
```

### Decorator Macros

**Definition**: Macros that modify the appearance or font of variables

**Categories**:
1. **Accent decorators**: `\overline`, `\bar`, `\hat`, `\tilde`, `\vec`, `\dot`, `\ddot`, `\underline`, etc.
2. **Font decorators**: `\mathbb`, `\mathcal`, `\mathbf`, `\mathfrak`, `\mathrm`, `\mathsf`, etc.

**Behavior**: The entire decorated expression is treated as a single atomic variable
```
\overline{x}      →  \overline{x}       (single variable)
\overline{x+y}    →  \overline{x+y}     (content preserved as-is)
\vec{v}_i         →  \vec{v}_{i}        (decorator + subscript)
\mathbb{R}        →  \mathbb{R}         (font decorator)
\bar{M}^{sl}      →  \bar{M}^{sl}       (decorator + superscript)
```

**Key principle**: Decorator content is NOT recursively extracted - the entire `\decorator{content}` is one variable unit.

### Text Macros

**Definition**: Macros for decorative/explanatory text that should not contribute variables

**Macros**: `\text`, `\textrm`, `\textbf`, `\textit`, `\textsf`, `\texttt`, `\textsl`, `\textsc`

**Behavior**: Entire text macro and its content are completely ignored
```
\text{hello}           →  (no variables extracted)
x + \text{plus} + y    →  ['x', 'y']
\text{velocity} = v    →  ['v']
\frac{x}{\text{total}} →  ['x']
```

**Key principle**: Text macro content is NOT examined for variables - it's completely skipped.

### Operator Name Macros

**Definition**: The `\operatorname` macro is used for multi-letter operator names (e.g., `\operatorname{max}`, `\operatorname{sin}`, `\operatorname{cm}`)

**Behavior**:
- **In subscripts/superscripts**: Preserved as part of the variable name (entire `\operatorname{...}` kept)
- **Standalone**: The macro itself is not extracted as a variable, but variables in its arguments are processed normally

**Examples**:
```
F_{\operatorname{cm}}           →  ['F_{\operatorname{cm}}']
M^{\operatorname{max}}          →  ['M^{\operatorname{max}}']
x_{\operatorname{net}}^{a}      →  ['x_{\operatorname{net}}^{a}']
\operatorname{sin}(x)           →  ['x']  (operatorname not extracted)
```

**Key principle**: `\operatorname` content in modifiers is preserved as-is, maintaining the full subscript/superscript structure. This ensures that variables with operator-name subscripts/superscripts (common in engineering and physics) are kept together as single units.

### Three-Phase Architecture

1. **Classification** → Analyze content type
2. **Building** → Construct complete variables
3. **Extraction** → Traverse AST and collect results

## Assumptions

The algorithm makes the following assumptions about its input:
1. The input is valid LaTeX mathematical notation. Math functions have a backslash accordingly.
2. All greek letters are assumed to be as valid as roman letters (A-Z).
3. No macro expansion will be done to expand their full expression.

## Algorithm Structure

### Phase 1: Classification Functions

These functions analyze AST nodes to determine their properties:

```typescript
isContentPureAlphabetic(nodes) → boolean
    // Returns true if nodes contain only letters
    // Examples: "sl", "abc", "x^{y}" all return true
    // Examples: "2x", "a+b", "ax" return false

containsVariables(nodes) → boolean
    // Returns true if any variables present

isNumericOnly(nodes) → boolean
    // Returns true if only numbers

countNestingDepth(nodes) → number
    // Counts levels of nested modifiers
    // x^y → 0, x^{y^z} → 1, a^{b^{c^{d}}} → 2
```

### Phase 2: Variable Builder

The `VariableBuilder` class encapsulates the logic for constructing complete variable names:

```typescript
class VariableBuilder {
    base: string              // e.g., "M" or "\theta"
    subscript: ModifierAnalysis | null
    superscript: ModifierAnalysis | null

    analyzeModifier(nodes) → ModifierAnalysis
        // Analyzes subscript/superscript content

    build() → string[]
        // Returns complete variable(s)
        // May return multiple if splitting is needed
}
```

### Phase 3: AST Traversal

Single-pass traversal with lookahead for modifiers:

```typescript
extractVariablesFromAST(nodes) → string[]
    for each node in nodes:
        if string node:
            if contains ^ or _:
                re-parse as LaTeX  // Handle deep nesting
            else if single letter:
                look ahead for modifiers
                build complete variable
            else:
                split into letters

        if macro node (Greek letter):
            look ahead for modifiers
            build complete variable

        if macro with args:
            recursively extract from args

        if group:
            recursively extract from content
```

## Pseudo-Code

### Main Algorithm

```
FUNCTION extractLatexVariables(latexExpr: string) → string[]
    ast ← parseMath(latexExpr)
    variables ← extractVariablesFromAST(ast)
    RETURN variables sorted

FUNCTION extractVariablesFromAST(nodes: Node[]) → string[]
    variables ← empty set
    i ← 0

    WHILE i < length(nodes)
        node ← nodes[i]

        // ─────────────────────────────────────────────
        // PHASE 1: Handle Strings
        // ─────────────────────────────────────────────
        IF node is string:
            content ← trim(node.content)

            // Special case: Re-parse nested structures
            IF content contains '^' or '_':
                reparsed ← parseMath(content)
                variables.addAll(extractVariablesFromAST(reparsed))
                i++
                CONTINUE

            // Single-letter with potential modifiers
            IF length(content) = 1 AND isLetter(content):
                builder ← new VariableBuilder(content)
                j ← i + 1

                // Look ahead for subscript
                IF nodes[j] is macro '_':
                    builder.addSubscript(nodes[j].args)
                    j++

                // Look ahead for superscript
                IF nodes[j] is macro '^':
                    builder.addSuperscript(nodes[j].args)
                    j++

                variables.addAll(builder.build())
                i ← j
                CONTINUE

            // Multi-character string: extract letters
            FOR each char in content:
                IF isLetter(char):
                    variables.add(char)

            i++
            CONTINUE

        // ─────────────────────────────────────────────
        // PHASE 2: Handle Greek Letters
        // ─────────────────────────────────────────────
        IF node is macro AND isGreekLetter(node):
            builder ← new VariableBuilder("\" + node.content)
            // ... similar lookahead logic ...
            i ← next position
            CONTINUE

        // ─────────────────────────────────────────────
        // PHASE 2.5: Handle Decorator Macros
        // ─────────────────────────────────────────────
        IF node is macro AND isDecoratorMacro(node):
            // Get decorator content (either from args or sibling group)
            IF node has args:
                decoratedContent ← toLatexString(node.args[0].content)
                j ← i + 1
            ELSE IF next node is group:
                decoratedContent ← toLatexString(nextNode.content)
                j ← i + 2

            decoratedBase ← "\\" + node.content + "{" + decoratedContent + "}"
            builder ← new VariableBuilder(decoratedBase)

            // Look ahead for subscript/superscript (same as other phases)
            // ... modifier lookahead logic ...

            variables.addAll(builder.build())
            i ← j
            CONTINUE

        // ─────────────────────────────────────────────
        // PHASE 2.75: Handle Text Macros
        // ─────────────────────────────────────────────
        IF node is macro AND isTextMacro(node):
            // Skip text macros entirely (don't extract from content)
            IF node has args:
                j ← i + 1
            ELSE IF next node is group:
                j ← i + 2
            ELSE:
                j ← i + 1
            i ← j
            CONTINUE

        // ─────────────────────────────────────────────
        // PHASE 3: Handle Modifiers & Other Macros
        // ─────────────────────────────────────────────
        IF node is macro with arguments:
            FOR each argument:
                variables.addAll(extractVariablesFromAST(argument.content))

        IF node is group:
            variables.addAll(extractVariablesFromAST(node.content))

        i++

    // Filter out constants (e, π)
    variables ← filter(variables, v → v not in CONSTANTS)

    RETURN sort(variables)
```

### Variable Builder Logic

```
CLASS VariableBuilder:
    base: string
    subscript: ModifierAnalysis
    superscript: ModifierAnalysis

    FUNCTION build() → string[]
        results ← empty list

        // Case 1: Both subscript and superscript
        IF has both subscript AND superscript:
            varName ← base + "_" + format(subscript)

            IF superscript is pure alphabetic:
                varName += "^" + format(superscript)
                results.add(varName)
            ELSE:
                // Superscript has mixed content
                results.add(varName)
                results.addAll(extract(superscript))

        // Case 2: Only subscript
        ELSE IF has subscript:
            varName ← base + "_" + format(subscript)
            results.add(varName)
            // Note: NEVER split subscripts

        // Case 3: Only superscript
        ELSE IF has superscript:
            IF base is constant (e.g., 'e'):
                results.add(base)
                results.addAll(extract(superscript))
            ELSE IF superscript is pure alphabetic:
                varName ← base + "^" + format(superscript)
                results.add(varName)
            ELSE IF superscript is numeric only:
                results.add(base)  // Ignore numeric exponent
            ELSE:
                // Mixed content
                results.add(base)
                results.addAll(extract(superscript))

        // Case 4: No modifiers
        ELSE:
            results.add(base)

        RETURN results
```

## Examples

### Example 1: Engineering Variables

**Input**: `M_{y}=M^{sl}+M^{tg}+M^{sr}`

**Processing**:
1. `M_{y}`: Base=M, Subscript={y} (pure alphabetic) → `M_{y}`
2. `M^{sl}`: Base=M, Superscript={sl} (pure alphabetic) → `M^{sl}`
3. `M^{tg}`: Base=M, Superscript={tg} (pure alphabetic) → `M^{tg}`
4. `M^{sr}`: Base=M, Superscript={sr} (pure alphabetic) → `M^{sr}`

**Output**: `['M_{y}', 'M^{sl}', 'M^{tg}', 'M^{sr}']`

### Example 2: Mixed Content Superscript

**Input**: `e^{ax+b}`

**Processing**:
1. Base=e (constant)
2. Superscript={ax+b} (contains operator +)
3. Extract base: e (filtered as constant)
4. Extract from superscript: a, x, b

**Output**: `['a', 'b', 'x']` (sorted, e filtered)

### Example 3: Subscript with Operators

**Input**: `x_{i+1}+x_{i-1}`

**Processing**:
1. `x_{i+1}`: Base=x, Subscript={i+1} (has operator) → Keep together: `x_{i+1}`
2. `x_{i-1}`: Base=x, Subscript={i-1} (has operator) → Keep together: `x_{i-1}`

**Output**: `['x_{i+1}', 'x_{i-1}']`

**Note**: Subscripts are NEVER split, regardless of content.

### Example 4: Nested Pure Alphabetic

**Input**: `x^{y^{z}}`

**Processing**:
1. Base=x
2. Superscript={y^{z}} → Contains nested structure
3. Content is pure alphabetic (only letters)
4. Keep together as complete variable

**Output**: `['x^{y^{z}}']`

### Example 5: Deeply Nested Constants

**Input**: `e^{e^{x^y}}`

**Processing**:
1. First e is constant
2. Superscript={e^{x^y}} contains more structure
3. Recursively process: encounter "x^y" as string
4. **Re-parse** "x^y" to recover structure
5. Extract: x^{y}

**Output**: `['x^{y}']` (both e's filtered as constants)

### Example 6: Polynomial

**Input**: `ax^2+bx+c=0`

**Processing**:
1. `a`: Simple variable → `a`
2. `x^2`: Base=x, Superscript=2 (numeric) → `x`
3. `b`: Simple variable → `b`
4. `x`: Simple variable → `x`
5. `c`: Simple variable → `c`

**Output**: `['a', 'b', 'c', 'x']`

### Example 7: Decorator Macros

**Input**: `\overline{x} + \vec{v}_i + \mathbb{R}`

**Processing**:
1. `\overline{x}`: Decorator macro with content 'x' → Keep as `\overline{x}`
2. `\vec{v}_i`: Decorator `\vec{v}` with subscript `i` → `\vec{v}_{i}`
3. `\mathbb{R}`: Font decorator with content 'R' → `\mathbb{R}`

**Output**: `['\mathbb{R}', '\overline{x}', '\vec{v}_{i}']` (sorted)

**Note**: Decorator content is treated as atomic - not recursively extracted.

### Example 8: Decorator with Complex Content

**Input**: `\overline{x+y} + z`

**Processing**:
1. `\overline{x+y}`: Decorator with content 'x+y' → Entire expression kept as `\overline{x+y}`
2. `z`: Simple variable → `z`

**Output**: `['\overline{x+y}', 'z']`

**Note**: Even though `x+y` contains an operator and multiple variables, the decorator makes it a single unit.

### Example 9: Text Macros (Excluded)

**Input**: `x + \text{plus} + y = \text{sum}`

**Processing**:
1. `x`: Simple variable → `x`
2. `\text{plus}`: Text macro → Completely ignored (no extraction)
3. `y`: Simple variable → `y`
4. `\text{sum}`: Text macro → Completely ignored (no extraction)

**Output**: `['x', 'y']`

**Note**: Even if text contains typical variable names like `\text{xy}`, no variables are extracted. Text macros are for decorative/explanatory purposes only.

### Example 10: Operator Name in Subscripts

**Input**: `F_{\operatorname{cm}} + G_{\operatorname{max}}`

**Processing**:
1. `F_{\operatorname{cm}}`: Base=F, Subscript={\operatorname{cm}} → Keep together: `F_{\operatorname{cm}}`
2. `G_{\operatorname{max}}`: Base=G, Subscript={\operatorname{max}} → Keep together: `G_{\operatorname{max}}`

**Output**: `['F_{\operatorname{cm}}', 'G_{\operatorname{max}}']`

**Note**: `\operatorname` in subscripts is treated as part of the subscript content and fully preserved. This is common in engineering notation where operator names are used to describe the meaning of the subscript (e.g., "cm" for center of mass, "max" for maximum, "net" for net force).

## Special Cases Handled

### Greek Letters

```
Input:  \theta_{y}=\theta^{nl}
Output: ['\theta_{y}', '\theta^{nl}']
```

Greek letters are treated as variable bases.

### Multiple Variables in Superscript

```
Input:  x^{2y}
Output: ['x', 'y']
```

Mixed content (number + variable) → split and extract.

### Nested Superscripts (Deep)

```
Input:  a^{b^{c^{d}}}
Output: ['a^{b^{c^{d}}}']
```

All pure alphabetic → keep entire structure.

### Combination Subscript/Superscript

```
Input:  R_{x}^{x}
Output: ['R_{x}^{x}']
```

Both modifiers pure alphabetic → keep together.

### Function Notation

```
Input:  p(x)=a_nx^n
Output: ['p', 'x', 'x^{n}', 'a_{n}', 'n']
```

Extracts from all parts of the expression.

## Edge Cases & Solutions

### Edge Case 1: Parser Limitation with Deep Nesting

**Problem**: In deeply nested braces, the parser treats `^` and `_` as plain characters instead of modifiers.

**Example**: `e^{e^{x^y}}` → Parser gives String "x^y" (plain text)

**Solution**: Detect strings containing `^` or `_` and re-parse them:

```typescript
if (/[\^_]/.test(content)) {
    const reparsedAST = parseMath(content);
    extractVariablesFromAST(reparsedAST).forEach(v => variables.add(v));
}
```

### Edge Case 2: Constants in Nested Structures

**Problem**: Need to extract variables from inside constant bases.

**Example**: `e^{e^{x}}` should give `['x']`, not `['e', 'x']`

**Solution**: Check if base is a constant before processing:

```typescript
if (KNOWN_CONSTANTS.has(base)) {
    // Extract from superscript, filter the constant
    extractVariablesFromAST(superscript.nodes)
}
```

### Edge Case 3: Single Letters Need Braces

**Problem**: LaTeX formatting preference for braces.

**Example**: Should `x_a` be formatted as `x_a` or `x_{a}`?

**Solution**: Use consistent brace formatting:
- Single digits: no braces (`x^2`)
- Single letters: use braces (`x_{a}`)
- Multi-char: use braces (`x^{sl}`)

## Design Decisions

- Superscripts and subscripts in variables like `T_{n+1}^{ab}` are treated as if it's one whole variable.
- However, operators in mixed superscripts like `T_{n+1}^{ax+b}` will be extracted as `['T_{n+1}', 'a', 'x', 'b']`.

## Implementation Notes

### AST Structure

The algorithm uses `@unified-latex/unified-latex-util-parse` which provides:

```typescript
Node types:
- String: text content
- Macro: LaTeX commands (including ^ and _)
- Group: braced content {}
- Argument: macro arguments

Macro "^" and "_" have:
- content: "^" or "_"
- args: Array of Arguments
```

### Key Data Structures

```typescript
interface ModifierAnalysis {
    isPureAlphabetic: boolean
    containsVariables: boolean
    isNumericOnly: boolean
    nestingDepth: number
    rawString: string
    nodes: Ast.Node[]
}
```

### Constants Filtered

```typescript
const KNOWN_CONSTANTS = new Set(['e', 'i', '\\pi']);
```

These are automatically excluded from results.

## Usage Example

```typescript
import { extractLatexVariables } from '@/logic/latex-var-extract';

// Simple case
const vars1 = extractLatexVariables('x^2 + y^2 = z^2');
// → ['x', 'y', 'z']

// Engineering notation
const vars2 = extractLatexVariables('M_{y}=M^{sl}+M^{tg}');
// → ['M_{y}', 'M^{sl}', 'M^{tg}']

// Complex nesting
const vars3 = extractLatexVariables('e^{e^{x^y}}');
// → ['x^{y}']

// Greek letters
const vars4 = extractLatexVariables('\\theta_1 + \\theta_2');
// → ['\\theta_1', '\\theta_2']
```
