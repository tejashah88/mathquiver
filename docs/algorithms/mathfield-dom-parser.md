# MathLive Shadow DOM Parser Algorithm

Author: Claude Sonnet 4.5

## Overview

This parser algorithm traverses the shadow DOM of a MathfieldElement to build a character-level index with metadata. This enables direct styling and manipulation of rendered mathematical content without mutating the underlying LaTeX expression. Mathlive suggests using LaTeX-based commands like `\textcolor`, which is not ideal for dynamic styling.

**Key Features**:
- Recursive DOM traversal with character-level indexing
- Depth tracking for nested structures (subscripts, superscripts, fractions)
- Element reference preservation for direct DOM manipulation

## Design Principles

### CSS Class-Based Classification

Character types are determined by MathLive's font class conventions:
- **ML__mathit**: Italic math font (variables like `x`, `y`)
- **ML__cmr**: Computer Modern Roman (operators, numbers, punctuation)
- **ML__mathbf**: Bold math font (bold variables)
- **ML__ams**: AMS symbols (mathematical operators)
- **Context-aware fallback**: Character content analysis when CSS classes are ambiguous

### Structure-Aware Context Detection

Context is determined by analyzing MathLive's vlist positioning structure:
- **Subscript/Superscript detection**: Navigate `ML__msubsup > ML__vlist-t > ML__vlist-r > ML__vlist` and identify positioned children by order
- **Fraction detection**: Navigate `ML__mfrac > ML__vlist-t > ML__vlist-r > ML__vlist` and sort by `style.top` value (more negative = numerator)
- **Reliable positioning**: Uses MathLive's internal structure rather than heuristics

### Depth Tracking for Nested Elements

Maintains nesting level throughout traversal:
- **Depth 0**: Top-level expression elements
- **Depth 1+**: Nested elements (subscripts, superscripts, fractions)
- **Depth tracking**: Increments when entering `ML__msubsup` or `ML__mfrac` containers
- **Use case**: Enables depth-based filtering or styling (e.g., "color only top-level variables")

## Assumptions

### Valid MathLive Shadow DOM Structure

The algorithm assumes the MathfieldElement has a properly rendered shadow DOM with the standard MathLive structure:
- Shadow root is accessible via `mathfield.shadowRoot`
- `.ML__base` container exists and holds rendered content
- MathLive's vlist structure is present for positioned elements

**Rationale**: MathLive's rendering is handled by the library before this algorithm runs. Malformed shadow DOM indicates a MathLive initialization error.

### Stable MathLive CSS Classes

The algorithm relies on MathLive's CSS class naming conventions remaining stable:
- Font classes: `ML__mathit`, `ML__cmr`, `ML__mathbf`, etc.
- Structural classes: `ML__vlist-t`, `ML__vlist-r`, `ML__vlist`, `ML__msubsup`, `ML__mfrac`
- Skip classes: `ML__strut`, `ML__frac-line`, `ML__vlist-s`, etc.

**Rationale**: These classes are part of MathLive's public rendering API. Breaking changes would be documented in major version updates.

### Shadow Root Accessibility

The algorithm assumes shadow root access is not blocked:
- Shadow DOM is open mode (not closed)
- No browser restrictions on shadow root access
- MathfieldElement is fully initialized before parsing

**Rationale**: MathLive uses open shadow roots by default. Closed shadow roots would prevent any DOM-based manipulation.

### Standard MathLive Rendering Mode

The algorithm assumes MathLive is using standard rendering mode:
- Static rendering (not editable mode with cursor)
- Standard font settings (no custom fonts that change CSS classes)
- No custom styling that overwrites MathLive's structural classes

**Rationale**: The algorithm is designed for reading/displaying rendered math, not editing mode. Editable mode includes additional cursor and selection elements.

## Algorithm Structure

### Phase 1: Element Filtering

Identify and skip elements that don't contain meaningful text content:

```typescript
Skip elements with classes:
- ML__strut, ML__pstrut           // Vertical spacing helpers
- ML__vlist-s                     // Zero-width space marker
- ML__frac-line                   // Fraction horizontal line
- ML__sqrt-sign, ML__sqrt-line    // Root symbols and lines
- ML__keyboard-sink               // Hidden input elements
- ML__caret                       // Cursor element
```

**Traversable containers** (not skipped):
- ML__vlist-t, ML__vlist-r, ML__vlist
- ML__msubsup, ML__mfrac
- ML__center, ML__base

### Phase 2: Context Detection

Determine the mathematical context by analyzing DOM ancestry:

```typescript
Walk up parent chain looking for:
1. ML__msubsup -> Identify subscript vs superscript by position order
2. ML__mfrac   -> Identify numerator vs denominator by style.top value
3. Default     -> Base context if no special container found
```

### Phase 3: Character Extraction

Recursively traverse DOM and extract characters with metadata:

```typescript
For each node:
1. If text node   -> Extract characters with classification
2. If element     -> Check if nesting container, recurse into children
3. Skip           -> Elements with skip classes are ignored
```

