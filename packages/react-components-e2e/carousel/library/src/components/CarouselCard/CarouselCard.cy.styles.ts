'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useCardCoverageStyles = makeStyles({
  root: { width: '480px' },
  card: { height: '120px' },
  gap: { gap: tokens.spacingHorizontalM },
  margin: { marginInlineEnd: tokens.spacingHorizontalM },
  override: { borderRadius: tokens.borderRadiusSmall, boxShadow: 'none', overflow: 'visible' },
});
