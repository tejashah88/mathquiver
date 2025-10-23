# Equation Parts Extraction Algorithm

Author: Claude Sonnet 4.5

## Overview

This algorithm separates a LaTeX equation based on its function declaration, formula body, and domain limits. This is done by looking for the general form of `f(x) = ... , x < ...` and splitting between the function declaration (before first `=`) and the limit definition (after first top-level `,`). This is used to allow the user to type a standard math function while extracting the formula body for converting to a Excel formula.

**Typical Use Case**:
```
Input:  y = x^2 + 1, x > 0
Output: ['y ', ' x^2 + 1', ' x > 0']
                ^
          This part converts to Excel
```

## Design Principles

### 1. Delimiter Handling

**Equals Sign (`=`)**:
- **Split on**: `x=5`, `f(x)=x^2` (assignment/definition)
- **Skip**: `x<=5`, `y>=0`, `x!=0`, `x\neq 0` (comparison operators)

**Comma (`,`)**:
- **Split on**: `y=x^2,x>0` (constraint separator)
- **Skip**: `x_{1,2}`, `\left[0,10\right]` (nested commas)

### 2. Nesting-Aware Parsing

The algorithm tracks nesting depth to avoid splitting on delimiters inside nested structures:

```
Tracked structures:
- Braces:       x_{i,j}     -> Comma at depth 1, skip
- Brackets:     x \in [0,1] -> Comma at depth 1, skip
- Parentheses:  f(a,b)      -> Comma at depth 1, skip
- \left...\right: \left[0,10\right] -> Special depth tracking
```

### 3. First-Match Strategy

The algorithm finds the **first** occurrence of each delimiter:

```
x=y=5     -> Split at first '=': ['x', 'y=5', '']
y=x^2,a,b -> Split at first ',': ['y', 'x^2', 'a,b']
```

**Rationale**:
- First `=` typically represents the function declaration (`y=...` or `f(x)=...`)
- First top-level `,` separates main equation from constraints
- Subsequent delimiters remain in their respective parts

### 4. Graceful Degradation

The algorithm handles all inputs without throwing errors:

```
''      -> ['', '', '']         Empty input
'='     -> ['', '', '']         Just delimiter
'x='    -> ['x', '', '']        Trailing delimiter
'x^2,'  -> ['', 'x^2', '']      Leading delimiter
```

**Use Case**: Real-time rendering where user is actively typing incomplete equations.

## Assumptions

The algorithm makes the following assumptions about its input:
1. The input is valid LaTeX mathematical notation.
2. There's only 1 equation in the expression (no support for delimited piecewise functions)

## Algorithm Structure

The algorithm operates in two sequential phases:

### Phase 1: Find First Equals Sign

**Goal**: Locate the first `=` that represents assignment/definition, not comparison.

