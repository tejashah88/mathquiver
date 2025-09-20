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


export type { ConstantMapping, ActionMapping, VarMapping };
