# TeachingPopoverSurface functional coverage (row 140)

## Native sentinel audit readiness

The labelledby/describedby standalone case also observes settled Surface
animations and actual heading visibility/exposure before its unchanged full
audit. The loaded sweep recorded a `heading-order` incomplete
(`Unable to determine previous heading`), not a naming violation. The installed
axe rule compares visible heading ancestry snapshots; animation and exposure
are relevant readiness premises, not proof of the precise race. A trial requiring
a body-owned Root sentinel failed because this standalone fixture does not
require that sentinel; that unsupported premise was removed. The original h2,
rendered name/description assertions, clean audit oracle
and all other 89 cases remain unchanged; no heading is relabelled or hidden, and
no finding is filtered.

The five unchanged stable-story open audits now wait for the real Modalizer and,
where present, Mover sentinels to initialize their native `top` and `left`
placement. The bounded check retains the original Surface, exact globally unique
static selectors, sentinel references, parents, ownership attributes and empty
native sentinel shape throughout the wait. No coordinates or attributes are
written by the test.

This avoids comparing an AXE HTML capture taken before asynchronous placement
with later live markup. Raw AXE findings, exact expected rule/node inventories,
HTML equality, classifier guards, real story actions and final closed-stage
exposure assertions remain unchanged. The same small placement-wait helper also
serves the existing modal and child-iframe readiness checks without changing their
premises. There are no sleeps, retry increases, filtered findings, story edits or
component source changes.

Implementation-only handoff for the parent's initial and fresh repeat reviews.
No review or commit is performed by this component's runner. The parent owns the
separate commit and final campaign verification.

## Scope and source inventory

All authored files, configuration, receipts and captures are under this component.
There was no tracked or untracked Surface Cypress spec at entry. The eight original
production, unit and conformance-snapshot files remain byte-identical; the canonical
`TeachingPopoverSurface.cy.tsx` contains exactly one fixture import. No sibling,
public export, production API, stable story, parent configuration or dependency is
changed.

Read-only contract sources:

| Source                                                                                                                                                                            | Contracts exercised                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `TeachingPopoverSurface.tsx`, `.types.ts`, `useTeachingPopoverSurface.ts`, `renderTeachingPopoverSurface.tsx`, `useTeachingPopoverSurfaceStyles.styles.ts`, `index.ts`            | Native div slot, complete hook, actual inherited state, custom-style ordering, render function, refs, styling and exports                     |
| Original `TeachingPopoverSurface.test.tsx` and `__snapshots__`                                                                                                                    | Existing conformance suite and original default portal snapshot; no updates                                                                   |
| Teaching package `src/index.ts`, `src/TeachingPopoverSurface.ts`, `etc/react-teaching-popover.api.md`                                                                             | Actual source/public component, props, slots, state, hook, style hook, renderer and class-object identity                                     |
| Teaching package `docs/Spec.md`, `README.md`                                                                                                                                      | Composition, appearances, focus inheritance, actual five consuming stories                                                                    |
| Inherited `PopoverSurface` types, hook, style hook, renderer and units                                                                                                            | Source role/ARIA overrides, modal attributes, event order, intrinsic arrow, native root styles, portal rendering                              |
| `Popover` hook, renderer, context-values hook; `popoverContext.ts`; `PopoverTrigger` hook                                                                                         | Actual owner-only open/focus/position/portal options, controlled requests, hover/scroll, caller IDs and nested owners                         |
| Portal hook, mount-node hook, types; positioning arrow styles                                                                                                                     | Real custom element/class destinations, default portal cleanup, native shadow/iframe element destinations, arrow dimensions and placement     |
| Motion presence/ref forwarding; Tabster `useModalAttributes` and public `getTabster().focusedElement`                                                                             | Actual animation completion, merged refs, focus restoration readiness, legacy versus inert navigation                                         |
| Teaching Body/Header/Title/Footer implementations                                                                                                                                 | Real child context and styles; no invented Surface context-values or base-hook export                                                         |
| `TeachingPopoverDefault`, `TeachingPopoverAppearanceBrand`, `TeachingPopoverCarousel`, `TeachingPopoverCarouselAppearanceBrand`, `TeachingPopoverCarouselText` stable story files | Entire stories imported and mounted unmodified, including their real Surface, images, Header, Body, Footer and carousel content               |
| Inherited Popover `docs/Spec.md` accessibility section                                                                                                                            | Documented dialog/group, focus, keyboard, nesting and outside-interaction policies; differences from current implementation are characterized |

