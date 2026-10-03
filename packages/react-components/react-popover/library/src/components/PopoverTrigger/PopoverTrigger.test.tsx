import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { PopoverTrigger } from './PopoverTrigger';
import { mockPopoverContext } from '../../testing/mockUsePopoverContext';
import { isConformant } from '../../testing/isConformant';

jest.mock('../../popoverContext');

describe('PopoverTrigger', () => {
  isConformant({
    Component: PopoverTrigger,
    displayName: 'PopoverTrigger',
    requiredProps: { children: <span /> },
    disabledTests: [
      // PopoverTrigger does not render DOM elements
      'component-handles-ref',
      'component-has-root-ref',
      'component-handles-classname',
      'component-has-static-classnames-object',
      // PopoverTrigger does not have own styles
      'make-styles-overrides-win',
    ],
  });

  beforeEach(() => {
    mockPopoverContext();
  });

  /**
   * Note: see more visual regression tests for PopoverTrigger in /apps/vr-tests.
   */
  it('renders a default state', () => {
    const { container } = render(
      <PopoverTrigger disableButtonEnhancement>
        <button>Popover trigger</button>
      </PopoverTrigger>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it.each([
    ['onClick', fireEvent.click],
    ['onContextMenu', fireEvent.contextMenu],
    ['onKeyDown', fireEvent.keyDown],
    ['onMouseEnter', fireEvent.mouseEnter],
    ['onMouseLeave', fireEvent.mouseLeave],
  ])('should keep the original %s handler', (handler, triggerEvent) => {
    // Arrange
    const spy = jest.fn();
    const { getByRole } = render(
      <PopoverTrigger disableButtonEnhancement>
        <button {...{ [handler]: spy }}>Trigger</button>
      </PopoverTrigger>,
    );

    // Act
    triggerEvent(getByRole('button'));

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should set aria-expanded on trigger element', () => {
    // Arrange
    const { getByRole } = render(
      <PopoverTrigger disableButtonEnhancement>
        <button>Trigger</button>
      </PopoverTrigger>,
    );

    // Assert
    expect(getByRole('button').getAttribute('aria-expanded')).toEqual('false');
  });

  it('should set aria-expanded to context value on trigger element', () => {
    mockPopoverContext({ open: true });

    // Arrange
    const { getByRole } = render(
      <PopoverTrigger disableButtonEnhancement>
        <button>Trigger</button>
      </PopoverTrigger>,
    );

    // Assert
    expect(getByRole('button').getAttribute('aria-expanded')).toEqual('true');
  });

  it('should allow user to override aria-expanded on trigger element', () => {
    // Arrange
    const { getByRole } = render(
      <PopoverTrigger disableButtonEnhancement>
        <button aria-expanded={undefined}>Trigger</button>
      </PopoverTrigger>,
    );

    // Assert
    expect(getByRole('button').getAttribute('aria-expanded')).toBeNull();
  });

  it('dismisses a context popover on trigger Escape after the child handler', () => {
    const setOpen = jest.fn();
    const childKeyDown = jest.fn();
    mockPopoverContext({ open: true, openOnContext: true, setOpen });
    const { getByRole } = render(
      <PopoverTrigger>
        <button onKeyDown={childKeyDown}>Trigger</button>
      </PopoverTrigger>,
    );
    fireEvent.keyDown(getByRole('button'), { key: 'Escape' });
    expect(childKeyDown).toHaveBeenCalledTimes(1);
    expect(setOpen).toHaveBeenCalledTimes(1);
    expect(setOpen).toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape', defaultPrevented: true }), false);
    expect(childKeyDown.mock.invocationCallOrder[0]).toBeLessThan(setOpen.mock.invocationCallOrder[0]);
  });

  it('preserves child cancellation of context-trigger Escape', () => {
    const setOpen = jest.fn();
    mockPopoverContext({ open: true, openOnContext: true, setOpen });
    const { getByRole } = render(
      <PopoverTrigger>
        <button onKeyDown={event => event.preventDefault()}>Trigger</button>
      </PopoverTrigger>,
    );
    fireEvent.keyDown(getByRole('button'), { key: 'Escape' });
    expect(setOpen).not.toHaveBeenCalled();
  });

  it.each([false, true])('stops handled Escape propagation with openOnContext=%s', openOnContext => {
    const setOpen = jest.fn();
    const ancestorKeyDown = jest.fn();
    mockPopoverContext({ open: true, openOnContext, setOpen });
    const { getByRole } = render(
      <div onKeyDown={ancestorKeyDown}>
        <PopoverTrigger>
          <button>Trigger</button>
        </PopoverTrigger>
      </div>,
    );
    fireEvent.keyDown(getByRole('button'), { key: 'Escape' });
    expect(setOpen).toHaveBeenCalledTimes(1);
    expect(ancestorKeyDown).not.toHaveBeenCalled();
  });

  it('should retain original child callback ref', () => {
    // Arrange
    const ref = jest.fn();
    render(
      <PopoverTrigger disableButtonEnhancement>
        <button ref={ref}>Trigger</button>
      </PopoverTrigger>,
    );

    // Assert
    expect(ref).toHaveBeenCalledTimes(1);
    expect(ref.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        <button
          aria-expanded="false"
          data-tabster="{\\"restorer\\":{\\"type\\":1}}"
        >
          Trigger
        </button>,
      ]
    `);
  });

  it('should retain original child ref', () => {
    // Arrange
    const cb = jest.fn();
    const TestComponent = () => {
      const ref = React.useRef(null);
      React.useEffect(() => {
        cb(ref.current);
      }, []);
      return (
        <PopoverTrigger disableButtonEnhancement>
          <button ref={ref}>Trigger</button>
        </PopoverTrigger>
      );
    };
    render(<TestComponent />);

    // Assert
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        <button
          aria-expanded="false"
          data-tabster="{\\"restorer\\":{\\"type\\":1}}"
        >
          Trigger
        </button>,
      ]
    `);
  });
});
