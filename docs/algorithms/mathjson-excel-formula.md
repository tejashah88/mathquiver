# MathJSON to Excel Formula Conversion
- **Original Author**: ChatGPT 5.0
- **Implementation**: [`src/logic/mathjson-excel.ts`](../../src/logic/mathjson-excel.ts)
- **Tests**: [`tests/logic/mathjson-excel.test.ts`](../../tests/logic/mathjson-excel.test.ts)

## Overview

This algorithm transforms MathJSON-formatted (from Mathlive) math expressions format into valid Excel formulas. It recursively traverses the Lisp-like tree structure and converts each node into its corresponding Excel formula syntax, supporting variable substitution for cell references.

**Key Features**:
- Recursive tree traversal with three base cases (numbers, strings, arrays)
- Optional variable substitution for Excel cell references
- Constant evaluation for `pi`, `e`, and `i`

## Design Principles

### Recursive Tree Traversal

The algorithm processes MathJSON as a tree structure with recursive descent:
- **Numbers** -> Direct string conversion
- **Strings** -> Variable lookup or constant evaluation
- **Arrays** -> Operation mapping with recursive argument processing

### Three Mapping Types

Operations are classified into three types for flexible conversion:
- **Operators**: Binary/n-ary operations with symbol notation (`+`, `-`, `*`, `/`, `^`)
- **Named Functions**: Direct mapping to Excel functions (`SIN`, `COS`, `LOG`)
- **Custom Transformations**: Complex logic for special cases (`Square`, `Root`, `Divide`)

### Variable Substitution

Support for mapping mathematical variables to Excel cell references:
```
Input: ["Add", "a", "b"]
VarMap: {a: "A1", b: "B1"}
Output: "(A1+B1)"
```

## Assumptions

The algorithm makes the following assumptions about its input:
1. The input is valid, well-formed MathJSON.
2. Defined variables for substitution have valid Excel cell references.

## Algorithm Structure

### Phase 1: Type Identification

Determine node type and route to appropriate handler:

```typescript
if (typeof node === 'number')  -> numberToString()
if (typeof node === 'string')  -> stringLookup()
if (Array.isArray(node))       -> arrayToOperation()
```

### Phase 2: Operation Mapping

For array nodes, extract operation and arguments:

```typescript
[operation, ...arguments] = node
mapping = MATHJSON_FUNCTIONS[operation]

if (mapping.type === 'operator')  -> joinWithSymbol()
if (mapping.type === 'function')  -> applyFunction()
```

### Phase 3: Recursive Conversion

Process arguments recursively and combine with operation:

```typescript
convertedArgs = arguments.map(arg -> _mathjsonToExcel(arg, varMap))
result = combineWithOperation(operation, convertedArgs)
```

## Pseudo-Code

### Main Algorithm

```
FUNCTION mathjsonToExcel(mathJson: Expression, varMap: VarMapping = {}) -> string
    result <- convertMjsonToExcel(mathJson, varMap)
    RETURN '=' + result

FUNCTION convertMjsonToExcel(node: Expression, varMap: VarMapping) -> string
    // PHASE 1: Type Identification
    IF typeof node = 'number':
        RETURN toString(node)

    IF typeof node = 'string':
        // Check constants first
        IF node IN MATHJSON_CONSTANTS:
            RETURN MATHJSON_CONSTANTS[node]

        // Check variable mapping
        IF node IN varMap:
            RETURN varMap[node]

        // Return as-is (variable name)
        RETURN node

    IF Array.isArray(node):
        // PHASE 2: Operation Mapping
        [operation, ...args] <- node

        // Lookup operation in mapping table
        IF operation NOT IN MATHJSON_FUNCTIONS:
            THROW MJEXTranslateError("No Excel equivalent for operator \"" + operation + "\"")

        mapping <- MATHJSON_FUNCTIONS[operation]

        // PHASE 3: Recursive Conversion
        convertedArgs <- []
        FOR each arg IN args:
            convertedArgs.add(convertMjsonToExcel(arg, varMap))

        // Apply operation based on type
        IF mapping.type = 'operator':
            // Join with operator symbol
            result <- "(" + join(convertedArgs, mapping.symbol) + ")"
            RETURN result

        IF mapping.type = 'function':
            IF mapping.custom EXISTS:
                // Use custom transformation
                RETURN mapping.custom(convertedArgs)
            ELSE:
                // Use named function
                result <- mapping.name + "(" + join(convertedArgs, ",") + ")"
                RETURN result

    THROW Error("Invalid MathJSON node")
```

