'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useDialogBodyTestStyles = makeStyles({
  root: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
  },
});
