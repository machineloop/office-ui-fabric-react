import * as React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies -- Type-only baseline for Cypress dev dependencies.
import { mount } from '@fluentui/scripts-cypress';
// eslint-disable-next-line import/no-extraneous-dependencies -- Matches the Cypress fixture's provider import.
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { Tab } from './Tab';

mount(
  <FluentProvider theme={teamsLightTheme}>
    <Tab value="baseline">Baseline</Tab>
  </FluentProvider>,
);
