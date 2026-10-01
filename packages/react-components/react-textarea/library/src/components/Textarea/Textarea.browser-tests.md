# Textarea browser coverage

Run the component-local suite through the existing Nx command target from the repository root:

```powershell
yarn nx run react-textarea:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T cypress run --component --browser electron --project src\components\Textarea --config-file cypress.config.cjs"
```

The package has no inferred `e2e` target. The local config reuses the shared Cypress support and
webpack setup, resolves paths relative to this directory, disables retries, and accepts the
existing `WEBPACK_DEV_SERVER_PORT` environment override. `FLUENT_EVIDENCE` optionally redirects
failure screenshots outside the checkout.

The suite covers the two actual slots (`root` and `textarea`), native editing, supported design
variants (including deprecated shadow appearances), resizing, form behavior and Field integration.
Consumer-owned prefix content is demonstrated through a root render function; it is not a built-in
decoration slot. Native pointer dragging uses CDP with the held-button bit because the installed
`realMouseMove` command omits it.

`minLength`, `autoComplete`, `onInvalid` and `onInvalidCapture` are explicitly forwarded in the
component hook: the shared textarea property filter omits them. This localized correction retains
slot-override precedence and does not change shared filters or unrelated components.

The disabled textarea style explicitly suppresses resizing, as required by the accessibility spec.
Chromium otherwise allows the native resize gesture even on disabled textareas; the suite includes
a plain native positive control to demonstrate that distinction. Enabling the component again
restores the configured resize mode.

The native reset comparison intentionally records that Fluent's internally managed value stays
at the latest edit, while a plain uncontrolled textarea returns to its original default. There is
no added reset-state contract. Synthetic composition checks test event forwarding only, not OS
IME behavior. Electron coverage does not establish screen-reader announcements, forced-colors
rendering, touch behavior or cross-browser equivalence.
