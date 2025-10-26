# Equation Parts Extraction Algorithm

Author: Claude Sonnet 4.5

## Overview

This algorithm separates a LaTeX equation based on its function declaration, formula body, and domain limits using an **AST-based hybrid approach**. It looks for the general form of `f(x) = ... , x < ...` and splits between the function declaration (before first `=`) and the limit definition (after first top-level `,`).

Uses the `unified-latex` Abstract Syntax Tree (AST) for structural analysis while extracting substrings from the original input to preserve exact formatting and whitespace.

**Typical Use Case**:
```
Input:  y = x^2 + 1, x > 0
Output: ['y ', ' x^2 + 1', ' x > 0']
                ^\
          This part converts to Excel
```

## Design Principles

### Hybrid AST-String Approach

**Why Hybrid?**
- **AST for structure**: Provides accurate parsing of LaTeX constructs (macros, arguments, nesting)
- **String extraction for output**: Preserves exact whitespace and formatting from original input

**How it works**:
```
Input: "a_{1,2} = b_{3,4}, x > 0"

AST analysis:
  [0] String: "a"
  [1] Macro: _ with args
  [2] String: "="        <- equals at char offset 8
  [3] Whitespace         <- not in substring!
  [4] String: "b"
  [5] Macro: _ with args
  [6] String: ","        <- comma at char offset 17
  ...

Extraction:
  funcDeclare = input.substring(0, 8)      -> "a_{1,2} "
  formulaBody = input.substring(9, 17)     -> " b_{3,4}"
  limitDef = input.substring(18)           -> " x > 0"
```

### Delimiter Handling

**Equals Sign (`=`)**:
- **Split on**: `x=5`, `f(x)=x^2` (assignment/definition)
- **Skip**: `x<=5`, `y>=0`, `x!=0`, `x\neq 0` (comparison operators)

**Comma (`,`)**:
- **Split on**: `y=x^2,x>0` (constraint separator)
- **Skip**: `x_{1,2}`, `\left[0,10\right]` (nested commas)

### Nesting-Aware Parsing

The algorithm tracks nesting depth through the AST structure:

```
Tracked structures:
- Parentheses:   f(a,b)      -> Detected in String nodes, tracked by depth counter
- Macro args:    x_{i,j}     -> Automatically handled by AST (commas inside args aren't top-level nodes)
- \left...\right: \left[0,10\right] -> Detected by Macro type, tracked by depth counter
```

**Key insight**: The AST already separates subscript/superscript arguments (e.g., `_{1,2}`) into nested Argument nodes, so commas inside them never appear in the top-level node list.

### First-Match Strategy

The algorithm finds the **first** occurrence of each delimiter:

```
x=y=5     -> Split at first '=': ['x', 'y=5', '']
y=x^2,a,b -> Split at first ',': ['y', 'x^2', 'a,b']
```

### Graceful Degradation

The algorithm handles all inputs without throwing errors:

```
''      -> ['', '', '']         Empty input
'='     -> ['', '', '']         Just delimiter
'x='    -> ['x', '', '']        Trailing delimiter
'x^2,'  -> ['', 'x^2', '']      Leading delimiter
```

## Assumptions

The algorithm makes the following assumptions about its input:
1. The input is valid LaTeX mathematical notation.
2. There's only 1 equation in the expression (no support for delimited piecewise functions).

## Algorithm Structure

The algorithm operates in three sequential phases:

### Phase 1: Parse to AST

**Goal**: Convert the LaTeX string into a structured Abstract Syntax Tree.

**Process**:
```typescript
const ast = parseMath(equation);
```

**Result**: Array of `Node` objects representing the LaTeX structure:
- `String` nodes: Literal text (e.g., `"x"`, `"="`, `","`)
- `Macro` nodes: LaTeX commands (e.g., `\theta`, `\frac`, `^`, `_`)
  - May have `args` array with nested `Argument` nodes
- `Whitespace` nodes: Spaces between tokens
- `Group` nodes: Content inside `{...}` (rare in our use case)

Each node has `position` info with character offsets.

### Phase 2: Find First Equals Sign

**Goal**: Locate the character offset of the first `=` that represents assignment/definition, not comparison.

