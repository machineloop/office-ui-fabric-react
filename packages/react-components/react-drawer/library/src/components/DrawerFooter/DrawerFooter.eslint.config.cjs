'use strict';
const path = require('node:path');
module.exports = [
  ...require('../../../eslint.config.cjs'),
  {
    files: ['**/DrawerFooter/*.stories.ts', '**/DrawerFooter/*.stories.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: path.join(__dirname, 'DrawerFooter.cy.tsconfig.json'),
        tsconfigRootDir: path.resolve(__dirname, '../../../../../../..'),
      },
    },
  },
];
