'use strict';

const path = require('node:path');
const { baseConfig: base } = require('../../../../../../../scripts/cypress/lib-commonjs/index.cjs');
const projectRoot = path.resolve(__dirname, '../../..');
const supportRoot = path.resolve(__dirname, '../../../../../../../scripts/cypress/support');

module.exports = {
  ...base,
  retries: 0,
  screenshotsFolder: process.env.FLUENT_INPUT_ARTIFACTS || path.join(__dirname, 'screenshots'),
  component: {
    ...base.component,
    specPattern: ['**/Input.cy.tsx'],
    supportFile: path.relative(projectRoot, path.join(supportRoot, 'component.js')),
    indexHtmlFile: path.relative(projectRoot, path.join(supportRoot, 'component-index.html')),
    devServer: {
      ...base.component.devServer,
      webpackConfig: {
        ...base.component.devServer.webpackConfig,
        context: projectRoot,
        devServer: {
          ...base.component.devServer.webpackConfig.devServer,
          port: Number(process.env.WEBPACK_DEV_SERVER_PORT || 18221),
        },
        module: {
          ...base.component.devServer.webpackConfig.module,
          rules: base.component.devServer.webpackConfig.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? { ...rule, options: { ...rule.options, tsconfig: path.join(__dirname, 'Input.cy.tsconfig.json') } }
              : rule,
          ),
        },
      },
    },
  },
};
