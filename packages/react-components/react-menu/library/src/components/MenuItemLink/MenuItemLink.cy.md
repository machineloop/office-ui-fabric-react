# MenuItemLink browser contracts

No pre-existing local Cypress suite. Read current component/types/hooks/base/render/styles/unit and hook-unit/conformance tests; inherited MenuItem base keyboard/mouse/character-search source; package README/Spec, Menu Description/BestPractices/index and MenuItemLinkNavigation primary story.

## Round 1 documented/source assertions

Navigation story uses real anchors with href, role=menuitem and target/rel preserved. Local same-document hashes replace external website destinations to certify actual native pointer and Enter/Space navigation without network dependence. Item clicks close once with actual event/type/bubble/keyboard envelope; native key closure restores the trigger. Arrows/Home/End/Escape focus and dismiss without activating/navigating. Linked pointer/keyboard hover focuses another link, and inherited character search reaches a matching link without clicking.

## Boundaries

Electron only, no external page loading/new-window success, pixel/forced-colors or screen-reader/cross-browser certificate. Native blank-target attributes are inspected but no external window is launched. Menu context owns controlled/default/persistence state; link has no invented selected value. Disabled/cancelled callbacks, slots/native refs/current props and state lifecycle are expanded in subsequent rounds.

### Tightly coupled production correction

Round 1 reproduced broken pointer-focus takeover and character search (4/6 passing before correction). Both link hooks replaced the inherited MenuItem internal ref with the external anchor ref, leaving internal mouse/typeahead logic unable to access the rendered node. The styled/base hooks now merge both refs while retaining actual anchor rendering. Two component-local Jest regressions verify internal pointer focus and independent consumer ref identity. Beachball is intentionally omitted because this campaign forbids writes outside the active component directory.

Round 3 typechecking exposed a second tightly coupled API defect: native HTML `content?:string` intersected the declared content slot, rejecting object slot shorthand. The public prop type now omits/reintroduces the content slot like MenuItem does, and both hooks exclude that slot from native anchor props. The formerly rejected object usage compiles; component-local Jest and browser assertions verify resolved slot content and no native RDFa content attribute. A read-only Jest probe showed no pre-existing DOM leakage in this case; the correction is for the public/type-safe native-root contract, not a falsely claimed observed runtime attribute bug.

## Round 2 exact edges

Disabled focusable anchor cancels native click/Enter/Space with no hash change, consumer click or close request. Prevented child key events similarly retain menu with zero navigation/click/request. Prevented consumer click occurs after one dismissal request, so cancels navigation but not already-requested closure; exact ordering is asserted. Parent persistOnItemClick retains menu through pointer/keyboard activations with zero close requests. Explicit name/description/shortcut slot survives without nested interactive content. Standalone native Tab/shiftTab visits links without activation.

## Round 3 units/lifecycle

Native href/target/rel/download/title/class and all declared slots (checkmark/icon/content/secondaryContent) preserve actual root/consumer refs then clear on unmount. Explicit content overrides fallback children; null optional slots omit markup. Native tabindex/role/inline styles win, and default underline resets. Current href/content/callback captures actual anchor currentTarget after rerender. Controlled close hints cannot mutate parent open; persistence/context callback updates are live. MenuTrigger submenu context opens inner menu without ancestor link dismissal; inner Escape restores category while outer stays open. DefaultOpen initializes once and does not reopen a dismissed menu when its default changes.
