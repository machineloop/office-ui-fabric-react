# TeachingPopover functional coverage (row 137)

## Scope and ownership

This suite exercises the actual non-DOM `TeachingPopover` owner, not a replacement
implementation. All authored files and receipts are inside this component folder.
The existing Cypress entry retains all twelve original tests and gains one
fixture import; its original bodies are checked against the entry HEAD.
Original production files and `TeachingPopover.test.tsx` remain byte-preserved. No sibling component, unit
snapshot, stable story, dependency manifest, parent configuration, or production
library implementation is edited. TeachingPopoverTitle and react-carousel parallel
work are read-only. Parent initial and fresh repeat reviews completed after
the coverage, baseline-preservation and first-use initialization corrections,
with no additional findings.

`TeachingPopover.cy.tsx` has exactly one import of `testing/suite.stories`
alongside its preserved twelve baseline cases.
The ordinary package glob discovers this entry. Browser fixtures and compile-only
contracts have `.stories.ts[x]` names inside `testing/`; the production TypeScript
program and actual SWC output are inspected, not inferred from exclusion strings.
The normal `testing/tsconfig.json` is discovered by unchanged parent ESLint; no
parser override or weakened typing is used.

## Source inventory and traceability

Paths below are relative to `react-teaching-popover/library` unless stated otherwise.

