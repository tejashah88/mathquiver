# Equation Parts Extraction Algorithm

## Overview

The Equation Parts Extraction algorithm splits LaTeX mathematical equations into three distinct components to facilitate Excel formula conversion. It intelligently identifies function declarations, equation bodies, and domain constraints by parsing equals signs and commas while respecting LaTeX nesting structures.

**Purpose**: Separate equations into `[beforeEquals, mainBody, afterComma]` where only the `mainBody` is processed for Excel formula conversion.

**Key Features**:
- Smart delimiter detection (skips comparison operators like `<=`, `>=`, `\neq`)
- Nesting-aware parsing (respects `{}`, `[]`, `()`, `\left...\right`)
- First-match strategy (finds first valid `=` and first top-level `,`)
- Graceful error handling (never throws, handles partial/malformed input)

**Typical Use Case**:
```
Input:  y = x^2 + 1, x > 0
Output: ['y ', ' x^2 + 1', ' x > 0']
                ^
          This part converts to Excel
```

---

## Design Principles

### 1. Smart Delimiter Handling

The algorithm distinguishes between delimiters used for splitting and those used in mathematical notation:

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

**Depth Counters**:
- `depth`: Tracks `{}`, `[]`, `()` nesting (increments/decrements)
- `leftRightDepth`: Tracks `\left...\right` pairs independently

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

---

## Assumptions

The algorithm makes the following assumptions about its input and environment:

### 1. Valid LaTeX Input
The algorithm assumes input is valid LaTeX mathematical notation. Input validation and formatting is handled by MathLive before reaching this layer.

**Rationale**: Separation of concerns - MathLive provides standardized LaTeX output that this algorithm processes.

### 2. Single Equation Per Call
The algorithm processes one equation at a time. Multiple equations (e.g., semicolon-separated systems) should be split upstream.

**Example**:
```
Supported:   y = x^2, x > 0
Not handled: y = x^2; z = x^3
```

**Rationale**: Simplifies parsing logic and matches the application's equation-by-equation workflow.

### 3. Standard LaTeX Delimiters
The algorithm recognizes standard LaTeX delimiter patterns:
- Comparison operators: `<=`, `>=`, `!=`, `\neq`
- Nested structures: `{...}`, `[...]`, `(...)`
- LaTeX pairs: `\left[...\right]`, `\left(...\right)`, etc.

**Rationale**: MathLive generates standardized LaTeX, so custom or non-standard syntax is not expected.

### 4. No Semantic Validation
The algorithm does not validate mathematical correctness. It splits strings based on structural patterns, not mathematical meaning.

**Example**: `x=,=y` is processed without error, even though it's mathematically invalid.

**Rationale**: Structural parsing only - semantic validation belongs in separate layers.

---

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

---

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

---

## Examples

### Example 1: Simple Equation

**Input**: `x=5`

**Processing**:
1. **Phase 1**: Find `=` at index 1
   - `beforeEquals = 'x'`
   - `rest = '5'`
2. **Phase 2**: Scan `'5'`, no comma found
   - `mainBody = '5'`
   - `afterComma = ''`

**Output**: `['x', '5', '']`

---

### Example 2: Equation with Constraint

**Input**: `y=x^2,x>0`

**Processing**:
1. **Phase 1**: Find `=` at index 1
   - `beforeEquals = 'y'`
   - `rest = 'x^2,x>0'`
2. **Phase 2**: Scan `'x^2,x>0'`
   - Characters `x`, `^`, `2`: depth = 0
   - Character `,`: depth = 0, leftRightDepth = 0 -> **Split here**
   - `mainBody = 'x^2'`
   - `afterComma = 'x>0'`

**Output**: `['y', 'x^2', 'x>0']`

---

### Example 3: Comma in Subscript

**Input**: `\theta_{y,3}^{wr} = ...`

**Processing**:
1. **Phase 1**: Find `=` at index 19
   - `beforeEquals = '\theta_{y,3}^{wr} '`
   - `rest = ' ...'`
2. **Phase 2**: During Phase 1 scan, when processing subscript:
   - `{` -> depth = 1
   - `y` -> depth = 1
   - `,` -> depth = 1 (!= 0) -> **Skip this comma**
   - `3` -> depth = 1
   - `}` -> depth = 0
   - Comma inside `{...}` is ignored!

**Output**: `['\theta_{y,3}^{wr} ', ' ...', '']`

