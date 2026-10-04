'use strict';
const path = require('node:path');
const config = require('../../../eslint.config.cjs');
module.exports = [
  ...config,
  {
    files: [
      '**/DataGridHeaderCell/*.stories.ts',
      '**/DataGridHeaderCell/*.stories.tsx',
      '**/DataGridHeaderCell/*.cy.tsx',
    ],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: path.join(__dirname, 'DataGridHeaderCell.cy.tsconfig.json'),
        tsconfigRootDir: path.resolve(__dirname, '../../../../../../..'),
      },
    },
  },
];
