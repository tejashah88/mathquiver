import { Expression } from 'mathlive';
import { ConstantMapping, ActionMapping, VarMapping } from './types';


// Modified from https://rclayton.silvrback.com/custom-errors-in-node-js
class MjTranslateError extends Error {
    constructor(message = '') {
        super(message);

        // External Note: Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;

        // External Note: This clips the constructor invocation from the stack trace.
        Error.captureStackTrace(this, this.constructor);
    }
}


// NOTE: Any future defined constants should have 15 significant digits (to match Excel's standards)
const MATHJSON_CONSTANTS: ConstantMapping = {
    Pi: 'PI()',
    ExponentialE: 'EXP(1)',
    CatalanConstant: '0.915965594177219',
    GoldenRatio: '((1+SQRT(5))/2)',
    EulerGamma: '0.577215664901533',
    ImaginaryUnit: 'COMPLEX(0,1)',
    PositiveInfinity : '1E+307',
    NegativeInfinity: '-1E+307',
};


const MATHJSON_FUNCTIONS: ActionMapping = {
    // Basics
    Negate: { type: 'function', custom: (args: string[]) => `(-${args[0]})` },
    Parentheses: { type: 'function', custom: (args: string[]) => `(${args[0]})` },

    // Arithmetic
    Add: { type: 'operator', symbol: '+' },
    Subtract: { type: 'operator', symbol: '-' },
    Multiply: { type: 'operator', symbol: '*' },
    Divide: { type: 'operator', symbol: '/' },
    Square: { type: 'function', custom: (args: string[]) => `(${args[0]}^2` },
    Power: { type: 'operator', symbol: '^' },
    Sqrt: { type: 'function', name: 'SQRT' },
    Root: { type: 'function', custom: (args: string[]) => `(${args[0]}^(1/${args[1]}))` },

    // Trigonometry
    Sin: { type: 'function', name: 'SIN' },
    Cos: { type: 'function', name: 'COS' },
    Tan: { type: 'function', name: 'TAN' },
    Csc: { type: 'function', name: 'CSC' },
    Sec: { type: 'function', name: 'SEC' },
    Cot: { type: 'function', name: 'COT' },

    // Inverse Trigonometry
    Arcsin: { type: 'function', name: 'ASIN' },
    Arccos: { type: 'function', name: 'ACOS' },
    Arctan: { type: 'function', name: 'ATAN' },
    Acsc: { type: 'function', name: 'ACSC' },
    Asec: { type: 'function', name: 'ASEC' },
    Acot: { type: 'function', name: 'ACOT' },

    // Hyperbolic Trigonometry
    Sinh: { type: 'function', name: 'SINH' },
    Cosh: { type: 'function', name: 'COSH' },
    Tanh: { type: 'function', name: 'TANH' },
    Csch: { type: 'function', name: 'CSCH' },
    Sech: { type: 'function', name: 'SECH' },
    Coth: { type: 'function', name: 'COTH' },

    // Inverse Hyperbolic Trigonometry
    Arsinh: { type: 'function', name: 'ASINH' },
    Arcosh: { type: 'function', name: 'ACOSH' },
    Artanh: { type: 'function', name: 'ATANH' },
    Acsch: { type: 'function', name: 'ACSCH' },
    Asech: { type: 'function', name: 'ASECH' },
    Arcoth: { type: 'function', name: 'ACOTH' },

    // Transcendental Functions
    Exp: { type: 'function', name: 'EXP' },
    Ln: { type: 'function', name: 'LN' },
    Log: { type: 'function', name: 'LOG' },
    Lb: { type: 'function', custom: (args: string[]) => `LOG(${args[0]},2)` },
    Lg: { type: 'function', custom: (args: string[]) => `LOG(${args[0]})` },
    LogOnePlus: { type: 'function', custom: (args: string[]) => `LN(${args[0]} + 1)` },

    // Rounding
    Abs: { type: 'function', name: 'ABS' },
    Ceil: { type: 'function', custom: (args: string[]) => `CEILING.MATH(${args[0]},1)` },
    Floor: { type: 'function', custom: (args: string[]) => `FLOOR(${args[0]},1)` },

    // Extra Functions
    Rational: { type: 'function', custom: (args: string[]) => `(${args[0]}/${args[1]})` },
    Mod: { type: 'function', custom: (args: string[]) => `MOD(${args[0]}, ${args[1]})` },
    // Currently broken, see https://github.com/arnog/mathlive/issues/2858
    // GCD: { type: 'function', name: 'GCD' },
    LCM: { type: 'function', name: 'LCM' },

    // Complex Numbers
    Complex: { type: 'function', name: 'COMPLEX' },
    Real: { type: 'function', name: 'IMREAL' },
    Imaginary: { type: 'function', name: 'IMAGINARY' },
    Conjugate: { type: 'function', name: 'IMCONJUGATE' },
    Magnitude: { type: 'function', name: 'IMABS' },
    Norm: { type: 'function', name: 'IMABS' },
    Argument: { type: 'function', name: 'IMARGUMENT' },

    // Statistics
    Median: { type: 'function', name: 'MEDIAN' },
    Mean: { type: 'function', name: 'AVERAGE' },
    Min: { type: 'function', name: 'MIN' },
    Max: { type: 'function', name: 'MAX' },
    Mode: { type: 'function', name: 'MODE.SNGL' },
    PopulationStandardDeviation: { type: 'function', name: 'STDEV.P' },
    StandarDeviation: { type: 'function', name: 'STDEV.S' },
    Variance: { type: 'function', name: 'VAR.P' },
};


function _mathjsonToExcel(node: Expression, varMap: VarMapping = {}): string {
    if (typeof node === 'number') return node.toString();

    // Handle constants
    if (typeof node === 'string') {
        if (MATHJSON_CONSTANTS[node]) return MATHJSON_CONSTANTS[node];
        return varMap[node] || node;
    }

    if (Array.isArray(node)) {
        const [op, ...args] = node;
        const mapping = MATHJSON_FUNCTIONS[op];
        if (!mapping) throw new MjTranslateError(`Unsupported operator: ${op}`);

        const excelArgs = args.map(arg => _mathjsonToExcel(arg, varMap));
        if (mapping.type === 'operator') return `(${excelArgs.join(mapping.symbol)})`;
        if (mapping.type === 'function') {
            if (mapping.name) return `${mapping.name}(${excelArgs.join(',')})`;
            if (mapping.custom) return mapping.custom(excelArgs);
        }
    }

    throw new MjTranslateError(`Unknown node type: ${node}`);
}


function checkMathjsonToExcel(mathJson: Expression, varMap: VarMapping = {}): boolean {
    try {
        _mathjsonToExcel(mathJson, varMap);
        return true;
    } catch {
        return false;
    }
}


function mathjsonToExcel(mathJson: Expression, varMap: VarMapping = {}): string {
    const excelFormula = _mathjsonToExcel(mathJson, varMap);
    return '=' + excelFormula;
}


export {
    MATHJSON_CONSTANTS,
    MATHJSON_FUNCTIONS,
    checkMathjsonToExcel,
    mathjsonToExcel,
    MjTranslateError
};
