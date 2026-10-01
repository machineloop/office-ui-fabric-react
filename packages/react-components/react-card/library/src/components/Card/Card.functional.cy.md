# Card browser contracts

The original `Card.cy.tsx` remains unchanged (51 cases). The additional
`Card.functional.cy.tsx` covers documented visual/composition contracts and
meaningful native browser edges and unit/conformance behaviors. Run the
`react-card:e2e` Nx target with the exact `**/Card{,.functional}.cy.tsx` selector.
`Card.functional.styles.cy.tsx` is an excluded test-only style fixture, not a
spec. Current combined coverage is 128 cases.

| Current source                             | Additional browser proof                                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| README; Default and Description stories    | Native group and medium/vertical/filled defaults, actual shadow/border paint, rich header/preview/footer composition                                                                                          |
| Size, Orientation and Appearance stories   | All sizes/radii/padding/gaps, all appearances/pseudo borders/shadows, flush preview geometry in both orientations and RTL, native hover/pressed/selected paint                                                |
| Selectable and SelectableIndicator stories | Controlled surface selection, independent nested actions, synchronized floating Checkbox and computed title-based name                                                                                        |
| Disabled story                             | All appearances suppress surface and selection callbacks and disable internal checkbox; explicitly enabled children work by pointer and keyboard                                                              |
| Action and Templates stories               | Off-mode root/inner button access, real linked title, task controls and list-item semantics                                                                                                                   |
| FocusMode story and best practices         | Existing forward Enter/Tab/Escape mode matrix preserved; additional reverse native Tab matrix, inferred interactive focus, computed group name/description                                                    |
| `Card.types.ts`; slot/native contracts     | Controlled versus uncontrolled initialization, omission/restoration, floating slot shorthand/render functions, explicit null checkbox, native attributes, inline/classes and ref identity/replacement/unmount |
| `useCard.test.ts`                          | Every current pointer/mouse/touch/drag handler classifies interactive focus; keyboard-only handler does not; disabled/off/selectable focus attributes and live removal                                        |
| `useCardSelectable.test.ts`                | Genuine headless base-hook predicate restriction, checkbox bypass, native pointer/Enter, exact callback counts                                                                                                |
| `Card.test.tsx` and conformance            | Existing units unchanged; actual native root, user classes/Griffel overrides, root callback/object refs, latest/removed/restored callbacks                                                                    |
| Component style/provider implementation    | Visible checkbox keyboard focus border, live nested themes/custom styles, selected forced-colors paint and preview/footer adjustment                                                                          |

## Supported-contract corrections

Native regressions exposed three defects, corrected only inside this directory:

- The disabled decorative overlay intercepted pointer clicks on enabled child
  controls, despite the documented non-propagating disabled contract. It now
  ignores pointer hit testing while card handlers/selection remain disabled.
- Selectable Card consumed Enter on nested buttons/links before its existing
  restriction could reject selection. Restricted targets now retain their
  native action; checkbox Enter still selects.
- Native internal-checkbox activation called `onSelectionChange` twice through
  bubbling click and change. Selection dispatch is now deduplicated by the
  actual native event identity, not by an assumption about the installed
  checkbox handler. Explicit consumer checkbox change overrides preserve their
  previous selection behavior. Native default-checkbox pointer and Space
  activation and explicit consumer change overrides are separately tested.

Native-event deduplication is proved by these real browser dispatches. Original
handmade unit events omit `nativeEvent`; passing the unchanged unit suite does
not constitute deduplication unit coverage.

## Limits

No retries, skips, fixed sleeps, forced clicks, exception suppression or fake
clocks are added. Computed accessible names/descriptions and axe do not claim
manual speech or screen-reader proof. New image fixtures are local data URLs;
original remote-image fixtures remain untouched.

The current inferred interactive focus is `no-tab`; a legacy unit-test title
says `tab-only`, but its assertions only exercise tabIndex and simulated Tab.
Native browser behavior is checked against the actual current implementation,
while all original unit assertions remain intact. Explicit documented focus
modes are separately covered. Reduced motion has no Card-specific behavior;
actual forced-colors emulation covers its defined media styles.

Render functions are tested for `floatingAction`. The `checkbox` slot is
`Slot<'input'>`; current slot types expressly exclude children on void
intrinsic elements, including render-function children. No casts or compiler
suppression are used to invent that unsupported checkbox API.

Callbacks containing React hooks remain installed across rerenders to obey
hook order. Repository writes are limited to this component; private runtime
and evidence are outside the checkout. No out-of-scope beachball/release or API
golden changes are generated. README-linked `Spec.md` and `MIGRATION.md` are
absent from the current package and cannot supply extra current contracts.
