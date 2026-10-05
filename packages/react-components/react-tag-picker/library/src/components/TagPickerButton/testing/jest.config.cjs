'use strict';
const path = require('node:path');
const pkg = path.resolve(__dirname, '../../../..');
const original = require(path.join(pkg, 'jest.config.cjs'));
module.exports = {
  ...original,
  rootDir: pkg,
  testMatch: [
    '<rootDir>/src/components/TagPickerButton/TagPickerButton.test.tsx',
    '<rootDir>/src/components/TagPickerButton/useTagPickerButton.test.tsx',
  ],
};
