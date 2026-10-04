# DataGridHeader (component 123): Cypress functional traceability

## Scope

Only `packages\react-components\react-table\library\src\components\DataGridHeader` is written.
The shared Windows checkout and installed dependencies are used. No product implementation,
unit tests, snapshots, shared configuration, dependencies, or branches are changed.
Only authored component-local test/configuration files are committed, after a
fresh repeated adversarial review reports no additional findings.
Other threads' changes and commits are not reverted or incorporated into this work.

Historical `reports/` artifacts remain on disk and are ignored by this
directory's `.gitignore`; they are not part of the test-source commit. Staging
uses an explicit authored-file allow-list, never the whole directory.

The active suite registers **70 uniquely named functional cases**. The **61 prior-work
cases are preserved**, not newly authored or replaced. Their historical cumulative rounds
were **16, 33, 55, and 61 cases**. The current source-backed addition rounds are
**63, 68, and 70 cases**. Current canonical integration, inventory and evidence are below;
the earlier round narratives and reports remain explicitly historical.

## Evidence read

- All local `stories\src\DataGrid` story implementations, `index.stories.tsx`,
  `DataGridDescription.md`, and `DataGridBestPractices.md`.
- `TableBestPractices.md`, non-native and size stories relevant to inherited table context.
- All DataGridHeader source, public props/slots/state, rendering/style hooks, exports,
  unit tests, and snapshot.
- All inherited TableHeader source, types, context/rendering/styles, unit tests and snapshot;
  existing TableHeader functional tests were read as inherited-contract prior art.
- DataGrid, DataGridRow, DataGridHeaderCell, DataGridSelectionCell and DataGridBody
  source/types/styles/context and related unit tests. DataGridCell source, TableRow and
  TableHeaderCell behavior, and TableSelectionCell source/styles were also read.
- Table/column/row/header contexts, sorting and selection hooks, selection utilities,
  sizing/measurement, pointer resizing, keyboard resizing and composite navigation.
- Installed Cypress support/StrictMode mount, repository testing guidance and root
  instructions, plus isolated TableSelectionCell and TagPickerOptionGroup runners.

DataGridHeader is a thin TableHeader specialization: it always forces `as="div"`, provides
header context, and adds its own static class to inherited styles. Sorting, selection,
navigation and resizing are tested as observable compositions through this wrapper, not
misrepresented as independent DataGridHeader algorithms.

## Round 1: unit-derived root and documented compositions (16)

| Case     | Source or contract                                                | Interaction and observable assertions                                                                                                                               |
| -------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1.01    | DataGridHeader unit snapshot/conformance                          | Standalone DIV, rowgroup, both static classes, exact text, no default tab stop.                                                                                     |
| R1.02 x3 | Header props/type alias; specialization vs inherited `as`         | Omitted/div/thead all produce DIV rowgroup, block layout, one row/two columns; real click and axe. Unlike TableHeader, explicit thead is intentionally not honored. |
| R1.03    | Ref/attribute/style/event conformance                             | Exact object ref node, consumer class/title/display, rowgroup accessible name, pointer target and currentTarget, Enter callback key.                                |
| R1.04    | Ref lifecycle and latest handlers                                 | Owner update preserves node, forwards updated attributes, invokes only latest handler, unmount passes null to callback ref.                                         |
| R1.05 x2 | TableHeader layout context and unit tests                         | Native-layout/non-native-layout host changes display, never changes forced DIV rowgroup semantics.                                                                  |
| R1.06    | Default story                                                     | Four named columns; sorting changes body order; select-all updates every row; header row stays unselected/untabbable; axe after interaction.                        |
| R1.07 x2 | Sort and SortControlled stories; header-cell units                | Pointer, Enter and Space alternate aria-sort and exact ascending/descending body order; axe.                                                                        |
| R1.08 x2 | MultipleSelect and MultipleSelectControlled; selection-cell units | Mixed/all/none checkbox properties, exact body row/input state, selection-cell aria-selected presence/value, body-to-header feedback, Space and pointer, axe.       |
| R1.09 x2 | SingleSelect and SingleSelectControlled; header selection units   | Input-free, opacity-zero placeholder; ordinary header click/Space do not select; body click replaces selection; axe.                                                |
| R1.10    | DataGridRow header exclusion units                                | Exact bubbled click/Space callbacks, zero selection callbacks, all rows and header checkbox remain unselected.                                                      |

