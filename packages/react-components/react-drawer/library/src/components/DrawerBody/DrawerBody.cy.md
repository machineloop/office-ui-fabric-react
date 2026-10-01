# DrawerBody browser coverage

Sources: Drawer `WithScroll` story and description; DrawerBody state/render/styles
and conformance/default unit tests. Original two scrolling/content-change
regressions are retained.

Documented scenarios scroll all four header/footer combinations, verify sibling
header/footer positions stay fixed, and use native PageDown/Control+Home on a
named focusable body with no interactive children. Implementation probes exercise
all four scroll states, resize-only updates via real ResizeObserver, and
long-to-short content updates. Unit-contract scenarios cover root attributes/ref
and unmount cleanup, latest native scroll handler merged with context updates,
and conditional first/last-child padding.

Focusability and naming are consumer supplied, as documented; DrawerBody itself
does not add a role or tab stop. Pixel inset checks guard implementation tokens,
not independent visual-design certification. No screen-reader, axe, exhaustive
scroll-device or fractional-scroll certification is claimed.

From `react-drawer/library`, with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/DrawerBody/cypress.config.cjs
tsc --noEmit -p src/components/DrawerBody/tsconfig.cy.json
```

Port 45166 is configurable via WEBPACK_DEV_SERVER_PORT; retries and screenshots
are disabled. JSX compatibility is local and excluded from production using the
existing `.stories.ts` exclusion without modifying shared compiler configuration.
