# ToolbarToggleButton browser coverage

## Exact source mapping

- `react-toolbar\stories\src\Toolbar\ToolbarControlledToggleButton.stories.tsx`, `ToolbarDescription.md`, `ToolbarBestPractices.md`, `index.stories.tsx`: default/owner/frozen checked records, multiselect/group independence, exact native click callback event identity and name/checkedItems, three-control named toolbar.
- `ToolbarSubtle.stories.tsx`, `ToolbarTransparent.stories.tsx`, `ToolbarSmall.stories.tsx`, `ToolbarMedium.stories.tsx`, `ToolbarLarge.stories.tsx`, `ToolbarVertical.stories.tsx`: three supported appearances/all contextual sizes, actual icon-only targets 24/32/40px, explicit child-size precedence, both directions/orientations and native cyclic toolbar focus.
- `ToolbarWithTooltip.stories.tsx`: real descriptive tooltip/name relationship on native focus.
- `ToolbarDefault.stories.tsx`, `ToolbarFarGroup.stories.tsx`, `ToolbarOverflow.stories.tsx`, `ToolbarWithPopover.stories.tsx`, `ToolbarVerticalButton.stories.tsx`, `ToolbarRadio.stories.tsx`, `ToolbarRadioControlled.stories.tsx`: those examples primarily use ToolbarButton/Radio/control/overflow infrastructure; no unsupported toggle-specific behaviors are inferred. Independent sibling/named group state and separator-skipping focus are checked locally.
- `ToolbarToggleButton.test.tsx`, `useToolbarToggleButton.test.tsx`, `ToolbarToggleButton.types.ts`, `ToolbarToggleButton.tsx`, `useToolbarToggleButton.ts`, `useToolbarToggleButtonStyles.styles.ts`: default subtle/rounded/context size, raw exact toolbar handler event/name/value/prior checked state, base design-free slots, disabled/disabledFocusable, native attrs/icon/ref/style, live updates, checked-state authority and standalone context.
- `..\Toolbar\useToolbar.ts`, `Toolbar.types.ts`, `ToolbarContext.ts`, `react-button\library\src\components\ToggleButton\useToggleButton.ts`, `useToggleButtonStyles.styles.ts`, `..\Button\useButtonStyles.styles.ts`, `react-button\library\src\utils\useToggleState.ts`: checked/default initialization and callbacks, real geometry/styles, explicit checkbox role ARIA branch, disabled paint, selected foreground/icon and form-default semantics.
- `react-aria\library\src\button\useARIAButtonProps.ts`: supported anchor/native Space emulation and disabled focus handling.

## Rounds

19 documentation; 34 cumulative edge/accessibility; 42 cumulative unit-derived; 48 final. Final review adds live name/value/design/disabled updates, initialization-only defaults, sibling isolation, external state paint changes and optional-icon/root ref cleanup. No production edits. Disabled-selected foreground was adversarially tested and is already correct.

## Commands

From master checkout:

```powershell
$repo = (Get-Location).Path
$node = 'C:\Program Files\scout\resources\node\node.exe'
$component = "$repo\packages\react-components\react-toolbar\library\src\components\ToolbarToggleButton"
& $node "$repo\node_modules\cypress\bin\cypress" run --component --browser electron --headless --project "$repo\packages\react-components\react-toolbar\library" --config-file src\components\ToolbarToggleButton\cypress.config.cjs
& $node "$repo\node_modules\typescript\bin\tsc" -p "$component\tsconfig.cy.json"
& $node "$repo\node_modules\prettier\bin-prettier.js" --check "$component\*.cy*" "$component\cypress.config.cjs" "$component\tsconfig.cy.json"
```

Local CommonJS setup bypasses canonical ESM failure; legacy JSX bridge is type-only. Artifacts remain local and logs use requested session artifacts. Shared webpack include warnings remain visible.

## Limits

Electron functional DOM/focus/native-event/geometry/style coverage, not universal accessibility, AT, pixel snapshots, cross-browser or actual OS high contrast. Native button keyboard clicks are trusted. Supported anchor Space activation uses the component's own generated click (`isTrusted=false`) following a trusted key event, asserted separately; no synthetic keyboard fallback exists. Click prevention occurs after parent selection, while native keydown prevention blocks activation. Explicit checkbox-role forwarding is tested, not certified for every consumer composition. No retries, skipped tests, arbitrary sleeps, network fixtures or error suppression.
