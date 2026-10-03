'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useNavButtonCoverageStyles = makeStyles({
  carousel: { width: '480px' },
  card: { flexBasis: '100%', minHeight: '80px' },
  halfCard: { flexBasis: '50%', minHeight: '80px' },
  override: {
    width: tokens.spacingHorizontalXXL,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
  },
});
