# Link browser coverage

Sources: all seven Link stories, description/accessibility guidance, state hooks,
unit and conformance tests. Stories cover default/subtle/inline appearance,
disabled focus distinctions, default button and multiline span wrapping.

Native keyboard edges cover anchor Enter and button/span Enter/Space, tab order,
disabled/disabledFocusable suppression for all element arms and default form
non-submission. Unit-derived contracts cover element refs, role/tabIndex overrides,
attributes/classes, consumer span key handlers and rerendered state.

Span consumers supplying onKeyDown own keyboard activation. Inline underline
assertions guard current CSS, not contextual WCAG compliance. Fixture handlers
prevent anchor navigation; no cross-browser/history, axe, contrast, visual or
screen-reader certification is claimed.

From react-link/library with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/Link/cypress.config.cjs
tsc --noEmit -p src/components/Link/tsconfig.cy.json
```

Port 45177 can be overridden via WEBPACK_DEV_SERVER_PORT. Retries/screenshots
are disabled; validation-only `.stories` files reuse existing exclusions.
