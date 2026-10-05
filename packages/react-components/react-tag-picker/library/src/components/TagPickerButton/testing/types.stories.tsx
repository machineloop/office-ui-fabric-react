import * as React from 'react';
import type { JSXElement } from '@fluentui/react-components';
import {
  TagPickerButton,
  useTagPickerButtonBase_unstable,
  useTagPickerButton_unstable,
  useTagPickerButtonStyles_unstable,
  renderTagPickerButton_unstable,
} from '../../../index';
import type { TagPickerButtonProps, TagPickerButtonBaseProps, TagPickerButtonBaseState } from '../../../index';

const ref = React.createRef<HTMLButtonElement>();
export const nativeProps: TagPickerButtonProps = {
  type: 'submit',
  name: 'fruit',
  value: 'apple',
  form: 'native-form',
  disabled: true,
  size: 'large',
  appearance: 'underline',
  'aria-label': 'Fruit',
};
export const nativeButton = (
  <TagPickerButton {...nativeProps} ref={ref}>
    <strong>Choose fruit</strong>
  </TagPickerButton>
);
// @ts-expect-error - The actual button API has no disabledFocusable design prop.
export const unsupportedDisabledFocusable: TagPickerButtonProps = { disabledFocusable: true };
// @ts-expect-error - Placeholder exists in the legacy hook implementation, not its public type.
export const unsupportedPlaceholder: TagPickerButtonProps = { placeholder: 'Fruit' };
export const acceptedButIgnoredSmallSize: TagPickerButtonProps = { size: 'small' };
// @ts-expect-error - Dropdown design props do not have extra-large, unlike picker context.
export const unsupportedSize: TagPickerButtonProps = { size: 'extra-large' };
// @ts-expect-error - This component has no icon slot.
export const unsupportedIcon: TagPickerButtonProps = { icon: <span /> };
// @ts-expect-error - Base hooks exclude size.
export const unsupportedBaseSize: TagPickerButtonBaseProps = { size: 'large' };
// @ts-expect-error - The root is a native button slot, not an anchor slot.
export const unsupportedAnchor: TagPickerButtonProps = { as: 'a', href: '#' };
// @ts-expect-error - The forwarded DOM reference must be a button.
export const unsupportedRef = <TagPickerButton ref={React.createRef<HTMLInputElement>()} />;
export const FullComposition = (props: TagPickerButtonProps): JSXElement => {
  const state = useTagPickerButton_unstable(props, ref);
  useTagPickerButtonStyles_unstable(state);
  return renderTagPickerButton_unstable(state);
};
export const BaseComposition = (props: TagPickerButtonBaseProps): JSXElement => {
  const state: TagPickerButtonBaseState = useTagPickerButtonBase_unstable(props, ref);
  // @ts-expect-error - Base state deliberately has no design-only size.
  const size = state.size;
  return <div data-unsupported-size={String(size)}>{renderTagPickerButton_unstable(state)}</div>;
};