## Pseudo-Code

### Main Algorithm

```
FUNCTION parseMathfieldDOM(mathfield: MathfieldElement) -> CharacterIndexItem[]
    shadowRoot <- mathfield.shadowRoot
    IF shadowRoot is null:
        THROW Error("Shadow root not accessible")

    baseElement <- shadowRoot.querySelector('.ML__base')
    IF baseElement is null:
        THROW Error("Could not find .ML__base element")

    result <- empty array
    currentIndex <- { value: 0 }

    // Start recursive traversal
    traverseNode(baseElement, result, depth=0, currentIndex)

    RETURN result
```

### Recursive Traversal

```
FUNCTION traverseNode(node: Node, result: array, depth: number, currentIndex: object) -> void
    // PHASE 1: Handle Text Nodes
    IF node.nodeType = TEXT_NODE:
        text <- node.textContent

        // Skip whitespace and zero-width spaces
        IF text.trim() = '' OR text = '\u200B':
            RETURN

        parentElement <- node.parentElement
        IF parentElement is null:
            RETURN

        // Skip if parent has a skip class
        IF parentElement has any SKIP_CLASSES:
            RETURN

        // Extract each character
        FOR each char IN text:
            IF char.trim() = '':
                CONTINUE

            atomId <- parentElement.getAttribute('data-atom-id')
            type <- classifyCharacter(char, parentElement)
            context <- getContext(parentElement)

            result.push({
                char: char,
                index: currentIndex.value,
                element: parentElement,
                atomId: atomId,
                type: type,
                depth: depth,
                context: context
            })

            currentIndex.value++

        RETURN

    // PHASE 2: Handle Element Nodes
    IF node.nodeType = ELEMENT_NODE:
        element <- node as HTMLElement

        // Skip elements with skip classes
        IF element has any SKIP_CLASSES:
            RETURN

        // Check if this element increases nesting depth
        isNestingContainer <- element has any NESTING_CONTAINERS
        newDepth <- isNestingContainer ? (depth + 1) : depth

        // Recursively process children
        FOR each child IN element.childNodes:
            traverseNode(child, result, newDepth, currentIndex)
```

### Character Classification

```
FUNCTION classifyCharacter(char: string, element: HTMLElement) -> string
    classList <- element.className

    // Check CSS font classes for hints
    IF classList contains 'ML__mathit' OR 'ML__mathbfit':
        RETURN 'variable'

    IF classList contains 'ML__mathbf':
        RETURN 'variable'

    IF classList contains 'ML__script' OR 'ML__cal' OR 'ML__frak' OR 'ML__bb':
        RETURN 'variable'

    IF classList contains 'ML__cmr':
        // Computer Modern Roman - context-dependent
        IF char matches /^[0-9]$/:
            RETURN 'number'
        IF char matches /^[+\-*/=<>...]$/:
            RETURN 'operator'
        IF char matches /^[,;:.]$/:
            RETURN 'punctuation'
        IF char matches /^[()[\]{}]$/:
            RETURN 'punctuation'
        RETURN 'symbol'

    IF classList contains 'ML__ams':
        IF char matches operator pattern:
            RETURN 'operator'
        RETURN 'symbol'

    IF classList contains 'ML__sans' OR 'ML__tt':
        IF char matches /^[0-9]$/:
            RETURN 'number'
        IF char matches /^[a-zA-Z]$/:
            RETURN 'variable'
        IF char matches operator pattern:
            RETURN 'operator'
        IF char matches /^[,;:.]$/:
            RETURN 'punctuation'
        RETURN 'symbol'

    // Fallback: classify by character content
    IF char matches /^[0-9]$/:
        RETURN 'number'
    IF char matches /^[a-zA-Z]$/:
        RETURN 'variable'
    IF char matches operator pattern:
        RETURN 'operator'
    IF char matches /^[,;:.]$/:
        RETURN 'punctuation'
    IF char matches /^[()[\]{}]$/:
        RETURN 'punctuation'

    RETURN 'symbol'
```

### Context Detection

