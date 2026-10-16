# ToolbarDivider browser coverage

## Sources

- `react-toolbar\stories\src\Toolbar\ToolbarDefault.stories.tsx`, `ToolbarDescription.md`, `ToolbarBestPractices.md`, `index.stories.tsx`: real toolbar/button/divider grouping, passive separator skips native focus, default perpendicular orientation.
- `ToolbarSmall.stories.tsx`, `ToolbarMedium.stories.tsx`, `ToolbarLarge.stories.tsx`, `ToolbarVertical.stories.tsx`: size/orientation integration. All three sizes and both orientations get real pseudo-line/geometry checks; explicit divider vertical prop wins context inversion.
- Other toolbar stories use controls/appearance/tooltip/menu/overflow behavior owned by their components, not ToolbarDivider; no invented passive divider activation.
- `ToolbarDivider.test.tsx`, `useToolbarDivider.test.tsx`, `ToolbarDivider.types.ts`, `useToolbarDivider.ts`, `useToolbarDividerStyles.styles.ts`, `ToolbarDivider.tsx`: default state/conformance, contextual inversion, primary ref/native attrs/class/style, base state lacks design defaults, slot wrapper/ref, dynamic orientation/name and lifecycle.
- `..\Toolbar\Toolbar.types.ts`, `ToolbarContext.ts`, `react-divider\library\src\components\Divider\useDivider.ts`, `renderDivider.tsx`, `useDividerStyles.styles.ts`: separator ARIA, root children are authoritative over wrapper shorthand children, naming truthiness versus wrapper defined-child condition, border pseudo-elements and actual sizing.

## Rounds

9 documentation, 15 cumulative edges/accessibility, 20 cumulative unit-derived, 23 final. Final adversarial improvements cover context isolation, naming/ref removal/readdition, and measured caller style overrides. No production edits. One red fixture expected wrapper shorthand children to win; the renderer explicitly renders root children, and the assertion was corrected.

## Commands

From master checkout:

```powershell
$repo = (Get-Location).Path
$node = 'C:\Program Files\scout\resources\node\node.exe'
$component = "$repo\packages\react-components\react-toolbar\library\src\components\ToolbarDivider"
& $node "$repo\node_modules\cypress\bin\cypress" run --component --browser electron --headless --project "$repo\packages\react-components\react-toolbar\library" --config-file src\components\ToolbarDivider\cypress.config.cjs
& $node "$repo\node_modules\typescript\bin\tsc" -p "$component\tsconfig.cy.json"
& $node "$repo\node_modules\prettier\bin-prettier.js" --check "$component\*.cy*" "$component\cypress.config.cjs" "$component\tsconfig.cy.json"
```

Local CommonJS config bypasses canonical ESM issue; legacy JSX bridge is type-only. Artifacts remain local; logs use requested session artifacts and webpack warnings remain visible.

## Limits

Electron functional DOM/pseudo-line/native toolbar-focus/geometry checks, not universal accessibility, screen-reader, pixel snapshot, cross-browser or OS high-contrast certification. Divider is passive: no selection, callback cancellation or keyboard activation is invented. Native role/ARIA overrides are forwarded but not certified accessible. No retries, skips, arbitrary sleeps, network fixtures, exception suppression or synthetic key fallback.
