# component124: DataGridHeaderCell browser coverage

## Scope and execution contract

Repository changes are confined to this `DataGridHeaderCell` directory.
Fresh validation evidence is copied to the session artifact directory
`coverage-121-140\DataGridHeaderCell`; repository-generated reports are locally ignored.
No production source edits, dependency changes/installations, commits, staging,
branch changes, delegation, parent independent final review, or next-component work
are part of this task.
The existing dirty TableHeaderCell implementation and other threads' work are inputs,
not files to repair or revert.

The prior campaign's **81 functional cases** and its four cumulative rounds
**18 / 36 / 69 / 81** are preserved, not claimed as newly authored here.
Fresh rounds add documented scenarios, undocumented event/A11y edges, then
unit-derived integration cases: **85 / 88 / 91** cumulative cases.
Each new round runs the entire component suite in installed Chrome and corrects
failures before proceeding. `coverageRound` is a validated integer 1-7;
omission runs all seven rounds. No skipped/pending cases, retries, forced actions,
fixed sleeps, exception suppression, disabled axe rules, or blanket incomplete
allowlists are used.

The fixture uses actual DataGrid contexts and rendered body rows. Native CDP-backed
pointer, keyboard, drag, and wheel events exercise observable behavior, not mocked
dispatch of component internals. The separate Space-down/up case uses
`Input.dispatchKeyEvent` directly because the installed real-events package has no
separate keydown/keyup commands. Controlled rejection and external updates are real
React owner updates. Tests assert row order, callbacks, element identity, focus,
attributes, measured widths, and header/body alignment.

## Inspected source and documentation

The following sources informed the tests:

- `DataGridHeaderCell.tsx`, `.types.ts`, `useDataGridHeaderCell.ts`,
  `useDataGridHeaderCellStyles.styles.ts`, `renderDataGridHeaderCell.tsx`, `index.ts`,
  the component unit suite and default snapshot contract.
- Inherited `TableHeaderCell` source, types, renderer, styles, component units, and
  `useTableHeaderCell.test.tsx`: explicit tag precedence, native attributes, div
  filtering, sort button behavior, direction/icon rendering, static slot classes,
  and layout remaining context-owned even when the root tag changes.
- DataGrid and cell focus types/hooks, Table/column/DataGrid contexts,
  `isColumnSortable`, `useTableSort`, `useTableColumnSizing`,
  `useKeyboardResizing`, and `useTableColumnResizeMouseHandler`.
- `library/README.md`, `library/docs/Spec.md`, `DataGridDescription.md`,
  `DataGridBestPractices.md`, the stable DataGrid story index and **all 14 local
  consuming story implementations and descriptions**. A search across
  `packages/react-components/**/stories` found no other stable consuming stories.
- `Virtualization.stories.tsx` and its documentation: the story is an external
  fluentui-contrib iframe, not a local DataGridHeaderCell implementation.
- Read-only prior art: DataGridHeader's isolated runner/type/JSX bridge/audit
  policies and TableSelectionCell's existing local coverage layout.

The documented contracts are: grid `sortable` gates sorting; absent compare disables
column sorting; `group` uses Enter, trapped Tab/Shift+Tab, and Escape; `none` exposes
one nested action instead of a root tab stop; do not put nested focusables inside a
sortable header button; context menus expose keyboard resizing; arrows resize,
Shift changes precision, and Escape/Enter/Space exit; auto-fit constrains layout,
while disabled auto-fit permits last-column resizing and independent widths.
Label grids and retain header/control roles.

The Sort story's known NVDA announcement caveat is not a promise that DOM/axe
automation can verify screen-reader narration. Older primitive-table wording in the
Spec does not override this component's actual default focus behavior.

## Traceability: inherited, unit-derived, and undocumented behaviors

Case titles in the `.cy.stories.tsx` file and JUnit are the stable identifiers.
Parameterized variants are separate executable cases, not checklist entries.