`testing/types.stories.tsx` compiles actual props/slots/state/native-role aliases,
public facade identities and forwarded div markup. Negative contracts reject
Surface `open`, `positioning`, `appearance`, `trapFocus`, `withArrow`, `mountNode`,
a separate `root` slot, an alternate `section` tag, SVG refs, and nonexistent base
and context-values exports. The owned React 19 JSX bridge uses the real Fluent
intrinsic aliases. Fixtures use `.stories` names and the normal, discoverable
`testing/tsconfig.json`, not a lint-service proxy or ignored test directory.

## Case trace

`testing/suite.stories.tsx` synchronously registers **23 / 62 / 90** unique cases
for rounds 1 / 2 / 3. Full coverage is the default, without an environment option.
Registration inside a running case throws. The following ordinal trace corresponds
to the exact titles in each raw `manifest.json` and JUnit name/classname pair.
Parameterized rows are distinct source-relevant contracts, not arbitrary padding.

| Full ordinal | Contract                                                                                |
| ------------ | --------------------------------------------------------------------------------------- |
| 1            | Contextless portalled native div, group, no modal/tabindex/arrow                        |
| 2            | Both source classes and caller class                                                    |
| 3            | Explicit label versus native title metadata                                             |
| 4            | Labelledby precedence and describedby actual text                                       |
| 5            | Native language, direction, hidden false and data metadata                              |
| 6            | Real Tab/Shift+Tab from explicit root tabindex zero                                     |
| 7            | Negative root tabindex and programmatic focus                                           |
| 8            | Contextless Escape: fallback content ref, prevented native event, no close              |
| 9            | Exact native mouse, pointer-down/up and click consumer handlers                         |
| 10           | Text, fragments, elements and null children                                             |
| 11           | Caller padding, radius, minWidth and color styles                                       |
| 12           | Source padding/radius/minWidth/border/filter and measured rectangle                     |
| 13           | Actual forwarded div and null ref/portal cleanup on unmount                             |
| 14           | Callback ref attachment and null detachment                                             |
| 15           | Public complete hook/style/render state                                                 |
| 16           | Owner nontrap group and default teaching arrow                                          |
| 17           | Escape owner request before original consumer handler, exact same event                 |
| 18           | Consumer preventDefault is too late to veto Surface request                             |
| 19           | Child stopPropagation prevents Surface key handler                                      |
| 20           | Native non-Escape key remains unprevented and does not close                            |
| 21           | Controlled accept and controlled refuse                                                 |
| 22           | Still-open controlled group checkpoint before real external closure                     |
| 23           | Exact unnamed standalone-dialog negative finding                                        |
| 24           | Owner default modal dialog and first-action autofocus                                   |
| 25           | Explicit root tabindex directs owner autofocus to the container                         |
| 26           | Native role/aria-modal overrides precede context defaults                               |
| 27           | Actual default-trap Tab/Shift+Tab wrap                                                  |
| 28           | Nontrap native Tab leaves Surface without a dismissal                                   |
| 29           | Inert navigation metadata, not native inert                                             |
| 30           | Owner disableAutoFocus, then explicit inside focus                                      |
| 31           | Explicit owner trap listens to inside-to-outside focus                                  |
| 32           | Implicit teaching trap does not install that owner listener                             |
| 33           | Child preventDefault alone still reaches Surface Escape                                 |
| 34           | Latest callback and owner size/arrow update preserve root                               |
| 35           | Body text update preserves DOM, ref and ARIA description                                |
| 36           | Owner content/arrow and consumer root refs merge and clear                              |
| 37           | Actual enter/exit motion finish and DOM lifetime                                        |
| 38           | Inline DOM order and source z-index                                                     |
| 39-41        | Small/medium/large arrow height thresholds; teaching padding wins                       |
| 42-45        | Above/below/before/after measured target geometry and arrow placement                   |
| 46           | coverTarget with OMITTED withArrow, source teaching overwrite                           |
| 47           | Explicit owner arrow false                                                              |
| 48-52        | Light normal/brand, dark normal/brand, type-supported inverted tokens                   |
| 53           | Real RTL mirrored before placement and portal direction                                 |
| 54           | Element portal destination retained after Surface closes                                |
| 55           | Generated fallback portal class and cleanup                                             |
| 56           | Object element ignores fallback-only class                                              |
| 57           | Custom style hook observes styled source classes                                        |
| 58           | Root slot children render function forwards props/styles/merged ref                     |
| 59           | Caller root background wins while child owner context remains brand                     |
| 60           | Real Header/Body/Title/Footer brand-context composition                                 |
| 61           | CDP forced-colors media and actual positive system foreground/background                |
| 62           | Open default modal audit, then observed trigger restoration                             |
| 63           | Controlled refusal modal checkpoint, then actual external close                         |
| 64           | Native hover source identity and delayed leave consumer/request order                   |
| 65           | Pending trigger leave cancelled by Surface enter and native inside action               |
| 66           | Inside action preserves root; trusted outside click closes                              |
| 67-68        | Native outside wheel with closeOnScroll enabled/disabled                                |
| 69           | Real content wrapping inside measured caller maxWidth                                   |
| 70           | Native inside scrolling with maxHeight does not invoke outside-dismiss                  |
| 71           | CSS minWidth wins over smaller maxWidth unless caller overrides minimum                 |
| 72           | Actual viewport resize preserves root and updates horizontal placement                  |
| 73           | Frozen owner, Surface and style props remain unchanged                                  |
| 74           | Public recomposition changes actual state parameters and preserves identity             |
| 75           | Runtime public facade/source index identity and absent invented exports                 |
| 76           | Open owner unmount leaves no native Escape/click/wheel requests                         |
| 77           | Source default has no aria-controls; caller Surface ID retained                         |
| 78           | Independent owners, caller matching ARIA IDs and separate refs                          |
| 79           | Nested inline owners and child Escape propagation boundary                              |
| 80-81        | Real outside iframe focus default/opt-out, raw full iframe audits                       |
| 82-83        | Unmodified stable Default/AppearanceBrand with decoded images and real actions          |
| 84           | Native title names an explicitly authored standalone dialog                             |
| 85           | Exact critical unnamed native-image negative finding                                    |
| 86           | Valid HTMLElement inside shadow root: native action, full open audit, cleanup           |
| 87           | Iframe-document portal: actual refs, trusted child input, full open/closed frame audits |
| 88-90        | Unmodified Carousel/CarouselBrand/CarouselText: three real pages and Surface cleanup    |

