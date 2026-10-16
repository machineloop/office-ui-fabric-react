'use strict';
const path = require('node:path');
const base = require('../Table/Table.cypress.config.cjs');
const webpack = base.component.devServer.webpackConfig;
module.exports = {
  ...base,
  downloadsFolder: path.join(__dirname, '.cypress-downloads'),
  component: {
    ...base.component,
    specPattern: [path.join(__dirname, 'TableCellLayout.cy.stories.tsx')],
    devServer: {
      ...base.component.devServer,
      webpackConfig: {
        ...webpack,
        module: {
          ...webpack.module,
          rules: webpack.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? {
                  ...rule,
                  options: { ...rule.options, tsconfig: path.join(__dirname, 'TableCellLayout.cy.tsconfig.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
