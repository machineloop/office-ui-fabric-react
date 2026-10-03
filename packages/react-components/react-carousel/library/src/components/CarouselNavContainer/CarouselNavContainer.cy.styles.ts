'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useContainerCoverageStyles = makeStyles({
  frame: { position: 'relative', width: '480px', height: '240px' },
  carousel: { width: '480px' },
  card: { flexBasis: '100%', minHeight: '80px' },
  override: { marginTop: tokens.spacingVerticalXXL, justifyContent: 'flex-end' },
  child: { pointerEvents: 'all' },
});
