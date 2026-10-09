# ColorSlider row 134 browser coverage

## Scope and preservation

Only this component directory is authored. No production source, original unit,
inline snapshot, sibling, dependency, shared configuration, or existing baseline
Cypress assertion is changed. The canonical `ColorSlider.cy.tsx` receives one
fixture import; its remaining bytes are checked against the entry snapshot.
The original 129 partial-suite cases are retained, with 46 genuine-gap additions:
175 campaign cases plus the original five baseline cases. No commit or delegated
review is performed; initial and repeat adversarial reviews belong to the parent.

The fixture and React 19/Fluent JSX bridge live in `testing/` with `.stories`
filenames. `testing/tsconfig.json` is discovered by ordinary parent ESLint;
there is no component parser override. The direct configuration selects only the
canonical spec. Its imported hooks are scoped to the campaign `describe`, not the
original baseline suite. Default round four runs without private evidence
variables, custom Cypress tasks, or environment selection.

## Source inventory and traceability

The first adversarial review identified an unnecessarily broad story glob in
the typing baseline. Its inputs now enumerate the exact six imported ColorPicker
stories plus the explicitly imported EmptySwatch story, matching the fixture's
real dependency closure rather than coupling validation to unrelated stories.

After that correction, `checks-r4-1791169938712-47512` passes formatting,
ordinary package ESLint and both zero-diagnostic typing programs. Direct
`cypress-r4-1791170008187-37844` and ordinary
`standard-r4-1791170079479-49580` each pass 180 cases, 184 axe evaluations
and 27 CDP captures, with zero failures/errors/skips/pending/retries.
These receipts are under the ignored `.temp` directory. The fresh repeated
adversarial review reports no additional findings. Component-wide Nx inputs
intentionally include all owned ColorSlider files; they are not the removed
unrelated-story baseline glob.

Read-only inventory: all seven ColorSlider production modules (`ColorSlider`,
types, constants, index, hook, styles, render), both existing ColorSlider units,
the original Cypress suite, the public `src/ColorSlider.ts` and package index,
HSV types, picker context/defaults, picker component/types/base and full hooks,
context-values/render/styles, `constants`, `adjustChannel`, `getPercent`,
`createHsvColor`, `createHslColor`, and their existing utility units.
AlphaSlider types/hooks/render/styles demonstrate its use of ColorSlider styles.
Package TS/SWC/Jest/Cypress/ESLint configuration, shared Cypress configuration,
root target defaults, and recent ColorPicker/ColorArea integration patterns
were inspected without edits.

Stable consuming stories: ColorSliderDefault, ColorSliderChannels,
ColorPickerDefault, ColorPickerShape, ColorPickerPopup, ColorAndSwatchPicker,
and the swatch picker's EmptySwatchExample. All are mounted directly, without
replacing their labels, state, or callbacks. ColorPicker description, best
practices, story index, ColorAreaDefault and AlphaSliderDefault were also read.
The last two standalone stories do not themselves render a ColorSlider;
AlphaSlider reuses the slider style hook.

| Cases       | Contract or genuine gap                                                                                                                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1.01-R1.08 | Native range/slots/defaults; hue/saturation/value; all arrows, exact Home/End and noops; frozen controlled value; real Tab/ShiftTab, disabled input, focus indicator, forwarded input ref                                                                                         |
| R1.09-R1.10 | Explicit zero hue/saturation/value, black/transparent and white/opaque endpoints; immutable owner values; controlled without callback                                                                                                                                             |
| R2.01-R2.07 | LTR/RTL horizontal/vertical native direction, progress/thumb geometry, Page keys, real quarter clicks and out-of-bounds drag, min/max/step, fractional step, uncontrolled defaults                                                                                                |
| R2.08-R2.10 | PageUp/PageDown and endpoint noops in remaining direction/orientation combinations; native zero-step fallback; collapsed min=max input                                                                                                                                            |
| R3.01-R3.07 | All stable consuming stories, reset/value-text baseline, exact unlabeled controls/dialogs, popup Ok/Cancel/reopen, swatch selection, portaled EmptySwatch checkpoint                                                                                                              |
| R3.08-R3.21 | Picker ownership and peers/area/alpha, explicit child overrides, slot/public callback ordering and prevention, native props/slots/labels/generated IDs, form participation, focus/blur/input, base/full hooks, shape precedence                                                   |
| R3.22-R3.26 | Fresh slot/public closures and callback/event/color identity, native DOM persistence, external form ownership/disabled/unnamed controls, context replacement, form reset, slot-disabled override                                                                                  |
| R4.01-R4.09 | Actual painted channel gradients and live thumb/color updates; dark theme; real CDP forced colors; alpha normalization; provider custom style hook/CSS sizing; rerenders; floating-point duplicate callback baseline                                                              |
| R4.10-R4.17 | Exact public subpath export identities/constants/classes, stable hook callback identity with latest channel/color/handler, orientation/ref persistence, slot ref precedence, supported CSS progress/direction override, lower/upper numeric bounds, exported unstyled base render |

