# DrawerHeaderTitle browser coverage

Sources: Drawer WithTitle story and DrawerHeaderTitle slot documentation;
state/render/styles and default/action/conformance unit tests.

Scenarios verify default h2 and custom h1 headings in the documented composition,
action placement and native activation, all six native heading levels,
consumer-provided div heading role/level, OverlayDrawer dialog-title naming,
RTL mirrored action placement and no wrapper tab stop.

Unit-derived cases cover root/heading refs and native slot attributes, heading
slot content overriding root children, null optional slots, and updated content,
classes and latest bubbled events. Action alignment follows the inherited
DialogTitle action slot's start alignment; arbitrary native button internals
are not promised to be vertically centered.

Pixel bounds guard present implementation layout, not an independent visual
oracle. No exhaustive, axe or screen-reader certification is claimed.

From `react-drawer/library`, with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/DrawerHeaderTitle/cypress.config.cjs
tsc --noEmit -p src/components/DrawerHeaderTitle/tsconfig.cy.json
```

Explicit `.stories` validation files reuse production/Jest exclusions and are
outside Storybook's stories project. Retries/screenshots are disabled; port
45171 can be overridden via WEBPACK_DEV_SERVER_PORT.