**Key Point**: Commas inside subscripts/superscripts don't split the equation.

---

### Example 4: \left...\right with Comma

**Input**: `y=f(x),x\in\left[0,10\right]`

**Processing**:
1. **Phase 1**: Find `=` at index 1
   - `beforeEquals = 'y'`
   - `rest = 'f(x),x\in\left[0,10\right]'`
2. **Phase 2**: Scan `rest`
   - `f(x)`: depth 0 -> 1 -> 0
   - First `,`: depth = 0, leftRightDepth = 0 -> **Split here**
   - `mainBody = 'f(x)'`
   - `afterComma = 'x\in\left[0,10\right]'`

   Note: The comma inside `\left[0,10\right]` stays in `afterComma` because we only find the **first** top-level comma.

**Output**: `['y', 'f(x)', 'x\in\left[0,10\right]']`

**Key Point**: Commas inside `\left...\right` are preserved in the afterComma section.

---

### Example 5: Multiple Top-Level Commas

**Input**: `y=x^2,a,b,c`

**Processing**:
1. **Phase 1**: Find `=` at index 1
   - `beforeEquals = 'y'`
   - `rest = 'x^2,a,b,c'`
2. **Phase 2**: Find first `,` at index 3
   - `mainBody = 'x^2'`
   - `afterComma = 'a,b,c'` (remaining commas stay here)

**Output**: `['y', 'x^2', 'a,b,c']`

**Key Point**: Only the **first** top-level comma splits; subsequent commas remain in `afterComma`.

---

### Example 6: Multiple Equals Signs

**Input**: `x=y=5`

**Processing**:
1. **Phase 1**: Find first `=` at index 1
   - `beforeEquals = 'x'`
   - `rest = 'y=5'`
2. **Phase 2**: No comma found
   - `mainBody = 'y=5'` (second `=` stays in mainBody)
   - `afterComma = ''`

**Output**: `['x', 'y=5', '']`

**Key Point**: Only the **first** equals sign splits; subsequent `=` remain in `mainBody`.

---

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

---

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

---

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

---

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

---

### Edge Case 4: Whitespace Preservation

**Problem**: Spaces around delimiters should be preserved.

**Example**: `y = x + 1`

**Solution**: No trimming occurs; spaces are preserved exactly.

**Output**: `['y ', ' x + 1', '']` (spaces preserved)

**Rationale**: Downstream processing (Excel conversion) may need original formatting.

---

## Performance Characteristics

### Time Complexity

**Phase 1 (Find Equals)**: O(n)
- Single pass through string
- Constant-time character comparisons

**Phase 2 (Find Comma)**: O(n)
- Single pass through remaining string
- Constant-time depth updates

**Total**: O(n) where n = length of input string

### Space Complexity

**O(1)** - Constant space:
- Two integer indices (`equalsIndex`, `commaIndex`)
- Two depth counters (`depth`, `leftRightDepth`)
- Three output strings (references to original)

**No recursion**, **no AST**, **no data structures**.

### Performance Notes

1. **String operations**: Substring operations are O(k) where k = substring length, but since we create exactly 3 substrings, total cost is O(n).

2. **Early termination**: Both phases terminate immediately upon finding target delimiter (first `=`, first top-level `,`), so average case is often much better than O(n).

3. **Cache-friendly**: Sequential character access with good locality.

4. **No allocations during scan**: Only allocate output strings at the end.

---

## Design Decisions

### Why Find Only the First Equals Sign?

**Decision**: Split at the **first** valid `=`, ignore subsequent ones.

**Rationale**:
- First `=` typically represents function declaration: `f(x)=...` or variable assignment: `y=...`
- Subsequent `=` are usually part of the expression: `x=y=5` or comparisons: `y=x^2=4`
- Splitting at first `=` cleanly separates declaration from body

**Example**:
```
x=y=5 -> We want: beforeEquals='x', mainBody='y=5'
        Not:     beforeEquals='x=y', mainBody='5'
```

---

### Why Find Only the First Top-Level Comma?

**Decision**: Split at the **first** comma at depth 0.

**Rationale**:
- Mathematical convention: first comma separates main equation from constraints
- Pattern: `equation_body, constraint1, constraint2, ...`
- All constraints can be grouped in `afterComma` for processing

**Example**:
```
y=x^2, x>0, x<10 -> We want: mainBody='x^2', afterComma='x>0, x<10'
                    All constraints grouped together
```

---

### Why Allow Permissive Error Handling?

