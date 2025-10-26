import { ConstantMapping, ActionMapping, VarMapping } from '@/types';
import { Expression } from 'mathlive';


// Modified from https://rclayton.silvrback.com/custom-errors-in-node-js
export class MJEXTranslateError extends Error {
  constructor(message = '') {
    super(message);

    // External Note: Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;

    // External Note: This clips the constructor invocation from the stack trace.
    Error.captureStackTrace(this, this.constructor);
  }
}


// NOTE: Any future defined constants should have maximum 15 digits after decimal point (to match Excel's standards)
const MATHJSON_CONSTANTS: ConstantMapping = {
  Pi: 'PI()',
  ExponentialE: 'EXP(1)',
  CatalanConstant: '0.915965594177219',
  GoldenRatio: '((1+SQRT(5))/2)',
  EulerGamma: '0.577215664901533',
  ImaginaryUnit: 'COMPLEX(0,1)',
  PositiveInfinity : '1E+307',
  NegativeInfinity: '-1E+307',
} as const;


const MATHJSON_FUNCTIONS: ActionMapping = {
  // Basics
  'Negate': { type: 'function', custom: (args: string[]) => `(-${args[0]})` },
  'Parentheses': { type: 'function', custom: (args: string[]) => `(${args[0]})` },
  'Subscript': { type: 'function', custom: (args: string[]) => `${args[0]}_${args[1]}` },

  // Arithmetic
  'Add': { type: 'operator', symbol: '+' },
  'Subtract': { type: 'operator', symbol: '-' },
  'Multiply': { type: 'operator', symbol: '*' },
  'Divide': { type: 'operator', symbol: '/' },
  'Square': { type: 'function', custom: (args: string[]) => `(${args[0]}^2` },
  'Power': { type: 'operator', symbol: '^' },
  'Sqrt': { type: 'function', name: 'SQRT' },
  'Root': { type: 'function', custom: (args: string[]) => `(${args[0]}^(1/${args[1]}))` },

  // Special functions
  'Factorial': { type: 'function', name: 'FACT' },
  'Factorial2': { type: 'function', name: 'FACTDOUBLE' },
  'Gamma': { type: 'function', name: 'GAMMA' },

  // Trigonometry
  'Sin': { type: 'function', name: 'SIN' },
  'Cos': { type: 'function', name: 'COS' },
  'Tan': { type: 'function', name: 'TAN' },
  'Csc': { type: 'function', name: 'CSC' },
  'Sec': { type: 'function', name: 'SEC' },
  'Cot': { type: 'function', name: 'COT' },

  // Inverse Trigonometry
  'Arcsin': { type: 'function', name: 'ASIN' },
  'Arccos': { type: 'function', name: 'ACOS' },
  'Arctan': { type: 'function', name: 'ATAN' },
  'Acsc': { type: 'function', name: 'ACSC' },
  'Asec': { type: 'function', name: 'ASEC' },
  'Acot': { type: 'function', name: 'ACOT' },

  // Hyperbolic Trigonometry
  'Sinh': { type: 'function', name: 'SINH' },
  'Cosh': { type: 'function', name: 'COSH' },
  'Tanh': { type: 'function', name: 'TANH' },
  'Csch': { type: 'function', name: 'CSCH' },
  'Sech': { type: 'function', name: 'SECH' },
  'Coth': { type: 'function', name: 'COTH' },

  // Inverse Hyperbolic Trigonometry
  'Arsinh': { type: 'function', name: 'ASINH' },
  'Arcosh': { type: 'function', name: 'ACOSH' },
  'Artanh': { type: 'function', name: 'ATANH' },
  'Acsch': { type: 'function', name: 'ACSCH' },
  'Asech': { type: 'function', name: 'ASECH' },
  'Arcoth': { type: 'function', name: 'ACOTH' },

  // Transcendental Functions
  'Exp': { type: 'function', name: 'EXP' },
  'Ln': { type: 'function', name: 'LN' },
  'Log': { type: 'function', name: 'LOG' },
  'Lb': { type: 'function', custom: (args: string[]) => `LOG(${args[0]},2)` },
  'Lg': { type: 'function', custom: (args: string[]) => `LOG(${args[0]})` },
  'LogOnePlus': { type: 'function', custom: (args: string[]) => `LN(${args[0]} + 1)` },

  // Rounding
  'Abs': { type: 'function', name: 'ABS' },
  'Ceil': { type: 'function', custom: (args: string[]) => `CEILING.MATH(${args[0]},1)` },
  'Floor': { type: 'function', custom: (args: string[]) => `FLOOR(${args[0]},1)` },

  // Extra Functions
  'Rational': { type: 'function', custom: (args: string[]) => `(${args[0]}/${args[1]})` },
  'Mod': { type: 'function', custom: (args: string[]) => `MOD(${args[0]}, ${args[1]})` },
  // BUG: Currently broken, see https://github.com/arnog/mathlive/issues/2858
  // GCD: { type: 'function', name: 'GCD' },
  'LCM': { type: 'function', name: 'LCM' },

  // Complex Numbers
  'Complex': { type: 'function', name: 'COMPLEX' },
  'Real': { type: 'function', name: 'IMREAL' },
  'Imaginary': { type: 'function', name: 'IMAGINARY' },
  'Conjugate': { type: 'function', name: 'IMCONJUGATE' },
  'Arg': { type: 'function', name: 'IMARGUMENT' },
  'Magnitude': { type: 'function', name: 'IMABS' },
  'Norm': { type: 'function', name: 'IMABS' },
  'Argument': { type: 'function', name: 'IMARGUMENT' },
} as const;


