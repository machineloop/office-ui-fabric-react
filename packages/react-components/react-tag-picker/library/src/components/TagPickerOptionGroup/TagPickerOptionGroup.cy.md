# Component 122: TagPickerOptionGroup functional coverage

## Scope and source inventory

All authored repository files and the earlier captured reports are in
`packages/react-components/react-tag-picker/library/src/components/TagPickerOptionGroup`.
The shared Windows `fluentui` checkout remains on `master`; no branch switching,
dependency installation, shared configuration changes, or production-source changes were performed.
Each component's test-only commit is gated by a clean repeated adversarial review.
Other threads' files were not edited.

`TagPickerOptionGroup.cy.tsx` is the canonical entry point recognized by standard
`**/*.cy.tsx` Cypress and package TypeScript discovery. It imports the scenario
module and its type-only JSX bridge. The local config selects only this entry
point, so the 55 cases are registered once without changing shared configuration.

Read inventory (paths below are repository-relative unless noted):

- This directory: component, props/slots/state, hook, renderer, styles, exports,
  conformance/default unit test, and its snapshot.
- `packages/react-components/react-combobox/library/src/components/OptionGroup`:
  inherited props, hook, renderer, styles, unit tests. In particular: optional presentation
  label, generated name linkage, user native-prop overrides, label-before-options order,
  inherited class names, flex layout, and the non-final-group separator.
  Current inherited units additionally cover consumer label IDs and explicit external
  `aria-labelledby` precedence; P09/P10/R16 exercise these contracts in the browser.
- `packages/react-components/react-tag-picker/library/src`: `contexts/TagPickerContext.ts`,
  TagPicker hook/context values/renderer, TagPickerInput hook, TagPickerList hook/renderer,
  TagPickerGroup hook, TagPickerOption hook/types, testing conformance helper, and the public
  `etc/react-tag-picker.api.md` group exports.
- **All stable consuming story/docs scenarios:** `react-tag-picker/stories/src/TagPicker/`
  `TagPickerGrouped.stories.tsx`, `index.stories.tsx`, `TagPickerDescription.md`,
  `TagPickerBestPractices.md`, `TagPickerA11y.md`, plus the stories README. The consuming
  Grouped story has two departments, eight rich options, controlled selection, selected-value
  exclusion, conditional group removal/restoration, dismissible tags, and an ignored exhaustion
  sentinel. The actual story is imported and mounted, not replaced by an approximate fixture.
- **All visual-regression consumers:** `apps/vr-tests-react-components/src/stories/TagPicker.stories.tsx`
  and `utilities/getStoryVariant.tsx`: Grouped/default-open, GroupedDarkMode,
  GroupedHighContrast, and GroupedRTL. Functional equivalents use the exact variant themes
  (`webLightTheme`, `webDarkTheme`, `teamsHighContrastTheme`) and direction, plus separate
  default-open/ownership fixtures. The VR StoryWright module itself is not mounted.
- `react-headless-components-preview/stories/src/TagPicker/TagPickerGrouped.stories.tsx` and
  its library group exports were inspected. This is a **different headless OptionGroup
  implementation**, not a consumer of the styled target. Its class/label-slot composition and
  disabled no-match idea inform public-slot/child-composition checks; no claim of testing
  the headless component is made.
- Runner/API prior art: TableSelectionCell's local CJS config, Cypress tsconfig, suite/audit
  helper and traceability; TagPicker's Cypress suite and TagPickerOption's local Cypress suite
  and coverage notes; shared Cypress base config/support/commands; provider custom-style-hook
  context typing.

A targeted reference search across `packages` and `apps` found the stable Grouped story and
the four VR variants as the target's story consumers. API reports/changelog references do
not add independent interaction scenarios. There is no dedicated stable OptionGroup story
or additional group-specific documentation in the tag-picker stories package.

## Traceability

IDs are embedded in test names. Parameterized rows count as separate executable tests.

