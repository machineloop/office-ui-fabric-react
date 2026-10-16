# TagPickerInput browser coverage

## Exact source mapping

All story paths are relative to `react-tag-picker\stories\src\TagPicker`.

- `TagPickerDefault.stories.tsx`, `TagPickerDescription.md`, `TagPickerBestPractices.md`, `TagPickerA11y.md`, `index.stories.tsx`: text combobox semantics, explicit name, native typing, active-descendant option navigation/selection, confirmed dismissal, cursor-at-start group transfer. Native Backspace first focuses a tag in this implementation; a separate Delete removes it. The broad best-practice Backspace wording is not asserted as immediate deletion.
- `TagPickerSize.stories.tsx`, `TagPickerAppearance.stories.tsx`: all three contextual sizes/four appearances, real padding/transparent input. Field size must not become an HTML input size.
- `TagPickerFiltering.stories.tsx`: real useTagPickerFilter integration with controlled query, conditional autofocus, match selection, owner-cleared query and no-match content.
- `TagPickerNoPopover.stories.tsx`: owner-controlled native Enter creates custom tags; no popup controls relationship.
- `TagPickerDisabled.stories.tsx`: native disabled Tab exclusion and explicit disabled override.
- `TagPickerGrouped.stories.tsx`, `TagPickerSingleSelect.stories.tsx`: input uses selected-options context rather than defining grouping/single-selection itself; selected IDs and owner/default control are covered.
- `TagPickerSingleLine.stories.tsx`, `TagPickerTruncatedText.stories.tsx`: layout/truncation is owner styling, not an input API. Tests verify actual stretch/new-line geometry within a constrained control, not universal truncation.
- `TagPickerExpandIcon.stories.tsx`, `TagPickerSecondaryAction.stories.tsx`, `TagPickerButton.stories.tsx`: separate control/button slots, not rendered by TagPickerInput; no invented input icon interactions.
- `TagPickerInput.test.tsx`, `useTagPickerInput.test.tsx`, `TagPickerInput.types.ts`, `useTagPickerInput.tsx`, `useTagPickerInputStyles.styles.ts`, `TagPickerInput.tsx`, `renderTagPickerInput.tsx`: snapshot defaults, context/prop precedence, popup controls/open behavior, Enter/Space distinctions, caret/selection guards, native callbacks/attrs/ref, stretch measurement and live updates.
- `..\..\contexts\TagPickerContext.ts`, `..\..\utils\tokens.ts`, `..\..\utils\useTabsterEscapeIgnore.ts`, `react-combobox\library\src\components\Combobox\useInputTriggerSlot.ts`, `react-combobox\library\src\utils\useTriggerSlot.ts`, `dropdownKeyActions.ts`, `react-field\library\src\contexts\useFieldControlProps.ts`: real trigger/Field/keyboard/stretch integration. Field fallback `aria-labelledby` is resolved when an explicit control ID differs from the generated label-for ID.

## Rounds and fixes

12 documentation; 20 cumulative edges; 26 cumulative unit-derived; 31 final. Local Jest 28/28, one snapshot.

Two within-component production fixes:

1. ArrowLeft/Backspace at collapsed caret ignored consumer cancellation and moved focus to tags. Genuine native red: `96-round2-red-functional.log`. Minimal `defaultPrevented` guard; two local hook regressions plus native tests.
2. Clearing long text left the stretch variable at 100%, because native measurement happened before the final React value render. Genuine isolated red: `96-round3-green3.log`. The existing layout effect now also depends on effective value, remeasuring native and externally controlled value changes after render. Browser regressions cover native clear, owner long/empty updates and actual new-line geometry.

Earlier red logs include fixture/test corrections (Field relationship, accidental suite registration inside a test, native clearing while popup keys owned Home/End, and Cypress changed-subject assertions). They are retained; no synthetic key fallback was introduced. Native range clearing uses Escape, Home, Shift+End, Backspace.

## Commands

From master checkout:

```powershell
$repo = (Get-Location).Path
$node = 'C:\Program Files\scout\resources\node\node.exe'
$component = "$repo\packages\react-components\react-tag-picker\library\src\components\TagPickerInput"
& $node "$repo\node_modules\cypress\bin\cypress" run --component --browser electron --headless --project "$repo\packages\react-components\react-tag-picker\library" --config-file src\components\TagPickerInput\cypress.config.cjs
& $node "$repo\node_modules\typescript\bin\tsc" -p "$component\tsconfig.cy.json"
& $node "$repo\node_modules\prettier\bin-prettier.js" --check "$component\*.cy*" "$component\cypress.config.cjs" "$component\tsconfig.cy.json" "$component\useTagPickerInput.tsx" "$component\useTagPickerInput.test.tsx"
Set-Location "$repo\packages\react-components\react-tag-picker\library"
& $node "$repo\node_modules\jest\bin\jest.js" --runInBand --runTestsByPath src\components\TagPickerInput\TagPickerInput.test.tsx src\components\TagPickerInput\useTagPickerInput.test.tsx --silent
```

Local CommonJS Cypress config and type-only JSX bridge intentionally use existing infrastructure without global/config changes. Artifact folders remain local and logs use requested session artifacts.

## Limits

Electron DOM/focus/event/geometry checks only, not screen-reader, universal accessibility, mobile/IME, visual or cross-browser certification. Published Narrator/VoiceOver limits remain. Native event cancellation fix concerns caret transfer; shared combobox selection/open handlers may run before consumer callbacks, so no universal cancellation guarantee is made. No retries, skips, arbitrary sleeps, network fixtures or exception suppression. Existing include-pattern warnings are visible.
