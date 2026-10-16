'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useActionOverrides = makeStyles({
  root: {
    columnGap: tokens.spacingHorizontalXXL,
    paddingRight: tokens.spacingHorizontalXXL,
  },
  container: {
    paddingRight: tokens.spacingHorizontalL,
  },
});
