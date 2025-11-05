import { mathjsonToExcel, MJEXTranslateError } from '@/logic/mathjson-excel';
import type { Expression } from 'mathlive';
import { ComputeEngine } from '@cortex-js/compute-engine';
import { setupExtendedAlgebraMode } from '@/logic/prep-compute-engine';

// Initialize ComputeEngine for LaTeX parsing
let ce: ComputeEngine;

beforeAll(() => {
  ce = new ComputeEngine();
  setupExtendedAlgebraMode(ce);
});

/**
 * Helper function to convert LaTeX string to MathJSON Expression
 */
function latexToMathJson(latex: string): Expression {
  const boxed = ce.parse(latex, { canonical: true });
  return boxed.json as Expression;
}

describe('mathjsonToExcel - Basic functionality', () => {
  const testCases = [
    String.raw`5`,
    String.raw`-5`,
    String.raw`x`,
  ];

  const expectedResults = [
    '=5',
    '=-5',
    '=x',
  ];

  const testScenarios: [string, string][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });

  test('should throw error for unsupported operator', () => {
    const mathJson: Expression = ['UnsupportedOp', 1, 2];
    expect(() => mathjsonToExcel(mathJson)).toThrow(MJEXTranslateError);
    expect(() => mathjsonToExcel(mathJson)).toThrow('No Excel equivalent for operator "UnsupportedOp"');
  });
});

describe('mathjsonToExcel - Arithmetic operations', () => {
  const testCases = [
    // Basic arithmetic
    String.raw`2+3`,
    String.raw`-x`,
    String.raw`x`,
    String.raw`2^3`,
    String.raw`x^2`,
    String.raw`\sqrt[3]{x}`,
    String.raw`\sqrt{x^2+y^2}`,

    // Complex expressions
    String.raw`2^{3+4}`,
    String.raw`-b+\sqrt{b^2-4*a*c}`,
    String.raw`a*x^2+b*x+c`,
  ];

  const expectedResults = [
    // Basic arithmetic
    '=(2+3)',
    '=(-x)',
    '=x',
    '=(2^3)',
    '=(x^2)',
    '=(x^(1/3))',
    '=SQRT(((x^2)+(y^2)))',

    // Complex expressions
    '=(2^(3+4))',
    '=((-b)+SQRT(((b^2)+(-4*a*c))))',
    '=((a*(x^2))+(b*x)+c)',
  ];

  const testScenarios: [string, string][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Subscript handling', () => {
  const testCases = [
    String.raw`a_n`,
    String.raw`a_1`,
    String.raw`a_{n+1}`,
  ];

  const expectedResults = [
    '=a_n',
    '=a_1',
    '=a_(n+1)',
  ];

  const testScenarios: [string, string][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });

  test('should handle subscript with variable mapping', () => {
    const latex = String.raw`a_{n+1}`;
    const mathJson = latexToMathJson(latex);
    const varMap = { a: 'A1', n: 'B1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=A1_(B1+1)');
  });
});

describe('mathjsonToExcel - InvisibleOperator handling', () => {
  const testCases = [
    String.raw`f_{abcd}`,
    String.raw`2*x`,
    String.raw`2*x*y+3`,
  ];

  const expectedResults = [
    '=f_abcd',
    '=(2*x)',
    '=((2*x*y)+3)',
  ];

  const testScenarios: [string, string][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });

  test('should handle InvisibleOperator in subscript with component variable mapping', () => {
    const latex = String.raw`f_{ab}`;
    const mathJson = latexToMathJson(latex);
    const varMap = { f: 'F1', a: 'A1', b: 'B1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=F1_A1B1');
  });

  test('should handle InvisibleOperator in subscript with complete variable mapping', () => {
    const mathJson: Expression = ['Subscript', 'f', ['InvisibleOperator', 'a', 'c', 'v']];
    const varMap = { f_acv: 'A1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=A1');
  });
});