| Read-only source                                                                                                                                                                                            | Contracts exercised                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/TeachingPopover/{TeachingPopover.tsx,TeachingPopover.types.ts,useTeachingPopover.ts,renderTeachingPopover.tsx,useTeachingPopoverContextValues.ts,index.ts}`                                 | Complete hook wrapping `usePopover`, default arrow/focus trap, exact props/state aliases, context/render aliases, non-DOM hierarchy, owner ref absence. There is no separate owner base hook or style hook.                                                   |
| `src/index.ts`, `src/TeachingPopover.ts`, `etc/react-teaching-popover.api.md`                                                                                                                               | Stable public component/hook/render/context entry, genuine positive and negative TypeScript contracts.                                                                                                                                                        |
| `README.md`, `docs/Spec.md`; `stories/src/TeachingPopover/{index.stories.tsx,TeachingPopoverDescription.md,TeachingPopoverBestPractices.md}` in the sibling stories project                                 | Programmatic and triggered teaching ownership, brand appearance, teaching content, three-page tutorial behavior. BestPractices contains no additional normative behavior.                                                                                     |
| All five stable consuming stories: `TeachingPopoverDefault`, `TeachingPopoverAppearanceBrand`, `TeachingPopoverCarousel`, `TeachingPopoverCarouselAppearanceBrand`, `TeachingPopoverCarouselText`           | Mounted unchanged through their real exports; image loading, actual content, header dismiss, primary/secondary controls, three real pages, selected tab names, previous/next/close/finish, text page count. These are five scenarios, not page-count padding. |
| `TeachingPopover.test.tsx`, `src/testing/isConformant.ts`                                                                                                                                                   | Existing targeted Jest conformance suite: nine tests; disabled DOM-root/style expectations are respected. Original transform/preset/setup/Griffel serializer retained, no snapshot updates.                                                                   |
| `react-popover/library/src/components/Popover/{usePopover.ts,Popover.types.ts,Popover.test.tsx,renderPopover.tsx,usePopoverContextValues.ts}` and PopoverTrigger/PopoverSurface producers, styles and units | Controlled/uncontrolled state, original callback events, outside pointer/wheel/iframe focus, hover/context handling, positioning, portal/motion, trap/auto-focus options, ref forwarding and restoration.                                                     |
| TeachingPopoverTrigger/Surface/Header/Body/Footer/Title and their types, hooks, renderers, styles and units                                                                                                 | Read-only interoperability fixtures and documented consuming composition; not independent Body/Footer/Surface/Title coverage campaigns.                                                                                                                       |
| TeachingPopoverCarousel/Card/Footer/FooterButton/Nav/NavButton/PageCount, internal Carousel store/walker/item producers and units                                                                           | Original `{event,type:'click',value}` contracts, controlled selection, announcements, active page DOM, three-tab mover, trailing close/finish, active-content height. No react-carousel production changes.                                                   |
| `react-aria` button enhancement, `react-portal` mount-node utilities, Tabster public focusedElement observer; prior AvatarGroupPopover and TagPickerButton harnesses                                        | Source-based enhanced keyboard click trust, real mount-node object semantics, modal/mover audit profiles, observer and DOM readiness before assertions.                                                                                                       |

## Registered scenarios and audit counts

The initial adversarial review corrected two misleading coverage claims. The
coverTarget case now omits `withArrow`, directly exercising the teaching default
that overrides inherited suppression rather than an explicit true prop.
Carousel navigation is mounted inside the real AriaLiveAnnouncer and verifies
`Lesson two` and `Lesson three` after native Next clicks. Supported native
`document.ariaNotify` calls are spied without stubbing and must carry normal
priority with exact call counts; the announcer's actual DOM live-region route
is asserted when that browser capability is absent. This is browser delivery
evidence, not certification of assistive-technology speech.

The baseline-preservation check restored all twelve existing cases rather than
replacing their entry with the new suite. Complete totals are now 29/66/91:
twelve original cases plus 17/54/79 campaign cases. Raw JUnit must include the
exact original twelve titles and every new title; only the new campaign receives
the additional axe hook. A fresh execution automatically creates its ignored
preservation entry when absent, so no private historical receipt is required.
The normal checks still discover all authored fixtures after that initialization.

Missing-entry execution was exercised by temporarily preserving the historical
entry, running normal checks with no entry present, and restoring the original
receipt afterward. Fresh initialization captured 296 protected files and
formatting, ordinary package ESLint and typing all passed. No historical entry
was overwritten or source changed by that probe. Full direct and ordinary
verification runs subsequently passed all 91 cases, including the exact twelve
original titles, with 79 final and 86 total campaign axe evaluations.

Rounds are cumulative. Omitted round means the complete highest round, both in
the runner and ordinary package execution.

| Round                                                                                                                          | Campaign | Baseline | Total | Full-default final campaign audits | Total campaign audits |
| ------------------------------------------------------------------------------------------------------------------------------ | -------: | -------: | ----: | ---------------------------------: | --------------------: |
| 1: owner defaults, native pointer/keyboard/focus, controlled state and public composition                                      |       17 |       12 |    29 |                                 17 |                    18 |
| 2: inherited props, geometry/theme/RTL/forced colors, portal/customization, hover/context/wheel/focus policy                   |       54 |       12 |    66 |                                 54 |                    55 |
| 3: stable stories, real teaching carousel, immutable/latest state contracts, programmatic owner, refs/motion/lifecycle/iframes |       79 |       12 |    91 |                                 79 |                    86 |

Every new campaign scenario has a nonempty, exposed final fixture and unfiltered `axe.run`.
Live portal checkpoints include the labelled modal, all five stable story dialogs,
and the inherited render-without-context group fallback. Actual iframe audits load
the installed raw browser axe engine into the real AUT and same-origin frame:
the webpack module's serialized source is not a valid independent browser bundle.
No axe rule/tag/impact filtering, iframe exclusion, manual DOM hiding, fake browser
mock, synthetic input dispatch, fixed sleep, or test retry is used.

All scenario titles must be unique, and the exact full title list in the browser
manifest must match JUnit names, classnames, suite totals and all final audit
scenario names. Zero errors, failures, skips, pending tests and retries are
required. Five positive browser captures accompany the complete round. Native CDP
pointer, Enter, Space, Escape, Tab, Shift+Tab, arrow and wheel commands are recorded.

## Honest source characterizations and accessibility limits

The complete functional run is **not a clean accessibility claim**:

| Explicit checkpoint profile                                | Exact retained raw finding                                                                                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Named harness `open-modal` only                            | One serious `aria-hidden-focus` incomplete, two Modalizer sentinels: `#teaching-surface > i:nth-child(1)` and `i:nth-child(5)`.                                   |
| Stable Default/AppearanceBrand `stable-open` only          | Serious `aria-dialog-name` violation on `.fui-PopoverSurface`; two Modalizer sentinel incompletes at `.fui-PopoverSurface > i:nth-child(1)` and `i:nth-child(6)`. |
| Stable Carousel/CarouselAppearanceBrand `stable-open` only | Same missing-dialog-name violation; four sentinel incompletes: surface first, three-tab Mover first and fifth, surface fifth.                                     |
| Stable CarouselText `stable-open` only                     | Same missing-dialog-name violation; two Modalizer sentinels, surface first and `i:nth-child(5)`.                                                                  |

Thus the full round has **five known-violation audits and six known-incomplete
audits**. Each missing-name node has exactly the `aria-label`, `aria-labelledby`
and `non-empty-title` checks; the last has literal `{messageKey:'noAttr'}` data.
Every sentinel check is exactly `focusable-modal-open`, serious impact, null data,
one identical related node, and no any/none checks. Static expected profiles are
independent of observed results. The DOM must identify genuine empty `i` sentinels
with `aria-hidden`, `tabindex=0`, and the specific Modalizer or Mover marker.
Unknown rules/checks, duplicates, changed targets or impacts are rejected by
integrated negative guards. All 79 final audits are clean.

