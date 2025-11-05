import { mathjsonToExcel, MJEXTranslateError } from '@/logic/mathjson-excel';
import type { Expression } from 'mathlive';

describe('mathjsonToExcel - Basic functionality', () => {
  const basicTestCases: [string, Expression, string][] = [
    ['simple number', 5, '=5'],
    ['negative number', -5, '=-5'],
    ['simple variable', 'x', '=x'],
  ];

  test.each(basicTestCases)('should handle %s', (_desc, input, expected) => {
    const result = mathjsonToExcel(input);
    expect(result).toBe(expected);
  });

  test('should throw error for unsupported operator', () => {
    const mathJson: Expression = ['UnsupportedOp', 1, 2];
    expect(() => mathjsonToExcel(mathJson)).toThrow(MJEXTranslateError);
    expect(() => mathjsonToExcel(mathJson)).toThrow('No Excel equivalent for operator "UnsupportedOp"');
  });
});

describe('mathjsonToExcel - Arithmetic operations', () => {
  const arithmeticTestCases: [string, Expression, string][] = [
    ['addition: 2+3', ['Add', 2, 3], '=(2+3)'],
    ['subtraction: 5-2', ['Subtract', 5, 2], '=(5-2)'],
    ['multiplication: 4*3', ['Multiply', 4, 3], '=(4*3)'],
    ['division: 10/2', ['Divide', 10, 2], '=(10/2)'],
    ['power: 2^3', ['Power', 2, 3], '=(2^3)'],
    ['square: x^2', ['Square', 'x'], '=(x^2'],
    ['square root: sqrt(16)', ['Sqrt', 16], '=SQRT(16)'],
    ['nth root: x^(1/3)', ['Root', 'x', 3], '=(x^(1/3))'],
    ['negation: -x', ['Negate', 'x'], '=(-x)'],
    ['parentheses: (x)', ['Parentheses', 'x'], '=(x)'],
  ];

  test.each(arithmeticTestCases)('should handle %s', (_desc, input, expected) => {
    const result = mathjsonToExcel(input);
    expect(result).toBe(expected);
  });

  test('should handle complex expression: (2+3)*4', () => {
    const mathJson: Expression = ['Multiply', ['Add', 2, 3], 4];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=((2+3)*4)');
  });

  test('should handle nested operations: 2^(3+4)', () => {
    const mathJson: Expression = ['Power', 2, ['Add', 3, 4]];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=(2^(3+4))');
  });

  test('should handle quadratic formula numerator: -b+sqrt(b^2-4ac)', () => {
    const mathJson: Expression = ['Add', ['Negate', 'b'],
      ['Sqrt', ['Subtract', ['Power', 'b', 2], ['Multiply', 4, 'a', 'c']]]];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=((-b)+SQRT(((b^2)-(4*a*c))))');
  });

  test('should handle polynomial: ax^2+bx+c', () => {
    const mathJson: Expression = ['Add',
      ['Multiply', 'a', ['Power', 'x', 2]],
      ['Multiply', 'b', 'x'],
      'c'];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=((a*(x^2))+(b*x)+c)');
  });

  test('should handle fraction: (x+y)/(z-w)', () => {
    const mathJson: Expression = ['Divide', ['Add', 'x', 'y'], ['Subtract', 'z', 'w']];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=((x+y)/(z-w))');
  });

  test('should handle Pythagorean theorem: sqrt(x^2+y^2)', () => {
    const mathJson: Expression = ['Sqrt', ['Add', ['Power', 'x', 2], ['Power', 'y', 2]]];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=SQRT(((x^2)+(y^2)))');
  });
});

describe('mathjsonToExcel - Subscript handling', () => {
  const subscriptTestCases: [string, Expression, string][] = [
    ['simple subscript: a_n', ['Subscript', 'a', 'n'], '=a_n'],
    ['numeric subscript: a_1', ['Subscript', 'a', 1], '=a_1'],
    ['complex subscript: a_{n+1}', ['Subscript', 'a', ['Add', 'n', 1]], '=a_(n+1)'],
  ];

  test.each(subscriptTestCases)('should handle %s', (_desc, input, expected) => {
    const result = mathjsonToExcel(input);
    expect(result).toBe(expected);
  });

  test('should handle subscript with variable mapping', () => {
    const mathJson: Expression = ['Subscript', 'a', ['Add', 'n', 1]];
    const varMap = { a: 'A1', n: 'B1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=A1_(B1+1)');
  });

  test('should handle nested expressions with subscripts: 2*a_{n+1}', () => {
    const mathJson: Expression = ['Multiply', 2, ['Subscript', 'a', ['Add', 'n', 1]]];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=(2*a_(n+1))');
  });
});