## Round 2: remaining local stories, navigation and resizing (17 additional)

| Case     | Source or contract                                    | Interaction and observable assertions                                                                                                                                                                |
| -------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2.01 x2 | Cell focus; default navigation, RTL public behavior   | Tab entry, LTR/RTL horizontal arrows, Down/Up between header/body, Ctrl+End/Home, Tab exit/Shift+Tab re-entry, exact focus and no root tab stop; axe.                                                |
| R2.02    | CompositeNavigation story and composite hook          | Tab to select-all, Right to File, Down to body row, Right into its indicator, Escape to row, Ctrl+Home to header; header row remains untabbable; axe.                                                |
| R2.03    | FocusableElementsInCells story/header `group` units   | Enter into actions, forward/backward trapped Tab, menu opening and two items, Escape to trigger then header cell; no sorting ARIA; axe.                                                              |
| R2.04    | SubtleSelection story/style contract                  | Mixed indicator visible, all/none transitions, outside click hides, hover and keyboard Tab reveal, selection remains visible after body focus; exact opacity/state; axe.                             |
| R2.05    | SelectionAppearance story/header appearance exclusion | Neutral body background changes, exact header background stays unchanged after select-all; axe.                                                                                                      |
| R2.06    | CustomRowId story                                     | Header pointer/Space synchronize all four external checkbox indicators and body state; body selection feeds mixed header state; no header identity enters selection; axe.                            |
| R2.07    | Sort story's column without comparator/header units   | No aria-sort or sort button; tabIndex retained; pointer/Enter/Space cannot change active sort/order.                                                                                                 |
| R2.08 x6 | Both resize stories and documented exit keys          | Context menu activation, 20px coarse/5px precision delta, all body/header widths aligned, aria-valuetext, active/hidden separator, Escape/Enter/Space focus restoration and subsequent sorting; axe. |
| R2.09 x2 | Both resize stories/pointer handler                   | Real mouse down/move/up increases actual width beyond a measured threshold, exact header/body alignment, no pointer-drag sorting, subsequent sort works.                                             |
| R2.10    | ResizableColumnsDisableAutoFit story                  | Container narrows to 350px; first content width stays 180px; last column has a handle, grows 20px with keyboard, restores sort focus and causes measurable overflow.                                 |

Both default auto-fit and disabled auto-fit stories are exercised. DOM border-box width
includes cell padding; resize `aria-valuetext` and callback width refer to content width.
Tests keep these quantities distinct instead of assuming they are interchangeable.

## Round 3: public/state/context contracts and local virtualization (22 additional)

