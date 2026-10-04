'use strict';
const path = require('node:path');
const { baseConfig } = require('../../../../../../../scripts/cypress/lib-commonjs/index.cjs');
const library = path.resolve(__dirname, '../../..');
const repo = path.resolve(__dirname, '../../../../../../..');
const webpack = baseConfig.component.devServer.webpackConfig;
const runId = process.env.CARD_PREVIEW_RUN_ID || `${Date.now()}-${process.pid}`;
const evidence = process.env.CARD_PREVIEW_EVIDENCE || path.join(__dirname, '.temp', 'runs', runId);
module.exports = {
  ...baseConfig,
  retries: 0,
  trashAssetsBeforeRuns: false,
  viewportWidth: 1000,
  viewportHeight: 800,
  video: false,
  downloadsFolder: path.join(evidence, 'downloads'),
  screenshotsFolder: path.join(evidence, 'screenshots'),
  videosFolder: path.join(evidence, 'videos'),
  reporter: 'junit',
  reporterOptions: { mochaFile: path.join(evidence, 'results-[hash].xml') },
  component: {
    ...baseConfig.component,
    specPattern: path.join(__dirname, 'CardPreview.cy.tsx'),
    supportFile: path.relative(library, path.join(repo, 'scripts/cypress/support/component.js')),
    indexHtmlFile: path.relative(library, path.join(repo, 'scripts/cypress/support/component-index.html')),
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpack,
        context: library,
        cache: false,
        output: { ...webpack.output, path: path.join(evidence, 'webpack') },
        devServer: { ...webpack.devServer, port: 46128 },
        resolveLoader: { modules: [path.join(repo, 'node_modules')] },
        module: {
          ...webpack.module,
          rules: webpack.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? {
                  ...rule,
                  options: { ...rule.options, tsconfig: path.join(__dirname, 'CardPreview.cy-webpack.tsconfig.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
