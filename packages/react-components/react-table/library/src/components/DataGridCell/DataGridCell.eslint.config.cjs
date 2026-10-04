'use strict';

const path = require('node:path');
const config = require('../../../eslint.config.cjs');

module.exports = [
  ...config,
  {
    files: ['**/DataGridCell/*.cy.tsx', '**/DataGridCell/*.stories.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: path.join(__dirname, 'DataGridCell.cy.tsconfig.json'),
        tsconfigRootDir: path.resolve(__dirname, '../../../../../../..'),
      },
    },
  },
];