| ID        |  Count | Source or gap                                   | Strong observable contract                                                                                                                                                                                                          |
| --------- | -----: | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01       |      1 | Actual Grouped story                            | Two named groups, four child options each, resolvable label IDs, hidden avatar decoration and exact secondary text; axe includes the portal.                                                                                        |
| D02       |      1 | Actual Grouped controlled selection             | Pointer selects from each department; tags and counts change; input focus/closed state restores; selected options disappear from their groups on reopening. Grouped-list axe after selection.                                       |
| D03       |      1 | Actual Grouped exhaustion                       | Selecting all managers removes only that group; selecting all eight removes both; no-options sentinel does not create a ninth tag and remains available on reopening.                                                               |
| D04       |      1 | Actual Grouped dismissal                        | Exhausted Managers group reappears with exactly the dismissed employee, while other selected tags remain.                                                                                                                           |
| D05       |      1 | Best-practices Backspace + actual Grouped story | Empty-input Backspace focuses the last tag; the second Backspace dismisses it, focuses its predecessor, and restores its exhausted department. Tab returns to input; reselecting works without disturbing another department's tag. |
| P01       |      1 | Target unit snapshot                            | DIV/group, target and inherited classes, unchanged default children, no phantom label or `aria-labelledby`.                                                                                                                         |
| P02       |      1 | Conformance/native forwarding gap               | Root ref DOM identity, custom ID/title/data/name/class, inherited class retained; standalone axe.                                                                                                                                   |
| P03       |      1 | Inherited label-linkage unit + multiple groups  | Distinct generated IDs, direct first-child presentation labels, resolvable names; axe.                                                                                                                                              |
| P04       |      1 | Public label slot                               | Rich children, SPAN, consumer/inherited classes, title/ref, paired explicit label ID/root `aria-labelledby`; axe.                                                                                                                   |
| P05       |      2 | Optional label gap                              | Both undefined and null omit the slot and generated name; explicit `aria-label` remains; child selection still closes.                                                                                                              |
| P06       |      1 | Native-prop override                            | Explicit root name with generated linkage suppressed preserves the visible label; axe.                                                                                                                                              |
| P07       |      1 | Root/slot callback gap                          | Real label click calls both handlers but never selects; child click bubbles once and selects exactly one value; callback counts/payload.                                                                                            |
| P08       |      1 | Native tabIndex/keyboard forwarding             | Real Tab reaches explicitly focusable group; Enter is forwarded once; Tab moves on.                                                                                                                                                 |
| P09       |      1 | Inherited consumer-label-ID unit                | Custom label ID automatically names the root without a paired root override; real Enter selection still works; axe.                                                                                                                 |
| P10       |      1 | Inherited explicit-name-precedence unit         | Multiple external name IDs override the visible label's custom ID; each reference resolves to the intended text; axe and keyboard close/focus.                                                                                      |
| P11       |      2 | Optional-slot falsy shorthand branches          | Numeric zero and empty-string labels render actual first-child slots with matching root name linkage, unlike null/undefined.                                                                                                        |
| K01       |      3 | Documented keyboard navigation                  | Enter/ArrowDown/ArrowUp from real Tab focus opens both groups, names a real active option, keeps input focus and emits no selection; axe per key.                                                                                   |
| K02       |      1 | Cross-group navigation gap                      | Down/Up crosses headings in DOM order; input remains focused; Enter gives exactly one keydown selection with expected value/selection array and closes.                                                                             |
| K03       |      1 | Navigation endpoints                            | Home/End target first/last options, not department headings.                                                                                                                                                                        |
| K04       |      1 | Type-to-find gap                                | Real typing finds a second-group option; Enter selects its value; typing a group heading never registers a selectable match.                                                                                                        |
| K05       |      1 | Public child composition                        | Disabled **base `Option`** with role override remains navigable, but pointer/Enter emit no selection; enabled child in the next group selects normally.                                                                             |
| K06       |      1 | Cancel/reopen                                   | Escape keeps focus, hides groups, emits no selection; keyboard reopen restores both labels; axe.                                                                                                                                    |
| K07       |      1 | Tab order                                       | Tab leaves input for the following button with no group/heading/option tab stops; closes without selection; Shift+Tab returns.                                                                                                      |
| K08       |      1 | Controlled open/callback gap                    | One true then one false open request; exactly one clicked value/selection; callback data `event` is identical to its event argument.                                                                                                |
| S01       |      3 | VR light/dark/high-contrast variants            | Actual stable Grouped story under exact variant themes: heading font/weight/line-height/padding/foreground token, semantics, axe, and working pointer selection.                                                                    |
| S02       |      1 | VR RTL variant                                  | RTL computed direction, unchanged heading order, default-open composition and cross-group keyboard selection; axe.                                                                                                                  |
| S03       |      3 | Picker size-context gap                         | Medium/large/extra-large retain flex-column groups, 2px gaps, static heading metrics and measured label/option ordering; pointer selection remains usable.                                                                          |
| S04       |      1 | Inherited separator styles                      | Computed non-final `::after` content, thin solid border, padding/negative margin; final group has none; removal changes the remaining group to final.                                                                               |
| R01       |      1 | Dynamic label gap                               | Consumer button updates visible label while preserving generated accessible-name ID; axe.                                                                                                                                           |
| R02       |      1 | Optional-slot/ref lifecycle gap                 | Button removes/restores label, clears/rebinds label ref, removes/restores linkage, preserves root DOM/ref identity; axe.                                                                                                            |
| R03       |      1 | Latest native props/callbacks gap               | Rerender changes title/class/label and invokes only the latest slot/root callbacks.                                                                                                                                                 |
| R04       |      1 | Option collection lifecycle                     | Replacing a keyed group unregisters old option text, registers new text, leaves no stale selection on Enter and yields exact replacement value.                                                                                     |
| R05       |      1 | Moving children between groups                  | Old group becomes empty; new group contains exactly two options; moved value appears once and selects once.                                                                                                                         |
| R06       |      1 | Input-driven dynamic grouping                   | Actual typing removes empty groups; disabled base-Option no-match sentinel does not select; typing restores the correct department/employee and exact callback; filtered-state axe.                                                 |
| R07       |      1 | Empty group gap                                 | Empty heading is never registered as an option; initial activity points to the populated group; heading text + Enter does not select.                                                                                               |
| R08       |      1 | Nested public children gap                      | Both group names resolve; active descendant is the real nested option; Enter produces exact selection; axe.                                                                                                                         |
| R09       |      1 | Mixed public children gap                       | Ungrouped options before/after groups share registration order; Down/End/Up select actual options, not headings.                                                                                                                    |
| R10       |      1 | Controlled selectedOptions gap                  | Already-selected option remains idempotent; repeated other-group selection continues to derive from unchanged controlled array, not internal drift.                                                                                 |
| R11       |      1 | Disabled picker context transition              | Disabled input/groups are skipped by real Tab; consumer enabling + Tab/ArrowDown/Enter restores usable grouping and exact selection.                                                                                                |
| R12       |      1 | Native propagation gap                          | Label `stopPropagation` isolates its callback; does not affect child bubbling/selection.                                                                                                                                            |
| R13       |      1 | Native semantics/style overrides                | Role/description/inline root and label styles override defaults; inherited static classes remain; axe.                                                                                                                              |
| R14       |      1 | Component's custom-style context seam           | Registered provider hook receives both already-styled target slots; overrides visible gap/weight; selection remains functional.                                                                                                     |
| R15       |      1 | Full group/ref lifecycle                        | Unmount clears root/label refs; remount uses a different DOM root and fresh label ID with correct name linkage; axe.                                                                                                                |
| R16       |      1 | Consumer label-ID update                        | Changing a label's explicit ID updates root naming, removes the stale ID and preserves root identity; axe.                                                                                                                          |
| A01       |      2 | Portaled/inline list ownership                  | Both default-open modes: input controls the correct named listbox, exactly two groups, correct actual portal placement, no implicit group tab stops, presentation labels, axe and pointer selection/focus restoration.              |
| A02       |      1 | Multi-instance accessibility/selection gap      | Two nonoverlapping default-open pickers have distinct list IDs and four distinct group-label IDs; keyboard selection belongs only to the second callback/input; axe includes both lists.                                            |
| **Total** | **55** |                                                 | **26 axe audits per complete run.**                                                                                                                                                                                                 |

