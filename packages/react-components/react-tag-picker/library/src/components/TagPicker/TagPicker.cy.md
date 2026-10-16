# TagPicker browser coverage

Reverse entry still starts with a real click on the original after button, then
native Shift+Tab to the secondary action and input. A bounded retrying assertion
now observes Tabster tracking that same after button before the first key; it
does not focus the secondary action, input or a tag, or mutate mover state.
This preserves the original 58 scenarios and all reverse-entry, tag-selection,
caret-position and Backspace assertions while making the keyboard premise
explicit under load.

Sources: TagPicker description, best practices, accessibility notes and stories,
useTagPicker state/context, TagPicker and hook unit tests.

The original 32 real-event scenarios remain: popup opening/closing by input,
control and icon; selection/dismissal/clear-all; arrows/Enter/Escape/Tab; tag
navigation and Backspace with empty, nonempty and selected input; dynamic expand
labels; noPopover. Fixture labelledby values now point to real elements.

Added documented filtering and empty-result sentinel behavior, grouped labels and
cross-group selection, single-select replacement, button-only trigger, and all
three size/four appearance combinations with computed control minimum heights,
single-line selection/dismissal and full-value truncation/ellipsis/dismissal.
Edges cover already-selected option
requests, rejected controlled selection, real label/control relationships and
disabled input/icon. Unit-derived cases check explicit expand labels, keyboard
open payloads, current selection handlers/native event data and controlled open
rejection.

Popup assertions are scoped to TagPickerList because selected Tags also have
option semantics. The documented Narrator and VoiceOver limitations remain
outside this Electron regression suite; no screen-reader certification, axe
audit or exhaustive visual coverage is claimed. Single-line/truncated-text
custom CSS examples are not a pixel-level oracle.

From `react-tag-picker/library`, with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/TagPicker/cypress.config.cjs
tsc --noEmit -p src/components/TagPicker/tsconfig.cy.json
```

Port 45165 can be overridden with WEBPACK_DEV_SERVER_PORT. Retries/screenshots
are disabled. The JSX type compatibility file uses a `.stories.ts` suffix to
reuse production compiler exclusions; it is explicitly included only in the
local Cypress typecheck and is not a Storybook story.
