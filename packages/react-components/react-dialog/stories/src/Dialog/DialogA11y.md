## Accessibility

Here are some accessibility edge cases scenarios we identified and users should keep in mind while using the `Dialog` components.

1. NVDA reads dialog information twice
2. Talkback doesn't support dialog name/description
3. Talkback doesn't support `alertdialog`
4. Whenever including a `Menu`, `Combobox`, `Dropdown` or `Popover` inside a dialog the property `aria-modal` should be false otherwise VoiceOver on IOS will not be able to access the popup. This is needed as well for VoiceOver on macOS, otherwise these components are not narrated. Apply `aria-modal=false` on the `DialogSurface` slot.
5. `DialogSurface` does not add an accessible description by default. For short confirmations, set `aria-describedby` to the content element's ID. For complex content (for example [with form](#with-form)), leave it unset so assistive technologies can navigate the content instead of announcing it all as a description.

`DialogContent` is a styled `div`, not an additional dialog or landmark. It preserves the semantics and native interactions of its children. Long content scrolls within the content area; on screens at most 359px high, scrolling moves to the surface so content and actions remain reachable. Consumer styles can override the content's scrolling behavior.

`DialogTrigger` does not render a wrapper. It accepts a single element, a render function, or no child; fragments are not supported. Its default action is `open` outside a `DialogSurface` and `close` inside one; an explicit `action` overrides that context. By default it enhances the child with button semantics and keyboard activation. Use `disableButtonEnhancement` for controls that already implement accessible button behavior. A child click handler or the dialog's `onOpenChange` can veto an action with `event.preventDefault()`.