| IDs   | Cases | Evidence / asserted behavior                                                                                                                                                                                                                                                                                      |
| ----- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1.01 |     1 | Unit snapshot: standalone div, columnheader, root tabIndex=0, content wrapper and inherited class, no sort narration.                                                                                                                                                                                             |
| R1.02 |     2 | Grid sortable false/true; compare-bearing button/default root focus versus compare-free noninteractive column. Complete grid/header axe.                                                                                                                                                                          |
| R1.03 |     6 | All three focus modes with both sortability states; explicit focus wins, group Tabster attribute, focused root and meaningful audits.                                                                                                                                                                             |
| R1.04 |     1 | Native th, scope/abbr/headers/spans, valid grouped native table, merged ref, actual focus and native table axe.                                                                                                                                                                                                   |
| R1.05 |     1 | Div drops th-only props; data/ARIA/title/authored class/style forwarded and accessible name computed.                                                                                                                                                                                                             |
| R1.06 |     1 | Button, icon, aside classes and DOM order; authored accessible name; actual slot activation still sorts.                                                                                                                                                                                                          |
| R1.07 |     1 | Null icon/aside suppress optional content; sorting and body reorder remain active.                                                                                                                                                                                                                                |
| R1.08 |     2 | Explicit ascending/descending overrides context narration/icon but does not override context sorting results.                                                                                                                                                                                                     |
| R1.09 |     1 | Comparator **arity**, not just function presence, gates sorting; zero-arity compare rejects pointer/Enter/Space and callback.                                                                                                                                                                                     |
| R1.10 |     1 | Numeric column ID zero selects exact context callback and descending narration.                                                                                                                                                                                                                                   |
| R1.11 |     1 | Unknown column ID remains non-sortable/focusable, with no sort callback.                                                                                                                                                                                                                                          |
| R2.01 |     3 | Pointer/Enter/Space: exact sort payloads, callback counts, bubbling target, ascending/descending body order, changing sort column resets other icon/narration.                                                                                                                                                    |
| R2.02 |     1 | Native Space keydown does not sort; native keyup invokes once.                                                                                                                                                                                                                                                    |
| R2.03 |     1 | Root surface can sort independently of the button; synchronous currentTarget is root.                                                                                                                                                                                                                             |
| R2.04 |     1 | Root onClick preventDefault happens after internal sorting and does not undo it.                                                                                                                                                                                                                                  |
| R2.05 |     1 | Button stopPropagation suppresses root callback and sorting for all three activation methods.                                                                                                                                                                                                                     |
| R2.06 |     1 | Disabled-focusable button rejects pointer/keyboard; root surface remains independently interactive.                                                                                                                                                                                                               |
| R2.07 |     1 | Controlled owner rejects descending request without optimistic DOM changes; external column change updates narration/order.                                                                                                                                                                                       |
| R2.08 |     1 | Live callback/grid sortability update retains element identity, changes default focus, and retains underlying sort state on restoration.                                                                                                                                                                          |
| R2.09 |     2 | LTR/RTL: actual Tab entry, horizontal/vertical arrows, Ctrl+Home/End, Tab exit and reverse entry.                                                                                                                                                                                                                 |
| R2.10 |     2 | LTR/RTL: group Enter, real action callback, Tab wrapping, reverse wrapping, Escape returns root.                                                                                                                                                                                                                  |
| R2.11 |     1 | none mode enters the one nested button, native Space callback, no root tab stop.                                                                                                                                                                                                                                  |
| R2.12 |     1 | Native button slot retains reset styles and Enter/Space browser activation.                                                                                                                                                                                                                                       |
| R2.13 |     1 | Header sorting in a selectable grid does not select rows or call selection callback.                                                                                                                                                                                                                              |
| R2.14 |     1 | Focus, blur, and key forwarding preserve actual root and native key.                                                                                                                                                                                                                                              |
| R3.01 |     6 | Auto-fit on/off crossed with Escape/Enter/Space; active separator semantics, exact +20/-5 widths, resize payloads, mode callbacks, alignment, exit focus, and sorting after exit.                                                                                                                                 |
| R3.02 |     2 | Both fit modes: actual primary drag, pointer-events suppression, exact native clientX delta and callback width, aligned body, no unintended sort.                                                                                                                                                                 |
| R3.03 |     1 | RTL keyboard resize currently uses physical ArrowRight +20 / ArrowLeft -20; exit restores button.                                                                                                                                                                                                                 |
| R3.04 |     1 | Min width clamps to 100; disabled auto-fit leaves adjacent 160px width unchanged.                                                                                                                                                                                                                                 |
| R3.05 |     1 | Authored 90px header style and custom aside override context injection; body still gets 180px sizing.                                                                                                                                                                                                             |
| R3.06 |     1 | Owner idealWidth change 180->240 aligns header/body and preserves sorted row order.                                                                                                                                                                                                                               |
| R3.07 |     1 | Real right-click callback does not sort; visible context menu, grid/header plus complete popover audits, Escape removes menu.                                                                                                                                                                                     |
| R3.08 |     1 | Blur exits resize mode, hides/removes separator tab stop, restores previous sorting button focus.                                                                                                                                                                                                                 |
| R3.09 |     1 | Public state hook + styles + renderer recomposition retains classes, refs, root focus, and grid/header a11y.                                                                                                                                                                                                      |
| R3.10 |     1 | Empty grid can still sort its header; exact scenario/phase/scope empty-body incomplete plus eleven fail-closed rejection probes.                                                                                                                                                                                  |
| R3.11 |     1 | Live axe Tabster finding feeds rule/node/duplicate/target/incomplete rejection probes; arbitrary header targets cannot masquerade as sentinels.                                                                                                                                                                   |
| R3.12 |    14 | Every local stable consuming story is mounted and exercised, not merely imported; sortable header activation or actual adjacent header focus, plus complete grid/header audits.                                                                                                                                   |
| R3.13 |     1 | Stable author group opens its menu with keyboard; popover audit and two-step Escape restores nested trigger then header root.                                                                                                                                                                                     |
| R3.14 |     1 | Local react-window recomposition sorts header, reorders visible rows, native wheel scrolls, header state persists; aligned scroll=800, exact overscan incomplete audited.                                                                                                                                         |
| R4.01 |     3 | All sizes preserve context flex layout, 8px padding, 400 weight, position, 32px content minimum, button reset/cursor and sorted icon layout.                                                                                                                                                                      |
| R4.02 |     1 | Actual hover applies inherited subtle hover background; pointer exit restores resting color.                                                                                                                                                                                                                      |
| R4.03 |     1 | Provider custom style hook augments root/button, preserves static/authored classes/ref and sorting.                                                                                                                                                                                                               |
| R4.04 |     1 | Callback ref detaches on unmount; remount yields different live element and working sort.                                                                                                                                                                                                                         |
| R4.05 |     1 | Explicit root tabIndex=-1 beats focusMode cell default; nested sort button still receives Tab/Enter.                                                                                                                                                                                                              |
| R4.06 |     1 | Compare removal/restoration dynamically changes focus/role/icon narration and row comparison without remount.                                                                                                                                                                                                     |
| R4.07 |     1 | Root context-menu preventDefault suppresses MenuTrigger opening without sorting.                                                                                                                                                                                                                                  |
| R4.08 |     1 | Secondary resize-handle pointer is ignored: no width, pointer-events, sort, or resize callback changes.                                                                                                                                                                                                           |
| R4.09 |     1 | StrictMode repeats uncontrolled callback twice with identical state but applies one DOM sort transition.                                                                                                                                                                                                          |
| R4.10 |     1 | Native th in sortable column context handles native Enter/Space through inherited ARIA button with exact column ID.                                                                                                                                                                                               |
| R5.01 |     2 | Light/dark provider token hover colors, live theme replacement, native sorting and body order in both directions.                                                                                                                                                                                                 |
| R5.02 |     1 | Custom data-based row IDs retain the exact selected Bravo row through both header sorts with no selection callback.                                                                                                                                                                                               |
| R5.03 |     1 | Same mounted root receives live owner content, data attributes, accessible grid/header names and description relationship.                                                                                                                                                                                        |
| R6.01 |     3 | Pointer/Enter/Space preserve the same synthetic click through slot, controlled sort request and root callback in exact order; synchronous targets, preventDefault snapshots, native key trust and inherited programmatic-click trust are asserted. Controlled owner rejects the request without optimistic state. |
| R7.01 |     1 | Unit-derived table-context layout changes preserve explicit native tag, inherited attributes and same mounted root.                                                                                                                                                                                               |
| R7.02 |     1 | Dynamic column reorder/removal/restoration retains surviving root identity and context-owned sort state without mismatched body columns.                                                                                                                                                                          |
| R7.03 |     1 | Live resizableColumns context toggles remove/reinstate handles and inline sizing without remounting or resetting sorting.                                                                                                                                                                                         |

