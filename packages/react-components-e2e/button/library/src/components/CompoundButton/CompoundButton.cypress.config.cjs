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
  video: false,
  component: {
    ...baseConfig.component,
    specPattern: [path.join(__dirname, 'CompoundButton.cy.tsx')],
    supportFile: path.relative(library, path.join(support, 'component.js')),
    indexHtmlFile: path.relative(library, path.join(support, 'component-index.html')),
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpack,
        context: library,
        devServer: {
          ...webpack.devServer,
          port: Number(process.env.WEBPACK_DEV_SERVER_PORT || 18241),
        },
        resolveLoader: { modules: [path.join(repo, 'node_modules')] },
        module: {
          ...webpack.module,
          rules: webpack.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? {
                  ...rule,
                  options: { ...rule.options, tsconfig: path.join(__dirname, 'CompoundButton.cy.tsconfig.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
