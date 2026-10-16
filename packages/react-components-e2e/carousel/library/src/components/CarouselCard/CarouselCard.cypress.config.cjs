'use strict';

const fs = require('node:fs');
const base = require('../Carousel/Carousel.cypress.config.cjs');

module.exports = {
  ...base,
  component: {
    ...base.component,
    specPattern: ['**/CarouselCard/CarouselCard.cy.tsx'],
    setupNodeEvents(on, config) {
      base.component.setupNodeEvents(on, config);
      on('after:run', results => {
        if (process.env.FLUENT_RESULTS && results.runs) {
          fs.writeFileSync(
            process.env.FLUENT_RESULTS,
            JSON.stringify(
              {
                total: results.totalTests,
                passed: results.totalPassed,
                failed: results.totalFailed,
                pending: results.totalPending,
                skipped: results.totalSkipped,
                tests: results.runs.flatMap(run =>
                  run.tests.map(test => ({
                    title: test.title,
                    state: test.state,
                    displayError: test.displayError,
                    attempts: test.attempts,
                  })),
                ),
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
