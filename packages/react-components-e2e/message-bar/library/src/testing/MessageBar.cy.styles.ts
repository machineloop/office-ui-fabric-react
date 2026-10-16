import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useCallerOverrideStyles = makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
  },
  icon: { color: tokens.colorNeutralForeground1 },
  spacer: { marginBottom: tokens.spacingVerticalXXL },
});
