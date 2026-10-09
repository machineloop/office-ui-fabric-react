# TeachingPopoverFooter functional coverage (row 139)

Component-local implementation for the parent's initial and fresh-repeat review.
No review or commit is performed by this runner. Row 140 is not part of this work.

## Scope and authoritative contracts

The existing component directory had **zero tracked or untracked Cypress specs** at
entry. `TeachingPopoverFooter.cy.tsx` is a new canonical discovery file containing
one import. The existing production files, public exports, 20 component
conformance/snapshot Jest cases and 18 hook Jest cases are unchanged byte-for-byte.
The owner TeachingPopover's original 12 Cypress bodies are outside this scope and
are not imported, replaced, or counted as Footer cases.

Source inventory read before implementation:

- `TeachingPopoverFooter.tsx`, `.types.ts`, `useTeachingPopoverFooter.ts`,
  `useTeachingPopoverFooterStyles.styles.ts`, `renderTeachingPopoverFooter.tsx`,
  component `index.ts`, `src/TeachingPopoverFooter.ts`, and `src/index.ts`.
- `TeachingPopoverFooter.test.tsx`, its original snapshot,
  `useTeachingPopoverFooter.test.tsx`, and `src/testing/isConformant.ts`.
- `library/etc/react-teaching-popover.api.md`, `library/docs/Spec.md`,
  `library/README.md`, the package README, stable story index, description, and
  BestPractices. The package README and Description are empty; BestPractices
  contains unfilled Do/Don't headings, not additional behavior promises.
- All five stable story sources: Default, AppearanceBrand, Carousel,
  CarouselAppearanceBrand, and CarouselText.
- The inherited Popover owner hook/context, Button types/base hook and styles,
  ARIA Button helper, slot/render types, `mergeCallbacks`, and custom style context.
- Read-only owner runner/config/fixtures, unchanged package Cypress/Jest/SWC/TS
  configurations, scripts-cypress helpers, and existing Nx registration patterns.

Footer requires consumer-localized primary text; it does not supply default
labels. It has a mandatory non-nullable primary Button and an optional nullable
secondary Button. Its div root accepts div attributes, **not arbitrary `as` tags**.
Horizontal is the default layout; vertical is the other supported layout.
Appearance comes from the nearest inherited Popover context. There are no Footer
`appearance`, `size`, `onPrimaryAction`, or `onSecondaryAction` props.

With secondary present, primary is just the consumer action; secondary closes.
Without secondary, primary closes. `mergeCallbacks` calls the internal handler
**first**, then the consumer callback, with the same original event. Capture-time
prevention vetoes the internal toggle; prevention inside the later consumer
callback cannot undo it. Owner `preventDefault` is not an acceptance protocol:
only controlled state refusal retains the open panel. Default context is a no-op,
not a fabricated owner event/data API.

The base hook is separate: it exposes root, layout and a stable `handleButtonClick`
without Button slots or appearance. The style hook is exported by the dedicated
`TeachingPopoverFooter` facade, **not** the aggregate `src/index.ts`; recomposition
uses that actual facade and does not edit exports.

The Spec's next/previous/trailing-page string paragraph is inconsistent with
Footer's source/types. Those contracts belong to **TeachingPopoverCarouselFooter**,
a different component. Only Default and AppearanceBrand directly consume Footer.
The other three stable stories are read for this distinction, not artificially
mounted or counted as Footer tests. A real carousel with an ordinary Footer
positively proves that its primary does not change the carousel page.

## Case inventory

The immutable browser manifest records every exact title. Raw JUnit must match
both complete titles and classnames exactly, with root and suite totals agreeing.
No `.only`, `.skip`, fixed sleeps, test retries, DOM relocation, runtime ARIA
repair, accessibility rule filtering, mock native events or production patches
are used.

| Round                                          | Added | Cumulative Chrome cases | Full-default axe audits |
| ---------------------------------------------- | ----: | ----------------------: | ----------------------: |
| 1: source and owner action contracts           |    25 |                      25 |                      32 |
| 2: native/Button/lifecycle/style contracts     |    38 |                      63 |                      88 |
| 3: base/source-only/integration/stable stories |    21 |                      84 |                     118 |

The full round has **84 final audits plus 34 explicit checkpoints**: 27 open-panel,
2 default-open, 1 second-owner-open, 1 refused-open, 1 forced-colors-active and
2 stable-open. The runner verifies exact checkpoint title/phase identities,
including two openings in the outside-close/Escape case.

