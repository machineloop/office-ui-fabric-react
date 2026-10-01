# Label browser coverage

Sources: Label description and Default, Required, Disabled, Size and Weight
stories; state/styles/render and default/custom-indicator/conformance unit tests.

Scenarios verify all size/weight combinations with computed typography and
working native htmlFor focus, default/string/JSX required indicators,
disabled appearance and a genuinely disabled associated input. Edges cover
native checkbox activation and keyboard changes, label-free tab order, and
required/disabled props as visual state rather than control validation.

Unit-derived contracts cover label/indicator refs and attributes, custom
classes/events, required-slot ARIA override and prop filtering, and updated
htmlFor/text/required/size. Large size currently applies semibold typography
even with `weight="regular"`; this suite records the implementation and does not
change that existing styling policy.

Consumers must set required/disabled on their controls independently.
No exhaustive, contrast, axe, visual-design or screen-reader certification is
claimed; typography/color checks guard current tokens.

From `react-label/library`, with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/Label/cypress.config.cjs
tsc --noEmit -p src/components/Label/tsconfig.cy.json
```

Explicit `.stories` validation files reuse production/Jest exclusions and are
outside the Storybook stories project. Retries/screenshots are disabled;
port 45173 can be overridden via WEBPACK_DEV_SERVER_PORT.
