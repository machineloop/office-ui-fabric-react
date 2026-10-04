'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useTestStyles = makeStyles({
  override: {
    padding: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorBrandBackground,
  },
  scroll: {
    maxHeight: `calc(${tokens.spacingVerticalXXXL} * 3)`,
  },
});
