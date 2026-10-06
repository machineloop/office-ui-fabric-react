# ONLY133 ColorPicker Cypress traceability

## Scope

All authored tests, compatibility declarations, runner/configuration files, temporary output, screenshots and reports live in this `ColorPicker` directory. Existing implementation, unit tests, stable stories, sibling components, dependencies and shared configuration are read-only. Implementation performed no branch or commit operation; parent initial and repeated adversarial reviews subsequently completed.

The suite contains **112 functional cases**, not 133 cases: ONLY133 identifies the task. Four cumulative rounds contain **21 / 45 / 60 / 112** cases. Each case has a full default-rule axe audit. Round 3 additionally audits four open-popup checkpoints; round 4 has seven checkpoints (five open-popup, two actual forced-colors) and 19 measured gradient observations. Retries are disabled. The runner rejects incorrect counts, failures, skipped cases, missing/duplicate per-case audits and duplicate case titles.

## Canonical integration

`ColorPicker.cy.tsx` contains exactly one import of `testing/ColorPicker.cy.stories.tsx`, the existing 112-case suite. The ordinary unchanged package Cypress glob discovers this single entry. Suite-scoped hooks and configuration (zero retries, 1100px viewport) do not affect other specs. The default is full round 4 with no environment variable or private task registration. Optional rounds accept only 1-4; empty, zero, fractional, padded, boolean and other invalid values fail instead of silently selecting a default.

All non-test TypeScript, JSX compatibility and API contracts live in `testing/` with actual `.stories.ts`/`.stories.tsx` filenames. The unchanged SWC `/testing` rule and production TS story exclusions apply. `testing/tsconfig.json` is recognized by the unchanged parent ESLint project service; no parser override remains. Final typing and imported-story baseline share the same JSX bridge. Compile-time API contracts retain the absent picker `defaultColor`, base shape omission, root slot and exact event-data union/discriminated change branch. Runtime area events still characterize the narrower declared `type: change` event branch, not a production repair.

Evidence uses built-in `cy.writeFile` plus ordinary CDP, not custom `cy.task`. Each invocation has unique ignored `.temp` logs/XML/evidence and recursive authored/production/testing/CI before/after hashes. JUnit titles must exactly match the registration manifest and final audits. Checkpoint and gradient manifests require exact title multiplicities; nonempty default-rule evaluations, zero failures/errors/skips/pending/retries and all 19 measured gradient observations are required. The suite's own completion hook also rejects partial execution. Historical `reports/` failures and preservation baselines are retained untouched.

`testing/ci/project.json` registers `colorpicker-functional-tests` as an application tagged `vNext`, `platform:web`, `test`, implicitly dependent on `react-color-picker`. Actual `e2e` uses the ordinary package configuration; the root e2e helper-build prerequisite is inherited. Explicit `type-check` retains `scripts-cypress:build`; neither target empties dependencies or creates a parent cycle. `testing/ColorPicker.verify.cjs` verifies real Nx ownership/affected selection, exact TS roots/program sources, and actual installed SWC emission rather than merely checking exclusion strings.

## Adversarial coverage corrections

The frozen-area owner case now rejects both an X-axis and a Y-axis keyboard request, requiring unchanged displayed/selected color and exactly two original keyboard callbacks with independently expected HSV data. The suite remains 112 cases.

Known inherited Tabster outcomes are explicit fixed rule-set profiles, not expected arrays constructed from the observed axe result. Popup scans require the unnamed-dialog finding, with or without the exact sentinel pair; Swatch scans allow only the exact sentinel pair or no violations. Rule identity comparisons are order-independent, and dialog nodes are found by rule ID rather than array position. Each scan additionally proves that unknown rules, duplicate findings and a popup profile missing its required dialog finding are rejected. Raw sentinel violations/incompletes remain visible as known findings, not accessibility-clean results; R3.07's real Tab/Shift+Tab cycle is the independent functional focus-trap guard.

After these corrections, direct `.temp/cypress-r4-1791166615398-9392` and ordinary `.temp/standard-r4-1791166668948-5152` each pass 112 cases, 119 axe evaluations and 19 gradients with zero failures/skips/pending/retries. Formatting, package ESLint, final/baseline typing and production lint pass in `checks-r4-1791166531454-41280`. The fresh repeated adversarial review reports no additional findings.

