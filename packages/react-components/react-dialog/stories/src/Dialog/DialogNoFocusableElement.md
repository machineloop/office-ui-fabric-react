A `Dialog` **should** always have at least one focusable element.
Some accessibility issues might happen if no focusable element is provided, like this one caught in [Talkback](https://issuetracker.google.com/issues/243456562?pli=1).

When there is no focusable element inside a `Dialog`, focus falls back to `DialogSurface`. Pressing Escape on the focused surface closes the dialog. A modal dialog can also be closed by clicking its backdrop; an alert dialog cannot. Always provide a focusable action rather than relying on this fallback.

> A common scenario for no focusable elements on a dialog is lazy loaded content, where the content (with focusable elements) is added after the Dialog is mounted. In that case, it is recommended to manually focus on the desired focusable element after the content is loaded.
