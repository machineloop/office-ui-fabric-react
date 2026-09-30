A menu list displays a list of actions. It is usually rendered inside of the Menu component.

A permanent list is also supported. Give a standalone list an accessible name with
`aria-label` or `aria-labelledby`. Within `Menu`, the list uses the generated trigger
ID as its default label; if you supply your own trigger ID, explicitly point the list's
`aria-labelledby` at it. Native `hidden` hides the list and removes its actions from
keyboard navigation until it is removed.

The list is one keyboard tab stop. Arrow keys cycle through focusable items, Home and
End move to the first and last item, and typing an initial character searches forward
and wraps, ignoring case. Disabled menu items remain focusable but cannot activate.
In a popup, Tab or Shift+Tab closes the menu and continues navigation outside it.
Submenu open and close arrows follow the provider's text direction.

`defaultCheckedValues` initializes uncontrolled checkbox and radio groups once.
For controlled selection, update `checkedValues` in `onCheckedValueChange`; without
that update, selection stays at the supplied values. Each callback reports the group
`name` and its new `checkedItems`. Checkbox groups allow multiple values; radio groups
select one. Prefer supplying these props on `Menu` when it owns the list.
`hasIcons` and `hasCheckmarks` reserve item alignment slots; an explicit `false` on the
list overrides the corresponding inherited hint.
