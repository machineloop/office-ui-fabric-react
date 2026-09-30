'use client';

import * as React from 'react';
import { useFluent_unstable } from '@fluentui/react-shared-contexts';

import { useBodyNoScrollStyles, useHTMLNoScrollStyles } from './useDisableBodyScroll.styles';

const scrollLockCounts = new WeakMap<Document, number>();

/**
 * A React *hook* that disables body scrolling through `overflowY: hidden` CSS property
 *
 * @internal
 */
export function useDisableBodyScroll(): {
  disableBodyScroll: () => void;
  enableBodyScroll: () => void;
} {
  const htmlNoScrollStyles = useHTMLNoScrollStyles();
  const bodyNoScrollStyles = useBodyNoScrollStyles();
  const { targetDocument } = useFluent_unstable();
  const lockedDocument = React.useRef<Document | undefined>(undefined);

  const disableBodyScroll = React.useCallback(() => {
    if (!targetDocument || lockedDocument.current) {
      return;
    }
    const isHorizontalScrollbarVisible =
      // When the window is a fractional height, `innerHeight` always rounds down but `clientHeight` rounds either up or down depending on the value.
      // To properly compare the body clientHeight to the window innerHeight, manually round down the fractional value to match innerHeight's calculation.
      Math.floor(targetDocument.body.getBoundingClientRect().height) > (targetDocument.defaultView?.innerHeight ?? 0);
    if (!isHorizontalScrollbarVisible) {
      return;
    }
    targetDocument.documentElement.classList.add(htmlNoScrollStyles);
    targetDocument.body.classList.add(bodyNoScrollStyles);
    scrollLockCounts.set(targetDocument, (scrollLockCounts.get(targetDocument) ?? 0) + 1);
    lockedDocument.current = targetDocument;
    return;
  }, [targetDocument, htmlNoScrollStyles, bodyNoScrollStyles]);

  const enableBodyScroll = React.useCallback(() => {
    const documentToUnlock = lockedDocument.current;
    if (!documentToUnlock) {
      return;
    }
    lockedDocument.current = undefined;
    const remainingLocks = (scrollLockCounts.get(documentToUnlock) ?? 1) - 1;
    if (remainingLocks > 0) {
      scrollLockCounts.set(documentToUnlock, remainingLocks);
      return;
    }
    scrollLockCounts.delete(documentToUnlock);
    documentToUnlock.documentElement.classList.remove(htmlNoScrollStyles);
    documentToUnlock.body.classList.remove(bodyNoScrollStyles);
  }, [htmlNoScrollStyles, bodyNoScrollStyles]);

  return {
    disableBodyScroll,
    enableBodyScroll,
  };
}