## Stable consumer matrix

R3.12 directly imports and exercises `Default`, `Sort`, `SortControlled`,
`MultipleSelect`, `MultipleSelectControlled`, `SingleSelect`,
`SingleSelectControlled`, `CompositeNavigation`, `FocusableElementsInCells`,
`SubtleSelection`, `SelectionAppearance`, `CustomRowId`, `ResizableColumns`, and
`ResizableColumnsDisableAutoFit`. R3.13 additionally exercises the actual author
group/menu story behavior. R2 tests independently verify callback/controlled-state
contracts that the original stories do not expose.

The external `Virtualization` iframe is inspected, not fetched or represented as a
tested fluentui-contrib package. R3.14 is a local react-window recomposition with
this checkout's DataGrid/HeaderCell, sorted owner state, and native wheel movement.
After native scrolling is independently observed, scroll is aligned to 800px to
make the exact clipped-node set deterministic; this is not claimed as additional
native wheel behavior.

## Strict accessibility policy and findings

Each `audit` runs axe with its default rules and actual layout on the **entire grid**
and **entire header**. Native variants audit complete native tables. Menu-open
cases also audit the complete visible popover, including its menu list/items;
portal content is not silently omitted from a header-only audit. Reports retain
complete violation/incomplete nodes, targets, checks, HTML, and passing-rule counts.
All scopes must execute passing rules.

