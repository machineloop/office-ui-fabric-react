'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useTestStyles = makeStyles({
  root: {
    backgroundColor: tokens.colorBrandBackground,
    borderRadius: tokens.borderRadiusCircular,
    width: `calc(7 * ${tokens.spacingHorizontalXXXL})`,
  },
  content: { textAlign: 'center' },
  secondary: { fontWeight: tokens.fontWeightBold },
  icon: { color: tokens.colorPaletteRedForeground1 },
});
