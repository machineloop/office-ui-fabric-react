import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useTooltipCallerStyles = makeStyles({
  content: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundInverted,
  },
});
