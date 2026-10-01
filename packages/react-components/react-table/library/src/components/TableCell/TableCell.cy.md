# TableCell functional coverage

`TableCell.cy.tsx` contains a finite component-owned suite. Native fixtures use
`table > thead/tbody > tr > td/th`; non-native fixtures use corresponding ARIA
table, rowgroup, row and cell roles. An explicit `as` overrides the element
chosen by `noNativeElements`; layout styling still follows table context.
Consequently, overriding the tag against that context can produce a native
`td` with `display: flex`, or a `div` with `display: table-cell`. These tested
combinations characterize existing styling, not guaranteed table geometry;
keep explicit tags consistent with the context for ordinary table layout.
TableCell has no size or appearance prop of its own: density comes from the
nearest Table, primary appearance belongs to TableCellLayout, and selected
appearance belongs to TableRow.

The suite covers density, default semantics, polymorphism, native span geometry,
ARIA relationships, refs, native handlers, root render functions, overrides,
media/text/action geometry in both directions, real overflow, keyboard access,
nested context boundaries, dynamic updates and retained child identity.
WCAG scans supplement explicit role, relationship and focus assertions.
Selection and sorting algorithms are deliberately not reproduced.

TableCell does not implement keyboard navigation or keyboard activation.
The grid fixtures compose the documented `useArrowNavigationGroup` and
`useFocusableGroup` hooks. Four-direction navigation is covered in LTR;
vertical navigation and physical column geometry are covered in RTL.
Horizontal RTL navigation is a known out-of-directory Tabster Grid mover
limitation: its next/previous rectangle rejection uses LTR comparisons after
swapping RTL keys. Failure logs and source locations are recorded in
`TableCell-evidence.json`; this suite does not claim that behavior passes.

Use the existing `react-table:e2e` Nx target with a spec filter for TableCell.
`TableCell.cy.tsconfig.json` and `TableCell.unit.tsconfig.json` allow targeted
type checking without changing shared configuration. Griffel conformance runs
in valid div markup because its generic container cleanup assumes a direct
body child. Separate native snapshot, attribute/ref and explicit-td regressions
retain native coverage.
