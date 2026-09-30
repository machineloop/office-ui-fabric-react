import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useBodyOverrideStyles = makeStyles({
  root: {
    paddingRight: tokens.spacingHorizontalXXL,
    fontSize: tokens.fontSizeBase500,
  },
});
