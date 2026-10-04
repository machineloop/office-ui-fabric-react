// @ts-check
'use strict';

// eslint-disable-next-line import/no-extraneous-dependencies -- Component-local opt-in Cypress configuration.
const { baseConfig: sharedConfig } = require('@fluentui/scripts-cypress');
const baseConfig = process.env.LISTBOX_CYPRESS_BASE_CONFIG
  ? require(process.env.LISTBOX_CYPRESS_BASE_CONFIG)
  : sharedConfig;

module.exports = {
  ...baseConfig,
  component: {
    ...baseConfig.component,
    specPattern: ['src/components/Listbox/Listbox.defects.probes.tsx'],
  },
};
