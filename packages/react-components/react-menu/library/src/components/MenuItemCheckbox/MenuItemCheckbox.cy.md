# MenuItemCheckbox browser coverage

## Source mapping

- `react-menu\stories\src\Menu\MenuCheckboxItems.stories.tsx`, `MenuControlledCheckboxItems.stories.tsx`, `MenuDescription.md`, `MenuBestPractices.md`: name/value multiselection, native pointer/Enter/Space toggle from both initial states, frozen/accepted controlled state, persistence and explicit opt-out, MenuTrigger/Popover/List composition.
- `MenuAligningWithSelectableItems.stories.tsx`, `MenuSelectionGroup.stories.tsx`: measured icon/checkmark content alignment and independent grouped radio/checkbox records.
- `react-menu\stories\src\MenuList\MenuListCheckboxItems.stories.tsx`, `MenuListControlledCheckboxItems.stories.tsx`: standalone MenuList/default/control integration; explicit MenuList record precedence over parent Menu.
- `MenuItemCheckbox.test.tsx`, `useMenuItemCheckbox.test.tsx`, `MenuItemCheckbox.types.ts`, `useMenuItemCheckbox.tsx`, `renderMenuItemCheckbox.tsx`, `useMenuItemCheckboxStyles.styles.ts`, `MenuItemCheckbox.tsx`: default root, checked-membership branches, precise raw context toggle payload including prior checked state/event identity, optional/custom/null/default checkmark, icon/content/secondary/subText, enforced context aria-checked, base/design distinction and persistence default.
- `..\MenuItem\useMenuItemBase.tsx`, `..\..\selectable\types.ts`, `..\..\selectable\useCheckmarkStyles.styles.ts`, `react-aria\library\src\button\useARIAButtonProps.ts`, menu/list contexts: focusable disabled semantics, real navigation/typeahead, defaultPrevented paths, 16px hidden-versus-visible checkmark, callback order, ref and lifecycle.

## Rounds

11 documentation, 19 cumulative edges/accessibility, 25 cumulative unit-derived, 29 final. Final review additions cover live name/value changes, list precedence, selection-before-consumer cancellation and close/reopen ref identity. No production edits.

Native keyboard presses on the div-based ARIA button invoke the component's own `.click()` emulation. The original key event is trusted, while that generated click correctly has `isTrusted=false`; native pointer clicks are trusted. Both callback identity and payload are checked. This is not a synthetic keyboard fallback.

## Commands

From master checkout:

```powershell
$repo = (Get-Location).Path
$node = 'C:\Program Files\scout\resources\node\node.exe'
$component = "$repo\packages\react-components\react-menu\library\src\components\MenuItemCheckbox"
& $node "$repo\node_modules\cypress\bin\cypress" run --component --browser electron --headless --project "$repo\packages\react-components\react-menu\library" --config-file src\components\MenuItemCheckbox\cypress.config.cjs
& $node "$repo\node_modules\typescript\bin\tsc" -p "$component\tsconfig.cy.json"
& $node "$repo\node_modules\prettier\bin-prettier.js" --check "$component\*.cy*" "$component\cypress.config.cjs" "$component\tsconfig.cy.json"
```

Intentional local CommonJS config avoids canonical ESM incompatibility; JSX bridge is type-only. Artifacts stay local; logs use requested session artifacts. Shared webpack include-pattern warnings remain visible.

## Limits

Electron functional DOM/focus/native-key/geometry coverage, not universal accessibility, assistive technology, high contrast, pixel snapshots or cross-browser certification. Enter cancellation uses keydown, Space cancellation uses keyup, matching the actual ARIA-button activation stages; consumer click prevention occurs after selection and cannot undo it. Nested interactive content forbidden by menu best practices is not invented. No retries, skips, arbitrary sleeps, network fixtures or error suppression.
