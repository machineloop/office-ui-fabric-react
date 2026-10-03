# Drawer browser coverage

This suite tests the public `Drawer` wrapper, not a renamed implementation of
`OverlayDrawer` or `InlineDrawer`. The existing shared base scenarios and two
dispatch cases are retained. Repository changes are confined to this directory.

## Contract and sources

`Drawer.types.ts`, `useDrawer.ts`, `renderDrawer.tsx`, and
`useDrawerStyles.styles.ts` define the wrapper: `type="inline"` selects
`InlineDrawer`; omitted or explicit `type="overlay"` selects `OverlayDrawer`.
The root slot forwards props and refs and adds `fui-Drawer`. The public root
slot's native props are specified directly, not via a separate `root` prop.

Read-only references include the package spec/API report; all Drawer stories and
best practices; delegated mode types, hooks, renderers, styles, units and Cypress
prior art; shared defaults and motion helpers; Drawer body/header/context
integration; and the underlying Dialog focus, surface and scroll-lock ownership
implementation.

The old spec is not the authoritative current API: `modalType` is
`modal | non-modal | alert`, not a boolean; `defaultOpen` is deprecated and not
forwarded into an uncontrolled Dialog; inline has no implicit dialog semantics
or initial-focus behavior. The best-practices prose's `mode="inline"` spelling is
not an API: the prop is `type`. These discrepancies are not silently converted
into invented features.

## Finite inventory

| Round               | Observable scenarios                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Retained            | Default closed/open, content and controlled opening; four widths, viewport clamp, custom width; start/end/bottom positioning; default overlay and explicit inline dispatch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Documentation       | Heading-generated dialog name, structured header/navigation/body/footer, labeled draft input and help; keyboard opening, modal wraparound Tab, Escape request envelope and manual focus restoration; inside pointer positive control and backdrop close reason; inline DOM placement, page layout, nonblocking controls and absent automatic semantics/focus; responsive viewport-driven bidirectional mode switching and portal/backdrop/scroll cleanup; mode redispatch resets descendant state while preserving parent open; non-modal outside focus/Tab and Escape; controlled alert refusal with explicit acknowledgement; both modes' retained and default-unmounted child state; inline four widths/clamp/custom size/separator positions; element mount node bidirectional dispatch and object mount-node class.                                           |
| Edges/accessibility | Both modes' aside/native ID/title/language/ARIA, consumer classes, inline style precedence, root refs and clicks; Griffel width override and provider-token control; dynamic width/position/custom height without replacing the root; both modes x LTR/RTL x start/end/bottom computed positioning and measured geometry; live direction change; inert focus exclusion/release; controlled requests without parent mutation; deprecated defaultOpen characterization; root key and request cancellation with successful dismissal controls; custom backdrop props/cancellation and null backdrop; latest handlers after rerender and redispatch; explicit inline region/heading semantics; aria-label without generated title ID and empty dialog focus; switching closed modes; labeled inherited disabled-motion defect with an initially-open positive control. |
| Unit/source derived | Both modes' public hook/style/render recomposition and root render functions; real native animation enter/exit callbacks, pending-exit retention and finish-driven unmount; canceled close/reopen and latest motion handlers; actual reduced-motion media and native 1ms animation options; labeled inherited inline callback-bookkeeping defect with a working default-callback control; custom motion size/position/direction parameters after redispatch; real Field/Input label/hint/validation relationships; independent backdrop lifecycle; independent scroll contexts and header separator after keyboard scrolling/content shrink; independent modal scroll locks released individually across dispatch/unmount; live modality ownership changes; portal-container replacement without old surface/backdrop orphans.                                     |

The responsive breakpoint, resizer controls, navigation actions and multilevel
content in stories are application-authored, not automatic Drawer APIs. Coverage
uses observable prop updates, geometry and representative structured content;
it does not incorrectly test the wrapper as owning a resizer, media query,
navigation model, or every feature of either sibling.

## Motion and inherited defects

Custom test motion uses native Web Animations, paused at creation only for the
fixture's 3000ms animation. Explicit native `finish()` controls its completion;
no sleeps, test retries, synthetic timer-based animation claims, or forced
pointer clicks are added. Custom-motion tests explicitly emulate no reduced
motion and assert that media setting; reduced-motion cases emulate `reduce` and
assert the actual one-millisecond native options. Media is reset after each
source-derived case.

Two assertions deliberately **characterize defects, not correct behavior**:

- An inline Drawer mounted closed with `surfaceMotion={null}` stays zero-width
  after opening. The internal `animationDirection` remains `exit` without
  motion callbacks. An initially-open disabled-motion drawer is the control.
- Supplying an inline `surfaceMotion.onMotionStart` replaces the internal
  enter-direction callback; a closed-to-open Drawer can finish its motion while
  remaining zero-width. Omitting the override is the positive control.

Normal lifecycle tests explicitly compose the motion render function's internal
callbacks with observers, preserving bookkeeping. Original sensitive failing
runs are retained outside the checkout. No production fix is authorized or
included.

The backdrop lifecycle test also labels the observed duplicate enter-start
callback: two enter-start notifications precede the independent finish and exit.
It does not advertise exactly-once callbacks or treat this observation as an
endorsed accessibility or motion guarantee.

## Validation and boundaries

Run the exact `Drawer.cy.tsx` spec via the package Nx e2e target. Run scoped ESLint,
Prettier, and `tsc -p tsconfig.cy.json --noEmit` through Nx command overrides.
Relevant units are Drawer, InlineDrawer, OverlayDrawer, drawerMotions and
drawerMotionUtils. Machine-specific commands, exact executed names/counts,
corrections, exit codes, hashes, logs and type-baseline comparison are in
`coverage101-120/Drawer-evidence.json` in the assigned session evidence root.

The type baseline contains inherited JSX/runtime diagnostics outside Drawer.
Zero diagnostics in the added suite are required; an unchanged external
baseline is not described as a green whole-package type check.

This is finite Electron browser coverage, not exhaustive infinite-input
coverage, a cross-browser proof, assistive-technology speech testing, or pixel
snapshots as functional evidence. It does not claim unsupported uncontrolled
open state or automatic inline accessibility semantics.
