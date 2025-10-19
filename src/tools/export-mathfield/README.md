# MathField Export Utilities

Utility functions for exporting MathLive mathfield HTML including shadow DOM content. These are useful for creating test cases and debugging shadow DOM structure.

## Overview

The export utilities allow you to capture the complete HTML structure of MathLive mathfields, including their shadow DOM content, in a format compatible with JSDOM for testing.

## Automatic Console Access (Development Mode)

When running the app in development mode (`npm run dev`), the export utilities are **automatically available** in the browser console via the `__mathfieldExports` global object:

```javascript
// Export the first mathfield on the page (logs to console)
__mathfieldExports.exportMathfield()

// Export all mathfields on the page (logs each to console)
__mathfieldExports.exportAllMathfields()

// Download first mathfield as a file
__mathfieldExports.downloadMathfield('my-test-case.html')

// Download all mathfields as separate files
__mathfieldExports.downloadAll('test-case')
```

This is enabled automatically in `src/pages/_app.tsx` via the `enableConsoleExports()` function.

## Programmatic Usage

You can also import and use the export functions directly in your code:

```typescript
import {
  exportMathfieldHTML,
  exportMathfieldById,
  exportAllMathfields,
  downloadMathfieldHTML,
  downloadAllMathfields,
} from '@/utils/export-mathfield-html';

// Export a specific mathfield to string
const mathfield = document.querySelector('math-field');
if (mathfield instanceof MathfieldElement) {
  const html = exportMathfieldHTML(mathfield);
  console.log(html);
}

// Export by ID
const html = exportMathfieldById('mathfield-123');

// Export all mathfields on the page
const allHtmls = exportAllMathfields();

// Download a mathfield as a file
downloadMathfieldHTML(mathfield, 'test-case-new.html');

// Download all mathfields as separate files
downloadAllMathfields('test-case');
```

## Exported HTML Format

The exported HTML uses **Declarative Shadow DOM** syntax, which is compatible with JSDOM for testing:

```html
<math-field id="..." class="..." style="...">
  <template shadowrootmode="open" shadowrootdelegatesfocus="">
    <!-- Complete shadow DOM structure -->
    <style>...</style>
    <div class="ML__container">
      <div class="ML__base">
        <!-- Character elements with data-atom-id attributes -->
      </div>
    </div>
  </template>
  \LaTeX{expression}
</math-field>
```

### Key Features

- **Declarative Shadow DOM**: Uses `<template shadowrootmode="open">` for easy parsing
- **Complete structure**: Includes all MathLive internal elements and styles
- **Atom IDs**: Preserves `data-atom-id` attributes for debugging
- **JSDOM compatible**: Can be loaded and parsed in Node.js tests

## Test Fixtures

Test fixtures are stored in `tests/logic/mathfield-fixtures/` and are automatically tested by `tests/logic/parse-mathfield-dom.test.ts`.

### Current Test Coverage

- **79 unique fixtures** covering various equation structures
- Each fixture tests: character indexing, type classification, context detection, depth tracking, subscripts, superscripts, fractions
- **953 total tests** ensure robust parsing across all equation types

### Adding New Test Fixtures

1. **Create the equation** in the app (development mode)
2. **Export it** using `__mathfieldExports.downloadMathfield('test-case-N.html')`
3. **Save to fixtures directory**: `tests/logic/mathfield-fixtures/`
4. **Run tests** to verify: `npm test -- parse-mathfield-dom`

The test suite automatically discovers and tests all fixtures in the directory.

## API Reference

### `exportMathfieldHTML(mathfield: MathfieldElement): string`
Exports a complete HTML representation of a mathfield including its shadow DOM.

**Returns**: HTML string with declarative shadow DOM format

### `exportMathfieldById(id: string): string | null`
Exports a mathfield by its element ID.

**Returns**: HTML string, or `null` if not found

### `exportAllMathfields(): string[]`
Exports all mathfield elements on the current page.

**Returns**: Array of HTML strings

### `downloadMathfieldHTML(mathfield: MathfieldElement, filename?: string): void`
Downloads a mathfield's HTML as a file.

**Parameters**:
- `filename` (optional): Defaults to `'mathfield-export.html'`

### `downloadAllMathfields(filenamePrefix?: string): void`
Downloads all mathfields as separate files.

**Parameters**:
- `filenamePrefix` (optional): Defaults to `'mathfield-export'`

### `enableConsoleExports(): void`
Enables console access to export utilities via `__mathfieldExports` global. Automatically called in development mode.

## Troubleshooting

### "No mathfield found on page"
Ensure you're on a page that contains mathfield elements (equation lines in the main app).

### "Shadow root not accessible"
Wait for the mathfield to fully render after the page loads. Try interacting with the mathfield first.

### Console utilities not available
The `__mathfieldExports` object is only available in development mode (`npm run dev`). For production builds, import the functions directly from `@/utils/export-mathfield-html`.
