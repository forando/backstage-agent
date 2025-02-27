import type { Config } from 'jest';
import * as tsconfig from './tsconfig.json';
import { pathsToModuleNameMapper } from 'ts-jest';

const config: Config = {
  testEnvironment: 'node',
  collectCoverage: true,
  clearMocks: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  reporters: ['default', ['jest-junit', { outputDirectory: './coverage' }]],
  coverageReporters: ['text', 'lcov', 'cobertura'],
  preset: 'ts-jest',
  moduleFileExtensions: ['js', 'ts', 'd.ts', 'json'],
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  setupFiles: ['<rootDir>/functions/common/setupEnv.ts']
};

export default config;
