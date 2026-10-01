# DrawerHeader browser coverage

Sources: Drawer WithTitle, Separator and WithScroll stories; DrawerHeader
state/render/styles and conformance/default unit tests.

Scenarios verify structured headings and action content, header `role="none"`
without an unscoped banner landmark, native close-action behavior, real scrolling
separator visibility, every scroll-state transition and nested context isolation.
Native Tab/Space tests check no wrapper tab stop and usable actions. Unit-derived
contracts cover refs/native attributes/events/consumer role override, dynamic
children and inline styles/classes, and computed spacing/border-box layout.

Pseudo-element opacity is observed in the browser with retryable assertions,
not class-name inspection. Pixel spacing guards implementation tokens, not a
visual-design oracle. No exhaustive, axe or screen-reader certification is claimed.

From `react-drawer/library`, with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/DrawerHeader/cypress.config.cjs
tsc --noEmit -p src/components/DrawerHeader/tsconfig.cy.json
```

The `.stories`-suffixed validation files are excluded from production/Jest and are
outside Storybook's stories project. Local retries/screenshots are disabled;
port 45170 can be overridden via WEBPACK_DEV_SERVER_PORT.
