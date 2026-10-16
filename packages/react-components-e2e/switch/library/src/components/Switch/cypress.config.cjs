'use strict';

const path = require('node:path');
const { baseConfig } = require('../../../../../../../scripts/cypress/lib-commonjs/index.cjs');

const project = path.resolve(__dirname, '../../..');
const repo = path.resolve(project, '../../../..');
const webpackConfig = baseConfig.component.devServer.webpackConfig;

module.exports = {
  ...baseConfig,
  retries: 0,
  screenshotsFolder: process.env.FLUENT_SWITCH_ARTIFACTS || path.join(project, 'dist', 'cypress'),
  component: {
    ...baseConfig.component,
    specPattern: [path.join(__dirname, 'Switch.cy.tsx')],
    supportFile: '../../../../scripts/cypress/support/component.js',
    indexHtmlFile: '../../../../scripts/cypress/support/component-index.html',
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpackConfig,
        context: project,
        stats: { warnings: false },
        devServer: { ...webpackConfig.devServer, port: Number(process.env.WEBPACK_DEV_SERVER_PORT || 18221) },
        resolveLoader: { modules: [path.join(repo, 'node_modules')] },
        module: {
          ...webpackConfig.module,
          rules: webpackConfig.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? {
                  ...rule,
                  loader: require.resolve('esbuild-loader'),
                  options: { ...rule.options, tsconfig: path.join(__dirname, 'tsconfig.cy.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
