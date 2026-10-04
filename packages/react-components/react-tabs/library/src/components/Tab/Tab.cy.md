# Tab browser coverage

This Tab-local finite inventory is based on the package specification, migration,
README, API report, all Tabs stories, actual Tab and TabList types, context, hooks,
rendering, styles, accessibility behavior and existing unit tests. TabList and its
tests remain read-only. Selection belongs to TabList, never to Tab itself.

## Supported inventory

- The documentation round has 85 cases. Its 72-case Cartesian matrix covers
  three sizes, four appearances, two list orientations and text, icon/text and
  explicitly named icon-only content. Each matrix case checks selected,
  unselected and disabled semantics, browser geometry, applicable typography,
  icon dimensions and regular/filled switching, indicators, circular styling,
  native button semantics and real pointer selection with exact callback data.
- Additional documentation cases cover defaults, standalone context fallback,
  repeated selection, controlled consumer acceptance/refusal, list disabling,
  consumer-owned reciprocal tab/panel ARIA references, reserveSelectedTabSpace
  alternatives, and hover/pressed appearance tokens.
- The edge round adds 31 cases plus four forced-colors cases. Real browser
  keyboard actions cover LTR/RTL, both orientations, manual/automatic selection,
  disabled skipping, wrapping, Home/End, irrelevant axes, Enter/Space, selected
  Tab entry/reentry and Tab/Shift+Tab exit. Automatic pointer focus and click are
  deliberately not deduplicated. Controlled focus requests do not change
  selection without the consumer accepting them.
- Value cases cover controlled and default `0`, `false`, empty string and `null`,
  number/string distinction, stable serializable object/array identity versus
  equal-but-distinct instances, external transitions and exact latest callbacks.
  No fixture combines selectedValue with defaultSelectedValue.
- Edge cases also cover accessible name/description precedence, icon positioning
  in RTL, consumer-owned panels, keyed value re-registration, DOM reordering,
  removal/restoration without implicit selection fallback, nested contexts,
  dynamic design/disabled/activation context, and light/dark token resolution.
- The final source-derived round adds 31 cases: native props/default button form
  behavior/explicit submit type, root/icon/content refs and cleanup, slot native
  props, static/consumer classes, inline styles and indicator variables, root
  and slot render functions, children precedence, dynamic content, current
  root/slot handlers and values, propagation/prevention, native keydown
  prevention, Tabster attribute overrides, unchanged default initialization,
  disabled-selected styling, settled indicator variables, nested keyboard
  context isolation, visible keyboard focus rings, same-cell icon/text width
  reservation, dynamic reservation, reduced motion and undefined diagnostics.

The ordinary suite contains 151 cases, with no skipped/only cases, configured
retries, sleeps, snapshots or exception suppression. Assertions use DOM roles,
accessible names, focus, callbacks, real geometry and computed styles. The ref
count case alone mounts without StrictMode to reproduce the existing unit
test's one-attachment guarantee; the other fixtures use the shared StrictMode
mount. Reservation clones must not receive the consumer's content ref.

## Inherited behavior and nominal probes

The default suite clearly characterizes, rather than endorses, click/focus
preventDefault still selecting and explicit content causing hidden reservation
even when selected or reserveSelectedTabSpace is false.

`Tab.probes.tsx` retains seven nominal assertions separately from autodiscovered
specs. They test click/focus cancellation, explicit-content reservation opt-out,
unique explicit content IDs, numeric zero content with an icon, and plain icon
and content color-class precedence. Positive controls precede the assertions.
The focus probe waits for a consumer's committed focus output, not a transient
old selected state. Ordinary class geometry/typography overrides and inline
color overrides are independently covered in the passing suite; Tab's
descendant color selectors have greater specificity than plain slot classes.

These probes express proposed/nominal contracts for independent review, not
newly supported guarantees. Do not weaken them or fix production in this task.
The Cypress configuration excludes them unless `TAB_PROBES=1` is explicitly set.
Their filename matches neither the repository's Cypress `.cy`/`.e2e` patterns
nor Jest's `.test`/`.spec` patterns; normal default CI discovery stays green.

## Execution

There is no package e2e target. `Tab.cypress.config.cjs` extends the existing,
read-only TabList configuration, reusing its support, webpack wiring and
repository-relative paths. It changes only the assigned spec and local test
tsconfig, keeps zero retries, and optionally writes per-case execution results
when `TAB_EVIDENCE_FILE` points to an explicitly chosen output file.

From the repository root, with installed supported Node/dependencies:

```powershell
$env:NX_DAEMON = 'false'
$env:WEBPACK_DEV_SERVER_PORT = '18241'
node .yarn\releases\yarn-4.18.0.cjs nx run react-tabs:lint --skipSync --skip-nx-cache --excludeTaskDependencies '--command=yarn run -T cypress run --component --browser electron --config-file src\components\Tab\Tab.cypress.config.cjs'
```

Use that same command with `$env:TAB_PROBES = '1'` for an intentional failing
probe run, then remove that environment variable before ordinary runs.
Scope prettier/eslint to these Tab additions via the same Nx command override.
Type checking uses `tsc -p src\components\Tab\Tab.cy.tsconfig.json --noEmit`;
`Tab.baseline.tsconfig.json` reproduces the provider import graph without the
browser suite. The small baseline fixture is not a Cypress/Jest spec.

Exact titles, round/final counts, commands, failure corrections, source hashes,
probe outcomes, relevant unit results and baseline type comparison are in
`coverage101-120\Tab-evidence.json` in the assigned session evidence directory.
Browser media/downloads and all logs stay there, not in the checkout.

## Limits

Actual types/stories take precedence over historical specification examples.
There is no iconPosition or verticalTabContent prop, badge/close API, alternative
native root, built-in overflow/menu or TabPanel component. The icon precedes text;
content stays horizontal even in a vertical list. Render functions customize the
supported button/span slots, not unsupported polymorphic native roots.

TabValue is typed unknown, but registration requires unique JSON-serializable
values. Strict selection identity is separate from JSON registry keys. Undefined
is tested only as diagnostic/uncontrolled characterization, not as supported
serializable or controlled state. Symbols, functions, BigInt, cycles, colliding
JSON keys and all arbitrary inputs are not claimed exhausted.

ARIA IDs, panels and their visibility are application-owned. Disabled buttons
omit aria-selected even when their value matches the selected value. A removed
selected value does not automatically select another tab. Settled animation
variables are checked, not every transient frame.

This is Electron/Chromium browser evidence, including genuine CDP forced-colors
and reduced-motion emulation, not universal browser/OS rendering, axe
certification, actual assistive-technology speech, touch input or full animation
trajectory certification. Whole-suite type checking remains subject to the
independently reproduced provider TS2741/TS7026 baseline diagnostics; that is
not represented as a fully green package type check.
