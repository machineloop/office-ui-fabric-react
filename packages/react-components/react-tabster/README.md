# @fluentui/react-tabster

**Tabster components for [Fluent UI React](https://react.fluentui.dev)**

Library for focus management that leverages [tabster](https://github.com/microsoft/tabster).

The API currently only supports declarative data-\* attributes that are returned using the exported react hooks:

```tsx
import * as React from 'react';
import { useArrowNavigationGroup } from '@fluentui/react-tabster';

const Item: React.FC = ({ children }) => <div tabIndex={0}>Item</div>;

const ArrowNavigationExample: React.FC = ({ children }) => {
  const attrs = useArrowNavigationGroup({ circular: true });

  return (
    <div {...attrs}>
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
    </div>
  );
};

const App: React.FC = () => {
  return <ArrowNavigationExample />;
};
```

## Repository RTL grid resolution

This repository's Yarn resolution applies
`.yarn/patches/tabster-npm-8.8.0-94956cb666.patch` to Tabster 8.8.0 on installation.
Both the ESM and CommonJS mover implementations compare DOM-order grid boundaries
in logical inline coordinates. RTL horizontal neighbors, Home/End row boundaries
and PageUp/PageDown column preservation therefore follow the writing direction.
Vertical overlap calculations remain in physical coordinates. GridLinear,
cyclic movement, nested mover ownership and keydown opt-outs are unchanged.

The patch is generated with `yarn patch` and `yarn patch-commit --save`; its locator
and checksum are tracked in the root manifest and lockfile. It retains Tabster's
MIT license and removes the patched modules' source-map directives, since the
upstream maps describe the unmodified implementation.

This resolution is **repository-local**, not a newly published Tabster release.
The published `@fluentui/react-tabster` dependency retains its npm-compatible
`^8.8.0` range. Consumers installing independently do not inherit the root Yarn
resolution; adopting a verified upstream fix remains a separate publication task.

`src/hooks/tabsterGridNavigation.test.ts` exercises the installed CommonJS mover
with explicit unit geometry. The Table component's browser suite exercises the
ESM implementation through native Chrome keyboard events and actual layout.
