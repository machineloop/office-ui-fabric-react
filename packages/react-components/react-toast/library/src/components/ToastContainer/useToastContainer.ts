'use client';

import * as React from 'react';
import type { ExtractSlotProps, Slot } from '@fluentui/react-utilities';
import { getIntrinsicElementProps, useMergedRefs, useEventCallback, useId, slot } from '@fluentui/react-utilities';
import { useFluent_unstable } from '@fluentui/react-shared-contexts';
import { Delete, Tab } from '@fluentui/keyboard-keys';
import { useFocusableGroup, useFocusFinders } from '@fluentui/react-tabster';
import type { ToastImperativeRef, ToastStatus } from '../../state';
import type { FocusToastImperativeRef } from '../../state/types';
import type { ToastContainerProps, ToastContainerState } from './ToastContainer.types';
import type { TimerProps } from '../Timer/Timer';
import { Timer } from '../Timer/Timer';
import { toasterFocusScope } from '../Toaster/toasterFocusScope';

const intentPolitenessMap = {
  success: 'assertive',
  warning: 'assertive',
  error: 'assertive',
  info: 'polite',
} as const;

/**
 * Create the state required to render ToastContainer.
 *
 * The returned state can be modified with hooks such as useToastContainerStyles_unstable,
 * before being passed to renderToastContainer_unstable.
 *
 * @param props - props from this instance of ToastContainer
 * @param ref - reference to root HTMLElement of ToastContainer
 */