// Originally authored by ChatGPT as of 09/19/2025

/**
* Internal recursive function to convert a MathJSON expression to Excel formula syntax.
*
* Handles numbers, variables, constants, and function/operator expressions by recursively
* processing the MathJSON tree structure.
*
* @param node - The MathJSON expression node to convert
* @param varMap - Optional mapping of variable names to Excel cell references
* @returns Excel formula string (without the leading '=' sign)
* @throws {MJEXTranslateError} If an unsupported operator or unknown node type is encountered
*/
function convertMjsonToExcel(node: Expression, varMap: VarMapping = {}): string {
  if (typeof node === 'number') return node.toString();

  // Handle variables & constants
  if (typeof node === 'string') {
    if (MATHJSON_CONSTANTS[node]) return MATHJSON_CONSTANTS[node];
    return varMap[node] || node;
  }

  if (Array.isArray(node)) {
    const [op, ...args] = node;
    const mapping = MATHJSON_FUNCTIONS[op];
    if (!mapping) throw new MJEXTranslateError(`Unsupported operator: ${op}`);

    const excelArgs = args.map(arg => convertMjsonToExcel(arg, varMap));
    if (mapping.type === 'operator') return `(${excelArgs.join(mapping.symbol)})`;
    if (mapping.type === 'function') {
      if (mapping.name) return `${mapping.name}(${excelArgs.join(',')})`;
      if (mapping.custom) return mapping.custom(excelArgs);
    }
  }

  throw new MJEXTranslateError(`Unknown node type: ${node}`);
}


/**
* Converts a MathJSON expression to an Excel formula.
*
* Translates MathJSON (MathLive's internal representation) into Excel-compatible
* formula syntax, mapping mathematical operators and functions to their Excel equivalents.
* Returns a complete formula string with leading '=' sign.
*
* @param mathJson - The MathJSON expression to convert
* @param varMap - Optional mapping of variable names to Excel cell references
* @returns Complete Excel formula string starting with '='
* @throws {MJEXTranslateError} If the expression contains unsupported operations
*/
export function mathjsonToExcel(mathJson: Expression, varMap: VarMapping = {}): string {
  return '=' + convertMjsonToExcel(mathJson, varMap);
}
