'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useConsumerStyles = makeStyles({
  root: {
    color: tokens.colorPaletteRedForeground1,
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderRadius: tokens.borderRadiusNone,
  },
  icon: { fontSize: tokens.fontSizeBase600 },
});
