# InfoButton browser coverage

InfoButton is the internal component in react-infolabel, not the deprecated
standalone package. Sources: InfoLabel description, default/size stories and
PatternDecision document; InfoButton implementation and conformance tests.

Documented scenarios verify click/Enter/Space opening with focus on the note,
no opening on mere focus, Escape/second-click/outside/Tab dismissal, interactive
note content and all three icon/information text sizes. Edges check resolved
label/ownership ids for inline and portalled surfaces, focus returning to the
trigger without dismissal and controlled-open rejection.

Unit-contract cases cover forwarded button/surface refs and native props, the
default non-submit button type inside a form, merged root/surface callbacks,
and updated controlled content/size.

Standalone InfoButton consumers must supply the ownership/naming pattern when
appropriate; composed InfoLabel cases verify that documented integration. No
screen-reader, axe, exhaustive visual or deprecated-package certification is
claimed. Size measurements guard the current implementation.

From `react-infolabel/library`, with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/InfoButton/cypress.config.cjs
tsc --noEmit -p src/components/InfoButton/tsconfig.cy.json
```

The explicit `.stories`-suffixed spec and JSX compatibility file reuse production
exclusions without becoming Storybook stories. Retries/screenshots are disabled;
default port 45168 can be overridden with WEBPACK_DEV_SERVER_PORT.
