# ONLY132 ColorArea Cypress traceability

## Modal audit and fixture handoff

Before the unchanged Popup audit, a bounded retrying assertion observes both
original modal sentinels in their existing tabbable state. The 32-worker sweep
exposed a timing-sensitive Popup audit: the modal sentinels appeared in an
`aria-hidden-focus` incomplete instead of the required violation. Its failed
verdict prevented the already-required real Ok close and caused later exposure
checks to fail. This does not prove pre-insertion timing, and the current green
receipts establish single-worker warm Nx overrides, not renewed 32-worker or
cold/default-target acceptance. This readiness check does not insert sentinels, change focus or
attributes, weaken the exact known findings, or move the audit after dismissal.

The Popup scenario still reopens the selected color and receives its original
full open-modal audit, including the exact known dialog/sentinel findings. Only
after that audit succeeds, the test uses the story's real Ok action to close the
Popup and checks that the retained fixture is no longer accessibility-hidden or
inert before its provider can be unmounted.

Other scenarios require an exposed, visible, nonempty fixture before their
unchanged full audit. This prevents an accessibility-hidden mount ancestor from
turning meaningful rule coverage into near-empty apparent success. No attributes
are removed by the test, no findings are filtered, and all 103 cases, 96 audits,
existing classifications and retry-zero checks remain. The handoff verdict is in
the Popup test body, not a Mocha hook that could skip subsequent scenarios.

## Scope and execution

All authored files, configuration, temporary files, screenshots and reports are confined to this `ColorArea` directory. The checked-in `ColorArea.cy.tsx` gains only an import of `testing/ColorArea.cy.stories`; all seven original test bodies and assertions are unchanged. Implementation, unit tests, published stories, dependency manifests and shared configuration are untouched. No commit or delegated review is performed.

The suite runs the **7 existing baseline cases plus 96 new cases**, for **103 total**. Each new case receives a full default-rule axe audit of its fixture; open popup surfaces are included even though they are portalled. No rules are disabled. Unexpected violations and every incomplete fail. Cypress retries are disabled, and the runner checks exact cumulative counts, unique test names, zero failures/skips and one audit per new case.

From the Windows checkout root:

```powershell
$runner = 'packages\react-components\react-color-picker\library\src\components\ColorArea\ColorArea.run.cjs'
$receipt = 'integration-' + (Get-Date -Format yyyyMMddHHmmss)
node $runner snapshot $receipt
node $runner format
node $runner checks
node $runner cypress
# Optional cumulative historical rounds:
node $runner cypress 1
node $runner cypress 2
node $runner cypress 3
# Node 22 is required by the existing ordinary package ESM configuration.
$node22 = 'C:\Users\jabrassi\.scout-instances\local-test\copilot\session-state\e2e8f1b0-53a4-4784-81a2-ee19461b7b31\files\runtime\node-v22.20.0-win-x64\node.exe'
$env:PATH = "$(Split-Path $node22);$env:PATH"
& $node22 $runner standard
& $node22 $runner preserve $receipt
```

Both browser modes default to the complete fourth round without private environment variables. Only the exact optional rounds `1`, `2`, `3`, `4` are accepted; malformed rounds fail before execution. Each invocation creates an ignored `.temp/<mode>-r<round>-<timestamp>-<pid>` directory, raw JUnit, commands, recursive source-before/source-after hashes (including `testing/ci`), and a validated summary. Original `reports/` and historical screenshots are never overwritten. Source hashes must match after non-format validations.

The sole ordinary Cypress-discovered entry point is `ColorArea.cy.tsx`. The imported story fixture registers its own suite-scoped audit and CDP hooks, so the seven baseline cases do not accidentally receive fixture-only audits. Non-test fixtures and JSX declarations live under `testing/`, excluded by the actual package SWC `/testing` rule and TypeScript story exclusions. `testing/tsconfig.json` is discoverable by the unchanged package ESLint project service; the compatibility ESLint file no longer overrides parser settings.

