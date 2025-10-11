import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import requireExplicitGenerics from 'eslint-plugin-require-explicit-generics';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: [
      'next/typescript',
      'next/core-web-vitals',
    ],
    ignorePatterns: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
  }),
  {
    plugins: {
      'require-explicit-generics': requireExplicitGenerics,
    },
    rules: {
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
        'forwardRef',
        'memo',
        'useRef',
        'useImperativeHandle',
      ]],
    },
  },
];

export default eslintConfig;