Native interactions use installed `cypress-real-events` CDP commands. Focus setup
uses the public Tabster observed element before default trigger opening; ordinary
programmatic focus setup is not falsely described as a physical keyboard/pointer
operation. Source callback assertions use the actual original events and their
native `isTrusted`. The installed native coordinate helper accounts for both AUT
and nested iframe scaling. No hand-generated click is mislabeled trusted.

The five stable stories use deterministic local SVG responses to their existing
URLs. Assertions require `complete`, natural dimensions and successful `decode`,
not a network interception receipt. Each has a positive browser capture. Carousel
checks the readable active page, removal of nonactive card contents, tab/count
state, real next/previous/finish/close and measured Surface height/root survival.
This suite makes **no claim of delivered carousel announcement**.

## Accessibility receipts and limitations

Final closed-stage restoration and the complete strict audit/classification
chain now run at each matching case body's tail. The existing in-body
`close()`/hidden-ancestor check and the same final closed-stage recheck both
remain; a late re-hide fails that testcase rather than aborting the last 28
cases through `afterEach`. All original viewport/cache/hover/media/listener
setup and case-local cleanup keep their effective order.

### Native Modalizer initialized-placement prerequisite

Only the existing default-modal and controlled-refusal modal checkpoints now
require initialized native dummy placement immediately before their original
AXE scans, after the original opening/settling/refusal interactions. The exact
V1 core was restored from its byte-verified archive; no diagnostic observer or
probe code remains in this candidate.