### Classified violations

1. **External Tabster aria-hidden-focus sentinels.** Only
   `i[data-tabster-dummy][role="none"][aria-hidden="true"][tabindex="0"]`
   nodes are accepted. The finding has exactly the visible sentinel set in scope,
   unique single-element targets, empty any/none, and exactly the
   `focusable-not-tabbable` all-check with null data. No other hidden focusables or
   added rules are accepted. Tabster may not emit the finding while its sentinels
   are outside the tab order; absence is not converted into a fabricated finding.
   Group-root focus is explicitly settled before auditing to avoid classifying
   a transient click-entry state. Stable-story cases assert their header action
   or arrow-focus outcome, then use a real external-button click before auditing
   the resulting grid state, so composite Tabster sentinels are not measured
   midway through a focus transition. Focused header/group/resize audits remain
   separately covered; this does not relax the exact node-set policy.
2. **Inherited active resize separator aria-required-attr.** This is a real,
   unresolved critical a11y finding from `useKeyboardResizing`/`TableResizeHandle`:
   role separator has aria-valuetext but lacks required aria-valuenow.
   It is required only for the exact six R3.01 titles at the `active resize`
   phase, in both grid and header scans. Exactly one Name-column active handle,
   Resize column label, 180 pixels value text, missing aria-valuenow, and the
   exact required-attribute check are accepted. Nine rejection probes per
   active-resize audit reject missing/extra/wrong rule, missing/duplicate/wrong
   node, wrong required attribute, phase, scenario, and scope. This finding is
   **classified, not fixed or claimed a11y-clean**: its source is outside the
   authorized write scope.

### Classified incompletes

Every unlisted scenario/phase/scope requires **zero incompletes**. Missing an
expected finding also fails.