## Accessibility and API limits

The audit helper includes the mounted main region **and all visible portaled TagPicker lists**.
It asserts nonzero axe passes, passes whose actual nodes contain the target group class, and
zero violations. Each successful audit emits an `AXE_GROUP_AUDIT` record with test name, scope,
total passes, target-group passes and violation count. No axe rule is disabled.

One intentional audit boundary is D02 after selected tags have been added: the complete grouped
list is audited, not the separate selected-tag navigation region. Full-region diagnosis exposed
an existing `aria-hidden-focus` violation on two Tabster `data-tabster-dummy` sentinels inside
the selected-tag region (`tabindex="0"`, `aria-hidden="true"`). Exact offending HTML is preserved
in `TagPickerOptionGroup.cy-round1-diagnostic-details.log`. That external behavior was not
modified or represented as passing. All other audit calls include both main and visible lists.

`TagPickerOption` does **not** publicly expose `disabled`. K05/R06 therefore compose the public
combobox `Option disabled role="option"` as group/list children, rather than spreading unsupported
props, casting fixture props, or claiming a disabled TagPickerOption API. Disabled base options
can be active descendants but selection is guarded. The target group itself has no selection
or disabled-group API.

Current source automatically uses explicit label-slot IDs for the root name (P09/R16);
P04 additionally exercises a paired explicit root override. P10 covers external name
precedence. The earlier claim that explicit slot IDs did not propagate was stale and does
not describe the currently tested checkout. Native role/tabIndex overrides
are tested as consumer opt-ins, not recommended normal picker semantics. Measurements guard
current CSS, not pixel-perfect visual regression.