Each prerequisite captures the active Surface and its exact first/last native
Modalizer pair once. Its qualified native selectors use the same convention as
the independent static selectors already accepted by the strict modal validator.
Both resolutions must be unique and identify the same real nodes. Bounded Cypress
assertion retries retain those original references: replacement, missing nodes,
wrong parent/owner/marker or disconnection cannot pass by recapturing a new pair.
The native markers, empty `I` shape, ARIA/tabindex/role and fixed positioning remain
required before and during the placement check.

Installed Tabster 8.8.0 `DummyInput` creates these fixed-position inputs without
top/left. Its queued `_computeTransformOffsets` starts numeric offsets at zero,
adds scroll offsets only from transformed ancestors, then `setTopLeft` assigns
the captured numeric offsets to the first/last inputs. These two unchanged
no-scroll fixtures have zero offsets, including the positioned Surface's translated
ancestor context. Source-derived controls exercise that bound calculation and
distinguish an actually scrolled transformed context; the zero expectation is
not generalized to iframe, shadow, stable-story or other transformed-root profiles.
The prerequisite reads only the original nodes' inline CSS and requires `top`
and `left` to be `0px`, not merely absent, parseable or mutually equal.

Both preserved real diagnostic baselines passed 90/90:
`2026-10-09T14-51-50-839Z-surface-native-sentinel-forensic-54856` and
`2026-10-09T14-57-03-609Z-surface-native-sentinel-forensic-second-bounded-sample-76792`.
Their cleanup traces show the same native references acquiring the source's
top/left initialization before AXE, then retaining exact HTML through raw
persistence and comparison. Initialization delivery preceded AXE by 341.0 and
344.1 ms, respectively. These are observation/delivery intervals, not timer
registration or mutation occurrence timestamps. Diagnostic overhead is unquantified.
The earlier failed restoration's writer and same-node continuity across its failing
capture/comparison interval were not directly traced; its failed receipt remains
preserved. This candidate asserts the supported necessary source boundary, not a
claim that production cleanup or the earlier failed interval has been repaired.

No sleep, layout/ComputedStyle/scroll probe, queue/private-engine API, DOM write,
cache warming, extra AXE scan or snapshot normalization is introduced. All 90
titles and 214 original `expect` calls remain. The complete post-scan raw/classified
validator, native Root/modal selector identity, unnormalized HTML/style and
related-node equality, classifier probes, inline closure and final closed-stage
recheck remain unchanged. A later style drift still fails the original comparison.
The parent owns the V2 manifest against the original 13:01 passing base and the
fresh full mutation/restoration cycle before any commit.

### Iframe key callback presence

The preserved V2 native-key-forwarding trial completed all 90 cases with four
assertion failures and one incidental null `firstCall.args` TypeError in the
existing iframe portal case. Its single native Escape now requires the consumer
key callback to have been called exactly once before the unchanged payload read,
using the same Cypress assertion style as the existing click callback.
All original iframe ref/document identity, CDP interactions, trusted-event checks,
full raw frame audits and exact sentinel HTML/style proofs remain unchanged.
V3 adds no case, audit, producer or harness change. The original failed receipt
and exact passing V2 restoration remain preserved; the parent owns V3 sealing
against the original 13:01 base and the fresh full cycle after the separately
approved bounded-ledger harness fix is frozen.

### Plain child-body Root initialized placement

Only the existing iframe portal open checkpoint now requires initialized placement
immediately after its original native click/trust check and before its existing
`iframe-surface-open` AXE scan. Its child document, child window, body autoRoot and
exact first/last native Root pair are captured once. The original child-native
targets `i:nth-child(1)` / `i:nth-child(3)` must uniquely identify the same nodes
as independent direct-body first/last selectors. Bounded assertion retries retain
those references, document/body ownership, parentage and exact
`Root, tabbable=true, isOutside=false` fields; replacement or recapture cannot
turn a missing or wrongly owned pair into a pass.