**Process**:
1. Traverse AST nodes sequentially
2. For each `String` node containing `"="`:
   - Check if previous node is a `String` ending with `<`, `>`, `!`, or `\`
   - If yes, skip (it's part of `<=`, `>=`, `!=`, or `\neq`)
   - If no, return the character offset from `node.position.start.offset`

**Result**: Character offset of the first valid `=`, or `-1` if not found

**Example**:
```
Input: "y<=5=true"
AST:   [String:"y", String:"<", String:"=", String:"5", String:"=", ...]

First '=' at index 2: prev node is "<" -> skip
Second '=' at index 4: prev node is "5" -> accept! Return offset
```

### Phase 3: Find First Top-Level Comma

**Goal**: Locate the character offset of the first `,` at nesting depth 0.

**Process**:
1. Initialize depth counters: `parenDepth = 0`, `leftRightDepth = 0`
2. Traverse AST nodes starting after the equals sign:
   - For each `String` node:
     - Check if content is `","` and both depths are 0 -> return offset
     - Count `(` and `)` characters, update `parenDepth`
   - For each `Macro` node:
     - If `content === "left"`: increment `leftRightDepth`
     - If `content === "right"`: decrement `leftRightDepth`
     - If node has `args`: skip (arguments are already nested, won't encounter their content)

**Result**: Character offset of the first top-level `,`, or `-1` if not found

**Key optimization**: Macros with arguments (like `_{1,2}`) are single nodes with nested `args`. The comma inside `{1,2}` is nested in the argument's content array, so it never appears in the top-level traversal.

## Pseudo-Code

```
FUNCTION extractEquationParts(equation: string) -> [string, string, string]

    // ===========================================================
    // PHASE 1: Parse to AST
    // ===========================================================

    IF equation is empty:
        RETURN ['', '', '']

    ast <- parseMath(equation)

    IF ast is empty:
        RETURN ['', '', '']


    // ===========================================================
    // PHASE 2: Find First Equals Sign
    // ===========================================================

    equalsOffset <- -1

    FOR each node in ast:
        IF node.type = 'string' AND node.content = '=':
            IF node has previous node:
                prevNode <- previous node
                IF prevNode.type = 'string':
                    lastChar <- last character of prevNode.content
                    IF lastChar IN ['<', '>', '!', '\\']:
                        CONTINUE  // Skip comparison operator

            // Found valid equals
            equalsOffset <- node.position.start.offset
            BREAK

    // Split string at equals offset
    IF equalsOffset >= 0:
        funcDeclare <- equation.substring(0, equalsOffset)
        restStartOffset <- equalsOffset + 1
    ELSE:
        funcDeclare <- ''
        restStartOffset <- 0


    // ===========================================================
    // PHASE 3: Find First Top-Level Comma
    // ===========================================================

    parenDepth <- 0
    leftRightDepth <- 0
    commaOffset <- -1

    // Find node index where restStartOffset begins
    startNodeIndex <- findNodeIndexAtOffset(ast, restStartOffset)

    FOR i = startNodeIndex TO end of ast:
        node <- ast[i]

        // Check for comma at depth 0 BEFORE updating depth
        IF node.type = 'string' AND node.content = ',' AND
           parenDepth = 0 AND leftRightDepth = 0:
            commaOffset <- node.position.start.offset
            BREAK

        // Update depth based on node type
        IF node.type = 'string':
            FOR each char in node.content:
                IF char = '(':
                    parenDepth++
                ELSE IF char = ')':
                    parenDepth--

        ELSE IF node.type = 'macro':
            IF node.content = 'left':
                leftRightDepth++
            ELSE IF node.content = 'right':
                leftRightDepth--

            // Skip macro arguments (already nested)
            IF node has args:
                CONTINUE

    // Split string at comma offset
    IF commaOffset >= 0:
        formulaBody <- equation.substring(restStartOffset, commaOffset)
        limitDef <- equation.substring(commaOffset + 1)
    ELSE:
        formulaBody <- equation.substring(restStartOffset)
        limitDef <- ''

    RETURN [funcDeclare, formulaBody, limitDef]
