'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useNavCoverageStyles = makeStyles({
  carousel: { width: '480px' },
  card: { height: '120px' },
  halfCard: { flexBasis: '50%', height: '120px' },
  fixedCard: { flexBasis: '160px', height: '120px' },
  gap: { gap: tokens.spacingHorizontalM },
  consumer: { justifyContent: 'flex-start', backgroundColor: tokens.colorNeutralBackground1 },
  overflow: { width: '80px', overflowX: 'auto', justifyContent: 'flex-start' },
});
