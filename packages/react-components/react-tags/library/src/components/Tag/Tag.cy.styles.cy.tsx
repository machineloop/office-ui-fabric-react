import { makeStyles, mergeClasses } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';
import type { TagState } from './Tag.types';

// This test-only module must remain excluded from production compilation.
// eslint-disable-next-line @griffel/styles-file
export const useOverrides = makeStyles({
  root: { backgroundColor: tokens.colorPaletteGreenBackground2 },
  primaryText: { fontWeight: tokens.fontWeightBold },
  customRoot: { borderRadius: tokens.borderRadiusNone },
});

export function useCustomTagStyles(state: unknown): void {
  const tag = state as TagState;
  const classes = useOverrides();
  tag.root.className = mergeClasses(tag.root.className, classes.customRoot);
}