## Exact integrated Windows commands

### Source-derived color forwarding regression

R2.08 retains its original full/base hook composition, real hue input, synchronization and callback assertions, then exercises a custom native range child through the exported `useColorPickerContextValue_unstable` selector. The real picker hooks, context-value hooks and renderer supply `requestChange`; no direct-provider fixture or mocked producer substitutes for `useColorPickerBase_unstable`. A frozen caller-owned HSVA object and request wrapper are created outside render. One trusted native change forwards the original event and color reference to `onColorChange`, with a new metadata wrapper containing `type: 'change'` and `event`. Both original request fields and every synchronized channel remain unchanged except for the requested selection.

This is an exact-forwarding regression derived from `useColorPicker.ts` (`color: data.color`) and its existing forwarding unit test, **not a documented stable API promise of reference identity**. The public selector and parent callback make the reference observable; a clone preserves structural HSV equality but loses the caller's object identity. The additional oracle first checks callback counts and structurally equal color/metadata, then checks the original retained reference. It strengthens the existing two R2.08 cases without adding or dropping titles: the suite remains **112 cases**, with cumulative **21 / 45 / 60 / 112** counts and unchanged accessibility classifiers.

Run from `C:\Users\jabrassi\OneDrive - Microsoft\Documents\Microsoft Scout\fluentui`:

```powershell
$runner = 'packages\react-components\react-color-picker\library\src\components\ColorPicker\ColorPicker.run.cjs'
$verify = 'packages\react-components\react-color-picker\library\src\components\ColorPicker\testing\ColorPicker.verify.cjs'
$node22 = 'C:\Users\jabrassi\.scout-instances\local-test\copilot\session-state\e2e8f1b0-53a4-4784-81a2-ee19461b7b31\files\runtime\node-v22.20.0-win-x64\node.exe'
# Direct path uses the existing default Node 18.
node $runner cypress
# Prepend installed Node 22 for standard ESM config and its child processes.
$env:PATH = "$(Split-Path $node22);$PWD\node_modules\.bin;$env:PATH"
& $node22 $runner standard
node $runner format
node $runner checks
node $runner cypress 1
node $runner cypress 2
node $runner cypress 3
node $verify isolation
node $verify discovery
node $verify invalid
node $verify sync
node $verify registered
node $runner preserve integration133
```

The new `snapshot integration133` baseline was captured separately from the historical baseline; do not overwrite either. A future `snapshot <unique-label>` uses exclusive writes. `preserve <label>` compares that baseline and reports concurrent changes without reverting them. Every validation path prints its unique evidence directory and records exact commands/exits in `commands.jsonl`. The optional round is the only Cypress argument; historical attempt-label syntax no longer applies.

The standard child command, from the library directory, needs no `--env` or custom tasks:

```powershell
$repo = 'C:\Users\jabrassi\OneDrive - Microsoft\Documents\Microsoft Scout\fluentui'
Set-Location "$repo\packages\react-components\react-color-picker\library"
& $node22 "$repo\node_modules\cypress\bin\cypress" run --component --browser chrome --headless --config-file cypress.config.ts --spec src\components\ColorPicker\ColorPicker.cy.tsx
```

The runner adds unique JUnit and non-destructive screenshot/download paths, all recorded without placeholders in each receipt. Direct mode substitutes `src\components\ColorPicker\ColorPicker.cypress.config.cjs`. The suite itself configures the required viewport and zero retries; final runner invocations do not override the ordinary package's global retry/viewport settings.

Final/baseline typechecks use:

```powershell
node node_modules\typescript\bin\tsc -p packages\react-components\react-color-picker\library\src\components\ColorPicker\testing\tsconfig.json --pretty false
node node_modules\typescript\bin\tsc -p packages\react-components\react-color-picker\library\src\components\ColorPicker\ColorPicker.cy-baseline.tsconfig.json --pretty false
```