```
FUNCTION getContext(element: HTMLElement) -> string
    current <- element

    // Walk up the DOM tree
    WHILE current is not null:
        // Check for subscript/superscript container
        IF current.classList contains 'ML__msubsup':
            // Navigate: ML__msubsup > ML__vlist-t > ML__vlist-r > ML__vlist
            vlistT <- current.querySelector('.ML__vlist-t')
            IF vlistT exists:
                vlistR <- vlistT.querySelector('.ML__vlist-r')
                IF vlistR exists:
                    vlist <- vlistR.querySelector('.ML__vlist')
                    IF vlist exists:
                        // Get positioned children (filter out ML__vlist-s)
                        positionedChildren <- filter children where:
                            - child has style.top set
                            - child does not have class 'ML__vlist-s'

                        // Check which positioned child contains our element
                        FOR i = 0 to positionedChildren.length - 1:
                            IF positionedChildren[i] contains element:
                                // First positioned = subscript, second = superscript
                                RETURN (i = 0) ? 'subscript' : 'superscript'

        // Check for fraction container
        IF current.classList contains 'ML__mfrac':
            // Navigate: ML__mfrac > ML__vlist-t > ML__vlist-r > ML__vlist
            vlistT <- current.querySelector('.ML__vlist-t')
            IF vlistT exists:
                vlistR <- vlistT.querySelector('.ML__vlist-r')
                IF vlistR exists:
                    vlist <- vlistR.querySelector('.ML__vlist')
                    IF vlist exists:
                        // Get centered children (numerator and denominator)
                        centeredChildren <- filter children where:
                            - child has class 'ML__center'
                            - child has style.top set

                        // Sort by style.top (ascending: most negative first)
                        sort centeredChildren by parseFloat(style.top)

                        // Check which child contains our element
                        FOR i = 0 to centeredChildren.length - 1:
                            IF centeredChildren[i] contains element:
                                // First (most negative) = numerator, second = denominator
                                RETURN (i = 0) ? 'numerator' : 'denominator'

        current <- current.parentElement

    RETURN 'base'
```

## Mapping Tables

### CSS Font Classes (MathLive)

```
Character Type Indicators:
ML__mathit      -> Variable (italic math font)
ML__mathbfit    -> Variable (bold italic)
ML__mathbf      -> Variable (bold)
ML__script      -> Variable (script font)
ML__cal         -> Variable (calligraphic)
ML__frak        -> Variable (fraktur/gothic)
ML__bb          -> Variable (blackboard bold)
ML__cmr         -> Context-dependent (Computer Modern Roman)
ML__ams         -> Symbol/operator (AMS symbols)
ML__sans        -> Context-dependent (sans-serif)
ML__tt          -> Context-dependent (typewriter/monospace)
```

### Skip Classes (Non-Content Elements)

```
Structural Helpers (no text content):
ML__strut            -> Vertical spacing strut
ML__strut--bottom    -> Bottom spacing strut
ML__pstrut           -> Positioning strut
ML__vlist-s          -> Zero-width space marker (U+200B)
ML__frac-line        -> Fraction horizontal line (rendered as border/SVG)
ML__sqrt-sign        -> Square root sign container
ML__sqrt-line        -> Square root overline
ML__nulldelimiter    -> Empty delimiter spacer

Interactive Elements (hidden from math content):
ML__keyboard-sink    -> Hidden input element for keyboard events
ML__sr-only          -> Screen reader only content
ML__virtual-keyboard-toggle -> Virtual keyboard button
ML__menu-toggle      -> Menu button
ML__caret            -> Cursor/caret element (editing mode)
```

### Nesting Containers (Depth Increase)

```
Containers that increase depth:
ML__msubsup    -> Subscript/superscript container
ML__mfrac      -> Fraction container

Traversable Containers (depth unchanged):
ML__vlist-t    -> Vertical list table
ML__vlist-r    -> Vertical list row
ML__vlist      -> Vertical list container
ML__center     -> Centered content wrapper
ML__base       -> Base container for all math content
```

## Examples

### Example 1: Simple Expression

**Input LaTeX**: `x+y=z`

**Shadow DOM Structure** (simplified):
```
.ML__base
  <span class="ML__mathit">x</span>
  <span class="ML__cmr">+</span>
  <span class="ML__mathit">y</span>
  <span class="ML__cmr">=</span>
  <span class="ML__mathit">z</span>
```

**Processing**:
1. Traverse .ML__base (depth=0)
2. Text node "x" in ML__mathit element
   - char='x', type='variable', context='base', depth=0, index=0
3. Text node "+" in ML__cmr element
   - char='+', type='operator', context='base', depth=0, index=1
4. Text node "y" in ML__mathit element
   - char='y', type='variable', context='base', depth=0, index=2
5. Text node "=" in ML__cmr element
   - char='=', type='operator', context='base', depth=0, index=3
6. Text node "z" in ML__mathit element
   - char='z', type='variable', context='base', depth=0, index=4

**Output**:
```
[
  { char: 'x', index: 0, type: 'variable', depth: 0, context: 'base' },
  { char: '+', index: 1, type: 'operator', depth: 0, context: 'base' },
  { char: 'y', index: 2, type: 'variable', depth: 0, context: 'base' },
  { char: '=', index: 3, type: 'operator', depth: 0, context: 'base' },
  { char: 'z', index: 4, type: 'variable', depth: 0, context: 'base' }
]
```

### Example 2: Subscripts

**Input LaTeX**: `x_{i}+x_{i+1}`

**Shadow DOM Structure** (simplified):
```
.ML__base
  <span class="ML__msubsup">
    <span class="ML__vlist-t">
      <span class="ML__vlist-r">
        <span class="ML__vlist">
          <span style="top: -2.55em">
            <span class="ML__mathit">x</span>
          </span>
          <span style="top: -2.15em">  <!-- First positioned = subscript -->
            <span class="ML__mathit">i</span>
          </span>
        </span>
      </span>
    </span>
  </span>
  <span class="ML__cmr">+</span>
  <span class="ML__msubsup">
    <!-- Similar structure for x_{i+1} -->
  </span>
```

