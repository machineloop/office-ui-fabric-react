import * as React from 'react';
import type { TeachingPopoverBodyProps, TeachingPopoverBodyState } from '../../../index';
import { TeachingPopoverBody, useTeachingPopoverBody_unstable } from '../../../index';
import type { TeachingPopoverBodySlots } from '../index';

export const nullable: TeachingPopoverBodyProps[] = [{}, { media: undefined }, { media: null }];
export const rootSlot: TeachingPopoverBodySlots['root'] = { as: 'div', children: 'Root' };
export const mediaSlot: TeachingPopoverBodySlots['media'] = { as: 'span', ref: React.createRef<HTMLSpanElement>() };
export const lengths: TeachingPopoverBodyProps[] = [
  { mediaLength: 'short' },
  { mediaLength: 'medium' },
  { mediaLength: 'tall' },
];
export const element = <TeachingPopoverBody ref={React.createRef<HTMLDivElement>()} media={{ as: 'span' }} />;
export function useContracts(props: TeachingPopoverBodyProps): TeachingPopoverBodyState {
  return useTeachingPopoverBody_unstable(props, React.createRef<HTMLDivElement>());
}
// @ts-expect-error Body does not own appearance.
export const appearance: TeachingPopoverBodyProps = { appearance: 'brand' };
// @ts-expect-error Body does not own size.
export const size: TeachingPopoverBodyProps = { size: 'large' };
// @ts-expect-error mediaLength is a closed union.
export const unsupportedLength: TeachingPopoverBodyProps = { mediaLength: 'huge' };
// @ts-expect-error A Body root is never nullable.
export const absentRoot: TeachingPopoverBodySlots['root'] = null;
// @ts-expect-error Public ref is an HTML div root, not an SVG element.
export const wrongRef = <TeachingPopoverBody ref={React.createRef<SVGSVGElement>()} />;
// @ts-expect-error The declared media tag is span; arbitrary tags require slot children composition.
export const wrongMediaTag: TeachingPopoverBodyProps = { media: { as: 'div' } };
// @ts-expect-error The public root tag is div, not an arbitrary section.
export const wrongRootTag: TeachingPopoverBodyProps = { as: 'section' };
