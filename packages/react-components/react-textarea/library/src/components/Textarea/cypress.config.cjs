'use strict';

const path = require('node:path');
const repo = path.resolve(__dirname, '../../../../../../..');
const { baseConfig } = require(path.join(repo, 'scripts/cypress/lib-commonjs/index.cjs'));
const webpackConfig = baseConfig.component.devServer.webpackConfig;

module.exports = {
  ...baseConfig,
  retries: 0,
  ...(process.env.FLUENT_EVIDENCE
    ? { screenshotsFolder: path.join(process.env.FLUENT_EVIDENCE, 'Textarea-screenshots') }
    : {}),
  component: {
    ...baseConfig.component,
    specPattern: [path.join(__dirname, 'Textarea.cy.tsx')],
    supportFile: path.relative(__dirname, path.join(repo, 'scripts/cypress/support/component.js')),
    indexHtmlFile: path.relative(__dirname, path.join(repo, 'scripts/cypress/support/component-index.html')),
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpackConfig,
        context: __dirname,
        resolveLoader: { modules: [path.join(repo, 'node_modules')] },
        module: {
          ...webpackConfig.module,
          rules: webpackConfig.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? {
                  ...rule,
                  loader: require.resolve('esbuild-loader', { paths: [repo] }),
                  options: { ...rule.options, tsconfig: path.join(__dirname, 'tsconfig.cy.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
