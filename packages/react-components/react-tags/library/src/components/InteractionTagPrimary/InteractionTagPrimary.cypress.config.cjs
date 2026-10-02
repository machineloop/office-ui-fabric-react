'use strict';
const path = require('node:path');
const base = require('../InteractionTag/InteractionTag.cypress.config.cjs');
const webpack = base.component.devServer.webpackConfig;
module.exports = {
  ...base,
  downloadsFolder: path.join(__dirname, '.cypress-downloads'),
  component: {
    ...base.component,
    specPattern: [path.join(__dirname, 'InteractionTagPrimary.cy.stories.tsx')],
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
                  options: {
                    ...rule.options,
                    tsconfig: path.join(__dirname, 'InteractionTagPrimary.cy.tsconfig.json'),
                  },
                }
              : rule,
          ),
        },
      },
    },
  },
};
