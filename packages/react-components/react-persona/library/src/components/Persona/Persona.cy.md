# Persona browser coverage

Sources: Persona description and Default, AvatarSize, PresenceSize, TextPosition,
TextAlignment and PresencePreviousBehavior stories; usePersona/render/styles and
Persona unit tests.

Coverage checks all six Avatar and presence-only size mappings, default name and
secondary text, all text positions in LTR and RTL using measured browser bounds,
both alignments with four lines, and legacy presence icon/class overrides.
Additional probes cover noninteractive tab-order behavior, named Avatar semantics,
consumer interactive text, null coin/text slots, native root refs/attributes/events,
primaryText versus name, text shorthand, explicit Avatar overrides and dynamic
name/size/presence-only/status updates.

Geometry assertions guard current implementation mappings, not independent
pixel-perfect design certification. Focused Electron coverage is not exhaustive,
an axe audit, or screen-reader announcement verification. Images use Avatar's
own contract and remote image loading is not audited here.

From `react-persona/library`, with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/Persona/cypress.config.cjs
tsc --noEmit -p src/components/Persona/tsconfig.cy.json
```

The component-local runner reuses the repository base, disables retries and
screenshots and uses port 45164 (override WEBPACK_DEV_SERVER_PORT). React 19 JSX
type compatibility is scoped to this validation configuration.

The Cypress spec and JSX compatibility file use a `.stories` suffix solely to
reuse the existing production compiler exclusion while staying inside Persona's
directory. The explicit Cypress config includes them; Jest's spec/test pattern
does not. They are not Storybook stories and are outside the stories project.
The normal production typecheck remains blocked by existing missing JSX
namespace diagnostics in PopoverSurface and Tooltip source; these files are
outside Persona's permitted change scope. The local Cypress typecheck passes.
