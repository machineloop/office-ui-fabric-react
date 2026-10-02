'use client';

import * as React from 'react';
import type { Announce } from '../AriaLive';

/**
 * Wraps an aria live announcement function.
 * Aria live announcements can be detrimental once the user is already navigating
 * multiple toasts. Once the user is focused inside the toaster, announcements should be disabled.
 * @param announce - The aria live announcement function to wrap
 * @param focusScope - The instance scope shared by every position of the toaster
 * @returns A function to announce a toast and a ref to attach to the toaster element
 */
export function useToastAnnounce(
  announce: Announce,
  focusScope?: string,
): {
  announceToast: Announce;
  toasterRef: React.RefCallback<HTMLDivElement>;
} {
  const elementRef = React.useRef<HTMLDivElement | null>(null);
  const announceToast = React.useCallback<Announce>(
    (message, options) => {
      const root = elementRef.current?.getRootNode() as Document | ShadowRoot | undefined;
      const activeElement = root?.activeElement;
      const focused = focusScope
        ? activeElement?.closest('[data-toaster-focus-scope]')?.getAttribute('data-toaster-focus-scope') === focusScope
        : !!activeElement && !!elementRef.current?.contains(activeElement);
      if (!focused) {
        announce(message, options);
      }
    },
    [announce, focusScope],
  );

  const toasterRef = React.useCallback((el: HTMLDivElement | null) => {
    elementRef.current = el;
  }, []);

  return {
    announceToast,
    toasterRef,
  };
}
