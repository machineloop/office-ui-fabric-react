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
  screenshotOnRunFailure: false,
  video: false,
  fixturesFolder: false,
  downloadsFolder: path.join(__dirname, '.cypress-downloads'),
  screenshotsFolder: path.join(__dirname, '.cypress-screenshots'),
  videosFolder: path.join(__dirname, '.cypress-videos'),
  component: {
    ...baseConfig.component,
    specPattern: [path.join(__dirname, 'TagPickerOptionGroup.cy.tsx')],
    supportFile: path.relative(library, path.join(support, 'component.js')),
    indexHtmlFile: path.relative(library, path.join(support, 'component-index.html')),
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpack,
        context: library,
        output: { ...webpack.output, path: path.join(__dirname, '.cypress-build') },
        devServer: {
          ...webpack.devServer,
          port: process.env.WEBPACK_DEV_SERVER_PORT ? Number(process.env.WEBPACK_DEV_SERVER_PORT) : 45122,
        },
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
                  options: { ...rule.options, tsconfig: path.join(__dirname, 'TagPickerOptionGroup.cy.tsconfig.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
