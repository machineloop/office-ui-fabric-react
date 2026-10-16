'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useSliderCoverageStyles = makeStyles({
  gap: { gap: tokens.spacingHorizontalL },
  override: { display: 'inline-flex', overflowAnchor: 'auto' },
  custom: { overflowAnchor: 'auto' },
  themed: { backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1 },
});
