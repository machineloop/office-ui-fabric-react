# MenuItemRadio browser contracts

`MenuItemRadio.cy.tsx` exercises the public item API in a named standalone
`MenuList` and in a popup `Menu`. Selection belongs to the nearest list/menu,
not to a `checked` prop on the item. Each activation reports
`{ name, checkedItems: [value] }`; controlled owners must accept the hint.
Arrow keys and typeahead move menu focus without selecting a radio.
`disabled` remains focusable and blocks activation; `disabledFocusable` is
deprecated and does not independently disable an item.

The suite checks both `aria-checked` and actual checkmark visibility.
An explicit `checkmark={null}` omits the slot even when the containing list
reserves checkmark alignment. The radio hook must preserve this null through
the shared base hook rather than turn it into an undefined default slot.
The other explicit null slots are independently omitted.
The sibling MenuItemCheckbox still has the equivalent null-to-undefined
omission bug; this component-local fix does not repair that sibling.
The existing radio root also retains a literal `name` attribute on its div.
That pre-existing DOM leakage is not corrected or endorsed as a native input
contract here. Both findings remain follow-ups, not library-wide fixes.

Only finite source-supported behaviors are covered. Radio items do not render
the inherited `submenuIndicator` slot in their current render function; no
submenu-indicator rendering contract is asserted. Multiple initial values in
a radio group's array are observed as source behavior, not recommended as a
valid single-selection configuration. Accessibility assertions are DOM and
keyboard checks, not a substitute for assistive-technology testing.

Axe assertions target the radio's own rendered subtree with all rules enabled.
A separate diagnostic reproduced `aria-hidden-focus` on the containing
`MenuList`'s two Tabster-generated dummy focus elements using an ordinary
`MenuItem`, without a radio. Those shared focus-management nodes are outside
this component's edit scope; the evidence records them without suppressing
axe rules or claiming the full containing menu passes.

The finite suite includes 66 cases: 15 documentation cases, 24 keyboard,
accessibility, layout and lifecycle edges, and 27 unit-derived composition
and rerender cases. Browser checks exercise light/dark themes, LTR/RTL slot
geometry, native forced-colors emulation, controlled/uncontrolled owners,
exact callback payloads and order, latest handlers, keyboard prevention,
focusable disabled items, slot render functions and omissions, refs,
selection persistence and nested/adjacent context boundaries.

The isolated mutation follow-up adds two secondary-content composition cases.
Both a plain slot and a render-function slot that spreads its supplied props
must retain consumer classes alongside Radio/shared static classes, native
title and ref. Rerender replaces the consumer class and title without losing
selection or issuing another selection callback. Root and icon class/native
forwarding provide positive controls. These are inherited `Slot<'span'>`
contracts, not new selection behavior or a parent-menu fix.