The preserved V3 restoration
`2026-10-09T17-38-50-919Z-restore-TeachingPopoverSurface-native-key-forwarding-74952`
failed the first Root's exact live/captured HTML comparison: the open raw snapshot
lacked top/left, while live HTML and the later genuine failed-final capture had
`top: 0px; left: 0px`. The open checkpoint aborted before Escape. This is consistent
with bound Tabster's queued dummy initialization, not evidence of a closure repair;
the failed interval's actual writer and same-node continuity were not directly traced.
The exact V3 restoration subsequently passed 90/90 and both receipts remain unchanged.

For this plain `srcDoc`, the raw Body is the `{"root":{}}` autoRoot and the physical
offset chain is native `I -> BODY -> HTML`. The bound offset calculation starts
at numeric zero and adds scroll offsets only from transformed physical ancestors.
Outer iframe placement/transform, the content main's transform and Portal's
virtual-parent focus/containment traversal are not that chain. Native iframe
source-derived controls confirm zero for this context and a nonzero result for
a transformed/scrolled child body. Therefore this fixture alone requires fixed
inline `top`/`left` of `0px`; no iframe-global zero assumption or layout/scroll probe
is introduced, and Root focus/tabbability behavior is not altered.

The final audit has no new gate. All original native frame/shadow paths, Root
identity/fields, related-node equality, full unnormalized post-persistence HTML/style
comparisons, CDP/trusted payload checks, modal placement and key callback premises
remain unchanged. Later drift still fails the original comparison. No DOM write,
private-engine call, arbitrary delay, cache warming, additional AXE scan or snapshot
normalization is added. The parent owns V4 sealing against the original 13:01
passing base and fresh full-cycle acceptance under the frozen bounded wrapper.

The original unconditional final hook also audited already-failed bodies.
Operational `afterEach` preserves genuine raw-only final capture for an actual
failed case whose final scan never started and whose acquisition/write is not
unfinished. `failedCaseDiagnostic: true` remains `classified: false`: it never
runs semantic normalization, writes a classified-success overwrite, or claims
an accessibility pass. Successful cases retain both original raw/classified
writes, exact native modal selector identity proof, frame/shadow traversal,
sentinel checks and classifier probes. Started scans and unfinished operations
are not retried; transport errors remain explicit, and no checkpoints are
fabricated or backfilled.

Every new case has a full-default, unfiltered axe audit of the real nonempty stage
plus owned light-DOM portals. There are **90 final / 100 total** audits in the full
round. The additional ten checkpoints are controlled group refusal, default modal,
controlled modal refusal, all five stable stories, shadow-open and iframe-open.
The controlled modal is audited while still open; final audits follow verified
actual closing interactions, not silent scene replacement to hide a modal.

Iframe audits load the installed raw `node_modules\axe-core\axe.min.js` into both
real windows. They assert positive frame-descendant passes; shadow-open likewise
asserts real descendant traversal. Webpack's bundled `axe.source` is not used as
an independent browser engine. No rule is disabled or finding filtered.

| Exact profile                                          | Raw findings retained                                                                                                                                               |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unnamed standalone dialog, final                       | One serious `aria-dialog-name`, exactly `#surface`, three exact naming checks                                                                                       |
| Unnamed native image, final                            | One critical `image-alt`, exactly `#unnamed-image`, five exact alternative-text checks                                                                              |
| Default modal and controlled-refused modal checkpoints | One serious `aria-hidden-focus` incomplete, exactly two source Modalizer sentinels and `focusable-modal-open` checks                                                |
| Five unchanged stable open stories                     | One serious unnamed-dialog violation plus exact Modalizer/Mover sentinel incomplete nodes                                                                           |
| Actual iframe-document portal, open AND closed         | One serious `aria-hidden-focus` violation with exactly two iframe Root sentinels and `focusable-not-tabbable` checks; provider remains mounted for the closed audit |

