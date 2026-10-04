'use strict';

const path = require('node:path');
const { baseConfig: base } = require('../../../../../../../scripts/cypress/lib-commonjs/index.cjs');
const projectRoot = path.resolve(__dirname, '../../..');
const supportRoot = path.resolve(__dirname, '../../../../../../../scripts/cypress/support');
const webpack = base.component.devServer.webpackConfig;

module.exports = {
  ...base,
  retries: 0,
  reporter: process.env.COUNTERBADGE_REPORTER || 'spec',
  component: {
    ...base.component,
    specPattern: ['src/components/CounterBadge/CounterBadge.cy.tsx'],
    supportFile: path.relative(projectRoot, path.join(supportRoot, 'component.js')),
    indexHtmlFile: path.relative(projectRoot, path.join(supportRoot, 'component-index.html')),
    devServer: {
      ...base.component.devServer,
      webpackConfig: {
        ...webpack,
        context: projectRoot,
        resolveLoader: { modules: [path.resolve(projectRoot, '../../../../node_modules')] },
        module: {
          ...webpack.module,
          rules: webpack.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? {
                  ...rule,
                  options: { ...rule.options, tsconfig: path.join(__dirname, 'CounterBadge.cy.tsconfig.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
