import type { AvatarGroupPopoverProps } from '../AvatarGroupPopover.types';
import type { ExtractSlotProps } from '@fluentui/react-utilities';

type Assert<T extends true> = T;

export type TriggerIsMandatory = Assert<null extends AvatarGroupPopoverProps['triggerButton'] ? false : true>;
export type ContentIsMandatory = Assert<null extends AvatarGroupPopoverProps['content'] ? false : true>;
export type SurfaceIsMandatory = Assert<null extends AvatarGroupPopoverProps['popoverSurface'] ? false : true>;
export type TooltipIsMandatory = Assert<null extends AvatarGroupPopoverProps['tooltip'] ? false : true>;
export type TriggerChildrenCanBeNull = Assert<
  null extends ExtractSlotProps<AvatarGroupPopoverProps['triggerButton']>['children'] ? true : false
>;
export type RootIsNotASlotProp = Assert<'root' extends keyof AvatarGroupPopoverProps ? false : true>;
export type RootDoesNotForwardARef = Assert<'ref' extends keyof AvatarGroupPopoverProps ? false : true>;
export type SizeBelongsToPopover = Assert<
  AvatarGroupPopoverProps['size'] extends 'small' | 'medium' | 'large' | undefined ? true : false
>;
export type LayoutComesFromGroupContext = Assert<'layout' extends keyof AvatarGroupPopoverProps ? false : true>;