### Custom Transformation Examples

```
// Square: x^2
FUNCTION customSquare(args: string[]) -> string
    RETURN "(" + args[0] + "^2)"

// Divide: Special handling for division
FUNCTION customDivide(args: string[]) -> string
    IF args.length = 1:
        RETURN "(1/" + args[0] + ")"
    ELSE:
        RETURN "(" + args[0] + "/" + args[1] + ")"

// Root: nth root
FUNCTION customRoot(args: string[]) -> string
    IF args.length = 1:
        // Square root
        RETURN "SQRT(" + args[0] + ")"
    ELSE:
        // nth root: base^(1/n)
        RETURN "(" + args[0] + "^(1/" + args[1] + "))"

// Abs: Absolute value
FUNCTION customAbs(args: string[]) -> string
    RETURN "ABS(" + args[0] + ")"
```

## Supported Functions

For a complete list of all supported Excel functions organized by category, see [SUPPORTED_EXCEL_FUNCTIONS.md](../SUPPORTED_EXCEL_FUNCTIONS.md).

### InvisibleOperator (Context-Aware)

The `InvisibleOperator` function handles implicit operations that depend on context:

- **In subscript context**: Concatenates arguments without operators
- **In default context**: Treats as multiplication

Examples:
- `f_{abcd}` → `f_abcd` (subscript concatenation)
- `2x` → `(2*x)` (implicit multiplication)

## MathJSON to Excel Mapping

The converter uses the `MATHJSON_FUNCTIONS` object in [src/logic/mathjson-excel.ts](../../src/logic/mathjson-excel.ts) to map MathJSON function names to Excel formulas. Each mapping can be:

- **Symbol**: Direct operator (`+`, `-`, `*`, `/`, `^`)
- **Function name**: Excel function name (`"SIN"`, `"COS"`, `"LN"`)
- **Custom handler**: JavaScript function that generates the Excel formula

### Example Mappings

```typescript
// Symbol operator
"Add": { type: "operator", symbol: "+" }

// Direct Excel function
"Sin": { type: "function", name: "SIN" }

// Custom handler
"Square": {
  type: "custom",
  custom: (args) => `(${args[0]}^2)`
}
```

## Special Cases Handled

### Root with Variable Index

```
Root(x, n) -> (x^(1/n))
```

### Logarithms with Different Bases

```
Ln(x)         -> LN(x)        // Natural log (base e)
Log(x)        -> LOG(x)       // Common log (base 10 by default)
Lb(x)         -> LOG(x,2)     // Binary log (base 2)
Lg(x)         -> LOG(x)       // Common log (base 10)
LogOnePlus(x) -> LN(x + 1)    // Natural log of (x+1)
```

### N-ary Operations

Add and Multiply accept any number of arguments:

```
["Add", 1, 2, 3, 4, 5] -> (1+2+3+4+5)
["Multiply", "a", "b", "c"] -> (a*b*c)
```

### Complex Numbers

Excel uses specialized functions for complex number operations:

```
Complex(a,b)       -> COMPLEX(a,b)
Real(z)            -> IMREAL(z)
Imaginary(z)       -> IMAGINARY(z)
Conjugate(z)       -> IMCONJUGATE(z)
Arg(z)             -> IMARGUMENT(z)
Magnitude(z)       -> IMABS(z)
Norm(z)            -> IMABS(z)
Argument(z)        -> IMARGUMENT(z)
ImaginaryUnit      -> COMPLEX(0,1)
```

## Context-Aware Processing

Some MathJSON operations require different handling based on their position in the expression tree. The converter tracks conversion context to handle these cases correctly.

### Subscript Context

