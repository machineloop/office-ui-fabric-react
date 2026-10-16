# AccordionItem browser coverage

The owner removal/reinsertion case now checks the opened item's actual expansion
and waits for the existing panel animation-completion premise before clicking the
Show button below it. This keeps the real pointer target settled without a sleep
or synthetic event. Actual item disappearance, owner-retained selection and
visible reinserted content remain the original assertions.

The final gate adds two item-owned disability regressions (35 scenarios total).
A closed item with header-slot `disabled: false` and an open item with an explicitly
undefined slot disability remain owner-disabled: pointer attempts preserve
expansion, the native header rejects focus, and Tab skips to an enabled sibling.
Native Enter toggles only the sibling. Enabling the owner on the same mounted
fixture restores native Space expansion/collapse while retaining sibling state.
The directly coupled AccordionHeader repair enforces inherited disability; no
AccordionItem production policy is replaced.

The component-local runner discovers the story-suffixed browser fixture with
Chrome and zero retries, independently of the normal library build.
The explicit `react-accordion:e2e-accordionitem` Nx target uses that existing
component configuration and retains the shared Cypress helper prerequisite.
It is a scoped Item target, not a claim to aggregate every Accordion child suite.

The documented round maps package-local Default, OpenItems, Multiple,
Collapsible, Controlled and Disabled stories to item ownership, visible content
and inherited disabled state.

The boundary round adds real Enter/Space, disabled pointer/tab-order positive
controls, open disabled content, RTL/LTR content focus, noncoerced numeric/string
and object identities, explicit falsy item values, and ordinary axe rules without
exclusions.

## Explicit undefined identity

An explicitly supplied `value={undefined}` is permitted by the public required
`value: unknown` contract. With a single-open collapsible Accordion whose
selection is empty, opening requests `[undefined]` and closure requests `[]`.
The suite covers omitted and explicit empty defaults plus controlled requests,
rejection and subsequent owner acceptance. A positive control opens and closes
the same identity when another item starts open.

The root cause is outside this active component directory:
`Accordion/useAccordion.ts` compares `previousOpenItems[0]` to the requested
value. The authorized repair requires a nonempty prior selection before treating
that equality as closure, preserving the public API and earlier falsy/default
and noncollapsible behavior.

Source/conformance cases cover native metadata/classes/styles, root refs and
committed unmount, standalone context defaults, dynamic identity/disability,
nested isolation and owner-retained selection through item removal/reinsertion.
NaN uses the same identity equality for expansion and closure; distinct symbols
remain independently selectable. Primitive selections retain legacy lexical
ordering; opaque identities retain selection order instead of being implicitly
stringified. Native clicks below animated content wait for actual settled
animations, not a fixed delay.
No complete
WCAG, screen-reader, OS forced-colors or StrictMode claim is made.