Both authored and seven-module production lint use **the unchanged library `eslint.config.cjs`**, not the compatibility file. Exact argument lists are recorded in the checks receipt. Typecheck diagnostics are compared exactly against the imported stable-story baseline; nonzero exits cannot be reclassified without actual matching diagnostics. No dependency installation or shared configuration edits are required.

The runner checks port 45233 before starting Chrome and never terminates another process. TEMP/TMP and Nx cache/data paths are component-owned. Registered cold targets keep their helper prerequisites; `--skipSync` only avoids applying shared root sync formatting, not dependency builds. A shared `generate-api` Windows-path `TS5023 '-'` failure is a blocker, not a cold-green result or grounds for a dependency bypass.

## Integrated verification receipts

All receipt paths below are relative to this component's ignored `.temp/`. Each has `commands.jsonl` and recursive `source-before.json` / `source-after.json`; successful non-format validations require identical hashes. The suite and runner hashes below are the actual executable sources used for the final runs. This receipt documentation was added afterward; it changes no executable source.

| Verification                                                      | Receipt                           | Result                                                                                                                                                                         |
| ----------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Direct Node 18 round 1                                            | `cypress-r1-1791165742335-43608`  | 21 cases, 21 axe evaluations, 0 gradients                                                                                                                                      |
| Direct Node 18 round 2                                            | `cypress-r2-1791165778318-32628`  | 45 cases, 45 axe evaluations, 0 gradients                                                                                                                                      |
| Direct Node 18 round 3                                            | `cypress-r3-1791165815915-38688`  | 60 cases, 64 axe evaluations (4 popup checkpoints), 0 gradients                                                                                                                |
| Direct Node 18 default full                                       | `cypress-r4-1791165860940-18228`  | 112 cases, 119 axe evaluations, 19 gradients                                                                                                                                   |
| Ordinary package Node 22 default full                             | `standard-r4-1791165916611-44548` | 112 cases, 119 axe evaluations, 19 gradients; no round/private environment/task or retry/viewport CLI overrides                                                                |
| Format, ordinary ESLint, exact typing comparison, production lint | `checks-r4-1791165810383-23288`   | All five child exits 0; both typechecks have zero diagnostics                                                                                                                  |
| Actual TS program and SWC producer                                | `isolation-1791165742286-48580`   | Exactly 7 production roots/program sources, 7 emitted JS + 7 maps, zero fixtures                                                                                               |
| Nx project/ownership/affected                                     | `discovery-1791165744423-22816`   | Source-only and fixture-only actual affected lists include `colorpicker-functional-tests`; actual helper prerequisites retained                                                |
| Strict input negatives                                            | `invalid-1791165808585-23200`     | 11 invalid runner arguments rejected before evidence/Chrome; 14 actual browser-guard negatives rejected, 8 allowed number/string inputs accepted, absent environment selects 4 |
| Shared sync dry-run                                               | `sync-1791165170058-33500`        | Only `tsconfig.base.json` UPDATE proposed, never applied; root hash unchanged                                                                                                  |
| Cold registered e2e/type-check                                    | `registered-1791165221637-48556`  | Both exit 130 before the component target, shared helper build `generate-api` unquoted Windows-path TS5023 failure; **blocked, not green**                                     |
| Preservation                                                      | `preserve-r4-1791165899039-19372` | All 383 captured hashes unchanged; master unchanged; concurrent HEAD/status differences intentionally fail strict preservation                                                 |

Both full runs have zero failures, errors, skips, pending or retries. The 112 final audits comprise 109 clean fixtures plus exact unchanged Shape/Channels labels and Swatch sentinel profiles. The seven checkpoints are five open-popup audits retaining the exact modal-name finding and exact Tabster manual-review incomplete profile, plus two clean actual forced-colors audits. This is not a claim of 119 clean accessibility passes.

SHA-256 identities:

```text
testing/ColorPicker.cy.stories.tsx b88731895597417d5abecfcb0820c655de49817d3f7b201e64bd51aa1a63646e
ColorPicker.run.cjs 73c968de8d2e6cd147b8252a195db399753ff4ae497d758c9983aec1f1f02c59
testing/ColorPicker.verify.cjs cbc45c967577be9d94326de05da985e49327113e8ec9bc0d1af1c3be63f4270a
testing/ci/project.json 083b64238a36bf4a3f8ecf6e1f6faa176a23623b38a3f7564d23c7284d277887
standard-r4-1791165916611-44548/summary.json 5a33783ef59aeeceffde54e0335390a10335f333d9ee7823114149c4c4d04e57
cypress-r4-1791165860940-18228/summary.json 3bbcc25cbfb8f4b4290f95c500011fa94f53094a4931d8f48cba4502fa5ac76b
```

