# PopoverSurface browser coverage

The local CommonJS runner independently discovers this story-suffixed suite and
browser type project while reusing the retained Popover runner configuration.
Chrome native events run with zero retries.

Modal cases that intentionally retain an open owner for their assertions now
close that owner through real Escape only after the original verdicts and audits
finish, then require the retained mount root to be exposed before unmount.
Nested-owner independence remains asserted before closing the remaining outer
owner. Tests do not remove `aria-hidden`/`inert` attributes or repair component
state. These handoff verdicts remain inside test bodies.

Scene opening and inline nested activation observe actual Tabster trigger focus
before the real click or Enter, using the same bounded native-focus premise as
the other popover integration suites. Surface autofocus, dismissal, exact
placement and later focus assertions are not forced or relaxed.

Documented Default, Appearance, WithArrow, WithArrowAutosize, TrappingFocus,
NonInteractiveContent, InternalUpdateContent, MotionDisabled, MotionCustom,
WithoutTrigger, AnchorToCustomTarget, CustomTrigger and ControllingOpenAndClose
examples cover presence, real positioning/arrow geometry, padding/colors,
overflow and scrolling, focus/naming, ref-backed custom motion and external
control. Custom motion is observed on the actual surface DOM target with
opacity/blur frames, not inferred from presence alone.

Native/source/unit-informed cases cover owned-input Escape and original-handler
ordering, ordinary input keys, controlled rejection, descendant interception,
mouse enter/leave with and without hover opening, inside/outside clicks,
legacy tab cycles, standards-like accessibility isolation, nested portal versus
inline propagation, inside scrolling and ordinary axe rules. The only axe
exclusion is the exact hidden, role-none, tabindex-zero Tabster dummy input
selector. Its two 1px sentinel nodes and native boundary tab cycles are verified
independently; real content and all ordinary rules remain checked.
Root metadata/styling, merged caller/content/motion refs and committed cleanup,
inline/portal/custom mount placement, live size/arrow/appearance/handlers,
empty focusable content, caller ARIA overrides and exact provider-theme/RTL
inheritance are measured.

`inertTrapFocus` selects standards-like focus navigation; Tabster uses
accessibility isolation rather than a literal native `inert` attribute.
Deliberate programmatic focus outside closes the surface, preserving the
existing Popover contract. Its directly related prop documentation is clarified.
Inline nested positioning waits for actual placement initialization before
native keyboard interactions, without fixed sleeps.

The arrow's unchanged intrinsic DIV/ref/class rendering uses React's element
factory to avoid depending on a global JSX intrinsic namespace in consuming
source projects. No public API or positioning behavior changes.
Complete WCAG, screen-reader speech, OS forced-colors and StrictMode are not
claimed.