The best-practices document describes Backspace from the input as removing the last tag.
Current styled-input source instead focuses that tag; a second Backspace dismisses it.
D05 asserts both observable steps rather than making the documentation's one-key deletion
claim pass artificially. With multiple remaining tags, deletion focuses the predecessor;
Tab returns to the input. No production/docs outside this directory were modified.

These are Chromium browser/axe checks, not Narrator/VoiceOver certification. The documented
Narrator scan-mode bug and VoiceOver/Safari/macOS/iOS active-descendant/navigation limitations
require those platforms and assistive technologies. Headless-package behavior, every possible
native DIV attribute, StoryWright snapshots, exhaustive theme combinations and unrelated
TagPicker compositions are not claimed as covered.

## Runner, commands and evidence

Commands run from the shared Windows repository root. The component-local CJS config reuses
TableSelectionCell's support/path/esbuild approach. It selects only this suite, disables
retries/video/screenshots/fixtures, keeps downloads/build outputs local, and
uses port **45122** (override with `WEBPACK_DEV_SERVER_PORT`). Its only warning filter is the
prior-art esbuild include-pattern warning; no exceptions or failed assertions are suppressed.
All pointer/keyboard actions use real events; there are no arbitrary waits, forced clicks,
skips, or uncaught-exception handlers.

```powershell
$p = 'packages\react-components\react-tag-picker\library\src\components\TagPickerOptionGroup'
& .\node_modules\.bin\cypress.cmd run --component --browser chrome --headless `
  --project packages\react-components\react-tag-picker\library `
  --config-file src\components\TagPickerOptionGroup\TagPickerOptionGroup.cypress.config.cjs `
  --spec "$PWD\$p\TagPickerOptionGroup.cy.tsx"

