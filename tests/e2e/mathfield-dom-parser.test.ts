/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * @jest-environment node
 *
 * Shadow DOM parsing tests using Playwright to render LaTeX via MathLive.
 * Tests validate the mathfield-dom-parser against real browser-rendered shadow DOM.
 */

import { JSDOM } from 'jsdom';
import { chromium, Browser, Page } from 'playwright';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { CharacterIndexItem, traverseNode } from '@/logic/mathfield-dom-parser';

// Polyfills for setImmediate & clearImmediate
import 'core-js/stable/set-immediate';
import 'core-js/stable/clear-immediate';

// Set up JSDOM globals for Node.js environment
const jsdom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const { window } = jsdom;

global.Node = window.Node;
global.HTMLElement = window.HTMLElement as any;
global.Element = window.Element as any;

/**
 * Playwright browser fixture for rendering LaTeX via MathLive
 */
class BrowserFixture {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Initialize Playwright browser and load MathLive renderer page
   */
  async init(htmlPath: string): Promise<void> {
    if (this.browser) return;

    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();

    await this.page.goto(
      pathToFileURL(htmlPath).href,
      { waitUntil: 'networkidle', timeout: 15000 }
    );

    await this.page.waitForFunction(
      () => (window as any).mathfieldRendererReady === true,
      { timeout: 10000 }
    );
  }

  /**
   * Generate shadow DOM HTML from LaTeX expression
   */
  async renderLatex(latex: string): Promise<string> {
    if (!this.page)
      throw new Error('Browser not initialized');

    return await this.page.evaluate(
      async (l: string) => await (window as any).setLatexAndExport(l),
      latex
    );
  }

  /**
   * Close Playwright browser and cleanup
   */
  async close(): Promise<void> {
    await this.page?.close();
    await this.browser?.close();

    this.browser = null;
    this.page = null;
  }
}

/**
 * Parse .ML__base element from HTML and extract character index
 */
function parseBase(html: string): CharacterIndexItem[] {
  const dom = new JSDOM(html);
  const base = dom.window.document.querySelector('.ML__base');
  if (!base) throw new Error('No .ML__base element found');

  const result: CharacterIndexItem[] = [];
  traverseNode(base as HTMLElement, result, 0, { value: 0 });
  return result;
}