| Case     | Source or contract                              | Interaction and observable assertions                                                                                                                                                                                                                                                 |
| -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R3.01 x2 | Selection controlled/uncontrolled contracts     | Exact callback count, native activation type and sorted selected-ID sets for header click, header Space and body click; exact row/input/mixed state; axe.                                                                                                                             |
| R3.02    | Controlled selection ownership                  | Rejected select-all emits request but changes no DOM selection; external acceptance updates all; subsequent rejected clear stays selected.                                                                                                                                            |
| R3.03 x2 | Sorting state/callback contracts                | Non-StrictMode production-like pointer/Enter/Space emit exactly one state per activation, exact order/aria-sort; zero selection callbacks or header selection.                                                                                                                        |
| R3.04    | Controlled sorting ownership                    | Rejected sort request preserves order and ARIA; external owner update changes both.                                                                                                                                                                                                   |
| R3.05    | Non-sortable grid/header-cell units             | Comparators alone do not enable sorting; no buttons, sort ARIA, selection slot or callback after pointer/Enter/Space.                                                                                                                                                                 |
| R3.06    | Empty-data boundary                             | Zero body rows, unchecked/non-mixed header, one empty-set callback on select-all, no invented header row ID; axe with exact empty-body incomplete classification and ten rejection checks.                                                                                            |
| R3.07    | Dynamic items/identity state                    | Removing/restoring an unselected item recalculates all/mixed; existing IDs and exact header node are preserved.                                                                                                                                                                       |
| R3.08    | Dynamic column context                          | Insertion/reordering changes exact header names, body column order, comparator selection, row IDs and aria-sort; axe.                                                                                                                                                                 |
| R3.09    | Dynamic inherited TableHeader layout            | Real owner toggles table/flex display while preserving header node, DIV tag and rowgroup role.                                                                                                                                                                                        |
| R3.10 x3 | Medium/small/extra-small table context          | Header button retains 32px minimum height; header/body row width and each column's left edge align; classes/layout and axe.                                                                                                                                                           |
| R3.11 x2 | `none` and `row_unstable` focus units           | No grid mover/root/header-row tab stops; exact native descendant/body-row/exit tab sequence and body tabIndex; axe.                                                                                                                                                                   |
| R3.12    | Header context scope/multiple rows              | Select-all in second header row updates both indicators and all logical IDs once; body deselection feeds both mixed states; ordinary header click emits no selection; axe.                                                                                                            |
| R3.13    | Multiple grid context isolation                 | Select-all/sorting affect only their grid; other header/input/order remain unchanged.                                                                                                                                                                                                 |
| R3.14    | Public headless hooks                           | State/styles/render hooks produce correct ref/role/classes/layout and actual select-all header context; axe.                                                                                                                                                                          |
| R3.15    | Custom style hook conformance                   | Provider custom hook wins after inherited defaults, preserving consumer/static classes and attributes; descendant focus still works.                                                                                                                                                  |
| R3.16    | Virtualization story's documented recomposition | Local react-window fixture with 100 logical IDs and memo-stable row renderer. Header selects IDs absent from DOM; native scrolling unmounts/remounts rows; Space deselects the last row, header becomes mixed, select-all restores it; exact callback sets/counts/node identity; axe. |
| R3.17    | Inherited StrictMode sort baseline              | One pointer activation invokes uncontrolled sort callback twice with identical descending state, while observable DOM/order transition occurs once.                                                                                                                                   |

The local virtualization story itself is only a remote iframe to a separately published
Fluent contrib package. Its remote content is not executed or claimed as tested. R3.16 is
an explicit local analogue using the already installed react-window package and row-ID
context provider; it is not a test of the remote contrib implementation. Virtualized row
deselection uses real Space after focus; no passing virtualized pointer-deselection claim
is made. Pointer selection is covered in non-virtual body fixtures and the persistent
virtualized header.

## Round 4: callback precision and root accessibility edges (6 additional)

| Case  | Source or contract                           | Interaction and observable assertions                                                                                                                                     |
| ----- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R4.01 | Context-provided keyboard resizing callback  | Exact native event type/key, column ID, 20px/5px changes, six callbacks, minimum clamp at 80px, content width and aria-valuetext; Escape restores focus and no sort; axe. |
| R4.02 | Context-provided pointer resizing callback   | Real drag emits mousemove with resulting content width, body matches that width, mouseup leaves sorting/order unchanged.                                                  |
| R4.03 | Documented accessible labeling               | Visible heading labels grid; rowgroup, all columns and select-all have exact accessible names; selected body/header semantics remain correct; axe.                        |
| R4.04 | Explicit root tabIndex/forwarded focus event | Root becomes mover's Tab entry; exact focus callback currentTarget/target; Tab exits grid; descendants remain focusable and arrow-navigable.                              |
| R4.05 | Public children updates                      | Null/fragment children alternate empty/two-span content while preserving root node. This standalone representation is not claimed to be a valid complete grid for axe.    |
| R4.06 | Forwarded hidden/style attributes            | Exact inherited hidden-attribute/display baseline; consumer display:none removes descendant tab stops; owner restoration restores Tab entry; axe.                         |

## Axe policy and known inherited limitations

Each `audit()` executes axe twice, sequentially: once on the full composed grid and once
on the header. Reports record scenario names, pass counts, violation IDs/targets, and full
incomplete rule/node/check details for both scopes.
No axe rule is disabled, no exception is suppressed, and no violation is silently filtered.

