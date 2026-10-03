'use strict';

const libraryConfig = require('../../../eslint.config.cjs');

module.exports = [
  ...libraryConfig,
  {
    files: ['**/CompoundButton.cy-jsx.stories.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: './CompoundButton.cy.tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
  },
];
