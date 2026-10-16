'use strict';

const path = require('node:path');
const { baseConfig } = require('../../../../../../../scripts/cypress/lib-commonjs/index.cjs');

const library = path.resolve(__dirname, '../../..');
const repo = path.resolve(library, '../../../..');
const webpack = baseConfig.component.devServer.webpackConfig;

module.exports = {
  ...baseConfig,
  retries: 0,
  screenshotOnRunFailure: false,
  component: {
    ...baseConfig.component,
    specPattern: [path.join(__dirname, 'Badge.cy.tsx')],
    supportFile: '../../../../scripts/cypress/support/component.js',
    indexHtmlFile: '../../../../scripts/cypress/support/component-index.html',
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpack,
        context: library,
        resolveLoader: { modules: [path.join(repo, 'node_modules')] },
        module: {
          ...webpack.module,
          rules: webpack.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? { ...rule, options: { ...rule.options, tsconfig: path.join(__dirname, 'tsconfig.cy.json') } }
              : rule,
          ),
        },
      },
    },
  },
};