The full round retains **9 violation-bearing / 7 incomplete-bearing audits**;
five stable audits have both. Eleven classifier-guard receipts reject unknown
rules, duplicate rules/nodes, unknown checks, wrong targets and wrong severity.
Profiles are static and title/phase-bound, including exact checks, data, severity,
empty check lists and real sentinel marker/HTML/related-node equality. The Node
runner independently reconstructs and checks the unfiltered raw finding shapes.
This is **not a clean-accessibility claim**.

Other source characterizations, not production repairs:

- Teaching defaults overwrite Popover's coverTarget arrow suppression when
  `withArrow` is genuinely omitted; that case explicitly verifies omission.
- `inverted` remains type-supported although the Teaching spec deprecates it.
- `inertTrapFocus` selects nonlegacy navigation metadata; it does not set native
  `inert`. The explicit owner trap installs the focus-out listener; its implicit
  teaching default does not.
- Surface has no automatic aria-controls/ID linkage, separate base hook, separate
  Surface context-values hook, owner-only props or alternate native root tag.
- Shadow destination native actions and cleanup work, but automatic observed
  trigger restoration does not. That case explicitly asserts nonrestoration
  rather than forcing focus and claiming success. Caller inline styles are used
  there; document-level Griffel sheets are not claimed to style a shadow tree.
- Forced-colors changes actual system foreground/background; the source filter
  remains drop-shadow rather than an invented forced-colors-specific reset.
- Hover may deliver more than one genuine enter while layout settles. Every
  consumer enter is matched to its original source request event; the final leave
  ordering assertion is scoped to the independently observed hovered Surface.

Animation readiness observes actual running animations and completed source
motion callbacks. Closed-stage readiness observes Tabster exposing the actual
controls again. There are no fixed sleeps, test retries, production DOM patches,
moved Surface nodes, blanket incomplete allowances or snapshot updates.

## Commands and CI registration

Run from `packages\react-components\react-teaching-popover\library` on Windows.
Dependencies and built CommonJS Cypress helpers are already installed.

```powershell
$runner = 'src\components\TeachingPopoverSurface\TeachingPopoverSurface.run.cjs'
node $runner cypress 1 row140-final
node $runner cypress 2 row140-final
node $runner cypress 3 row140-final
$node22 = 'C:\Users\jabrassi\.scout-instances\local-test\copilot\session-state\e2e8f1b0-53a4-4784-81a2-ee19461b7b31\files\runtime\node-v22.20.0-win-x64\node.exe'
& $node22 $runner standard 3 row140-final
& $node22 $runner checks 3 row140-final
& $node22 $runner units 3 row140-final
& $node22 $runner isolation 3 row140-final
& $node22 $runner discovery 3 row140-final
& $node22 $runner invalid 3 row140-final
& $node22 $runner registered 3 row140-final
& $node22 $runner sync 3 row140-final
& $node22 $runner preserve 3 row140-final
& $node22 $runner seal 3 row140-final
```

Direct Chrome uses Node 18.20.6; ordinary Chrome uses Node 22.20.0 and unchanged
package `cypress.config.ts`. The runner prepends its executable directory to child
PATH. Ordinary discovery is the canonical `.cy.tsx` file with one fixture import.
No authored private entry metadata, evidence path, Cypress task or required
Cypress environment parameter is needed. Missing `entry.json` lazily bootstraps
read-only original/outside metadata; recursive owned source enumeration includes
new tracked and untracked fixtures rather than treating new tracked fixtures as
original production. Invalid modes/rounds/labels/argument counts are rejected
before tool or metadata writes. Port **46140** is probed before either browser
path; another listener is never killed.

`testing/ci/project.json` registers `teachingpopoversurface-functional-tests` as an
application tagged `vNext`, `platform:web`, `test`. Both real e2e and type-check
targets retain the genuine `scripts-cypress:build` prerequisite and inherited root
target defaults. Implicit producer, aggregate and stable-story consumers are
declared. Discovery checks real production/fixture/canonical/story/aggregate files,
Nx file-map ownership and absence of reverse producer/application cycles.

