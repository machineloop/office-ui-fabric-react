# CounterBadge browser coverage

This suite owns CounterBadge behavior, not the sibling Badge suite's 576-cell
appearance/color/size/shape matrix. Existing source, unit tests, and snapshots
remain unchanged.

## Finite inventory

- 54 documentation cases: default hidden zero and visible styling; the complete
  40-cell count `{-1, 0, 1, 99, 100}` x overflow `{0, 99}` x showZero x dot
  matrix (40 separately registered Cypress cases, one cell per case); and 12
  size/shape cases containing 480 counter-specific cells in internal loops
  (six sizes, two shapes, two appearances, four supported colors, five modes).
  Those 480 cells are not 480 Cypress tests and are not added to the suite total.
  Modes are ordinary count, overflow, hidden zero, shown zero, and dot.
- 74 edge/accessibility cases: 22 finite numeric formatting boundaries; 21
  children/override cases; six icon ordering/spacing cases; a 15-step live prop
  transition sequence; four light/dark and LTR/RTL cases including actual
  generated-text/icon geometry; four naming, description, consumer-owned live
  attributes, offscreen styling, and positive-control axe cases; and 16 active
  forced-color counter/dot cases.
- 11 source/unit-derived cases: native attributes/property filtering and refs,
  slot render functions, real focus/keyboard/pointer events and latest handlers,
  ref unmount/remount, passive behavior, consumer class precedence, scoped style
  hooks and theme/direction, two dynamic visual/icon sequences, two headless
  hook-state checks, and the inherited pointer-overlay characterization.

The final runner inventory is 139 separate Cypress cases (54 + 74 + 11),
including three explicitly named inherited-defect characterizations. The 40
count-matrix cells and 480 variant-matrix cells describe coverage, not extra
tests. The separate Jest result is 40 unit tests across two suites, not matrix
cells or additional Cypress cases.

Numeric formatting follows the actual finite-number string conversion and
strict `count > overflowCount` comparison. Fractions are not rounded or
localized. Negative and fractional inputs are source characterizations, not
new product recommendations. No NaN/infinity contract, exhaustive real-number
claim, arbitrary inherited colors, or interactive/uncontrolled counter API is
invented. The color story prose lists additional Badge colors, but
CounterBadge's types and story examples support only brand, danger, important,
and informative.

## Retained defects and limitations

Three explicitly named characterization cases record existing behavior, not
correct/intended product contracts:

- Numeric children `0` with count `7` are replaced by generated `"7"`.
- Numeric children `0` with default zero count remain in the DOM but are hidden.
- The filled Badge border pseudo-element intercepts pointer clicks aimed at
  the icon; the root handler receives the click and the icon handler does not.
  A ghost counter is the positive control for normal icon-to-root bubbling.

The two zero-child cases were deliberately changed from failing correctness
probes to passing inherited-defect characterizations, not corrected product
behavior. In `edges-sensitive-corrected`, `children={0}, count={7}` originally
expected text `"0"` and visible `inline-flex`; it failed with actual text `"7"`.
The final characterization asserts `"7"` and visible `inline-flex`.
For `children={0}, count={0}`, the probe originally expected text `"0"` and
visible `inline-flex`; text survived, but visibility failed with actual
`display: none`. The final characterization asserts text `"0"`, `display: none`,
and no layout height. The unchanged source's `!state.root.children` checks
cause generation to replace numeric zero in `useCounterBadgeBase_unstable`
and hide numeric zero in `useCounterBadgeStyles_unstable`.

The explicit `testCorrections` entry `zero-child-correctness-to-characterization`
in the external evidence report links both original failed case names,
expected/observed values, assertion errors, the retained probe snapshot,
results, log and failure screenshots to the final named cases and run results.
That sensitive run remains recorded as 119 cases, 108 passes and 11 failures;
two failures are these supported numeric-zero-child correctness probes.
The final 139/139 result proves the final assertions pass, not that those
supported nominal failures or the pointer defect were fixed.

Sensitive failing assertions, screenshots, exact executed case inventories,
commands, per-round results, and source/baseline hashes are retained in the
assignment's external `CounterBadge-evidence.json` and adjacent artifacts.
Production fixes require a separate decision; no production source is changed.

CounterBadge adds no role, focus stop, live region, or automatic announcement.
Owning controls and consumers provide naming, descriptions, and optional
status/live attributes. DOM accessible-name computation and axe are checked;
actual assistive-technology speech is not claimed. Forced colors use Chromium
media emulation with cleanup after each case, not an OS-wide mode change.

The scoped TypeScript command imports repository dependencies. Two existing
FluentProvider renderer diagnostics are independently reproduced without this
suite; a zero-owned-diagnostic result is not a green whole-package type check.

## Portable commands

Run from the repository root with installed dependencies. The package has no
e2e target, so commands use its existing Nx run-command override:

```sh
yarn nx run react-badge:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T cypress run --component --browser electron --project . --config-file src/components/CounterBadge/CounterBadge.cy.config.cjs"
yarn nx run react-badge:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T eslint src/components/CounterBadge/CounterBadge.cy.tsx src/components/CounterBadge/CounterBadge.cy.styles.ts src/components/CounterBadge/CounterBadge.cy.config.cjs"
yarn nx run react-badge:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T prettier --check src/components/CounterBadge/CounterBadge.cy.tsx src/components/CounterBadge/CounterBadge.cy.styles.ts src/components/CounterBadge/CounterBadge.cy.config.cjs src/components/CounterBadge/CounterBadge.cy.tsconfig.json src/components/CounterBadge/CounterBadge.cy.md"
yarn nx run react-badge:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T tsc --noEmit --pretty false -p src/components/CounterBadge/CounterBadge.cy.tsconfig.json"
yarn nx run react-badge:test --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T jest --runInBand --runTestsByPath src/components/CounterBadge/CounterBadge.test.tsx src/components/Badge/Badge.test.tsx"
```

For the assignment, set `WEBPACK_DEV_SERVER_PORT=18241` and redirect Cypress
screenshots/videos/downloads to the external evidence directory. The config
has no machine paths and discovers only this exact component spec. Retries are
disabled; the suite has no sleeps, skipped cases, broad exception suppression,
snapshot-based functional claims, or shared tooling changes.
