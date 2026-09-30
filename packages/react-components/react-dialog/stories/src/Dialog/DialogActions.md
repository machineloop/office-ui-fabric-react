Dialogs should be used for providing the user with quick prompt options where decisions should be made quickly. They should be used for actions that are not reversible, such as deleting an item.

`DialogActions` should be used to provide the user with a set of actions to choose from. The actions should be clear and concise, and should be used to guide the user to the next step in the process.

The container adds layout, not action behavior or an implicit accessibility role.
Use `DialogTrigger` for actions that close the dialog, or close a controlled dialog in your
own handler after validation succeeds. Native submit and reset buttons still act on their
owning form. Disabled buttons, accessible names, and confirmation state belong to the caller.

`position` defaults to `end`; use `start` for secondary actions. The two positions share a
row on wide screens and stack into separate rows at viewport widths of 480px or less.
The native `hidden` prop hides the container and its actions until it is removed.
