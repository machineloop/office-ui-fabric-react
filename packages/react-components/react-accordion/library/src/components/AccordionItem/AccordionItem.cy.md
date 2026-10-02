# AccordionItem browser coverage

The component-local runner discovers the story-suffixed browser fixture with
Chrome and zero retries, independently of the normal library build.

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
