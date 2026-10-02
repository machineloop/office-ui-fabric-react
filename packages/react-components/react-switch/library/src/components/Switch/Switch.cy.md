# Switch browser mutation coverage

The suite preserves all 53 original cases and adds four first-enable notification
regressions: controlled and uncontrolled modes, each initially checked or unchecked.
Controlled fixtures pass only `checked`; uncontrolled fixtures pass
`checked={undefined}` and `defaultChecked`. No fixture combines a controlled value
with a default.

Direct input and associated-label clicks, Space, and Enter must leave a
disabled-focusable input focusable and unchanged, without invoking either change
handler. An independently enabled Switch proves that activation and change
notifications work while the target is blocked. After enabling the target, the
very first click must notify the latest input-slot handler before the component
handler, with exact native checked snapshots and `{ checked }` data. The next
label activation must notify again with the opposite value.

The original dynamic test re-enabled an unchecked input. A memory-only mutant
that omitted tracker resynchronization only for checked inputs survived it.
The new initially checked uncontrolled fixture reaches that missing branch and
asserts notifications, not merely the correctly toggled DOM. Controlled fixtures
also verify accepted state changes without relying on uncontrolled behavior.

Native form-reset cases remain characterizations of the known React checkbox
boundary, with plain native sibling controls. This campaign adds no reset listener,
production fix, or claim of post-reset callback correctness.

Only these Cypress tests and notes are candidates for parent review. The campaign
uses a pinned detached isolated worktree; the parent must review and rerun on
current shared master before transferring either file.
