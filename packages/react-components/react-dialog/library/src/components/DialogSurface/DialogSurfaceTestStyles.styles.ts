'use client';

import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useDialogSurfaceTestStyles = makeStyles({
  root: { maxWidth: '400px', backgroundColor: tokens.colorBrandBackground },
  backdrop: { backgroundColor: tokens.colorBrandBackground },
});
