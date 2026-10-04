'use strict';

const fs = require('node:fs');
const path = require('node:path');
const base = require('../TabList/TabList.cypress.config.cjs');

module.exports = {
  ...base,
  component: {
    ...base.component,
    specPattern: [process.env.TAB_PROBES === '1' ? '**/Tab.probes.tsx' : '**/Tab.cy.tsx'],
    devServer: {
      ...base.component.devServer,
      webpackConfig: {
        ...base.component.devServer.webpackConfig,
        module: {
          ...base.component.devServer.webpackConfig.module,
          rules: base.component.devServer.webpackConfig.module.rules.map(rule =>
            rule.loader === 'esbuild-loader'
              ? { ...rule, options: { ...rule.options, tsconfig: path.join(__dirname, 'Tab.cy.tsconfig.json') } }
              : rule,
          ),
        },
      },
    },
    setupNodeEvents(on) {
      on('after:run', results => {
        if (process.env.TAB_EVIDENCE_FILE) {
          fs.writeFileSync(
            process.env.TAB_EVIDENCE_FILE,
            JSON.stringify(
              {
                browser: results.browserName,
                totalTests: results.totalTests,
                totalPassed: results.totalPassed,
                totalFailed: results.totalFailed,
                totalPending: results.totalPending,
                totalSkipped: results.totalSkipped,
                runs: results.runs.map(run => ({
                  spec: run.spec.relative,
                  tests: run.tests.map(test => ({
                    title: test.title.join(' > '),
                    state: test.state,
                    attempts: test.attempts.map(attempt => ({
                      state: attempt.state,
                      error: attempt.error,
                    })),
                  })),
                })),
              },
              null,
              2,
            ),
          );
        }
      });
    },
  },
};
