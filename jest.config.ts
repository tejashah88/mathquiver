/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest';
import nextJest from 'next/jest.js';


const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});


const config: Config = {
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'v8',

  // Make calling deprecated APIs throw helpful error messages
  errorOnDeprecated: true,

  // Import extended matcher clauses
  setupFilesAfterEnv: ['jest-extended/all'],

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // The test environment that will be used for testing
  testEnvironment: 'jsdom',
};

export default createJestConfig(config);
