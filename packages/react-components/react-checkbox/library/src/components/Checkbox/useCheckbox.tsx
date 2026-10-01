'use client';

import * as React from 'react';
import { useFieldControlProps_unstable } from '@fluentui/react-field';
import {
  getPartitionedNativeProps,
  useControllableState,
  useEventCallback,
  mergeCallbacks,
  useId,
  useIsomorphicLayoutEffect,
  useMergedRefs,
  slot,
} from '@fluentui/react-utilities';
import type { CheckboxBaseProps, CheckboxBaseState, CheckboxProps, CheckboxState } from './Checkbox.types';
import {
  Checkmark12Filled,
  Checkmark16Filled,
  Square12Filled,
  Square16Filled,
  CircleFilled,
} from '@fluentui/react-icons';
import { Label } from '@fluentui/react-label';
import { useFocusWithin } from '@fluentui/react-tabster';

/**
 * Create the state required to render Checkbox.
 *
 * The returned state can be modified with hooks such as useCheckboxStyles_unstable,
 * before being passed to renderCheckbox_unstable.
 *
 * @param props - props from this instance of Checkbox
 * @param ref - reference to `<input>` element of Checkbox
 */
export const useCheckbox_unstable = (props: CheckboxProps, ref: React.Ref<HTMLInputElement>): CheckboxState => {
  const { shape = 'square', size = 'medium', ...checkboxProps } = props;

  const state = useCheckboxBase_unstable(checkboxProps, ref);

  // Override indicator children with size+shape-appropriate icon
  const mixed = state.checked === 'mixed';
  let checkmarkIcon;
  if (mixed) {
    if (shape === 'circular') {
      checkmarkIcon = <CircleFilled />;
    } else {
      checkmarkIcon = size === 'large' ? <Square16Filled /> : <Square12Filled />;
    }
  } else if (state.checked) {
    checkmarkIcon = size === 'large' ? <Checkmark16Filled /> : <Checkmark12Filled />;
  }

  if (state.indicator) {
    state.indicator.children ??= checkmarkIcon;
  }

  return {
    shape,
    size,
    ...state,
    components: {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      ...state.components,
      label: Label,
    },
    label: slot.optional(props.label, {
      defaultProps: {
        ...state.label,
        size: 'medium',
      },
      elementType: Label,
    }),
  };
};

/**
 * Base hook for Checkbox component, which manages state related to checked state, ARIA attributes,
 * focus management, and slot structure without design props.
 *
 * @param props - props from this instance of Checkbox
 * @param ref - reference to `<input>` element of Checkbox
 */
export const useCheckboxBase_unstable = (
  props: CheckboxBaseProps,
  ref: React.Ref<HTMLInputElement>,
): CheckboxBaseState => {
  'use no memo'; // justified: compiler would optimize useCheckboxBase_unstable — manual opt-out to preserve runtime behavior

  // Merge props from surrounding <Field>, if any
  const fieldProps = useFieldControlProps_unstable(props, { supportsLabelFor: true, supportsRequired: true });

  const { disabled = false, required, labelPosition = 'after', onChange } = fieldProps;

  const [checked, setChecked] = useControllableState({
    defaultState: fieldProps.defaultChecked,
    state: fieldProps.checked,
    initialState: false,
  });
  const [initialChecked] = React.useState(() => fieldProps.defaultChecked ?? false);

  const nativeProps = getPartitionedNativeProps({
    props: fieldProps,
    primarySlotTagName: 'input',
    excludedPropNames: ['checked', 'defaultChecked', 'onChange'],
  });

  const mixed = checked === 'mixed';
  const id = useId('checkbox-', nativeProps.primary.id);

  const state: CheckboxBaseState = {
    checked,
    disabled,
    labelPosition,
    components: {
      root: 'span',
      input: 'input',
      indicator: 'div',
      label: 'label',
    },
    root: slot.always(fieldProps.root, {
      defaultProps: {
        ref: useFocusWithin<HTMLSpanElement>(),
        ...nativeProps.root,
      },
      elementType: 'span',
    }),
    input: slot.always(fieldProps.input, {
      defaultProps: {
        type: 'checkbox',
        id,
        ref,
        checked: checked === true,
        ...nativeProps.primary,
      },
      elementType: 'input',
    }),
    label: slot.optional(fieldProps.label, {
      defaultProps: {
        htmlFor: id,
        disabled,
        required,
      },
      elementType: 'label',
    }),
    indicator: slot.optional(fieldProps.indicator, {
      renderByDefault: true,
      defaultProps: {
        'aria-hidden': true,
      },
      elementType: 'div',
    }),
  };

  state.input.onChange = mergeCallbacks(state.input.onChange, ev => {
    const val = ev.currentTarget.indeterminate ? 'mixed' : ev.currentTarget.checked;
    onChange?.(ev, { checked: val });
    setChecked(val);
    // Native activation clears indeterminate even when the controlled value does not change.
    if (fieldProps.checked !== undefined) {
      ev.currentTarget.indeterminate = mixed;
    }
  });

  // Keep DOM ownership stable independently of consumer callback-ref identity.
  const inputRef = React.useRef<HTMLInputElement>(null);
  state.input.ref = useMergedRefs(inputRef, state.input.ref);

  // Set the <input> element's checked and indeterminate properties based on our tri-state property.
  // Since indeterminate can only be set via javascript, it has to be done in a layout effect.
  useIsomorphicLayoutEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = mixed;
    }
  });

  const restoreResetState = useEventCallback((input: HTMLInputElement) => {
    const resetChecked = fieldProps.checked === undefined ? initialChecked : checked;
    setChecked(resetChecked);
    input.checked = resetChecked === true;
    input.indeterminate = resetChecked === 'mixed';
  });

  useIsomorphicLayoutEffect(() => {
    const ownerDocument = inputRef.current?.ownerDocument;
    if (!ownerDocument) {
      return;
    }

    let mounted = true;
    const onReset = (event: Event) => {
      const input = inputRef.current;
      if (!input || event.target !== input.form) {
        return;
      }
      // Reset is cancelable and the browser applies its default action after dispatch.
      Promise.resolve().then(() => {
        if (mounted && inputRef.current === input && !event.defaultPrevented && event.target === input.form) {
          restoreResetState(input);
        }
      });
    };
    // Capture also covers external form ownership and reset handlers which stop propagation.
    ownerDocument.addEventListener('reset', onReset, true);
    return () => {
      mounted = false;
      ownerDocument.removeEventListener('reset', onReset, true);
    };
  }, [inputRef, restoreResetState]);

  return state;
};
