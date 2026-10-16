# InfoLabel browser coverage

## Sources and mapping

- `react-infolabel\stories\src\InfoLabel\InfoLabelDefault.stories.tsx`, `InfoLabelDescription.md`, `InfoLabelPatternDecision.md`, `InfoLabelBestPractices.md`, `index.stories.tsx`: real pointer/Enter/Space note opening, popup focus, Escape/toggle/outside/Tab closing, ownership lifecycle, compound button name, no focus-only opening. All four original browser cases remain; their legacy key token and synthetic click were replaced with valid native events.
- `InfoLabelSize.stories.tsx`: all three typography/target dimensions and margin alignment. Small/medium/large buttons measure 20/24/24px; this is not a universal target-spacing certification.
- `InfoLabelRequired.stories.tsx`: required indicator within label before button.
- `InfoLabelInField.stories.tsx`: actual Field label render function/native Input association and compound button naming.
- `InfoLabel.types.ts`, `useInfoLabel.ts`, `renderInfoLabel.tsx`, `useInfoLabelStyles.styles.ts`, `InfoLabel.tsx`, `InfoLabel.test.tsx`: primary label versus root attrs/style/ref, slot precedence, optional button/null/falsy info, overridden IDs, naming overrides, controlled/default popup ownership, ownership cleanup and dynamic removal/reinsertion.
- `..\InfoButton\InfoButton.types.ts`, `useInfoButton.tsx`: actual popup/ref/blur/size contracts and portal composition. Focus transfer within popup retains ownership; outside native focus removes it.

## Rounds and reproduced production fixes

13 documentation (four preserved tests included); 20 cumulative edges; 26 cumulative unit-derived; 29 final. Local Jest regression suite included.

Within `useInfoLabel.ts` only:

1. Default-open, controlled-open and frozen controlled-closed ownership did not match actual rendered popup. Root ownership now uses effective controlled open or initialization/default/local state.
2. InfoButton's internal focus-out close did not notify InfoLabel, leaving stale aria-owns. Locally merged button/surface blur handlers synchronize ownership while preserving caller callbacks and refs.
3. Custom popup ID retained a default aria-labelledby pointing to nonexistent generated ID. Default self-name now uses the actual final popup ID, without replacing explicit names.
4. Removing an open optional button and reinserting a closed instance retained stale ownership. Optional-instance transitions reset tracked uncontrolled/default state.

Genuine native reds: `98-round2-red.log` (four ownership failures), `98-round3-red.log` (two missing naming targets), `98-review-red.log` (dynamic stale ownership). Local unit regressions cover each family. An earlier large-target 28px fixture expectation was corrected to implementation-backed 24px.

## Commands

From master checkout:

```powershell
$repo = (Get-Location).Path
$node = 'C:\Program Files\scout\resources\node\node.exe'
$component = "$repo\packages\react-components\react-infolabel\library\src\components\InfoLabel"
& $node "$repo\node_modules\cypress\bin\cypress" run --component --browser electron --headless --project "$repo\packages\react-components\react-infolabel\library" --config-file src\components\InfoLabel\cypress.config.cjs
& $node "$repo\node_modules\typescript\bin\tsc" -p "$component\tsconfig.cy.json"
& $node "$repo\node_modules\prettier\bin-prettier.js" --check "$component\*.cy*" "$component\cypress.config.cjs" "$component\tsconfig.cy.json" "$component\useInfoLabel.ts" "$component\InfoLabel.test.tsx"
Set-Location "$repo\packages\react-components\react-infolabel\library"
& $node "$repo\node_modules\jest\bin\jest.js" --runInBand --runTestsByPath src\components\InfoLabel\InfoLabel.test.tsx --silent
```

Intentional local CommonJS config bypasses canonical ESM incompatibility. Type-only legacy JSX bridge supports current React types. Artifacts remain local; logs use requested session artifacts. Shared webpack include warnings remain visible.

## Limits

Functional Electron DOM/focus/native-event/geometry coverage, not actual assistive technology, universal accessibility, cross-browser, visual or OS forced-colors certification. Explicit consumer aria-owns/aria-labelledby overrides are preserved even if the caller references nonexistent IDs; the suite does not certify such overrides. No retries, skips, arbitrary sleeps, fixtures, broad error suppression or synthetic key fallback.
