'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { baseConfig } = require('../../../../../../../scripts/cypress/lib-commonjs/index.cjs');
const library = path.resolve(__dirname, '../../..');
const repo = path.resolve(library, '../../../..');
const webpack = baseConfig.component.devServer.webpackConfig;
module.exports = {
  ...baseConfig,
  retries: 0,
  video: false,
  component: {
    ...baseConfig.component,
    specPattern: [path.join(__dirname, 'InteractionTagSecondary.cy.tsx')],
    supportFile: '../../../../scripts/cypress/support/component.js',
    indexHtmlFile: '../../../../scripts/cypress/support/component-index.html',
    setupNodeEvents(on, config) {
      baseConfig.component.setupNodeEvents?.(on, config);
      if (process.env.SECONDARY_RUN_JSON) {
        on('after:run', results => {
          fs.writeFileSync(process.env.SECONDARY_RUN_JSON, JSON.stringify(results, null, 2));
        });
      }
      return config;
    },
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpack,
        context: library,
        devServer: { ...webpack.devServer, port: Number(process.env.WEBPACK_DEV_SERVER_PORT || 18241) },
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
                  options: {
                    ...rule.options,
                    tsconfig: path.join(__dirname, 'InteractionTagSecondary.cy.tsconfig.json'),
                  },
                }
              : rule,
          ),
        },
      },
    },
  },
};