Cold registered execution is a separate limitation, not bypassed:
`registered` runs ordinary e2e/type-check first, then explicitly named
`--skipSync` failure probes to expose the existing unquoted OneDrive path
`generate-api` **TS5023: Unknown compiler option '-'** prerequisite failure.
`sync` runs actual `nx sync --check` and the actual export-maps generator in
**dry-run only**. Existing root `tsconfig.base.json` synchronization/formatting
is not applied or repaired by this component. Cached/direct passing browser
coverage is not presented as a cold registered-CI green.

The unchanged original Jest selector uses the package preset, SWC transform,
setup and Griffel serializer: **17 existing cases, 1 matched snapshot, zero
updates**. Isolation creates the real producer TypeScript program and invokes the
actual package SWC exclusion rules into owned receipts: six original production
modules, **zero fixture inputs/emission**, not merely configuration-string checks.

## Receipt semantics

### Final-sweep modal selector reliability follow-up

The first strict all-component Node 22/CommonJS sweep passed the preceding 2,034
cases before Surface's open-modal checkpoint failed on axe's selector serialization:
`i:nth-child(4)` and the static `#surface > i:nth-child(4)` identify the same
sentinel. This is not a changed rule, severity, check, node count or accessibility
outcome. Only the modal profile accepts two finite spellings for each of the
independently declared first/fourth root-child targets. Both raw and static
selectors must match exactly one element globally and identify the same empty
`i` directly under the unique modal `#surface`, with the exact first/last Tabster
marker, `aria-hidden="true"`, `tabindex="0"` and `role="none"`. Scenario and phase
are checked as an exact static pair. Other profiles retain exact target strings.

`actualShape` and `fullResults` remain raw and unfiltered, including related-node
targets. The separately named `semanticShape` changes only those two proven modal
target spellings. Raw evidence is written before classification, even when a
guard fails. Successful modal receipts include the captured whole browser
document and selector identity proofs; the runner independently reconstructs raw
shapes from full engine results and repeats DOM queries against that document
before comparing the semantic shape to the static expectation. It does not
trust proof flags, omit findings, or derive expected targets from axe output.

The existing classifier guard receipts still reject unknown/duplicate rules,
duplicate nodes, unknown checks, wrong targets and wrong impacts. Each modal
receipt also exercises both finite aliases against a detached real-DOM fixture
and rejects unknown selectors, wrong elements, duplicate/absent matches, wrong
checkpoint context and wrong markers. These guards run within the existing cases:
**23 / 62 / 90 bodies, 90 final / 100 total full-default axe audits, 11 classifier
guard receipts and five captures** remain unchanged at full coverage. The nine
violation-bearing and seven incomplete-bearing audits remain known findings;
this follow-up does not claim clean accessibility or repair production Tabster.

The first follow-up Node 18 run also exposed a mount-time pointer precondition:
a portal can mount under the parked pointer before the scenario's deliberate
enter/leave sequence. That raw failure is retained. The handler scenario now
resets only enter/leave histories after its real outside hover establishes the
starting position, while requiring zero setup click/down/up calls. Those three
activation histories are never erased. The measured native enter, leave, click, down and up still must each
occur exactly once, with trusted original events.

`.evidence` is generated and ignored. Each run records its exact executable,
arguments, cwd, exits, raw logs/JUnit, recursive owned source hashes (including
testing/CI files), outside hashes/status/HEAD before and after, and preservation
deltas. Outside concurrent changes are recorded and preserved, never reverted
or staged. The missing-entry ordinary run's `bootstrap.json` records real first
use and all fixture paths.

The final `seal-r3-row140-final-*` receipt binds only current-source successful
round/browser/check/unit/isolation/discovery/invalid/preservation receipts and
explicitly validated blocked cold/sync receipts. It includes raw audit/capture
hashes, `sourceManifestSHA256`, the implementation-source manifest and
`implementationVerified: true`, while retaining:
`parentInitialReviewPerformed: false`, `parentFreshRepeatReviewPerformed: false`,
`committed: false`, `cleanAccessibility: false`, `coldNxGreen: false`.
Retained development failures and earlier source manifests are not current
approval evidence.
