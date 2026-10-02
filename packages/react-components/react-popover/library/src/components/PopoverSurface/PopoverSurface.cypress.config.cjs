'use strict';
const path = require('node:path');
const base = require('../Popover/Popover.cypress.config.cjs');
const webpack = base.component.devServer.webpackConfig;
module.exports = {
  ...base,
  downloadsFolder: path.join(__dirname, '.cypress-downloads'),
  component: {
    ...base.component,
    specPattern: [path.join(__dirname, 'PopoverSurface.cy.stories.tsx')],
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
                  options: { ...rule.options, tsconfig: path.join(__dirname, 'PopoverSurface.cy.tsconfig.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
