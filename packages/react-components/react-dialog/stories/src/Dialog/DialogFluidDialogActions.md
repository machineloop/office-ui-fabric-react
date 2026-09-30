Use the `fluid` prop on the `DialogActions` component so that it spans the entire width of the dialog. This
prop can be useful for having large number of actions.

`fluid` spans all columns of the `DialogBody` grid. It does not stretch the action container
or its buttons on wide screens: `position` still aligns the container to the start or end.
Use a consumer style such as `width: '100%'` when the container itself should fill that span.
At viewport widths of 480px or less, actions stack vertically and the container stretches.

> A `Dialog` should have no more than **two** actions.