| Exact case / phase / scope                            | Required evidence                                                                                                                                                                                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R3.10 / empty body strict incomplete / full grid only | Exactly aria-required-children on `.fui-DataGridBody`; one rowgroup with zero child nodes; any-check data `['row']`; empty all/none. Header scan must be clean.                                                                    |
| R3.07 / open menu grid / full grid only               | Exactly color-contrast on the first row's Value cell text `2`, with shortTextContent check and actual visible context popover.                                                                                                     |
| R3.13 / author menu open / full grid only             | Exactly color-contrast on the first two Author text spans, Max Mustermann and Erika Mustermann, with bgOverlap checks and visible author popover.                                                                                  |
| R3.14 / local virtualized header / full grid only     | Exactly six color-contrast nodes: Name/Value/Plain cells for virtual items 54 and 53, in order, with elmPartiallyObscured checks; scrollTop exactly 800, nodes at/below the clipping boundary with at most 4px partial visibility. |

All contrast incomplete checks require the exact key set (including the three
undefined color properties that JSON omits), ratio=0, 14px normal font,
expected 4.5:1, exact messageKey, one any-check, and empty all/none.
The resolved target array must equal the precise DOM node set above; generated
Griffel class hashes are not used as broad allowlist patterns. Each of these
contrast audits also executes ten rejection probes: absent finding, extra/wrong
rule, missing/duplicate/wrong node, wrong check data, wrong phase/scenario, and
header scope. Closed-menu grid audits require zero incompletes again.

These are manual-review limitations, **not contrast passes**. Initial failing
round-3 logs retain the actual evidence before classification. Complete popover
scans and all header scans require zero incompletes.

### Other pinned implementation limits

- DataGridHeaderCell removes sortable from its public props; sortability comes
  from table/column context. Its Omit-based public type does not expose inherited
  native-only fields directly; R1.04 uses a structurally typed native-prop spread
  rather than any/unknown casts to test the existing runtime forwarding contract.
- isColumnSortable checks compare.length>0. A rest/zero-arity comparator can exist
  yet be non-sortable; this is not silently interpreted as compare presence.
- Explicit sortDirection and sizing/aside overrides can disagree with context
  sorting or body widths. Tests pin this prop precedence, not a promise of
  automatic reconciliation.
- Space exits resizing on keydown, restores sorting focus, and its keyup sorts.
  Escape/Enter exit do not sort; a subsequent Enter sorts normally.
- StrictMode can repeat an uncontrolled sort callback. Once-per-activation
  callback tests use non-StrictMode intentionally; R4.09 separately pins the
  StrictMode baseline.
- The default sortable root has no tab stop. `Menu openOnContext` focuses its
  trigger root directly when closing; in R3.07 that root cannot receive focus,
  even if the nested sorting button was focused before opening. Escape closes
  the menu but focus lands on body. The native browser test pins this observed
  integration limitation, not a restoration pass. `useMenuOpenState` /
  `useMenuTrigger` are outside owned production scope; the actual author-button
  group restores focus separately in R3.13.
- Native Enter/Space on an inherited div ARIA button generates a programmatic
  click (`nativeEvent.isTrusted=false`) from a trusted keyboard event.
  R6.01 does not misrepresent these clicks as browser-native button clicks.
- Touch/mobile input, actual screen-reader announcements/NVDA, forced colors,
  zoom visual baselines, and external fluentui-contrib iframe behavior are not
  automated. Chrome native keyboard/RTL/focus/DOM/axe coverage is not a substitute.
- Standalone and manually mocked context units assert semantics/callbacks only.
  Axe is run on valid complete compositions rather than falsely treating a lone
  columnheader as a valid complete grid.

## HISTORICAL prior-campaign commands and evidence (not current results)

**Everything in this section is retained historical provenance. All pre-existing
owned reports, even those called `final`, `complete`, `verification-round-*`,
or `verification-summary.json`, are HISTORICAL and not authoritative current
validation.** See the next section and session `handoff.json` for exact fresh
filenames, hashes, raw JUnit counts and complete raw audit ledgers.

