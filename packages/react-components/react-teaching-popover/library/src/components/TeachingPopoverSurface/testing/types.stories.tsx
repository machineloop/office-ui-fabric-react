import * as React from 'react';
import { TeachingPopoverSurface } from '../../../index';
import type {
  useTeachingPopoverSurface_unstable,
  useTeachingPopoverSurfaceStyles_unstable,
  renderTeachingPopoverSurface_unstable,
} from '../../../index';
import type {
  TeachingPopoverSurfaceProps,
  TeachingPopoverSurfaceSlots,
  TeachingPopoverSurfaceState,
} from '../../../index';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Check actual inherited aliases.
import type { PopoverSurfaceProps, PopoverSurfaceSlots, PopoverSurfaceState } from '@fluentui/react-popover';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Check the public package facade.
import * as PublicAPI from '@fluentui/react-teaching-popover';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const slotsAlias: Equal<TeachingPopoverSurfaceSlots, PopoverSurfaceSlots> = true;
const propsAlias: Equal<TeachingPopoverSurfaceProps, PopoverSurfaceProps> = true;
const roleAlias: Equal<TeachingPopoverSurfaceState['root']['role'], React.AriaRole | undefined> = true;
const stateAlias: Equal<TeachingPopoverSurfaceState, PopoverSurfaceState> = true;
const component: typeof TeachingPopoverSurface = PublicAPI.TeachingPopoverSurface;
const hook: typeof useTeachingPopoverSurface_unstable = PublicAPI.useTeachingPopoverSurface_unstable;
const styles: typeof useTeachingPopoverSurfaceStyles_unstable = PublicAPI.useTeachingPopoverSurfaceStyles_unstable;
const render: typeof renderTeachingPopoverSurface_unstable = PublicAPI.renderTeachingPopoverSurface_unstable;
const valid: TeachingPopoverSurfaceProps = {
  id: 'surface',
  role: 'dialog',
  'aria-label': 'Lesson',
  tabIndex: -1,
  title: 'Surface',
  style: { maxWidth: 400 },
  children: <button>Action</button>,
};
const refMarkup = <TeachingPopoverSurface ref={React.createRef<HTMLDivElement>()} {...valid} />;
const ownerOpen: TeachingPopoverSurfaceProps = {
  // @ts-expect-error Visibility is owned by TeachingPopover, not Surface.
  open: true,
};
const ownerPosition: TeachingPopoverSurfaceProps = {
  // @ts-expect-error Positioning is owned by TeachingPopover, not Surface.
  positioning: 'above',
};
const ownerAppearance: TeachingPopoverSurfaceProps = {
  // @ts-expect-error Appearance is inherited context, not a Surface prop.
  appearance: 'brand',
};
const ownerTrap: TeachingPopoverSurfaceProps = {
  // @ts-expect-error Focus policies are owner-only.
  trapFocus: true,
};
const ownerArrow: TeachingPopoverSurfaceProps = {
  // @ts-expect-error Arrow visibility is owner-only.
  withArrow: true,
};
const ownerMount: TeachingPopoverSurfaceProps = {
  // @ts-expect-error Portal target is owner-only.
  mountNode: document.body,
};
const rootSlot: TeachingPopoverSurfaceProps = {
  // @ts-expect-error Native root props are inline, there is no separate root slot prop.
  root: { id: 'invented-root-slot' },
};
const alternateTag: TeachingPopoverSurfaceProps = {
  // @ts-expect-error Slot<'div'> has no alternate tag union.
  as: 'section',
};
const wrongRef = (
  // @ts-expect-error Surface forwards an HTML div, not an SVG node.
  <TeachingPopoverSurface ref={React.createRef<SVGSVGElement>()} />
);
// @ts-expect-error There is no Surface base hook in the current public API.
const missingBase = PublicAPI.useTeachingPopoverSurfaceBase_unstable;
// @ts-expect-error Surface has no distinct child-surface context-values export.
const missingContext = PublicAPI.useTeachingPopoverSurfaceContextValues_unstable;
export const contracts = {
  slotsAlias,
  propsAlias,
  roleAlias,
  stateAlias,
  component,
  hook,
  styles,
  render,
  valid,
  refMarkup,
  ownerOpen,
  ownerPosition,
  ownerAppearance,
  ownerTrap,
  ownerArrow,
  ownerMount,
  rootSlot,
  alternateTag,
  wrongRef,
  missingBase,
  missingContext,
};
