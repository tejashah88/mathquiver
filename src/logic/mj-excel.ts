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


const LATEX_CONSTANTS: ConstantMapping = {
    // Pi
    pi: 'PI()',
    Pi: 'PI()',
    PI: 'PI()',

    // Euler's number
    e: 'EXP(1)',
    E: 'EXP(1)',

    // Golden ratio
    phi: '((1+SQRT(5))/2)',
    varphi: '((1+SQRT(5))/2)',
    Phi: '((1+SQRT(5))/2)',

    // Euler–Mascheroni constant
    gamma: '0.5772156649',
    EulerGamma: '0.5772156649',
    Gamma: '0.5772156649',

    // Imaginary unit
    i: 'COMPLEX(0,1)',
    j: 'COMPLEX(0,1)',

    // Infinity
    infty: '1E+307',
    infinity: '1E+307',
    Infinity: '1E+307'
};


const MATHJSON_TO_EXCEL: ActionMapping = {
    // Arithmetic
    Add: { type: 'operator', symbol: '+' },
    Subtract: { type: 'operator', symbol: '-' },
    Multiply: { type: 'operator', symbol: '*' },
    Divide: { type: 'operator', symbol: '/' },
    Power: { type: 'operator', symbol: '^' },

    // Negation
    Negate: { type: 'function', custom: (args: string[]) => `(-${args[0]})` },

    // Parentheses (force explicit grouping)
    Parentheses: { type: 'function', custom: (args: string[]) => `(${args[0]})` },

    // Rational numbers
    Rational: { type: 'function', custom: (args: string[]) => `(${args[0]}/${args[1]})` },

    // Roots
    Sqrt: { type: 'function', name: 'SQRT' },
    Root: { type: 'function', custom: (args: string[]) => `(${args[0]}^(1/${args[1]}))` },

    // Trigonometry
    Sin: { type: 'function', name: 'SIN' },
    Cos: { type: 'function', name: 'COS' },
    Tan: { type: 'function', name: 'TAN' },
    Csc: { type: 'function', custom: (args: string[]) => `1/SIN(${args[0]})` },
    Sec: { type: 'function', custom: (args: string[]) => `1/COS(${args[0]})` },
    Cot: { type: 'function', custom: (args: string[]) => `1/TAN(${args[0]})` },

    // Exponentials & logs
    Exp: { type: 'function', name: 'EXP' },
    Ln: { type: 'function', name: 'LN' },
    Log: { type: 'function', name: 'LOG10' },

    // Absolute & rounding
    Abs: { type: 'function', name: 'ABS' },
    Floor: { type: 'function', custom: (args: string[]) => `FLOOR(${args[0]},1)` },
    Ceil: { type: 'function', custom: (args: string[]) => `CEILING(${args[0]},1)` },

    // Min/Max
    Min: { type: 'function', name: 'MIN' },
    Max: { type: 'function', name: 'MAX' }
};


function _mathjsonToExcel(node: Expression, varMap: VarMapping = {}): string {
    if (typeof node === 'number') return node.toString();

    // Handle constants
    if (typeof node === 'string') {
        if (LATEX_CONSTANTS[node]) return LATEX_CONSTANTS[node];
        return varMap[node] || node;
    }

    if (Array.isArray(node)) {
        const [op, ...args] = node;
        const mapping = MATHJSON_TO_EXCEL[op];
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


export { checkMathjsonToExcel, mathjsonToExcel, MjTranslateError };
