# TeachingPopoverBody row 138 functional coverage

## Final-sweep sentinel comparison correction

The full current-master sweep exposed a timing-dependent comparison between
axe's captured sentinel HTML and the live node: Tabster may add `top`/`left`
positioning after capture. Both captured and live nodes now independently
require the exact accessibility attributes, empty content and fixed hidden
one-pixel sentinel CSS. Findings, targets, checks, severity and related-node
capture identity remain exact. Only transient positional serialization is no
longer used as an accessibility oracle; no node is mutated, no unknown result
is allowed and no test retry is introduced.

Review additionally pinned the positional exception itself: every transformed
ancestor must have measured zero scroll offsets, and captured/live `top` and
`left` must each be either unset or `0px`. Every non-style attribute and every
other inline style/value/priority remains an exact captured/live comparison.
Unexpected positional values therefore fail rather than disappearing behind
normalization.

## Scope and original inventory

Only this component directory is authored. Production component, hook, types,
renderer, styles, index, original Jest suite and snapshot remain byte-for-byte
unchanged. The public root facade, aggregate API, shared configs, dependencies,
all five stable consuming stories, TeachingPopoverTitle and carousel siblings
are read-only. No commit, delegated review, parent review or row 139/140 work is
performed here.

The entry inventory used `git ls-files --cached --others --exclude-standard
'*TeachingPopoverBody*'` and a recursive local file inventory. There was **no
original Body Cypress file**. The original Cypress title manifest is `[]`, with
zero original Cypress cases. The new canonical `TeachingPopoverBody.cy.tsx`
contains exactly one fixture import; no baseline test body was replaced.
`original-entry.json` records the pre-authoring inventory; the runner's
auto-created `entry.json` separately records the original hashes and outside
status. Both are ignored evidence, not prerequisites for execution.

Read source and documentation:

