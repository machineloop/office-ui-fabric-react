# BreadcrumbItem browser coverage

Sources: Breadcrumb Default/Size stories; BreadcrumbItem state, render, styles,
default snapshot and conformance tests. Real stories cover native list structure,
link/icon/current-page composition and all parent sizes.

Edges verify no wrapper tab stop, working nested activation, text/line-break
preservation, lack of fabricated current/role semantics and RTL inheritance.
Unit-derived contracts cover li refs, static/custom classes, attributes, events,
empty children and rerendered content.

BreadcrumbItem supplies a list wrapper, not navigation or current-page state;
consumers supply valid Breadcrumb/list context and child semantics. No exhaustive,
axe, contrast, visual or screen-reader certification is claimed.

From react-breadcrumb/library with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/BreadcrumbItem/cypress.config.cjs
tsc --noEmit -p src/components/BreadcrumbItem/tsconfig.cy.json
```

Electron port 45176 is overridable through WEBPACK_DEV_SERVER_PORT.
Retries/screenshots are disabled. `.stories` validation files reuse existing exclusions.
