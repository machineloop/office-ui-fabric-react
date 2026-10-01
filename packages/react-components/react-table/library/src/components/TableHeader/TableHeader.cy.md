# TableHeader browser coverage

Sources: Table Default, NonNativeElements and Sort stories; TableHeader
implementation, native/non-native and conformance unit tests.

Scenarios verify native thead/row/th composition and column labels, div rowgroup
with non-native row/columnheader semantics and layout, actual sorted data/ARIA
state after pointer and native Enter activation, descendant tab order without a
header tab stop, context switching in both directions, explicit root overrides,
native refs/attributes/classes/events and current handlers after content updates.

The explicit `as="thead"` regression exposed a precedence error choosing div
semantics for any truthy `as`. Root resolution now gives the explicit root
precedence over the context fallback; a corresponding focused unit test is added.

The default story's misspelled `arial-label` is outside this component directory
and is not corrected or treated as accessible table naming. Existing sibling
TableCell/TableHeaderCell changes in the shared checkout are preserved.
The suite exercises descendants as integration partners, not independent
certification. No exhaustive visual, axe or screen-reader claims are made.

From `react-table/library`, with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/TableHeader/cypress.config.cjs
tsc --noEmit -p src/components/TableHeader/tsconfig.cy.json
```

The explicit `.stories` files reuse production exclusions and are outside the
stories project/Jest discovery. Retries/screenshots are disabled; port 45169
can be overridden via WEBPACK_DEV_SERVER_PORT.