| Cases in manifest order | Count | Observable assertions                                                                                                             |
| ----------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------- |
| 01-03                   |     3 | Native role/type/text/order, measured horizontal/vertical rectangles, gap, flex, padding                                          |
| 04-08                   |     5 | Omitted/undefined/null secondary, preserved primary, snapshot child semantics, localized JSX                                      |
| 09-12                   |     4 | Native/ARIA root and slot relationships, div ref, class merging, frozen caller props                                              |
| 13-17                   |     5 | Public recomposition, undefined/brand/inverted context defaults, consumer appearance override                                     |
| 18-25                   |     8 | No-owner action, exact original event/payload/order, prevention timing, controlled refusal/acceptance                             |
| 26-32                   |     7 | Real CDP Enter/Space for both slots and primary-only; Tab/ShiftTab order                                                          |
| 33-39                   |     7 | Native disabled, disabledFocusable and aria-disabled action guards; real focusability                                             |
| 40-45                   |     6 | Actual form button/submit/reset, omitted type, native name/value/submitter, disabledFocusable default-action veto                 |
| 46-51                   |     6 | Native anchor attrs/roles, helper keyboard trust, disabled link, slot functions/suffixes and Button refs                          |
| 52-59                   |     8 | Base shape, latest context/action/owner closures, stable DOM, defaultOpen/outside close, recomposition and style-provider merge   |
| 60-63                   |     4 | Light/dark x LTR/RTL real horizontal geometry and provider token variables                                                        |
| 64-71                   |     8 | Base original event/veto/identity, nearest context, independent owners, no duplicate dismissal, bubbling composition              |
| 72-76                   |     5 | Native root handlers, brand horizontal/vertical colors/radius, real hover and CDP forced-colors positive controls                 |
| 77-82                   |     6 | Explicit source-only span helper, distinct controlled-refusal events, root/slot suffixes, icon semantics, no carousel advancement |
| 83-84                   |     2 | Whole unchanged Default/AppearanceBrand stories, actual image readiness, primary/secondary/header close and modal keyboard order  |

Native form events and enabled native Button activations are real browser events.
The anchor-without-href helper and explicit **source-only span slot replacement**
use `useARIAButtonProps(...).currentTarget.click()`: CDP key input is native, but
that resulting click has `isTrusted: false`. Four exact trust receipts preserve
this characterization. `Button as="span"` is not a supported public prop.
Source-only replacement does not claim otherwise or invent unsupported refs.

Nonmodal harnesses explicitly use `trapFocus={false}` so named open portals can
be fully audited without focus sentinels. The unchanged stable stories exercise
the actual default modal behavior and the public Tabster focused-element observer.
Animation completion, positive DOM rectangles, image completion/natural width,
actual document focus after capture, and public focus observation precede audit
or dismissal. The standalone fixture initializes the real focus observer through
the public focus-finder hook, not a stub.

The independent-owner baseline rejected a `heading-order` incomplete because
its ancestry changed during AXE, not because its heading text, level, labels or
contrast changed. Real-browser run
`2026-10-09T11-43-02-455Z-footer-heading-forensic-33368` identifies the actor in
`browser-writes/fc22504f-heading-forensics-94.json`: sequences 50-53 record the
same trailing body Root dummy removed/re-added after the second portal during
scan 2. At monotonic 37734.2 ms the heading path was body child 4; mutation
delivery at 37750.3/37750.4 ms records it under child 3, and the result snapshot
at 37755.7 ms retains AXE's cached child-4 path and the incomplete. These are
delivery/snapshot times, not inferred mutation occurrence times.

Stable WeakMap identities prove a same-node reorder, not replacement. The first
owned host was already disconnected and is not this actor. Bound Tabster 8.8.0
`DummyInputManager._ensurePosition` appends its inside-root last dummy when that
node is not the root's last element child. The exact initiating callback stack
was not captured. Probe timing overhead remains unquantified; the observed
structural transition and the intended boundary contract are independently
grounded. Diagnostic source and all raw traces remain preserved, but observer
and probe code are absent from this semantic candidate.

