# RadioGroup browser coverage

Sources: RadioGroup documentation, layout/default/controlled/disabled/required/
label-subtext stories, and RadioGroup unit and conformance contracts.

Documented scenarios cover layout, exclusive selection, controlled clearing,
disabled inputs, Field naming/required state and formatted labels. Keyboard
edges exercise native arrow wraparound, disabled skipping, one tab stop and
reverse tabbing in all layouts, rejected controlled changes, native validation,
non-radio event filtering and description overrides.

Unit-derived scenarios cover isolated generated names, explicit names,
individual checked state, defaultValue versus value updates, root refs,
prop filtering, attributes, classes and Field validation descriptions.

The local hook now opts into Field required propagation, as promised by the
Field contract and existing unit test. No unrelated control implementation is
changed. Electron native keyboard evidence is not cross-browser or screen-reader
certification; no axe, contrast or exhaustive visual audit is claimed.

From react-radio/library with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/RadioGroup/cypress.config.cjs
tsc --noEmit -p src/components/RadioGroup/tsconfig.cy.json
```

Port 45174 is overridable through WEBPACK_DEV_SERVER_PORT. Retries and failure
screenshots are disabled. Validation-only `.stories` files reuse production
exclusions and are not part of the Storybook stories project.