A clean result is accepted. If violations exist, **the only accepted rule is exactly
`aria-hidden-focus`**, and **every failing node must equal the complete set of focusable
`i[data-tabster-dummy][aria-hidden="true"][tabindex="0"]` elements in that audited scope**.
Non-sentinel nodes, additional rules, or additional/missing failing nodes fail the test.
Grouped header actions can place these Tabster sentinel nodes inside the header itself.
The reports retain these findings; "green" does not mean a zero-violation full-grid audit.
The only expected incomplete is **`aria-required-children` on exactly
`[".fui-DataGridBody"]`**, in the **full-grid** audits of R3.06 (`empty grid`) and R4.06
(`restored visible header`) only. Both fixtures intentionally use `items={[]}`. The actual
node is an empty `<div role="rowgroup" class="fui-DataGridBody fui-TableBody ..."></div>`,
not DataGridHeader. Installed axe-core 4.10's `ariaRequiredChildrenEvaluate` returns
indeterminate for empty roles in `reviewEmpty`, including `rowgroup`; its check data is
`["row"]` and message is `Expecting ARIA child role to be added: row`. This remains a
manual-review finding, not a proven accessibility pass or a suppressed violation.

Classification uses the exact Cypress case title and scope, requires the complete
rule/target set and check data, and verifies exactly one body with role `rowgroup` and
zero child nodes. Missing expected findings also fail. Every other full-grid audit and
**every header audit** requires zero incompletes, before the violation baseline is checked.
R3.06 additionally asserts ten rejected inputs: missing finding, extra rule, wrong rule,
missing node, duplicate node, wrong target, wrong required-child data, unlisted scenario,
header scope, and nonempty body. The existing tight Tabster violation policy is unchanged.
There is **no color-contrast incomplete evidence** in the diagnostic or corrected runs;
the earlier manifest claim was inaccurate and has been removed. Real keyboard movement
is independently asserted; screen-reader announcements and forced-colors rendering are
not automated here.

Other existing cross-component behavior is pinned, not patched outside scope:

- Space exit from keyboard resizing restores the sort button on keydown, then its keyup
  activates sorting. Escape/Enter exit do not sort. R2.08 verifies the exact difference.
- Uncontrolled sort callbacks are repeated by React StrictMode's state-updater execution.
  R3.17 preserves that baseline; R3.03 verifies once-per-activation behavior without
  StrictMode. Controlled and selection behavior are tested separately.
- The forwarded native `hidden` attribute does not defeat inherited authored `display:block`.
  R4.06 requires the exact baseline and demonstrates an explicit display:none override.
- The known NVDA sort-announcement caveat in the Sort story is not resolved by DOM/axe tests.
- The user supplied an independent review approving the other findings and identifying
  incomplete classification as blocking. This correction addresses that finding only;
  no agents were used and runtime validation is not represented as new review approval.

## Historical component-local runner and verification (prior work)

This section describes the prior author's 61-case evidence. Its task registration, entry
filename and JSX bridge have since been integrated as described below. Historical logs
are preserved; they are not evidence of current canonical discovery or independent review.

From the shared checkout root in Windows PowerShell:

```powershell
$component = 'packages\react-components\react-table\library\src\components\DataGridHeader'
node node_modules\cypress\bin\cypress run --component --browser chrome --headless `
  --project packages\react-components\react-table\library `
  --config-file src\components\DataGridHeader\DataGridHeader.cypress.config.cjs

# Cumulative rounds: 1 => 16, 2 => 33, 3 => 55, 4 => 61.
# Omit coverageRound for the entire suite. Invalid values throw rather than pass empty.
node node_modules\cypress\bin\cypress run --component --browser chrome --headless `
  --project packages\react-components\react-table\library `
  --config-file src\components\DataGridHeader\DataGridHeader.cypress.config.cjs `
  --env coverageRound=3

node node_modules\typescript\bin\tsc -p "$component\DataGridHeader.cy.tsconfig.json" --pretty false
node node_modules\typescript\bin\tsc -p "$component\DataGridHeader.cy-baseline.tsconfig.json" --pretty false
node node_modules\eslint\bin\eslint.js --config "$component\DataGridHeader.eslint.config.cjs" `
  "$component\DataGridHeader.cy.stories.tsx" "$component\DataGridHeader.cy-jsx.stories.ts" `
  "$component\DataGridHeader.cypress.config.cjs" "$component\DataGridHeader.eslint.config.cjs" --no-cache
