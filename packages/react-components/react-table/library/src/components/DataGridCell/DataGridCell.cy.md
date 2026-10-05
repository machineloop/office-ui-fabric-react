# DataGridCell browser contracts

Row 118 coverage is test-only and scoped to this directory. The existing Nx
`react-table:e2e` target and read-only component adapter run exactly
`**/DataGridCell.cy.tsx`. No shared Cypress configuration, production source,
existing unit cases, or sibling component tests were changed.

## Inventory

| Source contract                                                    | Browser assertions                                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DataGridCell.types.ts`, `useDataGridCell.ts`, API report          | The three cell focus modes across all four grid focus modes; default and explicit tabindex; default div versus explicit td; no cell-owned selection, sorting, or resize handles                                                 |
| DataGrid default, composite navigation, focusable-elements stories | Real Header/Body/Row/Cell composition, two columns, custom row IDs, native arrows, Enter/Escape, forward/backward trapped Tab, ordinary grid entry/exit, single-action cells, editable inputs, empty groups                     |
| Selection/sort stories and row source                              | Uncontrolled and controlled single/multi selection, frozen controlled requests, bubbling and stopped child actions, sortable header reordering, stable keyed cell identity/focus, selected row identity                         |
| Resizable-columns stories and sizing hooks                         | String and numeric-zero column IDs; fallback empty ID; callback replacement; native pointer and keyboard resizing; exact content and padded border-box widths; LTR/RTL header/body alignment; dynamic sizing enablement/options |
| TableCell types/hooks/render/styles and unit tests                 | Valid native fixtures, explicit native/non-native tag choice, native props and refs, root render functions for both tags, caller classes/styles/data/ARIA, density geometry for all three sizes in both layouts                 |
| DataGrid/row render and context contracts                          | Column descendant context, independently scoped grids, keyed column reordering, updated data/children, removal/ref detachment, focus-mode transitions, latest committed event handlers                                          |
| Provider and shared focus styles                                   | Light/dark inherited text and keyboard focus outline, RTL visual arrows, active Chromium forced-colors media with real focus and preserved geometry                                                                             |
| Accessibility guidance and native/browser behavior                 | Accessible name/description relationships, clean native-table axe audit, exact inherited Tabster finding set, independent primitive baseline, unnamed-button positive control                                                   |

The documentation round passed 25 cases; the cumulative edge/accessibility round
passed 46; the initial cumulative unit/source-derived round passed 69. Final
additions bring the complete suite to **76 cases**. Exact names, commands, exits,
failure dispositions, audit payloads, screenshots, hashes, and diagnostic
comparisons are retained in the session's `coverage101-120/DataGridCell-evidence.json`.

## Reproduction

Set the contract's Node runtime first in PATH, `NX_DAEMON=false`, `NODE_PATH` to
the checkout's `node_modules`, and `TS_NODE_COMPILER` to its TypeScript compiler.
Set `FLUENT_REPO`, `FLUENT_PROJECT` to the library, `FLUENT_SPEC` to the exact
component glob, and `WEBPACK_DEV_SERVER_PORT=18241`. Set all Cypress artifact
folders to the desired artifact directory. All three axe audits always execute
and retain JSON payloads. By default, they write to a unique
`DataGridCell-audits-<timestamp>-<id>` subfolder of Cypress's standard
`downloadsFolder`. Optionally set `CYPRESS_DataGridCellEvidence` (or
`Cypress.env('DataGridCellEvidence')`) to override the audit directory. No private
environment variable or task harness is required by the tests.

Use Node plus the checkout's `.yarn\releases\yarn-4.18.0.cjs`:

```text
nx run react-table:e2e --skipSync --skip-nx-cache --excludeTaskDependencies --args="--browser electron --project <library> --config-file <read-only adapter>"
nx run react-table:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T eslint --config src\components\DataGridCell\DataGridCell.eslint.config.cjs <new TypeScript files and local ESLint config>"
nx run react-table:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T prettier --check <all eight added files>"
nx run react-table:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T tsc --pretty false -p src\components\DataGridCell\DataGridCell.cy.tsconfig.json"
```

Relevant existing Jest suites are DataGridCell, TableCell, DataGridRow,
useTableColumnSizing, useKeyboardResizing, and useTableColumnResizeState. Invoke
them together through the `react-table:test` command override with
`--runInBand --runTestsByPath`; their verified result is 113 tests in six suites,
with 20 existing snapshots unchanged.

## Known boundaries and retained evidence

- The full grid's stable Tabster lifecycle creates ten `aria-hidden="true"`
  focusable sentinel elements. Axe reports precisely `aria-hidden-focus` on
  these ten targets, with no other violations or incomplete findings. A
  primitive shared-Tabster fixture, containing no DataGridCell, reproduces the
  same rule on four sentinels. These are **characterized inherited findings**,
  not a clean accessibility certification. Tests assert exact IDs, target sets,
  generated attributes, and counts; no axe rule is disabled.
- Keyboard focus outlines require keyboard input, not merely programmatic
  `.focus()`. The tests exercise native keys before asserting token-driven
  outlines. Forced colors is Chromium media emulation, not certification of
  every operating-system high-contrast mode or assistive technology.
- Column content widths exclude the two inherited 8px horizontal paddings:
  180px content is 196px border-box width. Pointer movement is relative to the
  body's bounding box, not viewport coordinates.
- Context-selector propagation can invoke the previous sizing callback during
  a column/context transition. The red-run log retains the observed arguments
  `[0, 0, "name", "name"]`. The regression asserts correct committed geometry
  and that subsequent committed renders use the replacement callback, not a
  never-supported guarantee of one invocation or no intermediate old call.
- DataGridCell's explicit td is honored. Native fixtures use real
  table/thead/tbody/tr/td markup rather than putting forced-div DataGrid
  parents inside a table. Parent/root/sibling tag precedence is outside this
  assignment and was not repaired. Layout still follows Table context even
  when a caller explicitly selects a different tag.
- The installed React 19 typings do not provide Fluent source's global JSX
  namespace. Raw suite, whole-package Cypress, and independently imported
  baseline checks reproduce the same five pre-existing diagnostics in
  FluentProvider, DataGridBody, DataGridRow, and Tooltip. The component-local
  JSX compatibility declaration enables a clean scoped check without
  weakening strictness or modifying shared configuration/source. Local ESLint
  wiring only supplies that scoped TypeScript project.

This finite inventory does not exhaust arbitrary content, column IDs, browser
implementations, touch/virtualization integrations, or actual screen-reader
speech. No production fix, dependency installation, commit, or next-component
work is included.

## Isolated representative mutation follow-up

The isolated standard suite retains **76 cases**, all existing case contracts,
and all axe assertions/audit writes. The expanded native ref cleanup fixture
checks trusted native click target/currentTarget identity, the same original
event bubbling to its parent, replacement consumer callbacks after props change,
stable td identity, explicit tabindex precedence, native attributes, classes,
updated content, and callback ref detachment. Existing div callback cases provide
the contrasting non-native positive controls. This closes a genuine gap exposed
by dropping only explicit td click callbacks in DataGridCell's own hook.
The runner freezes the assigned primary count and rejects `Expected=77` before
creating a run. Therefore the existing native ref case was strengthened rather
than adding a separate case or changing harness configuration.

Five representative in-memory mutations cover none-mode group attributes,
numeric-zero column sizing context, consumer tabindex precedence, native click
forwarding, and the own style hook's native-layout variant forwarding to
TableCell. Shared TableCell/Tabster hooks and production files remain immutable.
The first group-mode removal candidate was excluded because existing unchecked
property access produced TypeError as well as assertion failures; it is not
counted as a kill and was replaced by a typed-assertion-only candidate.

Exact before/after manifests, assertion causality, source/dependency hashes,
restorations, and validation logs are retained in the session harness under
`mutations101-120/campaign/DataGridCell/DataGridCell-report.json`. This finite
campaign is not an exhaustive correctness or accessibility certification. Raw
type checks still reproduce five inherited diagnostics; the unchanged local
JSX compatibility declaration only makes the scoped check green, not the raw
package baseline.
