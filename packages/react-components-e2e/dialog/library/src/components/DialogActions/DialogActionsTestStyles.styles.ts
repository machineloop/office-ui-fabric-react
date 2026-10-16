'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useDialogActionsTestStyles = makeStyles({
  root: {
    flexDirection: 'column',
    gap: tokens.spacingHorizontalL,
  },
});
