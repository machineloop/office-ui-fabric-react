# TagPickerOption browser coverage

Sources: TagPicker Default, Filtering, Grouped and Button rich-option compositions;
TagPickerOption slot documentation, implementation/styles and conformance/default
unit tests. The suite mounts real TagPicker context instead of testing isolated
option markup only.

Scenarios cover pointer selection/value payloads and input focus restoration,
rich display text with explicit type-to-find text, media/secondary layout,
native active-descendant arrows/Enter, already-selected idempotence without
checkbox decoration, Escape cancellation, root refs/attributes/events,
slot shorthand/null omission, and updated registered text/value/current callbacks.

TagPickerOption exposes option semantics; it does not expose a `disabled` prop.
Consumer-provided checked attributes are not treated as built-in selection UI.
Media/grid/font measurements guard current implementation, not an independent
design oracle. No exhaustive, axe or screen-reader certification is claimed.

From `react-tag-picker/library`, with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/TagPickerOption/cypress.config.cjs
tsc --noEmit -p src/components/TagPickerOption/tsconfig.cy.json
```

Explicit `.stories` validation files reuse production/Jest exclusions and are
outside the Storybook stories project. Local retries/screenshots are disabled;
port 45172 can be overridden via WEBPACK_DEV_SERVER_PORT.
