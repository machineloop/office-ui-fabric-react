'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useCoverageStyles = makeStyles({
  wrapping: {
    display: 'flex',
    flexWrap: 'wrap',
    width: tokens.spacingHorizontalXXXL,
    rowGap: tokens.spacingVerticalS,
  },
  overflow: {
    display: 'flex',
    width: tokens.spacingHorizontalXXXL,
  },
});