```

## Special Cases Handled

### Comparison Operators

**Challenge**: Distinguish assignment `=` from comparison `<=`, `>=`, `!=`, `\neq`.

**Solution**: Check if previous AST node is a `String` ending with `<`, `>`, `!`, or `\`:
```typescript
if (prevNode.type === 'string') {
  const lastChar = prevNode.content.slice(-1);
  if (lastChar !== '<' && lastChar !== '>' && lastChar !== '!' && lastChar !== '\\') {
    // Valid assignment '='
  }
}
```

**Examples**:
```
y<=5     -> ['', 'y<=5', '']      (No split, <= is comparison)
x\neq 0  -> ['', 'x\neq 0', '']   (No split, \neq is comparison)
y=x>=0   -> ['y', 'x>=0', '']     (Split at =, >= stays in formulaBody)
```

### Commas in Subscripts and Superscripts

**Challenge**: Commas like `x_{1,2}` should not split the equation.

**V2 Advantage**: The AST automatically handles this! The subscript `_{1,2}` is parsed as:
```
Macro: _
  args: [
    Argument {
      content: [String:"1", String:",", String:"2"]
    }
  ]
```

The comma is nested inside the Argument node's content, so it never appears in the top-level node traversal. **No manual depth tracking needed for braces!**

**Examples**:
```
a_{1,2} = b      -> ['a_{1,2} ', ' b', '']
x^{a,b} = y, z>0 -> ['x^{a,b} ', ' y', ' z>0']
```

### \left and \right Delimiters

**Challenge**: Commas inside `\left[0,10\right]` should not split.

**Solution**: Track `leftRightDepth` counter for `\left` and `\right` Macro nodes.

**Examples**:
```
x\in\left[0,10\right]   -> No split (comma at leftRightDepth > 0)
x\in\left(a,b\right)    -> No split (comma at leftRightDepth > 0)
```

### Empty Parts

**Challenge**: Handle incomplete or malformed input gracefully.

**Solution**: Return empty strings for missing parts.

**Examples**:
```
''       -> ['', '', '']
'='      -> ['', '', '']
'x='     -> ['x', '', '']
',x'     -> ['', '', 'x']
'x^2,'   -> ['', 'x^2', '']
```

### Function Notation

**Challenge**: Functions like `f(x,y)` have commas in parameters.

**Solution**: The parentheses tracking handles this automatically. Commas inside `(...)` are at `parenDepth > 0`, so they're skipped.

**Examples**:
```
f(x,y) = x + y       -> ['f(x,y) ', ' x + y', '']
g(a,b,c) = 0, x > 0  -> ['g(a,b,c) ', ' 0', ' x > 0']
```

### Whitespace Preservation

**Challenge**: Preserve all whitespace exactly as in the original input.

**V2 Advantage**: By using character offsets and substring extraction from the original string, all whitespace is automatically preserved - even spaces that the AST parser doesn't explicitly represent as `Whitespace` nodes (like the space after `a_{1,2}` in `a_{1,2} = b`).

**Example**:
```
Input:  "a_{1,2} = b_{3,4}, x > 0"
        ^       ^ ^^        ^^ ^ ^
        0       7 8 9     17 18...

AST provides offsets: equals at 8, comma at 17
String extraction:
  - funcDeclare: input[0:8]   = "a_{1,2} "   (includes trailing space!)
  - formulaBody: input[9:17]  = " b_{3,4}"   (includes leading space!)
  - limitDef: input[18:]      = " x > 0"     (includes all spaces!)
```

## Edge Cases & Solutions

### Edge Case 1: Nested Commas in Complex Subscripts

**Problem**: Multiple levels of nesting with commas.

**Example**: `\theta_{y,3}^{wr} = F_{n,m}(x,y), x \in [0,10]`

**V2 Solution**: The AST automatically nests subscript/superscript commas:
```
Macro: _ with args containing [String:"y", String:",", String:"3"]
Macro: _ with args containing [String:"n", String:",", String:"m"]
String: "(" -> parenDepth++
  String: ","  -> at parenDepth=1, skip
String: ")" -> parenDepth--
String: ","  -> at parenDepth=0, leftRightDepth=0 -> Split here!
```

**Output**: `['\theta_{y,3}^{wr} ', ' F_{n,m}(x,y)', ' x \in [0,10]']`

### Edge Case 2: Mixed \left...\right and Braces

**Problem**: `\left[...\ right]` contains braces with commas.

**Example**: `y=f(x),x\in\left[\frac{l_i}{2},l_i\right]`

**Solution**: Two independent depth counters:
```
Scan formula body: f(x)
  - String:"(" -> parenDepth=1
  - String:"," -> at parenDepth=1, skip
  - String:")" -> parenDepth=0