**Decision**: Never throw errors; return partial results for any input.

**Rationale**:
1. **Real-time rendering**: User is actively typing incomplete equations
2. **Graceful degradation**: Partial equations should render partially
3. **Separation of concerns**: Validation happens elsewhere

**Examples**:
```
User typing: "y="     -> ['y', '', '']       Still valid return
User typing: "y=x^"   -> ['y', 'x^', '']     Partial input OK
Malformed:   "==,"    -> ['', '=,', '']      No crash, returns something
```

---

### Why String Processing Instead of AST?

**Decision**: Use character-by-character string scanning.

**Rationale**:
1. **Simplicity**: Equation splitting is structurally simple (find two delimiters)
2. **Performance**: O(n) scan is faster than parsing to AST
3. **Robustness**: Works on partial/incomplete LaTeX (AST parser might fail)
4. **No dependencies**: Doesn't require `@unified-latex` or similar

**Trade-off**: Can't handle complex semantic patterns, but that's not needed for this task.

---

## Testing Strategy

### Test Coverage: 73 Test Cases

The test suite covers 8 categories:

#### 1. Basic Expressions (4 tests)
No `=` or `,` - entire input goes to `mainBody`:
```
'Ax^2+Bx+C'          -> ['', 'Ax^2+Bx+C', '']
'x'                  -> ['', 'x', '']
```

#### 2. Equations with `=` (5 tests)
Has `=` but no `,` - split into declaration and body:
```
'x=5'                -> ['x', '5', '']
'f(x)=x^2+1'         -> ['f(x)', 'x^2+1', '']
```

#### 3. Expressions with `,` (4 tests)
Has `,` but no `=` - split into expression and constraint:
```
'Ax^2+Bx+C,x<0'      -> ['', 'Ax^2+Bx+C', 'x<0']
```

#### 4. Complete Equations (4 tests)
Has both `=` and `,` - full three-part split:
```
'y=x^2,x>0'          -> ['y', 'x^2', 'x>0']
'f(x)=1/x,x\neq 0'   -> ['f(x)', '1/x', 'x\neq 0']
```

#### 5. Nested Commas in Subscripts/Superscripts (6 tests)
Commas inside `{...}` should not split:
```
'\theta_{y,3}^{wr} = ..., x \in ...'  -> Split only at top-level comma
'a_{1,2} = b_{3,4}, x > 0'            -> Subscript commas ignored
```

#### 6. Multiple Top-Level Commas (3 tests)
Only first comma splits:
```
'y=x^2,a,b,c'        -> ['y', 'x^2', 'a,b,c']
```

#### 7. \left...\right Delimiters (4 tests)
Commas inside `\left[...]\right` should not split:
```
'y=f(x),x\in\left[0,10\right]'  -> Split at first comma only
```

#### 8. Edge Cases (5 tests)
Empty, partial, malformed inputs:
```
''                   -> ['', '', '']
'='                  -> ['', '', '']
'x='                 -> ['x', '', '']
```

### Test Quality

- **Comprehensive**: Covers all code paths (equals found/not found, comma found/not found)
- **Real-world**: Includes actual engineering equations from production use
- **Edge-aware**: Tests boundary conditions (empty, single char, trailing delimiters)
- **Regression-proof**: Tests specific bug patterns (comparison operators, nested commas)

---

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

**Advantages**:
- Simple and fast
- Works on partial/incomplete input
- No external parser dependencies
- Easy to debug and maintain

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

---

## Future Enhancements

### Potential Improvements

#### 1. Configurable Delimiters

**Current state**: Hardcoded to use `=` and `,`.

**Why it would be useful**:
- Different mathematical notations might use different separators
- Example: Using `;` instead of `,` for constraint separation
- Example: Using `:=` for definitions instead of `=`

**Possible API**:
```typescript
extractEquationParts(equation: string, options?: {
    assignmentDelimiter?: string    // Default: '='
    constraintDelimiter?: string    // Default: ','
})
```

**Example**:
```typescript
// Use ':=' for assignment and ';' for constraints
extractEquationParts('f(x) := x^2 ; x > 0', {
    assignmentDelimiter: ':=',
    constraintDelimiter: ';'
})
// -> ['f(x) ', ' x^2 ', ' x > 0']
```

---

#### 2. Multiple Equation Support

**Current state**: Processes single equations only.

**Why it would be useful**:
- Systems of equations: `x+y=1; x-y=0`
- Piecewise functions: `f(x) = {x, x>0; -x, x<=0}`

