# AvatarGroupItem browser functional coverage

Component-local spec, configuration and React 19 legacy JSX type bridge. The
existing Jest spec is preserved. Tests mount real FluentProvider/AvatarGroup/
AvatarGroupPopover and the local AvatarGroupItem implementation; no network
fixtures, skips, retries, arbitrary waits or exception suppression.

## Sources and rounds

Paths below are relative to `packages/react-components/react-avatar`.

### Round 1: docs-derived

- `stories/src/AvatarGroup/AvatarGroupDescription.md`, `AvatarGroupBestPractices.md`,
  `AvatarGroupDefault.stories.tsx`, `AvatarGroupLayout.stories.tsx`: identity,
  partition ordering, div inline versus li overflow, three layouts and pie's
  inclusion of every participant in the overflow list. Six Enter/Space cases
  use native Tab/Escape and check portal content, names and focus restoration.
- `AvatarGroupSizeSpread.stories.tsx`, `AvatarGroupSizeStack.stories.tsx`,
  `AvatarGroupSizePie.stories.tsx`: all 14 supported sizes across all layouts;
  each item and avatar's exact dimensions, small-size initials, spread/stack
  spacing, stack outline widths and two-slice pie clipping/divider widths.
  Three-slice LTR geometry is checked in the pie keyboard cases. Stack's
  documented warning about interactive targets below size 28 is not a claim
  that static avatars are interactive or that these tests measure WCAG targets.
- `AvatarGroupIndicator.stories.tsx`, `AvatarGroupTooltip.stories.tsx` reviewed
  for integration context; indicator/tooltip ownership remains with Popover,
  not tested as an Item feature.
- `library/src/components/AvatarGroupItem/AvatarGroupItem.types.ts` and component
  description: graphical avatar primary slot, initials/icon/image customization,
  colorful default and overflow-label semantics. Local data-URI image loads
  without a server, and remains decorative to the avatar's name.
- Round 1 self-adversarial review strengthened dimension checks to every
  element rather than Cypress's first-element CSS assertion; added image
  loading and decorative semantics. Native keys are not synthetic `.trigger`.

### Round 2: undocumented and accessibility edges

- `useAvatarGroupItem.ts`, `renderAvatarGroupItem.tsx`,
  `useAvatarGroupItemStyles.styles.ts`, `contexts/AvatarGroupContext.ts`,
  `AvatarGroupPopover/useAvatarGroupPopoverContextValues.ts` and
  `Avatar/useAvatar.tsx`: primary-slot prop/ref routing, opt-in focusability,
  trusted Enter/Space forwarding without inventing button activation, click
  bubbling, static overflow focus trap, naming overrides, duplicate-name hiding,
  badge/active ID references, slot overrides of size/name/shape/color, RTL pie
  two/three slices and removal of pie styles under overflow context,
  duplicate/Unicode/literal markup names.
- Reproduced a coupled production defect: `avatar={{ name: ... }}` left the
  default overflow label empty or using a stale top-level name, contrary to
  `AvatarGroupItem.types.ts`'s documented name-from-avatar-slot contract.
  The base hook now defaults the label from the resolved avatar slot. The
  browser regression covers slot-only, conflicting name and explicit label;
  three added Jest cases preserve the same behavior.
- Self-adversarial review corrected unsupported button polymorphism (Avatar
  supports a span), verifies actual graphical-avatar native keyboard behavior,
  and checks trusted key events, individual callbacks and forwarded ref.
  Exact RTL/CSS values are grounded in the existing styles and browser output.

### Round 3: unit-derived

- `AvatarGroupItem.test.tsx`: browser parity for non-overflow initials and
  custom JSX overflow label, extended to true/false/undefined context defaults.
  JSX shorthand is preserved as a child of the hidden label slot, not assumed
  to be the slot wrapper itself.
- `library/src/testing/isConformant.ts` and
  `packages/react-conformance/src/defaultTests.tsx` (repository-relative):
  primary versus root ref routing, ref detach/reattach, native attributes,
  user classes and root slot style precedence. This does not re-enable the
  unit suite's existing disabled `make-styles-overrides-win` test.
