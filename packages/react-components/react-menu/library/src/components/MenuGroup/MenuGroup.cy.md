# MenuGroup browser coverage

Sources: Menu's `GroupingItems` and `SelectionGroup` stories and best practices;
MenuGroup's implementation, conformance tests, explicit-labelledby test and
context-value hook test.

Scenarios verify unique group/header relationships, arrows crossing groups,
nonfocusable headers/dividers, checkbox/radio isolation and radio dismissal,
native Space/Escape and restored trigger focus, nested context boundaries,
explicit headerless naming, external label override, root refs/attributes/events,
stable ids after header updates and consumer role/style overrides.

MenuGroup supplies structure and context, not selection or navigation itself.
These composed tests check that it preserves MenuList/Menu item behavior.
Without a header, consumers should supply appropriate naming and override the
generated aria-labelledby; automatic headerless naming is not promised.

Focused Electron coverage is not exhaustive, visual or screen-reader
certification. No independent axe audit is claimed.

From `react-menu/library`, with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/MenuGroup/cypress.config.cjs
tsc --noEmit -p src/components/MenuGroup/tsconfig.cy.json
```

The local runner reuses the repository base with retries disabled and port 45163
(override WEBPACK_DEV_SERVER_PORT). React 19 JSX compatibility is local only.
