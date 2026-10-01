import * as React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';
import { isConformant } from '../../testing/isConformant';
import type { ToastContainerProps } from './ToastContainer.types';
import { toastContainerClassNames } from './useToastContainerStyles.styles';
import { resetIdsForTests } from '@fluentui/react-utilities';
import { type PresenceComponentProps } from '@fluentui/react-motion';
import { toasterFocusScope } from '../Toaster/toasterFocusScope';

const defaultToastContainerProps: ToastContainerProps = {
  announce: () => null,
  close: () => null,
  data: {},
  pauseOnHover: false,
  pauseOnWindowBlur: false,
  politeness: 'polite',
  remove: () => null,
  timeout: -1,
  intent: undefined,
  updateId: 0,
  visible: true,
  imperativeRef: { current: null },
  tryRestoreFocus: () => null,
  order: 0,
  content: '',
  onStatusChange: () => null,
  position: 'bottom-end',
  toastId: '',
  priority: 0,
  toasterId: '',
};

const runningTimerSelector = '[data-timer-status="running"]';
const pausedTimerSelector = '[data-timer-status="paused"]';

const FAKE_MOTION_DURATION = 500;

jest.mock('@fluentui/react-motion-components-preview', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  CollapseDelayed: (props: PresenceComponentProps) => {
    const { children, onMotionFinish, visible } = props;

    React.useEffect(() => {
      const timeout = setTimeout(() => {
        onMotionFinish?.(null, { direction: visible ? 'enter' : 'exit' });
      }, FAKE_MOTION_DURATION);

      return () => {
        clearTimeout(timeout);
      };
    }, [onMotionFinish, visible]);

    return <>{children}</>;
  },
}));