| Resource                                                                                     | Actual contract used                                                                                                                                       |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TeachingPopoverBody.tsx`                                                                    | Forwarded div ref; full hook, source styles, provider style hook, source renderer; display name.                                                           |
| `useTeachingPopoverBody.ts`                                                                  | Native div root, optional span media, caller props, default `mediaLength: short`, slot metadata. There is no Body base hook.                               |
| `renderTeachingPopoverBody.tsx`                                                              | Media before root children, including actual Fluent slot render-function composition.                                                                      |
| `useTeachingPopoverBodyStyles.styles.ts`                                                     | Flex column, root bottom padding 12px; centered flex media, overflow hidden, bottom margin 12px, media grid area, aspect ratios and fixed-height fallback. |
| `TeachingPopoverBody.types.ts`, `index.ts`                                                   | Div root, optional nullable span slot, short/medium/tall union; component-local `useMediaStyles` export.                                                   |
| `src/TeachingPopoverBody.ts`, `src/index.ts`, `etc/react-teaching-popover.api.md`            | Actual public facade and aggregate exports. `useMediaStyles` is available through the individual facade/local index, not the aggregate.                    |
| `TeachingPopoverBody.test.tsx`, snapshot, `src/testing/isConformant.ts`                      | Existing div/ref/class/slot conformance and default native div snapshot; 20 original Jest cases, one matching snapshot.                                    |
| Surface hook/styles and inherited PopoverSurface styles                                      | Body inherits text color and direction; background belongs to the nearest surface, not Body.                                                               |
| `docs/Spec.md`, library `README.md`, stable story index, description and best-practices docs | Documented media lengths, optional media/content composition and carousel consumption. Best-practices document has no additional assertions.               |
| Stable `Default`, `AppearanceBrand`, `Carousel`, `CarouselAppearanceBrand`, `CarouselText`   | Imported unchanged from their original modules; exact media/title/text/actions, three live pages and icon/text navigation.                                 |

## Runtime and type coverage

Cumulative rounds contain **18 / 35 / 53 cases**. Each registered title has one
final audit. Full default round 3 contains **53 final / 65 total audits** and
five positive stable-story screenshots. Registration has no `only`, `skip`,
pending tests, retries, private entry/task path or default-round environment
requirement. The default is the complete highest round.

Numbers below are the exact registration order in the raw title manifest,
JUnit cases and audit receipts. Full verbatim titles, unique JUnit classnames,
raw counters and audit identity are in each successful `summary.json`.

| Case | Source/document basis                 | Distinct functional assertion                                                                                              |
| ---- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1    | Unit snapshot, component, hook        | One native div, stable class/display name, text, absent media/role/tabindex.                                               |
| 2    | Optional slot hook                    | Omitted media creates no wrapper.                                                                                          |
| 3    | Optional slot hook                    | Explicit undefined creates no wrapper.                                                                                     |
| 4    | Nullable media API                    | Explicit null creates no wrapper.                                                                                          |
| 5    | Shorthand hook, renderer              | String becomes one span before the root text node.                                                                         |
| 6    | Shorthand hook                        | Element is wrapped, not cloned or duplicated.                                                                              |
| 7    | Native slot props/styles              | Media id, class, title, language, data and inline margin forwarding.                                                       |
| 8    | Fluent slot renderer                  | Actual render function changes the media component tag while retaining props/order; no unsupported `as: div` public claim. |
| 9    | Intrinsic root hook                   | Native metadata, region name, language/direction/data; no leaked media/mediaLength attributes.                             |
| 10   | Root styles                           | Caller root class and inline direction/padding override generated styling.                                                 |
| 11   | Public refs                           | Callback refs point to actual root and media DOM nodes.                                                                    |
| 12   | Public refs/unit conformance          | Object refs attach without an extra wrapper.                                                                               |
| 13   | Full hook/local exports               | Default short state, exact div/span metadata, undefined media, actual `useMediaStyles` keys.                               |
| 14   | Full hook/styles/renderer             | Frozen root props and frozen media object remain unchanged.                                                                |
| 15   | Source renderer                       | Media, heading, paragraph and native action have exact DOM order.                                                          |
| 16   | Live root/slot props                  | Root/media/keyed descendant identity and descendant state survive prop updates.                                            |
| 17   | Optional slot/ref lifecycle           | Removing/restoring media detaches its ref without resetting descendants or root ref.                                       |
| 18   | Ref/unmount lifecycle                 | Root/media/descendant refs detach; former root is disconnected from real DOM.                                              |
| 19   | Short styles, Spec                    | Actual 288px-wide short media is 117px high.                                                                               |
| 20   | Medium styles, Spec                   | Actual 288px-wide medium media is 176px high.                                                                              |
| 21   | Tall styles, Spec                     | Actual 288px-wide tall media is 288px high.                                                                                |
| 22   | Nullish default in hook               | Omitted and explicit undefined mediaLength both produce short source state.                                                |
| 23   | Media width/supports fallback         | Viewport resize changes actual media width; current supports guard retains fixed 176px height.                             |
| 24   | Root/media spacing source             | Actual content starts 12px below media; root ends 12px below content.                                                      |
| 25   | Native content, root layout           | Long text wraps and height grows at narrow width; no horizontal clipping or imposed max-height.                            |
| 26   | Source merge order                    | Caller Griffel root/media rules win while retaining stable class names.                                                    |
| 27   | Full component custom hook            | Provider hook observes already-applied source classes and overrides both slot styles.                                      |
| 28   | Native media render function          | Render-function composition retains ref/class/style/title/native click forwarding.                                         |
| 29   | Caller image accessibility            | Decorative image has empty accessible name; native trusted load and decoded local SVG.                                     |
| 30   | Caller image accessibility            | Named image has exact caller name; trusted load/decode; caller owns object-fit.                                            |
| 31   | Native event props                    | Button click bubbles through caller media/root handlers in exact order.                                                    |
| 32   | Native event props                    | Consumer stopPropagation suppresses root notification.                                                                     |
| 33   | Native DOM order/Spec                 | Real Tab visits media link, content button, following button; Body is not a tab stop.                                      |
| 34   | Native form descendants               | Real input typing/submission preserves form data; trusted submit belongs to caller.                                        |
| 35   | Native root events                    | Current root focus/keydown handlers receive trusted descendant events; no invented Body arrow behavior.                    |
| 36   | Stable Default, Spec sample           | Exact span/h2/div composition, decoded named image, text/header and Learn more/Got it actions.                             |
| 37   | Stable AppearanceBrand                | Same original composition/actions under actual brand owner.                                                                |
| 38   | Stable Carousel                       | One exposed Body, two empty inactive cards, three decoded original pages, exact selected icon label.                       |
| 39   | Stable CarouselAppearanceBrand        | Same three original pages and icon navigation under brand context.                                                         |
| 40   | Stable CarouselText                   | Three original pages with exact `1/2/3 of 3` page counts, Previous/Next/Finish/Close.                                      |
| 41   | Inherited light surface styles        | Body inherits light text; surface owns white background; caller heading/description references resolve.                    |
| 42   | Inherited dark surface styles         | Body inherits dark-theme text while its own background remains transparent.                                                |
| 43   | Inherited brand surface styles        | Body inherits on-brand foreground, not a Body appearance prop.                                                             |
| 44   | Inherited source inverted styles      | Native heading/content inherit actual inverted colors; deprecated documented appearance is characterized only.             |
| 45   | Direction inheritance/source renderer | RTL preserves column layout and media/heading/text DOM order and physical vertical order.                                  |
| 46   | Native forced-color behavior          | CDP activates real `forced-colors`; matchMedia, auto adjustment, native button name/focus and media geometry verified.     |
| 47   | Live owner/body updates               | Open owner keeps focus and root ref/identity; text/media/length update, description resolves, settled owner height grows.  |
| 48   | Nested owner contexts                 | Inner Body belongs to nearest named/described brand surface despite outer inverted owner.                                  |
| 49   | Native link descendant                | Trusted Enter click reaches caller navigation prevention; Body has no added role/activation.                               |
| 50   | Root slot render-function API         | Generated media precedes custom heading/action; forwarded root ref/props/classes/native handlers retained.                 |
| 51   | Actual hook + renderer                | Bare source composition is ordered native div/span content with no full-component classes/padding.                         |
| 52   | Public facade/local index             | Exact component/hook/styles/renderer/classnames/useMediaStyles export identities and actual composed rendering.            |
| 53   | Current consumer props                | Replacing media/root event callbacks uses new handlers on unchanged media DOM.                                             |

`testing/types.stories.tsx` compiles genuine positive nullable media, div root
and span ref, all three lengths and source state contracts. Negative contracts
reject Body appearance, Body size, unsupported mediaLength, nullable root,
SVG root ref, arbitrary root `as: section` and arbitrary media `as: div`.
No imaginary React namespace or unnecessary `any` bridge is introduced.
The global JSX bridge uses the same existing repo React/Fluent intrinsic types
as row 137. `testing/tsconfig.json` includes every authored fixture contract and
the ordinary canonical Cypress entry.

## Accessibility receipt policy

The media-render trial exposed missing ref callbacks and nullable media geometry,
then a closed-fixture ownership verdict in `afterEach` aborted the last twelve
cases. Required callbacks and typed media/content elements are now asserted
before coupled payload/geometry reads, retaining original detach/null/state and
12px spacing expectations.

The complete unchanged ownership/readiness/audit chain now runs at the tail of
each matching scenario body. Original viewport, hover, cache setup, case-local
media reset and all cleanup/restoration keep their effective order. The old
`afterEach` contained only a successful-case audit and explicitly skipped
already-failed bodies; that boundary is preserved, without a new failed-case
collector, fabricated final capture or checkpoint backfill. All passing cases
still require the same strict audit. Sentinel captured/live style, positional,
related-node and classifier guards remain unchanged.

Every new case audits a real nonempty visible owned stage and any live teaching
portals with **full unfiltered default axe-core**. Results require nonempty
passes, retry zero and an exposed nonempty audited root. No rules are disabled,
no unknown incompletes are waived, and no DOM nodes are moved to make an audit
pass. Readiness is actual animations finished, public Tabster focus observation
and the actual three-tab navigation/sentinel DOM cardinality, not fixed sleeps.

The 53 final audits and forced-color intermediate audit have zero violations
and incompletes. Eleven stable-open audits preserve two inherited findings in
the unmodified stories, so **the complete suite is not clean accessibility**:

| Named profile             | Exact registered source/target/check                                                                                                                                                                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All three stable profiles | One serious `aria-dialog-name` violation, one node `.fui-PopoverSurface`; `any` checks exactly `aria-label`, `aria-labelledby`, `non-empty-title`, with null/null/`{messageKey: noAttr}` data; no all/none checks. Stable stories do not label the dialog; their Body title is not automatically its accessible name. |
| `stable-basic`            | One serious `aria-hidden-focus` incomplete; exact nodes `.fui-PopoverSurface > i:nth-child(1)` and `i:nth-child(6)`.                                                                                                                                                                                                  |
| `stable-carousel`         | Same incomplete; exact nodes `.fui-PopoverSurface > i:nth-child(1)`, `.fui-TeachingPopoverCarouselNav > i:nth-child(1)`, `.fui-TeachingPopoverCarouselNav > i:nth-child(5)`, `.fui-PopoverSurface > i:nth-child(5)`.                                                                                                  |
| `stable-carousel-text`    | Same incomplete; exact nodes `.fui-PopoverSurface > i:nth-child(1)` and `i:nth-child(5)`.                                                                                                                                                                                                                             |

Every incomplete node must be the actual empty Tabster `I`, `role=none`,
`aria-hidden=true`, `tabindex=0`, inside the teaching surface with the exact
Modalizer/Mover marker. Its only all-check is serious `focusable-modal-open`
with null data and one related node whose target and HTML equal the original
node. Any/none are empty. Both browser assertions and runner revalidation
reject changed rule/node/check/data/target/impact/cardinality. Every profile
audit executes six negative guards: unknown rule, duplicate rule, duplicate
node, unknown check, wrong target and wrong impact (66 rejected mutations).

The five unchanged stable stories supply 11 raw finding audits: two basic
stories once each, and three carousel stories at all three active pages.
Exactly five positive full-round screenshots are required, not failure
screenshots mistaken for success evidence. Native local image load, form,
keyboard and pointer events recorded as trusted must remain trusted.

## Source limitations, not production repairs

Body owns no appearance, size, heading text, image alt, button action, focus
trap, open state, carousel selection or accessible dialog name. Controls and
ARIA labels/descriptions are caller composition; surface/owner behavior is
asserted only where it affects real Body content.

The Spec describes a uniform 288px media width. Current source actually uses
`width: auto`. At a 288px Body the documented heights match. On resize, source
`@supports not (aspect-ratio)` is active because Chrome supports the declaration
`aspect-ratio: 1` but not the feature query `(aspect-ratio)`; the fallback fixes
height while width changes. Case 23 records this exact native result rather
than pretending the ratio scales height. Body does not set max-height or image
object-fit; the native image's `cover` belongs to caller props.

An exploratory inverted fixture containing TeachingPopoverTitle produced
serious inherited title contrast (`#242424` on `#333333`, ratio 1.22).
That historical failure is retained, not waived or repaired. The accepted
Body inheritance cases deliberately use native caller headings, isolating
Body's inherited color; unmodified supported stable stories still use the real
TeachingPopoverTitle. Inverted is deprecated in the Spec, not a new Body API.

