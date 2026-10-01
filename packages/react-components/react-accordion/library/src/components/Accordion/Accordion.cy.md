# Accordion browser contracts

Run the component-local Chrome suite from the repository root using Node 22:

```powershell
$env:WEBPACK_DEV_SERVER_PORT = '24898'
node node_modules\cypress\bin\cypress run --component --browser chrome --project packages\react-components\react-accordion\library --config-file src\components\Accordion\Accordion.cypress.config.cjs --spec packages\react-components\react-accordion\library\src\components\Accordion\Accordion.cy.stories.tsx
node node_modules\typescript\bin\tsc --project packages\react-components\react-accordion\library\src\components\Accordion\Accordion.cy.tsconfig.json --noEmit
```

The `.stories.tsx` suffix excludes browser-only dependencies from the normal
library compilation; explicit local spec discovery runs the suite in Cypress,
not Storybook. The companion ambient JSX bridge is excluded from production for
the same reason.

Coverage compares package-local Accordion stories, public props, conformance and
hook tests with browser-observable state: single/multiple and collapsible
policies, controlled requests and declined updates, defaults (including falsy
scalar values and empty arrays), identity matching, immutable inputs, native
pointer/keyboard activation, Tab and deprecated arrow navigation, RTL,
disabled and nested sections, form behavior, live props/children, event
cancellation, DOM attributes and ref cleanup.

The accessibility checks cover the rendered heading/button fixture in closed and
open states. They are not a universal accessibility, forced-colors or StrictMode
claim. Dedicated header, item and panel suites own their additional slot/style
and motion contracts.

Falsy scalar defaults remain valid item values and are normalized to an array.
An empty default remains empty when changing to multiple mode; it must not
introduce an invisible `undefined` item that changes the last-open-item policy.
