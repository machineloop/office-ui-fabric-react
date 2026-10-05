'use strict';
const path = require('node:path');
const { pathsToModuleNameMapper } = require('../../../../../../../node_modules/ts-jest');
const repo = path.resolve(__dirname, '../../../../../../..');
const library = path.resolve(__dirname, '../../..');
const base = require('../../../jest.config.cjs');
const preset = require(path.join(repo, 'jest.preset.js'));
module.exports = {
  ...preset,
  ...base,
  rootDir: library,
  preset: undefined,
  cacheDirectory: path.join(__dirname, '.runner-temp/jest-cache'),
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    ...pathsToModuleNameMapper(require(path.join(repo, 'tsconfig.base.json')).compilerOptions.paths, {
      prefix: `${repo}/`,
    }),
  },
};
