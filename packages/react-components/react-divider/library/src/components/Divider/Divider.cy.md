# Divider browser coverage

`Divider.cy.tsx` covers the finite documented prop alternatives and meaningful
source/unit contracts. It does not treat a separator as an interactive widget.
Buttons in stateful fixtures update the test harness, not Divider state.

## Inventory

- Documentation: unlabeled/labeled separators; horizontal/vertical orientation;
  start/center/end content alignment in LTR and RTL; inset with/without content in
  both orientations; all four appearances; icon/mixed custom content; custom
  width, height, font, line color, thickness and dashed line styling.
- Edges/accessibility: undefined, null, booleans, empty string, zero, nonzero number,
  whitespace, empty fragment, empty/mixed arrays; local unique label targets;
  external name/description references; icon-only explicit name; native semantic
  overrides; default Tab exclusion; custom wrapper IDs; dynamic design props and
  content add/remove transitions.
- Unit/source: native attributes, classes and refs; wrapper props/ref/render
  function and root-content precedence; wrapper shorthand without root content;
  updated wrapper IDs and explicit label precedence; latest native event handlers;
  ref cleanup/remount; fixed width/height; legacy native `color` passthrough;
  minimum-height precedence; container resize; live RTL and theme changes;
  provider custom-style hook; continuous childless line geometry; consumer-supplied
  focus/key handler; design-prop consumption.

Layout uses real root/wrapper bounding rectangles. Only painted pseudo-element
line lengths, colors and strokes use resolved browser styles because those lines
have no DOM elements or bounding rectangles. No screenshots, generated class
names, sleeps, retries, skipped tests or exception suppression are assertions.

## Accessibility fix

Previously, `wrapper={{ id: 'custom-label' }}` replaced the wrapper ID but left
the automatic `aria-labelledby` pointing at an absent generated ID.
`useDividerBase_unstable` now resolves the wrapper before constructing the root
and uses the resolved wrapper ID. Explicit root `aria-labelledby` still wins.
Cypress and unit regressions include custom IDs and ID updates.

Other existing presence semantics are deliberately preserved: only `undefined`
omits the wrapper and labeled vertical minimum; automatic labeling still uses
the truthiness of root `children`. Consequently, zero is rendered without an
automatic label and truthy empty fragments/arrays receive an empty label target.
Consumers can supply an explicit accessible name when needed. Wrapper render
functions must preserve or replace their supplied ID/ARIA relationships coherently.

The custom-style story's `maxHeight: 50` alone cannot override the existing
84px labeled vertical minimum. Coverage records that actual 84px layout and
separately verifies a successful 50px override with `minHeight: 0` and no flex
growth. This does not change the component's minimum-height contract.

## Scoped execution

This package has no inferred `e2e` target or package-level `tsconfig.cy.json`.
To keep all edits inside Divider, `Divider.cypress.config.cjs` imports the existing
repository-relative `scripts/cypress/lib-commonjs/index.cjs` shared configuration.
It changes the esbuild tsconfig to `Divider.cy.tsconfig.json`, selects this
component's spec and disables retries. The same shared support files are rebased
relative to the package's `library` directory because Cypress loads this nested
config from its own directory but resolves support paths from the project.
Webpack resolution and server configuration remain inherited. The TypeScript configuration inherits
the package's `isolatedModules: true`; no component-specific relaxation is needed.
No session adapter or `FLUENT_CYPRESS_ADAPTER`, `FLUENT_REPO`, `FLUENT_PROJECT` or
`FLUENT_SPEC` environment variable is required.

With the repository's supported Node version and dependencies available, run from
the repository root. Select an unused server port when sharing a checkout:

```powershell
$env:NX_DAEMON = 'false'
$env:WEBPACK_DEV_SERVER_PORT = '18221'
node .yarn\releases\yarn-4.18.0.cjs nx run react-divider:lint --skipSync --skip-nx-cache --excludeTaskDependencies '--command=yarn run -T cypress run --component --browser electron --config-file src\components\Divider\Divider.cypress.config.cjs'
```

The session's `run-Divider.ps1` also routes failure artifacts and logs outside the
repository. `validate-Divider.ps1` runs scoped Prettier, ESLint, TypeScript and units
through Nx. Persistent run details and limitations are in `Divider-evidence.json`
in the assigned session files directory.

The adversarial rerun used Node 22.20.0, Cypress 14.4.1 and headless Electron 130,
with port 18221 and `NX_DAEMON=false`. `FLUENT_CYPRESS_ADAPTER`, `FLUENT_REPO`,
`FLUENT_PROJECT`, `FLUENT_SPEC`, `NODE_PATH` and `TS_NODE_COMPILER` were explicitly
unset for the full browser run: all 62 cases passed with zero retries.
The first shared-config attempt failed before testing because of the nested
support-path issue described above; rebasing those paths fixed it.

Run the corresponding scoped checks from the repository root:

```powershell
node .yarn\releases\yarn-4.18.0.cjs nx run react-divider:lint --skipSync --skip-nx-cache --excludeTaskDependencies '--command=yarn run -T prettier --check src\components\Divider\Divider.cy.tsx src\components\Divider\Divider.cy.styles.ts src\components\Divider\Divider.cy.tsconfig.json src\components\Divider\Divider.cypress.config.cjs src\components\Divider\Divider.cy.md src\components\Divider\Divider.types.ts src\components\Divider\useDivider.ts src\components\Divider\Divider.test.tsx'
node .yarn\releases\yarn-4.18.0.cjs nx run react-divider:lint --skipSync --skip-nx-cache --excludeTaskDependencies '--command=yarn run -T eslint src\components\Divider\Divider.cy.tsx src\components\Divider\Divider.cy.styles.ts src\components\Divider\Divider.types.ts src\components\Divider\useDivider.ts src\components\Divider\Divider.test.tsx src\components\Divider\Divider.cypress.config.cjs'
node .yarn\releases\yarn-4.18.0.cjs nx run react-divider:lint --skipSync --skip-nx-cache --excludeTaskDependencies '--command=yarn run -T tsc --project src\components\Divider\Divider.cy.tsconfig.json --noEmit --incremental false --pretty false'
node .yarn\releases\yarn-4.18.0.cjs nx run react-divider:test --skipSync --skip-nx-cache --excludeTaskDependencies --testPathPatterns=Divider.test.tsx --runInBand
```

TypeScript currently reports two independently reproduced pre-existing
`renderFluentProvider.tsx` diagnostics (TS2741 and TS7026), with no Divider-owned
errors, including after restoring `isolatedModules: true`. A temporary
Divider-local baseline configuration including only `Divider.tsx` and the
provider entry point reproduced those same diagnostics and was removed.
No provider, shared configuration, dependency or change-file edits are
authorized here. The suite uses explicit accessibility relationships and real
Tab navigation; it is not an automated axe or screen-reader certification.
