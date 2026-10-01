import { makeStyles, mergeClasses } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';
import type { CardState } from './Card.types';

// Test-only styles must be excluded from production compilation.
// eslint-disable-next-line @griffel/styles-file
export const useOverrides = makeStyles({
  root: { backgroundColor: tokens.colorPaletteGreenBackground2 },
  floatingAction: { top: tokens.spacingVerticalL },
  customRoot: { borderRadius: tokens.borderRadiusNone },
});

export function useCustomCardStyles(state: unknown): void {
  const card = state as CardState;
  const classes = useOverrides();
  card.root.className = mergeClasses(card.root.className, classes.customRoot);
}