First top-level ","  -> Both depths=0 -> Split!

In limitDef: \left[\frac{l_i}{2},l_i\right]
  - Macro: \left -> leftRightDepth=1
  - String:"," -> at leftRightDepth=1, wouldn't split if checked
  - Macro: \right -> leftRightDepth=0
```

**Output**: `['y', 'f(x)', 'x\in\left[\frac{l_i}{2},l_i\right]']`

### Edge Case 3: Comparison Operator Before Equals

**Problem**: Expression like `x<=5=true` (theoretical).

**Example**: `y<=5=true`

**Solution**: First `=` is skipped (prev node is `String:"<"`), but second `=` is accepted (prev node is `String:"5"`).

```
AST: [String:"y", String:"<", String:"=", String:"5", String:"=", String:"true"]

First '=' (index 2): prevNode = String:"<" -> Skip
Second '=' (index 4): prevNode = String:"5" -> Accept!
```

**Output**: `['y<=5', 'true', '']`

## Implementation Notes

### AST-Based Structural Analysis

The implementation uses `parseMath()` from `@unified-latex/unified-latex-util-parse`:

```typescript
import { parseMath } from '@unified-latex/unified-latex-util-parse';
import * as Ast from '@unified-latex/unified-latex-types';

const ast = parseMath(equation);  // Returns Node[]
```

**Key Node Types**:
- `String`: Literal text content
- `Macro`: LaTeX commands (with optional `args: Argument[]`)
- `Whitespace`: Space characters
- `Group`: Content inside `{...}` braces

### Position-Based String Extraction

Each node has optional `position` metadata:
```typescript
node.position.start.offset  // Character index where node starts
node.position.end.offset    // Character index where node ends
```

For macros with arguments, we calculate the full range including arguments:
```typescript
function getNodeCharRange(node: Ast.Node): { start: number; end: number } {
  let end = node.position.end.offset;
  if (node.type === 'macro' && node.args) {
    for (const arg of node.args) {
      end = Math.max(end, arg.position.end.offset);
    }
  }
  return { start: node.position.start.offset, end };
}
```

### Hybrid Extraction Strategy

**Why not reconstruct from AST?**:
- AST is not guaranteed to preserve exact whitespace (e.g., space after `a_{1,2}`)

**Best of both worlds**:
1. Parse with AST to find logical structure (where is the equals? where is the comma?)
2. Get character offsets from AST position info
3. Extract substrings from original input using offsets
4. Result: Robust parsing + perfect formatting preservation

### Character Lookahead

The algorithm performs limited lookahead:

```typescript
// Check previous node for comparison operator detection
if (i > 0) {
  const prevNode = nodes[i - 1];
  if (prevNode.type === 'string') {
    const lastChar = prevNode.content.slice(-1);
    // ... check if <, >, !, or \
  }
}
```

**Lookahead length**: Maximum 1 node (only check previous node, not previous character).

## Usage Example

```typescript
import extractEquationParts from '@/logic/extract-equation-parts';

const [funcDeclare, formulaBody, limitDef] = extractEquationParts('y=x^2,x>0');
console.log(funcDeclare);  // 'y'
console.log(formulaBody);  // 'x^2'
console.log(limitDef);     // 'x>0'

// Complex example with nested commas
const [fd, fb, ld] = extractEquationParts(
  '\\theta_{y,3}^{wr} = \\frac{W_r^g}{4EI}\\left(2l_i x - x^2 - \\frac{3}{4}l_i^2\\right), x \\in \\left[\\frac{l_i}{2}, l_i\\right]'
);
console.log(fd);  // '\\theta_{y,3}^{wr} '
console.log(fb);  // ' \\frac{W_r^g}{4EI}\\left(2l_i x - x^2 - \\frac{3}{4}l_i^2\\right)'
console.log(ld);  // ' x \\in \\left[\\frac{l_i}{2}, l_i\\right]'
```

## References

### Related Files

- **Implementation**: [src/logic/extract-equation-parts.ts](../../src/logic/extract-equation-parts.ts)
- **Tests**: [tests/logic/extract-equation-parts.test.ts](../../tests/logic/extract-equation-parts.test.ts)

### External Dependencies

- `@unified-latex/unified-latex-util-parse`: [GitHub](https://github.com/siefkenj/unified-latex)
- `@unified-latex/unified-latex-types`: Type definitions for the AST
