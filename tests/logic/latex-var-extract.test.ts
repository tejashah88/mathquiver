import { extractLatexVariables } from '@/logic/latex-var-extract';

describe('Extract Variables from Latex Expression', () => {
  const testCases: [string, string[]][] = [
    // Basic operations
    [String.raw`A+BC`, ['A', 'B', 'C']],
    [String.raw`Ax^2`, ['A', 'x']],
    [String.raw`B\sin\left(x\right)`, ['B', 'x']],
    [String.raw`Ce^{3x}`, ['C', 'x']],
    [String.raw`Dw^{2x}`, ['D', 'w', 'x']],
    [String.raw`Ax^2+B\sin\left(x\right)+Ce^{3x}`, ['A', 'B', 'C', 'x']],

    // Exponents and subscripts
    [String.raw`2^{2xy}`, ['x', 'y']],
    [String.raw`2^{2xy+a}`, ['x', 'y', 'a']],
    [String.raw`e^{3+x+y}`, ['x', 'y']],
    [String.raw`j^{3+x+y}`, ['j', 'x', 'y']],
    [String.raw`e^{3x+ny+m}`, ['m', 'n', 'x', 'y']],
    [String.raw`R_{x}^{x}+x`, ['R_{x}^{x}', 'x']],
    [String.raw`x^{y^{z}}`, ['x^{y^{z}}']],
    [String.raw`(a_{m}^{n})^{(2^{x})}`, ['a_{m}^{n}', 'x']],

    // Quadratic formula & roots
    [String.raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`, ['x', 'b', 'a', 'c']],
    [String.raw`ax^2+bx+c=0`, ['a', 'x', 'b', 'c']],
    [String.raw`x_{1,2}=\frac{-b\pm\sqrt{\Delta}}{2a}`, ['x_{1,2}', 'b', '\\Delta', 'a']],

    // Polynomials
    [String.raw`p(x)=a_nx^n+a_{n-1}x^{n-1}+\cdots+a_1x+a_0`, ['p', 'x', 'x^{n}', 'a_{n}', 'a_{n-1}', 'a_1', 'a_0', 'n']],
    [String.raw`3x^4-2x^3+5x^2-x+7`, ['x']],
    [String.raw`y=mx+b`, ['y', 'm', 'x', 'b']],

    // Fractions and rational expressions
    [String.raw`\frac{x+y}{z-w}`, ['x', 'y', 'z', 'w']],
    [String.raw`\frac{a^2+b^2}{c^2}`, ['a', 'b', 'c']],
    [String.raw`\frac{1}{x}+\frac{1}{y}=\frac{1}{z}`, ['x', 'y', 'z']],

    // Radicals and roots
    [String.raw`\sqrt{x^2+y^2}`, ['x', 'y']],
    [String.raw`\sqrt[3]{a+b}`, ['a', 'b']],
    [String.raw`r=\sqrt{x^2+y^2+z^2}`, ['r', 'x', 'y', 'z']],
    [String.raw`\sqrt{a^2+\sqrt{b^2+c^2}}`, ['a', 'b', 'c']],

    // Trigonometric functions
    [String.raw`\sin(x)+\cos(y)`, ['x', 'y']],
    [String.raw`a\sin(bx+c)+d`, ['a', 'b', 'x', 'c', 'd']],
    [String.raw`\tan(\theta)=\frac{\sin(\theta)}{\cos(\theta)}`, ['\\theta']],
    [String.raw`\sin^2(x)+\cos^2(x)=1`, ['x']],

    // Logarithms and exponentials
    [String.raw`\log(x)+\ln(y)`, ['x', 'y']],
    [String.raw`e^{ax+b}`, ['a', 'x', 'b']],
    [String.raw`\log_a(b)`, ['a', 'b']],
    [String.raw`y=Ae^{-kt}`, ['y', 'A', 'k', 't']],

    // Greek letters (excluding pi)
    [String.raw`\alpha+\beta+\gamma`, ['\\alpha', '\\beta', '\\gamma']],
    [String.raw`\Delta=b^2-4ac`, ['\\Delta', 'b', 'a', 'c']],
    [String.raw`\omega=2\pi f`, ['\\omega', 'f']],
    [String.raw`\sigma^2=\frac{1}{n}\sum(x_i-\mu)^2`, ['\\sigma', 'n', 'x_{i}', '\\mu']],

    // Multiple towering exponents
    [String.raw`a^{b^{c^{d}}}`, ['a^{b^{c^{d}}}']],
    [String.raw`2^{x^{2}}+3^{y^{2}}`, ['x', 'y']],
    [String.raw`x^{a^{b}}y^{c^{d}}`, ['x^{a^{b}}', 'y^{c^{d}}']],

    // Complex subscripts and superscripts
    [String.raw`x_{i+1}+x_{i-1}`, ['x_{i+1}', 'x_{i-1}']],
    [String.raw`a_{ij}b_{jk}`, ['a_{ij}', 'b_{jk}']],
    [String.raw`\sum_{i=1}^{n}x_i`, ['n', 'x_{i}']],
    [String.raw`\int_{a}^{b}f(x)dx`, ['a', 'b', 'f', 'x', 'd']],

    // Mixed operations
    [String.raw`(x+y)^2=x^2+2xy+y^2`, ['x', 'y']],
    [String.raw`(a+b)(c+d)`, ['a', 'b', 'c', 'd']],
    [String.raw`\frac{x^2-y^2}{x-y}=x+y`, ['x', 'y']],
    [String.raw`|x-y|+|z-w|`, ['x', 'y', 'z', 'w']],

    // Absolute values and norms
    [String.raw`|a+b|`, ['a', 'b']],
    [String.raw`||v||=\sqrt{x^2+y^2+z^2}`, ['v', 'x', 'y', 'z']],

    // Matrix/vector notation
    [String.raw`v_x^2+v_y^2+v_z^2`, ['v_{x}', 'v_{y}', 'v_{z}']],
    [String.raw`F_{net}=ma`, ['F_{net}', 'm', 'a']],

    // Edge cases
    [String.raw`xyz`, ['x', 'y', 'z']],
    [String.raw`a_1a_2a_3`, ['a_1', 'a_2', 'a_3']],
    [String.raw`x^{2y}z^{3w}`, ['x', 'y', 'z', 'w']],
    [String.raw`e^{e^{x}}`, ['x']],
    [String.raw`e^{e^{x^y}}`, ['x^{y}']],
    [String.raw`e^{e^{x_a}}`, ['x_{a}']],
    [String.raw`x^{e^{y_a}}`, ['x', 'y_{a}']],

    // Constants with variables (pi should be excluded)
    [String.raw`\pi r^2`, ['r']],
    [String.raw`2\pi rh`, ['r', 'h']],

    // Special mathematical symbols
    [String.raw`\varepsilon>0`, ['\\varepsilon']],
    [String.raw`\vartheta+\varphi`, ['\\vartheta', '\\varphi']],

    // Engineering equations
    [String.raw`\theta_1=\frac{F_{N}}{EI}\left(\frac{x^2}{2}+l_{o}x-\frac{l_{o}l_{i}}{3}\right)`, ['\\theta_1', 'F_{N}', 'E', 'I', 'x', 'l_{o}', 'l_{i}']],
    [String.raw`y_1=\frac{F_{N}}{EI}\left(\frac{x^3}{6}+\frac{l_{o}x^2}{2}-\frac{l_{o}l_{i}}{3}x\right)`, ['y_1', 'F_{N}', 'E', 'I', 'x', 'l_{o}', 'l_{i}']],
    [String.raw`\theta_2=\frac{F_{N}}{EI}\left(-\frac{l_{o}x^2}{2l_{i}}+l_{o}x-\frac{l_{o}l_{i}}{3}\right)`, ['\\theta_2', 'F_{N}', 'E', 'I', 'x', 'l_{o}', 'l_{i}']],
    [String.raw`y_2=\frac{F_{N}}{EI}\left(-\frac{l_{o}x^3}{6l_{i}}+\frac{l_{o}x^2}{2}-\frac{l_{o}l_{i}}{6}x\right)`, ['y_2', 'F_{N}', 'E', 'I', 'x', 'l_{o}', 'l_{i}']],

    [String.raw`y_{AB}=\frac{W_{r}^{g}}{48EI}\left(4x^3-3l_{i}^2x\right)`, ['y_{AB}', 'W_{r}^{g}', 'E', 'I', 'x', 'l_{i}']],
    [String.raw`\theta_{AB}=\frac{W_{r}^{g}}{48EI}\left(12x^2-3l_{i}^2\right)`, ['\\theta_{AB}', 'W_{r}^{g}', 'E', 'I', 'x', 'l_{i}']],
    [String.raw`y_{BC}=\frac{W_{r}^{g}}{12EI}\left(-x^3+3l_{i}x^2-\frac94l_{i}^2x+\frac{l_{i}^3}{4}\right)`, ['y_{BC}', 'W_{r}^{g}', 'E', 'I', 'x', 'l_{i}']],
    [String.raw`\theta_{BC}=\frac{W_{r}^{g}}{12EI}\left(-3x^2+6l_{i}x-\frac94l_{i}^2\right)`, ['\\theta_{BC}', 'W_{r}^{g}', 'E', 'I', 'x', 'l_{i}']],

    [String.raw`y_{AB}=\frac{F_{n}^{r}l_{o}}{6EIl_{i}}\left(-l_{i}^2x+x^3\right)`, ['y_{AB}', 'F_{n}^{r}', 'E', 'I', 'x', 'l_{i}', 'l_{o}']],
    [String.raw`\theta_{AB}=\frac{F_{n}^{r}l_{o}}{6EIl_{i}}\left(-l_{i}^2+3x^2\right)`, ['\\theta_{AB}', 'F_{n}^{r}', 'E', 'I', 'x', 'l_{i}', 'l_{o}']],
    [String.raw`y_{BC}=\frac{F_{n}^{r}}{6EI}\left(-x^3+3\left(l_{i}+l_{o}\right)x^2-\left(4l_{i}^2+3l_{o}l_{i}\right)x+2l_{i}^2\right)`, ['y_{BC}', 'F_{n}^{r}', 'E', 'I', 'x', 'l_{i}', 'l_{o}']],
    [String.raw`\theta_{BC}=\frac{F_{n}^{r}}{6EI}\left(-3x^2+6\left(l_{i}+l_{o}\right)x-\left(4l_{i}^2+3l_{o}l_{i}\right)\right)`, ['\\theta_{BC}', 'F_{n}^{r}', 'E', 'I', 'x', 'l_{i}', 'l_{o}']],

    // Multi-character superscripts (should be treated as single variables)
    [String.raw`M_{y}=M^{sl}+M^{tg}+M^{sr}`, ['M_{y}', 'M^{sl}', 'M^{tg}', 'M^{sr}']],
    [String.raw`\theta_{y}=\theta^{nl}+\theta^{rg}+\theta^{nr}`, ['\\theta_{y}', '\\theta^{nl}', '\\theta^{rg}', '\\theta^{nr}']],
    [String.raw`\theta_{z}=\theta^{sl}+\theta^{tg}+\theta^{sr}`, ['\\theta_{z}', '\\theta^{sl}', '\\theta^{tg}', '\\theta^{sr}']],
    [String.raw`y_{tot}=y^{nl}+y^{rg}+y^{nr}`, ['y_{tot}', 'y^{nl}', 'y^{rg}', 'y^{nr}']],
    [String.raw`z_{tot}=z^{sl}+z^{tg}+z^{sr}`, ['z_{tot}', 'z^{sl}', 'z^{tg}', 'z^{sr}']],

    // Additional edge cases for multi-character modifiers
    [String.raw`x^{ab}`, ['x^{ab}']],
    [String.raw`A_{test}^{val}`, ['A_{test}^{val}']],
    [String.raw`M^{a}+N^{bc}`, ['M^{a}', 'N^{bc}']],
    [String.raw`P_{sub}^{sup}+Q_{xy}^{ab}`, ['P_{sub}^{sup}', 'Q_{xy}^{ab}']],
  ];

  test.each(testCases)('valid: %s => %s', (input, expected) => {
    const result = extractLatexVariables(input);
    expect(result.toSorted()).toIncludeSameMembers(expected.toSorted());
  });
});

describe('Empty Modifier Edge Cases', () => {
  // Edge case: Empty subscripts and superscripts should be ignored
  // This prevents false positives like "s_{}" appearing when typing "tests_{}"
  const emptyModifierCases: [string, string[]][] = [
    // Empty subscripts (note: 'e' and 'i' are filtered as mathematical constants)
    [String.raw`s_{}`, ['s']],
    [String.raw`test_{}`, ['s', 't']],  // 'e' is filtered as constant
    [String.raw`tests_{}`, ['s', 't']], // 'e' is filtered as constant
    [String.raw`x_{}`, ['x']],
    [String.raw`ab_{}`, ['a', 'b']],

    // Empty superscripts
    [String.raw`s^{}`, ['s']],
    [String.raw`test^{}`, ['s', 't']],  // 'e' is filtered as constant
    [String.raw`tests^{}`, ['s', 't']], // 'e' is filtered as constant
    [String.raw`x^{}`, ['x']],
    [String.raw`ab^{}`, ['a', 'b']],

    // Both empty modifiers
    [String.raw`s_{}^{}`, ['s']],
    [String.raw`x_{}^{}`, ['x']],
    [String.raw`test_{}^{}`, ['s', 't']], // 'e' is filtered as constant

    // Empty modifier followed by normal variable
    [String.raw`tests_{}+x`, ['s', 't', 'x']], // 'e' is filtered as constant
    [String.raw`tests^{}+x`, ['s', 't', 'x']], // 'e' is filtered as constant

    // Normal modifiers should still work (regression tests)
    [String.raw`x_{i}`, ['x_{i}']],  // Note: 'i' would be filtered if not in subscript
    [String.raw`x^{2}`, ['x']],
    [String.raw`x^{a}`, ['x^{a}']],
    [String.raw`s_{1}`, ['s_1']],
    [String.raw`tests_{1}`, ['s', 's_1', 't']], // 'e' is filtered as constant

    // Mixed: empty and non-empty modifiers
    [String.raw`x_{}+y_{i}`, ['x', 'y_{i}']],
    [String.raw`a^{}+b^{c}`, ['a', 'b^{c}']],
  ];

  test.each(emptyModifierCases)('empty modifiers: %s => %s', (input, expected) => {
    const result = extractLatexVariables(input);
    expect(result.toSorted()).toIncludeSameMembers(expected.toSorted());
  });
});

describe('Decorator Macros', () => {
  // Test cases for accent decorators and font decorators
  // These macros modify the appearance of variables and should be kept as part of the variable identity
  const decoratorCases: [string, string[]][] = [
    // ========== Basic decorator macros ==========
    // Single character with various decorators
    [String.raw`\overline{x}`, [String.raw`\overline{x}`]],
    [String.raw`\bar{x}`, [String.raw`\bar{x}`]],
    [String.raw`\hat{x}`, [String.raw`\hat{x}`]],
    [String.raw`\tilde{x}`, [String.raw`\tilde{x}`]],
    [String.raw`\vec{v}`, [String.raw`\vec{v}`]],
    [String.raw`\dot{x}`, [String.raw`\dot{x}`]],
    [String.raw`\ddot{x}`, [String.raw`\ddot{x}`]],
    [String.raw`\underline{x}`, [String.raw`\underline{x}`]],

    // ========== Multi-character content ==========
    // Multi-character content should be kept together
    [String.raw`\overline{abc}`, [String.raw`\overline{abc}`]],
    [String.raw`\bar{xy}`, [String.raw`\bar{xy}`]],
    [String.raw`\hat{AB}`, [String.raw`\hat{AB}`]],

    // ========== Content with operators ==========
    // Content with operators should be kept as a single unit (not split)
    [String.raw`\overline{x+y}`, [String.raw`\overline{x+y}`]],
    [String.raw`\bar{a-b}`, [String.raw`\bar{a-b}`]],
    [String.raw`\tilde{m\cdot n}`, [String.raw`\tilde{m\cdot n}`]],

    // ========== Decorators with subscripts ==========
    // Decorated variables with subscripts
    [String.raw`\overline{x}_i`, [String.raw`\overline{x}_{i}`]],
    [String.raw`\bar{x}_{ij}`, [String.raw`\bar{x}_{ij}`]],
    [String.raw`\vec{v}_1`, [String.raw`\vec{v}_1`]],
    [String.raw`\hat{u}_{n+1}`, [String.raw`\hat{u}_{n+1}`]],

    // ========== Decorators with numeric superscripts ==========
    // Numeric superscripts should be ignored (not part of variable name)
    [String.raw`\overline{x}^2`, [String.raw`\overline{x}`]],
    [String.raw`\bar{y}^3`, [String.raw`\bar{y}`]],
    [String.raw`\vec{v}^{10}`, [String.raw`\vec{v}`]],

    // ========== Decorators with alphabetic superscripts ==========
    // Pure alphabetic superscripts should be kept
    [String.raw`\overline{x}^{sl}`, [String.raw`\overline{x}^{sl}`]],
    [String.raw`\bar{M}^{a}`, [String.raw`\bar{M}^{a}`]],
    [String.raw`\vec{v}^{T}`, [String.raw`\vec{v}^{T}`]],
    [String.raw`\hat{x}^{yz}`, [String.raw`\hat{x}^{yz}`]],

    // ========== Decorators with both subscripts and superscripts ==========
    // Both modifiers present
    [String.raw`\overline{x}_{i}^{sl}`, [String.raw`\overline{x}_{i}^{sl}`]],
    [String.raw`\bar{M}_{n}^{a}`, [String.raw`\bar{M}_{n}^{a}`]],
    [String.raw`\vec{v}_{x}^{T}`, [String.raw`\vec{v}_{x}^{T}`]],
    [String.raw`\hat{F}_{net}^{total}`, [String.raw`\hat{F}_{net}^{total}`]],

    // ========== Multiple decorated variables in one expression ==========
    [String.raw`\vec{v} + \hat{u} + \bar{w}`, [String.raw`\bar{w}`, String.raw`\hat{u}`, String.raw`\vec{v}`]],
    [String.raw`\overline{x} + \overline{y}`, [String.raw`\overline{x}`, String.raw`\overline{y}`]],
    [String.raw`\dot{x} + \ddot{y} + z`, [String.raw`\ddot{y}`, String.raw`\dot{x}`, 'z']],

    // ========== Font decorators ==========
    // Font-changing macros
    [String.raw`\mathbb{R}`, [String.raw`\mathbb{R}`]],
    [String.raw`\mathcal{F}`, [String.raw`\mathcal{F}`]],
    [String.raw`\mathbf{v}`, [String.raw`\mathbf{v}`]],
    [String.raw`\mathfrak{g}`, [String.raw`\mathfrak{g}`]],
    [String.raw`\mathrm{d}x`, [String.raw`\mathrm{d}`, 'x']],

    // Font decorators with modifiers
    [String.raw`\mathbb{R}^n`, [String.raw`\mathbb{R}^{n}`]],  // Single letter alphabetic superscript is kept
    [String.raw`\mathcal{F}_{x}`, [String.raw`\mathcal{F}_{x}`]],
    [String.raw`\mathbf{v}_i`, [String.raw`\mathbf{v}_{i}`]],

    // ========== Mixed: decorators and regular variables ==========
    [String.raw`\mathbb{R} + \mathcal{F} + x`, [String.raw`\mathbb{R}`, String.raw`\mathcal{F}`, 'x']],
    [String.raw`x + \overline{x} + y`, ['x', String.raw`\overline{x}`, 'y']],

    // ========== Decorators in complex expressions ==========
    // Decorated variables in fractions
    [String.raw`\frac{\overline{x}+\bar{y}}{z}`, [String.raw`\bar{y}`, String.raw`\overline{x}`, 'z']],
    [String.raw`\frac{\vec{a}}{\vec{b}}`, [String.raw`\vec{a}`, String.raw`\vec{b}`]],

    // Decorated variables with Greek letters
    [String.raw`\vec{\alpha} + \beta`, [String.raw`\beta`, String.raw`\vec{\alpha}`]],
    [String.raw`\bar{\theta}_1 + \theta_2`, [String.raw`\bar{\theta}_1`, String.raw`\theta_2`]],
    [String.raw`\hat{\phi}`, [String.raw`\hat{\phi}`]],

    // Decorated variables in equations
    [String.raw`\overline{z} = a + bi`, ['a', 'b', String.raw`\overline{z}`]],
    [String.raw`\dot{x} = v`, [String.raw`\dot{x}`, 'v']],
    [String.raw`\ddot{x} = a`, ['a', String.raw`\ddot{x}`]],

    // ========== Wide decorators ==========
    [String.raw`\widehat{xyz}`, [String.raw`\widehat{xyz}`]],
    [String.raw`\widetilde{abc}`, [String.raw`\widetilde{abc}`]],

    // ========== Arrow decorators ==========
    [String.raw`\overrightarrow{AB}`, [String.raw`\overrightarrow{AB}`]],
    [String.raw`\overleftarrow{BA}`, [String.raw`\overleftarrow{BA}`]],
    [String.raw`\overleftrightarrow{CD}`, [String.raw`\overleftrightarrow{CD}`]],

    // ========== Less common decorators ==========
    [String.raw`\mathring{A}`, [String.raw`\mathring{A}`]],
    [String.raw`\check{C}`, [String.raw`\check{C}`]],
    [String.raw`\breve{x}`, [String.raw`\breve{x}`]],
    [String.raw`\acute{e}`, [String.raw`\acute{e}`]],
    [String.raw`\grave{a}`, [String.raw`\grave{a}`]],

    // ========== Decorator with complex subscript content ==========
    // This tests that decorator + subscript combo works with operators in subscript
    [String.raw`\bar{x}_{i+1} + \bar{x}_{i-1}`, [String.raw`\bar{x}_{i+1}`, String.raw`\bar{x}_{i-1}`]],

    // ========== Multiple decorator types in engineering notation ==========
    [String.raw`M_y = \bar{M} + \hat{M} + \tilde{M}`, ['M_{y}', String.raw`\bar{M}`, String.raw`\hat{M}`, String.raw`\tilde{M}`]],
  ];

  test.each(decoratorCases)('decorators: %s => %s', (input, expected) => {
    const result = extractLatexVariables(input);
    expect(result.toSorted()).toIncludeSameMembers(expected.toSorted());
  });
});

describe('Text Macros (Excluded from Variables)', () => {
  // Test cases for \text and related macros that should be completely ignored
  // These macros are for decorative/explanatory text and should not contribute variables
  const textMacroCases: [string, string[]][] = [
    // ========== Basic text macros ==========
    // Single character in text should not be extracted
    [String.raw`\text{x}`, []],
    [String.raw`\text{a}`, []],
    [String.raw`\text{T}`, []],

    // Multiple characters in text
    [String.raw`\text{hello}`, []],
    [String.raw`\text{test}`, []],
    [String.raw`\text{ABC}`, []],

    // ========== Text macros with common variable names ==========
    // Even if the text contains typical variable names, they should be ignored
    [String.raw`\text{x}`, []],
    [String.raw`\text{xy}`, []],
    [String.raw`\text{abc}`, []],
    [String.raw`\text{n}`, []],

    // ========== Mixed: text macros and real variables ==========
    // Real variables outside text should still be extracted
    [String.raw`x + \text{hello}`, ['x']],
    [String.raw`\text{velocity} = v`, ['v']],
    [String.raw`a + \text{plus} + b`, ['a', 'b']],
    [String.raw`x^2 + \text{squared}`, ['x']],
    [String.raw`\text{Let } x = 5`, ['x']],

    // ========== Text in equations ==========
    [String.raw`\text{if } x > 0`, ['x']],
    [String.raw`y = mx + b \text{ where m is slope}`, ['b', 'm', 'x', 'y']],
    [String.raw`F = ma \text{ (Newton's law)}`, ['F', 'a', 'm']],

    // ========== Text with subscripts/superscripts ==========
    // Subscripts/superscripts on text macros should also be ignored
    [String.raw`\text{max}_i`, []],
    [String.raw`\text{min}^2`, []],
    [String.raw`\text{label}_{test}`, []],
    [String.raw`x + \text{suffix}_1`, ['x']],

    // ========== Text with spaces and punctuation ==========
    [String.raw`\text{hello world}`, []],
    [String.raw`\text{x, y, z}`, []],
    [String.raw`\text{(test)}`, []],
    [String.raw`a = \text{value: } b`, ['a', 'b']],

    // ========== Different text macro variants ==========
    // All text macro variants should behave the same
    [String.raw`\textrm{abc}`, []],
    [String.raw`\textbf{xyz}`, []],
    [String.raw`\textit{test}`, []],
    [String.raw`\textsf{hello}`, []],
    [String.raw`\texttt{code}`, []],
    [String.raw`\textsl{slant}`, []],
    [String.raw`\textsc{small caps}`, []],

    // ========== Multiple text macros ==========
    [String.raw`\text{a} + \text{b}`, []],
    [String.raw`x + \text{plus} + y + \text{equals} + z`, ['x', 'y', 'z']],
    [String.raw`\text{start} \text{middle} \text{end}`, []],

    // ========== Text in fractions ==========
    [String.raw`\frac{\text{rise}}{\text{run}}`, []],
    [String.raw`\frac{x}{\text{total}}`, ['x']],
    [String.raw`\frac{\text{numerator}}{y}`, ['y']],
    [String.raw`\frac{a+b}{\text{sum}}`, ['a', 'b']],

    // ========== Text with Greek letters (as text, not as variables) ==========
    [String.raw`\text{alpha}`, []],
    [String.raw`\text{theta}`, []],
    [String.raw`\text{beta} + \beta`, ['\\beta']],  // Real Greek variable should be extracted

    // ========== Complex expressions with text ==========
    [String.raw`E = mc^2 \text{ (Einstein)}`, ['E', 'c', 'm']],
    [String.raw`\sum_{i=1}^{n} x_i \text{ for all i}`, ['n', 'x_{i}']],
    [String.raw`\int_{a}^{b} f(x)dx \text{ where } a < b`, ['a', 'b', 'd', 'f', 'x']],

    // ========== Edge case: Empty text ==========
    [String.raw`\text{}`, []],
    [String.raw`x + \text{} + y`, ['x', 'y']],

    // ========== Nested structures with text ==========
    [String.raw`x^{\text{max}}`, ['x']],
    [String.raw`y_{\text{initial}}`, ['y']],
    [String.raw`z^{a}_{\text{label}}`, ['z^{a}']],

    // ========== Text doesn't interfere with decorator macros ==========
    [String.raw`\overline{x} + \text{mean}`, [String.raw`\overline{x}`]],
    [String.raw`\vec{v} \text{ velocity}`, [String.raw`\vec{v}`]],
    [String.raw`\text{field} + \mathbb{R}`, [String.raw`\mathbb{R}`]],
  ];

  test.each(textMacroCases)('text macros: %s => %s', (input, expected) => {
    const result = extractLatexVariables(input);
    expect(result.toSorted()).toIncludeSameMembers(expected.toSorted());
  });
});

describe('Operator Name Macros (\\operatorname)', () => {
  // Test cases for \operatorname which is used for multi-letter operator names
  // When used in subscripts/superscripts, the full \operatorname{...} should be preserved
  const operatornameCases: [string, string[]][] = [
    // ========== Basic subscripts ==========
    // \operatorname in subscript should be fully preserved
    [String.raw`F_{\operatorname{cm}}`, [String.raw`F_{\operatorname{cm}}`]],
    [String.raw`G_{\operatorname{max}}`, [String.raw`G_{\operatorname{max}}`]],
    [String.raw`T_{\operatorname{initial}}`, [String.raw`T_{\operatorname{initial}}`]],

    // ========== Subscripts with expression ==========
    // Other variables in expression should also be extracted
    [String.raw`F_{\operatorname{cm}} + 1`, [String.raw`F_{\operatorname{cm}}`]],
    [String.raw`x + G_{\operatorname{net}}`, ['x', String.raw`G_{\operatorname{net}}`]],
    [
      String.raw`F_{\operatorname{cm}} + G_{\operatorname{max}}`,
      [String.raw`F_{\operatorname{cm}}`, String.raw`G_{\operatorname{max}}`],
    ],

    // ========== Superscripts (pure alphabetic) ==========
    // Pure alphabetic superscript should be kept
    [String.raw`M^{\operatorname{sl}}`, [String.raw`M^{\operatorname{sl}}`]],
    [String.raw`N^{\operatorname{max}}`, [String.raw`N^{\operatorname{max}}`]],

    // ========== Superscripts (numeric) ==========
    // Numeric superscripts are ignored
    [String.raw`x^{\operatorname{2}}`, ['x']],

    // ========== Both subscript and superscript ==========
    // Both modifiers with operatorname
    [
      String.raw`F_{\operatorname{net}}^{\operatorname{total}}`,
      [String.raw`F_{\operatorname{net}}^{\operatorname{total}}`],
    ],
    [
      String.raw`M_{\operatorname{y}}^{\operatorname{sl}}`,
      [String.raw`M_{\operatorname{y}}^{\operatorname{sl}}`],
    ],

    // Subscript with operatorname, numeric superscript
    [String.raw`F_{\operatorname{cm}}^2`, [String.raw`F_{\operatorname{cm}}`]],

    // Subscript with operatorname, alphabetic superscript
    [
      String.raw`F_{\operatorname{cm}}^{a}`,
      [String.raw`F_{\operatorname{cm}}^{a}`],
    ],

    // ========== Greek letter base ==========
    [
      String.raw`\theta_{\operatorname{max}}`,
      [String.raw`\theta_{\operatorname{max}}`],
    ],
    [
      String.raw`\sigma_{\operatorname{yield}}`,
      [String.raw`\sigma_{\operatorname{yield}}`],
    ],

    // ========== Complex subscript content ==========
    // Subscripts with operators are never split
    [
      String.raw`x_{i+\operatorname{offset}}`,
      [String.raw`x_{i+\operatorname{offset}}`],
    ],
    [
      String.raw`y_{\operatorname{start}-1}`,
      [String.raw`y_{\operatorname{start}-1}`],
    ],

    // ========== Multiple operatorname in expression ==========
    [
      String.raw`F_{\operatorname{x}} + F_{\operatorname{y}} + F_{\operatorname{z}}`,
      [
        String.raw`F_{\operatorname{x}}`,
        String.raw`F_{\operatorname{y}}`,
        String.raw`F_{\operatorname{z}}`,
      ],
    ],

    // ========== Mixed with regular subscripts ==========
    [
      String.raw`x_i + F_{\operatorname{cm}}`,
      ['x_{i}', String.raw`F_{\operatorname{cm}}`],
    ],
    [
      String.raw`a_{n} + b_{\operatorname{max}}`,
      ['a_{n}', String.raw`b_{\operatorname{max}}`],
    ],

    // ========== In equations ==========
    [
      String.raw`F_{\operatorname{net}} = ma`,
      ['a', String.raw`F_{\operatorname{net}}`, 'm'],
    ],
    [
      String.raw`\sigma_{\operatorname{yield}} = \frac{F}{A}`,
      ['A', 'F', String.raw`\sigma_{\operatorname{yield}}`],
    ],

    // ========== Standalone operatorname (in function context) ==========
    // Variables outside operatorname should still be extracted
    [String.raw`\operatorname{sin}(x)`, ['x']],
    [String.raw`\operatorname{max}(a, b)`, ['a', 'b']],
    [String.raw`y = \operatorname{cos}(x)`, ['x', 'y']],

    // ========== With decorators ==========
    [
      String.raw`\vec{F}_{\operatorname{net}}`,
      [String.raw`\vec{F}_{\operatorname{net}}`],
    ],
    [
      String.raw`\bar{M}_{\operatorname{avg}}`,
      [String.raw`\bar{M}_{\operatorname{avg}}`],
    ],
  ];

  test.each(operatornameCases)(
    'operatorname: %s => %s',
    (input, expected) => {
      const result = extractLatexVariables(input);
      expect(result.toSorted()).toIncludeSameMembers(expected.toSorted());
    },
  );
});
