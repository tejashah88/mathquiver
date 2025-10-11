import { splitVarUnits } from '@/logic/split-var-units';

describe('Split Variable and Units from LaTeX Expression', () => {
  const testCases = [
    // Basic variables without units
    String.raw`x`,
    String.raw`y_1`,
    String.raw`\theta`,
    String.raw`F_{net}`,
    String.raw`v_x^2`,

    // Variables with units using \left\lbrack and \right\rbrack
    String.raw`x\left\lbrack m\right\rbrack`,
    String.raw`v\left\lbrack m/s\right\rbrack`,
    String.raw`a\left\lbrack m/s^2\right\rbrack`,
    String.raw`F\left\lbrack N\right\rbrack`,
    String.raw`E\left\lbrack J\right\rbrack`,

    // Variables with subscripts and units
    String.raw`x_0\left\lbrack m\right\rbrack`,
    String.raw`v_i\left\lbrack m/s\right\rbrack`,
    String.raw`\theta_1\left\lbrack rad\right\rbrack`,
    String.raw`F_{net}\left\lbrack N\right\rbrack`,

    // Variables with superscripts and units
    String.raw`x^2\left\lbrack m^2\right\rbrack`,
    String.raw`v^{max}\left\lbrack m/s\right\rbrack`,

    // Variables with both subscripts and superscripts with units
    String.raw`a_{x}^{2}\left\lbrack m/s^2\right\rbrack`,
    String.raw`F_{net}^{total}\left\lbrack N\right\rbrack`,

    // Variables with units using \right. delimiter
    String.raw`P\left\lbrack Pa\right.`,
    String.raw`\rho\left\lbrack kg/m^3\right.`,

    // Complex units
    String.raw`\sigma\left\lbrack N/m^2\right\rbrack`,
    String.raw`G\left\lbrack N\cdot m^2/kg^2\right\rbrack`,
    String.raw`k\left\lbrack J/K\right\rbrack`,
    String.raw`c\left\lbrack m/s\right\rbrack`,

    // Greek letters with units
    String.raw`\alpha\left\lbrack rad/s^2\right\rbrack`,
    String.raw`\omega\left\lbrack rad/s\right\rbrack`,
    String.raw`\lambda\left\lbrack m\right\rbrack`,
    String.raw`\mu\left\lbrack kg\right\rbrack`,

    // Empty or edge cases
    String.raw``,
    String.raw`x\left\lbrack\right\rbrack`,
    String.raw`y\left\lbrack\right.`,

    // Multiple bracket patterns (should only take first)
    String.raw`x\left\lbrack m\right\rbrack\left\lbrack s\right\rbrack`,
  ];

  const expectedResults = [
    // Basic variables without units
    { latexVar: 'x', units: '' },
    { latexVar: 'y_1', units: '' },
    { latexVar: '\\theta', units: '' },
    { latexVar: 'F_{net}', units: '' },
    { latexVar: 'v_x^2', units: '' },

    // Variables with units using \left\lbrack and \right\rbrack
    { latexVar: 'x', units: 'm' },
    { latexVar: 'v', units: 'm/s' },
    { latexVar: 'a', units: 'm/s^2' },
    { latexVar: 'F', units: 'N' },
    { latexVar: 'E', units: 'J' },

    // Variables with subscripts and units
    { latexVar: 'x_0', units: 'm' },
    { latexVar: 'v_i', units: 'm/s' },
    { latexVar: '\\theta_1', units: 'rad' },
    { latexVar: 'F_{net}', units: 'N' },

    // Variables with superscripts and units
    { latexVar: 'x^2', units: 'm^2' },
    { latexVar: 'v^{max}', units: 'm/s' },

    // Variables with both subscripts and superscripts with units
    { latexVar: 'a_{x}^{2}', units: 'm/s^2' },
    { latexVar: 'F_{net}^{total}', units: 'N' },

    // Variables with units using \right. delimiter
    { latexVar: 'P', units: 'Pa' },
    { latexVar: '\\rho', units: 'kg/m^3' },

    // Complex units
    { latexVar: '\\sigma', units: 'N/m^2' },
    { latexVar: 'G', units: 'N\\cdot m^2/kg^2' },
    { latexVar: 'k', units: 'J/K' },
    { latexVar: 'c', units: 'm/s' },

    // Greek letters with units
    { latexVar: '\\alpha', units: 'rad/s^2' },
    { latexVar: '\\omega', units: 'rad/s' },
    { latexVar: '\\lambda', units: 'm' },
    { latexVar: '\\mu', units: 'kg' },

    // Empty or edge cases
    { latexVar: '', units: '' },
    { latexVar: 'x', units: '' },
    { latexVar: 'y', units: '' },

    // Multiple bracket patterns (should only take first)
    { latexVar: 'x', units: 'm' },
  ];

  const testScenarios: [string, { latexVar: string; units: string }][] = [];
  for (let i = 0; i < testCases.length; i++)
    testScenarios.push([testCases[i], expectedResults[i]]);

  test.each(testScenarios)('valid: %s => %s', (input, expected) => {
    const result = splitVarUnits(input);
    expect(result).toEqual(expected);
  });
});