The separate integration baseline starts at `7b94cc1ff146776b5f0dbb5a3ed10d9ebd9b540f`; concurrent commit `03cdede0c05d3ea9ae0d4e91bc3de3e73c7c92fc` advances master with DataGridCell coverage. Outside status adds modifications to DataGridCell's `.cy.md` and `.cy.tsx`. No captured file hash differs, and no outside change is reverted. The historical baseline and every historical report remain intact. Earlier integration receipts retain failed investigation/check attempts (unsupported Prettier `.gitignore` parser, a format-versus-hash race, incorrect API union assertions, file-map envelope and SWC output-path assumptions); these are not passing evidence and were corrected without production edits. No source/config/dependency repair, commit, review agent or next-component advance is performed.

## Sources read and interpretation

- All eight stable stories and their index: Default, Shape, Popup, ColorAndSwatchPicker, ColorAreaDefault, ColorSliderDefault, ColorSliderChannels, AlphaSliderDefault.
- ColorPickerDescription, ColorPickerBestPractices, library/stories README, Spec, MIGRATION and the current API report.
- All ColorPicker, ColorArea, ColorSlider and AlphaSlider production sources, types, styles, renderers, hooks, constants, index exports and unit tests.
- ColorPicker context default/provider/selectors; color types; all color/coordinate/channel/percentage helpers and unit tests; current library exports.
- Existing ColorSlider/AlphaSlider Cypress tests; ColorArea's local runner/configuration, compatibility declarations, accessibility classification and real RTL gradient/geometry assertions as read-only prior art.

Current source/types take precedence over proposed/historical examples. The picker accepts HSV objects, not RGB/HEX strings; conversions and text validation belong to the actual Default story. ColorPicker has no `defaultColor` or picker-owned uncontrolled color state. Without a parent `color`, children can independently maintain their state, but do not automatically synchronize siblings. Callback metadata is asserted at runtime because area keyboard/pointer events are broader than the picker's discriminated `type: change` input-event branch (the generic `type: undefined` branch and handler parameter are broad). Every checked callback now requires trusted browser input. Existing frozen-owner and explicit child-color cases check exact requested metadata/ownership; the RGB story case also rejects a fractional channel without altering selected HSV/HEX. These strengthen existing cases without changing cumulative counts.

## Round 1: state, precedence and forwarding (21 cases)

| IDs   | Cases | Evidence / source contract                                                                                                                                                               |
| ----- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1.01 |     1 | Empty root conformance, static class, native accessible group name, flex/column layout and exact 4px token gap; no invented controls/callbacks.                                          |
| R1.02 |     1 | INITIAL_COLOR_HSV white defaults; uncontrolled hue changes without inventing picker-owned sibling synchronization.                                                                       |
| R1.03 |     1 | Controlled initialization, external replacement and reset across all six child controls; no callback on owner updates.                                                                   |
| R1.04 |     5 | Hue, saturation, brightness, opacity and inverse transparency synchronize area/sliders; exact HSV and callback object keys, event identity/type/count, reset without a synthetic change. |
| R1.05 |     4 | Every real area arrow changes exactly one channel and forwards the original keyboard event once.                                                                                         |
| R1.06 |     6 | Frozen owner rejects requests from every control; neither the source control nor siblings mutate.                                                                                        |
| R1.07 |     1 | Context beats child defaults; explicit child color beats both context and defaults for all three component kinds.                                                                        |
| R1.08 |     1 | Omitted alpha displays opaque; area preserves absent alpha; hue's conversion subsequently materializes alpha=1.                                                                          |
| R1.09 |     1 | Black/achromatic/fully transparent input retains nonzero hue and zero alpha during area updates.                                                                                         |

## Round 2: context, units, styling and APIs (24 added, 45 cumulative)