Audit and gradient evidence uses built-in `cy.writeFile`, not custom tasks. Each fixture execution creates a fresh ignored `audits-*` directory. The runner requires cumulative totals **31/58/91/103**, exactly **24/51/84/96 new-case audits**, and exactly **0/0/2/16 gradient observations**. Raw JUnit rejects failures/errors/skips, unique test titles are required, and audit titles must exactly match the new-case manifest. Browser evidence includes computed layered gradients, hue/alpha thumb colors, normalized thumb positions and two actual CDP forced-colors screenshots in the final round.

Direct mode uses the component configuration and existing Node 18. Ordinary mode invokes the unchanged package `cypress.config.ts` with the canonical spec and existing Node 22. Both use owned port 45232; the runner checks that port before starting and never kills another process. `testing/ci/project.json` registers application `colorarea-functional-tests`, tags `vNext`, `platform:web`, `test`, and implicit dependency `react-color-picker`. Its actual `e2e` target inherits the default `scripts-cypress:build` prerequisite; `type-check` explicitly retains that helper prerequisite. There is no empty-dependency override, parent cycle or private execution surrogate.

`checks` runs ordinary package ESLint, formatting, and discoverable `testing/tsconfig.json` against a temporary byte-exact copy of the seven checked-in baseline cases plus the same JSX compatibility and published-story inputs. Baseline-equal shared diagnostics are recorded explicitly rather than called typecheck-green. The temporary baseline file is removed after comparison. Historical execution instructions and reports below describe prior attempts, not the current integration command contract.

`snapshot <unique-label>` and `preserve <same-label>` retain the original preservation gate: branch, HEAD, outside status and captured modified/untracked/shared-package hashes must remain unchanged. Snapshots are exclusive-create files under ignored `.temp/snapshot-<label>`; preservation results go to a new per-invocation directory. A concurrent-work mismatch is reported, never reverted.

## Component-local integration verification

The initial integration added no test cases and changed no behavioral assertions: seven baseline plus 95 new cases. Its full-default direct Node 18 and ordinary package Node 22 Chrome runs both passed 102 unique cases, with zero failures/errors/skips/pending/retries, 95 new-case axe audits and 16 distinct measured gradients. Axe still asserts the existing exact Shape, Popup, Swatch and Channels story findings; these are not claimed accessibility-clean. Unexpected findings and all incompletes fail.

The subsequent adversarial review found that R2.02's four border-adjacent real clicks covered only LTR. It now has independent LTR and RTL cases, each mounting once and checking all four clicks with exact preserved HSV/event data, exactly four callbacks and measured direction-aware thumb geometry. This adds one case and audit, giving 103 cases and 96 new-case audits. A rejected same-test remount attempt and its failures remain in `.temp`; they are not green evidence. Exact story-title classification remains intentionally fail-closed: renaming a known story without updating its classification produces a failing audit rather than silently accepting its findings.

After that correction, direct `.temp/cypress-r4-1791163642396-51468` and ordinary `.temp/standard-r4-1791163691863-6856` each pass 103 cases, 96 new-case audits and 16 gradients with zero failures/skips/pending/retries. Updated optional rounds pass 58 and 91 cases in `cypress-r2-1791163557509-18040` and `cypress-r3-1791163597632-33896`. Formatting, package ESLint and both TypeScript checks pass in `checks-r4-1791163473413-29436`. The fresh repeated adversarial review reports no additional findings after tracing both direction-agnostic pointer coordinates and actual Griffel RTL thumb/gradient mirroring.

Initial successful integration receipts (retained; use later hash-bound receipts for the final edited source):

| Validation             | Owned `.temp` receipt             | Result                                                                |
| ---------------------- | --------------------------------- | --------------------------------------------------------------------- |
| Direct default         | `cypress-r4-1791161377561-19532`  | 102 cases, 95 audits, 16 gradients, 2 screenshots                     |
| Ordinary default       | `standard-r4-1791161588090-48592` | 102 cases, 95 audits, 16 gradients, 2 screenshots                     |
| Optional round 1       | `cypress-r1-1791162004219-39748`  | 31 cases, 24 audits, 0 gradients                                      |
| Optional round 2       | `cypress-r2-1791162039362-24560`  | 57 cases, 50 audits, 0 gradients                                      |
| Optional round 3       | `cypress-r3-1791162082267-30160`  | 90 cases, 83 audits, 2 gradients                                      |
| Ordinary scoped checks | `checks-r4-1791161377563-44448`   | Format/ESLint pass; final and baseline tsc both exit 0                |
| Nx discovery           | `discovery-20261004174937`        | Both actual affected lists include the application                    |
| Production isolation   | `exclusions-20261004175702`       | 7 TS roots/program sources; 7 emitted JS + 7 maps; no fixtures        |
| Invalid rounds         | `invalid-rounds-20261004180004`   | 8 malformed runner rounds rejected before execution                   |
| Invalid browser round  | `invalid-fixture-20261004180530`  | Round 0 throws the explicit validation error; expected Cypress exit 1 |

