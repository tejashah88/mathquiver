import { splitVarUnits } from '@/logic/split-var-units';

describe('Split Variable and Units from LaTeX Expression', () => {
  const testCases: [string, { latexVar: string; units: string }][] = [
    // Basic variables without units
    [String.raw`x`, { latexVar: 'x', units: '' }],
    [String.raw`y_1`, { latexVar: 'y_1', units: '' }],
    [String.raw`\theta`, { latexVar: '\\theta', units: '' }],
    [String.raw`F_{net}`, { latexVar: 'F_{net}', units: '' }],
    [String.raw`v_x^2`, { latexVar: 'v_x^2', units: '' }],

    // Variables with units using \left\lbrack and \right\rbrack
    [String.raw`x\left\lbrack m\right\rbrack`, { latexVar: 'x', units: 'm' }],
    [String.raw`v\left\lbrack m/s\right\rbrack`, { latexVar: 'v', units: 'm/s' }],
    [String.raw`a\left\lbrack m/s^2\right\rbrack`, { latexVar: 'a', units: 'm/s^2' }],
    [String.raw`F\left\lbrack N\right\rbrack`, { latexVar: 'F', units: 'N' }],
    [String.raw`E\left\lbrack J\right\rbrack`, { latexVar: 'E', units: 'J' }],

    // Variables with subscripts and units
    [String.raw`x_0\left\lbrack m\right\rbrack`, { latexVar: 'x_0', units: 'm' }],
    [String.raw`v_i\left\lbrack m/s\right\rbrack`, { latexVar: 'v_i', units: 'm/s' }],
    [String.raw`\theta_1\left\lbrack rad\right\rbrack`, { latexVar: '\\theta_1', units: 'rad' }],
    [String.raw`F_{net}\left\lbrack N\right\rbrack`, { latexVar: 'F_{net}', units: 'N' }],

    // Variables with superscripts and units
    [String.raw`x^2\left\lbrack m^2\right\rbrack`, { latexVar: 'x^2', units: 'm^2' }],
    [String.raw`v^{max}\left\lbrack m/s\right\rbrack`, { latexVar: 'v^{max}', units: 'm/s' }],

    // Variables with both subscripts and superscripts with units
    [String.raw`a_{x}^{2}\left\lbrack m/s^2\right\rbrack`, { latexVar: 'a_{x}^{2}', units: 'm/s^2' }],
    [String.raw`F_{net}^{total}\left\lbrack N\right\rbrack`, { latexVar: 'F_{net}^{total}', units: 'N' }],

    // Variables with units using \right. delimiter
    [String.raw`P\left\lbrack Pa\right.`, { latexVar: 'P', units: 'Pa' }],
    [String.raw`\rho\left\lbrack kg/m^3\right.`, { latexVar: '\\rho', units: 'kg/m^3' }],

    // Complex units
    [String.raw`\sigma\left\lbrack N/m^2\right\rbrack`, { latexVar: '\\sigma', units: 'N/m^2' }],
    [String.raw`G\left\lbrack N\cdot m^2/kg^2\right\rbrack`, { latexVar: 'G', units: 'N\\cdot m^2/kg^2' }],
    [String.raw`k\left\lbrack J/K\right\rbrack`, { latexVar: 'k', units: 'J/K' }],
    [String.raw`c\left\lbrack m/s\right\rbrack`, { latexVar: 'c', units: 'm/s' }],

    // Greek letters with units
    [String.raw`\alpha\left\lbrack rad/s^2\right\rbrack`, { latexVar: '\\alpha', units: 'rad/s^2' }],
    [String.raw`\omega\left\lbrack rad/s\right\rbrack`, { latexVar: '\\omega', units: 'rad/s' }],
    [String.raw`\lambda\left\lbrack m\right\rbrack`, { latexVar: '\\lambda', units: 'm' }],
    [String.raw`\mu\left\lbrack kg\right\rbrack`, { latexVar: '\\mu', units: 'kg' }],

    // Empty or edge cases
    [String.raw``, { latexVar: '', units: '' }],
    [String.raw`x\left\lbrack\right\rbrack`, { latexVar: 'x', units: '' }],
    [String.raw`y\left\lbrack\right.`, { latexVar: 'y', units: '' }],

    // Multiple bracket patterns (should only take first)
    [String.raw`x\left\lbrack m\right\rbrack\left\lbrack s\right\rbrack`, { latexVar: 'x', units: 'm' }],
  ];

  test.each(testCases)('valid: %s => %s', (input, expected) => {
    const result = splitVarUnits(input);
    expect(result).toEqual(expected);
  });
});