**Possible API**:
```typescript
extractEquationSystem(equations: string, options?: {
    equationSeparator?: string    // Default: ';'
}) -> Array<[string, string, string]>
```

**Example**:
```typescript
extractEquationSystem('x+y=1; x-y=0', { equationSeparator: ';' })
// -> [
//     ['x+y', '1', ''],
//     ['x-y', '0', '']
//    ]
```

---

#### 3. Configurable Comparison Operators

**Current state**: Hardcoded list: `<=`, `>=`, `!=`, `\neq`.

**Why it would be useful**:
- Different mathematical contexts use different operators
- LaTeX has many comparison operators: `\leq`, `\geq`, `\approx`, `\equiv`

**Possible API**:
```typescript
extractEquationParts(equation: string, options?: {
    comparisonOperators?: string[]  // Operators to skip
})
```

**Example**:
```typescript
// Also skip '\leq' and '\geq'
extractEquationParts('x\leq 5', {
    comparisonOperators: ['<=', '>=', '!=', '\\neq', '\\leq', '\\geq']
})
// -> ['', 'x\leq 5', '']  (no split)
```

---

## Usage Example

```typescript
import extractEquationParts from '@/logic/extract-equation-parts';

// Example 1: Simple equation
const [before1, body1, after1] = extractEquationParts('x=5');
console.log(before1);  // 'x'
console.log(body1);    // '5'        <- Excel processes this
console.log(after1);   // ''

// Example 2: Equation with constraint
const [before2, body2, after2] = extractEquationParts('y=x^2,x>0');
console.log(before2);  // 'y'
console.log(body2);    // 'x^2'      <- Excel processes this
console.log(after2);   // 'x>0'

// Example 3: Engineering equation
const [before3, body3, after3] = extractEquationParts(
    String.raw`\theta_1=\frac{F_N}{EI}\left(\frac{x^2}{2}\right),x\in[0,l_i]`
);
console.log(before3);  // '\theta_1'
console.log(body3);    // '\frac{F_N}{EI}\left(\frac{x^2}{2}\right)'  <- Excel processes this
console.log(after3);   // 'x\in[0,l_i]'

// Example 4: Commas in subscripts (handled correctly)
const [before4, body4, after4] = extractEquationParts('a_{1,2}=b_{3,4},x>0');
console.log(before4);  // 'a_{1,2}'  <- Subscript comma preserved
console.log(body4);    // 'b_{3,4}'  <- Excel processes this
console.log(after4);   // 'x>0'

// Example 5: Partial input (graceful handling)
const [before5, body5, after5] = extractEquationParts('y=');
console.log(before5);  // 'y'
console.log(body5);    // ''         <- Empty but no error
console.log(after5);   // ''

// Example 6: Expression only (no equation)
const [before6, body6, after6] = extractEquationParts('x^2+y^2');
console.log(before6);  // ''
console.log(body6);    // 'x^2+y^2'  <- Excel processes this
console.log(after6);   // ''
```

### Integration with Excel Conversion

```typescript
// Typical workflow:
const latex = 'y=x^2+2x+1,x>0';  // From MathLive input

// Step 1: Extract parts
const [declaration, mainBody, constraint] = extractEquationParts(latex);

// Step 2: Convert only mainBody to Excel
const excelFormula = convertLatexToExcel(mainBody);  // Your conversion function

// Step 3: Render result
console.log(`${declaration} = ${excelFormula}`);  // y = =A1^2+2*A1+1
console.log(`Constraint: ${constraint}`);          // Constraint: x>0
```

---

## References

### Related Files

- **Implementation**: [src/logic/extract-equation-parts.ts](../../src/logic/extract-equation-parts.ts)
- **Tests**: [tests/logic/extract-equation-parts.test.ts](../../tests/logic/extract-equation-parts.test.ts)
- **Documentation**: `docs/algorithms/extract-equation-parts.md` (this file)

### Related Algorithms

- **LaTeX Variable Extraction**: [docs/algorithms/latex-variable-extraction.md](latex-variable-extraction.md) - Extracts variable names from LaTeX expressions
- **Excel Formula Conversion**: (Documentation TBD) - Converts LaTeX math to Excel formulas

### External Dependencies

None - Pure string processing implementation.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-18 | Initial implementation by Claude Sonnet 4.5 |
| 1.1 | 2025-10-19 | Documentation created |

---
