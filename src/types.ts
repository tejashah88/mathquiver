type EquationItem = { id: string; latex: string };
// NOTE: _latexRender is an ugly way to avoid coupling the variables to the input form
type VariableItem = { id: string; latexVar: string; units: string, excelVar: string; _latexRender: string };

// Custom types
type ConstantMapping = {
  [key: string]: string;
};

type ActionMapping = {
  [key: string]: {
    type: string,
    name?: string,
    symbol?: string,
    custom?: (args: string[]) => string
  }
};

type VarMapping = {
  [key: string]: string
};

export type {
    ConstantMapping,
    ActionMapping,
    VarMapping,
    EquationItem,
    VariableItem,
};
