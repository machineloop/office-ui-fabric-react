# Skeleton root browser coverage

`Skeleton.cy.tsx` tests the group root rather than duplicating the standalone
SkeletonItem suite. The root is a busy progressbar by default; animation and
appearance are context settings rendered by descendant items, not root effects.
The finite size list is exercised at the group boundary with local item overrides.

Nested Skeleton roots inherit animation and appearance, but do not inherit size
or shape from an outer Skeleton. An omitted nested size/shape resets those group
settings, so its items use their own defaults. A direct context provider replaces
the context value rather than merging it.

Loading completion, busy state on a surrounding region, label changes and live
announcements belong to the consumer. Skeleton does not fetch content, announce
completion, create a live region, or implement interactive progress controls.
Reduced-motion checks exercise the actual browser media preference on inherited
item effects; they do not imply that the root owns an animation.

The root slot supports `div` and `span`, native attributes/handlers, forwarded refs
and render-function children. The public base renderer accepts an explicit context;
the styled hook/context/renderer pipeline publishes all four design settings.
Context identity stays stable for native-only root updates.

Appearance assertions compare actual theme colors and gradient stops. Wave
direction and its keyframe endpoint flip in RTL. Timeline checks pause and seek
the actual inherited effects instead of waiting arbitrary wall-clock intervals.
The shared mount helper uses StrictMode, so the context identity test accounts for
its initial effect replay before measuring subsequent context changes.

Use CSS (`className` or `style`) for wrapper widths. The deprecated `width` prop
is retained but does not define a layout guarantee in this suite. Accessibility
checks cover DOM roles, names, descriptions, busy/hidden overrides and focus order;
they are not screen-reader speech, automated WCAG auditing or announcement tests.
