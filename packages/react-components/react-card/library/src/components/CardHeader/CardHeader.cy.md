# CardHeader browser contracts

No existing component-local Cypress cases. Passive header composition is tested through the current shared-source/Nx harness in Electron only, with no retries/skips/arbitrary sleeps and no universal/pixel/screen-reader certification.

Read component API/hooks/render/styles/unit/conformance, parent selectable reference/checkbox integration; package README/Spec and stories README; CardHeader Default/index/Description, Card Default/Action/Selectable/BestPractices modules and related header usage inventory.

## Round 1 source → assertions

- Eight CardHeader Default combinations preserve header, optional image/description/action. Actual image polymorphic IMG/alt, grid versus flex layout and description column are checked; passive root adds no role or Tab stop. Native Tab reaches only a supplied action; Enter callback or zero callbacks when absent, then exits.
- README/Card Default img-as-child preserves wrapper/alt and image/header/description DOM order.
- CardAction heading/link composition: native Enter on title link, Tab to action, Space activation and reverse Tab provide independent usable action callbacks.
- CardSelectable header resolves actual checkbox labelledby target and native Space selects once.

Root is not an action, controlled state or disabled component. Action/links own keyboard behavior; no invented arrows/Home/End/Escape actions for a passive header. Image requests use local data URLs instead of CDN assets, with no image decoding or pixel claim. Dynamic label reference/slot omission/native props/refs are covered in later rounds.

## Round 2 exact edges

Header-slot explicit ID naming wins over identified child; direct identified heading child supplies label without competing wrapper ID; first identified child in a direct child list wins. Two independent selectable cards have unique real naming targets. Null optional slots are omitted but undefined header defaults to an empty wrapper. Disabled action is skipped by native Tab and invokes no pointer callback. Child native key cancellation invokes neither child nor header click; explicit pointer action with stopPropagation invokes only the child.

### Tightly coupled naming correction

Round 2 reproduced a local reference precedence bug: after parent context rerender, `hasChildId` caused the explicit header slot ID to be ignored, contrary to `getReferenceId` precedence. The effect now resolves the explicit shorthand ID before considering the internal DOM/ref fallback. A component-local Jest regression and the browser test assert the stable explicit ID relationship. A Beachball file is omitted because this campaign explicitly forbids writes outside the active directory.

Round 3 then reproduced stale title-child reference state when changing plain text to an identified child. Child-ID presence is now derived from the current resolved header during render instead of a delayed ref mutated in an effect. Generated wrapper IDs are omitted exactly when the current identified child supplies the label, and restored when it is removed. A second Jest regression and native browser lifecycle test verify both transitions retain real current naming targets.

## Round 3 units/lifecycle

Native root/all slot props/classes and object/callback refs identify the actual nodes then clear on removal. Current child action bubbles to current header handler with exact currentTarget/order. Dynamic identified title → plain text retains a resolved checkbox naming target; adding/removing description/action preserves root identity and grid/flex layout. Consumer CSS gap/root/slot styles override defaults. Slot render function forwards native props/ref and preserves real heading semantics. Conformance/snapshot evidence stays focused Jest, not browser/pixel snapshots.
