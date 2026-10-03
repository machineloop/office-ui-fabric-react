# SplitButton browser contracts

No pre-existing local Cypress suite. Read component API/hook/base/render/styles/unit/conformance; package README/Spec; all SplitButton stories, index/Description, AccessibilitySpec.mdx and shared Button BestPractices. Only active component files are changed. Current source audit/Nx results live in the checkpoint.

## Round 1 source → assertions

- Default/README/accessibility: native Enter/Space independently activate primary/menu, exactly two Tab stops in DOM order, plain non-interactive div root, default primary-id/menu-labelledby relation, menu expanded/haspopup, native Home/End/ArrowDown focus, Escape collapse/restoration and reverse Tab.
- Five Appearance examples: exact theme-based resting/hover background on both halves; primary pointer action never opens menu; secondary click opens without re-invoking primary; Escape restores focus.
- Three Size/Shape variants: exact inherited size typography on both halves, menu width at least 24px, joined inner corners and expected outer shape; keyboard menu opening. Height/accessibility target-size certification is deliberately not claimed: small story warns about its size.
- Icon before/after and custom menuIcon: order, replacement of chevron, native menu activation. Long text retains accessible relation, bounded computed width and multiple text line rectangles fitting without clipping.
- Disabled and disabledFocusable: native Tab skip versus two retained stops; pointer/native key activation yields zero primary/open requests.

## Boundaries

Electron only, no forced-colors/pixel/screen-reader/cross-browser universal certificate. SplitButton itself owns no open/selected state: Menu context drives menuButton slot. Native root onClick is a bubbling handler, not a primary-only action. Current default label behavior and slot overrides, refs/native attrs, independent disabled slots and dynamic event freshness are covered in subsequent rounds. Icon-only labels must be provided on both relevant slots; this is not inferred from an unlabeled wrapper.

## Round 2 edges

Four unit-derived independent disabled/disabledFocusable slot cases verify native Tab semantics, Enter/Space/click silence on the disabled half and exactly one action on the other half. Icon-only primary explicit label/ref and secondary explicit label are preserved without generated labelledby; consumer labelledby points at existing text. Prevented native primary keys yield zero action while secondary still opens. Primary arrows/Home/End/Escape retain focus and generate no action/open; secondary ArrowDown opens/focuses a menu item and Escape restores. DisabledFocusable submit slots cancel all native form submits and consumer actions.

## Round 3 units/lifecycle

Styled child classes/default chevron and filtered non-native props reflect unit slot metadata. Root/primary/menu refs and native IDs/title/name/classes identify actual nodes and clear on unmount. Root onClick records both slot-first bubbling events with actual root currentTarget, not invented primary-only behavior. Null optional slots leave a functional remaining half. Same-root changes update slot children/ID/default secondary label, appearance and size. Latest child callbacks/currentTarget are checked after rerender. Menu controlled requests carry exact event/type/keyboard/open data but cannot mutate controlled open; external changes update expanded/popup without callbacks. Default-open Menu starts expanded but primary remains independent. Anchor primary retains href with native Enter callback while secondary remains a named button.

### Concrete external limitation

AccessibilitySpec.mdx mentions automatic aria-controls wiring, but current `react-menu` MenuTrigger does not generate aria-controls. The named limitation test reproduces absence both closed and open and separately verifies that consumer-supplied native aria-controls survives. The shared MenuTrigger is outside this component-only write scope; no false certification or out-of-scope fix is made.

### Tightly coupled public-ref type correction

The root-ref browser fixture exposed a TypeScript defect: inherited Button/MenuButton `onLostPointerCaptureCapture` signatures contaminated `ForwardRefComponent`'s root-element inference, rejecting `React.Ref<HTMLDivElement>` even though implementation and conformance forward the root ref to that div. The two inherited child prop sets now omit this inference-specific event, retaining the root slot's native div signature/ref type. Child slot refs are unchanged. A component-local Jest regression verifies independent root/primary/menu DOM refs, and the browser suite typecheck directly compiles the formerly rejected usage. A Beachball file is omitted because the campaign explicitly prohibits writes outside this component directory.
