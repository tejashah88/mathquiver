import { extractLatexVariables } from '@/logic/latex-var-extract';

describe('Extract Variables from Latex Expression', () => {
  const testCases = [
    // Basic operations
    String.raw`A+BC`,
    String.raw`Ax^2`,
    String.raw`B\sin\left(x\right)`,
    String.raw`Ce^{3x}`,
    String.raw`Dw^{2x}`,
    String.raw`Ax^2+B\sin\left(x\right)+Ce^{3x}`,

    // Exponents and subscripts
    String.raw`2^{2xy}`,
    String.raw`2^{2xy+a}`,
    String.raw`e^{3+x+y}`,
    String.raw`j^{3+x+y}`,
    String.raw`e^{3x+ny+m}`,
    String.raw`R_{x}^{x}+x`,
    String.raw`x^{y^{z}}`,
    String.raw`(a_{m}^{n})^{(2^{x})}`,

    // Quadratic formula & roots
    String.raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`,
    String.raw`ax^2+bx+c=0`,
    String.raw`x_{1,2}=\frac{-b\pm\sqrt{\Delta}}{2a}`,

    // Polynomials
    String.raw`p(x)=a_nx^n+a_{n-1}x^{n-1}+\cdots+a_1x+a_0`,
    String.raw`3x^4-2x^3+5x^2-x+7`,
    String.raw`y=mx+b`,

    // Fractions and rational expressions
    String.raw`\frac{x+y}{z-w}`,
    String.raw`\frac{a^2+b^2}{c^2}`,
    String.raw`\frac{1}{x}+\frac{1}{y}=\frac{1}{z}`,

    // Radicals and roots
    String.raw`\sqrt{x^2+y^2}`,
    String.raw`\sqrt[3]{a+b}`,
    String.raw`r=\sqrt{x^2+y^2+z^2}`,
    String.raw`\sqrt{a^2+\sqrt{b^2+c^2}}`,

    // Trigonometric functions
    String.raw`\sin(x)+\cos(y)`,
    String.raw`a\sin(bx+c)+d`,
    String.raw`\tan(\theta)=\frac{\sin(\theta)}{\cos(\theta)}`,
    String.raw`\sin^2(x)+\cos^2(x)=1`,

    // Logarithms and exponentials
    String.raw`\log(x)+\ln(y)`,
    String.raw`e^{ax+b}`,
    String.raw`\log_a(b)`,
    String.raw`y=Ae^{-kt}`,

    // Greek letters
    String.raw`\alpha+\beta+\gamma`,
    String.raw`\Delta=b^2-4ac`,
    String.raw`\omega=2\pi f`,
    String.raw`\sigma^2=\frac{1}{n}\sum(x_i-\mu)^2`,

    // Multiple towering exponents
    String.raw`a^{b^{c^{d}}}`,
    String.raw`2^{x^{2}}+3^{y^{2}}`,
    String.raw`x^{a^{b}}y^{c^{d}}`,

    // Complex subscripts and superscripts
    String.raw`x_{i+1}+x_{i-1}`,
    String.raw`a_{ij}b_{jk}`,
    String.raw`\sum_{i=1}^{n}x_i`,
    String.raw`\int_{a}^{b}f(x)dx`,

    // Mixed operations
    String.raw`(x+y)^2=x^2+2xy+y^2`,
    String.raw`(a+b)(c+d)`,
    String.raw`\frac{x^2-y^2}{x-y}=x+y`,
    String.raw`|x-y|+|z-w|`,

    // Absolute values and norms
    String.raw`|a+b|`,
    String.raw`||v||=\sqrt{x^2+y^2+z^2}`,

    // Matrix/vector notation
    String.raw`v_x^2+v_y^2+v_z^2`,
    String.raw`F_{net}=ma`,

    // Edge cases
    String.raw`xyz`,
    String.raw`a_1a_2a_3`,
    String.raw`x^{2y}z^{3w}`,
    String.raw`e^{e^{x}}`,
    String.raw`e^{e^{x^y}}`,
    String.raw`e^{e^{x_a}}`,
    String.raw`x^{e^{y_a}}`,

    // Constants with variables
    String.raw`\pi r^2`,
    String.raw`2\pi rh`,

    // Special mathematical symbols
    String.raw`\varepsilon>0`,
    String.raw`\vartheta+\varphi`,

    // Engineering equations
    String.raw`\theta_1=\frac{F_{N}}{EI}\left(\frac{x^2}{2}+l_{o}x-\frac{l_{o}l_{i}}{3}\right)`,
    String.raw`y_1=\frac{F_{N}}{EI}\left(\frac{x^3}{6}+\frac{l_{o}x^2}{2}-\frac{l_{o}l_{i}}{3}x\right)`,
    String.raw`\theta_2=\frac{F_{N}}{EI}\left(-\frac{l_{o}x^2}{2l_{i}}+l_{o}x-\frac{l_{o}l_{i}}{3}\right)`,
    String.raw`y_2=\frac{F_{N}}{EI}\left(-\frac{l_{o}x^3}{6l_{i}}+\frac{l_{o}x^2}{2}-\frac{l_{o}l_{i}}{6}x\right)`,

    String.raw`y_{AB}=\frac{W_{r}^{g}}{48EI}\left(4x^3-3l_{i}^2x\right)`,
    String.raw`\theta_{AB}=\frac{W_{r}^{g}}{48EI}\left(12x^2-3l_{i}^2\right)`,
    String.raw`y_{BC}=\frac{W_{r}^{g}}{12EI}\left(-x^3+3l_{i}x^2-\frac94l_{i}^2x+\frac{l_{i}^3}{4}\right)`,
    String.raw`\theta_{BC}=\frac{W_{r}^{g}}{12EI}\left(-3x^2+6l_{i}x-\frac94l_{i}^2\right)`,

    String.raw`y_{AB}=\frac{F_{n}^{r}l_{o}}{6EIl_{i}}\left(-l_{i}^2x+x^3\right)`,
    String.raw`\theta_{AB}=\frac{F_{n}^{r}l_{o}}{6EIl_{i}}\left(-l_{i}^2+3x^2\right)`,
    String.raw`y_{BC}=\frac{F_{n}^{r}}{6EI}\left(-x^3+3\left(l_{i}+l_{o}\right)x^2-\left(4l_{i}^2+3l_{o}l_{i}\right)x+2l_{i}^2\right)`,
    String.raw`\theta_{BC}=\frac{F_{n}^{r}}{6EI}\left(-3x^2+6\left(l_{i}+l_{o}\right)x-\left(4l_{i}^2+3l_{o}l_{i}\right)\right)`,

    // Multi-character superscripts (should be treated as single variables)
    String.raw`M_{y}=M^{sl}+M^{tg}+M^{sr}`,
    String.raw`\theta_{y}=\theta^{nl}+\theta^{rg}+\theta^{nr}`,
    String.raw`\theta_{z}=\theta^{sl}+\theta^{tg}+\theta^{sr}`,
    String.raw`y_{tot}=y^{nl}+y^{rg}+y^{nr}`,
    String.raw`z_{tot}=z^{sl}+z^{tg}+z^{sr}`,

    // Additional edge cases for multi-character modifiers
    String.raw`x^{ab}`,
    String.raw`A_{test}^{val}`,
    String.raw`M^{a}+N^{bc}`,
    String.raw`P_{sub}^{sup}+Q_{xy}^{ab}`,
  ];

  const expectedResults = [
    // Basic operations
    ['A', 'B', 'C'],
    ['A', 'x'],
    ['B', 'x'],
    ['C', 'x'],
    ['D', 'w', 'x'],
    ['A', 'B', 'C', 'x'],

    // Exponents and subscripts
    ['x', 'y'],
    ['x', 'y', 'a'],
    ['x', 'y'],
    ['j', 'x', 'y'],
    ['m', 'n', 'x', 'y'],
    ['R_{x}^{x}', 'x'],
    ['x^{y^{z}}'],
    ['a_{m}^{n}', 'x'],

    // Quadratic formula & roots
    ['x', 'b', 'a', 'c'],
    ['a', 'x', 'b', 'c'],
    ['x_{1,2}', 'b', '\\Delta', 'a'],

    // Polynomials
    ['p', 'x', 'x^{n}', 'a_{n}', 'a_{n-1}', 'a_1', 'a_0', 'n'],
    ['x'],
    ['y', 'm', 'x', 'b'],

    // Fractions and rational expressions
    ['x', 'y', 'z', 'w'],
    ['a', 'b', 'c'],
    ['x', 'y', 'z'],

    // Radicals and roots
    ['x', 'y'],
    ['a', 'b'],
    ['r', 'x', 'y', 'z'],
    ['a', 'b', 'c'],

    // Trigonometric functions
    ['x', 'y'],
    ['a', 'b', 'x', 'c', 'd'],
    ['\\theta'],
    ['x'],

    // Logarithms and exponentials
    ['x', 'y'],
    ['a', 'x', 'b'],
    ['a', 'b'],
    ['y', 'A', 'k', 't'],

    // Greek letters (excluding pi)
    ['\\alpha', '\\beta', '\\gamma'],
    ['\\Delta', 'b', 'a', 'c'],
    ['\\omega', 'f'],
    ['\\sigma', 'n', 'x_{i}', '\\mu'],

    // Multiple towering exponents
    ['a^{b^{c^{d}}}'],
    ['x', 'y'],
    ['x^{a^{b}}', 'y^{c^{d}}'],

    // Complex subscripts and superscripts
    ['x_{i+1}', 'x_{i-1}'],
    ['a_{ij}', 'b_{jk}'],
    ['n', 'x_{i}'],
    ['a', 'b', 'f', 'x', 'd'],

    // Mixed operations
    ['x', 'y'],
    ['a', 'b', 'c', 'd'],
    ['x', 'y'],
    ['x', 'y', 'z', 'w'],

    // Absolute values and norms
    ['a', 'b'],
    ['v', 'x', 'y', 'z'],

    // Matrix/vector notation
    ['v_{x}', 'v_{y}', 'v_{z}'],
    ['F_{net}', 'm', 'a'],

    // Edge cases
    ['x', 'y', 'z'],
    ['a_1', 'a_2', 'a_3'],
    ['x', 'y', 'z', 'w'],
    ['x'],
    ['x^{y}'],
    ['x_{a}'],
    ['x', 'y_{a}'],

    // Constants with variables (pi should be excluded)
    ['r'],
    ['r', 'h'],

    // Special mathematical symbols
    ['\\varepsilon'],
    ['\\vartheta', '\\varphi'],

    // Engineering equations
    ['\\theta_1', 'F_{N}', 'E', 'I', 'x', 'l_{o}', 'l_{i}'],
    ['y_1', 'F_{N}', 'E', 'I', 'x', 'l_{o}', 'l_{i}'],
    ['\\theta_2', 'F_{N}', 'E', 'I', 'x', 'l_{o}', 'l_{i}'],
    ['y_2', 'F_{N}', 'E', 'I', 'x', 'l_{o}', 'l_{i}'],

    ['y_{AB}', 'W_{r}^{g}', 'E', 'I', 'x', 'l_{i}'],
    ['\\theta_{AB}', 'W_{r}^{g}', 'E', 'I', 'x', 'l_{i}'],
    ['y_{BC}', 'W_{r}^{g}', 'E', 'I', 'x', 'l_{i}'],
    ['\\theta_{BC}', 'W_{r}^{g}', 'E', 'I', 'x', 'l_{i}'],

    ['y_{AB}', 'F_{n}^{r}', 'E', 'I', 'x', 'l_{i}', 'l_{o}'],
    ['\\theta_{AB}', 'F_{n}^{r}', 'E', 'I', 'x', 'l_{i}', 'l_{o}'],
    ['y_{BC}', 'F_{n}^{r}', 'E', 'I', 'x', 'l_{i}', 'l_{o}'],
    ['\\theta_{BC}', 'F_{n}^{r}', 'E', 'I', 'x', 'l_{i}', 'l_{o}'],

    // Multi-character superscripts
    ['M_{y}', 'M^{sl}', 'M^{tg}', 'M^{sr}'],
    ['\\theta_{y}', '\\theta^{nl}', '\\theta^{rg}', '\\theta^{nr}'],
    ['\\theta_{z}', '\\theta^{sl}', '\\theta^{tg}', '\\theta^{sr}'],
    ['y_{tot}', 'y^{nl}', 'y^{rg}', 'y^{nr}'],
    ['z_{tot}', 'z^{sl}', 'z^{tg}', 'z^{sr}'],

    // Additional edge cases for multi-character modifiers
    ['x^{ab}'],
    ['A_{test}^{val}'],
    ['M^{a}', 'N^{bc}'],
    ['P_{sub}^{sup}', 'Q_{xy}^{ab}'],
  ];

  const testScenarios: [string, string[]][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (input, expected) => {
    const result = extractLatexVariables(input);
    expect(result.toSorted()).toIncludeSameMembers(expected.toSorted());
  });
});

describe('Empty Modifier Edge Cases', () => {
  // Edge case: Empty subscripts and superscripts should be ignored
  // This prevents false positives like "s_{}" appearing when typing "tests_{}"
  const emptyModifierCases = [
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
