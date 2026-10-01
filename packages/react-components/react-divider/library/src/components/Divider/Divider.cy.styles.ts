'use client';

import { makeStyles, shorthands } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useOverrides = makeStyles({
  width: { width: '200px' },
  height: { minHeight: '0px', height: '50px', flexGrow: 0 },
  font: { fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightBold },
  line: {
    '::before': {
      ...shorthands.borderColor(tokens.colorPaletteRedBorder2),
      borderTopStyle: 'dashed',
      borderTopWidth: tokens.strokeWidthThick,
    },
    '::after': {
      ...shorthands.borderColor(tokens.colorPaletteRedBorder2),
      borderTopStyle: 'dashed',
      borderTopWidth: tokens.strokeWidthThick,
    },
  },
});
