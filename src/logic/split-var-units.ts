/**
* Splits a variable expression into its base LaTeX variable and units.
*
* Parses expressions containing units in square brackets (e.g., "x\\left\\lbrack m/s\\right\\rbrack")
* and separates the variable from its units.
*
* @param varExpr - The variable expression string in LaTeX format
* @returns Object containing the base variable and units (units will be empty string if none found)
*/
export function splitVarUnits(varExpr: string) {
  const fragments = varExpr.split(/\\left\\lbrack|\\right\\rbrack|\\right\./g);

  const latexVar = fragments[0];
  const unitsArr = fragments.slice(1).filter(frag => !!frag);
  const units = unitsArr.length > 0 ? unitsArr[0].trim() : '';

  return { latexVar, units };
}
