'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useSecondaryFixtureStyles = makeStyles({
  root: {
    color: tokens.colorPaletteRedForeground1,
    paddingLeft: tokens.spacingHorizontalL,
  },
  container: {
    padding: tokens.spacingVerticalXXL,
  },
  borderBox: {
    '& *, & *::before, & *::after': {
      boxSizing: 'border-box',
    },
  },
});
