'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useDialogContentTestStyles = makeStyles({
  root: {
    overflowY: 'scroll',
    minHeight: '64px',
    padding: tokens.spacingHorizontalL,
    color: tokens.colorBrandForeground1,
  },
});
