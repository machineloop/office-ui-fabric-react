import type { ComponentProps, ComponentState, Slot } from '@fluentui/react-utilities';
import type { ButtonBaseProps, ButtonBaseState, ButtonProps, ButtonSlots, ButtonState } from '../Button/Button.types';

export type MenuButtonSlots = ButtonSlots & {
  /**
   * Trailing menu icon that indicates that this button has a menu that can be expanded.
   * Defaults to a chevron on the styled MenuButton; null omits it.
   * Omitted when there is a populated leading icon and no content. Numeric zero is content.
   */
  menuIcon?: Slot<'span'>;
};

/**
 * Button with a leading icon and a trailing menuIcon.
 * aria-expanded controls its selected root and leading-icon appearance, not popup state.
 * Use MenuTrigger or an author-provided popup controller for menu behavior and relationships.
 * Current MenuTrigger supplies aria-haspopup/aria-expanded and labels the menu via the trigger id,
 * but does not generate aria-controls; authors can supply that relationship explicitly.
 */
export type MenuButtonProps = ComponentProps<MenuButtonSlots> &
  Pick<ButtonProps, 'appearance' | 'disabledFocusable' | 'disabled' | 'shape' | 'size'>;

export type MenuButtonState = ComponentState<MenuButtonSlots> &
  Omit<ButtonState, keyof ButtonSlots | 'components' | 'iconPosition'>;

/**
 * MenuButton Props without the `appearance`/`size`/`shape` styling props, for headless usage.
 */
export type MenuButtonBaseProps = ComponentProps<MenuButtonSlots> &
  Pick<ButtonBaseProps, 'disabled' | 'disabledFocusable'>;

/**
 * MenuButton State without the `appearance`/`size`/`shape` styling props, for headless usage.
 */
export type MenuButtonBaseState = ComponentState<MenuButtonSlots> &
  Omit<ButtonBaseState, keyof ButtonSlots | 'components' | 'iconPosition'>;
