'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useDrawerTestStyles = makeStyles({
  layout: {
    display: 'flex',
    position: 'relative',
    height: '480px',
    width: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  content: {
    flexGrow: 1,
    minWidth: 0,
    padding: tokens.spacingHorizontalM,
  },
  mountNode: {
    position: 'relative',
    height: '480px',
    width: '100%',
  },
  override: {
    width: '240px',
    backgroundColor: tokens.colorBrandBackground2,
  },
});