describe('ToastContainer', () => {
  beforeEach(() => {
    jest.useRealTimers();
    resetIdsForTests();
  });

  isConformant({
    Component: ToastContainer,
    displayName: 'ToastContainer',
    requiredProps: defaultToastContainerProps,
    isInternal: true,
    disabledTests: [
      'consistent-callback-args',
      // There are conflicts between ToastContainerMotion mock and React
      'make-styles-overrides-win',
    ],
  });

  it('renders a default state', () => {
    const result = render(<ToastContainer {...defaultToastContainerProps}>Default ToastContainer</ToastContainer>);
    expect(result.container).toMatchSnapshot();
  });

  it('should announce on mount', () => {
    const announce = jest.fn();
    const toastProps = { ...defaultToastContainerProps, announce };
    render(<ToastContainer {...toastProps}>ToastContainer</ToastContainer>);

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('ToastContainer', { politeness: 'polite' });
  });

  it('should announce on updateId change', () => {
    const announce = jest.fn();
    const toastProps = { ...defaultToastContainerProps, announce };
    const { rerender } = render(<ToastContainer {...toastProps}>ToastContainer</ToastContainer>);

    toastProps.updateId++;

    rerender(<ToastContainer {...toastProps}>ToastContainer</ToastContainer>);

    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenNthCalledWith(2, 'ToastContainer', { politeness: 'polite' });
  });

  it('should announce with configured politeness', () => {
    const announce = jest.fn();
    const toastProps: ToastContainerProps = { ...defaultToastContainerProps, announce, politeness: 'assertive' };
    render(<ToastContainer {...toastProps}>ToastContainer</ToastContainer>);

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('ToastContainer', { politeness: 'assertive' });
  });

  it('should respect user root', () => {
    const className = 'foo';
    const toastProps: ToastContainerProps = { ...defaultToastContainerProps, data: { root: { className } } };
    const { container } = render(<ToastContainer {...toastProps}>ToastContainer</ToastContainer>);

    expect(container.querySelector(`.${className}`)).not.toBe(null);
  });

  it('should remove toast after visible is false', () => {
    jest.useFakeTimers();
    const remove = jest.fn();
    const toastProps: ToastContainerProps = { ...defaultToastContainerProps, remove };
    const { rerender } = render(<ToastContainer {...toastProps}>ToastContainer</ToastContainer>);
    toastProps.visible = false;
    rerender(<ToastContainer {...toastProps}>ToastContainer</ToastContainer>);

    jest.advanceTimersByTime(500);

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('should start timer after toast on animationend', () => {
    jest.useFakeTimers();

    const toastProps: ToastContainerProps = { ...defaultToastContainerProps, timeout: 1 };
    const { container } = render(<ToastContainer {...toastProps}>ToastContainer</ToastContainer>);

    const toastElement = container.querySelector(`.${toastContainerClassNames.root}`);
    expect(toastElement).not.toBeNull();
    act(() => {
      jest.advanceTimersToNextTimer(FAKE_MOTION_DURATION);
    });

    expect(container.querySelector(runningTimerSelector)).not.toBeNull();
  });

  it('should close toast ontimeout', () => {
    jest.useFakeTimers();

    const close = jest.fn();
    const toastProps: ToastContainerProps = { ...defaultToastContainerProps, timeout: 500, close };
    const { container } = render(<ToastContainer {...toastProps}>ToastContainer</ToastContainer>);

    const toastElement = container.querySelector(`.${toastContainerClassNames.root}`);
    expect(toastElement).not.toBeNull();

    act(() => {
      jest.advanceTimersByTime(FAKE_MOTION_DURATION);
    });

    const timer = container.querySelector(runningTimerSelector);
    expect(timer).not.toBeNull();

    act(() => {
      if (timer) {
        fireEvent.animationEnd(timer);
      }
    });

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('should pause on hover', () => {
    jest.useFakeTimers();

    const toastProps: ToastContainerProps = { ...defaultToastContainerProps, timeout: 1, pauseOnHover: true };
    const { container } = render(<ToastContainer {...toastProps}>ToastContainer</ToastContainer>);

    const toastElement = container.querySelector(`.${toastContainerClassNames.root}`);
    expect(toastElement).not.toBeNull();

    act(() => {
      jest.advanceTimersToNextTimer(FAKE_MOTION_DURATION);
    });

    expect(container.querySelector(runningTimerSelector)).not.toBeNull();

    act(() => {
      if (toastElement) {
        fireEvent.mouseEnter(toastElement);
      }
    });

    expect(container.querySelector(pausedTimerSelector)).not.toBeNull();

    act(() => {
      if (toastElement) {
        fireEvent.mouseLeave(toastElement);
      }
    });

    expect(container.querySelector(runningTimerSelector)).not.toBeNull();
  });

  it('should pause on window blur', () => {
    jest.useFakeTimers();

    const toastProps: ToastContainerProps = { ...defaultToastContainerProps, timeout: 1, pauseOnWindowBlur: true };
    const { container } = render(<ToastContainer {...toastProps}>ToastContainer</ToastContainer>);

    const toastElement = container.querySelector(`.${toastContainerClassNames.root}`);
    expect(toastElement).not.toBeNull();

    act(() => {
      jest.advanceTimersByTime(FAKE_MOTION_DURATION);
    });

    expect(container.querySelector(runningTimerSelector)).not.toBeNull();

    act(() => {
      fireEvent.blur(window);
    });

    expect(container.querySelector(pausedTimerSelector)).not.toBeNull();

    act(() => {
      fireEvent.focus(window);
    });

    expect(container.querySelector(runningTimerSelector)).not.toBeNull();
  });

  it('keeps a non-pausing hover timer running and forwards the distinct native callbacks', () => {
    jest.useFakeTimers();
    const onMouseEnter = jest.fn();
    const onMouseLeave = jest.fn();
    const { container } = render(
      <ToastContainer {...defaultToastContainerProps} timeout={1000} data={{ root: { onMouseEnter, onMouseLeave } }} />,
    );
    act(() => jest.advanceTimersByTime(FAKE_MOTION_DURATION));
    const root = container.querySelector(`.${toastContainerClassNames.root}`)!;
    fireEvent.mouseEnter(root);
    expect(container.querySelector(runningTimerSelector)).not.toBeNull();
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onMouseLeave).not.toHaveBeenCalled();
    fireEvent.mouseLeave(root);
    expect(container.querySelector(runningTimerSelector)).not.toBeNull();
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
  });

  it('does not let pointer or window resumption erase an application pause', () => {
    jest.useFakeTimers();
    const imperativeRef: ToastContainerProps['imperativeRef'] = { current: null };
    const { container } = render(
      <ToastContainer
        {...defaultToastContainerProps}
        timeout={1000}
        pauseOnHover
        pauseOnWindowBlur
        imperativeRef={imperativeRef}
      />,
    );
    act(() => jest.advanceTimersByTime(FAKE_MOTION_DURATION));
    expect(container.querySelector(runningTimerSelector)).not.toBeNull();
    act(() => imperativeRef.current!.pause());
    const root = container.querySelector(`.${toastContainerClassNames.root}`)!;
    fireEvent.mouseEnter(root);
    fireEvent.blur(window);
    fireEvent.mouseLeave(root);
    fireEvent.focus(window);
    expect(container.querySelector(pausedTimerSelector)).not.toBeNull();
    act(() => imperativeRef.current!.play());
    expect(container.querySelector(runningTimerSelector)).not.toBeNull();
  });

  it('keeps window pause intact when hover ends and hover pause intact when the window refocuses', () => {
    jest.useFakeTimers();
    const { container } = render(
      <ToastContainer {...defaultToastContainerProps} timeout={1000} pauseOnHover pauseOnWindowBlur />,
    );
    act(() => jest.advanceTimersByTime(FAKE_MOTION_DURATION));
    const root = container.querySelector(`.${toastContainerClassNames.root}`)!;
    fireEvent.mouseEnter(root);
    fireEvent.blur(window);
    fireEvent.mouseLeave(root);
    expect(container.querySelector(pausedTimerSelector)).not.toBeNull();
    fireEvent.mouseEnter(root);
    fireEvent.focus(window);
    expect(container.querySelector(pausedTimerSelector)).not.toBeNull();
    fireEvent.mouseLeave(root);
    expect(container.querySelector(runningTimerSelector)).not.toBeNull();
  });

  it.each([
    { scope: 'own-scope', expected: pausedTimerSelector },
    { scope: 'other-scope', expected: runningTimerSelector },
    { scope: undefined, expected: runningTimerSelector },
  ])('resolves focused stack scope $scope without leaking between instances', ({ scope, expected }) => {
    jest.useFakeTimers();
    const { container, getByText } = render(
      <>
        <div data-toaster-focus-scope="own-scope">
          <button>Focused other position</button>
        </div>
        <ToastContainer
          {...defaultToastContainerProps}
          timeout={1000}
          data={scope === undefined ? {} : { [toasterFocusScope]: scope }}
        />
      </>,
    );
    act(() => getByText('Focused other position').focus());
    act(() => jest.advanceTimersByTime(FAKE_MOTION_DURATION));
    expect(container.querySelector(expected)).not.toBeNull();
  });

  it('uses root containment for standalone toast focus without private scope metadata', () => {
    jest.useFakeTimers();
    const imperativeRef: ToastContainerProps['imperativeRef'] = { current: null };
    const { container, getByText } = render(
      <ToastContainer {...defaultToastContainerProps} timeout={1000} imperativeRef={imperativeRef}>
        <button>Standalone action</button>
      </ToastContainer>,
    );
    act(() => jest.advanceTimersByTime(FAKE_MOTION_DURATION));
    expect(container.querySelector(runningTimerSelector)).not.toBeNull();
    act(() => {
      getByText('Standalone action').focus();
      imperativeRef.current!.play();
    });
    expect(container.querySelector(pausedTimerSelector)).not.toBeNull();
    act(() => {
      getByText('Standalone action').blur();
      imperativeRef.current!.play();
    });
    expect(container.querySelector(runningTimerSelector)).not.toBeNull();
  });

  it('should render different timer on update', () => {
    const toastProps: ToastContainerProps = { ...defaultToastContainerProps, timeout: 1 };
    const { container, rerender } = render(<ToastContainer {...toastProps}>ToastContainer</ToastContainer>);

    const firstTimer = container.querySelector(pausedTimerSelector);
    expect(firstTimer).not.toBeNull();

    toastProps.updateId++;
    rerender(<ToastContainer {...toastProps}>ToastContainer</ToastContainer>);

    const secondTimer = container.querySelector(pausedTimerSelector);
    expect(firstTimer).not.toBe(secondTimer);
  });
});
