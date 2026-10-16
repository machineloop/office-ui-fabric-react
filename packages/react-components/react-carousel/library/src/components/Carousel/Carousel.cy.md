# Carousel root browser coverage

`Carousel.cy.tsx` preserves the five original cases and tests the root using real
Carousel children. Child implementations and shared context/engine helpers remain
read-only. This is root integration coverage, not standalone coverage of those
children.

## Finite inventory and source mapping

| Source                                           | Executed root scenarios                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Carousel.types.ts`, Controlled story            | Initial zero/default/controlled index, default changes after initialization, controlled feedback, external updates, rejected controlled requests, exact callback event identity/type/index                                                                                                                                                 |
| Spec, Default and TopNavigation stories          | Finite next/previous boundaries, direct pagination, independently composed controls, controls before the viewport, circular wrapping, single-page loop fallback, empty-to-populated geometry                                                                                                                                               |
| Types, ActionCards and Responsive stories        | All three alignments crossed with whitespace off/on; group sizes 1, 2, auto; measured full/half-width cards; automatic grouping on resize; runtime alignment/whitespace/grouping/circular updates                                                                                                                                          |
| Types, FirstRunExperience and ImageBox stories   | Slide, fade, and slide-with-duration motion; real settled positions or fade opacity; root render-function children with context                                                                                                                                                                                                            |
| Appearance story, root styles/context values     | Flat/elevated appearance, runtime appearance updates, root overflow/position, native class/style preservation and context-driven card treatment                                                                                                                                                                                            |
| Autoplay story, root hook and engine             | No activation from interval alone; explicit opt-in at 1000ms and the default 4000ms; exact autoplay callback; pause toggle; hover/focus/combined pause; interval reconfiguration and navigation reset; control removal; root unmount/remount cleanup                                                                                       |
| Eventing story, root hook and pointer plugin     | Native drag on/off with exact drag event/index, latest click/focus/drag/autoplay handlers, localization updates, subscriber disposal and one subsequent notification                                                                                                                                                                       |
| Description/BestPractices, renderer and contexts | Named region, caller role/labelledby, native root handlers, no invented root arrow navigation or live attribute, native Space and Tab, card-focus arrow navigation owned by Slider, full-width slide inert/hidden state, stable unique panel ids and grouped controls after resize, sibling context isolation, LTR/RTL measured navigation |
| Root unit/conformance tests                      | Forwarded root refs with balanced attachment/release, attributes/classes, root render-function customization, context identity/lifecycle and dynamic additions/removals with valid controlled indices                                                                                                                                      |

Each executed title, its phase, source mapping, commands, results, hashes and
diagnostic isolation are recorded in the external `Carousel-evidence.json`.
Geometry uses a fixed test viewport and no remote images. Fake clocks advance only
autoplay timeouts; transitions and pointer/keyboard interactions run in the browser.
The package's existing e2e target runs a portable root-local configuration on
port 18241. Background renderer throttling is disabled for deterministic geometry
when other windows are active; assertions and production timing remain unchanged.
There are no sleeps, retries, skipped cases, snapshots used as functional evidence,
invalid default-plus-controlled fixtures, or production changes.

## Inherited behavior explicitly characterized

- Initial automatically generated navigation tabs have no `aria-controls`: the
  engine publishes discovery before those tabs subscribe, and subscriptions do not
  replay. A real root resize supplies the relationship. The initial absence is
  asserted separately, not represented as accessible success.
- Empty geometry disables previous but leaves next enabled and reports click
  index zero. No useful next slide exists.
- The root requests `{ polite: true }`. When the real document supports
  `ariaNotify`, the shared announcer calls that native API with normal priority;
  a call-through spy verifies the exact message and options without replacing
  the browser implementation. Otherwise the shared DOM fallback creates an
  assertive live region. Both paths retain silent initialization, actual
  navigation, and the absence of a live attribute on the Carousel root.
- A rejected controlled navigation request can leave context/selected-tab state
  at the controlled index while the engine physically displays the requested
  page. The external controlled update is subsequently honored.
- Root refs can detach/reattach during engine reconfiguration. Tests require
  balanced release and correct final ownership, not an invented single-call
  guarantee.

These are observations of unchanged production source, not fixes. Sensitive
failing expectations and their disposition are retained in the external logs.

## Boundaries

There is no root orientation, infinite/wrap alias, reduced-motion, automatic hover
policy prop, or independent autoplay enabled prop in the actual API. Circular,
motion, provider direction and the real autoplay control are used instead.
Announcement speech by assistive technology, universal browser behavior, all
physics trajectories and arbitrary input combinations are not claimed.
Whole-package Cypress typing remains blocked by inherited production diagnostics.
The current compiler reports the same 14 diagnostics with the original and
updated root test sources; the owned suite has zero diagnostics and introduces
no new ones under the unchanged compiler settings.