describe('mathjsonToExcel - InvisibleOperator handling', () => {
  test('should handle InvisibleOperator in subscript: f_{abcd}', () => {
    const mathJson: Expression = ['Subscript', 'f', ['InvisibleOperator', 'a', 'b', 'c', 'd']];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=f_abcd');
  });

  test('should handle InvisibleOperator in subscript with variable mapping', () => {
    const mathJson: Expression = ['Subscript', 'f', ['InvisibleOperator', 'a', 'b']];
    const varMap = { f: 'F1', a: 'A1', b: 'B1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=F1_A1B1');
  });

  test('should handle InvisibleOperator in regular context: 2x', () => {
    const mathJson: Expression = ['InvisibleOperator', 2, 'x'];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=(2*x)');
  });

  test('should handle InvisibleOperator in arithmetic: 2xy + 3', () => {
    const mathJson: Expression = ['Add', ['InvisibleOperator', 2, 'x', 'y'], 3];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=((2*x*y)+3)');
  });

  test('should handle nested InvisibleOperator in subscript: 2*a_{ijk}', () => {
    const mathJson: Expression = ['Multiply', 2, ['Subscript', 'a', ['InvisibleOperator', 'i', 'j', 'k']]];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=(2*a_ijk)');
  });

  test('should handle multiple InvisibleOperators in mixed contexts', () => {
    const mathJson: Expression = ['Add',
      ['Subscript', 'f', ['InvisibleOperator', 'a', 'b']],
      ['InvisibleOperator', 2, 'x']];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=(f_ab+(2*x))');
  });

  test('should handle complex expression with subscript InvisibleOperator: f_{mn} * g_{pq}', () => {
    const mathJson: Expression = ['Multiply',
      ['Subscript', 'f', ['InvisibleOperator', 'm', 'n']],
      ['Subscript', 'g', ['InvisibleOperator', 'p', 'q']]];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=(f_mn*g_pq)');
  });
});

describe('mathjsonToExcel - Trigonometric functions', () => {
  const trigTestCases: [string, Expression, string][] = [
    ['sin(x)', ['Sin', 'x'], '=SIN(x)'],
    ['cos(y)', ['Cos', 'y'], '=COS(y)'],
    ['tan(theta)', ['Tan', 'theta'], '=TAN(theta)'],
    ['csc(x)', ['Csc', 'x'], '=CSC(x)'],
    ['sec(x)', ['Sec', 'x'], '=SEC(x)'],
    ['cot(x)', ['Cot', 'x'], '=COT(x)'],
  ];

  test.each(trigTestCases)('should handle %s', (_desc, input, expected) => {
    const result = mathjsonToExcel(input);
    expect(result).toBe(expected);
  });

  test('should handle Pythagorean identity: sin^2(x)+cos^2(x)', () => {
    const mathJson: Expression = ['Add',
      ['Power', ['Sin', 'x'], 2],
      ['Power', ['Cos', 'x'], 2]];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=((SIN(x)^2)+(COS(x)^2))');
  });

  test('should handle sin(bx+c)', () => {
    const mathJson: Expression = ['Sin', ['Add', ['Multiply', 'b', 'x'], 'c']];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=SIN(((b*x)+c))');
  });
});