**Processing**:
1. Enter ML__msubsup container (nesting container, depth becomes 1)
2. Navigate to positioned spans in vlist
3. First positioned span (top: -2.55em) contains base "x"
   - Context detection: not in subscript/superscript container -> 'base'
   - char='x', type='variable', context='base', depth=1, index=0
4. Second positioned span (top: -2.15em) contains subscript "i"
   - Context detection: first positioned child in ML__msubsup -> 'subscript'
   - char='i', type='variable', context='subscript', depth=1, index=1
5. Process "+" (depth=0, context='base')
6. Process second x_{i+1} similarly:
   - 'x' (depth=1, context='base')
   - 'i' (depth=1, context='subscript')
   - '+' (depth=1, context='subscript')
   - '1' (depth=1, context='subscript', type='number')

**Output**:
```
[
  { char: 'x', index: 0, type: 'variable', depth: 1, context: 'base' },
  { char: 'i', index: 1, type: 'variable', depth: 1, context: 'subscript' },
  { char: '+', index: 2, type: 'operator', depth: 0, context: 'base' },
  { char: 'x', index: 3, type: 'variable', depth: 1, context: 'base' },
  { char: 'i', index: 4, type: 'variable', depth: 1, context: 'subscript' },
  { char: '+', index: 5, type: 'operator', depth: 1, context: 'subscript' },
  { char: '1', index: 6, type: 'number', depth: 1, context: 'subscript' }
]
```

### Example 3: Superscripts

**Input LaTeX**: `a^{2}+b^{2}=c^{2}`

**Shadow DOM Structure** (simplified):
```
.ML__base
  <span class="ML__msubsup">
    <span class="ML__vlist-t">
      <span class="ML__vlist-r">
        <span class="ML__vlist">
          <span style="top: -2.95em">
            <span class="ML__mathit">a</span>
          </span>
          <span style="top: -3.45em">  <!-- Second positioned = superscript -->
            <span class="ML__cmr">2</span>
          </span>
        </span>
      </span>
    </span>
  </span>
  <!-- Similar for b^2 and c^2 -->
```

**Processing**:
1. Enter ML__msubsup container (depth=1)
2. First positioned span: base "a" (context='base', depth=1)
3. Second positioned span: superscript "2" (context='superscript', depth=1)
   - Positioned child index=1 -> 'superscript'
4. Process operator "+" (depth=0, context='base')
5. Repeat for b^2 and c^2

**Output**:
```
[
  { char: 'a', index: 0, type: 'variable', depth: 1, context: 'base' },
  { char: '2', index: 1, type: 'number', depth: 1, context: 'superscript' },
  { char: '+', index: 2, type: 'operator', depth: 0, context: 'base' },
  { char: 'b', index: 3, type: 'variable', depth: 1, context: 'base' },
  { char: '2', index: 4, type: 'number', depth: 1, context: 'superscript' },
  { char: '=', index: 5, type: 'operator', depth: 0, context: 'base' },
  { char: 'c', index: 6, type: 'variable', depth: 1, context: 'base' },
  { char: '2', index: 7, type: 'number', depth: 1, context: 'superscript' }
]
```

### Example 4: Fractions

**Input LaTeX**: `\frac{a+b}{c-d}`

**Shadow DOM Structure** (simplified):
```
.ML__base
  <span class="ML__mfrac">
    <span class="ML__vlist-t">
      <span class="ML__vlist-r">
        <span class="ML__vlist">
          <span class="ML__center" style="top: -1.4em">  <!-- Most negative = numerator -->
            <span class="ML__mathit">a</span>
            <span class="ML__cmr">+</span>
            <span class="ML__mathit">b</span>
          </span>
          <span style="top: -0.7em">  <!-- Fraction line, no ML__center -->
            <span class="ML__frac-line"></span>
          </span>
          <span class="ML__center" style="top: 0em">  <!-- Less negative = denominator -->
            <span class="ML__mathit">c</span>
            <span class="ML__cmr">-</span>
            <span class="ML__mathit">d</span>
          </span>
        </span>
      </span>
    </span>
  </span>
```

**Processing**:
1. Enter ML__mfrac container (nesting container, depth=1)
2. Context detection sorts ML__center children by style.top:
   - style.top=-1.4em (numerator)
   - style.top=0em (denominator)
   - Fraction line (no ML__center) is skipped
3. Process numerator content:
   - 'a' (depth=1, context='numerator', type='variable')
   - '+' (depth=1, context='numerator', type='operator')
   - 'b' (depth=1, context='numerator', type='variable')
4. Skip fraction line (ML__frac-line in SKIP_CLASSES)
5. Process denominator content:
   - 'c' (depth=1, context='denominator', type='variable')
   - '-' (depth=1, context='denominator', type='operator')
   - 'd' (depth=1, context='denominator', type='variable')