// Test cases covering various mathematical structures
const TEST_CASES = [
  // Basic expressions with operators
  String.raw`Ax^2+Bx+C`,
  String.raw`(a+b)^2`,
  String.raw`\sin(x)+\cos(y)`,

  // Equations with various operators
  String.raw`x=Ax^2+Bx+C`,
  String.raw`f(x)=x^2+1`,
  String.raw`y(t)=sin(t)+cos(t)`,
  String.raw`y=mx+b`,

  // Conditional expressions (with commas)
  String.raw`Ax^2+Bx+C,x<0`,
  String.raw`x^2,x>=0`,
  String.raw`sin(x),0<=x<=2\pi`,
  String.raw`f(x)=1/x,x\neq 0`,
  String.raw`x(t)=cos(t),0<=t<=2\pi`,

  // Greek letters and special functions
  String.raw`\theta=\sin(\alpha),\alpha>0`,
  String.raw`\alpha+\beta+\gamma`,
  String.raw`\Delta=b^2-4ac`,
  String.raw`\omega=2\pi f`,

  // Fractions
  String.raw`y=\frac{a}{b}`,
  String.raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`,
  String.raw`\frac{x+y}{z-w}`,
  String.raw`\frac{a^2+b^2}{c^2}`,
  String.raw`\frac{1}{x}+\frac{1}{y}=\frac{1}{z}`,

  // Radicals
  String.raw`\sqrt{x^2+y^2}`,
  String.raw`\sqrt[3]{a+b}`,
  String.raw`r=\sqrt{x^2+y^2+z^2}`,

  // Complex exponents and subscripts
  String.raw`2^{2xy}`,
  String.raw`e^{3+x+y}`,
  String.raw`R_{x}^{x}+x`,
  String.raw`x^{y^{z}}`,
  String.raw`x_{i+1}+x_{i-1}`,
  String.raw`a_{ij}b_{jk}`,
  String.raw`\sum_{i=1}^{n}x_i`,

  // Polynomials
  String.raw`ax^2+bx+c=0`,
  String.raw`p(x)=a_nx^n+a_{n-1}x^{n-1}+\cdots+a_1x+a_0`,
  String.raw`3x^4-2x^3+5x^2-x+7`,

  // Trigonometric
  String.raw`a\sin(bx+c)+d`,
  String.raw`\sin^2(x)+\cos^2(x)=1`,

  // Logarithms and exponentials
  String.raw`\log(x)+\ln(y)`,
  String.raw`e^{ax+b}`,
  String.raw`y=Ae^{-kt}`,
  String.raw`Ce^{3x}`,
  String.raw`Ax^2+B\sin\left(x\right)+Ce^{3x}`,

  // Mixed operations
  String.raw`(x+y)^2=x^2+2xy+y^2`,
  String.raw`(a+b)(c+d)`,

  // Matrix/vector notation
  String.raw`v_x^2+v_y^2+v_z^2`,
  String.raw`F_{net}=ma`,

  // Constants with variables
  String.raw`\pi r^2`,
  String.raw`2\pi rh`,

  // Multi-character sub/superscripts
  String.raw`M_{y}=M^{sl}+M^{tg}+M^{sr}`,
  String.raw`\theta_{y}=\theta^{nl}+\theta^{rg}+\theta^{nr}`,

  // Complex engineering equations with nested structures
  String.raw`\theta_{y,3}^{wr} = \frac{W_r^g}{4EI}\left(2l_i x - x^2 - \frac{3}{4}l_i^2\right), x \in \left[\frac{l_i}{2}, l_i\right]`,
  String.raw`\theta_{y,1}^{wr} = \theta_{y,2}^{wr}(0), x \in [-l_o, 0]`,
  String.raw`a_{1,2} = b_{3,4}, x > 0`,
  String.raw`\theta_1=\frac{F_{N}}{EI}\left(\frac{x^2}{2}+l_{o}x-\frac{l_{o}l_{i}}{3}\right),x\in[0,l_i]`,
  String.raw`y_{AB}=\frac{W_{r}^{g}}{48EI}\left(4x^3-3l_{i}^2x\right),x\in[0,\frac{l_i}{2}]`,
];

const HTML_PATH = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'mathfield-renderer.html');


describe('MathField DOM Parser with Playwright', () => {
  const browserFixture = new BrowserFixture();

  beforeAll(async () => await browserFixture.init(HTML_PATH), 30000);
  afterAll(async () => await browserFixture.close());

  describe.each(TEST_CASES)('LaTeX: %s', (latex) => {
    let parsed: CharacterIndexItem[];
    let html: string;

    beforeAll(async () => {
      html = await browserFixture.renderLatex(latex);
      parsed = parseBase(html);
    }, 5000);

    test('generates valid shadow DOM', () => {
      expect(html).toContain('class="ML__base"');
      expect(html).toContain('data-atom-id');
    });

    test('extracts characters with sequential indexing', () => {
      parsed.forEach((item, idx) => {
        expect(item).toHaveProperty('char');
        expect(item).toHaveProperty('index');
        expect(item).toHaveProperty('element');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('depth');
        expect(item).toHaveProperty('context');
        expect(item.index).toBe(idx);
      });

      if (parsed.length > 0) {
        expect(parsed[0].index).toBe(0);
        expect(parsed[parsed.length - 1].index).toBe(parsed.length - 1);
      }
    });

    test('classifies character types correctly', () => {
      const validTypes = ['variable', 'operator', 'number', 'punctuation', 'symbol'];
      parsed.forEach(item => expect(validTypes).toContain(item.type));
    });

    test('assigns valid contexts', () => {
      const validContexts = ['base', 'subscript', 'superscript', 'numerator', 'denominator'];
      parsed.forEach(item => expect(validContexts).toContain(item.context));

      if (parsed.length > 0) {
        const contexts = new Set(parsed.map(item => item.context));
        expect(contexts.size).toBeGreaterThan(0);
      }
    });

    test('tracks depth correctly', () => {
      parsed.forEach(item => {
        expect(item.depth).toBeGreaterThanOrEqual(0);
        expect(item.depth).toBeLessThan(10);
      });

      if (parsed.length > 0) {
        const depths = parsed.map(item => item.depth);
        expect(Math.min(...depths)).toBeGreaterThanOrEqual(0);
      }
    });

    test('provides valid element references', () => {
      parsed.forEach(item => {
        expect(item.element).toBeTruthy();
        expect(item.element.nodeType).toBe(Node.ELEMENT_NODE);
        expect(item.element.textContent).toContain(item.char);
      });
    });

    test('includes atom IDs where available', () => {
      const withIds = parsed.filter(item => item.atomId);
      withIds.forEach(item => {
        expect(typeof item.atomId).toBe('string');
        expect(item.atomId!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Aggregated Coverage', () => {
    const allParsed: CharacterIndexItem[] = [];

    beforeAll(async () => {
      for (const latex of TEST_CASES) {
        try {
          const html = await browserFixture.renderLatex(latex);
          allParsed.push(...parseBase(html));
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to process "${latex}":`, error);
        }
      }
    }, 60000);

    test('covers all character types', () => {
      const types = new Set(allParsed.map(item => item.type));
      ['variable', 'number', 'operator', 'punctuation', 'symbol'].forEach(type =>
        expect(types.has(type)).toBe(true)
      );
    });

    test('covers all contexts', () => {
      const contexts = new Set(allParsed.map(item => item.context));
      ['base', 'subscript', 'superscript', 'numerator', 'denominator'].forEach(ctx =>
        expect(contexts.has(ctx)).toBe(true)
      );
    });
  });
});