Other asserted source behaviors are deliberately not repaired:

- Teaching defaults are applied after `usePopover`; implicit `trapFocus` does not
  install the explicit-prop owner focus-out listener, and the teaching arrow
  default overwrites the inherited `coverTarget` suppression.
- Wrapped Fluent Button keyboard enhancement calls `.click()`. Original Enter/
  Space callback click events are consequently untrusted despite trusted CDP
  keyboard input; original slot/owner event identity is asserted. Plain native
  button activation is separately asserted trusted.
- Teaching styling wins inherited size padding; size still affects context and
  actual arrow geometry. Inverted remains a supported type/runtime characterization
  even though teaching design documentation deprecates that appearance.
- `mountNode` accepts an element or `{element,className}`, not a root ref.
  `className` decorates generated fallback mount nodes only, not supplied elements.
- A single-surface programmatic owner has no enhanced trigger restoration target;
  its close does not promise focus on an invented trigger or root ref.
- Real hover entry can issue repeated same-state open notifications during pointer
  transit. Each recorded event must retain the correct original type/state/trust;
  no fixed callback count is invented for those separate entries.

Dismissals wait for actual enter animations to finish. Trigger-open paths wait
for public Tabster focusedElement observation before native activation. Closed
audits wait for all real host controls to lose stale `aria-hidden` ancestors, not
just the outer fixture. Positive Cypress captures can leave the browser unfocused;
`Page.bringToFront` plus an actual `document.hasFocus()` readiness assertion precedes
the next native interaction. Historical failed captures/runs remain separate.

## Commands and receipts

From the Windows repository root:

```powershell
$owner = 'packages\react-components\react-teaching-popover\library\src\components\TeachingPopover\TeachingPopover.run.cjs'
$node22 = 'C:\Users\jabrassi\.scout-instances\local-test\copilot\session-state\e2e8f1b0-53a4-4784-81a2-ee19461b7b31\files\runtime\node-v22.20.0-win-x64\node.exe'
node $owner cypress 1 final
node $owner cypress 2 final
node $owner cypress 3 final
& $node22 $owner standard 3 final
node $owner checks 3 final
node $owner units 3 final
node $owner isolation 3 final
& $node22 $owner discovery 3 final
node $owner invalid 3 final
node $owner preserve 3 final
& $node22 $owner registered 3 final
& $node22 $owner sync 3 final
node $owner seal 3 final
```

Direct Chrome uses installed Node 18.20.6; ordinary package Chrome uses installed
Node 22.20.0. The runner prepends its executable directory to the child PATH.
Port 46137 is checked before each run; an occupied port fails without killing
another owner. The ordinary path uses the unchanged package `cypress.config.ts`,
canonical spec, default full round and no private evidence environment/task.

`testing/ci/project.json` registers `teachingpopover-functional-tests` as a vNext/
platform:web/test application. Both ordinary e2e and type-check retain the
scripts-cypress build prerequisite. Test-only aggregate/story imports use
`nx-ignore-next-line` to avoid reverse producer cycles; explicit CI dependencies
retain `react-teaching-popover`, `react-components` and stable stories ownership.
Actual Nx probes check source-only, fixture-only, canonical entry, canonical
consumer and stable-story affected selection, plus the absence of a reverse
producer/application cycle. No parent graph configuration is changed.

Cold registered CI remains **blocked**, not green: Windows generate-api uses an
unquoted OneDrive path and fails with `TS5023: Unknown compiler option '-'` in
retained helper builds. The diagnostic registered probe uses `--skipSync` only
to reach that independently evidenced helper failure; it does not bypass builds.
Sync check reports the existing root `tsconfig.base.json` formatting issue;
export-maps synchronization is dry-run only. No shared fix or synchronization is
applied. These commands exit nonzero and their blocker receipts are sealed as
blocked. No install, WSL migration or shared dependency/config repair is attempted.

Every invocation has a unique ignored `.evidence/<mode>-r<round>-<label>-<time>-<pid>`
receipt, raw logs, exact commands/exits, recursive source-before/source-after
hashes, and outside preservation snapshots/deltas. Browser invocations additionally
have JUnit, manifest, full raw audits, guard evidence, original callback summaries
and positive captures. Successful phases alone receive `outcome.json`.
The final seal requires exactly one current-source receipt for every phase;
historical failures are never relabelled or reused. It binds raw audit files and
receipt hashes and records implementation verification separately from parent
review/commit status. The unchanged original source/unit hashes are in
`.evidence/entry.json` and the preserve receipt. Shared concurrent outside changes,
if any, remain explicitly reported rather than reverted or silently attributed.