**Output**:
```
[
  { char: 'a', index: 0, type: 'variable', depth: 1, context: 'numerator' },
  { char: '+', index: 1, type: 'operator', depth: 1, context: 'numerator' },
  { char: 'b', index: 2, type: 'variable', depth: 1, context: 'numerator' },
  { char: 'c', index: 3, type: 'variable', depth: 1, context: 'denominator' },
  { char: '-', index: 4, type: 'operator', depth: 1, context: 'denominator' },
  { char: 'd', index: 5, type: 'variable', depth: 1, context: 'denominator' }
]
```

### Example 5: Mixed Nesting

**Input LaTeX**: `x_{i}^{2}+\frac{y}{z}`

**Shadow DOM Structure** (simplified):
```
.ML__base
  <span class="ML__msubsup">  <!-- x_i^2 -->
    <span class="ML__vlist">
      <span style="top: -2.95em">x (base)</span>
      <span style="top: -2.35em">i (subscript, first positioned)</span>
      <span style="top: -3.65em">2 (superscript, second positioned)</span>
    </span>
  </span>
  <span class="ML__cmr">+</span>
  <span class="ML__mfrac">  <!-- y/z -->
    <!-- fraction structure -->
  </span>
```

**Processing**:
1. Enter ML__msubsup (depth=1)
   - Base 'x': When traversing, getContext walks up and finds ML__msubsup but the base element is not inside a positioned child that indicates subscript/superscript, so it returns 'base'
   - Subscript 'i': First positioned child -> 'subscript'
   - Superscript '2': Second positioned child -> 'superscript'
2. Process '+' at depth=0, context='base'
3. Enter ML__mfrac (depth=1)
   - 'y' in numerator (top=-1.4em) -> context='numerator'
   - 'z' in denominator (top=0em) -> context='denominator'

**Output**:
```
[
  { char: 'x', index: 0, type: 'variable', depth: 1, context: 'base' },
  { char: 'i', index: 1, type: 'variable', depth: 1, context: 'subscript' },
  { char: '2', index: 2, type: 'number', depth: 1, context: 'superscript' },
  { char: '+', index: 3, type: 'operator', depth: 0, context: 'base' },
  { char: 'y', index: 4, type: 'variable', depth: 1, context: 'numerator' },
  { char: 'z', index: 5, type: 'variable', depth: 1, context: 'denominator' }
]
```

**Note**: Variable 'x' has both subscript and superscript but is marked as depth=1 context='base'. The subscript 'i' and superscript '2' are at the same depth but different contexts.

### Example 6: Deeply Nested Expression

**Input LaTeX**: `\frac{x_{1}^{2}}{y_{2}^{3}}`

**Shadow DOM Structure** (conceptual):
```
.ML__base (depth=0)
  .ML__mfrac (depth=1)
    .ML__center (numerator)
      .ML__msubsup (depth=2)
        x (context='base', depth=2)
        subscript: 1 (context='subscript', depth=2)
        superscript: 2 (context='superscript', depth=2)
    .ML__center (denominator)
      .ML__msubsup (depth=2)
        y (context='base', depth=2)
        subscript: 2 (context='subscript', depth=2)
        superscript: 3 (context='superscript', depth=2)
```

**Processing**:
1. Enter ML__mfrac (depth becomes 1)
2. Numerator contains ML__msubsup:
   - Enter ML__msubsup (depth becomes 2)
   - 'x' (depth=2, context='base', but parent context is 'numerator')
   - '1' (depth=2, context='subscript')
   - '2' (depth=2, context='superscript')
3. Denominator contains ML__msubsup:
   - Enter ML__msubsup (depth becomes 2)
   - 'y' (depth=2, context='base', but parent context is 'denominator')
   - '2' (depth=2, context='subscript')
   - '3' (depth=2, context='superscript')

**Output**:
```
[
  { char: 'x', index: 0, type: 'variable', depth: 2, context: 'base' },
  { char: '1', index: 1, type: 'number', depth: 2, context: 'subscript' },
  { char: '2', index: 2, type: 'number', depth: 2, context: 'superscript' },
  { char: 'y', index: 3, type: 'variable', depth: 2, context: 'base' },
  { char: '2', index: 4, type: 'number', depth: 2, context: 'subscript' },
  { char: '3', index: 5, type: 'number', depth: 2, context: 'superscript' }
]
```

**Note**: Context reflects the immediate positioning structure (subscript, superscript, base within ML__msubsup), not the parent fraction context. The 'x' is technically in the numerator of a fraction, but its immediate context is 'base' within ML__msubsup. To determine "x is in a fraction numerator," you would need to track parent contexts separately.

## Special Cases Handled

### 1. Zero-Width Space Characters

MathLive uses zero-width space (U+200B) as visual markers in the DOM structure:

```
<span class="ML__vlist-s"></span>  // Zero-width space marker
```

**Handling**: Skip text nodes containing only `\u200B`:
```typescript
if (text.trim() === '' || text === '\u200B') {
  return;
}
```

### 2. Fraction Line Elements

Fraction horizontal lines are rendered using CSS borders or SVG, not text:

