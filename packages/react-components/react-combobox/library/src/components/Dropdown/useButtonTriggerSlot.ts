'use client';

import * as React from 'react';
import { useTimeout, mergeCallbacks, useEventCallback } from '@fluentui/react-utilities';
import type { Slot, ExtractSlotProps, SlotComponentType } from '@fluentui/react-utilities';
import type { ActiveDescendantImperativeRef } from '@fluentui/react-aria';
import type { UseTriggerSlotState } from '../../utils/useTriggerSlot';
import { useTriggerSlot } from '../../utils/useTriggerSlot';
import { getDropdownActionFromKey } from '../../utils/dropdownKeyActions';

type UseButtonTriggerSlotOptions = {
  state: UseTriggerSlotState;
  defaultProps: unknown;
  activeDescendantController: ActiveDescendantImperativeRef;
};

/**
 * Resolves a native button trigger with Dropdown semantics and type-to-find behavior.
 * The accumulated opening search is matched after options mount; subsequent repeated characters
 * cycle through matching options. Pending searches expire after 500ms.
 * The element type of the ref should always match the element type used in the trigger shorthand.
 *
 * @internal
 */
export function useButtonTriggerSlot(
  triggerFromProps: NonNullable<Slot<'button'>>,
  ref: React.Ref<HTMLButtonElement>,
  options: UseButtonTriggerSlotOptions,
): SlotComponentType<ExtractSlotProps<Slot<'button'>>> {
  const {
    state: { open, setOpen, getOptionById },
    defaultProps,
    activeDescendantController,
  } = options;

  // jump to matching option based on typing
  const searchString = React.useRef('');
  const searchOnOpen = React.useRef(false);
  const [setKeyTimeout, clearKeyTimeout] = useTimeout();

  const moveToNextMatchingOption = (
    matcher: (optionText: string) => boolean,
    opt: { startFromNext: boolean } = { startFromNext: false },
  ) => {
    const { startFromNext } = opt;
    const activeOptionId = activeDescendantController.active();

    const nextInOrder = activeDescendantController.find(
      id => {
        const option = getOptionById(id);
        return !!option && matcher(option.text);
      },
      { startFrom: startFromNext ? activeDescendantController.next({ passive: true }) : activeOptionId },
    );

    if (nextInOrder) {
      return nextInOrder;
    }

    // Cycle back to first match
    return activeDescendantController.find(id => {
      const option = getOptionById(id);
      return !!option && matcher(option.text);
    });
  };

  const moveToNextMatchingOptionWithSameCharacterHandling = (isOpening = false) => {
    if (
      moveToNextMatchingOption(
        optionText => {
          return optionText.toLocaleLowerCase().indexOf(searchString.current) === 0;
        },
        {
          // Slowly pressing the same key will cycle through options
          startFromNext: !isOpening && searchString.current.length === 1,
        },
      )
    ) {
      return;
    }

    // if there are no direct matches, check if the search is all the same letter, e.g. "aaa"
    if (
      allCharactersSame(searchString.current) &&
      moveToNextMatchingOption(
        optionText => {
          return optionText.toLocaleLowerCase().indexOf(searchString.current[0]) === 0;
        },
        {
          // Only cycle past the active option after the popup has opened.
          startFromNext: !isOpening,
        },
      )
    ) {
      return;
    }

    activeDescendantController.blur();
  };

  const matchSearchOnOpen = useEventCallback(() => moveToNextMatchingOptionWithSameCharacterHandling(true));
  React.useEffect(() => {
    if (open && searchOnOpen.current) {
      searchOnOpen.current = false;
      matchSearchOnOpen();
    }
  }, [open, matchSearchOnOpen]);

  const onTriggerKeyDown = (ev: React.KeyboardEvent<HTMLButtonElement>) => {
    // if the key was a char key, update search string
    if (getDropdownActionFromKey(ev) === 'Type') {
      clearKeyTimeout();
      // update search string
      searchString.current += ev.key.toLowerCase();
      setKeyTimeout(() => {
        searchString.current = '';
        searchOnOpen.current = false;
      }, 500);

      if (open) {
        moveToNextMatchingOptionWithSameCharacterHandling();
      } else {
        // Options must mount before the accumulated opening search can be matched.
        searchOnOpen.current = true;
      }

      // update state
      !open && setOpen(ev, true);
    }
  };

  const trigger = useTriggerSlot(triggerFromProps, ref, {
    state: options.state,
    defaultProps,
    elementType: 'button',
    activeDescendantController,
  });
  // eslint-disable-next-line react-hooks/immutability, react-hooks/refs
  trigger.onKeyDown = mergeCallbacks(onTriggerKeyDown, trigger.onKeyDown);

  return trigger;
}

/**
 * @returns - whether every character in the string is the same
 */
function allCharactersSame(str: string) {
  for (let i = 1; i < str.length; i++) {
    if (str[i] !== str[i - 1]) {
      return false;
    }
  }

  return true;
}