```

All four cumulative final verification runs are green. Scoped lint and suite/source-story
baseline typechecks are green. Early diagnostics from source JSX using a global namespace
with installed React 19 types were resolved in the **test-local** JSX compatibility bridge,
not by shared edits, casts to any, or disabling checks. The baseline config includes the
existing component and all local DataGrid stories without the new functional suite.
The separate webpack-only tsconfig matches imported source paths, avoiding irrelevant
esbuild include-pattern warnings while keeping the typecheck project narrowly scoped.

The historical runner used port 45223, installed Chrome, 1200x800 AUT viewport, retries=0, no video,
and no external fixtures. Build/download/screenshot/video/JUnit/log output paths are all
component-local. Webpack cache is disabled. The isolated runner deliberately bypasses Nx
targets to avoid shared Nx cache/project/report writes; dependencies are neither installed
nor restored.

Persistent evidence is under `reports`:

- `verification-round-1.log` through `verification-round-4.log`: final cumulative runs.
- `verification-round-1.xml` through `verification-round-4.xml`: selected corresponding JUnit.
- `verification-summary.json`: counts, unique test names, failure/pending/skip counts and axe reports.
- `review-incomplete-diagnostic.log`: pre-policy 61-case investigation retaining the actual
  incomplete nodes/checks, including empty-body HTML.
- `verification-checks.json`, `review-validation-checks.json`: corrected final runtime
  counts, evidence hash check, and scoped validation exit codes.
- `typecheck-final.log`, `typecheck-baseline-final.log`, `lint-final.log`,
  `format-final.log`: final validation output.
- Earlier round/diagnostic logs and hashed JUnit reports: authoring history, not final results.

The corrected final 61-case run performs **76 axe executions** (38 grid/header pairs).
Exactly **two full-grid executions** require the empty-body manual review above; all
**38 header executions** have zero incompletes. No other incomplete rules or nodes are
accepted. The retained Tabster baseline appears in 33 grid executions and one header
execution. These are separate from the two classified incomplete findings.

No fixed sleeps, forced actions, test skips, exception handlers, retry passes, or
success-shaped error fallbacks are used.

## Current row-123 integration and additional source-backed inventory

The 61-case suite was inspected directly and rerun unchanged in scope through the new
canonical entry: **61/61**, exit 0, no failures/pending/skips/retries. No product defect
was found or patched. The nine additional cases address omissions in the earlier mapping:

| Case  | Direct source evidence                                                   | New observable contract                                                                                                                                                                                                                                                                                              |
| ----- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R5.01 | `DataGridBestPractices.md`; `Default.stories.tsx`                        | The actual Default story's 550px min-width survives a 350px scroll container; exact header/body width alignment, sorting and select-all remain operational. This is a narrow-container test, not browser zoom certification.                                                                                         |
| R5.02 | Both resize stories' descriptions; `useTableColumnResizeState.ts`        | `onColumnResize` updates owner `idealWidth`, then a real external owner action sets 220px; header/body/separator value update with stable root identity and no extra resize callback.                                                                                                                                |
| R6.01 | `useDataGridSelectionCell.ts`; `useSelection.ts`; inherited native props | Original event identity across select-all callback, header handler and grid handler; exact callback order, target/currentTarget and insertion-ordered new Set; controlled owner contents remain unchanged and mixed DOM remains frozen. `Object.freeze(Set)` is shallow; unchanged contents are asserted separately. |
| R6.02 | `useTableSort.ts`; `useDataGridHeaderCell.ts`; root event forwarding     | Internal sort request precedes header/grid handlers for pointer and real Enter; same event within each activation, different event between activations, root preventDefault observed by grid, frozen controlled sort object is not mutated and does not optimistically change DOM.                                   |
| R6.03 | Provider theme/direction API; inherited root styles/navigation           | Live light-to-dark and LTR-to-RTL update; exact computed foreground/direction, unchanged root/selected IDs/order/ARIA, reversed real arrow navigation, grid/header axe.                                                                                                                                              |
| R6.04 | `useTableSelection.ts`; `useSelection.ts`; row-ID context                | Numeric zero stays numeric; obsolete selected ID is retained when adding all current IDs and removed by clearing all; exact callback insertion order, every row/input, header mixed/all/none and header exclusion.                                                                                                   |
| R6.05 | `renderTableHeader.tsx`; DataGridRow header-exclusion units              | Removing/reintroducing header provider preserves the body node and body Space selection; restored header is mixed, untabbable and unselected; select-all still operates.                                                                                                                                             |
| R7.01 | DataGridHeader forwardRef and root-ref conformance                       | Replacing callback ref clears previous owner with null and attaches latest to the same DOM node; unmount clears only latest, with exact counts outside StrictMode.                                                                                                                                                   |
| R7.02 | Public use/style/render hooks and TableHeader layout units               | Headless requested thead still produces div/rowgroup state; context changes inherited display/noNativeElements; styles return the same state object; ref/node/static and consumer classes remain stable.                                                                                                             |

### Canonical discovery, typegraph and production isolation

- `DataGridHeader.cy.tsx` imports the preserved fixture at runtime and the JSX interface
  bridge type-only. Standard `**/*.cy.tsx` discovery now finds the suite; the local CJS
  runner selects **only** that entry, so it does not register duplicates.
- The canonical bridge contains **interfaces only**. Shared react-table Cypress typing
  obtains `ElementType` and `LibraryManagedAttributes` from the existing TableSelectionCell
  canonical bridge. The isolated suite and source-story baseline include the separate
  `DataGridHeader.cy-standalone-aliases.stories.ts`; the canonical entry never imports it.
  No skipLibCheck, any-casts, declaration stubs or shared config edits were added.
- Axe reporting uses built-in `cy.writeFile` in the owned `reports` directory. A suite-level
  before hook resets only the new `row123-audits.jsonl`; each run is copied to session
  artifacts before another run. There is **no dependency on private `cy.task` registration**.
  All prior classifier/rejection assertions remain intact.
- The actual package `tsconfig.cy.json` is checked with noEmit/incremental=false/composite=false.
  The actual standard `cypress.config.ts` is run using Node 22 from the package-library CWD,
  canonical `--spec`, retries=0 and port 46123. Neither shared config is modified.
- The verification script parses `tsconfig.lib.json` and asserts its six DataGridHeader
  production files exclude every Cypress fixture, entry and bridge.

### Reproducible current commands

From the checkout root:

```powershell
$root = (Get-Location).Path
$component = 'packages\react-components\react-table\library\src\components\DataGridHeader'
$library = 'packages\react-components\react-table\library'
$env:TS_NODE_COMPILER = "$root\node_modules\typescript\lib\typescript.js"
$env:WEBPACK_DEV_SERVER_PORT = '46123'

# Run all 70 cases directly with the owned CJS config.
node node_modules\cypress\bin\cypress run --component --browser chrome --headless `
  --project $library --config-file src\components\DataGridHeader\DataGridHeader.cypress.config.cjs
# Optional cumulative rounds: --env coverageRound=5 (63), =6 (68), =7 (70).

node node_modules\typescript\bin\tsc -p "$component\DataGridHeader.cy.tsconfig.json" --noEmit --incremental false --composite false --pretty false
node node_modules\typescript\bin\tsc -p "$component\DataGridHeader.cy-baseline.tsconfig.json" --noEmit --incremental false --composite false --pretty false
node node_modules\typescript\bin\tsc -p "$library\tsconfig.cy.json" --noEmit --incremental false --composite false --pretty false

$node22 = 'C:\Users\jabrassi\.scout-instances\local-test\copilot\session-state\e2e8f1b0-53a4-4784-81a2-ee19461b7b31\files\runtime\node-v22.20.0-win-x64\node.exe'
Set-Location "$root\$library"
& $node22 "$root\node_modules\cypress\bin\cypress" run --component --browser chrome --headless `
  --config-file cypress.config.ts --spec src\components\DataGridHeader\DataGridHeader.cy.tsx `
  --config 'retries=0,video=false,screenshotOnRunFailure=false,viewportWidth=1200,viewportHeight=800,downloadsFolder=src\components\DataGridHeader\.cypress-downloads,screenshotsFolder=src\components\DataGridHeader\.cypress-screenshots,videosFolder=src\components\DataGridHeader\.cypress-videos' `
  --reporter junit --reporter-options 'mochaFile=src\components\DataGridHeader\reports\row123-canonical.xml'
```

All current session evidence is under:
`C:\Users\jabrassi\.scout\copilot\session-state\5ed21290-e28e-4743-8b3d-3864ac6a202e\files\coverage-121-140\DataGridHeader`.
`row123-verify.cjs` runs isolated/baseline/standard typechecks, scoped lint/format,
production isolation, then both **direct owned config and actual canonical config**.
It records exact commands/CWD/exits, raw JUnit, raw axe JSONL, per-run metrics, discovery
and SHA-256 source hashes. Historical and current diagnostic failure logs are retained
and not represented as final green evidence.

Current authoring diagnostics: round 5 initially had a nested describe registration error
(exit 1); moving it to top-level restored **63/63**, exit 0. Round 6 initially had two
implicit-any callback typings and one chained negative-attribute subject error
(`67/68`, exit 1). Explicit event types and separate row queries restored **68/68**,
typecheck exit 0 and Cypress exit 0. All corrections are test-only.

Round 7's first ref-fixture run was **69/70**, exit 1. Explicit void-returning callback
ref wrappers now capture the public node/null signature. A scoped-lint diagnostic rejected
inspection of deprecated state `components`; the test now asserts the actual DIV DOM tag
instead, with no rule suppression. The corrected 70-case round is the `row123-final2`
verification: **70/70 direct and 70/70 actual canonical**, every command exit 0, with
isolated/baseline/standard types, lint, formatting and production isolation clean.

Each current complete run performs **88 axe executions (44 grid/header pairs)**.
The recorded final runs retain the tightly constrained Tabster sentinel violation
baseline in **39 or 40 grid audits and one header audit**. Specifically, `row123-final3`
records **40 direct / 39 canonical grid audits** and **one header audit in each**.
Tabster's live sentinel presence can vary; these counts are evidence, not fixed expected
counts or broadened exceptions. Every finding still requires the complete actual
in-scope sentinel set. Exactly **two grid audits** retain the classified empty-body
manual-review incomplete; **all 44 header audits have zero incompletes**.
Header pass counts and full header violation node details are now additionally recorded.
No other violations or incompletes are accepted. This does not constitute a zero-violation
accessibility certification.

Final self-review caught and corrected the current documentation's component-local
config path and the missing raw header violation detail field. The unchanged 70 assertions
and both runner paths are revalidated after these final corrections under `row123-final3`.
See `row123-final3-commands.json`, `row123-final3-checks.json`, both raw JUnit files,
both metrics files and both audit JSONL files for the final gate record.
The subsequent documentation-only clarification of per-run sentinel counts is recorded
in `row123-post-documentation-checks.json`; all runtime fixture/config/type hashes remain
identical to the final Cypress gate, and scoped formatting is rechecked.

A fresh parent-review confirmation is recorded under
`row123-post-review-confirmation`: both the direct component config and the
actual standard package config again execute **70/70**, with zero failing,
pending, skipped or retried cases. Its command, check, JUnit, metric and audit
records are current evidence; the earlier component-local **69/70** ref-fixture
failure remains explicitly historical and does not describe the corrected
current source.

### Review boundaries and known limits

The earlier exact Tabster sentinel violation baseline and two empty-body manual-review
incompletes remain explicit, not suppressed or advertised as zero-violation accessibility.
Remote virtualization, screen-reader speech, actual zoom, forced colors, touch/pointer
hardware and non-Chrome/browser compatibility are not certified. The standalone ref and
headless hook cases are not represented as complete accessible grids.
The current author performs self-adversarial review only. Parent independent review and
a fresh repeated clean adversarial review are required before a separate descriptive
commit. **No commit or next-component work is performed here.**
