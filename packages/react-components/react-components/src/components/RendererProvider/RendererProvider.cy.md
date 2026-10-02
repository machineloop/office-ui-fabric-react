# RendererProvider public integration coverage

The actual implementation is `@griffel/react` 1.7.7
(`node_modules/@griffel/react/src/RendererContext.js` and its CommonJS build),
not FluentProvider. Fluent UI re-exports it from `react-components/src/index.ts`.
This tracked directory contains only public-export integration tests; it does
not introduce or impersonate a production renderer component.

The local CommonJS runner discovers the story-suffixed browser suite and its
explicit JSX/type bridge independently of normal package compilation. Chrome
native events use zero retries.

## Contract map

- Installed Griffel documentation and package-local FluentProvider Frame/
  ApplyStylesToPortals stories: exact renderer ownership, actual CSS in a foreign
  document/portal, insertion points and generated style attributes.
- Installed RendererContext/core source: nearest nested ownership, renderer and
  target-document updates, stable child identity and deduplicated rules,
  preserved SSR sheet attributes and reusable styles after child cleanup.
- Real DOM-free Node SSR plus actual React hydration: server rules/markup,
  cache populated before child render, retained DOM, zero recoverable hydration
  errors and no duplicated style elements.
- Existing local FluentProvider-node SSR usage and new component-local Node
  regressions: DOM-free exact context, nested renderer isolation and serialized
  style attributes.
- Native child tab/click/naming semantics and ordinary axe rules without
  exclusions demonstrate that this context-only provider adds no DOM wrapper.
  Text-direction context remains independent of renderer ownership.

Fresh foreign documents are used when testing newly generated style attributes:
existing hydrated sheets intentionally retain their original attributes.
SSR is produced in the runner's actual DOM-free Node process, not simulated by
calling server rendering in a browser with DOM globals.

The final gate strengthens the existing renderer-replacement scenario (still
15 scenarios): an unchanged fresh document contains actual server-generated
rules. Both the original and replacement renderer must discover those rules
before the child's styling hook runs. Replacement retains child identity,
native Enter activation and computed paint, with exact original style-node
identity/count, CSS rule counts and cache size. This distinguishes cache
rehydration on renderer changes from context-identity updates alone.

Upstream RendererContext unit files were not shipped with the installed package
and could not be retrieved from attempted public/GitHub endpoints. Unit-informed
coverage therefore uses the exact installed runtime/type/source contracts and
available local SSR integration tests; no claim of reading unavailable tests is
made. The unstable renderer getter is used only to observe real context identity.
Full WCAG, CSP enforcement, OS forced-colors and StrictMode are not certified.