Production isolation uses the real `tsconfig.lib.json` parsed root list **and** `createProgram().getSourceFiles()`, not just a proxy config. Actual installed SWC CLI compiled all candidate root/testing TypeScript files with the unchanged package `.swcrc` and an absolute config path, emitting only the seven production modules into owned ignored output. The absolute config path avoids SWC's unrelated Windows relative-baseUrl canonicalization failure. Exact invocation from the library directory:

```powershell
$repo = (Get-Location).Path
$library = Join-Path $repo 'packages\react-components\react-color-picker\library'
$component = Join-Path $library 'src\components\ColorArea'
$receiptDirectory = Join-Path $component ('.temp\exclusions-' + (Get-Date -Format yyyyMMddHHmmss))
New-Item -ItemType Directory $receiptDirectory | Out-Null
Set-Location $library
$inputs = @(Get-ChildItem $component -File | Where-Object Extension -In '.ts','.tsx' | ForEach-Object FullName) +
          @(Get-ChildItem "$component\testing" -File | Where-Object Extension -In '.ts','.tsx' | ForEach-Object FullName)
node "$repo\node_modules\@swc\cli\bin\swc.js" @inputs --config-file "$library\.swcrc" --out-dir "$receiptDirectory\emitted" --strip-leading-paths --sync
```

The observed RTL saturation layer is leftward and the thumb is mirrored; the value layer remains downward. The checked-in style source still expresses a rightward gradient; Griffel's runtime directional transformation supplies the RTL browser result. The hook's existing keyboard and physical pointer-request semantics are characterized as-is, not modified. Unchanged SHA-256:

- `useColorArea.ts`: `432b4bfdaae3dd5259f5f1f548f559628e2f25b8c27e2b92982bf17dde70a1db`
- `useColorAreaStyles.styles.ts`: `d4794b0b6103d7427b85774c854e8ba06791ba7ecb3361183384d0bcaea263d2`

### Registered-target limitations

`nx sync:check` reports the existing workspace sync mismatch. The export-maps generator was run **dry-run only** (`sync-dryrun-20261004175841`), proposing `UPDATE tsconfig.base.json`; the root bytes were not changed.

Actual `nx run colorarea-functional-tests:e2e --skipSync --outputStyle=static` and `nx run colorarea-functional-tests:type-check --skipSync --outputStyle=static` both reach the retained helper prerequisites, then fail **before the component target**. With existing `node_modules/.bin` on PATH, the shared `generate-api` executor passes unquoted Windows paths containing `OneDrive - Microsoft` to `tsc`, producing `TS5023: Unknown compiler option '-'`. Both `eslint-plugin-react-components:build` and `scripts-cypress:build` fail; receipts are `registered-path-20261004175702`. The earlier invocation without that bin PATH reports missing `tsc` (`registered-20261004175428`); no packages were installed. No empty-dependency override or shared-source workaround is used. **Cold registered CI is blocked, not green.** Ordinary package Cypress using available helpers is independently verified.

At the integration preservation checkpoint, all 406 captured outside-component hashes were unchanged, HEAD remained `328802b974b51daa060b149ef07cdd0a7ec8b6d4` on `master`, and the only tracked component diff was the canonical fixture import. Historical reports and snapshots remain intact. No commit, delegated review or next-component work is performed; parent review gates remain outstanding.

## Sources read