No assertion attempts to repair sibling button/Title/carousel source defects.
No unknown rule is accepted for those components.

## Commands and reproducible evidence

Run from the Windows repository root:

```powershell
$Runner = 'packages\react-components\react-teaching-popover\library\src\components\TeachingPopoverBody\TeachingPopoverBody.run.cjs'
$Node22 = 'C:\Users\jabrassi\.scout-instances\local-test\copilot\session-state\e2e8f1b0-53a4-4784-81a2-ee19461b7b31\files\runtime\node-v22.20.0-win-x64\node.exe'
node $Runner
& $Node22 $Runner standard
node $Runner cypress 1 verification
node $Runner cypress 2 verification
& $Node22 $Runner checks 3 verification
& $Node22 $Runner units 3 verification
node $Runner isolation 3 verification
& $Node22 $Runner discovery 3 verification
node $Runner invalid 3 verification
node $Runner preserve 3 verification
& $Node22 $Runner registered 3 verification
& $Node22 $Runner sync 3 verification
node $Runner seal 3 verification
```

Direct execution uses existing Node 18.20.6 and the component-local config.
Ordinary package execution uses Node 22.20.0 with child-node PATH prepended and
**unchanged** `library/cypress.config.ts`. Both execute the canonical Body spec,
Chrome headless, retries zero and the complete default highest round without
`coverageRound`. Rounds 1/2 alone explicitly set the round through Cypress CLI.
The runner records complete exact expanded argv and cwd in `commands.jsonl`.

