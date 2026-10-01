# SearchBox browser coverage

Sources: SearchBox Default, Size, Appearance, Controlled, ContentBeforeAfter and
Typeahead stories; placeholder/disabled guidance; unit/conformance and slot hooks.

Documented scenarios cover naming, typing/clear, all sizes/appearances, controlled
limits, disabled tab order, adornment focus and typeahead active-descendant/Escape.
Edges cover Unicode/whitespace, Field descriptions/required validation, default
dismiss tab exclusion, consumer-tabbable dismiss Enter/Space and rejected values.
Unit-derived contracts cover value/defaultValue rerenders, silent controlled
updates, input/root/dismiss refs and attributes, merged callbacks, key prevention,
disabled dismissal and nullable decorative slots.

Native keyboard tests exposed missing button semantics on the dismiss span when
made tabbable. Local handlers now support Enter on keydown and Space on keyup,
preserve consumer key callbacks/prevention and ignore disabled activation. Space
activation is armed only by an enabled uncancelled keydown and cancelled on blur.
Mouse-event onChange payload and default dismiss tabIndex=-1 remain unchanged.

Typeahead is consumer composition: the current story leaves the input's native
searchbox role rather than the combobox role described in its prose. This suite
does not change the out-of-scope story or certify all async races, announcement
timing, application data access or contextual contrast. No exhaustive, axe,
cross-browser, visual or screen-reader certification is claimed.

From react-search/library with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/SearchBox/cypress.config.cjs
tsc --noEmit -p src/components/SearchBox/tsconfig.cy.json
```

Port 45180 is overridable via WEBPACK_DEV_SERVER_PORT. Retries/screenshots are
disabled; validation-only `.stories` files reuse existing exclusions.