Round counts are fixed, cumulative, unique and reconciled against actual raw
JUnit `name` and `classname` attributes and suite/root counters:

| Round       | Campaign | Original baseline | Total | Axe evaluations | CDP PNG captures |
| ----------- | -------: | ----------------: | ----: | --------------: | ---------------: |
| 1           |       37 |                 5 |    42 |              37 |                0 |
| 2           |       97 |                 5 |   102 |              97 |                0 |
| 3           |      134 |                 5 |   139 |             135 |                0 |
| 4 (default) |      175 |                 5 |   180 |             184 |               27 |

Every campaign title has exactly one final full-scope audit. Nine additional
checkpoints comprise one EmptySwatch open-popup audit and two intermediate
channel audits for each of four forced-color direction/orientation cases.
All 27 captures have three independently calculated RGB sample expectations,
an opaque alpha assertion and a per-channel tolerance of four: 81 pixel samples.
These comprise 12 regular gradients, three dark-theme gradients, and 12 real
forced-color gradients. PNGs come from actual `Page.captureScreenshot`, decoded
in-browser, not synthetic CSS output. `Emulation.setEmulatedMedia` and
`matchMedia('(forced-colors: active)')` verify actual forced-colors activation.

## Accessibility evidence and preserved limitations

`cy.writeFile` creates a unique ignored evidence directory per run. Each audit
retains complete axe passes, violations, incompletes, inapplicables, check data,
targets/HTML and metadata; only live DOM references are removed for serialization.
The full fixture plus every PopoverSurface is audited, including controls outside
the active modal. Passes must be nonempty. Exact title sets, checkpoint/pixel
multiplicities, zero retries, raw JUnit failures/errors/skips/pending and recursive
source hashes are checked fail-closed.

Known profiles are predeclared, never derived from observed findings. Unknown
or duplicate rules fail; each known finding verifies exact element identity,
target, node count, role/type/name, and failure/check details. Known Tabster
focus redirection permits only the two enumerated sentinel rule profiles.
This is honest baseline coverage, not a claim that stable stories are axe-clean:

- Channels has three unnamed ColorSlider inputs; Shape's second picker has four
  unnamed ranges. EmptySwatch's popup has four unnamed ranges and an unnamed
  modal dialog; ordinary Popup has an unnamed modal dialog.
- Tabster Mover/Modalizer sentinels can produce exact `aria-hidden-focus`
  findings or `focusable-modal-open` incompletes. EmptySwatch's open checkpoint
  checks four sentinel incompletes, plus exact contrast `bgOverlap` incompletes
  for the two obscured add/reset buttons. No unknown incomplete is accepted.
- Vertical RTL native input direction is flipped by Griffel while thumb progress
  remains bottom-based. Vertical saturation/value gradients remain horizontal.
- Uncontrolled callbacks spread the absent/context HSV color rather than the
  stored current color, resetting unmodified channels to utility defaults.
- Native min/max sanitization does not normalize channel-based CSS progress.
  Numeric saturation/value above one use the hook's hue-default clamp and can
  place the visual thumb beyond the rail while native input caps at 100.
- Default story Reset leaves hue value text stale; Popup Cancel preserves its
  preview state for reopen. Controlled saturation 0.55 with step five produces
  the explicitly checked input/change duplicate callback.
- Supported CSS overrides can intentionally detach visual progress from native
  value. An input slot ref overrides, rather than composes with, the forwarded
  ref. Native form reset does not request an HSV owner update.

None of these production/story limitations is repaired or hidden here.

## Mutation helper diagnostics

The rail-render trial executed all 180 cases with zero skips: 30 assertion
failures and 103 null-rail geometry TypeErrors, all at the common geometry
helper. Required root, rail, thumb, input collections and refs are now asserted
before coupled geometry, style, evidence or focus reads. The typed nonnull
assertion uses callable Cypress `expect`, without static `expect.fail`.
All original geometry math and tolerances, gradients, channel checks, audit
classifiers, cleanup hooks and 180 scenario titles remain unchanged. These
guards diagnose missing required slots as assertion failures; they do not
provide optional fallbacks or alter production rendering.

