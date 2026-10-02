# InteractionTagPrimary browser coverage

The component-local CommonJS runner reuses the package InteractionTag runner
with its own story-suffixed suite, JSX bridge and explicit browser type project.
Chrome native events run with zero retries.

Documented Default, Icon, Media, SecondaryText, Appearance, Size, Shape and
HasPrimaryAction examples cover slot structure, accessible content, avatar
context, actual typography/geometry, inherited colors, split-edge styling and
keyboard popover activation.

Native and source/unit-informed rounds verify keyboard/click composition,
unrelated keys and native key cancellation, exact rest/hover/held-press colors,
selected and locally disabled styling, inherited tag/group disability,
filled/regular outline-icon changes, LTR/RTL split edges and tab order, refs and
committed cleanup, native form metadata and reset, generated naming with explicit
undefined ids, refreshed handlers/content and explicit avatar overrides.

Compact 20px visible actions are measured using actual browser hit testing and
native clicks in the extra 2px regions above/below the visible box. Border-aware
positioning is checked for primary and all secondary appearance branches,
including a provider-customized border thickness. Hits close to the 2px boundary
and misses beyond it ensure that the border correction neither loses the
intended vertical target extent nor overexpands borderless actions.

Ordinary axe rules are enabled without exclusions. Full WCAG, OS forced-colors,
screen-reader speech and StrictMode are not claimed. Default long labels remain
intrinsic-width, nonwrapping content; explicit caller root/text-slot CSS is used
when testing bounded ellipsis. No automatic truncation feature is introduced.
Native slot `title` contributes to accessible naming and is asserted accordingly.

Verified repairs reconcile local/inherited disabled state with native actions
and styles, retain generated naming for undefined ids, and anchor compact hit
extensions outside the actual border box. Explicit primary ids continue to
require the documented custom secondary naming relationship.
