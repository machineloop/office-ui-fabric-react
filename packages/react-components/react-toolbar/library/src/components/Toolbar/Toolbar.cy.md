# Toolbar browser coverage

The suite retains the original arrow, circular, toggle, radio and divider tests.
Documented scenarios come from `stories/src/Toolbar`: default/menu, three sizes,
subtle/transparent toggles, controlled toggles/radios, tooltip, popover, separated
groups, overflow, vertical toolbar and vertical button content. Coverage checks
real focus, selection, computed spacing, and opening/closing composed surfaces.

Implementation and accessibility probes cover native Tab entry/exit and remembered
focus, RTL arrows, hidden/disabled/disabledFocusable children, native Space/Enter,
controlled rejection, named-group and nested/sibling isolation, root attributes
and refs, current handlers/values, default-state persistence, and empty selection
identifiers. Hook unit contracts in `useToolbar.test.tsx` inform root defaults,
orientation, sizing, and browser navigation checks.

This is focused Electron regression coverage, not exhaustive certification,
pixel-level visual testing, an axe audit, or screen-reader announcement testing.
Menu, Popover, Tooltip and Overflow are exercised as Toolbar compositions rather
than independently certified. Disabled ToolbarRadioButton behavior belongs to
that sibling component and is not changed here.

## Run

From `react-toolbar/library`, with the repository node_modules on NODE_PATH and
the repository TypeScript package as TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/Toolbar/cypress.config.cjs
tsc --noEmit -p src/components/Toolbar/tsconfig.cy.json
```

The portable config uses the repository Cypress base, disables retries and failure
screenshots, and sets a dedicated port (45161 by default; override with
WEBPACK_DEV_SERVER_PORT). No shared root/library configuration is modified.
