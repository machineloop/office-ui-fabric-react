'use client';

import * as React from 'react';

import { Label } from '@fluentui/react-label';
import {
  mergeCallbacks,
  useId,
  slot,
  useEventCallback,
  useMergedRefs,
  elementContains,
} from '@fluentui/react-utilities';
import { InfoButton } from '../InfoButton/InfoButton';
import type { InfoLabelProps, InfoLabelState } from './InfoLabel.types';

/**
 * Create the state required to render InfoLabel.
 *
 * The returned state can be modified with hooks such as useInfoLabelStyles_unstable,
 * before being passed to renderInfoLabel_unstable.
 *
 * @param props - props from this instance of InfoLabel
 * @param ref - reference to label element of InfoLabel
 */
export const useInfoLabel_unstable = (props: InfoLabelProps, ref: React.Ref<HTMLLabelElement>): InfoLabelState => {
  const {
    root: rootShorthand,
    label: labelShorthand,
    infoButton: infoButtonShorthand,
    info,
    size,
    className,
    style,
    ...labelProps
  } = props;
  const baseId = useId('infolabel-');

  const root = slot.always(rootShorthand, {
    defaultProps: {
      className,
      style,
    },
    elementType: 'span',
  });

  const label = slot.always(labelShorthand, {
    defaultProps: {
      id: baseId + '__label',
      ref,
      size,
      ...labelProps,
    },
    elementType: Label,
  });

  const infoButton = slot.optional(infoButtonShorthand, {
    renderByDefault: !!info,
    defaultProps: {
      id: baseId + '__infoButton',
      size,
      info,
    },
    elementType: InfoButton,
  });

  const infoButtonPopover = slot.always(infoButton?.popover, {
    elementType: 'div',
  });
  const [open, setOpen] = React.useState(infoButtonPopover.defaultOpen ?? false);
  const hasInfoButton = !!infoButton;
  const hadInfoButton = React.useRef(hasInfoButton);
  React.useEffect(() => {
    if (!hasInfoButton || !hadInfoButton.current) {
      setOpen(hasInfoButton && (infoButtonPopover.defaultOpen ?? false));
    }
    hadInfoButton.current = hasInfoButton;
  }, [hasInfoButton, infoButtonPopover.defaultOpen]);
  infoButtonPopover.onOpenChange = useEventCallback(
    mergeCallbacks(infoButtonPopover.onOpenChange, (_, data) => {
      setOpen(data.open);
    }),
  );

  const infoPopupId = baseId + '__info';
  const infoSlot = slot.optional(infoButton?.info, {
    defaultProps: {
      id: infoPopupId,
    },
    elementType: 'div',
  });
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const infoRef = React.useRef<HTMLDivElement>(null);
  const mergedButtonRef = useMergedRefs(buttonRef, infoButton?.ref);
  const mergedInfoRef = useMergedRefs(infoRef, infoSlot?.ref);
  const onBlurButtonOrInfo = useEventCallback((event: React.FocusEvent) => {
    const nextFocused = event.relatedTarget;
    if (nextFocused && buttonRef.current !== nextFocused && !elementContains(infoRef.current, nextFocused)) {
      setOpen(false);
    }
  });

  if (infoButton) {
    infoButton.popover = infoButtonPopover;
    infoButton.ref = mergedButtonRef;
    infoButton.onBlur = mergeCallbacks(infoButton.onBlur, onBlurButtonOrInfo);
    infoButton.info = infoSlot;
    if (infoSlot) {
      infoSlot['aria-labelledby'] ??= infoSlot.id;
      infoSlot.ref = mergedInfoRef;
      infoSlot.onBlurCapture = mergeCallbacks(infoSlot.onBlurCapture, onBlurButtonOrInfo);
    }

    infoButton['aria-labelledby'] ??= `${label.id} ${infoButton.id}`;

    if (infoButtonPopover.open ?? open) {
      root['aria-owns'] ??= infoButton.info?.id;
    }
  }

  return {
    size,
    components: {
      root: 'span',
      label: Label,
      infoButton: InfoButton,
    },
    root,
    label,
    infoButton,
  };
};