```
<span style="top: -0.7em">
  <span class="ML__frac-line"></span>
</span>
```

**Handling**: ML__frac-line is in SKIP_CLASSES, so these elements are not traversed.

### 3. Positioned Elements in Vlists

MathLive uses `style.top` to position elements vertically:

```
<span style="top: -2.15em">subscript content</span>
<span style="top: -3.45em">superscript content</span>
```

**Handling**: Context detection filters positioned children and uses:
- **For ML__msubsup**: Order of positioned children (first=subscript, second=superscript)
- **For ML__mfrac**: Sorting by `style.top` value (most negative=numerator, less negative=denominator)

### 4. Multiple Modifiers on Same Base

A variable can have both subscript and superscript:

```
LaTeX: x_{i}^{2}
DOM: ML__msubsup with two positioned children after base
```

**Handling**: The algorithm identifies both modifiers through vlist structure:
- First positioned child -> subscript context
- Second positioned child -> superscript context
- Base element gets 'base' context

### 5. Greek Letters with Modifiers

Greek letters rendered with modifiers:

```
LaTeX: \theta_{y}
DOM: <span class="ML__cmmi">\u03B8</span> with subscript structure
```

**Handling**: Greek letter characters are classified the same as Latin letters:
- If in ML__mathit or ML__cmmi -> 'variable'
- Modifiers processed identically to Latin variables

### 6. Whitespace Handling

MathLive may include whitespace text nodes for layout:

```
Text node: "  " (spaces)
Text node: "\n" (newline)
```

**Handling**: Skip characters where `char.trim() === ''`:
```typescript
for (const char of text) {
  if (char.trim() === '') continue;
  // Process character
}
```

### 7. Strut Elements

MathLive inserts strut elements for vertical alignment:

```
<span class="ML__strut" style="height: 0.8em"></span>
<span class="ML__strut--bottom" style="height: 2.1em"></span>
```

**Handling**: All strut classes are in SKIP_CLASSES, preventing traversal.

## Edge Cases & Solutions

### Edge Case 1: Empty Expressions

**Problem**: Mathfield contains no rendered content (empty LaTeX).

**Example**: LaTeX = `""`

**Solution**: Algorithm returns empty array gracefully:
```typescript
const result: CharacterIndexItem[] = [];
// No text nodes found -> result remains empty
return result;  // []
```

**Behavior**: No error thrown, empty array indicates no characters to style.

### Edge Case 2: Whitespace-Only Text Nodes

**Problem**: Text nodes containing only spaces, tabs, or newlines.

**Example**: Text node content = `"   "` or `"\n\t"`

**Solution**: Skip whitespace during character extraction:
```typescript
if (text.trim() === '') {
  return;  // Skip entire text node
}

for (const char of text) {
  if (char.trim() === '') continue;  // Skip individual whitespace chars
}
```

### Edge Case 3: Missing Parent Element

**Problem**: Text node's parent element is null (orphaned text node).

**Example**: Malformed DOM or text node not attached

**Solution**: Early return to prevent null reference errors:
```typescript
const parentElement = node.parentElement;
if (!parentElement) return;
```

**Note**: This indicates a malformed DOM, which shouldn't occur with valid MathLive rendering.

### Edge Case 4: Deep Nesting (Depth > 3)

**Problem**: Expressions with many nested levels (e.g., `\frac{x_{i}^{2}}{y_{j}^{3}}`).

**Example**: Depth could exceed 3 or 4 levels

**Solution**: Algorithm handles arbitrary nesting depth:
```typescript
const newDepth = isNestingContainer ? depth + 1 : depth;
```

**Test Validation**: Tests verify `depth >= 0` and `depth < 10` as reasonable bounds.

### Edge Case 5: Elements Without style.top

**Problem**: Positioned elements missing `style.top` attribute.

**Example**: Malformed vlist structure

**Solution**: Filter checks for `style.top` existence:
```typescript
const positionedChildren = Array.from(vlist.children).filter(
  (child): child is HTMLElement => {
    return (
      !!htmlChild.style &&
      !!htmlChild.style.top &&
      htmlChild.style.top !== ''
    );
  }
);
```

**Behavior**: Elements without `style.top` are excluded from positioning logic.

### Edge Case 6: Context Ambiguity in Complex Structures

**Problem**: Element could potentially match multiple context detection paths.

**Example**: Nested fractions within subscripts

**Solution**: Context detection walks up tree and returns first match:
```typescript
while (current) {
  if (current.classList.contains('ML__msubsup')) {
    // Check subscript/superscript
    return context;
  }
  if (current.classList.contains('ML__mfrac')) {
    // Check numerator/denominator
    return context;
  }
  current = current.parentElement;
}
return 'base';  // Default if no match
```

**Behavior**: Innermost context wins (e.g., subscript within fraction returns 'subscript').

### Edge Case 7: JSDOM vs Browser DOM

**Problem**: Tests use JSDOM which may have slight differences from browser DOM.

**Example**: `nodeType` checks needed for JSDOM compatibility

