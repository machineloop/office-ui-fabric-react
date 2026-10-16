const path = require('node:path');
const repo = path.resolve(__dirname, '../../../../../../..');
const { baseConfig } = require(path.join(repo, 'scripts/cypress/lib-commonjs/index.cjs'));
module.exports = {
  ...baseConfig,
  retries: 0,
  video: false,
  screenshotOnRunFailure: false,
  component: {
    ...baseConfig.component,
    specPattern: [path.join(__dirname, 'SplitButton.cy.tsx')],
    supportFile: '../../../../scripts/cypress/support/component.js',
    indexHtmlFile: '../../../../scripts/cypress/support/component-index.html',
  },
};
