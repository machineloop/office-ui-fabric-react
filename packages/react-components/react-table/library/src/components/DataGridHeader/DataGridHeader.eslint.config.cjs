'use strict';

const path = require('node:path');
const config = require('../../../eslint.config.cjs');

module.exports = [
  ...config,
  {
    files: ['**/DataGridHeader/*.stories.ts', '**/DataGridHeader/*.stories.tsx', '**/DataGridHeader/*.cy.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: path.join(__dirname, 'DataGridHeader.cy.tsconfig.json'),
        tsconfigRootDir: path.resolve(__dirname, '../../../../../../..'),
      },
    },
  },
];
