const path = require('node:path');
const { baseConfig } = require('@fluentui/scripts-cypress');
const project = path.resolve(__dirname, '../../..');
const repo = path.resolve(project, '../../../..');
const webpack = baseConfig.component.devServer.webpackConfig;

module.exports = {
  ...baseConfig,
  retries: 0,
  component: {
    ...baseConfig.component,
    specPattern: [path.join(__dirname, 'Spinner.cy.tsx')],
    supportFile: path.relative(project, path.join(repo, 'scripts/cypress/support/component.js')),
    indexHtmlFile: path.relative(project, path.join(repo, 'scripts/cypress/support/component-index.html')),
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpack,
        context: project,
        stats: { warnings: false },
        resolveLoader: { modules: [path.join(repo, 'node_modules')] },
        module: {
          ...webpack.module,
          rules: webpack.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? {
                  ...rule,
                  loader: require.resolve('esbuild-loader'),
                  options: { ...rule.options, tsconfig: path.join(__dirname, 'tsconfig.cy.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
