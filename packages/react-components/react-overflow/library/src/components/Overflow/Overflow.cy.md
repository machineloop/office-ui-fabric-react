# Overflow browser coverage

## Sources and scenarios

All stories are in `react-overflow\stories\src\Overflow`.

- `Default.stories.tsx`, `OverflowDescription.md`, `index.stories.tsx`: real ResizeObserver geometry, cloned child, hidden attributes/display, menu reservation, exact null-event/visibility callback snapshots, overflow menu populated by real visibility hooks and native opening/Escape.
- `Vertical.stories.tsx`, `ReverseDomOrder.stories.tsx`: both axes/directions with actual 60px items and 40px trigger.
- `OverflowByPriority.stories.tsx`, `Pinned.stories.tsx`, `MinimumVisible.stories.tsx`: numerical priority, never-overflow pins, minimum-visible clipping semantics, live priority/pin changes and reset to zero.
- `Dividers.stories.tsx`, `LargerDividers.stories.tsx`, `PriorityWithDividers.stories.tsx`: group visible/overflow/hidden callback states, registered 20px dividers participate in measured capacity, hidden group removes its divider, priority selects the matching group. Padding reserve has exact-fit/reset tests.
- `ListenToChanges.stories.tsx`: callback event is precisely null, snapshots match item/group identities, not arbitrary callback counts.
- `CustomComponent.stories.tsx`, `Wrapped.stories.tsx`: forwardRef root and external wrapper, native attrs/class/style, merged refs and no added DOM wrapper.
- `ReorderObserver.stories.tsx`: real explicit OverflowReorderObserver updates reversed DOM-order priority without resizing. Reorder observation is not assumed for bare Overflow.
- `Overflow.test.tsx`, `Overflow.types.ts`, `useOverflow.ts`, `renderOverflow.tsx`, `useOverflowStyles.styles.ts`, `Overflow.tsx`, `useOverflow.test.tsx`: ref forwarding, empty container, base/headless registration versus design hiding, cleanup and live option updates.
- `..\..\useOverflowContainer.ts`, `useOverflowContextValues.ts`, `useOverflowMenu.ts`, `..\OverflowItem\OverflowItem.tsx`, `OverflowItem.types.ts`, `..\OverflowDivider\OverflowDivider.tsx`, `OverflowDivider.types.ts`, `priority-overflow\src\types.ts`, `overflowManager.ts`: registration, native geometry, hidden-item menu reserve and false reset, exact group enum, cleanup behavior.

## Rounds and production fix

9 documentation, 15 cumulative edges/accessibility, 20 cumulative unit-derived, 25 final. Local Jest 3/3.

Genuine red `100-round2-red.log`: resetting padding/minimumVisible to zero did not recompute when container dimensions stayed unchanged. The priority manager's option-change trigger treated falsy values as absent. Only this component's `useOverflow.ts` changed: force recomputation after option changes, including zero/false resets. Local hook and real browser regressions cover it. Shared manager/helpers were not modified.

Earlier red runs included test corrections for Cypress attribute subject changes and the real partial-group enum spelling (`overflow`, not `partial`).

## Commands

From master checkout:

```powershell
$repo = (Get-Location).Path
$node = 'C:\Program Files\scout\resources\node\node.exe'
$component = "$repo\packages\react-components\react-overflow\library\src\components\Overflow"
& $node "$repo\node_modules\cypress\bin\cypress" run --component --browser electron --headless --project "$repo\packages\react-components\react-overflow\library" --config-file src\components\Overflow\cypress.config.cjs
& $node "$repo\node_modules\typescript\bin\tsc" -p "$component\tsconfig.cy.json"
& $node "$repo\node_modules\prettier\bin-prettier.js" --check "$component\*.cy*" "$component\cypress.config.cjs" "$component\tsconfig.cy.json" "$component\useOverflow.ts" "$component\useOverflow.test.tsx"
Set-Location "$repo\packages\react-components\react-overflow\library"
& $node "$repo\node_modules\jest\bin\jest.js" --runInBand --runTestsByPath src\components\Overflow\Overflow.test.tsx src\components\Overflow\useOverflow.test.tsx --silent
```

Intentional local CommonJS config and type-only JSX bridge use existing infrastructure. Artifacts remain local, logs use requested session artifacts; webpack include warnings remain visible.

## Limits

Electron functional observer/DOM/focus/native-menu/geometry coverage, not universal accessibility, assistive technology, cross-browser or visual certification. Overflow itself is passive and does not own selection or invent cancellation events; its callback event is null. Pins/minimumVisible can intentionally exceed the container and be clipped; no visibility claim is made for physically clipped regions. Headless rendering attaches state/attributes but requires caller hiding styles. No arbitrary sleeps, retries, skips, network fixtures, error suppression or synthetic key fallback.
