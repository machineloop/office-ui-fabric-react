# DataGridBody browser coverage

The suite uses the existing react-table e2e target and component Cypress configuration.
Only this directory is writable for row 117. Sibling sources and existing unit tests are read-only.

## Finite inventory

Current inventory: 53 browser cases (17 documentation, 21 lifecycle/accessibility, 15 source/unit-derived).
The review follow-up replaces one permissive axe case with the two distinct contexts below.

Documentation round: actual item-to-row mapping and callback shape, default index IDs and custom
numeric-zero/string IDs, empty/default contexts, root ref/classes/native attributes/event bubbling,
generic unknown records, fragment/null/string ReactNode results, root-owned sortable gate,
controlled/uncontrolled sorting and single/multiple selection, cell/row keyboard navigation.

Edges/accessibility round: collection reorder/filter/remove/reinsert/replacement, retained keyed
row state and fresh callbacks, callback-ref cleanup, multiple/nested grid and body isolation,
dynamic column definitions, valid ownership/roles/names/ARIA and passive body semantics,
RTL/dark context, and type-supported `as` characterization.

Source/unit round: exact getRows/sort dispatch, current context rows rather than context items,
sort output mapping and fresh functions, row provider identity without caller keys,
raw source array/object immutability, row callback versus whole-root render-function behavior,
and inherited provider-key type diagnostics.

## Boundaries

Sorting, selection, navigation, column sizing, row and cell semantics belong to DataGrid and its
children, not to DataGridBody. These are real-root integration checks, not additional body features.
Virtualization is consumer-owned (the story replaces DataGridBody with a virtualized renderer);
there is no body-owned scrolling, announcements, sorting state, or selection state.
No actual assistive-technology speech or all-browser/infinite-input claim is made.

The current hook forces `as: 'div'` after incoming props. Tests label the ignored type-supported
`as="tbody"` as inherited behavior; no production fix is authorized. A native-grid fixture uses a
hook-composed root slot override to obtain valid table/tbody/tr/td structure, rather than putting a div
under a table or pretending the public `as` prop is honored.

Raw commands, case names, counts, logs, before/after source hashes, corrections and baseline
diagnostic isolation are recorded in the session's `DataGridBody-evidence.json`.

Two distinct real-grid accessibility tests exercise the public `focusMode` contract. The ordinary
`focusMode="none"` fixture disables only its own root mover, retains the visible grid and body,
asserts that no root mover or dummy sentinels exist, and requires zero full-root axe violations.
The named `focusMode="cell"` characterization requires a root mover and exactly two root-owned
sentinels before and after real ArrowDown navigation, with a retrying DOM readiness assertion
before its first scan (no sleep or test skip). In this harness their CSS visibility is
`visible`, layout is 1px by 1px, opacity is `0.001`, content-visibility is `hidden`, aria-hidden is
true and tabindex is zero. Those checked conditions require exactly one `aria-hidden-focus` rule
result with exactly those two DOM targets and `focusable-not-tabbable` checks.

The expectation branch is selected by fixture focus mode and verified against actual mover/DOM/
layout state, never by accepting whichever axe output appears. An unexpected sentinel state or
any additional rule/node fails. Earlier audits differed, but those logs did not capture enough
state to establish timing-based intermittency; no claim of spontaneous absence in the moving
fixture is made. Absence is now demonstrated by the separate mover-disabled context, without
changing shared Tabster, hiding a bad root, excluding audit nodes or disabling rules.

Both tests retain raw state-correlated full-root audits and require clean body-subtree audits.
Each injects one identified unnamed button, requires exactly one `button-name` node at that
button (plus only the already-required mover result in the moving context), removes it and
requires the original root disposition and clean body audit to be restored. This characterizes
an inherited root limitation, not a fully axe-clean moving grid or a production fix.