- Every stable story in `stories\src\ColorPicker`: index, ColorAreaDefault, Default, Shape, Popup, ColorAndSwatchPicker, ColorSliderDefault, ColorSliderChannels and AlphaSliderDefault.
- ColorPickerDescription and ColorPickerBestPractices; library/stories README; library Spec, MIGRATION, current API report and relevant recent changelog.
- Every ColorArea source, constants, types, renderer, styles, hook, unit test and original Cypress test.
- Every ColorPicker source and unit test, context defaults/provider/selector, ColorSlider and AlphaSlider state hooks, HSV types, initial constants, coordinate helper and its unit tests, HSL conversion helper, conformance wrapper and focus-outline implementation.

Current source/types take precedence over historical proposed API examples. In particular, actual slots are `inputX`/`inputY`, not the specification's historical `sliderX`/`sliderY`.

## Round traceability

| Round | Added | Cumulative including baseline | Evidence                                                                                                                     |
| ----- | ----: | ----------------------------: | ---------------------------------------------------------------------------------------------------------------------------- |
| 1     |    24 |                            31 | Controlled/uncontrolled state, every arrow in LTR/RTL, bounds, callbacks, tab order, precision                               |
| 2     |    27 |                            58 | Trusted pointer clicks/drags, exact corners, document movement, callback merging, native slots, refs/forms                   |
| 3     |    33 |                            91 | All eight stable examples, picker context, shape units, accessibility, themes, updates, headless APIs                        |
| 4     |    12 |                           103 | Real forced-colors, direction-aware gradient versus LTR/RTL thumb alignment, live updates, cancellation, isolation, resizing |

### State and keyboard

| IDs   | Cases | Source / contract                             | Assertions and interactions                                                                                                                      |
| ----- | ----: | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1.01 |     1 | INITIAL_COLOR_HSV; input defaults; styles     | White HSV, native range semantics, one initial tab stop, accessible name, touch-action                                                           |
| R1.02 |     1 | useControllableState                          | Repeated real arrows accumulate without a callback                                                                                               |
| R1.03 |     1 | Controlled story; best-practice live feedback | Exact HSV output, preserved hue/alpha, reset without synthetic onChange                                                                          |
| R1.04 |     1 | Controlled owner contract                     | Rejected repeated requests do not mutate displayed color                                                                                         |
| R1.05 |     1 | Controlled prop updates                       | External hue/channel/alpha replacement and current callback closure                                                                              |
| R1.06 |     1 | color/defaultColor precedence                 | Explicit controlled color wins                                                                                                                   |
| R1.07 |     1 | Uncontrolled initialization                   | Changed defaultColor does not reset existing state                                                                                               |
| R1.08 |     8 | Root keydown switch                           | Four arrows in two directions; exact one-percent change, other channel unchanged, roving axis, preventDefault, event identity and callback count |
| R1.09 |     4 | Keyboard clamping                             | All four exact boundaries; repeated bound requests still report each step                                                                        |
| R1.10 |     3 | Non-arrow handling                            | Enter, Space and Escape do not request a color change                                                                                            |
| R1.11 |     1 | activeAxis/tabIndex                           | Real forward/reverse Tab, focus retention and active-Y reentry                                                                                   |
| R1.12 |     1 | Percentage rounding                           | Rounded display with unrounded underlying HSV arithmetic                                                                                         |

### Pointer and public/native slots