Within subscript arguments, certain operations behave differently:
- **InvisibleOperator**: Concatenates without operators (`abcd` not `a*b*c*d`)
- This allows proper variable name formation like `f_abcd` from `f_{abcd}`

### Default Context

In regular expression contexts, operations maintain their standard mathematical meaning:
- **InvisibleOperator**: Represents implicit multiplication (`2x` → `2*x`)

### Implementation

The `convertMjsonToExcel` function accepts a `context` parameter (`'default'` or `'subscript'`) that is propagated through recursive calls. The `Subscript` operation is handled specially to process its second argument with `'subscript'` context:

```typescript
if (op === 'Subscript') {
  const base = convertMjsonToExcel(args[0], varMap, context);
  const subscript = convertMjsonToExcel(args[1], varMap, 'subscript');
  return `${base}_${subscript}`;
}
```

Context-aware custom functions check the context parameter and behave accordingly:

```typescript
'InvisibleOperator': {
  type: 'function',
  custom: (args: string[], context?: ConversionContext) => {
    if (context === 'subscript') {
      return args.join('');  // Concatenation: abcd
    }
    return `(${args.join('*')})`;  // Multiplication: (a*b*c*d)
  }
}
```

## Edge Cases & Solutions

### Edge Case 1: Unsupported Operations

**Problem**: MathJSON contains operations not in the mapping table.

**Example**: `["CustomFunction", "x"]`

**Solution**: Throw descriptive error:

```typescript
throw new MJEXTranslateError(`No Excel equivalent for operator "${operation}"`);
```

### Edge Case 2: Single-Argument Division

**Problem**: Division with one argument would only have one operand.

**Example**: `["Divide", "x"]` would result in `(x)` which is incorrect.

**Solution**: The implementation uses the `/` operator which requires two operands. Single-argument division is treated as malformed MathJSON and will produce incorrect output. The upstream parser (MathLive) should not produce single-argument division.

### Edge Case 3: Variable Not in Mapping

**Problem**: Variable name not found in varMap during substitution.

**Example**: `"x"` with varMap `{a: "A1", b: "B1"}`

**Solution**: Return variable name as-is:

```typescript
if (varMap[node]) {
  return varMap[node];
}
return node;  // Use original variable name
```

**Behavior**: Excel will show a `#NAME?` error.

### Edge Case 4: Zero Arguments

**Problem**: Operation with no arguments (malformed MathJSON).

**Example**: `["Add"]`

**Solution**: Operations handle empty args arrays gracefully:

```typescript
// For operators, join returns empty string wrapped in parens: "()"
// For functions, returns "FUNC()" which may error in Excel
```

**Note**: This is a validation issue that should be caught by MathLive.

### Edge Case 5: Nested Constants

**Problem**: Constants inside complex expressions.

**Example**: `["Add", "Pi", ["Multiply", "ExponentialE", "x"]]`

**Processing**:
1. `"Pi"` -> `"PI()"`
2. `"ExponentialE"` -> `"EXP(1)"`
3. Result: `"=(PI()+(EXP(1)*x))"`

**Solution**: Recursive processing automatically handles constants at any depth.

### Edge Case 6: InvisibleOperator in Subscripts

**Problem**: MathLive canonicalization produces `InvisibleOperator` in subscripts like `f_{abcd}`, which should be treated as concatenation (for variable names) rather than multiplication.

**Example**: `["Subscript", "f", ["InvisibleOperator", "a", "b", "c", "d"]]`

**Expected Output**: `f_abcd` (not `f_(a*b*c*d)`)

**Solution**: Context-aware processing with special handling:
- The `Subscript` operation processes its second argument with `'subscript'` context
- `InvisibleOperator` checks the context parameter:
  - In subscript context: Concatenates → `abcd`
  - In default context: Multiplies → `(a*b*c*d)`

**Implementation**: Pass context parameter through recursion to track position in expression tree. The `convertMjsonToExcel` function signature includes `context: ConversionContext = 'default'` parameter that custom functions can access.

## Implementation Notes

### MathJSON Structure

The algorithm uses the standard MathJSON format:

