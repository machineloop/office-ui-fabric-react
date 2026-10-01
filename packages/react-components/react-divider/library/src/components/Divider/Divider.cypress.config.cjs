'use strict';

const path = require('node:path');
const { baseConfig: base } = require('../../../../../../../scripts/cypress/lib-commonjs/index.cjs');
const projectRoot = path.resolve(__dirname, '../../..');
const supportRoot = path.resolve(__dirname, '../../../../../../../scripts/cypress/support');

module.exports = {
  ...base,
  retries: 0,
  component: {
    ...base.component,
    specPattern: ['**/Divider.cy.tsx'],
    // Cypress loads this nested config from its directory but resolves support paths from the project.
    supportFile: path.relative(projectRoot, path.join(supportRoot, 'component.js')),
    indexHtmlFile: path.relative(projectRoot, path.join(supportRoot, 'component-index.html')),
    devServer: {
      ...base.component.devServer,
      webpackConfig: {
        ...base.component.devServer.webpackConfig,
        module: {
          ...base.component.devServer.webpackConfig.module,
          rules: base.component.devServer.webpackConfig.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? { ...rule, options: { ...rule.options, tsconfig: path.join(__dirname, 'Divider.cy.tsconfig.json') } }
              : rule,
          ),
        },
      },
    },
  },
};
