# ColorSwatch browser coverage

## Source mapping

- `react-swatch-picker\stories\src\SwatchPicker\ColorSwatchVariants.stories.tsx`: solid/gradient paint, border color, icon, initials, native disabled state and prohibited glyph.
- `SwatchPickerSize.stories.tsx`, `SwatchPickerShape.stories.tsx`, `SwatchPickerSpacing.stories.tsx` in the same directory: four-size/three-shape actual target geometry, inherited design and explicit child precedence. Spacing is owned/tested by SwatchPicker, not invented as a ColorSwatch prop.
- `SwatchPickerDefault.stories.tsx`, `SwatchPickerLayout.stories.tsx`, `SwatchPickerMixedSwatches.stories.tsx`, `SwatchPickerFocusMode.stories.tsx`: real row/grid native pointer/Enter/Space selection, radio/gridcell ARIA, disabled traversal, no arrow implicit selection, controlled frozen versus default parent state.
- `SwatchPickerWithTooltip.stories.tsx`, `SwatchPickerBestPractices.md`, `SwatchPickerDescription.md`, `index.stories.tsx`: descriptive tooltip/native label and low-contrast border. No computed universal contrast/WCAG claim. Popup/image/empty behavior belongs to those neighboring components.
- `ColorSwatch.test.tsx`, `useColorSwatch.test.tsx`, `ColorSwatch.types.ts`, `useColorSwatch.tsx`, `renderColorSwatch.tsx`, `useColorSwatchStyles.styles.ts`, `ColorSwatch.constants.ts`, `ColorSwatch.tsx`: default snapshot, exact context selection request/event identity, role/ARIA/size/shape precedence, CSS-variable/native attrs/style/ref forwarding, icon/disabled-icon shorthand/null/children, base versus design hooks.
- `..\..\contexts\swatchPicker.ts`, SwatchPicker integration: no local standalone selection state, parent-controlled value, dynamic row/grid roles, disabled updates and ref detachment.

## Rounds

21 documentation, 28 cumulative edge/accessibility, 34 cumulative unit-derived, 40 final. Final adversarial improvements exercise all four selected-shadow branches/native hover, frozen controlled native Space and dynamic layout/ref cleanup. No production changes.

## Commands

From master checkout:

```powershell
$repo = (Get-Location).Path
$node = 'C:\Program Files\scout\resources\node\node.exe'
$component = "$repo\packages\react-components\react-swatch-picker\library\src\components\ColorSwatch"
& $node "$repo\node_modules\cypress\bin\cypress" run --component --browser electron --headless --project "$repo\packages\react-components\react-swatch-picker\library" --config-file src\components\ColorSwatch\cypress.config.cjs
& $node "$repo\node_modules\typescript\bin\tsc" -p "$component\tsconfig.cy.json"
& $node "$repo\node_modules\prettier\bin-prettier.js" --check "$component\*.cy*" "$component\cypress.config.cjs" "$component\tsconfig.cy.json"
```

Intentional local CommonJS setup bypasses ESM import.meta.dirname failure. Type-only JSX bridge supports current React types. Artifacts remain local; logs use requested session artifacts. Existing webpack include warnings are not suppressed.

## Limits

Functional Electron DOM/focus/event/geometry/paint assertions, not universal accessibility, assistive technology, actual forced-colors OS, contrast certification, pixel snapshots or cross-browser certification. Extra-small is 20px; default button does not submit forms. Child preventDefault propagates to the exact callback event but does not cancel the picker request in this API. No retries, skips, arbitrary waits, network fixtures or synthetic key fallback.
