'use strict';
const path = require('node:path');
const { baseConfig } = require('../../../../../../../scripts/cypress/lib-commonjs/index.cjs');
const library = path.resolve(__dirname, '../../..');
const repo = path.resolve(library, '../../../..');
const webpack = baseConfig.component.devServer.webpackConfig;
module.exports = {
  ...baseConfig,
  retries: 0,
  viewportWidth: 1200,
  viewportHeight: 800,
  video: false,
  trashAssetsBeforeRuns: false,
  fixturesFolder: false,
  downloadsFolder: path.join(__dirname, '.cypress-downloads'),
  screenshotsFolder: path.join(__dirname, '.cypress-screenshots'),
  videosFolder: path.join(__dirname, '.cypress-videos'),
  reporter: 'junit',
  reporterOptions: {
    mochaFile: path.join(process.env.FOOTER_REPORT_DIR || path.join(__dirname, 'reports'), 'results-[hash].xml'),
  },
  component: {
    ...baseConfig.component,
    specPattern: [path.join(__dirname, 'DrawerFooter.cy.tsx')],
    supportFile: path.relative(library, path.join(repo, 'scripts/cypress/support/component.js')),
    indexHtmlFile: path.relative(library, path.join(repo, 'scripts/cypress/support/component-index.html')),
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpack,
        context: library,
        cache: false,
        output: { ...webpack.output, path: path.join(__dirname, '.cypress-build') },
        devServer: { ...webpack.devServer, port: 46125 },
        resolveLoader: { modules: [path.join(repo, 'node_modules')] },
        module: {
          ...webpack.module,
          rules: webpack.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? {
                  ...rule,
                  options: { ...rule.options, tsconfig: path.join(__dirname, 'DrawerFooter.cy-webpack.tsconfig.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
