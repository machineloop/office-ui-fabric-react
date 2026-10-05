'use strict';
const path = require('node:path');
const repo = path.resolve(__dirname, '../../../../../../..');
const pkg = path.resolve(__dirname, '../../../..');
const { baseConfig } = require(path.join(repo, 'scripts/cypress/lib-commonjs/index.cjs'));
const webpack = baseConfig.component.devServer.webpackConfig;
module.exports = {
  ...baseConfig,
  retries: 0,
  video: false,
  component: {
    ...baseConfig.component,
    specPattern: path.join(__dirname, 'IdPrefixProvider.cy.tsx'),
    supportFile: path.relative(pkg, path.join(repo, 'scripts/cypress/support/component.js')),
    indexHtmlFile: path.relative(pkg, path.join(repo, 'scripts/cypress/support/component-index.html')),
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpack,
        context: pkg,
        cache: false,
        devServer: { ...webpack.devServer, port: 46135 },
        resolveLoader: { modules: [path.join(repo, 'node_modules')] },
        module: {
          ...webpack.module,
          rules: webpack.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? { ...rule, options: { ...rule.options, tsconfig: path.join(pkg, 'tsconfig.cy.json') } }
              : rule,
          ),
        },
      },
    },
  },
};