| IDs   | Cases | Evidence / source contract                                                                                                                                                                                                              |
| ----- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2.01 |     3 | Local area/hue/alpha `onChange` replaces, rather than duplicates, picker forwarding; controlled values remain frozen.                                                                                                                   |
| R2.02 |     1 | Nearest nested picker wins color, shape and callback; outer control and callback stay unchanged.                                                                                                                                        |
| R2.03 |     1 | Empty nested picker shadows outer color/shape; its children use local defaults and uncontrolled updates.                                                                                                                                |
| R2.04 |     1 | Internal direct provider sends an exact child request and supplies square shape/color. This is unit-derived internal coverage, not a claimed public provider export.                                                                    |
| R2.05 |     1 | Public selector outside a picker uses undefined color and rounded context default; area remains functional.                                                                                                                             |
| R2.06 |     5 | Every default/context/explicit shape precedence unit scenario across area, hue and alpha; exact root/rail radii and unaffected circular thumbs.                                                                                         |
| R2.07 |     1 | Live shape update preserves DOM identity/color; explicit root width/gap override default layout.                                                                                                                                        |
| R2.08 |     2 | Full/base hooks, context, styles and renderer retain real hue synchronization, then a typed custom child verifies source-derived original event/color-reference forwarding and unchanged request fields. Base context carries no shape. |
| R2.09 |     1 | Root ref, native title/class/group attributes, arbitrary children and bubbling key handler survive; ref is null after unmount.                                                                                                          |
| R2.10 |     1 | Input/rail/thumb refs bind real nodes; native input props survive; slot callback precedes parent callback; FormData serializes the displayed controlled hue.                                                                            |
| R2.11 |     1 | FluentProvider custom picker style hook is runtime type-guarded; exact root border/title change without breaking color updates.                                                                                                         |
| R2.12 |     1 | New color/callback closure is used without remount; old callback receives no later requests.                                                                                                                                            |
| R2.13 |     2 | Light/dark tokens, exact browser thumb/preview RGBA, HSL variable syntax and opaque hue background.                                                                                                                                     |
| R2.14 |     3 | Red, white and black unit-derived HSV/HSL edge conversions appear as exact area and alpha pseudo-element colors.                                                                                                                        |

## Round 3: actual stable documentation (15 added, 60 cumulative)

| IDs   | Cases | Evidence / source contract                                                                                                                                   |
| ----- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R3.01 |     1 | Actual Default hue change updates exact HEX/RGB/alpha and textual value feedback.                                                                            |
| R3.02 |     1 | Actual HEX #336699 becomes hue 210, saturation 67, brightness 60, RGB 51/102/153 and opaque alpha.                                                           |
| R3.03 |     1 | Invalid HEX characters are rejected, invalid blur sets aria-invalid, valid red entry clears it and restores synchronized fields.                             |
| R3.04 |     1 | RGB spinbutton submission updates exact HEX and HSV controls; respects the story's hashless HEX output.                                                      |
| R3.05 |     1 | Decimal alpha spinbutton updates slider, slider updates spinbutton/value text, hue remains unchanged.                                                        |
| R3.06 |     1 | Actual Shape updates both pickers together while preserving rounded/square geometry; four unnamed square ranges are classified precisely.                    |
| R3.07 |     1 | Actual Popup draft change, complete real Tab focus-trap cycle, Ok commit, trigger focus restoration and reopening; open surfaces are audited.                |
| R3.08 |     1 | Cancel preserves committed preview, while reopening retains draft (actual story behavior, not an invented rollback).                                         |
| R3.09 |     1 | Escape unmounts popup, restores trigger focus, leaves committed preview unchanged and retains reopened draft.                                                |
| R3.10 |     1 | Actual Swatch uses exact current RGBA, focuses added swatch, enforces eight-color capacity and Reset restores eight empties and opacity.                     |
| R3.11 |     1 | Actual ColorArea example updates descriptive two-axis text and resets exact channel values.                                                                  |
| R3.12 |     1 | Actual Channels example reaches zero saturation without falsy fallback to hue, keeps other channels intact, and resets; three unnamed ranges are classified. |
| R3.13 |     1 | Actual horizontal/vertical hue pair updates together with native orientation and resets.                                                                     |
| R3.14 |     2 | Actual opacity/transparency slider pairs update only their own shared state and reset independently.                                                         |

