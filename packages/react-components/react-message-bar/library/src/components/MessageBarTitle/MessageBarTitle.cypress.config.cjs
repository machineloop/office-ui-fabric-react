'use strict';

const path = require('node:path');
const { baseConfig } = require('../../../../../../../scripts/cypress/lib-commonjs/index.cjs');
const library = path.resolve(__dirname, '../../..');
const repo = path.resolve(library, '../../../..');
const support = path.join(repo, 'scripts/cypress/support');
const webpack = baseConfig.component.devServer.webpackConfig;

module.exports = {
  ...baseConfig,
  retries: 0,
  downloadsFolder: path.join(__dirname, '.cypress-downloads'),
  screenshotOnRunFailure: false,
  video: false,
  component: {
    ...baseConfig.component,
    specPattern: [path.join(__dirname, 'MessageBarTitle.cy.tsx')],
    supportFile: path.relative(library, path.join(support, 'component.js')),
    indexHtmlFile: path.relative(library, path.join(support, 'component-index.html')),
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpack,
        context: library,
        resolveLoader: { modules: [path.join(repo, 'node_modules')] },
        ignoreWarnings: [
          ...(webpack.ignoreWarnings || []),
          { message: /The specified tsconfig.*does not match its "include" patterns/ },
        ],
        module: {
          ...webpack.module,
          rules: webpack.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? {
                  ...rule,
                  options: { ...rule.options, tsconfig: path.join(__dirname, 'MessageBarTitle.cy.tsconfig.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