## Commands and receipts

From the repository root, use the existing Node 18 for direct Chrome and units:

```powershell
$component = 'packages\react-components\react-color-picker\library\src\components\ColorSlider'
node "$component\ColorSlider.run.cjs" cypress 1
node "$component\ColorSlider.run.cjs" cypress 2
node "$component\ColorSlider.run.cjs" cypress 3
node "$component\ColorSlider.run.cjs" cypress
node "$component\ColorSlider.run.cjs" units
node "$component\testing\ColorSlider.verify.cjs" isolation
node "$component\testing\ColorSlider.verify.cjs" invalid
node "$component\ColorSlider.run.cjs" preserve
```

The ordinary ESM package config, lint and Nx use the installed Node 22, with
child Node PATH prepended by the runner/verifier:

```powershell
$node22 = 'C:\Users\jabrassi\.scout-instances\local-test\copilot\session-state\e2e8f1b0-53a4-4784-81a2-ee19461b7b31\files\runtime\node-v22.20.0-win-x64\node.exe'
& $node22 "$component\ColorSlider.run.cjs" standard
& $node22 "$component\ColorSlider.run.cjs" checks
& $node22 "$component\testing\ColorSlider.verify.cjs" discovery
& $node22 "$component\testing\ColorSlider.verify.cjs" sync
& $node22 "$component\testing\ColorSlider.verify.cjs" registered
```

`standard` invokes unchanged package `cypress.config.ts`, selecting the canonical
spec, not a substitute executor/config. `checks` runs Prettier, unchanged parent
ESLint and current/baseline discoverable TypeScript programs. Both programs have
zero diagnostics and use the identical JSX bridge; the actual program inventory
is retained, not misrepresented as equal source-file sets. The original units
run from the library working directory with unchanged parent Jest transforms:
30 passing tests, one matching untouched inline snapshot.

Receipts are unique `.temp/<mode>-<time>-<pid>` directories, with command/log,
source-before/source-after, raw JUnit and exact manifests/summaries. Historical
`reports/` and all failed attempts remain intact and are not acceptance receipts.
Entry preservation is `.temp/row134-entry-1791167008961`, including exact original
suite/baseline/unit bytes and the shared-checkout dirty/source hashes.
Actual TS program inventory is
`.temp/program-and-preserved-cases-1791168726342/program-comparison.json`:
current 2623 source files, baseline 2561, same single bridge and bridge hash;
65 current-only and three baseline-only files are explicitly reported.

Observed runtime acceptance before the final sealed-source rerun:
direct round four `.temp/cypress-r4-1791168397626-27076` and ordinary package
`.temp/standard-r4-1791168500333-37068`, each 180 passing, 184 axe evaluations,
27 captures, no failures/errors/skips/pending/retries. Final source-bound reruns
have their own unique summaries; the latest passing mode receipts, not a
historical filename, are the authoritative review inputs.

## Registered CI and producer isolation

`testing/ci/project.json` registers `colorslider-functional-tests` as a nested
application, with `vNext`, `platform:web`, `test` tags and implicit dependency on
`react-color-picker`. Ordinary root e2e defaults retain `scripts-cypress:build`;
type-check explicitly retains that prerequisite. No empty dependsOn override,
parent cycle, private environment or exec-surrogate bypass is used.

Real Nx source-only and fixture-only affected selection includes this
application. The actual Nx file map assigns fixture ownership to the parent
library and nested project configuration ownership to the application.
Real production TypeScript roots and transitive program contain exactly seven
ColorSlider production modules. The actual unchanged SWC producer emits those
seven JS modules and seven maps and zero fixtures, including no bridge module.

Cold registered e2e/type-check are **blocked**, not green. The retained
`eslint-plugin-react-components:build` and `scripts-cypress:build` prerequisites
reach the shared generate-api executor's unquoted Windows root path and fail
with `TS5023: Unknown compiler option '-'`. Actual failed commands/logs are in
`.temp/registered-1791168579093-10444`; both exit 130, both reproduce the path
failure. A prior attempt missing local `.bin` on PATH is retained separately;
no dependency was installed. Sync dry-run proposes only `tsconfig.base.json`
formatting and leaves it untouched. `--skipSync` is used only for the documented
cold attempt, with helper dependencies retained, not as a cold-green claim.

Strict global preservation compares HEAD, branch, outside status and original
file hashes. Concurrent changes cause a failing receipt and must be reported,
never reverted. All per-run authored/production/testing/CI bytes are also
recursively compared before/after verification. No row 135 work is included.