| IDs   | Cases | Source / contract                                  | Assertions and interactions                                                                                                                                                              |
| ----- | ----: | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2.01 |     6 | getCoordinates; styles                             | Three numeric points in LTR/RTL; trusted pointerdown, exact HSV and event data; measured thumb center within 0.1 CSS pixel                                                               |
| R2.02 |     2 | Coordinate rounding                                | Independent LTR/RTL real border-adjacent clicks reach all four exact corners; exact HSV callbacks and mirrored thumb geometry; 600px fixture preserves the original hit-target clearance |
| R2.03 |     2 | Document pointer listeners; coordinate unit tests  | Drag outside all bounds in LTR/RTL, exact clamping, preserved hue/alpha, pointerup stops callbacks                                                                                       |
| R2.04 |     1 | Listener registration                              | Two complete drags, exactly four callbacks, no duplicated move listener                                                                                                                  |
| R2.05 |     1 | Controlled pointer state                           | Frozen owner still receives requests without moving displayed channels                                                                                                                   |
| R2.06 |     1 | HSV preservation; original black-edge Cypress case | Black-to-colored pointer selection retains nonzero hue and optional alpha                                                                                                                |
| R2.07 |     1 | Root mergeCallbacks                                | Consumer pointerdown first; preventDefault does not veto; stopPropagation blocks parent                                                                                                  |
| R2.08 |     1 | Keyboard mergeCallbacks                            | Consumer first, one internal change, one parent event, no native duplicate                                                                                                               |
| R2.09 |     4 | Native input change                                | Both inputs with Home/End; slot handler before color callback; exact endpoint HSV and synthetic change event                                                                             |
| R2.10 |     1 | Slot step/min/max versus root algorithm            | Root arrows remain 1%; native Home/End respect 10/90 limits                                                                                                                              |
| R2.11 |     1 | Native disabled inputs                             | Disabled ranges skip Tab; root pointer API remains active                                                                                                                                |
| R2.12 |     1 | Root ARIA forwarding                               | aria-disabled describes but does not enforce disabling                                                                                                                                   |
| R2.13 |     1 | Conformance/ref/slot merging                       | Root, thumb and both input refs point to real nodes; IDs/classes/title survive; keyboard works                                                                                           |
| R2.14 |     1 | Required slots/state assignment                    | Undefined thumb still rendered; computed input values replace consumer values; native tabIndex override preserved                                                                        |
| R2.15 |     1 | Public thumb render function                       | Forwarded children/props retain both range inputs and real pointer/keyboard operation                                                                                                    |
| R2.16 |     1 | Native form integration                            | Named fields serialize exact channel percentages; arrows do not submit; real submit does                                                                                                 |
| R2.17 |     1 | Consumer styles/CSS variables                      | Exact 400x200 geometry; stale progress override rejected; coordinate selection uses custom dimensions                                                                                    |

### Stable documentation, context, accessibility and exported APIs

| IDs   | Cases | Source / contract                                 | Assertions and interactions                                                                                                             |
| ----- | ----: | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| R3.01 |     1 | Actual ColorAreaDefault                           | Two-channel updates, exact aria-valuetext and real Reset                                                                                |
| R3.02 |     1 | Actual Default; validated external input          | Area-to-HEX synchronization and valid HEX-to-area/hue update                                                                            |
| R3.03 |     1 | Actual Shape                                      | Rounded/square radii and shared channel state; exact unnamed-input baseline                                                             |
| R3.04 |     1 | Actual Popup                                      | Real open, keyboard draft update, Ok, reopen; audit includes open portal                                                                |
| R3.05 |     1 | Actual ColorAndSwatchPicker                       | Updated exact RGB swatch creation, Reset, eight empty swatches, restored saturation                                                     |
| R3.06 |     1 | Actual ColorSliderDefault                         | Horizontal/vertical hue synchronization, exact values and Reset                                                                         |
| R3.07 |     1 | Actual ColorSliderChannels                        | Independent saturation change; exact native-rounded properties and fractional attributes; Reset                                         |
| R3.08 |     1 | Actual AlphaSliderDefault                         | Primary alpha synchronization; inverse transparency remains zero; Reset                                                                 |
| R3.09 |     2 | ColorPicker context; horizontal/vertical siblings | Area, hue and alpha requests synchronize exact HSV/alpha/output with one callback per action                                            |
| R3.10 |     1 | Read-only parent color                            | Request forwarded without local mutation                                                                                                |
| R3.11 |     1 | Explicit child prop precedence                    | Local color overrides context/defaultColor; request still forwards                                                                      |
| R3.12 |     1 | Explicit local onChange                           | Replaces rather than duplicates context callback                                                                                        |
| R3.13 |     1 | Nearest provider                                  | Inner color/callback wins; outer callback untouched                                                                                     |
| R3.14 |     1 | Undefined context color                           | defaultColor and local uncontrolled updates remain supported                                                                            |
| R3.15 |     4 | Every useColorArea shape unit scenario            | Context inheritance and both explicit override directions; keyboard behavior unchanged                                                  |
| R3.16 |     2 | Light/dark theme; HSL conversion                  | Exact token border colors, computed LTR gradient layers and hue color, root hue/alpha CSS variables, browser thumb RGBA, pointer update |
| R3.17 |     1 | Best-practice labels/non-color feedback           | Dynamic value text on both axes, accessible names/descriptions, orientation attributes and visible textual feedback                     |
| R3.18 |     1 | Native label API                                  | Both HTML label associations; real label click focuses saturation                                                                       |
| R3.19 |     1 | Focus-within styles                               | Real keyboard Tab and arrows retain focus; visible ::after outline has exact 2px black border                                           |
| R3.20 |     1 | useEventCallback                                  | Replaced onChange receives later keyboard and document drag requests                                                                    |
| R3.21 |     1 | Controlled rerender during drag                   | Next pointermove uses newly supplied hue/alpha                                                                                          |
| R3.22 |     2 | Public base/full hooks + styles + renderer        | Both headless compositions support uncontrolled real keyboard/pointer changes                                                           |
| R3.23 |     1 | Provider custom style hook                        | Runtime-narrowed state, real custom root border and thumb title, interaction retained                                                   |
| R3.24 |     1 | Ref lifecycle; completed-drag cleanup             | Unmount releases refs; subsequent movement does not call old handler or change another area                                             |
| R3.25 |     2 | Browser PageUp/PageDown                           | Exact native 10-percent changes and change events                                                                                       |
| R3.26 |     1 | Root keyboard algorithm                           | Shift modifier does not invent a larger step                                                                                            |

