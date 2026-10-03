'use strict';
const path = require('node:path');
const config = require('../../../eslint.config.cjs');
module.exports = [
  ...config,
  {
    files: [
      '**/InteractionTagSecondary/*.stories.ts',
      '**/InteractionTagSecondary/*.cy.tsx',
      '**/InteractionTagSecondary/*.cy.styles.ts',
    ],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: path.join(__dirname, 'InteractionTagSecondary.cy.tsconfig.json'),
        tsconfigRootDir: path.resolve(__dirname, '../../../../../../..'),
      },
    },
  },
];
