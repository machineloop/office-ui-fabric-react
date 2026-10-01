# TableRow functional coverage

`TableRow.cy.tsx` tests a finite set of supported TableRow behaviors in valid
native table and non-native ARIA table/grid fixtures. Tags are selected by
explicit `as`, then nearest table context. Layout still follows context:
an explicit `tr` in non-native context has `display: flex`, while an explicit
`div` in native context has `display: table-row`. These combinations characterize
the tag/display boundary, not guaranteed table geometry.

TableRow supports `appearance="none" | "brand" | "neutral"`. Brand and neutral
are visual selected treatments; primary is a TableCellLayout appearance, not
a row appearance. The row does not manage selection, checkbox state, disabled
state, keyboard activation or navigation. `aria-selected`, `aria-disabled`,
selection-cell `checked` and row appearance are independent consumer inputs.
Consumer fixtures handle pointer and Space selection without reproducing the
shared selection hooks. Space prevention and exact callback delivery are
asserted separately from state changes.

Coverage includes density, sibling cells and rowheaders, appearance/hover/active,
keyboard focus and focus-within, forced-colors borders/focus/system highlight,
subtle indicators, nested action containers,
native attributes and refs, root render functions, callbacks/preventDefault,
latest props, retained keyed row/input identity, reorder, context-mode replacement
and ref teardown. The documented cell-actions pattern tests consumer
`defaultPrevented` guards without suppressing row callbacks.
Header context disables interactive hover styling but retains focus-within
reveal. Nested Tables reset table density/layout context, not header context.
Body rows receive hover/active styling even without an activation or selection
handler; this is existing visual treatment, not proof that the row is interactive.
Row reveal selectors intentionally reach descendant action/selection classes
across nested table boundaries; the suite characterizes this existing boundary.

Real keyboard tests exercise native Tab/Shift+Tab, row up/down movement and
cell movement composed with `useArrowNavigationGroup`. LTR covers horizontal
cell movement; RTL covers vertical movement and physical column geometry.
RTL horizontal Tabster grid movement failed an independent temporary probe in
both native and div grids; it is an external limitation, not claimed as passing
here. Composed div movers also produce two `aria-hidden-focus`
axe violations from their focusable hidden dummy elements (`i[data-tabster-dummy]`).
The test `documents and guards known external mover accessibility violations in
a div grid` durably reproduces this finding with the same representative
labelled, mover-enabled row-navigation Grid fixture and WCAG tag scan. It asserts
exactly one `aria-hidden-focus` rule failure on exactly two nodes, verifies both
are the grid's focusable, aria-hidden Tabster dummy elements, and rejects every
additional relevant WCAG violation. No axe rules are disabled or suppressed.
This passing characterization records known-failure data: it does **not** mean
the mover integration is accessible or passes WCAG. If the dependency fixes,
removes or otherwise changes these failures, the exact-baseline test fails and
requires review and an intentional update rather than silently accepting a new
baseline.

Separate clean WCAG scans isolate the component's
labelled native/ARIA tables and grids without the external mover. Keyboard
integration is tested separately with the mover enabled.
To reproduce the dummy-node issue, enable `useArrowNavigationGroup` on a div
grid and run the same WCAG scan without disabling navigation: the two
`i[data-tabster-dummy]` nodes fail `aria-hidden-focus`. No upstream issue was
filed by this change. The executable characterization makes detection durable;
it does not resolve the upstream defect.

Run through the existing `react-table:e2e` Nx target with
`FLUENT_SPEC=**/TableRow.cy.tsx`. Portable local type configs target the suite
and units; the baseline config directly checks existing Provider, Popover and
Tooltip renderers to reproduce external JSX type diagnostics without the suite.
No sorting or shared row-selection helpers are implemented or modified. The
existing forwarded ref type remains `HTMLDivElement` even when the actual root
is a native `tr`; the suite uses that public type and asserts the runtime node.