### Additional supported surfaces

| IDs   | Cases | Contract                                               | Assertions and interactions                                                                                                                                                                                                                                      |
| ----- | ----: | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R4.01 |     2 | Forced-colors LTR/RTL                                  | Actual CDP media emulation, computed direction-aware gradient directions/stops/layer order and hue color, forced-color-adjust none, measured thumb position, focus border and keyboard value                                                                     |
| R4.02 |     1 | Live context shape                                     | Radius changes without remount/reset                                                                                                                                                                                                                             |
| R4.03 |     1 | Live slot callback                                     | Native Home/End use current inputX handler, exact callback ownership/count                                                                                                                                                                                       |
| R4.04 |     1 | Root group/name and native input focus/blur            | Explicit role/aria-labelledby, accessible root name, input title/ref, native End event and focus/blur callbacks                                                                                                                                                  |
| R4.05 |     1 | onChange cancellation timing                           | preventDefault does not roll back already requested uncontrolled state                                                                                                                                                                                           |
| R4.06 |     1 | Cross-axis keyboard                                    | Left on focused Y changes saturation and restores X tab stop without forcibly moving focus                                                                                                                                                                       |
| R4.07 |     1 | Optional HSV alpha                                     | Missing alpha stays absent in callbacks; rendered thumb defaults opacity to 1                                                                                                                                                                                    |
| R4.08 |     1 | Standalone isolation                                   | Independent state and callback ownership for two areas                                                                                                                                                                                                           |
| R4.09 |     1 | Live geometry                                          | Resize 400x200 to 600x400; state preserved and subsequent pointer mapping uses new rectangle                                                                                                                                                                     |
| R4.10 |     2 | Direction-aware gradients versus Griffel thumb LTR/RTL | Computed value overlay transparent-to-black downward, saturation overlay white-to-transparent rightward in LTR / leftward in RTL and opaque hue underlay; measured thumb centers and exact opaque thumb RGB at saturation 0/1/0.25/0.75, value 0/1 and hue 0/120 |

## Exact accessibility baselines

Only these **unchanged stable-story scenarios** may contain classified violations:

| Scenario       | Exact permitted baseline                                                                                                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R3.03 Shape    | One `label` rule, exactly four unnamed range inputs in the second/square ColorPicker, ordered channel values 99/91/109/100                                                                                                                                                                              |
| R3.04 Popup    | One unnamed modal `.fui-PopoverSurface` dialog; exactly two internal Tabster Modalizer sentinels, first/last, `I`, role none, tabindex 0, aria-hidden true, exact marker and failure text                                                                                                               |
| R3.05 Swatch   | Clean, or one `aria-hidden-focus` rule with exactly two internal SwatchPicker Mover sentinels of the same precise structure. Tabster may make these untabbable after Reset. Axe element references identify the exact nodes even when its generated nth-child selector changes after the audit snapshot |
| R3.07 Channels | One `label` rule, exactly the three unnamed ColorSlider range inputs, ordered post-reset native values 109/100/91                                                                                                                                                                                       |

