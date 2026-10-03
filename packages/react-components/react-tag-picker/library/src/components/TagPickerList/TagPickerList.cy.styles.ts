'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useTagPickerListTestStyles = makeStyles({
  scrolling: {
    maxHeight: `calc(${tokens.fontSizeBase600} * 4)`,
  },
  override: {
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: 'none',
  },
});
