'use strict';
const path = require('node:path');
const pkg = path.resolve(__dirname, '../../../..');
module.exports = {
  ...require(path.join(pkg, 'jest.config.cjs')),
  rootDir: pkg,
  testMatch: ['<rootDir>/src/components/TeachingPopover/TeachingPopover.test.tsx'],
};
