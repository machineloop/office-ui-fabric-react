# SwatchPicker browser coverage

The existing 64-item/eight-row wrap case now observes real Tabster tracking of
the originally focused last swatch before native ArrowRight. The first swatch is
not focused by the test; exact forward/reverse wrap, grid size and measured gap
assertions remain intact. No mover state, DOM attributes or component source are
changed.

The style-forwarding regression remains unchanged. The pre-existing local
production repair is preserved byte-for-byte during this test-only campaign;
these green receipts do not claim that the still-defective committed-master hook
passes that regression.

## Sources

Paths below are relative to `react-swatch-picker`.

- `stories\src\SwatchPicker\SwatchPickerDefault.stories.tsx`, `SwatchPickerDescription.md`, `SwatchPickerBestPractices.md`, `index.stories.tsx`: existing native selection/focus tests retained, default medium square geometry, confirmed-selection (arrows only move focus), explicit swatch labels, 64-item/eight-row grid.
- `SwatchPickerSize.stories.tsx`, `SwatchPickerShape.stories.tsx`, `SwatchPickerSpacing.stories.tsx`, `SwatchPickerLayout.stories.tsx` in that story directory: full four-size/three-shape geometry, both gaps and layouts, grid roles and measured horizontal/vertical spacing.
- `SwatchPickerFocusMode.stories.tsx`: real forward/backward Tab, disabled exclusion, arrow cycling, LTR/RTL wrap, remembered reentry, live focus-mode change.
- `SwatchPickerImage.stories.tsx`, `SwatchPickerMixedSwatches.stories.tsx`: preserved image traversal and mixed native Enter/Space selection, exact image/value/event identity. Image sources in the browser fixtures now use inline SVG instead of remote/invalid URLs; no network fixtures.
- `SwatchPickerWithTooltip.stories.tsx`, `SwatchPickerPopup.stories.tsx`: DOM tooltip label integration and real popup Enter/Escape/focus restoration.
- `EmptySwatch.stories.tsx`, `ColorSwatchVariants.stories.tsx`: empty placeholder/add callback without automatic selection, child design overrides. Detailed gradient/icon rendering belongs to ColorSwatch coverage.
- `library\src\components\SwatchPicker\SwatchPicker.test.tsx`, `useSwatchPicker.test.tsx`, `SwatchPicker.types.ts`, `useSwatchPicker.ts`, `useSwatchPickerContextValues.ts`, `useSwatchPickerStyles.styles.ts`, `renderSwatchPicker.tsx`: default/controlled/init-only state, unknown/empty selected values, role/mover precedence, native attrs/class/ref/style, exact event payload and callbacks.
- `library\src\components\ColorSwatch\useColorSwatch.tsx`, `useColorSwatchStyles.styles.ts`, `..\ImageSwatch`, `..\EmptySwatch\useEmptySwatch.ts`, `..\SwatchPickerRow\useSwatchPickerRow.ts`, `library\src\utils\renderUtils.tsx`: real child context integrations, disabled filtering, child design precedence, empty placeholder, geometry.
- Field integration is based on `useSwatchPickerBase_unstable` calling `useFieldControlProps_unstable`; the suite resolves actual label and validation IDs.

## Rounds and fix

38 documentation tests (including all 17 preserved tests), 45 cumulative edges, 51 cumulative unit-derived, 55 final. Adversarial additions cover maximum grid, independent palette contexts, controlled empty strings, live focus mode, and item removal/reappearance.

Production defect reproduced in `94-round2-red.log`: caller root `style` was destructured and discarded by the base hook (padding 0 rather than 13px). Removed only that exclusion. Browser regression verifies padding/maxWidth; local hook regression verifies original style object identity. Post-fix Cypress green and Jest 29/29, one snapshot. No other production edits.

## Commands

The scoped `react-swatch-picker:e2e-swatchpicker` Nx target selects the existing
SwatchPicker configuration and retains the shared Cypress helper prerequisite.
It is not an aggregate of every SwatchPicker child suite.

From the master checkout:

```powershell
$repo = (Get-Location).Path
$node = 'C:\Program Files\scout\resources\node\node.exe'
$component = "$repo\packages\react-components\react-swatch-picker\library\src\components\SwatchPicker"
& $node "$repo\node_modules\cypress\bin\cypress" run --component --browser electron --headless --project "$repo\packages\react-components\react-swatch-picker\library" --config-file src\components\SwatchPicker\cypress.config.cjs
& $node "$repo\node_modules\typescript\bin\tsc" -p "$component\tsconfig.cy.json"
& $node "$repo\node_modules\prettier\bin-prettier.js" --check "$component\*.cy*" "$component\cypress.config.cjs" "$component\tsconfig.cy.json" "$component\useSwatchPicker.ts" "$component\useSwatchPicker.test.tsx"
Set-Location "$repo\packages\react-components\react-swatch-picker\library"
& $node "$repo\node_modules\jest\bin\jest.js" --runInBand --runTestsByPath src\components\SwatchPicker\SwatchPicker.test.tsx src\components\SwatchPicker\useSwatchPicker.test.tsx --silent
```

Local CommonJS config bypasses canonical ESM `import.meta.dirname` failure. The JSX bridge is type-only. Cypress artifacts remain local; logs use requested session artifacts. Shared webpack include warnings are not suppressed.

## Limits

Functional Electron DOM/focus/geometry/event coverage, not universal accessibility, actual screen-reader, image fetching, high-contrast OS or cross-browser certification. Extra-small targets are 20px; spacing is measured, not declared universally WCAG-compliant. ARIA row/grid patterns retain the documented keyboard/AT caveats. No synthetic keys, arbitrary waits, retries, skipped tests, broad error suppression or network fixtures.