The input-label and dialog failures must match their complete axe failure summaries. Extra rules, extra/missing baseline nodes, violations in other fixtures and **all incompletes** fail. Stable stories are imported directly, never relabeled or reimplemented to hide their baseline. Clean improvements to the transient Swatch sentinel baseline are accepted, but unrelated findings are not.

## Supported behavior and limits

- ColorArea has no top-level `disabled`, `vertical`, channel selection, custom keyboard-step or built-in label props. Native slots support disabled/step/min/max/ARIA/orientation; sibling ColorSlider/AlphaSlider support vertical orientation. No unsupported top-level API is invented.
- Arrow changes are hardcoded to 0.01 and clamp to [0, 1]; configured range step/min/max only affect native non-arrow keys. Native range properties round to step, while their `value` attributes may retain fractional source percentages.
- RTL root arrows and pointer callbacks use the same physical channel mapping as LTR. Griffel mirrors both the visible thumb and saturation gradient horizontally: browser-computed saturation is white-left/hue-right in LTR, white-right/hue-left in RTL, despite the source literal `to right`. Thus saturation 0 places the white thumb on the white edge and saturation 1 places the hue-colored thumb on the hue edge in both directions. Quarter/three-quarter samples prevent a symmetric midpoint from hiding a gradient-versus-thumb mismatch. The value gradient remains transparent-top/black-bottom and the thumb moves top-to-bottom as value decreases in both directions. Hue changes update the opaque underlay and thumb color without changing gradient directions. R4.10 records actual current alignment, not a speculative production repair; R4.01 now explicitly asserts the direction-aware gradient under real forced-colors. These are computed CSS plus measured geometry/color assertions, not screenshot-pixel sampling claims. The original review's non-mirrored-gradient premise was disproved by the browser, while its missing-assertion finding was valid.
- Changing the active axis updates tab stops but does not forcibly transfer focus. A forward Tab from still-focused X can land on newly active Y before leaving.
- Consumer event preventDefault is not a veto of merged internal handlers. Native disabled inputs and aria-disabled do not disable root pointer updates.
- The historical specification's automatically grouped root and slot names differ from current source. Root role/name are explicitly consumer-provided; input slots are native void elements and do not expose a typed children render-function API.
- Coverage is Windows Chrome 154 / Cypress 14.4.1 component execution with real mouse/keyboard and forced-colors emulation. It is not a screen-reader session, touch-device test, Safari/Firefox run, full repository build or product behavior repair. Unmount coverage releases refs after completed drags; it does not claim cleanup of an interrupted active drag.

## Historical files and persisted evidence (pre-integration)

Authored: `ColorArea.cy.stories.tsx`, `ColorArea.cy.md`, `ColorArea.cypress.config.cjs`, `ColorArea.run.cjs`, `ColorArea.eslint.config.cjs`, `ColorArea.cy.tsconfig.json`, `ColorArea.cy-baseline.tsconfig.json`, `ColorArea.cy-webpack.tsconfig.json`, `ColorArea.cy-jsx.stories.ts`.

`reports\commands.jsonl` records exact commands and exits. Each round/attempt keeps its log, per-spec JUnit XML and JSON summary with named cases and full axe node evidence. Scoped formatting, final/baseline lint and final/baseline typecheck logs are separate. `preservation-before.json` / `preservation-after.json` compare the original 768 file hashes, outside-directory Git status, HEAD and branch. Failed attempts are retained as evidence, not counted as successful validation.

## Historical verified outcome and concurrent-checkout limitation

Original successful cumulative runs (before this review addition): `round-1-attempt-2.log` (31), `round-2-attempt-3.log` (57), `round-3-attempt-8.log` (90), and `round-4-attempt-3.log` (100). Original repeat `round-4-attempt-4.log` also passes all 100 cases. Both original final runs have zero failures/skips, 93 audits, 89 completely clean audits, 5 precisely classified baseline rule findings across 4 unchanged-story scenarios / 12 nodes, zero incompletes, with complete JSON/XML evidence.

Final/baseline typechecks and lint, plus final formatting, pass with zero diagnostics. The local JSX bridge eliminates the shared React 19/global JSX diagnostics equally for both typecheck configurations; it does not suppress errors or alter shared declarations.

