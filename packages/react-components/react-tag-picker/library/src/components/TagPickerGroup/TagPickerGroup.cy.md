# TagPickerGroup browser coverage

## Source mapping

- `react-tag-picker\stories\src\TagPicker\TagPickerDefault.stories.tsx`, `TagPickerDescription.md`, `TagPickerBestPractices.md`, `TagPickerA11y.md`, `index.stories.tsx`: selected-tags listbox composition, explicit input/group labels, native dismissal and exact selected option values. Unsupported InteractionTag is not introduced.
- `TagPickerSize.stories.tsx`, `TagPickerAppearance.stories.tsx`: all three sizes and four appearances; actual tag heights, group padding, wrapping and measured gap.
- `TagPickerButton.stories.tsx`, `TagPickerNoPopover.stories.tsx`: button/input trigger composition and final tag focus restoration, no-popover conditional group rendering.
- `TagPickerDisabled.stories.tsx`: picker context disables native tags; ARIA-only override does not enable them. The story's broad claim that selected options can still be modified is not a claim that disabled tag buttons are operable; owner-supplied selectedOptions can still update.
- `TagPickerGrouped.stories.tsx`, `TagPickerFiltering.stories.tsx`, `TagPickerExpandIcon.stories.tsx`, `TagPickerSecondaryAction.stories.tsx`, `TagPickerSingleLine.stories.tsx`, `TagPickerSingleSelect.stories.tsx`, `TagPickerTruncatedText.stories.tsx`: group is an ordinary selected-tags child in these integrations; filtering/list grouping/control slots/truncation/owner single-selection logic are not implemented by TagPickerGroup. The suite covers owner/frozen selection, constrained wrapping, and dynamic context updates rather than asserting those separate implementations.
- `TagPickerGroup.test.tsx`, `TagPickerGroup.types.ts`, `useTagPickerGroup.ts`, `renderTagPickerGroup.ts`, `useTagPickerGroupStyles.styles.ts`, `TagPickerGroup.tsx`: no-selection null rendering, supplied child semantics, native attrs/class/ref/style, role/mover precedence, context sizing, callback forwarding/cancellation and focus transfer.
- `..\..\contexts\TagPickerContext.ts`, `..\..\utils\tagPicker2Tag.ts`, `react-tags\library\src\components\TagGroup\useTagGroup.ts`, `useTagGroupStyles.styles.ts`, `..\Tag\useTag.tsx`, `useTagStyles.styles.ts`: actual tag dismissal/disabled/context/style/focus integration.

## Rounds and reproduced defects

19 documentation tests; 28 cumulative edges; 33 cumulative unit-derived; 37 final. Local Jest 21 tests including cancellation regression.

1. Extra-large context applied TagGroup's 8px columnGap despite intended 6px picker gap (`95-round1.log`). Fix uses explicit rowGap/columnGap, base styles before picker styles, caller classname last. Measured browser regression checks six-pixel spacing. Initial saved-class implementation broke mergeClasses conformance; captured in `95-jest.log`, then corrected by styling the base without the caller class and merging it once at the end.
2. Terminal ArrowRight ignored caller preventDefault (`95-round2-terminal-red.log`). Minimal handler guard respects cancellation. Native regression and local unit test cover it. Middle-tag arrow movement is handled by Tabster before the root handler, so no claim is made that root callbacks observe those intercepted keys.

## Commands

From master checkout:

```powershell
$repo = (Get-Location).Path
$node = 'C:\Program Files\scout\resources\node\node.exe'
$component = "$repo\packages\react-components\react-tag-picker\library\src\components\TagPickerGroup"
& $node "$repo\node_modules\cypress\bin\cypress" run --component --browser electron --headless --project "$repo\packages\react-components\react-tag-picker\library" --config-file src\components\TagPickerGroup\cypress.config.cjs
& $node "$repo\node_modules\typescript\bin\tsc" -p "$component\tsconfig.cy.json"
& $node "$repo\node_modules\prettier\bin-prettier.js" --check "$component\*.cy*" "$component\cypress.config.cjs" "$component\tsconfig.cy.json" "$component\useTagPickerGroup.ts" "$component\useTagPickerGroupStyles.styles.ts" "$component\TagPickerGroup.test.tsx"
Set-Location "$repo\packages\react-components\react-tag-picker\library"
& $node "$repo\node_modules\jest\bin\jest.js" --runInBand --runTestsByPath src\components\TagPickerGroup\TagPickerGroup.test.tsx --silent
```

Local CommonJS config bypasses ESM `import.meta.dirname` incompatibility. React 19 JSX bridge is type-only. Artifacts stay local; logs use requested session artifacts. Shared webpack include warnings are unsuppressed.

## Limits

Functional Electron DOM/focus/event/geometry assertions, not universal accessibility, screen-reader, cross-browser, tooltip/truncation or visual certification. Published Narrator/VoiceOver limitations remain applicable. Native Cypress keyboard input uses real events; unit regression uses Testing Library independently, not a Cypress fallback. No skips, retries, arbitrary sleeps, network fixtures or exception suppression.