That existing case now captures the first surface's own generated portal host
while open, asserts the live host/surface association, and requires that exact
host to be disconnected after `closed()` before opening owner two. The property
assertion is bounded by Cypress's configured command timeout. This independently
valid lifecycle prerequisite adds no sleep, global host count, DOM mutation,
heading/role change or audit allowance; all 84 titles and original owner/callback
and audit contracts remain intact.

The same case also captures the existing body-owned trailing Root sentinel with
its exact Root marker and native association. After the second portal mounts
and existing `settled()` completes, a bounded retryable assertion requires that
same connected node, unchanged marker and body owner to occupy
`document.body.lastElementChild` before `second-owner-open`. Missing, replaced,
wrong-owner/marker or not-last nodes fail; no node is moved and no engine reset,
fixed wait, body-child count, positional ordinal or opaque identity is hardcoded.

Forced-color assertions compare the actual Button against an authored decorative
system-color swatch, not OS-dependent RGB constants. It is intentionally non-text
and aria-hidden from creation; there is no mutation of production DOM to get a
green audit. The meaningful exposed stage and actual Button remain audited.
Theme/appearance contexts and consumer override styles are explicit fixture
choices, not undocumented Footer APIs.

## Accessibility evidence and inherited limits

Complete final ownership/readiness, geometry, animation and audit verdicts now
run at each matching case body's tail, preserving the original setup/media
reset and case-local cleanup order. The V1 exact retired-host readiness and all
original headings, root counts, callback assertions and classifier probes remain
unchanged. A producer verdict fails its testcase rather than aborting subsequent
cases through `afterEach`.

The original unconditional hook also captured finals for already-failed bodies
(24 such captures in the preserved dismissal-mutant receipt). Operational
`afterEach` retains genuine raw coverage only for an actual failed case whose
final scan never started and whose acquisition/write is not unfinished.
`failedCaseDiagnostic: true` marks that capture unvalidated, not an accessibility
pass or proof of the expected closed/modal state. No started final or unfinished
operation is retried; transport/write errors remain explicit. Successful bodies
still require every original strict verdict, and checkpoints are never fabricated
or backfilled.

Every case runs unfiltered `axe.run` with a positive nonempty visible stage and
all actual owned portal roots. Passes must be nonempty. Unexpected violations
**and incompletes** are rejected; a violations-only assertion is insufficient.
All raw axe results, selected roots, native commands, events, round and retry
identity are retained.

The two stable-open checkpoints retain the exact inherited findings:

| Kind       | Rule/impact                  | Exact targets and checks                                                                                                       |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Violation  | `aria-dialog-name`, serious  | One `.fui-PopoverSurface`, no label/labelledby/title; `aria-label`, `aria-labelledby`, `non-empty-title` checks and exact data |
| Incomplete | `aria-hidden-focus`, serious | `.fui-PopoverSurface > i:nth-child(1)` and `i:nth-child(6)`; only `focusable-modal-open`, null data                            |

Only the two exact stable-story titles at `stable-open` register this static
profile. Source DOM identity/attributes, rule/node counts and impacts, node HTML,
empty any/none checks, related-node target/HTML, and real empty accessible dialog
name are checked. Sentinel nodes must be empty `I` elements, tabindex 0, role
none, aria-hidden true, inside the owned surface, with the precise Tabster
Modalizer registration. Unknown rules/checks/targets/impacts and duplicate
rules/nodes are mutation-guarded. No dynamic learning or blanket waiver exists.

**This is not a clean accessibility claim.** The full round retains 2 known
violation audits and 2 known incomplete audits, with all other audits rejecting
any finding. Neither stable labels nor focus sentinels are repaired or removed.
Two positive stable-story captures and four keyboard trust receipts are required.

## Owned files and ordinary discovery

`TeachingPopoverFooter.cy.tsx` imports `testing/suite.stories.tsx` once. All fixture,
JSX bridge and compile-time contract modules live under component-owned
`testing/`, with `.stories` names. `testing/tsconfig.json` includes **all** those
modules and the canonical entry; it is normally discoverable by the unchanged
parent ESLint project service. There is no parser override and no tracked-baseline
filter that can accidentally omit newly tracked fixtures on a fresh checkout.

Actual TypeScript production program verification finds the original six owned
production inputs and zero fixture inputs. Actual SWC producer execution emits
exactly six JavaScript modules and six maps, zero fixtures. Merely reading
exclusion strings is not accepted. Original snapshots, transforms, serializers,
preset and Jest setup are inherited unchanged by `testing/jest.config.cjs`.

