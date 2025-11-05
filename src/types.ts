type EquationItem = { id: string; latex: string };
// NOTE: _latexRender is an ugly way to avoid coupling the variables to the input form
type VariableItem = { id: string; latexVar: string; units: string, excelVar: string; _latexRender: string };
type CondensedVariableItem = { latexVar: string; excelVar: string;  };

// Custom types
type ConversionContext = 'default' | 'subscript';

type ConstantMapping = {
  [key: string]: string;
};

type ActionMapping = {
  [key: string]: {
    type: string,
    name?: string,
    symbol?: string,
    custom?: (args: string[], context?: ConversionContext) => string
  }
};

type VarMapping = {
  [key: string]: string
};

export type {
    ConversionContext,
    ConstantMapping,
    ActionMapping,
    VarMapping,
    EquationItem,
    VariableItem,
    CondensedVariableItem,
};
