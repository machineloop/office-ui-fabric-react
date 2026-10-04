# DataGrid root coverage

Row 116 covers only `DataGrid`. The existing 11 Cypress cases are retained,
including their repeated Home/End case names. `DataGridBody`, `DataGridCell`,
headers, rows, selection cells, and table feature hooks are read-only integration
dependencies, not separate component assignments. Production files are unchanged.

## Finite inventory

| Surface                   | Observable coverage                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root rendering            | Default div/grid, rowgroups/rows/columnheaders/gridcells, accessible label and description relationships, native attributes, classes, inline min-width, object/callback refs, unmount, supported div/table `as`, root slot render function                                                                                                                                                               |
| Items and columns         | Column render functions, numeric zero/string/empty-string identities, stable DOM identity through sorting/reordering, positional default IDs, empty/single items, zero/single columns, removal/restoration, current `getRowId`, unsupported duplicate-input characterization                                                                                                                             |
| Sorting                   | `sortable` gate, absent comparator, default/controlled states, owner refusal/acceptance, ascending/descending/new-column reset, native pointer/Enter/Space, exact callback shape, latest comparator/callback, stable ties, immutable items, removed sort column, context setter                                                                                                                          |
| Selection                 | Disabled/single/multiselect, default/controlled iterable state, owner refusal/acceptance, row pointer/Space and native checkbox/radio activation, header none/partial/all, exact Set payload, latest callbacks, no invented reason field, clear/select/deselect context methods                                                                                                                          |
| State lifecycle           | Defaults initialize only once; filtering retains IDs; header aggregates only present IDs; clear-all clears obsolete IDs too; selection is not migrated when the identity function changes                                                                                                                                                                                                                |
| Layout and styling        | Supported extra-small/small/medium density, brand/neutral/none selection appearance, subtle selected/hover/native-keyboard focus controls, root block/row flex/cell flex layout, actual header/body geometry                                                                                                                                                                                             |
| Resizing                  | Root opt-in, selection width offset and explicit override, autofit off and last handle, real primary drag/secondary-button guard, native resize payload, no accidental sorting/selection, keyboard 20-pixel/Shift 5-pixel steps, minimum clamp, Escape/Enter/Space exit, current sizing options/callbacks, parent ResizeObserver shrink/grow, new-column defaults, zero/empty column IDs, context setter |
| Focus                     | Existing native arrows/Home/End/Ctrl Home/End, composite navigation, Tab/Shift-Tab external boundaries, nested cell group Enter/Escape/trap, single nested focusable, root preventDefault/latest handler, supported cell/composite/none/row_unstable modes and dynamic attribute cleanup, RTL cell navigation                                                                                            |
| Context and accessibility | Nested provider and real nested-cell context isolation, characterized event bubbling, sort ARIA and selection states, scoped axe ARIA/name/label rules with failing missing-name positive control and restored passing control                                                                                                                                                                           |
| Server rendering          | Separate Jest `renderToString` assertion for named grid, rowgroup/gridcell markup, selected numeric-zero row and content; not a browser or hydration test                                                                                                                                                                                                                                                |

The public types and current stories govern supported values. The historical spec's
`row`, `smaller`, and `large` terminology is not used to invent supported props.
Only `none`, `cell`, `row_unstable`, and `composite` are root focus modes.

## Characterizations, not fixes

- In this development browser, an uncontrolled sort action invokes `onSortChange`
  twice with the same proposal. The callback runs inside a React state updater;
  controlled proposals are observed once. The original once-only failures are
  retained in the session evidence. This is not a production callback guarantee.
- `row_unstable` makes rows tabbable but does not install a root arrow mover.
  `none` omits the mover and cell tab stops; root Ctrl+Home still finds a focusable
  header, while Ctrl+End cannot focus a last row without focusable descendants.
- RTL composite entry uses physical ArrowRight. ArrowLeft from the first cell
  focuses the next cell instead of leaving focus on the row in the tested browser.
  The external Tabster/composite helper is not rewritten.
- Keyboard resizing uses physical left/right decrement/increment in RTL too.
- A root `preventDefault` handler cannot retroactively veto selection already
  performed by a descendant row handler.
- Nested grid context state is isolated, but native click bubbling can select both
  the inner row and the containing outer row. Event containment is not promised.
- Duplicate row/column IDs are not rejected by the root. Context-only tests avoid
  React duplicate-key rendering and show collapsed selection identity; duplicates
  remain unsupported, not a newly supported feature.
- Setting a width for an unknown column is a silent source no-op, characterized
  alongside a successful known-column control.

Programmatic `.focus()` alone did not reveal subtle selection in the initial
fixture. The retained corrected case uses real keyboard navigation and verifies
the focused cell before asserting the documented focus appearance.

## Execution and boundaries

Use the existing `react-table:e2e` Nx target, narrowed to `**/DataGrid.cy.tsx`.
This assignment uses webpack port **18241**, zero Cypress retries, Electron, and
component-specific session artifact directories. No shared config is changed.
The read-only runtime adapter and exact commands/results/source hashes are
recorded in the session's `coverage101-120/DataGrid-evidence.json`.

`DataGrid.cy.tsconfig.json` narrows the existing package Cypress configuration.
`DataGrid.cy-baseline.tsconfig.json` checks the source-only import graph separately.
They introduce no ambient JSX declarations or type-safety relaxations. Existing
Provider/Tooltip JSX diagnostics and Body/Row context-provider key diagnostics
must be reported as baseline failures rather than claiming a green package check.

This is a finite root inventory, not exhaustive combinations or infinite inputs.
It does not claim actual assistive-technology announcements, universal browsers,
SSR hydration, virtualization from the external contrib iframe, touch-device
coverage, or unsupported nested-grid focus containment. Axe is limited to the
specified ARIA/name/label rules, not a complete accessibility certification.