**Process**:
1. Scan string character by character
2. When encountering `=`, check previous character
3. Skip if preceded by `<`, `>`, `!`, or `\`
4. Accept first valid `=` and split string

**Result**: `beforeEquals` and `rest` (everything after `=`)

### Phase 2: Find First Top-Level Comma

**Goal**: Locate the first `,` at nesting depth 0.

**Process**:
1. Initialize depth counters: `depth = 0`, `leftRightDepth = 0`
2. Scan `rest` character by character:
   - Increment `depth` for `{`, `[`, `(`
   - Decrement `depth` for `}`, `]`, `)`
   - Increment `leftRightDepth` for `\left`
   - Decrement `leftRightDepth` for `\right`
   - When `,` found and both depths are 0, accept and split
3. Split `rest` into `mainBody` and `afterComma`

**Result**: `mainBody` and `afterComma`

## Pseudo-Code

```
FUNCTION extractEquationParts(equation: string) -> [string, string, string]

    // ===========================================================
    // PHASE 1: Find First Equals Sign
    // ===========================================================

    equalsIndex <- -1

    FOR i = 0 TO length(equation) - 1:
        IF equation[i] = '=':
            prevChar <- (i > 0) ? equation[i-1] : ''

            // Skip comparison operators: <=, >=, !=, \neq
            IF prevChar NOT IN ['<', '>', '!', '\']:
                equalsIndex <- i
                BREAK

    // Split by equals
    IF equalsIndex >= 0:
        beforeEquals <- equation[0 .. equalsIndex-1]
        rest <- equation[equalsIndex+1 .. end]
    ELSE:
        beforeEquals <- ''
        rest <- equation


    // ===========================================================
    // PHASE 2: Find First Top-Level Comma
    // ===========================================================

    depth <- 0              // Track {}, [], () nesting
    leftRightDepth <- 0     // Track \left...\right nesting
    commaIndex <- -1
    i <- 0

    WHILE i < length(rest):
        char <- rest[i]

        // Handle \left (5 characters: \left)
        IF char = '\' AND rest[i..i+4] = '\left':
            leftRightDepth++
            i += 4         // Skip past \left
            CONTINUE

        // Handle \right (6 characters: \right)
        IF char = '\' AND rest[i..i+5] = '\right':
            leftRightDepth--
            i += 5         // Skip past \right
            CONTINUE

        // Track regular nesting depth
        IF char IN ['{', '[', '(']:
            depth++
        ELSE IF char IN ['}', ']', ')']:
            depth--
        ELSE IF char = ',' AND depth = 0 AND leftRightDepth = 0:
            // Found first top-level comma!
            commaIndex <- i
            BREAK

        i++

    // Split by comma
    IF commaIndex >= 0:
        mainBody <- rest[0 .. commaIndex-1]
        afterComma <- rest[commaIndex+1 .. end]
    ELSE:
        mainBody <- rest
        afterComma <- ''

    RETURN [beforeEquals, mainBody, afterComma]
```

## Special Cases Handled

### 1. Comparison Operators

**Challenge**: Distinguish assignment `=` from comparison `<=`, `>=`, `!=`, `\neq`.

**Solution**: Check previous character before accepting `=`:
```typescript
if (prevChar !== '<' && prevChar !== '>' && prevChar !== '!' && prevChar !== '\\') {
    // Valid assignment '='
}
```

**Examples**:
```
y<=5     -> ['', 'y<=5', '']      (No split, <= is comparison)
x\neq 0  -> ['', 'x\neq 0', '']   (No split, \neq is comparison)
y=x>=0   -> ['y', 'x>=0', '']     (Split at =, >= stays in mainBody)
```

### 2. Commas in Subscripts and Superscripts

**Challenge**: Commas like `x_{1,2}` should not split the equation.

**Solution**: Track brace depth; only split at depth 0.

**Examples**:
```
a_{1,2} = b      -> ['a_{1,2} ', ' b', '']
x^{a,b} = y, z>0 -> ['x^{a,b} ', ' y', ' z>0']
```

### 3. \left and \right Delimiters

**Challenge**: Commas inside `\left[0,10\right]` should not split.

**Solution**: Separate depth counter for `\left...\right` pairs.

**Examples**:
```
x\in\left[0,10\right]   -> No split (comma at leftRightDepth > 0)
x\in\left(a,b\right)    -> No split (comma at leftRightDepth > 0)
```

### 4. Empty Parts

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

### 5. Function Notation

**Challenge**: Functions like `f(x,y)` have commas in parameters.

**Solution**: Depth tracking handles parentheses automatically.

**Examples**:
```
f(x,y) = x + y       -> ['f(x,y) ', ' x + y', '']
g(a,b,c) = 0, x > 0  -> ['g(a,b,c) ', ' 0', ' x > 0']
```

## Edge Cases & Solutions

### Edge Case 1: Nested Commas in Complex Subscripts

**Problem**: Multiple levels of nesting with commas.

**Example**: `\theta_{y,3}^{wr} = F_{n,m}(x,y), x \in [0,10]`

**Solution**: Depth counter handles arbitrary nesting:
```
\theta_{y,3}  -> { depth=1, comma skipped }
F_{n,m}(x,y)  -> { depth=1, comma skipped }
              -> ( depth=2, comma skipped )
First ,       -> depth=0 -> Split here!
[0,10]        -> Will be in afterComma (not split again)
```

**Output**: `['\theta_{y,3}^{wr} ', ' F_{n,m}(x,y)', ' x \in [0,10]']`

### Edge Case 2: Mixed \left...\right and Braces

**Problem**: `\left[...\right]` contains braces with commas.

**Example**: `y=f(x),x\in\left[\frac{l_i}{2},l_i\right]`

**Solution**: Two independent depth counters:
```
Scan mainBody: f(x)
  - ( depth=1
  - ) depth=0
First , -> Both depths=0 -> Split!

In afterComma: \left[\frac{l_i}{2},l_i\right]
  - \left: leftRightDepth=1
  - , stays because leftRightDepth>0
  - \right: leftRightDepth=0
```

**Output**: `['y', 'f(x)', 'x\in\left[\frac{l_i}{2},l_i\right]']`

### Edge Case 3: Comparison Operator Before Equals

**Problem**: Expression like `x<=5=true` (theoretical).

**Example**: `y<=5=true`

**Solution**: First `=` is skipped (prev char is `<`), but second `=` is accepted.

```
Scan: y<=5=true
  - First '=' at index 3: prevChar='<' -> Skip
  - Second '=' at index 6: prevChar='5' -> Accept!
```

**Output**: `['y<=5', 'true', '']`

### Edge Case 4: Whitespace Preservation

**Problem**: Spaces around delimiters should be preserved.

**Example**: `y = x + 1`

**Solution**: No trimming occurs; spaces are preserved exactly.

**Output**: `['y ', ' x + 1', '']` (spaces preserved)

**Rationale**: Downstream processing (Excel conversion) may need original formatting.

## Implementation Notes

### String-Based Approach

The implementation uses direct string manipulation:

```typescript
// No AST parsing, just character scanning:
for (let i = 0; i < equation.length; i++) {
    const char = equation[i];
    // Process character...
}
```

### Depth Tracking

Two independent depth counters:

1. **`depth`**: Regular bracket nesting
   ```typescript
   if (char === '{' || char === '[' || char === '(') depth++;
   if (char === '}' || char === ']' || char === ')') depth--;
   ```

2. **`leftRightDepth`**: LaTeX delimiter pairs
   ```typescript
   if (rest.substring(i, i+5) === '\\left') leftRightDepth++;
   if (rest.substring(i, i+6) === '\\right') leftRightDepth--;
   ```

**Why separate?**: `\left[...\right]` should be treated as a unit even though it contains `[` and `]`.

### Character Lookahead

The algorithm performs limited lookahead:

```typescript
// Check previous character for '='
const prevChar = i > 0 ? equation[i - 1] : '';

// Check next 5-6 characters for '\left' or '\right'
const next5 = rest.substring(i, i + 5);
```

**Lookahead length**: Maximum 6 characters (length of `\right`).

### Index Skipping

When detecting `\left` or `\right`, skip past the keyword:

```typescript
if (next5 === '\\left') {
    leftRightDepth++;
    i += 4;  // Skip past "left" (loop will increment by 1)
    continue;
}
```

**Why**: Avoid re-processing characters that are part of the keyword.

## Usage Example

```typescript
import extractEquationParts from '@/logic/extract-equation-parts';

const [funcDeclare, formulaBody, limitDef] = extractEquationParts('y=x^2,x>0');
console.log(funcDeclare);  // 'y'
console.log(formulaBody);  // 'x^2'
console.log(limitDef);     // 'x>0'
```

## References

### Related Files

- **Implementation**: [src/logic/extract-equation-parts.ts](../../src/logic/extract-equation-parts.ts)
- **Tests**: [tests/logic/extract-equation-parts.test.ts](../../tests/logic/extract-equation-parts.test.ts)
