'use strict';
const path = require('node:path');
const { baseConfig } = require('../../../../../../scripts/cypress/lib-commonjs/index.cjs');
const project = path.resolve(__dirname, '../../..');
const repo = path.resolve(project, '../../..');
const support = path.join(repo, 'scripts/cypress/support');
const webpack = baseConfig.component.devServer.webpackConfig;
module.exports = {
  ...baseConfig,
  retries: 0,
  screenshotOnRunFailure: false,
  video: false,
  downloadsFolder: path.join(__dirname, '.cypress-downloads'),
  component: {
    ...baseConfig.component,
    specPattern: [path.join(__dirname, 'RendererProvider.cy.stories.tsx')],
    supportFile: path.relative(project, path.join(support, 'component.js')),
    indexHtmlFile: path.relative(project, path.join(support, 'component-index.html')),
    setupNodeEvents(on, config) {
      on('task', {
        rendererSSR({ rules, attributes }) {
          if (typeof document !== 'undefined') {
            throw new Error('Renderer SSR task requires a DOM-free Node process');
          }
          const React = require('react');
          const ReactDOMServer = require('react-dom/server');
          const { createDOMRenderer, makeStyles, RendererProvider, renderToStyleElements } = require('@griffel/react');
          const renderer = createDOMRenderer(undefined, { styleElementAttributes: attributes });
          const useStyles = makeStyles({ root: rules });
          const Probe = () =>
            React.createElement('button', { className: useStyles().root, type: 'button' }, 'Renderer action');
          const html = ReactDOMServer.renderToString(
            React.createElement(RendererProvider, {
              renderer,
              children: React.createElement(Probe),
            }),
          );
          const css = ReactDOMServer.renderToStaticMarkup(
            React.createElement(React.Fragment, null, ...renderToStyleElements(renderer)),
          );
          return { html, css, ruleKeys: Object.keys(renderer.insertionCache) };
        },
      });
      return config;
    },
    devServer: {
      ...baseConfig.component.devServer,
      webpackConfig: {
        ...webpack,
        context: project,
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
                  options: { ...rule.options, tsconfig: path.join(__dirname, 'RendererProvider.cy.tsconfig.json') },
                }
              : rule,
          ),
        },
      },
    },
  },
};
