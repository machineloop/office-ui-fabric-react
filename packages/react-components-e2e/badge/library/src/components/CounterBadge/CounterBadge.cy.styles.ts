'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useConsumerStyles = makeStyles({
  offscreen: {
    position: 'absolute',
    width: tokens.strokeWidthThin,
    minWidth: tokens.strokeWidthThin,
    height: tokens.strokeWidthThin,
    padding: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
  override: {
    height: tokens.spacingVerticalXXXL,
    color: tokens.colorNeutralForeground1,
  },
});
