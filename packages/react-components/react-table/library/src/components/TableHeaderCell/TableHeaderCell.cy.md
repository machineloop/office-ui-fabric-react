# TableHeaderCell browser coverage

The component is a low-level header primitive. `sortable` enables an accessible
button, not data sorting: the consumer owns sort state and composes sorted rows,
optionally using `useTableFeatures` and `useTableSort` (Table sorting stories).
`sortDirection` supplies the arrow; `aria-sort` is present only when sortable.
The sort icon may be customized or suppressed independently of narration.

The fixtures use valid native table/thead/tr/th and tbody/tr/td hierarchies or
equivalent non-native roles. Explicit `as` wins over the context's default tag.
The local precedence fix does not change context-owned layout styles: a native
`th` in no-native context still uses flex, and an explicit `div` in native context
still uses table-cell display. Keep the context and chosen tags consistent for
normal layouts. No sibling hook is changed.

The native root also forwards the typed `abbr` and `headers` attributes, which
the shared intrinsic-prop filter currently omits for `th`. This repair is local
to TableHeaderCell; div roots continue filtering native-only attributes.

The 85 browser cases include default/context/explicit-tag resolution, all three
sort narration states, arrow direction changes, native and ARIA button activation,
disabled/disabled-focusable behavior, anchor slots with and without a navigation
target, disabled link navigation removal, prevented keyboard defaults, current
callbacks, ref cleanup, render functions, custom slots, native relationships,
mixed children, class overrides, nested contexts, three row appearances,
three densities, both layout directions, keyboard focus indication, native tab
order, consumer-composed grid navigation, WCAG scans and actual controlled and
uncontrolled row sorting. Header buttons retain their 32px minimum across table
densities; density does not promise a smaller header button.

`disabled` belongs to the button slot, not the header root. An unsortable header
with an explicitly native button still has native button semantics; sorting
behavior and disabled normalization are applied only when `sortable` is enabled.
Arrow-key navigation is not built into TableHeaderCell: the grid fixture composes
the documented Tabster navigation hook. RTL coverage asserts real horizontal
geometry, not a direction attribute alone; grid arrow navigation here is LTR.

The local Cypress and unit tsconfigs isolate owned diagnostics. The baseline
tsconfig imports only the unmodified FluentProvider renderer and demonstrates
its existing TS2741/TS7026 diagnostics independently. No diagnostic suppression
or shared configuration change is used.

Coverage is organized in documented, edge/accessibility and unit-derived rounds.
Assertions exercise DOM semantics, activation, slot content, relationships,
refs and actual computed layout rather than merely mounting variants.
This is a finite inventory of supported scenarios, not exhaustive input coverage.