The preservation check intentionally remains nonzero: **765/768 original hashes match**, the branch remains master, but concurrent outside-directory commits `6e11b4ae` (CardHeader default slot spacing) and `44a49cfb` (CounterBadge numeric/variant/naming coverage) moved HEAD and changed outside status. The three mismatched original files are CounterBadge's `.cy.config.cjs`, `.cy.tsconfig.json` and `.cy.tsx`; outside status also acquired a modified DataGrid `.cy.tsx`. Neither this task nor its runner writes there. All 10 original ColorArea files, including the baseline `.cy.tsx`, retain their snapshot hashes. No outside changes were reverted and no commits were created by this task. `preservation.log` and `preservation-after.json` record the exact concurrent commits, paths and status differences rather than claiming an unchanged shared checkout.

### Narrow RTL-gradient review fix

`round-4-attempt-rtl-gradient-review-2.log` and repeat `round-4-attempt-rtl-gradient-review-3.log` each pass **102/102 cases**, with **zero failures/skips, 95 audits, 91 clean audits, the unchanged 5 baseline rule findings across 4 scenarios / 12 nodes, and zero incompletes**. Each JSON summary also contains **16 actual gradient observations**: light/dark theme, forced-colors LTR/RTL and six controlled color states in each direction. These include exact computed background layers/underlay, thumb RGB and measured normalized thumb centers. R4.10 verifies both saturation endpoints, both asymmetric quarters, black at the bottom and a red-to-green hue replacement. R4.01's title now claims direction-aware gradients and actually checks them.

The first `round-4-attempt-rtl-gradient-review.log` is retained as failed investigation evidence, not a passing run: assuming the review's non-mirrored gradient caused six failures. Its JUnit diagnostics show the actual RTL `to left` gradient and the serialized trailing `none` layer for the solid-color background. The corrected assertions require the exact observed layer stack, stops, colors and direction; they do not skip, accept either direction or loosen axe baselines.

`format-checks-rtl-gradient-review-2.log`, both `typecheck-*-rtl-gradient-review-2.log` and both `lint-*-rtl-gradient-review-2.log` pass with zero diagnostics. The original 10 ColorArea source/baseline files still match their original snapshot hashes. The separate review snapshot/preservation reports leave the original preservation evidence intact. Review preservation is explicitly **nonzero: 765/769 hashes match** because four concurrent DataGrid files changed (`DataGrid.cy-baseline.tsconfig.json`, `DataGrid.cy.tsconfig.json`, `DataGrid.cy.tsx`, `DataGrid.test.tsx`) and its untracked `DataGrid.cy.md` appeared. HEAD remains `44a49cfb8e0e2ca4771a1a660e87a653664456ee` on master. No writes outside ColorArea, production changes, commits or agents were performed by this review fix; concurrent work was not reverted.

## Isolated mutation audit testability amendment

The brightness-slot mutant legitimately failed the exact four-input Shape
contract in the final audit hook, which caused Mocha to skip 42 later cases.
The complete strict audit chain now runs at the end of each previously audited
test body, so the missing control fails its testcase rather than a hook.

Original hook scope is the 96-case `ONLY132` fixture suite. Its forced-colors
reset stays in `beforeEach`; body media work and final audit ordering are
unchanged. The seven canonical baseline cases are a separate sibling suite and
retain their original checks and unaudited scope. Total inventory remains 103.

Exact Shape four-input/Channels three-input counts, native range values/names,
finding targets, raw evidence writes, and all known/unknown violation/incomplete
assertions are retained without optional-control fallbacks or count relaxation.
Earlier body failures remain failures, and successful fixture cases cannot omit
their final audit chain. Fresh parent-run baseline, mutant, and restored evidence
under a separately sealed amendment is required; no Cypress result is claimed here.

The common gradient-capture follow-up reviewed four missing-brightness
`TypeError`s alongside 86 assertion failures. Both required X/Y range elements
now have typed nonnull assertions before their values are captured. Original
channel/value comparisons, gradient/style checks, thumb fraction math, geometry,
strict audits, 103 titles, and the seven canonical baseline cases are unchanged.