describe('mathjsonToExcel - Trigonometric functions', () => {
  const testCases = [
    String.raw`\sin(x)`,
    String.raw`\cos(y)`,
    String.raw`\tan(t)`,
    String.raw`\csc(x)`,
    String.raw`\sec(x)`,
    String.raw`\cot(x)`,
    String.raw`\sin^2(x)+\cos^2(x)`,
    String.raw`\sin(b*x+c)`,
  ];

  const expectedResults = [
    '=SIN(x)',
    '=COS(y)',
    '=TAN(t)',
    '=CSC(x)',
    '=SEC(x)',
    '=COT(x)',
    '=((SIN(x)^2)+(COS(x)^2))',
    '=SIN(((b*x)+c))',
  ];

  const testScenarios: [string, string][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Inverse trigonometric functions', () => {
  const testCases = [
    String.raw`\arcsin(x)`,
    String.raw`\arccos(x)`,
    String.raw`\arctan(x)`,
  ];

  const expectedResults = [
    '=ASIN(x)',
    '=ACOS(x)',
    '=ATAN(x)',
  ];

  const testScenarios: [string, string][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Hyperbolic functions', () => {
  const testCases = [
    String.raw`\sinh(x)`,
    String.raw`\cosh(x)`,
    String.raw`\tanh(x)`,
    String.raw`\operatorname{sech}(x)`,
    String.raw`\coth(x)`,
  ];

  const expectedResults = [
    '=SINH(x)',
    '=COSH(x)',
    '=TANH(x)',
    '=SECH(x)',
    '=COTH(x)',
  ];

  const testScenarios: [string, string][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Logarithms and exponentials', () => {
  const testCases = [
    String.raw`\ln(x)`,
    String.raw`\log(x)`,
    String.raw`\ln(x+1)`,
  ];

  const expectedResults = [
    '=LN(x)',
    '=LOG(x)',
    '=LN((x+1))',
  ];

  const testScenarios: [string, string][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Constants', () => {
  const testCases = [
    String.raw`\pi`,
    String.raw`e`,
    String.raw`i`,
    String.raw`\infty`,
    String.raw`-\infty`,
    String.raw`\pi r^2`,
  ];

  const expectedResults = [
    '=PI()',
    '=EXP(1)',
    '=COMPLEX(0,1)',
    '=1E+307',
    '=-1E+307',
    '=(PI()*(r^2))',
  ];

  const testScenarios: [string, string][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Rounding functions', () => {
  const testCases = [
    String.raw`|x|`,
    String.raw`|-5|`,
    String.raw`\lfloor x \rfloor`,
  ];

  const expectedResults = [
    '=ABS(x)',
    '=ABS(-5)',
    '=FLOOR(x,1)',
  ];

  const testScenarios: [string, string][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Special functions', () => {
  const testCases = [
    String.raw`5!`,
    String.raw`n!`,
    String.raw`5!!`,
    String.raw`n!!`,
    String.raw`\frac{a}{b}`,
    String.raw`\operatorname{lcm}(a,b)`,
  ];

  const expectedResults = [
    '=FACT(5)',
    '=FACT(n)',
    '=FACTDOUBLE(5)',
    '=FACTDOUBLE(n)',
    '=(a/b)',
    '=LCM(a,b)',
  ];

  const testScenarios: [string, string][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Complex numbers', () => {
  const testCases = [
    String.raw`\arg(z)`,
  ];

  const expectedResults = [
    '=IMARGUMENT(z)',
  ];

  const testScenarios: [string, string][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Variable mapping', () => {
  test('should map simple variable', () => {
    const latex = String.raw`x`;
    const mathJson = latexToMathJson(latex);
    const varMap = { x: 'A1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=A1');
  });

  test('should map multiple variables: x+y', () => {
    const latex = String.raw`x+y`;
    const mathJson = latexToMathJson(latex);
    const varMap = { x: 'A1', y: 'B1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=(A1+B1)');
  });

  test('should map in complex expression: ax^2+bx+c', () => {
    const latex = String.raw`ax^2+bx+c`;
    const mathJson = latexToMathJson(latex);
    const varMap = { a: 'A1', b: 'B1', c: 'C1', x: 'D1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=((A1*(D1^2))+(B1*D1)+C1)');
  });

  test('should map in trigonometric functions: sin(x)+cos(y)', () => {
    const latex = String.raw`\sin(x)+\cos(y)`;
    const mathJson = latexToMathJson(latex);
    const varMap = { x: 'A1', y: 'B1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=(SIN(A1)+COS(B1))');
  });

  test('should leave unmapped variables as-is', () => {
    const latex = String.raw`x+y+z`;
    const mathJson = latexToMathJson(latex);
    const varMap = { x: 'A1', y: 'B1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=(A1+B1+z)');
  });

  test('should map in nested expressions', () => {
    const latex = String.raw`\frac{-b+\sqrt{b^2-4*a*c}}{2*a}`;
    const mathJson = latexToMathJson(latex);
    const varMap = { a: 'A1', b: 'B1', c: 'C1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=(((-B1)+SQRT(((B1^2)+(-4*A1*C1))))/(2*A1))');
  });
});

describe('mathjsonToExcel - Edge cases and complex expressions', () => {
  const testCases = [
    String.raw`1+2+3+4`,
    String.raw`\frac{(a+b)\times(c+(-d))}{m^f}`,
    String.raw`a^{b^{c^d}}`,
    String.raw`\sqrt{a^2+\sqrt{b^2+c^2}}`,
    String.raw`a_i+b_j+c_k`,
  ];

  const expectedResults = [
    '=(1+2+3+4)',
    '=(((a+b)*(c+(-d)))/(m^f))',
    '=(a^(b^(c^d)))',
    '=SQRT(((a^2)+SQRT(((b^2)+(c^2)))))',
    '=(a_i+b_j+c_k)',
  ];

  const testScenarios: [string, string][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});
