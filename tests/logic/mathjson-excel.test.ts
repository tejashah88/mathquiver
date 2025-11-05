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
  const testCases: [string, string][] = [
    [String.raw`5`, '=5'],
    [String.raw`-5`, '=-5'],
    [String.raw`x`, '=x'],
  ];

  test.each(testCases)('valid: %s => %s', (latex, expected) => {
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
  const testCases: [string, string][] = [
    // Basic arithmetic
    [String.raw`2+3`, '=(2+3)'],
    [String.raw`-x`, '=(-x)'],
    [String.raw`x`, '=x'],
    [String.raw`2^3`, '=(2^3)'],
    [String.raw`x^2`, '=(x^2)'],
    [String.raw`\sqrt[3]{x}`, '=(x^(1/3))'],
    [String.raw`\sqrt{x^2+y^2}`, '=SQRT(((x^2)+(y^2)))'],

    // Complex expressions
    [String.raw`2^{3+4}`, '=(2^(3+4))'],
    [String.raw`-b+\sqrt{b^2-4*a*c}`, '=((-b)+SQRT(((b^2)+(-4*a*c))))'],
    [String.raw`a*x^2+b*x+c`, '=((a*(x^2))+(b*x)+c)'],
  ];

  test.each(testCases)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Subscript handling', () => {
  const testCases: [string, string][] = [
    [String.raw`a_n`, '=a_n'],
    [String.raw`a_1`, '=a_1'],
    [String.raw`a_{n+1}`, '=a_(n+1)'],
  ];

  test.each(testCases)('valid: %s => %s', (latex, expected) => {
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
  const testCases: [string, string][] = [
    [String.raw`f_{abcd}`, '=f_abcd'],
    [String.raw`2*x`, '=(2*x)'],
    [String.raw`2*x*y+3`, '=((2*x*y)+3)'],
  ];

  test.each(testCases)('valid: %s => %s', (latex, expected) => {
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
  const testCases: [string, string][] = [
    [String.raw`\sin(x)`, '=SIN(x)'],
    [String.raw`\cos(y)`, '=COS(y)'],
    [String.raw`\tan(t)`, '=TAN(t)'],
    [String.raw`\csc(x)`, '=CSC(x)'],
    [String.raw`\sec(x)`, '=SEC(x)'],
    [String.raw`\cot(x)`, '=COT(x)'],
    [String.raw`\sin^2(x)+\cos^2(x)`, '=((SIN(x)^2)+(COS(x)^2))'],
    [String.raw`\sin(b*x+c)`, '=SIN(((b*x)+c))'],
  ];

  test.each(testCases)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Inverse trigonometric functions', () => {
  const testCases: [string, string][] = [
    [String.raw`\arcsin(x)`, '=ASIN(x)'],
    [String.raw`\arccos(x)`, '=ACOS(x)'],
    [String.raw`\arctan(x)`, '=ATAN(x)'],
  ];

  test.each(testCases)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Hyperbolic functions', () => {
  const testCases: [string, string][] = [
    [String.raw`\sinh(x)`, '=SINH(x)'],
    [String.raw`\cosh(x)`, '=COSH(x)'],
    [String.raw`\tanh(x)`, '=TANH(x)'],
    [String.raw`\operatorname{sech}(x)`, '=SECH(x)'],
    [String.raw`\coth(x)`, '=COTH(x)'],
  ];

  test.each(testCases)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Logarithms and exponentials', () => {
  const testCases: [string, string][] = [
    [String.raw`\ln(x)`, '=LN(x)'],
    [String.raw`\log(x)`, '=LOG(x)'],
    [String.raw`\ln(x+1)`, '=LN((x+1))'],
  ];

  test.each(testCases)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Constants', () => {
  const testCases: [string, string][] = [
    [String.raw`\pi`, '=PI()'],
    [String.raw`e`, '=EXP(1)'],
    [String.raw`i`, '=COMPLEX(0,1)'],
    [String.raw`\infty`, '=1E+307'],
    [String.raw`-\infty`, '=-1E+307'],
    [String.raw`\pi r^2`, '=(PI()*(r^2))'],
  ];

  test.each(testCases)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Rounding functions', () => {
  const testCases: [string, string][] = [
    [String.raw`|x|`, '=ABS(x)'],
    [String.raw`|-5|`, '=ABS(-5)'],
    [String.raw`\lfloor x \rfloor`, '=FLOOR(x,1)'],
  ];

  test.each(testCases)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Special functions', () => {
  const testCases: [string, string][] = [
    [String.raw`5!`, '=FACT(5)'],
    [String.raw`n!`, '=FACT(n)'],
    [String.raw`5!!`, '=FACTDOUBLE(5)'],
    [String.raw`n!!`, '=FACTDOUBLE(n)'],
    [String.raw`\frac{a}{b}`, '=(a/b)'],
    [String.raw`\operatorname{lcm}(a,b)`, '=LCM(a,b)'],
  ];

  test.each(testCases)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Complex numbers', () => {
  const testCases: [string, string][] = [
    [String.raw`\arg(z)`, '=IMARGUMENT(z)'],
  ];

  test.each(testCases)('valid: %s => %s', (latex, expected) => {
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
  const testCases: [string, string][] = [
    [String.raw`1+2+3+4`, '=(1+2+3+4)'],
    [String.raw`\frac{(a+b)\times(c+(-d))}{m^f}`, '=(((a+b)*(c+(-d)))/(m^f))'],
    [String.raw`a^{b^{c^d}}`, '=(a^(b^(c^d)))'],
    [String.raw`\sqrt{a^2+\sqrt{b^2+c^2}}`, '=SQRT(((a^2)+SQRT(((b^2)+(c^2)))))'],
    [String.raw`a_i+b_j+c_k`, '=(a_i+b_j+c_k)'],
  ];

  test.each(testCases)('valid: %s => %s', (latex, expected) => {
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe(expected);
  });
});

describe('setupExtendedAlgebraMode - Extended algebra mode verification', () => {
  test('should treat D as variable, not derivative function', () => {
    const latex = String.raw`D`;
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=D');
  });

  test('should treat N as variable, not numerical approximation function', () => {
    const latex = String.raw`N`;
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=N');
  });

  test('should allow D in expressions: D*x+N*y', () => {
    const latex = String.raw`D*x+N*y`;
    const mathJson = latexToMathJson(latex);
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=((D*x)+(N*y))');
  });

  test('should allow D with variable mapping', () => {
    const latex = String.raw`D+N`;
    const mathJson = latexToMathJson(latex);
    const varMap = { D: 'A1', N: 'B1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=(A1+B1)');
  });
});
