import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useFieldTestStyles = makeStyles({
  root: { display: 'flex' },
  text: { color: tokens.colorBrandForeground1 },
});
