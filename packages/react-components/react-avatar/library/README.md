# @fluentui/react-avatar

**React Avatar components for [Fluent UI](https://react.fluentui.dev/)**

The Avatar component represents a person or entity. It displays the person's image, initials, or an icon, and can be either circular or square.

## Usage

To import Avatar:

```js
import { Avatar } from '@fluentui/react-components';
```

### Examples

```jsx
<Avatar name="Miguel Garcia" />
<Avatar size={72} name="Mona Kane" image={{ src: './MonaKane.jpg' }} />
<Avatar shape="square" icon={<IDBadgeIcon />} />
```

Displaying a badge:

```jsx
<Avatar name="Allan Munger" badge={{ status: 'busy' }} />
```

With active state indication:

```jsx
<Avatar name="Daisy Phillips" active="active" activeAppearance="ring-shadow" />
<Avatar name="Robin Counts" active="inactive" activeAppearance="ring-shadow" />
```

See [Fluent UI Storybook](https://react.fluentui.dev/) for more detailed usage examples.

Provide `name` when available: it determines fallback initials and the accessible name.
Use `aria-label` or `aria-labelledby` for a custom name; explicit labels take precedence
over automatic presence/activity text. An out-of-office presence badge contributes both
its status and "out of office" to the automatic name.

The native `hidden` prop hides the avatar; removing it restores its display. Images are
decorative by default. Initials remain underneath the image while it loads; a failed image
is hidden, and a subsequent successful load restores it. If no initials are available,
the icon is the fallback after failure. `image={null}`, `initials={null}`, `icon={null}`,
and `badge={null}` remove their respective slots.

The adjacent `Avatar.cy.tsx` verifies the finite documented sizes, shapes and color palette,
computed paint and names, presence/activity, deterministic local image loading/failure,
slot/ref lifecycles, native events, provider defaults and hook/style/render recomposition.
It uses live timers without retries, forced clicks or third-party image requests. Browser
coverage does not certify manual screen-reader speech or font availability for every script.

Alternatively, run Storybook locally with:

1. `yarn start`
2. Select `react-avatar` from the list.

### Specification

See [SPEC.md](./SPEC.md).

### Migration Guide

If you're upgrading to Fluent UI v9 see [MIGRATION.md](./MIGRATION.md) for guidance on updating to the latest Avatar implementation.
