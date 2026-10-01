const path = require('node:path');
const repo = path.resolve(__dirname, '../../../../../../..');
const project = path.resolve(__dirname, '../../..');
const { baseConfig } = require(path.join(repo, 'scripts/cypress/lib-commonjs/index.cjs'));
const webpack = baseConfig.component.devServer.webpackConfig;
module.exports = {
  ...baseConfig, retries: 0, video: false, screenshotOnRunFailure: false,
  component: {
    ...baseConfig.component,
    specPattern: [path.join(__dirname, 'TableHeader.cy.stories.tsx')],
    supportFile: '../../../../scripts/cypress/support/component.js',
    indexHtmlFile: '../../../../scripts/cypress/support/component-index.html',
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpack, context: project, stats: { warnings: false },
        devServer: { ...webpack.devServer, port: Number(process.env.WEBPACK_DEV_SERVER_PORT || 45169) },
        resolveLoader: { modules: [path.join(repo, 'node_modules')] },
        module: { ...webpack.module, rules: webpack.module.rules.map(rule => rule.loader === 'esbuild-loader'
          ? { ...rule, loader: require.resolve('esbuild-loader', { paths: [repo] }), options: { ...rule.options, tsconfig: path.join(__dirname, 'tsconfig.cy.json') } } : rule) },
      },
    },
  },
};