From the shared checkout root:

```powershell
$component = 'packages\react-components\react-table\library\src\components\DataGridHeaderCell'

# Scoped format/type/lint baselines, then all four cumulative Chrome runs.
node "$component\DataGridHeaderCell.run.cjs"

# One round, or omit --env to run all 81.
node node_modules\cypress\bin\cypress run --component --browser chrome --headless `
  --project packages\react-components\react-table\library `
  --config-file src\components\DataGridHeaderCell\DataGridHeaderCell.cypress.config.cjs `
  --env coverageRound=4

node node_modules\typescript\bin\tsc -p "$component\DataGridHeaderCell.cy.tsconfig.json" --pretty false
node node_modules\typescript\bin\tsc -p "$component\DataGridHeaderCell.cy-baseline.tsconfig.json" --pretty false
node node_modules\eslint\bin\eslint.js --config "$component\DataGridHeaderCell.eslint.config.cjs" `
  "$component\DataGridHeaderCell.cy.stories.tsx" "$component\DataGridHeaderCell.cy-jsx.stories.ts" `
  "$component\DataGridHeaderCell.cypress.config.cjs" "$component\DataGridHeaderCell.eslint.config.cjs" `
  "$component\DataGridHeaderCell.run.cjs" --no-cache
```

Runner port 45224; Chrome headless; viewport 1200x800; retries=0; no video,
external fixtures, webpack cache, or Nx targets/shared report paths. The local
JSX bridge restores Fluent source global JSX with installed React 19 types, as in
DataGridHeader prior art. The webpack-only include project does not weaken the
separate noEmit suite typecheck. Source/story baseline includes the existing
component and all local stable DataGrid stories without the new functional suite.
Source lint is reported separately from authored-suite lint.

`reports` contains:

- `verification-round-1.log` through `verification-round-4.log` and corresponding
  `.xml`: final cumulative runs with asserted counts and zero failure/skip counts.
- `verification-summary.json`: all four unique test-name sets and complete recorded
  axe evidence; final run has **87 audit pairs / 174 recorded axe executions**,
  plus one live classifier-fixture axe scan in R3.11 (**175 total**).
- `verification-checks.json`: exact commands/log paths and exit statuses.
- `format-final.log`, `typecheck-final.log`, `typecheck-baseline-final.log`,
  `lint-final.log`, `lint-baseline-final.log`: authored and unchanged-baseline checks.
- `round-1.log`, `round-1-fixed.log`, `round-2.log`, `round-3*.log`, `round-4.log`,
  hashed JUnit, screenshots, and intermediate type/lint logs: retained authoring
  diagnostics, not all claimed passing runs.
- `preservation-before.json`, `preservation-after.json`: branch/HEAD and 64
  pre-existing dirty/untracked file SHA256 sentinels. No outside-scope paths are
  written by the runner. Concurrent other-thread differences are reported and
  **never reverted**. During authoring three existing OverlayDrawer sentinel files
  changed in their own thread; this task did not edit them.
  The original HEAD sentinel also advanced externally from `09d743ac` through
  `948407d0` to `b30f565e` (a react-drawer test commit), while the branch remained
  `master`. No table paths changed in that concurrent commit. The runner records
  historical HEAD differences and separately hashes table source/story inputs
  and authored files across its execution, failing on input or branch changes,
  rather than resetting or failing solely on unrelated other-thread commits.

The final recorded audits include six active-resize violations in each of the
grid/header scopes; one empty-body incomplete and three contrast incomplete
full-grid executions; no header/popover incompletes. Tabster finding counts can
depend on its real focus state and are recorded, not represented as zero a11y
findings. Classified inherited findings remain visible in every report.

## Current canonical CI integration and reproducible verification