& .\node_modules\.bin\eslint.cmd `
  --parser-options '{"projectService":false,"project":"packages/react-components/react-tag-picker/library/src/components/TagPickerOptionGroup/TagPickerOptionGroup.cy.tsconfig.json"}' `
  "$p\TagPickerOptionGroup.cy.stories.tsx"
& .\node_modules\.bin\eslint.cmd "$p\TagPickerOptionGroup.cypress.config.cjs"

& .\node_modules\.bin\tsc.cmd --project "$p\TagPickerOptionGroup.cy.tsconfig.json" --pretty false
& .\node_modules\.bin\tsc.cmd --project "$p\TagPickerOptionGroup.cy-baseline.tsconfig.json" --pretty false
```

Earlier-round evidence is retained below; it is historical, not the current
validation snapshot. This applies to every earlier component-local
`TagPickerOptionGroup.cy-*.log`, including files whose names contain `run`,
`validation`, `api-verified`, `confirmation` or `final`. They intentionally
predate the canonical entry-point correction and are not proof of its current
execution.

| Evidence                                                                                  | Outcome                                                                                                                                                    |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TagPickerOptionGroup.cy-round1-green.log`                                                | Round 1: 13 passing, 0 failing.                                                                                                                            |
| `TagPickerOptionGroup.cy-round2-final.log`                                                | Round 2: 31 passing, 0 failing.                                                                                                                            |
| `TagPickerOptionGroup.cy-round3-fixed.log`                                                | Round 3: 45 passing, 0 failing.                                                                                                                            |
| `TagPickerOptionGroup.cy-round4-fixed.log`                                                | Round 4: 48 passing, 0 failing.                                                                                                                            |
| `TagPickerOptionGroup.cy-run-confirmation.log`                                            | Earlier 48-test confirmation: 0 failing/pending/skipped, exit 0; 22 successful target-group axe records.                                                   |
| `TagPickerOptionGroup.cy-round5-final.log`                                                | Expanded suite: 55 passing, 0 failing/pending/skipped, exit 0; 26 successful target-group axe records; screenshots 0 and video false.                      |
| `TagPickerOptionGroup.cy-run.log`                                                         | Final formatted-source confirmation: 55 passing, 0 failing/pending/skipped, exit 0; 26 successful target-group axe records; screenshots 0 and video false. |
| `TagPickerOptionGroup.cy-lint.log`                                                        | Suite and CJS config: exit 0, no lint errors/warnings; informational Nx ts-node fallback only.                                                             |
| `TagPickerOptionGroup.cy-format.log`                                                      | Suite and CJS config match existing Prettier style.                                                                                                        |
| `TagPickerOptionGroup.cy-typecheck.log`, `TagPickerOptionGroup.cy-typecheck-baseline.log` | Both exit 2 with the same 14 external diagnostics; no target/suite diagnostics.                                                                            |
| `TagPickerOptionGroup.cy-validation.log`                                                  | Persisted final counts, exact baseline-diagnostic comparison, format/lint exits, and target-local file inventory.                                          |

The baseline tsconfig checks **unchanged target production source and the actual Grouped
story**, inheriting the same compiler settings. The historical comparison exposed
the same 14 imported React/JSX diagnostics in both builds. Both current builds
now include `TagPickerOptionGroup.cy-jsx.stories.ts`, a Cypress-only typed bridge
from legacy JSX interfaces to the installed React 19 namespace. The isolated
builds additionally include `TagPickerOptionGroup.cy-standalone-jsx.stories.ts`
for the two non-mergeable type aliases already supplied by the package's
existing TagPickerList Cypress program. The canonical entry imports only
merge-safe interfaces, avoiding duplicate aliases in the standard package
build. Both the suite and
baseline typechecks exit **0**, without stubs, additional `skipLibCheck`, weaker
test types or shared-config edits. This is not a repository-wide typecheck claim.

