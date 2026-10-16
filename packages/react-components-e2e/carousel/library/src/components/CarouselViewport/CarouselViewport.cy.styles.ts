'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useViewportCoverageStyles = makeStyles({
  override: { maxWidth: 'none', width: '75%', overflow: 'hidden' },
  themed: { backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1 },
});
