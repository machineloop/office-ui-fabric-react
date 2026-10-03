'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useOverrides = makeStyles({
  root: {
    height: tokens.spacingVerticalL,
    borderRadius: tokens.borderRadiusNone,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  bar: {
    backgroundColor: tokens.colorPalettePurpleBackground2,
  },
});
