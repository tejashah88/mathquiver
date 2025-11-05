import extractEquationParts from '@/logic/extract-equation-parts';

describe('Extract Equation Parts', () => {
  const testCases: [string, [string, string, string]][] = [
    // Basic expressions without equals or comma
    [String.raw`Ax^2+Bx+C`, ['', 'Ax^2+Bx+C', '']],
    [String.raw`x`, ['', 'x', '']],
    [String.raw`(a+b)^2`, ['', '(a+b)^2', '']],
    [String.raw`\sin(x)+\cos(y)`, ['', '\\sin(x)+\\cos(y)', '']],

    // Expressions with equals sign
    [String.raw`x=5`, ['x', '5', '']],
    [String.raw`x=Ax^2+Bx+C`, ['x', 'Ax^2+Bx+C', '']],
    [String.raw`f(x)=x^2+1`, ['f(x)', 'x^2+1', '']],
    [String.raw`y(t)=sin(t)+cos(t)`, ['y(t)', 'sin(t)+cos(t)', '']],
    [String.raw`y=mx+b`, ['y', 'mx+b', '']],

    // Expressions with comma (conditions/constraints)
    [String.raw`Ax^2+Bx+C,x<0`, ['', 'Ax^2+Bx+C', 'x<0']],
    [String.raw`x^2,x>=0`, ['', 'x^2', 'x>=0']],
    [String.raw`sin(x),0<=x<=2\pi`, ['', 'sin(x)', '0<=x<=2\\pi']],
    [String.raw`x=test,x<`, ['x', 'test', 'x<']],

    // Complete expressions (equals and comma)
    [String.raw`x=Ax^2+Bx+C,x<0`, ['x', 'Ax^2+Bx+C', 'x<0']],
    [String.raw`f(x)=1/x,x\neq 0`, ['f(x)', '1/x', 'x\\neq 0']],
    [String.raw`y=x^2,x>0`, ['y', 'x^2', 'x>0']],
    [String.raw`x(t)=cos(t),0<=t<=2\pi`, ['x(t)', 'cos(t)', '0<=t<=2\\pi']],

    // Edge cases with spaces
    [String.raw`y = x + 1`, ['y ', ' x + 1', '']],
    [String.raw`x=y=5`, ['x', 'y=5', '']],

    // Greek letters and LaTeX
    [String.raw`\theta=\sin(\alpha),\alpha>0`, ['\\theta', '\\sin(\\alpha)', '\\alpha>0']],
    [String.raw`y=\frac{a}{b}`, ['y', '\\frac{a}{b}', '']],

    // Real-world mathematical expressions
    [String.raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`, ['x', '\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}', '']],
    [String.raw`f'(x)=2x+1`, ['f\'(x)', '2x+1', '']],
    [String.raw`\int_0^1 x^2 dx,x\in[0,1]`, ['', '\\int_0^1 x^2 dx', 'x\\in[0,1]']],
    [String.raw`y=e^{-x^2},x\in\mathbb{R}`, ['y', 'e^{-x^2}', 'x\\in\\mathbb{R}']],

    // Commas in subscripts/superscripts (should be ignored)
    [String.raw`\theta_{y,3}^{wr} = \frac{W_r^g}{4EI}\left(2l_i x - x^2 - \frac{3}{4}l_i^2\right), x \in \left[\frac{l_i}{2}, l_i\right]`, [String.raw`\theta_{y,3}^{wr} `, String.raw` \frac{W_r^g}{4EI}\left(2l_i x - x^2 - \frac{3}{4}l_i^2\right)`, String.raw` x \in \left[\frac{l_i}{2}, l_i\right]`]],
    [String.raw`\theta_{y,1}^{wr} = \theta_{y,2}^{wr}(0), x \in [-l_o, 0]`, [String.raw`\theta_{y,1}^{wr} `, String.raw` \theta_{y,2}^{wr}(0)`, String.raw` x \in [-l_o, 0]`]],
    [String.raw`\theta_{y,3}^{nr} = \frac{F_n}{6EI}(6(l_i + l_o)x - 3x^2 - 3l_i^2 - 4l_o l_i), x \in (l_i, (l_o + l_i))`, [String.raw`\theta_{y,3}^{nr} `, String.raw` \frac{F_n}{6EI}(6(l_i + l_o)x - 3x^2 - 3l_i^2 - 4l_o l_i)`, String.raw` x \in (l_i, (l_o + l_i))`]],
    [String.raw`a_{1,2} = b_{3,4}, x > 0`, [String.raw`a_{1,2} `, String.raw` b_{3,4}`, String.raw` x > 0`]],
    [String.raw`y = x^2, x \in [0, 10]`, [String.raw`y `, String.raw` x^2`, String.raw` x \in [0, 10]`]],
    [String.raw`f(x,y) = x + y, x > 0`, [String.raw`f(x,y) `, String.raw` x + y`, String.raw` x > 0`]],

    // Multiple top-level commas (should split at FIRST)
    [String.raw`M_{z,3}^{nl}=0,x,3`, [String.raw`M_{z,3}^{nl}`, String.raw`0`, String.raw`x,3`]],
    [String.raw`x=1,y,z`, [String.raw`x`, String.raw`1`, String.raw`y,z`]],
    [String.raw`y=x^2,a,b,c`, [String.raw`y`, String.raw`x^2`, String.raw`a,b,c`]],

    // \left...\right with commas inside (commas should be ignored inside)
    [String.raw`M_{z}=F_{y}L_{o},x\in\left\lbrack x,5\right\rbrack`, [String.raw`M_{z}`, String.raw`F_{y}L_{o}`, String.raw`x\in\left\lbrack x,5\right\rbrack`]],
    [String.raw`y=f(x),x\in\left[0,10\right]`, [String.raw`y`, String.raw`f(x)`, String.raw`x\in\left[0,10\right]`]],
    [String.raw`z=g(t),t\in\left(a,b\right)`, [String.raw`z`, String.raw`g(t)`, String.raw`t\in\left(a,b\right)`]],
    [String.raw`\theta=h(\alpha),\alpha\in\left\lbrace 1,2,3\right\rbrace`, [String.raw`\theta`, String.raw`h(\alpha)`, String.raw`\alpha\in\left\lbrace 1,2,3\right\rbrace`]],

    // Complex engineering equations from latex-var-extract tests
    [String.raw`\theta_1=\frac{F_{N}}{EI}\left(\frac{x^2}{2}+l_{o}x-\frac{l_{o}l_{i}}{3}\right),x\in[0,l_i]`, [String.raw`\theta_1`, String.raw`\frac{F_{N}}{EI}\left(\frac{x^2}{2}+l_{o}x-\frac{l_{o}l_{i}}{3}\right)`, String.raw`x\in[0,l_i]`]],
    [String.raw`y_{AB}=\frac{W_{r}^{g}}{48EI}\left(4x^3-3l_{i}^2x\right),x\in[0,\frac{l_i}{2}]`, [String.raw`y_{AB}`, String.raw`\frac{W_{r}^{g}}{48EI}\left(4x^3-3l_{i}^2x\right)`, String.raw`x\in[0,\frac{l_i}{2}]`]],

    // Edge cases - all handled gracefully (no errors)
    [String.raw``, ['', '', '']],
    [String.raw`=`, ['', '', '']],
    [String.raw`x=`, ['x', '', '']],
    [String.raw`,`, ['', '', '']],
    [String.raw`x^2,`, ['', 'x^2', '']],
  ];

  test.each(testCases)('valid: %s => %s', (input, expected) => {
    const result = extractEquationParts(input);
    expect(result).toEqual(expected);
  });
});