describe('mathjsonToExcel - Inverse trigonometric functions', () => {
  const inverseTrigTestCases: [string, Expression, string][] = [
    ['arcsin(x)', ['Arcsin', 'x'], '=ASIN(x)'],
    ['arccos(x)', ['Arccos', 'x'], '=ACOS(x)'],
    ['arctan(x)', ['Arctan', 'x'], '=ATAN(x)'],
    ['acsc(x)', ['Acsc', 'x'], '=ACSC(x)'],
    ['asec(x)', ['Asec', 'x'], '=ASEC(x)'],
    ['acot(x)', ['Acot', 'x'], '=ACOT(x)'],
  ];

  test.each(inverseTrigTestCases)('should handle %s', (_desc, input, expected) => {
    const result = mathjsonToExcel(input);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Hyperbolic functions', () => {
  const hyperbolicTestCases: [string, Expression, string][] = [
    ['sinh(x)', ['Sinh', 'x'], '=SINH(x)'],
    ['cosh(x)', ['Cosh', 'x'], '=COSH(x)'],
    ['tanh(x)', ['Tanh', 'x'], '=TANH(x)'],
    ['csch(x)', ['Csch', 'x'], '=CSCH(x)'],
    ['sech(x)', ['Sech', 'x'], '=SECH(x)'],
    ['coth(x)', ['Coth', 'x'], '=COTH(x)'],
    ['arsinh(x)', ['Arsinh', 'x'], '=ASINH(x)'],
    ['arcosh(x)', ['Arcosh', 'x'], '=ACOSH(x)'],
    ['artanh(x)', ['Artanh', 'x'], '=ATANH(x)'],
    ['acsch(x)', ['Acsch', 'x'], '=ACSCH(x)'],
    ['asech(x)', ['Asech', 'x'], '=ASECH(x)'],
    ['arcoth(x)', ['Arcoth', 'x'], '=ACOTH(x)'],
  ];

  test.each(hyperbolicTestCases)('should handle %s', (_desc, input, expected) => {
    const result = mathjsonToExcel(input);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Logarithms and exponentials', () => {
  const logExpTestCases: [string, Expression, string][] = [
    ['exp(x)', ['Exp', 'x'], '=EXP(x)'],
    ['ln(x)', ['Ln', 'x'], '=LN(x)'],
    ['log(x)', ['Log', 'x'], '=LOG(x)'],
    ['log base 2: lb(x)', ['Lb', 'x'], '=LOG(x,2)'],
    ['log base 10: lg(x)', ['Lg', 'x'], '=LOG(x)'],
    ['log1p: ln(x+1)', ['LogOnePlus', 'x'], '=LN(x + 1)'],
  ];

  test.each(logExpTestCases)('should handle %s', (_desc, input, expected) => {
    const result = mathjsonToExcel(input);
    expect(result).toBe(expected);
  });

  test('should handle exponential growth: Ae^(-kt)', () => {
    const mathJson: Expression = ['Multiply', 'A',
      ['Exp', ['Negate', ['Multiply', 'k', 't']]]];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=(A*EXP((-(k*t))))');
  });
});

describe('mathjsonToExcel - Constants', () => {
  const constantTestCases: [string, Expression, string][] = [
    ['Pi constant', 'Pi', '=PI()'],
    ['ExponentialE constant', 'ExponentialE', '=EXP(1)'],
    ['ImaginaryUnit constant', 'ImaginaryUnit', '=COMPLEX(0,1)'],
    ['PositiveInfinity constant', 'PositiveInfinity', '=1E+307'],
    ['NegativeInfinity constant', 'NegativeInfinity', '=-1E+307'],
  ];

  test.each(constantTestCases)('should handle %s', (_desc, input, expected) => {
    const result = mathjsonToExcel(input);
    expect(result).toBe(expected);
  });

  test('should handle Pi in formula: Pi*r^2', () => {
    const mathJson: Expression = ['Multiply', 'Pi', ['Power', 'r', 2]];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=(PI()*(r^2))');
  });
});

describe('mathjsonToExcel - Rounding functions', () => {
  const roundingTestCases: [string, Expression, string][] = [
    ['abs(x)', ['Abs', 'x'], '=ABS(x)'],
    ['abs(-5)', ['Abs', -5], '=ABS(-5)'],
    ['ceil(x)', ['Ceil', 'x'], '=CEILING.MATH(x,1)'],
    ['floor(x)', ['Floor', 'x'], '=FLOOR(x,1)'],
  ];

  test.each(roundingTestCases)('should handle %s', (_desc, input, expected) => {
    const result = mathjsonToExcel(input);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Special functions', () => {
  const specialTestCases: [string, Expression, string][] = [
    ['factorial: 5!', ['Factorial', 5], '=FACT(5)'],
    ['factorial: n!', ['Factorial', 'n'], '=FACT(n)'],
    ['double factorial: 5!!', ['Factorial2', 5], '=FACTDOUBLE(5)'],
    ['double factorial: n!!', ['Factorial2', 'n'], '=FACTDOUBLE(n)'],
    ['gamma: Gamma(x)', ['Gamma', 'x'], '=GAMMA(x)'],
    ['gamma: Gamma(5)', ['Gamma', 5], '=GAMMA(5)'],
    ['rational: a/b', ['Rational', 'a', 'b'], '=(a/b)'],
    ['mod(x, y)', ['Mod', 'x', 'y'], '=MOD(x, y)'],
    ['mod(17, 5)', ['Mod', 17, 5], '=MOD(17, 5)'],
    ['lcm(a, b)', ['LCM', 'a', 'b'], '=LCM(a,b)'],
  ];

  test.each(specialTestCases)('should handle %s', (_desc, input, expected) => {
    const result = mathjsonToExcel(input);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Complex numbers', () => {
  const complexTestCases: [string, Expression, string][] = [
    ['complex(a, b)', ['Complex', 'a', 'b'], '=COMPLEX(a,b)'],
    ['real part: Re(z)', ['Real', 'z'], '=IMREAL(z)'],
    ['imaginary part: Im(z)', ['Imaginary', 'z'], '=IMAGINARY(z)'],
    ['conjugate: conj(z)', ['Conjugate', 'z'], '=IMCONJUGATE(z)'],
    ['arg: arg(z)', ['Arg', 'z'], '=IMARGUMENT(z)'],
    ['magnitude: |z|', ['Magnitude', 'z'], '=IMABS(z)'],
    ['norm: ||z||', ['Norm', 'z'], '=IMABS(z)'],
    ['argument: arg(z)', ['Argument', 'z'], '=IMARGUMENT(z)'],
  ];

  test.each(complexTestCases)('should handle %s', (_desc, input, expected) => {
    const result = mathjsonToExcel(input);
    expect(result).toBe(expected);
  });
});

describe('mathjsonToExcel - Variable mapping', () => {
  test('should map simple variable', () => {
    const mathJson: Expression = 'x';
    const varMap = { x: 'A1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=A1');
  });

  test('should map multiple variables: x+y', () => {
    const mathJson: Expression = ['Add', 'x', 'y'];
    const varMap = { x: 'A1', y: 'B1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=(A1+B1)');
  });

  test('should map in complex expression: ax^2+bx+c', () => {
    const mathJson: Expression = ['Add',
      ['Multiply', 'a', ['Power', 'x', 2]],
      ['Multiply', 'b', 'x'],
      'c'];
    const varMap = { a: 'A1', b: 'B1', c: 'C1', x: 'D1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=((A1*(D1^2))+(B1*D1)+C1)');
  });

  test('should map in trigonometric functions: sin(x)+cos(y)', () => {
    const mathJson: Expression = ['Add', ['Sin', 'x'], ['Cos', 'y']];
    const varMap = { x: 'A1', y: 'B1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=(SIN(A1)+COS(B1))');
  });

  test('should leave unmapped variables as-is', () => {
    const mathJson: Expression = ['Add', 'x', 'y', 'z'];
    const varMap = { x: 'A1', y: 'B1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=(A1+B1+z)');
  });

  test('should map in nested expressions', () => {
    const mathJson: Expression = ['Divide',
      ['Add', ['Negate', 'b'], ['Sqrt', ['Subtract', ['Power', 'b', 2], ['Multiply', 4, 'a', 'c']]]],
      ['Multiply', 2, 'a']];
    const varMap = { a: 'A1', b: 'B1', c: 'C1' };
    const result = mathjsonToExcel(mathJson, varMap);
    expect(result).toBe('=(((-B1)+SQRT(((B1^2)-(4*A1*C1))))/(2*A1))');
  });
});

describe('mathjsonToExcel - Edge cases and complex expressions', () => {
  test('should handle deeply nested parentheses', () => {
    const mathJson: Expression = ['Add', ['Add', ['Add', 1, 2], 3], 4];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=(((1+2)+3)+4)');
  });

  test('should handle mixed operations: (a+b)*(c-d)/(e^f)', () => {
    const mathJson: Expression = ['Divide',
      ['Multiply', ['Add', 'a', 'b'], ['Subtract', 'c', 'd']],
      ['Power', 'e', 'f']];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=(((a+b)*(c-d))/(e^f))');
  });

  test('should handle towering exponents: a^(b^(c^d))', () => {
    const mathJson: Expression = ['Power', 'a', ['Power', 'b', ['Power', 'c', 'd']]];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=(a^(b^(c^d)))');
  });

  test('should handle nested radicals: sqrt(a^2+sqrt(b^2+c^2))', () => {
    const mathJson: Expression = ['Sqrt',
      ['Add', ['Power', 'a', 2],
        ['Sqrt', ['Add', ['Power', 'b', 2], ['Power', 'c', 2]]]]];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=SQRT(((a^2)+SQRT(((b^2)+(c^2)))))');
  });

  test('should handle multiple subscripts in expression', () => {
    const mathJson: Expression = ['Add',
      ['Subscript', 'a', 'i'],
      ['Subscript', 'b', 'j'],
      ['Subscript', 'c', 'k']];
    const result = mathjsonToExcel(mathJson);
    expect(result).toBe('=(a_i+b_j+c_k)');
  });
});