The package's unchanged `cypress.config.ts` selects `**/*.cy.tsx`.
`DataGridHeaderCell.cy.tsx` runtime-imports the preserved fixture **once** and
type-only imports an interface-only, merge-safe JSX bridge. The isolated CJS
configuration selects **only that entry**, never both entry and fixture.
The standalone `DataGridHeaderCell.cy-aliases.stories.ts` is explicitly included
only in isolated/baseline projects; canonical Cypress does not import duplicate
ElementType/LibraryManagedAttributes aliases already supplied by TableSelectionCell.
Production `tsconfig.lib.json` excludes all `.cy.tsx` and `.stories.ts[x]` files.
No casts/stubs, skipLibCheck, or shared configuration changes are introduced.

Audit metadata uses built-in `cy.readFile`/`cy.writeFile` in owned `reports/`;
the real package CI configuration needs **no private cy.task registration**.
Complete rule/node/target/check data and all policy assertions are retained.
The fresh runner copies each entire raw ledger and JUnit to its artifact location,
requires the exact unique test count and zero failures/errors/skips/pending, records
real commands/exits, and hashes all authored files plus six production files before
and after execution. It also guards table source/consumer inputs and branch identity;
unrelated shared-master commits are recorded, not reverted or treated as failures.
Self-adversarial review additionally bound the empty-body profile to its exact phase,
restricted active-resize profiles to full grid/header scopes, and required exactly
one requested audit scope instead of silently taking the first of multiple matches.
Raw metadata distinguishes actual header scans from full-table/popover fallbacks.
R4.09 also retains source-typed uncontrolled callback requests, the exact duplicate
callback count, actual DOM sort direction and actual body order in its raw ledger.
The runner validates that complete metric rather than inferring it from an old log.

From the checkout root, set `DGH_CELL_NODE22` to the existing
`node-v22.20.0-win-x64\node.exe` (the installed ESM helper needs Node 22).
Set `DGH_CELL_ARTIFACT_DIR` to a fresh session artifact directory, then run:

```powershell
$component = 'packages\react-components\react-table\library\src\components\DataGridHeaderCell'
$env:WEBPACK_DEV_SERVER_PORT = '46124'
$env:TS_NODE_COMPILER = (Join-Path (Get-Location) 'node_modules\typescript\lib\typescript.js')
node "$component\DataGridHeaderCell.run.cjs"
```

The runner checks all authored code/config/Markdown formatting, owned ESLint,
isolated suite TypeScript, source/story baseline TypeScript, and the **actual**
standard package `tsconfig.cy.json` with noEmit/incremental=false/composite=false.
It then executes direct owned CJS and actual canonical package ESM configurations
with a single `--spec`, Chrome, viewport 1200x800 and retries=0. Node 18 is retained
for the direct CJS path; Node 22 is used only for the actual standard ESM path.
Fresh direct shell runs also independently execute the CJS configuration after
each authoring round; they are not inferred from the runner.

Authoritative final artifacts are session `final\current-manifest.json`,
`final\current-direct.log/.xml`, `final\current-canonical.log/.xml`, and matching
`*-ledger.json`, with hashes and exact per-run metrics in `handoff.json`.
Earlier `current-round6` and `current-round6-fixed` each have one adversarial
diagnostic failure: the non-tabstop root did not regain focus, and explicitly
focusing the sorting button beforehand did not make Menu restore it either.
Source inspection shows Menu directly focuses its trigger root. The corrected
test requires the observed body focus and documents this outside-scope limitation;
both failures remain visible, not production fixes or silently reclassified passes.
Two early round JUnit paths were accidentally relative to the Cypress project;
only those generated XML files were recovered into owned reports/session artifacts
and their empty generated directories removed. Subsequent reporter paths are
absolute; no outside file changes remain.

The documented limitations and exact A11y profiles above still apply: six active
resize scenarios expose an inherited critical missing aria-valuenow defect outside
owned production scope; clipped/occluded/empty-body incompletes require manual
review and are **not passes**. Real Chrome checks do not certify universal AT,
NVDA narration, Firefox/WebKit, touch, zoom, forced colors, or performance.
Independent and repeated parent adversarial review, explicit-file staging and
any separate descriptive commit remain the parent's next steps, not this task's.
