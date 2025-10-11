// README: This file MUST remain in JS mode. Since Mathlive has the ability to load the compute library at will,
// there is most likely a discrepancy between the version of compute engine installed separated, compared
// to the version of compute engine packed into Mathlive for type checking purposes. TypeScript cannot resolve
// these differences due to mismatched properties between the ComputeEngine classes.

// To double check, type `npm list @cortex-js/compute-engine mathlive`

const EXCLUDE_FUNCTIONS = [
    'D', // Defaults to D() derivative function
    'N', // Defaults to N() numerical approx function
];

const EXCLUDE_CONSTANTS = ['CatalanConstant', 'GoldenRatio', 'EulerGamma'];

function setupExtendedAlgebraMode(ce) {
    // Disable the single character functions to allow normal algebra usage
    EXCLUDE_FUNCTIONS.forEach(funcName => ce.declare(funcName, 'unknown'));

    // Disable defined constants to ensure Excel conversion works in a more algebraic manner
    ce.latexDictionary = ce.latexDictionary.filter(entry => !EXCLUDE_CONSTANTS.includes(entry.name));

    return ce;
}

export { setupExtendedAlgebraMode };
