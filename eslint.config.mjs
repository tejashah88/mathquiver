import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import requireExplicitGenerics from 'eslint-plugin-require-explicit-generics';
import reactCompiler from 'eslint-plugin-react-compiler';


const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    'node_modules/**',
    'mathlive/**',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    plugins: {
      'react-compiler': reactCompiler,
      'require-explicit-generics': requireExplicitGenerics,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'jsx-quotes': ['warn', 'prefer-double'],
      'no-console': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn'],
      'no-var': 'error',
      'prefer-const': ['warn', { 'destructuring': 'any', 'ignoreReadBeforeAssign': false }],
      'quotes': ['warn', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
      'require-await': 'error',
      'semi': ['warn', 'always'],
      'strict': ['error', 'global'],
      'require-explicit-generics/require-explicit-generics': ['error', [
        'useState',
        'useReducer',
        'useContext',
        'createContext',
        'useRef',
      ]],
    },
  },
]);

export default eslintConfig;