First-use bootstrap is also verified with `entry.json` absent before ordinary
default execution. Exclusive ignored metadata creation is automatic; no
author-session ignored file, `tasks.json`, private evidence variable or private
test selection is needed. A tracked canonical one-import entry after commit is
recognized as campaign registration, not mistakenly treated as an old baseline.
Lint/check input enumeration excludes only the eight explicit original files,
`.gitignore` and the SVG asset, never newly tracked fixtures. SVG is still
hashed in every source manifest and served as an owned image response.

Each call creates a unique ignored `.evidence\<mode>-r<round>-<label>-<time>-<pid>`
directory, and each browser call creates its own `audits-*` directory. No
previous log/result is overwritten or deleted. Raw JUnit, complete axe JSON,
positive captures, commands, source-before/source-after, outside-before/
outside-after, bootstrap, outcome and preservation deltas are retained.
Successful final-source receipts are sealed under
`.evidence\seal-r3-verification-*\seal.json`, including SHA256 hashes of every
receipt and raw audit file. Historical failing/older-source receipts are
retained but are not approval evidence.

Original Jest targets use a component-owned config that only spreads the
unchanged package config and selects the original Body suite. Preset, SWC
transform, setup and serializer are inherited unchanged. The verified result
is **20 passed, one matched snapshot, zero updates/additions/failures**.