**Solution**: Explicit `nodeType === 1` checks for element nodes:
```typescript
if (child.nodeType !== 1) return false;
const htmlChild = child as HTMLElement;
```

## Design Decisions

### Why Maintain Element References?

**Decision**: Store reference to parent `HTMLElement` for each character.

**Rationale**:
1. **Direct styling**: Enables immediate DOM manipulation without re-searching
2. **Pixel positions**: Can query `getBoundingClientRect()` for exact positions
3. **Interactivity**: Enables hover effects, click handlers on individual characters
4. **Performance**: Avoids costly DOM queries during styling operations

## Testing Strategy

### Test Organization (Fixture-Based)

#### Fixtures
- **Source**: `tests/logic/mathfield-fixtures/*.html`
- **Format**: HTML files with declarative shadow DOM
- **Count**: Multiple fixtures covering diverse expressions
- **Content**: Real MathLive rendered output with shadow DOM structure

#### Test Structure

**1. Fixture Loading and Parsing**
- Load all HTML fixtures from directory
- Extract LaTeX from light DOM content
- Parse shadow DOM template
- Find `.ML__base` element for traversal

**2. Basic Smoke Test (1 test)**
- Validates all fixtures have valid structure
- Ensures no parsing errors
- Reports any invalid fixtures

**3. Individual Fixture Tests (9 tests per fixture)**
Each fixture runs comprehensive validation:

**(a) Proper Indexing**
- All items have required properties
- Indices are sequential starting from 0
- Index matches array position

**(b) Character Type Classification**
- All types are valid: 'variable', 'operator', 'number', 'punctuation', 'symbol'
- Type coverage is reasonable

**(c) Context Identification**
- All contexts are valid: 'base', 'subscript', 'superscript', 'numerator', 'denominator'
- At least one 'base' context item exists

**(d) Depth Tracking**
- All depths are non-negative
- Depths are reasonable (< 10)
- At least one depth=0 item exists

**(e) Element References**
- All elements are truthy
- Elements are valid DOM nodes (nodeType=1)
- Element text content contains the character

**(f) Atom IDs**
- Atom IDs are non-empty strings when present
- Tests existence but not specific values

**(g) Equals Sign Handling**
- Top-level equals signs have type='operator'
- Top-level equals signs have depth=0
- Top-level equals signs have context='base'

**(h) Comma Handling**
- Top-level commas have type='punctuation'
- Top-level commas have context='base'

**(i) Nested Structure Handling**
- Nested items (depth > 0) have appropriate contexts
- Subscripts have depth > 0
- Superscripts have depth > 0
- Fraction chars (numerator/denominator) have depth > 0

**4. Aggregate Statistics Tests (4 tests)**

**(a) Character Type Coverage**
- Aggregates types across all fixtures
- Verifies all 5 types are encountered: variable, number, operator, punctuation, symbol
- Ensures comprehensive test coverage

**(b) Context Coverage**
- Aggregates contexts across all fixtures
- Verifies all 5 contexts are encountered: base, subscript, superscript, numerator, denominator
- Ensures comprehensive test coverage

**(c) Equations with Equals Signs**
- Counts fixtures with top-level equals signs
- Validates substantial coverage (>= 10 fixtures)

**(d) Equations with Commas**
- Counts fixtures with commas
- Validates substantial coverage (>= 10 fixtures)

**(e) Nested Structures**
- Counts fixtures with depth > 0
- Validates substantial coverage (>= 30 fixtures)

## Implementation Notes

### Shadow DOM Structure

MathLive renders math using shadow DOM with this structure:

```
<math-field>
  #shadow-root (open)
    <div class="ML__base">
      <!-- Rendered math content -->
    </div>
    <div class="ML__keyboard-sink"></div>
    <!-- Other UI elements -->
  </div>
</math-field>
```

**Key containers**:
- `.ML__base`: Root container for all rendered math
- `.ML__msubsup`: Subscript/superscript container
- `.ML__mfrac`: Fraction container
- `.ML__vlist-t`: Vertical list table (positioning wrapper)
- `.ML__vlist-r`: Vertical list row
- `.ML__vlist`: Vertical list (contains positioned children)

### MathLive's Vlist Positioning System

MathLive uses a vertical list (vlist) system for precise positioning:

```
<span class="ML__vlist-t">
  <span class="ML__vlist-r">
    <span class="ML__vlist">
      <span style="top: -2.55em">...</span>  <!-- Positioned child 1 -->
      <span style="top: -2.15em">...</span>  <!-- Positioned child 2 -->
      <span style="top: -3.45em">...</span>  <!-- Positioned child 3 -->
    </span>
  </span>
</span>
```

**Positioning rules**:
- `style.top` controls vertical position
- Negative values = positioned above baseline
- More negative = higher up
- For fractions: Most negative = numerator, less negative = denominator
- For sub/superscripts: Order of positioned children determines type (first=sub, second=super)

### Font Class Conventions

MathLive uses specific font classes from `mathlive/src/core/modes-math.ts`:

