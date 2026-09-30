# @fluentui/react-message-bar

The MessageBar component communicates important information about the state of the entire application or surface.
For example, the status of a page, panel, dialog or card. The information shouldn't require someone
to take immediate action, but should persist until the user performs one of the required actions.

```tsx
import { MessageBar, MessageBarTitle, MessageBarBody, MessageBarActions, Button } from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';

function Example() {
  return (
    <MessageBar>
      <MessageBarBody>
        <MessageBarTitle>Descriptive title</MessageBarTitle>
        This is a message bar
      </MessageBarBody>
      <MessageBarActions containerAction={<Button aria-label="Dismiss" icon={<DismissRegular />} />}>
        <Button>Action</Button>
        <Button>Action</Button>
      </MessageBarActions>
    </MessageBar>
  );
}
```