Addition rounds were each run immediately; failed runs and diagnostic logs were retained.
Repairs corrected selector scope (selected tags also use `role="option"`), rich-option text,
the actual callback shape/spacing/disabled navigation contract, real-event focus/empty-input
sequencing, and nonoverlapping multiple-picker fixture layout. No production behavior was
changed to make a test pass. Portal inclusion is explicitly audited and asserted.
The latest addition round reused the existing owned suite and added seven tests.
Its failed runs are in `cy-round5.log`, `cy-round5-fixed.log`, and `cy-round5-green.log`
(the latter filename was optimistic: it records a failure, not a green result).
Corrections addressed realPress's non-DOM return subject and the actual two-step Backspace/
post-deletion focus contracts. `cy-round5-final.log` is the successful expanded run.
Earlier logs and screenshot directories predate this round; the current config disables
screenshots and video, and no new screenshot assets were generated.

Authored files: this `.cy.md`, `TagPickerOptionGroup.cy.stories.tsx`,
`TagPickerOptionGroup.cy.tsx`,
`TagPickerOptionGroup.cy-jsx.stories.ts`,
`TagPickerOptionGroup.cy-standalone-jsx.stories.ts`,
`TagPickerOptionGroup.cypress.config.cjs`, `TagPickerOptionGroup.cy.tsconfig.json`,
and `TagPickerOptionGroup.cy-baseline.tsconfig.json`. Generated evidence is contained in this
directory's historical `TagPickerOptionGroup.cy-*.log` files and local Cypress output directories.

## Current validation and dependency-stability review

The authoritative current evidence is under
`C:\Users\jabrassi\.scout\copilot\session-state\5ed21290-e28e-4743-8b3d-3864ac6a202e\files\coverage-121-140\TagPickerOptionGroup`.
`checks.json` records real command exit codes and before/after hashes of all
authored files and the three uncommitted sibling dependencies identified during
adversarial review. `typecheck.log`, `typecheck-baseline.log`, `lint.log` and
`format.log` identify the successful current scoped checks explicitly.

The first adversarial review found no authored-suite functional gap, but raised
the risk of depending on unpublished TagPickerInput/TagPickerGroup repairs.
That risk was checked rather than assumed away: the full **55-case** suite passes
with the working-tree dependencies, with those three dependencies substituted
from a pinned committed `HEAD` only during compilation, and again with restored
working-tree source. Each run has zero failing, pending or skipped tests. All
three committed-source substitutions are proven by markers emitted in the
browser; no production file is changed on disk.

`working-cypress.log`, `head-cypress.log`, `restored-cypress.log` and the matching
mode directories retain the complete results and source-injection evidence.
The dependency hashes are unchanged after the comparison, so unrelated
uncommitted work is preserved. These grouped-option tests do not require the
unpublished sibling repairs to pass; those repairs are not included in this
component's commit.

Accessibility audit records use built-in `cy.writeFile`, not a private Node
task. Each run writes the 26 records to this component's
`.cypress-downloads\axe-audits.json`; verification retains a separate copy for
each execution mode. This keeps audit persistence functional under the
unchanged standard package Cypress configuration as well as the local config.
The original assertions on evaluated rules, target-group participation and
zero violations are unchanged.

The standard package execution is separately captured in
`canonical-cypress.log` and `canonical-results.xml`; verification requires
exactly 55 successful test cases and 26 successful target-group audits there
as well. `canonical-typecheck.log` records the standard package TypeScript
project check. Canonical Cypress uses the installed Node 22 runtime required
by the shipped ESM helper, with retries disabled for this verification.
`direct-cypress.log` and `direct-results.xml` additionally record **55/55**
by invoking the current component-local `TagPickerOptionGroup.cypress.config.cjs`
directly, without the dependency-comparison wrapper. `direct\axe-audits.json`
records the same 26 successful target-group audits on that exact path. Old peer
logs are preserved rather than deleted or overwritten.
