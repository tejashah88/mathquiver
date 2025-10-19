import extractEquationParts from '@/logic/extract-equation-parts';

describe('Extract Equation Parts', () => {
  const testCases = [
    // Basic expressions without equals or comma
    String.raw`Ax^2+Bx+C`,
    String.raw`x`,
    String.raw`(a+b)^2`,
    String.raw`\sin(x)+\cos(y)`,

    // Expressions with equals sign
    String.raw`x=5`,
    String.raw`x=Ax^2+Bx+C`,
    String.raw`f(x)=x^2+1`,
    String.raw`y(t)=sin(t)+cos(t)`,
    String.raw`y=mx+b`,

    // Expressions with comma (conditions/constraints)
    String.raw`Ax^2+Bx+C,x<0`,
    String.raw`x^2,x>=0`,
    String.raw`sin(x),0<=x<=2\pi`,
    String.raw`x=test,x<`,

    // Complete expressions (equals and comma)
    String.raw`x=Ax^2+Bx+C,x<0`,
    String.raw`f(x)=1/x,x\neq 0`,
    String.raw`y=x^2,x>0`,
    String.raw`x(t)=cos(t),0<=t<=2\pi`,

    // Edge cases with spaces
    String.raw`y = x + 1`,
    String.raw`x=y=5`,

    // Greek letters and LaTeX
    String.raw`\theta=\sin(\alpha),\alpha>0`,
    String.raw`y=\frac{a}{b}`,

    // Real-world mathematical expressions
    String.raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`,
    String.raw`f'(x)=2x+1`,
    String.raw`\int_0^1 x^2 dx,x\in[0,1]`,
    String.raw`y=e^{-x^2},x\in\mathbb{R}`,

    // Edge cases - all handled gracefully (no errors)
    String.raw``,
    String.raw`=`,
    String.raw`x=`,
    String.raw`,`,
    String.raw`x^2,`,
  ];

  const expectedResults: [string, string, string][] = [
    // Basic expressions without equals or comma
    ['', 'Ax^2+Bx+C', ''],
    ['', 'x', ''],
    ['', '(a+b)^2', ''],
    ['', '\\sin(x)+\\cos(y)', ''],

    // Expressions with equals sign
    ['x', '5', ''],
    ['x', 'Ax^2+Bx+C', ''],
    ['f(x)', 'x^2+1', ''],
    ['y(t)', 'sin(t)+cos(t)', ''],
    ['y', 'mx+b', ''],

    // Expressions with comma (conditions/constraints)
    ['', 'Ax^2+Bx+C', 'x<0'],
    ['', 'x^2', 'x>=0'],
    ['', 'sin(x)', '0<=x<=2\\pi'],
    ['x', 'test', 'x<'],

    // Complete expressions (equals and comma)
    ['x', 'Ax^2+Bx+C', 'x<0'],
    ['f(x)', '1/x', 'x\\neq 0'],
    ['y', 'x^2', 'x>0'],
    ['x(t)', 'cos(t)', '0<=t<=2\\pi'],

    // Edge cases with spaces
    ['y ', ' x + 1', ''],
    ['x', 'y=5', ''],

    // Greek letters and LaTeX
    ['\\theta', '\\sin(\\alpha)', '\\alpha>0'],
    ['y', '\\frac{a}{b}', ''],

    // Real-world mathematical expressions
    ['x', '\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}', ''],
    ['f\'(x)', '2x+1', ''],
    ['', '\\int_0^1 x^2 dx', 'x\\in[0,1]'],
    ['y', 'e^{-x^2}', 'x\\in\\mathbb{R}'],

    // Edge cases - all handled gracefully (no errors)
    ['', '', ''],
    ['', '', ''],
    ['x', '', ''],
    ['', '', ''],
    ['', 'x^2', ''],
  ];

  test.each(
    testCases.map((input, i) => [input, expectedResults[i]])
  )('valid: %s => %s', (input, expected) => {
    const result = extractEquationParts(input);
    expect(result).toEqual(expected);
  });
});
