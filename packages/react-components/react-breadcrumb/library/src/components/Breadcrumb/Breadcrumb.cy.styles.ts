'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useCoverageStyles = makeStyles({
  list: {
    columnGap: tokens.spacingHorizontalL,
    paddingInlineStart: tokens.spacingHorizontalS,
  },
});
