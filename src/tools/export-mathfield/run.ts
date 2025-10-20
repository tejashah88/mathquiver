/* eslint-disable no-console */
/**
 * Utility functions for exporting MathLive mathfield HTML including shadow DOM content.
 * These are useful for creating test cases and debugging shadow DOM structure.
 */

import { MathfieldElement } from 'mathlive';

/**
 * Serializes a shadow root to HTML string using declarative shadow DOM syntax.
 * This format is compatible with Chrome DevTools export and can be parsed by JSDOM.
 *
 * @param shadowRoot - The shadow root to serialize
 * @returns HTML string with <template shadowrootmode="open"> wrapper
 */
function serializeShadowRoot(shadowRoot: ShadowRoot): string {
  const mode = shadowRoot.mode || 'open';
  const delegatesFocus = shadowRoot.delegatesFocus ? ' shadowrootdelegatesfocus=""' : '';

  // Create a temporary container and clone all children into it
  const temp = document.createElement('div');

  // Clone each child node from the shadow root
  Array.from(shadowRoot.childNodes).forEach(node => {
    temp.appendChild(node.cloneNode(true));
  });

  return `<template shadowrootmode="${mode}"${delegatesFocus}>${temp.innerHTML}</template>`;
}

/**
 * Exports a MathfieldElement's complete HTML including shadow DOM content.
 * The output includes the mathfield element with its shadow root as a declarative shadow DOM template.
 *
 * @param mathfield - The MathfieldElement to export
 * @returns Complete HTML string including shadow DOM
 */
export function exportMathfieldHTML(mathfield: MathfieldElement): string {
  // Get the outer HTML attributes
  const id = mathfield.id ? ` id="${mathfield.id}"` : '';
  const className = mathfield.className ? ` class="${mathfield.className}"` : '';
  const contenteditable = mathfield.contentEditable !== 'inherit' ? ` contenteditable="${mathfield.contentEditable}"` : '';
  const style = mathfield.style.cssText ? ` style="${mathfield.style.cssText}"` : '';
  const tabindex = mathfield.tabIndex !== -1 ? ` tabindex="${mathfield.tabIndex}"` : '';

  // Get shadow root content
  const shadowRoot = mathfield.shadowRoot;
  if (!shadowRoot) {
    throw new Error('Shadow root not accessible on mathfield element');
  }

  const shadowHTML = serializeShadowRoot(shadowRoot);

  // Get the LaTeX content (light DOM slot content)
  const latex = mathfield.getValue('latex-unstyled');

  return `<math-field${id}${className}${contenteditable}${style}${tabindex}>${shadowHTML}${latex}</math-field>`;
}

/**
 * Exports a specific mathfield by its ID.
 *
 * @param id - The ID of the mathfield element
 * @returns HTML string of the mathfield, or null if not found
 */
export function exportMathfieldById(id: string): string | null {
  const mathfield = document.getElementById(id);
  if (!mathfield || !(mathfield instanceof MathfieldElement)) {
    return null;
  }

  return exportMathfieldHTML(mathfield);
}

/**
 * Exports all mathfield elements on the current page.
 *
 * Excludes read-only mathfield elements (those without contenteditable="true")
 * and empty mathfields (those with no latex content).
 *
 * @returns Array of HTML strings, one for each editable, non-empty mathfield
 */
export function exportAllMathfields(): string[] {
  const mathfields = document.querySelectorAll('math-field');
  const results: string[] = [];

  mathfields.forEach(mathfield => {
    if (mathfield instanceof MathfieldElement) {
      // Skip read-only mathfields (those without contenteditable="true")
      if (mathfield.contentEditable !== 'true') {
        return;
      }

      // Skip empty mathfields (those with no latex content)
      const latex = mathfield.getValue('latex-unstyled');
      if (!latex || latex.trim() === '') {
        return;
      }

      results.push(exportMathfieldHTML(mathfield));
    }
  });

  return results;
}

/**
 * Downloads a mathfield's HTML as a file.
 *
 * @param mathfield - The MathfieldElement to download
 * @param filename - The filename to save as (default: 'mathfield-export.html')
 */
export function downloadMathfieldHTML(mathfield: MathfieldElement, filename = 'mf-fixture.html'): void {
  const html = exportMathfieldHTML(mathfield);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Downloads all editable mathfields on the page as separate files.
 *
 * Excludes read-only mathfield elements (those without contenteditable="true")
 * and empty mathfields (those with no latex content).
 *
 * @param filenamePrefix - Prefix for the filenames (default: 'mf-fixture')
 */
export function downloadAllMathfields(filenamePrefix = 'mf-fixture'): void {
  const htmls = exportAllMathfields();

  htmls.forEach((html, index) => {
    const filename = `${filenamePrefix}-${index + 1}.html`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  });
}

/**
 * Utility function to add export functionality to the browser console.
 * Call this in the browser console to make export functions globally available.
 */
export function enableConsoleExports(): void {
  if (typeof window === 'undefined') {
    console.warn('enableConsoleExports() can only be called in a browser environment');
    return;
  }

  // Add functions to window for console access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__mathfieldExports = {
    /**
     * Export the first editable, non-empty mathfield on the page
     */
    exportMathfield: () => {
      const mathfields = document.querySelectorAll('math-field');
      for (const mathfield of mathfields) {
        if (mathfield instanceof MathfieldElement && mathfield.contentEditable === 'true') {
          const latex = mathfield.getValue('latex-unstyled');
          if (latex && latex.trim() !== '') {
            const html = exportMathfieldHTML(mathfield);
            console.log(html);
            return html;
          }
        }
      }
      console.error('No editable, non-empty mathfield found on page');
      return null;
    },

    /**
     * Export all editable, non-empty mathfields on the page
     */
    exportAllMathfields: () => {
      const htmls = exportAllMathfields();
      console.log(`Found ${htmls.length} editable, non-empty mathfield(s)`);
      htmls.forEach((html, i) => {
        console.log(`\n=== Mathfield ${i + 1} ===`);
        console.log(html);
      });
      return htmls;
    },

    /**
     * Download first editable, non-empty mathfield as file
     */
    downloadMathfield: (filename?: string) => {
      const mathfields = document.querySelectorAll('math-field');
      for (const mathfield of mathfields) {
        if (mathfield instanceof MathfieldElement && mathfield.contentEditable === 'true') {
          const latex = mathfield.getValue('latex-unstyled');
          if (latex && latex.trim() !== '') {
            downloadMathfieldHTML(mathfield, filename);
            console.log('Mathfield HTML download started!');
            return true;
          }
        }
      }
      console.error('No editable, non-empty mathfield found on page');
      return false;
    },

    /**
     * Download all editable, non-empty mathfields as separate files
     */
    downloadAll: (prefix?: string) => {
      downloadAllMathfields(prefix);
      console.log('All editable, non-empty mathfields download started!');
    },
  };

  console.log(
    '%cMathfield Export Utilities Loaded!',
    'color: #00aa00; font-weight: bold; font-size: 14px;'
  );
  console.log('Available commands (excludes read-only and empty mathfields):');
  console.log('  __mathfieldExports.exportMathfield()     - Export first editable, non-empty mathfield');
  console.log('  __mathfieldExports.exportAllMathfields() - Export all editable, non-empty mathfields');
  console.log('  __mathfieldExports.downloadMathfield()   - Download first editable, non-empty mathfield');
  console.log('  __mathfieldExports.downloadAll()         - Download all editable, non-empty mathfields');
}