- Base hook, renderer and context sources: both directions of context/size
  updates, changing resolved avatar names and explicit-label preservation;
  root/avatar/label render functions preserving generated children and props.
- Self-adversarial review checked test registration/counts (no tests nested in
  running `it` callbacks), DOM subjects across chained assertions, shorthand
  versus wrapper ownership, each size/layout element, trusted native input,
  slot render functions and exact CSS branch boundaries. No substantive gap
  found in this stated functional scope after the final successful run.

## Verified outcomes

- Docs round: **23/23** passed (`AvatarGroupItem-round1-final.log`).
- Edge round: **34/34** cumulative passed (`AvatarGroupItem-round2-final.log`).
- Unit-derived/final adversarial round: **43/43** cumulative passed
  (`AvatarGroupItem-round3-final.log`): 23 docs, 11 edge and 9 unit-derived tests.
  All have zero failing, pending or skipped tests; configuration retries are 0.
- Coupled defect evidence: `AvatarGroupItem-round2-reproduction.log` is **33
  passing, 1 failing** before the production fix. Actual labels were empty,
  stale top-level name and the correctly preserved explicit custom label.
- Preserved and extended Jest suite: **23/23** passed
  (`AvatarGroupItem-jest.log`), including the three new regression cases.
- Component-local TypeScript and existing Prettier checks pass.
- Independent review found no blocking defects and suggested two additional
  precedence checks: an explicitly blank avatar name, and customization without
  a name override. Both are now covered; the final review-amended suite passes
  **45/45** with zero failing/pending/skipped cases
  (`AvatarGroupItem-review-final.log`), and targeted TypeScript still passes.

Run logs are under
`C:\Users\jabrassi\.scout\copilot\session-state\aa1fea39-2e36-404b-ba5d-52a30fbf049f\files`.
Earlier baseline logs also retain assertion-authoring failures; the named final
logs above are the verification outcomes. No commits, subagents or shared
infrastructure changes were made.

## Running on the shared Windows checkout

From `C:\Users\jabrassi\OneDrive - Microsoft\Documents\Microsoft Scout`:

```powershell
$repo = Join-Path $PWD 'fluentui'
$node = 'C:\Program Files\scout\resources\node\node.exe'
& $node "$repo\node_modules\cypress\bin\cypress" run --component --browser electron --headless --project "$repo\packages\react-components\react-avatar\library" --config-file src\components\AvatarGroupItem\cypress.config.cjs
& $node "$repo\node_modules\typescript\bin\tsc" -p "$repo\packages\react-components\react-avatar\library\src\components\AvatarGroupItem\tsconfig.cy.json" --pretty false
```

Run Jest from `fluentui\packages\react-components\react-avatar\library` so the
existing preset's cwd-dependent aliases resolve correctly:

```powershell
& $node "$repo\node_modules\jest\bin\jest.js" --config jest.config.cjs --runInBand --runTestsByPath src\components\AvatarGroupItem\AvatarGroupItem.test.tsx --silent
```

From the repository, format/check only the new component-local artifacts with
the existing `node_modules\prettier\bin-prettier.js`. The local CommonJS config
requires `scripts\cypress\lib-commonjs\index.cjs`, avoiding the existing canonical
ESM `import.meta.dirname` failure; it does not alter shared infrastructure.
`AvatarGroupItem.cy-jsx.stories.ts` is a type-only legacy global JSX compatibility
declaration scoped by this Cypress tsconfig, excluded from production via the
existing stories exclusion.

## Limits

Electron on Windows and one light theme are exercised, not cross-browser,
assistive-technology, visual-snapshot, forced-colors or universal exhaustive
coverage. DOM ARIA assertions do not establish a screen-reader announcement.
Base-hook custom renderers and behavior owned exclusively by Avatar, Group,
Popover or Tooltip are not independently exhaustively retested here.
Direct provider fixtures intentionally isolate the unit context contract;
real Popover fixtures, not those isolated fixtures, establish list nesting.
Outside-Group development warnings and arbitrary caller-authored render
functions are not exhaustively covered.
Webpack can emit pre-existing esbuild include-pattern warnings for imported
workspace sources; these are visible in run logs, not suppressed.
