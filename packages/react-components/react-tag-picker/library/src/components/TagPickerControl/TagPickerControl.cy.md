# TagPickerControl browser contracts

No prior component-local Cypress suite. Current shared source is exercised in Electron through the artifact Nx harness; no retries/pending/skips/arbitrary sleeps or universal/screen-reader/cross-browser/pixel claims.

Read current component/types/base+styled hooks/renderer/styles/component and hook-unit/conformance tests; parent TagPicker state, inherited Combobox setOpen gate, input composition and expand-label utility. Primary README, all TagPicker story modules/index/Description/BestPractices/A11y docs and story README were read.

## Round 1 source → assertions

- Default/README: expand span role/name/expanded state, real list ID → control aria-owns, pointer toggling focuses input with exact mousedown event envelope. Native Tab/ArrowDown/Enter selects one tag with exact event/value/selectedOptions data and retained input focus, then Tab exits.
- SecondaryAction: native Tab/Enter activates clear without control opening and removes selected tag content.
- ExpandIcon: nested custom icon activates; explicit null omits both expand and unused aside while keyboard input can still open.
- NoPopover: no default expand/aside/ownership/list; consumer-managed native Enter adds a custom tag and clears the input.
- All three Size variants measure control/aside minimum height and expand font size; all four Appearance variants assert computed background/radius plus keyboard open/Escape.
- Button composition uses real button-backed combobox with control focus and native selection.
- Disabled story: expand request rejection with zero open callbacks; current group makes selected tags natively disabled, but a consumer secondary action can still update selectedOptions (without falsely claiming a tag dismissal callback).

Control owns no selected/open state: parent context drives it. The expand span is a pointer affordance; keyboard interaction belongs to the input/button trigger, not a fabricated independent Tab stop. Filtering/grouping/truncation/overflow/single-selection stories were read, but their consumer/sibling algorithms are not certified as control-owned APIs. Known AT issues documented in TagPickerA11y.md are not resolved/certified by these DOM tests. Dynamic naming/refs/native handlers/aside measurements and unit-derived scope are added in later rounds.

## Round 2 exact edges

Consumer root mousedown/currentTarget/cancellation and capture-phase cancellation retain closed state with zero open requests; capture preserves outside focus. Unrelated child and secondary clicks never request expansion; secondary action keeps its own focus/callback. Native Home/End on a button-backed trigger reaches real option endpoints without selection, then Escape retains trigger focus. Mutation-driven input aria-label changes update default expand name; labelledby naming combines real expand-ID/Open and external label targets. Explicit consumer expand names win. Both Field error appearances derive actual invalid border color and retain native input aria-invalid/opening.

### Tightly coupled production correction

Round 2 reproduced a dropped consumer `onMouseDown` handler (22/23 passing): the internal root handler overwrote it and opened despite the consumer's intended cancellation. The base hook now invokes the current consumer first, then respects default prevention before toggling/focusing. Two component-local Jest regressions assert callback ordering and cancelled opening. Beachball is omitted because the campaign explicitly forbids writes outside this active component directory.

Round 3 reproduced stale measured aside reservation after both slots were removed: padding remained 224.406px instead of the base 12px. The active hook now clears measured width when no aside exists, preserves explicitly supplied consumer width, cancels/replaces stale animation frames and cancels pending frames on unmount. Two more local Jest regressions cover measured cleanup and consumer width preservation, and the real ResizeObserver browser case verifies actual geometry before/after removal.

## Round 3 units/lifecycle

Root/expand/secondary native attrs/classes/refs identify actual nodes, portal width matches the root target, and refs clear on full unmount. ResizeObserver live aside content width drives reserved padding and removing both slots removes stale reservation. Latest native root/current parent callbacks retain currentTarget/event identity and consumer-before-internal-prevention order. Controlled requests cannot mutate parent open; external state updates do not call handlers; defaultOpen is initialization-only. Base hook omits automatic icon/aside but explicit expand remains functional. Dynamic context size/appearance updates existing root/aside/icon computed styles.
