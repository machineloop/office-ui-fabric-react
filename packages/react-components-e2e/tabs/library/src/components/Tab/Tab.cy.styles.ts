'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useTabTestStyles = makeStyles({
  root: { borderRadius: tokens.borderRadiusXLarge },
  icon: { width: tokens.spacingHorizontalXXXL },
  content: { fontSize: tokens.fontSizeBase500 },
  nominalIconColor: { color: tokens.colorPaletteRedForeground1 },
  nominalContentColor: { color: tokens.colorPaletteGreenForeground1 },
});
