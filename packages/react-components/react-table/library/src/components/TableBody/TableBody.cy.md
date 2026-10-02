# TableBody browser coverage

The component-local CommonJS runner discovers this story-suffixed suite and JSX
bridge through its explicit browser type project, using Chrome and zero retries.

Documented Default, NonNativeElements, SizeSmall/SizeExtraSmall and
FocusableElementsInCells examples cover native/div rowgroup structure, complete
rows/cells, table naming, inherited density and keyboard entry/return in cells.
The Default example's misspelled accessible-name attribute is corrected.

Native/source/unit-informed cases cover descendant forward/reverse tab order,
real keyboard/click bubbling without invented body-level actions, header/body
column geometry, multiple rowgroups, explicit native root selection, LTR/RTL,
ordinary axe rules without exclusions, metadata/classes/styles, object/callback
refs and committed cleanup, keyed reorder/removal, empty/restored rows, dynamic
context rendering/density, refreshed handlers and default context in a valid
native HTML host.

The repaired root-selection precedence preserves caller `as` before the
context-native fallback, preventing div-only metadata on explicit tbody roots.
The existing public props/ref API remains unchanged; the original unit suite is
retained with regressions for both explicit roots and context defaults.
No complete WCAG, screen-reader speech, OS forced-colors or StrictMode claim is
made. Header and naming guidance is followed in accessible fixtures.
