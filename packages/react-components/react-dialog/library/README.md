# @fluentui/react-dialog

**React Dialog components for [Fluent UI React](https://react.fluentui.dev)**

To import React Dialog components:

```jsx
import * as React from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
} from '@fluentui/react-components';

export const DialogExample = () => {
  return (
    <Dialog>
      <DialogTrigger>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogContent>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus eaque
            est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in natus iure
            cumque eaque?
          </DialogContent>
          <DialogActions>
            <DialogTrigger>
              <Button appearance="secondary">Close</Button>
            </DialogTrigger>
            <Button appearance="primary">Do Something</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
```

## DialogTitle contracts

`DialogTitle` renders an `h2` by default. Use `as` for another heading level; when using
`as="div"`, supply `role="heading"` and `aria-level`. Its root ref targets the heading,
not the separate action sibling. A custom title `id` must also be referenced by the
surface's `aria-labelledby` if it is to name the dialog.

Non-modal dialogs supply a native close button by default. Modal and alert dialogs do
not. `action={null}` suppresses the action; a custom action is supported in any mode.
Wrap a custom dismiss control in `DialogTrigger action="close"` and give icon-only
controls an accessible name. Preventing the control's click default vetoes dismissal.

The adjacent `DialogTitle.cy.tsx` retains the original cases and exercises real pointer
and keyboard dismissal, computed heading/dialog names, slot/ref lifecycles, caller and
provider style resets, and hook/style/render recomposition. It uses live motion and
native events, without retries or forced clicks. Context-driven action changes are
tested directly; it does not certify live surface modalizer transitions or manual
screen-reader output.
