# Popover browser coverage

## Grounding and rounds

The original 43 Cypress cases remain intact. Package-local `stories/src/Popover`
(including best practices, controlled state, custom/triggerless targeting,
non-interactive content, appearance, arrows, focus trapping and motion) ground the
documented scenarios. These v9 stories live in `react-popover/stories`, not the
legacy `react-examples` package.

`usePopover`, `renderPopover`, context values, public types, the Popover unit
suite/conformance exclusions, and the trigger/surface hooks and styles ground
the browser contracts. Popover has no DOM root, root ref, or own typography:
native overrides/ref checks belong to its children and context-driven styling
is verified on the surface.

- Round 1: original documented regressions, 43/43 Chrome passes.
- Round 2: named non-interactive focus, triggerless controlled target/restoration,
  size/arrow dimensions, light/dark/high-contrast **theme tokens**, motion opt-out,
  default/controlled state, disabled input, context interactions, inside/outside
  wheel containment, RTL keyboard and logical positioning, cover-target arrow
  suppression, and standard non-modal axe checks. 70/70 after correcting the
  fixture's rotated arrow measurement; no production changes.
- Round 3: hover delay/cancellation with real pointer input and virtualized
  timeout boundary, live controlled state/callback/context/ref updates,
  unchanged defaultOpen initialization, prevented trigger Escape, mountNode and
  custom motion rendering.
- Adversarial review identified six concrete gaps: valid restoration setup for
  the live-ref fixture; positive enhanced custom-trigger input/latest handler
  composition; fresh context-click coordinates; modal accessibility-tree
  isolation/cleanup and axe; external iframe opt-out with a dismissal positive
  control; arrow offset added to a nonzero consumer offset. All are exercised
  by additional browser cases. The original custom-trigger test (which never
  opens) is retained rather than relied on for this contract.
- Follow-up review identified a weak motion opt-out assertion. A native
  `Element.animate` spy now distinguishes disabled motion from a default-motion
  positive control on the actual surface element.
- Final round: **90/90 Chrome passes**; independent adversarial follow-up is clean.
  New campaign fixtures register outside the original regression matrix's mount
  hooks so restoration history is not polluted by an extra baseline mount.

All new tests have meaningful DOM, focus, geometry, callback, or accessibility
assertions; no retries, skipped cases, conditional assertions based on observed
results, arbitrary sleeps, screenshots, or video are added. Matrix branches
select known input/prop scenarios before execution. The original iframe
regressions retain their historical polling waits.

## Accessibility and limitations

Named non-modal and modal compositions run ordinary axe rules with **no rule
disables or Tabster-sentinel exclusions**. The modal scan scopes the visible
surface; outside isolation and restoration are separately asserted using
ancestor-aware `aria-hidden` checks. Native Tab/Shift+Tab, Enter/Space, Escape,
real mouse hover/click, and focus restoration are browser-observable contracts.
These checks do not prove screen-reader announcements, browser-toolbar behavior
on every platform, or OS forced-colors rendering. High-contrast theme tokens are
not an OS forced-colors test.

The public iframe opt-out and its default positive control use the detector's
100ms polling interval with virtualized intervals. Real DOM focus is retained;
only polling time is advanced. Advancing multiple intervals synchronously would
batch redundant requests before React commits closure, so each control advances
one interval.

The suite-local JSX declaration bridges React's JSX namespace for source files
using the Fluent JSX runtime. Source TypeScript checking has no suite diagnostics;
the confirmed pre-existing FluentProvider TS2741 remains (the bridge removes the
other previously observed JSX namespace diagnostic). Do not suppress or change
the shared provider as part of this component.

## Reproduction

From the repository root, using Node 22 and an unused dev-server port:

```powershell
$env:WEBPACK_DEV_SERVER_PORT='24847'
& $node22 node_modules\cypress\bin\cypress run --component --browser chrome --project packages\react-components\react-popover\library --config-file src\components\Popover\Popover.cypress.config.cjs
& $node22 node_modules\typescript\bin\tsc -p packages\react-components\react-popover\library\src\components\Popover\Popover.cy.tsconfig.json --pretty false
```

The local CommonJS configuration reuses the repository Cypress support and
webpack aliases/loaders without modifying shared configuration.
