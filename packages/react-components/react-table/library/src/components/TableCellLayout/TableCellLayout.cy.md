# TableCellLayout browser coverage

The local CommonJS runner independently discovers the story-suffixed suite and
its explicit browser JSX/type project with Chrome and zero retries.

Default, PrimaryCell, SizeSmall/SizeExtraSmall and ResizableColumnsUncontrolled
stories cover real media/main/description presentation, primary emphasis,
inherited avatar/icon sizing and actual truncate styles.

Native/source/unit-informed cases measure numeric zero and explicit main content,
slot precedence, description-only and disabled wrappers, true bounded ellipsis
without losing complete accessible text, optional/live truncation, descendant
keyboard/click bubbling, LTR/RTL media geometry and ordinary axe rules without
exclusions. Root/slot metadata/classes, independent refs and committed cleanup,
dynamic content/media/description, inherited/explicit avatars, custom wrapper
render functions and exact provider colors are also covered.

Repairs move default root children into the main slot's default props, preserve
explicit main slot content, and distinguish meaningful numeric content from
absence when selecting the content wrapper. Explicitly null main/content slots
remain caller-controlled. All original conformance/unit cases are retained.
No public API or unrelated sizing/navigation change is introduced.

Complete WCAG, screen-reader speech, OS forced-colors and StrictMode are not
claimed. Truncation is asserted against actual scroll and client geometry rather
than inferring it only from a class name.
