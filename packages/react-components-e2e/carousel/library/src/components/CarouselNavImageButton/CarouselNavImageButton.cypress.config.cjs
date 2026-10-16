'use strict';
const path = require('node:path');
const { baseConfig } = require('../../../../../../../scripts/cypress/lib-commonjs/index.cjs');
const library = path.resolve(__dirname, '../../..');
const repo = path.resolve(__dirname, '../../../../../../..');
const webpack = baseConfig.component.devServer.webpackConfig;
const runRoot = path.join(__dirname, '.runner-temp', `direct-${Date.now()}-${process.pid}`);
module.exports = {
  ...baseConfig,
  retries: 0,
  viewportWidth: 1000,
  viewportHeight: 800,
  video: false,
  fixturesFolder: false,
  trashAssetsBeforeRuns: false,
  downloadsFolder: path.join(runRoot, 'downloads'),
  screenshotsFolder: path.join(runRoot, 'screenshots'),
  videosFolder: path.join(runRoot, 'videos'),
  component: {
    ...baseConfig.component,
    specPattern: path.join(__dirname, 'CarouselNavImageButton.cy.tsx'),
    supportFile: path.relative(library, path.join(repo, 'scripts/cypress/support/component.js')),
    indexHtmlFile: path.relative(library, path.join(repo, 'scripts/cypress/support/component-index.html')),
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpack,
        context: library,
        cache: false,
        output: { ...webpack.output, path: path.join(runRoot, 'webpack') },
        devServer: { ...webpack.devServer, port: 45331 },
        resolveLoader: { modules: [path.join(repo, 'node_modules')] },
        module: {
          ...webpack.module,
          rules: webpack.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? {
                  ...rule,
                  options: {
                    ...rule.options,
                    tsconfig: path.join(__dirname, 'CarouselNavImageButton.cy-webpack.tsconfig.json'),
                  },
                }
              : rule,
          ),
        },
      },
    },
  },
};
