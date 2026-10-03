# CarouselNavButton browser coverage

Row 110 is confined to this component directory on shared `master`. Production
source, units, the parent CarouselNav suite, siblings and shared configuration
are unchanged. The suite observes the public button and its own hook, renderer,
styles and subscription behavior; parent fixtures provide supported contexts,
not duplicate coverage of Nav generation or Carousel engine variants.

## Finite supported inventory

| Source                                | Button-owned coverage                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public API, types, Spec and Migration | Required root only; no icon, size, shape, appearance, checked or indeterminate Button props; native value/name versus contextual page index; caller data-index, native attributes, children, class, style, refs and semantic overrides; omitted/explicit button, submit and reset types                                                                |
| Carousel/Nav stories and descriptions | Named native pagination tabs; contextual index and active selection; default/brand inherited appearance; uncontrolled and controlled parent feedback; physical alignment after activation; real pointer, Enter and Space exact event/index payloads                                                                                                    |
| ARIA helper and NavButton hook        | Supported button/anchor/div polymorphism; anchor href/target/rel and role defaults; user click/key composition, native versus helper keydown/keyup cancellation, disabled and disabledFocusable semantics, latest handlers and index after reenable, autoplay reset order                                                                              |
| Native browser forms                  | Submit/reset matrix with enabled, native-disabled, disabledFocusable, disabled plus disabledFocusable, boolean/string aria-disabled; pointer/Enter/Space where reachable; independent guarded ARIA control; actual form events and reset field values, selection and propagation; default button and consumer-veto form controls                       |
| Accessibility and Tabster             | Label/description IDREF endpoints and Chromium accessibility-tree name/description; selected ARIA and consumer overrides; real Tab/Shift+Tab entry/exit, LTR/RTL arrows and dynamic disabled skipping; keyboard focus border; no fabricated live-region or AT-speech guarantee                                                                         |
| Styles                                | LTR/RTL, light/dark, default/brand selected pill versus unselected dot geometry and colors; actual hover/pressed/released styles; dynamic theme/appearance; consumer Griffel precedence; forced-colors media positive control, inversion and focus                                                                                                     |
| Unit/conformance and source edges     | Public and composed root render functions; ref replacement/unmount; repeated selected-page activation; HTML versus SVG click target; stopPropagation versus preventDefault; subscription/index replacement and disposal, ordered multi-panel controls, empty group, remount/no replay, real grouped card removal/publication; nested context isolation |

The finite native form matrix does not force keyboard focus onto a native-disabled
button: only its pointer attempt and real Tab/arrow exclusion are tested.
`disabledFocusable` alone and combined with `disabled` are both represented.
Native `value` and caller `data-index` remain unrelated to the page index supplied
by Nav's provider, including after runtime replacement.

## Honest inherited behavior and parent decision

**Known click-guard defect:** `useCarouselNavButton` overwrites the guarded
`useARIAButtonProps` click handler. A real native `disabled` button is blocked by
the browser, but focusable-disabled/ARIA-disabled native buttons still call user
and selection handlers, reset autoplay, bubble an uncancelled click and perform
native submit/reset defaults. Anchors/divs block disabled Enter/Space through
their helper key handlers, but their real pointer clicks still select. Disabled
anchors remove `href`, which does not repair the click callback defect.

The sensitive failing assertion required a disabledFocusable submit button not
to perform a second form submission after an enabled positive control. It
observed two submissions rather than one. Its exact source, run, error, attempts
and screenshot are retained externally. The final explicitly named
characterization asserts the unwanted second submission. The broader matrix
compares actual native actions with a separately guarded ARIA button; it does
not mask form actions by suppressing callback counters. Submit handlers cancel
navigation only after recording the real submit event; reset handlers do not
cancel the native input reset. No production fix or permission assumption is
included. **Parent must decide whether to authorize a fix.**

Other source-owned limits are explicitly characterized:

- Polymorphic ARIA helper defaults override `role="tab"` unless the consumer
  supplies tab semantics; an enabled anchor with href has an implicit link role.
- Native disabledFocusable drops consumer key handlers while its unguarded click
  remains active. Reenable restores the current handlers.
- SVG child targets fail the hook's HTMLElement guard: no selection, but reset
  still runs. HTML child clicks provide the positive control.
- Native Space keyup prevention cancels native activation. Anchor/div Space
  activation is synthesized on keyup and is also consumer-vetoable. Enter
  activation emits a click payload, not an invented keyboard reason.
- Subscription publications write `aria-controls` directly. An index/subscription
  change does not clear or replay earlier IDREFs; the next valid publication
  replaces them. Missing groups publish an empty string. Initial dynamically
  generated and remounted buttons need a later publication. Actual grouped-card
  removal requires exact surviving live endpoints, with no stale removed IDs.
- Consumer click prevention cancels selection and native form action but still
  resets autoplay. stopPropagation alone does not veto selection; parent bubble
  prevention occurs after selection/reset.

No claims are made about arbitrary invalid inputs, all React render functions,
infinite styling/geometry combinations, assistive-technology speech, universal
browser behavior, or fixes for parent announcement/controlled-engine defects.
The native submit positive control is an in-memory browser fixture, not an
outbound submission.

## Execution and evidence

The component-local Cypress config reuses the read-only Carousel runner on port
18241, matching only `CarouselNavButton.cy.tsx`. No shared runner writes are
required. Documentation, edge/a11y and unit/source-derived expansion rounds are
followed by final full execution, scoped lint/format, unchanged Cypress typing
with independent baseline isolation, and relevant existing unit suites.

`CarouselNavButton-evidence.json` and component-specific logs, exact executed
titles/attempts, source hashes, baseline diagnostics, sensitive source and
screenshots live in the session's `coverage101-120` evidence directory, outside
the checkout. There are no configured test retries, sleeps, skip/only cases,
snapshot-based functional assertions, dependency installations, agents or commits.

Whole-package Cypress typing is not claimed green. The unchanged production Nav
renderer, FluentProvider and Tooltip diagnostics are isolated by removing only
this new Cypress root while preserving compiler options and all existing source.
The required outcome is zero new suite diagnostics and identical baseline errors.
