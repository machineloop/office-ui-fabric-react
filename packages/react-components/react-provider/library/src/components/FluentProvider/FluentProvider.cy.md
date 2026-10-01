# FluentProvider browser coverage

Sources: Provider Description and Default, Nested, Dir, Frame and
ApplyStylesToPortals stories; state/render/theme-style implementation and unit
contracts for themes, overrides, custom styles, style tags and prefix handling.

Coverage verifies four standard themes and computed typography, partial-theme
inheritance without parent mutation, both directions and nested inheritance,
portal class propagation enabled/disabled (theme variables remain in either
case), and actual iframe targetDocument style injection. Dynamic theme/direction,
stable single-rule style ids, unmount stylesheet/ref cleanup and native keyboard
activation probe browser lifecycle/accessibility edges.

Unit-derived regressions check merged descendant context, native root props and
events, unique style tags in head (not body), nested custom hooks used by Buttons,
and nested default-appearance overrides consumed by Inputs.

Browser prefix tests exposed invalid CSS selector construction for special
identifier-prefix characters. Theme and diagnostic selectors now use the target
window's CSS.escape when available. SSR's existing style-tag escaping is
preserved; this browser suite does not certify arbitrary-prefix hydration or SSR.

No exhaustive, axe, screen-reader or visual-design certification is claimed.
Hydration, server markup/nonces and multi-bundle id collision diagnostics remain
covered by the existing unit suites rather than simulated as browser scenarios.

From `react-provider/library`, with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/FluentProvider/cypress.config.cjs
tsc --noEmit -p src/components/FluentProvider/tsconfig.cy.json
```

The spec and JSX compatibility file use the existing `.stories` production
exclusion but are not Storybook stories (they are outside its stories project).
Local runner retries/screenshots are disabled; default port 45167 can be
overridden via WEBPACK_DEV_SERVER_PORT.
