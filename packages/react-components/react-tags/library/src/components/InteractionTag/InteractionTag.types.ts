import type { ComponentProps, ComponentState, Slot } from '@fluentui/react-utilities';
import type { InteractionTagContextValue } from '../../contexts/interactionTagContext';
import type {
  TagAppearance,
  TagShape,
  TagSize,
  TagValue,
  TagDismissHandler,
  TagSelectHandler,
} from '../../utils/types';

export type InteractionTagContextValues = {
  interactionTag: InteractionTagContextValue;
};

export type InteractionTagSlots = {
  root: NonNullable<Slot<'div'>>;
};

/**
 * InteractionTag Props
 */
export type InteractionTagProps<Value = TagValue> = ComponentProps<Partial<InteractionTagSlots>> & {
  /**
   * An InteractionTag can have filled, outlined or brand experience.
   *
   * @default 'filled'
   */
  appearance?: TagAppearance;

  /**
   * An InteractionTag can show that it cannot be interacted with.
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * Changes the selected appearance of the tag without managing selection state.
   * A selectable TagGroup also marks tags whose values are in its selectedValues.
   *
   * @default false
   */
  selected?: boolean;

  /**
   * An InteractionTag can have rounded or circular shape.
   *
   * @default 'rounded'
   */
  shape?: TagShape;

  /**
   * An InteractionTag has three sizes.
   *
   * @default 'medium'
   */
  size?: TagSize;

  /**
   * Unique value identifying the tag within a TagGroup
   */
  value?: Value;
};

/**
 * State used in rendering InteractionTag
 */
export type InteractionTagState<Value = TagValue> = ComponentState<InteractionTagSlots> &
  Required<Pick<InteractionTagProps, 'appearance' | 'disabled' | 'selected' | 'shape' | 'size' | 'value'>> & {
    /**
     * Event handler from TagGroup context that allows TagGroup to dismiss the tag
     */
    handleTagDismiss: TagDismissHandler<Value>;

    /**
     * Event handler from TagGroup context that allows TagGroup to select the tag
     */
    handleTagSelect?: TagSelectHandler<Value>;

    /**
     * Selected values from TagGroup context
     */
    selectedValues: Value[];

    /**
     * id to assign to InteractionTagPrimary
     */
    interactionTagPrimaryId: string;
  };

/**
 * InteractionTag Base Props - omits design-only props
 */
export type InteractionTagBaseProps<Value = TagValue> = Omit<
  InteractionTagProps<Value>,
  'appearance' | 'size' | 'shape'
>;

/**
 * InteractionTag Base State - omits design-only state
 */
export type InteractionTagBaseState<Value = TagValue> = Omit<
  InteractionTagState<Value>,
  'appearance' | 'size' | 'shape'
>;