```typescript
type Expression =
  | number                           // Numeric literals
  | string                          // Variables or constants
  | [string, ...Expression[]]       // Operations: [op, arg1, arg2, ...]

Examples:
  5                                 // Number
  "x"                               // Variable
  ["Add", 2, 3]                     // Operation with 2 args
  ["Sin", "x"]                      // Function with 1 arg
  ["Add", 1, 2, 3, 4]              // N-ary operation
  ["Power", ["Sin", "x"], 2]       // Nested operations
```

### Key Data Structures

```typescript
interface ActionMapping {
  [key: string]: OperatorAction | FunctionAction;
}

interface OperatorAction {
  type: 'operator';
  symbol: string;              // "+", "-", "*", "/", "^"
}

interface FunctionAction {
  type: 'function';
  name?: string;               // Excel function name "SIN", "COS"
  custom?: (args: string[]) => string;  // Custom transformation
}

interface ConstantMapping {
  [key: string]: string;       // Constant name -> Excel value
}

interface VarMapping {
  [key: string]: string;       // Variable name -> Cell reference
}
```

### Error Handling

```typescript
class MJEXTranslateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MJEXTranslateError';
  }
}

// Usage:
if (!(operation in MATHJSON_FUNCTIONS)) {
  throw new MJEXTranslateError(`ERROR: No Excel equivalent for ${operation}`);
}
```

### Recursive Processing Pattern

The algorithm follows a consistent recursive pattern with context-aware processing:

```typescript
function convertMjsonToExcel(node: Expression, varMap: VarMapping, context: ConversionContext = 'default'): string {
  // Base cases
  if (typeof node === 'number') return node.toString();
  if (typeof node === 'string') return lookupStringNode(node, varMap);

  // Recursive case
  if (Array.isArray(node)) {
    const [operation, ...args] = node;

    // Special handling for context-sensitive operations
    if (operation === 'Subscript') {
      const base = convertMjsonToExcel(args[0], varMap, context);
      const subscript = convertMjsonToExcel(args[1], varMap, 'subscript');
      return `${base}_${subscript}`;
    }

    // General handling
    const convertedArgs = args.map(arg => convertMjsonToExcel(arg, varMap, context));
    return applyOperation(operation, convertedArgs, context);
  }

  throw new MJEXTranslateError('Unknown MathJSON node type');
}
```

## Usage Examples

```typescript
import { mathjsonToExcel } from '@/logic/mathjson-excel';

// Example 1: Simple arithmetic
const expr1 = ["Add", ["Multiply", 2, 3], 4];
const result1 = mathjsonToExcel(expr1);
// -> "=((2*3)+4)"

// Example 2: Trigonometric function
const expr2 = ["Add",
  ["Power", ["Sin", "x"], 2],
  ["Power", ["Cos", "x"], 2]
];
const result2 = mathjsonToExcel(expr2);
// -> "=((SIN(x)^2)+(COS(x)^2))"

// Example 3: With variable mapping
const expr3 = ["Add",
  ["Multiply", "a", ["Power", "x", 2]],
  ["Multiply", "b", "x"],
  "c"
];
const varMap3 = { a: "A1", b: "B1", c: "C1", x: "D1" };
const result3 = mathjsonToExcel(expr3, varMap3);
// -> "=((A1*(D1^2))+(B1*D1)+C1)"

// Example 4: Constants
const expr4 = ["Multiply", "Pi", ["Power", "r", 2]];
const result4 = mathjsonToExcel(expr4);
// -> "=(PI()*(r^2))"

// Example 5: Complex nested operations
const expr5 = ["Divide",
  ["Negate", "b"],
  ["Multiply", 2, "a"]
];
const result5 = mathjsonToExcel(expr5);
// -> "=((-b)/(2*a))"

// Example 6: Error handling
try {
  const expr6 = ["UnsupportedOp", "x"];
  mathjsonToExcel(expr6);
} catch (error) {
  if (error instanceof MJEXTranslateError) {
    console.error(error.message);
    // -> "No Excel equivalent for operator "UnsupportedOp""
  }
}
```