**Variable fonts**:
- `ML__mathit`: Italic math font (default for variables)
- `ML__mathbfit`: Bold italic
- `ML__mathbf`: Bold
- `ML__script`: Script font
- `ML__cal`: Calligraphic
- `ML__frak`: Fraktur/gothic
- `ML__bb`: Blackboard bold (double-struck)

**Context-dependent fonts**:
- `ML__cmr`: Computer Modern Roman (numbers, operators, punctuation)
- `ML__ams`: AMS symbols (mathematical operators)
- `ML__sans`: Sans-serif
- `ML__tt`: Typewriter/monospace

**Classification logic**: Font classes encode semantic information, allowing accurate character type detection.

### Data Structures

```typescript
interface CharacterIndexItem {
  char: string;              // The actual character (e.g., 'x', '=', '2')
  index: number;             // Sequential index starting from 0
  element: HTMLElement;      // Reference to DOM element containing character
  atomId?: string;           // MathLive's internal atom ID (data-atom-id)
  type: string;              // 'variable', 'operator', 'number', 'punctuation', 'symbol'
  depth: number;             // Nesting depth: 0 = top-level, 1+ = nested
  context: string;           // 'base', 'subscript', 'superscript', 'numerator', 'denominator'
}
```

**Usage**:
```typescript
// Find all variables
const variables = index.filter(item => item.type === 'variable');

// Find all subscripts
const subscripts = index.filter(item => item.context === 'subscript');

// Style characters 3-7
index
  .filter(item => item.index >= 3 && item.index < 7)
  .forEach(item => item.element.style.color = 'red');
```

## Future Enhancements

### Potential Improvements

#### Support for Matrices and Arrays

**Current state**: Algorithm only handles basic structures (subscripts, superscripts, fractions).

**Why it would be useful**:
- Matrices use different DOM structure (`ML__arraycolsep`, `ML__mord`)
- Arrays need row/column indexing
- Enable styling individual matrix elements

**Possible implementation**:
```typescript
// Add new contexts
context: 'base' | 'subscript' | 'superscript' | 'numerator' | 'denominator' | 'matrix-cell'

// Add matrix-specific metadata
interface CharacterIndexItem {
  // ... existing properties
  matrixPosition?: { row: number; col: number };
}
```

**Use case**: Color different matrix rows, highlight diagonal elements

## Usage Examples

```typescript
import {
  parseMathfieldDOM,
  applyStyleToRange,
  clearStyles,
  CharacterIndexItem
} from '@/logic/mathfield-dom-parser';

// Example 1: Parse mathfield and get character index
const mathfield = document.querySelector('math-field') as MathfieldElement;
const index = parseMathfieldDOM(mathfield);

console.log(`Expression has ${index.length} characters`);
index.forEach(item => {
  console.log(`[${item.index}] '${item.char}' - ${item.type} (${item.context})`);
});

// Example 2: Color all variables red
index
  .filter(item => item.type === 'variable')
  .forEach(item => {
    item.element.style.color = 'red';
  });

// Example 3: Color subscripts blue
index
  .filter(item => item.context === 'subscript')
  .forEach(item => {
    item.element.style.color = 'blue';
  });

// Example 4: Style a specific character range (0-4)
applyStyleToRange(index, 0, 5, { color: 'green' });

// Example 5: Clear all styling
clearStyles(index);

// Example 6: Find equals sign position
const equalsSign = index.find(item => item.char === '=' && item.depth === 0);
if (equalsSign) {
  console.log(`Equals sign at index ${equalsSign.index}`);
  equalsSign.element.style.backgroundColor = 'yellow';
}

// Example 7: Highlight top-level content only
index
  .filter(item => item.depth === 0)
  .forEach(item => {
    item.element.style.fontWeight = 'bold';
  });

// Example 8: Color fractions differently
index
  .filter(item => item.context === 'numerator')
  .forEach(item => item.element.style.color = 'red');

index
  .filter(item => item.context === 'denominator')
  .forEach(item => item.element.style.color = 'blue');

// Example 9: Interactive hover effect
index.forEach(item => {
  item.element.addEventListener('mouseenter', () => {
    item.element.style.backgroundColor = 'yellow';
  });
  item.element.addEventListener('mouseleave', () => {
    item.element.style.backgroundColor = '';
  });
});

// Example 10: Analyze expression structure
const stats = {
  variables: index.filter(i => i.type === 'variable').length,
  operators: index.filter(i => i.type === 'operator').length,
  subscripts: index.filter(i => i.context === 'subscript').length,
  superscripts: index.filter(i => i.context === 'superscript').length,
  maxDepth: Math.max(...index.map(i => i.depth))
};

console.log('Expression statistics:', stats);
```

## References

### Related Files

- **Implementation**: [src/logic/mathfield-dom-parser.ts](../../src/logic/mathfield-dom-parser.ts)
- **Tests**: [tests/logic/mathfield-dom-parser.test.ts](../../tests/e2e/mathfield-dom-parser.test.ts)
