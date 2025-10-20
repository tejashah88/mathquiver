/**
 * Comprehensive tests for all fixtures for parse-mathfield-dom.ts
 *
 * The fixtures are loaded from tests/logic/mathfield-fixtures and test the shadow DOM
 * parser across a wide variety of mathematical expressions.
 */

import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  CharacterIndexItem,
  traverseNode,
} from '@/logic/mathfield-dom-parser';

/**
 * Test helper: Parse ML__base element from any DOM
 */
function parseBaseElement(baseElement: HTMLElement): CharacterIndexItem[] {
  const result: CharacterIndexItem[] = [];
  const currentIndex = { value: 0 };
  traverseNode(baseElement, result, 0, currentIndex);
  return result;
}

/**
 * Extract LaTeX content from the fixture HTML (light DOM slot content)
 */
function extractLatexFromHTML(htmlContent: string): string {
  // The LaTeX is at the end after </template>
  const match = htmlContent.match(/<\/template>([^<]+)<\/math-field>/);
  return match ? match[1] : '';
}

describe('Parse Mathfield DOM', () => {
  const fixturesDir = join(process.cwd(), 'tests', 'logic', 'mathfield-fixtures');
  const fixtureFiles = readdirSync(fixturesDir)
    .filter(file => file.endsWith('.html'))
    .sort((a, b) => {
      // Sort by numeric part of filename
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });

  // Parse all fixtures once before tests
  const fixtures = fixtureFiles.map(filename => {
    const htmlPath = join(fixturesDir, filename);
    const htmlContent = readFileSync(htmlPath, 'utf-8');
    const latex = extractLatexFromHTML(htmlContent);

    const dom = new JSDOM(htmlContent);
    const template = dom.window.document.querySelector('template[shadowrootmode="open"]');

    if (!template) {
      return { filename, latex, baseElement: null, error: 'No shadow root template' };
    }

    const templateContent = (template as HTMLTemplateElement).content;
    const base = templateContent.querySelector('.ML__base');
    if (!base) {
      return { filename, latex, baseElement: null, error: 'No .ML__base element' };
    }

    return { filename, latex, baseElement: base as HTMLElement, error: null };
  });

  // Basic smoke test: all fixtures should parse without errors
  test('should successfully parse all fixtures', () => {
    const validFixtures = fixtures.filter(f => f.baseElement !== null);
    const invalidFixtures = fixtures.filter(f => f.baseElement === null);

    expect(validFixtures.length).toBe(fixtureFiles.length);
    expect(invalidFixtures.length).toBe(0);

    if (invalidFixtures.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Invalid fixtures:', invalidFixtures.map(f => `${f.filename}: ${f.error}`));
    }
  });

  // Test each fixture individually with comprehensive validation
  describe.each(fixtures)('Fixture: $filename', ({ baseElement, error }) => {
    if (!baseElement) {
      test(`should have valid structure`, () => {
        fail(`Failed to parse fixture: ${error}`);
      });
      return;
    }

    test('should extract characters with proper indexing', () => {
      const result = parseBaseElement(baseElement);
      expect(result.length).toBeGreaterThanOrEqual(0);

      // All items should have required properties
      result.forEach((item, idx) => {
        expect(item).toHaveProperty('char');
        expect(item).toHaveProperty('index');
        expect(item).toHaveProperty('element');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('depth');
        expect(item).toHaveProperty('context');
        expect(typeof item.index).toBe('number');

        // Index should match array position
        expect(item.index).toBe(idx);
      });

      // Indices should be sequential starting from 0
      if (result.length > 0) {
        expect(result[0].index).toBe(0);
        expect(result[result.length - 1].index).toBe(result.length - 1);
      }
    });

    test('should classify all character types correctly', () => {
      const result = parseBaseElement(baseElement);

      result.forEach(item => {
        expect(['variable', 'operator', 'number', 'punctuation', 'symbol']).toContain(item.type);
      });

      // If there are characters, check we have proper type coverage
      if (result.length > 0) {
        const types = new Set(result.map(item => item.type));
        expect(types.size).toBeGreaterThan(0);
      }
    });

    test('should identify all contexts correctly', () => {
      const result = parseBaseElement(baseElement);

      result.forEach(item => {
        expect(['base', 'subscript', 'superscript', 'numerator', 'denominator']).toContain(
          item.context
        );
      });

      // Should have at least base context items if there are any characters
      if (result.length > 0) {
        const baseItems = result.filter(item => item.context === 'base');
        expect(baseItems.length).toBeGreaterThan(0);
      }
    });

    test('should maintain valid depth tracking', () => {
      const result = parseBaseElement(baseElement);

      result.forEach(item => {
        expect(item.depth).toBeGreaterThanOrEqual(0);
        expect(item.depth).toBeLessThan(10); // Reasonable upper bound
      });

      // Check depth distribution
      if (result.length > 0) {
        const topLevel = result.filter(item => item.depth === 0);
        expect(topLevel.length).toBeGreaterThan(0);
      }
    });

    test('should have valid element references for styling', () => {
      const result = parseBaseElement(baseElement);

      result.forEach(item => {
        expect(item.element).toBeTruthy();
        expect(item.element.nodeType).toBe(1); // Element node
        expect(item.element.textContent).toContain(item.char);
      });
    });

    test('should have atom IDs where available', () => {
      const result = parseBaseElement(baseElement);

      if (result.length > 0) {
        const itemsWithAtomIds = result.filter(item => item.atomId);

        // Atom IDs should be non-empty strings when present
        itemsWithAtomIds.forEach(item => {
          expect(typeof item.atomId).toBe('string');
          expect(item.atomId!.length).toBeGreaterThan(0);
        });
      }
    });

    test('should handle equals signs correctly', () => {
      const result = parseBaseElement(baseElement);
      const equalsSign = result.find(item => item.char === '=' && item.depth === 0);

      if (equalsSign) {
        expect(equalsSign.type).toBe('operator');
        expect(equalsSign.depth).toBe(0);
        expect(equalsSign.context).toBe('base');
      }
    });

    test('should handle commas correctly', () => {
      const result = parseBaseElement(baseElement);
      const topLevelCommas = result.filter(item => item.char === ',' && item.depth === 0);

      topLevelCommas.forEach(comma => {
        expect(comma.type).toBe('punctuation');
        expect(comma.context).toBe('base');
      });
    });

    test('should handle nested structures correctly', () => {
      const result = parseBaseElement(baseElement);
      const nested = result.filter(item => item.depth > 0);

      nested.forEach(item => {
        // Nested items should have appropriate contexts
        expect(['subscript', 'superscript', 'numerator', 'denominator', 'base']).toContain(
          item.context
        );
      });
    });

    test('should handle subscripts correctly', () => {
      const result = parseBaseElement(baseElement);
      const subscriptItems = result.filter(item => item.context === 'subscript');

      subscriptItems.forEach(item => {
        expect(item.depth).toBeGreaterThan(0);
      });
    });

    test('should handle superscripts correctly', () => {
      const result = parseBaseElement(baseElement);
      const superscriptItems = result.filter(item => item.context === 'superscript');

      superscriptItems.forEach(item => {
        expect(item.depth).toBeGreaterThan(0);
      });
    });

    test('should handle fractions correctly', () => {
      const result = parseBaseElement(baseElement);
      const fractionChars = result.filter(
        item => item.context === 'numerator' || item.context === 'denominator'
      );

      fractionChars.forEach(item => {
        expect(item.depth).toBeGreaterThan(0);
      });
    });
  });

  // Aggregate statistics across all fixtures
  describe('Aggregate Statistics', () => {
    test('should provide coverage across different character types', () => {
      const allTypes = new Set<string>();
      const allContexts = new Set<string>();

      fixtures.forEach(({ baseElement }) => {
        if (!baseElement) return;
        const result = parseBaseElement(baseElement);

        result.forEach(item => {
          allTypes.add(item.type);
          allContexts.add(item.context);
        });
      });

      // Should have encountered all core character types
      expect(allTypes.has('variable')).toBe(true);
      expect(allTypes.has('number')).toBe(true);
      expect(allTypes.has('operator')).toBe(true);
      expect(allTypes.has('punctuation')).toBe(true);
      expect(allTypes.has('symbol')).toBe(true);

      // Should have encountered all major contexts
      expect(allContexts.has('base')).toBe(true);
      expect(allContexts.has('subscript')).toBe(true);
      expect(allContexts.has('superscript')).toBe(true);
      expect(allContexts.has('numerator')).toBe(true);
      expect(allContexts.has('denominator')).toBe(true);
    });

    test('should handle equations with equals signs', () => {
      const fixturesWithEquals = fixtures.filter(({ baseElement }) => {
        if (!baseElement) return false;
        const result = parseBaseElement(baseElement);
        return result.some(item => item.char === '=' && item.depth === 0);
      });

      expect(fixturesWithEquals.length).toBeGreaterThan(0);
      // Verify we have substantial coverage of equations
      expect(fixturesWithEquals.length).toBeGreaterThanOrEqual(10);
    });

    test('should handle equations with commas', () => {
      const fixturesWithCommas = fixtures.filter(({ baseElement }) => {
        if (!baseElement) return false;
        const result = parseBaseElement(baseElement);
        return result.some(item => item.char === ',');
      });

      expect(fixturesWithCommas.length).toBeGreaterThan(0);
      // Verify we have substantial coverage of comma-separated expressions
      expect(fixturesWithCommas.length).toBeGreaterThanOrEqual(10);
    });

    test('should handle nested structures (subscripts, superscripts, fractions)', () => {
      const fixturesWithNesting = fixtures.filter(({ baseElement }) => {
        if (!baseElement) return false;
        const result = parseBaseElement(baseElement);
        return result.some(item => item.depth > 0);
      });

      expect(fixturesWithNesting.length).toBeGreaterThan(0);
      // Verify we have substantial coverage of nested structures
      expect(fixturesWithNesting.length).toBeGreaterThanOrEqual(30);
    });
  });
});