## Round 4: browser input, direction, lifecycle (52 added, 112 cumulative)

| IDs   | Cases | Evidence / source contract                                                                                                                                                                                |
| ----- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R4.01 |     8 | All four arrows in LTR/RTL across area, hue and opacity; exact deltas/callback count; area gradient layers and measured thumb geometry.                                                                   |
| R4.02 |    10 | Home/End for all five scalar controls; exact HSV endpoints, zero/360 hue, inverse transparency and no extra native change at a repeated bound.                                                            |
| R4.03 |    10 | PageUp/PageDown on all scalar controls; exact Chrome 10%-range large steps and sibling synchronization.                                                                                                   |
| R4.04 |     6 | Three trusted pointer points in each direction; exact two-decimal normalized HSV, original trusted pointer event, complete channel synchronization and actual gradients/thumb centers.                    |
| R4.05 |     4 | Trusted hue/alpha midpoint clicks in LTR/RTL; exact selected color, original trusted native change, all siblings updated.                                                                                 |
| R4.06 |     2 | Trusted document drag beyond the area clamps to saturation=1/brightness=0; real pointerup removes movement forwarding. A 300px fixture keeps the outside point inside the application iframe in RTL.      |
| R4.07 |     1 | Real forward/reverse Tab, source-defined active-axis change and reentry. Switching to Y while X retains focus gives the newly tabbable Y one transient forward Tab before hue.                            |
| R4.08 |     1 | Disabled native hue is skipped by real Tab and emits nothing; opacity remains functional.                                                                                                                 |
| R4.09 |     1 | Undefined-color picker accepts independent child defaults; changed defaults do not reset existing uncontrolled state.                                                                                     |
| R4.10 |     1 | Source-defined uncontrolled slider callback fallback is black when no parent/explicit color exists; child defaultColor is not used to preserve the other callback channels. Area remains independent.     |
| R4.11 |     1 | Native step/min/max slot configuration, exact callback target and consumer-before-parent ordering.                                                                                                        |
| R4.12 |     2 | Actual CDP forced-colors media in both directions, real media-query confirmation, exact gradient layers/colors/geometry, forced-color-adjust and 2px focus feedback; audited before restoring media.      |
| R4.13 |     2 | Horizontal/vertical hue orientation, opacity/transparency unit-derived direction variables, actual alpha gradient RGBA and rejected controlled update.                                                    |
| R4.14 |     1 | Runtime area resizing uses current geometry, retains node identity and yields exact trusted pointer selection.                                                                                            |
| R4.15 |     1 | Owner prop/callback replacement during active drag; next trusted document movement uses new hue/alpha and new callback. A programmatic owner button click deliberately does not release the held pointer. |
| R4.16 |     1 | Actual Popup outside dismissal unmounts controls, preserves committed preview and retains reopened draft.                                                                                                 |

## Accessibility classification and audit integrity

No axe rules are disabled. Clean fixtures reject every violation and every incomplete; they must remain in the accessibility tree, and fixtures with ranges must actually pass axe's label rule. Mounting also asserts that no inherited `aria-hidden=true` excludes the new fixture. Popups are explicitly closed after open-surface checkpoint audits to avoid leaving Tabster's background-hiding state behind. Mouse/media state is restored after each case.

Known unchanged stable-story findings have strict, scenario-specific assertions:

- Shape: only `label`, exactly four nodes bound in order to the second picker's actual native range inputs; empty computed accessible names and exact failure summaries.
- Channels: only `label`, exactly three nodes bound to the three actual range inputs; the same exact missing-label summary.
- Open Popup: exactly one unnamed modal dialog with the actual surface node, dialog/aria-modal attributes, empty computed name and exact dialog-name failure summary.
- Popup/Swatch Tabster sentinels: only the explicitly classified pair of `<i>` nodes. Both must have the exact Modalizer/Mover first/last markers, `aria-hidden=true`, role=none and, when violations are reported, tabindex=0 and the exact focusable-content failure summary. The named profiles distinguish a two-node aria-hidden-focus violation from Tabster focus redirection; no other rule or node is permitted.
- Popup-only incomplete profile: exactly `aria-hidden-focus` on the same two sentinels, with no any/none checks, exactly one all-check `focusable-modal-open`, serious impact, null data, the exact manual-review message and one matching related node per sentinel. The sentinel must be tabindex=0 with computed content-visibility=hidden. This is retained as a manual-review finding, **not called an accessibility pass**; real focus-trap traversal is independently verified in R3.07. All other incompletes fail.

