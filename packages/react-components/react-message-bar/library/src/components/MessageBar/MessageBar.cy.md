# MessageBar browser announcement coverage

The real-announcer case keeps the existing fixture, native show-button click,
visible MessageBar, and named `group` assertions. It observes the browser's
supported announcement path without replacing production components or inventing
a document API.

- The shared mount helper retains its default React StrictMode. The newly shown
  MessageBar's announcement effect is replayed, so this development fixture
  expects two announcements rather than claiming a production single-call API.
- When the AUT document supports `ariaNotify`, a call-through spy verifies silent
  initialization and both real native calls with the full body/action narration
  and `{ priority: 'normal' }` for the default informational message.
- Otherwise the real assertive DOM fallback starts empty and must contain exactly
  the two batched narrations, each with its actual `. ` serialization delimiter.
- Narration includes the title, body, Help link and `RetryDetails` action text,
  separated by the producer's comma. The independently rendered dismiss action
  is not part of that narration.

The existing intent/priority cases still verify the root's announcement requests
through `AnnounceProvider`. No scenario is skipped, no browser API is disabled or
fabricated, and no retry or timer adjustment is introduced by this compatibility
fix. Actual assistive-technology speech is not claimed.
