# BreadcrumbButton browser coverage

Sources: Breadcrumb Default and Size stories, BreadcrumbButton props, base hook,
styles and unit/conformance tests. Real stories exercise links, hidden decorative
icons, current-page ARIA and inherited typography in all sizes.

Edges cover native Enter/Space, tab order, disabled/disabledFocusable/current
activation suppression and anchor Enter with fixture-only navigation prevention.
Unit-derived contracts cover static classes, root/icon attributes, refs, explicit
anchor/button arms, ARIA overrides and current updates.

Overflow and Tooltip composition belong to the sibling composition suites;
this suite does not certify arbitrary consumer navigation or browser history.
Electron-only evidence is not exhaustive, axe, visual or screen-reader certification.

From react-breadcrumb/library with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/BreadcrumbButton/cypress.config.cjs
tsc --noEmit -p src/components/BreadcrumbButton/tsconfig.cy.json
```

Port 45175 is overridable with WEBPACK_DEV_SERVER_PORT. Retries/screenshots are
disabled. Validation-only `.stories` files reuse production/Jest exclusions.
