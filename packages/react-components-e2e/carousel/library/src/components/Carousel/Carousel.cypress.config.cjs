'use strict';

const path = require('node:path');
const { baseConfig: base } = require('../../../../../../../scripts/cypress/lib-commonjs/index.cjs');
const projectRoot = path.resolve(__dirname, '../../..');
const repoRoot = path.resolve(__dirname, '../../../../../../..');
const supportRoot = path.join(repoRoot, 'scripts', 'cypress', 'support');
const webpack = base.component.devServer.webpackConfig;

module.exports = {
  ...base,
  retries: 0,
  component: {
    ...base.component,
    specPattern: ['**/Carousel/Carousel.cy.tsx'],
    supportFile: path.relative(projectRoot, path.join(supportRoot, 'component.js')),
    indexHtmlFile: path.relative(projectRoot, path.join(supportRoot, 'component-index.html')),
    setupNodeEvents(on) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push(
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          );
        }
        if (browser.name === 'electron') {
          launchOptions.preferences.webPreferences = {
            ...launchOptions.preferences.webPreferences,
            backgroundThrottling: false,
          };
        }
        return launchOptions;
      });
    },
    devServer: {
      ...base.component.devServer,
      webpackConfig: {
        ...webpack,
        context: projectRoot,
        devServer: { ...webpack.devServer, port: 18241 },
        resolveLoader: { modules: [path.join(repoRoot, 'node_modules')] },
        module: {
          ...webpack.module,
          rules: webpack.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? {
                  ...rule,
                  loader: require.resolve('esbuild-loader', { paths: [repoRoot] }),
                  options: { ...rule.options, tsconfig: path.join(projectRoot, 'tsconfig.cy.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