export const useToastContainer_unstable = (
  props: ToastContainerProps,
  ref: React.Ref<HTMLElement>,
): ToastContainerState => {
  const {
    visible,
    children,
    close: closeProp,
    remove,
    updateId,
    announce,
    data,
    timeout: timerTimeout,
    politeness: desiredPoliteness,
    intent = 'info',
    pauseOnHover,
    pauseOnWindowBlur,
    imperativeRef,
    tryRestoreFocus,
    content: _content, // `content` is a slot and it's type clashes with the HTMLElement `content` attribute
    ...rest
  } = props;
  const titleId = useId('toast-title');
  const bodyId = useId('toast-body');
  const toastRef = React.useRef<HTMLDivElement | null>(null);
  const { targetDocument } = useFluent_unstable();
  const [running, setRunning] = React.useState(false);
  const imperativePauseRef = React.useRef(false);
  const focusPauseRef = React.useRef(false);
  const hoveredRef = React.useRef(false);
  const windowBlurredRef = React.useRef(false);
  const enteredRef = React.useRef(false);
  const focusedToastBeforeClose = React.useRef(false);
  const focusableGroupAttribute = useFocusableGroup({
    tabBehavior: 'limited-trap-focus',
    // Users should only use Tab to focus into the toast
    // Escape is already reserved to dismiss all toasts
    ignoreDefaultKeydown: { Tab: true, Escape: true, Enter: true },
  });

  const close = useEventCallback(() => {
    const activeElement = targetDocument?.activeElement;
    if (activeElement && toastRef.current?.contains(activeElement)) {
      focusedToastBeforeClose.current = true;
    }

    closeProp();
  });
  const onStatusChange = useEventCallback((status: ToastStatus) => props.onStatusChange?.(null, { status, ...props }));
  const updateRunning = useEventCallback(() => {
    const activeElement = targetDocument?.activeElement ?? null;
    const stack = toastRef.current?.closest('[data-toaster-position]');
    const focusedStack = activeElement?.closest('[data-toaster-focus-scope]');
    const focusScope = toasterFocusScope in data ? data[toasterFocusScope] : undefined;
    const containsActive =
      focusedStack && typeof focusScope === 'string'
        ? focusedStack.getAttribute('data-toaster-focus-scope') === focusScope
        : !!(stack ?? toastRef.current)?.contains(activeElement);
    setRunning(
      enteredRef.current &&
        !imperativePauseRef.current &&
        !focusPauseRef.current &&
        !(pauseOnHover && hoveredRef.current) &&
        !(pauseOnWindowBlur && windowBlurredRef.current) &&
        !containsActive,
    );
  });

  React.useImperativeHandle<ToastImperativeRef, FocusToastImperativeRef>(imperativeRef, () => ({
    focus: () => {
      if (!toastRef.current) {
        return;
      }

      toastRef.current.focus();
    },

    play: () => {
      imperativePauseRef.current = false;
      updateRunning();
    },
    pause: () => {
      imperativePauseRef.current = true;
      updateRunning();
    },
    playFocus: () => {
      focusPauseRef.current = false;
      updateRunning();
    },
    pauseFocus: () => {
      focusPauseRef.current = true;
      updateRunning();
    },
  }));

  React.useEffect(() => {
    return () => onStatusChange('unmounted');
  }, [onStatusChange]);

  React.useEffect(() => {
    if (!targetDocument) {
      return;
    }

    if (pauseOnWindowBlur) {
      const onFocus = () => {
        windowBlurredRef.current = false;
        updateRunning();
      };
      const onBlur = () => {
        windowBlurredRef.current = true;
        updateRunning();
      };
      targetDocument.defaultView?.addEventListener('focus', onFocus);
      targetDocument.defaultView?.addEventListener('blur', onBlur);
      return () => {
        targetDocument.defaultView?.removeEventListener('focus', onFocus);
        targetDocument.defaultView?.removeEventListener('blur', onBlur);
      };
    }
    windowBlurredRef.current = false;
  }, [targetDocument, updateRunning, pauseOnWindowBlur]);

  React.useEffect(() => {
    updateRunning();
  }, [pauseOnHover, pauseOnWindowBlur, updateRunning]);

  // Users never actually use ToastContainer as a JSX but imperatively through useToastContainerController
  const userRootSlot = (data as { root?: ExtractSlotProps<Slot<'div'>> }).root;
  const onMotionFinish = React.useCallback(
    (_: null, { direction }: { direction: 'exit' | 'enter' }) => {
      if (direction === 'exit') {
        remove();
      }

      if (direction === 'enter') {
        // start toast once it's fully animated in
        enteredRef.current = true;
        updateRunning();
        onStatusChange('visible');
      }
    },
    [onStatusChange, updateRunning, remove],
  );

  const onMouseEnter = useEventCallback((e: React.MouseEvent<HTMLDivElement>) => {
    hoveredRef.current = true;
    updateRunning();
    userRootSlot?.onMouseEnter?.(e);
  });

  const onMouseLeave = useEventCallback((e: React.MouseEvent<HTMLDivElement>) => {
    hoveredRef.current = false;
    updateRunning();
    userRootSlot?.onMouseLeave?.(e);
  });

  const { findFirstFocusable, findLastFocusable } = useFocusFinders();
  const onKeyDown = useEventCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === Delete) {
      e.preventDefault();
      close();
    }

    if (e.key === Tab && e.currentTarget === e.target) {
      e.preventDefault();
      if (e.shiftKey) {
        findLastFocusable(e.currentTarget)?.focus();
      } else {
        findFirstFocusable(e.currentTarget)?.focus();
      }
    }

    userRootSlot?.onKeyDown?.(e);
  });

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    const politeness = desiredPoliteness ?? intentPolitenessMap[intent];
    announce(toastRef.current?.textContent ?? '', { politeness });
  }, [announce, desiredPoliteness, toastRef, visible, updateId, intent]);

  React.useEffect(() => {
    return () => {
      if (focusedToastBeforeClose.current) {
        focusedToastBeforeClose.current = false;
        tryRestoreFocus();
      }
    };
  }, [tryRestoreFocus]);

  return {
    components: {
      timer: Timer,
      root: 'div',
    },
    timer: slot.always<TimerProps>({ onTimeout: close, running, timeout: timerTimeout ?? -1 }, { elementType: Timer }),
    root: slot.always(
      getIntrinsicElementProps('div', {
        // FIXME:
        // `ref` is wrongly assigned to be `HTMLElement` instead of `HTMLDivElement`
        // but since it would be a breaking change to fix it, we are casting ref to it's proper type
        ref: useMergedRefs(ref, toastRef) as React.Ref<HTMLDivElement>,
        children,
        tabIndex: 0,
        role: 'listitem',
        'aria-labelledby': titleId,
        'aria-describedby': bodyId,
        ...rest,
        ...userRootSlot,
        ...focusableGroupAttribute,
        onMouseEnter,
        onMouseLeave,
        onKeyDown,
      }),
      { elementType: 'div' },
    ),
    timerTimeout,
    transitionTimeout: 0,
    running,
    visible,
    remove,
    close,
    onTransitionEntering: () => {
      /* no-op */
    },
    updateId,
    nodeRef: toastRef,
    intent,
    titleId,
    bodyId,
    onMotionFinish,
  };
};
