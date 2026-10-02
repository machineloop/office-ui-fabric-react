# Tag browser contracts

`Tag.cy.tsx` exercises the current Tag contract in a real browser. Run the
`react-tags:e2e` Nx target with `--config-file=src/components/Tag/Tag.cypress.config.cjs`
and `--browser=chrome`. The local config discovers only `Tag.cy.tsx`. The
`Tag.cy.styles.cy.tsx` module is a test-only style fixture, not a spec; it is
excluded from production compilation by the existing `*.cy.tsx` exclusion.

## Contract inventory

| Source                                                      | Browser coverage                                                                                                                                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package README; Default, Icon, Media, SecondaryText stories | Native span and button defaults, primary text routing, real icon/media paint, Avatar context, stacked secondary text                                                              |
| Size, Shape, Appearance stories                             | All three sizes and appearances, both shapes, token-backed colors and radii, native dimensions, icon and Avatar sizes                                                             |
| Disabled, Selected stories                                  | Disabled native interaction suppression in every appearance; pressed semantics and selected paint                                                                                 |
| Dismiss story; best practices                               | Both computed accessible-name recipes; pointer, Enter, Space, Delete and Backspace dismissal; consumer cancellation; actual collection removal and reset focus                    |
| `Tag.types.ts`; native slot contracts                       | Native attributes, form behavior, consumer classes and inline overrides, omission/restoration, null/empty/zero shorthand, render functions, slot attributes                       |
| `useTag.test.tsx` / `useTagBase_unstable`                   | Context precedence for appearance/size/dismissibility, forced context disabled, option/listbox semantics versus pressed semantics, default dismiss SVG, design-only Avatar values |
| `Tag.test.tsx`; conformance and Griffel checks              | Native root/ref identity, callback and object ref replacement and unmount cleanup, generated id stability, latest/removed/restored handlers and values, user styles winning       |
| Implementation styles and provider integration              | RTL geometry, native focus and hover paint, extra-small pseudo-element hit area, actual forced-colors media/system paint, nested themes, provider custom styles                   |

## Boundaries

Tests preserve the existing unit tests. A narrow production correction restores
trailing padding when a supplied dismiss icon is hidden by `dismissible={false}`;
the regression compares actual padding and width against an ordinary passive Tag
in all three sizes, including a dismissible-to-passive rerender.

Tests use
native browser pointer/keyboard events with live clocks, no retries, skips,
forced clicks, fixed sleeps, or uncaught-exception suppression. Accessible names
and descriptions are computed, and axe checks the documented accessible
recipes; this does not claim manual screen-reader or speech verification.

`selected` is visual/ARIA state, not an invented Tag selection action.
TagGroup owns collection removal; the documented example owns reset focus.
Icon and media are tested independently as recommended, rather than asserting
unsupported simultaneous layout. Root `as` combinations that conflict with
Tag's native span/button discriminant are not invented.

Custom provider callbacks that contain React hooks remain installed across
rerenders to obey React hook-order rules. Hook-free callbacks separately cover
override removal/restoration. Reduced motion has no Tag-specific behavior;
forced colors has defined styles and is tested by actual browser emulation.

Validation evidence is session-private. The component-local runner and browser
type project are kept with this suite. Repository writes and commits for these
revisions are restricted to this directory; no release/change record is needed.

The component-local CommonJS runner and explicit JSX/browser type project now
discover Tag.cy.tsx alone: TagGroup/helper specs are not part of the Tag count.
All original scenarios remain. Object-ref cleanup waits for committed DOM
disappearance without weakening the null assertion. Native selected dismiss
hover/held-press foreground is checked against on-brand tokens with an
unselected compound-brand positive control and release click count.

## Queued refinement validation

The scoped Cypress 14.4.1 / Chrome 154 / Node 22.20.0 run has **67 passing,
0 failing, 0 pending, 0 skipped**: all 66 original cases plus one selected
dismiss hover/held-press case. Browser pseudo-state assertions distinguish
hover, held press, and release; the native CDP release explicitly uses
`buttons: 0` because the installed real-events 1.14 mouse-up adapter reports
`buttons: 1`. The latest/removed/restored handler case checks the exact dismiss
count and value after each pointer and keyboard action, so an earlier click
cannot mask a missing Delete or Backspace dismissal.

The browser type project passes and imports the actual Tag source. The raw
production `tsconfig.lib.json` check retains the known transitive Tooltip
`renderTooltip.tsx:21` missing global JSX diagnostic; it is not reported as a
clean library typecheck. Production source fingerprints are unchanged.
Independent whole-Tag coverage review covers the suite, fixtures, runner,
source contracts and documentation; it does not constitute manual assistive
technology verification or the campaign's final all-component gate.
