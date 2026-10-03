import * as React from 'react';
import { createEvent, fireEvent, render } from '@testing-library/react';
import { MenuItemLink } from './MenuItemLink';
import { isConformant } from '../../testing/isConformant';
import { Enter, Space } from '@fluentui/keyboard-keys';
import { mockUseMenuContext } from '../../testing/mockUseMenuContext';
import { MenuTriggerContextProvider } from '../../contexts/menuTriggerContext';
import { useMenuItemLinkBase_unstable, useMenuItemLink_unstable } from './useMenuItemLink';
import { renderMenuItemLink_unstable } from './renderMenuItemLink';
import type { MenuItemLinkProps } from './MenuItemLink.types';

jest.mock('../../contexts/menuContext');

describe('MenuItemLink', () => {
  isConformant({
    Component: MenuItemLink,
    displayName: 'MenuItemLink',
    testOptions: {
      'has-static-classnames': [
        {
          props: {
            icon: 'Test Icon',
            checkmark: 'Test Checkmark',
            submenuIndicator: 'Test Submenu Indicator',
            content: 'Test Content',
            secondaryContent: 'Test Secondary Content',
          },
        },
      ],
    },
  });

  // TODO add more tests here, and create visual regression tests in /apps/vr-tests

  it('renders a default state', () => {
    const result = render(<MenuItemLink href="#">Default MenuItemLink</MenuItemLink>);
    expect(result.container).toMatchSnapshot();
  });

  it('accepts an object content slot without forwarding it as the native RDFa content attribute', () => {
    const { getByRole } = render(
      <MenuItemLink href="#document" content={{ children: 'Resolved content', className: 'consumer-content' }}>
        Fallback
      </MenuItemLink>,
    );
    const link = getByRole('menuitem');
    expect(link.textContent).toBe('Resolved content');
    expect(link.getAttribute('content')).toBeNull();
    expect(link.querySelector('.consumer-content')).not.toBeNull();
  });

  it('should swallow click events is `disabled` prop is set', () => {
    // Arrange
    const spy = jest.fn();
    const { getByRole } = render(
      <MenuItemLink disabled onClick={spy} href={''}>
        Item
      </MenuItemLink>,
    );

    // Act
    fireEvent.click(getByRole('menuitem'));

    // Assert
    expect(spy).toHaveBeenCalledTimes(0);
  });

  it.each([Enter, Space])('should swallow %s keydown events if `disabled` prop is set', key => {
    // Arrange
    const spy = jest.fn();
    const { getByRole } = render(
      <MenuItemLink disabled onClick={spy} href={''}>
        Item
      </MenuItemLink>,
    );

    // Act
    fireEvent.keyDown(getByRole('menuitem'), { key });

    // Assert
    expect(spy).toHaveBeenCalledTimes(0);
  });

  it('should dismiss on click', () => {
    // Arrange
    const setOpen = jest.fn();
    mockUseMenuContext({ setOpen });
    const { getByRole } = render(<MenuItemLink href={''}>Item</MenuItemLink>);

    // Act
    fireEvent.click(getByRole('menuitem'));

    // Assert
    expect(setOpen).toHaveBeenCalledTimes(1);
    expect(setOpen).toHaveBeenCalledWith(expect.anything(), {
      open: false,
      bubble: true,
      keyboard: false,
      type: 'menuItemClick',
      event: expect.anything(),
    });
  });

  it('should not call setOpen if persistOnItemClick is true in context', () => {
    // Arrange
    const setOpen = jest.fn();
    mockUseMenuContext({ setOpen, persistOnItemClick: true });
    const { getByRole } = render(<MenuItemLink href={''}>Item</MenuItemLink>);

    // Act
    fireEvent.click(getByRole('menuitem'));

    // Assert
    expect(setOpen).toHaveBeenCalledTimes(0);
  });

  it('should not keyboard click for a default prevented event', () => {
    // Arrange
    mockUseMenuContext();
    const onClick = jest.fn();
    const { getByRole } = render(
      <MenuItemLink onClick={onClick} href={''}>
        Item
      </MenuItemLink>,
    );

    // Act
    const event = createEvent.keyDown(getByRole('menuitem'), { key: Enter });
    event.preventDefault();
    fireEvent(getByRole('menuitem'), event);

    // Assert
    expect(onClick).toHaveBeenCalledTimes(0);
  });

  it('should not call setOpen if the menu item controls a submenu', () => {
    // Arrange
    const setOpen = jest.fn();
    mockUseMenuContext({ setOpen });
    const { getByRole } = render(
      <MenuTriggerContextProvider value={true}>
        <MenuItemLink href={''}>Item</MenuItemLink>
      </MenuTriggerContextProvider>,
    );

    // Act
    fireEvent.click(getByRole('menuitem'));

    // Assert
    expect(setOpen).toHaveBeenCalledTimes(0);
  });

  it.each([
    ['styled', useMenuItemLink_unstable],
    ['base', useMenuItemLinkBase_unstable],
  ] as const)('retains internal pointer-focus refs while forwarding the consumer anchor ref (%s)', (_, useHook) => {
    mockUseMenuContext();
    const HookLink = React.forwardRef<HTMLAnchorElement, MenuItemLinkProps>((props, ref) =>
      renderMenuItemLink_unstable(useHook(props, ref)),
    );
    const ref = React.createRef<HTMLAnchorElement>();
    const { getAllByRole } = render(
      <>
        <HookLink href="#first">First</HookLink>
        <HookLink href="#second" ref={ref}>
          Second
        </HookLink>
      </>,
    );
    const [first, second] = getAllByRole('menuitem');
    first.focus();
    fireEvent.mouseMove(second);
    expect(second.ownerDocument.activeElement).toBe(second);
    expect(ref.current).toBe(second);
  });
});