Every audit saves evaluated rule IDs, precise targets/HTML/failure summaries and incomplete check metadata. The suite does not patch labels or sentinels in stable stories to obtain a false clean audit. Gradient evidence records computed layer order/direction, hue color, selected channel values and thumb color; test assertions measure both thumb-center coordinates within 0.1 CSS pixel.

## Historical evidence, corrections and limits (pre-integration)

`reports\round-N-attempt-M-summary.json` and the corresponding XML/log retain unique executed titles, exact counts, full audit records, extra checkpoints and gradients. Failed attempts remain available. Round 1 corrected an assumed 2px gap to the actual 4px token. Round 3 identified the exact current Chrome/axe modal sentinel incomplete profile and corrected popup cleanup so subsequent fixtures could not be silently hidden. Round 4 corrected out-of-iframe RTL dragging and asserted the actual active-axis Tab behavior. All corrections are confined to this directory; production source behavior is preserved.

`preservation-before.json` hashes 887 existing files, including pre-existing dirty/untracked work, color-picker sources, shared Cypress files, root configuration/lockfiles and the prior ColorArea artifacts. `preservation-after.json` verifies their bytes, outside-scope status, HEAD and branch against that original snapshot.

### Verified execution results

| Evidence          | Tests | Failures / skipped | End-of-test audits | Extra checkpoints | Gradients |
| ----------------- | ----: | ------------------ | -----------------: | ----------------: | --------: |
| round-1-attempt-2 |    21 | 0 / 0              |                 21 |                 0 |         0 |
| round-2-attempt-1 |    45 | 0 / 0              |                 45 |                 0 |         0 |
| round-3-attempt-4 |    60 | 0 / 0              |                 60 |                 4 |         0 |
| round-4-attempt-4 |   112 | 0 / 0              |                112 |                 7 |        19 |

Final scoped formatting, typechecking and lint all exit 0; unchanged-source baseline typechecking and lint also exit 0. The final 112 end-of-test audits include 109 clean fixtures, exact Shape/Channels labeling profiles and the exact two-node Swatch sentinel violation profile. Five open-popup checkpoint audits retain the node/check-exact modal sentinel incompletes, rather than claiming a clean accessibility result. The two remaining checkpoint audits run in actual forced-colors media.

**Preservation exception:** the strict global preservation check detects concurrent work and intentionally exits nonzero: 886/887 original hashes remain unchanged, while `packages/react-components/react-table/library/src/components/DataGrid/DataGrid.test.tsx` changed. Master HEAD also advanced, including `3317e4d5 test(react-table): expand DataGrid root state keyboard and accessibility coverage`; outside-scope Git status therefore differs. This task created no commit/branch and performed no write to that file. All captured color-picker, prior ColorArea and shared configuration hashes remain intact. No concurrent work is reverted or masked by recapturing the baseline; exact HEAD/status/commit/path differences are retained in the preservation report.

This is browser functional/contract coverage, not a measured line/branch-coverage percentage. It runs Chrome 154/Cypress 14.4.1 on installed Windows dependencies. The existing default `node` is v18.20.6, below the repository's declared Node 22/24 engine range; no runtime/dependency replacement is performed. No Firefox/WebKit, real assistive-technology session, touchscreen hardware, live external transparency-image availability, or global repository suite is claimed.

HEX/RGB validation and popup/swatch/reset state are application-story behavior, not new built-in ColorPicker APIs. The suite deliberately preserves current uncontrolled slider fallback, RTL physical-coordinate versus mirrored-visual behavior, and popup Cancel draft retention. Known story accessibility findings remain unresolved because production/stable-story edits are outside scope. No independent review agent or separate review pass is performed.
