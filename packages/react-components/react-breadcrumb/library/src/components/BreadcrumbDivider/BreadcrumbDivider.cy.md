# BreadcrumbDivider browser coverage

## Sources and mapping

- `stories\src\Breadcrumb\BreadcrumbDefault.stories.tsx`, `BreadcrumbSize.stories.tsx`, `BreadcrumbWithTooltip.stories.tsx`, `BreadcrumbWithOverflow.stories.tsx`, `index.stories.tsx`, `BreadcrumbDescription.md`: round 1 verifies passive separator composition, current-page neighbor, all three sizes and both provider directions. Tooltip and overflow behavior belongs to neighboring controls; dividers have no corresponding interaction.
- `BreadcrumbDivider.types.ts`, `useBreadcrumbDivider.tsx`, `useBreadcrumbDividerStyles.styles.ts`, `renderBreadcrumbDivider.tsx`, `BreadcrumbDivider.tsx`: rounds 1–3 verify default hidden list item, directional icon, intrinsic root forwarding, caller ARIA override, design-child replacement versus base-child retention, ref identity and actual icon dimensions.
- `BreadcrumbDivider.test.tsx`: round 3 translates the default snapshot's SVG attributes into browser assertions; root/ref/class forwarding derives from the unit conformance contract.
- `..\Breadcrumb\BreadcrumbContext.ts`, breadcrumb/button integration: round 2 checks real forward/backward Tab excludes the passive divider, and live size/direction changes preserve the DOM node.
- Final adversarial pass adds sibling-context isolation, nested direction providers, ref detachment and reattachment. No production defect was found.

## Execution

Run from the master checkout, with the existing dependencies. `$repo` is the absolute master checkout path:

```powershell
$node = 'C:\Program Files\scout\resources\node\node.exe'
& $node "$repo\node_modules\cypress\bin\cypress" run --component --browser electron --headless --project "$repo\packages\react-components\react-breadcrumb\library" --config-file src\components\BreadcrumbDivider\cypress.config.cjs
& $node "$repo\node_modules\typescript\bin\tsc" -p "$repo\packages\react-components\react-breadcrumb\library\src\components\BreadcrumbDivider\tsconfig.cy.json"
& $node "$repo\node_modules\prettier\bin-prettier.js" --check "$repo\packages\react-components\react-breadcrumb\library\src\components\BreadcrumbDivider\*.cy*" "$repo\packages\react-components\react-breadcrumb\library\src\components\BreadcrumbDivider\cypress.config.cjs" "$repo\packages\react-components\react-breadcrumb\library\src\components\BreadcrumbDivider\tsconfig.cy.json"
```

The intentional local CommonJS config bypasses the canonical ESM `import.meta.dirname` incompatibility. Artifact folders stay in this component. The `.stories.ts` declaration bridges legacy JSX namespaces for React 19 types; it has no runtime effect.

## Limits

Electron functional DOM/focus/geometry checks, not screen-reader, universal accessibility, pixel snapshots, or cross-browser certification. This is a passive component: no selection, controlled/default interactive state, cancellation, or invented keyboard activation. Native keyboard input uses `cypress-real-events`; no synthetic fallback, waits, retries, skipped tests, fixtures or exception suppression. Existing shared webpack include-pattern warnings are not suppressed.
