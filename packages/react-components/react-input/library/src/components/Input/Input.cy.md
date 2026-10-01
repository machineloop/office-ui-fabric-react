# Input browser contract

`Input.cy.tsx` adds 181 finite browser cases without changing production code,
unit tests, shared helpers, dependencies, or project targets. The current types,
hooks and styles take precedence over historical proposals in `docs/Spec*.md`.

| Inventory               | Cases | Observable coverage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation/story/API |    38 | Six appearances (including two deprecated shadow appearances) by three sizes; all twelve supported types and form serialization; default DOM, placeholder, inline placement, prefix/suffix, controlled limit, fixed controlled text, uncontrolled defaults, exact input/change payloads and native password masking                                                                                                                                                                                                                                                                                                                                                   |
| Edges/accessibility     |    83 | Disabled appearance/size matrix; readonly selection; independent slot actions and tab order; real caret/edit keys; native props and ref precedence; event bubbling/handler precedence; length, pattern, email/multiple, URL and numeric validity; temporal range/step API controls; form association, successful controls and reset boundary; Field states, names, descriptions and live prop updates; direction/size/slot geometry matrix; dynamic light/dark themes                                                                                                                                                                                                 |
| Unit/source-derived     |    60 | Value boundaries and precedence; latest/removed handlers; prop updates without user changes; optional slots and custom span renderers; lifecycle and dynamic slots/states; synthetic composition boundaries and programmatic input/change explicitly distinguished from trusted input; exact aria-invalid styling; provider overrides/style hook; shared native-filtering limits; controlled/cancelled reset and validation bypass; consumer password reveal; malformed temporal/number serialization; direct SVG sizing; sibling Field isolation; prevented keys, autofocus/tabindex, fractional number step, implicit Enter submit and real selection notifications |

The tests reuse the shared strict-mode mount and `cypress-real-events` support
read-only. Real typing, clicks, hover and key presses use browser input commands;
direct value setters, constraint APIs and dispatched events are named explicitly
as programmatic/synthetic checks, never as real user entry.

## Portable component-local runner

There is no `react-input:e2e` target. Run the existing Nx command executor with a
component-local config (no shared configuration edits):

```powershell
yarn nx run react-input:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T cypress run --component --browser electron --config-file src\components\Input\Input.cypress.config.cjs"
yarn nx run react-input:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T eslint src\components\Input\Input.cy.tsx src\components\Input\Input.cypress.config.cjs"
yarn nx run react-input:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T tsc -p src\components\Input\Input.cy.tsconfig.json --pretty false"
```

The config resolves paths relative to itself and uses the existing Cypress
webpack/support configuration. `WEBPACK_DEV_SERVER_PORT` defaults to 18221.
Set `FLUENT_INPUT_ARTIFACTS` to an absolute evidence directory to keep failed-test
screenshots outside the checkout. Cypress retries are zero.

## Boundaries and existing limitations

- Uncontrolled Input is internally rendered with a React-controlled `value`.
  Native form reset retains its latest committed value, unlike a plain native
  uncontrolled input which restores its initial default. The suite demonstrates
  both controls rather than claiming native initial-default reset support. A
  controlled consumer can explicitly handle `onReset`. Cancellation and fixed
  controlled reset are covered separately. No reset behavior change is introduced.
- The shared `react-utilities` native property whitelist drops top-level
  `enterKeyHint` and `onInvalid`. Slot-level equivalents work and have positive
  controls. This shared defect is outside the authorized Input directory.
- Input slots override top-level native props/refs; arbitrary handler/ref merging
  is not automatic. The Input hook intentionally replaces slot `onChange` with
  the top-level two-argument `onChange` contract. Root bubbling and native slot
  handler precedence are tested independently.
- Composition event forwarding and synthetic composing input are covered, not
  a complete operating-system IME session, candidate UI or keyboard layout.
- Calendar types have browser-native UI. Valid and malformed values, native
  serialization and programmatic min/max/step checks are covered; platform
  picker interaction is not. Native email/URL/text/password/search/tel editing
  and numeric arrow stepping do use real browser input.
- Autocomplete, inputmode, spellcheck and related native attributes are checked
  for forwarding, not browser autofill, password-manager or mobile-keyboard UI.
  Only applicable type-specific constraints are asserted.
- Accessible names/descriptions, DOM roles, labels, focus and alert relationships
  are verified; actual screen-reader announcements, OS forced colors, reduced
  motion and pixel-level contrast are not. Filled backgrounds need an appropriate
  consumer surface; this suite does not certify all surface contrast combinations.
- Bookends, multiline, masking and built-in reveal/clear controls are deferred
  proposals, not current Input contracts. Infinite text/prop combinations and
  browser/OS matrices are not claimed exhausted.

Session-local `Input-evidence.json` records exact commands, every case title,
round counts, failures and their dispositions, and independent baseline type
diagnostics. Provider TS2741/TS7026 diagnostics must not be mistaken for suite
errors or suppressed with altered shared types.