Actual `tsconfig.lib.json` parsing plus the created producer TypeScript program
contains only the six original Body production modules. Actual package SWC
processing of all owned TS/TSX emits exactly six production JS modules and
zero fixtures. Testing/story files and canonical `.cy.tsx` are excluded by the
existing producer configs, not a new shared-config exception.

The nested `testing/ci` application is
`teachingpopoverbody-functional-tests`, tagged vNext/platform:web/test.
Both e2e/type-check retain genuine scripts-cypress build prerequisites.
Fixture imports use `nx-ignore-next-line` for aggregate/story test-only
dependencies; the application explicitly depends on react-teaching-popover,
react-components and react-teaching-popover-stories. Actual Nx project/file
maps, source-only/fixture-only/canonical/story/consumer affected selection and
dependency traversal verify ordinary ownership with no producer reverse edge
or application cycle.

**Cold Nx is not green.** The genuine registered e2e/type-check probes use
`--skipSync --skipNxCache` only for the explicit cold helper probe; they retain
and execute both eslint-plugin-react-components and scripts-cypress builds.
The shared generate-api executor constructs unquoted OneDrive-path `tsc`
arguments, yielding `TS5023: Unknown compiler option '-'`. No empty dependsOn,
private executor, installation, outside patch or dependency bypass substitutes
for this failed prerequisite. Independent direct/package runtime checks remain
valid, but do not claim successful cold declarations.

`nx sync --check --verbose` reports the shared tree out of sync. The generator
dry-run reports `UPDATE tsconfig.base.json` and explicitly no applied changes.
Root formatting/synchronization is outside ownership and is not applied.
These known limitations are separately sealed with raw failing logs; unknown
cold failures are not sealable.

Port 46138 is exclusively probed before each browser run; an occupied port
fails rather than killing another owner. Every call reports concurrent HEAD,
outside hashes and status changes without reverting/staging anything outside
Body. Entry HEAD is `0f6fa027033dacbdff93d1761557afdc48c57777` on master.

## Preserved original SHA256

| Original file                                     | SHA256                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `index.ts`                                        | `9abb2336df7d50cba0dd4dfb8698eab045e346cc28ef783d3559f80e94e4c8d6` |
| `TeachingPopoverBody.tsx`                         | `eb45cce91336c7014b952f46020bfc556f524327e22ee370d5ee689d631da402` |
| `TeachingPopoverBody.types.ts`                    | `eaba6af195e90466c22306825709b9b1b639ee753ffbb90914eb6aca5afb1791` |
| `renderTeachingPopoverBody.tsx`                   | `8e94fa9173ae476fbc55f359ee954b94069651fb11ff0fae5e00fbb505d8541d` |
| `useTeachingPopoverBody.ts`                       | `748767bb1fd384df885094c66f52dfe9c2d09fd6a0ea72a29b100c29f9d8b16f` |
| `useTeachingPopoverBodyStyles.styles.ts`          | `5b01c4f375ddd134c46e80b0907252969040567f21c700ca08983b06fdb93925` |
| `TeachingPopoverBody.test.tsx`                    | `c497659069b7027158b9878ec1c77b82e7bc1c8baf7a2e7ea5ef50cc7e0b441e` |
| `__snapshots__/TeachingPopoverBody.test.tsx.snap` | `ca2d4351ec8232418770201c0cc061fb2c26b094bc4fac27aa5e8fc202ae2220` |

Ready for the parent's initial and fresh repeat adversarial reviews only after
the current-source seal is present. Those reviews and a separate descriptive
commit remain the parent's responsibility.