`testing/ciapp/project.json` registers
`teachingpopoverfooter-functional-tests` as an application with
`vNext/platform:web/test` tags, implicit library/consumer/story dependencies,
ordinary `e2e` and explicit `type-check`. Both retain the genuine
`scripts-cypress:build` prerequisite and inherited root defaults.

Actual Nx graph/file-map probes require fixture, canonical, production, consumer
and stable-story changes to affect this application. Consumer/story aggregate
imports use `nx-ignore-next-line`; explicit application dependencies keep affected
selection without creating reverse library-to-consumer/story or application
cycles. No parent registration/configuration is edited.

## Reproduction and receipts

Run from the Windows repository root. Node 18.20.6 is installed as `node`; Node
22.20.0 is the existing runtime below. The runner prepends its own executable
directory to child PATH. No installation or WSL checkout is needed.

```powershell
$runner = 'packages\react-components\react-teaching-popover\library\src\components\TeachingPopoverFooter\TeachingPopoverFooter.run.cjs'
$node22 = 'C:\Users\jabrassi\.scout-instances\local-test\copilot\session-state\e2e8f1b0-53a4-4784-81a2-ee19461b7b31\files\runtime\node-v22.20.0-win-x64\node.exe'
node $runner cypress 1 review-ready
node $runner cypress 2 review-ready
node $runner cypress 3 review-ready
& $node22 $runner standard 3 review-ready
node $runner checks 3 review-ready
node $runner units 3 review-ready
node $runner isolation 3 review-ready
& $node22 $runner discovery 3 review-ready
node $runner invalid 3 review-ready
& $node22 $runner registered 3 review-ready
& $node22 $runner sync 3 review-ready
node $runner preserve 3 review-ready
node $runner seal 3 review-ready
```

`standard` uses the **unchanged package `cypress.config.ts`**, Chrome, the canonical
spec and default full round. `cypress` uses the owned component config on port 46139. An occupied port is reported, never cleared by killing another process.
No private evidence path, entry metadata, task, custom execute target, or
environment-specified spec path is required for first use. `coverageRound` is
only an optional explicit logical-round selector.

Modes, exact rounds and safe labels are validated before metadata or tool
execution. Invalid arguments produce no receipt directory. Missing entry
metadata is lazily, exclusively initialized; an absent original root Cypress file
is never passed to `git show`. The original pre-write inventory is retained
separately in `.evidence/initial.json`.

Receipts live only in ignored `.evidence/`, with unique mode/round/label/time/PID
directories. They contain source hashes before/after, outside hashes and status,
HEAD, actual commands/exit codes, raw JUnit, raw audits, classifier guards, native
trust records and captures. Historical failed development runs remain separate
and cannot satisfy a current-source seal. A historical unit receipt deliberately
failed its source-preservation gate when a simultaneous owned formatting command
changed fixture bytes; final evidence is taken without concurrent owned edits.

The seal requires exactly one current-source receipt for each required mode and
round, matching before/after hashes, exact case/audit totals and explicit blocked
prerequisite records. Its literal `sourceManifestSHA256` binds the full source
manifest, including this document. `parentInitialReviewPerformed`,
`parentFreshRepeatReviewPerformed` and `committed` remain false; an implementation
seal does not authorize review or a commit.

## External cold-CI blockers

Cold registered e2e/type-check are **not green**. Short isolated owned Nx cache
paths expose the real existing `generate-api` failure:
`TS5023: Unknown compiler option '-'`. The shared executor emits unquoted
OneDrive Windows paths for `tsc -p`/`--baseUrl`; both scripts-cypress and the
inherited eslint-plugin prerequisite fail. Earlier longer cache paths stopped
with Windows os error 2; those failures are retained, not treated as build proof.

The `registered` probe uses `--skipSync` **only to expose that existing build
failure**; no prerequisite is removed. The independent sync check reports the
workspace out of sync. The export-map generator is run dry-run only and identifies
the existing root tsconfig formatting change; synchronization is never applied.
No external fixes, empty dependsOn overrides, fake cold success or dependency
bypasses are made. Cached-helper direct/ordinary package Chrome success is
reported distinctly from cold Nx readiness.

The runner records concurrent outside changes plainly without reverting them.
The protected original Footer production/units/snapshot bytes must remain exact.
No staging, committing, nested delegation/review or Surface work belongs to this
implementation.
