import * as React from 'react';
import { TeachingPopover, useTeachingPopover_unstable } from '../../../index';
import type {
  TeachingPopoverProps,
  TeachingPopoverState,
  renderTeachingPopover_unstable,
  useTeachingPopoverContextValues_unstable,
} from '../../../index';
// nx-ignore-next-line
import type { PopoverProps, PopoverState, JSXElement } from '@fluentui/react-components';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Verify the stable package entry as well as the source producer.
import * as PublicAPI from '@fluentui/react-teaching-popover';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const propsAlias: Equal<TeachingPopoverProps, PopoverProps> = true;
const stateAlias: Equal<TeachingPopoverState, PopoverState> = true;
const publicOwner: typeof TeachingPopover = PublicAPI.TeachingPopover;
const publicHook: typeof useTeachingPopover_unstable = PublicAPI.useTeachingPopover_unstable;
const publicRender: typeof renderTeachingPopover_unstable = PublicAPI.renderTeachingPopover_unstable;
const publicContext: typeof useTeachingPopoverContextValues_unstable =
  PublicAPI.useTeachingPopoverContextValues_unstable;
const valid: TeachingPopoverProps = {
  children: <div />,
  trapFocus: true,
  withArrow: true,
  size: 'large',
  appearance: 'brand',
};
const rootRef: TeachingPopoverProps = {
  children: <div />,
  // @ts-expect-error TeachingPopover has no DOM root ref.
  ref: React.createRef<HTMLDivElement>(),
};
const native: TeachingPopoverProps = {
  children: <div />,
  // @ts-expect-error The non-DOM owner has no root native attributes.
  id: 'invented-root',
};
const appearance: TeachingPopoverProps = {
  children: <div />,
  // @ts-expect-error No unsupported generic visual variants.
  appearance: 'outline',
};
// @ts-expect-error There is no separate owner base hook in the stable entry.
const missingBase = PublicAPI.useTeachingPopoverBase_unstable;
// @ts-expect-error No owner style hook exists for this non-DOM wrapper.
const missingStyles = PublicAPI.useTeachingPopoverStyles_unstable;
const invalidMountRef: TeachingPopoverProps = {
  children: <div />,
  // @ts-expect-error Portal mountNode supports element or element/className object, not an invented ref contract.
  mountNode: React.createRef<HTMLDivElement>(),
};
const useInvalidRootRef = (): TeachingPopoverState => {
  // @ts-expect-error The complete hook accepts only props, not a root ref.
  return useTeachingPopover_unstable({ children: <div /> }, React.createRef<HTMLDivElement>());
};
// @ts-expect-error Children are required.
const missingChildren: JSXElement = <TeachingPopover />;
export const contracts = {
  propsAlias,
  stateAlias,
  publicOwner,
  publicHook,
  publicRender,
  publicContext,
  valid,
  rootRef,
  native,
  appearance,
  missingBase,
  missingStyles,
  invalidMountRef,
  useInvalidRootRef,
  missingChildren,
};
