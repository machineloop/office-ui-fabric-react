# Headless TagPicker focusgroup coverage

The existing five browser scenarios remain intact. The tag-group case keeps the
exact `toolbar inline wrap` attribute, absence of Tabster metadata, real arrow
navigation from Cat to Dog, and the final transition from Dog to the input.

Initial entry is now observed through real Tab from the preceding button instead
of assuming that every backend writes a `tabindex` attribute. The installed
focusgroup helper identifies native support without changing browser APIs. When
the polyfill is required, its original `tabindex="0"` readiness assertion remains;
native focusgroup behavior is checked through actual focus rather than a
polyfill-specific DOM mutation.

No component source, focus utility, browser API, or navigation expectation is
changed. No scenario is skipped and no retry or timer adjustment is introduced.
