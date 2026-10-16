'use strict';
const path = require('node:path');
const { baseConfig } = require('../../../../../../../scripts/cypress/lib-commonjs/index.cjs');
const library = path.resolve(__dirname, '../../..');
const repo = path.resolve(library, '../../../..');
const webpack = baseConfig.component.devServer.webpackConfig;
const run = process.env.PORTAL_RUN_ID || `${Date.now()}-${process.pid}`;
const reports = path.join(__dirname, 'reports', run);
module.exports = {
  ...baseConfig,
  retries: 0,
  viewportWidth: 1100,
  viewportHeight: 800,
  video: false,
  fixturesFolder: false,
  trashAssetsBeforeRuns: false,
  downloadsFolder: path.join(reports, 'downloads'),
  screenshotsFolder: path.join(reports, 'screenshots'),
  videosFolder: path.join(reports, 'videos'),
  env: { ...baseConfig.env, portalEvidencePath: path.relative(library, reports) },
  reporter: 'junit',
  reporterOptions: { mochaFile: path.join(reports, 'results-[hash].xml') },
  component: {
    ...baseConfig.component,
    specPattern: [path.join(__dirname, 'testing', 'Portal.cy-entry.stories.tsx')],
    supportFile: path.relative(library, path.join(repo, 'scripts/cypress/support/component.js')),
    indexHtmlFile: path.relative(library, path.join(repo, 'scripts/cypress/support/component-index.html')),
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpack,
        context: library,
        cache: false,
        output: { ...webpack.output, path: path.join(__dirname, '.cypress-build') },
        devServer: { ...webpack.devServer, port: 46126 },
        resolveLoader: { modules: [path.join(repo, 'node_modules')] },
        module: {
          ...webpack.module,
          rules: webpack.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? {
                  ...rule,
                  options: { ...rule.options, tsconfig: path.join(__dirname, 'Portal.cy-webpack.tsconfig.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
