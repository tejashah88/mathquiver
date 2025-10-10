function splitVarUnits(varExpr: string) {
    const fragments = varExpr.split(/\\left\\lbrack|\\right\\rbrack|\\right\./g);

    const latexVar = fragments[0];
    const unitsArr = fragments.slice(1).filter(frag => !!frag);
    const units = unitsArr.length > 0 ? unitsArr[0] : '';

    return { latexVar, units };
}

export { splitVarUnits };
