# MenuTrigger browser contracts

`MenuTrigger.cy.tsx` tests the actual trigger contracts from the stories, public
types, trigger utilities, ARIA-button implementation, component hooks and unit
tests. It does not introduce new trigger behavior.

## Supported shape

- MenuTrigger has no DOM root, slots or styles. Props such as native attributes,
  classes, event handlers and refs belong on its single child.
- A native element, Fluent component or custom ref-forwarding component can be
  cloned. Custom components must forward both injected props and the ref.
- A render function receives trigger props and can attach them to an inner
  element. Null, undefined and a render function returning null render nothing.
- Fragments, arrays and text are invalid direct children. Error-boundary cases
  assert the exact rejection, rather than suppressing browser exceptions.
- Default enhancement synthesizes button semantics for non-native children.
  `disableButtonEnhancement` leaves that responsibility to the consumer, while
  retaining menu handlers. Context-menu mode does not add button enhancement or
  menu click/keyboard handlers.

## Interaction and composition

Native buttons retain browser Enter/Space activation and form behavior.
Enhanced non-buttons activate on Enter keydown or Space keyup. Root ArrowDown
opens; root Escape closes. Submenu opening uses the direction-aware arrow,
unless the parent list reserves it for grid navigation. The open-submenu path
refocuses the first focusable item; the base hook delegates to `focusFirst`.

The adversarial composition cases exercise `<MenuTrigger><Button /></MenuTrigger>`
with `disableButtonEnhancement` genuinely omitted, plus the explicit opt-out.
Each real Enter/Space activation must request exactly one open or close, with
visible/absent surface, expansion state, first-item focus and trigger focus
checked. Reopening and Escape dismissal are positive controls. The default
custom-child div enhancement wraps Button's native-button handling; its
prevented keyboard default avoids a second native activation. Both paths
currently report click-mediated activation as `menuTriggerClick` with
`keyboard: false`, even for real keyboard input; Escape reports
`menuPopoverKeyDown` with `keyboard: true`. The assertions preserve these source
semantics rather than inferring keyboard metadata from the input alone.

Original child handlers execute before internal handlers. Keydown and
contextmenu prevention veto the corresponding internal action. **Click and
hover prevention do not veto their internal actions** in the current source.
Disabled targets/currentTargets block internal actions; enhancement also
suppresses disabled click callbacks. Context-only mode preserves consumer
click/keydown callbacks.

Hover opening requires movement, with delayed opening/closing and only one
initial movement request. A submenu safe-zone timeout can bypass delay once.
Refs merge child, positioning and safe-zone listener attachment, including
replacement/unmount cleanup. Rerenders use current handlers, open state,
disabled state and interaction mode.

## Accessibility and boundaries

The suite checks roles/tab order, accessible name/description attributes,
generated ID stability/uniqueness, MenuList labelling, expansion state,
keyboard entry, submenu LTR/RTL navigation, focus restoration and unrelated
focus preservation, real Tab/Shift+Tab continuation and focusable disabled
Fluent-button behavior. Positioning is measured from the actual child-ref target.
Controlled Menu state remains controlled; requests alone cannot change it.
Accepted controlled requests are also exercised with both enhancement settings.

Child ARIA/id values currently override injected defaults. Consumers overriding
ARIA assume responsibility for correct semantics. There is a **known existing
cross-component limitation**: a child-provided `id` is retained, but MenuList's
default `aria-labelledby` still uses Menu's generated ID. The original browser
round demonstrated this mismatch. Fixing it while preserving consumer IDs
requires a coordinated Menu/MenuList change outside this component's authorized
directory; this suite does not claim that override produces valid labelling.
Generated-ID relationships are tested positively.

Generated IDs are asserted nonempty, stable across rerender and unique between
siblings. Their prefix/format is not a public API contract, so the review's
suggested shape assertion is deliberately not adopted.

Evidence records execution rounds and diagnostics in the assigned session's
`MenuTrigger-evidence.json`. Browser automation covers finite supported
contracts, not all inputs, platforms or assistive-technology announcements.

## Narrow adversarial review disposition

The missing default-enhanced Fluent Button path is now covered alongside the
opt-out for both Enter and Space (four cases replacing the previous Enter-only
opt-out case). Both full post-correction Cypress runs passed **90/90**, with
zero failures, pending cases, skips or retries. The composition did not reveal
a MenuTrigger defect; no production source or unit regression was needed.
Existing targeted units passed **59/59** in two suites, with **3/3** snapshots.
ESLint and Prettier passed. Type-check still reports only the same three
pre-existing Provider/Tooltip diagnostics and none in MenuTrigger.
The incidental generated-ID shape suggestion is declined for the contract
reason above; both sibling IDs are now explicitly asserted nonempty.

## Isolated mutation coverage correction

Two additional cases check prevented ArrowDown immediately, with button
enhancement both enabled and disabled. Before any later gesture they require
the child callback and prevented event, zero open-change requests, absent
surface, omitted expansion and retained trigger focus. Unprevented ArrowDown
after a rerender must deliver exactly one request with the original event and
keyboard metadata, expand the trigger and focus the first item; Escape then
dismisses and restores focus.

The earlier prevention cases sent Enter before checking the surface. That could
activate the first menu item and dismiss a menu incorrectly opened by ArrowDown,
masking removal of the internal preventDefault guard. The new cases close this
observable gap without weakening or removing existing scenarios. The complete
suite now contains 92 cases. Mutation catalogs, per-run assertions and restoration
evidence are session-only artifacts; production source remains unchanged.
