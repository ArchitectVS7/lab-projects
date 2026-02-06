import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      // Override module resolution for tests (jest doesn't support NodeNext .js imports)
      diagnostics: { ignoreDiagnostics: [151001, 151002] },
    }],
  },
  moduleNameMapper: {
    // Strip .js extensions from imports so ts-jest can resolve .ts files
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/tests/**/*.test.ts'],
  verbose: true,
};

export default config;
