# List Cypress coverage (row 81)

## Compilation-only mutation verification

Fresh full-component runs (77 cases) killed vertical-to-horizontal navigation
and disconnected-root-ref mutations. A `list-style-type: disc` mutant compiled
and loaded in the browser but survived, exposing missing coverage of the native
list marker reset. The default-list contract now asserts computed
`list-style-type: none`; the same mutant is rerun before the restored baseline.
Production source is hash-checked and never modified by the mutation loader.

The original `List.cy.tsx` retains its 27 navigation, selection, controlled/default
state, disabled-item and accessibility-role cases. Keyboard sequences now use
`cypress-real-events`, with a focus assertion after every movement. Composite
fixtures use grid cells. `List.cy.stories.tsx` adds executable contracts using
small local fixtures instead of network-loaded personas/images or alerts.

## Round 1: documented scenarios

Sources: `stories/src/List/ListDescription.md`, `ListBestPractices.md`, all eleven
story modules exported by `index.stories.tsx`.

| Story / documentation                   | Functional coverage                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ListDefault`                           | Non-interactive UL/list/listitem semantics; no item tab stops, selection attributes or checkboxes; Tab bypasses passive items                     |
| `SingleAction`                          | Click, Enter and Space activate the primary action; no implicit selection                                                                         |
| `SingleActionSelection`                 | Single/multiselect inferred item focusability; Enter, Space and checkbox selection; initial/default state and disabled selection                  |
| `SingleActionSelectionControlled`       | Owner-controlled updates, external replacement and clearing; every selected and unselected item checked                                           |
| `SingleActionSelectionDifferentPrimary` | Cancelled click/Enter primary action leaves selection unchanged; Space/checkbox still select                                                      |
| `MultipleActionsWithPrimary`            | Grid/row/gridcell semantics; horizontal entry, boundaries and Escape; vertical row navigation; secondary actions isolated from primary            |
| `MultipleActionsSelection`              | Secondary actions preserve selection; vertical navigation does not select; Space selects focused rows                                             |
| `MultipleActionsDifferentPrimary`       | Composite custom-primary cancellation and independent Space/checkbox selection                                                                    |
| `ListActiveElement`                     | Focus-driven controlled selection; bubbled child focus ignored; hidden checkmarks                                                                 |
| `VirtualizedList`                       | Real `react-window` recycling; focusable scroll root; native ArrowDown scrolling; explicit set size/positions; top/bottom round trip              |
| `VirtualizedListWithActionableItems`    | Native Tab entry from the preceding button; real keyboard activation before/after recycling; correct item values and positions                    |
| Description / best practices            | Tab exits composite groups; Shift+Tab restores memorized row; names/descriptions; secondary menu open, keyboard activation and Escape restoration |

## Round 2: undocumented and accessibility edges

- Disabled selection blocks click, Enter and Space; native checkboxes disabled.
- Disabled selection with a custom action retains action availability.
- Controlled owners can reject proposals without optimistic selection.
- Repeated activation preserves other values and avoids duplicates.
- Numeric zero stays a numeric ID.
- Non-wrapping Home/End/PageUp/PageDown boundaries never select or act.
- RTL reverses horizontal action movement while preserving vertical movement.
- Accessible labels/descriptions and untabbable checkmarks.
- Empty/one-item lists, sibling isolation and stable values across reorder/remove/restore.
- Initially selected disabled values cannot be deselected by activation.
- Selection props without `selectionMode` do not implicitly enable selection.

## Round 3: unit-derived contracts

Source: `List.test.tsx`, plus event/state implementation to verify exact payloads.

- Full 3x3 navigation/selection role, focusability, checkmark and ARIA matrix.
- Explicit root/item roles in all navigation modes.
- Compatible div markup, forwarded ref, class and native attributes.
- Explicit UL/OL markup and refs, native Tab entry/exit and arrow navigation.
  These regressions reproduced an operator-precedence bug coercing explicit
  roots to DIV. `useList.ts` now preserves the requested supported element.
  Focused Jest regressions also retain the default composite DIV behavior.
  No Beachball file is added because the user restricts repository edits to
  this component directory; release metadata remains outside this campaign.
- Both invalid parent/child element combinations produce exact unit-tested
  diagnostics in an explicit error boundary; a subsequent valid mount succeeds.
  No global uncaught-exception handler or ignored runtime errors.
- Exact selection/action callback envelope, original event and numeric value.
- Checkbox click invokes `onClick`, but not the primary action.
- Cancelled row `onClick` prevents primary action and selection.
- Unrelated keys have no activation/selection side effects.
- Single-selection reactivation retains the same value; another value replaces it.

## Running

Use the persistent, artifact-only Nx workspace; it resolves package aliases to the
current shared Windows checkout and uses Node 22, not the machine's Node 18.

```powershell
$runner = 'C:\Users\jabrassi\.scout\copilot\session-state\2e4c7223-1bc5-4a3c-b51e-110b721d48f3\files\coverage-81-143\Invoke-Coverage.ps1'
& $runner -Component List -Package list -Target cypress -Phase final
& $runner -Component List -Package list -Target typecheck -Phase final
```

Both invocations execute `nx run component-coverage:<target> --skip-nx-cache`.
The reusable helper accepts another `-Component` and `-Package`, but row 81 alone
is implemented here. Cypress uses Electron, real keyboard events, retries zero,
an ephemeral loopback port, no video/failure screenshots and no skipped tests.
Timestamped logs/results and compiled-source audits are retained beside the
runner. Compilation failures, nonzero exits, zero tests, failures, pending or
skipped tests fail the task. `tsconfig.cy.json` includes both exact specs and the
React 19 JSX compatibility declaration.

## Observed pre-existing issue (outside this component-local fix)

In the documented passive virtualized-list pattern, a `List tabIndex={0}` root
is programmatically focusable and ArrowDown scrolls it, but real Tab from the
preceding button skips it to the following button. This was reproduced twice
before replacing the over-broad Tab expectation with the documented
focus-and-scroll contract. Evidence is preserved in artifact logs
`List-round1-docs-cypress-1791036971794.log` and
`List-round1-docs-recheck-cypress-1791037086346.log` (the second records
`data-test="after"` rather than `"virtual"`). This suite does not claim Tab
accessibility of that passive root. Actionable virtualized-list entry is tested
separately with native Tab and passes; no programmatic-focus substitution is
used for its initial entry. The passive react-window/Tabster interaction remains
an external limitation, not a certified accessibility contract.
